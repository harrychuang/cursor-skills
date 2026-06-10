#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const jsonOnly = args.includes("--json");
const root = path.resolve(args.find((arg) => !arg.startsWith("--")) || process.cwd());
const storybookDir = path.join(root, ".storybook");
const packageJson = readJson(path.join(root, "package.json")) || {};
const dependencies = {
  ...(packageJson.dependencies || {}),
  ...(packageJson.devDependencies || {}),
  ...(packageJson.peerDependencies || {}),
};
const mainConfig = findFirstExisting(storybookDir, ["main.ts", "main.tsx", "main.js", "main.mjs", "main.cjs"]);
const previewConfig = findFirstExisting(storybookDir, ["preview.ts", "preview.tsx", "preview.js", "preview.mjs", "preview.cjs"]);
const projectConfig = findFirstExisting(storybookDir, [
  "figma-export.config.ts",
  "figma-export.config.js",
  "figma-export.config.mjs",
]);
const componentSpecsConfig = findFirstExisting(storybookDir, [
  "figma-component-specs.ts",
  "figma-component-specs.js",
  "figma-component-specs.mjs",
]);
const storyFiles = detectStoryRoots(root)
  .flatMap((candidate) => walkSafe(candidate))
  .filter((file) => /\.stories\.[cm]?[jt]sx?$|\.mdx$/.test(file));
const mainText = mainConfig ? fs.readFileSync(mainConfig, "utf8") : "";
const previewText = previewConfig ? fs.readFileSync(previewConfig, "utf8") : "";
const configText = projectConfig ? fs.readFileSync(projectConfig, "utf8") : "";
const viteDetected = /vite/i.test(`${mainText} ${Object.keys(dependencies).join(" ")}`);
const storySourceStates = storyFiles.map((file) => ({
  file,
  hasSource: hasStorySourceParameters(fs.readFileSync(file, "utf8")),
}));
const sourceStoryCount = storySourceStates.filter((state) => state.hasSource).length;
const missingSourceStories = storySourceStates
  .filter((state) => !state.hasSource)
  .map((state) => relative(root, state.file));
const checks = [
  check("package declares @harrychuang/storybook-addon-figma-export", Boolean(dependencies["@harrychuang/storybook-addon-figma-export"])),
  check("vendored addon exists", fs.existsSync(path.join(storybookDir, "vendor", "figma-export-addon", "package.json"))),
  check(".storybook/main.* exists", Boolean(mainConfig)),
  check("main config registers addon", /@harrychuang\/storybook-addon-figma-export/.test(mainText)),
  check(".storybook/preview.* exists", Boolean(previewConfig)),
  check("preview imports addon styles", /@harrychuang\/storybook-addon-figma-export\/styles\.css/.test(previewText)),
  check("preview imports review styles", /@harrychuang\/storybook-addon-figma-export\/review\.css/.test(previewText)),
  check("preview uses review decorator", /createFigmaExportReviewDecorator/.test(previewText)),
  check("preview configures globalTypes", /createFigmaExportGlobalTypes|globalTypes\s*=|globalTypes\s*:/.test(previewText)),
  check("preview configures initialGlobals", /createFigmaExportInitialGlobals|initialGlobals\s*=|initialGlobals\s*:/.test(previewText)),
  check("project figma-export config exists", Boolean(projectConfig)),
  check("project config exports figmaExportProjectConfig", /figmaExportProjectConfig/.test(configText)),
  check("project config defines review status path", /statusFilePath/.test(configText)),
  check("component spec module map exists when preview references it", !/componentSpecModules/.test(previewText) || Boolean(componentSpecsConfig)),
  check("Vite review API middleware wired when Vite is detected", !viteDetected || hasReviewMiddleware(mainText)),
  check("at least one story has source URL parameters", sourceStoryCount > 0),
];
const failed = checks.filter((item) => !item.pass);
const warnings = [];

if (storyFiles.length === 0) warnings.push("No stories found in common roots.");
if (sourceStoryCount === 0 && storyFiles.length > 0) {
  warnings.push("Stories exist, but no figmaSourceUrl, parameters.figma.url, or parameters.design.url was detected.");
} else if (missingSourceStories.length > 0) {
  warnings.push(`${missingSourceStories.length} story file(s) are missing source URL parameters: ${missingSourceStories.join(", ")}`);
}
if (!viteDetected && /createFigmaExportReviewDecorator/.test(previewText)) {
  warnings.push("Review decorator is present, but Vite builder was not detected; persisted review status may need a builder-specific middleware.");
}

const report = {
  ok: failed.length === 0,
  checks,
  failed: failed.map((item) => item.name),
  files: {
    mainConfig: mainConfig ? relative(root, mainConfig) : "",
    componentSpecsConfig: componentSpecsConfig ? relative(root, componentSpecsConfig) : "",
    previewConfig: previewConfig ? relative(root, previewConfig) : "",
    projectConfig: projectConfig ? relative(root, projectConfig) : "",
  },
  root,
  sourceStoryCount,
  storyCount: storyFiles.length,
  storiesMissingSourceUrl: missingSourceStories,
  warnings,
};

if (jsonOnly) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else {
  printReport(report);
}

process.exitCode = report.ok ? 0 : 1;

function check(name, pass) {
  return { name, pass: Boolean(pass) };
}

function printReport(reportValue) {
  console.log(`Figma export setup: ${reportValue.root}`);
  for (const item of reportValue.checks) {
    console.log(`${item.pass ? "PASS" : "FAIL"} ${item.name}`);
  }
  if (reportValue.warnings.length) {
    console.log("");
    console.log("Warnings:");
    for (const warning of reportValue.warnings) console.log(`- ${warning}`);
  }
}

function hasReviewMiddleware(text) {
  return /createFigmaReviewStatusPlugin/.test(text) && /viteFinal/.test(text);
}

function hasStorySourceParameters(text) {
  return (
    /figmaSourceUrl\s*:/.test(text) ||
    /parameters\s*:\s*{[\s\S]*figma\s*:\s*{[\s\S]*url\s*:/.test(text) ||
    /parameters\s*:\s*{[\s\S]*design\s*:\s*{[\s\S]*url\s*:/.test(text)
  );
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

function relative(base, file) {
  return path.relative(base, file) || ".";
}
