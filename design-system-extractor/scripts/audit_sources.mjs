#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const targetArg = args.find((arg) => !arg.startsWith("--"));
const targetRoot = path.resolve(targetArg || process.cwd());
const designSystemDir = path.join(targetRoot, "design-system");
const evidenceMapFile = path.join(designSystemDir, "DESIGN_EVIDENCE_MAP.md");

const decisionPattern =
  /\b(?:reuse existing source|reuse existing|reuse source|ignore duplicate|dedupe|deduplicate|same source|duplicate accepted|keep distinct|distinct|separate|split|blocked|out-of-scope|merge|merged)\b|重用|沿用|忽略重複|忽略重复|同一來源|同一来源|重複來源|重复来源|合併|合并|保留|拆開|拆开|分開|分开|阻塞|統合|別ソース|同一ソース|バリアント/i;

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

function cleanCell(value) {
  return String(value)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/`/g, "")
    .trim();
}

function isEmptyCell(value) {
  return unresolvedPattern.test(cleanCell(value));
}

function isUnresolvedDecision(value) {
  const cleaned = cleanCell(value);
  return unresolvedPattern.test(cleaned) || !decisionPattern.test(cleaned);
}

function normalizeKey(value) {
  return cleanCell(value)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSearchText(value) {
  return cleanCell(value)
    .toLowerCase()
    .replace(/[^a-z0-9:#/._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractFingerprintKeys(value) {
  const cleaned = cleanCell(value);
  if (isEmptyCell(cleaned)) return [];
  return cleaned
    .split(/(?:<br\s*\/?>|\n|;|,)+/i)
    .map(normalizeKey)
    .filter(Boolean)
    .filter((key) => !unresolvedPattern.test(key));
}

function sourceKeyFor(row) {
  const type = firstValue(row, ["type"]);
  const source = firstValue(row, ["path url node", "path", "url", "node"]);
  const state = firstValue(row, ["screen or state", "state", "screen"]);
  if (isEmptyCell(type) || isEmptyCell(source)) return "";
  const key = normalizeKey(`${type} ${source} ${state}`);
  return unresolvedPattern.test(key) ? "" : key;
}

function isSourceInventoryTable(table) {
  const heading = normalizeHeading(table.heading);
  return (
    heading.includes("source inventory") ||
    (includesHeader(table.headers, "source id") &&
      includesHeader(table.headers, "type") &&
      (includesHeader(table.headers, "path") ||
        includesHeader(table.headers, "url") ||
        includesHeader(table.headers, "node")))
  );
}

function isSourceDuplicateTable(table) {
  const heading = normalizeHeading(table.heading);
  return (
    heading.includes("source duplicate review") ||
    (includesHeader(table.headers, "candidate") &&
      includesHeader(table.headers, "duplicate") &&
      includesHeader(table.headers, "developer decision"))
  );
}

function addGroup(groups, key, entry, source) {
  if (!key) return;
  const group = groups.get(key) || { key, entries: [] };
  group.entries.push({ entry, source });
  groups.set(key, group);
}

function rowText(entry) {
  return entry.cells.join(" ");
}

function reviewMentionsGroup(reviewRows, group) {
  const sourceIds = group.entries.map(({ source }) => source.id).filter(Boolean);
  const haystacks = reviewRows.map((entry) => normalizeSearchText(rowText(entry)));
  const needles = [group.key, ...sourceIds].map(normalizeSearchText).filter(Boolean);
  return haystacks.some((haystack) => needles.some((needle) => haystack.includes(needle)));
}

const issues = [];
const warnings = [];

const evidenceMap = await readOptional(evidenceMapFile);
let sourceInventoryRows = 0;
let sourcesWithFingerprint = 0;
let sourcesMissingFingerprint = 0;
let duplicateReviewRows = 0;
let unresolvedDuplicateRows = 0;
let documentedDuplicateRows = 0;
let repeatedFingerprintGroups = 0;
let repeatedSourceKeyGroups = 0;

if (evidenceMap === null) {
  const message = `Missing ${path.relative(targetRoot, evidenceMapFile)}`;
  if (strict) issues.push(`Strict mode requires ${message}`);
  else warnings.push(message);
} else {
  const tables = parseTables(evidenceMap);
  const inventoryTables = tables.filter(isSourceInventoryTable);
  const duplicateTables = tables.filter(isSourceDuplicateTable);
  const duplicateRows = duplicateTables.flatMap((table) => table.rows);

  if (!inventoryTables.length) {
    const message = "DESIGN_EVIDENCE_MAP.md is missing a Source Inventory table.";
    if (strict) issues.push(message);
    else warnings.push(message);
  }

  const fingerprintGroups = new Map();
  const sourceKeyGroups = new Map();

  for (const table of inventoryTables) {
    const hasFingerprintColumn = includesHeader(table.headers, "fingerprint");
    if (!hasFingerprintColumn && table.rows.length) {
      const message =
        "Source Inventory is missing a Source fingerprint column; exact duplicate screenshots or Figma nodes cannot be audited reliably.";
      if (strict) issues.push(message);
      else warnings.push(message);
    }

    for (const entry of table.rows) {
      const id = firstValue(entry.row, ["source id", "id"]);
      const type = firstValue(entry.row, ["type"]);
      const source = firstValue(entry.row, ["path url node", "path", "url", "node"]);
      if (!id && !type && !source) continue;

      sourceInventoryRows += 1;
      if (isEmptyCell(id) || isEmptyCell(type) || isEmptyCell(source)) {
        const message = `Source Inventory row ${entry.line} should include Source ID, Type, and Path / URL / Node.`;
        if (strict) issues.push(message);
        else warnings.push(message);
      }

      const fingerprint = firstValue(entry.row, ["source fingerprint", "fingerprint"]);
      const fingerprintKeys = extractFingerprintKeys(fingerprint);
      if (fingerprintKeys.length) {
        sourcesWithFingerprint += 1;
        for (const key of fingerprintKeys) {
          addGroup(fingerprintGroups, key, entry, { id, type, source });
        }
      } else {
        sourcesMissingFingerprint += 1;
        const message = `Source Inventory row ${entry.line} is missing a source fingerprint for ${id || source || "source"}.`;
        if (strict) issues.push(message);
        else warnings.push(message);
      }

      addGroup(sourceKeyGroups, sourceKeyFor(entry.row), entry, { id, type, source });
    }
  }

  if (!sourceInventoryRows && strict) {
    issues.push("Strict mode requires at least one Source Inventory row before extraction decisions are finalized.");
  }

  for (const table of duplicateTables) {
    for (const entry of table.rows) {
      const candidate = firstValue(entry.row, ["candidate source", "candidate", "new source", "source a"]);
      const duplicate = firstValue(entry.row, ["duplicate of", "existing source", "duplicate", "source b"]);
      const matchType = firstValue(entry.row, ["match type", "match"]);
      const fingerprint = firstValue(entry.row, ["fingerprint", "normalized key", "key"]);
      const decision = firstValue(entry.row, ["developer decision", "decision"]);
      if (!candidate && !duplicate && !matchType && !fingerprint && !decision) continue;

      duplicateReviewRows += 1;

      if (!candidate || !duplicate) {
        const message = `Source Duplicate Review row ${entry.line} should name both the candidate source and the existing duplicate source.`;
        if (strict) issues.push(message);
        else warnings.push(message);
      }

      if (!matchType && !fingerprint) {
        const message = `Source Duplicate Review row ${entry.line} should record a match type or fingerprint/normalized key.`;
        if (strict) issues.push(message);
        else warnings.push(message);
      }

      if (isUnresolvedDecision(decision)) {
        unresolvedDuplicateRows += 1;
        const message = `Unresolved source duplicate review at row ${entry.line}: ${candidate || "candidate"} vs ${duplicate || "duplicate source"}. Record reuse existing source, ignore duplicate, or keep distinct.`;
        if (strict) issues.push(message);
        else warnings.push(message);
      } else {
        documentedDuplicateRows += 1;
      }
    }
  }

  for (const group of fingerprintGroups.values()) {
    if (group.entries.length < 2) continue;
    repeatedFingerprintGroups += 1;
    if (!reviewMentionsGroup(duplicateRows, group)) {
      const ids = group.entries.map(({ source }) => source.id || source.source || "source").join(", ");
      const message = `Repeated source fingerprint "${group.key}" appears in ${ids}, but no Source Duplicate Review row documents the decision.`;
      if (strict) issues.push(message);
      else warnings.push(message);
    }
  }

  for (const group of sourceKeyGroups.values()) {
    if (group.entries.length < 2) continue;
    repeatedSourceKeyGroups += 1;
    if (!reviewMentionsGroup(duplicateRows, group)) {
      const ids = group.entries.map(({ source }) => source.id || source.source || "source").join(", ");
      const message = `Repeated source path/state key appears in ${ids}, but no Source Duplicate Review row documents the decision.`;
      if (strict) issues.push(message);
      else warnings.push(message);
    }
  }
}

const relRoot = path.relative(process.cwd(), targetRoot) || ".";
console.log(`Source audit target: ${relRoot}`);
console.log(`Source inventory rows: ${sourceInventoryRows}`);
console.log(`Sources with fingerprint: ${sourcesWithFingerprint}`);
console.log(`Sources missing fingerprint: ${sourcesMissingFingerprint}`);
console.log(`Source duplicate review rows: ${duplicateReviewRows}`);
console.log(`Unresolved duplicate rows: ${unresolvedDuplicateRows}`);
console.log(`Documented duplicate decisions: ${documentedDuplicateRows}`);
console.log(`Repeated fingerprint groups: ${repeatedFingerprintGroups}`);
console.log(`Repeated source path/state groups: ${repeatedSourceKeyGroups}`);
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

console.log("\nSource audit passed.");
