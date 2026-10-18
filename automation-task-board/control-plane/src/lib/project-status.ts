// 專案現況同步：快照 upsert（每專案唯一、舊快照忽略）與外部執行去重收錄。
import type { PrismaClient } from "@prisma/client";

export const SNAPSHOT_MAX_BYTES = 512 * 1024;

export type SnapshotInput = {
  projectSlug: string;
  hasDefinition: boolean;
  generatedAt?: string;
  snapshot?: unknown; // automation-pipeline-board status JSON 原文
};

export type SnapshotResult =
  | { status: "stored" }
  | { status: "stale-ignored" } // 上報的快照比現存的舊
  | { status: "unknown-project" }
  | { status: "payload-too-large" };

export async function upsertProjectSnapshot(db: PrismaClient, input: SnapshotInput): Promise<SnapshotResult> {
  const project = await db.project.findUnique({ where: { slug: input.projectSlug } });
  if (!project) return { status: "unknown-project" };

  if (input.snapshot !== undefined && Buffer.byteLength(JSON.stringify(input.snapshot), "utf8") > SNAPSHOT_MAX_BYTES) {
    return { status: "payload-too-large" };
  }

  const generatedAt = input.generatedAt ? new Date(input.generatedAt) : new Date();
  if (Number.isNaN(generatedAt.getTime())) return { status: "stale-ignored" };

  const existing = await db.projectSnapshot.findUnique({ where: { projectId: project.id } });
  if (existing && existing.generatedAt.getTime() > generatedAt.getTime()) {
    // 多台 worker 同時 advertise：以 generatedAt 較新者為準
    return { status: "stale-ignored" };
  }

  await db.projectSnapshot.upsert({
    where: { projectId: project.id },
    update: { hasDefinition: input.hasDefinition, generatedAt, payload: (input.snapshot ?? null) as never },
    create: {
      projectId: project.id,
      hasDefinition: input.hasDefinition,
      generatedAt,
      payload: (input.snapshot ?? null) as never,
    },
  });
  return { status: "stored" };
}

export type ExternalRunInput = {
  runId: string;
  taskId: string;
  phase: string;
  runnerId?: string;
  startedAt?: string;
  finishedAt?: string;
};

export type IngestResult = { status: "ok"; ingested: number; ignored: number } | { status: "unknown-project" };

/**
 * 外部執行收錄：runId 已存在於看板 Run 表（看板發起）→ 忽略；
 * 其餘以 runId 冪等 upsert（重報只更新 phase 等欄位，不重複建）。
 */
export async function ingestExternalRuns(
  db: PrismaClient,
  projectSlug: string,
  runs: ExternalRunInput[],
  reportedByMachineId?: string,
): Promise<IngestResult> {
  const project = await db.project.findUnique({ where: { slug: projectSlug } });
  if (!project) return { status: "unknown-project" };

  let ingested = 0;
  let ignored = 0;
  for (const run of runs) {
    if (!run.runId || !run.taskId || !run.phase) {
      ignored += 1;
      continue;
    }
    const boardRun = await db.run.findUnique({ where: { runId: run.runId } });
    if (boardRun) {
      ignored += 1; // 看板發起的執行不算外部
      continue;
    }
    const startedAt = run.startedAt ? new Date(run.startedAt) : null;
    const finishedAt = run.finishedAt ? new Date(run.finishedAt) : null;
    await db.externalRun.upsert({
      where: { runId: run.runId },
      update: {
        phase: run.phase,
        runnerId: run.runnerId,
        finishedAt: finishedAt && !Number.isNaN(finishedAt.getTime()) ? finishedAt : null,
      },
      create: {
        runId: run.runId,
        projectId: project.id,
        taskId: run.taskId,
        phase: run.phase,
        runnerId: run.runnerId,
        startedAt: startedAt && !Number.isNaN(startedAt.getTime()) ? startedAt : null,
        finishedAt: finishedAt && !Number.isNaN(finishedAt.getTime()) ? finishedAt : null,
        reportedByMachineId,
      },
    });
    ingested += 1;
  }
  return { status: "ok", ingested, ignored };
}

/** 專案頁讀取模型：最新快照 + 外部活動（新到舊）。 */
export async function getProjectStatus(db: PrismaClient, slug: string) {
  const project = await db.project.findUnique({
    where: { slug },
    include: {
      snapshot: true,
      externalRuns: { orderBy: { updatedAt: "desc" }, take: 100 },
      chain: { orderBy: { position: "asc" } },
    },
  });
  if (!project) return null;
  const payload = project.snapshot?.payload as {
    stages?: Array<{ id: string; title: string; state: string; verified?: boolean }>;
    sources?: Array<{ id: string; title: string; present: boolean }>;
  } | null;
  return {
    slug: project.slug,
    displayName: project.displayName,
    snapshot: project.snapshot
      ? {
          hasDefinition: project.snapshot.hasDefinition,
          generatedAt: project.snapshot.generatedAt.toISOString(),
          stages: payload?.stages ?? [],
          sources: payload?.sources ?? [],
        }
      : null,
    externalRuns: project.externalRuns.map((run) => ({
      runId: run.runId,
      taskId: run.taskId,
      phase: run.phase,
      runnerId: run.runnerId,
      startedAt: run.startedAt?.toISOString() ?? null,
      finishedAt: run.finishedAt?.toISOString() ?? null,
    })),
  };
}
