// Hub 派工資格申報測試：只申報本機讀得到 input.json 的 automation task id
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, utimes } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { collectLocalHubInputs, hubInputPath, RUNTIME_DIR } from "../lib/hub-inputs.mjs";

async function makeProject(taskIds, { withInput = true } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "hub-inputs-"));
  for (const taskId of taskIds) {
    const dir = path.join(root, RUNTIME_DIR, taskId);
    await mkdir(dir, { recursive: true });
    if (withInput) await writeFile(path.join(dir, "input.json"), "{}\n");
  }
  return { root, slug: path.basename(root) };
}

test("兩個含 input.json 的 runtime 目錄都被申報", async () => {
  const project = await makeProject(["task-a", "task-b"]);
  const ids = await collectLocalHubInputs([project]);
  assert.deepEqual([...ids].sort(), ["task-a", "task-b"]);
});

test("沒有 input.json 的目錄不申報", async () => {
  const project = await makeProject(["task-empty"], { withInput: false });
  assert.deepEqual(await collectLocalHubInputs([project]), []);
});

test("缺 runtime 目錄不失敗，回空清單", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hub-inputs-bare-"));
  assert.deepEqual(await collectLocalHubInputs([{ root, slug: "bare" }]), []);
});

test("超過上限時只取最近修改的前 N 筆", async () => {
  const project = await makeProject(["old-1", "old-2", "fresh"]);
  // 把兩個舊的往前推，fresh 維持現在時間
  const past = new Date(Date.now() - 60_000);
  for (const id of ["old-1", "old-2"]) {
    await utimes(hubInputPath(project.root, id), past, past);
  }
  const ids = await collectLocalHubInputs([project], { limit: 1 });
  assert.deepEqual(ids, ["fresh"]);
});

test("多個專案根合併申報", async () => {
  const first = await makeProject(["task-x"]);
  const second = await makeProject(["task-y"]);
  const ids = await collectLocalHubInputs([first, second]);
  assert.deepEqual([...ids].sort(), ["task-x", "task-y"]);
});

test("claim 每輪帶上本機資格清單", async () => {
  const { createWorkerLoop } = await import("../lib/loop.mjs");
  const project = await makeProject(["task-claimable"]);
  const tmp = await mkdtemp(path.join(os.tmpdir(), "hub-loop-"));
  let seen = null;
  const api = {
    claim: async (payload) => {
      seen = payload;
      return { status: 204, data: null };
    },
  };
  const loop = createWorkerLoop({
    config: { machineId: "m1", runners: ["claude"], workerStateDir: tmp },
    api,
    projects: [project],
    execute: async () => {},
  });
  assert.equal(await loop.tick(), "idle");
  assert.deepEqual(seen.localInputs, ["task-claimable"]);
});
