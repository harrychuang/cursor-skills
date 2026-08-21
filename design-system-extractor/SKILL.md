---
name: design-system-extractor
description: Extract a reusable design-system specification from UI screenshots/images, graphic/brand/editorial references, Figma URLs or exports, Figma Variables, existing web or native iOS/Android app project folders, SwiftUI/UIKit/Jetpack Compose/Android Views code, runnable rendered UI captures, simulator/emulator/device captures, AI-generated or vibe-coded prototype projects, or prototype code, and review or integrate parallel design-system extraction branches. Use when Codex must produce evidence-backed design principles, design elements, token architecture, component inventory, component token specs including typographic/text-lockup components, anti-AI style constraints, collaborative branch review records, static HTML documentation for developers, cross-agent handoff guidance for Claude Code/Cursor/Codex, and a checkpoint before any product implementation.
---

# Design System Extractor

Act as a Design System Architect. Extract a reusable design-system package from visual and code references. Do not implement product screens during this skill unless the user explicitly chooses that after the checkpoint.

## Supported Inputs

- **Images / screenshots:** use all provided screenshots, graphic exports, brand/editorial samples, posters, social visuals, and marketing captures as source of truth. Prefer concrete observed regions over general style impressions.
- **Figma URL / Figma exports:** use available Figma tools or exported screenshots/metadata. Treat selected nodes, variables, and component names as evidence, but still record where each decision came from.
- **Project / prototype folder:** inspect rendered UI, screenshots, tokens, CSS, Storybook, and components. Treat prototype code as reference-only unless the user asks to migrate code. For AI-generated or vibe-coded projects, apply the intake rules below before trusting source code patterns.
- **Native app project folder:** inspect iOS/Android screenshots, simulator/emulator captures, SwiftUI Previews, Compose Previews, screenshot tests, native theme/token resources, component modules, and reachable screens before trusting source-only UI code.
- **Mixed input:** rank evidence in this order unless user says otherwise: production Figma/component library, production screenshots, native simulator/emulator/device captures, rendered project UI, native preview/screenshot-test captures, prototype code, descriptive prompt. Record each source's **evidence tier** — its position in this ranking, `1` (production Figma/component library) through `7` (descriptive prompt) — in `DESIGN_EVIDENCE_MAP.md`, so a higher-tier source arriving later can be detected and trigger the Late-Arriving Authoritative Source Pass.

## Vibe Coding Project Intake

When a source project appears AI-generated, vibe-coded, exploratory, or prototype-heavy:

1. Treat it as prototype/reference material unless the user explicitly says it is production.
2. Prioritize rendered routes, captured screenshots, and Storybook stories over static source code, unused CSS, demo pages, or component filenames.
3. Create or locate a route/state manifest before extraction. Include route or story, viewport, state, render command, screenshot path when available, relevant source files, and keep/ignore notes.
4. If the project is runnable or has Storybook, run the Rendered UI Capture Pass before token or component decisions.
5. Classify project evidence as `rendered`, `screenshot`, `storybook`, `token-used`, `component-used`, `demo-only`, `unused`, `dead-code`, `capture-blocked`, `auth-blocked`, `contradictory`, or `out-of-scope`.
6. Count source code as supporting evidence only when the component/style appears in rendered output, is referenced by a route/story, or is explicitly marked intentional by the user.
7. Use confidence conservatively: High requires repeated rendered evidence plus used token/component agreement; Medium fits clear rendered evidence with noisy code/tokens; Low fits source-only, blocked capture, or inferred patterns.
8. Record route coverage, keep/ignore decisions, noise classifications, capture blockers, and gaps in `design-system/SESSION_STATE.md` and `design-system/DESIGN_EVIDENCE_MAP.md`.

## Native Mobile Project Intake

When a source project is a native iOS or Android app:

1. Read `references/native-mobile-projects.md` before extraction.
2. Identify platform, framework, app targets/modules, and available render surfaces: SwiftUI, UIKit, Jetpack Compose, Android Views/XML, screenshot tests, previews, simulator/emulator, or supplied captures.
3. Locate native design-system sources such as `DesignSystem`, `UIComponents`, Swift packages, asset catalogs, `UIColor`/`Color` wrappers, `UIFont`/`Font` styles, Compose `ui/theme`, `Color.kt`, `Typography.kt`, `Shape.kt`, `res/values/*.xml`, vector drawables, and shared component modules.
4. Build a screen/state manifest from navigation files, app entrypoints, previews, screenshot tests, UI test fixtures, story/gallery screens, supplied screenshots, and user-provided state notes.
5. Run the Native UI Capture Pass when dependencies, build setup, signing, simulators/emulators, and permissions allow. If capture is blocked, record the blocker and continue with lower-confidence evidence.
6. Count native source code as supporting evidence only when the component or style appears in supplied screenshots, simulator/emulator/device captures, previews, screenshot tests, reachable navigation, or is explicitly marked intentional by the user.
7. Treat component filenames, composable names, view names, asset names, and XML style names as clues, not proof of reusable components.
8. Record platform coverage, screen/state coverage, build or capture blockers, native token/resource usage, and keep/ignore decisions in `SESSION_STATE.md` and `DESIGN_EVIDENCE_MAP.md`.

## Rendered UI Capture Pass

For runnable web/prototype project folders, inspect the actual product before extracting design decisions:

1. Identify install, dev server, Storybook, preview, and test-data commands from package scripts, docs, or existing agent rules.
2. Build a route/story capture plan from router files, app directories, Storybook entries, screenshots, or user-provided route/state notes.
3. Start the app or Storybook when dependencies and permissions allow. If install, build, auth, seed data, or runtime setup blocks capture, record the blocker and continue with lower-confidence evidence.
4. Use available browser automation to open local routes/stories and capture representative screenshots. Default viewports: mobile `390x844`, tablet `768x1024`, desktop `1440x900`, unless the product context suggests better sizes.
5. Exercise non-destructive states that are reachable with available data, such as hover, selected, expanded, loading, empty, validation error, disabled, and responsive navigation. Do not invent hidden states that cannot be reached or evidenced.
6. Save captures under `design-system/assets/rendered-captures/` with filenames that include route or story, state, and viewport.
7. Inspect DOM/computed styles or rendered component source when available to connect visible UI to used tokens, CSS variables, components, and route imports.
8. Record every capture attempt in `DESIGN_EVIDENCE_MAP.md`, including route/story, viewport, state, command, screenshot path, source files, observed UI, and confidence impact.
9. Treat failed or blocked capture as an evidence result, not a reason to guess. Mark affected source-only rules Low confidence unless the user supplies screenshots or confirms the pattern.

## Native UI Capture Pass

For runnable native app projects, capture the actual app or preview output before extracting high-confidence native design decisions:

1. Identify build, preview, screenshot-test, UI-test, simulator, emulator, and demo/gallery commands from Xcode schemes, Swift Package manifests, Fastlane, Gradle tasks, docs, or existing agent rules.
2. Prefer existing production screenshots, generated screenshot-test artifacts, preview snapshots, and demo/gallery screens before trying to modify build configuration.
3. When running the app is feasible, capture representative screens and states on target devices or close defaults. Record platform, device, OS/API level, orientation, screen, state, command, screenshot path, and capture status.
4. Exercise non-destructive reachable states such as selected, expanded, loading, empty, validation error, disabled, modal/sheet open, navigation active, light/dark mode, and dynamic type/font-scale when available.
5. Save captures under `design-system/assets/rendered-captures/` with filenames that include platform, screen, device, state, and orientation.
6. Link visible UI back to native source files and resources when available: SwiftUI `View`, UIKit `UIView`/`UIViewController`, Compose `@Composable`, Android XML layout/View, asset catalog, `res/values`, theme, typography, shape, and component modules.
7. Record every native capture attempt in `DESIGN_EVIDENCE_MAP.md`. If capture is blocked by signing, provisioning, missing simulators, Gradle/Xcode setup, data, auth, or credentials, record the blocker and mark affected source-only rules Low confidence unless screenshots or user confirmation support them.

