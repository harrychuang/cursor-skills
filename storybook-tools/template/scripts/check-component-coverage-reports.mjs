import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

// Contract source of truth: src/storybook/component-coverage/coverageTypes.ts
// (this script mirrors it for Node without a TS build step).
const reportsDir =
  process.env.COMPONENT_COVERAGE_REPORTS_DIR ??
  "outputs/component-coverage/reports";
const catalogPath = "src/storybook/componentCatalog.ts";
const matchFits = new Set(["exact", "variant-needed", "partial"]);
const gapStatuses = new Set(["none", "extend", "missing"]);
const provenances = new Set(["extracted", "implementation-derived"]);
const gapSuggestionFields = [
  "suggestedName",
  "suggestedCategory",
  "suggestedRole",
  "rationale",
];
const reviewStatuses = new Set(["draft", "confirmed"]);
const reviewDecisionsBySection = {
  missing: new Set(["build-new", "use-existing", "skip"]),
  extend: new Set(["extend", "no-extend", "use-existing", "skip"]),
  reusable: new Set(["approve", "use-existing", "skip"]),
};
const compositionViewports = new Set(["mobile", "desktop"]);
const compositionLayouts = new Set(["stack", "row", "grid"]);
const compositionColumns = new Set([2, 3, 4]);
const compositionSpans = new Set([1, 2, 3, 4]);
const compositionMaxDepth = 6;
const compositionMaxNodes = 100;

if (!existsSync(catalogPath)) {
  console.error(`Component coverage report check failed: missing ${catalogPath}.`);
  process.exit(1);
}

