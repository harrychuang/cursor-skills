#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const copyOnly = args.includes("--copy-only");
const pmFlagIndex = args.indexOf("--package-manager");
const forcedPackageManager = pmFlagIndex >= 0 ? args[pmFlagIndex + 1] : "";
const positional = args.filter((arg, index) => {
  if (arg === "--copy-only" || arg === "--package-manager") return false;
  if (pmFlagIndex >= 0 && index === pmFlagIndex + 1) return false;
  return !arg.startsWith("--");
});

const productRoot = path.resolve(positional[0] || process.cwd());
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(scriptDir, "..");
const bundledAddonDir = path.join(skillRoot, "assets", "figma-export-addon");
const targetVendorDir = path.join(productRoot, ".storybook", "vendor", "figma-export-addon");
const packageJsonPath = path.join(productRoot, "package.json");

main();

function main() {
  assertProductRoot(productRoot);
  assertBundledAddon();

  fs.mkdirSync(path.dirname(targetVendorDir), { recursive: true });
  fs.rmSync(targetVendorDir, { recursive: true, force: true });
  fs.cpSync(bundledAddonDir, targetVendorDir, {
    recursive: true,
    dereference: true,
    filter: (source) => !shouldSkipCopy(source),
  });

  const relativeVendorSpec = `file:${toPosix(path.relative(productRoot, targetVendorDir))}`;
  const packageManager = normalizePackageManager(
    forcedPackageManager || detectPackageManager(productRoot, readPackageJson(packageJsonPath)),
  );
  const needsIcons = !hasDependency(packageJsonPath, "@storybook/icons");

  console.log(`Copied bundled addon to ${targetVendorDir}`);

  if (copyOnly) {
    console.log(`Copy-only mode. Install spec: ${relativeVendorSpec}`);
    return;
  }

  const installArgs = installCommandArgs(packageManager, relativeVendorSpec, needsIcons);
  console.log(`Installing with ${packageManager}: ${installArgs.join(" ")}`);

  const result = spawnSync(packageManager, installArgs, {
    cwd: productRoot,
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
}

function assertProductRoot(root) {
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`Cannot find package.json at ${packageJsonPath}`);
  }
  if (!fs.existsSync(path.join(root, ".storybook"))) {
    throw new Error(`Cannot find .storybook/ at ${path.join(root, ".storybook")}`);
  }
}

function assertBundledAddon() {
  const requiredFiles = [
    path.join(bundledAddonDir, "package.json"),
    path.join(bundledAddonDir, "dist", "index.js"),
    path.join(bundledAddonDir, "dist", "preview.js"),
    path.join(bundledAddonDir, "dist", "preset.js"),
    path.join(bundledAddonDir, "dist", "review.js"),
    path.join(bundledAddonDir, "dist", "review-server.js"),
    path.join(bundledAddonDir, "dist", "source.js"),
    path.join(bundledAddonDir, "dist", "figma-code-exporter.css"),
    path.join(bundledAddonDir, "dist", "review.css"),
  ];

  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      throw new Error(`Bundled Figma export addon is incomplete; missing ${file}`);
    }
  }
}

function shouldSkipCopy(source) {
  const base = path.basename(source);
  return base === "node_modules" || base === ".git" || base === ".DS_Store";
}

function readPackageJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function detectPackageManager(root, packageJson) {
  const declared = String(packageJson.packageManager || "").split("@")[0];
  if (declared) return declared;

  if (fs.existsSync(path.join(root, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(root, "yarn.lock"))) return "yarn";
  if (fs.existsSync(path.join(root, "bun.lockb")) || fs.existsSync(path.join(root, "bun.lock"))) return "bun";
  return "npm";
}

function normalizePackageManager(packageManager) {
  const normalized = String(packageManager || "npm").split("@")[0];
  if (["npm", "pnpm", "yarn", "bun"].includes(normalized)) return normalized;
  throw new Error(`Unsupported package manager: ${packageManager}`);
}

function hasDependency(file, dependencyName) {
  const packageJson = readPackageJson(file);
  const sections = [
    packageJson.dependencies,
    packageJson.devDependencies,
    packageJson.peerDependencies,
    packageJson.optionalDependencies,
  ];

  return sections.some((section) => section && Object.prototype.hasOwnProperty.call(section, dependencyName));
}

function installCommandArgs(packageManager, vendorSpec, needsIcons) {
  const packages = [vendorSpec];
  if (needsIcons) packages.push("@storybook/icons@^1.0.0");

  if (packageManager === "npm") return ["install", "-D", ...packages];
  if (packageManager === "pnpm") return ["add", "-D", ...packages];
  if (packageManager === "yarn") return ["add", "-D", ...packages];
  if (packageManager === "bun") return ["add", "-d", ...packages];

  throw new Error(`Unsupported package manager: ${packageManager}`);
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}
