#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = path.dirname(fileURLToPath(import.meta.url));
const inspectScript = path.join(scriptRoot, "inspect-project.mjs");
const validateScript = path.join(scriptRoot, "validate-project-config.mjs");
const runScript = path.join(scriptRoot, "run-task.mjs");
const statusScript = path.join(scriptRoot, "status.mjs");
const exampleConfigPath = path.resolve(
  scriptRoot,
  "../assets/agent-automation.config.example.json",
);

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "agent-automation-skill-"));
const projectRoot = path.join(temporaryRoot, "project");
const manifestlessRoot = path.join(temporaryRoot, "manifestless");
const checks = [];

function writeJson(destination, value) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(destination, value) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, value);
}

function tree(root) {
  const output = [];
  function visit(current, prefix) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const relative = prefix ? path.join(prefix, entry.name) : entry.name;
      output.push(`${entry.isDirectory() ? "d" : "f"}:${relative}`);
      if (entry.isDirectory()) visit(path.join(current, entry.name), relative);
    }
  }
  visit(root, "");
  return output;
}

function runNode(script, args, options = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: options.cwd ?? projectRoot,
    encoding: "utf8",
    env: options.env ?? process.env,
    timeout: options.timeout ?? 15000,
    ...(options.input === undefined ? {} : { input: options.input }),
  });
}

function parseJsonOutput(result, label) {
  assert.equal(result.error, undefined, `${label}: spawn failed: ${result.error?.message}`);
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`${label}: invalid JSON output: ${error.message}\nstdout=${result.stdout}\nstderr=${result.stderr}`);
  }
}

function record(name, callback) {
  callback();
  checks.push(name);
}

function baseRunner(id, mode, preflightMode = "preflight-success") {
  return {
    id,
    label: id[0].toUpperCase() + id.slice(1),
    command: process.execPath,
    args: [fakeRunnerPath, mode, "{workspace}", "{prompt}"],
    timeoutMs: 5000,
    preflight: {
      command: process.execPath,
      args: [fakeRunnerPath, preflightMode],
      timeoutMs: 3000,
    },
    inheritEnv: ["AUTOMATION_TEST_SECRET"],
  };
}

function baseConfig(runners) {
  return {
    schemaVersion: 1,
    stateDir: ".agent-automation/runs",
    runners,
    tasks: {
      implement: {
        instruction: "Create the required artifact and leave the fixture verifiable.",
        skill: "fixture-project-skill",
        verification: [
          {
            command: process.execPath,
            args: [verifyScriptPath, "artifact.txt"],
            timeoutMs: 3000,
          },
        ],
        requiredArtifacts: ["artifact.txt"],
      },
    },
  };
}

function findForbiddenKey(value, trail = []) {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const result = findForbiddenKey(value[index], [...trail, String(index)]);
      if (result) return result;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;
  for (const [key, item] of Object.entries(value)) {
    if (/^(prompt|argv|stdout|stderr|env|environment|token|apiKey|secret|password)$/i.test(key)) {
      return [...trail, key].join(".");
    }
    const nested = findForbiddenKey(item, [...trail, key]);
    if (nested) return nested;
  }
  return null;
}

let fakeRunnerPath;
let verifyScriptPath;
let configPath;

