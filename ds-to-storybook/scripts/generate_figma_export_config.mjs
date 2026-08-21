#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { URL } from "node:url";

const args = process.argv.slice(2);
const writeConfig = args.includes("--write");
const jsonOnly = args.includes("--json");
const productRootFlagIndex = args.indexOf("--product-root");
const positional = args.filter((arg, index) => {
  if (arg === "--write" || arg === "--json" || arg === "--product-root") return false;
  if (productRootFlagIndex >= 0 && index === productRootFlagIndex + 1) return false;
  return !arg.startsWith("--");
});
const designSystemRoot = path.resolve(positional[0] || process.cwd());
const productRoot = path.resolve(
  productRootFlagIndex >= 0 ? args[productRootFlagIndex + 1] : positional[1] || designSystemRoot,
);

const designSystemDir = resolveDesignSystemDir(designSystemRoot);
const packageRoot = path.basename(designSystemDir) === "design-system"
  ? path.dirname(designSystemDir)
  : designSystemRoot;
const storybookDir = path.join(productRoot, ".storybook");
const configPath = path.join(storybookDir, "figma-export.config.ts");

const sourceTracePath = path.join(designSystemDir, "STORYBOOK_SOURCE_TRACE.md");
const componentPlanPath = path.join(designSystemDir, "STORYBOOK_COMPONENT_PLAN.md");
const componentInventoryPath = path.join(designSystemDir, "COMPONENT_INVENTORY.md");
const storyRows = fs.existsSync(sourceTracePath) ? parseStorySourceRows(sourceTracePath) : [];
const planRows = fs.existsSync(componentPlanPath) ? parseBuildPlanRows(componentPlanPath) : [];
const inventoryRows = fs.existsSync(componentInventoryPath) ? parseInventoryRows(componentInventoryPath) : [];
const tokenPrefix = detectTokenPrefix(packageRoot, productRoot);
const storyTitlePrefix = detectStoryTitlePrefixes(productRoot);
const existingConfig = readExistingProjectConfig(configPath);
const componentClassPrefixes = existingConfig.addon.componentClassPrefixes.length
  ? existingConfig.addon.componentClassPrefixes
  : tokenPrefix
    ? [`${tokenPrefix}-`]
    : [];
const figmaUrls = storyRows.map((row) => row.url).filter((url) => url.includes("figma.com/"));
const designSystemFileUrlFallback =
  getFigmaFileUrl(figmaUrls[0] || "") || findDesignSystemFigmaFileUrl(designSystemDir);
const documentedNodeOverrides = designSystemFileUrlFallback
  ? parseComponentNodeOverrides(designSystemDir)
  : {};
const tracedNodeOverrides = Object.fromEntries(
  storyRows
    .map((row) => [componentSlug(row.component), getFigmaNodeIdFromUrl(row.url)])
    .filter(([slug, nodeId]) => slug && nodeId),
);
const nodeOverrides = {
  ...documentedNodeOverrides,
  ...tracedNodeOverrides,
  ...existingConfig.source.nodeOverrides,
};
const absoluteFidelityComponents = inferAbsoluteFidelityComponents(planRows, inventoryRows);
const commentsApiPath = resolveMirroredValue({
  label: "comments API path",
  preview: existingConfig.review.visualComments?.apiPath,
  server: existingConfig.review.commentsApiPath,
  fallback: "/__figma_export_review_comments",
});
const commentsEnabled = resolveMirroredValue({
  label: "comments enabled flag",
  preview: existingConfig.review.visualComments?.enabled,
  server: existingConfig.review.commentsEnabled,
  fallback: true,
});

