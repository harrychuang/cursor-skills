#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  isPathInside,
  loadAndValidateConfig,
  parseCliArgs,
  publicValidationResult,
  resolveProjectPath,
} from "./validate-project-config.mjs";

const BASE_ENV_NAMES = [
  "PATH",
  "HOME",
  "USERPROFILE",
  "SystemRoot",
  "WINDIR",
  "TEMP",
  "TMP",
  "TMPDIR",
  "ComSpec",
  "PATHEXT",
  "LANG",
  "LC_ALL",
  "SHELL",
  "USER",
];

function replacePlaceholders(args, values) {
  return args.map((item) =>
    item.replaceAll("{prompt}", values.prompt).replaceAll("{workspace}", values.workspace),
  );
}

function buildChildEnv(runner, metadata) {
  const environment = {};
  for (const name of [...BASE_ENV_NAMES, ...runner.inheritEnv]) {
    if (process.env[name] !== undefined) environment[name] = process.env[name];
  }
  environment.AGENT_AUTOMATION_RUN_ID = metadata.runId;
  environment.AGENT_AUTOMATION_TASK_ID = metadata.taskId;
  environment.AGENT_AUTOMATION_RUNNER_ID = metadata.runnerId;
  return environment;
}

// Children are started as process-group leaders so a timeout can terminate the
// whole group, including processes the runner itself started. Signalling the
// direct child alone leaves those descendants running and reparented to init.
const activeChildren = new Set();

function signalChildGroup(child, signal) {
  if (typeof child?.pid !== "number") return;
  try {
    // Negative pid targets the whole process group.
    process.kill(-child.pid, signal);
  } catch {
    try {
      child.kill(signal);
    } catch {
      // The child already exited; nothing to signal.
    }
  }
}

// Detaching removes the child from the launcher's foreground process group, so a
// terminal interrupt no longer reaches it automatically. Forward it explicitly to
// keep interactive cancellation working.
for (const forwardedSignal of ["SIGINT", "SIGTERM"]) {
  process.on(forwardedSignal, () => {
    for (const child of activeChildren) signalChildGroup(child, forwardedSignal);
    process.exit(forwardedSignal === "SIGINT" ? 130 : 143);
  });
}

// Child processes never inherit the launcher's standard input. A runner CLI that
// reads stdin observes end of input immediately instead of blocking on an
// inherited open pipe, which would otherwise wedge every attempt until timeoutMs
// whenever the parent is not a terminal. Standard output and standard error keep
// reaching the caller's terminal so diagnostic output stays visible.
function executeProcess({ command, args, cwd, env, timeoutMs, stdio = ["ignore", "inherit", "inherit"] }) {
  return new Promise((resolve) => {
    let child;
    let settled = false;
    let timedOut = false;
    let forceTimer;
    let timeoutTimer;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutTimer);
      clearTimeout(forceTimer);
      if (child) activeChildren.delete(child);
      resolve(result);
    };

    try {
      child = spawn(command, args, { cwd, env, shell: false, stdio, detached: true });
      activeChildren.add(child);
    } catch (error) {
      finish({ outcome: "spawn-error", exitCode: null, signal: null, errorCode: error.code ?? "spawn-error" });
      return;
    }

    child.once("error", (error) => {
      finish({ outcome: "spawn-error", exitCode: null, signal: null, errorCode: error.code ?? "spawn-error" });
    });
    child.once("exit", (exitCode, signal) => {
      finish({
        outcome: timedOut ? "timeout" : exitCode === 0 ? "success" : "non-zero-exit",
        exitCode,
        signal,
      });
    });

    timeoutTimer = setTimeout(() => {
      timedOut = true;
      signalChildGroup(child, "SIGTERM");
      forceTimer = setTimeout(() => {
        signalChildGroup(child, "SIGKILL");
        finish({ outcome: "timeout", exitCode: null, signal: "SIGKILL" });
      }, 1000);
    }, timeoutMs);
  });
}

