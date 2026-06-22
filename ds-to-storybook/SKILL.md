---
name: design-system-to-storybook
description: >-
  Build or update token-backed Storybook foundations, shared UI components, and
  stories from an extracted design-system package. Use after
  design-system-extractor, or when Codex must read design-system Markdown and
  token files, automatically trace original design sources such as Figma
  URLs/nodes, UI images, rendered routes, and frontend folders, infer component
  dependency order so core primitives are built before composed components, map
  component specs into a product repo, create or update Storybook docs, plan
  component batches, structure stories and DOM for reliable Figma export, and
  verify implementation with the bundled Figma export addon without bypassing
  tokens.
---

# Design System to Storybook

Use this skill to turn an already extracted design-system package into a product repo's Storybook implementation. The design-system documentation and tokens are the normative source of truth. Original Figma nodes, UI images, rendered routes, and frontend folders recorded by `design-system-extractor` are supporting evidence for implementation details, Storybook parity, visual verification, and Figma export fidelity.

This is a downstream implementation skill. Do not re-extract a design system here. If the required design-system docs, token architecture, source evidence, or component specs are missing, ask to run or continue `design-system-extractor` first.

## Operating Principle

Work in short, resumable passes. Each pass must start from the extracted design-system docs, source trace, and dependency plan; implement only the selected scope; verify it; update the implementation map and queue; then stop with the next recommended pass. Do not keep expanding scope because more components are visible.

Treat Storybook as the authored source for Figma design output, not only as a developer catalog. When creating or changing a component, page, or story, prioritize a token-backed, stable, semantic DOM structure that the bundled Figma export addon can turn into cleanly named Figma frames, text nodes, graphics, and variable bindings.

The default pass budget is:

- foundations only, or
- 3-5 simple components, or
- 1-2 complex composite components, or
- one blocker-resolution pass that updates maps/queues without component code

If the user asks for "all components" or a full library, create the trace, dependency plan, and queue, then complete the first bounded batch only unless they explicitly request continuous multi-batch execution.

## Expected Inputs

- **Design-system package:** usually contains `design-system/`, `tokens/`, and generated docs under `docs/design-system/`.
- **Product repo:** the codebase where Storybook, shared UI components, and token imports should be created or updated.
- **Implementation scope:** specific components, all extracted components, foundations only, or a product-owned component library.
- **Runtime constraints:** framework, package manager, styling system, existing Storybook setup, and test commands.
- **Batch budget:** optional number of components to implement in the current pass.
- **Extractor source evidence:** `DESIGN_EVIDENCE_MAP.md`, `SESSION_STATE.md`, component spec `Evidence` tables, component-review image links, and any Figma URLs/nodes, UI screenshots, rendered routes, or frontend folders listed there.
- **Typographic component specs:** reusable text-composition specs from graphic design references, usually named `typographic-*`, including slot hierarchy, wrapping, alignment, content semantics, and component typography tokens.
- **Bundled Figma export addon:** enabled by default for compatible React Storybook 10 projects.
- **Figma export contract:** project-local addon config, stable component class prefixes, root/variant data attributes, source URL parameters, and known absolute-fidelity exceptions.

## First Actions

1. Locate the design-system package root and the product repo root. They may be the same folder.
2. Read `design-system/SESSION_STATE.md`, `DESIGN_EVIDENCE_MAP.md`, `TOKEN_ARCHITECTURE.md`, `COMPONENT_INVENTORY.md`, `DESIGN_ELEMENTS.md`, and relevant `design-system/components/*.md`.
3. Run the source trace script to resolve extractor sources before implementation: `node <skill-root>/scripts/trace_sources.mjs <design-system-package-root> --write`.
4. Run the component planner before choosing implementation order and queue rows: `node <skill-root>/scripts/plan_component_batches.mjs <design-system-package-root> --write --queue`.
5. Inspect referenced design sources for the selected scope: use Figma MCP for Figma nodes, inspect local UI images/crops, and inspect referenced frontend folders/routes when present.
6. Inspect product conventions before editing: component folders, page folders, story format, token files, theme providers, Storybook config, build scripts, lint/typecheck scripts, and package manager.
7. Run product discovery: `node <skill-root>/scripts/inspect_storybook_project.mjs <product-repo-root> --json`.
8. Record an implementation map before code changes. Prefer `design-system/STORYBOOK_IMPLEMENTATION_MAP.md` when the design-system package lives in the product repo; otherwise use `docs/design-system/storybook-implementation.md`. Use `assets/storybook-implementation-map-template.md` when starting a new map.
9. Install the bundled Figma export addon, generate project-local addon config, configure Storybook, and validate wiring when the product has a compatible React Storybook 10 setup.
10. Decide the Figma export structure for the selected scope before component code: root element, stable class prefix, `data-component`, variant/state markers, token CSS variables, source URL parameters, and any absolute-fidelity exceptions.
11. If implementing more than one component, create or update a component queue before reading every spec or editing code.
12. If the product has explicit design-system governance instructions, follow them. Otherwise apply the gates in this skill.

