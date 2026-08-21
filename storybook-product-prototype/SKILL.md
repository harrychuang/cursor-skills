---
name: storybook-product-prototype
description: Create PRD-led Storybook product prototypes and frontend implementation handoff docs for web or app development, with deterministic fixtures, typed UI Flow route and transition metadata, API/data contracts, interactive prototype stories, template-compatible Static Flow export stories, and an optional Prototype Inspector runtime for Story/Docs/UI Flow/Data review. Use after design-system-to-storybook or independently when turning a product idea into PRD, UI Flow, Data Spec, Production Handoff, Acceptance Criteria, and a clickable Storybook prototype; when scaffolding a prototype folder; when preparing engineer or AI collaboration from design to frontend implementation; when documenting API/data contracts without real data wiring; when aligning UI Flow with the design-system-to-storybook storybook-template contract; when installing a Storybook UI Flow viewer; or when validating prototype and handoff docs across React Storybook projects.
---

# Storybook Product Prototype

Use this skill to create a product prototype workflow that starts with PRD and flow decisions, then generates docs, deterministic fixtures, typed route metadata, a clickable Storybook story, a Static Flow export story, and frontend implementation handoff guidance for web or app development. The skill is project-agnostic, but it expects a React/TypeScript Storybook project or a project that can adapt the generated files.

When the target was created or upgraded by `design-system-to-storybook/storybook-template`, treat that template's Prototype Inspector, `prototypeFlowLayout.ts`, `parameters.prototype`, `prototypeRoute`, `prototypeFlowPreview`, and Static Flow story pattern as the canonical UI Flow contract.

## First Actions

1. Detect the target repo root and Storybook setup.
2. Read existing prototype or page conventions if present: `src/pages/prototypes`, `src/pages`, `src/screens`, `src/components`, `.storybook`, and nearby `*.stories.*` — and identify design-system sources: `design-system/` artifacts from design-system-to-storybook, `package.json` UI dependencies, the Storybook `index.json`, and token/theme CSS imported by `.storybook/preview.*`.
3. If the user is still exploring the product idea, run a discussion first and ask one focused product question at a time. Do not create files until route, data, platform, and acceptance scope are clear.
4. If the user asks to scaffold immediately, use `scripts/scaffold_prototype.py` and then fill the generated docs from the product brief.
5. If the target project already has a prototype inspector, `prototypeFlowLayout.ts`, Static Flow story, or `parameters.prototype` convention, adapt to it instead of creating a second contract.
6. If the target project has no prototype inspector and the user asks for UI Flow runtime review, install the bundled Prototype Inspector with `scripts/install_prototype_inspector.mjs`; the installer also adds the shared flow layout helper expected by Static Flow exports.
7. If the user only wants metadata or scaffolding, still generate `parameters.prototype` and document that visual UI Flow review requires the runtime viewer.

## Reference Loading

Read only the reference needed for the current step:

- Product discovery and docs structure: `references/prototype-standard.md`
- PRD conversation and requirement shaping: `references/prd-workshop.md`
- Component and token discovery before composing UI: `references/component-discovery.md`
- Prototype visual quality and token usage: `references/visual-quality.md`
- Route, node, transition, and trigger rules: `references/ui-flow-contract.md`
- Storybook story and metadata integration: `references/storybook-integration.md`
- Fixture and API replacement rules: `references/data-contract.md`
- Frontend implementation handoff for web/app development: `references/production-handoff.md`

## Workflow

### 1. Frame The Product

Before writing implementation files, confirm:

- Product name and owner.
- Primary user and problem.
- Entry route and initial state.
- Target production surfaces: web, native app, hybrid app, or shared component package.
- Required routes and branch states.
- Required user-triggered transitions.
- Existing components to reuse.
- Fixture data needed by each route.
- Non-goals and external systems that must remain mocked.
- Acceptance criteria for Storybook review.

Ask only for answers that would change the route model, data contract, or acceptance criteria.

### 2. Discover Components And Tokens

Read `references/component-discovery.md`, then:

- When the `design-system-governance` skill is available, run its discovery phase and honor its token and composition gates.
- Work down the discovery tiers (design-system-to-storybook artifacts, Storybook index/stories, source exports), optionally via `scripts/inventory_components.py <repo-root>`.
- Always run the token scan and record the actual token prefix in use.
- Record the results as the Component Map, Component Gaps, and Token Binding sections of `docs/UI_SPEC.md`.
- Do not write `docs/UI_SPEC.md` content or prototype CSS before this completes.

### 3. Generate Docs First

Create these docs before composing UI:

- `docs/PRD.md`
- `docs/FLOW_SPEC.md`
- `docs/UI_SPEC.md`
- `docs/DATA_SPEC.md`
- `docs/PRODUCTION_HANDOFF.md`
- `docs/ACCEPTANCE.md`
- `docs/IMPLEMENTATION_GUIDE.md`

