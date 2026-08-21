import { EditIcon, FigmaIcon, LinkIcon } from "@storybook/icons";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

export type FigmaReviewStatus =
  | "not-started"
  | "exported"
  | "imported"
  | "needs-fix"
  | "approved";

export type FigmaReviewEntry = {
  componentTitle?: string;
  figmaNodeUrl?: string;
  figmaReviewStatus: FigmaReviewStatus;
  name?: string;
  notes?: string;
  notesOpen?: boolean;
  storyTitle?: string;
  updatedAt?: string;
};

type FigmaExportReviewProps = {
  apiPath?: string;
  children?: ReactNode;
  componentTitle: string;
  enabled: boolean;
  figmaSourceUrl?: string;
  storyId: string;
  storyName: string;
  storyTitle: string;
};

type SaveState = "error" | "idle" | "loading" | "saved" | "saving";

const reviewStatusOptions = [
  { label: "Not started", value: "not-started" },
  { label: "Exported", value: "exported" },
  { label: "Imported", value: "imported" },
  { label: "Needs fix", value: "needs-fix" },
  { label: "Approved", value: "approved" },
] satisfies Array<{ label: string; value: FigmaReviewStatus }>;

const defaultEntry = {
  figmaReviewStatus: "not-started",
} satisfies Pick<FigmaReviewEntry, "figmaReviewStatus">;

const defaultApiPath = "/__cm_figma_review_status";

function normalizeEntry(entry: Partial<FigmaReviewEntry> | null | undefined): FigmaReviewEntry {
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
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.href;
    }
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

