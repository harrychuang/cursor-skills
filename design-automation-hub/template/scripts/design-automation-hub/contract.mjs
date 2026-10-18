import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const SNAPSHOT_MAX_BYTES = 1024 * 1024;
export const SNAPSHOT_MAX_NODES = 500;
export const PLAN_MAX_OPERATIONS = 100;
export const SCOPE_TYPES = Object.freeze(["SECTION", "FRAME", "COMPONENT", "COMPONENT_SET"]);

const SCOPE_TYPE_SET = new Set(SCOPE_TYPES);
const INPUT_KEYS = new Set([
  "schemaVersion",
  "taskType",
  "automationTaskId",
  "projectId",
  "fileKey",
  "scope",
  "snapshot",
  "inputSnapshotHash",
]);
const SCOPE_KEYS = new Set(["nodeId", "type", "name"]);
const SNAPSHOT_KEYS = new Set(["schemaVersion", "scope", "nodes"]);
const NODE_KEYS = new Set([
  "id",
  "type",
  "name",
  "parentId",
  "index",
  "visible",
  "locked",
  "childIds",
  "absoluteBounds",
]);
const BOUNDS_KEYS = new Set(["x", "y", "width", "height"]);
const PLAN_RESULT_KEYS = new Set([
  "schemaVersion",
  "taskType",
  "status",
  "automationTaskId",
  "inputSnapshotHash",
  "agentAutomationRunId",
  "summary",
  "operations",
]);
const BLOCKED_RESULT_KEYS = new Set([...PLAN_RESULT_KEYS, "failure"]);
const FAILURE_KEYS = new Set(["code", "message"]);
const OPERATION_KEYS = Object.freeze({
  "rename-node": new Set(["type", "operationId", "nodeId", "beforeName", "afterName", "reason"]),
  "reorder-node": new Set(["type", "operationId", "nodeId", "parentId", "beforeIndex", "afterIndex", "reason"]),
  "move-node": new Set([
    "type",
    "operationId",
    "nodeId",
    "fromParentId",
    "toParentId",
    "beforeIndex",
    "afterIndex",
    "beforeAbsoluteBounds",
    "reason",
  ]),
});
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SECRET_PATTERN = /(token|secret|password|credential|authorization|bearer|api.?key|private.?key|raw.?prompt|model.?output|runner.?argv|database.?path)/i;

export class DesignAutomationError extends Error {
  constructor(code, message, options = {}) {
    super(message);
    this.name = "DesignAutomationError";
    this.code = code;
    this.status = options.status ?? 422;
    this.retryable = Boolean(options.retryable);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        retryable: this.retryable,
      },
    };
  }
}

function fail(code, message, status = 422) {
  throw new DesignAutomationError(code, message, { status });
}

function plainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, allowed, code, label) {
  if (!plainObject(value)) fail(code, `${label} must be an object.`);
  const keys = Object.keys(value);
  if (keys.some((key) => !allowed.has(key)) || [...allowed].some((key) => !Object.hasOwn(value, key))) {
    fail(code, `${label} fields do not match schema version 1.`);
  }
}

function text(value, code, label) {
  if (typeof value !== "string" || value.trim() === "") fail(code, `${label} must be non-empty.`);
  return value.trim();
}

function safeIdentity(value, code, label) {
  const normalized = text(value, code, label);
  if (!SAFE_ID.test(normalized)) fail(code, `${label} contains unsupported characters.`);
  return normalized;
}

function integer(value, code, label) {
  if (!Number.isInteger(value) || value < 0) fail(code, `${label} must be a non-negative integer.`);
  return value;
}

function normalizeBounds(value) {
  exactKeys(value, BOUNDS_KEYS, "invalid-cleanup-snapshot", "absoluteBounds");
  const normalized = {};
  for (const key of ["x", "y", "width", "height"]) {
    if (typeof value[key] !== "number" || !Number.isFinite(value[key])) {
      fail("invalid-cleanup-snapshot", `absoluteBounds.${key} must be finite.`);
    }
    normalized[key] = value[key];
  }
  return normalized;
}

