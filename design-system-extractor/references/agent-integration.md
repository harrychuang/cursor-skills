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
- Ask for and document merge/keep-distinct decisions before keeping near duplicate reference colors or numbers.
- Review similar component candidates before adding new component specs; document merge/variant/keep-distinct/blocked decisions in `COMPONENT_INVENTORY.md`.
- Use actual Figma node previews/screenshots or screenshot crops for component similarity review. Use schematic SVG only as a last-resort fallback, labeled `schematic fallback - source preview unavailable`, and never as design evidence.
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
Document duplicate source reuse/ignore/keep-distinct decisions in DESIGN_EVIDENCE_MAP.md.
Document near-token merge/keep-distinct decisions in TOKEN_ARCHITECTURE.md.
Document similar component merge/variant/keep-distinct/blocked decisions in COMPONENT_INVENTORY.md before creating new component specs.
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
Duplicate source candidates require documented reuse/ignore/keep-distinct decisions.
Near token candidates require documented merge/keep-distinct decisions.
Similar component candidates require documented merge/variant/keep-distinct/blocked decisions.
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
Document duplicate source reuse/ignore/keep-distinct decisions before counting repeated sources as separate evidence.
Document near-token merge/keep-distinct decisions before finalizing tokens.
Document similar component merge/variant/keep-distinct/blocked decisions before finalizing component specs.
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
- `TOKEN_ARCHITECTURE.md` records near-token merge/keep-distinct decisions when audit finds candidates.
- `COMPONENT_INVENTORY.md` shows which components are extracted and which are pending.
- `COMPONENT_INVENTORY.md` records similarity review decisions and links visual comparison assets when candidates overlap.
- `design-system/components/*.md` contains specs for extracted component tokens.
- `ANTI_AI_STYLE_RULES.md` is project-specific, not generic.
- `docs/design-system/index.html` exists and reflects the latest docs and tokens.
- `docs/design-system/review.html` exists and reflects duplicate-source, near-token, and similar-component review state.
- Source, token, and component audits pass or known failures are documented.
