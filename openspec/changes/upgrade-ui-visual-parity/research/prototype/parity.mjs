#!/usr/bin/env node

/**
 * One measurement cycle: capture the implementation, compare it with the reference three
 * ways, and say whether it is at parity.
 *
 *   node parity.mjs --reference <reference.spec.json> --reference-image <reference.png> \
 *     --url <implementation url or file> --root <selector> --out parity/cycle-01 \
 *     [--viewport 390x844] [--dpr 2] [--states hover,focus-visible] [--renderer same|other]
 *
 * Exit code 0 means parity: nothing to fix, every primitive where the reference has it, and
 * no part of the picture differing without an explanation.
 */

import fs from "node:fs";
import path from "node:path";
import { launchChrome } from "./cdp.mjs";
import { capture } from "./capture_web.mjs";
import { diffSpecs, summarize } from "./parity_diff.mjs";
import { runPixelDiff, summarizePixels } from "./pixel_diff.mjs";

/**
 * Join the spec diff and the pixel overlay into one verdict.
 *
 *  - Every pixel region is either explained (it falls on something the spec diff already
 *    reports, or on something that is not where the reference has it) or unexplained: the
 *    picture differs there and no measured property says why. Unexplained regions are the
 *    details only the picture can show, and each one needs a look.
 *  - Every appearance finding learns whether it is visible in this capture.
 */
export function judge(report, pixels, implSpec) {
  if (!pixels) {
    return { ...report, pixels: null, verdict: { parity: report.scores.toFix === 0 && report.scores.geometry === 100 && report.scores.primitives.unpairedReference === 0, checked: ["appearance", "geometry"] } };
  }
  const byId = new Map(implSpec.nodes.map((node) => [node.id, node]));
  const touched = new Set(report.displaced);
  for (const finding of report.findings) {
    if (finding.intent !== "drift") continue;
    for (const item of [finding, ...(finding.instances || [])]) if (item.implementation) touched.add(item.implementation);
  }
  const overlaps = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
  for (const region of pixels.regions) {
    const grown = { x: region.x - 2, y: region.y - 2, width: region.width + 4, height: region.height + 4 };
    const hit = implSpec.nodes.filter((node) => node.paints && node.rect && overlaps(node.rect, grown));
    // The root always overlaps; it explains a region only when nothing smaller is there.
    const specific = hit.filter((node) => node.parent);
    region.explained = (specific.length ? specific : hit).some((node) => touched.has(node.id)) || (report.vacated || []).some((rect) => overlaps(rect, grown));
  }
  for (const finding of report.findings) {
    if (finding.gate !== "appearance" || !finding.implementation) continue;
    const ids = [finding.implementation, ...(finding.instances || []).map((item) => item.implementation)];
    finding.visible = ids.some((id) => (pixels.probed?.[id] || 0) > 0);
  }
  const unexplained = pixels.regions.filter((region) => !region.explained);
  return {
    ...report,
    pixels: { differingShare: pixels.differingShare, regions: pixels.regions.length, unexplained: unexplained.length, sizeMatches: pixels.sizeMatches, overlay: pixels.overlay },
    regions: pixels.regions,
    verdict: {
      parity: report.scores.toFix === 0 && report.scores.geometry === 100 && report.scores.primitives.unpairedReference === 0 && pixels.regions.length === 0 && pixels.sizeMatches,
      checked: ["appearance", "geometry", "pixels"],
    },
  };
}

export function probesFor(implSpec) {
  return implSpec.nodes
    .filter((node) => node.paints && node.rect)
    .map((node) => {
      const spill = (node.shadow || []).reduce((most, s) => Math.max(most, Math.abs(s.x) + s.blur + s.spread, Math.abs(s.y) + s.blur + s.spread), 1);
      return { id: node.id, x: node.rect.x - spill, y: node.rect.y - spill, width: node.rect.width + spill * 2, height: node.rect.height + spill * 2 };
    });
}

