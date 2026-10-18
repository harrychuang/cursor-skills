// 卡片詳情讀取模型：run 歷史（runId、phase、驗證計數、歸屬）與 log chunk 增量讀取。
import type { PrismaClient } from "@prisma/client";

export async function getCardDetail(db: PrismaClient, cardId: string) {
  const card = await db.card.findUnique({
    where: { id: cardId },
    include: {
      project: true,
      runs: {
        orderBy: { startedAt: "desc" },
        include: { member: true, machine: true, _count: { select: { logChunks: true } } },
      },
      events: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
  if (!card) return null;
  return {
    id: card.id,
    projectSlug: card.project.slug,
    projectName: card.project.displayName,
    taskId: card.taskId,
    column: card.column,
    origin: card.origin,
    note: card.note,
    attentionReason: card.attentionReason,
    resumeNote: card.resumeNote,
    runs: card.runs.map((run) => ({
      runId: run.runId,
      phase: run.phase,
      verification: (typeof run.verification === "object" ? run.verification : null) as {
        configured?: number;
        passed?: number;
        failed?: number;
        notRun?: number;
      } | null,
      resumedFrom: run.resumedFrom,
      attribution: {
        member: run.member.name,
        machine: run.machine.label ?? run.machine.machineId,
        runner: run.runnerId,
      },
      startedAt: run.startedAt.toISOString(),
      finishedAt: run.finishedAt?.toISOString() ?? null,
      logChunkCount: run._count.logChunks,
    })),
    history: card.events.map((event) => ({
      event: event.event,
      fromColumn: event.fromColumn,
      toColumn: event.toColumn,
      actorType: event.actorType,
      actorId: event.actorId,
      note: event.note,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}

/** 增量讀取某 run 的 log：seq > after，依 seq 排序。 */
export async function getLogChunks(db: PrismaClient, cardId: string, runId: string, afterSeq: number) {
  const chunks = await db.logChunk.findMany({
    where: { cardId, runId, seq: { gt: afterSeq } },
    orderBy: { seq: "asc" },
    take: 500,
  });
  return chunks.map((chunk) => ({ seq: chunk.seq, content: chunk.content }));
}

/** log 保留期限清理：刪除超過 retentionDays 的 chunk。 */
export async function cleanupExpiredLogChunks(
  db: PrismaClient,
  retentionDays: number = Number(process.env.LOG_RETENTION_DAYS ?? 30),
  now: Date = new Date(),
): Promise<number> {
  const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
  const result = await db.logChunk.deleteMany({ where: { createdAt: { lt: cutoff } } });
  return result.count;
}
