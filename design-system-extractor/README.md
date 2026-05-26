# Design System Extractor Skill

`design-system-extractor` is a reusable skill for extracting a token-backed design-system package from screenshots, Figma references, or an existing project/prototype folder.

It does not implement product screens by default. It produces design-system documentation, token files, component inventory, component token specs, anti-AI style rules, static HTML documentation, and a checkpoint for the next step.

## Extract Flow Guide

Open `docs/extract-flow.html` for a self-contained HTML guide that explains the extraction flow and why each step exists in English, Japanese, and Traditional Chinese.

This guide describes the skill's reusable workflow. The generated project-specific documentation remains `docs/design-system/index.html` after running `scripts/generate_docs_html.mjs`.

## When To Use

Use this skill when you have one or more of these inputs:

- UI screenshots or image exports
- Figma URL, Figma node, Figma exports, or Figma Variables
- Existing project folder with app code, CSS, tokens, or Storybook
- Prototype folder that should be treated as visual/reference material
- Mixed references that need to become a reusable design-system package

Example prompts:

```txt
Use $design-system-extractor to extract a design system from the screenshots in design-reference/.
```

```txt
Use $design-system-extractor to analyze this Figma URL and create design-system docs and tokens.
```

```txt
Use $design-system-extractor to extract a reusable design system from this project folder. Treat prototype code as reference only.
```

## What It Produces

The skill creates or updates a package like this:

```txt
design-system/
├── DESIGN_SYSTEM_KICKSTART.md
├── DESIGN_EVIDENCE_MAP.md
├── DESIGN_PRINCIPLES.md
├── DESIGN_ELEMENTS.md
├── TOKEN_ARCHITECTURE.md
├── COMPONENT_INVENTORY.md
├── COMPONENT_SPEC_TEMPLATE.md
├── INTERACTION_STATES.md
├── PAGE_COMPOSITION_RULES.md
├── ANTI_AI_STYLE_RULES.md
└── SESSION_STATE.md

tokens/
├── tokens-ref.css
├── tokens-sys.css
├── tokens-comp.css
└── tokens.css

docs/
└── design-system/
    └── index.html
```

The default token model is:

```txt
reference token -> system token -> component token
```

For CSS custom properties, the default prefixes are:

- `--md-ref-*`: raw values only
- `--md-sys-*`: shared semantic roles only
- `--md-comp-*`: component slots only

## Standard Workflow

1. Discover inputs: screenshots, Figma data, rendered UI, project code, tokens, Storybook.
2. Build `DESIGN_EVIDENCE_MAP.md` so design decisions trace back to source evidence.
3. Extract 5-7 design principles with evidence and implementation rules.
4. Define design elements: color, type, spacing, density, shape, elevation, iconography, imagery.
5. Define token architecture and fill `tokens/`.
6. Build `COMPONENT_INVENTORY.md` from repeated UI patterns.
7. Extract initial component token specs under `design-system/components/`, usually a primary action and core navigation/shell component.
8. Document page composition, interaction states, and anti-AI style rules.
9. Generate developer-facing HTML documentation.
10. Run strict token audit.
11. Update `SESSION_STATE.md`, stop, and ask the user for the next step.

## Component Expansion Pass

After the initial checkpoint, use the same skill to expand component tokens from `COMPONENT_INVENTORY.md`.

Recommended prompt:

```txt
Use $design-system-extractor to run a component expansion pass for <component-name>. Start from COMPONENT_INVENTORY.md, write the component token spec under design-system/components/, add missing sys/comp tokens with strict ref -> sys -> comp inheritance, regenerate docs/design-system/index.html, run strict token audit, update SESSION_STATE.md, then stop.
```

Expansion workflow:

1. Pick one or more `planned` components from `COMPONENT_INVENTORY.md`.
2. Confirm source evidence in `DESIGN_EVIDENCE_MAP.md`.
3. Create or update the component spec in `design-system/components/<component-name>.md` from `COMPONENT_SPEC_TEMPLATE.md`.
4. Add only reusable product-wide system tokens.
5. Add component slots to `tokens/tokens-comp.css`.
6. Update inventory, interaction states, and page composition rules.
7. Regenerate HTML docs.
8. Run strict token audit.
9. Update session state and stop.

