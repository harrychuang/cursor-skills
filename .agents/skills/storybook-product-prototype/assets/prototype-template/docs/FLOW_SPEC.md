# Flow Spec

## Source Of Truth

Flow review is driven by `__FEATURE_CAMEL__Flow.ts`. This markdown file explains the same contract for humans and AI agents.

## Route Map

- `__ENTRY_ROUTE_ID__`: [Entry route description.]

## Flow Node Map

- [Add decision, success, error, loading, or async nodes that are not product screens.]

## Route Metadata Contract

Each route must define:

- `id`
- `title`
- `navigationId`
- `component`
- `description`
- `flowGroup`
- `flowPosition`

## Flow Node Metadata Contract

Each flow-only node must define:

- `id`
- `title`
- `description`
- `shape`
- `tone`
- `flowPosition`

## Transitions

- `__ENTRY_ROUTE_ID__` -> `[target-route]`: [Trigger and behavior.]

## Transition Metadata Contract

Each transition must define:

- `from`
- `to`
- `trigger`
- `label`
- `kind`
- `flowLine`

## Navigation Mapping

Use route ids in mapping objects. Do not derive navigation behavior from rendered labels.

## Local State Rules

- `routeId` owns the active route.

## AI Update Rules

- If a new screen is reachable, add a route.
- If a branch is needed between routes, add a flow-only node.
- If a click changes route, add a transition.
- If a transition exists in metadata, the prototype must expose a matching user action or document why it is out of scope.
