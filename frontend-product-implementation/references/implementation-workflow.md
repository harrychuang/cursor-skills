# Implementation Workflow

Use this reference after handoff docs are read and the target repo is identified.

Read `runtime-architecture.md` first. Architecture resolution precedes scaffolding, dependency installation, generation, and production edits.

## Contents

1. Repo Discovery
2. Architecture Resolution
3. Multiple Roots Or Ambiguous Ownership
4. Migration Or Re-platform Flow
5. Design-System Governance Gate
6. Existing Product Mode
7. Greenfield Mode
8. API/Data Adapter Pattern
9. Documentation Updates

## Repo Discovery

Inspect before editing:

- package manager and scripts: `package.json`, lockfiles, workspace files
- app framework and renderer: framework/meta-framework manifests and configs, not assumptions from folder names
- route or screen structure: `app/`, `pages/`, `src/routes`, `src/screens`
- shared components: `src/components`, `packages/ui`, Storybook stories
- design tokens and styles: `tokens/`, `src/styles`, CSS variables, theme files
- i18n source: `locales/`, message catalogs, `i18n.*`
- data/API patterns: clients, hooks, services, mocks, fixtures
- tests and verification: unit, component, e2e, Storybook, build scripts

Record discoveries in working notes and final response.

## Architecture Resolution

1. Create the required runtime architecture decision record from `runtime-architecture.md`.
2. Resolve workspace root, owning app/package root, and greenfield versus existing-product mode.
3. Trace every material selection to user input, repo evidence, or handoff evidence and record confidence.
4. For a clear existing app, inherit its stack and continue without a redundant framework question.
5. For greenfield work, record explicit scaffold-affecting choices from the current request as confirmation and ask only for unresolved choices before scaffolding, installing, or generating.
6. Stop for unresolved multi-root conflicts or any proposed re-platform.

Do not start with a React/Vite scaffold, or any other template, merely because it is familiar or available. The selected framework and renderer determine the implementation conventions and verification surface.

## Multiple Roots Or Ambiguous Ownership

1. Inventory candidate app/package roots and their manifests, lockfiles, configs, routes, and ownership evidence.
2. Select the unique owner when the requested feature and repo evidence identify one target.
3. If multiple candidates remain, summarize the meaningful differences and ask the user to choose before editing.
4. Re-run design-system and runtime discovery inside the selected root; do not combine sibling conventions.

## Migration Or Re-platform Flow

1. Treat feature scope and migration scope as separate decisions.
2. Attempt the smallest framework-native implementation within the inherited architecture.
3. If that cannot satisfy the request, stop and show the current-stack option, migration rationale, affected roots/packages, and verification/rollout impact.
4. Obtain explicit approval naming the framework or architecture change before changing dependencies, configs, generated structure, or production code.
5. Record the approval and architecture deviation, then plan migration-specific checks.

## Design-System Governance Gate

Before any UI implementation:

1. Apply `$design-system-governance` Phase 0 discovery.
2. List existing tokens and shared components relevant to the handoff.
3. Attempt composition from existing shared components.
4. Stop and ask if a required token or shared component is missing.

When discovery finds no token system in the target root and the user approves establishing one, read `token-bootstrap.md` and follow its procedure before continuing UI implementation. When a token system exists, this gate proceeds unchanged.

Do not add fallback hardcoded color, spacing, radius, typography, motion, or display text values.

### Approved Component Porting

When the user approves creating a missing shared component that has a prototype counterpart, port it instead of reinventing it:

1. Derive variants, props, and states from the reusable prototype source files listed in `PRODUCTION_HANDOFF.md` and from the prototype's stories args, not from free-text prop notes alone. Do not invent a variant that appears in no prototype source.
2. Implement only the variants and states the in-scope handoff routes actually use; record the rest as deferred so a later feature can extend the component instead of re-deriving it.
3. Rebuild the component with the target framework's native conventions and bind it to production tokens; do not translate prototype framework idioms verbatim.
4. Strip the Storybook-only boundaries the handoff lists (prototype parameters, inspector hooks, static-flow scaffolding); they must not ship.
5. Record the prototype-to-production component name mapping in the implementation map for verification and later audits.

## Existing Product Mode

Use this when a repo already has app code.

1. Confirm the selected root has one consistent inherited architecture; ask only if evidence remains ambiguous or conflicting.
2. Map handoff surfaces to existing route/screen ownership.
3. Reuse the closest framework-native feature folder and component structure.
4. Reuse existing components before adding feature-local components.
5. Add typed fixtures or mock adapters near the repo's existing mock/data pattern.
6. Add feature state using the repo's existing reactivity/state style.
7. Add or update tests, stories, and i18n entries using compatible tools and renderer.
8. Run the narrowest meaningful verification first, then broader build checks.

Avoid broad refactors unless needed to satisfy the handoff.

## Greenfield Mode

Use this when the target has no product app yet.

1. Propose the complete runtime architecture decision record; use explicit current-request choices as confirmation and ask only for unresolved fields, even when a default template is available.
2. Do not scaffold, install dependencies, or generate app code before confirmation.
3. Confirm the design system source. If none exists, stop and ask whether to establish one first; when the user approves establishing tokens, follow `token-bootstrap.md` to port a minimal token subset from the prototype design-system source.
4. Set up framework-native token, i18n, routing, component, fixture, and test structure before pages.
5. Build the first route/screen with typed contracts and deterministic fixtures.
6. Add documented branch states and route transitions.
7. Add Storybook or visual regression surfaces only when confirmed and compatible with the selected framework/renderer.
8. Run the generated app locally or build it with the selected stack before reporting completion.

Greenfield work should be minimal but production-like: clear folders, typed contracts, replaceable data adapters, and verification scripts.

## API/Data Adapter Pattern

When real integration is out of scope, create:

- `types` for request, response, error, and UI state
- fixtures for documented success, loading, empty, error, disabled, and permission states
- mock adapter or hook returning deterministic data
- clear replacement point for the receiving implementation

Do not invent real endpoints. Do not add secrets, environment variables, auth flows, or persistence without explicit scope.

## Documentation Updates

When implementation changes or narrows the handoff:

- update local implementation notes if the repo has them
- update Storybook docs/stories if used as regression surface
- update the runtime architecture record when an approved implementation decision changes it
- record deferred handoff requirements
- record new open decisions for product, design, data, API, auth, runtime architecture, platform, or release ownership
