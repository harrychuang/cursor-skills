#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  isPathInside,
  loadAndValidateConfig,
  parseCliArgs,
  publicValidationResult,
  resolveProjectPath,
} from "./validate-project-config.mjs";

function readSummary(summaryPath) {
  try {
    const value = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value) || !value.runId) return null;
    return value;
  } catch {
    return null;
  }
}

export function findRunSummary({ projectRoot, config, runId }) {
  const stateDir = resolveProjectPath(projectRoot, config.stateDir, "stateDir");
  if (!fs.existsSync(stateDir) || !fs.statSync(stateDir).isDirectory()) {
    return { found: false, code: "state-not-found", message: "No automation run state exists" };
  }
  const realProjectRoot = fs.realpathSync(projectRoot);
  const realStateDir = fs.realpathSync(stateDir);
  if (!isPathInside(realProjectRoot, realStateDir)) {
    return {
      found: false,
      code: "unsafe-state-dir",
      message: "Automation state resolves outside the project root",
    };
  }

  if (runId) {
    if (!/^[A-Za-z0-9-]+$/.test(runId)) {
      return { found: false, code: "invalid-run-id", message: "Run ID contains unsupported characters" };
    }
    const summary = readSummary(path.join(stateDir, `${runId}.json`));
    return summary
      ? { found: true, summary }
      : { found: false, code: "run-not-found", message: `Run ${runId} was not found` };
  }

  const summaries = fs
    .readdirSync(stateDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json") && !entry.name.startsWith("."))
    .map((entry) => readSummary(path.join(stateDir, entry.name)))
    .filter(Boolean)
    .sort((left, right) => {
      const leftTime = Date.parse(left.updatedAt ?? left.startedAt ?? 0);
      const rightTime = Date.parse(right.updatedAt ?? right.startedAt ?? 0);
      return rightTime - leftTime;
    });

  return summaries[0]
    ? { found: true, summary: summaries[0] }
    : { found: false, code: "run-not-found", message: "No automation run summaries were found" };
}

function main() {
  try {
    const args = parseCliArgs(process.argv.slice(2));
    if (!args["project-root"]) throw new Error("--project-root is required");
    const validation = loadAndValidateConfig({
      projectRoot: args["project-root"],
      configPath: args.config ?? ".agent-automation/config.json",
    });
    if (!validation.valid) {
      process.stdout.write(`${JSON.stringify(publicValidationResult(validation), null, 2)}\n`);
      process.exitCode = 1;
      return;
    }

    const result = findRunSummary({
      projectRoot: validation.projectRoot,
      config: validation.config,
      runId: args["run-id"],
    });
    if (!result.found) {
      process.stdout.write(`${JSON.stringify({ error: { code: result.code, message: result.message } }, null, 2)}\n`);
      process.exitCode = 1;
      return;
    }
    process.stdout.write(`${JSON.stringify(result.summary, null, 2)}\n`);
  } catch (error) {
    process.stdout.write(
      `${JSON.stringify({ error: { code: "status-failed", message: error.message } }, null, 2)}\n`,
    );
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) main();
