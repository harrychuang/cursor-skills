import { createServer } from "node:http";

import { DesignAutomationError } from "./contract.mjs";

const CORS_HEADERS = Object.freeze({
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "authorization, content-type, accept",
  "access-control-max-age": "600",
});

function sendJson(response, status, payload) {
  const body = payload === undefined ? "" : JSON.stringify(payload);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
    ...CORS_HEADERS,
  });
  response.end(body);
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1_100_000) {
      throw new DesignAutomationError("payload-too-large", "Request exceeds the supported size.", { status: 413 });
    }
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new DesignAutomationError("invalid-json", "Request body is not valid JSON.", { status: 400 });
  }
}

function taskRoute(pathname) {
  const match = /^\/v1\/automation\/tasks\/([^/]+)$/.exec(pathname);
  return match ? decodeURIComponent(match[1]) : null;
}

function taskActionRoute(pathname) {
  const match = /^\/v1\/automation\/tasks\/([^/]+)\/(apply|complete|fail)$/.exec(pathname);
  return match ? { taskId: decodeURIComponent(match[1]), action: match[2] } : null;
}

export function createDesignAutomationHubServer({
  core,
  authenticate,
  hostRegistration = null,
  // 派工模式：Plugin 明確送出的清理任務改交團隊看板。這不是萃取佇列——
  // 沒有掃描端點、沒有待萃取集合，工作只來自 Plugin 的單筆送出。
  dispatch = false,
  scheduleTask = (taskId) => {
    Promise.resolve().then(() => core.analyzeTask(taskId)).catch(() => {});
  },
} = {}) {
  if (!core || typeof authenticate !== "function") {
    throw new DesignAutomationError("invalid-server-configuration", "Core and authenticator are required.", { status: 500 });
  }
  return createServer(async (request, response) => {
    const url = new URL(request.url || "/", "http://design-automation.local");
    try {
      if (request.method === "OPTIONS") {
        response.writeHead(204, { "cache-control": "no-store", ...CORS_HEADERS });
        response.end();
        return;
      }
      if (request.method === "GET" && url.pathname === "/healthz") {
        sendJson(response, 200, { status: "ok", schemaVersion: 1, extractionQueue: false, dispatch: Boolean(dispatch) });
        return;
      }
      const member = authenticate(request.headers.authorization);
      if (!member?.id) throw new DesignAutomationError("unauthorized", "Access code is invalid.", { status: 401 });

      if (request.method === "GET" && url.pathname === "/v1/plugin/context") {
        const base = core.pluginContext({ fileKey: url.searchParams.get("fileKey"), member });
        const reviewEnabled = Boolean(hostRegistration?.features?.review && base.permissions.review);
        sendJson(response, 200, {
          ...base,
          features: { ...base.features, review: reviewEnabled },
          permissions: { ...base.permissions, review: reviewEnabled },
        });
        return;
      }

      if (request.method === "GET" && url.pathname === "/v1/automation/tasks") {
        const tasks = await core.listTasks({ member, fileKey: url.searchParams.get("fileKey") });
        sendJson(response, 200, {
          workflowOverview: {
            counts: { completed: 0, active: tasks.items.filter((task) => ["queued", "analyzing", "applying"].includes(task.status)).length, needsReview: 0, blocked: tasks.items.filter((task) => task.status === "blocked").length, stale: tasks.items.filter((task) => task.status === "stale").length, waiting: tasks.items.filter((task) => task.status === "plan-ready").length },
            attention: [],
          },
          ...tasks,
        });
        return;
      }

      const taskId = request.method === "GET" ? taskRoute(url.pathname) : null;
      if (taskId) {
        sendJson(response, 200, await core.taskDetail({ member, taskId }));
        return;
      }

      if (request.method === "GET" && url.pathname === "/v1/reviews/pending") {
        if (!hostRegistration?.features?.review) {
          throw new DesignAutomationError("review-unavailable", "Review is not available for this host.", { status: 404 });
        }
        const context = { fileKey: url.searchParams.get("fileKey"), member, noWrite: true };
        sendJson(response, 200, await hostRegistration.adapter.review.listPendingReviews(context));
        return;
      }

      const body = request.method === "POST" ? await readJson(request) : {};
      const action = request.method === "POST" ? taskActionRoute(url.pathname) : null;
      if (action) {
        if (action.action === "apply") {
          sendJson(response, 200, core.applyIntent({
            member,
            taskId: action.taskId,
            revision: body.revision,
            inputSnapshotHash: body.inputSnapshotHash,
            operationIds: body.operationIds,
          }));
        } else if (action.action === "complete") {
          sendJson(response, 200, core.completeTask({
            member,
            taskId: action.taskId,
            revision: body.revision,
            proof: body.proof,
          }));
        } else {
          sendJson(response, 200, core.failTask({
            member,
            taskId: action.taskId,
            revision: body.revision,
            errorCode: body.errorCode,
            rolledBack: body.rolledBack,
            affectedNodeIds: body.affectedNodeIds,
          }));
        }
        return;
      }

      if (request.method === "POST" && url.pathname === "/v1/automation/tasks") {
        const created = core.createTask({ member, input: body });
        sendJson(response, 200, created);
        if (created.created) scheduleTask(created.task.id);
        return;
      }

      if (request.method === "POST" && url.pathname === "/v1/reviews") {
        if (!hostRegistration?.features?.review) {
          throw new DesignAutomationError("review-unavailable", "Review is not available for this host.", { status: 404 });
        }
        sendJson(response, 200, await hostRegistration.adapter.review.submitReviewDecision({ member }, body));
        return;
      }

      throw new DesignAutomationError("not-found", "Coordinator endpoint was not found.", { status: 404 });
    } catch (error) {
      const safe = error instanceof DesignAutomationError
        ? error
        : new DesignAutomationError("internal-error", "Coordinator encountered an unexpected error.", { status: 500 });
      sendJson(response, safe.status, safe.toJSON());
    }
  });
}
