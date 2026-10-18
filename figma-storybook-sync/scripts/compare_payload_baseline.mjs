#!/usr/bin/env node
// Deterministic three-way payload comparison for the figma-storybook-sync skill.
//
//   node compare_payload_baseline.mjs --base <baseline.json> --ours <current.json> [--theirs <figma-facts.json>]
//
// base   = the synced baseline payload (the last confirmed sync)
// ours   = the current export payload from the running Storybook
// theirs = the current Figma state, as a figma-facts JSON (see
//          references/sync-decision-matrix.md) or a payload-shaped JSON
//
// The script is pure Node with no network access. It normalizes both payload
// shapes into one semantic subset, diffs within that subset only, applies the
// known-limitation suppression rules, and prints a JSON report to stdout.
// Identical inputs always produce byte-identical output: no timestamps, no
// randomness, all collections explicitly sorted.

import { readFileSync } from "node:fs";

// --- Known-limitation suppression thresholds -------------------------------
// See references/known-limitation-filter.md for the rationale behind each
// rule and how to tune these constants for a specific project.

// Browser and Figma font metrics wrap text differently; height deltas within
// this tolerance on text nodes are exporter fidelity noise, not design edits.
export const FONT_METRICS_TEXT_HEIGHT_TOLERANCE_PX = 2;
// Wide-gamut colors clamp to sRGB on export; per-channel deltas (0..1 scale)
// within this epsilon are clamp noise, not palette changes.
export const SRGB_CLAMP_COLOR_EPSILON = 0.01;
// Raster embeds cap their longest side at 2048px; dimension differences on
// image nodes at or beyond the cap reflect the cap, not a resize.
export const RASTER_EMBED_CAP_PX = 2048;
// The importer places a locked browser-render snapshot beside every import;
// it is reference material, never part of the design.
export const BROWSER_REFERENCE_NODE_NAME = "Browser Reference";
// Figma-side section/viewport placement is workspace chrome, not design.
export const FIGMA_CHROME_POSITION_FIELDS = ["x", "y"];

const SUPPRESSION_REASONS = {
  "browser-reference-layer":
    "The locked Browser Reference snapshot is importer reference material, not design content.",
  "figma-chrome-position":
    "Root x/y reflect Figma section/viewport placement, not design geometry.",
  "font-metrics-text-height": `Browser and Figma font metrics wrap text differently; height deltas within ${FONT_METRICS_TEXT_HEIGHT_TOLERANCE_PX}px on text nodes are fidelity noise.`,
  "raster-embed-cap": `Raster embeds cap at ${RASTER_EMBED_CAP_PX}px; image dimension deltas at the cap reflect the cap, not a resize.`,
  "srgb-clamp-color": `Wide-gamut colors clamp to sRGB on export; per-channel deltas within ${SRGB_CLAMP_COLOR_EPSILON} are clamp noise.`,
};

// --- Normalization ---------------------------------------------------------
// The semantic subset intentionally excludes anything the exporter cannot
// round-trip faithfully; comparing outside it manufactures false diffs.

function normalizeColor(value) {
  if (typeof value !== "string") return undefined;
  const raw = value.trim().toLowerCase();
  const hex = raw.match(/^#([0-9a-f]{3,8})$/);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) {
      h = [...h].map((c) => c + c).join("");
    }
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { a, b, g, r };
  }
  const rgb = raw.match(
    /^rgba?\(\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)\s*(?:[,/]\s*(\d+(?:\.\d+)?))?\s*\)$/,
  );
  if (rgb) {
    return {
      a: rgb[4] === undefined ? 1 : Number(rgb[4]),
      b: Number(rgb[3]) / 255,
      g: Number(rgb[2]) / 255,
      r: Number(rgb[1]) / 255,
    };
  }
  return undefined;
}

function colorsWithinEpsilon(a, b, epsilon) {
  const ca = normalizeColor(a);
  const cb = normalizeColor(b);
  if (!ca || !cb) return false;
  return (
    Math.abs(ca.r - cb.r) <= epsilon &&
    Math.abs(ca.g - cb.g) <= epsilon &&
    Math.abs(ca.b - cb.b) <= epsilon &&
    Math.abs(ca.a - cb.a) <= epsilon
  );
}

