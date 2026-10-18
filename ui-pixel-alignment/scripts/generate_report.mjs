#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptFile = fileURLToPath(import.meta.url);
const skillRoot = path.resolve(path.dirname(scriptFile), "..");

const args = process.argv.slice(2);
const inputArg = readFlag("--input", "-i");
const outputArg = readFlag("--output", "-o");
const titleArg = readFlag("--title");
const noCopyAssets = args.includes("--no-copy-assets");
const help = args.includes("--help") || args.includes("-h");

if (help || !inputArg) {
  printUsage();
  process.exit(help ? 0 : 1);
}

const inputPath = path.resolve(inputArg);
const inputDir = path.dirname(inputPath);
const outputDir = path.resolve(outputArg || path.join(inputDir, "report"));
const outputAssetsDir = path.join(outputDir, "assets");
const cssSource = path.join(skillRoot, "assets", "report-template", "styles.css");

const rawData = JSON.parse(await fs.readFile(inputPath, "utf8"));
const report = normalizeReport(rawData, titleArg);

await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(outputAssetsDir, { recursive: true });
await fs.copyFile(cssSource, path.join(outputDir, "styles.css"));

const assetMap = new Map();
const processedScreenshots = await processScreenshotSet(report.screenshots, assetMap);
const processedFindings = [];
for (const finding of report.findings) {
  processedFindings.push({
    ...finding,
    processedAssets: await processScreenshotSet(finding.assets, assetMap),
  });
}

const html = renderHtml({
  ...report,
  screenshots: processedScreenshots,
  findings: processedFindings,
});

await fs.writeFile(path.join(outputDir, "index.html"), html);

console.log(`Generated pixel alignment report: ${path.join(outputDir, "index.html")}`);
console.log(`Findings: ${report.findings.length}`);
console.log(`Assets copied: ${assetMap.size}`);

function readFlag(...names) {
  for (const name of names) {
    const index = args.indexOf(name);
    if (index >= 0) {
      const value = args[index + 1];
      if (!value || value.startsWith("-")) {
        throw new Error(`${name} requires a value.`);
      }
      return value;
    }
  }
  return "";
}

function printUsage() {
  console.log(`Usage:
  node scripts/generate_report.mjs --input <findings.json> [--output <report-dir>]

Options:
  --input, -i        Findings JSON file.
  --output, -o       Output directory. Defaults to <input-dir>/report.
  --title            Override the report title.
  --no-copy-assets   Keep image paths as written instead of copying local files.
`);
}

function normalizeReport(data, titleOverride) {
  const source = data.source || {};
  const title =
    titleOverride ||
    data.title ||
    [source.designName, source.implementationName]
      .filter(Boolean)
      .join(" vs ") ||
    "Design Pixel Align Report";

  const findings = Array.isArray(data.findings)
    ? data.findings.map((finding, index) => normalizeFinding(finding, index))
    : [];

  return {
    title,
    summary: data.summary || "",
    source,
    parity: data.parity || null,
    screenshots: normalizeImageSet(data.screenshots || {}),
    findings: sortFindings(findings),
    generatedAt: data.generatedAt || new Date().toISOString(),
  };
}

function normalizeFinding(finding, index) {
  const id = finding.id || `PA-${String(index + 1).padStart(3, "0")}`;
  return {
    id,
    severity: normalizeSeverity(finding.severity),
    intent: normalizeIntent(finding.intent),
    parityClass: finding.parityClass || "",
    specField: finding.specField || "",
    block: finding.block || finding.title || "Unspecified block",
    ownership: finding.ownership || "unclassified",
    status: finding.status || "open",
    expected: finding.expected || "",
    actual: finding.actual || "",
    delta: normalizeList(finding.delta),
    recommendedFix: finding.recommendedFix || finding.fix || "",
    designReference: finding.designReference || "",
    implementationReference: finding.implementationReference || "",
    tokens: normalizeList(finding.tokens),
    files: normalizeList(finding.files),
    notes: normalizeList(finding.notes),
    assets: normalizeImageSet(finding.assets || {}),
  };
}