const config = {
  addon: {
    absoluteFidelityComponents: uniqueSorted([
      ...absoluteFidelityComponents,
      ...existingConfig.addon.absoluteFidelityComponents,
    ]),
    componentClassPrefixes,
    embeddedSvgByDataGraphic: existingConfig.addon.embeddedSvgByDataGraphic,
    // Prefer an existing project value, but always collapse deep paths like
    // "Components/Examples/" down to the top-level namespace "Components/".
    // Without this, regenerating a config that was produced by the old detector
    // would keep silently excluding sibling subcategories.
    storyTitlePrefix: resolveStoryTitlePrefix(
      existingConfig.addon.storyTitlePrefix,
      storyTitlePrefix,
    ),
    tokenPrefix: existingConfig.addon.tokenPrefix ?? tokenPrefix,
  },
  review: {
    apiPath: existingConfig.review.apiPath ?? "/__figma_export_review_status",
    commentsApiPath,
    commentsDir: existingConfig.review.commentsDir ?? "design-system/figma-export-review",
    commentsEnabled,
    visualComments: {
      enabled: commentsEnabled,
      apiPath: commentsApiPath,
      captureSelector:
        existingConfig.review.visualComments?.captureSelector ?? "#storybook-root",
      authorStorageKey:
        existingConfig.review.visualComments?.authorStorageKey ?? "sbfx:review-author",
    },
    enabled: existingConfig.review.enabled ?? true,
    pluginName: existingConfig.review.pluginName ?? "figma-export-review-status-api",
    statusFilePath: existingConfig.review.statusFilePath ?? "design-system/figma-export-review-status.json",
  },
  source: {
    designSystemFileUrlFallback:
      existingConfig.source.designSystemFileUrlFallback || designSystemFileUrlFallback,
    nodeOverrides,
  },
};

function resolveMirroredValue({ label, preview, server, fallback }) {
  if (preview !== undefined && server !== undefined && preview !== server) {
    throw new Error(
      `Figma export ${label} mismatch: preview resolves ${JSON.stringify(preview)} while server resolves ${JSON.stringify(server)}. Update .storybook/figma-export.config.ts so both values match.`,
    );
  }
  return server ?? preview ?? fallback;
}

if (jsonOnly) {
  process.stdout.write(`${JSON.stringify({ config, configPath }, null, 2)}\n`);
} else {
  const source = renderConfig(config);
  if (writeConfig) {
    fs.mkdirSync(storybookDir, { recursive: true });
    fs.writeFileSync(configPath, source);
  }
  process.stdout.write(source);
}

function resolveDesignSystemDir(root) {
  const directEvidenceMap = path.join(root, "DESIGN_EVIDENCE_MAP.md");
  const nestedEvidenceMap = path.join(root, "design-system", "DESIGN_EVIDENCE_MAP.md");
  const directInventory = path.join(root, "COMPONENT_INVENTORY.md");
  const nestedInventory = path.join(root, "design-system", "COMPONENT_INVENTORY.md");

  if (fs.existsSync(directEvidenceMap) || fs.existsSync(directInventory)) return root;
  if (fs.existsSync(nestedEvidenceMap) || fs.existsSync(nestedInventory)) return path.join(root, "design-system");

  throw new Error(
    `Cannot find design-system package at ${root}. Expected DESIGN_EVIDENCE_MAP.md, COMPONENT_INVENTORY.md, or nested design-system/.`,
  );
}

function parseStorySourceRows(file) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  const rows = sectionLines(lines, "Story Source URL Parameters");
  const result = [];

  for (const { line } of rows) {
    const cells = splitMarkdownRow(line);
    if (!cells || cells.length < 2 || /^component$/i.test(cells[0])) continue;
    if (!cells[0] || cells[0] === "-") continue;
    result.push({
      component: cells[0],
      url: cells[1],
    });
  }

  return result.length > 0 ? result : parseStorySourceRowsFromSourceIndex(lines);
}

function parseStorySourceRowsFromSourceIndex(lines) {
  const rows = sectionLines(lines, "Source Index");
  const result = [];

  for (const { line } of rows) {
    const cells = splitMarkdownRow(line);
    if (!cells || cells.length < 5 || /^source ids$/i.test(cells[0])) continue;
    const [, type, location, , components] = cells;
    if (type.toLowerCase() !== "figma" || !/^https?:\/\//i.test(location)) continue;

    for (const component of components.split(/\s*,\s*/)) {
      if (!component || component === "-") continue;
      result.push({
        component,
        url: location,
      });
    }
  }

  return result;
}

function parseBuildPlanRows(file) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  return sectionLines(lines, "Recommended Build Order")
    .map(({ line }) => splitMarkdownRow(line))
    .filter((cells) => cells && cells.length >= 4 && !/^order$/i.test(cells[0]))
    .map((cells) => ({
      category: cells[3],
      component: cells[2],
    }));
}

