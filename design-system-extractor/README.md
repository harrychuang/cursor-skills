# Design System Extractor Skill

`design-system-extractor` turns screenshots, graphic/brand/editorial references, Figma URLs or Variables, an existing web or native iOS/Android project folder, or an AI-generated/vibe-coded prototype into a token-backed design-system package — and reviews parallel extraction branches from a team.

It does not implement product screens. It produces design-system documentation, three-layer token files, a component inventory, component token specs, anti-AI style rules, static HTML documentation and a review queue, then stops at a checkpoint so the next skill (`design-system-to-storybook`) can build from the same files.

## Extract Flow Guide

Open `docs/extract-flow.html` for a self-contained HTML guide (English, Japanese, Traditional Chinese) that explains the extraction flow, the team workflow, and why each step exists. The workflow itself is `SKILL.md`, which stays canonical for modes, passes, and commands; project-specific output is `docs/design-system/index.html` with review items in `docs/design-system/review.html`.

## When To Use

Use this skill when you have one or more of these inputs:

- UI screenshots or image exports; graphic design, brand, editorial, poster, social, or marketing references
- Figma URL, Figma node, Figma exports, or Figma Variables
- Existing project folder with app code, CSS, tokens, or Storybook; prototype folders treated as reference material
- Native iOS or Android project folder (SwiftUI, UIKit, Jetpack Compose, Android Views/XML, previews, screenshot tests, simulator/emulator captures)
- AI-generated or vibe-coded project where rendered UI must outrank source-only code
- Mixed references that need to become a reusable design-system package
- Several contributors' extraction branches or PRs that need review and integration

Example prompts:

```txt
Use $design-system-extractor to extract a design system from the screenshots in design-reference/.
```

```txt
Use $design-system-extractor to analyze this Figma URL and create design-system docs and tokens.
```

```txt
Use $design-system-extractor to extract a reusable visual system from these brand and poster references, including typographic lockups when they have reusable structure.
```

```txt
Use $design-system-extractor to extract a reusable design system from this project folder. Treat prototype code as reference only.
```

```txt
Use $design-system-extractor to extract a reusable design system from this native iOS/Android app project. Inspect screenshots, previews, screenshot tests, simulator/emulator captures when available, native token/resource files, and design-system modules before treating source-only components as evidence.
```

```txt
Use $design-system-extractor to extract a reusable design system from this vibe-coded project. Run the product or Storybook if possible, capture rendered routes across key viewports/states, treat code as reference-only, classify demo-only or unused generated code as low confidence, and record keep/ignore decisions.
```

```txt
Use $design-system-extractor to review and integrate the design-system extraction branches from this team round. Record branch decisions in INTEGRATION_REVIEW.md, regenerate docs, run the strict checks, and stop with blockers.
```

```txt
用 $design-system-extractor 從 design-reference/ 的截圖萃取設計系統：建立 token（ref -> sys -> comp）、元件清單與一個主要元件規格，產生 HTML 文件後停在 checkpoint。
```

```txt
用 $design-system-extractor 從這個 Figma 連結萃取設計系統規範與 design token，報告用繁體中文，遇到相近顏色或相似元件先問我再決定。
```

## What It Produces

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
├── SESSION_STATE.md
├── components/<component-name>.md
└── assets/
    ├── component-review/
    └── rendered-captures/

tokens/
├── tokens-ref.css
├── tokens-sys.css
├── tokens-comp.css
└── tokens.css

docs/
└── design-system/
    ├── index.html
    └── review.html