function normalizeScope(value) {
  exactKeys(value, SCOPE_KEYS, "invalid-cleanup-snapshot", "scope");
  const nodeId = safeIdentity(value.nodeId, "invalid-cleanup-snapshot", "scope.nodeId");
  const type = text(value.type, "invalid-cleanup-snapshot", "scope.type");
  if (!SCOPE_TYPE_SET.has(type)) fail("unsupported-cleanup-scope", "Cleanup scope type is not supported.");
  return { nodeId, type, name: typeof value.name === "string" ? value.name : "" };
}

function normalizeNode(value) {
  exactKeys(value, NODE_KEYS, "invalid-cleanup-snapshot", "snapshot node");
  const parentId = value.parentId === null
    ? null
    : safeIdentity(value.parentId, "invalid-cleanup-snapshot", "node.parentId");
  if (!Array.isArray(value.childIds)) fail("invalid-cleanup-snapshot", "node.childIds must be an array.");
  const childIds = value.childIds.map((childId) =>
    safeIdentity(childId, "invalid-cleanup-snapshot", "node.childIds[]"));
  if (new Set(childIds).size !== childIds.length) {
    fail("invalid-cleanup-snapshot", "node.childIds must be unique.");
  }
  if (typeof value.visible !== "boolean" || typeof value.locked !== "boolean") {
    fail("invalid-cleanup-snapshot", "node visibility and lock state must be boolean.");
  }
  return {
    id: safeIdentity(value.id, "invalid-cleanup-snapshot", "node.id"),
    type: text(value.type, "invalid-cleanup-snapshot", "node.type"),
    name: typeof value.name === "string" ? value.name : "",
    parentId,
    index: integer(value.index, "invalid-cleanup-snapshot", "node.index"),
    visible: value.visible,
    locked: value.locked,
    childIds,
    absoluteBounds: normalizeBounds(value.absoluteBounds),
  };
}

export function validateCleanupSnapshot(snapshot, expectedScope) {
  exactKeys(snapshot, SNAPSHOT_KEYS, "invalid-cleanup-snapshot", "snapshot");
  if (snapshot.schemaVersion !== 1) fail("invalid-cleanup-snapshot", "Unsupported snapshot schema.");
  const scope = normalizeScope(snapshot.scope);
  if (expectedScope && (scope.nodeId !== expectedScope.nodeId || scope.type !== expectedScope.type)) {
    fail("invalid-cleanup-snapshot", "Input scope and snapshot scope do not match.");
  }
  if (!Array.isArray(snapshot.nodes) || snapshot.nodes.length === 0) {
    fail("invalid-cleanup-snapshot", "Snapshot requires at least the scope node.");
  }
  if (snapshot.nodes.length > SNAPSHOT_MAX_NODES) {
    fail("cleanup-scope-too-large", `Cleanup scope exceeds ${SNAPSHOT_MAX_NODES} nodes.`, 413);
  }

  const normalizedNodes = snapshot.nodes.map(normalizeNode);
  const byId = new Map();
  for (const node of normalizedNodes) {
    if (byId.has(node.id)) fail("invalid-cleanup-snapshot", "Snapshot node ids must be unique.");
    byId.set(node.id, node);
  }
  const root = byId.get(scope.nodeId);
  if (!root || root.type !== scope.type) fail("invalid-cleanup-snapshot", "Snapshot root does not match scope.");
  for (const node of normalizedNodes) {
    if (node.id !== scope.nodeId && !byId.has(node.parentId)) {
      fail("invalid-cleanup-snapshot", "A non-root node parent escaped the scope.");
    }
    for (const childId of node.childIds) {
      const child = byId.get(childId);
      if (!child || child.parentId !== node.id) {
        fail("invalid-cleanup-snapshot", "Snapshot child references escaped their declared parent.");
      }
    }
  }

  const ordered = [];
  const visited = new Set();
  const visit = (nodeId) => {
    if (visited.has(nodeId)) fail("invalid-cleanup-snapshot", "Snapshot contains a cycle or duplicate child.");
    visited.add(nodeId);
    const node = byId.get(nodeId);
    ordered.push(node);
    for (const childId of node.childIds) visit(childId);
  };
  visit(scope.nodeId);
  if (visited.size !== normalizedNodes.length) {
    fail("invalid-cleanup-snapshot", "Snapshot contains nodes outside the scope tree.");
  }
  const normalized = { schemaVersion: 1, scope, nodes: ordered };
  if (Buffer.byteLength(JSON.stringify(normalized), "utf8") > SNAPSHOT_MAX_BYTES) {
    fail("cleanup-scope-too-large", "Cleanup snapshot exceeds 1 MiB.", 413);
  }
  return normalized;
}

