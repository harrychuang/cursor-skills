import type { TokenLayer } from "./types";
import type { VisualCommentOptions } from "./visualComment";

export type FigmaExportAddonOptions = {
  absoluteFidelityComponents?: string[];
  collections?: Partial<Record<TokenLayer, string>>;
  componentClassPrefixes?: string[];
  embeddedSvgByDataGraphic?: Record<string, string>;
  globalName?: string;
  payloadSyncUrl?: string;
  pluginDataKey?: string;
  /** Attach a browser-render snapshot to the payload (default true). */
  referenceImage?: boolean;
  storyTitlePrefix?: false | string | string[];
  tokenLayers?: Partial<Record<TokenLayer, string>>;
  tokenPrefix?: string;
  visualComments?: VisualCommentOptions;
};

export type ResolvedFigmaExportAddonOptions = {
  absoluteFidelityComponents: Set<string>;
  collections: Record<TokenLayer, string>;
  componentClassPrefixes: string[];
  embeddedSvgByDataGraphic: Record<string, string>;
  globalName: string;
  payloadSyncUrl?: string;
  pluginDataKey: string;
  referenceImage: boolean;
  storyTitlePrefix: false | string[];
  tokenLayers: Record<TokenLayer, string>;
  tokenPrefix?: string;
  visualComments: Required<VisualCommentOptions>;
};

export const defaultFigmaExportGlobalName = "figmaExport";

const defaultTokenLayers: Record<TokenLayer, string> = {
  comp: "comp",
  ref: "ref",
  sys: "sys",
};

function normalizeTokenPrefix(prefix: string | undefined): string | undefined {
  if (!prefix) return undefined;
  return prefix.replace(/^--/, "").replace(/-$/, "");
}

function normalizeStoryTitlePrefix(
  prefix: FigmaExportAddonOptions["storyTitlePrefix"],
): false | string[] {
  if (prefix === false) return false;
  if (Array.isArray(prefix)) return prefix;
  if (typeof prefix === "string") return [prefix];
  return false;
}

export function resolveFigmaExportAddonOptions(
  options: FigmaExportAddonOptions | undefined,
): ResolvedFigmaExportAddonOptions {
  return {
    absoluteFidelityComponents: new Set(options?.absoluteFidelityComponents ?? []),
    collections: {
      ...defaultTokenLayers,
      ...options?.collections,
    },
    componentClassPrefixes: options?.componentClassPrefixes ?? [],
    embeddedSvgByDataGraphic: options?.embeddedSvgByDataGraphic ?? {},
    globalName: options?.globalName ?? defaultFigmaExportGlobalName,
    ...(options?.payloadSyncUrl ? { payloadSyncUrl: options.payloadSyncUrl } : {}),
    pluginDataKey: options?.pluginDataKey ?? "storybookCssToken",
    referenceImage: options?.referenceImage ?? true,
    storyTitlePrefix: normalizeStoryTitlePrefix(options?.storyTitlePrefix),
    tokenLayers: {
      ...defaultTokenLayers,
      ...options?.tokenLayers,
    },
    tokenPrefix: normalizeTokenPrefix(options?.tokenPrefix),
    visualComments: {
      enabled: options?.visualComments?.enabled ?? true,
      apiPath: options?.visualComments?.apiPath ?? "/__figma_export_review_comments",
      captureSelector: options?.visualComments?.captureSelector ?? "#storybook-root",
      authorStorageKey: options?.visualComments?.authorStorageKey ?? "sbfx:review-author",
    },
  };
}

export function isStoryIncludedForFigmaExport(
  title: string | undefined,
  options: ResolvedFigmaExportAddonOptions,
): boolean {
  if (!title) return true;
  if (options.storyTitlePrefix === false) return true;
  return options.storyTitlePrefix.some((prefix) => title.startsWith(prefix));
}
