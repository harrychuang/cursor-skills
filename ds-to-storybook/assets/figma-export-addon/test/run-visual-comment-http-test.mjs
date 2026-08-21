import assert from "node:assert/strict";
import http from "node:http";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVisualCommentsHandler } from "../dist/review-server.js";
import { createVisualCommentStore } from "../dist/visual-comment-store.js";

const root = await mkdtemp(join(tmpdir(), "sbfx-comments-http-"));
const apiPath = "/__custom_review_comments";
const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const store = createVisualCommentStore({ cwd: root });
const handler = createVisualCommentsHandler({ basePath: apiPath, store });
const server = http.createServer((request, response) => {
  if (request.url?.startsWith(apiPath)) {
    request.url = request.url.slice(apiPath.length) || "/";
  }
  handler(request, response);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}${apiPath}`;

function commentRequest(id) {
  return {
    clientRequestId: id,
    authorName: "Mina",
    body: "Check alignment",
    story: { id: "demo--story", title: "Demo", name: "Story" },
    pin: { xRatio: 1.2, yRatio: -0.2 },
    viewport: { width: 800, height: 600, devicePixelRatio: 1, scrollX: 0, scrollY: 0 },
    capture: { dataUrl: png, mimeType: "image/png", width: 1, height: 1, cssWidth: 800, cssHeight: 600 },
  };
}

async function post(path, body) {
  return fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function patch(path, body) {
  return fetch(`${base}${path}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function del(path) {
  return fetch(`${base}${path}`, { method: "DELETE" });
}

try {
  const [startA, startB] = await Promise.all([
    post("/sessions", { title: "Meeting A" }),
    post("/sessions", { title: "Meeting B" }),
  ]);
  const [startPayloadA, startPayloadB] = await Promise.all([startA.json(), startB.json()]);
  assert.deepEqual(
    [startA.status, startB.status].sort(),
    [201, 409],
    JSON.stringify([startPayloadA, startPayloadB]),
  );
  const createdResponse = startA.status === 201 ? startA : startB;
  const conflictResponse = startA.status === 409 ? startA : startB;
  const created = startA.status === 201 ? startPayloadA : startPayloadB;
  const conflict = startA.status === 409 ? startPayloadA : startPayloadB;
  const meetingId = created.meeting.session.id;
  assert.equal(conflict.code, "ACTIVE");
  assert.equal(conflict.activeMeeting.id, meetingId);
  assert.equal(createdResponse.headers.get("access-control-allow-origin"), null);

  const overviewResponse = await fetch(`${base}?storyId=demo--story`);
  const overview = await overviewResponse.json();
  assert.equal(overview.activeSession.id, meetingId);
  assert.equal(overview.activeSession.captureCount, 0);
  assert.equal(overview.activeSession.commentCount, 0);
  assert.deepEqual(overview.recentSessions, []);
  assert.equal(overview.reportUrl, `${apiPath}/reports`);

  const commentResponse = await post(`/sessions/${meetingId}/comments`, commentRequest("http-1"));
  assert.equal(commentResponse.status, 201);
  const comment = await commentResponse.json();
  assert.equal(comment.comment.pin.xRatio, 1);
  assert.equal(comment.comment.pin.yRatio, 0);
  assert.equal(comment.comment.resolvedAt ?? null, null, "legacy comments are Open");
  const countedOverview = await (await fetch(`${base}?storyId=demo--story`)).json();
  assert.equal(countedOverview.activeSession.captureCount, 1);
  assert.equal(countedOverview.activeSession.commentCount, 1);
  assert.equal(countedOverview.comments[0].ordinal, 1);
  assert.deepEqual(
    {
      width: countedOverview.comments[0].preview.width,
      height: countedOverview.comments[0].preview.height,
      pin: countedOverview.comments[0].preview.pin,
    },
    { width: 1, height: 1, pin: { xRatio: 1, yRatio: 0 } },
  );
  assert.match(
    countedOverview.comments[0].preview.imageUrl,
    new RegExp(`^${apiPath}/reports/sessions/${meetingId}/assets/[a-f0-9]{64}\\.png$`),
    "overview projects a same-origin asset URL through the configured comments base path",
  );
  assert.equal(
    (await fetch(new URL(countedOverview.comments[0].preview.imageUrl, base))).status,
    200,
    "the derived preview asset URL is directly readable",
  );

  const invalidBefore = (await (await fetch(`${base}/sessions/${meetingId}`)).json()).comments.length;
  const invalidJson = await post(`/sessions/${meetingId}/comments`, "{");
  assert.equal(invalidJson.status, 400);
  const oversized = await post(
    `/sessions/${meetingId}/comments`,
    JSON.stringify({ value: "x".repeat(4 * 1024 * 1024 + 1) }),
  );
  assert.equal(oversized.status, 413);
  const invalidAfter = (await (await fetch(`${base}/sessions/${meetingId}`)).json()).comments.length;
  assert.equal(invalidAfter, invalidBefore);

  assert.equal(
    (await patch(`/sessions/${meetingId}/comments/${comment.comment.id}`, { resolved: "yes" })).status,
    400,
  );
  assert.equal(
    (await patch(`/sessions/${meetingId}/comments/${comment.comment.id}`, { resolved: true, body: "rewrite" })).status,
    400,
    "PATCH accepts exactly one supported lifecycle field",
  );
  assert.equal(
    (await patch(`/sessions/${meetingId}/comments/${comment.comment.id}`, { body: 42 })).status,
    400,
  );
  assert.equal(
    (await patch(`/sessions/${meetingId}/comments/${comment.comment.id}`, { body: "   " })).status,
    400,
  );
  assert.equal(
    (
      await patch(`/sessions/${meetingId}/comments/${comment.comment.id}`, {
        body: "x".repeat(2001),
      })
    ).status,
    400,
  );
  assert.equal(
    (await patch(`/sessions/${meetingId}/comments/${comment.comment.id}`, { unknown: true })).status,
    400,
  );
  assert.equal(
    (await patch(`/sessions/${meetingId}/comments/${comment.comment.id}`, {})).status,
    400,
    "empty comment edits are rejected",
  );
  assert.equal(
    (
      await patch(`/sessions/${meetingId}/comments/${comment.comment.id}`, {
        body: "Valid body",
        pin: { xRatio: 1.01, yRatio: 0.5 },
      })
    ).status,
    400,
    "out-of-range point edits are rejected",
  );
  assert.equal(
    (
      await patch(`/sessions/${meetingId}/comments/${comment.comment.id}`, {
        pin: { xRatio: null, yRatio: 0.5 },
      })
    ).status,
    400,
    "non-finite point edits are rejected",
  );
  assert.equal(
    (await patch(`/sessions/${meetingId}/comments/missing-comment`, { body: "Missing" })).status,
    404,
  );
  assert.equal(
    (await patch(`/sessions/${meetingId}/comments/missing-comment`, { resolved: true })).status,
    404,
  );
  assert.equal((await del(`/sessions/${meetingId}/comments/missing-comment`)).status, 404);

  const beforeBodyEditMeeting = await (
    await fetch(`${base}/sessions/${meetingId}`)
  ).json();
  const beforeBodyEditCapture = structuredClone(
    beforeBodyEditMeeting.captures[comment.comment.captureId],
  );
  const bodyEditResponse = await patch(
    `/sessions/${meetingId}/comments/${comment.comment.id}`,
    { body: "  Align the primary label  " },
  );
  assert.equal(bodyEditResponse.status, 200);
  const bodyEdited = await bodyEditResponse.json();
  assert.equal(bodyEdited.comment.body, "Align the primary label");
  assert.equal(bodyEdited.reportStale, false);
  assert.deepEqual(
    {
      authorName: bodyEdited.comment.authorName,
      captureId: bodyEdited.comment.captureId,
      createdAt: bodyEdited.comment.createdAt,
      pin: bodyEdited.comment.pin,
      resolvedAt: bodyEdited.comment.resolvedAt ?? null,
    },
    {
      authorName: comment.comment.authorName,
      captureId: comment.comment.captureId,
      createdAt: comment.comment.createdAt,
      pin: comment.comment.pin,
      resolvedAt: null,
    },
    "body PATCH preserves comment evidence metadata",
  );
  assert.deepEqual(
    bodyEdited.meeting.captures[comment.comment.captureId],
    beforeBodyEditCapture,
    "body PATCH preserves capture and image metadata",
  );
  const beforeAtomicEdit = structuredClone(bodyEdited.comment);
  const atomicEditResponse = await patch(
    `/sessions/${meetingId}/comments/${comment.comment.id}`,
    {
      body: "  Align the label and point  ",
      pin: { xRatio: 0.62, yRatio: 0.74 },
    },
  );
  assert.equal(atomicEditResponse.status, 200);
  const atomicEdited = await atomicEditResponse.json();
  assert.equal(atomicEdited.comment.body, "Align the label and point");
  assert.deepEqual(atomicEdited.comment.pin, { xRatio: 0.62, yRatio: 0.74 });
  assert.deepEqual(
    {
      authorName: atomicEdited.comment.authorName,
      captureId: atomicEdited.comment.captureId,
      createdAt: atomicEdited.comment.createdAt,
      resolvedAt: atomicEdited.comment.resolvedAt ?? null,
    },
    {
      authorName: beforeAtomicEdit.authorName,
      captureId: beforeAtomicEdit.captureId,
      createdAt: beforeAtomicEdit.createdAt,
      resolvedAt: beforeAtomicEdit.resolvedAt ?? null,
    },
    "body and point PATCH preserves immutable comment metadata",
  );
  const pinOnlyResponse = await patch(
    `/sessions/${meetingId}/comments/${comment.comment.id}`,
    { pin: { xRatio: 0.18, yRatio: 0.29 } },
  );
  assert.equal(pinOnlyResponse.status, 200);
  const pinOnlyEdited = await pinOnlyResponse.json();
  assert.equal(pinOnlyEdited.comment.body, "Align the label and point");
  assert.deepEqual(pinOnlyEdited.comment.pin, { xRatio: 0.18, yRatio: 0.29 });
  const beforeInvalidAtomic = structuredClone(pinOnlyEdited.comment);
  assert.equal(
    (
      await patch(`/sessions/${meetingId}/comments/${comment.comment.id}`, {
        body: "This must not be written",
        pin: { xRatio: -0.01, yRatio: 0.5 },
      })
    ).status,
    400,
  );
  assert.deepEqual(
    (
      await (await fetch(`${base}/sessions/${meetingId}`)).json()
    ).comments.find((entry) => entry.id === comment.comment.id),
    beforeInvalidAtomic,
    "an invalid point prevents a valid body from being partially written",
  );

  const completeResponse = await patch(
    `/sessions/${meetingId}/comments/${comment.comment.id}`,
    { resolved: true },
  );
  assert.equal(completeResponse.status, 200);
  const completed = await completeResponse.json();
  assert.ok(completed.comment.resolvedAt);
  assert.equal(completed.comment.body, "Align the label and point");
  assert.equal(completed.comment.authorName, comment.comment.authorName);
  const repeatedComplete = await (
    await patch(`/sessions/${meetingId}/comments/${comment.comment.id}`, { resolved: true })
  ).json();
  assert.equal(repeatedComplete.comment.resolvedAt, completed.comment.resolvedAt);
  const reopenResponse = await patch(
    `/sessions/${meetingId}/comments/${comment.comment.id}`,
    { resolved: false },
  );
  assert.equal(reopenResponse.status, 200);
  assert.equal((await reopenResponse.json()).comment.resolvedAt ?? null, null);

  const meeting = await (await fetch(`${base}/sessions/${meetingId}`)).json();
  const asset = Object.values(meeting.captures)[0].image.path.split("/").pop();
  const reportsRedirect = await fetch(`${base}/reports`, { redirect: "manual" });
  assert.equal(reportsRedirect.status, 308);
  assert.equal(reportsRedirect.headers.get("location"), `${apiPath}/reports/`);
  const reportsIndexResponse = await fetch(`${base}/reports/`);
  assert.equal(reportsIndexResponse.status, 200);
  const reportsIndex = await reportsIndexResponse.text();
  const reportHref = reportsIndex.match(/href="(sessions\/[^"]+\/index\.html)"/)?.[1];
  assert.ok(reportHref, "Reports index should expose a relative static session report link");
  const resolvedReportUrl = new URL(reportHref, `${base}/reports/`);
  assert.equal(
    resolvedReportUrl.pathname,
    `${apiPath}/reports/sessions/${meetingId}/index.html`,
  );
  await writeFile(
    join(store.root, "sessions", meetingId, "index.html"),
    "<!doctype html><title>STALE PRE-UPGRADE REPORT</title>",
  );
  const refreshedReportResponse = await fetch(resolvedReportUrl);
  assert.equal(refreshedReportResponse.status, 200);
  const refreshedReport = await refreshedReportResponse.text();
  assert.doesNotMatch(refreshedReport, /STALE PRE-UPGRADE REPORT/);
  assert.match(refreshedReport, /data-comment-action="copy-ai-prompt">Copy AI prompt<\/button>/);
  assert.match(refreshedReport, /Align the label and point/);
  assert.match(
    refreshedReport,
    /data-comment-edit-pin[^>]*style="left:18%;top:29%"/,
    "the regenerated HTTP report includes the edited canonical point",
  );
  assert.match(
    refreshedReport,
    new RegExp(`"projectRelativePath":"design-system/figma-export-review/sessions/${meetingId}/assets/[a-f0-9]{64}\\.png"`),
  );
  assert.match(refreshedReport, /data-comment-action="delete" aria-label="Delete comment"/);
  assert.match(refreshedReport, /<div class="delete-dialog" data-delete-dialog role="dialog" aria-modal="true" hidden/);
  assert.equal((await fetch(`${base}/reports/sessions/${meetingId}/assets/${asset}`)).status, 200);
  assert.equal((await fetch(`${base}/reports/sessions/${meetingId}/assets/../../state.json`)).status, 404);

  assert.equal((await post(`/sessions/${meetingId}/close`)).status, 200);
  const closedOverview = await (await fetch(base)).json();
  assert.equal(closedOverview.activeSession, null);
  assert.equal(closedOverview.recentSessions[0].id, meetingId);
  assert.equal(closedOverview.recentSessions[0].captureCount, 1);
  assert.equal(closedOverview.recentSessions[0].commentCount, 1);
  assert.equal((await post(`/sessions/${meetingId}/comments`, commentRequest("http-2"))).status, 409);

  const closedCompleteResponse = await patch(
    `/sessions/${meetingId}/comments/${comment.comment.id}`,
    { resolved: true },
  );
  assert.equal(closedCompleteResponse.status, 200, "closed meeting comments can be completed");
  const closedComplete = await closedCompleteResponse.json();
  assert.ok(closedComplete.comment.resolvedAt);
  assert.ok(closedComplete.meeting.session.closedAt, "lifecycle mutation does not reopen the meeting");
  const closedEditResponse = await patch(
    `/sessions/${meetingId}/comments/${comment.comment.id}`,
    { body: "Closed review label", pin: { xRatio: 0.36, yRatio: 0.58 } },
  );
  assert.equal(closedEditResponse.status, 200, "closed meeting comments can be edited");
  const closedEdited = await closedEditResponse.json();
  assert.equal(closedEdited.comment.body, "Closed review label");
  assert.deepEqual(closedEdited.comment.pin, { xRatio: 0.36, yRatio: 0.58 });
  assert.equal(closedEdited.comment.resolvedAt, closedComplete.comment.resolvedAt);
  assert.equal(closedEdited.meeting.session.closedAt, closedComplete.meeting.session.closedAt);

  const deleteResponse = await del(`/sessions/${meetingId}/comments/${comment.comment.id}`);
  assert.equal(deleteResponse.status, 200);
  const deleteResult = await deleteResponse.json();
  assert.equal(deleteResult.deletedCommentId, comment.comment.id);
  assert.equal(deleteResult.deletedCaptureId, comment.comment.captureId);
  assert.equal(deleteResult.deletedAssetPath, `assets/${asset}`);
  const afterDelete = await (await fetch(`${base}/sessions/${meetingId}`)).json();
  assert.equal(afterDelete.comments.length, 0);
  assert.equal(Object.keys(afterDelete.captures).length, 0, "DELETE removes the unreferenced capture record");
  assert.equal((await fetch(`${base}/reports/sessions/${meetingId}/assets/${asset}`)).status, 404);
  const afterDeleteOverview = await (await fetch(base)).json();
  assert.equal(afterDeleteOverview.recentSessions[0].commentCount, 0);
  assert.equal(afterDeleteOverview.recentSessions[0].captureCount, 0);
  const afterDeleteReport = await (await fetch(`${base}/reports/sessions/${meetingId}/index.html`)).text();
  assert.match(afterDeleteReport, /0 captures · 0 comments/);
  assert.match(afterDeleteReport, /This meeting has 0 captures and 0 comments\./);
  assert.doesNotMatch(afterDeleteReport, /<img /);
  const afterDeleteIndexResponse = await fetch(`${base}/reports/`);
  assert.equal(afterDeleteIndexResponse.status, 200);
  const afterDeleteIndex = await afterDeleteIndexResponse.text();
  assert.match(afterDeleteIndex, /No saved review evidence yet\./);
  assert.doesNotMatch(afterDeleteIndex, new RegExp(`sessions/${meetingId}/index\\.html`));
  assert.doesNotMatch(afterDeleteIndex, /Closed meeting history/);
  assert.doesNotMatch(afterDeleteIndex, /0 captures · 0 comments/);
  const directEmptyReportResponse = await fetch(`${base}/reports/sessions/${meetingId}/index.html`);
  assert.equal(directEmptyReportResponse.status, 200, "direct empty session report remains readable");
  assert.match(await directEmptyReportResponse.text(), /This meeting has 0 captures and 0 comments\./);
  console.log("visual comment HTTP checks passed");
} finally {
  await new Promise((resolve) => server.close(resolve));
  await rm(root, { recursive: true, force: true });
}
