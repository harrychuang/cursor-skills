#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

// Near-token detection and "is this pair decided?" live in review_core.mjs,
// shared with generate_review_html.mjs, so the audit and the review page can
// never disagree about what still needs a decision.
import {
  LIGHTNESS_TOLERANCE,
  collectDecisionRecords,
  findNearPairs,
  normalizeTokenName,
  parseColor,
  parseProps,
  parseReferenceColorName,
  parseTokens,
  relativeLuminance,
  resolvePair,
} from "./review_core.mjs";
// The team naming order recorded in TOKEN_ARCHITECTURE.md > "## Naming Order".
import { checkNameOrder, findStateGroups, formatNamingOrder, parseNamingOrder } from "./naming_order.mjs";

const args = process.argv.slice(2);
const strict = args.includes("--strict");
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

function hasSegment(name, word) {
  const normalized = normalizeTokenName(name);
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|-)${escaped}(-|$)`).test(normalized);
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

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
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
const namingOrder = parseNamingOrder(tokenArchitectureDoc);

const props = {
  ref: parseProps(css.ref || ""),
  sys: parseProps(css.sys || ""),
  comp: parseProps(css.comp || ""),
};

// Reference tokens with the comments attached to them; the comments can carry
// token-review and a11y-remap decisions.
const refTokens = parseTokens(css.ref || "");

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
    issues.push(`System token appears to use a raw value instead of a reference token: ${name}: ${value}`);
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
    issues.push(`Component token appears to use a raw value instead of a system token: ${name}: ${value}`);
  }
}

// Naming order recorded in TOKEN_ARCHITECTURE.md: segments must not go back to an earlier slot.
if (namingOrder) {
  for (const [layer, tokens] of Object.entries(props)) {
    for (const [name] of tokens) {
      const result = checkNameOrder(name, namingOrder, layer);
      if (result.ok) continue;
      const { segment, slot, previous, previousSlot } = result.violation;
      issues.push(
        `Token name does not follow the recorded naming order (${formatNamingOrder(namingOrder)}): ${name} — "${segment}" (${slot}) comes after "${previous}" (${previousSlot})` +
          (result.expected ? `; expected ${result.expected}` : "; reorder the segments to follow the recorded order"),
      );
    }
  }
}

// --x next to --x-<state>: fine in CSS, but a slash path cannot be a token and a group at once.
for (const group of findStateGroups([...props.ref.keys(), ...props.sys.keys(), ...props.comp.keys()], namingOrder)) {
  warnings.push(
    `Token is also a group once names become slash paths (Figma Variables, DTCG): ${group.token} next to ${group.children.join(", ")}; CSS is unaffected. ` +
      (group.suggestion
        ? `Name the default state explicitly: ${group.suggestion}`
        : `Rename or remove ${group.token}; the explicit default state already exists`),
  );
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

// Near-token review. A pair is confirmed, suggested (the AI proposed an action
// that no designer has confirmed yet) or undecided. Only confirmed pairs pass.
const decisionRecords = collectDecisionRecords({ architectureDoc: tokenArchitectureDoc, refTokens });
let unresolvedReviewCandidates = 0;
let awaitingConfirmation = 0;
let documentedReviewCandidates = 0;

for (const pair of findNearPairs(refTokens).pairs) {
  const result = resolvePair(decisionRecords, pair.a, pair.b);
  if (result.status === "confirmed") {
    documentedReviewCandidates += 1;
    continue;
  }
  unresolvedReviewCandidates += 1;
  const subject =
    pair.type === "color"
      ? `${pair.a} (${pair.valueA}) and ${pair.b} (${pair.valueB}) have deltaE ${formatNumber(pair.delta)}`
      : `${pair.a} (${pair.valueA}) and ${pair.b} (${pair.valueB}) differ by ${formatNumber(pair.delta)} ${pair.unitGroup}`;
  const noun = pair.type === "color" ? "colors" : "numbers";
  let message;
  if (result.status === "suggested") {
    awaitingConfirmation += 1;
    message = `Near reference ${noun} await designer confirmation: ${subject}. The AI suggested "${result.record.suggestion.text}". Confirm it on the review page or in the conversation, then record Decision and Confirmed by in design-system/TOKEN_ARCHITECTURE.md.`;
  } else {
    message = `Near reference ${noun} need review: ${subject}. Ask the developer whether to merge them or keep them distinct, then document the decision in design-system/TOKEN_ARCHITECTURE.md or with a token-review CSS comment.`;
  }
  if (strict) issues.push(message);
  else warnings.push(message);
}

const relRoot = path.relative(process.cwd(), targetRoot) || ".";
console.log(`Token audit target: ${relRoot}`);
console.log(`Reference tokens: ${props.ref.size}`);
console.log(`System tokens: ${props.sys.size}`);
console.log(`Component tokens: ${props.comp.size}`);
console.log(`Naming order: ${namingOrder ? `${formatNamingOrder(namingOrder)} (TOKEN_ARCHITECTURE.md)` : "default (none recorded)"}`);
console.log(`Strict mode: ${strict ? "on" : "off"}`);
console.log(`Token review candidates: ${unresolvedReviewCandidates}`);
console.log(`Awaiting designer confirmation: ${awaitingConfirmation}`);
console.log(`Documented review decisions: ${documentedReviewCandidates}`);

if (warnings.length) {
  console.log("\nWarnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
}

if (issues.length) {
  console.log("\nIssues:");
  for (const issue of issues) console.log(`- ${issue}`);
  process.exit(1);
}

console.log("\nToken audit passed.");
