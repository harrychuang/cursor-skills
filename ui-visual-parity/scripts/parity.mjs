#!/usr/bin/env node

/**
 * One measurement cycle: capture the implementation, compare it with the reference three
 * ways (how each thing looks, where each thing is, the picture itself), and say whether it
 * is at parity.
 *
 *   node parity.mjs --reference <reference.spec.json> --reference-image <reference.png> \
 *     --url <implementation url or file> --root <selector> --out parity/cycle-01 \
 *     [--viewport 390x844] [--dpr 2] [--theme light|dark] [--states hover,focus-visible] [--renderer same|other] \
 *     [--previous parity/cycle-00] [--policy policy.json] [--map pairs.json] [--remaps remaps.json] \
 *     [--ignore regions.json] [--tolerance 1] [--limit 40]
 *
 * Exit code 0: parity. 1: compared and not at parity. 2: could not run.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchChrome } from "./cdp.mjs";
import { capture, STATES } from "./capture_web.mjs";
import { diffSpecs, loadPolicy, summarize } from "./parity_diff.mjs";
import { runPixelDiff, summarizePixels } from "./pixel_diff.mjs";

const overlaps = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/**
 * Boxes to count differing pixels in: every element, grown by what its shadow covers. An
 * element that paints nothing is probed too — a border that was never drawn is reported on it.
 */
export function probesFor(implSpec) {
  return implSpec.nodes
    .filter((node) => node.rect && node.rect.width > 0 && node.rect.height > 0)
    .map((node) => {
      const spill = (Array.isArray(node.shadow) ? node.shadow : []).reduce((most, s) => Math.max(most, Math.abs(s.x) + s.blur + s.spread, Math.abs(s.y) + s.blur + s.spread), 1);
      return { id: node.id, x: node.rect.x - spill, y: node.rect.y - spill, width: node.rect.width + spill * 2, height: node.rect.height + spill * 2 };
    });
}

/**
 * Join the spec diff and the pixel overlay into one verdict.
 *
 *  - Every pixel region is either explained (it falls on something the diff already reports,
 *    on something that is not where the reference has it, or on the place such a thing
 *    occupies in the reference) or unexplained: the picture differs there and no measured
 *    property says why. Unexplained regions are the details only the picture can show, and
 *    each one needs a look.
 *  - Every appearance finding learns whether it is visible in this capture.
 *
 *  - A region on a difference that is meant to be there (an adaptation, a satisfied
 *    accessibility remap) is sanctioned: it is listed, and it does not stand in the way.
 *
 * Parity needs every check that could run to pass: nothing to fix, nothing untrusted, every
 * reference primitive paired and in place, and no differing region other than sanctioned
 * ones, in a picture of the same size.
 */
