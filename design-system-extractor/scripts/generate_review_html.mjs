#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import {
  NEAR_COLOR_DELTA_E,
  TIERS,
  applyCommand,
  buildTokenClusters,
  countVarReferences,
  decisionRowMarkdown,
  fitLengthScale,
  formatDistance,
  groupConnected,
  scaleFitSummaryLine,
} from "./lib/token_review.mjs";

const USAGE = `Usage: node <skill-root>/scripts/generate_review_html.mjs <target-root> [output.html] [--json]

Builds the visual review queue (duplicate sources, color scale issues, near color
and near number reference token clusters, scale fit, similar components) from
design-system/*.md and tokens/*.css. Default output: <target-root>/docs/design-system/review.html.
Near tokens are shown as one card per cluster (canonical token, members tiered
auto / proposal / must-ask) with a copy button per tier that yields the Near Token
Decisions rows apply_token_decisions.mjs would write. Similar component rows are
grouped into contact sheets. Decision detection follows audit_tokens.mjs: a
token-review: or a11y-remap CSS comment, or a TOKEN_ARCHITECTURE.md line naming
the member together with the canonical, marks a member documented.

Options:
  --json      Print {counts, needsReview, clusters} as one JSON object on stdout and write no files.
  --help, -h  Print this message and exit 0.`;

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(USAGE);
  process.exit(0);
}
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
const sysTokensFile = path.join(tokensDir, "tokens-sys.css");
const compTokensFile = path.join(tokensDir, "tokens-comp.css");

const LIGHTNESS_TOLERANCE = 0.01;

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
  // Same regex as audit_tokens.mjs: the trailing comment may only sit on the same
  // line as the declaration; letting it cross newlines would steal the next
  // declaration's leading comment and the two tools would disagree.
  const pattern = /(?:\/\*([\s\S]*?)\*\/\s*)?(--[A-Za-z0-9_-]+)\s*:\s*([^;]+);(?:[ \t]*\/\*([\s\S]*?)\*\/)?/g;
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

function reviewTextForDeclaration(declaration) {
  if (!declaration) return "";
  return `${declaration.leadingComment}\n${declaration.trailingComment}`;
}

// Decision rules mirror audit_tokens.mjs so review.html never shows "Needs review"
// for a pair the strict audit already accepts.
function hasCssReviewDecision(declarationA, declarationB) {
  const text = `${reviewTextForDeclaration(declarationA)}\n${reviewTextForDeclaration(declarationB)}`;
  return (
    /token-review\s*:\s*(?:keep|keep-distinct|merge|merge-with|approved|separate|split)/i.test(
      text,
    ) || /a11y-remap/i.test(text)
  );
}

function hasArchitectureReviewDecision(architectureDoc, tokenA, tokenB) {
  if (!architectureDoc) return false;
  const first = tokenA.toLowerCase();
  const second = tokenB.toLowerCase();
  const lines = architectureDoc.toLowerCase().split(/\r?\n/);
  let inRemapSection = false;
  return lines.some((line) => {
    if (/^#{1,6}\s/.test(line)) {
      inRemapSection = /accessibility remap/.test(line);
    }
    if (!line.includes(first) || !line.includes(second)) return false;
    if (inRemapSection || line.includes("a11y-remap")) return true;
    return /merge|merged|keep|distinct|separate|split|approved|合併|保留|拆開|分開|確認/.test(
      line,
    );
  });
}

