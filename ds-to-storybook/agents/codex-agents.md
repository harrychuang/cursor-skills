# Codex AGENTS.md Handoff

Use this content in a target repo's `AGENTS.md`, or under a scoped subdirectory when only part of the repo should use the workflow.

~~~md
# Design System to Storybook

Use `skills/ds-to-storybook/SKILL.md` when implementing Storybook foundations, shared UI components, and stories from an extracted design-system package.

## Required Inputs

- `design-system/SESSION_STATE.md`
- `design-system/DESIGN_EVIDENCE_MAP.md`
- `design-system/TOKEN_ARCHITECTURE.md`
- `design-system/COMPONENT_INVENTORY.md`
- relevant `design-system/components/*.md`
- `tokens/tokens-ref.css`
- `tokens/tokens-sys.css`
- `tokens/tokens-comp.css`

If component specs or token contracts are missing, stop and ask to run `design-system-extractor` first.

## Workflow

1. Start from the design-system docs, not screenshots or fresh Figma analysis.
2. Select one bounded pass only.
3. Run `scripts/trace_sources.mjs <design-system-package-root> --write`.
4. Run `scripts/plan_component_batches.mjs <design-system-package-root> --write --queue` before multi-component work.
5. Record the pass in `design-system/STORYBOOK_IMPLEMENTATION_MAP.md` or `docs/design-system/storybook-implementation.md`.
6. Resolve each component through `COMPONENT_INVENTORY.md` -> component spec -> evidence IDs -> `STORYBOOK_SOURCE_TRACE.md`.
7. Inspect existing product components and stories before creating new shared components.
8. Integrate tokens before components.
9. Implement only the selected batch with co-located component/page stories.
10. Add or update stories for documented variants and states, including the best source URL parameter.
11. Run available verification.
12. Update the implementation map and queue, then stop.

## Batch Discipline

- Foundations pass: tokens and foundation docs only.
- Simple component batch: 3-5 components.
- Composite component batch: 1-2 components.
- Multi-component pass: create/update `STORYBOOK_COMPONENT_PLAN.md` and `STORYBOOK_COMPONENT_QUEUE.md` before implementation.
- Do not continue into the next batch unless the user explicitly asks.

## Figma Export Addon

For compatible React Storybook 10 projects, install and configure the bundled addon with the skill scripts:

```sh
node skills/ds-to-storybook/scripts/install_figma_export_addon.mjs <product-repo-root>
node skills/ds-to-storybook/scripts/generate_figma_export_config.mjs <design-system-package-root> --product-root <product-repo-root> --write
```

Configure `.storybook/preview.*` with:

- `createFigmaExportDecorator`
- `createFigmaExportGlobalTypes`
- `createFigmaExportInitialGlobals`
- `@harrychuang/storybook-addon-figma-export/styles.css`
- optional `createFigmaExportReviewDecorator`
- optional `@harrychuang/storybook-addon-figma-export/review.css`

For stories, prefer `parameters.figmaSourceUrl` for Figma sources and `parameters.design.url` for other web sources from `STORYBOOK_SOURCE_TRACE.md`.
~~~
