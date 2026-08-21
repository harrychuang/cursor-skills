#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const writeDrafts = args.includes("--write");
const jsonOnly = args.includes("--json");
const strict = args.includes("--strict");
const designSystemRootArg = optionValue("--design-system-root");
const componentRootArg = optionValue("--component-root");
const positional = args.filter((arg, index) => {
  if (arg === "--write" || arg === "--json" || arg === "--strict") return false;
  if (arg === "--design-system-root" || arg === "--component-root") return false;
  if (args[index - 1] === "--design-system-root" || args[index - 1] === "--component-root") return false;
  return !arg.startsWith("--");
});

if (args.includes("--help") || args.includes("-h")) {
  process.stdout.write(`Usage: node scripts/check_component_docs.mjs <product-root> [options]

Options:
  --design-system-root <path>  Design-system package root. Defaults to <product-root> or <product-root>/design-system.
  --component-root <path>      Component root relative to <product-root>, or an absolute path. Defaults to common component roots.
  --write                      Create missing implementation-derived component doc drafts.
  --strict                     Exit non-zero when required docs, inventory entries, stories, or review status entries are missing.
  --json                       Print JSON instead of Markdown.
  --help                       Show this help.
`);
  process.exit(0);
}

const productRoot = path.resolve(positional[0] || process.cwd());
const designSystemDir = resolveDesignSystemDir(
  designSystemRootArg ? path.resolve(designSystemRootArg) : productRoot,
);
const componentRoot = componentRootArg
  ? path.resolve(productRoot, componentRootArg)
  : resolveComponentRoot(productRoot);
const componentDocsDir = path.join(designSystemDir, "components");
const inventoryPath = path.join(designSystemDir, "COMPONENT_INVENTORY.md");
const reviewStatusPath = path.join(designSystemDir, "component-review-status.json");
const inventoryText = readIfExists(inventoryPath);
const reviewStatus = readReviewStatus(reviewStatusPath);
const components = componentRoot ? findComponents(componentRoot) : [];
const records = components.map((component) => inspectComponent(component));
const writtenDocs = [];

if (writeDrafts) {
  fs.mkdirSync(componentDocsDir, { recursive: true });
  for (const record of records) {
    if (record.doc.exists) continue;
    fs.writeFileSync(record.doc.path, renderDraftDoc(record));
    writtenDocs.push(record.doc.path);
    record.doc.exists = true;
    record.doc.created = true;
  }
}

const totals = {
  components: records.length,
  missingDocs: records.filter((record) => !record.doc.exists).length,
  missingInventory: records.filter((record) => !record.inventory.present).length,
  missingStories: records.filter((record) => record.stories.files.length === 0).length,
  missingReviewStatus: reviewStatus.exists
    ? records.filter((record) => !record.reviewStatus.present).length
    : 0,
  staleDocs: records.filter((record) => record.doc.stale).length,
  writtenDocs: writtenDocs.length,
};

const result = {
  componentRoot: componentRoot || "",
  designSystemDir,
  inventoryPath: fs.existsSync(inventoryPath) ? inventoryPath : "",
  reviewStatusPath: reviewStatus.exists ? reviewStatusPath : "",
  totals,
  writtenDocs,
  components: records,
};

if (jsonOnly) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} else {
  process.stdout.write(renderReport(result));
}

if (
  strict
  && (
    totals.missingDocs > 0
    || totals.missingInventory > 0
    || totals.missingStories > 0
    || totals.missingReviewStatus > 0
  )
) {
  process.exitCode = 1;
}

function optionValue(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : "";
}

