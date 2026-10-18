#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCliArgs } from "./validate-project-config.mjs";

const MANIFESTS = [
  ["package.json", "javascript"],
  ["pyproject.toml", "python"],
  ["Package.swift", "swift"],
  ["Cargo.toml", "rust"],
  ["go.mod", "go"],
  ["Gemfile", "ruby"],
  ["build.gradle", "gradle"],
  ["build.gradle.kts", "gradle"],
];

const PACKAGE_MANAGERS = [
  ["pnpm-lock.yaml", "pnpm"],
  ["yarn.lock", "yarn"],
  ["bun.lock", "bun"],
  ["bun.lockb", "bun"],
  ["package-lock.json", "npm"],
  ["uv.lock", "uv"],
  ["poetry.lock", "poetry"],
  ["Pipfile.lock", "pipenv"],
  ["Package.resolved", "swift-package-manager"],
  ["Cargo.lock", "cargo"],
  ["go.sum", "go"],
  ["Gemfile.lock", "bundler"],
];

const INSTRUCTION_CANDIDATES = [
  "AGENTS.md",
  "CLAUDE.md",
  ".cursor/rules",
  ".cursorrules",
  ".github/copilot-instructions.md",
];

const SKILL_ROOTS = [".agents/skills", ".claude/skills", ".cursor/skills"];

function relativeExisting(projectRoot, candidate) {
  const resolved = path.join(projectRoot, candidate);
  return fs.existsSync(resolved) ? candidate : null;
}

function readPackageScripts(projectRoot, warnings) {
  const packagePath = path.join(projectRoot, "package.json");
  if (!fs.existsSync(packagePath)) return {};
  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    if (!packageJson.scripts || typeof packageJson.scripts !== "object" || Array.isArray(packageJson.scripts)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(packageJson.scripts)
        .filter(([, value]) => typeof value === "string")
        .sort(([left], [right]) => left.localeCompare(right)),
    );
  } catch (error) {
    warnings.push({ code: "invalid-package-json", message: error.message });
    return {};
  }
}

function findProjectSkills(projectRoot) {
  const found = [];
  for (const skillRoot of SKILL_ROOTS) {
    const absoluteRoot = path.join(projectRoot, skillRoot);
    if (!fs.existsSync(absoluteRoot) || !fs.statSync(absoluteRoot).isDirectory()) continue;
    for (const entry of fs.readdirSync(absoluteRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const skillFile = path.join(absoluteRoot, entry.name, "SKILL.md");
      if (!fs.existsSync(skillFile)) continue;
      found.push({ name: entry.name, root: path.join(skillRoot, entry.name) });
    }
  }
  return found.sort((left, right) =>
    left.name === right.name ? left.root.localeCompare(right.root) : left.name.localeCompare(right.name),
  );
}

export function inspectProject(projectRootInput) {
  const projectRoot = path.resolve(projectRootInput);
  if (!fs.existsSync(projectRoot) || !fs.statSync(projectRoot).isDirectory()) {
    throw new Error("Project root does not exist or is not a directory");
  }

  const warnings = [];
  const manifests = MANIFESTS.filter(([file]) => fs.existsSync(path.join(projectRoot, file))).map(
    ([file, type]) => ({ path: file, type }),
  );
  if (manifests.length === 0) {
    warnings.push({
      code: "manifest-not-detected",
      message: "No supported project manifest was found; verification commands must be supplied explicitly",
    });
  }

  const packageManagerMatch = PACKAGE_MANAGERS.find(([file]) =>
    fs.existsSync(path.join(projectRoot, file)),
  );
  const packageManager = packageManagerMatch?.[1] ?? null;
  if (manifests.some((manifest) => manifest.path === "package.json") && !packageManager) {
    warnings.push({
      code: "package-manager-not-detected",
      message: "package.json exists without a recognized lockfile",
    });
  }

  const instructionFiles = INSTRUCTION_CANDIDATES.map((candidate) =>
    relativeExisting(projectRoot, candidate),
  ).filter(Boolean);

  return {
    schemaVersion: 1,
    projectRoot,
    manifest: manifests[0] ?? null,
    manifests,
    packageManager,
    scripts: readPackageScripts(projectRoot, warnings),
    instructionFiles,
    projectSkills: findProjectSkills(projectRoot),
    automationConfigExists: fs.existsSync(path.join(projectRoot, ".agent-automation/config.json")),
    warnings,
  };
}

function main() {
  try {
    const args = parseCliArgs(process.argv.slice(2));
    if (!args["project-root"]) throw new Error("--project-root is required");
    process.stdout.write(`${JSON.stringify(inspectProject(args["project-root"]), null, 2)}\n`);
  } catch (error) {
    process.stdout.write(
      `${JSON.stringify({ error: { code: "inspection-failed", message: error.message } }, null, 2)}\n`,
    );
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) main();
