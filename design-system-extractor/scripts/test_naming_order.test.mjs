// Naming order tests: node --test design-system-extractor/scripts/test_naming_order.test.mjs
//
// A team records its token naming order in TOKEN_ARCHITECTURE.md > "## Naming Order".
// audit_tokens.mjs checks every name against it and warns about a token that would also
// be a group once the names become slash paths (Figma Variables, DTCG). figma-m3-variables
// reads the same section, so its format is pinned here too.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { checkNameOrder, findStateGroups, parseNamingOrder } from "./naming_order.mjs";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(scriptsDir, "fixtures", "naming-order");
const templateFile = path.join(
  scriptsDir,
  "..",
  "assets",
  "design-system-template",
  "design-system",
  "TOKEN_ARCHITECTURE.md",
);
const TEAM_ORDER = ["prefix", "category", "component", "role", "variant", "target", "state"];

const tempRoots = [];
process.on("exit", () => {
  for (const dir of tempRoots) fs.rmSync(dir, { recursive: true, force: true });
});

function copyFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ext-naming-order-"));
  fs.cpSync(fixtureDir, dir, { recursive: true });
  tempRoots.push(dir);
  return dir;
}

function audit(root, ...flags) {
  const result = spawnSync(process.execPath, [path.join(scriptsDir, "audit_tokens.mjs"), root, ...flags], {
    encoding: "utf8",
  });
  return { code: result.status, stdout: result.stdout || "", out: `${result.stdout || ""}${result.stderr || ""}` };
}

// The "- " lines under a "Warnings:" or "Issues:" header.
function lines(output, header) {
  const all = output.split("\n");
  const start = all.indexOf(header);
  if (start === -1) return [];
  const collected = [];
  for (const line of all.slice(start + 1)) {
    if (!line.startsWith("- ")) break;
    collected.push(line.slice(2));
  }
  return collected;
}

const orderIssuesOf = (stdout) =>
  lines(stdout, "Issues:").filter((issue) => issue.startsWith("Token name does not follow the recorded naming order"));
const stateGroupsOf = (stdout) =>
  lines(stdout, "Warnings:").filter((warning) =>
    warning.startsWith("Token is also a group once names become slash paths (Figma Variables, DTCG)"),
  );

test("the recorded order is printed, out-of-order names are issues, state groups are warnings", () => {
  const result = audit(copyFixture());
  assert.equal(result.code, 1, result.out);
  assert.match(
    result.stdout,
    /^Naming order: prefix > category > component > role > variant > target > state \(TOKEN_ARCHITECTURE\.md\)$/m,
  );

  const orderIssues = orderIssuesOf(result.stdout);
  assert.equal(orderIssues.length, 1, orderIssues.join("\n"));
  assert.match(
    orderIssues[0],
    /--shop-comp-color-button-primary-border — "button" \(component\) comes after "color" \(role\); expected --shop-comp-button-color-primary-border$/,
  );
  for (const valid of [
    "--shop-ref-color-neutral-5",
    "--shop-sys-color-on-primary",
    "--shop-sys-size-corner-md",
    "--shop-comp-button-color-primary-container-hovered",
  ]) {
    assert.ok(!orderIssues.some((issue) => issue.includes(`${valid} `)), `${valid} follows the recorded order`);
  }

  const groups = stateGroupsOf(result.stdout);
  assert.equal(groups.length, 2, groups.join("\n"));
  assert.ok(
    groups.some(
      (warning) =>
        warning.includes(
          "--shop-comp-button-color-primary-container next to --shop-comp-button-color-primary-container-hovered",
        ) &&
        warning.includes("CSS is unaffected") &&
        warning.endsWith("Name the default state explicitly: --shop-comp-button-color-primary-container-default"),
    ),
    "comp container and its hovered state",
  );
  assert.ok(
    groups.some(
      (warning) =>
        warning.includes("--shop-sys-color-primary next to --shop-sys-color-primary-hovered") &&
        warning.endsWith("Name the default state explicitly: --shop-sys-color-primary-default"),
    ),
    "sys color and its hovered state",
  );
});

