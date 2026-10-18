#!/usr/bin/env node

import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const installerRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templateRoot = path.join(installerRoot, "template");
const manifestPath = path.join(templateRoot, "TEMPLATE_MANIFEST.json");
const hostAdapterSmokePath = path.join(installerRoot, "scripts/smoke-host-adapter.mjs");
const HOST_SMOKE_MARKER = "__DESIGN_AUTOMATION_HOST_SMOKE__";
const RECEIPT_PATH = ".design-automation/install.json";
const PROFILE_PATH = ".design-automation/project.json";
const CONFIG_PATH = ".agent-automation/config.json";
const GENERIC_SKILL = "agent-automation";
const COMPANION_SKILL = "figma-design-automation";
const SKILL_SURFACES = Object.freeze([".agents/skills", ".claude/skills", ".cursor/skills"]);
const SHA_PATTERN = /^[a-f0-9]{64}$/;
const OWNERSHIP = new Set(["managed", "merge", "generated"]);
const CORE_MODULE = "core";
// Maps each optional module to the CLI option that opts in to installing it.
const MODULE_OPTION_FLAGS = Object.freeze({ "task-board-dispatch": "withTaskBoardDispatch" });
const CREDENTIAL_PATTERN = /(token|secret|password|credential|authorization|bearer|api.?key|private.?key)/i;
const RESULT_KEYS = [
  "schemaVersion",
  "mode",
  "result",
  "projectRoot",
  "templateVersion",
  "hostMode",
  "installed",
  "updated",
  "merged",
  "unchanged",
  "conflicts",
  "issues",
  "manifestPath",
  "manualActions",
  "nextActions",
];

class InstallerError extends Error {
  constructor(code, message, options = {}) {
    super(message);
    this.name = "InstallerError";
    this.code = code;
    this.path = options.path || null;
    this.result = options.result || "failed";
  }
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

function normalizeFragment(value) {
  return sha256(Buffer.from(stableJson(value), "utf8"));
}

function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function safeRelative(value, code) {
  if (
    typeof value !== "string"
    || value.trim() === ""
    || path.isAbsolute(value)
    || value.split(/[\\/]+/).includes("..")
  ) throw new InstallerError(code, "Path must be a contained relative path.", { path: value });
  return value.replaceAll("\\", "/");
}

function assertDestinationContained(projectRoot, destination, target = path.relative(projectRoot, destination)) {
  if (!inside(projectRoot, destination)) {
    throw new InstallerError("project-root-escape", "Install target escaped project root.", { path: target });
  }
  let existing = destination;
  while (!fs.existsSync(existing)) {
    const parent = path.dirname(existing);
    if (parent === existing) break;
    existing = parent;
  }
  if (!inside(projectRoot, fs.realpathSync(existing))) {
    throw new InstallerError("project-root-escape", "Install target resolves through a symlink outside the project.", { path: target });
  }
  return destination;
}

function walkFiles(root, { exclude = new Set() } = {}) {
  const files = [];
  const visit = (directory, prefix = "") => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (exclude.has(relativePath)) continue;
      const absolutePath = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new InstallerError("template-symlink-escape", "Symlinks are not allowed.", { path: relativePath });
      if (entry.isDirectory()) visit(absolutePath, relativePath);
      else if (entry.isFile()) files.push(relativePath);
      else throw new InstallerError("unsupported-template-entry", "Unsupported template entry.", { path: relativePath });
    }
  };
  visit(root);
  return files;
}

function readJson(filePath, code) {
  try {
    if (fs.lstatSync(filePath).isSymbolicLink()) throw new Error("symlink");
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    throw new InstallerError(code, "JSON file is missing, unsafe, or malformed.", { path: filePath });
  }
}

export function validateTemplate({ root = templateRoot, manifestFile = path.join(root, "TEMPLATE_MANIFEST.json") } = {}) {
  const manifest = readJson(manifestFile, "invalid-template-manifest");
  if (
    manifest?.schemaVersion !== 1
    || typeof manifest.templateVersion !== "string"
    || !/^\d+\.\d+\.\d+$/.test(manifest.templateVersion)
    || typeof manifest.minimumAgentAutomationVersion !== "string"
    || !Array.isArray(manifest.files)
    || !Array.isArray(manifest.manualActions)
  ) throw new InstallerError("unsupported-template-schema", "Template manifest schema is unsupported.");

  const declaredModules = manifest.modules ?? {};
  if (
    typeof declaredModules !== "object"
    || Array.isArray(declaredModules)
    || Object.entries(declaredModules).some(([name, config]) =>
      typeof name !== "string"
      || name === ""
      || !config
      || typeof config !== "object"
      || Array.isArray(config)
      || (config.optional !== undefined && typeof config.optional !== "boolean"))
  ) throw new InstallerError("unsupported-template-schema", "Template modules declaration is unsupported.");

  const sources = new Set();
  const targets = new Set();
  const normalizedFiles = manifest.files.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new InstallerError("invalid-template-entry", "Template file entry is invalid.");
    }
    const source = safeRelative(entry.source, "unsafe-template-source");
    const target = safeRelative(entry.target, "unsafe-template-target");
    if (sources.has(source)) throw new InstallerError("duplicate-template-source", "Template source is duplicated.", { path: source });
    if (targets.has(target)) throw new InstallerError("duplicate-template-target", "Template target is duplicated.", { path: target });
    sources.add(source);
    targets.add(target);
    if (!OWNERSHIP.has(entry.ownership)) {
      throw new InstallerError("unknown-template-ownership", "Template ownership is unsupported.", { path: source });
    }
    if (entry.module !== undefined && (typeof entry.module !== "string" || (entry.module !== CORE_MODULE && !Object.hasOwn(declaredModules, entry.module)))) {
      throw new InstallerError("unknown-template-module", "Template file entry references an undeclared module.", { path: source });
    }
    if (!SHA_PATTERN.test(entry.sha256 || "")) {
      throw new InstallerError("invalid-template-digest", "Template digest is malformed.", { path: source });
    }
    const sourcePath = path.resolve(root, source);
    if (!inside(root, sourcePath) || !fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
      throw new InstallerError("missing-template-file", "Template source is missing.", { path: source });
    }
    const realSource = fs.realpathSync(sourcePath);
    if (!inside(fs.realpathSync(root), realSource)) {
      throw new InstallerError("template-symlink-escape", "Template source escaped the template root.", { path: source });
    }
    if (sha256(fs.readFileSync(sourcePath)) !== entry.sha256) {
      throw new InstallerError("template-hash-drift", "Template file digest does not match manifest.", { path: source });
    }
    const sourceSegments = source.split(/[\\/]/);
    if (sourceSegments.includes(GENERIC_SKILL) || sourceSegments.includes("figma-automation-orchestrate")) {
      throw new InstallerError("generic-source-vendored", "Generic orchestration source must not be vendored.", { path: source });
    }
    return { ...entry, source, target };
  });

  const actual = walkFiles(root, { exclude: new Set(["TEMPLATE_MANIFEST.json"]) });
  const unlisted = actual.filter((item) => !sources.has(item));
  if (unlisted.length) {
    throw new InstallerError("unlisted-template-file", "Template contains unlisted files.", { path: unlisted[0] });
  }
  const missing = [...sources].filter((item) => !actual.includes(item));
  if (missing.length) {
    throw new InstallerError("missing-template-file", "Manifest lists a missing file.", { path: missing[0] });
  }
  if (
    manifest.manualActions.length !== 1
    || manifest.manualActions[0]?.code !== "import-figma-manifest"
    || manifest.manualActions[0]?.ownership !== "manual"
    || manifest.manualActions[0]?.completed !== false
  ) throw new InstallerError("invalid-manual-action", "Manifest must declare one incomplete Figma import handoff.");
  safeRelative(manifest.manualActions[0].target, "unsafe-manual-action-target");

  if (
    manifest.sourceSync?.contractVersion !== 1
    || !Array.isArray(manifest.sourceSync.files)
    || manifest.sourceSync.files.length === 0
  ) throw new InstallerError("invalid-source-sync-inventory", "Source-sync inventory is missing.");
  for (const mapping of manifest.sourceSync.files) {
    const templatePath = safeRelative(mapping.templatePath, "unsafe-source-sync-path");
    safeRelative(mapping.productPath, "unsafe-source-sync-path");
    if (!sources.has(templatePath) || mapping.sha256 !== manifest.files.find((item) => item.source === templatePath)?.sha256) {
      throw new InstallerError("source-contract-drift", "Source-sync mapping does not match template inventory.", { path: templatePath });
    }
  }

  return { manifest: { ...manifest, files: normalizedFiles }, root: fs.realpathSync(root) };
}