export function FigmaExportReview({
  apiPath = defaultApiPath,
  children,
  componentTitle,
  enabled,
  figmaSourceUrl,
  storyId,
  storyName,
  storyTitle,
}: FigmaExportReviewProps) {
  const initialFigmaSourceUrl = normalizeFigmaSourceUrl(figmaSourceUrl ?? "");
  const resolvedApiPath = apiPath || defaultApiPath;
  const [entry, setEntry] = useState<FigmaReviewEntry>(() => normalizeEntry(null));
  const [draftDetails, setDraftDetails] = useState(() => ({
    figmaNodeUrl: initialFigmaSourceUrl,
    notes: "",
  }));
  const [isSourceEditing, setIsSourceEditing] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const autoExportStoryRef = useRef<string | undefined>(undefined);
  const entryRef = useRef(entry);
  const saveQueueRef = useRef(Promise.resolve());

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
        const response = await fetch(
          `${resolvedApiPath}?storyId=${encodeURIComponent(storyId)}`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload = (await response.json()) as {
          entry?: Partial<FigmaReviewEntry> | null;
        };
        const savedFigmaNodeUrl = normalizeFigmaSourceUrl(
          payload.entry?.figmaNodeUrl ?? "",
        );
        const nextEntry = normalizeEntry({
          ...(payload.entry ?? {}),
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
  }, [enabled, initialFigmaSourceUrl, resolvedApiPath, storyId]);

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

        const response = await fetch(resolvedApiPath, {
          body: JSON.stringify({
            entry: entryToSave,
            storyId,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "PUT",
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload = (await response.json()) as {
          entry?: Partial<FigmaReviewEntry>;
        };
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
    if (!enabled || !storyId) return;

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
  }, [enabled, entry.figmaReviewStatus, storyId]);

  const shouldShowPanel = enabled && Boolean(storyId);
  const openableFigmaSourceUrl = getOpenableUrl(entry.figmaNodeUrl);
  const shouldEditFigmaSource = isSourceEditing || !openableFigmaSourceUrl;

  function saveFigmaSourceUrl() {
    const figmaNodeUrl = normalizeFigmaSourceUrl(draftDetails.figmaNodeUrl);
    setDraftDetails((current) => ({
      ...current,
      figmaNodeUrl,
    }));
    setIsSourceEditing(!figmaNodeUrl);
    void saveReviewStatus({ figmaNodeUrl });
  }

  return (
    <>
      {children}
      {shouldShowPanel ? (
        <aside
          aria-label="Figma export review"
          className="sbt-figma-export-review"
          data-save-state={saveState}
        >
          <header className="sbt-figma-export-review__header">
            <span className="sbt-figma-export-review__mark" aria-hidden="true">
              <FigmaIcon size={14} />
            </span>
            <span className="sbt-figma-export-review__heading">
              <span className="sbt-figma-export-review__title">Export review</span>
              <span className="sbt-figma-export-review__subtitle" title={componentTitle}>
                {componentTitle}
              </span>
            </span>
            <span className="sbt-figma-export-review__status">
              <span className="sbt-figma-export-review__status-dot" aria-hidden="true" />
              {getStatusText(saveState)}
            </span>
          </header>

          <div className="sbt-figma-export-review__body">
            <label className="sbt-figma-export-review__field">
              <span>Review</span>
              <select
                value={entry.figmaReviewStatus}
                onChange={(event) => {
                  void saveReviewStatus({
                    figmaReviewStatus: event.currentTarget.value as FigmaReviewStatus,
                  });
                }}
              >
                {reviewStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {shouldEditFigmaSource ? (
            <label className="sbt-figma-export-review__field">
              <span>Figma source</span>
              <input
                placeholder="https://www.figma.com/design/..."
                value={draftDetails.figmaNodeUrl}
                onBlur={saveFigmaSourceUrl}
                onChange={(event) => {
                  const figmaNodeUrl = event.currentTarget.value;
                  setDraftDetails((current) => ({
                    ...current,
                    figmaNodeUrl,
                  }));
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                }}
                type="url"
              />
            </label>
          ) : (
            <div className="sbt-figma-export-review__source">
              <span className="sbt-figma-export-review__label">Figma source</span>
              <div className="sbt-figma-export-review__source-actions">
                <a
                  className="sbt-figma-export-review__button sbt-figma-export-review__button--outline"
                  href={openableFigmaSourceUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <LinkIcon size={14} />
                  Open source
                </a>
                <button
                  aria-label="Edit Figma source"
                  className="sbt-figma-export-review__icon-button"
                  onClick={() => {
                    setIsSourceEditing(true);
                  }}
                  type="button"
                >
                  <EditIcon size={14} />
                </button>
              </div>
            </div>
          )}

          <div className="sbt-figma-export-review__notes">
            <button
              aria-expanded={entry.notesOpen}
              className="sbt-figma-export-review__button sbt-figma-export-review__button--secondary sbt-figma-export-review__notes-toggle"
              onClick={() => {
                void saveReviewStatus({ notesOpen: !entry.notesOpen });
              }}
              type="button"
            >
              <span>Notes</span>
              <span className="sbt-figma-export-review__notes-state">
                {entry.notesOpen ? "Close" : "Open"}
              </span>
            </button>

            {entry.notesOpen ? (
              <label className="sbt-figma-export-review__field">
                <textarea
                  rows={2}
                  value={draftDetails.notes}
                  onBlur={() => {
                    void saveReviewStatus({ notes: draftDetails.notes });
                  }}
                  onChange={(event) => {
                    const notes = event.currentTarget.value;
                    setDraftDetails((current) => ({
                      ...current,
                      notes,
                    }));
                  }}
                />
              </label>
            ) : draftDetails.notes ? (
              <p className="sbt-figma-export-review__notes-summary">Notes saved</p>
            ) : null}
          </div>

          {entry.updatedAt ? (
            <p className="sbt-figma-export-review__meta">
              Updated {new Date(entry.updatedAt).toLocaleString()}
            </p>
          ) : null}

          {errorMessage ? (
            <p className="sbt-figma-export-review__error">{errorMessage}</p>
          ) : null}
        </aside>
      ) : null}
    </>
  );
}
