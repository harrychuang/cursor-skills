#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const writeOutput = args.includes("--write");
const jsonOnly = args.includes("--json");
const productRoot = path.resolve(readFlag("--product-root", process.cwd()));
const outputArg = readFlag("--output", "");
const positional = args.filter((arg, index) => {
  if (arg === "--write" || arg === "--json" || arg === "--product-root" || arg === "--output") return false;
  if (isFlagValueIndex(args, "--product-root", index) || isFlagValueIndex(args, "--output", index)) return false;
  return !arg.startsWith("--");
});
const designSystemRoot = path.resolve(positional[0] || process.cwd());
const designSystemDir = resolveDesignSystemDir(designSystemRoot);
const componentsDir = path.join(designSystemDir, "components");
const storybookDir = path.join(productRoot, ".storybook");
const outputPath = path.resolve(productRoot, outputArg || ".storybook/figma-component-specs.ts");
const componentFiles = walkSafe(componentsDir).filter((file) => file.endsWith(".md"));
const entries = componentFiles
  .map((file) => createEntry(file))
  .filter((entry) => entry.slug)
  .sort((a, b) => a.slug.localeCompare(b.slug));

if (!fs.existsSync(componentsDir)) {
  throw new Error(`Cannot find component specs at ${componentsDir}.`);
}

const source = renderModule(entries);

if (writeOutput) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, source);
}

if (jsonOnly) {
  process.stdout.write(`${JSON.stringify({
    componentCount: entries.length,
    componentsDir,
    outputPath,
    slugs: entries.map((entry) => entry.slug),
  }, null, 2)}\n`);
} else {
  process.stdout.write(source);
}

function readFlag(name, defaultValue) {
  const index = args.indexOf(name);
  if (index < 0) return defaultValue;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
  return value;
}

function isFlagValueIndex(values, flagName, index) {
  return values[index - 1] === flagName;
}

function resolveDesignSystemDir(root) {
  const directComponents = path.join(root, "components");
  const nestedComponents = path.join(root, "design-system", "components");
  const directInventory = path.join(root, "COMPONENT_INVENTORY.md");
  const nestedInventory = path.join(root, "design-system", "COMPONENT_INVENTORY.md");

  if (fs.existsSync(directComponents) || fs.existsSync(directInventory)) return root;
  if (fs.existsSync(nestedComponents) || fs.existsSync(nestedInventory)) return path.join(root, "design-system");

  throw new Error(`Cannot find design-system package at ${root}. Expected components/ or nested design-system/components/.`);
}

function createEntry(file) {
  const slug = componentSlug(path.basename(file, ".md"));
  const markdown = fs.readFileSync(file, "utf8");
  const defaultKey = `../design-system/components/${slug}.md`;
  const relativeKey = toPosix(path.relative(storybookDir, file));

  return {
    defaultKey,
    markdown,
    relativeKey,
    slug,
  };
}

function renderModule(entriesToRender) {
  const moduleEntries = {};
  const pathEntries = {};

  for (const entry of entriesToRender) {
    moduleEntries[entry.defaultKey] = entry.markdown;
    moduleEntries[entry.relativeKey] = entry.markdown;
    pathEntries[entry.slug] = entry.defaultKey;
  }

  return `export const componentSpecModules = ${JSON.stringify(moduleEntries, null, 2)} satisfies Record<string, string>;

export const componentSpecModulePaths = ${JSON.stringify(pathEntries, null, 2)} satisfies Record<string, string>;

export function specModulePathForSlug(slug: string): string {
  return componentSpecModulePaths[slug] ?? \`../design-system/components/\${slug}.md\`;
}
`;
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
    "node_modules",
  ].includes(name);
}

function componentSlug(value) {
  return String(value || "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}
