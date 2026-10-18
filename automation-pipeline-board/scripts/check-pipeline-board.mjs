#!/usr/bin/env node

// Deterministic fixture checks for the pipeline board. Every scenario builds a
// throwaway project on disk, runs the real build/render scripts against it, and
// asserts on their observable output: exit codes, the derived status object,
// and the rendered HTML. Nothing here calls an AI runner or touches the
// network; timestamps that drive staleness are written into fixtures as fixed
// past instants so the checks cannot flake with the clock.
//
// Check names are the seven scenarios the change contract requires; the final
// line prints them so an acceptance run can grep for each one.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = path.dirname(fileURLToPath(import.meta.url));
const buildScript = path.join(scriptRoot, "build-pipeline-status.mjs");
const renderScript = path.join(scriptRoot, "render-pipeline-board.mjs");
const defaultDefinitionPath = path.resolve(scriptRoot, "../assets/default-pipeline.json");
const orchestratorExampleConfigPath = path.resolve(
  scriptRoot,
  "../../agent-automation/assets/agent-automation.config.example.json",
);

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pipeline-board-check-"));
const checks = [];

// A completion instant far in the past: any artifact the fixture writes now is
// necessarily newer, which is what makes the stale-edge scenario deterministic.
const PAST_INSTANT = "2020-01-02T00:00:00.000Z";

function writeJson(destination, value) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(destination, value) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, value);
}

function makeProject(name) {
  const root = path.join(temporaryRoot, name);
  fs.mkdirSync(root, { recursive: true });
  return root;
}

function loadDefaultDefinition() {
  return JSON.parse(fs.readFileSync(defaultDefinitionPath, "utf8"));
}

// An audit that always passes, so "verified" states are decided by the fixture
// and not by whichever audit scripts happen to resolve inside a temp project.
function passingAudit() {
  return { command: "node", args: ["-e", "process.exit(0)"] };
}

function installDefinition(root, definition) {
  writeJson(path.join(root, ".pipeline-board/pipeline.json"), definition);
}

function produceStageFiles(root, stage) {
  for (const relative of stage.produces) {
    writeText(path.join(root, relative), `fixture artifact: ${relative}\n`);
  }
}

// The orchestrator's own example config is the source of a valid runner shape;
// only stateDir/tasks/timeouts are overridden per scenario. The runner command
// is never spawned by the board scripts, which only read config and summaries.
function orchestratorConfig({ timeoutMs, taskIds, verificationCounts = {} }) {
  const config = JSON.parse(fs.readFileSync(orchestratorExampleConfigPath, "utf8"));
  config.stateDir = ".agent-automation/runs";
  if (timeoutMs) config.runners[0].timeoutMs = timeoutMs;
  config.tasks = {};
  for (const taskId of taskIds) {
    const count = verificationCounts[taskId] ?? 0;
    config.tasks[taskId] = {
      instruction: `Fixture task ${taskId}; never executed by the board scripts.`,
      verification: Array.from({ length: count }, () => ({
        command: "node",
        args: ["-e", "process.exit(0)"],
        timeoutMs: 1000,
      })),
      requiredArtifacts: [],
    };
  }
  return config;
}

function installRunSummary(root, summary) {
  writeJson(path.join(root, ".agent-automation/runs", `${summary.runId}.json`), summary);
}

function runNode(script, args) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8",
    timeout: 60000,
  });
}

function runBuild(root) {
  return runNode(buildScript, ["--project-root", root]);
}

function statusPath(root) {
  return path.join(root, ".pipeline-board/status.json");
}

function readStatus(root) {
  return JSON.parse(fs.readFileSync(statusPath(root), "utf8"));
}

function renderBoard(root) {
  const out = path.join(root, ".pipeline-board/board.html");
  const result = runNode(renderScript, ["--status", statusPath(root), "--out", out]);
  assert.equal(result.status, 0, `render failed: ${result.stderr}`);
  return fs.readFileSync(out, "utf8");
}

function stageStates(status) {
  return status.stages.map((stage) => stage.state);
}

function edgeStates(status) {
  return status.edges.map((edge) => edge.state);
}

