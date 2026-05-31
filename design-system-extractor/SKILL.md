---
name: design-system-extractor
description: Extract a reusable design-system specification from UI screenshots/images, Figma URLs or exports, Figma Variables, existing app/project folders, or prototype code. Use when Codex must produce evidence-backed design principles, design elements, token architecture, component inventory, component token specs, anti-AI style constraints, static HTML documentation for developers, cross-agent handoff guidance for Claude Code/Cursor/Codex, and a checkpoint before any product implementation.
---

# Design System Extractor

Act as a Design System Architect. Extract a reusable design-system package from visual and code references. Do not implement product screens during this skill unless the user explicitly chooses that after the checkpoint.

## Supported Inputs

- **Images / screenshots:** use all provided screenshots as source of truth. Prefer concrete observed regions over general style impressions.
- **Figma URL / Figma exports:** use available Figma tools or exported screenshots/metadata. Treat selected nodes, variables, and component names as evidence, but still record where each decision came from.
- **Project / prototype folder:** inspect rendered UI, screenshots, tokens, CSS, Storybook, and components. Treat prototype code as reference-only unless the user asks to migrate code.
- **Mixed input:** rank evidence in this order unless user says otherwise: production Figma/component library, production screenshots, rendered project UI, prototype code, descriptive prompt.

## First Actions

1. Locate or create a design-system package root.
2. Resolve this skill's folder as `<skill-root>`. Use `<skill-root>/assets/...` and `<skill-root>/scripts/...` when copying templates or running bundled scripts.
3. If the package has no structure yet, copy `<skill-root>/assets/design-system-template/` into the target root.
4. Read existing `AGENTS.md`, `CLAUDE.md`, `.cursorrules`, `.cursor/rules/*`, and prior `design-system/SESSION_STATE.md` when present.
5. Inspect references before writing tokens. If a source project has screenshots and code, inspect both.

## Workflow

### 1. Input Discovery

Record source types, paths/URLs, confidence, and known gaps in `design-system/SESSION_STATE.md`.

For screenshots, list every image. For Figma, list node/page names or variable collections when available. For project folders, list token files, component directories, Storybook entries, and screenshot/render routes if available.

Before using sources as evidence, run a source duplicate review:

1. Create a source fingerprint for every input and record it in `design-system/DESIGN_EVIDENCE_MAP.md`.
2. For local screenshots or exports, prefer `sha256:<hash>` for exact matches and add `phash:<hash>` or a screenshot crop note when perceptual comparison is available.
3. For Figma inputs, normalize to `figma:<file-key>#<node-id>` when a node is known, or `figma:<file-key>#page:<page-name>` when only a page is known.
4. For rendered routes or project screenshots, include the route, viewport, state, and source file or command in the fingerprint.
5. If two sources are exact duplicates or likely duplicates, stop and ask the developer whether to `reuse existing source`, `ignore duplicate`, or `keep distinct`.
6. Record every decision in `design-system/DESIGN_EVIDENCE_MAP.md` under `Source Duplicate Review` before using duplicate inputs to support separate design decisions.

### 2. Evidence Map

Fill `design-system/DESIGN_EVIDENCE_MAP.md` before writing final design decisions.

Each important decision needs an evidence row with:

- source file, URL, node, or route
- observed region
- observed pattern
- resulting design decision
- affected tokens or components
- confidence: High, Medium, or Low

Use `references/visual-analysis-rubric.md` when evaluating screenshots or rendered UI.

### 3. Design Foundations

Fill `design-system/DESIGN_PRINCIPLES.md` and `design-system/DESIGN_ELEMENTS.md`.

Cover color proportions, typography, spacing, density, shape, elevation/depth, iconography, imagery, data display, and state language. Every principle must include evidence and an implementation rule.

### 4. Token Architecture

Fill `design-system/TOKEN_ARCHITECTURE.md` and token files under `tokens/`.

Default to strict `ref -> sys -> comp` inheritance when the project has no stronger convention:

- reference tokens store raw values only
- system tokens store shared semantic roles only
- component tokens store component slots only
- component tokens reference system tokens only

Use `references/token-architecture.md` before creating or changing token layers.

Before finalizing token files, run a token candidate review:

1. Collect raw color, spacing, radius, typography, opacity, shadow, and motion values from evidence.
2. Normalize reference colors into palette families with numeric steps where `100` is lightest and `0` is darkest.
3. Check each palette family so higher numbers are visually lighter than lower numbers.
4. Cluster very close reference colors and very close reference numbers in the same value family.
5. If close candidates appear, stop and ask the developer whether to `merge` or `keep distinct`.
6. Record every decision in `design-system/TOKEN_ARCHITECTURE.md` under `Near Token Decisions`, or add an adjacent `token-review:` CSS comment when the decision must stay next to the token.
7. Only then write final `ref`, `sys`, and `comp` tokens.

### 5. Component Inventory

Fill `design-system/COMPONENT_INVENTORY.md`.

Inventory repeated patterns from the references. Mark each component as `extracted`, `planned`, `blocked`, or `out-of-scope`. Include priority, observed sources, required token groups, missing states, and implementation notes.

Before finalizing inventory or adding a new component spec, run a component similarity review:

1. Read existing `COMPONENT_INVENTORY.md`, `design-system/components/*.md`, and relevant component tokens.
2. Create a component fingerprint for each new candidate: purpose, anatomy, variants/states, token contract, layout/density, behavior, source evidence, and visual reference.
3. Compare the candidate with existing extracted or planned components. Weight purpose and behavior first, then anatomy, states, token usage, and layout.
4. If a candidate is similar to an existing component, stop and ask the developer whether to `merge`, `make variant`, `keep distinct`, or `block pending more evidence`.
5. Record the decision in `COMPONENT_INVENTORY.md` under `Component Similarity Review` before creating or updating component specs.
6. Use source-based visual references: for Figma, capture the actual node preview/screenshot or a crop of the design frame; for screenshot inputs, crop the relevant component region. Store review images under `design-system/assets/component-review/` and link them from the similarity table.
7. Do not use an AI-drawn schematic as the review image when a Figma preview or screenshot crop is available. A schematic SVG is allowed only as a last-resort fallback when source previews cannot be captured, and it must be labeled `schematic fallback - source preview unavailable`; it is not design evidence.

### 6. Component Token Specs

Extract at least one high-value component when the user did not specify one, usually the primary action component. Extract additional repeated shell/navigation components when they are central to the reference.

For each extracted component, create `design-system/components/<component-name>.md` from `design-system/COMPONENT_SPEC_TEMPLATE.md` and update `tokens/tokens-comp.css`. Use lowercase hyphen-case filenames, such as `primary-button.md` or `bottom-navigation.md`.

Use `references/component-spec-rules.md` for anatomy, variants, state coverage, accessibility, and token naming.

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
node <skill-root>/scripts/generate_docs_html.mjs <target-root>
node <skill-root>/scripts/generate_review_html.mjs <target-root>
```

Default outputs:

```txt
docs/design-system/index.html
docs/design-system/review.html
```

The HTML shell supports `zh-Hant` (default), `en`, and `ja` UI locales with a sidebar language switcher. Markdown body content remains in the extraction language.

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
- key decisions
- open questions
- token layers changed
- generated HTML docs path
- generated review queue path
- audit result
- source duplicate review result
- component similarity review result
- recommended next prompt

Then stop and ask the user what to do next. Suggested choices:

- review and refine the extraction
- expand component tokens
- generate Figma Variables or token export
- create/update cross-agent instructions
- start a separate product implementation workspace

## Post-Checkpoint Workflows

### Component Expansion Pass

Use this pass when the user chooses to expand component tokens after the initial extraction.

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

## Gates

### Evidence Gate

If an important design rule has no source evidence, mark it Low confidence or ask the user before making it normative.

Do not count duplicate screenshots, duplicate Figma nodes, or duplicate rendered routes as independent evidence until the duplicate source decision is recorded. If a source fingerprint matches or appears very close to another source, ask the developer for a reuse/ignore/keep-distinct decision before it changes confidence.

### Token Gate

If a component needs a semantic or component token that does not exist, create or propose the token at the correct layer. Never use hardcoded fallback values in implementation guidance.

Do not silently merge or split close token values. When near duplicate colors or numbers are found, ask the developer for a merge/keep-distinct decision and document it before the checkpoint.

### Component Gate

Before adding a new component spec, check `COMPONENT_INVENTORY.md` and existing component docs. Reuse or extend a known component when intent, anatomy, slots, and states match.

Do not create a new component only because the Figma layer name is new. If a candidate resembles an existing component, present the visual comparison and fingerprint difference, then ask for a merge/variant/keep-distinct/block decision.

### Implementation Boundary Gate

Do not generate product UI code, Storybook implementation code, or app routes inside this skill before the checkpoint unless the user explicitly requests product implementation.

## Cross-Agent Use

If the user wants to use the extraction package with Claude Code, Cursor, or Codex, read `references/agent-integration.md` and generate the appropriate instruction files from the extracted rules. Keep agent instructions short and point them back to the design-system docs and token audit.

## Resource Map

- `references/visual-analysis-rubric.md`: how to analyze images, Figma, and rendered UI.
- `references/token-architecture.md`: token naming and inheritance rules.
- `references/component-spec-rules.md`: component anatomy, state, accessibility, and token spec rules.
- `references/page-composition-rules.md`: layout, density, page shell, and composition rules.
- `references/anti-ai-style-rules.md`: constraints that prevent generic AI-looking UI.
- `references/agent-integration.md`: Claude Code, Cursor, and Codex handoff guidance.
- `references/html-documentation.md`: static HTML documentation output rules.
- `assets/design-system-template/`: starter output package.
- `scripts/audit_sources.mjs`: source inventory and duplicate source review audit; pass `--strict` after real extraction work.
- `scripts/audit_tokens.mjs`: token layer audit; pass `--strict` after real extraction work.
- `scripts/audit_components.mjs`: component similarity review audit; pass `--strict` after inventory or component spec changes.
- `scripts/generate_docs_html.mjs`: generated developer-facing HTML docs, including `design-system/components/*.md`.
- `scripts/generate_review_html.mjs`: generated visual review queue for duplicate sources, near tokens, color scale issues, and similar components.