export function validateProjectRoot(projectRootInput) {
  if (!path.isAbsolute(projectRootInput || "")) {
    throw new InstallerError("unsafe-project-root", "Project root must be absolute.");
  }
  if (!fs.existsSync(projectRootInput) || !fs.statSync(projectRootInput).isDirectory()) {
    throw new InstallerError("unsafe-project-root", "Project root must be an existing directory.");
  }
  if (fs.lstatSync(projectRootInput).isSymbolicLink()) {
    throw new InstallerError("unsafe-project-root", "Project root cannot be a symbolic link.");
  }
  const projectRoot = fs.realpathSync(projectRootInput);
  const parsed = path.parse(projectRoot);
  if (projectRoot === parsed.root || projectRoot === fs.realpathSync(os.homedir())) {
    throw new InstallerError("unsafe-project-root", "Filesystem root and home directory are unsafe targets.");
  }
  return projectRoot;
}

function findSourceCandidates(start) {
  const candidates = [];
  let current = fs.realpathSync(start);
  while (true) {
    if (
      fs.existsSync(path.join(current, "design-automation-hub", "SKILL.md"))
      && fs.existsSync(path.join(current, GENERIC_SKILL, "SKILL.md"))
    ) candidates.push(current);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return candidates;
}

export function resolveSkillsSourceRoot(explicitRoot, { startRoot = installerRoot } = {}) {
  let candidates;
  if (explicitRoot !== undefined) {
    if (!path.isAbsolute(explicitRoot)) {
      throw new InstallerError("missing-agent-automation-source", "Skills source root must be absolute.");
    }
    if (!fs.existsSync(explicitRoot) || !fs.statSync(explicitRoot).isDirectory()) {
      throw new InstallerError("missing-agent-automation-source", "Skills source root does not exist.");
    }
    candidates = [fs.realpathSync(explicitRoot)].filter((root) =>
      fs.existsSync(path.join(root, "design-automation-hub", "SKILL.md"))
      && fs.existsSync(path.join(root, GENERIC_SKILL, "SKILL.md")));
  } else {
    candidates = findSourceCandidates(startRoot);
  }
  if (candidates.length === 0) {
    throw new InstallerError("missing-agent-automation-source", "Use a complete cm-skills checkout.");
  }
  if (candidates.length !== 1) {
    throw new InstallerError("ambiguous-agent-automation-source", "More than one complete cm-skills source root was found.");
  }
  const root = candidates[0];
  const genericRoot = path.join(root, GENERIC_SKILL);
  for (const required of [
    "SKILL.md",
    "scripts/run-task.mjs",
    "scripts/status.mjs",
    "scripts/validate-project-config.mjs",
    "scripts/check-agent-automation-skill.mjs",
  ]) {
    if (!fs.existsSync(path.join(genericRoot, required))) {
      throw new InstallerError("invalid-agent-automation-source", "Generic source is incomplete.", { path: required });
    }
  }
  const selfCheck = spawnSync(process.execPath, [path.join(genericRoot, "scripts/check-agent-automation-skill.mjs")], {
    cwd: root,
    encoding: "utf8",
    stdio: "ignore",
    timeout: 120000,
  });
  if (selfCheck.status !== 0) {
    throw new InstallerError("invalid-agent-automation-source", "Generic source self-check failed.");
  }
  return { root, genericRoot };
}

function relativeFiles(root) {
  return walkFiles(root).filter((item) => ![".DS_Store"].includes(path.basename(item)));
}

function allModuleNames(manifest) {
  const names = new Set([CORE_MODULE, ...Object.keys(manifest.modules ?? {})]);
  for (const entry of manifest.files) if (entry.module) names.add(entry.module);
  return names;
}

function entryModule(entry) {
  return entry.module || CORE_MODULE;
}

// A fresh install selects core plus every non-optional module, adding optional
// modules only when their CLI flag opts in. A receipt-recorded selection wins
// (unknown names are dropped so a rewritten receipt always passes check);
// a receipt that predates module recording selects all modules, and a receipt
// whose modules field is present but not an array is corrupt and fails loudly.
function moduleSelection({ manifest, options = {}, receipt = null }) {
  const declared = manifest.modules ?? {};
  const known = allModuleNames(manifest);
  let recorded = null;
  if (receipt) {
    if (receipt.modules === undefined) recorded = [...known];
    else if (Array.isArray(receipt.modules)) {
      recorded = receipt.modules.filter((name) => typeof name === "string" && known.has(name));
    } else {
      throw new InstallerError("invalid-install-receipt", "Install receipt module selection is corrupt.", { path: RECEIPT_PATH });
    }
  }
  const selection = new Set(
    recorded ?? [
      CORE_MODULE,
      ...Object.keys(declared).filter((name) => !declared[name].optional),
    ],
  );
  selection.add(CORE_MODULE);
  for (const [name, optionKey] of Object.entries(MODULE_OPTION_FLAGS)) {
    if (options[optionKey] && Object.hasOwn(declared, name)) selection.add(name);
  }
  return selection;
}

function expectedManagedInventory({ manifest, genericRoot, modules = null }) {
  const selection = modules ?? allModuleNames(manifest);
  const expected = {};
  for (const entry of manifest.files.filter((item) => item.ownership === "managed" && selection.has(entryModule(item)))) {
    const targets = entry.source.startsWith("skills/figma-design-automation/")
      ? SKILL_SURFACES.map((surface) =>
          `${surface}/${COMPANION_SKILL}/${entry.source.slice("skills/figma-design-automation/".length)}`)
      : [entry.target];
    for (const target of targets) expected[target] = entry.sha256;
  }
  for (const relativePath of relativeFiles(genericRoot)) {
    const digest = sha256(fs.readFileSync(path.join(genericRoot, relativePath)));
    for (const surface of SKILL_SURFACES) {
      expected[`${surface}/${GENERIC_SKILL}/${relativePath}`] = digest;
    }
  }
  return expected;
}

function exactDigestInventory(actual, expected) {
  if (!actual || typeof actual !== "object" || Array.isArray(actual)) return false;
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  return (
    actualKeys.length === expectedKeys.length
    && actualKeys.every((key, index) =>
      key === expectedKeys[index]
      && SHA_PATTERN.test(actual[key] || "")
      && actual[key] === expected[key])
  );
}

function expectedMergeFragments(templateSourceRoot = templateRoot) {
  const taskFragment = readJson(
    path.join(templateSourceRoot, "agent-automation-task.fragment.json"),
    "invalid-task-fragment",
  );
  const gitignoreLines = fs.readFileSync(
    path.join(templateSourceRoot, "gitignore.fragment"),
    "utf8",
  ).trim().split("\n").filter(Boolean);
  return {
    taskFragment,
    gitignoreLines,
    receiptEntries: [
      {
        id: taskFragment.fragmentId,
        target: CONFIG_PATH,
        hash: normalizeFragment(taskFragment.value),
      },
      {
        id: "design-automation-runtime-v1",
        target: ".gitignore",
        hash: normalizeFragment(gitignoreLines),
      },
    ],
  };
}

function exactMergeFragments(actual, expected) {
  if (!Array.isArray(actual) || actual.length !== expected.length) return false;
  const byId = new Map();
  for (const entry of actual) {
    if (
      !entry
      || typeof entry.id !== "string"
      || byId.has(entry.id)
      || typeof entry.target !== "string"
      || !SHA_PATTERN.test(entry.hash || "")
    ) return false;
    byId.set(entry.id, entry);
  }
  return expected.every((entry) => {
    const actualEntry = byId.get(entry.id);
    return actualEntry?.target === entry.target && actualEntry.hash === entry.hash;
  });
}

async function validateHostAdapter({ projectRoot, hostMode, hostAdapter }) {
  if (hostMode === "standalone") {
    if (hostAdapter) throw new InstallerError("incompatible-options", "Standalone mode does not accept --host-adapter.");
    return { reviewEnabled: false, adapter: null };
  }
  if (!hostAdapter) throw new InstallerError("missing-host-adapter", "Compatible mode requires --host-adapter.");
  if (
    !process.allowedNodeEnvironmentFlags.has("--permission")
    || !process.allowedNodeEnvironmentFlags.has("--allow-fs-read")
  ) {
    throw new InstallerError(
      "host-adapter-sandbox-unavailable",
      "Compatible host preflight requires the Node permission model.",
    );
  }
  const relativeAdapter = safeRelative(hostAdapter, "unsafe-host-adapter-path");
  const adapterPath = path.resolve(projectRoot, relativeAdapter);
  if (
    !inside(projectRoot, adapterPath)
    || !fs.existsSync(adapterPath)
    || !fs.statSync(adapterPath).isFile()
    || !inside(projectRoot, fs.realpathSync(adapterPath))
  ) {
    throw new InstallerError("invalid-host-adapter", "Host adapter file is missing.", { path: relativeAdapter });
  }
  const smoke = spawnSync(process.execPath, [
    "--permission",
    `--allow-fs-read=${projectRoot}`,
    `--allow-fs-read=${installerRoot}`,
    hostAdapterSmokePath,
    "--project-root",
    projectRoot,
    "--host-adapter",
    fs.realpathSync(adapterPath),
  ], {
    cwd: projectRoot,
    encoding: "utf8",
    env: {
      PATH: process.env.PATH || "",
    },
    timeout: 15000,
  });
  const markerLine = (smoke.stdout || "")
    .split(/\r?\n/)
    .findLast((line) => line.startsWith(HOST_SMOKE_MARKER));
  let smokeResult = null;
  try {
    smokeResult = markerLine
      ? JSON.parse(markerLine.slice(HOST_SMOKE_MARKER.length))
      : null;
  } catch {
    smokeResult = null;
  }
  if (
    smoke.status !== 0
    || !smokeResult?.ok
    || smokeResult.descriptor?.contractVersion !== 1
    || typeof smokeResult.descriptor?.reviewEnabled !== "boolean"
  ) {
    const code = [
      "host-adapter-smoke-wrote-files",
      "incomplete-review-adapter",
      "unsupported-host-contract",
      "invalid-host-adapter",
    ].includes(smokeResult?.code)
      ? smokeResult.code
      : "invalid-host-adapter";
    throw new InstallerError(code, "Host adapter preflight failed.", {
      path: relativeAdapter,
    });
  }
  return {
    reviewEnabled: smokeResult.descriptor.reviewEnabled,
    adapter: relativeAdapter,
  };
}

function scanProfileSecrets(value) {
  if (Array.isArray(value)) return value.some(scanProfileSecrets);
  if (!value || typeof value !== "object") {
    return typeof value === "string" && CREDENTIAL_PATTERN.test(value);
  }
  return Object.entries(value).some(([key, child]) => CREDENTIAL_PATTERN.test(key) || scanProfileSecrets(child));
}

function validateProfileShape(profile, { hostMode, adapter, reviewEnabled }) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile) || profile.schemaVersion !== 1) {
    throw new InstallerError("invalid-project-profile", "Project profile schemaVersion must be 1.");
  }
  if (scanProfileSecrets(profile)) {
    throw new InstallerError("unsafe-project-profile", "Project profile contains credential-like data.");
  }
  const project = profile.project;
  if (
    typeof project?.id !== "string"
    || project.id.trim() === ""
    || typeof project.displayName !== "string"
    || project.displayName.trim() === ""
    || !Array.isArray(project.figmaFileKeys)
    || project.figmaFileKeys.length === 0
    || project.figmaFileKeys.some((item) => typeof item !== "string" || item.trim() === "")
    || new Set(project.figmaFileKeys).size !== project.figmaFileKeys.length
  ) throw new InstallerError("invalid-project-profile", "Project identity and Figma file keys are required.");
  return {
    ...profile,
    schemaVersion: 1,
    project: {
      ...project,
      id: project.id.trim(),
      displayName: project.displayName.trim(),
      figmaFileKeys: project.figmaFileKeys.map((item) => item.trim()),
    },
    host: { ...(profile.host || {}), mode: hostMode, adapter },
    features: { ...(profile.features || {}), cleanup: true, review: reviewEnabled, workflowStatus: true },
  };
}

