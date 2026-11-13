# Design System Extractor Skill

`design-system-extractor` is a reusable skill for extracting and collaboratively reviewing a token-backed design-system package from screenshots, graphic/brand/editorial references, Figma references, branch diffs, an existing web or native iOS/Android project folder, or an AI-generated/vibe-coded prototype project.

It does not implement product screens by default. It produces design-system documentation, token files, component inventory, component token specs, anti-AI style rules, static HTML documentation, a review page where a designer confirms the AI's suggested decisions, and a checkpoint for the next step.

## Extract Flow Guide

Open `docs/extract-flow.html` for a self-contained HTML guide that explains the extraction flow and why each step exists in English, Japanese, and Traditional Chinese.

This guide describes the skill's reusable workflow. The generated project-specific documentation remains `docs/design-system/index.html`, with review items in `docs/design-system/review.html`.

## When To Use

Use this skill when you have one or more of these inputs:

- UI screenshots or image exports
- Graphic design, brand, editorial, poster, social, or marketing image references
- Figma URL, Figma node, Figma exports, or Figma Variables
- Existing project folder with app code, CSS, tokens, or Storybook
- Native iOS or Android project folder with SwiftUI, UIKit, Jetpack Compose, Android Views/XML, previews, screenshot tests, simulator/emulator captures, app resources, or component modules
- AI-generated or vibe-coded project where rendered UI should be treated as stronger evidence than source-only code
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
Use $design-system-extractor to review and integrate the design-system extraction branches from this team round. Record branch decisions in INTEGRATION_REVIEW.md, regenerate docs, run strict audits, and stop with blockers.
```

## What It Produces

The skill creates or updates a package like this:

```txt
design-system/
├── DESIGN_SYSTEM_KICKSTART.md
├── INTEGRATION_REVIEW.md
├── DESIGN_EVIDENCE_MAP.md
├── DESIGN_PRINCIPLES.md
├── DESIGN_ELEMENTS.md
├── TOKEN_ARCHITECTURE.md
├── COMPONENT_INVENTORY.md
├── COMPONENT_SPEC_TEMPLATE.md
├── INTERACTION_STATES.md
├── PAGE_COMPOSITION_RULES.md
├── ANTI_AI_STYLE_RULES.md
├── assets/
│   ├── component-review/
│   └── rendered-captures/
└── SESSION_STATE.md

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

The default token model is:

```txt
reference token -> system token -> component token
```

For CSS custom properties, the default prefixes are:

- `--md-ref-*`: raw values only
- `--md-sys-*`: shared semantic roles only
- `--md-comp-*`: component slots only

Reference color scales use `100 -> 0` from light to dark. Near duplicate reference colors or numbers are kept as separate tokens, each group with a suggested `merge` or `keep distinct` action. Nothing is merged until a designer confirms the suggestion on the review page or in the conversation.

Input sources also go through duplicate review. Screenshots, image exports, Figma URLs/nodes, rendered routes, and prototype references should be recorded with a source fingerprint in `DESIGN_EVIDENCE_MAP.md`. Exact or likely duplicate sources get a suggested `reuse existing source`, `ignore duplicate`, or `keep distinct` action, and are not counted as separate evidence until a designer confirms it.

Component candidates also go through a similarity review. When a new Figma or screenshot component resembles an existing component, the extractor records a fingerprint and a suggested action — merge it, make it a variant, keep it distinct, or block it pending more evidence — and the designer confirms it. Component candidates include interactive UI elements, layout/display patterns, graphic motifs, and reusable typographic compositions. Visual comparison assets should come from actual Figma node previews/screenshots or product screenshots, stored under `design-system/assets/component-review/` and linked from `COMPONENT_INVENTORY.md` — one image per side, with the compared part marked as a region in the image link (`route-stock.png#xywh=percent:9.2,20.5,30.4,4.4`). Prefer the full screenshot plus a region over a pre-cropped image: a region drawn on the full screenshot is visibly right or wrong, a crop taken at the wrong place is not. Schematic SVGs are only a labeled last-resort fallback when source previews cannot be captured.

Typographic components, also called text lockups, sit between typography foundations and full layout components. Extract them when a repeated text grouping has stable slots and reusable hierarchy, such as kicker + headline, headline + subhead, number + unit + caption, quote + attribution, or label + value. Do not promote one-off lettering or decorative art text into a component unless the references show it is reused or brand-critical enough to constrain future work.

