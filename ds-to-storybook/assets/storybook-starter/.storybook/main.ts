import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createFigmaReviewStatusPlugin } from "@harrychuang/storybook-addon-figma-export/review-server";
import type { StorybookConfig } from "@storybook/react-vite";

import { figmaExportProjectConfig } from "./figma-export.config.ts";

const cursorAppCliPath = "/Applications/Cursor.app/Contents/Resources/app/bin/cursor";

if (
  !process.env.LAUNCH_EDITOR &&
  process.platform === "darwin" &&
  existsSync(cursorAppCliPath)
) {
  process.env.LAUNCH_EDITOR = cursorAppCliPath;
}

const reviewStatusApiPath = figmaExportProjectConfig.review.apiPath;
const reviewStatusFilePath = resolve(
  process.cwd(),
  figmaExportProjectConfig.review.statusFilePath,
);
const prototypeInspectorAddonPreset = resolve(
  process.cwd(),
  ".storybook/prototype-inspector/preset.js",
);

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@storybook/addon-docs",
    "@harrychuang/storybook-addon-figma-export/preset",
    prototypeInspectorAddonPreset,
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  staticDirs: ["../tokens", "../design-system"],
  async viteFinal(config) {
    const plugins = [...(config.plugins ?? [])];
    if (figmaExportProjectConfig.review.enabled) {
      plugins.push(
        createFigmaReviewStatusPlugin({
          apiPath: reviewStatusApiPath,
          filePath: reviewStatusFilePath,
          name: figmaExportProjectConfig.review.pluginName,
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
