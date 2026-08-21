import { readFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import { execFileSync } from "node:child_process";

const { storybookTemplateProjectConfig } = await import(
  "../.storybook/project.config.ts"
);
const { componentCatalogEntries } = await import(
  "../src/storybook/componentCatalog.ts"
);
const catalogPath = "src/storybook/componentCatalog.ts";
const componentStoriesRoot =
  storybookTemplateProjectConfig.catalog.componentStoriesRoot;
const titleById = new Map(
  componentCatalogEntries.map((entry) => [entry.id, entry.storyTitle]),
);

const storyFiles = execFileSync(
  "rg",
  ["--files", componentStoriesRoot, "-g", "*.stories.tsx"],
  { encoding: "utf8" },
)
  .trim()
  .split(/\n/)
  .filter(Boolean)
  .sort();

const storyIds = storyFiles.map((file) => basename(dirname(file)));
const issues = [];

function hasAutodocsTag(source) {
  return /tags\s*:\s*\[[^\]]*["']autodocs["'][^\]]*\]/s.test(source);
}

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

  if (!hasAutodocsTag(source)) {
    issues.push(`${file}: missing Storybook Autodocs tag "autodocs" in story meta.`);
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

console.log(
  `Storybook component catalog check passed: ${storyFiles.length} stories from ${componentStoriesRoot}.`,
);