function loadRequestedProfile(options, projectRoot, hostDescriptor, { allowPlaceholder = false } = {}) {
  const installedPath = path.join(projectRoot, PROFILE_PATH);
  if (fs.existsSync(installedPath)) assertDestinationContained(projectRoot, installedPath, PROFILE_PATH);
  let base = fs.existsSync(installedPath)
    ? readJson(installedPath, "invalid-project-profile")
    : {};
  let provided = null;
  if (options.projectProfile) {
    const relativeProfile = safeRelative(options.projectProfile, "unsafe-project-profile-path");
    const profilePath = path.resolve(projectRoot, relativeProfile);
    if (
      !inside(projectRoot, profilePath)
      || !fs.existsSync(profilePath)
      || !inside(projectRoot, fs.realpathSync(profilePath))
    ) {
      throw new InstallerError("unsafe-project-profile-path", "Project profile path is missing or escaped.", { path: relativeProfile });
    }
    provided = readJson(profilePath, "invalid-project-profile");
  } else if (options.projectId || options.projectName || options.figmaFileKeys.length) {
    if (!options.projectId || !options.projectName || options.figmaFileKeys.length === 0) {
      throw new InstallerError("needs-project-profile", "Project id, name, and at least one Figma file key are required.", { result: "needs-profile" });
    }
    provided = {
      schemaVersion: 1,
      project: {
        id: options.projectId,
        displayName: options.projectName,
        figmaFileKeys: options.figmaFileKeys,
      },
    };
  }
  if (!provided && !fs.existsSync(installedPath)) {
    if (!allowPlaceholder) {
      throw new InstallerError("needs-project-profile", "Project identity must be explicit.", { result: "needs-profile" });
    }
    provided = {
      schemaVersion: 1,
      project: {
        id: "provide-project-id",
        displayName: "Provide project name",
        figmaFileKeys: ["provide-figma-file-key"],
      },
    };
  }
  base = { ...base, ...(provided || {}), project: { ...(base.project || {}), ...(provided?.project || {}) } };
  return validateProfileShape(base, {
    hostMode: options.hostMode,
    adapter: hostDescriptor.adapter,
    reviewEnabled: hostDescriptor.reviewEnabled,
  });
}

