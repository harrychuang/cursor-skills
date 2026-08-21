#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const writeReport = args.includes("--write");
const writeQueue = args.includes("--queue");
const jsonOnly = args.includes("--json");
const batchSizeFlagIndex = args.indexOf("--batch-size");
const batchSize = parsePositiveInteger(
  batchSizeFlagIndex >= 0 ? args[batchSizeFlagIndex + 1] : "",
  4,
);
const positional = args.filter((arg, index) => {
  if (arg === "--write" || arg === "--queue" || arg === "--json" || arg === "--batch-size") return false;
  if (batchSizeFlagIndex >= 0 && index === batchSizeFlagIndex + 1) return false;
  return !arg.startsWith("--");
});
const targetRoot = path.resolve(positional[0] || process.cwd());

const CATEGORY_TIERS = [
  ["foundation", 0],
  ["primitive", 1],
  ["typographic", 2],
  ["form-control", 3],
  ["layout", 4],
  ["navigation", 5],
  ["data-display", 6],
  ["feedback", 7],
  ["overlay", 8],
  ["composite", 9],
  ["product-pattern", 10],
  ["unknown", 11],
];
const CATEGORY_TIER_MAP = new Map(CATEGORY_TIERS);
const BLOCKED_STATUS_RE = /\b(blocked|deferred|out[- ]of[- ]scope|needs[- ]extraction)\b/i;
const IMPLEMENTABLE_STATUS_RE = /\b(extracted|planned|ready|queued|in[- ]progress|todo|to do|candidate)\b/i;
const GENERATED_STORYBOOK_FILES = new Set([
  "STORYBOOK_SOURCE_TRACE.md",
  "STORYBOOK_IMPLEMENTATION_MAP.md",
  "STORYBOOK_COMPONENT_QUEUE.md",
  "STORYBOOK_COMPONENT_PLAN.md",
]);

const designSystemDir = resolveDesignSystemDir(targetRoot);
const packageRoot = path.basename(designSystemDir) === "design-system"
  ? path.dirname(designSystemDir)
  : targetRoot;
const componentsDir = path.join(designSystemDir, "components");
const inventoryPath = path.join(designSystemDir, "COMPONENT_INVENTORY.md");
const sourceTracePath = path.join(designSystemDir, "STORYBOOK_SOURCE_TRACE.md");
const reportPath = path.join(designSystemDir, "STORYBOOK_COMPONENT_PLAN.md");
const queuePath = path.join(designSystemDir, "STORYBOOK_COMPONENT_QUEUE.md");

const inventoryRecords = fs.existsSync(inventoryPath)
  ? parseComponentInventory(inventoryPath)
  : [];
const componentFiles = fs.existsSync(componentsDir)
  ? walk(componentsDir).filter((file) => file.endsWith(".md") && !GENERATED_STORYBOOK_FILES.has(path.basename(file)))
  : [];
const sourceTrace = fs.existsSync(sourceTracePath)
  ? parseSourceTrace(sourceTracePath)
  : { componentSources: new Map(), storyUrls: new Map() };
const components = buildComponentRecords(inventoryRecords, componentFiles, sourceTrace);
const dependencyAnalysis = analyzeDependencies(components);
const orderedComponents = orderComponents(components, dependencyAnalysis);
const batches = buildBatches(orderedComponents, batchSize);
const result = {
  batchSize,
  designSystemDir,
  packageRoot,
  queuePath,
  reportPath,
  sourceTracePath: fs.existsSync(sourceTracePath) ? sourceTracePath : "",
  totals: {
    batches: batches.length,
    components: orderedComponents.length,
    cycles: dependencyAnalysis.cycles.length,
    skipped: components.filter((component) => !component.implementable).length,
  },
  components: orderedComponents.map((component, index) => serializeComponent(component, index + 1, batches)),
  batches,
  cycles: dependencyAnalysis.cycles,
  skipped: components
    .filter((component) => !component.implementable)
    .map((component) => ({
      component: component.name,
      reason: component.skipReason,
      status: component.status || "-",
    })),
};

if (jsonOnly) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} else {
  const markdown = renderMarkdown(result);
  if (writeReport) fs.writeFileSync(reportPath, markdown);
  if (writeQueue) fs.writeFileSync(queuePath, renderQueueMarkdown(result, readExistingQueue(queuePath)));
  process.stdout.write(markdown);
}

