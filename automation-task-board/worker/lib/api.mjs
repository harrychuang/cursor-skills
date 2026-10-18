// 控制平面 HTTP client：worker token 認證、退避重試（Resilient reporting 的傳輸層）。
import { setTimeout as sleep } from "node:timers/promises";

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message ?? `API ${status} ${code ?? ""}`);
    this.status = status;
    this.code = code;
  }
}

export function createApi(config, { maxRetries = 5, baseDelayMs = 500 } = {}) {
  const base = config.controlPlaneUrl;
  const headers = {
    Authorization: `Bearer ${config.workerToken}`,
    "Content-Type": "application/json",
  };

  /**
   * POST with 退避重試：網路錯誤與 5xx 重試；4xx 直接失敗（語意錯誤重試無意義）。
   * 409/204 屬正常流程結果，由呼叫端處理。
   */
  async function post(pathName, body, { retries = maxRetries } = {}) {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      if (attempt > 0) await sleep(baseDelayMs * 2 ** (attempt - 1));
      try {
        const res = await fetch(`${base}${pathName}`, { method: "POST", headers, body: JSON.stringify(body) });
        if (res.status >= 500) {
          lastError = new ApiError(res.status, "server-error");
          continue;
        }
        if (res.status === 204) return { status: 204, data: null };
        const data = await res.json().catch(() => null);
        if (!res.ok) return { status: res.status, data };
        return { status: res.status, data };
      } catch (error) {
        lastError = error; // 網路層錯誤：重試
      }
    }
    throw lastError ?? new Error("unreachable");
  }

  return {
    register: (payload) => post("/api/worker/register", payload),
    claim: (payload) => post("/api/worker/claim", payload, { retries: 0 }), // 輪詢下一輪自然重試
    heartbeat: (payload) => post("/api/worker/heartbeat", payload, { retries: 1 }),
    report: (payload) => post("/api/worker/report", payload),
    logs: (payload) => post("/api/worker/logs", payload, { retries: 2 }),
    projectStatus: (payload) => post("/api/worker/project-status", payload, { retries: 1 }),
    externalRuns: (payload) => post("/api/worker/external-runs", payload, { retries: 1 }),
  };
}
