import { existsSync, readFileSync } from "node:fs";

import {
  collectComponentTimeline,
  renderComponentTimelineModule,
  readCatalogEntries,
} from "./component-timeline/build-component-timeline.mjs";

// Fails when src/storybook/componentTimeline.ts drifts from git history —
// i.e. a component was added to the catalog and committed without
// regenerating the timeline data.
// Fix with the `build:component-timeline` npm script.

const generatedPath = "src/storybook/componentTimeline.ts";
const issues = [];

if (!existsSync(generatedPath)) {
  console.error(
    `Component timeline check failed: missing ${generatedPath}. Run the \`build:component-timeline\` npm script.`,
  );
  process.exit(1);
}

let timeline;
try {
  timeline = collectComponentTimeline();
} catch (error) {
  console.error(`Component timeline check failed: ${error.message}`);
  process.exit(1);
}

const expected = renderComponentTimelineModule(timeline);
const actual = readFileSync(generatedPath, "utf8");

if (expected !== actual) {
  issues.push(
    `${generatedPath} is out of date with git history. Run the \`build:component-timeline\` npm script.`,
  );
}

// Every id in the committed timeline must resolve to a catalog entry,
// otherwise the page falls back to metadata-only cards without anyone
// noticing (typically a component renamed or removed from the catalog).
const catalogIds = new Set(readCatalogEntries().map((entry) => entry.id));

for (const match of actual.matchAll(/\n\s+id: "([^"]+)",/g)) {
  if (!catalogIds.has(match[1])) {
    issues.push(
      `${match[1]}: appears in ${generatedPath} but has no componentCatalog entry. Run the \`build:component-timeline\` npm script.`,
    );
  }
}

if (issues.length > 0) {
  console.error("Component timeline check failed:");
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

const dates = new Set(timeline.entries.map((entry) => entry.firstSeen));
console.log(
  `Component timeline check passed: ${timeline.entries.length} components across ${dates.size} dates, all catalogued.`,
);
