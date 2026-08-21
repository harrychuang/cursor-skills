import {
  Fragment,
  createElement as h,
  createPortal,
  mountDom,
  useEffect,
  useId,
  useRef,
  useState,
  type DomChild,
} from "./domRuntime";

import "./review.css";
import {
  collapseDisclosurePath,
  unfoldMoreDisclosurePath,
} from "./disclosureIcon";
import {
  readCollapsePreference,
  reviewCollapseStorageKey,
  writeCollapsePreference,
} from "./collapsePreference";
import {
  isStoryIncludedForFigmaExport,
  resolveFigmaExportAddonOptions,
  type FigmaExportAddonOptions,
  type ResolvedFigmaExportAddonOptions,
} from "./options";
import { createFigmaExportDecorator } from "./preview";
import { getParameterUrl } from "./source";
import { getAddonVersion } from "./version";
import {
  acquireFigmaWorkspaceSlot,
  type FigmaWorkspaceSlotHandle,
} from "./workspace";

import {
  VISUAL_COMMENT_LIMITS,
  clampRatio,
  getVisualCommentPin,
  normalizeAuthorName,
  type CreateVisualCommentRequest,
  type VisualCommentCaptureController,
  type VisualCommentCaptureResult,
  type VisualCommentOptions,
  type VisualCommentPin,
  type VisualCommentPointSelection,
} from "./visualComment";
import {
  createReviewStatusController,
  createVisualCommentsController,
  type FigmaReviewEntry,
  type FigmaReviewStatus,
  type VisualCommentOverview,
} from "./reviewController";

export type { FigmaReviewEntry, FigmaReviewStatus } from "./reviewController";

type DomKeyboardEvent<T extends HTMLElement> = KeyboardEvent & {
  currentTarget: T;
};
type DomInputEvent<T extends HTMLElement> = Event & {
  currentTarget: T;
};
type DomMouseEvent<T extends HTMLElement> = MouseEvent & {
  currentTarget: T;
};
type DomPointerEvent<T extends HTMLElement> = PointerEvent & {
  currentTarget: T;
};

function SvgIcon({
  children,
  size = 14,
}: {
  children?: DomChild;
  size?: number;
}) {
  return h(
    "svg",
    {
      "aria-hidden": "true",
      fill: "none",
      height: size,
      viewBox: "0 0 14 14",
      width: size,
    },
    children,
  );
}

function PathIcon({ d, size }: { d: string; size?: number }) {
  return h(SvgIcon, { size }, h("path", {
    d,
    fill: "none",
    stroke: "currentColor",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "stroke-width": "1.25",
  }));
}

function CollapseIcon({ size }: { size?: number }) {
  return h(SvgIcon, { size }, h("path", {
    d: collapseDisclosurePath,
    fill: "currentColor",
  }));
}

function EditIcon({ size }: { size?: number }) {
  return h(SvgIcon, { size }, h("path", {
    d: "M13.854 2.146l-2-2a.5.5 0 00-.708 0l-1.5 1.5-8.995 8.995a.499.499 0 00-.143.268L.012 13.39a.495.495 0 00.135.463.5.5 0 00.462.134l2.482-.496a.495.495 0 00.267-.143l8.995-8.995 1.5-1.5a.5.5 0 000-.708zM12 3.293l.793-.793L11.5 1.207 10.707 2 12 3.293zm-2-.586L1.707 11 3 12.293 11.293 4 10 2.707zM1.137 12.863l.17-.849.679.679-.849.17z",
    fill: "currentColor",
  }));
}

function EyeIcon({ size }: { size?: number }) {
  return h(SvgIcon, { size }, [
    h("path", {
      d: "M7 9.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
      fill: "currentColor",
    }),
    h("path", {
      d: "M14 7l-.21.293C13.669 7.465 10.739 11.5 7 11.5S.332 7.465.21 7.293L0 7l.21-.293C.331 6.536 3.261 2.5 7 2.5s6.668 4.036 6.79 4.207L14 7zM2.896 5.302A12.725 12.725 0 001.245 7c.296.37.874 1.04 1.65 1.698C4.043 9.67 5.482 10.5 7 10.5c1.518 0 2.958-.83 4.104-1.802A12.72 12.72 0 0012.755 7c-.297-.37-.875-1.04-1.65-1.698C9.957 4.33 8.517 3.5 7 3.5c-1.519 0-2.958.83-4.104 1.802z",
      fill: "currentColor",
    }),
  ]);
}

function LinkIcon({ size }: { size?: number }) {
  return h(PathIcon, {
    d: "M5.6 8.4l2.8-2.8M4.55 9.45l-1 .95a2.1 2.1 0 01-2.95-2.95l1.85-1.9a2.1 2.1 0 012.95 0M9.45 4.55l1-.95a2.1 2.1 0 012.95 2.95l-1.85 1.9a2.1 2.1 0 01-2.95 0",
    size,
  });
}

function TrashIcon({ size }: { size?: number }) {
  return h(PathIcon, {
    d: "M2.5 4h9M5 4V2.5h4V4m1.5 0l-.55 8H4.05L3.5 4M5.75 6v4M8.25 6v4",
    size,
  });
}

function UnfoldMoreDisclosureIcon(): DomChild {
  return h(SvgIcon, null, h("path", {
    d: unfoldMoreDisclosurePath,
    fill: "currentColor",
  }));
}

export type FigmaReviewLabels = Partial<{
  approved: string;
  addVisualComment: string;
  adjustCommentPoint: string;
  adjustCommentPointHint: string;
  authorName: string;
  cancelCapture: string;
  cancelCommentEdit: string;
  cancelDelete: string;
  closeVisualComments: string;
  closeNotes: string;
  commentBody: string;
  confirmDelete: string;
  deleteComment: string;
  deleteCommentDescription: string;
  deleteCommentTitle: string;
  endMeeting: string;
  editComment: string;
  editFigmaSource: string;
  evidenceUnavailable: string;
  exported: string;
  figmaSource: string;
  imported: string;
  needsFix: string;
  notStarted: string;
  notes: string;
  notesSaved: string;
  openNotes: string;
  openSource: string;
  openVisualComments: string;
  review: string;
  saveCommentChanges: string;
  startMeeting: string;
  submitComment: string;
  sourcePlaceholder: string;
  title: string;
  visualComments: string;
}>;

export type FigmaExportReviewOptions = {
  apiPath?: string;
  autoMarkExported?: boolean;
  enabled?: boolean;
  getComponentTitle?: (
    context: StorybookContext,
    options: ResolvedFigmaExportAddonOptions,
  ) => string;
  getFigmaSourceUrl?: (
    context: StorybookContext,
    componentTitle: string,
  ) => string | undefined;
  labels?: FigmaReviewLabels;
  showNotes?: boolean;
  visualComments?: VisualCommentOptions;
};

export type FigmaExportReviewProps = {
  apiPath?: string;
  autoMarkExported?: boolean;
  children?: DomChild;
  componentTitle: string;
  enabled: boolean;
  figmaSourceUrl?: string;
  labels?: FigmaReviewLabels;
  showNotes?: boolean;
  storyId: string;
  storyName: string;
  storyTitle: string;
  storyUrl?: string;
  viewMode?: string;
  visualComments?: VisualCommentOptions;
};

export type StorybookContext = {
  globals?: Record<string, unknown>;
  id?: string;
  name?: string;
  parameters?: Record<string, unknown>;
  title?: string;
  viewMode?: string;
};

type StorybookStory = () => unknown;
type SaveState = "error" | "idle" | "loading" | "saved" | "saving";

export const defaultFigmaReviewStatusApiPath = "/__figma_export_review_status";