function normalizeIntent(value) {
  const intent = String(value || "drift").toLowerCase();
  if (intent === "drift" || intent === "adaptation" || intent === "required-adaptation") {
    return intent;
  }
  return "drift";
}

function normalizeSeverity(value) {
  const severity = String(value || "medium").toLowerCase();
  if (severity === "high" || severity === "medium" || severity === "low") {
    return severity;
  }
  return "medium";
}

function normalizeList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  if (typeof value === "object") {
    return Object.entries(value).map(([key, val]) => `${key}: ${val}`);
  }
  return [String(value)];
}

function normalizeImageSet(value) {
  if (!value || typeof value !== "object") return {};
  return {
    reference: normalizeImage(value.reference || value.design || value.expected),
    implementation: normalizeImage(value.implementation || value.actual || value.rendered),
    diff: normalizeImage(value.diff || value.overlay || value.compare),
  };
}

function normalizeImage(value) {
  if (!value) return null;
  if (typeof value === "string") return { src: value, caption: "" };
  if (typeof value === "object") {
    return {
      src: value.src || value.path || value.url || "",
      caption: value.caption || value.label || "",
    };
  }
  return null;
}

function sortFindings(findings) {
  const severityRank = { high: 0, medium: 1, low: 2 };
  return [...findings].sort((a, b) => {
    const severityDiff = severityRank[a.severity] - severityRank[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return a.id.localeCompare(b.id, undefined, { numeric: true });
  });
}

async function processScreenshotSet(images, assetMap) {
  const processed = {};
  for (const [key, image] of Object.entries(images || {})) {
    processed[key] = await processImage(image, assetMap);
  }
  return processed;
}

async function processImage(image, assetMap) {
  if (!image?.src) return null;
  const src = image.src;
  if (isExternal(src) || noCopyAssets) {
    return { ...image, src, originalSrc: src, missing: false };
  }

  const resolved = path.isAbsolute(src) ? src : path.resolve(inputDir, src);
  try {
    await fs.access(resolved);
  } catch {
    return { ...image, src: "", originalSrc: src, missing: true };
  }

  if (assetMap.has(resolved)) {
    return { ...image, src: assetMap.get(resolved), originalSrc: src, missing: false };
  }

  const extension = path.extname(resolved) || ".png";
  const base = sanitizeBaseName(path.basename(resolved, extension)) || "asset";
  const hash = crypto.createHash("sha1").update(resolved).digest("hex").slice(0, 8);
  const fileName = `${base}-${hash}${extension}`;
  const destination = path.join(outputAssetsDir, fileName);
  await fs.copyFile(resolved, destination);
  const relative = toPosix(path.relative(outputDir, destination));
  assetMap.set(resolved, relative);
  return { ...image, src: relative, originalSrc: src, missing: false };
}

function isExternal(src) {
  return /^(?:https?:|data:|blob:)/i.test(src);
}

function sanitizeBaseName(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function renderHtml(report) {
  const stats = countFindings(report.findings);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(report.title)}</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <main class="page">
      <header class="hero">
        <p class="eyebrow">Design Pixel Align</p>
        <h1>${escapeHtml(report.title)}</h1>
        ${report.summary ? `<p class="summary">${escapeHtml(report.summary)}</p>` : ""}
        ${renderSourceMeta(report.source, report.generatedAt)}
      </header>

      <section class="section" aria-labelledby="stats-heading">
        <div class="section-header">
          <h2 id="stats-heading">Audit Summary</h2>
        </div>
        <div class="stats">
          ${renderStat(stats.total, "Total findings")}
          ${renderStat(stats.high, "High severity")}
          ${renderStat(stats.medium, "Medium severity")}
          ${renderStat(stats.low, "Low severity")}
        </div>
        ${
          stats.adaptation || stats["required-adaptation"]
            ? `<div class="stats">
          ${renderStat(stats.drift, "Drift to fix")}
          ${renderStat(stats["required-adaptation"], "Required adaptations")}
          ${renderStat(stats.adaptation, "Accepted adaptations")}
        </div>`
            : ""
        }
        ${renderParity(report.parity)}
      </section>

      <section class="section" aria-labelledby="screenshots-heading">
        <div class="section-header">
          <h2 id="screenshots-heading">Full-Screen Evidence</h2>
        </div>
        <div class="image-grid">
          ${renderFigure("Reference", report.screenshots.reference)}
          ${renderFigure("Implementation", report.screenshots.implementation)}
          ${renderFigure("Diff / Overlay", report.screenshots.diff)}
        </div>
      </section>

      <section class="section" aria-labelledby="findings-heading">
        <div class="section-header">
          <h2 id="findings-heading">Findings</h2>
        </div>
        ${
          report.findings.length
            ? report.findings.map(renderFinding).join("")
            : `<div class="card empty">No pixel alignment drift was recorded for this comparison.</div>`
        }
      </section>

      <footer>
        Generated ${escapeHtml(formatDate(report.generatedAt))}. Review source links and screenshots before using this report as a sign-off artifact.
      </footer>
    </main>
  </body>
</html>
`;
}

function countFindings(findings) {
  return findings.reduce(
    (stats, finding) => {
      stats.total += 1;
      stats[finding.severity] += 1;
      stats[finding.intent] += 1;
      return stats;
    },
    { total: 0, high: 0, medium: 0, low: 0, drift: 0, adaptation: 0, "required-adaptation": 0 },
  );
}

function renderParity(parity) {
  if (!parity) return "";
  const rows = [
    [
      "Form factor",
      parity.formFactor === "cross"
        ? "Cross form factor — spacing and sizing compared as adaptive"
        : "Same form factor — spacing and sizing compared strictly",
    ],
    [
      "Rendering engines",
      parity.engines === "cross"
        ? "Cross engine — shadow strings not compared, elevation is"
        : "Same engine — shadows compared directly",
    ],
    ["Reference fidelity", parity.referenceFidelity || "unknown"],
    ["Implementation fidelity", parity.implementationFidelity || "unknown"],
    [
      "Font environment",
      parity.fontEnvironment === "mismatched"
        ? "Mismatched — typography metrics downgraded, not trustworthy for token changes"
        : parity.fontEnvironment || "",
    ],
    ["Parity policy", parity.policy || "default"],
  ].filter(([, value]) => value);

  return `<div class="meta-grid">${rows
    .map(([label, value]) => renderMetaCard(label, value))
    .join("")}</div>`;
}

function renderSourceMeta(source, generatedAt) {
  const rows = [
    [
      "Design",
      joinPlatform(source.designName || source.designUrl || source.designSource, source.designPlatform),
      source.designUrl,
    ],
    [
      "Implementation",
      joinPlatform(
        source.implementationName || source.implementationUrl || source.implementationSource || source.route,
        source.implementationPlatform,
      ),
      source.implementationUrl,
    ],
    ["Route / Story", source.route || source.story || source.file || "Not specified"],
    [
      "Viewport",
      source.referenceViewport && source.referenceViewport !== source.viewport
        ? `${source.viewport || "?"} (reference ${source.referenceViewport})`
        : source.viewport || "Not specified",
    ],
    ["Theme", source.theme || "Not specified"],
    ["Captured", source.capturedAt || generatedAt],
  ];

  return `<div class="meta-grid">${rows
    .map(([label, value, href]) => renderMetaCard(label, value, href))
    .join("")}</div>`;
}

function joinPlatform(value, platform) {
  const base = value || "Not specified";
  return platform ? `${base} · ${platform}` : base;
}

function renderMetaCard(label, value, href = "") {
  return `<article class="card">
    <span class="label">${escapeHtml(label)}</span>
    <div class="value">${href ? renderLink(value, href) : escapeHtml(value)}</div>
  </article>`;
}

function renderStat(value, label) {
  return `<article class="stat">
    <span class="stat-value">${escapeHtml(value)}</span>
    <span class="stat-label">${escapeHtml(label)}</span>
  </article>`;
}

function renderFinding(finding) {
  return `<article class="finding" id="${escapeAttr(finding.id)}">
    <header class="finding-header">
      <div class="finding-title">
        <span class="finding-id">${escapeHtml(finding.id)}</span>
        <h3>${escapeHtml(finding.block)}</h3>
      </div>
      <div class="badges">
        ${renderBadge(finding.severity, finding.severity)}
        ${renderBadge(intentLabel(finding.intent), finding.intent)}
        ${renderBadge(finding.status, finding.status)}
        ${renderBadge(finding.ownership, "neutral")}
        ${finding.specField ? renderBadge(finding.specField, "neutral") : ""}
      </div>
    </header>
    <div class="finding-body">
      <div class="finding-images">
        ${renderFigure("Reference crop", finding.processedAssets.reference)}
        ${renderFigure("Implementation crop", finding.processedAssets.implementation)}
        ${renderFigure("Diff / Overlay", finding.processedAssets.diff)}
      </div>
      <div class="detail-grid">
        ${renderDetail("Expected", finding.expected)}
        ${renderDetail("Actual", finding.actual)}
        ${renderDetail("Pixel / Token Delta", finding.delta)}
        ${renderDetail("Recommended Fix", finding.recommendedFix)}
      </div>
      ${renderFindingLinks(finding)}
      ${renderChips("Tokens", finding.tokens)}
      ${renderChips("Files", finding.files)}
      ${renderDetail("Notes", finding.notes)}
    </div>
  </article>`;
}

function intentLabel(intent) {
  if (intent === "adaptation") return "accepted adaptation";
  if (intent === "required-adaptation") return "must adapt";
  return "drift";
}

function renderBadge(label, tone) {
  const normalizedTone = String(tone || "neutral").toLowerCase().replace(/[^a-z0-9-]/g, "-");
  return `<span class="badge ${escapeAttr(normalizedTone)}">${escapeHtml(label)}</span>`;
}

function renderFigure(label, image) {
  const caption = image?.caption || image?.originalSrc || "";
  const media = image?.src
    ? `<img src="${escapeAttr(image.src)}" alt="${escapeAttr(label)}" loading="lazy" />`
    : `<div class="missing">${escapeHtml(image?.missing ? `Missing image: ${image.originalSrc}` : "No image provided")}</div>`;

  return `<figure class="card figure">
    <div class="figure-media">${media}</div>
    <figcaption class="figure-caption">
      <strong>${escapeHtml(label)}</strong>${caption ? ` · ${escapeHtml(caption)}` : ""}
    </figcaption>
  </figure>`;
}

function renderDetail(label, value) {
  if (Array.isArray(value)) {
    if (!value.length) return "";
    return `<article class="detail">
      <span class="label">${escapeHtml(label)}</span>
      <ul>${value.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </article>`;
  }
  if (!value) return "";
  return `<article class="detail">
    <span class="label">${escapeHtml(label)}</span>
    <p>${escapeHtml(value)}</p>
  </article>`;
}

function renderFindingLinks(finding) {
  const links = [
    ["Design reference", finding.designReference],
    ["Implementation reference", finding.implementationReference],
  ].filter(([, href]) => href);

  if (!links.length) return "";

  return `<div class="links">${links
    .map(([label, href]) => renderLink(label, href))
    .join("")}</div>`;
}

function renderChips(label, values) {
  if (!values?.length) return "";
  return `<div>
    <span class="label">${escapeHtml(label)}</span>
    <div class="chips">${values.map((value) => `<span class="chip">${escapeHtml(value)}</span>`).join("")}</div>
  </div>`;
}

function renderLink(label, href) {
  const safeHref = String(href || "");
  if (!safeHref) return escapeHtml(label);
  return `<a href="${escapeAttr(safeHref)}">${escapeHtml(label || safeHref)}</a>`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}
