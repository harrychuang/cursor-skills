---
name: design-system-to-storybook
description: >-
  Build or update framework-native, token-backed Storybook foundations, shared
  UI components, and stories from an extracted design-system package. Use after
  design-system-extractor, or when Codex must adapt design-system Markdown,
  tokens, and traced Figma/image/code/route evidence to an existing or new
  React, Vue, Angular, Svelte, Web Components, meta-framework, monorepo, or
  other frontend target; select the correct app root, renderer, builder, file
  conventions, and optional tooling; infer component dependency order; sync
  component documentation; plan batches; or bootstrap Storybook without
  silently imposing React/Vite or migrating the product framework. Also use
  when updating, version-checking, or explaining this skill's bundled tools:
  the Figma export addon and the Storybook Code To Design Figma importer.
---

# Design System to Storybook

Use this skill to turn an already extracted design-system package into a product repo's Storybook implementation. The design-system documentation and tokens are the normative source of truth. Original Figma nodes, UI or graphic images, rendered routes, and frontend folders recorded by `design-system-extractor` are supporting evidence for implementation details, Storybook parity, and visual verification.

This is a downstream implementation skill. Do not re-extract a design system here. If the required design-system docs, token architecture, source evidence, or component specs are missing, ask to run or continue `design-system-extractor` first.

## Expected Inputs

- **Design-system package:** usually contains `design-system/`, `tokens/`, and generated docs under `docs/design-system/`.
- **Product repo:** the codebase where Storybook, shared UI components, and token imports should be created or updated.
- **Implementation scope:** specific components, typographic/text-lockup components, all extracted components, foundations only, or a product-owned component library.
- **Runtime constraints:** target app/workspace root, framework and meta-framework, rendering mode, language, package manager, Storybook renderer/builder/version, styling system, and test commands.
- **Framework decision:** explicit current-user or approved target-specific handoff choice when present; otherwise the selected target root's evidence and any ambiguity that must be resolved before setup.
- **Storybook bootstrap preference:** when Storybook must be created, whether to use the bundled `storybook-template`, use a product-native Storybook setup, or create a separate template workspace.
- **Batch budget:** optional number of components to implement in the current pass.
- **Extractor source evidence:** `DESIGN_EVIDENCE_MAP.md`, `SESSION_STATE.md`, component spec `Evidence` tables, component-review image links, and any Figma URLs/nodes, UI screenshots, graphic/brand/editorial image references, rendered routes, or frontend folders listed there.
- **Documentation sync inputs:** existing component folders, co-located Storybook stories, component CSS token usage, explicit user component briefs, `COMPONENT_INVENTORY.md`, and component-review status JSON when design-system docs need auditing or backfilling.
- **Bundled Figma export addon:** detect renderer, builder, and Storybook major before installation. React + Vite + Storybook 10 and Vue 3 + Vite + Storybook 10 have verified full Export, Review, Visual Comments, persistence, report, and source-action parity. Other detected Storybook 10 renderers receive core export only when the capability report marks it `supported`; never infer full review support from core export support.
- **Bundled Figma import plugin:** machine-level Figma tooling paired with a compatible exporter payload; it is not a renderer or exporter by itself. It ships inside this skill; solo developers load the skill-folder manifest, while teams with designers commit a repo copy as the distribution channel.
- **Bundled Storybook template:** optional React + Vite + Storybook 10 workspace; ask before using it and never treat it as the universal bootstrap.
- **Figma export readiness:** stable component node naming, token-bindable CSS, auto-layout-friendly DOM, source URL parameters, and export payload validation.
- **Prototype handoff:** when the user wants PRD-led product prototypes or UI Flow, continue with `storybook-product-prototype`; record whether the template-only Prototype Inspector and Static Flow helpers are actually available.

## First Actions

1. Locate the design-system package root and the product repo root. They may be the same folder.
2. Read `design-system/SESSION_STATE.md`, `DESIGN_EVIDENCE_MAP.md`, `TOKEN_ARCHITECTURE.md`, `COMPONENT_INVENTORY.md`, `DESIGN_ELEMENTS.md`, and relevant `design-system/components/*.md`.
3. Run the source trace script to resolve extractor sources before implementation: `node <skill-root>/scripts/trace_sources.mjs <design-system-package-root> --write`.
4. Run the component planner before choosing implementation order and queue rows: `node <skill-root>/scripts/plan_component_batches.mjs <design-system-package-root> --write --queue`.
5. Inspect referenced design sources for the selected scope: use Figma MCP for Figma nodes, inspect local UI or graphic images/crops, and inspect referenced frontend folders/routes when present.
6. Read `references/framework-adaptation.md`, inspect every plausible app/workspace root, and record the selected root, framework/meta-framework, renderer, builder, file conventions, and evidence before scaffolding or dependency installation.
7. Apply the framework decision gate: inherit an unambiguous existing stack without a redundant framework question; for greenfield, ambiguous, conflicting, multi-root, or migration cases, ask for the missing decision before writing setup files. Never migrate frameworks without explicit approval.
8. If Storybook is absent or a new workspace is requested, ask whether to initialize product-native Storybook unless that choice is already explicit. Offer the bundled React/Vite template only for a React/Vite target or an explicitly requested separate token/docs or React workspace.
9. Run the component documentation checker for product repos that already contain components: `node <skill-root>/scripts/check_component_docs.mjs <product-repo-root> --design-system-root <design-system-package-root>`. Use `--write` only when the user asked to backfill missing docs or when this pass creates new components.
10. Record an implementation map before code changes. Prefer `design-system/STORYBOOK_IMPLEMENTATION_MAP.md` when the design-system package lives in the product repo; otherwise use `docs/design-system/storybook-implementation.md`.
11. Run the bundled Figma export installer when Storybook 10 is present. Let it auto-detect renderer/builder/major and inspect the capability report before accepting generated wiring. Full review wiring is verified for React + Vite and Vue 3 + Vite; supported non-Vite/other-renderer targets fall back to core export wiring. Use `--renderer` only to resolve conflicting static signals.
12. Confirm the bundled Figma import plugin only when a compatible exporter payload is available: run the importer script to report its version, manifest path, and once-per-machine Figma Desktop setup; pick the distribution channel by audience — skill-folder manifest for a solo developer machine, committed repo copy (`--copy-to figma/storybook-code-to-design`) when designers or teammates need the plugin without an agent skill install.
13. Read `references/figma-export-readiness.md` before implementing components when the Figma export addon is installed or planned.
14. If implementing more than one component, create or update a component queue before reading every spec or editing code.
15. If the product has explicit design-system governance instructions, follow them. Otherwise apply the gates in this skill.

## Scope Modes

Choose the smallest mode that satisfies the user request:

- **Product-native Storybook:** create or update Storybook inside the selected app/package using that target's framework, meta-framework, builder, package manager, and source/story conventions.
- **Template bootstrap:** after approval, create a separate React/Vite/Storybook 10 workspace for shared token/docs verification or a separately requested React implementation; it cannot render or validate Vue or other non-React product components and must not convert or substitute for their product-native Storybook.
- **Foundations:** import or mirror tokens and add Storybook docs for color, typography, typographic composition, spacing, radius, elevation, and motion.
- **Typographic component pass:** implement selected text-lockup specs such as hero title lockups, editorial heading stacks, metric lockups, quote lockups, and label/value text groups as token-backed display components with stories.
- **Component pass:** implement selected `extracted` or `planned` component specs as shared components with stories.
- **Documentation sync pass:** audit and backfill `design-system/components/*.md`, `COMPONENT_INVENTORY.md`, implementation map entries, queue status, and review-status coverage for components that already exist in code or were just created.
- **Library pass:** build or update a reusable component package from the full component inventory.
- **Batch pass:** implement one dependency-aligned group from a large component queue.
- **Adoption pass:** replace ad hoc product UI with documented shared components after the Storybook catalog exists.
- **Prototype handoff:** stop design-system component work at the Storybook foundation boundary and use `storybook-product-prototype`; use project-native equivalents when template-only Prototype Inspector or Static Flow helpers are unavailable.

