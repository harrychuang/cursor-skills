// 卡片詳情與 log 整合測試：chunk 順序、增量讀取、保留期限清理（前置：npm run dev-db）
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@127.0.0.1:54329/taskboard";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { PrismaClient } from "@prisma/client";
import { cleanupExpiredLogChunks, getCardDetail, getLogChunks } from "../src/lib/card-detail.ts";
import { appendLogChunk, claimCard, reportRun } from "../src/lib/queue.ts";

const db = new PrismaClient();
const identity = { memberId: "", tokenId: "detail-test-token" };
const SLUG = "proj-detail";
const RUN_ID = "detail-run-001";
let cardId = "";

before(async () => {
  const stale = await db.project.findUnique({ where: { slug: SLUG } });
  if (stale) {
    await db.logChunk.deleteMany({ where: { card: { projectId: stale.id } } });
    await db.run.deleteMany({ where: { card: { projectId: stale.id } } });
    await db.cardEvent.deleteMany({ where: { card: { projectId: stale.id } } });
    await db.lease.deleteMany({ where: { card: { projectId: stale.id } } });
    await db.card.deleteMany({ where: { projectId: stale.id } });
    await db.project.delete({ where: { id: stale.id } });
  }
  const member = await db.member.upsert({
    where: { email: "detail-test@example.com" },
    update: {},
    create: { email: "detail-test@example.com", name: "詳情測試" },
  });
  identity.memberId = member.id;
  const machine = await db.machine.upsert({
    where: { machineId: "detail-machine" },
    update: { memberId: member.id },
    create: { machineId: "detail-machine", memberId: member.id, runners: ["claude"] },
  });
  const project = await db.project.create({ data: { slug: SLUG, displayName: "詳情專案" } });
  const card = await db.card.create({
    data: { projectId: project.id, taskId: "extract", column: "CLAIMABLE", origin: "MEMBER", autoRun: true, reviewGate: true },
  });
  cardId = card.id;
  const claim = await claimCard(db, identity, { machineId: machine.machineId, projects: [SLUG], runnerId: "claude" });
  assert.equal(claim.status, "claimed");
  if (claim.status !== "claimed") return;
  await reportRun(db, identity, { leaseId: claim.card.leaseId, runId: RUN_ID, phase: "running" });
});

after(async () => {
  await db.$disconnect();
});

test("log chunk 亂序上傳仍依 seq 排序回傳", async () => {
  await appendLogChunk(db, identity, { runId: RUN_ID, seq: 2, chunk: "第二段\n" });
  await appendLogChunk(db, identity, { runId: RUN_ID, seq: 1, chunk: "第一段\n" });
  const chunks = await getLogChunks(db, cardId, RUN_ID, 0);
  assert.deepEqual(
    chunks.map((c) => c.seq),
    [1, 2],
  );
});

test("增量讀取：after 游標之後才回傳", async () => {
  const chunks = await getLogChunks(db, cardId, RUN_ID, 1);
  assert.deepEqual(
    chunks.map((c) => c.seq),
    [2],
  );
});

test("詳情包含 run 歷史與歸屬", async () => {
  const detail = await getCardDetail(db, cardId);
  assert.ok(detail);
  assert.equal(detail!.runs.length, 1);
  assert.equal(detail!.runs[0].runId, RUN_ID);
  assert.equal(detail!.runs[0].phase, "running");
  assert.equal(detail!.runs[0].attribution.member, "詳情測試");
  assert.equal(detail!.runs[0].logChunkCount, 2);
});

test("保留期限清理：過期 chunk 刪除、新 chunk 保留", async () => {
  // 造一筆 31 天前的 chunk
  await db.logChunk.create({
    data: { runId: RUN_ID, cardId, seq: 99, content: "老日誌\n", createdAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) },
  });
  const removed = await cleanupExpiredLogChunks(db, 30);
  assert.ok(removed >= 1, "至少刪除一筆過期 chunk");
  const remaining = await getLogChunks(db, cardId, RUN_ID, 0);
  assert.deepEqual(
    remaining.map((c) => c.seq),
    [1, 2],
    "未過期的 chunk 保留",
  );
});
