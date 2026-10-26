#!/usr/bin/env node

// Regression tests for the extractor scripts. Each fixture under scripts/fixtures/
// is copied to a temp dir under os.tmpdir() and the scripts run against the copy,
// so generated docs never land in the repo. Run: node scripts/test_audits.mjs

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(scriptsDir, "fixtures");
const tempRoots = [];

process.on("exit", () => {
  for (const dir of tempRoots) fs.rmSync(dir, { recursive: true, force: true });
});

function copyFixture(name) {
  const source = path.join(fixturesDir, name);
  assert.ok(fs.existsSync(source), `fixture ${name} exists`);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `ext-${name}-`));
  fs.cpSync(source, dir, { recursive: true });
  tempRoots.push(dir);
  return dir;
}

function run(script, args) {
  const result = spawnSync(process.execPath, [path.join(scriptsDir, script), ...args], {
    encoding: "utf8",
  });
  return {
    code: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    out: `${result.stdout || ""}${result.stderr || ""}`,
  };
}

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

const SCRIPTS = [
  "audit_sources.mjs",
  "audit_tokens.mjs",
  "audit_components.mjs",
  "generate_docs_html.mjs",
  "generate_review_html.mjs",
  "extract_check.mjs",
  "apply_token_decisions.mjs",
];

