# Handoff Ingestion

Use this reference when reading prototype or product handoff docs before implementing frontend code.

## Input Priority

Read in this order when available:

1. `PRODUCTION_HANDOFF.md`
2. `PRD.md`
3. `FLOW_SPEC.md`
4. `UI_SPEC.md`
5. `DATA_SPEC.md`
6. `ACCEPTANCE.md`
7. `IMPLEMENTATION_GUIDE.md`

If `PRODUCTION_HANDOFF.md` is missing, continue from the remaining docs and create a short implementation map before coding.

## Extract These Contracts

Build a working map with:

- product goal and primary user
- target surface: web, app, hybrid, shared package, or unknown
- proposed runtime architecture: target root, delivery mode, platform, framework/version, rendering model, build tool, language, and package manager
- runtime integrations: routing, state, data boundary, i18n, styling/design-system, tests, and Storybook renderer
- architecture decision sources, confidence, conflicts, and unresolved choices
- route ids, screen ids, flow-only nodes, and transition triggers
- UI composition, shell, responsive behavior, accessibility, and interaction rules
- expected API/data contracts, fixture groups, states, and branch conditions
- Storybook-only boundaries that must not ship
- frontend handoff acceptance criteria
- open product, design-system, data, API, auth, persistence, or platform decisions

Normalize these architecture inputs into the decision record defined in `runtime-architecture.md`. Treat the handoff as evidence: it may propose a production stack, but it does not silently override a clear existing repo or authorize a migration.

## Handoff To Repo Mapping

For each route or screen, map:

- handoff route id
- selected target root and runtime architecture
- production route/screen/navigation target
- components to reuse
- missing child components or tokens
- reusable prototype source files for components to port, when the handoff lists them
- data adapter or fixture provider
- tests and stories to add
- owner of real API/data integration if known

Keep unresolved architecture choices visible in the implementation map. Do not map code into a guessed root or framework while a blocking target decision remains open.

## Data Boundary

Handoff docs may describe API and data shapes, but they do not require real data wiring.

When real integration is not explicitly scoped:

- create typed interfaces for request, response, errors, and UI state
- create deterministic fixtures or mock adapters
- keep adapter seams easy to replace
- avoid real auth, persistence, storage, cache, and environment assumptions
- list integration ownership as an open decision

## Conflict Handling

When docs disagree:

- Prefer `PRODUCTION_HANDOFF.md` for implementation ownership and platform target.
- Prefer `FLOW_SPEC.md` for route ids and transition triggers.
- Prefer `UI_SPEC.md` for composition, responsive behavior, accessibility, and interaction detail.
- Prefer `DATA_SPEC.md` for fixture groups and API/data shape expectations.
- Prefer `ACCEPTANCE.md` for testable completion criteria.

For runtime architecture, also inspect the selected repo using `runtime-architecture.md`. An existing app's consistent stack is inherited for normal feature work; a handoff that requires a different stack creates a migration decision rather than overriding the repo.

If the conflict would change target root, framework, rendering/build architecture, UI behavior, data shape, or design-system scope, stop and ask before implementing. Record the unresolved decision, competing sources, and required approval.
