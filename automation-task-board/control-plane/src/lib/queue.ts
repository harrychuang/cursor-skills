// 任務佇列核心：claim（CAS lease）、heartbeat、report（runId 冪等）、log 上傳。
// 函式接收 PrismaClient 參數（依賴注入），route 是薄包裝，node --test 可直接對 dev DB 測。
import type { PrismaClient } from "@prisma/client";
import { applyCardEvent } from "./card-transitions.ts";
import { isAttentionReason, phaseToEvent } from "./card-state.ts";

export const LEASE_TTL_MS = Number(process.env.LEASE_TTL_SECONDS ?? 90) * 1000;

export type WorkerIdentity = { memberId: string; tokenId: string };

export type ClaimResult =
  | { status: "claimed"; card: ClaimedCard }
  | { status: "conflict" } // 有候選卡但全被別人搶走
  | { status: "empty" }; // 沒有可領的卡

export type ClaimedCard = {
  cardId: string;
  leaseId: string;
  projectSlug: string;
  taskId: string;
  note: string | null;
  hubAutomationTaskId: string | null; // Hub 派工卡：worker 執行前要驗證這個 runtime input 存在
  resume: { previousRunId: string | null; note: string | null } | null;
  leaseTtlSeconds: number;
};

/** 註冊／更新機器與其 advertise 的專案（專案以 slug 自動建立）。 */
export async function registerMachine(
  db: PrismaClient,
  identity: WorkerIdentity,
  input: { machineId: string; label?: string; runners: string[]; projects: Array<{ slug: string }> },
) {
  const machine = await db.machine.upsert({
    where: { machineId: input.machineId },
    update: { memberId: identity.memberId, label: input.label, runners: input.runners, lastSeenAt: new Date() },
    create: { machineId: input.machineId, memberId: identity.memberId, label: input.label, runners: input.runners },
  });
  const accepted: string[] = [];
  for (const project of input.projects) {
    await db.project.upsert({
      where: { slug: project.slug },
      update: {},
      create: { slug: project.slug, displayName: project.slug },
    });
    accepted.push(project.slug);
  }
  return { machine, accepted };
}

/**
 * 領卡：在 advertise 的專案中找最早的可領卡（auto-run 或已放行），
 * 以 revision CAS 搶佔——同卡併發恰一成功。
 *
 * localInputs 是這台機器讀得到的 Hub automation task id 清單。Hub 派工卡的 snapshot
 * 只存在產生它的機器上（gitignored runtime 目錄），所以讀不到的機器連候選都不該拿到——
 * 卡片因此停在待領取，而不是被錯的機器領走再假裝派工。缺席或空清單＝排除所有 Hub 卡。
 */
export async function claimCard(
  db: PrismaClient,
  identity: WorkerIdentity,
  input: { machineId: string; projects: string[]; runnerId?: string; localInputs?: string[] },
): Promise<ClaimResult> {
  const machine = await db.machine.findUnique({ where: { machineId: input.machineId } });
  if (!machine || machine.memberId !== identity.memberId) {
    throw new QueueError("unknown-machine", "machineId 未註冊或不屬於此 token 的成員");
  }
  const candidates = await db.card.findMany({
    where: {
      column: "CLAIMABLE",
      project: { slug: { in: input.projects } },
      OR: [{ autoRun: true }, { approvedById: { not: null } }],
      AND: [
        // 復原寬限期內的卡不發放：倒數期間 member 的復原保證成功
        { OR: [{ undoUntil: null }, { undoUntil: { lte: new Date() } }] },
        // 非 Hub 卡（null）照舊；Hub 卡只發給申報得出該 input 的機器
        { OR: [{ hubAutomationTaskId: null }, { hubAutomationTaskId: { in: input.localInputs ?? [] } }] },
      ],
    },
    include: { project: true },
    orderBy: { createdAt: "asc" },
    take: 5,
  });
  if (candidates.length === 0) return { status: "empty" };

  for (const card of candidates) {
    const claimed = await tryClaimCandidate(db, identity, machine, card, input.runnerId);
    if (claimed) {
      return {
        status: "claimed",
        card: {
          cardId: card.id,
          leaseId: claimed.id,
          projectSlug: card.project.slug,
          taskId: card.taskId,
          note: card.note,
          hubAutomationTaskId: card.hubAutomationTaskId,
          resume: card.resumePreviousRunId || card.resumeNote
            ? { previousRunId: card.resumePreviousRunId, note: card.resumeNote }
            : null,
          leaseTtlSeconds: LEASE_TTL_MS / 1000,
        },
      };
    }
  }
  return { status: "conflict" };
}

/**
 * 對單一候選卡執行 CAS 搶佔：revision 與欄位同時吻合才成立。
 * 同一張卡快照不論多少呼叫方併發搶佔，恰一成功（其餘回 null）。
 */
