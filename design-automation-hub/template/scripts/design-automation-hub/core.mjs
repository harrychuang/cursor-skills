import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  computeCleanupSnapshotHash,
  DesignAutomationError,
  validateCleanupSnapshot,
} from "./contract.mjs";
import { runGenericCleanup } from "./agent-runner.mjs";
import { JsonTaskStore } from "./store.mjs";

const TRANSITIONS = new Map([
  ["queued", new Set(["analyzing", "blocked"])],
  ["analyzing", new Set(["plan-ready", "blocked"])],
  ["plan-ready", new Set(["applying", "blocked", "stale"])],
  ["applying", new Set(["completed", "blocked", "stale"])],
  ["blocked", new Set()],
  ["stale", new Set()],
  ["completed", new Set()],
]);
const CREDENTIAL_PATTERN = /(token|secret|password|credential|authorization|bearer|api.?key|private.?key)/i;

function fail(code, message, status = 422) {
  throw new DesignAutomationError(code, message, { status });
}

function requiredText(value, code, label) {
  if (typeof value !== "string" || value.trim() === "") fail(code, `${label} is required.`);
  return value.trim();
}

function safeProfileObject(value, trail = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => safeProfileObject(item, [...trail, String(index)]));
    return;
  }
  if (!value || typeof value !== "object") {
    if (typeof value === "string" && CREDENTIAL_PATTERN.test(value)) {
      fail("unsafe-project-profile", "Project profile contains a credential-like value.");
    }
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (CREDENTIAL_PATTERN.test(key)) fail("unsafe-project-profile", "Project profile contains a credential-like key.");
    safeProfileObject(child, [...trail, key]);
  }
}

export function validateProjectProfile(profile) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile) || profile.schemaVersion !== 1) {
    fail("invalid-project-profile", "Project profile schemaVersion must be 1.");
  }
  safeProfileObject(profile);
  const project = profile.project;
  const host = profile.host;
  const features = profile.features;
  const id = requiredText(project?.id, "invalid-project-profile", "project.id");
  const displayName = requiredText(project?.displayName, "invalid-project-profile", "project.displayName");
  if (!Array.isArray(project?.figmaFileKeys) || project.figmaFileKeys.length === 0) {
    fail("invalid-project-profile", "At least one Figma file key is required.");
  }
  const figmaFileKeys = project.figmaFileKeys.map((item) =>
    requiredText(item, "invalid-project-profile", "figmaFileKeys[]"));
  if (new Set(figmaFileKeys).size !== figmaFileKeys.length) {
    fail("invalid-project-profile", "Figma file keys must be unique.");
  }
  if (!["standalone", "compatible"].includes(host?.mode)) {
    fail("invalid-project-profile", "Host mode must be standalone or compatible.");
  }
  const adapter = host.adapter === null ? null : requiredText(host.adapter, "invalid-project-profile", "host.adapter");
  if (host.mode === "standalone" && adapter !== null) {
    fail("invalid-project-profile", "Standalone profile cannot name a host adapter.");
  }
  if (
    !features
    || features.cleanup !== true
    || features.workflowStatus !== true
    || typeof features.review !== "boolean"
    || (host.mode === "standalone" && features.review)
  ) fail("invalid-project-profile", "Feature flags do not match host mode.");
  return {
    ...profile,
    project: { ...project, id, displayName, figmaFileKeys },
    host: { ...host, adapter },
    features: { ...features },
  };
}

export function loadProjectProfile(projectRoot) {
  const profilePath = path.join(fs.realpathSync(projectRoot), ".design-automation", "project.json");
  if (!fs.existsSync(profilePath) || fs.lstatSync(profilePath).isSymbolicLink()) {
    fail("invalid-project-profile", "Installed project profile is missing.");
  }
  return validateProjectProfile(JSON.parse(fs.readFileSync(profilePath, "utf8")));
}

