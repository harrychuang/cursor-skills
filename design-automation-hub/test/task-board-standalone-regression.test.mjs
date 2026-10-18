// standalone 回歸：未綁定的 Coordinator 行為必須與派工模式引入前完全相同。
// 兩種設定都真的把伺服器跑起來，用 HTTP 對照健康檢查與 Plugin context。
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";

import { fileURLToPath, pathToFileURL } from "node:url";

import { computeCleanupSnapshotHash } from "../template/scripts/design-automation-hub/contract.mjs";
import { startStandalone } from "../template/scripts/design-automation-hub/standalone.mjs";

const ACCESS_CODE = "local-acceptance-code";
const FILE_KEY = "fixture-file-key";
const MEMBERS = JSON.stringify([{ accessCode: ACCESS_CODE, id: "member-1", displayName: "設計師 A", roles: ["designer"] }]);

const SCOPE = { nodeId: "1:2", type: "SECTION", name: "Cards" };
const SNAPSHOT = {
  schemaVersion: 1,
  scope: SCOPE,
  nodes: [
    {
      id: "1:2",
      type: "SECTION",
      name: "Cards",
      parentId: null,
      index: 0,
      visible: true,
      locked: false,
      childIds: [],
      absoluteBounds: { x: 0, y: 0, width: 100, height: 80 },
    },
  ],
};

const servers = [];
after(() => {
  for (const server of servers) server.close();
});

function makeProject({ binding } = {}) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "hub-regression-"));
  const root = path.join(base, "app-alpha");
  fs.mkdirSync(path.join(root, ".design-automation"), { recursive: true });
  fs.writeFileSync(
    path.join(root, ".design-automation", "project.json"),
    `${JSON.stringify({
      schemaVersion: 1,
      project: { id: "aurora", displayName: "Project Aurora", figmaFileKeys: [FILE_KEY] },
      host: { mode: "standalone", adapter: null },
      features: { cleanup: true, review: false, workflowStatus: true },
    })}\n`,
  );
  if (binding) {
    fs.writeFileSync(path.join(root, ".design-automation", "task-board.json"), `${JSON.stringify(binding)}\n`, {
      mode: 0o600,
    });
  }
  return root;
}

