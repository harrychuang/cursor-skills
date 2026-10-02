#!/usr/bin/env node

/**
 * Compare two exhaustive UI Specs by what is visible.
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
 * Findings come out in two tiers: causes to fix, and consequences that follow from a cause
 * and are re-measured rather than fixed.
 *
 *   node parity_diff.mjs --reference ref.spec.json --implementation impl.spec.json --output findings.json
 */

import fs from "node:fs";
import path from "node:path";

const TOL = {
  geometry: 0.5, // px — a whole pixel off is a finding
  textWidth: 1, // px, or 1.5% of the width: glyph advances differ slightly between engines
  value: 0.25, // declared numbers: 1 vs 1.5 is a finding
  color: 2, // per channel, 0–255: below what anyone can see, above rounding between notations
  alpha: 0.012,
  opacity: 0.011,
  declared: 0.75, // how closely measured spacing must equal the declared parts to count as designed
};

const KIND_GROUP = { box: "box", input: "box", text: "text", icon: "graphic", image: "graphic" };

const FONT_ALIASES = [
  ["Inter", "SF Pro Text", "SF Pro Display", "Roboto", "-apple-system", "system-ui", "BlinkMacSystemFont", "Segoe UI"],
  ["Helvetica", "Helvetica Neue", "Arial", "Liberation Sans"],
  ["SF Mono", "Menlo", "Monaco", "Roboto Mono", "Consolas", "ui-monospace"],
  ["Noto Sans TC", "PingFang TC", "Microsoft JhengHei", "Source Han Sans TC"],
  ["Noto Sans SC", "PingFang SC", "Microsoft YaHei", "Source Han Sans SC"],
  ["Noto Sans JP", "Hiragino Sans", "Yu Gothic", "Source Han Sans JP"],
];

/* -------------------------------------------------------------------- model */

export function loadModel(spec) {
  const byId = new Map(spec.nodes.map((node) => [node.id, node]));
  const sized = (node) => node.rect && node.rect.width > 0 && node.rect.height > 0;
  const prims = spec.nodes.filter((node) => node.paints && sized(node));
  const root = spec.nodes.find((node) => !node.parent) || spec.nodes[0];
  const rootRect = { x: 0, y: 0, width: spec.surface?.root?.width ?? root.rect.width, height: spec.surface?.root?.height ?? root.rect.height };
  return { spec, byId, prims, root, rootRect, sized };
}

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
export function matchPrimitives(ref, impl, explicit = []) {
  const pairs = new Map(); // reference node → { node, how }
  const taken = new Set();
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
      if (hit && !taken.has(hit) && KIND_GROUP[hit.kind] === KIND_GROUP[node.kind]) {
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

  // 3. Everything left — icon tiles, dividers, icons, images, stray text — by where it sits
  //    inside the smallest already-paired box around it. Larger first, so each new pair can
  //    serve as the frame of the ones inside it.
  const frameIn = (node, model, isPaired) => {
    let best = null;
    for (const box of model.prims) {
      if (box === node || !isBox(box) || !isPaired(box) || !contains(box.rect, node.rect, 1)) continue;
      if (!best || area(box.rect) < area(best.rect)) best = box;
    }
    return best;
  };
  const byPlacement = (refList, implPool, how, cap) => {
    for (const a of refList.slice().sort((x, y) => area(y.rect) - area(x.rect))) {
      if (pairs.has(a)) continue;
      const frame = frameIn(a, ref, (box) => pairs.has(box));
      const targetFrame = frame ? pairs.get(frame).node : null;
      const origin = frame ? frame.rect : ref.rootRect;
      const targetOrigin = targetFrame ? targetFrame.rect : impl.rootRect;
      let best = null;
      let loose = null;
      for (const b of implPool) {
        if (taken.has(b) || KIND_GROUP[b.kind] !== KIND_GROUP[a.kind]) continue;
        const its = frameIn(b, impl, (box) => taken.has(box));
        if ((its || null) === targetFrame) {
          const cost = placementCost(a.rect, origin, b.rect, targetOrigin);
          if (!best || cost < best.cost) best = { b, cost };
        }
        // It may have been pushed out of its frame: look across the surface, accept only a close fit.
        const wide = placementCost(a.rect, ref.rootRect, b.rect, impl.rootRect);
        if (!loose || wide < loose.cost) loose = { b, cost: wide };
      }
      if (best && best.cost <= cap) pair(a, best.b, how);
      else if (loose && loose.cost <= cap * 0.35) pair(a, loose.b, how);
    }
  };
  for (const kind of ["box", "graphic", "text"]) {
    byPlacement(ref.prims.filter((node) => !pairs.has(node) && KIND_GROUP[node.kind] === kind), impl.prims, "position", 1);
  }

  // 4. A painted box whose counterpart paints nothing (a divider that was never drawn, a
  //    card with no fill) still has a counterpart: the element is there, its paint is not.
  //    Pair it with that unpainted element so the missing paint is reported on something
  //    that can be fixed.
  const unpainted = (model, used) => model.spec.nodes.filter((node) => node.kind === "box" && !node.paints && model.sized(node) && !used(node));
  const refLeft = ref.prims.filter((node) => isBox(node) && !pairs.has(node));
  byContent(refLeft, unpainted(impl, (node) => taken.has(node)), "unpainted");
  byPlacement(refLeft.filter((node) => !pairs.has(node)), unpainted(impl, (node) => taken.has(node)), "unpainted", 0.5);

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

  return {
    pairs,
    unmatchedRef: ref.prims.filter((node) => !pairs.has(node)),
    unmatchedImpl: impl.prims.filter((node) => !taken.has(node)),
  };
}

/* -------------------------------------------------------- visible properties */

function toHex(value) {
  if (typeof value !== "string") return value;
  const m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)$/.exec(value.trim());
  if (!m) return value;
  const h = (n) => Math.max(0, Math.min(255, Math.round(Number(n)))).toString(16).padStart(2, "0");
  const alpha = m[4] === undefined ? 1 : Number(m[4]);
  return `#${h(m[1])}${h(m[2])}${h(m[3])}${alpha < 0.999 ? h(alpha * 255) : ""}`;
}

