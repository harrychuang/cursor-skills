// Worker registration 的專案驗證測試
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { slugForRoot, validateProjects } from "../lib/projects.mjs";

async function makeProject(base, name, config) {
  const root = path.join(base, name);
  await mkdir(path.join(root, ".agent-automation"), { recursive: true });
  if (config !== undefined) {
    await writeFile(path.join(root, ".agent-automation", "config.json"), config);
  }
  return root;
}

test("一合法一無效：只 advertise 合法根，無效根回報排除原因", async () => {
  const base = await mkdtemp(path.join(os.tmpdir(), "worker-projects-"));
  const good = await makeProject(
    base,
    "App-Alpha",
    JSON.stringify({ schemaVersion: 1, stateDir: ".agent-automation/runs", runners: [], tasks: { extract: {} } }),
  );
  const bad = path.join(base, "no-config");
  await mkdir(bad, { recursive: true });

  const result = await validateProjects([good, bad]);
  assert.equal(result.valid.length, 1);
  assert.equal(result.valid[0].root, good);
  assert.equal(result.valid[0].slug, "app-alpha");
  assert.deepEqual(result.valid[0].taskIds, ["extract"]);
  assert.equal(result.excluded.length, 1);
  assert.equal(result.excluded[0].root, bad);
  assert.match(result.excluded[0].reason, /config\.json/);
});

test("config 不是合法 JSON 或沒有 task 都排除", async () => {
  const base = await mkdtemp(path.join(os.tmpdir(), "worker-projects-"));
  const broken = await makeProject(base, "broken", "not-json{");
  const empty = await makeProject(base, "empty", JSON.stringify({ schemaVersion: 1, tasks: {} }));
  const result = await validateProjects([broken, empty]);
  assert.equal(result.valid.length, 0);
  assert.equal(result.excluded.length, 2);
});

test("slug 轉換", () => {
  assert.equal(slugForRoot("/Users/x/works/My Project_2"), "my-project-2");
});
