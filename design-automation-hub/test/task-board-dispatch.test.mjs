// 派工模式測試：建卡取代本機分析、狀態調解、Plugin apply 回寫。
// 共用 fixture 建出一個已安裝的 standalone 專案，core 以 spy 版 runCleanup 建立——
// 只要 spy 被呼叫過，就代表派工路徑誤觸了本機分析。
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { computeCleanupSnapshotHash } from "../template/scripts/design-automation-hub/contract.mjs";
import { DesignAutomationHubCore } from "../template/scripts/design-automation-hub/core.mjs";
import { createDispatchScheduler } from "../template/scripts/design-automation-hub/dispatch.mjs";

const MEMBER = { id: "member-1", displayName: "設計師 A", roles: ["designer"] };
const FILE_KEY = "fixture-file-key";
const BINDING = { controlPlaneUrl: "https://board.example.com", token: "wtk_test", projectSlug: "app-alpha", stallMs: 900_000 };

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

export function makeInstalledProject() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "hub-dispatch-"));
  const root = path.join(base, "app-alpha");
  fs.mkdirSync(path.join(root, ".design-automation"), { recursive: true });
  fs.writeFileSync(
    path.join(root, ".design-automation", "project.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        project: { id: "aurora", displayName: "Project Aurora", figmaFileKeys: [FILE_KEY] },
        host: { mode: "standalone", adapter: null },
        features: { cleanup: true, review: false, workflowStatus: true },
      },
      null,
      2,
    )}\n`,
  );
  return root;
}

/** 建立 core 與一筆 queued 任務；runCleanup 是 spy，派工路徑不得碰它。 */
export function makeCoreWithTask(root, { idempotencyKey = "idem-1" } = {}) {
  const calls = [];
  const core = new DesignAutomationHubCore({
    projectRoot: root,
    runCleanup: async (args) => {
      calls.push(args);
      throw new Error("本機分析不應該在派工模式被呼叫");
    },
  });
  const created = core.createTask({
    member: MEMBER,
    input: {
      taskType: "figma-cleanup",
      fileKey: FILE_KEY,
      scope: SCOPE,
      snapshot: SNAPSHOT,
      inputSnapshotHash: computeCleanupSnapshotHash(SNAPSHOT, SCOPE),
      idempotencyKey,
    },
  });
  return { core, taskId: created.task.id, localAnalysisCalls: calls };
}

test("綁定時建立任務只落地 snapshot 並建卡，不跑本機分析", async () => {
  const root = makeInstalledProject();
  const { core, taskId, localAnalysisCalls } = makeCoreWithTask(root);
  const requests = [];
  const client = {
    createCard: async (payload) => {
      requests.push(payload);
      return { cardId: "card-abc", column: "CLAIMABLE", approved: false, created: true };
    },
  };

  await createDispatchScheduler({ core, binding: BINDING, client })(taskId);

  assert.equal(localAnalysisCalls.length, 0, "派工模式不得觸發本機分析");
  const inputPath = path.join(root, ".design-automation", "runtime", taskId, "input.json");
  assert.ok(fs.existsSync(inputPath), "snapshot 必須在建卡前落地");

  assert.equal(requests.length, 1);
  assert.equal(requests[0].projectSlug, "app-alpha");
  assert.equal(requests[0].taskId, "figma-cleanup");
  assert.equal(requests[0].hubAutomationTaskId, taskId);
  assert.equal(
    requests[0].note,
    `Read .design-automation/runtime/${taskId}/input.json and write exactly one result to .design-automation/runtime/${taskId}/result.json.`,
    "卡片 note 必須就是 run-task 要用的 request 字串",
  );

  const task = core.store.get(taskId);
  assert.equal(task.status, "queued", "等 worker 期間任務維持 queued");
  assert.equal(task.dispatch.cardId, "card-abc");
  assert.equal(task.dispatch.approved, false);
});

test("控制平面不可達：任務進 blocked 且可重送，落地的 input 保留", async () => {
  const root = makeInstalledProject();
  const { core, taskId } = makeCoreWithTask(root);
  const client = {
    createCard: async () => {
      throw Object.assign(new Error("boom"), { code: "task-board-unreachable" });
    },
  };

  await createDispatchScheduler({ core, binding: BINDING, client })(taskId);

  const task = core.store.get(taskId);
  assert.equal(task.status, "blocked");
  assert.equal(task.failure.code, "task-board-unreachable");
  assert.equal(task.failure.retryable, true);
  assert.ok(!task.failure.message.includes("board.example.com"), "失敗訊息不得含控制平面 URL");
  assert.ok(fs.existsSync(path.join(root, ".design-automation", "runtime", taskId, "input.json")));
});

test("憑證被拒：錯誤碼區分為 task-board-unauthorized", async () => {
  const root = makeInstalledProject();
  const { core, taskId } = makeCoreWithTask(root);
  const client = {
    createCard: async () => {
      throw Object.assign(new Error("nope"), { code: "task-board-unauthorized" });
    },
  };

  await createDispatchScheduler({ core, binding: BINDING, client })(taskId);
  const task = core.store.get(taskId);
  assert.equal(task.status, "blocked");
  assert.equal(task.failure.code, "task-board-unauthorized");
  assert.ok(!task.failure.message.includes("wtk_test"), "失敗訊息不得含 token");
});

test("已派工的任務重複排程不會建第二張卡", async () => {
  const root = makeInstalledProject();
  const { core, taskId } = makeCoreWithTask(root);
  let calls = 0;
  const client = {
    createCard: async () => {
      calls += 1;
      return { cardId: "card-once", column: "CLAIMABLE", approved: false, created: true };
    },
  };
  const schedule = createDispatchScheduler({ core, binding: BINDING, client });
  await schedule(taskId);
  await schedule(taskId);
  assert.equal(calls, 1);
});

const { createDispatchCore } = await import("../template/scripts/design-automation-hub/dispatch.mjs");

function writeResult(root, taskId, overrides = {}) {
  const dir = path.join(root, ".design-automation", "runtime", taskId);
  const input = JSON.parse(fs.readFileSync(path.join(dir, "input.json"), "utf8"));
  const result = {
    schemaVersion: 1,
    taskType: "figma-cleanup",
    status: "plan-ready",
    automationTaskId: input.automationTaskId,
    inputSnapshotHash: input.inputSnapshotHash,
    agentAutomationRunId: "run-abc",
    summary: "重新命名一個圖層",
    operations: [],
    ...overrides,
  };
  fs.writeFileSync(path.join(dir, "result.json"), `${JSON.stringify(result, null, 2)}\n`);
  return result;
}

/** 建好一個已派工（queued + dispatch 區塊）的任務。 */
async function dispatched(client = { createCard: async () => ({ cardId: "card-1", column: "CLAIMABLE", approved: false, created: true }) }) {
  const root = makeInstalledProject();
  const { core, taskId } = makeCoreWithTask(root);
  await createDispatchScheduler({ core, binding: BINDING, client })(taskId);
  return { root, core, taskId };
}

const READ_ARGS = { member: MEMBER, fileKey: FILE_KEY };

test("worker 產出合法 result：下一次 Plugin 讀取時任務進 plan-ready", async () => {
  const { root, core, taskId } = await dispatched();
  writeResult(root, taskId, { operations: [] });

  const dispatchCore = createDispatchCore({ core, binding: BINDING, client: { cardStatus: async () => ({ column: "RUNNING", approved: true }) } });
  const detail = await dispatchCore.taskDetail({ member: MEMBER, taskId });

  assert.equal(detail.status, "plan-ready");
  assert.equal(detail.plan.summary, "重新命名一個圖層");
  assert.equal(core.store.get(taskId).genericRunId, "run-abc");
});

test("result 驗證失敗：任務進 blocked，沿用既有分析失敗碼", async () => {
  const { root, core, taskId } = await dispatched();
  const dir = path.join(root, ".design-automation", "runtime", taskId);
  fs.writeFileSync(path.join(dir, "result.json"), JSON.stringify({ schemaVersion: 1, taskType: "figma-cleanup", status: "plan-ready" }));

  const dispatchCore = createDispatchCore({ core, binding: BINDING, client: { cardStatus: async () => ({ column: "RUNNING", approved: true }) } });
  const detail = await dispatchCore.taskDetail({ member: MEMBER, taskId });

  assert.equal(detail.status, "blocked");
  assert.ok(["invalid-cleanup-result", "cleanup-analysis-failed"].includes(detail.failure.code));
});

test("agent 回報 blocked 結果：任務進 blocked 且不暴露計畫", async () => {
  const { root, core, taskId } = await dispatched();
  writeResult(root, taskId, { status: "blocked", operations: [], failure: { code: "scope-unclear", message: "無法安全推斷" } });

  const dispatchCore = createDispatchCore({ core, binding: BINDING, client: { cardStatus: async () => ({ column: "RUNNING", approved: true }) } });
  const detail = await dispatchCore.taskDetail({ member: MEMBER, taskId });

  assert.equal(detail.status, "blocked");
  assert.equal(detail.plan, null);
});

test("沒有 result 且看板回需要處理：任務進 blocked", async () => {
  const { core, taskId } = await dispatched();
  const dispatchCore = createDispatchCore({
    core,
    binding: BINDING,
    client: { cardStatus: async () => ({ column: "NEEDS_ATTENTION", approved: true, attentionReason: "hub-input-missing" }) },
  });
  const detail = await dispatchCore.taskDetail({ member: MEMBER, taskId });
  assert.equal(detail.status, "blocked");
});

test("查不到看板狀態：任務不動，讀取仍然成功", async () => {
  const { core, taskId } = await dispatched();
  const dispatchCore = createDispatchCore({
    core,
    binding: BINDING,
    client: {
      cardStatus: async () => {
        throw Object.assign(new Error("down"), { code: "task-board-unreachable" });
      },
    },
  });
  const detail = await dispatchCore.taskDetail({ member: MEMBER, taskId });
  assert.equal(detail.status, "queued");
  assert.equal(detail.dispatch.cardId, "card-1");
  assert.equal(detail.dispatch.boardColumn, "CLAIMABLE");
});

test("看板狀態變動：派工區塊更新為已放行", async () => {
  const { core, taskId } = await dispatched();
  const dispatchCore = createDispatchCore({
    core,
    binding: BINDING,
    client: { cardStatus: async () => ({ column: "CLAIMABLE", approved: true }) },
  });
  const list = await dispatchCore.listTasks(READ_ARGS);
  const item = list.items.find((entry) => entry.id === taskId);
  assert.equal(item.status, "queued");
  assert.equal(item.dispatch.approved, true, "Plugin 才能說「已放行、等待領取」");
  assert.equal(item.dispatch.stalled, false);
});

test("已放行卻長時間無人領取：派工資訊標記為停滯", async () => {
  const { core, taskId } = await dispatched();
  const dispatchCore = createDispatchCore({
    core,
    binding: { ...BINDING, stallMs: 0 },
    client: { cardStatus: async () => ({ column: "CLAIMABLE", approved: true }) },
  });
  const detail = await dispatchCore.taskDetail({ member: MEMBER, taskId });
  assert.equal(detail.status, "queued");
  assert.equal(detail.dispatch.stalled, true);
});

test("派工資訊不含控制平面 URL 與 token", async () => {
  const { core, taskId } = await dispatched();
  const dispatchCore = createDispatchCore({
    core,
    binding: BINDING,
    client: { cardStatus: async () => ({ column: "CLAIMABLE", approved: false }) },
  });
  const detail = await dispatchCore.taskDetail({ member: MEMBER, taskId });
  const serialized = JSON.stringify(detail);
  assert.ok(!serialized.includes("board.example.com"));
  assert.ok(!serialized.includes("wtk_test"));
});

test("任務狀態機沒有新增狀態：未知狀態的轉移仍被拒", async () => {
  const { core, taskId } = await dispatched();
  const task = core.store.get(taskId);
  assert.throws(
    () => core.transition(task, "dispatched"),
    (error) => error.code === "invalid-task-status-transition",
  );
});

test("Plugin 套用完成：回寫 applied 到看板", async () => {
  const { root, core, taskId } = await dispatched();
  const outcomes = [];
  writeResult(root, taskId, {
    operations: [
      {
        type: "rename-node",
        operationId: "op-1",
        nodeId: "1:2",
        beforeName: "Cards",
        afterName: "Cards / Section",
        reason: "與同層兄弟節點的結構命名不一致",
      },
    ],
  });
  const dispatchCore = createDispatchCore({
    core,
    binding: BINDING,
    client: {
      cardStatus: async () => ({ column: "AWAITING_REVIEW", approved: true }),
      reportOutcome: async (cardId, outcome, errorCode) => {
        outcomes.push({ cardId, outcome, errorCode });
        return { applied: true, column: "DONE" };
      },
    },
  });
  const detail = await dispatchCore.taskDetail({ member: MEMBER, taskId });
  assert.equal(detail.status, "plan-ready");

  const applying = dispatchCore.applyIntent({
    member: MEMBER,
    taskId,
    revision: detail.revision,
    inputSnapshotHash: core.store.get(taskId).inputSnapshotHash,
    operationIds: ["op-1"],
  });
  dispatchCore.completeTask({
    member: MEMBER,
    taskId,
    revision: applying.task.revision,
    proof: {
      taskId,
      projectId: "aurora",
      fileKey: FILE_KEY,
      scopeNodeId: "1:2",
      taskType: "figma-cleanup",
      inputSnapshotHash: core.store.get(taskId).inputSnapshotHash,
      selectedOperationIds: ["op-1"],
      outcomes: [{ operationId: "op-1", applied: true }],
    },
  });
  await dispatchCore.writeBacksSettled();

  assert.deepEqual(outcomes, [{ cardId: "card-1", outcome: "applied", errorCode: undefined }]);
  assert.equal(core.store.get(taskId).status, "completed");
});

test("Plugin 套用失敗：回寫 failed 並只帶穩定錯誤碼", async () => {
  const { root, core, taskId } = await dispatched();
  const outcomes = [];
  writeResult(root, taskId);
  const dispatchCore = createDispatchCore({
    core,
    binding: BINDING,
    client: {
      cardStatus: async () => ({ column: "AWAITING_REVIEW", approved: true }),
      reportOutcome: async (cardId, outcome, errorCode) => {
        outcomes.push({ cardId, outcome, errorCode });
        return { applied: true, column: "NEEDS_ATTENTION" };
      },
    },
  });
  const detail = await dispatchCore.taskDetail({ member: MEMBER, taskId });
  assert.equal(detail.status, "plan-ready");

  dispatchCore.failTask({
    member: MEMBER,
    taskId,
    revision: detail.revision,
    errorCode: "apply-partial-failure",
    rolledBack: true,
  });
  await dispatchCore.writeBacksSettled();

  assert.deepEqual(outcomes, [{ cardId: "card-1", outcome: "failed", errorCode: "apply-partial-failure" }]);
});

test("回寫失敗不影響 Plugin：任務仍然完成，只留一行不含憑證的訊息", async () => {
  const { root, core, taskId } = await dispatched();
  const logs = [];
  writeResult(root, taskId);
  const dispatchCore = createDispatchCore({
    core,
    binding: BINDING,
    log: (message) => logs.push(message),
    client: {
      cardStatus: async () => ({ column: "AWAITING_REVIEW", approved: true }),
      reportOutcome: async () => {
        throw Object.assign(new Error("down"), { code: "task-board-unreachable" });
      },
    },
  });
  const detail = await dispatchCore.taskDetail({ member: MEMBER, taskId });
  const task = core.store.get(taskId);
  const failed = dispatchCore.failTask({
    member: MEMBER,
    taskId,
    revision: task.revision,
    errorCode: "apply-aborted",
    rolledBack: true,
  });
  await dispatchCore.writeBacksSettled();

  assert.equal(detail.status, "plan-ready");
  assert.equal(failed.status, "blocked", "Plugin 仍收到正常回應");
  assert.equal(logs.filter((line) => line.includes("回寫失敗")).length, 1);
  assert.ok(!logs.join("\n").includes("wtk_test"));
  assert.ok(!logs.join("\n").includes("board.example.com"));
});
