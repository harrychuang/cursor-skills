// 卡片來源整合測試：手動建卡、流水線接棒、放行（前置：npm run dev-db）
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@127.0.0.1:54329/taskboard";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { PrismaClient } from "@prisma/client";
import { approveCardForRun, createCard, setProjectChain } from "../src/lib/cards.ts";
import { maybeCreateSuccessorCard } from "../src/lib/chain.ts";
import { claimCard, reportRun } from "../src/lib/queue.ts";

const db = new PrismaClient();
const identity = { memberId: "", tokenId: "chain-test-token" };
const SLUG = "proj-chain";
let machineId = "";

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
    where: { email: "chain-test@example.com" },
    update: {},
    create: { email: "chain-test@example.com", name: "接棒測試" },
  });
  identity.memberId = member.id;
  const machine = await db.machine.upsert({
    where: { machineId: "chain-machine" },
    update: { memberId: member.id },
    create: { machineId: "chain-machine", memberId: member.id, runners: ["claude"] },
  });
  machineId = machine.machineId;
  // 任務鏈：extract →（無 review gate）→ storybook（有 review gate）
  await setProjectChain(db, {
    projectSlug: SLUG,
    entries: [
      { taskId: "extract", requiresReview: false },
      { taskId: "storybook", requiresReview: true },
    ],
  });
});

after(async () => {
  await db.$disconnect();
});

test("手動建卡：origin=MEMBER、建立者記錄、任務鏈的 reviewGate 沿用", async () => {
  const card = await createCard(db, identity.memberId, { projectSlug: SLUG, taskId: "extract", note: "從截圖開始" });
  assert.equal(card.column, "CLAIMABLE");
  assert.equal(card.origin, "MEMBER");
  assert.equal(card.createdById, identity.memberId);
  assert.equal(card.reviewGate, false, "extract 在鏈上 requiresReview=false");
  const events = await db.cardEvent.findMany({ where: { cardId: card.id, event: "CARD_CREATED" } });
  assert.equal(events.length, 1);
});

test("流水線接棒：extract 完成 → 自動建 storybook 卡（origin=pipeline-chain、auto-run）", async () => {
  const claimResult = await claimCard(db, identity, { machineId, projects: [SLUG], runnerId: "claude" });
  assert.equal(claimResult.status, "claimed");
  if (claimResult.status !== "claimed") return;

  const report = await reportRun(
    db,
    identity,
    { leaseId: claimResult.card.leaseId, runId: "chain-run-001", phase: "completed" },
    {
      onCardDone: async (tx, cardId) => {
        await maybeCreateSuccessorCard(tx, cardId);
      },
    },
  );
  assert.equal(report.cardColumn, "DONE");

  const successor = await db.card.findFirst({ where: { project: { slug: SLUG }, taskId: "storybook" } });
  assert.ok(successor, "後繼卡已建立");
  assert.equal(successor!.column, "CLAIMABLE");
  assert.equal(successor!.origin, "PIPELINE_CHAIN");
  assert.equal(successor!.autoRun, true, "接棒卡是信任來源，自動跑");
  assert.equal(successor!.reviewGate, true, "storybook 在鏈上 requiresReview=true");
});

test("接棒冪等：後繼卡未結案時不重複建", async () => {
  const extractCard = await db.card.findFirstOrThrow({ where: { project: { slug: SLUG }, taskId: "extract" } });
  await db.$transaction(async (tx) => {
    await maybeCreateSuccessorCard(tx, extractCard.id);
  });
  const successors = await db.card.findMany({ where: { project: { slug: SLUG }, taskId: "storybook" } });
  assert.equal(successors.length, 1);
});

test("放行：未 auto-run 的卡放行前不被領取、放行後可領", async () => {
  // 先把接棒卡收掉，避免干擾本測試的 claim
  await db.card.updateMany({ where: { project: { slug: SLUG }, taskId: "storybook" }, data: { column: "DONE" } });

  const gated = await createCard(db, identity.memberId, {
    projectSlug: SLUG,
    taskId: "manual-audit",
    autoRun: false,
  });
  const beforeApproval = await claimCard(db, identity, { machineId, projects: [SLUG] });
  assert.equal(beforeApproval.status, "empty", "未放行不出現在 claim 回應");

  await approveCardForRun(db, identity.memberId, gated.id);
  const approved = await db.card.findUniqueOrThrow({ where: { id: gated.id } });
  assert.equal(approved.approvedById, identity.memberId, "放行者記錄");

  const afterApproval = await claimCard(db, identity, { machineId, projects: [SLUG] });
  assert.equal(afterApproval.status, "claimed");
  if (afterApproval.status === "claimed") assert.equal(afterApproval.card.cardId, gated.id);
});