export function canonicalCleanupSnapshotJson(snapshot, expectedScope) {
  return JSON.stringify(validateCleanupSnapshot(snapshot, expectedScope));
}

export function computeCleanupSnapshotHash(snapshot, expectedScope) {
  return `sha256:${crypto.createHash("sha256").update(canonicalCleanupSnapshotJson(snapshot, expectedScope)).digest("hex")}`;
}

export function validateCleanupInput(input) {
  exactKeys(input, INPUT_KEYS, "invalid-cleanup-input", "cleanup input");
  if (input.schemaVersion !== 1 || input.taskType !== "figma-cleanup") {
    fail("invalid-cleanup-input", "Unsupported cleanup input.");
  }
  const scope = normalizeScope(input.scope);
  const snapshot = validateCleanupSnapshot(input.snapshot, scope);
  const inputSnapshotHash = text(input.inputSnapshotHash, "invalid-cleanup-input", "inputSnapshotHash");
  if (!HASH_PATTERN.test(inputSnapshotHash) || computeCleanupSnapshotHash(snapshot, scope) !== inputSnapshotHash) {
    fail("invalid-cleanup-snapshot", "Snapshot hash does not match canonical content.");
  }
  return {
    schemaVersion: 1,
    taskType: "figma-cleanup",
    automationTaskId: safeIdentity(input.automationTaskId, "invalid-cleanup-input", "automationTaskId"),
    projectId: safeIdentity(input.projectId, "invalid-cleanup-input", "projectId"),
    fileKey: safeIdentity(input.fileKey, "invalid-cleanup-input", "fileKey"),
    scope,
    snapshot,
    inputSnapshotHash,
  };
}

function sameBounds(left, right) {
  if (!plainObject(left) || !plainObject(right)) return false;
  return ["x", "y", "width", "height"].every((key) =>
    typeof left[key] === "number" && Number.isFinite(left[key]) && left[key] === right[key])
    && Object.keys(left).length === 4;
}

function descendant(candidateId, nodeId, byId) {
  let cursor = byId.get(candidateId);
  while (cursor) {
    if (cursor.id === nodeId) return true;
    cursor = cursor.parentId ? byId.get(cursor.parentId) : null;
  }
  return false;
}

function hasRenameEvidence(operation, node, input) {
  if (!/(hierarchy|sibling|structure|階層|同層|兄弟|結構)/i.test(operation.reason)) return false;
  if (!/^(frame|group|component|instance|rectangle|text|section)?\s*\d*$/i.test(node.name.trim())) return true;
  const evidenceNames = [input.scope.name, ...input.snapshot.nodes.filter((entry) => entry.id !== node.id).map((entry) => entry.name)]
    .join(" ")
    .toLowerCase();
  const semanticTokens = operation.afterName.toLowerCase().split(/[^a-z0-9\u3400-\u9fff]+/u).filter((item) => item.length >= 2);
  return semanticTokens.length > 0 && semanticTokens.every((token) => evidenceNames.includes(token));
}

