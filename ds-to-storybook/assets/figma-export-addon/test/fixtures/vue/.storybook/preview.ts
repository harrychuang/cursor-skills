import type { Preview } from "@storybook/vue3-vite";
import {
  createFigmaExportGlobalTypes,
  createFigmaExportInitialGlobals,
} from "../../../../dist/index.js";
import { createFigmaExportReviewDecorator } from "../../../../dist/review.js";
import "../../../../dist/figma-code-exporter.css";
import "../../../../dist/review.css";

const options = {
  componentClassPrefixes: ["parity-"],
  storyTitlePrefix: ["Parity/"],
  visualComments: {
    enabled: true,
    apiPath: "/__sbfx_fixture_comments",
    captureSelector: "[data-parity-story]",
    authorStorageKey: "sbfx:parity-author",
  },
};

const preview: Preview = {
  decorators: [
    createFigmaExportReviewDecorator(options, {
      apiPath: "/__sbfx_fixture_review",
      enabled: true,
      getFigmaSourceUrl: () => "https://www.figma.com/design/parity-fixture",
    }),
  ],
  globalTypes: createFigmaExportGlobalTypes(options),
  initialGlobals: createFigmaExportInitialGlobals(options),
  parameters: {
    layout: "fullscreen",
  },
};

export default preview;
