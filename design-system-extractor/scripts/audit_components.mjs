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

function hasFallbackDisclosure(value) {
  return /schematic fallback|source preview unavailable|source unavailable|preview unavailable|no source preview|no source image|無法取得|无法取得|來源預覽|来源预览|沒有來源|没有来源|備援|备援|示意|非設計稿|非设计稿|プレビュー不可|取得できない|代替/i.test(
    cleanedCell(value),
  );
}

const issues = [];
const warnings = [];

const inventory = await readOptional(inventoryFile);
let similarityRows = 0;
let unresolvedSimilarityRows = 0;
let documentedSimilarityRows = 0;
let sourcePreviewRows = 0;
let fallbackVisualRows = 0;
let missingVisualRows = 0;
let inventoryComponentRows = 0;

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
for (const file of componentDocs) {
  const content = await readOptional(file);
  if (!content) continue;
  if (!/^##\s+Component Fingerprint\b/im.test(content)) {
    specsMissingFingerprint += 1;
    warnings.push(
      `Component spec is missing a Component Fingerprint section: ${path.relative(targetRoot, file)}`,
    );
  }
}

const relRoot = path.relative(process.cwd(), targetRoot) || ".";
console.log(`Component audit target: ${relRoot}`);
console.log(`Inventory component rows: ${inventoryComponentRows}`);
console.log(`Component specs: ${componentDocs.length}`);
console.log(`Similarity review rows: ${similarityRows}`);
console.log(`Unresolved similarity rows: ${unresolvedSimilarityRows}`);
console.log(`Documented similarity decisions: ${documentedSimilarityRows}`);
console.log(`Source preview visual rows: ${sourcePreviewRows}`);
console.log(`Fallback visual rows: ${fallbackVisualRows}`);
console.log(`Missing visual rows: ${missingVisualRows}`);
console.log(`Specs missing fingerprint: ${specsMissingFingerprint}`);
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
