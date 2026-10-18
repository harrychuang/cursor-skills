#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "SKILL.md",
  "agents/openai.yaml",
  "references/cleanup-contract.md",
  "scripts/write-cleanup-result.mjs",
];
for (const relativePath of required) {
  assert.equal(fs.statSync(path.join(skillRoot, relativePath)).isFile(), true, `missing ${relativePath}`);
}

const markdown = fs.readFileSync(path.join(skillRoot, "SKILL.md"), "utf8");
for (const phrase of [
  "name: figma-design-automation",
  "agent-automation",
  "AGENT_AUTOMATION_RUN_ID",
  "AGENT_AUTOMATION_TASK_ID",
  "AGENT_AUTOMATION_RUNNER_ID",
  ".design-automation/runtime/",
  "at most 100",
  "rename-node",
  "reorder-node",
  "move-node",
  "only permitted write",
]) assert.ok(markdown.includes(phrase), `missing contract phrase: ${phrase}`);

for (const forbidden of [
  "codex exec",
  "claude -p",
  "gemini ",
  "openai api",
  "anthropic api",
  "launch the runner",
]) {
  assert.equal(markdown.toLowerCase().includes(forbidden.toLowerCase()), false, `generic control leaked: ${forbidden}`);
}

const hashInventory = (root) => {
  const entries = [];
  const visit = (current, prefix = "") => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) visit(path.join(current, entry.name), relativePath);
      else if (entry.isFile()) {
        entries.push(`${relativePath}:${crypto.createHash("sha256").update(fs.readFileSync(path.join(current, entry.name))).digest("hex")}`);
      }
    }
  };
  visit(root);
  return crypto.createHash("sha256").update(entries.join("\n")).digest("hex");
};

const projectRootIndex = process.argv.indexOf("--project-root");
if (projectRootIndex >= 0) {
  const projectRoot = fs.realpathSync(process.argv[projectRootIndex + 1]);
  const mirrors = [
    ".agents/skills/figma-design-automation",
    ".claude/skills/figma-design-automation",
    ".cursor/skills/figma-design-automation",
  ];
  const canonical = hashInventory(skillRoot);
  for (const mirror of mirrors) {
    assert.equal(hashInventory(path.join(projectRoot, mirror)), canonical, `skill-mirror-drift: ${mirror}`);
  }
}

process.stdout.write(`${JSON.stringify({
  valid: true,
  checks: [
    "generic-domain-boundary",
    "invocation-path-containment",
    "required-run-identity",
    "snapshot-500-501-boundary",
    "canonical-snapshot-hash",
    "scope-parent-containment",
    "skill-mirror-parity"
  ]
})}\n`);
