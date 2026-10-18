import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import {
  componentCatalog,
  componentCatalogEntries,
  type ComponentCatalogEntry,
  type ComponentCatalogId,
} from "../componentCatalog";
import {
  componentCoverageStaticBase,
  type CoverageReviewSubmitPayload,
} from "./coverageApi";
import {
  CompositionPreview,
  resolveCompositionPreviewStoryId,
  type CompositionCanvasMode,
  type CompositionReferenceImage,
} from "./CompositionPreview";
import {
  collectCompositionBlockIds,
  findCompositionBlockNode,
  findInspectorEvidenceRegion,
  resolveCompositionSlot,
  updateCompositionPreviewOverride,
  type CompositionPreviewOverride,
} from "./compositionPreviewModel";
import {
  canConfirmCoverageReview,
  classifyCoverageBlock,
  getAllowedReviewDecisions,
  type CoverageBlock,
  type CoverageBlockReview,
  type CoverageCompositionIssue,
  type CoverageEvidenceRegion,
  type CoverageMatch,
  type CoverageReport,
  type CoverageRequest,
  type CoverageReviewDecision,
  type CoverageSection,
  type CoverageSummary,
} from "./coverageTypes";

const sectionOrder = ["reusable", "extend", "missing"] as const;

const sectionCopy = {
  reusable: {
    heading: "可直接使用",
    hint: "覆核選填：確認可用／改用現有／不實作",
  },
  extend: {
    heading: "需擴充 variant",
    hint: "請決定：擴充／不擴充／改用現有／不實作",
  },
  missing: { heading: "缺少需新建", hint: "請決定：新建／改用現有／不實作" },
} as const satisfies Record<CoverageSection, { heading: string; hint: string }>;

const fitCopy = {
  exact: "完全符合",
  "variant-needed": "需新增 variant",
  partial: "部分符合",
} as const satisfies Record<CoverageMatch["fit"], string>;

const provenanceCopy = {
  extracted: "Figma 擷取",
  "implementation-derived": "實作推導",
} as const satisfies Record<CoverageMatch["provenance"], string>;

type MatchRank = "primary" | "candidate";

const matchRankCopy = {
  primary: "首選",
  candidate: "候選",
} as const satisfies Record<MatchRank, string>;

const matchFitRank = {
  exact: 0,
  "variant-needed": 1,
  partial: 2,
} as const satisfies Record<CoverageMatch["fit"], number>;

/**
 * Presentation-only ranking for blocks carrying two or more matches: the
 * best-fit match (ties resolved by array order) is the analyzer's primary
 * pick, the rest are candidates. Single-match blocks show no marker.
 */
function findPrimaryMatchIndex(matches: readonly CoverageMatch[]): number {
  let best = 0;

  for (let index = 1; index < matches.length; index += 1) {
    if (matchFitRank[matches[index].fit] < matchFitRank[matches[best].fit]) {
      best = index;
    }
  }

  return best;
}

const reviewDecisionCopy = {
  approve: "確認可用",
  "build-new": "同意新建",
  extend: "同意擴充",
  "no-extend": "不需擴充",
  skip: "不實作",
  "use-existing": "改用現有元件",
} as const satisfies Record<CoverageReviewDecision, string>;

const copiedResetDelayMs = 2000;
const analysisGuidanceCopy = {
  copyLabel: "複製分析提示詞",
  pending: "下一步：複製分析提示詞，貼到 Cursor、Claude Code 或 Codex 執行。",
  reportMissing:
    "已分析但找不到報告檔，請將分析提示詞重新貼到 Cursor、Claude Code 或 Codex 執行。",
} as const;

const inspectorEvidenceCopy = {
  label: "UI Reference 元件截圖",
  unavailable: "無可用 UI Reference 截圖",
} as const;

export function buildAnalysisPrompt(requestId: string) {
  const requestPath =
    `outputs/component-coverage/requests/${requestId}/request.json`;
  const reportPath = `outputs/component-coverage/reports/${requestId}.json`;
  const skillPath = ".agents/skills/component-coverage-analyze/SKILL.md";

  return [
    `請使用專案的 component-coverage-analyze skill 分析 Component Coverage 請求「${requestId}」。`,
    `若目前 agent 未自動載入該 skill，請先讀取並完整遵循 \`${skillPath}\`。`,
    "",
    "完成條件：",
    `1. 讀取 ${requestPath} 與其中列出的圖片。`,
    `2. 依 src/storybook/component-coverage/coverageTypes.ts 契約產生 ${reportPath}。`,
    `3. 將 ${requestPath} 的 status 更新為 analyzed。`,
    "4. 執行 node scripts/check-component-coverage-reports.mjs，確認驗證通過後回報結果。",
  ].join("\n");
}

/**
 * One row of the unified request/report pipeline list. Valid requests join
 * their report by requestId; reports without a matching request (the normal
 * case in read-only mode) become orphan rows; invalid files become error rows.
 */
export type PipelineRow =
  | {
      kind: "request";
      key: string;
      request: CoverageRequest;
      report?: CoverageReport;
      reportFileName?: string;
      compositionIssues?: readonly CoverageCompositionIssue[];
    }
  | {
      kind: "orphan-report";
      key: string;
      fileName: string;
      report: CoverageReport;
      compositionIssues?: readonly CoverageCompositionIssue[];
    }
  | { kind: "invalid-request"; key: string; id: string; error: string }
  | { kind: "invalid-report"; key: string; fileName: string; error: string };

/**
 * What a row's delete control removes. A request row deletes its request
 * directory and, when paired, its report file; report-only rows carry just a
 * `reportFileName`. The container deletes the report before the request.
 */
export type DeleteTarget = {
  requestId?: string;
  reportFileName?: string;
};

type PipelineStage = "pending" | "report-missing" | "in-review" | "confirmed";

const stageCopy = {
  pending: "待分析",
  "report-missing": "找不到報告",
  "in-review": "待覆核",
  confirmed: "覆核完成",
} as const satisfies Record<PipelineStage, string>;

/** Single derivation point for the stage chip (see spec stage table). */
function derivePipelineStage(
  report: CoverageReport | undefined,
  requestStatus: CoverageRequest["status"] | undefined,
): PipelineStage {
  if (!report) {
    return requestStatus === "pending" ? "pending" : "report-missing";
  }

  return isReportConfirmed(report) ? "confirmed" : "in-review";
}

function collectReviews(
  report: CoverageReport,
): Record<string, CoverageBlockReview> {
  const reviews: Record<string, CoverageBlockReview> = {};

  for (const block of report.blocks) {
    if (block.review) {
      reviews[block.id] = block.review;
    }
  }

  return reviews;
}

function isReportConfirmed(report: CoverageReport) {
  return (report.reviewStatus ?? "draft") === "confirmed";
}

function reportDetailDomId(fileName: string) {
  return `coverage-report-${fileName.replace(/[^a-z0-9]+/gi, "-")}-detail`;
}

/** Portable implementation handoff shared by Cursor, Claude Code, and Codex. */
function buildImplementationPrompt(requestId: string): string {
  const reportPath = `outputs/component-coverage/reports/${requestId}.json`;
  const requestPath = `outputs/component-coverage/requests/${requestId}/`;
  const skillPath = ".agents/skills/component-coverage-implement/SKILL.md";

  return [
    `請使用專案的 component-coverage-implement skill 實作 Component Coverage 請求「${requestId}」。`,
    `若目前 agent 未自動載入該 skill，請先讀取並完整遵循 \`${skillPath}\`。`,
    "",
    "完成條件：",
    `1. 讀取 ${reportPath}、${requestPath}request.json 與其中列出的圖片。`,
    `2. 確認 ${reportPath} 的 reviewStatus 為 confirmed；否則停止實作。`,
    "3. component-coverage-implement 是報告與覆核流程的 orchestrator；請從報告取得每個區塊的決定，不要由這段提示推測或覆寫決定。",
    "4. 工作清單若含 extend 或 build-new，先載入 design-system-to-storybook 與 design-system-governance，僅對這些元件執行 design-system-to-storybook 的 Component pass；元件與 stories 完成後才組合界面。",
    "5. 若工作清單是 reuse-only（只有 reusable、use-existing、no-extend 或 skip），不要執行 Component pass，也不要修改 shared component API。",
    "6. 單次元件工作沿用既有 Storybook；不得執行 Storybook template bootstrap、addon 或 importer 的安裝／升級。",
    "7. 保持報告 JSON 不變；執行 component coverage、component catalog、專案 check/typecheck 與可用的 Storybook build，全部通過後回報結果。",
  ].join("\n");
}

