#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { URL } from "node:url";

const args = process.argv.slice(2);
const writeReport = args.includes("--write");
const jsonOnly = args.includes("--json");
const positional = args.filter((arg) => !arg.startsWith("--"));
const targetRoot = path.resolve(positional[0] || process.cwd());

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|avif|svg)$/i;
const FIGMA_URL_RE = /https?:\/\/(?:www\.)?figma\.com\/(?:file|design|proto|board|slides)\/[^\s)<|]+/g;
const FIGMA_NORMALIZED_RE = /figma:([A-Za-z0-9_-]+)#([^\s|)]+)/g;
const LOCALHOST_RE = /https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?\/?[^\s)<|]*/g;
const MARKDOWN_LINK_RE = /!?\[[^\]]*]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const BARE_IMAGE_RE = /(?:^|[\s(|])((?:~|\.{1,2}|\/)[^\s)|]+\.(?:png|jpe?g|webp|gif|avif|svg))(?:[\s)|]|$)/gi;
const GENERATED_STORYBOOK_FILES = new Set([
  "STORYBOOK_SOURCE_TRACE.md",
  "STORYBOOK_IMPLEMENTATION_MAP.md",
  "STORYBOOK_COMPONENT_QUEUE.md",
]);

const designSystemDir = resolveDesignSystemDir(targetRoot);
const packageRoot = path.basename(designSystemDir) === "design-system"
  ? path.dirname(designSystemDir)
  : targetRoot;
const markdownFiles = walk(designSystemDir).filter((file) => {
  return file.endsWith(".md") && !GENERATED_STORYBOOK_FILES.has(path.basename(file));
});

const sources = new Map();
const sourceIdToKey = new Map();

for (const file of markdownFiles) {
  if (path.basename(file) === "DESIGN_EVIDENCE_MAP.md") {
    parseSourceInventory(file);
  }
}

for (const file of markdownFiles) {
  scanMarkdownFile(file);
}

for (const file of markdownFiles.filter((file) => componentNameFor(file))) {
  parseComponentEvidence(file);
}

const sourceRecords = [...sources.values()].sort((a, b) => {
  if (a.type !== b.type) return a.type.localeCompare(b.type);
  return a.locator.localeCompare(b.locator);
});
const sourceList = sourceRecords.map(serializeSource);

const result = {
  designSystemDir,
  packageRoot,
  reportPath: path.join(designSystemDir, "STORYBOOK_SOURCE_TRACE.md"),
  totals: {
    sources: sourceList.length,
    figma: sourceRecords.filter((source) => source.type === "figma").length,
    images: sourceRecords.filter((source) => source.type === "image").length,
    frontendFolders: sourceRecords.filter((source) => source.type === "frontend-folder").length,
    renderedRoutes: sourceRecords.filter((source) => source.type === "rendered-route").length,
    unresolvedLocal: sourceRecords.filter((source) => source.local && !source.exists).length,
  },
  sources: sourceList,
};

if (jsonOnly) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} else {
  const markdown = renderMarkdown(result);
  if (writeReport) {
    fs.writeFileSync(result.reportPath, markdown);
  }
  process.stdout.write(markdown);
}

function resolveDesignSystemDir(root) {
  const directEvidenceMap = path.join(root, "DESIGN_EVIDENCE_MAP.md");
  const nestedEvidenceMap = path.join(root, "design-system", "DESIGN_EVIDENCE_MAP.md");

  if (fs.existsSync(directEvidenceMap)) return root;
  if (fs.existsSync(nestedEvidenceMap)) return path.join(root, "design-system");

  throw new Error(
    `Cannot find design-system package at ${root}. Expected DESIGN_EVIDENCE_MAP.md or design-system/DESIGN_EVIDENCE_MAP.md.`,
  );
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function parseSourceInventory(file) {
  const lines = readLines(file);
  const section = sectionLines(lines, "Source Inventory");

  for (const { line, lineNumber } of section) {
    const cells = splitMarkdownRow(line);
    if (!cells || cells.length < 3) continue;

    const [sourceId, declaredType, locator, , screenOrState, notes, confidence] = cells;
    if (/^source id$/i.test(sourceId) || /^-+$/.test(sourceId)) continue;
    if (!sourceId || !locator) continue;

    const key = addSource({
      type: inferType(locator, declaredType),
      locator,
      file,
      lineNumber,
      sourceId,
      context: [screenOrState, notes, confidence].filter(Boolean).join(" / "),
    });

    if (key) sourceIdToKey.set(stripFormatting(sourceId), key);
  }
}

function scanMarkdownFile(file) {
  const lines = readLines(file);
  const component = componentNameFor(file);

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    scanTextForSources(line, file, lineNumber, component);
  });
}

