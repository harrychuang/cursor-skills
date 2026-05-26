#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

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
  /#[0-9a-fA-F]{3,8}\b|\b-?(?:\d+|\d*\.\d+)(?:px|rem|em|%|vh|vw|vmin|vmax|svh|lvh|dvh|ms|s|deg)(?=$|[\s,;)])|rgba?\(|hsla?\(/;

function normalizeTokenName(name) {
  return name.replace(/^--/, "").toLowerCase();
}

function hasSegment(name, word) {
  const normalized = normalizeTokenName(name);
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|-)${escaped}(-|$)`).test(normalized);
}

function parseProps(css) {
  const props = new Map();
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
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

const props = {
  ref: parseProps(css.ref || ""),
  sys: parseProps(css.sys || ""),
  comp: parseProps(css.comp || ""),
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

const relRoot = path.relative(process.cwd(), targetRoot) || ".";
console.log(`Token audit target: ${relRoot}`);
console.log(`Reference tokens: ${props.ref.size}`);
console.log(`System tokens: ${props.sys.size}`);
console.log(`Component tokens: ${props.comp.size}`);
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

console.log("\nToken audit passed.");
