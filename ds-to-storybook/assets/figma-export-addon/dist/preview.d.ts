import * as react from 'react';
import { ReactNode } from 'react';
import { F as FigmaExportAddonOptions, a as FigmaExportSourceReference } from './options-Cph2XY_V.js';

type StorybookContext = {
    globals?: Record<string, unknown>;
    id?: string;
    name?: string;
    title?: string;
};
type StorybookStory = () => ReactNode;
declare function getFigmaExportGlobalName(options?: FigmaExportAddonOptions): string;
declare function createFigmaExportDecorator(options?: FigmaExportAddonOptions): (Story: StorybookStory, context: StorybookContext) => react.FunctionComponentElement<{
    children?: ReactNode;
    context: {
        globals?: Record<string, unknown>;
        id?: string;
        name?: string;
        parameters?: {
            design?: unknown;
            figma?: unknown;
            figmaExport?: {
                reviewStorageKey?: string;
                sourceReference?: FigmaExportSourceReference | string;
                sourceReferences?: Array<FigmaExportSourceReference | string>;
                sourceUrl?: string;
            };
            figmaSourceUrl?: string;
        };
        title?: string;
    };
    options?: FigmaExportAddonOptions;
}>;
declare function createFigmaExportGlobalTypes(options?: FigmaExportAddonOptions): Record<string, {
    defaultValue: "off";
    description: string;
}>;
declare function createFigmaExportInitialGlobals(options?: FigmaExportAddonOptions): Record<string, "off">;

export { createFigmaExportDecorator, createFigmaExportGlobalTypes, createFigmaExportInitialGlobals, getFigmaExportGlobalName };