export function CopyTextButton({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const clipboardAvailable =
    typeof navigator !== "undefined" && !!navigator.clipboard?.writeText;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), copiedResetDelayMs);
    } catch {
      setFallbackOpen(true);
    }
  };

  if (!clipboardAvailable || fallbackOpen) {
    return (
      <div className="cm-coverage__copy-fallback">
        <span className="cm-coverage__copy-fallback-label">
          {label}（請手動選取複製）
        </span>
        <textarea
          className="cm-coverage__copy-fallback-text"
          onFocus={(event) => event.currentTarget.select()}
          readOnly
          rows={Math.min(8, text.split("\n").length)}
          value={text}
        />
      </div>
    );
  }

  return (
    <button
      className="cm-coverage__copy-button"
      onClick={() => void handleCopy()}
      type="button"
    >
      {copied ? "已複製 ✓" : label}
    </button>
  );
}

export function formatTimestamp(value: string) {
  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function storyDocsPath(storyTitle: string) {
  const slug = storyTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `/docs/${slug}--docs`;
}

function openStoryDocs(storyTitle: string) {
  const search = `?path=${storyDocsPath(storyTitle)}`;

  try {
    const managerWindow = window.top;

    if (managerWindow && managerWindow !== window) {
      managerWindow.location.href = `${managerWindow.location.pathname}${search}`;
      return;
    }
  } catch {
    // Cross-origin manager — fall back to navigating this frame.
  }

  window.location.href = search;
}

export function storyManagerPath(storyTitle: string, storyId?: string) {
  return storyId
    ? `/story/${encodeURIComponent(storyId)}`
    : storyDocsPath(storyTitle);
}

function storyManagerUrl(storyTitle: string, storyId?: string) {
  const path = storyManagerPath(storyTitle, storyId);
  const search = `?path=${path}`;

  if (typeof window === "undefined") {
    return search;
  }

  let managerHref = window.location.href;

  try {
    if (window.top && window.top !== window) {
      managerHref = window.top.location.href;
    }
  } catch {
    // Cross-origin manager — use this frame's URL and strip iframe.html below.
  }

  try {
    const url = new URL(managerHref);

    url.hash = "";
    url.search = "";
    url.pathname = url.pathname.replace(/\/iframe\.html$/, "/");
    url.searchParams.set("path", path);
    return url.toString();
  } catch {
    return search;
  }
}

function componentDisplayName(componentId: string) {
  return componentCatalog[componentId as ComponentCatalogId]?.name ?? componentId;
}

function matchDisplayName(match: CoverageMatch) {
  return componentDisplayName(match.componentId);
}

function CoverageBar({ summary }: { summary: CoverageSummary }) {
  const total = summary.reusable + summary.extend + summary.missing;

  if (total === 0) {
    return null;
  }

  const segments = [
    { count: summary.reusable, key: "reusable", label: "可用" },
    { count: summary.extend, key: "extend", label: "需擴充" },
    { count: summary.missing, key: "missing", label: "缺少" },
  ] as const;
  const reusablePercent = Math.round((summary.reusable / total) * 100);

  return (
    <div className="cm-coverage__bar-wrap">
      <div
        aria-label={`覆蓋度：可用 ${summary.reusable}、需擴充 ${summary.extend}、缺少 ${summary.missing}`}
        className="cm-coverage__bar"
        role="img"
      >
        {segments.map((segment) =>
          segment.count > 0 ? (
            <span
              className={`cm-coverage__bar-segment cm-coverage__bar-segment--${segment.key}`}
              key={segment.key}
              style={{ flexGrow: segment.count }}
            />
          ) : null,
        )}
      </div>
      <span className="cm-coverage__bar-legend">
        {segments.map((segment) => `${segment.label} ${segment.count}`).join("・")}
        ・可用率 {reusablePercent}%
      </span>
    </div>
  );
}

function SummaryStats({
  onNavigate,
  summary,
}: {
  onNavigate: (section: CoverageSection) => void;
  summary: CoverageSummary;
}) {
  const total = summary.reusable + summary.extend + summary.missing;

  if (total === 0) {
    return null;
  }

  const reusablePercent = Math.round((summary.reusable / total) * 100);
  const tiles = [
    { key: "reusable", label: "可直接使用", value: summary.reusable },
    { key: "extend", label: "需擴充", value: summary.extend },
    { key: "missing", label: "缺少", value: summary.missing },
  ] as const;

  return (
    <div className="cm-coverage__stats">
      {tiles.map((tile) => (
        <button
          aria-label={`跳至「${sectionCopy[tile.key].heading}」`}
          className="cm-coverage__stat cm-coverage__stat--link"
          key={tile.key}
          onClick={() => onNavigate(tile.key)}
          type="button"
        >
          <span
            className={`cm-coverage__stat-value cm-coverage__stat-value--${tile.key}`}
          >
            {tile.value}
          </span>
          <span className="cm-coverage__stat-label">{tile.label}</span>
        </button>
      ))}
      <div className="cm-coverage__stat">
        <span className="cm-coverage__stat-value">{reusablePercent}%</span>
        <span className="cm-coverage__stat-label">可用率</span>
      </div>
    </div>
  );
}

type PreviewControl = {
  expandedPreview: string;
  onTogglePreview: (previewKey: string) => void;
  storyIndex: ReadonlyMap<string, string>;
};

function MatchCard({
  match,
  preview,
  previewKey,
  rank,
}: {
  match: CoverageMatch;
  preview: PreviewControl;
  previewKey: string;
  rank?: MatchRank;
}) {
  const storyId = preview.storyIndex.get(match.storyTitle);
  const expanded = preview.expandedPreview === previewKey;

  return (
    <div className="cm-coverage__match">
      <div className="cm-coverage__match-header">
        <span className="cm-coverage__match-name">{matchDisplayName(match)}</span>
        {rank ? (
          <span className={`cm-coverage__chip cm-coverage__chip--rank-${rank}`}>
            {matchRankCopy[rank]}
          </span>
        ) : null}
        <span className={`cm-coverage__chip cm-coverage__chip--fit-${match.fit}`}>
          {fitCopy[match.fit]}
        </span>
        <span className="cm-coverage__chip cm-coverage__chip--provenance">
          {provenanceCopy[match.provenance]}
        </span>
        {storyId ? (
          <button
            aria-expanded={expanded}
            className="cm-coverage__preview-toggle"
            onClick={() => preview.onTogglePreview(previewKey)}
            type="button"
          >
            <svg
              aria-hidden="true"
              fill="none"
              height="14"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
              width="14"
            >
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {expanded ? "收合預覽" : "預覽元件"}
          </button>
        ) : null}
      </div>
      <p className="cm-coverage__match-reason">{match.reason}</p>
      {storyId && expanded ? (
        <iframe
          className="cm-coverage__preview-frame"
          loading="lazy"
          src={`iframe.html?id=${storyId}&viewMode=story`}
          title={`${matchDisplayName(match)} story 預覽`}
        />
      ) : null}
      <div className="cm-coverage__match-footer">
        <code className="cm-coverage__code">{match.componentPath}</code>
        <a
          className="cm-coverage__story-link"
          href={`?path=${storyDocsPath(match.storyTitle)}`}
          onClick={(event) => {
            event.preventDefault();
            openStoryDocs(match.storyTitle);
          }}
          target="_top"
        >
          開啟 {match.storyTitle}
        </a>
      </div>
    </div>
  );
}

export type ComponentPickerGroup = {
  key: string;
  label: string;
  entries: readonly ComponentCatalogEntry[];
};

/**
 * Filter + grouping model for the use-existing component picker: the query
 * matches name, id, category, and keywords case-insensitively; the block's
 * analyzer candidates lead the list and the remaining catalog follows,
 * grouped by category in catalog order. Selection stays list-only — free
 * text never becomes an overrideComponentId.
 */
export function buildComponentPickerGroups(
  query: string,
  candidateIds: readonly string[],
  entries: readonly ComponentCatalogEntry[] = componentCatalogEntries,
): readonly ComponentPickerGroup[] {
  const normalized = query.trim().toLowerCase();
  const matchesQuery = (entry: ComponentCatalogEntry) =>
    normalized === "" ||
    [entry.name, entry.id, entry.category, ...entry.keywords].some((field) =>
      field.toLowerCase().includes(normalized),
    );

  const candidateIdSet = new Set(candidateIds);
  const groups: ComponentPickerGroup[] = [];
  const candidates = entries.filter(
    (entry) => candidateIdSet.has(entry.id) && matchesQuery(entry),
  );

  if (candidates.length > 0) {
    groups.push({ key: "candidates", label: "分析候選", entries: candidates });
  }

  const remainderByCategory = new Map<string, ComponentCatalogEntry[]>();

  for (const entry of entries) {
    if (candidateIdSet.has(entry.id) || !matchesQuery(entry)) {
      continue;
    }

    const bucket = remainderByCategory.get(entry.category);

    if (bucket) {
      bucket.push(entry);
    } else {
      remainderByCategory.set(entry.category, [entry]);
    }
  }

  for (const [category, categoryEntries] of remainderByCategory) {
    groups.push({
      key: `category:${category}`,
      label: category,
      entries: categoryEntries,
    });
  }

  return groups;
}

function ComponentPicker({
  blockId,
  candidateIds,
  onPick,
  selectedId,
}: {
  blockId: string;
  candidateIds: readonly string[];
  onPick: (componentId: string) => void;
  selectedId: string;
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const groups = useMemo(
    () => buildComponentPickerGroups(query, candidateIds),
    [query, candidateIds],
  );
  const flatEntries = useMemo(
    () => groups.flatMap((group) => group.entries),
    [groups],
  );
  const activeEntry = activeIndex >= 0 ? flatEntries[activeIndex] : undefined;
  const listboxId = `${blockId}-picker-listbox`;
  const optionDomId = (componentId: string) =>
    `${blockId}-picker-option-${componentId}`;
  const activeOptionId = activeEntry ? optionDomId(activeEntry.id) : undefined;

  // aria-activedescendant never scrolls by itself; keep the keyboard-active
  // option visible inside the 220px scrollable listbox.
  useEffect(() => {
    if (activeOptionId) {
      document.getElementById(activeOptionId)?.scrollIntoView?.({
        block: "nearest",
      });
    }
  }, [activeOptionId]);

  const moveActive = (delta: number) => {
    if (flatEntries.length === 0) {
      return;
    }

    setActiveIndex((current) =>
      current < 0
        ? delta > 0
          ? 0
          : flatEntries.length - 1
        : (current + delta + flatEntries.length) % flatEntries.length,
    );
  };

  return (
    <div className="cm-coverage__picker">
      <input
        aria-activedescendant={activeOptionId}
        aria-autocomplete="list"
        aria-controls={flatEntries.length > 0 ? listboxId : undefined}
        aria-expanded={flatEntries.length > 0}
        aria-label="搜尋元件"
        autoComplete="off"
        className="cm-coverage__picker-search"
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(-1);
        }}
        onKeyDown={(event) => {
          // IME composition (zh-TW input) owns arrow/Enter keys while the
          // candidate window is open — never treat them as list navigation.
          if (event.nativeEvent.isComposing || event.keyCode === 229) {
            return;
          }

          if (event.key === "ArrowDown") {
            event.preventDefault();
            moveActive(1);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            moveActive(-1);
          } else if (event.key === "Enter") {
            if (activeEntry) {
              event.preventDefault();
              onPick(activeEntry.id);
            }
          } else if (event.key === "Escape" && query !== "") {
            event.preventDefault();
            event.stopPropagation();
            setQuery("");
            setActiveIndex(-1);
          }
        }}
        placeholder="搜尋名稱、id、分類或關鍵字…"
        role="combobox"
        type="text"
        value={query}
      />
      {flatEntries.length === 0 ? (
        <p className="cm-coverage__picker-empty" role="status">
          沒有符合的元件
        </p>
      ) : (
        <div
          aria-label="選擇現有元件"
          className="cm-coverage__picker-list"
          id={listboxId}
          role="listbox"
        >
          {groups.map((group) => (
            <div
              aria-label={group.label}
              className="cm-coverage__picker-group"
              key={group.key}
              role="group"
            >
              <span className="cm-coverage__picker-group-label">
                {group.label}
              </span>
              {group.entries.map((entry) => (
                <button
                  aria-selected={entry.id === selectedId}
                  className="cm-coverage__picker-option"
                  data-active={activeEntry?.id === entry.id ? "true" : "false"}
                  id={optionDomId(entry.id)}
                  key={entry.id}
                  onClick={() => onPick(entry.id)}
                  role="option"
                  tabIndex={-1}
                  type="button"
                >
                  <span className="cm-coverage__picker-option-name">
                    {entry.name}
                  </span>
                  <span className="cm-coverage__picker-option-meta">
                    {entry.category}・{entry.id}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function BlockReviewPanel({
  block,
  editable,
  onCancel,
  onDraftOverrideChange,
  onSave,
  onSaveSuccess,
}: {
  block: CoverageBlock;
  editable: boolean;
  onCancel?: () => void;
  onDraftOverrideChange?: (componentId?: string) => void;
  onSave: (blockId: string, review: CoverageBlockReview) => Promise<void>;
  onSaveSuccess?: () => void;
}) {
  const allowedDecisions = getAllowedReviewDecisions(block);
  const review = block.review;
  const [editing, setEditing] = useState(false);
  const [decision, setDecision] = useState<CoverageReviewDecision | "">(
    review?.decision ?? "",
  );
  const [note, setNote] = useState(review?.note ?? "");
  const [overrideId, setOverrideId] = useState(review?.overrideComponentId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!editable && !review) {
    return null;
  }

  const showForm = editable && (editing || !review);
  const canSave =
    decision !== "" && (decision !== "use-existing" || overrideId !== "");
  const updateDraftOverride = (
    nextDecision: CoverageReviewDecision | "",
    nextOverrideId: string,
  ) => {
    const isSavedOverride =
      review?.decision === "use-existing" &&
      review.overrideComponentId === nextOverrideId;

    onDraftOverrideChange?.(
      nextDecision === "use-existing" && nextOverrideId && !isSavedOverride
        ? nextOverrideId
        : undefined,
    );
  };

  const handleSave = async () => {
    if (decision === "" || (decision === "use-existing" && overrideId === "")) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await onSave(block.id, {
        decision,
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(decision === "use-existing" ? { overrideComponentId: overrideId } : {}),
        reviewedAt: new Date().toISOString(),
      });
      setEditing(false);
      onSaveSuccess?.();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cm-coverage__review" data-reviewed={review ? "true" : "false"}>
      <span className="cm-coverage__review-title">開發者覆核</span>
      {review && !showForm ? (
        <div className="cm-coverage__review-summary">
          <span
            className={`cm-coverage__chip cm-coverage__chip--review-${review.decision}`}
          >
            {reviewDecisionCopy[review.decision]}
          </span>
          {review.decision === "use-existing" && review.overrideComponentId ? (
            <span className="cm-coverage__review-override">
              {componentDisplayName(review.overrideComponentId)}
              <code className="cm-coverage__code">
                {review.overrideComponentId}
              </code>
            </span>
          ) : null}
          {review.note ? (
            <span className="cm-coverage__review-note">{review.note}</span>
          ) : null}
          <span className="cm-coverage__review-meta">
            {formatTimestamp(review.reviewedAt)}
          </span>
          {editable ? (
            <button
              className="cm-coverage__review-edit"
              onClick={() => setEditing(true)}
              type="button"
            >
              編輯
            </button>
          ) : null}
        </div>
      ) : null}
      {showForm ? (
        <div className="cm-coverage__review-form">
          <div
            aria-label={`${block.label} 覆核決策`}
            className="cm-coverage__review-options"
            role="group"
          >
            {allowedDecisions.map((option) => (
              <button
                aria-pressed={decision === option}
                className={`cm-coverage__review-option${
                  decision === option ? " cm-coverage__review-option--active" : ""
                }`}
                key={option}
                onClick={() => {
                  setDecision(option);
                  updateDraftOverride(option, overrideId);
                }}
                type="button"
              >
                {reviewDecisionCopy[option]}
              </button>
            ))}
          </div>
          {decision !== "" ? (
            <>
              {decision === "use-existing" ? (
                <ComponentPicker
                  blockId={block.id}
                  candidateIds={block.matches.map((match) => match.componentId)}
                  onPick={(componentId) => {
                    setOverrideId(componentId);
                    updateDraftOverride(decision, componentId);
                  }}
                  selectedId={overrideId}
                />
              ) : null}
              <input
                aria-label="覆核備註"
                className="cm-coverage__review-input"
                maxLength={300}
                onChange={(event) => setNote(event.target.value)}
                placeholder="備註（選填）"
                type="text"
                value={note}
              />
              <div className="cm-coverage__review-actions">
                <button
                  className="cm-coverage__review-save"
                  disabled={!canSave || saving}
                  onClick={() => void handleSave()}
                  type="button"
                >
                  {saving ? "儲存中…" : "儲存覆核"}
                </button>
                {review || (decision === "use-existing" && overrideId !== "") ? (
                  <button
                    className="cm-coverage__review-cancel"
                    onClick={() => {
                      setEditing(false);
                      setDecision(review?.decision ?? "");
                      setNote(review?.note ?? "");
                      setOverrideId(review?.overrideComponentId ?? "");
                      onCancel?.();
                    }}
                    type="button"
                  >
                    取消
                  </button>
                ) : null}
              </div>
              {onDraftOverrideChange &&
              decision === "use-existing" &&
              overrideId !== "" &&
              !(
                review?.decision === "use-existing" &&
                review.overrideComponentId === overrideId
              ) ? (
                <span className="cm-coverage__review-draft-hint">
                  正在試用，尚未儲存
                </span>
              ) : null}
              {error ? (
                <span className="cm-coverage__review-error">{error}</span>
              ) : null}
            </>
          ) : (
            <span className="cm-coverage__review-form-hint">
              請先選擇處理方式
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ReviewProgress({
  editable,
  onSubmit,
  report,
}: {
  editable: boolean;
  onSubmit: (payload: CoverageReviewSubmitPayload) => Promise<void>;
  report: CoverageReport;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const confirmed = isReportConfirmed(report);
  const confirmable = canConfirmCoverageReview(report);
  const decisionBlocks = report.blocks.filter(
    (block) => classifyCoverageBlock(block) !== "reusable",
  );
  const reviewedCount = decisionBlocks.filter(
    (block) => block.review?.decision,
  ).length;
  const totalCount = decisionBlocks.length;
  const remainingCount = totalCount - reviewedCount;

  const submit = async (reviewStatus: "draft" | "confirmed") => {
    setBusy(true);
    setError("");

    try {
      await onSubmit({ reviews: collectReviews(report), reviewStatus });
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : String(submitError),
      );
    } finally {
      setBusy(false);
    }
  };

  const draftHint =
    totalCount === 0
      ? "沒有需要覆核的區塊，可直接確認。"
      : remainingCount > 0
        ? `尚有 ${remainingCount} 個區塊待覆核（標有「待覆核」徽章）。`
        : "全部覆核完成，確認後即可交接實作。";

  return (
    <div
      className="cm-coverage__gate"
      data-status={confirmed ? "confirmed" : "draft"}
    >
      <div className="cm-coverage__gate-status">
        <span className="cm-coverage__gate-progress">
          覆核進度 {reviewedCount}/{totalCount}
        </span>
        {confirmed ? (
          <span className="cm-coverage__chip cm-coverage__chip--confirmed">
            覆核已確認
          </span>
        ) : (
          <span className="cm-coverage__gate-hint">{draftHint}</span>
        )}
        {editable ? (
          confirmed ? (
            <button
              className="cm-coverage__gate-button"
              disabled={busy}
              onClick={() => void submit("draft")}
              type="button"
            >
              還原為草稿
            </button>
          ) : (
            <button
              className="cm-coverage__gate-button cm-coverage__gate-button--confirm"
              disabled={!confirmable || busy}
              onClick={() => void submit("confirmed")}
              type="button"
            >
              確認覆核完成
            </button>
          )
        ) : null}
      </div>
      {confirmed ? (
        <div className="cm-coverage__handoff">
          <span className="cm-coverage__handoff-title">開始實作</span>
          <div className="cm-coverage__handoff-actions">
            <CopyTextButton
              label="複製實作提示詞"
              text={buildImplementationPrompt(report.requestId)}
            />
          </div>
          <span className="cm-coverage__handoff-hint">
            貼到 Cursor、Claude Code 或 Codex；agent 會使用 component-coverage-implement skill 執行。
          </span>
        </div>
      ) : null}
      {error ? <span className="cm-coverage__review-error">{error}</span> : null}
    </div>
  );
}

function BlockCard({
  block,
  onOpenImage,
  onSaveReview,
  preview,
  requestId,
  reviewEditable,
}: {
  block: CoverageBlock;
  onOpenImage: (src: string) => void;
  onSaveReview: (blockId: string, review: CoverageBlockReview) => Promise<void>;
  preview: PreviewControl;
  requestId: string;
  reviewEditable: boolean;
}) {
  const needsDecision = classifyCoverageBlock(block) !== "reusable";
  const unreviewed = needsDecision && !block.review?.decision;
  const primaryMatchIndex =
    block.matches.length >= 2 ? findPrimaryMatchIndex(block.matches) : -1;

  return (
    <article className="cm-coverage__block">
      <header className="cm-coverage__block-header">
        <div className="cm-coverage__block-title-row">
          <h4 className="cm-coverage__block-label">{block.label}</h4>
          {unreviewed ? (
            <span className="cm-coverage__chip cm-coverage__chip--needs-review">
              待覆核
            </span>
          ) : null}
        </div>
        <p className="cm-coverage__block-evidence">辨識依據：{block.evidence}</p>
      </header>
      {block.evidenceRegion ? (
        <CroppedEvidence
          onOpen={onOpenImage}
          region={block.evidenceRegion}
          requestId={requestId}
        />
      ) : null}
      {block.matches.map((match, matchIndex) => (
        <MatchCard
          key={`${block.id}-${match.componentId}`}
          match={match}
          preview={preview}
          previewKey={`${block.id}:${match.componentId}`}
          rank={
            primaryMatchIndex === -1
              ? undefined
              : matchIndex === primaryMatchIndex
                ? "primary"
                : "candidate"
          }
        />
      ))}
      {block.gap.status !== "none" ? (
        <div className={`cm-coverage__gap cm-coverage__gap--${block.gap.status}`}>
          <span className="cm-coverage__gap-title">
            {block.gap.status === "missing" ? "建議新建" : "建議擴充"}：
            {block.gap.suggestedName}
          </span>
          <span className="cm-coverage__gap-meta">
            分類 {block.gap.suggestedCategory}・角色 {block.gap.suggestedRole}
          </span>
          <p className="cm-coverage__gap-rationale">{block.gap.rationale}</p>
        </div>
      ) : null}
      <BlockReviewPanel
        block={block}
        editable={reviewEditable}
        key={`${block.id}-${block.review?.reviewedAt ?? "unreviewed"}`}
        onSave={onSaveReview}
      />
    </article>
  );
}

function Lightbox({ onClose, src }: { onClose: () => void; src: string }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    const previousOverflow = document.body.style.overflow;

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      aria-modal="true"
      className="cm-coverage__lightbox"
      data-component-coverage-lightbox=""
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
    >
      <button
        aria-label="關閉放大檢視"
        className="cm-coverage__lightbox-close"
        onClick={onClose}
        type="button"
      >
        ×
      </button>
      <img alt="放大檢視" className="cm-coverage__lightbox-image" src={src} />
    </div>
  );
}

function CroppedEvidence({
  alt = "缺失元素的原圖位置",
  label = "原圖位置",
  onOpen,
  region,
  requestId,
  unavailableText,
  variant = "detail",
}: {
  alt?: string;
  label?: string;
  onOpen: (src: string) => void;
  region: CoverageEvidenceRegion;
  requestId: string;
  unavailableText?: string;
  variant?: "detail" | "inspector";
}) {
  const cropKey = [
    requestId,
    region.image,
    region.x,
    region.y,
    region.width,
    region.height,
  ].join(":");
  const [cropResult, setCropResult] = useState<
    | { key: string; status: "loading" | "unavailable" }
    | { key: string; src: string; status: "ready" }
  >({ key: cropKey, status: "loading" });
  const currentCrop =
    cropResult.key === cropKey
      ? cropResult
      : { key: cropKey, status: "loading" as const };

  useEffect(() => {
    let cancelled = false;
    const image = new Image();
    const markUnavailable = () => {
      if (!cancelled) {
        setCropResult({ key: cropKey, status: "unavailable" });
      }
    };

    setCropResult({ key: cropKey, status: "loading" });

    image.onload = () => {
      if (cancelled) {
        return;
      }

      const sx = region.x * image.naturalWidth;
      const sy = region.y * image.naturalHeight;
      const sw = Math.max(1, Math.round(region.width * image.naturalWidth));
      const sh = Math.max(1, Math.round(region.height * image.naturalHeight));
      const canvas = document.createElement("canvas");

      canvas.width = sw;
      canvas.height = sh;

      const context = canvas.getContext("2d");

      if (!context) {
        markUnavailable();
        return;
      }

      try {
        context.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
        setCropResult({
          key: cropKey,
          src: canvas.toDataURL("image/png"),
          status: "ready",
        });
      } catch {
        markUnavailable();
      }
    };
    image.onerror = markUnavailable;
    image.src = `${componentCoverageStaticBase}/requests/${requestId}/${region.image}`;

    return () => {
      cancelled = true;
    };
  }, [cropKey, region, requestId]);

  if (currentCrop.status === "loading") {
    return null;
  }

  if (currentCrop.status === "unavailable" && !unavailableText) {
    return null;
  }

  return (
    <figure
      className={`cm-coverage__crop${
        variant === "inspector" ? " cm-coverage__crop--inspector" : ""
      }`}
    >
      <figcaption className="cm-coverage__crop-label">{label}</figcaption>
      {currentCrop.status === "ready" ? (
        <button
          className="cm-coverage__crop-button"
          onClick={() => onOpen(currentCrop.src)}
          type="button"
        >
          <img alt={alt} className="cm-coverage__crop-image" src={currentCrop.src} />
        </button>
      ) : unavailableText ? (
        <p className="cm-coverage__crop-unavailable" role="status">
          {unavailableText}
        </p>
      ) : null}
    </figure>
  );
}

function SourceImages({
  onOpen,
  request,
}: {
  onOpen: (src: string) => void;
  request: CoverageRequest;
}) {
  const [failedNames, setFailedNames] = useState<readonly string[]>([]);
  const visibleImages = request.images.filter((name) => !failedNames.includes(name));

  if (visibleImages.length === 0) {
    return null;
  }

  return (
    <div className="cm-coverage__source">
      <span className="cm-coverage__source-label">來源圖片</span>
      <div className="cm-coverage__source-strip">
        {visibleImages.map((name) => {
          const url = `${componentCoverageStaticBase}/requests/${request.id}/${name}`;

          return (
            <button
              className="cm-coverage__source-thumb"
              key={name}
              onClick={() => onOpen(url)}
              title={`檢視 ${name}`}
              type="button"
            >
              <img
                alt={name}
                className="cm-coverage__source-image"
                onError={() =>
                  setFailedNames((current) => [...current, name])
                }
                src={url}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ReportDetail({
  compositionIssues,
  fileName,
  isDevMode,
  onOpenImage,
  onReviewSubmit,
  preview,
  report,
  request,
}: {
  compositionIssues?: readonly CoverageCompositionIssue[];
  fileName: string;
  isDevMode: boolean;
  onOpenImage: (src: string) => void;
  onReviewSubmit: (
    fileName: string,
    payload: CoverageReviewSubmitPayload,
  ) => Promise<void>;
  preview: PreviewControl;
  report: CoverageReport;
  request?: CoverageRequest;
}) {
  const sections = useMemo(() => {
    const grouped: Record<CoverageSection, CoverageBlock[]> = {
      extend: [],
      missing: [],
      reusable: [],
    };

    for (const block of report.blocks) {
      grouped[classifyCoverageBlock(block)].push(block);
    }

    return grouped;
  }, [report]);
  const sectionRefs = useRef<Record<CoverageSection, HTMLElement | null>>({
    extend: null,
    missing: null,
    reusable: null,
  });
  const [activeMode, setActiveMode] = useState<"preview" | "analysis">(() =>
    report.composition ? "preview" : "analysis",
  );
  const [compositionCanvasMode, setCompositionCanvasMode] =
    useState<CompositionCanvasMode>("assembled");
  const [failedReferenceImageNames, setFailedReferenceImageNames] = useState<
    readonly string[]
  >([]);
  const [activeReferenceImageName, setActiveReferenceImageName] = useState(
    request?.images[0] ?? "",
  );
  const [selectedBlockId, setSelectedBlockId] = useState<string | undefined>(
    undefined,
  );
  const [previewOverride, setPreviewOverride] = useState<
    CompositionPreviewOverride | undefined
  >();
  const compositionWorkspaceRef = useRef<HTMLDivElement | null>(null);
  const modeTabRefs = useRef<
    Record<"preview" | "analysis", HTMLButtonElement | null>
  >({ analysis: null, preview: null });
  const compositionBlockIds = useMemo(
    () =>
      report.composition
        ? collectCompositionBlockIds(report.composition.root)
        : [],
    [report.composition],
  );
  const selectedBlock = report.blocks.find(
    (block) => block.id === selectedBlockId,
  );
  const selectedCompositionNode =
    report.composition && selectedBlock
      ? findCompositionBlockNode(report.composition.root, selectedBlock.id)
      : undefined;
  const selectedResolution =
    selectedBlock && selectedCompositionNode
      ? resolveCompositionSlot(
          selectedBlock,
          selectedCompositionNode,
          previewOverride,
        )
      : undefined;
  const selectedStoryId =
    selectedResolution?.kind === "component"
      ? resolveCompositionPreviewStoryId(
          selectedResolution,
          preview.storyIndex,
        )
      : undefined;
  const selectedEvidenceRegion = findInspectorEvidenceRegion(
    selectedBlock,
    request?.images,
  );
  const referenceImages = useMemo<readonly CompositionReferenceImage[]>(
    () =>
      request
        ? request.images
            .filter((name) => !failedReferenceImageNames.includes(name))
            .map((name) => ({
              name,
              url: `${componentCoverageStaticBase}/requests/${request.id}/${name}`,
            }))
        : [],
    [failedReferenceImageNames, request],
  );
  const activeReferenceImage = referenceImages.find(
    (image) => image.name === activeReferenceImageName,
  );
  const reviewEditable = isDevMode && !isReportConfirmed(report);
  const clearCompositionSelection = useCallback(() => {
    setPreviewOverride((current) =>
      updateCompositionPreviewOverride(current, { type: "block-change" }),
    );
    setSelectedBlockId(undefined);

    if (typeof document !== "undefined") {
      const activeElement = document.activeElement;

      if (
        activeElement instanceof HTMLElement &&
        activeElement.matches(".cm-coverage__composition-slot-select")
      ) {
        activeElement.blur();
      }
    }
  }, []);

  useEffect(() => {
    setCompositionCanvasMode("assembled");
    setFailedReferenceImageNames([]);
    setActiveReferenceImageName(request?.images[0] ?? "");
    setSelectedBlockId(undefined);
    setPreviewOverride(undefined);
  }, [request?.id]);

  useEffect(() => {
    if (referenceImages.length === 0) {
      if (compositionCanvasMode === "reference") {
        setCompositionCanvasMode("assembled");
      }
      if (activeReferenceImageName !== "") {
        setActiveReferenceImageName("");
      }
      return;
    }

    if (!activeReferenceImage) {
      setActiveReferenceImageName(referenceImages[0].name);
    }
  }, [
    activeReferenceImage,
    activeReferenceImageName,
    compositionCanvasMode,
    referenceImages,
  ]);

  useEffect(() => {
    if (!report.composition) {
      if (activeMode === "preview") {
        setActiveMode("analysis");
      }
      return;
    }

    if (
      selectedBlockId !== undefined &&
      !compositionBlockIds.includes(selectedBlockId)
    ) {
      setSelectedBlockId(undefined);
      setPreviewOverride(undefined);
    }
  }, [activeMode, compositionBlockIds, report, selectedBlockId]);

  useEffect(() => {
    if (activeMode !== "preview" || selectedBlockId === undefined) {
      return;
    }

    const handleOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (compositionWorkspaceRef.current?.contains(target)) {
        return;
      }

      if (
        target instanceof Element &&
        target.closest("[data-component-coverage-lightbox]")
      ) {
        return;
      }

      clearCompositionSelection();
    };

    document.addEventListener("pointerdown", handleOutsidePointerDown, true);

    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointerDown, true);
    };
  }, [activeMode, clearCompositionSelection, selectedBlockId]);

  const scrollToSection = (section: CoverageSection) => {
    setActiveMode("analysis");
    window.setTimeout(() => {
      sectionRefs.current[section]?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const handleBlockReview = async (
    blockId: string,
    review: CoverageBlockReview,
  ) => {
    const reviews = collectReviews(report);

    reviews[blockId] = review;
    await onReviewSubmit(fileName, { reviews, reviewStatus: "draft" });
  };
  const updatePreviewOverride = (
    event: Parameters<typeof updateCompositionPreviewOverride>[1],
  ) => {
    setPreviewOverride((current) =>
      updateCompositionPreviewOverride(current, event),
    );
  };
  const handleModeTabKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    currentMode: "preview" | "analysis",
  ) => {
    const availableModes: readonly ("preview" | "analysis")[] = report.composition
      ? ["preview", "analysis"]
      : ["analysis"];
    const currentIndex = availableModes.indexOf(currentMode);
    let nextMode: "preview" | "analysis" | undefined;

    if (event.key === "Home") {
      nextMode = availableModes[0];
    } else if (event.key === "End") {
      nextMode = availableModes.at(-1);
    } else if (event.key === "ArrowRight") {
      nextMode = availableModes[(currentIndex + 1) % availableModes.length];
    } else if (event.key === "ArrowLeft") {
      nextMode =
        availableModes[
          (currentIndex - 1 + availableModes.length) % availableModes.length
        ];
    }

    if (!nextMode) {
      return;
    }

    event.preventDefault();
    setActiveMode(nextMode);
    window.requestAnimationFrame(() => modeTabRefs.current[nextMode]?.focus());
  };
  const compositionNoticeId = `coverage-composition-notice-${fileName.replace(
    /[^a-z0-9]+/gi,
    "-",
  )}`;

  return (
    <div className="cm-coverage__report-detail">
      <p className="cm-coverage__report-source">{report.sourceSummary}</p>
      <SummaryStats onNavigate={scrollToSection} summary={report.summary} />
      <ReviewProgress
        editable={isDevMode}
        onSubmit={(payload) => onReviewSubmit(fileName, payload)}
        report={report}
      />
      {compositionIssues && compositionIssues.length > 0 ? (
        <div
          className="cm-coverage__composition-notice cm-coverage__composition-notice--warning"
          id={compositionNoticeId}
          role="status"
        >
          <strong>組裝預覽格式有誤，已保留分析明細與覆核功能。</strong>
          <ul className="cm-coverage__composition-notice-list">
            {compositionIssues.slice(0, 3).map((issue) => (
              <li key={`${issue.path}-${issue.message}`}>
                <code>{issue.path}</code>：{issue.message}
              </li>
            ))}
          </ul>
        </div>
      ) : !report.composition ? (
        <div
          className="cm-coverage__composition-notice"
          id={compositionNoticeId}
          role="status"
        >
          此報告未包含組裝預覽，已顯示分析明細；既有報告不需要遷移。
        </div>
      ) : null}
      <div aria-label="報告檢視模式" className="cm-coverage__mode-tabs" role="tablist">
        <button
          aria-controls={`${compositionNoticeId}-preview-panel`}
          aria-describedby={!report.composition ? compositionNoticeId : undefined}
          aria-selected={activeMode === "preview"}
          className="cm-coverage__mode-tab"
          disabled={!report.composition}
          onClick={() => setActiveMode("preview")}
          onKeyDown={(event) => handleModeTabKeyDown(event, "preview")}
          id={`${compositionNoticeId}-preview-tab`}
          ref={(element) => {
            modeTabRefs.current.preview = element;
          }}
          role="tab"
          tabIndex={activeMode === "preview" ? 0 : -1}
          type="button"
        >
          組裝預覽
        </button>
        <button
          aria-controls={`${compositionNoticeId}-analysis-panel`}
          aria-selected={activeMode === "analysis"}
          className="cm-coverage__mode-tab"
          onClick={() => setActiveMode("analysis")}
          onKeyDown={(event) => handleModeTabKeyDown(event, "analysis")}
          id={`${compositionNoticeId}-analysis-tab`}
          ref={(element) => {
            modeTabRefs.current.analysis = element;
          }}
          role="tab"
          tabIndex={activeMode === "analysis" ? 0 : -1}
          type="button"
        >
          分析明細
        </button>
      </div>
      {activeMode === "preview" && report.composition ? (
        <div
          aria-labelledby={`${compositionNoticeId}-preview-tab`}
          className="cm-coverage__composition-workspace"
          id={`${compositionNoticeId}-preview-panel`}
          ref={compositionWorkspaceRef}
          role="tabpanel"
        >
          <CompositionPreview
            activeReferenceImage={activeReferenceImage}
            blocks={report.blocks}
            canvasMode={compositionCanvasMode}
            composition={report.composition}
            onCanvasModeChange={setCompositionCanvasMode}
            onClearSelection={clearCompositionSelection}
            onReferenceImageError={(name) =>
              setFailedReferenceImageNames((current) =>
                current.includes(name) ? current : [...current, name],
              )
            }
            onReferenceImageSelect={setActiveReferenceImageName}
            onSelectBlock={(blockId) => {
              if (blockId !== selectedBlockId) {
                updatePreviewOverride({ type: "block-change" });
              }
              setSelectedBlockId(blockId);
            }}
            previewOverride={previewOverride}
            referenceImages={referenceImages}
            selectedBlockId={selectedBlockId}
            storyIndex={preview.storyIndex}
          />
          <aside
            aria-label={selectedBlock ? "已選區塊覆核" : "未選取區塊"}
            className="cm-coverage__composition-inspector"
          >
            {selectedBlock ? (
              <>
                <header className="cm-coverage__composition-inspector-header">
                  <span className="cm-coverage__composition-inspector-kicker">
                    已選區塊
                  </span>
                  <h3 className="cm-coverage__composition-inspector-title">
                    {selectedBlock.label}
                  </h3>
                  <span
                    className="cm-coverage__composition-inspector-classification"
                    data-section={classifyCoverageBlock(selectedBlock)}
                  >
                    {sectionCopy[classifyCoverageBlock(selectedBlock)].heading}
                  </span>
                </header>
                <p className="cm-coverage__composition-inspector-evidence">
                  辨識依據：{selectedBlock.evidence}
                </p>
                {selectedEvidenceRegion && request ? (
                  <CroppedEvidence
                    alt={`${selectedBlock.label} 的 UI Reference 原圖裁切`}
                    key={`${selectedBlock.id}:${selectedEvidenceRegion.image}`}
                    label={inspectorEvidenceCopy.label}
                    onOpen={onOpenImage}
                    region={selectedEvidenceRegion}
                    requestId={request.id}
                    unavailableText={inspectorEvidenceCopy.unavailable}
                    variant="inspector"
                  />
                ) : (
                  <figure className="cm-coverage__crop cm-coverage__crop--inspector">
                    <figcaption className="cm-coverage__crop-label">
                      {inspectorEvidenceCopy.label}
                    </figcaption>
                    <p className="cm-coverage__crop-unavailable" role="status">
                      {inspectorEvidenceCopy.unavailable}
                    </p>
                  </figure>
                )}
                {selectedResolution?.kind === "component" ? (
                  <div className="cm-coverage__composition-inspector-component">
                    <span className="cm-coverage__composition-inspector-kicker">
                      目前元件
                    </span>
                    <strong>{selectedResolution.componentName}</strong>
                    <code className="cm-coverage__code">
                      {selectedResolution.componentPath}
                    </code>
                    <a
                      className="cm-coverage__story-link"
                      href={storyManagerUrl(
                        selectedResolution.storyTitle,
                        selectedStoryId,
                      )}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {selectedStoryId ? "另開元件變體" : "另開元件文件"}
                    </a>
                  </div>
                ) : null}
                {selectedBlock.gap.status !== "none" ? (
                  <div className="cm-coverage__composition-inspector-gap">
                    <strong>{selectedBlock.gap.suggestedName}</strong>
                    <span>
                      分類 {selectedBlock.gap.suggestedCategory}・角色{" "}
                      {selectedBlock.gap.suggestedRole}
                    </span>
                    <p>{selectedBlock.gap.rationale}</p>
                  </div>
                ) : null}
                <BlockReviewPanel
                  block={selectedBlock}
                  editable={reviewEditable}
                  key={`${selectedBlock.id}-${selectedBlock.review?.reviewedAt ?? "unreviewed"}`}
                  onCancel={() => updatePreviewOverride({ type: "cancel" })}
                  onDraftOverrideChange={(componentId) =>
                    updatePreviewOverride({
                      blockId: selectedBlock.id,
                      componentId,
                      type: "draft-change",
                    })
                  }
                  onSave={handleBlockReview}
                  onSaveSuccess={() =>
                    updatePreviewOverride({ type: "save-success" })
                  }
                />
                {!reviewEditable && !selectedBlock.review ? (
                  <p className="cm-coverage__composition-inspector-readonly">
                    {isDevMode
                      ? "報告已確認；先還原為草稿才可編輯覆核。"
                      : "唯讀預覽；此區塊尚無已儲存的覆核結果。"}
                  </p>
                ) : null}
              </>
            ) : (
              <div
                className="cm-coverage__composition-inspector-empty"
                role="status"
              >
                <span className="cm-coverage__composition-inspector-kicker">
                  元件 Inspector
                </span>
                <strong>尚未選取任何元件</strong>
                <p className="cm-coverage__composition-inspector-readonly">
                  點擊左側預覽中的元件，以查看辨識依據與覆核選項。
                </p>
              </div>
            )}
          </aside>
        </div>
      ) : (
        <div
          aria-labelledby={`${compositionNoticeId}-preview-tab`}
          hidden
          id={`${compositionNoticeId}-preview-panel`}
          role="tabpanel"
        />
      )}
      {activeMode === "analysis" ? (
        <div
          aria-labelledby={`${compositionNoticeId}-analysis-tab`}
          className="cm-coverage__analysis-panel"
          id={`${compositionNoticeId}-analysis-panel`}
          role="tabpanel"
        >
          {request ? <SourceImages onOpen={onOpenImage} request={request} /> : null}
          {sectionOrder.map((section) => (
            <section
              className="cm-coverage__section"
              key={section}
              ref={(element) => {
                sectionRefs.current[section] = element;
              }}
            >
              <header className="cm-coverage__section-header">
                <h3
                  className={`cm-coverage__section-heading cm-coverage__section-heading--${section}`}
                >
                  {sectionCopy[section].heading}
                  <span className="cm-coverage__section-count">
                    {sections[section].length}
                  </span>
                  <span className="cm-coverage__section-hint">
                    {sectionCopy[section].hint}
                  </span>
                </h3>
              </header>
              {sections[section].length === 0 ? (
                <p className="cm-coverage__section-empty">此分類沒有項目。</p>
              ) : (
                sections[section].map((block) => (
                  <BlockCard
                    block={block}
                    key={block.id}
                    onOpenImage={onOpenImage}
                    onSaveReview={handleBlockReview}
                    preview={preview}
                    requestId={report.requestId}
                    reviewEditable={reviewEditable}
                  />
                ))
              )}
            </section>
          ))}
        </div>
      ) : (
        <div
          aria-labelledby={`${compositionNoticeId}-analysis-tab`}
          hidden
          id={`${compositionNoticeId}-analysis-panel`}
          role="tabpanel"
        />
      )}
      <p className="cm-coverage__report-analyzer">
        分析引擎 {report.analyzer.engine}・比對元件目錄 {report.analyzer.catalogEntryCount} 筆
      </p>
    </div>
  );
}

const deleteConfirmTimeoutMs = 3000;

function DeleteReportControl({
  label,
  onDelete,
  target,
}: {
  label: string;
  onDelete: (target: DeleteTarget) => Promise<void>;
  target: DeleteTarget;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const revertTimerRef = useRef<number>(0);

  useEffect(() => () => window.clearTimeout(revertTimerRef.current), []);

  const handleClick = async () => {
    if (!confirming) {
      setConfirming(true);
      setError("");
      revertTimerRef.current = window.setTimeout(
        () => setConfirming(false),
        deleteConfirmTimeoutMs,
      );
      return;
    }

    window.clearTimeout(revertTimerRef.current);
    setDeleting(true);

    try {
      await onDelete(target);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : String(deleteError),
      );
      setConfirming(false);
      setDeleting(false);
    }
  };

  return (
    <span className="cm-coverage__delete">
      {error ? <span className="cm-coverage__delete-error">{error}</span> : null}
      <button
        aria-label={confirming ? `確認刪除 ${label}` : `刪除 ${label}`}
        className={`cm-coverage__delete-button${confirming ? " cm-coverage__delete-button--confirm" : ""}`}
        disabled={deleting}
        onClick={(event) => {
          event.stopPropagation();
          void handleClick();
        }}
        type="button"
      >
        {confirming ? (
          "確認刪除"
        ) : (
          <svg
            aria-hidden="true"
            fill="none"
            height="14"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            viewBox="0 0 24 24"
            width="14"
          >
            <path d="M3 6h18" />
            <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
          </svg>
        )}
      </button>
    </span>
  );
}

function AnalyzeGuidance({
  note,
  requestId,
  text,
}: {
  note?: string;
  requestId: string;
  text: string;
}) {
  return (
    <div className="cm-coverage__guidance">
      <span className="cm-coverage__guidance-text">{text}</span>
      <CopyTextButton
        label={analysisGuidanceCopy.copyLabel}
        text={buildAnalysisPrompt(requestId)}
      />
      {note ? <span className="cm-coverage__guidance-note">{note}</span> : null}
    </div>
  );
}

function PipelineRowView({
  isDevMode,
  onDelete,
  onSelect,
  row,
  selected,
}: {
  isDevMode: boolean;
  onDelete: (target: DeleteTarget) => Promise<void>;
  onSelect: (fileName: string) => void;
  row: PipelineRow;
  selected: boolean;
}) {
  if (row.kind === "invalid-request") {
    return (
      <div className="cm-coverage__report-item cm-coverage__report-item--invalid">
        <span className="cm-coverage__report-title">{row.id}</span>
        <p className="cm-coverage__report-error">{row.error}</p>
        {isDevMode ? (
          <DeleteReportControl
            label={row.id}
            onDelete={onDelete}
            target={{ requestId: row.id }}
          />
        ) : null}
      </div>
    );
  }

  if (row.kind === "invalid-report") {
    return (
      <div className="cm-coverage__report-item cm-coverage__report-item--invalid">
        <span className="cm-coverage__report-title">{row.fileName}</span>
        <p className="cm-coverage__report-error">
          格式錯誤（{row.error}），請跑 npm run check:coverage-reports。
        </p>
        {isDevMode ? (
          <DeleteReportControl
            label={row.fileName}
            onDelete={onDelete}
            target={{ reportFileName: row.fileName }}
          />
        ) : null}
      </div>
    );
  }

  const report = row.report;
  const reportFileName = row.kind === "request" ? row.reportFileName : row.fileName;
  const request = row.kind === "request" ? row.request : undefined;
  const stage = derivePipelineStage(report, request?.status);
  const title =
    row.kind === "request"
      ? row.request.title || row.request.id
      : row.report.requestId;
  const metaParts =
    row.kind === "request"
      ? [
          row.request.id,
          formatTimestamp(row.request.createdAt),
          `圖片 ${row.request.images.length} 張`,
        ]
      : [row.fileName, formatTimestamp(row.report.createdAt)];
  const expandable = Boolean(report && reportFileName);
  const detailId = reportFileName ? reportDetailDomId(reportFileName) : undefined;
  const deleteTarget: DeleteTarget =
    row.kind === "request"
      ? { reportFileName: row.reportFileName, requestId: row.request.id }
      : { reportFileName: row.fileName };

  const rowBody = (
    <>
      <span className="cm-coverage__report-title">{title}</span>
      <span className="cm-coverage__report-meta">{metaParts.join("・")}</span>
      <span className={`cm-coverage__chip cm-coverage__chip--stage-${stage}`}>
        {stageCopy[stage]}
      </span>
      {report || isDevMode ? (
        <span className="cm-coverage__report-counts">
          {report ? <CoverageBar summary={report.summary} /> : null}
          {isDevMode ? (
            <DeleteReportControl
              label={title}
              onDelete={onDelete}
              target={deleteTarget}
            />
          ) : null}
        </span>
      ) : null}
    </>
  );

  if (!expandable) {
    return (
      <div className="cm-coverage__report-item cm-coverage__report-item--static">
        {rowBody}
        {stage === "pending" ? (
          <AnalyzeGuidance
            note="分析完成後清單會自動更新。"
            requestId={request?.id ?? ""}
            text={analysisGuidanceCopy.pending}
          />
        ) : null}
        {stage === "report-missing" ? (
          <AnalyzeGuidance
            requestId={request?.id ?? ""}
            text={analysisGuidanceCopy.reportMissing}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div
      aria-controls={detailId}
      aria-expanded={selected}
      className={`cm-coverage__report-item${selected ? " cm-coverage__report-item--selected" : ""}`}
      onClick={() => onSelect(reportFileName ?? "")}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(reportFileName ?? "");
        }
      }}
      role="button"
      tabIndex={0}
    >
      {rowBody}
      {selected ? (
        <span className="cm-coverage__chip cm-coverage__report-open-state">
          目前開啟
        </span>
      ) : null}
      <span aria-hidden="true" className="cm-coverage__report-disclosure">
        <svg fill="none" viewBox="0 0 16 16">
          <path
            d="m4 6 4 4 4-4"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
        </svg>
      </span>
    </div>
  );
}

export type ReportViewProps = {
  isDevMode: boolean;
  onDelete: (target: DeleteTarget) => Promise<void>;
  onReviewSubmit: (
    fileName: string,
    payload: CoverageReviewSubmitPayload,
  ) => Promise<void>;
  onSelect: (fileName: string) => void;
  rows: readonly PipelineRow[];
  selectedReport: string;
  storyIndex: ReadonlyMap<string, string>;
};

export function ReportView({
  isDevMode,
  onDelete,
  onReviewSubmit,
  onSelect,
  rows,
  selectedReport,
  storyIndex,
}: ReportViewProps) {
  const [expandedPreview, setExpandedPreview] = useState("");
  const [lightboxSrc, setLightboxSrc] = useState("");
  const preview: PreviewControl = {
    expandedPreview,
    onTogglePreview: (previewKey) =>
      setExpandedPreview((current) => (current === previewKey ? "" : previewKey)),
    storyIndex,
  };

  return (
    <div className="cm-coverage__report-list">
      {rows.map((row) => {
        const report =
          row.kind === "request" || row.kind === "orphan-report"
            ? row.report
            : undefined;
        const reportFileName =
          row.kind === "request"
            ? row.reportFileName
            : row.kind === "orphan-report"
              ? row.fileName
              : undefined;
        const expanded =
          Boolean(reportFileName) && selectedReport === reportFileName;

        return (
          <div
            className="cm-coverage__report-entry"
            data-expanded={expanded ? "true" : "false"}
            key={row.key}
          >
            <PipelineRowView
              isDevMode={isDevMode}
              onDelete={onDelete}
              onSelect={onSelect}
              row={row}
              selected={expanded}
            />
            {report && reportFileName && expanded ? (
              <div
                aria-label={`${report.requestId} 報告內容`}
                className="cm-coverage__report-detail-shell"
                id={reportDetailDomId(reportFileName)}
                role="region"
              >
                <ReportDetail
                  compositionIssues={
                    row.kind === "request" || row.kind === "orphan-report"
                      ? row.compositionIssues
                      : undefined
                  }
                  fileName={reportFileName}
                  isDevMode={isDevMode}
                  onOpenImage={setLightboxSrc}
                  onReviewSubmit={onReviewSubmit}
                  preview={preview}
                  report={report}
                  request={row.kind === "request" ? row.request : undefined}
                />
              </div>
            ) : null}
          </div>
        );
      })}
      {lightboxSrc ? (
        <Lightbox onClose={() => setLightboxSrc("")} src={lightboxSrc} />
      ) : null}
    </div>
  );
}
