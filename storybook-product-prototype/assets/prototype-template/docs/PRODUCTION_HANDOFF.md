# Production Handoff

## Review Status

- Status: `pending` [Set to `confirmed` only after the team reviews the Storybook demo and confirms the product direction.]
- Confirmed by: [Reviewer or team, once confirmed.]
- Confirmed on: [Date, once confirmed.]
- Reviewed demo: [Storybook story id or UI Flow the team reviewed.]
- Confirmed scope: [What the confirmation covers or explicitly excludes.]

## Target Surfaces

- Web: [Route, page, embedded widget, or `Not in scope`.]
- App: [Native screen, tab, sheet, webview, or `Not in scope`.]
- Shared package: [Reusable component or domain module, if any.]
- Release scope: [Feature flag, rollout, or environment assumptions.]

## Prototype To Frontend Map

| Prototype route or node | Frontend surface | Reusable source | Storybook-only boundary |
| --- | --- | --- | --- |
| `__ENTRY_ROUTE_ID__` | [Web route or app screen.] | `__FEATURE_PASCAL__.tsx`, `__FEATURE_CAMEL__Flow.ts`, `__FEATURE_CAMEL__Data.ts` | `prototypeRoute`, `prototypeFlowPreview`, local fixtures. |

## Web Implementation Notes

- Route: [URL path, nested layout, modal, query params, or `Not in scope`.]
- Rendering: [SPA, SSR, SSG, server component, embedded widget, or unknown.]
- Responsive behavior: [Breakpoints and layout changes.]
- Accessibility: [Keyboard, focus, ARIA, and screen reader requirements.]
- Browser state: [Cache, local storage, session, or none.]
- Analytics and flags: [Events, feature flag, experiment, or none.]

## App Implementation Notes

- Navigation: [Stack, tab, sheet, modal, deep link, or `Not in scope`.]
- Platform constraints: [Safe area, orientation, dynamic type, reduce motion.]
- Gestures and feedback: [Dismissal, swipe, haptics, or none.]
- Permissions and OS services: [Permission prompt, native capability, or none.]
- Offline and retry: [Reconnect, background refresh, retry, or none.]
- Accessibility: [Labels, order, dynamic type, and screen reader behavior.]

## Shared Domain And UI State Model

- Route state: `__ENTRY_ROUTE_ID__` starts the flow.
- UI states: [Loading, empty, error, disabled, permission, optimistic, retry states.]
- Domain entities: [Stable ids and required fields.]
- Validation rules: [Client-side validation, if any.]
- Cache and refresh: [Invalidation, polling, push, or manual refresh.]

## API And Data Contracts

| Fixture group | Expected source | Request | Response | Errors | Owner |
| --- | --- | --- | --- | --- | --- |
| `__FEATURE_CAMEL__Routes` | [Expected endpoint, service, local store, or static content.] | [Shape or unknown.] | [Shape or unknown.] | [Error shape or unknown.] | [Team or owner.] |

## Frontend Handoff Acceptance

- Production web route or app screen target is identified for the real product shell.
- Route transitions match `FLOW_SPEC.md`.
- API/data contracts are documented well enough for the receiving engineer or AI to wire later.
- Loading, empty, error, disabled, and permission fixture states in scope are documented.
- Accessibility requirements in `UI_SPEC.md` are specified for the target platform.
- Web/app platform notes above are filled in or explicitly marked `Not in scope`.
- Suggested tests cover the primary journey and scoped branch states.

## Integration Ownership

- Prototype/handoff owner: UI behavior, route flow, interaction triggers, visual states, deterministic fixtures, and API/data contract expectations.
- Receiving implementation owner: real API clients, data sources, auth/session integration, cache policy, storage, persistence, environment configuration, and final production tests.
- Change rule: if implementation changes route behavior, data shape, or branch states, update these docs and the Storybook regression story.

## Storybook-Only Boundaries

- `parameters.prototype` is for Storybook review only.
- `prototypeRoute` and `prototypeFlowPreview` are iframe preview helpers only.
- `data-prototype-root` and `data-prototype-route-preview` are measurement hooks only.
- `StaticFlow` is for design/review export, not product runtime.
- Local fixtures are test data until replaced by the receiving implementation.

## Design System Continuity

This section records discovery results for the receiving implementation; it does not restate governance rules.

- Token namespace: [Prefix and defining file paths from the UI_SPEC Token Binding record, or `none`.]
- Component Map: [Echo the UI_SPEC Component Map, or link to it.]
- Promotion candidates: [One line per Component Gaps candidate: name — `promoted` with its hub shared-component path and story id, or `local` with its prototype file path and the routes/regions that use it — or `none`.]
- Receiving pass: run `design-system-governance` discovery and gates against this record before implementing; when no token system existed, follow the `frontend-product-implementation` skill's token-bootstrap reference.

## Open Product Decisions

- [Decision that affects production routing, navigation, API, auth, security, analytics, release, or platform behavior.]