Do not compose product screens before the required shared components and stories exist unless the user explicitly asks for a product route first.

## Agent Installation

If the user asks to install or share this skill with Claude Code, Codex, or Cursor, read `references/agent-installation.md` and use `scripts/install_agent_skill.mjs`. Install the full skill directory so `SKILL.md`, scripts, references, and the bundled Storybook addon asset remain together.

## Tool Updates

If the user asks to update this skill or its bundled tools, check tool versions, or understand how tool updates reach projects and Figma, read `references/tooling-updates.md` and follow its three-layer update journey: machine (skills repo pull + skill reinstall), project (export addon tarball re-run + repo-copy importer refresh + commit), and Figma (one-time manifest import per machine, then refresh the files behind that path only). After any tool update, tell the user in their language which versions changed, what must be committed in the product repo, and whether a once-per-machine Figma step applies.

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
| `design-system/components/*.md` | anatomy, variants, states or display modes, accessibility, and token contracts |

If a required file is absent, continue only for the modes that still have enough evidence. For example, foundations can proceed without component specs, but component implementation cannot unless the user provides an explicit component brief for the current pass. When a component doc is created from code, stories, or a user brief instead of extracted evidence, mark it as `implementation-derived` or `brief-derived` and `needs-review`; do not treat it as an extracted source of truth until reviewed.

### 2. Source Trace And Design Source Discovery

Build a source trace before editing code:

```sh
node <skill-root>/scripts/trace_sources.mjs <design-system-package-root> --write
```

Default output is `design-system/STORYBOOK_SOURCE_TRACE.md`. Use it to connect component specs to original sources:

- **Figma URL or normalized node:** use Figma MCP to inspect the referenced node. Prefer `get_design_context` for component-level nodes, `get_metadata` for pages/structure, `get_variable_defs` for token variables, and `get_screenshot` for visual parity references. If only a page is known, use metadata to find the most relevant frame/component before implementing.
- **UI or graphic image / screenshot crop:** resolve the local path, inspect the actual bitmap, and use it as the visual reference for Storybook screenshot checks. Do not rely on alt text or filename alone.
- **Frontend folder or prototype source:** inspect the referenced code, Storybook entries, token files, rendered routes, and component API. Treat prototype code as migration evidence only when the user asks to migrate it; otherwise use it to understand behavior and states.
- **Rendered route:** run or inspect the route only if the product setup makes that cheap and safe. Record viewport, state, and command in the implementation map when used for verification.

Use the `Story Source URL Parameters` section from `STORYBOOK_SOURCE_TRACE.md` when creating or updating stories. Prefer Figma URLs and write them to `parameters.figmaSourceUrl`; use non-Figma web URLs only when they are the best available source and write them to `parameters.design.url`. Do not invent a URL from a local image path or normalized Figma fingerprint unless the design-system docs also provide the matching Figma file URL.

If the trace finds source IDs in component specs that cannot be resolved, mark the affected component `blocked` or `needs-extraction` in the queue before writing component code. If the trace finds Figma or image evidence for a component, do not skip that source unless the source is unavailable; record the reason.

Use original sources to clarify implementation details, not to silently override extracted design decisions. When Figma/image/frontend evidence contradicts the extracted tokens or component spec, stop and update the implementation map with the conflict; ask whether to revise the extraction or implement the documented spec.

### 3. Component Dependency Planning

Build a dependency plan before selecting components or batches:

```sh
node <skill-root>/scripts/plan_component_batches.mjs <design-system-package-root> --write --queue
```

Default outputs are `design-system/STORYBOOK_COMPONENT_PLAN.md` and `design-system/STORYBOOK_COMPONENT_QUEUE.md`. Use them to decide which component should be built next. The planner reads `COMPONENT_INVENTORY.md`, component specs, and `STORYBOOK_SOURCE_TRACE.md`, then infers:

- component category/tier: foundation, primitive, typographic, form-control, layout, navigation, data-display, feedback, overlay, composite, product-pattern, or unknown
- dependencies from explicit dependency/composition/anatomy/slot sections
- dependencies from component-name composition such as `IconButton` depending on `Button`
- dependency phrases from component spec mentions, such as `uses`, `contains`, `renders`, `wraps`, or `depends on`
- dependents, so heavily reused primitives are prioritized before the components that consume them
- story source URLs from the source trace, so queue rows inherit the right source URL

Use the recommended order unless product discovery proves that a dependency already exists and can be reused. Do not build a composite component before its listed dependencies are implemented, reused, or explicitly marked blocked with a reason. If the planner reports a cycle, pick the lowest-level reusable primitive in that cycle first, record the cycle in the implementation map, and update the queue after the first component breaks the cycle.

For any multi-component pass, create or update the queue from `STORYBOOK_COMPONENT_PLAN.md`. The next component should come from the earliest unfinished row in the recommended build order whose dependencies are done, reused, or blocked with an accepted decision.

Re-run the planner with `--queue` after dependency decisions change. It preserves existing queue statuses, product targets, story targets, and decisions while refreshing order, batch, dependency, and source URL data.

### 4. Product Discovery

Read `references/framework-adaptation.md` and find the local implementation pattern before adding files:

- Workspace/app roots: workspace manifests, package boundaries, route/runtime configs, lockfiles, and architecture docs that identify the actual implementation target.
- Runtime: framework, meta-framework, rendering mode, language, package manager, bundler/builder, and framework-specific plugins.
- Storybook config: `.storybook/`, `*.stories.*`, `*.mdx`, docs pages, decorators, preview styles.
- Components: `src/components/`, `components/`, `src/ui/`, `src/design-system/`, `packages/ui/`, or existing exports.
- Pages and composed screens: `src/pages/`, `pages/`, `src/screens/`, route modules, or existing composed view folders.
- Tokens and themes: CSS variables, token CSS imports, Tailwind config, theme objects, Sass variables, style dictionaries, or package-level token builds.
- Accessibility and tests: existing interaction tests, visual tests, a11y addons, Playwright, Vitest, Jest, Testing Library.
- i18n: locale files or message catalogs when stories or components need visible text.

Use this priority: explicit current-user or approved target-specific handoff choice, then evidence from the selected target root. Inherit a single coherent existing stack without asking the user to repeat it. Ask before scaffolding or installing when the target is greenfield, multiple roots are plausible, evidence conflicts, the framework/builder cannot be established, or the work would migrate frameworks. Do not use a sibling app's clearer stack as evidence for the selected target, and do not migrate merely to gain bundled tooling.

Do not install Storybook or unrelated dependencies unless the user asked for Storybook setup or approves it after discovery. When Storybook is missing, follow the bootstrap section. Core Storybook implementation is renderer-neutral; bundled export/import tooling is conditional capability, not a prerequisite.

### Storybook Template Bootstrap

Use the bundled template only when the user explicitly selects a React/Vite target or a separate React/Vite workspace. It is one bootstrap option, not the default for every greenfield project. Vue and other non-React products use product-native Storybook. A separate React workspace may verify shared tokens/docs or host a separately requested React implementation, but it cannot render or validate the product's Vue, Angular, Svelte, or Web Component implementation. Do not migrate an existing app or Storybook onto the template without explicit migration approval.

