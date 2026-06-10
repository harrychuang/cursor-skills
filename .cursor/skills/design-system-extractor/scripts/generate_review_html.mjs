#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const targetRoot = path.resolve(process.argv[2] || process.cwd());
const outputPath = path.resolve(
  process.argv[3] || path.join(targetRoot, "docs", "design-system", "review.html"),
);

const designSystemDir = path.join(targetRoot, "design-system");
const tokensDir = path.join(targetRoot, "tokens");
const designSystemAssetsDir = path.join(designSystemDir, "assets");
const evidenceMapFile = path.join(designSystemDir, "DESIGN_EVIDENCE_MAP.md");
const tokenArchitectureFile = path.join(designSystemDir, "TOKEN_ARCHITECTURE.md");
const inventoryFile = path.join(designSystemDir, "COMPONENT_INVENTORY.md");
const componentDocsDir = path.join(designSystemDir, "components");
const refTokensFile = path.join(tokensDir, "tokens-ref.css");
const sysTokensFile = path.join(tokensDir, "tokens-sys.css");
const compTokensFile = path.join(tokensDir, "tokens-comp.css");

const LIGHTNESS_TOLERANCE = 0.01;
const NEAR_COLOR_DELTA_E = 3;
const NEAR_COLOR_ALPHA_DELTA = 0.03;

const decisionPattern =
  /\b(?:merge|merged|make variant|variant|keep distinct|distinct|blocked|out-of-scope|separate|split|reuse existing source|reuse existing|reuse source|ignore duplicate|dedupe|deduplicate|same source)\b|合併|變體|變型|保留|拆開|分開|阻塞|重用|沿用|忽略重複|同一來源|別元件|独立|別コンポーネント|統合|バリアント|同一ソース/i;

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

function parseLayerSegments(name, marker) {
  const normalized = normalizeTokenName(name);
  const markerIndex = normalized.indexOf(marker);
  if (markerIndex === -1) return [];
  return normalized.slice(markerIndex + marker.length).split("-").filter(Boolean);
}

function tokenDimensionFromSegments(segments) {
  const dimensions = [
    "color",
    "space",
    "spacing",
    "size",
    "radius",
    "type",
    "font",
    "shadow",
    "elevation",
    "opacity",
    "motion",
    "duration",
    "breakpoint",
    "z",
  ];
  return segments.find((segment) => dimensions.includes(segment)) || segments[0] || "unknown";
}

function splitComponentSegments(segments) {
  const componentNouns = new Set([
    "button",
    "card",
    "nav",
    "navigation",
    "tab",
    "input",
    "field",
    "dialog",
    "modal",
    "toast",
    "chip",
    "avatar",
    "row",
    "tile",
    "sidebar",
    "toolbar",
    "bar",
    "sheet",
    "drawer",
  ]);
  if (segments.length > 2 && componentNouns.has(segments[1])) {
    return { component: `${segments[0]}-${segments[1]}`, rest: segments.slice(2) };
  }
  return { component: segments[0] || "unknown", rest: segments.slice(1) };
}

function componentSlotSegments(rest, dimension) {
  const index = rest.indexOf(dimension);
  if (index === -1) return rest.slice(1);
  return index === rest.length - 1 ? rest.slice(0, index) : rest.slice(index + 1);
}

function normalizeTokenValue(value) {
  return stripInlineComments(value).replace(/\s+/g, " ").toLowerCase();
}

function sysDuplicateGroupKey(name, value) {
  const segments = parseLayerSegments(name, "-sys-");
  const dimension = tokenDimensionFromSegments(segments);
  return `${dimension}::${normalizeTokenValue(value)}`;
}

function compDuplicateGroupKey(name, value) {
  const segments = parseLayerSegments(name, "-comp-");
  const { component, rest } = splitComponentSegments(segments);
  const dimension = tokenDimensionFromSegments(rest);
  return `${component}::${dimension}::${normalizeTokenValue(value)}`;
}