function readReceipt(projectRoot) {
  const receiptPath = path.join(projectRoot, RECEIPT_PATH);
  if (!fs.existsSync(receiptPath)) return null;
  assertDestinationContained(projectRoot, receiptPath, RECEIPT_PATH);
  const receipt = readJson(receiptPath, "invalid-install-receipt");
  if (receipt?.schemaVersion !== 1 || typeof receipt.templateVersion !== "string") {
    throw new InstallerError("invalid-install-receipt", "Install receipt schema is invalid.");
  }
  return receipt;
}

function expectedTargetStatus({ projectRoot, target, expectedHash, receipt, update, forceManaged }) {
  const destination = path.join(projectRoot, target);
  assertDestinationContained(projectRoot, destination, target);
  if (!fs.existsSync(destination)) return { action: "installed", destination };
  if (!fs.statSync(destination).isFile() || fs.lstatSync(destination).isSymbolicLink()) {
    return { action: "conflict", code: "managed-target-collision", destination };
  }
  const currentHash = sha256(fs.readFileSync(destination));
  if (currentHash === expectedHash) return { action: "unchanged", destination };
  const priorHash = receipt?.managedFiles?.[target];
  if (update && (forceManaged || (priorHash && priorHash === currentHash))) {
    return { action: "updated", destination };
  }
  return {
    action: "conflict",
    code: priorHash ? "locally-modified-managed-file" : "managed-target-collision",
    destination,
  };
}

async function loadConfigValidator(skillsSourceRoot) {
  const modulePath = path.join(skillsSourceRoot, GENERIC_SKILL, "scripts/validate-project-config.mjs");
  return import(pathToFileURL(modulePath).href);
}