function resolveDesignSystemDir(root) {
  const directComponents = path.join(root, "components");
  const directInventory = path.join(root, "COMPONENT_INVENTORY.md");
  const nestedComponents = path.join(root, "design-system", "components");
  const nestedInventory = path.join(root, "design-system", "COMPONENT_INVENTORY.md");

  if (fs.existsSync(directInventory) || fs.existsSync(directComponents)) return root;
  if (fs.existsSync(nestedInventory) || fs.existsSync(nestedComponents)) return path.join(root, "design-system");

  throw new Error(
    `Cannot find design-system docs at ${root}. Expected COMPONENT_INVENTORY.md, components/, or nested design-system/.`,
  );
}

function resolveComponentRoot(root) {
  const candidates = [
    path.join(root, "src", "components"),
    path.join(root, "components"),
    path.join(root, "src", "ui"),
    path.join(root, "packages", "ui", "src", "components"),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) || "";
}

function findComponents(root) {
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const dir = path.join(root, entry.name);
      const files = fs.readdirSync(dir, { withFileTypes: true })
        .filter((file) => file.isFile())
        .map((file) => path.join(dir, file.name));
      const sourceFiles = files.filter((file) => isComponentSource(file));
      const storyFiles = files.filter((file) => /\.stories\.[cm]?[tj]sx?$/.test(file));

      return {
        dir,
        files,
        name: titleCase(entry.name),
        slug: entry.name,
        sourceFiles,
        storyFiles,
        styleFiles: files.filter((file) => /\.(css|scss|sass|less)$/.test(file)),
      };
    })
    .filter((component) => component.sourceFiles.length > 0 || component.storyFiles.length > 0);
}

function isComponentSource(file) {
  const base = path.basename(file);
  return (
    /\.[cm]?[tj]sx?$/.test(base)
    && !/\.stories\./.test(base)
    && !/\.test\./.test(base)
    && !/\.spec\./.test(base)
    && base !== "index.ts"
    && base !== "index.tsx"
  );
}