export async function tryClaimCandidate(
  db: PrismaClient,
  identity: WorkerIdentity,
  machine: { id: string; machineId: string },
  card: { id: string; revision: number },
  runnerId?: string,
) {
  return db.$transaction(async (tx) => {
    const won = await tx.card.updateMany({
      where: { id: card.id, column: "CLAIMABLE", revision: card.revision },
      data: { column: "RUNNING", revision: { increment: 1 } },
    });
    if (won.count === 0) return null;
    const lease = await tx.lease.create({
      data: {
        cardId: card.id,
        machineId: machine.id,
        memberId: identity.memberId,
        runnerId,
        expiresAt: new Date(Date.now() + LEASE_TTL_MS),
      },
    });
    await tx.cardEvent.create({
      data: {
        cardId: card.id,
        event: "LEASE_GRANTED",
        fromColumn: "CLAIMABLE",
        toColumn: "RUNNING",
        actorType: "worker",
        actorId: machine.machineId,
      },
    });
    return lease;
  });
}

/** 心跳：延展 lease；lease 已失效回 stale。 */
export async function heartbeatLease(
  db: PrismaClient,
  identity: WorkerIdentity,
  input: { leaseId: string; runnerId?: string },
): Promise<{ status: "ok" | "stale" }> {
  const updated = await db.lease.updateMany({
    where: { id: input.leaseId, memberId: identity.memberId, active: true },
    data: {
      lastHeartbeatAt: new Date(),
      expiresAt: new Date(Date.now() + LEASE_TTL_MS),
      ...(input.runnerId ? { runnerId: input.runnerId } : {}),
    },
  });
  return { status: updated.count > 0 ? "ok" : "stale" };
}

export type ReportInput = {
  leaseId: string;
  runId: string;
  phase: string; // orchestrate 詞彙：running | completed | verification-failed | exhausted
  runnerId?: string;
  verification?: unknown;
  resumedFrom?: string;
  attentionReason?: string; // 封閉集合；只在結果欄位是需要處理時採用
};

export type ReportResult = { status: "recorded" | "idempotent"; cardColumn: string };

/** 回報 run 狀態：以 runId 冪等；終態觸發卡片轉移並釋放 lease。 */
export async function reportRun(
  db: PrismaClient,
  identity: WorkerIdentity,
  input: ReportInput,
  hooks: { onCardDone?: (tx: Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0], cardId: string) => Promise<void> } = {},
): Promise<ReportResult> {
  if (input.attentionReason !== undefined && !isAttentionReason(input.attentionReason)) {
    throw new QueueError("invalid-attention-reason", "attentionReason 不在封閉集合內");
  }
  const lease = await db.lease.findUnique({ where: { id: input.leaseId }, include: { card: true, machine: true } });
  if (!lease || lease.memberId !== identity.memberId) {
    throw new QueueError("unknown-lease", "lease 不存在或不屬於此成員");
  }

  const existing = await db.run.findUnique({ where: { runId: input.runId } });
  if (existing && existing.phase === input.phase) {
    return { status: "idempotent", cardColumn: lease.card.column };
  }

  const terminal = ["completed", "verification-failed", "exhausted"].includes(input.phase);
  const column = await db.$transaction(async (tx) => {
    await tx.run.upsert({
      where: { runId: input.runId },
      update: {
        phase: input.phase,
        verification: input.verification as never,
        runnerId: input.runnerId,
        finishedAt: terminal ? new Date() : null,
      },
      create: {
        runId: input.runId,
        cardId: lease.cardId,
        phase: input.phase,
        verification: input.verification as never,
        memberId: identity.memberId,
        machineId: lease.machine.id,
        runnerId: input.runnerId ?? lease.runnerId,
        resumedFrom: input.resumedFrom,
        finishedAt: terminal ? new Date() : null,
      },
    });
    if (!terminal) return lease.card.column;

    await tx.lease.update({
      where: { id: lease.id },
      data: { active: false, releasedAt: new Date(), ...(input.runnerId ? { runnerId: input.runnerId } : {}) },
    });
    const event = phaseToEvent(input.phase, lease.card.reviewGate);
    if (!event) return lease.card.column;
    const updated = await applyCardEvent(tx, lease.cardId, event, { type: "worker", id: lease.machine.machineId }, {
      attentionReason: input.attentionReason,
    });
    if (updated.column === "DONE" && hooks.onCardDone) {
      await hooks.onCardDone(tx, lease.cardId);
    }
    return updated.column;
  });
  return { status: "recorded", cardColumn: column };
}

/** log chunk 上傳：unique(runId, seq) 冪等，重送直接吞掉。 */
export async function appendLogChunk(
  db: PrismaClient,
  identity: WorkerIdentity,
  input: { runId: string; seq: number; chunk: string },
): Promise<{ status: "ok" | "unknown-run" }> {
  const run = await db.run.findUnique({ where: { runId: input.runId } });
  if (!run || run.memberId !== identity.memberId) return { status: "unknown-run" };
  await db.logChunk.createMany({
    data: [{ runId: input.runId, cardId: run.cardId, seq: input.seq, content: input.chunk }],
    skipDuplicates: true,
  });
  return { status: "ok" };
}

export class QueueError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
