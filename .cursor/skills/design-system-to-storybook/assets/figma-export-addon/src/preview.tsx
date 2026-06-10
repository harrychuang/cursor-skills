import type { ReactNode } from "react";
import { createElement } from "react";

import "./figma-code-exporter.css";
import { FigmaCodeExporter } from "./FigmaCodeExporter";
import {
  defaultFigmaExportGlobalName,
  type FigmaExportAddonOptions,
} from "./options";

type StorybookContext = {
  globals?: Record<string, unknown>;
  id?: string;
  name?: string;
  title?: string;
};

type StorybookStory = () => ReactNode;

export function getFigmaExportGlobalName(
  options?: FigmaExportAddonOptions,
): string {
  return options?.globalName ?? defaultFigmaExportGlobalName;
}

export function createFigmaExportDecorator(options?: FigmaExportAddonOptions) {
  return (Story: StorybookStory, context: StorybookContext) =>
    createElement(FigmaCodeExporter, { context, options }, Story());
}

export function createFigmaExportGlobalTypes(
  options?: FigmaExportAddonOptions,
): Record<string, { defaultValue: "off"; description: string }> {
  return {
    [getFigmaExportGlobalName(options)]: {
      defaultValue: "off",
      description: "Show the component-to-Figma code exporter.",
    },
  };
}

export function createFigmaExportInitialGlobals(
  options?: FigmaExportAddonOptions,
): Record<string, "off"> {
  return {
    [getFigmaExportGlobalName(options)]: "off",
  };
}
