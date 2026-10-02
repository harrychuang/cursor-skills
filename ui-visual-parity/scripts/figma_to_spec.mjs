#!/usr/bin/env node

/**
 * Turn what a Figma tool returned into one UI Spec.
 *
 *   node figma_to_spec.mjs --parts page-0.json page-1.json … --out reference.spec.json
 *       Merge the pages extract_figma.js returned. Fails, naming the range, when a page is
 *       missing or was saved twice.
 *
 *   node figma_to_spec.mjs --metadata frame.xml --out reference.spec.json [--name "Frame"]
 *       When only a read-only Figma tool is available: convert its metadata tree (names,
 *       types, positions, sizes) into a geometry-only spec. Redlines and the pixel overlay
 *       work from it; it says nothing about colours, borders, or type.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const round = (value) => Math.round(value * 100) / 100;

/** A saved page may be the object itself, a JSON string of it, or wrapped by the tool that ran the script. */
function unwrap(data) {
  let value = data;
  for (let i = 0; i < 4; i += 1) {
    if (typeof value === "string") value = JSON.parse(value);
    else if (value && !Array.isArray(value.nodes) && value.result !== undefined) value = value.result;
    else break;
  }
  return value;
}

export function mergeParts(parts) {
  const pages = parts.map(unwrap);
  for (const page of pages) {
    if (page && page.error) throw new Error(`The capture script reported: ${page.error}`);
    if (!page || !Array.isArray(page.nodes) || typeof page.offset !== "number" || typeof page.total !== "number") throw new Error("A page is not the output of extract_figma.js: it needs total, offset, and nodes.");
  }
  if (!pages.length) throw new Error("No pages given.");
  const total = pages[0].total;
  if (pages.some((page) => page.total !== total)) throw new Error(`Pages disagree on the node count (${[...new Set(pages.map((page) => page.total))].join(" vs ")}): they come from different captures. Capture again from OFFSET = 0.`);

  pages.sort((a, b) => a.offset - b.offset);
  const nodes = [];
  let expected = 0;
  for (const page of pages) {
    if (page.offset > expected) throw new Error(`Missing nodes ${expected}–${page.offset - 1} of ${total}. Run the capture again with OFFSET = ${expected}.`);
    if (page.offset < expected) throw new Error(`Nodes ${page.offset}–${Math.min(expected, page.offset + page.nodes.length) - 1} of ${total} appear in more than one page. Keep one page per offset.`);
    nodes.push(...page.nodes);
    expected = page.offset + page.nodes.length;
  }
  if (expected < total) throw new Error(`Missing nodes ${expected}–${total - 1} of ${total}. Run the capture again with OFFSET = ${expected}.`);

  const surface = pages[0].surface;
  if (!surface) throw new Error("The first page (OFFSET = 0) carries the surface description and is not among the pages.");
  return { specVersion: "1.1", surface: { ...surface, capturedAt: surface.capturedAt || new Date().toISOString() }, nodes };
}

/* ----------------------------------------------------------------- metadata */

const ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'" };
const decode = (text) => text.replace(/&(amp|lt|gt|quot|apos|#39);/g, (entity) => ENTITIES[entity]);
const VECTOR_TAGS = new Set(["vector", "boolean-operation", "boolean_operation", "star", "polygon"]);

/** The metadata XML → a tree of { tag, attrs, children }. */
function parseTree(xml) {
  const rootHolder = { children: [] };
  const stack = [rootHolder];
  const token = /<\/([\w-]+)\s*>|<([\w-]+)((?:\s+[\w:.-]+\s*=\s*"[^"]*")*)\s*(\/?)>/g;
  let match;
  while ((match = token.exec(xml))) {
    if (match[1]) {
      if (stack.length > 1) stack.pop();
      continue;
    }
    const attrs = {};
    for (const pair of match[3].matchAll(/([\w:.-]+)\s*=\s*"([^"]*)"/g)) attrs[pair[1]] = decode(pair[2]);
    const node = { tag: match[2].toLowerCase(), attrs, children: [] };
    stack[stack.length - 1].children.push(node);
    if (!match[4]) stack.push(node);
  }
  return rootHolder.children;
}

/**
 * Metadata positions are relative to the parent in some tools and to the canvas in others.
 * Lay the tree out both ways and keep the reading that leaves more nodes inside the frame.
 */
export function specFromMetadata(xml, { name = "" } = {}) {
  const top = parseTree(xml).filter((node) => node.attrs.width !== undefined);
  if (top.length !== 1) throw new Error(`Expected the metadata of one frame, found ${top.length} top-level nodes. Ask for the metadata of a single frame.`);
  const root = top[0];
  const size = { width: Number(root.attrs.width), height: Number(root.attrs.height) };

  const lay = (absolute) => {
    const nodes = [];
    let inside = 0;
    const walk = (node, parent, depth, originX, originY) => {
      if (node.attrs.hidden === "true" || node.attrs.visible === "false") return;
      const width = Number(node.attrs.width);
      const height = Number(node.attrs.height);
      if (!Number.isFinite(width) || !Number.isFinite(height)) return;
      const isRoot = node === root;
      const x = isRoot ? 0 : absolute ? Number(node.attrs.x) - Number(root.attrs.x) : originX + Number(node.attrs.x);
      const y = isRoot ? 0 : absolute ? Number(node.attrs.y) - Number(root.attrs.y) : originY + Number(node.attrs.y);
      if (x >= -1 && y >= -1 && x + width <= size.width + 1 && y + height <= size.height + 1) inside += 1;
      const label = node.attrs.name || node.tag;
      const visible = node.children.filter((child) => child.attrs.hidden !== "true" && child.attrs.visible !== "false");
      const kind = node.tag === "text" ? "text" : VECTOR_TAGS.has(node.tag) ? "icon" : "box";
      const entry = {
        id: node.attrs.id || `${parent ? parent.id : "node"}/${nodes.length}`,
        parent: parent ? parent.id : null,
        depth,
        tag: node.tag,
        name: label,
        selector: `${parent ? `${parent.name} > ` : ""}${label}`,
        kind,
        // What a frame paints is unknown here. Every node may be a primitive; a frame with
        // children is marked as a wrapper so that not finding its counterpart is not a finding.
        paints: true,
        rect: { x: round(x), y: round(y), width: round(width), height: round(height) },
        keys: node.attrs.id ? { nodeId: node.attrs.id } : undefined,
      };
      if (kind === "box" && visible.length) entry.wrapper = true;
      if (kind === "text") entry.text = label;
      nodes.push(entry);
      if (kind !== "icon") for (const child of visible) walk(child, entry, depth + 1, x, y);
    };
    walk(root, null, 0, 0, 0);
    return { nodes, inside };
  };

  const relative = lay(false);
  const absolute = lay(true);
  const chosen = absolute.inside > relative.inside ? absolute : relative;
  return {
    specVersion: "1.1",
    surface: {
      name: name || root.attrs.name || "Figma frame",
      platform: "figma",
      source: root.attrs.id ? `figma node ${root.attrs.id}` : "figma metadata",
      viewport: size,
      density: 1,
      root: { selector: root.attrs.id || "root", width: size.width, height: size.height, pageX: 0, pageY: 0 },
      capturedAt: new Date().toISOString(),
      fidelity: "geometry-only",
      coordinates: chosen === absolute ? "canvas" : "parent",
    },
    nodes: chosen.nodes,
  };
}

/* ---------------------------------------------------------------------- cli */

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const flag = (name) => (args.indexOf(name) >= 0 ? args[args.indexOf(name) + 1] : "");
  const list = (name) => {
    const start = args.indexOf(name);
    if (start < 0) return [];
    const end = args.findIndex((arg, index) => index > start && arg.startsWith("--"));
    return args.slice(start + 1, end < 0 ? undefined : end);
  };
  const out = flag("--out");
  if (!out || (!list("--parts").length && !flag("--metadata"))) {
    console.error("Usage: node figma_to_spec.mjs --parts <page.json…> --out <spec.json>\n       node figma_to_spec.mjs --metadata <frame.xml> --out <spec.json> [--name <surface name>]");
    process.exit(2);
  }
  try {
    const spec = flag("--metadata") ? specFromMetadata(fs.readFileSync(flag("--metadata"), "utf8"), { name: flag("--name") }) : mergeParts(list("--parts").map((file) => JSON.parse(fs.readFileSync(file, "utf8"))));
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    fs.writeFileSync(out, `${JSON.stringify(spec, null, 1)}\n`);
    const primitives = spec.nodes.filter((node) => node.paints).length;
    console.log(`${spec.surface.name}: ${spec.nodes.length} nodes, ${primitives} primitives, ${spec.surface.root.width}×${spec.surface.root.height} · fidelity ${spec.surface.fidelity}${spec.surface.coordinates ? ` · positions read as relative to the ${spec.surface.coordinates}` : ""}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
