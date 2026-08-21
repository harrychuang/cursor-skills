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
- `sourceAnchor` only when Static Flow export needs a stable edge origin for Figma layout.

## Navigation Mapping

Use route ids in mapping objects. Do not derive navigation behavior from rendered labels.

## Production Navigation Map

- Web: [Map route ids to URL paths, nested layouts, sheets, modals, query params, or `Not in scope`.]
- App: [Map route ids to tabs, navigation stack entries, sheets, modals, deep links, or `Not in scope`.]
- Shared state: [Map non-screen flow nodes to service, permission, validation, or async state decisions.]

## Local State Rules

- `routeId` owns the active route.
- `prototypeRoute=<route-id>` renders a route-specific preview and should not let preview clicks mutate the selected route.
- `prototypeFlowPreview=true` renders the compact route shell used by UI Flow and Static Flow route cards.

## Static Flow Export

- `__FEATURE_PASCAL__FlowExport.tsx` renders route cards, flow-only nodes, and key transitions from `__FEATURE_CAMEL__Flow.ts`.
- `__FEATURE_PASCAL__FlowExport.stories.tsx` exports `StaticFlow` with the same `parameters.prototype` contract as the interactive story.
- Saved inspector layout is read from `../prototypeFlowLayout` so the runtime UI Flow and export artifact use the same positions.

## AI Update Rules

- If a new screen is reachable, add a route.
- If a branch is needed between routes, add a flow-only node.
- If a click changes route, add a transition.
- If a transition exists in metadata, the prototype must expose a matching user action or document why it is out of scope.
- If a route is added, `prototypeRoute=<route-id>` must render that route in UI Flow iframe preview mode.
- If Static Flow export line placement is unclear, adjust `flowPosition` first and use `sourceAnchor` only for stable Figma export edge origins.
- If production navigation differs from the prototype route model, document the adapter in `PRODUCTION_HANDOFF.md`.
