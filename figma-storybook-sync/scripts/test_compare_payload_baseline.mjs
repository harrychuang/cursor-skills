#!/usr/bin/env node
// Verification for compare_payload_baseline.mjs
// (figma-storybook-sync-skill spec: "Deterministic three-way payload comparison",
// "Four-quadrant sync classification", "Known-limitation suppression filter").
// Run: node figma-storybook-sync/scripts/test_compare_payload_baseline.mjs
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { comparePayloads } from "./compare_payload_baseline.mjs";

const scriptPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "compare_payload_baseline.mjs",
);

// --- Fixtures --------------------------------------------------------------

function makePayload(overrides = {}) {
  return {
    componentTitle: "Components/Actions/Button",
    generatedAt: "2026-08-27T10:00:00.000Z",
    root: {
      children: [
        {
          children: [],
          kind: "text",
          name: "label",
          styles: { color: "#333333", height: 20, width: 80, x: 12, y: 6 },
          text: "Click me",
        },
      ],
      kind: "frame",
      layoutStrategy: "auto",
      name: "button",
      styles: {
        backgroundColor: "#3366ff",
        gap: 8,
        height: 32,
        paddingLeft: 12,
        paddingRight: 12,
        radius: 8,
        width: 120,
        x: 0,
        y: 0,
      },
    },
    storyId: "components-button--primary",
    storyName: "Primary",
    tokens: [
      { cssName: "--cm-comp-button-radius", figmaName: "comp/button/radius", value: 8 },
    ],
    version: 2,
    ...overrides,
  };
}

// A figma-facts document equivalent to makePayload() after normalization.
function makeFacts(mutate) {
  const facts = {
    generatedAt: "2026-08-27T10:00:00.000Z",
    nodes: {
      button: {
        backgroundColor: "#3366ff",
        effects: undefined,
        gap: 8,
        height: 32,
        kind: "frame",
        layout: "auto",
        paddingLeft: 12,
        paddingRight: 12,
        radius: "8",
        width: 120,
        x: 0,
        y: 0,
      },
      "button/label": {
        color: "#333333",
        height: 20,
        kind: "text",
        text: "Click me",
        width: 80,
      },
    },
    storyId: "components-button--primary",
    tokens: { "--cm-comp-button-radius": "8" },
  };
  if (mutate) mutate(facts);
  return facts;
}

// --- Four-quadrant classification matrix -----------------------------------

// synced: neither side differs from base.
{
  const report = comparePayloads({
    base: makePayload(),
    ours: makePayload(),
    theirs: makeFacts(),
  });
  assert.equal(report.classification, "synced", "identical sides classify synced");
  assert.deepEqual(report.diffs, [], "synced report has no diffs");
}

// figma-only: only theirs differs (spec scenario: radius change is reported
// with node path, field, base value, and theirs value).
{
  const report = comparePayloads({
    base: makePayload(),
    ours: makePayload(),
    theirs: makeFacts((facts) => {
      facts.nodes.button.radius = "12";
    }),
  });
  assert.equal(report.classification, "figma-only", "theirs-only change classifies figma-only");
  assert.deepEqual(
    report.diffs,
    [
      {
        base: "8",
        category: "visual",
        current: "12",
        field: "radius",
        path: "button",
        side: "theirs",
      },
    ],
    "radius diff names path, field, base, and theirs value",
  );
}

// code-only: only ours differs.
{
  const ours = makePayload();
  ours.root.styles.gap = 12;
  const report = comparePayloads({ base: makePayload(), ours, theirs: makeFacts() });
  assert.equal(report.classification, "code-only", "ours-only change classifies code-only");
  assert.equal(report.diffs[0].side, "ours", "code-only diff sits on the ours side");
}

// conflict: both sides differ.
{
  const ours = makePayload();
  ours.root.styles.gap = 12;
  const report = comparePayloads({
    base: makePayload(),
    ours,
    theirs: makeFacts((facts) => {
      facts.nodes.button.radius = "12";
    }),
  });
  assert.equal(report.classification, "conflict", "both-sides change classifies conflict");
}

// --- Partial mode (missing theirs) -----------------------------------------

{
  const ours = makePayload();
  ours.root.styles.gap = 12;
  const report = comparePayloads({ base: makePayload(), ours });
  assert.equal(report.classification, "partial", "missing theirs classifies partial");
  assert.ok(
    report.diffs.every((diff) => diff.side === "ours"),
    "partial report contains only base-versus-ours diffs",
  );
}

// --- Diff categories -------------------------------------------------------

// token: token value changes carry category token.
{
  const report = comparePayloads({
    base: makePayload(),
    ours: makePayload(),
    theirs: makeFacts((facts) => {
      facts.tokens["--cm-comp-button-radius"] = "12";
    }),
  });
  assert.equal(report.diffs[0].category, "token", "token value change categorizes as token");
  assert.equal(report.diffs[0].path, "tokens/--cm-comp-button-radius");
}

// structural: node addition categorizes as structural.
{
  const report = comparePayloads({
    base: makePayload(),
    ours: makePayload(),
    theirs: makeFacts((facts) => {
      facts.nodes["button/icon"] = { kind: "vector", width: 16 };
    }),
  });
  const added = report.diffs.find((diff) => diff.path === "button/icon");
  assert.equal(added.category, "structural", "node addition categorizes as structural");
  assert.equal(added.field, "node");
  assert.equal(added.base, null);
}

// --- Suppression rules -----------------------------------------------------

