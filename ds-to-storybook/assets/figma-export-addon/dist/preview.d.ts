import { b as FigmaExportAddonOptions } from './options-BycGBdfI.js';
import './visualComment-DawOAq7P.js';

type FigmaExportPreviewContext = {
    globals?: Record<string, unknown>;
    id?: string;
    name?: string;
    parameters?: Record<string, unknown>;
    title?: string;
    viewMode?: string;
};

declare function getFigmaExportGlobalName(options?: FigmaExportAddonOptions): string;
declare function createFigmaExportDecorator(options?: FigmaExportAddonOptions): <StoryResult>(storyFn: () => StoryResult, context: FigmaExportPreviewContext) => StoryResult;
declare function createFigmaExportGlobalTypes(options?: FigmaExportAddonOptions): Record<string, {
    defaultValue: "off";
    description: string;
}>;
declare function createFigmaExportInitialGlobals(options?: FigmaExportAddonOptions): Record<string, "off">;

export { type FigmaExportPreviewContext, createFigmaExportDecorator, createFigmaExportGlobalTypes, createFigmaExportInitialGlobals, getFigmaExportGlobalName };