// A node's tone must be the same value its own badge already uses. If these
// ever diverge the flow would color a stage one way and label it another, which
// is exactly the kind of quiet disagreement this board exists to prevent.
function assertNodeToneMatchesBadge(html) {
  const nodes = html.match(/<a class="flow-node flow-stage flow-node-tone-[a-z]+"[\s\S]*?<\/a>/g) ?? [];
  assert.ok(nodes.length, "the flow must render at least one stage node");
  for (const node of nodes) {
    const nodeTone = node.match(/flow-node-tone-([a-z]+)/)[1];
    const badgeTone = node.match(/badge tone-([a-z]+)/)[1];
    const dotTone = node.match(/dot dot-([a-z]+)/)[1];
    assert.equal(badgeTone, nodeTone, "node tone must match its badge tone");
    assert.equal(dotTone, nodeTone, "node dot must match its badge tone");
  }
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
  record("空專案", () => {
    const root = makeProject("empty-project");
    installDefinition(root, loadDefaultDefinition());
    const result = runBuild(root);
    assert.equal(result.status, 0, result.stderr);
    const status = readStatus(root);
    assert.ok(status.stages.length >= 3, "default definition should declare the three stages");
    assert.ok(
      status.stages.every((stage) => stage.state === "not-started" && stage.produced.length === 0),
      `expected every stage not-started, got ${stageStates(status)}`,
    );
    assert.ok(
      status.edges.every((edge) => edge.state === "blocked"),
      `expected every edge blocked, got ${edgeStates(status)}`,
    );
    assert.ok(
      status.sources.every((source) => source.present === false),
      "an empty project must not report any source as present",
    );
    assert.equal(status.hasRunData, false);
    const html = renderBoard(root);
    assert.ok(html.includes("尚未開始"), "board must render stages as not started");
    assert.ok(html.includes("還沒有任何來源"), "board must say no source exists yet");
    assert.ok(html.includes("沒有任何執行紀錄"), "board must say no run data exists");
    assert.ok(html.includes('class="app-shell"'), "board must render inside the application shell");
    assert.ok(html.includes("flow-canvas") && html.includes("<svg"), "board must render the flow canvas");
    assert.ok(html.includes("edge-line-blocked"), "blocked handoffs must carry their state class in the flow");
    // Motion speaks direction only: the flow animation exists, binds solely to
    // the satisfied and stale edge classes, never to blocked edges or nodes,
    // and reduced-motion readers get a fully static fallback.
    assert.ok(html.includes("@keyframes flow-dash"), "the flow animation rule must exist");
    assert.ok(html.includes("prefers-reduced-motion"), "the reduced-motion fallback must exist");
    assert.ok(html.match(/\.edge-line-satisfied \{[^}]*\}/)[0].includes("flow-dash"), "satisfied edges must flow");
    assert.ok(html.match(/\.edge-line-stale \{[^}]*\}/)[0].includes("flow-dash"), "stale edges must flow slowly");
    assert.ok(!html.match(/\.edge-line-blocked \{[^}]*\}/)[0].includes("animation"), "blocked edges must stay static");
    assert.ok(!html.match(/\.flow-node \{[^}]*\}/)[0].includes("animation"), "nodes must never animate");
    const animationDeclarations = html.match(/animation:[^;]+;/g) ?? [];
    assert.equal(
      animationDeclarations.filter((decl) => decl.includes("flow-dash")).length,
      2,
      "flow-dash binds exactly the satisfied and stale edge rules",
    );
    // The visual system is token-driven, so the delimited block must ship and
    // must carry every scale the container styling depends on.
    const tokenBlock = html.match(/\/\* tokens:start \*\/[\s\S]*?\/\* tokens:end \*\//);
    assert.ok(tokenBlock, "the design token block must be present");
    for (const token of ["--s1:", "--s6:", "--r1:", "--r3:", "--rp:", "--lift-1:", "--lift-2:", "--lift-3:", "--focus:", "--link:", "--ok-edge:", "--warn-edge:", "--stop-edge:", "--idle-edge:"]) {
      assert.ok(tokenBlock[0].includes(token), `the token block must declare ${token}`);
    }
    assert.ok(html.includes("tabular-nums"), "counts and timestamps must use tabular numerals");
    assert.ok(html.includes(":focus-visible"), "keyboard focus must be visible");
    // Chinese labels must not carry the Latin small-caps convention: uppercase
    // is a no-op on Han characters and widened tracking only loosens them.
    for (const selector of [/\.side-label \{[^}]*\}/, /\.label \{[^}]*\}/, /\.flow-col-label \{[^}]*\}/]) {
      const rule = html.match(selector)[0];
      assert.ok(!rule.includes("text-transform"), `${selector} must not uppercase Chinese labels`);
      assert.ok(!rule.includes("letter-spacing"), `${selector} must not widen Chinese tracking`);
    }
    assert.ok(
      html.match(/\.brand \{[^}]*\}/)[0].includes("text-transform: uppercase"),
      "the Latin brand line keeps its own treatment",
    );
    assert.ok(
      /class="flow-node flow-stage flow-node-tone-(ok|warn|stop|idle)"/.test(html),
      "every stage node must carry its own state tone class",
    );
    assertNodeToneMatchesBadge(html);
  });

  record("僅有來源", () => {
    const root = makeProject("sources-only");
    installDefinition(root, loadDefaultDefinition());
    fs.mkdirSync(path.join(root, "screenshots"), { recursive: true });
    const result = runBuild(root);
    assert.equal(result.status, 0, result.stderr);
    const status = readStatus(root);
    const present = status.sources.filter((source) => source.present).map((source) => source.id);
    assert.deepEqual(present, ["ui-screenshots"], "only the screenshot source has evidence");
    assert.ok(
      status.stages.every((stage) => stage.state === "not-started"),
      `sources alone must not start any stage, got ${stageStates(status)}`,
    );
    const html = renderBoard(root);
    assert.ok(html.includes("UI 截圖"), "board must show the present source by title");
    assert.ok(html.includes("尚未偵測到"), "board must list the absent sources");
  });

  record("部分完成", () => {
    const root = makeProject("partially-complete");
    const definition = loadDefaultDefinition();
    definition.stages[0].audit = passingAudit();
    delete definition.stages[0].pendingDecisions;
    installDefinition(root, definition);
    produceStageFiles(root, definition.stages[0]);
    const result = runBuild(root);
    assert.equal(result.status, 0, result.stderr);
    const status = readStatus(root);
    assert.deepEqual(
      stageStates(status),
      ["verified", "not-started", "not-started"],
      "only the first stage has produced and audited files",
    );
    // Handoffs out of the finished stage hold; the handoff between the two
    // untouched stages stays blocked.
    assert.deepEqual(edgeStates(status), ["satisfied", "satisfied", "blocked"]);
  });

  record("全部完成", () => {
    const root = makeProject("all-complete");
    const definition = loadDefaultDefinition();
    definition.stages[0].audit = passingAudit();
    delete definition.stages[0].pendingDecisions;
    definition.stages[2].audit = passingAudit();
    installDefinition(root, definition);
    for (const stage of definition.stages) produceStageFiles(root, stage);
    const result = runBuild(root);
    assert.equal(result.status, 0, result.stderr);
    const status = readStatus(root);
    // The middle stage declares no audit, so its files can only ever be
    // "produced": absence of an audit result must not display as verified.
    assert.deepEqual(stageStates(status), ["verified", "produced", "verified"]);
    assert.ok(
      status.edges.every((edge) => edge.state === "satisfied"),
      `expected every edge satisfied, got ${edgeStates(status)}`,
    );
    const html = renderBoard(root);
    assert.ok(html.includes("已驗證"), "board must show verified stages");
    assert.ok(html.includes("已銜接"), "board must show satisfied handoffs");
    assert.ok(html.includes("edge-line-satisfied"), "satisfied handoffs must carry their state class in the flow");
    assertNodeToneMatchesBadge(html);
  });

  record("上游較新造成過期", () => {
    const root = makeProject("stale-upstream");
    const definition = loadDefaultDefinition();
    definition.stages[0].audit = passingAudit();
    delete definition.stages[0].pendingDecisions;
    installDefinition(root, definition);
    writeJson(
      path.join(root, ".agent-automation/config.json"),
      orchestratorConfig({ taskIds: definition.stages.map((stage) => stage.taskId) }),
    );
    // The downstream stage completed long ago; the artifacts written now are
    // newer than that completion, so the first handoff must surface as stale.
    installRunSummary(root, {
      runId: "run-storybook-past",
      taskId: definition.stages[1].taskId,
      phase: "completed",
      startedAt: PAST_INSTANT,
      updatedAt: PAST_INSTANT,
      finishedAt: PAST_INSTANT,
      selectedRunner: { id: "codex", label: "Codex" },
      attempts: [],
      verification: [],
    });
    for (const stage of definition.stages) produceStageFiles(root, stage);
    const result = runBuild(root);
    assert.equal(result.status, 0, result.stderr);
    const status = readStatus(root);
    assert.equal(status.hasRunData, true);
    assert.deepEqual(
      edgeStates(status),
      ["stale", "satisfied", "satisfied"],
      "only the handoff into the completed-then-outdated stage goes stale",
    );
    assert.ok(status.edges[0].reason.includes("過期"), "stale reason must be designer-readable");
    const html = renderBoard(root);
    assert.ok(html.includes("已過期"), "board must show the stale handoff");
    assert.ok(html.includes("edge-line-stale"), "stale handoffs must carry their state class in the flow");
  });

  record("失效的中止點引用", () => {
    const root = makeProject("broken-citation");
    const missingScript = loadDefaultDefinition();
    missingScript.stages[0].handoffs[0].enforcedBy = "design-system-to-storybook/scripts/does-not-exist.mjs";
    installDefinition(root, missingScript);
    const missingResult = runBuild(root);
    assert.notEqual(missingResult.status, 0, "a citation to an absent script must fail the build");
    assert.equal(stderrCode(missingResult), "missing-enforcement-script");
    assert.ok(!fs.existsSync(statusPath(root)), "a failed build must not leave a status file");

    const ignoredArtifact = loadDefaultDefinition();
    ignoredArtifact.stages[0].handoffs[0].artifact = "design-system/NOT_CHECKED_BY_ANYONE.md";
    installDefinition(root, ignoredArtifact);
    const ignoredResult = runBuild(root);
    assert.notEqual(ignoredResult.status, 0, "a citation that ignores the artifact must fail the build");
    assert.equal(stderrCode(ignoredResult), "enforcement-does-not-check-artifact");
    assert.ok(!fs.existsSync(statusPath(root)), "a failed build must not leave a status file");
  });

  record("執行區塊逾期", () => {
    const root = makeProject("overdue-run");
    const definition = loadDefaultDefinition();
    definition.stages[0].audit = passingAudit();
    delete definition.stages[0].pendingDecisions;
    installDefinition(root, definition);
    produceStageFiles(root, definition.stages[0]);
    writeJson(
      path.join(root, ".agent-automation/config.json"),
      orchestratorConfig({
        timeoutMs: 1000,
        taskIds: definition.stages.map((stage) => stage.taskId),
        verificationCounts: { [definition.stages[0].taskId]: 3 },
      }),
    );
    // A run still marked running whose durable record last moved in 2020 is far
    // past its 1s timeout plus the grace period, whatever the clock says now.
    installRunSummary(root, {
      runId: "run-extract-stalled",
      taskId: definition.stages[0].taskId,
      phase: "running",
      startedAt: PAST_INSTANT,
      updatedAt: PAST_INSTANT,
      selectedRunner: { id: "codex", label: "Codex" },
      attempts: [{ runnerId: "codex", outcome: "started" }],
      verification: [{ command: "node", passed: false }],
    });
    const result = runBuild(root);
    assert.equal(result.status, 0, result.stderr);
    const status = readStatus(root);
    const run = status.stages[0].run;
    assert.equal(run.phase, "possibly-stopped", "an overdue running record must not stay 'running'");
    // Recording stops at the first failure: 3 configured, 1 recorded failure
    // must derive as 0 passed / 1 failed / 2 not run.
    assert.deepEqual(run.verification, { configured: 3, passed: 0, failed: 1, notRun: 2 });
    const html = renderBoard(root);
    assert.ok(html.includes("可能已停止"), "board must ask for human confirmation");
    assert.ok(html.includes("未執行 2 項"), "board must report checks that never ran");
    assert.ok(
      html.includes('class="flow-node flow-stage flow-node-tone-stop"'),
      "a run past its timeout must tone its node stop, not its stage state",
    );
    assertNodeToneMatchesBadge(html);
  });

  process.stdout.write(`${JSON.stringify({ ok: true, checks }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
