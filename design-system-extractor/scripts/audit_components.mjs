#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { groupConnected } from "./lib/token_review.mjs";

// The canonical English keywords for the Component Similarity Review decision cell.
// decisionPattern below also accepts a few synonyms and CJK equivalents, but the
// messages quote this list so authors learn the words the gate is built on.
const COMPONENT_DECISION_KEYWORDS = "merge | make variant | keep distinct | blocked | out-of-scope";

// Status vocabulary accepted without a lint warning: the extractor's own values
// (extracted | planned | blocked | out-of-scope) plus everything
// design-system-to-storybook reads or writes back into the inventory.
const KNOWN_STATUS_WORDS = [
  "extracted",
  "planned",
  "blocked",
  "out-of-scope",
  "ready",
  "queued",
  "in-progress",
  "todo",
  "candidate",
  "deferred",
  "needs-extraction",
  "implementation-derived",
  "brief-derived",
  "needs-review",
  "done",
  "reused",
  "needs-source",
  "needs-token",
  "needs-api-decision",
  "needs-existing-component-review",
];
const knownStatusPattern = new RegExp(`\\b(?:${KNOWN_STATUS_WORDS.join("|")})\\b`, "i");
const extractedStatusPattern = /\bextracted\b/i;
// Specs that design-system-to-storybook drafted from code or a brief carry one of
// these markers; they are not extractor output, so a missing fingerprint stays a warning.
const derivedSpecPattern = /implementation-derived|brief-derived|needs-review/i;

const USAGE = `Usage: node <skill-root>/scripts/audit_components.mjs <target-root> [--strict]

Audits design-system/COMPONENT_INVENTORY.md and design-system/components/*.md:
- inventory Status cells are linted (warning only) against: ${KNOWN_STATUS_WORDS.join(" | ")}
- rows that mention similarity, duplicates or merging need a Component Similarity Review table
- every Component Similarity Review row needs a source-based visual reference (or a labeled
  schematic fallback) and a Developer decision containing one of: ${COMPONENT_DECISION_KEYWORDS}
- every components/*.md should have a "## Component Fingerprint" section

Options:
  --strict    Report problems as issues (exit 1) instead of warnings; also requires at least one
              inventory component row, and a fingerprint section in every spec whose inventory
              Status is extracted (specs marked implementation-derived / brief-derived / needs-review
              are exempt).
  --help, -h  Print this message and exit 0.

Output ends with "Component audit passed." or an "Issues:" list (exit 1).`;

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(USAGE);
  process.exit(0);
}
const strict = args.includes("--strict");
const targetArg = args.find((arg) => !arg.startsWith("--"));
const targetRoot = path.resolve(targetArg || process.cwd());
const designSystemDir = path.join(targetRoot, "design-system");
const inventoryFile = path.join(designSystemDir, "COMPONENT_INVENTORY.md");
const inventoryRel = path.relative(targetRoot, inventoryFile);
const componentDocsDir = path.join(designSystemDir, "components");

const decisionPattern =
  /\b(?:merge|merged|make variant|variant|keep distinct|distinct|blocked|out-of-scope|separate|split)\b|合併|變體|變型|保留|拆開|分開|阻塞|別元件|独立|別コンポーネント|保留|統合|バリアント/i;

const unresolvedPattern =
  /^\s*(?:|[-—]|n\/a|na|none|tbd|todo|pending|open|unknown|needs review|needs decision|待確認|未決|未定|要確認|\?)\s*$/i;

