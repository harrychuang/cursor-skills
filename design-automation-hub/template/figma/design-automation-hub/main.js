var DEFAULT_COORDINATOR_URL = "http://localhost:8787";
var COORDINATOR_URL_STORAGE_KEY = "coordinatorUrl";

figma.showUI(__html__, { height: 640, themeColors: true, width: 380 });

function postPluginMessage(message) {
  figma.ui.postMessage(message);
}

function currentPluginContext(coordinatorUrl) {
  var fileKey = typeof figma.fileKey === "string" && figma.fileKey ? figma.fileKey : null;
  var pluginId = typeof figma.pluginId === "string" && figma.pluginId
    ? figma.pluginId
    : "design-automation-hub";
  var currentUserDisplayName = figma.currentUser && typeof figma.currentUser.name === "string"
    ? figma.currentUser.name
    : null;
  return {
    type: "plugin-context",
    fileKey: fileKey,
    pluginId: pluginId,
    currentUserDisplayName: currentUserDisplayName,
    coordinatorUrl: coordinatorUrl,
    errorCode: fileKey ? null : "file-key-unavailable",
  };
}

async function loadCoordinatorUrl() {
  try {
    var saved = await figma.clientStorage.getAsync(COORDINATOR_URL_STORAGE_KEY);
    return saved === DEFAULT_COORDINATOR_URL ? saved : DEFAULT_COORDINATOR_URL;
  } catch (error) {
    return DEFAULT_COORDINATOR_URL;
  }
}

async function saveCoordinatorUrl(value) {
  if (value !== DEFAULT_COORDINATOR_URL) {
    postPluginMessage({ type: "settings-result", ok: false, errorCode: "invalid-coordinator-url" });
    return;
  }
  try {
    await figma.clientStorage.setAsync(COORDINATOR_URL_STORAGE_KEY, value);
    postPluginMessage({ type: "settings-result", ok: true, coordinatorUrl: value });
  } catch (error) {
    postPluginMessage({ type: "settings-result", ok: false, errorCode: "settings-save-failed" });
  }
}

function findParentPage(node) {
  var current = node;
  while (current && current.type !== "PAGE" && current.type !== "DOCUMENT") {
    current = current.parent;
  }
  return current && current.type === "PAGE" ? current : null;
}

var CLEANUP_SCOPE_TYPES = ["SECTION", "FRAME", "COMPONENT", "COMPONENT_SET"];
var CLEANUP_SNAPSHOT_MAX_NODES = 500;
var CLEANUP_SNAPSHOT_MAX_BYTES = 1024 * 1024;