## Vibe-Coded Project Intake

For AI-generated or vibe-coded project folders, precision depends on source hygiene. The extractor should first locate or create a route/state manifest with each important route or Storybook story, viewport, state, render command, screenshot path, relevant source files, and keep/ignore notes.

When the project is runnable, the extractor should run a rendered UI capture pass before extracting tokens or components:

1. Detect install, dev server, preview, Storybook, and seed/test-data commands.
2. Start the app or Storybook when dependencies and permissions allow.
3. Open local routes or stories with browser automation.
4. Capture mobile, tablet, and desktop screenshots, plus reachable UI states.
5. Inspect DOM/computed styles to connect visible UI with used tokens, CSS variables, components, and route imports.
6. Store screenshots under `design-system/assets/rendered-captures/`.
7. Record every capture attempt, screenshot path, blocker, and confidence impact in `DESIGN_EVIDENCE_MAP.md`.

Use this evidence order by default:

1. User-marked keep/ignore notes tied to visible routes or screenshots.
2. Captured screenshots and rendered routes with viewport/state metadata.
3. Storybook stories or component examples that represent product UI.
4. Used CSS variables, tokens, components, and route imports.
5. Source-only code, unused CSS, demo pages, starter components, or generated comments.

Do not raise confidence from source-only artifacts. Classify project evidence as `rendered`, `screenshot`, `storybook`, `token-used`, `component-used`, `demo-only`, `unused`, `dead-code`, `capture-blocked`, `auth-blocked`, `contradictory`, or `out-of-scope`, then record route coverage and keep/ignore decisions in `SESSION_STATE.md` and `DESIGN_EVIDENCE_MAP.md`.

If the product cannot be started or a route is blocked by auth/data/setup, record the blocker and keep affected source-only design rules Low confidence unless the user supplies screenshots or confirms the pattern.

## Native Mobile Project Intake

For native iOS or Android project folders, the extractor should read `references/native-mobile-projects.md` before extraction. It should identify the platform/framework, app targets or modules, available capture surfaces, native token/resource files, and likely design-system modules before writing design decisions.

Native evidence should be ranked by default as:

1. Production Figma component library, design tokens, or named design-system package.
2. Supplied production screenshots or QA captures.
3. Simulator, emulator, or device captures with platform/device/state metadata.
4. Screenshot-test artifacts, SwiftUI Previews, Compose Previews, preview galleries, or demo screens intended to represent product UI.
5. Native theme, resource, or token files used by captured screens.
6. UI components reachable from navigation, previews, screenshot tests, or app entrypoints.
7. Source-only views, generated samples, unused previews, starter code, or comments.

For iOS, inspect SwiftUI views, UIKit views/controllers/cells, asset catalogs, named colors, typography wrappers, `ViewModifier`s, Swift packages, and candidate modules such as `DesignSystem`, `UIComponents`, `Theme`, or `Tokens`.

For Android, inspect Compose `@Composable` and `@Preview` functions, Android Views/XML layouts, navigation graphs, `res/values`, vector drawables, theme files, Gradle modules, and candidate modules such as `:designsystem`, `:core-ui`, `:theme`, or `:components`.

When possible, run a Native UI Capture Pass using existing screenshots, screenshot tests, previews, demo/gallery screens, simulator, emulator, or device output. Record platform, device, OS/API level, orientation, state, command, screenshot path, source files, blockers, and confidence impact in `DESIGN_EVIDENCE_MAP.md`. Do not modify signing, provisioning, package names, bundle IDs, secrets, or destructive data just to capture UI.

Native component names, composable names, view names, asset names, and XML style names are clues, not proof. Verify reusable components through screenshots, previews, screenshot tests, simulator/emulator captures, navigation reachability, imports/usages, or explicit user confirmation.

## Standard Workflow

1. Discover inputs: screenshots, Figma data, rendered UI, native captures/previews, project code, tokens/resources, Storybook, rendered capture attempts, native capture attempts, and review duplicate sources.
2. Build `DESIGN_EVIDENCE_MAP.md` so design decisions trace back to source evidence.
3. Extract 5-7 design principles with evidence and implementation rules.
4. Define design elements: color, type, typographic composition, spacing, density, shape, elevation, iconography, imagery.
5. Define token architecture, record a suggested action for each group of near tokens, and fill `tokens/` with the near values kept apart.
6. Build `COMPONENT_INVENTORY.md` from repeated UI, layout, graphic, and typographic patterns and record a suggested action for each similar component candidate.
7. Extract initial component token specs under `design-system/components/`, usually a primary action/core navigation component for UI-heavy references or a high-value typographic lockup for graphic/editorial-heavy references.
8. Document page composition, interaction states, and anti-AI style rules.
9. Generate the HTML documentation and the review page.
10. Run strict source, token, and component audits.
11. Update `SESSION_STATE.md`, stop, say how many review items wait for the designer, and ask the user for the next step.

