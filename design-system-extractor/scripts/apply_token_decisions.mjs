#!/usr/bin/env node

// Writes near-token decisions into design-system/TOKEN_ARCHITECTURE.md one tier at a
// time, so the auto tier never needs a human and the proposal tier is one batch.
// Clusters come from scripts/lib/token_review.mjs, the same module the audit uses.

import fs from "node:fs/promises";
import path from "node:path";
import {
  DECISION_TABLE_DIVIDER,
  DECISION_TABLE_HEADER,
  TIERS,
  decisionRowMarkdown,
  loadTokenPackage,
} from "./lib/token_review.mjs";

const USAGE = `Usage: node <skill-root>/scripts/apply_token_decisions.mjs <target-root> --tier <auto|proposal|must-ask> [options]

Recomputes the near-token clusters for <target-root>, selects the non-canonical members of
the requested tier that have no documented decision yet, and appends one row per member to
the Near Token Decisions table in design-system/TOKEN_ARCHITECTURE.md (member, provenance,
canonical, provenance, distance with tier, decision, rule with cluster id, confirmed by).
Members that already have a decision are skipped, so re-running writes nothing new.

Tiers:
  auto        merge rows confirmed by "auto-tier" (measured below JND, or measured snapping
              into an authored value); no confirmer needed
  proposal    the proposed decision of each member; requires --confirmed-by
  must-ask    requires --only <canonical>, --decision and --confirmed-by

Options:
  --tier <t>            auto | proposal | must-ask (required)
  --only <names>        comma-separated canonical token names; limits to those clusters
  --keep <names>        comma-separated members to record as "keep distinct" (proposal tier)
  --merge <names>       comma-separated members to record as "merge" (proposal tier)
  --decision <d>        merge | keep-distinct (must-ask tier)
  --confirmed-by <who>  the developer who confirmed the batch
  --rewrite-css         for each merge row: rewrite var(<member>) to var(<canonical>) in
                        tokens-ref.css, tokens-sys.css and tokens-comp.css and remove the
                        member's declaration line from tokens-ref.css
  --dry-run             print the rows and change no file
  --json                print one JSON object {tier, written, skipped, rows, rewrite}
  --help, -h            print this message and exit 0

Exit codes: 0 done (even when nothing was written), 1 missing TOKEN_ARCHITECTURE.md, 2 bad usage.`;

const VALUE_OPTIONS = new Set(["--tier", "--only", "--keep", "--merge", "--decision", "--confirmed-by"]);
const FLAG_OPTIONS = new Set(["--rewrite-css", "--dry-run", "--json", "--help", "-h"]);

function fail(message) {
  console.error(message);
  console.error("Run with --help for usage.");
  process.exit(2);
}

function parseArgs(argv) {
  const options = { only: [], keep: [], merge: [] };
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      console.log(USAGE);
      process.exit(0);
    }
    if (FLAG_OPTIONS.has(arg)) {
      options[arg.slice(2).replace(/-([a-z])/g, (_match, char) => char.toUpperCase())] = true;
      continue;
    }
    if (VALUE_OPTIONS.has(arg)) {
      // Token names start with "--", so only a known option name counts as "no value".
      const value = argv[index + 1];
      if (value === undefined || VALUE_OPTIONS.has(value) || FLAG_OPTIONS.has(value)) {
        fail(`Option ${arg} needs a value.`);
      }
      index += 1;
      const key = arg.slice(2).replace(/-([a-z])/g, (_match, char) => char.toUpperCase());
      if (["only", "keep", "merge"].includes(key)) {
        options[key].push(...value.split(",").map((item) => item.trim()).filter(Boolean));
      } else {
        options[key] = value;
      }
      continue;
    }
    if (arg.startsWith("--")) fail(`Unknown option "${arg}".`);
    positional.push(arg);
  }
  return { options, positional };
}

