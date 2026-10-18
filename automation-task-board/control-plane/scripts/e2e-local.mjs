// 端到端驗收：真控制平面（先啟動 dev server）+ 真 worker + 真 run-task.mjs（stub runner）。
// 流程：建卡 → worker 自動領取 → 執行（第一次驗證失敗）→ 需要處理 →
//       附說明重跑（resume 指令）→ 完成（review gate）→ 待確認 → 批准 → 完成 + 接棒建卡。
// 前置：npm run dev-db、npm run migrate、npm run dev（或 E2E_BASE_URL 指向執行中的服務）
import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
import { PrismaClient } from "@prisma/client";
import { createCard, setProjectChain } from "../src/lib/cards.ts";
import { approveReview, rerunCard } from "../src/lib/human-actions.ts";
import { generateWorkerToken, hashWorkerToken } from "../src/lib/worker-auth.ts";

process.env.DATABASE_URL ??= "postgresql://postgres:postgres@127.0.0.1:54329/taskboard";
const BASE_URL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const SLUG = "e2e-taskboard";
const NOTE = "採用 B 案的間距";

const controlPlaneRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const repoRoot = path.dirname(path.dirname(controlPlaneRoot));
const workerScript = path.join(repoRoot, "automation-task-board", "worker", "worker.mjs");

const db = new PrismaClient();
let workerProcess = null;

function fail(message) {
  console.error(`✖ ${message}`);
  process.exitCode = 1;
  throw new Error(message);
}

function ok(message) {
  console.log(`✔ ${message}`);
}

async function waitForColumn(cardId, column, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const card = await db.card.findUniqueOrThrow({ where: { id: cardId } });
    if (card.column === column) return card;
    await sleep(750);
  }
  const card = await db.card.findUniqueOrThrow({ where: { id: cardId } });
  fail(`等待 ${column} 逾時（目前 ${card.column}，原因 ${card.attentionReason ?? "-"}）`);
}

