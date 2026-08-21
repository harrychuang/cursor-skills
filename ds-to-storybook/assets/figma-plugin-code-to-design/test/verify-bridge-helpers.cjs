// Node verification for the ui.html pure helpers (Load from Storybook bridge,
// import summary formatting). The helpers are pure (no fetch/DOM), delimited
// by marker comments so this script can evaluate them outside Figma.
// Run from the plugin root: node test/verify-bridge-helpers.cjs
"use strict";

const assert = require("node:assert");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const uiHtml = readFileSync(path.join(__dirname, "..", "ui.html"), "utf8");

function extractHelpers(startMarker, endMarker, exportNames) {
  const start = uiHtml.indexOf(startMarker);
  const end = uiHtml.indexOf(endMarker);
  assert.ok(start >= 0 && end > start, `${startMarker} markers exist in ui.html`);
  const exported = {};
  const assignments = exportNames.map((name) => `exports.${name} = ${name};`).join("\n");
  new Function("exports", `${uiHtml.slice(start, end)}\n${assignments}`)(exported);
  return exported;
}

const helpers = extractHelpers(
  "// sbfx-bridge-helpers-start",
  "// sbfx-bridge-helpers-end",
  ["buildBridgePayloadListUrl", "buildBridgePayloadUrl", "parseBridgePayloadList"],
);
const summaryHelpers = extractHelpers(
  "// sbfx-summary-helpers-start",
  "// sbfx-summary-helpers-end",
  ["formatImportSummary"],
);

// URL building
assert.strictEqual(
  helpers.buildBridgePayloadListUrl("http://localhost:6006"),
  "http://localhost:6006/__figma-export/payloads",
  "default URL",
);
assert.strictEqual(
  helpers.buildBridgePayloadListUrl("http://127.0.0.1:6007///"),
  "http://127.0.0.1:6007/__figma-export/payloads",
  "trailing slashes trimmed",
);
assert.strictEqual(helpers.buildBridgePayloadListUrl(""), null, "empty URL rejected");
assert.strictEqual(
  helpers.buildBridgePayloadListUrl("localhost:6006"),
  null,
  "missing scheme rejected",
);
assert.strictEqual(
  helpers.buildBridgePayloadUrl("http://localhost:6006", "components-button--primary"),
  "http://localhost:6006/__figma-export/payloads/components-button--primary",
  "single payload URL",
);
assert.strictEqual(
  helpers.buildBridgePayloadUrl("http://localhost:6006", ""),
  null,
  "empty storyId rejected",
);
assert.ok(
  helpers
    .buildBridgePayloadUrl("http://localhost:6006", "a/b c")
    .endsWith("/__figma-export/payloads/a%2Fb%20c"),
  "storyId is URI-encoded",
);

// List parsing
const parsed = helpers.parseBridgePayloadList([
  {
    componentTitle: "Button",
    generatedAt: "2026-01-01T00:00:00.000Z",
    storyId: "components-button--primary",
    storyName: "Primary",
  },
  { storyId: "minimal-entry" },
  { storyName: "no story id" },
  "not-an-object",
  null,
]);
assert.strictEqual(parsed.length, 2, "invalid entries filtered");
assert.deepStrictEqual(
  parsed[0],
  {
    componentTitle: "Button",
    generatedAt: "2026-01-01T00:00:00.000Z",
    storyId: "components-button--primary",
    storyName: "Primary",
  },
  "full entry normalized",
);
assert.deepStrictEqual(
  parsed[1],
  { componentTitle: "", generatedAt: "", storyId: "minimal-entry", storyName: "" },
  "missing fields default to empty strings",
);
assert.throws(
  () => helpers.parseBridgePayloadList({ not: "an array" }),
  /array/i,
  "non-array response throws",
);

// Import summary: font substitution count sits with the node and variable
// counts, and says nothing when no font was substituted.
const baseStats = {
  componentsCreated: 0,
  nodesCreated: 12,
  reusedComponents: 0,
  reusedVariables: 3,
  variablesCreated: 5,
};

const noSubstitutionSummary = summaryHelpers.formatImportSummary({
  ...baseStats,
  fontSubstitutions: [],
});
assert.strictEqual(
  noSubstitutionSummary,
  "12 nodes created. 5 variables created, 3 reused.",
  "zero substitutions add no substitution text",
);

const fourSubstitutionSummary = summaryHelpers.formatImportSummary({
  ...baseStats,
  fontSubstitutions: [
    { requestedFamily: "Hiragino Kaku Gothic ProN" },
    { requestedFamily: "Hiragino Kaku Gothic ProN" },
    { requestedFamily: "Hiragino Mincho ProN" },
    { requestedFamily: "Hiragino Mincho ProN" },
  ],
});
assert.strictEqual(
  fourSubstitutionSummary,
  "12 nodes created. 5 variables created, 3 reused. 4 fonts substituted.",
  "four substitutions appear in the summary beside the node and variable counts",
);

// Missing field keeps the summary working for stats from an older plugin build.
assert.strictEqual(
  summaryHelpers.formatImportSummary(baseStats),
  "12 nodes created. 5 variables created, 3 reused.",
  "absent substitution list adds no substitution text",
);

console.log("verify-bridge-helpers: all assertions passed");
