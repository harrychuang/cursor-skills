#!/usr/bin/env node

/**
 * Overlay two captures of the same surface and report where the pictures differ.
 *
 * The spec diff can only compare what the specs can express. This is the check with no such
 * limit: whatever is on screen is in the picture. It reports differences as regions, names
 * the element each region falls on, and writes an enlarged reference | implementation |
 * difference crop per region, so a one-pixel detail can actually be looked at.
 *
 *   node pixel_diff.mjs --reference ref.png --implementation impl.png --out <dir> \
 *     [--spec impl.spec.json] [--reference-density 2] [--implementation-density 2] \
 *     [--tolerance 0|1] [--threshold 0.1] [--ignore regions.json]
 */

import fs from "node:fs";
import path from "node:path";
import { decodePng, encodePng, downscale, crop, upscale, sideBySide } from "./png.mjs";

/** Perceptual colour distance (YIQ), the measure pixelmatch uses. 0 = same, 35215 = black vs white. */
function colourDelta(a, i, b, j) {
  const blend = (c, alpha) => 255 + ((c - 255) * alpha) / 255;
  const aa = a[i + 3];
  const ba = b[j + 3];
  const r1 = blend(a[i], aa);
  const g1 = blend(a[i + 1], aa);
  const b1 = blend(a[i + 2], aa);
  const r2 = blend(b[j], ba);
  const g2 = blend(b[j + 1], ba);
  const b2 = blend(b[j + 2], ba);
  const y = (r1 - r2) * 0.29889531 + (g1 - g2) * 0.58662247 + (b1 - b2) * 0.11448223;
  const iq = (r1 - r2) * 0.59597799 - (g1 - g2) * 0.2741761 - (b1 - b2) * 0.32180189;
  const q = (r1 - r2) * 0.21147017 - (g1 - g2) * 0.52261711 + (b1 - b2) * 0.31114694;
  return 0.5053 * y * y + 0.299 * iq * iq + 0.1957 * q * q;
}

export function comparePixels(reference, implementation, { threshold = 0.1, tolerance = 0, ignore = [] } = {}) {
  const width = Math.min(reference.width, implementation.width);
  const height = Math.min(reference.height, implementation.height);
  const limit = 35215 * threshold * threshold;
  const slack = Math.round(255 * threshold * 0.6);
  const mask = new Uint8Array(width * height); // 1 = differs, 2 = differs but explained by a sub-pixel shift
  const a = reference.data;
  const b = implementation.data;
  let hard = 0;
  let soft = 0;

  const ignored = (x, y) => ignore.some((r) => x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * reference.width + x) * 4;
      const j = (y * implementation.width + x) * 4;
      if (colourDelta(a, i, b, j) <= limit) continue;
      if (ignore.length && ignored(x, y)) continue;

      // Two renderers put the same edge a fraction of a pixel apart and blend it differently,
      // so an edge pixel is some mix of the colours on either side of it. With a tolerance, a
      // pixel is excused when each picture's colour lies within the range of colours the
      // other picture has within reach — true for a blended edge, false for a different
      // colour or for anything that moved further than the tolerance.
      let excused = false;
      if (tolerance > 0) {
        const lowA = [255, 255, 255];
        const highA = [0, 0, 0];
        const lowB = [255, 255, 255];
        const highB = [0, 0, 0];
        for (let dy = -tolerance; dy <= tolerance; dy += 1) {
          for (let dx = -tolerance; dx <= tolerance; dx += 1) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const p = (ny * reference.width + nx) * 4;
            const q = (ny * implementation.width + nx) * 4;
            for (let c = 0; c < 3; c += 1) {
              if (a[p + c] < lowA[c]) lowA[c] = a[p + c];
              if (a[p + c] > highA[c]) highA[c] = a[p + c];
              if (b[q + c] < lowB[c]) lowB[c] = b[q + c];
              if (b[q + c] > highB[c]) highB[c] = b[q + c];
            }
          }
        }
        excused = true;
        for (let c = 0; c < 3 && excused; c += 1) {
          if (a[i + c] < lowB[c] - slack || a[i + c] > highB[c] + slack || b[j + c] < lowA[c] - slack || b[j + c] > highA[c] + slack) excused = false;
        }
      }
      mask[y * width + x] = excused ? 2 : 1;
      if (excused) soft += 1;
      else hard += 1;
    }
  }
  return { width, height, mask, hard, soft };
}

