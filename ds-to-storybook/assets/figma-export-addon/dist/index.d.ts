import * as react from 'react';
import { ReactNode } from 'react';
import { a as FigmaExportSourceReference, F as FigmaExportAddonOptions, b as FigmaExportPayload } from './options-Cph2XY_V.js';
export { c as FigmaBindingName, d as FigmaExportNode, e as FigmaExportReviewStatus, f as FigmaExportToken, g as FigmaLayoutStrategy, h as FigmaNodeKind, R as ResolvedFigmaExportAddonOptions, T as TokenLayer, i as defaultFigmaExportGlobalName, j as isStoryIncludedForFigmaExport, r as resolveFigmaExportAddonOptions } from './options-Cph2XY_V.js';
export { createFigmaExportDecorator, createFigmaExportGlobalTypes, createFigmaExportInitialGlobals, getFigmaExportGlobalName } from './preview.js';

type StorybookContext = {
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
type FigmaCodeExporterProps = {
    children?: ReactNode;
    context: StorybookContext;
    options?: FigmaExportAddonOptions;
};
declare function FigmaCodeExporter({ children, context, options, }: FigmaCodeExporterProps): react.JSX.Element;

type FigmaExportToolOptions = {
    addonId?: string;
    globalName?: string;
};
declare const figmaExportAddonId = "storybook/figma-export";
declare function registerFigmaExportTool(options?: FigmaExportToolOptions): void;

declare function createFigmaExportJson(payload: FigmaExportPayload): string;
declare function createFigmaPluginCode(payload: FigmaExportPayload): string;

export { FigmaCodeExporter, FigmaExportAddonOptions, FigmaExportPayload, FigmaExportSourceReference, createFigmaExportJson, createFigmaPluginCode, figmaExportAddonId, registerFigmaExportTool };