export function judge(report, pixels, implSpec) {
  const s = report.scores;
  const checked = [...report.parity.checked];
  let parity = !report.parity.partial && s.toFix === 0 && s.untrusted === 0 && s.primitives.unpairedReference === 0;
  if (checked.includes("geometry")) parity = parity && s.geometry === 100;

  const result = { ...report, pixels: null, regions: [] };
  // Across form factors the two pictures are not meant to line up, so the overlay is not a check.
  if (pixels && report.parity.formFactor === "same") {
    checked.push("pixels");
    const touched = new Set(report.displaced);
    const left = new Set();
    for (const finding of report.findings) {
      for (const item of [finding, ...(finding.instances || [])]) if (item.implementation) (finding.action === "leave" ? left : touched).add(item.implementation);
    }
    for (const region of pixels.regions) {
      const grown = { x: region.x - 2, y: region.y - 2, width: region.width + 4, height: region.height + 4 };
      const hit = implSpec.nodes.filter((node) => node.rect && node.rect.width > 0 && overlaps(node.rect, grown) && (node.paints || touched.has(node.id) || left.has(node.id)));
      // The root always overlaps; it explains a region only when nothing smaller is there.
      const specific = hit.filter((node) => node.parent);
      const on = specific.length ? specific : hit;
      region.explained = on.some((node) => touched.has(node.id)) || (report.vacated || []).some((rect) => overlaps(rect, grown));
      // Only a leave-alone difference is there: the region is what that difference looks like.
      region.sanctioned = !region.explained && on.some((node) => left.has(node.id));
      if (region.sanctioned) region.explained = true;
    }
    for (const finding of report.findings) {
      if (finding.gate !== "appearance" || !finding.implementation) continue;
      const ids = [finding.implementation, ...(finding.instances || []).map((item) => item.implementation)];
      finding.visible = ids.some((id) => (pixels.probed?.[id] || 0) > 0);
    }
    result.pixels = { differingShare: pixels.differingShare, regions: pixels.regions.length, unexplained: pixels.regions.filter((region) => !region.explained).length, sanctioned: pixels.regions.filter((region) => region.sanctioned).length, sizeMatches: pixels.sizeMatches, excusedPixels: pixels.excusedPixels, ignoredAreas: pixels.ignoredAreas, overlay: pixels.overlay, reference: pixels.reference, implementation: pixels.implementation };
    result.regions = pixels.regions;
    parity = parity && pixels.regions.every((region) => region.sanctioned) && pixels.sizeMatches;
  }
  result.verdict = { parity, checked, notChecked: ["appearance", "geometry", "pixels"].filter((name) => !checked.includes(name)) };
  delete result.displaced;
  delete result.vacated;
  return result;
}

/** What changed since the previous cycle: the count the loop watches, and anything new or worse. */
export function progress(result, previous) {
  const open = (item) => item.scores.toFix + (item.pixels?.unexplained || 0);
  const signature = (finding) => `${finding.gate}|${finding.specField}|${finding.block}`;
  const before = new Set(previous.findings.map(signature));
  const worse = [];
  for (const [name, now, then] of [
    ["appearance", result.scores.appearance, previous.scores.appearance],
    ["geometry", result.scores.geometry, previous.scores.geometry],
    ["pixels", result.pixels ? 100 - result.pixels.differingShare : null, previous.pixels ? 100 - previous.pixels.differingShare : null],
  ]) {
    if (typeof now === "number" && typeof then === "number" && now < then - 0.05) worse.push(`${name} ${Math.round(then * 100) / 100}% → ${Math.round(now * 100) / 100}%`);
  }
  return {
    open: open(result),
    openBefore: open(previous),
    appeared: result.findings.filter((finding) => finding.action === "fix" && !before.has(signature(finding))).map((finding) => `${finding.id} ${finding.block}: ${finding.delta[0]}`),
    worse,
  };
}

/** The density a picture was taken at: its width in pixels over the surface's width in CSS px. */
export function densityOf(file, spec) {
  const cssWidth = spec.surface?.root?.width;
  if (!cssWidth) return null;
  const head = Buffer.alloc(24);
  const fd = fs.openSync(file, "r");
  fs.readSync(fd, head, 0, 24, 0);
  fs.closeSync(fd);
  const ratio = head.readUInt32BE(16) / cssWidth;
  return Math.round(ratio) >= 1 && Math.abs(ratio - Math.round(ratio)) <= 0.02 * ratio ? Math.round(ratio) : null;
}