function createPrompt(taskId, task, request, projectRoot) {
  const lines = [
    `Execute project automation task: ${taskId}`,
    `Workspace: ${projectRoot}`,
  ];
  if (task.skill) {
    lines.push(`Load and follow the project companion skill named ${task.skill} before editing.`);
  }
  lines.push("Project task contract:", task.instruction.trim());
  if (request?.trim()) lines.push("User request:", request.trim());
  lines.push(
    "Keep work inside the workspace, follow repository instructions, and exit zero only after the requested agent work has settled. The launcher will run project verification separately.",
  );
  return lines.join("\n\n");
}

function ensureStateDirectory(projectRoot, stateDir) {
  const resolved = resolveProjectPath(projectRoot, stateDir, "stateDir");
  const realProjectRoot = fs.realpathSync(projectRoot);
  let existing = resolved;
  while (!fs.existsSync(existing)) {
    const parent = path.dirname(existing);
    if (parent === existing) break;
    existing = parent;
  }
  const realExisting = fs.realpathSync(existing);
  if (!isPathInside(realProjectRoot, realExisting)) {
    throw new Error("stateDir resolves through a symlink outside the project root");
  }
  fs.mkdirSync(resolved, { recursive: true });
  const realStateDir = fs.realpathSync(resolved);
  if (!isPathInside(realProjectRoot, realStateDir)) {
    throw new Error("stateDir resolves outside the project root");
  }
  return resolved;
}

