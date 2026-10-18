// lease 逾時掃描整合測試（前置：npm run dev-db）
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@127.0.0.1:54329/taskboard";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { PrismaClient } from "@prisma/client";
import { claimCard } from "../src/lib/queue.ts";
import { sweepExpiredLeases } from "../src/lib/expiry.ts";

const db = new PrismaClient();
const identity = { memberId: "", tokenId: "expiry-test-token" };
let cardId = "";
let leaseId = "";

before(async () => {
  // scoped 清理：只清本測試的專案資料，避免與其他測試檔或前次執行互相干擾
  const stale = await db.project.findUnique({ where: { slug: "proj-expiry" } });
  if (stale) {
    await db.logChunk.deleteMany({ where: { card: { projectId: stale.id } } });
    await db.run.deleteMany({ where: { card: { projectId: stale.id } } });
    await db.cardEvent.deleteMany({ where: { card: { projectId: stale.id } } });
    await db.lease.deleteMany({ where: { card: { projectId: stale.id } } });
    await db.card.deleteMany({ where: { projectId: stale.id } });
    await db.project.delete({ where: { id: stale.id } });
  }
  const member = await db.member.upsert({
    where: { email: "expiry-test@example.com" },
    update: {},
    create: { email: "expiry-test@example.com", name: "逾時測試" },
  });
  identity.memberId = member.id;
  const machine = await db.machine.upsert({
    where: { machineId: "expiry-machine" },
    update: { memberId: member.id },
    create: { machineId: "expiry-machine", memberId: member.id, runners: ["claude"] },
  });
  const project = await db.project.create({ data: { slug: "proj-expiry", displayName: "逾時專案" } });
  const card = await db.card.create({
    data: { projectId: project.id, taskId: "extract", column: "CLAIMABLE", origin: "MEMBER", autoRun: true },
  });
  cardId = card.id;
  const result = await claimCard(db, identity, { machineId: machine.machineId, projects: ["proj-expiry"], runnerId: "claude" });
  assert.equal(result.status, "claimed");
  if (result.status === "claimed") leaseId = result.card.leaseId;
});

after(async () => {
  await db.$disconnect();
});

test("心跳停止超過 TTL：掃描把卡移入需要處理、保留最後歸屬", async () => {
  // 模擬心跳停止：把 lease 的 expiresAt 撥到過去
  await db.lease.update({ where: { id: leaseId }, data: { expiresAt: new Date(Date.now() - 1000) } });

  const swept = await sweepExpiredLeases(db);
  assert.equal(swept, 1);

  const card = await db.card.findUniqueOrThrow({ where: { id: cardId } });
  assert.equal(card.column, "NEEDS_ATTENTION");
  assert.equal(card.attentionReason, "possibly-stopped");

  const lease = await db.lease.findUniqueOrThrow({ where: { id: leaseId } });
  assert.equal(lease.active, false, "lease 釋放");
  assert.equal(lease.memberId, identity.memberId, "最後歸屬保留");

  const events = await db.cardEvent.findMany({ where: { cardId, event: "LEASE_EXPIRED" } });
  assert.equal(events.length, 1, "轉移寫入卡片歷史");
});

test("逾時卡未經人工指令不再被領取", async () => {
  const machine = await db.machine.findFirstOrThrow({ where: { machineId: "expiry-machine" } });
  const result = await claimCard(db, identity, { machineId: machine.machineId, projects: ["proj-expiry"] });
  assert.equal(result.status, "empty");
});

test("掃描冪等：再掃一次不重複轉移", async () => {
  const swept = await sweepExpiredLeases(db);
  assert.equal(swept, 0);
  const events = await db.cardEvent.findMany({ where: { cardId, event: "LEASE_EXPIRED" } });
  assert.equal(events.length, 1);
});
