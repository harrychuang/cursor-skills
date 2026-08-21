# Storybook Design System Template

This repository is a reusable React + Vite + Storybook template for design-system verification, component catalog checks, token inheritance checks, and metadata-driven Prototype UI Flow review.

Requirements: Node.js 22.18 or later (Storybook 10, and the check scripts import `.storybook/project.config.ts` directly), npm.

## What Ships In The Template

- `tokens/`: a neutral starter token set (`ref -> sys -> comp`). The comp layer holds only the `example-card` slots; replace the whole set with your design-system-extractor output.
- `design-system/`: an empty design-system-extractor package plus one starter entry (`Example Card`) and the Storybook planning files generated from it. Run design-system-extractor on your own sources to replace it.
- `src/components/example-card`: the smallest catalog-backed component, bound only to comp tokens.
- `src/stories/foundations`: Color, Typography, Spacing, Shape, Shadow, Size, Opacity, Border, and Token Catalog guides driven by `src/stories/_shared/copy.ts` and the token files.
- `src/pages/prototypes/example-prototype`: the neutral prototype that exercises Story, Docs, UI Flow, Data, and Static Flow.

## Initialize A Project

Run the initializer with an explicit project name and token prefix:

```sh
npm run init-template -- --name "Design Lab" --prefix acme
```

Optional flags:

```sh
npm run init-template -- --name "Design Lab" --prefix acme-ds1 --package-name design-lab --figma-url "https://www.figma.com/design/..."
```

Prefix rules:

- Must start with a lowercase ASCII letter.
- May contain lowercase ASCII letters, digits, and single hyphens.
- Must not end with a hyphen or contain consecutive hyphens.
- Examples: `acme`, `acme-ds1`.
- Rejected examples: `cm-`, `cm--lab`, `Cm_DS`.

The command updates `.storybook/project.config.ts`, `package.json`, and the starter prefix references in `tokens/`, `src/`, `design-system/`, and `docs/design-system/`. Each project chooses its own prefix; `sbt` is only the template placeholder.

## Project Config

`.storybook/project.config.ts` is the core template boundary. Storybook, token checks, catalog checks, and prototype defaults read project-specific values from this file:

- `project.tokenPrefix`
- `project.componentClassPrefixes`
- `storybook.stories`
- `storybook.storySortOrder`
- `prototypeInspector`
- `catalog.componentStoriesRoot`

`.storybook/figma-export.config.ts` is the single source for Figma export,
review-status, and visual-comment settings. Both `.storybook/main.ts` and
`.storybook/preview.ts` import `figmaExportProjectConfig` from that file so the
server and browser cannot silently use different endpoints.

`figmaExportProjectConfig.review.visualComments` configures the same-origin meeting API,
author storage key, and capture selector. The default `#storybook-root` captures
the story; choose `body` for prototypes that render reviewable portals outside
that root. Visual meetings are a trusted-LAN/no-auth workflow and persist
canonical JSON, immutable screenshots, and portable relative-asset reports in
`design-system/figma-export-review/`. DOM-to-image does not guarantee video,
WebGL, nested iframe, cross-origin image, or framebuffer-perfect capture, and
route metadata is not state replay. A rollback must leave saved review data in
place.

## Add A Component

1. Create the component under `src/components/<component-id>/`.
2. Add or update the component catalog entry in `src/storybook/componentCatalog.ts`.
3. Add a colocated `*.stories.tsx` file with a literal title matching the catalog entry and `tags: ["autodocs"]` on the story meta.
4. Run `npm run check:storybook-catalog`; it fails when a component story is missing catalog metadata or Autodocs.

All component stories under `src/components/**/*.stories.*` are included by default. The starter template ships with `src/components/example-card` as the smallest catalog-backed component.

## Add A Prototype

Prototype UI Flow is a template core feature. New prototypes should follow this folder shape:

```text
src/pages/prototypes/<feature-prototype>/
  <FeaturePrototype>.tsx
  <FeaturePrototype>.stories.tsx
  <featurePrototypeData>.ts
  <featurePrototypeFlow>.ts
  <featurePrototypeMeta>.ts
  <feature-prototype>.css
  index.ts
  docs/
    PRD.md
    UI_SPEC.md
    FLOW_SPEC.md
    DATA_SPEC.md
    ACCEPTANCE.md
    IMPLEMENTATION_GUIDE.md
```

Attach review metadata through `parameters.prototype`. The inspector reads `id`, `title`, `description`, `docs`, `flow.routes`, `flow.nodes`, `flow.transitions`, and `data` to render Story, Docs, UI Flow, and Data modes.

The starter example lives at `src/pages/prototypes/example-prototype` and includes a Static Flow story id for Figma export review.

## Figma Importer Plugin

The local Figma plugin at `figma/storybook-code-to-design` imports `.sbfx.json` files exported from the Storybook Figma panel. Its `main.js` is generated from `@harrychuang/storybook-addon-figma-export/plugin-code`, so importer behavior stays aligned with the addon payload schema and remains project-neutral.

```sh
npm run build:figma-plugin
npm run check:figma-plugin
```

## Verification

```sh
npm run check
npm run storybook:build
npm run typecheck
```

The template is product-neutral: `src/components` contains only the starter `example-card`, `src/pages` contains only prototype infrastructure plus the example prototype, and `design-system/` contains only the starter package. Foundation guide copy (`src/stories/_shared/copy.ts`) lists only tokens that exist in `tokens/`; when you replace the tokens, prune or extend the guide entries to match.
