import fs from "node:fs";
import path from "node:path";

import { createTaskInvocation } from "./agent-runner.mjs";
import { isInside, readJsonFile, validateCleanupInput, validateCleanupResult } from "./contract.mjs";

// 派工模式：綁定存在時，Plugin 送出的清理任務不在這台機器立刻分析，
// 改為「落地 snapshot → 在看板建一張未放行的卡 → 任務留在 queued 等 worker」。
//
// 接法刻意是「注入排程函式 + 裝飾 core」而不是在 core 裡加 mode 旗標：
// core.mjs 與 agent-runner.mjs 因此一行都不用改，standalone 不變是結構上的事實，
// 而不是需要逐行證明的宣稱。
const CLEANUP_TASK_ID = "figma-cleanup";

/** run-task 要用的 request 字串——與本機分析路徑產生的完全相同。 */
export function cleanupRequestFor(invocation) {
  return `Read ${invocation.inputRelative} and write exactly one result to ${invocation.resultRelative}.`;
}

/**
 * 派工版排程函式：取代預設的「建立後立刻 analyzeTask」。
 *
 * @returns {(taskId: string) => Promise<void>}
 */
export function createDispatchScheduler({ core, binding, client, log = () => {} }) {
  return async function scheduleTask(taskId) {
    const task = core.store.get(taskId);
    if (!task || task.status !== "queued" || task.dispatch) return;
    try {
      // snapshot 先落地：worker 領到卡之後讀的就是這份 input.json
      const invocation = createTaskInvocation(core.projectRoot, task);
      const card = await client.createCard({
        projectSlug: binding.projectSlug,
        taskId: CLEANUP_TASK_ID,
        hubAutomationTaskId: task.id,
        note: cleanupRequestFor(invocation),
      });
      core.store.compareAndSwap(task.id, task.revision, {
        dispatch: {
          cardId: card.cardId,
          boardColumn: card.column,
          approved: card.approved,
          dispatchedAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      });
      log(`已派工到團隊看板：卡片 ${card.cardId}`);
    } catch (error) {
      const current = core.store.get(taskId);
      if (!current || current.status !== "queued") return;
      const code = error?.code === "task-board-unauthorized" ? "task-board-unauthorized" : "task-board-unreachable";
      core.transition(current, "blocked", {
        plan: null,
        genericRunId: null,
        failure: {
          code,
          message:
            code === "task-board-unauthorized"
              ? "The task board rejected this project's dispatch credential."
              : "The task board could not be reached; the cleanup was not dispatched.",
          retryable: true,
        },
      });
      log(`派工失敗（${code}），任務已標記為需要重送。`);
    }
  };
}

const ANALYSIS_FAILURE_CODES = new Set([
  "automation-runtime-unavailable",
  "cleanup-analysis-failed",
  "invalid-cleanup-result",
  "invalid-cleanup-operation",
]);

function runtimeDirectoryFor(projectRoot, taskId) {
  const directory = path.resolve(projectRoot, ".design-automation", "runtime", taskId);
  if (!isInside(fs.realpathSync(projectRoot), directory)) return null;
  return directory;
}

/** 讀 worker 產生的 result.json 並以既有的結果驗證邏輯驗證；沒有結果回 null。 */
function readDispatchedResult(projectRoot, taskId) {
  const directory = runtimeDirectoryFor(projectRoot, taskId);
  if (!directory) return null;
  const resultPath = path.join(directory, "result.json");
  const inputPath = path.join(directory, "input.json");
  if (!fs.existsSync(resultPath) || !fs.existsSync(inputPath)) return null;
  if (fs.lstatSync(resultPath).isSymbolicLink()) {
    throw new Error("cleanup result cannot be a symlink");
  }
  const input = validateCleanupInput(readJsonFile(inputPath, { code: "invalid-cleanup-input" }));
  return validateCleanupResult(readJsonFile(resultPath, { code: "invalid-cleanup-result" }), { input });
}

function blockedFailure(code) {
  return {
    code,
    message:
      code === "automation-runtime-unavailable"
        ? "Automation runtime is not ready."
        : "Cleanup analysis did not produce a safe plan.",
    retryable: code !== "invalid-cleanup-operation",
  };
}

/**
 * 調解一筆已派工但仍 queued 的任務。狀態機一個轉移都不加：
 * 走的是本機分析路徑同樣的 queued → analyzing → plan-ready / blocked。
 */
async function reconcileTask(core, binding, client, task, log) {
  let result;
  try {
    result = readDispatchedResult(core.projectRoot, task.id);
  } catch (error) {
    const analyzing = core.transition(task, "analyzing");
    core.transition(analyzing, "blocked", {
      plan: null,
      genericRunId: null,
      failure: blockedFailure(ANALYSIS_FAILURE_CODES.has(error?.code) ? error.code : "cleanup-analysis-failed"),
    });
    return;
  }

  if (result) {
    const analyzing = core.transition(task, "analyzing");
    if (result.status === "blocked") {
      core.transition(analyzing, "blocked", {
        plan: null,
        genericRunId: result.agentAutomationRunId,
        failure: blockedFailure("cleanup-analysis-failed"),
      });
      return;
    }
    core.transition(analyzing, "plan-ready", {
      plan: { summary: result.summary, operations: result.operations },
      genericRunId: result.agentAutomationRunId,
      failure: null,
    });
    return;
  }

  // 還沒有結果：問看板這張卡現在在哪一欄。查不到就什麼都不改，讀取本身不能失敗。
  let status;
  try {
    status = await client.cardStatus(task.dispatch.cardId);
  } catch {
    return;
  }
  if (status.column === "NEEDS_ATTENTION") {
    const analyzing = core.transition(task, "analyzing");
    core.transition(analyzing, "blocked", {
      plan: null,
      genericRunId: null,
      failure: blockedFailure("cleanup-analysis-failed"),
    });
    log(`看板回報卡片 ${task.dispatch.cardId} 需要處理，任務已標記為封鎖。`);
    return;
  }
  if (status.column === task.dispatch.boardColumn && status.approved === task.dispatch.approved) return;
  core.store.compareAndSwap(task.id, task.revision, {
    dispatch: { ...task.dispatch, boardColumn: status.column, approved: status.approved },
  });
}

/** 給 Plugin 看的派工資訊：不含控制平面 URL 與 token。 */
function dispatchView(task, binding) {
  if (!task?.dispatch) return null;
  const waitedMs = Date.now() - Date.parse(task.dispatch.dispatchedAt ?? "");
  return {
    cardId: task.dispatch.cardId,
    boardColumn: task.dispatch.boardColumn,
    approved: task.dispatch.approved,
    dispatchedAt: task.dispatch.dispatchedAt,
    // 停滯：已放行卻遲遲沒有機器領走，代表沒有機器讀得到這個專案的 runtime 目錄
    stalled:
      task.status === "queued"
      && task.dispatch.boardColumn === "CLAIMABLE"
      && Number.isFinite(waitedMs)
      && waitedMs > binding.stallMs,
  };
}

/**
 * 裝飾既有 core：讀取任務前先調解，並把派工資訊掛回給 Plugin。
 * 其餘方法一律原樣轉發——core.mjs 因此不需要任何修改。
 */
export function createDispatchCore({ core, binding, client, log = () => {} }) {
  // 回寫是盡力而為：失敗不改變 Plugin 的回應，也不改變任務狀態，只留一行不含憑證的訊息。
  const inflight = new Set();
  function writeBack(taskId, outcome, errorCode) {
    const dispatchRecord = core.store.get(taskId)?.dispatch;
    if (!dispatchRecord?.cardId) return;
    const pending = client
      .reportOutcome(dispatchRecord.cardId, outcome, errorCode)
      .then((result) => {
        if (!result.applied) log(`看板卡片 ${dispatchRecord.cardId} 已不在待確認，回寫只留下歷史紀錄。`);
      })
      .catch(() => log(`看板回寫失敗（卡片 ${dispatchRecord.cardId}），請在看板上自行處理這張卡。`))
      .finally(() => inflight.delete(pending));
    inflight.add(pending);
  }

  async function reconcileAll(taskIds) {
    for (const taskId of taskIds) {
      const task = core.store.get(taskId);
      if (!task || task.status !== "queued" || !task.dispatch) continue;
      try {
        await reconcileTask(core, binding, client, task, log);
      } catch {
        // 調解失敗不得讓 Plugin 的讀取失敗：維持上次已知狀態
      }
    }
  }

  return {
    get projectRoot() {
      return core.projectRoot;
    },
    get profile() {
      return core.profile;
    },
    get store() {
      return core.store;
    },
    pluginContext: (args) => core.pluginContext(args),
    createTask: (args) => core.createTask(args),
    analyzeTask: (taskId) => core.analyzeTask(taskId),
    applyIntent: (args) => core.applyIntent(args),
    completeTask: (args) => {
      const result = core.completeTask(args);
      writeBack(args.taskId, "applied");
      return result;
    },
    failTask: (args) => {
      const result = core.failTask(args);
      writeBack(args.taskId, "failed", result.failure?.code);
      return result;
    },

    /** 測試用：等待所有在途的回寫結束（正式流程不需要等）。 */
    async writeBacksSettled() {
      await Promise.allSettled([...inflight]);
    },
    transition: (task, next, changes) => core.transition(task, next, changes),

    async listTasks(args) {
      const preview = core.listTasks(args);
      await reconcileAll(preview.items.map((item) => item.id));
      const refreshed = core.listTasks(args);
      return {
        items: refreshed.items.map((item) => ({ ...item, dispatch: dispatchView(core.store.get(item.id), binding) })),
      };
    },

    async taskDetail(args) {
      const preview = core.taskDetail(args);
      await reconcileAll([preview.id]);
      const refreshed = core.taskDetail(args);
      return { ...refreshed, dispatch: dispatchView(core.store.get(refreshed.id), binding) };
    },
  };
}