test("an explicit default state and the fixed order pass strict; the sys state group stays a warning", () => {
  const root = copyFixture();
  const compFile = path.join(root, "tokens", "tokens-comp.css");
  const css = fs
    .readFileSync(compFile, "utf8")
    .replace("--shop-comp-button-color-primary-container:", "--shop-comp-button-color-primary-container-default:")
    .replace("--shop-comp-color-button-primary-border:", "--shop-comp-button-color-primary-border:");
  fs.writeFileSync(compFile, css);

  const result = audit(root, "--strict");
  assert.equal(result.code, 0, result.out);
  assert.match(result.stdout, /Token audit passed\./);
  const groups = stateGroupsOf(result.stdout);
  assert.equal(groups.length, 1, groups.join("\n"));
  assert.match(groups[0], /--shop-sys-color-primary next to --shop-sys-color-primary-hovered/);
});

test("without a recorded order the audit prints the default line and adds no order issue", () => {
  const root = copyFixture();
  const architectureFile = path.join(root, "design-system", "TOKEN_ARCHITECTURE.md");
  const doc = fs.readFileSync(architectureFile, "utf8");
  fs.writeFileSync(architectureFile, doc.replace(/^Order: .*$/m, "Order:"));

  const result = audit(root);
  assert.match(result.stdout, /^Naming order: default \(none recorded\)$/m);
  assert.deepEqual(orderIssuesOf(result.stdout), []);
  assert.equal(stateGroupsOf(result.stdout).length, 2, "state groups are still found with the default state words");
});

test("the shipped template has the section and records no order", () => {
  const template = fs.readFileSync(templateFile, "utf8");
  assert.match(template, /^## Naming Order$/m, "the template has the section");
  assert.match(template, /^\| Slot \| Layers \| Values \|$/m, "the template has the slot table");
  assert.equal(parseNamingOrder(template), null, "the shipped template records no order");
});

test("naming_order module: parsing, segments and state groups", () => {
  assert.equal(parseNamingOrder("## Naming Order\n\nOrder: default\n"), null);
  assert.equal(parseNamingOrder("# Token Architecture\n"), null);
  assert.equal(parseNamingOrder(null), null);
  const annotated = parseNamingOrder("## Naming Order（命名順序）\n\n- Order: `prefix → category -> role / state`\n");
  assert.deepEqual(annotated.slots, ["prefix", "category", "role", "state"]);
  assert.deepEqual(annotated.values.category, ["ref", "sys", "comp"], "category defaults to ref, sys, comp");

  const order = parseNamingOrder(fs.readFileSync(path.join(fixtureDir, "design-system", "TOKEN_ARCHITECTURE.md"), "utf8"));
  assert.deepEqual(order.slots, TEAM_ORDER);
  assert.equal(order.source, "prompt");
  assert.equal(order.defaultState, "default");
  assert.deepEqual(order.layers.component, ["comp"]);
  assert.deepEqual(order.values.role, ["color", "font", "size", "spacing", "shadow", "elevation", "motion"]);

  assert.equal(checkNameOrder("--shop-sys-color-on-primary", order, "sys").ok, true, "a value with - is one segment");
  const ref = checkNameOrder("--shop-ref-color-neutral-5", order, "ref");
  assert.equal(ref.ok, true);
  assert.deepEqual(
    ref.segments.map((segment) => segment.text),
    ["shop", "ref", "color", "neutral", "5"],
  );
  assert.deepEqual(ref.segments.at(-1).slots, [TEAM_ORDER.indexOf("state")], "numbers go to the slot that lists numbers");
  assert.equal(
    checkNameOrder("--shop-comp-button-color-brand-container-default", order, "comp").ok,
    true,
    "segments outside the vocabulary are skipped",
  );
  assert.equal(
    checkNameOrder("--shop-ref-spacing-card-padding", order, "ref").ok,
    true,
    "slots restricted to other layers are left to the layer vocabulary checks",
  );
  const partial = checkNameOrder("--shop-comp-color-button-brand", order, "comp");
  assert.equal(partial.ok, false);
  assert.equal(partial.expected, null, "no expected name when a segment is unclassified");

  assert.deepEqual(findStateGroups(["--a-sys-color-primary-default", "--a-sys-color-primary-hovered"], order), []);
  assert.deepEqual(findStateGroups(["--md-comp-chip-container", "--md-comp-chip-container-selected"], null), [
    {
      token: "--md-comp-chip-container",
      children: ["--md-comp-chip-container-selected"],
      suggestion: "--md-comp-chip-container-default",
    },
  ]);
});