/** Group differing pixels into regions: cells of a coarse grid, joined when they touch. */
export function findRegions({ width, height, mask }, cell) {
  const cols = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  const active = new Uint8Array(cols * rows);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) if (mask[y * width + x] === 1) active[Math.floor(y / cell) * cols + Math.floor(x / cell)] = 1;
  }
  const label = new Int32Array(cols * rows).fill(-1);
  const regions = [];
  for (let start = 0; start < active.length; start += 1) {
    if (!active[start] || label[start] >= 0) continue;
    const id = regions.length;
    const stack = [start];
    label[start] = id;
    const cells = [];
    while (stack.length) {
      const current = stack.pop();
      cells.push(current);
      const cx = current % cols;
      const cy = Math.floor(current / cols);
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
          const next = ny * cols + nx;
          if (active[next] && label[next] < 0) {
            label[next] = id;
            stack.push(next);
          }
        }
      }
    }
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -1;
    let y1 = -1;
    let pixels = 0;
    for (const index of cells) {
      const cx = (index % cols) * cell;
      const cy = Math.floor(index / cols) * cell;
      for (let y = cy; y < Math.min(cy + cell, height); y += 1) {
        for (let x = cx; x < Math.min(cx + cell, width); x += 1) {
          if (mask[y * width + x] !== 1) continue;
          pixels += 1;
          if (x < x0) x0 = x;
          if (y < y0) y0 = y;
          if (x > x1) x1 = x;
          if (y > y1) y1 = y;
        }
      }
    }
    regions.push({ x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1, pixels });
  }
  return regions.sort((p, q) => q.pixels - p.pixels);
}

/** The element a region belongs to: the smallest primitive whose box (plus its shadow) holds the region's centre. */
function ownerOf(region, spec) {
  if (!spec) return null;
  const centreX = region.x + region.width / 2;
  const centreY = region.y + region.height / 2;
  let best = null;
  let nearest = null;
  for (const node of spec.nodes) {
    if (!node.paints || !node.rect) continue;
    const spill = (node.shadow || []).reduce((most, s) => Math.max(most, Math.abs(s.x) + s.blur + s.spread, Math.abs(s.y) + s.blur + s.spread), 2);
    const r = { x: node.rect.x - spill, y: node.rect.y - spill, width: node.rect.width + spill * 2, height: node.rect.height + spill * 2 };
    const inside = centreX >= r.x && centreX <= r.x + r.width && centreY >= r.y && centreY <= r.y + r.height;
    const size = node.rect.width * node.rect.height;
    if (inside && (!best || size < best.size)) best = { node, size };
    const dx = Math.max(node.rect.x - centreX, 0, centreX - (node.rect.x + node.rect.width));
    const dy = Math.max(node.rect.y - centreY, 0, centreY - (node.rect.y + node.rect.height));
    const far = Math.hypot(dx, dy);
    if (!nearest || far < nearest.far) nearest = { node, far };
  }
  const node = (best || nearest)?.node;
  return node ? { id: node.id, name: node.kind === "text" ? `"${node.name}"` : node.selector?.split(" > ").pop() || node.name, selector: node.selector, kind: node.kind } : null;
}

function overlay(implementation, compared, regions, scale) {
  const { width, height, mask } = compared;
  const out = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const s = (y * implementation.width + x) * 4;
      const d = (y * width + x) * 4;
      const state = mask[y * width + x];
      if (state === 1) out.set([255, 0, 170, 255], d);
      else if (state === 2) out.set([255, 190, 60, 255], d);
      else {
        // Fade the picture so the marked pixels stand out.
        const grey = implementation.data[s] * 0.3 + implementation.data[s + 1] * 0.59 + implementation.data[s + 2] * 0.11;
        const faded = Math.round(255 - (255 - grey) * 0.28);
        out.set([faded, faded, faded, 255], d);
      }
    }
  }
  const stroke = (x, y) => x >= 0 && y >= 0 && x < width && y < height && out.set([0, 120, 255, 255], (y * width + x) * 4);
  for (const region of regions) {
    const pad = 3 * scale;
    const x0 = Math.round(region.px.x - pad);
    const y0 = Math.round(region.px.y - pad);
    const x1 = Math.round(region.px.x + region.px.width + pad);
    const y1 = Math.round(region.px.y + region.px.height + pad);
    for (let t = 0; t < Math.max(1, scale); t += 1) {
      for (let x = x0; x <= x1; x += 1) {
        stroke(x, y0 + t);
        stroke(x, y1 - t);
      }
      for (let y = y0; y <= y1; y += 1) {
        stroke(x0 + t, y);
        stroke(x1 - t, y);
      }
    }
  }
  return { width, height, data: out };
}