After the checkpoint the designer opens `docs/design-system/review.html`, confirms or adjusts the suggestions, and pastes the exported prompt back. The skill then applies the decisions (see Review Page below).

For teams working on separate branches, use the collaboration review pass before merging extracted sources, tokens, and component specs into the shared design-system package.

## Team Branch Workflow

Use this simple flow when several developers extract Figma components into the same design-system package.

### Developer Flow

Start from latest `main`, create one branch for one component or one small Figma scope, then make the branch review-ready.

```txt
main -> ds/new-comp -> extract with this skill -> self-review and audits -> push -> PR
```

Developer prompt:

```txt
Use $design-system-extractor to run a component expansion pass for <component-name> from this Figma node: <figma-url-or-node>.
Update DESIGN_EVIDENCE_MAP.md, COMPONENT_INVENTORY.md, design-system/components/<component-name>.md, tokens, docs, and SESSION_STATE.md.
Run strict source, token, and component audits.
Do not merge other branches. Stop with PR review notes, audit results, and open questions.
```

Developer PR checklist:

- The PR targets `main`, but it is treated as review input for the integration round.
- The branch includes evidence, component inventory updates, component spec, required tokens, regenerated docs, and `SESSION_STATE.md`.
- Duplicate source, near-token, and similar-component rows carry a suggested action; rows a designer has confirmed carry the decision, and the PR says how many still wait.
- Strict source, token, and component audits pass, or blockers are written clearly.

### Integrator Flow

The integrator starts from latest `main`, creates one integration branch, reviews contributor PRs or branches, and merges the integration branch back through a final PR.

```txt
main -> ds/integration-round-1 -> merge contributor branches one by one -> run collaboration review -> integration PR -> main
```

Integrator prompt:

```txt
Use $design-system-extractor to run a collaboration review and integration pass for these branches or PRs: <branch-or-pr-list>.
Target branch is main. Integration branch is ds/integration-round-1.
Review each branch, record decisions in INTEGRATION_REVIEW.md, merge one branch at a time, resolve source/token/component conflicts through the review gates, regenerate docs, run strict audits, update SESSION_STATE.md, then stop with merge decisions and blockers.
```

Rule of thumb: developer PRs are the review inputs; the integration PR is the final design-system change that lands in `main`.

## Component Expansion Pass

After the initial checkpoint, use the same skill to expand component tokens from `COMPONENT_INVENTORY.md`.

Recommended prompt:

```txt
Use $design-system-extractor to run a component expansion pass for <component-name>. Start from COMPONENT_INVENTORY.md, review similar components, write the component token spec under design-system/components/, add missing sys/comp tokens with strict ref -> sys -> comp inheritance, regenerate docs/design-system/index.html and docs/design-system/review.html, run strict source, token, and component audits, update SESSION_STATE.md, then stop.
```

Expansion workflow:

1. Pick one or more `planned` components from `COMPONENT_INVENTORY.md`.
2. Confirm source evidence in `DESIGN_EVIDENCE_MAP.md`.
3. Compare the candidate fingerprint against existing component specs.
4. Record a suggested merge/variant/keep-distinct/blocked action in `COMPONENT_INVENTORY.md`, and write the spec once the designer has confirmed it.
5. Create or update the component spec in `design-system/components/<component-name>.md` from `COMPONENT_SPEC_TEMPLATE.md`.
6. Add only reusable product-wide system tokens.
7. Add component slots to `tokens/tokens-comp.css`.
8. Update inventory, interaction states, and page composition rules.
9. Regenerate the HTML docs and the review page.
10. Run strict source, token, and component audits.
11. Update session state and stop.

## Collaboration Review And Integration Pass

Use this pass when multiple contributors extracted separate Figma sources, components, or token candidates on separate branches or PRs.

Recommended prompt:

