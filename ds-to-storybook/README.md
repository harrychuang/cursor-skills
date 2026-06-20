# Design System to Storybook Skill

`ds-to-storybook` turns an extracted design-system package into token-backed Storybook foundations, shared UI components, and stories.

Use it after `design-system-extractor` has produced `design-system/`, `tokens/`, and component specs. This skill does not re-extract a design system. It reads the extracted docs as the source of truth, plans a bounded implementation pass, writes or updates Storybook code, verifies the pass, records the result, and stops at a checkpoint.

## When To Use

Use this skill when you want to:

- import or mirror extracted `ref -> sys -> comp` tokens into a product repo
- create Storybook foundation docs for color, type, spacing, radius, elevation, or motion
- implement selected component specs from `design-system/components/*.md`
- build a reusable component library from `COMPONENT_INVENTORY.md`
- trace extractor source evidence into `STORYBOOK_SOURCE_TRACE.md`
- infer component dependency order into `STORYBOOK_COMPONENT_PLAN.md`
- install and configure the bundled Figma export addon for compatible React Storybook 10 projects
- keep component implementation work split into short, resumable batches

Do not use it to infer a design system from screenshots or Figma from scratch. Run or continue `design-system-extractor` first.

## Required Inputs

The design-system package should contain:

```txt
design-system/
├── SESSION_STATE.md
├── DESIGN_EVIDENCE_MAP.md
├── TOKEN_ARCHITECTURE.md
├── DESIGN_ELEMENTS.md
├── COMPONENT_INVENTORY.md
└── components/
    └── <component-name>.md

tokens/
├── tokens-ref.css
├── tokens-sys.css
├── tokens-comp.css
└── tokens.css
```

For component implementation, each component spec should include:

- `Evidence`
- `Source Trace`
- `Component Fingerprint`
- `Anatomy`
- `Variants`
- `States`
- `Token Contract`
- `Layout Rules`
- `Accessibility Rules`

If source trace is missing but the component spec is otherwise complete, the skill can continue and record the missing source. If extractor evidence exists but cannot be resolved, mark the item `needs-source`. If the component spec itself is incomplete, mark the item `needs-extraction`.

## Standard Workflow

1. Locate the design-system package and product repo.
2. Read `SESSION_STATE.md`, `DESIGN_EVIDENCE_MAP.md`, `COMPONENT_INVENTORY.md`, relevant component specs, and touched token files.
3. Generate source trace and dependency plan:

```sh
node <skill-root>/scripts/trace_sources.mjs <design-system-package-root> --write
node <skill-root>/scripts/plan_component_batches.mjs <design-system-package-root> --write --queue
```

4. Choose a bounded pass:
   - foundations only
   - 3-5 simple components
   - 1-2 complex composites
   - blocker-resolution only
5. Create or update an implementation map.
6. Resolve each selected component through:

```txt
COMPONENT_INVENTORY.md
  -> design-system/components/<component>.md
  -> Evidence IDs / Source Trace
  -> DESIGN_EVIDENCE_MAP.md
  -> Figma node, screenshot crop, route, or source files
  -> product component/story target
```

7. Inspect existing product components and Storybook conventions.
8. Run product discovery:

```sh
node <skill-root>/scripts/inspect_storybook_project.mjs <product-repo-root> --json
```

9. Integrate tokens before components.
10. Implement the selected components with co-located stories.
11. Run the cheapest reliable verification.
12. Update the implementation map and queue, then stop.

## Bounded Passes

This skill intentionally avoids long continuous implementation runs. If implementing more than one component, or if the inventory has more than 8 implementable components, create or update:

```txt
design-system/STORYBOOK_COMPONENT_PLAN.md
design-system/STORYBOOK_COMPONENT_QUEUE.md
```

or, when the design-system package is external:

```txt
docs/design-system/storybook-component-queue.md
```

Use `assets/storybook-component-queue-template.md` when starting the queue.

Every pass should leave durable state:

- selected batch
- dependency plan status
- source trace status
- story source URL status
- product target files
- Storybook story target files
- verification result
- blocked items
- next queued pass

## Implementation Map

Create or update:

```txt
design-system/STORYBOOK_IMPLEMENTATION_MAP.md
```

or, when the design-system package is external:

```txt
docs/design-system/storybook-implementation.md
```

Use `assets/storybook-implementation-map-template.md` when starting a new map.

The implementation map records:

- docs read during the pass
- source trace records
- dependency decisions
- co-located component/page target layout
- token decisions
- component target files
- story target files
- addon setup status
- verification log
- checkpoint and next prompt