try {
  fs.mkdirSync(projectRoot, { recursive: true });
  fs.mkdirSync(manifestlessRoot, { recursive: true });
  writeJson(path.join(projectRoot, "package.json"), {
    name: "automation-fixture",
    scripts: { build: "node build.mjs", test: "node test.mjs" },
  });
  writeText(path.join(projectRoot, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
  writeText(path.join(projectRoot, "AGENTS.md"), "# Fixture instructions\n");
  writeText(path.join(projectRoot, ".agents/skills/fixture-project-skill/SKILL.md"), "---\nname: fixture-project-skill\ndescription: fixture\n---\n");
  writeText(path.join(projectRoot, ".cursor/skills/second-fixture-skill/SKILL.md"), "---\nname: second-fixture-skill\ndescription: fixture\n---\n");

  fakeRunnerPath = path.join(temporaryRoot, "fake-runner.mjs");
  verifyScriptPath = path.join(temporaryRoot, "verify-artifact.mjs");
  configPath = path.join(projectRoot, ".agent-automation/config.json");

  writeText(
    fakeRunnerPath,
    [
      `import { spawn } from "node:child_process";`,
      `import fs from "node:fs";`,
      `import path from "node:path";`,
      `const [mode, workspace] = process.argv.slice(2);`,
      `if (mode === "preflight-fail") process.exit(7);`,
      `if (mode === "preflight-zero-while-unauthenticated") {`,
      `  process.stdout.write("Not logged in\\n");`,
      `  process.exit(0);`,
      `}`,
      `if (mode === "agent-fail") process.exit(9);`,
      `if (mode === "agent-read-stdin") {`,
      `  let received = "";`,
      `  try {`,
      `    received = fs.readFileSync(0, "utf8");`,
      `  } catch (error) {`,
      `    received = "<unreadable:" + (error.code ?? "unknown") + ">";`,
      `  }`,
      `  fs.writeFileSync(path.join(workspace, "stdin-capture.txt"), received);`,
      `  fs.writeFileSync(path.join(workspace, "artifact.txt"), "created by fake runner\\n");`,
      `  process.exit(0);`,
      `}`,
      `if (mode === "agent-spawn-descendant") {`,
      `  const descendant = spawn(process.execPath, ["-e", "setTimeout(() => {}, 600000)"], {`,
      `    cwd: workspace,`,
      `    stdio: "ignore",`,
      `  });`,
      `  fs.writeFileSync(path.join(workspace, "descendant-pid.txt"), String(descendant.pid));`,
      `  await new Promise(() => {});`,
      `}`,
      `if (mode === "agent-success") fs.writeFileSync(path.join(workspace, "artifact.txt"), "created by fake runner\\n");`,
      ``,
    ].join("\n"),
  );
  writeText(
    verifyScriptPath,
    `import fs from "node:fs";\nprocess.exit(fs.existsSync(process.argv[2]) ? 0 : 11);\n`,
  );

  record("inspect JavaScript project without writes", () => {
    const before = tree(projectRoot);
    const result = runNode(inspectScript, ["--project-root", projectRoot]);
    assert.equal(result.status, 0, result.stderr);
    const inspected = parseJsonOutput(result, "inspect project");
    assert.equal(inspected.packageManager, "pnpm");
    assert.equal(inspected.manifest.path, "package.json");
    assert.deepEqual(Object.keys(inspected.scripts), ["build", "test"]);
    assert.deepEqual(
      inspected.projectSkills.map((skill) => skill.name),
      ["fixture-project-skill", "second-fixture-skill"],
    );
    assert.deepEqual(tree(projectRoot), before);
  });

  record("inspect manifestless project with warning", () => {
    const before = tree(manifestlessRoot);
    const result = runNode(inspectScript, ["--project-root", manifestlessRoot]);
    assert.equal(result.status, 0, result.stderr);
    const inspected = parseJsonOutput(result, "inspect manifestless");
    assert.equal(inspected.manifest, null);
    assert(inspected.warnings.some((warning) => warning.code === "manifest-not-detected"));
    assert.deepEqual(tree(manifestlessRoot), before);
  });

  record("example config parses and validates", () => {
    const exampleConfig = JSON.parse(fs.readFileSync(exampleConfigPath, "utf8"));
    writeJson(configPath, exampleConfig);
    const result = runNode(validateScript, ["--project-root", projectRoot]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(parseJsonOutput(result, "validate example config").valid, true);
  });

  writeJson(configPath, baseConfig([baseRunner("claude", "agent-success"), baseRunner("codex", "agent-success")]));

  record("validate multi-runner contract", () => {
    const result = runNode(validateScript, ["--project-root", projectRoot]);
    assert.equal(result.status, 0, result.stderr);
    const validation = parseJsonOutput(result, "validate valid config");
    assert.equal(validation.valid, true);
    assert.deepEqual(validation.runnerOrder, ["claude", "codex"]);
    assert.deepEqual(validation.taskIds, ["implement"]);
  });

  record("reject unsafe contract without state writes", () => {
    const invalidPath = path.join(projectRoot, ".agent-automation/invalid.json");
    const invalid = baseConfig([baseRunner("codex", "agent-success"), baseRunner("codex", "agent-success")]);
    invalid.stateDir = "../outside";
    invalid.runners[0].args = [fakeRunnerPath, "agent-success", "{workspace}"];
    invalid.apiKey = "embedded-secret-value";
    writeJson(invalidPath, invalid);
    const result = runNode(validateScript, [
      "--project-root",
      projectRoot,
      "--config",
      ".agent-automation/invalid.json",
    ]);
    assert.notEqual(result.status, 0);
    const validation = parseJsonOutput(result, "validate invalid config");
    assert.equal(validation.valid, false);
    const paths = validation.errors.map((error) => error.path);
    assert(paths.includes("stateDir"));
    assert(paths.includes("runners[1].id"));
    assert(paths.includes("runners[0].args"));
    assert(paths.includes("apiKey"));
    assert.equal(fs.existsSync(path.join(temporaryRoot, "outside")), false);
  });

  record("dry-run starts no process and writes no state", () => {
    fs.rmSync(path.join(projectRoot, ".agent-automation/runs"), { recursive: true, force: true });
    const result = runNode(runScript, ["--project-root", projectRoot, "--task", "implement", "--dry-run"]);
    assert.equal(result.status, 0, result.stderr);
    const plan = parseJsonOutput(result, "dry-run");
    assert.equal(plan.dryRun, true);
    assert.deepEqual(plan.runnerOrder.map((runner) => runner.id), ["claude", "codex"]);
    assert.equal(fs.existsSync(path.join(projectRoot, ".agent-automation/runs")), false);
    assert.equal(fs.existsSync(path.join(projectRoot, "artifact.txt")), false);
  });

  let completedRun;
  record("fallback completes with second runner", () => {
    writeJson(
      configPath,
      baseConfig([
        baseRunner("claude", "agent-success", "preflight-fail"),
        baseRunner("codex", "agent-success"),
      ]),
    );
    const secretEnvironmentValue = "ENV_VALUE_MUST_NOT_PERSIST_9182";
    const secretRequest = "PROMPT_MUST_NOT_PERSIST_4711";
    const result = runNode(
      runScript,
      ["--project-root", projectRoot, "--task", "implement", "--request", secretRequest],
      { env: { ...process.env, AUTOMATION_TEST_SECRET: secretEnvironmentValue } },
    );
    assert.equal(result.status, 0, result.stderr);
    completedRun = parseJsonOutput(result, "fallback run");
    assert.equal(completedRun.phase, "completed");
    assert.equal(completedRun.selectedRunner.id, "codex");
    assert.equal(completedRun.attempts[0].outcome, "unavailable");
    assert.equal(completedRun.attempts[1].outcome, "success");
    assert.equal(completedRun.verification[0].passed, true);
    assert.equal(completedRun.artifacts[0].exists, true);
    const durable = fs.readFileSync(
      path.join(projectRoot, ".agent-automation/runs", `${completedRun.runId}.json`),
      "utf8",
    );
    assert.equal(durable.includes(secretRequest), false);
    assert.equal(durable.includes(secretEnvironmentValue), false);
    const parsedDurable = JSON.parse(durable);
    assert.equal(findForbiddenKey(parsedDurable), null);
  });

  record("verification failure does not fall back", () => {
    const config = baseConfig([baseRunner("claude", "agent-success"), baseRunner("codex", "agent-success")]);
    config.tasks.implement.verification = [
      { command: process.execPath, args: ["-e", "process.exit(13)"], timeoutMs: 3000 },
    ];
    writeJson(configPath, config);
    const result = runNode(runScript, ["--project-root", projectRoot, "--task", "implement"]);
    assert.notEqual(result.status, 0);
    const summary = parseJsonOutput(result, "verification failure");
    assert.equal(summary.phase, "verification-failed");
    assert.equal(summary.attempts.length, 1);
    assert.equal(summary.selectedRunner.id, "claude");
  });

  let exhaustedRun;
  record("all failed runners exhaust", () => {
    const config = baseConfig([baseRunner("claude", "agent-fail"), baseRunner("codex", "agent-fail")]);
    config.tasks.implement.verification = [];
    config.tasks.implement.requiredArtifacts = [];
    writeJson(configPath, config);
    const result = runNode(runScript, ["--project-root", projectRoot, "--task", "implement"]);
    assert.notEqual(result.status, 0);
    exhaustedRun = parseJsonOutput(result, "exhausted run");
    assert.equal(exhaustedRun.phase, "exhausted");
    assert.deepEqual(exhaustedRun.attempts.map((attempt) => attempt.runnerId), ["claude", "codex"]);
  });

  let resumedRun;
  record("resume links a new completed run", () => {
    const config = baseConfig([baseRunner("codex", "agent-success")]);
    writeJson(configPath, config);
    const result = runNode(runScript, [
      "--project-root",
      projectRoot,
      "--task",
      "implement",
      "--resume",
      exhaustedRun.runId,
    ]);
    assert.equal(result.status, 0, result.stderr);
    resumedRun = parseJsonOutput(result, "resume run");
    assert.equal(resumedRun.phase, "completed");
    assert.equal(resumedRun.resumedFrom, exhaustedRun.runId);
  });

  record("status returns latest and by ID", () => {
    const latestResult = runNode(statusScript, ["--project-root", projectRoot]);
    assert.equal(latestResult.status, 0, latestResult.stderr);
    const latest = parseJsonOutput(latestResult, "latest status");
    assert.equal(latest.runId, resumedRun.runId);
    const byIdResult = runNode(statusScript, [
      "--project-root",
      projectRoot,
      "--run-id",
      completedRun.runId,
    ]);
    assert.equal(byIdResult.status, 0, byIdResult.stderr);
    assert.equal(parseJsonOutput(byIdResult, "status by id").runId, completedRun.runId);
    const unknownResult = runNode(statusScript, [
      "--project-root",
      projectRoot,
      "--run-id",
      "unknown-run-id",
    ]);
    assert.notEqual(unknownResult.status, 0);
    assert.equal(parseJsonOutput(unknownResult, "unknown status").error.code, "run-not-found");
  });

  record("stdin-not-inherited", () => {
    // The launcher is given a sentinel on standard input. A runner that inherited
    // the launcher's stdin would read that sentinel; an isolated runner reads
    // nothing. Content, not timing, is what discriminates here.
    const stdinSentinel = "STDIN_MUST_NOT_REACH_RUNNER_5561\n";
    const capturePath = path.join(projectRoot, "stdin-capture.txt");
    fs.rmSync(capturePath, { force: true });
    fs.rmSync(path.join(projectRoot, "artifact.txt"), { force: true });
    writeJson(configPath, baseConfig([baseRunner("codex", "agent-read-stdin")]));
    const result = runNode(
      runScript,
      ["--project-root", projectRoot, "--task", "implement"],
      { input: stdinSentinel },
    );
    assert.equal(result.status, 0, result.stderr);
    const run = parseJsonOutput(result, "stdin isolation run");
    assert.equal(run.phase, "completed");
    assert.equal(run.attempts.at(-1).outcome, "success");
    assert.equal(fs.existsSync(capturePath), true, "runner did not record what it read");
    const captured = fs.readFileSync(capturePath, "utf8");
    assert.equal(captured, "", `runner inherited the launcher stdin: ${JSON.stringify(captured)}`);
    const persisted = JSON.stringify(run);
    assert.equal(persisted.includes(stdinSentinel.trim()), false, "sentinel leaked into the summary");
  });

  record("timeout-kills-process-group", () => {
    // The runner spawns a descendant that outlives the timeout and then waits
    // forever. After the attempt settles as timeout, the descendant must be gone.
    const pidPath = path.join(projectRoot, "descendant-pid.txt");
    fs.rmSync(pidPath, { force: true });
    const config = baseConfig([baseRunner("codex", "agent-spawn-descendant")]);
    config.runners[0].timeoutMs = 3000;
    writeJson(configPath, config);
    const result = runNode(runScript, ["--project-root", projectRoot, "--task", "implement"], {
      timeout: 30000,
    });
    const run = parseJsonOutput(result, "timeout run");
    assert.equal(run.attempts.at(-1).outcome, "timeout");
    assert.equal(fs.existsSync(pidPath), true, "runner never reported its descendant");
    const descendantPid = Number(fs.readFileSync(pidPath, "utf8").trim());
    assert.ok(Number.isInteger(descendantPid) && descendantPid > 0, "descendant pid was not recorded");
    let alive = true;
    for (let attempt = 0; attempt < 40 && alive; attempt += 1) {
      try {
        process.kill(descendantPid, 0);
        spawnSync(process.execPath, ["-e", "setTimeout(() => {}, 100)"]);
      } catch {
        alive = false;
      }
    }
    assert.equal(alive, false, `descendant ${descendantPid} survived the timeout`);
  });

  record("preflight-zero-exit-when-unauthenticated", () => {
    // A preflight that exits zero while unauthenticated can never mark its runner
    // unavailable. This pins that observable cost: the runner consumes a fallback
    // position, reporting a preflight success followed by an agent failure.
    writeJson(
      configPath,
      baseConfig([
        baseRunner("cursor", "agent-fail", "preflight-zero-while-unauthenticated"),
        baseRunner("codex", "agent-success"),
      ]),
    );
    fs.rmSync(path.join(projectRoot, "artifact.txt"), { force: true });
    const result = runNode(runScript, ["--project-root", projectRoot, "--task", "implement"]);
    assert.equal(result.status, 0, result.stderr);
    const run = parseJsonOutput(result, "always-zero preflight run");
    const consumed = run.attempts[0];
    assert.equal(consumed.runnerId, "cursor");
    assert.equal(consumed.preflight.outcome, "success");
    assert.notEqual(consumed.outcome, "unavailable");
    assert.equal(consumed.outcome, "non-zero-exit");
    assert.equal(run.selectedRunner.id, "codex");
  });

  process.stdout.write(`${JSON.stringify({ ok: true, checks }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