```txt
Use $design-system-extractor to run a collaboration review and integration pass for these branches or PRs: <branch-or-pr-list>. Read SESSION_STATE.md, INTEGRATION_REVIEW.md, DESIGN_EVIDENCE_MAP.md, TOKEN_ARCHITECTURE.md, COMPONENT_INVENTORY.md, relevant component specs, and tokens. Review each branch scope, record decisions in INTEGRATION_REVIEW.md, resolve source/token/component conflicts using the review gates, regenerate docs/design-system/index.html and docs/design-system/review.html, run strict audits, update SESSION_STATE.md, then stop with merge decisions and blockers.
```

Integration workflow:

1. Confirm the target branch, integration branch, and branch or PR list.
2. Inspect each branch or PR diff before merging and record owner, scope, files touched, and review status in `design-system/INTEGRATION_REVIEW.md`.
3. Merge or rebase one branch at a time into the integration branch.
4. Resolve source conflicts through `DESIGN_EVIDENCE_MAP.md` duplicate decisions.
5. Resolve token conflicts through `TOKEN_ARCHITECTURE.md` near-token decisions and strict `ref -> sys -> comp` inheritance.
6. Resolve component conflicts through `COMPONENT_INVENTORY.md` similarity decisions and component fingerprints.
7. Treat `docs/design-system/index.html` and `docs/design-system/review.html` as generated output; regenerate them after source conflicts are resolved.
8. Run strict source, token, and component audits.
9. Update `SESSION_STATE.md` and `INTEGRATION_REVIEW.md`.
10. Stop with `merged`, `request changes`, `blocked`, `superseded`, or `defer` decisions for each branch or PR.

## HTML Documentation

Generate a static documentation page from `design-system/` Markdown files, `design-system/components/*.md`, and `tokens/` CSS files:

```sh
node skills/design-system-extractor/scripts/generate_docs_html.mjs .
node skills/design-system-extractor/scripts/generate_review_html.mjs .
```

Default output:

```txt
docs/design-system/index.html
docs/design-system/review.html
```

You can pass a custom output path:

```sh
node skills/design-system-extractor/scripts/generate_docs_html.mjs . public/design-system.html
```

The generated HTML includes:

- rendered design-system Markdown
- rendered component specs
- rendered integration review records
- sidebar navigation
- missing-document notices
- reference, system, and component token tables
- resolved token values
- color swatches for resolved colors
- component similarity review images linked from `design-system/assets/`

Both scripts open in the package's recorded report language (Chinese → `zh-Hant`, Japanese → `ja`, anything else → `en`, no record → `en`) and offer a 繁中 / EN / 日本語 switch. Pass `--locale zh-Hant|en|ja` to choose the default explicitly.

Use `index.html` as the reading layer. The Markdown files and CSS token files remain the source of truth.

## Review Page

`docs/design-system/review.html` is where a designer decides the things the extraction could not decide alone. It is one static file: open it from disk, no server needed.

What is on it:

- **Near tokens.** Values that are very close are grouped — nine near pairs can be three decisions — and each value shows its swatch or specimen, the system roles and components that use it, and whether nothing uses it. A group of more than 12 values is listed compactly and can be expanded.
- **Similar components.** One screenshot per side, with the compared part outlined and lettered A and B. Click a screenshot to enlarge it in place (fit, 100%, 200%).
- **Duplicate sources**, and **color scale issues** the AI can be asked to fix.
- On every card: the AI's suggested action and its reason.

How a designer uses it:

1. Read the suggestion on each card.
2. Agree, or change it: a checked value is kept, an unchecked value merges into the nearest kept one (the target can be changed); components and sources are a single choice. "Agree with all AI suggestions" confirms everything left untouched.
3. Copy the prompt and paste it to the AI.

The prompt lists each decision with complete token names and values, marks which ones differ from the AI's suggestion, and ends with how to apply them. Pasting it runs the skill's **Review Decision Apply Pass**: merges and restores are applied, each decision is recorded with who confirmed it, the strict audits are re-run and both pages are regenerated. Answering in the conversation instead of using the page works the same way.

What "waiting" means:

- A suggestion is not a decision. Until a designer confirms it, the near values stay separate tokens and the row's `Decision` and `Confirmed by` stay empty.
- `audit_tokens.mjs --strict` fails while a near pair only has a suggestion, and prints `Awaiting designer confirmation: N`. That is the expected state between extraction and review.
- `node skills/design-system-extractor/scripts/generate_review_html.mjs . --json` prints the review items and counts without writing a file. `counts.needsReview` is the number of items waiting for the designer — the number the page shows, and the number pipeline-board displays.

