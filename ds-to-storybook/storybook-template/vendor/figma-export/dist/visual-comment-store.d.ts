import { C as CreateVisualCommentRequest, c as VISUAL_COMMENT_LIMITS } from './visualComment-DawOAq7P.js';

type VisualCommentLimits = {
    [Key in keyof typeof VISUAL_COMMENT_LIMITS]: number;
};
type VisualMeeting = {
    id: string;
    title: string;
    startedAt: string;
    closedAt: string | null;
};
type VisualMeetingSummary = VisualMeeting & {
    captureCount: number;
    commentCount: number;
};
type VisualCapture = {
    id: string;
    capturedAt: string;
    story: CreateVisualCommentRequest["story"];
    viewport: CreateVisualCommentRequest["viewport"];
    image: {
        path: string;
        mimeType: "image/webp" | "image/png";
        width: number;
        height: number;
        cssWidth: number;
        cssHeight: number;
        sha256: string;
        bytes: number;
    };
};
type VisualComment = {
    id: string;
    clientRequestId: string;
    captureId: string;
    authorName: string;
    body: string;
    pin: {
        xRatio: number;
        yRatio: number;
    };
    createdAt: string;
    resolvedAt?: string | null;
};
type VisualCommentDetailsPatch = {
    body?: string;
    pin?: VisualComment["pin"];
};
type VisualCommentOverviewComment = VisualComment & {
    ordinal: number;
    preview: {
        imagePath: string;
        width: number;
        height: number;
        pin: VisualComment["pin"];
    } | null;
};
type VisualMeetingFile = {
    version: 1;
    session: VisualMeeting;
    captures: Record<string, VisualCapture>;
    comments: VisualComment[];
};
type VisualCommentStoreState = {
    version: 1;
    activeSessionId: string | null;
};
type VisualCommentReportRenderContext = {
    projectRelativeSessionPath: string | null;
};
type VisualCommentStoreOptions = {
    cwd?: string;
    commentsDir?: string;
    reportRenderer?: {
        index(meetings: VisualMeetingSummary[], activeSessionId: string | null): string;
        meeting(meeting: VisualMeetingFile, context?: VisualCommentReportRenderContext): string;
    };
    limits?: Partial<VisualCommentLimits>;
};
declare class VisualCommentStoreError extends Error {
    readonly code: string;
    readonly statusCode: number;
    constructor(message: string, code: string, statusCode: number);
}
declare function createVisualCommentStore(options?: VisualCommentStoreOptions): {
    root: string;
    getState: () => Promise<VisualCommentStoreState>;
    listMeetings: () => Promise<VisualMeetingSummary[]>;
    refreshReports: (sessionId?: string) => Promise<void>;
    getOverview: (storyId?: string) => Promise<{
        version: 1;
        activeSession: {
            captureCount: number;
            commentCount: number;
            id: string;
            title: string;
            startedAt: string;
            closedAt: string | null;
        } | null;
        recentSessions: VisualMeetingSummary[];
        comments: VisualCommentOverviewComment[];
    }>;
    getMeeting: (id: string) => Promise<VisualMeetingFile>;
    startMeeting: (title: string) => Promise<{
        meeting: VisualMeetingFile;
    } & {
        reportStale: boolean;
    }>;
    closeMeeting: (id: string) => Promise<{
        meeting: VisualMeetingFile;
    } & {
        reportStale: boolean;
    }>;
    createComment: (id: string, requestValue: unknown) => Promise<{
        comment: VisualComment;
        meeting: VisualMeetingFile;
        replay: boolean;
    } & {
        reportStale: boolean;
    }>;
    updateCommentDetails: (id: string, commentId: string, patchValue: unknown) => Promise<{
        comment: VisualComment;
        meeting: VisualMeetingFile;
    } & {
        reportStale: boolean;
    }>;
    updateCommentBody: (id: string, commentId: string, body: string) => Promise<{
        comment: VisualComment;
        meeting: VisualMeetingFile;
    } & {
        reportStale: boolean;
    }>;
    resolveComment: (id: string, commentId: string, resolved: boolean) => Promise<{
        comment: VisualComment;
        meeting: VisualMeetingFile;
    } & {
        reportStale: boolean;
    }>;
    deleteComment: (id: string, commentId: string) => Promise<{
        deletedAssetPath: string | null;
        deletedCaptureId: string | null;
        deletedCommentId: string;
        meeting: VisualMeetingFile;
    } & {
        reportStale: boolean;
    }>;
};

export { type VisualCapture, type VisualComment, type VisualCommentDetailsPatch, type VisualCommentOverviewComment, type VisualCommentReportRenderContext, VisualCommentStoreError, type VisualCommentStoreOptions, type VisualCommentStoreState, type VisualMeeting, type VisualMeetingFile, type VisualMeetingSummary, createVisualCommentStore };
