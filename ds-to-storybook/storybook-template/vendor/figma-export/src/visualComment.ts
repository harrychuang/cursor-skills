import { toCanvas } from "html-to-image";

export const defaultVisualCommentsApiPath = "/__figma_export_review_comments";
export const defaultVisualCommentsDir = "design-system/figma-export-review";
export const defaultVisualCommentsAuthorStorageKey = "sbfx:review-author";
export const defaultVisualCommentsCaptureSelector = "#storybook-root";

export type VisualCommentOptions = {
  enabled?: boolean;
  apiPath?: string;
  captureSelector?: string;
  authorStorageKey?: string;
};

export type VisualCommentStoryMetadata = {
  id: string;
  title: string;
  name: string;
  url?: string;
  prototypeId?: string;
  routeId?: string;
  stateId?: string;
};

export type VisualCommentPin = { xRatio: number; yRatio: number };

export type VisualCommentViewport = {
  width: number;
  height: number;
  devicePixelRatio: number;
  scrollX: number;
  scrollY: number;
};

export type VisualCommentCapture = {
  dataUrl: string;
  mimeType: "image/webp" | "image/png";
  width: number;
  height: number;
  cssWidth: number;
  cssHeight: number;
};

export type CreateVisualCommentRequest = {
  clientRequestId: string;
  authorName: string;
  body: string;
  story: VisualCommentStoryMetadata;
  pin: VisualCommentPin;
  viewport: VisualCommentViewport;
  capture: VisualCommentCapture;
};

export type VisualCommentCaptureResult = {
  capture: VisualCommentCapture;
  pin: VisualCommentPin;
  viewport: VisualCommentViewport;
};

export type VisualCommentPointSelection = {
  pin: VisualCommentPin;
  viewport: VisualCommentViewport;
};

export type VisualCommentCaptureController = {
  cancel(): void;
};

export const VISUAL_COMMENT_LIMITS = {
  maxRequestBytes: 4 * 1024 * 1024,
  maxImageBytes: 2 * 1024 * 1024,
  maxImageLongestSide: 2048,
  maxImagePixels: 4 * 1024 * 1024,
  maxSessionAssetsBytes: 100 * 1024 * 1024,
  maxTitleLength: 120,
  maxAuthorLength: 80,
  maxBodyLength: 2000,
} as const;

export function clampRatio(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function isFiniteRatio(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function normalizeAuthorName(value: unknown): string {
  const name = typeof value === "string" ? value.trim() : "";
  return name || "Anonymous";
}

export function resolveVisualCommentTarget(
  selector?: string,
  documentRef: Document = document,
): HTMLElement | null {
  const candidates = [selector, defaultVisualCommentsCaptureSelector, "body"]
    .filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index);
  for (const candidate of candidates) {
    const element = documentRef.querySelector<HTMLElement>(candidate);
    if (element) return element;
  }
  return null;
}

export function getVisualCommentPin(
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">,
  clientX: number,
  clientY: number,
): VisualCommentPin {
  return {
    xRatio: clampRatio((clientX - rect.left) / rect.width),
    yRatio: clampRatio((clientY - rect.top) / rect.height),
  };
}

function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read capture."));
    reader.readAsDataURL(blob);
  });
}

function encodeCanvas(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (value) =>
        value ? resolve(value) : reject(new Error("Unable to encode capture.")),
      "image/webp",
      quality,
    ),
  );
}

function isTransparentColor(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === "transparent") return true;
  const functional = normalized.match(/^rgba?\((.*)\)$/);
  if (!functional) return false;
  const channels = functional[1].trim().split(/[\s,\/]+/).filter(Boolean);
  return channels.length >= 4 && Number.parseFloat(channels.at(-1) ?? "1") === 0;
}

function resolveCaptureBackground(target: HTMLElement): string {
  let current: HTMLElement | null = target;
  while (current) {
    const backgroundColor = getComputedStyle(current).backgroundColor;
    if (!isTransparentColor(backgroundColor)) return backgroundColor;
    current = current.parentElement;
  }
  // Browsers composite a transparent document canvas over white by default.
  return "rgb(255 255 255)";
}

export function hasVisibleCanvasPixels(canvas: HTMLCanvasElement): boolean {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Unable to inspect captured UI pixels.");
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let index = 3; index < pixels.length; index += 4) {
    if (pixels[index] !== 0) return true;
  }
  return false;
}