When Storybook is absent and the target/stack or workspace choice is not already explicit, ask one short question before installing or scaffolding:

```text
Which app/workspace and frontend stack should Storybook target? I can initialize Storybook with that product-native framework and builder. If you separately need shared token/docs checks or React components, I can also create the bundled React + Vite workspace.
```

For an existing unambiguous app, state the inferred product-native framework/builder and ask only for unresolved setup approval; do not re-ask which framework it uses or offer a separate React workspace by default for a non-React product. For greenfield, multi-root, conflicting, or migration cases, wait for the consequential decision. Product-native setup is the normal choice when components must be consumed by that product. The bundled template adds React + Vite + Storybook 10, token checks, foundation/catalog checks, Figma review wiring, a local importer manifest, and Prototype UI Flow helpers, but those capabilities apply only inside that separate template workspace.

For product-native setup, prefer the official Storybook CLI's dependency auto-detection inside the selected app root. If it cannot detect the framework or the repo is intentionally custom, inspect the current CLI help and use its supported `--type` fallback. Preserve the selected renderer, builder, meta-framework integration, package manager, and repo-native story/source conventions; record the exact command and evidence. See `references/framework-adaptation.md` for the complete decision flow.

If the user chooses the template, collect or infer:

- target root or subfolder
- project display name
- token prefix, using lowercase ASCII letters, digits, and single hyphens, starting with a lowercase letter
- optional package name
- optional Figma design file URL

Install with the bundled installer:

```sh
node <skill-root>/scripts/install_storybook_template.mjs <target-root> --name "<project-name>" --prefix <token-prefix> [--package-name <package-name>] [--figma-url "<figma-url>"]
```

The installer copies `storybook-template/`, skips local development artifacts such as `.git`, `node_modules`, Storybook build output, and local agent/editor folders, refuses file collisions by default, and runs the template initializer. Use `--dry-run` before installing into a non-empty target. Use `--force` only after explicit approval because it overwrites existing files.

After the template is installed:

1. Record the template decision, target root, project name, token prefix, package name, Figma URL, and installer command in the implementation map.
2. Run `npm install` only when dependencies are missing and the user approves registry access if network is required.
3. Run `npm run check`, `npm run storybook:build`, or the nearest available template checks after dependencies are available.
4. Replace starter `example-card` and example prototype content only as the implementation scope requires; keep them until real components or prototypes exist so catalog checks remain meaningful.
5. Continue with source trace, component planning, token integration, and co-located component/page implementation inside the template workspace.

### 5. Target File Layout

Use folder co-location for new implementation files. Do not create a separate root `stories/` folder for component stories.

- Shared components live in the product's component root, normally `src/components/<ComponentName>/`.
- Each component folder contains framework-native source, styling when separate, and a story using the repo's extensions—for example `.tsx` for React, `.vue` for Vue, `.component.ts` for Angular, or `.svelte` for Svelte. Never treat `.tsx` or a separate `.css` file as a universal default.
- Component stories must be co-located with their component. Avoid `stories/<ComponentName>.stories.*`, `src/stories/<ComponentName>.stories.*`, or other detached component-story targets for new files.
- Component story meta must opt into Storybook Autodocs with `tags: ["autodocs"]` or the repo's exact equivalent. Prefer an explicit meta-level tag for every shared component even when the project also has global docs settings.
- Foundation guides/docs may live in the Storybook docs area, normally `stories/` or `src/stories/`, because they document tokens rather than a single component implementation.
- Page or screen implementations requested by the user live outside the shared component root, normally `src/pages/<PageName>/`.
- Each page folder co-locates its framework-native page/view source, local style file only when the repo uses one, and story using the selected renderer's conventions.
- Pages should compose existing shared components. Do not create page-only primitives inside `pages/` if they belong in the reusable component library.

If the product has an established component or page root, use that root while preserving the co-located folder shape. When editing existing files, avoid moving unrelated stories unless the current component/page needs cleanup for this rollout.

### 6. Figma Export Addon

Auto-install and configure the bundled `@harrychuang/storybook-addon-figma-export` only when its verified baseline requirements are met:

- Storybook exists and is `^10`
- renderer and builder signals are unambiguous, or the user supplies an explicit `--renderer` override
- package manager is detectable
- `.storybook/main.*` has a safe ESM default-export shape; `.storybook/preview.*` is either absent or can be wrapped safely

If the bundled `storybook-template` was installed in this pass, treat its vendored addon package, `.storybook/figma-export.config.ts`, and review server wiring as the addon baseline. Update the template config and source URL mappings as needed; do not run `install_figma_export_addon.mjs` unless the vendored addon package is missing or the template wiring has been removed.

The addon package is vendored in this skill at `assets/figma-export-addon/`, sourced from `harrychuang/storybook-addons#main:packages/figma-export`. Do not install it from GitHub during normal use. On verified React or Vue 3 Vite Story view, its additive visual-comments workflow may persist trusted-LAN/no-auth meeting data and portable reports under `design-system/figma-export-review/`; keep `visualComments` and `commentsDir` project-local, treat screenshots as durable state evidence rather than state replay, and never delete that directory during addon rollback. DOM-to-image does not promise framebuffer-perfect capture for video, WebGL, nested iframes, or cross-origin images without CORS.

Install it with the bundled installer:

```sh
node <skill-root>/scripts/install_figma_export_addon.mjs <product-repo-root>
```

The installer first reads package dependencies and static `.storybook/main.*` references, then reports `renderer`, `builder`, `storybookMajor`, `confidence`, `signals`, and independent `coreExport`, `reviewWorkspace`, `visualComments`, and `persistence` states. Conflicting or unknown renderer evidence fails before package, lockfile, tarball, or Storybook config mutation. `--renderer <react|vue3|angular|svelte|web-components>` resolves a known conflict; it does not override an unsupported builder/version matrix. `--json` emits one machine-readable report on stdout.

After preflight, the installer packs the vendored addon into a versioned tarball at `.storybook/vendor/harrychuang-storybook-addon-figma-export-<version>.tgz`, detects the package manager, and installs it as a local `file:` dependency plus `@storybook/icons` when needed. It generates renderer-neutral `.storybook/figma-export.main.mjs` and `.storybook/figma-export.preview.mjs` wrappers and wraps safe ESM default exports without replacing existing config objects. React + Vite + Storybook 10 and Vue 3 + Vite + Storybook 10 receive full review/server wiring; other supported Storybook 10 combinations receive core export wiring only. Use `--skip-configure` when equivalent project-owned wiring already exists, or `--configure-only` to regenerate wrappers without changing dependencies.

Commit the tarball together with `package.json`, the lockfile, generated wiring, and the modified Storybook config files so teammates and CI install the same version. Re-running upgrades in place; `--check` reports bundled vs installed versions; `--copy-only` only produces the tarball. Older copied-directory installs are migrated to `figma-export-addon-legacy-backup` until verified and deleted. If the bundled asset is missing/incomplete or config cannot be wrapped safely, mark `figma-export-addon` as `blocked`; do not fall back to GitHub or overwrite project-owned wiring.

To ship an addon update through this skill, refresh `assets/figma-export-addon/` with new `dist/` output and a version bump in its `package.json`, then re-run the installer in each product repo. The installer keys upgrades off that version, so never change `dist/` without bumping the version. Read `references/tooling-updates.md` for the full machine/project/Figma update journey and the user-facing reporting checklist.

