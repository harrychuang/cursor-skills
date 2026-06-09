#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const writeChanges = args.includes("--write");
const jsonOnly = args.includes("--json");
const productRoot = path.resolve(readFlag("--product-root", process.cwd()));
const storyRootArgs = readRepeatedFlag("--story-root");
const positional = args.filter((arg, index) => {
  if (["--write", "--json", "--product-root", "--story-root"].includes(arg)) return false;
  if (isFlagValueIndex(args, "--product-root", index) || isFlagValueIndex(args, "--story-root", index)) return false;
  return !arg.startsWith("--");
});
const designSystemRoot = path.resolve(positional[0] || process.cwd());
const designSystemDir = resolveDesignSystemDir(designSystemRoot);
const sourceTracePath = path.join(designSystemDir, "STORYBOOK_SOURCE_TRACE.md");
const sourceRows = parseStorySourceRows(sourceTracePath);
const sourceBySlug = new Map(sourceRows.map((row) => [componentSlug(row.component), row]));
const storyRoots = storyRootArgs.length
  ? storyRootArgs.map((root) => path.resolve(productRoot, root))
  : detectStoryRoots(productRoot);
const storyFiles = uniqueSorted(storyRoots.flatMap((root) => walkSafe(root)))
  .filter((file) => /\.stories\.[cm]?[jt]sx?$/.test(file));
const actions = storyFiles.map(analyzeStoryFile);

if (writeChanges) {
  for (const action of actions) {
    if (!action.writeText || action.status !== "will-update") continue;
    fs.writeFileSync(action.file, action.writeText);
  }
}

const report = {
  designSystemDir,
  productRoot,
  sourceTracePath,
  storyRoots,
  totals: {
    sourceRows: sourceRows.length,
    stories: storyFiles.length,
    matched: actions.filter((action) => action.sourceUrl).length,
    alreadyConfigured: actions.filter((action) => action.status === "already-configured").length,
    willUpdate: actions.filter((action) => action.status === "will-update").length,
    blocked: actions.filter((action) => action.status === "blocked").length,
    noSource: actions.filter((action) => action.status === "no-source").length,
  },
  actions: actions.map(({ writeText, ...action }) => ({
    ...action,
    file: relative(productRoot, action.file),
  })),
};

if (jsonOnly) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else {
  printReport(report);
}

function analyzeStoryFile(file) {
  const text = fs.readFileSync(file, "utf8");
  const title = extractStoryTitle(text);
  const componentName = extractComponentName(file, title);
  const sourceRow = sourceBySlug.get(componentSlug(componentName));
  const existingSource = getExistingSourceParameter(text);

  if (!sourceRow) {
    return {
      component: componentName,
      file,
      reason: "No matching row in STORYBOOK_SOURCE_TRACE.md.",
      sourceUrl: "",
      status: "no-source",
      storyTitle: title,
    };
  }

  if (existingSource) {
    return {
      component: componentName,
      existingSource,
      file,
      reason: existingSource === sourceRow.url ? "Story already has the traced source URL." : "Story already has a source URL; preserve the explicit project value.",
      sourceUrl: sourceRow.url,
      status: "already-configured",
      storyTitle: title,
    };
  }

  const nextText = insertMetaParameters(text, sourceRow);
  if (!nextText) {
    return {
      component: componentName,
      file,
      reason: "Could not safely patch this story format. Add the source URL manually.",
      sourceUrl: sourceRow.url,
      status: "blocked",
      storyTitle: title,
    };
  }

  return {
    component: componentName,
    file,
    parameter: sourceRow.parameter,
    reason: writeChanges ? "Updated story meta parameters." : "Run with --write to update story meta parameters.",
    sourceUrl: sourceRow.url,
    status: "will-update",
    storyTitle: title,
    writeText: nextText,
  };
}