## Scope Modes

Choose the smallest mode that satisfies the user request:

- **Foundations:** import or mirror tokens and add Storybook docs for color, typography, spacing, radius, elevation, and motion.
- **Component pass:** implement selected `extracted` or `planned` component specs as shared components with stories.
- **Typographic component pass:** implement reusable text-composition specs such as hero lockups, section headings, metric pairs, price stacks, caption overlays, or pull quotes as token-backed shared components with focused stories.
- **Library pass:** build or update a reusable component package from the full component inventory.
- **Batch pass:** implement one dependency-aligned group from a large component queue.
- **Adoption pass:** replace ad hoc product UI with documented shared components after the Storybook catalog exists.

Do not compose product screens before the required shared components and stories exist unless the user explicitly asks for a product route first.

## Agent Installation

If the user asks to install or share this skill with Claude Code, Codex, or Cursor, read `references/agent-installation.md` and use `scripts/install_agent_skill.mjs`. Install the full skill directory so `SKILL.md`, scripts, references, and the bundled Storybook addon asset remain together.

## Workflow

### 1. Package Readiness

Confirm the extracted package is usable:

| Required file | Purpose |
|---|---|
| `design-system/SESSION_STATE.md` | extraction status, known gaps, and recommended next step |
| `design-system/DESIGN_EVIDENCE_MAP.md` | source inventory, source fingerprints, and evidence IDs |
| `design-system/TOKEN_ARCHITECTURE.md` | token layers and naming rules |
| `tokens/tokens-ref.css` | raw reference values |
| `tokens/tokens-sys.css` | reusable semantic roles |
| `tokens/tokens-comp.css` | component-facing slots |
| `design-system/COMPONENT_INVENTORY.md` | component priority and status |
| `design-system/components/*.md` | anatomy, variants, states, accessibility, and token contracts |

If a required file is absent, continue only for the modes that still have enough evidence. For example, foundations can proceed without component specs, but component implementation cannot.

### 2. Source Trace And Design Source Discovery

Build a source trace before editing code:

```sh
node <skill-root>/scripts/trace_sources.mjs <design-system-package-root> --write
```

Default output is `design-system/STORYBOOK_SOURCE_TRACE.md`. Use it to connect component specs to original sources:

- **Figma URL or normalized node:** use Figma MCP to inspect the referenced node. Prefer `get_design_context` for component-level nodes, `get_metadata` for pages/structure, `get_variable_defs` for token variables, and `get_screenshot` for visual parity references. If only a page is known, use metadata to find the most relevant frame/component before implementing.
- **UI image or screenshot crop:** resolve the local path, inspect the actual bitmap, and use it as the visual reference for Storybook screenshot checks. Do not rely on alt text or filename alone.
- **Frontend folder or prototype source:** inspect the referenced code, Storybook entries, token files, rendered routes, and component API. Treat prototype code as migration evidence only when the user asks to migrate it; otherwise use it to understand behavior and states.
- **Rendered route:** run or inspect the route only if the product setup makes that cheap and safe. Record viewport, state, and command in the implementation map when used for verification.

Use the `Story Source URL Parameters` section from `STORYBOOK_SOURCE_TRACE.md` when creating or updating stories. Run `node <skill-root>/scripts/sync_story_source_parameters.mjs <design-system-package-root> --product-root <product-repo-root> --write` after story files exist; it writes Figma URLs to `parameters.figmaSourceUrl` and other web URLs to `parameters.design.url` when it can patch safely. Do not invent a URL from a local image path or normalized Figma fingerprint unless the docs also provide the matching file URL.

If the trace finds source IDs in component specs that cannot be resolved, mark the affected component `blocked` or `needs-extraction` in the queue before writing component code. If the trace finds Figma or image evidence for a component, do not skip that source unless the source is unavailable; record the reason.

Use original sources to clarify implementation details, not to silently override extracted design decisions. When Figma/image/frontend evidence contradicts the extracted tokens or component spec, stop and update the implementation map with the conflict; ask whether to revise the extraction or implement the documented spec.

### 3. Component Dependency Planning

Build a dependency plan before selecting components or batches:

```sh
node <skill-root>/scripts/plan_component_batches.mjs <design-system-package-root> --write --queue
```

