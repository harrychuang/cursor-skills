---
name: design-system-to-storybook
description: >-
  Build or update token-backed Storybook foundations, shared UI components, and
  stories from an extracted design-system package. Use after
  design-system-extractor, or when Codex must read design-system Markdown and
  token files, map component specs into a product repo, create or update
  Storybook docs, plan large component batches, and verify implementation
  with the Figma export addon without bypassing tokens.
---

# Design System to Storybook

Use this skill to turn an already extracted design-system package into a product repo's Storybook implementation. The source of truth is the design-system documentation and tokens, not screenshots or fresh Figma analysis.

This is a downstream implementation skill. Do not re-extract a design system here. If the required design-system docs, token architecture, or component specs are missing, ask to run or continue `design-system-extractor` first.

## Operating Principle

Work in short, resumable passes. Each pass must start from the extracted design-system docs, implement only the selected scope, verify it, update the implementation map or queue, then stop with the next recommended pass. Do not keep expanding scope because more components are visible.

The default pass budget is:

- foundations only, or
- 3-5 simple components, or
- 1-2 complex composite components, or
- one blocker-resolution pass that updates maps/queues without component code

If the user asks for "all components" or a full library, create the queue and complete the first bounded batch only unless they explicitly request continuous multi-batch execution.

## Expected Inputs

- **Design-system package:** usually contains `design-system/`, `tokens/`, and generated docs under `docs/design-system/`.
- **Product repo:** the codebase where Storybook, shared UI components, and token imports should be created or updated.
- **Implementation scope:** specific components, all extracted components, foundations only, or a product-owned component library.
- **Runtime constraints:** framework, package manager, styling system, existing Storybook setup, and test commands.
- **Batch budget:** optional number of components to implement in the current pass.
- **Figma export:** enabled by default for compatible React Storybook 10 projects.

## First Actions

1. Locate the design-system package root and the product repo root. They may be the same folder.
2. Read `design-system/SESSION_STATE.md`, `DESIGN_EVIDENCE_MAP.md`, `TOKEN_ARCHITECTURE.md`, `COMPONENT_INVENTORY.md`, `DESIGN_ELEMENTS.md`, and only the relevant `design-system/components/*.md` for the selected pass.
3. Inspect product conventions before editing: component folders, story format, token files, theme providers, Storybook config, build scripts, lint/typecheck scripts, and package manager.
4. Record an implementation map before code changes. Prefer `design-system/STORYBOOK_IMPLEMENTATION_MAP.md` when the design-system package lives in the product repo; otherwise use `docs/design-system/storybook-implementation.md`. Use `assets/storybook-implementation-map-template.md` when starting a new map.
5. Resolve source traces for the selected tokens/components before editing code. Use component `Evidence`, `Source Trace`, `DESIGN_EVIDENCE_MAP.md`, and `COMPONENT_INVENTORY.md` to find the original design node, screenshot crop, rendered route, or prototype/source files when recorded.
6. Install and configure the Figma export addon when the product has a compatible React Storybook 10 setup.
7. If the component inventory has more than 8 implementable items, create or update a component queue before reading every spec or editing code.
8. If the product has explicit design-system governance instructions, follow them. Otherwise apply the gates in this skill.

## Scope Modes

Choose the smallest mode that satisfies the user request:

- **Foundations:** import or mirror tokens and add Storybook docs for color, typography, spacing, radius, elevation, and motion.
- **Component pass:** implement selected `extracted` or `planned` component specs as shared components with stories.
- **Library pass:** build or update a reusable component package from the full component inventory.
- **Batch pass:** implement one dependency-aligned group from a large component queue.
- **Adoption pass:** replace ad hoc product UI with documented shared components after the Storybook catalog exists.

Do not compose product screens before the required shared components and stories exist unless the user explicitly asks for a product route first.

## Workflow

### 1. Package Readiness

Confirm the extracted package is usable:

| Required file | Purpose |
|---|---|
| `design-system/TOKEN_ARCHITECTURE.md` | token layers and naming rules |
| `tokens/tokens-ref.css` | raw reference values |
| `tokens/tokens-sys.css` | reusable semantic roles |
| `tokens/tokens-comp.css` | component-facing slots |
| `design-system/COMPONENT_INVENTORY.md` | component priority and status |
| `design-system/components/*.md` | anatomy, variants, states, accessibility, and token contracts |

If a required file is absent, continue only for the modes that still have enough evidence. For example, foundations can proceed without component specs, but component implementation cannot.

### 2. Doc-Driven Pass Selection

Before product discovery or code edits, choose the pass from the design-system docs:

1. Read `SESSION_STATE.md` for extraction status, open questions, and the recommended next prompt.
2. Read `COMPONENT_INVENTORY.md` for priority, status, required tokens, missing states, and blocked items.
3. Read `TOKEN_ARCHITECTURE.md` and the touched token files only for the selected foundations or components.
4. Read the component specs only for the selected pass and their direct dependencies.
5. Record the chosen pass, scope budget, and stop condition in the implementation map or queue.

If the docs disagree, prefer this order: component spec, token files, token architecture, component inventory, session notes. If a conflict changes implementation behavior, mark the item `blocked` and update the map instead of guessing.

### 3. Source Trace Resolution

For each selected component, resolve the source chain before implementation:

```txt
component inventory row
  -> design-system/components/<component>.md
  -> Evidence IDs and Source Trace rows
  -> DESIGN_EVIDENCE_MAP.md Source Inventory
  -> Figma node / screenshot crop / rendered route / prototype files
  -> existing product components and stories
  -> Storybook implementation target
```

Use recorded sources as reference context, not as a reason to re-extract the design system. When the source trace points to:

- **Figma node or URL:** use it only to inspect the exact referenced component or confirm visual details already documented in the component spec.
- **Screenshot crop or export:** use it to verify anatomy, spacing, and state appearance against the spec.
- **Rendered route:** use it to find the owning product files, CSS selectors, and interaction behavior.
- **Prototype or source files:** inspect them as migration/reference candidates, but still implement against the extracted component spec and token contract.

If no source trace exists for a component, do not search the whole source universe indefinitely. Search the design-system docs and product repo once, record `source-trace-missing` in the implementation map or queue, and either proceed from a complete component spec or mark the item `needs-extraction`.

### 4. Product Discovery

Find the local implementation pattern before adding files:

- Storybook config: `.storybook/`, `*.stories.*`, `*.mdx`, docs pages, decorators, preview styles.
- Components: `src/components/`, `components/`, `src/ui/`, `src/design-system/`, `packages/ui/`, or existing exports.
- Tokens and themes: CSS variables, token CSS imports, Tailwind config, theme objects, Sass variables, style dictionaries, or package-level token builds.
- Accessibility and tests: existing interaction tests, visual tests, a11y addons, Playwright, Vitest, Jest, Testing Library.
- i18n: locale files or message catalogs when stories or components need visible text.

Do not install Storybook or unrelated dependencies unless the user asked for Storybook setup or approves it after discovery. The Figma export addon in the next section is the default dependency exception for compatible projects.

### 5. Figma Export Addon

Install and configure the vendored `@harrychuang/storybook-addon-figma-export` package by default when all requirements are met:

- Storybook exists and is `^10`
- React is available in the host project
- package manager is detectable
- `.storybook/main.*` and `.storybook/preview.*` can be updated safely

Resolve this skill's folder as `<skill-root>`, then use the vendored addon at:

```txt
<skill-root>/assets/figma-export-addon
```

Before installing, confirm the vendored package has `package.json`, `dist/preview.js`, `dist/manager.js`, and `dist/preset.js`. If any of those files are missing, mark `figma-export-addon` as `blocked` in the implementation map and do not fall back to the GitHub install unless the user explicitly asks for a refresh.

Install the addon from the local folder:

```sh
npm install -D "file:<skill-root>/assets/figma-export-addon" @storybook/icons
```

Use the equivalent package-manager command:

```sh
pnpm add -D "file:<skill-root>/assets/figma-export-addon" @storybook/icons
yarn add -D "file:<skill-root>/assets/figma-export-addon" @storybook/icons
bun add -d "file:<skill-root>/assets/figma-export-addon" @storybook/icons
```

If Storybook is missing, not version 10, or the project is not React-based, do not force the addon. Mark `figma-export-addon` as `blocked` in the implementation map with the reason and ask before installing or upgrading Storybook.

Configuration rules:

1. Add `"@harrychuang/storybook-addon-figma-export"` to `.storybook/main.*` `addons`, preserving existing addons.
2. In `.storybook/preview.*`, import:
   - `createFigmaExportDecorator`
   - `createFigmaExportGlobalTypes`
   - `createFigmaExportInitialGlobals`
   - `FigmaExportAddonOptions`
   - `@harrychuang/storybook-addon-figma-export/styles.css`
3. Merge the decorator, `globalTypes`, and `initialGlobals` into the existing preview export. Do not overwrite existing decorators or globals.
4. Infer `figmaExportOptions` from the extracted token architecture and Storybook titles:
   - set `tokenPrefix` only when the CSS token prefix is explicit or auto-detection would be ambiguous
   - keep `tokenLayers` aligned to `ref`, `sys`, and `comp` unless the extraction uses different segment names
   - set `storyTitlePrefix` to the project's component story namespace, usually `"Components/"`
   - set `componentClassPrefixes` from component CSS class prefixes when available
   - set `sourceReferences` from the selected component's `Source Trace`, `DESIGN_EVIDENCE_MAP.md`, or Storybook `parameters.figmaExport.sourceReferences` when a Figma URL, screenshot URL, source URL, or other reference is known
   - keep the default review statuses unless the product needs custom labels: `not-reviewed`, `exported`, `need-fix`, `approved`
