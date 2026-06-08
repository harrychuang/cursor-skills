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
3. Record the pass in `design-system/STORYBOOK_IMPLEMENTATION_MAP.md` or `docs/design-system/storybook-implementation.md`.
4. Resolve each component through `COMPONENT_INVENTORY.md` -> component spec -> evidence IDs -> `DESIGN_EVIDENCE_MAP.md` -> source trace.
5. Inspect existing product components and stories before creating new shared components.
6. Integrate tokens before components.
7. Implement only the selected batch.
8. Add or update stories for documented variants and states.
9. Run available verification.
10. Update the implementation map and queue, then stop.

## Batch Discipline

- Foundations pass: tokens and foundation docs only.
- Simple component batch: 3-5 components.
- Composite component batch: 1-2 components.
- Large inventory: create/update `STORYBOOK_COMPONENT_QUEUE.md` before implementation.
- Do not continue into the next batch unless the user explicitly asks.

## Figma Export Addon

For compatible React Storybook 10 projects, install the vendored addon from the local skill path:

```sh
npm install -D "file:skills/ds-to-storybook/assets/figma-export-addon" @storybook/icons
```

Use the equivalent package-manager command if the repo uses `pnpm`, `yarn`, or `bun`.

Configure `.storybook/preview.*` with:

- `createFigmaExportDecorator`
- `createFigmaExportGlobalTypes`
- `createFigmaExportInitialGlobals`
- `@harrychuang/storybook-addon-figma-export/styles.css`
- `sourceReferences` from component `Source Trace` or `DESIGN_EVIDENCE_MAP.md`

The addon renders a bottom-right export panel and a top-right source review panel. Review statuses are stored per story in `localStorage`.
~~~