Selections are kept in the browser, per package. The page never writes to the project.

### Upgrading an existing package

- Nothing has to change. A row needs a named confirmer only in a `Near Token Decisions` table that has both the `Suggested action` and the `Confirmed by` column. A table from an earlier layout — only `Confirmed by` (the previous template), only `Suggested action`, or neither — keeps resolving from its decision column, as before.
- The strict token audit can report pairs it used to pass. Earlier versions matched token names as substrings (a decision about `size-18` and `size-20` also covered `size-1` and `size-2`), accepted a decision cell that said `待確認`, and accepted a row whose only "decision" was a suggestion. Those pairs were never decided; record the decision and the audit passes.
- A package without a `Report Language` record now opens its HTML in English rather than Traditional Chinese when `--locale` is not given. Add `Report Language: zh-Hant (繁體中文)` to `SESSION_STATE.md`, or pass `--locale zh-Hant`.
- To adopt the review flow in an existing package, use the new `Near Token Decisions` columns from the starter template, and give each row that already holds a decision a `Confirmed by` value saying who decided it. Do not add only the missing column to an old table: once a table has both columns, every decided row in it needs a confirmer.

## Audits

Run the strict audit from the project root after real extraction work:

```sh
node skills/design-system-extractor/scripts/audit_sources.mjs . --strict
node skills/design-system-extractor/scripts/audit_tokens.mjs . --strict
node skills/design-system-extractor/scripts/audit_components.mjs . --strict
```

Use non-strict mode only for an empty starter package or early setup check. Run strict mode against another target package like this:

```sh
node path/to/design-system-extractor/scripts/audit_sources.mjs /path/to/design-system-package --strict
node path/to/design-system-extractor/scripts/audit_tokens.mjs /path/to/design-system-package --strict
node path/to/design-system-extractor/scripts/audit_components.mjs /path/to/design-system-package --strict
```

The audit checks for:

- missing source fingerprints in `DESIGN_EVIDENCE_MAP.md`
- repeated screenshot, Figma, route, or source keys without a documented duplicate source decision
- component tokens referencing reference tokens directly
- system token names that include component vocabulary
- reference token names that include semantic roles
- reference color scale direction: `100` lightest to `0` darkest
- near duplicate reference colors or numbers without a designer-confirmed merge/keep-distinct decision (a suggested action alone is reported as awaiting confirmation)
- raw values in system/component layers
- missing token files or empty token layers in strict mode
- `tokens.css` import order in strict mode
- background-like system colors missing `on-*` foreground pairs
- unresolved component similarity review rows
- similar-component rows without a screenshot or a compared region for either side (warning only)
- component specs missing a `Component Fingerprint` section

The review logic has its own tests:

```sh
node --test skills/design-system-extractor/scripts/test_review_core.test.mjs
node --test skills/design-system-extractor/scripts/test_review_page.test.mjs
node --test skills/design-system-extractor/scripts/test_naming_order.test.mjs
```

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

