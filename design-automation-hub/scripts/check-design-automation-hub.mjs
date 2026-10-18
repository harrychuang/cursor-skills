#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  checkInstalledProject,
  commitInstallPlan,
  createInstallPlan,
  executeInstall,
  resolveSkillsSourceRoot,
  validateProjectRoot,
  validateTemplate,
} from "./install-design-automation-hub.mjs";

const installerRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillsRoot = path.resolve(installerRoot, "..");
const templateRoot = path.join(installerRoot, "template");
const manifestPath = path.join(templateRoot, "TEMPLATE_MANIFEST.json");
const contractModulePath = path.join(templateRoot, "scripts/design-automation-hub/contract.mjs");
const coreModulePath = path.join(templateRoot, "scripts/design-automation-hub/core.mjs");
const hostModulePath = path.join(templateRoot, "scripts/design-automation-hub/host.mjs");
const writerPath = path.join(
  templateRoot,
  "skills/figma-design-automation/scripts/write-cleanup-result.mjs",
);
const cliPath = path.join(installerRoot, "scripts/install-design-automation-hub.mjs");
const manualAcceptancePath = path.join(installerRoot, "test/fixtures/manual-two-project-acceptance.json");
const checks = [];

function record(name) {
  checks.push(name);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function fragmentHash(value) {
  return sha256(Buffer.from(stableJson(value), "utf8"));
}

function checkFailure(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function isReleaseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?$/.exec(version);
  if (!match) checkFailure("invalid-template-version", "Template version is not semantic.");
  const [major, minor, patch] = match.slice(1).map(Number);
  return major > 1 || (major === 1 && (minor > 0 || patch >= 0));
}

function validateManualAcceptance(manifest, acceptance) {
  if (acceptance?.schemaVersion !== 1) {
    checkFailure("invalid-manual-acceptance", "Manual acceptance schemaVersion must be 1.");
  }
  if (acceptance.templateVersion !== manifest.templateVersion) {
    checkFailure("manual-acceptance-version-mismatch", "Manual acceptance must match the template version.");
  }
  if (!["pending", "completed"].includes(acceptance.status)) {
    checkFailure("invalid-manual-acceptance", "Manual acceptance status is invalid.");
  }
  if (
    acceptance.manifest?.identity !== "Design Automation Hub"
    || !Array.isArray(acceptance.projects)
    || acceptance.projects.length !== 2
    || new Set(acceptance.projects.map((project) => project?.acceptanceId)).size !== 2
    || !acceptance.checks
  ) {
    checkFailure("invalid-manual-acceptance", "Manual acceptance evidence is incomplete.");
  }

  if (!isReleaseVersion(manifest.templateVersion)) return acceptance;

  const completedAt = Date.parse(acceptance.completedAt || "");
  const projectEvidenceComplete = acceptance.projects.every((project) =>
    project.projectProfileConfigured === true
    && project.realFigmaFileKeyVerified === true
    && project.coordinatorHealthVerified === true
    && project.contextVerified === true
  );
  const checksComplete = [
    "samePluginIdentity",
    "fixedCopyContainsNoProjectName",
    "standaloneCleanupVisible",
    "workflowStatusVisible",
    "reviewHidden",
  ].every((name) => acceptance.checks[name] === true);
  if (
    acceptance.status !== "completed"
    || typeof acceptance.completedBy !== "string"
    || !acceptance.completedBy.trim()
    || !Number.isFinite(completedAt)
    || acceptance.manifest.absolutePathVerified !== true
    || acceptance.manifest.importedOnce !== true
    || !projectEvidenceComplete
    || !checksComplete
  ) {
    checkFailure(
      "manual-two-project-acceptance-incomplete",
      "Template 1.0.0 or later requires completed Figma Desktop acceptance evidence.",
    );
  }
  return acceptance;
}

function tempDirectory(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
}

function writeJson(filePath, value, mode = 0o600) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, { mode });
}

function snapshotTree(root) {
  const entries = [];
  if (!fs.existsSync(root)) return entries;
  const visit = (directory, prefix = "") => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        entries.push(`${relativePath}/`);
        visit(absolutePath, relativePath);
      } else if (entry.isFile()) {
        entries.push(`${relativePath}:${fs.statSync(absolutePath).mode & 0o777}:${sha256(fs.readFileSync(absolutePath))}`);
      } else if (entry.isSymbolicLink()) {
        entries.push(`${relativePath}->${fs.readlinkSync(absolutePath)}`);
      }
    }
  };
  visit(root);
  return entries;
}

function expectCode(action, code) {
  let caught;
  try {
    action();
  } catch (error) {
    caught = error;
  }
  assert.equal(caught?.code, code, `expected ${code}, received ${caught?.code || "no error"}`);
}

async function expectCodeAsync(action, code) {
  let caught;
  try {
    await action();
  } catch (error) {
    caught = error;
  }
  assert.equal(caught?.code, code, `expected ${code}, received ${caught?.code || "no error"}`);
}

function validSnapshot() {
  return {
    schemaVersion: 1,
    scope: { nodeId: "scope:1", type: "SECTION", name: "Card Group" },
    nodes: [
      {
        id: "scope:1",
        type: "SECTION",
        name: "Card Group",
        parentId: "page:1",
        index: 0,
        visible: true,
        locked: false,
        childIds: ["container:a", "container:b"],
        absoluteBounds: { x: 0, y: 0, width: 400, height: 300 },
      },
      {
        id: "container:a",
        type: "FRAME",
        name: "Card list",
        parentId: "scope:1",
        index: 0,
        visible: true,
        locked: false,
        childIds: ["12:1", "12:2", "12:3", "12:4"],
        absoluteBounds: { x: 0, y: 0, width: 200, height: 300 },
      },
      ...["12:1", "12:2", "12:3", "12:4"].map((id, index) => ({
        id,
        type: "FRAME",
        name: index < 2 ? `Frame ${index + 1}` : `Card ${index + 1}`,
        parentId: "container:a",
        index,
        visible: true,
        locked: false,
        childIds: [],
        absoluteBounds: { x: 10, y: index * 50, width: 180, height: 40 },
      })),
      {
        id: "container:b",
        type: "FRAME",
        name: "Card archive",
        parentId: "scope:1",
        index: 1,
        visible: true,
        locked: false,
        childIds: [],
        absoluteBounds: { x: 200, y: 0, width: 200, height: 300 },
      },
    ],
  };
}

function makeInput(contract, automationTaskId = "automation-task-42") {
  const snapshot = validSnapshot();
  return {
    schemaVersion: 1,
    taskType: "figma-cleanup",
    automationTaskId,
    projectId: "aurora",
    fileKey: "file-a",
    scope: snapshot.scope,
    snapshot,
    inputSnapshotHash: contract.computeCleanupSnapshotHash(snapshot, snapshot.scope),
  };
}

