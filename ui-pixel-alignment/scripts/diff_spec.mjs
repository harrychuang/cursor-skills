#!/usr/bin/env node

/**
 * Diff two platform-neutral UI Specs and emit candidate findings.
 *
 * The script owns the mechanical part of the audit: node matching, unit-aware
 * numeric comparison, parity classification, and severity proposal. Judgement —
 * whether a font substitution was sanctioned, whether a missing node is really
 * platform-only, whether a color shift changes meaning — stays with the agent
 * reviewing the candidates.
 *
 *   node scripts/diff_spec.mjs \
 *     --reference spec/reference.json \
 *     --implementation spec/implementation.json \
 *     --output findings.candidates.json
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptFile = fileURLToPath(import.meta.url);
const skillRoot = path.resolve(path.dirname(scriptFile), "..");

const args = process.argv.slice(2);
const help = args.includes("--help") || args.includes("-h");
const referenceArg = readFlag("--reference", "-r");
const implementationArg = readFlag("--implementation", "-m");
const outputArg = readFlag("--output", "-o");
const policyArg = readFlag("--policy", "-p");
const remapsArg = readFlag("--remaps");
const titleArg = readFlag("--title");
const summaryArg = readFlag("--summary");

if (help || !referenceArg || !implementationArg) {
  printUsage();
  process.exit(help ? 0 : 1);
}

const policyPath = policyArg
  ? path.resolve(policyArg)
  : path.join(skillRoot, "assets", "parity-policy.json");

const policy = await readJson(policyPath);
const reference = await readJson(path.resolve(referenceArg));
const implementation = await readJson(path.resolve(implementationArg));
const remapsFile = remapsArg ? await readJson(path.resolve(remapsArg)) : null;

const context = buildContext(reference, implementation, policy, remapsFile);
const { findings, stats } = diffSpecs(reference, implementation, policy, context);

const report = {
  title:
    titleArg ||
    `${reference.surface?.name || "Reference"} — ${context.referencePlatform} vs ${context.implementationPlatform} parity`,
  summary: summaryArg || buildSummary(context, stats),
  source: buildSource(reference, implementation, context),
  screenshots: {},
  parity: {
    policy: displayPath(policyPath),
    formFactor: context.sameFormFactor ? "same" : "cross",
    engines: context.sameEngine ? "same" : "cross",
    referenceFidelity: reference.surface?.fidelity || "unknown",
    implementationFidelity: implementation.surface?.fidelity || "unknown",
    fontEnvironment: context.fontEnvironment,
  },
  findings,
  candidateStats: stats,
};

const outputPath = path.resolve(outputArg || "findings.candidates.json");
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Wrote ${findings.length} candidate findings to ${outputPath}`);
console.log(
  `  drift ${stats.drift} · adaptation ${stats.adaptation} · required-adaptation ${stats.requiredAdaptation}`,
);
console.log(
  `  matched ${stats.matchedNodes} nodes · missing ${stats.missingNodes} · extra ${stats.extraNodes} · skipped ${stats.skippedNodes}`,
);
if (stats.convergence !== null) {
  console.log(
    `  field convergence ${stats.convergence}% (${stats.fieldsPassed} passed + ${stats.fieldsSanctioned} sanctioned of ${stats.fieldsCompared} compared)`,
  );
}
console.log(
  `  form factor: ${context.sameFormFactor ? "same" : "cross"} (${context.referenceWidth ?? "?"} vs ${context.implementationWidth ?? "?"})`,
);
if (stats.lowFidelity) {
  console.log("  note: at least one spec is estimated — treat sub-2px deltas as unreliable.");
}
if (context.fontEnvironment === "mismatched") {
  console.log(
    "  warning: font environment mismatched — typography metrics and text-node box sizes were downgraded to low. Do not change tokens based on them.",
  );
}
if (context.remaps.length) {
  console.log(`  accessibility remaps applied: ${context.remaps.length}`);
}
console.log("Review every candidate before writing the final findings.json.");

/* ------------------------------------------------------------------ setup */

function readFlag(...names) {
  for (const name of names) {
    const index = args.indexOf(name);
    if (index >= 0) {
      const value = args[index + 1];
      if (!value || value.startsWith("-")) {
        throw new Error(`${name} requires a value.`);
      }
      return value;
    }
  }
  return "";
}

