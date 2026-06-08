# Design System to Storybook Skill

`ds-to-storybook` turns an extracted design-system package into token-backed Storybook foundations, shared UI components, and stories.

Use it after `design-system-extractor` has produced `design-system/`, `tokens/`, and component specs. This skill does not re-extract a design system. It reads the extracted docs as the source of truth, plans a bounded implementation pass, writes or updates Storybook code, verifies the pass, records the result, and stops at a checkpoint.

## When To Use

Use this skill when you want to:

- import or mirror extracted `ref -> sys -> comp` tokens into a product repo
- create Storybook foundation docs for color, type, spacing, radius, elevation, or motion
- implement selected component specs from `design-system/components/*.md`
- build a reusable component library from `COMPONENT_INVENTORY.md`
- install the vendored Figma export addon for compatible React Storybook 10 projects
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

If source trace is missing but the component spec is otherwise complete, the skill can continue and record `source-trace-missing`. If the component spec itself is incomplete, it should mark the item `needs-extraction`.

## Standard Workflow

1. Locate the design-system package and product repo.
2. Read `SESSION_STATE.md`, `COMPONENT_INVENTORY.md`, relevant component specs, and touched token files.
3. Choose a bounded pass:
   - foundations only
   - 3-5 simple components
   - 1-2 complex composites
   - blocker-resolution only
4. Create or update an implementation map.
5. Resolve each selected component through:

```txt
COMPONENT_INVENTORY.md
  -> design-system/components/<component>.md
  -> Evidence IDs / Source Trace
  -> DESIGN_EVIDENCE_MAP.md
  -> Figma node, screenshot crop, route, or source files
  -> product component/story target
```

6. Inspect existing product components and Storybook conventions.
7. Integrate tokens before components.
8. Implement the selected components and stories.
9. Run the cheapest reliable verification.
10. Update the implementation map and queue, then stop.

## Bounded Passes

This skill intentionally avoids long continuous implementation runs. If the inventory has more than 8 implementable components, create or update:

```txt
design-system/STORYBOOK_COMPONENT_QUEUE.md
```

or, when the design-system package is external:

```txt
docs/design-system/storybook-component-queue.md
```

Use `assets/storybook-component-queue-template.md` when starting the queue.

Every pass should leave durable state:

- selected batch
- source trace status
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
- token decisions
- component target files
- story target files
- addon setup status
- verification log
- checkpoint and next prompt

## Figma Export Addon

This skill vendors `@harrychuang/storybook-addon-figma-export` under:

```txt
assets/figma-export-addon/
```

Install it from the local skill folder, not GitHub:

```sh
npm install -D "file:<skill-root>/assets/figma-export-addon" @storybook/icons
```

Equivalent commands:

```sh
pnpm add -D "file:<skill-root>/assets/figma-export-addon" @storybook/icons
yarn add -D "file:<skill-root>/assets/figma-export-addon" @storybook/icons
bun add -d "file:<skill-root>/assets/figma-export-addon" @storybook/icons
```

The addon should be installed by default only when:

- Storybook exists and is `^10`
- React is available
- package manager is detectable
- `.storybook/main.*` and `.storybook/preview.*` can be updated safely

If incompatible, record `figma-export-addon` as `blocked` in the implementation map with the reason.

### Storybook Setup

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
      editUrl: "https://www.figma.com/file/...",
      type: "figma",
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

## Source Review Panel

When the toolbar toggle is on, the addon renders:

- `Figma export` panel in the bottom-right corner
- `Source review` panel in the top-right corner

The source review panel includes:

- `Open source`
- `Edit source`
- export review status stored per story in `localStorage`

Default review statuses:

- `not-reviewed`
- `exported`
- `need-fix`
- `approved`

Per-story source references:

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
Use $ds-to-storybook to install and configure the vendored Figma export addon for this React Storybook 10 project. Use the local file dependency from the skill, wire preview globals/decorator/styles, configure sourceReferences from design-system Source Trace, verify the toolbar and panels, update the implementation map, then stop.
```

## Cross-Agent Setup

This skill is designed to be portable across Claude Code, Codex, and Cursor. The key is to keep the same durable workflow files in the target project:

- `design-system/STORYBOOK_IMPLEMENTATION_MAP.md`
- `design-system/STORYBOOK_COMPONENT_QUEUE.md`
- `design-system/components/*.md`
- `tokens/*.css`

### Claude Code

Claude Code can use skills from `.claude/skills/<name>/SKILL.md`. Copy this skill folder into the target repo:

```txt
.claude/
└── skills/
    └── ds-to-storybook/
        ├── SKILL.md
        ├── README.md
        ├── agents/
        └── assets/
```

Then add the template from `agents/claude.md` to the target repo's `CLAUDE.md`, or keep the skill discoverable and invoke it directly:

```txt
Use the ds-to-storybook skill to implement the next Storybook component batch from the extracted design-system docs.
```

When installing the addon from Claude Code, use the local skill path:

```sh
npm install -D "file:.claude/skills/ds-to-storybook/assets/figma-export-addon" @storybook/icons
```

### Codex

Codex uses repository instructions from `AGENTS.md`. Copy this skill folder into a repo-local `skills/` directory:

```txt
skills/
└── ds-to-storybook/
    ├── SKILL.md
    ├── README.md
    ├── agents/
    └── assets/
```

Then copy the template from `agents/codex-agents.md` into the target repo's `AGENTS.md`. The addon install path should be:

```sh
npm install -D "file:skills/ds-to-storybook/assets/figma-export-addon" @storybook/icons
```

### Cursor

Cursor project rules live in `.cursor/rules/*.mdc`. Copy this skill folder into `skills/ds-to-storybook/`, then copy:

```txt
skills/ds-to-storybook/agents/cursor-rule.mdc
```

to:

```txt
.cursor/rules/ds-to-storybook.mdc
```

The Cursor rule points agents back to `skills/ds-to-storybook/SKILL.md` and keeps implementation bounded by the queue and implementation map.

### Shared Rule

Regardless of agent, keep these constraints:

- Use extracted design-system docs as source of truth.
- Resolve evidence and source trace before code.
- Use tokens before component CSS values.
- Implement one bounded pass.
- Update the implementation map and queue before stopping.
- Install the Figma export addon from the local vendored folder, not GitHub.

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
