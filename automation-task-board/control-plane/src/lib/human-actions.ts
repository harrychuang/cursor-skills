// 人工介入指令：拖曳（或按鈕）不是改狀態，而是下指令——
// rerun：附調整說明重跑（帶前次 runId 作 resume 指令）；approve：批准待確認的卡結案。
import type { PrismaClient } from "@prisma/client";
import { applyCardEvent } from "./card-transitions.ts";
import { maybeCreateSuccessorCard } from "./chain.ts";

/** 重跑：卡回到待領取，掛上 resume 指令（前次 runId + 調整說明）。 */
export async function rerunCard(db: PrismaClient, memberId: string, cardId: string, note?: string) {
  return db.$transaction(async (tx) => {
    const latestRun = await tx.run.findFirst({ where: { cardId }, orderBy: { startedAt: "desc" } });
    // 收件匣的卡不應還有 active lease（終態或逾時都已釋放），防禦性再釋放一次
    await tx.lease.updateMany({ where: { cardId, active: true }, data: { active: false, releasedAt: new Date() } });
    return applyCardEvent(
      tx,
      cardId,
      "HUMAN_RERUN",
      { type: "member", id: memberId },
      { note, resumePreviousRunId: latestRun?.runId },
    );
  });
}

export class UndoError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * 復原誤拖的重跑：卡仍在待領取且未被領走時，滑回重跑前的欄位並清掉 resume 指令。
 * 與 worker claim 走同一套 revision CAS——被領走的瞬間之後一律拒絕（already-claimed）。
 */
export async function undoRerun(db: PrismaClient, memberId: string, cardId: string) {
  return db.$transaction(async (tx) => {
    const card = await tx.card.findUnique({ where: { id: cardId } });
    if (!card) throw new UndoError("not-found", "卡片不存在");
    if (card.column !== "CLAIMABLE") throw new UndoError("not-undoable", "卡片已不在待領取，無法復原");
    const lastRerun = await tx.cardEvent.findFirst({
      where: { cardId, event: "HUMAN_RERUN" },
      orderBy: { createdAt: "desc" },
    });
    if (!lastRerun) throw new UndoError("not-undoable", "這張卡不是由重跑指令送進待領取的");
    if (!card.undoUntil || card.undoUntil.getTime() < Date.now()) {
      throw new UndoError("undo-expired", "復原倒數已結束，卡片即將（或已經）開放領取");
    }
    const backTo = lastRerun.fromColumn; // NEEDS_ATTENTION 或 AWAITING_REVIEW
    const event = backTo === "AWAITING_REVIEW" ? "HUMAN_UNDO_TO_REVIEW" : "HUMAN_UNDO_TO_ATTENTION";

    // CAS：revision 沒動（沒被 claim）才復原
    const won = await tx.card.updateMany({
      where: { id: cardId, column: "CLAIMABLE", revision: card.revision },
      data: {
        column: backTo,
        revision: { increment: 1 },
        resumeNote: null,
        resumePreviousRunId: null,
        undoUntil: null,
        attentionReason: backTo === "NEEDS_ATTENTION" ? card.attentionReason : null,
      },
    });
    if (won.count === 0) throw new UndoError("already-claimed", "卡片已被 worker 領走，無法復原");
    await tx.cardEvent.create({
      data: {
        cardId,
        event,
        fromColumn: "CLAIMABLE",
        toColumn: backTo,
        actorType: "member",
        actorId: memberId,
        note: "復原重跑",
      },
    });
    return tx.card.findUniqueOrThrow({ where: { id: cardId } });
  });
}

/** 批准：待確認 → 完成；進入完成欄同樣觸發流水線接棒。 */
export async function approveReview(db: PrismaClient, memberId: string, cardId: string, note?: string) {
  return db.$transaction(async (tx) => {
    const updated = await applyCardEvent(tx, cardId, "HUMAN_APPROVE", { type: "member", id: memberId }, { note });
    await maybeCreateSuccessorCard(tx, cardId);
    return updated;
  });
}
