import { V as VisualCommentPin, b as beginVisualCommentCapture, a as VisualCommentCaptureController } from './visualComment-DawOAq7P.js';

type FigmaReviewStatus = "not-started" | "exported" | "imported" | "needs-fix" | "approved";
type FigmaReviewEntry = {
    componentTitle?: string;
    figmaNodeUrl?: string;
    figmaReviewStatus: FigmaReviewStatus;
    name?: string;
    notes?: string;
    notesOpen?: boolean;
    storyTitle?: string;
    updatedAt?: string;
};
type VisualCommentOverview = {
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
declare function createReviewStatusController({ apiPath, fetcher, }: {
    apiPath: string;
    fetcher?: FetchLike;
}): {
    load(storyId: string, signal?: AbortSignal): Promise<Partial<FigmaReviewEntry> | null>;
    save(storyId: string, entry: FigmaReviewEntry): Promise<{
        entry?: Partial<FigmaReviewEntry>;
    }>;
};
declare function createVisualCommentsController({ apiPath, fetcher, }: {
    apiPath: string;
    fetcher?: FetchLike;
}): {
    beginCapture(options: Parameters<typeof beginVisualCommentCapture>[0]): VisualCommentCaptureController;
    delete(path: string): Promise<{
        error?: string;
        reportStale?: boolean;
    }>;
    getOverview(storyId: string): Promise<VisualCommentOverview>;
    patch(path: string, body: unknown): Promise<{
        error?: string;
        reportStale?: boolean;
    }>;
    post(path: string, body?: unknown): Promise<{
        error?: string;
        reportStale?: boolean;
    }>;
    resolveTarget(selector?: string): HTMLElement | null;
};

export { type FigmaReviewEntry, type FigmaReviewStatus, type VisualCommentOverview, createReviewStatusController, createVisualCommentsController };