## Storybook Starter

For greenfield projects, bootstrap a generic Storybook workspace from:

```txt
assets/storybook-starter/
```

Install it into an empty target directory:

```sh
node <skill-root>/scripts/install_storybook_starter.mjs /path/to/target-project
```

The starter includes Storybook 10, the bundled Figma export addon, prototype UI flow inspector, placeholder `--ds-*` tokens, and empty `src/components/` / `design-system/components/` scaffolds. Use `--force` only when you intend to overwrite an existing starter-shaped project.

## Figma Export Addon

This skill vendors `@harrychuang/storybook-addon-figma-export` under:

```txt
assets/figma-export-addon/
```

Install it with the bundled installer, not GitHub:

```sh
node <skill-root>/scripts/install_figma_export_addon.mjs <product-repo-root>
```

The installer copies the addon into `<product-repo-root>/.storybook/vendor/figma-export-addon/`, detects the package manager, installs the local `file:` dependency, and adds `@storybook/icons` only when needed. Use `--copy-only` when you only want to stage the vendored package:

```sh
node <skill-root>/scripts/install_figma_export_addon.mjs <product-repo-root> --copy-only
```

The addon should be installed by default only when:

- Storybook exists and is `^10`
- React is available
- package manager is detectable
- `.storybook/main.*` and `.storybook/preview.*` can be updated safely

If incompatible, record `figma-export-addon` as `blocked` in the implementation map with the reason.

Use the inspector before setup when compatibility is unclear:

```sh
node <skill-root>/scripts/inspect_storybook_project.mjs <product-repo-root> --json
```

### Storybook Setup

Generate project-local config before editing Storybook files:

```sh
node <skill-root>/scripts/generate_figma_export_config.mjs <design-system-package-root> --product-root <product-repo-root> --write
node <skill-root>/scripts/generate_component_spec_modules.mjs <design-system-package-root> --product-root <product-repo-root> --write
node <skill-root>/scripts/sync_story_source_parameters.mjs <design-system-package-root> --product-root <product-repo-root> --write
```

If stories live outside common roots, add one or more `--story-root <path>` flags.

`.storybook/main.ts`:

```ts
import type { StorybookConfig } from "storybook";

const config: StorybookConfig = {
  addons: ["@harrychuang/storybook-addon-figma-export"],
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
import type { FigmaExportAddonOptions } from "@harrychuang/storybook-addon-figma-export";
import { componentSpecModules, specModulePathForSlug } from "./figma-component-specs";
import { figmaExportProjectConfig } from "./figma-export.config";
import "@harrychuang/storybook-addon-figma-export/styles.css";
import "@harrychuang/storybook-addon-figma-export/review.css";

const figmaExportOptions = {
  ...figmaExportProjectConfig.addon,
} satisfies FigmaExportAddonOptions;

const preview: Preview = {
  decorators: [
    createFigmaExportReviewDecorator(figmaExportOptions, {
      apiPath: figmaExportProjectConfig.review.apiPath,
      enabled: figmaExportProjectConfig.review.enabled,
      getFigmaSourceUrl(context, componentTitle) {
        return getFigmaSourceUrl(context.parameters, componentTitle, {
          componentSpecModules,
          designSystemFileUrl: figmaExportProjectConfig.source.designSystemFileUrlFallback,
          nodeOverrides: figmaExportProjectConfig.source.nodeOverrides,
          specModulePathForSlug,
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

export default preview;
```

Validate wiring before marking setup complete:

```sh
node <skill-root>/scripts/validate_figma_export_setup.mjs <product-repo-root>
```

## Source Review Panel

When the toolbar toggle is on, the addon renders:

- `Figma export` panel in the bottom-right corner
- optional `Export review` panel in the top-right corner when the review decorator is configured
- `Copy design to Figma` icon action in the export panel for SVG clipboard review

The review helper includes:

- `Open source`
- `Edit source`
- export/import review status persisted through the configured Storybook review API

Default review statuses:

- `exported`
- `imported`
- `needs-fix`
- `approved`

Per-story source references:

```ts
export const Primary = {
  parameters: {
    figmaSourceUrl: "https://www.figma.com/design/...?...node-id=...",
  },
};
```

The helper also reads `parameters.figma.url` and `parameters.design.url` from common Storybook design addon configuration.

Use `scripts/sync_story_source_parameters.mjs` to report or write these parameters from `STORYBOOK_SOURCE_TRACE.md` after story files exist.

