#!/usr/bin/env node

/**
 * Detection benchmark: does a cycle still report every seeded difference, and nothing for
 * an equal picture?
 *
 *   node tests/run_benchmark.mjs [--only wallet|settings] [--keep] [--verbose]
 *
 * For each benchmark page it generates one variant per seeded difference and per equivalent
 * rewrite, runs a full cycle on each, and checks:
 *   - the control (the unchanged page) is at parity;
 *   - every seeded difference produces the cause it declares;
 *   - every equivalent rewrite is at parity.
 * Exit code 0 only when all of that holds. Run it after any change to the scripts.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchChrome } from "../scripts/cdp.mjs";
import { capture } from "../scripts/capture_web.mjs";
import { diffSpecs, loadPolicy } from "../scripts/parity_diff.mjs";
import { runPixelDiff } from "../scripts/pixel_diff.mjs";
import { judge, probesFor } from "../scripts/parity.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : "";
const verbose = args.includes("--verbose");
const keep = args.includes("--keep");

function variant(html, item) {
  let out = item.dom ? item.dom(html) : html;
  if (item.dom && out === html) throw new Error(`${item.id}: its DOM edit matched nothing`);
  if (item.css) out = out.replace("</head>", `<style id="seeded">/* ${item.id} */ ${item.css}</style>\n</head>`);
  return out;
}

const causeText = (finding) => `${finding.differs ? `${finding.differs.join("; ")} | ` : ""}${finding.block}: ${finding.delta[0]}`;

async function runBenchmark(name, browser, work) {
  const { DEFECTS, DECOYS, SURFACE, prepare } = await import(`./benchmark/${name}/defects.mjs`);
  const source = fs.readFileSync(path.join(here, "benchmark", name, "reference.html"), "utf8");
  const dir = path.join(work, name);
  fs.mkdirSync(dir, { recursive: true });
  const policy = loadPolicy();
  const page = await browser.newPage(SURFACE.viewport);

  const shoot = async (id, html) => {
    const file = path.join(dir, `${id}.html`);
    fs.writeFileSync(file, html);
    const png = path.join(dir, `${id}.png`);
    const spec = await capture(page, file, { root: SURFACE.root, name: id, states: ["hover"], screenshot: png });
    return { spec, png };
  };
  const cycle = (reference, implementation, id) => {
    const report = diffSpecs(reference.spec, implementation.spec, { policy });
    const pixels = runPixelDiff({ referencePath: reference.png, implementationPath: implementation.png, out: path.join(dir, `out-${id}`), spec: implementation.spec, referenceDensity: SURFACE.viewport.dpr, implementationDensity: SURFACE.viewport.dpr, ...policy.pixel.sameRenderer, maxCrops: 0, probes: probesFor(implementation.spec) });
    return judge(report, pixels, implementation.spec);
  };

  const reference = await shoot("reference", source);
  const failures = [];
  const rows = [];
  const record = (id, what, ok, detail) => {
    rows.push(`${ok ? "ok  " : "FAIL"} ${id.padEnd(8)} ${what}${ok && !verbose ? "" : `  →  ${detail}`}`);
    if (!ok) failures.push(`${name}/${id}: ${detail}`);
  };

  const control = cycle(reference, await shoot("control", prepare(source)), "control");
  record("control", "the unchanged page is at parity", control.verdict.parity, control.verdict.parity ? `paired ${control.scores.primitives.paired}/${control.scores.primitives.reference}` : `${control.scores.toFix} to fix, ${control.pixels.regions} regions`);

  for (const item of DEFECTS) {
    const result = cycle(reference, await shoot(item.id, prepare(variant(source, item))), item.id);
    const causes = result.findings.filter((finding) => finding.action === "fix").map(causeText);
    const hit = causes.find((text) => item.expect.test(text));
    record(item.id, item.what, Boolean(hit) && !result.verdict.parity, hit ? `${hit}  (${result.scores.toFix} to fix, ${result.scores.consequences} consequences)` : `expected ${item.expect} among: ${causes.join(" || ") || "no causes"}`);
  }
  for (const item of DECOYS) {
    const result = cycle(reference, await shoot(item.id, prepare(variant(source, item))), item.id);
    const causes = result.findings.filter((finding) => finding.action === "fix").map(causeText);
    record(item.id, `${item.what} is at parity`, result.verdict.parity, result.verdict.parity ? "parity" : `${causes.join(" || ") || "no causes"}; ${result.pixels.regions} region(s)`);
  }
  await page.close();

  const passed = (list) => list.filter((item) => !failures.some((failure) => failure.startsWith(`${name}/${item.id}:`))).length;
  console.log(`\n${name}: differences ${passed(DEFECTS)}/${DEFECTS.length} · equivalent rewrites ${passed(DECOYS)}/${DECOYS.length} · control ${failures.some((failure) => failure.startsWith(`${name}/control:`)) ? "0/1" : "1/1"}`);
  for (const row of rows) if (verbose || row.startsWith("FAIL")) console.log(`  ${row}`);
  return failures;
}

const work = fs.mkdtempSync(path.join(os.tmpdir(), "ui-parity-benchmark-"));
const browser = await launchChrome();
let failures = [];
try {
  for (const name of ["wallet", "settings"]) if (!only || only === name) failures = failures.concat(await runBenchmark(name, browser, work));
} finally {
  await browser.close();
  if (keep) console.log(`\nvariants and outputs kept in ${work}`);
  else fs.rmSync(work, { recursive: true, force: true });
}
console.log(failures.length ? `\n${failures.length} check(s) failed.` : "\nAll benchmark checks passed.");
process.exitCode = failures.length ? 1 : 0;
