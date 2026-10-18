// 派工綁定解析測試：環境變數覆寫檔案、缺必要欄位＝未綁定、slug 推導與 worker 規則一致。
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  BINDING_ENV,
  BINDING_RELATIVE_PATH,
  DEFAULT_STALL_SECONDS,
  defaultProjectSlug,
  loadTaskBoardBinding,
} from "../template/scripts/design-automation-hub/task-board-binding.mjs";

function makeProject(bindingContent, { name = "app-alpha" } = {}) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "hub-binding-"));
  const root = path.join(base, name);
  fs.mkdirSync(path.join(root, ".design-automation"), { recursive: true });
  if (bindingContent !== undefined) {
    fs.writeFileSync(path.join(root, BINDING_RELATIVE_PATH), `${JSON.stringify(bindingContent, null, 2)}\n`, {
      mode: 0o600,
    });
  }
  return root;
}

test("沒有綁定檔也沒有環境變數：視為未綁定", () => {
  assert.equal(loadTaskBoardBinding(makeProject(undefined), {}), null);
});

test("綁定檔缺 token：視為未綁定（不丟例外）", () => {
  const root = makeProject({ schemaVersion: 1, controlPlaneUrl: "https://board.example.com" });
  assert.equal(loadTaskBoardBinding(root, {}), null);
});

test("綁定檔齊備：解析出 URL、token、slug 與停滯門檻", () => {
  const root = makeProject({
    schemaVersion: 1,
    controlPlaneUrl: "https://board.example.com/",
    token: "wtk_file",
    projectSlug: "explicit-slug",
  });
  const binding = loadTaskBoardBinding(root, {});
  assert.equal(binding.controlPlaneUrl, "https://board.example.com", "尾端斜線正規化");
  assert.equal(binding.token, "wtk_file");
  assert.equal(binding.projectSlug, "explicit-slug");
  assert.equal(binding.stallMs, DEFAULT_STALL_SECONDS * 1000);
});

test("環境變數逐欄覆寫綁定檔", () => {
  const root = makeProject({
    schemaVersion: 1,
    controlPlaneUrl: "https://file.example.com",
    token: "wtk_file",
    projectSlug: "file-slug",
  });
  const binding = loadTaskBoardBinding(root, {
    [BINDING_ENV.url]: "https://env.example.com",
    [BINDING_ENV.project]: "env-slug",
    [BINDING_ENV.stallSeconds]: "60",
  });
  assert.equal(binding.controlPlaneUrl, "https://env.example.com");
  assert.equal(binding.projectSlug, "env-slug");
  assert.equal(binding.token, "wtk_file", "環境變數沒給的欄位沿用檔案");
  assert.equal(binding.stallMs, 60_000);
});

test("只有環境變數也能綁定（完全不需要設定檔）", () => {
  const root = makeProject(undefined, { name: "Project Aurora" });
  const binding = loadTaskBoardBinding(root, {
    [BINDING_ENV.url]: "https://env.example.com",
    [BINDING_ENV.token]: "wtk_env",
  });
  assert.equal(binding.projectSlug, "project-aurora", "slug 由專案根目錄名推導");
});

test("slug 推導規則與 worker 的 slugForRoot 一致", () => {
  const cases = [
    ["/tmp/app-alpha", "app-alpha"],
    ["/tmp/Project Aurora", "project-aurora"],
    ["/tmp/my_app.v2", "my-app-v2"],
  ];
  for (const [root, expected] of cases) {
    assert.equal(defaultProjectSlug(root), expected, `${root} 應推導為 ${expected}`);
  }
});

test("綁定檔格式錯誤：穩定錯誤碼，訊息不含 URL 與 token", () => {
  const root = makeProject({ schemaVersion: 2, controlPlaneUrl: "https://board.example.com", token: "wtk_secret" });
  try {
    loadTaskBoardBinding(root, {});
    assert.fail("應該丟出錯誤");
  } catch (error) {
    assert.equal(error.code, "invalid-task-board-binding");
    assert.ok(!error.message.includes("wtk_secret"), "訊息不得含 token");
    assert.ok(!error.message.includes("board.example.com"), "訊息不得含控制平面 URL");
  }
});

test("非 http(s) 的控制平面 URL 被拒", () => {
  const root = makeProject({ schemaVersion: 1, controlPlaneUrl: "file:///etc/passwd", token: "wtk_x" });
  assert.throws(() => loadTaskBoardBinding(root, {}), (error) => error.code === "invalid-task-board-binding");
});

test("交叉檢查：Hub 與 worker 對同一個專案根推導出同一個 slug", async () => {
  // 這兩份實作分屬不同套件，但必須永遠一致——不一致會讓卡片落在沒人 advertise 的專案上
  const { slugForRoot } = await import("../../automation-task-board/worker/lib/projects.mjs");
  for (const root of ["/tmp/app-alpha", "/tmp/Project Aurora", "/tmp/my_app.v2", "/tmp/UPPER_case-99"]) {
    assert.equal(defaultProjectSlug(root), slugForRoot(root), `${root} 的 slug 推導不一致`);
  }
});
