// 專案現況同步整合測試（前置：npm run dev-db）
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@127.0.0.1:54329/taskboard";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { PrismaClient } from "@prisma/client";
import { boardWatermark } from "../src/lib/board.ts";
import { getProjectStatus, ingestExternalRuns, upsertProjectSnapshot } from "../src/lib/project-status.ts";
import { claimCard, reportRun } from "../src/lib/queue.ts";

const db = new PrismaClient();
const identity = { memberId: "", tokenId: "status-test-token" };
const SLUG = "proj-status";

before(async () => {
  const stale = await db.project.findUnique({ where: { slug: SLUG } });
  if (stale) {
    await db.externalRun.deleteMany({ where: { projectId: stale.id } });
    await db.projectSnapshot.deleteMany({ where: { projectId: stale.id } });
    await db.logChunk.deleteMany({ where: { card: { projectId: stale.id } } });
    await db.run.deleteMany({ where: { card: { projectId: stale.id } } });
    await db.cardEvent.deleteMany({ where: { card: { projectId: stale.id } } });
    await db.lease.deleteMany({ where: { card: { projectId: stale.id } } });
    await db.card.deleteMany({ where: { projectId: stale.id } });
    await db.project.delete({ where: { id: stale.id } });
  }
  const member = await db.member.upsert({
    where: { email: "status-test@example.com" },
    update: {},
    create: { email: "status-test@example.com", name: "現況測試" },
  });
  identity.memberId = member.id;
  await db.machine.upsert({
    where: { machineId: "status-machine" },
    update: { memberId: member.id },
    create: { machineId: "status-machine", memberId: member.id, runners: ["claude"] },
  });
  await db.project.create({ data: { slug: SLUG, displayName: "現況專案" } });
});

after(async () => {
  await db.$disconnect();
});

test("快照 upsert：正常收錄、無定義、未知專案、舊快照忽略", async () => {
  const snapshot = {
    schemaVersion: 1,
    stages: [
      { id: "extract-design-system", title: "萃取設計系統", state: "verified", verified: true },
      { id: "build-storybook-foundation", title: "建 Storybook 基礎", state: "produced", verified: false },
    ],
    sources: [{ id: "ui-screenshots", title: "UI 截圖", present: true }],
  };
  const stored = await upsertProjectSnapshot(db, {
    projectSlug: SLUG,
    hasDefinition: true,
    generatedAt: "2026-08-10T08:00:00.000Z",
    snapshot,
  });
  assert.equal(stored.status, "stored");

  // 舊快照（generatedAt 較早）被忽略
  const staleResult = await upsertProjectSnapshot(db, {
    projectSlug: SLUG,
    hasDefinition: true,
    generatedAt: "2026-08-10T07:00:00.000Z",
    snapshot: { schemaVersion: 1, stages: [] },
  });
  assert.equal(staleResult.status, "stale-ignored");

  const status = await getProjectStatus(db, SLUG);
  assert.equal(status!.snapshot!.stages.length, 2, "保留較新快照");
  assert.equal(status!.snapshot!.stages[0].state, "verified");

  // 未知專案
  const unknown = await upsertProjectSnapshot(db, { projectSlug: "no-such-project", hasDefinition: true });
  assert.equal(unknown.status, "unknown-project");

  // 無定義
  await db.projectSnapshot.deleteMany({ where: { project: { slug: SLUG } } });
  const noDef = await upsertProjectSnapshot(db, { projectSlug: SLUG, hasDefinition: false });
  assert.equal(noDef.status, "stored");
  const afterNoDef = await getProjectStatus(db, SLUG);
  assert.equal(afterNoDef!.snapshot!.hasDefinition, false);
});

test("外部執行去重：看板已知 runId 忽略、外部 runId 冪等 upsert", async () => {
  // 造一筆看板發起的 run
  const project = await db.project.findUniqueOrThrow({ where: { slug: SLUG } });
  const card = await db.card.create({
    data: { projectId: project.id, taskId: "extract", column: "CLAIMABLE", origin: "MEMBER", autoRun: true, reviewGate: false },
  });
  const claim = await claimCard(db, identity, { machineId: "status-machine", projects: [SLUG], runnerId: "claude" });
  assert.equal(claim.status, "claimed");
  if (claim.status !== "claimed") return;
  await reportRun(db, identity, { leaseId: claim.card.leaseId, runId: "board-run-1", phase: "completed" });

  // 上報兩筆：一筆是看板已知的、一筆是外部的
  const first = await ingestExternalRuns(db, SLUG, [
    { runId: "board-run-1", taskId: "extract", phase: "completed" },
    { runId: "external-run-1", taskId: "extract", phase: "running", runnerId: "codex", startedAt: "2026-08-09T10:00:00.000Z" },
  ]);
  assert.deepEqual(first, { status: "ok", ingested: 1, ignored: 1 }, "看板已知 runId 被忽略");

  // 同一外部 runId 再報一次，phase 更新
  const second = await ingestExternalRuns(db, SLUG, [
    { runId: "external-run-1", taskId: "extract", phase: "verification-failed", finishedAt: "2026-08-09T10:30:00.000Z" },
  ]);
  assert.equal(second.status, "ok");

  const externals = await db.externalRun.findMany({ where: { projectId: project.id } });
  assert.equal(externals.length, 1, "冪等：只有一筆");
  assert.equal(externals[0].phase, "verification-failed", "phase 為新值");
  assert.equal(externals[0].runId, "external-run-1");
  void card;
});

test("watermark 隨外部執行更新前進", async () => {
  const before = await boardWatermark(db);
  await ingestExternalRuns(db, SLUG, [{ runId: "external-run-2", taskId: "audit", phase: "completed" }]);
  const after = await boardWatermark(db);
  assert.notEqual(after, before, "外部執行寫入後 watermark 改變（SSE 據此推播）");
});