// Every catalog entry carries an explicit storyTitle (parsing contract in the
// catalog header: id first, single-line string fields).
const catalogSource = readFileSync(catalogPath, "utf8");
const entryPattern =
  /\{\s*\n\s+id: "([^"]+)",[\s\S]*?\n\s+storyTitle: "([^"]+)"/g;
const storyTitleById = new Map();

for (const match of catalogSource.matchAll(entryPattern)) {
  const [, id, storyTitle] = match;
  storyTitleById.set(id, storyTitle);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateComposition(composition, blocks, addIssue) {
  const nodeIds = new Set();
  const referencedBlockIds = new Set();
  const blockById = new Map(blocks.map((block) => [block.id, block]));
  let nodeCount = 0;

  const compositionIssue = (path, message) => {
    addIssue(`${path}: ${message}.`);
  };

  const validateAllowedKeys = (record, allowedKeys, path) => {
    const allowed = new Set(allowedKeys);

    for (const key of Object.keys(record)) {
      if (!allowed.has(key)) {
        compositionIssue(
          `${path}.${key}`,
          "field is not allowed in a composition",
        );
      }
    }
  };

  const validateNonEmptyString = (value, path) => {
    if (!isNonEmptyString(value)) {
      compositionIssue(path, "must be a non-empty string");
      return false;
    }

    return true;
  };

  const validateNode = (node, path, depth, parent) => {
    nodeCount += 1;

    if (nodeCount > compositionMaxNodes) {
      if (nodeCount === compositionMaxNodes + 1) {
        compositionIssue(
          path,
          `composition exceeds ${compositionMaxNodes} nodes`,
        );
      }
      return;
    }

    if (depth > compositionMaxDepth) {
      compositionIssue(
        path,
        `composition exceeds maximum depth ${compositionMaxDepth}`,
      );
      return;
    }

    if (!isRecord(node)) {
      compositionIssue(path, "must be a group or block object");
      return;
    }

    if (node.kind !== "group" && node.kind !== "block") {
      compositionIssue(`${path}.kind`, 'must be either "group" or "block"');
      return;
    }

    if (validateNonEmptyString(node.id, `${path}.id`)) {
      if (nodeIds.has(node.id)) {
        compositionIssue(`${path}.id`, `duplicate node id "${node.id}"`);
      } else {
        nodeIds.add(node.id);
      }
    }

    if (node.kind === "group") {
      validateAllowedKeys(
        node,
        ["kind", "id", "label", "layout", "columns", "children"],
        path,
      );

      if (node.label !== undefined) {
        validateNonEmptyString(node.label, `${path}.label`);
      }

      const layout = compositionLayouts.has(node.layout)
        ? node.layout
        : undefined;

      if (!layout) {
        compositionIssue(
          `${path}.layout`,
          'must be one of "stack", "row", or "grid"',
        );
      }

      let columns;

      if (layout === "grid") {
        if (!compositionColumns.has(node.columns)) {
          compositionIssue(`${path}.columns`, "grid columns must be 2, 3, or 4");
        } else {
          columns = node.columns;
        }
      } else if (layout && node.columns !== undefined) {
        compositionIssue(
          `${path}.columns`,
          "columns is only allowed when layout is grid",
        );
      }

      if (!Array.isArray(node.children) || node.children.length === 0) {
        compositionIssue(`${path}.children`, "must contain at least one node");
        return;
      }

      const childParent = layout ? { layout, columns } : undefined;
      node.children.forEach((child, index) => {
        validateNode(child, `${path}.children[${index}]`, depth + 1, childParent);
      });
      return;
    }

    validateAllowedKeys(
      node,
      ["kind", "id", "blockId", "matchComponentId", "span"],
      path,
    );

    let reportBlock;

    if (validateNonEmptyString(node.blockId, `${path}.blockId`)) {
      if (referencedBlockIds.has(node.blockId)) {
        compositionIssue(
          `${path}.blockId`,
          `report block "${node.blockId}" is referenced more than once`,
        );
      } else {
        referencedBlockIds.add(node.blockId);
      }

      reportBlock = blockById.get(node.blockId);
      if (!reportBlock) {
        compositionIssue(
          `${path}.blockId`,
          `does not reference a report block: "${node.blockId}"`,
        );
      }
    }

    if (reportBlock) {
      if (reportBlock.matches.length === 0) {
        if (node.matchComponentId !== undefined) {
          compositionIssue(
            `${path}.matchComponentId`,
            "must be omitted when the report block has no matches",
          );
        }
      } else if (
        validateNonEmptyString(
          node.matchComponentId,
          `${path}.matchComponentId`,
        ) &&
        !reportBlock.matches.some(
          (match) => match.componentId === node.matchComponentId,
        )
      ) {
        compositionIssue(
          `${path}.matchComponentId`,
          `does not match a candidate on report block "${reportBlock.id}"`,
        );
      }
    } else if (
      node.matchComponentId !== undefined &&
      typeof node.matchComponentId !== "string"
    ) {
      compositionIssue(`${path}.matchComponentId`, "must be a string when present");
    }

    if (parent?.layout === "grid") {
      if (
        node.span !== undefined &&
        (!compositionSpans.has(node.span) ||
          !parent.columns ||
          node.span > parent.columns)
      ) {
        compositionIssue(
          `${path}.span`,
          `must be an integer from 1 to ${parent.columns ?? "the grid columns"}`,
        );
      }
    } else if (node.span !== undefined) {
      compositionIssue(
        `${path}.span`,
        "span is only allowed on a direct block child of a grid",
      );
    }
  };

  if (!isRecord(composition)) {
    compositionIssue("composition", "must be an object");
    return;
  }

  validateAllowedKeys(
    composition,
    ["version", "label", "viewport", "root"],
    "composition",
  );

  if (composition.version !== 1) {
    compositionIssue("composition.version", "must equal 1");
  }

  validateNonEmptyString(composition.label, "composition.label");

  if (!compositionViewports.has(composition.viewport)) {
    compositionIssue(
      "composition.viewport",
      'must be either "mobile" or "desktop"',
    );
  }

  if (!isRecord(composition.root) || composition.root.kind !== "group") {
    compositionIssue("composition.root", "must be a group node");
  }

  validateNode(composition.root, "composition.root", 1);

  for (const block of blocks) {
    if (!referencedBlockIds.has(block.id)) {
      compositionIssue(
        "composition.root",
        `report block "${block.id}" must be referenced exactly once`,
      );
    }
  }
}

function classifyBlock(block) {
  if (block.gap.status === "missing") {
    return "missing";
  }

  if (block.gap.status === "extend") {
    return "extend";
  }

  return block.matches.some((blockMatch) => blockMatch.fit === "exact")
    ? "reusable"
    : "extend";
}

function validateReport(report, addIssue) {
  for (const field of ["id", "requestId", "createdAt", "sourceSummary"]) {
    if (!isNonEmptyString(report[field])) {
      addIssue(`missing or empty top-level field "${field}".`);
    }
  }

  if (
    typeof report.analyzer !== "object" ||
    report.analyzer === null ||
    !isNonEmptyString(report.analyzer.engine) ||
    typeof report.analyzer.catalogEntryCount !== "number"
  ) {
    addIssue('invalid "analyzer": expected { engine, catalogEntryCount }.');
  }

  if (!Array.isArray(report.blocks)) {
    addIssue('missing "blocks" array.');
    return;
  }

  report.blocks.forEach((block, blockIndex) => {
    const blockRef = `blocks[${blockIndex}]`;

    for (const field of ["id", "label", "evidence"]) {
      if (!isNonEmptyString(block[field])) {
        addIssue(`${blockRef}: missing or empty field "${field}".`);
      }
    }

    if (!Array.isArray(block.matches)) {
      addIssue(`${blockRef}: missing "matches" array.`);
    } else {
      block.matches.forEach((blockMatch, matchIndex) => {
        const matchRef = `${blockRef}.matches[${matchIndex}]`;

        for (const field of ["componentId", "storyTitle", "reason", "componentPath"]) {
          if (!isNonEmptyString(blockMatch[field])) {
            addIssue(`${matchRef}: missing or empty field "${field}".`);
          }
        }

        if (!matchFits.has(blockMatch.fit)) {
          addIssue(`${matchRef}: invalid fit value "${blockMatch.fit}".`);
        }

        if (!provenances.has(blockMatch.provenance)) {
          addIssue(`${matchRef}: invalid provenance value "${blockMatch.provenance}".`);
        }

        if (!isNonEmptyString(blockMatch.componentId)) {
          return;
        }

        const expectedTitle = storyTitleById.get(blockMatch.componentId);

        if (!expectedTitle) {
          addIssue(`${matchRef}: unknown componentId "${blockMatch.componentId}" (not in ${catalogPath}).`);
        } else if (blockMatch.storyTitle !== expectedTitle) {
          addIssue(
            `${matchRef}: storyTitle is "${blockMatch.storyTitle}"; expected "${expectedTitle}".`,
          );
        }
      });
    }

    if (typeof block.gap !== "object" || block.gap === null) {
      addIssue(`${blockRef}: missing "gap" object.`);
    } else if (!gapStatuses.has(block.gap.status)) {
      addIssue(`${blockRef}.gap: invalid status value "${block.gap.status}".`);
    } else if (block.gap.status !== "none") {
      for (const field of gapSuggestionFields) {
        if (!isNonEmptyString(block.gap[field])) {
          addIssue(
            `${blockRef}.gap: status "${block.gap.status}" requires non-empty "${field}".`,
          );
        }
      }
    }

    if (block.evidenceRegion !== undefined) {
      const regionRef = `${blockRef}.evidenceRegion`;
      const region = block.evidenceRegion;

      if (typeof region !== "object" || region === null) {
        addIssue(`${regionRef}: must be an object.`);
      } else {
        if (!isNonEmptyString(region.image)) {
          addIssue(`${regionRef}: empty region image.`);
        }

        const coords = ["x", "y", "width", "height"];
        const numbersValid = coords.every(
          (field) =>
            typeof region[field] === "number" &&
            region[field] >= 0 &&
            region[field] <= 1,
        );

        if (!numbersValid) {
          addIssue(`${regionRef}: x/y/width/height must be fractions between 0 and 1.`);
        } else {
          if (region.width <= 0 || region.height <= 0) {
            addIssue(`${regionRef}: width and height must be greater than 0.`);
          }

          if (region.x + region.width > 1.01 || region.y + region.height > 1.01) {
            addIssue(`${regionRef}: region out of range (x+width or y+height exceeds 1).`);
          }
        }
      }
    }

    if (block.review !== undefined) {
      const reviewRef = `${blockRef}.review`;
      const review = block.review;

      if (typeof review !== "object" || review === null) {
        addIssue(`${reviewRef}: must be an object.`);
      } else {
        const blockIsClassifiable =
          typeof block.gap === "object" &&
          block.gap !== null &&
          gapStatuses.has(block.gap.status) &&
          Array.isArray(block.matches);

        if (blockIsClassifiable) {
          const section = classifyBlock(block);
          const allowedDecisions = reviewDecisionsBySection[section];

          if (!allowedDecisions.has(review.decision)) {
            addIssue(
              `${reviewRef}: disallowed decision "${review.decision}" for ${section} block (allowed: ${[...allowedDecisions].join(", ")}).`,
            );
          }
        }

        if (review.decision === "use-existing") {
          if (!isNonEmptyString(review.overrideComponentId)) {
            addIssue(
              `${reviewRef}: decision "use-existing" requires non-empty "overrideComponentId".`,
            );
          } else if (!storyTitleById.has(review.overrideComponentId)) {
            addIssue(
              `${reviewRef}: unknown overrideComponentId "${review.overrideComponentId}" (not in ${catalogPath}).`,
            );
          }
        }

        if (!isNonEmptyString(review.reviewedAt)) {
          addIssue(`${reviewRef}: missing or empty "reviewedAt".`);
        }
      }
    }
  });

  if (report.composition !== undefined) {
    validateComposition(report.composition, report.blocks, addIssue);
  }

  const blocksAreClassifiable = report.blocks.every(
    (block) =>
      typeof block.gap === "object" &&
      block.gap !== null &&
      gapStatuses.has(block.gap.status) &&
      Array.isArray(block.matches),
  );

  if (
    typeof report.summary !== "object" ||
    report.summary === null ||
    ["reusable", "extend", "missing"].some(
      (field) => typeof report.summary[field] !== "number",
    )
  ) {
    addIssue('invalid "summary": expected { reusable, extend, missing } counts.');
  } else if (blocksAreClassifiable) {
    const derived = { reusable: 0, extend: 0, missing: 0 };

    for (const block of report.blocks) {
      derived[classifyBlock(block)] += 1;
    }

    for (const field of ["reusable", "extend", "missing"]) {
      if (report.summary[field] !== derived[field]) {
        addIssue(
          `summary.${field} is ${report.summary[field]}; expected ${derived[field]} derived from blocks.`,
        );
      }
    }
  }

  if (report.reviewStatus !== undefined) {
    if (!reviewStatuses.has(report.reviewStatus)) {
      addIssue(
        `invalid reviewStatus value "${report.reviewStatus}" (expected draft or confirmed).`,
      );
    } else if (report.reviewStatus === "confirmed" && blocksAreClassifiable) {
      report.blocks.forEach((block, blockIndex) => {
        const section = classifyBlock(block);

        if (
          (section === "extend" || section === "missing") &&
          !(
            typeof block.review === "object" &&
            block.review !== null &&
            isNonEmptyString(block.review.decision)
          )
        ) {
          addIssue(
            `blocks[${blockIndex}]: incomplete review for confirmation ("${section}" block has no review decision).`,
          );
        }
      });
    }
  }
}

const issues = [];

// A fresh install has no reports yet — that is a passing state.
if (!existsSync(reportsDir)) {
  console.log(`Component coverage report check passed (no ${reportsDir} yet).`);
  process.exit(0);
}

const reportFiles = readdirSync(reportsDir)
  .filter((file) => file.endsWith(".json") && file !== "index.json")
  .sort();

for (const file of reportFiles) {
  const filePath = join(reportsDir, file);
  const addIssue = (message) => issues.push(`${filePath}: ${message}`);
  let report;

  try {
    report = JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    addIssue(`invalid JSON (${error.message}).`);
    continue;
  }

  validateReport(report, addIssue);
}

if (issues.length > 0) {
  console.error("Component coverage report check failed:");
  for (const issue of issues) {
    console.error(`  - ${issue}`);
  }
  process.exit(1);
}

console.log(
  `Component coverage report check passed (${reportFiles.length} report${reportFiles.length === 1 ? "" : "s"}).`,
);
