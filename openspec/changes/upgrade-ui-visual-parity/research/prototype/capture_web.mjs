#!/usr/bin/env node
/**
 * Capture a web surface: exhaustive UI Spec + screenshot, in one settled state.
 *
 *   node capture_web.mjs --url <url|file> --out <dir> --name implementation \
 *     [--root <selector>] [--viewport 390x844] [--dpr 2] [--states hover,focus-visible]
 */
import fs from "node:fs";
import path from "node:path";
import { launchChrome, toUrl } from "./cdp.mjs";

const EXTRACTOR = fs.readFileSync(path.join(import.meta.dirname, "extract_dom.js"), "utf8");
const STATE_PROPS = `(sel) => { const el = document.querySelector(sel); if (!el) return null; const s = getComputedStyle(el);
  return { background: s.backgroundColor, color: s.color, borderColor: s.borderTopColor, borderWidth: s.borderTopWidth, boxShadow: s.boxShadow, opacity: s.opacity, outline: s.outlineStyle === 'none' ? 'none' : s.outlineWidth + ' ' + s.outlineStyle + ' ' + s.outlineColor, textDecoration: s.textDecorationLine, transform: s.transform }; }`;
const INTERACTIVE = "button, a[href], input, select, textarea, [role=button], [role=tab], [role=link], [tabindex]:not([tabindex='-1'])";

export async function capture(page, target, { root = "body", name = "surface", states = [], screenshot } = {}) {
  await page.goto(toUrl(target));
  const spec = await page.evaluate(`(${EXTRACTOR})(${JSON.stringify({ root, name })})`);
  spec.surface.density = page.viewport.dpr;

  // What font each text really rendered in. `font-family` only says what was asked for.
  const families = new Set();
  await page.evaluate(`(() => { let i = 0; const root = document.querySelector(${JSON.stringify(root)}) || document.body;
    for (const el of root.querySelectorAll('*')) { if ([...el.childNodes].some((n) => n.nodeType === 3 && /\\S/.test(n.nodeValue))) el.setAttribute('data-ui-parity-text', String(i++)); } return i; })()`);
  const count = await page.evaluate("document.querySelectorAll('[data-ui-parity-text]').length");
  for (let i = 0; i < Math.min(count, 60); i += 1) {
    for (const font of await page.renderedFonts(`[data-ui-parity-text="${i}"]`)) families.add(font.family);
  }
  spec.surface.fonts.loaded = [...families];
  // A generic keyword asks for "whatever this system uses"; only a named family can be missing.
  const GENERIC = /^(-apple-system|blinkmacsystemfont|system-ui|ui-(sans-serif|serif|monospace|rounded)|sans-serif|serif|monospace|cursive|fantasy|emoji|math)$/i;
  spec.surface.fonts.aligned = spec.surface.fonts.requested.every((family) => GENERIC.test(family) || [...families].some((loaded) => loaded.toLowerCase().includes(family.toLowerCase()) || family.toLowerCase().includes(loaded.toLowerCase())));

  if (screenshot) {
    const r = spec.surface.root;
    await page.screenshot(screenshot, { x: r.pageX, y: r.pageY, width: r.width, height: r.height });
    spec.surface.screenshot = path.basename(screenshot);
  }

  // Interaction states: hold each one on every interactive element and record what changes.
  if (states.length) {
    const selectors = await page.evaluate(`(() => { const root = document.querySelector(${JSON.stringify(root)}) || document.body; let i = 0; const out = [];
      for (const el of root.querySelectorAll(${JSON.stringify(INTERACTIVE)})) { el.setAttribute('data-ui-parity-ctl', String(i)); out.push('[data-ui-parity-ctl="' + i + '"]'); i += 1; } return out; })()`);
    const ids = await page.evaluate(`(${EXTRACTOR})(${JSON.stringify({ root, name })}).nodes.filter((n) => n.tag !== '#text').map((n) => n.id)`);
    const order = await page.evaluate(`(() => { const root = document.querySelector(${JSON.stringify(root)}) || document.body; const all = [root, ...root.querySelectorAll('*')].filter((el) => getComputedStyle(el).display !== 'none' && !['SCRIPT','STYLE','LINK','META','BR'].includes(el.tagName));
      return all.map((el) => el.getAttribute('data-ui-parity-ctl')); })()`);
    const byControl = new Map();
    // The extractor numbers elements in document order and skips the same ones, so the nth
    // rendered element is node n — except inside icons and hidden subtrees, which is why the
    // lookup is by selector text instead when counts disagree.
    const elementNodes = spec.nodes.filter((n) => n.tag !== "#text");
    for (const sel of selectors) {
      const match = await page.evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); const r = el.getBoundingClientRect(); const root = (document.querySelector(${JSON.stringify(root)}) || document.body).getBoundingClientRect(); return { x: Math.round((r.left - root.left) * 100) / 100, y: Math.round((r.top - root.top) * 100) / 100, w: Math.round(r.width * 100) / 100, tag: el.tagName.toLowerCase() }; })()`);
      const node = elementNodes.find((n) => n.tag === match.tag && Math.abs(n.rect.x - match.x) < 0.02 && Math.abs(n.rect.y - match.y) < 0.02 && Math.abs(n.rect.width - match.w) < 0.02);
      if (node) byControl.set(sel, node);
    }
    void ids;
    void order;
    for (const [sel, node] of byControl) {
      const base = await page.evaluate(`(${STATE_PROPS})(${JSON.stringify(sel)})`);
      for (const state of states) {
        await page.forceState(sel, [state]);
        const now = await page.evaluate(`(${STATE_PROPS})(${JSON.stringify(sel)})`);
        const changed = {};
        for (const key of Object.keys(now)) if (now[key] !== base[key]) changed[key] = now[key];
        if (Object.keys(changed).length) (node.states ||= {})[state] = changed;
        await page.forceState(sel, []);
      }
    }
  }
  return spec;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const flag = (name, fallback = "") => {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : fallback;
  };
  const url = flag("--url");
  const out = flag("--out", ".");
  const name = flag("--name", "implementation");
  if (!url) {
    console.log("Usage: node capture_web.mjs --url <url|file> --out <dir> [--name implementation] [--root <selector>] [--viewport 390x844] [--dpr 2] [--states hover,focus-visible]");
    process.exit(1);
  }
  const [width, height] = flag("--viewport", "390x844").split("x").map(Number);
  const browser = await launchChrome();
  try {
    const page = await browser.newPage({ width, height, dpr: Number(flag("--dpr", "2")) });
    const spec = await capture(page, url, { root: flag("--root", "body"), name, states: flag("--states") ? flag("--states").split(",") : [], screenshot: path.join(out, `${name}.png`) });
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, `${name}.spec.json`), `${JSON.stringify(spec, null, 1)}\n`);
    const prims = spec.nodes.filter((n) => n.paints).length;
    console.log(`${name}: ${spec.nodes.length} nodes, ${prims} primitives · fonts requested ${spec.surface.fonts.requested.join(", ")} → rendered ${spec.surface.fonts.loaded.join(", ")}${spec.surface.fonts.aligned ? "" : "  ⚠ font environment mismatched"}`);
  } finally {
    await browser.close();
  }
}