function utf8Bytes(value) {
  var bytes = [];
  for (var index = 0; index < value.length; index += 1) {
    var code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff && index + 1 < value.length) {
      var next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
        index += 1;
      }
    }
    if (code <= 0x7f) bytes.push(code);
    else if (code <= 0x7ff) {
      bytes.push(0xc0 | (code >>> 6), 0x80 | (code & 0x3f));
    } else if (code <= 0xffff) {
      bytes.push(0xe0 | (code >>> 12), 0x80 | ((code >>> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xf0 | (code >>> 18),
        0x80 | ((code >>> 12) & 0x3f),
        0x80 | ((code >>> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return bytes;
}

function sha256Hex(value) {
  var constants = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  var hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  var bytes = utf8Bytes(value);
  var bitLength = bytes.length * 8;
  bytes.push(0x80);
  while ((bytes.length % 64) !== 56) bytes.push(0);
  for (var highShift = 24; highShift >= 0; highShift -= 8) bytes.push(0);
  for (var lowShift = 24; lowShift >= 0; lowShift -= 8) bytes.push((bitLength >>> lowShift) & 0xff);

  for (var offset = 0; offset < bytes.length; offset += 64) {
    var words = [];
    var wordIndex;
    for (wordIndex = 0; wordIndex < 16; wordIndex += 1) {
      var byteIndex = offset + wordIndex * 4;
      words[wordIndex] = (
        (bytes[byteIndex] << 24)
        | (bytes[byteIndex + 1] << 16)
        | (bytes[byteIndex + 2] << 8)
        | bytes[byteIndex + 3]
      ) >>> 0;
    }
    for (wordIndex = 16; wordIndex < 64; wordIndex += 1) {
      var w15 = words[wordIndex - 15];
      var w2 = words[wordIndex - 2];
      var sigma0 = ((w15 >>> 7) | (w15 << 25)) ^ ((w15 >>> 18) | (w15 << 14)) ^ (w15 >>> 3);
      var sigma1 = ((w2 >>> 17) | (w2 << 15)) ^ ((w2 >>> 19) | (w2 << 13)) ^ (w2 >>> 10);
      words[wordIndex] = (words[wordIndex - 16] + sigma0 + words[wordIndex - 7] + sigma1) >>> 0;
    }

    var a = hash[0];
    var b = hash[1];
    var c = hash[2];
    var d = hash[3];
    var e = hash[4];
    var f = hash[5];
    var g = hash[6];
    var h = hash[7];
    for (wordIndex = 0; wordIndex < 64; wordIndex += 1) {
      var sum1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      var choice = (e & f) ^ ((~e) & g);
      var temp1 = (h + sum1 + choice + constants[wordIndex] + words[wordIndex]) >>> 0;
      var sum0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      var majority = (a & b) ^ (a & c) ^ (b & c);
      var temp2 = (sum0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    hash[0] = (hash[0] + a) >>> 0;
    hash[1] = (hash[1] + b) >>> 0;
    hash[2] = (hash[2] + c) >>> 0;
    hash[3] = (hash[3] + d) >>> 0;
    hash[4] = (hash[4] + e) >>> 0;
    hash[5] = (hash[5] + f) >>> 0;
    hash[6] = (hash[6] + g) >>> 0;
    hash[7] = (hash[7] + h) >>> 0;
  }
  return hash.map(function (word) { return ("00000000" + word.toString(16)).slice(-8); }).join("");
}

function cleanupNodeIndex(node) {
  var siblings = node.parent && node.parent.children;
  if (!siblings || typeof siblings.length !== "number") return -1;
  for (var index = 0; index < siblings.length; index += 1) {
    if (siblings[index] && siblings[index].id === node.id) return index;
  }
  return -1;
}

function cleanupAbsoluteBounds(node) {
  var bounds = node.absoluteBoundingBox || node.absoluteBounds;
  if (!bounds) throw { code: "invalid-cleanup-snapshot" };
  return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
}

function captureCleanupSnapshot(root) {
  var nodes = [];
  function visit(node) {
    if (nodes.length >= CLEANUP_SNAPSHOT_MAX_NODES) throw { code: "cleanup-scope-too-large" };
    var children = node.children && typeof node.children.length === "number" ? Array.prototype.slice.call(node.children) : [];
    nodes.push({
      id: node.id,
      type: node.type,
      name: typeof node.name === "string" ? node.name : "",
      parentId: node.parent && typeof node.parent.id === "string" ? node.parent.id : null,
      index: cleanupNodeIndex(node),
      visible: node.visible !== false,
      locked: node.locked === true,
      childIds: children.map(function (child) { return child.id; }),
      absoluteBounds: cleanupAbsoluteBounds(node),
    });
    children.forEach(visit);
  }
  visit(root);
  var snapshot = {
    schemaVersion: 1,
    scope: { nodeId: root.id, type: root.type, name: typeof root.name === "string" ? root.name : "" },
    nodes: nodes,
  };
  var serialized = JSON.stringify(snapshot);
  if (utf8Bytes(serialized).length > CLEANUP_SNAPSHOT_MAX_BYTES) throw { code: "cleanup-scope-too-large" };
  return {
    scope: { nodeId: root.id, type: root.type, name: snapshot.scope.name, nodeCount: nodes.length },
    snapshot: snapshot,
    inputSnapshotHash: "sha256:" + sha256Hex(serialized),
  };
}

var CLEANUP_BATCH_MAX = 10;
var CLEANUP_ERROR_SCOPE_REQUIRED = "cleanup-scope-required";
var CLEANUP_ERROR_OVERLAPPING_SCOPE = "overlapping-cleanup-scope";
var CLEANUP_ERROR_BATCH_TOO_LARGE = "cleanup-batch-too-large";
var CLEANUP_ERROR_UNSUPPORTED_SCOPE = "unsupported-cleanup-scope";
var CLEANUP_ERROR_UNRESOLVED_SCOPE = "stale-plan";

function cleanupScopeName(node) {
  return node && typeof node.name === "string" ? node.name : "";
}

function cleanupAncestorIds(node) {
  var ids = Object.create(null);
  var visited = Object.create(null);
  var current = node.parent;
  while (current && current.type !== "DOCUMENT" && current.type !== "PAGE") {
    if (visited[current.id]) break;
    visited[current.id] = true;
    ids[current.id] = true;
    current = current.parent;
  }
  return ids;
}

function cleanupScopesOverlap(nodes) {
  var seen = Object.create(null);
  var index;
  for (index = 0; index < nodes.length; index += 1) {
    if (seen[nodes[index].id]) return true;
    seen[nodes[index].id] = true;
  }
  for (index = 0; index < nodes.length; index += 1) {
    var ancestors = cleanupAncestorIds(nodes[index]);
    for (var otherIndex = 0; otherIndex < nodes.length; otherIndex += 1) {
      if (otherIndex !== index && ancestors[nodes[otherIndex].id]) return true;
    }
  }
  return false;
}

async function cleanupSourceEntries(nodeIds) {
  var entries = [];
  var index;
  if (!Array.isArray(nodeIds) || nodeIds.length === 0) {
    var selection = figma.currentPage && figma.currentPage.selection;
    var selected = selection ? Array.prototype.slice.call(selection) : [];
    for (index = 0; index < selected.length; index += 1) {
      entries.push({ nodeId: selected[index].id, node: selected[index] });
    }
    return entries;
  }
  for (index = 0; index < nodeIds.length; index += 1) {
    var nodeId = nodeIds[index];
    if (typeof nodeId !== "string" || !nodeId) continue;
    var node = null;
    try {
      node = await figma.getNodeByIdAsync(nodeId);
    } catch (error) {
      node = null;
    }
    if (node && (node.removed === true || node.type === "DOCUMENT" || node.type === "PAGE")) node = null;
    entries.push({ nodeId: nodeId, node: node });
  }
  return entries;
}

function postCleanupScopesFailure(errorCode, rejected) {
  postPluginMessage({
    type: "cleanup-scopes-result",
    ok: false,
    errorCode: errorCode,
    scopes: [],
    rejected: rejected || [],
  });
}

async function captureCleanupScopes(message) {
  var requestedIds = message && Array.isArray(message.nodeIds) ? message.nodeIds : null;
  var entries = await cleanupSourceEntries(requestedIds);
  var index;
  if (entries.length === 0) {
    postCleanupScopesFailure(CLEANUP_ERROR_SCOPE_REQUIRED);
    return;
  }
  if (entries.length > CLEANUP_BATCH_MAX) {
    postCleanupScopesFailure(CLEANUP_ERROR_BATCH_TOO_LARGE);
    return;
  }
  var resolved = [];
  for (index = 0; index < entries.length; index += 1) {
    if (entries[index].node) resolved.push(entries[index].node);
  }
  if (cleanupScopesOverlap(resolved)) {
    postCleanupScopesFailure(CLEANUP_ERROR_OVERLAPPING_SCOPE);
    return;
  }
  var scopes = [];
  var rejected = [];
  for (index = 0; index < entries.length; index += 1) {
    var nodeId = entries[index].nodeId;
    var node = entries[index].node;
    if (!node) {
      rejected.push({ nodeId: nodeId, name: "", errorCode: CLEANUP_ERROR_UNRESOLVED_SCOPE });
      continue;
    }
    if (CLEANUP_SCOPE_TYPES.indexOf(node.type) === -1) {
      rejected.push({ nodeId: nodeId, name: cleanupScopeName(node), errorCode: CLEANUP_ERROR_UNSUPPORTED_SCOPE });
      continue;
    }
    try {
      var captured = captureCleanupSnapshot(node);
      scopes.push({
        scope: captured.scope,
        snapshot: captured.snapshot,
        inputSnapshotHash: captured.inputSnapshotHash,
      });
    } catch (error) {
      rejected.push({
        nodeId: nodeId,
        name: cleanupScopeName(node),
        errorCode: error && error.code ? error.code : "invalid-cleanup-snapshot",
      });
    }
  }
  if (scopes.length === 0) {
    postCleanupScopesFailure(rejected[0].errorCode, rejected);
    return;
  }
  postPluginMessage({
    type: "cleanup-scopes-result",
    ok: true,
    scopes: scopes,
    rejected: rejected,
  });
}

var CLEANUP_OPERATION_MAX = 100;
var CLEANUP_OPERATION_KEYS = Object.create(null);
CLEANUP_OPERATION_KEYS["rename-node"] = ["type", "operationId", "nodeId", "beforeName", "afterName", "reason"];
CLEANUP_OPERATION_KEYS["reorder-node"] = [
  "type", "operationId", "nodeId", "parentId", "beforeIndex", "afterIndex", "reason",
];
CLEANUP_OPERATION_KEYS["move-node"] = [
  "type", "operationId", "nodeId", "fromParentId", "toParentId", "beforeIndex", "afterIndex",
  "beforeAbsoluteBounds", "reason",
];

function cleanupFailure(code) {
  throw { code: code };
}

function cleanupPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function cleanupExactKeys(value, allowed) {
  if (!cleanupPlainObject(value)) cleanupFailure("invalid-plan-operation");
  var keys = Object.keys(value).sort();
  var expected = allowed.slice().sort();
  if (keys.length !== expected.length) cleanupFailure("invalid-plan-operation");
  for (var index = 0; index < keys.length; index += 1) {
    if (keys[index] !== expected[index]) cleanupFailure("invalid-plan-operation");
  }
}

function cleanupRequiredText(value) {
  if (typeof value !== "string" || !value.trim()) cleanupFailure("invalid-plan-operation");
  return value;
}

function cleanupSnapshotHash(value) {
  if (typeof value !== "string" || !/^sha256:[a-f0-9]{64}$/.test(value)) {
    cleanupFailure("invalid-plan-operation");
  }
  return value;
}

function cleanupIndex(value) {
  if (!Number.isInteger(value) || value < 0) cleanupFailure("invalid-plan-operation");
  return value;
}

function cleanupSupportedNode(node) {
  return Boolean(
    node
    && node.removed !== true
    && typeof node.id === "string"
    && typeof node.type === "string"
    && node.type !== "DOCUMENT"
    && node.type !== "PAGE"
    && typeof node.name === "string"
  );
}

function cleanupContainerNode(node) {
  return cleanupSupportedNode(node)
    && node.children
    && typeof node.children.length === "number"
    && typeof node.insertChild === "function";
}

function cleanupWithinScope(node, scope) {
  var current = node;
  var visited = Object.create(null);
  while (current && current.type !== "DOCUMENT" && current.type !== "PAGE") {
    if (current.id === scope.id) return true;
    if (visited[current.id]) return false;
    visited[current.id] = true;
    current = current.parent;
  }
  return false;
}

function cleanupLockedWithinScope(node, scope) {
  var current = node;
  var visited = Object.create(null);
  while (current && current.type !== "DOCUMENT" && current.type !== "PAGE") {
    if (current.locked === true) return true;
    if (current.id === scope.id) return false;
    if (visited[current.id]) return true;
    visited[current.id] = true;
    current = current.parent;
  }
  return true;
}

function cleanupSameBounds(expected, node) {
  if (!cleanupPlainObject(expected) || Object.keys(expected).sort().join("|") !== "height|width|x|y") return false;
  var actual;
  try {
    actual = cleanupAbsoluteBounds(node);
  } catch (error) {
    return false;
  }
  return ["x", "y", "width", "height"].every(function (key) {
    return typeof expected[key] === "number" && Number.isFinite(expected[key]) && expected[key] === actual[key];
  });
}

function cleanupWouldCreateCycle(node, parent) {
  var current = parent;
  var visited = Object.create(null);
  while (current && current.type !== "DOCUMENT" && current.type !== "PAGE") {
    if (current.id === node.id) return true;
    if (visited[current.id]) return true;
    visited[current.id] = true;
    current = current.parent;
  }
  return false;
}

async function cleanupResolveNodes(nodeIds) {
  var pending = nodeIds.map(function (nodeId) {
    try {
      return Promise.resolve(figma.getNodeByIdAsync(nodeId)).then(function (node) {
        if (!node || node.removed === true) cleanupFailure("stale-plan");
        return { nodeId: nodeId, node: node };
      }, function () {
        cleanupFailure("stale-plan");
      });
    } catch (error) {
      cleanupFailure("stale-plan");
    }
  });
  var entries = await Promise.all(pending);
  var resolved = Object.create(null);
  entries.forEach(function (entry) { resolved[entry.nodeId] = entry.node; });
  return resolved;
}

function cleanupScopeNodeMap(scope) {
  var byId = Object.create(null);
  function visit(node) {
    if (!cleanupSupportedNode(node) || byId[node.id]) cleanupFailure("invalid-plan-operation");
    byId[node.id] = node;
    var children = node.children && typeof node.children.length === "number"
      ? Array.prototype.slice.call(node.children)
      : [];
    children.forEach(visit);
  }
  visit(scope);
  return byId;
}

function cleanupValidateScopedNode(node, scope, scopeNodes) {
  if (!cleanupSupportedNode(node) || scopeNodes[node.id] !== node || !cleanupWithinScope(node, scope)) {
    cleanupFailure("invalid-plan-operation");
  }
  if (cleanupLockedWithinScope(node, scope)) cleanupFailure("stale-plan");
}

function cleanupParsePlanMessage(message) {
  cleanupExactKeys(message, ["type", "requestId", "taskId", "scopeNodeId", "inputSnapshotHash", "operations"]);
  if (message.type !== "apply-cleanup-plan") cleanupFailure("invalid-plan-operation");
  var requestId = cleanupRequiredText(message.requestId);
  var taskId = cleanupRequiredText(message.taskId);
  var scopeNodeId = cleanupRequiredText(message.scopeNodeId);
  var inputSnapshotHash = cleanupSnapshotHash(message.inputSnapshotHash);
  if (!Array.isArray(message.operations) || message.operations.length === 0 || message.operations.length > CLEANUP_OPERATION_MAX) {
    cleanupFailure("invalid-plan-operation");
  }
  var operationIds = Object.create(null);
  var referencedIds = Object.create(null);
  var parsed = [];
  referencedIds[scopeNodeId] = true;
  for (var index = 0; index < message.operations.length; index += 1) {
    var operation = message.operations[index];
    if (
      !cleanupPlainObject(operation)
      || !Object.prototype.hasOwnProperty.call(CLEANUP_OPERATION_KEYS, operation.type)
    ) cleanupFailure("invalid-plan-operation");
    cleanupExactKeys(operation, CLEANUP_OPERATION_KEYS[operation.type]);
    var operationId = cleanupRequiredText(operation.operationId);
    var nodeId = cleanupRequiredText(operation.nodeId);
    cleanupRequiredText(operation.reason);
    if (operationIds[operationId]) cleanupFailure("invalid-plan-operation");
    operationIds[operationId] = true;
    referencedIds[nodeId] = true;

    if (operation.type === "rename-node") {
      var beforeName = cleanupRequiredText(operation.beforeName);
      var afterName = cleanupRequiredText(operation.afterName);
      if (beforeName === afterName) cleanupFailure("invalid-plan-operation");
      parsed.push({ operation: operation, operationId: operationId, nodeId: nodeId, type: operation.type });
      continue;
    }

    cleanupIndex(operation.beforeIndex);
    cleanupIndex(operation.afterIndex);

    if (operation.type === "reorder-node") {
      var parentId = cleanupRequiredText(operation.parentId);
      referencedIds[parentId] = true;
      parsed.push({
        operation: operation,
        operationId: operationId,
        nodeId: nodeId,
        parentId: parentId,
        type: operation.type,
      });
      continue;
    }

    var fromParentId = cleanupRequiredText(operation.fromParentId);
    var toParentId = cleanupRequiredText(operation.toParentId);
    if (fromParentId === toParentId) cleanupFailure("invalid-plan-operation");
    if (!cleanupSameBounds(operation.beforeAbsoluteBounds, { absoluteBoundingBox: operation.beforeAbsoluteBounds })) {
      cleanupFailure("invalid-plan-operation");
    }
    referencedIds[fromParentId] = true;
    referencedIds[toParentId] = true;
    parsed.push({
      operation: operation,
      operationId: operationId,
      nodeId: nodeId,
      fromParentId: fromParentId,
      toParentId: toParentId,
      type: operation.type,
    });
  }
  return {
    inputSnapshotHash: inputSnapshotHash,
    operations: parsed,
    referencedIds: Object.keys(referencedIds),
    requestId: requestId,
    scopeNodeId: scopeNodeId,
    taskId: taskId,
  };
}

function cleanupSnapshotState(snapshot) {
  var state = { children: Object.create(null), parent: Object.create(null) };
  snapshot.nodes.forEach(function (node) {
    state.children[node.id] = node.childIds.slice();
    state.parent[node.id] = node.parentId;
  });
  return state;
}

function cleanupSimulatedCycle(nodeId, parentId, state) {
  var currentId = parentId;
  var visited = Object.create(null);
  while (currentId) {
    if (currentId === nodeId || visited[currentId]) return true;
    visited[currentId] = true;
    currentId = state.parent[currentId];
  }
  return false;
}

function cleanupSimulateStructure(moves, reorders, snapshot) {
  var state = cleanupSnapshotState(snapshot);
  var expected = [];
  moves.forEach(function (entry) {
    var operation = entry.operation;
    if (cleanupSimulatedCycle(entry.node.id, entry.toParent.id, state)) cleanupFailure("invalid-plan-operation");
    var source = state.children[entry.fromParent.id];
    var destination = state.children[entry.toParent.id];
    var currentIndex = source ? source.indexOf(entry.node.id) : -1;
    if (currentIndex === -1 || !destination) cleanupFailure("invalid-plan-operation");
    source.splice(currentIndex, 1);
    if (operation.afterIndex > destination.length) cleanupFailure("invalid-plan-operation");
    destination.splice(operation.afterIndex, 0, entry.node.id);
    state.parent[entry.node.id] = entry.toParent.id;
    expected.push({ nodeId: entry.node.id, parentId: entry.toParent.id, index: operation.afterIndex });
  });
  reorders.forEach(function (entry) {
    var operation = entry.operation;
    var children = state.children[entry.parent.id];
    var currentIndex = children ? children.indexOf(entry.node.id) : -1;
    if (currentIndex === -1 || state.parent[entry.node.id] !== entry.parent.id) {
      cleanupFailure("invalid-plan-operation");
    }
    children.splice(currentIndex, 1);
    if (operation.afterIndex > children.length) cleanupFailure("invalid-plan-operation");
    children.splice(operation.afterIndex, 0, entry.node.id);
    expected.push({ nodeId: entry.node.id, parentId: entry.parent.id, index: operation.afterIndex });
  });
  expected.forEach(function (entry) {
    var children = state.children[entry.parentId];
    if (state.parent[entry.nodeId] !== entry.parentId || !children || children.indexOf(entry.nodeId) !== entry.index) {
      cleanupFailure("invalid-plan-operation");
    }
  });
}

async function preflightCleanupPlan(message) {
  var parsed = cleanupParsePlanMessage(message);
  var resolvedNodes = await cleanupResolveNodes(parsed.referencedIds);
  var scope = resolvedNodes[parsed.scopeNodeId];
  if (CLEANUP_SCOPE_TYPES.indexOf(scope.type) === -1 || !cleanupSupportedNode(scope)) cleanupFailure("stale-plan");
  if (cleanupLockedWithinScope(scope, scope)) cleanupFailure("stale-plan");

  var captured;
  try {
    captured = captureCleanupSnapshot(scope);
  } catch (error) {
    cleanupFailure("stale-plan");
  }
  if (captured.inputSnapshotHash !== parsed.inputSnapshotHash) cleanupFailure("stale-plan");
  var scopeNodes = cleanupScopeNodeMap(scope);
  var structuralTargets = Object.create(null);
  var renameTargets = Object.create(null);
  var destinationSlots = Object.create(null);
  var moves = [];
  var reorders = [];
  var renames = [];
  var resolved = [];

  parsed.operations.forEach(function (entry) {
    var operation = entry.operation;
    var node = resolvedNodes[entry.nodeId];
    cleanupValidateScopedNode(node, scope, scopeNodes);

    if (entry.type === "rename-node") {
      if (renameTargets[entry.nodeId]) cleanupFailure("invalid-plan-operation");
      if (node.name !== operation.beforeName) cleanupFailure("stale-plan");
      renameTargets[entry.nodeId] = true;
      var renameEntry = {
        operation: operation,
        node: node,
        beforeName: operation.beforeName,
      };
      renames.push(renameEntry);
      resolved.push(renameEntry);
      return;
    }

    if (structuralTargets[entry.nodeId]) cleanupFailure("invalid-plan-operation");
    structuralTargets[entry.nodeId] = true;
    var destinationParentId = entry.type === "reorder-node" ? entry.parentId : entry.toParentId;
    if (!destinationSlots[destinationParentId]) destinationSlots[destinationParentId] = Object.create(null);
    if (destinationSlots[destinationParentId][operation.afterIndex]) cleanupFailure("invalid-plan-operation");
    destinationSlots[destinationParentId][operation.afterIndex] = true;

    if (entry.type === "reorder-node") {
      var parent = resolvedNodes[entry.parentId];
      cleanupValidateScopedNode(parent, scope, scopeNodes);
      if (!cleanupContainerNode(parent)) cleanupFailure("invalid-plan-operation");
      if (!node.parent || node.parent.id !== entry.parentId || cleanupNodeIndex(node) !== operation.beforeIndex) {
        cleanupFailure("stale-plan");
      }
      if (operation.beforeIndex === operation.afterIndex || operation.afterIndex >= parent.children.length) {
        cleanupFailure("invalid-plan-operation");
      }
      var reorderEntry = {
        operation: operation,
        node: node,
        parent: parent,
        beforeIndex: operation.beforeIndex,
        beforeAbsoluteBounds: cleanupAbsoluteBounds(node),
      };
      reorders.push(reorderEntry);
      resolved.push(reorderEntry);
      return;
    }

    var fromParent = resolvedNodes[entry.fromParentId];
    var toParent = resolvedNodes[entry.toParentId];
    cleanupValidateScopedNode(fromParent, scope, scopeNodes);
    cleanupValidateScopedNode(toParent, scope, scopeNodes);
    if (
      !cleanupContainerNode(fromParent)
      || !cleanupContainerNode(toParent)
      || cleanupWouldCreateCycle(node, toParent)
    ) cleanupFailure("invalid-plan-operation");
    if (!node.parent || node.parent.id !== entry.fromParentId || cleanupNodeIndex(node) !== operation.beforeIndex) {
      cleanupFailure("stale-plan");
    }
    if (operation.afterIndex > toParent.children.length) cleanupFailure("invalid-plan-operation");
    if (!cleanupSameBounds(operation.beforeAbsoluteBounds, node)) cleanupFailure("stale-plan");
    var moveEntry = {
      operation: operation,
      node: node,
      fromParent: fromParent,
      toParent: toParent,
      beforeIndex: operation.beforeIndex,
      beforeAbsoluteBounds: cleanupAbsoluteBounds(node),
    };
    moves.push(moveEntry);
    resolved.push(moveEntry);
  });

  cleanupSimulateStructure(moves, reorders, captured.snapshot);
  return {
    captured: captured,
    inputSnapshotHash: parsed.inputSnapshotHash,
    moves: moves,
    operations: resolved,
    renames: renames,
    reorders: reorders,
    requestId: parsed.requestId,
    scope: scope,
    taskId: parsed.taskId,
  };
}

function cleanupReverseStep(entry, type) {
  return {
    type: type,
    node: entry.node,
    beforeName: entry.node.name,
    beforeParent: entry.node.parent,
    beforeIndex: cleanupNodeIndex(entry.node),
    beforeAbsoluteBounds: cleanupAbsoluteBounds(entry.node),
  };
}

function cleanupStepMatchesBefore(step) {
  if (!step.node || step.node.removed === true || step.node.name !== step.beforeName) return false;
  if (step.type === "rename-node") return true;
  return Boolean(
    step.beforeParent
    && step.node.parent === step.beforeParent
    && cleanupNodeIndex(step.node) === step.beforeIndex
    && cleanupSameBounds(step.beforeAbsoluteBounds, step.node)
  );
}

function cleanupVerifyForward(entry, type) {
  var operation = entry.operation;
  if (type === "rename-node") {
    if (entry.node.name !== operation.afterName) cleanupFailure("cleanup-apply-failed");
    return;
  }
  var expectedParent = type === "move-node" ? entry.toParent : entry.parent;
  if (
    entry.node.parent !== expectedParent
    || cleanupNodeIndex(entry.node) !== operation.afterIndex
    || !cleanupSameBounds(entry.beforeAbsoluteBounds || cleanupAbsoluteBounds(entry.node), entry.node)
  ) cleanupFailure("cleanup-apply-failed");
}

function cleanupInsertAtFinalIndex(parent, node, finalIndex) {
  var currentIndex = node.parent === parent ? cleanupNodeIndex(node) : -1;
  var insertionIndex = currentIndex !== -1 && currentIndex < finalIndex
    ? finalIndex + 1
    : finalIndex;
  parent.insertChild(insertionIndex, node);
}

function cleanupApplyForward(entry, type) {
  var operation = entry.operation;
  if (type === "move-node") cleanupInsertAtFinalIndex(entry.toParent, entry.node, operation.afterIndex);
  else if (type === "reorder-node") cleanupInsertAtFinalIndex(entry.parent, entry.node, operation.afterIndex);
  else entry.node.name = operation.afterName;
}

function cleanupApplyReverse(step) {
  if (cleanupStepMatchesBefore(step)) return;
  if (step.type === "rename-node") step.node.name = step.beforeName;
  else cleanupInsertAtFinalIndex(step.beforeParent, step.node, step.beforeIndex);
  if (!cleanupStepMatchesBefore(step)) cleanupFailure("cleanup-rollback-failed");
}

function cleanupVerifyFinalStructure(preflight) {
  preflight.moves.forEach(function (entry) {
    if (
      entry.node.parent !== entry.toParent
      || cleanupNodeIndex(entry.node) !== entry.operation.afterIndex
      || !cleanupSameBounds(entry.beforeAbsoluteBounds, entry.node)
    ) cleanupFailure("cleanup-apply-failed");
  });
  preflight.reorders.forEach(function (entry) {
    if (
      entry.node.parent !== entry.parent
      || cleanupNodeIndex(entry.node) !== entry.operation.afterIndex
      || !cleanupSameBounds(entry.beforeAbsoluteBounds, entry.node)
    ) cleanupFailure("cleanup-apply-failed");
  });
}

function cleanupCurrentNodeMap(scope) {
  try {
    return cleanupScopeNodeMap(scope);
  } catch (error) {
    return Object.create(null);
  }
}

function cleanupNodeDiffers(snapshotNode, currentNode) {
  if (!currentNode || currentNode.removed === true) return true;
  if (
    currentNode.name !== snapshotNode.name
    || !currentNode.parent
    || currentNode.parent.id !== snapshotNode.parentId
    || cleanupNodeIndex(currentNode) !== snapshotNode.index
  ) return true;
  return !cleanupSameBounds(snapshotNode.absoluteBounds, currentNode);
}

function cleanupSafeNodeName(node, fallback) {
  var name = node && typeof node.name === "string" ? node.name.trim() : "";
  return (name || fallback || "").slice(0, 200);
}

function cleanupAffectedNodes(preflight) {
  var currentById = cleanupCurrentNodeMap(preflight.scope);
  var operationNodes = Object.create(null);
  preflight.operations.forEach(function (entry) { operationNodes[entry.node.id] = entry.node; });
  var snapshotById = Object.create(null);
  var changed = Object.create(null);
  for (var index = 0; index < preflight.captured.snapshot.nodes.length; index += 1) {
    var snapshotNode = preflight.captured.snapshot.nodes[index];
    snapshotById[snapshotNode.id] = snapshotNode;
    var currentNode = currentById[snapshotNode.id] || operationNodes[snapshotNode.id] || null;
    if (cleanupNodeDiffers(snapshotNode, currentNode)) changed[snapshotNode.id] = currentNode;
  }
  var orderedIds = [];
  var included = Object.create(null);
  preflight.operations.forEach(function (entry) {
    if (changed[entry.node.id] !== undefined && !included[entry.node.id]) {
      included[entry.node.id] = true;
      orderedIds.push(entry.node.id);
    }
  });
  preflight.captured.snapshot.nodes.forEach(function (snapshotNode) {
    if (changed[snapshotNode.id] !== undefined && !included[snapshotNode.id]) {
      included[snapshotNode.id] = true;
      orderedIds.push(snapshotNode.id);
    }
  });
  var affected = orderedIds.slice(0, 100).map(function (nodeId) {
    return {
      nodeId: nodeId,
      name: cleanupSafeNodeName(changed[nodeId], snapshotById[nodeId].name),
    };
  });
  if (affected.length === 0 && preflight.operations.length > 0) {
    var fallback = preflight.operations[0].node;
    affected.push({ nodeId: fallback.id, name: cleanupSafeNodeName(fallback, "") });
  }
  return affected;
}

function executeCleanupPlan(preflight) {
  var completedSteps = [];
  var executionGroups = [
    { type: "move-node", entries: preflight.moves },
    { type: "reorder-node", entries: preflight.reorders },
    { type: "rename-node", entries: preflight.renames },
  ];
  try {
    executionGroups.forEach(function (group) {
      group.entries.forEach(function (entry) {
        var reverse = cleanupReverseStep(entry, group.type);
        try {
          cleanupApplyForward(entry, group.type);
        } catch (error) {
          if (!cleanupStepMatchesBefore(reverse)) completedSteps.push(reverse);
          throw error;
        }
        completedSteps.push(reverse);
        cleanupVerifyForward(entry, group.type);
      });
    });
    cleanupVerifyFinalStructure(preflight);
    var postApply = captureCleanupSnapshot(preflight.scope);
    if (postApply.inputSnapshotHash === preflight.inputSnapshotHash) cleanupFailure("cleanup-apply-failed");
    return {
      ok: true,
      postApplySnapshotHash: postApply.inputSnapshotHash,
      outcomes: preflight.operations.map(function (entry) {
        return { operationId: entry.operation.operationId, status: "applied" };
      }),
      appliedCount: preflight.operations.length,
      skippedCount: 0,
    };
  } catch (error) {
    var rollbackError = false;
    for (var reverseIndex = completedSteps.length - 1; reverseIndex >= 0; reverseIndex -= 1) {
      try {
        cleanupApplyReverse(completedSteps[reverseIndex]);
      } catch (rollbackFailure) {
        rollbackError = true;
      }
    }
    var restored = false;
    try {
      restored = captureCleanupSnapshot(preflight.scope).inputSnapshotHash === preflight.inputSnapshotHash;
    } catch (snapshotError) {
      restored = false;
    }
    if (restored) {
      return {
        ok: false,
        errorCode: "apply-rolled-back",
        documentChanged: false,
        rolledBack: true,
        affectedNodes: [],
      };
    }
    return {
      ok: false,
      errorCode: "partial-apply",
      documentChanged: true,
      rolledBack: false,
      affectedNodes: cleanupAffectedNodes(preflight),
    };
  }
}

async function revalidateCleanupScope(message) {
  var requestId = message && typeof message.requestId === "string" ? message.requestId : null;
  var scopeNodeId = message && typeof message.scopeNodeId === "string" ? message.scopeNodeId : null;
  try {
    cleanupExactKeys(message, ["type", "requestId", "scopeNodeId"]);
    if (message.type !== "revalidate-cleanup-scope") cleanupFailure("invalid-plan-operation");
    cleanupRequiredText(requestId);
    cleanupRequiredText(scopeNodeId);
    var resolved = await cleanupResolveNodes([scopeNodeId]);
    var scope = resolved[scopeNodeId];
    if (CLEANUP_SCOPE_TYPES.indexOf(scope.type) === -1 || cleanupLockedWithinScope(scope, scope)) cleanupFailure("stale-plan");
    var captured = captureCleanupSnapshot(scope);
    postPluginMessage({
      type: "cleanup-validation-result",
      requestId: requestId,
      ok: true,
      scopeNodeId: scopeNodeId,
      inputSnapshotHash: captured.inputSnapshotHash,
    });
  } catch (error) {
    postPluginMessage({
      type: "cleanup-validation-result",
      requestId: requestId,
      ok: false,
      scopeNodeId: scopeNodeId,
      errorCode: error && error.code === "invalid-plan-operation" ? "invalid-plan-operation" : "stale-plan",
    });
  }
}

async function applyCleanupPlan(message) {
  var requestId = message && typeof message.requestId === "string" ? message.requestId : null;
  var taskId = message && typeof message.taskId === "string" ? message.taskId : null;
  var scopeNodeId = message && typeof message.scopeNodeId === "string" ? message.scopeNodeId : null;
  var inputSnapshotHash = message && typeof message.inputSnapshotHash === "string"
    && /^sha256:[a-f0-9]{64}$/.test(message.inputSnapshotHash)
    ? message.inputSnapshotHash
    : null;
  try {
    var preflight = await preflightCleanupPlan(message);
    var execution = executeCleanupPlan(preflight);
    if (!execution.ok) {
      postPluginMessage({
        type: "cleanup-apply-result",
        requestId: preflight.requestId,
        ok: false,
        taskId: preflight.taskId,
        scopeNodeId: preflight.scope.id,
        inputSnapshotHash: preflight.inputSnapshotHash,
        preflightComplete: true,
        errorCode: execution.errorCode,
        documentChanged: execution.documentChanged,
        rolledBack: execution.rolledBack,
        affectedNodes: execution.affectedNodes,
      });
      return;
    }
    postPluginMessage({
      type: "cleanup-apply-result",
      requestId: preflight.requestId,
      ok: true,
      taskId: preflight.taskId,
      scopeNodeId: preflight.scope.id,
      inputSnapshotHash: preflight.inputSnapshotHash,
      preflightComplete: true,
      postApplySnapshotHash: execution.postApplySnapshotHash,
      outcomes: execution.outcomes,
      appliedCount: execution.appliedCount,
      skippedCount: execution.skippedCount,
      documentChanged: true,
    });
  } catch (error) {
    postPluginMessage({
      type: "cleanup-apply-result",
      requestId: requestId,
      ok: false,
      taskId: taskId,
      scopeNodeId: scopeNodeId,
      inputSnapshotHash: inputSnapshotHash,
      preflightComplete: false,
      errorCode: error && error.code === "stale-plan" ? "stale-plan" : "invalid-plan-operation",
      documentChanged: false,
      rolledBack: false,
      affectedNodes: [],
    });
  }
}

var READY_FOR_DEV_SCAN_MAX = 50;
var READY_FOR_DEV_STATUS = "READY_FOR_DEV";

function readyForDevStatusType(node) {
  var status = node ? node.devStatus : null;
  if (!status || typeof status !== "object") return null;
  return typeof status.type === "string" ? status.type : null;
}

function collectReadyForDevCandidates(root, result) {
  if (result.truncated) return;
  var children = root && root.children && typeof root.children.length === "number"
    ? Array.prototype.slice.call(root.children)
    : [];
  for (var index = 0; index < children.length; index += 1) {
    if (result.truncated) return;
    var child = children[index];
    if (
      CLEANUP_SCOPE_TYPES.indexOf(child.type) !== -1
      && readyForDevStatusType(child) === READY_FOR_DEV_STATUS
    ) {
      if (result.candidates.length >= READY_FOR_DEV_SCAN_MAX) {
        result.truncated = true;
        return;
      }
      result.candidates.push({ nodeId: child.id, type: child.type, name: cleanupScopeName(child) });
      continue;
    }
    collectReadyForDevCandidates(child, result);
  }
}

function scanReadyForDevCandidates() {
  var page = figma.currentPage;
  var result = { candidates: [], truncated: false };
  try {
    collectReadyForDevCandidates(page, result);
  } catch (error) {
    postPluginMessage({
      type: "ready-for-dev-scan-result",
      ok: false,
      errorCode: "ready-for-dev-scan-failed",
      pageName: "",
      candidates: [],
      truncated: false,
    });
    return;
  }
  postPluginMessage({
    type: "ready-for-dev-scan-result",
    ok: true,
    pageName: page && typeof page.name === "string" ? page.name : "",
    candidates: result.candidates,
    truncated: result.truncated,
  });
}

async function focusNode(nodeId) {
  var node;
  try {
    node = await figma.getNodeByIdAsync(nodeId);
  } catch (error) {
    postPluginMessage({ type: "focus-result", nodeId: nodeId, ok: false, errorCode: "focus-failed" });
    return;
  }
  if (!node || node.type === "DOCUMENT" || node.type === "PAGE") {
    postPluginMessage({ type: "focus-result", nodeId: nodeId, ok: false, errorCode: "node-not-found" });
    return;
  }

  var page = findParentPage(node);
  if (!page) {
    postPluginMessage({ type: "focus-result", nodeId: nodeId, ok: false, errorCode: "node-not-found" });
    return;
  }
  if (figma.currentPage.id !== page.id) {
    try {
      await figma.setCurrentPageAsync(page);
    } catch (error) {
      postPluginMessage({ type: "focus-result", nodeId: nodeId, ok: false, errorCode: "page-load-failed" });
      return;
    }
  }
  try {
    figma.currentPage.selection = [node];
    figma.viewport.scrollAndZoomIntoView([node]);
    postPluginMessage({ type: "focus-result", nodeId: nodeId, ok: true });
  } catch (error) {
    postPluginMessage({ type: "focus-result", nodeId: nodeId, ok: false, errorCode: "focus-failed" });
  }
}

figma.ui.onmessage = async function (message) {
  if (!message || typeof message.type !== "string") return;
  if (message.type === "capture-cleanup-scopes") {
    await captureCleanupScopes(message);
    return;
  }
  if (message.type === "scan-ready-for-dev") {
    scanReadyForDevCandidates();
    return;
  }
  if (message.type === "revalidate-cleanup-scope") {
    await revalidateCleanupScope(message);
    return;
  }
  if (message.type === "apply-cleanup-plan") {
    await applyCleanupPlan(message);
    return;
  }
  if (message.type === "focus-node" && typeof message.nodeId === "string" && message.nodeId) {
    await focusNode(message.nodeId);
    return;
  }
  if (message.type === "save-coordinator-url" && typeof message.coordinatorUrl === "string") {
    await saveCoordinatorUrl(message.coordinatorUrl);
  }
};

loadCoordinatorUrl().then(function (coordinatorUrl) {
  postPluginMessage(currentPluginContext(coordinatorUrl));
});
