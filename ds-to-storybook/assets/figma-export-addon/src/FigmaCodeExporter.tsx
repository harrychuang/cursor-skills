import {
  CheckIcon,
  CommandIcon,
  CopyIcon,
  FigmaIcon,
} from "@storybook/icons";
import type { ReactNode } from "react";
import { useRef, useState } from "react";

import { createFigmaExportPayload } from "./domExport";
import {
  isStoryIncludedForFigmaExport,
  resolveFigmaExportAddonOptions,
  type FigmaExportAddonOptions,
  type FigmaExportReviewStatus,
  type FigmaExportSourceReference,
} from "./options";
import { createFigmaExportJson, createFigmaPluginCode } from "./pluginCode";
import { getParameterUrl } from "./source";

type StorybookContext = {
  globals?: Record<string, unknown>;
  id?: string;
  name?: string;
  parameters?: {
    design?: unknown;
    figma?: unknown;
    figmaExport?: {
      reviewStorageKey?: string;
      sourceReference?: FigmaExportSourceReference | string;
      sourceReferences?: Array<FigmaExportSourceReference | string>;
      sourceUrl?: string;
    };
    figmaSourceUrl?: string;
  };
  title?: string;
};

type FigmaCodeExporterProps = {
  children?: ReactNode;
  context: StorybookContext;
  options?: FigmaExportAddonOptions;
};

type CopyFormat = "json" | "script";
type ExportStatus = "copied" | "copying" | "error" | "idle";

const statusLabels: Record<ExportStatus, string> = {
  copied: "Copied",
  copying: "Exporting",
  error: "Failed",
  idle: "Ready",
};

const reviewStatusLabels: Record<FigmaExportReviewStatus, string> = {
  approved: "Approved",
  exported: "Exported",
  "need-fix": "Need fix",
  "not-reviewed": "Not reviewed",
};

function getExportComponentTitle(
  title: string | undefined,
  options: ReturnType<typeof resolveFigmaExportAddonOptions>,
): string {
  if (!title) return "Component";
  if (options.storyTitlePrefix === false) return title;

  const matchingPrefix = options.storyTitlePrefix.find((prefix) =>
    title.startsWith(prefix),
  );
  return matchingPrefix ? title.slice(matchingPrefix.length) : title;
}

function normalizeSourceReference(
  reference: FigmaExportSourceReference | string | undefined,
  fallbackLabel: string,
): FigmaExportSourceReference | undefined {
  if (!reference) return undefined;
  if (typeof reference === "string") {
    return {
      label: fallbackLabel,
      type: reference.includes("figma.com") ? "figma" : "reference",
      url: reference,
    };
  }
  if (!reference.url) return undefined;
  return {
    ...reference,
    label: reference.label ?? fallbackLabel,
    type: reference.type ?? (reference.url.includes("figma.com") ? "figma" : "reference"),
  };
}

function getDesignParameterReferences(design: unknown): FigmaExportSourceReference[] {
  if (!design) return [];
  const values = Array.isArray(design) ? design : [design];
  return values
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") return undefined;
      const candidate = entry as { name?: string; type?: string; url?: string };
      if (!candidate.url) return undefined;
      return normalizeSourceReference(
        {
          label: candidate.name ?? (candidate.type === "figma" ? "Figma design" : "Design reference"),
          type: candidate.type === "figma" ? "figma" : "reference",
          url: candidate.url,
        },
        `Design reference ${index + 1}`,
      );
    })
    .filter((reference): reference is FigmaExportSourceReference => Boolean(reference));
}

function getSourceReferences(
  context: StorybookContext,
  options: ReturnType<typeof resolveFigmaExportAddonOptions>,
): FigmaExportSourceReference[] {
  const parameterReferences = context.parameters?.figmaExport?.sourceReferences ?? [];
  const singleParameterReference =
    context.parameters?.figmaSourceUrl ??
    getParameterUrl(context.parameters?.figma) ??
    context.parameters?.figmaExport?.sourceReference ??
    context.parameters?.figmaExport?.sourceUrl;
  const normalizedSingle = normalizeSourceReference(singleParameterReference, "Source");

  return [
    ...options.sourceReferences
      .map((reference, index) =>
        normalizeSourceReference(reference, `Configured source ${index + 1}`),
      )
      .filter((reference): reference is FigmaExportSourceReference => Boolean(reference)),
    ...parameterReferences
      .map((reference, index) => normalizeSourceReference(reference, `Source ${index + 1}`))
      .filter((reference): reference is FigmaExportSourceReference => Boolean(reference)),
    ...(normalizedSingle ? [normalizedSingle] : []),
    ...getDesignParameterReferences(context.parameters?.design),
  ];
}