## HTML Documentation

Generate a static documentation page from `design-system/` Markdown files, `design-system/components/*.md`, and `tokens/` CSS files:

```sh
node skills/design-system-extractor/scripts/generate_docs_html.mjs .
```

Default output:

```txt
docs/design-system/index.html
```

You can pass a custom output path:

```sh
node skills/design-system-extractor/scripts/generate_docs_html.mjs . public/design-system.html
```

The generated HTML includes:

- rendered design-system Markdown
- rendered component specs
- sidebar navigation
- missing-document notices
- reference, system, and component token tables
- resolved token values
- color swatches for resolved colors

Use this HTML file as the developer-friendly reading layer. The Markdown files and CSS token files remain the source of truth.

## Token Audit

Run the strict audit from the project root after real extraction work:

```sh
node skills/design-system-extractor/scripts/audit_tokens.mjs . --strict
```

Use non-strict mode only for an empty starter package or early setup check. Run strict mode against another target package like this:

```sh
node path/to/design-system-extractor/scripts/audit_tokens.mjs /path/to/design-system-package --strict
```

The audit checks for:

- component tokens referencing reference tokens directly
- system token names that include component vocabulary
- reference token names that include semantic roles
- raw values in system/component layers
- missing token files or empty token layers in strict mode
- `tokens.css` import order in strict mode
- background-like system colors missing `on-*` foreground pairs

## Cross-Agent Use

The skill includes detailed cross-agent guidance in:

```txt
references/agent-integration.md
```

Use that file to generate or update agent-specific instruction files:

- `CLAUDE.md` for Claude Code
- `.cursor/rules/design-system.mdc` or `.cursorrules` for Cursor
- `AGENTS.md` for Codex

All three agents should follow the same core contract: read `SESSION_STATE.md`, preserve token inheritance, avoid hardcoded visual values, apply anti-AI style rules, and stop at checkpoints before product implementation.

### Claude Code

Claude Code does not need a Codex skill installation step. Treat this folder as a reusable workflow reference and expose it through `CLAUDE.md`.

Recommended setup in the target project:

```txt
target-project/
├── CLAUDE.md
├── design-system/
├── tokens/
└── skills/
    └── design-system-extractor/
```

Add this to `CLAUDE.md`:

```md
# Design System Extraction

Use `skills/design-system-extractor/SKILL.md` when extracting a design system from screenshots, Figma references, or project code.
Start with `design-system/SESSION_STATE.md` when it exists.
Use `design-system/` and `tokens/` as source of truth before product UI code.
Maintain token inheritance: ref -> sys -> comp.
Run `node skills/design-system-extractor/scripts/audit_tokens.mjs . --strict` after token changes.
Run `node skills/design-system-extractor/scripts/generate_docs_html.mjs .` after design-system documentation or token changes.
Apply `design-system/ANTI_AI_STYLE_RULES.md` before UI recommendations.
Stop at the checkpoint and ask before product implementation.
```

Recommended Claude Code prompt:

```txt
Use skills/design-system-extractor/SKILL.md to extract a reusable design-system package from the screenshots in design-reference/. Fill design-system/ and tokens/, generate docs/design-system/index.html, run strict token audit, update SESSION_STATE.md, then stop and ask for the next step.
```

For a Figma input:

```txt
Use skills/design-system-extractor/SKILL.md to extract design-system docs and tokens from this Figma URL: <figma-url>. Treat Figma data as evidence, create an evidence map, generate docs/design-system/index.html, run strict token audit, and stop at the checkpoint.
```

### Cursor

Cursor should receive the extraction rules through project rules. Prefer `.cursor/rules/design-system.mdc` for modern Cursor projects; use `.cursorrules` only for older projects.

Recommended setup:

```txt
target-project/
├── .cursor/
│   └── rules/
│       └── design-system.mdc
├── design-system/
├── tokens/
└── skills/
    └── design-system-extractor/
```

