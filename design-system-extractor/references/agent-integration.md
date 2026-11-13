# Agent Integration

Use this reference when generating files for Claude Code, Cursor, or Codex.

## Shared Contract

All agents should follow the same rules:

- Treat screenshots, Figma, rendered UI, native captures/previews/screenshot tests, and design-system docs as source evidence.
- For native iOS/Android projects, read `references/native-mobile-projects.md`, record native screen/state coverage and capture blockers, and treat source-only Swift/Kotlin/XML as Low confidence until visually confirmed or user-confirmed.
- Read `design-system/SESSION_STATE.md` before continuing.
- Record source fingerprints in `DESIGN_EVIDENCE_MAP.md` and document reuse/ignore/keep-distinct decisions before counting duplicate sources as separate evidence.
- Use `tokens/tokens.css` import order: ref, sys, comp.
- Keep reference color scales ordered as `100` lightest to `0` darkest.
- Name new tokens in the order recorded in `design-system/TOKEN_ARCHITECTURE.md` > `## Naming Order` (default naming when none is recorded); when the order puts `state` last and a token has state variants, write the default state as `-default`.
- Keep near duplicate reference colors or numbers as separate tokens and record a suggested merge/keep-distinct action in `TOKEN_ARCHITECTURE.md`. Merge only after a designer confirms it on `docs/design-system/review.html` or in the conversation; a suggested action is not a decision.
- Review similar component candidates before adding new component specs; record a suggested merge/variant/keep-distinct/blocked action in `COMPONENT_INVENTORY.md` and write the spec after the designer confirms it.
- When the user pastes the prompt exported by the review page, apply it with the Review Decision Apply Pass in `SKILL.md`.
- Use actual Figma node previews/screenshots or product screenshots for component similarity review, one per side, each with the compared region marked in the image link. Use schematic SVG only as a last-resort fallback, labeled `schematic fallback - source preview unavailable`, and never as design evidence.
- Do not hardcode colors, spacing, radius, typography, opacity, shadows, or motion values when tokens exist.
- Do not let component tokens reference reference tokens directly.
- Add or update `design-system/components/*.md` specs before implementing new shared components.
- Apply `design-system/ANTI_AI_STYLE_RULES.md` before recommending or implementing UI.
- Generate `docs/design-system/index.html` after design-system documentation or token changes.
- Generate `docs/design-system/review.html` after source, token, or component review changes.
- Run strict source, token, and component audits after extraction, source, token, or component changes.
- Stop at checkpoints and ask the user before moving from design-system extraction to product implementation.

## Claude Code

Create or update `CLAUDE.md` with:

```md
# Design System Instructions

Start with `design-system/SESSION_STATE.md`.
Use `design-system/` and `tokens/` as the source of truth before editing product UI.
For native iOS/Android projects, read `skills/design-system-extractor/references/native-mobile-projects.md`, record native screen/state coverage, and verify source-only components through screenshots, previews, screenshot tests, captures, navigation reachability, or user confirmation.
Maintain token inheritance: ref -> sys -> comp.
Keep color steps ordered 100 lightest to 0 darkest.
Name new tokens in the order recorded in `design-system/TOKEN_ARCHITECTURE.md` > `## Naming Order`; with `state` last, a token that has state variants writes its default state as `-default`.
Document duplicate source reuse/ignore/keep-distinct decisions in DESIGN_EVIDENCE_MAP.md.
Record suggested near-token merge/keep-distinct actions in TOKEN_ARCHITECTURE.md; merge only after a designer confirms on docs/design-system/review.html or in the conversation.
Record suggested similar-component merge/variant/keep-distinct/blocked actions in COMPONENT_INVENTORY.md; create new component specs after the designer confirms.
When the user pastes the prompt exported by docs/design-system/review.html, apply it with the Review Decision Apply Pass.
Run the strict source, token, and component audits after extraction, source, token, or component changes.
Generate `docs/design-system/index.html` after design-system documentation or token changes.
Generate `docs/design-system/review.html` after source, token, or component review changes.
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
For native iOS/Android projects, read `skills/design-system-extractor/references/native-mobile-projects.md` and verify source-only Swift/Kotlin/XML through screenshots, previews, screenshot tests, captures, navigation reachability, or user confirmation.
No hardcoded visual values when tokens exist.
Component tokens may reference only system tokens.
Reference color steps run 100 lightest to 0 darkest.
Token names follow the order recorded in `design-system/TOKEN_ARCHITECTURE.md` > `## Naming Order`; with `state` last, the default state is written as `-default`.
Duplicate source candidates require documented reuse/ignore/keep-distinct decisions.
Near token candidates require designer-confirmed merge/keep-distinct decisions; a suggested action is not a decision, and nothing is merged before confirmation.
Similar component candidates require designer-confirmed merge/variant/keep-distinct/blocked decisions.
Apply a prompt exported by docs/design-system/review.html with the Review Decision Apply Pass.
Apply `design-system/ANTI_AI_STYLE_RULES.md` before UI generation.
Run strict source, token, and component audits after extraction, source, token, or component changes.
Generate `docs/design-system/index.html` after design-system documentation or token changes.
Generate `docs/design-system/review.html` after source, token, or component review changes.
Stop and ask before creating new component categories without a component spec.
```

If the project still uses `.cursorrules`, write the same content there in plain text.

## Codex

Create or update `AGENTS.md` with:

```md
# Design System Agent Instructions

