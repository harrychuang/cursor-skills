// 流水線接棒：卡片進入完成欄時，依專案任務鏈自動建立後繼卡（origin = pipeline-chain）。
// 任務鏈是控制平面自己的設定（task_chain_entries），不寫入 .agent-automation/config.json。
import type { Prisma } from "@prisma/client";

export async function maybeCreateSuccessorCard(tx: Prisma.TransactionClient, cardId: string) {
  const card = await tx.card.findUniqueOrThrow({
    where: { id: cardId },
    include: { project: { include: { chain: { orderBy: { position: "asc" } } } } },
  });
  const entries = card.project.chain;
  const index = entries.findIndex((entry) => entry.taskId === card.taskId);
  if (index < 0 || index + 1 >= entries.length) return null;
  const next = entries[index + 1];

  // 同專案同任務已有未結案的卡就不重複建（重跑完成時的冪等保護）
  const existing = await tx.card.findFirst({
    where: { projectId: card.projectId, taskId: next.taskId, column: { not: "DONE" } },
  });
  if (existing) return null;

  const created = await tx.card.create({
    data: {
      projectId: card.projectId,
      taskId: next.taskId,
      column: "CLAIMABLE",
      origin: "PIPELINE_CHAIN",
      autoRun: true, // 信任來源：流水線接棒預設自動跑
      reviewGate: next.requiresReview,
    },
  });
  await tx.cardEvent.create({
    data: {
      cardId: created.id,
      event: "CARD_CREATED",
      fromColumn: "CLAIMABLE",
      toColumn: "CLAIMABLE",
      actorType: "system",
      note: `pipeline-chain：${card.taskId} 完成後自動建立`,
    },
  });
  return created;
}
