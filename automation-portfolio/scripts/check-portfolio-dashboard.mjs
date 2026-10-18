#!/usr/bin/env node

// Deterministic fixture checks for the portfolio dashboard. One temporary
// portfolio holds several throwaway projects in distinct states; a single real
// aggregation run over it feeds most scenarios, and every assertion reads the
// observable output: exit codes, the aggregated status object, the per-project
// boards, and the overview HTML. Nothing here calls an AI runner or touches
// the network; instants that drive staleness and overdue detection are fixed
// past timestamps written into fixtures, so the checks cannot flake with the
// clock.
//
// Check names are the seven scenarios the change contract requires; the final
// line prints them so an acceptance run can grep for each one.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { embeddedStatusError } from "./build-portfolio-status.mjs";

const scriptRoot = path.dirname(fileURLToPath(import.meta.url));
const buildScript = path.join(scriptRoot, "build-portfolio-status.mjs");
const renderScript = path.join(scriptRoot, "render-portfolio-dashboard.mjs");
const pipelineDefinitionPath = path.resolve(scriptRoot, "../../automation-pipeline-board/assets/default-pipeline.json");
const orchestratorExampleConfigPath = path.resolve(
  scriptRoot,
  "../../agent-automation/assets/agent-automation.config.example.json",
);

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "portfolio-dashboard-check-"));
const checks = [];

// Any artifact the fixture writes now is newer than this instant, which makes
// the stale-edge and overdue-run scenarios deterministic.
const PAST_INSTANT = "2020-01-02T00:00:00.000Z";

function writeJson(destination, value) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(destination, value) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, value);
}

function loadPipelineDefinition() {
  return JSON.parse(fs.readFileSync(pipelineDefinitionPath, "utf8"));
}

function passingAudit() {
  return { command: "node", args: ["-e", "process.exit(0)"] };
}

function orchestratorConfig({ timeoutMs, taskIds }) {
  const config = JSON.parse(fs.readFileSync(orchestratorExampleConfigPath, "utf8"));
  config.stateDir = ".agent-automation/runs";
  if (timeoutMs) config.runners[0].timeoutMs = timeoutMs;
  config.tasks = {};
  for (const taskId of taskIds) {
    config.tasks[taskId] = {
      instruction: `Fixture task ${taskId}; never executed by the dashboard scripts.`,
      verification: [],
      requiredArtifacts: [],
    };
  }
  return config;
}

// A project fixture inside the portfolio directory. Every project gets the
// shipped default pipeline definition, adjusted per scenario so audit results
// are decided by the fixture and not by which repo scripts resolve in a temp
// directory.
function makeProject(name, mutate) {
  const root = path.join(temporaryRoot, name);
  const definition = loadPipelineDefinition();
  definition.stages[0].audit = passingAudit();
  delete definition.stages[0].pendingDecisions;
  definition.stages[2].audit = passingAudit();
  if (mutate) mutate(definition, root);
  writeJson(path.join(root, ".pipeline-board/pipeline.json"), definition);
  return { root, definition };
}

function produceStageFiles(root, stage) {
  for (const relative of stage.produces) {
    writeText(path.join(root, relative), `fixture artifact: ${relative}\n`);
  }
}

function installRunSummary(root, summary) {
  writeJson(path.join(root, ".agent-automation/runs", `${summary.runId}.json`), summary);
}

function runNode(script, args) {
  return spawnSync(process.execPath, [script, ...args], { encoding: "utf8", timeout: 120000 });
}

function stderrCode(result) {
  try {
    return JSON.parse(result.stderr).code;
  } catch {
    return `unparsable stderr: ${result.stderr}`;
  }
}

function record(name, fn) {
  fn();
  checks.push(name);
}

