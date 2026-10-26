// Shared near-token review logic for audit_tokens.mjs, generate_review_html.mjs and
// apply_token_decisions.mjs: review markers, CIEDE2000, clustering with a diameter
// cap, canonical selection, the auto / proposal / must-ask triage, 4px / 8px scale
// fitting and the Near Token Decisions row format. Pure functions only; the scripts
// own file access and reporting. The parsers at the bottom (loadTokenPackage) exist
// for apply_token_decisions.mjs, which has no parsed data of its own.

import fs from "node:fs/promises";
import path from "node:path";

export const TIERS = ["auto", "proposal", "must-ask"];
export const PROVENANCES = ["authored", "measured", "unknown"];

export const NEAR_COLOR_DELTA_E = 3;
export const NEAR_COLOR_ALPHA_DELTA = 0.03;
export const COLOR_CLUSTER_DIAMETER = 6;
export const COLOR_JND = 1; // measured vs measured: below this the eye cannot tell
export const COLOR_SNAP = 2; // measured snaps into authored within this distance

// Base near thresholds per unit group (the ratio rules live in isNearNumericValue).
export const NUMERIC_NEAR = { length: 2, time: 50, percent: 2, angle: 2, number: 0.02 };
// Diameter cap = twice the base near threshold.
export const NUMERIC_DIAMETER = { length: 4, time: 100, percent: 4, angle: 4, number: 0.04 };
// Auto threshold (both measured-vs-measured and measured-into-authored).
export const NUMERIC_AUTO = { length: 1, time: 16, percent: 1, angle: 1, number: 0.01 };

export const SCALE_BASES = [4, 8];
export const SCALE_MAX_VALUE = 512;
export const SCALE_HAIRLINES = [1, 2];

const TIER_RANK = { auto: 0, proposal: 1, "must-ask": 2 };
const PROVENANCE_RANK = { authored: 0, measured: 1, unknown: 2 };

export function tierRank(tier) {
  return TIER_RANK[tier] ?? -1;
}

export function formatDistance(value) {
  if (!Number.isFinite(value)) return String(value);
  return String(Number(value.toFixed(2)));
}

// ---------------------------------------------------------------------------
// Review markers: "provenance: authored; usage: 14; sources: S1, S3" in the comment
// that precedes a declaration or sits on the same line after it.

export function parseReviewMarkers(declaration) {
  const text = declaration
    ? `${declaration.leadingComment || ""}\n${declaration.trailingComment || ""}`
    : "";
  const provenanceMatch = text.match(/provenance\s*:\s*(authored|measured)\b/i);
  const usageMatch = text.match(/\busage\s*:\s*(\d+)\b/i);
  const sourcesMatch = text.match(/\bsources?\s*:\s*([^;\n]+)/i);
  return {
    provenance: provenanceMatch ? provenanceMatch[1].toLowerCase() : "unknown",
    usage: usageMatch ? Number(usageMatch[1]) : null,
    sources: sourcesMatch
      ? sourcesMatch[1]
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [],
  };
}

// ---------------------------------------------------------------------------
// Color math: sRGB -> Lab (D65) -> CIEDE2000.

