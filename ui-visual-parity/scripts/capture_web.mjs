#!/usr/bin/env node

/**
 * Capture a web surface: exhaustive UI Spec plus a repeatable screenshot, in one settled state.
 *
 *   node capture_web.mjs --url <url|file> --out <dir> --name reference \
 *     [--root <selector>] [--viewport 390x844] [--dpr 2] [--theme light|dark] [--states hover,focus-visible]
 *
 * Writes <out>/<name>.spec.json and <out>/<name>.png. Exit code 2 means the capture could
 * not run (no browser, the root selector matches nothing, bad arguments).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchChrome, toUrl } from "./cdp.mjs";

const EXTRACTOR = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "extract_dom.js"), "utf8");

// A generic keyword asks for "whatever this system uses"; only a named family can be missing.
const GENERIC_FAMILY = /^(-apple-system|blinkmacsystemfont|system-ui|ui-(sans-serif|serif|monospace|rounded)|sans-serif|serif|monospace|cursive|fantasy|emoji|math)$/i;
const MAX_FONT_PROBES = 120;
// The pseudo-classes a browser can be asked to hold on an element.
export const STATES = ["hover", "focus", "focus-visible", "focus-within", "active", "visited", "target"];

const at = (id) => `[data-ui-parity-node="${id}"]`;

export function fontsAligned(requested, loaded) {
  const used = loaded.map((family) => family.toLowerCase());
  return requested.every((family) => GENERIC_FAMILY.test(family) || used.some((name) => name.includes(family.toLowerCase()) || family.toLowerCase().includes(name)));
}

/**
 * Load `target` in `page` and measure it. `states` holds each named pseudo-class on every
 * interactive element in turn and records what it changes; `screenshot` is the PNG path.
 */
export async function capture(page, target, { root = "body", name = "surface", states = [], screenshot } = {}) {
  const unknown = states.filter((state) => !STATES.includes(state));
  if (unknown.length) throw new Error(`Unknown state ${unknown.join(", ")}. A web capture can hold: ${STATES.join(", ")}.`);
  await page.goto(toUrl(target));
  const spec = await page.evaluate(`(${EXTRACTOR})(${JSON.stringify({ root, name, mark: true })})`);
  spec.surface.density = page.viewport.dpr;
  spec.surface.theme = page.theme;

  // What font each text really rendered in. `font-family` only says what was asked for.
  const families = new Set();
  const hosts = [...new Set(spec.nodes.filter((node) => node.kind === "text").map((node) => node.parent))].slice(0, MAX_FONT_PROBES);
  for (const id of hosts) for (const font of await page.renderedFonts(at(id))) families.add(font.family);
  spec.surface.fonts.loaded = [...families];
  spec.surface.fonts.aligned = fontsAligned(spec.surface.fonts.requested, spec.surface.fonts.loaded);

  if (screenshot) {
    const r = spec.surface.root;
    spec.surface.stable = await page.screenshot(screenshot, { x: r.pageX, y: r.pageY, width: r.width, height: r.height });
    spec.surface.screenshot = path.basename(screenshot);
  }

  // Interaction states: hold each one on every interactive element and record what changes.
  if (states.length) {
    const snapshot = (id) => page.evaluate(`(${EXTRACTOR})(${JSON.stringify({ paintOf: at(id) })})`);
    for (const node of spec.nodes.filter((item) => item.interactive)) {
      const base = await snapshot(node.id);
      for (const state of states) {
        await page.forceState(at(node.id), [state]);
        const held = await snapshot(node.id);
        const changed = {};
        for (const key of Object.keys(held)) if (JSON.stringify(held[key]) !== JSON.stringify(base[key])) changed[key] = held[key];
        if (Object.keys(changed).length) (node.states ||= {})[state] = changed;
        await page.forceState(at(node.id), []);
      }
    }
  }
  return spec;
}

export function describeCapture(name, spec) {
  const fonts = spec.surface.fonts;
  const lines = [`${name}: ${spec.nodes.length} nodes, ${spec.nodes.filter((node) => node.paints).length} primitives · fonts asked for ${fonts.requested.join(", ")} → rendered with ${fonts.loaded.join(", ")}`];
  if (!fonts.aligned) lines.push("  ⚠ fonts: the page asked for a font the browser did not render — text metrics are not trustworthy until it is installed or loaded");
  if (spec.surface.stable === false) lines.push("  ⚠ the surface kept changing between screenshots — something is still animating");
  return lines.join("\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const flag = (key, fallback = "") => (args.indexOf(key) >= 0 ? args[args.indexOf(key) + 1] : fallback);
  const url = flag("--url");
  if (!url) {
    console.error("Usage: node capture_web.mjs --url <url|file> --out <dir> [--name implementation] [--root <selector>] [--viewport 390x844] [--dpr 2] [--theme light|dark] [--states hover,focus-visible]");
    process.exit(2);
  }
  const out = flag("--out", ".");
  const name = flag("--name", "implementation");
  const [width, height] = flag("--viewport", "390x844").split("x").map(Number);
  let browser;
  try {
    if (!["light", "dark"].includes(flag("--theme", "light"))) throw new Error(`--theme is light or dark, not ${flag("--theme")}`);
    browser = await launchChrome();
    const page = await browser.newPage({ width, height, dpr: Number(flag("--dpr", "2")), theme: flag("--theme", "light") });
    const spec = await capture(page, url, { root: flag("--root", "body"), name, states: flag("--states") ? flag("--states").split(",") : [], screenshot: path.join(out, `${name}.png`) });
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, `${name}.spec.json`), `${JSON.stringify(spec, null, 1)}\n`);
    console.log(describeCapture(name, spec));
  } catch (error) {
    console.error(error.message.split("\n")[0]);
    process.exitCode = 2;
  } finally {
    if (browser) await browser.close();
  }
}