Use `skills/design-system-extractor/SKILL.md` when extracting a design system from screenshots, Figma references, rendered UI, native iOS/Android captures/previews/screenshot tests, or project code.
Start with `design-system/SESSION_STATE.md` when it exists.
Use `design-system/INTEGRATION_REVIEW.md` when reviewing or integrating parallel extraction branches.
Use `design-system/` and `tokens/` as source of truth before product UI code.
For native iOS/Android projects, read `skills/design-system-extractor/references/native-mobile-projects.md`, record native screen/state coverage, and verify source-only Swift/Kotlin/XML through screenshots, previews, screenshot tests, captures, navigation reachability, or user confirmation.
Maintain token inheritance: ref -> sys -> comp.
Keep reference color scales ordered as 100 lightest to 0 darkest.
Record suggested duplicate source reuse/ignore/keep-distinct actions in `DESIGN_EVIDENCE_MAP.md`; count duplicates as separate evidence only after the designer confirms.
Record suggested near-token merge/keep-distinct actions in `TOKEN_ARCHITECTURE.md`; merge only after a designer confirms on `docs/design-system/review.html` or in the conversation, then apply the decisions with the Review Decision Apply Pass.
Review similar component candidates before creating new specs; record a suggested merge/variant/keep-distinct/blocked action in `COMPONENT_INVENTORY.md` and write the spec after the designer confirms it.
Run `node skills/design-system-extractor/scripts/audit_sources.mjs . --strict`, `node skills/design-system-extractor/scripts/audit_tokens.mjs . --strict`, and `node skills/design-system-extractor/scripts/audit_components.mjs . --strict` after extraction, token, or component changes.
Run `node skills/design-system-extractor/scripts/generate_docs_html.mjs .` and `node skills/design-system-extractor/scripts/generate_review_html.mjs .` after design-system documentation or review changes.
Apply `design-system/ANTI_AI_STYLE_RULES.md` before UI recommendations.
Stop at the checkpoint and ask before product implementation.
```

Recommended Claude Code prompt:

```txt
Use skills/design-system-extractor/SKILL.md to extract a reusable design-system package from the screenshots in design-reference/. Fill design-system/ and tokens/, review duplicate sources and similar components, generate docs/design-system/index.html and docs/design-system/review.html, run strict source, token, and component audits, update SESSION_STATE.md, then stop and ask for the next step.
```

For a Figma input:

```txt
Use skills/design-system-extractor/SKILL.md to extract design-system docs and tokens from this Figma URL: <figma-url>. Treat Figma data as evidence, create an evidence map with source fingerprints, review duplicate Figma sources, capture component similarity review images when candidates overlap, generate docs/design-system/index.html and docs/design-system/review.html, run strict source, token, and component audits, and stop at the checkpoint.
```

Recommended Claude Code prompt for collaborative integration:

```txt
Use skills/design-system-extractor/SKILL.md to review and integrate these design-system extraction branches or PRs: <branch-or-pr-list>. Record branch review decisions in design-system/INTEGRATION_REVIEW.md, resolve source/token/component conflicts through the existing review tables, regenerate docs, run strict audits, update SESSION_STATE.md, and stop with blockers.
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

Use `skills/design-system-extractor/SKILL.md` for design-system extraction from screenshots, Figma references, rendered UI, native iOS/Android captures/previews/screenshot tests, or project code.
Read `design-system/SESSION_STATE.md` before continuing existing work.
Use `design-system/INTEGRATION_REVIEW.md` when reviewing or integrating parallel extraction branches.
Fill or update `design-system/` and `tokens/` before product UI code.
For native iOS/Android projects, read `skills/design-system-extractor/references/native-mobile-projects.md`, record native screen/state coverage, and verify source-only Swift/Kotlin/XML through screenshots, previews, screenshot tests, captures, navigation reachability, or user confirmation.
Maintain token inheritance: ref -> sys -> comp.
Keep reference color scales ordered as 100 lightest to 0 darkest.
Record suggested duplicate source reuse/ignore/keep-distinct actions in `DESIGN_EVIDENCE_MAP.md`; count duplicates as separate evidence only after the designer confirms.
Record suggested near-token merge/keep-distinct actions in `TOKEN_ARCHITECTURE.md`; merge only after a designer confirms on `docs/design-system/review.html` or in the conversation, then apply the decisions with the Review Decision Apply Pass.
Review similar component candidates before creating new specs; record a suggested merge/variant/keep-distinct/blocked action in `COMPONENT_INVENTORY.md` and write the spec after the designer confirms it.
Component tokens may reference only system tokens.
Do not hardcode color, spacing, radius, typography, opacity, shadow, or motion values when tokens exist.
Apply `design-system/ANTI_AI_STYLE_RULES.md` before UI generation.
Run `node skills/design-system-extractor/scripts/audit_sources.mjs . --strict`, `node skills/design-system-extractor/scripts/audit_tokens.mjs . --strict`, and `node skills/design-system-extractor/scripts/audit_components.mjs . --strict` after extraction, token, or component changes.
Run `node skills/design-system-extractor/scripts/generate_docs_html.mjs .` and `node skills/design-system-extractor/scripts/generate_review_html.mjs .` after design-system documentation or review changes.
Stop and ask before moving from extraction into product implementation.
```

Recommended Cursor prompt:

```txt
Follow .cursor/rules/design-system.mdc and use skills/design-system-extractor/SKILL.md. Extract a reusable design-system package from design-reference/, update design-system/ and tokens/, review duplicate sources and similar components, generate docs/design-system/index.html and docs/design-system/review.html, run strict source, token, and component audits, then update SESSION_STATE.md.
```

When starting from an existing project:

```txt
Use skills/design-system-extractor/SKILL.md to inspect this project as reference material. Extract the design system into design-system/ and tokens/, then generate docs/design-system/index.html and docs/design-system/review.html. Do not refactor product UI yet.
```

For branch integration:

```txt
Follow .cursor/rules/design-system.mdc and use skills/design-system-extractor/SKILL.md. Review and integrate these design-system branches or PRs: <branch-or-pr-list>. Update INTEGRATION_REVIEW.md and SESSION_STATE.md, regenerate docs, run strict audits, and stop with blockers.
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

