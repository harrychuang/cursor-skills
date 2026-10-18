// Demo 種子資料：讓本機預覽的看板五欄都有卡（UI 檢視用，可重複執行）。
// 用法：node scripts/seed-demo.mjs
import { PrismaClient } from "@prisma/client";

process.env.DATABASE_URL ??= "postgresql://postgres:postgres@127.0.0.1:54329/taskboard";
const db = new PrismaClient();
const SLUG = "chipk-demo";

async function main() {
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

  const harry = await db.member.upsert({
    where: { email: "harry@example.com" },
    update: {},
    create: { email: "harry@example.com", name: "Harry" },
  });
  const mia = await db.member.upsert({
    where: { email: "mia@example.com" },
    update: {},
    create: { email: "mia@example.com", name: "Mia" },
  });
  const macbook = await db.machine.upsert({
    where: { machineId: "demo-harry-mbp" },
    update: { memberId: harry.id, label: "Harry 的 MacBook Pro" },
    create: { machineId: "demo-harry-mbp", memberId: harry.id, label: "Harry 的 MacBook Pro", runners: ["claude", "codex"] },
  });
  const studio = await db.machine.upsert({
    where: { machineId: "demo-mia-studio" },
    update: { memberId: mia.id, label: "Mia 的 Mac Studio" },
    create: { machineId: "demo-mia-studio", memberId: mia.id, label: "Mia 的 Mac Studio", runners: ["claude"] },
  });

  const project = await db.project.create({ data: { slug: SLUG, displayName: "chipK 設計系統" } });
  const chain = [
    { taskId: "extract-design-system", requiresReview: true },
    { taskId: "build-storybook-foundation", requiresReview: true },
    { taskId: "implement-components", requiresReview: true },
    { taskId: "visual-parity-audit", requiresReview: false },
  ];
  for (let i = 0; i < chain.length; i += 1) {
    await db.taskChainEntry.create({ data: { projectId: project.id, position: i, ...chain[i] } });
  }

  const card = (data) => db.card.create({ data: { projectId: project.id, origin: "MEMBER", ...data } });

  // 完成：extract（Harry 的 Claude 跑完、已批准）
  const done = await card({
    taskId: "extract-design-system",
    column: "DONE",
    autoRun: true,
    reviewGate: true,
    note: "從 Harry 策展的 Figma section 萃取",
    createdById: harry.id,
  });
  await db.run.create({
    data: {
      runId: "demo-run-extract",
      cardId: done.id,
      phase: "completed",
      memberId: harry.id,
      machineId: macbook.id,
      runnerId: "claude",
      verification: { configured: 3, passed: 3, failed: 0, notRun: 0 },
      startedAt: new Date(Date.now() - 90 * 60 * 1000),
      finishedAt: new Date(Date.now() - 62 * 60 * 1000),
    },
  });
  for (const [i, event] of [
    ["CARD_CREATED", "CLAIMABLE", "CLAIMABLE", "member", harry.id],
    ["LEASE_GRANTED", "CLAIMABLE", "RUNNING", "worker", "demo-harry-mbp"],
    ["RUN_COMPLETED_GATED", "RUNNING", "AWAITING_REVIEW", "worker", "demo-harry-mbp"],
    ["HUMAN_APPROVE", "AWAITING_REVIEW", "DONE", "member", harry.id],
  ].entries()) {
    await db.cardEvent.create({
      data: {
        cardId: done.id,
        event: event[0],
        fromColumn: event[1],
        toColumn: event[2],
        actorType: event[3],
        actorId: event[4],
        createdAt: new Date(Date.now() - (100 - i * 10) * 60 * 1000),
      },
    });
  }

  // 執行中：storybook（接棒卡，Mia 的機器在跑，有 log）
  const running = await card({
    taskId: "build-storybook-foundation",
    column: "RUNNING",
    origin: "PIPELINE_CHAIN",
    autoRun: true,
    reviewGate: true,
  });
  await db.lease.create({
    data: {
      cardId: running.id,
      machineId: studio.id,
      memberId: mia.id,
      runnerId: "claude",
      expiresAt: new Date(Date.now() + 90 * 1000),
    },
  });
  await db.run.create({
    data: {
      runId: "demo-run-storybook",
      cardId: running.id,
      phase: "running",
      memberId: mia.id,
      machineId: studio.id,
      runnerId: "claude",
      startedAt: new Date(Date.now() - 6 * 60 * 1000),
    },
  });
  const logLines = [
    "讀取 design-system/STORYBOOK_COMPONENT_PLAN.md…\n",
    "建立 .storybook/ 基礎設定與 token 展示 stories\n",
    "npm run check-token-inheritance … 通過\n",
    "開始第一批元件：Button / Chip / Badge\n",
  ];
  for (let i = 0; i < logLines.length; i += 1) {
    await db.logChunk.create({ data: { runId: "demo-run-storybook", cardId: running.id, seq: i + 1, content: logLines[i] } });
  }
  await db.cardEvent.create({
    data: { cardId: running.id, event: "CARD_CREATED", fromColumn: "CLAIMABLE", toColumn: "CLAIMABLE", actorType: "system", note: "pipeline-chain：extract-design-system 完成後自動建立" },
  });
  await db.cardEvent.create({
    data: { cardId: running.id, event: "LEASE_GRANTED", fromColumn: "CLAIMABLE", toColumn: "RUNNING", actorType: "worker", actorId: "demo-mia-studio" },
  });

  // 需要處理：implement-components（驗證失敗）
  const attention = await card({
    taskId: "implement-components",
    column: "NEEDS_ATTENTION",
    autoRun: true,
    reviewGate: true,
    attentionReason: "verification-failed",
    createdById: harry.id,
  });
  await db.run.create({
    data: {
      runId: "demo-run-impl",
      cardId: attention.id,
      phase: "verification-failed",
      memberId: harry.id,
      machineId: macbook.id,
      runnerId: "codex",
      verification: { configured: 4, passed: 2, failed: 1, notRun: 1 },
      startedAt: new Date(Date.now() - 40 * 60 * 1000),
      finishedAt: new Date(Date.now() - 25 * 60 * 1000),
    },
  });
  await db.cardEvent.create({
    data: { cardId: attention.id, event: "RUN_VERIFICATION_FAILED", fromColumn: "RUNNING", toColumn: "NEEDS_ATTENTION", actorType: "worker", actorId: "demo-harry-mbp" },
  });

  // 待確認：visual-parity-audit（跑完等 review）
  const review = await card({
    taskId: "visual-parity-audit",
    column: "AWAITING_REVIEW",
    autoRun: true,
    reviewGate: true,
    createdById: mia.id,
    note: "比對 chipK 首頁與 Figma 的視覺差異",
  });
  await db.run.create({
    data: {
      runId: "demo-run-audit",
      cardId: review.id,
      phase: "completed",
      memberId: mia.id,
      machineId: studio.id,
      runnerId: "claude",
      verification: { configured: 2, passed: 2, failed: 0, notRun: 0 },
      startedAt: new Date(Date.now() - 20 * 60 * 1000),
      finishedAt: new Date(Date.now() - 8 * 60 * 1000),
    },
  });
  await db.cardEvent.create({
    data: { cardId: review.id, event: "RUN_COMPLETED_GATED", fromColumn: "RUNNING", toColumn: "AWAITING_REVIEW", actorType: "worker", actorId: "demo-mia-studio" },
  });

  // 待領取：一張自動、一張待放行
  await card({ taskId: "extract-design-system", column: "CLAIMABLE", autoRun: true, reviewGate: true, note: "第二輪：新的行銷頁 section", createdById: harry.id });
  await card({ taskId: "visual-parity-audit", column: "CLAIMABLE", autoRun: false, reviewGate: false, note: "外部觸發來源示範：需人工放行", createdById: mia.id });

  console.log("demo 資料就緒：chipK 設計系統（五欄皆有卡）");
}

main().finally(() => db.$disconnect());
