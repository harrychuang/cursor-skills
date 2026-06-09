import { IncomingMessage, ServerResponse } from 'node:http';
import { FigmaReviewEntry } from './review.js';
import 'react';
import './options-Cph2XY_V.js';

declare const defaultFigmaReviewStatusApiPath = "/__figma_export_review_status";
type FigmaReviewStatusFile = {
    stories: Record<string, FigmaReviewEntry>;
    version: 1;
};
type FigmaReviewStatusPluginOptions = {
    apiPath?: string;
    cwd?: string;
    filePath?: string;
    name?: string;
};
type MiddlewareHandler = (request: IncomingMessage, response: ServerResponse, next?: (error?: unknown) => void) => void;
type MiddlewareServer = {
    middlewares: {
        use(path: string, handler: MiddlewareHandler): void;
    };
};
declare function createFigmaReviewStatusPlugin(options?: FigmaReviewStatusPluginOptions): {
    configureServer(server: MiddlewareServer): void;
    name: string;
};

export { type FigmaReviewStatusFile, type FigmaReviewStatusPluginOptions, createFigmaReviewStatusPlugin, defaultFigmaReviewStatusApiPath };
