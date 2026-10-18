// Resilient reporting 測試：退避重試 + 結果快取恰送達一次
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { createApi } from "../lib/api.mjs";
import { flushPendingReports, savePendingReport } from "../lib/pending.mjs";

function startFlakyServer(failures) {
  let hits = 0;
  const server = createServer((req, res) => {
    hits += 1;
    if (hits <= failures) {
      res.writeHead(500).end();
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ status: "recorded" }));
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port, getHits: () => hits }));
  });
}

test("report 對 5xx 退避重試後送達", async () => {
  const { server, port, getHits } = await startFlakyServer(2);
  const api = createApi(
    { controlPlaneUrl: `http://127.0.0.1:${port}`, workerToken: "wtk_test" },
    { maxRetries: 4, baseDelayMs: 5 },
  );
  const res = await api.report({ leaseId: "l1", runId: "r1", phase: "completed" });
  assert.equal(res.status, 200);
  assert.equal(getHits(), 3, "失敗 2 次後第 3 次成功");
  server.close();
});

test("伺服器中斷期間結果快取，恢復後恰補送一次", async () => {
  const stateDir = await mkdtemp(path.join(os.tmpdir(), "worker-pending-"));
  const payload = { leaseId: "l1", runId: "run-cached-1", phase: "completed" };
  await savePendingReport(stateDir, payload);

  // 第一輪：仍不可達 → 檔案保留
  const unreachable = {
    report: async () => {
      throw new Error("ECONNREFUSED");
    },
  };
  assert.equal(await flushPendingReports(unreachable, stateDir), 0);
  assert.equal((await readdir(stateDir)).length, 1, "送不出去的結果保留");

  // 恢復：補送成功 → 刪檔；再 flush 不重送
  const delivered = [];
  const reachable = {
    report: async (body) => {
      delivered.push(body);
      return { status: 200, data: { status: "recorded" } };
    },
  };
  assert.equal(await flushPendingReports(reachable, stateDir), 1);
  assert.equal(await flushPendingReports(reachable, stateDir), 0);
  assert.equal(delivered.length, 1, "恰送達一次");
  assert.equal(delivered[0].runId, "run-cached-1");
});