export function scorecard(result) {
  const s = result.scores;
  const lines = [];
  lines.push(result.verdict.parity ? "PARITY ✓" : "NOT AT PARITY");
  lines.push(`  appearance  ${String(s.appearance).padStart(5)}%   primitives that look the same`);
  lines.push(`  geometry    ${String(s.geometry).padStart(5)}%   primitives exactly where the reference has them`);
  if (result.pixels) lines.push(`  pixels      ${String(Math.round((100 - result.pixels.differingShare) * 100) / 100).padStart(5)}%   of the picture identical · ${result.pixels.regions} differing region(s), ${result.pixels.unexplained} with no measured explanation`);
  lines.push(`  paired ${s.primitives.paired}/${s.primitives.reference} primitives · ${s.toFix} to fix · ${s.consequences} consequences · ${s.leaveAlone} leave-alone`);
  return lines.join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const flag = (name, fallback = "") => (args.indexOf(name) >= 0 ? args[args.indexOf(name) + 1] : fallback);
  if (!flag("--reference") || !flag("--url")) {
    console.log("Usage: node parity.mjs --reference <reference.spec.json> [--reference-image <png>] --url <url|file> --root <selector> --out <dir> [--viewport 390x844] [--dpr 2] [--states hover] [--renderer same|other]");
    process.exit(2);
  }
  const out = flag("--out", "parity");
  fs.mkdirSync(out, { recursive: true });
  const refSpec = JSON.parse(fs.readFileSync(flag("--reference"), "utf8"));
  const [width, height] = flag("--viewport", `${refSpec.surface?.viewport?.width || 1280}x${refSpec.surface?.viewport?.height || 800}`).split("x").map(Number);
  const dpr = Number(flag("--dpr", "2"));
  const browser = await launchChrome();
  let implSpec;
  let stable = true;
  try {
    const page = await browser.newPage({ width, height, dpr });
    implSpec = await capture(page, flag("--url"), { root: flag("--root", "body"), name: "implementation", states: flag("--states") ? flag("--states").split(",") : [] });
    const r = implSpec.surface.root;
    stable = await page.screenshot(path.join(out, "implementation.png"), { x: r.pageX, y: r.pageY, width: r.width, height: r.height });
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(out, "implementation.spec.json"), JSON.stringify(implSpec));

  const report = diffSpecs(refSpec, implSpec, { map: flag("--map") ? JSON.parse(fs.readFileSync(flag("--map"), "utf8")) : [] });
  let pixels = null;
  if (flag("--reference-image")) {
    // An edge may blend one pixel differently and still be the same picture — two ways of
    // drawing the same round end do. Against another renderer (a design tool's export) the
    // colour threshold is looser as well, because every glyph edge is blended differently.
    const other = flag("--renderer", refSpec.surface?.platform === implSpec.surface?.platform ? "same" : "other") === "other";
    pixels = runPixelDiff({
      referencePath: flag("--reference-image"),
      implementationPath: path.join(out, "implementation.png"),
      out,
      spec: implSpec,
      referenceDensity: Number(flag("--reference-density", refSpec.surface?.density || dpr)),
      implementationDensity: dpr,
      tolerance: Number(flag("--tolerance", "1")),
      threshold: other ? 0.05 : 0.02,
      probes: probesFor(implSpec),
    });
  }
  const result = judge(report, pixels, implSpec);
  fs.writeFileSync(path.join(out, "parity.json"), `${JSON.stringify(result, null, 2)}\n`);

  console.log(scorecard(result));
  if (!implSpec.surface.fonts.aligned) console.log("  ⚠ fonts: the page asked for fonts the browser did not render — text metrics are not trustworthy");
  if (!stable) console.log("  ⚠ the surface kept changing between screenshots — something is still animating");
  console.log("");
  console.log(summarize(result, { limit: Number(flag("--limit", "40")) }));
  if (pixels && pixels.regions.length) {
    console.log("");
    console.log(summarizePixels({ ...pixels, regions: pixels.regions.filter((region) => !region.explained) }).replace(/^pixels:.*\n?/, `unexplained regions (look at each crop):\n`));
  }
  process.exit(result.verdict.parity ? 0 : 1);
}
