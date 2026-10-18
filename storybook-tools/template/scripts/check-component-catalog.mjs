import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// Validates src/storybook/componentCatalog.ts against the repository:
// unique kebab-case ids, existing componentPath/storyPath, and storyTitle
// resolvable to a story file. Parsing contract (see the catalog header):
// `id` is the first field of every entry, string fields are single-line,
// and the file uses standard 2-space indentation.

const catalogPath = "src/storybook/componentCatalog.ts";
const skipDirs = new Set(["node_modules", "dist", "build", "storybook-static", ".git"]);

if (!existsSync(catalogPath)) {
  console.error(`Component catalog check failed: missing ${catalogPath}.`);
  process.exit(1);
}

const catalogSource = readFileSync(catalogPath, "utf8");
const entryPattern = /\{\s*\n\s+id: "([^"]+)",([\s\S]*?)\n  \},/g;
const entries = [];

for (const match of catalogSource.matchAll(entryPattern)) {
  const [, id, body] = match;
  const field = (name) => body.match(new RegExp(`\\b${name}: "([^"]+)"`))?.[1];

  entries.push({
    id,
    name: field("name"),
    storyTitle: field("storyTitle"),
    componentPath: field("componentPath"),
    storyPath: field("storyPath"),
  });
}

function walkStoryFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (skipDirs.has(entry) || entry.startsWith(".")) {
      continue;
    }

    const fullPath = join(dir, entry);

    if (statSync(fullPath).isDirectory()) {
      walkStoryFiles(fullPath, files);
    } else if (/\.stories\.(js|jsx|mjs|ts|tsx)$/.test(entry)) {
      files.push(fullPath);
    }
  }

  return files;
}

const storyFiles = existsSync("src") ? walkStoryFiles("src") : [];
const explicitTitles = new Set();

for (const file of storyFiles) {
  const title = readFileSync(file, "utf8").match(/title:\s*"([^"]+)"/)?.[1];

  if (title) {
    explicitTitles.add(title);
  }
}

const issues = [];
const seenIds = new Set();

if (entries.length === 0) {
  issues.push(`${catalogPath}: no entries parsed — check the parsing contract in the file header.`);
}

for (const entry of entries) {
  const ref = `${catalogPath} entry "${entry.id}"`;

  if (seenIds.has(entry.id)) {
    issues.push(`${ref}: duplicate id.`);
  }

  seenIds.add(entry.id);

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(entry.id)) {
    issues.push(`${ref}: id must be kebab-case.`);
  }

  for (const required of ["name", "storyTitle", "componentPath"]) {
    if (!entry[required]) {
      issues.push(`${ref}: missing single-line string field "${required}".`);
    }
  }

  if (entry.componentPath && !existsSync(entry.componentPath)) {
    issues.push(`${ref}: componentPath "${entry.componentPath}" does not exist.`);
  }

  if (entry.storyPath && !existsSync(entry.storyPath)) {
    issues.push(`${ref}: storyPath "${entry.storyPath}" does not exist.`);
  }

  // Autotitle projects carry no title: strings; for them an existing
  // storyPath is accepted as the storyTitle's provenance.
  if (
    entry.storyTitle &&
    !explicitTitles.has(entry.storyTitle) &&
    !(entry.storyPath && existsSync(entry.storyPath))
  ) {
    issues.push(
      `${ref}: storyTitle "${entry.storyTitle}" matches no story file title and no existing storyPath backs it up.`,
    );
  }
}

if (issues.length > 0) {
  console.error("Component catalog check failed:");
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log(
  `Component catalog check passed: ${entries.length} entries, ${storyFiles.length} story files scanned.`,
);