5. The addon renders the export panel in the bottom-right corner and a source review panel in the top-right corner. The source review panel includes `Open source`, `Edit source`, and per-story export review status stored in `localStorage`.
6. Record the installed package, local addon path, vendored commit when available, config files, and options in the implementation map.

### 6. Implementation Map

Before editing code, create or update the implementation map. Use `assets/storybook-implementation-map-template.md` when starting a new map.

The map must include:

| Design-system item | Source doc | Evidence IDs | Source trace | Product target | Story target | Decision | Status |
|---|---|---|---|---|---|---|---|
| token layer or component | extracted doc/token path | evidence row IDs | Figma/screenshot/route/source files or `source-trace-missing` | target token/component path | target story path | reuse, extend, create, defer | planned, done, blocked |

Also record:

- package manager and framework
- Storybook version or catalog alternative
- Figma export addon status and options
- token import strategy
- components reused from the product repo
- current batch, when using a queue
- pass budget and stop condition
- source trace gaps
- open questions and blocked specs

### 7. Large Inventory Planning

Use this section when `COMPONENT_INVENTORY.md` contains more than 8 components, or when the user asks to build a full library.

Create or update `design-system/STORYBOOK_COMPONENT_QUEUE.md` when the design-system package lives in the product repo. Otherwise create `docs/design-system/storybook-component-queue.md`. Use `assets/storybook-component-queue-template.md` as the output shape when starting a new queue.

Plan before implementation:

1. Categorize components as foundations, primitives, form controls, navigation, data display, feedback, overlays, layout, composites, or product-specific patterns.
2. Build a dependency order: tokens first, primitives before composites, lower-level slots before containers, common variants before rare variants.
3. Rank by reuse, source confidence, implementation risk, token readiness, and whether an existing product component can be extended.
4. Mark blocked items explicitly: `needs-extraction`, `needs-token`, `needs-api-decision`, `needs-existing-component-review`, or `out-of-scope`.
5. Pick the next batch from adjacent dependencies. Default to 3-5 simple components, 1-2 complex composites, or one cross-cutting foundation pass.
6. Read only the selected batch specs and their direct dependencies. Do not load every component spec into context unless generating or repairing the queue.
7. Finish token integration, source trace resolution, component code, stories, and verification for the current batch before starting the next batch.
8. Stop after the batch closeout unless the user explicitly asks to continue into the next queued batch.

Each batch should produce a clean resumable state:

| Batch | Components | Source trace status | Dependencies | Target files | Validation | Stop condition | Status |
|---|---|---|---|---|---|---|---|
| `B01` | component names | resolved/missing/blocked | tokens/components needed first | planned product files | checks to run | update queue and stop | queued/done/blocked |

### 8. Token Integration

Integrate tokens before components:

1. Reuse the product repo's existing token pipeline when present.
2. Preserve the extracted layer model unless the repo already has a stronger convention.
3. Keep inheritance intact: component tokens reference semantic tokens; semantic tokens reference primitive/reference tokens.
4. Avoid hardcoded visual values in components and stories when tokens exist.
5. Add Storybook foundation docs or MDX only after token imports render correctly.

If the product repo has no token system, ask whether to establish one before implementing components.

### 9. Storybook Foundations

Create or update foundations stories/docs for the token groups touched by this pass:

- colors: reference palettes, semantic roles, foreground/background pairings
- typography: font family, size, line-height, weight, display/body roles
- spacing and layout density
- radius and shape
- elevation, borders, opacity
- motion duration, easing, and reduced-motion behavior when specified

Use the project's existing docs style. If none exists, create the smallest useful Storybook docs page that displays token names, rendered examples, and usage notes.

### 10. Component Implementation

For each selected component spec:

1. Read the component spec and its referenced tokens.
2. Resolve the component's evidence and source trace from the design-system docs.
3. Search for an existing shared component with matching purpose, anatomy, behavior, and states.
4. Prefer reuse or extension over creating a new component.
5. Implement props, slots, variants, states, accessibility behavior, and responsive behavior from the spec.
6. Keep component styles token-backed. Do not reach directly into reference tokens from component CSS unless the extracted architecture explicitly allows it.
7. Export the component through the repo's existing public API.

If the extracted spec lacks a necessary state, mark it blocked or implement only the documented states. Do not invent undocumented visual variants as normative design-system behavior.

