// Design Automation Hub 派工建卡與回寫的整合測試（前置：npm run dev-db）
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@127.0.0.1:54329/taskboard";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { PrismaClient } from "@prisma/client";
import { setProjectChain } from "../src/lib/cards.ts";
import { createHubCard, getHubCardStatus, recordHubOutcome } from "../src/lib/hub-cards.ts";
import { claimCard } from "../src/lib/queue.ts";

const db = new PrismaClient();
const identity = { memberId: "", tokenId: "hub-test-token" };
const SLUG = "proj-hub";
const MACHINE = "hub-test-machine";

async function clearProject() {
  const stale = await db.project.findUnique({ where: { slug: SLUG } });
  if (!stale) return;
  await db.logChunk.deleteMany({ where: { card: { projectId: stale.id } } });
  await db.run.deleteMany({ where: { card: { projectId: stale.id } } });
  await db.cardEvent.deleteMany({ where: { card: { projectId: stale.id } } });
  await db.lease.deleteMany({ where: { card: { projectId: stale.id } } });
  await db.card.deleteMany({ where: { projectId: stale.id } });
  await db.taskChainEntry.deleteMany({ where: { projectId: stale.id } });
  await db.project.delete({ where: { id: stale.id } });
}

before(async () => {
  await clearProject();
  const member = await db.member.upsert({
    where: { email: "hub-test@example.com" },
    update: {},
    create: { email: "hub-test@example.com", name: "Hub 測試成員" },
  });
  identity.memberId = member.id;
  await db.machine.upsert({
    where: { machineId: MACHINE },
    update: { memberId: member.id, runners: ["claude"] },
    create: { machineId: MACHINE, memberId: member.id, runners: ["claude"] },
  });
});

after(async () => {
  await clearProject();
  await db.$disconnect();
});

const REQUEST = "Read .design-automation/runtime/task-alpha/input.json and write exactly one result to .design-automation/runtime/task-alpha/result.json.";

test("Hub 建卡：未放行、必經待確認，且 worker 領不到", async () => {
  const created = await createHubCard(db, identity.memberId, {
    projectSlug: SLUG,
    taskId: "figma-cleanup",
    hubAutomationTaskId: "task-alpha",
    note: REQUEST,
  });
  assert.equal(created.created, true);
  assert.equal(created.column, "CLAIMABLE");
  assert.equal(created.approved, false);

  const card = await db.card.findUniqueOrThrow({ where: { id: created.cardId } });
  assert.equal(card.origin, "DESIGN_AUTOMATION_HUB");
  assert.equal(card.autoRun, false);
  assert.equal(card.reviewGate, true);
  assert.equal(card.hubAutomationTaskId, "task-alpha");
  assert.equal(card.note, REQUEST);

  // 未放行的卡不進候選：這個專案只有這張卡，所以 claim 回 empty
  const claim = await claimCard(db, identity, { machineId: MACHINE, projects: [SLUG] });
  assert.equal(claim.status, "empty");
});

test("Hub 建卡冪等：同一 automation task id 重送回同一張卡且不新建", async () => {
  const again = await createHubCard(db, identity.memberId, {
    projectSlug: SLUG,
    taskId: "figma-cleanup",
    hubAutomationTaskId: "task-alpha",
    note: REQUEST,
  });
  assert.equal(again.created, false);

  const project = await db.project.findUniqueOrThrow({ where: { slug: SLUG } });
  const cards = await db.card.findMany({ where: { projectId: project.id, hubAutomationTaskId: "task-alpha" } });
  assert.equal(cards.length, 1);
  assert.equal(again.cardId, cards[0].id);
});

test("任務鏈宣告 requiresReview false，Hub 卡仍然必經待確認", async () => {
  await setProjectChain(db, {
    projectSlug: SLUG,
    entries: [{ taskId: "figma-cleanup", requiresReview: false }],
  });
  const created = await createHubCard(db, identity.memberId, {
    projectSlug: SLUG,
    taskId: "figma-cleanup",
    hubAutomationTaskId: "task-beta",
    note: REQUEST,
  });
  const card = await db.card.findUniqueOrThrow({ where: { id: created.cardId } });
  assert.equal(card.reviewGate, true);
  assert.equal(card.autoRun, false);
});

