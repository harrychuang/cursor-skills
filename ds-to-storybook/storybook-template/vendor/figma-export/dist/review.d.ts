import { R as ResolvedFigmaExportAddonOptions, b as FigmaExportAddonOptions } from './options-BycGBdfI.js';
import { d as VisualCommentOptions } from './visualComment-DawOAq7P.js';
export { FigmaReviewEntry, FigmaReviewStatus } from './review-controller.js';

declare const Fragment: unique symbol;
type DomComponent = (props: any) => DomChild;
type DomChild = DomVNode | DomPortal | string | number | boolean | null | undefined | DomChild[];
type DomVNode = {
    type: string | DomComponent | typeof Fragment;
    props: Record<string, unknown> & {
        children?: DomChild;
    };
};
type DomPortal = {
    type: typeof portalType;
    child: DomChild;
    target: Element;
};
declare const portalType: unique symbol;

type FigmaReviewLabels = Partial<{
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
type FigmaExportReviewOptions = {
    apiPath?: string;
    autoMarkExported?: boolean;
    enabled?: boolean;
    getComponentTitle?: (context: StorybookContext, options: ResolvedFigmaExportAddonOptions) => string;
    getFigmaSourceUrl?: (context: StorybookContext, componentTitle: string) => string | undefined;
    labels?: FigmaReviewLabels;
    showNotes?: boolean;
    visualComments?: VisualCommentOptions;
};
type FigmaExportReviewProps = {
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
type StorybookContext = {
    globals?: Record<string, unknown>;
    id?: string;
    name?: string;
    parameters?: Record<string, unknown>;
    title?: string;
    viewMode?: string;
};
type StorybookStory = () => unknown;
declare const defaultFigmaReviewStatusApiPath = "/__figma_export_review_status";
declare function getDefaultFigmaExportComponentTitle(title: string | undefined, options: ResolvedFigmaExportAddonOptions): string;
declare function getDefaultFigmaSourceUrl(parameters: Record<string, unknown> | undefined): string | undefined;
declare function FigmaExportReview({ apiPath, autoMarkExported, componentTitle, enabled, figmaSourceUrl, labels: labelsOverride, showNotes, storyId, storyName, storyTitle, storyUrl, viewMode, visualComments, }: FigmaExportReviewProps): {
    type: string | DomComponent | typeof Fragment;
    props: Record<string, unknown> & {
        children?: DomChild;
    };
};
declare function createFigmaExportReviewDecorator(figmaExportOptions?: FigmaExportAddonOptions, reviewOptions?: FigmaExportReviewOptions): (Story: StorybookStory, context: StorybookContext) => unknown;
declare function destroyFigmaReviewWorkspace(): void;

export { FigmaExportReview, type FigmaExportReviewOptions, type FigmaExportReviewProps, type FigmaReviewLabels, type StorybookContext, createFigmaExportReviewDecorator, defaultFigmaReviewStatusApiPath, destroyFigmaReviewWorkspace, getDefaultFigmaExportComponentTitle, getDefaultFigmaSourceUrl };
