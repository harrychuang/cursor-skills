// 看板讀取模型整合測試（前置：npm run dev-db）
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@127.0.0.1:54329/taskboard";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { PrismaClient } from "@prisma/client";
import { boardWatermark, getBoardState } from "../src/lib/board.ts";
import { setProjectChain } from "../src/lib/cards.ts";
import { claimCard } from "../src/lib/queue.ts";

const db = new PrismaClient();
const identity = { memberId: "", tokenId: "board-test-token" };
const SLUG = "proj-board";
let cardId = "";

before(async () => {
  const stale = await db.project.findUnique({ where: { slug: SLUG } });
  if (stale) {
    await db.logChunk.deleteMany({ where: { card: { projectId: stale.id } } });
    await db.run.deleteMany({ where: { card: { projectId: stale.id } } });
    await db.cardEvent.deleteMany({ where: { card: { projectId: stale.id } } });
    await db.lease.deleteMany({ where: { card: { projectId: stale.id } } });
    await db.card.deleteMany({ where: { projectId: stale.id } });
    await db.taskChainEntry.deleteMany({ where: { projectId: stale.id } });
    await db.project.delete({ where: { id: stale.id } });
  }
  const member = await db.member.upsert({
    where: { email: "board-test@example.com" },
    update: {},
    create: { email: "board-test@example.com", name: "看板測試" },
  });
  identity.memberId = member.id;
  await db.machine.upsert({
    where: { machineId: "board-machine" },
    update: { memberId: member.id, label: "測試筆電" },
    create: { machineId: "board-machine", memberId: member.id, label: "測試筆電", runners: ["claude"] },
  });
  await setProjectChain(db, {
    projectSlug: SLUG,
    entries: [
      { taskId: "extract", requiresReview: false },
      { taskId: "storybook", requiresReview: true },
      { taskId: "prototype", requiresReview: true },
    ],
  });
  const project = await db.project.findUniqueOrThrow({ where: { slug: SLUG } });
  const card = await db.card.create({
    data: { projectId: project.id, taskId: "storybook", column: "CLAIMABLE", origin: "PIPELINE_CHAIN", autoRun: true },
  });
  cardId = card.id;
});

after(async () => {
  await db.$disconnect();
});

test("執行中卡片帶歸屬三元組與階段進度", async () => {
  const result = await claimCard(db, identity, { machineId: "board-machine", projects: [SLUG], runnerId: "claude" });
  assert.equal(result.status, "claimed");

  const state = await getBoardState(db);
  const card = state.cards.find((c) => c.id === cardId);
  assert.ok(card);
  assert.equal(card!.column, "RUNNING");
  assert.deepEqual(card!.stage, { index: 2, total: 3 }, "storybook 是鏈上第 2/3 階段");
  assert.deepEqual(card!.attribution, { member: "看板測試", machine: "測試筆電", runner: "claude" });
});

test("watermark 隨卡片事件前進", async () => {
  const before = await boardWatermark(db);
  await db.cardEvent.create({
    data: {
      cardId,
      event: "CARD_CREATED",
      fromColumn: "RUNNING",
      toColumn: "RUNNING",
      actorType: "system",
      note: "watermark 測試",
    },
  });
  const after = await boardWatermark(db);
  assert.notEqual(after, before, "事件發生後 watermark 必須改變（SSE 據此推播 refresh）");
});
