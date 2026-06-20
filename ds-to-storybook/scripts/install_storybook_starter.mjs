#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const force = args.includes("--force");
const pmFlagIndex = args.indexOf("--package-manager");
const forcedPackageManager = pmFlagIndex >= 0 ? args[pmFlagIndex + 1] : "";
const positional = args.filter((arg, index) => {
  if (arg === "--force" || arg === "--package-manager") return false;
  if (pmFlagIndex >= 0 && index === pmFlagIndex + 1) return false;
  return !arg.startsWith("--");
});

const targetRoot = path.resolve(positional[0] || process.cwd());
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(scriptDir, "..");
const starterDir = path.join(skillRoot, "assets", "storybook-starter");

main();

function main() {
  assertStarterAsset();
  assertTargetRoot(targetRoot, force);

  fs.mkdirSync(targetRoot, { recursive: true });
  copyStarter(starterDir, targetRoot);
  syncBundledAddonDist(targetRoot);

  const packageManager = normalizePackageManager(
    forcedPackageManager || detectPackageManager(targetRoot),
  );

  console.log(`Installed Storybook starter at ${targetRoot}`);
  console.log(`Running ${packageManager} install...`);

  const result = spawnSync(packageManager, installArgs(packageManager), {
    cwd: targetRoot,
    stdio: "inherit",
    env: process.env,
  });

  if (result.error) {
    console.error(`Failed to run ${packageManager}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  console.log("Storybook starter ready. Run `npm run storybook` in the target project.");
}

function assertStarterAsset() {
  const requiredPaths = [
    path.join(starterDir, "package.json"),
    path.join(starterDir, ".storybook", "main.ts"),
    path.join(starterDir, ".storybook", "prototype-inspector", "preset.js"),
    path.join(starterDir, ".storybook", "vendor", "figma-export-addon", "package.json"),
  ];

  for (const requiredPath of requiredPaths) {
    if (!fs.existsSync(requiredPath)) {
      throw new Error(`Storybook starter asset is incomplete; missing ${requiredPath}`);
    }
  }
}

function assertTargetRoot(root, allowForce) {
  if (!fs.existsSync(root)) {
    return;
  }

  const entries = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.name !== ".git")
    .map((entry) => entry.name);

  if (entries.length === 0) {
    return;
  }

  const hasStorybook = fs.existsSync(path.join(root, ".storybook", "main.ts"));
  const hasPackageJson = fs.existsSync(path.join(root, "package.json"));

  if (hasStorybook && hasPackageJson && !allowForce) {
    throw new Error(
      `Target already looks like a Storybook project (${root}). Use --force to overwrite starter files.`,
    );
  }

  if (!allowForce && entries.some((name) => ![".gitkeep", ".DS_Store"].includes(name))) {
    throw new Error(
      `Target directory is not empty (${root}). Use an empty directory or pass --force.`,
    );
  }
}

function copyStarter(sourceRoot, targetRoot) {
  const skipNames = new Set([
    "node_modules",
    "storybook-static",
    "dist",
    ".git",
    ".DS_Store",
    "package-lock.json",
  ]);

  for (const entry of fs.readdirSync(sourceRoot, { withFileTypes: true })) {
    if (skipNames.has(entry.name)) {
      continue;
    }

    const sourcePath = path.join(sourceRoot, entry.name);
    const targetPath = path.join(targetRoot, entry.name);
    fs.cpSync(sourcePath, targetPath, {
      recursive: true,
      dereference: true,
      filter: (copiedPath) => !shouldSkipCopy(copiedPath, skipNames),
    });
  }
}

function shouldSkipCopy(sourcePath, skipNames) {
  const parts = sourcePath.split(path.sep);
  return parts.some((part) => skipNames.has(part));
}

function syncBundledAddonDist(targetRoot) {
  const bundledAddonDist = path.join(skillRoot, "assets", "figma-export-addon", "dist");
  const targetAddonDist = path.join(
    targetRoot,
    ".storybook",
    "vendor",
    "figma-export-addon",
    "dist",
  );

  if (!fs.existsSync(bundledAddonDist)) {
    throw new Error(`Bundled Figma export addon dist is missing at ${bundledAddonDist}`);
  }

  fs.mkdirSync(path.dirname(targetAddonDist), { recursive: true });
  fs.rmSync(targetAddonDist, { recursive: true, force: true });
  fs.cpSync(bundledAddonDist, targetAddonDist, { recursive: true, dereference: true });
}

function detectPackageManager(root) {
  if (fs.existsSync(path.join(root, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(root, "yarn.lock"))) return "yarn";
  if (fs.existsSync(path.join(root, "bun.lockb")) || fs.existsSync(path.join(root, "bun.lock"))) {
    return "bun";
  }
  return "npm";
}

function normalizePackageManager(packageManager) {
  const normalized = String(packageManager || "npm").split("@")[0];
  if (["npm", "pnpm", "yarn", "bun"].includes(normalized)) return normalized;
  throw new Error(`Unsupported package manager: ${packageManager}`);
}

function installArgs(packageManager) {
  if (packageManager === "npm") return ["install"];
  if (packageManager === "pnpm") return ["install"];
  if (packageManager === "yarn") return ["install"];
  if (packageManager === "bun") return ["install"];
  throw new Error(`Unsupported package manager: ${packageManager}`);
}