For a batch pass, keep implementation scoped to the selected batch. If a new primitive or API decision would change later batches, update the queue and implementation map before continuing.

### 11. Story Coverage

Every new or changed shared component needs Storybook coverage:

- default appearance
- documented variants and sizes
- hover, focus-visible, active/pressed, disabled when interactive
- loading, empty, error, selected, expanded, or validation states when the spec defines them
- responsive or density stories when layout changes by viewport
- theme stories when the product supports multiple themes

Prefer existing story conventions. Use Autodocs or MDX only when the repo already uses them or the user asks for docs pages.

### 12. Verification

Run the cheapest reliable checks available:

- Storybook build or relevant story preview
- Figma export addon config check when installed
- lint and typecheck
- unit or interaction tests for changed components
- visual screenshot checks for high-risk components
- token audit or CSS variable scan when available

If Storybook is runnable, open the relevant stories and inspect rendered states before calling the pass done. When the Figma export addon is installed, confirm the Storybook toolbar loads without console errors and the export overlay can be enabled for at least one component story.

For large inventories, verify per batch and keep the full-library check for milestone boundaries. Do not wait until dozens of components are complete before running Storybook build or typecheck if those checks are available.

### 13. Batch Checkpoint And Closeout

Update the implementation map and component queue with completed files, blocked items, token decisions, and verification results.

At the end of every pass:

1. Re-read the selected component specs and token contracts.
2. Confirm every implemented visual value is token-backed or explicitly documented as non-visual behavior.
3. Confirm stories cover the documented variants and states.
4. Run available verification for the current pass.
5. Update the implementation map and queue.
6. Stop after reporting the completed pass and the next queued pass.

Report:

- design-system package path used
- product files changed
- tokens reused or added
- Figma export addon installed/configured or blocked reason
- components reused, extended, or created
- stories added or updated
- batch completed and next queued batch, when applicable
- checks run and any failures
- next recommended component pass, if the inventory is not complete

## Gates

### Extraction Package Gate

Do not treat guesses, screenshots, or ad hoc visual impressions as source of truth in this skill. If a component or token is not documented in the extracted package, either defer it or ask to expand the extraction first.

### Source Trace Gate

Do not implement a component from a broad search alone. Resolve the component through `design-system/components/*.md`, `DESIGN_EVIDENCE_MAP.md`, and `COMPONENT_INVENTORY.md` first. If the original design or source code cannot be located from the docs, record the missing trace and continue only when the component spec is otherwise complete enough to implement.

### Token Gate

Do not hardcode colors, spacing, radii, typography, shadows, or motion values in shared components when equivalent tokens exist. If a required token is missing, ask whether to add it at the correct layer before continuing.

### Component Gate

Do not create a new shared component before checking the product's existing components and stories. If a candidate is close to an existing component, extend the existing one or ask whether to make it a variant.

### Batch Gate

Do not attempt to implement a large inventory in one pass. When there are more than 8 implementable components, create or update the component queue, choose a bounded batch, and leave the remaining work queued.

### Context Budget Gate

Do not read every component spec or keep implementing across multiple batches just because the environment allows it. Keep each pass bounded, update durable files, and stop at the checkpoint so the next run can resume from the queue and implementation map.

### Figma Export Addon Gate

Do not silently skip addon setup for compatible React Storybook 10 projects. Install and configure it before component implementation unless the user opts out. If the project is incompatible, record the reason and continue with Storybook implementation only after the blocked addon status is explicit.

### Story Gate

Do not mark a shared component implementation complete without a story, example, or documented catalog entry covering its main states.

### Adoption Gate

Do not rewrite product screens to use the new library until the relevant shared components are implemented and documented, unless the user explicitly requests route adoption as the current pass.

## Resource Map

- `README.md`: human-facing overview, setup, prompts, cross-agent installation, and maintenance notes.
- `agents/claude.md`: Claude Code `CLAUDE.md` handoff template and `.claude/skills/` usage guidance.
- `agents/codex-agents.md`: Codex `AGENTS.md` handoff template.
- `agents/cursor-rule.mdc`: Cursor `.cursor/rules/` project rule template.
- `assets/storybook-component-queue-template.md`: queue template for large component inventories.
- `assets/storybook-implementation-map-template.md`: implementation map template for doc-driven passes, source trace records, verification logs, and checkpoint handoff.
- `assets/figma-export-addon/`: vendored `@harrychuang/storybook-addon-figma-export` package installed by this skill via local `file:` dependency.
- `assets/figma-export-addon/VENDORED_COMMIT.txt`: upstream commit used for the vendored addon copy.
- Upstream Figma export addon source: `https://github.com/harrychuang/storybook-addons/tree/main/packages/figma-export`.