export function scorecard(result) {
  const s = result.scores;
  const cell = (value) => (value === null || value === undefined ? "    —" : String(value).padStart(5) + "%");
  const scope = result.verdict.notChecked.length ? ` for ${result.verdict.checked.join(" and ")} only` : "";
  const lines = [result.verdict.parity ? `PARITY ✓${scope}` : result.parity.partial ? "PARTIAL — appearance only; this comparison cannot establish parity" : "NOT AT PARITY"];
  lines.push(`  appearance ${cell(s.appearance)}   primitives that look the same`);
  lines.push(`  geometry   ${cell(s.geometry)}   primitives exactly where the reference has them`);
  if (result.pixels) lines.push(`  pixels     ${cell(Math.round((100 - result.pixels.differingShare) * 100) / 100)}   of the picture identical · ${result.pixels.regions} differing region(s), ${result.pixels.unexplained} with no measured explanation${result.pixels.sanctioned ? `, ${result.pixels.sanctioned} on leave-alone differences` : ""}`);
  lines.push(`  paired ${s.primitives.paired}/${s.primitives.reference} primitives · ${s.toFix} to fix · ${s.consequences} consequences · ${s.leaveAlone} leave-alone · ${s.untrusted} untrusted`);
  if (result.parity.skipped?.length) lines.push(`  left out as OS chrome or platform-only: ${result.parity.skipped.slice(0, 8).join(", ")}${result.parity.skipped.length > 8 ? `, … ${result.parity.skipped.length - 8} more` : ""}`);
  if (result.parity.ignoredAreas) lines.push(`  left out on request: ${result.parity.ignoredAreas} area(s), and everything in them`);
  if (result.verdict.notChecked.length) lines.push(`  not checked: ${result.verdict.notChecked.join(", ")}${result.verdict.notChecked.includes("pixels") && result.parity.formFactor === "same" ? " (no reference image was given — the picture itself was not compared)" : ""}`);
  return lines.join("\n");
}