function parseComponentEvidence(file) {
  const component = componentNameFor(file);
  const lines = readLines(file);

  for (const { line, lineNumber } of sectionLines(lines, "Evidence")) {
    const cells = splitMarkdownRow(line);
    if (!cells || cells.length < 2) continue;
    if (/^evidence id$/i.test(cells[0]) || /^-+$/.test(cells[0])) continue;

    const sourceCell = stripFormatting(cells[1]);
    linkComponentToSourceId(sourceCell, component, file, lineNumber);
    scanTextForSources(sourceCell, file, lineNumber, component);
  }

  for (const { line, lineNumber } of lines.map((line, index) => ({ line, lineNumber: index + 1 }))) {
    const cells = splitMarkdownRow(line);
    if (!cells || cells.length < 2) continue;
    if (/visual reference/i.test(cells[0])) {
      scanTextForSources(cells.slice(1).join(" "), file, lineNumber, component);
    }
  }
}

function linkComponentToSourceId(sourceCell, component, file, lineNumber) {
  const candidates = [sourceCell, ...sourceCell.split(/[,\s;/]+/)]
    .map((candidate) => stripFormatting(candidate))
    .filter(Boolean);

  for (const candidate of new Set(candidates)) {
    const key = sourceIdToKey.get(candidate);
    if (!key) continue;

    const source = sources.get(key);
    source.components.add(component);
    source.seenIn.add(`${relative(file)}:${lineNumber}`);
  }
}

function scanTextForSources(text, file, lineNumber, component) {
  for (const locator of matches(text, FIGMA_URL_RE)) {
    addSource({ type: "figma", locator: stripTrailingPunctuation(locator), file, lineNumber, component });
  }

  FIGMA_NORMALIZED_RE.lastIndex = 0;
  for (const match of text.matchAll(FIGMA_NORMALIZED_RE)) {
    addSource({ type: "figma", locator: `figma:${match[1]}#${match[2]}`, file, lineNumber, component });
  }

  for (const locator of matches(text, LOCALHOST_RE)) {
    addSource({ type: "rendered-route", locator: stripTrailingPunctuation(locator), file, lineNumber, component });
  }

  MARKDOWN_LINK_RE.lastIndex = 0;
  for (const match of text.matchAll(MARKDOWN_LINK_RE)) {
    const locator = decodeURIComponent(stripTrailingPunctuation(match[1]));
    const type = inferType(locator, "");
    if (type !== "url" && type !== "local-path") {
      addSource({ type, locator, file, lineNumber, component });
    }
  }

  BARE_IMAGE_RE.lastIndex = 0;
  for (const match of text.matchAll(BARE_IMAGE_RE)) {
    addSource({ type: "image", locator: stripTrailingPunctuation(match[1]), file, lineNumber, component });
  }
}