Suggested `.cursor/rules/design-system.mdc`:

```md
---
description: Design-system extraction and governance
alwaysApply: true
---

Use `skills/design-system-extractor/SKILL.md` for design-system extraction from screenshots, Figma references, rendered UI, or project code.
Read `design-system/SESSION_STATE.md` before continuing existing work.
Fill or update `design-system/` and `tokens/` before product UI code.
Maintain token inheritance: ref -> sys -> comp.
Component tokens may reference only system tokens.
Do not hardcode color, spacing, radius, typography, opacity, shadow, or motion values when tokens exist.
Apply `design-system/ANTI_AI_STYLE_RULES.md` before UI generation.
Run `node skills/design-system-extractor/scripts/audit_tokens.mjs . --strict` after token changes.
Run `node skills/design-system-extractor/scripts/generate_docs_html.mjs .` after design-system documentation or token changes.
Stop and ask before moving from extraction into product implementation.
```

Recommended Cursor prompt:

```txt
Follow .cursor/rules/design-system.mdc and use skills/design-system-extractor/SKILL.md. Extract a reusable design-system package from design-reference/, update design-system/ and tokens/, generate docs/design-system/index.html, run strict token audit, then update SESSION_STATE.md.
```

When starting from an existing project:

```txt
Use skills/design-system-extractor/SKILL.md to inspect this project as reference material. Extract the design system into design-system/ and tokens/, then generate docs/design-system/index.html. Do not refactor product UI yet.
```

### Codex

Codex can use this as a native skill when the folder is installed in a discoverable skills directory, or as a project-local skill when the prompt points to `skills/design-system-extractor/SKILL.md`.

For project-local use, keep:

```txt
target-project/
├── AGENTS.md
├── design-system/
├── tokens/
└── skills/
    └── design-system-extractor/
```

Add this to `AGENTS.md`:

```md
# Design System Agent Instructions

Use `skills/design-system-extractor/SKILL.md` when extracting a design system from screenshots, Figma references, rendered UI, or project code.
Use all reference screenshots, Figma data, rendered UI, and `design-system/` docs as source evidence.
Start with `design-system/SESSION_STATE.md`.
Keep token inheritance strict: ref -> sys -> comp.
Fill or update design-system docs and tokens before product UI code.
Apply `design-system/ANTI_AI_STYLE_RULES.md` before interface work.
Run `node skills/design-system-extractor/scripts/audit_tokens.mjs . --strict` after token changes.
Run `node skills/design-system-extractor/scripts/generate_docs_html.mjs .` after design-system documentation or token changes.
Update `design-system/SESSION_STATE.md` and ask for the next step before continuing.
```

Recommended Codex prompt:

```txt
Use $design-system-extractor to extract a reusable design-system package from design-reference/. Fill design-system/ and tokens/, generate docs/design-system/index.html, run strict token audit, update SESSION_STATE.md, then stop before product implementation.
```

If the skill is only project-local and not installed globally:

```txt
Use skills/design-system-extractor/SKILL.md to extract a reusable design-system package from this project. Treat screenshots, Figma data, and prototype code as evidence. Fill design-system/ and tokens/, generate docs/design-system/index.html, run the audit, and stop at the checkpoint.
```

To install for global Codex discovery, copy the `design-system-extractor/` folder into your Codex skills directory, commonly:

```txt
~/.codex/skills/design-system-extractor/
```

After installation, invoke it by name:

```txt
Use $design-system-extractor to analyze this Figma URL and create design-system docs and tokens: <figma-url>
```

## Important Boundaries

- Do not use this skill to directly build product screens unless the user explicitly chooses that after the checkpoint.
- Do not copy prototype code into production by default.
- Do not invent design rules without evidence; mark uncertain decisions as Low confidence.
- Do not bypass token layers to make UI match faster.
- Do not add generic gradients, glassmorphism, outline-card stacks, inflated whitespace, or SaaS landing-page patterns unless the references clearly show them.

## Template

For a new extraction package, copy:

```txt
assets/design-system-template/
```

Then fill the generated `design-system/` and `tokens/` files using the workflow above.