function getReviewStorageKey(
  context: StorybookContext,
  options: ReturnType<typeof resolveFigmaExportAddonOptions>,
): string {
  const namespace = context.parameters?.figmaExport?.reviewStorageKey ?? options.reviewStorageKey;
  return `${namespace}:${context.id ?? context.title ?? context.name ?? "unknown-story"}`;
}

function readReviewStatus(
  context: StorybookContext,
  options: ReturnType<typeof resolveFigmaExportAddonOptions>,
): FigmaExportReviewStatus {
  if (typeof window === "undefined") return "not-reviewed";
  const stored = window.localStorage.getItem(getReviewStorageKey(context, options));
  return options.reviewStatuses.includes(stored as FigmaExportReviewStatus)
    ? (stored as FigmaExportReviewStatus)
    : "not-reviewed";
}

function writeReviewStatus(
  context: StorybookContext,
  options: ReturnType<typeof resolveFigmaExportAddonOptions>,
  nextStatus: FigmaExportReviewStatus,
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getReviewStorageKey(context, options), nextStatus);
}

function openReference(url: string | undefined) {
  if (!url || typeof window === "undefined") return;
  window.open(url, "_blank", "noopener,noreferrer");
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.inset = "0";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error("Clipboard copy failed.");
  }
}

export function FigmaCodeExporter({
  children,
  context,
  options,
}: FigmaCodeExporterProps) {
  const scopeRef = useRef<HTMLDivElement>(null);
  const [activeFormat, setActiveFormat] = useState<CopyFormat | undefined>();
  const [copiedFormat, setCopiedFormat] = useState<CopyFormat | undefined>();
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [summary, setSummary] = useState("");

  const resolvedOptions = resolveFigmaExportAddonOptions(options);
  const enabled = context.globals?.[resolvedOptions.globalName] === "on";
  const includedStory = isStoryIncludedForFigmaExport(context.title, resolvedOptions);
  const componentTitle = getExportComponentTitle(context.title, resolvedOptions);
  const sourceReferences = getSourceReferences(context, resolvedOptions);
  const primarySource = sourceReferences[0];
  const [reviewStatus, setReviewStatus] = useState<FigmaExportReviewStatus>(() =>
    readReviewStatus(context, resolvedOptions),
  );
  const reviewLabel = reviewStatusLabels[reviewStatus] ?? reviewStatus;

  function handleReviewStatusChange(nextStatus: FigmaExportReviewStatus) {
    setReviewStatus(nextStatus);
    writeReviewStatus(context, resolvedOptions, nextStatus);
  }

  async function handleCopy(format: CopyFormat) {
    const scope = scopeRef.current;
    if (!scope) return;

    setActiveFormat(format);
    setCopiedFormat(undefined);
    setStatus("copying");
    setSummary(format === "json" ? "Generating JSON payload..." : "Generating console script...");

    try {
      const payload = await createFigmaExportPayload({
        componentTitle,
        options: resolvedOptions,
        scope,
        storyId: context.id ?? "unknown-story",
        storyName: context.name ?? "Story",
      });
      const exportText =
        format === "json"
          ? createFigmaExportJson(payload)
          : createFigmaPluginCode(payload);
      await copyText(exportText);
      setCopiedFormat(format);
      setStatus("copied");
      setSummary(
        format === "json"
          ? `${payload.tokens.length} variables exported from ${payload.root.name}; JSON copied for importer.`
          : `${payload.tokens.length} variables exported from ${payload.root.name}; script copied for plugin console only.`,
      );
    } catch (error) {
      setStatus("error");
      setCopiedFormat(undefined);
      setSummary(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setActiveFormat(undefined);
    }
  }

  if (!includedStory) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="sbfx-story-scope" ref={scopeRef}>
        {children}
      </div>
      {enabled ? (
        <aside
          aria-label="Figma export"
          className="sbfx-exporter"
          data-status={status}
        >
          <header className="sbfx-exporter__header">
            <span className="sbfx-exporter__mark" aria-hidden="true">
              <FigmaIcon size={14} />
            </span>
            <span className="sbfx-exporter__heading">
              <span className="sbfx-exporter__title">Figma export</span>
              <span className="sbfx-exporter__subtitle" title={componentTitle}>
                {componentTitle}
              </span>
            </span>
          </header>
          <div className="sbfx-exporter__info">
            <span className="sbfx-exporter__status">
              <span className="sbfx-exporter__status-dot" aria-hidden="true" />
              {statusLabels[status]}
            </span>
            {summary ? (
              <p className="sbfx-exporter__summary" title={summary}>
                {summary}
              </p>
            ) : null}
          </div>
          <div className="sbfx-exporter__actions">
            <button
              className="sbfx-exporter__button"
              data-exporting={status === "copying" ? "true" : undefined}
              disabled={status === "copying"}
              onClick={() => {
                void handleCopy("json");
              }}
              type="button"
            >
              {copiedFormat === "json" && status === "copied" ? (
                <CheckIcon size={14} />
              ) : (
                <CopyIcon size={14} />
              )}
              {activeFormat === "json"
                ? "Copying"
                : copiedFormat === "json" && status === "copied"
                  ? "Copied"
                  : "Copy JSON"}
            </button>
            <button
              className="sbfx-exporter__button sbfx-exporter__button--secondary"
              data-exporting={status === "copying" ? "true" : undefined}
              disabled={status === "copying"}
              onClick={() => {
                void handleCopy("script");
              }}
              type="button"
            >
              {copiedFormat === "script" && status === "copied" ? (
                <CheckIcon size={14} />
              ) : (
                <CommandIcon size={14} />
              )}
              {activeFormat === "script"
                ? "Copying"
                : copiedFormat === "script" && status === "copied"
                  ? "Copied"
                  : "Plugin Console Script"}
            </button>
          </div>
        </aside>
      ) : null}
      {enabled ? (
        <aside
          aria-label="Figma source review"
          className="sbfx-exporter sbfx-exporter--source"
          data-review-status={reviewStatus}
        >
          <header className="sbfx-exporter__header">
            <span className="sbfx-exporter__mark" aria-hidden="true">
              <FigmaIcon size={14} />
            </span>
            <span className="sbfx-exporter__heading">
              <span className="sbfx-exporter__title">Source review</span>
              <span
                className="sbfx-exporter__subtitle"
                title={primarySource?.label ?? "No source reference configured"}
              >
                {primarySource?.label ?? "No source reference configured"}
              </span>
            </span>
          </header>
          <div className="sbfx-exporter__actions sbfx-exporter__actions--source">
            <button
              className="sbfx-exporter__button"
              disabled={!primarySource?.url}
              onClick={() => openReference(primarySource?.url)}
              type="button"
            >
              <FigmaIcon size={14} />
              Open source
            </button>
            <button
              className="sbfx-exporter__button sbfx-exporter__button--secondary"
              disabled={!primarySource?.editUrl && !primarySource?.url}
              onClick={() => openReference(primarySource?.editUrl ?? primarySource?.url)}
              type="button"
            >
              <CommandIcon size={14} />
              Edit source
            </button>
          </div>
          <label className="sbfx-exporter__review">
            <span className="sbfx-exporter__review-label">Export review</span>
            <select
              className="sbfx-exporter__select"
              onChange={(event) =>
                handleReviewStatusChange(event.target.value as FigmaExportReviewStatus)
              }
              value={reviewStatus}
            >
              {resolvedOptions.reviewStatuses.map((statusOption) => (
                <option key={statusOption} value={statusOption}>
                  {reviewStatusLabels[statusOption] ?? statusOption}
                </option>
              ))}
            </select>
          </label>
          <p className="sbfx-exporter__summary" title={`Current review status: ${reviewLabel}`}>
            Current review status: {reviewLabel}
          </p>
        </aside>
      ) : null}
    </>
  );
}