function fourOperationResult(input, runId = "run-a") {
  return {
    schemaVersion: 1,
    taskType: "figma-cleanup",
    status: "plan-ready",
    automationTaskId: input.automationTaskId,
    inputSnapshotHash: input.inputSnapshotHash,
    agentAutomationRunId: runId,
    summary: "依階層與同層命名整理四個圖層。",
    operations: [
      {
        type: "rename-node",
        operationId: "rename-1",
        nodeId: "12:1",
        beforeName: "Frame 1",
        afterName: "Card 1",
        reason: "依同層 Card 命名整理。",
      },
      {
        type: "rename-node",
        operationId: "rename-2",
        nodeId: "12:2",
        beforeName: "Frame 2",
        afterName: "Card 2",
        reason: "依同層 Card 命名整理。",
      },
      {
        type: "reorder-node",
        operationId: "reorder-1",
        nodeId: "12:3",
        parentId: "container:a",
        beforeIndex: 2,
        afterIndex: 1,
        reason: "依同層結構順序調整。",
      },
      {
        type: "move-node",
        operationId: "move-1",
        nodeId: "12:4",
        fromParentId: "container:a",
        toParentId: "container:b",
        beforeIndex: 3,
        afterIndex: 0,
        beforeAbsoluteBounds: { x: 10, y: 150, width: 180, height: 40 },
        reason: "依階層結構移至既有 archive 容器。",
      },
    ],
  };
}

function baseConfig({ includeCleanup = false, conflictCleanup = false } = {}) {
  const tasks = {
    implement: {
      instruction: "Implement one fixture task.",
      verification: [],
      requiredArtifacts: [],
    },
  };
  if (includeCleanup) {
    tasks["figma-cleanup"] = conflictCleanup
      ? {
          instruction: "Conflicting task.",
          skill: "another-skill",
          verification: [],
          requiredArtifacts: [],
        }
      : JSON.parse(fs.readFileSync(path.join(templateRoot, "agent-automation-task.fragment.json"), "utf8")).value;
  }
  return {
    schemaVersion: 1,
    stateDir: ".agent-automation/runs",
    runners: [
      {
        id: "claude",
        label: "Claude fixture",
        command: process.execPath,
        args: ["fixture-runner.mjs", "{workspace}", "{prompt}"],
        timeoutMs: 120000,
        inheritEnv: [],
      },
      {
        id: "codex",
        label: "Codex fixture",
        command: process.execPath,
        args: ["fixture-runner.mjs", "{workspace}", "{prompt}"],
        timeoutMs: 120000,
        inheritEnv: [],
      },
    ],
    tasks,
  };
}

function createProject({ config = baseConfig(), gitignore = "# fixture\n" } = {}) {
  const projectRoot = tempDirectory("design-automation-project");
  if (config) writeJson(path.join(projectRoot, ".agent-automation/config.json"), config);
  if (gitignore !== null) fs.writeFileSync(path.join(projectRoot, ".gitignore"), gitignore);
  fs.writeFileSync(path.join(projectRoot, "package.json"), "{\"private\":true}\n");
  return projectRoot;
}

function installOptions(projectRoot, overrides = {}) {
  return {
    projectRoot,
    hostMode: "standalone",
    skillsSourceRoot: skillsRoot,
    projectId: "aurora",
    projectName: "Project Aurora",
    figmaFileKeys: ["file-a", "file-b"],
    json: true,
    ...overrides,
  };
}

