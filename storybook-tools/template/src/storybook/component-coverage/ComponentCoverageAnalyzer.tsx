import { useCallback, useEffect, useMemo, useState } from "react";

import {
  deleteCoverageReport,
  deleteCoverageRequest,
  fetchCoverageToolState,
  fetchStoryIndex,
  submitCoverageReview,
  type CoverageToolState,
} from "./coverageApi";
import { IntakeForm } from "./IntakeForm";
import { ReportView, type PipelineRow } from "./ReportView";

import "./component-coverage.css";

const pendingPollIntervalMs = 5000;

const workflowSteps = [
  { hint: "上傳 UI 圖或 PRD", title: "送出請求" },
  { hint: "貼到 Cursor／Claude Code／Codex", title: "執行分析" },
  { hint: "逐區塊決定怎麼做", title: "覆核報告" },
  { hint: "複製指令開始實作", title: "交接實作" },
] as const;

function WorkflowOverview() {
  return (
    <ol className="cca-steps">
      {workflowSteps.map((step, index) => (
        <li className="cca-step" key={step.title}>
          <span aria-hidden="true" className="cca-step-number">
            {index + 1}
          </span>
          <span className="cca-step-body">
            <span className="cca-step-title">{step.title}</span>
            <span className="cca-step-hint">{step.hint}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function rowTimestamp(value: string) {
  const parsed = new Date(value).getTime();

  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Joins requests and reports into pipeline rows: valid requests pair with
 * the first valid report whose requestId matches, leftover valid reports
 * become orphan rows (the normal case in read-only mode), and invalid files
 * become error rows appended after the dated entries.
 */
function buildPipelineRows(state: CoverageToolState): PipelineRow[] {
  const validReports = state.reports.filter(
    (entry): entry is Extract<typeof entry, { kind: "report" }> =>
      entry.kind === "report",
  );
  const pairedFileNames = new Set<string>();
  const datedRows: (PipelineRow & { createdAt: string })[] = [];
  const invalidRows: PipelineRow[] = [];

  for (const entry of state.requests) {
    if (entry.kind === "invalid") {
      invalidRows.push({
        error: entry.error,
        id: entry.id,
        key: `invalid-request-${entry.id}`,
        kind: "invalid-request",
      });
      continue;
    }

    const reportEntry = validReports.find(
      (candidate) =>
        !pairedFileNames.has(candidate.fileName) &&
        candidate.report.requestId === entry.request.id,
    );

    if (reportEntry) {
      pairedFileNames.add(reportEntry.fileName);
    }

    datedRows.push({
      compositionIssues: reportEntry?.compositionIssues,
      createdAt: entry.request.createdAt,
      key: entry.request.id,
      kind: "request",
      report: reportEntry?.report,
      reportFileName: reportEntry?.fileName,
      request: entry.request,
    });
  }

  for (const entry of validReports) {
    if (pairedFileNames.has(entry.fileName)) {
      continue;
    }

    datedRows.push({
      compositionIssues: entry.compositionIssues,
      createdAt: entry.report.createdAt,
      fileName: entry.fileName,
      key: entry.fileName,
      kind: "orphan-report",
      report: entry.report,
    });
  }

  for (const entry of state.reports) {
    if (entry.kind === "invalid") {
      invalidRows.push({
        error: entry.error,
        fileName: entry.fileName,
        key: `invalid-report-${entry.fileName}`,
        kind: "invalid-report",
      });
    }
  }

  datedRows.sort((a, b) => rowTimestamp(b.createdAt) - rowTimestamp(a.createdAt));

  return [...datedRows.map(({ createdAt: _createdAt, ...row }) => row), ...invalidRows];
}

function PanelHeader({
  heading,
  lastUpdated,
  loading,
  onRefresh,
}: {
  heading: string;
  lastUpdated: string;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="cm-coverage__panel-header">
      <h2 className="cca-panel-heading">{heading}</h2>
      <div className="cm-coverage__panel-tools">
        {lastUpdated ? (
          <span className="cm-coverage__updated">最後更新 {lastUpdated}</span>
        ) : null}
        <button
          className="cm-coverage__refresh-button"
          disabled={loading}
          onClick={onRefresh}
          type="button"
        >
          <svg
            aria-hidden="true"
            fill="none"
            height="14"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            width="14"
          >
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v6h-6" />
          </svg>
          重新整理
        </button>
      </div>
    </div>
  );
}

function SkeletonList({ rows }: { rows: number }) {
  return (
    <div aria-hidden="true" className="cm-coverage__skeleton-list">
      {Array.from({ length: rows }, (_, index) => (
        <div className="cm-coverage__skeleton" key={index} />
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="cm-coverage__empty-state">
      <svg
        aria-hidden="true"
        className="cm-coverage__empty-icon"
        fill="none"
        height="18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
        viewBox="0 0 24 24"
        width="18"
      >
        <rect height="16" rx="2" width="20" x="2" y="4" />
        <path d="M2 9h20" />
        <path d="M8 14h5" />
      </svg>
      <span className="cm-coverage__empty-title">{text}</span>
    </div>
  );
}

export function ComponentCoverageAnalyzer() {
  const [toolState, setToolState] = useState<CoverageToolState | null>(null);
  const [storyIndex, setStoryIndex] = useState<Map<string, string>>(new Map());
  const [selectedReport, setSelectedReport] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");

  const refreshState = useCallback(async (background = false) => {
    if (!background) {
      setLoading(true);
    }

    try {
      const next = await fetchCoverageToolState();

      // A background poll only runs while the dev API is up; a sudden
      // "static" result means the fetch failed, so keep current data silently.
      if (background && next.mode !== "dev") {
        return;
      }

      setToolState(next);
      setLastUpdated(new Date().toLocaleTimeString());
    } finally {
      if (!background) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refreshState();
    void fetchStoryIndex().then(setStoryIndex);
  }, [refreshState]);

  const isDevMode = toolState?.mode === "dev";
  const hasPendingRequest =
    toolState?.mode === "dev" &&
    toolState.requests.some(
      (entry) => entry.kind === "request" && entry.request.status === "pending",
    );

  useEffect(() => {
    if (!hasPendingRequest) {
      return;
    }

    const timer = window.setInterval(
      () => void refreshState(true),
      pendingPollIntervalMs,
    );

    return () => window.clearInterval(timer);
  }, [hasPendingRequest, refreshState]);

  const pipelineRows = useMemo(
    () => (toolState ? buildPipelineRows(toolState) : []),
    [toolState],
  );

  return (
    <div className="cca-shell">
      <div className="cca-stack">
        <header className="cca-header">
          <span className="cca-eyebrow">Tools</span>
          <h1 className="cca-title">Component Coverage Analyzer</h1>
          <p className="cca-lead">
            上傳 UI 圖或貼上 PRD，AI 比對元件庫：可直接用、要擴充、要新建。
          </p>
          <WorkflowOverview />
        </header>

        {toolState && !isDevMode ? (
          <div className="cm-coverage__banner" role="status">
            唯讀模式：收件 API 未啟動，可瀏覽報告；表單改為下載請求檔。
          </div>
        ) : null}

        <IntakeForm isDevMode={isDevMode} onSubmitted={() => refreshState()} />

        <section className="cca-panel">
          <PanelHeader
            heading="請求與報告"
            lastUpdated={lastUpdated}
            loading={loading}
            onRefresh={() => void refreshState()}
          />
          {loading || !toolState ? (
            <SkeletonList rows={3} />
          ) : pipelineRows.length === 0 ? (
            <EmptyState text="還沒有請求。用上方表單送出第一筆，分析結果會出現在這裡。" />
          ) : (
            <ReportView
              isDevMode={isDevMode}
              onDelete={async ({ reportFileName, requestId }) => {
                // Delete the report before the request so a partial failure
                // (report gone, request removal fails) degrades the row to the
                // report-missing stage rather than stranding an orphan report.
                // refreshState runs even on failure so a retry sees the pruned
                // target and can finish removing the request.
                try {
                  if (reportFileName) {
                    await deleteCoverageReport(reportFileName);
                  }
                  if (requestId) {
                    await deleteCoverageRequest(requestId);
                  }
                } finally {
                  await refreshState();
                }
              }}
              onReviewSubmit={async (fileName, payload) => {
                await submitCoverageReview(fileName, payload);
                // Keep the expanded report mounted after review saves. A full
                // loading swap collapses the page and can clamp scrollY upward.
                await refreshState(true);
              }}
              onSelect={(fileName) =>
                setSelectedReport((current) => (current === fileName ? "" : fileName))
              }
              rows={pipelineRows}
              selectedReport={selectedReport}
              storyIndex={storyIndex}
            />
          )}
        </section>
      </div>
    </div>
  );
}
