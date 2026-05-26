# Agent Integration

Use this reference when generating files for Claude Code, Cursor, or Codex.

## Shared Contract

All agents should follow the same rules:

- Treat screenshots, Figma, rendered UI, and design-system docs as source evidence.
- Read `design-system/SESSION_STATE.md` before continuing.
- Use `tokens/tokens.css` import order: ref, sys, comp.
- Do not hardcode colors, spacing, radius, typography, opacity, shadows, or motion values when tokens exist.
- Do not let component tokens reference reference tokens directly.
- Add or update `design-system/components/*.md` specs before implementing new shared components.
- Apply `design-system/ANTI_AI_STYLE_RULES.md` before recommending or implementing UI.
- Generate `docs/design-system/index.html` after design-system documentation or token changes.
- Run strict token audit after extraction or component token changes.
- Stop at checkpoints and ask the user before moving from design-system extraction to product implementation.

## Claude Code

Create or update `CLAUDE.md` with:

```md
# Design System Instructions

Start with `design-system/SESSION_STATE.md`.
Use `design-system/` and `tokens/` as the source of truth before editing product UI.
Maintain token inheritance: ref -> sys -> comp.
Run the strict token audit after token changes.
Generate `docs/design-system/index.html` after design-system documentation or token changes.
Apply `design-system/ANTI_AI_STYLE_RULES.md` before UI recommendations.
Do not implement product screens until the design-system checkpoint is approved.
```

Include project-specific paths and commands when known.

## Cursor

Create or update `.cursor/rules/design-system.mdc` when a Cursor rules folder exists.

Suggested rule:

```md
---
description: Design-system governance
alwaysApply: true
---

Read `design-system/SESSION_STATE.md` before UI work.
Use `tokens/` and component specs before writing component CSS.
No hardcoded visual values when tokens exist.
Component tokens may reference only system tokens.
Apply `design-system/ANTI_AI_STYLE_RULES.md` before UI generation.
Run strict token audit after token changes.
Generate `docs/design-system/index.html` after design-system documentation or token changes.
Stop and ask before creating new component categories without a component spec.
```

If the project still uses `.cursorrules`, write the same content there in plain text.

## Codex

Create or update `AGENTS.md` with:

```md
# Design System Agent Instructions

Use all reference screenshots, Figma data, rendered UI, and `design-system/` docs as source evidence.
Start with `design-system/SESSION_STATE.md`.
Keep token inheritance strict: ref -> sys -> comp.
Fill or update design-system docs and tokens before product UI code.
Apply `design-system/ANTI_AI_STYLE_RULES.md` before interface work.
Run the strict token audit after token changes.
Generate `docs/design-system/index.html` after design-system documentation or token changes.
Update `design-system/SESSION_STATE.md` and ask for the next step before continuing.
```

## Handoff Checklist

Before claiming the package is ready for another agent:

- `SESSION_STATE.md` names the current stage and next prompt.
- `TOKEN_ARCHITECTURE.md` documents prefixes and inheritance.
- `COMPONENT_INVENTORY.md` shows which components are extracted and which are pending.
- `design-system/components/*.md` contains specs for extracted component tokens.
- `ANTI_AI_STYLE_RULES.md` is project-specific, not generic.
- `docs/design-system/index.html` exists and reflects the latest docs and tokens.
- Token audit passes or known failures are documented.