If Storybook is missing or not version 10, do not auto-install or force the addon; mark `figma-export-addon` as `unavailable` or `blocked` with the reason and continue core Storybook implementation. For Storybook 10, trust the per-capability report: `supported` may be wired, `unsupported` must be omitted, and `unverified` requires a separate validation pass. Do not install, upgrade, or migrate the app solely for this addon. Do not create a full Vue template; validate Vue through the product-native Storybook and the addon's real Vue fixture.

Generate a project-local addon config before editing `.storybook/main.*` or `.storybook/preview.*`:

```sh
node <skill-root>/scripts/generate_figma_export_config.mjs <design-system-package-root> --product-root <product-repo-root> --write
```

Default output is `<product-repo-root>/.storybook/figma-export.config.ts`; keep project-specific URLs, node IDs, class prefixes, theme globals, local graphics, token imports, review API settings, and source fallbacks there or in product code, never inside the bundled addon package.

Read `references/figma-export-review-setup.md` before wiring `.storybook/main.*` or `.storybook/preview.*`, and again if the toolbar, review overlay, Open source action, visual meeting API, or capture flow is missing. Record the vendored tarball path, installed addon version, installed package spec, generated config path, config values, config files, options, and review helper usage in the implementation map.

Read `references/figma-export-readiness.md` before implementing or changing a component/story with the addon installed. The component DOM, CSS, tokens, story metadata, and layout choices should be optimized for editable Figma JSON/importer output while preserving the extracted design. Prefer fixing DOM/CSS/token usage over patching generated export payloads.

### 7. Figma Import Plugin

Confirm the paired Figma importer only when the Figma export addon, bundled template, or another validated exporter produces a compatible payload. The importer consumes export JSON; it does not make an otherwise incompatible renderer export-ready.

The importer is machine-level Figma tooling, not a runtime project dependency. It ships inside this skill at `assets/figma-plugin-code-to-design/`, so on any machine with the skill installed the manifest physically lives in that machine's skill folder (for example `~/.claude/skills/design-system-to-storybook/assets/figma-plugin-code-to-design/manifest.json`); the skills repo checkout is the canonical source when present. A Figma dev plugin re-reads its built runtime on every run, so updating a loaded plugin never needs a re-import — only the files behind the imported manifest path must be refreshed.

Pick the distribution channel by audience:

- **Solo developer machine (skill installed):** load the skill-folder manifest once in Figma Desktop. Agent skill folders are hidden directories, so the Figma file dialog will not show them — press `Cmd+Shift+G` and paste the full path (or `Cmd+Shift+.` to toggle hidden files). Updates arrive by refreshing the skill copy in place (`git pull` in the skills repo checkout, or `install_agent_skill.mjs --force` for installed skill folders) — same path, no re-import.
- **Team with designers (default for shared repos):** commit a repo copy. Designer machines usually have no agent skill folder at all, and hidden paths are hard to select, so the product repo is the distribution channel: designers `git pull` and import a visible, stable manifest path. Also use this for air-gapped or deliberately self-contained workspaces.

Confirm and report the bundled plugin with:

```sh
node <skill-root>/scripts/install_figma_import_plugin.mjs [product-repo-root]
```

The default mode validates the bundled plugin (manifest, built runtime, and that the stamped `PLUGIN_VERSION` matches the plugin `package.json`), prints the plugin version, the skill-folder manifest path with the hidden-folder dialog hint, and the update flow. With a product root it also reports whether a repo copy at `figma/storybook-code-to-design/` matches the bundled plugin, is outdated (refresh with `--copy-to ... --force` and commit), or is absent.

If the bundled `storybook-template` was installed in this pass and `figma/storybook-code-to-design/manifest.json` exists, treat that importer as the template workspace's baseline: the template stays self-contained. Record the manifest path and loading instructions instead of duplicating another importer.

Create or refresh a repo copy with:

```sh
node <skill-root>/scripts/install_figma_import_plugin.mjs <product-repo-root> --copy-to figma/storybook-code-to-design [--dry-run] [--force]
```

Repo copies must include the plugin source and built runtime — `manifest.json`, `ui.html`, `code.ts`, `code.js`, `package.json`, and lock/config files — while skipping `.git`, `node_modules`, and local OS artifacts. Commit the copy together with the rest of the pass. If `code.js` is missing, mark `figma-import-plugin` as `blocked`; the Figma manifest points to that built runtime. Use `--dry-run` before copying into a non-empty target and `--force` only after explicit approval because it overwrites changed plugin files.

Report the setup steps for the chosen channel, which run once per designer machine rather than once per project:

```text
Figma importer plugin (once per machine):
1. Open Figma Desktop.
2. Go to Plugins > Development > Import plugin from manifest...
3. Select the manifest for the chosen channel:
   - repo copy: <product-repo>/figma/storybook-code-to-design/manifest.json
   - skill folder: <skill-root>/assets/figma-plugin-code-to-design/manifest.json
     (hidden folder — press Cmd+Shift+G in the file dialog and paste the path)
4. In Storybook, export JSON, then import it with Storybook Code To Design.
5. To update later: git pull (repo copy) or refresh the skill copy — no re-import needed.
```

Record the plugin version, the chosen distribution channel with its manifest path, machine setup status, and any blocked reason in the implementation map. The plugin version constant and UI badge are stamped from the plugin `package.json` by its `prebuild` script; never hand-edit `PLUGIN_VERSION` or the badge, and never patch the bundled plugin asset for a single product. Read `references/tooling-updates.md` for the full update journey across machine, project, and Figma layers.

### 8. Implementation Map

Before editing code, create or update the implementation map with:

| Design-system item | Source file | Product target | Decision | Status |
|---|---|---|---|---|
| token layer or component | extracted doc/token path | target token/component/story path | reuse, extend, create, defer | planned, done, blocked |

Also record:

- selected app/workspace root; framework, meta-framework, rendering mode, language, package manager, and styling conventions
- Storybook renderer, builder, version or catalog alternative; source/story extensions and framework-native authoring convention
- decision source and evidence, unresolved ambiguity, user approval when asked, and whether migration is `none` or explicitly approved
- Storybook template decision, target root, project name, token prefix, package name, Figma URL, and installer command when template bootstrap is used or declined
- target layout roots for co-located components, foundation docs, and pages
- Figma export addon status and options
- bundled addon tarball path and installed addon version in the product repo
- generated `.storybook/figma-export.config.ts` path and inferred project-specific values
- Figma import plugin version, chosen distribution channel (skill-folder manifest or committed repo copy) with its manifest path, machine setup status, and Figma Desktop loading instructions
- Figma export readiness decisions: root `data-component` / `data-variant` naming, `componentClassPrefixes`, `absoluteFidelityComponents`, embedded SVG mappings, export payload validation results, and any accepted validator warnings
- source trace path and per-component source IDs
- component dependency plan path, recommended order, and current dependency decisions
- per-component state coverage list (`evidenced` / `inferred` / `out-of-scope`) and the user confirmation that approved it
- per-component design parity report path (`reports/design-pixel-align/<component>/`), its open/adjudicated `strict` drift count, the capture's font environment status, and the fidelity mode captured when the toolbar exists
- fidelity toolbar decision when the package records accessibility remaps: installed, declined, or not applicable
- component documentation provenance: extracted, brief-derived, implementation-derived, or needs-review
- original Figma nodes, local images, frontend folders, and rendered routes used for implementation
- token import strategy
- components reused from the product repo
- current batch, when using a queue
- open questions and blocked specs
- capability status for core Storybook, bundled exporter, importer payload path, and template-only Prototype Inspector/Static Flow helpers

