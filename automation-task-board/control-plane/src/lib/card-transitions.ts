import type { Prisma } from "@prisma/client";
import { attentionReasonFor, nextColumn, type CardColumn, type CardEventName } from "./card-state.ts";

export class IllegalTransitionError extends Error {
  readonly current: CardColumn;
  readonly event: CardEventName;
  constructor(current: CardColumn, event: CardEventName) {
    super(`illegal transition: ${event} from ${current}`);
    this.current = current;
    this.event = event;
  }
}

export type TransitionActor = { type: "system" | "member" | "worker" | "hub"; id?: string };

/** 重跑的復原寬限期：期限內 worker 不領卡、member 可復原；期限後相反。 */
export const UNDO_GRACE_MS = Number(process.env.UNDO_GRACE_SECONDS ?? 10) * 1000;

/**
 * 在交易內套用卡片事件：驗證封閉轉移表 → 更新欄位與 revision → 寫卡片歷史。
 * 非法轉移丟 IllegalTransitionError，卡片不動。
 */
export async function applyCardEvent(
  tx: Prisma.TransactionClient,
  cardId: string,
  event: CardEventName,
  actor: TransitionActor,
  options: { note?: string; resumePreviousRunId?: string; attentionReason?: string } = {},
) {
  const card = await tx.card.findUniqueOrThrow({ where: { id: cardId } });
  const current = card.column as CardColumn;
  const to = nextColumn(current, event);
  if (to === null) {
    throw new IllegalTransitionError(current, event);
  }

  const attentionReason = attentionReasonFor(event);
  // 原因的生命週期：進需要處理時寫入；重跑時保留（undo 可恢復、待領取欄可顯示重跑原因）；
  // 開始新執行或結案時清除
  // 呼叫端提供的原因優先（worker 說得比事件推導更精確，例如 hub-input-missing）
  const nextAttentionReason =
    to === "NEEDS_ATTENTION"
      ? (options.attentionReason ?? attentionReason)
      : event === "HUMAN_RERUN"
        ? card.attentionReason
        : null;
  const updated = await tx.card.update({
    where: { id: cardId },
    data: {
      column: to,
      revision: { increment: 1 },
      attentionReason: nextAttentionReason,
      // 人工拖回時掛上 resume 指令並開始復原倒數；其他事件清掉倒數
      ...(event === "HUMAN_RERUN"
        ? {
            resumeNote: options.note ?? null,
            resumePreviousRunId: options.resumePreviousRunId ?? null,
            undoUntil: new Date(Date.now() + UNDO_GRACE_MS),
          }
        : { undoUntil: null }),
    },
  });
  await tx.cardEvent.create({
    data: {
      cardId,
      event,
      fromColumn: current,
      toColumn: to,
      actorType: actor.type,
      actorId: actor.id,
      note: options.note,
    },
  });
  return updated;
}
