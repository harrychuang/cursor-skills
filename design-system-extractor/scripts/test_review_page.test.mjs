// Review generator tests: node --test design-system-extractor/scripts/test_review_page.test.mjs
//
// generate_review_html.mjs has two outputs built from the same data: the page a
// designer works on and the JSON other tools read. These tests hold the two
// together, and hold both to what the audits report, so a number on the page,
// on pipeline-board and in an audit can never mean three different things.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(scriptsDir, "fixtures", "review");
const fixtureNames = fs
  .readdirSync(fixturesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

function run(script, ...args) {
  return spawnSync(process.execPath, [path.join(scriptsDir, script), ...args], { encoding: "utf8" });
}

function reviewJson(fixture) {
  const result = run("generate_review_html.mjs", path.join(fixturesDir, fixture), "--json");
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

function auditCount(script, fixture, label) {
  const result = run(script, path.join(fixturesDir, fixture));
  const match = result.stdout.match(new RegExp(`^${label}: (\\d+)$`, "m"));
  assert.ok(match, `${script} did not print "${label}" for ${fixture}`);
  return Number(match[1]);
}

// Every file under a directory with a hash of its bytes.
function snapshot(dir) {
  const files = new Map();
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else files.set(path.relative(dir, full), crypto.createHash("sha256").update(fs.readFileSync(full)).digest("hex"));
    }
  };
  walk(dir);
  return files;
}

test("machine-readable output: items by status, and the count of items awaiting a designer", () => {
  const { counts, needsReview, items } = reviewJson("mixed-status");
  const statuses = items.map((item) => item.status);
  assert.equal(statuses.filter((status) => status === "suggested").length, 2);
  assert.equal(statuses.filter((status) => status === "undecided").length, 1);
  assert.equal(statuses.filter((status) => status === "confirmed").length, 4);
  assert.equal(counts.items, 7);
  assert.equal(counts.confirmed, 4);
  assert.equal(counts.needsReview, 3);
  assert.equal(needsReview.length, 3);
  assert.deepEqual(
    Object.keys(counts).sort(),
    ["colorScaleIssues", "components", "confirmed", "items", "nearColors", "nearNumbers", "needsReview", "sources", "unresolvedNearPairs"],
  );
});

test("every item carries an identifier, a status and its members or sides", () => {
  const { items } = reviewJson("mixed-status");
  for (const item of items) {
    assert.ok(item.id, "item id");
    assert.ok(["confirmed", "suggested", "undecided", "issue"].includes(item.status), `status of ${item.id}`);
    if (item.section === "tokens") assert.ok(item.members.length >= 2, `members of ${item.id}`);
    if (item.section === "components") assert.equal(item.sides.length, 2, `sides of ${item.id}`);
  }
  const suggested = items.find((item) => item.id === "tok:--md-ref-duration-150|--md-ref-duration-180");
  assert.deepEqual(suggested.suggestion.merge, { "--md-ref-duration-180": "--md-ref-duration-150" });
  assert.equal(suggested.recorded, null);
});

test("the count pipeline-board reads is an integer equal to the awaiting list, on every fixture", () => {
  for (const fixture of fixtureNames) {
    const { counts, needsReview, items } = reviewJson(fixture);
    assert.ok(Number.isInteger(counts.needsReview), `${fixture}: needsReview is an integer`);
    assert.equal(needsReview.length, counts.needsReview, `${fixture}: list length`);
    assert.equal(items.filter((item) => item.status !== "confirmed").length, counts.needsReview, `${fixture}: awaiting items`);
    assert.equal(counts.items, items.length, `${fixture}: item count`);
  }
});

test("one resolution: the review output and the token audit report the same unresolved near pairs", () => {
  for (const fixture of fixtureNames) {
    const { counts } = reviewJson(fixture);
    assert.equal(
      counts.unresolvedNearPairs,
      auditCount("audit_tokens.mjs", fixture, "Token review candidates"),
      `${fixture}: unresolved near pairs`,
    );
  }
});

