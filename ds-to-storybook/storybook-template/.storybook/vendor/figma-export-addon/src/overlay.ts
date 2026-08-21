import {
  exporterCollapseStorageKey,
  readCollapsePreference,
  writeCollapsePreference,
} from "./collapsePreference";
import { createFigmaExportPayload } from "./domExport";
import {
  collapseDisclosureSvg,
  unfoldMoreDisclosureSvg,
} from "./disclosureIcon";
import {
  isStoryIncludedForFigmaExport,
  resolveFigmaExportAddonOptions,
  type FigmaExportAddonOptions,
  type ResolvedFigmaExportAddonOptions,
} from "./options";
import { createFigmaExportJson, createFigmaPluginCode } from "./pluginCode";
import type { FigmaExportNode, FigmaExportPayload } from "./types";
import { getAddonVersion } from "./version";
import {
  acquireFigmaWorkspaceSlot,
  type FigmaWorkspaceSlotHandle,
} from "./workspace";

// Plain-DOM export overlay. It is mounted on document.body as a side effect of
// the pass-through preview decorator, so it works in every Storybook renderer
// (React, Vue, Svelte, Angular, Web Components) — this module must never
// import react or @storybook/icons.

export type FigmaExportPreviewContext = {
  globals?: Record<string, unknown>;
  id?: string;
  name?: string;
  parameters?: Record<string, unknown>;
  title?: string;
  viewMode?: string;
};

type CopyFormat = "design" | "file" | "json" | "script";
type ExportStatus = "copied" | "copying" | "error" | "idle";

const statusLabels: Record<ExportStatus, string> = {
  copied: "Copied",
  copying: "Exporting",
  error: "Failed",
  idle: "Ready",
};

const actionLabels: Record<CopyFormat, { busy: string; done: string; idle: string }> = {
  design: { busy: "", done: "", idle: "" },
  file: { busy: "Preparing", done: "Downloaded", idle: "Download JSON" },
  json: { busy: "Copying", done: "Copied", idle: "Copy JSON" },
  script: { busy: "Copying", done: "Copied", idle: "Console script" },
};

const svgIcons = {
  check:
    '<svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2.5 7.5 5.5 10.5 11.5 3.5"/></svg>',
  collapse: collapseDisclosureSvg,
  command:
    '<svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M5 5h4v4H5zM5 5H3.5A1.5 1.5 0 1 1 5 3.5V5zm4 0h1.5A1.5 1.5 0 1 0 9 3.5V5zM5 9H3.5A1.5 1.5 0 1 0 5 10.5V9zm4 0h1.5A1.5 1.5 0 1 1 9 10.5V9z"/></svg>',
  copy:
    '<svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><rect x="4.5" y="4.5" width="7" height="7" rx="1"/><path d="M9.5 4.5v-1a1 1 0 0 0-1-1h-5a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h1"/></svg>',
  download:
    '<svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M7 2v7m0 0L4.5 6.5M7 9l2.5-2.5M2.5 11.5h9"/></svg>',
  figma:
    '<svg viewBox="0 0 14 14" width="14" height="14" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M9.2 0H4.803A2.603 2.603 0 003.41 4.802a2.603 2.603 0 000 4.396 2.602 2.602 0 103.998 2.199v-2.51a2.603 2.603 0 103.187-4.085A2.604 2.604 0 009.2 0zM7.407 7a1.793 1.793 0 103.586 0 1.793 1.793 0 00-3.586 0zm-.81 2.603H4.803a1.793 1.793 0 101.794 1.794V9.603zM4.803 4.397h1.794V.81H4.803a1.793 1.793 0 000 3.587zm0 .81a1.793 1.793 0 000 3.586h1.794V5.207H4.803zm4.397-.81H7.407V.81H9.2a1.794 1.794 0 010 3.587z"/></svg>',
  close:
    '<svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3.5 3.5 10.5 10.5M10.5 3.5 3.5 10.5"/></svg>',
  unfoldMore: unfoldMoreDisclosureSvg,
};