Default outputs are `design-system/STORYBOOK_COMPONENT_PLAN.md` and `design-system/STORYBOOK_COMPONENT_QUEUE.md`. Use them to decide which component should be built next. The planner reads `COMPONENT_INVENTORY.md`, component specs, and `STORYBOOK_SOURCE_TRACE.md`, then infers:

- component category/tier: foundation, primitive, form-control, layout, navigation, data-display, feedback, overlay, composite, product-pattern, or unknown
- typographic components: treat `typographic-*`, text lockups, headings, captions, metric pairs, price stacks, and pull quotes as primitive or low-level composition dependencies unless their spec explicitly marks them as page-only product patterns
- dependencies from explicit dependency/composition/anatomy/slot sections
- dependencies from component-name composition such as `IconButton` depending on `Button`
- dependency phrases from component spec mentions, such as `uses`, `contains`, `renders`, `wraps`, or `depends on`
- dependents, so heavily reused primitives are prioritized before the components that consume them
- story source URLs from the source trace, so queue rows inherit the right source URL

Use the recommended order unless product discovery proves that a dependency already exists and can be reused. Do not build a composite component before its listed dependencies are implemented, reused, or explicitly marked blocked with a reason. If the planner reports a cycle, pick the lowest-level reusable primitive in that cycle first, record the cycle in the implementation map, and update the queue after the first component breaks the cycle.

For any multi-component pass, create or update the queue from `STORYBOOK_COMPONENT_PLAN.md`. The next component should come from the earliest unfinished row in the recommended build order whose dependencies are done, reused, or blocked with an accepted decision.

Re-run the planner with `--queue` after dependency decisions change. It preserves existing queue statuses, product targets, story targets, and decisions while refreshing order, batch, dependency, and source URL data.

### 4. Product Discovery

Find the local implementation pattern before adding files:

- Storybook config: `.storybook/`, `*.stories.*`, `*.mdx`, docs pages, decorators, preview styles.
- Components: `src/components/`, `components/`, `src/ui/`, `src/design-system/`, `packages/ui/`, or existing exports.
- Pages and composed screens: `src/pages/`, `pages/`, `src/screens/`, route modules, or existing composed view folders.
- Tokens and themes: CSS variables, token CSS imports, Tailwind config, theme objects, Sass variables, style dictionaries, or package-level token builds.
- Accessibility and tests: existing interaction tests, visual tests, a11y addons, Playwright, Vitest, Jest, Testing Library.
- i18n: locale files or message catalogs when stories or components need visible text.

Do not install Storybook or unrelated dependencies unless the user asked for Storybook setup or approves it after discovery. The bundled Figma export addon in the next section is the default dependency exception for compatible projects.

Use the bundled inspector to make discovery repeatable:

```sh
node <skill-root>/scripts/inspect_storybook_project.mjs <product-repo-root> --json
```

Record the package manager, framework, Storybook major version, builder, story roots, component roots, token files, and addon readiness in the implementation map. If the inspector reports that addon setup is not ready, keep implementation moving without forcing Storybook installation or upgrades.

### 5. Target File Layout

Use folder co-location for new implementation files. Do not create a separate root `stories/` folder for component stories.

- Shared components live in the product's component root, normally `src/components/<ComponentName>/`.
- Each component folder contains the component source, styles, and story together: `<ComponentName>.tsx`, `<ComponentName>.css`, and `<ComponentName>.stories.tsx`. Add `index.ts`, tests, or helpers only when the product convention calls for them.
- Component stories must be co-located with their component. Avoid `stories/<ComponentName>.stories.*`, `src/stories/<ComponentName>.stories.*`, or other detached component-story targets for new files.
- Foundation guides/docs may live in the Storybook docs area, normally `stories/` or `src/stories/`, because they document tokens rather than a single component implementation.
- Page or screen implementations requested by the user live outside the shared component root, normally `src/pages/<PageName>/`.
- Each page folder contains the page source, styles, and story together: `<PageName>.tsx`, `<PageName>.css`, and `<PageName>.stories.tsx`.
- Pages should compose existing shared components. Do not create page-only primitives inside `pages/` if they belong in the reusable component library.

If the product has an established component or page root, use that root while preserving the co-located folder shape. When editing existing files, avoid moving unrelated stories unless the current component/page needs cleanup for this rollout.

### Figma-Exportable Structure

The Storybook-rendered DOM is the Figma import source. For every new component, page, or composed story, shape the implementation so the export addon can infer useful Figma structure:

- Render one visible, deterministic story root when practical. If a story intentionally contains multiple components, wrap them in a stable layout element that should become the top-level Figma frame.
- Add a stable `data-component="<component-slug>"` to the exported root of shared components and reusable page sections. Use `data-variant="<variant-or-state>"` when a visual variant should appear in the imported Figma node name.
- Use `data-icon="<icon-name>"` for icon elements that should be named as icons. For exported SVG/image graphics, prefer `data-component="graphic"` plus `data-graphic="<asset-key>"` when the addon config provides embedded SVG text.
- Keep at least one stable, human-readable class name on exported roots and key slots. If the product uses CSS Modules, CSS-in-JS, or generated class names, add stable data attributes and a non-hashed root class as export anchors.
- Align component class prefixes with `.storybook/figma-export.config.ts` `componentClassPrefixes`; update the config when the product uses a different prefix convention.
- Express visual styles through normal DOM/CSS that the exporter can measure: flex or block layout, width/height, padding, gap, uniform borders, radius, opacity, background, text styles, and inline SVG/images.
- Use CSS variables for token-backed colors, spacing, radius, typography, opacity, and dimensions so the addon can collect variable bindings. Do not replace token variables with baked literal values just to match a screenshot.
- Avoid making essential design structure depend only on canvas, pseudo-elements, CSS masks, filters, backdrop filters, complex transforms, animated runtime positions, or portaled overlay content. If one is unavoidable, record it as an export risk or `absoluteFidelityComponents` decision.
- Keep stories deterministic: fixed args, stable example content, loaded fonts/assets, no random data, no unresolved async state, and explicit viewport/background constraints when layout depends on them.
- Prefer separate named stories for materially different visual variants or states so each Figma import has a stable, reviewable node name.

### 6. Figma Export Addon

Install and configure the bundled `@harrychuang/storybook-addon-figma-export` by default when all requirements are met:

- Storybook exists and is `^10`
- React is available in the host project
- package manager is detectable
- `.storybook/main.*` and `.storybook/preview.*` can be updated safely

The addon package is vendored in this skill at `assets/figma-export-addon/`, sourced from `harrychuang/storybook-addons#main:packages/figma-export`. Do not install it from GitHub during normal use.

Install it with the bundled installer:

```sh
node <skill-root>/scripts/install_figma_export_addon.mjs <product-repo-root>
```

Use `--copy-only` only when you need to inspect or manually install the vendored package. If the bundled addon asset is missing or incomplete, mark `figma-export-addon` as `blocked`; do not fall back to GitHub unless the user explicitly asks to refresh the vendored asset.

If Storybook is missing, not version 10, or the project is not React-based, do not force the addon. Mark `figma-export-addon` as `blocked` in the implementation map with the reason and ask before installing or upgrading Storybook.

Generate a project-local addon config before editing `.storybook/main.*` or `.storybook/preview.*`:

```sh
node <skill-root>/scripts/generate_figma_export_config.mjs <design-system-package-root> --product-root <product-repo-root> --write
node <skill-root>/scripts/generate_component_spec_modules.mjs <design-system-package-root> --product-root <product-repo-root> --write
```

Default outputs are `.storybook/figma-export.config.ts` and `.storybook/figma-component-specs.ts`. If stories live outside common roots, pass one or more `--story-root <path>` flags to the config generator. Keep project-specific class prefixes, token prefix, story title prefixes, review API settings, Figma file fallbacks, node overrides, and generated spec-module maps out of the addon package.

Do not hardcode project-specific Figma file URLs, node IDs, class prefixes, theme globals, local graphics, or token imports inside the addon package. Keep those in `.storybook/figma-export.config.ts`, `.storybook/preview.*`, or product code. The addon should only expose generic helpers.

Configuration rules:

1. Add `"@harrychuang/storybook-addon-figma-export"` to `.storybook/main.*` `addons`, preserving existing addons.
2. Import `figmaExportProjectConfig` from `.storybook/figma-export.config.ts` and build `figmaExportOptions` from that config.
3. In `.storybook/preview.*`, import:
   - `createFigmaExportGlobalTypes`
   - `createFigmaExportInitialGlobals`
   - `FigmaExportAddonOptions`
   - `createFigmaExportReviewDecorator` from `@harrychuang/storybook-addon-figma-export/review`
   - `getFigmaSourceUrl` from `@harrychuang/storybook-addon-figma-export/source`
   - `@harrychuang/storybook-addon-figma-export/styles.css`
   - `@harrychuang/storybook-addon-figma-export/review.css`
