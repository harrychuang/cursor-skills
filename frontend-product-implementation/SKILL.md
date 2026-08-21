---
name: frontend-product-implementation
description: "Implement framework-agnostic frontend products and production features from PRD, UI Flow, UI Spec, Data Spec, Acceptance, Implementation Guide, and PRODUCTION_HANDOFF docs. Use when building a web or app frontend from 0 to 1, adding a route, screen, interface, or feature to an existing product, translating Storybook prototype handoff docs into production code, creating typed route/component/data-adapter work, or continuing after storybook-product-prototype. Resolve the target root and runtime architecture before greenfield scaffolding, inherit a clear existing stack without re-asking, ask when targets conflict or a migration is implied, and follow framework-native conventions rather than assuming React. Always follow design-system-governance: discover tokens, grid, motion, i18n, and shared components first; reuse existing components; stop for approval before creating missing tokens or shared components. When the target has no token system and the user approves establishing one, follow the token-bootstrap reference to port a minimal token subset from the prototype design-system source."
---

# Frontend Product Implementation

Use this skill to turn frontend handoff documents into working product code in a real repo, independent of framework. It supports two delivery modes:

- Greenfield: create a new frontend product from 0 to 1.
- Existing product: add a new interface, route, screen, or feature to an existing app.

This skill owns frontend implementation only. When real API clients, auth, persistence, storage, or environment wiring are not explicitly provided, create typed contracts, deterministic fixtures, and mock adapters instead of inventing production integrations.

## Required Companion Skill

Before implementing UI, load and follow `$design-system-governance`.

Apply its Phase 0 discovery and gates as mandatory:

- Discover token naming, token layers, grid/layout, motion tokens, shared components, Storybook, and i18n before writing UI.
- If the project has no token system, stop and ask whether to establish one first; if the user approves establishing one, follow `references/token-bootstrap.md`.
- If a required token is missing, ask: `找不到對應的 design token（sys/comp 層）。是否要先建立這組 token，再繼續元件開發？`
- If a required shared component is missing, ask: `目前既有元件無法完整組裝此組件。是否要先建立新的共用子元件，再繼續？`
- Do not add hardcoded visual values, one-off inline child components, or display text outside the project i18n source.

## Reference Loading

Read only the reference needed for the current step:

- Runtime architecture resolution and migration gates: `references/runtime-architecture.md` (always read first)
- Handoff docs and input contract: `references/handoff-ingestion.md`
- Greenfield and existing-product implementation flow: `references/implementation-workflow.md`
- Token bootstrap for a target with no token system: `references/token-bootstrap.md` (read only when governance discovery finds no token system and the user approves establishing one)
- Verification and final reporting: `references/verification-reporting.md`

## First Actions

1. Identify the exact target app/package root and whether the request is greenfield or existing-product work.
2. Read `references/runtime-architecture.md`.
3. Locate handoff docs, usually:
   - `PRD.md`
   - `FLOW_SPEC.md`
   - `UI_SPEC.md`
   - `DATA_SPEC.md`
   - `PRODUCTION_HANDOFF.md`
   - `ACCEPTANCE.md`
   - `IMPLEMENTATION_GUIDE.md`
4. Read `PRODUCTION_HANDOFF.md` first when present, then cross-check PRD, flow, UI, data, and acceptance docs.
5. Inspect target-root and handoff evidence, then create the required runtime architecture decision record.
6. Resolve the architecture gate before implementation:
   - Greenfield: treat explicit scaffold-affecting choices in the current request as confirmation; otherwise ask only for unresolved choices before running a scaffolder, installing dependencies, or generating app code.
   - Existing product with one clear, internally consistent stack: inherit and record it without asking the user to repeat the choice.
   - Multiple roots, conflicting evidence, or a requested re-platform: stop and ask for the unresolved decision or migration approval.
