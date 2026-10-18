// 看板讀取模型：五欄卡片 + 歸屬三元組 + 階段進度（任務鏈位置）。
import type { PrismaClient } from "@prisma/client";

export type BoardCard = {
  id: string;
  projectSlug: string;
  projectName: string;
  taskId: string;
  column: string;
  origin: string;
  autoRun: boolean;
  approved: boolean;
  reviewGate: boolean;
  undoable: boolean; // 待領取且帶 resume 指令且仍在寬限期內：可復原誤拖的重跑
  undoUntil: string | null; // 復原倒數截止（ISO）
  note: string | null;
  attentionReason: string | null;
  stage: { index: number; total: number } | null;
  attribution: { member: string; machine: string; runner: string | null } | null;
  latestRun: { runId: string; phase: string } | null;
  updatedAt: string;
};

export type BoardState = {
  generatedAt: string;
  cards: BoardCard[];
};

export async function getBoardState(db: PrismaClient): Promise<BoardState> {
  const cards = await db.card.findMany({
    include: {
      project: { include: { chain: { orderBy: { position: "asc" } } } },
      leases: {
        where: { active: true },
        include: { member: true, machine: true },
        take: 1,
      },
      runs: { orderBy: { startedAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "asc" },
  });
  return {
    generatedAt: new Date().toISOString(),
    cards: cards.map((card) => {
      const chainIndex = card.project.chain.findIndex((entry) => entry.taskId === card.taskId);
      const lease = card.leases[0];
      const run = card.runs[0];
      return {
        id: card.id,
        projectSlug: card.project.slug,
        projectName: card.project.displayName,
        taskId: card.taskId,
        column: card.column,
        origin: card.origin,
        autoRun: card.autoRun,
        approved: card.autoRun || card.approvedById !== null,
        reviewGate: card.reviewGate,
        undoable:
          card.column === "CLAIMABLE" &&
          (card.resumePreviousRunId !== null || card.resumeNote !== null) &&
          card.undoUntil !== null &&
          card.undoUntil.getTime() > Date.now(),
        undoUntil: card.undoUntil?.toISOString() ?? null,
        note: card.note,
        attentionReason: card.attentionReason,
        stage: chainIndex >= 0 ? { index: chainIndex + 1, total: card.project.chain.length } : null,
        attribution: lease
          ? { member: lease.member.name, machine: lease.machine.label ?? lease.machine.machineId, runner: lease.runnerId }
          : null,
        latestRun: run ? { runId: run.runId, phase: run.phase } : null,
        updatedAt: card.updatedAt.toISOString(),
      };
    }),
  };
}

/** 看板變更水位：卡片、歷史、log、快照、外部執行的最新時間戳，SSE 以此判斷是否推播 refresh。 */
export async function boardWatermark(db: PrismaClient): Promise<string> {
  const [card, event, chunk, snapshot, externalRun] = await Promise.all([
    db.card.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
    db.cardEvent.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    db.logChunk.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    db.projectSnapshot.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
    db.externalRun.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
  ]);
  return [
    card?.updatedAt.getTime() ?? 0,
    event?.createdAt.getTime() ?? 0,
    chunk?.createdAt.getTime() ?? 0,
    snapshot?.updatedAt.getTime() ?? 0,
    externalRun?.updatedAt.getTime() ?? 0,
  ].join("-");
}
