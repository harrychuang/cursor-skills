import * as react from 'react';
import { ReactNode } from 'react';
import { F as FigmaExportSourceReference, a as FigmaExportAddonOptions, b as FigmaExportPayload } from './preview-e4OSCUjO.js';
export { c as FigmaBindingName, d as FigmaExportNode, e as FigmaExportReviewStatus, f as FigmaExportToken, g as FigmaLayoutStrategy, h as FigmaNodeKind, R as ResolvedFigmaExportAddonOptions, T as TokenLayer, i as createFigmaExportDecorator, j as createFigmaExportGlobalTypes, k as createFigmaExportInitialGlobals, l as defaultFigmaExportGlobalName, m as getFigmaExportGlobalName, n as isStoryIncludedForFigmaExport, r as resolveFigmaExportAddonOptions } from './preview-e4OSCUjO.js';

type StorybookContext = {
    globals?: Record<string, unknown>;
    id?: string;
    name?: string;
    parameters?: {
        design?: unknown;
        figmaExport?: {
            reviewStorageKey?: string;
            sourceReference?: FigmaExportSourceReference | string;
            sourceReferences?: Array<FigmaExportSourceReference | string>;
            sourceUrl?: string;
        };
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
