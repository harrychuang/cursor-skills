#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const MAX_BYTES = 1024 * 1024;

function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function parseArgs(argv) {
  const allowed = new Set(["project-root", "input", "result"]);
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const token = argv[index];
    const value = argv[index + 1];
    if (!token?.startsWith("--") || !allowed.has(token.slice(2)) || !value || value.startsWith("--")) {
      fail("invalid-cleanup-writer-options");
    }
    values[token.slice(2)] = value;
  }
  return values;
}

function resolveContained(root, relativePath, code) {
  if (!relativePath || path.isAbsolute(relativePath)) fail(code);
  const resolved = path.resolve(root, relativePath);
  if (!inside(root, resolved)) fail(code);
  return resolved;
}

function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    process.stdin.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BYTES) {
        reject(Object.assign(new Error("cleanup-result-too-large"), { code: "cleanup-result-too-large" }));
        process.stdin.destroy();
        return;
      }
      chunks.push(chunk);
    });
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    process.stdin.on("error", reject);
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options["project-root"] || !path.isAbsolute(options["project-root"])) fail("unsafe-project-root");
  const projectRoot = fs.realpathSync(options["project-root"]);
  const inputPath = resolveContained(projectRoot, options.input, "unsafe-cleanup-input-path");
  const resultPath = resolveContained(projectRoot, options.result, "unsafe-cleanup-result-path");
  if (inputPath === resultPath) fail("unsafe-cleanup-result-path");

  const runtimeRoot = path.join(projectRoot, ".design-automation", "runtime");
  const inputTaskRoot = path.dirname(inputPath);
  const resultTaskRoot = path.dirname(resultPath);
  if (
    inputTaskRoot !== resultTaskRoot
    || path.basename(inputPath) !== "input.json"
    || path.basename(resultPath) !== "result.json"
    || !inside(runtimeRoot, inputTaskRoot)
  ) fail("unsafe-cleanup-result-path");

  if (!fs.existsSync(runtimeRoot) || !inside(projectRoot, fs.realpathSync(runtimeRoot))) {
    fail("unsafe-cleanup-input-path");
  }
  if (
    !fs.existsSync(inputTaskRoot)
    || !inside(fs.realpathSync(runtimeRoot), fs.realpathSync(inputTaskRoot))
    || fs.realpathSync(inputTaskRoot) !== fs.realpathSync(resultTaskRoot)
  ) fail("unsafe-cleanup-result-path");
  if (!fs.existsSync(inputPath) || fs.lstatSync(inputPath).isSymbolicLink()) fail("unsafe-cleanup-input-path");
  if (fs.existsSync(resultPath) && fs.lstatSync(resultPath).isSymbolicLink()) fail("unsafe-cleanup-result-path");
  const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const runId = process.env.AGENT_AUTOMATION_RUN_ID;
  if (
    !runId
    || !process.env.AGENT_AUTOMATION_RUNNER_ID
    || process.env.AGENT_AUTOMATION_TASK_ID !== "figma-cleanup"
  ) fail("missing-agent-automation-identity");

  const candidate = JSON.parse(await readStdin());
  if (
    candidate?.schemaVersion !== 1
    || candidate?.taskType !== "figma-cleanup"
    || candidate?.automationTaskId !== input.automationTaskId
    || candidate?.inputSnapshotHash !== input.inputSnapshotHash
    || candidate?.agentAutomationRunId !== runId
  ) fail("cleanup-result-identity-mismatch");

  fs.mkdirSync(resultTaskRoot, { recursive: true, mode: 0o700 });
  const temporary = path.join(resultTaskRoot, `.result.${process.pid}.tmp`);
  fs.writeFileSync(temporary, `${JSON.stringify(candidate, null, 2)}\n`, { mode: 0o600, flag: "wx" });
  fs.renameSync(temporary, resultPath);
}

main().catch((error) => {
  process.stderr.write(`${error.code || "cleanup-result-write-failed"}\n`);
  process.exitCode = 1;
});
