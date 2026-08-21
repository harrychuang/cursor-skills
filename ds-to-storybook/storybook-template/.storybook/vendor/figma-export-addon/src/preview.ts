import "./figma-code-exporter.css";
import {
  syncFigmaExportOverlay,
  type FigmaExportPreviewContext,
} from "./overlay";
import {
  defaultFigmaExportGlobalName,
  type FigmaExportAddonOptions,
} from "./options";

export type { FigmaExportPreviewContext } from "./overlay";

export function getFigmaExportGlobalName(
  options?: FigmaExportAddonOptions,
): string {
  return options?.globalName ?? defaultFigmaExportGlobalName;
}

// Pass-through decorator: the story result is returned unchanged (strict
// identity, no wrapper element), so it is valid for every Storybook renderer
// (React, Vue, Svelte, Angular, Web Components). The export overlay is a
// document.body side effect handled by the overlay module.
export function createFigmaExportDecorator(options?: FigmaExportAddonOptions) {
  return function figmaExportDecorator<StoryResult>(
    storyFn: () => StoryResult,
    context: FigmaExportPreviewContext,
  ): StoryResult {
    syncFigmaExportOverlay(context, options);
    return storyFn();
  };
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
