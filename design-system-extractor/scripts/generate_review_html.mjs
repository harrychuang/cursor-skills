#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// What needs review, and whether it has been decided, comes from
// review_core.mjs — the same module audit_tokens.mjs uses — so this script
// and the audit always report the same thing.
import { buildReview, componentLabel, pngSize, resolveLocale } from "./review_core.mjs";

// Usage: generate_review_html.mjs [target-root] [output-path] [--locale zh-Hant|en|ja] [--json]
// --json emits the review counts and items on stdout instead of writing the
// HTML file, so tooling can read the review without scraping markup.
const rawArgs = process.argv.slice(2);
let jsonMode = false;
let localeArg = null;
const positionalArgs = [];
for (let index = 0; index < rawArgs.length; index += 1) {
  const arg = rawArgs[index];
  if (arg === "--json") jsonMode = true;
  else if (arg === "--locale") {
    localeArg = rawArgs[index + 1] ?? "";
    index += 1;
  } else if (arg.startsWith("--locale=")) localeArg = arg.slice("--locale=".length);
  else if (!arg.startsWith("--")) positionalArgs.push(arg);
}
const targetRoot = path.resolve(positionalArgs[0] || process.cwd());
const outputPath = path.resolve(
  positionalArgs[1] || path.join(targetRoot, "docs", "design-system", "review.html"),
);

const designSystemDir = path.join(targetRoot, "design-system");
const tokensDir = path.join(targetRoot, "tokens");
const designSystemAssetsDir = path.join(designSystemDir, "assets");

async function readOptional(file) {
  try {
    return await fs.readFile(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

// Component specifications, in file-name order: a component token belongs to
// the first specification that names it.
async function readComponentDocs() {
  const dir = path.join(designSystemDir, "components");
  let names;
  try {
    names = (await fs.readdir(dir)).filter((name) => name.endsWith(".md")).sort((a, b) => a.localeCompare(b));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const docs = [];
  for (const name of names) {
    const text = await fs.readFile(path.join(dir, name), "utf8");
    docs.push({ label: componentLabel(text, name), text });
  }
  return docs;
}

// Natural sizes of the screenshots the inventory links, read ahead of time so
// the shared module stays free of file access.
async function readImageSizes(inventoryDoc) {
  const sizes = new Map();
  for (const match of String(inventoryDoc || "").matchAll(/!\[[^\]]*\]\(([^)\s#]+)/g)) {
    const src = match[1];
    if (sizes.has(src) || /^[a-z]+:/i.test(src)) continue;
    try {
      sizes.set(src, pngSize(await fs.readFile(path.join(designSystemDir, src))));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      sizes.set(src, null);
    }
  }
  return sizes;
}

const inventoryDoc = await readOptional(path.join(designSystemDir, "COMPONENT_INVENTORY.md"));
const imageSizes = await readImageSizes(inventoryDoc);
const review = buildReview({
  refCss: (await readOptional(path.join(tokensDir, "tokens-ref.css"))) || "",
  sysCss: (await readOptional(path.join(tokensDir, "tokens-sys.css"))) || "",
  compCss: (await readOptional(path.join(tokensDir, "tokens-comp.css"))) || "",
  architectureDoc: await readOptional(path.join(designSystemDir, "TOKEN_ARCHITECTURE.md")),
  inventoryDoc,
  evidenceDoc: await readOptional(path.join(designSystemDir, "DESIGN_EVIDENCE_MAP.md")),
  componentDocs: await readComponentDocs(),
  imageSize: (src) => imageSizes.get(src) || null,
});
const { counts, items } = review;

if (jsonMode) {
  // Machine-readable mode keeps stdout to a single JSON object and writes no
  // files, so a caller can parse it without cleaning up generated output.
  console.log(JSON.stringify({ counts, needsReview: review.needsReview, items }, null, 2));
} else {
  // The page is one template file; the review data is injected into it as JSON.
  const templatePath = fileURLToPath(new URL("../assets/review-page/review.template.html", import.meta.url));
  let template;
  try {
    template = await fs.readFile(templatePath, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    console.error(`Review page template not found: ${templatePath}`);
    process.exit(1);
  }

  // The interface starts in the package's report language unless --locale says otherwise.
  const locale = resolveLocale({
    flag: localeArg,
    sessionStateDoc: await readOptional(path.join(designSystemDir, "SESSION_STATE.md")),
  });
  if (locale.warning) console.warn(locale.warning);

  const project = path.basename(targetRoot);
  const data = {
    project,
    // Browser storage is keyed per package. Pages opened from disk can share
    // one storage area, so the key carries the package's location as well as its name.
    projectKey: `${project}-${crypto.createHash("sha256").update(targetRoot).digest("hex").slice(0, 8)}`,
    generatedAt: new Date().toISOString().slice(0, 10),
    defaultLocale: locale.locale,
    counts,
    items,
  };
  // "<" is escaped so no value can close the script element early.
  const html = template.replace("/*__REVIEW_DATA__*/null", () => JSON.stringify(data).replace(/</g, "\\u003c"));

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, html, "utf8");

  let copiedAssets = false;
  try {
    const assetEntries = await fs.readdir(designSystemAssetsDir);
    if (assetEntries.length) {
      await fs.cp(designSystemAssetsDir, path.join(path.dirname(outputPath), "assets"), { recursive: true });
      copiedAssets = true;
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  console.log(`Generated ${path.relative(process.cwd(), outputPath) || outputPath}`);
  console.log(`Interface locale: ${locale.locale}`);
  console.log(`Review items: ${counts.items}`);
  console.log(`Awaiting designer: ${counts.needsReview}`);
  console.log(`Needs review: ${counts.needsReview}`);
  console.log(`Duplicate source rows: ${counts.sources}`);
  console.log(`Color scale issues: ${counts.colorScaleIssues}`);
  console.log(`Near color pairs: ${counts.nearColors}`);
  console.log(`Near number pairs: ${counts.nearNumbers}`);
  console.log(`Component similarity rows: ${counts.components}`);
  console.log(`Assets copied: ${copiedAssets ? "yes" : "no"}`);
}