function printUsage() {
  console.log(`Usage:
  node scripts/diff_spec.mjs --reference <spec.json> --implementation <spec.json> [--output <findings.json>]

Options:
  --reference, -r        Reference-side UI Spec JSON (design or source-of-truth code).
  --implementation, -m   Implementation-side UI Spec JSON (the surface being audited).
  --output, -o           Candidate findings output. Defaults to ./findings.candidates.json.
  --policy, -p           Parity policy JSON. Defaults to the skill's assets/parity-policy.json.
  --remaps               Accessibility remap JSON (array or {accessibilityRemaps: []}); merged
                         with accessibilityRemaps declared inside either spec.
  --title                Report title override.
  --summary              Report summary override.
`);
}

function displayPath(target) {
  const relative = path.relative(process.cwd(), target);
  return !relative || relative.startsWith("..") ? target : relative;
}

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read JSON at ${file}: ${error.message}`);
  }
}

function buildContext(ref, impl, pol, remapsFromFile) {
  const referencePlatform = ref.surface?.platform || "unknown";
  const implementationPlatform = impl.surface?.platform || "unknown";
  const referenceWidth = ref.surface?.viewport?.width ?? null;
  const implementationWidth = impl.surface?.viewport?.width ?? null;

  const ratio = pol.formFactor?.sameViewportToleranceRatio ?? 0.15;
  let sameFormFactor = true;
  if (referenceWidth && implementationWidth) {
    const delta = Math.abs(referenceWidth - implementationWidth);
    sameFormFactor = delta / Math.max(referenceWidth, implementationWidth) <= ratio;
  }

  const engines = pol.engines || {};
  const sameEngine = (engines[referencePlatform] || referencePlatform) === (engines[implementationPlatform] || implementationPlatform);

  const touch = pol.statePolicy?.touchOnlyPlatforms || [];
  return {
    referencePlatform,
    implementationPlatform,
    referenceWidth,
    implementationWidth,
    sameFormFactor,
    sameEngine,
    implementationIsTouch: touch.includes(implementationPlatform),
    referenceIsTouch: touch.includes(referencePlatform),
    minTouchTarget: pol.touchTargets?.[implementationPlatform] ?? null,
    interactiveRoles: pol.touchTargets?.interactiveRoles || ["control", "input"],
    remaps: collectRemaps(ref, impl, remapsFromFile),
    fontEnvironment: resolveFontEnvironment(ref, impl),
  };
}

function collectRemaps(ref, impl, remapsFromFile) {
  const fromFile = Array.isArray(remapsFromFile)
    ? remapsFromFile
    : remapsFromFile?.accessibilityRemaps || [];
  return [
    ...fromFile,
    ...(ref.accessibilityRemaps || []),
    ...(impl.accessibilityRemaps || []),
  ].filter((remap) => remap && remap.authored && remap.accessible);
}

/**
 * "aligned" only when both sides recorded their font environment and neither
 * declared a mismatch; a single `aligned: false` poisons every text metric in
 * the comparison, so it wins over everything else.
 */
function resolveFontEnvironment(ref, impl) {
  const sides = [ref.surface?.fonts, impl.surface?.fonts];
  if (sides.some((fonts) => fonts && fonts.aligned === false)) return "mismatched";
  if (sides.every((fonts) => fonts && fonts.aligned !== false)) return "aligned";
  return "unknown";
}

function buildSource(ref, impl, context) {
  return {
    designName: ref.surface?.name || "Reference",
    designUrl: isUrl(ref.surface?.source) ? ref.surface.source : "",
    designSource: ref.surface?.source || "",
    designPlatform: context.referencePlatform,
    implementationName: impl.surface?.name || "Implementation",
    implementationUrl: isUrl(impl.surface?.source) ? impl.surface.source : "",
    implementationSource: impl.surface?.source || "",
    implementationPlatform: context.implementationPlatform,
    viewport: formatViewport(impl.surface?.viewport) || formatViewport(ref.surface?.viewport) || "",
    referenceViewport: formatViewport(ref.surface?.viewport) || "",
    theme: impl.surface?.theme || ref.surface?.theme || "",
    capturedAt: impl.surface?.capturedAt || ref.surface?.capturedAt || "",
  };
}

function buildSummary(context, stats) {
  const factor = context.sameFormFactor
    ? "same form factor, absolute values compared strictly"
    : "cross form factor, spacing and sizing relaxed to adaptive";
  return `${context.referencePlatform} reference compared with ${context.implementationPlatform} implementation (${factor}). ${stats.drift} drift, ${stats.adaptation} adaptation, and ${stats.requiredAdaptation} required-adaptation candidates across ${stats.matchedNodes} matched nodes.`;
}

function formatViewport(viewport) {
  if (!viewport?.width) return "";
  return viewport.height ? `${viewport.width}x${viewport.height}` : `${viewport.width}`;
}

function isUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

/* -------------------------------------------------------------- node match */

function diffSpecs(ref, impl, pol, context) {
  const refNodes = (ref.nodes || []).filter((node) => !isIgnoredNode(node, pol));
  const implNodes = (impl.nodes || []).filter((node) => !isIgnoredNode(node, pol));

  const { pairs, missing, extra } = matchNodes(refNodes, implNodes);

  const findings = [];
  const stats = {
    matchedNodes: pairs.length,
    missingNodes: 0,
    extraNodes: 0,
    skippedNodes: refNodes.length + implNodes.length - pairs.length * 2 - missing.length - extra.length,
    drift: 0,
    adaptation: 0,
    requiredAdaptation: 0,
    fieldsCompared: 0,
    fieldsPassed: 0,
    fieldsSanctioned: 0,
    convergence: null,
    lowFidelity:
      ref.surface?.fidelity === "estimated" || impl.surface?.fidelity === "estimated",
  };

  for (const node of missing) {
    if (node.platformOnly) continue;
    stats.missingNodes += 1;
    findings.push(
      makeFinding({
        node,
        counterpart: null,
        field: "presence",
        intent: "drift",
        parityClass: "strict",
        severity: pol.severity?.missingNode || "high",
        expected: `"${nodeLabel(node)}" (${node.role || "node"}) is present in the reference.`,
        actual: "No matching node was found in the implementation.",
        delta: ["node missing"],
        recommendedFix: `Add the ${node.role || "node"} "${nodeLabel(node)}" to the implementation, or mark it platformOnly in the reference spec if it does not belong on ${context.implementationPlatform}.`,
        context,
      }),
    );
  }

  for (const node of extra) {
    if (node.platformOnly) continue;
    stats.extraNodes += 1;
    findings.push(
      makeFinding({
        node: null,
        counterpart: node,
        field: "presence",
        intent: "drift",
        parityClass: "strict",
        severity: pol.severity?.extraNode || "medium",
        expected: "The reference has no equivalent node.",
        actual: `"${nodeLabel(node)}" (${node.role || "node"}) exists only in the implementation.`,
        delta: ["node not in reference"],
        recommendedFix: `Confirm whether "${nodeLabel(node)}" is an intentional ${context.implementationPlatform} affordance. If not, remove it; if it is, mark it platformOnly.`,
        context,
      }),
    );
  }

  for (const [refNode, implNode] of pairs) {
    if (refNode.platformOnly || implNode.platformOnly) continue;
    findings.push(...diffNode(refNode, implNode, pol, context, stats));
    findings.push(...checkTouchTarget(implNode, refNode, pol, context));
    findings.push(...checkStates(refNode, implNode, pol, context));
  }

  const collapsed = collapseFindings(findings, pol);

  for (const finding of collapsed) {
    if (finding.intent === "drift") stats.drift += 1;
    else if (finding.intent === "required-adaptation") stats.requiredAdaptation += 1;
    else stats.adaptation += 1;
  }

  // Field convergence: how much of what was actually compared is already the way
  // it should be. "Sanctioned" differences (adaptations, recorded a11y remaps)
  // count toward convergence — they are the intended end state, not open work.
  // Node presence, touch targets, and states are tracked separately above.
  if (stats.fieldsCompared > 0) {
    stats.convergence = Math.round(
      ((stats.fieldsPassed + stats.fieldsSanctioned) / stats.fieldsCompared) * 100,
    );
  }

  return { findings: sortAndNumber(collapsed), stats };
}

/**
 * Some differences are global rather than per-node — a font substitution applied
 * across every text node produces one decision, not twelve findings. Collapse
 * only the fields the policy names, and only when the delta text is identical.
 */
function collapseFindings(findings, pol) {
  const collapsible = new Set(pol.collapseFields || []);
  if (!collapsible.size) return findings;

  const groups = new Map();
  const passthrough = [];

  for (const finding of findings) {
    if (!collapsible.has(finding.specField)) {
      passthrough.push(finding);
      continue;
    }
    const key = `${finding.specField}|${finding.intent}|${finding.delta.join("|")}`;
    const group = groups.get(key);
    if (group) group.push(finding);
    else groups.set(key, [finding]);
  }

  for (const group of groups.values()) {
    if (group.length === 1) {
      passthrough.push(group[0]);
      continue;
    }
    const [first] = group;
    const blocks = group.map((finding) => finding.block);
    passthrough.push({
      ...first,
      block: `${describeField(first.specField)} across ${group.length} nodes`,
      notes: [...first.notes, `Affects: ${blocks.join(", ")}.`],
    });
  }

  return passthrough;
}

function isIgnoredNode(node, pol) {
  const patterns = pol.ignoredNodeNamePatterns || [];
  const name = normalizeName(`${node.name || ""} ${node.id || ""}`);
  return patterns.some((pattern) => name.includes(normalizeName(pattern)));
}

function matchNodes(refNodes, implNodes) {
  const remainingImpl = new Set(implNodes);
  const pairs = [];
  const missing = [];

  const keyers = [
    (node) => (node.id ? `id:${node.id}` : null),
    (node) => (node.path ? `path:${node.path}` : null),
    (node) => (node.name ? `name:${node.role || ""}|${normalizeName(node.name)}` : null),
    (node) => (node.text ? `text:${node.role || ""}|${normalizeName(node.text)}` : null),
    (node) => (node.component ? `component:${node.component}|${node.order ?? 0}` : null),
  ];

  const unmatchedRef = [...refNodes];

  for (const keyer of keyers) {
    const index = new Map();
    for (const node of remainingImpl) {
      const key = keyer(node);
      if (!key) continue;
      if (index.has(key)) index.set(key, null);
      else index.set(key, node);
    }

    const stillUnmatched = [];
    for (const node of unmatchedRef) {
      const key = keyer(node);
      const candidate = key ? index.get(key) : null;
      if (candidate && remainingImpl.has(candidate)) {
        pairs.push([node, candidate]);
        remainingImpl.delete(candidate);
      } else {
        stillUnmatched.push(node);
      }
    }
    unmatchedRef.length = 0;
    unmatchedRef.push(...stillUnmatched);
  }

  missing.push(...unmatchedRef);
  return { pairs, missing, extra: [...remainingImpl] };
}

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/g, " ")
    .trim();
}

function nodeLabel(node) {
  return node.name || node.id || node.component || node.role || "node";
}

/* -------------------------------------------------------------- field diff */

function diffNode(refNode, implNode, pol, context, stats) {
  const findings = [];

  for (const [field, declaredClass] of Object.entries(pol.fields || {})) {
    const parityClass = resolveClass(declaredClass, pol, context);
    if (parityClass === "ignored") continue;

    const expected = getPath(refNode, field);
    const actual = getPath(implNode, field);
    if (expected === undefined || expected === null) continue;
    if (actual === undefined || actual === null) continue;

    const comparison = compareValues(field, expected, actual, pol, context);
    if (!comparison) continue;
    stats.fieldsCompared += 1;
    if (comparison.equal) {
      // Equal is not automatically correct: when the reference shows an authored
      // value that carries a recorded accessibility remap, an implementation that
      // matches it verbatim copied the value the remap exists to replace.
      const copied = matchCopiedAuthoredValue(field, expected, actual, pol, context);
      if (copied) {
        const finding = makeFinding({
          node: refNode,
          counterpart: implNode,
          field,
          intent: "required-adaptation",
          parityClass: "required-adaptation",
          severity: pol.severity?.requiredAdaptation || "high",
          expected: `${describeField(field)} in the reference is the authored value ${formatValue(expected)}, which carries a recorded accessibility remap${copied.record ? ` (${copied.record})` : ""}.`,
          actual: `Implementation copied the authored value verbatim instead of applying the accessible value ${copied.accessible}.`,
          delta: [`authored value shipped — accessible remap ${copied.accessible} not applied`],
          recommendedFix: `Apply the accessible value ${copied.accessible}${copied.token ? ` via ${copied.token}` : ""} per the remap record. Matching the reference is the defect here — the reference shows the pre-remap authored value.`,
          context,
        });
        finding.notes.push(
          "Review scope: the authored value may still be legitimate on nodes the remap does not cover (for example decorative, non-text use). Confirm before fixing.",
        );
        findings.push(finding);
        continue;
      }
      stats.fieldsPassed += 1;
      continue;
    }
    if (parityClass === "adaptive") stats.fieldsSanctioned += 1;

    const remap = matchAccessibilityRemap(field, expected, actual, pol, context);
    if (remap) {
      if (parityClass !== "adaptive") stats.fieldsSanctioned += 1;
      findings.push(
        makeFinding({
          node: refNode,
          counterpart: implNode,
          field,
          intent: "required-adaptation",
          parityClass: "required-adaptation",
          severity: "low",
          expected: `${describeField(field)} is ${formatValue(expected)} — the authored value under a recorded accessibility remap.`,
          actual: `Implementation renders ${formatValue(actual)} — the sanctioned accessible value.`,
          delta: comparison.delta,
          recommendedFix: `No fix — this difference is the recorded accessibility remap${remap.record ? ` (${remap.record})` : ""}${remap.token ? ` on ${remap.token}` : ""}. Keep the accessible value; revisit only if the remap record is stale.`,
          context,
        }),
      );
      continue;
    }

    const severity = capSeverity(
      comparison.severity || proposeSeverity(comparison, pol),
      parityClass,
      pol,
    );

    const fontUnreliable =
      context.fontEnvironment === "mismatched" && isFontSensitiveField(field, refNode, implNode);

    const finding = makeFinding({
      node: refNode,
      counterpart: implNode,
      field,
      intent: parityClass === "adaptive" ? "adaptation" : "drift",
      parityClass,
      severity: fontUnreliable ? "low" : severity,
      expected: `${describeField(field)} is ${formatValue(expected)}.`,
      actual: `Implementation renders ${formatValue(actual)}.`,
      delta: comparison.delta,
      recommendedFix: recommendFix(field, refNode, implNode, comparison, context),
      context,
    });
    if (fontUnreliable) {
      finding.notes.push(
        "Font environment mismatched — this metric is unreliable in the current capture. Do not change tokens or sizes based on it; align the fonts and re-measure first.",
      );
    }
    findings.push(finding);
  }

  return findings;
}

function isFontSensitiveField(field, refNode, implNode) {
  if (field === "type.size" || field === "type.lineHeight" || field === "type.letterSpacing") {
    return true;
  }
  const role = refNode?.role || implNode?.role;
  return role === "text" && (field === "box.width" || field === "box.height");
}

function matchAccessibilityRemap(field, expected, actual, pol, context) {
  if (!context.remaps.length || !isColorField(field)) return null;
  for (const remap of context.remaps) {
    const fields = Array.isArray(remap.fields) && remap.fields.length ? remap.fields : null;
    if (fields && !fields.includes(field)) continue;
    if (colorsRoughlyEqual(expected, remap.authored, pol) && colorsRoughlyEqual(actual, remap.accessible, pol)) {
      return remap;
    }
  }
  return null;
}

/**
 * The inverse defect: reference and implementation agree on the authored value,
 * meaning the implementation copied the value the remap exists to replace.
 * Skips degenerate remaps whose authored and accessible values are within
 * color tolerance of each other — those cannot be told apart.
 */
function matchCopiedAuthoredValue(field, expected, actual, pol, context) {
  if (!context.remaps.length || !isColorField(field)) return null;
  for (const remap of context.remaps) {
    const fields = Array.isArray(remap.fields) && remap.fields.length ? remap.fields : null;
    if (fields && !fields.includes(field)) continue;
    if (colorsRoughlyEqual(remap.authored, remap.accessible, pol)) continue;
    if (colorsRoughlyEqual(expected, remap.authored, pol) && colorsRoughlyEqual(actual, remap.authored, pol)) {
      return remap;
    }
  }
  return null;
}

function colorsRoughlyEqual(a, b, pol) {
  const left = parseColor(a);
  const right = parseColor(b);
  if (!left || !right) {
    return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
  }
  const tolerance = pol.tolerance?.color ?? 2;
  const channelDelta = Math.max(
    Math.abs(left.r - right.r),
    Math.abs(left.g - right.g),
    Math.abs(left.b - right.b),
    Math.abs(left.a - right.a) * 255,
  );
  return channelDelta <= tolerance;
}

function resolveClass(declaredClass, pol, context) {
  const resolution = pol.fieldClassResolution || {};
  if (declaredClass === "spacing" || declaredClass === "sizing" || declaredClass === "typography") {
    const rule = resolution[declaredClass] || {};
    return context.sameFormFactor ? rule.sameFormFactor || "strict" : rule.crossFormFactor || "adaptive";
  }
  if (declaredClass === "shadow") {
    const rule = resolution.shadow || {};
    return context.sameEngine ? rule.sameEngine || "strict" : rule.crossEngine || "ignored";
  }
  return declaredClass;
}

function compareValues(field, expected, actual, pol, context) {
  if (field === "type.family") return compareFontFamily(expected, actual, pol);
  if (isColorField(field)) return compareColor(field, expected, actual, pol);
  if (Array.isArray(expected) || Array.isArray(actual)) {
    return compareArray(field, expected, actual, pol);
  }
  if (typeof expected === "number" && typeof actual === "number") {
    return compareNumber(field, expected, actual, pol);
  }
  return compareString(field, expected, actual);
}

function isColorField(field) {
  return field === "fill" || field === "background" || field === "border.color";
}

function compareNumber(field, expected, actual, pol) {
  const tolerance = pol.tolerance?.[field] ?? 0;
  const delta = actual - expected;
  if (Math.abs(delta) <= tolerance) return { equal: true };
  return {
    equal: false,
    delta: [`${describeField(field)} ${formatDelta(delta, field)} (expected ${expected}, actual ${actual})`],
    absDelta: Math.abs(delta),
    ratio: Math.abs(delta) / Math.max(Math.abs(expected), 1),
    kind: "numeric",
  };
}

function compareArray(field, expected, actual, pol) {
  const tolerance = pol.tolerance?.[field] ?? 0;
  const left = Array.isArray(expected) ? expected : [expected, expected, expected, expected];
  const right = Array.isArray(actual) ? actual : [actual, actual, actual, actual];
  const sides = field === "radius"
    ? ["top-left", "top-right", "bottom-right", "bottom-left"]
    : ["top", "right", "bottom", "left"];

  const deltas = [];
  let maxAbs = 0;
  let maxRatio = 0;

  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const a = Number(left[index] ?? 0);
    const b = Number(right[index] ?? 0);
    if (Number.isNaN(a) || Number.isNaN(b)) continue;
    const delta = b - a;
    if (Math.abs(delta) <= tolerance) continue;
    deltas.push(`${describeField(field)} ${sides[index] || index} ${formatDelta(delta, field)} (expected ${a}, actual ${b})`);
    maxAbs = Math.max(maxAbs, Math.abs(delta));
    maxRatio = Math.max(maxRatio, Math.abs(delta) / Math.max(Math.abs(a), 1));
  }

  if (!deltas.length) return { equal: true };
  return { equal: false, delta: deltas, absDelta: maxAbs, ratio: maxRatio, kind: "numeric" };
}

function compareString(field, expected, actual) {
  if (String(expected) === String(actual)) return { equal: true };
  return {
    equal: false,
    delta: [`${describeField(field)} expected "${expected}", actual "${actual}"`],
    kind: field === "text" ? "text" : "structural",
  };
}

function compareColor(field, expected, actual, pol) {
  const a = parseColor(expected);
  const b = parseColor(actual);
  if (!a || !b) return compareString(field, expected, actual);

  const tolerance = pol.tolerance?.color ?? 0;
  const channelDelta = Math.max(
    Math.abs(a.r - b.r),
    Math.abs(a.g - b.g),
    Math.abs(a.b - b.b),
    Math.abs(a.a - b.a) * 255,
  );
  if (channelDelta <= tolerance) return { equal: true };

  return {
    equal: false,
    delta: [`${describeField(field)} expected ${toHex(a)}, actual ${toHex(b)}`],
    kind: "color",
  };
}

function compareFontFamily(expected, actual, pol) {
  const a = normalizeFont(expected);
  const b = normalizeFont(actual);
  if (a === b) return { equal: true };

  const aliased = (pol.fontAliases || []).some((group) => {
    const normalized = group.map(normalizeFont);
    return normalized.includes(a) && normalized.includes(b);
  });

  return {
    equal: false,
    delta: [`font family expected "${expected}", actual "${actual}"`],
    kind: "font",
    severity: aliased ? "low" : "medium",
    aliased,
  };
}

function normalizeFont(value) {
  return String(value || "")
    .split(",")[0]
    .replace(/["']/g, "")
    .trim()
    .toLowerCase();
}

function parseColor(value) {
  if (typeof value !== "string") return null;
  const input = value.trim().toLowerCase();

  const hex = input.match(/^#([0-9a-f]{3,8})$/);
  if (hex) {
    let digits = hex[1];
    if (digits.length === 3 || digits.length === 4) {
      digits = digits.split("").map((char) => char + char).join("");
    }
    if (digits.length !== 6 && digits.length !== 8) return null;
    return {
      r: parseInt(digits.slice(0, 2), 16),
      g: parseInt(digits.slice(2, 4), 16),
      b: parseInt(digits.slice(4, 6), 16),
      a: digits.length === 8 ? parseInt(digits.slice(6, 8), 16) / 255 : 1,
    };
  }

  const rgb = input.match(/^rgba?\(([^)]+)\)$/);
  if (rgb) {
    const parts = rgb[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    if (parts.length < 3 || parts.some(Number.isNaN)) return null;
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
  }

  if (input === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
  return null;
}

function toHex({ r, g, b, a }) {
  const channel = (value) => Math.round(Math.max(0, Math.min(255, value))).toString(16).padStart(2, "0");
  const base = `#${channel(r)}${channel(g)}${channel(b)}`;
  return a < 1 ? `${base}${channel(a * 255)}` : base;
}

