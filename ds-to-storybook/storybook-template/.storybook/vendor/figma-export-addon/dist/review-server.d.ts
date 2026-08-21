import { IncomingMessage, ServerResponse } from 'node:http';
import { FigmaReviewEntry } from './review-controller.js';
import { createVisualCommentStore } from './visual-comment-store.js';
import './visualComment-DawOAq7P.js';

declare const defaultFigmaReviewStatusApiPath = "/__figma_export_review_status";
declare const defaultFigmaExportPayloadApiPath = "/__figma-export/payloads";
declare const defaultFigmaExportPayloadDir = "design-system/figma-export-payloads";
type FigmaReviewStatusFile = {
    stories: Record<string, FigmaReviewEntry>;
    version: 1;
};
type FigmaReviewStatusPluginOptions = {
    apiPath?: string;
    cwd?: string;
    filePath?: string;
    name?: string;
    payloadApiPath?: string;
    payloadDir?: string;
    commentsEnabled?: boolean;
    commentsApiPath?: string;
    commentsDir?: string;
};
type MiddlewareHandler = (request: IncomingMessage, response: ServerResponse, next?: (error?: unknown) => void) => void;
type MiddlewareServer = {
    middlewares: {
        use(path: string, handler: MiddlewareHandler): void;
    };
};
declare function handleVisualCommentsRequest({ basePath, request, response, store, }: {
    basePath: string;
    request: IncomingMessage;
    response: ServerResponse;
    store: ReturnType<typeof createVisualCommentStore>;
}): Promise<void>;
declare function createVisualCommentsHandler(options: {
    basePath?: string;
    store: ReturnType<typeof createVisualCommentStore>;
}): MiddlewareHandler;
declare function sanitizePayloadStoryId(value: unknown): string;
declare function handleFigmaExportPayloadRequest({ payloadDir, request, response, }: {
    payloadDir: string;
    request: IncomingMessage;
    response: ServerResponse;
}): Promise<void>;
declare function createFigmaExportPayloadStoreHandler(options: {
    payloadDir: string;
}): MiddlewareHandler;
declare function createFigmaReviewStatusPlugin(options?: FigmaReviewStatusPluginOptions): {
    configureServer(server: MiddlewareServer): void;
    name: string;
};

export { type FigmaReviewStatusFile, type FigmaReviewStatusPluginOptions, createFigmaExportPayloadStoreHandler, createFigmaReviewStatusPlugin, createVisualCommentsHandler, defaultFigmaExportPayloadApiPath, defaultFigmaExportPayloadDir, defaultFigmaReviewStatusApiPath, handleFigmaExportPayloadRequest, handleVisualCommentsRequest, sanitizePayloadStoryId };
