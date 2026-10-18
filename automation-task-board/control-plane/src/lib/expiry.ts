// lease 逾時掃描：心跳停止超過 TTL 的執行中卡片移入需要處理（possibly-stopped），
// 保留最後歸屬；未經人工指令不會再被領取（NEEDS_ATTENTION 不在 claim 查詢範圍）。
import type { PrismaClient } from "@prisma/client";
import { applyCardEvent, IllegalTransitionError } from "./card-transitions.ts";

export async function sweepExpiredLeases(db: PrismaClient, now: Date = new Date()): Promise<number> {
  const expired = await db.lease.findMany({
    where: { active: true, expiresAt: { lt: now } },
    include: { card: true },
  });
  let swept = 0;
  for (const lease of expired) {
    try {
      await db.$transaction(async (tx) => {
        const released = await tx.lease.updateMany({
          where: { id: lease.id, active: true },
          data: { active: false, releasedAt: now },
        });
        if (released.count === 0) return; // 另一個掃描或 report 先處理了
        await applyCardEvent(tx, lease.cardId, "LEASE_EXPIRED", { type: "system" });
      });
      swept += 1;
    } catch (error) {
      // 卡片已不在 RUNNING（report 與掃描競態）：lease 已釋放即可，不動卡片
      if (!(error instanceof IllegalTransitionError)) throw error;
    }
  }
  return swept;
}

const SWEEP_INTERVAL_MS = Number(process.env.LEASE_SWEEP_INTERVAL_SECONDS ?? 30) * 1000;
let sweeping = false;

/** 啟動週期掃描（instrumentation.ts 於伺服器啟動時呼叫）。 */
export function startExpirySweeper(db: PrismaClient) {
  const timer = setInterval(async () => {
    if (sweeping) return;
    sweeping = true;
    try {
      await sweepExpiredLeases(db);
    } catch {
      // 掃描失敗不影響服務；下一輪重試
    } finally {
      sweeping = false;
    }
  }, SWEEP_INTERVAL_MS);
  timer.unref();
  return timer;
}