function srgbToLinear(channel) {
  const normalized = channel / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function labPivot(value) {
  return value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116;
}

export function rgbToLab(color) {
  const r = srgbToLinear(color.r);
  const g = srgbToLinear(color.g);
  const b = srgbToLinear(color.b);
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const fx = labPivot(x);
  const fy = labPivot(y);
  const fz = labPivot(z);
  return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

const rad = (degrees) => (degrees * Math.PI) / 180;
const deg = (radians) => (radians * 180) / Math.PI;

export function deltaE2000(colorA, colorB) {
  const lab1 = rgbToLab(colorA);
  const lab2 = rgbToLab(colorB);
  const c1 = Math.hypot(lab1.a, lab1.b);
  const c2 = Math.hypot(lab2.a, lab2.b);
  const cBar = (c1 + c2) / 2;
  const cBar7 = cBar ** 7;
  const g = 0.5 * (1 - Math.sqrt(cBar7 / (cBar7 + 25 ** 7)));
  const a1p = (1 + g) * lab1.a;
  const a2p = (1 + g) * lab2.a;
  const c1p = Math.hypot(a1p, lab1.b);
  const c2p = Math.hypot(a2p, lab2.b);
  const hue = (a, b) => {
    if (a === 0 && b === 0) return 0;
    const h = deg(Math.atan2(b, a));
    return h < 0 ? h + 360 : h;
  };
  const h1p = hue(a1p, lab1.b);
  const h2p = hue(a2p, lab2.b);

  const dLp = lab2.l - lab1.l;
  const dCp = c2p - c1p;
  let dhp = 0;
  if (c1p * c2p !== 0) {
    const diff = h2p - h1p;
    if (Math.abs(diff) <= 180) dhp = diff;
    else if (diff > 180) dhp = diff - 360;
    else dhp = diff + 360;
  }
  const dHp = 2 * Math.sqrt(c1p * c2p) * Math.sin(rad(dhp / 2));

  const lBp = (lab1.l + lab2.l) / 2;
  const cBp = (c1p + c2p) / 2;
  let hBp;
  if (c1p * c2p === 0) hBp = h1p + h2p;
  else if (Math.abs(h1p - h2p) <= 180) hBp = (h1p + h2p) / 2;
  else if (h1p + h2p < 360) hBp = (h1p + h2p + 360) / 2;
  else hBp = (h1p + h2p - 360) / 2;

  const t =
    1 -
    0.17 * Math.cos(rad(hBp - 30)) +
    0.24 * Math.cos(rad(2 * hBp)) +
    0.32 * Math.cos(rad(3 * hBp + 6)) -
    0.2 * Math.cos(rad(4 * hBp - 63));
  const dTheta = 30 * Math.exp(-(((hBp - 275) / 25) ** 2));
  const cBp7 = cBp ** 7;
  const rC = 2 * Math.sqrt(cBp7 / (cBp7 + 25 ** 7));
  const sL = 1 + (0.015 * (lBp - 50) ** 2) / Math.sqrt(20 + (lBp - 50) ** 2);
  const sC = 1 + 0.045 * cBp;
  const sH = 1 + 0.015 * cBp * t;
  const rT = -Math.sin(rad(2 * dTheta)) * rC;

  const termL = dLp / sL;
  const termC = dCp / sC;
  const termH = dHp / sH;
  return Math.sqrt(termL ** 2 + termC ** 2 + termH ** 2 + rT * termC * termH);
}

export function isNearColor(colorA, colorB) {
  const alphaDiff = Math.abs((colorA.a ?? 1) - (colorB.a ?? 1));
  return alphaDiff <= NEAR_COLOR_ALPHA_DELTA && deltaE2000(colorA, colorB) <= NEAR_COLOR_DELTA_E;
}

// Same rule the audit used before clustering; kept here so every tool agrees.
export function isNearNumericValue(a, b) {
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

export function numericDistanceLabel(diff, unitGroup) {
  const unit = { length: "px", time: "ms", percent: "%", angle: "deg" }[unitGroup] || "";
  return `diff ${formatDistance(diff)}${unit}`;
}

// ---------------------------------------------------------------------------
// Usage: var(--name) references in the sys / comp layers. The name must be followed
// by ")" or "," so --md-ref-size-12 is never counted for --md-ref-size-120.

export function countVarReferences(cssTexts) {
  const counts = new Map();
  const pattern = /var\(\s*(--[A-Za-z0-9_-]+)\s*(?=[,)])/g;
  for (const text of cssTexts) {
    const clean = String(text || "").replace(/\/\*[\s\S]*?\*\//g, "");
    let match;
    while ((match = pattern.exec(clean))) {
      counts.set(match[1], (counts.get(match[1]) || 0) + 1);
    }
  }
  return counts;
}

export function usageScore(name, markers, varCounts) {
  return (varCounts?.get(name) || 0) + (markers?.usage || 0);
}

// ---------------------------------------------------------------------------
// Clustering: near edges -> connected components -> complete-linkage split at the
// diameter cap. Groups only merge across a near edge, so a cluster is always
// internally near-connected.

function clusterIndices(count, distanceAt, nearAt, diameter) {
  const parent = Array.from({ length: count }, (_, index) => index);
  const find = (index) => {
    while (parent[index] !== index) {
      parent[index] = parent[parent[index]];
      index = parent[index];
    }
    return index;
  };
  const union = (a, b) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent[rootB] = rootA;
  };

  for (let i = 0; i < count; i += 1) {
    for (let j = i + 1; j < count; j += 1) {
      if (nearAt(i, j)) union(i, j);
    }
  }

  const components = new Map();
  for (let index = 0; index < count; index += 1) {
    const root = find(index);
    if (!components.has(root)) components.set(root, []);
    components.get(root).push(index);
  }

  const clusters = [];
  for (const component of components.values()) {
    if (component.length < 2) continue;
    let groups = component.map((index) => [index]);
    const completeDistance = (groupA, groupB) => {
      let max = 0;
      let hasNearEdge = false;
      for (const a of groupA) {
        for (const b of groupB) {
          max = Math.max(max, distanceAt(a, b));
          if (nearAt(a, b)) hasNearEdge = true;
        }
      }
      return { max, hasNearEdge };
    };
    // Repeatedly merge the closest pair of groups that share a near edge and whose
    // complete-linkage distance stays within the cap.
    let merged = true;
    while (merged && groups.length > 1) {
      merged = false;
      let best = null;
      for (let a = 0; a < groups.length; a += 1) {
        for (let b = a + 1; b < groups.length; b += 1) {
          const { max, hasNearEdge } = completeDistance(groups[a], groups[b]);
          if (!hasNearEdge || max > diameter) continue;
          if (!best || max < best.max) best = { a, b, max };
        }
      }
      if (best) {
        const combined = [...groups[best.a], ...groups[best.b]].sort((x, y) => x - y);
        groups = groups.filter((_, index) => index !== best.a && index !== best.b);
        groups.push(combined);
        merged = true;
      }
    }
    for (const group of groups) {
      if (group.length >= 2) clusters.push(group);
    }
  }
  return clusters;
}

// Canonical: provenance, then usage score, then a "round" value (color step that is a
// multiple of 10 / length on the 4px grid), then token name.
function preferredValue(item, kind) {
  if (kind === "color") return item.step !== null && item.step !== undefined && item.step % 10 === 0;
  if (item.numeric?.unitGroup === "length") return Math.abs(item.numeric.normalized % 4) < 1e-9;
  return false;
}

export function selectCanonical(items, kind) {
  const sorted = [...items].sort((a, b) => {
    const provenanceDiff = PROVENANCE_RANK[a.provenance] - PROVENANCE_RANK[b.provenance];
    if (provenanceDiff !== 0) return provenanceDiff;
    if (a.usage !== b.usage) return b.usage - a.usage;
    const preferredA = preferredValue(a, kind) ? 0 : 1;
    const preferredB = preferredValue(b, kind) ? 0 : 1;
    if (preferredA !== preferredB) return preferredA - preferredB;
    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
  });
  return sorted[0];
}

// Tier for one non-canonical member against the canonical.
export function tierFor({ memberProvenance, canonicalProvenance, distance, kind, unitGroup }) {
  const autoThreshold =
    kind === "color"
      ? canonicalProvenance === "authored"
        ? COLOR_SNAP
        : COLOR_JND
      : NUMERIC_AUTO[unitGroup] ?? NUMERIC_AUTO.number;

  if (memberProvenance === "authored" && canonicalProvenance === "authored") {
    return { tier: "must-ask", proposed: null, rule: "authored vs authored" };
  }
  if (memberProvenance === "unknown" || canonicalProvenance === "unknown") {
    if (memberProvenance === "authored" || canonicalProvenance === "authored") {
      return { tier: "proposal", proposed: "keep distinct", rule: "unknown provenance vs authored" };
    }
    return { tier: "proposal", proposed: "merge", rule: "unknown provenance" };
  }
  if (memberProvenance === "measured" && canonicalProvenance === "authored") {
    if (distance <= autoThreshold) {
      return { tier: "auto", proposed: "merge", rule: "measured snaps into authored" };
    }
    return { tier: "proposal", proposed: "keep distinct", rule: "measured near authored beyond snap" };
  }
  // measured vs measured (an authored member always has an authored canonical).
  if (distance <= autoThreshold) {
    return { tier: "auto", proposed: "merge", rule: "measured vs measured below JND" };
  }
  return { tier: "proposal", proposed: "merge", rule: "measured vs measured above JND" };
}

function clusterTier(members) {
  return members.reduce(
    (worst, member) => (tierRank(member.tier) > tierRank(worst) ? member.tier : worst),
    "auto",
  );
}

/**
 * Build near-token clusters.
 * @param {object} input
 * @param {Array<{name, value, family, step, color}>} input.colors parsed reference colors
 * @param {Array<{name, value, family, numeric}>} input.numbers parsed reference numbers
 * @param {Map<string, {leadingComment, trailingComment}>} input.declarations ref declarations
 * @param {Map<string, number>} [input.varCounts] var() reference counts
 * @param {(member: string, canonical: string) => boolean} [input.hasDecision]
 */
export function buildTokenClusters({ colors = [], numbers = [], declarations, varCounts, hasDecision }) {
  const decided = typeof hasDecision === "function" ? hasDecision : () => false;
  const annotate = (item) => {
    const markers = parseReviewMarkers(declarations?.get(item.name));
    return {
      ...item,
      provenance: markers.provenance,
      usage: usageScore(item.name, markers, varCounts),
      sources: markers.sources,
    };
  };

  const clusters = [];

  const colorItems = colors.map(annotate).sort((a, b) => (a.name < b.name ? -1 : 1));
  const colorDistance = new Map();
  const colorDistanceAt = (i, j) => {
    const key = i < j ? `${i}:${j}` : `${j}:${i}`;
    if (!colorDistance.has(key)) {
      colorDistance.set(key, deltaE2000(colorItems[i].color, colorItems[j].color));
    }
    return colorDistance.get(key);
  };
  const colorNearAt = (i, j) =>
    Math.abs((colorItems[i].color.a ?? 1) - (colorItems[j].color.a ?? 1)) <= NEAR_COLOR_ALPHA_DELTA &&
    colorDistanceAt(i, j) <= NEAR_COLOR_DELTA_E;
  for (const group of clusterIndices(colorItems.length, colorDistanceAt, colorNearAt, COLOR_CLUSTER_DIAMETER)) {
    const items = group.map((index) => colorItems[index]);
    const canonical = selectCanonical(items, "color");
    const members = items
      .filter((item) => item.name !== canonical.name)
      .map((item) => {
        const distance = deltaE2000(canonical.color, item.color);
        const tier = tierFor({
          memberProvenance: item.provenance,
          canonicalProvenance: canonical.provenance,
          distance,
          kind: "color",
        });
        return {
          name: item.name,
          value: item.value,
          provenance: item.provenance,
          usage: item.usage,
          sources: item.sources,
          distance,
          distanceLabel: `deltaE2000 ${formatDistance(distance)}`,
          ...tier,
          documented: decided(item.name, canonical.name),
        };
      });
    clusters.push({
      kind: "color",
      family: canonical.family || "unknown",
      unitGroup: null,
      canonical: {
        name: canonical.name,
        value: canonical.value,
        provenance: canonical.provenance,
        usage: canonical.usage,
        sources: canonical.sources,
        step: canonical.step ?? null,
      },
      members,
    });
  }

  const numberItems = numbers.map(annotate).sort((a, b) => (a.name < b.name ? -1 : 1));
  const sameBucket = (i, j) =>
    numberItems[i].family === numberItems[j].family &&
    numberItems[i].numeric.unitGroup === numberItems[j].numeric.unitGroup;
  const numberDistanceAt = (i, j) =>
    sameBucket(i, j)
      ? Math.abs(numberItems[i].numeric.normalized - numberItems[j].numeric.normalized)
      : Number.POSITIVE_INFINITY;
  const numberNearAt = (i, j) => sameBucket(i, j) && isNearNumericValue(numberItems[i].numeric, numberItems[j].numeric);
  const numberGroups = [];
  // Cluster per bucket so the cap applies with the right unit group.
  const buckets = new Map();
  numberItems.forEach((item, index) => {
    const key = `${item.family}|${item.numeric.unitGroup}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(index);
  });
  for (const indices of buckets.values()) {
    if (indices.length < 2) continue;
    const unitGroup = numberItems[indices[0]].numeric.unitGroup;
    const diameter = NUMERIC_DIAMETER[unitGroup] ?? NUMERIC_DIAMETER.number;
    const local = clusterIndices(
      indices.length,
      (a, b) => numberDistanceAt(indices[a], indices[b]),
      (a, b) => numberNearAt(indices[a], indices[b]),
      diameter,
    );
    for (const group of local) numberGroups.push(group.map((position) => indices[position]));
  }
  for (const group of numberGroups) {
    const items = group.map((index) => numberItems[index]);
    const canonical = selectCanonical(items, "number");
    const unitGroup = canonical.numeric.unitGroup;
    const members = items
      .filter((item) => item.name !== canonical.name)
      .map((item) => {
        const distance = Math.abs(item.numeric.normalized - canonical.numeric.normalized);
        const tier = tierFor({
          memberProvenance: item.provenance,
          canonicalProvenance: canonical.provenance,
          distance,
          kind: "number",
          unitGroup,
        });
        return {
          name: item.name,
          value: item.value,
          provenance: item.provenance,
          usage: item.usage,
          sources: item.sources,
          distance,
          distanceLabel: numericDistanceLabel(distance, unitGroup),
          ...tier,
          documented: decided(item.name, canonical.name),
        };
      });
    clusters.push({
      kind: "number",
      family: canonical.family || "unknown",
      unitGroup,
      canonical: {
        name: canonical.name,
        value: canonical.value,
        provenance: canonical.provenance,
        usage: canonical.usage,
        sources: canonical.sources,
        step: null,
      },
      members,
    });
  }

  // Deterministic ids: colors first, then by family and canonical name.
  clusters.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "color" ? -1 : 1;
    if (a.family !== b.family) return a.family < b.family ? -1 : 1;
    return a.canonical.name < b.canonical.name ? -1 : a.canonical.name > b.canonical.name ? 1 : 0;
  });
  clusters.forEach((cluster, index) => {
    cluster.id = `C${index + 1}`;
    cluster.tier = clusterTier(cluster.members);
    cluster.members.sort((a, b) => (a.name < b.name ? -1 : 1));
  });

  const counts = {
    clusters: clusters.length,
    tiers: { auto: 0, proposal: 0, "must-ask": 0 },
    members: 0,
    memberTiers: { auto: 0, proposal: 0, "must-ask": 0 },
    candidates: 0,
    documented: 0,
  };
  for (const cluster of clusters) {
    counts.tiers[cluster.tier] += 1;
    for (const member of cluster.members) {
      counts.members += 1;
      counts.memberTiers[member.tier] += 1;
      if (member.documented) counts.documented += 1;
      else counts.candidates += 1;
    }
  }

  return { clusters, counts };
}

export function clusterSummaryLine(cluster) {
  const members = cluster.members
    .map(
      (member) =>
        `${member.name} (${member.distanceLabel}, ${member.tier}${member.proposed ? `: ${member.proposed}` : ""}${member.documented ? ", documented" : ""})`,
    )
    .join("; ");
  return `${cluster.id} [${cluster.tier}] ${cluster.kind}/${cluster.family}: canonical ${cluster.canonical.name} (${cluster.canonical.value}, ${cluster.canonical.provenance}, usage ${cluster.canonical.usage}) <- ${members}`;
}

// ---------------------------------------------------------------------------
// Scale fitting for length values: 4px or 8px grid, hairlines and huge values excluded.

export function fitLengthScale(numbers) {
  const lengths = (numbers || []).filter((item) => item.numeric?.unitGroup === "length");
  if (!lengths.length) return null;
  const excluded = [];
  const candidates = [];
  for (const item of lengths) {
    const value = Math.abs(item.numeric.normalized);
    if (value > SCALE_MAX_VALUE) excluded.push({ name: item.name, value: item.value, reason: `above ${SCALE_MAX_VALUE}px` });
    else if (SCALE_HAIRLINES.includes(value)) excluded.push({ name: item.name, value: item.value, reason: "hairline" });
    else candidates.push(item);
  }
  if (!candidates.length) return null;

  const fitFor = (base) =>
    candidates.map((item) => {
      const value = item.numeric.normalized;
      // A value halfway between two steps snaps to the lower step (18 -> 16 on 4px).
      const lower = Math.floor(value / base) * base;
      const upper = lower + base;
      const nearest = value - lower <= upper - value ? lower : upper;
      return { name: item.name, value: item.value, normalized: value, nearest, residual: value - nearest };
    });
  const fits = SCALE_BASES.map((base) => {
    const fitted = fitFor(base);
    return { base, fitted, total: fitted.reduce((sum, entry) => sum + Math.abs(entry.residual), 0) };
  });
  // Smaller total residual wins; a tie goes to the coarser grid.
  const chosen = fits.reduce((best, fit) => (fit.total < best.total ? fit : best), fits[fits.length - 1]);

  const onGrid = [];
  const nearGrid = [];
  const outliers = [];
  for (const entry of chosen.fitted) {
    const magnitude = Math.abs(entry.residual);
    const record = {
      name: entry.name,
      value: entry.value,
      nearest: entry.nearest,
      residual: Number(entry.residual.toFixed(2)),
    };
    if (magnitude <= 0.5) onGrid.push(record);
    else if (magnitude <= 1) nearGrid.push(record);
    else outliers.push(record);
  }
  return {
    base: chosen.base,
    total: lengths.length,
    fitted: candidates.length,
    onGrid,
    nearGrid,
    outliers,
    excluded,
  };
}

export function scaleFitSummaryLine(fit) {
  if (!fit) return null;
  return `Scale fit (length): base ${fit.base}px, on-grid ${fit.onGrid.length}/${fit.fitted}, outliers ${fit.outliers.length}`;
}

export function scaleFitOutlierLine(fit) {
  if (!fit || !fit.outliers.length) return null;
  const list = fit.outliers
    .map((entry) => `${entry.name} (${entry.value}, nearest ${entry.nearest}px, ${entry.residual > 0 ? "+" : ""}${entry.residual})`)
    .join(", ");
  return `Off-grid length tokens on the ${fit.base}px grid: ${list}. Snap to the nearest step or record why the value is intentional.`;
}

// ---------------------------------------------------------------------------
// Generic union-find grouping: items whose keys overlap land in one group. Used for
// component similarity rows (candidate + similar names) by the audit and the review page.

export function groupConnected(items, keysOf) {
  const parent = new Map();
  const find = (key) => {
    if (!parent.has(key)) parent.set(key, key);
    let current = key;
    while (parent.get(current) !== current) {
      parent.set(current, parent.get(parent.get(current)));
      current = parent.get(current);
    }
    return current;
  };
  const union = (a, b) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent.set(rootB, rootA);
  };
  const itemKeys = items.map((item, index) => {
    const keys = (keysOf(item) || []).map((key) => String(key)).filter(Boolean);
    if (!keys.length) keys.push(`item-${index + 1}`);
    for (const key of keys.slice(1)) union(keys[0], key);
    return keys;
  });
  const groups = new Map();
  items.forEach((item, index) => {
    const root = find(itemKeys[index][0]);
    if (!groups.has(root)) groups.set(root, { keys: new Set(), items: [] });
    const group = groups.get(root);
    for (const key of itemKeys[index]) group.keys.add(key);
    group.items.push(item);
  });
  return [...groups.values()].map((group) => ({ keys: [...group.keys], items: group.items }));
}

// ---------------------------------------------------------------------------
// Decision rows: the eight columns of the Near Token Decisions table.

export const DECISION_TABLE_HEADER =
  "| Candidate A | Provenance A | Candidate B | Provenance B | Difference | Decision (`merge` / `keep distinct`) | Rationale | Confirmed by |";
export const DECISION_TABLE_DIVIDER = "|---|---|---|---|---|---|---|---|";

export function decisionRowMarkdown({ cluster, member, decision, confirmedBy }) {
  const canonical = cluster.canonical;
  return `| ${member.name} | ${member.provenance} | ${canonical.name} | ${canonical.provenance} | ${member.distanceLabel} (${member.tier}) | ${decision} | ${member.rule} (${cluster.id}) | ${confirmedBy} |`;
}

export function applyCommand(tier, extra = "") {
  const base = `node <skill-root>/scripts/apply_token_decisions.mjs <target-root> --tier ${tier}`;
  if (tier === "auto") return `${base} --rewrite-css${extra}`;
  if (tier === "proposal") return `${base} --confirmed-by "<developer>"${extra}`;
  return `${base} --only <canonical> --decision merge|keep-distinct --confirmed-by "<developer>"${extra}`;
}

// ---------------------------------------------------------------------------
// Decision detection (mirrors audit_tokens.mjs) and a package loader for scripts
// that have no parsed data of their own.

function reviewText(declaration) {
  if (!declaration) return "";
  return `${declaration.leadingComment}\n${declaration.trailingComment}`;
}

export function hasCssReviewDecision(declarationA, declarationB) {
  const text = `${reviewText(declarationA)}\n${reviewText(declarationB)}`;
  return (
    /token-review\s*:\s*(?:keep|keep-distinct|merge|merge-with|approved|separate|split)/i.test(text) ||
    /a11y-remap/i.test(text)
  );
}

export function hasArchitectureReviewDecision(architectureDoc, tokenA, tokenB) {
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
    return /merge|merged|keep|distinct|separate|split|approved|合併|保留|拆開|分開|確認/.test(line);
  });
}

export function makeDecisionLookup(architectureDoc, declarations) {
  return (tokenA, tokenB) =>
    hasCssReviewDecision(declarations.get(tokenA), declarations.get(tokenB)) ||
    hasArchitectureReviewDecision(architectureDoc, tokenA, tokenB);
}

export function stripInlineComments(value) {
  return String(value).replace(/\/\*[\s\S]*?\*\//g, "").trim();
}

export function parseDeclarations(css) {
  const declarations = new Map();
  // The trailing comment may only sit on the same line as the declaration.
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

export function parseReferenceColorName(name) {
  const normalized = normalizeTokenName(name);
  const marker = "-ref-color-";
  const markerIndex = normalized.indexOf(marker);
  if (markerIndex === -1) return null;
  const segments = normalized.slice(markerIndex + marker.length).split("-").filter(Boolean);
  const stepSegment = segments[segments.length - 1];
  const hasStep = /^\d+$/.test(stepSegment || "");
  return {
    family: hasStep ? segments.slice(0, -1).join("-") : segments.join("-"),
    step: hasStep ? Number(stepSegment) : null,
  };
}

export function parseReferenceFamily(name) {
  const normalized = normalizeTokenName(name);
  const marker = "-ref-";
  const markerIndex = normalized.indexOf(marker);
  if (markerIndex === -1) return "unknown";
  return normalized.slice(markerIndex + marker.length).split("-").filter(Boolean)[0] || "unknown";
}

const clamp01 = (value) => Math.min(1, Math.max(0, value));

function parseCssNumberOrPercent(raw, maxValue) {
  const value = String(raw).trim();
  if (value.endsWith("%")) return clamp01(Number(value.slice(0, -1)) / 100) * maxValue;
  return Number(value);
}

function parseHexColor(value) {
  const match = String(value).trim().match(/^#([0-9a-fA-F]{3,8})$/);
  if (!match) return null;
  let hex = match[1];
  if (hex.length === 3 || hex.length === 4) hex = hex.split("").map((char) => char + char).join("");
  if (hex.length !== 6 && hex.length !== 8) return null;
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
    a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
  };
}

function splitColorParts(inner) {
  const [colorPart, alphaPart] = inner.split("/").map((part) => part.trim());
  const parts = colorPart.includes(",")
    ? colorPart.split(",").map((part) => part.trim())
    : colorPart.split(/\s+/).map((part) => part.trim());
  if (alphaPart !== undefined) parts.push(alphaPart);
  return parts;
}

function parseRgbColor(value) {
  const match = String(value).trim().match(/^rgba?\((.+)\)$/i);
  if (!match) return null;
  const parts = splitColorParts(match[1]);
  if (parts.length < 3) return null;
  const r = parseCssNumberOrPercent(parts[0], 255);
  const g = parseCssNumberOrPercent(parts[1], 255);
  const b = parseCssNumberOrPercent(parts[2], 255);
  const a = parts[3] === undefined ? 1 : parseCssNumberOrPercent(parts[3], 1);
  if (![r, g, b, a].every(Number.isFinite)) return null;
  return { r: clamp01(r / 255) * 255, g: clamp01(g / 255) * 255, b: clamp01(b / 255) * 255, a: clamp01(a) };
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

function parseHslColor(value) {
  const match = String(value).trim().match(/^hsla?\((.+)\)$/i);
  if (!match) return null;
  const parts = splitColorParts(match[1]);
  if (parts.length < 3 || !parts[1].endsWith("%") || !parts[2].endsWith("%")) return null;
  const h = Number(parts[0].replace(/deg$/i, ""));
  const s = clamp01(Number(parts[1].slice(0, -1)) / 100);
  const l = clamp01(Number(parts[2].slice(0, -1)) / 100);
  const a = parts[3] === undefined ? 1 : parseCssNumberOrPercent(parts[3], 1);
  if (![h, s, l, a].every(Number.isFinite)) return null;
  const hue = (((h % 360) + 360) % 360) / 360;
  if (s === 0) {
    const channel = l * 255;
    return { r: channel, g: channel, b: channel, a: clamp01(a) };
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: hueToRgb(p, q, hue + 1 / 3) * 255,
    g: hueToRgb(p, q, hue) * 255,
    b: hueToRgb(p, q, hue - 1 / 3) * 255,
    a: clamp01(a),
  };
}

export function parseColor(value) {
  return parseHexColor(value) || parseRgbColor(value) || parseHslColor(value);
}

export function parseNumericValue(value) {
  const cleanValue = stripInlineComments(value);
  if (/^(?:#|rgb|hsl)/i.test(cleanValue) || cleanValue.includes("var(") || cleanValue.includes("calc(")) return null;
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

async function readOptional(file) {
  try {
    return await fs.readFile(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

/**
 * Read a package's token files and architecture document and build the clusters.
 * Used by apply_token_decisions.mjs; the audit and review scripts keep their own parsers.
 */
export async function loadTokenPackage(targetRoot) {
  const tokenDir = path.join(targetRoot, "tokens");
  const files = {
    ref: path.join(tokenDir, "tokens-ref.css"),
    sys: path.join(tokenDir, "tokens-sys.css"),
    comp: path.join(tokenDir, "tokens-comp.css"),
    architecture: path.join(targetRoot, "design-system", "TOKEN_ARCHITECTURE.md"),
  };
  const [refCss, sysCss, compCss, architectureDoc] = await Promise.all([
    readOptional(files.ref),
    readOptional(files.sys),
    readOptional(files.comp),
    readOptional(files.architecture),
  ]);
  const declarations = parseDeclarations(refCss || "");
  const colors = [];
  const numbers = [];
  for (const [name, declaration] of declarations) {
    const colorName = parseReferenceColorName(name);
    if (colorName) {
      const color = parseColor(declaration.value);
      if (color) colors.push({ name, value: declaration.value, family: colorName.family || "unknown", step: colorName.step, color });
      continue;
    }
    const numeric = parseNumericValue(declaration.value);
    if (numeric) numbers.push({ name, value: declaration.value, family: parseReferenceFamily(name), numeric });
  }
  const varCounts = countVarReferences([sysCss || "", compCss || ""]);
  const hasDecision = makeDecisionLookup(architectureDoc, declarations);
  const { clusters, counts } = buildTokenClusters({ colors, numbers, declarations, varCounts, hasDecision });
  return {
    files,
    css: { ref: refCss, sys: sysCss, comp: compCss },
    architectureDoc,
    declarations,
    colors,
    numbers,
    varCounts,
    clusters,
    counts,
    scaleFit: fitLengthScale(numbers),
  };
}
