#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const targetArg = args.find((arg) => !arg.startsWith("--"));
const targetRoot = path.resolve(targetArg || process.cwd());
const designSystemDir = path.join(targetRoot, "design-system");
const inventoryFile = path.join(designSystemDir, "COMPONENT_INVENTORY.md");
const componentDocsDir = path.join(designSystemDir, "components");

const decisionPattern =
  /\b(?:merge|merged|make variant|variant|keep distinct|distinct|blocked|out-of-scope|separate|split)\b|合併|變體|變型|保留|拆開|分開|阻塞|別元件|独立|別コンポーネント|保留|統合|バリアント/i;

const unresolvedPattern =
  /^\s*(?:|[-—]|n\/a|na|none|tbd|todo|pending|open|unknown|needs review|needs decision|待確認|未決|未定|要確認|\?)\s*$/i;

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "for",
  "from",
  "in",
  "is",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
  "component",
  "token",
  "tokens",
  "state",
  "states",
  "slot",
  "slots",
  "variant",
  "variants",
  "default",
]);

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

function hasDocumentedUnresolvedReason(value) {
  const cleaned = cleanedCell(value);
  return /^unresolved\s*[-:]/i.test(cleaned) || /^not available\s*[-:]/i.test(cleaned);
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

function hasFigmaReference(value) {
  return /https?:\/\/(?:www\.)?figma\.com\/|figma:[A-Za-z0-9_-]+#/i.test(cleanedCell(value));
}

function isSourceTraceTable(table) {
  const heading = normalizeHeading(table.heading);
  return heading.includes("source trace") || (
    includesHeader(table.headers, "trace type") &&
    includesHeader(table.headers, "reference")
  );
}

function sourceTraceRowValue(table, rowName) {
  for (const entry of table.rows) {
    const traceType = firstValue(entry.row, ["trace type", "type"]);
    if (!normalizeHeading(traceType).includes(rowName)) continue;
    return {
      line: entry.line,
      value: entry.cells.slice(1).join(" "),
    };
  }
  return null;
}

function hasFallbackDisclosure(value) {
  return /schematic fallback|source preview unavailable|source unavailable|preview unavailable|no source preview|no source image|無法取得|无法取得|來源預覽|来源预览|沒有來源|没有来源|備援|备援|示意|非設計稿|非设计稿|プレビュー不可|取得できない|代替/i.test(
    cleanedCell(value),
  );
}

function tokenize(value) {
  return cleanedCell(value)
    .toLowerCase()
    .replace(/<[^>]+>/g, " ")
    .replace(/--[a-z0-9_-]+/g, " ")
    .replace(/[^a-z0-9\u4e00-\u9fffぁ-んァ-ン一-龯]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function tokenSet(value) {
  return new Set(tokenize(value));
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  return intersection / (a.size + b.size - intersection);
}

function componentNameFromSpec(file) {
  return path.basename(file, ".md");
}

function componentNameKey(value) {
  return cleanedCell(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function extractComponentFingerprint(markdown) {
  const fingerprint = new Map();
  for (const table of parseTables(markdown)) {
    const heading = normalizeHeading(table.heading);
    const isFingerprint =
      heading.includes("component fingerprint") ||
      (includesHeader(table.headers, "dimension") && includesHeader(table.headers, "description"));
    if (!isFingerprint) continue;
    for (const entry of table.rows) {
      const dimension = normalizeHeading(firstValue(entry.row, ["dimension"]));
      const description = firstValue(entry.row, ["description", "summary", "value"]);
      if (dimension && !unresolvedPattern.test(cleanedCell(description))) {
        fingerprint.set(dimension, description);
      }
    }
  }
  return fingerprint;
}

function textForFingerprint(fingerprint, keys) {
  return keys.map((key) => fingerprint.get(key) || "").join(" ");
}

function fingerprintWordCount(candidate) {
  return tokenize(
    [
      candidate.purpose,
      candidate.anatomy,
      candidate.variants,
      candidate.tokenContract,
      candidate.layout,
    ].join(" "),
  ).length;
}

function candidateFromInventoryRow(entry) {
  const component = firstValue(entry.row, ["component"]);
  if (!component || /^[-—]$/.test(component.trim())) return null;
  const fingerprintSummary = firstValue(entry.row, ["fingerprint"]);
  const notes = firstValue(entry.row, ["notes"]);
  const tokens = firstValue(entry.row, ["required tokens", "tokens"]);
  const status = firstValue(entry.row, ["status"]);
  return {
    name: cleanedCell(component),
    key: componentNameKey(component),
    source: `inventory row ${entry.line}`,
    purpose: `${fingerprintSummary} ${notes}`,
    anatomy: fingerprintSummary,
    variants: `${status} ${notes}`,
    tokenContract: tokens,
    layout: fingerprintSummary,
    visual: "",
  };
}

function candidateFromSpec(file, markdown) {
  const fingerprint = extractComponentFingerprint(markdown);
  const name = componentNameFromSpec(file);
  return {
    name,
    key: componentNameKey(name),
    source: path.relative(targetRoot, file),
    purpose: textForFingerprint(fingerprint, ["purpose behavior", "purpose"]),
    anatomy: textForFingerprint(fingerprint, ["anatomy"]),
    variants: textForFingerprint(fingerprint, ["variants states", "variants", "states"]),
    tokenContract: textForFingerprint(fingerprint, ["token contract summary", "token contract"]),
    layout: textForFingerprint(fingerprint, ["layout density", "layout"]),
    visual: textForFingerprint(fingerprint, ["visual reference"]),
  };
}

function similarityScore(candidateA, candidateB) {
  const purpose = jaccard(tokenSet(candidateA.purpose), tokenSet(candidateB.purpose));
  const anatomy = jaccard(tokenSet(candidateA.anatomy), tokenSet(candidateB.anatomy));
  const variants = jaccard(tokenSet(candidateA.variants), tokenSet(candidateB.variants));
  const tokenContract = jaccard(tokenSet(candidateA.tokenContract), tokenSet(candidateB.tokenContract));
  const layout = jaccard(tokenSet(candidateA.layout), tokenSet(candidateB.layout));
  const weighted =
    purpose * 0.34 + anatomy * 0.26 + variants * 0.14 + tokenContract * 0.16 + layout * 0.1;
  const sameName = candidateA.key && candidateA.key === candidateB.key;
  return {
    purpose,
    anatomy,
    variants,
    tokenContract,
    layout,
    weighted: sameName ? Math.max(weighted, 0.95) : weighted,
  };
}

function isSimilarComponentPair(score) {
  return (
    score.weighted >= 0.62 ||
    (score.weighted >= 0.5 && score.purpose >= 0.55 && score.anatomy >= 0.35)
  );
}

function pairMentionedInReview(reviewRows, candidateA, candidateB, requireResolvedDecision) {
  if (!candidateA.key || !candidateB.key) return false;
  for (const entry of reviewRows) {
    const text = componentNameKey(rowText(entry));
    const mentionsBoth = text.includes(candidateA.key) && text.includes(candidateB.key);
    if (!mentionsBoth) continue;
    const decision = firstValue(entry.row, ["developer decision", "decision"]);
    if (!requireResolvedDecision || !isUnresolvedDecision(decision)) return true;
  }
  return false;
}

const issues = [];
const warnings = [];

const inventory = await readOptional(inventoryFile);
let similarityRows = 0;
let unresolvedSimilarityRows = 0;
let documentedSimilarityRows = 0;
let autoSimilarityRows = 0;
let unresolvedAutoSimilarityRows = 0;
let documentedAutoSimilarityRows = 0;
let sourcePreviewRows = 0;
let fallbackVisualRows = 0;
let missingVisualRows = 0;
let inventoryComponentRows = 0;
const componentCandidates = [];
let explicitSimilarityReviewRows = [];

if (inventory === null) {
  const message = `Missing ${path.relative(targetRoot, inventoryFile)}`;
  if (strict) issues.push(`Strict mode requires ${message}`);
  else warnings.push(message);
} else {
  const tables = parseTables(inventory);
  const similarityTables = tables.filter(isSimilarityTable);
  const inventoryTables = tables.filter(isInventoryTable);
  explicitSimilarityReviewRows = similarityTables.flatMap((table) => table.rows);

  for (const table of inventoryTables) {
    for (const entry of table.rows) {
      const component = firstValue(entry.row, ["component"]);
      if (!component || /^[-—]$/.test(component.trim())) continue;
      inventoryComponentRows += 1;
      const candidate = candidateFromInventoryRow(entry);
      if (candidate) componentCandidates.push(candidate);
      const notes = firstValue(entry.row, ["notes"]);
      const status = firstValue(entry.row, ["status"]);
      if (containsSimilarityCue(`${status} ${notes}`) && !similarityTables.length) {
        const message = `Component inventory row ${entry.line} mentions similarity or merge review but no Component Similarity Review table exists.`;
        if (strict) issues.push(message);
        else warnings.push(message);
      }
    }
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
        const message = `Missing visual reference for component similarity review at row ${entry.line}: ${candidate || "candidate"} vs ${similar || "similar component"}. Link a Figma node preview, screenshot crop, or documented fallback.`;
        if (strict) issues.push(message);
        else warnings.push(message);
      } else if (hasSourceBasedPreview(visual)) {
        sourcePreviewRows += 1;
      } else if (usesSvgReference(visual)) {
        fallbackVisualRows += 1;
        if (!hasFallbackDisclosure(fallbackContext)) {
          const message = `SVG visual reference at row ${entry.line} must be labeled as schematic fallback with source preview unavailable; do not use AI-drawn SVG as design evidence.`;
          if (strict) issues.push(message);
          else warnings.push(message);
        } else {
          warnings.push(
            `Similarity review row ${entry.line} uses a schematic fallback SVG; prefer a Figma node preview or screenshot crop when available.`,
          );
        }
      } else {
        missingVisualRows += 1;
        const message = `Visual reference at row ${entry.line} does not identify a Figma preview, screenshot crop, or labeled fallback: ${visual}`;
        if (strict) issues.push(message);
        else warnings.push(message);
      }
      if (isUnresolvedDecision(decision)) {
        unresolvedSimilarityRows += 1;
        const message = `Unresolved component similarity review at row ${entry.line}: ${candidate || "candidate"} vs ${similar || "similar component"}. Record merge, make variant, keep distinct, or blocked.`;
        if (strict) issues.push(message);
        else warnings.push(message);
      } else {
        documentedSimilarityRows += 1;
      }
    }
  }
}

const componentDocs = await listMarkdownDocs(componentDocsDir);
let specsMissingFingerprint = 0;
let specsWithFigmaTrace = 0;
let specsWithFigmaMcpTarget = 0;
let specsWithUnresolvedFigmaMcpTarget = 0;
for (const file of componentDocs) {
  const content = await readOptional(file);
  if (!content) continue;
  const relativeFile = path.relative(targetRoot, file);
  const sourceTraceTables = parseTables(content).filter(isSourceTraceTable);
  const sourceTraceText = sourceTraceTables
    .flatMap((table) => table.rows.flatMap((entry) => entry.cells))
    .join(" ");
  const hasFigmaTrace = hasFigmaReference(sourceTraceText);
  if (hasFigmaTrace) {
    specsWithFigmaTrace += 1;
    const mcpRow = sourceTraceTables
      .map((table) => sourceTraceRowValue(table, "figma mcp target"))
      .find(Boolean);

    if (!mcpRow) {
      const message = `Figma-backed component spec is missing a Figma MCP target Source Trace row: ${relativeFile}`;
      if (strict) issues.push(message);
      else warnings.push(message);
    } else if (hasDocumentedUnresolvedReason(mcpRow.value)) {
      specsWithUnresolvedFigmaMcpTarget += 1;
    } else if (unresolvedPattern.test(cleanedCell(mcpRow.value))) {
      const message = `Figma-backed component spec has an empty Figma MCP target at ${relativeFile}:${mcpRow.line}.`;
      if (strict) issues.push(message);
      else warnings.push(message);
    } else {
      specsWithFigmaMcpTarget += 1;
    }
  }

  if (!/^##\s+Component Fingerprint\b/im.test(content)) {
    specsMissingFingerprint += 1;
    warnings.push(
      `Component spec is missing a Component Fingerprint section: ${relativeFile}`,
    );
    continue;
  }
  componentCandidates.push(candidateFromSpec(file, content));
}

for (let firstIndex = 0; firstIndex < componentCandidates.length; firstIndex += 1) {
  for (let secondIndex = firstIndex + 1; secondIndex < componentCandidates.length; secondIndex += 1) {
    const first = componentCandidates[firstIndex];
    const second = componentCandidates[secondIndex];
    if (first.source === second.source) continue;
    if (first.key && first.key === second.key) continue;
    if (fingerprintWordCount(first) < 5 || fingerprintWordCount(second) < 5) continue;
    const score = similarityScore(first, second);
    if (!isSimilarComponentPair(score)) continue;
    autoSimilarityRows += 1;
    if (pairMentionedInReview(explicitSimilarityReviewRows, first, second, false)) {
      if (pairMentionedInReview(explicitSimilarityReviewRows, first, second, true)) {
        documentedAutoSimilarityRows += 1;
      }
      continue;
    }
    unresolvedAutoSimilarityRows += 1;
    const message = `Automatic component similarity candidate needs review: ${first.name} (${first.source}) and ${second.name} (${second.source}) score ${score.weighted.toFixed(
      2,
    )}. Record merge, make variant, keep distinct, or blocked in COMPONENT_INVENTORY.md.`;
    if (strict) issues.push(message);
    else warnings.push(message);
  }
}

const relRoot = path.relative(process.cwd(), targetRoot) || ".";
console.log(`Component audit target: ${relRoot}`);
console.log(`Inventory component rows: ${inventoryComponentRows}`);
console.log(`Component specs: ${componentDocs.length}`);
console.log(`Similarity review rows: ${similarityRows}`);
console.log(`Automatic similarity candidates: ${autoSimilarityRows}`);
console.log(`Unresolved similarity rows: ${unresolvedSimilarityRows}`);
console.log(`Unresolved automatic similarity candidates: ${unresolvedAutoSimilarityRows}`);
console.log(`Documented similarity decisions: ${documentedSimilarityRows}`);
console.log(`Documented automatic similarity candidates: ${documentedAutoSimilarityRows}`);
console.log(`Source preview visual rows: ${sourcePreviewRows}`);
console.log(`Fallback visual rows: ${fallbackVisualRows}`);
console.log(`Missing visual rows: ${missingVisualRows}`);
console.log(`Specs missing fingerprint: ${specsMissingFingerprint}`);
console.log(`Specs with Figma trace: ${specsWithFigmaTrace}`);
console.log(`Specs with Figma MCP target: ${specsWithFigmaMcpTarget}`);
console.log(`Specs with unresolved Figma MCP target: ${specsWithUnresolvedFigmaMcpTarget}`);
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
