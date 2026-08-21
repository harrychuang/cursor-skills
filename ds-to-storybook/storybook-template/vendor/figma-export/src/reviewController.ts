import {
  beginVisualCommentCapture,
  resolveVisualCommentTarget,
  type VisualCommentCaptureController,
  type VisualCommentPin,
} from "./visualComment";

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

export type VisualCommentOverview = {
  activeSession: {
    id: string;
    title: string;
    startedAt: string;
    closedAt: string | null;
    captureCount: number;
    commentCount: number;
  } | null;
  activeReportUrl: string | null;
  comments: Array<{
    id: string;
    authorName: string;
    body: string;
    createdAt: string;
    ordinal: number;
    preview: {
      imageUrl: string;
      width: number;
      height: number;
      pin: VisualCommentPin;
    } | null;
    resolvedAt?: string | null;
  }>;
  recentSessions: Array<{
    id: string;
    title: string;
    startedAt: string;
    closedAt: string | null;
    captureCount: number;
    commentCount: number;
  }>;
  reportUrl: string;
};

type FetchLike = typeof fetch;

export function createReviewStatusController({
  apiPath,
  fetcher = globalThis.fetch,
}: {
  apiPath: string;
  fetcher?: FetchLike;
}) {
  return {
    async load(storyId: string, signal?: AbortSignal) {
      const payload = await requestJson<{ entry?: Partial<FigmaReviewEntry> | null }>(
        fetcher,
        `${apiPath}?storyId=${encodeURIComponent(storyId)}`,
        { signal },
        `Review status GET ${apiPath}`,
      );
      return payload.entry ?? null;
    },
    async save(storyId: string, entry: FigmaReviewEntry) {
      return requestJson<{ entry?: Partial<FigmaReviewEntry> }>(
        fetcher,
        apiPath,
        {
          body: JSON.stringify({ entry, storyId }),
          headers: { "Content-Type": "application/json" },
          method: "PUT",
        },
        `Review status PUT ${apiPath}`,
      );
    },
  };
}

export function createVisualCommentsController({
  apiPath,
  fetcher = globalThis.fetch,
}: {
  apiPath: string;
  fetcher?: FetchLike;
}) {
  return {
    beginCapture(
      options: Parameters<typeof beginVisualCommentCapture>[0],
    ): VisualCommentCaptureController {
      return beginVisualCommentCapture(options);
    },
    delete(path: string) {
      return requestJson<{ error?: string; reportStale?: boolean }>(
        fetcher,
        `${apiPath}${path}`,
        { method: "DELETE" },
        `Visual comments DELETE ${apiPath}${path}`,
      );
    },
    getOverview(storyId: string) {
      return requestJson<VisualCommentOverview>(
        fetcher,
        `${apiPath}?storyId=${encodeURIComponent(storyId)}`,
        undefined,
        `Visual comments GET ${apiPath}`,
      );
    },
    patch(path: string, body: unknown) {
      return requestJson<{ error?: string; reportStale?: boolean }>(
        fetcher,
        `${apiPath}${path}`,
        {
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
          method: "PATCH",
        },
        `Visual comments PATCH ${apiPath}${path}`,
      );
    },
    post(path: string, body?: unknown) {
      return requestJson<{ error?: string; reportStale?: boolean }>(
        fetcher,
        `${apiPath}${path}`,
        {
          body: body === undefined ? undefined : JSON.stringify(body),
          headers: body === undefined ? undefined : { "Content-Type": "application/json" },
          method: "POST",
        },
        `Visual comments POST ${apiPath}${path}`,
      );
    },
    resolveTarget(selector?: string): HTMLElement | null {
      return resolveVisualCommentTarget(selector);
    },
  };
}

async function requestJson<T>(
  fetcher: FetchLike,
  url: string,
  init: RequestInit | undefined,
  operation: string,
): Promise<T> {
  const response = await fetcher(url, init);
  const payload = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(
      `${operation} returned HTTP ${response.status}${payload.error ? `: ${payload.error}` : "."}`,
    );
  }
  return payload;
}