### 9. Component Queue And Batch Planning

Use this section when implementing more than one component, when `COMPONENT_INVENTORY.md` contains more than 8 components, or when the user asks to build a full library.

Create or update `design-system/STORYBOOK_COMPONENT_QUEUE.md` when the design-system package lives in the product repo. Otherwise create `docs/design-system/storybook-component-queue.md`. Use `assets/storybook-component-queue-template.md` as the output shape when starting a new queue.

Plan before implementation:

1. Start from `STORYBOOK_COMPONENT_PLAN.md`; do not manually invent the first batch while the planner output is available.
2. Categorize components as foundations, primitives, typographic lockups, form controls, navigation, data display, feedback, overlays, layout, composites, or product-specific patterns.
3. Build a dependency order: tokens first, primitives and typographic lockups before composites, lower-level slots before containers, common variants before rare variants.
4. Rank by dependency depth, reuse/dependent count, source confidence, implementation risk, token readiness, and whether an existing product component can be extended.
5. Mark blocked items explicitly: `needs-extraction`, `needs-source`, `needs-token`, `needs-api-decision`, `needs-existing-component-review`, or `out-of-scope`.
6. Build a **state coverage list** for every component and page in the candidate batch before implementation: enumerate the plausible states (`default`, `loading`, `empty`, `error`, `disabled`, `selected`, plus spec-specific ones — or display modes for display-only components) and mark each one `evidenced` (a source proves it), `inferred` (proposed extrapolation), or `out-of-scope` (will not be built). Record it in the queue's `State Coverage` table.
7. Confirm the state coverage list with the user **before the batch starts**. The scope decision — especially which states will *not* exist — belongs to the user up front, not to the implementation pass after the fact. "No evidence, so not built" is correct behavior, but it must be an agreed decision, not a surprise discovered in the shipped UI.
8. Pick the next batch from adjacent dependencies. Default to 3-5 simple components, 1-2 complex composites, or one cross-cutting foundation pass.
9. Read only the selected batch specs and their direct dependencies. Do not load every component spec into context unless generating or repairing the queue.
10. Finish token integration, co-located component/page code, co-located stories, source URL parameters, queue updates, and verification for each component before starting the next component.

Each batch should produce a clean resumable state:

| Batch | Components | Dependencies | Design sources | Target files | Validation | Status |
|---|---|---|---|---|---|---|
| `B01` | component names | tokens/components needed first | source IDs, Figma nodes, images, or routes | planned product files | checks to run | queued/done/blocked |

### 10. Long-Running Implementation Protocol

Use this protocol for every multi-component implementation pass and every resume after a long run:

1. Re-read `STORYBOOK_COMPONENT_PLAN.md`, `STORYBOOK_COMPONENT_QUEUE.md`, `STORYBOOK_IMPLEMENTATION_MAP.md`, and `git status --short` before editing.
2. Select exactly one next component: the earliest unfinished queue row whose dependencies are `done`, `reused`, or accepted blocked decisions.
3. Mark that component `in-progress` in the queue before code edits.
4. Complete the component through the full sequence: source inspection, existing-component review, state coverage confirmation, token decision, co-located component/page implementation, story coverage, story source URL parameters, design-system documentation sync, verification (including the parity report when the component has Figma evidence), and documentation updates.
5. Update the queue, dependency plan status, implementation map, and verification log immediately after that component.
6. Only then select the next component. Do not keep building from memory after a component is complete.

If a check fails, a source is ambiguous, a token is missing, or an API decision is needed, stop on that component and mark it with the narrowest blocked status. Do not continue to downstream composed components until the blocked dependency is resolved, reused, or explicitly accepted as blocked.

Every 3 completed components, or when context has become large, re-run:

```sh
node <skill-root>/scripts/plan_component_batches.mjs <design-system-package-root> --write --queue
```

Then re-read the queue before continuing. This keeps dependency order, source URLs, and completion records synchronized across long sessions.

### 11. Token Integration

Integrate tokens before components:

1. Reuse the product repo's existing token pipeline when present.
2. Preserve the extracted layer model unless the repo already has a stronger convention.
3. Keep inheritance intact: component tokens reference semantic tokens; semantic tokens reference primitive/reference tokens.
4. Avoid hardcoded visual values in components and stories when tokens exist.
5. Add Storybook foundation docs or MDX only after token imports render correctly.

If the product repo has no token system, ask whether to establish one before implementing components.

### 12. Storybook Foundations

Create or update foundations stories/docs for the token groups touched by this pass:

- colors: reference palettes, semantic roles, foreground/background pairings
- typography: font family, size, line-height, weight, display/body roles
- typographic composition: lockup gaps, hierarchy ratios, alignment roles, max line lengths, line-break behavior, and slot-specific type/color mappings when extracted
- spacing and layout density
- radius and shape
- elevation, borders, opacity
- motion duration, easing, and reduced-motion behavior when specified

Use the project's existing docs style. If none exists, create the smallest useful Storybook docs page that displays token names, rendered examples, and usage notes.

Foundation guides may use the product's Storybook docs folder, normally `stories/` or `src/stories/`. Keep these docs separate from component folders because they describe token systems rather than a single reusable component.

#### Fidelity mode for accessibility remaps

When `TOKEN_ARCHITECTURE.md` contains `Accessibility Remap Decisions` (authored values replaced by WCAG-compliant values at the `sys` layer), add an optional Storybook global toolbar so designers can review both renderings instead of concluding "the colors were changed":

- `fidelity: accessible` (default, the shipped state) — sys tokens resolve to the accessible values.
- `fidelity: authored` — only the remapped sys tokens are overridden back to their authored ref tokens, producing the Figma-faithful rendering for design review.

