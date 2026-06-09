# Claude Code Handoff

Use this content in a target repo's `CLAUDE.md`, or copy this skill folder to `.claude/skills/design-system-to-storybook/` so Claude Code can invoke it as a skill.

~~~md
# Design System to Storybook

Use `.claude/skills/design-system-to-storybook/SKILL.md` when turning an extracted design-system package into Storybook foundations, shared components, and stories.

## Source Of Truth

- Read `design-system/SESSION_STATE.md` first.
- Read `design-system/COMPONENT_INVENTORY.md` before selecting a batch.
- Read only the relevant `design-system/components/*.md` specs for the current pass.
- Read `design-system/DESIGN_EVIDENCE_MAP.md` to resolve evidence IDs and source trace.
- Run `scripts/trace_sources.mjs` and `scripts/plan_component_batches.mjs` before multi-component implementation.
- Preserve `ref -> sys -> comp` token inheritance from `tokens/`.

## Working Rules

- Do not re-extract the design system in this workflow.
- Do not implement more than one bounded pass at a time.
- Default pass size: foundations only, 3-5 simple components, or 1-2 complex composites.
- Create or update `design-system/STORYBOOK_IMPLEMENTATION_MAP.md` before code edits.
- For multi-component passes, create or update `design-system/STORYBOOK_COMPONENT_PLAN.md` and `design-system/STORYBOOK_COMPONENT_QUEUE.md`.
- Resolve source trace before implementing a component.
- Keep component and page stories co-located with their implementation folders unless the product convention requires otherwise.
- Prefer extending existing product components before creating new shared components.
- Keep component styles token-backed.
- Add or update Storybook stories for every implemented component.
- Verify the pass, update the queue/map, then stop at the checkpoint.

## Vendored Figma Export Addon

Install the addon with the bundled installer, not GitHub:

```sh
node <skill-root>/scripts/inspect_storybook_project.mjs <product-repo-root> --json
node <skill-root>/scripts/install_figma_export_addon.mjs <product-repo-root>
node <skill-root>/scripts/generate_figma_export_config.mjs <design-system-package-root> --product-root <product-repo-root> --write
node <skill-root>/scripts/generate_component_spec_modules.mjs <design-system-package-root> --product-root <product-repo-root> --write
node <skill-root>/scripts/sync_story_source_parameters.mjs <design-system-package-root> --product-root <product-repo-root> --write
node <skill-root>/scripts/validate_figma_export_setup.mjs <product-repo-root>
```

Adjust the path if the skill is stored elsewhere. Configure `createFigmaExportReviewDecorator`, `review.css`, and `getFigmaSourceUrl` by default so review/Open source works. Write the best resolved source URL to story parameters, preferring `parameters.figmaSourceUrl` for Figma and `parameters.design.url` for other web sources. Verify the toolbar, review/Open source overlay, and Copy design SVG action before marking addon setup complete.
~~~
