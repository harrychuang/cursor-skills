#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import {
  buildTokenClusters,
  clusterSummaryLine,
  countVarReferences,
  fitLengthScale,
  formatDistance,
  scaleFitOutlierLine,
  scaleFitSummaryLine,
} from "./lib/token_review.mjs";

const USAGE = `Usage: node <skill-root>/scripts/audit_tokens.mjs <target-root> [--strict] [--json]

Audits tokens/tokens-ref.css, tokens-sys.css, tokens-comp.css and tokens.css:
- layer rules: --<prefix>-ref-* holds raw values only (no semantic or component words in the
  name); --<prefix>-sys-* references ref tokens only; --<prefix>-comp-* references sys tokens only
- reference colors are --<prefix>-ref-color-<family>-<step> with step 0-100, 100 lightest -> 0 darkest
- background-like system colors need an on-<role> foreground pair
- near reference colors (deltaE2000 <= 3) and near numbers in one family are grouped into
  clusters with one canonical token; every other member needs a documented decision against
  the canonical: a CSS comment "token-review: keep | keep-distinct | merge | merge-with |
  approved | separate | split" or "a11y-remap" on the token, or a design-system/
  TOKEN_ARCHITECTURE.md line naming both tokens (Near Token Decisions / Accessibility Remap
  Decisions). Members are tiered auto / proposal / must-ask from the provenance markers in
  the token's comment ("provenance: authored | measured; usage: <n>; sources: <ids>");
  apply_token_decisions.mjs writes the auto tier mechanically
- length reference values are fitted to a 4px or 8px grid; off-grid values are warnings only

Options:
  --strict    Also require all four token files, at least one token per layer and the
              ref -> sys -> comp import order in tokens.css; undocumented near tokens become issues.
  --json      Print one JSON object (clusters, scaleFit, counts, issues, warnings) and nothing else.
  --help, -h  Print this message and exit 0.

Output ends with "Token audit passed." or an "Issues:" list (exit 1).`;

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(USAGE);
  process.exit(0);
}
const strict = args.includes("--strict");
const jsonMode = args.includes("--json");
const targetArg = args.find((arg) => !arg.startsWith("--"));
const targetRoot = path.resolve(targetArg || process.cwd());
const tokenDir = path.join(targetRoot, "tokens");

const files = {
  ref: path.join(tokenDir, "tokens-ref.css"),
  sys: path.join(tokenDir, "tokens-sys.css"),
  comp: path.join(tokenDir, "tokens-comp.css"),
};
const indexFile = path.join(tokenDir, "tokens.css");
const tokenArchitectureFile = path.join(targetRoot, "design-system", "TOKEN_ARCHITECTURE.md");

const componentWords = [
  "button",
  "card",
  "nav",
  "navigation",
  "navbar",
  "tab",
  "tabs",
  "input",
  "field",
  "dialog",
  "modal",
  "toast",
  "chip",
  "avatar",
  "carousel",
  "tile",
  "sidebar",
  "toolbar",
  "bottom-bar",
  "top-bar",
];

const semanticWords = [
  "primary",
  "secondary",
  "surface",
  "background",
  "outline",
  "success",
  "warning",
  "error",
  "info",
  "active",
  "selected",
  "disabled",
  "hover",
  "pressed",
  "focus",
  "container",
  "foreground",
  "inverse",
];

const rawValuePattern =
  /#[0-9a-fA-F]{3,8}\b|\b-?(?:\d+|\d*\.\d+)(?:px|rem|em|%|vh|vw|vmin|vmax|svh|lvh|dvh|ms|s|deg)?(?=$|[\s,;)])|rgba?\(|hsla?\(/;

const COLOR_SCALE_MIN = 0;
const COLOR_SCALE_MAX = 100;
const LIGHTNESS_TOLERANCE = 0.01;

function normalizeTokenName(name) {
  return name.replace(/^--/, "").toLowerCase();
}