function parseStorySourceRows(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing ${file}. Run trace_sources.mjs --write first.`);
  }

  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  return sectionLines(lines, "Story Source URL Parameters")
    .map((line) => splitMarkdownRow(line))
    .filter((cells) => cells && cells.length >= 3 && !/^component$/i.test(cells[0]))
    .filter((cells) => cells[0] && cells[0] !== "-" && /^https?:\/\//i.test(cells[1]))
    .map((cells) => ({
      component: cells[0],
      parameter: cells[2] || (cells[1].includes("figma.com/") ? "parameters.figmaSourceUrl" : "parameters.design.url"),
      url: cells[1],
    }));
}

function insertMetaParameters(text, sourceRow) {
  const sourceObject = renderSourceObject(sourceRow);
  const defaultObjectMatch = text.match(/export\s+default\s+{/);
  if (defaultObjectMatch) {
    const index = defaultObjectMatch.index + defaultObjectMatch[0].length;
    return `${text.slice(0, index)}\n  parameters: ${sourceObject},${text.slice(index)}`;
  }

  const metaObjectMatch = text.match(/const\s+\w+\s*(?::\s*Meta(?:<[^>]+>)?)?\s*=\s*{/);
  if (metaObjectMatch) {
    const index = metaObjectMatch.index + metaObjectMatch[0].length;
    return `${text.slice(0, index)}\n  parameters: ${sourceObject},${text.slice(index)}`;
  }

  return "";
}

function renderSourceObject(sourceRow) {
  const quotedUrl = JSON.stringify(sourceRow.url);
  if (sourceRow.parameter === "parameters.figmaSourceUrl") {
    return `{\n    figmaSourceUrl: ${quotedUrl},\n  }`;
  }
  return `{\n    design: {\n      url: ${quotedUrl},\n    },\n  }`;
}

function getExistingSourceParameter(text) {
  const figmaSourceMatch = text.match(/figmaSourceUrl\s*:\s*["'`]([^"'`]+)["'`]/);
  if (figmaSourceMatch) return figmaSourceMatch[1];

  const figmaUrlMatch = text.match(/figma\s*:\s*{[\s\S]*?url\s*:\s*["'`]([^"'`]+)["'`]/);
  if (figmaUrlMatch) return figmaUrlMatch[1];

  const designUrlMatch = text.match(/design\s*:\s*{[\s\S]*?url\s*:\s*["'`]([^"'`]+)["'`]/);
  if (designUrlMatch) return designUrlMatch[1];

  return "";
}

function extractStoryTitle(text) {
  return text.match(/title\s*:\s*["'`]([^"'`]+)["'`]/)?.[1] || "";
}

function extractComponentName(file, title) {
  if (title) return title.split("/").filter(Boolean).pop() || path.basename(path.dirname(file));
  const storyName = path.basename(file).replace(/\.stories\.[cm]?[jt]sx?$/, "");
  return storyName === "index" ? path.basename(path.dirname(file)) : storyName;
}

function resolveDesignSystemDir(root) {
  const directTrace = path.join(root, "STORYBOOK_SOURCE_TRACE.md");
  const nestedTrace = path.join(root, "design-system", "STORYBOOK_SOURCE_TRACE.md");
  const directEvidenceMap = path.join(root, "DESIGN_EVIDENCE_MAP.md");
  const nestedEvidenceMap = path.join(root, "design-system", "DESIGN_EVIDENCE_MAP.md");

  if (fs.existsSync(directTrace) || fs.existsSync(directEvidenceMap)) return root;
  if (fs.existsSync(nestedTrace) || fs.existsSync(nestedEvidenceMap)) return path.join(root, "design-system");

  throw new Error(`Cannot find design-system package at ${root}. Expected STORYBOOK_SOURCE_TRACE.md or DESIGN_EVIDENCE_MAP.md.`);
}

function detectStoryRoots(root) {
  const candidates = [
    "src",
    "stories",
    "components",
    "lib",
    "app",
    "apps",
    "packages",
  ].map((candidate) => path.join(root, candidate));
  const existing = candidates.filter((candidate) => fs.existsSync(candidate));
  return existing.length ? existing : [root];
}

function readFlag(name, defaultValue) {
  const index = args.indexOf(name);
  if (index < 0) return defaultValue;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
  return value;
}

function readRepeatedFlag(name) {
  const values = [];
  args.forEach((arg, index) => {
    if (arg !== name) return;
    const value = args[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
    values.push(value);
  });
  return values;
}

function isFlagValueIndex(values, flagName, index) {
  return values[index - 1] === flagName;
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

function sectionLines(lines, heading) {
  const result = [];
  let inSection = false;
  const headingRe = new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`, "i");

  for (const line of lines) {
    if (headingRe.test(line.trim())) {
      inSection = true;
      continue;
    }
    if (inSection && /^#{1,2}\s+/.test(line.trim())) inSection = false;
    if (inSection) result.push(line);
  }

  return result;
}

function splitMarkdownRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return null;
  const cells = trimmed.slice(1, -1).split("|").map(stripFormatting);
  if (cells.every((cellValue) => /^:?-{3,}:?$/.test(cellValue))) return null;
  return cells;
}

function printReport(report) {
  console.log(`Story source sync: ${report.productRoot}`);
  console.log(`Source trace: ${report.sourceTracePath}`);
  console.log(`Stories: ${report.totals.stories}`);
  console.log(`Will update: ${report.totals.willUpdate}`);
  console.log(`Already configured: ${report.totals.alreadyConfigured}`);
  console.log(`Blocked: ${report.totals.blocked}`);
  console.log(`No source: ${report.totals.noSource}`);
  for (const action of report.actions) {
    const marker = action.status === "will-update" ? "UPDATE" : action.status.toUpperCase();
    console.log(`- ${marker} ${action.file}${action.sourceUrl ? ` -> ${action.sourceUrl}` : ""}`);
  }
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function componentSlug(value) {
  return stripFormatting(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stripFormatting(value) {
  return String(value || "")
    .trim()
    .replace(/^`|`$/g, "")
    .replace(/^<|>$/g, "");
}

function relative(base, file) {
  return path.relative(base, file) || ".";
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