async function startOn(root, start = startStandalone) {
  const previousMembers = process.env.DESIGN_AUTOMATION_MEMBERS_JSON;
  process.env.DESIGN_AUTOMATION_MEMBERS_JSON = MEMBERS;
  const server = await start({ projectRoot: root, port: 0 });
  servers.push(server);
  if (previousMembers === undefined) delete process.env.DESIGN_AUTOMATION_MEMBERS_JSON;
  else process.env.DESIGN_AUTOMATION_MEMBERS_JSON = previousMembers;
  await new Promise((resolve) => server.once("listening", resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

// 模擬預設安裝的檔案集合：複製 Coordinator scripts，但排除三個派工模組檔。
const DISPATCH_MODULE_FILES = ["dispatch.mjs", "task-board-binding.mjs", "task-board-client.mjs"];
const COORDINATOR_TEMPLATE_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..", "template", "scripts", "design-automation-hub",
);

const coordinatorCopies = [];
after(() => {
  for (const dir of coordinatorCopies) fs.rmSync(dir, { recursive: true, force: true });
});

async function importCoordinatorWithoutDispatchModules() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hub-coordinator-core-"));
  coordinatorCopies.push(dir);
  for (const name of fs.readdirSync(COORDINATOR_TEMPLATE_DIR)) {
    if (DISPATCH_MODULE_FILES.includes(name)) continue;
    fs.copyFileSync(path.join(COORDINATOR_TEMPLATE_DIR, name), path.join(dir, name));
  }
  return import(pathToFileURL(path.join(dir, "standalone.mjs")).href);
}

test("未綁定：健康檢查回報 extractionQueue false 且 dispatch false", async () => {
  const origin = await startOn(makeProject());
  const health = await (await fetch(`${origin}/healthz`)).json();
  assert.deepEqual(health, { status: "ok", schemaVersion: 1, extractionQueue: false, dispatch: false });
});

test("已綁定：健康檢查的 extractionQueue 仍是 false，只有 dispatch 變 true", async () => {
  const root = makeProject({
    binding: { schemaVersion: 1, controlPlaneUrl: "https://board.example.com", token: "wtk_test" },
  });
  const origin = await startOn(root);
  const health = await (await fetch(`${origin}/healthz`)).json();
  assert.deepEqual(health, { status: "ok", schemaVersion: 1, extractionQueue: false, dispatch: true });
});

test("已綁定：standalone 的 review 仍為 false，cleanup 與 workflowStatus 仍為 true", async () => {
  const root = makeProject({
    binding: { schemaVersion: 1, controlPlaneUrl: "https://board.example.com", token: "wtk_test" },
  });
  const origin = await startOn(root);
  const context = await (
    await fetch(`${origin}/v1/plugin/context?fileKey=${FILE_KEY}`, {
      headers: { Authorization: `Bearer ${ACCESS_CODE}` },
    })
  ).json();
  assert.equal(context.project.displayName, "Project Aurora");
  assert.deepEqual(context.features, { cleanup: true, review: false, workflowStatus: true });
});

test("派工模式沒有新增任何端點：萃取相關路徑一律 404", async () => {
  const root = makeProject({
    binding: { schemaVersion: 1, controlPlaneUrl: "https://board.example.com", token: "wtk_test" },
  });
  const origin = await startOn(root);
  for (const pathName of ["/v1/extraction/queue", "/v1/automation/scan", "/v1/dispatch"]) {
    const res = await fetch(`${origin}${pathName}`, { headers: { Authorization: `Bearer ${ACCESS_CODE}` } });
    assert.equal(res.status, 404, `${pathName} 不該存在`);
  }
});

test("未綁定：建立任務仍在本機分析（沒有派工，任務直接離開 queued）", async () => {
  const origin = await startOn(makeProject());
  const created = await (
    await fetch(`${origin}/v1/automation/tasks`, {
      method: "POST",
      headers: { Authorization: `Bearer ${ACCESS_CODE}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        taskType: "figma-cleanup",
        fileKey: FILE_KEY,
        scope: SCOPE,
        snapshot: SNAPSHOT,
        inputSnapshotHash: computeCleanupSnapshotHash(SNAPSHOT, SCOPE),
        idempotencyKey: "regression-1",
      }),
    })
  ).json();
  assert.equal(created.created, true);
  assert.equal(created.task.status, "queued");

  // 本機分析會實際嘗試呼叫 agent-automation；這個 fixture 沒裝，
  // 因此任務會落到 blocked。重點是它「離開了 queued」——沒有停在等待 worker 的狀態。
  const deadline = Date.now() + 5000;
  let detail;
  while (Date.now() < deadline) {
    detail = await (
      await fetch(`${origin}/v1/automation/tasks/${created.task.id}`, {
        headers: { Authorization: `Bearer ${ACCESS_CODE}` },
      })
    ).json();
    if (detail.status !== "queued") break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.notEqual(detail.status, "queued", "未綁定時必須立刻本機分析，不得停在 queued");
  assert.equal(detail.dispatch, undefined, "未綁定的任務不得帶派工資訊");
});

test("預設安裝（無派工模組）：Coordinator 照常啟動，healthz dispatch false，任務走本機分析", async () => {
  const coordinator = await importCoordinatorWithoutDispatchModules();
  const origin = await startOn(makeProject(), coordinator.startStandalone);
  const health = await (await fetch(`${origin}/healthz`)).json();
  assert.deepEqual(health, { status: "ok", schemaVersion: 1, extractionQueue: false, dispatch: false });

  const created = await (
    await fetch(`${origin}/v1/automation/tasks`, {
      method: "POST",
      headers: { Authorization: `Bearer ${ACCESS_CODE}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        taskType: "figma-cleanup",
        fileKey: FILE_KEY,
        scope: SCOPE,
        snapshot: SNAPSHOT,
        inputSnapshotHash: computeCleanupSnapshotHash(SNAPSHOT, SCOPE),
        idempotencyKey: "module-absent-1",
      }),
    })
  ).json();
  assert.equal(created.created, true);
  const deadline = Date.now() + 5000;
  let detail;
  while (Date.now() < deadline) {
    detail = await (
      await fetch(`${origin}/v1/automation/tasks/${created.task.id}`, {
        headers: { Authorization: `Bearer ${ACCESS_CODE}` },
      })
    ).json();
    if (detail.status !== "queued") break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.equal(detail.id, created.task.id, "task detail 必須回傳任務本體而非錯誤 payload");
  assert.notEqual(detail.status, "queued", "模組缺席時必須立刻本機分析，不得停在 queued");
  assert.equal(detail.dispatch, undefined, "模組缺席的任務不得帶派工資訊");
});

test("環境變數設了空值：模組在場時必須大聲失敗，不得靜默改走本機分析", async () => {
  const previousUrl = process.env.DESIGN_AUTOMATION_TASK_BOARD_URL;
  process.env.DESIGN_AUTOMATION_TASK_BOARD_URL = "";
  try {
    await assert.rejects(
      () => startOn(makeProject()),
      (error) => {
        assert.match(String(error.message), /DESIGN_AUTOMATION_TASK_BOARD_URL/);
        return true;
      },
      "空值的派工環境變數必須造成啟動錯誤",
    );
  } finally {
    if (previousUrl === undefined) delete process.env.DESIGN_AUTOMATION_TASK_BOARD_URL;
    else process.env.DESIGN_AUTOMATION_TASK_BOARD_URL = previousUrl;
  }
});

test("綁定存在但派工模組未安裝：出聲警告後以 standalone 續行，不得當機", async () => {
  const coordinator = await importCoordinatorWithoutDispatchModules();
  const root = makeProject({
    binding: { schemaVersion: 1, controlPlaneUrl: "https://board.example.com", token: "wtk_test" },
  });
  const lines = [];
  const originalWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk, ...rest) => {
    lines.push(String(chunk));
    return originalWrite(chunk, ...rest);
  };
  let origin;
  try {
    origin = await startOn(root, coordinator.startStandalone);
  } finally {
    process.stdout.write = originalWrite;
  }
  assert.ok(
    lines.some((line) => line.includes("派工模組未安裝")),
    "必須警告派工綁定存在但看板模組未安裝",
  );
  const health = await (await fetch(`${origin}/healthz`)).json();
  assert.deepEqual(health, { status: "ok", schemaVersion: 1, extractionQueue: false, dispatch: false });
});