function describeLayout(styles, node) {
  const parts = [];
  if (node.layoutStrategy) parts.push(String(node.layoutStrategy));
  if (styles.flexDirection) parts.push(String(styles.flexDirection));
  if (styles.layoutWrap) parts.push(String(styles.layoutWrap));
  return parts.length ? parts.join(" ") : undefined;
}

function describeEffects(styles) {
  const kinds = [
    ...(Array.isArray(styles.effects) ? styles.effects : []),
    ...(Array.isArray(styles.blurEffects) ? styles.blurEffects : []),
  ]
    .map((effect) => (effect && typeof effect.type === "string" ? effect.type : "UNKNOWN"))
    .sort();
  return kinds.length ? kinds.join(",") : undefined;
}

function describeRadius(styles) {
  if (styles.radiusCorners && typeof styles.radiusCorners === "object") {
    const corners = styles.radiusCorners;
    return [
      corners.topLeftRadius ?? 0,
      corners.topRightRadius ?? 0,
      corners.bottomRightRadius ?? 0,
      corners.bottomLeftRadius ?? 0,
    ].join(" ");
  }
  if (typeof styles.radius === "number") return String(styles.radius);
  return undefined;
}

// One flat record per node; undefined fields are "not present in the subset".
function normalizePayloadNode(node, isRoot) {
  const styles = node.styles ?? {};
  const record = {
    backgroundColor: styles.backgroundColor,
    borderColor: styles.borderColor,
    color: styles.color,
    effects: describeEffects(styles),
    gap: styles.gap,
    height: styles.height,
    kind: node.kind,
    layout: describeLayout(styles, node),
    paddingBottom: styles.paddingBottom,
    paddingLeft: styles.paddingLeft,
    paddingRight: styles.paddingRight,
    paddingTop: styles.paddingTop,
    radius: describeRadius(styles),
    text: node.text,
    width: styles.width,
  };
  if (isRoot) {
    record.x = styles.x;
    record.y = styles.y;
  }
  return record;
}

function collectPayloadNodes(root) {
  const nodes = {};
  const visit = (node, parentPath, isRoot) => {
    if (!node || typeof node !== "object") return;
    const name = typeof node.name === "string" && node.name ? node.name : "unnamed";
    let path = parentPath ? `${parentPath}/${name}` : name;
    // Duplicate sibling names stay stable across unrelated insertions by
    // counting occurrences instead of using the child index.
    let occurrence = 2;
    while (nodes[path] !== undefined) {
      path = `${parentPath ? `${parentPath}/` : ""}${name}#${occurrence}`;
      occurrence += 1;
    }
    nodes[path] = normalizePayloadNode(node, isRoot);
    for (const child of Array.isArray(node.children) ? node.children : []) {
      visit(child, path, false);
    }
  };
  visit(root, "", true);
  return nodes;
}

function normalizeTokens(tokens) {
  const map = {};
  for (const token of Array.isArray(tokens) ? tokens : []) {
    if (!token || typeof token !== "object") continue;
    const name = typeof token.cssName === "string" ? token.cssName : undefined;
    if (!name) continue;
    map[name] = String(token.value ?? "");
  }
  return map;
}

// Accepts either a full export payload (has `root`) or a figma-facts JSON
// (already normalized, has `nodes`). Both become the same semantic subset.
function normalizeInput(input, label) {
  if (input && typeof input === "object" && input.root) {
    return {
      generatedAt: typeof input.generatedAt === "string" ? input.generatedAt : "",
      nodes: collectPayloadNodes(input.root),
      storyId: typeof input.storyId === "string" ? input.storyId : "",
      tokens: normalizeTokens(input.tokens),
    };
  }
  if (input && typeof input === "object" && input.nodes && typeof input.nodes === "object") {
    const nodes = {};
    for (const key of Object.keys(input.nodes).sort()) {
      const source = input.nodes[key];
      nodes[key] = source && typeof source === "object" ? { ...source } : {};
    }
    return {
      generatedAt: typeof input.generatedAt === "string" ? input.generatedAt : "",
      nodes,
      storyId: typeof input.storyId === "string" ? input.storyId : "",
      tokens:
        input.tokens && typeof input.tokens === "object"
          ? Object.fromEntries(
              Object.keys(input.tokens)
                .sort()
                .map((name) => [name, String(input.tokens[name])]),
            )
          : {},
    };
  }
  throw new Error(
    `${label} is neither an export payload (root) nor a figma-facts JSON (nodes).`,
  );
}

