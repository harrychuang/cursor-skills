import type { ComponentDocumentationProvenance } from "../componentCatalog";

/**
 * Single source of truth for the component-coverage file contract.
 * scripts/check-component-coverage-reports.mjs,
 * .agents/skills/component-coverage-analyze/SKILL.md,
 * .claude/skills/component-coverage-analyze/SKILL.md,
 * .agents/skills/component-coverage-implement/SKILL.md, and
 * .claude/skills/component-coverage-implement/SKILL.md mirror these shapes;
 * any change here must be synchronized with all of them.
 */

export const coverageRequestStatuses = ["pending", "analyzed"] as const;

export type CoverageRequestStatus = (typeof coverageRequestStatuses)[number];

export const coverageMatchFits = ["exact", "variant-needed", "partial"] as const;

export type CoverageMatchFit = (typeof coverageMatchFits)[number];

export const coverageGapStatuses = ["none", "extend", "missing"] as const;

export type CoverageGapStatus = (typeof coverageGapStatuses)[number];

/** Request id format: <YYYYMMDD-HHmmss>-<slug> */
export const coverageRequestIdPattern = /^\d{8}-\d{6}-[a-z0-9][a-z0-9-]*$/;

export type CoverageRequest = {
  id: string;
  createdAt: string;
  title: string;
  prdText: string;
  /** File names stored alongside request.json in the same request directory. */
  images: readonly string[];
  status: CoverageRequestStatus;
};

export type CoverageMatch = {
  componentId: string;
  /** Must equal the catalog-derived `Components/<category>/<name>` title. */
  storyTitle: string;
  fit: CoverageMatchFit;
  reason: string;
  provenance: ComponentDocumentationProvenance;
  componentPath: string;
};

export type CoverageGap =
  | { status: "none" }
  | {
      status: Exclude<CoverageGapStatus, "none">;
      suggestedName: string;
      suggestedCategory: string;
      suggestedRole: string;
      rationale: string;
    };

/**
 * Region of a source image (fractions of the natural size, 0..1) that shows
 * where this block sits in the uploaded UI. `image` is a file name inside
 * the originating request directory.
 */
