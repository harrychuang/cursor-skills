// Shared review logic for design-system-extractor.
//
// audit_tokens.mjs and generate_review_html.mjs both decide whether a near
// reference-token pair has a recorded decision. They used to carry their own
// copies of that logic and the copies drifted apart, so the audit could pass a
// pair the review page still listed as open. Everything that answers "is this
// decided?" now lives here and both scripts import it.
//
// This module only exports functions: it reads no arguments, touches no files
// and never exits the process, so either script can import it safely.

export const NEAR_COLOR_DELTA_E = 3;
export const NEAR_COLOR_ALPHA_DELTA = 0.03;
export const LIGHTNESS_TOLERANCE = 0.01;

// ---------------------------------------------------------------------------
// CSS custom properties
// ---------------------------------------------------------------------------

export function stripInlineComments(value) {
  return String(value).replace(/\/\*[\s\S]*?\*\//g, "").trim();
}

// Declarations together with the comments attached to them. The trailing
// comment may only sit on the same line as the declaration; letting it cross a
// newline would steal the next declaration's leading comment.
export function parseDeclarations(css) {
  const declarations = new Map();
  const pattern =
    /(?:\/\*([\s\S]*?)\*\/\s*)?(--[A-Za-z0-9_-]+)\s*:\s*([^;]+);(?:[ \t]*\/\*([\s\S]*?)\*\/)?/g;
  let match;
  while ((match = pattern.exec(css || ""))) {
    declarations.set(match[2], {
      name: match[2],
      value: stripInlineComments(match[3]),
      leadingComment: (match[1] || "").trim(),
      trailingComment: (match[4] || "").trim(),
    });
  }
  return declarations;
}

// Declarations with every comment removed first, so a commented-out
// declaration is not mistaken for a live token.
export function parseProps(css) {
  const props = new Map();
  const withoutComments = String(css || "").replace(/\/\*[\s\S]*?\*\//g, "");
  const pattern = /(--[A-Za-z0-9_-]+)\s*:\s*([^;]+);/g;
  let match;
  while ((match = pattern.exec(withoutComments))) {
    props.set(match[1], match[2].trim());
  }
  return props;
}

// The live tokens of a token file, each with the comments attached to it.
export function parseTokens(css) {
  const declarations = parseDeclarations(css);
  const tokens = new Map();
  for (const [name, value] of parseProps(css)) {
    const declaration = declarations.get(name);
    tokens.set(name, {
      name,
      value,
      leadingComment: declaration?.leadingComment || "",
      trailingComment: declaration?.trailingComment || "",
    });
  }
  return tokens;
}

export function normalizeTokenName(name) {
  return name.replace(/^--/, "").toLowerCase();
}

export function parseReferenceColorName(name) {
  const normalized = normalizeTokenName(name);
  const marker = "-ref-color-";
  const markerIndex = normalized.indexOf(marker);
  if (markerIndex === -1) return null;
  const segments = normalized.slice(markerIndex + marker.length).split("-").filter(Boolean);
  const stepSegment = segments.at(-1);
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

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

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
    lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation;
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

export function parseColor(value) {
  return parseHexColor(value) || parseRgbColor(value) || parseHslColor(value);
}

function srgbToLinear(channel) {
  const normalized = channel / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(color) {
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
  const fx = labPivot((r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047);
  const fy = labPivot((r * 0.2126 + g * 0.7152 + b * 0.0722) / 1);
  const fz = labPivot((r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883);
  return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

export function deltaE76(colorA, colorB) {
  const labA = rgbToLab(colorA);
  const labB = rgbToLab(colorB);
  return Math.sqrt((labA.l - labB.l) ** 2 + (labA.a - labB.a) ** 2 + (labA.b - labB.b) ** 2);
}

// ---------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------

export function parseNumericValue(value) {
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

// ---------------------------------------------------------------------------
// Near pairs
// ---------------------------------------------------------------------------

// Every pair of reference tokens whose values are close enough to need a
// decision. `refTokens` is the Map returned by parseTokens (or any Map whose
// values carry a `value`). Colors are compared across the whole palette;
// numbers only inside one family and one unit group.
export function findNearPairs(refTokens) {
  const colors = [];
  const numbers = [];
  for (const [name, token] of refTokens) {
    const value = typeof token === "string" ? token : token.value;
    const colorName = parseReferenceColorName(name);
    if (colorName) {
      const color = parseColor(value);
      if (color) {
        colors.push({
          name,
          value,
          family: colorName.family || "unknown",
          step: colorName.step,
          color,
          luminance: relativeLuminance(color),
        });
        continue;
      }
    }
    if (parseColor(value)) continue;
    const numeric = parseNumericValue(value);
    if (!numeric) continue;
    numbers.push({ name, value, family: parseReferenceFamily(name), numeric });
  }

  const pairs = [];
  for (let i = 0; i < colors.length; i += 1) {
    for (let j = i + 1; j < colors.length; j += 1) {
      const first = colors[i];
      const second = colors[j];
      const alphaDiff = Math.abs(first.color.a - second.color.a);
      const delta = deltaE76(first.color, second.color);
      if (alphaDiff <= NEAR_COLOR_ALPHA_DELTA && delta <= NEAR_COLOR_DELTA_E) {
        pairs.push({ type: "color", a: first.name, b: second.name, valueA: first.value, valueB: second.value, delta });
      }
    }
  }
  for (let i = 0; i < numbers.length; i += 1) {
    for (let j = i + 1; j < numbers.length; j += 1) {
      const first = numbers[i];
      const second = numbers[j];
      if (first.family !== second.family || first.numeric.unitGroup !== second.numeric.unitGroup) continue;
      if (isNearNumericValue(first.numeric, second.numeric)) {
        pairs.push({
          type: "number",
          a: first.name,
          b: second.name,
          valueA: first.value,
          valueB: second.value,
          delta: Math.abs(first.numeric.normalized - second.numeric.normalized),
          unitGroup: first.numeric.unitGroup,
        });
      }
    }
  }
  return { colors, numbers, pairs };
}

// ---------------------------------------------------------------------------
// Markdown tables
// ---------------------------------------------------------------------------

export function normalizeHeading(value) {
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

// Tables with the heading trail they sit under. Each row keeps its cells, a
// header-to-cell Map and its 1-based line number in the document.
export function parseTables(markdown) {
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
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
    if (lines[index].includes("|") && index + 1 < lines.length && isDividerRow(lines[index + 1])) {
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

export function firstValue(row, candidates) {
  for (const candidate of candidates) {
    const foundKey = [...row.keys()].find((key) => key.includes(candidate));
    if (foundKey) return row.get(foundKey) || "";
  }
  return "";
}

export function cleanCell(value) {
  return String(value)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/`/g, "")
    .replace(/\*\*/g, "")
    .trim();
}

// ---------------------------------------------------------------------------
// Decision records
// ---------------------------------------------------------------------------

// The keyword list the token audit has always accepted for near-token decisions.
const DECISION_KEYWORD = /merge|merged|keep|distinct|separate|split|approved|合併|保留|拆開|分開|確認/i;

// A decision cell that holds nothing but one of these is not a decision. This
// is the same list audit_sources.mjs and audit_components.mjs call unresolvedPattern.
const UNRESOLVED_CELL =
  /^\s*(?:|[-—]|n\/a|na|none|tbd|todo|pending|open|unknown|needs review|needs decision|待確認|未決|未定|要確認|\?)\s*$/i;

// The markers unambiguous enough to mean "not decided yet" wherever they appear
// in a sentence. "待確認" contains the decision keyword "確認", so pending
// markers are always checked before decision keywords.
const PENDING_MARKER = /\b(?:tbd|todo|pending|needs review|needs decision)\b|待確認|未決|未定|要確認/i;

const CSS_REVIEW_DECISION = /token-review\s*:\s*(?:keep|keep-distinct|merge|merge-with|approved|separate|split)/i;

export function isPendingText(value) {
  const cleaned = cleanCell(value);
  return UNRESOLVED_CELL.test(cleaned) || PENDING_MARKER.test(cleaned);
}

export function holdsDecision(value) {
  return !isPendingText(value) && DECISION_KEYWORD.test(cleanCell(value));
}

// Token names are compared whole. Each name in the text is read to its full
// length and then looked up, so "--md-ref-size-1" never matches inside
// "--md-ref-size-18".
export function tokensNamedIn(text, knownNames) {
  const found = new Set();
  const matches = String(text).toLowerCase().match(/(?<![a-z0-9_])--[a-z0-9_-]+/g) || [];
  for (const candidate of matches) {
    if (knownNames.has(candidate)) found.add(candidate);
  }
  return found;
}

function decisionHeaderOf(headers) {
  return headers.find(
    (header) => /\bdecision\b/.test(header) && !header.includes("suggested") && header !== "decision id",
  );
}

function looksLikeValue(text) {
  return Boolean(parseColor(text) || parseNumericValue(text));
}

// Candidates of a decision row: backtick-quoted token names or raw values. A
// token may be followed by its value in parentheses; that value is what keeps
// a merged token displayable after the merge removes it from the token file.
function parseCandidates(cells, refByLower) {
  const candidates = [];
  const pattern = /`([^`]+)`(?:\s*[(（]\s*`?([^)）`]+?)`?\s*[)）])?/g;
  for (const cell of cells) {
    let match;
    while ((match = pattern.exec(cell))) {
      const text = match[1].trim();
      const noted = match[2] && looksLikeValue(match[2].trim()) ? match[2].trim() : null;
      if (text.startsWith("--")) {
        const live = refByLower.get(text.toLowerCase());
        candidates.push({ token: live ? live.name : text, value: noted || (live ? live.value : null), exists: Boolean(live) });
      } else if (looksLikeValue(text)) {
        const previous = candidates.at(-1);
        // A bare value right after a token that already has that value is the token's value, not a new candidate.
        if (previous && previous.token && previous.value === text) continue;
        candidates.push({ token: null, value: text, exists: false });
      }
    }
  }
  return candidates;
}

// The single action a suggestion or decision cell holds: keep, or merge into a token.
function parseAction(cell, refByLower) {
  if (!holdsDecision(cell)) return null;
  const text = cleanCell(cell);
  const keepAt = text.search(/keep|distinct|separate|split|保留|拆開|分開/i);
  const mergeAt = text.search(/merge|合併/i);
  if (mergeAt === -1 || (keepAt !== -1 && keepAt < mergeAt)) {
    return { action: keepAt === -1 ? null : "keep", into: null, text };
  }
  const named = String(cell).match(/(?:into|with|→|->|併入|合併到|合併為)\s*`?(--[A-Za-z0-9_-]+)/i);
  const live = named ? refByLower.get(named[1].toLowerCase()) : null;
  return { action: "merge", into: live ? live.name : null, text };
}

// Everything in a package that records a decision about reference tokens:
// rows and lines of TOKEN_ARCHITECTURE.md, accessibility remaps and the CSS
// comments attached to reference tokens.
export function collectDecisionRecords({ architectureDoc, refTokens }) {
  const refByLower = new Map([...refTokens.values()].map((token) => [token.name.toLowerCase(), token]));
  const known = new Set(refByLower.keys());
  const records = {
    known,
    values: new Map([...refByLower].map(([name, token]) => [name, token.value])),
    rows: [],
    remapLines: [],
    css: new Map(),
  };

  for (const token of refTokens.values()) {
    const comment = `${token.leadingComment || ""}\n${token.trailingComment || ""}`;
    if (CSS_REVIEW_DECISION.test(comment)) records.css.set(token.name.toLowerCase(), "token-review");
    else if (/a11y-remap/i.test(comment)) records.css.set(token.name.toLowerCase(), "a11y-remap");
  }
  if (!architectureDoc) return records;

  // Rows of tables that have a decision column: only that column decides.
  const decidedByColumn = new Set();
  for (const table of parseTables(architectureDoc)) {
    const decisionHeader = decisionHeaderOf(table.headers);
    if (!decisionHeader) continue;
    // A review-flow table has both a Suggested action and a Confirmed by
    // column: there a decision also needs someone named as confirming it.
    // Either column alone is an earlier layout, and its decision column
    // decides alone, as it always did:
    // - Confirmed by without Suggested action is the previous template, where
    //   the extraction pass filled the confirmer in itself ("Extraction pass")
    //   or left it empty, and no audit ever read it.
    // - Suggested action without Confirmed by has nowhere to name a confirmer.
    // Requiring a confirmer on either would fail packages that used to pass.
    const hasSuggestions = table.headers.some((header) => header.includes("suggested"));
    const reviewFlow = hasSuggestions && table.headers.some((header) => header.includes("confirmed by"));
    const nearTokenTable = hasSuggestions || normalizeHeading(table.heading).includes("near token");
    for (const entry of table.rows) {
      decidedByColumn.add(entry.line);
      const cellOf = (part) => {
        const header = table.headers.find((candidate) => candidate.includes(part));
        return header ? entry.row.get(header) || "" : "";
      };
      const tokens = new Set();
      for (const [header, cell] of entry.row) {
        if (header.includes("rationale") || header.includes("confirmed by")) continue;
        for (const name of tokensNamedIn(cell, known)) tokens.add(name);
      }
      const candidateHeaders = table.headers.filter((header) => header.includes("candidate"));
      const candidateCells = candidateHeaders.length
        ? candidateHeaders.map((header) => entry.row.get(header) || "")
        : [entry.cells[0] || ""];
      const decision = parseAction(entry.row.get(decisionHeader) || "", refByLower);
      const confirmedBy = cleanCell(cellOf("confirmed by"));
      records.rows.push({
        kind: "row",
        line: entry.line,
        tokens,
        reviewFlow,
        nearTokenTable,
        candidates: parseCandidates(candidateCells, refByLower),
        suggestion: hasSuggestions ? parseAction(cellOf("suggested"), refByLower) : null,
        decision,
        confirmedBy,
        resolved: Boolean(decision) && (!reviewFlow || (confirmedBy !== "" && !isPendingText(confirmedBy))),
        rationale: cleanCell(cellOf("rationale")),
        provenance: cleanCell(cellOf("provenance")),
        difference: cleanCell(cellOf("difference")),
      });
    }
  }

  // Everything else is judged on the whole line, as packages written before
  // the review flow expect: lines outside tables and rows of tables without a
  // decision column.
  const lines = architectureDoc.replace(/\r\n/g, "\n").split("\n");
  let inRemapSection = false;
  lines.forEach((line, index) => {
    if (/^#{1,6}\s/.test(line)) inRemapSection = /accessibility remap/i.test(line);
    const lineTokens = tokensNamedIn(line, known);
    if (lineTokens.size < 2) return;
    if (inRemapSection || /a11y-remap/i.test(line)) {
      records.remapLines.push({ line: index + 1, tokens: lineTokens });
      return;
    }
    if (decidedByColumn.has(index + 1)) return;
    records.rows.push({
      kind: "line",
      line: index + 1,
      tokens: lineTokens,
      reviewFlow: false,
      nearTokenTable: false,
      candidates: [],
      suggestion: null,
      decision: null,
      confirmedBy: "",
      resolved: DECISION_KEYWORD.test(line) && !PENDING_MARKER.test(line),
      rationale: "",
      provenance: "",
      difference: "",
    });
  });
  return records;
}

// The tokens a merge action removes: every candidate except the survivor.
function mergedAway(action, record) {
  if (!action || action.action !== "merge" || !action.into) return [];
  const survivor = action.into.toLowerCase();
  return record.candidates
    .filter((candidate) => candidate.token && candidate.token.toLowerCase() !== survivor)
    .map((candidate) => candidate.token.toLowerCase());
}

function covers(record, action, a, b) {
  if (record.tokens.has(a) && record.tokens.has(b)) return true;
  // Once a token is to be merged away, its pairs with every other token are settled too.
  const leaving = mergedAway(action, record);
  return leaving.includes(a) || leaving.includes(b);
}

// Whether the pair has a recorded decision, and what recorded it.
//   confirmed  a decision is recorded (and, in the review flow, confirmed by someone)
//   suggested  only the AI's suggested action covers the pair
//   undecided  nothing covers the pair
export function resolvePair(records, tokenA, tokenB) {
  const a = tokenA.toLowerCase();
  const b = tokenB.toLowerCase();
  const cssMark = records.css.get(a) || records.css.get(b);
  if (cssMark) return { status: "confirmed", via: cssMark };
  if (records.remapLines.some((record) => record.tokens.has(a) && record.tokens.has(b))) {
    return { status: "confirmed", via: "a11y-remap" };
  }
  let suggestedBy = null;
  for (const record of records.rows) {
    if (record.resolved && covers(record, record.decision, a, b)) {
      return { status: "confirmed", via: record.kind, record };
    }
    if (!suggestedBy && record.suggestion && covers(record, record.suggestion, a, b)) suggestedBy = record;
  }
  if (suggestedBy) return { status: "suggested", via: "suggestion", record: suggestedBy };
  return { status: "undecided", via: null };
}

// Two CSS values that denote the same thing: the same color, or the same
// amount in the same kind of unit ("0.5rem" and "8px" are the same length).
function sameValue(a, b) {
  const colorA = parseColor(a);
  const colorB = parseColor(b);
  if (colorA || colorB) {
    if (!colorA || !colorB) return false;
    // Channels are compared as the 8-bit values they render to, so "#faf7f2" equals "rgb(250 247 242)".
    const sameChannel = (channel) => Math.round(colorA[channel]) === Math.round(colorB[channel]);
    return sameChannel("r") && sameChannel("g") && sameChannel("b") && Math.abs(colorA.a - colorB.a) < 0.005;
  }
  const numberA = parseNumericValue(a);
  const numberB = parseNumericValue(b);
  if (numberA && numberB) return numberA.unitGroup === numberB.unitGroup && numberA.normalized === numberB.normalized;
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

// Values a recorded or suggested merge folds into a surviving token and that
// are not reference tokens (any more). The row is the only place they still exist.
export function findMergedValues(records) {
  const merged = [];
  for (const record of records.rows) {
    if (record.kind !== "row" || !record.nearTokenTable) continue;
    const action = record.resolved ? record.decision : record.suggestion || record.decision;
    if (!action || action.action !== "merge" || !action.into) continue;
    const survivor = action.into.toLowerCase();
    const survivorValue = records.values.get(survivor);
    const gone = record.candidates.filter((candidate) => {
      if (candidate.exists) return false;
      if (candidate.token) return candidate.token.toLowerCase() !== survivor;
      // A row may name the surviving value as a raw value too ("6px and 8px,
      // merge into radius-8"). That value is the survivor, not something merged into it.
      return !(survivorValue && candidate.value && sameValue(candidate.value, survivorValue));
    });
    if (!gone.length) continue;
    merged.push({
      into: action.into,
      values: gone.map((candidate) => ({ token: candidate.token, value: candidate.value })),
      status: record.resolved ? "confirmed" : record.suggestion ? "suggested" : "undecided",
      record,
    });
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Review items
// ---------------------------------------------------------------------------

// A group with more values than this is a dense scale: the page lists it
// compactly instead of one row per value. Eleven type sizes still read well
// as rows; a ladder of a hundred sizes does not.
export const DENSE_GROUP_THRESHOLD = 12;

function shortRefName(name) {
  const at = name.toLowerCase().indexOf("-ref-");
  return (at === -1 ? name.replace(/^--/, "") : name.slice(at + 5)).replace(/^color-/i, "");
}

function shortSysName(name, isColor) {
  const at = name.toLowerCase().indexOf("-sys-");
  const short = at === -1 ? name.replace(/^--/, "") : name.slice(at + 5);
  return isColor ? short.replace(/^color-/i, "") : short;
}

function numericKind(family, unitGroup) {
  if (/^(?:type|font|fontsize|text)/.test(family)) return "type";
  if (/^(?:radius|corner)/.test(family)) return "radius";
  if (unitGroup === "length") return "length";
  return "number";
}

const UNIT_LABEL = { length: "px", time: "ms", percent: "%", angle: "deg", number: "" };
const round2 = (value) => Number(value.toFixed(2));
const inkOn = (color) => (relativeLuminance(color) > 0.36 ? "#141414" : "#ffffff");

function referencedTokens(value) {
  return [...String(value).matchAll(/var\(\s*(--[A-Za-z0-9_-]+)/g)].map((match) => match[1]);
}

// Where each reference token is used: the system roles that reference it and
// the components that use those roles. A component token belongs to the
// component whose specification document names it; a component token no
// specification names still counts as usage but has no component to show.
export function createUsageLookup({ sysTokens, compTokens, componentDocs = [] }) {
  const rolesByRef = new Map();
  for (const [name, token] of sysTokens) {
    for (const ref of referencedTokens(token.value)) rolesByRef.set(ref, [...(rolesByRef.get(ref) || []), name]);
  }
  const compByRole = new Map();
  for (const [name, token] of compTokens) {
    for (const role of referencedTokens(token.value)) compByRole.set(role, [...(compByRole.get(role) || []), name]);
  }
  const ownerByCompToken = new Map();
  for (const doc of componentDocs) {
    for (const match of String(doc.text).matchAll(/--[A-Za-z0-9_]+(?:-[A-Za-z0-9_]+)*-comp-[A-Za-z0-9_-]+/g)) {
      if (!ownerByCompToken.has(match[0])) ownerByCompToken.set(match[0], doc.label);
    }
  }
  return (refName, isColor) => {
    const roles = rolesByRef.get(refName) || [];
    const components = [];
    let componentTokenCount = 0;
    for (const role of roles) {
      for (const compToken of compByRole.get(role) || []) {
        componentTokenCount += 1;
        const owner = ownerByCompToken.get(compToken);
        if (owner && !components.includes(owner)) components.push(owner);
      }
    }
    return { roles: roles.map((role) => shortSysName(role, isColor)), components, componentTokenCount };
  };
}

function joinDistinct(values, separator) {
  return [...new Set(values.filter(Boolean))].join(separator);
}

// Near-token review items: every set of reference tokens connected by near
// pairs is one decision, plus one item per value a merge has folded away.
export function buildTokenItems({ refTokens, records, usageOf }) {
  const { colors, numbers, pairs } = findNearPairs(refTokens);
  const colorByName = new Map(colors.map((entry) => [entry.name, entry]));
  const numberByName = new Map(numbers.map((entry) => [entry.name, entry]));

  // Union-find over token names.
  const parent = new Map();
  const find = (name) => {
    if (!parent.has(name)) parent.set(name, name);
    let root = name;
    while (parent.get(root) !== root) root = parent.get(root);
    parent.set(name, root);
    return root;
  };
  for (const pair of pairs) parent.set(find(pair.a), find(pair.b));
  const groups = new Map();
  for (const name of parent.keys()) groups.set(find(name), [...(groups.get(find(name)) || []), name]);

  const describe = (name, value, exists) => {
    const color = parseColor(value);
    const numeric = color ? null : parseNumericValue(value);
    const usage = exists && name ? usageOf(name, Boolean(color)) : { roles: [], components: [], componentTokenCount: 0 };
    return {
      key: name || `raw:${value}`,
      name: name || null,
      short: name ? shortRefName(name) : value,
      step: name ? (name.match(/-(\d+)$/) || [])[1] ?? null : null,
      value,
      exists,
      ...(color ? { ink: inkOn(color) } : {}),
      ...(numeric ? { num: numeric.normalized, unit: UNIT_LABEL[numeric.unitGroup] } : {}),
      ...usage,
    };
  };
  const distance = (a, b) => {
    const colorA = parseColor(a.value);
    const colorB = parseColor(b.value);
    if (colorA && colorB) return round2(deltaE76(colorA, colorB));
    if (typeof a.num === "number" && typeof b.num === "number") return round2(Math.abs(a.num - b.num));
    return null;
  };

  const items = [];
  for (const names of groups.values()) {
    const isColor = colorByName.has(names[0]);
    const sorted = [...names].sort((a, b) =>
      isColor
        ? colorByName.get(b).luminance - colorByName.get(a).luminance
        : numberByName.get(a).numeric.normalized - numberByName.get(b).numeric.normalized,
    );
    const members = sorted.map((name) => describe(name, refTokens.get(name).value, true));
    const groupPairs = pairs.filter((pair) => names.includes(pair.a) && names.includes(pair.b));
    const results = groupPairs.map((pair) => ({ pair, result: resolvePair(records, pair.a, pair.b) }));
    const involved = [...new Set(results.map((entry) => entry.result.record).filter(Boolean))];
    const nearSet = new Set(groupPairs.map((pair) => [pair.a, pair.b].sort().join("\u0000")));

    const allConfirmed = results.every((entry) => entry.result.status === "confirmed");
    const allCovered = results.every((entry) => entry.result.status !== "undecided");
    const status = allConfirmed ? "confirmed" : allCovered ? "suggested" : "undecided";

    // An outcome is which members stay and which merge into which member.
    const outcomeFrom = (pick) => {
      const merge = {};
      for (const record of involved) {
        const action = pick(record);
        if (!action || action.action !== "merge" || !action.into || !names.includes(action.into)) continue;
        for (const candidate of record.candidates) {
          if (candidate.token && candidate.token !== action.into && names.includes(candidate.token)) merge[candidate.token] = action.into;
        }
      }
      return { keep: sorted.filter((name) => !(name in merge)), merge };
    };
    const suggesting = involved.filter((record) => record.suggestion);
    const suggestion =
      allCovered && suggesting.length
        ? {
            ...outcomeFrom((record) => record.suggestion),
            reason: joinDistinct(suggesting.map((record) => record.rationale), " "),
            provenance: joinDistinct(suggesting.map((record) => record.provenance), "; "),
          }
        : null;
    const recorded = allConfirmed
      ? {
          ...outcomeFrom((record) => (record.resolved ? record.decision : null)),
          confirmedBy: joinDistinct(involved.map((record) => record.confirmedBy), "; "),
          reason: joinDistinct(involved.map((record) => record.rationale), " "),
          via: joinDistinct(results.map((entry) => entry.result.via), ", "),
        }
      : null;

    const closestPair = groupPairs.reduce((best, pair) => (!best || pair.delta < best.delta ? pair : best), null);
    const family = isColor ? colorByName.get(names[0]).family : numberByName.get(names[0]).family;
    items.push({
      id: `tok:${[...names].sort().join("|")}`,
      section: "tokens",
      kind: isColor ? "color" : numericKind(family, numberByName.get(names[0]).numeric.unitGroup),
      origin: "near",
      family,
      status,
      dense: members.length > DENSE_GROUP_THRESHOLD,
      pairs: groupPairs.length,
      members,
      dist: members.map((a) => members.map((b) => distance(a, b))),
      seams: members.slice(0, -1).map((member, index) => ({
        delta: distance(member, members[index + 1]),
        near: nearSet.has([member.name, members[index + 1].name].sort().join("\u0000")),
      })),
      closest: closestPair
        ? { a: shortRefName(closestPair.a), b: shortRefName(closestPair.b), delta: round2(closestPair.delta) }
        : null,
      suggestion,
      recorded,
    });
  }

  for (const entry of findMergedValues(records)) {
    const survivorToken = refTokens.get(entry.into);
    const survivor = describe(entry.into, survivorToken.value, true);
    const gone = entry.values.filter((value) => value.value).map((value) => describe(value.token, value.value, false));
    if (!gone.length) continue;
    const isColor = Boolean(parseColor(survivorToken.value));
    const members = [survivor, ...gone].sort((a, b) => (isColor ? 0 : (a.num ?? 0) - (b.num ?? 0)));
    const merge = Object.fromEntries(gone.map((member) => [member.key, entry.into]));
    const numeric = parseNumericValue(survivorToken.value);
    const outcome = { keep: [entry.into], merge };
    items.push({
      id: `merged:${entry.into}:${gone.map((member) => member.value).join("|")}`,
      section: "tokens",
      kind: isColor ? "color" : numericKind(parseReferenceFamily(entry.into), numeric ? numeric.unitGroup : "number"),
      origin: "merged",
      family: isColor ? parseReferenceColorName(entry.into)?.family || "color" : parseReferenceFamily(entry.into),
      status: entry.status,
      dense: false,
      pairs: gone.length,
      members,
      dist: members.map((a) => members.map((b) => distance(a, b))),
      seams: members.slice(0, -1).map((member, index) => ({ delta: distance(member, members[index + 1]), near: true })),
      closest: null,
      suggestion: entry.record.suggestion
        ? { ...outcome, reason: entry.record.rationale, provenance: entry.record.provenance }
        : null,
      recorded: entry.record.resolved
        ? { ...outcome, confirmedBy: entry.record.confirmedBy, reason: entry.record.rationale, via: "row" }
        : null,
    });
  }

  // Items that still need someone come first; within each, the file order of the tokens.
  const rank = { undecided: 0, suggested: 1, confirmed: 2 };
  return items.sort((a, b) => rank[a.status] - rank[b.status]);
}

// The name a component specification document goes by: its first heading.
export function componentLabel(text, fileName) {
  const heading = String(text).match(/^#\s+(.+)$/m);
  return heading ? heading[1].trim() : String(fileName).replace(/\.md$/i, "");
}

// ---------------------------------------------------------------------------
// Screenshots and the regions being compared
// ---------------------------------------------------------------------------

// The region an image reference points at, written as a W3C media-fragment
// spatial dimension: "#xywh=percent:x,y,w,h" (0-100, share of the image) or
// "#xywh=x,y,w,h" / "#xywh=pixel:x,y,w,h" (pixels of the natural size).
// A fragment that cannot be read means "no region", never an error.
export function parseImageRegion(href) {
  const fragment = String(href).split("#").slice(1).join("#");
  const match = fragment.match(/(?:^|&)xywh=(?:(percent|pixel):)?([^&]*)/i);
  if (!match) return null;
  const parts = match[2].split(",").map((part) => part.trim());
  if (parts.length !== 4 || parts.some((part) => part === "" || !Number.isFinite(Number(part)))) return null;
  const [x, y, width, height] = parts.map(Number);
  if (x < 0 || y < 0 || width <= 0 || height <= 0) return null;
  const unit = (match[1] || "pixel").toLowerCase();
  if (unit === "percent" && (x + width > 100.0001 || y + height > 100.0001)) return null;
  return { unit, x, y, width, height };
}

// The images of a Visual reference cell, in order: the first is the new
// candidate, the second the similar existing component.
export function parseVisualReference(cell) {
  const images = [];
  for (const match of String(cell).matchAll(/!\[([^\]]*)\]\(([^)\s]+)\)/g)) {
    const href = match[2].trim();
    images.push({ alt: match[1].trim(), src: href.split("#")[0], region: parseImageRegion(href) });
  }
  return images;
}

// Natural size of a PNG, read from its header.
export function pngSize(buffer) {
  if (!buffer || buffer.length < 24 || buffer.toString("latin1", 1, 4) !== "PNG") return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

// A region as fractions of the image: [x, y, width, height]. Pixel regions
// need the natural size; without it the region cannot be placed.
export function regionToFractions(region, size) {
  if (!region) return null;
  // Six decimals is finer than a pixel on any screenshot and keeps the numbers stable in JSON.
  const fraction = (value) => Number(value.toFixed(6));
  if (region.unit === "percent") {
    return [region.x / 100, region.y / 100, region.width / 100, region.height / 100].map(fraction);
  }
  if (!size || !size.width || !size.height) return null;
  const rect = [region.x / size.width, region.y / size.height, region.width / size.width, region.height / size.height];
  return rect[0] + rect[2] > 1.0001 || rect[1] + rect[3] > 1.0001 ? null : rect.map(fraction);
}

// ---------------------------------------------------------------------------
// Similar components, duplicate sources and color scale issues
// ---------------------------------------------------------------------------

// The decision vocabularies audit_components.mjs and audit_sources.mjs accept,
// so an item is "confirmed" here exactly when those audits call its row documented.
const COMPONENT_DECISION =
  /\b(?:merge|merged|make variant|variant|keep distinct|distinct|blocked|out-of-scope|separate|split)\b|合併|變體|變型|保留|拆開|分開|阻塞|別元件|独立|別コンポーネント|保留|統合|バリアント/i;
const SOURCE_DECISION =
  /\b(?:reuse existing source|reuse existing|reuse source|ignore duplicate|dedupe|deduplicate|same source|duplicate accepted|keep distinct|distinct|separate|split|blocked|out-of-scope|merge|merged)\b|重用|沿用|忽略重複|忽略重复|同一來源|同一来源|重複來源|重复来源|合併|合并|保留|拆開|拆开|分開|分开|阻塞|統合|別ソース|同一ソース|バリアント/i;

function rowDecided(cell, vocabulary) {
  const cleaned = String(cell).replace(/<br\s*\/?>/gi, " ").replace(/`/g, "").trim();
  return !UNRESOLVED_CELL.test(cleaned) && vocabulary.test(cleaned);
}

export const COMPONENT_CHOICES = ["merge", "make variant", "keep distinct", "blocked"];
export const SOURCE_CHOICES = ["reuse existing source", "ignore duplicate", "keep distinct"];

// The choice a suggestion or decision cell names, in its English canonical form.
function choiceIn(cell, choices) {
  const text = cleanCell(cell).toLowerCase();
  if (isPendingText(text) || !text) return null;
  const direct = choices.find((choice) => text.includes(choice));
  if (direct) return direct;
  const synonyms = [
    ["make variant", /variant|變體|變型|バリアント/],
    ["keep distinct", /distinct|separate|split|保留|拆開|分開|独立/],
    ["reuse existing source", /reuse|沿用|重用|same source|同一來源/],
    ["ignore duplicate", /ignore|dedupe|deduplicate|忽略/],
    ["blocked", /block|阻塞/],
    ["merge", /merge|合併|統合/],
  ];
  for (const [choice, pattern] of synonyms) {
    if (choices.includes(choice) && pattern.test(text)) return choice;
  }
  return null;
}

function isSimilarityTable(table) {
  const heading = normalizeHeading(table.heading);
  const has = (part) => table.headers.some((header) => header.includes(part));
  return heading.includes("component similarity review") || (has("new candidate") && has("similar") && has("developer decision"));
}

function isSourceDuplicateTable(table) {
  const heading = normalizeHeading(table.heading);
  const has = (part) => table.headers.some((header) => header.includes(part));
  return heading.includes("source duplicate review") || (has("candidate") && has("duplicate") && has("developer decision"));
}

// `imageSize(src)` returns the natural size of an image the inventory links
// (or null); the caller owns the file access.
export function buildComponentItems({ inventoryDoc, imageSize = () => null }) {
  const items = [];
  for (const table of parseTables(inventoryDoc || "").filter(isSimilarityTable)) {
    for (const entry of table.rows) {
      const left = cleanCell(firstValue(entry.row, ["new candidate", "candidate"]));
      const right = cleanCell(firstValue(entry.row, ["similar existing", "similar"]));
      const why = cleanCell(firstValue(entry.row, ["similarity reason", "reason"]));
      if (!left && !right && !why) continue;
      const decisionCell = firstValue(entry.row, ["developer decision", "decision"]);
      const suggestedChoice = choiceIn(firstValue(entry.row, ["suggested action", "suggested"]), COMPONENT_CHOICES);
      const reason = cleanCell(firstValue(entry.row, ["rationale", "owner"]));
      const decided = rowDecided(decisionCell, COMPONENT_DECISION);
      const images = parseVisualReference(firstValue(entry.row, ["visual reference", "visual"]));
      const side = (key, name, image) => {
        if (!image) return { key, name, image: null, marks: [] };
        const size = imageSize(image.src);
        const rect = regionToFractions(image.region, size);
        return {
          key,
          name,
          image: { src: image.src, alt: image.alt, w: size ? size.width : 0, h: size ? size.height : 0 },
          marks: rect ? [{ rect }] : [],
        };
      };
      items.push({
        id: `comp:${left}|${right}`,
        section: "components",
        kind: "choice",
        status: decided ? "confirmed" : suggestedChoice ? "suggested" : "undecided",
        left,
        right,
        why,
        options: COMPONENT_CHOICES,
        suggestion: suggestedChoice ? { choice: suggestedChoice, reason } : null,
        recorded: decided ? { choice: choiceIn(decisionCell, COMPONENT_CHOICES), text: cleanCell(decisionCell), reason } : null,
        sides: [side("A", left, images[0]), side("B", right, images[1])],
      });
    }
  }
  return items;
}

export function buildSourceItems({ evidenceDoc }) {
  const tables = parseTables(evidenceDoc || "");
  const inventory = new Map();
  for (const table of tables) {
    const heading = normalizeHeading(table.heading);
    if (!heading.includes("source inventory") && !table.headers.some((header) => header.includes("source id"))) continue;
    for (const entry of table.rows) {
      const id = cleanCell(firstValue(entry.row, ["source id", "id"]));
      if (!id) continue;
      inventory.set(id, {
        id,
        path: cleanCell(firstValue(entry.row, ["path url node", "path", "url", "node"])),
        state: cleanCell(firstValue(entry.row, ["screen or state", "state", "screen"])),
      });
    }
  }
  const sourcesNamed = (cell) =>
    [...new Set(cleanCell(cell).match(/\b[A-Z]{1,3}-?\d{1,4}\b/g) || [])].filter((id) => inventory.has(id)).map((id) => inventory.get(id));

  const items = [];
  for (const table of tables.filter(isSourceDuplicateTable)) {
    for (const entry of table.rows) {
      const leftCell = firstValue(entry.row, ["candidate source", "candidate", "new source", "source a"]);
      const rightCell = firstValue(entry.row, ["duplicate of", "existing source", "duplicate", "source b"]);
      const matchType = cleanCell(firstValue(entry.row, ["match type", "match"]));
      const fingerprint = cleanCell(firstValue(entry.row, ["fingerprint", "normalized key", "key"]));
      const decisionCell = firstValue(entry.row, ["developer decision", "decision"]);
      if (!cleanCell(leftCell) && !cleanCell(rightCell) && !matchType && !fingerprint && !cleanCell(decisionCell)) continue;
      const suggestedChoice = choiceIn(firstValue(entry.row, ["suggested action", "suggested"]), SOURCE_CHOICES);
      const reason = cleanCell(firstValue(entry.row, ["rationale", "owner"]));
      const decided = rowDecided(decisionCell, SOURCE_DECISION);
      items.push({
        id: `src:${cleanCell(leftCell)}|${cleanCell(rightCell)}`,
        section: "sources",
        kind: "choice",
        status: decided ? "confirmed" : suggestedChoice ? "suggested" : "undecided",
        left: cleanCell(leftCell),
        right: cleanCell(rightCell),
        why: matchType,
        fingerprint,
        options: SOURCE_CHOICES,
        suggestion: suggestedChoice ? { choice: suggestedChoice, reason } : null,
        recorded: decided ? { choice: choiceIn(decisionCell, SOURCE_CHOICES), text: cleanCell(decisionCell), reason } : null,
        leftSources: sourcesNamed(leftCell),
        rightSources: sourcesNamed(rightCell),
      });
    }
  }
  return items;
}

// A palette step that is darker than the step numbered below it.
export function findColorScaleIssues(refTokens) {
  const { colors } = findNearPairs(refTokens);
  const byFamily = new Map();
  for (const color of colors.filter((entry) => entry.step !== null)) {
    byFamily.set(color.family, [...(byFamily.get(color.family) || []), color]);
  }
  const issues = [];
  for (const [family, familyColors] of byFamily) {
    const sorted = [...familyColors].sort((a, b) => b.step - a.step);
    for (let index = 0; index < sorted.length - 1; index += 1) {
      const higher = sorted[index];
      const lower = sorted[index + 1];
      if (higher.luminance + LIGHTNESS_TOLERANCE < lower.luminance) {
        issues.push({ family, higher: { name: higher.name, value: higher.value }, lower: { name: lower.name, value: lower.value } });
      }
    }
  }
  return issues;
}

// ---------------------------------------------------------------------------
// The whole review
// ---------------------------------------------------------------------------

// Everything the review page and the machine-readable output are built from.
export function buildReview({
  refCss = "",
  sysCss = "",
  compCss = "",
  architectureDoc = null,
  inventoryDoc = null,
  evidenceDoc = null,
  componentDocs = [],
  imageSize = () => null,
}) {
  const refTokens = parseTokens(refCss);
  const records = collectDecisionRecords({ architectureDoc, refTokens });
  const usageOf = createUsageLookup({ sysTokens: parseTokens(sysCss), compTokens: parseTokens(compCss), componentDocs });
  const pairs = findNearPairs(refTokens).pairs.map((pair) => ({ ...pair, status: resolvePair(records, pair.a, pair.b).status }));

  const scaleItems = findColorScaleIssues(refTokens).map((issue) => ({
    id: `scale:${issue.family}:${issue.higher.name}|${issue.lower.name}`,
    section: "tokens",
    kind: "color-scale",
    status: "issue",
    ...issue,
  }));
  const componentItems = buildComponentItems({ inventoryDoc, imageSize });
  const sourceItems = buildSourceItems({ evidenceDoc });
  const items = [...scaleItems, ...buildTokenItems({ refTokens, records, usageOf }), ...componentItems, ...sourceItems];

  const awaiting = items.filter((item) => item.status !== "confirmed");
  return {
    pairs,
    items,
    counts: {
      sources: sourceItems.length,
      colorScaleIssues: scaleItems.length,
      nearColors: pairs.filter((pair) => pair.type === "color").length,
      nearNumbers: pairs.filter((pair) => pair.type === "number").length,
      components: componentItems.length,
      items: items.length,
      confirmed: items.length - awaiting.length,
      // The number of review items waiting for a designer: what the page shows
      // and what pipeline-board reads.
      needsReview: awaiting.length,
      unresolvedNearPairs: pairs.filter((pair) => pair.status !== "confirmed").length,
    },
    needsReview: awaiting.map(summarizeItem),
  };
}

// A short form of an item for lists: enough to say what it is without its details.
export function summarizeItem(item) {
  const base = { id: item.id, section: item.section, kind: item.kind, status: item.status };
  if (item.kind === "choice") return { ...base, left: item.left, right: item.right };
  if (item.kind === "color-scale") return { ...base, family: item.family, higher: item.higher, lower: item.lower };
  return { ...base, family: item.family, tokens: item.members.map((member) => ({ name: member.name, value: member.value })) };
}

// ---------------------------------------------------------------------------
// Interface locale
// ---------------------------------------------------------------------------

export const SUPPORTED_LOCALES = ["zh-Hant", "en", "ja"];

// The language tag recorded in SESSION_STATE.md, as in
// "Report Language: zh-Hant (繁體中文)". The value must sit on the same line.
export function readReportLanguage(sessionStateDoc) {
  const match = String(sessionStateDoc || "").match(/Report Language[^:：\n]*[:：][ \t]*`?([A-Za-z]{2,3}(?:-[A-Za-z0-9]+)*)/);
  return match ? match[1] : null;
}

// Chinese (Traditional or Simplified) reads the zh-Hant interface, Japanese
// the ja interface, and every other language the English one.
export function localeForLanguage(tag) {
  if (!tag) return null;
  const lower = tag.toLowerCase();
  if (lower.startsWith("zh")) return "zh-Hant";
  if (lower.startsWith("ja")) return "ja";
  return "en";
}

// The default interface locale of a generated page: a supported --locale
// value, else the package's recorded report language, else English. An
// unsupported flag value is reported and otherwise ignored; it never stops
// generation.
export function resolveLocale({ flag = null, sessionStateDoc = null } = {}) {
  const fromPackage = localeForLanguage(readReportLanguage(sessionStateDoc)) || "en";
  if (flag === null || flag === undefined) return { locale: fromPackage, warning: null };
  if (SUPPORTED_LOCALES.includes(flag)) return { locale: flag, warning: null };
  return {
    locale: fromPackage,
    warning: `Unsupported --locale value "${flag}". Supported values: ${SUPPORTED_LOCALES.join(", ")}. Using "${fromPackage}".`,
  };
}