try {
  // ------------------------------------------------------------------
  // Shared fixture: one portfolio, five projects, one real aggregation.
  // ------------------------------------------------------------------

  // 健康專案: every stage produced, every stage audited green.
  const healthy = makeProject("healthy", (definition) => {
    definition.stages[1].audit = passingAudit();
  });
  for (const stage of healthy.definition.stages) produceStageFiles(healthy.root, stage);

  // 未成立連線: definition only, nothing produced.
  makeProject("blocked");

  // 已過期連線: everything produced now, but the downstream stage completed in
  // 2020, so the first handoff's artifact is newer than that completion.
  const stale = makeProject("stale");
  writeJson(
    path.join(stale.root, ".agent-automation/config.json"),
    orchestratorConfig({ taskIds: stale.definition.stages.map((stage) => stage.taskId) }),
  );
  installRunSummary(stale.root, {
    runId: "run-storybook-past",
    taskId: stale.definition.stages[1].taskId,
    phase: "completed",
    startedAt: PAST_INSTANT,
    updatedAt: PAST_INSTANT,
    finishedAt: PAST_INSTANT,
    selectedRunner: { id: "codex", label: "Codex" },
    attempts: [],
    verification: [],
  });
  for (const stage of stale.definition.stages) produceStageFiles(stale.root, stage);

  // 執行逾期: first stage produced, its run still "running" since 2020 with a
  // one-second timeout. Later stages are missing, so blocked edges exist too —
  // the attention item must still be the possibly-stopped run, pinning that
  // priority 1 outranks priority 2.
  const overdue = makeProject("overdue");
  produceStageFiles(overdue.root, overdue.definition.stages[0]);
  writeJson(
    path.join(overdue.root, ".agent-automation/config.json"),
    orchestratorConfig({ timeoutMs: 1000, taskIds: overdue.definition.stages.map((stage) => stage.taskId) }),
  );
  installRunSummary(overdue.root, {
    runId: "run-extract-stalled",
    taskId: overdue.definition.stages[0].taskId,
    phase: "running",
    startedAt: PAST_INSTANT,
    updatedAt: PAST_INSTANT,
    selectedRunner: { id: "codex", label: "Codex" },
    attempts: [{ runnerId: "codex", outcome: "started" }],
    verification: [],
  });

  const portfolioPath = path.join(temporaryRoot, "portfolio.json");
  writeJson(portfolioPath, {
    schemaVersion: 1,
    projects: [
      { id: "healthy", name: "Healthy", root: "healthy" },
      { id: "blocked", name: "Blocked", root: "blocked" },
      { id: "stale", name: "Stale", root: "stale" },
      { id: "overdue", name: "Overdue", root: "overdue" },
      { id: "ghost", name: "Ghost", root: "does/not/exist" },
    ],
  });

  const build = runNode(buildScript, ["--portfolio", portfolioPath]);
  assert.equal(build.status, 0, `aggregation must exit zero despite broken projects: ${build.stderr}`);
  const outDir = path.join(temporaryRoot, "dashboard");
  const status = JSON.parse(fs.readFileSync(path.join(outDir, "portfolio-status.json"), "utf8"));
  const entries = new Map(status.projects.map((entry) => [entry.id, entry]));

  const render = runNode(renderScript, ["--status", path.join(outDir, "portfolio-status.json")]);
  assert.equal(render.status, 0, `overview render failed: ${render.stderr}`);
  const overview = fs.readFileSync(path.join(outDir, "automation-portfolio.html"), "utf8");

  // ------------------------------------------------------------------
  // Scenario assertions
  // ------------------------------------------------------------------

  record("健康專案", () => {
    const entry = entries.get("healthy");
    assert.ok(entry.ok, JSON.stringify(entry.error ?? {}));
    assert.equal(entry.attention.kind, "healthy-verified");
    assert.equal(entry.attention.priority, 4);
    assert.equal(entry.currentStage, null, "an all-verified project has no current stage");
    assert.ok(fs.existsSync(path.join(outDir, entry.boardFile)), "board file must exist in the output directory");
    assert.ok(overview.includes("流程健康・全部已驗證"));
    assert.ok(overview.includes(`href="${entry.boardFile}"`), "card must link to the board by relative name");
    assert.ok(overview.includes('class="app-shell"'), "overview must render inside the application shell");
    assert.ok(overview.includes('class="project-list"'), "the sidebar must list the tracked projects");
    assert.ok(!overview.includes("@keyframes"), "the overview has no flow edges and must stay animation-free");
    // The two surfaces are one product, so they must ship one token block. Both
    // sides of this comparison are files this aggregation just wrote, so a drift
    // in either renderer fails here instead of shipping two divergent themes.
    const tokens = (html, what) => {
      const found = html.match(/\/\* tokens:start \*\/[\s\S]*?\/\* tokens:end \*\//);
      assert.ok(found, `${what} must carry the design token block`);
      return found[0];
    };
    const boardHtml = fs.readFileSync(path.join(outDir, entry.boardFile), "utf8");
    assert.equal(
      tokens(overview, "the overview"),
      tokens(boardHtml, "the project board"),
      "the overview and the project boards must share one token block byte-for-byte",
    );
    assert.ok(overview.includes(":focus-visible"), "keyboard focus must be visible");
    assert.ok(overview.includes("tabular-nums"), "attention counts and timestamps must use tabular numerals");
    // A link is not a status: reusing the healthy tone made every link read as
    // a green "this project is fine" signal.
    const anchorRule = overview.match(/\n {4}a \{[^}]*\}/);
    assert.ok(anchorRule, "the overview must set its own anchor color");
    assert.ok(anchorRule[0].includes("var(--link)"), "anchors must use the neutral link token");
    assert.ok(!anchorRule[0].includes("var(--ok)"), "anchors must not reuse the healthy status tone");
    const sideLabel = overview.match(/\.side-label \{[^}]*\}/)[0];
    assert.ok(!sideLabel.includes("text-transform"), "Chinese sidebar labels must not be uppercased");
    assert.ok(!sideLabel.includes("letter-spacing"), "Chinese sidebar labels must not be tracked out");
    // The card is read attention-first: the item the designer acts on outweighs
    // the name that identifies it, and everything below it steps down.
    const fontSize = (selector) => {
      const rule = overview.match(new RegExp(`${selector} \\{[^}]*\\}`))[0];
      const size = rule.match(/font-size: ([\d.]+)rem/);
      assert.ok(size, `${selector} must declare a font size to rank against`);
      return Number(size[1]);
    };
    const attention = fontSize("\\.attention-main");
    assert.ok(attention > fontSize("\\.card-head h3"), "the attention item must outweigh the project name");
    const secondary = ["\\.stage-line", "\\.runs", "\\.card-link"].map(fontSize);
    assert.ok(
      secondary.every((size, index) => size <= attention && (index === 0 || size <= secondary[index - 1])),
      "stage line, run lines, and board link must step down from the attention item",
    );
  });

  record("未成立連線", () => {
    const entry = entries.get("blocked");
    assert.ok(entry.ok);
    assert.equal(entry.attention.kind, "blocked-edge");
    assert.equal(entry.attention.priority, 2);
    assert.equal(entry.currentStage.state, "not-started");
    assert.ok(overview.includes("卡在未銜接的交接"));
  });

  record("已過期連線", () => {
    const entry = entries.get("stale");
    assert.ok(entry.ok);
    assert.equal(entry.attention.kind, "stale-edge");
    assert.equal(entry.attention.priority, 2);
    assert.ok(entry.attention.reason.includes("過期"), "stale reason must be designer-readable");
    assert.ok(overview.includes("有一段交接已過期"));
  });

  record("執行逾期", () => {
    const entry = entries.get("overdue");
    assert.ok(entry.ok);
    assert.equal(entry.attention.kind, "needs-confirmation");
    assert.equal(entry.attention.priority, 1, "a possibly-stopped run must outrank the blocked edges also present");
    const run = entry.status.stages[0].run;
    assert.equal(run.phase, "possibly-stopped");
    assert.ok(overview.includes("需要人工確認"));
  });

  record("根目錄不存在", () => {
    const entry = entries.get("ghost");
    assert.equal(entry.ok, false);
    assert.equal(entry.error.code, "missing-project-root");
    assert.ok(!fs.existsSync(path.join(outDir, "ghost.html")), "a failed project must not get a board file");
    assert.ok(overview.includes("missing-project-root"), "the error card must show its stable code");
    assert.ok(
      overview.includes("找不到這個專案的資料夾"),
      "the error card must lead with a plain-language title a designer can act on",
    );
    // Four ok cards → exactly four board-file links. Sidebar entries are
    // in-page anchors (# targets), which are navigation, not board links, so
    // the accounting counts .html hrefs and inspects the error card container.
    const boardLinks = overview.match(/href="[^"#][^"]*\.html"/g) ?? [];
    assert.equal(boardLinks.length, 4, "board-file links must equal the successful project count");
    const errorCard = overview.match(/<article class="card card-error"[^>]*>[\s\S]*?<\/article>/);
    assert.ok(errorCard && !errorCard[0].includes("<a "), "error cards must not contain links");
  });

  record("組合定義檔無效", () => {
    const emptyPath = path.join(temporaryRoot, "empty-portfolio.json");
    writeJson(emptyPath, { schemaVersion: 1, projects: [] });
    const empty = runNode(buildScript, ["--portfolio", emptyPath]);
    assert.notEqual(empty.status, 0);
    assert.equal(stderrCode(empty), "empty-portfolio");

    const dupPath = path.join(temporaryRoot, "dup-portfolio.json");
    writeJson(dupPath, {
      schemaVersion: 1,
      projects: [
        { id: "twin", name: "Twin A", root: "healthy" },
        { id: "twin", name: "Twin B", root: "blocked" },
      ],
    });
    const dup = runNode(buildScript, ["--portfolio", dupPath]);
    assert.notEqual(dup.status, 0);
    assert.equal(stderrCode(dup), "duplicate-project-id");

    for (const name of ["empty-portfolio", "dup-portfolio"]) {
      assert.ok(
        !fs.existsSync(path.join(temporaryRoot, name, "dashboard")) &&
          !fs.existsSync(path.join(temporaryRoot, "dashboard", `${name}.json`)),
        "an invalid portfolio must not produce output",
      );
    }
  });

  record("schema 版本不符", () => {
    // Today's automation-pipeline-board always writes status schema version 1, so the
    // embedded-status guard cannot be reached end-to-end until a future
    // automation-pipeline-board ships a new schema; the exported guard is pinned directly.
    const guarded = embeddedStatusError({ schemaVersion: 99 });
    assert.equal(guarded.code, "unsupported-status-schema");
    assert.equal(embeddedStatusError({ schemaVersion: 1 }), null);

    // The overview renderer's own portfolio-status schema check is reachable
    // and refuses without writing partial output.
    const doctoredPath = path.join(temporaryRoot, "doctored-status.json");
    const doctored = JSON.parse(fs.readFileSync(path.join(outDir, "portfolio-status.json"), "utf8"));
    doctored.schemaVersion = 99;
    writeJson(doctoredPath, doctored);
    const refused = runNode(renderScript, [
      "--status",
      doctoredPath,
      "--out",
      path.join(temporaryRoot, "refused.html"),
    ]);
    assert.notEqual(refused.status, 0);
    assert.equal(stderrCode(refused), "unsupported-schema-version");
    assert.ok(!fs.existsSync(path.join(temporaryRoot, "refused.html")), "a refused render must not leave a file");
  });

  process.stdout.write(`${JSON.stringify({ ok: true, checks }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