function summary(task) {
  const operations = task.plan?.operations || [];
  return {
    id: task.id,
    taskType: task.taskType,
    scopeNodeId: task.scope.nodeId,
    scopeName: task.scope.name,
    status: task.status,
    revision: task.revision,
    operationCounts: {
      rename: operations.filter((item) => item.type === "rename-node").length,
      reorder: operations.filter((item) => item.type === "reorder-node").length,
      move: operations.filter((item) => item.type === "move-node").length,
      total: operations.length,
    },
    requesterDisplayName: task.requestedByDisplayName,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

function detail(task) {
  return {
    ...summary(task),
    plan: task.plan ? JSON.parse(JSON.stringify(task.plan)) : null,
    failure: task.failure ? JSON.parse(JSON.stringify(task.failure)) : null,
  };
}

export class DesignAutomationHubCore {
  constructor({ projectRoot = process.cwd(), store, runCleanup = runGenericCleanup } = {}) {
    this.projectRoot = fs.realpathSync(projectRoot);
    this.profile = loadProjectProfile(this.projectRoot);
    this.store = store || new JsonTaskStore({ projectRoot: this.projectRoot });
    this.runCleanup = runCleanup;
  }

  pluginContext({ fileKey, member } = {}) {
    const normalizedFileKey = requiredText(fileKey, "missing-file-key", "fileKey");
    if (!this.profile.project.figmaFileKeys.includes(normalizedFileKey)) {
      fail("unsupported-project", "This Figma file is not bound to the installed project.", 404);
    }
    if (!member?.id) fail("unauthorized", "Member is not authenticated.", 401);
    const roles = Array.isArray(member.roles) ? member.roles : [];
    const canReview = this.profile.features.review && roles.some((role) => role === "reviewer" || role === "operator");
    return {
      project: {
        id: this.profile.project.id,
        displayName: this.profile.project.displayName,
      },
      member: {
        id: member.id,
        displayName: member.displayName || member.id,
      },
      features: {
        cleanup: true,
        review: canReview,
        workflowStatus: true,
      },
      permissions: {
        createTask: true,
        applyTask: true,
        review: canReview,
      },
    };
  }

  transition(task, nextStatus, changes = {}) {
    if (!TRANSITIONS.get(task.status)?.has(nextStatus)) {
      fail("invalid-task-status-transition", `Cannot transition ${task.status} to ${nextStatus}.`, 409);
    }
    return this.store.compareAndSwap(task.id, task.revision, {
      ...changes,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    });
  }

  createTask({ member, input } = {}) {
    const projectContext = this.pluginContext({ fileKey: input?.fileKey, member });
    if (input?.taskType !== "figma-cleanup") fail("unsupported-task-type", "Only figma-cleanup is supported.");
    const scope = input.scope;
    const snapshot = validateCleanupSnapshot(input.snapshot, scope);
    const inputSnapshotHash = requiredText(input.inputSnapshotHash, "invalid-cleanup-snapshot", "inputSnapshotHash");
    if (computeCleanupSnapshotHash(snapshot, scope) !== inputSnapshotHash) {
      fail("invalid-cleanup-snapshot", "Snapshot hash does not match content.");
    }
    const idempotencyKey = requiredText(input.idempotencyKey, "invalid-idempotency-key", "idempotencyKey");
    const existing = this.store.findByIdempotency({
      projectId: projectContext.project.id,
      fileKey: input.fileKey,
      requestedBy: member.id,
      idempotencyKey,
    });
    if (existing) {
      if (existing.inputSnapshotHash !== inputSnapshotHash) {
        fail("idempotency-conflict", "Idempotency key already belongs to another snapshot.", 409);
      }
      return { task: summary(existing), created: false };
    }
    const timestamp = new Date().toISOString();
    const task = this.store.create({
      id: crypto.randomUUID(),
      taskType: "figma-cleanup",
      projectId: projectContext.project.id,
      fileKey: input.fileKey,
      requestedBy: member.id,
      requestedByDisplayName: member.displayName || member.id,
      idempotencyKey,
      scope,
      snapshot,
      inputSnapshotHash,
      status: "queued",
      revision: 0,
      plan: null,
      failure: null,
      genericRunId: null,
      selectedOperationIds: [],
      proof: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    return { task: summary(task), created: true };
  }

  taskIdentity(taskId) {
    const task = this.store.get(taskId);
    if (!task) fail("unknown-automation-task", "Automation task was not found.", 404);
    return { projectId: task.projectId, fileKey: task.fileKey };
  }

  taskDetail({ member, taskId } = {}) {
    const task = this.store.get(taskId);
    if (!task) fail("unknown-automation-task", "Automation task was not found.", 404);
    this.pluginContext({ fileKey: task.fileKey, member });
    return detail(task);
  }

  listTasks({ member, fileKey } = {}) {
    const projectContext = this.pluginContext({ fileKey, member });
    return {
      items: this.store.list({ projectId: projectContext.project.id, fileKey }).map(summary),
    };
  }

  async analyzeTask(taskId) {
    const queued = this.store.get(taskId);
    if (!queued) fail("unknown-automation-task", "Automation task was not found.", 404);
    if (queued.status !== "queued") return detail(queued);
    let analyzing = this.transition(queued, "analyzing");
    try {
      const analyzed = await this.runCleanup({ projectRoot: this.projectRoot, task: analyzing });
      analyzing = this.store.get(taskId);
      const ready = this.transition(analyzing, "plan-ready", {
        plan: analyzed.plan,
        genericRunId: analyzed.runSummary.runId,
        failure: null,
      });
      return detail(ready);
    } catch (error) {
      analyzing = this.store.get(taskId);
      const code = [
        "automation-runtime-unavailable",
        "cleanup-analysis-failed",
        "invalid-cleanup-result",
        "invalid-cleanup-operation",
      ].includes(error?.code) ? error.code : "cleanup-analysis-failed";
      const blocked = this.transition(analyzing, "blocked", {
        plan: null,
        genericRunId: null,
        failure: {
          code,
          message: code === "automation-runtime-unavailable"
            ? "Automation runtime is not ready."
            : "Cleanup analysis did not produce a safe plan.",
          retryable: code !== "invalid-cleanup-operation",
        },
      });
      return detail(blocked);
    }
  }

  applyIntent({ member, taskId, revision, inputSnapshotHash, operationIds } = {}) {
    const task = this.store.get(taskId);
    if (!task) fail("unknown-automation-task", "Automation task was not found.", 404);
    this.pluginContext({ fileKey: task.fileKey, member });
    if (task.revision !== revision) fail("stale-task-revision", "Task revision changed.", 409);
    if (task.status !== "plan-ready" || !task.plan) fail("invalid-task-status-transition", "Task is not ready to apply.", 409);
    if (inputSnapshotHash !== task.inputSnapshotHash) {
      this.transition(task, "stale", {
        failure: { code: "stale-plan", message: "The Figma snapshot changed.", retryable: false },
      });
      fail("stale-plan", "The Figma snapshot changed.", 409);
    }
    if (!Array.isArray(operationIds) || operationIds.length === 0 || new Set(operationIds).size !== operationIds.length) {
      fail("invalid-operation-selection", "Select one or more unique operations.");
    }
    const byId = new Map(task.plan.operations.map((operation) => [operation.operationId, operation]));
    if (operationIds.some((id) => !byId.has(id))) fail("invalid-operation-selection", "Unknown operation selected.");
    const applying = this.transition(task, "applying", { selectedOperationIds: [...operationIds] });
    return { task: summary(applying), operations: operationIds.map((id) => ({ ...byId.get(id) })) };
  }

  completeTask({ member, taskId, revision, proof } = {}) {
    const task = this.store.get(taskId);
    if (!task) fail("unknown-automation-task", "Automation task was not found.", 404);
    this.pluginContext({ fileKey: task.fileKey, member });
    if (task.revision !== revision || task.status !== "applying") {
      fail("invalid-task-status-transition", "Task is not applying.", 409);
    }
    if (
      proof?.taskId !== task.id
      || proof.projectId !== task.projectId
      || proof.fileKey !== task.fileKey
      || proof.scopeNodeId !== task.scope.nodeId
      || proof.taskType !== task.taskType
      || proof.inputSnapshotHash !== task.inputSnapshotHash
      || !Array.isArray(proof.selectedOperationIds)
      || proof.selectedOperationIds.length !== task.selectedOperationIds.length
      || proof.selectedOperationIds.some((id) => !task.selectedOperationIds.includes(id))
      || !Array.isArray(proof.outcomes)
      || proof.outcomes.length !== task.selectedOperationIds.length
    ) fail("invalid-task-completion-proof", "Completion proof does not match apply intent.");
    return summary(this.transition(task, "completed", { proof, failure: null }));
  }

  failTask({ member, taskId, revision, errorCode, rolledBack, affectedNodeIds } = {}) {
    const task = this.store.get(taskId);
    if (!task) fail("unknown-automation-task", "Automation task was not found.", 404);
    this.pluginContext({ fileKey: task.fileKey, member });
    if (task.revision !== revision || !["plan-ready", "applying"].includes(task.status)) {
      fail("invalid-task-status-transition", "Task cannot record this failure.", 409);
    }
    const code = requiredText(errorCode, "invalid-task-failure", "errorCode");
    const affected = Array.isArray(affectedNodeIds) ? affectedNodeIds : [];
    const nextStatus = code === "stale-plan" ? "stale" : "blocked";
    return detail(this.transition(task, nextStatus, {
      failure: {
        code,
        message: rolledBack ? "Apply failed and changes were rolled back." : "Apply needs attention.",
        retryable: false,
        rollback: rolledBack ? "complete" : "not-run",
        affectedNodeIds: affected,
      },
    }));
  }
}
