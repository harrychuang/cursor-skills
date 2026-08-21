import { createElement as h, useEffect, useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";

import {
  createFigmaExportReviewDecorator,
  destroyFigmaReviewWorkspace,
  type FigmaExportReviewProps,
} from "../src/review";
import { syncFigmaExportOverlay } from "../src/overlay";
import {
  beginVisualCommentCapture,
  captureVisualCommentTarget,
  hasVisibleCanvasPixels,
  type VisualCommentCapture,
  type VisualCommentCaptureResult,
} from "../src/visualComment";

const results: Array<{ name: string; passed: boolean; detail?: string }> = [];
const resultElement = document.querySelector<HTMLElement>("#fixture-result")!;
resultElement.dataset.stage = "started";
const canonicalCollapsePath =
  "M3.354.146a.5.5 0 10-.708.708l4 4a.5.5 0 00.708 0l4-4a.5.5 0 00-.708-.708L7 3.793 3.354.146zM6.646 9.146a.5.5 0 01.708 0l4 4a.5.5 0 01-.708.708L7 10.207l-3.646 3.647a.5.5 0 01-.708-.708l4-4z";
const canonicalUnfoldMorePath =
  "M6.646.146a.5.5 0 01.708 0l4 4a.5.5 0 01-.708.708L7 1.207 3.354 4.854a.5.5 0 01-.708-.708l4-4zM3.354 9.146a.5.5 0 10-.708.708l4 4a.5.5 0 00.708 0l4-4a.5.5 0 00-.708-.708L7 12.793 3.354 9.146z";
const canonicalEditPath =
  "M13.854 2.146l-2-2a.5.5 0 00-.708 0l-1.5 1.5-8.995 8.995a.499.499 0 00-.143.268L.012 13.39a.495.495 0 00.135.463.5.5 0 00.462.134l2.482-.496a.495.495 0 00.267-.143l8.995-8.995 1.5-1.5a.5.5 0 000-.708zM12 3.293l.793-.793L11.5 1.207 10.707 2 12 3.293zm-2-.586L1.707 11 3 12.293 11.293 4 10 2.707zM1.137 12.863l.17-.849.679.679-.849.17z";

function FigmaExportReview(props: FigmaExportReviewProps) {
  useLayoutEffect(() => {
    createFigmaExportReviewDecorator(
      {
        storyTitlePrefix: false,
        visualComments: props.visualComments,
      },
      {
        apiPath: props.apiPath,
        autoMarkExported: props.autoMarkExported,
        enabled: props.enabled,
        getComponentTitle: () => props.componentTitle,
        labels: props.labels,
        showNotes: props.showNotes,
        visualComments: props.visualComments,
      },
    )(
      () => null,
      {
        globals: { figmaExport: "on" },
        id: props.storyId,
        name: props.storyName,
        title: props.storyTitle,
        viewMode: props.viewMode,
      },
    );
  });
  useEffect(() => destroyFigmaReviewWorkspace, []);
  return null;
}

function check(name: string, condition: unknown, detail?: string) {
  results.push({ name, passed: Boolean(condition), ...(detail ? { detail } : {}) });
}

function waitFor(test: () => unknown, timeout = 8_000): Promise<void> {
  const started = performance.now();
  return new Promise((resolve, reject) => {
    const poll = () => {
      if (test()) resolve();
      else if (performance.now() - started > timeout) reject(new Error("Timed out waiting for fixture state."));
      else setTimeout(poll, 25);
    };
    poll();
  });
}

function dispatchPointerSequence(target: Element, x: number, y: number) {
  target.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1 }));
  target.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1 }));
  target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, clientX: x, clientY: y }));
}

function fakeCapture(): VisualCommentCapture {
  return {
    dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    mimeType: "image/png",
    width: 1,
    height: 1,
    cssWidth: 400,
    cssHeight: 240,
  };
}

function button(label: string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
    (element) => element.textContent?.trim() === label,
  );
}

function exportReviewPanel(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[aria-label="Figma export review"]');
}

function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype = element instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

async function sampleCapture(capture: VisualCommentCapture, cssX: number, cssY: number) {
  const image = new Image();
  image.src = capture.dataUrl;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = capture.width;
  canvas.height = capture.height;
  const context = canvas.getContext("2d")!;
  context.drawImage(image, 0, 0);
  const x = Math.min(capture.width - 1, Math.round((cssX / capture.cssWidth) * capture.width));
  const y = Math.min(capture.height - 1, Math.round((cssY / capture.cssHeight) * capture.height));
  return context.getImageData(x, y, 1, 1).data;
}

async function captureContainsDarkPixel(capture: VisualCommentCapture) {
  const image = new Image();
  image.src = capture.dataUrl;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = capture.width;
  canvas.height = capture.height;
  const context = canvas.getContext("2d")!;
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index + 3] > 0 && pixels[index] < 80 && pixels[index + 1] < 80 && pixels[index + 2] < 80) {
      return true;
    }
  }
  return false;
}

