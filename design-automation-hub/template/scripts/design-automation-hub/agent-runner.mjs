import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  DesignAutomationError,
  findCleanupResultForRun,
  isInside,
  validateCleanupInput,
} from "./contract.mjs";

function runtimeError(code, message) {
  return new DesignAutomationError(code, message, { status: 503, retryable: true });
}

function contained(projectRoot, relativePath, code) {
  if (typeof relativePath !== "string" || !relativePath || path.isAbsolute(relativePath)) {
    throw runtimeError(code, "Runtime path must be project-relative.");
  }
  const resolved = path.resolve(projectRoot, relativePath);
  if (!isInside(projectRoot, resolved)) throw runtimeError(code, "Runtime path escaped project root.");
  return resolved;
}

function runProcess(command, args, options) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(command, args, {
        cwd: options.cwd,
        env: options.env,
        shell: false,
        stdio: "ignore",
      });
    } catch (error) {
      resolve({ exitCode: null, signal: null, errorCode: error.code || "spawn-error" });
      return;
    }
    child.once("error", (error) => {
      resolve({ exitCode: null, signal: null, errorCode: error.code || "spawn-error" });
    });
    child.once("exit", (exitCode, signal) => resolve({ exitCode, signal, errorCode: null }));
  });
}

function readStateDirectory(projectRoot) {
  const configPath = contained(projectRoot, ".agent-automation/config.json", "automation-runtime-unavailable");
  if (!fs.existsSync(configPath)) throw runtimeError("automation-runtime-unavailable", "Agent automation config is missing.");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  if (config?.schemaVersion !== 1 || config.tasks?.["figma-cleanup"]?.skill !== "figma-design-automation") {
    throw runtimeError("automation-runtime-unavailable", "Agent automation config is not bound to figma-design-automation.");
  }
  return contained(projectRoot, config.stateDir, "automation-runtime-unavailable");
}

function latestSummary(stateDirectory, startedAt) {
  if (!fs.existsSync(stateDirectory)) return null;
  const summaries = [];
  for (const entry of fs.readdirSync(stateDirectory, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    try {
      const value = JSON.parse(fs.readFileSync(path.join(stateDirectory, entry.name), "utf8"));
      if (
        value?.taskId === "figma-cleanup"
        && typeof value.startedAt === "string"
        && Date.parse(value.startedAt) >= startedAt - 1000
      ) summaries.push(value);
    } catch {
      // Ignore unrelated malformed files; the selected summary is validated below.
    }
  }
  return summaries.sort((left, right) => right.startedAt.localeCompare(left.startedAt))[0] || null;
}

export function createTaskInvocation(projectRoot, task) {
  if (!/^[A-Za-z0-9-]+$/.test(task.id)) {
    throw runtimeError("automation-runtime-unavailable", "Automation task id is unsafe.");
  }
  const runtimeRoot = contained(projectRoot, ".design-automation/runtime", "automation-runtime-unavailable");
  let existing = runtimeRoot;
  while (!fs.existsSync(existing)) existing = path.dirname(existing);
  if (!isInside(projectRoot, fs.realpathSync(existing))) {
    throw runtimeError("automation-runtime-unavailable", "Runtime root escaped project root.");
  }
  fs.mkdirSync(runtimeRoot, { recursive: true, mode: 0o700 });
  if (!isInside(projectRoot, fs.realpathSync(runtimeRoot)) || fs.lstatSync(runtimeRoot).isSymbolicLink()) {
    throw runtimeError("automation-runtime-unavailable", "Runtime root escaped project root.");
  }
  const directory = contained(projectRoot, path.join(".design-automation/runtime", task.id), "automation-runtime-unavailable");
  if (fs.existsSync(directory)) {
    throw runtimeError("automation-runtime-unavailable", "Task runtime directory already exists.");
  }
  fs.mkdirSync(directory, { mode: 0o700 });
  const inputRelative = path.join(".design-automation/runtime", task.id, "input.json");
  const resultRelative = path.join(".design-automation/runtime", task.id, "result.json");
  const inputPath = contained(projectRoot, inputRelative, "unsafe-cleanup-input-path");
  const resultPath = contained(projectRoot, resultRelative, "unsafe-cleanup-result-path");
  const input = validateCleanupInput({
    schemaVersion: 1,
    taskType: "figma-cleanup",
    automationTaskId: task.id,
    projectId: task.projectId,
    fileKey: task.fileKey,
    scope: task.scope,
    snapshot: task.snapshot,
    inputSnapshotHash: task.inputSnapshotHash,
  });
  fs.writeFileSync(inputPath, `${JSON.stringify(input, null, 2)}\n`, { mode: 0o600, flag: "wx" });
  return { directory, inputRelative, inputPath, resultRelative, resultPath };
}

export async function runGenericCleanup({ projectRoot, task, spawnProcess = runProcess } = {}) {
  const resolvedRoot = fs.realpathSync(projectRoot);
  const genericRoot = contained(
    resolvedRoot,
    ".agents/skills/agent-automation",
    "automation-runtime-unavailable",
  );
  const runScript = path.join(genericRoot, "scripts", "run-task.mjs");
  const companion = contained(
    resolvedRoot,
    ".agents/skills/figma-design-automation/SKILL.md",
    "automation-runtime-unavailable",
  );
  for (const required of [runScript, companion]) {
    if (!fs.existsSync(required) || !fs.statSync(required).isFile()) {
      throw runtimeError("automation-runtime-unavailable", "Generic runtime or companion skill is missing.");
    }
  }
  const stateDirectory = readStateDirectory(resolvedRoot);
  const invocation = createTaskInvocation(resolvedRoot, task);
  const startedAt = Date.now();
  const request = `Read ${invocation.inputRelative} and write exactly one result to ${invocation.resultRelative}.`;
  const processResult = await spawnProcess(process.execPath, [
    runScript,
    "--project-root",
    resolvedRoot,
    "--task",
    "figma-cleanup",
    "--request",
    request,
  ], { cwd: resolvedRoot, env: process.env });
  if (processResult.exitCode !== 0) {
    throw runtimeError("cleanup-analysis-failed", "Generic automation did not complete.");
  }
  const summary = latestSummary(stateDirectory, startedAt);
  if (!summary || summary.phase !== "completed" || !summary.runId) {
    throw runtimeError("cleanup-analysis-failed", "Generic run summary is missing or non-terminal.");
  }
  const candidate = findCleanupResultForRun(resolvedRoot, summary.runId);
  return {
    runSummary: summary,
    result: candidate.result,
    plan: {
      summary: candidate.result.summary,
      operations: candidate.result.operations,
    },
  };
}
