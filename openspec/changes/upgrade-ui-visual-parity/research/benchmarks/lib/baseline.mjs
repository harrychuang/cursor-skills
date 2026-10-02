// The pipeline the skill documents today, run exactly as written:
//   extraction = the computed-style snippet from ui-pixel-align-report/references/extract-code.md, verbatim
//   diff       = ui-pixel-align-report/scripts/diff_spec.mjs with its default policy
// Two bounds are measured. "plain": ids come from class names, as the snippet derives them.
// "tagged": every element carries a unique data-testid — every node is collected and every
// pair matches, which is the best this pipeline can do.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { launchChrome, toUrl } from "../../prototype/cdp.mjs";

const DIFF = process.env.OLD_DIFF_SPEC || path.join(os.homedir(), ".claude/skills/ui-pixel-align-report/scripts/diff_spec.mjs");

const SNIPPET = `[...document.querySelectorAll('[data-testid], header, main, aside, nav, footer, section, button, h1, h2, h3, li')]
  .map((el) => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      id: el.dataset.testid || el.id || el.className?.toString().split(' ')[0] || el.tagName.toLowerCase(),
      role: el.tagName.toLowerCase(),
      layout: { mode: s.display.includes('flex') ? (s.flexDirection.startsWith('row') ? 'row' : 'column') : s.display, justify: s.justifyContent, align: s.alignItems, gap: parseFloat(s.gap) || 0 },
      box: {
        width: Math.round(r.width), height: Math.round(r.height),
        padding: [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft].map(parseFloat),
        margin: [s.marginTop, s.marginRight, s.marginBottom, s.marginLeft].map(parseFloat),
        position: { x: Math.round(r.x), y: Math.round(r.y) },
      },
      type: { family: s.fontFamily.split(',')[0].replace(/"/g, ''), size: parseFloat(s.fontSize), weight: Number(s.fontWeight), lineHeight: parseFloat(s.lineHeight) || null, letterSpacing: parseFloat(s.letterSpacing) || 0 },
      fill: s.color, background: s.backgroundColor,
      border: { width: parseFloat(s.borderTopWidth), color: s.borderTopColor, style: s.borderTopStyle },
      radius: [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius].map(parseFloat),
      shadow: s.boxShadow === 'none' ? null : s.boxShadow,
      opacity: Number(s.opacity),
    };
  })`;

export async function benchBaseline({ dir, viewport, items }) {
  if (!fs.existsSync(DIFF)) throw new Error(`diff_spec.mjs not found at ${DIFF}. Set OLD_DIFF_SPEC to the installed ui-pixel-align-report script.`);
  const pages = path.join(dir, "pages");
  const out = path.join(dir, "out", "baseline");
  fs.mkdirSync(out, { recursive: true });
  const browser = await launchChrome();
  const page = await browser.newPage(viewport);
  const key = (f) => `${f.intent}|${f.specField}|${f.block}|${f.delta.join(";")}`;
  const spec = async (file) => {
    await page.goto(toUrl(path.join(pages, file)));
    return { specVersion: "1.0", surface: { name: file, platform: "web", viewport: { width: viewport.width, height: viewport.height }, density: 1, fidelity: "measured", fonts: { requested: ["Helvetica Neue"], loaded: ["Helvetica Neue"], aligned: true } }, nodes: await page.evaluate(SNIPPET) };
  };
  const diff = (refFile, implSpec, name) => {
    const implFile = path.join(out, `${name}.json`);
    fs.writeFileSync(implFile, JSON.stringify(implSpec));
    execFileSync("node", [DIFF, "-r", refFile, "-m", implFile, "-o", path.join(out, `${name}.findings.json`)], { stdio: "pipe" });
    return JSON.parse(fs.readFileSync(path.join(out, `${name}.findings.json`), "utf8"));
  };
  const results = {};
  for (const mode of ["plain", "tagged"]) {
    const suffix = mode === "tagged" ? ".tagged.html" : ".html";
    const refFile = path.join(out, `reference.${mode}.json`);
    fs.writeFileSync(refFile, JSON.stringify(await spec(`reference${suffix}`)));
    // Findings the pipeline raises on an identical page are its own noise, not detection.
    const noise = new Set(diff(refFile, await spec(`impl-control${suffix}`), `control.${mode}`).findings.map(key));
    for (const item of items) {
      const report = diff(refFile, await spec(`impl-${item.id}${suffix}`), `${item.id}.${mode}`);
      const fresh = report.findings.filter((f) => !noise.has(key(f)));
      (results[item.id] ||= {})[mode] = {
        convergence: report.candidateStats.convergence,
        drift: fresh.filter((f) => f.intent !== "adaptation").map((f) => `${f.block} · ${f.delta[0]}`),
        leaveAlone: fresh.filter((f) => f.intent === "adaptation").map((f) => `${f.block} · ${f.delta[0]}`),
      };
    }
  }
  await browser.close();
  fs.writeFileSync(path.join(out, "results.json"), JSON.stringify(results, null, 1));
  return results;
}

export function printBaseline(results, items) {
  const verdict = (r) => (r.drift.length ? `drift×${r.drift.length}` : r.leaveAlone.length ? "leave-alone" : "—");
  console.log("id      as-documented  best-case     what  →  best case's first findings");
  for (const item of items) {
    const r = results[item.id];
    console.log(`${item.id.padEnd(7)} ${verdict(r.plain).padEnd(14)} ${verdict(r.tagged).padEnd(13)} ${item.what || ""}  →  ${r.tagged.drift.slice(0, 2).join(" | ") || r.tagged.leaveAlone[0] || "(nothing)"}`);
  }
}