Recommended shape (adapt to the repo's renderer and preview conventions):

```ts
// .storybook/preview.ts
export const globalTypes = {
  fidelity: {
    description: "Token fidelity mode",
    toolbar: {
      title: "Fidelity",
      items: [
        { value: "accessible", title: "Accessible (shipped)" },
        { value: "authored", title: "Authored (Figma)" },
      ],
    },
  },
};
export const initialGlobals = { fidelity: "accessible" };
// decorator: set document.documentElement.dataset.fidelity = context.globals.fidelity
```

```css
/* tokens/tokens-fidelity-authored.css — one override per a11y-remap record, nothing else */
[data-fidelity="authored"] {
  /* a11y-remap D-56: authored #f14f2b -> accessible #e21e28 */
  --lp-sys-color-warning-text: var(--lp-ref-color-orange-55);
}
```

Rules: the override file contains only the remapped sys tokens, generated from the `a11y-remap` records; production builds never load it; every capture or parity report records which fidelity mode was active. Ship accessible, review either.

### 13. Component Implementation

For each selected component spec:

1. Read the component spec and its referenced tokens.
2. Resolve its evidence IDs through `STORYBOOK_SOURCE_TRACE.md`.
3. Confirm the component is the earliest unfinished item in `STORYBOOK_COMPONENT_QUEUE.md` whose dependencies are already done, reused, or explicitly blocked with an accepted decision.
4. Inspect the original source when available:
   - Figma node/page through Figma MCP, including screenshot when visual parity matters.
   - UI image/crop through local image inspection.
   - Frontend folder/prototype code for behavior, API shape, and existing implementation clues.
   - Rendered route/story for measured layout and states when runnable.
5. Search for an existing shared component with matching purpose or composition role, anatomy, behavior, and states or display modes.
6. Prefer reuse or extension over creating a new component.
7. Implement the selected framework's native public API—props/inputs, slots/children/content projection, events/outputs, variants, states or display modes, accessibility behavior, and responsive behavior—from the spec.
8. Apply the Figma export readiness contract: stable root naming, token-bindable CSS declarations, auto-layout-friendly structure, export-safe SVG/image handling, and explicit absolute-fidelity decisions when needed.
9. Resolve the story source URL from `STORYBOOK_SOURCE_TRACE.md` for the component.
10. Keep component styles token-backed. Do not reach directly into reference tokens from component CSS unless the extracted architecture explicitly allows it.
11. Create or update the component and story in a co-located folder using the selected framework's existing source, style, test, and story extensions.
12. Export the component through the repo's existing public API.

If the extracted spec lacks a necessary state or display mode, mark it blocked or implement only the documented states/modes. Do not invent undocumented visual variants as normative design-system behavior.

For typographic components / text lockups:

1. Implement them as editable display components, not raster images, unless the extraction explicitly says the artwork must stay raster.
2. Model observed text slots as props or children, such as kicker, headline, subhead, body excerpt, number, unit, caption, attribution, label, and value.
3. Preserve slot order, hierarchy ratio, text alignment, line-height, max line length, line-break behavior, responsive wrapping, and language/script behavior from the component spec.
4. Use semantic markup where practical, such as heading elements for heading lockups, `figure` / `blockquote` for quote lockups, and grouped text with accessible labels for metric or label/value lockups.
5. Mark interactive states as `not applicable` when the component is display-only, but still implement documented modes such as scale, density, emphasis, theme, alignment, overlay, and responsive variants.
6. Keep every slot style token-backed through `sys` and `comp` tokens; do not collapse distinctive lockup rules into generic heading/subheading CSS.

For a batch pass, keep implementation scoped to the selected batch. If a new primitive or API decision would change later batches, update the queue and implementation map before continuing.

### 14. Page Implementation

Use this section only when the user asks for product pages, composed screens, or page-level Storybook entries.

1. Confirm the required shared components already exist, are reused, or are explicitly accepted as blocked.
2. Place each new page in a dedicated page folder, normally `src/pages/<PageName>/`.
3. Keep the framework-native page/view source, optional repo-native styles, and Storybook story co-located using the selected target's extensions.
4. Compose the page from shared components and page-level layout only. Promote reusable subparts back into `components/<ComponentName>/` before using them in multiple pages.
5. Record page dependencies and verification separately from shared components in the implementation map and queue.

Do not place page stories in the root `stories/` folder unless the existing product uses that folder exclusively for page docs and the implementation map records the exception.

### 15. Story Coverage

Every new or changed shared component needs Storybook coverage:

- default appearance
- documented variants and sizes
- hover, focus-visible, active/pressed, disabled when interactive
- loading, empty, error, selected, expanded, or validation states when the spec defines them
- responsive or density stories when layout changes by viewport
- theme stories when the product supports multiple themes

Stories must mirror the component's confirmed state coverage list from the queue: every `evidenced` state gets a story, every `inferred` state gets a story only after the user confirmed it, and every `out-of-scope` state leaves a **visible** trace — a note in the story description, Autodocs page, or component doc saying the state was deliberately not built and why (for example "only the loaded state is granted by the source evidence"). Out-of-scope states must never just silently not exist; the next reader has to be able to tell "decided against" from "forgotten".

Display-only typographic components need stories for the documented modes instead of interaction states:

- default lockup with realistic copy
- short and long copy when line breaks or wrapping are part of the spec
- scale, density, emphasis, alignment, and theme modes when documented
- responsive viewport examples that prove max line length, wrapping, and slot gaps remain stable
- locale or script examples when the extraction documents language/script behavior

Every component story should carry the best source URL the trace can resolve:

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

Set this at the story meta level when all variants share the same source. Set it per story only when variants, states, or display modes map to different Figma nodes or source URLs. The bundled review helper reads `parameters.figmaSourceUrl`, `parameters.figma.url`, and `parameters.design.url` automatically for the Open source action.

Prefer existing story conventions inside the co-located component or page folder, but keep Autodocs enabled for every shared component story. In CSF stories, add `tags: ["autodocs"]` at the meta level unless the repo has a stricter local convention that produces an equivalent Autodocs page for that component. Use MDX only when the repo already uses it or the user asks for authored docs pages. Root `stories/` or `src/stories/` is reserved for foundation guides/docs, not new component stories.

When the Figma export addon is installed, every new or changed component should also have at least one export-ready story with a stable root, fixed/default state, realistic content, source URL parameters, and no preview-only wrapper inside the exported component bounds.

### 16. Documentation Sync And Backfill

Every new or changed shared component must leave the design-system documentation synchronized with the implementation state.

Read `references/documentation-sync.md` when the user asks to audit/backfill docs, when the current pass creates or changes a component, when the checker reports missing/stale docs, or when a component doc must be generated from code, stories, or a user brief.

Run the checker after product discovery and again before closeout:

```sh
node <skill-root>/scripts/check_component_docs.mjs <product-repo-root> --design-system-root <design-system-package-root>
```

Use `--write` to create missing component doc drafts when the user asked for automatic backfill or when the current pass created the component:

```sh
node <skill-root>/scripts/check_component_docs.mjs <product-repo-root> --design-system-root <design-system-package-root> --write
```

Treat checker output as an implementation checklist, not as a substitute for reading the component spec. Do not silently promote implementation-derived docs to source-of-truth docs. If implementation contradicts an extracted component spec, stop and ask whether to update the extraction/spec or adjust the implementation.

### 17. Verification

Run the cheapest reliable checks available:

- selected framework/meta-framework build, typecheck, or compile check and confirmation that Storybook's configured renderer/builder match the recorded decision
- Storybook build or relevant story preview
- Figma export addon config check when installed, plus `install_figma_export_addon.mjs --check` to confirm the installed addon version matches the bundled one
- Figma import plugin check when export tooling is installed: run the importer script's default mode to confirm the bundled manifest and `main` runtime exist and the stamped version matches the plugin `package.json`; for repo copies also confirm the script reports them current and that `.git` and `node_modules` were not copied
- component documentation check with `scripts/check_component_docs.mjs`; use `--strict` for CI-style failure when missing docs or inventory entries should block completion
- lint and typecheck
- unit or interaction tests for changed components
- **design parity report** for every component or page whose source trace resolves Figma or image evidence: invoke `ui-pixel-align-report` against the best resolved source, write the report to `reports/design-pixel-align/<component>/`, and record the report path in the implementation map. Feed it the package's `a11y-remap` records (as `accessibilityRemaps`) so sanctioned accessibility replacements classify as `required-adaptation`, and note which fidelity mode was captured when the toolbar exists. Use `ui-compare-to-reference` afterwards only when the user wants the drift fixed, not just documented.
- **font environment preflight before any screenshot comparison**: confirm the rendering environment loads the same fonts as the source platform and record what actually loaded. A fallback font can shift ink height ~30% and fabricate size drift; if fonts cannot be aligned, mark the comparison `fontEnvironment: mismatched`, treat type-related size deltas as untrusted, and never "fix" tokens from them.
- text layout checks for typographic components, including overflow, wrapping, line breaks, slot gaps, and responsive width behavior
- token audit or CSS variable scan when available
- Figma export payload validation for changed component stories when JSON can be copied from the addon:
  `node <skill-root>/scripts/validate_figma_export_payload.mjs <payload.sbfx.json>`

If Storybook is runnable, open the relevant stories and inspect rendered states or display modes before calling the pass done. When the selected component has Figma evidence, do not stop at an eyeball comparison: produce the `ui-pixel-align-report` parity report and review its `strict` drift findings — each one ends the pass as fixed or as an adjudicated, recorded decision (see the Design Parity Gate). When the Figma export addon is installed, confirm the Storybook toolbar loads without console errors, the `figmaExport` toolbar can be toggled on, the review overlay appears, and Open source is available for at least one component story with a resolved source URL.

When the Figma export JSON can be captured, validate it before marking the component done. Fix missing token bindings, generic node names, unstable bounds, and accidental absolute-layout output in component code/CSS first; record any accepted warnings in the implementation map.

For large inventories, verify per batch and keep the full-library check for milestone boundaries. Do not wait until dozens of components are complete before running Storybook build or typecheck if those checks are available.

### 18. Closeout

Update the implementation map and component queue with completed files, blocked items, token decisions, and verification results.

Report:

- design-system package path used
- selected app/workspace root, framework/meta-framework, Storybook renderer/builder, decision evidence or user approval, and migration status
- source trace path and original sources inspected
- dependency plan path and current completed/blocked component order
- product files changed
- co-located component/page folders created or updated
- design-system docs created or updated, including provenance (`extracted`, `brief-derived`, or `implementation-derived`)
- tokens reused or added
- bundled Figma export addon installed/configured or blocked reason
- Figma import plugin confirmed (version, distribution channel, and manifest path) or blocked reason, including the once-per-machine Figma Desktop setup steps
- Figma export readiness checks run, payload validator warnings, and accepted less-editable export decisions
- components reused, extended, or created
- stories added or updated
- state coverage outcome per component: which states shipped, which were confirmed out-of-scope, and where the visible out-of-scope note lives
- design parity reports produced, their paths, and any `strict` drift findings that remain open or were adjudicated
- batch completed and next queued batch, when applicable
- capability matrix outcome: core Storybook status, bundled exporter compatibility, compatible importer payload/manifest status, and whether the template-only Prototype Inspector, `prototypeFlowLayout.ts`, and Static Flow contract are available for `storybook-product-prototype`
- checks run and any failures
- next recommended component pass, if the inventory is not complete

## Gates

### Framework Decision Gate

Honor an explicit current-user or approved target-specific handoff architecture choice before repo inference. Otherwise use evidence from the selected app/workspace root. When one existing stack is coherent, inherit it and record the evidence without asking the user to repeat the framework.

Before any scaffold, install, or architecture-changing edit, ask when the target is greenfield, multiple app roots are plausible, evidence conflicts, framework/renderer/builder remains ambiguous, or migration is proposed. Do not migrate a framework, replace an existing Storybook renderer/builder, or create a separate React verification workspace without explicit approval. Read `references/framework-adaptation.md` for the decision record and capability matrix.

### Extraction Package Gate

Do not treat guesses, unrecorded screenshots, or ad hoc visual impressions as source of truth in this skill. If a component or token is not documented in the extracted package, either defer it or ask to expand the extraction first.

### Source Trace Gate

Before implementing a component, resolve its extractor evidence IDs to original sources when those IDs exist. If the source trace shows Figma, image, frontend-folder, or rendered-route evidence, inspect at least the sources needed for the current component batch or record why they are unavailable. Do not implement a new component solely from an unlisted Figma node, image, or code folder; mark it `needs-extraction` instead.

### Token Gate

Do not hardcode colors, spacing, radii, typography, typographic composition values, shadows, or motion values in shared components when equivalent tokens exist. If a required token is missing, ask whether to add it at the correct layer before continuing.

### Component Gate

Do not create a new shared component before checking the product's existing components and stories. If a candidate is close to an existing component, extend the existing one or ask whether to make it a variant.

Do not flatten extracted typographic lockups into generic heading/subheading markup. If the spec documents reusable slot hierarchy, spacing, alignment, line-break behavior, or visual modes, preserve those as a dedicated component or an explicit variant of an existing typographic component.

Do not place new component stories in a detached root `stories/` or `src/stories/` folder. New shared components use `components/<ComponentName>/<ComponentName>.stories.*`; foundation docs are the only default exception.

### Dependency Order Gate

Do not start a composed component while `STORYBOOK_COMPONENT_PLAN.md` lists unfinished dependencies for it. Build, reuse, or explicitly block the dependency first, then update the queue and implementation map before moving to the composed component. Do not mark a component `done` until every listed dependency is `done`, `reused`, or recorded as an accepted blocked decision.

### Checkpoint Gate

Do not move from one component to the next until the current component has a queue status, dependency-plan status, implementation-map entry, story source URL decision, component doc status, and verification-log entry. For long runs, treat each component as a checkpoint boundary: finish or block the current component cleanly before reading the next spec.

### Batch Gate

Do not attempt to implement a large inventory in one pass. When implementing more than one component, create or update the component queue from `STORYBOOK_COMPONENT_PLAN.md`, choose a bounded dependency-adjacent batch, and leave the remaining work queued.

### Figma Export Addon Gate

Do not silently skip addon setup when React + Vite + Storybook 10 or Vue 3 + Vite + Storybook 10 is detected coherently. Install and configure the same package before component implementation unless the user opts out. For other Storybook 10 combinations, install core export only when the detector marks `coreExport=supported`; never wire unsupported review, comments, or persistence capabilities.

Treat unknown or conflicting renderer signals as a pre-mutation blocker. Use `--renderer` only after resolving which detected target is authoritative. Preserve the product framework: the addon has one renderer-neutral preview runtime and does not justify a React/Vue migration or a renderer-specific fork.

Use the bundled addon installer instead of GitHub dependency specs. If `@storybook/icons` is missing and package-manager install cannot reach the registry, record the addon as blocked with that dependency reason.

Keep project-specific addon settings in `.storybook/figma-export.config.ts`. Do not patch the bundled addon with product Figma file URLs, node overrides, token prefixes, theme globals, local image imports, or story sorting rules.

Do not hand-edit the installed tarball, its lockfile entry, or a legacy vendored addon directory to change addon behavior. Ship addon changes by refreshing the skill's vendored asset with a version bump and re-running the installer; use `--check` to detect outdated installs.

### Figma Import Plugin Gate

Do not present the Storybook-to-Figma workflow as ready without both a compatible exporter payload and an importer that is confirmed via the skill-folder manifest, a committed repo copy, the template workspace, or explicitly blocked with a reason. The importer alone does not provide renderer compatibility.

Choose the importer distribution channel by audience and record it: the skill-folder manifest serves a solo developer machine; a committed repo copy (`--copy-to figma/storybook-code-to-design`) is the default for teams whose designers have no agent skill folder — never point a designer at a hidden skill path without the file-dialog hint. Keep an existing repo copy current: when the script reports it outdated, refresh with `--copy-to ... --force` and commit rather than leaving stale plugin files as the team channel; delete a repo copy only when every designer on that repo loads a skill-folder manifest instead. If the bundled template already provides `figma/storybook-code-to-design/manifest.json`, record that path instead of duplicating another importer.

Do not copy `.git`, `node_modules`, Storybook build output, or unrelated local artifacts when making a fallback copy, and do not omit `code.js` because `manifest.json` uses it as the Figma runtime entry. Do not hand-edit `PLUGIN_VERSION` or the UI version badge; they are stamped from the plugin `package.json` by its `prebuild` script.

### Figma Export Readiness Gate

Do not treat Storybook visual parity as complete when the component would export to unmaintainable Figma JSON. For components covered by the Figma export addon, keep component DOM, CSS, tokens, and story roots aligned with `references/figma-export-readiness.md`.

Do not mark a component complete when exportable visual properties use raw values instead of available CSS variable tokens, when exported node names are generic tags because no `data-component`/prefixed class is available, or when an auto-layout-friendly component accidentally exports as absolute layout without an accepted fidelity reason.

Do not patch generated `.sbfx.json` payloads to hide implementation problems. Fix the Storybook component, token usage, story metadata, or addon config, then regenerate the payload.

### Storybook Template Gate

Do not copy the bundled React/Vite `storybook-template` into a product repo without the user selecting that stack or approving a separate workspace. Do not use it as an implicit replacement for product-native Storybook. A separate React workspace does not render or validate Vue or other non-React product components, and it must not be reported as product-component parity evidence.

Do not install the template over existing files unless the user explicitly accepts the overwrite risk. Prefer a fresh target root or subfolder when the product has existing `package.json`, `src/`, `tokens/`, `.storybook/`, or design-system files.

Do not copy local template development artifacts such as `.git`, `node_modules`, Storybook build output, `.agents`, `.claude`, `.cursor`, or `.spectra` into the product repo.

### Story Gate

Do not mark a shared component implementation complete without a story, example, or documented catalog entry covering its main states or display modes.

Do not mark a component or page complete until its story is co-located in that component/page folder, unless the implementation map records an explicit product-convention exception.

Do not mark a shared component complete until its Storybook story opts into Autodocs, normally with `tags: ["autodocs"]` on the component story meta. If the project uses a global or MDX-based Autodocs convention instead, record the equivalent mechanism in the implementation map and verify the component has a generated docs entry.

### Documentation Gate

Do not mark a shared component complete until its design-system component doc exists, its inventory entry is present or explicitly marked out-of-scope, and the implementation map records doc provenance. If the doc is generated from code/stories rather than extracted design evidence, mark it `implementation-derived` and `needs-review`.

Do not overwrite extracted component specs with implementation-derived details without preserving the original evidence and recording the conflict.

### Story Source URL Gate

Do not mark a component story complete until the best resolved source URL from `STORYBOOK_SOURCE_TRACE.md` is written to story parameters, or until the implementation map records that no URL source exists. Prefer `parameters.figmaSourceUrl` for Figma; use `parameters.design.url` for other web sources. Local screenshots and frontend folders are implementation evidence, but they are not Open source URLs unless the product serves them through a stable URL.

### Design Parity Gate

Do not mark a component or page `done` when its source trace resolves Figma or image evidence but no `ui-pixel-align-report` parity report exists for it, and do not mark it `done` while that report contains findings with `parityClass: "strict"` and `status: "open"`. Every strict drift finding ends the pass in exactly one of two states: fixed and re-measured, or adjudicated — `accepted` with a recorded reason in the report and the implementation map.

The gate makes differences visible and adjudicated; it does not mandate blind Figma copying. Recorded accessibility remaps classify as `required-adaptation` and never block. A `mismatched` font environment invalidates type-metric findings rather than the component — record the mismatch, align the fonts, and re-run before treating those findings as real. If the report cannot be produced (source unavailable, capture blocked), record the blocker in the implementation map instead of skipping silently.

### State Coverage Gate

Do not start implementing a component or page before its state coverage list exists and the user confirmed it — every plausible state marked `evidenced`, `inferred`, or `out-of-scope`. Do not mark it `done` until its stories match that list and every `out-of-scope` state has a visible note in the story description, Autodocs page, or component doc explaining the scope decision. "Not evidenced, so not built" is correct only when it was agreed up front and stays visible afterwards.

### Adoption Gate

Do not rewrite product screens to use the new library until the relevant shared components are implemented and documented, unless the user explicitly requests route adoption as the current pass.

## Resource Map

- `scripts/trace_sources.mjs`: scans extractor output and writes `design-system/STORYBOOK_SOURCE_TRACE.md` with Figma, image, frontend-folder, and rendered-route sources.
- `scripts/plan_component_batches.mjs`: infers dependency order from component inventory/specs and writes `design-system/STORYBOOK_COMPONENT_PLAN.md`; use `--queue` to sync `design-system/STORYBOOK_COMPONENT_QUEUE.md`.
- `scripts/check_component_docs.mjs`: audits product component folders against `design-system/components/*.md`, inventory entries, stories, token usage, and review status; use `--write` to create implementation-derived missing-doc drafts.
- `scripts/install_agent_skill.mjs`: installs this skill into Claude Code, Codex, or Cursor user/project skill directories.
- `scripts/generate_figma_export_config.mjs`: infers product-specific addon settings and writes `.storybook/figma-export.config.ts`.
- `scripts/install_figma_export_addon.mjs`: detects renderer/builder/Storybook major, reports per-capability support, blocks ambiguity before mutation, packs/installs the versioned local addon, and generates full React/Vue Vite or core-only renderer-neutral Storybook wiring; supports `--renderer`, `--json`, `--configure-only`, `--skip-configure`, and `--check`.
- `scripts/install_figma_import_plugin.mjs`: confirms the bundled Figma importer — version, skill-folder manifest path with hidden-folder dialog hint, once-per-machine Figma Desktop steps, and repo-copy freshness checks; `--copy-to` creates or refreshes the committed repo copy that serves as the team distribution channel.
- `scripts/install_storybook_template.mjs`: copies the bundled Storybook template into a fresh target root or subfolder, refuses collisions by default, and runs the template initializer.
- `scripts/validate_figma_export_payload.mjs`: validates copied Storybook Figma export JSON for token binding, node naming, bounds, layout strategy, and editability issues.
- `references/agent-installation.md`: target paths and verification checklist for Claude Code, Codex, and Cursor installation.
- `references/tooling-updates.md`: three-layer distribution model (machine/project/Figma), the update journey for existing skill users, version visibility, the user-facing reporting checklist, and the maintainer release flow for the bundled addon and importer.
- `references/documentation-sync.md`: detailed rules for auditing, backfilling, provenance-labeling, and closing out design-system component docs.
- `references/framework-adaptation.md`: framework/root evidence order, ask-vs-infer and migration gates, renderer/builder selection, official CLI fallback, framework-native file conventions, decision record, and capability matrix.
- `references/figma-export-readiness.md`: component DOM/CSS/token/story rules for editable Figma JSON/importer output.
- `references/figma-export-review-setup.md`: troubleshooting and required wiring for the review overlay and Open source action.
- `assets/storybook-component-queue-template.md`: queue template for large component inventories.
- `assets/figma-export-addon/`: vendored `@harrychuang/storybook-addon-figma-export` package, sourced from `https://github.com/harrychuang/storybook-addons/tree/main/packages/figma-export`.
- `assets/figma-plugin-code-to-design/`: bundled Figma Desktop development plugin that imports Storybook export JSON into editable Figma nodes; copy it with `scripts/install_figma_import_plugin.mjs`.
- `storybook-template/`: optional React + Vite + Storybook 10 bootstrap template with token checks, foundation docs, component catalog checks, Figma export review wiring, a local Figma importer manifest, and Prototype UI Flow support.
- `ui-pixel-align-report` (sibling skill): produces the screenshot-backed parity report this skill's Design Parity Gate requires — it documents and classifies drift without editing code. Use it during Verification for every component with Figma or image evidence; pass it the package's evidence map, source trace, and `a11y-remap` records, and record the returned report path in the implementation map.
- `ui-compare-to-reference` (sibling skill): applies the visual fixes. Use it after (or instead of) the report when the user wants drift repaired — it consumes the `findings.json` that `ui-pixel-align-report` produces. Report = document and adjudicate; compare = fix.