// --- Diffing ---------------------------------------------------------------

const STRUCTURAL_FIELDS = new Set(["kind", "node"]);

function valuesEqual(a, b) {
  if (a === b) return true;
  if (typeof a === "number" && typeof b === "number") return Object.is(a, b);
  return false;
}

function diffSide(base, other, side) {
  const diffs = [];

  const tokenNames = [
    ...new Set([...Object.keys(base.tokens), ...Object.keys(other.tokens)]),
  ].sort();
  for (const name of tokenNames) {
    const baseValue = base.tokens[name];
    const otherValue = other.tokens[name];
    if (!valuesEqual(baseValue, otherValue)) {
      diffs.push({
        base: baseValue ?? null,
        category: "token",
        current: otherValue ?? null,
        field: "value",
        path: `tokens/${name}`,
        side,
      });
    }
  }

  const paths = [
    ...new Set([...Object.keys(base.nodes), ...Object.keys(other.nodes)]),
  ].sort();
  for (const path of paths) {
    const baseNode = base.nodes[path];
    const otherNode = other.nodes[path];
    if (!baseNode || !otherNode) {
      diffs.push({
        base: baseNode ? "present" : null,
        category: "structural",
        current: otherNode ? "present" : null,
        field: "node",
        path,
        side,
      });
      continue;
    }
    const fields = [
      ...new Set([...Object.keys(baseNode), ...Object.keys(otherNode)]),
    ].sort();
    for (const field of fields) {
      const baseValue = baseNode[field];
      const otherValue = otherNode[field];
      if (baseValue === undefined && otherValue === undefined) continue;
      if (!valuesEqual(baseValue, otherValue)) {
        diffs.push({
          base: baseValue ?? null,
          category: STRUCTURAL_FIELDS.has(field) ? "structural" : "visual",
          current: otherValue ?? null,
          field,
          path,
          side,
        });
      }
    }
  }

  return diffs;
}

// --- Suppression -----------------------------------------------------------

function isNumericPair(a, b) {
  return typeof a === "number" && typeof b === "number";
}

function findSuppressionRule(diff, base, other) {
  const pathSegments = diff.path.split("/");
  if (pathSegments.some((segment) => segment.startsWith(BROWSER_REFERENCE_NODE_NAME))) {
    return "browser-reference-layer";
  }

  const baseNode = base.nodes[diff.path];
  const otherNode = other.nodes[diff.path];
  const isRootPath = !diff.path.includes("/") && !diff.path.startsWith("tokens/");

  if (isRootPath && FIGMA_CHROME_POSITION_FIELDS.includes(diff.field)) {
    return "figma-chrome-position";
  }

  const kind = baseNode?.kind ?? otherNode?.kind;

  if (
    diff.field === "height" &&
    kind === "text" &&
    isNumericPair(diff.base, diff.current) &&
    Math.abs(diff.base - diff.current) <= FONT_METRICS_TEXT_HEIGHT_TOLERANCE_PX
  ) {
    return "font-metrics-text-height";
  }

  if (
    (diff.field === "width" || diff.field === "height") &&
    kind === "image" &&
    isNumericPair(diff.base, diff.current) &&
    Math.max(diff.base, diff.current) >= RASTER_EMBED_CAP_PX
  ) {
    return "raster-embed-cap";
  }

  if (
    ["backgroundColor", "borderColor", "color"].includes(diff.field) &&
    colorsWithinEpsilon(diff.base, diff.current, SRGB_CLAMP_COLOR_EPSILON)
  ) {
    return "srgb-clamp-color";
  }

  return undefined;
}

