#!/usr/bin/env node

// Aggregates many projects' automation-pipeline-board status into one portfolio status
// object. Per project it shells out to the existing automation-pipeline-board build and
// render commands — the status object those commands produce is the stable
// contract, so nothing here re-derives stage, edge, or run state, and nothing
// here imports automation-pipeline-board internals.
//
// Failure is scoped deliberately: a broken portfolio definition kills the whole
// run before anything is written, while a broken individual project becomes an
// error entry and the batch continues. One dead project root must never hide
// the status of the other nine.
//
// Projects run sequentially so entries keep the definition's order and two
// aggregations of the same inputs produce the same output.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SCHEMA_VERSION = 1;
// The embedded per-project status contract this aggregator understands.
export const SUPPORTED_STATUS_SCHEMA_VERSION = 1;
const DEFAULT_OUT_DIR_NAME = "dashboard";
const CHILD_TIMEOUT_MS = 120000;
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const pipelineBuildScript = path.resolve(scriptDir, "../../automation-pipeline-board/scripts/build-pipeline-status.mjs");
const pipelineRenderScript = path.resolve(scriptDir, "../../automation-pipeline-board/scripts/render-pipeline-board.mjs");
// The per-project build command's own documented output location. The
// aggregator reads it back; it never writes anything else into a project.
const PROJECT_STATUS_RELATIVE = ".pipeline-board/status.json";

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
  const options = {};
  const allowed = new Set(["--portfolio", "--out-dir"]);
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!allowed.has(token)) fail("unknown-option", `Unknown option: ${token}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) fail("missing-option-value", `Missing value for ${token}`);
    if (token === "--portfolio") options.portfolio = value;
    if (token === "--out-dir") options.outDir = value;
    index += 1;
  }
  if (!options.portfolio) fail("missing-portfolio", "--portfolio is required");
  return options;
}

// The whole definition is validated before any project is touched and before
// any output path is created: a portfolio-level mistake exits non-zero with a
// stable code and leaves no partial output to mistake for a result.
export function loadPortfolio(portfolioPath) {
  const absolute = path.resolve(portfolioPath);
  if (!fs.existsSync(absolute)) {
    fail("missing-portfolio", `Portfolio definition not found: ${portfolioPath}`);
  }
  let portfolio;
  try {
    portfolio = JSON.parse(fs.readFileSync(absolute, "utf8"));
  } catch (error) {
    fail("invalid-portfolio", `Cannot parse portfolio definition: ${error.message}`);
  }
  if (typeof portfolio !== "object" || portfolio === null) {
    fail("invalid-portfolio", "Portfolio definition must be a JSON object");
  }
  if (portfolio.schemaVersion !== SCHEMA_VERSION) {
    fail("unsupported-schema-version", `Portfolio schemaVersion must be ${SCHEMA_VERSION}`);
  }
  if (!Array.isArray(portfolio.projects)) {
    fail("invalid-portfolio", "Portfolio definition must contain projects[]");
  }
  if (!portfolio.projects.length) {
    fail("empty-portfolio", "projects[] must not be empty; a portfolio with nothing to watch is a configuration mistake");
  }
  const seen = new Set();
  for (const [index, project] of portfolio.projects.entries()) {
    const field = `projects[${index}]`;
    if (typeof project !== "object" || project === null) {
      fail("invalid-project-entry", `${field} must be an object`);
    }
    // The id doubles as the board file name in the output directory, so it is
    // held to strict kebab-case: no separators, no dots, no path tricks.
    if (typeof project.id !== "string" || !ID_PATTERN.test(project.id)) {
      fail("invalid-project-entry", `${field}.id must be a kebab-case identifier`);
    }
    if (typeof project.name !== "string" || !project.name.trim()) {
      fail("invalid-project-entry", `${field}.name must be a non-empty string`);
    }
    if (typeof project.root !== "string" || !project.root.trim()) {
      fail("invalid-project-entry", `${field}.root must be a non-empty path`);
    }
    if (seen.has(project.id)) {
      fail("duplicate-project-id", `Duplicate project id: ${project.id}`);
    }
    seen.add(project.id);
  }
  return { absolute, portfolio };
}

export function resolveProjectRoot(portfolioAbsolute, declaredRoot) {
  return path.isAbsolute(declaredRoot)
    ? declaredRoot
    : path.resolve(path.dirname(portfolioAbsolute), declaredRoot);
}

function runChild(script, args) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8",
    timeout: CHILD_TIMEOUT_MS,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function childErrorDetail(result) {
  try {
    const parsed = JSON.parse(result.stderr);
    if (parsed && typeof parsed.code === "string") {
      return `${parsed.code}: ${parsed.message ?? ""}`.trim();
    }
  } catch {
    // stderr was not the scripts' JSON error shape; fall through to raw text.
  }
  const raw = `${result.stderr || result.stdout || ""}`.trim();
  return raw ? raw.slice(0, 300) : "child process exited non-zero";
}

function errorEntry(project, code, reason) {
  return { id: project.id, name: project.name, declaredRoot: project.root, ok: false, error: { code, reason } };
}

// Guard for the embedded per-project status contract. Today's automation-pipeline-board
// always writes version 1, so this branch is unreachable end-to-end until a
// future automation-pipeline-board ships a new schema; it is exported so the checker can
// pin the guard directly instead of pretending to reach it through the CLI.
export function embeddedStatusError(status) {
  if (status?.schemaVersion !== SUPPORTED_STATUS_SCHEMA_VERSION) {
    return {
      code: "unsupported-status-schema",
      reason: `狀態物件 schemaVersion 應為 ${SUPPORTED_STATUS_SCHEMA_VERSION}，實際為 ${status?.schemaVersion}`,
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Attention derivation
// ---------------------------------------------------------------------------

// One attention item per card, by fixed priority. This is derived here, once,
// so the renderer displays it verbatim and can never reorder the policy:
// a possibly-stopped run outranks a broken handoff outranks pending decisions.
export function deriveAttention(status) {
  const stalled = status.stages.find((stage) => stage.run?.phase === "possibly-stopped");
  if (stalled) {
    return {
      priority: 1,
      kind: "needs-confirmation",
      stageId: stalled.id,
      stageTitle: stalled.title,
      reason: "執行紀錄停在執行中且已超過逾時上限，請人工確認是否還在跑",
    };
  }
  const titles = new Map(status.stages.map((stage) => [stage.id, stage.title]));
  const brokenEdge = status.edges.find((edge) => edge.state === "blocked" || edge.state === "stale");
  if (brokenEdge) {
    return {
      priority: 2,
      kind: brokenEdge.state === "blocked" ? "blocked-edge" : "stale-edge",
      from: brokenEdge.from,
      fromTitle: titles.get(brokenEdge.from) ?? brokenEdge.from,
      to: brokenEdge.to,
      toTitle: titles.get(brokenEdge.to) ?? brokenEdge.to,
      artifact: brokenEdge.artifact,
      reason: brokenEdge.reason,
    };
  }
  const pending = status.stages.reduce(
    (total, stage) => total + (Number.isInteger(stage.pendingDecisions) ? stage.pendingDecisions : 0),
    0,
  );
  if (pending > 0) {
    return { priority: 3, kind: "pending-decisions", count: pending, reason: `${pending} 項決定等待設計師處理` };
  }
  const allVerified = status.stages.every((stage) => stage.state === "verified");
  return allVerified
    ? { priority: 4, kind: "healthy-verified", reason: "所有階段都已通過稽核" }
    : { priority: 4, kind: "healthy-unverified", reason: "銜接都成立，但還有階段只有檔案、沒有通過稽核" };
}

// Where the designer's eye should land: the first stage that is not verified
// yet, in pipeline order. All-verified projects have no current stage.
export function deriveCurrentStage(status) {
  const current = status.stages.find((stage) => stage.state !== "verified");
  return current ? { id: current.id, title: current.title, state: current.state } : null;
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

function aggregateProject(project, portfolioAbsolute, outDir) {
  const rootAbsolute = resolveProjectRoot(portfolioAbsolute, project.root);
  if (!fs.existsSync(rootAbsolute) || !fs.statSync(rootAbsolute).isDirectory()) {
    return errorEntry(project, "missing-project-root", `根目錄不存在：${project.root}`);
  }

  const build = runChild(pipelineBuildScript, ["--project-root", rootAbsolute]);
  if (build.status !== 0) {
    return errorEntry(project, "project-build-failed", `流程板建置失敗（${childErrorDetail(build)}）`);
  }

  const statusPath = path.join(rootAbsolute, PROJECT_STATUS_RELATIVE);
  let status;
  try {
    status = JSON.parse(fs.readFileSync(statusPath, "utf8"));
  } catch (error) {
    return errorEntry(project, "unreadable-status", `無法讀取流程板狀態檔（${error.message}）`);
  }
  const schemaError = embeddedStatusError(status);
  if (schemaError) {
    return errorEntry(project, schemaError.code, schemaError.reason);
  }

  const boardFile = `${project.id}.html`;
  const render = runChild(pipelineRenderScript, ["--status", statusPath, "--out", path.join(outDir, boardFile)]);
  if (render.status !== 0) {
    return errorEntry(project, "project-render-failed", `流程板渲染失敗（${childErrorDetail(render)}）`);
  }

  return {
    id: project.id,
    name: project.name,
    declaredRoot: project.root,
    ok: true,
    boardFile,
    currentStage: deriveCurrentStage(status),
    attention: deriveAttention(status),
    status,
  };
}

export function buildPortfolioStatus({ portfolio: portfolioPath, outDir: outDirOption, now }) {
  const { absolute, portfolio } = loadPortfolio(portfolioPath);
  const outDir = path.resolve(outDirOption ?? path.join(path.dirname(absolute), DEFAULT_OUT_DIR_NAME));
  fs.mkdirSync(outDir, { recursive: true });

  const projects = portfolio.projects.map((project) => aggregateProject(project, absolute, outDir));

  return {
    outDir,
    status: {
      schemaVersion: SCHEMA_VERSION,
      portfolioPath: absolute,
      generatedAt: new Date(now ?? Date.now()).toISOString(),
      projects,
    },
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const { outDir, status } = buildPortfolioStatus(options);
  const outPath = path.join(outDir, "portfolio-status.json");
  fs.writeFileSync(outPath, `${JSON.stringify(status, null, 2)}\n`);
  const failed = status.projects.filter((entry) => !entry.ok).length;
  process.stdout.write(
    `${JSON.stringify({ ok: true, out: outPath, projects: status.projects.length, failed }, null, 2)}\n`,
  );
}

// realpathSync throws when argv[1] is not a real file (stdin scripts, REPL
// imports), and an importer must never crash on module load, so the comparison
// is guarded rather than assumed.
function isInvokedDirectly() {
  if (!process.argv[1]) return false;
  try {
    return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}
if (isInvokedDirectly()) {
  main().catch((error) => {
    const code = error instanceof BuildError ? error.code : "build-failed";
    process.stderr.write(`${JSON.stringify({ ok: false, code, message: error.message }, null, 2)}\n`);
    process.exitCode = 1;
  });
}
