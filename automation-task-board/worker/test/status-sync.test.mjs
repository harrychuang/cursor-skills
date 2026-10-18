// 專案現況同步測試：快照上傳、外部執行掃描（sanitized）、三個同步時機、失敗韌性
import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { test } from "node:test";
import { createSyncScheduler, scanExternalRuns, syncProjectSnapshot } from "../lib/status-sync.mjs";

// stub build 腳本：模擬 automation-pipeline-board 的 build-pipeline-status.mjs 輸出
const STUB_BUILD = `
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
const args = process.argv.slice(2);
const root = args[args.indexOf("--project-root") + 1];
if (process.env.STUB_BUILD_FAIL === "1") process.exit(1);
mkdirSync(path.join(root, ".pipeline-board"), { recursive: true });
writeFileSync(path.join(root, ".pipeline-board", "status.json"), JSON.stringify({
  schemaVersion: 1, generatedAt: "2026-08-10T09:00:00.000Z",
  stages: [{ id: "extract", title: "萃取", state: "verified", verified: true }],
  sources: [],
}));
`;

async function makeFixtures() {
  const base = await mkdtemp(path.join(os.tmpdir(), "status-sync-"));
  const skillsRoot = path.join(base, "skills");
  await mkdir(path.join(skillsRoot, "automation-pipeline-board", "scripts"), { recursive: true });
  await writeFile(path.join(skillsRoot, "automation-pipeline-board", "scripts", "build-pipeline-status.mjs"), STUB_BUILD);
  const projectRoot = path.join(base, "proj");
  await mkdir(path.join(projectRoot, ".pipeline-board"), { recursive: true });
  await writeFile(path.join(projectRoot, ".pipeline-board", "pipeline.json"), JSON.stringify({ schemaVersion: 1 }));
  return { base, skillsRoot, projectRoot };
}

test("有定義：stub build 產生快照並上傳完整 payload", async () => {
  const { skillsRoot, projectRoot } = await makeFixtures();
  const uploads = [];
  const api = { projectStatus: async (payload) => (uploads.push(payload), { status: 200 }) };
  const result = await syncProjectSnapshot({
    config: { skillsRoot },
    api,
    project: { slug: "proj", root: projectRoot },
  });
  assert.equal(result.status, "uploaded");
  assert.equal(uploads.length, 1);
  assert.equal(uploads[0].hasDefinition, true);
  assert.equal(uploads[0].generatedAt, "2026-08-10T09:00:00.000Z");
  assert.equal(uploads[0].snapshot.stages[0].state, "verified");
});

test("無定義：上報 hasDefinition=false、不跑 build", async () => {
  const { base, skillsRoot } = await makeFixtures();
  const bare = path.join(base, "bare");
  await mkdir(bare, { recursive: true });
  const uploads = [];
  const api = { projectStatus: async (payload) => (uploads.push(payload), { status: 200 }) };
  const result = await syncProjectSnapshot({ config: { skillsRoot }, api, project: { slug: "bare", root: bare } });
  assert.equal(result.status, "no-definition");
  assert.deepEqual(uploads, [{ projectSlug: "bare", hasDefinition: false }]);
});

test("build 失敗：不上傳、函式正常返回", async () => {
  const { skillsRoot, projectRoot } = await makeFixtures();
  process.env.STUB_BUILD_FAIL = "1";
  const uploads = [];
  const api = { projectStatus: async (payload) => (uploads.push(payload), { status: 200 }) };
  const result = await syncProjectSnapshot({ config: { skillsRoot }, api, project: { slug: "proj", root: projectRoot } });
  delete process.env.STUB_BUILD_FAIL;
  assert.equal(result.status, "build-failed");
  assert.equal(uploads.length, 0);
});

test("外部執行掃描：只上報 sanitized 欄位、無法解析的檔案略過", async () => {
  const { projectRoot } = await makeFixtures();
  const stateDir = path.join(projectRoot, ".agent-automation", "runs");
  await mkdir(stateDir, { recursive: true });
  await writeFile(
    path.join(projectRoot, ".agent-automation", "config.json"),
    JSON.stringify({ schemaVersion: 1, stateDir: ".agent-automation/runs", tasks: { extract: {} } }),
  );
  await writeFile(
    path.join(stateDir, "run-a.json"),
    JSON.stringify({
      runId: "run-a",
      taskId: "extract",
      phase: "completed",
      selectedRunner: { id: "codex", label: "Codex" },
      startedAt: "2026-08-09T01:00:00.000Z",
      finishedAt: "2026-08-09T01:30:00.000Z",
      attempts: [{ runnerId: "codex", outcome: "success" }],
    }),
  );
  await writeFile(
    path.join(stateDir, "run-b.json"),
    JSON.stringify({ runId: "run-b", taskId: "extract", phase: "verification-failed", startedAt: "2026-08-09T02:00:00.000Z" }),
  );
  await writeFile(path.join(stateDir, "broken.json"), "not-json{");

  const runs = await scanExternalRuns({ slug: "proj", root: projectRoot });
  assert.equal(runs.length, 2, "無法解析的檔案略過");
  const runA = runs.find((run) => run.runId === "run-a");
  assert.deepEqual(Object.keys(runA).sort(), ["finishedAt", "phase", "runId", "runnerId", "startedAt", "taskId"], "只含 sanitized 欄位");
  assert.equal(runA.runnerId, "codex");
  assert.ok(!JSON.stringify(runs).includes("attempts"), "不上報 summary 其他內容");
});

test("同步時機：註冊後、間隔、執行後各觸發一次；同步丟例外不外洩", async () => {
  let allCalls = 0;
  let oneCalls = 0;
  const scheduler = createSyncScheduler({
    config: { statusSyncIntervalMs: 50 },
    api: {},
    projects: [{ slug: "proj", root: "/tmp/proj" }],
    syncAll: async () => {
      allCalls += 1;
    },
    syncOne: async () => {
      oneCalls += 1;
    },
  });

  await scheduler.onRegistered();
  assert.equal(allCalls, 1, "註冊後同步一次");

  assert.equal(await scheduler.maybeInterval(), false, "間隔未到不同步");
  await sleep(60);
  assert.equal(await scheduler.maybeInterval(), true, "間隔到了同步");
  assert.equal(allCalls, 2);

  await scheduler.onRunFinished("proj");
  assert.equal(oneCalls, 1, "執行結束後同步該專案");
  assert.equal(await scheduler.onRunFinished("unknown"), false, "未知專案不同步");

  // 同步丟例外：吞下、不往外丟，之後仍可同步
  const failing = createSyncScheduler({
    config: { statusSyncIntervalMs: 0 },
    api: {},
    projects: [],
    log: () => {},
    syncAll: async () => {
      throw new Error("boom");
    },
  });
  await failing.onRegistered(); // 不應 throw
  assert.equal(await failing.maybeInterval(), true, "失敗後下一輪仍運作");
});