const defaultLabels = {
  approved: "Approved",
  addVisualComment: "Add comment",
  adjustCommentPoint: "Adjust comment point",
  adjustCommentPointHint:
    "Click or drag the point. Use arrow keys for 1% steps, or Shift plus arrow keys for 5% steps.",
  authorName: "Display name",
  cancelCapture: "Cancel capture",
  cancelCommentEdit: "Cancel",
  cancelDelete: "Cancel",
  closeVisualComments: "Close comments",
  closeNotes: "Close",
  commentBody: "Comment",
  confirmDelete: "Confirm delete",
  deleteComment: "Delete comment",
  deleteCommentDescription:
    "This permanently deletes the comment and its screenshot when it is no longer referenced. This cannot be undone.",
  deleteCommentTitle: "Delete comment?",
  endMeeting: "End meeting",
  editComment: "Edit comment",
  editFigmaSource: "Edit Figma source",
  evidenceUnavailable: "Screenshot evidence is unavailable.",
  exported: "Exported",
  figmaSource: "Figma source",
  imported: "Imported",
  needsFix: "Needs fix",
  notStarted: "Not started",
  notes: "Notes",
  notesSaved: "Notes saved",
  openNotes: "Open",
  openSource: "Open source",
  openVisualComments: "Open comments",
  review: "Review",
  saveCommentChanges: "Save changes",
  startMeeting: "Start meeting",
  submitComment: "Save comment",
  sourcePlaceholder: "https://www.figma.com/design/...",
  title: "Export review",
  visualComments: "Visual comments",
} satisfies Required<FigmaReviewLabels>;

const defaultEntry = {
  figmaReviewStatus: "not-started",
} satisfies Pick<FigmaReviewEntry, "figmaReviewStatus">;

function normalizeEntry(
  entry: Partial<FigmaReviewEntry> | null | undefined,
): FigmaReviewEntry {
  const notes = entry?.notes ?? "";

  return {
    componentTitle: entry?.componentTitle,
    figmaNodeUrl: entry?.figmaNodeUrl,
    figmaReviewStatus: entry?.figmaReviewStatus ?? defaultEntry.figmaReviewStatus,
    name: entry?.name,
    notes,
    notesOpen: typeof entry?.notesOpen === "boolean" ? entry.notesOpen : Boolean(notes),
    storyTitle: entry?.storyTitle,
    updatedAt: entry?.updatedAt,
  };
}

function normalizeFigmaSourceUrl(value: string): string {
  const trimmedValue = value.trim();
  if (!trimmedValue) return "";
  if (trimmedValue.startsWith("figma.com/") || trimmedValue.startsWith("www.figma.com/")) {
    return `https://${trimmedValue}`;
  }
  return trimmedValue;
}

function getOpenableUrl(value: string | undefined): string {
  const normalizedValue = normalizeFigmaSourceUrl(value ?? "");
  if (!normalizedValue) return "";

  try {
    const url = new URL(normalizedValue);
    if (url.protocol === "http:" || url.protocol === "https:") return url.href;
  } catch {
    return "";
  }

  return "";
}

function getStatusText(state: SaveState): string {
  if (state === "loading") return "Loading";
  if (state === "saving") return "Saving";
  if (state === "saved") return "Saved";
  if (state === "error") return "Save failed";
  return "Ready";
}