7. Load and apply `$design-system-governance` before any UI implementation.
8. Inspect the selected root's design-system and product patterns before writing code: routes/screens, component library, tokens, i18n, data/API patterns, tests, and Storybook.
9. Build an implementation map that contains the runtime architecture decision record and maps handoff routes/states/data contracts to the selected repo files and components.
10. Stop for user approval at design-system governance gates before creating missing tokens or shared components.

## Implementation Rules

- Use existing design-system components and tokens first.
- Treat React, Vue, Angular, Svelte, web components, meta-frameworks, and other supported stacks as peers; never select React merely because an example or prototype used it.
- Follow the selected framework's native component, reactivity/state, routing, rendering, styling, test, and file conventions.
- Add product surfaces by following the selected root's existing routing, screen, state, i18n, and test conventions.
- Treat a feature request as authorization for the feature, not for a framework, renderer, build-tool, language, package-manager, routing, state, styling, or repository migration.
- Do not scaffold, install dependencies, or change runtime architecture until the architecture decision record is resolved at the level required for the current mode.
- Use deterministic fixtures and mock adapters when real data sources are not in scope.
- Preserve handoff route ids and transition triggers in implementation names, tests, comments, or metadata where useful for traceability.
- Implement loading, empty, error, disabled, permission, optimistic, retry, and async branch states when documented.
- Keep Storybook or regression stories when the repo has Storybook; add or update stories for changed shared components.
- Do not create new shared components, tokens, or visual semantics without approval.
- Do not wire real API clients, auth, storage, persistence, or environment-specific behavior unless the user explicitly asks and the repo provides the pattern.
- Update implementation notes or docs when the production code intentionally diverges from handoff docs.

## Greenfield Mode

For a new product from 0 to 1:

1. Draft the complete runtime architecture decision record from explicit user requirements and handoff evidence; do not default to the skill author's preferred stack.
2. Treat explicit choices in the current request as confirmation; present only unresolved choices and obtain confirmation of the target root, platform, framework and version policy, rendering model, build tool, language, package manager, and other scaffold-affecting decisions.
3. Do not run a scaffolder, install dependencies, or generate app code until that confirmation is recorded.
4. Determine whether a design system or component package is provided.
5. If no design system exists, stop and ask whether to establish one or use an existing package/template.
6. Create the smallest production-like, framework-native app structure that can host the documented routes/screens.
7. Add token/i18n/component infrastructure before page implementation.
8. Implement routes/screens from the handoff docs using typed contracts and deterministic data adapters.
9. Add verification scripts and tests appropriate to the confirmed stack.

## Existing Product Mode

For a feature in an existing product:

1. Inspect the selected root's manifests, lockfile, configs, source structure, and scripts, then record the inherited runtime architecture and evidence.
2. When one target and stack are clear and consistent, proceed without asking the user to choose the framework again.
3. When app ownership, framework, rendering model, or target root is ambiguous, ask only for the decision that repo evidence cannot safely resolve.
4. Match handoff routes to existing app routes, screens, navigation stacks, sheets, modals, or component surfaces.
5. Reuse existing shared components and framework-native local feature patterns.
6. Add only the smallest new route/screen/state/data-adapter code needed for the feature.
7. Keep changes inside the selected root's ownership boundaries; require explicit approval before any re-platform or architecture migration.
8. Add tests, stories, fixtures, and docs using the repo's established conventions.

## Completion Criteria

Do not consider work complete until:

- Design-system governance discovery findings are recorded in the final response.
- The selected runtime architecture, evidence source, confidence, and unresolved or not-applicable fields are reported.
- No framework or architecture migration occurred without explicit approval; approved deviations from the inherited or confirmed record are reported.
- Existing tokens/components reused are identified.
- Any new token/component approval decisions are reported.
- Handoff routes, states, and data contracts are implemented or explicitly marked as deferred/open.
- Framework-native typecheck, tests, build, Storybook build, or app preview commands have been run when available.
- Remaining open decisions are listed, especially real API/data/auth/persistence ownership.