## First Actions

1. Locate or create a design-system package root.
2. Resolve this skill's folder as `<skill-root>`. Use `<skill-root>/assets/...` and `<skill-root>/scripts/...` when copying templates or running bundled scripts.
3. If the package has no structure yet, copy `<skill-root>/assets/design-system-template/` into the target root.
4. Read existing `AGENTS.md`, `CLAUDE.md`, `.cursorrules`, `.cursor/rules/*`, prior `design-system/SESSION_STATE.md` — including its `Report Language:` record — and prior `design-system/INTEGRATION_REVIEW.md` when present.
5. Inspect references before writing tokens. If a source project has screenshots and code, inspect both.

## Report Language Resolution

Resolve the report language after First Actions and before Input Discovery:

1. Look for a `Report Language:` record in `design-system/SESSION_STATE.md`. The record format is `<language-tag> (<human-readable name>)`, for example `Report Language: zh-Hant (繁體中文)`.
2. If a recognizable record exists, write all new report content in that language and do not ask again.
3. If `SESSION_STATE.md` is missing the record, or the record line is present but unrecognizable, treat the package as first-run: ask the user once which language to use for the extraction report. Offer exactly these options, with the first as the default recommendation:
   - the user's current conversation language (default, recommended)
   - English
   - 日本語 (Japanese)
   - a custom language named by the user
4. Do not guess or silently reuse an unrecognizable record. Record the confirmed answer in `design-system/SESSION_STATE.md` as `Report Language: <language-tag> (<human-readable name>)` before Input Discovery begins.
5. All post-checkpoint passes (Component Expansion, Late-Arriving Authoritative Source, Collaboration Review And Integration) reuse the recorded report language without asking again.
6. When the user explicitly asks to switch the report language, update the `Report Language:` record, log the switch in the `Key Design Decisions` table in `SESSION_STATE.md`, and write subsequently updated sections in the new language. Do not rewrite existing sections unless the user explicitly requests a full rewrite.

## Report Output Language Rules

Apply these rules to every generated file under `design-system/` when the report language is not English:

- Keep section headings and table headers in their English canonical form and append a report-language annotation in full-width parentheses after the English text, for example `## Source Inventory（來源清單）` or the table header `Developer Decision（開發者決定）`. The annotation is appended only — never replace, rewrite, or place it before the English canonical text. The audit scripts match English canonical text by substring, so an appended annotation keeps them parsing; a replaced or prefixed heading breaks them.
- Keep the following in English, never translated or rewritten: status values (`extracted`, `planned`, `blocked`, `out-of-scope`, `rendered`, `demo-only`, and similar), decision keywords (`merge`, `keep distinct`, `reuse existing source`, `ignore duplicate`, `make variant`, `block pending more evidence`, `re-authorize`), confidence values (`High`, `Medium`, `Low`), token names, file names, and CSS marker comments (`token-review:`, `a11y-remap`). Table cells may append a full-width-parenthesis annotation after the English keyword, for example `keep distinct（保留區分）`.
- Write all narrative body content — principle explanations, evidence descriptions, implementation rules, and notes — in the report language.

When the report language is English, add no annotations anywhere; keep the current English-only format unchanged.

| Element | English report | Non-English report (zh-Hant example) |
| --- | --- | --- |
| Section heading | `## Source Inventory` | `## Source Inventory（來源清單）` |
| Table header | `Developer Decision` | `Developer Decision（開發者決定）` |
| Decision cell | `keep distinct` | `keep distinct（保留區分）` |
| Narrative body | English prose | 報告語言內文 |