function mergeGitignore(existing, fragment) {
  const currentLines = existing.replace(/\r\n/g, "\n").split("\n");
  const required = fragment.trim().split("\n").filter(Boolean);
  const missing = required.filter((line) => !currentLines.includes(line));
  if (!missing.length) return { content: existing, changed: false };
  const prefix = existing && !existing.endsWith("\n") ? `${existing}\n` : existing;
  return { content: `${prefix}${missing.join("\n")}\n`, changed: true };
}

function addPlanEntry(plan, action, target, bytes, mode = 0o644) {
  if (action === "conflict") return;
  plan[action].push(target);
  if (action === "installed" || action === "updated" || action === "merged") {
    plan.writes.push({ target, bytes: Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes, "utf8"), mode });
  }
}

function baseResult({ mode, projectRoot, manifest, hostMode }) {
  return {
    schemaVersion: 1,
    mode,
    result: mode === "dry-run" ? "planned" : "failed",
    projectRoot,
    templateVersion: manifest.templateVersion,
    hostMode,
    installed: [],
    updated: [],
    merged: [],
    unchanged: [],
    conflicts: [],
    issues: [],
    manifestPath: path.join(projectRoot, "figma/design-automation-hub/manifest.json"),
    manualActions: [{ code: "import-figma-manifest", completed: false }],
    nextActions: [],
  };
}

function publicResult(result) {
  const output = {};
  for (const key of RESULT_KEYS) output[key] = result[key];
  return output;
}

export async function createInstallPlan(options) {
  const projectRoot = validateProjectRoot(options.projectRoot);
  const { manifest, root } = validateTemplate();
  const source = resolveSkillsSourceRoot(options.skillsSourceRoot);
  const mode = options.dryRun || options.inspect ? "dry-run" : options.check ? "check" : options.update ? "update" : "install";
  const result = baseResult({ mode, projectRoot, manifest, hostMode: options.hostMode });
  const plan = { ...result, writes: [], receipt: readReceipt(projectRoot), sourceRoot: source.root };
  const hostDescriptor = await validateHostAdapter({
    projectRoot,
    hostMode: options.hostMode,
    hostAdapter: options.hostAdapter,
  });
  const profile = loadRequestedProfile(options, projectRoot, hostDescriptor, {
    allowPlaceholder: options.dryRun || options.inspect,
  });
  const modules = moduleSelection({ manifest, options, receipt: plan.receipt });

  for (const entry of manifest.files.filter((item) => item.ownership === "managed" && modules.has(entryModule(item)))) {
    const sourcePath = path.join(root, entry.source);
    const targets = entry.source.startsWith("skills/figma-design-automation/")
      ? SKILL_SURFACES.map((surface) =>
          `${surface}/${COMPANION_SKILL}/${entry.source.slice("skills/figma-design-automation/".length)}`)
      : [entry.target];
    for (const target of targets) {
      const status = expectedTargetStatus({
        projectRoot,
        target,
        expectedHash: entry.sha256,
        receipt: plan.receipt,
        update: options.update,
        forceManaged: options.forceManaged,
      });
      if (status.action === "conflict") {
        plan.conflicts.push({ path: target, code: status.code });
      } else {
        addPlanEntry(plan, status.action, target, fs.readFileSync(sourcePath), fs.statSync(sourcePath).mode & 0o777);
      }
    }
  }

  const genericFiles = relativeFiles(source.genericRoot);
  for (const relativePath of genericFiles) {
    const sourcePath = path.join(source.genericRoot, relativePath);
    const expectedHash = sha256(fs.readFileSync(sourcePath));
    for (const surface of SKILL_SURFACES) {
      const target = `${surface}/${GENERIC_SKILL}/${relativePath}`;
      const status = expectedTargetStatus({
        projectRoot,
        target,
        expectedHash,
        receipt: plan.receipt,
        update: options.update,
        forceManaged: options.forceManaged,
      });
      if (status.action === "conflict") {
        plan.conflicts.push({ path: target, code: status.code });
      } else {
        addPlanEntry(plan, status.action, target, fs.readFileSync(sourcePath), fs.statSync(sourcePath).mode & 0o777);
      }
    }
  }

  const profileBytes = Buffer.from(`${JSON.stringify(profile, null, 2)}\n`, "utf8");
  const existingProfilePath = path.join(projectRoot, PROFILE_PATH);
  const profileAction = !fs.existsSync(existingProfilePath)
    ? "installed"
    : sha256(fs.readFileSync(existingProfilePath)) === sha256(profileBytes)
      ? "unchanged"
      : "updated";
  addPlanEntry(plan, profileAction, PROFILE_PATH, profileBytes, 0o600);

  const configPath = path.join(projectRoot, CONFIG_PATH);
  const mergeContract = expectedMergeFragments(root);
  const fragment = mergeContract.taskFragment;
  const fragmentHash = mergeContract.receiptEntries[0].hash;
  let finalConfig = null;
  if (!fs.existsSync(configPath)) {
    if (!(options.dryRun || options.inspect)) {
      throw new InstallerError("needs-agent-automation-bootstrap", "Agent automation config is missing.", { result: "needs-bootstrap" });
    }
    plan.merged.push(CONFIG_PATH);
    plan.nextActions.push({ code: "bootstrap-agent-automation" });
  } else {
    assertDestinationContained(projectRoot, configPath, CONFIG_PATH);
    const validator = await loadConfigValidator(source.root);
    const validation = validator.loadAndValidateConfig({ projectRoot, configPath: CONFIG_PATH });
    if (!validation.valid) {
      plan.conflicts.push({ path: CONFIG_PATH, code: "invalid-agent-automation-config" });
    } else {
      const config = validation.config;
      const currentTask = config.tasks?.[fragment.taskId];
      if (!currentTask) {
        finalConfig = { ...config, tasks: { ...config.tasks, [fragment.taskId]: fragment.value } };
        addPlanEntry(plan, "merged", CONFIG_PATH, `${JSON.stringify(finalConfig, null, 2)}\n`, 0o600);
      } else if (normalizeFragment(currentTask) === fragmentHash) {
        plan.unchanged.push(`${CONFIG_PATH}#${fragment.fragmentId}`);
        finalConfig = config;
      } else {
        const prior = plan.receipt?.mergeFragments?.find((item) => item.id === fragment.fragmentId);
        if (options.update && prior?.hash === normalizeFragment(currentTask)) {
          finalConfig = { ...config, tasks: { ...config.tasks, [fragment.taskId]: fragment.value } };
          addPlanEntry(plan, "merged", CONFIG_PATH, `${JSON.stringify(finalConfig, null, 2)}\n`, 0o600);
        } else {
          plan.conflicts.push({ path: CONFIG_PATH, code: "conflicting-figma-cleanup-task" });
        }
      }
      if (finalConfig) {
        const errors = validator.validateConfig(finalConfig, projectRoot);
        if (errors.length) plan.conflicts.push({ path: CONFIG_PATH, code: "invalid-merged-agent-automation-config" });
      }
    }
  }

  const gitignorePath = path.join(projectRoot, ".gitignore");
  if (fs.existsSync(gitignorePath)) assertDestinationContained(projectRoot, gitignorePath, ".gitignore");
  const gitignoreFragment = fs.readFileSync(path.join(root, "gitignore.fragment"), "utf8");
  const currentGitignore = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, "utf8") : "";
  const mergedGitignore = mergeGitignore(currentGitignore, gitignoreFragment);
  if (mergedGitignore.changed) {
    addPlanEntry(plan, "merged", ".gitignore", mergedGitignore.content, 0o644);
  } else {
    plan.unchanged.push(".gitignore#design-automation-runtime-v1");
  }

  plan.expectedManagedFiles = expectedManagedInventory({
    manifest,
    genericRoot: source.genericRoot,
    modules,
  });
  plan.modules = [...modules].sort();
  plan.generatedFiles = { [PROFILE_PATH]: sha256(profileBytes) };
  plan.mergeFragments = mergeContract.receiptEntries;
  plan.profile = profile;
  plan.fragment = fragment;
  plan.result = options.dryRun || options.inspect
    ? "planned"
    : plan.conflicts.length
      ? "conflict"
      : plan.receipt
        ? options.update
          ? "updated"
          : plan.writes.length
            ? "conflict"
            : "valid"
        : "installed";
  if (plan.receipt && !options.update && plan.writes.length) {
    plan.conflicts.push({ path: RECEIPT_PATH, code: "update-required" });
    plan.result = "conflict";
  }
  if (plan.conflicts.length) plan.issues.push(...plan.conflicts.map((item) => ({ code: item.code, path: item.path })));
  plan.nextActions.push(
    { code: "check-installed-project" },
    { code: "start-local-coordinator" },
    { code: "import-figma-manifest" },
  );
  return plan;
}