function checkManifestFixtures() {
  const { manifest } = validateTemplate();
  assert.equal(manifest.schemaVersion, 1);
  assert.match(manifest.templateVersion, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
  assert.ok(manifest.files.length > 10);
  record("manifest-complete");
  record("manifest-hashes");
  record("manifest-ownership");

  assert.deepEqual(manifest.modules, { "task-board-dispatch": { optional: true } });
  assert.deepEqual(
    manifest.files.filter((entry) => entry.module).map((entry) => entry.source),
    [
      "scripts/design-automation-hub/dispatch.mjs",
      "scripts/design-automation-hub/task-board-binding.mjs",
      "scripts/design-automation-hub/task-board-client.mjs",
    ],
  );
  assert.ok(manifest.files.filter((entry) => entry.module).every((entry) => entry.module === "task-board-dispatch"));
  record("manifest-module-partition");

  const manualAcceptance = JSON.parse(fs.readFileSync(manualAcceptancePath, "utf8"));
  validateManualAcceptance(manifest, manualAcceptance);
  const releaseManifest = { ...manifest, templateVersion: "1.0.0" };
  // Build the incomplete sample independently of the recorded acceptance so this
  // negative case keeps testing the release gate after real acceptance is filed.
  const pendingReleaseEvidence = {
    ...manualAcceptance,
    templateVersion: "1.0.0",
    status: "pending",
    completedBy: null,
    completedAt: null,
    manifest: {
      ...manualAcceptance.manifest,
      absolutePathVerified: false,
      importedOnce: false,
    },
    projects: manualAcceptance.projects.map((project) => ({
      ...project,
      projectProfileConfigured: false,
      realFigmaFileKeyVerified: false,
      coordinatorHealthVerified: false,
      contextVerified: false,
    })),
    checks: Object.fromEntries(
      Object.keys(manualAcceptance.checks).map((name) => [name, false]),
    ),
  };
  expectCode(
    () => validateManualAcceptance(releaseManifest, pendingReleaseEvidence),
    "manual-two-project-acceptance-incomplete",
  );
  const completedReleaseEvidence = JSON.parse(JSON.stringify(pendingReleaseEvidence));
  completedReleaseEvidence.status = "completed";
  completedReleaseEvidence.completedBy = "fixture-reviewer";
  completedReleaseEvidence.completedAt = "2026-07-23T00:00:00.000Z";
  completedReleaseEvidence.manifest.absolutePathVerified = true;
  completedReleaseEvidence.manifest.importedOnce = true;
  for (const project of completedReleaseEvidence.projects) {
    project.projectProfileConfigured = true;
    project.realFigmaFileKeyVerified = true;
    project.coordinatorHealthVerified = true;
    project.contextVerified = true;
  }
  for (const name of Object.keys(completedReleaseEvidence.checks)) {
    completedReleaseEvidence.checks[name] = true;
  }
  assert.equal(
    validateManualAcceptance(releaseManifest, completedReleaseEvidence),
    completedReleaseEvidence,
  );
  record("manual-two-project-release-gate");

  const mutate = (callback) => {
    const root = tempDirectory("design-automation-template");
    fs.cpSync(templateRoot, root, { recursive: true });
    const copiedManifestPath = path.join(root, "TEMPLATE_MANIFEST.json");
    const value = JSON.parse(fs.readFileSync(copiedManifestPath, "utf8"));
    callback({ root, manifest: value });
    writeJson(copiedManifestPath, value, 0o644);
    return root;
  };

  let root = mutate(({ manifest: value }) => { value.schemaVersion = 2; });
  expectCode(() => validateTemplate({ root }), "unsupported-template-schema");
  fs.rmSync(root, { recursive: true, force: true });

  root = mutate(({ manifest: value }) => { value.files[0].target = "../outside/main.js"; });
  expectCode(() => validateTemplate({ root }), "unsafe-template-target");
  fs.rmSync(root, { recursive: true, force: true });
  record("manifest-path-containment");

  root = mutate(({ root: fixtureRoot }) => { fs.writeFileSync(path.join(fixtureRoot, "unlisted.txt"), "x"); });
  expectCode(() => validateTemplate({ root }), "unlisted-template-file");
  fs.rmSync(root, { recursive: true, force: true });
  record("unlisted-template-file");

  root = mutate(({ root: fixtureRoot, manifest: value }) => {
    fs.appendFileSync(path.join(fixtureRoot, value.files[0].source), "\ndrift");
  });
  expectCode(() => validateTemplate({ root }), "template-hash-drift");
  fs.rmSync(root, { recursive: true, force: true });

  root = mutate(({ root: fixtureRoot }) => {
    fs.symlinkSync(os.tmpdir(), path.join(fixtureRoot, "escaped-link"));
  });
  expectCode(() => validateTemplate({ root }), "template-symlink-escape");
  fs.rmSync(root, { recursive: true, force: true });

  root = mutate(({ manifest: value }) => {
    value.files.find((entry) => entry.source === "scripts/design-automation-hub/dispatch.mjs").module = "undeclared-module";
  });
  expectCode(() => validateTemplate({ root }), "unknown-template-module");
  fs.rmSync(root, { recursive: true, force: true });

  // 原型鏈名稱（toString 等）不得因 `in` 語意而被誤放行。
  root = mutate(({ manifest: value }) => {
    value.files.find((entry) => entry.source === "scripts/design-automation-hub/dispatch.mjs").module = "toString";
  });
  expectCode(() => validateTemplate({ root }), "unknown-template-module");
  fs.rmSync(root, { recursive: true, force: true });
  record("undeclared-module-rejected");
}

function checkPluginTemplate() {
  const pluginRoot = path.join(templateRoot, "figma/design-automation-hub");
  const manifest = JSON.parse(fs.readFileSync(path.join(pluginRoot, "manifest.json"), "utf8"));
  const main = fs.readFileSync(path.join(pluginRoot, "main.js"), "utf8");
  const ui = fs.readFileSync(path.join(pluginRoot, "ui.html"), "utf8");
  assert.equal(manifest.name, "Design Automation Hub");
  assert.equal(manifest.id, "design-automation-hub");
  assert.equal(/ChipK|Project Aurora/.test(`${main}\n${ui}`), false);
  record("plugin-project-neutral-copy");
  for (const label of ["整理設計稿", "元件覆核", "流程狀態"]) assert.ok(ui.includes(label));
  assert.ok(ui.includes("cards.slice(0, 3)"));
  record("plugin-three-entry-limit");
  assert.ok(ui.includes("整理提案已送達"));
  assert.ok(ui.includes("畫布沒有修改"));
  record("anime-copy-boundary");
  assert.ok(ui.includes('features.review === true'));
  assert.ok(ui.includes("確認前不會修改畫布"));
  record("review-feature-gating");
  record("confirmation-zero-mutation");
  assert.equal(main.includes("selection.length !== 1"), false, "Figma main still gates on a single selected node");
  assert.ok(main.includes("var CLEANUP_BATCH_MAX = 10;"));
  assert.ok(main.includes('type: "cleanup-scopes-result"'));
  assert.ok(main.includes("cleanupScopesOverlap"));
  assert.ok(main.includes('var CLEANUP_ERROR_OVERLAPPING_SCOPE = "overlapping-cleanup-scope";'));
  assert.ok(main.includes('var CLEANUP_ERROR_BATCH_TOO_LARGE = "cleanup-batch-too-large";'));
  record("plugin-batch-scope-capture");
  assert.ok(main.includes("var READY_FOR_DEV_SCAN_MAX = 50;"));
  assert.ok(main.includes('type: "ready-for-dev-scan-result"'));
  assert.ok(main.includes("collectReadyForDevCandidates"));
  assert.equal(main.includes("loadAllPagesAsync"), false, "Ready for dev scan must stay on the current page");
  const outermostMatch = main.match(/result\.candidates\.push\([\s\S]{0,160}?\n\s*continue;/);
  assert.ok(outermostMatch, "Ready for dev scan must stop descending once a node matches");
  record("plugin-ready-for-dev-scan");
  assert.ok(ui.includes('type: "capture-cleanup-scopes"'));
  assert.ok(ui.includes('message.type === "ready-for-dev-scan-result"'));
  for (const label of ["這批整理任務", "Ready for dev 範圍", "排入選取範圍"]) assert.ok(ui.includes(label));
  record("plugin-batch-ui-copy");
  for (const forbidden of ["?.", "??", "class #", "import(", "=>"]) {
    assert.equal(main.includes(forbidden), false, `Figma main contains non-ES2018 syntax: ${forbidden}`);
  }
  new Function(main);
  record("figma-main-es2018");
}

function checkSourceSync(sourceRoot) {
  const { manifest } = validateTemplate();
  const mappings = manifest.sourceSync.files;
  let compared = 0;
  for (const mapping of mappings) {
    const productPath = path.join(sourceRoot, mapping.productPath);
    assert.equal(fs.existsSync(productPath), true, `source-contract-drift: ${mapping.productPath}`);
    assert.equal(sha256(fs.readFileSync(productPath)), mapping.sha256, `source-contract-drift: ${mapping.productPath}`);
    compared += 1;
  }
  const allProductFiles = snapshotTree(sourceRoot).filter((item) => !item.endsWith("/")).length;
  record("declared-source-inventory");
  record("ignore-unrelated-product-files");
  record("source-contract-drift");
  return { comparedFileCount: compared, ignoredUnrelatedCount: Math.max(0, allProductFiles - compared) };
}

async function checkCompanionContract() {
  const contract = await import(pathToFileURL(contractModulePath).href);
  const input = makeInput(contract);
  assert.equal(contract.validateCleanupInput(input).automationTaskId, input.automationTaskId);

  const reorderedSnapshot = {
    nodes: input.snapshot.nodes.map((node) => ({
      childIds: node.childIds,
      locked: node.locked,
      visible: node.visible,
      index: node.index,
      parentId: node.parentId,
      name: node.name,
      type: node.type,
      id: node.id,
      absoluteBounds: {
        height: node.absoluteBounds.height,
        width: node.absoluteBounds.width,
        y: node.absoluteBounds.y,
        x: node.absoluteBounds.x,
      },
    })),
    scope: { name: input.scope.name, type: input.scope.type, nodeId: input.scope.nodeId },
    schemaVersion: 1,
  };
  assert.equal(
    contract.computeCleanupSnapshotHash(reorderedSnapshot, input.scope),
    input.inputSnapshotHash,
  );
  record("canonical-snapshot-hash");

  const oversized = {
    schemaVersion: 1,
    scope: { nodeId: "n:0", type: "SECTION", name: "Large" },
    nodes: Array.from({ length: 501 }, (_, index) => ({
      id: `n:${index}`,
      type: index === 0 ? "SECTION" : "FRAME",
      name: `Node ${index}`,
      parentId: index === 0 ? "page:1" : `n:${index - 1}`,
      index: 0,
      visible: true,
      locked: false,
      childIds: index < 500 ? [`n:${index + 1}`] : [],
      absoluteBounds: { x: 0, y: index, width: 10, height: 10 },
    })),
  };
  expectCode(() => contract.validateCleanupSnapshot(oversized), "cleanup-scope-too-large");
  const boundary = { ...oversized, nodes: oversized.nodes.slice(0, 500) };
  boundary.nodes[499] = { ...boundary.nodes[499], childIds: [] };
  assert.equal(contract.validateCleanupSnapshot(boundary).nodes.length, 500);
  record("snapshot-500-501-boundary");

  const escaped = JSON.parse(JSON.stringify(input.snapshot));
  escaped.nodes.find((node) => node.id === "12:1").parentId = "outside:1";
  expectCode(() => contract.validateCleanupSnapshot(escaped), "invalid-cleanup-snapshot");
  record("scope-parent-containment");

  const validResult = fourOperationResult(input);
  assert.equal(contract.validateCleanupResult(validResult, { input, expectedRunId: "run-a" }).operations.length, 4);
  record("operation-allowlist");
  record("result-identity");

  expectCode(
    () => contract.validateCleanupResult({ ...validResult, agentAutomationRunId: "run-b" }, { input, expectedRunId: "run-a" }),
    "cleanup-result-identity-mismatch",
  );
  const withDelete = JSON.parse(JSON.stringify(validResult));
  withDelete.operations.push({ type: "delete-node", operationId: "delete-1", nodeId: "12:1", reason: "結構" });
  expectCode(() => contract.validateCleanupResult(withDelete, { input, expectedRunId: "run-a" }), "invalid-cleanup-operation");
  const semantic = JSON.parse(JSON.stringify(validResult));
  semantic.operations = [{
    type: "rename-node",
    operationId: "rename-semantic",
    nodeId: "12:1",
    beforeName: "Frame 1",
    afterName: "Premium Portfolio Card",
    reason: "依階層重新命名。",
  }];
  expectCode(() => contract.validateCleanupResult(semantic, { input, expectedRunId: "run-a" }), "unsupported-cleanup-inference");
  record("unsupported-cleanup-inference");

  const secretResult = { ...validResult, providerToken: "provider-secret-99" };
  expectCode(() => contract.validateCleanupResult(secretResult, { input, expectedRunId: "run-a" }), "cleanup-result-secret-rejected");
  record("result-secret-rejection");

  const runtimeProject = createProject();
  fs.mkdirSync(path.join(runtimeProject, ".design-automation/runtime"), { recursive: true });
  expectCode(() => contract.findCleanupResultForRun(runtimeProject, "missing-run"), "missing-cleanup-result");
  record("missing-result");
  const taskRoot = path.join(runtimeProject, ".design-automation/runtime/task-42");
  writeJson(path.join(taskRoot, "input.json"), input);
  writeJson(path.join(taskRoot, "result.json"), validResult);
  assert.equal(contract.findCleanupResultForRun(runtimeProject, "run-a").result.status, "plan-ready");
  fs.mkdirSync(path.join(runtimeProject, ".design-automation/runtime/task-43"), { recursive: true });
  writeJson(path.join(runtimeProject, ".design-automation/runtime/task-43/input.json"), { ...input, automationTaskId: "task-43" });
  writeJson(path.join(runtimeProject, ".design-automation/runtime/task-43/result.json"), { ...validResult, automationTaskId: "task-43" });
  expectCode(() => contract.findCleanupResultForRun(runtimeProject, "run-a"), "duplicate-cleanup-run-result");
  record("duplicate-run-result");
  fs.rmSync(runtimeProject, { recursive: true, force: true });

  const writerProject = createProject();
  const writerTask = path.join(writerProject, ".design-automation/runtime/writer-task");
  const writerInput = makeInput(contract, "writer-task");
  writeJson(path.join(writerProject, ".design-automation/project.json"), {
    schemaVersion: 1,
    project: { id: "aurora", displayName: "Project Aurora", figmaFileKeys: ["file-a"] },
    host: { mode: "standalone", adapter: null },
    features: { cleanup: true, review: false, workflowStatus: true },
  });
  fs.writeFileSync(path.join(writerProject, ".design-automation/state.sqlite"), "database-fixture");
  fs.writeFileSync(path.join(writerProject, "figma-document.fixture.json"), "{\"mutationCount\":0}\n");
  writeJson(path.join(writerProject, ".agent-automation/runs/protected.json"), {
    schemaVersion: 1,
    runId: "protected",
  });
  writeJson(path.join(writerTask, "input.json"), writerInput);
  const before = snapshotTree(writerProject);
  const candidate = {
    ...fourOperationResult(writerInput, "writer-run"),
    operations: [],
    summary: "目前不需要 allowlisted cleanup。",
  };
  const writer = spawnSync(process.execPath, [
    writerPath,
    "--project-root",
    writerProject,
    "--input",
    ".design-automation/runtime/writer-task/input.json",
    "--result",
    ".design-automation/runtime/writer-task/result.json",
  ], {
    cwd: writerProject,
    input: JSON.stringify(candidate),
    env: {
      ...process.env,
      AGENT_AUTOMATION_RUN_ID: "writer-run",
      AGENT_AUTOMATION_TASK_ID: "figma-cleanup",
      AGENT_AUTOMATION_RUNNER_ID: "fixture-runner",
    },
    encoding: "utf8",
  });
  assert.equal(writer.status, 0, writer.stderr);
  const after = snapshotTree(writerProject);
  assert.deepEqual(after.filter((item) => !item.startsWith(".design-automation/runtime/writer-task/result.json:")), [
    ...before,
  ]);
  record("single-write-boundary");
  record("invocation-path-containment");
  record("required-run-identity");
  fs.rmSync(writerProject, { recursive: true, force: true });
}

async function checkHostContract() {
  const { inspectHostAdapter, registerDesignAutomationHub, smokeHostAdapter } = await import(pathToFileURL(hostModulePath).href);
  const standalone = {
    schemaVersion: 1,
    project: { id: "aurora", displayName: "Project Aurora", figmaFileKeys: ["file-a"] },
    host: { mode: "standalone", adapter: null },
    features: { cleanup: true, review: false, workflowStatus: true },
  };
  const projectRoot = createProject();
  writeJson(path.join(projectRoot, ".design-automation/project.json"), standalone);
  const { DesignAutomationHubCore } = await import(pathToFileURL(coreModulePath).href);
  const core = new DesignAutomationHubCore({ projectRoot, runCleanup: async () => ({}) });
  const context = core.pluginContext({
    fileKey: "file-a",
    member: { id: "designer", displayName: "Designer", roles: ["designer"] },
  });
  assert.deepEqual(context.features, { cleanup: true, review: false, workflowStatus: true });
  assert.equal(fs.existsSync(path.join(projectRoot, ".figma-extraction")), false);
  record("standalone-feature-profile");
  record("standalone-no-extraction");

  const base = {
    contractVersion: 1,
    async resolveProject() { return { id: "aurora" }; },
    async resolveMember() { return { id: "designer" }; },
  };
  assert.equal(inspectHostAdapter(base).reviewEnabled, false);
  record("compatible-base-contract");
  record("absent-review-disabled");

  const complete = {
    ...base,
    review: {
      async listPendingReviews() { return []; },
      async submitReviewDecision() { return { accepted: true }; },
      async getWorkflowOverview() { return { counts: {} }; },
    },
  };
  assert.equal((await smokeHostAdapter(complete)).reviewEnabled, true);
  assert.equal(registerDesignAutomationHub(complete).features.review, true);
  record("complete-review-adapter");

  const partial = { ...base, review: { async listPendingReviews() { return []; } } };
  expectCode(() => inspectHostAdapter(partial), "incomplete-review-adapter");
  record("partial-review-preflight-failure");
  fs.rmSync(projectRoot, { recursive: true, force: true });
}

async function checkInstallerFixtures() {
  expectCode(() => validateProjectRoot(os.homedir()), "unsafe-project-root");
  expectCode(() => resolveSkillsSourceRoot(path.join(os.tmpdir(), "missing-source-root")), "missing-agent-automation-source");
  const ambiguousRoot = tempDirectory("ambiguous-skills-source");
  for (const root of [ambiguousRoot, path.join(ambiguousRoot, "nested")]) {
    fs.mkdirSync(path.join(root, "design-automation-hub"), { recursive: true });
    fs.mkdirSync(path.join(root, "agent-automation"), { recursive: true });
    fs.writeFileSync(path.join(root, "design-automation-hub/SKILL.md"), "---\nname: design-automation-hub\n---\n");
    fs.writeFileSync(path.join(root, "agent-automation/SKILL.md"), "---\nname: agent-automation\n---\n");
  }
  expectCode(
    () => resolveSkillsSourceRoot(undefined, { startRoot: path.join(ambiguousRoot, "nested/design-automation-hub") }),
    "ambiguous-agent-automation-source",
  );
  fs.rmSync(ambiguousRoot, { recursive: true, force: true });
  record("unsafe-project-root");
  record("missing-agent-automation-source");
  record("ambiguous-agent-automation-source");
  record("generic-source-not-vendored");

  const dryRoot = createProject();
  const beforeDry = snapshotTree(dryRoot);
  const dry = await executeInstall(installOptions(dryRoot, { dryRun: true }));
  assert.equal(dry.result, "planned");
  assert.deepEqual(snapshotTree(dryRoot), beforeDry);
  assert.ok(dry.installed.includes("figma/design-automation-hub/manifest.json"));
  assert.ok(dry.installed.some((item) => item.startsWith(".agents/skills/agent-automation/")));
  assert.deepEqual(dry.manualActions, [{ code: "import-figma-manifest", completed: false }]);
  record("dry-run-zero-write");

  const noProfileRoot = createProject();
  await expectCodeAsync(() => executeInstall({
    projectRoot: noProfileRoot,
    hostMode: "standalone",
    skillsSourceRoot: skillsRoot,
  }), "needs-project-profile");
  assert.equal(snapshotTree(noProfileRoot).some((item) => item.startsWith(".design-automation/")), false);
  record("needs-project-profile");
  record("no-identity-inference");
  fs.rmSync(noProfileRoot, { recursive: true, force: true });

  const noConfigRoot = createProject({ config: null });
  await expectCodeAsync(
    () => executeInstall(installOptions(noConfigRoot)),
    "needs-agent-automation-bootstrap",
  );
  assert.equal(snapshotTree(noConfigRoot).some((item) => item.startsWith(".design-automation/")), false);
  record("needs-agent-automation-bootstrap");
  fs.rmSync(noConfigRoot, { recursive: true, force: true });

  const writingAdapterRoot = createProject();
  fs.writeFileSync(
    path.join(writingAdapterRoot, "writing-host-adapter.mjs"),
    `import fs from "node:fs";
import path from "node:path";
export const designAutomationHubHostAdapter = {
  contractVersion: 1,
  async resolveProject() {
    const target = path.join(process.cwd(), ".design-automation/state/adapter-smoke-write.txt");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, "unexpected\\n");
    return { id: "fixture-project" };
  },
  async resolveMember() { return { id: "fixture-member" }; }
};
`,
  );
  const outsideSmokeTarget = path.join(
    os.tmpdir(),
    `design-automation-host-smoke-${crypto.randomUUID()}.txt`,
  );
  fs.writeFileSync(
    path.join(writingAdapterRoot, "outside-writing-host-adapter.mjs"),
    `import fs from "node:fs";
export const designAutomationHubHostAdapter = {
  contractVersion: 1,
  async resolveProject() {
    fs.writeFileSync(${JSON.stringify(outsideSmokeTarget)}, "unexpected\\n");
    return { id: "fixture-project" };
  },
  async resolveMember() { return { id: "fixture-member" }; }
};
`,
  );
  const writingAdapterBefore = snapshotTree(writingAdapterRoot);
  await expectCodeAsync(
    () => executeInstall(installOptions(writingAdapterRoot, {
      dryRun: true,
      hostMode: "compatible",
      hostAdapter: "writing-host-adapter.mjs",
    })),
    "host-adapter-smoke-wrote-files",
  );
  assert.deepEqual(snapshotTree(writingAdapterRoot), writingAdapterBefore);
  await expectCodeAsync(
    () => executeInstall(installOptions(writingAdapterRoot, {
      dryRun: true,
      hostMode: "compatible",
      hostAdapter: "outside-writing-host-adapter.mjs",
    })),
    "host-adapter-smoke-wrote-files",
  );
  assert.equal(fs.existsSync(outsideSmokeTarget), false);
  assert.deepEqual(snapshotTree(writingAdapterRoot), writingAdapterBefore);
  record("host-adapter-zero-write-permission");
  fs.rmSync(writingAdapterRoot, { recursive: true, force: true });

  const realRoot = createProject();
  const originalConfig = JSON.parse(fs.readFileSync(path.join(realRoot, ".agent-automation/config.json"), "utf8"));
  const preview = await executeInstall(installOptions(realRoot, { dryRun: true }));
  const installed = await executeInstall(installOptions(realRoot));
  assert.equal(installed.result, "installed");
  assert.deepEqual(installed.installed, preview.installed);
  assert.deepEqual(installed.merged, preview.merged);
  record("planned-vs-real-plan");
  record("clean-install");
  record("explicit-project-profile");
  const mergedConfig = JSON.parse(fs.readFileSync(path.join(realRoot, ".agent-automation/config.json"), "utf8"));
  assert.deepEqual(mergedConfig.runners.map((runner) => runner.id), originalConfig.runners.map((runner) => runner.id));
  assert.ok(mergedConfig.tasks.implement);
  assert.equal(mergedConfig.tasks["figma-cleanup"].skill, "figma-design-automation");
  record("additive-config-merge");
  record("generic-mirror-parity");
  record("skill-mirror-parity");

  const receiptBefore = fs.readFileSync(path.join(realRoot, ".design-automation/install.json"));
  const reinstall = await executeInstall(installOptions(realRoot));
  assert.equal(reinstall.result, "valid");
  assert.equal(reinstall.installed.length, 0);
  assert.equal(reinstall.updated.length, 0);
  assert.equal(reinstall.merged.length, 0);
  assert.deepEqual(fs.readFileSync(path.join(realRoot, ".design-automation/install.json")), receiptBefore);
  record("idempotent-reinstall");
  record("equivalent-task-idempotent");

  const driftPath = path.join(realRoot, "figma/design-automation-hub/ui.html");
  fs.appendFileSync(driftPath, "\n<!-- local edit -->\n");
  const conflict = await executeInstall(installOptions(realRoot, { update: true }));
  assert.equal(conflict.result, "conflict");
  assert.ok(conflict.conflicts.some((item) => item.code === "locally-modified-managed-file"));
  record("managed-local-edit-conflict");
  const forced = await executeInstall(installOptions(realRoot, { update: true, forceManaged: true }));
  assert.equal(forced.result, "updated");
  assert.equal(fs.readFileSync(driftPath, "utf8").includes("local edit"), false);
  record("force-managed-scope");

  const installedCheck = await checkInstalledProject({ projectRoot: realRoot, skillsSourceRoot: skillsRoot });
  assert.equal(installedCheck.result, "valid", JSON.stringify(installedCheck.issues));
  record("installed-project-validation");

  // 預設安裝排除派工模組；realRoot 一路 install → update 都不得出現派工檔案。
  const dispatchModuleFiles = [
    "scripts/design-automation-hub/dispatch.mjs",
    "scripts/design-automation-hub/task-board-binding.mjs",
    "scripts/design-automation-hub/task-board-client.mjs",
  ];
  for (const target of dispatchModuleFiles) {
    assert.equal(fs.existsSync(path.join(realRoot, target)), false, `${target} must not be installed by default`);
  }
  const realReceipt = JSON.parse(fs.readFileSync(path.join(realRoot, ".design-automation/install.json"), "utf8"));
  assert.deepEqual(realReceipt.modules, ["core"]);
  record("default-install-excludes-task-board-dispatch");
  record("update-preserves-module-exclusion");

  const dispatchRoot = createProject();
  const dispatchInstall = await executeInstall(installOptions(dispatchRoot, { withTaskBoardDispatch: true }));
  assert.equal(dispatchInstall.result, "installed");
  for (const target of dispatchModuleFiles) {
    assert.ok(fs.existsSync(path.join(dispatchRoot, target)), `${target} must be installed with the flag`);
  }
  const dispatchReceiptPath = path.join(dispatchRoot, ".design-automation/install.json");
  const dispatchReceipt = JSON.parse(fs.readFileSync(dispatchReceiptPath, "utf8"));
  assert.deepEqual(dispatchReceipt.modules, ["core", "task-board-dispatch"]);
  for (const target of dispatchModuleFiles) {
    assert.match(dispatchReceipt.managedFiles[target] || "", /^[a-f0-9]{64}$/, `${target} digest must be in the receipt`);
  }
  const dispatchCheck = await checkInstalledProject({ projectRoot: dispatchRoot, skillsSourceRoot: skillsRoot });
  assert.equal(dispatchCheck.result, "valid", JSON.stringify(dispatchCheck.issues));
  record("flagged-install-carries-task-board-dispatch");

  // 選裝模組的缺檔仍是 drift：收據記錄了就要完整驗證。
  fs.rmSync(path.join(dispatchRoot, dispatchModuleFiles[1]));
  const dispatchDrift = await checkInstalledProject({ projectRoot: dispatchRoot, skillsSourceRoot: skillsRoot });
  assert.equal(dispatchDrift.result, "failed");
  assert.ok(dispatchDrift.issues.some((item) =>
    item.code === "managed-file-drift" && item.path === dispatchModuleFiles[1]));
  record("selected-module-missing-file-drift");

  // 無 modules 欄位的舊收據視為選了全部模組：全檔案在場時 check 必須照舊通過。
  fs.writeFileSync(
    path.join(dispatchRoot, dispatchModuleFiles[1]),
    fs.readFileSync(path.join(templateRoot, "scripts/design-automation-hub/task-board-binding.mjs")),
  );
  const legacyReceipt = JSON.parse(fs.readFileSync(dispatchReceiptPath, "utf8"));
  delete legacyReceipt.modules;
  writeJson(dispatchReceiptPath, legacyReceipt);
  const legacyCheck = await checkInstalledProject({ projectRoot: dispatchRoot, skillsSourceRoot: skillsRoot });
  assert.equal(legacyCheck.result, "valid", JSON.stringify(legacyCheck.issues));
  record("legacy-receipt-full-module-selection");

  // 收據帶未知模組名：update 過濾後重寫收據，隨後 check 必須通過。
  const ghostReceipt = JSON.parse(fs.readFileSync(dispatchReceiptPath, "utf8"));
  ghostReceipt.modules = ["core", "task-board-dispatch", "ghost-module"];
  writeJson(dispatchReceiptPath, ghostReceipt);
  const ghostUpdate = await executeInstall(installOptions(dispatchRoot, { update: true }));
  assert.equal(ghostUpdate.result, "updated");
  const healedReceipt = JSON.parse(fs.readFileSync(dispatchReceiptPath, "utf8"));
  assert.deepEqual(healedReceipt.modules, ["core", "task-board-dispatch"]);
  const healedCheck = await checkInstalledProject({ projectRoot: dispatchRoot, skillsSourceRoot: skillsRoot });
  assert.equal(healedCheck.result, "valid", JSON.stringify(healedCheck.issues));
  record("unknown-receipt-module-filtered-on-update");

  // 收據 modules 欄位毀損（非陣列）：update 必須大聲失敗，不得靜默擴張模組範圍。
  const corruptReceipt = JSON.parse(fs.readFileSync(dispatchReceiptPath, "utf8"));
  corruptReceipt.modules = null;
  writeJson(dispatchReceiptPath, corruptReceipt);
  await expectCodeAsync(
    () => executeInstall(installOptions(dispatchRoot, { update: true })),
    "invalid-install-receipt",
  );
  record("corrupt-receipt-modules-loud-failure");
  fs.rmSync(dispatchRoot, { recursive: true, force: true });

  const integrityRoot = createProject();
  await executeInstall(installOptions(integrityRoot));
  const integrityReceiptPath = path.join(integrityRoot, ".design-automation/install.json");
  const integrityReceiptBytes = fs.readFileSync(integrityReceiptPath);
  const integrityCorePath = path.join(integrityRoot, "scripts/design-automation-hub/core.mjs");
  const integrityCoreBytes = fs.readFileSync(integrityCorePath);
  const omittedReceipt = JSON.parse(integrityReceiptBytes);
  delete omittedReceipt.managedFiles["scripts/design-automation-hub/core.mjs"];
  writeJson(integrityReceiptPath, omittedReceipt);
  fs.rmSync(integrityCorePath);
  const omittedInventoryCheck = await checkInstalledProject({
    projectRoot: integrityRoot,
    skillsSourceRoot: skillsRoot,
  });
  assert.equal(omittedInventoryCheck.result, "failed");
  assert.ok(omittedInventoryCheck.issues.some((item) =>
    item.code === "install-receipt-inventory-drift"));
  assert.ok(omittedInventoryCheck.issues.some((item) =>
    item.code === "managed-file-drift"
    && item.path === "scripts/design-automation-hub/core.mjs"));
  record("install-receipt-inventory-parity");
  fs.writeFileSync(integrityReceiptPath, integrityReceiptBytes, { mode: 0o600 });
  fs.mkdirSync(path.dirname(integrityCorePath), { recursive: true });
  fs.writeFileSync(integrityCorePath, integrityCoreBytes);

  const integrityConfigPath = path.join(integrityRoot, ".agent-automation/config.json");
  const integrityConfig = JSON.parse(fs.readFileSync(integrityConfigPath, "utf8"));
  integrityConfig.tasks["figma-cleanup"].verification = [];
  writeJson(integrityConfigPath, integrityConfig);
  const cleanupFragmentCheck = await checkInstalledProject({
    projectRoot: integrityRoot,
    skillsSourceRoot: skillsRoot,
  });
  assert.equal(cleanupFragmentCheck.result, "failed");
  assert.ok(cleanupFragmentCheck.issues.some((item) =>
    item.code === "invalid-agent-automation-config"
    && item.path === ".agent-automation/config.json"));
  record("cleanup-task-fragment-parity");
  fs.rmSync(integrityRoot, { recursive: true, force: true });

  const compatibleRoot = createProject();
  const compatibleAdapterPath = path.join(compatibleRoot, "host-adapter.mjs");
  fs.writeFileSync(
    compatibleAdapterPath,
    `export const designAutomationHubHostAdapter = {
  contractVersion: 1,
  async resolveProject() { return { id: "fixture-project" }; },
  async resolveMember() { return { id: "fixture-member", roles: ["reviewer"] }; },
  review: {
    async listPendingReviews() { return []; },
    async submitReviewDecision() { return { accepted: true }; },
    async getWorkflowOverview() { return { counts: {} }; }
  }
};
`,
  );
  await executeInstall(installOptions(compatibleRoot, {
    hostMode: "compatible",
    hostAdapter: "host-adapter.mjs",
  }));
  const compatibleInstalledCheck = await checkInstalledProject({
    projectRoot: compatibleRoot,
    skillsSourceRoot: skillsRoot,
  });
  assert.equal(compatibleInstalledCheck.result, "valid", JSON.stringify(compatibleInstalledCheck.issues));
  fs.renameSync(compatibleAdapterPath, `${compatibleAdapterPath}.off`);
  const missingAdapterCheck = await checkInstalledProject({
    projectRoot: compatibleRoot,
    skillsSourceRoot: skillsRoot,
  });
  assert.equal(missingAdapterCheck.result, "failed");
  assert.ok(missingAdapterCheck.issues.some((item) => item.code === "invalid-host-adapter"));
  record("compatible-installed-adapter-revalidation");
  fs.rmSync(compatibleRoot, { recursive: true, force: true });

  const checkCli = spawnSync(process.execPath, [
    cliPath,
    "--project-root",
    realRoot,
    "--host-mode",
    "standalone",
    "--skills-source-root",
    skillsRoot,
    "--check",
    "--json",
  ], { encoding: "utf8" });
  assert.equal(checkCli.status, 0, checkCli.stdout);
  assert.equal(JSON.parse(checkCli.stdout).result, "valid");
  const inspectCli = spawnSync(process.execPath, [
    cliPath,
    "--project-root",
    realRoot,
    "--host-mode",
    "standalone",
    "--skills-source-root",
    skillsRoot,
    "--inspect",
    "--json",
  ], { encoding: "utf8" });
  assert.equal(inspectCli.status, 0, inspectCli.stdout);
  assert.equal(JSON.parse(inspectCli.stdout).result, "planned");
  record("inspect-install-update-check-modes");

  const oldTask = { ...mergedConfig.tasks["figma-cleanup"], instruction: "Prior managed fragment." };
  const driftedConfig = JSON.parse(fs.readFileSync(path.join(realRoot, ".agent-automation/config.json"), "utf8"));
  driftedConfig.tasks["figma-cleanup"] = oldTask;
  writeJson(path.join(realRoot, ".agent-automation/config.json"), driftedConfig);
  const receipt = JSON.parse(fs.readFileSync(path.join(realRoot, ".design-automation/install.json"), "utf8"));
  receipt.mergeFragments = receipt.mergeFragments.map((fragment) =>
    fragment.id === "figma-cleanup-task-v1" ? { ...fragment, hash: fragmentHash(oldTask) } : fragment);
  writeJson(path.join(realRoot, ".design-automation/install.json"), receipt);
  const fragmentUpdate = await executeInstall(installOptions(realRoot, { update: true }));
  assert.equal(fragmentUpdate.result, "updated");
  const repairedConfig = JSON.parse(fs.readFileSync(path.join(realRoot, ".agent-automation/config.json"), "utf8"));
  assert.notEqual(repairedConfig.tasks["figma-cleanup"].instruction, "Prior managed fragment.");
  record("merge-fragment-drift");
  fs.rmSync(realRoot, { recursive: true, force: true });

  const conflictRoot = createProject({ config: baseConfig({ includeCleanup: true, conflictCleanup: true }) });
  const taskConflict = await executeInstall(installOptions(conflictRoot));
  assert.equal(taskConflict.result, "conflict");
  assert.ok(taskConflict.conflicts.some((item) => item.code === "conflicting-figma-cleanup-task"));
  const preserved = JSON.parse(fs.readFileSync(path.join(conflictRoot, ".agent-automation/config.json"), "utf8"));
  assert.equal(preserved.tasks["figma-cleanup"].skill, "another-skill");
  record("conflicting-task-preserved");
  fs.rmSync(conflictRoot, { recursive: true, force: true });

  const rollbackRoot = createProject();
  const rollbackPlan = await createInstallPlan(installOptions(rollbackRoot));
  const rollbackBefore = snapshotTree(rollbackRoot);
  expectCode(() => commitInstallPlan(rollbackPlan, { failureAfter: 2 }), "install-rollback-complete");
  assert.deepEqual(snapshotTree(rollbackRoot), rollbackBefore);
  record("rollback-on-write-failure");
  fs.rmSync(rollbackRoot, { recursive: true, force: true });

  const symlinkRoot = createProject();
  const outsideRoot = tempDirectory("design-automation-outside");
  fs.mkdirSync(path.join(symlinkRoot, ".agents"), { recursive: true });
  fs.symlinkSync(outsideRoot, path.join(symlinkRoot, ".agents/skills"));
  await expectCodeAsync(() => executeInstall(installOptions(symlinkRoot)), "project-root-escape");
  assert.deepEqual(snapshotTree(outsideRoot), []);
  record("project-target-symlink-escape");
  fs.rmSync(symlinkRoot, { recursive: true, force: true });
  fs.rmSync(outsideRoot, { recursive: true, force: true });

  const profileARoot = createProject();
  const profileBRoot = createProject();
  const installA = await executeInstall(installOptions(profileARoot, {
    projectId: "project-a",
    projectName: "Project A",
    figmaFileKeys: ["file-a"],
  }));
  const installB = await executeInstall(installOptions(profileBRoot, {
    projectId: "project-b",
    projectName: "Project B",
    figmaFileKeys: ["file-b"],
  }));
  assert.equal(installA.result, "installed");
  assert.equal(installB.result, "installed");
  for (const relativePath of [
    "figma/design-automation-hub/manifest.json",
    "figma/design-automation-hub/main.js",
    "figma/design-automation-hub/ui.html",
  ]) {
    assert.equal(
      sha256(fs.readFileSync(path.join(profileARoot, relativePath))),
      sha256(fs.readFileSync(path.join(profileBRoot, relativePath))),
    );
  }
  const fixedCopy = fs.readFileSync(path.join(profileARoot, "figma/design-automation-hub/ui.html"), "utf8");
  assert.equal(fixedCopy.includes("Project A"), false);
  assert.equal(fixedCopy.includes("Project B"), false);
  assert.equal(path.isAbsolute(installA.manifestPath), true);
  assert.equal(path.isAbsolute(installB.manifestPath), true);
  record("two-project-profile-filesystem-acceptance");
  fs.rmSync(profileARoot, { recursive: true, force: true });
  fs.rmSync(profileBRoot, { recursive: true, force: true });

  const cliUnknown = spawnSync(process.execPath, [cliPath, "--unknown"], { encoding: "utf8" });
  assert.notEqual(cliUnknown.status, 0);
  assert.equal(JSON.parse(cliUnknown.stdout).issues[0].code, "unknown-option");
  const cliMissing = spawnSync(process.execPath, [cliPath, "--project-root", dryRoot, "--json"], { encoding: "utf8" });
  assert.notEqual(cliMissing.status, 0);
  assert.equal(JSON.parse(cliMissing.stdout).issues[0].code, "missing-host-mode");
  record("cli-option-matrix");

  const secretResult = spawnSync(process.execPath, [
    cliPath,
    "--project-root",
    dryRoot,
    "--host-mode",
    "standalone",
    "--skills-source-root",
    skillsRoot,
    "--dry-run",
    "--json",
  ], {
    env: {
      ...process.env,
      DESIGN_AUTOMATION_SESSION_SECRET: "session-secret-42",
      PROVIDER_TOKEN: "provider-secret-99",
    },
    encoding: "utf8",
  });
  assert.equal(secretResult.status, 0, secretResult.stderr);
  assert.equal(secretResult.stdout.includes("session-secret-42"), false);
  assert.equal(secretResult.stdout.includes("provider-secret-99"), false);
  record("sanitized-json-result");
  fs.rmSync(dryRoot, { recursive: true, force: true });
}

async function checkGenericFallbackSmoke() {
  const contract = await import(pathToFileURL(contractModulePath).href);
  const projectRoot = createProject();
  const unavailablePath = path.join(projectRoot, "unavailable.mjs");
  const fakeRunnerPath = path.join(projectRoot, "fake-runner.mjs");
  fs.writeFileSync(unavailablePath, "process.exit(1);\n");
  fs.writeFileSync(fakeRunnerPath, `import fs from "node:fs";
import path from "node:path";
const workspace = process.argv[2];
const prompt = process.argv[3] || "";
const match = /Read ([^\\s]+input\\.json) and write exactly one result to ([^\\s]+result\\.json)/.exec(prompt);
if (!match) process.exit(2);
const input = JSON.parse(fs.readFileSync(path.join(workspace, match[1]), "utf8"));
const result = {
  schemaVersion: 1,
  taskType: "figma-cleanup",
  status: "plan-ready",
  automationTaskId: input.automationTaskId,
  inputSnapshotHash: input.inputSnapshotHash,
  agentAutomationRunId: process.env.AGENT_AUTOMATION_RUN_ID,
  summary: "目前不需要 allowlisted cleanup。",
  operations: []
};
fs.writeFileSync(path.join(workspace, match[2]), JSON.stringify(result, null, 2) + "\\n", { mode: 0o600 });
`);
  const config = baseConfig();
  config.runners = [
    {
      id: "unavailable",
      label: "Unavailable fixture",
      command: process.execPath,
      args: [fakeRunnerPath, "{workspace}", "{prompt}"],
      timeoutMs: 120000,
      preflight: { command: process.execPath, args: [unavailablePath], timeoutMs: 10000 },
      inheritEnv: [],
    },
    {
      id: "fallback",
      label: "Fallback fixture",
      command: process.execPath,
      args: [fakeRunnerPath, "{workspace}", "{prompt}"],
      timeoutMs: 120000,
      inheritEnv: [],
    },
  ];
  writeJson(path.join(projectRoot, ".agent-automation/config.json"), config);
  await executeInstall(installOptions(projectRoot));

  const { DesignAutomationHubCore } = await import(`${pathToFileURL(path.join(projectRoot, "scripts/design-automation-hub/core.mjs")).href}?smoke=1`);
  const core = new DesignAutomationHubCore({ projectRoot });
  const input = makeInput(contract, "ignored-id");
  const member = { id: "designer", displayName: "Designer", roles: ["designer"] };
  const documentPath = path.join(projectRoot, "figma-document.fixture.json");
  fs.writeFileSync(documentPath, "{\"mutationCount\":0}\n");
  const documentBefore = sha256(fs.readFileSync(documentPath));
  const created = core.createTask({
    member,
    input: {
      fileKey: "file-a",
      taskType: "figma-cleanup",
      scope: input.scope,
      snapshot: input.snapshot,
      inputSnapshotHash: input.inputSnapshotHash,
      idempotencyKey: "fallback-smoke",
    },
  });
  const analyzed = await core.analyzeTask(created.task.id);
  assert.equal(analyzed.status, "plan-ready", JSON.stringify(analyzed.failure));
  assert.equal(sha256(fs.readFileSync(documentPath)), documentBefore);
  const summaries = fs.readdirSync(path.join(projectRoot, ".agent-automation/runs"))
    .map((name) => JSON.parse(fs.readFileSync(path.join(projectRoot, ".agent-automation/runs", name), "utf8")));
  const summary = summaries.find((item) => item.runId === core.store.get(created.task.id).genericRunId);
  assert.equal(summary.phase, "completed");
  assert.deepEqual(summary.attempts.map((attempt) => attempt.outcome), ["unavailable", "success"]);
  assert.equal(summary.selectedRunner.id, "fallback");
  record("generic-runner-delegation");
  record("generic-fallback");
  record("dynamic-result-verification");
  record("no-direct-provider-fallback");
  record("plan-ready-after-completed-summary");
  record("fake-runner-zero-mutation");

  const missingProject = createProject();
  await executeInstall(installOptions(missingProject));
  fs.rmSync(path.join(missingProject, ".agents/skills/figma-design-automation"), { recursive: true, force: true });
  const { DesignAutomationHubCore: MissingCore } = await import(`${pathToFileURL(path.join(missingProject, "scripts/design-automation-hub/core.mjs")).href}?smoke=2`);
  const missingCore = new MissingCore({ projectRoot: missingProject });
  const missingCreated = missingCore.createTask({
    member,
    input: {
      fileKey: "file-a",
      taskType: "figma-cleanup",
      scope: input.scope,
      snapshot: input.snapshot,
      inputSnapshotHash: input.inputSnapshotHash,
      idempotencyKey: "missing-skill-smoke",
    },
  });
  const missingAnalyzed = await missingCore.analyzeTask(missingCreated.task.id);
  assert.equal(missingAnalyzed.status, "blocked");
  assert.equal(missingAnalyzed.failure.code, "automation-runtime-unavailable");
  record("missing-companion-visible-gate");

  fs.rmSync(projectRoot, { recursive: true, force: true });
  fs.rmSync(missingProject, { recursive: true, force: true });
}

async function runTemplateChecks() {
  checkManifestFixtures();
  checkPluginTemplate();
  await checkCompanionContract();
  await checkHostContract();
  await checkInstallerFixtures();
  await checkGenericFallbackSmoke();
  const companionCheck = spawnSync(process.execPath, [
    path.join(templateRoot, "skills/figma-design-automation/scripts/check-figma-design-automation.mjs"),
  ], { cwd: skillsRoot, encoding: "utf8" });
  assert.equal(companionCheck.status, 0, companionCheck.stderr);
  const companionResult = JSON.parse(companionCheck.stdout);
  for (const name of companionResult.checks) {
    if (!checks.includes(name)) checks.push(name);
  }
  record("companion-checker");
}

function parseArgs(argv) {
  const result = { json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--json") result.json = true;
    else if (token === "--template") result.template = true;
    else if (["--project-root", "--source-root"].includes(token)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${token} requires a value`);
      result[token.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
      index += 1;
    } else throw new Error(`Unknown option: ${token}`);
  }
  if ([result.template, Boolean(result.projectRoot), Boolean(result.sourceRoot)].filter(Boolean).length !== 1) {
    throw new Error("Choose exactly one of --template, --project-root, or --source-root.");
  }
  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let details = {};
  if (args.template) {
    await runTemplateChecks();
  } else if (args.projectRoot) {
    const result = await checkInstalledProject({ projectRoot: args.projectRoot, skillsSourceRoot: skillsRoot });
    if (result.result !== "valid") {
      process.stdout.write(`${JSON.stringify(result)}\n`);
      process.exitCode = 1;
      return;
    }
    checks.push("installed-project");
    details = result;
  } else {
    details = checkSourceSync(validateProjectRoot(args.sourceRoot));
  }
  const output = {
    schemaVersion: 1,
    mode: args.template ? "template" : args.projectRoot ? "installed-project" : "source-sync",
    result: "valid",
    templateVersion: JSON.parse(fs.readFileSync(manifestPath, "utf8")).templateVersion,
    checks,
    ...details,
  };
  process.stdout.write(`${JSON.stringify(output)}\n`);
}

main().catch((error) => {
  if (process.env.DESIGN_AUTOMATION_CHECK_DEBUG === "1") {
    process.stderr.write(`${error.stack || error.message}\n`);
  }
  process.stdout.write(`${JSON.stringify({
    schemaVersion: 1,
    mode: "check",
    result: "failed",
    issues: [{ code: error.code || "check-failed", ...(error.path ? { path: error.path } : {}) }],
  })}\n`);
  process.exitCode = 1;
});