function segmentsAfterDimension(segments, dimension) {
  const index = segments.indexOf(dimension);
  return index === -1 ? segments.slice(1) : segments.slice(index + 1);
}

function tokenTextSet(parts) {
  return new Set(
    parts
      .join(" ")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((part) => part.length > 1),
  );
}

function jaccardSet(a, b) {
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection += 1;
  }
  return intersection / (a.size + b.size - intersection);
}

function semanticCategory(segments) {
  const text = segments.join("-");
  if (/\b(on|foreground|content|text|label|icon|ink)\b/.test(text)) return "foreground";
  if (/\b(surface|background|container|canvas|page|sheet|panel)\b/.test(text)) return "surface";
  if (/\b(primary|secondary|tertiary|accent|brand|action|cta)\b/.test(text)) return "action";
  if (/\b(success|positive)\b/.test(text)) return "status-success";
  if (/\b(warning|caution)\b/.test(text)) return "status-warning";
  if (/\b(error|danger|critical|negative)\b/.test(text)) return "status-error";
  if (/\b(info|notice)\b/.test(text)) return "status-info";
  if (/\b(outline|border|divider|stroke|separator)\b/.test(text)) return "outline";
  if (/\b(padding|inset|gap|space|spacing|margin|inline|horizontal|x|vertical|block|y)\b/.test(text)) {
    return "spacing";
  }
  if (/\b(width|height|min|max|size|touch|target)\b/.test(text)) return "size";
  if (/\b(radius|corner|round)\b/.test(text)) return "radius";
  if (/\b(shadow|elevation|overlay)\b/.test(text)) return "elevation";
  if (/\b(duration|delay|motion|easing|transition)\b/.test(text)) return "motion";
  return segments[0] || "unknown";
}

function componentCategory(component) {
  if (/\b(button|action|cta|fab)\b/.test(component)) return "action-control";
  if (/\b(nav|navigation|tab|sidebar|top|bottom|bar|toolbar)\b/.test(component)) return "navigation";
  if (/\b(card|tile|panel|surface|sheet|container)\b/.test(component)) return "container";
  if (/\b(input|field|form|select|textarea|checkbox|radio|switch)\b/.test(component)) return "input";
  if (/\b(chip|tag|segmented|pill|filter)\b/.test(component)) return "selection";
  if (/\b(dialog|modal|drawer|popover|menu)\b/.test(component)) return "overlay";
  if (/\b(toast|banner|alert|snackbar)\b/.test(component)) return "feedback";
  if (/\b(row|list|item|cell|table)\b/.test(component)) return "data-display";
  return component || "unknown";
}

function extractState(segments) {
  const stateWords = [
    "default",
    "hover",
    "pressed",
    "active",
    "selected",
    "focus",
    "focus-visible",
    "disabled",
    "loading",
    "error",
    "success",
    "warning",
    "checked",
    "expanded",
  ];
  return segments.find((segment) => stateWords.includes(segment)) || "base";
}