function addSource({ type, locator, file, lineNumber, sourceId, context = "", component }) {
  const cleanLocator = stripFormatting(locator);
  if (!cleanLocator || cleanLocator === "-") return null;

  const normalized = normalizeLocator(cleanLocator);
  const effectiveType = inferType(normalized, type);
  const figmaInfo = effectiveType === "figma" ? parseFigma(normalized) : null;
  const key = canonicalSourceKey(effectiveType, normalized, figmaInfo);
  const localResolution = resolveLocalPath(normalized, file);

  if (!sources.has(key)) {
    sources.set(key, {
      key,
      type: effectiveType,
      locator: normalized,
      local: localResolution.local,
      resolvedPath: localResolution.resolvedPath,
      exists: localResolution.exists,
      figma: figmaInfo,
      sourceIds: new Set(),
      seenIn: new Set(),
      components: new Set(),
      context: new Set(),
    });
  } else if (effectiveType === "figma" && /^https?:\/\//i.test(normalized)) {
    const source = sources.get(key);
    source.locator = normalized;
    source.figma = figmaInfo;
  }

  const source = sources.get(key);
  if (sourceId) {
    source.sourceIds.add(stripFormatting(sourceId));
    sourceIdToKey.set(stripFormatting(sourceId), key);
  }
  if (component) source.components.add(component);
  if (context) source.context.add(stripFormatting(context));
  source.seenIn.add(`${relative(file)}:${lineNumber}`);

  return key;
}