function parseHex(value) {
  if (typeof value !== "string") return null;
  const m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(toHex(value).trim());
  if (!m) return null;
  return { r: parseInt(m[1].slice(0, 2), 16), g: parseInt(m[1].slice(2, 4), 16), b: parseInt(m[1].slice(4, 6), 16), a: m[2] ? parseInt(m[2], 16) / 255 : 1 };
}

function sameColor(a, b) {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  const x = parseHex(a);
  const y = parseHex(b);
  if (!x || !y) return String(a).toLowerCase() === String(b).toLowerCase();
  return Math.max(Math.abs(x.r - y.r), Math.abs(x.g - y.g), Math.abs(x.b - y.b)) <= TOL.color && Math.abs(x.a - y.a) <= TOL.alpha;
}

/** Gradient strings are canonical, but their colours still deserve the colour tolerance. */
function samePaintString(a, b) {
  if ((a || "") === (b || "")) return true;
  if (!a || !b) return false;
  const split = (text) => text.split(/(#[0-9a-f]{6,8})/i);
  const pa = split(a);
  const pb = split(b);
  return pa.length === pb.length && pa.every((part, i) => (part.startsWith("#") ? sameColor(part, pb[i]) : part === pb[i]));
}

const SIDES = ["top", "right", "bottom", "left"];
const CORNERS = ["top-left", "top-right", "bottom-right", "bottom-left"];

function shadowText(list) {
  if (!list || !list.length) return "none";
  return list.map((s) => `${s.inset ? "inset " : ""}${s.x} ${s.y} ${s.blur} ${s.spread} ${s.color}`).join(", ");
}
function sameShadows(a, b) {
  const x = a || [];
  const y = b || [];
  if (x.length !== y.length) return false;
  return x.every((s, i) => s.inset === y[i].inset && ["x", "y", "blur", "spread"].every((k) => Math.abs(s[k] - y[i][k]) <= TOL.value) && sameColor(s.color, y[i].color));
}

/**
 * The lines drawn around a box, however they were made. A border, and a shadow with no
 * offset and no blur, put the same pixels on screen; a design tool calls both a stroke,
 * inside or outside. Folding them together keeps "border" versus "ring" from reading as a
 * difference when the picture is the same.
 */
function strokesOf(node) {
  const width = SIDES.map((side, i) => num(node.border?.width?.[i]));
  const color = SIDES.map((side, i) => (width[i] ? node.border.color[i] : null));
  const style = SIDES.map((side, i) => (width[i] ? node.border.style?.[i] || "solid" : null));
  const shadows = [];
  let outside = null;
  for (const s of node.shadow || []) {
    const ring = s.x === 0 && s.y === 0 && s.blur === 0 && s.spread > 0;
    if (ring && s.inset && width.every((w, i) => w === 0 || sameColor(color[i], s.color))) {
      SIDES.forEach((side, i) => {
        width[i] += s.spread;
        color[i] = s.color;
        style[i] = style[i] || "solid";
      });
    } else if (ring && !s.inset && !outside) outside = { width: s.spread, color: s.color };
    else shadows.push(s);
  }
  if (node.outline && !outside) outside = { width: node.outline.width, color: node.outline.color, offset: node.outline.offset };
  return { width, color, style, shadows, outside };
}

function fontRelation(a, b) {
  const norm = (v) => String(v || "").toLowerCase().trim();
  if (norm(a) === norm(b)) return "same";
  return FONT_ALIASES.some((set) => set.map(norm).includes(norm(a)) && set.map(norm).includes(norm(b))) ? "alias" : "different";
}

/** Differences in what a primitive looks like, independent of where it is. */
function compareAppearance(a, b, context) {
  const out = [];
  const add = (field, expected, actual, label, extra = {}) => out.push({ field, expected, actual, label, ...extra });
  const number = (field, x, y, label) => {
    if (Math.abs(num(x) - num(y)) > TOL.value) add(field, x ?? 0, y ?? 0, `${label} ${fmt(x ?? 0)}px → ${fmt(y ?? 0)}px`);
  };
  const crossEngine = !context.sameEngine;

  if (a.kind === "text" && b.kind === "text") {
    const ta = a.type || {};
    const tb = b.type || {};
    if (renderedText(a) !== renderedText(b)) {
      const sameWords = String(a.text).trim() === String(b.text).trim();
      if (sameWords) add("type.transform", ta.transform || "none", tb.transform || "none", `text-transform ${ta.transform || "none"} → ${tb.transform || "none"} (reads "${renderedText(a)}" → "${renderedText(b)}")`);
      else add("text", renderedText(a), renderedText(b), `text "${renderedText(a)}" → "${renderedText(b)}"`);
    }
    const family = fontRelation(ta.family, tb.family);
    if (family !== "same") add("type.family", ta.family, tb.family, `font ${ta.family} → ${tb.family}`, { intent: family === "alias" ? "adaptation" : "drift" });
    number("type.size", ta.size, tb.size, "font size");
    if (num(ta.weight) !== num(tb.weight)) add("type.weight", ta.weight, tb.weight, `font weight ${ta.weight} → ${tb.weight}`);
    if (Math.abs(num(ta.lineHeight) - num(tb.lineHeight)) > TOL.value) {
      const note = tb.lineHeightSet === false ? " (not set in the implementation — the browser default applies)" : "";
      add("type.lineHeight", ta.lineHeight, tb.lineHeight, `line height ${fmt(ta.lineHeight)}px → ${fmt(tb.lineHeight)}px${note}`, { intent: crossEngine ? "adaptation" : "drift" });
    }
    if (Math.abs(num(ta.letterSpacing) - num(tb.letterSpacing)) > 0.05) {
      add("type.letterSpacing", ta.letterSpacing, tb.letterSpacing, `letter spacing ${fmt(ta.letterSpacing)}px → ${fmt(tb.letterSpacing)}px`, { intent: crossEngine ? "adaptation" : "drift" });
    }
    if ((ta.decoration || "none") !== (tb.decoration || "none")) add("type.decoration", ta.decoration, tb.decoration, `text decoration ${ta.decoration || "none"} → ${tb.decoration || "none"}`);
    if ((ta.style || "normal") !== (tb.style || "normal")) add("type.style", ta.style, tb.style, `font style ${ta.style} → ${tb.style}`);
    if (num(ta.lines) && num(tb.lines) && ta.lines !== tb.lines) add("type.lines", ta.lines, tb.lines, `wraps to ${tb.lines} line${tb.lines > 1 ? "s" : ""}, reference has ${ta.lines}`);
    if (Boolean(ta.truncated) !== Boolean(tb.truncated)) add("type.truncated", Boolean(ta.truncated), Boolean(tb.truncated), ta.truncated ? "should truncate with … but does not" : "is truncated; the reference shows it in full");
    if (!sameColor(a.fill, b.fill)) add("fill", a.fill, b.fill, `text colour ${a.fill} → ${b.fill}`);
  }

  if (isBox(a) && isBox(b)) {
    if (!sameColor(a.background, b.background)) add("background", a.background ?? "none", b.background ?? "none", `fill ${a.background ?? "none"} → ${b.background ?? "none"}`);
    if (!samePaintString(a.gradient, b.gradient)) add("gradient", a.gradient ?? "none", b.gradient ?? "none", `gradient ${a.gradient ?? "none"} → ${b.gradient ?? "none"}`);

    const sa = strokesOf(a);
    const sb = strokesOf(b);
    const borders = SIDES.map((side, i) => {
      const wa = sa.width[i];
      const wb = sb.width[i];
      if (Math.abs(wa - wb) > TOL.value) {
        if (wb === 0) return { field: "width", expected: wa, actual: 0, text: `border is missing (${fmt(wa)}px ${sa.color[i]})` };
        if (wa === 0) return { field: "width", expected: 0, actual: wb, text: `border is not in the reference (${fmt(wb)}px ${sb.color[i]})` };
        return { field: "width", expected: wa, actual: wb, text: `border width ${fmt(wa)}px → ${fmt(wb)}px` };
      }
      if (wa > 0 && !sameColor(sa.color[i], sb.color[i])) return { field: "color", expected: sa.color[i], actual: sb.color[i], text: `border colour ${sa.color[i]} → ${sb.color[i]}` };
      if (wa > 0 && sa.style[i] !== sb.style[i]) return { field: "style", expected: sa.style[i], actual: sb.style[i], text: `border style ${sa.style[i]} → ${sb.style[i]}` };
      return null;
    });
    if (borders.every(Boolean) && new Set(borders.map((item) => item.text)).size === 1) add(`border.${borders[0].field}`, borders[0].expected, borders[0].actual, borders[0].text);
    else borders.forEach((item, i) => item && add(`border.${SIDES[i]}.${item.field}`, item.expected, item.actual, `${SIDES[i]} ${item.text}`));

    const ringText = (ring) => (ring ? `${fmt(ring.width)}px ${ring.color}` : "none");
    if (ringText(sa.outside) !== ringText(sb.outside) && !(sa.outside && sb.outside && Math.abs(sa.outside.width - sb.outside.width) <= TOL.value && sameColor(sa.outside.color, sb.outside.color))) {
      add("outline", ringText(sa.outside), ringText(sb.outside), `outer ring ${ringText(sa.outside)} → ${ringText(sb.outside)}`);
    }
    if (!sameShadows(sa.shadows, sb.shadows)) add("shadow", shadowText(sa.shadows), shadowText(sb.shadows), `shadow ${shadowText(sa.shadows)} → ${shadowText(sb.shadows)}`);

    if (a.kind === "input" && b.kind === "input") {
      const pa = a.placeholder || {};
      const pb = b.placeholder || {};
      if ((pa.text || "") !== (pb.text || "")) add("placeholder.text", pa.text, pb.text, `placeholder "${pa.text}" → "${pb.text}"`);
      else if (pa.text && !sameColor(pa.color, pb.color)) add("placeholder.color", pa.color, pb.color, `placeholder colour ${pa.color} → ${pb.color}`);
      number("type.size", a.type?.size, b.type?.size, "font size");
      if (num(a.type?.weight) !== num(b.type?.weight)) add("type.weight", a.type?.weight, b.type?.weight, `font weight ${a.type?.weight} → ${b.type?.weight}`);
      if (!sameColor(a.fill, b.fill)) add("fill", a.fill, b.fill, `text colour ${a.fill} → ${b.fill}`);
    }

    // What the element draws through ::before / ::after — dots, underlines, thumbs.
    for (const which of ["before", "after"]) {
      const pa = a.pseudo?.[which];
      const pb = b.pseudo?.[which];
      if (!pa && !pb) continue;
      const name = `::${which}`;
      if (!pa || !pb) {
        add(`pseudo.${which}`, pa ? "present" : "none", pb ? "present" : "none", pa ? `${name} decoration is missing` : `${name} decoration is not in the reference`);
        continue;
      }
      const item = (field, x, y, text) => add(`pseudo.${which}.${field}`, x, y, `${name} ${text}`);
      if ((pa.content || "") !== (pb.content || "")) item("content", pa.content, pb.content, `content "${pa.content}" → "${pb.content}"`);
      if (Math.abs(pa.width - pb.width) > TOL.value || Math.abs(pa.height - pb.height) > TOL.value) item("size", `${fmt(pa.width)}×${fmt(pa.height)}`, `${fmt(pb.width)}×${fmt(pb.height)}`, `size ${fmt(pa.width)}×${fmt(pa.height)}px → ${fmt(pb.width)}×${fmt(pb.height)}px`);
      if (!sameColor(pa.background, pb.background)) item("background", pa.background ?? "none", pb.background ?? "none", `fill ${pa.background ?? "none"} → ${pb.background ?? "none"}`);
      if (!samePaintString(pa.gradient, pb.gradient)) item("gradient", pa.gradient ?? "none", pb.gradient ?? "none", `gradient ${pa.gradient ?? "none"} → ${pb.gradient ?? "none"}`);
      if (pa.content && !sameColor(pa.color, pb.color)) item("color", pa.color, pb.color, `colour ${pa.color} → ${pb.color}`);
      if (String(pa.radius ?? 0) !== String(pb.radius ?? 0)) item("radius", pa.radius ?? 0, pb.radius ?? 0, `radius ${pa.radius ?? 0} → ${pb.radius ?? 0}`);
      if (!sameShadows(pa.shadow, pb.shadow)) item("shadow", shadowText(pa.shadow), shadowText(pb.shadow), `shadow ${shadowText(pa.shadow)} → ${shadowText(pb.shadow)}`);
      if (JSON.stringify(pa.border || null) !== JSON.stringify(pb.border || null)) item("border", JSON.stringify(pa.border || null), JSON.stringify(pb.border || null), "border differs");
      if (Math.abs((pa.opacity ?? 1) - (pb.opacity ?? 1)) > TOL.opacity) item("opacity", pa.opacity ?? 1, pb.opacity ?? 1, `opacity ${pa.opacity ?? 1} → ${pb.opacity ?? 1}`);
      if (pa.inset && pb.inset) {
        // A decoration is pinned to one edge of its host, or centred in it. It has moved only
        // when neither still holds — otherwise it is just following a host that changed size.
        const movedAlong = (i, j) => {
          if ([pa.inset[i], pa.inset[j], pb.inset[i], pb.inset[j]].some((value) => value === null)) return null;
          const d1 = pb.inset[i] - pa.inset[i];
          const d2 = pb.inset[j] - pa.inset[j];
          if (Math.abs(d1) <= TOL.value || Math.abs(d2) <= TOL.value) return null;
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
    const full = (node, r) => r >= Math.min(node.rect.width, node.rect.height) / 2 - 0.5;
    const off = radii.map(([x, y]) => Math.abs(x - y) > TOL.value && !(full(a, x) && full(b, y)));
    if (off.every(Boolean) && new Set(radii.map((pair) => pair.join(">"))).size === 1) add("radius", radii[0][0], radii[0][1], `corner radius ${fmt(radii[0][0])}px → ${fmt(radii[0][1])}px`);
    else radii.forEach(([x, y], i) => off[i] && add(`radius.${CORNERS[i]}`, x, y, `${CORNERS[i]} radius ${fmt(x)}px → ${fmt(y)}px`));
    for (const field of ["filter", "backdropFilter", "blend"]) {
      if ((a[field] || "none") !== (b[field] || "none")) add(field, a[field] || "none", b[field] || "none", `${field} ${a[field] || "none"} → ${b[field] || "none"}`);
    }
  }

  if (a.icon && b.icon) {
    if (a.icon.signature && b.icon.signature && a.icon.signature !== b.icon.signature) add("icon.artwork", a.icon.signature, b.icon.signature, "icon artwork differs — not the same glyph");
    number("icon.strokeWidth", a.icon.strokeWidth, b.icon.strokeWidth, "icon stroke");
    if (!sameColor(a.icon.stroke, b.icon.stroke)) add("icon.stroke", a.icon.stroke, b.icon.stroke, `icon colour ${a.icon.stroke} → ${b.icon.stroke}`);
    if (!sameColor(a.icon.fill, b.icon.fill)) add("icon.fill", a.icon.fill, b.icon.fill, `icon fill ${a.icon.fill} → ${b.icon.fill}`);
  }
  if (a.image && b.image) {
    if (a.asset && b.asset && a.asset !== b.asset) add("asset", a.asset, b.asset, `image ${a.asset} → ${b.asset}`);
    if ((a.image.fit || "fill") !== (b.image.fit || "fill")) add("image.fit", a.image.fit, b.image.fit, `image fit ${a.image.fit} → ${b.image.fit}`);
  }

  const oa = a.opacityEffective ?? 1;
  const ob = b.opacityEffective ?? 1;
  if (Math.abs(oa - ob) > TOL.opacity) add("opacity", oa, ob, `opacity ${fmt(oa)} → ${fmt(ob)}`);

  // Interaction states: every state the reference defines must exist and look the same.
  for (const [state, expected] of Object.entries(a.states || {})) {
    const actual = b.states?.[state];
    if (!actual) {
      add(`states.${state}`, JSON.stringify(expected), "missing", `${state} state is missing`);
      continue;
    }
    for (const [prop, value] of Object.entries(expected)) {
      const now = actual[prop] ?? "unchanged";
      if (!sameColor(value, now)) add(`states.${state}.${prop}`, toHex(value), toHex(now), `${state} ${prop} ${toHex(value)} → ${toHex(now)}`);
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
const vertical = (side) => side === "top" || side === "bottom";

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

const PAD = { top: 0, right: 1, bottom: 2, left: 3 };

function ancestors(model, node) {
  const chain = [];
  for (let current = node; current; current = current.parent ? model.byId.get(current.parent) : null) chain.push(current);
  return chain;
}

/**
 * How far the source says `node`'s edge sits from an ancestor's same edge: the padding and
 * border of every element in between plus the margins on the way. `null` when the chain is
 * not a plain run of boxes (something positioned, or `stop` is not an ancestor).
 */
function climb(model, node, stop, side, parts) {
  let total = 0;
  let current = node;
  while (current && current !== stop) {
    if (current.layout?.positioned) return null;
    const parent = current.parent ? model.byId.get(current.parent) : null;
    if (!parent) return null;
    const add = (owner, prop, value) => {
      if (!value) return;
      total += value;
      parts.push({ node: owner, prop, value });
    };
    if (current.tag !== "#text") add(current, `margin-${side}`, num(current.box?.margin?.[PAD[side]]));
    add(parent, `padding-${side}`, num(parent.box?.padding?.[PAD[side]]));
    add(parent, `border-${side}`, num(parent.box?.borderWidth?.[PAD[side]]));
    current = parent;
  }
  return current === stop ? total : null;
}

/** The spacing the source declares between a primitive's edge and its redline target. */
function declaredSpacing(model, node, side, neighbour, frame) {
  const parts = [];
  if (!neighbour) {
    const total = climb(model, node, frame || model.root, side, parts);
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

  const opposite = AXIS[side].opposite;
  const upA = climb(model, node, aTop, side, parts);
  const upB = climb(model, neighbour, bTop, opposite, parts);
  if (upA === null || upB === null) return null;

  // Only adjacent items have a gap of their own; anything in between is content, not spacing.
  const items = model.spec.nodes.filter((item) => item.parent === lca.id && model.sized(item) && !item.layout?.positioned);
  if (Math.abs(items.indexOf(aTop) - items.indexOf(bTop)) !== 1) return null;

  const mode = lca.layout?.mode;
  const alongMain = (mode === "column" && vertical(side)) || (mode === "row" && !vertical(side)) || mode === "grid";
  const marginA = aTop.tag === "#text" ? 0 : num(aTop.box?.margin?.[PAD[side]]);
  const marginB = bTop.tag === "#text" ? 0 : num(bTop.box?.margin?.[PAD[opposite]]);
  let between;
  if (alongMain) {
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

/** "td padding-left 16 → 12": the parts that are not the same on both sides. */
function partsThatDiffer(designed, built) {
  if (!designed || !built) return null;
  const before = new Map(designed.map((part) => [partKey(part), part.value]));
  const after = new Map(built.map((part) => [partKey(part), part.value]));
  const out = [];
  for (const key of new Set([...before.keys(), ...after.keys()])) {
    const x = before.get(key) ?? 0;
    const y = after.get(key) ?? 0;
    if (Math.abs(x - y) > 0.01) out.push(`${key} ${fmt(x)} → ${fmt(y)}`);
  }
  return out.length ? out : null;
}

/* --------------------------------------------------------------------- diff */

export function diffSpecs(refSpec, implSpec, { map = [] } = {}) {
  const ref = loadModel(refSpec);
  const impl = loadModel(implSpec);
  const context = {
    sameEngine: engineOf(refSpec.surface?.platform) === engineOf(implSpec.surface?.platform),
    sameFormFactor: sameFormFactor(refSpec, implSpec),
    sameTool: refSpec.surface?.platform === implSpec.surface?.platform,
  };
  const { pairs, unmatchedRef, unmatchedImpl } = matchPrimitives(ref, impl, map);
  const counterpart = (node) => pairs.get(node).node;
  const label = (node) => (node.kind === "text" ? `"${node.name}"` : leaf(node));
  let findings = [];
  const push = (finding) => {
    const entry = { status: "open", intent: "drift", ...finding };
    findings.push(entry);
    return entry;
  };

  // Frames: the smallest paired painted box around each reference primitive.
  const pairedBoxes = [...pairs.keys()].filter((node) => isBox(node) && node.paints);
  const frames = new Map();
  const members = new Map();
  for (const node of pairs.keys()) {
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
  const placed = new Map(); // reference node → sits where the reference has it
  const resized = { x: new Map(), y: new Map() }; // reference node → its size finding

  for (const [a, { node: b, how }] of pairs) {
    const base = { block: label(a), reference: a.id, implementation: b.id, selector: b.selector, leaf: leaf(b), y: a.rect.y };

    // --- how it looks
    const appearance = compareAppearance(a, b, context);
    if (!appearance.some((item) => (item.intent || "drift") === "drift")) appearancePass += 1;
    for (const item of appearance) {
      push({ ...base, gate: "appearance", specField: item.field, intent: item.intent || "drift", expected: item.expected, actual: item.actual, delta: [item.label], tokens: tokenFor(a, b, item.field) });
    }

    // --- how big it is
    const dw = b.rect.width - a.rect.width;
    const dh = b.rect.height - a.rect.height;
    const widthTol = a.kind === "text" ? Math.max(TOL.textWidth, a.rect.width * 0.015) : TOL.geometry;
    const inPlace = Math.abs(b.rect.x - a.rect.x) <= TOL.geometry && Math.abs(b.rect.y - a.rect.y) <= TOL.geometry && Math.abs(dw) <= widthTol && Math.abs(dh) <= TOL.geometry;
    placed.set(a, inPlace);
    if (inPlace) geometryPass += 1;

    const explained = new Set(appearance.map((item) => item.field));
    const sizeFinding = (axis, word, before, after, change, causes) => {
      const fixed = Boolean(a.box?.fixed?.[word] || b.box?.fixed?.[word]);
      const byLook = a.kind === "text" && causes.some((field) => explained.has(field));
      const entry = push({
        ...base,
        gate: "geometry",
        specField: `size.${word}`,
        axis,
        expected: round(before),
        actual: round(after),
        delta: [`${word} ${fmt(before)}px → ${fmt(after)}px (${signed(change)})${fixed && isBox(a) ? " — set explicitly" : ""}`],
        // A text block is as big as its words and type make it; a box with no explicit size
        // is as big as its content or its container make it. Neither is a cause by itself.
        derived: byLook,
        follows: isBox(a) && !fixed,
        node: a,
      });
      resized[axis].set(a, entry);
    };
    if (Math.abs(dw) > widthTol) sizeFinding("x", "width", a.rect.width, b.rect.width, dw, ["text", "type.transform", "type.size", "type.weight", "type.letterSpacing", "type.family", "type.lines", "type.truncated"]);
    if (Math.abs(dh) > TOL.geometry) sizeFinding("y", "height", a.rect.height, b.rect.height, dh, ["type.lineHeight", "type.lines", "type.size", "type.truncated"]);

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
      if (Math.abs(line.change) <= TOL.geometry) continue;
      const other = redline[AXIS[side].opposite];
      const refDeclared = declaredSpacing(ref, a, side, line.neighbour, frame);
      const implDeclared = declaredSpacing(impl, b, side, line.neighbour ? counterpart(line.neighbour) : null, frame ? counterpart(frame) : null);
      const refDesigned = Boolean(refDeclared) && Math.abs(refDeclared.total - line.expected) <= TOL.declared;
      const implDesigned = Boolean(implDeclared) && Math.abs(implDeclared.total - line.actual) <= TOL.declared;
      const centredBefore = Math.abs(line.expected - other.expected) <= 1;
      const centredAfter = Math.abs(line.actual - other.actual) <= 1;
      const displaced = Math.abs(other.change) > TOL.geometry && !(centredBefore && centredAfter);

      // A distance that is leftover space on both sides and whose far end held still is only
      // following something else; it is not a difference of its own.
      if (!refDesigned && !implDesigned && !displaced) continue;
      if (!refDesigned && !implDesigned && (side === "bottom" || side === "right")) continue; // report a displacement once

      const axis = vertical(side) ? "y" : "x";
      const against = line.neighbour ? label(line.neighbour) : frame ? `the ${side} edge of ${label(frame)}` : `the ${side} edge of the screen`;
      const what = line.neighbour ? `gap ${{ top: "above", bottom: "below", left: "before", right: "after" }[side]}` : `${side} inset`;
      const centring = centredBefore && !centredAfter ? ` — centred ${vertical(side) ? "vertically" : "horizontally"} in the reference, not in the implementation` : "";
      const differs = context.sameTool && refDesigned && implDesigned ? partsThatDiffer(refDeclared.parts, implDeclared.parts) : null;
      moved.push(
        push({
          ...base,
          gate: "geometry",
          specField: refDesigned || implDesigned ? `spacing.${side}` : `position.${axis}`,
          axis,
          expected: line.expected,
          actual: line.actual,
          delta: [`${what} ${fmt(line.expected)}px → ${fmt(line.actual)}px (${signed(line.change)}), measured to ${against}${centring}`],
          differs,
          designedAs: refDesigned ? describeParts(refDeclared.parts) : null,
          builtFrom: implDesigned ? describeParts(implDeclared.parts) : null,
          // The reference declares this distance: it is a value, and it is simply different.
          // Leftover space in the reference may only be echoing a size change beside it.
          firm: refDesigned,
          beside: [a, line.neighbour, ...siblings].filter(Boolean),
          edge: line.neighbour ? [side === "top" || side === "left" ? line.neighbour.id : a.id, side === "top" || side === "left" ? a.id : line.neighbour.id, axis].join(">") : `${a.id}|${side}`,
          group: line.neighbour ? null : `${frame ? frame.id : "root"}|${side}|${line.change}|${refDesigned}|${implDesigned}`,
          node: a,
          matchedBy: how,
        }),
      );
    }

    // Alignment is the simpler way to say "it moved sideways and nothing else changed".
    if (a.kind === "text" && b.kind === "text" && a.type?.align && b.type?.align && a.type.align !== b.type.align) {
      const sideways = moved.filter((finding) => finding.axis === "x");
      if (sideways.length || num(a.type.lines) > 1 || num(b.type.lines) > 1) {
        push({ ...base, gate: "appearance", specField: "type.align", expected: a.type.align, actual: b.type.align, delta: [`text alignment ${a.type.align} → ${b.type.align}`], tokens: [] });
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

  // 1. Leftover space in the reference that changed beside something that changed size.
  for (const finding of geometric) {
    if (finding.beside && !finding.firm && finding.beside.some((node) => resized[finding.axis].has(node))) finding.derived = true;
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
    if (!finding.specField.startsWith("size.") || finding.derived) continue;
    if (geometric.some((other) => other.firm && other.axis === finding.axis && other.beside && (other.beside[0] === finding.node || other.beside[1] === finding.node) && other.edge.includes(">"))) finding.derived = true;
  }
  // 4. If every lead was explained away, the largest unexplained change is the lead.
  const hasCause = findings.some((finding) => finding.intent === "drift" && !finding.derived);
  if (!hasCause) {
    for (const axis of ["x", "y"]) {
      const followers = geometric.filter((finding) => finding.axis === axis && finding.derived).sort((p, q) => Math.abs(q.actual - q.expected) - Math.abs(p.actual - p.expected));
      if (followers[0]) {
        followers[0].derived = false;
        followers[0].delta[0] += " — unexplained: nothing measured accounts for it";
      }
    }
  }

  for (const node of unmatchedRef) {
    push({ gate: "presence", specField: "presence", block: label(node), reference: node.id, leaf: leaf(node), y: node.rect.y, expected: `${node.kind} present`, actual: "no counterpart", delta: [`${node.kind} has no counterpart in the implementation — missing, or drawn another way (the pixel check decides)`] });
  }
  for (const node of unmatchedImpl) {
    push({ gate: "presence", specField: "presence", block: label(node), implementation: node.id, selector: node.selector, leaf: leaf(node), y: node.rect.y, expected: "not in the reference", actual: `${node.kind} present`, delta: [`${node.kind} exists only in the implementation — extra, or drawn another way (the pixel check decides)`] });
  }

  // The same difference on every instance of a repeated component — or the same padding
  // seen from several of its children — is one thing to fix.
  const merged = new Map();
  for (const finding of findings) {
    const key = finding.differs
      ? ["spacing", finding.differs.join("&"), Boolean(finding.derived)].join("|")
      : [finding.gate, finding.specField, finding.intent, finding.expected, finding.actual, finding.leaf, finding.builtFrom, finding.designedAs, Boolean(finding.derived)].join("|");
    const instance = { block: finding.block, reference: finding.reference, implementation: finding.implementation };
    const first = merged.get(key);
    if (!first) {
      merged.set(key, finding);
      finding.instances = [instance];
    } else first.instances.push(instance);
  }
  const rank = (finding) => (finding.derived ? 3 : finding.gate === "appearance" ? 0 : finding.firm ? 0 : 1);
  findings = [...merged.values()].sort((p, q) => rank(p) - rank(q) || p.y - q.y);
  findings.forEach((finding, index) => {
    finding.id = `PV-${String(index + 1).padStart(3, "0")}`;
    for (const key of ["edge", "group", "y", "beside", "firm", "leaf", "axis", "follows", "node"]) delete finding[key];
    if (finding.instances.length === 1) delete finding.instances;
    if (!finding.differs) delete finding.differs;
  });

  const open = findings.filter((finding) => finding.intent === "drift");
  return {
    title: `${refSpec.surface?.name || "Reference"} — visual parity`,
    parity: { engines: context.sameEngine ? "same" : "cross", formFactor: context.sameFormFactor ? "same" : "cross" },
    scores: {
      primitives: { reference: ref.prims.length, implementation: impl.prims.length, paired: pairs.size, unpairedReference: unmatchedRef.length, unpairedImplementation: unmatchedImpl.length },
      appearance: pct(appearancePass, pairs.size),
      geometry: pct(geometryPass, pairs.size),
      toFix: open.filter((finding) => !finding.derived).length,
      consequences: open.filter((finding) => finding.derived).length,
      leaveAlone: findings.length - open.length,
    },
    // Which implementation primitives are not where the reference has them — the pixel check
    // uses this to tell a region it can explain from one it cannot.
    displaced: [...pairs.entries()].filter(([a]) => !placed.get(a)).map(([, { node }]) => node.id),
    // …and where the reference had them: the spot something moved away from differs too.
    vacated: [...pairs.keys()].filter((a) => !placed.get(a)).map((a) => a.rect),
    findings,
  };
}

function tokenFor(a, b, field) {
  const key = field.startsWith("border") ? "border" : field.startsWith("radius") ? "radius" : field === "gradient" ? "background" : field;
  const token = a.tokenRefs?.[key] || b.tokenRefs?.[key];
  return token ? [token] : [];
}

function pct(part, whole) {
  return whole ? Math.round((part / whole) * 1000) / 10 : null;
}

function engineOf(platform) {
  return { web: "css", figma: "css" }[platform] || "native";
}

function sameFormFactor(a, b) {
  const wa = a.surface?.root?.width || a.surface?.viewport?.width;
  const wb = b.surface?.root?.width || b.surface?.viewport?.width;
  if (!wa || !wb) return true;
  return Math.abs(wa - wb) / Math.max(wa, wb) <= 0.15;
}

/* ---------------------------------------------------------------------- cli */

export function summarize(report, { limit = 60 } = {}) {
  const s = report.scores;
  const lines = [
    `paired ${s.primitives.paired}/${s.primitives.reference} primitives · appearance ${s.appearance}% · geometry ${s.geometry}%`,
    `${s.toFix} to fix · ${s.consequences} consequences (re-measure, do not fix) · ${s.leaveAlone} leave-alone`,
  ];
  for (const finding of report.findings.slice(0, limit)) {
    const tag = finding.intent !== "drift" ? "leave" : finding.derived ? "  ↳  " : " fix ";
    const count = finding.instances ? `  ×${finding.instances.length}` : "";
    const where = finding.selector ? `  [${finding.selector.split(" > ").slice(-2).join(" > ")}]` : "";
    const head = finding.differs ? finding.differs.join("; ") : `${finding.block}: ${finding.delta[0]}`;
    lines.push(`${finding.id} ${tag} ${head}${count}${where}`);
    if (finding.differs) lines.push(`             seen as: ${finding.block}: ${finding.delta[0]}`);
    else {
      if (finding.witnesses?.length > 1) lines.push(`             same change seen on: ${finding.witnesses.join(", ")}`);
      if (finding.designedAs) lines.push(`             design: ${finding.designedAs.join(" + ") || "0"}`);
      if (finding.builtFrom) lines.push(`             build:  ${finding.builtFrom.join(" + ") || "0"}`);
    }
    if (finding.tokens?.length) lines.push(`             token:  ${finding.tokens.join(", ")}`);
  }
  if (report.findings.length > limit) lines.push(`… ${report.findings.length - limit} more`);
  return lines.join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const flag = (name) => (args.indexOf(name) >= 0 ? args[args.indexOf(name) + 1] : "");
  if (!flag("--reference") || !flag("--implementation")) {
    console.log("Usage: node parity_diff.mjs --reference <spec.json> --implementation <spec.json> [--output <findings.json>] [--map <pairs.json>]");
    process.exit(1);
  }
  const map = flag("--map") ? JSON.parse(fs.readFileSync(flag("--map"), "utf8")) : [];
  const report = diffSpecs(JSON.parse(fs.readFileSync(flag("--reference"), "utf8")), JSON.parse(fs.readFileSync(flag("--implementation"), "utf8")), { map });
  if (flag("--output")) {
    fs.mkdirSync(path.dirname(path.resolve(flag("--output"))), { recursive: true });
    fs.writeFileSync(flag("--output"), `${JSON.stringify(report, null, 2)}\n`);
  }
  console.log(summarize(report));
}
