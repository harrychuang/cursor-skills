import { storybookTemplateProjectConfig } from "./project.config.ts";

export type FigmaExportProjectConfig =
  typeof storybookTemplateProjectConfig.figmaExport;

export function defineFigmaExportProjectConfig(
  config: FigmaExportProjectConfig,
): FigmaExportProjectConfig {
  return config;
}

export const figmaExportProjectConfig = defineFigmaExportProjectConfig(
  storybookTemplateProjectConfig.figmaExport,
);
