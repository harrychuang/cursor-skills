# Figma Export Review Setup

Use this reference when the Figma export toolbar appears but the review overlay or Open source action is missing.

Before debugging manually, run:

```sh
node <skill-root>/scripts/validate_figma_export_setup.mjs <product-repo-root>
```

Use the failed checks as the repair list.

If Open source must fall back to extracted component specs, generate the project-local spec module map first:

```sh
node <skill-root>/scripts/generate_component_spec_modules.mjs <design-system-package-root> --product-root <product-repo-root> --write
```

The addon has two preview UIs:

- `createFigmaExportDecorator`: shows the export overlay for copying JSON or plugin-console code.
- `createFigmaExportReviewDecorator`: wraps the export overlay and also shows the review overlay with the Open source action.

For this skill, use `createFigmaExportReviewDecorator` by default. Do not configure only `createFigmaExportDecorator` unless the user explicitly opts out of review/Open source.

## Why The Review Overlay Is Missing

Common causes:

- `.storybook/preview.*` imports only `createFigmaExportDecorator`, not `createFigmaExportReviewDecorator`.
- `.storybook/preview.*` does not import `@harrychuang/storybook-addon-figma-export/review.css`.
- Storybook toolbar global `figmaExport` is still `off`; the review overlay renders only after the toolbar is toggled on.
- `figmaExportOptions.storyTitlePrefix` excludes the current story title. Use `false` to include all stories, or include every namespace such as `Components/`, `Pages/`, and `Foundations/`.
- `.storybook/main.*` does not include `"@harrychuang/storybook-addon-figma-export"` in `addons`, so the toolbar control is missing.
- `.storybook/main.*` does not mount `createFigmaReviewStatusPlugin`, so the overlay may show a save/load error after it renders.

## Why Open Source Is Missing

Common causes:

- The story has no `parameters.figmaSourceUrl`, `parameters.figma.url`, or `parameters.design.url`.
- The preview fallback callback does not call `getFigmaSourceUrl` from `@harrychuang/storybook-addon-figma-export/source`.
- `designSystemFileUrlFallback` from `.storybook/figma-export.config.ts` was passed without mapping it to `designSystemFileUrl`.
- `nodeOverrides` keys do not match the component slug derived from the Storybook title after `storyTitlePrefix` is removed.

## Preview Wiring

In `.storybook/preview.*`, prefer this shape:

```ts
import {
  createFigmaExportGlobalTypes,
  createFigmaExportInitialGlobals,
  type FigmaExportAddonOptions,
} from "@harrychuang/storybook-addon-figma-export";
import { createFigmaExportReviewDecorator } from "@harrychuang/storybook-addon-figma-export/review";
import { getFigmaSourceUrl } from "@harrychuang/storybook-addon-figma-export/source";
import "@harrychuang/storybook-addon-figma-export/styles.css";
import "@harrychuang/storybook-addon-figma-export/review.css";

import { componentSpecModules, specModulePathForSlug } from "./figma-component-specs";
import { figmaExportProjectConfig } from "./figma-export.config";

const figmaExportOptions: FigmaExportAddonOptions = figmaExportProjectConfig.addon;

export const decorators = [
  createFigmaExportReviewDecorator(figmaExportOptions, {
    apiPath: figmaExportProjectConfig.review.apiPath,
    enabled: figmaExportProjectConfig.review.enabled,
    getFigmaSourceUrl: (context, componentTitle) =>
      getFigmaSourceUrl(context.parameters, componentTitle, {
        componentSpecModules,
        designSystemFileUrl: figmaExportProjectConfig.source.designSystemFileUrlFallback,
        nodeOverrides: figmaExportProjectConfig.source.nodeOverrides,
        specModulePathForSlug,
      }),
  }),
];

export const globalTypes = {
  ...createFigmaExportGlobalTypes(figmaExportOptions),
};

export const initialGlobals = {
  ...createFigmaExportInitialGlobals(figmaExportOptions),
};
```

Preserve existing decorators, globals, and initial globals when merging this into a real project.

If `componentSpecModules` is not available yet, keep the story-level `parameters.figmaSourceUrl` path working first, then add the generated project-local spec module map. Do not hand-write bundler-specific glob code unless the project explicitly prefers it.

## Main Wiring

In `.storybook/main.*`, preserve existing config and add:

```ts
import { createFigmaReviewStatusPlugin } from "@harrychuang/storybook-addon-figma-export/review-server";
import { figmaExportProjectConfig } from "./figma-export.config";

export default {
  addons: [
    "@harrychuang/storybook-addon-figma-export",
  ],
  async viteFinal(config) {
    config.plugins = [
      ...(config.plugins ?? []),
      createFigmaReviewStatusPlugin({
        apiPath: figmaExportProjectConfig.review.apiPath,
        filePath: figmaExportProjectConfig.review.statusFilePath,
        name: figmaExportProjectConfig.review.pluginName,
      }),
    ];
    return config;
  },
};
```

For non-Vite Storybook builders, keep the preview decorator but record review-status persistence as blocked unless the project already has a middleware hook equivalent.
