#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_CONFIG = ".agent-automation/config.json";
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ENV_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const CREDENTIAL_KEY_PATTERN = /(api.?key|token|secret|password|credential|private.?key)/i;

const TOP_LEVEL_KEYS = new Set(["schemaVersion", "stateDir", "runners", "tasks"]);
const RUNNER_KEYS = new Set([
  "id",
  "label",
  "command",
  "args",
  "timeoutMs",
  "preflight",
  "inheritEnv",
]);
const PROCESS_KEYS = new Set(["command", "args", "timeoutMs"]);
const TASK_KEYS = new Set(["instruction", "skill", "verification", "requiredArtifacts"]);

export function parseCliArgs(argv, options = {}) {
  const values = {};
  const booleans = new Set(options.booleans ?? []);
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument: ${token}`);
    }
    const name = token.slice(2);
    if (booleans.has(name)) {
      values[name] = true;
      continue;
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`--${name} requires a value`);
    }
    values[name] = value;
    index += 1;
  }
  return values;
}

export function isPathInside(projectRoot, candidatePath) {
  const relative = path.relative(projectRoot, candidatePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function resolveProjectPath(projectRoot, inputPath, fieldPath = "path") {
  if (typeof inputPath !== "string" || inputPath.trim() === "") {
    throw new Error(`${fieldPath} must be a non-empty project-relative path`);
  }
  if (path.isAbsolute(inputPath)) {
    throw new Error(`${fieldPath} must be project-relative`);
  }
  const resolved = path.resolve(projectRoot, inputPath);
  if (!isPathInside(projectRoot, resolved)) {
    throw new Error(`${fieldPath} must remain inside the project root`);
  }
  return resolved;
}

export function countPlaceholder(args, placeholder) {
  return args.reduce((total, item) => {
    if (typeof item !== "string") return total;
    return total + item.split(placeholder).length - 1;
  }, 0);
}

function addError(errors, fieldPath, code, message) {
  errors.push({ path: fieldPath, code, message });
}

function validateKnownKeys(value, allowed, fieldPath, errors) {
  if (!isPlainObject(value)) return;
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      addError(errors, `${fieldPath}.${key}`, "unknown-field", "Field is not supported by schema version 1");
    }
  }
}

function validateProcessShape(value, fieldPath, errors, options = {}) {
  if (!isPlainObject(value)) {
    addError(errors, fieldPath, "invalid-process", "Expected an object with command, args, and timeoutMs");
    return;
  }
  if (!options.skipKnownKeys) validateKnownKeys(value, PROCESS_KEYS, fieldPath, errors);
  if (typeof value.command !== "string" || value.command.trim() === "") {
    addError(errors, `${fieldPath}.command`, "invalid-command", "Expected a non-empty executable");
  }
  if (!Array.isArray(value.args) || value.args.some((item) => typeof item !== "string")) {
    addError(errors, `${fieldPath}.args`, "invalid-args", "Expected an array of strings");
  } else if (options.forbidPlaceholders) {
    const forbidden = value.args.filter(
      (item) => item.includes("{prompt}") || item.includes("{workspace}"),
    );
    if (forbidden.length > 0) {
      addError(
        errors,
        `${fieldPath}.args`,
        "unexpected-placeholder",
        "Preflight and verification args cannot contain runner placeholders",
      );
    }
  }
  if (!Number.isInteger(value.timeoutMs) || value.timeoutMs <= 0) {
    addError(errors, `${fieldPath}.timeoutMs`, "invalid-timeout", "Expected a positive integer timeoutMs");
  }
}

function validateRunner(runner, index, errors, seenIds) {
  const fieldPath = `runners[${index}]`;
  if (!isPlainObject(runner)) {
    addError(errors, fieldPath, "invalid-runner", "Expected a runner object");
    return;
  }
  validateKnownKeys(runner, RUNNER_KEYS, fieldPath, errors);

  if (typeof runner.id !== "string" || !ID_PATTERN.test(runner.id)) {
    addError(errors, `${fieldPath}.id`, "invalid-runner-id", "Expected a kebab-case runner ID");
  } else if (seenIds.has(runner.id)) {
    addError(errors, `${fieldPath}.id`, "duplicate-runner-id", `Runner ID ${runner.id} is duplicated`);
  } else {
    seenIds.add(runner.id);
  }

  if (typeof runner.label !== "string" || runner.label.trim() === "") {
    addError(errors, `${fieldPath}.label`, "invalid-label", "Expected a non-empty runner label");
  }

  validateProcessShape(runner, fieldPath, errors, { skipKnownKeys: true });
  if (Array.isArray(runner.args)) {
    const promptCount = countPlaceholder(runner.args, "{prompt}");
    const workspaceCount = countPlaceholder(runner.args, "{workspace}");
    if (promptCount !== 1) {
      addError(
        errors,
        `${fieldPath}.args`,
        "invalid-prompt-placeholder",
        `Expected exactly one {prompt} placeholder; found ${promptCount}`,
      );
    }
    if (workspaceCount !== 1) {
      addError(
        errors,
        `${fieldPath}.args`,
        "invalid-workspace-placeholder",
        `Expected exactly one {workspace} placeholder; found ${workspaceCount}`,
      );
    }
  }

  if (runner.preflight !== undefined) {
    validateProcessShape(runner.preflight, `${fieldPath}.preflight`, errors, {
      forbidPlaceholders: true,
    });
  }

  if (!Array.isArray(runner.inheritEnv) || runner.inheritEnv.some((item) => typeof item !== "string")) {
    addError(errors, `${fieldPath}.inheritEnv`, "invalid-inherit-env", "Expected an array of environment variable names");
  } else {
    const seenEnv = new Set();
    runner.inheritEnv.forEach((name, envIndex) => {
      if (!ENV_NAME_PATTERN.test(name)) {
        addError(
          errors,
          `${fieldPath}.inheritEnv[${envIndex}]`,
          "invalid-env-name",
          "Expected a valid environment variable name",
        );
      } else if (seenEnv.has(name)) {
        addError(
          errors,
          `${fieldPath}.inheritEnv[${envIndex}]`,
          "duplicate-env-name",
          `Environment variable ${name} is duplicated`,
        );
      }
      seenEnv.add(name);
    });
  }
}

function validateTask(task, taskId, projectRoot, errors) {
  const fieldPath = `tasks.${taskId}`;
  if (!ID_PATTERN.test(taskId)) {
    addError(errors, fieldPath, "invalid-task-id", "Task IDs must be kebab-case");
  }
  if (!isPlainObject(task)) {
    addError(errors, fieldPath, "invalid-task", "Expected a task object");
    return;
  }
  validateKnownKeys(task, TASK_KEYS, fieldPath, errors);
  if (typeof task.instruction !== "string" || task.instruction.trim() === "") {
    addError(errors, `${fieldPath}.instruction`, "invalid-instruction", "Expected a non-empty instruction");
  }
  if (task.skill !== undefined && (typeof task.skill !== "string" || !ID_PATTERN.test(task.skill))) {
    addError(errors, `${fieldPath}.skill`, "invalid-skill", "Expected a kebab-case companion skill name");
  }
  if (!Array.isArray(task.verification)) {
    addError(errors, `${fieldPath}.verification`, "invalid-verification", "Expected an array of command objects");
  } else {
    task.verification.forEach((command, index) =>
      validateProcessShape(command, `${fieldPath}.verification[${index}]`, errors, {
        forbidPlaceholders: true,
      }),
    );
  }
  if (!Array.isArray(task.requiredArtifacts) || task.requiredArtifacts.some((item) => typeof item !== "string")) {
    addError(errors, `${fieldPath}.requiredArtifacts`, "invalid-artifacts", "Expected an array of project-relative paths");
  } else {
    task.requiredArtifacts.forEach((artifact, index) => {
      try {
        resolveProjectPath(projectRoot, artifact, `${fieldPath}.requiredArtifacts[${index}]`);
      } catch (error) {
        addError(
          errors,
          `${fieldPath}.requiredArtifacts[${index}]`,
          "unsafe-artifact-path",
          error.message,
        );
      }
    });
  }
}

function findEmbeddedCredentials(value, fieldPath, errors) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => findEmbeddedCredentials(item, `${fieldPath}[${index}]`, errors));
    return;
  }
  if (!isPlainObject(value)) return;
  for (const [key, item] of Object.entries(value)) {
    const nextPath = fieldPath ? `${fieldPath}.${key}` : key;
    if (CREDENTIAL_KEY_PATTERN.test(key) && item !== undefined && item !== null && item !== "") {
      addError(
        errors,
        nextPath,
        "embedded-credential",
        "Store credential names in inheritEnv and keep credential values outside the project contract",
      );
    }
    findEmbeddedCredentials(item, nextPath, errors);
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function validateConfig(config, projectRoot) {
  const errors = [];
  if (!isPlainObject(config)) {
    return [{ path: "$", code: "invalid-config", message: "Expected a JSON object" }];
  }
  validateKnownKeys(config, TOP_LEVEL_KEYS, "$", errors);
  findEmbeddedCredentials(config, "", errors);

  if (config.schemaVersion !== 1) {
    addError(errors, "schemaVersion", "unsupported-schema-version", "Expected schemaVersion 1");
  }

  try {
    resolveProjectPath(projectRoot, config.stateDir, "stateDir");
  } catch (error) {
    addError(errors, "stateDir", "unsafe-state-dir", error.message);
  }

  if (!Array.isArray(config.runners) || config.runners.length < 1 || config.runners.length > 3) {
    addError(errors, "runners", "invalid-runner-count", "Expected between 1 and 3 runners");
  } else {
    const seenIds = new Set();
    config.runners.forEach((runner, index) => validateRunner(runner, index, errors, seenIds));
  }

  if (!isPlainObject(config.tasks) || Object.keys(config.tasks).length === 0) {
    addError(errors, "tasks", "invalid-tasks", "Expected at least one configured task");
  } else {
    for (const [taskId, task] of Object.entries(config.tasks)) {
      validateTask(task, taskId, projectRoot, errors);
    }
  }

  return errors;
}

export function loadAndValidateConfig({ projectRoot, configPath = DEFAULT_CONFIG }) {
  const resolvedRoot = path.resolve(projectRoot);
  const result = {
    valid: false,
    projectRoot: resolvedRoot,
    configPath: null,
    config: null,
    errors: [],
  };
  if (!fs.existsSync(resolvedRoot) || !fs.statSync(resolvedRoot).isDirectory()) {
    result.errors.push({
      path: "projectRoot",
      code: "project-root-not-found",
      message: "Project root does not exist or is not a directory",
    });
    return result;
  }

  try {
    result.configPath = resolveProjectPath(resolvedRoot, configPath, "config");
  } catch (error) {
    result.errors.push({ path: "config", code: "unsafe-config-path", message: error.message });
    return result;
  }

  if (!fs.existsSync(result.configPath)) {
    result.errors.push({ path: "config", code: "config-not-found", message: "Project contract was not found" });
    return result;
  }

  try {
    result.config = JSON.parse(fs.readFileSync(result.configPath, "utf8"));
  } catch (error) {
    result.errors.push({ path: "config", code: "invalid-json", message: error.message });
    return result;
  }

  result.errors = validateConfig(result.config, resolvedRoot);
  result.valid = result.errors.length === 0;
  return result;
}

export function publicValidationResult(result) {
  return {
    valid: result.valid,
    projectRoot: result.projectRoot,
    configPath: result.configPath,
    runnerOrder: result.valid ? result.config.runners.map((runner) => runner.id) : [],
    taskIds: result.valid ? Object.keys(result.config.tasks) : [],
    errors: result.errors,
  };
}

function main() {
  try {
    const args = parseCliArgs(process.argv.slice(2));
    if (!args["project-root"]) throw new Error("--project-root is required");
    const result = loadAndValidateConfig({
      projectRoot: args["project-root"],
      configPath: args.config ?? DEFAULT_CONFIG,
    });
    process.stdout.write(`${JSON.stringify(publicValidationResult(result), null, 2)}\n`);
    if (!result.valid) process.exitCode = 1;
  } catch (error) {
    process.stdout.write(
      `${JSON.stringify({ valid: false, errors: [{ path: "$", code: "invalid-cli", message: error.message }] }, null, 2)}\n`,
    );
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) main();
