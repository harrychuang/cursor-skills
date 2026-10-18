// Plugin 派工文案測試：四種派工狀態各自說對話，未派工的任務畫面完全不變。
// ui.html 是瀏覽器端的單檔 Plugin，這裡把待測的兩個純函式抽出來直接執行。
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const uiPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "template",
  "figma",
  "design-automation-hub",
  "ui.html",
);
const ui = fs.readFileSync(uiPath, "utf8");

/** 從 ui.html 取出一個具名函式的完整原始碼（以大括號配對決定結尾）。 */
function extractFunction(name) {
  const start = ui.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `ui.html 找不到 ${name}`);
  let depth = 0;
  for (let index = ui.indexOf("{", start); index < ui.length; index += 1) {
    if (ui[index] === "{") depth += 1;
    else if (ui[index] === "}") {
      depth -= 1;
      if (depth === 0) return ui.slice(start, index + 1);
    }
  }
  throw new Error(`${name} 的大括號不成對`);
}

const COPY_KEYS = [
  "dispatchAwaitingApproval",
  "dispatchWaitingClaim",
  "dispatchRunning",
  "dispatchNeedsAttention",
  "dispatchClosed",
  "dispatchStalled",
  "dispatchCardRef",
];

const COPY = Object.fromEntries(COPY_KEYS.map((key) => [key, key]));
const sandbox = new Function(
  "COPY",
  "escapeHtml",
  "copy",
  `${extractFunction("dispatchMessage")}\n${extractFunction("renderDispatchStatus")}\nreturn { dispatchMessage, renderDispatchStatus };`,
)(COPY, (value) => String(value), (key, params) => `${key}:${params.cardId}`);

test("COPY 表含全部派工文案鍵，且都不是空字串", () => {
  for (const key of COPY_KEYS) {
    const match = new RegExp(`${key}:\\s*"([^"]+)"`).exec(ui);
    assert.ok(match, `COPY 表缺少 ${key}`);
    assert.ok(match[1].trim().length > 0, `${key} 不得為空字串`);
  }
});

test("四種派工狀態各自對應到正確的文案", () => {
  const cases = [
    [{ approved: false, boardColumn: "CLAIMABLE", stalled: false }, "dispatchAwaitingApproval"],
    [{ approved: true, boardColumn: "CLAIMABLE", stalled: false }, "dispatchWaitingClaim"],
    [{ approved: true, boardColumn: "RUNNING", stalled: false }, "dispatchRunning"],
    [{ approved: true, boardColumn: "NEEDS_ATTENTION", stalled: false }, "dispatchNeedsAttention"],
  ];
  for (const [dispatch, expected] of cases) {
    assert.equal(sandbox.dispatchMessage(dispatch), expected, JSON.stringify(dispatch));
  }
});

test("已放行但長時間無人領取：改說「尚無機器領取」", () => {
  assert.equal(
    sandbox.dispatchMessage({ approved: true, boardColumn: "CLAIMABLE", stalled: true }),
    "dispatchStalled",
  );
});

test("停滯文案說明領卡資格：只有讀得到本專案 runtime 目錄的機器可領", () => {
  const stalled = /dispatchStalled:\s*"([^"]+)"/.exec(ui)[1];
  assert.ok(stalled.includes("尚無機器領取"));
  assert.ok(stalled.includes("runtime"), "必須說明只有讀得到 runtime 目錄的機器可領");
});

test("未派工的任務不輸出任何派工資訊（standalone 畫面不變）", () => {
  assert.equal(sandbox.renderDispatchStatus({ status: "queued" }), "");
  assert.equal(sandbox.renderDispatchStatus({ status: "queued", dispatch: null }), "");
  assert.equal(sandbox.renderDispatchStatus(null), "");
});

test("派工任務輸出狀態行與卡片對照碼", () => {
  const html = sandbox.renderDispatchStatus({
    status: "queued",
    dispatch: { cardId: "card-1", approved: true, boardColumn: "RUNNING", stalled: false },
  });
  assert.ok(html.includes("dispatchRunning"));
  assert.ok(html.includes("dispatchCardRef:card-1"));
});

test("派工文案不得宣稱任務已完成", () => {
  for (const key of COPY_KEYS) {
    const value = new RegExp(`${key}:\\s*"([^"]+)"`).exec(ui)[1];
    if (key === "dispatchClosed") continue; // 只有看板結案才會出現，且說的是卡片不是 Figma
    assert.ok(!value.includes("已完成"), `${key} 不得在任務完成前宣稱已完成`);
  }
});
