# UI Flow Contract

Use this reference when creating `FLOW_SPEC.md` and `<featurePrototypeFlow>.ts`.

## Route Metadata

Each route should define:

- `id`: stable route id used by React state and flow diagrams.
- `title`: review label.
- `navigationId`: shell navigation context when applicable.
- `component`: primary component or composed surface.
- `description`: behavior the route proves.
- `flowGroup`: optional grouping label.
- `flowPosition`: optional stable `{ x, y }` coordinate.

## Flow-Only Nodes

Use flow-only nodes for branch logic that is not a full product screen:

- API success/failure decisions.
- Async loading or queued states.
- Permission decisions.
- Validation outcomes.
- Background status nodes.

Flow-only nodes should define:

- `id`
- `title`
- `description`
- `shape`: usually `decision` or `state`.
- `tone`: optional `success`, `error`, `warning`, or project-specific tone.
- `flowPosition`: optional stable coordinate.

## Transitions

Every user-triggered route change must define:

- `from`: source route or flow-node id.
- `to`: target route or flow-node id.
- `trigger`: stable event or branch condition name.
- `label`: human-readable edge label.
- `kind`: optional semantic category such as `primary`, `return`, `global`, `secondary`, `outcome`, or `condition`.
- `flowLine`: optional display hint. Use `key` only for transitions drawn on the simplified canvas.

## Trigger Naming

Use stable, implementation-facing names:

- `quoteRow.click`
- `submitButton.click`
- `orderSubmit.success`
- `orderSubmit.error`
- `bottomNavigation.watchlist`
- `topAction.search`
- `settingsSheet.dismiss`

Do not use rendered labels as route logic.

## Control Mapping

Create mapping objects before wiring handlers:

- bottom navigation id to route id
- top action id to route id
- tab or segmented control id to route id
- menu action id to route id
- sheet action id to route id

## Acceptance

- Every visible route appears in route metadata.
- Every documented click appears in transition metadata.
- Every transition target exists as a route or flow-only node.
- UI Flow canvas uses key transitions; Transition Index uses the full transition list.
