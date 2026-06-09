import * as react from 'react';
import { ReactNode } from 'react';
import { R as ResolvedFigmaExportAddonOptions, F as FigmaExportAddonOptions } from './options-Cph2XY_V.js';

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
type FigmaReviewLabels = Partial<{
    approved: string;
    closeNotes: string;
    editFigmaSource: string;
    exported: string;
    figmaSource: string;
    imported: string;
    needsFix: string;
    notStarted: string;
    notes: string;
    notesSaved: string;
    openNotes: string;
    openSource: string;
    review: string;
    sourcePlaceholder: string;
    title: string;
}>;
type FigmaExportReviewOptions = {
    apiPath?: string;
    autoMarkExported?: boolean;
    enabled?: boolean;
    getComponentTitle?: (context: StorybookContext, options: ResolvedFigmaExportAddonOptions) => string;
    getFigmaSourceUrl?: (context: StorybookContext, componentTitle: string) => string | undefined;
    labels?: FigmaReviewLabels;
    showNotes?: boolean;
};
type FigmaExportReviewProps = {
    apiPath?: string;
    autoMarkExported?: boolean;
    children?: ReactNode;
    componentTitle: string;
    enabled: boolean;
    figmaSourceUrl?: string;
    labels?: FigmaReviewLabels;
    showNotes?: boolean;
    storyId: string;
    storyName: string;
    storyTitle: string;
};
type StorybookContext = {
    globals?: Record<string, unknown>;
    id?: string;
    name?: string;
    parameters?: Record<string, unknown>;
    title?: string;
};
type StorybookStory = () => ReactNode;
declare const defaultFigmaReviewStatusApiPath = "/__figma_export_review_status";
declare function getDefaultFigmaExportComponentTitle(title: string | undefined, options: ResolvedFigmaExportAddonOptions): string;
declare function getDefaultFigmaSourceUrl(parameters: Record<string, unknown> | undefined): string | undefined;
declare function FigmaExportReview({ apiPath, autoMarkExported, children, componentTitle, enabled, figmaSourceUrl, labels: labelsOverride, showNotes, storyId, storyName, storyTitle, }: FigmaExportReviewProps): react.FunctionComponentElement<react.FragmentProps>;
declare function createFigmaExportReviewDecorator(figmaExportOptions?: FigmaExportAddonOptions, reviewOptions?: FigmaExportReviewOptions): (Story: StorybookStory, context: StorybookContext) => react.FunctionComponentElement<FigmaExportReviewProps>;

export { FigmaExportReview, type FigmaExportReviewOptions, type FigmaExportReviewProps, type FigmaReviewEntry, type FigmaReviewLabels, type FigmaReviewStatus, type StorybookContext, createFigmaExportReviewDecorator, defaultFigmaReviewStatusApiPath, getDefaultFigmaExportComponentTitle, getDefaultFigmaSourceUrl };
