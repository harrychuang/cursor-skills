# Claude Code Handoff

Use this content in a target repo's `CLAUDE.md`, or copy this skill folder to `.claude/skills/ds-to-storybook/` so Claude Code can invoke it as a skill.

~~~md
# Design System to Storybook

Use `.claude/skills/ds-to-storybook/SKILL.md` when turning an extracted design-system package into Storybook foundations, shared components, and stories.

## Source Of Truth

- Read `design-system/SESSION_STATE.md` first.
- Read `design-system/COMPONENT_INVENTORY.md` before selecting a batch.
- Read only the relevant `design-system/components/*.md` specs for the current pass.
- Read `design-system/DESIGN_EVIDENCE_MAP.md` to resolve evidence IDs and source trace.
- Preserve `ref -> sys -> comp` token inheritance from `tokens/`.

## Working Rules

- Do not re-extract the design system in this workflow.
- Do not implement more than one bounded pass at a time.
- Default pass size: foundations only, 3-5 simple components, or 1-2 complex composites.
- Create or update `design-system/STORYBOOK_IMPLEMENTATION_MAP.md` before code edits.
- For large inventories, create or update `design-system/STORYBOOK_COMPONENT_QUEUE.md`.
- Resolve source trace before implementing a component.
- Prefer extending existing product components before creating new shared components.
- Keep component styles token-backed.
- Add or update Storybook stories for every implemented component.
- Verify the pass, update the queue/map, then stop at the checkpoint.

## Vendored Figma Export Addon

Install the addon from the local skill folder, not GitHub:

```sh
npm install -D "file:.claude/skills/ds-to-storybook/assets/figma-export-addon" @storybook/icons
```

Adjust the path if the skill is stored elsewhere. Configure `sourceReferences` from component `Source Trace` or `DESIGN_EVIDENCE_MAP.md` so the Storybook source review panel can open Figma/reference URLs.
~~~