test("非法 automation task id 被拒，且不留下卡片", async () => {
  await assert.rejects(
    () =>
      createHubCard(db, identity.memberId, {
        projectSlug: SLUG,
        taskId: "figma-cleanup",
        hubAutomationTaskId: "../escape",
        note: REQUEST,
      }),
    (error: { code?: string }) => error.code === "invalid-automation-task-id",
  );
  const project = await db.project.findUniqueOrThrow({ where: { slug: SLUG } });
  const cards = await db.card.findMany({ where: { projectId: project.id } });
  assert.equal(cards.length, 2);
});

test("Hub 回寫 applied：待確認的卡結案", async () => {
  const created = await createHubCard(db, identity.memberId, {
    projectSlug: SLUG,
    taskId: "figma-cleanup",
    hubAutomationTaskId: "task-applied",
    note: REQUEST,
  });
  await db.card.update({ where: { id: created.cardId }, data: { column: "AWAITING_REVIEW" } });

  const result = await recordHubOutcome(db, identity.memberId, created.cardId, "applied");
  assert.equal(result.applied, true);
  assert.equal(result.column, "DONE");

  const events = await db.cardEvent.findMany({ where: { cardId: created.cardId }, orderBy: { createdAt: "asc" } });
  assert.equal(events.at(-1)?.event, "HUB_APPLY_COMPLETED");
  assert.equal(events.at(-1)?.actorType, "hub");
});

test("Hub 回寫 failed：待確認的卡回需要處理，原因 hub-apply-failed", async () => {
  const created = await createHubCard(db, identity.memberId, {
    projectSlug: SLUG,
    taskId: "figma-cleanup",
    hubAutomationTaskId: "task-failed",
    note: REQUEST,
  });
  await db.card.update({ where: { id: created.cardId }, data: { column: "AWAITING_REVIEW" } });

  const result = await recordHubOutcome(db, identity.memberId, created.cardId, "failed", "apply-partial-failure");
  assert.equal(result.applied, true);
  assert.equal(result.column, "NEEDS_ATTENTION");

  const card = await db.card.findUniqueOrThrow({ where: { id: created.cardId } });
  assert.equal(card.attentionReason, "hub-apply-failed");
});

test("已批准結案的卡收到 Hub 回寫：只寫歷史、不移動卡片", async () => {
  const created = await createHubCard(db, identity.memberId, {
    projectSlug: SLUG,
    taskId: "figma-cleanup",
    hubAutomationTaskId: "task-closed",
    note: REQUEST,
  });
  // 成員先在看板批准結案
  await db.card.update({ where: { id: created.cardId }, data: { column: "DONE" } });
  const before = await db.cardEvent.count({ where: { cardId: created.cardId } });

  const result = await recordHubOutcome(db, identity.memberId, created.cardId, "failed", "apply-aborted");
  assert.equal(result.applied, false);
  assert.equal(result.column, "DONE");
  assert.equal(result.reason, "not-awaiting-review");

  const card = await db.card.findUniqueOrThrow({ where: { id: created.cardId } });
  assert.equal(card.column, "DONE", "回寫不得把已結案的卡拉回收件匣");
  const after = await db.cardEvent.count({ where: { cardId: created.cardId } });
  assert.equal(after, before + 1, "歷史仍必須記下 Hub 說了什麼");
});

test("Hub 查狀態：只回欄位、是否放行、需要處理原因", async () => {
  const project = await db.project.findUniqueOrThrow({ where: { slug: SLUG } });
  const card = await db.card.findFirstOrThrow({
    where: { projectId: project.id, hubAutomationTaskId: "task-failed" },
  });
  const status = await getHubCardStatus(db, card.id);
  assert.deepEqual(Object.keys(status).sort(), ["approved", "attentionReason", "cardId", "column"]);
  assert.equal(status.column, "NEEDS_ATTENTION");
  assert.equal(status.approved, false);
  assert.equal(status.attentionReason, "hub-apply-failed");
});