/* ------------------------------------------------------- platform-specific */

function checkTouchTarget(implNode, refNode, pol, context) {
  const minimum = context.minTouchTarget;
  if (!minimum || !context.implementationIsTouch) return [];
  if (!context.interactiveRoles.includes(implNode.role)) return [];

  const width = implNode.box?.width;
  const height = implNode.box?.height;
  const smallest = [width, height].filter((value) => typeof value === "number");
  if (!smallest.length) return [];
  const actual = Math.min(...smallest);
  if (actual >= minimum) return [];

  return [
    makeFinding({
      node: refNode,
      counterpart: implNode,
      field: "touchTarget",
      intent: "required-adaptation",
      parityClass: "required-adaptation",
      severity: pol.severity?.requiredAdaptation || "high",
      expected: `${context.implementationPlatform} requires interactive targets of at least ${minimum}pt/dp on both axes.`,
      actual: `"${nodeLabel(implNode)}" is ${width ?? "?"}x${height ?? "?"}, smallest axis ${actual}.`,
      delta: [`touch target ${actual} < ${minimum} minimum`],
      recommendedFix: `Grow the hit area to ${minimum} on both axes — enlarge the control, or keep the visual size and add padding / a hitSlop so the touch region meets the minimum. Do not copy the reference size verbatim.`,
      context,
    }),
  ];
}