function parseTokenMetadata(name) {
  if (normalizeTokenName(name).includes("-ref-")) {
    const segments = parseLayerSegments(name, "-ref-");
    const dimension = tokenDimensionFromSegments(segments);
    return {
      layer: "ref",
      dimension,
      roleSegments: segmentsAfterDimension(segments, dimension),
      component: "",
      componentCategory: "",
      slotCategory: semanticCategory(segments),
      state: "base",
    };
  }
  if (normalizeTokenName(name).includes("-sys-")) {
    const segments = parseLayerSegments(name, "-sys-");
    const dimension = tokenDimensionFromSegments(segments);
    const roleSegments = segmentsAfterDimension(segments, dimension);
    return {
      layer: "sys",
      dimension,
      roleSegments,
      component: "",
      componentCategory: "",
      slotCategory: semanticCategory(roleSegments),
      state: extractState(roleSegments),
    };
  }
  if (normalizeTokenName(name).includes("-comp-")) {
    const segments = parseLayerSegments(name, "-comp-");
    const { component, rest } = splitComponentSegments(segments);
    const dimension = tokenDimensionFromSegments(rest);
    const slotSegments = componentSlotSegments(rest, dimension);
    return {
      layer: "comp",
      dimension,
      roleSegments: slotSegments,
      component,
      componentCategory: componentCategory(component),
      slotCategory: semanticCategory(slotSegments),
      state: extractState(slotSegments),
    };
  }
  return {
    layer: "unknown",
    dimension: "unknown",
    roleSegments: [],
    component: "",
    componentCategory: "",
    slotCategory: "unknown",
    state: "base",
  };
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

function isInventoryTable(table) {
  return (
    includesHeader(table.headers, "component") &&
    includesHeader(table.headers, "status") &&
    includesHeader(table.headers, "notes")
  );
}

function cleanCell(value) {
  return String(value).replace(/<br\s*\/?>/gi, " ").replace(/`/g, "").trim();
}

function isUnresolvedDecision(value) {
  const cleaned = cleanCell(value);
  return unresolvedPattern.test(cleaned) || !decisionPattern.test(cleaned);
}

function tokenize(value) {
  return cleanCell(value)
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

function componentNameKey(value) {
  return cleanCell(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function componentNameFromSpec(file) {
  return path.basename(file, ".md");
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
      if (dimension && !unresolvedPattern.test(cleanCell(description))) {
        fingerprint.set(dimension, description);
      }
    }
  }
  return fingerprint;
}

function textForFingerprint(fingerprint, keys) {
  return keys.map((key) => fingerprint.get(key) || "").join(" ");
}

function candidateFromInventoryRow(entry) {
  const component = firstValue(entry.row, ["component"]);
  if (!component || /^[-—]$/.test(component.trim())) return null;
  const fingerprintSummary = firstValue(entry.row, ["fingerprint"]);
  const notes = firstValue(entry.row, ["notes"]);
  const tokens = firstValue(entry.row, ["required tokens", "tokens"]);
  const status = firstValue(entry.row, ["status"]);
  return {
    name: cleanCell(component),
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

function similarityScore(candidateA, candidateB) {
  const purpose = jaccard(tokenSet(candidateA.purpose), tokenSet(candidateB.purpose));
  const anatomy = jaccard(tokenSet(candidateA.anatomy), tokenSet(candidateB.anatomy));
  const variants = jaccard(tokenSet(candidateA.variants), tokenSet(candidateB.variants));
  const tokenContract = jaccard(tokenSet(candidateA.tokenContract), tokenSet(candidateB.tokenContract));
  const layout = jaccard(tokenSet(candidateA.layout), tokenSet(candidateB.layout));
  return {
    purpose,
    anatomy,
    variants,
    tokenContract,
    layout,
    weighted: purpose * 0.34 + anatomy * 0.26 + variants * 0.14 + tokenContract * 0.16 + layout * 0.1,
  };
}

function isSimilarComponentPair(score) {
  return (
    score.weighted >= 0.62 ||
    (score.weighted >= 0.5 && score.purpose >= 0.55 && score.anatomy >= 0.35)
  );
}

function rowMentionsPair(entry, candidateA, candidateB) {
  if (!candidateA.key || !candidateB.key) return false;
  const text = componentNameKey(entry.cells.join(" "));
  return text.includes(candidateA.key) && text.includes(candidateB.key);
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
const sysCss = await readOptional(sysTokensFile);
const compCss = await readOptional(compTokensFile);
const evidenceMapDoc = await readOptional(evidenceMapFile);
const architectureDoc = await readOptional(tokenArchitectureFile);
const inventoryDoc = await readOptional(inventoryFile);
const declarations = parseDeclarations(refCss || "");
const sysDeclarations = parseDeclarations(sysCss || "");
const compDeclarations = parseDeclarations(compCss || "");
const allDeclarations = new Map([...declarations, ...sysDeclarations, ...compDeclarations]);
const allProps = new Map(
  [...declarations, ...sysDeclarations, ...compDeclarations].map(([name, declaration]) => [
    name,
    declaration.value,
  ]),
);

function referencedTokens(value) {
  const refs = [];
  const pattern = /var\(\s*(--[A-Za-z0-9_-]+)/g;
  let match;
  while ((match = pattern.exec(value))) refs.push(match[1]);
  return refs;
}

function resolveTokenValue(name, seen = new Set()) {
  if (seen.has(name)) return { value: allProps.get(name) || "", chain: [name], cyclic: true };
  const value = allProps.get(name);
  if (!value) return { value: "", chain: [name], cyclic: false };
  const refs = referencedTokens(value);
  if (!refs.length) return { value: stripInlineComments(value), chain: [name], cyclic: false };
  const next = refs[0];
  const resolved = resolveTokenValue(next, new Set([...seen, name]));
  return {
    value: resolved.value,
    chain: [name, ...resolved.chain],
    cyclic: resolved.cyclic,
  };
}

function valueProximity(a, b) {
  const colorA = parseColor(a);
  const colorB = parseColor(b);
  if (colorA && colorB) {
    const alphaDiff = Math.abs(colorA.a - colorB.a);
    const deltaE = deltaE76(colorA, colorB);
    return {
      near: alphaDiff <= NEAR_COLOR_ALPHA_DELTA && deltaE <= NEAR_COLOR_DELTA_E,
      label: `deltaE ${formatNumber(deltaE)}`,
    };
  }
  const numberA = parseNumericValue(a);
  const numberB = parseNumericValue(b);
  if (numberA && numberB && numberA.unitGroup === numberB.unitGroup) {
    const diff = Math.abs(numberA.normalized - numberB.normalized);
    return {
      near: isNearNumericValue(numberA, numberB),
      label: `${formatNumber(diff)} ${numberA.unitGroup}`,
    };
  }
  const normalizedA = normalizeTokenValue(a);
  const normalizedB = normalizeTokenValue(b);
  return {
    near: normalizedA !== "" && normalizedA === normalizedB,
    label: normalizedA === normalizedB ? "exact resolved value" : "different values",
  };
}

function usageSimilarity(a, b) {
  if (a.meta.layer !== b.meta.layer || a.meta.dimension !== b.meta.dimension) return 0;
  const roleText = jaccardSet(tokenTextSet(a.meta.roleSegments), tokenTextSet(b.meta.roleSegments));
  const slotMatch = a.meta.slotCategory === b.meta.slotCategory ? 1 : 0;
  const stateMatch = a.meta.state === b.meta.state ? 1 : 0;
  if (a.meta.layer === "sys") return slotMatch * 0.55 + stateMatch * 0.15 + roleText * 0.3;
  if (a.meta.layer === "comp") {
    const componentMatch =
      a.meta.component === b.meta.component
        ? 1
        : a.meta.componentCategory === b.meta.componentCategory
          ? 0.72
          : 0;
    return componentMatch * 0.35 + slotMatch * 0.28 + stateMatch * 0.17 + roleText * 0.2;
  }
  return 0;
}

function tokenPurposeLabel(token) {
  if (token.meta.layer === "comp") {
    return `${token.meta.componentCategory}/${token.meta.slotCategory}/${token.meta.state}`;
  }
  return `${token.meta.slotCategory}/${token.meta.state}`;
}

function usageAwareCandidatesForLayer(layer, layerDeclarations) {
  return [...layerDeclarations].map(([name, declaration]) => {
    const resolved = resolveTokenValue(name);
    return {
      name,
      value: declaration.value,
      resolvedValue: resolved.value,
      chain: resolved.chain,
      meta: parseTokenMetadata(name),
      layer,
    };
  });
}

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

function exactAliasRowsForLayer(layer, layerDeclarations, groupKeyFor) {
  const groups = new Map();
  for (const [name, declaration] of layerDeclarations) {
    const normalizedValue = normalizeTokenValue(declaration.value);
    if (!normalizedValue || normalizedValue.includes("calc(")) continue;
    const key = groupKeyFor(name, declaration.value);
    const group = groups.get(key) || [];
    group.push({ name, value: declaration.value });
    groups.set(key, group);
  }

  const rows = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    for (let firstIndex = 0; firstIndex < group.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < group.length; secondIndex += 1) {
        const first = group[firstIndex];
        const second = group[secondIndex];
        const hasDecision =
          hasCssReviewDecision(allDeclarations.get(first.name), allDeclarations.get(second.name)) ||
          hasArchitectureReviewDecision(architectureDoc, first.name, second.name);
        rows.push({
          layer,
          first,
          second,
          status: decisionStatus(hasDecision),
        });
      }
    }
  }
  return rows;
}

const exactAliasRows = [
  ...exactAliasRowsForLayer("System", sysDeclarations, sysDuplicateGroupKey),
  ...exactAliasRowsForLayer("Component", compDeclarations, compDuplicateGroupKey),
];

function usageAwareRowsForLayer(layer, layerDeclarations) {
  const tokens = usageAwareCandidatesForLayer(layer, layerDeclarations).filter(
    (token) => token.resolvedValue && token.meta.dimension !== "unknown",
  );
  const rows = [];
  const threshold = layer === "sys" ? 0.52 : 0.58;
  for (let firstIndex = 0; firstIndex < tokens.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < tokens.length; secondIndex += 1) {
      const first = tokens[firstIndex];
      const second = tokens[secondIndex];
      if (first.value && second.value && normalizeTokenValue(first.value) === normalizeTokenValue(second.value)) {
        continue;
      }
      const similarity = usageSimilarity(first, second);
      if (similarity < threshold) continue;
      const proximity = valueProximity(first.resolvedValue, second.resolvedValue);
      if (!proximity.near) continue;
      const hasDecision =
        hasCssReviewDecision(allDeclarations.get(first.name), allDeclarations.get(second.name)) ||
        hasArchitectureReviewDecision(architectureDoc, first.name, second.name);
      rows.push({
        layer,
        first,
        second,
        similarity,
        proximity,
        status: decisionStatus(hasDecision),
      });
    }
  }
  return rows;
}

const usageAwareRows = [
  ...usageAwareRowsForLayer("sys", sysDeclarations),
  ...usageAwareRowsForLayer("comp", compDeclarations),
];

const componentRows = [];
const componentCandidates = [];
const explicitComponentReviewRows = [];
if (inventoryDoc) {
  const inventoryTables = parseTables(inventoryDoc).filter(isInventoryTable);
  for (const table of inventoryTables) {
    for (const entry of table.rows) {
      const candidate = candidateFromInventoryRow(entry);
      if (candidate) componentCandidates.push(candidate);
    }
  }

  const similarityTables = parseTables(inventoryDoc).filter(isSimilarityTable);
  for (const table of similarityTables) {
    for (const entry of table.rows) {
      explicitComponentReviewRows.push(entry);
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

for (const file of await listMarkdownDocs(componentDocsDir)) {
  const content = await readOptional(file);
  if (!content || !/^##\s+Component Fingerprint\b/im.test(content)) continue;
  componentCandidates.push(candidateFromSpec(file, content));
}

for (let firstIndex = 0; firstIndex < componentCandidates.length; firstIndex += 1) {
  for (let secondIndex = firstIndex + 1; secondIndex < componentCandidates.length; secondIndex += 1) {
    const first = componentCandidates[firstIndex];
    const second = componentCandidates[secondIndex];
    if (first.key && first.key === second.key) continue;
    if (fingerprintWordCount(first) < 5 || fingerprintWordCount(second) < 5) continue;
    const score = similarityScore(first, second);
    if (!isSimilarComponentPair(score)) continue;
    const documentedRow = explicitComponentReviewRows.find((entry) => rowMentionsPair(entry, first, second));
    if (documentedRow) continue;
    componentRows.push({
      candidate: `${first.name} (${first.source})`,
      similar: `${second.name} (${second.source})`,
      visual: first.visual || second.visual || "",
      reason: `Auto-detected fingerprint similarity: score ${score.weighted.toFixed(2)}, purpose ${score.purpose.toFixed(
        2,
      )}, anatomy ${score.anatomy.toFixed(2)}, token contract ${score.tokenContract.toFixed(2)}.`,
      suggested: "merge / make variant / keep distinct / blocked",
      decision: "",
      rationale: "",
      status: "needs-review",
    });
  }
}

const counts = {
  sources: sourceRows.length,
  colorScaleIssues: colorScaleIssues.length,
  nearColors: nearColorRows.length,
  nearNumbers: nearNumberRows.length,
  exactAliases: exactAliasRows.length,
  usageAwareTokens: usageAwareRows.length,
  components: componentRows.length,
  needsReview:
    sourceRows.filter((row) => row.status === "needs-review").length +
    colorScaleIssues.length +
    nearColorRows.filter((row) => row.status === "needs-review").length +
    nearNumberRows.filter((row) => row.status === "needs-review").length +
    exactAliasRows.filter((row) => row.status === "needs-review").length +
    usageAwareRows.filter((row) => row.status === "needs-review").length +
    componentRows.filter((row) => row.status === "needs-review").length,
};

function css() {
  return `
    :root {
      color-scheme: light;
      --bg: #f5f5f7;
      --surface: rgba(255, 255, 255, 0.82);
      --surface-solid: #ffffff;
      --surface-subtle: #f2f2f7;
      --surface-elevated: rgba(255, 255, 255, 0.92);
      --text: #1d1d1f;
      --muted: #6e6e73;
      --muted-2: #86868b;
      --border: rgba(0, 0, 0, 0.11);
      --border-strong: rgba(0, 0, 0, 0.2);
      --accent: #0071e3;
      --accent-soft: rgba(0, 113, 227, 0.12);
      --warning: #b35a00;
      --warning-soft: rgba(255, 149, 0, 0.16);
      --issue: #d70015;
      --issue-soft: rgba(215, 0, 21, 0.12);
      --success-soft: rgba(52, 199, 89, 0.13);
      --code: rgba(118, 118, 128, 0.12);
      --shadow-soft: 0 18px 50px rgba(0, 0, 0, 0.08);
      --shadow-table: 0 1px 2px rgba(0, 0, 0, 0.04), 0 14px 34px rgba(0, 0, 0, 0.06);
    }
    * { box-sizing: border-box; }
    html {
      background: var(--bg);
      scroll-behavior: smooth;
    }
    body {
      margin: 0;
      background:
        radial-gradient(circle at top right, rgba(0, 113, 227, 0.10), transparent 360px),
        linear-gradient(180deg, #fbfbfd 0%, var(--bg) 42%, var(--bg) 100%);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", "Noto Sans TC", "Noto Sans JP", sans-serif;
      line-height: 1.55;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }
    a {
      color: var(--accent);
      text-decoration: none;
    }
    a:hover { text-decoration: underline; }
    .layout {
      display: grid;
      grid-template-columns: 292px minmax(0, 1fr);
      gap: 0;
      min-height: 100vh;
    }
    aside {
      position: sticky;
      top: 0;
      height: 100vh;
      overflow: auto;
      padding: 30px 18px;
      border-right: 1px solid var(--border);
      background: rgba(245, 245, 247, 0.72);
      backdrop-filter: saturate(180%) blur(24px);
      -webkit-backdrop-filter: saturate(180%) blur(24px);
    }
    main {
      width: min(1180px, 100%);
      padding: 42px 38px 84px;
    }
    .brand {
      margin: 0 0 6px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0;
    }
    .subtitle {
      margin: 0 0 24px;
      color: var(--muted-2);
      font-size: 12px;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }
    nav {
      display: grid;
      gap: 4px;
    }
    nav a {
      display: flex;
      min-height: 34px;
      align-items: center;
      border-radius: 10px;
      padding: 7px 10px;
      color: var(--muted);
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
    }
    nav a:hover {
      background: rgba(0, 0, 0, 0.045);
      color: var(--text);
      text-decoration: none;
    }
    .hero {
      padding: 2px 0 30px;
      border-top: 0;
      border-bottom: 1px solid var(--border);
      margin-bottom: 22px;
    }
    h1 {
      max-width: 840px;
      margin: 0 0 14px;
      font-size: clamp(38px, 5vw, 64px);
      font-weight: 700;
      line-height: 1.03;
      letter-spacing: 0;
    }
    .hero p {
      max-width: 760px;
      margin: 0;
      color: var(--muted);
      font-size: 18px;
      line-height: 1.45;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(156px, 1fr));
      gap: 12px;
      margin: 0 0 18px;
    }
    .metric {
      min-height: 96px;
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 16px 16px 15px;
      background: var(--surface-elevated);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.035);
    }
    .metric strong {
      display: block;
      margin-bottom: 8px;
      font-size: 30px;
      font-weight: 700;
      line-height: 0.95;
      letter-spacing: 0;
    }
    .metric span {
      color: var(--muted);
      font-size: 12px;
      font-weight: 600;
    }
    section {
      padding: 28px 0;
      border-top: 1px solid var(--border);
    }
    h2 {
      margin: 0 0 8px;
      font-size: 28px;
      font-weight: 700;
      line-height: 1.12;
      letter-spacing: 0;
    }
    .section-lead {
      max-width: 820px;
      margin: 0 0 16px;
      color: var(--muted);
      font-size: 14px;
    }
    .table-wrap {
      overflow: auto;
      border: 1px solid var(--border);
      border-radius: 18px;
      margin: 18px 0 0;
      background: var(--surface-solid);
      box-shadow: var(--shadow-table);
    }
    table {
      width: 100%;
      min-width: 820px;
      border-collapse: separate;
      border-spacing: 0;
    }
    th, td {
      padding: 13px 14px;
      border-bottom: 1px solid var(--border);
      text-align: left;
      vertical-align: top;
      font-size: 13px;
    }
    th {
      position: sticky;
      top: 0;
      z-index: 1;
      background: rgba(242, 242, 247, 0.92);
      color: var(--muted);
      backdrop-filter: saturate(180%) blur(16px);
      -webkit-backdrop-filter: saturate(180%) blur(16px);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0;
    }
    tbody tr:hover { background: rgba(0, 113, 227, 0.035); }
    tr:last-child td { border-bottom: 0; }
    code {
      display: inline-block;
      max-width: 100%;
      border-radius: 7px;
      background: var(--code);
      padding: 2px 6px;
      color: var(--text);
      font-family: "SF Mono", ui-monospace, Menlo, Consolas, monospace;
      font-size: 0.91em;
      overflow-wrap: anywhere;
    }
    small {
      display: inline-block;
      max-width: 460px;
      color: var(--muted-2);
      font-size: 11px;
      line-height: 1.45;
      overflow-wrap: anywhere;
    }
    .status {
      display: inline-flex;
      min-height: 24px;
      align-items: center;
      border: 1px solid transparent;
      border-radius: 999px;
      padding: 3px 9px;
      color: var(--muted);
      background: var(--surface-subtle);
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    }
    .status.needs-review {
      border-color: rgba(255, 149, 0, 0.26);
      background: var(--warning-soft);
      color: var(--warning);
    }
    .status.issue {
      border-color: rgba(215, 0, 21, 0.22);
      background: var(--issue-soft);
      color: var(--issue);
    }
    .status.documented {
      border-color: rgba(52, 199, 89, 0.2);
      background: var(--success-soft);
      color: #1d7f3b;
    }
    .swatch-pair {
      display: grid;
      grid-template-columns: 32px minmax(0, 1fr);
      gap: 9px;
      align-items: center;
      min-width: 180px;
    }
    .swatch {
      width: 30px;
      height: 30px;
      border: 1px solid var(--border-strong);
      border-radius: 9px;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
    }
    .review-image {
      display: block;
      max-width: min(220px, 100%);
      max-height: 160px;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: var(--surface-solid);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
      object-fit: contain;
    }
    .empty {
      margin: 14px 0 0;
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 16px;
      background: var(--surface-elevated);
      color: var(--muted);
      font-size: 14px;
    }
    @media (max-width: 900px) {
      .layout { display: block; }
      aside {
        position: relative;
        height: auto;
        border-right: 0;
        border-bottom: 1px solid var(--border);
        padding: 20px 16px 16px;
      }
      nav {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      nav a { min-height: 36px; }
      main { padding: 28px 16px 56px; }
      h1 { font-size: 40px; }
      h2 { font-size: 24px; }
      .hero p { font-size: 16px; }
      .summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .metric { min-height: 88px; }
    }
    @media (max-width: 560px) {
      nav { grid-template-columns: 1fr; }
      .summary { grid-template-columns: 1fr; }
      th, td { padding: 11px 12px; }
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

const exactAliasTableRows = exactAliasRows.map(({ layer, first, second, status }) => `<tr>
  <td>${escapeHtml(layer)}</td>
  <td><code>${escapeHtml(first.name)}</code><br>${escapeHtml(first.value)}</td>
  <td><code>${escapeHtml(second.name)}</code><br>${escapeHtml(second.value)}</td>
  <td>${statusBadge(status)}</td>
</tr>`);

const usageAwareTableRows = usageAwareRows.map(
  ({ layer, first, second, similarity, proximity, status }) => `<tr>
  <td>${escapeHtml(layer)}</td>
  <td><code>${escapeHtml(first.name)}</code><br>${escapeHtml(tokenPurposeLabel(first))}<br><small>${escapeHtml(
    first.chain.join(" -> "),
  )}</small><br><code>${escapeHtml(first.resolvedValue)}</code></td>
  <td><code>${escapeHtml(second.name)}</code><br>${escapeHtml(tokenPurposeLabel(second))}<br><small>${escapeHtml(
    second.chain.join(" -> "),
  )}</small><br><code>${escapeHtml(second.resolvedValue)}</code></td>
  <td><code>${escapeHtml(formatNumber(similarity))}</code></td>
  <td>${escapeHtml(proximity.label)}</td>
  <td>${statusBadge(status)}</td>
</tr>`,
);

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
        <a href="#exact-aliases">Exact Token Aliases</a>
        <a href="#usage-aware-tokens">Usage-Aware Tokens</a>
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
        <div class="metric"><strong>${counts.exactAliases}</strong><span>Exact aliases</span></div>
        <div class="metric"><strong>${counts.usageAwareTokens}</strong><span>Usage-aware pairs</span></div>
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

      <section id="exact-aliases">
        <h2>Exact Token Aliases</h2>
        <p class="section-lead">System tokens with the same semantic dimension and component tokens within the same component/dimension are listed when they resolve to the same value.</p>
        ${tableHtml(["Layer", "Token A", "Token B", "Status"], exactAliasTableRows, "No exact system or component alias duplicates found.")}
      </section>

      <section id="usage-aware-tokens">
        <h2>Usage-Aware Tokens</h2>
        <p class="section-lead">Rows compare system and component token purpose, inheritance chain, and resolved raw value. These catch near-duplicates that are hidden behind different reference tokens.</p>
        ${tableHtml(["Layer", "Token A", "Token B", "Usage score", "Resolved value match", "Status"], usageAwareTableRows, "No usage-aware token review pairs found.")}
      </section>

      <section id="components">
        <h2>Similar Components</h2>
        <p class="section-lead">Rows come from <code>COMPONENT_INVENTORY.md</code> plus automatic fingerprint comparison across the inventory and component specs. Link source-based previews or screenshot crops when available.</p>
        ${tableHtml(["Candidate", "Similar existing", "Visual reference", "Reason", "Suggested action", "Developer decision", "Rationale"], componentTableRows, "No component similarity review rows found.")}
      </section>
    </main>
  </div>
</body>
</html>
`;

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
console.log(`Exact token aliases: ${counts.exactAliases}`);
console.log(`Usage-aware token pairs: ${counts.usageAwareTokens}`);
console.log(`Component similarity rows: ${counts.components}`);
console.log(`Assets copied: ${copiedAssets ? "yes" : "no"}`);
