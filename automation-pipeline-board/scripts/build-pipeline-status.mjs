#!/usr/bin/env node

// Derives a pipeline status object from evidence already on disk: declared
// artifact paths, audit exit codes, and the durable run summaries the generic
// orchestrator writes. It never starts a runner and never mutates the project
// beyond the single status file it is asked to write.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SCHEMA_VERSION = 1;
const DEFAULT_DEFINITION = ".pipeline-board/pipeline.json";
const DEFAULT_OUT = ".pipeline-board/status.json";
// A run whose durable record has not moved for longer than its own timeout plus
// this grace period is reported as possibly stopped rather than in progress.
export const STALE_RUN_GRACE_MS = 120000;
const COMMAND_TIMEOUT_MS = 120000;

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const skillsRoot = path.resolve(scriptDir, "../..");

export class BuildError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function fail(code, message) {
  throw new BuildError(code, message);
}

export function parseArgs(argv) {
  const options = { definition: DEFAULT_DEFINITION, out: DEFAULT_OUT };
  const allowed = new Set(["--project-root", "--definition", "--out"]);
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!allowed.has(token)) fail("unknown-option", `Unknown option: ${token}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) fail("missing-option-value", `Missing value for ${token}`);
    if (token === "--project-root") options.projectRoot = value;
    if (token === "--definition") options.definition = value;
    if (token === "--out") options.out = value;
    index += 1;
  }
  if (!options.projectRoot) fail("missing-project-root", "--project-root is required");
  if (!path.isAbsolute(options.projectRoot)) {
    fail("relative-project-root", "--project-root must be absolute");
  }
  return options;
}

export function resolveRoot(projectRoot) {
  if (!fs.existsSync(projectRoot)) fail("missing-project-root", `Project root does not exist: ${projectRoot}`);
  const resolved = fs.realpathSync(projectRoot);
  if (!fs.statSync(resolved).isDirectory()) {
    fail("missing-project-root", `Project root is not a directory: ${projectRoot}`);
  }
  const home = process.env.HOME ?? "";
  if (resolved === path.parse(resolved).root || (home && resolved === home)) {
    fail("unsafe-project-root", "Refusing to target the filesystem root or the home directory");
  }
  return resolved;
}

// Every declared path must stay inside the project after symlink resolution.
// Resolving the nearest existing ancestor lets a not-yet-created path be checked
// without treating its absence as an escape.
export function containedPath(root, relative, field) {
  if (typeof relative !== "string" || !relative.trim()) {
    fail("invalid-path", `${field} must be a non-empty string`);
  }
  if (path.isAbsolute(relative)) fail("path-escape", `${field} must be project-relative: ${relative}`);
  const joined = path.resolve(root, relative);
  let probe = joined;
  while (!fs.existsSync(probe) && probe !== path.dirname(probe)) probe = path.dirname(probe);
  let realProbe;
  try {
    realProbe = fs.realpathSync(probe);
  } catch {
    fail("path-escape", `${field} could not be resolved: ${relative}`);
  }
  const suffix = path.relative(probe, joined);
  const candidate = suffix ? path.join(realProbe, suffix) : realProbe;
  const rel = path.relative(root, candidate);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    fail("path-escape", `${field} escapes the project root: ${relative}`);
  }
  return candidate;
}

function assertCommand(value, field) {
  if (typeof value !== "object" || value === null) fail("invalid-command", `${field} must be an object`);
  if (typeof value.command !== "string" || !value.command.trim()) {
    fail("invalid-command", `${field}.command must be a non-empty string`);
  }
  if (!Array.isArray(value.args) || value.args.some((item) => typeof item !== "string")) {
    fail("invalid-command", `${field}.args must be an array of strings`);
  }
}

// A declared path that nothing enforces rots silently as downstream tooling
// changes. Requiring the citation — and checking it names the artifact — is what
// stops a drawn edge from disagreeing with the tool it depicts.
function validateEnforcement(handoff, field) {
  if (typeof handoff.enforcedBy !== "string" || !handoff.enforcedBy.trim()) {
    fail("missing-enforcement-citation", `${field}.enforcedBy is required`);
  }
  const scriptPath = path.resolve(skillsRoot, handoff.enforcedBy);
  if (!fs.existsSync(scriptPath)) {
    fail("missing-enforcement-script", `${field}.enforcedBy does not exist: ${handoff.enforcedBy}`);
  }
  const source = fs.readFileSync(scriptPath, "utf8");
  const basename = path.basename(handoff.artifact);
  if (!source.includes(basename)) {
    fail(
      "enforcement-does-not-check-artifact",
      `${field}.enforcedBy never references ${basename}; the citation is stale`,
    );
  }
}

export function loadDefinition(root, definitionRelative) {
  const absolute = containedPath(root, definitionRelative, "definition");
  if (!fs.existsSync(absolute)) {
    fail("missing-definition", `Pipeline definition not found: ${definitionRelative}`);
  }
  let definition;
  try {
    definition = JSON.parse(fs.readFileSync(absolute, "utf8"));
  } catch (error) {
    fail("invalid-definition", `Cannot parse pipeline definition: ${error.message}`);
  }
  if (definition?.schemaVersion !== SCHEMA_VERSION) {
    fail("unsupported-schema-version", `Pipeline definition schemaVersion must be ${SCHEMA_VERSION}`);
  }
  if (!Array.isArray(definition.sources) || !Array.isArray(definition.stages)) {
    fail("invalid-definition", "Pipeline definition must contain sources[] and stages[]");
  }
  if (!definition.stages.length) {
    fail("invalid-definition", "Pipeline definition needs at least one stage");
  }

  const sourceIds = new Set();
  for (const source of definition.sources) {
    if (!source?.id || !source?.title) fail("invalid-definition", "Each source needs id and title");
    if (sourceIds.has(source.id)) fail("duplicate-source-id", `Duplicate source id: ${source.id}`);
    sourceIds.add(source.id);
    if (!Array.isArray(source.evidence) || !source.evidence.length) {
      fail("invalid-definition", `Source ${source.id} needs a non-empty evidence array`);
    }
    source.evidence.forEach((entry, index) =>
      containedPath(root, entry, `sources.${source.id}.evidence[${index}]`),
    );
  }

  const stageIds = definition.stages.map((stage) => stage?.id);
  const seen = new Set();
  for (const stage of definition.stages) {
    if (!stage?.id || !stage?.title) fail("invalid-definition", "Each stage needs id and title");
    if (seen.has(stage.id)) fail("duplicate-stage-id", `Duplicate stage id: ${stage.id}`);
    seen.add(stage.id);
    if (!Array.isArray(stage.produces)) fail("invalid-definition", `Stage ${stage.id} needs produces[]`);
    stage.produces.forEach((entry, index) =>
      containedPath(root, entry, `stages.${stage.id}.produces[${index}]`),
    );
    if (stage.audit !== undefined) assertCommand(stage.audit, `stages.${stage.id}.audit`);
    if (stage.pendingDecisions !== undefined) {
      assertCommand(stage.pendingDecisions, `stages.${stage.id}.pendingDecisions`);
      if (typeof stage.pendingDecisions.countField !== "string") {
        fail("invalid-command", `stages.${stage.id}.pendingDecisions.countField must be a string`);
      }
    }
    for (const [index, handoff] of (stage.handoffs ?? []).entries()) {
      const field = `stages.${stage.id}.handoffs[${index}]`;
      if (!handoff?.to || !stageIds.includes(handoff.to)) {
        fail("unknown-handoff-target", `${field}.to does not name a declared stage`);
      }
      if (stageIds.indexOf(handoff.to) <= stageIds.indexOf(stage.id)) {
        fail("handoff-not-forward", `${field}.to must name a later stage`);
      }
      containedPath(root, handoff.artifact, `${field}.artifact`);
      validateEnforcement(handoff, field);
    }
  }
  return definition;
}

function runCommand(command, root) {
  return spawnSync(command.command, command.args, {
    cwd: root,
    encoding: "utf8",
    timeout: COMMAND_TIMEOUT_MS,
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });
}

function deriveSources(root, definition) {
  return definition.sources.map((source) => ({
    id: source.id,
    title: source.title,
    present: source.evidence.some((entry) => fs.existsSync(path.resolve(root, entry))),
  }));
}

function fileEvidence(root, produces) {
  const produced = [];
  const missing = [];
  for (const relative of produces) {
    const absolute = path.resolve(root, relative);
    if (fs.existsSync(absolute)) {
      produced.push({ path: relative, modifiedAt: fs.statSync(absolute).mtime.toISOString() });
    } else {
      missing.push(relative);
    }
  }
  return { produced, missing };
}

function derivePendingDecisions(root, stage) {
  if (!stage.pendingDecisions) return null;
  const result = runCommand(stage.pendingDecisions, root);
  if (result.status !== 0 || !result.stdout) return null;
  try {
    const parsed = JSON.parse(result.stdout);
    const value = parsed?.counts?.[stage.pendingDecisions.countField]
      ?? parsed?.[stage.pendingDecisions.countField];
    return Number.isInteger(value) ? value : null;
  } catch {
    return null;
  }
}

// Loading the orchestrator's own helpers keeps run-state resolution and its
// containment checks in one place instead of reimplementing them here.
async function loadRunContext(root) {
  try {
    const validateModule = await import(
      path.join(skillsRoot, "agent-automation/scripts/validate-project-config.mjs")
    );
    const statusModule = await import(
      path.join(skillsRoot, "agent-automation/scripts/status.mjs")
    );
    const configPath = path.join(root, ".agent-automation/config.json");
    if (!fs.existsSync(configPath)) return null;
    const validated = validateModule.loadAndValidateConfig({ projectRoot: root });
    if (!validated?.valid || !validated.config?.stateDir || !validated.config?.tasks) return null;
    return { config: validated.config, findRunSummary: statusModule.findRunSummary };
  } catch {
    return null;
  }
}

function summariesForTask(context, root, taskId) {
  if (!context || !taskId) return null;
  const stateDir = path.resolve(root, context.config.stateDir);
  if (!fs.existsSync(stateDir)) return null;
  const entries = fs
    .readdirSync(stateDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json") && !entry.name.startsWith("."));
  const summaries = [];
  for (const entry of entries) {
    try {
      const parsed = JSON.parse(fs.readFileSync(path.join(stateDir, entry.name), "utf8"));
      if (parsed?.runId && parsed.taskId === taskId) summaries.push(parsed);
    } catch {
      // An unparseable summary is not an error; it simply contributes nothing.
    }
  }
  if (!summaries.length) return null;
  summaries.sort(
    (left, right) =>
      Date.parse(right.updatedAt ?? right.startedAt ?? 0) - Date.parse(left.updatedAt ?? left.startedAt ?? 0),
  );
  return summaries;
}

function lastSuccessfulCompletionMs(summaries) {
  if (!summaries) return null;
  const completed = summaries.find((summary) => summary.phase === "completed");
  if (!completed) return null;
  const stamp = Date.parse(completed.finishedAt ?? completed.updatedAt ?? "");
  return Number.isFinite(stamp) ? stamp : null;
}

// Recording stops at the first failing check, so the number of results present
// is not the number of checks configured. Displaying the recorded count alone
// would report "1 of 1 passed" for a three-check task.
function deriveVerification(context, taskId, summary) {
  const configured = context?.config?.tasks?.[taskId]?.verification?.length ?? 0;
  const recorded = Array.isArray(summary?.verification) ? summary.verification : [];
  const passed = recorded.filter((item) => item?.passed === true).length;
  const failed = recorded.filter((item) => item?.passed === false).length;
  const notRun = Math.max(0, configured - recorded.length);
  return { configured, passed, failed, notRun };
}

function deriveRun(context, root, stage, nowMs) {
  const summaries = summariesForTask(context, root, stage.taskId);
  if (!summaries) return null;
  const latest = summaries[0];
  const timeoutMs = context.config.runners?.[0]?.timeoutMs ?? 1800000;
  const updatedMs = Date.parse(latest.updatedAt ?? latest.startedAt ?? "");
  const inProgress = latest.phase === "running" || latest.phase === "in-progress";
  const possiblyStopped =
    inProgress && Number.isFinite(updatedMs) && nowMs - updatedMs > timeoutMs + STALE_RUN_GRACE_MS;
  return {
    phase: possiblyStopped ? "possibly-stopped" : latest.phase ?? null,
    runId: latest.runId ?? null,
    startedAt: latest.startedAt ?? null,
    updatedAt: latest.updatedAt ?? null,
    finishedAt: latest.finishedAt ?? null,
    selectedRunner: latest.selectedRunner
      ? { id: latest.selectedRunner.id ?? null, label: latest.selectedRunner.label ?? null }
      : null,
    fallback: (latest.attempts ?? []).map((attempt) => ({
      runnerId: attempt.runnerId ?? null,
      outcome: attempt.outcome ?? null,
    })),
    verification: deriveVerification(context, stage.taskId, latest),
  };
}

function deriveStages(root, definition, context, nowMs) {
  return definition.stages.map((stage) => {
    const evidence = fileEvidence(root, stage.produces);
    const auditResult = stage.audit ? runCommand(stage.audit, root) : null;
    const verified = auditResult ? auditResult.status === 0 : false;
    const state = evidence.produced.length === 0 ? "not-started" : verified ? "verified" : "produced";
    return {
      id: stage.id,
      title: stage.title,
      state,
      verified,
      auditConfigured: Boolean(stage.audit),
      produced: evidence.produced,
      missing: evidence.missing,
      pendingDecisions: derivePendingDecisions(root, stage),
      run: deriveRun(context, root, stage, nowMs),
    };
  });
}

// Existence alone stays green forever over outdated work. Comparing the
// artifact's modification time against the downstream stage's last successful
// completion is what surfaces that.
function deriveEdges(root, definition, context) {
  const byId = new Map(definition.stages.map((stage) => [stage.id, stage]));
  const edges = [];
  for (const stage of definition.stages) {
    for (const handoff of stage.handoffs ?? []) {
      const absolute = path.resolve(root, handoff.artifact);
      if (!fs.existsSync(absolute)) {
        edges.push({
          from: stage.id,
          to: handoff.to,
          artifact: handoff.artifact,
          state: "blocked",
          reason: `${handoff.artifact} 尚未產出，下游無法開始`,
        });
        continue;
      }
      const artifactMs = fs.statSync(absolute).mtimeMs;
      const downstream = byId.get(handoff.to);
      const completedMs = lastSuccessfulCompletionMs(
        summariesForTask(context, root, downstream?.taskId),
      );
      if (completedMs !== null && artifactMs > completedMs) {
        edges.push({
          from: stage.id,
          to: handoff.to,
          artifact: handoff.artifact,
          state: "stale",
          reason: `${handoff.artifact} 在下游完成後又更新過，這一段已經過期`,
        });
        continue;
      }
      edges.push({
        from: stage.id,
        to: handoff.to,
        artifact: handoff.artifact,
        state: "satisfied",
        reason: `${handoff.artifact} 已產出`,
      });
    }
  }
  return edges;
}

export async function buildStatus({ projectRoot, definition: definitionRelative, now }) {
  const root = resolveRoot(projectRoot);
  const definition = loadDefinition(root, definitionRelative);
  const context = await loadRunContext(root);
  const nowMs = now ?? Date.now();
  return {
    schemaVersion: SCHEMA_VERSION,
    projectRoot: root,
    generatedAt: new Date(nowMs).toISOString(),
    sources: deriveSources(root, definition),
    acceptedSourceKinds: definition.sources.map((source) => source.title),
    stages: deriveStages(root, definition, context, nowMs),
    edges: deriveEdges(root, definition, context),
    hasRunData: Boolean(context),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const status = await buildStatus({
    projectRoot: options.projectRoot,
    definition: options.definition,
  });
  const outAbsolute = containedPath(fs.realpathSync(options.projectRoot), options.out, "out");
  fs.mkdirSync(path.dirname(outAbsolute), { recursive: true });
  fs.writeFileSync(outAbsolute, `${JSON.stringify(status, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ ok: true, out: outAbsolute }, null, 2)}\n`);
}

const invokedDirectly = process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  main().catch((error) => {
    const code = error instanceof BuildError ? error.code : "build-failed";
    process.stderr.write(`${JSON.stringify({ ok: false, code, message: error.message }, null, 2)}\n`);
    process.exitCode = 1;
  });
}