function parseInventoryRows(file) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  let headers = [];
  const rows = [];

  for (const line of lines) {
    if (/^##\s+Component Similarity Review\b/i.test(line.trim())) {
      headers = [];
      continue;
    }

    const cells = splitMarkdownRow(line);
    if (!cells) continue;
    if (cells.every((cellValue) => /^:?-{3,}:?$/.test(cellValue))) continue;
    if (headers.length === 0 && cells.some((cellValue) => /component|name/i.test(cellValue))) {
      headers = cells.map(normalizeKey);
      continue;
    }
    const componentIndex = headers.findIndex((header) => ["component", "name", "item"].includes(header));
    if (componentIndex < 0 || !cells[componentIndex]) continue;
    rows.push({
      category: getCell(cells, headers, ["category", "type", "group"]),
      component: cells[componentIndex],
    });
  }

  return rows;
}

function detectTokenPrefix(...roots) {
  const candidateFiles = [];
  for (const root of roots) {
    candidateFiles.push(
      path.join(root, "tokens", "tokens-ref.css"),
      path.join(root, "tokens", "tokens.css"),
      path.join(root, "src", "tokens.css"),
    );
  }

  const counts = new Map();
  for (const file of candidateFiles) {
    if (!fs.existsSync(file)) continue;
    const css = fs.readFileSync(file, "utf8");
    for (const match of css.matchAll(/--([a-zA-Z][a-zA-Z0-9]*)-(?:ref|sys|comp)-/g)) {
      counts.set(match[1], (counts.get(match[1]) || 0) + 1);
    }
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "";
}

// Derive the addon's storyTitlePrefix filter from existing story titles.
// Only the TOP-LEVEL namespace is emitted ("Components/", "Foundations/",
// "Pages/"), never a deeper path such as "Components/Examples/": prefixes are
// matched with startsWith, so a deep prefix silently excludes every sibling
// subcategory ("Components/Actions/...") and the export overlay never mounts
// for those stories. Titles without a "/" are ignored, and when no titled
// story can be detected at all the function returns false, which the addon
// treats as "include every story".
function detectStoryTitlePrefixes(root) {
  const storyFiles = walkSafe(path.join(root, "src"))
    .filter((file) => /\.stories\.[cm]?[jt]sx?$/.test(file));
  const prefixes = new Set();

  for (const file of storyFiles) {
    const text = fs.readFileSync(file, "utf8");
    for (const match of text.matchAll(/title\s*:\s*["'`]([^"'`/]+)\/[^"'`]*["'`]/g)) {
      prefixes.add(`${match[1].trim()}/`);
    }
  }

  const values = [...prefixes].sort();
  return values.length ? values : false;
}

function normalizeStoryTitlePrefixes(value) {
  if (value === false) return false;
  if (!Array.isArray(value) || value.length === 0) return undefined;

  const prefixes = new Set();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const first = item.trim().split("/").filter(Boolean)[0];
    if (first) prefixes.add(`${first}/`);
  }

  const values = [...prefixes].sort();
  return values.length ? values : false;
}

function resolveStoryTitlePrefix(existing, detected) {
  if (existing === false) return false;
  const normalizedExisting = normalizeStoryTitlePrefixes(existing);
  if (normalizedExisting !== undefined) return normalizedExisting;
  return detected;
}

function inferAbsoluteFidelityComponents(planRows, inventoryRows) {
  const rows = planRows.length ? planRows : inventoryRows;
  return rows
    .filter((row) => /page|screen|composite|product-pattern|typographic|text[- ]?lockup|type[- ]?lockup|lockup|heading stack|title lockup|hero title|editorial heading|quote lockup/i.test(`${row.category} ${row.component}`))
    .map((row) => componentSlug(row.component))
    .filter(Boolean)
    .sort();
}

function getFigmaFileUrl(urlValue) {
  if (!urlValue) return "";
  try {
    const url = new URL(urlValue);
    url.search = "";
    url.hash = "";
    return url.href.replace(/\/$/, "");
  } catch {
    return "";
  }
}

function getFigmaNodeIdFromUrl(urlValue) {
  try {
    const url = new URL(urlValue);
    const nodeId = url.searchParams.get("node-id") || "";
    return nodeId.replace(/-/g, ":");
  } catch {
    return "";
  }
}