test("component and source items agree with their audits", () => {
  for (const fixture of ["mixed-status", "legacy-clean"]) {
    const { items } = reviewJson(fixture);
    const open = (section) => items.filter((item) => item.section === section && item.status !== "confirmed").length;
    assert.equal(open("components"), auditCount("audit_components.mjs", fixture, "Unresolved similarity rows"), `${fixture}: components`);
    assert.equal(open("sources"), auditCount("audit_sources.mjs", fixture, "Unresolved duplicate rows"), `${fixture}: sources`);
  }
});

test("the machine-readable mode prints one JSON object and changes no file", () => {
  const fixture = path.join(fixturesDir, "mixed-status");
  const before = snapshot(fixture);
  const result = run("generate_review_html.mjs", fixture, "--json");
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotThrow(() => JSON.parse(result.stdout));
  assert.equal(result.stdout.trimStart()[0], "{");
  assert.deepEqual(snapshot(fixture), before);
});

test("without --json the generator writes the review page and leaves the package alone", () => {
  const fixture = path.join(fixturesDir, "mixed-status");
  const before = snapshot(fixture);
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "ds-review-"));
  try {
    const output = path.join(outDir, "review.html");
    const result = run("generate_review_html.mjs", fixture, output);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(fs.statSync(output).size > 0);
    assert.ok(fs.existsSync(path.join(outDir, "assets", "component-review", "notice-compact.png")));
    assert.deepEqual(snapshot(fixture), before);
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// The page itself.
// ---------------------------------------------------------------------------

function generatePage(fixture) {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "ds-review-page-"));
  const output = path.join(outDir, "review.html");
  const result = run("generate_review_html.mjs", path.join(fixturesDir, fixture), output);
  assert.equal(result.status, 0, result.stderr);
  const html = fs.readFileSync(output, "utf8");
  fs.rmSync(outDir, { recursive: true, force: true });
  return { html, stdout: result.stdout };
}
const stylesheetOf = (html) => html.match(/<style>([\s\S]*?)<\/style>/)[1];
const embeddedData = (html) => JSON.parse(html.match(/const DATA = (\{.*\});\n/)[1]);