Use all reference screenshots, Figma data, rendered UI, native captures/previews/screenshot tests, and `design-system/` docs as source evidence.
For native iOS/Android projects, read `skills/design-system-extractor/references/native-mobile-projects.md`, record native screen/state coverage, and verify source-only Swift/Kotlin/XML through screenshots, previews, screenshot tests, captures, navigation reachability, or user confirmation.
Start with `design-system/SESSION_STATE.md`.
Keep token inheritance strict: ref -> sys -> comp.
Use 100 lightest to 0 darkest for reference color scales.
Name new tokens in the order recorded in `design-system/TOKEN_ARCHITECTURE.md` > `## Naming Order`; with `state` last, write the default state as `-default`.
Document duplicate source reuse/ignore/keep-distinct decisions before counting repeated sources as separate evidence.
Record suggested near-token merge/keep-distinct actions and merge only after a designer confirms them on docs/design-system/review.html or in the conversation.
Record suggested similar-component merge/variant/keep-distinct/blocked actions and finalize component specs after the designer confirms them.
Apply a prompt exported by docs/design-system/review.html with the Review Decision Apply Pass.
Fill or update design-system docs and tokens before product UI code.
Apply `design-system/ANTI_AI_STYLE_RULES.md` before interface work.
Run the strict source, token, and component audits after extraction, source, token, or component changes.
Generate `docs/design-system/index.html` after design-system documentation or token changes.
Generate `docs/design-system/review.html` after source, token, or component review changes.
Update `design-system/SESSION_STATE.md` and ask for the next step before continuing.
```

## Handoff Checklist

Before claiming the package is ready for another agent:

- `SESSION_STATE.md` names the current stage and next prompt.
- `DESIGN_EVIDENCE_MAP.md` records source fingerprints and duplicate source review decisions when repeated sources appear.
- `TOKEN_ARCHITECTURE.md` documents prefixes and inheritance.
- `TOKEN_ARCHITECTURE.md` records a suggested action for every near-token group the audit finds, and the designer-confirmed decision where one exists.
- `COMPONENT_INVENTORY.md` shows which components are extracted and which are pending.
- `COMPONENT_INVENTORY.md` records similarity review decisions and links visual comparison assets when candidates overlap.
- `design-system/components/*.md` contains specs for extracted component tokens.
- `ANTI_AI_STYLE_RULES.md` is project-specific, not generic.
- `docs/design-system/index.html` exists and reflects the latest docs and tokens.
- `docs/design-system/review.html` exists and reflects duplicate-source, near-token, and similar-component review state.
- The number of review items still waiting for the designer is stated.
- Source, token, and component audits pass, or the failures are documented — including rows that only wait for the designer's confirmation.
