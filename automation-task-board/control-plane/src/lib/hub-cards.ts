// Design Automation Hub 派工來源：Coordinator 以 worker token 建卡、查狀態、回寫 apply 結果。
// 政策差異（相對 member／chain 建卡）：外部觸發預設不放行（autoRun false），
// 且 figma-cleanup 的 AI 步驟只到 plan-ready，所以 reviewGate 強制 true。
import type { PrismaClient } from "@prisma/client";
import { CardActionError } from "./cards.ts";
import { applyCardEvent } from "./card-transitions.ts";
import { maybeCreateSuccessorCard } from "./chain.ts";

export type HubCardInput = {
  projectSlug: string;
  taskId: string;
  hubAutomationTaskId: string;
  note?: string;
};

export type HubCardResult = {
  cardId: string;
  column: string;
  approved: boolean;
  created: boolean;
};

/** automation task id 同時是建卡冪等鍵與 claim 資格鍵，格式與 Hub 的 runtime 目錄名一致。 */
const AUTOMATION_TASK_ID = /^[A-Za-z0-9-]{1,128}$/;

function requireHubInput(input: HubCardInput) {
  const projectSlug = input.projectSlug?.trim();
  const taskId = input.taskId?.trim();
  const hubAutomationTaskId = input.hubAutomationTaskId?.trim();
  if (!projectSlug || !taskId) throw new CardActionError("invalid-body", "projectSlug 與 taskId 必填");
  if (!hubAutomationTaskId || !AUTOMATION_TASK_ID.test(hubAutomationTaskId)) {
    throw new CardActionError("invalid-automation-task-id", "hubAutomationTaskId 格式不合法");
  }
  return { projectSlug, taskId, hubAutomationTaskId };
}

function toResult(
  card: { id: string; column: string; autoRun: boolean; approvedById: string | null },
  created: boolean,
): HubCardResult {
  return {
    cardId: card.id,
    column: card.column,
    approved: card.autoRun || card.approvedById !== null,
    created,
  };
}

/**
 * Hub 建卡：未放行（autoRun false）、必經待確認（reviewGate true），
 * 以 (projectId, hubAutomationTaskId) 冪等——重送回同一張卡且不新建。
 * 只儲存 runner request note；fileKey、snapshot、access code 一律不進看板。
 */
export async function createHubCard(
  db: PrismaClient,
  memberId: string,
  rawInput: HubCardInput,
): Promise<HubCardResult> {
  const input = requireHubInput(rawInput);
  const project = await db.project.upsert({
    where: { slug: input.projectSlug },
    update: {},
    create: { slug: input.projectSlug, displayName: input.projectSlug },
  });

  const existing = await db.card.findUnique({
    where: {
      projectId_hubAutomationTaskId: {
        projectId: project.id,
        hubAutomationTaskId: input.hubAutomationTaskId,
      },
    },
  });
  if (existing) return toResult(existing, false);

  try {
    const card = await db.$transaction(async (tx) => {
      const created = await tx.card.create({
        data: {
          projectId: project.id,
          taskId: input.taskId,
          column: "CLAIMABLE",
          origin: "DESIGN_AUTOMATION_HUB",
          autoRun: false, // 外部觸發需人工放行，避免一次燒光團隊額度
          reviewGate: true, // 任務鏈的 requiresReview 不適用：cleanup 完成只到 plan-ready
          note: rawInput.note,
          hubAutomationTaskId: input.hubAutomationTaskId,
          createdById: memberId,
        },
      });
      await tx.cardEvent.create({
        data: {
          cardId: created.id,
          event: "HUB_CARD_CREATED",
          fromColumn: "CLAIMABLE",
          toColumn: "CLAIMABLE",
          actorType: "hub",
          actorId: memberId,
        },
      });
      return created;
    });
    return toResult(card, true);
  } catch (error) {
    // 併發建卡：唯一索引擋下後者，回讀既有卡片維持冪等
    if ((error as { code?: string }).code === "P2002") {
      const raced = await db.card.findUnique({
        where: {
          projectId_hubAutomationTaskId: {
            projectId: project.id,
            hubAutomationTaskId: input.hubAutomationTaskId,
          },
        },
      });
      if (raced) return toResult(raced, false);
    }
    throw error;
  }
}

export type HubCardStatus = {
  cardId: string;
  column: string;
  approved: boolean;
  attentionReason: string | null;
};

/**
 * Hub 讀卡片狀態：只回欄位、是否放行、需要處理原因——
 * note、log、歷史細節一律不回，Coordinator 只需要這三件事來說明 Plugin 文案。
 */
export async function getHubCardStatus(db: PrismaClient, cardId: string): Promise<HubCardStatus> {
  const card = await db.card.findUnique({ where: { id: cardId } });
  if (!card || card.hubAutomationTaskId === null) {
    throw new CardActionError("not-found", "卡片不存在或不是 Hub 派工卡");
  }
  return {
    cardId: card.id,
    column: card.column,
    approved: card.autoRun || card.approvedById !== null,
    attentionReason: card.attentionReason,
  };
}

export type HubOutcome = "applied" | "failed";

export type HubOutcomeResult = {
  applied: boolean; // 是否真的移動了卡片
  column: string;
  reason?: string;
};

/**
 * Hub 回寫 Plugin 的 apply 結果。只有卡片正好在待確認時才移動卡片：
 * 成員已在看板批准結案（或已重跑帶走）時只寫一筆歷史，封閉狀態機不因容錯開後門。
 */
export async function recordHubOutcome(
  db: PrismaClient,
  memberId: string,
  cardId: string,
  outcome: HubOutcome,
  errorCode?: string,
): Promise<HubOutcomeResult> {
  if (outcome !== "applied" && outcome !== "failed") {
    throw new CardActionError("invalid-outcome", "outcome 必須是 applied 或 failed");
  }
  const card = await db.card.findUnique({ where: { id: cardId } });
  if (!card || card.hubAutomationTaskId === null) {
    throw new CardActionError("not-found", "卡片不存在或不是 Hub 派工卡");
  }
  const event = outcome === "applied" ? "HUB_APPLY_COMPLETED" : "HUB_APPLY_FAILED";
  const note = outcome === "failed" ? errorCode : undefined;

  if (card.column !== "AWAITING_REVIEW") {
    await db.cardEvent.create({
      data: {
        cardId: card.id,
        event,
        fromColumn: card.column,
        toColumn: card.column, // 不移動卡片：只留下 Hub 說了什麼
        actorType: "hub",
        actorId: memberId,
        note,
      },
    });
    return { applied: false, column: card.column, reason: "not-awaiting-review" };
  }

  const updated = await db.$transaction(async (tx) => {
    const moved = await applyCardEvent(tx, card.id, event, { type: "hub", id: memberId }, { note });
    // 進入完成欄同樣觸發流水線接棒，與成員在看板批准結案的路徑一致
    if (moved.column === "DONE") await maybeCreateSuccessorCard(tx, card.id);
    return moved;
  });
  return { applied: true, column: updated.column };
}
