---
name: design-system-extractor
description: Extract a design system, design tokens (ref -> sys -> comp), and a component inventory from screenshots, a Figma URL or Figma Variables, a web project folder, a native app (iOS/Android), or a vibe-coded prototype; also branch review of parallel extractions. Produces an evidence-backed design-system package (component specs, anti-AI style rules, static HTML docs) and stops at a checkpoint before any product code. Triggers: extract design system, design token, component inventory, 萃取設計系統, 設計系統規範, 元件清單, 截圖轉 token, 從 Figma 萃取.
---

# Design System Extractor

Act as a Design System Architect: turn visual and code references into an evidence-backed, token-backed design-system package.
Do not implement product screens, Storybook code, or app routes in this skill; stop at the checkpoint and hand off.

## First Actions

1. Locate or create the package root (`design-system/` and `tokens/` live under it). Resolve this skill's folder as `<skill-root>`; use `<skill-root>/assets/...` and `<skill-root>/scripts/...` for templates and scripts.
2. If the package has no structure yet, copy `<skill-root>/assets/design-system-template/` into the target root.
3. Read existing `AGENTS.md`, `CLAUDE.md`, `.cursorrules`, `.cursor/rules/*`, prior `design-system/SESSION_STATE.md` (including its `Report Language:` record), and `design-system/INTEGRATION_REVIEW.md` when present.
4. Inspect `references/` before writing tokens. If a source project has screenshots and code, inspect both.
5. Report Language: default to the conversation language without asking. Write `Report Language: <language-tag> (<human-readable name>)` into `SESSION_STATE.md` before Input Discovery and state it in one non-blocking sentence of the first reply ("Report language: zh-Hant; say "switch to English" to change"). Ask only when the conversation language is ambiguous, an existing record is present but unrecognizable, or the developer's instruction conflicts with it. Keep in English, never translated: section headings, table headers, status values, decision keywords, confidence values, token names, file names, CSS markers (`token-review:`, `a11y-remap`). A report-language annotation may only be appended in full-width parentheses after the English text (`## Source Inventory（來源清單）`), never replace or prefix it. Full rules: `references/report-language.md`.

## Input Router

| Input type | Evidence tier | Load | Notes |
|---|---|---|---|
| Screenshots / graphic, brand, editorial images | 2 | no intake reference (the step references still apply) | Fast path: go straight to Workflow step 1 (fingerprints and duplicate review still apply). Prefer concrete observed regions over style impressions. |
| Figma URL / node / Variables | 1 | available Figma tools | Treat nodes, Variables, and component names as evidence, still recording where each decision came from. Write the design URL verbatim (`https://www.figma.com/design/...`) into `SESSION_STATE.md` (Figma file URL) — downstream export tooling scans for it. List the pages, nodes, and Variable collections used as Source Inventory rows (`figma:<file-key>#page:<name>`, `figma:<file-key>#<node-id>`). Without Figma tools, use exported frames and metadata: exports from the production file keep tier 1, other exports are tier 2 images. |
| Web project / prototype / vibe-coded folder | 4 rendered UI, 6 code | `references/project-intake.md` | Inspect rendered UI, screenshots, tokens, CSS, Storybook, components. Prototype code is reference-only unless the developer asks to migrate it. |
| Native iOS / Android project | 3 device captures, 5 previews / screenshot tests, 6 code | `references/native-mobile-projects.md` | Inspect supplied captures, previews, screenshot tests, theme/resource files, and component modules before source-only code. |
| Mixed | compare tiers | — | Rank unless the developer says otherwise: 1 production Figma/component library, 2 production screenshots, 3 native simulator/emulator/device captures, 4 rendered project UI, 5 native preview/screenshot-test captures, 6 prototype code, 7 descriptive prompt. Record each source's tier; a higher-tier source arriving after decisions triggers the Late-Arriving Authoritative Source Pass. |

Judging criteria for project folders:

- A project that looks AI-generated, exploratory, or prototype-heavy is reference-only unless the developer says it is production.
- Source code counts as evidence only when tied to rendered/captured evidence or explicit developer confirmation; file, layer, composable, and style names are clues, not proof.
- If the project is runnable, capture is OPT-IN: ask once ("run and capture the app?") and explain that declining lowers source-only rules to Low confidence and is recorded as `capture-blocked: declined by user`. Existing screenshots, preview, and screenshot-test artifacts must still be collected.

## Modes