## Workflow

### 1. Input Discovery

Record source types, paths/URLs, confidence, and known gaps in `design-system/SESSION_STATE.md`.

For screenshots, list every image. For Figma, list node/page names or variable collections when available. For project folders, list token files, component directories, Storybook entries, screenshot/render routes, native app modules, preview/screenshot-test fixtures, simulator/emulator captures, and native theme/resource files if available. For vibe-coded projects, complete the route/state manifest, rendered capture pass, and evidence classification before using project code to raise confidence. For native app projects, complete the native screen/state manifest, Native UI Capture Pass where feasible, and native source classification before using source code to raise confidence.

Before using sources as evidence, run a source duplicate review:

1. Create a source fingerprint for every input and record it in `design-system/DESIGN_EVIDENCE_MAP.md`.
2. For local screenshots or exports, prefer `sha256:<hash>` for exact matches and add `phash:<hash>` or a screenshot crop note when perceptual comparison is available.
3. For Figma inputs, normalize to `figma:<file-key>#<node-id>` when a node is known, or `figma:<file-key>#page:<page-name>` when only a page is known.
4. For rendered routes or project screenshots, include the route, viewport, state, and source file or command in the fingerprint.
5. If two sources are exact duplicates or likely duplicates, stop and ask the developer whether to `reuse existing source`, `ignore duplicate`, or `keep distinct`.
6. Record every decision in `design-system/DESIGN_EVIDENCE_MAP.md` under `Source Duplicate Review` before using duplicate inputs to support separate design decisions.

Record every source's evidence tier in the `Source Inventory` table. When a newly added source has a **higher** tier than the tiers backing existing token or component decisions — for example a production Figma file with Variables arrives after the token system was built from screenshots — do not treat it as one more candidate input. Run the Late-Arriving Authoritative Source Pass instead.

### 2. Evidence Map

Fill `design-system/DESIGN_EVIDENCE_MAP.md` before writing final design decisions.

Each important decision needs an evidence row with:

- source file, URL, node, or route
- observed region
- observed pattern
- resulting design decision
- affected tokens or components
- confidence: High, Medium, or Low

Use `references/visual-analysis-rubric.md` when evaluating screenshots, native captures/previews, or rendered UI.

### 3. Design Foundations

Fill `design-system/DESIGN_PRINCIPLES.md` and `design-system/DESIGN_ELEMENTS.md`.

Cover color proportions, typography, typographic composition/text lockups, spacing, density, shape, elevation/depth, iconography, imagery, data display, and state language. Every principle must include evidence and an implementation rule.

Separate atomic typography from reusable text composition:

- typography foundations define typefaces, type scale, weights, line height, letter spacing, numeric behavior, and language/script behavior
- text composition patterns define recurring relationships between text slots, such as kicker + headline, headline + subhead, number + unit + caption, quote + attribution, or label + value
- typographic components are text composition patterns that are reusable, structurally stable, brand-significant, or token-heavy enough to guide future work

### 4. Token Architecture

Fill `design-system/TOKEN_ARCHITECTURE.md` and token files under `tokens/`.

Default to strict `ref -> sys -> comp` inheritance when the project has no stronger convention:

- reference tokens store raw values only
- system tokens store shared semantic roles only
- component tokens store component slots only
- component tokens reference system tokens only

Use `references/token-architecture.md` before creating or changing token layers.

Before finalizing token files, run a token candidate review:

1. Collect raw color, spacing, radius, typography, opacity, shadow, and motion values from evidence. For vibe-coded projects, do not promote values found only in unused CSS, demo-only components, or dead code unless the user marks them intentional. For native app projects, collect values from asset catalogs, theme files, resource XML, Swift/Kotlin token wrappers, and component code only after connecting them to screenshots, previews, captures, reachable screens, or explicit user confirmation.
2. Record each candidate value's provenance: `authored` (Figma Variable/style, design-system export, source-code token) or `measured` (screenshot sampling, pixel measurement). See `references/token-architecture.md`.
3. Normalize reference colors into palette families with numeric steps where `100` is lightest and `0` is darkest.
4. Check each palette family so higher numbers are visually lighter than lower numbers.
5. Cluster very close reference colors and very close reference numbers in the same value family.
6. If close candidates appear, apply the provenance merge rules: `measured` vs `measured` may go through the normal merge review; when either side is `authored`, default to `keep distinct` and never round the authored value away; `authored` vs `authored` always stops for a developer decision. Then ask the developer whether to `merge` or `keep distinct`.
7. If an authored value must be replaced for accessibility (for example WCAG AA contrast), record it as an accessibility remap — keep the authored value as its own `ref` token, map the `sys` role to the accessible value, and add the `a11y-remap` comment plus an `Accessibility Remap Decisions` row per `references/token-architecture.md`. Do not silently substitute the token value.
8. Record every decision — with both provenances — in `design-system/TOKEN_ARCHITECTURE.md` under `Near Token Decisions`, or add an adjacent `token-review:` CSS comment when the decision must stay next to the token.
9. Only then write final `ref`, `sys`, and `comp` tokens.

### 5. Component Inventory

Fill `design-system/COMPONENT_INVENTORY.md`.

Inventory repeated UI, graphic, layout, and typographic patterns from the references. Mark each component as `extracted`, `planned`, `blocked`, or `out-of-scope`. Include priority, observed sources, required token groups, missing states or `not applicable` for display-only components, and implementation notes. For vibe-coded projects, component filenames are not proof of reusable components; verify usage through rendered routes, Storybook stories, imports, or user keep/ignore notes. For native app projects, verify candidate components through screenshots, previews, screenshot tests, simulator/emulator captures, navigation reachability, imports/usages, or explicit user confirmation before treating them as reusable.

Always consider typographic component candidates across all source types, not only graphic design sources. Promote a text composition to a component only when it has reusable structure, clear slots, evidence-backed hierarchy, tokenizable spacing/type/color relationships, and a role beyond a one-off decorative treatment.

Before finalizing inventory or adding a new component spec, run a component similarity review:

1. Read existing `COMPONENT_INVENTORY.md`, `design-system/components/*.md`, and relevant component tokens.
2. Create a component fingerprint for each new candidate: purpose, behavior or composition role, anatomy/slots, variants/states or modes, token contract, layout/density, source evidence, and visual reference.
3. Compare the candidate with existing extracted or planned components. Weight purpose and behavior first, then anatomy, states, token usage, and layout.
4. If a candidate is similar to an existing component, stop and ask the developer whether to `merge`, `make variant`, `keep distinct`, or `block pending more evidence`.
5. Record the decision in `COMPONENT_INVENTORY.md` under `Component Similarity Review` before creating or updating component specs.
6. Use source-based visual references: for Figma, capture the actual node preview/screenshot or a crop of the design frame; for screenshot inputs, crop the relevant component region. Store review images under `design-system/assets/component-review/` and link them from the similarity table.
7. Do not use an AI-drawn schematic as the review image when a Figma preview or screenshot crop is available. A schematic SVG is allowed only as a last-resort fallback when source previews cannot be captured, and it must be labeled `schematic fallback - source preview unavailable`; it is not design evidence.

### 6. Component Token Specs

Extract at least one high-value component when the user did not specify one. For UI-heavy references this is usually the primary action component; for brand, editorial, marketing, or graphic-heavy references this may be a typographic lockup such as an editorial heading stack, hero title lockup, metric lockup, or quote lockup. Extract additional repeated shell/navigation, layout, graphic, or typographic components when they are central to the reference.

For each extracted component, create `design-system/components/<component-name>.md` from `design-system/COMPONENT_SPEC_TEMPLATE.md` and update `tokens/tokens-comp.css`. Use lowercase hyphen-case filenames, such as `primary-button.md` or `bottom-navigation.md`.

