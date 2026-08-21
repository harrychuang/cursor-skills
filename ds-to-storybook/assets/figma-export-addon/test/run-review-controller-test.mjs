#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  createReviewStatusController,
  createVisualCommentsController,
} from "../dist/review-controller.js";

const requests = [];
const responses = new Map([
  ["GET /review?storyId=parity-fixture--default", {
    entry: { figmaReviewStatus: "imported" },
  }],
  ["PUT /review", {
    entry: { figmaReviewStatus: "approved" },
  }],
  ["GET /comments?storyId=parity-fixture--default", {
    activeSession: null,
    activeReportUrl: null,
    comments: [],
    recentSessions: [],
    reportUrl: "/comments/reports",
  }],
  ["POST /comments/sessions", { id: "meeting-1", reportStale: false }],
  ["PATCH /comments/sessions/meeting-1/comments/comment-1", {
    reportStale: false,
  }],
  ["DELETE /comments/sessions/meeting-1/comments/comment-1", {
    reportStale: false,
  }],
]);

const fetcher = async (url, init = {}) => {
  const method = init.method ?? "GET";
  const key = `${method} ${url}`;
  requests.push({ key, init });
  const payload = responses.get(key);
  if (!payload) {
    return response(503, { error: `No fixture response for ${key}` });
  }
  return response(200, payload);
};

const status = createReviewStatusController({
  apiPath: "/review",
  fetcher,
});
assert.deepEqual(
  await status.load("parity-fixture--default"),
  { figmaReviewStatus: "imported" },
);
assert.deepEqual(
  await status.save("parity-fixture--default", { figmaReviewStatus: "approved" }),
  { entry: { figmaReviewStatus: "approved" } },
);

const comments = createVisualCommentsController({
  apiPath: "/comments",
  fetcher,
});
assert.equal(
  (await comments.getOverview("parity-fixture--default")).reportUrl,
  "/comments/reports",
);
await comments.post("/sessions", { title: "Weekly review" });
await comments.patch(
  "/sessions/meeting-1/comments/comment-1",
  { body: "Updated copy", pin: { xRatio: 0.25, yRatio: 0.75 } },
);
await comments.delete("/sessions/meeting-1/comments/comment-1");

assert.deepEqual(
  JSON.parse(requests.find((request) => request.key === "POST /comments/sessions").init.body),
  { title: "Weekly review" },
);
assert.deepEqual(
  JSON.parse(
    requests.find(
      (request) =>
        request.key === "PATCH /comments/sessions/meeting-1/comments/comment-1",
    ).init.body,
  ),
  { body: "Updated copy", pin: { xRatio: 0.25, yRatio: 0.75 } },
);
await assert.rejects(
  () => comments.post("/missing"),
  /Visual comments POST \/comments\/missing returned HTTP 503: No fixture response/,
);

console.log("Framework-neutral review controller tests passed.");

function response(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return payload;
    },
  };
}