Record the mode in `SESSION_STATE.md` (`Mode: quick` or `Mode: deep`). Quick Extract is the default; use Deep Extract when the developer asks for it or confirms capture for a runnable project.

| | Quick Extract (default) | Deep Extract |
|---|---|---|
| Capture passes | none | Rendered / Native UI Capture Pass when confirmed |
| Components | 1-3 highest-priority specs; the rest stay `planned` | every `extracted` component |
| Spec profile | Purpose, Evidence, Component Fingerprint, Anatomy, Variants, States, Accessibility Rules (3-5 bullets), Token Contract, Implementation Notes; Layout Rules only for typographic components; Content Rules and Do / Don't marked `deferred to Deep Extract` | all sections |
| Character files | `DESIGN_PRINCIPLES.md`, `PAGE_COMPOSITION_RULES.md`, `INTERACTION_STATES.md` stay stubs whose first content line reads `Status: deferred to Character Pass`; marked `deferred` in `SESSION_STATE.md`. `ANTI_AI_STYLE_RULES.md` stays on the main path (short) | all three filled |
| Review images | only when a similarity row exists | every similarity row |
| Cross-agent files | offered at the checkpoint | generated when requested |

The Character Pass (fill the three deferred files) is offered in the checkpoint menu.

## Decision Vocabulary

| Review | Recorded in | Options |
|---|---|---|
| Source duplicate | `DESIGN_EVIDENCE_MAP.md` > `Source Duplicate Review` | `reuse existing source` / `ignore duplicate` / `keep distinct` |
| Near token | `TOKEN_ARCHITECTURE.md` > `Near Token Decisions` (one row per cluster member against its canonical), or an adjacent `token-review:` CSS comment | `merge` / `keep distinct`; record both provenances (`authored` / `measured`). Members are tiered by `audit_tokens.mjs`: `auto` (measured below JND, or measured snapping into an authored value) is written by `apply_token_decisions.mjs --tier auto` with Confirmed by `auto-tier`, no developer needed; `proposal` carries a default decision and is confirmed once as a batch; `must-ask` (`authored` vs `authored`, never auto-merged) is decided per cluster. `unknown` provenance never reaches `auto` |
| Accessibility remap | `TOKEN_ARCHITECTURE.md` > `Accessibility Remap Decisions` + `a11y-remap` CSS comment | authored value kept as its own `ref` token; `sys` role mapped to the accessible value |
| Token recalibration | `TOKEN_ARCHITECTURE.md` > `Token Recalibration` | `merge` / `keep distinct` / `re-authorize` |
| Component similarity | `COMPONENT_INVENTORY.md` > `Component Similarity Review` | `merge` / `make variant` / `keep distinct` / `blocked` |
| Inventory status | `COMPONENT_INVENTORY.md` Status column | `extracted` / `planned` / `blocked` / `out-of-scope` |
| Integration | `INTEGRATION_REVIEW.md` (Collaboration pass only) | `merge` / `request changes` / `blocked` / `superseded` / `defer` |

Confidence is always `High` / `Medium` / `Low`. The person who decides is "the developer". Every stop uses one phrasing: `STOP: ask the developer to choose <options>; record in <file> under <heading>`.

## Workflow

### 1. Input Discovery

- Record every source in `SESSION_STATE.md` and as a `Source Inventory` row in `DESIGN_EVIDENCE_MAP.md` with its evidence tier and a fingerprint: `sha256:<hash>` (plus `phash:<hash>` when available) for images and exports; `figma:<file-key>#<node-id>` or `figma:<file-key>#page:<page-name>` for Figma; route + viewport + state + command for rendered captures. Formats and source types: `references/visual-analysis-rubric.md`.
- For project folders, complete the loaded intake reference (manifest, capture decision, evidence classification) before using code to raise confidence.
- Auto-resolve exact duplicates (same sha256 with the same `Screen or state`, or the same `figma:<file>#<node>`) as `ignore duplicate` with rationale `exact match (auto-resolved)`; list them in the checkpoint message.
- STOP once at the end of this step: ask the developer to choose `reuse existing source` / `ignore duplicate` / `keep distinct` for every likely duplicate before any Evidence row is written; record in `DESIGN_EVIDENCE_MAP.md` under `Source Duplicate Review`. While a pair is pending, treat it as one source when assigning confidence.
- If a new source outranks the tiers behind existing token or component decisions, do not treat it as one more input: run the Late-Arriving Authoritative Source Pass.