async function main() {
  const args = process.argv.slice(2);
  const flag = (name, fallback = "") => (args.indexOf(name) >= 0 ? args[args.indexOf(name) + 1] : fallback);
  if (!flag("--reference") || !flag("--url")) {
    console.error(
      "Usage: node parity.mjs --reference <reference.spec.json> [--reference-image <png>] --url <url|file> --root <selector> --out <dir>\n" +
        "         [--viewport 390x844] [--dpr 2] [--theme light|dark] [--states hover,focus-visible] [--previous <last cycle's folder>]\n" +
        "         [--renderer same|other] [--reference-density 2] [--tolerance 1] [--threshold 0.02] [--ignore <areas.json>]\n" +
        "         [--policy <policy.json>] [--map <pairs.json>] [--remaps <remaps.json>] [--limit 40]",
    );
    return 2;
  }
  const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
  const out = flag("--out", "parity");
  const refSpec = read(flag("--reference"));
  const policy = loadPolicy(flag("--policy") || undefined);
  const [width, height] = flag("--viewport", `${refSpec.surface?.viewport?.width || refSpec.surface?.root?.width || 1280}x${refSpec.surface?.viewport?.height || 800}`).split("x").map(Number);
  // The implementation is captured the way the reference was: at the density of the
  // reference picture, and in the reference's colour scheme.
  const referenceDensity = Number(flag("--reference-density")) || (flag("--reference-image") ? densityOf(flag("--reference-image"), refSpec) : null) || refSpec.surface?.density || null;
  const dpr = Number(flag("--dpr")) || referenceDensity || 2;
  const theme = flag("--theme", refSpec.surface?.theme || "light");
  if (!["light", "dark"].includes(theme)) throw new Error(`--theme is light or dark, not ${theme}`);
  const ignore = flag("--ignore") ? read(flag("--ignore")) : [];

  fs.mkdirSync(out, { recursive: true });
  const browser = await launchChrome();
  let implSpec;
  try {
    const page = await browser.newPage({ width, height, dpr, theme });
    // Measure the states the reference was measured in, unless told otherwise.
    const states = flag("--states") ? flag("--states").split(",") : [...new Set(refSpec.nodes.flatMap((node) => Object.keys(node.states || {})))].filter((state) => STATES.includes(state));
    implSpec = await capture(page, flag("--url"), { root: flag("--root", "body"), name: "implementation", states, screenshot: path.join(out, "implementation.png") });
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(out, "implementation.spec.json"), JSON.stringify(implSpec));

  const report = diffSpecs(refSpec, implSpec, { map: flag("--map") ? read(flag("--map")) : [], policy, remaps: flag("--remaps") ? read(flag("--remaps")) : null, ignore });
  let pixels = null;
  if (flag("--reference-image")) {
    // An edge may blend one pixel differently and still be the same picture — two ways of
    // drawing the same round end do. Against another renderer (a design tool's export) the
    // colour threshold is looser as well, because every glyph edge is blended differently.
    const other = flag("--renderer", refSpec.surface?.platform === implSpec.surface?.platform ? "same" : "other") === "other";
    const mode = other ? policy.pixel.otherRenderer : policy.pixel.sameRenderer;
    pixels = runPixelDiff({
      referencePath: flag("--reference-image"),
      implementationPath: path.join(out, "implementation.png"),
      out,
      spec: implSpec,
      referenceDensity: referenceDensity || dpr,
      implementationDensity: dpr,
      tolerance: Number(flag("--tolerance", mode.tolerance)),
      threshold: Number(flag("--threshold", mode.threshold)),
      ignore,
      probes: probesFor(implSpec),
    });
    report.screenshots = { reference: path.relative(out, flag("--reference-image")), implementation: "implementation.png", diff: "pixel-diff.png" };
  }
  const result = judge(report, pixels, implSpec);
  const previousFile = flag("--previous") ? path.join(flag("--previous"), "parity.json") : "";
  result.cycle = 1;
  if (previousFile && fs.existsSync(previousFile)) {
    const previous = read(previousFile);
    result.progress = progress(result, previous);
    result.cycle = (previous.cycle || 1) + 1;
  }
  fs.writeFileSync(path.join(out, "parity.json"), `${JSON.stringify(result, null, 2)}\n`);

  console.log(scorecard(result));
  const fontless = [["reference", refSpec], ["implementation", implSpec]].filter(([, spec]) => spec.surface?.fonts?.aligned === false).map(([side]) => side);
  if (fontless.length) console.log(`  ⚠ fonts: the ${fontless.join(" and the ")} asked for a font that was not rendered — text metrics are untrusted until it is installed or loaded and that side is captured again`);
  if (implSpec.surface.stable === false) console.log("  ⚠ the surface kept changing between screenshots — something is still animating");
  if (result.pixels && !result.pixels.sizeMatches) console.log(`  ⚠ picture size differs: reference ${result.pixels.reference.width}×${result.pixels.reference.height}, implementation ${result.pixels.implementation.width}×${result.pixels.implementation.height} CSS px`);
  if (result.progress) {
    const p = result.progress;
    console.log(`  since the previous cycle: to fix + unexplained ${p.openBefore} → ${p.open}${p.open >= p.openBefore ? "  ⚠ no progress — stop and report what blocks the rest" : ""}`);
    for (const line of p.worse) console.log(`  ⚠ worse than the previous cycle: ${line} — revert the last edit`);
    for (const line of p.appeared.slice(0, 5)) console.log(`  ⚠ new since the previous cycle: ${line}`);
  }
  if (result.cycle > policy.loop.maxCycles) console.log(`  ⚠ this is cycle ${result.cycle}; the loop allows ${policy.loop.maxCycles} — stop and report what remains`);
  if (result.findings.length) console.log(`\n${summarize(result, { limit: Number(flag("--limit", "40")), header: false })}`);
  const unexplained = result.regions.filter((region) => !region.explained);
  if (unexplained.length) {
    console.log("");
    console.log(`unexplained regions — open each crop under ${out}, say what differs, then fix or record it:`);
    console.log(summarizePixels({ ...pixels, regions: unexplained }).split("\n").slice(1).join("\n"));
  }
  const sanctioned = result.regions.filter((region) => region.sanctioned);
  if (sanctioned.length) console.log(`\n${sanctioned.length} region(s) lie on leave-alone differences and do not count against parity: ${sanctioned.map((region) => `${region.id} on ${region.owner ? region.owner.name : "—"}`).join(", ")}`);
  return result.verdict.parity ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    process.exitCode = await main();
  } catch (error) {
    console.error(error.message.split("\n")[0]);
    process.exitCode = 2;
  }
}