function checkStates(refNode, implNode, pol, context) {
  const statePolicy = pol.statePolicy || {};
  const skip = new Set([
    ...(context.implementationIsTouch ? statePolicy.pointerOnlyStates || [] : []),
    ...(context.implementationIsTouch ? [] : statePolicy.touchOnlyStates || []),
  ]);

  const refStates = Object.keys(refNode.states || {});
  const implStates = new Set(Object.keys(implNode.states || {}));
  const missing = refStates.filter((state) => !skip.has(state) && !implStates.has(state));
  if (!missing.length) return [];

  return [
    makeFinding({
      node: refNode,
      counterpart: implNode,
      field: "states",
      intent: "drift",
      parityClass: "strict",
      severity: "medium",
      expected: `Reference defines the ${missing.join(", ")} state(s).`,
      actual: `Implementation defines ${implStates.size ? [...implStates].join(", ") : "no"} state(s).`,
      delta: missing.map((state) => `missing ${state} state`),
      recommendedFix: `Implement the ${missing.join(", ")} state(s) on "${nodeLabel(refNode)}", reusing the component variant or token that owns them.`,
      context,
    }),
  ];
}

/* ----------------------------------------------------------------- output */

function makeFinding({ node, counterpart, field, intent, parityClass, severity, expected, actual, delta, recommendedFix, context }) {
  const owner = node || counterpart || {};
  const tokens = collectTokens(node, field);
  return {
    severity,
    intent,
    parityClass,
    specField: field,
    block: nodeLabel(owner),
    ownership: inferOwnership(node, counterpart, field),
    status: "open",
    expected,
    actual,
    delta: Array.isArray(delta) ? delta : [delta].filter(Boolean),
    recommendedFix,
    designReference: node?.id || "",
    implementationReference: counterpart?.component || counterpart?.id || "",
    tokens,
    files: [],
    notes: buildNotes(node, counterpart, context),
  };
}

