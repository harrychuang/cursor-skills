type VisualCommentOptions = {
    enabled?: boolean;
    apiPath?: string;
    captureSelector?: string;
    authorStorageKey?: string;
};
type VisualCommentStoryMetadata = {
    id: string;
    title: string;
    name: string;
    url?: string;
    prototypeId?: string;
    routeId?: string;
    stateId?: string;
};
type VisualCommentPin = {
    xRatio: number;
    yRatio: number;
};
type VisualCommentViewport = {
    width: number;
    height: number;
    devicePixelRatio: number;
    scrollX: number;
    scrollY: number;
};
type VisualCommentCapture = {
    dataUrl: string;
    mimeType: "image/webp" | "image/png";
    width: number;
    height: number;
    cssWidth: number;
    cssHeight: number;
};
type CreateVisualCommentRequest = {
    clientRequestId: string;
    authorName: string;
    body: string;
    story: VisualCommentStoryMetadata;
    pin: VisualCommentPin;
    viewport: VisualCommentViewport;
    capture: VisualCommentCapture;
};
type VisualCommentCaptureResult = {
    capture: VisualCommentCapture;
    pin: VisualCommentPin;
    viewport: VisualCommentViewport;
};
type VisualCommentPointSelection = {
    pin: VisualCommentPin;
    viewport: VisualCommentViewport;
};
type VisualCommentCaptureController = {
    cancel(): void;
};
declare const VISUAL_COMMENT_LIMITS: {
    readonly maxRequestBytes: number;
    readonly maxImageBytes: number;
    readonly maxImageLongestSide: 2048;
    readonly maxImagePixels: number;
    readonly maxSessionAssetsBytes: number;
    readonly maxTitleLength: 120;
    readonly maxAuthorLength: 80;
    readonly maxBodyLength: 2000;
};
/**
 * Arms the next pointer sequence before prototype handlers run. The returned
 * controller is also used by the panel Cancel action and unmount cleanup.
 */
declare function beginVisualCommentCapture({ capture, documentRef, onCancel, onCaptured, onError, onPointSelected, selector, }: {
    capture?: (target: HTMLElement) => Promise<VisualCommentCapture>;
    documentRef?: Document;
    onCancel?: () => void;
    onCaptured(result: VisualCommentCaptureResult): void;
    onError(error: Error): void;
    onPointSelected?: (selection: VisualCommentPointSelection) => void;
    selector?: string;
}): VisualCommentCaptureController;

export { type CreateVisualCommentRequest as C, type VisualCommentPin as V, type VisualCommentCaptureController as a, beginVisualCommentCapture as b, VISUAL_COMMENT_LIMITS as c, type VisualCommentOptions as d };