4. Merge `createFigmaExportReviewDecorator`, `globalTypes`, and `initialGlobals` into the existing preview export. Do not overwrite existing decorators or globals. Use plain `createFigmaExportDecorator` only if the user explicitly opts out of review/Open source.
5. Infer `figmaExportOptions` from the generated config, extracted token architecture, and Storybook titles. Use `storyTitlePrefix: false` when the project has no established story namespace; otherwise include every relevant namespace such as `"Components/"`, `"Pages/"`, and `"Foundations/"`.
6. Configure review/Open source by default using the bundled addon helpers instead of copying a product-specific panel:
   - `.storybook/main.*`: import `createFigmaReviewStatusPlugin` from `@harrychuang/storybook-addon-figma-export/review-server`
   - `.storybook/preview.*`: pass `componentSpecModules`, `specModulePathForSlug`, `designSystemFileUrl`, and `nodeOverrides` to `getFigmaSourceUrl`
   - the review overlay and Open source action render only when the Storybook `figmaExport` toolbar global is toggled on
7. Record the copied vendor path, installed package spec, generated config path, config values, config files, options, and review helper usage in the implementation map.

Validate addon wiring before marking setup complete:

```sh
node <skill-root>/scripts/validate_figma_export_setup.mjs <product-repo-root>
```

Fix every failed check that applies to the target builder. For non-Vite Storybook builders, the review overlay can still be configured, but persisted review-status middleware may remain blocked unless the project has an equivalent middleware hook.

If the Figma export toolbar is visible but the review overlay or Open source action is missing, read `references/figma-export-review-setup.md` and fix the missing preview/main wiring before marking addon setup complete.

### 7. Implementation Map

Before editing code, create or update the implementation map. Use `assets/storybook-implementation-map-template.md` when starting a new map.

The map must include:

| Design-system item | Source file | Product target | Decision | Status |
|---|---|---|---|---|
| token layer or component | extracted doc/token path | target token/component/story path | reuse, extend, create, defer | planned, done, blocked |

Also record:

- package manager and framework
- Storybook version or catalog alternative
- target layout roots for co-located components, foundation docs, and pages
- Figma export addon status and options
- Figma export structure decisions: root markers, variant markers, class prefixes, token bindings, unsupported CSS/DOM risks, and absolute-fidelity exceptions
- bundled addon vendor path in the product repo
- generated `.storybook/figma-export.config.ts` path and inferred project-specific values
- source trace path and per-component source IDs
- component dependency plan path, recommended order, and current dependency decisions
- original Figma nodes, local images, frontend folders, and rendered routes used for implementation
- token import strategy
- components reused from the product repo
- current batch, when using a queue
- open questions and blocked specs

### 8. Component Queue And Batch Planning

Use this section when implementing more than one component, when `COMPONENT_INVENTORY.md` contains more than 8 components, or when the user asks to build a full library.

Create or update `design-system/STORYBOOK_COMPONENT_QUEUE.md` when the design-system package lives in the product repo. Otherwise create `docs/design-system/storybook-component-queue.md`. Use `assets/storybook-component-queue-template.md` as the output shape when starting a new queue.

Plan before implementation:

1. Start from `STORYBOOK_COMPONENT_PLAN.md`; do not manually invent the first batch while the planner output is available.
2. Categorize components as foundations, primitives, typographic primitives, form controls, navigation, data display, feedback, overlays, layout, composites, or product-specific patterns.
3. Build a dependency order: tokens first, primitives before composites, lower-level slots before containers, common variants before rare variants.
4. Rank by dependency depth, reuse/dependent count, source confidence, implementation risk, token readiness, and whether an existing product component can be extended.
5. Mark blocked items explicitly: `needs-extraction`, `needs-source`, `needs-token`, `needs-api-decision`, `needs-existing-component-review`, or `out-of-scope`.
6. Pick the next batch from adjacent dependencies. Default to 3-5 simple components, 1-2 complex composites, or one cross-cutting foundation pass.
7. Read only the selected batch specs and their direct dependencies. Do not load every component spec into context unless generating or repairing the queue.
8. Finish token integration, exportable DOM structure, co-located component/page code, co-located stories, source URL parameters, queue updates, and verification for each component before starting the next component.

Each batch should produce a clean resumable state:

| Batch | Components | Dependencies | Design sources | Target files | Validation | Status |
|---|---|---|---|---|---|---|
| `B01` | component names | tokens/components needed first | source IDs, Figma nodes, images, or routes | planned product files | checks to run | queued/done/blocked |

### 9. Long-Running Implementation Protocol

Use this protocol for every multi-component implementation pass and every resume after a long run:

1. Re-read `STORYBOOK_COMPONENT_PLAN.md`, `STORYBOOK_COMPONENT_QUEUE.md`, `STORYBOOK_IMPLEMENTATION_MAP.md`, and `git status --short` before editing.
2. Select exactly one next component: the earliest unfinished queue row whose dependencies are `done`, `reused`, or accepted blocked decisions.
3. Mark that component `in-progress` in the queue before code edits.
4. Complete the component through the full sequence: source inspection, existing-component review, token decision, Figma export structure decision, co-located component/page implementation, story coverage, story source URL parameters, verification, and documentation updates.
5. Update the queue, dependency plan status, implementation map, and verification log immediately after that component.
6. Only then select the next component. Do not keep building from memory after a component is complete.

If a check fails, a source is ambiguous, a token is missing, or an API decision is needed, stop on that component and mark it with the narrowest blocked status. Do not continue to downstream composed components until the blocked dependency is resolved, reused, or explicitly accepted as blocked.

Every 3 completed components, or when context has become large, re-run:

```sh
node <skill-root>/scripts/plan_component_batches.mjs <design-system-package-root> --write --queue
```

Then re-read the queue before continuing. This keeps dependency order, source URLs, and completion records synchronized across long sessions.

### 10. Token Integration

Integrate tokens before components:

1. Reuse the product repo's existing token pipeline when present.
2. Preserve the extracted layer model unless the repo already has a stronger convention.
3. Keep inheritance intact: component tokens reference semantic tokens; semantic tokens reference primitive/reference tokens.
4. Avoid hardcoded visual values in components and stories when tokens exist.
5. Add Storybook foundation docs or MDX only after token imports render correctly.

If the product repo has no token system, ask whether to establish one before implementing components.

### 11. Storybook Foundations

Create or update foundations stories/docs for the token groups touched by this pass:

- colors: reference palettes, semantic roles, foreground/background pairings
- typography: font family, size, line-height, weight, display/body roles
- typographic components: reusable text-composition slots, hierarchy, wrapping, alignment, and examples when `typographic-*` specs exist
- spacing and layout density
- radius and shape
- elevation, borders, opacity
- motion duration, easing, and reduced-motion behavior when specified

Use the project's existing docs style. If none exists, create the smallest useful Storybook docs page that displays token names, rendered examples, and usage notes.

Foundation guides may use the product's Storybook docs folder, normally `stories/` or `src/stories/`. Keep these docs separate from component folders because they describe token systems rather than a single reusable component. Do not implement `typographic-*` specs only as foundation docs; if the extractor created a component spec, create or update the shared component and its co-located story.

### 12. Component Implementation

For each selected component spec:

1. Read the component spec and its referenced tokens.
2. Resolve its evidence IDs through `STORYBOOK_SOURCE_TRACE.md`.
3. Confirm the component is the earliest unfinished item in `STORYBOOK_COMPONENT_QUEUE.md` whose dependencies are already done, reused, or explicitly blocked with an accepted decision.
4. Inspect the original source when available:
   - Figma node/page through Figma MCP, including screenshot when visual parity matters.
   - UI image/crop through local image inspection.
   - Frontend folder/prototype code for behavior, API shape, and existing implementation clues.
   - Rendered route/story for measured layout and states when runnable.
5. Search for an existing shared component with matching purpose, anatomy, behavior, and states.
6. Prefer reuse or extension over creating a new component.
7. Decide the exported DOM contract: root element, root class, `data-component`, variant/state attributes, key slot classes, token variables, and any unsupported CSS/DOM risks.
8. Implement props, slots, variants, states, accessibility behavior, and responsive behavior from the spec.
9. Resolve the story source URL from `STORYBOOK_SOURCE_TRACE.md` for the component.
10. Keep component styles token-backed. Do not reach directly into reference tokens from component CSS unless the extracted architecture explicitly allows it.
11. Create or update the component in a co-located folder under the component root: `<ComponentName>.tsx`, `<ComponentName>.css`, and `<ComponentName>.stories.tsx`.
12. Export the component through the repo's existing public API.

For typographic components, implement named text slots instead of accepting one undifferentiated `children` blob unless the existing component API requires that pattern. Preserve the extracted hierarchy through tokens: slot type roles, color, line-height, gap, alignment, max width, wrapping, truncation, and responsive rules. Stories should include realistic short and long copy, localization-length stress cases, and any numeric/price formatting shown in the spec.

If the extracted spec lacks a necessary state, mark it blocked or implement only the documented states. Do not invent undocumented visual variants as normative design-system behavior.

For a batch pass, keep implementation scoped to the selected batch. If a new primitive or API decision would change later batches, update the queue and implementation map before continuing.

### 13. Page Implementation

Use this section only when the user asks for product pages, composed screens, or page-level Storybook entries.