function ensureParent(destination, createdDirectories) {
  const missing = [];
  let current = path.dirname(destination);
  while (!fs.existsSync(current)) {
    missing.push(current);
    current = path.dirname(current);
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  createdDirectories.push(...missing);
}

function removeEmptyDirectories(directories) {
  for (const directory of [...new Set(directories)].sort((left, right) => right.length - left.length)) {
    try {
      if (fs.existsSync(directory) && fs.readdirSync(directory).length === 0) fs.rmdirSync(directory);
    } catch {
      // Best effort after rollback.
    }
  }
}

export function commitInstallPlan(plan, { failureAfter = Infinity } = {}) {
  if (plan.conflicts.length) throw new InstallerError("install-conflict", "Install plan contains conflicts.", { result: "conflict" });
  const projectRoot = plan.projectRoot;
  const receipt = {
    schemaVersion: 1,
    templateVersion: plan.templateVersion,
    hostMode: plan.hostMode,
    modules: plan.modules,
    managedFiles: plan.expectedManagedFiles,
    generatedFiles: plan.generatedFiles,
    mergeFragments: plan.mergeFragments,
    manualActions: [{ code: "import-figma-manifest", completed: false }],
  };
  const receiptBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  const receiptAbsolute = path.join(projectRoot, RECEIPT_PATH);
  const existingReceiptBytes = fs.existsSync(receiptAbsolute) ? fs.readFileSync(receiptAbsolute) : null;
  if (!existingReceiptBytes || !existingReceiptBytes.equals(receiptBytes)) {
    plan.writes.push({ target: RECEIPT_PATH, bytes: receiptBytes, mode: 0o600 });
  }
  if (plan.writes.length === 0) return;
  for (const write of plan.writes) {
    assertDestinationContained(projectRoot, path.join(projectRoot, write.target), write.target);
  }

  const stagingRoot = path.join(projectRoot, ".design-automation", `.install-staging-${crypto.randomUUID()}`);
  const stagingParent = path.dirname(stagingRoot);
  const stagingParentExisted = fs.existsSync(stagingParent);
  const backups = new Map();
  const createdDirectories = [];
  const committed = [];
  try {
    fs.mkdirSync(stagingRoot, { recursive: true, mode: 0o700 });
    for (const write of plan.writes) {
      const stagePath = path.join(stagingRoot, write.target);
      fs.mkdirSync(path.dirname(stagePath), { recursive: true, mode: 0o700 });
      fs.writeFileSync(stagePath, write.bytes, { mode: write.mode });
    }
    for (const write of plan.writes) {
      const destination = path.join(projectRoot, write.target);
      assertDestinationContained(projectRoot, destination, write.target);
      if (fs.existsSync(destination)) {
        backups.set(write.target, {
          bytes: fs.readFileSync(destination),
          mode: fs.statSync(destination).mode & 0o777,
        });
      } else {
        backups.set(write.target, null);
      }
      ensureParent(destination, createdDirectories);
      fs.writeFileSync(destination, write.bytes, { mode: write.mode });
      fs.chmodSync(destination, write.mode);
      committed.push(write.target);
      if (committed.length >= failureAfter) throw Object.assign(new Error("Injected write failure."), { code: "injected-write-failure" });
    }
  } catch (error) {
    for (const target of committed.reverse()) {
      const destination = path.join(projectRoot, target);
      const backup = backups.get(target);
      if (backup) {
        fs.writeFileSync(destination, backup.bytes, { mode: backup.mode });
        fs.chmodSync(destination, backup.mode);
      } else if (fs.existsSync(destination)) {
        fs.rmSync(destination, { force: true });
      }
    }
    fs.rmSync(stagingRoot, { recursive: true, force: true });
    removeEmptyDirectories(createdDirectories);
    if (!stagingParentExisted && fs.existsSync(stagingParent) && fs.readdirSync(stagingParent).length === 0) {
      fs.rmdirSync(stagingParent);
    }
    throw new InstallerError("install-rollback-complete", "Install failed and touched files were restored.");
  }
  fs.rmSync(stagingRoot, { recursive: true, force: true });
}

export async function checkInstalledProject({ projectRoot, skillsSourceRoot } = {}) {
  const root = validateProjectRoot(projectRoot);
  const { manifest } = validateTemplate();
  let receipt = null;
  let receiptError = null;
  try {
    receipt = readReceipt(root);
  } catch (error) {
    receiptError = error;
  }
  const result = baseResult({
    mode: "check",
    projectRoot: root,
    manifest,
    hostMode: receipt?.hostMode || "standalone",
  });
  const addIssue = (code, pathValue = null) => {
    if (!result.issues.some((issue) => issue.code === code && issue.path === pathValue)) {
      result.issues.push({ code, ...(pathValue ? { path: pathValue } : {}) });
    }
  };
  if (receiptError) addIssue(receiptError.code || "invalid-install-receipt", RECEIPT_PATH);
  else if (!receipt) addIssue("missing-install-receipt", RECEIPT_PATH);

  const knownModules = allModuleNames(manifest);
  const receiptModulesValid = (
    receipt?.modules === undefined
    || (
      Array.isArray(receipt.modules)
      && receipt.modules.length > 0
      && receipt.modules.every((name) => typeof name === "string" && knownModules.has(name))
      && receipt.modules.includes(CORE_MODULE)
    )
  );
  const modules = receipt && receiptModulesValid
    ? moduleSelection({ manifest, receipt })
    : knownModules;

  let source = null;
  let expectedManagedFiles = null;
  try {
    source = resolveSkillsSourceRoot(skillsSourceRoot);
    expectedManagedFiles = expectedManagedInventory({
      manifest,
      genericRoot: source.genericRoot,
      modules,
    });
  } catch (error) {
    addIssue(error.code || "invalid-agent-automation-source");
  }

  const mergeContract = expectedMergeFragments();
  if (receipt) {
    const generatedInventoryValid = (
      receipt.generatedFiles
      && typeof receipt.generatedFiles === "object"
      && !Array.isArray(receipt.generatedFiles)
      && Object.keys(receipt.generatedFiles).length === 1
      && SHA_PATTERN.test(receipt.generatedFiles[PROFILE_PATH] || "")
    );
    const manualActionsValid = stableJson(receipt.manualActions) === stableJson([
      { code: "import-figma-manifest", completed: false },
    ]);
    if (
      receipt.templateVersion !== manifest.templateVersion
      || !["standalone", "compatible"].includes(receipt.hostMode)
      || !receiptModulesValid
      || (expectedManagedFiles && !exactDigestInventory(receipt.managedFiles, expectedManagedFiles))
      || !generatedInventoryValid
      || !exactMergeFragments(receipt.mergeFragments, mergeContract.receiptEntries)
      || !manualActionsValid
    ) {
      addIssue("install-receipt-inventory-drift", RECEIPT_PATH);
    }
  }

  if (expectedManagedFiles) {
    for (const [target, expectedHash] of Object.entries(expectedManagedFiles)) {
      const destination = path.join(root, target);
      try {
        assertDestinationContained(root, destination, target);
      } catch (error) {
        addIssue(error.code || "project-root-escape", target);
        continue;
      }
      if (
        !fs.existsSync(destination)
        || !fs.statSync(destination).isFile()
        || fs.lstatSync(destination).isSymbolicLink()
        || sha256(fs.readFileSync(destination)) !== expectedHash
      ) {
        addIssue(
          target.includes(`/${COMPANION_SKILL}/`)
            ? "skill-mirror-drift"
            : "managed-file-drift",
          target,
        );
      }
    }
  }

  const profilePath = path.join(root, PROFILE_PATH);
  if (
    receipt?.generatedFiles?.[PROFILE_PATH]
    && (
      !fs.existsSync(profilePath)
      || !fs.statSync(profilePath).isFile()
      || fs.lstatSync(profilePath).isSymbolicLink()
      || sha256(fs.readFileSync(profilePath)) !== receipt.generatedFiles[PROFILE_PATH]
    )
  ) {
    addIssue("generated-file-drift", PROFILE_PATH);
  }

  try {
    if (!source) throw new InstallerError("invalid-agent-automation-source", "Generic source is unavailable.");
    const validator = await loadConfigValidator(source.root);
    const validation = validator.loadAndValidateConfig({ projectRoot: root, configPath: CONFIG_PATH });
    const cleanupTask = validation.config?.tasks?.[mergeContract.taskFragment.taskId];
    if (
      !validation.valid
      || !cleanupTask
      || normalizeFragment(cleanupTask) !== normalizeFragment(mergeContract.taskFragment.value)
    ) {
      addIssue("invalid-agent-automation-config", CONFIG_PATH);
    }
  } catch (error) {
    addIssue(error.code || "invalid-agent-automation-config", CONFIG_PATH);
  }
  try {
    const gitignorePath = path.join(root, ".gitignore");
    assertDestinationContained(root, gitignorePath, ".gitignore");
    const gitignoreLines = fs.readFileSync(gitignorePath, "utf8")
      .replace(/\r\n/g, "\n")
      .split("\n");
    if (!mergeContract.gitignoreLines.every((line) => gitignoreLines.includes(line))) {
      addIssue("merge-fragment-drift", ".gitignore");
    }
  } catch (error) {
    addIssue(
      error instanceof InstallerError ? error.code : "merge-fragment-drift",
      ".gitignore",
    );
  }

  try {
    assertDestinationContained(root, profilePath, PROFILE_PATH);
    const profile = readJson(profilePath, "invalid-project-profile");
    const hostMode = receipt?.hostMode || profile.host?.mode;
    if (
      profile.host?.mode !== hostMode
      || !profile.features
      || profile.features.cleanup !== true
      || profile.features.workflowStatus !== true
      || typeof profile.features.review !== "boolean"
    ) {
      throw new InstallerError("host-profile-drift", "Installed host profile is inconsistent.");
    }
    const hostDescriptor = await validateHostAdapter({
      projectRoot: root,
      hostMode,
      hostAdapter: profile.host.adapter,
    });
    if (
      hostDescriptor.adapter !== profile.host.adapter
      || hostDescriptor.reviewEnabled !== profile.features.review
    ) {
      throw new InstallerError("host-feature-drift", "Installed host feature projection is inconsistent.");
    }
    validateProfileShape(profile, {
      hostMode,
      adapter: hostDescriptor.adapter,
      reviewEnabled: hostDescriptor.reviewEnabled,
    });
  } catch (error) {
    const code = [
      "host-adapter-smoke-wrote-files",
      "incomplete-review-adapter",
      "unsupported-host-contract",
      "invalid-host-adapter",
      "host-adapter-sandbox-unavailable",
      "host-profile-drift",
      "host-feature-drift",
    ].includes(error.code)
      ? error.code
      : "invalid-project-profile";
    addIssue(code, code.includes("adapter") ? undefined : PROFILE_PATH);
  }
  if (!path.isAbsolute(result.manifestPath) || !fs.existsSync(result.manifestPath)) {
    addIssue("missing-plugin-manifest", "figma/design-automation-hub/manifest.json");
  }
  result.result = result.issues.length ? "failed" : "valid";
  result.nextActions = result.issues.length
    ? [{ code: "resolve-installed-project-issues" }]
    : [{ code: "start-local-coordinator" }, { code: "import-figma-manifest" }];
  return publicResult(result);
}

export function normalizeOptions(input = {}) {
  return {
    projectRoot: input.projectRoot,
    hostMode: input.hostMode,
    skillsSourceRoot: input.skillsSourceRoot,
    projectId: input.projectId,
    projectName: input.projectName,
    figmaFileKeys: Array.isArray(input.figmaFileKeys) ? input.figmaFileKeys : [],
    projectProfile: input.projectProfile,
    hostAdapter: input.hostAdapter,
    dryRun: Boolean(input.dryRun),
    inspect: Boolean(input.inspect),
    update: Boolean(input.update),
    check: Boolean(input.check),
    forceManaged: Boolean(input.forceManaged),
    withTaskBoardDispatch: Boolean(input.withTaskBoardDispatch),
    json: Boolean(input.json),
  };
}

export async function executeInstall(input, hooks = {}) {
  const options = normalizeOptions(input);
  if (!options.projectRoot) throw new InstallerError("missing-project-root", "--project-root is required.");
  if (!["standalone", "compatible"].includes(options.hostMode)) {
    throw new InstallerError("missing-host-mode", "--host-mode must be standalone or compatible.");
  }
  if (options.forceManaged && !options.update) {
    throw new InstallerError("incompatible-options", "--force-managed requires --update.");
  }
  if ([options.inspect, options.update, options.check].filter(Boolean).length > 1 || options.check && options.dryRun) {
    throw new InstallerError("incompatible-options", "Inspect, update, check, and dry-run options conflict.");
  }
  if (options.check) return checkInstalledProject(options);
  const plan = await createInstallPlan(options);
  if (options.dryRun || options.inspect) return publicResult(plan);
  if (plan.conflicts.length) return publicResult(plan);
  commitInstallPlan(plan, hooks);
  return publicResult(plan);
}

function parseCli(argv) {
  const booleanFlags = new Set(["dry-run", "update", "force-managed", "with-task-board-dispatch", "json", "inspect", "check", "help"]);
  const valueFlags = new Set([
    "project-root",
    "host-mode",
    "skills-source-root",
    "project-id",
    "project-name",
    "figma-file-key",
    "project-profile",
    "host-adapter",
  ]);
  const parsed = { figmaFileKeys: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) throw new InstallerError("unknown-option", `Unknown argument: ${token}`);
    const name = token.slice(2);
    if (booleanFlags.has(name)) {
      parsed[name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = true;
      continue;
    }
    if (!valueFlags.has(name)) throw new InstallerError("unknown-option", `Unknown option: --${name}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new InstallerError("missing-option-value", `--${name} requires a value.`);
    if (name === "figma-file-key") parsed.figmaFileKeys.push(value);
    else parsed[name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
    index += 1;
  }
  return parsed;
}

function printUsage() {
  process.stdout.write(`Usage:
  node design-automation-hub/scripts/install-design-automation-hub.mjs --project-root <absolute-root> --host-mode standalone --dry-run --json
  node design-automation-hub/scripts/install-design-automation-hub.mjs --project-root <absolute-root> --host-mode standalone --project-id <id> --project-name <name> --figma-file-key <key> [--with-task-board-dispatch] --json
  node design-automation-hub/scripts/install-design-automation-hub.mjs --project-root <absolute-root> --host-mode compatible --host-adapter <relative-module> --update --json
`);
}

async function cli() {
  let parsed;
  try {
    parsed = parseCli(process.argv.slice(2));
    if (parsed.help) {
      printUsage();
      return;
    }
    const output = await executeInstall(parsed);
    if (parsed.json) process.stdout.write(`${JSON.stringify(output)}\n`);
    else process.stdout.write(`${output.result}: ${output.projectRoot}\n`);
    if (["conflict", "failed", "needs-bootstrap", "needs-profile"].includes(output.result)) process.exitCode = 1;
  } catch (error) {
    const fallback = {
      schemaVersion: 1,
      mode: parsed?.update ? "update" : parsed?.check ? "check" : parsed?.dryRun ? "dry-run" : "install",
      result: error.result || "failed",
      projectRoot: path.isAbsolute(parsed?.projectRoot || "") ? parsed.projectRoot : "",
      templateVersion: fs.existsSync(manifestPath) ? readJson(manifestPath, "invalid-template-manifest").templateVersion : "",
      hostMode: parsed?.hostMode || "",
      installed: [],
      updated: [],
      merged: [],
      unchanged: [],
      conflicts: error.result === "conflict" ? [{ path: error.path || "", code: error.code || "install-failed" }] : [],
      issues: [{ code: error.code || "install-failed", ...(error.path ? { path: error.path } : {}) }],
      manifestPath: path.isAbsolute(parsed?.projectRoot || "")
        ? path.join(parsed.projectRoot, "figma/design-automation-hub/manifest.json")
        : "",
      manualActions: [{ code: "import-figma-manifest", completed: false }],
      nextActions: [],
    };
    process.stdout.write(`${JSON.stringify(fallback)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await cli();
}
