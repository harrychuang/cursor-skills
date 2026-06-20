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
} from "./options";
import { createFigmaExportJson, createFigmaPluginCode } from "./pluginCode";
import type { FigmaExportNode, FigmaExportPayload } from "./types";

type StorybookContext = {
  globals?: Record<string, unknown>;
  id?: string;
  name?: string;
  title?: string;
};

type FigmaCodeExporterProps = {
  children?: ReactNode;
  context: StorybookContext;
  options?: FigmaExportAddonOptions;
};

type CopyFormat = "design" | "json" | "script";
type ExportStatus = "copied" | "copying" | "error" | "idle";

const statusLabels: Record<ExportStatus, string> = {
  copied: "Copied",
  copying: "Exporting",
  error: "Failed",
  idle: "Ready",
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

function exporterEscapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function exporterEscapeSvgAttribute(value: string): string {
  return exporterEscapeXml(value).replace(/"/g, "&quot;");
}

function exporterFormatSvgNumber(value: number | undefined): string {
  const numberValue = Number.isFinite(value) ? Number(value) : 0;
  return Number.isInteger(numberValue) ? String(numberValue) : numberValue.toFixed(2);
}

function exporterSvgDataUrl(svgText: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
}

function exporterGetSvgPaint(value: string | undefined, fallback = "none"): string {
  return value ? exporterEscapeSvgAttribute(value) : fallback;
}

function renderSvgImageNode(node: FigmaExportNode, isRoot: boolean): string {
  const { height, width, x, y } = node.styles;
  const transform = isRoot
    ? ""
    : ` transform="translate(${exporterFormatSvgNumber(x)} ${exporterFormatSvgNumber(y)})"`;

  if (!node.svgText) return "";

  return `<g${transform}><image href="${exporterEscapeSvgAttribute(exporterSvgDataUrl(node.svgText))}" width="${exporterFormatSvgNumber(width)}" height="${exporterFormatSvgNumber(height)}" preserveAspectRatio="none"/></g>`;
}

function renderSvgTextNode(node: FigmaExportNode, isRoot: boolean): string {
  const { color, fontFamily, fontSize, fontWeight, textAlign, width, x, y } = node.styles;
  const transform = isRoot
    ? ""
    : ` transform="translate(${exporterFormatSvgNumber(x)} ${exporterFormatSvgNumber(y)})"`;
  const resolvedFontSize = fontSize ?? 12;
  const textAnchor =
    textAlign === "center" ? "middle" : textAlign === "right" || textAlign === "end" ? "end" : "start";
  const textX =
    textAnchor === "middle" ? width / 2 : textAnchor === "end" ? width : 0;

  return `<text${transform} x="${exporterFormatSvgNumber(textX)}" y="${exporterFormatSvgNumber(resolvedFontSize)}" fill="${exporterGetSvgPaint(color, "#000000")}" font-family="${exporterEscapeSvgAttribute(fontFamily ?? "sans-serif")}" font-size="${exporterFormatSvgNumber(resolvedFontSize)}" font-weight="${exporterEscapeSvgAttribute(String(fontWeight ?? 400))}" text-anchor="${textAnchor}">${exporterEscapeXml(node.text ?? "")}</text>`;
}

function renderSvgFrameNode(node: FigmaExportNode, isRoot: boolean): string {
  const {
    backgroundColor,
    borderColor,
    borderWidth,
    height,
    opacity,
    radius,
    width,
    x,
    y,
  } = node.styles;
  const transform = isRoot
    ? ""
    : ` transform="translate(${exporterFormatSvgNumber(x)} ${exporterFormatSvgNumber(y)})"`;
  const groupOpacity =
    typeof opacity === "number" && opacity >= 0 && opacity < 1
      ? ` opacity="${exporterFormatSvgNumber(opacity)}"`
      : "";
  const hasRect = Boolean(backgroundColor || (borderColor && borderWidth));
  const rect = hasRect
    ? `<rect width="${exporterFormatSvgNumber(width)}" height="${exporterFormatSvgNumber(height)}" rx="${exporterFormatSvgNumber(radius)}" fill="${exporterGetSvgPaint(backgroundColor)}"${borderColor && borderWidth ? ` stroke="${exporterGetSvgPaint(borderColor)}" stroke-width="${exporterFormatSvgNumber(borderWidth)}"` : ""}/>`
    : "";
  const children = node.children.map((child) => renderSvgNode(child)).join("");

  return `<g${transform}${groupOpacity}>${rect}${children}</g>`;
}

function renderSvgNode(node: FigmaExportNode, isRoot = false): string {
  if (node.kind === "text") return renderSvgTextNode(node, isRoot);
  if (node.kind === "image" || node.kind === "svg") {
    return renderSvgImageNode(node, isRoot);
  }
  return renderSvgFrameNode(node, isRoot);
}

function createFigmaDesignSvg(payload: FigmaExportPayload): string {
  const width = Math.max(1, payload.root.styles.width);
  const height = Math.max(1, payload.root.styles.height);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${exporterFormatSvgNumber(width)}" height="${exporterFormatSvgNumber(height)}" viewBox="0 0 ${exporterFormatSvgNumber(width)} ${exporterFormatSvgNumber(height)}" role="img" aria-label="${exporterEscapeSvgAttribute(payload.root.name)}">${renderSvgNode(payload.root, true)}</svg>`;
}

async function copySvgDesign(svgText: string): Promise<void> {
  if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
    const plainText = new Blob([svgText], { type: "text/plain" });
    const htmlText = new Blob([svgText], { type: "text/html" });

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/svg+xml": new Blob([svgText], { type: "image/svg+xml" }),
          "text/html": htmlText,
          "text/plain": plainText,
        }),
      ]);
      return;
    } catch {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": htmlText,
          "text/plain": plainText,
        }),
      ]);
      return;
    }
  }

  await copyText(svgText);
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

  async function handleCopy(format: CopyFormat) {
    const scope = scopeRef.current;
    if (!scope) return;

    setActiveFormat(format);
    setCopiedFormat(undefined);
    setStatus("copying");
    setSummary(
      format === "design"
        ? "Generating SVG design..."
        : format === "json"
          ? "Generating JSON payload..."
          : "Generating console script...",
    );

    try {
      const payload = await createFigmaExportPayload({
        componentTitle,
        options: resolvedOptions,
        scope,
        storyId: context.id ?? "unknown-story",
        storyName: context.name ?? "Story",
        storyTitle: context.title ?? componentTitle,
      });
      if (format === "design") {
        await copySvgDesign(createFigmaDesignSvg(payload));
      } else {
        const exportText =
          format === "json"
            ? createFigmaExportJson(payload)
            : createFigmaPluginCode(payload);
        await copyText(exportText);
      }
      setCopiedFormat(format);
      setStatus("copied");
      setSummary(
        format === "design"
          ? `Visual SVG copied from ${payload.root.name}; paste into Figma for quick review.`
          : format === "json"
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
            <button
              aria-label="Copy design to Figma"
              className="sbfx-exporter__button sbfx-exporter__button--secondary sbfx-exporter__button--icon"
              disabled={status === "copying"}
              onClick={() => {
                void handleCopy("design");
              }}
              title="Copy design to Figma"
              type="button"
            >
              {copiedFormat === "design" && status === "copied" ? (
                <CheckIcon size={14} />
              ) : (
                <FigmaIcon size={14} />
              )}
            </button>
          </div>
        </aside>
      ) : null}
    </>
  );
}