function validateOperation(operation, index, input, byId) {
  const type = text(operation?.type, "invalid-cleanup-operation", `operations[${index}].type`);
  const keys = OPERATION_KEYS[type];
  if (!keys) fail("invalid-cleanup-operation", "Unsupported cleanup operation.");
  exactKeys(operation, keys, "invalid-cleanup-operation", `operations[${index}]`);
  const operationId = safeIdentity(operation.operationId, "invalid-cleanup-operation", "operationId");
  const nodeId = safeIdentity(operation.nodeId, "invalid-cleanup-operation", "nodeId");
  const reason = text(operation.reason, "invalid-cleanup-operation", "reason");
  const node = byId.get(nodeId);
  if (!node) fail("invalid-cleanup-operation", "Operation target is outside the scope.");

  if (type === "rename-node") {
    const beforeName = text(operation.beforeName, "invalid-cleanup-operation", "beforeName");
    const afterName = text(operation.afterName, "invalid-cleanup-operation", "afterName");
    if (beforeName !== node.name || beforeName === afterName) {
      fail("invalid-cleanup-operation", "Rename precondition does not match snapshot.");
    }
    if (!hasRenameEvidence({ ...operation, reason, afterName }, node, input)) {
      fail("unsupported-cleanup-inference", "Rename is not supported by hierarchy or sibling evidence.");
    }
  } else if (type === "reorder-node") {
    const parentId = safeIdentity(operation.parentId, "invalid-cleanup-operation", "parentId");
    const beforeIndex = integer(operation.beforeIndex, "invalid-cleanup-operation", "beforeIndex");
    const afterIndex = integer(operation.afterIndex, "invalid-cleanup-operation", "afterIndex");
    const parent = byId.get(parentId);
    if (!parent || node.parentId !== parentId || node.index !== beforeIndex || afterIndex >= parent.childIds.length) {
      fail("invalid-cleanup-operation", "Reorder precondition does not match snapshot.");
    }
  } else {
    const fromParentId = safeIdentity(operation.fromParentId, "invalid-cleanup-operation", "fromParentId");
    const toParentId = safeIdentity(operation.toParentId, "invalid-cleanup-operation", "toParentId");
    const beforeIndex = integer(operation.beforeIndex, "invalid-cleanup-operation", "beforeIndex");
    const afterIndex = integer(operation.afterIndex, "invalid-cleanup-operation", "afterIndex");
    const fromParent = byId.get(fromParentId);
    const toParent = byId.get(toParentId);
    if (
      !fromParent
      || !toParent
      || node.parentId !== fromParentId
      || node.index !== beforeIndex
      || afterIndex > toParent.childIds.length
      || toParentId === nodeId
      || descendant(toParentId, nodeId, byId)
      || !sameBounds(operation.beforeAbsoluteBounds, node.absoluteBounds)
    ) fail("invalid-cleanup-operation", "Move precondition does not match snapshot.");
  }
  return { ...operation, operationId, nodeId, reason };
}

function scanSecretKeys(value) {
  if (Array.isArray(value)) return value.some(scanSecretKeys);
  if (!plainObject(value)) return false;
  return Object.entries(value).some(([key, child]) => SECRET_PATTERN.test(key) || scanSecretKeys(child));
}

