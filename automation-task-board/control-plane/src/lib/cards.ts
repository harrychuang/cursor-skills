// 卡片建立與放行：member 手動建卡（origin=MEMBER）、放行未 auto-run 的卡、設定專案任務鏈。
import type { PrismaClient } from "@prisma/client";

export async function createCard(
  db: PrismaClient,
  memberId: string,
  input: { projectSlug: string; taskId: string; note?: string; autoRun?: boolean; reviewGate?: boolean },
) {
  const project = await db.project.upsert({
    where: { slug: input.projectSlug },
    update: {},
    create: { slug: input.projectSlug, displayName: input.projectSlug },
  });
  // 任務鏈上有設定 requiresReview 就沿用，否則採輸入值（預設 true）
  const chainEntry = await db.taskChainEntry.findUnique({
    where: { projectId_taskId: { projectId: project.id, taskId: input.taskId } },
  });
  return db.$transaction(async (tx) => {
    const card = await tx.card.create({
      data: {
        projectId: project.id,
        taskId: input.taskId,
        column: "CLAIMABLE",
        origin: "MEMBER",
        autoRun: input.autoRun ?? true, // member 手動建的卡是信任來源：預設自動跑
        reviewGate: chainEntry?.requiresReview ?? input.reviewGate ?? true,
        note: input.note,
        createdById: memberId,
      },
    });
    await tx.cardEvent.create({
      data: {
        cardId: card.id,
        event: "CARD_CREATED",
        fromColumn: "CLAIMABLE",
        toColumn: "CLAIMABLE",
        actorType: "member",
        actorId: memberId,
        note: input.note,
      },
    });
    return card;
  });
}

export class CardActionError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/** 放行未 auto-run 的卡：記錄放行者後，卡才會出現在 claim 回應。 */
export async function approveCardForRun(db: PrismaClient, memberId: string, cardId: string) {
  const card = await db.card.findUnique({ where: { id: cardId } });
  if (!card) throw new CardActionError("not-found", "卡片不存在");
  if (card.column !== "CLAIMABLE") throw new CardActionError("not-claimable", "只有待領取的卡需要放行");
  if (card.autoRun || card.approvedById) return card; // 已可執行：冪等
  return db.$transaction(async (tx) => {
    const updated = await tx.card.update({ where: { id: cardId }, data: { approvedById: memberId } });
    await tx.cardEvent.create({
      data: {
        cardId,
        event: "CARD_APPROVED_FOR_RUN",
        fromColumn: "CLAIMABLE",
        toColumn: "CLAIMABLE",
        actorType: "member",
        actorId: memberId,
      },
    });
    return updated;
  });
}

/** 設定專案任務鏈（整組取代），position 依陣列順序。 */
export async function setProjectChain(
  db: PrismaClient,
  input: { projectSlug: string; entries: Array<{ taskId: string; requiresReview?: boolean }> },
) {
  const project = await db.project.upsert({
    where: { slug: input.projectSlug },
    update: {},
    create: { slug: input.projectSlug, displayName: input.projectSlug },
  });
  return db.$transaction(async (tx) => {
    await tx.taskChainEntry.deleteMany({ where: { projectId: project.id } });
    for (let i = 0; i < input.entries.length; i += 1) {
      await tx.taskChainEntry.create({
        data: {
          projectId: project.id,
          position: i,
          taskId: input.entries[i].taskId,
          requiresReview: input.entries[i].requiresReview ?? true,
        },
      });
    }
    return tx.taskChainEntry.findMany({ where: { projectId: project.id }, orderBy: { position: "asc" } });
  });
}