const { options, positional } = parseArgs(process.argv.slice(2));
if (!positional.length) fail("Missing <target-root>.");
if (positional.length > 1) fail(`Unexpected argument "${positional[1]}".`);
const targetRoot = path.resolve(positional[0]);
const tier = options.tier;
if (!tier) fail("Missing --tier <auto|proposal|must-ask>.");
if (!TIERS.includes(tier)) fail(`Unknown --tier "${tier}"; expected one of ${TIERS.join(" | ")}.`);
if (tier !== "auto" && !options.confirmedBy) {
  fail(`--tier ${tier} requires --confirmed-by <who> because a developer must confirm these rows.`);
}
if (tier === "must-ask") {
  if (!options.decision) fail("--tier must-ask requires --decision merge|keep-distinct.");
  if (!options.only.length) fail("--tier must-ask requires --only <canonical> so each cluster is decided explicitly.");
}
if (options.decision && !["merge", "keep-distinct"].includes(options.decision)) {
  fail(`Unknown --decision "${options.decision}"; expected merge or keep-distinct.`);
}

const pkg = await loadTokenPackage(targetRoot);
const architectureRel = path.relative(targetRoot, pkg.files.architecture);
if (pkg.architectureDoc === null) {
  console.error(
    `Missing ${architectureRel}. Copy design-system/TOKEN_ARCHITECTURE.md from the design-system template first; decisions are recorded there.`,
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Select the members to record.

const rows = [];
const skipped = [];
for (const cluster of pkg.clusters) {
  if (options.only.length && !options.only.includes(cluster.canonical.name)) continue;
  for (const member of cluster.members) {
    if (member.documented) {
      skipped.push({ member: member.name, canonical: cluster.canonical.name, reason: "documented" });
      continue;
    }
    if (member.tier !== tier) {
      skipped.push({ member: member.name, canonical: cluster.canonical.name, reason: `tier ${member.tier}` });
      continue;
    }
    let decision;
    if (tier === "auto") decision = "merge";
    else if (tier === "proposal") {
      if (options.keep.includes(member.name)) decision = "keep distinct";
      else if (options.merge.includes(member.name)) decision = "merge";
      else decision = member.proposed;
    } else decision = options.decision === "keep-distinct" ? "keep distinct" : "merge";
    const confirmedBy = tier === "auto" ? options.confirmedBy || "auto-tier" : options.confirmedBy;
    rows.push({
      cluster,
      member,
      decision,
      confirmedBy,
      markdown: decisionRowMarkdown({ cluster, member, decision, confirmedBy }),
    });
  }
}

// ---------------------------------------------------------------------------
// Insert rows into the Near Token Decisions table.

function insertRows(document, markdownRows) {
  const lines = document.replace(/\r\n/g, "\n").split("\n");
  const headingIndex = lines.findIndex((line) => /^##\s+Near Token Decisions\b/i.test(line));
  if (headingIndex === -1) {
    const trimmed = lines.join("\n").replace(/\s+$/, "");
    return `${trimmed}\n\n## Near Token Decisions\n\n${DECISION_TABLE_HEADER}\n${DECISION_TABLE_DIVIDER}\n${markdownRows.join("\n")}\n`;
  }
  let sectionEnd = lines.length;
  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    if (/^##\s/.test(lines[index])) {
      sectionEnd = index;
      break;
    }
  }
  let dividerIndex = -1;
  for (let index = headingIndex + 1; index < sectionEnd; index += 1) {
    if (/^\|?\s*:?-{3,}/.test(lines[index]) && lines[index].includes("|") && index > 0 && lines[index - 1].includes("|")) {
      dividerIndex = index;
      break;
    }
  }
  if (dividerIndex === -1) {
    // Heading without a table: add the template table at the end of the section.
    let insertAt = sectionEnd;
    while (insertAt > headingIndex + 1 && !lines[insertAt - 1].trim()) insertAt -= 1;
    const block = ["", DECISION_TABLE_HEADER, DECISION_TABLE_DIVIDER, ...markdownRows, ""];
    lines.splice(insertAt, 0, ...block);
    return lines.join("\n");
  }
  let lastRow = dividerIndex;
  while (lastRow + 1 < sectionEnd && lines[lastRow + 1].trim().startsWith("|")) lastRow += 1;
  lines.splice(lastRow + 1, 0, ...markdownRows);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Optional CSS rewrite for merge rows.

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function rewriteCss(mergeRows) {
  const report = { references: 0, removed: 0, notFound: [], files: [] };
  const texts = { ref: pkg.css.ref, sys: pkg.css.sys, comp: pkg.css.comp };
  for (const { cluster, member } of mergeRows) {
    const memberName = member.name;
    const canonicalName = cluster.canonical.name;
    if (memberName === canonicalName) {
      report.notFound.push({ member: memberName, reason: "member and canonical share a name" });
      continue;
    }
    const declarationPattern = new RegExp(`^[ \\t]*${escapeRegExp(memberName)}[ \\t]*:[^\\n]*\\n?`, "m");
    if (!texts.ref || !declarationPattern.test(texts.ref)) {
      report.notFound.push({ member: memberName, reason: "declaration not found in tokens-ref.css" });
      continue;
    }
    texts.ref = texts.ref.replace(declarationPattern, "");
    report.removed += 1;
    const referencePattern = new RegExp(`var\\(\\s*${escapeRegExp(memberName)}\\s*(?=[,)])`, "g");
    for (const layer of ["ref", "sys", "comp"]) {
      if (!texts[layer]) continue;
      texts[layer] = texts[layer].replace(referencePattern, () => {
        report.references += 1;
        return `var(${canonicalName}`;
      });
    }
  }
  for (const layer of ["ref", "sys", "comp"]) {
    if (texts[layer] !== null && texts[layer] !== pkg.css[layer]) {
      report.files.push({ file: pkg.files[layer], content: texts[layer] });
    }
  }
  return report;
}

const mergeRows = rows.filter((row) => row.decision === "merge");
const rewrite = options.rewriteCss ? rewriteCss(mergeRows) : null;

if (!options.dryRun) {
  if (rows.length) {
    const updated = insertRows(pkg.architectureDoc, rows.map((row) => row.markdown));
    await fs.writeFile(pkg.files.architecture, updated, "utf8");
  }
  if (rewrite) {
    for (const { file, content } of rewrite.files) await fs.writeFile(file, content, "utf8");
  }
}

// ---------------------------------------------------------------------------
// Report.

const relRoot = path.relative(process.cwd(), targetRoot) || ".";
if (options.json) {
  console.log(
    JSON.stringify(
      {
        tier,
        written: rows.length,
        skipped,
        rows: rows.map((row) => ({
          member: row.member.name,
          canonical: row.cluster.canonical.name,
          cluster: row.cluster.id,
          decision: row.decision,
          confirmedBy: row.confirmedBy,
          markdown: row.markdown,
        })),
        rewrite: rewrite
          ? { references: rewrite.references, removed: rewrite.removed, notFound: rewrite.notFound, files: rewrite.files.map((entry) => path.relative(targetRoot, entry.file)) }
          : null,
        dryRun: Boolean(options.dryRun),
      },
      null,
      2,
    ),
  );
} else {
  console.log(`Apply token decisions: ${relRoot}`);
  console.log(`Tier: ${tier}`);
  console.log(`Rows written: ${rows.length}${options.dryRun ? " (dry run)" : ""}`);
  for (const row of rows) console.log(`- ${row.markdown}`);
  const documentedSkips = skipped.filter((entry) => entry.reason === "documented").length;
  console.log(`Skipped: ${skipped.length} (documented ${documentedSkips}, other tiers ${skipped.length - documentedSkips})`);
  if (rewrite) {
    console.log(
      `CSS rewrite: ${rewrite.references} reference(s) rewritten, ${rewrite.removed} declaration(s) removed${options.dryRun ? " (dry run)" : ""}`,
    );
    for (const entry of rewrite.notFound) console.log(`- not rewritten: ${entry.member} (${entry.reason})`);
  }
  if (options.dryRun) console.log("Dry run: no files changed.");
  else if (rows.length) console.log(`Updated ${architectureRel}.`);
}
