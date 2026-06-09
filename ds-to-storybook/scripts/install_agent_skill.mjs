#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const agent = readFlag("--agent", "all");
const scope = readFlag("--scope", "user");
const projectRootArg = readFlag("--project-root", "");
const force = args.includes("--force");
const dryRun = args.includes("--dry-run");
const help = args.includes("--help") || args.includes("-h");

if (help) {
  printUsage();
  process.exit(0);
}

const scriptPath = fileURLToPath(import.meta.url);
const skillRoot = path.resolve(path.dirname(scriptPath), "..");
const skillName = path.basename(skillRoot);

validateSkillPackage(skillRoot, skillName);

if (!["all", "claude", "codex", "cursor"].includes(agent)) {
  fail(`Unsupported --agent "${agent}". Expected claude, codex, cursor, or all.`);
}

if (!["user", "project"].includes(scope)) {
  fail(`Unsupported --scope "${scope}". Expected user or project.`);
}

if (scope === "project" && !projectRootArg) {
  fail("--project-root is required when --scope project is used.");
}

const projectRoot = projectRootArg ? path.resolve(projectRootArg) : "";
const targets = resolveTargets({ agent, projectRoot, scope });

for (const target of targets) {
  installSkill(target);
}

console.log("");
console.log("Installed targets:");
for (const target of targets) {
  console.log(`- ${target.agent}: ${target.destination}`);
}

console.log("");
console.log("Invoke as:");
console.log("- Claude Code: /design-system-to-storybook");
console.log("- Codex: Use $design-system-to-storybook");
console.log("- Cursor: /design-system-to-storybook or let Agent decide");

function readFlag(name, defaultValue) {
  const index = args.indexOf(name);
  if (index < 0) return defaultValue;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) fail(`${name} requires a value.`);
  return value;
}

function resolveTargets(options) {
  const selectedAgents = options.agent === "all"
    ? ["claude", "codex", "cursor"]
    : [options.agent];

  return selectedAgents.map((selectedAgent) => ({
    agent: selectedAgent,
    destination: destinationFor(selectedAgent, options.scope, options.projectRoot),
  }));
}

function destinationFor(selectedAgent, selectedScope, selectedProjectRoot) {
  if (selectedScope === "user") {
    const home = os.homedir();
    if (selectedAgent === "claude") return path.join(home, ".claude", "skills", skillName);
    if (selectedAgent === "codex") return path.join(home, ".codex", "skills", skillName);
    if (selectedAgent === "cursor") return path.join(home, ".cursor", "skills", skillName);
  }

  if (selectedAgent === "claude") {
    return path.join(selectedProjectRoot, ".claude", "skills", skillName);
  }
  if (selectedAgent === "codex") {
    return path.join(selectedProjectRoot, ".agents", "skills", skillName);
  }
  if (selectedAgent === "cursor") {
    return path.join(selectedProjectRoot, ".cursor", "skills", skillName);
  }

  fail(`Cannot resolve destination for ${selectedAgent}.`);
}

function installSkill(target) {
  const destination = path.resolve(target.destination);
  if (destination === skillRoot || destination.startsWith(`${skillRoot}${path.sep}`)) {
    fail(`Refusing to install into the source skill directory: ${destination}`);
  }

  if (fs.existsSync(destination) && !force) {
    fail(`${destination} already exists. Re-run with --force to replace it.`);
  }

  if (dryRun) {
    console.log(`[dry-run] ${target.agent}: ${skillRoot} -> ${destination}`);
    return;
  }

  if (fs.existsSync(destination)) {
    fs.rmSync(destination, { force: true, recursive: true });
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  copyDirectory(skillRoot, destination);
}

function copyDirectory(source, destination) {
  fs.mkdirSync(destination, { recursive: true });

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (shouldSkip(entry.name)) continue;

    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, destinationPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(sourcePath, destinationPath);
      fs.chmodSync(destinationPath, fs.statSync(sourcePath).mode);
    } else if (entry.isSymbolicLink()) {
      const linkTarget = fs.readlinkSync(sourcePath);
      fs.symlinkSync(linkTarget, destinationPath);
    }
  }
}

function shouldSkip(name) {
  return name === ".DS_Store" || name === "node_modules" || name === ".git";
}

function validateSkillPackage(root, expectedName) {
  const skillFile = path.join(root, "SKILL.md");
  if (!fs.existsSync(skillFile)) fail(`Missing ${skillFile}.`);

  const markdown = fs.readFileSync(skillFile, "utf8");
  const nameMatch = markdown.match(/^name:\s*([^\n]+)$/m);
  const declaredName = nameMatch?.[1]?.trim().replace(/^["']|["']$/g, "");

  if (declaredName && declaredName !== expectedName) {
    fail(`SKILL.md name "${declaredName}" must match folder name "${expectedName}".`);
  }
}

function fail(message) {
  console.error(message);
  console.error("");
  printUsage();
  process.exit(1);
}

function printUsage() {
  console.log(`Usage:
  node scripts/install_agent_skill.mjs --agent all --scope user [--force]
  node scripts/install_agent_skill.mjs --agent claude --scope project --project-root <repo> [--force]
  node scripts/install_agent_skill.mjs --agent codex --scope project --project-root <repo> [--force]
  node scripts/install_agent_skill.mjs --agent cursor --scope project --project-root <repo> [--force]

Options:
  --agent        claude, codex, cursor, or all. Default: all
  --scope        user or project. Default: user
  --project-root required for project scope
  --force        replace an existing installed copy
  --dry-run      print destinations without copying
`);
}