1. Confirm the required shared components already exist, are reused, or are explicitly accepted as blocked.
2. Place each new page in a dedicated page folder, normally `src/pages/<PageName>/`.
3. Keep the page source, styles, and Storybook story co-located: `<PageName>.tsx`, `<PageName>.css`, and `<PageName>.stories.tsx`.
4. Compose the page from shared components and page-level layout only. Promote reusable subparts back into `components/<ComponentName>/` before using them in multiple pages.
5. Give the page story a stable exported root and preserve each reusable section/component as a meaningful Figma frame through `data-component`, stable classes, and token-backed layout CSS.
6. Record page dependencies and verification separately from shared components in the implementation map and queue.

Do not place page stories in the root `stories/` folder unless the existing product uses that folder exclusively for page docs and the implementation map records the exception.

### 14. Story Coverage

Every new or changed shared component needs Storybook coverage:

- default appearance
- documented variants and sizes
- hover, focus-visible, active/pressed, disabled when interactive
- loading, empty, error, selected, expanded, or validation states when the spec defines them
- responsive or density stories when layout changes by viewport
- theme stories when the product supports multiple themes
- long-copy and line-break stress stories for typographic components
- deterministic Figma export stories with stable root dimensions, loaded assets/fonts, source URL parameters, and no random or unresolved async content

Every component story should carry the best source URL the trace can resolve. Prefer the sync script before manual edits:

```sh
node <skill-root>/scripts/sync_story_source_parameters.mjs <design-system-package-root> --product-root <product-repo-root> --write
```

```ts
parameters: {
  figmaSourceUrl: "https://www.figma.com/design/...?...node-id=...",
}
```

If the best source is a non-Figma URL, use:

```ts
parameters: {
  design: { url: "https://..." },
}
```

Set this at the story meta level when all variants share the same source. Set it per story only when variants/states map to different Figma nodes or source URLs. The bundled review helper reads `parameters.figmaSourceUrl`, `parameters.figma.url`, and `parameters.design.url` automatically for the Open source action.

Prefer existing story conventions inside the co-located component or page folder. Use Autodocs or MDX only when the repo already uses them or the user asks for docs pages. Root `stories/` or `src/stories/` is reserved for foundation guides/docs, not new component stories.

### 15. Verification

Run the cheapest reliable checks available:

- Storybook build or relevant story preview
- Figma export addon config check when installed
- lint and typecheck
- unit or interaction tests for changed components
- visual screenshot checks for high-risk components against the best resolved original source
- token audit or CSS variable scan when available

If Storybook is runnable, open the relevant stories and inspect rendered states before calling the pass done. When the selected component has Figma evidence, compare against a Figma MCP screenshot or exported frame when available. When the Figma export addon is installed, confirm the Storybook toolbar loads without console errors, the `figmaExport` toolbar can be toggled on, the review overlay appears, Open source is available for at least one component story with a resolved source URL, and Copy design can place SVG design output on the clipboard. Inspect at least one copied/exported payload or imported frame for meaningful node names from `data-component`, variant naming from `data-variant`, token collection, and visible bounds that match the story root.

For large inventories, verify per batch and keep the full-library check for milestone boundaries. Do not wait until dozens of components are complete before running Storybook build or typecheck if those checks are available.

### 16. Closeout

Update the implementation map and component queue with completed files, blocked items, token decisions, and verification results.

Report:

- design-system package path used
- source trace path and original sources inspected
- dependency plan path and current completed/blocked component order
- product files changed
- co-located component/page folders created or updated
- Figma export structure decisions and any unsupported DOM/CSS risks
- tokens reused or added
- bundled Figma export addon installed/configured or blocked reason
- components reused, extended, or created
- stories added or updated
- batch completed and next queued batch, when applicable
- checks run and any failures
- next recommended component pass, if the inventory is not complete

## Gates

### Extraction Package Gate

Do not treat guesses, unrecorded screenshots, or ad hoc visual impressions as source of truth in this skill. If a component or token is not documented in the extracted package, either defer it or ask to expand the extraction first.

### Source Trace Gate

Before implementing a component, resolve its extractor evidence IDs to original sources when those IDs exist. If the source trace shows Figma, image, frontend-folder, or rendered-route evidence, inspect at least the sources needed for the current component batch or record why they are unavailable. Do not implement a new component solely from an unlisted Figma node, image, or code folder; mark it `needs-extraction` instead.

### Token Gate

Do not hardcode colors, spacing, radii, typography, shadows, or motion values in shared components when equivalent tokens exist. If a required token is missing, ask whether to add it at the correct layer before continuing.

### Component Gate

Do not create a new shared component before checking the product's existing components and stories. If a candidate is close to an existing component, extend the existing one or ask whether to make it a variant.

