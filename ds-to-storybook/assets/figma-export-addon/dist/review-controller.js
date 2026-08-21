// src/visualComment.ts
import { toCanvas } from "html-to-image";
var defaultVisualCommentsCaptureSelector = "#storybook-root";
var VISUAL_COMMENT_LIMITS = {
  maxRequestBytes: 4 * 1024 * 1024,
  maxImageBytes: 2 * 1024 * 1024,
  maxImageLongestSide: 2048,
  maxImagePixels: 4 * 1024 * 1024,
  maxSessionAssetsBytes: 100 * 1024 * 1024,
  maxTitleLength: 120,
  maxAuthorLength: 80,
  maxBodyLength: 2e3
};
function clampRatio(value) {
  return Math.min(1, Math.max(0, value));
}
function resolveVisualCommentTarget(selector, documentRef = document) {
  const candidates = [selector, defaultVisualCommentsCaptureSelector, "body"].filter((value, index, values) => Boolean(value) && values.indexOf(value) === index);
  for (const candidate of candidates) {
    const element = documentRef.querySelector(candidate);
    if (element) return element;
  }
  return null;
}
function getVisualCommentPin(rect, clientX, clientY) {
  return {
    xRatio: clampRatio((clientX - rect.left) / rect.width),
    yRatio: clampRatio((clientY - rect.top) / rect.height)
  };
}
function nextAnimationFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read capture."));
    reader.readAsDataURL(blob);
  });
}
function encodeCanvas(canvas, quality) {
  return new Promise(
    (resolve, reject) => canvas.toBlob(
      (value) => value ? resolve(value) : reject(new Error("Unable to encode capture.")),
      "image/webp",
      quality
    )
  );
}
function isTransparentColor(value) {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === "transparent") return true;
  const functional = normalized.match(/^rgba?\((.*)\)$/);
  if (!functional) return false;
  const channels = functional[1].trim().split(/[\s,\/]+/).filter(Boolean);
  return channels.length >= 4 && Number.parseFloat(channels.at(-1) ?? "1") === 0;
}
function resolveCaptureBackground(target) {
  let current = target;
  while (current) {
    const backgroundColor = getComputedStyle(current).backgroundColor;
    if (!isTransparentColor(backgroundColor)) return backgroundColor;
    current = current.parentElement;
  }
  return "rgb(255 255 255)";
}
function hasVisibleCanvasPixels(canvas) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Unable to inspect captured UI pixels.");
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let index = 3; index < pixels.length; index += 4) {
    if (pixels[index] !== 0) return true;
  }
  return false;
}
async function captureVisualCommentTarget(target) {
  const rect = target.getBoundingClientRect();
  if (!rect.width || !rect.height) throw new Error("Capture target has zero bounds.");
  await nextAnimationFrame();
  await nextAnimationFrame();
  const scale = Math.min(
    2,
    VISUAL_COMMENT_LIMITS.maxImageLongestSide / Math.max(rect.width, rect.height),
    Math.sqrt(VISUAL_COMMENT_LIMITS.maxImagePixels / (rect.width * rect.height))
  );
  const intendedWidth = Math.max(1, Math.trunc(rect.width * scale));
  const intendedHeight = Math.max(1, Math.trunc(rect.height * scale));
  let canvas = await Promise.race([
    toCanvas(target, {
      backgroundColor: resolveCaptureBackground(target),
      canvasHeight: rect.height,
      canvasWidth: rect.width,
      filter: (node) => !(node instanceof Element && node.hasAttribute("data-sbfx-capture-ignore")),
      fontEmbedCSS: "",
      height: rect.height,
      pixelRatio: scale,
      skipFonts: true,
      skipAutoScale: true,
      width: rect.width
    }),
    new Promise(
      (_, reject) => window.setTimeout(() => reject(new Error("Timed out rendering captured UI.")), 8e3)
    )
  ]);
  let width = canvas.width;
  let height = canvas.height;
  if (width < 1 || height < 1 || Math.abs(width - intendedWidth) > 1 || Math.abs(height - intendedHeight) > 1) {
    throw new Error(
      `Captured image dimensions are invalid (${width}\xD7${height}; expected ${intendedWidth}\xD7${intendedHeight}).`
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
function beginVisualCommentCapture({
  capture = captureVisualCommentTarget,
  documentRef = document,
  onCancel,
  onCaptured,
  onError,
  onPointSelected,
  selector
}) {
  let active = true;
  let cancelled = false;
  let pointerStarted = false;
  let cleanupTimer;
  const cleanup = () => {
    if (!active) return;
    active = false;
    if (cleanupTimer !== void 0) window.clearTimeout(cleanupTimer);
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
  const swallowPointer = (event) => {
    if (!pointerStarted) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  };
  const onClick = (event) => {
    if (!pointerStarted) return;
    swallowPointer(event);
    cleanup();
  };
  const onKeyDown = (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    cancel();
  };
  const onPointerDown = (event) => {
    const eventTarget = event.target instanceof Element ? event.target : null;
    if (eventTarget?.closest("[data-sbfx-capture-ignore]")) return;
    const target = resolveVisualCommentTarget(selector, documentRef);
    if (!target || !eventTarget || !target.contains(eventTarget)) return;
    pointerStarted = true;
    swallowPointer(event);
    const rect = target.getBoundingClientRect();
    const pin = getVisualCommentPin(rect, event.clientX, event.clientY);
    const view = documentRef.defaultView ?? window;
    const viewport = {
      width: view.innerWidth,
      height: view.innerHeight,
      devicePixelRatio: view.devicePixelRatio,
      scrollX: view.scrollX,
      scrollY: view.scrollY
    };
    onPointSelected?.({ pin, viewport });
    void capture(target).then((captured) => {
      if (!cancelled) onCaptured({ capture: captured, pin, viewport });
    }).catch((error) => {
      if (!cancelled) {
        onError(error instanceof Error ? error : new Error("Unable to capture UI."));
      }
    }).finally(() => {
      if (active) cleanupTimer = window.setTimeout(cleanup, 2e3);
    });
  };
  documentRef.documentElement.dataset.sbfxCaptureMode = "true";
  documentRef.addEventListener("pointerdown", onPointerDown, true);
  documentRef.addEventListener("pointerup", swallowPointer, true);
  documentRef.addEventListener("click", onClick, true);
  documentRef.addEventListener("keydown", onKeyDown, true);
  return { cancel };
}

// src/reviewController.ts
function createReviewStatusController({
  apiPath,
  fetcher = globalThis.fetch
}) {
  return {
    async load(storyId, signal) {
      const payload = await requestJson(
        fetcher,
        `${apiPath}?storyId=${encodeURIComponent(storyId)}`,
        { signal },
        `Review status GET ${apiPath}`
      );
      return payload.entry ?? null;
    },
    async save(storyId, entry) {
      return requestJson(
        fetcher,
        apiPath,
        {
          body: JSON.stringify({ entry, storyId }),
          headers: { "Content-Type": "application/json" },
          method: "PUT"
        },
        `Review status PUT ${apiPath}`
      );
    }
  };
}
function createVisualCommentsController({
  apiPath,
  fetcher = globalThis.fetch
}) {
  return {
    beginCapture(options) {
      return beginVisualCommentCapture(options);
    },
    delete(path) {
      return requestJson(
        fetcher,
        `${apiPath}${path}`,
        { method: "DELETE" },
        `Visual comments DELETE ${apiPath}${path}`
      );
    },
    getOverview(storyId) {
      return requestJson(
        fetcher,
        `${apiPath}?storyId=${encodeURIComponent(storyId)}`,
        void 0,
        `Visual comments GET ${apiPath}`
      );
    },
    patch(path, body) {
      return requestJson(
        fetcher,
        `${apiPath}${path}`,
        {
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
          method: "PATCH"
        },
        `Visual comments PATCH ${apiPath}${path}`
      );
    },
    post(path, body) {
      return requestJson(
        fetcher,
        `${apiPath}${path}`,
        {
          body: body === void 0 ? void 0 : JSON.stringify(body),
          headers: body === void 0 ? void 0 : { "Content-Type": "application/json" },
          method: "POST"
        },
        `Visual comments POST ${apiPath}${path}`
      );
    },
    resolveTarget(selector) {
      return resolveVisualCommentTarget(selector);
    }
  };
}
async function requestJson(fetcher, url, init, operation) {
  const response = await fetcher(url, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      `${operation} returned HTTP ${response.status}${payload.error ? `: ${payload.error}` : "."}`
    );
  }
  return payload;
}
export {
  createReviewStatusController,
  createVisualCommentsController
};
//# sourceMappingURL=review-controller.js.map