// 卡片狀態機轉移表測試：全部合法轉移 + 非法轉移（含自動欄之間拖曳）被拒
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  TRANSITIONS,
  attentionReasonFor,
  nextColumn,
  phaseToEvent,
  type CardColumn,
  type CardEventName,
} from "../src/lib/card-state.ts";

const ALL_COLUMNS: CardColumn[] = ["CLAIMABLE", "RUNNING", "NEEDS_ATTENTION", "AWAITING_REVIEW", "DONE"];

test("轉移表全部合法轉移", () => {
  const cases: Array<[CardColumn, CardEventName, CardColumn]> = [
    ["CLAIMABLE", "LEASE_GRANTED", "RUNNING"],
    ["RUNNING", "RUN_COMPLETED", "DONE"],
    ["RUNNING", "RUN_COMPLETED_GATED", "AWAITING_REVIEW"],
    ["RUNNING", "RUN_VERIFICATION_FAILED", "NEEDS_ATTENTION"],
    ["RUNNING", "RUN_EXHAUSTED", "NEEDS_ATTENTION"],
    ["RUNNING", "LEASE_EXPIRED", "NEEDS_ATTENTION"],
    ["NEEDS_ATTENTION", "HUMAN_RERUN", "CLAIMABLE"],
    ["AWAITING_REVIEW", "HUMAN_RERUN", "CLAIMABLE"],
    ["AWAITING_REVIEW", "HUMAN_APPROVE", "DONE"],
    ["CLAIMABLE", "HUMAN_UNDO_TO_ATTENTION", "NEEDS_ATTENTION"],
    ["CLAIMABLE", "HUMAN_UNDO_TO_REVIEW", "AWAITING_REVIEW"],
    ["AWAITING_REVIEW", "HUB_APPLY_COMPLETED", "DONE"],
    ["AWAITING_REVIEW", "HUB_APPLY_FAILED", "NEEDS_ATTENTION"],
  ];
  // 轉移表是封閉集合：上面列的 case 必須恰好覆蓋整張表
  const tableSize = Object.values(TRANSITIONS).reduce((n, rule) => n + rule.from.length, 0);
  assert.equal(cases.length, tableSize, "測試 case 未覆蓋整張轉移表");
  for (const [from, event, to] of cases) {
    assert.equal(nextColumn(from, event), to, `${from} --${event}--> 應為 ${to}`);
  }
});

test("非法轉移被拒：自動欄之間的拖曳", () => {
  // 待領取／執行中／完成 之間沒有任何人工事件——HUMAN_RERUN 在這些欄一律非法
  assert.equal(nextColumn("CLAIMABLE", "HUMAN_RERUN"), null);
  assert.equal(nextColumn("RUNNING", "HUMAN_RERUN"), null);
  assert.equal(nextColumn("DONE", "HUMAN_RERUN"), null);
});

test("非法轉移被拒：事件在錯誤起點", () => {
  assert.equal(nextColumn("RUNNING", "LEASE_GRANTED"), null, "執行中不能再被領走");
  assert.equal(nextColumn("CLAIMABLE", "RUN_COMPLETED"), null, "未執行不能完成");
  assert.equal(nextColumn("DONE", "RUN_VERIFICATION_FAILED"), null, "已完成不能失敗");
  assert.equal(nextColumn("AWAITING_REVIEW", "LEASE_EXPIRED"), null, "待確認沒有 lease");
  assert.equal(nextColumn("NEEDS_ATTENTION", "HUMAN_APPROVE"), null, "需要處理只能重跑，不能直接批准結案");
  assert.equal(nextColumn("RUNNING", "HUB_APPLY_COMPLETED"), null, "Hub 回寫只在待確認時移動卡片");
  assert.equal(nextColumn("CLAIMABLE", "HUB_APPLY_FAILED"), null, "Hub 回寫只在待確認時移動卡片");
  assert.equal(nextColumn("NEEDS_ATTENTION", "HUB_APPLY_COMPLETED"), null, "已在收件匣的卡不因 Hub 回寫結案");
});

test("封閉集合：DONE 是終態、CLAIMABLE 只出不進（除 HUMAN_RERUN 迴路）", () => {
  for (const event of Object.keys(TRANSITIONS) as CardEventName[]) {
    assert.equal(nextColumn("DONE", event), null, `DONE 不得因 ${event} 移動`);
  }
  for (const from of ALL_COLUMNS) {
    for (const event of Object.keys(TRANSITIONS) as CardEventName[]) {
      const to = nextColumn(from, event);
      if (to === "CLAIMABLE") assert.equal(event, "HUMAN_RERUN", "只有人工指令能把卡送回待領取");
    }
  }
});

test("phase 詞彙對應（orchestrate 所有）", () => {
  assert.equal(phaseToEvent("completed", true), "RUN_COMPLETED_GATED");
  assert.equal(phaseToEvent("completed", false), "RUN_COMPLETED");
  assert.equal(phaseToEvent("verification-failed", false), "RUN_VERIFICATION_FAILED");
  assert.equal(phaseToEvent("exhausted", false), "RUN_EXHAUSTED");
  assert.equal(phaseToEvent("running", false), null, "中間態不移動卡片");
  assert.equal(phaseToEvent("unknown-phase", false), null);
});

test("需要處理欄的原因詞彙", () => {
  assert.equal(attentionReasonFor("LEASE_EXPIRED"), "possibly-stopped");
  assert.equal(attentionReasonFor("RUN_VERIFICATION_FAILED"), "verification-failed");
  assert.equal(attentionReasonFor("RUN_EXHAUSTED"), "exhausted");
  assert.equal(attentionReasonFor("HUB_APPLY_FAILED"), "hub-apply-failed");
  assert.equal(attentionReasonFor("RUN_COMPLETED"), null);
  assert.equal(attentionReasonFor("HUB_APPLY_COMPLETED"), null);
});