```

`design-system/INTEGRATION_REVIEW.md` is added only by the Collaboration Review And Integration Pass.

The token model is `reference token -> system token -> component token`: `--md-ref-*` raw values only (color scales `100` lightest to `0` darkest), `--md-sys-*` shared semantic roles referencing ref only, `--md-comp-*` component slots referencing sys only. Near-duplicate tokens, duplicate sources, and similar components are never resolved silently: the extractor records a `merge` / `keep distinct` (or `reuse existing source` / `ignore duplicate`, or `make variant` / `blocked`) decision from the developer in the package tables, and the audits fail on unresolved rows.

Near reference tokens are reviewed per cluster, not per pair: the token audit groups close colors (deltaE2000) and close numbers of one family around one canonical token, then tiers every other member `auto` / `proposal` / `must-ask` from the provenance markers written as CSS comments next to each ref token (`provenance: authored | measured; usage: <n>; sources: <ids>`). `scripts/apply_token_decisions.mjs` writes the `auto` tier mechanically (and rewrites the token CSS with `--rewrite-css`), the `proposal` tier is confirmed in one batch, and `must-ask` clusters (two authored values) are decided one by one. Length values also get a 4px / 8px scale-fit report, warnings only. `review.html` shows one card per cluster with a copy button per tier, and groups similar components into contact sheets.

## Quick Extract vs Deep Extract

- Quick Extract (default): no capture pass, 1-3 highest-priority component specs with a compact section profile, `ANTI_AI_STYLE_RULES.md` filled, `DESIGN_PRINCIPLES.md` / `PAGE_COMPOSITION_RULES.md` / `INTERACTION_STATES.md` left as stubs marked `Status: deferred to Character Pass`.
- Deep Extract: everything — Rendered or Native UI Capture Pass when the developer confirms it, all foundation dimensions, 5-7 principles, full specs for every extracted component, the three character files, review images for every similarity row.
- Both modes batch the developer's decisions: one duplicate-source question at the end of Input Discovery, one near-token cluster table (the `proposal` tier; the `auto` tier is written by `apply_token_decisions.mjs` without asking) at the end of Token Architecture, one similarity table at the end of Component Inventory, then the checkpoint.
- Mid-flow hard stops remain only for `must-ask` near-token clusters (`authored` vs `authored`) and for a late-arriving higher-tier source (Late-Arriving Authoritative Source Pass).
- The checkpoint menu offers the Character Pass (fill the deferred files), a Component Expansion Pass, branch integration, Figma Variables export, cross-agent instructions, and the hand-off to `design-system-to-storybook`.
- Record the mode in `SESSION_STATE.md` (`Mode: quick` or `Mode: deep`).

## Verify

One command runs the three strict audits (sources, tokens, components) and both HTML generators, prints a `STEP | RESULT` table, and exits `1` when anything fails:

```sh
node <skill-root>/scripts/extract_check.mjs <target-root> --locale <zh-Hant|en|ja>
```

Use `--starter` for an empty starter package (audits without `--strict`), `--audits-only` to skip the generators, and `--json` for a machine-readable result. The individual `scripts/audit_*.mjs --strict`, `generate_docs_html.mjs --locale`, and `generate_review_html.mjs --json` remain callable on their own (see `SKILL.md` Resource Map). `scripts/apply_token_decisions.mjs <target-root> --tier <auto|proposal|must-ask>` records near-token cluster decisions; the clustering, tiering, and scale-fit logic the audit, the review page, and that script share lives in `scripts/lib/token_review.mjs`. What each audit checks: `references/audits.md`.

After changing any script, fixture, or template file, run the regression tests:

```sh
node <skill-root>/scripts/test_audits.mjs
node <ds-to-storybook-root>/scripts/test_trace_and_plan_contract.mjs   # when template columns or headings changed
```

## Team Branch Workflow

Several developers can extract Figma components into the same package on separate branches; one integrator merges them. Full procedure, checklists, and the `INTEGRATION_REVIEW.md` paste-in: `references/collaboration-review.md`.

```txt
developer:  main -> ds/new-comp -> extract with this skill -> extract_check -> push -> PR
integrator: main -> ds/integration-round-1 -> merge contributor branches one by one -> collaboration review -> integration PR -> main
```

Developer prompt:

```txt
Use $design-system-extractor to run a component expansion pass for <component-name> from this Figma node: <figma-url-or-node>.
Update DESIGN_EVIDENCE_MAP.md, COMPONENT_INVENTORY.md, design-system/components/<component-name>.md, tokens, docs, and SESSION_STATE.md.
Run node <skill-root>/scripts/extract_check.mjs <target-root> --locale <ui-locale>.
Do not merge other branches. Stop with PR review notes, check results, and open questions.
```

Integrator prompt:

```txt
Use $design-system-extractor to run a collaboration review and integration pass for these branches or PRs: <branch-or-pr-list>.
Target branch is main. Integration branch is ds/integration-round-1.
Review each branch, record decisions in design-system/INTEGRATION_REVIEW.md, merge one branch at a time, resolve source/token/component conflicts through the review gates, run extract_check.mjs, update SESSION_STATE.md, then stop with merge decisions and blockers.
```

Developer PRs are the review inputs; the integration PR is the final design-system change that lands in `main`.

## Install

Copy or clone the `design-system-extractor/` folder into the skills directory of the agent you use, then invoke it by name (`$design-system-extractor` or "use design-system-extractor"):

```txt
~/.codex/skills/design-system-extractor/     # Codex
~/.cursor/skills/design-system-extractor/    # Cursor
~/.claude/skills/design-system-extractor/    # Claude Code
```

A project-local copy at `target-project/skills/design-system-extractor/` also works when the prompt points to its `SKILL.md`. Whichever path you use is the `<skill-root>` in every command above.

To hand an extracted package to Claude Code, Cursor, or Codex through `CLAUDE.md`, `.cursor/rules/design-system.mdc`, or `AGENTS.md`, use `references/agent-integration.md`.

## Boundaries

The skill's hard rules are the Gates table in `SKILL.md` (Evidence, Token, Authoritative Source, Component, Implementation Boundary, Collaboration). In short: no rule without evidence, no silent token merges or accessibility substitutions, no new component because a layer name is new, no product or Storybook code before the checkpoint, no hand-edited generated HTML, and no generic gradients, glassmorphism, outline-card stacks, inflated whitespace, or SaaS landing-page patterns unless the references show them.
