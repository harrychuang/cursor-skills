// Shared prototype benchmark: for each seeded variant run one full cycle and record the verdict.
import fs from "node:fs";
import path from "node:path";
import { launchChrome } from "../../prototype/cdp.mjs";
import { capture } from "../../prototype/capture_web.mjs";
import { diffSpecs } from "../../prototype/parity_diff.mjs";
import { runPixelDiff } from "../../prototype/pixel_diff.mjs";
import { judge, probesFor } from "../../prototype/parity.mjs";

export async function benchPrototype({ dir, root, viewport, suffix = ".html", items }) {
  const pages = path.join(dir, "pages");
  const out = path.join(dir, "out", "proto");
  fs.mkdirSync(out, { recursive: true });
  const browser = await launchChrome();
  const page = await browser.newPage(viewport);
  const shot = async (file, name) => {
    const png = path.join(out, `${name}.png`);
    const spec = await capture(page, path.join(pages, file), { root, name, states: ["hover"] });
    const r = spec.surface.root;
    await page.goto(`file://${path.join(pages, file)}`);
    await page.screenshot(png, { x: r.pageX, y: r.pageY, width: r.width, height: r.height });
    return { spec, png };
  };
  const reference = await shot("reference.html", "reference");
  const results = {};
  for (const item of items) {
    const impl = await shot(`impl-${item.id}${suffix}`, item.id);
    const report = diffSpecs(reference.spec, impl.spec);
    const px = runPixelDiff({ referencePath: reference.png, implementationPath: impl.png, out: path.join(out, `px-${item.id}`), spec: impl.spec, referenceDensity: viewport.dpr, implementationDensity: viewport.dpr, tolerance: 1, threshold: 0.02, maxCrops: 0, probes: probesFor(impl.spec) });
    const result = judge(report, px, impl.spec);
    fs.writeFileSync(path.join(out, `${item.id}.parity.json`), JSON.stringify(result, null, 1));
    const fix = result.findings.filter((f) => f.intent === "drift" && !f.derived);
    results[item.id] = {
      parity: result.verdict.parity,
      toFix: fix.length,
      consequences: result.scores.consequences,
      paired: `${result.scores.primitives.paired}/${result.scores.primitives.reference}`,
      appearance: result.scores.appearance,
      geometry: result.scores.geometry,
      regions: px.regions.length,
      unexplained: result.pixels.unexplained,
      share: px.differingShare,
      findings: fix.map((f) => `${f.differs ? f.differs.join("; ") : `${f.block}: ${f.delta[0]}`}${f.instances ? ` ×${f.instances.length}` : ""}${f.visible === false ? "  (not visible in this capture)" : ""}`),
    };
  }
  await browser.close();
  fs.writeFileSync(path.join(out, "results.json"), JSON.stringify(results, null, 1));
  return results;
}

export function printTable(results, items) {
  console.log("id      verdict  spec diff        pixels             what  →  what the prototype says first");
  for (const item of items) {
    const r = results[item.id];
    const spec = r.toFix || r.consequences ? `${r.toFix} fix +${r.consequences}↳` : "—";
    const px = r.regions ? `${r.regions}r (${r.unexplained} unexpl.)` : "—";
    console.log(`${item.id.padEnd(7)} ${(r.parity ? "PARITY" : "differs").padEnd(8)} ${spec.padEnd(16)} ${px.padEnd(18)} ${item.what || ""}  →  ${r.findings[0] || "(no finding)"}`);
  }
}