test("--help prints usage and exits 0 for every script", () => {
  for (const script of SCRIPTS) {
    const result = run(script, ["--help"]);
    assert.equal(result.code, 0, `${script} --help exit code`);
    assert.match(result.stdout, /^Usage: node <skill-root>\/scripts\//, `${script} usage line`);
  }
});

test("minimal-pass: every strict audit and both generators pass", () => {
  const root = copyFixture("minimal-pass");

  const sources = run("audit_sources.mjs", [root, "--strict"]);
  assert.equal(sources.code, 0, sources.out);
  assert.match(sources.stdout, /Source inventory rows: 2/);
  assert.match(sources.stdout, /Source audit passed\./);

  const tokens = run("audit_tokens.mjs", [root, "--strict"]);
  assert.equal(tokens.code, 0, tokens.out);
  assert.match(tokens.stdout, /Token audit passed\./);

  const components = run("audit_components.mjs", [root, "--strict"]);
  assert.equal(components.code, 0, components.out);
  assert.match(components.stdout, /Inventory component rows: 1/);
  assert.match(components.stdout, /Specs missing fingerprint: 0/);
  assert.match(components.stdout, /Status lint warnings: 0/);
  assert.match(components.stdout, /Component audit passed\./);

  const docs = run("generate_docs_html.mjs", [root, "--locale", "en"]);
  assert.equal(docs.code, 0, docs.out);
  assert.doesNotMatch(docs.stdout, /Missing documents/, "all core docs present");
  const indexHtml = fs.readFileSync(path.join(root, "docs", "design-system", "index.html"), "utf8");
  assert.doesNotMatch(indexHtml, /COMPONENT_SPEC_TEMPLATE/, "spec template is not rendered");
  assert.doesNotMatch(indexHtml, /INTEGRATION_REVIEW/, "integration review is not reported");
  assert.match(indexHtml, /primary-button\.md/, "component spec rendered");
  assert.match(indexHtml, /<html lang="en">/);

  const review = run("generate_review_html.mjs", [root]);
  assert.equal(review.code, 0, review.out);
  const reviewHtml = fs.readFileSync(path.join(root, "docs", "design-system", "review.html"), "utf8");
  for (const id of ["source-duplicates", "color-scale", "near-colors", "near-numbers", "scale-fit", "components"]) {
    assert.match(reviewHtml, new RegExp(`id="${id}"`), `review.html keeps section #${id}`);
  }

  const reviewJson = run("generate_review_html.mjs", [root, "--json"]);
  assert.equal(reviewJson.code, 0, reviewJson.out);
  const parsed = JSON.parse(reviewJson.stdout);
  assert.deepEqual(Object.keys(parsed).sort(), ["clusters", "counts", "needsReview"]);
  assert.equal(parsed.counts.needsReview, 0);
  assert.deepEqual(parsed.clusters.colors, []);
  assert.deepEqual(parsed.clusters.numbers, []);
});

test("extract_check --json prints only the JSON summary", () => {
  const root = copyFixture("minimal-pass");
  const result = run("extract_check.mjs", [root, "--json", "--locale", "en"]);
  assert.equal(result.code, 0, result.out);
  const payload = JSON.parse(result.stdout);
  assert.deepEqual(Object.keys(payload).sort(), ["mode", "passed", "steps"]);
  assert.equal(payload.mode, "strict");
  assert.equal(payload.passed, true);
  assert.deepEqual(
    payload.steps.map((step) => step.script),
    [
      "audit_sources.mjs",
      "audit_tokens.mjs",
      "audit_components.mjs",
      "generate_docs_html.mjs",
      "generate_review_html.mjs",
    ],
  );
  for (const step of payload.steps) {
    assert.deepEqual(Object.keys(step).sort(), ["exit", "pass", "script"]);
    assert.equal(step.exit, 0);
    assert.equal(step.pass, true);
  }
  assert.ok(fs.existsSync(path.join(root, "docs", "design-system", "index.html")));
  assert.ok(fs.existsSync(path.join(root, "docs", "design-system", "review.html")));
});

test("extract_check human output: headers, STEP | RESULT table, exit 1 when an audit fails", () => {
  const root = copyFixture("empty-inventory");
  const strictRun = run("extract_check.mjs", [root]);
  assert.equal(strictRun.code, 1);
  for (const script of ["audit_sources.mjs", "audit_tokens.mjs", "audit_components.mjs", "generate_docs_html.mjs", "generate_review_html.mjs"]) {
    assert.match(strictRun.stdout, new RegExp(`^== ${script} ==$`, "m"), `header for ${script}`);
  }
  assert.match(strictRun.stdout, /^STEP \| RESULT$/m);
  assert.match(strictRun.stdout, /^audit_components\.mjs \| FAIL \(exit 1\)$/m);
  assert.match(strictRun.stdout, /^generate_review_html\.mjs \| PASS$/m, "generators still run after a failed audit");
  assert.match(strictRun.stdout, /Mode: strict/);
  assert.match(strictRun.stdout, /at least one inventory component row/);

  const starterRun = run("extract_check.mjs", [root, "--starter", "--audits-only"]);
  assert.equal(starterRun.code, 0, starterRun.out);
  assert.match(starterRun.stdout, /Mode: starter \(audits only\)/);
  assert.doesNotMatch(starterRun.stdout, /generate_docs_html\.mjs/);
  assert.doesNotMatch(starterRun.stdout, /generate_review_html\.mjs/);
  assert.match(starterRun.stdout, /^audit_components\.mjs \| PASS$/m);
});

test("extract_check rejects bad usage with exit 2", () => {
  const missingRoot = run("extract_check.mjs", []);
  assert.equal(missingRoot.code, 2);
  assert.match(missingRoot.stderr, /Missing <target-root>/);

  const badLocale = run("extract_check.mjs", [copyFixture("six-file-minimum"), "--locale", "fr"]);
  assert.equal(badLocale.code, 2);
  assert.match(badLocale.stderr, /Unsupported --locale "fr"/);

  const unknownFlag = run("extract_check.mjs", [copyFixture("six-file-minimum"), "--quick"]);
  assert.equal(unknownFlag.code, 2);
  assert.match(unknownFlag.stderr, /Unknown option "--quick"/);
});

test("six-file-minimum: the files the scripts parse are enough for strict", () => {
  const root = copyFixture("six-file-minimum");
  for (const script of ["audit_sources.mjs", "audit_tokens.mjs", "audit_components.mjs"]) {
    const result = run(script, [root, "--strict"]);
    assert.equal(result.code, 0, `${script}: ${result.out}`);
  }
  const docs = run("generate_docs_html.mjs", [root, "--locale", "en"]);
  assert.equal(docs.code, 0, docs.out);
  const missingLine = docs.stdout.split("\n").find((line) => line.startsWith("Missing documents:")) || "";
  assert.match(missingLine, /DESIGN_PRINCIPLES\.md/);
  assert.match(missingLine, /SESSION_STATE\.md/);
  assert.doesNotMatch(missingLine, /INTEGRATION_REVIEW\.md/, "INTEGRATION_REVIEW.md is not a core document");
  assert.doesNotMatch(missingLine, /COMPONENT_SPEC_TEMPLATE\.md/, "spec template is not a core document");
});

test("annotated-headings: zh-Hant annotations after English headings and keywords are accepted", () => {
  const root = copyFixture("annotated-headings");
  const sources = run("audit_sources.mjs", [root, "--strict"]);
  assert.equal(sources.code, 0, sources.out);
  assert.match(sources.stdout, /Source inventory rows: 2/);
  assert.match(sources.stdout, /Repeated fingerprint groups: 1/);
  assert.match(sources.stdout, /Documented duplicate decisions: 1/);

  const components = run("audit_components.mjs", [root, "--strict"]);
  assert.equal(components.code, 0, components.out);
  assert.match(components.stdout, /Documented similarity decisions: 1/);
  assert.match(components.stdout, /Specs missing fingerprint: 0/, "annotated fingerprint heading counts");
  assert.match(components.stdout, /Status lint warnings: 0/, "extracted（已萃取） is a known status");
});

test("keyword-rejected: 'approved' and 'pending' are not decisions; messages list the accepted words", () => {
  const root = copyFixture("keyword-rejected");
  const sources = run("audit_sources.mjs", [root, "--strict"]);
  assert.equal(sources.code, 1);
  const sourceIssues = lines(sources.stdout, "Issues:");
  assert.equal(sourceIssues.length, 1, sources.out);
  assert.match(sourceIssues[0], /^design-system\/DESIGN_EVIDENCE_MAP\.md:\d+: Unresolved source duplicate review: S2 vs S1/);
  assert.match(sourceIssues[0], /"approved" is not accepted/);
  assert.match(sourceIssues[0], /reuse existing source \| ignore duplicate \| keep distinct \| merge \| blocked \| out-of-scope/);
  assert.match(sources.stdout, /Documented duplicate decisions: 1/, "reuse existing source row is accepted");

  const components = run("audit_components.mjs", [root, "--strict"]);
  assert.equal(components.code, 1);
  const componentIssues = lines(components.stdout, "Issues:");
  assert.equal(componentIssues.length, 1, components.out);
  assert.match(componentIssues[0], /^design-system\/COMPONENT_INVENTORY\.md:\d+: Unresolved component similarity review: Secondary Button vs Primary Button/);
  assert.match(componentIssues[0], /merge \| make variant \| keep distinct \| blocked \| out-of-scope/);

  const nonStrict = run("audit_sources.mjs", [root]);
  assert.equal(nonStrict.code, 0, "non-strict downgrades to warnings");
  assert.equal(lines(nonStrict.stdout, "Warnings:").length, 1);
});

test("layer-violations: raw values and cross-layer references are issues in every mode", () => {
  const root = copyFixture("layer-violations");
  const result = run("audit_tokens.mjs", [root]);
  assert.equal(result.code, 1);
  const issues = lines(result.stdout, "Issues:");
  const expect = (pattern) =>
    assert.ok(issues.some((issue) => pattern.test(issue)), `expected ${pattern} in:\n${issues.join("\n")}`);
  expect(/Reference token uses semantic role "primary": --md-ref-color-primary-50/);
  expect(/System token appears to use a raw value instead of a reference token: --md-sys-motion-easing-standard: cubic-bezier.*Move the literal into tokens-ref\.css/);
  expect(/System token appears to use a raw value instead of a reference token: --md-sys-shape-corner-full: 9999px/);
  expect(/System token appears to use a raw value instead of a reference token: --md-sys-color-scrim: rgb/);
  expect(/System token appears to use a raw value instead of a reference token: --md-sys-spacing-none: 0/);
  expect(/Component token references reference token directly: --md-comp-card-outline-color/);
  expect(/Component token appears to use a raw value instead of a system token: --md-comp-card-radius: 12px/);
  assert.ok(!issues.some((issue) => issue.includes("--md-sys-spacing-gap-md")), "valid sys token is not flagged");
});

test("near-token-css: token-review comments document near pairs for audit and review", () => {
  const root = copyFixture("near-token-css");
  const audit = run("audit_tokens.mjs", [root, "--strict"]);
  assert.equal(audit.code, 0, audit.out);
  assert.match(audit.stdout, /Token review candidates: 0/);
  assert.match(audit.stdout, /Documented review decisions: 2/);

  const review = run("generate_review_html.mjs", [root, "--json"]);
  assert.equal(review.code, 0, review.out);
  const parsed = JSON.parse(review.stdout);
  assert.equal(parsed.counts.nearColors, 1);
  assert.equal(parsed.counts.nearNumbers, 1);
  assert.equal(parsed.counts.needsReview, 0, JSON.stringify(parsed.needsReview));
  assert.deepEqual(parsed.needsReview, []);
});

test("near-token-doc: a TOKEN_ARCHITECTURE.md line naming both tokens documents the pair", () => {
  const root = copyFixture("near-token-doc");
  const audit = run("audit_tokens.mjs", [root, "--strict"]);
  assert.equal(audit.code, 0, audit.out);
  assert.match(audit.stdout, /Documented review decisions: 2/);

  const review = run("generate_review_html.mjs", [root, "--json"]);
  const parsed = JSON.parse(review.stdout);
  assert.equal(parsed.counts.nearColors + parsed.counts.nearNumbers, 2);
  assert.equal(parsed.counts.needsReview, 0, JSON.stringify(parsed.needsReview));

  // Remove the doc and the same pairs become undocumented in both tools.
  fs.rmSync(path.join(root, "design-system", "TOKEN_ARCHITECTURE.md"));
  const failing = run("audit_tokens.mjs", [root, "--strict"]);
  assert.equal(failing.code, 1);
  assert.match(failing.stdout, /Token review candidates: 2/);
  assert.match(failing.stdout, /Near reference colors need review: --md-ref-color-green-70/);
  const failingReview = JSON.parse(run("generate_review_html.mjs", [root, "--json"]).stdout);
  assert.equal(failingReview.counts.needsReview, 2);
  assert.deepEqual(
    failingReview.needsReview.map((entry) => entry.kind),
    ["near-color", "near-number"],
  );
});

test("a11y-remap: CSS comment and Accessibility Remap section are accepted by audit and review", () => {
  const root = copyFixture("a11y-remap");
  const audit = run("audit_tokens.mjs", [root, "--strict"]);
  assert.equal(audit.code, 0, audit.out);
  assert.match(audit.stdout, /Documented review decisions: 2/);

  const review = run("generate_review_html.mjs", [root, "--json"]);
  assert.equal(review.code, 0, review.out);
  const parsed = JSON.parse(review.stdout);
  assert.equal(parsed.counts.nearColors, 1);
  assert.equal(parsed.counts.nearNumbers, 1);
  assert.equal(parsed.counts.needsReview, 0, JSON.stringify(parsed.needsReview));
});

test("status-lint: unknown Status is a warning in strict and non-strict, never an issue", () => {
  const root = copyFixture("status-lint");
  for (const flags of [[], ["--strict"]]) {
    const result = run("audit_components.mjs", [root, ...flags]);
    assert.equal(result.code, 0, result.out);
    assert.match(result.stdout, /Status lint warnings: 1/);
    const warnings = lines(result.stdout, "Warnings:");
    assert.equal(warnings.length, 1, result.out);
    assert.match(warnings[0], /^design-system\/COMPONENT_INVENTORY\.md:5: Status "bogus-status" for Primary Button is not a known status keyword/);
    assert.match(warnings[0], /extracted \| planned \| blocked \| out-of-scope \| ready \| queued \| in-progress \| todo \| candidate \| deferred \| needs-extraction \| implementation-derived \| brief-derived \| needs-review \| done \| reused \| needs-source \| needs-token \| needs-api-decision \| needs-existing-component-review/);
    assert.doesNotMatch(result.stdout, /Issues:/);
    assert.match(result.stdout, /Component audit passed\./);
  }
});

test("empty-inventory: strict needs one component row; non-strict passes the starter template", () => {
  const root = copyFixture("empty-inventory");
  const strictRun = run("audit_components.mjs", [root, "--strict"]);
  assert.equal(strictRun.code, 1);
  const issues = lines(strictRun.stdout, "Issues:");
  assert.equal(issues.length, 1, strictRun.out);
  assert.match(issues[0], /^design-system\/COMPONENT_INVENTORY\.md: Strict mode requires at least one inventory component row/);

  const starterRun = run("audit_components.mjs", [root]);
  assert.equal(starterRun.code, 0, starterRun.out);
  assert.match(starterRun.stdout, /Inventory component rows: 0/);
  assert.match(starterRun.stdout, /Component audit passed\./);
});

test("fingerprint-strict: missing fingerprint is an issue only for extracted, extractor-authored specs", () => {
  const root = copyFixture("fingerprint-strict");
  const strictRun = run("audit_components.mjs", [root, "--strict"]);
  assert.equal(strictRun.code, 1);
  assert.match(strictRun.stdout, /Specs missing fingerprint: 3/);
  const issues = lines(strictRun.stdout, "Issues:");
  assert.equal(issues.length, 1, strictRun.out);
  assert.match(issues[0], /^design-system\/components\/primary-button\.md: Component spec is missing a "## Component Fingerprint" section\. The inventory marks this component extracted/);
  const warnings = lines(strictRun.stdout, "Warnings:");
  assert.deepEqual(
    warnings.map((warning) => warning.split(":")[0]).sort(),
    ["design-system/components/chip.md", "design-system/components/secondary-button.md"],
    "planned spec and implementation-derived draft stay warnings",
  );

  const nonStrict = run("audit_components.mjs", [root]);
  assert.equal(nonStrict.code, 0, nonStrict.out);
  assert.equal(lines(nonStrict.stdout, "Warnings:").length, 3);
});

test("Category column in the inventory is accepted without complaint", () => {
  const root = copyFixture("minimal-pass");
  const inventoryFile = path.join(root, "design-system", "COMPONENT_INVENTORY.md");
  const inventory = fs.readFileSync(inventoryFile, "utf8");
  assert.match(inventory, /\| Component \| Category \|/, "fixture carries the Category column");
  const result = run("audit_components.mjs", [root, "--strict"]);
  assert.equal(result.code, 0, result.out);
  assert.doesNotMatch(result.stdout, /Category/i);
});

test("INTEGRATION_REVIEW.md renders as an extra document when the Collaboration pass created it", () => {
  const root = copyFixture("minimal-pass");
  fs.writeFileSync(
    path.join(root, "design-system", "INTEGRATION_REVIEW.md"),
    "# Integration Review\n\n| Branch | Decision | Notes |\n|---|---|---|\n| ds/demo | merge | demo row |\n",
  );
  const docs = run("generate_docs_html.mjs", [root, "--locale", "en"]);
  assert.equal(docs.code, 0, docs.out);
  assert.doesNotMatch(docs.stdout, /Missing documents/, "INTEGRATION_REVIEW.md is never a missing core document");
  const indexHtml = fs.readFileSync(path.join(root, "docs", "design-system", "index.html"), "utf8");
  assert.match(indexHtml, /Integration Review/, "INTEGRATION_REVIEW.md is rendered with its own nav label");
  assert.match(indexHtml, /demo row/, "INTEGRATION_REVIEW.md content is rendered");
  assert.doesNotMatch(indexHtml, /COMPONENT_SPEC_TEMPLATE/, "the blank spec template stays excluded");
});

test("near-token-clusters: clusters, tiers, canonical, scale fit", () => {
  const root = copyFixture("near-token-clusters");
  const audit = run("audit_tokens.mjs", [root]);
  assert.equal(audit.code, 0, audit.out);
  assert.match(audit.stdout, /Near token clusters: 5 \(auto 1, proposal 3, must-ask 1\)/);
  assert.match(audit.stdout, /Token review candidates: 8/);
  assert.match(audit.stdout, /Documented review decisions: 0/);
  assert.match(audit.stdout, /C1 \[proposal\] color\/blue: canonical --md-ref-color-blue-50/, "authored anchor is canonical");
  assert.match(audit.stdout, /C5 \[proposal\] number\/size: canonical --md-ref-size-12/);
  assert.match(audit.stdout, /Scale fit \(length\): base 4px, on-grid 2\/5, outliers 2/);
  const warnings = lines(audit.stdout, "Warnings:");
  assert.equal(warnings.length, 9, audit.out); // 8 member candidates + 1 scale outlier line
  assert.ok(
    warnings.some((warning) => /^Off-grid length tokens on the 4px grid: .*--md-ref-size-18 \(18px, nearest 16px, \+2\)/.test(warning)),
    "size-18 is an outlier",
  );
  assert.ok(!warnings.some((warning) => warning.includes("--md-ref-size-1 (")), "hairline is not an outlier");
  assert.ok(
    warnings.some((warning) => /^Near reference colors need review: --md-ref-color-blue-50 \(#2f6fd6\) and --md-ref-color-blue-51 .*\[C1, tier auto, proposed merge\]/.test(warning)),
    "canonical is named first and the tier is shown",
  );
  assert.ok(
    warnings.some((warning) => /^Near reference colors need review: --md-ref-color-green-60 .*--md-ref-color-green-61 .*tier must-ask, no default/.test(warning)),
    "authored vs authored is must-ask",
  );

  const strict = run("audit_tokens.mjs", [root, "--strict"]);
  assert.equal(strict.code, 1);
  assert.equal(lines(strict.stdout, "Issues:").length, 8);
  assert.equal(lines(strict.stdout, "Warnings:").length, 1, "scale outliers stay warnings in strict mode");

  const json = run("audit_tokens.mjs", [root, "--json"]);
  assert.equal(json.code, 0, json.out);
  const payload = JSON.parse(json.stdout);
  assert.deepEqual(Object.keys(payload).sort(), ["clusters", "counts", "issues", "scaleFit", "warnings"]);
  assert.equal(payload.clusters.length, 5);
  assert.equal(payload.scaleFit.base, 4);
  assert.deepEqual(payload.scaleFit.outliers.map((entry) => entry.name), ["--md-ref-size-14", "--md-ref-size-18"]);
  assert.deepEqual(payload.scaleFit.excluded.map((entry) => entry.name), ["--md-ref-size-1"]);
});

test("near-token-clusters: review.html renders cluster cards and the JSON carries clusters", () => {
  const root = copyFixture("near-token-clusters");
  const review = run("generate_review_html.mjs", [root]);
  assert.equal(review.code, 0, review.out);
  const html = fs.readFileSync(path.join(root, "docs", "design-system", "review.html"), "utf8");
  for (const id of ["source-duplicates", "color-scale", "near-colors", "near-numbers", "scale-fit", "components"]) {
    assert.match(html, new RegExp(`id="${id}"`), `section #${id}`);
  }
  assert.match(html, /<article class="cluster" id="cluster-C1" data-tier="proposal"/);
  assert.match(html, /<article class="cluster" id="cluster-C2" data-tier="must-ask"/);
  assert.match(html, /<article class="cluster" id="cluster-C4" data-tier="auto"/);
  assert.match(html, /navigator\.clipboard/);
  assert.match(html, /data-copy="copy-colors-auto"/);
  assert.match(
    html,
    /\| --md-ref-color-red-41 \| measured \| --md-ref-color-red-40 \| authored \| deltaE2000 0\.25 \(auto\) \| merge \| measured snaps into authored \(C4\) \| auto-tier \|/,
    "copy block holds the decision rows",
  );

  const json = JSON.parse(run("generate_review_html.mjs", [root, "--json"]).stdout);
  assert.deepEqual(Object.keys(json).sort(), ["clusters", "counts", "needsReview"]);
  assert.equal(json.clusters.colors.length, 4);
  assert.equal(json.clusters.numbers.length, 1);
  assert.equal(json.clusters.scaleFit.base, 4);
  assert.equal(json.counts.needsReview, 8);
  assert.equal(json.needsReview.filter((entry) => entry.kind === "near-color").length, 6);
});

test("apply_token_decisions: auto writes merge rows and rewrites CSS; proposal and must-ask complete strict", () => {
  const root = copyFixture("near-token-clusters");
  const architectureFile = path.join(root, "design-system", "TOKEN_ARCHITECTURE.md");
  const before = fs.readFileSync(architectureFile, "utf8");

  const dry = run("apply_token_decisions.mjs", [root, "--tier", "auto", "--dry-run"]);
  assert.equal(dry.code, 0, dry.out);
  assert.match(dry.stdout, /Rows written: 4 \(dry run\)/);
  assert.equal(fs.readFileSync(architectureFile, "utf8"), before, "dry run changes nothing");

  const auto = run("apply_token_decisions.mjs", [root, "--tier", "auto", "--rewrite-css"]);
  assert.equal(auto.code, 0, auto.out);
  assert.match(auto.stdout, /Rows written: 4/);
  assert.match(auto.stdout, /CSS rewrite: 2 reference\(s\) rewritten, 4 declaration\(s\) removed/);
  const architecture = fs.readFileSync(architectureFile, "utf8");
  assert.match(
    architecture,
    /\| --md-ref-color-blue-51 \| measured \| --md-ref-color-blue-50 \| authored \| deltaE2000 0\.47 \(auto\) \| merge \| measured snaps into authored \(C1\) \| auto-tier \|/,
  );
  const refCss = fs.readFileSync(path.join(root, "tokens", "tokens-ref.css"), "utf8");
  assert.doesNotMatch(refCss, /--md-ref-color-blue-51:/);
  assert.doesNotMatch(refCss, /--md-ref-size-13:/);
  const sysCss = fs.readFileSync(path.join(root, "tokens", "tokens-sys.css"), "utf8");
  assert.match(sysCss, /--md-sys-color-primary-container: var\(--md-ref-color-blue-50\)/);
  assert.match(sysCss, /--md-sys-spacing-gap-md: var\(--md-ref-size-12\)/);

  const again = run("apply_token_decisions.mjs", [root, "--tier", "auto"]);
  assert.equal(again.code, 0, again.out);
  assert.match(again.stdout, /Rows written: 0/);

  const afterAuto = run("audit_tokens.mjs", [root, "--strict"]);
  assert.equal(afterAuto.code, 1);
  assert.match(afterAuto.stdout, /Token review candidates: 4/);

  const missingConfirmer = run("apply_token_decisions.mjs", [root, "--tier", "proposal"]);
  assert.equal(missingConfirmer.code, 2);
  assert.match(missingConfirmer.stderr, /--confirmed-by/);
  const missingDecision = run("apply_token_decisions.mjs", [root, "--tier", "must-ask", "--confirmed-by", "dev"]);
  assert.equal(missingDecision.code, 2);
  assert.match(missingDecision.stderr, /--decision/);
  const badTier = run("apply_token_decisions.mjs", [root, "--tier", "later"]);
  assert.equal(badTier.code, 2);

  const proposal = run("apply_token_decisions.mjs", [root, "--tier", "proposal", "--confirmed-by", "dev", "--keep", "--md-ref-color-neutral-81"]);
  assert.equal(proposal.code, 0, proposal.out);
  assert.match(proposal.stdout, /Rows written: 3/);
  const afterProposal = fs.readFileSync(architectureFile, "utf8");
  assert.match(
    afterProposal,
    /\| --md-ref-color-neutral-81 \| unknown \| --md-ref-color-neutral-80 \| unknown \| deltaE2000 0\.24 \(proposal\) \| keep distinct \| unknown provenance \(C3\) \| dev \|/,
    "--keep overrides the proposed merge",
  );
  assert.match(
    afterProposal,
    /\| --md-ref-color-blue-53 \| measured \| --md-ref-color-blue-50 \| authored \| deltaE2000 2\.7 \(proposal\) \| keep distinct \| measured near authored beyond snap \(C1\) \| dev \|/,
  );

  const mustAsk = run("apply_token_decisions.mjs", [
    root, "--tier", "must-ask", "--only", "--md-ref-color-green-60", "--decision", "keep-distinct", "--confirmed-by", "dev", "--json",
  ]);
  assert.equal(mustAsk.code, 0, mustAsk.out);
  const mustAskJson = JSON.parse(mustAsk.stdout);
  assert.deepEqual(Object.keys(mustAskJson).sort(), ["dryRun", "rewrite", "rows", "skipped", "tier", "written"]);
  assert.equal(mustAskJson.written, 1);
  assert.equal(mustAskJson.rows[0].decision, "keep distinct");

  const final = run("audit_tokens.mjs", [root, "--strict"]);
  assert.equal(final.code, 0, final.out);
  assert.match(final.stdout, /Token audit passed\./);
});

test("apply_token_decisions: missing TOKEN_ARCHITECTURE.md exits 1; prefix names survive --rewrite-css", () => {
  const root = copyFixture("near-token-clusters");
  fs.rmSync(path.join(root, "design-system", "TOKEN_ARCHITECTURE.md"));
  const missing = run("apply_token_decisions.mjs", [root, "--tier", "auto"]);
  assert.equal(missing.code, 1);
  assert.match(missing.stderr, /TOKEN_ARCHITECTURE\.md/);

  const prefixRoot = copyFixture("minimal-pass");
  fs.writeFileSync(
    path.join(prefixRoot, "tokens", "tokens-ref.css"),
    ":root {\n  --md-ref-size-12: 12px; /* provenance: authored */\n  --md-ref-size-13: 13px; /* provenance: measured */\n  --md-ref-size-120: 120px;\n}\n",
  );
  fs.writeFileSync(
    path.join(prefixRoot, "tokens", "tokens-sys.css"),
    ":root { --md-sys-spacing-a: var(--md-ref-size-13); --md-sys-spacing-b: var(--md-ref-size-120); --md-sys-spacing-c: var(--md-ref-size-13, 1px); }\n",
  );
  const rewrite = run("apply_token_decisions.mjs", [prefixRoot, "--tier", "auto", "--rewrite-css"]);
  assert.equal(rewrite.code, 0, rewrite.out);
  assert.match(rewrite.stdout, /CSS rewrite: 2 reference\(s\) rewritten, 1 declaration\(s\) removed/);
  const sysCss = fs.readFileSync(path.join(prefixRoot, "tokens", "tokens-sys.css"), "utf8");
  assert.match(sysCss, /var\(--md-ref-size-120\)/, "prefix name untouched");
  assert.doesNotMatch(sysCss, /--md-ref-size-13\b/);
});

test("component similarity clusters are counted by the audit and grouped by the review page", () => {
  const annotated = run("audit_components.mjs", [copyFixture("annotated-headings"), "--strict"]);
  assert.match(annotated.stdout, /Similarity clusters: 1/);
  assert.match(annotated.stdout, /Unresolved similarity clusters: 0/);
  const rejected = run("audit_components.mjs", [copyFixture("keyword-rejected")]);
  assert.match(rejected.stdout, /Similarity clusters: 1/);
  assert.match(rejected.stdout, /Unresolved similarity clusters: 1/);
  const review = JSON.parse(run("generate_review_html.mjs", [copyFixture("keyword-rejected"), "--json"]).stdout);
  assert.equal(review.clusters.components.length, 1);
  assert.deepEqual([...review.clusters.components[0].components].sort(), ["Primary Button", "Secondary Button"]);
  assert.equal(review.clusters.components[0].status, "needs-review");
});