function partitionDiffs(diffs, base, other) {
  const kept = [];
  const suppressed = [];
  for (const diff of diffs) {
    const rule = findSuppressionRule(diff, base, other);
    if (rule) {
      suppressed.push({ ...diff, reason: SUPPRESSION_REASONS[rule], rule });
    } else {
      kept.push(diff);
    }
  }
  return { kept, suppressed };
}

// --- Classification --------------------------------------------------------

function classify(oursChanged, theirsChanged, hasTheirs) {
  if (!hasTheirs) return "partial";
  if (!oursChanged && !theirsChanged) return "synced";
  if (!oursChanged && theirsChanged) return "figma-only";
  if (oursChanged && !theirsChanged) return "code-only";
  return "conflict";
}

function sortDiffs(diffs) {
  return diffs
    .slice()
    .sort(
      (a, b) =>
        a.side.localeCompare(b.side) ||
        a.path.localeCompare(b.path) ||
        a.field.localeCompare(b.field),
    );
}

export function comparePayloads({ base, ours, theirs }) {
  const normalizedBase = normalizeInput(base, "--base");
  const normalizedOurs = normalizeInput(ours, "--ours");
  const normalizedTheirs = theirs === undefined ? undefined : normalizeInput(theirs, "--theirs");

  const oursResult = partitionDiffs(
    diffSide(normalizedBase, normalizedOurs, "ours"),
    normalizedBase,
    normalizedOurs,
  );
  const theirsResult = normalizedTheirs
    ? partitionDiffs(
        diffSide(normalizedBase, normalizedTheirs, "theirs"),
        normalizedBase,
        normalizedTheirs,
      )
    : { kept: [], suppressed: [] };

  const warnings = [];
  if (
    normalizedOurs.storyId &&
    normalizedBase.storyId &&
    normalizedOurs.storyId !== normalizedBase.storyId
  ) {
    warnings.push(
      `--ours storyId ${normalizedOurs.storyId} does not match --base storyId ${normalizedBase.storyId}.`,
    );
  }
  if (
    normalizedTheirs?.storyId &&
    normalizedBase.storyId &&
    normalizedTheirs.storyId !== normalizedBase.storyId
  ) {
    warnings.push(
      `--theirs storyId ${normalizedTheirs.storyId} does not match --base storyId ${normalizedBase.storyId}.`,
    );
  }
  if (
    normalizedTheirs?.generatedAt &&
    normalizedBase.generatedAt &&
    normalizedTheirs.generatedAt !== normalizedBase.generatedAt
  ) {
    warnings.push(
      `Baseline may be stale: Figma content descends from export ${normalizedTheirs.generatedAt}, baseline is ${normalizedBase.generatedAt}.`,
    );
  }

  return {
    classification: classify(
      oursResult.kept.length > 0,
      theirsResult.kept.length > 0,
      normalizedTheirs !== undefined,
    ),
    diffs: sortDiffs([...oursResult.kept, ...theirsResult.kept]),
    storyId: normalizedBase.storyId || normalizedOurs.storyId,
    suppressed: sortDiffs([...oursResult.suppressed, ...theirsResult.suppressed]),
    warnings,
  };
}

// --- CLI -------------------------------------------------------------------

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === "--base" || flag === "--ours" || flag === "--theirs") {
      args[flag.slice(2)] = argv[i + 1];
      i += 1;
    } else {
      throw new Error(`Unknown argument ${flag}.`);
    }
  }
  if (!args.base || !args.ours) {
    throw new Error(
      "Usage: compare_payload_baseline.mjs --base <file> --ours <file> [--theirs <file>]",
    );
  }
  return args;
}

function readJson(filePath, label) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read ${label} (${filePath}): ${error.message}`);
  }
}

const invokedDirectly =
  process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop());

if (invokedDirectly) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const report = comparePayloads({
      base: readJson(args.base, "--base"),
      ours: readJson(args.ours, "--ours"),
      theirs: args.theirs === undefined ? undefined : readJson(args.theirs, "--theirs"),
    });
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}
