#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const jsonOnly = args.includes("--json");
const root = path.resolve(args.find((arg) => !arg.startsWith("--")) || process.cwd());

const packageJsonPath = path.join(root, "package.json");
const packageJson = readJson(packageJsonPath) || {};
const dependencies = {
  ...(packageJson.dependencies || {}),
  ...(packageJson.devDependencies || {}),
  ...(packageJson.peerDependencies || {}),
};
const storybookDir = path.join(root, ".storybook");
const mainConfig = findFirstExisting(storybookDir, ["main.ts", "main.tsx", "main.js", "main.mjs", "main.cjs"]);
const previewConfig = findFirstExisting(storybookDir, ["preview.ts", "preview.tsx", "preview.js", "preview.mjs", "preview.cjs"]);
const storyRoots = detectStoryRoots(root);
const storyFiles = uniqueSorted(storyRoots.flatMap((candidate) => walkSafe(candidate)))
  .filter((file) => /\.stories\.[cm]?[jt]sx?$|\.mdx$/.test(file));
const componentRoots = detectExisting(root, [
  "src/components",
  "components",
  "src/ui",
  "src/design-system",
  "packages/ui",
  "app/components",
]);
const tokenFiles = detectExisting(root, [
  "tokens/tokens-ref.css",
  "tokens/tokens-sys.css",
  "tokens/tokens-comp.css",
  "tokens/tokens.css",
  "src/tokens.css",
  "src/styles/tokens.css",
  "tailwind.config.js",
  "tailwind.config.ts",
]);
const storybookDeps = Object.fromEntries(
  Object.entries(dependencies).filter(([name]) => name === "storybook" || name.startsWith("@storybook/")),
);
const framework = detectFramework(dependencies, mainConfig);
const builder = detectBuilder(dependencies, mainConfig);
const packageManager = detectPackageManager(root);
const storybookMajor = detectStorybookMajor(storybookDeps);
const addonReady = Boolean(
  packageManager &&
    storybookMajor === 10 &&
    framework.includes("react") &&
    mainConfig &&
    previewConfig,
);
const warnings = [];

if (!packageJsonPath || !fs.existsSync(packageJsonPath)) warnings.push("package.json not found");
if (!packageManager) warnings.push("package manager lockfile not detected");
if (!mainConfig) warnings.push(".storybook/main.* not found");
if (!previewConfig) warnings.push(".storybook/preview.* not found");
if (storybookMajor !== null && storybookMajor !== 10) warnings.push(`Storybook major ${storybookMajor} is not addon target ^10`);
if (!framework.includes("react")) warnings.push("React dependency/framework not detected");
if (storyFiles.length === 0) warnings.push("No Storybook stories found in common roots");

const report = {
  addonReady,
  builder,
  componentRoots: componentRoots.map((file) => relative(root, file)),
  framework,
  packageManager,
  root,
  storyFiles: storyFiles.map((file) => relative(root, file)),
  storyRoots: storyRoots.map((file) => relative(root, file)),
  storybook: {
    deps: storybookDeps,
    dir: fs.existsSync(storybookDir) ? relative(root, storybookDir) : "",
    mainConfig: mainConfig ? relative(root, mainConfig) : "",
    major: storybookMajor,
    previewConfig: previewConfig ? relative(root, previewConfig) : "",
  },
  tokenFiles: tokenFiles.map((file) => relative(root, file)),
  warnings,
};

if (jsonOnly) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else {
  printReport(report);
}

function printReport(reportValue) {
  console.log(`Storybook project: ${reportValue.root}`);
  console.log(`Package manager: ${reportValue.packageManager || "unknown"}`);
  console.log(`Framework: ${reportValue.framework || "unknown"}`);
  console.log(`Builder: ${reportValue.builder || "unknown"}`);
  console.log(`Storybook major: ${reportValue.storybook.major ?? "unknown"}`);
  console.log(`Addon ready: ${reportValue.addonReady ? "yes" : "no"}`);
  printList("Storybook config", [
    reportValue.storybook.mainConfig || "main.* missing",
    reportValue.storybook.previewConfig || "preview.* missing",
  ]);
  printList("Story roots", reportValue.storyRoots);
  printList("Component roots", reportValue.componentRoots);
  printList("Token files", reportValue.tokenFiles);
  printList("Warnings", reportValue.warnings);
}

function printList(label, values) {
  console.log(`${label}:`);
  if (!values.length) {
    console.log("- none");
    return;
  }
  for (const value of values) console.log(`- ${value}`);
}

function detectPackageManager(base) {
  if (fs.existsSync(path.join(base, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(base, "yarn.lock"))) return "yarn";
  if (fs.existsSync(path.join(base, "bun.lockb")) || fs.existsSync(path.join(base, "bun.lock"))) return "bun";
  if (fs.existsSync(path.join(base, "package-lock.json"))) return "npm";
  return "";
}

function detectStorybookMajor(deps) {
  const version = deps.storybook || Object.values(deps)[0] || "";
  const match = String(version).match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function detectFramework(deps, mainConfigPath) {
  const names = Object.keys(deps);
  const text = mainConfigPath ? fs.readFileSync(mainConfigPath, "utf8") : "";
  if (names.some((name) => /react|next/.test(name)) || /@storybook\/(?:react|nextjs)/.test(text)) return "react";
  if (names.some((name) => /vue|nuxt/.test(name)) || /@storybook\/vue/.test(text)) return "vue";
  if (names.some((name) => /svelte/.test(name)) || /@storybook\/svelte/.test(text)) return "svelte";
  if (names.some((name) => /angular/.test(name)) || /@storybook\/angular/.test(text)) return "angular";
  if (names.some((name) => /html/.test(name)) || /@storybook\/html/.test(text)) return "html";
  return "";
}

function detectBuilder(deps, mainConfigPath) {
  const names = Object.keys(deps).join(" ");
  const text = mainConfigPath ? fs.readFileSync(mainConfigPath, "utf8") : "";
  const combined = `${names} ${text}`;
  if (/vite/i.test(combined)) return "vite";
  if (/webpack/i.test(combined)) return "webpack";
  if (/nextjs/i.test(combined)) return "nextjs";
  return "";
}

function detectStoryRoots(base) {
  const candidates = [
    "src",
    "stories",
    "components",
    "lib",
    "app",
    "apps",
    "packages",
  ].map((candidate) => path.join(base, candidate));
  const existing = candidates.filter((candidate) => fs.existsSync(candidate));
  return existing.length ? existing : [base];
}

function detectExisting(base, relativePaths) {
  return relativePaths
    .map((relativePath) => path.join(base, relativePath))
    .filter((candidate) => fs.existsSync(candidate));
}

function findFirstExisting(base, names) {
  for (const name of names) {
    const candidate = path.join(base, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return "";
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function walkSafe(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (shouldSkipDirectory(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkSafe(fullPath));
    if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

function shouldSkipDirectory(name) {
  return [
    ".git",
    ".next",
    ".nuxt",
    ".output",
    ".storybook-static",
    "build",
    "coverage",
    "dist",
    "node_modules",
    "storybook-static",
  ].includes(name);
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function relative(base, file) {
  return path.relative(base, file) || ".";
}