async function main() {
  // 0) 控制平面必須在跑
  const health = await fetch(`${BASE_URL}/api/auth/providers`).catch(() => null);
  if (!health) fail(`控制平面不在 ${BASE_URL}（先 npm run dev 或設 E2E_BASE_URL）`);
  ok(`控制平面回應：${BASE_URL}`);

  // 1) 清掉前次 e2e 資料
  const stale = await db.project.findUnique({ where: { slug: SLUG } });
  if (stale) {
    await db.logChunk.deleteMany({ where: { card: { projectId: stale.id } } });
    await db.run.deleteMany({ where: { card: { projectId: stale.id } } });
    await db.cardEvent.deleteMany({ where: { card: { projectId: stale.id } } });
    await db.lease.deleteMany({ where: { card: { projectId: stale.id } } });
    await db.card.deleteMany({ where: { projectId: stale.id } });
    await db.taskChainEntry.deleteMany({ where: { projectId: stale.id } });
    await db.project.delete({ where: { id: stale.id } });
  }

  // 2) 成員 + worker token（模擬「登入後簽發 token」；瀏覽器端 Google 登入於部署後以真帳號驗收）
  const member = await db.member.upsert({
    where: { email: "e2e@example.com" },
    update: {},
    create: { email: "e2e@example.com", name: "E2E 驗收" },
  });
  const token = generateWorkerToken();
  await db.workerToken.create({ data: { memberId: member.id, label: "e2e", tokenHash: hashWorkerToken(token) } });
  ok("成員與 worker token 就緒");

  // 3) fixture 專案：stub runner 走真正的 run-task.mjs
  //    stub agent：prompt 含調整說明才寫出 out.txt → 第一次驗證失敗、重跑通過
  const fixtureBase = path.join(os.tmpdir(), "taskboard-e2e");
  await rm(fixtureBase, { recursive: true, force: true });
  const fixtureRoot = path.join(fixtureBase, SLUG);
  await mkdir(path.join(fixtureRoot, ".agent-automation"), { recursive: true });
  const stubAgent = path.join(fixtureBase, "stub-agent.mjs");
  await writeFile(
    stubAgent,
    `import { writeFileSync } from "node:fs";
import path from "node:path";
const [workspace, prompt] = process.argv.slice(2);
console.log("stub agent 開始，workspace=" + workspace);
if (prompt.includes(${JSON.stringify(NOTE)})) {
  writeFileSync(path.join(workspace, "out.txt"), "done\\n");
  console.log("已依調整說明寫出 out.txt");
} else {
  console.log("第一次執行：尚未取得設計決定，不產出");
}
`,
  );
  const checkScript = path.join(fixtureBase, "check.mjs");
  await writeFile(
    checkScript,
    `import { existsSync } from "node:fs";
process.exit(existsSync("out.txt") ? 0 : 1);
`,
  );
  await writeFile(
    path.join(fixtureRoot, ".agent-automation", "config.json"),
    JSON.stringify(
      {
        schemaVersion: 1,
        stateDir: ".agent-automation/runs",
        runners: [
          {
            id: "stub",
            label: "Stub Agent",
            command: "node",
            args: [stubAgent, "{workspace}", "{prompt}"],
            timeoutMs: 60000,
            inheritEnv: [],
          },
        ],
        tasks: {
          "demo-task": {
            instruction: "依提示產出 out.txt",
            verification: [{ command: "node", args: [checkScript], timeoutMs: 30000 }],
            requiredArtifacts: ["out.txt"],
          },
          "next-task": { instruction: "接棒示範任務", verification: [], requiredArtifacts: [] },
        },
      },
      null,
      2,
    ),
  );
  await setProjectChain(db, {
    projectSlug: SLUG,
    entries: [
      { taskId: "demo-task", requiresReview: true },
      { taskId: "next-task", requiresReview: true },
    ],
  });

  // 現況同步的驗收素材：pipeline 定義（真 build 腳本會推導）+ 一筆導入前的外部執行歷史
  await writeFile(path.join(fixtureRoot, "README.md"), "e2e fixture\n");
  await mkdir(path.join(fixtureRoot, ".pipeline-board"), { recursive: true });
  await writeFile(
    path.join(fixtureRoot, ".pipeline-board", "pipeline.json"),
    JSON.stringify({
      schemaVersion: 1,
      sources: [{ id: "task-brief", title: "任務指示", evidence: ["README.md"] }],
      stages: [{ id: "demo-task", title: "示範任務", taskId: "demo-task", produces: ["out.txt"] }],
    }),
  );
  const stateDir = path.join(fixtureRoot, ".agent-automation", "runs");
  await mkdir(stateDir, { recursive: true });
  await writeFile(
    path.join(stateDir, "external-history-1.json"),
    JSON.stringify({
      schemaVersion: 1,
      runId: "external-history-1",
      taskId: "demo-task",
      phase: "completed",
      selectedRunner: { id: "codex", label: "Codex" },
      startedAt: "2026-08-01T03:00:00.000Z",
      updatedAt: "2026-08-01T03:20:00.000Z",
      finishedAt: "2026-08-01T03:20:00.000Z",
    }),
  );
  ok(`fixture 專案就緒：${fixtureRoot}`);

  // 4) 建卡（手動來源，autoRun 預設 true）
  const card = await createCard(db, member.id, { projectSlug: SLUG, taskId: "demo-task", note: "e2e 驗收卡" });
  ok(`建卡：${card.id}（待領取）`);

  // 5) 啟動真 worker
  const workerConfigPath = path.join(fixtureBase, "worker.config.json");
  await writeFile(
    workerConfigPath,
    JSON.stringify({
      controlPlaneUrl: BASE_URL,
      workerToken: token,
      projectRoots: [fixtureRoot],
      runners: ["stub"],
      machineLabel: "E2E 測試機",
      pollIntervalMs: 1000,
      heartbeatIntervalMs: 5000,
    }),
  );
  workerProcess = spawn(process.execPath, [workerScript, "--config", workerConfigPath], {
    stdio: ["ignore", "inherit", "inherit"],
  });
  ok("worker 已啟動，等待現況同步與自動領取…");

  // 現況同步：註冊後外部執行歷史與磁碟快照應出現在控制平面
  {
    const deadline = Date.now() + 60_000;
    let externalSeen = false;
    let snapshotSeen = false;
    while (Date.now() < deadline && (!externalSeen || !snapshotSeen)) {
      const [external, snapshot] = await Promise.all([
        db.externalRun.findUnique({ where: { runId: "external-history-1" } }),
        db.projectSnapshot.findFirst({ where: { project: { slug: SLUG } } }),
      ]);
      externalSeen = external !== null && external.phase === "completed";
      snapshotSeen =
        snapshot !== null &&
        snapshot.hasDefinition === true &&
        Array.isArray(snapshot.payload?.stages) &&
        snapshot.payload.stages.length > 0;
      if (!externalSeen || !snapshotSeen) await sleep(1000);
    }
    if (!externalSeen) fail("導入前的外部執行歷史未出現在控制平面");
    if (!snapshotSeen) fail("磁碟快照未同步（hasDefinition=true 且 stages 非空）");
    ok("現況同步通過：外部執行歷史與磁碟快照都已上傳");
  }

  // 6) 第一輪：驗證失敗 → 需要處理
  let state = await waitForColumn(card.id, "NEEDS_ATTENTION");
  if (state.attentionReason !== "verification-failed") fail(`原因應為 verification-failed，實得 ${state.attentionReason}`);
  const run1 = await db.run.findFirstOrThrow({ where: { cardId: card.id } });
  ok(`第一輪結束：${run1.runId} → ${run1.phase} → 需要處理`);

  // 7) 人工介入：附說明重跑（拖曳=指令的伺服器端語意）
  await rerunCard(db, member.id, card.id, NOTE);
  ok(`已下重跑指令（附說明「${NOTE}」）`);

  // 8) 第二輪：resume 指令生效 → 完成（review gate）→ 待確認
  await waitForColumn(card.id, "AWAITING_REVIEW");
  const run2 = await db.run.findFirstOrThrow({ where: { cardId: card.id, NOT: { runId: run1.runId } } });
  if (run2.resumedFrom !== run1.runId) fail(`第二輪 resumedFrom 應為 ${run1.runId}，實得 ${run2.resumedFrom}`);
  if (run2.phase !== "completed") fail(`第二輪 phase 應為 completed，實得 ${run2.phase}`);
  ok(`第二輪完成：${run2.runId}（重跑自 ${run2.resumedFrom}）→ 待確認`);

  // 9) 停掉 worker（避免接棒卡被自動領走，便於斷言），批准 → 完成 + 接棒
  workerProcess.kill("SIGTERM");
  workerProcess = null;
  await approveReview(db, member.id, card.id);
  state = await db.card.findUniqueOrThrow({ where: { id: card.id } });
  if (state.column !== "DONE") fail(`批准後應為 DONE，實得 ${state.column}`);
  const successor = await db.card.findFirst({ where: { project: { slug: SLUG }, taskId: "next-task" } });
  if (!successor || successor.origin !== "PIPELINE_CHAIN") fail("接棒卡未建立");
  ok(`批准完成；接棒卡已建立：${successor.id}（next-task，待領取）`);

  // 10) 斷言歷史、歸屬、log
  const events = await db.cardEvent.findMany({ where: { cardId: card.id }, orderBy: { createdAt: "asc" } });
  const sequence = events.map((event) => event.event);
  const expected = [
    "CARD_CREATED",
    "LEASE_GRANTED",
    "RUN_VERIFICATION_FAILED",
    "HUMAN_RERUN",
    "LEASE_GRANTED",
    "RUN_COMPLETED_GATED",
    "HUMAN_APPROVE",
  ];
  if (JSON.stringify(sequence) !== JSON.stringify(expected)) {
    fail(`卡片歷史序列不符：${sequence.join(" → ")}`);
  }
  const leases = await db.lease.findMany({ where: { cardId: card.id }, include: { machine: true, member: true } });
  for (const lease of leases) {
    if (lease.memberId !== member.id || !lease.machine.machineId || !lease.runnerId) {
      fail("歸屬三元組不完整");
    }
  }
  const chunks = await db.logChunk.count({ where: { cardId: card.id } });
  if (chunks < 1) fail("沒有任何 log chunk 上傳");
  ok(`卡片歷史 ${sequence.length} 筆符合預期；兩次 lease 歸屬完整；log chunk ${chunks} 筆`);

  console.log("\n=== 端到端驗收通過 ===");
}

main()
  .catch((error) => {
    process.exitCode = 1;
    console.error(error.message);
  })
  .finally(async () => {
    if (workerProcess) workerProcess.kill("SIGTERM");
    await db.$disconnect();
  });
