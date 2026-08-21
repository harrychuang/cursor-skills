# UI Spec

## Shell Layout

The prototype uses a compact project workspace shell with a top bar, route tabs, and a single content panel.

## Route Composition

- `intake`: request summary, owner, target date, and submit action.
- `review`: requirements list, approval action, and edit action.
- `handoff`: accepted scope summary and next-step checklist.

## Interaction Rules

- Route state is explicit and typed by `ExamplePrototypeRouteId`.
- Buttons call route handlers by route id, not by reading visible labels.
- UI Flow iframe previews can force a route through the `prototypeRoute` query parameter.

## Accessibility

- Route tabs use `aria-current="page"` for the active route.
- The main content is exposed as a single route preview surface.
- Buttons keep native button semantics.

## Token Constraints

All color, spacing, typography, shape, and viewport values use generated `--sbt-*` starter tokens. New projects can regenerate these names with `npm run init-template`.