test("the review page is one self-contained file: it loads nothing from the network", () => {
  const { html } = generatePage("review-flow");
  assert.doesNotMatch(html, /<link\b/i);
  assert.doesNotMatch(html, /<script[^>]+\bsrc=/i);
  assert.doesNotMatch(html, /@import/i);
  assert.doesNotMatch(html, /\b(?:src|href)\s*=\s*["'](?:https?:)?\/\//i);
  assert.doesNotMatch(html, /url\(\s*["']?(?:https?:)?\/\//i);
  // Screenshots are referenced relative to the page, from the copied assets.
  for (const item of embeddedData(html).items.filter((entry) => entry.sides)) {
    for (const side of item.sides.filter((entry) => entry.image)) assert.match(side.image.src, /^assets\//);
  }
});

test("the page carries the same items and counts as the machine-readable output", () => {
  const { html, stdout } = generatePage("review-flow");
  const data = embeddedData(html);
  const json = reviewJson("review-flow");
  assert.deepEqual(data.counts, json.counts);
  assert.deepEqual(data.items.map((item) => [item.id, item.status]), json.items.map((item) => [item.id, item.status]));
  assert.equal(data.counts.needsReview, 11);
  assert.match(stdout, /^Review items: 11$/m);
  assert.match(stdout, /^Awaiting designer: 11$/m);
  assert.match(data.projectKey, /^review-flow-[0-9a-f]{8}$/);
});

test("a value that would end the script element early is escaped", () => {
  const { html } = generatePage("review-flow");
  const script = html.slice(html.indexOf("const DATA = "), html.indexOf("\n", html.indexOf("const DATA = ")));
  assert.doesNotMatch(script, /</);
});

test("house rules: no gradient, no backdrop blur, no text under 12px, and cards without an outline", () => {
  const css = stylesheetOf(generatePage("mixed-status").html);
  assert.doesNotMatch(css, /gradient\(/i);
  assert.doesNotMatch(css, /backdrop-filter/i);
  const sizes = [
    ...[...css.matchAll(/font-size:\s*([\d.]+)px/g)].map((match) => Number(match[1])),
    // In the font shorthand the first pixel value is the size.
    ...[...css.matchAll(/font:\s*[^;{}]*?([\d.]+)px/g)].map((match) => Number(match[1])),
  ];
  assert.ok(sizes.length > 20, "font sizes were found");
  assert.ok(Math.min(...sizes) >= 12, `smallest font size is ${Math.min(...sizes)}px`);
  const cardRule = css.match(/\n\s*\.card \{([^}]*)\}/)[1];
  assert.doesNotMatch(cardRule, /outline|border(?!-radius)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /:focus-visible \{[^}]*outline/);
});

test("a missing page template stops generation and names the missing path", () => {
  // The generator looks for its template beside itself, so a copy without the
  // assets folder is a generator whose template is missing.
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "ds-review-sandbox-"));
  try {
    fs.mkdirSync(path.join(sandbox, "scripts"));
    for (const file of ["generate_review_html.mjs", "review_core.mjs"]) {
      fs.copyFileSync(path.join(scriptsDir, file), path.join(sandbox, "scripts", file));
    }
    const output = path.join(sandbox, "out", "review.html");
    const result = spawnSync(
      process.execPath,
      [path.join(sandbox, "scripts", "generate_review_html.mjs"), path.join(fixturesDir, "mixed-status"), output],
      { encoding: "utf8" },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Review page template not found: .*review\.template\.html/);
    assert.equal(fs.existsSync(output), false);
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
});

test("a package with nothing to review still gets a page", () => {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "ds-review-empty-"));
  try {
    const output = path.join(sandbox, "docs", "review.html");
    const result = run("generate_review_html.mjs", sandbox, output);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(embeddedData(fs.readFileSync(output, "utf8")).counts.items, 0);
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
});

test("the page never opens a screenshot in a new tab or window", () => {
  const { html } = generatePage("review-flow");
  assert.doesNotMatch(html, /target\s*=\s*["']?_blank/i);
  assert.doesNotMatch(html, /window\.open\(/);
  // The screenshot is a button that opens the in-page viewer, not a link to the file.
  assert.match(html, /data-act="zoom"/);
  assert.match(html, /id="viewer" role="dialog" aria-modal="true"/);
});

test("both sides of a similar-component item reach the page with their regions as fractions of the image", () => {
  const { html } = generatePage("review-flow");
  const [first, oneSided] = embeddedData(html).items.filter((item) => item.section === "components");
  assert.deepEqual(first.sides.map((side) => side.key), ["A", "B"]);
  assert.deepEqual(first.sides[0].image, { src: "assets/component-review/route-market.png", alt: "Market route", w: 1200, h: 700 });
  assert.deepEqual(first.sides[0].marks, [{ rect: [0.033333, 0.314286, 0.12, 0.428571] }]);
  assert.deepEqual(first.sides[1].marks, [{ rect: [0.546667, 0.348889, 0.236667, 0.035556] }]);
  // A row that records a single image has no screenshot for the existing side.
  assert.equal(oneSided.sides[1].image, null);
  assert.deepEqual(oneSided.sides[1].marks, []);
});

// ---------------------------------------------------------------------------
// Interface locale of the generated pages.
// ---------------------------------------------------------------------------

// A copy of a fixture package, optionally with a recorded report language.
function packageCopy(fixture, reportLanguage) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ds-review-locale-"));
  fs.cpSync(path.join(fixturesDir, fixture), root, { recursive: true });
  if (reportLanguage) {
    fs.writeFileSync(
      path.join(root, "design-system", "SESSION_STATE.md"),
      `# Design System Session State\n\n## Current Stage\n\n- Stage: Checkpoint\n- Report Language: ${reportLanguage}\n`,
    );
  }
  return root;
}
const reviewLocale = (html) => embeddedData(html).defaultLocale;
const docsLocale = (html) => html.match(/<html lang="([^"]+)"/)[1];

test("both generators default to the package's recorded report language, and to English without one", () => {
  for (const [language, expected] of [["zh-Hant (繁體中文)", "zh-Hant"], ["ja (日本語)", "ja"], [null, "en"]]) {
    const root = packageCopy("mixed-status", language);
    try {
      const review = run("generate_review_html.mjs", root, path.join(root, "out", "review.html"));
      const docs = run("generate_docs_html.mjs", root, path.join(root, "out", "index.html"));
      assert.equal(review.status, 0, review.stderr);
      assert.equal(docs.status, 0, docs.stderr);
      assert.equal(reviewLocale(fs.readFileSync(path.join(root, "out", "review.html"), "utf8")), expected, `review page, record ${language}`);
      assert.equal(docsLocale(fs.readFileSync(path.join(root, "out", "index.html"), "utf8")), expected, `docs page, record ${language}`);
      assert.equal(review.stderr, "");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
});

test("a supported --locale value wins over the recorded language", () => {
  const root = packageCopy("mixed-status", "zh-Hant (繁體中文)");
  try {
    for (const flag of [["--locale", "en"], ["--locale=en"]]) {
      const review = run("generate_review_html.mjs", root, path.join(root, "out", "review.html"), ...flag);
      const docs = run("generate_docs_html.mjs", root, path.join(root, "out", "index.html"), ...flag);
      assert.equal(reviewLocale(fs.readFileSync(path.join(root, "out", "review.html"), "utf8")), "en");
      assert.equal(docsLocale(fs.readFileSync(path.join(root, "out", "index.html"), "utf8")), "en");
      assert.equal(review.status + docs.status, 0);
    }
    // The flag's value is never mistaken for the output path.
    assert.equal(fs.existsSync(path.join(root, "en")), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("an unsupported --locale value warns, falls back to the package's language, and still succeeds", () => {
  const root = packageCopy("mixed-status", "ja (日本語)");
  try {
    for (const script of ["generate_review_html.mjs", "generate_docs_html.mjs"]) {
      const output = path.join(root, "out", script.replace(".mjs", ".html"));
      const result = run(script, root, output, "--locale", "ko");
      assert.equal(result.status, 0, `${script} exit status`);
      assert.match(result.stderr, /Unsupported --locale value "ko"\. Supported values: zh-Hant, en, ja\. Using "ja"\./, script);
      const html = fs.readFileSync(output, "utf8");
      assert.equal(script.startsWith("generate_review") ? reviewLocale(html) : docsLocale(html), "ja", script);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// The interface strings of the review page, read out of the template.
function reviewCopy() {
  const template = fs.readFileSync(path.join(scriptsDir, "..", "assets", "review-page", "review.template.html"), "utf8");
  const start = template.indexOf("const COPY = {");
  const end = template.indexOf("\n};\n", start) + 3;
  assert.ok(start > -1 && end > start, "COPY block found in the template");
  return new Function(`${template.slice(start, end)}\nreturn COPY;`)();
}
// The shape of a string table: its keys, and for each entry whether it is
// text, a list of a given length, or a function of a given number of arguments.
function shape(value) {
  if (Array.isArray(value)) return `list of ${value.length}`;
  if (typeof value === "function") return `function of ${value.length}`;
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, shape(value[key])]));
  return typeof value;
}

test("the review page offers zh-Hant, en and ja with exactly the same interface strings", () => {
  const copy = reviewCopy();
  assert.deepEqual(Object.keys(copy), ["zh-Hant", "en", "ja"]);
  assert.deepEqual(shape(copy["zh-Hant"]), shape(copy.en));
  assert.deepEqual(shape(copy.ja), shape(copy.en));
  for (const [code, strings] of Object.entries(copy)) assert.equal(strings.htmlLang, code);
});

test("the token section lead says only what the section holds", () => {
  const copy = reviewCopy();
  assert.equal(
    copy.en.leads.tokens(9, 3, 2, 0),
    "Tokens whose values are very close. Compared pair by pair that is 9 questions; here they are grouped into 3 decisions. Checked means keep; unchecked values merge into the closest kept one. 2 earlier merges stay listed, so a merged value can be brought back as its own token.",
  );
  assert.equal(copy.en.leads.tokens(0, 0, 1, 0), "1 earlier merge stays listed, so a merged value can be brought back as its own token.");
  assert.equal(copy.en.leads.tokens(0, 0, 0, 1), "1 pair of color steps is in the wrong order; the AI can fix it.");
  assert.match(copy.en.leads.tokens(1, 1, 0, 0), /that is 1 question; here they are grouped into 1 decision\./);
  for (const strings of Object.values(copy)) {
    // A section with only earlier merges, or only scale-order issues, never talks about zero pairs.
    assert.doesNotMatch(strings.leads.tokens(0, 0, 2, 0), /\b0\b/);
    assert.doesNotMatch(strings.leads.tokens(0, 0, 0, 2), /\b0\b/);
    assert.match(strings.leads.tokens(9, 3, 2, 1), /9.*3.*2.*1/s);
  }
});

// ---------------------------------------------------------------------------
// One whole review cycle, without the browser: what the package looks like
// before the designer confirms, and after the Review Decision Apply Pass has
// applied a confirmed merge the way the exported prompt instructs.
// ---------------------------------------------------------------------------

test("a confirmed merge, once applied and recorded, passes the strict audits and stays on the page as a merged value", () => {
  const pkg = fs.mkdtempSync(path.join(os.tmpdir(), "ds-review-cycle-"));
  try {
    fs.cpSync(path.join(fixturesDir, "regression-suggestion-only"), pkg, { recursive: true });
    const audit = (name) => run(`audit_${name}.mjs`, pkg, "--strict");
    const review = () => JSON.parse(run("generate_review_html.mjs", pkg, "--json").stdout);

    // Before: the AI's suggestion is waiting, and that alone fails the strict token audit.
    assert.equal(audit("tokens").status, 1);
    assert.match(audit("tokens").stdout, /^Awaiting designer confirmation: 1$/m);
    const before = review();
    assert.equal(before.counts.needsReview, 1);
    assert.equal(before.items[0].status, "suggested");
    const [[from, into]] = Object.entries(before.items[0].suggestion.merge);
    assert.deepEqual([from, into], ["--md-ref-size-15", "--md-ref-size-16"]);

    // The apply pass: repoint the system roles, remove the merged reference
    // token, and record the decision with the confirmer in the row.
    const confirmer = "designer via review.html 2026-11-13";
    const edit = (file, change) => fs.writeFileSync(path.join(pkg, file), change(fs.readFileSync(path.join(pkg, file), "utf8")));
    edit("tokens/tokens-sys.css", (text) => text.split(`var(${from})`).join(`var(${into})`));
    edit("tokens/tokens-ref.css", (text) => text.split("\n").filter((line) => !line.trim().startsWith(`${from}:`)).join("\n"));
    edit("design-system/TOKEN_ARCHITECTURE.md", (text) =>
      text
        .split("\n")
        .map((line) => {
          if (!line.startsWith("|") || !line.includes(`\`${from}\``)) return line;
          const cells = line.split("|");
          cells[5] = ` merge into \`${into}\` `;
          cells[7] = ` ${confirmer} `;
          return cells.join("|");
        })
        .join("\n"),
    );

    // After: every strict audit passes and nothing waits for the designer.
    for (const name of ["sources", "tokens", "components"]) {
      const result = audit(name);
      assert.equal(result.status, 0, `${name}: ${result.stdout}${result.stderr}`);
    }
    const after = review();
    assert.equal(after.counts.needsReview, 0);
    assert.deepEqual(after.needsReview, []);
    // The merged value is gone from the token file and still on record, with who confirmed it.
    assert.equal(after.items.length, 1);
    const [item] = after.items;
    assert.equal(item.origin, "merged");
    assert.equal(item.status, "confirmed");
    assert.deepEqual(item.members.map((member) => [member.value, member.exists]), [["15px", false], ["16px", true]]);
    assert.deepEqual(item.recorded.merge, { [from]: into });
    assert.equal(item.recorded.confirmedBy, confirmer);
  } finally {
    fs.rmSync(pkg, { recursive: true, force: true });
  }
});
