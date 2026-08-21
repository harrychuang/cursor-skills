# Storybook Implementation Map

Record every design-system item that design-system-to-storybook maps into this workspace. Update a row at each component checkpoint.

## Current Pass

Date: (set by the first pass)

Scope: starter template — one example component and one example prototype.

| Design-system item | Source file | Product target | Decision | Status |
|---|---|---|---|---|
| Component catalog | `design-system/COMPONENT_INVENTORY.md` | `src/storybook/componentCatalog.ts` | One catalog source for story titles, purpose, dependencies, and provenance | done |
| Example Card | `design-system/components/example-card.md` | `src/components/example-card/*` | Starter display component bound to `--sbt-comp-example-card-*` tokens | done |
| Example Prototype | `src/pages/prototypes/example-prototype/docs/*` | `src/pages/prototypes/example-prototype/*` | Neutral prototype that exercises Story, Docs, UI Flow, Data, and Static Flow | done |

## Product Conventions

- Framework: React with Storybook 10 and Vite.
- Package manager: npm.
- Component layout: `src/components/<component>/` with co-located source, CSS, exports, and story.
- Foundation/governance layout: `src/stories/foundations/` and `src/stories/governance/`.
- Token import strategy: `.storybook/preview.ts` imports `tokens/tokens.css`.
- Token layers: `--sbt-ref-* -> --sbt-sys-* -> --sbt-comp-*` (prefix set by `npm run init-template`).

## Verification Log

| Item | Command | Result |
|---|---|---|
