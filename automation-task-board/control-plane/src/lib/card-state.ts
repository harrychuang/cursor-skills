// 卡片狀態機：封閉事件集合，未列事件不得移動卡片（design Implementation Contract）。
// 純函式模組——決策邏輯可被 node --test 直接載入，資料庫寫入在 card-transitions.ts。

export type CardColumn = "CLAIMABLE" | "RUNNING" | "NEEDS_ATTENTION" | "AWAITING_REVIEW" | "DONE";

export type CardEventName =
  | "LEASE_GRANTED" // worker 領走
  | "RUN_COMPLETED" // 完成且無 review gate
  | "RUN_COMPLETED_GATED" // 完成且有 review gate
  | "RUN_VERIFICATION_FAILED" // 驗證沒過
  | "RUN_EXHAUSTED" // 所有 runner 都失敗
  | "LEASE_EXPIRED" // 心跳逾時（possibly-stopped）
  | "HUMAN_RERUN" // 人工拖出收件匣：附說明重跑
  | "HUMAN_APPROVE" // 人工批准待確認的卡：結案
  | "HUMAN_UNDO_TO_ATTENTION" // 復原誤拖的重跑：回需要處理（僅限卡仍待領取且未被領走）
  | "HUMAN_UNDO_TO_REVIEW" // 復原誤拖的重跑：回待確認（同上）
  | "HUB_APPLY_COMPLETED" // Design Automation Hub 回報：設計師已在 Figma Plugin 套用計畫
  | "HUB_APPLY_FAILED"; // Design Automation Hub 回報：Plugin 套用失敗，交還人的收件匣

/** 封閉轉移表：事件 → { 合法起點欄位, 目的欄位 } */
export const TRANSITIONS: Record<CardEventName, { from: readonly CardColumn[]; to: CardColumn }> = {
  LEASE_GRANTED: { from: ["CLAIMABLE"], to: "RUNNING" },
  RUN_COMPLETED: { from: ["RUNNING"], to: "DONE" },
  RUN_COMPLETED_GATED: { from: ["RUNNING"], to: "AWAITING_REVIEW" },
  RUN_VERIFICATION_FAILED: { from: ["RUNNING"], to: "NEEDS_ATTENTION" },
  RUN_EXHAUSTED: { from: ["RUNNING"], to: "NEEDS_ATTENTION" },
  LEASE_EXPIRED: { from: ["RUNNING"], to: "NEEDS_ATTENTION" },
  HUMAN_RERUN: { from: ["NEEDS_ATTENTION", "AWAITING_REVIEW"], to: "CLAIMABLE" },
  HUMAN_APPROVE: { from: ["AWAITING_REVIEW"], to: "DONE" },
  HUMAN_UNDO_TO_ATTENTION: { from: ["CLAIMABLE"], to: "NEEDS_ATTENTION" },
  HUMAN_UNDO_TO_REVIEW: { from: ["CLAIMABLE"], to: "AWAITING_REVIEW" },
  // Hub 回寫只在卡片正好待確認時移動卡片；其他欄位由呼叫端只記歷史，不進這張表
  HUB_APPLY_COMPLETED: { from: ["AWAITING_REVIEW"], to: "DONE" },
  HUB_APPLY_FAILED: { from: ["AWAITING_REVIEW"], to: "NEEDS_ATTENTION" },
};

/** 事件套用到目前欄位；非法轉移回 null（呼叫端必須拒絕，不得移動卡片）。 */
export function nextColumn(current: CardColumn, event: CardEventName): CardColumn | null {
  const rule = TRANSITIONS[event];
  if (!rule) return null;
  return rule.from.includes(current) ? rule.to : null;
}

/** run summary 的 phase 詞彙（orchestrate 所有）→ 卡片事件。未知 phase 回 null。 */
export function phaseToEvent(phase: string, reviewGate: boolean): CardEventName | null {
  switch (phase) {
    case "completed":
      return reviewGate ? "RUN_COMPLETED_GATED" : "RUN_COMPLETED";
    case "verification-failed":
      return "RUN_VERIFICATION_FAILED";
    case "exhausted":
      return "RUN_EXHAUSTED";
    default:
      return null; // running 等中間態不移動卡片
  }
}

/**
 * 需要處理欄的原因詞彙封閉集合：系統推導的三個 + worker／Hub 明確回報的兩個。
 * 越界值一律拒絕，避免收件匣出現無人看得懂的原因字串。
 */
export const ATTENTION_REASONS = [
  "possibly-stopped",
  "verification-failed",
  "exhausted",
  "hub-input-missing",
  "hub-apply-failed",
] as const;

export type AttentionReason = (typeof ATTENTION_REASONS)[number];

export function isAttentionReason(value: string): value is AttentionReason {
  return (ATTENTION_REASONS as readonly string[]).includes(value);
}

/** 進入需要處理欄時的原因詞彙（與 automation-pipeline-board 一致） */
export function attentionReasonFor(event: CardEventName): string | null {
  switch (event) {
    case "LEASE_EXPIRED":
      return "possibly-stopped";
    case "RUN_VERIFICATION_FAILED":
      return "verification-failed";
    case "RUN_EXHAUSTED":
      return "exhausted";
    case "HUB_APPLY_FAILED":
      return "hub-apply-failed";
    default:
      return null;
  }
}