function inferType(locator, declaredType = "") {
  const declared = String(declaredType).toLowerCase();
  const value = String(locator).toLowerCase();

  if (declared.includes("figma") || value.startsWith("figma:") || value.includes("figma.com/")) return "figma";
  if (
    declared.includes("image")
    || declared.includes("screenshot")
    || declared.includes("crop")
    || declared.includes("graphic")
    || declared.includes("brand")
    || declared.includes("editorial")
    || declared.includes("poster")
    || declared.includes("social")
    || declared.includes("marketing")
    || IMAGE_EXT.test(value)
  ) {
    return "image";
  }
  if (declared.includes("rendered") || declared.includes("route") || isRenderedRoute(value)) return "rendered-route";
  if (
    declared.includes("frontend")
    || declared.includes("front-end")
    || declared.includes("project")
    || declared.includes("prototype")
    || declared.includes("folder")
    || declared.includes("repo")
    || declared.includes("code")
  ) {
    return "frontend-folder";
  }
  if (/^https?:\/\//i.test(locator)) return "url";
  return isLocalPath(locator) ? "local-path" : "unknown";
}

function resolveLocalPath(locator, sourceFile) {
  if (!isLocalPath(locator)) {
    return { local: false, resolvedPath: "", exists: false };
  }

  const withoutHash = locator.split("#")[0];
  const expanded = withoutHash.startsWith("~/")
    ? path.join(process.env.HOME || "", withoutHash.slice(2))
    : withoutHash;

  const candidates = path.isAbsolute(expanded)
    ? [expanded]
    : [
      path.resolve(path.dirname(sourceFile), expanded),
      path.resolve(designSystemDir, expanded),
      path.resolve(packageRoot, expanded),
      path.resolve(targetRoot, expanded),
    ];

  const existing = candidates.find((candidate) => fs.existsSync(candidate));
  return {
    local: true,
    resolvedPath: existing || candidates[0],
    exists: Boolean(existing),
  };
}

function parseFigma(locator) {
  if (locator.startsWith("figma:")) {
    const match = locator.match(/^figma:([^#]+)#(.+)$/);
    if (!match) return null;

    const nodeOrPage = match[2];
    return {
      fileKey: match[1],
      nodeId: nodeOrPage.startsWith("page:") ? "" : normalizeNodeId(nodeOrPage),
      page: nodeOrPage.startsWith("page:") ? nodeOrPage.slice(5) : "",
      url: "",
    };
  }

  try {
    const url = new URL(locator);
    const [, kind, fileKey] = url.pathname.split("/");
    const nodeParam = url.searchParams.get("node-id") || "";
    return {
      fileKey: fileKey || "",
      nodeId: normalizeNodeId(nodeParam),
      page: "",
      url: locator,
      kind,
    };
  } catch {
    return null;
  }
}

function canonicalSourceKey(type, locator, figmaInfo) {
  if (type === "figma" && figmaInfo?.fileKey && (figmaInfo.nodeId || figmaInfo.page)) {
    return `figma:${figmaInfo.fileKey}#${figmaInfo.nodeId || `page:${figmaInfo.page}`}`;
  }
  return `${type}:${locator}`;
}

function serializeSource(source) {
  return {
    ...source,
    sourceIds: [...source.sourceIds],
    seenIn: [...source.seenIn],
    components: [...source.components],
    context: [...source.context],
  };
}

function renderMarkdown(data) {
  const lines = [];
  lines.push("# Storybook Source Trace");
  lines.push("");
  lines.push(`- Design-system root: \`${data.designSystemDir}\``);
  lines.push(`- Package root: \`${data.packageRoot}\``);
  lines.push(`- Sources found: ${data.totals.sources}`);
  lines.push(`- Figma: ${data.totals.figma}`);
  lines.push(`- Images: ${data.totals.images}`);
  lines.push(`- Frontend folders: ${data.totals.frontendFolders}`);
  lines.push(`- Rendered routes: ${data.totals.renderedRoutes}`);
  lines.push(`- Unresolved local sources: ${data.totals.unresolvedLocal}`);
  lines.push("");
  lines.push("## Source Index");
  lines.push("");
  lines.push("| Source IDs | Type | Location | Resolved path | Components | Seen in | Status |");
  lines.push("|---|---|---|---|---|---|---|");

  for (const source of data.sources) {
    const status = source.local ? (source.exists ? "resolved" : "missing") : "remote";
    lines.push([
      cell(source.sourceIds.join(", ") || "-"),
      cell(source.type),
      cell(source.locator),
      cell(source.resolvedPath || "-"),
      cell(source.components.filter(Boolean).join(", ") || "-"),
      cell(source.seenIn.join(", ")),
      cell(status),
    ].join("|").replace(/^/, "|").replace(/$/, "|"));
  }

  lines.push("");
  lines.push("## Figma MCP Targets");
  lines.push("");
  lines.push("| Location | File key | Node or page | Suggested read |");
  lines.push("|---|---|---|---|");

  const figmaSources = data.sources.filter((source) => source.type === "figma");
  if (figmaSources.length === 0) {
    lines.push("| - | - | - | - |");
  } else {
    for (const source of figmaSources) {
      const figma = source.figma || {};
      const target = figma.nodeId || (figma.page ? `page:${figma.page}` : "-");
      const suggested = figma.nodeId
        ? `get_design_context(nodeId: "${figma.nodeId}") and get_screenshot(nodeId: "${figma.nodeId}")`
        : "get_metadata() to locate the component frame, then get_design_context on the selected node";
      lines.push(`|${cell(source.locator)}|${cell(figma.fileKey || "-")}|${cell(target)}|${cell(suggested)}|`);
    }
  }

  lines.push("");
  lines.push("## Component Source Links");
  lines.push("");
  lines.push("| Component | Source IDs / locations |");
  lines.push("|---|---|");

  const componentMap = new Map();
  for (const source of data.sources) {
    for (const component of source.components) {
      if (!componentMap.has(component)) componentMap.set(component, []);
      componentMap.get(component).push(source.sourceIds.join(", ") || source.locator);
    }
  }

  if (componentMap.size === 0) {
    lines.push("| - | - |");
  } else {
    for (const [component, refs] of [...componentMap.entries()].sort()) {
      lines.push(`|${cell(component)}|${cell([...new Set(refs)].join("; "))}|`);
    }
  }

  lines.push("");
  lines.push("## Story Source URL Parameters");
  lines.push("");
  lines.push("| Component | Preferred URL | Story parameter | Source IDs |");
  lines.push("|---|---|---|---|");

  const storySourceRows = getStorySourceRows(data.sources);
  if (storySourceRows.length === 0) {
    lines.push("| - | - | - | - |");
  } else {
    for (const row of storySourceRows) {
      lines.push(
        `|${cell(row.component)}|${cell(row.url)}|${cell(row.parameter)}|${cell(row.sourceIds)}|`,
      );
    }
  }

  lines.push("");
  lines.push("## Missing Or Ambiguous Sources");
  lines.push("");
  const missing = data.sources.filter((source) => source.local && !source.exists);
  if (missing.length === 0) {
    lines.push("- None detected.");
  } else {
    for (const source of missing) {
      lines.push(`- \`${source.locator}\` referenced by ${source.seenIn.join(", ")} did not resolve to a local file or folder.`);
    }
  }

  lines.push("");
  lines.push("## Usage Notes");
  lines.push("");
  lines.push("- Inspect Figma sources with Figma MCP before implementing components that reference those sources.");
  lines.push("- Inspect image/crop sources directly and use them for Storybook visual checks.");
  lines.push("- Inspect frontend-folder sources for behavior and existing implementation patterns, but keep extracted tokens and component specs normative.");
  lines.push("- If a source contradicts the extracted spec, update the implementation map and ask whether to revise the extraction.");
  lines.push("");

  return `${lines.join("\n")}\n`;
}

function getStorySourceRows(sourceList) {
  const byComponent = new Map();

  for (const source of sourceList) {
    const storyUrl = getStorySourceUrl(source);
    if (!storyUrl) continue;

    for (const component of source.components) {
      if (!component) continue;
      const candidate = {
        component,
        parameter: storyUrl.includes("figma.com/")
          ? "parameters.figmaSourceUrl"
          : "parameters.design.url",
        rank: getStorySourceRank(source, storyUrl),
        sourceIds: source.sourceIds.join(", ") || "-",
        url: storyUrl,
      };
      const previous = byComponent.get(component);
      if (!previous || candidate.rank < previous.rank) {
        byComponent.set(component, candidate);
      }
    }
  }

  return [...byComponent.values()]
    .sort((a, b) => a.component.localeCompare(b.component))
    .map(({ rank, ...row }) => row);
}

function getStorySourceUrl(source) {
  if (!/^https?:\/\//i.test(source.locator)) return "";
  return source.locator;
}

function getStorySourceRank(source, url) {
  if (source.type === "figma" && url.includes("figma.com/")) return 0;
  if (source.type === "rendered-route") return 1;
  if (source.type === "url") return 2;
  if (source.type === "image") return 3;
  return 4;
}

function readLines(file) {
  return fs.readFileSync(file, "utf8").split(/\r?\n/);
}

function sectionLines(lines, heading) {
  const result = [];
  let inSection = false;
  const headingRe = new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`, "i");

  lines.forEach((line, index) => {
    if (headingRe.test(line.trim())) {
      inSection = true;
      return;
    }
    if (inSection && /^#{1,2}\s+/.test(line.trim())) {
      inSection = false;
    }
    if (inSection) result.push({ line, lineNumber: index + 1 });
  });

  return result;
}

function splitMarkdownRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return null;
  const cells = trimmed.slice(1, -1).split("|").map((cellValue) => stripFormatting(cellValue));
  if (cells.every((cellValue) => /^:?-{3,}:?$/.test(cellValue))) return null;
  return cells;
}

function matches(text, regex) {
  regex.lastIndex = 0;
  return [...text.matchAll(regex)].map((match) => match[0]);
}

function stripFormatting(value) {
  return String(value || "")
    .trim()
    .replace(/^`|`$/g, "")
    .replace(/^<|>$/g, "");
}

function stripTrailingPunctuation(value) {
  return String(value || "").replace(/[.,;]+$/g, "");
}

function normalizeLocator(locator) {
  return stripTrailingPunctuation(locator).replace(/&amp;/g, "&");
}

function normalizeNodeId(nodeId) {
  return String(nodeId || "").replace(/-/g, ":");
}

function isLocalPath(locator) {
  return /^(?:~|\.{1,2}\/|\/)/.test(locator);
}

function isRenderedRoute(value) {
  return /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?\/?/i.test(value);
}

function componentNameFor(file) {
  const componentsDir = path.join(designSystemDir, "components");
  if (!file.startsWith(`${componentsDir}${path.sep}`)) return "";
  return path.basename(file, path.extname(file));
}

function relative(file) {
  return path.relative(packageRoot, file) || path.basename(file);
}

function cell(value) {
  const normalized = String(value || "-")
    .replace(/\r?\n/g, " ")
    .replace(/\|/g, "\\|")
    .trim();
  return ` ${normalized || "-"} `;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
