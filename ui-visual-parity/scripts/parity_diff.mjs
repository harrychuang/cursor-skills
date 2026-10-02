#!/usr/bin/env node

/**
 * Compare two UI Specs by what is visible.
 *
 * Three ideas separate this from a field-by-field diff of hand-picked nodes:
 *
 *  1. It compares primitives — the things that put pixels on screen (painted boxes, text
 *     blocks, icons, images, inputs) — not element trees. Wrappers that paint nothing can
 *     differ freely between a design file and a DOM; what must agree is what is drawn.
 *  2. Position is measured the way a designer redlines it: the distance from each primitive
 *     to its nearest neighbour or to the edge of the box it sits in. One wrong padding shows
 *     up as one changed distance, not as every element below it having moved.
 *  3. Declared layout values (padding, gap, margin) are never compared directly. They are
 *     read only to explain a distance that differs, so two ways of producing the same
 *     picture are never reported as drift.
 *
 * Every finding says what to do with it (`action`): fix, follows (a consequence of a cause —
 * re-measure, do not fix), leave (an adaptation or a sanctioned value), or untrusted (the
 * measurement cannot be relied on).
 *
 *   node parity_diff.mjs --reference ref.spec.json --implementation impl.spec.json \
 *     --output findings.json [--policy policy.json] [--map pairs.json] [--remaps remaps.json] \
 *     [--ignore areas.json]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_POLICY = path.join(here, "..", "assets", "parity-policy.json");

const KIND_GROUP = { box: "box", input: "box", text: "text", icon: "graphic", image: "graphic" };
const SIDES = ["top", "right", "bottom", "left"];
const CORNERS = ["top-left", "top-right", "bottom-right", "bottom-left"];
const PAD = { top: 0, right: 1, bottom: 2, left: 3 };

/* ------------------------------------------------------------------- policy */

export function loadPolicy(overridePath) {
  const base = JSON.parse(fs.readFileSync(DEFAULT_POLICY, "utf8"));
  if (!overridePath) return base;
  // Objects merge at every depth, so an override states only what it changes; lists are
  // replaced whole.
  const merge = (under, over) => {
    if (!over || typeof over !== "object" || Array.isArray(over) || !under || typeof under !== "object" || Array.isArray(under)) return over === undefined ? under : over;
    const out = { ...under };
    for (const key of Object.keys(over)) out[key] = merge(under[key], over[key]);
    return out;
  };
  return merge(base, JSON.parse(fs.readFileSync(overridePath, "utf8")));
}

/* ------------------------------------------------------------------ helpers */

const right = (r) => r.x + r.width;
const bottom = (r) => r.y + r.height;
const area = (r) => r.width * r.height;
const cx = (r) => r.x + r.width / 2;
const cy = (r) => r.y + r.height / 2;
const round = (v) => Math.round(v * 100) / 100;
const num = (v) => (typeof v === "number" ? v : 0);
const fmt = (v) => (typeof v === "number" ? String(round(v)) : String(v));
const signed = (v) => `${v > 0 ? "+" : ""}${fmt(v)}`;
const leaf = (node) => node.selector?.split(" > ").pop() || node.name || node.id;
const isBox = (node) => KIND_GROUP[node.kind] === "box";
const vertical = (side) => side === "top" || side === "bottom";

const union = (a, b) => {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, width: Math.max(right(a), right(b)) - x, height: Math.max(bottom(a), bottom(b)) - y };
};

function contains(outer, inner, slack = 0.5) {
  return inner.x >= outer.x - slack && inner.y >= outer.y - slack && right(inner) <= right(outer) + slack && bottom(inner) <= bottom(outer) + slack;
}
function containsPoint(outer, x, y) {
  return x >= outer.x - 0.5 && x <= right(outer) + 0.5 && y >= outer.y - 0.5 && y <= bottom(outer) + 0.5;
}

function textKey(node) {
  return String(node.text ?? "")
    .replace(/[​-‍﻿]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function renderedText(node) {
  const text = String(node.text ?? "").replace(/\s+/g, " ").trim();
  const transform = node.type?.transform;
  if (transform === "uppercase") return text.toUpperCase();
  if (transform === "lowercase") return text.toLowerCase();
  if (transform === "capitalize") return text.replace(/(^|\s)(\S)/g, (m, space, ch) => space + ch.toUpperCase());
  return text;
}

/* ------------------------------------------------------------------ colours */

const NAMED = { black: "#000000", white: "#ffffff", red: "#ff0000", green: "#008000", blue: "#0000ff", gray: "#808080", grey: "#808080", transparent: "#00000000" };
const hexByte = (n) => Math.max(0, Math.min(255, Math.round(Number(n)))).toString(16).padStart(2, "0");
/** The alpha pair of a hex colour, or nothing when it rounds to fully opaque. */
const hexAlpha = (a) => (Math.round(a * 255) >= 255 ? "" : hexByte(a * 255));
const hueDegrees = (token) => {
  const n = parseFloat(token);
  if (/turn$/.test(token)) return n * 360;
  if (/grad$/.test(token)) return n * 0.9;
  if (/rad$/.test(token)) return (n * 180) / Math.PI;
  return n;
};

/** Hex, rgb(), hsl(), and a few names → #rrggbb, or #rrggbbaa when translucent. Anything else is returned as given. */
export function toHexColor(value) {
  if (typeof value !== "string") return value ?? null;
  const v = value.trim().toLowerCase();
  if (NAMED[v]) return NAMED[v];
  let m = /^#([0-9a-f]{3,8})$/.exec(v);
  if (m) {
    let d = m[1];
    if (d.length === 3 || d.length === 4) d = [...d].map((c) => c + c).join("");
    if (d.length === 6) return `#${d}`;
    if (d.length === 8) return d.slice(6) === "ff" ? `#${d.slice(0, 6)}` : `#${d}`;
    return value;
  }
  const share = (part) => (part.endsWith("%") ? parseFloat(part) / 100 : Number(part));
  m = /^rgba?\(([^)]+)\)$/.exec(v);
  if (m) {
    const parts = m[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3) return value;
    const [r, g, b] = parts.slice(0, 3).map((part) => (part.endsWith("%") ? Math.round((parseFloat(part) * 255) / 100) : Number(part)));
    const a = parts[3] === undefined ? 1 : share(parts[3]);
    return `#${hexByte(r)}${hexByte(g)}${hexByte(b)}${hexAlpha(a)}`;
  }
  m = /^hsla?\(([^)]+)\)$/.exec(v);
  if (m) {
    const parts = m[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3) return value;
    const h = ((hueDegrees(parts[0]) % 360) + 360) % 360;
    const s = parseFloat(parts[1]) / 100;
    const l = parseFloat(parts[2]) / 100;
    const a = parts[3] === undefined ? 1 : share(parts[3]);
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const base = l - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return `#${hexByte((r + base) * 255)}${hexByte((g + base) * 255)}${hexByte((b + base) * 255)}${hexAlpha(a)}`;
  }
  return value;
}

function parseHex(value) {
  const hex = toHexColor(value);
  if (typeof hex !== "string") return null;
  const m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex);
  if (!m) return null;
  return { r: parseInt(m[1].slice(0, 2), 16), g: parseInt(m[1].slice(2, 4), 16), b: parseInt(m[1].slice(4, 6), 16), a: m[2] ? parseInt(m[2], 16) / 255 : 1 };
}

export function sameColor(a, b, tolerance = { color: 2, alpha: 0.012 }) {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  const x = parseHex(a);
  const y = parseHex(b);
  if (!x || !y) return String(a).toLowerCase() === String(b).toLowerCase();
  if (x.a <= tolerance.alpha && y.a <= tolerance.alpha) return true; // nothing is drawn either way
  return Math.max(Math.abs(x.r - y.r), Math.abs(x.g - y.g), Math.abs(x.b - y.b)) <= tolerance.color && Math.abs(x.a - y.a) <= tolerance.alpha;
}

function splitTop(text, separator) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "(") depth += 1;
    else if (text[i] === ")") depth -= 1;
    else if (text[i] === separator && depth === 0) {
      parts.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(text.slice(start).trim());
  return parts.filter(Boolean);
}

const SIDE_ANGLE = { "to top": 0, "to right": 90, "to bottom": 180, "to left": 270 };

/**
 * A CSS gradient as written by hand → the canonical form the extractors produce, so a
 * hand-written spec's `linear-gradient(...)` compares by value like any other.
 */
