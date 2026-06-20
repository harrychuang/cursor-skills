import type { Preview } from "@storybook/react-vite";

import { figmaExportProjectConfig } from "./figma-export.config.ts";
import type { FigmaExportAddonOptions } from "@harrychuang/storybook-addon-figma-export";
import {
  createFigmaExportGlobalTypes,
  createFigmaExportInitialGlobals,
} from "@harrychuang/storybook-addon-figma-export/preview";
import { createFigmaExportReviewDecorator } from "@harrychuang/storybook-addon-figma-export/review";
import { getFigmaSourceUrl } from "@harrychuang/storybook-addon-figma-export/source";
import "@harrychuang/storybook-addon-figma-export/styles.css";
import "@harrychuang/storybook-addon-figma-export/review.css";
import "../tokens/tokens.css";
import "../src/styles/storybook.css";

const backgroundThemeOptions = {
  dark: {
    name: "Dark theme",
    value: "var(--ds-sys-color-background)",
  },
  light: {
    name: "Light theme",
    value: "var(--ds-sys-color-surface)",
  },
};

const figmaExportOptions = {
  absoluteFidelityComponents: [
    ...figmaExportProjectConfig.addon.absoluteFidelityComponents,
  ],
  componentClassPrefixes: [
    ...figmaExportProjectConfig.addon.componentClassPrefixes,
  ],
  storyTitlePrefix: figmaExportProjectConfig.addon.storyTitlePrefix,
  tokenPrefix: figmaExportProjectConfig.addon.tokenPrefix,
} satisfies FigmaExportAddonOptions;

const componentSpecModules = import.meta.glob<string>(
  "../design-system/components/*.md",
  {
    eager: true,
    import: "default",
    query: "?raw",
  },
);

const figmaDesignSystemFileUrl =
  figmaExportProjectConfig.source.designSystemFileUrlFallback;

const figmaExportReviewDecorator = createFigmaExportReviewDecorator(
  figmaExportOptions,
  {
    apiPath: figmaExportProjectConfig.review.apiPath,
    enabled: figmaExportProjectConfig.review.enabled,
    getFigmaSourceUrl: (context, componentTitle) =>
      getFigmaSourceUrl(context.parameters, componentTitle, {
        componentSpecModules,
        designSystemFileUrl: figmaDesignSystemFileUrl,
        nodeOverrides: figmaExportProjectConfig.source.nodeOverrides,
      }),
  },
);

const preview: Preview = {
  decorators: [
    (Story, context) => {
      const selectedBackground = context.globals.backgrounds;
      const selectedTheme =
        typeof selectedBackground === "string"
          ? selectedBackground
          : selectedBackground?.value;
      const storybookTheme =
        selectedTheme === backgroundThemeOptions.light.value ? "light" : "dark";

      document.documentElement.dataset.dsStorybookTheme = storybookTheme;
      document.body.dataset.dsStorybookTheme = storybookTheme;

      return figmaExportReviewDecorator(Story, context);
    },
  ],
  globalTypes: {
    ...createFigmaExportGlobalTypes(figmaExportOptions),
  },
  initialGlobals: {
    backgrounds: {
      value: backgroundThemeOptions.dark.value,
      grid: false,
    },
    ...createFigmaExportInitialGlobals(figmaExportOptions),
  },
  parameters: {
    layout: "fullscreen",
    backgrounds: {
      default: "dark",
      options: backgroundThemeOptions,
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    options: {
      storySort: {
        order: [
          "Welcome",
          "Foundations",
          "Components",
          "Pages",
          "Compositions",
        ],
      },
    },
  },
};

export default preview;
