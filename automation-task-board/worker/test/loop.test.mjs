// 單機單任務測試：執行中不再 claim（Poll and claim within capacity）
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { createWorkerLoop } from "../lib/loop.mjs";

test("busy 時 tick 不發出 claim", async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "worker-loop-"));
  let claimCalls = 0;
  let releaseExecution;
  const executionGate = new Promise((resolve) => {
    releaseExecution = resolve;
  });

  const api = {
    claim: async () => {
      claimCalls += 1;
      return claimCalls === 1
        ? { status: 200, data: { cardId: "card-1", projectSlug: "proj", taskId: "extract", leaseId: "lease-1" } }
        : { status: 204, data: null };
    },
    report: async () => ({ status: 200, data: {} }),
  };
  const loop = createWorkerLoop({
    config: { machineId: "m1", runners: ["claude"], workerStateDir: tmp },
    api,
    projects: [{ slug: "proj", root: "/tmp/proj" }],
    execute: () => executionGate, // 執行卡住直到測試放行
  });

  assert.equal(await loop.tick(), "claimed");
  assert.equal(loop.isBusy(), true);
  assert.equal(await loop.tick(), "busy");
  assert.equal(await loop.tick(), "busy");
  assert.equal(claimCalls, 1, "執行中不再 claim");

  releaseExecution();
  await executionGate;
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(loop.isBusy(), false);
  assert.equal(await loop.tick(), "idle");
  assert.equal(claimCalls, 2, "空檔恢復輪詢");
});