export function canonicalGradient(text) {
  if (typeof text !== "string" || !/-gradient\(/.test(text)) return text;
  return splitTop(text, ",")
    .map((layer) => {
      const m = /^(repeating-)?(linear|radial|conic)-gradient\((.*)\)$/i.exec(layer);
      if (!m) return layer;
      let args = splitTop(m[3], ",");
      let head = "";
      const first = args[0] || "";
      const isStop = /^(#|rgb|hsl|[a-z]+$)/i.test(first) && !/^(to |from |at |circle|ellipse|closest|farthest)/i.test(first) && !/(deg|rad|turn|grad)$/.test(first.split(" ")[0]);
      if (!isStop) {
        head = first;
        args = args.slice(1);
      }
      if (m[2].toLowerCase() === "linear") {
        if (!head) head = "180deg";
        else if (SIDE_ANGLE[head] !== undefined) head = `${SIDE_ANGLE[head]}deg`;
        else if (/(deg|rad|turn|grad)$/.test(head)) head = `${round(hueDegrees(head))}deg`;
      }
      const stops = args.map((arg) => {
        const fn = /^[a-z-]+\([^()]*\)/i.exec(arg);
        const colour = fn ? fn[0] : arg.split(/\s+/)[0];
        const rest = arg.slice(colour.length).trim();
        return `${toHexColor(colour)}${rest ? ` ${rest}` : ""}`;
      });
      return `${m[1] ? "repeating-" : ""}${m[2].toLowerCase()}(${head ? `${head}, ` : ""}${stops.join(", ")})`;
    })
    .join(" | ");
}

/** "linear(135deg, #4f46e5 0%, #7c3aed 100%)" → its parts, so two tools' output can be compared by value. */
function parseGradient(text) {
  const m = /^(repeating-)?(linear|radial|conic)\((.*)\)$/.exec(String(text).trim());
  if (!m) return null;
  const parts = m[3].split(/,\s*(?![^()]*\))/).map((part) => part.trim());
  let head = "";
  if (parts.length && !/^#/.test(parts[0])) head = parts.shift();
  const stops = parts.map((part) => {
    const [color, position] = part.split(/\s+/);
    return { color, position: position === undefined ? null : parseFloat(position) };
  });
  // Stops written without a position sit evenly between their neighbours, from 0 to 100.
  if (stops.length && stops[0].position === null) stops[0].position = 0;
  if (stops.length && stops[stops.length - 1].position === null) stops[stops.length - 1].position = 100;
  for (let i = 1; i < stops.length - 1; i += 1) {
    if (stops[i].position !== null) continue;
    let next = i;
    while (stops[next].position === null) next += 1;
    const step = (stops[next].position - stops[i - 1].position) / (next - i + 1);
    for (let k = i; k < next; k += 1) stops[k].position = stops[i - 1].position + step * (k - i + 1);
  }
  return { kind: `${m[1] || ""}${m[2]}`, head, angle: /deg$/.test(head) ? parseFloat(head) : null, stops };
}

/** Background layers are canonical strings; compare them by value so colour and rounding noise do not matter. */
export function sameGradient(a, b, tolerance = { color: 2, alpha: 0.012 }, { shapes = true } = {}) {
  if ((a || "") === (b || "")) return true;
  if (!a || !b) return false;
  const left = String(canonicalGradient(a)).split(" | ");
  const rightLayers = String(canonicalGradient(b)).split(" | ");
  if (left.length !== rightLayers.length) return false;
  return left.every((layer, index) => {
    const x = parseGradient(layer);
    const y = parseGradient(rightLayers[index]);
    if (!x || !y) return layer === rightLayers[index];
    if (x.kind !== y.kind || x.stops.length !== y.stops.length) return false;
    // A design tool and CSS describe a radial or conic shape in different terms; between
    // tools only its colours and stops can be compared.
    if (x.angle !== null && y.angle !== null ? Math.abs(x.angle - y.angle) > 1 : shapes && x.head !== y.head) return false;
    return x.stops.every((stop, i) => sameColor(stop.color, y.stops[i].color, tolerance) && Math.abs(stop.position - y.stops[i].position) <= 1);
  });
}

function shadowText(list) {
  if (!list || !list.length) return "none";
  return list.map((s) => `${s.inset ? "inset " : ""}${s.x} ${s.y} ${s.blur} ${s.spread} ${s.color}`).join(", ");
}
function sameShadows(a, b, T) {
  // The order shadows are listed in differs between tools and is not something anyone sees.
  const order = (p, q) => Number(p.inset) - Number(q.inset) || p.y - q.y || p.x - q.x || p.blur - q.blur || p.spread - q.spread || String(p.color).localeCompare(String(q.color));
  const x = [...(a || [])].sort(order);
  const y = [...(b || [])].sort(order);
  if (x.length !== y.length) return false;
  return x.every((s, i) => s.inset === y[i].inset && ["x", "y", "blur", "spread"].every((k) => Math.abs(s[k] - y[i][k]) <= T.value) && sameColor(s.color, y[i].color, T));
}

/** A CSS box-shadow string → the structured list the extractors produce (used for hand-written specs). */
function parseShadowString(value) {
  if (!value || value === "none") return null;
  if (Array.isArray(value)) return value;
  return String(value)
    .split(/,(?![^()]*\))/)
    .map((item) => {
      const inset = /\binset\b/.test(item);
      let rest = item.replace(/\binset\b/, "").trim();
      const fn = /[a-z-]+\([^()]*\)/i.exec(rest);
      let colour = "";
      if (fn) {
        colour = fn[0];
        rest = rest.replace(fn[0], "").trim();
      } else {
        const words = rest.split(/\s+/);
        colour = words.find((word) => !/^-?[\d.]+(px)?$/.test(word)) || "";
        rest = words.filter((word) => word !== colour).join(" ");
      }
      const n = rest.split(/\s+/).map((part) => parseFloat(part) || 0);
      return { inset, x: n[0] || 0, y: n[1] || 0, blur: n[2] || 0, spread: n[3] || 0, color: toHexColor(colour) || colour };
    });
}

/**
 * The lines drawn around a box, however they were made. A border, and a shadow with no
 * offset and no blur, put the same pixels on screen; a design tool calls both a stroke,
 * inside or outside. Folding them together keeps "border" versus "ring" from reading as a
 * difference when the picture is the same.
 */
export function strokesOf(node, tolerance) {
  const width = SIDES.map((side, i) => num(node.border?.width?.[i]));
  const color = SIDES.map((side, i) => (width[i] ? node.border.color?.[i] ?? null : null));
  const style = SIDES.map((side, i) => (width[i] ? node.border.style?.[i] || "solid" : null));
  const shadows = [];
  const outside = [];
  if (node.outline) outside.push({ width: num(node.outline.width), color: node.outline.color, offset: num(node.outline.offset), style: node.outline.style || "solid" });
  for (const s of node.shadow || []) {
    const ring = s.x === 0 && s.y === 0 && s.blur === 0 && s.spread > 0;
    if (ring && s.inset && width.every((w, i) => w === 0 || sameColor(color[i], s.color, tolerance))) {
      SIDES.forEach((side, i) => {
        width[i] += s.spread;
        color[i] = s.color;
        style[i] = style[i] || "solid";
      });
    } else if (ring && !s.inset) outside.push({ width: s.spread, color: s.color, offset: 0, style: "solid" });
    else shadows.push(s);
  }
  outside.sort((p, q) => p.offset - q.offset || p.width - q.width);
  return { width, color, style, shadows, outside };
}

/* -------------------------------------------------------------------- model */

const ROLE_KIND = { text: "text", image: "image", icon: "icon", input: "input" };

/**
 * Bring a hand-written (1.0) node to the shape the extractors produce, so one comparison
 * serves both. Specs from the bundled extractors pass through untouched.
 */
function normalizeNode(node, index) {
  if (node.kind && node.rect !== undefined && node.paints !== undefined) return node;
  const out = { ...node };
  out.id = node.id || node.path || `node-${index}`;
  out.name = node.name || out.id;
  out.kind = node.kind || ROLE_KIND[node.role] || (node.text && !node.background && !node.border ? "text" : "box");
  out.selector = node.selector || node.component || out.name;
  if (!node.rect && node.box?.position && num(node.box.width) > 0 && num(node.box.height) > 0) {
    out.rect = { x: num(node.box.position.x), y: num(node.box.position.y), width: node.box.width, height: node.box.height };
  }
  if (node.fill !== undefined) out.fill = toHexColor(node.fill);
  if (typeof node.background === "string" && /gradient\(/.test(node.background)) {
    out.gradient = canonicalGradient(node.background);
    delete out.background;
  } else if (node.background !== undefined) {
    out.background = toHexColor(node.background);
    if (parseHex(out.background)?.a === 0) delete out.background; // "transparent" paints nothing
  }
  if (typeof node.gradient === "string") out.gradient = canonicalGradient(node.gradient);
  if (node.border && !Array.isArray(node.border.width)) {
    const sides = !node.border.sides || node.border.sides === "all" ? SIDES : String(node.border.sides).split(/[\s,]+/);
    const w = num(node.border.width);
    out.border = w
      ? {
          width: SIDES.map((side) => (sides.includes(side) ? w : 0)),
          color: SIDES.map((side) => (sides.includes(side) ? toHexColor(node.border.color) : null)),
          style: SIDES.map((side) => (sides.includes(side) ? node.border.style || "solid" : null)),
        }
      : undefined;
  }
  if (typeof node.radius === "number") out.radius = [node.radius, node.radius, node.radius, node.radius];
  if (typeof node.shadow === "string") out.shadow = parseShadowString(node.shadow);
  if (node.type) out.type = { ...node.type, lines: node.type.lines ?? node.type.numberOfLines ?? undefined };
  if (node.role === "control" || node.role === "input") out.interactive = node.interactive ?? true;
  if (out.paints === undefined) out.paints = Boolean(out.kind !== "box" || out.background || out.gradient || out.border || out.shadow || out.text || out.asset);
  return out;
}

export function loadModel(spec) {
  // Copies: the comparison adjusts rectangles (a text box's anchor, a divider folded into a
  // border), and none of that may reach the caller's spec.
  const nodes = (spec.nodes || []).map((node, index) => ({ ...normalizeNode(node, index) }));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  // Every walk up the tree relies on it being one: a node that is its own ancestor would never end it.
  for (const node of nodes) {
    let steps = 0;
    for (let current = node; current && current.parent; current = byId.get(current.parent)) {
      if ((steps += 1) > nodes.length) throw new Error(`The spec is not a tree: node ${node.id} is its own ancestor.`);
    }
  }
  const sized = (node) => Boolean(node.rect) && node.rect.width > 0 && node.rect.height > 0;
  const root = nodes.find((node) => !node.parent) || nodes[0];
  const rootRect = { x: 0, y: 0, width: spec.surface?.root?.width ?? root?.rect?.width ?? 0, height: spec.surface?.root?.height ?? root?.rect?.height ?? 0 };
  const model = { spec: { ...spec, nodes }, byId, root, rootRect, sized };
  model.prims = nodes.filter((node) => node.paints && sized(node));
  // A spec whose painting nodes carry no rectangles cannot be placed; it can only be compared by look.
  model.partial = nodes.some((node) => node.paints && !node.rect);
  return model;
}

/**
 * Drop operating-system chrome, platform-only nodes, and everything inside them. Chrome is
 * recognised by name, which is only safe where chrome can be in the capture at all: a design
 * frame or a device screenshot. In a DOM, an element called "status-bar" is the app's own.
 */
function prune(model, policy) {
  const byName = model.spec.surface?.platform === "web" ? [] : (policy.ignoredNodeNamePatterns || []).map((pattern) => pattern.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim());
  const listed = new Set(policy.platformOnlyNodes || []);
  const dropped = new Set();
  const names = [];
  for (const node of model.spec.nodes) {
    const parent = node.parent ? model.byId.get(node.parent) : null;
    if (parent && dropped.has(parent)) {
      dropped.add(node);
      continue;
    }
    const name = `${node.name || ""} ${node.id || ""}`.toLowerCase().replace(/[^a-z0-9]+/g, " ");
    const isListed = listed.size && [node.id, node.name, node.selector, node.selector?.split(" > ").pop(), ...Object.values(node.keys || {})].some((value) => value && listed.has(value));
    if (node.platformOnly || isListed || byName.some((pattern) => pattern && name.includes(pattern))) {
      dropped.add(node);
      names.push(leaf(node));
    }
  }
  if (dropped.size) {
    model.spec.nodes = model.spec.nodes.filter((node) => !dropped.has(node));
    model.prims = model.prims.filter((node) => !dropped.has(node));
  }
  return names;
}

/* ----------------------------------------------------------------- dividers */

/**
 * A thin solid line drawn by an element of its own — a divider, a rule. A geometry-only
 * reference does not say what paints, so there any thin leaf box may be one.
 */
function hairlineOf(node, loose) {
  if (!isBox(node) || node.kind === "input" || !node.rect) return null;
  const thickness = Math.min(node.rect.width, node.rect.height);
  if (thickness <= 0 || thickness > 4 || Math.max(node.rect.width, node.rect.height) < thickness * 4) return null;
  const horizontal = node.rect.height <= node.rect.width;
  if (loose) return node.wrapper ? null : { horizontal, thickness, color: null };
  if (node.gradient || node.shadow || node.pseudo || node.outline) return null;
  const widths = SIDES.map((side, i) => num(node.border?.width?.[i]));
  const drawn = widths.filter(Boolean).length;
  if (node.background && !drawn) return { horizontal, thickness, color: node.background };
  if (!node.background && drawn === 1) {
    // A rule drawn as one border of an element with no height of its own.
    const i = widths.findIndex(Boolean);
    if (vertical(SIDES[i]) === horizontal && Math.abs(widths[i] - thickness) <= 0.5) return { horizontal, thickness, color: node.border.color?.[i] ?? null };
  }
  return null;
}

/** The side of `box` a line runs along from end to end, flush inside it or just outside — or null. */
function runsAlong(line, shape, box) {
  const l = line.rect;
  const b = box.rect;
  const near = (p, q) => Math.abs(p - q) <= 0.75;
  if (shape.horizontal) {
    if (!near(l.x, b.x) || !near(right(l), right(b))) return null;
    if (near(bottom(l), bottom(b)) || near(l.y, bottom(b))) return "bottom";
    return near(l.y, b.y) || near(bottom(l), b.y) ? "top" : null;
  }
  if (!near(l.y, b.y) || !near(bottom(l), bottom(b))) return null;
  if (near(right(l), right(b)) || near(l.x, right(b))) return "right";
  return near(l.x, b.x) || near(right(l), b.x) ? "left" : null;
}

/* ----------------------------------------------------------------- matching */

const readingOrder = (a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x;

/** 0 = same place and size inside its frame; above 1 = too far apart to be the same thing. */
function placementCost(a, originA, b, originB) {
  const scale = Math.max(24, Math.min(originA.width, originA.height) * 0.35);
  const dx = a.x - originA.x - (b.x - originB.x);
  const dy = a.y - originA.y - (b.y - originB.y);
  const size = Math.abs(a.width - b.width) + Math.abs(a.height - b.height);
  return (Math.hypot(dx, dy) + size * 0.5) / scale;
}

function paintSimilarity(a, b) {
  const features = ["background", "gradient", "border", "shadow", "radius", "pseudo"];
  return features.filter((feature) => Boolean(a[feature]) === Boolean(b[feature])).length / features.length;
}

function sizeSimilarity(a, b) {
  return 1 - Math.min(1, (Math.abs(a.width - b.width) + Math.abs(a.height - b.height)) / (a.width + a.height + 1));
}

/**
 * Pair primitives across the two specs. Text is the anchor — the same words are the same
 * element — and everything else is placed relative to text and to already-paired boxes.
 */
export function matchPrimitives(ref, impl, explicit = [], { loose = false, tolerance = { value: 0.25, color: 2, alpha: 0.012 } } = {}) {
  const pairs = new Map(); // reference node → { node, how }
  const taken = new Set();
  // A geometry-only reference cannot tell an image from a rectangle: anything that is not
  // text may be the counterpart of anything that is not text.
  const group = (node) => (loose && KIND_GROUP[node.kind] !== "text" ? "shape" : KIND_GROUP[node.kind]);
  const pair = (a, b, how) => {
    pairs.set(a, { node: b, how });
    taken.add(b);
  };

  // 0. Explicit: a caller-supplied map, a design node id carried on the element, a shared test id.
  const implByKey = new Map();
  for (const node of impl.spec.nodes) for (const key of Object.values(node.keys || {})) implByKey.set(key, node);
  for (const [refId, implKey] of explicit) {
    const a = ref.byId.get(refId);
    const b = implByKey.get(implKey) || impl.byId.get(implKey);
    if (a && b && !taken.has(b)) pair(a, b, "map");
  }
  for (const node of ref.prims) {
    if (pairs.has(node)) continue;
    for (const key of [node.id, ...Object.values(node.keys || {})]) {
      const hit = implByKey.get(key);
      if (hit && !taken.has(hit) && group(hit) === group(node)) {
        pair(node, hit, "key");
        break;
      }
    }
  }

  // 1. Text by content; repeated strings pair in reading order.
  const byText = (list) => {
    const map = new Map();
    for (const node of list) {
      if (node.kind !== "text") continue;
      const key = textKey(node);
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(node);
    }
    return map;
  };
  const implText = byText(impl.prims.filter((node) => !taken.has(node)));
  for (const [key, list] of byText(ref.prims.filter((node) => !pairs.has(node)))) {
    const others = (implText.get(key) || []).slice().sort(readingOrder);
    list.sort(readingOrder);
    if (others.length === list.length) list.forEach((node, index) => pair(node, others[index], "text"));
    else {
      const options = [];
      for (const a of list) for (const b of others) options.push({ a, b, cost: placementCost(a.rect, ref.rootRect, b.rect, impl.rootRect) });
      options.sort((x, y) => x.cost - y.cost);
      for (const { a, b } of options) if (!pairs.has(a) && !taken.has(b)) pair(a, b, "text");
    }
  }

  // 1b. Graphics by identity: the same artwork or the same asset is the same element, wherever
  //     it sits. (A design tool and a build describe artwork differently; those pair by place.)
  const identity = (node) => (node.icon?.signature ? `icon:${node.icon.signature}` : node.image && node.asset ? `asset:${node.asset}` : null);
  const byIdentity = (list) => {
    const map = new Map();
    for (const node of list) {
      const key = KIND_GROUP[node.kind] === "graphic" ? identity(node) : null;
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(node);
    }
    return map;
  };
  const implGraphics = byIdentity(impl.prims.filter((node) => !taken.has(node)));
  for (const [key, list] of byIdentity(ref.prims.filter((node) => !pairs.has(node)))) {
    const others = (implGraphics.get(key) || []).slice().sort(readingOrder);
    list.sort(readingOrder);
    if (others.length === list.length) list.forEach((node, index) => pair(node, others[index], "identity"));
    else {
      const options = [];
      for (const a of list) for (const b of others) options.push({ a, b, cost: placementCost(a.rect, ref.rootRect, b.rect, impl.rootRect) });
      options.sort((x, y) => x.cost - y.cost);
      for (const { a, b } of options) if (!pairs.has(a) && !taken.has(b)) pair(a, b, "identity");
    }
  }

  // 2. Boxes by the text they hold: a card is the box around the same words on both sides.
  const anchors = [...pairs.entries()].filter(([node]) => node.kind === "text");
  const anchorSet = (box, side) => {
    const set = new Set();
    anchors.forEach(([a, { node: b }], index) => {
      const r = side === "ref" ? a.rect : b.rect;
      if (containsPoint(box.rect, cx(r), cy(r))) set.add(index);
    });
    return set;
  };
  const jaccard = (sa, sb) => {
    if (!sa.size || !sb.size) return 0;
    let common = 0;
    for (const index of sa) if (sb.has(index)) common += 1;
    return common / (sa.size + sb.size - common);
  };
  const byContent = (refList, implList, how) => {
    const refSets = new Map(refList.map((node) => [node, anchorSet(node, "ref")]));
    const implSets = new Map(implList.map((node) => [node, anchorSet(node, "impl")]));
    const candidates = [];
    for (const a of refList) {
      for (const b of implList) {
        const j = jaccard(refSets.get(a), implSets.get(b));
        if (j >= 0.6) candidates.push({ a, b, score: j * 3 + paintSimilarity(a, b) + sizeSimilarity(a.rect, b.rect) });
      }
    }
    candidates.sort((x, y) => y.score - x.score);
    for (const { a, b } of candidates) if (!pairs.has(a) && !taken.has(b)) pair(a, b, how);
  };
  byContent(ref.prims.filter((node) => isBox(node) && !pairs.has(node)), impl.prims.filter((node) => isBox(node) && !taken.has(node)), "content");

  // 2b. The same, where one side's box paints nothing: a card with no fill, a row whose
  //     divider was never drawn. The element is there and its paint is not, so pair the two
  //     and let the missing paint be reported on something that can be fixed. Words are a
  //     surer sign than position, so this comes before anything is paired by where it sits.
  const unpainted = (model, used) => model.spec.nodes.filter((node) => node.kind === "box" && !node.paints && model.sized(node) && !used(node));
  byContent(ref.prims.filter((node) => isBox(node) && !pairs.has(node)), unpainted(impl, (node) => taken.has(node)), "unpainted");
  {
    const implLeft = impl.prims.filter((node) => isBox(node) && !taken.has(node));
    const refGhosts = unpainted(ref, (node) => pairs.has(node));
    const refSets = new Map(refGhosts.map((node) => [node, anchorSet(node, "ref")]));
    const ghostOptions = [];
    for (const b of implLeft) {
      const sb = anchorSet(b, "impl");
      for (const a of refGhosts) {
        const j = jaccard(refSets.get(a), sb);
        if (j >= 0.6) ghostOptions.push({ a, b, score: j * 3 + sizeSimilarity(a.rect, b.rect) });
      }
    }
    ghostOptions.sort((x, y) => y.score - x.score);
    for (const { a, b } of ghostOptions) if (!pairs.has(a) && !taken.has(b)) pair(a, b, "unpainted");
  }

  // 2c. A divider drawn as a thin element of its own on one side and as a border on the
  //     other is the same line. Fold the element into the box it runs along, as that box's
  //     border, so the two are compared as what they are: one line, with a width and a
  //     colour. Done here, before a stray line can be paired with whatever sits near it, and
  //     again once the boxes that only position identifies are paired.
  const fold = (model, lines, boxes, otherOf) => {
    const absorbed = new Set();
    for (const line of lines) {
      const shape = hairlineOf(line, loose);
      if (!shape) continue;
      for (const box of boxes) {
        const side = box !== line && isBox(box) && box.rect ? runsAlong(line, shape, box) : null;
        if (!side) continue;
        const i = PAD[side];
        // The other side draws a border there and this box does not: the line is that border.
        if (strokesOf(box, tolerance).width[i] > 0 || !(strokesOf(otherOf(box), tolerance).width[i] > 0)) continue;
        const sides = (list, fallback) => SIDES.map((name, k) => list?.[k] ?? fallback);
        const width = sides(box.border?.width, 0);
        const color = sides(box.border?.color, null);
        const style = sides(box.border?.style, null);
        const taking = sides(box.box?.borderWidth, 0);
        width[i] = taking[i] = shape.thickness;
        color[i] = shape.color;
        style[i] = "solid";
        box.border = { width, color, style };
        box.box = { ...(box.box || {}), borderWidth: taking };
        box.rect = union(box.rect, line.rect);
        box.paints = true;
        if (!model.prims.includes(box)) model.prims.push(box);
        absorbed.add(line);
        break;
      }
    }
    if (absorbed.size) model.prims = model.prims.filter((node) => !absorbed.has(node));
  };
  const foldDividers = () => {
    const refOf = new Map([...pairs].map(([a, entry]) => [entry.node, a]));
    fold(ref, ref.prims.filter((node) => !pairs.has(node)), [...pairs.keys()], (box) => pairs.get(box).node);
    fold(impl, impl.prims.filter((node) => !taken.has(node)), [...refOf.keys()], (box) => refOf.get(box));
  };
  foldDividers();

  // 3. Everything left — icon tiles, dividers, icons, images, stray text — by where it sits
  //    inside the smallest already-paired box around it. Larger first, so each new pair can
  //    serve as the frame of the ones inside it.
  //    The boxes around a node are worked out once, smallest first; which of them is paired
  //    changes as pairing goes on.
  //    A box that paints nothing can be a frame too, once it is someone's counterpart.
  const around = new Map();
  const boxesBySize = new Map([ref, impl].map((model) => [model, model.spec.nodes.filter((node) => isBox(node) && model.sized(node)).sort((p, q) => area(p.rect) - area(q.rect))]));
  const frameIn = (node, model, isPaired) => {
    if (!around.has(node)) around.set(node, boxesBySize.get(model).filter((box) => box !== node && contains(box.rect, node.rect, 1)));
    return around.get(node).find(isPaired) || null;
  };
  const choose = (a, implPool, cap) => {
    const frame = frameIn(a, ref, (box) => pairs.has(box));
    const targetFrame = frame ? pairs.get(frame).node : null;
    const origin = frame ? frame.rect : ref.rootRect;
    const targetOrigin = targetFrame ? targetFrame.rect : impl.rootRect;
    let best = null;
    let apart = null;
    const thickness = Math.min(a.rect.width, a.rect.height);
    for (const b of implPool) {
      if (taken.has(b) || group(b) !== group(a)) continue;
      // A hairline is a hairline: it is never the counterpart of a box many times as thick,
      // however near the two sit.
      const other = Math.min(b.rect.width, b.rect.height);
      if (Math.min(thickness, other) <= 4 && Math.max(thickness, other) > 4 * Math.min(thickness, other)) continue;
      const its = frameIn(b, impl, (box) => taken.has(box));
      if ((its || null) === targetFrame) {
        const cost = placementCost(a.rect, origin, b.rect, targetOrigin);
        if (!best || cost < best.cost) best = { b, cost };
      }
      // It may have been pushed out of its frame: look across the surface, accept only a close fit.
      const wide = placementCost(a.rect, ref.rootRect, b.rect, impl.rootRect);
      if (!apart || wide < apart.cost) apart = { b, cost: wide };
    }
    if (best && best.cost <= cap) return best;
    return apart && apart.cost <= cap * 0.35 ? apart : null;
  };
  const byPlacement = (refList, implPool, how, cap) => {
    for (const a of refList.slice().sort((x, y) => area(y.rect) - area(x.rect))) {
      if (pairs.has(a)) continue;
      const pick = choose(a, implPool, cap);
      if (pick) pair(a, pick.b, how);
    }
  };
  const left = (kind) => ref.prims.filter((node) => !pairs.has(node) && !node.wrapper && group(node) === kind);
  for (const kind of ["box", "graphic", "shape", "text"]) byPlacement(left(kind), impl.prims, "position", 1);

  // 3b. A frame whose paint is unknown (a geometry-only reference) and that no words
  //     identified comes after everything known to paint, so it cannot take such a thing's
  //     counterpart: whatever is left where it sits, painted or not — closest fit first, and
  //     only a close fit.
  let frames = ref.prims.filter((node) => node.wrapper && !pairs.has(node));
  if (frames.length) {
    for (;;) {
      frames = frames.filter((node) => !pairs.has(node));
      const pool = [...impl.prims, ...unpainted(impl, (node) => taken.has(node))];
      const picks = frames.map((a) => ({ a, pick: choose(a, pool, 0.5) })).filter((item) => item.pick).sort((p, q) => p.pick.cost - q.pick.cost);
      if (!picks.length) break;
      pair(picks[0].a, picks[0].pick.b, picks[0].pick.b.paints ? "position" : "unpainted");
    }
  }

  foldDividers();

  // 4. What is still left of the reference's painted boxes: the element that sits there and
  //    paints nothing, if there is one.
  byPlacement(ref.prims.filter((node) => isBox(node) && !pairs.has(node) && !node.wrapper), unpainted(impl, (node) => taken.has(node)), "unpainted", 0.5);

  return {
    pairs,
    unmatchedRef: ref.prims.filter((node) => !pairs.has(node)),
    unmatchedImpl: impl.prims.filter((node) => !taken.has(node)),
  };
}

/** Hand-written specs have no rectangles to place things by; pair them by what they are called. */
function matchByName(ref, impl) {
  const pairs = new Map();
  const taken = new Set();
  const norm = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9一-鿿]+/g, " ").trim();
  const keyers = [
    (node) => (node.id ? `id:${node.id}` : null),
    (node) => (node.path ? `path:${node.path}` : null),
    (node) => (node.name ? `name:${node.kind}|${norm(node.name)}` : null),
    (node) => (node.text ? `text:${norm(node.text)}` : null),
    (node) => (node.component ? `component:${node.component}|${node.order ?? 0}` : null),
  ];
  let open = ref.spec.nodes.filter((node) => node.paints);
  for (const keyer of keyers) {
    const index = new Map();
    for (const node of impl.spec.nodes) {
      if (!node.paints || taken.has(node)) continue;
      const key = keyer(node);
      if (key) index.set(key, index.has(key) ? null : node);
    }
    open = open.filter((node) => {
      const key = keyer(node);
      const hit = key ? index.get(key) : null;
      if (!hit || taken.has(hit)) return true;
      pairs.set(node, { node: hit, how: "name" });
      taken.add(hit);
      return false;
    });
  }
  return { pairs, unmatchedRef: open, unmatchedImpl: impl.spec.nodes.filter((node) => node.paints && !taken.has(node)) };
}

/* -------------------------------------------------------- visible properties */

function fontRelation(a, b, aliases) {
  const norm = (v) => String(v || "").toLowerCase().trim();
  if (norm(a) === norm(b)) return "same";
  return (aliases || []).some((set) => set.map(norm).includes(norm(a)) && set.map(norm).includes(norm(b))) ? "alias" : "different";
}

function remapFor(context, field) {
  const family = /^border|outline/.test(field) && /color$/.test(field) ? "border.color" : /background|gradient/.test(field) ? "background" : "fill";
  return context.remaps.filter((remap) => !Array.isArray(remap.fields) || !remap.fields.length || remap.fields.includes(family) || remap.fields.includes(field));
}

/** Differences in what a primitive looks like, independent of where it is. */
function compareAppearance(a, b, context) {
  const T = context.T;
  const out = [];
  const add = (field, expected, actual, label, extra = {}) => out.push({ field, expected, actual, label, ...extra });
  const number = (field, x, y, label) => {
    if (Math.abs(num(x) - num(y)) > T.value) add(field, x ?? 0, y ?? 0, `${label} ${fmt(x ?? 0)}px → ${fmt(y ?? 0)}px`, { numeric: true });
  };
  // Colours pass through the accessibility remaps: a recorded replacement is the sanctioned
  // state, and matching the authored value it replaces is the defect.
  const remapVerdict = (field, x, y) => {
    const remaps = remapFor(context, field);
    if (sameColor(x, y, T)) {
      const copied = x != null && remaps.find((remap) => !sameColor(remap.authored, remap.accessible, T) && sameColor(x, remap.authored, T));
      return copied ? { text: `is the authored ${toHexColor(x)} — the recorded accessible value ${copied.accessible} was not applied`, extra: { intent: "required-adaptation", remap: copied, colour: true } } : null;
    }
    const sanctioned = remaps.find((remap) => sameColor(x, remap.authored, T) && sameColor(y, remap.accessible, T));
    if (sanctioned) return { text: `${x} → ${y} is the recorded accessibility remap`, extra: { intent: "required-adaptation", satisfied: true, remap: sanctioned, colour: true } };
    return { text: `${x ?? "none"} → ${y ?? "none"}`, extra: { colour: true } };
  };
  const colour = (field, x, y, label) => {
    const verdict = remapVerdict(field, x, y);
    if (verdict) add(field, x ?? "none", y ?? "none", `${label} ${verdict.text}`, verdict.extra);
  };
  const adaptiveAcrossEngines = (field) => (!context.sameEngine && context.policy.crossEngineAdaptive.includes(field) ? "adaptation" : "drift");

  if (a.kind === "text" && b.kind === "text") {
    const ta = a.type || {};
    const tb = b.type || {};
    if (renderedText(a) !== renderedText(b)) {
      const sameWords = String(a.text).trim() === String(b.text).trim();
      if (sameWords) add("type.transform", ta.transform || "none", tb.transform || "none", `text-transform ${ta.transform || "none"} → ${tb.transform || "none"} (reads "${renderedText(a)}" → "${renderedText(b)}")`, { structural: true });
      else add("text", renderedText(a), renderedText(b), `text "${renderedText(a)}" → "${renderedText(b)}"`, { text: true });
    }
    if (ta.family !== undefined && tb.family !== undefined) {
      const family = fontRelation(ta.family, tb.family, context.policy.fontAliases);
      if (family !== "same") add("type.family", ta.family, tb.family, `font ${ta.family} → ${tb.family}`, { intent: family === "alias" ? "adaptation" : "drift" });
    }
    if (ta.size !== undefined && tb.size !== undefined) number("type.size", ta.size, tb.size, "font size");
    // Written relative to the font size (1.5, 0.06em), a metric changes with it and is not a
    // difference of its own.
    const resized = Math.abs(num(ta.size) - num(tb.size)) > T.value;
    const scales = (x, y) => resized && num(ta.size) > 0 && num(tb.size) > 0 && Math.abs(x / ta.size - y / tb.size) <= 0.005;
    if (ta.weight !== undefined && tb.weight !== undefined && num(ta.weight) !== num(tb.weight)) add("type.weight", ta.weight, tb.weight, `font weight ${ta.weight} → ${tb.weight}`);
    if (ta.lineHeight != null && tb.lineHeight != null && Math.abs(ta.lineHeight - tb.lineHeight) > T.value) {
      const note = tb.lineHeightSet === false ? " (not set in the implementation — the engine default applies)" : "";
      add("type.lineHeight", ta.lineHeight, tb.lineHeight, `line height ${fmt(ta.lineHeight)}px → ${fmt(tb.lineHeight)}px${note}`, { intent: adaptiveAcrossEngines("type.lineHeight"), numeric: true, derived: scales(ta.lineHeight, tb.lineHeight) });
    }
    if (ta.letterSpacing != null && tb.letterSpacing != null && Math.abs(ta.letterSpacing - tb.letterSpacing) > T.letterSpacing) {
      add("type.letterSpacing", ta.letterSpacing, tb.letterSpacing, `letter spacing ${fmt(ta.letterSpacing)}px → ${fmt(tb.letterSpacing)}px`, { intent: adaptiveAcrossEngines("type.letterSpacing"), numeric: true, derived: scales(ta.letterSpacing, tb.letterSpacing) });
    }
    if (ta.decoration !== undefined && tb.decoration !== undefined && (ta.decoration || "none") !== (tb.decoration || "none")) add("type.decoration", ta.decoration, tb.decoration, `text decoration ${ta.decoration || "none"} → ${tb.decoration || "none"}`);
    if (ta.style !== undefined && tb.style !== undefined && (ta.style || "normal") !== (tb.style || "normal")) add("type.style", ta.style, tb.style, `font style ${ta.style} → ${tb.style}`);
    // Text that should have been cut short and was not wraps instead: that is one difference.
    const cutDiffers = ta.lines !== undefined && tb.lines !== undefined && Boolean(ta.truncated) !== Boolean(tb.truncated);
    if (num(ta.lines) && num(tb.lines) && ta.lines !== tb.lines && !cutDiffers) add("type.lines", ta.lines, tb.lines, `wraps to ${tb.lines} line${tb.lines > 1 ? "s" : ""}, reference has ${ta.lines}`, { structural: true });
    if (cutDiffers) add("type.truncated", Boolean(ta.truncated), Boolean(tb.truncated), ta.truncated ? `should truncate with … but does not${ta.lines !== tb.lines ? ` (${tb.lines} lines, reference has ${ta.lines})` : ""}` : `is truncated; the reference shows it in full${ta.lines !== tb.lines ? ` (${ta.lines} lines)` : ""}`, { structural: true });
    if (a.fill !== undefined && b.fill !== undefined) colour("fill", a.fill, b.fill, a.role === "placeholder" && b.role === "placeholder" ? "placeholder colour" : "text colour");
    if (!sameShadows(a.textShadow, b.textShadow, T) && !(!context.sameEngine && context.policy.crossEngineIgnored.includes("shadow"))) add("textShadow", shadowText(a.textShadow), shadowText(b.textShadow), `text shadow ${shadowText(a.textShadow)} → ${shadowText(b.textShadow)}`);
    if (ta.numeric !== undefined && tb.numeric !== undefined && ta.numeric !== tb.numeric) add("type.numeric", ta.numeric, tb.numeric, `numeric figures ${ta.numeric} → ${tb.numeric}`);
    // Runs inside the block that are styled on their own: a bold word, a coloured figure.
    if (context.sameTool && JSON.stringify(a.segments || []) !== JSON.stringify(b.segments || [])) add("segments", JSON.stringify(a.segments || []), JSON.stringify(b.segments || []), "inline styling inside the text differs (a bold, coloured, or resized run)");
  }

  if (isBox(a) && isBox(b)) {
    colour("background", a.background, b.background, "fill");
    if (!sameGradient(a.gradient, b.gradient, T, { shapes: context.sameTool })) add("gradient", a.gradient ?? "none", b.gradient ?? "none", `gradient ${a.gradient ?? "none"} → ${b.gradient ?? "none"}`);

    const sa = strokesOf(a, T);
    const sb = strokesOf(b, T);
    const borders = SIDES.map((side, i) => {
      const wa = sa.width[i];
      const wb = sb.width[i];
      if (Math.abs(wa - wb) > T.value) {
        if (wb === 0) return { field: "width", expected: wa, actual: 0, text: `border is missing (${fmt(wa)}px ${sa.color[i]})`, structural: true };
        if (wa === 0) return { field: "width", expected: 0, actual: wb, text: `border is not in the reference (${fmt(wb)}px ${sb.color[i]})`, structural: true };
        return { field: "width", expected: wa, actual: wb, text: `border width ${fmt(wa)}px → ${fmt(wb)}px`, numeric: true };
      }
      const verdict = wa > 0 ? remapVerdict("border.color", sa.color[i], sb.color[i]) : null;
      if (verdict) return { field: "color", expected: sa.color[i], actual: sb.color[i], text: `border colour ${verdict.text}`, ...verdict.extra };
      if (wa > 0 && sa.style[i] !== sb.style[i]) return { field: "style", expected: sa.style[i], actual: sb.style[i], text: `border style ${sa.style[i]} → ${sb.style[i]}` };
      return null;
    });
    const flags = (item) => ({ structural: item.structural, numeric: item.numeric, colour: item.colour, intent: item.intent, satisfied: item.satisfied, remap: item.remap });
    if (borders.every(Boolean) && new Set(borders.map((item) => item.text)).size === 1) add(`border.${borders[0].field}`, borders[0].expected, borders[0].actual, borders[0].text, flags(borders[0]));
    else borders.forEach((item, i) => item && add(`border.${SIDES[i]}.${item.field}`, item.expected, item.actual, `${SIDES[i]} ${item.text}`, flags(item)));

    const ringText = (rings) => rings.map((ring) => `${fmt(ring.width)}px ${ring.style === "solid" ? "" : `${ring.style} `}${ring.color}${ring.offset ? ` offset ${fmt(ring.offset)}px` : ""}`).join(" + ") || "none";
    const sameRings = sa.outside.length === sb.outside.length && sa.outside.every((ring, i) => Math.abs(ring.width - sb.outside[i].width) <= T.value && Math.abs(ring.offset - sb.outside[i].offset) <= T.value && ring.style === sb.outside[i].style && sameColor(ring.color, sb.outside[i].color, T));
    if (!sameRings) add("outline", ringText(sa.outside), ringText(sb.outside), `outer ring ${ringText(sa.outside)} → ${ringText(sb.outside)}`);
    if (!sameShadows(sa.shadows, sb.shadows, T) && !(!context.sameEngine && context.policy.crossEngineIgnored.includes("shadow"))) {
      add("shadow", shadowText(sa.shadows), shadowText(sb.shadows), `shadow ${shadowText(sa.shadows)} → ${shadowText(sb.shadows)}`);
    }

    if (a.kind === "input" && b.kind === "input") {
      const pa = a.placeholder || {};
      const pb = b.placeholder || {};
      // While both controls are empty their placeholders are on screen, and are compared as
      // the text primitives they are; here only a placeholder that is not showing is checked.
      const onScreen = a.shows === "placeholder" && b.shows === "placeholder";
      if (!onScreen && (pa.text || "") !== (pb.text || "")) add("placeholder.text", pa.text, pb.text, `placeholder "${pa.text}" → "${pb.text}"`, { text: true });
      else if (!onScreen && pa.text) colour("placeholder.color", pa.color, pb.color, "placeholder colour");
      number("type.size", a.type?.size, b.type?.size, "font size");
      if (num(a.type?.weight) !== num(b.type?.weight)) add("type.weight", a.type?.weight, b.type?.weight, `font weight ${a.type?.weight} → ${b.type?.weight}`);
      colour("fill", a.fill, b.fill, "text colour");
    }

    // What the element draws through ::before / ::after — dots, underlines, thumbs.
    for (const which of ["before", "after"]) {
      const pa = a.pseudo?.[which];
      const pb = b.pseudo?.[which];
      if (!pa && !pb) continue;
      const name = `::${which}`;
      if (!pa || !pb) {
        add(`pseudo.${which}`, pa ? "present" : "none", pb ? "present" : "none", pa ? `${name} decoration is missing` : `${name} decoration is not in the reference`, { structural: true });
        continue;
      }
      const item = (field, x, y, text, extra) => add(`pseudo.${which}.${field}`, x, y, `${name} ${text}`, extra);
      if ((pa.content || "") !== (pb.content || "")) item("content", pa.content, pb.content, `content "${pa.content}" → "${pb.content}"`, { text: true });
      if (Math.abs(pa.width - pb.width) > T.value || Math.abs(pa.height - pb.height) > T.value) item("size", `${fmt(pa.width)}×${fmt(pa.height)}`, `${fmt(pb.width)}×${fmt(pb.height)}`, `size ${fmt(pa.width)}×${fmt(pa.height)}px → ${fmt(pb.width)}×${fmt(pb.height)}px`);
      if (!sameColor(pa.background, pb.background, T)) item("background", pa.background ?? "none", pb.background ?? "none", `fill ${pa.background ?? "none"} → ${pb.background ?? "none"}`, { colour: true });
      if (!sameGradient(pa.gradient, pb.gradient, T, { shapes: context.sameTool })) item("gradient", pa.gradient ?? "none", pb.gradient ?? "none", `gradient ${pa.gradient ?? "none"} → ${pb.gradient ?? "none"}`);
      if (pa.content && !sameColor(pa.color, pb.color, T)) item("color", pa.color, pb.color, `colour ${pa.color} → ${pb.color}`, { colour: true });
      if (String(pa.radius ?? 0) !== String(pb.radius ?? 0)) item("radius", pa.radius ?? 0, pb.radius ?? 0, `radius ${pa.radius ?? 0} → ${pb.radius ?? 0}`);
      if (!sameShadows(pa.shadow, pb.shadow, T)) item("shadow", shadowText(pa.shadow), shadowText(pb.shadow), `shadow ${shadowText(pa.shadow)} → ${shadowText(pb.shadow)}`);
      if (JSON.stringify(pa.border || null) !== JSON.stringify(pb.border || null)) item("border", JSON.stringify(pa.border || null), JSON.stringify(pb.border || null), "border differs");
      if (Math.abs((pa.opacity ?? 1) - (pb.opacity ?? 1)) > T.opacity) item("opacity", pa.opacity ?? 1, pb.opacity ?? 1, `opacity ${pa.opacity ?? 1} → ${pb.opacity ?? 1}`);
      if (pa.inset && pb.inset) {
        // A decoration is pinned to one edge of its host, or centred in it. It has moved only
        // when neither still holds — otherwise it is just following a host that changed size.
        const movedAlong = (i, j) => {
          if ([pa.inset[i], pa.inset[j], pb.inset[i], pb.inset[j]].some((value) => value === null)) return null;
          if (Math.abs(pb.inset[i] - pa.inset[i]) <= T.value || Math.abs(pb.inset[j] - pa.inset[j]) <= T.value) return null;
          if (Math.abs(pa.inset[i] - pa.inset[j]) <= 1 && Math.abs(pb.inset[i] - pb.inset[j]) <= 1) return null;
          const near = pa.inset[i] <= pa.inset[j] ? i : j;
          return `${SIDES[near]} ${fmt(pa.inset[near])}px → ${fmt(pb.inset[near])}px`;
        };
        const moved = [movedAlong(3, 1), movedAlong(0, 2)].filter(Boolean);
        if (moved.length) item("position", pa.inset.join(","), pb.inset.join(","), `offset ${moved.join(", ")}`);
      }
      if ((pa.transform || "none") !== (pb.transform || "none")) item("transform", pa.transform || "none", pb.transform || "none", "transform differs");
    }
  }

  if (KIND_GROUP[a.kind] !== "text") {
    const radii = CORNERS.map((corner, i) => [num(a.radius?.[i]), num(b.radius?.[i])]);
    // Fully rounded is fully rounded, whatever number produces it. Without a measured box,
    // only an obviously oversized radius can be told to mean that.
    const full = (node, r) => (node.rect ? r >= Math.min(node.rect.width, node.rect.height) / 2 - 0.5 : r >= 999);
    const off = radii.map(([x, y]) => Math.abs(x - y) > T.value && !(full(a, x) && full(b, y)));
    if (off.every(Boolean) && new Set(radii.map((pair) => pair.join(">"))).size === 1) add("radius", radii[0][0], radii[0][1], `corner radius ${fmt(radii[0][0])}px → ${fmt(radii[0][1])}px`, { numeric: true });
    else radii.forEach(([x, y], i) => off[i] && add(`radius.${CORNERS[i]}`, x, y, `${CORNERS[i]} radius ${fmt(x)}px → ${fmt(y)}px`, { numeric: true }));
    for (const field of ["filter", "backdropFilter", "blend"]) {
      if ((a[field] || "none") !== (b[field] || "none")) add(field, a[field] || "none", b[field] || "none", `${field} ${a[field] || "none"} → ${b[field] || "none"}`);
    }
    // A transform is written as a matrix on the web and as a rotation in a design tool.
    if (context.sameTool && (a.transform || "none") !== (b.transform || "none")) add("transform", a.transform || "none", b.transform || "none", `transform ${a.transform || "none"} → ${b.transform || "none"}`);
  }

  if (a.icon && b.icon) {
    if (a.icon.signature && b.icon.signature && a.icon.signature !== b.icon.signature) add("icon.artwork", a.icon.signature, b.icon.signature, "icon artwork differs — not the same glyph", { structural: true });
    number("icon.strokeWidth", a.icon.strokeWidth, b.icon.strokeWidth, "icon stroke");
    colour("icon.stroke", a.icon.stroke, b.icon.stroke, "icon colour");
    colour("icon.fill", a.icon.fill, b.icon.fill, "icon fill");
  }
  // A design tool names an image by a hash, a build by a file: only like can be compared with like.
  const comparableAssets = a.asset && b.asset && /^figma:/.test(a.asset) === /^figma:/.test(b.asset);
  if (a.image && b.image) {
    if (comparableAssets && a.asset !== b.asset) add("asset", a.asset, b.asset, `image ${a.asset} → ${b.asset}`, { structural: true });
    if ((a.image.fit || "fill") !== (b.image.fit || "fill")) add("image.fit", a.image.fit, b.image.fit, `image fit ${a.image.fit} → ${b.image.fit}`);
    if (context.sameTool && a.image.position && b.image.position && a.image.position !== b.image.position) add("image.position", a.image.position, b.image.position, `image position ${a.image.position} → ${b.image.position}`);
  } else if (comparableAssets && a.asset !== b.asset) add("asset", a.asset, b.asset, `asset ${a.asset} → ${b.asset}`, { structural: true });

  const oa = a.opacityEffective ?? a.opacity ?? 1;
  const ob = b.opacityEffective ?? b.opacity ?? 1;
  if (Math.abs(oa - ob) > T.opacity) add("opacity", oa, ob, `opacity ${fmt(oa)} → ${fmt(ob)}`);

  // Interaction states: every state the reference defines must exist and look the same. A
  // touch surface has no hover and a pointer surface has no pressed, so those are not asked for.
  const states = context.policy.statePolicy || {};
  const notExpected = new Set(context.implementationIsTouch ? states.pointerOnlyStates || [] : states.touchOnlyStates || []);
  for (const [state, expected] of Object.entries(a.states || {})) {
    if (notExpected.has(state)) continue;
    const actual = b.states?.[state];
    if (!actual) {
      add(`states.${state}`, JSON.stringify(expected), "missing", `${state} state is missing`, { structural: true });
      continue;
    }
    for (const [prop, value] of Object.entries(expected)) {
      const now = actual[prop] ?? "unchanged";
      const same = typeof value === "string" ? sameColor(value, now, T) : JSON.stringify(value) === JSON.stringify(now);
      const show = (v) => (typeof v === "string" ? toHexColor(v) : JSON.stringify(v));
      if (!same) add(`states.${state}.${prop}`, show(value), show(now), `${state} ${prop} ${show(value)} → ${show(now)}`, { colour: typeof value === "string" });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ redlines */

const AXIS = {
  top: { start: (r) => r.y, end: bottom, overlap: (a, b) => Math.min(right(a), right(b)) - Math.max(a.x, b.x), opposite: "bottom", sign: 1 },
  bottom: { start: bottom, end: (r) => r.y, overlap: (a, b) => Math.min(right(a), right(b)) - Math.max(a.x, b.x), opposite: "top", sign: -1 },
  left: { start: (r) => r.x, end: right, overlap: (a, b) => Math.min(bottom(a), bottom(b)) - Math.max(a.y, b.y), opposite: "right", sign: 1 },
  right: { start: right, end: (r) => r.x, overlap: (a, b) => Math.min(bottom(a), bottom(b)) - Math.max(a.y, b.y), opposite: "left", sign: -1 },
};

/**
 * The redline for one side of `node`: the nearest sibling in that direction, or `null` for
 * the edge of the frame. Decided on the reference, so both sides measure the same two edges.
 */
function neighbourOn(side, node, siblings) {
  const axis = AXIS[side];
  const edge = axis.start(node.rect);
  let best = null;
  for (const other of siblings) {
    if (other === node || axis.overlap(other.rect, node.rect) <= 0.5) continue;
    const gap = (edge - axis.end(other.rect)) * axis.sign;
    if (gap < -0.5) continue;
    if (!best || gap < best.gap) best = { other, gap };
  }
  return best ? best.other : null;
}

function distance(side, rect, towards, isFrame) {
  const axis = AXIS[side];
  return round((axis.start(rect) - (isFrame ? axis.start(towards) : axis.end(towards))) * axis.sign);
}

/* ---------------------------------------- declared spacing (the explanation) */

function ancestors(model, node) {
  const chain = [];
  for (let current = node; current; current = current.parent ? model.byId.get(current.parent) : null) chain.push(current);
  return chain;
}

/**
 * How far the source says `node`'s edge sits from an ancestor's same edge: the padding and
 * border of every element in between plus the margins on the way. A positioned element on
 * the way answers for itself: pinned to that side it is placed explicitly, otherwise the
 * distance is not something the source declares (`null`).
 */
function climb(model, node, stop, side, parts, measured) {
  let total = 0;
  let current = node;
  while (current && current !== stop) {
    if (current.layout?.positioned) {
      if (!(current.layout.pinned || []).includes(side)) return null;
      // Pinned to this side: the offset the source wrote is the declaration. It is measured
      // from the element's containing block, which need not be the frame the redline uses.
      const offset = current.layout.inset?.[side];
      parts.length = 0;
      parts.push({ node: current, prop: `offset-${side}`, value: typeof offset === "number" ? offset : measured, pinned: true });
      return measured;
    }
    const parent = current.parent ? model.byId.get(current.parent) : null;
    if (!parent) return null;
    const add = (owner, prop, value) => {
      if (!value) return;
      total += value;
      parts.push({ node: owner, prop, value });
    };
    if (current.box?.marginAuto?.[PAD[side]]) return null; // an auto margin is leftover space
    if (current.tag !== "#text") add(current, `margin-${side}`, num(current.box?.margin?.[PAD[side]]));
    add(parent, `padding-${side}`, num(parent.box?.padding?.[PAD[side]]));
    add(parent, `border-${side}`, num(parent.box?.borderWidth?.[PAD[side]]));
    current = parent;
  }
  return current === stop ? total : null;
}

/** The spacing the source declares between a primitive's edge and its redline target. */
function declaredSpacing(model, node, side, neighbour, frame, measured) {
  const parts = [];
  if (!neighbour) {
    const total = climb(model, node, frame || model.root, side, parts, measured);
    return total === null ? null : { total, parts };
  }
  const chainB = new Set(ancestors(model, neighbour));
  const lca = ancestors(model, node).find((candidate) => chainB.has(candidate));
  if (!lca || lca === node || lca === neighbour) return null;
  const childOfLca = (start) => {
    let current = start;
    while (current.parent && model.byId.get(current.parent) !== lca) current = model.byId.get(current.parent);
    return current;
  };
  const aTop = childOfLca(node);
  const bTop = childOfLca(neighbour);
  if (aTop === bTop || aTop.layout?.positioned || bTop.layout?.positioned) return null;
  if (ancestors(model, node).some((item) => item !== lca && item.layout?.positioned && ancestors(model, item).includes(lca))) return null;
  if (ancestors(model, neighbour).some((item) => item !== lca && item.layout?.positioned && ancestors(model, item).includes(lca))) return null;

  const opposite = AXIS[side].opposite;
  const upA = climb(model, node, aTop, side, parts, measured);
  const upB = climb(model, neighbour, bTop, opposite, parts, measured);
  if (upA === null || upB === null) return null;

  const mode = lca.layout?.mode;
  const alongMain = (mode === "column" && vertical(side)) || (mode === "row" && !vertical(side)) || mode === "grid";
  // Between the rows of a grid, or the lines of a row or column that wraps, the gap is the
  // one across the main axis.
  const across = (mode === "grid" && vertical(side)) || (mode === "row" && vertical(side) && lca.layout.wrap) || (mode === "column" && !vertical(side) && lca.layout.wrap);

  // Only adjacent items have a gap of their own; anything in between is content, not spacing.
  // (Across the main axis the item above or below is a line of items away: there the caller's
  // check that the declared total equals the measured distance is what tells.)
  const items = model.spec.nodes.filter((item) => item.parent === lca.id && model.sized(item) && !item.layout?.positioned);
  if (!across && Math.abs(items.indexOf(aTop) - items.indexOf(bTop)) !== 1) return null;

  if (aTop.box?.marginAuto?.[PAD[side]] || bTop.box?.marginAuto?.[PAD[opposite]]) return null; // an auto margin is leftover space
  const marginA = aTop.tag === "#text" ? 0 : num(aTop.box?.margin?.[PAD[side]]);
  const marginB = bTop.tag === "#text" ? 0 : num(bTop.box?.margin?.[PAD[opposite]]);
  let between;
  if (across) {
    between = num(lca.layout.crossGap) + marginA + marginB;
    if (num(lca.layout.crossGap)) parts.push({ node: lca, prop: mode === "column" ? "column-gap" : "row-gap", value: num(lca.layout.crossGap) });
  } else if (alongMain) {
    between = num(lca.layout.gap) + marginA + marginB;
    if (num(lca.layout.gap)) parts.push({ node: lca, prop: "gap", value: num(lca.layout.gap) });
  } else if (mode === "flow" && vertical(side)) between = Math.max(marginA, marginB); // adjoining block margins collapse
  else return null;
  if (marginA) parts.push({ node: aTop, prop: `margin-${side}`, value: marginA });
  if (marginB) parts.push({ node: bTop, prop: `margin-${opposite}`, value: marginB });
  return { total: upA + upB + between, parts };
}

const partKey = (part) => `${leaf(part.node)} ${part.prop}`;
const describeParts = (parts) => parts.map((part) => `${partKey(part)} ${fmt(part.value)}`);

/**
 * "td padding-left 16 → 12": the parts that are not the same on both sides, and where each
 * lives. Parts that agree cancel out one for one, so two nested elements with the same name
 * cannot hide each other.
 */
export function partsThatDiffer(designed, built) {
  if (!designed || !built) return null;
  const left = [...built];
  const unmatched = [];
  for (const part of designed) {
    const at = left.findIndex((item) => partKey(item) === partKey(part) && Math.abs(item.value - part.value) <= 0.01);
    if (at >= 0) left.splice(at, 1);
    else unmatched.push(part);
  }
  const out = [];
  for (const part of unmatched) {
    const at = left.findIndex((item) => partKey(item) === partKey(part));
    const twin = at >= 0 ? left.splice(at, 1)[0] : null;
    out.push({ text: `${partKey(part)} ${fmt(part.value)} → ${fmt(twin ? twin.value : 0)}`, selector: (twin || part).node.selector || null, design: part.value, build: twin ? twin.value : 0 });
  }
  for (const part of left) out.push({ text: `${partKey(part)} 0 → ${fmt(part.value)}`, selector: part.node.selector || null, design: 0, build: part.value });
  return out.length ? out : null;
}

/* --------------------------------------------------------------------- diff */

function buildContext(refSpec, implSpec, policy, remapsFromFile) {
  const engines = policy.engines || {};
  const engineOf = (platform) => engines[platform] || "native";
  const referencePlatform = refSpec.surface?.platform || "unknown";
  const implementationPlatform = implSpec.surface?.platform || "unknown";
  const wa = refSpec.surface?.root?.width || refSpec.surface?.viewport?.width;
  const wb = implSpec.surface?.root?.width || implSpec.surface?.viewport?.width;
  const fonts = [refSpec.surface?.fonts, implSpec.surface?.fonts];
  const fromFile = Array.isArray(remapsFromFile) ? remapsFromFile : remapsFromFile?.accessibilityRemaps || [];
  return {
    policy,
    T: policy.tolerance,
    referencePlatform,
    implementationPlatform,
    sameEngine: engineOf(referencePlatform) === engineOf(implementationPlatform),
    sameTool: referencePlatform === implementationPlatform,
    sameFormFactor: !wa || !wb || Math.abs(wa - wb) / Math.max(wa, wb) <= (policy.formFactor?.sameViewportToleranceRatio ?? 0.15),
    implementationIsTouch: (policy.statePolicy?.touchOnlyPlatforms || []).includes(implementationPlatform),
    minTouchTarget: policy.touchTargets?.[implementationPlatform] ?? null,
    remaps: [...fromFile, ...(refSpec.accessibilityRemaps || []), ...(implSpec.accessibilityRemaps || [])].filter((remap) => remap && remap.authored && remap.accessible),
    // One side declaring a mismatch poisons every text metric in the comparison.
    fontEnvironment: fonts.some((item) => item && item.aligned === false) ? "mismatched" : fonts.every((item) => item && item.aligned === true) ? "aligned" : "unknown",
    estimated: refSpec.surface?.fidelity === "estimated" || implSpec.surface?.fidelity === "estimated",
    geometryOnly: refSpec.surface?.fidelity === "geometry-only" || implSpec.surface?.fidelity === "geometry-only",
  };
}

const FONT_SENSITIVE = new Set(["type.size", "type.lineHeight", "type.letterSpacing", "type.lines", "type.truncated"]);

/** When a design tool fixes a text box's width or height, only its anchor says where the words are. */
function anchorText(a, b) {
  const fit = (fixed, loose) => {
    const rect = { ...fixed.rect };
    if (fixed.textBox?.fixedWidth && !loose.textBox?.fixedWidth) {
      const align = fixed.type?.align || "left";
      rect.x = align === "center" ? fixed.rect.x + (fixed.rect.width - loose.rect.width) / 2 : align === "right" ? right(fixed.rect) - loose.rect.width : fixed.rect.x;
      rect.width = loose.rect.width;
    }
    if (fixed.textBox?.fixedHeight && !loose.textBox?.fixedHeight) {
      const align = fixed.textBox.alignVertical || "top";
      rect.y = align === "center" ? fixed.rect.y + (fixed.rect.height - loose.rect.height) / 2 : align === "bottom" ? bottom(fixed.rect) - loose.rect.height : fixed.rect.y;
      rect.height = loose.rect.height;
    }
    return rect;
  };
  if (a.textBox && (a.textBox.fixedWidth || a.textBox.fixedHeight)) a.rect = fit(a, b);
  else if (b.textBox && (b.textBox.fixedWidth || b.textBox.fixedHeight)) b.rect = fit(b, a);
}

export function diffSpecs(refSpec, implSpec, { map = [], policy = loadPolicy(), remaps = null, ignore = [] } = {}) {
  const ref = loadModel(refSpec);
  const impl = loadModel(implSpec);
  const context = buildContext(refSpec, implSpec, policy, remaps);
  const T = context.T;
  const skipped = [...prune(ref, policy), ...prune(impl, policy)];
  const partial = ref.partial || impl.partial;

  // Areas the caller excluded (content that is not expected to match) take no part at all.
  const excluded = (node) => node.rect && ignore.some((area) => cx(node.rect) >= area.x && cx(node.rect) <= area.x + area.width && cy(node.rect) >= area.y && cy(node.rect) <= area.y + area.height);
  if (ignore.length) for (const model of [ref, impl]) model.prims = model.prims.filter((node) => !excluded(node));

  const { pairs, unmatchedRef, unmatchedImpl } = partial ? matchByName(ref, impl) : matchPrimitives(ref, impl, map, { loose: context.geometryOnly, tolerance: T });
  const counterpart = (node) => pairs.get(node).node;
  const label = (node) => (node.kind === "text" ? `"${node.name}"` : leaf(node));
  let findings = [];
  const push = (finding) => {
    const entry = { status: "open", intent: "drift", ...finding };
    findings.push(entry);
    return entry;
  };

  if (!partial) for (const [a, { node: b }] of pairs) if (a.kind === "text" && b.kind === "text") anchorText(a, b);

  // Frames: the smallest paired painted box around each reference primitive. A pair made by
  // an explicit key can lack a rectangle on one side; it is compared by look and placed by nothing.
  const placeable = (node) => Boolean(node.rect && counterpart(node).rect);
  const pairedBoxes = partial ? [] : [...pairs.keys()].filter((node) => isBox(node) && node.paints && placeable(node));
  const frames = new Map();
  const members = new Map();
  for (const node of pairs.keys()) {
    if (!placeable(node)) continue;
    let frame = null;
    for (const box of pairedBoxes) {
      if (box === node || !contains(box.rect, node.rect, 1) || area(box.rect) < area(node.rect) + 1) continue;
      if (!frame || area(box.rect) < area(frame.rect)) frame = box;
    }
    frames.set(node, frame);
    if (!members.has(frame)) members.set(frame, []);
    members.get(frame).push(node);
  }

  let geometryPass = 0;
  let appearancePass = 0;
  const anchored = new Set(); // "<reference id>|<axis>": the primitive has a declared redline on that axis
  const placed = new Map(); // reference node → sits where the reference has it
  const resized = { x: new Map(), y: new Map() }; // reference node → its size finding

  for (const [a, { node: b, how }] of pairs) {
    const base = { block: label(a), reference: a.id, implementation: b.id, selector: b.selector, leaf: leaf(b), y: a.rect?.y ?? 0, textual: a.kind === "text", component: b.component || a.component || null };

    // --- how it looks (a geometry-only spec says nothing about looks)
    const appearance = context.geometryOnly ? [] : compareAppearance(a, b, context);
    if (!appearance.some((item) => (item.intent || "drift") === "drift" || (item.intent === "required-adaptation" && !item.satisfied))) appearancePass += 1;
    for (const item of appearance) {
      push({ ...base, gate: "appearance", specField: item.field, intent: item.intent || "drift", expected: item.expected, actual: item.actual, delta: [item.label], tokens: tokenFor(a, b, item.field), satisfied: item.satisfied, remap: item.remap, derived: Boolean(item.derived), flags: item });
    }

    // --- required adaptation: a control smaller than the platform's minimum touch target
    if (context.implementationIsTouch && context.minTouchTarget && b.interactive) {
      const sides = [b.rect?.width ?? b.box?.width, b.rect?.height ?? b.box?.height].filter((value) => typeof value === "number");
      const smallest = sides.length ? Math.min(...sides) : null;
      if (smallest !== null && smallest < context.minTouchTarget) {
        push({ ...base, gate: "appearance", specField: "touchTarget", intent: "required-adaptation", expected: `at least ${context.minTouchTarget} on both axes`, actual: sides.map(fmt).join("×"), delta: [`touch target ${fmt(smallest)} is under the ${context.implementationPlatform} minimum of ${context.minTouchTarget}`], tokens: [] });
      }
    }

    if (partial || !a.rect || !b.rect) continue;

    // --- how big it is
    const dw = b.rect.width - a.rect.width;
    const dh = b.rect.height - a.rect.height;
    const widthTol = a.kind === "text" ? Math.max(T.textWidth, a.rect.width * T.textWidthRatio) : T.geometry;
    const inPlace = Math.abs(b.rect.x - a.rect.x) <= T.geometry && Math.abs(b.rect.y - a.rect.y) <= T.geometry && Math.abs(dw) <= widthTol && Math.abs(dh) <= T.geometry;
    placed.set(a, inPlace);
    if (inPlace) geometryPass += 1;

    const explained = new Set(appearance.map((item) => item.field));
    // A size limit belongs to the element; for a run of text, to the element that holds it.
    const limitsA = (a.kind === "text" ? ref.byId.get(a.parent) : a)?.box || {};
    const limitsB = (b.kind === "text" ? impl.byId.get(b.parent) : b)?.box || {};
    const sizeFinding = (axis, word, before, after, change, causes) => {
      const fixed = Boolean(a.box?.fixed?.[word] || b.box?.fixed?.[word]);
      const byLook = a.kind === "text" && causes.some((field) => explained.has(field));
      // A minimum or maximum that differs is a declaration, and explains the size by itself.
      const limit = ["min", "max"]
        .map((bound) => ({ prop: `${bound}-${word}`, expected: limitsA[`${bound}${word[0].toUpperCase()}${word.slice(1)}`] ?? "none", actual: limitsB[`${bound}${word[0].toUpperCase()}${word.slice(1)}`] ?? "none" }))
        .find((item) => String(item.expected) !== String(item.actual) && context.sameTool);
      const px = (value) => (typeof value === "number" ? `${fmt(value)}px` : value);
      const entry = push({
        ...base,
        gate: "geometry",
        specField: `size.${word}`,
        axis,
        expected: round(before),
        actual: round(after),
        delta: [`${word} ${fmt(before)}px → ${fmt(after)}px (${signed(change)})${limit ? ` — ${limit.prop} ${px(limit.expected)} → ${px(limit.actual)}` : fixed ? " — set explicitly" : ""}`],
        // A text block is as big as its words and type make it; a box with no explicit size
        // is as big as its content or its container make it. Neither is a cause by itself.
        derived: byLook && !limit,
        follows: isBox(a) && !fixed && !limit,
        explicit: fixed || Boolean(limit),
        limit: limit || null,
        node: a,
        tokens: tokenFor(a, b, limit ? `${limit.prop.split("-")[0]}${word[0].toUpperCase()}${word.slice(1)}` : word),
      });
      resized[axis].set(a, entry);
    };
    if (Math.abs(dw) > widthTol) sizeFinding("x", "width", a.rect.width, b.rect.width, dw, ["text", "type.transform", "type.size", "type.weight", "type.letterSpacing", "type.family", "type.lines", "type.truncated"]);
    if (Math.abs(dh) > T.geometry) sizeFinding("y", "height", a.rect.height, b.rect.height, dh, ["type.lineHeight", "type.lines", "type.size", "type.truncated"]);

    // --- where it is: one redline per side
    const frame = frames.get(a);
    const siblings = members.get(frame);
    const frameRect = frame ? frame.rect : ref.rootRect;
    const frameRectImpl = frame ? counterpart(frame).rect : impl.rootRect;
    const redline = {};
    for (const side of SIDES) {
      const neighbour = neighbourOn(side, a, siblings);
      const expected = neighbour ? distance(side, a.rect, neighbour.rect, false) : distance(side, a.rect, frameRect, true);
      const actual = neighbour ? distance(side, b.rect, counterpart(neighbour).rect, false) : distance(side, b.rect, frameRectImpl, true);
      redline[side] = { neighbour, expected, actual, change: round(actual - expected) };
    }

    const moved = [];
    for (const side of SIDES) {
      const line = redline[side];
      if (Math.abs(line.change) <= T.geometry) continue;
      const other = redline[AXIS[side].opposite];
      const refDeclared = declaredSpacing(ref, a, side, line.neighbour, frame, line.expected);
      const implDeclared = declaredSpacing(impl, b, side, line.neighbour ? counterpart(line.neighbour) : null, frame ? counterpart(frame) : null, line.actual);
      const refDesigned = Boolean(refDeclared) && Math.abs(refDeclared.total - line.expected) <= T.declared;
      const implDesigned = Boolean(implDeclared) && Math.abs(implDeclared.total - line.actual) <= T.declared;
      const centredBefore = Math.abs(line.expected - other.expected) <= 1;
      const centredAfter = Math.abs(line.actual - other.actual) <= 1;
      const displaced = Math.abs(other.change) > T.geometry && !(centredBefore && centredAfter);

      // A distance that is leftover space on both sides and whose far end held still is only
      // following something else; it is not a difference of its own.
      if (!refDesigned && !implDesigned && !displaced) continue;
      if (!refDesigned && !implDesigned && (side === "bottom" || side === "right")) continue; // report a displacement once

      const axis = vertical(side) ? "y" : "x";
      const against = line.neighbour ? label(line.neighbour) : frame ? `the ${side} edge of ${label(frame)}` : `the ${side} edge of the surface`;
      const what = line.neighbour ? `gap ${{ top: "above", bottom: "below", left: "before", right: "after" }[side]}` : `${side} inset`;
      const centring = centredBefore && !centredAfter && !refDesigned ? ` — centred ${vertical(side) ? "vertically" : "horizontally"} in the reference, not in the implementation` : "";
      const differs = context.sameTool && refDesigned && implDesigned ? partsThatDiffer(refDeclared.parts, implDeclared.parts) : null;
      if (refDesigned) anchored.add(`${a.id}|${axis}`);
      // Pinned on both sides with the same declared offset: the element is where the source
      // put it, and it moved only because the block it is pinned to did.
      const samePin = refDesigned && implDesigned && refDeclared.parts[0]?.pinned && implDeclared.parts[0]?.pinned && Math.abs(refDeclared.parts[0].value - implDeclared.parts[0].value) <= T.value;
      // The build declares the same spacing as the reference and the distance still differs:
      // the spacing is right, and what it is measured between has changed.
      const sameSpacing = refDesigned && !implDesigned && Boolean(implDeclared) && Math.abs(implDeclared.total - refDeclared.total) <= T.declared;
      moved.push(
        push({
          ...base,
          gate: "geometry",
          specField: refDesigned || implDesigned ? `spacing.${side}` : `position.${axis}`,
          axis,
          expected: line.expected,
          actual: line.actual,
          delta: [`${what} ${fmt(line.expected)}px → ${fmt(line.actual)}px (${signed(line.change)}), measured to ${against}${centring}`],
          differs: differs ? differs.map((part) => part.text) : null,
          differsAt: differs,
          designedAs: refDesigned ? describeParts(refDeclared.parts) : null,
          builtFrom: implDesigned ? describeParts(implDeclared.parts) : null,
          builtParts: implDesigned ? implDeclared.parts : null,
          // The reference declares this distance: it is a value, and it is simply different.
          // Leftover space in the reference may only be echoing a size change beside it.
          firm: refDesigned && !samePin && !sameSpacing,
          derived: samePin,
          beside: [a, line.neighbour, ...siblings].filter(Boolean),
          hasNeighbour: Boolean(line.neighbour),
          edge: line.neighbour ? [side === "top" || side === "left" ? line.neighbour.id : a.id, side === "top" || side === "left" ? a.id : line.neighbour.id, axis].join(">") : `${a.id}|${side}`,
          group: line.neighbour ? null : `${frame ? frame.id : "root"}|${side}|${line.change}|${refDesigned}|${implDesigned}|${samePin}|${sameSpacing}`,
          node: a,
          tokens: differs ? [...new Set(differs.flatMap((part) => tokensAt(impl, part.selector, part.text)))] : [],
          matchedBy: how,
        }),
      );
    }

    // Alignment is the simpler way to say "it moved sideways and nothing else changed".
    if (a.kind === "text" && b.kind === "text" && a.type?.align && b.type?.align && a.type.align !== b.type.align && !context.geometryOnly) {
      const sideways = moved.filter((finding) => finding.axis === "x");
      if (sideways.length || num(a.type.lines) > 1 || num(b.type.lines) > 1) {
        push({ ...base, gate: "appearance", specField: "type.align", expected: a.type.align, actual: b.type.align, delta: [`text alignment ${a.type.align} → ${b.type.align}`], tokens: [], flags: { structural: true } });
        for (const finding of sideways) finding.derived = true;
      }
    }
  }

  // The same gap is the bottom redline of one primitive and the top redline of the next.
  const edges = new Set();
  findings = findings.filter((finding) => !finding.edge || (!edges.has(finding.edge) && edges.add(finding.edge)));

  // One wrong padding moves every child the same amount: report it once, on the frame.
  const groups = new Map();
  findings = findings.filter((finding) => {
    if (!finding.group) return true;
    const first = groups.get(finding.group);
    if (!first) {
      groups.set(finding.group, finding);
      finding.witnesses = [finding.block];
      return true;
    }
    first.witnesses.push(finding.block);
    return false;
  });

  // ---- causes and consequences
  const geometric = findings.filter((finding) => finding.gate === "geometry");
  const within = (finding, box) => finding.node !== box && contains(box.rect, finding.node.rect, 1) && area(finding.node.rect) < area(box.rect);

  // 0. A border takes up space. Where a border is itself a finding, the distances it shifts
  //    are that finding seen again.
  const restroked = new Set(findings.filter((finding) => finding.gate === "appearance" && finding.specField.startsWith("border")).map((finding) => finding.leaf));
  const isStroke = (part) => / border-(top|right|bottom|left) /.test(part.text) && restroked.has(part.text.replace(/ border-(top|right|bottom|left) .*$/, ""));
  for (const finding of geometric) if (finding.differsAt?.every(isStroke)) finding.derived = true;
  //    Likewise a distance the reference leaves to the layout, built from a part that is
  //    already reported as wrong, is that part seen again.
  const wrong = new Set(geometric.filter((finding) => finding.differsAt && !finding.derived).flatMap((finding) => finding.differsAt.map((part) => `${part.text.replace(/ [^ ]+ → [^ ]+$/, "")} ${fmt(part.build)}`)));
  for (const finding of geometric) {
    if (!finding.firm && !finding.differsAt && finding.builtParts?.some((part) => wrong.has(`${partKey(part)} ${fmt(part.value)}`))) finding.derived = true;
  }

  // 1. Leftover space in the reference follows whatever is declared around it: something
  //    beside it that changed size, or a declared distance on the same primitive's other side.
  for (const finding of geometric) {
    if (!finding.beside || finding.firm) continue;
    if (finding.beside.some((node) => resized[finding.axis].has(node)) || anchored.has(`${finding.node.id}|${finding.axis}`)) finding.derived = true;
  }
  // 2. A box with no explicit size follows its content, its container, or its neighbours.
  for (const finding of geometric) {
    if (!finding.follows) continue;
    const box = finding.node;
    const frame = frames.get(box);
    const inside = geometric.some((other) => other.axis === finding.axis && !other.follows && within(other, box));
    const container = frame && resized[finding.axis].has(frame);
    const neighbours = (members.get(frame) || []).some((node) => node !== box && geometric.some((other) => other.node === node && other.axis === finding.axis && other !== finding));
    const ownStroke = findings.some((other) => other.reference === finding.reference && other.specField.startsWith("border"));
    if (inside || container || neighbours || ownStroke) finding.derived = true;
  }
  // 3. A box at either end of a spacing value that simply changed resized to absorb it.
  for (const finding of geometric) {
    if (!finding.specField.startsWith("size.") || finding.derived || finding.explicit) continue;
    if (geometric.some((other) => other.firm && other.hasNeighbour && other.axis === finding.axis && (other.beside[0] === finding.node || other.beside[1] === finding.node))) finding.derived = true;
  }
  // 4. If every lead was explained away, the largest unexplained change is the lead.
  if (!findings.some((finding) => finding.intent === "drift" && !finding.derived)) {
    for (const axis of ["x", "y"]) {
      const followers = geometric.filter((finding) => finding.axis === axis && finding.derived).sort((p, q) => Math.abs(q.actual - q.expected) - Math.abs(p.actual - p.expected));
      if (followers[0]) {
        followers[0].derived = false;
        followers[0].delta[0] += " — unexplained: nothing measured accounts for it";
      }
    }
  }

  // ---- what cannot be compared, cannot be trusted, or need not match
  for (const finding of findings) {
    // A fallback font changes every text metric; those numbers say nothing about the build.
    if (context.fontEnvironment === "mismatched" && (FONT_SENSITIVE.has(finding.specField) || (finding.gate === "geometry" && finding.textual))) finding.untrusted = "fonts";
    // A geometry-only reference gives a text layer's box, which a design tool may have drawn
    // wider than the words; where the words start and end sideways cannot be told from it.
    if (context.geometryOnly && finding.textual && finding.axis === "x") finding.untrusted = "text-box";
    // Across form factors the layout is meant to differ: spacing, sizing, and type size adapt.
    if (!context.sameFormFactor && (finding.gate === "geometry" || ["type.size", "type.lines", "type.truncated"].includes(finding.specField)) && finding.intent === "drift") finding.intent = "adaptation";
  }
  if (context.estimated) {
    // Values measured off an image do not support claims finer than a couple of pixels.
    findings = findings.filter((finding) => !(typeof finding.expected === "number" && typeof finding.actual === "number" && Math.abs(finding.actual - finding.expected) < T.estimatedMinimum));
  }

  for (const node of unmatchedRef) {
    if (context.geometryOnly && node.wrapper) continue; // a frame whose paint is unknown is not something to miss
    push({ gate: "presence", specField: "presence", block: label(node), reference: node.id, leaf: leaf(node), y: node.rect?.y ?? 0, expected: `${node.kind} present`, actual: "no counterpart", delta: [`${node.kind} has no counterpart in the implementation — missing, or drawn another way (the pixel check decides)`], flags: { missing: true } });
  }
  for (const node of unmatchedImpl) {
    if (ref.partial) break; // a hand-written reference names a few nodes; the rest of the build is not extra
    if (context.geometryOnly && isBox(node)) continue; // boxes cannot be told apart without knowing what the reference paints
    push({ gate: "presence", specField: "presence", block: label(node), implementation: node.id, selector: node.selector, leaf: leaf(node), y: node.rect?.y ?? 0, expected: "not in the reference", actual: `${node.kind} present`, delta: [`${node.kind} exists only in the implementation — extra, or drawn another way (the pixel check decides)`], flags: { extra: true } });
  }

  // The same difference on every instance of a repeated component — or the same padding
  // seen from several of its children — is one thing to fix.
  const merged = new Map();
  for (const finding of findings) {
    const state = [finding.intent, Boolean(finding.derived), Boolean(finding.untrusted), Boolean(finding.satisfied)].join("/");
    const key = finding.differs ? ["spacing", finding.differs.join("&"), state].join("|") : [finding.gate, finding.specField, finding.expected, finding.actual, finding.leaf, finding.builtFrom, finding.designedAs, state].join("|");
    const instance = { block: finding.block, reference: finding.reference, implementation: finding.implementation };
    const first = merged.get(key);
    if (!first) {
      merged.set(key, finding);
      finding.instances = [instance];
    } else first.instances.push(instance);
  }

  findings = [...merged.values()];
  for (const finding of findings) decorate(finding, context);
  const rank = { fix: 0, follows: 2, leave: 3, untrusted: 4 };
  findings.sort((p, q) => rank[p.action] - rank[q.action] || Number(p.gate === "geometry" && !p.firm) - Number(q.gate === "geometry" && !q.firm) || p.y - q.y);
  findings.forEach((finding, index) => {
    finding.id = `PV-${String(index + 1).padStart(3, "0")}`;
    for (const key of ["edge", "group", "y", "beside", "hasNeighbour", "firm", "leaf", "axis", "follows", "explicit", "node", "flags", "textual", "component", "remap", "builtParts", "limit"]) delete finding[key];
    if (finding.untrusted) finding.untrusted = true;
    for (const key of ["differs", "differsAt", "designedAs", "builtFrom", "witnesses", "satisfied", "untrusted", "matchedBy"]) if (finding[key] == null || finding[key] === false) delete finding[key];
    if (finding.instances.length === 1) delete finding.instances;
  });

  const count = (action) => findings.filter((finding) => finding.action === action).length;
  const geometryApplies = !partial && context.sameFormFactor;
  return {
    title: `${refSpec.surface?.name || "Reference"} — visual parity`,
    summary: `${context.referencePlatform} reference compared with ${context.implementationPlatform} implementation (${context.sameFormFactor ? "same form factor" : "cross form factor — spacing and sizing adapt"}). ${count("fix")} to fix, ${count("follows")} consequences, ${count("leave")} leave-alone, ${count("untrusted")} untrusted.`,
    source: {
      designName: refSpec.surface?.name || "Reference",
      designUrl: /^https?:/.test(refSpec.surface?.source || "") ? refSpec.surface.source : "",
      designSource: refSpec.surface?.source || "",
      designPlatform: context.referencePlatform,
      implementationName: implSpec.surface?.name || "Implementation",
      implementationUrl: /^https?:/.test(implSpec.surface?.source || "") ? implSpec.surface.source : "",
      implementationSource: implSpec.surface?.source || "",
      implementationPlatform: context.implementationPlatform,
      viewport: viewportText(implSpec),
      referenceViewport: viewportText(refSpec),
      theme: implSpec.surface?.theme || refSpec.surface?.theme || "",
      capturedAt: implSpec.surface?.capturedAt || refSpec.surface?.capturedAt || "",
    },
    parity: {
      policy: `policy ${policy.policyVersion}`,
      formFactor: context.sameFormFactor ? "same" : "cross",
      engines: context.sameEngine ? "same" : "cross",
      referenceFidelity: refSpec.surface?.fidelity || "unknown",
      implementationFidelity: implSpec.surface?.fidelity || "unknown",
      fontEnvironment: context.fontEnvironment,
      // What this comparison could check. Without rectangles there is no geometry; across form
      // factors geometry is not expected to match; a geometry-only reference says nothing about looks.
      checked: [...(context.geometryOnly ? [] : ["appearance"]), ...(geometryApplies ? ["geometry"] : [])],
      partial,
      // Nodes left out of the comparison as OS chrome or platform-only, by name — never silently.
      skipped,
      ignoredAreas: ignore.length,
    },
    scores: {
      primitives: { reference: ref.prims.length || pairs.size + unmatchedRef.length, implementation: impl.prims.length || pairs.size + unmatchedImpl.length, paired: pairs.size, unpairedReference: unmatchedRef.filter((node) => !(context.geometryOnly && node.wrapper)).length, unpairedImplementation: unmatchedImpl.length, skipped: skipped.length },
      appearance: context.geometryOnly ? null : pct(appearancePass, pairs.size),
      geometry: geometryApplies ? pct(geometryPass, pairs.size) : null,
      toFix: count("fix"),
      consequences: count("follows"),
      leaveAlone: count("leave"),
      untrusted: count("untrusted"),
    },
    screenshots: {},
    // Which implementation primitives are not where the reference has them, and where the
    // reference had them — the pixel check uses both to tell a region it can explain from
    // one it cannot.
    displaced: [...pairs.entries()].filter(([a]) => placed.get(a) === false).map(([, { node }]) => node.id),
    vacated: [...pairs.keys()].filter((a) => placed.get(a) === false).map((a) => a.rect),
    findings,
  };
}

/** Give a finding the fields the established findings format carries, and say what to do with it. */
function decorate(finding, context) {
  const severity = context.policy.severity || {};
  const flags = finding.flags || {};
  finding.action = finding.untrusted ? "untrusted" : finding.intent === "adaptation" || finding.satisfied ? "leave" : finding.derived ? "follows" : "fix";
  finding.derived = Boolean(finding.derived);
  finding.parityClass = finding.untrusted ? "untrusted" : finding.intent === "drift" ? "strict" : finding.intent === "adaptation" ? "adaptive" : "required-adaptation";

  let level;
  if (finding.untrusted || finding.satisfied) level = "low";
  else if (finding.intent === "required-adaptation") level = severity.requiredAdaptation || "high";
  else if (flags.missing) level = severity.missingNode || "high";
  else if (flags.extra) level = severity.extraNode || "medium";
  else if (flags.text) level = severity.text || "high";
  else if (flags.structural) level = severity.structural || "high";
  else if (flags.colour) level = severity.color || "medium";
  else if (typeof finding.expected === "number" && typeof finding.actual === "number") {
    const absolute = Math.abs(finding.actual - finding.expected);
    const ratio = absolute / Math.max(Math.abs(finding.expected), 1);
    const rule = (severity.numeric || []).find((item) => (item.maxDeltaRatio == null && item.maxDeltaPx == null) || ratio <= (item.maxDeltaRatio ?? -1) || absolute <= (item.maxDeltaPx ?? -1));
    level = rule?.severity || "medium";
  } else level = severity.other || "medium";
  if (finding.intent === "adaptation") level = severity.adaptiveCap || "low";
  finding.severity = level;

  finding.ownership = finding.tokens?.length ? "token/theme" : finding.component ? "primitive/shared component" : finding.gate === "geometry" || finding.gate === "presence" ? "composition" : "unclassified";
  finding.tokens = finding.tokens || [];
  finding.designReference = finding.reference || "";
  finding.implementationReference = finding.selector || finding.implementation || "";
  finding.files = [];
  finding.notes = [];
  if (finding.untrusted === "fonts") finding.notes.push("Font environment mismatched — this metric is unreliable in the current capture. Align the fonts and re-measure before changing any token or size.");
  if (finding.untrusted === "text-box") finding.notes.push("Geometry-only reference — a text layer's box can be wider than its words, so this sideways measurement is unreliable. Read the text's alignment and box sizing from the design before changing anything.");
  if (!context.sameFormFactor && finding.gate === "geometry") finding.notes.push("Cross form factor comparison — verify the intended responsive behaviour before treating this as drift.");
  if (flags.remap?.record) finding.notes.push(`Accessibility remap record: ${flags.remap.record}.`);

  const target = finding.selector ? `on ${finding.selector.split(" > ").slice(-2).join(" > ")}` : `on ${finding.block}`;
  const token = finding.tokens[0];
  if (finding.untrusted === "text-box") finding.recommendedFix = "Do not fix from this number. Check the text's alignment and box sizing in the design first.";
  else if (finding.action === "untrusted") finding.recommendedFix = "Do not fix. Align the font environment with the reference and re-measure.";
  else if (finding.satisfied) finding.recommendedFix = `No fix — this difference is the recorded accessibility remap${flags.remap?.token ? ` on ${flags.remap.token}` : ""}. Keep the accessible value.`;
  else if (finding.intent === "required-adaptation" && flags.remap) finding.recommendedFix = `Apply the accessible value ${flags.remap.accessible}${flags.remap.token ? ` via ${flags.remap.token}` : ""}. Matching the reference is the defect here: the reference shows the authored value the remap replaces.`;
  else if (finding.specField === "touchTarget") finding.recommendedFix = `Grow the hit area to ${context.minTouchTarget} on both axes — enlarge the control, or keep its visual size and extend the touch region. Do not copy the reference size.`;
  else if (finding.action === "leave") finding.recommendedFix = "Leave as is — a platform or form-factor adaptation. Confirm the design system names it, then record it.";
  else if (finding.action === "follows") finding.recommendedFix = "No direct fix — this follows from a cause listed above. Re-measure after fixing the causes.";
  else if (flags.missing) finding.recommendedFix = `Add the ${finding.block} ${finding.expected.split(" ")[0]}, or confirm with the pixel check that it is drawn another way.`;
  else if (flags.extra) finding.recommendedFix = `Confirm whether ${finding.block} belongs on this platform. Remove it if not; if it does, list it under platformOnlyNodes in the policy file.`;
  else if (finding.differsAt) finding.recommendedFix = finding.differsAt.map((part) => `Change ${part.text.replace(/ [^ ]+ → [^ ]+$/, "")} from ${fmt(part.build)} to ${fmt(part.design)}${part.selector ? ` (${part.selector.split(" > ").slice(-2).join(" > ")})` : ""}`).join("; ") + (token ? `, through ${token}.` : ".");
  else if (finding.gate === "geometry" && (finding.builtFrom || finding.designedAs)) {
    // No part-by-part comparison (another tool on the other side, or only one side declares
    // the distance): name the distance and what each side makes it from.
    const want = `${fmt(finding.expected)}px`;
    finding.recommendedFix = finding.builtFrom
      ? `Bring this distance to ${want}. The build makes it from ${finding.builtFrom.join(" + ")}${finding.designedAs ? `; the reference declares ${finding.designedAs.join(" + ")}.` : "; the reference leaves it to alignment, so change how the container aligns its children rather than a padding."}`
      : `Bring this distance to ${want}, which the reference declares as ${finding.designedAs.join(" + ")}. The build does not declare it: look at how the container aligns or distributes its children.`;
  } else if (finding.specField === "text") finding.recommendedFix = `Correct the copy ${target} to match the reference exactly, through the project's content source, not a hardcoded string.`;
  else if (finding.specField === "asset" || finding.specField === "icon.artwork") finding.recommendedFix = `Replace the asset ${target} with the one the reference uses, exported from the design source.`;
  else if (finding.limit) finding.recommendedFix = `Set ${finding.limit.prop} ${target} to ${typeof finding.limit.expected === "number" ? `${fmt(finding.limit.expected)}px` : finding.limit.expected}${token ? ` through ${token}` : ""}.`;
  else if (finding.specField.startsWith("size.") && finding.explicit !== false && typeof finding.expected === "number") finding.recommendedFix = `Set the ${finding.specField.slice(5)} ${target} to ${fmt(finding.expected)}px${token ? ` through ${token}` : ""}.`;
  else if (token) finding.recommendedFix = `Apply ${token} ${target} so that it reads ${typeof finding.expected === "number" ? fmt(finding.expected) : finding.expected}.`;
  else finding.recommendedFix = `Make it ${typeof finding.expected === "number" ? fmt(finding.expected) : finding.expected} ${target}. Prefer an existing token or component variant over a one-off value.`;
}

function tokenFor(a, b, field) {
  const key = field.startsWith("border") ? "border" : field.startsWith("radius") ? "radius" : field === "gradient" ? "background" : field;
  const token = b.tokenRefs?.[key] || a.tokenRefs?.[key];
  return token ? [token] : [];
}

/** The token a declared part was written with: "td padding-left 16 → 12" → the token behind td's padding. */
function tokensAt(model, selector, text) {
  if (!selector) return [];
  const node = model.spec.nodes.find((item) => item.selector === selector && item.tokenRefs);
  const field = /padding/.test(text) ? "padding" : /margin/.test(text) ? "margin" : /gap/.test(text) ? "gap" : /border/.test(text) ? "border" : null; // row-gap and column-gap are "gap" too
  const token = node && field ? node.tokenRefs[field] : null;
  return token ? [token] : [];
}

function viewportText(spec) {
  const size = spec.surface?.root?.width ? spec.surface.root : spec.surface?.viewport;
  return size?.width ? `${fmt(size.width)}x${fmt(size.height || 0)}` : "";
}

function pct(part, whole) {
  return whole ? Math.round((part / whole) * 1000) / 10 : null;
}

/* ---------------------------------------------------------------------- cli */

const TAG = { fix: " fix ", follows: "  ↳  ", leave: "leave", untrusted: "  ?  " };

export function summarize(report, { limit = 60, header = true } = {}) {
  const s = report.scores;
  const show = (score) => (score === null ? "not checked" : `${score}%`);
  const lines = header
    ? [
        `paired ${s.primitives.paired}/${s.primitives.reference} primitives · appearance ${show(s.appearance)} · geometry ${show(s.geometry)}`,
        `${s.toFix} to fix · ${s.consequences} consequences (re-measure, do not fix) · ${s.leaveAlone} leave-alone · ${s.untrusted} untrusted`,
      ]
    : [];
  for (const finding of report.findings.slice(0, limit)) {
    const count = finding.instances ? `  ×${finding.instances.length}` : "";
    // A spacing finding is fixed where its differing part lives, not on the element it was seen from.
    const at = finding.differsAt?.[0]?.selector || finding.selector;
    const where = at ? `  [${at.split(" > ").slice(-2).join(" > ")}]` : "";
    const head = finding.differs ? finding.differs.join("; ") : `${finding.block}: ${finding.delta[0]}`;
    lines.push(`${finding.id} ${TAG[finding.action]} ${head}${count}${where}${finding.visible === false ? "  (not visible in this capture)" : ""}`);
    if (finding.differs) lines.push(`             seen as: ${finding.block}: ${finding.delta[0]}`);
    else {
      if (finding.witnesses?.length > 1) lines.push(`             same change seen on: ${finding.witnesses.join(", ")}`);
      if (finding.designedAs) lines.push(`             design: ${finding.designedAs.join(" + ") || "0"}`);
      if (finding.builtFrom) lines.push(`             build:  ${finding.builtFrom.join(" + ") || "0"}`);
    }
    if (finding.tokens?.length) lines.push(`             token:  ${finding.tokens.join(", ")}`);
  }
  if (report.findings.length > limit) lines.push(`… ${report.findings.length - limit} more in the result file`);
  return lines.join("\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const flag = (name) => (args.indexOf(name) >= 0 ? args[args.indexOf(name) + 1] : "");
  if (!flag("--reference") || !flag("--implementation")) {
    console.error("Usage: node parity_diff.mjs --reference <spec.json> --implementation <spec.json> [--output <findings.json>] [--policy <policy.json>] [--map <pairs.json>] [--remaps <remaps.json>] [--ignore <areas.json>]");
    process.exit(2);
  }
  const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
  const report = diffSpecs(read(flag("--reference")), read(flag("--implementation")), {
    map: flag("--map") ? read(flag("--map")) : [],
    policy: loadPolicy(flag("--policy") || undefined),
    remaps: flag("--remaps") ? read(flag("--remaps")) : null,
    ignore: flag("--ignore") ? read(flag("--ignore")) : [],
  });
  if (flag("--output")) {
    fs.mkdirSync(path.dirname(path.resolve(flag("--output"))), { recursive: true });
    fs.writeFileSync(flag("--output"), `${JSON.stringify(report, null, 2)}\n`);
  }
  console.log(summarize(report));
}