If the toolbar appears but review/Open source does not, see `references/figma-export-review-setup.md`.

## Recommended Prompts

Foundations pass:

```txt
Use $ds-to-storybook to import the extracted design-system tokens into this product repo and create Storybook foundation docs. Use the existing design-system docs as source of truth, update the implementation map, run available checks, then stop at the checkpoint.
```

Component batch:

```txt
Use $ds-to-storybook for the next component batch. Start from COMPONENT_INVENTORY.md and STORYBOOK_COMPONENT_QUEUE.md, resolve Source Trace for selected components, implement only this batch with token-backed styles and stories, verify, update the queue and implementation map, then stop.
```

Single component:

```txt
Use $ds-to-storybook to implement <component-name> from design-system/components/<component-name>.md into Storybook. Resolve evidence/source trace first, reuse existing product components where appropriate, add stories for documented states, verify, update the implementation map, then stop.
```

Addon setup only:

```txt
Use $ds-to-storybook to install and configure the bundled Figma export addon for this React Storybook 10 project. Use scripts/inspect_storybook_project.mjs, scripts/install_figma_export_addon.mjs, scripts/generate_figma_export_config.mjs, scripts/generate_component_spec_modules.mjs, scripts/sync_story_source_parameters.mjs, and scripts/validate_figma_export_setup.mjs; wire preview globals/decorator/styles/review helper, sync story source URLs from STORYBOOK_SOURCE_TRACE.md, verify the toolbar and panels, update the implementation map, then stop.
```

## Cross-Agent Setup

This skill is designed to be portable across Claude Code, Codex, and Cursor. The key is to keep the same durable workflow files in the target project:

- `design-system/STORYBOOK_IMPLEMENTATION_MAP.md`
- `design-system/STORYBOOK_SOURCE_TRACE.md`
- `design-system/STORYBOOK_COMPONENT_PLAN.md`
- `design-system/STORYBOOK_COMPONENT_QUEUE.md`
- `design-system/components/*.md`
- `tokens/*.css`

### Claude Code

Claude Code can use skills from `.claude/skills/<name>/SKILL.md`. Copy this skill folder into the target repo:

```txt
.claude/
└── skills/
    └── design-system-to-storybook/
        ├── SKILL.md
        ├── README.md
        ├── agents/
        ├── references/
        ├── scripts/
        └── assets/
```

Then add the template from `agents/claude.md` to the target repo's `CLAUDE.md`, or keep the skill discoverable and invoke it directly:

```txt
Use the design-system-to-storybook skill to implement the next Storybook component batch from the extracted design-system docs.
```

When installing the addon from Claude Code, use the bundled installer:

```sh
node <skill-root>/scripts/install_figma_export_addon.mjs <product-repo-root>
```

### Codex

Codex uses repository instructions from `AGENTS.md`. Copy this skill folder into a repo-local `skills/` directory:

```txt
skills/
└── design-system-to-storybook/
    ├── SKILL.md
    ├── README.md
    ├── agents/
    ├── references/
    ├── scripts/
    └── assets/
```

Then copy the template from `agents/codex-agents.md` into the target repo's `AGENTS.md`. Use the bundled installer for addon setup:

```sh
node <skill-root>/scripts/install_figma_export_addon.mjs <product-repo-root>
```

### Cursor

Cursor project rules live in `.cursor/rules/*.mdc`. Copy this skill folder into `skills/design-system-to-storybook/`, then copy:

```txt
skills/design-system-to-storybook/agents/cursor-rule.mdc
```

to:

```txt
.cursor/rules/ds-to-storybook.mdc
```

The Cursor rule points agents back to `skills/design-system-to-storybook/SKILL.md` and keeps implementation bounded by the queue and implementation map.

### Shared Rule

Regardless of agent, keep these constraints:

- Use extracted design-system docs as source of truth.
- Resolve evidence and source trace before code.
- Start multi-component work from `STORYBOOK_COMPONENT_PLAN.md`.
- Use tokens before component CSS values.
- Implement one bounded pass.
- Update the implementation map and queue before stopping.
- Install the Figma export addon with the bundled installer, not GitHub.

## Maintenance

The vendored addon source and built `dist/` are both committed because downstream projects install it through a local `file:` dependency. If the addon source changes, run from `assets/figma-export-addon/`:

```sh
npm install --no-package-lock
npm run build
rm -rf node_modules
```

Then verify:

```sh
npm pack --dry-run assets/figma-export-addon
```

Do not commit `node_modules`, lockfiles, or generated `.tgz` files.