Use `references/component-spec-rules.md` for anatomy, variants, state coverage, typographic composition, accessibility, and token naming.

### 7. Composition, Interaction, And Anti-AI Rules

Fill or update:

- `design-system/PAGE_COMPOSITION_RULES.md`
- `design-system/INTERACTION_STATES.md`
- `design-system/ANTI_AI_STYLE_RULES.md`

Use `references/page-composition-rules.md` and `references/anti-ai-style-rules.md`.

The output must protect the observed product character. Do not add generic SaaS hero layouts, decorative gradients, glassmorphism, outline-card overuse, inflated whitespace, or unsupported illustration styles unless the references prove those patterns exist.

### 8. HTML Documentation

Generate developer-facing static HTML docs after design-system Markdown and token files are updated:

```sh
node <skill-root>/scripts/generate_docs_html.mjs <target-root> --locale <ui-locale>
node <skill-root>/scripts/generate_review_html.mjs <target-root>
```

Derive `<ui-locale>` from the recorded `Report Language`: Traditional or Simplified Chinese maps to `zh-Hant`, Japanese maps to `ja`, English and every other language map to `en`. The flag accepts only `zh-Hant`, `en`, and `ja`; when omitted the docs default to `zh-Hant`. Record the locale used in `SESSION_STATE.md` under `HTML docs UI locale`.

Default outputs:

```txt
docs/design-system/index.html
docs/design-system/review.html
```

The HTML shell supports `zh-Hant` (default), `en`, and `ja` UI locales with a sidebar language switcher; `--locale` sets which one is the page default. Markdown body content remains in the report language.

Use `references/html-documentation.md` when changing the HTML documentation behavior.

### 9. Audit And Checkpoint

Run strict source, token, and component audits after an extraction or component expansion:

```sh
node <skill-root>/scripts/audit_sources.mjs <target-root> --strict
node <skill-root>/scripts/audit_tokens.mjs <target-root> --strict
node <skill-root>/scripts/audit_components.mjs <target-root> --strict
```

Use non-strict mode only for an empty starter package or early setup check.

Update `design-system/SESSION_STATE.md` with:

- completed outputs
- report language in use
- key decisions
- open questions
- token layers changed
- generated HTML docs path
- HTML docs UI locale
- generated review queue path
- audit result
- source duplicate review result
- vibe project intake result when applicable
- rendered UI capture result when applicable
- native app intake and Native UI Capture Pass result when applicable
- late-arriving authoritative source recalibration result when applicable
- component similarity review result
- integration review result when collaborating across branches or PRs
- recommended next prompt

Then stop and ask the user what to do next. Suggested choices:

- review and refine the extraction
- expand component tokens
- review and integrate collaborator extraction branches
- generate Figma Variables or token export
- create/update cross-agent instructions
- build Storybook foundations and components with `design-system-to-storybook`
- start a separate product implementation workspace

## Post-Checkpoint Workflows

### Component Expansion Pass

Use this pass when the user chooses to expand component tokens after the initial extraction. Reuse the `Report Language` recorded in `SESSION_STATE.md`; do not ask again.

1. Pick one or more `planned` components from `design-system/COMPONENT_INVENTORY.md`.
2. Confirm the component has evidence in `design-system/DESIGN_EVIDENCE_MAP.md`.
3. Create or update `design-system/components/<component-name>.md` from `design-system/COMPONENT_SPEC_TEMPLATE.md`.
4. Add missing system tokens only when they are reusable product-wide semantics.
5. Add component tokens in `tokens/tokens-comp.css`; component tokens must reference system tokens only.
6. Update `COMPONENT_INVENTORY.md` status and missing states.
7. Update related interaction and page composition rules.
8. Regenerate `docs/design-system/index.html` and `docs/design-system/review.html`.
9. Run `node <skill-root>/scripts/audit_sources.mjs <target-root> --strict`, `node <skill-root>/scripts/audit_tokens.mjs <target-root> --strict`, and `node <skill-root>/scripts/audit_components.mjs <target-root> --strict`.
10. Update `SESSION_STATE.md`, then stop and ask for the next step.