function getExportComponentTitle(
  title: string | undefined,
  options: ResolvedFigmaExportAddonOptions,
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

function sanitizeExportFilename(value: string | undefined): string {
  return (
    String(value ?? "storybook-figma-export")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "storybook-figma-export"
  );
}

function downloadTextFile(filename: string, text: string): void {
  const blob = new Blob([text], { type: "application/json" });
  const downloadUrl = window.URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");

  downloadLink.download = filename;
  downloadLink.href = downloadUrl;
  downloadLink.style.display = "none";
  document.body.append(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

function getExporterTime(): number {
  return typeof performance !== "undefined" && performance.now
    ? performance.now()
    : Date.now();
}

function waitForExporterPanelPaint(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.requestAnimationFrame) {
      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(settle);
      });
      // Headless/hidden pages stop producing frames, so a timer settles the
      // race when requestAnimationFrame never fires.
      globalThis.setTimeout(settle, 120);
      return;
    }

    globalThis.setTimeout(resolve, 0);
  });
}

function formatExportDuration(durationMs: number): string {
  if (!Number.isFinite(durationMs) || durationMs < 0) return "0.0s";
  return `${(durationMs / 1000).toFixed(1)}s`;
}

function getTextSizeLabel(text: string): string {
  const bytes = new Blob([text]).size;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeSvgAttribute(value: string): string {
  return escapeXml(value).replace(/"/g, "&quot;");
}

function formatSvgNumber(value: number | undefined): string {
  const numberValue = Number.isFinite(value) ? Number(value) : 0;
  return Number.isInteger(numberValue) ? String(numberValue) : numberValue.toFixed(2);
}

function svgDataUrl(svgText: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
}

function getSvgPaint(value: string | undefined, fallback = "none"): string {
  return value ? escapeSvgAttribute(value) : fallback;
}

function renderSvgImageNode(node: FigmaExportNode, isRoot: boolean): string {
  const { height, width, x, y } = node.styles;
  const transform = isRoot
    ? ""
    : ` transform="translate(${formatSvgNumber(x)} ${formatSvgNumber(y)})"`;

  if (!node.svgText) {
    return "";
  }

  return `<g${transform}><image href="${escapeSvgAttribute(svgDataUrl(node.svgText))}" width="${formatSvgNumber(width)}" height="${formatSvgNumber(height)}" preserveAspectRatio="none"/></g>`;
}

function renderSvgTextNode(node: FigmaExportNode, isRoot: boolean): string {
  const { color, fontFamily, fontSize, fontWeight, height, textAlign, textAlignVertical, width, x, y } = node.styles;
  const transform = isRoot
    ? ""
    : ` transform="translate(${formatSvgNumber(x)} ${formatSvgNumber(y)})"`;
  const resolvedFontSize = fontSize ?? 12;
  const textAnchor =
    textAlign === "center" ? "middle" : textAlign === "right" ? "end" : "start";
  const textX =
    textAnchor === "middle" ? width / 2 : textAnchor === "end" ? width : 0;
  const isCentered = textAlignVertical === "CENTER";
  const textY = isCentered ? height / 2 : resolvedFontSize;
  const baseline = isCentered ? "middle" : "alphabetic";

  return `<text${transform} x="${formatSvgNumber(textX)}" y="${formatSvgNumber(textY)}" fill="${getSvgPaint(color, "#000000")}" font-family="${escapeSvgAttribute(fontFamily ?? "sans-serif")}" font-size="${formatSvgNumber(resolvedFontSize)}" font-weight="${escapeSvgAttribute(String(fontWeight ?? 400))}" text-anchor="${textAnchor}" dominant-baseline="${baseline}">${escapeXml(node.text ?? "")}</text>`;
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
    : ` transform="translate(${formatSvgNumber(x)} ${formatSvgNumber(y)})"`;
  const groupOpacity =
    typeof opacity === "number" && opacity >= 0 && opacity < 1
      ? ` opacity="${formatSvgNumber(opacity)}"`
      : "";
  const hasRect = Boolean(backgroundColor || (borderColor && borderWidth));
  const rect = hasRect
    ? `<rect width="${formatSvgNumber(width)}" height="${formatSvgNumber(height)}" rx="${formatSvgNumber(radius)}" fill="${getSvgPaint(backgroundColor)}"${borderColor && borderWidth ? ` stroke="${getSvgPaint(borderColor)}" stroke-width="${formatSvgNumber(borderWidth)}"` : ""}/>`
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

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${formatSvgNumber(width)}" height="${formatSvgNumber(height)}" viewBox="0 0 ${formatSvgNumber(width)} ${formatSvgNumber(height)}" role="img" aria-label="${escapeSvgAttribute(payload.root.name)}">${renderSvgNode(payload.root, true)}</svg>`;
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

// Fire-and-forget bridge sync: a failed POST must never break the clipboard
// flow, so the result only annotates the status summary.
function syncPayloadToBridge(
  payload: FigmaExportPayload,
  syncUrl: string,
): Promise<"sync failed" | "synced"> {
  try {
    return fetch(syncUrl, {
      body: JSON.stringify(payload),
      headers: { "content-type": "application/json" },
      method: "POST",
    }).then(
      (response) => (response.ok ? "synced" : "sync failed"),
      () => "sync failed",
    );
  } catch {
    return Promise.resolve("sync failed");
  }
}

function resolveExportScope(): { scope: HTMLElement; warning?: string } {
  const root = document.getElementById("storybook-root");
  if (root) return { scope: root };
  return {
    scope: document.body,
    warning: "storybook-root not found; exported from document.body",
  };
}

type OverlayRefs = {
  aside: HTMLElement;
  buttons: Partial<Record<CopyFormat, { icon: HTMLElement; label: Text | null; button: HTMLButtonElement }>>;
  info: HTMLElement;
  statusLabel: Text;
  subtitle: HTMLElement;
  summary: HTMLElement;
  toggle: HTMLButtonElement;
  toggleIcon: HTMLElement;
};

type OverlayState = {
  activeFormat?: CopyFormat;
  context: FigmaExportPreviewContext;
  copiedFormat?: CopyFormat;
  options: ResolvedFigmaExportAddonOptions;
  status: ExportStatus;
  summary: string;
};

let overlayRefs: OverlayRefs | null = null;
let overlayState: OverlayState | null = null;
let overlayWorkspace: FigmaWorkspaceSlotHandle | null = null;
// Collapse preference lives outside overlayState so it survives story changes
// and overlay remounts; null means "not read from storage yet".
let overlayCollapsed: boolean | null = null;

function isOverlayCollapsed(): boolean {
  if (overlayCollapsed === null) {
    overlayCollapsed = readCollapsePreference(exporterCollapseStorageKey);
  }
  return overlayCollapsed;
}

function setOverlayCollapsed(collapsed: boolean): void {
  overlayCollapsed = collapsed;
  writeCollapsePreference(exporterCollapseStorageKey, collapsed);
  renderOverlay();
}

function createIconSpan(icon: string): HTMLElement {
  const span = document.createElement("span");
  span.setAttribute("aria-hidden", "true");
  span.style.display = "inline-flex";
  span.innerHTML = icon;
  return span;
}

function createActionButton(
  format: CopyFormat,
  icon: string,
  className: string,
  ariaLabel?: string,
): { button: HTMLButtonElement; iconSpan: HTMLElement; label: Text | null } {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  if (ariaLabel) {
    button.setAttribute("aria-label", ariaLabel);
    button.title = ariaLabel;
  }

  const iconSpan = createIconSpan(icon);
  button.append(iconSpan);

  let label: Text | null = null;
  if (actionLabels[format].idle) {
    label = document.createTextNode(actionLabels[format].idle);
    button.append(label);
  }

  button.addEventListener("click", () => {
    void handleCopy(format);
  });

  return { button, iconSpan, label };
}

function buildOverlay(): OverlayRefs {
  const aside = document.createElement("aside");
  aside.setAttribute("aria-label", "Figma export");
  aside.className = "sbfx-exporter";
  aside.dataset.status = "idle";
  aside.dataset.version = getAddonVersion();

  const header = document.createElement("header");
  header.className = "sbfx-exporter__header";
  const mark = createIconSpan(svgIcons.figma);
  mark.className = "sbfx-exporter__mark";
  const heading = document.createElement("span");
  heading.className = "sbfx-exporter__heading";
  const title = document.createElement("span");
  title.className = "sbfx-exporter__title";
  const titleLabel = document.createElement("span");
  titleLabel.className = "sbfx-exporter__title-label";
  titleLabel.textContent = "Figma export";
  const versionBadge = document.createElement("span");
  versionBadge.className = "sbfx-exporter__version";
  versionBadge.textContent = `v${getAddonVersion()}`;
  versionBadge.title = `Figma export addon v${getAddonVersion()}`;
  title.append(titleLabel, versionBadge);
  const subtitle = document.createElement("span");
  subtitle.className = "sbfx-exporter__subtitle";
  heading.append(title, subtitle);
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "sbfx-exporter__toggle";
  const toggleIcon = createIconSpan(svgIcons.collapse);
  toggleIcon.classList.add("sbfx-exporter__toggle-icon");
  toggle.append(toggleIcon);
  toggle.addEventListener("click", () => {
    setOverlayCollapsed(!isOverlayCollapsed());
  });
  header.append(mark, heading, toggle);

  const info = document.createElement("div");
  info.className = "sbfx-exporter__info";
  const status = document.createElement("span");
  status.className = "sbfx-exporter__status";
  const statusDot = document.createElement("span");
  statusDot.className = "sbfx-exporter__status-dot";
  statusDot.setAttribute("aria-hidden", "true");
  const statusLabel = document.createTextNode(statusLabels.idle);
  status.append(statusDot, statusLabel);
  const summary = document.createElement("p");
  summary.className = "sbfx-exporter__summary";
  summary.style.display = "none";
  info.append(status, summary);

  const actions = document.createElement("div");
  actions.className = "sbfx-exporter__actions";
  const json = createActionButton("json", svgIcons.copy, "sbfx-exporter__button");
  const file = createActionButton("file", svgIcons.download, "sbfx-exporter__button");
  const script = createActionButton(
    "script",
    svgIcons.command,
    "sbfx-exporter__button sbfx-exporter__button--secondary",
  );
  const design = createActionButton(
    "design",
    svgIcons.figma,
    "sbfx-exporter__button sbfx-exporter__button--secondary sbfx-exporter__button--icon",
    "Copy design to Figma",
  );
  actions.append(json.button, file.button, script.button, design.button);

  aside.append(header, info, actions);

  return {
    aside,
    buttons: {
      design: { button: design.button, icon: design.iconSpan, label: design.label },
      file: { button: file.button, icon: file.iconSpan, label: file.label },
      json: { button: json.button, icon: json.iconSpan, label: json.label },
      script: { button: script.button, icon: script.iconSpan, label: script.label },
    },
    info,
    statusLabel,
    subtitle,
    summary,
    toggle,
    toggleIcon,
  };
}

function renderOverlay(): void {
  if (!overlayRefs || !overlayState) return;

  const { aside, buttons, info, statusLabel, subtitle, summary, toggle, toggleIcon } = overlayRefs;
  const { activeFormat, copiedFormat, options, status } = overlayState;
  const componentTitle = getExportComponentTitle(overlayState.context.title, options);

  aside.dataset.status = status;

  const collapsed = isOverlayCollapsed();
  aside.dataset.collapsed = collapsed ? "true" : "false";
  if (overlayWorkspace?.root.isConnected) {
    overlayWorkspace.root.dataset.exportCollapsed = collapsed ? "true" : "false";
  }
  const toggleLabel = collapsed
    ? "Expand Figma export panel"
    : "Collapse Figma export panel";
  toggle.setAttribute("aria-expanded", String(!collapsed));
  toggle.setAttribute("aria-label", toggleLabel);
  toggle.title = toggleLabel;
  toggleIcon.innerHTML = collapsed ? svgIcons.unfoldMore : svgIcons.collapse;
  toggleIcon.style.display = collapsed ? "none" : "inline-flex";
  subtitle.textContent = componentTitle;
  subtitle.title = componentTitle;
  statusLabel.textContent = statusLabels[status];

  summary.textContent = overlayState.summary;
  summary.title = overlayState.summary;
  summary.style.display = overlayState.summary ? "" : "none";

  let progress = info.querySelector(".sbfx-exporter__progress");
  if (status === "copying" && !progress) {
    progress = document.createElement("span");
    progress.className = "sbfx-exporter__progress";
    progress.setAttribute("aria-hidden", "true");
    info.append(progress);
  } else if (status !== "copying" && progress) {
    progress.remove();
  }

  (Object.keys(buttons) as CopyFormat[]).forEach((format) => {
    const entry = buttons[format];
    if (!entry) return;

    entry.button.disabled = status === "copying";
    const isDone = copiedFormat === format && status === "copied";
    entry.icon.innerHTML = isDone
      ? svgIcons.check
      : format === "json" || format === "file"
        ? format === "file"
          ? svgIcons.download
          : svgIcons.copy
        : format === "script"
          ? svgIcons.command
          : svgIcons.figma;
    if (entry.label) {
      entry.label.textContent =
        activeFormat === format
          ? actionLabels[format].busy
          : isDone
            ? actionLabels[format].done
            : actionLabels[format].idle;
    }
  });
}

function setOverlayStatus(status: ExportStatus, summary?: string): void {
  if (!overlayState) return;
  overlayState.status = status;
  if (summary !== undefined) overlayState.summary = summary;
  renderOverlay();
}

async function handleCopy(format: CopyFormat): Promise<void> {
  if (!overlayState) return;

  const { context, options } = overlayState;
  const componentTitle = getExportComponentTitle(context.title, options);
  const { scope, warning } = resolveExportScope();

  overlayState.activeFormat = format;
  overlayState.copiedFormat = undefined;
  setOverlayStatus(
    "copying",
    format === "design"
      ? "Generating SVG design..."
      : format === "file"
        ? "Preparing export file..."
        : format === "json"
          ? "Generating JSON payload..."
          : "Generating console script...",
  );

  try {
    const startedAt = getExporterTime();

    await waitForExporterPanelPaint();

    const payload = await createFigmaExportPayload({
      componentTitle,
      onProgress: (progress) => {
        if (progress.phase === "preparing") {
          setOverlayStatus("copying", "Preparing story surface...");
          return;
        }

        if (progress.phase === "nodes") {
          setOverlayStatus(
            "copying",
            `Reading ${progress.nodeCount ?? 0} layers from the story...`,
          );
          return;
        }

        setOverlayStatus(
          "copying",
          `Resolving design tokens from ${progress.nodeCount ?? 0} layers...`,
        );
      },
      options,
      scope,
      storyId: context.id ?? "unknown-story",
      storyName: context.name ?? "Story",
      storyTitle: context.title ?? "",
    });
    let exportSizeLabel = "";

    if (format === "design") {
      setOverlayStatus("copying", "Copying SVG design...");
      await waitForExporterPanelPaint();
      const svgText = createFigmaDesignSvg(payload);

      exportSizeLabel = getTextSizeLabel(svgText);
      await copySvgDesign(svgText);
    } else if (format === "file") {
      const exportText = createFigmaExportJson(payload);

      exportSizeLabel = getTextSizeLabel(exportText);
      setOverlayStatus("copying", `Starting ${exportSizeLabel} download...`);
      await waitForExporterPanelPaint();
      downloadTextFile(
        `${sanitizeExportFilename(context.id ?? payload.storyId)}.sbfx.json`,
        exportText,
      );
    } else {
      const exportText =
        format === "json"
          ? createFigmaExportJson(payload)
          : createFigmaPluginCode(payload);
      exportSizeLabel = getTextSizeLabel(exportText);
      setOverlayStatus(
        "copying",
        format === "json"
          ? `Copying ${exportSizeLabel} JSON...`
          : `Copying ${exportSizeLabel} plugin script...`,
      );
      await waitForExporterPanelPaint();

      await copyText(exportText);
    }

    overlayState.copiedFormat = format;
    overlayState.activeFormat = undefined;
    const elapsedLabel = formatExportDuration(getExporterTime() - startedAt);
    const sizeSummary = exportSizeLabel ? ` (${exportSizeLabel})` : "";
    const scopeNote = warning ? ` [${warning}]` : "";
    setOverlayStatus(
      "copied",
      format === "design"
        ? `Visual SVG copied from ${payload.root.name}${sizeSummary} in ${elapsedLabel}.${scopeNote}`
        : format === "file"
          ? `${payload.tokens.length} variables exported from ${payload.root.name}${sizeSummary} in ${elapsedLabel}; .sbfx.json downloaded.${scopeNote}`
          : format === "json"
            ? `${payload.tokens.length} variables exported from ${payload.root.name}${sizeSummary} in ${elapsedLabel}; JSON copied.${scopeNote}`
            : `${payload.tokens.length} variables exported from ${payload.root.name}${sizeSummary} in ${elapsedLabel}; script copied.${scopeNote}`,
    );

    if (options.payloadSyncUrl) {
      const syncedStoryId = payload.storyId;
      void syncPayloadToBridge(payload, options.payloadSyncUrl).then((result) => {
        if (
          !overlayState ||
          overlayState.status !== "copied" ||
          overlayState.context.id !== syncedStoryId
        ) {
          return;
        }
        setOverlayStatus("copied", `${overlayState.summary} [${result}]`);
      });
    }
  } catch (error) {
    overlayState.activeFormat = undefined;
    overlayState.copiedFormat = undefined;
    setOverlayStatus(
      "error",
      error instanceof Error ? error.message : "Export failed.",
    );
  }
}

function unmountOverlay(): void {
  if (overlayRefs) {
    overlayRefs.aside.remove();
    overlayRefs = null;
  }
  if (overlayWorkspace?.root.isConnected) {
    delete overlayWorkspace.root.dataset.exportCollapsed;
  }
  overlayWorkspace?.release();
  overlayWorkspace = null;
  overlayState = null;
}

// When the toolbar is on but the export tools cannot mount, a silent unmount
// looks like a broken addon. The notice explains why the tools are hidden for
// the current story. It is dismissible per story+reason and never blocks the
// story content (small fixed panel in the same corner as the exporter).
type OverlayNoticeReason = "excluded-story" | "not-story-view";

let noticeElement: HTMLElement | null = null;
let mountedNoticeKey: string | null = null;
let dismissedNoticeKey: string | null = null;

function getNoticeMessage(
  reason: OverlayNoticeReason,
  options: ResolvedFigmaExportAddonOptions,
): string {
  if (reason === "not-story-view") {
    return "Figma export overlay is available in Story view only. Open this entry as a story to export it.";
  }

  const prefixes =
    options.storyTitlePrefix === false ? [] : options.storyTitlePrefix;
  const prefixList = prefixes.length ? ` (${prefixes.join(", ")})` : "";
  return `This story is excluded by storyTitlePrefix${prefixList}. Add this story's top-level namespace to storyTitlePrefix, or set it to false to include all stories.`;
}

function unmountNotice(): void {
  if (noticeElement) {
    noticeElement.remove();
    noticeElement = null;
  }
  mountedNoticeKey = null;
}

function syncFigmaExportNotice(
  context: FigmaExportPreviewContext,
  options: ResolvedFigmaExportAddonOptions,
  reason: OverlayNoticeReason,
): void {
  const noticeKey = `${context.id ?? ""}|${reason}`;

  if (dismissedNoticeKey === noticeKey) {
    unmountNotice();
    return;
  }

  if (noticeElement && mountedNoticeKey === noticeKey) {
    if (!noticeElement.isConnected) document.body.append(noticeElement);
    return;
  }

  unmountNotice();

  const aside = document.createElement("aside");
  aside.setAttribute("aria-label", "Figma export status");
  aside.setAttribute("role", "status");
  aside.className = "sbfx-exporter-notice";
  aside.dataset.reason = reason;
  aside.dataset.version = getAddonVersion();

  const mark = createIconSpan(svgIcons.figma);
  mark.className = "sbfx-exporter-notice__mark";

  const body = document.createElement("div");
  body.className = "sbfx-exporter-notice__body";
  const title = document.createElement("span");
  title.className = "sbfx-exporter-notice__title";
  title.textContent = "Figma export";
  const message = document.createElement("p");
  message.className = "sbfx-exporter-notice__message";
  message.textContent = getNoticeMessage(reason, options);
  body.append(title, message);

  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.className = "sbfx-exporter-notice__dismiss";
  dismiss.setAttribute("aria-label", "Dismiss Figma export notice");
  dismiss.title = "Dismiss";
  dismiss.append(createIconSpan(svgIcons.close));
  dismiss.addEventListener("click", () => {
    dismissedNoticeKey = noticeKey;
    unmountNotice();
  });

  aside.append(mark, body, dismiss);
  document.body.append(aside);
  noticeElement = aside;
  mountedNoticeKey = noticeKey;
}

// Decorator side effect: mounts, updates, or removes the overlay for the
// current story context. Safe to call on every story render.
export function syncFigmaExportOverlay(
  context: FigmaExportPreviewContext,
  options?: FigmaExportAddonOptions,
): void {
  if (typeof document === "undefined") return;

  const resolvedOptions = resolveFigmaExportAddonOptions(options);
  const enabled = context.globals?.[resolvedOptions.globalName] === "on";
  const includedStory = isStoryIncludedForFigmaExport(context.title, resolvedOptions);
  const isStoryView = (context.viewMode ?? "story") === "story";

  if (!enabled) {
    unmountOverlay();
    unmountNotice();
    // Toggling the toolbar off and on again re-shows a dismissed notice.
    dismissedNoticeKey = null;
    return;
  }

  if (!isStoryView || !includedStory) {
    unmountOverlay();
    syncFigmaExportNotice(
      context,
      resolvedOptions,
      !isStoryView ? "not-story-view" : "excluded-story",
    );
    return;
  }

  unmountNotice();

  if (!overlayRefs) {
    overlayRefs = buildOverlay();
  }

  const isNewStory = overlayState?.context.id !== context.id;
  overlayState = {
    activeFormat: undefined,
    context,
    copiedFormat: isNewStory ? undefined : overlayState?.copiedFormat,
    options: resolvedOptions,
    status: isNewStory ? "idle" : (overlayState?.status ?? "idle"),
    summary: isNewStory ? "" : (overlayState?.summary ?? ""),
  };

  if (!overlayRefs.aside.isConnected) {
    overlayWorkspace ??= acquireFigmaWorkspaceSlot("export");
    overlayWorkspace.slot.append(overlayRefs.aside);
  }

  renderOverlay();
}
