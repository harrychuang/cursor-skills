#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
// --json emits the review counts and the outstanding rows on stdout instead of
// writing the HTML file, so tooling can read the queue without scraping markup.
const jsonMode = args.includes("--json");
const positionalArgs = args.filter((arg) => !arg.startsWith("--"));
const targetRoot = path.resolve(positionalArgs[0] || process.cwd());
const outputPath = path.resolve(
  positionalArgs[1] || path.join(targetRoot, "docs", "design-system", "review.html"),
);

const designSystemDir = path.join(targetRoot, "design-system");
const tokensDir = path.join(targetRoot, "tokens");
const designSystemAssetsDir = path.join(designSystemDir, "assets");
const evidenceMapFile = path.join(designSystemDir, "DESIGN_EVIDENCE_MAP.md");
const tokenArchitectureFile = path.join(designSystemDir, "TOKEN_ARCHITECTURE.md");
const inventoryFile = path.join(designSystemDir, "COMPONENT_INVENTORY.md");
const refTokensFile = path.join(tokensDir, "tokens-ref.css");

const LIGHTNESS_TOLERANCE = 0.01;
const NEAR_COLOR_DELTA_E = 3;
const NEAR_COLOR_ALPHA_DELTA = 0.03;

const decisionPattern =
  /\b(?:merge|merged|make variant|variant|keep distinct|distinct|blocked|out-of-scope|separate|split|reuse existing source|reuse existing|reuse source|ignore duplicate|dedupe|deduplicate|same source)\b|合併|變體|變型|保留|拆開|分開|阻塞|重用|沿用|忽略重複|同一來源|別元件|独立|別コンポーネント|統合|バリアント|同一ソース/i;

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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

