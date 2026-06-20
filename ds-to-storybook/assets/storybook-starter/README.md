# Storybook Starter

Generic Storybook 10 workspace bundled with the `design-system-to-storybook` skill. Use it as the default starting point for token-backed component libraries, Figma export review, and product prototype flows.

## Included

- Storybook 10 + React + Vite
- `@harrychuang/storybook-addon-figma-export` (vendored under `.storybook/vendor/figma-export-addon/`)
- Prototype inspector addon (Docs, UI Flow, Data) under `.storybook/prototype-inspector/`
- Placeholder token layers with `--ds-*` prefix
- Empty `src/components/` and `design-system/components/` scaffolds

## Quick start

```bash
npm install
npm run storybook
```

Open `Welcome/Getting Started` in Storybook to confirm the workspace boots.

## Install into another project

From the `design-system-to-storybook` skill root:

```bash
node scripts/install_storybook_starter.mjs /path/to/target-project
```

The installer copies this starter into an empty or new project directory and runs `npm install`.

## Typical workflow

1. Bootstrap or copy this starter into a product repo.
2. Run `design-system-extractor` to populate `design-system/` and `tokens/`.
3. Run `design-system-to-storybook` to add components, foundations, and Figma export config.
4. Run `prototype-storybook-flow` to add clickable product prototypes under `src/pages/prototypes/`.

## Layout

```text
.storybook/                 Storybook config and bundled addons
src/components/            Shared UI components (co-located stories)
src/pages/prototypes/      Product prototypes with UI Flow metadata
src/stories/               Foundation docs and welcome stories
tokens/                    ref / sys / comp token layers
design-system/             Extracted specs and implementation maps
```

## Verification

```bash
npm run check
```

Runs token inheritance, story catalog, and TypeScript checks.