function getFigmaNodeIdFromText(value) {
  const figmaNodeMatch = value.match(/Figma\s+`(\d+):(\d+)`/);
  if (figmaNodeMatch) return `${figmaNodeMatch[1]}:${figmaNodeMatch[2]}`;

  const fingerprintMatch = value.match(/figma:[^#\s`]+#(\d+):(\d+)/);
  if (fingerprintMatch) return `${fingerprintMatch[1]}:${fingerprintMatch[2]}`;

  const urlNodeMatch = value.match(/node-id=(\d+)-(\d+)/);
  return urlNodeMatch ? `${urlNodeMatch[1]}:${urlNodeMatch[2]}` : "";
}

function findDesignSystemFigmaFileUrl(dir) {
  const files = [
    "DESIGN_SYSTEM_KICKSTART.md",
    "SESSION_STATE.md",
    "DESIGN_EVIDENCE_MAP.md",
  ].map((file) => path.join(dir, file));

  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const markdown = fs.readFileSync(file, "utf8");
    const match = markdown.match(/https:\/\/(?:www\.)?figma\.com\/design\/[^\s)<|?]+/);
    if (match) return getFigmaFileUrl(match[0]);
  }

  return "";
}

function parseComponentNodeOverrides(dir) {
  const componentsDir = path.join(dir, "components");
  const overrides = {};

  for (const file of walkSafe(componentsDir).filter((candidate) => candidate.endsWith(".md"))) {
    const markdown = fs.readFileSync(file, "utf8");
    const nodeId = markdown
      .split("\n")
      .map(getFigmaNodeIdFromText)
      .find(Boolean);
    if (!nodeId) continue;
    overrides[componentSlug(path.basename(file, ".md"))] = nodeId;
  }

  return overrides;
}

function readExistingProjectConfig(file) {
  const empty = {
    addon: {
      absoluteFidelityComponents: [],
      componentClassPrefixes: [],
      embeddedSvgByDataGraphic: {},
      storyTitlePrefix: undefined,
      tokenPrefix: undefined,
    },
    review: {
      apiPath: undefined,
      commentsApiPath: undefined,
      commentsDir: undefined,
      commentsEnabled: undefined,
      visualComments: undefined,
      enabled: undefined,
      pluginName: undefined,
      statusFilePath: undefined,
    },
    source: {
      designSystemFileUrlFallback: "",
      nodeOverrides: {},
    },
  };

  if (!fs.existsSync(file)) return empty;

  const text = fs.readFileSync(file, "utf8");
  const visualCommentsBlock = extractObjectBlock(text, "visualComments");
  return {
    addon: {
      absoluteFidelityComponents: extractStringArray(text, "absoluteFidelityComponents"),
      componentClassPrefixes: extractStringArray(text, "componentClassPrefixes"),
      embeddedSvgByDataGraphic: extractObjectStringMap(text, "embeddedSvgByDataGraphic"),
      storyTitlePrefix: extractStoryTitlePrefix(text),
      tokenPrefix: extractStringProperty(text, "tokenPrefix"),
    },
    review: {
      apiPath: extractStringProperty(text, "apiPath"),
      commentsApiPath: extractStringProperty(text, "commentsApiPath"),
      commentsDir: extractStringProperty(text, "commentsDir"),
      commentsEnabled: extractBooleanProperty(text, "commentsEnabled"),
      visualComments: visualCommentsBlock
        ? {
            enabled: extractBooleanProperty(visualCommentsBlock, "enabled") ?? true,
            apiPath:
              extractStringProperty(visualCommentsBlock, "apiPath") ??
              "/__figma_export_review_comments",
            captureSelector:
              extractStringProperty(visualCommentsBlock, "captureSelector") ??
              "#storybook-root",
            authorStorageKey:
              extractStringProperty(visualCommentsBlock, "authorStorageKey") ??
              "sbfx:review-author",
          }
        : undefined,
      enabled: extractBooleanProperty(text, "enabled"),
      pluginName: extractStringProperty(text, "pluginName"),
      statusFilePath: extractStringProperty(text, "statusFilePath"),
    },
    source: {
      designSystemFileUrlFallback:
        extractStringProperty(text, "designSystemFileUrlFallback") || "",
      nodeOverrides: extractObjectStringMap(text, "nodeOverrides"),
    },
  };
}