### Late-Arriving Authoritative Source Pass

Use this pass whenever a higher-tier evidence source appears after lower-tier evidence already produced token or component decisions — most commonly, a production Figma file (with Variables) arriving after a token system was extracted from screenshots. The failure mode this pass prevents: the authoritative source gets demoted to "one more candidate", its authored values are absorbed into an already-closed measured token system, and design intent is silently discarded. Reuse the `Report Language` recorded in `SESSION_STATE.md`; do not ask again.

1. Do not merge the new source into the existing evidence flow yet. Register it in `DESIGN_EVIDENCE_MAP.md` with its evidence tier, then compare tiers: this pass applies when the new source outranks the tiers backing existing decisions.
2. Extract the new source's authored values (Figma Variables, styles, exact node properties) with `authored` provenance. Do not round or cluster them against existing tokens during extraction.
3. Build a **token recalibration table**: every existing token whose value the new source contradicts, matches approximately, or supersedes. For each row record the current value with its provenance, the authored value with its source, the delta, and a recommendation:
   - `merge`: the measured token was an imprecise observation of the authored value — collapse it into the authored value
   - `keep distinct`: both values are real and intentionally different
   - `re-authorize`: replace the token's value with the authored value and update dependent `sys`/`comp` mappings
4. Record the table in `design-system/TOKEN_ARCHITECTURE.md` under `Token Recalibration`, then stop and hand the full list to the developer for adjudication. Do not apply the recommendations unilaterally.
5. After adjudication, apply the decisions, re-run the strict audits, regenerate docs, and record the pass result in `SESSION_STATE.md`.
6. Repeat the same tier comparison for component evidence: components previously extracted from screenshots may need their specs re-verified against the authoritative source, using the existing component similarity review.

### Collaboration Review And Integration Pass

Use this pass when multiple contributors extracted separate Figma sources, components, or token candidates on separate branches or PRs. Read `references/collaboration-review.md` before acting. Reuse the integration target's `Report Language` recorded in `SESSION_STATE.md`; do not ask again.

1. Confirm the integration target branch and the contributor branches or PRs to review.
2. Inspect each branch or PR diff before merging. Identify touched sources, components, token layers, generated docs, and audit output.
3. Read `design-system/SESSION_STATE.md`, `design-system/INTEGRATION_REVIEW.md`, `DESIGN_EVIDENCE_MAP.md`, `TOKEN_ARCHITECTURE.md`, `COMPONENT_INVENTORY.md`, relevant `design-system/components/*.md`, and `tokens/*.css`.
4. Record every branch or PR in `design-system/INTEGRATION_REVIEW.md` with owner, scope, files touched, audit status, and reviewer decision.
5. Merge or rebase one contributor branch at a time into an integration branch. Resolve conflicts from source evidence, token inheritance, and component similarity decisions; do not keep both versions only to avoid choosing.
6. Treat `docs/design-system/index.html` and `docs/design-system/review.html` as generated outputs. Regenerate them after source Markdown and token conflicts are resolved.
7. If two branches create near token candidates or similar components, use the existing duplicate, near-token, and component-similarity review tables before finalizing the merge.
8. If a conflict requires a design decision that is not supported by evidence, mark the integration row `blocked`, record the question, and ask the developer.
9. Run strict source, token, and component audits after the final integrated source state.
10. Update `SESSION_STATE.md` and `INTEGRATION_REVIEW.md`, then stop with the integration decision summary.

## Gates

### Evidence Gate

If an important design rule has no source evidence, mark it Low confidence or ask the user before making it normative.