// font-metrics-text-height: within-tolerance text height deltas suppress, and
// (spec scenario) a story whose only diff is suppressed classifies synced.
{
  const report = comparePayloads({
    base: makePayload(),
    ours: makePayload(),
    theirs: makeFacts((facts) => {
      facts.nodes["button/label"].height = 21.5;
    }),
  });
  assert.equal(report.classification, "synced", "suppressed-only diff classifies synced");
  assert.equal(report.diffs.length, 0, "suppressed diff leaves diffs empty");
  assert.equal(report.suppressed.length, 1, "suppressed diff is retained for audit");
  assert.equal(report.suppressed[0].rule, "font-metrics-text-height");
  assert.ok(report.suppressed[0].reason.length > 0, "suppressed diff carries a reason");
}

// A beyond-tolerance text height delta is a real diff.
{
  const report = comparePayloads({
    base: makePayload(),
    ours: makePayload(),
    theirs: makeFacts((facts) => {
      facts.nodes["button/label"].height = 40;
    }),
  });
  assert.equal(report.classification, "figma-only", "large text height delta stays a diff");
}

// srgb-clamp-color: within-epsilon color deltas suppress.
{
  const report = comparePayloads({
    base: makePayload(),
    ours: makePayload(),
    theirs: makeFacts((facts) => {
      facts.nodes.button.backgroundColor = "#3466ff";
    }),
  });
  assert.equal(report.suppressed[0]?.rule, "srgb-clamp-color", "near-identical color suppresses");
  assert.equal(report.classification, "synced");
}

// A clearly different color stays a diff.
{
  const report = comparePayloads({
    base: makePayload(),
    ours: makePayload(),
    theirs: makeFacts((facts) => {
      facts.nodes.button.backgroundColor = "#ff0000";
    }),
  });
  assert.equal(report.classification, "figma-only", "distinct color stays a diff");
}

// raster-embed-cap: image dimensions at the cap suppress.
{
  const base = makePayload();
  base.root.children.push({
    children: [],
    kind: "image",
    name: "hero",
    styles: { height: 1024, width: 2048, x: 0, y: 40 },
  });
  const theirs = makeFacts((facts) => {
    facts.nodes["button/hero"] = { height: 1024, kind: "image", width: 2600 };
  });
  const report = comparePayloads({ base, ours: base, theirs });
  assert.equal(report.suppressed[0]?.rule, "raster-embed-cap", "capped image width suppresses");
  assert.equal(report.classification, "synced");
}

// browser-reference-layer: any diff on the reference snapshot suppresses,
// including its addition or removal.
{
  const report = comparePayloads({
    base: makePayload(),
    ours: makePayload(),
    theirs: makeFacts((facts) => {
      facts.nodes["Browser Reference"] = { kind: "frame", width: 400 };
    }),
  });
  assert.equal(report.suppressed[0]?.rule, "browser-reference-layer");
  assert.equal(report.classification, "synced");
}

// figma-chrome-position: root x/y deltas suppress.
{
  const report = comparePayloads({
    base: makePayload(),
    ours: makePayload(),
    theirs: makeFacts((facts) => {
      facts.nodes.button.x = 800;
      facts.nodes.button.y = 1200;
    }),
  });
  assert.deepEqual(
    report.suppressed.map((entry) => entry.rule),
    ["figma-chrome-position", "figma-chrome-position"],
    "root x/y deltas suppress as figma chrome",
  );
  assert.equal(report.classification, "synced");
}

// --- Stale-baseline warning ------------------------------------------------

{
  const report = comparePayloads({
    base: makePayload(),
    ours: makePayload(),
    theirs: makeFacts((facts) => {
      facts.generatedAt = "2026-08-28T09:00:00.000Z";
    }),
  });
  assert.ok(
    report.warnings.some((warning) => warning.includes("stale")),
    "generatedAt mismatch warns that the baseline may be stale",
  );
}

// --- CLI determinism (spec scenario: identical inputs, identical reports) ---

const workDir = mkdtempSync(path.join(os.tmpdir(), "figma-sync-compare-"));
try {
  const basePath = path.join(workDir, "base.json");
  const oursPath = path.join(workDir, "ours.json");
  const theirsPath = path.join(workDir, "theirs.json");
  const ours = makePayload();
  ours.root.styles.gap = 12;
  writeFileSync(basePath, JSON.stringify(makePayload()));
  writeFileSync(oursPath, JSON.stringify(ours));
  writeFileSync(
    theirsPath,
    JSON.stringify(
      makeFacts((facts) => {
        facts.nodes.button.radius = "12";
      }),
    ),
  );

  const run = () =>
    execFileSync(
      process.execPath,
      [scriptPath, "--base", basePath, "--ours", oursPath, "--theirs", theirsPath],
      { encoding: "utf8" },
    );
  const first = run();
  const second = run();
  assert.equal(first, second, "identical inputs produce byte-identical reports");
  const parsed = JSON.parse(first);
  assert.equal(parsed.classification, "conflict", "CLI reports the conflict classification");
  assert.equal(parsed.storyId, "components-button--primary", "CLI report carries the storyId");

  // Partial mode over the CLI.
  const partial = execFileSync(
    process.execPath,
    [scriptPath, "--base", basePath, "--ours", oursPath],
    { encoding: "utf8" },
  );
  assert.equal(JSON.parse(partial).classification, "partial", "CLI without --theirs is partial");

  // Unreadable input exits non-zero with a message.
  let failed = false;
  try {
    execFileSync(process.execPath, [scriptPath, "--base", basePath], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    failed = true;
    assert.match(String(error.stderr), /Usage:/, "missing --ours prints usage");
  }
  assert.ok(failed, "missing required arguments exit non-zero");
} finally {
  rmSync(workDir, { force: true, recursive: true });
}

console.log("test_compare_payload_baseline: all assertions passed");