export function validateCleanupResult(result, { input, expectedRunId } = {}) {
  if (scanSecretKeys(result)) fail("cleanup-result-secret-rejected", "Cleanup result contains forbidden secret-bearing fields.");
  if (!plainObject(result) || !["plan-ready", "blocked"].includes(result.status)) {
    fail("invalid-cleanup-result", "Unsupported cleanup result status.");
  }
  exactKeys(
    result,
    result.status === "blocked" ? BLOCKED_RESULT_KEYS : PLAN_RESULT_KEYS,
    "invalid-cleanup-result",
    "cleanup result",
  );
  if (result.schemaVersion !== 1 || result.taskType !== "figma-cleanup") {
    fail("invalid-cleanup-result", "Unsupported cleanup result schema.");
  }
  const validatedInput = validateCleanupInput(input);
  const automationTaskId = safeIdentity(result.automationTaskId, "invalid-cleanup-result", "automationTaskId");
  const inputSnapshotHash = text(result.inputSnapshotHash, "invalid-cleanup-result", "inputSnapshotHash");
  const agentAutomationRunId = safeIdentity(result.agentAutomationRunId, "invalid-cleanup-result", "agentAutomationRunId");
  const summary = text(result.summary, "invalid-cleanup-result", "summary");
  if (
    automationTaskId !== validatedInput.automationTaskId
    || inputSnapshotHash !== validatedInput.inputSnapshotHash
    || (expectedRunId && agentAutomationRunId !== expectedRunId)
  ) fail("cleanup-result-identity-mismatch", "Cleanup result identity does not match input and generic run.");
  if (!Array.isArray(result.operations) || result.operations.length > PLAN_MAX_OPERATIONS) {
    fail("invalid-cleanup-operation", `Cleanup result exceeds ${PLAN_MAX_OPERATIONS} operations.`);
  }

  if (result.status === "blocked") {
    exactKeys(result.failure, FAILURE_KEYS, "invalid-cleanup-result", "failure");
    text(result.failure.code, "invalid-cleanup-result", "failure.code");
    text(result.failure.message, "invalid-cleanup-result", "failure.message");
    if (result.operations.length !== 0) fail("invalid-cleanup-operation", "Blocked results cannot expose operations.");
    return { ...result, summary, operations: [] };
  }

  const byId = new Map(validatedInput.snapshot.nodes.map((node) => [node.id, node]));
  const operations = result.operations.map((operation, index) =>
    validateOperation(operation, index, validatedInput, byId));
  const ids = operations.map((operation) => operation.operationId);
  if (new Set(ids).size !== ids.length) fail("invalid-cleanup-operation", "Operation ids must be unique.");
  return { ...result, summary, operations };
}

export function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function readJsonFile(filePath, { maxBytes = SNAPSHOT_MAX_BYTES, code = "invalid-json-file" } = {}) {
  if (fs.lstatSync(filePath).isSymbolicLink()) fail(code, "Symlink artifacts are not allowed.");
  const stats = fs.statSync(filePath);
  if (!stats.isFile() || stats.size > maxBytes) fail(code, "JSON artifact is missing or oversized.");
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    fail(code, "JSON artifact is malformed.");
  }
}

export function findCleanupResultForRun(projectRoot, runId) {
  const runtimeRoot = path.join(projectRoot, ".design-automation", "runtime");
  if (!fs.existsSync(runtimeRoot)) fail("missing-cleanup-result", "Cleanup runtime directory is missing.");
  if (!isInside(fs.realpathSync(projectRoot), fs.realpathSync(runtimeRoot))) {
    fail("unsafe-cleanup-result-path", "Cleanup runtime directory escaped the project root.");
  }
  const candidates = [];
  for (const entry of fs.readdirSync(runtimeRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
    const directory = path.join(runtimeRoot, entry.name);
    const inputPath = path.join(directory, "input.json");
    const resultPath = path.join(directory, "result.json");
    if (!fs.existsSync(inputPath) || !fs.existsSync(resultPath)) continue;
    const result = readJsonFile(resultPath, { code: "invalid-cleanup-result" });
    if (result.agentAutomationRunId === runId) candidates.push({ directory, inputPath, resultPath, result });
  }
  if (candidates.length === 0) fail("missing-cleanup-result", "No cleanup result exists for the generic run.");
  if (candidates.length > 1) fail("duplicate-cleanup-run-result", "More than one cleanup result claims the generic run.");
  const candidate = candidates[0];
  if (!isInside(fs.realpathSync(runtimeRoot), fs.realpathSync(candidate.directory))) {
    fail("unsafe-cleanup-result-path", "Cleanup result escaped the runtime root.");
  }
  const input = readJsonFile(candidate.inputPath, { code: "invalid-cleanup-input" });
  return {
    ...candidate,
    input: validateCleanupInput(input),
    result: validateCleanupResult(candidate.result, { input, expectedRunId: runId }),
  };
}