Do not count duplicate screenshots, duplicate Figma nodes, or duplicate rendered routes as independent evidence until the duplicate source decision is recorded. If a source fingerprint matches or appears very close to another source, ask the developer for a reuse/ignore/keep-distinct decision before it changes confidence.

### Token Gate

If a component needs a semantic or component token that does not exist, create or propose the token at the correct layer. Never use hardcoded fallback values in implementation guidance.

Do not silently merge or split close token values. When near duplicate colors or numbers are found, ask the developer for a merge/keep-distinct decision and document it — including each side's provenance — before the checkpoint. When either side is `authored`, default to keep distinct and never round the authored value away; `authored` vs `authored` pairs must never be auto-merged.

Do not silently replace an authored value with an accessibility-compliant substitute. Record it as an `a11y-remap` (authored value preserved as a `ref` token, accessible value mapped at the `sys` layer) per `references/token-architecture.md`.

### Authoritative Source Gate

When a source whose evidence tier outranks the evidence behind existing token or component decisions arrives after those decisions were made, do not fold it in as supplementary evidence. Run the Late-Arriving Authoritative Source Pass, produce the recalibration table, and get developer adjudication before changing or reaffirming the affected tokens.

### Component Gate

Before adding a new component spec, check `COMPONENT_INVENTORY.md` and existing component docs. Reuse or extend a known component when intent, anatomy, slots, and states match.

Do not create a new component only because the Figma layer name is new. If a candidate resembles an existing component, present the visual comparison and fingerprint difference, then ask for a merge/variant/keep-distinct/block decision.

### Implementation Boundary Gate

Do not generate product UI code, Storybook implementation code, or app routes inside this skill before the checkpoint unless the user explicitly requests product implementation.

After the checkpoint, use the separate `design-system-to-storybook` skill when the next step is to turn the extracted design-system package into Storybook foundations, shared components, and stories.

### Collaboration Gate

Do not integrate parallel branches by silently accepting duplicate components, duplicate source evidence, or near-identical token values. Record `merge`, `make variant`, `keep distinct`, `reuse existing source`, `ignore duplicate`, or `blocked` decisions in the appropriate review table before the checkpoint.

Do not hand-edit generated HTML docs to resolve merge conflicts. Resolve source Markdown and token files first, then regenerate docs.

## Cross-Agent Use

If the user wants to use the extraction package with Claude Code, Cursor, or Codex, read `references/agent-integration.md` and generate the appropriate instruction files from the extracted rules. Keep agent instructions short and point them back to the design-system docs and token audit.

## Resource Map

- `references/visual-analysis-rubric.md`: how to analyze images, Figma, native captures/previews, and rendered UI.
- `references/native-mobile-projects.md`: how to inspect iOS/Android app projects, native tokens/resources, previews, screenshot tests, and simulator/emulator captures.
- `references/token-architecture.md`: token naming and inheritance rules.
- `references/component-spec-rules.md`: component anatomy, state, accessibility, and token spec rules.
- `references/page-composition-rules.md`: layout, density, page shell, and composition rules.
- `references/anti-ai-style-rules.md`: constraints that prevent generic AI-looking UI.
- `references/agent-integration.md`: Claude Code, Cursor, and Codex handoff guidance.
- `references/collaboration-review.md`: branch/PR review and integration workflow for teams.
- `references/html-documentation.md`: static HTML documentation output rules.
- `assets/design-system-template/`: starter output package.
- `scripts/audit_sources.mjs`: source inventory and duplicate source review audit; pass `--strict` after real extraction work.
- `scripts/audit_tokens.mjs`: token layer audit; pass `--strict` after real extraction work.
- `scripts/audit_components.mjs`: component similarity review audit; pass `--strict` after inventory or component spec changes.
- `scripts/generate_docs_html.mjs`: generated developer-facing HTML docs, including `design-system/components/*.md`.
- `scripts/generate_review_html.mjs`: generated visual review queue for duplicate sources, near tokens, color scale issues, and similar components.