function stripInlineComments(value) {
  return String(value).replace(/\/\*[\s\S]*?\*\//g, "").trim();
}

function parseDeclarations(css) {
  const declarations = new Map();
  const pattern = /(?:\/\*([\s\S]*?)\*\/\s*)?(--[A-Za-z0-9_-]+)\s*:\s*([^;]+);(?:\s*\/\*([\s\S]*?)\*\/)?/g;
  let match;
  while ((match = pattern.exec(css))) {
    declarations.set(match[2], {
      name: match[2],
      value: stripInlineComments(match[3]),
      leadingComment: (match[1] || "").trim(),
      trailingComment: (match[4] || "").trim(),
    });
  }
  return declarations;
}

function normalizeTokenName(name) {
  return name.replace(/^--/, "").toLowerCase();
}

function parseReferenceColorName(name) {
  const normalized = normalizeTokenName(name);
  const marker = "-ref-color-";
  const markerIndex = normalized.indexOf(marker);
  if (markerIndex === -1) return null;
  const suffix = normalized.slice(markerIndex + marker.length);
  const segments = suffix.split("-").filter(Boolean);
  const stepSegment = segments.at(-1);
  const hasStep = /^\d+$/.test(stepSegment || "");
  return {
    family: hasStep ? segments.slice(0, -1).join("-") : segments.join("-"),
    step: hasStep ? Number(stepSegment) : null,
  };
}

function parseReferenceFamily(name) {
  const normalized = normalizeTokenName(name);
  const marker = "-ref-";
  const markerIndex = normalized.indexOf(marker);
  if (markerIndex === -1) return "unknown";
  return normalized
    .slice(markerIndex + marker.length)
    .split("-")
    .filter(Boolean)[0] || "unknown";
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function parseHexColor(value) {
  const match = String(value).trim().match(/^#([0-9a-fA-F]{3,8})$/);
  if (!match) return null;
  let hex = match[1];
  if (hex.length === 3 || hex.length === 4) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }
  if (hex.length !== 6 && hex.length !== 8) return null;
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
    a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
  };
}

function parseCssNumberOrPercent(raw, maxValue) {
  const value = String(raw).trim();
  if (value.endsWith("%")) return clamp01(Number(value.slice(0, -1)) / 100) * maxValue;
  return Number(value);
}

function parseRgbColor(value) {
  const match = String(value).trim().match(/^rgba?\((.+)\)$/i);
  if (!match) return null;
  const [colorPart, alphaPart] = match[1].split("/").map((part) => part.trim());
  const parts = colorPart.includes(",")
    ? colorPart.split(",").map((part) => part.trim())
    : colorPart.split(/\s+/).map((part) => part.trim());
  if (alphaPart !== undefined) parts.push(alphaPart);
  if (parts.length < 3) return null;
  const r = parseCssNumberOrPercent(parts[0], 255);
  const g = parseCssNumberOrPercent(parts[1], 255);
  const b = parseCssNumberOrPercent(parts[2], 255);
  const a = parts[3] === undefined ? 1 : parseCssNumberOrPercent(parts[3], 1);
  if (![r, g, b, a].every(Number.isFinite)) return null;
  return {
    r: clamp01(r / 255) * 255,
    g: clamp01(g / 255) * 255,
    b: clamp01(b / 255) * 255,
    a: clamp01(a),
  };
}

function hueToRgb(p, q, t) {
  let adjusted = t;
  if (adjusted < 0) adjusted += 1;
  if (adjusted > 1) adjusted -= 1;
  if (adjusted < 1 / 6) return p + (q - p) * 6 * adjusted;
  if (adjusted < 1 / 2) return q;
  if (adjusted < 2 / 3) return p + (q - p) * (2 / 3 - adjusted) * 6;
  return p;
}

function hslToRgb(h, s, l) {
  const hue = (((h % 360) + 360) % 360) / 360;
  const saturation = clamp01(s);
  const lightness = clamp01(l);
  if (saturation === 0) {
    const channel = lightness * 255;
    return { r: channel, g: channel, b: channel };
  }
  const q =
    lightness < 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;
  return {
    r: hueToRgb(p, q, hue + 1 / 3) * 255,
    g: hueToRgb(p, q, hue) * 255,
    b: hueToRgb(p, q, hue - 1 / 3) * 255,
  };
}

function parseHslColor(value) {
  const match = String(value).trim().match(/^hsla?\((.+)\)$/i);
  if (!match) return null;
  const [colorPart, alphaPart] = match[1].split("/").map((part) => part.trim());
  const parts = colorPart.includes(",")
    ? colorPart.split(",").map((part) => part.trim())
    : colorPart.split(/\s+/).map((part) => part.trim());
  if (alphaPart !== undefined) parts.push(alphaPart);
  if (parts.length < 3 || !parts[1].endsWith("%") || !parts[2].endsWith("%")) return null;
  const h = Number(parts[0].replace(/deg$/i, ""));
  const s = Number(parts[1].slice(0, -1)) / 100;
  const l = Number(parts[2].slice(0, -1)) / 100;
  const a = parts[3] === undefined ? 1 : parseCssNumberOrPercent(parts[3], 1);
  if (![h, s, l, a].every(Number.isFinite)) return null;
  return { ...hslToRgb(h, s, l), a: clamp01(a) };
}

function parseColor(value) {
  return parseHexColor(value) || parseRgbColor(value) || parseHslColor(value);
}

function srgbToLinear(channel) {
  const normalized = channel / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(color) {
  return (
    0.2126 * srgbToLinear(color.r) +
    0.7152 * srgbToLinear(color.g) +
    0.0722 * srgbToLinear(color.b)
  );
}

function labPivot(value) {
  return value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116;
}

function rgbToLab(color) {
  const r = srgbToLinear(color.r);
  const g = srgbToLinear(color.g);
  const b = srgbToLinear(color.b);
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const fx = labPivot(x);
  const fy = labPivot(y);
  const fz = labPivot(z);
  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

function deltaE76(colorA, colorB) {
  const labA = rgbToLab(colorA);
  const labB = rgbToLab(colorB);
  return Math.sqrt(
    (labA.l - labB.l) ** 2 + (labA.a - labB.a) ** 2 + (labA.b - labB.b) ** 2,
  );
}

function parseNumericValue(value) {
  const cleanValue = stripInlineComments(value);
  if (/^(?:#|rgb|hsl)/i.test(cleanValue) || cleanValue.includes("var(") || cleanValue.includes("calc(")) {
    return null;
  }
  const match = cleanValue.match(/^(-?(?:\d+|\d*\.\d+))(px|rem|em|%|ms|s|deg)?$/);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = match[2] || "";
  if (!Number.isFinite(amount)) return null;
  if (unit === "rem" || unit === "em") return { amount, unit, normalized: amount * 16, unitGroup: "length" };
  if (unit === "px") return { amount, unit, normalized: amount, unitGroup: "length" };
  if (unit === "s") return { amount, unit, normalized: amount * 1000, unitGroup: "time" };
  if (unit === "ms") return { amount, unit, normalized: amount, unitGroup: "time" };
  if (unit === "%") return { amount, unit, normalized: amount, unitGroup: "percent" };
  if (unit === "deg") return { amount, unit, normalized: amount, unitGroup: "angle" };
  return { amount, unit, normalized: amount, unitGroup: "number" };
}

function isNearNumericValue(a, b) {
  const diff = Math.abs(a.normalized - b.normalized);
  if (diff === 0) return true;
  const largest = Math.max(Math.abs(a.normalized), Math.abs(b.normalized));
  const ratio = largest === 0 ? 0 : diff / largest;
  if (a.unitGroup === "length") return diff <= 2 || (diff <= 4 && ratio <= 0.06);
  if (a.unitGroup === "time") return diff <= 50 || ratio <= 0.1;
  if (a.unitGroup === "percent") return diff <= 2;
  if (a.unitGroup === "angle") return diff <= 2;
  return diff <= 0.02 || (diff <= 1 && ratio <= 0.05);
}

function reviewTextForDeclaration(declaration) {
  if (!declaration) return "";
  return `${declaration.leadingComment}\n${declaration.trailingComment}`;
}

function hasCssReviewDecision(declarationA, declarationB) {
  const text = `${reviewTextForDeclaration(declarationA)}\n${reviewTextForDeclaration(declarationB)}`;
  return /token-review\s*:\s*(?:keep|keep-distinct|merge|merge-with|approved|separate|split)/i.test(text);
}

function hasArchitectureReviewDecision(architectureDoc, tokenA, tokenB) {
  if (!architectureDoc) return false;
  const first = tokenA.toLowerCase();
  const second = tokenB.toLowerCase();
  return architectureDoc
    .toLowerCase()
    .split(/\r?\n/)
    .some(
      (line) =>
        line.includes(first) &&
        line.includes(second) &&
        /merge|merged|keep|distinct|separate|split|approved|合併|保留|拆開|分開|確認/.test(line),
    );
}

function decisionStatus(hasDecision) {
  return hasDecision ? "documented" : "needs-review";
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function swatchHtml(colorValue, label) {
  return `<span class="swatch-pair"><span class="swatch" style="background:${escapeAttr(colorValue)}"></span><code>${escapeHtml(label)}</code></span>`;
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
      tables.push({ heading: headingStack.map((item) => item.title).join(" > "), headers, rows });
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

function isSourceDuplicateTable(table) {
  const heading = normalizeHeading(table.heading);
  return (
    heading.includes("source duplicate review") ||
    (includesHeader(table.headers, "candidate") &&
      includesHeader(table.headers, "duplicate") &&
      includesHeader(table.headers, "developer decision"))
  );
}

function cleanCell(value) {
  return String(value).replace(/<br\s*\/?>/gi, " ").replace(/`/g, "").trim();
}

function isUnresolvedDecision(value) {
  const cleaned = cleanCell(value);
  return unresolvedPattern.test(cleaned) || !decisionPattern.test(cleaned);
}

function formatInline(raw) {
  let text = escapeHtml(raw);
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, href) => {
    const safeHref = String(href).trim().startsWith("javascript:") ? "#" : href;
    return `<img class="review-image" src="${escapeAttr(safeHref)}" alt="${escapeAttr(alt)}" loading="lazy">`;
  });
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
    const safeHref = String(href).trim().startsWith("javascript:") ? "#" : href;
    return `<a href="${escapeAttr(safeHref)}">${label}</a>`;
  });
  return text;
}

function statusBadge(status) {
  const label = status === "documented" ? "Documented" : status === "issue" ? "Issue" : "Needs review";
  return `<span class="status ${escapeAttr(status)}">${label}</span>`;
}

function tableHtml(headers, rows, emptyMessage) {
  if (!rows.length) return `<p class="empty">${escapeHtml(emptyMessage)}</p>`;
  return `<div class="table-wrap"><table>
    <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
    <tbody>${rows.join("")}</tbody>
  </table></div>`;
}

const refCss = await readOptional(refTokensFile);
const evidenceMapDoc = await readOptional(evidenceMapFile);
const architectureDoc = await readOptional(tokenArchitectureFile);
const inventoryDoc = await readOptional(inventoryFile);
const declarations = parseDeclarations(refCss || "");

const sourceRows = [];
if (evidenceMapDoc) {
  const sourceDuplicateTables = parseTables(evidenceMapDoc).filter(isSourceDuplicateTable);
  for (const table of sourceDuplicateTables) {
    for (const entry of table.rows) {
      const candidate = firstValue(entry.row, ["candidate source", "candidate", "new source", "source a"]);
      const duplicate = firstValue(entry.row, ["duplicate of", "existing source", "duplicate", "source b"]);
      const matchType = firstValue(entry.row, ["match type", "match"]);
      const fingerprint = firstValue(entry.row, ["fingerprint", "normalized key", "key"]);
      const suggested = firstValue(entry.row, ["suggested action", "suggested"]);
      const decision = firstValue(entry.row, ["developer decision", "decision"]);
      const rationale = firstValue(entry.row, ["rationale", "owner"]);
      if (!candidate && !duplicate && !matchType && !fingerprint && !decision) continue;
      sourceRows.push({
        candidate,
        duplicate,
        matchType,
        fingerprint,
        suggested,
        decision,
        rationale,
        status: isUnresolvedDecision(decision) ? "needs-review" : "documented",
      });
    }
  }
}

const referenceColors = [];
for (const [name, declaration] of declarations) {
  const colorName = parseReferenceColorName(name);
  if (!colorName) continue;
  const color = parseColor(declaration.value);
  if (!color) continue;
  referenceColors.push({
    name,
    value: declaration.value,
    family: colorName.family || "unknown",
    step: colorName.step,
    color,
    luminance: relativeLuminance(color),
  });
}

const colorScaleIssues = [];
const colorsByFamily = new Map();
for (const token of referenceColors.filter((token) => token.step !== null)) {
  const familyTokens = colorsByFamily.get(token.family) || [];
  familyTokens.push(token);
  colorsByFamily.set(token.family, familyTokens);
}

for (const [family, familyTokens] of colorsByFamily) {
  const sorted = [...familyTokens].sort((a, b) => b.step - a.step);
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const lighterStepToken = sorted[index];
    const darkerStepToken = sorted[index + 1];
    if (lighterStepToken.luminance + LIGHTNESS_TOLERANCE < darkerStepToken.luminance) {
      colorScaleIssues.push({ family, lighterStepToken, darkerStepToken });
    }
  }
}

const nearColorRows = [];
for (let firstIndex = 0; firstIndex < referenceColors.length; firstIndex += 1) {
  for (let secondIndex = firstIndex + 1; secondIndex < referenceColors.length; secondIndex += 1) {
    const first = referenceColors[firstIndex];
    const second = referenceColors[secondIndex];
    const alphaDiff = Math.abs(first.color.a - second.color.a);
    const deltaE = deltaE76(first.color, second.color);
    if (alphaDiff <= NEAR_COLOR_ALPHA_DELTA && deltaE <= NEAR_COLOR_DELTA_E) {
      const hasDecision =
        hasCssReviewDecision(declarations.get(first.name), declarations.get(second.name)) ||
        hasArchitectureReviewDecision(architectureDoc, first.name, second.name);
      nearColorRows.push({ first, second, deltaE, status: decisionStatus(hasDecision) });
    }
  }
}

const referenceNumbers = [];
for (const [name, declaration] of declarations) {
  if (parseColor(declaration.value)) continue;
  const numeric = parseNumericValue(declaration.value);
  if (!numeric) continue;
  referenceNumbers.push({ name, value: declaration.value, family: parseReferenceFamily(name), numeric });
}

const nearNumberRows = [];
for (let firstIndex = 0; firstIndex < referenceNumbers.length; firstIndex += 1) {
  for (let secondIndex = firstIndex + 1; secondIndex < referenceNumbers.length; secondIndex += 1) {
    const first = referenceNumbers[firstIndex];
    const second = referenceNumbers[secondIndex];
    if (first.family !== second.family || first.numeric.unitGroup !== second.numeric.unitGroup) continue;
    if (isNearNumericValue(first.numeric, second.numeric)) {
      const hasDecision =
        hasCssReviewDecision(declarations.get(first.name), declarations.get(second.name)) ||
        hasArchitectureReviewDecision(architectureDoc, first.name, second.name);
      nearNumberRows.push({
        first,
        second,
        diff: Math.abs(first.numeric.normalized - second.numeric.normalized),
        status: decisionStatus(hasDecision),
      });
    }
  }
}

const componentRows = [];
if (inventoryDoc) {
  const similarityTables = parseTables(inventoryDoc).filter(isSimilarityTable);
  for (const table of similarityTables) {
    for (const entry of table.rows) {
      const candidate = firstValue(entry.row, ["new candidate", "candidate"]);
      const similar = firstValue(entry.row, ["similar existing", "similar"]);
      const reason = firstValue(entry.row, ["similarity reason", "reason"]);
      const visual = firstValue(entry.row, ["visual reference", "visual"]);
      const suggested = firstValue(entry.row, ["suggested action", "suggested"]);
      const decision = firstValue(entry.row, ["developer decision", "decision"]);
      const rationale = firstValue(entry.row, ["rationale", "owner"]);
      if (!candidate && !similar && !reason) continue;
      componentRows.push({
        candidate,
        similar,
        visual,
        reason,
        suggested,
        decision,
        rationale,
        status: isUnresolvedDecision(decision) ? "needs-review" : "documented",
      });
    }
  }
}

const counts = {
  sources: sourceRows.length,
  colorScaleIssues: colorScaleIssues.length,
  nearColors: nearColorRows.length,
  nearNumbers: nearNumberRows.length,
  components: componentRows.length,
  needsReview:
    sourceRows.filter((row) => row.status === "needs-review").length +
    colorScaleIssues.length +
    nearColorRows.filter((row) => row.status === "needs-review").length +
    nearNumberRows.filter((row) => row.status === "needs-review").length +
    componentRows.filter((row) => row.status === "needs-review").length,
};

// The rows a reviewer still has to act on, ordered the way the HTML sections
// present them. Color scale issues are included even though they carry the
// "issue" status, because counts.needsReview also counts them; that keeps the
// array length equal to counts.needsReview.
function needsReviewEntries() {
  const entries = [];
  for (const row of sourceRows) {
    if (row.status !== "needs-review") continue;
    entries.push({
      kind: "source-duplicate",
      status: row.status,
      candidate: row.candidate,
      duplicate: row.duplicate,
      matchType: row.matchType,
      fingerprint: row.fingerprint,
      suggested: row.suggested,
      decision: row.decision,
      rationale: row.rationale,
    });
  }
  for (const { family, lighterStepToken, darkerStepToken } of colorScaleIssues) {
    entries.push({
      kind: "color-scale",
      status: "issue",
      family,
      higherStep: { name: lighterStepToken.name, value: lighterStepToken.value },
      lowerStep: { name: darkerStepToken.name, value: darkerStepToken.value },
    });
  }
  for (const row of nearColorRows) {
    if (row.status !== "needs-review") continue;
    entries.push({
      kind: "near-color",
      status: row.status,
      tokenA: { name: row.first.name, value: row.first.value },
      tokenB: { name: row.second.name, value: row.second.value },
      deltaE: Number(formatNumber(row.deltaE)),
    });
  }
  for (const row of nearNumberRows) {
    if (row.status !== "needs-review") continue;
    entries.push({
      kind: "near-number",
      status: row.status,
      tokenA: { name: row.first.name, value: row.first.value },
      tokenB: { name: row.second.name, value: row.second.value },
      difference: Number(formatNumber(row.diff)),
      unitGroup: row.first.numeric.unitGroup,
    });
  }
  for (const row of componentRows) {
    if (row.status !== "needs-review") continue;
    entries.push({
      kind: "component-similarity",
      status: row.status,
      candidate: row.candidate,
      similar: row.similar,
      visual: row.visual,
      reason: row.reason,
      suggested: row.suggested,
      decision: row.decision,
      rationale: row.rationale,
    });
  }
  return entries;
}

function css() {
  return `
    :root {
      color-scheme: light;
      --bg: #ffffff;
      --surface: #ffffff;
      --surface-subtle: #f5f6f3;
      --text: #141414;
      --muted: #60645f;
      --border: #d7dbd3;
      --border-strong: #aeb5aa;
      --accent: #2f5d3a;
      --warning: #8a4b00;
      --issue: #9c2f21;
      --code: #f0f2ee;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans TC", "Noto Sans JP", sans-serif;
      line-height: 1.55;
    }
    a { color: var(--accent); }
    .layout {
      display: grid;
      grid-template-columns: 284px minmax(0, 1fr);
      min-height: 100vh;
    }
    aside {
      position: sticky;
      top: 0;
      height: 100vh;
      overflow: auto;
      padding: 28px 22px;
      border-right: 1px solid var(--border);
      background: var(--surface);
    }
    main {
      width: min(1160px, 100%);
      padding: 34px 32px 72px;
    }
    .brand {
      margin: 0 0 4px;
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 0;
      text-transform: uppercase;
    }
    .subtitle {
      margin: 0 0 22px;
      color: var(--muted);
      font-size: 13px;
    }
    nav a {
      display: block;
      padding: 7px 0;
      color: var(--muted);
      font-size: 14px;
      font-weight: 650;
      text-decoration: none;
    }
    nav a:hover { color: var(--text); }
    .hero {
      padding: 0 0 24px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 18px;
    }
    h1 {
      max-width: 800px;
      margin: 0 0 12px;
      font-size: 34px;
      line-height: 1.12;
      letter-spacing: 0;
    }
    .hero p {
      max-width: 840px;
      margin: 0;
      color: var(--muted);
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      border-bottom: 1px solid var(--border);
      margin-bottom: 8px;
    }
    .metric {
      padding: 14px 18px 16px 0;
      border-right: 1px solid var(--border);
    }
    .metric + .metric { padding-left: 18px; }
    .metric:last-child { border-right: 0; }
    .metric strong {
      display: block;
      margin-bottom: 6px;
      font-size: 24px;
      line-height: 1;
    }
    .metric span {
      color: var(--muted);
      font-size: 13px;
    }
    section {
      padding: 24px 0;
      border-top: 1px solid var(--border);
    }
    h2 {
      margin: 0 0 10px;
      font-size: 23px;
      line-height: 1.15;
      letter-spacing: 0;
    }
    .section-lead {
      margin: 0 0 14px;
      color: var(--muted);
    }
    .table-wrap {
      overflow: auto;
      border: 1px solid var(--border);
      border-radius: 6px;
      margin: 16px 0;
    }
    table {
      width: 100%;
      min-width: 820px;
      border-collapse: collapse;
    }
    th, td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
      text-align: left;
      vertical-align: top;
      font-size: 14px;
    }
    th {
      background: var(--surface-subtle);
      color: var(--muted);
      font-size: 12px;
      letter-spacing: 0;
      text-transform: uppercase;
    }
    tr:last-child td { border-bottom: 0; }
    code {
      border-radius: 5px;
      background: var(--code);
      padding: 2px 5px;
      font-size: 0.92em;
    }
    .status {
      display: inline-block;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 4px 7px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
    }
    .status.needs-review { border-color: #d4a64d; color: var(--warning); }
    .status.issue { border-color: #d89a92; color: var(--issue); }
    .status.documented { border-color: var(--border-strong); color: var(--text); }
    .swatch-pair {
      display: grid;
      grid-template-columns: 34px minmax(0, 1fr);
      gap: 8px;
      align-items: center;
      min-width: 180px;
    }
    .swatch {
      width: 30px;
      height: 30px;
      border: 1px solid var(--border-strong);
      border-radius: 6px;
    }
    .review-image {
      display: block;
      max-width: min(220px, 100%);
      max-height: 160px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--surface);
      object-fit: contain;
    }
    .empty {
      margin: 12px 0 0;
      color: var(--muted);
    }
    @media (max-width: 900px) {
      .layout { display: block; }
      aside {
        position: relative;
        height: auto;
        border-right: 0;
        border-bottom: 1px solid var(--border);
      }
      main { padding: 24px 16px 56px; }
      .summary { grid-template-columns: 1fr; }
      .metric,
      .metric + .metric,
      .metric:last-child {
        border-right: 0;
        border-top: 1px solid var(--border);
        padding: 14px 0;
      }
    }
  `;
}

const colorScaleRows = colorScaleIssues.map(({ family, lighterStepToken, darkerStepToken }) => `<tr>
  <td><code>${escapeHtml(family)}</code></td>
  <td>${swatchHtml(lighterStepToken.value, `${lighterStepToken.name}: ${lighterStepToken.value}`)}</td>
  <td>${swatchHtml(darkerStepToken.value, `${darkerStepToken.name}: ${darkerStepToken.value}`)}</td>
  <td>${statusBadge("issue")}</td>
</tr>`);

const nearColorTableRows = nearColorRows.map(({ first, second, deltaE, status }) => `<tr>
  <td>${swatchHtml(first.value, `${first.name}: ${first.value}`)}</td>
  <td>${swatchHtml(second.value, `${second.name}: ${second.value}`)}</td>
  <td><code>${escapeHtml(formatNumber(deltaE))}</code></td>
  <td>${statusBadge(status)}</td>
</tr>`);

const nearNumberTableRows = nearNumberRows.map(({ first, second, diff, status }) => `<tr>
  <td><code>${escapeHtml(first.name)}</code><br>${escapeHtml(first.value)}</td>
  <td><code>${escapeHtml(second.name)}</code><br>${escapeHtml(second.value)}</td>
  <td><code>${escapeHtml(formatNumber(diff))}</code> ${escapeHtml(first.numeric.unitGroup)}</td>
  <td>${statusBadge(status)}</td>
</tr>`);

const sourceTableRows = sourceRows.map((row) => `<tr>
  <td>${formatInline(row.candidate || "candidate source")}</td>
  <td>${formatInline(row.duplicate || "duplicate source")}</td>
  <td>${formatInline(row.matchType || "")}</td>
  <td>${formatInline(row.fingerprint || "")}</td>
  <td>${formatInline(row.suggested || "")}</td>
  <td>${formatInline(row.decision || "")}<br>${statusBadge(row.status)}</td>
  <td>${formatInline(row.rationale || "")}</td>
</tr>`);

const componentTableRows = componentRows.map((row) => `<tr>
  <td>${formatInline(row.candidate || "candidate")}</td>
  <td>${formatInline(row.similar || "similar component")}</td>
  <td>${formatInline(row.visual || "")}</td>
  <td>${formatInline(row.reason || "")}</td>
  <td>${formatInline(row.suggested || "")}</td>
  <td>${formatInline(row.decision || "")}<br>${statusBadge(row.status)}</td>
  <td>${formatInline(row.rationale || "")}</td>
</tr>`);

const generatedAt = new Date().toISOString();
const html = `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Design System Review Queue</title>
  <style>${css()}</style>
</head>
<body>
  <div class="layout">
    <aside>
      <p class="brand">Review Queue</p>
      <p class="subtitle">Generated ${escapeHtml(generatedAt)}</p>
      <nav>
        <a href="#overview">Overview</a>
        <a href="index.html">Full Documentation</a>
        <a href="#source-duplicates">Duplicate Sources</a>
        <a href="#color-scale">Color Scale Issues</a>
        <a href="#near-colors">Near Color Tokens</a>
        <a href="#near-numbers">Near Number Tokens</a>
        <a href="#components">Similar Components</a>
      </nav>
    </aside>
    <main>
      <section class="hero" id="overview">
        <h1>Design System Review Queue</h1>
        <p>這份文件彙整萃取時需要設計或開發者審查的候選項目：重複來源、相近 token、色階問題，以及外觀或功能相近的 component。</p>
      </section>

      <div class="summary" aria-label="Review summary">
        <div class="metric"><strong>${counts.needsReview}</strong><span>Needs review</span></div>
        <div class="metric"><strong>${counts.sources}</strong><span>Duplicate sources</span></div>
        <div class="metric"><strong>${counts.colorScaleIssues}</strong><span>Color scale issues</span></div>
        <div class="metric"><strong>${counts.nearColors}</strong><span>Near color pairs</span></div>
        <div class="metric"><strong>${counts.nearNumbers}</strong><span>Near number pairs</span></div>
        <div class="metric"><strong>${counts.components}</strong><span>Component rows</span></div>
      </div>

      <section id="source-duplicates">
        <h2>Duplicate Sources</h2>
        <p class="section-lead">Rows come from <code>DESIGN_EVIDENCE_MAP.md</code>. Exact or likely duplicate screenshots, Figma nodes, and rendered states should be resolved before they count as separate evidence.</p>
        ${tableHtml(["Candidate source", "Duplicate of", "Match type", "Fingerprint / key", "Suggested action", "Developer decision", "Rationale"], sourceTableRows, "No duplicate source review rows found.")}
      </section>

      <section id="color-scale">
        <h2>Color Scale Issues</h2>
        <p class="section-lead">Reference color steps should run from 100 lightest to 0 darkest.</p>
        ${tableHtml(["Family", "Higher step", "Lower step", "Status"], colorScaleRows, "No color scale ordering issues found.")}
      </section>

      <section id="near-colors">
        <h2>Near Color Tokens</h2>
        <p class="section-lead">Pairs with deltaE at or below ${NEAR_COLOR_DELTA_E} are listed for merge or keep-distinct review.</p>
        ${tableHtml(["Token A", "Token B", "deltaE", "Status"], nearColorTableRows, "No near color token pairs found.")}
      </section>

      <section id="near-numbers">
        <h2>Near Number Tokens</h2>
        <p class="section-lead">Spacing, type, radius, opacity, and motion values in the same family are listed when numerically close.</p>
        ${tableHtml(["Token A", "Token B", "Difference", "Status"], nearNumberTableRows, "No near numeric token pairs found.")}
      </section>

      <section id="components">
        <h2>Similar Components</h2>
        <p class="section-lead">Rows come from <code>COMPONENT_INVENTORY.md</code> and should link source-based previews or screenshot crops when available.</p>
        ${tableHtml(["Candidate", "Similar existing", "Visual reference", "Reason", "Suggested action", "Developer decision", "Rationale"], componentTableRows, "No component similarity review rows found.")}
      </section>
    </main>
  </div>
</body>
</html>
`;

if (jsonMode) {
  // Machine-readable mode keeps stdout to a single JSON object and writes no
  // files, so a caller can parse it without cleaning up generated output.
  console.log(JSON.stringify({ counts, needsReview: needsReviewEntries() }, null, 2));
} else {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, html, "utf8");

  let copiedAssets = false;
  try {
    const assetEntries = await fs.readdir(designSystemAssetsDir);
    if (assetEntries.length) {
      await fs.cp(designSystemAssetsDir, path.join(path.dirname(outputPath), "assets"), {
        recursive: true,
      });
      copiedAssets = true;
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  console.log(`Generated ${path.relative(process.cwd(), outputPath) || outputPath}`);
  console.log(`Needs review: ${counts.needsReview}`);
  console.log(`Duplicate source rows: ${counts.sources}`);
  console.log(`Color scale issues: ${counts.colorScaleIssues}`);
  console.log(`Near color pairs: ${counts.nearColors}`);
  console.log(`Near number pairs: ${counts.nearNumbers}`);
  console.log(`Component similarity rows: ${counts.components}`);
  console.log(`Assets copied: ${copiedAssets ? "yes" : "no"}`);
}
