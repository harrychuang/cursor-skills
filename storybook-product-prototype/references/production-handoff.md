# Production Handoff

Use this reference when creating `PRODUCTION_HANDOFF.md` or preparing prototype docs for frontend web or app implementation handoff.

## Purpose

`PRODUCTION_HANDOFF.md` is the bridge from a Storybook prototype to frontend implementation work. It should let an engineer or AI agent understand what UI behavior to build, where it belongs in the production product, which prototype parts are reusable, which data/API contracts the UI expects, and which integration responsibilities belong to the receiving production repo.

Do not describe the prototype as production-ready. Describe the frontend contract and the decisions needed for production integration. Real data sources, auth, backend clients, storage, persistence, and environment-specific wiring are receiving-implementation responsibilities unless the user explicitly scopes them into the prototype.

## Required Sections

Use these sections:

```markdown
# Production Handoff

## Review Status

## Target Surfaces

## Prototype To Frontend Map

## Web Implementation Notes

## App Implementation Notes

## Shared Domain And UI State Model

## API And Data Contracts

## Frontend Handoff Acceptance

## Integration Ownership

## Storybook-Only Boundaries

## Design System Continuity

## Open Product Decisions
```

## Review Status

The handoff flow is: Storybook demo → the team confirms the product direction → the docs go to the receiving engineer or AI. This section stamps that confirmation so the receiver knows the docs describe a confirmed direction, not a draft under discussion:

- Status: `pending` or `confirmed`
- who confirmed and when
- which Storybook story or UI Flow demo was reviewed
- what the confirmation covers or explicitly excludes

`validate_prototype.py --handoff-ready` fails while the status is `pending`. A legacy handoff written before this section existed only gets a warning for the missing section; new handoffs must include it. Do not hand the docs to a receiving implementation before the status is `confirmed`.

## Target Surfaces

State whether the production target is:

- web only
- native app only
- hybrid app or embedded webview
- shared component package used by web and app
- unknown or pending decision

If the target is unknown, write the safest known assumptions and list the blocking decision in `Open Product Decisions`.

## Prototype To Frontend Map

Map each prototype route id to frontend implementation concepts:

- route id
- production page, screen, sheet, modal, or component
- owning package or app folder when known
- reusable prototype files or components
- Storybook-only files that must not ship
- production navigation entry and exit points

## Web Implementation Notes

Document web-specific needs when the surface may ship on web:

- URL route, query params, and deep-link behavior
- rendering mode when known: SPA, SSR, SSG, server components, or embedded widget
- responsive breakpoints and layout changes
- keyboard behavior, focus management, and ARIA requirements
- browser storage, cache, or session behavior
- analytics events and feature flag exposure
- SEO or metadata needs when the page is public

If the product is not web, write `Not in scope`.

## App Implementation Notes

Document app-specific needs when the surface may ship on iOS, Android, or a cross-platform app:

- navigation stack, tab, sheet, modal, or push destination
- safe-area, orientation, and viewport constraints
- platform gestures, haptics, and dismissal behavior
- permission prompts and OS capability usage
- offline, reconnect, background, and retry behavior
- accessibility labels, dynamic type, reduce motion, and screen reader order
- native module, bridge, or webview dependencies

If the product is not app, write `Not in scope`.

## Shared Domain And UI State Model

Convert route fixtures into UI-facing implementation state:

- domain entities and stable ids
- route state and UI state ownership
- loading, empty, error, disabled, permission, optimistic, retry, and async branch states
- client-side validation rules
- cache invalidation or refresh triggers
- feature flags and experiment states

## API And Data Contracts

For each prototype fixture group that needs a receiving-side replacement, document:

- service or endpoint name
- method or event direction when known
- request shape
- response shape
- error shape
- auth or permission requirement
- owning team or system
- routes or screens that consume it
- fixture group being replaced

If an API is unknown, document the UI's expected contract and mark the owner or endpoint as open. Do not invent real endpoints or data sources.

## Frontend Handoff Acceptance

Define handoff-ready checks separately from Storybook checks and from final production integration checks:

- production route or screen target is identified for the real app shell
- API/data contracts are documented well enough for the receiving engineer or AI to wire later
- route transitions match `FLOW_SPEC.md`
- accessibility and responsive behavior match `UI_SPEC.md`
- web or app platform notes are specified or explicitly marked `Not in scope`
- fixture states cover successful, empty, loading, error, and permission paths in scope
- analytics, feature flags, auth, persistence, and security requirements are noted as handoff inputs or open decisions

## Integration Ownership

State ownership explicitly:

- This prototype/handoff owns UI behavior, route flow, interaction triggers, visual states, deterministic fixtures, and API/data contract expectations.
- The receiving engineer or AI owns real API clients, data sources, auth/session integration, cache policy, storage, persistence, environment configuration, and final production tests.
- If the receiving implementation intentionally changes a route, data shape, or branch state, it should update the handoff docs and Storybook regression story.

## Storybook-Only Boundaries

List what must not be treated as production code:

- `parameters.prototype`
- `prototypeRoute` and `prototypeFlowPreview` query modes
- `data-prototype-root` and `data-prototype-route-preview`
- Static Flow export components
- local deterministic fixtures except as test data
- Prototype Inspector layout and Storybook toolbar behavior

Also list prototype files or components that can be extracted into frontend production code with changes.

## Design System Continuity

Record the discovery results so the receiving implementation inherits them instead of re-deriving them. This section records facts; it does not restate governance rules.

- Token namespace record: the token prefix(es) in use and the file paths that define them, from the `UI_SPEC.md` Token Binding section, or `none` when the project has no token system.
- Component Map echo: the per-route component mapping (or a link to `UI_SPEC.md`).
- Promotion candidates: locally created components from Component Gaps. Record each candidate's status: `promoted` — the team-confirmed component was promoted into the hub's shared component library (list its shared-component path and story id) — or `local` — it stays inside the prototype (list its prototype file path and the routes/regions that use it). Production can port `promoted` components from the hub directly and may promote remaining `local` candidates into its own design system.
- Receiving pass: the `frontend-product-implementation` pass should run `design-system-governance` discovery and gates against this record; when no token system existed, follow its token-bootstrap reference.

## Open Product Decisions

Record unresolved choices that would change implementation:

- platform target or routing model
- API ownership or response shape
- auth, permission, or security policy
- persistence, caching, offline, or sync behavior
- analytics taxonomy or event names
- design-system component gaps
- release gates, feature flags, or rollout plan