function collectTokens(node, field) {
  if (!node?.tokenRefs) return [];
  const direct = node.tokenRefs[field];
  if (direct) return [String(direct)];
  const root = field.split(".")[0];
  const viaRoot = node.tokenRefs[root];
  return viaRoot ? [String(viaRoot)] : [];
}

function inferOwnership(node, counterpart, field) {
  const withTokens = node?.tokenRefs || counterpart?.tokenRefs;
  if (withTokens && (withTokens[field] || withTokens[field.split(".")[0]])) return "token/theme";
  if (counterpart?.component || node?.component) return "primitive/shared component";
  if (field.startsWith("layout") || field === "presence") return "composition";
  return "unclassified";
}

function buildNotes(node, counterpart, context) {
  const notes = [];
  if (node?.notes) notes.push(String(node.notes));
  if (counterpart?.notes) notes.push(String(counterpart.notes));
  if (!context.sameFormFactor) {
    notes.push("Cross form factor comparison — verify the intended responsive behavior before treating this as drift.");
  }
  return notes;
}

function proposeSeverity(comparison, pol) {
  if (comparison.kind === "color") return pol.severity?.color || "medium";
  if (comparison.kind === "text") return pol.severity?.text || "high";
  if (comparison.kind === "structural") return pol.severity?.structural || "high";
  if (comparison.kind !== "numeric") return "medium";

  for (const rule of pol.severity?.numeric || []) {
    const ratioOk = rule.maxDeltaRatio == null || comparison.ratio <= rule.maxDeltaRatio;
    const pxOk = rule.maxDeltaPx == null || comparison.absDelta <= rule.maxDeltaPx;
    if (rule.maxDeltaRatio == null && rule.maxDeltaPx == null) return rule.severity;
    if (ratioOk || pxOk) return rule.severity;
  }
  return "medium";
}

