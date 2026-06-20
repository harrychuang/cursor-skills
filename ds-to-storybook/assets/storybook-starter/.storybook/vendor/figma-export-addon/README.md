# @harrychuang/storybook-addon-figma-export

Storybook 10 addon: export a rendered React story into a Figma import payload. Expects a three-layer CSS token model: `ref`, `sys`, and `comp`.

## Install

This copy is bundled by the `design-system-to-storybook` skill. During normal
skill usage, do not install it from GitHub. Run the skill installer from the
skill root instead:

```bash
node scripts/install_figma_export_addon.mjs <product-repo-root>
```

The installer copies this package into
`.storybook/vendor/figma-export-addon/` in the target project and installs it
as `file:.storybook/vendor/figma-export-addon`.

Requires `storybook@^10`, `react`, and `@storybook/icons` in the host project.

## Setup

### 1. Register the addon (manager toolbar)

`.storybook/main.ts`:

```ts
import type { StorybookConfig } from "storybook";

const config: StorybookConfig = {
  addons: ["@harrychuang/storybook-addon-figma-export"],
  // ...framework, stories, etc.
};

export default config;
```

This loads the addon preset and registers the Figma export toolbar toggle.
When the toolbar toggle is on, the exporter overlay provides `Copy JSON`,
`Plugin Console Script`, and an icon-only `Copy design to Figma` action. The
Figma copy action writes an SVG design representation to the clipboard so it can
be pasted directly into Figma for quick visual review.

### 2. Wire preview (decorator + globals)

`.storybook/preview.ts`:

```ts
import type { Preview } from "storybook";

import {
  createFigmaExportDecorator,
  createFigmaExportGlobalTypes,
  createFigmaExportInitialGlobals,
} from "@harrychuang/storybook-addon-figma-export/preview";
import type { FigmaExportAddonOptions } from "@harrychuang/storybook-addon-figma-export";
import "@harrychuang/storybook-addon-figma-export/styles.css";

const figmaExportOptions = {
  componentClassPrefixes: ["md-"],
  storyTitlePrefix: "Components/",
} satisfies FigmaExportAddonOptions;

const preview: Preview = {
  decorators: [createFigmaExportDecorator(figmaExportOptions)],
  globalTypes: {
    ...createFigmaExportGlobalTypes(figmaExportOptions),
  },
  initialGlobals: {
    ...createFigmaExportInitialGlobals(figmaExportOptions),
  },
};

export default preview;
```

Adjust `figmaExportOptions` for your design tokens and story naming.

### Export review panel

Use the bundled review helpers when you want Storybook to track each story's
Figma source URL and export/import review state. The
`design-system-to-storybook` skill wires this review decorator by default so the
Open source action is available when source URLs can be resolved.

`.storybook/main.ts`:

```ts
import type { StorybookConfig } from "storybook";
import { createFigmaReviewStatusPlugin } from "@harrychuang/storybook-addon-figma-export/review-server";

const config: StorybookConfig = {
  // ...stories, addons, framework
  async viteFinal(config) {
    return {
      ...config,
      plugins: [
        ...(config.plugins ?? []),
        createFigmaReviewStatusPlugin({
          filePath: "design-system/figma-export-review-status.json",
        }),
      ],
    };
  },
};

export default config;
```

`.storybook/preview.ts`:

```ts
import type { Preview } from "storybook";
import {
  createFigmaExportGlobalTypes,
  createFigmaExportInitialGlobals,
} from "@harrychuang/storybook-addon-figma-export/preview";
import { createFigmaExportReviewDecorator } from "@harrychuang/storybook-addon-figma-export/review";
import { getFigmaSourceUrl } from "@harrychuang/storybook-addon-figma-export/source";
import "@harrychuang/storybook-addon-figma-export/styles.css";

const preview: Preview = {
  decorators: [
    createFigmaExportReviewDecorator(figmaExportOptions, {
      getFigmaSourceUrl(context) {
        return getFigmaSourceUrl(context.parameters, context.title ?? "", {
          componentSpecModules,
          designSystemFileUrl,
          nodeOverrides,
        });
      },
    }),
  ],
  globalTypes: {
    ...createFigmaExportGlobalTypes(figmaExportOptions),
  },
  initialGlobals: {
    ...createFigmaExportInitialGlobals(figmaExportOptions),
  },
};
```

The default source resolver reads `parameters.figmaSourceUrl`,
`parameters.figma.url`, or `parameters.design.url`. Use `getFigmaSourceUrl`
for project-specific fallbacks, such as parsing local design-system Markdown.
The fallback inputs (`componentSpecModules`, `designSystemFileUrl`, and
`nodeOverrides`) should come from project-local Storybook config, not from the
addon package.

### Manual manager registration (optional)

If you do not use the preset entry in `addons`, register the tool yourself in `.storybook/manager.ts`:

```ts
import { registerFigmaExportTool } from "@harrychuang/storybook-addon-figma-export/manager";

registerFigmaExportTool();
```

## Token prefix detection

By default, the exporter auto-detects the token prefix from CSS custom properties:

```txt
--{prefix}-ref-*
--{prefix}-sys-*
--{prefix}-comp-*
```

If auto-detection fails, set `tokenPrefix` (for example `"md"`).

## Options

| Option | Description |
| --- | --- |
| `tokenPrefix` | Explicit token prefix |
| `tokenLayers` | Custom segment names for `ref`, `sys`, `comp` |
| `collections` | Figma variable collection names per layer |
| `pluginDataKey` | Figma variable plugin data key for duplicate detection |
| `globalName` | Storybook global for the toolbar switch |
| `storyTitlePrefix` | Story title prefix filter, or `false` for all stories |
| `componentClassPrefixes` | Class prefixes used when naming exported layers |
| `absoluteFidelityComponents` | Components exported with absolute layout |
| `embeddedSvgByDataGraphic` | Inline SVG map keyed by `data-graphic` |

## API exports

- `@harrychuang/storybook-addon-figma-export` — types and utilities
- `@harrychuang/storybook-addon-figma-export/preview` — decorator and globals helpers
- `@harrychuang/storybook-addon-figma-export/preset` — Storybook preset (used automatically via `addons`)
- `@harrychuang/storybook-addon-figma-export/manager` — toolbar registration (side effect)
- `@harrychuang/storybook-addon-figma-export/review` — optional export review panel and decorator
- `@harrychuang/storybook-addon-figma-export/review-server` — optional Vite middleware for persisted review state
- `@harrychuang/storybook-addon-figma-export/source` — source URL resolver helpers for story parameters and documented Figma node fallbacks
- `@harrychuang/storybook-addon-figma-export/styles.css` — exporter and review overlay styles
- `@harrychuang/storybook-addon-figma-export/review.css` — optional direct export review panel styles