export function runPixelDiff({ referencePath, implementationPath, out, spec = null, referenceDensity = 1, implementationDensity = 1, threshold = 0.1, tolerance = 0, ignore = [], maxCrops = 12, probes = [] }) {
  let reference = decodePng(fs.readFileSync(referencePath));
  let implementation = decodePng(fs.readFileSync(implementationPath));

  // Compare at the lower of the two densities; the sharper capture is averaged down to it.
  const density = Math.min(referenceDensity, implementationDensity);
  if (referenceDensity > density) reference = downscale(reference, Math.round(referenceDensity / density));
  if (implementationDensity > density) implementation = downscale(implementation, Math.round(implementationDensity / density));

  const ignorePx = ignore.map((r) => ({ x: r.x * density, y: r.y * density, width: r.width * density, height: r.height * density }));
  const compared = comparePixels(reference, implementation, { threshold, tolerance, ignore: ignorePx });
  const minPixels = Math.max(2, Math.round(2 * density * density));
  const all = findRegions(compared, 8 * density);
  const regions = all
    .filter((region) => region.pixels >= minPixels)
    .map((region, index) => {
      const css = { x: region.x / density, y: region.y / density, width: region.width / density, height: region.height / density };
      return { id: `R${String(index + 1).padStart(2, "0")}`, ...css, pixels: region.pixels, px: region, owner: ownerOf(css, spec) };
    });

  fs.mkdirSync(path.join(out, "regions"), { recursive: true });
  fs.writeFileSync(path.join(out, "pixel-diff.png"), encodePng(overlay(implementation, compared, regions, density)));
  const diffImage = overlay(implementation, compared, [], density);
  for (const region of regions.slice(0, maxCrops)) {
    const pad = 10 * density;
    const box = [region.px.x - pad, region.px.y - pad, region.px.width + pad * 2, region.px.height + pad * 2];
    const zoom = Math.max(1, Math.min(6, Math.floor(900 / (3 * box[2])), Math.floor(700 / box[3])));
    const tiles = [reference, implementation, diffImage].map((image) => upscale(crop(image, ...box), zoom));
    region.crop = `regions/${region.id}.png`;
    fs.writeFileSync(path.join(out, region.crop), encodePng(sideBySide(tiles)));
  }

  // How many differing pixels fall inside each probed box (CSS px) — lets a caller say
  // whether a property difference is actually visible in this capture.
  const probed = {};
  for (const probe of probes) {
    const x0 = Math.max(0, Math.floor(probe.x * density));
    const y0 = Math.max(0, Math.floor(probe.y * density));
    const x1 = Math.min(compared.width, Math.ceil((probe.x + probe.width) * density));
    const y1 = Math.min(compared.height, Math.ceil((probe.y + probe.height) * density));
    let count = 0;
    for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) if (compared.mask[y * compared.width + x] === 1) count += 1;
    probed[probe.id] = count;
  }

  const total = compared.width * compared.height;
  const report = {
    probed,
    reference: { file: path.basename(referencePath), width: reference.width, height: reference.height },
    implementation: { file: path.basename(implementationPath), width: implementation.width, height: implementation.height },
    density,
    tolerance,
    threshold,
    sizeMatches: reference.width === implementation.width && reference.height === implementation.height,
    differingPixels: compared.hard,
    differingShare: Math.round((compared.hard / total) * 1e6) / 1e4,
    excusedPixels: compared.soft,
    specks: all.length - regions.length,
    regions: regions.map(({ px, ...rest }) => rest),
    overlay: "pixel-diff.png",
  };
  fs.writeFileSync(path.join(out, "pixel-diff.json"), `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

export function summarizePixels(report, limit = 12) {
  const lines = [];
  const size = report.sizeMatches ? "" : `  ⚠ size differs: reference ${report.reference.width}×${report.reference.height}, implementation ${report.implementation.width}×${report.implementation.height}`;
  lines.push(`pixels: ${report.differingShare}% differ (${report.differingPixels} px) in ${report.regions.length} region${report.regions.length === 1 ? "" : "s"}${report.excusedPixels ? ` · ${report.excusedPixels} px excused as sub-pixel shift` : ""}${size}`);
  for (const region of report.regions.slice(0, limit)) {
    lines.push(`${region.id}  ${String(Math.round(region.width)).padStart(4)}×${String(Math.round(region.height)).padEnd(4)} at (${Math.round(region.x)}, ${Math.round(region.y)})  ${String(region.pixels).padStart(6)} px  on ${region.owner ? `${region.owner.name}` : "—"}${region.crop ? `  → ${region.crop}` : ""}`);
  }
  if (report.regions.length > limit) lines.push(`… ${report.regions.length - limit} more regions`);
  return lines.join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const flag = (name, fallback = "") => (args.indexOf(name) >= 0 ? args[args.indexOf(name) + 1] : fallback);
  if (!flag("--reference") || !flag("--implementation")) {
    console.log("Usage: node pixel_diff.mjs --reference <png> --implementation <png> --out <dir> [--spec <impl.spec.json>] [--reference-density 2] [--implementation-density 2] [--tolerance 0|1] [--threshold 0.1] [--ignore <regions.json>]");
    process.exit(1);
  }
  const spec = flag("--spec") ? JSON.parse(fs.readFileSync(flag("--spec"), "utf8")) : null;
  const report = runPixelDiff({
    referencePath: flag("--reference"),
    implementationPath: flag("--implementation"),
    out: flag("--out", "."),
    spec,
    referenceDensity: Number(flag("--reference-density", spec?.surface?.density || 1)),
    implementationDensity: Number(flag("--implementation-density", spec?.surface?.density || 1)),
    threshold: Number(flag("--threshold", "0.1")),
    tolerance: Number(flag("--tolerance", "0")),
    ignore: flag("--ignore") ? JSON.parse(fs.readFileSync(flag("--ignore"), "utf8")) : [],
  });
  console.log(summarizePixels(report));
}
