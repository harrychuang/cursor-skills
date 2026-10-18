import { DesignAutomationError } from "./contract.mjs";

// 控制平面的最小客戶端：建卡、查卡片狀態、回寫 Plugin 的 apply 結果。
// Hub 不重做看板、lease、heartbeat——這裡只有三個呼叫，其餘一律是看板自己的事。
// 錯誤一律轉成穩定錯誤碼，訊息不含控制平面 URL、token 或回應內文。
const DEFAULT_TIMEOUT_MS = 10_000;

function unreachable(message) {
  return new DesignAutomationError("task-board-unreachable", message, { status: 503, retryable: true });
}

export function createTaskBoardClient(binding, { timeoutMs = DEFAULT_TIMEOUT_MS, fetchImpl = fetch } = {}) {
  async function call(method, pathName, body) {
    let response;
    try {
      response = await fetchImpl(`${binding.controlPlaneUrl}${pathName}`, {
        method,
        headers: {
          Authorization: `Bearer ${binding.token}`,
          "Content-Type": "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw unreachable("Task board is unreachable.");
    }
    if (response.status === 401 || response.status === 403) {
      throw new DesignAutomationError("task-board-unauthorized", "Task board rejected the dispatch credential.", {
        status: 502,
      });
    }
    if (!response.ok) throw unreachable("Task board rejected the dispatch request.");
    const parsed = await response.json().catch(() => null);
    if (!parsed || typeof parsed !== "object") throw unreachable("Task board returned an unreadable response.");
    return parsed;
  }

  return {
    /** 建卡（以 automation task id 冪等）。 */
    async createCard({ projectSlug, taskId, hubAutomationTaskId, note }) {
      const data = await call("POST", "/api/hub/cards", { projectSlug, taskId, hubAutomationTaskId, note });
      if (typeof data.cardId !== "string" || data.cardId === "") throw unreachable("Task board returned no card id.");
      return {
        cardId: data.cardId,
        column: typeof data.column === "string" ? data.column : "CLAIMABLE",
        approved: data.approved === true,
        created: data.created === true,
      };
    },

    /** 查卡片狀態（只回欄位、是否放行、需要處理原因）。 */
    async cardStatus(cardId) {
      const data = await call("GET", `/api/hub/cards/${encodeURIComponent(cardId)}`);
      return {
        column: typeof data.column === "string" ? data.column : null,
        approved: data.approved === true,
        attentionReason: typeof data.attentionReason === "string" ? data.attentionReason : null,
      };
    },

    /** 回寫 Plugin 的 apply 結果；卡片不在待確認時看板只記歷史，回 applied false。 */
    async reportOutcome(cardId, outcome, errorCode) {
      const data = await call("POST", `/api/hub/cards/${encodeURIComponent(cardId)}/outcome`, { outcome, errorCode });
      return { applied: data.applied === true, column: typeof data.column === "string" ? data.column : null };
    },
  };
}