The docs are the durable handoff. They must be specific enough for another engineer or AI agent to continue without private conversation context. `PRODUCTION_HANDOFF.md` translates prototype choices into frontend implementation guidance; it must not claim Storybook-only code, fixtures, or data sources are production-ready.

### 4. Model UI Flow Before UI

Create `<featurePrototypeFlow>.ts` before the main React surface.

Rules:

- Use stable route ids, not visible labels.
- Add every visible or reachable screen to the route metadata.
- Add flow-only nodes for decision, success, error, loading, or async branch states that are not product screens.
- Add every route-changing user action to the transitions array.
- Use stable triggers such as `quoteRow.click`, `submitButton.click`, `bottomNavigation.watchlist`, or `settingsSheet.dismiss`.
- Use `flowLine: "key"` only for transitions that should be drawn on the simplified UI Flow canvas; keep the full transition list in metadata.
- Add optional `sourceAnchor: { x, y }` to a transition only when a Static Flow export needs a stable edge origin for future Figma export layout. Treat `x` and `y` as route-card-relative ratios from `0` to `1`.

### 5. Create Deterministic Data

Create `<featurePrototypeData>.ts`.

Rules:

- Keep all prototype data local and deterministic.
- Use existing component prop types where possible.
- Include branch, empty, loading, and error fixtures when those states are in scope.
- Document fixture ownership and future API replacement points in `DATA_SPEC.md`.
- Do not call live product APIs from a prototype.
- Define API and data shapes for frontend implementation, but leave real data source, auth, backend client, cache, storage, and persistence wiring to the receiving engineer or AI in the production repo.

### 6. Compose The Storybook Prototype

Create the React prototype, Static Flow export, CSS, metadata, stories, and index files.

Rules:

- Compose component-first from the Component Map in `docs/UI_SPEC.md`: every screen region renders its mapped existing component via import; local markup only for Component Gaps regions.
- Keep route state explicit and typed by route ids.
- Wire clicks through route mappings and transition triggers, not rendered text.
- Keep prototype-only CSS scoped under a feature root class.
- Write CSS per `references/visual-quality.md`: one `--proto-*` alias block bound to the Token Binding record; raw values only as alias fallbacks; interactive controls ship hover/focus-visible/active/disabled states; in-scope routes render loading/empty/error fixtures.
- Attach the complete meta object to `parameters.prototype`.
- Support `prototypeFlowPreview=true` and `prototypeRoute=<route-id>` query modes for iframe route previews.
- Add `data-prototype-route-preview="true"` on the route preview shell. Keep `data-prototype-root="true"` on the prototype root for older viewers.
- Create `<FeaturePrototypeFlowExport>.tsx` and `<FeaturePrototypeFlowExport>.stories.tsx` with `StaticFlow`, reading layout from `../prototypeFlowLayout` and rendering route cards from the same flow metadata.
- Add `figmaExport.flowStoryId` to the prototype meta object so export tools can locate the Static Flow story.

### 7. Prepare Frontend Implementation Handoff

Create or update `docs/PRODUCTION_HANDOFF.md`.

Rules:

- Fill `Design System Continuity` with the token namespace record, the Component Map echo, and locally created promotion candidates.
- State whether production is web, app, hybrid, or cross-platform.
- Map prototype route ids to production pages, screens, navigation destinations, or shared components.
- Separate Storybook-only behavior from reusable production behavior.
- For web, document routing, rendering mode when known, responsive constraints, accessibility, analytics, and browser-specific behavior.
- For app, document screen ownership, navigation stack, safe-area/viewport constraints, permissions, offline behavior, and platform gestures when relevant.
- Convert deterministic fixtures into API/data contract placeholders with request, response, error, state, and ownership notes when known.
- List frontend state handling for loading, empty, error, disabled, optimistic, retry, permission, and async branch states that matter.
- Define handoff acceptance separately from Storybook acceptance and from final production integration acceptance.
- State integration ownership: this skill owns UI behavior, fixtures, and contracts; the receiving implementation owns real APIs, data sources, auth, backend clients, storage, persistence, and environment-specific wiring.
- Record open product, design, API, platform, or security decisions instead of inventing them.
- Keep `Review Status` at `pending` until the team reviews the Storybook demo and confirms the product direction; `--handoff-ready` fails while it is `pending`.

### 8. Promote Confirmed Components Into The Hub

The Storybook project is the durable prototype and component hub; production targets vary and may have no component library. This step usually runs after the first validation and demo pass (step 10) has given the team something to review. After the team confirms the product direction, and before treating the handoff docs as final:

1. Revisit `Component Gaps`: identify gap components the confirmed scope needs, especially ones that recur across routes or prototypes.
2. Ask the user which candidates to promote into the hub's shared component library now. Promotion is an explicit decision, not an automatic step.
3. Promote approved candidates with the `design-system-to-storybook` flow when that skill is available — hand each candidate in as an explicit component brief, since it has no extracted design-system spec; otherwise build the shared component to the same bar: its own file, typed props, token-bound styles, and its own stories.
4. Update the prototype to import the promoted component, move its entry from `Component Gaps` to the `Component Map`, and re-run validation.
5. Record the outcome in `Design System Continuity`: `promoted` candidates with their shared-component path and story id; remaining `local` candidates with their prototype file path and consuming routes/regions.

Skip promotion when the team has not confirmed the direction yet, when a gap component is a one-off, or when the user declines; unpromoted candidates remain valid handoff input as local markup.

### 9. Install The Runtime Viewer When Requested

If the project needs the Storybook toolbar and Docs/UI Flow/Data runtime, run:

```sh
node <skill-root>/scripts/install_prototype_inspector.mjs --project-root <repo-root>
```

Use `--force` only when intentionally replacing an existing `.storybook/prototype-inspector` folder or project-level `src/pages/prototypes/prototypeFlowLayout.ts`; re-running with `--force` is also how existing installs pick up bundled addon updates. The installer copies the bundled addon, adds its preset to `.storybook/main.*`, and installs the shared flow layout helper used by the addon and Static Flow exports.

The inspector styles itself through a `--pi-*` token layer that reads `--sbt-*` tokens when the project defines them and falls back to built-in neutral light/dark values otherwise. When the project uses a different token prefix (recorded in the Token Binding discovery), pass `--token-prefix <prefix>` (for example `--token-prefix md`) so the inspector binds to the project's tokens while keeping the fallbacks.

### 10. Validate

Run the checks that fit the target repo:

- `python3 <skill-root>/scripts/validate_prototype.py <prototype-folder>` — add `--strict-style` to turn validation warnings (component map, token discipline, CSS scope, doc coverage) into errors.
- Project typecheck, usually `npm run typecheck`
- Storybook render or build, usually `npm run storybook` or `npm run storybook:build`
- Manual Storybook review of Story, Docs, Data, and UI Flow if the project has a prototype inspector.
- The UX self-review pass from `references/visual-quality.md`: hierarchy, interaction states, contrast, and token binding checked against the rendered stories.
- Manual `StaticFlow` story review when future Figma export or design review depends on a stable flow artifact.
- Handoff review with `--handoff-ready` before using the docs as an engineering or AI implementation brief: it also cross-checks doc route/fixture references against `*Flow.ts` and `*Data.ts` and requires a `confirmed` Review Status. `--production-ready` is accepted only as a backward-compatible alias.

Do not mark the prototype complete unless docs, flow metadata, fixture data, frontend handoff, story metadata, and interactive behavior describe the same product behavior.

## Scaffolding

Use the scaffold script when creating a new prototype from scratch:

```sh
python3 <skill-root>/scripts/scaffold_prototype.py "Portfolio Alerts" \
  --target-root src/pages/prototypes \
  --owner "Product Team"
```

The scaffold creates a folder based on the feature name, adds `prototypeFlowLayout.ts` to the prototypes root when needed, and fills template tokens. After scaffolding, replace the generated bracketed guidance with concrete product content before implementation.

## Quality Bar

- The prototype is a clickable product flow, not a static screenshot recreation.
- Every screen region maps to a discovered design-system component in the UI_SPEC Component Map, or has an explicit Component Gaps entry.
- Prototype and Static Flow CSS consume `--proto-*` aliases bound to recorded project tokens; interactive controls ship hover/focus-visible/active/disabled states; in-scope routes render loading/empty/error.
- PRD, UI Spec, Flow Spec, Data Spec, Acceptance Criteria, and Storybook metadata stay consistent.
- Production Handoff maps the prototype to web/app frontend implementation work without treating Storybook-only code, fixtures, or data sources as production integration.
- Handoff docs carry a `Review Status` confirmed by the team demo review before they are used as an implementation brief.
- Team-confirmed, recurring gap components are promoted into the hub's shared component library or recorded as `local` promotion candidates with file paths.
- UI Flow is generated from route, flow-node, and transition metadata.
- UI Flow route cards preview the correct route through `prototypeRoute` and `prototypeFlowPreview`.
- Static Flow export uses the same metadata and saved inspector layout as the runtime UI Flow.
- `figmaExport.flowStoryId` points to the `StaticFlow` story for future Figma export automation.
- Fixture data is deterministic and local.
- Storybook `parameters.prototype` remains the review contract.
- Runtime UI Flow rendering is provided by the bundled Prototype Inspector when installed, or by an existing project-specific viewer when present.
