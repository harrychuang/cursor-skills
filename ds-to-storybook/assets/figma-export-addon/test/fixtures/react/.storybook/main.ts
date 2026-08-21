import path from "node:path";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";
import { createFigmaReviewStatusPlugin } from "../../../../dist/review-server.js";

const fixtureRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataRoot = process.env.SBFX_PARITY_DATA_DIR
  ? path.resolve(process.env.SBFX_PARITY_DATA_DIR)
  : path.join(fixtureRoot, ".data");

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [path.resolve(fixtureRoot, "../../..")],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  async viteFinal(viteConfig) {
    return {
      ...viteConfig,
      plugins: [
        ...(viteConfig.plugins ?? []),
        createFigmaReviewStatusPlugin({
          apiPath: "/__sbfx_fixture_review",
          filePath: path.join(dataRoot, "review-status.json"),
          commentsApiPath: "/__sbfx_fixture_comments",
          commentsDir: path.join(dataRoot, "comments"),
          payloadDir: path.join(dataRoot, "payloads"),
          name: "sbfx-react-parity-fixture",
          }),
      ],
      server: {
        ...viteConfig.server,
        watch: {
          ...viteConfig.server?.watch,
          ignored: ["**/.data/**"],
        },
      },
    };
  },
};

export default config;
