#!/usr/bin/env node

import fs from "node:fs";

import { findCleanupResultForRun } from "./contract.mjs";

try {
  const runId = process.env.AGENT_AUTOMATION_RUN_ID;
  if (
    !runId
    || process.env.AGENT_AUTOMATION_TASK_ID !== "figma-cleanup"
    || !process.env.AGENT_AUTOMATION_RUNNER_ID
  ) throw Object.assign(new Error("Generic run identity is missing."), { code: "missing-agent-automation-identity" });
  const projectRoot = fs.realpathSync(process.cwd());
  const candidate = findCleanupResultForRun(projectRoot, runId);
  process.stdout.write(`${JSON.stringify({
    valid: true,
    automationTaskId: candidate.input.automationTaskId,
    inputSnapshotHash: candidate.input.inputSnapshotHash,
    agentAutomationRunId: runId,
    status: candidate.result.status,
    operationCount: candidate.result.operations.length,
  })}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({
    valid: false,
    issue: { code: error.code || "invalid-cleanup-result" },
  })}\n`);
  process.exitCode = 1;
}