export function getDefaultFigmaExportComponentTitle(
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

export function getDefaultFigmaSourceUrl(
  parameters: Record<string, unknown> | undefined,
): string | undefined {
  if (!parameters) return undefined;

  return (
    (typeof parameters.figmaSourceUrl === "string"
      ? parameters.figmaSourceUrl
      : undefined) ??
    getParameterUrl(parameters.figma) ??
    getParameterUrl(parameters.design)
  );
}

function getReviewStatusOptions(labels: Required<FigmaReviewLabels>) {
  return [
    { label: labels.notStarted, value: "not-started" },
    { label: labels.exported, value: "exported" },
    { label: labels.imported, value: "imported" },
    { label: labels.needsFix, value: "needs-fix" },
    { label: labels.approved, value: "approved" },
  ] satisfies Array<{ label: string; value: FigmaReviewStatus }>;
}

function defaultMeetingTitle(): string {
  return `Design review ${new Date().toLocaleString()}`;
}

const visualCommentsResumeKeyPrefix = "sbfx:visual-comments-resume:";
const visualCommentsResumeWindowMs = 15_000;

function visualCommentsResumeKey(storyId: string): string {
  return `${visualCommentsResumeKeyPrefix}${storyId}`;
}

function rememberVisualCommentsOpen(storyId: string): void {
  try {
    sessionStorage.setItem(
      visualCommentsResumeKey(storyId),
      String(Date.now() + visualCommentsResumeWindowMs),
    );
  } catch {
    // Session storage can be unavailable in private/restricted contexts.
  }
}

function clearVisualCommentsResume(storyId: string): void {
  try {
    sessionStorage.removeItem(visualCommentsResumeKey(storyId));
  } catch {
    // Session storage can be unavailable in private/restricted contexts.
  }
}

function consumeVisualCommentsResume(storyId: string): boolean {
  try {
    const key = visualCommentsResumeKey(storyId);
    const expiresAt = Number(sessionStorage.getItem(key));
    sessionStorage.removeItem(key);
    return Number.isFinite(expiresAt) && expiresAt >= Date.now();
  } catch {
    return false;
  }
}

function VisualCommentsSection({
  componentTitle,
  enabled,
  labels,
  options,
  storyId,
  storyName,
  storyTitle,
  storyUrl,
}: {
  componentTitle: string;
  enabled: boolean;
  labels: Required<FigmaReviewLabels>;
  options: VisualCommentOptions | undefined;
  storyId: string;
  storyName: string;
  storyTitle: string;
  storyUrl?: string;
}) {
  const detailId = useId();
  const deleteDialogTitleId = useId();
  const deleteDialogDescriptionId = useId();
  const apiPath = options?.apiPath ?? "/__figma_export_review_comments";
  const commentsController = createVisualCommentsController({ apiPath });
  const authorStorageKey = options?.authorStorageKey ?? "sbfx:review-author";
  const [overview, setOverview] = useState<VisualCommentOverview | null>(null);
  const [meetingTitle, setMeetingTitle] = useState(defaultMeetingTitle);
  const [authorName, setAuthorName] = useState(() => {
    try {
      return localStorage.getItem(authorStorageKey) ?? "";
    } catch {
      return "";
    }
  });
  const [commentBody, setCommentBody] = useState("");
  const [pendingCapture, setPendingCapture] =
    useState<VisualCommentCaptureResult | null>(null);
  const [pendingPoint, setPendingPoint] =
    useState<VisualCommentPointSelection | null>(null);
  const [livePinPosition, setLivePinPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [visualError, setVisualError] = useState("");
  const [commentsCapability, setCommentsCapability] = useState<
    "available" | "error" | "loading"
  >("loading");
  const [commentsCapabilityError, setCommentsCapabilityError] = useState("");
  const [reportPending, setReportPending] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentPinDrafts, setCommentPinDrafts] = useState<
    Record<string, VisualCommentPin>
  >({});
  const [commentErrors, setCommentErrors] = useState<Record<string, string>>({});
  const [commentPreviewErrors, setCommentPreviewErrors] = useState<
    Record<string, boolean>
  >({});
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [commentMutationId, setCommentMutationId] = useState<string | null>(null);
  const [pendingDeleteCommentId, setPendingDeleteCommentId] = useState<string | null>(
    null,
  );
  const [isPanelOpen, setIsPanelOpen] = useState(() =>
    consumeVisualCommentsResume(storyId),
  );
  const captureControllerRef = useRef<VisualCommentCaptureController | null>(null);
  const previewDragPointerRef = useRef<number | null>(null);
  const commentPreviewDragRef = useRef<{
    commentId: string;
    pointerId: number;
  } | null>(null);
  const commentEditPinRef = useRef<HTMLButtonElement | null>(null);
  const commentEditTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const commentEditTriggerRef = useRef<HTMLButtonElement | null>(null);
  const deleteCancelRef = useRef<HTMLButtonElement | null>(null);
  const deleteTriggerRef = useRef<HTMLButtonElement | null>(null);
  const commentEditTitleId = useId();
  const recentComments = [...(overview?.comments ?? [])]
    .sort(
      (left, right) =>
        right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id),
    )
    .slice(0, 3);
  const editingComment = recentComments.find(
    (comment) => comment.id === editingCommentId,
  );
  const nextOrdinal = (overview?.activeSession?.commentCount ?? 0) + 1;
  const editingCommentDraft = editingComment
    ? (commentDrafts[editingComment.id] ?? editingComment.body)
    : "";
  const editingCommentPin = editingComment
    ? (commentPinDrafts[editingComment.id] ?? editingComment.preview?.pin ?? null)
    : null;
  const editingCommentHasPreview = Boolean(
    editingComment?.preview &&
      !commentPreviewErrors[editingComment.id] &&
      editingCommentPin,
  );
  const editingCommentDraftIsValid =
    Boolean(editingCommentDraft.trim()) &&
    editingCommentDraft.trim().length <= VISUAL_COMMENT_LIMITS.maxBodyLength;

  async function refresh() {
    setOverview(await commentsController.getOverview(storyId));
    setCommentsCapability("available");
    setCommentsCapabilityError("");
  }

  useEffect(() => {
    if (!enabled || options?.enabled === false) return;
    let active = true;
    const load = async () => {
      try {
        const next = await commentsController.getOverview(storyId);
        if (active) {
          setOverview(next);
          setCommentsCapability("available");
          setCommentsCapabilityError("");
        }
      } catch (error) {
        if (active) {
          setCommentsCapability("error");
          setCommentsCapabilityError(
            error instanceof Error ? error.message : "Unable to load visual comments.",
          );
        }
      }
    };
    void load();
    const interval = window.setInterval(load, 5_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [apiPath, enabled, options?.enabled, storyId]);

  useEffect(
    () => () => {
      captureControllerRef.current?.cancel();
    },
    [],
  );

  useEffect(() => {
    if (isPanelOpen) {
      document.documentElement.dataset.sbfxCommentsOpen = "true";
    } else {
      delete document.documentElement.dataset.sbfxCommentsOpen;
    }
    return () => {
      delete document.documentElement.dataset.sbfxCommentsOpen;
    };
  }, [isPanelOpen]);

  const draftPin = pendingCapture?.pin ?? pendingPoint?.pin ?? null;

  useEffect(() => {
    if (!enabled || options?.enabled === false || !isPanelOpen || !draftPin) {
      setLivePinPosition(null);
      return;
    }
    let animationFrame = 0;
    const syncPosition = () => {
      const target = commentsController.resolveTarget(options?.captureSelector);
      if (!target) {
        setLivePinPosition(null);
        return;
      }
      const rect = target.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        setLivePinPosition(null);
        return;
      }
      setLivePinPosition({
        left: rect.left + rect.width * draftPin.xRatio,
        top: rect.top + rect.height * draftPin.yRatio,
      });
    };
    const scheduleSync = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(syncPosition);
    };
    syncPosition();
    window.addEventListener("resize", scheduleSync);
    document.addEventListener("scroll", scheduleSync, true);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", scheduleSync);
      document.removeEventListener("scroll", scheduleSync, true);
    };
  }, [
    draftPin?.xRatio,
    draftPin?.yRatio,
    enabled,
    isPanelOpen,
    options?.captureSelector,
    options?.enabled,
  ]);

  useEffect(() => {
    if (!pendingDeleteCommentId) return;
    deleteCancelRef.current?.focus();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeDeleteDialog();
    };
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [pendingDeleteCommentId]);

  useEffect(() => {
    if (!editingCommentId) return;
    (commentEditPinRef.current ?? commentEditTextareaRef.current)?.focus();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      cancelCommentEdit(editingCommentId);
    };
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [editingCommentId]);

  useEffect(() => {
    setEditingCommentId(null);
    setCommentDrafts({});
    setCommentPinDrafts({});
    setCommentErrors({});
    setCommentPreviewErrors({});
    commentEditTriggerRef.current = null;
  }, [storyId]);

  if (!enabled || options?.enabled === false) return null;

  async function mutate(path: string, body?: unknown) {
    setIsBusy(true);
    setVisualError("");
    try {
      const payload = await commentsController.post(path, body);
      setReportPending(Boolean(payload.reportStale));
      await refresh();
      return payload;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Visual comments request failed.";
      setCommentsCapability("error");
      setCommentsCapabilityError(message);
      throw error;
    } finally {
      setIsBusy(false);
    }
  }

  function armCapture() {
    if (!overview?.activeSession) return;
    captureControllerRef.current?.cancel();
    setVisualError("");
    setPendingCapture(null);
    setPendingPoint(null);
    setIsCapturing(true);
    captureControllerRef.current = commentsController.beginCapture({
      onCancel: () => {
        setIsCapturing(false);
        setPendingPoint(null);
      },
      onCaptured: (capture) => {
        setPendingCapture(capture);
        setPendingPoint(null);
        setIsCapturing(false);
      },
      onError: (error) => {
        setIsCapturing(false);
        setPendingPoint(null);
        setVisualError(error.message);
      },
      onPointSelected: setPendingPoint,
      selector: options?.captureSelector,
    });
  }

  function cancelCapture() {
    captureControllerRef.current?.cancel();
    captureControllerRef.current = null;
    setIsCapturing(false);
    setPendingCapture(null);
    setPendingPoint(null);
  }

  function updatePendingPin(pin: VisualCommentPin) {
    const normalizedPin = {
      xRatio: clampRatio(pin.xRatio),
      yRatio: clampRatio(pin.yRatio),
    };
    setPendingCapture((current) =>
      current ? { ...current, pin: normalizedPin } : current,
    );
  }

  function updatePendingPinFromPointer(event: DomPointerEvent<HTMLDivElement>) {
    updatePendingPin(
      getVisualCommentPin(
        event.currentTarget.getBoundingClientRect(),
        event.clientX,
        event.clientY,
      ),
    );
  }

  function handlePreviewPointerDown(event: DomPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    if (event.target instanceof HTMLButtonElement) event.target.focus();
    previewDragPointerRef.current = event.pointerId;
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // Synthetic PointerEvents may not have an active browser pointer to capture.
    }
    updatePendingPinFromPointer(event);
  }

  function handlePreviewPointerMove(event: DomPointerEvent<HTMLDivElement>) {
    if (previewDragPointerRef.current !== event.pointerId) return;
    updatePendingPinFromPointer(event);
  }

  function handlePreviewPointerEnd(event: DomPointerEvent<HTMLDivElement>) {
    if (previewDragPointerRef.current !== event.pointerId) return;
    previewDragPointerRef.current = null;
    try {
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // The pointer can already be released after leaving the preview or cancellation.
    }
  }

  function handlePendingPinKeyDown(event: DomKeyboardEvent<HTMLButtonElement>) {
    const step = event.shiftKey ? 0.05 : 0.01;
    let xDelta = 0;
    let yDelta = 0;
    if (event.key === "ArrowLeft") xDelta = -step;
    else if (event.key === "ArrowRight") xDelta = step;
    else if (event.key === "ArrowUp") yDelta = -step;
    else if (event.key === "ArrowDown") yDelta = step;
    else return;
    event.preventDefault();
    setPendingCapture((current) =>
      current
        ? {
            ...current,
            pin: {
              xRatio: clampRatio(current.pin.xRatio + xDelta),
              yRatio: clampRatio(current.pin.yRatio + yDelta),
            },
          }
        : current,
    );
  }

  function togglePanel() {
    if (isPanelOpen && isCapturing) cancelCapture();
    if (isPanelOpen) {
      clearVisualCommentsResume(storyId);
      if (editingCommentId) cancelCommentEdit(editingCommentId, false);
    }
    setIsPanelOpen(!isPanelOpen);
  }

  function preserveOpenPanelDuringMutation() {
    if (isPanelOpen) rememberVisualCommentsOpen(storyId);
  }

  async function submitComment() {
    if (!overview?.activeSession || !pendingCapture || !commentBody.trim()) return;
    const captureRoot = document.querySelector<HTMLElement>(
      options?.captureSelector ?? "#storybook-root",
    );
    const metadataRoot =
      captureRoot?.matches("[data-prototype-root]")
        ? captureRoot
        : captureRoot?.querySelector<HTMLElement>("[data-prototype-root]");
    const request: CreateVisualCommentRequest = {
      authorName: normalizeAuthorName(authorName).slice(
        0,
        VISUAL_COMMENT_LIMITS.maxAuthorLength,
      ),
      body: commentBody.trim().slice(0, VISUAL_COMMENT_LIMITS.maxBodyLength),
      capture: pendingCapture.capture,
      clientRequestId:
        globalThis.crypto?.randomUUID?.() ??
        `comment-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      pin: pendingCapture.pin,
      story: {
        id: storyId,
        name: storyName,
        title: storyTitle || componentTitle,
        ...(storyUrl ? { url: storyUrl } : {}),
        ...(metadataRoot?.dataset.prototypeRoot
          ? { prototypeId: metadataRoot.dataset.prototypeRoot }
          : {}),
        ...(metadataRoot?.dataset.route ? { routeId: metadataRoot.dataset.route } : {}),
        ...(metadataRoot?.dataset.prototypeState
          ? { stateId: metadataRoot.dataset.prototypeState }
          : {}),
      },
      viewport: pendingCapture.viewport,
    };
    try {
      localStorage.setItem(authorStorageKey, authorName);
    } catch {
      // Browser storage can be unavailable in private/restricted contexts.
    }
    try {
      preserveOpenPanelDuringMutation();
      await mutate(
        `/sessions/${encodeURIComponent(overview.activeSession.id)}/comments`,
        request,
      );
      setPendingCapture(null);
      setPendingPoint(null);
      setCommentBody("");
    } catch (error) {
      setVisualError(error instanceof Error ? error.message : "Unable to save comment.");
    }
  }

  function beginCommentEdit(
    commentId: string,
    body: string,
    pin: VisualCommentPin | null,
    trigger: HTMLButtonElement,
  ) {
    commentEditTriggerRef.current = trigger;
    setEditingCommentId(commentId);
    setCommentDrafts({ [commentId]: body });
    setCommentPinDrafts(pin ? { [commentId]: { ...pin } } : {});
    setCommentErrors({ [commentId]: "" });
    setCommentPreviewErrors({});
  }

  function cancelCommentEdit(commentId: string, restoreFocus = true) {
    const returnTarget = commentEditTriggerRef.current;
    setEditingCommentId(null);
    setCommentDrafts((current) => {
      const next = { ...current };
      delete next[commentId];
      return next;
    });
    setCommentPinDrafts((current) => {
      const next = { ...current };
      delete next[commentId];
      return next;
    });
    setCommentErrors((current) => {
      const next = { ...current };
      delete next[commentId];
      return next;
    });
    setCommentPreviewErrors((current) => {
      const next = { ...current };
      delete next[commentId];
      return next;
    });
    commentEditTriggerRef.current = null;
    if (restoreFocus && returnTarget) {
      window.requestAnimationFrame(() => {
        if (returnTarget.isConnected) returnTarget.focus();
      });
    }
  }

  async function saveCommentEdit(commentId: string) {
    if (!overview?.activeSession) return;
    const body = commentDrafts[commentId]?.trim() ?? "";
    if (!body || body.length > VISUAL_COMMENT_LIMITS.maxBodyLength) {
      setCommentErrors((current) => ({
        ...current,
        [commentId]: `Comment must contain 1–${VISUAL_COMMENT_LIMITS.maxBodyLength} characters.`,
      }));
      return;
    }
    setCommentMutationId(commentId);
    setCommentErrors((current) => ({ ...current, [commentId]: "" }));
    try {
      preserveOpenPanelDuringMutation();
      const path = `/sessions/${encodeURIComponent(overview.activeSession.id)}/comments/${encodeURIComponent(commentId)}`;
      const comment = overview.comments.find((entry) => entry.id === commentId);
      const pin = commentPinDrafts[commentId];
      const evidenceImage = document.querySelector<HTMLImageElement>(
        `[data-comment-edit-modal] img[alt="Screenshot evidence for comment ${comment?.ordinal ?? ""}"]`,
      );
      const includePin = Boolean(
        comment?.preview &&
          !commentPreviewErrors[commentId] &&
          evidenceImage?.complete &&
          evidenceImage.naturalWidth > 0 &&
          pin,
      );
      const payload = await commentsController.patch(
        path,
        { body, ...(includePin ? { pin } : {}) },
      );
      setReportPending(Boolean(payload.reportStale));
      await refresh();
      cancelCommentEdit(commentId);
    } catch (error) {
      setCommentErrors((current) => ({
        ...current,
        [commentId]:
          error instanceof Error ? error.message : "Unable to update comment.",
      }));
    } finally {
      setCommentMutationId(null);
    }
  }

  function updateCommentPin(commentId: string, pin: VisualCommentPin) {
    setCommentPinDrafts((current) => ({
      ...current,
      [commentId]: {
        xRatio: clampRatio(pin.xRatio),
        yRatio: clampRatio(pin.yRatio),
      },
    }));
    setCommentErrors((current) => ({ ...current, [commentId]: "" }));
  }

  function updateCommentPinFromPointer(
    commentId: string,
    event: DomPointerEvent<HTMLElement>,
  ) {
    updateCommentPin(
      commentId,
      getVisualCommentPin(
        event.currentTarget.getBoundingClientRect(),
        event.clientX,
        event.clientY,
      ),
    );
  }

  function handleCommentPreviewPointerDown(
    commentId: string,
    event: DomPointerEvent<HTMLElement>,
  ) {
    if (event.button !== 0) return;
    event.preventDefault();
    if (event.target instanceof HTMLButtonElement) event.target.focus();
    commentPreviewDragRef.current = { commentId, pointerId: event.pointerId };
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // Synthetic PointerEvents may not have an active browser pointer to capture.
    }
    updateCommentPinFromPointer(commentId, event);
  }

  function handleCommentPreviewPointerMove(
    commentId: string,
    event: DomPointerEvent<HTMLElement>,
  ) {
    const drag = commentPreviewDragRef.current;
    if (drag?.commentId !== commentId || drag.pointerId !== event.pointerId) return;
    updateCommentPinFromPointer(commentId, event);
  }

  function handleCommentPreviewPointerEnd(
    commentId: string,
    event: DomPointerEvent<HTMLElement>,
  ) {
    const drag = commentPreviewDragRef.current;
    if (drag?.commentId !== commentId || drag.pointerId !== event.pointerId) return;
    commentPreviewDragRef.current = null;
    try {
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // The pointer can already be released after leaving the preview or cancellation.
    }
  }

  function handleCommentPinKeyDown(
    commentId: string,
    event: DomKeyboardEvent<HTMLElement>,
  ) {
    const step = event.shiftKey ? 0.05 : 0.01;
    let xDelta = 0;
    let yDelta = 0;
    if (event.key === "ArrowLeft") xDelta = -step;
    else if (event.key === "ArrowRight") xDelta = step;
    else if (event.key === "ArrowUp") yDelta = -step;
    else if (event.key === "ArrowDown") yDelta = step;
    else return;
    event.preventDefault();
    setCommentPinDrafts((current) => {
      const pin = current[commentId];
      return pin
        ? {
            ...current,
            [commentId]: {
              xRatio: clampRatio(pin.xRatio + xDelta),
              yRatio: clampRatio(pin.yRatio + yDelta),
            },
          }
        : current;
    });
    setCommentErrors((current) => ({ ...current, [commentId]: "" }));
  }

  function openDeleteDialog(commentId: string, trigger: HTMLButtonElement) {
    deleteTriggerRef.current = trigger;
    setPendingDeleteCommentId(commentId);
    setCommentErrors((current) => ({ ...current, [commentId]: "" }));
  }

  function closeDeleteDialog(restoreFocus = true) {
    const returnTarget = deleteTriggerRef.current;
    setPendingDeleteCommentId(null);
    deleteTriggerRef.current = null;
    if (restoreFocus && returnTarget) {
      window.requestAnimationFrame(() => returnTarget.focus());
    }
  }

  async function confirmDeleteComment() {
    if (!overview?.activeSession || !pendingDeleteCommentId) return;
    const commentId = pendingDeleteCommentId;
    setCommentMutationId(commentId);
    setCommentErrors((current) => ({ ...current, [commentId]: "" }));
    try {
      preserveOpenPanelDuringMutation();
      const path = `/sessions/${encodeURIComponent(overview.activeSession.id)}/comments/${encodeURIComponent(commentId)}`;
      const payload = await commentsController.delete(path);
      setReportPending(Boolean(payload.reportStale));
      closeDeleteDialog(false);
      cancelCommentEdit(commentId);
      await refresh();
    } catch (error) {
      closeDeleteDialog();
      setCommentErrors((current) => ({
        ...current,
        [commentId]:
          error instanceof Error ? error.message : "Unable to delete comment.",
      }));
    } finally {
      setCommentMutationId(null);
    }
  }

  return h(
    Fragment,
    null,
    h(
    "aside",
    {
      "aria-label": labels.visualComments,
      className: "sbfx-review sbfx-comments-panel",
      "data-expanded": isPanelOpen ? "true" : "false",
      "data-sbfx-capture-ignore": "true",
      "data-version": getAddonVersion(),
    },
    h(
      "header",
      { className: "sbfx-comments-panel__header" },
      h(
        "div",
        {
          className: "sbfx-comments-panel__header-copy",
          hidden: !isPanelOpen,
        },
        h(
          "h2",
          { className: "sbfx-review__label sbfx-comments-panel__subheading" },
          labels.visualComments,
        ),
        overview?.reportUrl
          ? h(
              "a",
              {
                className:
                  "sbfx-review__button sbfx-review__button--secondary sbfx-review__report-link sbfx-comments-panel__reports",
                href: overview.reportUrl,
                rel: "noreferrer",
                target: "_blank",
              },
              "Reports",
            )
          : null,
      ),
      h(
        "button",
        {
          "aria-controls": detailId,
          "aria-expanded": isPanelOpen,
          "aria-label": isPanelOpen ? labels.closeVisualComments : labels.openVisualComments,
          className: "sbfx-review__icon-button sbfx-comments-panel__toggle",
          onClick: togglePanel,
          title: isPanelOpen ? labels.closeVisualComments : labels.openVisualComments,
          type: "button",
        },
        h(EditIcon, { size: 14 }),
      ),
    ),
    h(
      "section",
    {
      className: "sbfx-review__visual-comments sbfx-comments-panel__detail",
      "data-comments-capability": commentsCapability,
      hidden: !isPanelOpen,
      id: detailId,
    },
    overview?.activeSession
      ? h(
          Fragment,
          null,
          h(
            "div",
            { className: "sbfx-review__meeting" },
            h(
              "span",
              { className: "sbfx-review__meeting-title" },
              overview.activeSession.title,
            ),
          ),
          h(
            "p",
            { className: "sbfx-review__meta" },
            `${overview.activeSession.captureCount} capture${overview.activeSession.captureCount === 1 ? "" : "s"} · ${overview.activeSession.commentCount} comment${overview.activeSession.commentCount === 1 ? "" : "s"}`,
          ),
          isCapturing
            ? h(
                "div",
                { className: "sbfx-review__capture-prompt" },
                h("p", null, "Click the UI point to capture. Press Escape to cancel."),
                h(
                  "button",
                  {
                    className: "sbfx-review__button sbfx-review__button--secondary",
                    onClick: cancelCapture,
                    type: "button",
                  },
                  labels.cancelCapture,
                ),
              )
            : pendingCapture
              ? h(
                  "div",
                  { className: "sbfx-review__composer" },
                  h(
                    "div",
                    {
                      className: "sbfx-review__snapshot-preview",
                      "data-pending-comment-preview": "true",
                      onPointerCancel: handlePreviewPointerEnd,
                      onPointerDown: handlePreviewPointerDown,
                      onPointerMove: handlePreviewPointerMove,
                      onPointerUp: handlePreviewPointerEnd,
                      style: {
                        aspectRatio: `${pendingCapture.capture.width}/${pendingCapture.capture.height}`,
                      },
                    },
                    h("img", { alt: "Captured UI", src: pendingCapture.capture.dataUrl }),
                    h("button", {
                      "aria-label": `${labels.adjustCommentPoint} ${nextOrdinal}`,
                      "aria-describedby": `${detailId}-point-hint`,
                      className: "sbfx-review__pin sbfx-review__pin--editable",
                      "data-pending-comment-pin": "true",
                      onKeyDown: handlePendingPinKeyDown,
                      style: {
                        left: `${pendingCapture.pin.xRatio * 100}%`,
                        top: `${pendingCapture.pin.yRatio * 100}%`,
                      },
                      type: "button",
                    }, nextOrdinal),
                  ),
                  h(
                    "p",
                    {
                      className: "sbfx-review__meta sbfx-review__point-hint",
                      id: `${detailId}-point-hint`,
                    },
                    labels.adjustCommentPointHint,
                  ),
                  h(
                    "label",
                    { className: "sbfx-review__field" },
                    h("span", null, labels.authorName),
                    h("input", {
                      maxLength: VISUAL_COMMENT_LIMITS.maxAuthorLength,
                      onChange: (event: DomInputEvent<HTMLInputElement>) =>
                        setAuthorName((event.currentTarget as HTMLInputElement).value),
                      value: authorName,
                    }),
                  ),
                  h(
                    "label",
                    { className: "sbfx-review__field" },
                    h("span", null, labels.commentBody),
                    h("textarea", {
                      maxLength: VISUAL_COMMENT_LIMITS.maxBodyLength,
                      onChange: (event: DomInputEvent<HTMLTextAreaElement>) =>
                        setCommentBody((event.currentTarget as HTMLTextAreaElement).value),
                      rows: 2,
                      value: commentBody,
                    }),
                  ),
                  h(
                    "div",
                    { className: "sbfx-review__visual-actions" },
                    h(
                      "button",
                      {
                        className: "sbfx-review__button",
                        disabled:
                          commentsCapability !== "available" || isBusy || !commentBody.trim(),
                        onClick: () => void submitComment(),
                        type: "button",
                      },
                      labels.submitComment,
                    ),
                    h(
                      "button",
                      {
                        className: "sbfx-review__button sbfx-review__button--secondary",
                        onClick: cancelCapture,
                        type: "button",
                      },
                      labels.closeNotes,
                    ),
                  ),
                )
              : h(
                  "div",
                  { className: "sbfx-review__visual-actions" },
                  h(
                    "button",
                    {
                      className: "sbfx-review__button",
                      disabled: commentsCapability !== "available" || isBusy,
                      onClick: armCapture,
                      type: "button",
                    },
                    labels.addVisualComment,
                  ),
                  h(
                    "button",
                    {
                      className: "sbfx-review__button sbfx-review__button--secondary",
                      disabled: commentsCapability !== "available" || isBusy,
                      onClick: () => {
                        preserveOpenPanelDuringMutation();
                        void mutate(
                          `/sessions/${encodeURIComponent(overview.activeSession!.id)}/close`,
                        ).catch((error: unknown) =>
                          setVisualError(
                            error instanceof Error ? error.message : "Unable to end meeting.",
                          ),
                        );
                      },
                      type: "button",
                    },
                    labels.endMeeting,
                  ),
                ),
          overview.comments.length
            ? h(
                Fragment,
                null,
                h(
                  "p",
                  { className: "sbfx-review__meta" },
                  `${overview.comments.length} comment${overview.comments.length === 1 ? "" : "s"} on this story`,
                ),
                h(
                  "div",
                  {
                    "aria-label": "Recent comments",
                    className: "sbfx-comments-panel__recent",
                  },
                  ...recentComments.map((comment) => {
                    const isCommentBusy = commentMutationId === comment.id;
                    return h(
                      "article",
                      {
                        className: "sbfx-comments-panel__comment",
                        "data-comment-id": comment.id,
                        key: comment.id,
                      },
                      h(
                        "div",
                        { className: "sbfx-comments-panel__comment-meta" },
                        h("strong", null, comment.authorName),
                        h(
                          "span",
                          {
                            className: `sbfx-comments-panel__comment-status${comment.resolvedAt ? " sbfx-comments-panel__comment-status--completed" : ""}`,
                          },
                          comment.resolvedAt ? "Completed" : "Open",
                        ),
                        h(
                          "time",
                          { dateTime: comment.createdAt },
                          new Date(comment.createdAt).toLocaleString(),
                        ),
                      ),
                      h(
                        "p",
                        { className: "sbfx-comments-panel__comment-body" },
                        comment.body,
                      ),
                      h(
                        "div",
                        { className: "sbfx-comments-panel__comment-actions" },
                        h(
                          "button",
                          {
                            "aria-label": labels.editComment,
                            className:
                              "sbfx-review__icon-button sbfx-comments-panel__comment-action",
                            disabled: isCommentBusy,
                            onClick: (event: DomMouseEvent<HTMLButtonElement>) =>
                              beginCommentEdit(
                                comment.id,
                                comment.body,
                                comment.preview?.pin ?? null,
                                event.currentTarget as HTMLButtonElement,
                              ),
                            title: labels.editComment,
                            type: "button",
                          },
                          h(EditIcon, { size: 14 }),
                        ),
                        h(
                          "button",
                          {
                            "aria-label": labels.deleteComment,
                            className:
                              "sbfx-review__icon-button sbfx-comments-panel__comment-action sbfx-comments-panel__comment-action--delete",
                            disabled: isCommentBusy,
                            onClick: (event: DomMouseEvent<HTMLButtonElement>) =>
                              openDeleteDialog(
                                comment.id,
                                event.currentTarget as HTMLButtonElement,
                              ),
                            title: labels.deleteComment,
                            type: "button",
                          },
                          h(TrashIcon, { size: 14 }),
                        ),
                      ),
                    );
                  }),
                ),
              )
            : null,
        )
      : h(
          "div",
          { className: "sbfx-review__meeting-start" },
          h("input", {
            "aria-label": "Meeting title",
            maxLength: VISUAL_COMMENT_LIMITS.maxTitleLength,
            onChange: (event: DomInputEvent<HTMLInputElement>) =>
              setMeetingTitle((event.currentTarget as HTMLInputElement).value),
            value: meetingTitle,
          }),
          h(
            "button",
            {
              className: "sbfx-review__button",
              disabled:
                commentsCapability !== "available" || isBusy || !meetingTitle.trim(),
              onClick: () => {
                preserveOpenPanelDuringMutation();
                void mutate("/sessions", { title: meetingTitle }).catch(
                  (error: unknown) => {
                    setVisualError(
                      error instanceof Error ? error.message : "Unable to start meeting.",
                    );
                    void refresh().catch(() => undefined);
                  },
                );
              },
              type: "button",
            },
            labels.startMeeting,
          ),
        ),
    overview?.recentSessions.length
      ? h(
          "section",
          {
            "aria-label": "Recent meetings",
            className: "sbfx-comments-panel__recent-meetings",
          },
          h("h3", { className: "sbfx-review__label" }, "Recent meetings"),
          ...overview.recentSessions.slice(0, 5).map((session) =>
            h(
              "article",
              {
                className: "sbfx-comments-panel__meeting-history",
                "data-meeting-id": session.id,
                key: session.id,
              },
              h("strong", null, session.title),
              h(
                "span",
                { className: "sbfx-review__meta" },
                `${session.commentCount} comment${session.commentCount === 1 ? "" : "s"}`,
              ),
              h(
                "a",
                {
                  className:
                    "sbfx-review__button sbfx-review__button--secondary",
                  href: `${apiPath}/reports/sessions/${encodeURIComponent(session.id)}/index.html`,
                  rel: "noreferrer",
                  target: "_blank",
                },
                "Open report",
              ),
            ),
          ),
        )
      : null,
    reportPending
      ? h("p", { className: "sbfx-review__error" }, "Comment saved; report rebuild pending.")
      : null,
    visualError ? h("p", { className: "sbfx-review__error" }, visualError) : null,
    commentsCapabilityError
      ? h("p", { className: "sbfx-review__error" }, commentsCapabilityError)
      : null,
    ),
    editingComment
      ? createPortal(h(
          "div",
          {
            className: "sbfx-comments-panel__edit-backdrop",
            "data-comment-edit-modal": "true",
            "data-sbfx-capture-ignore": "true",
            onClick: (event: DomMouseEvent<HTMLDivElement>) => {
              if (event.target === event.currentTarget) {
                cancelCommentEdit(editingComment.id);
              }
            },
          },
          h(
            "div",
            {
              "aria-labelledby": commentEditTitleId,
              "aria-modal": "true",
              className: "sbfx-comments-panel__edit-modal",
              role: "dialog",
            },
            h(
              "h2",
              {
                className: "sbfx-comments-panel__edit-heading",
                id: commentEditTitleId,
              },
              `${labels.editComment} ${editingComment.ordinal}`,
            ),
            editingCommentHasPreview && editingComment.preview && editingCommentPin
              ? h(
                  "div",
                  {
                    className:
                      "sbfx-review__snapshot-preview sbfx-comments-panel__edit-preview",
                    "data-comment-evidence-preview": "true",
                    "data-comment-edit-preview": "true",
                    onPointerCancel: (event: DomPointerEvent<HTMLElement>) =>
                      handleCommentPreviewPointerEnd(editingComment.id, event),
                    onPointerDown: (event: DomPointerEvent<HTMLElement>) =>
                      handleCommentPreviewPointerDown(editingComment.id, event),
                    onPointerMove: (event: DomPointerEvent<HTMLElement>) =>
                      handleCommentPreviewPointerMove(editingComment.id, event),
                    onPointerUp: (event: DomPointerEvent<HTMLElement>) =>
                      handleCommentPreviewPointerEnd(editingComment.id, event),
                    style: {
                      aspectRatio: `${editingComment.preview.width}/${editingComment.preview.height}`,
                    },
                  },
                  h("img", {
                    alt: `Screenshot evidence for comment ${editingComment.ordinal}`,
                    onError: () => {
                      setCommentPreviewErrors((current) => ({
                        ...current,
                        [editingComment.id]: true,
                      }));
                      setCommentPinDrafts((current) => {
                        const next = { ...current };
                        delete next[editingComment.id];
                        return next;
                      });
                      window.requestAnimationFrame(() =>
                        commentEditTextareaRef.current?.focus(),
                      );
                    },
                    src: editingComment.preview.imageUrl,
                  }),
                  h(
                    "button",
                    {
                      "aria-describedby": `${commentEditTitleId}-point-hint`,
                      "aria-label": `${labels.adjustCommentPoint} ${editingComment.ordinal}`,
                      className: "sbfx-review__pin sbfx-review__pin--editable",
                      "data-comment-edit-pin": "true",
                      onKeyDown: (event: DomKeyboardEvent<HTMLElement>) =>
                        handleCommentPinKeyDown(editingComment.id, event),
                      ref: commentEditPinRef,
                      style: {
                        left: `${editingCommentPin.xRatio * 100}%`,
                        top: `${editingCommentPin.yRatio * 100}%`,
                      },
                      type: "button",
                    },
                    editingComment.ordinal,
                  ),
                )
              : h(
                  "p",
                  {
                    className: "sbfx-review__evidence-unavailable",
                    "data-comment-evidence-unavailable": "true",
                  },
                  labels.evidenceUnavailable,
                ),
            editingCommentHasPreview
              ? h(
                  "p",
                  {
                    className: "sbfx-review__meta sbfx-review__point-hint",
                    id: `${commentEditTitleId}-point-hint`,
                  },
                  labels.adjustCommentPointHint,
                )
              : null,
            h(
              "label",
              { className: "sbfx-review__field" },
              h("span", null, labels.commentBody),
              h("textarea", {
                maxLength: VISUAL_COMMENT_LIMITS.maxBodyLength,
                onChange: (event: DomInputEvent<HTMLTextAreaElement>) => {
                  const value = (event.currentTarget as HTMLTextAreaElement).value;
                  setCommentDrafts((current) => ({
                    ...current,
                    [editingComment.id]: value,
                  }));
                  setCommentErrors((current) => ({
                    ...current,
                    [editingComment.id]: "",
                  }));
                },
                ref: commentEditTextareaRef,
                rows: 3,
                value: editingCommentDraft,
              }),
            ),
            commentErrors[editingComment.id]
              ? h(
                  "p",
                  {
                    "aria-live": "polite",
                    className: "sbfx-review__error",
                  },
                  commentErrors[editingComment.id],
                )
              : null,
            h(
              "div",
              { className: "sbfx-comments-panel__edit-actions" },
              h(
                "button",
                {
                  className: "sbfx-review__button",
                  "data-comment-edit-save": "true",
                  disabled:
                    commentMutationId === editingComment.id ||
                    !editingCommentDraftIsValid,
                  onClick: () => void saveCommentEdit(editingComment.id),
                  type: "button",
                },
                labels.saveCommentChanges,
              ),
              h(
                "button",
                {
                  className: "sbfx-review__button sbfx-review__button--secondary",
                  "data-comment-edit-cancel": "true",
                  disabled: commentMutationId === editingComment.id,
                  onClick: () => cancelCommentEdit(editingComment.id),
                  type: "button",
                },
                labels.cancelCommentEdit,
              ),
            ),
          ),
        ), document.body)
      : null,
    pendingDeleteCommentId
      ? h(
          "div",
          {
            "aria-describedby": deleteDialogDescriptionId,
            "aria-labelledby": deleteDialogTitleId,
            "aria-modal": "true",
            className: "sbfx-comments-panel__dialog-backdrop",
            onClick: (event: DomMouseEvent<HTMLDivElement>) => {
              if (event.target === event.currentTarget) closeDeleteDialog();
            },
            role: "dialog",
          },
          h(
            "div",
            { className: "sbfx-comments-panel__dialog" },
            h("h2", { id: deleteDialogTitleId }, labels.deleteCommentTitle),
            h(
              "p",
              { id: deleteDialogDescriptionId },
              labels.deleteCommentDescription,
            ),
            h(
              "div",
              { className: "sbfx-comments-panel__dialog-actions" },
              h(
                "button",
                {
                  className: "sbfx-review__button sbfx-review__button--secondary",
                  "data-comment-delete-cancel": "true",
                  onClick: () => closeDeleteDialog(),
                  ref: deleteCancelRef,
                  type: "button",
                },
                labels.cancelDelete,
              ),
              h(
                "button",
                {
                  className:
                    "sbfx-review__button sbfx-comments-panel__delete-confirm",
                  "data-comment-delete-confirm": "true",
                  disabled: commentMutationId === pendingDeleteCommentId,
                  onClick: () => void confirmDeleteComment(),
                  type: "button",
                },
                labels.confirmDelete,
              ),
            ),
          ),
        )
      : null,
    ),
    isPanelOpen && livePinPosition
      ? h(
          "span",
          {
            "aria-hidden": "true",
            className: "sbfx-review__pin sbfx-review__live-pin",
            "data-sbfx-capture-ignore": "true",
            "data-sbfx-live-comment-pin": "true",
            style: {
              left: `${livePinPosition.left}px`,
              top: `${livePinPosition.top}px`,
            },
          },
          nextOrdinal,
        )
      : null,
  );
}

export function FigmaExportReview({
  apiPath = defaultFigmaReviewStatusApiPath,
  autoMarkExported = true,
  componentTitle,
  enabled,
  figmaSourceUrl,
  labels: labelsOverride,
  showNotes = true,
  storyId,
  storyName,
  storyTitle,
  storyUrl,
  viewMode = "story",
  visualComments,
}: FigmaExportReviewProps) {
  const labels = { ...defaultLabels, ...labelsOverride };
  const reviewStatusController = createReviewStatusController({ apiPath });
  const initialFigmaSourceUrl = normalizeFigmaSourceUrl(figmaSourceUrl ?? "");
  const [entry, setEntry] = useState<FigmaReviewEntry>(() => normalizeEntry(null));
  const [draftDetails, setDraftDetails] = useState(() => ({
    figmaNodeUrl: initialFigmaSourceUrl,
    notes: "",
  }));
  const [isSourceEditing, setIsSourceEditing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() =>
    readCollapsePreference(reviewCollapseStorageKey),
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [workspaceSlot, setWorkspaceSlot] = useState<HTMLElement | null>(null);
  const autoExportStoryRef = useRef<string | undefined>(undefined);
  const entryRef = useRef(entry);
  const saveQueueRef = useRef(Promise.resolve());
  const shouldShowPanel = enabled && Boolean(storyId);

  useEffect(() => {
    if (!shouldShowPanel) {
      setWorkspaceSlot(null);
      return;
    }

    const workspace: FigmaWorkspaceSlotHandle = acquireFigmaWorkspaceSlot("review");
    setWorkspaceSlot(workspace.slot);
    return () => {
      setWorkspaceSlot(null);
      workspace.release();
    };
  }, [shouldShowPanel]);

  useEffect(() => {
    entryRef.current = entry;
  }, [entry]);

  useEffect(() => {
    if (!enabled || !storyId) return;

    const controller = new AbortController();
    setSaveState("loading");
    setErrorMessage("");

    async function loadReviewStatus() {
      try {
        const savedEntryPayload = await reviewStatusController.load(
          storyId,
          controller.signal,
        );
        const savedFigmaNodeUrl = normalizeFigmaSourceUrl(
          savedEntryPayload?.figmaNodeUrl ?? "",
        );
        const nextEntry = normalizeEntry({
          ...(savedEntryPayload ?? {}),
          figmaNodeUrl: savedFigmaNodeUrl || initialFigmaSourceUrl,
        });
        entryRef.current = nextEntry;
        setEntry(nextEntry);
        setDraftDetails({
          figmaNodeUrl: nextEntry.figmaNodeUrl ?? "",
          notes: nextEntry.notes ?? "",
        });
        setIsSourceEditing(false);
        setSaveState("idle");
      } catch (error) {
        if (controller.signal.aborted) return;
        setSaveState("error");
        setErrorMessage(error instanceof Error ? error.message : "Unable to load status.");
      }
    }

    void loadReviewStatus();

    return () => {
      controller.abort();
    };
  }, [apiPath, enabled, initialFigmaSourceUrl, storyId]);

  async function saveReviewStatus(patch: Partial<FigmaReviewEntry>) {
    const nextEntry = normalizeEntry({
      ...entryRef.current,
      ...patch,
      componentTitle,
      name: storyName,
      storyTitle,
    });

    entryRef.current = nextEntry;
    setEntry(nextEntry);
    setSaveState("saving");
    setErrorMessage("");

    saveQueueRef.current = saveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const entryToSave = entryRef.current;
        const payload = await reviewStatusController.save(storyId, entryToSave);
        const savedEntry = normalizeEntry(payload.entry ?? entryToSave);
        entryRef.current = savedEntry;
        setEntry(savedEntry);
        setDraftDetails({
          figmaNodeUrl: savedEntry.figmaNodeUrl ?? "",
          notes: savedEntry.notes ?? "",
        });
        setSaveState("saved");
      })
      .catch((error: unknown) => {
        setSaveState("error");
        setErrorMessage(error instanceof Error ? error.message : "Unable to save status.");
      });

    await saveQueueRef.current;
  }

  useEffect(() => {
    if (!enabled || !storyId || !autoMarkExported) return;

    const markExported = () => {
      if (autoExportStoryRef.current === storyId) return;
      if (entry.figmaReviewStatus !== "not-started") return;

      const exporter = document.querySelector<HTMLElement>(".sbfx-exporter");
      const summary = exporter?.querySelector<HTMLElement>(".sbfx-exporter__summary");
      if (
        exporter?.dataset.status === "copied" &&
        summary?.textContent?.includes("JSON copied")
      ) {
        autoExportStoryRef.current = storyId;
        void saveReviewStatus({ figmaReviewStatus: "exported" });
      }
    };

    const observer = new MutationObserver(markExported);
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
    });
    markExported();

    return () => {
      observer.disconnect();
    };
  }, [autoMarkExported, enabled, entry.figmaReviewStatus, storyId]);

  const openableFigmaSourceUrl = getOpenableUrl(entry.figmaNodeUrl);
  const shouldEditFigmaSource = isSourceEditing || !openableFigmaSourceUrl;

  function toggleCollapsed() {
    setIsCollapsed((current) => {
      const next = !current;
      writeCollapsePreference(reviewCollapseStorageKey, next);
      return next;
    });
  }

  function saveFigmaSourceUrl() {
    const figmaNodeUrl = normalizeFigmaSourceUrl(draftDetails.figmaNodeUrl);
    setDraftDetails((current) => ({
      ...current,
      figmaNodeUrl,
    }));
    setIsSourceEditing(!figmaNodeUrl);
    void saveReviewStatus({ figmaNodeUrl });
  }

  const reviewStatusOptions = getReviewStatusOptions(labels);

  return h(
    Fragment,
    null,
    shouldShowPanel && workspaceSlot
      ? createPortal(h(
          "aside",
          {
            "aria-label": "Figma export review",
            className: "sbfx-review",
            "data-collapsed": isCollapsed ? "true" : "false",
            "data-sbfx-capture-ignore": "true",
            "data-save-state": saveState,
            "data-version": getAddonVersion(),
          },
          h(
            "header",
            { className: "sbfx-review__header" },
            h(
              "span",
              { "aria-hidden": "true", className: "sbfx-review__mark" },
              h(EyeIcon, { size: 14 }),
            ),
            h(
              "span",
              { className: "sbfx-review__heading" },
              h(
                "span",
                { className: "sbfx-review__title" },
                labels.title,
              ),
              h(
                "span",
                { className: "sbfx-review__subtitle", title: componentTitle },
                componentTitle,
              ),
            ),
            h(
              "span",
              { className: "sbfx-review__status" },
              h("span", { "aria-hidden": "true", className: "sbfx-review__status-dot" }),
              getStatusText(saveState),
            ),
            h(
              "button",
              {
                "aria-expanded": !isCollapsed,
                "aria-label": isCollapsed
                  ? "Expand export review panel"
                  : "Collapse export review panel",
                className: "sbfx-review__toggle",
                onClick: toggleCollapsed,
                title: isCollapsed
                  ? "Expand export review panel"
                  : "Collapse export review panel",
                type: "button",
              },
              isCollapsed
                ? UnfoldMoreDisclosureIcon()
                : h(CollapseIcon, { "aria-hidden": "true", size: 14 }),
            ),
          ),
          h(
            "div",
            { className: "sbfx-review__body" },
            h(
              "label",
              { className: "sbfx-review__field" },
              h("span", null, labels.review),
              h(
                "select",
                {
                  onChange: (event: DomInputEvent<HTMLSelectElement>) => {
                    void saveReviewStatus({
                      figmaReviewStatus: (event.currentTarget as HTMLSelectElement)
                        .value as FigmaReviewStatus,
                    });
                  },
                  value: entry.figmaReviewStatus,
                },
                ...reviewStatusOptions.map((option) =>
                  h("option", { key: option.value, value: option.value }, option.label),
                ),
              ),
            ),
          ),
          shouldEditFigmaSource
            ? h(
                "label",
                { className: "sbfx-review__field" },
                h("span", null, labels.figmaSource),
                h("input", {
                  onBlur: saveFigmaSourceUrl,
                  onChange: (event: DomInputEvent<HTMLInputElement>) => {
                    const figmaNodeUrl = (event.currentTarget as HTMLInputElement).value;
                    setDraftDetails((current) => ({
                      ...current,
                      figmaNodeUrl,
                    }));
                  },
                  onKeyDown: (event: DomKeyboardEvent<HTMLInputElement>) => {
                    if (event.key === "Enter") {
                      (event.currentTarget as HTMLInputElement).blur();
                    }
                  },
                  placeholder: labels.sourcePlaceholder,
                  type: "url",
                  value: draftDetails.figmaNodeUrl,
                }),
              )
            : h(
                "div",
                { className: "sbfx-review__source" },
                h("span", { className: "sbfx-review__label" }, labels.figmaSource),
                h(
                  "div",
                  { className: "sbfx-review__source-actions" },
                  h(
                    "a",
                    {
                      className: "sbfx-review__button sbfx-review__button--outline",
                      href: openableFigmaSourceUrl,
                      rel: "noreferrer",
                      target: "_blank",
                    },
                    h(LinkIcon, { size: 14 }),
                    labels.openSource,
                  ),
                  h(
                    "button",
                    {
                      "aria-label": labels.editFigmaSource,
                      className: "sbfx-review__icon-button",
                      onClick: () => setIsSourceEditing(true),
                      type: "button",
                    },
                    h(EditIcon, { size: 14 }),
                  ),
                ),
              ),
          showNotes
            ? h(
                "div",
                { className: "sbfx-review__notes" },
                h(
                  "button",
                  {
                    "aria-expanded": entry.notesOpen,
                    className: "sbfx-review__button sbfx-review__button--secondary sbfx-review__notes-toggle",
                    onClick: () => {
                      void saveReviewStatus({ notesOpen: !entry.notesOpen });
                    },
                    type: "button",
                  },
                  h("span", null, labels.notes),
                  h(
                    "span",
                    { className: "sbfx-review__notes-state" },
                    entry.notesOpen ? labels.closeNotes : labels.openNotes,
                  ),
                ),
                entry.notesOpen
                  ? h(
                      "label",
                      { className: "sbfx-review__field" },
                      h("textarea", {
                        onBlur: () => {
                          void saveReviewStatus({ notes: draftDetails.notes });
                        },
                        onChange: (event: DomInputEvent<HTMLTextAreaElement>) => {
                          const notes = (event.currentTarget as HTMLTextAreaElement).value;
                          setDraftDetails((current) => ({
                            ...current,
                            notes,
                          }));
                        },
                        rows: 2,
                        value: draftDetails.notes,
                      }),
                    )
                  : draftDetails.notes
                    ? h("p", { className: "sbfx-review__notes-summary" }, labels.notesSaved)
                    : null,
              )
            : null,
          entry.updatedAt
            ? h(
                "p",
                { className: "sbfx-review__meta" },
                `Updated ${new Date(entry.updatedAt).toLocaleString()}`,
              )
            : null,
          errorMessage
            ? h("p", { className: "sbfx-review__error" }, errorMessage)
            : null,
        ), workspaceSlot)
      : null,
    shouldShowPanel && viewMode === "story" && typeof document !== "undefined"
      ? createPortal(
          h(VisualCommentsSection, {
            componentTitle,
            enabled,
            labels,
            options: visualComments,
            storyId,
            storyName,
            storyTitle,
            storyUrl,
          }),
          document.body,
        )
      : null,
  );
}

export function createFigmaExportReviewDecorator(
  figmaExportOptions?: FigmaExportAddonOptions,
  reviewOptions?: FigmaExportReviewOptions,
) {
  const figmaExportDecorator = createFigmaExportDecorator(figmaExportOptions);
  const resolvedOptions = resolveFigmaExportAddonOptions(figmaExportOptions);

  return (Story: StorybookStory, context: StorybookContext) => {
    const storyResult = figmaExportDecorator(Story, context);
    const includedStory = isStoryIncludedForFigmaExport(
      context.title,
      resolvedOptions,
    );
    const componentTitle =
      reviewOptions?.getComponentTitle?.(context, resolvedOptions) ??
      getDefaultFigmaExportComponentTitle(context.title, resolvedOptions);
    const figmaSourceUrl =
      reviewOptions?.getFigmaSourceUrl?.(context, componentTitle) ??
      getDefaultFigmaSourceUrl(context.parameters);
    const enabled =
      reviewOptions?.enabled !== false &&
      includedStory &&
      context.globals?.[resolvedOptions.globalName] === "on";

    syncFigmaReviewWorkspace({
      apiPath: reviewOptions?.apiPath,
      autoMarkExported: reviewOptions?.autoMarkExported,
      componentTitle,
      enabled,
      figmaSourceUrl,
      labels: reviewOptions?.labels,
      showNotes: reviewOptions?.showNotes,
      storyId: context.id ?? "unknown-story",
      storyName: context.name ?? "Story",
      storyTitle: context.title ?? "",
      storyUrl: typeof window === "undefined" ? undefined : window.location.href,
      viewMode: context.viewMode,
      visualComments: reviewOptions?.visualComments ?? resolvedOptions.visualComments,
    });
    return storyResult;
  };
}

let reviewDomRoot: ReturnType<typeof mountDom> | undefined;
let reviewDomHost: HTMLElement | undefined;

function syncFigmaReviewWorkspace(props: FigmaExportReviewProps): void {
  if (typeof document === "undefined") return;
  if (!props.enabled) {
    destroyFigmaReviewWorkspace();
    return;
  }
  if (!reviewDomHost?.isConnected) {
    reviewDomHost = document.createElement("div");
    reviewDomHost.dataset.sbfxReviewHost = "true";
    reviewDomHost.dataset.sbfxCaptureIgnore = "true";
    document.body.append(reviewDomHost);
    reviewDomRoot = mountDom(
      FigmaExportReview as unknown as (
        props: Record<string, unknown>,
      ) => DomChild,
      props as unknown as Record<string, unknown>,
      reviewDomHost,
    );
    return;
  }
  reviewDomRoot?.update(props as unknown as Record<string, unknown>);
}

export function destroyFigmaReviewWorkspace(): void {
  reviewDomRoot?.destroy();
  reviewDomRoot = undefined;
  reviewDomHost = undefined;
}

const hotModule = (
  import.meta as ImportMeta & {
    hot?: { dispose(callback: () => void): void };
  }
).hot;
if (hotModule) {
  hotModule.dispose(destroyFigmaReviewWorkspace);
}
