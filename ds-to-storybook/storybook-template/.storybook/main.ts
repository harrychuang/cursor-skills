import { resolve } from "node:path";
import { createFigmaReviewStatusPlugin } from "@harrychuang/storybook-addon-figma-export/review-server";
import type { StorybookConfig } from "@storybook/react-vite";

import { figmaExportProjectConfig } from "./figma-export.config.ts";
import { storybookTemplateProjectConfig } from "./project.config.ts";

const reviewStatusApiPath =
  figmaExportProjectConfig.review.apiPath;
const reviewStatusFilePath = resolve(
  process.cwd(),
  figmaExportProjectConfig.review.statusFilePath,
);
const prototypeInspectorAddonPreset = resolve(
  process.cwd(),
  ".storybook/prototype-inspector/preset.js",
);

const config: StorybookConfig = {
  stories: storybookTemplateProjectConfig.storybook.stories,
  addons: [
    "@storybook/addon-docs",
    "@harrychuang/storybook-addon-figma-export",
    prototypeInspectorAddonPreset,
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  staticDirs: storybookTemplateProjectConfig.storybook.staticDirs,
  async viteFinal(config) {
    const plugins = [...(config.plugins ?? [])];
    if (figmaExportProjectConfig.review.enabled) {
      plugins.push(
        createFigmaReviewStatusPlugin({
          apiPath: reviewStatusApiPath,
          filePath: reviewStatusFilePath,
          name: figmaExportProjectConfig.review.pluginName,
          commentsEnabled: figmaExportProjectConfig.review.commentsEnabled,
          commentsApiPath: figmaExportProjectConfig.review.commentsApiPath,
          commentsDir: figmaExportProjectConfig.review.commentsDir,
        }),
      );
    }

    return {
      ...config,
      plugins,
    };
  },
};

export default config;