function capSeverity(severity, parityClass, pol) {
  if (parityClass !== "adaptive") return severity;
  const cap = pol.severity?.adaptiveCap || "low";
  const rank = { high: 0, medium: 1, low: 2 };
  return rank[severity] < rank[cap] ? cap : severity;
}

function recommendFix(field, refNode, implNode, comparison, context) {
  const token = collectTokens(refNode, field)[0];
  const owner = implNode?.component || refNode?.component;
  const target = owner ? `the ${owner} component` : `"${nodeLabel(refNode)}"`;

  if (comparison.kind === "font" && comparison.aliased) {
    return `Font substitution looks sanctioned for ${context.implementationPlatform}. Confirm the design system names this fallback; if it does, record it and close this candidate.`;
  }
  if (field === "text") {
    return `Correct the copy on ${target} to match the reference exactly, or confirm the reference is stale. Route it through the project's i18n/content source rather than hardcoding it.`;
  }
  if (field === "asset") {
    return `Replace the asset on ${target} with the one the reference specifies, exporting it from the design source rather than recreating it.`;
  }
  if (token) {
    return `Apply ${token} to ${describeField(field)} on ${target} instead of the current value.`;
  }
  return `Align ${describeField(field)} on ${target} with the reference. Prefer an existing token or component variant over a one-off value.`;
}

