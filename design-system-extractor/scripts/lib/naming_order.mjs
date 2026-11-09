// Naming order: the team's slot order for token names, recorded in
// design-system/TOKEN_ARCHITECTURE.md under "## Naming Order". Used by audit_tokens.mjs.
//
// A recorded order is a list of slots (for example prefix > category > component > role >
// variant > target > state) with an optional vocabulary per slot. A CSS name is the slash
// path with "/" replaced by "-", so a name is split back into segments by the longest
// vocabulary match; a value that contains "-" (on-primary, label-text) counts as one segment.

// State words used for the state-group check when no order (or no state vocabulary) is recorded.
export const DEFAULT_STATE_WORDS = [
  "default",
  "hovered",
  "hover",
  "focused",
  "focus",
  "focus-visible",
  "pressed",
  "dragged",
  "disabled",
  "selected",
  "unselected",
  "checked",
];

const DEFAULT_CATEGORY_WORDS = ["ref", "sys", "comp"];
const LAYERS = ["ref", "sys", "comp"];
const NUMBER = /^\d+(?:[._]\d+)?$/;
const EMPTY_CELL = new Set(["", "-", "—", "–", "n/a", "none"]);

const clean = (text) => text.replace(/`/g, "").replace(/\*\*/g, "").trim();
const cells = (line) =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => clean(cell));
const list = (text) =>
  clean(text)
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => !EMPTY_CELL.has(value));

/**
 * Parse the "## Naming Order" section of TOKEN_ARCHITECTURE.md.
 * Returns null when the section is missing or its Order: line is empty or "default".
 */
export function parseNamingOrder(markdown) {
  if (!markdown) return null;
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => /^##\s+Naming Order\b/i.test(line.trim()));
  if (start === -1) return null;
  const section = [];
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,2}\s/.test(line.trim())) break;
    section.push(line);
  }

  const field = (label) => {
    const pattern = new RegExp(`^\\s*(?:[-*]\\s+)?(?:\\*\\*)?${label}(?:\\*\\*)?\\s*:\\s*(.*)$`, "i");
    for (const line of section) {
      const match = line.match(pattern);
      if (match) return clean(match[1]);
    }
    return null;
  };

  const orderText = field("Order");
  if (!orderText || /^default\b/i.test(orderText)) return null;
  const slots = [];
  for (const slot of orderText.split(/\s*(?:->|→|>|\/)\s*/)) {
    const name = slot.trim().toLowerCase();
    if (name && !slots.includes(name)) slots.push(name);
  }
  if (slots.length < 2) return null;

  const sourceText = field("Source");
  const source = sourceText ? sourceText.split(/[\s(—–-]/)[0].toLowerCase() || null : null;
  const defaultState = (field("Default state") || "default").split(/\s/)[0].toLowerCase() || "default";

  const values = Object.fromEntries(slots.map((slot) => [slot, []]));
  const layers = Object.fromEntries(slots.map((slot) => [slot, []]));
  let columns = { slot: 0, layers: 1, values: 2 };
  for (const line of section) {
    if (!line.trim().startsWith("|")) continue;
    const row = cells(line);
    const lower = row.map((cell) => cell.toLowerCase());
    if (lower.includes("slot") && lower.includes("values")) {
      columns = {
        slot: lower.indexOf("slot"),
        layers: lower.indexOf("layers"),
        values: lower.indexOf("values"),
      };
      continue;
    }
    const slot = (row[columns.slot] || "").toLowerCase();
    if (!slots.includes(slot)) continue;
    if (columns.values >= 0 && row[columns.values] !== undefined) values[slot] = list(row[columns.values]);
    if (columns.layers >= 0 && row[columns.layers] !== undefined) {
      layers[slot] = list(row[columns.layers]).filter((layer) => LAYERS.includes(layer));
    }
  }
  if (slots.includes("category") && values.category.length === 0) values.category = [...DEFAULT_CATEGORY_WORDS];

  return { slots, values, layers, source, defaultState };
}

export function formatNamingOrder(order) {
  return order ? order.slots.join(" > ") : "default";
}

function vocabulary(order) {
  const lookup = new Map();
  const numberSlots = [];
  let longest = 1;
  order.slots.forEach((slot, index) => {
    if (slot === "prefix" || slot === "category") return;
    for (const value of order.values[slot] || []) {
      if (NUMBER.test(value)) {
        if (!numberSlots.includes(index)) numberSlots.push(index);
        continue;
      }
      if (!lookup.has(value)) lookup.set(value, new Set());
      lookup.get(value).add(index);
      longest = Math.max(longest, value.split("-").length);
    }
  });
  return { lookup, numberSlots, longest };
}

/**
 * Split a CSS token name into segments and check them against the recorded order.
 * layer is "ref", "sys" or "comp"; a slot whose Layers cell excludes it is skipped.
 * Returns { ok, segments, violation, expected }.
 */
export function checkNameOrder(name, order, layer) {
  const result = { ok: true, segments: [], violation: null, expected: null };
  if (!order) return result;
  const words = name.replace(/^--/, "").toLowerCase().split("-").filter(Boolean);
  const categories = order.values.category?.length ? order.values.category : DEFAULT_CATEGORY_WORDS;
  const categoryAt = words.findIndex((word, index) => index > 0 && categories.includes(word));
  if (categoryAt === -1) return result;

  const slotIndex = (slot) => order.slots.indexOf(slot);
  const segments = [
    { text: words.slice(0, categoryAt).join("-"), slots: slotIndex("prefix") >= 0 ? [slotIndex("prefix")] : [] },
    { text: words[categoryAt], slots: slotIndex("category") >= 0 ? [slotIndex("category")] : [] },
  ];
  const { lookup, numberSlots, longest } = vocabulary(order);
  for (let position = categoryAt + 1; position < words.length; ) {
    let matched = null;
    for (let size = Math.min(longest, words.length - position); size >= 1; size -= 1) {
      const candidate = words.slice(position, position + size).join("-");
      if (lookup.has(candidate)) {
        matched = { text: candidate, slots: [...lookup.get(candidate)].sort((a, b) => a - b), size };
        break;
      }
    }
    if (!matched) {
      const word = words[position];
      matched = { text: word, slots: NUMBER.test(word) ? [...numberSlots] : [], size: 1 };
    }
    position += matched.size;
    segments.push({ text: matched.text, slots: matched.slots });
  }

  for (const segment of segments) {
    const allowed = segment.slots.filter((index) => {
      const restricted = order.layers[order.slots[index]] || [];
      return restricted.length === 0 || restricted.includes(layer);
    });
    if (segment.slots.length > 0 && allowed.length === 0) segment.excluded = true;
    segment.slots = allowed;
  }
  result.segments = segments;

  let current = -1;
  let previous = null;
  for (const segment of segments) {
    if (segment.slots.length === 0) continue;
    const candidates = segment.slots.filter((index) => index >= current);
    if (candidates.length === 0) {
      result.ok = false;
      result.violation = {
        segment: segment.text,
        slot: order.slots[segment.slots[0]],
        previous: previous.text,
        previousSlot: order.slots[current],
      };
      break;
    }
    current = Math.min(...candidates);
    previous = segment;
  }

  if (!result.ok && segments.every((segment) => segment.slots.length > 0)) {
    const sorted = segments
      .map((segment, index) => ({ segment, index, rank: Math.min(...segment.slots) }))
      .sort((a, b) => a.rank - b.rank || a.index - b.index)
      .map(({ segment }) => segment.text);
    result.expected = `--${sorted.join("-")}`;
  }
  return result;
}

/**
 * Find tokens that would be both a token and a group once the names become slash paths
 * (Figma Variables, DTCG): --x next to --x-<state>. CSS itself is unaffected.
 * Returns [{ token, children, suggestion }]; suggestion is null when --x-<default> exists.
 */
export function findStateGroups(names, order) {
  const defaultState = order?.defaultState || "default";
  const recorded = order?.values?.state?.length ? order.values.state : null;
  const states = [...new Set([...(recorded || DEFAULT_STATE_WORDS), defaultState])];
  const known = new Set(names.map((name) => name.toLowerCase()));
  const groups = [];
  for (const name of names) {
    const token = name.toLowerCase();
    const children = states.map((state) => `${token}-${state}`).filter((child) => known.has(child));
    if (children.length === 0) continue;
    const suggestion = `${token}-${defaultState}`;
    groups.push({ token: name, children, suggestion: known.has(suggestion) ? null : suggestion });
  }
  return groups;
}