function hasSegment(name, word) {
  const normalized = normalizeTokenName(name);
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|-)${escaped}(-|$)`).test(normalized);
}

function stripCssComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function stripInlineComments(value) {
  return value.replace(/\/\*[\s\S]*?\*\//g, "").trim();
}

function parseDeclarations(css) {
  const declarations = new Map();
  // The trailing comment may only sit on the same line as the declaration;
  // letting it cross newlines would steal the next declaration's leading comment.
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

function parseProps(css) {
  const props = new Map();
  const withoutComments = stripCssComments(css);
  const pattern = /(--[A-Za-z0-9_-]+)\s*:\s*([^;]+);/g;
  let match;
  while ((match = pattern.exec(withoutComments))) {
    props.set(match[1], match[2].trim());
  }
  return props;
}

async function readOptional(file) {
  try {
    return await fs.readFile(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function backgroundRoleName(name) {
  const normalized = normalizeTokenName(name);
  const prefixMatch = normalized.match(/^(.+?)-sys-color-(.+)$/);
  if (!prefixMatch) return null;
  const role = prefixMatch[2];
  if (role.startsWith("on-")) return null;
  if (
    role.includes("surface") ||
    role.includes("background") ||
    role.includes("container") ||
    role === "primary" ||
    role === "secondary" ||
    role === "tertiary" ||
    role === "success" ||
    role === "warning" ||
    role === "error" ||
    role === "info" ||
    role === "active" ||
    role === "inverse"
  ) {
    return { prefix: prefixMatch[1], role };
  }
  return null;
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
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
}

function parseCssNumberOrPercent(raw, maxValue) {
  const value = String(raw).trim();
  if (value.endsWith("%")) {
    return clamp01(Number(value.slice(0, -1)) / 100) * maxValue;
  }
  return Number(value);
}

function parseRgbColor(value) {
  const match = String(value)
    .trim()
    .match(/^rgba?\((.+)\)$/i);
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
  const match = String(value)
    .trim()
    .match(/^hsla?\((.+)\)$/i);
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
  if (unit === "rem" || unit === "em") {
    return { amount, unit, normalized: amount * 16, unitGroup: "length" };
  }
  if (unit === "px") {
    return { amount, unit, normalized: amount, unitGroup: "length" };
  }
  if (unit === "s") {
    return { amount, unit, normalized: amount * 1000, unitGroup: "time" };
  }
  if (unit === "ms") {
    return { amount, unit, normalized: amount, unitGroup: "time" };
  }
  if (unit === "%") {
    return { amount, unit, normalized: amount, unitGroup: "percent" };
  }
  if (unit === "deg") {
    return { amount, unit, normalized: amount, unitGroup: "angle" };
  }
  return { amount, unit, normalized: amount, unitGroup: "number" };
}

function reviewTextForDeclaration(declaration) {
  if (!declaration) return "";
  return `${declaration.leadingComment}\n${declaration.trailingComment}`;
}

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

function hasReviewDecision(architectureDoc, declarations, tokenA, tokenB) {
  return (
    hasCssReviewDecision(declarations.get(tokenA), declarations.get(tokenB)) ||
    hasArchitectureReviewDecision(architectureDoc, tokenA, tokenB)
  );
}

const issues = [];
const warnings = [];

const css = {};
for (const [layer, file] of Object.entries(files)) {
  css[layer] = await readOptional(file);
  if (css[layer] === null) {
    warnings.push(`Missing ${path.relative(targetRoot, file)}`);
  }
}

const indexCss = await readOptional(indexFile);
if (indexCss === null) {
  warnings.push(`Missing ${path.relative(targetRoot, indexFile)}`);
}

const tokenArchitectureDoc = await readOptional(tokenArchitectureFile);

const props = {
  ref: parseProps(css.ref || ""),
  sys: parseProps(css.sys || ""),
  comp: parseProps(css.comp || ""),
};

const declarations = {
  ref: parseDeclarations(css.ref || ""),
  sys: parseDeclarations(css.sys || ""),
  comp: parseDeclarations(css.comp || ""),
};

if (strict) {
  for (const [layer, file] of Object.entries(files)) {
    if (css[layer] === null) {
      issues.push(`Strict mode requires ${path.relative(targetRoot, file)}`);
    }
  }
  for (const [layer, tokens] of Object.entries(props)) {
    if (tokens.size === 0) {
      issues.push(`Strict mode requires at least one ${layer} token`);
    }
  }

  if (indexCss === null) {
    issues.push(`Strict mode requires ${path.relative(targetRoot, indexFile)}`);
  } else {
    const importOrder = ["tokens-ref.css", "tokens-sys.css", "tokens-comp.css"];
    const cleanIndexCss = indexCss.replace(/\/\*[\s\S]*?\*\//g, "");
    const positions = importOrder.map((file) => cleanIndexCss.indexOf(file));
    for (const [index, file] of importOrder.entries()) {
      if (positions[index] === -1) {
        issues.push(`tokens.css is missing import for ${file}`);
      }
    }
    const hasAllImports = positions.every((position) => position !== -1);
    const isOrdered = positions.every((position, index) => index === 0 || position > positions[index - 1]);
    if (hasAllImports && !isOrdered) {
      issues.push("tokens.css imports must be ordered ref -> sys -> comp");
    }
  }
}

for (const [name] of props.ref) {
  for (const word of semanticWords) {
    if (hasSegment(name, word)) {
      issues.push(`Reference token uses semantic role "${word}": ${name}`);
    }
  }
  for (const word of componentWords) {
    if (hasSegment(name, word)) {
      issues.push(`Reference token uses component name "${word}": ${name}`);
    }
  }
}

for (const [name, value] of props.sys) {
  for (const word of componentWords) {
    if (hasSegment(name, word)) {
      issues.push(`System token uses component name "${word}": ${name}`);
    }
  }
  if (/var\(--[A-Za-z0-9_-]*-comp-/.test(value)) {
    issues.push(`System token references component token: ${name}: ${value}`);
  }
  if (!/var\(--[A-Za-z0-9_-]*-ref-/.test(value) && rawValuePattern.test(value)) {
    issues.push(
      `System token appears to use a raw value instead of a reference token: ${name}: ${value}. Move the literal into tokens-ref.css as a reference token and reference it with var() (TOKEN_ARCHITECTURE.md layer rules).`,
    );
  }
}

for (const [name, value] of props.comp) {
  if (/var\(--[A-Za-z0-9_-]*-ref-/.test(value)) {
    issues.push(`Component token references reference token directly: ${name}: ${value}`);
  }
  if (/var\(--[A-Za-z0-9_-]*-comp-/.test(value)) {
    issues.push(`Component token references another component token: ${name}: ${value}`);
  }
  if (!/var\(--[A-Za-z0-9_-]*-sys-/.test(value) && rawValuePattern.test(value)) {
    issues.push(
      `Component token appears to use a raw value instead of a system token: ${name}: ${value}. Reference a system token with var(); a new raw value belongs in tokens-ref.css first (TOKEN_ARCHITECTURE.md layer rules).`,
    );
  }
}

for (const [name] of props.sys) {
  const role = backgroundRoleName(name);
  if (!role) continue;
  const expected = `--${role.prefix}-sys-color-on-${role.role}`;
  const baseRole = role.role.endsWith("-container") ? role.role.replace(/-container$/, "") : null;
  const alternate = baseRole ? `--${role.prefix}-sys-color-on-${baseRole}` : null;
  if (!props.sys.has(expected) && !(alternate && props.sys.has(alternate))) {
    issues.push(`Background-like system color is missing foreground pair ${expected} for ${name}`);
  }
}

const referenceColors = [];
for (const [name, value] of props.ref) {
  const colorName = parseReferenceColorName(name);
  if (!colorName) continue;

  const color = parseColor(value);
  if (!color) {
    issues.push(`Reference color token must use a parseable raw color value: ${name}: ${value}`);
    continue;
  }

  if (!colorName.family) {
    issues.push(`Reference color token is missing a palette family before the scale step: ${name}`);
  }
  if (colorName.step === null) {
    issues.push(
      `Reference color token is missing numeric scale step ${COLOR_SCALE_MIN}-${COLOR_SCALE_MAX}: ${name}`,
    );
  } else if (colorName.step < COLOR_SCALE_MIN || colorName.step > COLOR_SCALE_MAX) {
    issues.push(
      `Reference color token scale step must be ${COLOR_SCALE_MIN}-${COLOR_SCALE_MAX}: ${name}`,
    );
  }

  referenceColors.push({
    name,
    value,
    family: colorName.family || "unknown",
    step: colorName.step,
    color,
    luminance: relativeLuminance(color),
  });
}

const colorsByFamily = new Map();
for (const token of referenceColors.filter((token) => token.step !== null)) {
  const familyTokens = colorsByFamily.get(token.family) || [];
  familyTokens.push(token);
  colorsByFamily.set(token.family, familyTokens);
}

for (const [family, familyTokens] of colorsByFamily) {
  const seenSteps = new Map();
  for (const token of familyTokens) {
    if (seenSteps.has(token.step)) {
      issues.push(
        `Reference color family "${family}" uses duplicate scale step ${token.step}: ${seenSteps.get(
          token.step,
        )} and ${token.name}`,
      );
    }
    seenSteps.set(token.step, token.name);
  }

  const sorted = [...familyTokens].sort((a, b) => b.step - a.step);
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const lighterStepToken = sorted[index];
    const darkerStepToken = sorted[index + 1];
    if (lighterStepToken.luminance + LIGHTNESS_TOLERANCE < darkerStepToken.luminance) {
      issues.push(
        `Reference color scale must run light to dark as 100 -> 0 in "${family}": ${lighterStepToken.name} (${lighterStepToken.value}) is darker than ${darkerStepToken.name} (${darkerStepToken.value})`,
      );
    }
  }
}

const referenceNumbers = [];
for (const [name, value] of props.ref) {
  if (parseColor(value)) continue;
  const numeric = parseNumericValue(value);
  if (!numeric) continue;
  referenceNumbers.push({
    name,
    value,
    family: parseReferenceFamily(name),
    numeric,
  });
}

// Near tokens are reviewed per cluster: one canonical token, every other member
// tiered auto / proposal / must-ask against it (scripts/lib/token_review.mjs). A
// member counts as documented when a decision names it together with the canonical.
const varCounts = countVarReferences([css.sys || "", css.comp || ""]);
const { clusters, counts: clusterCounts } = buildTokenClusters({
  colors: referenceColors,
  numbers: referenceNumbers,
  declarations: declarations.ref,
  varCounts,
  hasDecision: (member, canonical) =>
    hasReviewDecision(tokenArchitectureDoc, declarations.ref, member, canonical),
});

for (const cluster of clusters) {
  const canonical = cluster.canonical;
  for (const member of cluster.members) {
    if (member.documented) continue;
    const comparison =
      cluster.kind === "color"
        ? `Near reference colors need review: ${canonical.name} (${canonical.value}) and ${member.name} (${member.value}) have ${member.distanceLabel}`
        : `Near reference numbers need review: ${canonical.name} (${canonical.value}) and ${member.name} (${member.value}) differ by ${formatDistance(member.distance)} ${cluster.unitGroup}`;
    const proposal = member.proposed ? `proposed ${member.proposed}` : "no default, the developer decides";
    const message = `${comparison} [${cluster.id}, tier ${member.tier}, ${proposal}]. Record the decision against the canonical in design-system/TOKEN_ARCHITECTURE.md (Near Token Decisions) or with a token-review CSS comment; apply_token_decisions.mjs --tier ${member.tier} writes it.`;
    if (strict) issues.push(message);
    else warnings.push(message);
  }
}
const unresolvedReviewCandidates = clusterCounts.candidates;
const documentedReviewCandidates = clusterCounts.documented;

// Scale fitting is advisory in every mode: an off-grid value is a question for the
// developer, not a layer violation.
const scaleFit = fitLengthScale(referenceNumbers);
const scaleOutlierLine = scaleFitOutlierLine(scaleFit);
if (scaleOutlierLine) warnings.push(scaleOutlierLine);

const relRoot = path.relative(process.cwd(), targetRoot) || ".";
const output = [];
const log = (line) => output.push(line);
log(`Token audit target: ${relRoot}`);
log(`Reference tokens: ${props.ref.size}`);
log(`System tokens: ${props.sys.size}`);
log(`Component tokens: ${props.comp.size}`);
log(`Strict mode: ${strict ? "on" : "off"}`);
log(
  `Near token clusters: ${clusterCounts.clusters} (auto ${clusterCounts.tiers.auto}, proposal ${clusterCounts.tiers.proposal}, must-ask ${clusterCounts.tiers["must-ask"]})`,
);
for (const cluster of clusters) log(`- ${clusterSummaryLine(cluster)}`);
log(`Token review candidates: ${unresolvedReviewCandidates}`);
log(`Documented review decisions: ${documentedReviewCandidates}`);
const scaleSummary = scaleFitSummaryLine(scaleFit);
if (scaleSummary) log(scaleSummary);

if (warnings.length) {
  log("\nWarnings:");
  for (const warning of warnings) log(`- ${warning}`);
}

if (issues.length) {
  log("\nIssues:");
  for (const issue of issues) log(`- ${issue}`);
} else {
  log("\nToken audit passed.");
}

if (jsonMode) {
  console.log(
    JSON.stringify(
      {
        clusters,
        scaleFit,
        counts: {
          ...clusterCounts,
          referenceTokens: props.ref.size,
          systemTokens: props.sys.size,
          componentTokens: props.comp.size,
          strict,
        },
        issues,
        warnings,
      },
      null,
      2,
    ),
  );
} else {
  console.log(output.join("\n"));
}

if (issues.length) process.exit(1);