async function readOptional(file) {
  try {
    return await fs.readFile(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function listMarkdownDocs(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => path.join(dir, entry.name))
      .sort((a, b) => a.localeCompare(b));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

function normalizeHeading(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function splitMarkdownRow(line) {
  let trimmed = line.trim();
  if (trimmed.startsWith("|")) trimmed = trimmed.slice(1);
  if (trimmed.endsWith("|")) trimmed = trimmed.slice(0, -1);
  return trimmed.split("|").map((cell) => cell.trim());
}

function isDividerRow(line) {
  return /^\s*\|?[\s:-]+\|[\s|:-]*$/.test(line);
}

function parseTables(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const tables = [];
  let headingStack = [];

  for (let index = 0; index < lines.length; index += 1) {
    const heading = lines[index].match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      headingStack = headingStack.filter((item) => item.level < level);
      headingStack.push({ level, title: heading[2].trim() });
      continue;
    }

    if (
      lines[index].includes("|") &&
      index + 1 < lines.length &&
      isDividerRow(lines[index + 1])
    ) {
      const headers = splitMarkdownRow(lines[index]).map(normalizeHeading);
      const rows = [];
      index += 2;
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        const cells = splitMarkdownRow(lines[index]);
        const row = new Map();
        headers.forEach((header, cellIndex) => {
          row.set(header, cells[cellIndex] || "");
        });
        rows.push({ cells, row, line: index + 1 });
        index += 1;
      }
      index -= 1;
      tables.push({
        heading: headingStack.map((item) => item.title).join(" > "),
        headers,
        rows,
      });
    }
  }

  return tables;
}

function includesHeader(headers, expected) {
  return headers.some((header) => header.includes(expected));
}

function firstValue(row, candidates) {
  for (const candidate of candidates) {
    const foundKey = [...row.keys()].find((key) => key.includes(candidate));
    if (foundKey) return row.get(foundKey) || "";
  }
  return "";
}

function isSimilarityTable(table) {
  const heading = normalizeHeading(table.heading);
  return (
    heading.includes("component similarity review") ||
    (includesHeader(table.headers, "new candidate") &&
      includesHeader(table.headers, "similar") &&
      includesHeader(table.headers, "developer decision"))
  );
}

function isInventoryTable(table) {
  return (
    includesHeader(table.headers, "component") &&
    includesHeader(table.headers, "status") &&
    includesHeader(table.headers, "notes")
  );
}

function isUnresolvedDecision(value) {
  const cleaned = String(value).replace(/<br\s*\/?>/gi, " ").replace(/`/g, "").trim();
  return unresolvedPattern.test(cleaned) || !decisionPattern.test(cleaned);
}

function containsSimilarityCue(value) {
  return /similar|same as|duplicate|variant of|merge|相似|類似|同一|重複|合併|變體|似ている|重複|統合|バリアント/i.test(
    value,
  );
}

function cleanedCell(value) {
  return String(value)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/`/g, "")
    .trim();
}

function hasVisualReference(value) {
  const cleaned = cleanedCell(value);
  return !unresolvedPattern.test(cleaned);
}

function hasSourceBasedPreview(value) {
  const cleaned = cleanedCell(value);
  return (
    /!\[[^\]]*\]\([^)]+\.(?:png|jpe?g|webp|avif|gif)(?:[)#?][^)]*)?\)/i.test(cleaned) ||
    /\[[^\]]+\]\([^)]+\.(?:png|jpe?g|webp|avif|gif)(?:[)#?][^)]*)?\)/i.test(cleaned) ||
    /\.(?:png|jpe?g|webp|avif|gif)(?:\b|[?#)])/i.test(cleaned) ||
    /https?:\/\/(?:www\.)?figma\.com|figma:|figma node|node-id=/i.test(cleaned) ||
    /screenshot crop|截圖|截图|截圖 crop|畫面裁切|画面裁切|スクリーンショット|切り抜き/i.test(
      cleaned,
    )
  );
}

function usesSvgReference(value) {
  return /\.svg(?:\b|[?#)])/i.test(cleanedCell(value));
}

// Keys that connect an inventory Component cell to a components/<name>.md spec:
// the slug of the visible name plus the basename of any linked components/*.md.
function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function componentKeys(cell) {
  const keys = new Set();
  const raw = String(cell);
  for (const match of raw.matchAll(/\(([^)]*components\/)?([^)/]+)\.md\)/gi)) {
    keys.add(slugify(match[2]));
  }
  const visible = cleanedCell(raw)
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[（(][^）)]*[）)]/g, " ");
  const slug = slugify(visible);
  if (slug) keys.add(slug);
  return [...keys];
}

function hasFallbackDisclosure(value) {
  return /schematic fallback|source preview unavailable|source unavailable|preview unavailable|no source preview|no source image|無法取得|无法取得|來源預覽|来源预览|沒有來源|没有来源|備援|备援|示意|非設計稿|非设计稿|プレビュー不可|取得できない|代替/i.test(
    cleanedCell(value),
  );
}

// Similarity rows are grouped by the components they connect (union-find over the
// candidate and similar names), so one candidate compared against several existing
// components reads as one decision instead of several unrelated rows.
function similarityKey(value) {
  return cleanedCell(value || "")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function clusterSimilarityRows(rows) {
  return groupConnected(rows, (row) => [similarityKey(row.candidate), similarityKey(row.similar)]).map(
    (group) => {
      const components = new Set();
      for (const row of group.items) {
        for (const name of [row.candidate, row.similar]) {
          const cleaned = cleanedCell(name || "");
          if (cleaned) components.add(cleaned);
        }
      }
      return {
        components: [...components],
        rows: group.items,
        unresolved: group.items.some((row) => row.unresolved),
      };
    },
  );
}

const issues = [];
const warnings = [];

const inventory = await readOptional(inventoryFile);
const similarityEdges = [];
let similarityRows = 0;
let unresolvedSimilarityRows = 0;
let documentedSimilarityRows = 0;
let sourcePreviewRows = 0;
let fallbackVisualRows = 0;
let missingVisualRows = 0;
let inventoryComponentRows = 0;
let statusLintWarnings = 0;
const extractedComponentKeys = new Set();

if (inventory === null) {
  const message = `Missing ${path.relative(targetRoot, inventoryFile)}`;
  if (strict) issues.push(`Strict mode requires ${message}`);
  else warnings.push(message);
} else {
  const tables = parseTables(inventory);
  const similarityTables = tables.filter(isSimilarityTable);
  const inventoryTables = tables.filter(isInventoryTable);

  for (const table of inventoryTables) {
    for (const entry of table.rows) {
      const component = firstValue(entry.row, ["component"]);
      if (!component || /^[-—]$/.test(component.trim())) continue;
      inventoryComponentRows += 1;
      const notes = firstValue(entry.row, ["notes"]);
      const status = firstValue(entry.row, ["status"]);
      const cleanStatus = cleanedCell(status);
      if (extractedStatusPattern.test(cleanStatus)) {
        for (const key of componentKeys(component)) extractedComponentKeys.add(key);
      }
      // Status lint is advisory in every mode: downstream tools decide what to
      // build from these words, so a typo here would silently drop a component later.
      if (unresolvedPattern.test(cleanStatus)) {
        statusLintWarnings += 1;
        warnings.push(
          `${inventoryRel}:${entry.line}: Status is empty for ${cleanedCell(component)}. Known status keywords: ${KNOWN_STATUS_WORDS.join(" | ")}.`,
        );
      } else if (!knownStatusPattern.test(cleanStatus)) {
        statusLintWarnings += 1;
        warnings.push(
          `${inventoryRel}:${entry.line}: Status "${cleanStatus}" for ${cleanedCell(component)} is not a known status keyword. Known status keywords: ${KNOWN_STATUS_WORDS.join(" | ")} (English keyword first, an annotation in full-width parentheses may follow).`,
        );
      }
      if (containsSimilarityCue(`${status} ${notes}`) && !similarityTables.length) {
        const message = `${inventoryRel}:${entry.line}: Component inventory row mentions similarity or merge review but no Component Similarity Review table exists.`;
        if (strict) issues.push(message);
        else warnings.push(message);
      }
    }
  }

  if (!inventoryComponentRows && strict) {
    issues.push(
      `${inventoryRel}: Strict mode requires at least one inventory component row before the checkpoint; run without --strict (or extract_check.mjs --starter) for an empty starter package.`,
    );
  }

  for (const table of similarityTables) {
    for (const entry of table.rows) {
      const candidate = firstValue(entry.row, ["new candidate", "candidate"]);
      const similar = firstValue(entry.row, ["similar existing", "similar"]);
      const reason = firstValue(entry.row, ["similarity reason", "reason"]);
      const visual = firstValue(entry.row, ["visual reference", "visual"]);
      const decision = firstValue(entry.row, ["developer decision", "decision"]);
      if (!candidate && !similar && !reason) continue;
      similarityRows += 1;
      const fallbackContext = `${visual} ${reason} ${firstValue(entry.row, ["rationale", "owner"])}`;
      if (!hasVisualReference(visual)) {
        missingVisualRows += 1;
        const message = `${inventoryRel}:${entry.line}: Missing visual reference for component similarity review: ${candidate || "candidate"} vs ${similar || "similar component"}. Link a Figma node preview, screenshot crop, or documented fallback.`;
        if (strict) issues.push(message);
        else warnings.push(message);
      } else if (hasSourceBasedPreview(visual)) {
        sourcePreviewRows += 1;
      } else if (usesSvgReference(visual)) {
        fallbackVisualRows += 1;
        if (!hasFallbackDisclosure(fallbackContext)) {
          const message = `${inventoryRel}:${entry.line}: SVG visual reference must be labeled "schematic fallback - source preview unavailable"; do not use AI-drawn SVG as design evidence.`;
          if (strict) issues.push(message);
          else warnings.push(message);
        } else {
          warnings.push(
            `${inventoryRel}:${entry.line}: Similarity review row uses a schematic fallback SVG; prefer a Figma node preview or screenshot crop when available.`,
          );
        }
      } else {
        missingVisualRows += 1;
        const message = `${inventoryRel}:${entry.line}: Visual reference does not identify a Figma preview, screenshot crop, or labeled fallback: ${visual}`;
        if (strict) issues.push(message);
        else warnings.push(message);
      }
      if (isUnresolvedDecision(decision)) {
        unresolvedSimilarityRows += 1;
        const message = `${inventoryRel}:${entry.line}: Unresolved component similarity review: ${candidate || "candidate"} vs ${similar || "similar component"}. Developer decision "${cleanedCell(decision) || "(empty)"}" is not accepted; it must contain one of: ${COMPONENT_DECISION_KEYWORDS} (English keyword first, an annotation in full-width parentheses may follow).`;
        if (strict) issues.push(message);
        else warnings.push(message);
      } else {
        documentedSimilarityRows += 1;
      }
      similarityEdges.push({ candidate, similar, unresolved: isUnresolvedDecision(decision) });
    }
  }
}

const similarityClusters = clusterSimilarityRows(similarityEdges);
const unresolvedSimilarityClusters = similarityClusters.filter((cluster) => cluster.unresolved).length;

const componentDocs = await listMarkdownDocs(componentDocsDir);
let specsMissingFingerprint = 0;
for (const file of componentDocs) {
  const content = await readOptional(file);
  if (!content) continue;
  if (/^##\s+Component Fingerprint\b/im.test(content)) continue;
  specsMissingFingerprint += 1;
  const specRel = path.relative(targetRoot, file);
  const title = content.match(/^#\s+(.+)$/m)?.[1] || "";
  const specKeys = [slugify(path.basename(file, ".md")), ...componentKeys(title)];
  const isExtracted = specKeys.some((key) => extractedComponentKeys.has(key));
  const message = `${specRel}: Component spec is missing a "## Component Fingerprint" section.`;
  // Strict promotes this only for specs the inventory marks as extracted by this
  // skill; drafts written by design-system-to-storybook keep the warning.
  if (strict && isExtracted && !derivedSpecPattern.test(content)) {
    issues.push(
      `${message} The inventory marks this component extracted, so strict mode requires the fingerprint (Purpose / Anatomy / Variants / Token contract / Layout / Visual reference rows).`,
    );
  } else {
    warnings.push(message);
  }
}

const relRoot = path.relative(process.cwd(), targetRoot) || ".";
console.log(`Component audit target: ${relRoot}`);
console.log(`Inventory component rows: ${inventoryComponentRows}`);
console.log(`Component specs: ${componentDocs.length}`);
console.log(`Similarity review rows: ${similarityRows}`);
console.log(`Unresolved similarity rows: ${unresolvedSimilarityRows}`);
console.log(`Documented similarity decisions: ${documentedSimilarityRows}`);
console.log(`Similarity clusters: ${similarityClusters.length}`);
console.log(`Unresolved similarity clusters: ${unresolvedSimilarityClusters}`);
console.log(`Source preview visual rows: ${sourcePreviewRows}`);
console.log(`Fallback visual rows: ${fallbackVisualRows}`);
console.log(`Missing visual rows: ${missingVisualRows}`);
console.log(`Specs missing fingerprint: ${specsMissingFingerprint}`);
console.log(`Status lint warnings: ${statusLintWarnings}`);
console.log(`Strict mode: ${strict ? "on" : "off"}`);

if (warnings.length) {
  console.log("\nWarnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
}

if (issues.length) {
  console.log("\nIssues:");
  for (const issue of issues) console.log(`- ${issue}`);
  process.exit(1);
}

console.log("\nComponent audit passed.");
