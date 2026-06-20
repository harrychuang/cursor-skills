import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const catalogPath = "src/storybook/componentCatalog.ts";
const catalogSource = readFileSync(catalogPath, "utf8");
const entryPattern =
  /\{\n\s+id: "([^"]+)",[\s\S]*?\n\s+name: "([^"]+)",[\s\S]*?\n\s+category: "([^"]+)"/g;
const titleById = new Map();

for (const match of catalogSource.matchAll(entryPattern)) {
  const [, id, name, category] = match;
  titleById.set(id, `Components/${category}/${name}`);
}

function collectStoryFiles(directory) {
  if (!statSync(directory, { throwIfNoEntry: false })?.isDirectory()) {
    return [];
  }

  const files = [];

  for (const entry of readdirSync(directory)) {
    const entryPath = join(directory, entry);
    const entryStat = statSync(entryPath);

    if (entryStat.isDirectory()) {
      files.push(...collectStoryFiles(entryPath));
      continue;
    }

    if (entry.endsWith(".stories.tsx")) {
      files.push(entryPath);
    }
  }

  return files.sort();
}

const storyFiles = collectStoryFiles("src/components");

const storyIds = storyFiles.map((file) => basename(dirname(file)));
const issues = [];

for (const file of storyFiles) {
  const id = basename(dirname(file));
  const source = readFileSync(file, "utf8");
  const expectedTitle = titleById.get(id);
  const title = source.match(/title:\s*"([^"]+)"/)?.[1];
  const parameterId = source.match(/getComponentStoryParameters\("([^"]+)"\)/)?.[1];

  if (!expectedTitle) {
    issues.push(`${file}: missing componentCatalog entry for "${id}".`);
    continue;
  }

  if (title !== expectedTitle) {
    issues.push(`${file}: title is "${title ?? "missing"}"; expected "${expectedTitle}".`);
  }

  if (parameterId !== id) {
    issues.push(
      `${file}: getComponentStoryParameters id is "${parameterId ?? "missing"}"; expected "${id}".`,
    );
  }
}

for (const id of titleById.keys()) {
  if (!storyIds.includes(id)) {
    issues.push(`${catalogPath}: catalog entry "${id}" has no matching component story.`);
  }
}

if (issues.length > 0) {
  console.error("Storybook component catalog check failed:");
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log(`Storybook component catalog check passed: ${storyFiles.length} stories.`);
