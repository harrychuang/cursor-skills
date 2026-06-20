export type FigmaExportProjectConfig = {
  addon: {
    absoluteFidelityComponents: string[];
    componentClassPrefixes: string[];
    storyTitlePrefix: string[] | false;
    tokenPrefix?: string;
  };
  review: {
    apiPath: string;
    enabled: boolean;
    pluginName: string;
    statusFilePath: string;
  };
  source: {
    designSystemFileUrlFallback: string;
    nodeOverrides: Record<string, string>;
  };
};

export function defineFigmaExportProjectConfig(
  config: FigmaExportProjectConfig,
): FigmaExportProjectConfig {
  return config;
}

export const figmaExportProjectConfig = defineFigmaExportProjectConfig({
  addon: {
    absoluteFidelityComponents: [],
    componentClassPrefixes: ["ds-"],
    storyTitlePrefix: false,
    tokenPrefix: "ds",
  },
  review: {
    apiPath: "/__figma_export_review_status",
    enabled: true,
    pluginName: "figma-export-review-status-api",
    statusFilePath: "design-system/figma-export-review-status.json",
  },
  source: {
    designSystemFileUrlFallback: "",
    nodeOverrides: {},
  },
});