/** Browser capture seam backed by html-to-image; API and storage stay backend-agnostic. */
export async function captureVisualCommentTarget(target: HTMLElement): Promise<VisualCommentCapture> {
  const rect = target.getBoundingClientRect();
  if (!rect.width || !rect.height) throw new Error("Capture target has zero bounds.");

  await nextAnimationFrame();
  await nextAnimationFrame();
  const scale = Math.min(
    2,
    VISUAL_COMMENT_LIMITS.maxImageLongestSide / Math.max(rect.width, rect.height),
    Math.sqrt(VISUAL_COMMENT_LIMITS.maxImagePixels / (rect.width * rect.height)),
  );
  // `canvas.width = width * pixelRatio` truncates the fraction, so a target with a
  // sub-pixel box legitimately lands up to one pixel short of the scaled intent.
  const intendedWidth = Math.max(1, Math.trunc(rect.width * scale));
  const intendedHeight = Math.max(1, Math.trunc(rect.height * scale));
  let canvas = await Promise.race([
    toCanvas(target, {
      backgroundColor: resolveCaptureBackground(target),
      canvasHeight: rect.height,
      canvasWidth: rect.width,
      filter: (node) =>
        !(node instanceof Element && node.hasAttribute("data-sbfx-capture-ignore")),
      fontEmbedCSS: "",
      height: rect.height,
      pixelRatio: scale,
      skipFonts: true,
      skipAutoScale: true,
      width: rect.width,
    }),
    new Promise<never>((_, reject) =>
      window.setTimeout(() => reject(new Error("Timed out rendering captured UI.")), 8_000),
    ),
  ]);
  let width = canvas.width;
  let height = canvas.height;
  if (
    width < 1 ||
    height < 1 ||
    Math.abs(width - intendedWidth) > 1 ||
    Math.abs(height - intendedHeight) > 1
  ) {
    throw new Error(
      `Captured image dimensions are invalid (${width}×${height}; expected ${intendedWidth}×${intendedHeight}).`,
    );
  }
  if (!hasVisibleCanvasPixels(canvas)) {
    throw new Error("Captured image contains no visible pixels. Try again after the UI finishes rendering.");
  }
  try {
    let encoded = await encodeCanvas(canvas, 0.82);
    for (let attempt = 0; encoded.size > VISUAL_COMMENT_LIMITS.maxImageBytes && attempt < 4; attempt += 1) {
      const ratio = Math.min(0.85, Math.sqrt(VISUAL_COMMENT_LIMITS.maxImageBytes / encoded.size) * 0.92);
      width = Math.max(1, Math.floor(width * ratio));
      height = Math.max(1, Math.floor(height * ratio));
      const previous = document.createElement("canvas");
      previous.width = canvas.width;
      previous.height = canvas.height;
      previous.getContext("2d")?.drawImage(canvas, 0, 0);
      canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Unable to resize capture canvas.");
      context.drawImage(previous, 0, 0, width, height);
      encoded = await encodeCanvas(canvas, Math.max(0.5, 0.76 - attempt * 0.08));
    }
    if (encoded.size > VISUAL_COMMENT_LIMITS.maxImageBytes) {
      throw new Error("Captured image exceeds the 2 MiB limit.");
    }
    const mimeType = encoded.type === "image/webp" ? "image/webp" : "image/png";
    const dataUrl = await blobToDataUrl(encoded);
    return { dataUrl, mimeType, width, height, cssWidth: rect.width, cssHeight: rect.height };
  } catch (error) {
    throw error instanceof Error ? error : new Error("Unable to encode captured UI.");
  }
}

/**
 * Arms the next pointer sequence before prototype handlers run. The returned
 * controller is also used by the panel Cancel action and unmount cleanup.
 */
export function beginVisualCommentCapture({
  capture = captureVisualCommentTarget,
  documentRef = document,
  onCancel,
  onCaptured,
  onError,
  onPointSelected,
  selector,
}: {
  capture?: (target: HTMLElement) => Promise<VisualCommentCapture>;
  documentRef?: Document;
  onCancel?: () => void;
  onCaptured(result: VisualCommentCaptureResult): void;
  onError(error: Error): void;
  onPointSelected?: (selection: VisualCommentPointSelection) => void;
  selector?: string;
}): VisualCommentCaptureController {
  let active = true;
  let cancelled = false;
  let pointerStarted = false;
  let cleanupTimer: number | undefined;

  const cleanup = () => {
    if (!active) return;
    active = false;
    if (cleanupTimer !== undefined) window.clearTimeout(cleanupTimer);
    documentRef.removeEventListener("pointerdown", onPointerDown, true);
    documentRef.removeEventListener("pointerup", swallowPointer, true);
    documentRef.removeEventListener("click", onClick, true);
    documentRef.removeEventListener("keydown", onKeyDown, true);
    delete documentRef.documentElement.dataset.sbfxCaptureMode;
  };
  const cancel = () => {
    if (cancelled) return;
    cancelled = true;
    cleanup();
    onCancel?.();
  };
  const swallowPointer = (event: Event) => {
    if (!pointerStarted) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  };
  const onClick = (event: MouseEvent) => {
    if (!pointerStarted) return;
    swallowPointer(event);
    cleanup();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    cancel();
  };
  const onPointerDown = (event: PointerEvent) => {
    const eventTarget = event.target instanceof Element ? event.target : null;
    if (eventTarget?.closest("[data-sbfx-capture-ignore]")) return;
    const target = resolveVisualCommentTarget(selector, documentRef);
    if (!target || !eventTarget || !target.contains(eventTarget)) return;
    pointerStarted = true;
    swallowPointer(event);
    const rect = target.getBoundingClientRect();
    const pin = getVisualCommentPin(rect, event.clientX, event.clientY);
    const view = documentRef.defaultView ?? window;
    const viewport: VisualCommentViewport = {
      width: view.innerWidth,
      height: view.innerHeight,
      devicePixelRatio: view.devicePixelRatio,
      scrollX: view.scrollX,
      scrollY: view.scrollY,
    };
    onPointSelected?.({ pin, viewport });
    void capture(target)
      .then((captured) => {
        if (!cancelled) onCaptured({ capture: captured, pin, viewport });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          onError(error instanceof Error ? error : new Error("Unable to capture UI."));
        }
      })
      .finally(() => {
        if (active) cleanupTimer = window.setTimeout(cleanup, 2_000);
      });
  };

  documentRef.documentElement.dataset.sbfxCaptureMode = "true";
  documentRef.addEventListener("pointerdown", onPointerDown, true);
  documentRef.addEventListener("pointerup", swallowPointer, true);
  documentRef.addEventListener("click", onClick, true);
  documentRef.addEventListener("keydown", onKeyDown, true);
  return { cancel };
}