function extractObjectBlock(text, propertyName) {
  const property = new RegExp(
    `["']?${escapeRegExp(propertyName)}["']?\\s*:\\s*{`,
  ).exec(text);
  if (!property) return "";
  const start = property.index + property[0].length;
  let depth = 1;
  let quote = "";
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}") depth -= 1;
    if (depth === 0) return text.slice(start, index);
  }
  return "";
}

function extractStringProperty(text, propertyName) {
  const match = text.match(new RegExp(`["']?${escapeRegExp(propertyName)}["']?\\s*:\\s*["']([^"']*)["']`));
  return match?.[1];
}

function extractBooleanProperty(text, propertyName) {
  const match = text.match(new RegExp(`["']?${escapeRegExp(propertyName)}["']?\\s*:\\s*(true|false)`));
  if (!match) return undefined;
  return match[1] === "true";
}

function extractStringArray(text, propertyName) {
  const match = text.match(new RegExp(`["']?${escapeRegExp(propertyName)}["']?\\s*:\\s*\\[([\\s\\S]*?)\\]`));
  if (!match) return [];
  return [...match[1].matchAll(/["']([^"']+)["']/g)].map((item) => item[1]);
}

function extractStoryTitlePrefix(text) {
  const falseMatch = text.match(/["']?storyTitlePrefix["']?\s*:\s*false/);
  if (falseMatch) return false;
  const values = extractStringArray(text, "storyTitlePrefix");
  return values.length ? values : undefined;
}

function extractObjectStringMap(text, propertyName) {
  const match = text.match(new RegExp(`["']?${escapeRegExp(propertyName)}["']?\\s*:\\s*{([\\s\\S]*?)}`));
  if (!match) return {};

  return Object.fromEntries(
    [...match[1].matchAll(/(?:["']([^"']+)["']|([A-Za-z_$][\w$-]*))\s*:\s*["']([^"']*)["']/g)]
      .map((item) => [item[1] ?? item[2], item[3]]),
  );
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function renderConfig(value) {
  return `export type FigmaExportProjectConfig = {
  addon: {
    absoluteFidelityComponents: string[];
    componentClassPrefixes: string[];
    embeddedSvgByDataGraphic: Record<string, string>;
    storyTitlePrefix: string[] | false;
    tokenPrefix?: string;
  };
  review: {
    apiPath: string;
    commentsApiPath: string;
    commentsDir: string;
    commentsEnabled: boolean;
    visualComments: {
      enabled: boolean;
      apiPath: string;
      captureSelector: string;
      authorStorageKey: string;
    };
    enabled: boolean;
    pluginName: string;
    statusFilePath: string;
  };
  source: {
    designSystemFileUrlFallback: string;
    nodeOverrides: Record<string, string>;
  };
};

export function defineFigmaExportProjectConfig(
  config: FigmaExportProjectConfig,
): FigmaExportProjectConfig {
  return config;
}

export const figmaExportProjectConfig = defineFigmaExportProjectConfig(${JSON.stringify(value, null, 2)});
`;
}

function walkSafe(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkSafe(fullPath));
    if (entry.isFile()) files.push(fullPath);
  }
  return files;
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
    if (inSection && /^#{1,2}\s+/.test(line.trim())) inSection = false;
    if (inSection) result.push({ line, lineNumber: index + 1 });
  });

  return result;
}

function splitMarkdownRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return null;
  const cells = trimmed.slice(1, -1).split("|").map(stripFormatting);
  if (cells.every((cellValue) => /^:?-{3,}:?$/.test(cellValue))) return null;
  return cells;
}

function getCell(cells, headers, candidates) {
  const index = headers.findIndex((header) => candidates.some((candidate) => header.includes(candidate)));
  return index >= 0 ? cells[index] || "" : "";
}

function componentSlug(value) {
  return normalizeKey(value);
}

function normalizeKey(value) {
  return stripFormatting(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stripFormatting(value) {
  return String(value || "")
    .trim()
    .replace(/^`|`$/g, "")
    .replace(/^<|>$/g, "");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