function inspectComponent(component) {
  const sourceText = component.sourceFiles.map((file) => readIfExists(file)).join("\n");
  const storyText = component.storyFiles.map((file) => readIfExists(file)).join("\n");
  const styleText = component.styleFiles.map((file) => readIfExists(file)).join("\n");
  const storyTitle = firstMatch(storyText, /title:\s*["'`]([^"'`]+)["'`]/);
  const displayName = storyTitle ? storyTitle.split("/").pop() : component.name;
  const docPath = path.join(componentDocsDir, `${component.slug}.md`);
  const docText = readIfExists(docPath);
  const newestSourceTime = Math.max(
    0,
    ...component.files.map((file) => fs.statSync(file).mtimeMs),
  );
  const docMtime = fs.existsSync(docPath) ? fs.statSync(docPath).mtimeMs : 0;

  return {
    component: displayName,
    slug: component.slug,
    productTarget: relative(component.dir),
    sourceFiles: component.sourceFiles.map(relative),
    styleFiles: component.styleFiles.map(relative),
    doc: {
      created: false,
      exists: Boolean(docText),
      path: docPath,
      relativePath: relative(docPath),
      stale: Boolean(docText) && docMtime < newestSourceTime,
    },
    inventory: {
      path: fs.existsSync(inventoryPath) ? inventoryPath : "",
      present: inventoryContains(component.slug, displayName),
    },
    props: parseProps(sourceText),
    stories: {
      files: component.storyFiles.map(relative),
      title: storyTitle || "",
      exports: parseStoryExports(storyText),
    },
    reviewStatus: {
      path: reviewStatus.exists ? reviewStatusPath : "",
      present: reviewStatusContains(component.slug, displayName, storyTitle),
    },
    tokens: parseTokens(styleText),
    accessibility: parseAccessibility(sourceText),
    provenance: docText
      ? inferDocProvenance(docText)
      : "implementation-derived",
  };
}

function inventoryContains(slug, displayName) {
  if (!inventoryText) return false;
  const haystack = normalize(inventoryText);
  return haystack.includes(normalize(slug)) || haystack.includes(normalize(displayName));
}

function reviewStatusContains(slug, displayName, storyTitle) {
  if (!reviewStatus.exists) return false;
  const haystack = normalize(JSON.stringify(reviewStatus.data));
  const storySlug = storyTitle
    ? storyTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    : "";
  return [slug, displayName, storyTitle, storySlug]
    .filter(Boolean)
    .some((value) => haystack.includes(normalize(value)));
}

function parseProps(text) {
  const match = text.match(/export\s+interface\s+\w*Props\s*{([\s\S]*?)\n}/)
    || text.match(/interface\s+\w*Props\s*{([\s\S]*?)\n}/);
  if (!match) return [];

  return match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("//"))
    .map((line) => line.replace(/;$/, ""))
    .map((line) => {
      const propMatch = line.match(/^([A-Za-z_$][\w$]*)(\?)?:\s*(.+)$/);
      if (!propMatch) return { name: line, required: "", type: "" };
      return {
        name: propMatch[1],
        required: propMatch[2] ? "No" : "Yes",
        type: propMatch[3],
      };
    });
}

function parseStoryExports(text) {
  return [...text.matchAll(/export\s+const\s+([A-Za-z_$][\w$]*)\b/g)].map((match) => match[1]);
}

function parseTokens(text) {
  const tokens = new Set();
  for (const match of text.matchAll(/var\((--[A-Za-z0-9_-]+)/g)) tokens.add(match[1]);
  for (const match of text.matchAll(/(--[A-Za-z0-9_-]+)\s*:/g)) tokens.add(match[1]);
  return [...tokens].sort();
}

function parseAccessibility(text) {
  const terms = new Set();
  for (const match of text.matchAll(/\b(role|aria-[a-z-]+)\s*=\s*["'{`]([^"'}`]+)/g)) {
    terms.add(`${match[1]}=${match[2]}`);
  }
  return [...terms].sort();
}

function inferDocProvenance(text) {
  if (/implementation-derived/i.test(text)) return "implementation-derived";
  if (/brief-derived/i.test(text)) return "brief-derived";
  if (/needs-review/i.test(text)) return "needs-review";
  return "extracted-or-reviewed";
}

function renderDraftDoc(record) {
  const lines = [];
  lines.push(`# ${record.component}`);
  lines.push("");
  lines.push("- Status: needs-review");
  lines.push("- Source provenance: implementation-derived");
  lines.push(`- Product target: \`${record.productTarget}\``);
  if (record.stories.files.length > 0) lines.push(`- Story target: \`${record.stories.files[0]}\``);
  lines.push("- Generated by: `scripts/check_component_docs.mjs --write`");
  lines.push("");
  lines.push("## Purpose");
  lines.push("");
  lines.push("Implementation-derived draft. Verify against extracted design evidence or a source design before treating this document as normative.");
  lines.push("");
  lines.push("## Anatomy");
  lines.push("");
  lines.push(...bulletList([
    `Source files: ${record.sourceFiles.map((file) => `\`${file}\``).join(", ") || "-"}`,
    `Style files: ${record.styleFiles.map((file) => `\`${file}\``).join(", ") || "-"}`,
    `Story title: ${record.stories.title || "-"}`,
  ]));
  lines.push("");
  lines.push("## Props And Slots");
  lines.push("");
  if (record.props.length === 0) {
    lines.push("- No props interface was detected. Review the implementation manually.");
  } else {
    lines.push("| Prop | Required | Type | Notes |");
    lines.push("|---|---|---|---|");
    for (const prop of record.props) {
      lines.push(`| ${cell(prop.name)} | ${cell(prop.required)} | \`${cell(prop.type)}\` | implementation-derived |`);
    }
  }
  lines.push("");
  lines.push("## Variants And States");
  lines.push("");
  lines.push(...bulletList(record.stories.exports.length > 0
    ? record.stories.exports.map((story) => `Story: \`${story}\``)
    : ["No Storybook story exports were detected."]));
  lines.push("");
  lines.push("## Accessibility");
  lines.push("");
  lines.push(...bulletList(record.accessibility.length > 0
    ? record.accessibility.map((item) => `Detected ${item}`)
    : ["Accessibility behavior needs manual review."]));
  lines.push("");
  lines.push("## Token Contract");
  lines.push("");
  if (record.tokens.length === 0) {
    lines.push("- No CSS custom property tokens were detected. Review token usage manually.");
  } else {
    lines.push(...bulletList(record.tokens.map((token) => `\`${token}\``)));
  }
  lines.push("");
  lines.push("## Storybook Coverage");
  lines.push("");
  lines.push(...bulletList(record.stories.files.length > 0
    ? record.stories.files.map((file) => `\`${file}\``)
    : ["No co-located story file was detected."]));
  lines.push("");
  lines.push("## Review Notes");
  lines.push("");
  lines.push("- Confirm this draft against extracted evidence, Figma, screenshots, or an explicit design brief.");
  lines.push("- Update `COMPONENT_INVENTORY.md`, `STORYBOOK_IMPLEMENTATION_MAP.md`, and review status before marking the component complete.");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function renderReport(data) {
  const lines = [];
  lines.push("# Component Documentation Check");
  lines.push("");
  lines.push(`- Product root: \`${productRoot}\``);
  lines.push(`- Component root: \`${data.componentRoot || "not found"}\``);
  lines.push(`- Design-system root: \`${data.designSystemDir}\``);
  lines.push(`- Components checked: ${data.totals.components}`);
  lines.push(`- Missing docs: ${data.totals.missingDocs}`);
  lines.push(`- Missing inventory entries: ${data.totals.missingInventory}`);
  lines.push(`- Missing stories: ${data.totals.missingStories}`);
  if (data.reviewStatusPath) lines.push(`- Missing review status entries: ${data.totals.missingReviewStatus}`);
  lines.push(`- Stale docs: ${data.totals.staleDocs}`);
  lines.push(`- Written docs: ${data.totals.writtenDocs}`);
  lines.push("");
  lines.push("| Component | Doc | Inventory | Story | Review status | Provenance | Notes |");
  lines.push("|---|---|---|---|---|---|---|");
  for (const record of data.components) {
    const notes = [];
    if (record.doc.stale) notes.push("doc older than component files");
    if (record.doc.created) notes.push("draft created");
    lines.push([
      cell(record.component),
      cell(record.doc.exists ? record.doc.relativePath : "missing"),
      cell(record.inventory.present ? "present" : "missing"),
      cell(record.stories.files.length > 0 ? record.stories.files.join(", ") : "missing"),
      cell(reviewStatus.exists ? (record.reviewStatus.present ? "present" : "missing") : "not configured"),
      cell(record.provenance),
      cell(notes.join("; ") || "-"),
    ].join("|").replace(/^/, "|").replace(/$/, "|"));
  }
  lines.push("");
  if (writeDrafts && writtenDocs.length > 0) {
    lines.push("## Drafts Written");
    lines.push("");
    lines.push(...bulletList(writtenDocs.map(relative).map((file) => `\`${file}\``)));
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

function readReviewStatus(file) {
  if (!fs.existsSync(file)) return { exists: false, data: null };
  try {
    return { exists: true, data: JSON.parse(fs.readFileSync(file, "utf8")) };
  } catch {
    return { exists: true, data: fs.readFileSync(file, "utf8") };
  }
}

function readIfExists(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function firstMatch(text, regex) {
  const match = text.match(regex);
  return match ? match[1] : "";
}

function titleCase(value) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function bulletList(items) {
  return items.map((item) => `- ${item}`);
}

function cell(value) {
  return String(value || "-").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function relative(file) {
  const fromProduct = path.relative(productRoot, file);
  if (!fromProduct.startsWith("..")) return fromProduct || ".";
  return path.relative(process.cwd(), file);
}
