# @harrychuang/storybook-addon-figma-export

Storybook 10 addon: export a rendered React story into a Figma import payload. Expects a three-layer CSS token model: `ref`, `sys`, and `comp`.

## Install

When used by `ds-to-storybook`, install from the vendored skill folder:

```bash
npm install -D "file:<skill-root>/assets/figma-export-addon" @storybook/icons
```

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
  sourceReferences: [
    {
      label: "Design system source",
      url: "https://www.figma.com/file/...",
    },
  ],
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

## Source and review panel

When the toolbar toggle is on, the addon shows:

- a Figma export panel in the bottom-right corner
- a source review panel in the top-right corner

The source review panel supports `Open source`, `Edit source`, and export review statuses such as `not-reviewed`, `exported`, `need-fix`, and `approved`. Review status is saved in `localStorage` per story id.

Configure source references globally through addon options or per story through parameters:

```ts
export const Primary = {
  parameters: {
    figmaExport: {
      sourceReferences: [
        {
          label: "Primary button source",
          url: "https://www.figma.com/file/...",
          editUrl: "https://www.figma.com/file/...",
          type: "figma",
        },
      ],
    },
  },
};
```

The addon also reads `parameters.design.url` from common Storybook design addon configuration.

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
| `reviewStorageKey` | localStorage namespace for per-story export review statuses |
| `reviewStatuses` | Review status values shown in the source review panel |
| `sourceReferences` | Global source links for the source review panel |
| `storyTitlePrefix` | Story title prefix filter, or `false` for all stories |
| `componentClassPrefixes` | Class prefixes used when naming exported layers |
| `absoluteFidelityComponents` | Components exported with absolute layout |
| `embeddedSvgByDataGraphic` | Inline SVG map keyed by `data-graphic` |

## API exports

- `@harrychuang/storybook-addon-figma-export` — types and utilities
- `@harrychuang/storybook-addon-figma-export/preview` — decorator and globals helpers
- `@harrychuang/storybook-addon-figma-export/preset` — Storybook preset (used automatically via `addons`)
- `@harrychuang/storybook-addon-figma-export/manager` — toolbar registration (side effect)
- `@harrychuang/storybook-addon-figma-export/styles.css` — exporter overlay styles
