// Review core tests: node --test design-system-extractor/scripts/test_review_core.test.mjs
//
// review_core.mjs is the one place that decides whether a near reference-token
// pair has a recorded decision. These tests pin the cases that used to be
// misjudged, and the ways packages written before the review flow recorded
// their decisions, so a change to the rules shows up here first.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildReview,
  buildTokenItems,
  collectDecisionRecords,
  componentLabel,
  createUsageLookup,
  DENSE_GROUP_THRESHOLD,
  findMergedValues,
  findNearPairs,
  holdsDecision,
  parseImageRegion,
  parseTokens,
  parseVisualReference,
  pngSize,
  readReportLanguage,
  regionToFractions,
  resolveLocale,
  resolvePair,
  SUPPORTED_LOCALES,
  tokensNamedIn,
} from "./review_core.mjs";

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "review");

function readOptional(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

// A fixture package loaded the way the audit and the review generator load one.
function loadPackage(name) {
  const root = path.join(fixturesDir, name);
  const refTokens = parseTokens(readOptional(path.join(root, "tokens", "tokens-ref.css")) || "");
  const architectureDoc = readOptional(path.join(root, "design-system", "TOKEN_ARCHITECTURE.md"));
  const { pairs } = findNearPairs(refTokens);
  const records = collectDecisionRecords({ architectureDoc, refTokens });
  const pairNames = pairs.map((pair) => `${pair.a} / ${pair.b}`);
  return {
    root,
    refTokens,
    pairs,
    pairNames,
    records,
    resolve: (a, b) => resolvePair(records, a, b),
    unresolved: pairs.filter((pair) => resolvePair(records, pair.a, pair.b).status !== "confirmed"),
  };
}

test("near pairs are found with the audit's thresholds", () => {
  const pkg = loadPackage("regression-substring");
  assert.deepEqual(pkg.pairNames, ["--md-ref-size-1 / --md-ref-size-2", "--md-ref-size-18 / --md-ref-size-20"]);
});

test("token names match exactly: a decision about size-18 and size-20 leaves size-1 and size-2 undecided", () => {
  const pkg = loadPackage("regression-substring");
  assert.equal(pkg.resolve("--md-ref-size-18", "--md-ref-size-20").status, "confirmed");
  assert.equal(pkg.resolve("--md-ref-size-1", "--md-ref-size-2").status, "undecided");
  assert.equal(pkg.unresolved.length, 1);
});

test("token names are read whole from a sentence", () => {
  const known = new Set(["--md-ref-size-1", "--md-ref-size-18"]);
  assert.deepEqual([...tokensNamedIn("`--md-ref-size-18` and var(--md-ref-size-1).", known)].sort(), [
    "--md-ref-size-1",
    "--md-ref-size-18",
  ]);
  assert.deepEqual([...tokensNamedIn("only `--md-ref-size-18` is named", known)], ["--md-ref-size-18"]);
});

test("a decision cell holding 待確認 is not a decision", () => {
  const pkg = loadPackage("regression-pending-zh");
  assert.equal(pkg.resolve("--md-ref-size-1", "--md-ref-size-2").status, "undecided");
  assert.equal(pkg.resolve("--md-ref-size-18", "--md-ref-size-20").status, "undecided");
  assert.equal(pkg.unresolved.length, 2);
});

test("a merge written only in the suggestion column does not resolve the row", () => {
  const pkg = loadPackage("regression-suggestion-only");
  assert.deepEqual(pkg.pairNames, ["--md-ref-size-15 / --md-ref-size-16"]);
  assert.notEqual(pkg.resolve("--md-ref-size-15", "--md-ref-size-16").status, "confirmed");
});

test("a pair documented only by an a11y-remap comment is resolved", () => {
  const pkg = loadPackage("regression-a11y-remap");
  assert.deepEqual(pkg.pairNames, ["--md-ref-color-green-45 / --md-ref-color-green-44"]);
  const result = pkg.resolve("--md-ref-color-green-45", "--md-ref-color-green-44");
  assert.equal(result.status, "confirmed");
  assert.equal(result.via, "a11y-remap");
});

test("decision cells: pending markers are checked before decision keywords", () => {
  const cases = [
    ["keep distinct", true],
    ["merge into `--md-ref-size-16`", true],
    ["keep distinct（保留區分）", true],
    ["", false],
    ["pending", false],
    ["n/a", false],
    ["待確認", false],
    ["needs review", false],
    ["pending — the AI recommends merge", false],
  ];
  for (const [cell, expected] of cases) {
    assert.equal(holdsDecision(cell), expected, `decision cell ${JSON.stringify(cell)}`);
  }
});

test("existing packages stay compatible: a legacy table row, a prose line and a token-review comment each resolve", () => {
  const pkg = loadPackage("legacy-clean");
  assert.deepEqual(pkg.pairNames, [
    "--md-ref-color-neutral-96 / --md-ref-color-neutral-92",
    "--md-ref-size-12 / --md-ref-size-14",
    "--md-ref-type-13 / --md-ref-type-14",
  ]);
  assert.deepEqual(pkg.resolve("--md-ref-color-neutral-96", "--md-ref-color-neutral-92").via, "row");
  assert.deepEqual(pkg.resolve("--md-ref-size-12", "--md-ref-size-14").via, "line");
  assert.deepEqual(pkg.resolve("--md-ref-type-13", "--md-ref-type-14").via, "token-review");
  assert.equal(pkg.unresolved.length, 0);
});

test("a legacy line that says the decision is pending does not resolve", () => {
  const pkg = loadPackage("legacy-pending-prose");
  assert.deepEqual(pkg.pairNames, ["--md-ref-size-12 / --md-ref-size-14"]);
  assert.equal(pkg.resolve("--md-ref-size-12", "--md-ref-size-14").status, "undecided");
});

// ---------------------------------------------------------------------------
// The review flow: a suggestion is not a decision until someone confirms it.
// ---------------------------------------------------------------------------

test("a row that only carries a suggested action is suggested, not confirmed", () => {
  const pkg = loadPackage("flow-states");
  const result = pkg.resolve("--md-ref-size-10", "--md-ref-size-11");
  assert.equal(result.status, "suggested");
  assert.equal(result.record.suggestion.action, "keep");
  assert.equal(loadPackage("regression-suggestion-only").resolve("--md-ref-size-15", "--md-ref-size-16").status, "suggested");
});

test("a decision without a confirmer is not resolved in the review flow", () => {
  const pkg = loadPackage("flow-states");
  assert.notEqual(pkg.resolve("--md-ref-size-20", "--md-ref-size-21").status, "confirmed");
});

test("a confirmer cell that only says the confirmation is pending names no confirmer", () => {
  const refTokens = parseTokens(":root { --md-ref-size-20: 20px; --md-ref-size-21: 21px; }");
  const table = (confirmedBy) =>
    [
      "## Near Token Decisions",
      "",
      "| Candidates | Provenance | Difference | Suggested action | Decision | Rationale | Confirmed by |",
      "|---|---|---|---|---|---|---|",
      `| \`--md-ref-size-20\` \`--md-ref-size-21\` | measured / measured | 1px | keep distinct | keep distinct | Separate roles. | ${confirmedBy} |`,
    ].join("\n");
  const statusWith = (confirmedBy) =>
    resolvePair(collectDecisionRecords({ architectureDoc: table(confirmedBy), refTokens }), "--md-ref-size-20", "--md-ref-size-21").status;
  for (const waiting of ["", "-", "pending", "pending designer review", "待確認", "n/a"]) {
    assert.equal(statusWith(waiting), "suggested", `Confirmed by "${waiting}"`);
  }
  assert.equal(statusWith("designer via review.html 2026-11-13"), "confirmed");
  assert.equal(statusWith("user in the conversation 2026-11-13"), "confirmed");
});

test("a decision with a confirmer resolves every pair among the row's candidates", () => {
  const pkg = loadPackage("flow-states");
  const result = pkg.resolve("--md-ref-size-30", "--md-ref-size-31");
  assert.equal(result.status, "confirmed");
  assert.equal(result.record.confirmedBy, "designer via review.html 2026-11-13");
  assert.equal(pkg.resolve("--md-ref-size-42", "--md-ref-size-43").status, "confirmed");
  assert.equal(pkg.resolve("--md-ref-size-40", "--md-ref-size-42").status, "confirmed");
});

test("a merged value stays recorded after its token is removed", () => {
  const pkg = loadPackage("flow-states");
  assert.equal(pkg.refTokens.has("--md-ref-size-15"), false);
  const merged = findMergedValues(pkg.records).filter((entry) => entry.values.some((value) => value.value === "15px"));
  assert.equal(merged.length, 1);
  assert.equal(merged[0].into, "--md-ref-size-16");
  assert.deepEqual(merged[0].values, [{ token: "--md-ref-size-15", value: "15px" }]);
  assert.equal(merged[0].status, "confirmed");
});

test("a group with mixed outcomes is recorded as one row per outcome, and each row takes effect", () => {
  const pkg = loadPackage("flow-states");
  const group = ["--md-ref-size-40", "--md-ref-size-41", "--md-ref-size-42", "--md-ref-size-43"];
  const inGroup = pkg.pairs.filter((pair) => group.includes(pair.a) && group.includes(pair.b));
  assert.equal(inGroup.length, 5);
  // The merge row settles 41 against everything; the keep row settles the rest.
  for (const pair of inGroup) assert.equal(pkg.resolve(pair.a, pair.b).status, "confirmed", `${pair.a} / ${pair.b}`);
  assert.equal(pkg.resolve("--md-ref-size-41", "--md-ref-size-40").record.decision.action, "merge");
  assert.equal(pkg.resolve("--md-ref-size-41", "--md-ref-size-40").record.decision.into, "--md-ref-size-40");
  assert.equal(pkg.resolve("--md-ref-size-42", "--md-ref-size-43").record.decision.action, "keep");
});

test("only the unconfirmed groups remain open in the review flow fixture", () => {
  const pkg = loadPackage("flow-states");
  assert.deepEqual(
    pkg.unresolved.map((pair) => `${pair.a} / ${pair.b}`),
    ["--md-ref-size-10 / --md-ref-size-11", "--md-ref-size-20 / --md-ref-size-21"],
  );
});

// ---------------------------------------------------------------------------
// The token audit applies the same rules through its command line.
// ---------------------------------------------------------------------------

function runAudit(script, fixture, ...flags) {
  const scriptPath = path.join(path.dirname(fileURLToPath(import.meta.url)), script);
  const result = spawnSync(process.execPath, [scriptPath, path.join(fixturesDir, fixture), ...flags], { encoding: "utf8" });
  const count = (label) => {
    const match = result.stdout.match(new RegExp(`^${label}: (\\d+)$`, "m"));
    return match ? Number(match[1]) : null;
  };
  return { status: result.status, stdout: result.stdout, count };
}

test("token audit: a pair that only has a suggestion fails strict mode and is reported as awaiting confirmation", () => {
  const audit = runAudit("audit_tokens.mjs", "regression-suggestion-only", "--strict");
  assert.equal(audit.status, 1);
  assert.equal(audit.count("Token review candidates"), 1);
  assert.equal(audit.count("Awaiting designer confirmation"), 1);
  assert.match(audit.stdout, /await designer confirmation: --md-ref-size-15 \(15px\) and --md-ref-size-16 \(16px\)/);
});

test("token audit: the substring regression leaves one candidate and one documented decision", () => {
  const audit = runAudit("audit_tokens.mjs", "regression-substring", "--strict");
  assert.equal(audit.status, 1);
  assert.equal(audit.count("Token review candidates"), 1);
  assert.equal(audit.count("Documented review decisions"), 1);
  assert.match(audit.stdout, /need review: --md-ref-size-1 \(1px\) and --md-ref-size-2 \(2px\)/);
});

test("token audit: the a11y-remap pair is documented", () => {
  const audit = runAudit("audit_tokens.mjs", "regression-a11y-remap", "--strict");
  assert.equal(audit.status, 0);
  assert.equal(audit.count("Token review candidates"), 0);
  assert.equal(audit.count("Documented review decisions"), 1);
});

test("token audit: a package in the earlier format with sound decisions still passes strict mode", () => {
  const audit = runAudit("audit_tokens.mjs", "legacy-clean", "--strict");
  assert.equal(audit.status, 0);
  assert.equal(audit.count("Token review candidates"), 0);
  assert.equal(audit.count("Awaiting designer confirmation"), 0);
  assert.equal(audit.count("Documented review decisions"), 3);
  assert.match(audit.stdout, /Token audit passed\./);
});

test("token audit: without --strict, open pairs are warnings and the audit passes", () => {
  const audit = runAudit("audit_tokens.mjs", "flow-states");
  assert.equal(audit.status, 0);
  assert.equal(audit.count("Token review candidates"), 2);
  assert.equal(audit.count("Awaiting designer confirmation"), 2);
  assert.equal(audit.count("Documented review decisions"), 6);
});

// ---------------------------------------------------------------------------
// Review items: near pairs grouped into decisions, with where each value is used.
// ---------------------------------------------------------------------------

function loadItems(name) {
  const root = path.join(fixturesDir, name);
  const tokens = (layer) => parseTokens(readOptional(path.join(root, "tokens", `tokens-${layer}.css`)) || "");
  const refTokens = tokens("ref");
  const componentsDir = path.join(root, "design-system", "components");
  const componentDocs = fs.existsSync(componentsDir)
    ? fs.readdirSync(componentsDir).filter((file) => file.endsWith(".md")).sort().map((file) => {
        const text = fs.readFileSync(path.join(componentsDir, file), "utf8");
        return { label: componentLabel(text, file), text };
      })
    : [];
  const records = collectDecisionRecords({
    architectureDoc: readOptional(path.join(root, "design-system", "TOKEN_ARCHITECTURE.md")),
    refTokens,
  });
  const usageOf = createUsageLookup({ sysTokens: tokens("sys"), compTokens: tokens("comp"), componentDocs });
  return buildTokenItems({ refTokens, records, usageOf });
}
const shorts = (item) => item.members.map((member) => member.short);

test("near values are grouped into review items: nine pairs become three items", () => {
  const items = loadItems("groups");
  assert.equal(items.length, 3);
  assert.deepEqual(items.map((item) => item.members.length), [3, 6, 2]);
  assert.deepEqual(items.map((item) => item.pairs), [2, 6, 1]);
  assert.deepEqual(items.map((item) => item.kind), ["color", "color", "type"]);
});

test("members are ordered light to dark and small to large, and the item id follows its members", () => {
  const [light, dark, type] = loadItems("groups");
  assert.deepEqual(shorts(light), ["neutral-warm-96", "neutral-warm-92", "neutral-warm-88"]);
  assert.deepEqual(shorts(dark), ["neutral-warm-18", "neutral-warm-15", "neutral-warm-12", "neutral-warm-8", "neutral-warm-5", "neutral-warm-0"]);
  assert.deepEqual(shorts(type), ["type-13", "type-14"]);
  assert.equal(type.id, "tok:--sl-ref-type-13|--sl-ref-type-14");
  assert.equal(light.id, "tok:--sl-ref-color-neutral-warm-88|--sl-ref-color-neutral-warm-92|--sl-ref-color-neutral-warm-96");
});

test("each value shows where it is used: roles, owning components, and unused values", () => {
  const [light, dark] = loadItems("groups");
  const member = (item, short) => item.members.find((entry) => entry.short === short);
  assert.deepEqual(member(light, "neutral-warm-96").roles, ["surface-high"]);
  assert.deepEqual(member(light, "neutral-warm-96").components, ["App Shell"]);
  assert.deepEqual(member(dark, "neutral-warm-15").roles, []);
  assert.deepEqual(member(dark, "neutral-warm-18").roles, ["on-background", "on-surface", "on-surface-high", "on-surface-sunken"]);
  // A component token that no specification lists still counts, without a component name.
  assert.deepEqual(member(light, "neutral-warm-88").components, []);
  assert.equal(member(light, "neutral-warm-88").componentTokenCount, 1);
});

test("dense groups: more than twelve members is dense, twelve is not", () => {
  assert.equal(DENSE_GROUP_THRESHOLD, 12);
  const bySize = new Map(loadItems("dense").map((item) => [item.members.length, item]));
  assert.deepEqual([...bySize.keys()].sort((a, b) => a - b), [12, 13, 113]);
  assert.equal(bySize.get(12).dense, false);
  assert.equal(bySize.get(13).dense, true);
  assert.equal(bySize.get(113).dense, true);
  // Nothing is dropped from a dense group, including the value that is not a whole number.
  assert.ok(bySize.get(113).members.some((member) => member.value === "5.6px"));
});

test("an item's status and outcomes follow the rows that cover it", () => {
  const items = loadItems("flow-states");
  const containing = (short) => items.find((item) => item.origin === "near" && shorts(item).includes(short));

  const suggested = containing("size-10");
  assert.equal(suggested.status, "suggested");
  assert.deepEqual(suggested.suggestion.keep, ["--md-ref-size-10", "--md-ref-size-11"]);
  assert.equal(suggested.recorded, null);

  assert.equal(containing("size-20").status, "suggested");

  const confirmed = containing("size-30");
  assert.equal(confirmed.status, "confirmed");
  assert.equal(confirmed.recorded.confirmedBy, "designer via review.html 2026-11-13");

  const mixed = containing("size-41");
  assert.equal(mixed.status, "confirmed");
  assert.deepEqual(mixed.recorded.merge, { "--md-ref-size-41": "--md-ref-size-40" });
  assert.deepEqual(mixed.recorded.keep, ["--md-ref-size-40", "--md-ref-size-42", "--md-ref-size-43"]);

  const merged = items.find((item) => item.origin === "merged");
  assert.equal(merged.status, "confirmed");
  assert.deepEqual(merged.members.map((member) => [member.value, member.exists]), [["15px", false], ["16px", true]]);
  assert.deepEqual(merged.recorded.merge, { "--md-ref-size-15": "--md-ref-size-16" });
});

test("items that still need someone come before confirmed ones", () => {
  const statuses = loadItems("flow-states").map((item) => item.status);
  assert.deepEqual(statuses, [...statuses].sort((a, b) => ["undecided", "suggested", "confirmed"].indexOf(a) - ["undecided", "suggested", "confirmed"].indexOf(b)));
});

test("a group without any row has no suggestion and is undecided", () => {
  for (const item of loadItems("groups")) {
    assert.equal(item.status, "undecided");
    assert.equal(item.suggestion, null);
  }
});

// ---------------------------------------------------------------------------
// Screenshots and regions for similar-component rows.
// ---------------------------------------------------------------------------

test("regions are read from the xywh fragment of an image reference", () => {
  const base = "assets/component-review/route-stock-1440.png";
  assert.deepEqual(parseImageRegion(`${base}#xywh=percent:9.2,20.5,30.4,4.4`), { unit: "percent", x: 9.2, y: 20.5, width: 30.4, height: 4.4 });
  assert.deepEqual(parseImageRegion(`${base}#xywh=132,246,438,53`), { unit: "pixel", x: 132, y: 246, width: 438, height: 53 });
  assert.deepEqual(parseImageRegion(`${base}#xywh=pixel:132,246,438,53`), { unit: "pixel", x: 132, y: 246, width: 438, height: 53 });
  assert.equal(parseImageRegion(`${base}#xywh=percent:wide`), null);
  assert.equal(parseImageRegion(base), null);
  // A region that leaves the image is not a region.
  assert.equal(parseImageRegion(`${base}#xywh=percent:80,10,30,10`), null);
});

test("the first image of a Visual reference is the candidate side and the second the existing side", () => {
  const cell = "![Chips](assets/component-review/route-stock.png#xywh=percent:9.2,20.5,30.4,4.4) ![Header](assets/component-review/route-stock.png#xywh=pixel:210,12,960,32)";
  const [candidate, existing] = parseVisualReference(cell);
  assert.equal(candidate.alt, "Chips");
  assert.equal(candidate.src, "assets/component-review/route-stock.png");
  assert.equal(candidate.region.unit, "percent");
  assert.equal(existing.alt, "Header");
  assert.deepEqual(regionToFractions(existing.region, { width: 1200, height: 900 }), [0.175, 0.013333, 0.8, 0.035556]);
  assert.deepEqual(regionToFractions(candidate.region, null), [0.092, 0.205, 0.304, 0.044]);
  // Pixels cannot be placed without the natural size.
  assert.equal(regionToFractions(existing.region, null), null);
});

test("the natural size of a screenshot is read from its PNG header", () => {
  const file = path.join(fixturesDir, "legacy-clean", "design-system", "assets", "component-review", "notice-compact.png");
  assert.deepEqual(pngSize(fs.readFileSync(file)), { width: 640, height: 200 });
  assert.equal(pngSize(Buffer.from("not a png")), null);
});

test("component audit: a row with one image and no region still passes strict mode, with a warning", () => {
  const audit = runAudit("audit_components.mjs", "legacy-clean", "--strict");
  assert.equal(audit.status, 0);
  assert.match(audit.stdout, /Component audit passed\./);
  assert.equal(audit.count("Similarity rows without both marked screenshots"), 1);
  assert.match(audit.stdout, /the candidate side \(Compact Notice\) has no region and the existing side \(Notice\) has no screenshot/);
});

// ---------------------------------------------------------------------------
// Interface locale: flag, then the package's recorded report language, then English.
// ---------------------------------------------------------------------------

test("the default interface locale follows the flag, then the recorded report language, then English", () => {
  const record = (text) => (text ? `# Design System Session State\n\n## Current Stage\n\n- Stage: Checkpoint\n- Report Language: ${text}\n` : "# Design System Session State\n\n- Report Language:\n\n## Completed Outputs\n");
  const cases = [
    ["en", "zh-Hant (繁體中文)", "en"],
    [null, "zh-Hant (繁體中文)", "zh-Hant"],
    [null, "zh-Hans (简体中文)", "zh-Hant"],
    [null, "ja (日本語)", "ja"],
    [null, "en (English)", "en"],
    [null, "ko (한국어)", "en"],
    [null, null, "en"],
    ["ko", "ja (日本語)", "ja"],
    ["ko", null, "en"],
  ];
  for (const [flag, language, expected] of cases) {
    const result = resolveLocale({ flag, sessionStateDoc: record(language) });
    assert.equal(result.locale, expected, `flag ${flag}, record ${language}`);
    assert.equal(Boolean(result.warning), flag === "ko", `warning for flag ${flag}`);
  }
  assert.equal(resolveLocale({ flag: null, sessionStateDoc: null }).locale, "en");
  assert.deepEqual(SUPPORTED_LOCALES, ["zh-Hant", "en", "ja"]);
});

test("the report language is read from its own line only", () => {
  assert.equal(readReportLanguage("- Report Language: zh-Hant (繁體中文)"), "zh-Hant");
  assert.equal(readReportLanguage("- Report Language（報告語言）: ja (日本語)"), "ja");
  // An empty record must not pick up a word from the next line.
  assert.equal(readReportLanguage("- Report Language:\n- AI tool / model: en-based runner"), null);
  assert.equal(readReportLanguage(""), null);
});

test("a table with a Suggested action column but no Confirmed by column resolves from its decision column", () => {
  // Seen in a real package written before the review flow: it has nowhere to
  // name a confirmer, so asking for one would fail an audit it used to pass.
  const pkg = loadPackage("legacy-suggested-column");
  assert.equal(pkg.resolve("--md-ref-size-4", "--md-ref-size-6").status, "confirmed");
  assert.equal(pkg.resolve("--md-ref-size-12", "--md-ref-size-14").status, "confirmed");
  // A row whose decision cell is still empty is waiting, with its suggestion on show.
  const open = pkg.resolve("--md-ref-size-24", "--md-ref-size-26");
  assert.equal(open.status, "suggested");
  assert.equal(open.record.suggestion.into, "--md-ref-size-24");
  const audit = runAudit("audit_tokens.mjs", "legacy-suggested-column");
  assert.equal(audit.count("Documented review decisions"), 2);
  assert.equal(audit.count("Awaiting designer confirmation"), 1);
});

test("the previous template's table, with a Confirmed by column but no Suggested action column, resolves from its decision column", () => {
  // Five of the eight real packages checked during this change use this layout.
  // No audit ever read the confirmer there, so whatever the cell holds — the
  // extraction pass naming itself, a note that human review is pending, or
  // nothing — the decision column keeps deciding.
  const pkg = loadPackage("legacy-confirmer-column");
  assert.equal(pkg.resolve("--md-ref-size-4", "--md-ref-size-6").status, "confirmed");
  assert.equal(pkg.resolve("--md-ref-size-12", "--md-ref-size-14").status, "confirmed");
  assert.equal(pkg.resolve("--md-ref-size-24", "--md-ref-size-26").status, "confirmed");
  // A row with no decision is open, and has no suggestion to show: the table has no column for one.
  assert.equal(pkg.resolve("--md-ref-size-40", "--md-ref-size-42").status, "undecided");
  const audit = runAudit("audit_tokens.mjs", "legacy-confirmer-column");
  assert.equal(audit.count("Documented review decisions"), 3);
  assert.equal(audit.count("Token review candidates"), 1);
  assert.equal(audit.count("Awaiting designer confirmation"), 0);
});

test("a raw value that equals the surviving token's own value is not listed as merged into it", () => {
  // Seen in a real package: the row names both observed values as raw values —
  // "6px and 8px, merge into radius-8" — and radius-8 is 8px. Only 6px was merged away.
  const refCss = ":root { --sl-ref-radius-8: 8px; --sl-ref-color-paper-96: #faf7f2; --sl-ref-space-8: 8px; }";
  const architectureDoc = [
    "## Near Token Decisions",
    "",
    "| Candidate tokens | Family | Decision | Rationale |",
    "|---|---|---|---|",
    "| `6px` and `8px` radius candidates | radius | merge into `--sl-ref-radius-8` | Small chips do not need two radii. |",
    "| `#f9f6f1` and `rgb(250 247 242)` paper whites | color | merge into `--sl-ref-color-paper-96` | Scan noise. |",
    "| `7px` and `0.5rem` gaps | space | merge into `--sl-ref-space-8` | One compact gap. |",
  ].join("\n");
  const refTokens = parseTokens(refCss);
  const merged = findMergedValues(collectDecisionRecords({ architectureDoc, refTokens }));
  assert.deepEqual(
    merged.map((entry) => [entry.into, entry.values.map((value) => value.value)]),
    [
      ["--sl-ref-radius-8", ["6px"]],
      ["--sl-ref-color-paper-96", ["#f9f6f1"]],
      ["--sl-ref-space-8", ["7px"]],
    ],
  );
  const items = buildReview({ refCss, architectureDoc }).items.filter((item) => item.origin === "merged");
  assert.deepEqual(
    items.map((item) => item.members.map((member) => [member.value, member.exists])),
    [
      [["6px", false], ["8px", true]],
      [["#faf7f2", true], ["#f9f6f1", false]],
      [["7px", false], ["8px", true]],
    ],
  );
  assert.deepEqual(items[0].recorded.merge, { "raw:6px": "--sl-ref-radius-8" });
});