function resolveDesignSystemDir(root) {
  const directInventory = path.join(root, "COMPONENT_INVENTORY.md");
  const nestedInventory = path.join(root, "design-system", "COMPONENT_INVENTORY.md");
  const directEvidenceMap = path.join(root, "DESIGN_EVIDENCE_MAP.md");
  const nestedEvidenceMap = path.join(root, "design-system", "DESIGN_EVIDENCE_MAP.md");

  if (fs.existsSync(directInventory) || fs.existsSync(directEvidenceMap)) return root;
  if (fs.existsSync(nestedInventory) || fs.existsSync(nestedEvidenceMap)) return path.join(root, "design-system");

  throw new Error(
    `Cannot find design-system package at ${root}. Expected COMPONENT_INVENTORY.md, DESIGN_EVIDENCE_MAP.md, or nested design-system/.`,
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

function parseComponentInventory(file) {
  const records = [];
  const lines = readLines(file);
  let tableHeaders = [];

  lines.forEach((line, index) => {
    if (/^##\s+Component Similarity Review\b/i.test(line.trim())) {
      tableHeaders = [];
      return;
    }

    const cells = splitMarkdownRow(line);
    if (!cells) return;
    if (cells.every((cellValue) => /^:?-{3,}:?$/.test(cellValue))) return;

    if (isInventoryHeaderRow(cells, tableHeaders)) {
      tableHeaders = cells.map(normalizeKey);
      return;
    }

    const nameIndex = findHeaderIndex(tableHeaders, ["component", "name", "item"]);
    if (nameIndex < 0 || !cells[nameIndex]) return;

    const name = normalizeName(cells[nameIndex]);
    if (!name || name === "-") return;

    records.push({
      category: getCell(cells, tableHeaders, ["category", "type", "group"]),
      file,
      lineNumber: index + 1,
      name,
      priority: getCell(cells, tableHeaders, ["priority", "rank", "importance"]),
      raw: cells.join(" | "),
      source: getCell(cells, tableHeaders, ["source", "spec", "evidence"]),
      status: getCell(cells, tableHeaders, ["status", "state"]),
    });
  });

  return records;
}

function parseSourceTrace(file) {
  const componentSources = new Map();
  const storyUrls = new Map();
  const lines = readLines(file);
  const componentSourceLines = sectionLines(lines, "Component Source Links");
  const storyUrlLines = sectionLines(lines, "Story Source URL Parameters");

  for (const { line } of componentSourceLines) {
    const cells = splitMarkdownRow(line);
    if (!cells || cells.length < 2 || /^component$/i.test(cells[0])) continue;
    componentSources.set(normalizeKey(cells[0]), cells[1]);
  }

  for (const { line } of storyUrlLines) {
    const cells = splitMarkdownRow(line);
    if (!cells || cells.length < 2 || /^component$/i.test(cells[0])) continue;
    storyUrls.set(normalizeKey(cells[0]), cells[1]);
  }

  return { componentSources, storyUrls };
}

function buildComponentRecords(inventoryRecords, files, sourceTrace) {
  const byKey = new Map();

  for (const record of inventoryRecords) {
    const key = normalizeKey(record.name);
    if (!key) continue;

    byKey.set(key, {
      category: record.category,
      dependencies: new Map(),
      dependents: new Set(),
      file: "",
      implementable: isImplementable(record.status, record.raw),
      inventoryLine: record.lineNumber,
      inventoryPath: record.file,
      key,
      name: record.name,
      priority: record.priority,
      rawInventory: record.raw,
      skipReason: isImplementable(record.status, record.raw) ? "" : "inventory status is not implementable",
      sourceRefs: sourceTrace.componentSources.get(key) || record.source || "",
      specText: "",
      status: record.status,
      storySourceUrl: sourceTrace.storyUrls.get(key) || "",
    });
  }

  for (const file of files) {
    const specText = fs.readFileSync(file, "utf8");
    const headingName = firstHeading(specText);
    const fileName = path.basename(file, path.extname(file));
    const name = normalizeName(headingName || fileName);
    const key = normalizeKey(name);
    if (!key) continue;

    const existing = byKey.get(key);
    const inferredCategory = inferCategory(name, specText, existing?.category || "");
    const implementable = existing?.implementable ?? true;

    byKey.set(key, {
      category: existing?.category || inferredCategory,
      dependencies: existing?.dependencies || new Map(),
      dependents: existing?.dependents || new Set(),
      file,
      implementable,
      inventoryLine: existing?.inventoryLine || 0,
      inventoryPath: existing?.inventoryPath || "",
      key,
      name: existing?.name || name,
      priority: existing?.priority || "",
      rawInventory: existing?.rawInventory || "",
      skipReason: implementable ? "" : (existing?.skipReason || "inventory status is not implementable"),
      sourceRefs: sourceTrace.componentSources.get(key) || existing?.sourceRefs || "",
      specText,
      status: existing?.status || "",
      storySourceUrl: sourceTrace.storyUrls.get(key) || existing?.storySourceUrl || "",
    });
  }

  return [...byKey.values()].map((component) => ({
    ...component,
    category: normalizeCategory(inferCategory(component.name, component.specText, component.category)),
  }));
}

function isImplementable(status, raw) {
  const text = `${status || ""} ${raw || ""}`;
  if (!text.trim()) return true;
  if (BLOCKED_STATUS_RE.test(text)) return false;
  if (IMPLEMENTABLE_STATUS_RE.test(text)) return true;
  return true;
}

function analyzeDependencies(components) {
  const implementableComponents = components.filter((component) => component.implementable);
  const byKey = new Map(implementableComponents.map((component) => [component.key, component]));
  const nameCandidates = implementableComponents
    .map((component) => ({
      component,
      aliases: componentAliases(component.name),
    }))
    .sort((a, b) => b.component.name.length - a.component.name.length);

  for (const component of implementableComponents) {
    const explicitText = dependencySections(component.specText);
    const wholeSpec = stripCodeBlocks(component.specText);
    const normalizedName = normalizeText(component.name);

    for (const { component: candidate, aliases } of nameCandidates) {
      if (candidate.key === component.key) continue;

      const reasons = [];
      if (containsAnyAlias(explicitText, aliases)) reasons.push("explicit dependency/composition section");
      if (componentNameSuggestsDependency(component.name, candidate.name)) reasons.push("component name composition");
      if (containsAnyAliasInDependencyPhrase(wholeSpec, aliases)) reasons.push("dependency phrase in component spec");

      if (reasons.length === 0) continue;
      if (isLikelyFalsePositive(normalizedName, candidate.name, reasons)) continue;

      component.dependencies.set(candidate.key, {
        name: candidate.name,
        reason: [...new Set(reasons)].join("; "),
      });
      byKey.get(candidate.key)?.dependents.add(component.key);
    }
  }

  const cycles = detectCycles(implementableComponents);
  return { cycles };
}

function orderComponents(components) {
  const implementable = components.filter((component) => component.implementable);
  const remaining = new Map(implementable.map((component) => [component.key, component]));
  const ordered = [];

  while (remaining.size > 0) {
    const ready = [...remaining.values()]
      .filter((component) => {
        return [...component.dependencies.keys()].every((dependencyKey) => !remaining.has(dependencyKey));
      })
      .sort(compareComponents);

    const next = ready[0] || [...remaining.values()].sort(compareComponents)[0];
    next.cycleBreak = ready.length === 0;
    ordered.push(next);
    remaining.delete(next.key);
  }

  return ordered;
}

function buildBatches(orderedComponents, size) {
  const batches = [];
  let current = [];

  for (const component of orderedComponents) {
    if (current.length >= size) {
      batches.push(createBatch(batches.length + 1, current));
      current = [];
    }
    current.push(component);
  }

  if (current.length > 0) batches.push(createBatch(batches.length + 1, current));
  return batches;
}

function createBatch(index, components) {
  const id = `B${String(index).padStart(2, "0")}`;
  const categories = [...new Set(components.map((component) => component.category))];
  const componentNames = components.map((component) => component.name);
  const sharedDependencies = [...new Set(components.flatMap((component) => dependencyNames(component)))]
    .filter((name) => !componentNames.includes(name));

  return {
    components: componentNames,
    id,
    rationale: buildBatchRationale(components),
    sharedDependencies,
    tiers: categories,
  };
}

function buildBatchRationale(components) {
  const firstTier = components[0]?.category || "unknown";
  const hasCore = components.some((component) => categoryTier(component.category) <= 2);
  const compositeTier = categoryTier("composite");
  const hasComposite = components.some((component) => categoryTier(component.category) >= compositeTier);

  if (hasCore && !hasComposite) return `Establish ${firstTier} components before composed patterns.`;
  if (hasComposite) return "Build composed patterns after their lower-level dependencies are available.";
  return `Continue dependency-ordered ${firstTier} implementation.`;
}

function compareComponents(a, b) {
  return (
    categoryTier(a.category) - categoryTier(b.category)
    || a.dependencies.size - b.dependencies.size
    || b.dependents.size - a.dependents.size
    || priorityRank(a.priority) - priorityRank(b.priority)
    || a.name.localeCompare(b.name)
  );
}

function detectCycles(components) {
  const cycles = [];
  const visited = new Set();
  const visiting = new Set();
  const stack = [];
  const byKey = new Map(components.map((component) => [component.key, component]));

  function visit(component) {
    if (visiting.has(component.key)) {
      const startIndex = stack.findIndex((key) => key === component.key);
      const cycleKeys = stack.slice(startIndex).concat(component.key);
      const cycleNames = cycleKeys.map((key) => byKey.get(key)?.name || key);
      const signature = cycleNames.join(" -> ");
      if (!cycles.some((cycle) => cycle.signature === signature)) {
        cycles.push({ components: cycleNames, signature });
      }
      return;
    }
    if (visited.has(component.key)) return;

    visiting.add(component.key);
    stack.push(component.key);
    for (const dependencyKey of component.dependencies.keys()) {
      const dependency = byKey.get(dependencyKey);
      if (dependency) visit(dependency);
    }
    stack.pop();
    visiting.delete(component.key);
    visited.add(component.key);
  }

  for (const component of components) visit(component);
  return cycles;
}

function serializeComponent(component, order, batches) {
  const batch = batches.find((candidate) => candidate.components.includes(component.name));
  const targets = implementationTargets(component);
  return {
    batch: batch?.id || "",
    buildReason: buildReason(component),
    category: component.category,
    component: component.name,
    dependencies: dependencyNames(component),
    dependents: dependentNames(component, components),
    file: component.file ? relative(component.file) : "-",
    order,
    sourceRefs: component.sourceRefs || "-",
    storySourceUrl: component.storySourceUrl || "-",
    storyTarget: targets.story,
    productTarget: targets.product,
  };
}

function renderMarkdown(data) {
  const lines = [];
  lines.push("# Storybook Component Build Plan");
  lines.push("");
  lines.push(`- Design-system root: \`${data.designSystemDir}\``);
  lines.push(`- Package root: \`${data.packageRoot}\``);
  lines.push(`- Source trace: \`${data.sourceTracePath || "not found"}\``);
  lines.push(`- Components ordered: ${data.totals.components}`);
  lines.push(`- Batches: ${data.totals.batches}`);
  lines.push(`- Skipped components: ${data.totals.skipped}`);
  lines.push(`- Dependency cycles: ${data.totals.cycles}`);
  lines.push("");
  lines.push("## Recommended Build Order");
  lines.push("");
  lines.push("| Order | Batch | Component | Category | Depends on | Used by | Story source URL | Build reason |");
  lines.push("|---|---|---|---|---|---|---|---|");

  if (data.components.length === 0) {
    lines.push("| - | - | - | - | - | - | - | - |");
  } else {
    for (const component of data.components) {
      lines.push([
        cell(component.order),
        cell(component.batch),
        cell(component.component),
        cell(component.category),
        cell(component.dependencies.join(", ") || "-"),
        cell(component.dependents.join(", ") || "-"),
        cell(component.storySourceUrl),
        cell(component.buildReason),
      ].join("|").replace(/^/, "|").replace(/$/, "|"));
    }
  }

  lines.push("");
  lines.push("## Batch Plan");
  lines.push("");
  lines.push("| Batch | Components | Shared dependencies | Tiers | Rationale | Exit criteria |");
  lines.push("|---|---|---|---|---|---|");

  if (data.batches.length === 0) {
    lines.push("| - | - | - | - | - | - |");
  } else {
    for (const batch of data.batches) {
      lines.push([
        cell(batch.id),
        cell(batch.components.join(", ")),
        cell(batch.sharedDependencies.join(", ") || "-"),
        cell(batch.tiers.join(", ")),
        cell(batch.rationale),
        cell("component/page folder, co-located story, source URL parameters, queue status, and verification log updated"),
      ].join("|").replace(/^/, "|").replace(/$/, "|"));
    }
  }

  lines.push("");
  lines.push("## Dependency Details");
  lines.push("");
  lines.push("| Component | Depends on | Dependency reason | Source refs | Spec file |");
  lines.push("|---|---|---|---|---|");

  if (data.components.length === 0) {
    lines.push("| - | - | - | - | - |");
  } else {
    for (const component of orderedComponents) {
      lines.push([
        cell(component.name),
        cell(dependencyNames(component).join(", ") || "-"),
        cell([...component.dependencies.values()].map((dependency) => `${dependency.name}: ${dependency.reason}`).join("; ") || "-"),
        cell(component.sourceRefs || "-"),
        cell(component.file ? relative(component.file) : "-"),
      ].join("|").replace(/^/, "|").replace(/$/, "|"));
    }
  }

  lines.push("");
  lines.push("## Dependency Cycles");
  lines.push("");
  if (data.cycles.length === 0) {
    lines.push("- None detected.");
  } else {
    for (const cycle of data.cycles) {
      lines.push(`- ${cycle.signature}`);
    }
  }

  lines.push("");
  lines.push("## Skipped Components");
  lines.push("");
  if (data.skipped.length === 0) {
    lines.push("- None.");
  } else {
    for (const skipped of data.skipped) {
      lines.push(`- ${skipped.component}: ${skipped.reason} (${skipped.status})`);
    }
  }

  lines.push("");
  lines.push("## Usage Notes");
  lines.push("");
  lines.push("- Implement components in the recommended order unless product discovery proves an existing component can be reused first.");
  lines.push("- Do not build a composed component before its listed dependencies are implemented, reused, or explicitly marked blocked with a reason.");
  lines.push("- Implement typographic/text-lockup components as editable, token-backed display components; do not flatten them into generic heading/subheading styles.");
  lines.push("- After each component, update the queue/implementation map before starting the next component.");
  lines.push("- Put new component stories beside their component files; reserve root `stories/` or `src/stories/` for foundation guides/docs.");
  lines.push("- Put requested page/screen implementations in dedicated page folders with co-located page stories.");
  lines.push("- If a dependency is inferred incorrectly, record the correction in the implementation map and update the queue ordering.");
  lines.push("");

  return `${lines.join("\n")}\n`;
}

function readExistingQueue(file) {
  if (!fs.existsSync(file)) {
    return {
      componentRows: new Map(),
      currentCheckpoint: "",
      dependencyRows: new Map(),
      decisions: "",
      figmaExportAddon: "",
      verificationLog: "",
    };
  }

  const markdown = fs.readFileSync(file, "utf8");
  const lines = markdown.split(/\r?\n/);
  return {
    componentRows: parseTableByComponent(sectionLines(lines, "Component Queue"), "component"),
    currentCheckpoint: sectionMarkdown(lines, "Current Component Checkpoint"),
    dependencyRows: parseTableByComponent(sectionLines(lines, "Dependency Plan"), "component"),
    decisions: sectionMarkdown(lines, "Decisions"),
    figmaExportAddon: sectionMarkdown(lines, "Figma Export Addon"),
    verificationLog: sectionMarkdown(lines, "Verification Log"),
  };
}

function parseTableByComponent(section, componentHeaderName) {
  const rows = new Map();
  let headers = [];

  for (const { line } of section) {
    const cells = splitMarkdownRow(line);
    if (!cells) continue;
    if (cells.every((cellValue) => /^:?-{3,}:?$/.test(cellValue))) continue;
    if (headers.length === 0) {
      headers = cells.map(normalizeKey);
      continue;
    }

    const componentIndex = headers.indexOf(componentHeaderName);
    if (componentIndex < 0) continue;
    const component = cells[componentIndex];
    if (!component || component === "-") continue;

    const record = {};
    headers.forEach((header, index) => {
      record[header] = cells[index] || "";
    });
    rows.set(normalizeKey(component), record);
  }

  return rows;
}

function sectionMarkdown(lines, heading) {
  const section = sectionLines(lines, heading).map(({ line }) => line);
  return trimBlankLines(section).join("\n");
}

function renderQueueMarkdown(data, existing) {
  const lines = [];
  lines.push("# Storybook Component Queue");
  lines.push("");
  lines.push("## Context");
  lines.push("");
  lines.push(`- Design-system package: ${data.designSystemDir}`);
  lines.push("- Product repo:");
  lines.push("- Framework:");
  lines.push("- Storybook/catalog:");
  lines.push(`- Source trace: ${data.sourceTracePath || ""}`);
  lines.push(`- Component build plan: ${data.reportPath}`);
  lines.push("- Figma export addon:");
  lines.push("- Package manager:");
  lines.push("- Token import strategy:");
  lines.push("- Target layout: components in `src/components/<ComponentName>/`, pages in `src/pages/<PageName>/`, foundation docs in `stories/` or `src/stories/`");
  lines.push("- Typographic components: implement text lockups as editable shared components in `src/components/<ComponentName>/` unless the extraction explicitly requires raster artwork");
  lines.push(data.batches[0] ? `- Current batch: ${data.batches[0].id}` : "- Current batch:");
  lines.push("");
  lines.push("## Status Values");
  lines.push("");
  lines.push("- `queued`: ready for a future batch");
  lines.push("- `in-progress`: selected for the current batch");
  lines.push("- `done`: implemented, documented, and verified");
  lines.push("- `reused`: existing product component accepted as the implementation");
  lines.push("- `blocked`: cannot continue without a decision or missing source");
  lines.push("- `deferred`: intentionally postponed");
  lines.push("- `needs-extraction`: missing design-system evidence or component spec");
  lines.push("- `needs-source`: extractor source evidence exists but the Figma node, image, route, or frontend folder cannot be resolved");
  lines.push("- `needs-token`: missing token at the required layer");
  lines.push("- `needs-api-decision`: shared component API needs a product decision");
  lines.push("- `needs-existing-component-review`: similar product component needs review first");
  lines.push("- `needs-addon-compatibility`: Storybook, React, or addon setup requirement is missing");
  lines.push("- `out-of-scope`: not part of this Storybook rollout");
  lines.push("");
  lines.push("## Source Trace");
  lines.push("");
  lines.push("| Source ID / location | Type | Resolved file / Figma node / route | Story source URL | Components | Status | Notes |");
  lines.push("|---|---|---|---|---|---|---|");
  if (data.components.length === 0) {
    lines.push("|  |  |  |  |  |  |  |");
  } else {
    for (const component of data.components) {
      lines.push([
        cell(component.sourceRefs),
        cell("-"),
        cell(component.file),
        cell(component.storySourceUrl),
        cell(component.component),
        cell(component.sourceRefs === "-" ? "needs-source" : "resolved"),
        cell("synced from component plan"),
      ].join("|").replace(/^/, "|").replace(/$/, "|"));
    }
  }
  lines.push("");
  lines.push("## Current Component Checkpoint");
  lines.push("");
  lines.push(existing.currentCheckpoint || "| Field | Value |\n|---|---|\n| Active component |  |\n| Queue order / batch |  |\n| Dependency status |  |\n| Source inspected |  |\n| Existing component review |  |\n| Token decision |  |\n| Product files |  |\n| Story files |  |\n| Target layout |  |\n| Verification |  |\n| Blocker / next action |  |");
  lines.push("");
  lines.push("## Dependency Plan");
  lines.push("");
  lines.push("| Order | Component | Category | Depends on | Used by | Core reason | Status | Notes |");
  lines.push("|---|---|---|---|---|---|---|---|");
  if (data.components.length === 0) {
    lines.push("| 1 |  |  |  |  |  | queued |  |");
  } else {
    for (const component of data.components) {
      const previous = existing.dependencyRows.get(normalizeKey(component.component)) || {};
      const queuePrevious = existing.componentRows.get(normalizeKey(component.component)) || {};
      const status = preferredStatus(queuePrevious.status, previous.status);
      lines.push([
        cell(component.order),
        cell(component.component),
        cell(component.category),
        cell(component.dependencies.join(", ") || "-"),
        cell(component.dependents.join(", ") || "-"),
        cell(component.buildReason),
        cell(status),
        cell(previous.notes || ""),
      ].join("|").replace(/^/, "|").replace(/$/, "|"));
    }
  }
  lines.push("");
  lines.push("## Component Queue");
  lines.push("");
  lines.push("| Batch | Order | Component | Category | Source spec | Design sources | Story source URL | Depends on | Used by | Product target | Story target | Decision | Status |");
  lines.push("|---|---|---|---|---|---|---|---|---|---|---|---|---|");
  if (data.components.length === 0) {
    lines.push("| `B01` | 1 |  |  |  |  |  |  |  |  |  |  | queued |");
  } else {
    for (const component of data.components) {
      const previous = existing.componentRows.get(normalizeKey(component.component)) || {};
      lines.push([
        cell(component.batch),
        cell(component.order),
        cell(component.component),
        cell(component.category),
        cell(component.file),
        cell(component.sourceRefs),
        cell(component.storySourceUrl),
        cell(component.dependencies.join(", ") || "-"),
        cell(component.dependents.join(", ") || "-"),
        cell(previous["product-target"] || previous.product || component.productTarget),
        cell(previous["story-target"] || previous.story || component.storyTarget),
        cell(previous.decision || ""),
        cell(previous.status || "queued"),
      ].join("|").replace(/^/, "|").replace(/$/, "|"));
    }
  }
  lines.push("");
  lines.push("## Batch Plan");
  lines.push("");
  lines.push("| Batch | Components | Shared dependencies | Design sources | Dependency exit criteria | Validation | Status |");
  lines.push("|---|---|---|---|---|---|---|");
  if (data.batches.length === 0) {
    lines.push("| `B01` |  |  |  | all listed dependencies are done, reused, or accepted blocked decisions |  | queued |");
  } else {
    for (const batch of data.batches) {
      const designSources = data.components
        .filter((component) => component.batch === batch.id)
        .map((component) => component.sourceRefs)
        .filter((sourceRefs) => sourceRefs && sourceRefs !== "-");
      lines.push([
        cell(batch.id),
        cell(batch.components.join(", ")),
        cell(batch.sharedDependencies.join(", ") || "-"),
        cell([...new Set(designSources)].join("; ") || "-"),
        cell("all listed dependencies are done, reused, or accepted blocked decisions"),
        cell("co-located stories, source URLs, verification log"),
        cell(batchStatus(batch, existing.componentRows)),
      ].join("|").replace(/^/, "|").replace(/$/, "|"));
    }
  }
  lines.push("");
  lines.push("## Decisions");
  lines.push("");
  lines.push(existing.decisions || "| Date | Item | Decision | Reason | Follow-up |\n|---|---|---|---|---|\n|  |  |  |  |  |");
  lines.push("");
  lines.push("## Figma Export Addon");
  lines.push("");
  lines.push(existing.figmaExportAddon || "| Requirement | Detected value | Status | Notes |\n|---|---|---|---|\n| Storybook `^10` |  |  |  |\n| React |  |  |  |\n| Bundled addon asset | `assets/figma-export-addon/` |  |  |\n| Product vendor path | `.storybook/vendor/figma-export-addon/` |  |  |\n| Project config | `.storybook/figma-export.config.ts` |  |  |\n| `@storybook/icons` |  |  |  |\n| Addon package |  |  |  |\n| `.storybook/main.*` registration |  |  |  |\n| `.storybook/preview.*` decorator/globals |  |  |  |\n| Review helper / status API |  |  |  |\n| Token prefix/options |  |  |  |");
  lines.push("");
  lines.push("## Verification Log");
  lines.push("");
  lines.push(existing.verificationLog || "| Batch | Command or check | Result | Notes |\n|---|---|---|---|\n|  |  |  |  |");
  lines.push("");

  return `${lines.join("\n")}\n`;
}

function batchStatus(batch, componentRows) {
  const statuses = batch.components.map((component) => {
    return componentRows.get(normalizeKey(component))?.status || "queued";
  });
  if (statuses.every((status) => status === "done" || status === "reused")) return "done";
  if (statuses.some((status) => status === "in-progress")) return "in-progress";
  if (statuses.some((status) => /^blocked|needs-/.test(status))) return "blocked";
  return "queued";
}

function preferredStatus(primary, fallback) {
  if (primary && primary !== "-") return primary;
  if (fallback && fallback !== "-") return fallback;
  return "queued";
}

function trimBlankLines(lines) {
  const copy = [...lines];
  while (copy.length > 0 && copy[0].trim() === "") copy.shift();
  while (copy.length > 0 && copy[copy.length - 1].trim() === "") copy.pop();
  return copy;
}

function dependencySections(markdown) {
  const lines = stripCodeBlocks(markdown).split(/\r?\n/);
  const selected = [];
  let keep = false;

  for (const line of lines) {
    if (/^#{1,4}\s+/.test(line.trim())) {
      keep = /\b(depend|composition|composed|anatomy|structure|slots?|parts?|children|uses|built from)\b/i.test(line);
    }
    if (keep) selected.push(line);
  }

  return selected.join("\n");
}

function containsAnyAlias(text, aliases) {
  const normalizedText = normalizeText(text);
  return aliases.some((alias) => {
    if (alias.length < 3) return false;
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(alias)}([^a-z0-9]|$)`, "i").test(normalizedText);
  });
}

function containsAnyAliasInDependencyPhrase(text, aliases) {
  const normalizedText = normalizeText(text);
  return aliases.some((alias) => {
    if (alias.length < 3) return false;
    const escapedAlias = escapeRegExp(alias);
    const beforeAlias = new RegExp(
      `\\b(uses?|contains?|renders?|wraps?|composes?|extends?|includes?|depends on|built from)\\b.{0,120}\\b${escapedAlias}\\b`,
      "i",
    );
    const afterAlias = new RegExp(
      `\\b${escapedAlias}\\b.{0,120}\\b(slot|child|children|part|dependency|inside|within|wrapper)\\b`,
      "i",
    );
    return beforeAlias.test(normalizedText) || afterAlias.test(normalizedText);
  });
}

function componentNameSuggestsDependency(name, candidateName) {
  const key = normalizeKey(name);
  const candidateKey = normalizeKey(candidateName);
  if (!candidateKey || candidateKey.length < 4) return false;
  if (key === candidateKey) return false;
  return key.endsWith(candidateKey) || key.startsWith(candidateKey) || key.includes(candidateKey);
}

function isLikelyFalsePositive(normalizedName, candidateName, reasons) {
  const candidate = normalizeText(candidateName);
  if (reasons.some((reason) => reason !== "mentioned in component spec")) return false;
  if (candidate.length >= 7) return false;
  return normalizedName.includes(candidate);
}

function componentAliases(name) {
  const normalized = normalizeText(name);
  const kebab = normalizeKey(name).replace(/-/g, " ");
  const splitCamel = normalizeText(name.replace(/([a-z0-9])([A-Z])/g, "$1 $2"));
  return [...new Set([normalized, kebab, splitCamel].filter(Boolean))];
}

function inferCategory(name, specText, declaredCategory) {
  const declared = normalizeCategory(declaredCategory);
  if (declared !== "unknown") return declared;

  const nameText = normalizeText(name);
  const specCategoryText = dependencySections(specText).toLowerCase();
  const nameCategory = inferCategoryFromText(nameText);
  if (nameCategory !== "unknown") return nameCategory;

  const specCategory = inferCategoryFromText(specCategoryText);
  if (specCategory !== "unknown") return specCategory;

  return "unknown";
}

function inferCategoryFromText(text) {
  if (/\b(text[- ]?lockup|type[- ]?lockup|lockup|typographic|heading stack|title stack|title lockup|hero title|editorial heading|quote lockup|label\s*\/\s*value|label value|kicker|eyebrow|headline|subhead)\b/.test(text)) return "typographic";
  if (/\b(token|color|typography|spacing|radius|elevation|motion|foundation)\b/.test(text)) return "foundation";
  if (/\b(icon|button|text|label|caption|avatar|divider|spinner|skeleton)\b/.test(text)) return "primitive";
  if (/\b(input|field|form|checkbox|radio|switch|select|textarea|slider|stepper|segmented|search)\b/.test(text)) return "form-control";
  if (/\b(stack|grid|layout|container|spacer|section|row|column|split)\b/.test(text)) return "layout";
  if (/\b(nav|navigation|tabs|tab bar|breadcrumb|pagination|sidebar)\b/.test(text)) return "navigation";
  if (/\b(table|list|cell|row|card|badge|tag|chip|stat|metric|chart)\b/.test(text)) return "data-display";
  if (/\b(alert|toast|banner|empty|error|success|warning|progress)\b/.test(text)) return "feedback";
  if (/\b(modal|dialog|drawer|sheet|popover|tooltip|menu|dropdown)\b/.test(text)) return "overlay";
  if (/\b(composite|pattern|page|screen|workflow|panel|header|footer|summary)\b/.test(text)) return "composite";
  return "unknown";
}

function normalizeCategory(value) {
  const raw = normalizeKey(String(value || ""));
  if (!raw) return "unknown";
  if (/typographic|text-lockup|type-lockup|lockup|heading-stack|title-lockup/.test(raw)) return "typographic";
  if (/foundation|token/.test(raw)) return "foundation";
  if (/primitive|base|core/.test(raw)) return "primitive";
  if (/form|control|input/.test(raw)) return "form-control";
  if (/layout|container/.test(raw)) return "layout";
  if (/nav|tab|breadcrumb|pagination/.test(raw)) return "navigation";
  if (/data|display|table|list|card|cell/.test(raw)) return "data-display";
  if (/feedback|alert|toast|status/.test(raw)) return "feedback";
  if (/overlay|modal|dialog|drawer|popover|tooltip|menu/.test(raw)) return "overlay";
  if (/composite|pattern|product|screen|page/.test(raw)) return raw.includes("product") ? "product-pattern" : "composite";
  return "unknown";
}

function categoryTier(category) {
  return CATEGORY_TIER_MAP.get(category) ?? CATEGORY_TIER_MAP.get("unknown");
}

function priorityRank(value) {
  const text = String(value || "").toLowerCase();
  if (/p0|critical|highest|high|must/.test(text)) return 0;
  if (/p1|medium|should/.test(text)) return 1;
  if (/p2|low|could/.test(text)) return 2;
  return 3;
}

function dependencyNames(component) {
  return [...component.dependencies.values()].map((dependency) => dependency.name).sort();
}

function dependentNames(component, componentList) {
  const byKey = new Map(componentList.map((candidate) => [candidate.key, candidate]));
  return [...component.dependents].map((key) => byKey.get(key)?.name || key).sort();
}

function implementationTargets(component) {
  const fileName = implementationFileName(component.name);
  const root = isPageTarget(component) ? "src/pages" : "src/components";
  return {
    product: `${root}/${fileName}/${fileName}.tsx`,
    story: `${root}/${fileName}/${fileName}.stories.tsx`,
  };
}

function implementationFileName(value) {
  const words = stripFormatting(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return words.map((word) => `${word[0].toUpperCase()}${word.slice(1)}`).join("") || "Component";
}

function isPageTarget(component) {
  const text = normalizeText(`${component.name} ${component.category}`);
  return component.category === "product-pattern" || /\b(page|screen|view|route)\b/.test(text);
}

function buildReason(component) {
  const dependentCount = component.dependents.size;
  const dependencyCount = component.dependencies.size;
  const reason = [];
  if (categoryTier(component.category) <= 2) reason.push("core dependency tier");
  if (dependentCount > 0) reason.push(`used by ${dependentCount} component${dependentCount === 1 ? "" : "s"}`);
  if (dependencyCount > 0) reason.push(`after ${dependencyCount} dependenc${dependencyCount === 1 ? "y" : "ies"}`);
  if (component.cycleBreak) reason.push("cycle fallback");
  return reason.join("; ") || "no dependencies detected";
}

function stripCodeBlocks(markdown) {
  return String(markdown || "").replace(/```[\s\S]*?```/g, " ");
}

function firstHeading(markdown) {
  const match = String(markdown || "").match(/^#\s+(.+)$/m);
  return match ? stripFormatting(match[1]) : "";
}

function splitMarkdownRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return null;
  return trimmed.slice(1, -1).split("|").map(stripFormatting);
}

function isInventoryHeaderRow(cells, currentHeaders) {
  if (currentHeaders.length > 0) return false;
  const normalizedCells = cells.map(normalizeKey);
  return normalizedCells.some((cellValue) => ["component", "component-name", "name", "item"].includes(cellValue));
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

function findHeaderIndex(headers, candidates) {
  return headers.findIndex((header) => candidates.some((candidate) => header.includes(candidate)));
}

function getCell(cells, headers, candidates) {
  const index = findHeaderIndex(headers, candidates);
  return index >= 0 ? cells[index] || "" : "";
}

function readLines(file) {
  return fs.readFileSync(file, "utf8").split(/\r?\n/);
}

function stripFormatting(value) {
  return String(value || "")
    .trim()
    .replace(/^`|`$/g, "")
    .replace(/^<|>$/g, "")
    .replace(/\*\*/g, "");
}

function normalizeName(value) {
  return stripFormatting(value).replace(/^#+\s+/, "").trim();
}

function normalizeKey(value) {
  return normalizeName(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeText(value) {
  return String(value || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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