Do not place new component stories in a detached root `stories/` or `src/stories/` folder. New shared components use `components/<ComponentName>/<ComponentName>.stories.*`; foundation docs are the only default exception.

Do not downgrade an extracted `typographic-*` component into a static typography foundation example. Build it as a shared component when the spec defines slots, composition rules, and component tokens. If the product already has an equivalent text component, mark the extractor component `reused` and add matching stories instead.

### Figma Export Structure Gate

Do not mark a component or page story complete until it has a stable export root, meaningful `data-component` naming where applicable, variant/state naming for materially different visuals, token-backed CSS variables for exported visual values, and a deterministic story render. If product conventions prevent one of these, record the exception and expected export impact in the implementation map.

Do not rely on anonymous `div` trees, hashed classes, pseudo-element-only content, canvas-only rendering, or runtime animation state as the primary Figma design source. Refactor to an exportable DOM structure or mark the item blocked with an export-risk reason.

### Dependency Order Gate

Do not start a composed component while `STORYBOOK_COMPONENT_PLAN.md` lists unfinished dependencies for it. Build, reuse, or explicitly block the dependency first, then update the queue and implementation map before moving to the composed component. Do not mark a component `done` until every listed dependency is `done`, `reused`, or recorded as an accepted blocked decision.

### Checkpoint Gate

Do not move from one component to the next until the current component has a queue status, dependency-plan status, implementation-map entry, story source URL decision, and verification-log entry. For long runs, treat each component as a checkpoint boundary: finish or block the current component cleanly before reading the next spec.

### Batch Gate

Do not attempt to implement a large inventory in one pass. When implementing more than one component, create or update the component queue from `STORYBOOK_COMPONENT_PLAN.md`, choose a bounded dependency-adjacent batch, and leave the remaining work queued.

### Figma Export Addon Gate

Do not silently skip addon setup for compatible React Storybook 10 projects. Install and configure it before component implementation unless the user opts out. If the project is incompatible, record the reason and continue with Storybook implementation only after the blocked addon status is explicit.

Use the bundled addon installer instead of GitHub dependency specs. If `@storybook/icons` is missing and package-manager install cannot reach the registry, record the addon as blocked with that dependency reason.

Keep project-specific addon settings in `.storybook/figma-export.config.ts`. Do not patch the bundled addon with product Figma file URLs, node overrides, token prefixes, theme globals, local image imports, or story sorting rules.

### Story Gate

Do not mark a shared component implementation complete without a story, example, or documented catalog entry covering its main states.

Do not mark a component or page complete until its story is co-located in that component/page folder, unless the implementation map records an explicit product-convention exception.

### Story Source URL Gate

Do not mark a component story complete until the best resolved source URL from `STORYBOOK_SOURCE_TRACE.md` is written to story parameters, or until the implementation map records that no URL source exists. Prefer `parameters.figmaSourceUrl` for Figma; use `parameters.design.url` for other web sources. Local screenshots and frontend folders are implementation evidence, but they are not Open source URLs unless the product serves them through a stable URL.

### Adoption Gate

Do not rewrite product screens to use the new library until the relevant shared components are implemented and documented, unless the user explicitly requests route adoption as the current pass.

## Resource Map

- `scripts/trace_sources.mjs` and `scripts/plan_component_batches.mjs`: write source trace, component plan, and queue files.
- `scripts/sync_story_source_parameters.mjs`: reports or writes story source URL parameters from `STORYBOOK_SOURCE_TRACE.md`.
- `scripts/generate_figma_export_config.mjs`: infers product-specific addon settings and writes `.storybook/figma-export.config.ts`.
- `scripts/generate_component_spec_modules.mjs`: writes `.storybook/figma-component-specs.ts` for Open source fallback.
- `scripts/install_figma_export_addon.mjs`: copies the bundled Figma export addon into a product repo and installs it as a local `file:` dependency.
- `scripts/install_storybook_starter.mjs`: copies the generic Storybook starter (`assets/storybook-starter/`) into a new or empty project directory.
- `scripts/inspect_storybook_project.mjs` and `scripts/validate_figma_export_setup.mjs`: inspect target Storybook compatibility and validate addon wiring.
- `references/agent-installation.md`: target paths and verification checklist for Claude Code, Codex, and Cursor installation.
- `references/figma-export-review-setup.md`: troubleshooting and required wiring for the review overlay and Open source action.
- `assets/storybook-component-queue-template.md`, `assets/storybook-implementation-map-template.md`, `assets/figma-export-addon/`, and `assets/storybook-starter/`: templates, vendored addon package, and generic Storybook workspace.