function describeField(field) {
  const labels = {
    "layout.mode": "layout direction",
    "layout.justify": "main-axis alignment",
    "layout.align": "cross-axis alignment",
    "layout.gap": "gap",
    "box.padding": "padding",
    "box.margin": "margin",
    "box.width": "width",
    "box.height": "height",
    "box.minWidth": "min width",
    "box.maxWidth": "max width",
    "type.family": "font family",
    "type.size": "font size",
    "type.weight": "font weight",
    "type.lineHeight": "line height",
    "type.letterSpacing": "letter spacing",
    "type.align": "text alignment",
    "type.transform": "text transform",
    "border.width": "border width",
    "border.color": "border color",
    "border.style": "border style",
    fill: "text/icon color",
    background: "background color",
    radius: "corner radius",
    shadow: "shadow",
    elevation: "elevation",
    opacity: "opacity",
    text: "text content",
    asset: "asset",
    presence: "node presence",
    states: "interaction states",
    touchTarget: "touch target size",
  };
  return labels[field] || field;
}

function formatValue(value) {
  if (Array.isArray(value)) return `[${value.join(", ")}]`;
  if (typeof value === "object" && value !== null) return JSON.stringify(value);
  return String(value);
}

function formatDelta(delta, field) {
  const rounded = Math.round(delta * 100) / 100;
  const unit = (policy.unitlessFields || []).includes(field) ? "" : "px";
  return `${rounded > 0 ? "+" : ""}${rounded}${unit}`;
}

function getPath(object, dottedPath) {
  return dottedPath.split(".").reduce((current, key) => (current == null ? undefined : current[key]), object);
}

function sortAndNumber(findings) {
  const severityRank = { high: 0, medium: 1, low: 2 };
  const intentRank = { drift: 0, "required-adaptation": 1, adaptation: 2 };
  const sorted = [...findings].sort((a, b) => {
    const bySeverity = severityRank[a.severity] - severityRank[b.severity];
    if (bySeverity !== 0) return bySeverity;
    const byIntent = intentRank[a.intent] - intentRank[b.intent];
    if (byIntent !== 0) return byIntent;
    return String(a.block).localeCompare(String(b.block));
  });
  return sorted.map((finding, index) => ({
    id: `PA-${String(index + 1).padStart(3, "0")}`,
    ...finding,
  }));
}
