// Node verification for the review-server payload store endpoints
// (figma-export-workflow spec: "Payload store endpoints").
// Run from the addon root after npm run build: node test/run-payload-store-test.mjs
import assert from "node:assert";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

const { createFigmaExportPayloadStoreHandler, sanitizePayloadStoryId } = await import(
  "../dist/review-server.js"
);

// sanitize follows the spec example table exactly.
assert.strictEqual(
  sanitizePayloadStoryId("components-button--primary"),
  "components-button--primary",
  "valid storyId unchanged",
);
assert.strictEqual(
  sanitizePayloadStoryId("../../etc/passwd"),
  "etcpasswd",
  "path characters stripped",
);
assert.strictEqual(sanitizePayloadStoryId("../.."), "", "pure traversal sanitizes to empty");

const workDir = mkdtempSync(path.join(os.tmpdir(), "sbfx-payload-store-"));
const payloadDir = path.join(workDir, "payloads");
const handler = createFigmaExportPayloadStoreHandler({ payloadDir });

const server = http.createServer((request, response) => handler(request, response));
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;

function assertCors(response, label) {
  assert.strictEqual(
    response.headers.get("access-control-allow-origin"),
    "*",
    `${label} carries permissive CORS`,
  );
}

try {
  // OPTIONS preflight
  const preflight = await fetch(base, { method: "OPTIONS" });
  assert.strictEqual(preflight.status, 204, "OPTIONS answers 204");
  assertCors(preflight, "OPTIONS");

  // POST a valid payload
  const payload = {
    componentTitle: "Button",
    generatedAt: "2026-07-16T00:00:00.000Z",
    root: { kind: "frame", name: "button", styles: { height: 32, width: 120, x: 0, y: 0 } },
    storyId: "components-button--primary",
    storyName: "Primary",
    tokens: [],
    version: 2,
  };
  const post = await fetch(base, {
    body: JSON.stringify(payload),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  assert.strictEqual(post.status, 201, "valid POST answers 201");
  assertCors(post, "POST");

  // List includes the stored summary
  const list = await fetch(base);
  assert.strictEqual(list.status, 200, "list answers 200");
  assertCors(list, "GET list");
  const entries = await list.json();
  assert.strictEqual(entries.length, 1, "one stored payload listed");
  assert.deepStrictEqual(
    entries[0],
    {
      componentTitle: "Button",
      generatedAt: "2026-07-16T00:00:00.000Z",
      storyId: "components-button--primary",
      storyName: "Primary",
    },
    "summary fields present",
  );

  // Single GET returns the identical payload
  const single = await fetch(`${base}/components-button--primary`);
  assert.strictEqual(single.status, 200, "single GET answers 200");
  assertCors(single, "GET single");
  assert.deepStrictEqual(await single.json(), payload, "stored payload round-trips");

  // Missing entry answers 404
  const missing = await fetch(`${base}/does-not-exist`);
  assert.strictEqual(missing.status, 404, "missing payload answers 404");

  // Spec example: "../../etc/passwd" sanitizes to etcpasswd and stores inside
  // the payload directory.
  const traversalStored = await fetch(base, {
    body: JSON.stringify({ ...payload, storyId: "../../etc/passwd" }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  assert.strictEqual(traversalStored.status, 201, "sanitizable traversal stores");
  assert.ok(
    existsSync(path.join(payloadDir, "etcpasswd.json")),
    "stored under the sanitized name",
  );
  assert.deepStrictEqual(
    readdirSync(payloadDir).sort(),
    ["components-button--primary.json", "etcpasswd.json"],
    "no file escapes the payload directory",
  );

  // Spec example: "../.." sanitizes to empty and is rejected.
  const traversalRejected = await fetch(base, {
    body: JSON.stringify({ ...payload, storyId: "../.." }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  assert.strictEqual(traversalRejected.status, 400, "empty sanitized storyId answers 400");

  // Invalid bodies answer 400
  const invalidJson = await fetch(base, { body: "{not json", method: "POST" });
  assert.strictEqual(invalidJson.status, 400, "invalid JSON answers 400");
  const missingRoot = await fetch(base, {
    body: JSON.stringify({ storyId: "no-root" }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  assert.strictEqual(missingRoot.status, 400, "payload without root answers 400");

  console.log("run-payload-store-test: all assertions passed");
} finally {
  server.close();
  rmSync(workDir, { force: true, recursive: true });
}