Use `skills/design-system-extractor/SKILL.md` when extracting a design system from screenshots, Figma references, rendered UI, native iOS/Android captures/previews/screenshot tests, or project code.
Use all reference screenshots, Figma data, rendered UI, native captures/previews/screenshot tests, and `design-system/` docs as source evidence.
For native iOS/Android projects, read `skills/design-system-extractor/references/native-mobile-projects.md`, record native screen/state coverage, and verify source-only Swift/Kotlin/XML through screenshots, previews, screenshot tests, captures, navigation reachability, or user confirmation.
Start with `design-system/SESSION_STATE.md`.
Use `design-system/INTEGRATION_REVIEW.md` when reviewing or integrating parallel extraction branches.
Keep token inheritance strict: ref -> sys -> comp.
Keep reference color scales ordered as 100 lightest to 0 darkest.
Record suggested duplicate source reuse/ignore/keep-distinct actions in `DESIGN_EVIDENCE_MAP.md`; count duplicates as separate evidence only after the designer confirms.
Record suggested near-token merge/keep-distinct actions in `TOKEN_ARCHITECTURE.md`; merge only after a designer confirms on `docs/design-system/review.html` or in the conversation, then apply the decisions with the Review Decision Apply Pass.
Review similar component candidates before creating new specs; record a suggested merge/variant/keep-distinct/blocked action in `COMPONENT_INVENTORY.md` and write the spec after the designer confirms it.
Fill or update design-system docs and tokens before product UI code.
Apply `design-system/ANTI_AI_STYLE_RULES.md` before interface work.
Run `node skills/design-system-extractor/scripts/audit_sources.mjs . --strict`, `node skills/design-system-extractor/scripts/audit_tokens.mjs . --strict`, and `node skills/design-system-extractor/scripts/audit_components.mjs . --strict` after extraction, token, or component changes.
Run `node skills/design-system-extractor/scripts/generate_docs_html.mjs .` and `node skills/design-system-extractor/scripts/generate_review_html.mjs .` after design-system documentation or review changes.
Update `design-system/SESSION_STATE.md` and ask for the next step before continuing.
```

Recommended Codex prompt:

```txt
Use $design-system-extractor to extract a reusable design-system package from design-reference/. Fill design-system/ and tokens/, review duplicate sources and similar components, generate docs/design-system/index.html and docs/design-system/review.html, run strict source, token, and component audits, update SESSION_STATE.md, then stop before product implementation.
```

If the skill is only project-local and not installed globally:

```txt
Use skills/design-system-extractor/SKILL.md to extract a reusable design-system package from this project. Treat screenshots, Figma data, native captures/previews/screenshot tests, and prototype code as evidence. Fill design-system/ and tokens/, generate docs/design-system/index.html and docs/design-system/review.html, run the audits, and stop at the checkpoint.
```

For collaborative branch review:

```txt
Use $design-system-extractor to review and integrate these design-system extraction branches or PRs: <branch-or-pr-list>. Use INTEGRATION_REVIEW.md as the integration log, resolve source/token/component conflicts through the review gates, regenerate docs, run strict audits, update SESSION_STATE.md, and stop with decisions and blockers.
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
- Do not merge near tokens, or fill in a decision, before a designer confirms the suggested action.
- Do not silently accept duplicate components, duplicate source evidence, or near-identical tokens during branch integration.
- Do not hand-edit generated HTML docs to resolve merge conflicts; regenerate them from source Markdown and tokens.
- Do not add generic gradients, glassmorphism, outline-card stacks, inflated whitespace, or SaaS landing-page patterns unless the references clearly show them.

## Template

For a new extraction package, copy:

```txt
assets/design-system-template/
```

Then fill the generated `design-system/` and `tokens/` files using the workflow above.