function decisionStatus(hasDecision) {
  return hasDecision ? "documented" : "needs-review";
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
const sysCss = await readOptional(sysTokensFile);
const compCss = await readOptional(compTokensFile);
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

const referenceNumbers = [];
for (const [name, declaration] of declarations) {
  if (parseColor(declaration.value)) continue;
  const numeric = parseNumericValue(declaration.value);
  if (!numeric) continue;
  referenceNumbers.push({ name, value: declaration.value, family: parseReferenceFamily(name), numeric });
}

// Near tokens come from the shared cluster module, so the page shows exactly the
// canonical, tiers and proposals the audit reports.
const varCounts = countVarReferences([sysCss || "", compCss || ""]);
const { clusters, counts: clusterCounts } = buildTokenClusters({
  colors: referenceColors,
  numbers: referenceNumbers,
  declarations,
  varCounts,
  hasDecision: (member, canonical) =>
    hasCssReviewDecision(declarations.get(member), declarations.get(canonical)) ||
    hasArchitectureReviewDecision(architectureDoc, member, canonical),
});
const colorClusters = clusters.filter((cluster) => cluster.kind === "color");
const numberClusters = clusters.filter((cluster) => cluster.kind === "number");
const memberRows = (list) =>
  list.flatMap((cluster) =>
    cluster.members.map((member) => ({ cluster, member, status: decisionStatus(member.documented) })),
  );
const nearColorRows = memberRows(colorClusters);
const nearNumberRows = memberRows(numberClusters);
const scaleFit = fitLengthScale(referenceNumbers);

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

// Similarity rows grouped by the components they connect: one contact sheet per
// group, so a candidate compared against several existing components is one decision.
const componentGroups = groupConnected(componentRows, (row) => [
  cleanCell(row.candidate || "").toLowerCase(),
  cleanCell(row.similar || "").toLowerCase(),
]).map((group) => {
  const components = [];
  for (const row of group.items) {
    for (const name of [row.candidate, row.similar]) {
      const cleaned = cleanCell(name || "");
      if (cleaned && !components.includes(cleaned)) components.push(cleaned);
    }
  }
  return {
    components,
    rows: group.items,
    status: group.items.some((row) => row.status === "needs-review") ? "needs-review" : "documented",
  };
});

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
  for (const { cluster, member, status } of nearColorRows) {
    if (status !== "needs-review") continue;
    entries.push({
      kind: "near-color",
      status,
      tokenA: { name: cluster.canonical.name, value: cluster.canonical.value },
      tokenB: { name: member.name, value: member.value },
      deltaE: Number(formatDistance(member.distance)),
      cluster: cluster.id,
      tier: member.tier,
      proposed: member.proposed,
    });
  }
  for (const { cluster, member, status } of nearNumberRows) {
    if (status !== "needs-review") continue;
    entries.push({
      kind: "near-number",
      status,
      tokenA: { name: cluster.canonical.name, value: cluster.canonical.value },
      tokenB: { name: member.name, value: member.value },
      difference: Number(formatDistance(member.distance)),
      unitGroup: cluster.unitGroup,
      cluster: cluster.id,
      tier: member.tier,
      proposed: member.proposed,
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
    .tier {
      display: inline-block;
      border: 1px solid transparent;
      border-radius: 6px;
      padding: 3px 8px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .tier-auto { background: #e4f3ea; color: var(--accent); border-color: #b9dcc5; }
    .tier-proposal { background: #fbf0d9; color: var(--warning); border-color: #e9cf9a; }
    .tier-must-ask { background: #fae3e0; color: var(--issue); border-color: #e6b3ab; }
    .cluster {
      margin: 14px 0;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface);
      overflow: hidden;
    }
    .cluster-head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px 14px;
      padding: 12px 14px;
      border-bottom: 1px solid var(--border);
      background: var(--surface-subtle);
    }
    .cluster-id { font-size: 13px; font-weight: 800; }
    .cluster-meta { color: var(--muted); font-size: 13px; }
    .cluster .table-wrap { margin: 0; border: 0; border-radius: 0; }
    .cluster table { min-width: 720px; }
    .copy-block {
      display: grid;
      gap: 8px;
      margin: 14px 0;
      padding: 12px 14px;
      border: 1px dashed var(--border-strong);
      border-radius: 8px;
    }
    .copy-block button {
      justify-self: start;
      border: 1px solid var(--border-strong);
      border-radius: 6px;
      padding: 6px 12px;
      background: var(--surface);
      color: var(--text);
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }
    .copy-block button:hover { background: var(--surface-subtle); }
    .copy-block textarea {
      width: 100%;
      min-height: 120px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
    }
    .copy-block code { user-select: all; }
    .group {
      margin: 14px 0;
      padding: 12px 14px;
      border: 1px solid var(--border);
      border-radius: 8px;
    }
    .group h3 {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px 12px;
      margin: 0 0 6px;
      font-size: 16px;
    }
    .contact-sheet {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin: 10px 0;
    }
    .contact-sheet figure {
      display: grid;
      gap: 4px;
      max-width: 240px;
      margin: 0;
    }
    .contact-sheet figcaption { color: var(--muted); font-size: 12px; }
    .scale-list { margin: 8px 0 0; padding-left: 18px; }
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

function tierBadge(tier) {
  return `<span class="tier tier-${escapeAttr(tier)}">${escapeHtml(tier)}</span>`;
}

function tokenCell(cluster, name, value) {
  if (cluster.kind === "color") return swatchHtml(value, `${name}: ${value}`);
  return `<code>${escapeHtml(name)}</code><br>${escapeHtml(value)}`;
}

function clusterCardHtml(cluster) {
  const canonical = cluster.canonical;
  const memberRowsHtml = cluster.members.map(
    (member) => `<tr>
  <td>${tokenCell(cluster, member.name, member.value)}</td>
  <td>${escapeHtml(member.provenance)}</td>
  <td><code>${escapeHtml(String(member.usage))}</code></td>
  <td><code>${escapeHtml(member.distanceLabel)}</code></td>
  <td>${tierBadge(member.tier)}</td>
  <td>${member.proposed ? escapeHtml(member.proposed) : "<em>developer decides</em>"}</td>
  <td>${statusBadge(member.documented ? "documented" : "needs-review")}</td>
</tr>`,
  );
  return `<article class="cluster" id="cluster-${escapeAttr(cluster.id)}" data-tier="${escapeAttr(cluster.tier)}" data-kind="${escapeAttr(cluster.kind)}">
  <header class="cluster-head">
    <span class="cluster-id">${escapeHtml(cluster.id)}</span>
    ${tierBadge(cluster.tier)}
    ${tokenCell(cluster, canonical.name, canonical.value)}
    <span class="cluster-meta">canonical · ${escapeHtml(canonical.provenance)} · usage ${escapeHtml(String(canonical.usage))} · family ${escapeHtml(cluster.family)}</span>
  </header>
  ${tableHtml(["Member", "Provenance", "Usage", "Distance to canonical", "Tier", "Proposed decision", "Status"], memberRowsHtml, "No members.")}
</article>`;
}

// One copy block per tier that still has undocumented members: the textarea holds
// the Near Token Decisions rows apply_token_decisions.mjs would write for that tier.
function copyBlocksHtml(sectionClusters, sectionKey) {
  const blocks = [];
  for (const tier of TIERS) {
    const rows = [];
    for (const cluster of sectionClusters) {
      for (const member of cluster.members) {
        if (member.documented || member.tier !== tier) continue;
        const decision = tier === "auto" ? "merge" : tier === "proposal" ? member.proposed : "<merge | keep distinct>";
        const confirmedBy = tier === "auto" ? "auto-tier" : "<developer>";
        rows.push(decisionRowMarkdown({ cluster, member, decision, confirmedBy }));
      }
    }
    if (!rows.length) continue;
    const id = `copy-${sectionKey}-${tier}`;
    blocks.push(`<div class="copy-block" data-tier="${escapeAttr(tier)}">
  <div>${tierBadge(tier)} <strong>${rows.length}</strong> undocumented member${rows.length === 1 ? "" : "s"}</div>
  <button type="button" data-copy="${escapeAttr(id)}">Copy ${escapeHtml(tier)} decisions as markdown</button>
  <textarea id="${escapeAttr(id)}" hidden readonly aria-label="${escapeAttr(tier)} decision rows">${escapeHtml(rows.join("\n"))}</textarea>
  <div class="cluster-meta">Or let the script write them: <code>${escapeHtml(applyCommand(tier))}</code></div>
</div>`);
  }
  return blocks.join("\n");
}

function clusterSectionHtml(sectionClusters, sectionKey, emptyMessage) {
  if (!sectionClusters.length) return `<p class="empty">${escapeHtml(emptyMessage)}</p>`;
  return `${copyBlocksHtml(sectionClusters, sectionKey)}\n${sectionClusters.map(clusterCardHtml).join("\n")}`;
}

function componentGroupHtml(group) {
  const sheet = group.rows
    .map(
      (row) => `<figure>${formatInline(row.visual || "")}<figcaption>${formatInline(row.candidate || "candidate")} vs ${formatInline(row.similar || "similar component")}</figcaption></figure>`,
    )
    .join("");
  const rows = group.rows.map(
    (row) => `<tr>
  <td>${formatInline(row.candidate || "candidate")}</td>
  <td>${formatInline(row.similar || "similar component")}</td>
  <td>${formatInline(row.visual || "")}</td>
  <td>${formatInline(row.reason || "")}</td>
  <td>${formatInline(row.suggested || "")}</td>
  <td>${formatInline(row.decision || "")}<br>${statusBadge(row.status)}</td>
  <td>${formatInline(row.rationale || "")}</td>
</tr>`,
  );
  return `<div class="group" data-status="${escapeAttr(group.status)}">
  <h3>${group.components.map((name) => escapeHtml(name)).join(" · ")} ${statusBadge(group.status)}</h3>
  <div class="contact-sheet">${sheet}</div>
  ${tableHtml(["Candidate", "Similar existing", "Visual reference", "Reason", "Suggested action", "Developer decision", "Rationale"], rows, "No rows.")}
</div>`;
}

const colorScaleRows = colorScaleIssues.map(({ family, lighterStepToken, darkerStepToken }) => `<tr>
  <td><code>${escapeHtml(family)}</code></td>
  <td>${swatchHtml(lighterStepToken.value, `${lighterStepToken.name}: ${lighterStepToken.value}`)}</td>
  <td>${swatchHtml(darkerStepToken.value, `${darkerStepToken.name}: ${darkerStepToken.value}`)}</td>
  <td>${statusBadge("issue")}</td>
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

const scaleFitHtml = scaleFit
  ? `<p class="section-lead">${escapeHtml(scaleFitSummaryLine(scaleFit))}. Near-grid: ${scaleFit.nearGrid.length}. Excluded: ${scaleFit.excluded.length} (hairlines and values above 512px).</p>
${
  scaleFit.outliers.length
    ? `<ul class="scale-list">${scaleFit.outliers
        .map(
          (entry) =>
            `<li><code>${escapeHtml(entry.name)}</code> ${escapeHtml(entry.value)}, nearest step ${escapeHtml(String(entry.nearest))}px (${entry.residual > 0 ? "+" : ""}${escapeHtml(String(entry.residual))}). Snap it or record why the value is intentional.</li>`,
        )
        .join("")}</ul>`
    : `<p class="empty">Every fitted length sits on the ${scaleFit.base}px grid.</p>`
}`
  : `<p class="empty">No length reference tokens to fit.</p>`;

const clusterTierSummary = `auto ${clusterCounts.tiers.auto}, proposal ${clusterCounts.tiers.proposal}, must-ask ${clusterCounts.tiers["must-ask"]}`;

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
        <a href="#scale-fit">Scale Fit</a>
        <a href="#components">Similar Components</a>
      </nav>
    </aside>
    <main>
      <section class="hero" id="overview">
        <h1>Design System Review Queue</h1>
        <p>這份文件彙整萃取時需要設計或開發者審查的候選項目：重複來源、色階問題、以群為單位的相近 token（canonical 加上 auto / proposal / must-ask 三層成員）、長度 scale 擬合，以及外觀或功能相近的 component。</p>
      </section>

      <div class="summary" aria-label="Review summary">
        <div class="metric"><strong>${counts.needsReview}</strong><span>Needs review</span></div>
        <div class="metric"><strong>${clusterCounts.clusters}</strong><span>Near token clusters (${escapeHtml(clusterTierSummary)})</span></div>
        <div class="metric"><strong>${counts.sources}</strong><span>Duplicate sources</span></div>
        <div class="metric"><strong>${counts.colorScaleIssues}</strong><span>Color scale issues</span></div>
        <div class="metric"><strong>${counts.nearColors}</strong><span>Near color members</span></div>
        <div class="metric"><strong>${counts.nearNumbers}</strong><span>Near number members</span></div>
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
        <p class="section-lead">Colors within deltaE2000 ${NEAR_COLOR_DELTA_E} form a cluster around one canonical token. Auto members merge mechanically, proposal members carry a default to accept or override in one batch, must-ask members need a design decision.</p>
        ${clusterSectionHtml(colorClusters, "colors", "No near color token clusters found; nothing to review.")}
      </section>

      <section id="near-numbers">
        <h2>Near Number Tokens</h2>
        <p class="section-lead">Spacing, type, radius, opacity, and motion values in the same family are clustered when numerically close.</p>
        ${clusterSectionHtml(numberClusters, "numbers", "No near numeric token clusters found; nothing to review.")}
      </section>

      <section id="scale-fit">
        <h2>Scale Fit</h2>
        ${scaleFitHtml}
      </section>

      <section id="components">
        <h2>Similar Components</h2>
        <p class="section-lead">Rows come from <code>COMPONENT_INVENTORY.md</code>, grouped by the components they connect so every group reads as one contact sheet. Source-based previews or screenshot crops should be linked when available.</p>
        ${componentGroups.length ? componentGroups.map(componentGroupHtml).join("\n") : '<p class="empty">No component similarity review rows found.</p>'}
      </section>
    </main>
  </div>
  <script>
    for (const button of document.querySelectorAll("button[data-copy]")) {
      button.addEventListener("click", async () => {
        const source = document.getElementById(button.dataset.copy);
        if (!source) return;
        try {
          await navigator.clipboard.writeText(source.value);
          button.textContent = "Copied";
        } catch (error) {
          source.hidden = false;
          source.focus();
          source.select();
          button.textContent = "Select the rows below and copy";
        }
      });
    }
  </script>
</body>
</html>
`;

if (jsonMode) {
  // Machine-readable mode keeps stdout to a single JSON object and writes no
  // files, so a caller can parse it without cleaning up generated output.
  console.log(
    JSON.stringify(
      {
        counts,
        needsReview: needsReviewEntries(),
        clusters: {
          counts: clusterCounts,
          colors: colorClusters,
          numbers: numberClusters,
          components: componentGroups,
          scaleFit,
        },
      },
      null,
      2,
    ),
  );
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
  console.log(`Near token clusters: ${clusterCounts.clusters} (${clusterTierSummary})`);
  console.log(`Near color members: ${counts.nearColors}`);
  console.log(`Near number members: ${counts.nearNumbers}`);
  const scaleLine = scaleFitSummaryLine(scaleFit);
  if (scaleLine) console.log(scaleLine);
  console.log(`Component similarity rows: ${counts.components}`);
  console.log(`Component similarity clusters: ${componentGroups.length}`);
  console.log(`Assets copied: ${copiedAssets ? "yes" : "no"}`);
}
