# Figma Export Tooling

This project uses the vendored Figma export addon as the generic export/import
engine, with project-specific settings kept in
`.storybook/figma-export.config.ts`.

## Boundaries

- Generic tooling lives in the Storybook addon and its Figma importer payload.
- Project settings live in `.storybook/figma-export.config.ts`.
- Storybook preview and Vite middleware both import that same config object.
- Component markup remains responsible for stable export hints such as
  `data-component`, `data-variant`, and `data-figma-*`.
- Storybook review state is project-local and stored in
  `design-system/component-review-status.json`.

## Generic Export Hints

- `data-component` marks reusable component roots.
- `data-variant` distinguishes Figma component variants.
- `data-figma-text-auto-width="true"` imports text as hug content.
- `data-figma-text-fixed-width="true"` preserves the measured text width for
  fixed-width columns instead of adding anti-clipping safety width.
- `data-figma-layout-align="stretch"` imports stretch child sizing.
- `data-figma-layout-grow="1"` imports fill-container child sizing.
- `data-figma-layout-sizing-horizontal="hug"` imports hug horizontal sizing.
- `data-figma-text-align-vertical="center"` imports centered text.
- CSS `linear-gradient(...)` backgrounds import as Figma linear-gradient fills,
  with color-stop variables bound when the stops use design tokens.

These hints are intended to be portable across projects as long as the addon and
Figma importer understand the same payload schema.

## Project Configuration

`.storybook/figma-export.config.ts` owns the project-specific values:

- component class prefixes, such as `cm-`
- component names that use absolute-fidelity export
- Storybook title prefixes
- Figma source file fallback URL
- documented source-node overrides
- review API path, plugin name, and status-file path
- visual-comments API path, persistence directory, capture selector, and author storage key

When review and export are enabled, both sections mount inside one responsive
bottom-right workspace dock. The dock reserves right-side space on wide viewports
and bottom space on narrow viewports. Visual comments use a separate top-right
Edit icon launcher that expands the meeting, capture, composer, and Reports
controls without overlapping the workspace. Both surfaces remain excluded from
screenshots. Meeting reports separate the current meeting from closed history and
show capture/comment counts.

If another project adopts the tooling, create its own config instead of changing
the addon or hard-coding values in Storybook preview files.

## Current Patch Layer

`package.json` runs `scripts/patch-figma-export-addon.mjs` after install. The
patch currently applies generic export/import capabilities to the local addon
copy in `node_modules`, then delegates component-import support to
`scripts/patch-figma-export-component-import.mjs`.

Treat this patch layer as a bridge. Long term, generic behavior should move
upstream into the addon package so projects only maintain config.

## Regression Guard

When changing the tooling, verify at minimum:

- `npm run check`
- `npm run storybook:build`
- targeted Storybook export smoke checks for recently approved components
- no changes to existing component `data-component`, `data-variant`, or
  `data-figma-*` hints unless the component itself is intentionally changing