export type CoverageEvidenceRegion = {
  image: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export const coverageReviewStatuses = ["draft", "confirmed"] as const;

/** Absent `reviewStatus` on a report is treated as `draft`. */
export type CoverageReviewStatus = (typeof coverageReviewStatuses)[number];

/**
 * Allowed review decisions are scoped by the block's coverage classification
 * (see classifyCoverageBlock): reviewing a missing block answers "build it or
 * not", an extend block answers "extend it or not", a reusable block carries
 * an optional approval. Because the analyzer can be wrong, every section also
 * allows overriding to an existing catalog component (`use-existing`, carried
 * by `overrideComponentId`) and excluding the block from implementation
 * (`skip`).
 */
export const coverageReviewDecisionsBySection = {
  missing: ["build-new", "use-existing", "skip"],
  extend: ["extend", "no-extend", "use-existing", "skip"],
  reusable: ["approve", "use-existing", "skip"],
} as const;

export type CoverageReviewDecision =
  (typeof coverageReviewDecisionsBySection)[keyof typeof coverageReviewDecisionsBySection][number];

/**
 * Developer review layered on top of the analyzer output. Review updates
 * never alter analyzer-produced fields. `use-existing` requires
 * `overrideComponentId` to name a catalog component.
 */
export type CoverageBlockReview = {
  decision: CoverageReviewDecision;
  note?: string;
  overrideComponentId?: string;
  reviewedAt: string;
};

export const coverageCompositionViewports = ["mobile", "desktop"] as const;
export const coverageCompositionLayouts = ["stack", "row", "grid"] as const;
export const coverageCompositionColumns = [2, 3, 4] as const;
export const coverageCompositionSpans = [1, 2, 3, 4] as const;
export const coverageCompositionMaxDepth = 6;
export const coverageCompositionMaxNodes = 100;

export type CoverageCompositionViewport =
  (typeof coverageCompositionViewports)[number];
export type CoverageCompositionLayout =
  (typeof coverageCompositionLayouts)[number];
export type CoverageCompositionColumn =
  (typeof coverageCompositionColumns)[number];
export type CoverageCompositionSpan =
  (typeof coverageCompositionSpans)[number];

export type CoverageComposition = {
  version: 1;
  label: string;
  viewport: CoverageCompositionViewport;
  root: CoverageCompositionGroup;
};

export type CoverageCompositionGroup = {
  kind: "group";
  id: string;
  label?: string;
  layout: CoverageCompositionLayout;
  columns?: CoverageCompositionColumn;
  children: readonly CoverageCompositionNode[];
};

export type CoverageCompositionBlock = {
  kind: "block";
  id: string;
  blockId: string;
  matchComponentId?: string;
  span?: CoverageCompositionSpan;
};

export type CoverageCompositionNode =
  | CoverageCompositionGroup
  | CoverageCompositionBlock;

export type CoverageCompositionIssue = {
  path: string;
  message: string;
};

export type CoverageCompositionValidationResult =
  | {
      ok: true;
      composition: CoverageComposition;
    }
  | {
      ok: false;
      issues: readonly CoverageCompositionIssue[];
    };

export type CoverageBlock = {
  id: string;
  label: string;
  /** What in the source image or PRD text this block was identified from. */
  evidence: string;
  matches: readonly CoverageMatch[];
  gap: CoverageGap;
  evidenceRegion?: CoverageEvidenceRegion;
  review?: CoverageBlockReview;
};

export type CoverageSummary = {
  reusable: number;
  extend: number;
  missing: number;
};

export type CoverageAnalyzerInfo = {
  engine: string;
  catalogEntryCount: number;
};

export type CoverageReport = {
  id: string;
  requestId: string;
  createdAt: string;
  sourceSummary: string;
  blocks: readonly CoverageBlock[];
  summary: CoverageSummary;
  analyzer: CoverageAnalyzerInfo;
  reviewStatus?: CoverageReviewStatus;
  composition?: CoverageComposition;
};

export type CoverageSection = keyof CoverageSummary;

type CoverageCompositionParent = {
  layout: CoverageCompositionLayout;
  columns?: CoverageCompositionColumn;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Runtime guard for analyzer-produced composition data. Reports are loaded
 * from JSON, so the TypeScript contract alone cannot protect the review UI
 * from malformed or unexpectedly executable input.
 */
export function validateCoverageComposition(
  value: unknown,
  blocks: readonly CoverageBlock[],
): CoverageCompositionValidationResult {
  const issues: CoverageCompositionIssue[] = [];
  const nodeIds = new Set<string>();
  const referencedBlockIds = new Set<string>();
  const blockById = new Map(blocks.map((block) => [block.id, block]));
  let nodeCount = 0;

  const addIssue = (path: string, message: string) => {
    issues.push({ path, message });
  };

  const validateAllowedKeys = (
    record: Record<string, unknown>,
    allowedKeys: readonly string[],
    path: string,
  ) => {
    const allowed = new Set(allowedKeys);

    for (const key of Object.keys(record)) {
      if (!allowed.has(key)) {
        addIssue(`${path}.${key}`, "field is not allowed in a composition");
      }
    }
  };

  const validateNonEmptyString = (
    candidate: unknown,
    path: string,
  ): candidate is string => {
    if (typeof candidate !== "string" || candidate.trim().length === 0) {
      addIssue(path, "must be a non-empty string");
      return false;
    }

    return true;
  };

  const validateNode = (
    node: unknown,
    path: string,
    depth: number,
    parent?: CoverageCompositionParent,
  ): void => {
    nodeCount += 1;

    if (nodeCount > coverageCompositionMaxNodes) {
      if (nodeCount === coverageCompositionMaxNodes + 1) {
        addIssue(
          path,
          `composition exceeds ${coverageCompositionMaxNodes} nodes`,
        );
      }
      return;
    }

    if (depth > coverageCompositionMaxDepth) {
      addIssue(
        path,
        `composition exceeds maximum depth ${coverageCompositionMaxDepth}`,
      );
      return;
    }

    if (!isRecord(node)) {
      addIssue(path, "must be a group or block object");
      return;
    }

    const { kind } = node;

    if (kind !== "group" && kind !== "block") {
      addIssue(`${path}.kind`, 'must be either "group" or "block"');
      return;
    }

    if (validateNonEmptyString(node.id, `${path}.id`)) {
      if (nodeIds.has(node.id)) {
        addIssue(`${path}.id`, `duplicate node id "${node.id}"`);
      } else {
        nodeIds.add(node.id);
      }
    }

    if (kind === "group") {
      validateAllowedKeys(
        node,
        ["kind", "id", "label", "layout", "columns", "children"],
        path,
      );

      if (
        node.label !== undefined &&
        !validateNonEmptyString(node.label, `${path}.label`)
      ) {
        // The helper records the actionable issue.
      }

      const layout = coverageCompositionLayouts.find(
        (candidate) => candidate === node.layout,
      );

      if (!layout) {
        addIssue(
          `${path}.layout`,
          'must be one of "stack", "row", or "grid"',
        );
      }

      let columns: CoverageCompositionColumn | undefined;

      if (layout === "grid") {
        columns = coverageCompositionColumns.find(
          (candidate) => candidate === node.columns,
        );

        if (!columns) {
          addIssue(`${path}.columns`, "grid columns must be 2, 3, or 4");
        }
      } else if (layout && node.columns !== undefined) {
        addIssue(
          `${path}.columns`,
          "columns is only allowed when layout is grid",
        );
      }

      if (!Array.isArray(node.children) || node.children.length === 0) {
        addIssue(`${path}.children`, "must contain at least one node");
        return;
      }

      const childParent: CoverageCompositionParent | undefined = layout
        ? { layout, columns }
        : undefined;

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

    let reportBlock: CoverageBlock | undefined;

    if (validateNonEmptyString(node.blockId, `${path}.blockId`)) {
      if (referencedBlockIds.has(node.blockId)) {
        addIssue(
          `${path}.blockId`,
          `report block "${node.blockId}" is referenced more than once`,
        );
      } else {
        referencedBlockIds.add(node.blockId);
      }

      reportBlock = blockById.get(node.blockId);
      if (!reportBlock) {
        addIssue(
          `${path}.blockId`,
          `does not reference a report block: "${node.blockId}"`,
        );
      }
    }

    if (reportBlock) {
      if (reportBlock.matches.length === 0) {
        if (node.matchComponentId !== undefined) {
          addIssue(
            `${path}.matchComponentId`,
            "must be omitted when the report block has no matches",
          );
        }
      } else if (
        !validateNonEmptyString(
          node.matchComponentId,
          `${path}.matchComponentId`,
        )
      ) {
        // The helper records the actionable issue.
      } else if (
        !reportBlock.matches.some(
          (match) => match.componentId === node.matchComponentId,
        )
      ) {
        addIssue(
          `${path}.matchComponentId`,
          `does not match a candidate on report block "${reportBlock.id}"`,
        );
      }
    } else if (
      node.matchComponentId !== undefined &&
      typeof node.matchComponentId !== "string"
    ) {
      addIssue(`${path}.matchComponentId`, "must be a string when present");
    }

    if (parent?.layout === "grid") {
      if (node.span !== undefined) {
        const span = coverageCompositionSpans.find(
          (candidate) => candidate === node.span,
        );

        if (!span || !parent.columns || span > parent.columns) {
          addIssue(
            `${path}.span`,
            `must be an integer from 1 to ${parent.columns ?? "the grid columns"}`,
          );
        }
      }
    } else if (node.span !== undefined) {
      addIssue(
        `${path}.span`,
        "span is only allowed on a direct block child of a grid",
      );
    }
  };

  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [{ path: "composition", message: "must be an object" }],
    };
  }

  validateAllowedKeys(
    value,
    ["version", "label", "viewport", "root"],
    "composition",
  );

  if (value.version !== 1) {
    addIssue("composition.version", "must equal 1");
  }

  validateNonEmptyString(value.label, "composition.label");

  if (!coverageCompositionViewports.some((item) => item === value.viewport)) {
    addIssue(
      "composition.viewport",
      'must be either "mobile" or "desktop"',
    );
  }

  if (!isRecord(value.root) || value.root.kind !== "group") {
    addIssue("composition.root", "must be a group node");
  }

  validateNode(value.root, "composition.root", 1);

  for (const block of blocks) {
    if (!referencedBlockIds.has(block.id)) {
      addIssue(
        "composition.root",
        `report block "${block.id}" must be referenced exactly once`,
      );
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return { ok: true, composition: value as CoverageComposition };
}

/**
 * Contract rule for both report summaries and the three report view sections:
 * gap status decides first; a gap-free block is reusable only when its best
 * match fit is `exact`, otherwise it still needs extension work.
 */
export function classifyCoverageBlock(block: CoverageBlock): CoverageSection {
  if (block.gap.status === "missing") {
    return "missing";
  }

  if (block.gap.status === "extend") {
    return "extend";
  }

  return block.matches.some((match) => match.fit === "exact")
    ? "reusable"
    : "extend";
}

export function getAllowedReviewDecisions(
  block: CoverageBlock,
): readonly CoverageReviewDecision[] {
  return coverageReviewDecisionsBySection[classifyCoverageBlock(block)];
}

/**
 * Shared confirmability rule for the report view and the dev middleware:
 * a report may hold reviewStatus `confirmed` only when every block classified
 * `extend` or `missing` carries a review decision (reusable blocks are
 * optional and never block confirmation).
 */
export function canConfirmCoverageReview(
  report: Pick<CoverageReport, "blocks">,
): boolean {
  return report.blocks.every(
    (block) =>
      classifyCoverageBlock(block) === "reusable" ||
      Boolean(block.review?.decision),
  );
}

export function deriveCoverageSummary(
  blocks: readonly CoverageBlock[],
): CoverageSummary {
  const summary: CoverageSummary = { reusable: 0, extend: 0, missing: 0 };

  for (const block of blocks) {
    summary[classifyCoverageBlock(block)] += 1;
  }

  return summary;
}
