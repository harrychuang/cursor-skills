# Storybook Architecture

## Purpose

Storybook is the verification surface for this design system. The source of truth remains:

- `tokens/` for CSS custom-property design tokens.
- `design-system/` for evidence, component specs, interaction gaps, and composition rules.
- Storybook stories for visual validation, token browsing, and future component state coverage.

## Current Scaffold

- Builder: Storybook with React and Vite.
- Project configuration boundary: `.storybook/project.config.ts`.
- Global token import: `.storybook/preview.ts` imports `tokens/tokens.css`.
- Component source and colocated component stories: `src/components/<component>/`.
- Foundation stories: `src/stories/foundations/`.
- Governance stories: `src/stories/governance/`.
- Page source and colocated page stories: `src/pages/<page>/`.
- Shared story guide data and copy: `src/stories/_shared/`.
- Internal Storybook tooling only: `src/storybook/`.
- AI-readable starter component catalog: `src/storybook/componentCatalog.ts`.

Component and page stories live next to their source so implementation, CSS, exports, and visual states can be reviewed as one unit. `src/stories/` is reserved for cross-cutting Storybook content such as foundations, governance, and shared guide data.

The template default surface is controlled by `storybook.stories` in `.storybook/project.config.ts`. The default surface loads generic governance, the starter foundation story, `example-card`, and `example-prototype`. Legacy project-specific material can remain in the repository as reference input, but it is not part of the initialized Storybook navigation.

## Project Configuration

Run initialization with an explicit project prefix:

```sh
npm run init-template -- --name "Design Lab" --prefix acme
```

The initializer generates project settings for:

- Project name, package name, token prefix, and component class prefixes.
- Storybook story globs, static directories, backgrounds, and story sort.
- Figma export class prefixes, source fallback, node overrides, and review middleware.
- Prototype inspector naming and route preview measurement selector.
- Component catalog story root.

`cm` is not a template default. Each project must set its own prefix through `.storybook/project.config.ts` or `npm run init-template`.

## Component Taxonomy And AI Discovery

Every shared component story must use `src/storybook/componentCatalog.ts` for AI metadata, while keeping the CSF `title` as a static string literal required by Storybook:

```ts
title: "Components/<Category>/<Component Name>"
parameters: {
  ...getComponentStoryParameters("<component-id>"),
}
```

The static `title` must match the catalog-derived `storyTitle`. The catalog is the source of truth for component subcategories, purpose, `useWhen` guidance, dependencies, keywords, design-system doc paths, product paths, and documentation provenance. Storybook exposes the same information in `Governance/Component Catalog`.

Current starter component subcategory:

- Examples

When adding a new component, add or update the catalog entry before wiring the story title. Mark entries as `extracted` only when a reviewed design-system component spec exists; otherwise use `implementation-derived` and `needs-review` in the component spec. Run the catalog coverage check before closeout so literal story titles and catalog metadata do not drift.

## Governance Rules

Future work uses `$design-system-governance` before creating or changing tokens, shared components, composite views, or stories.

Required flow:

1. Check the existing component inventory and specs.
2. Confirm the needed `--<prefix>-comp-*` token slots already exist.
3. Confirm those component tokens map to `--<prefix>-sys-*` tokens.
4. Confirm system tokens map to `--<prefix>-ref-*` tokens.
5. Build the component only after token mapping is complete.
6. Add stories for evidenced states: default, hover, focus-visible, disabled, and composite assembly where applicable.

## Token Contract

The project uses the configured token prefix from `.storybook/project.config.ts` with three strict layers:

```txt
--<prefix>-ref-* -> --<prefix>-sys-* -> --<prefix>-comp-*
```

- Reference tokens hold raw values only.
- System tokens hold product-wide semantic roles and reference only `--<prefix>-ref-*`.
- Component tokens hold component slots and reference only `--<prefix>-sys-*`.

Run this before review:

```sh
npm run check:tokens
```

## Missing Foundations

- Motion tokens and keyframe naming are not established yet.
- A named app grid class is not established yet.
- Product i18n has not been established yet; Storybook guide copy is isolated under `src/stories/_shared/copy.ts`.
- Desktop and tablet behavior are not evidenced yet.

Do not invent these foundations inside component stories. Add or approve the foundation first, then implement stories.