function writeSummary(stateDir, summary) {
  summary.updatedAt = new Date().toISOString();
  const destination = path.join(stateDir, `${summary.runId}.json`);
  const temporary = path.join(stateDir, `.${summary.runId}.${process.pid}.tmp`);
  fs.writeFileSync(temporary, `${JSON.stringify(summary, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temporary, destination);
}

function loadResumeSummary(stateDir, runId) {
  if (!/^[A-Za-z0-9-]+$/.test(runId)) throw new Error("--resume must be a safe run ID");
  const summaryPath = path.join(stateDir, `${runId}.json`);
  if (!fs.existsSync(summaryPath)) throw new Error(`Resume run not found: ${runId}`);
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  if (summary.phase === "completed") throw new Error(`Run ${runId} is already completed`);
  return summary;
}

function publicPlan(config, taskId, task, projectRoot) {
  return {
    dryRun: true,
    projectRoot,
    taskId,
    companionSkill: task.skill ?? null,
    runnerOrder: config.runners.map((runner) => ({ id: runner.id, label: runner.label })),
    verification: task.verification.map((item) => ({
      command: item.command,
      args: item.args,
      timeoutMs: item.timeoutMs,
    })),
    requiredArtifacts: task.requiredArtifacts,
  };
}

async function run() {
  const args = parseCliArgs(process.argv.slice(2), { booleans: ["dry-run"] });
  if (!args["project-root"]) throw new Error("--project-root is required");
  if (!args.task) throw new Error("--task is required");

  const validation = loadAndValidateConfig({
    projectRoot: args["project-root"],
    configPath: args.config ?? ".agent-automation/config.json",
  });
  if (!validation.valid) {
    process.stdout.write(`${JSON.stringify(publicValidationResult(validation), null, 2)}\n`);
    process.exitCode = 1;
    return;
  }

  const { config, projectRoot } = validation;
  const task = config.tasks[args.task];
  if (!task) throw new Error(`Unknown task: ${args.task}`);
  if (args["dry-run"]) {
    process.stdout.write(`${JSON.stringify(publicPlan(config, args.task, task, projectRoot), null, 2)}\n`);
    return;
  }

  const stateDir = ensureStateDirectory(projectRoot, config.stateDir);
  const resumedSummary = args.resume ? loadResumeSummary(stateDir, args.resume) : null;
  if (resumedSummary && resumedSummary.taskId !== args.task) {
    throw new Error(`Resume run ${args.resume} belongs to task ${resumedSummary.taskId}`);
  }

  const now = new Date().toISOString();
  const summary = {
    schemaVersion: 1,
    runId: randomUUID(),
    taskId: args.task,
    phase: "running",
    selectedRunner: null,
    resumedFrom: resumedSummary?.runId ?? null,
    attempts: [],
    verification: [],
    artifacts: [],
    startedAt: now,
    updatedAt: now,
    finishedAt: null,
  };
  writeSummary(stateDir, summary);

  const prompt = createPrompt(args.task, task, args.request ?? "", projectRoot);
  let selectedRunner = null;

  for (const runner of config.runners) {
    const attempt = {
      runnerId: runner.id,
      runnerLabel: runner.label,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      preflight: null,
      outcome: "running",
      exitCode: null,
      signal: null,
    };
    summary.attempts.push(attempt);
    writeSummary(stateDir, summary);

    const childEnv = buildChildEnv(runner, {
      runId: summary.runId,
      taskId: summary.taskId,
      runnerId: runner.id,
    });

    if (runner.preflight) {
      const preflight = await executeProcess({
        command: runner.preflight.command,
        args: runner.preflight.args,
        cwd: projectRoot,
        env: childEnv,
        timeoutMs: runner.preflight.timeoutMs,
        stdio: "ignore",
      });
      attempt.preflight = {
        outcome: preflight.outcome,
        exitCode: preflight.exitCode,
        signal: preflight.signal,
        errorCode: preflight.errorCode ?? null,
      };
      if (preflight.outcome !== "success") {
        attempt.outcome = "unavailable";
        attempt.finishedAt = new Date().toISOString();
        writeSummary(stateDir, summary);
        continue;
      }
    }

    const processResult = await executeProcess({
      command: runner.command,
      args: replacePlaceholders(runner.args, { prompt, workspace: projectRoot }),
      cwd: projectRoot,
      env: childEnv,
      timeoutMs: runner.timeoutMs,
    });
    attempt.outcome = processResult.outcome;
    attempt.exitCode = processResult.exitCode;
    attempt.signal = processResult.signal;
    attempt.errorCode = processResult.errorCode ?? null;
    attempt.finishedAt = new Date().toISOString();
    writeSummary(stateDir, summary);

    if (processResult.outcome === "success") {
      selectedRunner = runner;
      summary.selectedRunner = { id: runner.id, label: runner.label };
      break;
    }
  }

  if (!selectedRunner) {
    summary.phase = "exhausted";
    summary.finishedAt = new Date().toISOString();
    writeSummary(stateDir, summary);
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    process.exitCode = 1;
    return;
  }

  const verificationEnv = buildChildEnv({ inheritEnv: [] }, {
    runId: summary.runId,
    taskId: summary.taskId,
    runnerId: selectedRunner.id,
  });
  let checksPassed = true;
  for (let index = 0; index < task.verification.length; index += 1) {
    const command = task.verification[index];
    const result = await executeProcess({
      command: command.command,
      args: command.args,
      cwd: projectRoot,
      env: verificationEnv,
      timeoutMs: command.timeoutMs,
    });
    const passed = result.outcome === "success";
    summary.verification.push({
      index,
      passed,
      outcome: result.outcome,
      exitCode: result.exitCode,
      signal: result.signal,
      errorCode: result.errorCode ?? null,
    });
    writeSummary(stateDir, summary);
    if (!passed) {
      checksPassed = false;
      break;
    }
  }

  for (const artifact of task.requiredArtifacts) {
    const artifactPath = resolveProjectPath(projectRoot, artifact, `artifact:${artifact}`);
    const exists = fs.existsSync(artifactPath);
    summary.artifacts.push({ path: artifact, exists });
    if (!exists) checksPassed = false;
  }

  summary.phase = checksPassed ? "completed" : "verification-failed";
  summary.finishedAt = new Date().toISOString();
  writeSummary(stateDir, summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (!checksPassed) process.exitCode = 1;
}

run().catch((error) => {
  process.stdout.write(
    `${JSON.stringify({ error: { code: "run-failed", message: error.message } }, null, 2)}\n`,
  );
  process.exitCode = 1;
});