### 2. Evidence Map

- Fill `DESIGN_EVIDENCE_MAP.md` > `Evidence` before writing design decisions: one row per important decision with Source ID, region, observed pattern, design decision, affected tokens or components, and confidence.
- Quick Extract: one row per decision that becomes a token, a component, or a normative rule in `DESIGN_ELEMENTS.md` / `ANTI_AI_STYLE_RULES.md`; descriptive observations need no row. Use the visual dimensions in `references/visual-analysis-rubric.md`.

### 3. Design Foundations

- Fill `DESIGN_ELEMENTS.md`: color proportions, typography, text lockups, spacing, density, shape, elevation/depth, iconography, imagery, data display, state language. Every entry needs evidence and an implementation rule; mark unobserved dimensions `not observed`.
- Keep atomic typography (typefaces, scale, weights, line height, letter spacing, numeric and script behavior) separate from text composition patterns (kicker + headline, headline + subhead, number + unit + caption, quote + attribution, label + value). A typographic component is a composition with reusable slots, stable hierarchy, and tokenizable relationships.
- `DESIGN_PRINCIPLES.md` (5-7 principles, each with evidence, implementation rule, do/don't): Deep Extract now; Quick Extract leaves the stub `Status: deferred to Character Pass`.

### 4. Token Architecture

- Read `references/token-architecture.md`. Default to strict `ref -> sys -> comp`: `--<prefix>-ref-*` raw values only with color steps `100` lightest to `0` darkest; `--<prefix>-sys-*` references ref only; `--<prefix>-comp-*` references sys only; `tokens.css` imports ref → sys → comp; every background-like sys color has an `on-*` pair.
- Mark every draft ref token with a CSS comment on the same line or immediately before the declaration: `provenance: authored` (Figma Variable/style, design-system export, source-code token) or `provenance: measured` (screenshot sampling, pixel measurement), plus optional `usage: <n>` (observed occurrences) and `sources: <Source IDs>`, semicolon separated (`--md-ref-color-blue-50: #2f6fd6; /* provenance: authored; usage: 14; sources: S1 */`). A token without the marker is `unknown`.
- Run `node <skill-root>/scripts/audit_tokens.mjs <target-root>` (non-strict) for the cluster report: near tokens are grouped into clusters, each with one canonical (authored first, then usage, then the rounder value), and every other member is tiered `auto` / `proposal` / `must-ask` against the canonical (`Near token clusters: <n> (auto a, proposal p, must-ask m)`, one line per cluster). The report also prints `Scale fit (length): ...`; off-grid lengths are warnings to resolve by snapping or by recording why the value is intentional, never blockers. Thresholds and tier rules: `references/token-architecture.md`.
- Run `node <skill-root>/scripts/apply_token_decisions.mjs <target-root> --tier auto --rewrite-css` without asking the developer. `auto` means measured vs measured below JND, or a measured value snapping into an authored value; the script appends the `merge` rows with Confirmed by `auto-tier`, rewrites `var()` references to the canonical, and removes the merged declarations. It is idempotent and the only mechanical writer of `Near Token Decisions`; use `--dry-run` to preview.
- STOP once for the proposal tier: present one row per `proposal` cluster (cluster id, canonical, each member with its distance and proposed decision) and ask the developer to choose accept all / name exceptions as `merge` or `keep distinct`; record in `TOKEN_ARCHITECTURE.md` under `Near Token Decisions` by running `apply_token_decisions.mjs <target-root> --tier proposal --confirmed-by "<developer>"` with `--keep <members>` / `--merge <members>` for the exceptions.
- Present each `must-ask` cluster (`authored` vs `authored`) separately with swatches or values, provenance, usage, and sources, then STOP: ask the developer to choose `merge` / `keep distinct`; record in `TOKEN_ARCHITECTURE.md` under `Near Token Decisions` by running `apply_token_decisions.mjs <target-root> --tier must-ask --only <canonical> --decision merge|keep-distinct --confirmed-by "<developer>"`.
- `unknown` provenance never enters the `auto` tier (it stays `proposal`), and an `authored` value is never rounded toward a `measured` one: a merge involving an `authored` side keeps the authored value. Never write proposals into `TOKEN_ARCHITECTURE.md` or CSS comments before confirmation — the audit cannot tell a proposal from a decision; a hand-written row or `token-review:` comment is still accepted for a confirmed decision.
- An accessibility substitution (for example WCAG AA contrast) is an `a11y-remap`: keep the authored value as its own `ref` token, map the `sys` role to the accessible value, add the `a11y-remap` comment and an `Accessibility Remap Decisions` row. Never substitute silently.
- Write `sys` and `comp` tokens and finish `TOKEN_ARCHITECTURE.md` only after the decisions are recorded; `audit_tokens.mjs --strict` fails while any member lacks a decision against its canonical.

### 5. Component Inventory

- Fill `COMPONENT_INVENTORY.md` with repeated UI, graphic, layout, and typographic patterns: Component, Category (`foundation` / `primitive` / `typographic` / `form-control` / `layout` / `navigation` / `data-display` / `feedback` / `overlay` / `composite` / `product-pattern`; may be empty), Status, Priority, fingerprint summary, required tokens, missing states (`not applicable` for display-only), notes. Status words belong only in the Status column: the current `design-system-to-storybook` planner reads Status by header name, while older planner copies and inventories without a Status column are scanned cell by cell for `blocked`, `deferred`, `out of scope`, and `needs-extraction`, so phrase Notes without those words.
- Promote a text composition to a component only when it has reusable structure, clear slots, evidence-backed hierarchy, and tokenizable relationships.
- Build a fingerprint per candidate (purpose, behavior or composition role, anatomy/slots, variants/states, token contract, layout/density, evidence, visual reference) and compare it with existing extracted or planned components — purpose and behavior first, then anatomy, states, tokens, layout. Rules and review-image requirements (source-based crops; schematic SVG only as the labeled fallback): `references/component-spec-rules.md`.
- When a candidate overlaps an existing component, create its `Component Similarity Review` row now and capture the source-based review image into `design-system/assets/component-review/` now. No overlap → no row and nothing in that folder.
- STOP once at the end of this step: ask the developer to choose `merge` / `make variant` / `keep distinct` / `blocked` for every row, presenting the visual comparison and fingerprint difference; record in `COMPONENT_INVENTORY.md` under `Component Similarity Review`. Candidates with a pending row stay `planned` and get no spec.

### 6. Component Token Specs

- For each component to extract (Quick: 1-3 highest priority; Deep: every `extracted` component) create `design-system/components/<lowercase-hyphen>.md` from `COMPONENT_SPEC_TEMPLATE.md` and add slots to `tokens/tokens-comp.css`. Default first pick: the primary action component for UI-heavy references, a typographic lockup (hero title, editorial heading stack, metric, quote) for brand/editorial references.
- Keep the spec shape: first `# <Component Name>` heading; `## Evidence` whose Source column holds Source Inventory Source IDs (or the URL/path); `## Component Fingerprint` with a `Visual reference` row; `## Anatomy`; `## Token Contract` (comp → sys only); `## Implementation Notes`.
- Apply the spec profile of the current Mode; details in `references/component-spec-rules.md`.

### 7. Composition, Interaction, And Anti-AI Rules

- Always fill `ANTI_AI_STYLE_RULES.md` with project-specific constraints (`references/anti-ai-style-rules.md`): no generic SaaS hero layouts, decorative gradients, glassmorphism, outline-card overuse, inflated whitespace, or unsupported illustration styles unless the references prove them.
- Deep Extract: fill `PAGE_COMPOSITION_RULES.md` and `INTERACTION_STATES.md` (`references/page-composition-rules.md`). Quick Extract: leave both stubs with `Status: deferred to Character Pass`.

### 8. HTML Documentation

- One command runs the three strict audits and both generators (all of them, even if one fails):

```sh
node <skill-root>/scripts/extract_check.mjs <target-root> --locale <ui-locale>
```

- Derive `<ui-locale>` from the recorded Report Language: Traditional or Simplified Chinese → `zh-Hant`, Japanese → `ja`, English and every other language → `en`. The flag accepts only `zh-Hant`, `en`, `ja` (default `zh-Hant`). Outputs: `docs/design-system/index.html` and `docs/design-system/review.html`.
- Use `--starter` only for an empty starter package (audits without `--strict`); `--audits-only` skips the generators; `--json` prints one machine-readable object. Details and standalone scripts: `references/html-documentation.md`.

### 9. Audit And Checkpoint

- Read the `STEP | RESULT` table from step 8; fix every `FAIL` and re-run the same command until all steps pass. Pending near-token or similarity decisions are written as `pending: <n>` in Verification, never as passed.
- Fill every section of `SESSION_STATE.md`, writing `n/a` where a field does not apply: Current Stage (Stage, Last updated, AI tool, Report Language, Mode, Intake, Figma file URL verbatim), Completed Outputs (`deferred` allowed), Key Design Decisions, Source Duplicate Review (including auto-resolved rows), Token Review (near-token candidates and decisions, `Token layers changed (ref / sys / comp)`, the `Token Recalibration:` line), Component Similarity Review, Open Questions, Verification (extract_check result, three audits, docs and review paths, `HTML docs UI locale`), Recommended Next Prompt.
- STOP: update `SESSION_STATE.md`, then present the next-step menu: review and refine the extraction; expand components (Component Expansion Pass); Character Pass; review and integrate collaborator branches; generate Figma Variables or token export; create or update cross-agent instructions; build Storybook foundations and components with `design-system-to-storybook`; start a separate product implementation workspace.
- The developer may answer pending decisions and pick the next step in one reply; record the decisions, re-run `extract_check.mjs`, and update `SESSION_STATE.md` before executing the next step.

## Gates

| Gate | Never | Instead | Record in |
|---|---|---|---|
| Evidence | Make an important rule normative without source evidence; count duplicate screenshots, Figma nodes, or rendered routes as independent evidence before the duplicate decision is recorded; let a matching or very close fingerprint change confidence before the developer decides | Mark it Low confidence or ask; auto-resolve only exact matches; treat a pending pair as one source | `DESIGN_EVIDENCE_MAP.md` > `Source Duplicate Review` |
| Token | Use hardcoded fallback values in implementation guidance; silently merge or split close values; round an authored value away; auto-merge `authored` vs `authored`; silently replace an authored value with an accessible substitute | Create or propose the token at the correct layer; ask for merge/keep-distinct and record both provenances before the checkpoint; record accessibility changes as `a11y-remap` (authored kept as `ref`, accessible mapped at `sys`) | `TOKEN_ARCHITECTURE.md` > `Near Token Decisions` / `Accessibility Remap Decisions` |
| Authoritative Source | Fold a later, higher-tier source in as supplementary evidence | Run the Late-Arriving Authoritative Source Pass (`references/passes.md`, read it before acting), build the `## Token Recalibration` table, recommend `merge` / `keep distinct` / `re-authorize` per row, and get developer adjudication before changing or reaffirming the affected tokens and components | `TOKEN_ARCHITECTURE.md` > `Token Recalibration` |
| Component | Create a component only because a Figma layer name is new; write a spec for a candidate with a pending similarity row | Check `COMPONENT_INVENTORY.md` and existing specs; reuse or extend when intent, anatomy, slots, and states match; present the visual comparison and fingerprint difference, then ask for merge/variant/keep-distinct/blocked | `COMPONENT_INVENTORY.md` > `Component Similarity Review` |
| Implementation Boundary | Generate product UI code, Storybook implementation code, or app routes before the checkpoint unless the developer explicitly requests product implementation | Stop at the checkpoint; the next step belongs to `design-system-to-storybook` | `SESSION_STATE.md` |
| Collaboration | Integrate parallel branches by silently accepting duplicate components, duplicate source evidence, or near-identical token values | Record `merge` / `make variant` / `keep distinct` / `reuse existing source` / `ignore duplicate` / `blocked` in the review tables before the checkpoint; resolve Markdown and token files first | `INTEGRATION_REVIEW.md` + the review tables |

General rule: `docs/design-system/index.html` and `review.html` are generated outputs. Never hand-edit them (for merge conflicts or anything else); fix Markdown and tokens, then regenerate with `extract_check.mjs`.

## Post-Checkpoint Passes

All passes reuse the `Report Language` recorded in `SESSION_STATE.md` without asking. Full text: `references/passes.md`.

| Trigger | Pass | See |
|---|---|---|
| Developer picks "expand components" | Component Expansion Pass: for one or more `planned` components run steps 2 (confirm evidence) → 5 → 6 → 7 → 8 → 9 | `references/passes.md` |
| Developer picks "Character Pass" | Fill `DESIGN_PRINCIPLES.md`, `PAGE_COMPOSITION_RULES.md`, `INTERACTION_STATES.md`, then steps 8 → 9 | `references/passes.md` |
| A source whose tier outranks the evidence behind existing decisions arrives | Late-Arriving Authoritative Source Pass (contract below) | `references/passes.md` |
| Several contributors extracted on separate branches or PRs | Collaboration Review And Integration Pass; creates `design-system/INTEGRATION_REVIEW.md` | `references/collaboration-review.md` |

Late-Arriving Authoritative Source Pass — the contract: trigger when a new source's evidence tier outranks the tiers behind existing token or component decisions (typically production Figma with Variables after a screenshot-measured token set). Register it in `Source Inventory` with its tier and do not merge it into the existing evidence flow. Extract its authored values with `authored` provenance, without rounding or clustering them against existing tokens. Build the `## Token Recalibration` table in `TOKEN_ARCHITECTURE.md`: every existing token the source contradicts, approximates, or supersedes, with current value (provenance), authored value (source), delta, and a recommendation — `merge` (the measured token was an imprecise observation of the authored value), `keep distinct` (both values are real and intentionally different), or `re-authorize` (replace the token value with the authored value and update dependent `sys`/`comp` mappings). STOP: ask the developer to adjudicate every row; record in `TOKEN_ARCHITECTURE.md` under `Token Recalibration`. Then apply the decisions, re-run `extract_check.mjs`, write the `Token Recalibration:` line in `SESSION_STATE.md`, and repeat the tier comparison for components through the similarity review.

## Cross-Agent Use

To use the package with Claude Code, Cursor, or Codex, read `references/agent-integration.md` and generate the instruction file for that agent from the extracted rules.
Keep agent instructions short and point them back to the design-system docs and `extract_check.mjs`.

## Resource Map

- `references/visual-analysis-rubric.md`: Source Inventory and Evidence schemas, fingerprint formats, visual dimensions, extraction rules.
- `references/project-intake.md`: web project / prototype / vibe-coded intake, Rendered UI Capture Pass, paste-in tables.
- `references/native-mobile-projects.md`: iOS/Android intake, Native UI Capture Pass, native token and component rules, paste-in tables.
- `references/token-architecture.md`: token layers, naming, provenance merge rules, accessibility remap, audit rules.
- `references/component-spec-rules.md`: component selection, fingerprint, similarity review, spec sections and Quick profile.
- `references/page-composition-rules.md`: layout, density, page shell, composition rules.
- `references/anti-ai-style-rules.md`: constraints that prevent generic AI-looking UI.
- `references/report-language.md`: report language resolution, output language rules, `--locale` mapping.
- `references/passes.md`: Component Expansion, Character, Late-Arriving Authoritative Source, and Collaboration pass text.
- `references/collaboration-review.md`: team branch workflow, integration checklist, `INTEGRATION_REVIEW.md` paste-in.
- `references/agent-integration.md`: Claude Code, Cursor, and Codex instruction files.
- `references/html-documentation.md`: generated HTML docs and review queue behavior.
- `references/audits.md`: what each audit checks, and which regression tests to run after changing scripts or the template.
- `assets/design-system-template/`: starter output package.
- `scripts/extract_check.mjs`: one command — strict audits plus both generators (`--starter`, `--audits-only`, `--locale`, `--json`).
- `scripts/audit_sources.mjs`, `scripts/audit_tokens.mjs` (`--json`), `scripts/audit_components.mjs`: standalone audits; pass `--strict` after real extraction work.
- `scripts/apply_token_decisions.mjs`: writes near-token decisions into `Near Token Decisions` one tier at a time (`--tier auto|proposal|must-ask`, `--only`, `--keep`, `--merge`, `--decision`, `--confirmed-by`, `--rewrite-css`, `--dry-run`, `--json`); idempotent.
- `scripts/lib/token_review.mjs`: shared module behind the audit, the review page, and the apply script — provenance markers, CIEDE2000, clustering with a diameter cap, canonical selection, tier rules, 4px / 8px scale fit, decision-row format.
- `scripts/generate_docs_html.mjs` (`--locale`), `scripts/generate_review_html.mjs` (`--json`): standalone generators.
- `scripts/test_audits.mjs`: regression tests for the audit and generator contract (`node <skill-root>/scripts/test_audits.mjs`); run after changing any script, fixture, or template file. When changing template columns or headings, also run `node <ds-to-storybook-root>/scripts/test_trace_and_plan_contract.mjs`, which reads this template.
- `docs/extract-flow.html`: trilingual guide to the extraction flow and team workflow for people; `SKILL.md` stays canonical for modes, passes, and commands.
