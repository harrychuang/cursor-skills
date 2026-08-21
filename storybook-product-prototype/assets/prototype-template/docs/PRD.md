# __FEATURE_TITLE__ Prototype PRD

## Product Summary

[Describe the product behavior this prototype validates.]

## Problem

[Describe the user or business problem.]

## Users

- [Primary user and context.]

## Target Production Surfaces

- Web: [Route, page, embedded surface, or `Not in scope`.]
- App: [Native screen, tab, sheet, webview, or `Not in scope`.]
- Shared package: [Reusable component or domain module, if any.]

## Goals

- [Observable product outcome.]

## Non-Goals

- [Production behavior, external system, or edge case intentionally excluded.]

## Core Journeys

### Journey 1: [Name]

1. User enters `__ENTRY_ROUTE_ID__`.
2. [Next action.]
3. [Expected route or state.]

## AI Implementation Scope

- Create a clickable Storybook prototype.
- Keep data local and deterministic.
- Maintain PRD, UI Spec, Flow Spec, Data Spec, Production Handoff, Acceptance, typed flow metadata, fixtures, and `parameters.prototype` together.
- Keep production handoff explicit about Storybook-only boundaries, web/app frontend needs, API/data contracts, and receiving-side integration ownership.

## Dependencies

- Existing components: [List components to reuse.]
- Existing tokens or styles: [List token/theme dependencies.]
- Mocked external systems: [List systems that must remain mocked.]
- Receiving implementation systems: [List services, routes, screens, packages, or platform owners that will replace prototype-only fixtures.]
