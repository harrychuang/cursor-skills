# Design System Extractor Skill

`design-system-extractor` is a reusable skill for extracting and collaboratively reviewing a token-backed design-system package from screenshots, graphic/brand/editorial references, Figma references, branch diffs, an existing web or native iOS/Android project folder, or an AI-generated/vibe-coded prototype project.

It does not implement product screens by default. It produces design-system documentation, token files, component inventory, component token specs, anti-AI style rules, static HTML documentation, and a checkpoint for the next step.

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

Reference color scales use `100 -> 0` from light to dark. Near duplicate reference colors or numbers must be confirmed with the developer as either `merge` or `keep distinct` before the token set is finalized.

Input sources also go through duplicate review. Screenshots, image exports, Figma URLs/nodes, rendered routes, and prototype references should be recorded with a source fingerprint in `DESIGN_EVIDENCE_MAP.md`. Exact or likely duplicate sources must be confirmed as `reuse existing source`, `ignore duplicate`, or `keep distinct` before both are counted as separate evidence.

Component candidates also go through a similarity review. When a new Figma or screenshot component resembles an existing component, the extractor records a fingerprint and asks whether to merge it, make it a variant, keep it distinct, or block it pending more evidence. Component candidates include interactive UI elements, layout/display patterns, graphic motifs, and reusable typographic compositions. Visual comparison assets should come from actual Figma node previews/screenshots or screenshot crops, stored under `design-system/assets/component-review/`, and linked from `COMPONENT_INVENTORY.md`. Schematic SVGs are only a labeled last-resort fallback when source previews cannot be captured.

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
5. Define token architecture, review near token candidates, and fill `tokens/`.
6. Build `COMPONENT_INVENTORY.md` from repeated UI, layout, graphic, and typographic patterns and review similar component candidates.
7. Extract initial component token specs under `design-system/components/`, usually a primary action/core navigation component for UI-heavy references or a high-value typographic lockup for graphic/editorial-heavy references.
8. Document page composition, interaction states, and anti-AI style rules.
9. Generate developer-facing HTML documentation and the visual review queue.
10. Run strict source, token, and component audits.
11. Update `SESSION_STATE.md`, stop, and ask the user for the next step.

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
- Duplicate source, near-token, or similar-component decisions are recorded when relevant.
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
4. Record any merge/variant/keep-distinct/blocked decision in `COMPONENT_INVENTORY.md`.
5. Create or update the component spec in `design-system/components/<component-name>.md` from `COMPONENT_SPEC_TEMPLATE.md`.
6. Add only reusable product-wide system tokens.
7. Add component slots to `tokens/tokens-comp.css`.
8. Update inventory, interaction states, and page composition rules.
9. Regenerate HTML docs and review queue.
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

The generated review queue includes:

- duplicate source review rows with fingerprint or normalized source keys
- color scale issues with swatches
- near color token pairs with swatches and deltaE
- near numeric token pairs with differences
- component similarity review rows with visual references
- documented versus needs-review status

Use this HTML file as the developer-friendly reading layer. The Markdown files and CSS token files remain the source of truth.

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
- near duplicate reference colors or numbers that need a documented merge/keep-distinct decision
- raw values in system/component layers
- missing token files or empty token layers in strict mode
- `tokens.css` import order in strict mode
- background-like system colors missing `on-*` foreground pairs
- unresolved component similarity review rows
- component specs missing a `Component Fingerprint` section

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
Document duplicate source reuse/ignore/keep-distinct decisions in `DESIGN_EVIDENCE_MAP.md`.
Document near-token merge/keep-distinct decisions in `TOKEN_ARCHITECTURE.md`.
Review similar component candidates before creating new specs; record merge/variant/keep-distinct/blocked decisions in `COMPONENT_INVENTORY.md`.
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
Document duplicate source reuse/ignore/keep-distinct decisions in `DESIGN_EVIDENCE_MAP.md`.
Document near-token merge/keep-distinct decisions in `TOKEN_ARCHITECTURE.md`.
Review similar component candidates before creating new specs; record merge/variant/keep-distinct/blocked decisions in `COMPONENT_INVENTORY.md`.
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
Document duplicate source reuse/ignore/keep-distinct decisions in `DESIGN_EVIDENCE_MAP.md`.
Document near-token merge/keep-distinct decisions in `TOKEN_ARCHITECTURE.md`.
Review similar component candidates before creating new specs; record merge/variant/keep-distinct/blocked decisions in `COMPONENT_INVENTORY.md`.
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
- Do not silently accept duplicate components, duplicate source evidence, or near-identical tokens during branch integration.
- Do not hand-edit generated HTML docs to resolve merge conflicts; regenerate them from source Markdown and tokens.
- Do not add generic gradients, glassmorphism, outline-card stacks, inflated whitespace, or SaaS landing-page patterns unless the references clearly show them.

## Template

For a new extraction package, copy:

```txt
assets/design-system-template/
```

Then fill the generated `design-system/` and `tokens/` files using the workflow above.