async function run() {
  resultElement.dataset.stage = "capture-controller";
  const prototypeButton = document.querySelector<HTMLButtonElement>("#prototype-action")!;
  const root = document.querySelector<HTMLElement>("#storybook-root")!;
  const portal = document.querySelector<HTMLElement>("#portal")!;
  let actionCount = 0;
  prototypeButton.addEventListener("click", () => {
    actionCount += 1;
    prototypeButton.dataset.count = String(actionCount);
  });
  prototypeButton.click();
  check("normal prototype action works before capture", actionCount === 1);

  let captured: VisualCommentCaptureResult | null = null;
  let resolveCaptured!: () => void;
  const capturedPromise = new Promise<void>((resolve) => {
    resolveCaptured = resolve;
  });
  const pointController = beginVisualCommentCapture({
    capture: async () => fakeCapture(),
    onCaptured: (value) => {
      captured = value;
      resultElement.dataset.stage = "point-captured";
      resolveCaptured();
    },
    onError: (error) => {
      throw error;
    },
    selector: "#storybook-root",
  });
  dispatchPointerSequence(prototypeButton, 100, 64);
  await capturedPromise;
  pointController.cancel();
  check("capture phase blocks prototype click", actionCount === 1);
  check("capture preserves pre-action modal state", root.dataset.prototypeState === "modal-open");
  check("pin x is normalized", Math.abs(captured!.pin.xRatio - 0.25) < 0.01);
  check("pin y is normalized", Math.abs(captured!.pin.yRatio - 64 / 240) < 0.01);
  check("pin remains aligned after resize", Math.abs(captured!.pin.xRatio * 200 - 50) < 0.01);

  resultElement.dataset.stage = "escape-test";
  let cancelCount = 0;
  let cancelledCaptureCount = 0;
  const bodyController = beginVisualCommentCapture({
    capture: async () => {
      cancelledCaptureCount += 1;
      return fakeCapture();
    },
    onCancel: () => {
      cancelCount += 1;
    },
    onCaptured: () => undefined,
    onError: () => undefined,
  });
  document.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Escape" }));
  dispatchPointerSequence(prototypeButton, 100, 64);
  check("Escape cancels capture mode", cancelCount === 1 && cancelledCaptureCount === 0);

  let resolveDelayedCapture!: (capture: VisualCommentCapture) => void;
  let delayedComposerCount = 0;
  let delayedPoint: { xRatio: number; yRatio: number } | null = null;
  const delayedController = beginVisualCommentCapture({
    capture: () =>
      new Promise<VisualCommentCapture>((resolve) => {
        resolveDelayedCapture = resolve;
      }),
    onCancel: () => undefined,
    onCaptured: () => {
      delayedComposerCount += 1;
    },
    onError: () => undefined,
    onPointSelected: ({ pin }) => {
      delayedPoint = pin;
    },
  });
  dispatchPointerSequence(prototypeButton, 100, 64);
  check(
    "point callback runs before delayed capture settles",
    delayedPoint !== null && delayedComposerCount === 0,
  );
  delayedController.cancel();
  resolveDelayedCapture(fakeCapture());
  await Promise.resolve();
  await Promise.resolve();
  check("Cancel during encoding never opens composer", delayedComposerCount === 0);

  resultElement.dataset.stage = "ignore-test";
  let ignoreCaptures = 0;
  const ignoreController = beginVisualCommentCapture({
    capture: async () => {
      ignoreCaptures += 1;
      return fakeCapture();
    },
    onCaptured: () => undefined,
    onError: () => undefined,
  });
  dispatchPointerSequence(document.querySelector("#ignored-chrome")!, 380, 220);
  ignoreController.cancel();
  check("capture ignore chrome does not select a point", ignoreCaptures === 0);

  resultElement.dataset.stage = "body-test";
  let bodyTarget = false;
  let resolveBodyCapture!: () => void;
  const bodyCapturePromise = new Promise<void>((resolve) => {
    resolveBodyCapture = resolve;
  });
  beginVisualCommentCapture({
    capture: async (target) => {
      bodyTarget = target === document.body;
      resolveBodyCapture();
      return fakeCapture();
    },
    onCaptured: () => undefined,
    onError: () => undefined,
    selector: "body",
  });
  dispatchPointerSequence(portal, 20, 270);
  await bodyCapturePromise;
  bodyController.cancel();
  check("body selector includes portal content", bodyTarget);

  resultElement.dataset.stage = "bitmap-start";
  const cleanCapture = await captureVisualCommentTarget(root);
  resultElement.dataset.stage = "bitmap-captured";
  const backgroundPixel = await sampleCapture(cleanCapture, 10, 10);
  const modalPixel = await sampleCapture(cleanCapture, 100, 120);
  const ignoredPixel = await sampleCapture(cleanCapture, 380, 220);
  check(
    "captured bitmap contains resolved page background",
    backgroundPixel[3] > 0 && backgroundPixel[0] > 230 && backgroundPixel[1] > 230,
    Array.from(backgroundPixel).join(","),
  );
  check(
    "captured bitmap contains rendered UI content",
    modalPixel[3] > 0 && modalPixel[2] > modalPixel[0] && modalPixel[2] > modalPixel[1],
    Array.from(modalPixel).join(","),
  );
  check("captured bitmap contains contrasting border or text pixels", await captureContainsDarkPixel(cleanCapture));
  check(
    "captured bitmap excludes addon chrome",
    !(ignoredPixel[0] > 220 && ignoredPixel[1] < 80 && ignoredPixel[2] < 80),
    Array.from(ignoredPixel).join(","),
  );
  check("capture respects longest side", Math.max(cleanCapture.width, cleanCapture.height) <= 2048);
  check("capture respects 4MP", cleanCapture.width * cleanCapture.height <= 4 * 1024 * 1024);
  check("capture respects 2MiB", atob(cleanCapture.dataUrl.split(",")[1]).length <= 2 * 1024 * 1024);

  const transparentCanvas = document.createElement("canvas");
  transparentCanvas.width = 2;
  transparentCanvas.height = 2;
  check("all-transparent canvas is rejected", !hasVisibleCanvasPixels(transparentCanvas));

  let zeroError = "";
  await captureVisualCommentTarget(document.querySelector<HTMLElement>("#zero")!).catch((error: Error) => {
    zeroError = error.message;
  });
  check("zero-size target fails without composer", /zero bounds/i.test(zeroError));

  let activeSession: VisualCommentOverview["activeSession"] = null;
  let statusAvailable = true;
  let commentsAvailable = true;
  let failNextCommentPatch = false;
  const comments: Array<Record<string, unknown>> = [];
  const requests: Array<{ method: string; path: string; body?: unknown }> = [];
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = new URL(String(input), location.href);
    if (url.pathname === "/status") {
      if (!statusAvailable) return new Response("not found", { status: 404 });
      return new Response(JSON.stringify({ entry: null }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (url.pathname.startsWith("/__comments")) {
      const path = url.pathname.slice("/__comments".length);
      const method = init?.method ?? "GET";
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      requests.push({ method, path, ...(body ? { body } : {}) });
      if (!commentsAvailable) return new Response("not found", { status: 404 });
      if (method === "POST" && path === "/sessions") {
        activeSession = { id: "meeting-1", title: body.title, startedAt: new Date().toISOString(), closedAt: null, captureCount: 0, commentCount: 0 };
        return new Response(JSON.stringify({ meeting: { session: activeSession }, reportStale: false }), { status: 201 });
      }
      if (method === "POST" && path.endsWith("/comments")) {
        const savedComment = {
          id: "comment-current-4",
          ...body,
          createdAt: "2026-07-20T00:00:04.000Z",
        };
        comments.push(
          {
            id: "comment-current-1",
            authorName: "Ari",
            body: "Oldest current-story comment",
            createdAt: "2026-07-20T00:00:01.000Z",
            story: { id: "demo--story" },
          },
          {
            id: "comment-current-2",
            authorName: "Bo",
            body: "Middle current-story comment",
            createdAt: "2026-07-20T00:00:02.000Z",
            resolvedAt: "2026-07-20T00:30:00.000Z",
            story: { id: "demo--story" },
          },
          {
            id: "comment-current-3",
            authorName: "Cy",
            body: "Recent current-story comment",
            createdAt: "2026-07-20T00:00:03.000Z",
            story: { id: "demo--story" },
          },
          {
            id: "comment-other-story",
            authorName: "Dee",
            body: "Newest but belongs to another story",
            createdAt: "2026-07-20T00:00:05.000Z",
            story: { id: "demo--other" },
          },
          savedComment,
        );
        if (activeSession) {
          activeSession = {
            ...activeSession,
            captureCount: 1,
            commentCount: 5,
          };
        }
        return new Response(JSON.stringify({ comment: savedComment, reportStale: false }), { status: 201 });
      }
      const commentMatch = path.match(/^\/sessions\/meeting-1\/comments\/([^/]+)$/);
      if (commentMatch && method === "PATCH") {
        const comment = comments.find((entry) => entry.id === decodeURIComponent(commentMatch[1]));
        if (!comment) return new Response(JSON.stringify({ error: "Comment not found." }), { status: 404 });
        if (failNextCommentPatch) {
          failNextCommentPatch = false;
          return new Response(JSON.stringify({ error: "Temporary comment update failure." }), { status: 500 });
        }
        const keys = body && typeof body === "object" ? Object.keys(body) : [];
        const pin = body?.pin;
        if (
          !body ||
          keys.length < 1 ||
          keys.length > 2 ||
          keys.some((key) => key !== "body" && key !== "pin") ||
          ("body" in body &&
            (typeof body.body !== "string" ||
              !body.body.trim() ||
              body.body.trim().length > 2_000)) ||
          ("pin" in body &&
            (!pin ||
              typeof pin.xRatio !== "number" ||
              !Number.isFinite(pin.xRatio) ||
              pin.xRatio < 0 ||
              pin.xRatio > 1 ||
              typeof pin.yRatio !== "number" ||
              !Number.isFinite(pin.yRatio) ||
              pin.yRatio < 0 ||
              pin.yRatio > 1))
        ) {
          return new Response(JSON.stringify({ error: "Comment edit is invalid." }), { status: 400 });
        }
        if (typeof body.body === "string") comment.body = body.body.trim();
        if (pin) comment.pin = { xRatio: pin.xRatio, yRatio: pin.yRatio };
        return new Response(JSON.stringify({ comment, reportStale: false }), { status: 200 });
      }
      if (commentMatch && method === "DELETE") {
        const commentId = decodeURIComponent(commentMatch[1]);
        const commentIndex = comments.findIndex((entry) => entry.id === commentId);
        if (commentIndex < 0) return new Response(JSON.stringify({ error: "Comment not found." }), { status: 404 });
        comments.splice(commentIndex, 1);
        if (activeSession) {
          activeSession = {
            ...activeSession,
            commentCount: Math.max(0, activeSession.commentCount - 1),
          };
        }
        return new Response(JSON.stringify({ deletedCommentId: commentId, reportStale: false }), { status: 200 });
      }
      if (method === "POST" && path.endsWith("/close")) activeSession = null;
      const requestedStoryId = url.searchParams.get("storyId");
      const storyComments = requestedStoryId
        ? comments.filter(
            (comment) =>
              (comment.story as { id?: string } | undefined)?.id === requestedStoryId,
          )
        : comments;
      const overviewComments = storyComments.map((comment) => {
        const ordinal = comments.indexOf(comment) + 1;
        const pin =
          (comment.pin as { xRatio: number; yRatio: number } | undefined) ??
          { xRatio: 0.15 + ordinal * 0.1, yRatio: 0.2 + ordinal * 0.08 };
        return {
          ...comment,
          ordinal,
          preview:
            comment.id === "comment-current-1"
              ? null
              : {
                  imageUrl:
                    comment.id === "comment-current-3"
                      ? "/missing-comment-evidence.png"
                      : fakeCapture().dataUrl,
                  width: 400,
                  height: 240,
                  pin,
                },
        };
      });
      return new Response(
        JSON.stringify({
          activeSession,
          activeReportUrl: activeSession ? "/__comments/reports/sessions/meeting-1/index.html" : null,
          comments: activeSession ? overviewComments : [],
          recentSessions: [{
            id: "meeting-closed",
            title: "Previous review",
            startedAt: "2026-07-19T08:00:00.000Z",
            closedAt: "2026-07-19T09:00:00.000Z",
            captureCount: 1,
            commentCount: 1,
          }],
          reportUrl: "/__comments/reports",
          version: 1,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    return originalFetch(input, init);
  };

  const mount = createRoot(document.querySelector("#review-mount")!);
  syncFigmaExportOverlay(
    {
      globals: { figmaExport: "on" },
      id: "demo--story",
      name: "Story",
      title: "Demo",
      viewMode: "story",
    },
    { storyTitlePrefix: false },
  );
  const workspaceBeforeRerender = document.querySelector<HTMLElement>(
    "[data-sbfx-workspace]",
  );
  syncFigmaExportOverlay(
    {
      globals: { figmaExport: "on" },
      id: "demo--story",
      name: "Story",
      title: "Demo",
      viewMode: "story",
    },
    { storyTitlePrefix: false },
  );
  resultElement.dataset.stage = "review-mounted";
  mount.render(
    h(FigmaExportReview, {
      apiPath: "/status",
      componentTitle: "Button",
      enabled: true,
      showNotes: false,
      storyId: "demo--story",
      storyName: "Story",
      storyTitle: "Demo",
      storyUrl: location.href,
      viewMode: "story",
      visualComments: { apiPath: "/__comments", captureSelector: "#storybook-root" },
    }),
  );
  await waitFor(() => document.querySelector(".sbfx-comments-panel"));
  let commentsPanel = document.querySelector<HTMLElement>(".sbfx-comments-panel")!;
  let commentsToggle = commentsPanel.querySelector<HTMLButtonElement>(
    ".sbfx-comments-panel__toggle",
  )!;
  let commentsDetail = commentsPanel.querySelector<HTMLElement>(
    ".sbfx-comments-panel__detail",
  )!;
  const collapsedCommentsRect = commentsPanel.getBoundingClientRect();
  const collapsedToggleRect = commentsToggle.getBoundingClientRect();
  const collapsedEditIconRect = commentsToggle
    .querySelector<SVGElement>("svg")
    ?.getBoundingClientRect();
  const expectedOffset = window.innerWidth <= 720 ? 16 : 24;
  check(
    "visual comments defaults to one top-right Edit icon launcher",
    commentsPanel.dataset.expanded === "false" &&
      commentsToggle.getAttribute("aria-expanded") === "false" &&
      commentsToggle.getAttribute("aria-label") === "Open comments" &&
      commentsToggle.getAttribute("aria-controls") === commentsDetail.id &&
      commentsDetail.hidden &&
      commentsToggle.querySelector("path")?.getAttribute("d") === canonicalEditPath &&
      Math.abs(collapsedCommentsRect.top - expectedOffset) <= 1 &&
      Math.abs(collapsedCommentsRect.right - (window.innerWidth - expectedOffset)) <= 1,
  );
  check(
    "collapsed Edit launcher centers the button and icon in its surface",
    Boolean(
      collapsedEditIconRect &&
        Math.abs(collapsedCommentsRect.width - 36) <= 0.5 &&
        Math.abs(collapsedCommentsRect.height - 36) <= 0.5 &&
        Math.abs(collapsedToggleRect.left - collapsedCommentsRect.left) <= 0.5 &&
        Math.abs(collapsedToggleRect.top - collapsedCommentsRect.top) <= 0.5 &&
        Math.abs(collapsedToggleRect.right - collapsedCommentsRect.right) <= 0.5 &&
        Math.abs(collapsedToggleRect.bottom - collapsedCommentsRect.bottom) <= 0.5 &&
        Math.abs(
          collapsedToggleRect.left + collapsedToggleRect.width / 2 -
            (collapsedEditIconRect.left + collapsedEditIconRect.width / 2),
        ) <= 0.5 &&
        Math.abs(
          collapsedToggleRect.top + collapsedToggleRect.height / 2 -
            (collapsedEditIconRect.top + collapsedEditIconRect.height / 2),
        ) <= 0.5
    ),
    JSON.stringify({
      collapsedCommentsRect,
      collapsedEditIconRect,
      collapsedToggleRect,
    }),
  );
  check(
    "visual comments is independent from the export review workspace slot",
    !document.querySelector('[data-sbfx-workspace-slot="review"] .sbfx-review__visual-comments') &&
      !commentsPanel.closest("[data-sbfx-workspace]"),
  );
  commentsToggle.click();
  await waitFor(
    () =>
      commentsPanel.querySelector(".sbfx-review__visual-comments")?.getAttribute(
        "data-comments-capability",
      ) === "available" &&
      !button("Start meeting")?.disabled &&
      commentsPanel.querySelectorAll(".sbfx-review__report-link").length === 1,
  );
  resultElement.dataset.stage = "review-loaded";
  const workspace = document.querySelector<HTMLElement>("[data-sbfx-workspace]")!;
  const workspaceRect = workspace.getBoundingClientRect();
  const commentsRect = commentsPanel.getBoundingClientRect();
  const storyRect = root.getBoundingClientRect();
  const expectedOrientation = window.innerWidth <= 720 ? "bottom" : "side";
  check(
    "Edit launcher expands the comments detail accessibly",
    commentsPanel.dataset.expanded === "true" &&
      commentsToggle.getAttribute("aria-expanded") === "true" &&
      commentsToggle.getAttribute("aria-label") === "Close comments" &&
      !commentsDetail.hidden &&
      document.documentElement.dataset.sbfxCommentsOpen === "true",
  );
  const commentsHeader = commentsPanel.querySelector<HTMLElement>(
    ".sbfx-comments-panel__header",
  );
  const commentsHeaderCopy = commentsPanel.querySelector<HTMLElement>(
    ".sbfx-comments-panel__header-copy",
  );
  const commentsSubheading = commentsPanel.querySelector<HTMLElement>(
    ".sbfx-comments-panel__subheading",
  );
  const reportsButton = commentsPanel.querySelector<HTMLAnchorElement>(
    ".sbfx-comments-panel__reports",
  );
  const commentsHeaderRect = commentsHeader?.getBoundingClientRect();
  const commentsHeaderCopyRect = commentsHeaderCopy?.getBoundingClientRect();
  const commentsSubheadingRect = commentsSubheading?.getBoundingClientRect();
  const reportsButtonRect = reportsButton?.getBoundingClientRect();
  const expandedToggleRect = commentsToggle.getBoundingClientRect();
  const reportsButtonStyle = reportsButton ? getComputedStyle(reportsButton) : null;
  check(
    "expanded comments header stacks subheading and outline Reports beside Edit",
    Boolean(
      commentsHeaderRect &&
        commentsHeaderCopyRect &&
        commentsSubheadingRect &&
        reportsButtonRect &&
        reportsButtonStyle &&
        commentsSubheading?.textContent?.trim() === "Visual comments" &&
        reportsButton?.textContent?.trim() === "Reports" &&
        commentsSubheadingRect.top < reportsButtonRect.top &&
        Math.abs(commentsSubheadingRect.left - reportsButtonRect.left) <= 1 &&
        reportsButtonRect.width < commentsHeaderCopyRect.width &&
        reportsButtonRect.height < 32 &&
        reportsButtonStyle.justifySelf === "start" &&
        expandedToggleRect.left >= Math.max(commentsSubheadingRect.right, reportsButtonRect.right) &&
        expandedToggleRect.top >= commentsHeaderRect.top - 1 &&
        expandedToggleRect.bottom <= commentsHeaderRect.bottom + 1 &&
        reportsButtonStyle.borderTopStyle === "solid" &&
        Number.parseFloat(reportsButtonStyle.borderTopWidth) >= 1,
    ),
    JSON.stringify({
      commentsHeaderRect,
      commentsHeaderCopyRect,
      commentsSubheadingRect,
      expandedToggleRect,
      reportsButtonRect,
      reportsButtonStyle: reportsButtonStyle
        ? {
            backgroundColor: reportsButtonStyle.backgroundColor,
            borderTopStyle: reportsButtonStyle.borderTopStyle,
            borderTopWidth: reportsButtonStyle.borderTopWidth,
            justifySelf: reportsButtonStyle.justifySelf,
          }
        : null,
    }),
  );
  check(
    "workspace has one idempotent root",
    document.querySelectorAll("[data-sbfx-workspace]").length === 1 &&
      workspace === workspaceBeforeRerender,
  );
  check(
    "workspace contains review and export slots",
    Boolean(
      workspace.querySelector('[data-sbfx-workspace-slot="review"] .sbfx-review') &&
        workspace.querySelector('[data-sbfx-workspace-slot="export"] .sbfx-exporter'),
    ),
  );
  check(
    "workspace exposes one visible version label on Figma export only",
    workspace.querySelectorAll(".sbfx-exporter__version").length === 1 &&
      !workspace.querySelector(".sbfx-review__version"),
  );
  const initialSlots = Array.from(
    workspace.querySelectorAll<HTMLElement>(":scope > [data-sbfx-workspace-slot]"),
  );
  const initialExporterRect = workspace
    .querySelector<HTMLElement>('.sbfx-exporter[aria-label="Figma export"]')
    ?.getBoundingClientRect();
  const initialReviewRect = workspace
    .querySelector<HTMLElement>('.sbfx-review[aria-label="Figma export review"]')
    ?.getBoundingClientRect();
  check(
    "workspace keeps export before review in DOM order",
    initialSlots.length === 2 &&
      initialSlots[0]?.dataset.sbfxWorkspaceSlot === "export" &&
      initialSlots[1]?.dataset.sbfxWorkspaceSlot === "review",
  );
  check(
    "Figma export is visually above Export review",
    Boolean(
      initialExporterRect &&
        initialReviewRect &&
        initialExporterRect.top < initialReviewRect.top,
    ),
  );
  const reviewIcon = workspace.querySelector<SVGElement>(".sbfx-review__mark svg");
  const reviewIconPaths = Array.from(reviewIcon?.querySelectorAll("path") ?? []).map(
    (path) => path.getAttribute("d"),
  );
  check(
    "Export review uses the Storybook Eye icon",
    reviewIcon?.getAttribute("viewBox") === "0 0 14 14" &&
      reviewIconPaths.length === 2 &&
      reviewIconPaths[0] === "M7 9.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" &&
      reviewIconPaths[1] === "M14 7l-.21.293C13.669 7.465 10.739 11.5 7 11.5S.332 7.465.21 7.293L0 7l.21-.293C.331 6.536 3.261 2.5 7 2.5s6.668 4.036 6.79 4.207L14 7zM2.896 5.302A12.725 12.725 0 001.245 7c.296.37.874 1.04 1.65 1.698C4.043 9.67 5.482 10.5 7 10.5c1.518 0 2.958-.83 4.104-1.802A12.72 12.72 0 0012.755 7c-.297-.37-.875-1.04-1.65-1.698C9.957 4.33 8.517 3.5 7 3.5c-1.519 0-2.958.83-4.104 1.802z" &&
      reviewIcon.closest(".sbfx-review__mark")?.getAttribute("aria-hidden") === "true",
  );
  const initialReviewToggle = workspace.querySelector<HTMLButtonElement>(".sbfx-review__toggle");
  const initialExportToggle = workspace.querySelector<HTMLButtonElement>(".sbfx-exporter__toggle");
  check(
    "expanded review and export use matching inward Collapse icons",
    initialReviewToggle?.getAttribute("aria-expanded") === "true" &&
      initialExportToggle?.getAttribute("aria-expanded") === "true" &&
      initialReviewToggle?.getAttribute("aria-label") === "Collapse export review panel" &&
      initialExportToggle?.getAttribute("aria-label") === "Collapse Figma export panel" &&
      initialReviewToggle?.querySelector("path")?.getAttribute("d") === canonicalCollapsePath &&
      initialExportToggle?.querySelector("path")?.getAttribute("d") === canonicalCollapsePath,
  );
  check(
    `${expectedOrientation} workspace orientation is applied`,
    workspace.dataset.orientation === expectedOrientation &&
      document.documentElement.dataset.sbfxWorkspaceOrientation === expectedOrientation,
  );
  check(
    "workspace is anchored at the bottom-right",
    Math.abs(workspaceRect.bottom - (window.innerHeight - expectedOffset)) <= 1 &&
      Math.abs(workspaceRect.right - (window.innerWidth - expectedOffset)) <= 1,
    JSON.stringify({ expectedOffset, workspaceRect }),
  );
  check(
    "top-right comments detail does not overlap the bottom-right workspace",
    commentsRect.bottom <= workspaceRect.top + 1,
    JSON.stringify({ commentsRect, workspaceRect }),
  );
  check(
    "workspace does not overlap Story canvas",
    expectedOrientation === "side"
      ? storyRect.right <= workspaceRect.left + 1
      : storyRect.bottom <= workspaceRect.top + 1,
    JSON.stringify({ expectedOrientation, storyRect, workspaceRect }),
  );
  check(
    "workspace review and independent comments panel are excluded from captures",
    Boolean(
      workspace.querySelector('.sbfx-review[data-sbfx-capture-ignore]') &&
        commentsPanel.matches('[data-sbfx-capture-ignore]'),
    ),
  );
  const reportsLinks = commentsPanel.querySelectorAll<HTMLAnchorElement>(
    ".sbfx-review__report-link",
  );
  check(
    "panel delegates closed meeting browsing to one Reports link",
    reportsLinks.length === 1 &&
      reportsLinks[0]?.textContent === "Reports" &&
      reportsLinks[0]?.href.endsWith("/__comments/reports") &&
      !document.querySelector(".sbfx-review__history") &&
      !document.querySelector(".sbfx-review__history-item") &&
      !commentsPanel.textContent?.includes("Closed meeting history"),
  );
  const startButton = button("Start meeting")!;
  check("Start meeting button is enabled", !startButton.disabled);
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
  startButton.click();
  resultElement.dataset.stage = `start-clicked-${requests.length}`;
  await waitFor(() => requests.some((request) => request.method === "POST" && request.path === "/sessions"));
  await waitFor(() => button("Add comment"));
  check("Start meeting performs API round trip", requests.some((request) => request.method === "POST" && request.path === "/sessions"));
  check(
    "Start meeting keeps the comments panel expanded",
    commentsPanel.dataset.expanded === "true" &&
      commentsToggle.getAttribute("aria-expanded") === "true" &&
      !commentsDetail.hidden &&
      Boolean(button("Add comment")),
  );
  check(
    "default comment action uses concise copy",
    Boolean(button("Add comment")) &&
      !commentsPanel.textContent?.includes("Add visual comment"),
  );
  check(
    "active meeting keeps Reports as the only report navigation",
    commentsPanel.querySelectorAll(".sbfx-review__report-link").length === 1 &&
      !Array.from(commentsPanel.querySelectorAll<HTMLAnchorElement>("a")).some(
        (link) => link.textContent?.trim() === "Open",
      ),
  );

  button("Add comment")!.click();
  await waitFor(() => button("Cancel capture"));
  commentsToggle.click();
  await waitFor(
    () =>
      commentsToggle.getAttribute("aria-expanded") === "false" &&
      document.documentElement.dataset.sbfxCaptureMode !== "true",
  );
  check(
    "closing comments cancels armed point capture and hides details",
    commentsDetail.hidden &&
      !button("Cancel capture") &&
      !commentsPanel.querySelector(".sbfx-review__capture-prompt"),
  );
  commentsToggle.click();
  await waitFor(() => button("Add comment"));

  const commentRequestsBeforeFailure = requests.filter((request) => request.path.endsWith("/comments")).length;
  button("Add comment")!.click();
  const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
  CanvasRenderingContext2D.prototype.getImageData = function (_x, _y, width, height) {
    return { data: new Uint8ClampedArray(width * height * 4) } as ImageData;
  };
  dispatchPointerSequence(prototypeButton, 100, 64);
  await waitFor(() => commentsPanel.querySelector(".sbfx-review__error")?.textContent?.includes("no visible pixels"));
  CanvasRenderingContext2D.prototype.getImageData = originalGetImageData;
  check(
    "transparent production capture stays retryable and sends no comment request",
    Boolean(button("Add comment")) &&
      !button("Save comment") &&
      !document.querySelector("[data-sbfx-live-comment-pin]") &&
      requests.filter((request) => request.path.endsWith("/comments")).length === commentRequestsBeforeFailure,
  );

  button("Add comment")!.click();
  dispatchPointerSequence(prototypeButton, 100, 64);
  await waitFor(() => document.querySelector("[data-sbfx-live-comment-pin]"));
  check(
    "point selection shows a capture-ignored next-ordinal live tag",
    document.querySelector("[data-sbfx-live-comment-pin]")?.textContent === "1" &&
      document
        .querySelector("[data-sbfx-live-comment-pin]")
        ?.hasAttribute("data-sbfx-capture-ignore") === true,
  );
  await waitFor(() => button("Save comment"));
  resultElement.dataset.stage = "composer-open";
  check(
    "Figma export stays visible while composer is open",
    Boolean(workspace.querySelector('.sbfx-exporter[aria-label="Figma export"]')),
  );
  const pendingPreview = commentsPanel.querySelector<HTMLElement>(
    "[data-pending-comment-preview]",
  )!;
  const pendingPin = () =>
    commentsPanel.querySelector<HTMLButtonElement>("[data-pending-comment-pin]")!;
  check(
    "pending preview and Story tag show the next meeting ordinal",
    pendingPin().textContent === "1" &&
      pendingPin().getAttribute("aria-label") === "Adjust comment point 1" &&
      document.querySelector("[data-sbfx-live-comment-pin]")?.textContent === "1",
  );
  const pendingPreviewRect = pendingPreview.getBoundingClientRect();
  dispatchPointerSequence(
    pendingPreview,
    pendingPreviewRect.right + 100,
    pendingPreviewRect.bottom + 100,
  );
  await waitFor(
    () => pendingPin().style.left === "100%" && pendingPin().style.top === "100%",
  );
  pendingPin().dispatchEvent(
    new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "ArrowRight",
      shiftKey: true,
    }),
  );
  check(
    "pointer and keyboard adjustment clamp the draft to preview bounds",
    pendingPin().style.left === "100%" && pendingPin().style.top === "100%",
  );
  pendingPin().dispatchEvent(
    new PointerEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
      clientX: pendingPreviewRect.right,
      clientY: pendingPreviewRect.bottom,
      pointerId: 7,
    }),
  );
  pendingPreview.dispatchEvent(
    new PointerEvent("pointermove", {
      bubbles: true,
      cancelable: true,
      clientX: pendingPreviewRect.left + pendingPreviewRect.width * 0.6,
      clientY: pendingPreviewRect.top + pendingPreviewRect.height * 0.7,
      pointerId: 7,
    }),
  );
  pendingPreview.dispatchEvent(
    new PointerEvent("pointerup", {
      bubbles: true,
      cancelable: true,
      clientX: pendingPreviewRect.left + pendingPreviewRect.width * 0.6,
      clientY: pendingPreviewRect.top + pendingPreviewRect.height * 0.7,
      pointerId: 7,
    }),
  );
  await waitFor(
    () => pendingPin().style.left === "60%" && pendingPin().style.top === "70%",
  );
  pendingPin().focus();
  pendingPin().dispatchEvent(
    new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowRight" }),
  );
  await waitFor(() => pendingPin().style.left === "61%");
  pendingPin().dispatchEvent(
    new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "ArrowDown",
      shiftKey: true,
    }),
  );
  await waitFor(() => pendingPin().style.top === "75%");
  check(
    "preview click and keyboard adjustment update one focusable clamped draft pin",
    pendingPin().style.left === "61%" &&
      pendingPin().style.top === "75%" &&
      document.activeElement === pendingPin() &&
      document.querySelector("[data-sbfx-live-comment-pin]") !== null,
  );
  const authorField = commentsPanel.querySelector<HTMLInputElement>(".sbfx-review__composer input")!;
  const textarea = commentsPanel.querySelector<HTMLTextAreaElement>("textarea")!;
  setNativeValue(authorField, "Mina");
  setNativeValue(textarea, "Keep this modal spacing");
  await waitFor(() => !button("Save comment")!.disabled);
  commentsToggle.click();
  await waitFor(() => commentsDetail.hidden);
  check(
    "closing a composer hides details without discarding its draft",
    commentsToggle.getAttribute("aria-expanded") === "false" &&
      authorField.value === "Mina" &&
      textarea.value === "Keep this modal spacing" &&
      !document.querySelector("[data-sbfx-live-comment-pin]"),
  );
  commentsToggle.click();
  await waitFor(() => !commentsDetail.hidden && button("Save comment"));
  check(
    "reopening comments restores the pending composer draft",
    document.querySelector<HTMLInputElement>(".sbfx-comments-panel .sbfx-review__composer input")?.value === "Mina" &&
      document.querySelector<HTMLTextAreaElement>(".sbfx-comments-panel textarea")?.value === "Keep this modal spacing" &&
      pendingPin().style.left === "61%" &&
      pendingPin().style.top === "75%" &&
      document.querySelector("[data-sbfx-live-comment-pin]")?.textContent === "1",
  );
  const composerCommentsRect = commentsPanel.getBoundingClientRect();
  const composerWorkspaceRect = workspace.getBoundingClientRect();
  check(
    "comment composer remains above the operable workspace",
    composerCommentsRect.bottom <= composerWorkspaceRect.top + 1 &&
      Boolean(workspace.querySelector('.sbfx-exporter[aria-label="Figma export"]')),
    JSON.stringify({ composerCommentsRect, composerWorkspaceRect }),
  );
  button("Save comment")!.click();
  await waitFor(() => requests.some((request) => request.method === "POST" && request.path.endsWith("/comments")));
  await waitFor(
    () => !button("Save comment") && !document.querySelector("[data-sbfx-live-comment-pin]"),
  );
  resultElement.dataset.stage = "comment-saved";
  const finalCreateRequest = requests.find(
    (request) => request.method === "POST" && request.path.endsWith("/comments"),
  );
  const finalPin = (finalCreateRequest?.body as { pin?: { xRatio: number; yRatio: number } })
    ?.pin;
  check(
    "comment composer posts screenshot and normalized pin",
    comments.length === 5 &&
      typeof comments.find((comment) => comment.id === "comment-current-4")?.capture ===
        "object" &&
      Boolean(
        finalPin &&
          Math.abs(finalPin.xRatio - 0.61) < 0.0001 &&
          Math.abs(finalPin.yRatio - 0.75) < 0.0001,
      ) &&
      !document.querySelector("[data-sbfx-live-comment-pin]"),
    JSON.stringify({
      commentsLength: comments.length,
      createRequest: finalCreateRequest,
      livePin: document.querySelector("[data-sbfx-live-comment-pin]")?.outerHTML,
      savedComment: comments.find((comment) => comment.id === "comment-current-4"),
    }),
  );
  check("author is stored locally", localStorage.getItem("sbfx:review-author") === "Mina");
  check("polling overview uses current story id", requests.some((request) => request.method === "GET" && request.path === ""));

  mount.render(null);
  await waitFor(() => !document.querySelector(".sbfx-comments-panel"));
  mount.render(
    h(FigmaExportReview, {
      apiPath: "/status",
      componentTitle: "Button",
      enabled: true,
      showNotes: false,
      storyId: "demo--story",
      storyName: "Story",
      storyTitle: "Demo",
      storyUrl: location.href,
      viewMode: "story",
      visualComments: { apiPath: "/__comments", captureSelector: "#storybook-root" },
    }),
  );
  await waitFor(
    () =>
      document
        .querySelector(".sbfx-comments-panel__detail")
        ?.getAttribute("data-comments-capability") === "available",
  );
  commentsPanel = document.querySelector<HTMLElement>(".sbfx-comments-panel")!;
  commentsToggle = commentsPanel.querySelector<HTMLButtonElement>(
    ".sbfx-comments-panel__toggle",
  )!;
  commentsDetail = commentsPanel.querySelector<HTMLElement>(
    ".sbfx-comments-panel__detail",
  )!;
  check(
    "Save comment keeps the comments panel expanded across a same-story remount",
    commentsPanel.dataset.expanded === "true" &&
      commentsToggle.getAttribute("aria-expanded") === "true" &&
      !commentsDetail.hidden &&
      Boolean(button("Add comment")) &&
      !button("Save comment"),
  );

  const currentCommentCards = () =>
    Array.from(
      commentsPanel.querySelectorAll<HTMLElement>(
        ".sbfx-comments-panel__comment[data-comment-id]",
      ),
    );
  await waitFor(() => currentCommentCards().length === 3);
  check(
    "panel shows only the newest three comments for the current story",
    currentCommentCards().map((card) => card.dataset.commentId).join(",") ===
      "comment-current-4,comment-current-3,comment-current-2" &&
      !commentsPanel.textContent?.includes("Newest but belongs to another story") &&
      !commentsPanel.textContent?.includes("Oldest current-story comment"),
  );
  check(
    "panel exposes author time body and Open or Completed status",
    currentCommentCards().every(
      (card) =>
        Boolean(card.querySelector("time")?.getAttribute("datetime")) &&
        Boolean(card.querySelector(".sbfx-comments-panel__comment-body")) &&
        Boolean(card.querySelector(".sbfx-comments-panel__comment-status")),
    ) &&
      currentCommentCards()[2]?.textContent?.includes("Completed") === true,
  );

  const createCommentRequestCount = () =>
    requests.filter(
      (request) => request.method === "POST" && request.path.endsWith("/comments"),
    ).length;
  const patchCount = () =>
    requests.filter((request) => request.method === "PATCH").length;
  const savedEvidenceCard = () =>
    commentsPanel.querySelector<HTMLElement>(
      '.sbfx-comments-panel__comment[data-comment-id="comment-current-4"]',
    )!;
  const commentEditModal = () =>
    document.querySelector<HTMLElement>("[data-comment-edit-modal]")!;
  const commentEditDialog = () =>
    commentEditModal().querySelector<HTMLElement>('[role="dialog"]')!;
  const captureRequestsBeforeSavedEdit = createCommentRequestCount();
  const savedEditTrigger = savedEvidenceCard().querySelector<HTMLButtonElement>(
    '[aria-label="Edit comment"]',
  )!;
  savedEditTrigger.click();
  await waitFor(() => document.querySelector("[data-comment-edit-modal]"));
  const savedEvidencePreview = commentEditModal().querySelector<HTMLElement>(
    "[data-comment-evidence-preview]",
  )!;
  const editModalRect = commentEditDialog().getBoundingClientRect();
  const editPreviewRect = savedEvidencePreview.getBoundingClientRect();
  const commentsPanelRect = commentsPanel.getBoundingClientRect();
  check(
    "saved comment edit opens one accessible body-level modal instead of an inline card editor",
    !commentsPanel.contains(commentEditModal()) &&
      commentEditDialog().getAttribute("aria-modal") === "true" &&
      Boolean(commentEditDialog().getAttribute("aria-labelledby")) &&
      commentEditModal().getAttribute("data-sbfx-capture-ignore") === "true" &&
      !savedEvidenceCard().querySelector("textarea") &&
      editModalRect.width > commentsPanelRect.width &&
      editPreviewRect.width > commentsPanelRect.width &&
      editModalRect.left >= 0 &&
      editModalRect.right <= window.innerWidth &&
      editModalRect.top >= 0 &&
      editModalRect.bottom <= window.innerHeight,
    JSON.stringify({
      outsidePanel: !commentsPanel.contains(commentEditModal()),
      modal: {
        bottom: editModalRect.bottom,
        left: editModalRect.left,
        right: editModalRect.right,
        top: editModalRect.top,
        width: editModalRect.width,
      },
      panelWidth: commentsPanelRect.width,
      previewWidth: editPreviewRect.width,
      viewport: { height: window.innerHeight, width: window.innerWidth },
    }),
  );
  check(
    "saved comment modal shows its stored aspect ratio pin and meeting-wide ordinal",
    savedEvidencePreview.style.aspectRatio === "400 / 240" &&
      savedEvidencePreview.querySelector("[data-comment-edit-pin]")?.textContent === "5" &&
      savedEvidencePreview.querySelector("[data-comment-edit-pin]")?.getAttribute("aria-label") ===
        "Adjust comment point 5" &&
      document.activeElement === savedEvidencePreview.querySelector("[data-comment-edit-pin]"),
    JSON.stringify({
      activeElement: document.activeElement?.outerHTML,
      aspectRatio: savedEvidencePreview.style.aspectRatio,
      pinLabel: savedEvidencePreview
        .querySelector("[data-comment-edit-pin]")
        ?.getAttribute("aria-label"),
      pinText: savedEvidencePreview.querySelector("[data-comment-edit-pin]")?.textContent,
    }),
  );
  const savedEditPin = () =>
    commentEditModal().querySelector<HTMLButtonElement>("[data-comment-edit-pin]")!;
  const savedPreviewRect = savedEvidencePreview.getBoundingClientRect();
  dispatchPointerSequence(
    savedEvidencePreview,
    savedPreviewRect.left + savedPreviewRect.width * 0.4,
    savedPreviewRect.top + savedPreviewRect.height * 0.55,
  );
  await waitFor(
    () => savedEditPin().style.left === "40%" && savedEditPin().style.top === "55%",
  );
  savedEditPin().focus();
  savedEditPin().dispatchEvent(
    new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "ArrowRight",
    }),
  );
  savedEditPin().dispatchEvent(
    new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "ArrowDown",
      shiftKey: true,
    }),
  );
  await waitFor(
    () => savedEditPin().style.left === "41%" && savedEditPin().style.top === "60%",
  );
  check(
    "saved comment point supports pointer and keyboard draft adjustment without a Story tag",
    patchCount() === 0 &&
      createCommentRequestCount() === captureRequestsBeforeSavedEdit &&
      !document.querySelector("[data-sbfx-live-comment-pin]"),
  );
  commentEditModal()
    .querySelector<HTMLButtonElement>("[data-comment-edit-cancel]")!
    .click();
  await waitFor(
    () =>
      !document.querySelector("[data-comment-edit-modal]") &&
      document.activeElement === savedEditTrigger,
  );
  check(
    "cancelling a saved evidence modal restores its canonical point without a request and returns focus",
    patchCount() === 0 &&
      createCommentRequestCount() === captureRequestsBeforeSavedEdit &&
      document.activeElement === savedEditTrigger,
  );

  savedEditTrigger.click();
  await waitFor(() => document.querySelector("[data-comment-edit-pin]"));
  check(
    "reopening a cancelled saved edit restores the canonical point",
    savedEditPin().style.left === "61%" && savedEditPin().style.top === "75%",
  );
  const retryPreview = commentEditModal().querySelector<HTMLElement>(
    "[data-comment-evidence-preview]",
  )!;
  const retryPreviewRect = retryPreview.getBoundingClientRect();
  dispatchPointerSequence(
    retryPreview,
    retryPreviewRect.left + retryPreviewRect.width * 0.32,
    retryPreviewRect.top + retryPreviewRect.height * 0.46,
  );
  await waitFor(
    () => savedEditPin().style.left === "32%" && savedEditPin().style.top === "46%",
  );
  const savedBodyDraft = commentEditModal().querySelector<HTMLTextAreaElement>("textarea")!;
  setNativeValue(savedBodyDraft, "Updated saved comment and point");
  failNextCommentPatch = true;
  commentEditModal()
    .querySelector<HTMLButtonElement>("[data-comment-edit-save]")!
    .click();
  await waitFor(
    () =>
      patchCount() === 1 &&
      commentEditModal().textContent?.includes("Temporary comment update failure."),
  );
  check(
    "failed saved point edit retains both drafts in the open modal",
    savedBodyDraft.value === "Updated saved comment and point" &&
      savedEditPin().style.left === "32%" &&
      savedEditPin().style.top === "46%",
  );
  commentEditModal()
    .querySelector<HTMLButtonElement>("[data-comment-edit-save]")!
    .click();
  await waitFor(
    () =>
      patchCount() === 2 &&
      !document.querySelector("[data-comment-edit-modal]") &&
      savedEvidenceCard().textContent?.includes("Updated saved comment and point"),
  );
  const savedEditPayload = requests.filter((request) => request.method === "PATCH").at(-1)
    ?.body as { body?: string; pin?: { xRatio: number; yRatio: number } } | undefined;
  check(
    "saving a saved point edit sends one atomic body and pin payload and keeps the panel expanded",
    savedEditPayload?.body === "Updated saved comment and point" &&
      Math.abs((savedEditPayload?.pin?.xRatio ?? -1) - 0.32) < 0.0001 &&
      Math.abs((savedEditPayload?.pin?.yRatio ?? -1) - 0.46) < 0.0001 &&
      commentsPanel.dataset.expanded === "true" &&
      !commentsDetail.hidden &&
      createCommentRequestCount() === captureRequestsBeforeSavedEdit,
  );

  const editableCard = () =>
    commentsPanel.querySelector<HTMLElement>(
      '.sbfx-comments-panel__comment[data-comment-id="comment-current-3"]',
    )!;
  editableCard()
    .querySelector<HTMLButtonElement>('[aria-label="Edit comment"]')!
    .click();
  await waitFor(() => document.querySelector("[data-comment-edit-modal] textarea"));
  await waitFor(() =>
    document.querySelector("[data-comment-edit-modal] [data-comment-evidence-unavailable]"),
  );
  check(
    "failed evidence image keeps the comment body editor usable",
    commentEditModal().textContent?.includes("Screenshot evidence is unavailable.") === true &&
      Boolean(commentEditModal().querySelector("textarea")) &&
      document.activeElement === commentEditModal().querySelector("textarea"),
  );
  const cancelledDraft = commentEditModal().querySelector<HTMLTextAreaElement>("textarea")!;
  setNativeValue(cancelledDraft, "Cancelled edit");
  commentEditModal().querySelector<HTMLButtonElement>("[data-comment-edit-cancel]")!.click();
  await waitFor(
    () =>
      !document.querySelector("[data-comment-edit-modal]") &&
      editableCard().textContent?.includes("Recent current-story comment"),
  );
  check(
    "cancelled panel edit sends no request and restores the stored body",
    patchCount() === 2 &&
      createCommentRequestCount() === captureRequestsBeforeSavedEdit &&
      editableCard().textContent?.includes("Recent current-story comment") === true &&
      !document.querySelector("[data-comment-edit-modal]"),
  );

  const editableTrigger = editableCard().querySelector<HTMLButtonElement>(
    '[aria-label="Edit comment"]',
  )!;
  editableTrigger.click();
  await waitFor(() => document.querySelector("[data-comment-edit-modal] textarea"));
  const editDraft = commentEditModal().querySelector<HTMLTextAreaElement>("textarea")!;
  setNativeValue(editDraft, "   ");
  const saveEditButton = commentEditModal().querySelector<HTMLButtonElement>(
    "[data-comment-edit-save]",
  )!;
  check(
    "invalid panel edit is blocked without a request",
    saveEditButton.disabled && patchCount() === 2,
  );
  setNativeValue(editDraft, "Updated recent comment");
  await waitFor(() => !saveEditButton.disabled);
  document.dispatchEvent(
    new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Escape" }),
  );
  await waitFor(
    () =>
      !document.querySelector("[data-comment-edit-modal]") &&
      document.activeElement === editableTrigger,
  );
  check(
    "Escape closes the comment edit modal without a request and returns focus",
    patchCount() === 2 && document.activeElement === editableTrigger,
  );
  editableTrigger.click();
  await waitFor(() => document.querySelector("[data-comment-edit-modal]"));
  commentEditModal().dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await waitFor(
    () =>
      !document.querySelector("[data-comment-edit-modal]") &&
      document.activeElement === editableTrigger,
  );
  check(
    "backdrop closes the comment edit modal without a request and returns focus",
    patchCount() === 2 && document.activeElement === editableTrigger,
  );
  editableTrigger.click();
  await waitFor(() => document.querySelector("[data-comment-edit-modal] textarea"));
  setNativeValue(
    commentEditModal().querySelector<HTMLTextAreaElement>("textarea")!,
    "Updated recent comment",
  );
  const retrySaveEditButton = commentEditModal().querySelector<HTMLButtonElement>(
    "[data-comment-edit-save]",
  )!;
  await waitFor(() => !retrySaveEditButton.disabled);
  retrySaveEditButton.click();
  await waitFor(
    () =>
      patchCount() === 3 &&
      editableCard().textContent?.includes("Updated recent comment"),
  );
  check(
    "missing evidence saves a body-only PATCH and keeps the panel expanded",
    JSON.stringify(
      requests.filter((request) => request.method === "PATCH").at(-1)?.body,
    ) === JSON.stringify({ body: "Updated recent comment" }) &&
      commentsPanel.dataset.expanded === "true" &&
      !commentsDetail.hidden,
    JSON.stringify({
      expanded: commentsPanel.dataset.expanded,
      hidden: commentsDetail.hidden,
      payload: requests.filter((request) => request.method === "PATCH").at(-1)?.body,
    }),
  );

  const deletableCard = () =>
    commentsPanel.querySelector<HTMLElement>(
      '.sbfx-comments-panel__comment[data-comment-id="comment-current-2"]',
    );
  const deleteCount = () =>
    requests.filter((request) => request.method === "DELETE").length;
  const openDeleteDialog = () => {
    deletableCard()
      ?.querySelector<HTMLButtonElement>('[aria-label="Delete comment"]')
      ?.click();
  };
  openDeleteDialog();
  await waitFor(() => commentsPanel.querySelector('[role="dialog"]'));
  const deleteDialog = () =>
    commentsPanel.querySelector<HTMLElement>('[role="dialog"]')!;
  const deleteTrigger = deletableCard()!.querySelector<HTMLButtonElement>(
    '[aria-label="Delete comment"]',
  )!;
  deleteDialog().querySelector<HTMLButtonElement>("[data-comment-delete-cancel]")!.click();
  await waitFor(
    () =>
      !commentsPanel.querySelector('[role="dialog"]') &&
      document.activeElement === deleteTrigger,
  );
  check(
    "panel delete Cancel sends no request and restores focus",
    deleteCount() === 0 && document.activeElement === deleteTrigger,
  );
  openDeleteDialog();
  await waitFor(() => commentsPanel.querySelector('[role="dialog"]'));
  document.dispatchEvent(
    new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Escape" }),
  );
  await waitFor(
    () =>
      !commentsPanel.querySelector('[role="dialog"]') &&
      document.activeElement === deleteTrigger,
  );
  check(
    "panel delete Escape sends no request and restores focus",
    deleteCount() === 0 && document.activeElement === deleteTrigger,
  );
  openDeleteDialog();
  await waitFor(() => commentsPanel.querySelector('[role="dialog"]'));
  deleteDialog().dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await waitFor(
    () =>
      !commentsPanel.querySelector('[role="dialog"]') &&
      document.activeElement === deleteTrigger,
  );
  check(
    "panel delete backdrop sends no request and restores focus",
    deleteCount() === 0 && document.activeElement === deleteTrigger,
  );
  openDeleteDialog();
  await waitFor(() => commentsPanel.querySelector('[role="dialog"]'));
  deleteDialog()
    .querySelector<HTMLButtonElement>("[data-comment-delete-confirm]")!
    .click();
  await waitFor(() => deleteCount() === 1 && !deletableCard());
  check(
    "panel delete confirmation sends one request and keeps the panel expanded",
    commentsPanel.dataset.expanded === "true" &&
      !commentsDetail.hidden &&
      currentCommentCards().map((card) => card.dataset.commentId).join(",") ===
        "comment-current-4,comment-current-3,comment-current-1",
  );
  check(
    "Delete recomputes current panel comments to contiguous meeting-wide ordinals",
    currentCommentCards()[0]?.querySelector("[aria-label='Edit comment']") !== null &&
      comments.findIndex((comment) => comment.id === "comment-current-4") + 1 === 4,
  );
  const missingEvidenceCard = commentsPanel.querySelector<HTMLElement>(
    '.sbfx-comments-panel__comment[data-comment-id="comment-current-1"]',
  )!;
  missingEvidenceCard
    .querySelector<HTMLButtonElement>('[aria-label="Edit comment"]')!
    .click();
  await waitFor(() =>
    document.querySelector("[data-comment-edit-modal] [data-comment-evidence-unavailable]"),
  );
  check(
    "null evidence fallback keeps the body editor usable without recapture",
    Boolean(commentEditModal().querySelector("textarea")) &&
      createCommentRequestCount() === captureRequestsBeforeSavedEdit,
  );
  commentEditModal()
    .querySelector<HTMLButtonElement>("[data-comment-edit-cancel]")!
    .click();
  missingEvidenceCard
    .querySelector<HTMLButtonElement>('[aria-label="Edit comment"]')!
    .click();
  await waitFor(() => document.querySelector("[data-comment-edit-modal]"));
  commentsToggle.click();
  await waitFor(
    () =>
      !document.querySelector("[data-comment-edit-modal]") &&
      commentsPanel.dataset.expanded === "false",
  );
  check(
    "collapsing Visual comments removes the body-level edit overlay without a request",
    patchCount() === 3 && !document.querySelector("[data-comment-edit-modal]"),
  );
  commentsToggle.click();
  await waitFor(() => commentsPanel.dataset.expanded === "true");

  const reviewSlot = workspace.querySelector<HTMLElement>('[data-sbfx-workspace-slot="review"]')!;
  const reviewPreferenceBeforeParentCollapse = localStorage.getItem("sbfx:review-collapsed");
  document.querySelector<HTMLButtonElement>('[aria-label="Collapse Figma export panel"]')!.click();
  await waitFor(() => workspace.dataset.exportCollapsed === "true");
  const collapsedExportToggle = document.querySelector<HTMLButtonElement>('[aria-label="Expand Figma export panel"]');
  const collapsedWorkspaceRect = workspace.getBoundingClientRect();
  const collapsedExporter = workspace.querySelector<HTMLElement>(".sbfx-exporter")!;
  const collapsedExporterRect = collapsedExporter.getBoundingClientRect();
  const collapsedTitleLabel = collapsedExporter.querySelector<HTMLElement>(
    ".sbfx-exporter__title-label",
  );
  const collapsedSubtitle = collapsedExporter.querySelector<HTMLElement>(
    ".sbfx-exporter__subtitle",
  );
  const collapsedVersion = collapsedExporter.querySelector<HTMLElement>(
    ".sbfx-exporter__version",
  );
  const collapsedToggleIcon = collapsedExportToggle?.querySelector<HTMLElement>(
    ".sbfx-exporter__toggle-icon",
  );
  check(
    "collapsed Figma export hugs only its mark and version",
    Boolean(
      collapsedWorkspaceRect.width < 320 &&
        Math.abs(collapsedWorkspaceRect.width - collapsedExporterRect.width) <= 2.5 &&
        collapsedTitleLabel &&
        getComputedStyle(collapsedTitleLabel).display === "none" &&
        collapsedSubtitle &&
        getComputedStyle(collapsedSubtitle).display === "none" &&
        collapsedVersion &&
        getComputedStyle(collapsedVersion).display !== "none" &&
        collapsedVersion.getBoundingClientRect().width > 0 &&
        collapsedToggleIcon &&
        getComputedStyle(collapsedToggleIcon).display === "none",
    ),
    JSON.stringify({ collapsedExporterRect, collapsedWorkspaceRect }),
  );
  check(
    "collapsed Figma export hides the complete review slot without changing review state",
    collapsedExportToggle?.getAttribute("aria-expanded") === "false" &&
      collapsedExportToggle?.getAttribute("aria-label") === "Expand Figma export panel" &&
      collapsedExportToggle?.querySelector("path")?.getAttribute("d") === canonicalUnfoldMorePath &&
      getComputedStyle(reviewSlot).display === "none" &&
      reviewSlot.getBoundingClientRect().height === 0 &&
      exportReviewPanel()?.getAttribute("data-collapsed") === "false" &&
      localStorage.getItem("sbfx:review-collapsed") === reviewPreferenceBeforeParentCollapse,
  );
  collapsedExportToggle!.click();
  await waitFor(
    () =>
      workspace.dataset.exportCollapsed === "false" &&
      getComputedStyle(reviewSlot).display !== "none",
  );
  const restoredWorkspaceRect = workspace.getBoundingClientRect();
  check(
    "reopening Figma export restores the prior expanded review state",
    document.querySelector(".sbfx-exporter")?.getAttribute("data-collapsed") === "false" &&
      exportReviewPanel()?.getAttribute("data-collapsed") === "false" &&
      localStorage.getItem("sbfx:review-collapsed") === reviewPreferenceBeforeParentCollapse &&
      (expectedOrientation === "side"
        ? Math.abs(restoredWorkspaceRect.width - 320) <= 0.5
        : Math.abs(restoredWorkspaceRect.width - (window.innerWidth - 32)) <= 0.5) &&
      Boolean(
        collapsedTitleLabel &&
          getComputedStyle(collapsedTitleLabel).display !== "none" &&
          collapsedSubtitle &&
          getComputedStyle(collapsedSubtitle).display !== "none" &&
          collapsedToggleIcon &&
          getComputedStyle(collapsedToggleIcon).display !== "none",
      ),
  );
  document.querySelector<HTMLButtonElement>('[aria-label="Collapse export review panel"]')!.click();
  await waitFor(() => exportReviewPanel()?.getAttribute("data-collapsed") === "true");
  document.querySelector<HTMLButtonElement>('[aria-label="Collapse Figma export panel"]')!.click();
  await waitFor(() => workspace.dataset.exportCollapsed === "true");
  document.querySelector<HTMLButtonElement>('[aria-label="Expand Figma export panel"]')?.click();
  await waitFor(
    () =>
      workspace.dataset.exportCollapsed === "false" &&
      getComputedStyle(reviewSlot).display !== "none",
  );
  check(
    "parent disclosure preserves a collapsed Export review preference",
    exportReviewPanel()?.getAttribute("data-collapsed") === "true" &&
      localStorage.getItem("sbfx:review-collapsed") === "1" &&
      localStorage.getItem("sbfx:exporter-collapsed") === "0" &&
      exportReviewPanel()?.querySelector(".sbfx-review__toggle")?.getAttribute("aria-label") === "Expand export review panel" &&
      exportReviewPanel()?.querySelector(".sbfx-review__toggle path")?.getAttribute("d") === canonicalUnfoldMorePath &&
      document.querySelector(".sbfx-exporter__toggle")?.getAttribute("aria-label") === "Collapse Figma export panel" &&
      document.querySelector(".sbfx-exporter__toggle path")?.getAttribute("d") === canonicalCollapsePath,
  );

  syncFigmaExportOverlay(
    {
      globals: { figmaExport: "on" },
      id: "demo--story-two",
      name: "Story two",
      title: "Demo",
      viewMode: "story",
    },
    { storyTitlePrefix: false },
  );
  mount.render(
    h(FigmaExportReview, {
      apiPath: "/status",
      componentTitle: "Button",
      enabled: true,
      showNotes: false,
      storyId: "demo--story-two",
      storyName: "Story two",
      storyTitle: "Demo",
      storyUrl: location.href,
      viewMode: "story",
      visualComments: { apiPath: "/__comments", captureSelector: "#storybook-root" },
    }),
  );
  await waitFor(() => exportReviewPanel()?.getAttribute("data-save-state") !== "loading");
  check(
    "story change preserves each panel preference without duplicating workspace",
    exportReviewPanel()?.getAttribute("data-collapsed") === "true" &&
      document.querySelector(".sbfx-exporter")?.getAttribute("data-collapsed") === "false" &&
      workspace.dataset.exportCollapsed === "false" &&
      document.querySelectorAll("[data-sbfx-workspace]").length === 1,
  );
  const rerenderedSlots = Array.from(
    document.querySelectorAll<HTMLElement>(
      "[data-sbfx-workspace] > [data-sbfx-workspace-slot]",
    ),
  );
  check(
    "story change preserves export-before-review slot order",
    rerenderedSlots.length === 2 &&
      rerenderedSlots[0]?.dataset.sbfxWorkspaceSlot === "export" &&
      rerenderedSlots[1]?.dataset.sbfxWorkspaceSlot === "review",
  );

  statusAvailable = false;
  mount.render(
    h(FigmaExportReview, {
      apiPath: "/status",
      componentTitle: "Button",
      enabled: true,
      showNotes: false,
      storyId: "demo--status-unavailable",
      storyName: "Status unavailable",
      storyTitle: "Demo",
      storyUrl: location.href,
      viewMode: "story",
      visualComments: { apiPath: "/__comments", captureSelector: "#storybook-root" },
    }),
  );
  await waitFor(() => exportReviewPanel()?.getAttribute("data-save-state") === "error");
  check(
    "status 404 names its endpoint without disabling comments",
    exportReviewPanel()?.textContent?.includes("Review status GET /status returned HTTP 404") &&
      commentsPanel.querySelector(".sbfx-review__visual-comments")?.getAttribute("data-comments-capability") === "available" &&
      !button("Add comment")?.disabled,
  );

  statusAvailable = true;
  commentsAvailable = false;
  mount.render(
    h(FigmaExportReview, {
      apiPath: "/status",
      componentTitle: "Button",
      enabled: true,
      showNotes: false,
      storyId: "demo--comments-unavailable",
      storyName: "Comments unavailable",
      storyTitle: "Demo",
      storyUrl: location.href,
      viewMode: "story",
      visualComments: { apiPath: "/__comments", captureSelector: "#storybook-root" },
    }),
  );
  await waitFor(() => commentsPanel.querySelector(".sbfx-review__visual-comments")?.getAttribute("data-comments-capability") === "error");
  check(
    "comments 404 names its endpoint and disables only comments mutations",
    exportReviewPanel()?.getAttribute("data-save-state") !== "error" &&
      commentsPanel.textContent?.includes("Visual comments GET /__comments returned HTTP 404") &&
      Boolean(button("Add comment")?.disabled) &&
      commentsPanel.querySelectorAll(".sbfx-review__report-link").length === 1 &&
      !commentsPanel.querySelector(".sbfx-review__history-item"),
  );

  commentsAvailable = true;
  await waitFor(
    () => commentsPanel.querySelector(".sbfx-review__visual-comments")?.getAttribute("data-comments-capability") === "available" &&
      !button("Add comment")?.disabled,
    8_000,
  );
  check(
    "successful comments poll restores comments controls",
    !commentsPanel.textContent?.includes("Visual comments GET /__comments returned HTTP 404"),
  );
  mount.render(
    h(FigmaExportReview, {
      apiPath: "/status",
      componentTitle: "Button",
      enabled: true,
      labels: { addVisualComment: "Capture note" },
      showNotes: false,
      storyId: "demo--custom-comment-label",
      storyName: "Custom comment label",
      storyTitle: "Demo",
      storyUrl: location.href,
      viewMode: "story",
      visualComments: { apiPath: "/__comments", captureSelector: "#storybook-root" },
    }),
  );
  await waitFor(() => button("Capture note"));
  button("Capture note")!.click();
  await waitFor(() => button("Cancel capture"));
  check(
    "custom addVisualComment label preserves point capture",
    Boolean(button("Cancel capture")) && !button("Add comment"),
  );
  button("Cancel capture")!.click();
  await waitFor(() => button("Capture note"));
  document.querySelector<HTMLButtonElement>('[aria-label="Expand Figma export panel"]')?.click();
  document.querySelector<HTMLButtonElement>('[aria-label="Expand export review panel"]')?.click();
  const createRequestsBeforeUnmount = createCommentRequestCount();
  button("Capture note")!.click();
  dispatchPointerSequence(prototypeButton, 100, 64);
  window.fetch = originalFetch;
  mount.unmount();
  await new Promise((resolve) => window.setTimeout(resolve, 100));
  check(
    "unmount clears an in-flight live tag without creating a comment",
    !document.querySelector("[data-sbfx-live-comment-pin]") &&
      createCommentRequestCount() === createRequestsBeforeUnmount,
  );

  const identityDecorator = createFigmaExportReviewDecorator(
    { storyTitlePrefix: false },
    { enabled: true, visualComments: { enabled: false } },
  );
  const baseContext = {
    id: "identity--default",
    name: "Default",
    parameters: {},
    title: "Identity",
    viewMode: "story",
  };
  const reactLikeResult = Object.freeze({ type: "react-like", props: {} });
  const vueLikeResult = Object.freeze({ type: "vue-like", children: [] });
  let storyCallCount = 0;
  const returnedReactLike = identityDecorator(
    () => {
      storyCallCount += 1;
      return reactLikeResult;
    },
    { ...baseContext, globals: { figmaExport: "on" } },
  );
  const firstReviewHost = document.querySelector("[data-sbfx-review-host]");
  const returnedVueLike = identityDecorator(
    () => {
      storyCallCount += 1;
      return vueLikeResult;
    },
    { ...baseContext, id: "identity--vue", globals: { figmaExport: "on" } },
  );
  check(
    "review decorator preserves strict story-result identity for React-like and Vue-like values",
    returnedReactLike === reactLikeResult &&
      returnedVueLike === vueLikeResult &&
      storyCallCount === 2,
  );
  check(
    "re-render updates one stable review host without duplication",
    document.querySelector("[data-sbfx-review-host]") === firstReviewHost &&
      document.querySelectorAll("[data-sbfx-review-host]").length === 1,
  );
  const disabledResult = Object.freeze({ type: "disabled" });
  const returnedDisabled = identityDecorator(
    () => disabledResult,
    { ...baseContext, globals: { figmaExport: "off" } },
  );
  check(
    "global off returns the story unchanged and unmounts the review host",
    returnedDisabled === disabledResult &&
      document.querySelectorAll("[data-sbfx-review-host]").length === 0,
  );
  identityDecorator(
    () => vueLikeResult,
    { ...baseContext, id: "identity--remount", globals: { figmaExport: "on" } },
  );
  check(
    "global on remounts exactly one fresh review host",
    document.querySelectorAll("[data-sbfx-review-host]").length === 1 &&
      document.querySelector("[data-sbfx-review-host]") !== firstReviewHost,
  );
  destroyFigmaReviewWorkspace();
}

type VisualCommentOverview = {
  activeSession: { id: string; title: string; startedAt: string; closedAt: string | null; captureCount: number; commentCount: number } | null;
};

run()
  .then(() => {
    resultElement.textContent = btoa(JSON.stringify({ results }));
  })
  .catch((error: unknown) => {
    const panelText = [
      document.querySelector('[aria-label="Figma export review"]')?.outerHTML,
      document.querySelector(".sbfx-comments-panel")?.outerHTML,
    ].filter(Boolean).join("\n") || "no review panels";
    resultElement.textContent = btoa(
      JSON.stringify({ error: `${error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : String(error)}\nPanel: ${panelText}`, results }),
    );
  });
