# Acceptance

## Storybook

- `Pages/Prototypes/Example Prototype/Default` renders the interactive story.
- `Pages/Prototypes/Example Prototype/Static Flow` renders a static export surface.
- Static Flow route cards render the same `ExamplePrototype` route UI used by UI Flow iframe previews.

## Docs

- Docs mode shows PRD, UI Spec, Flow Spec, Data Spec, Implementation Guide, and Acceptance.

## UI Flow

- UI Flow renders three route cards and one decision node.
- UI Flow draws only the three key transitions.
- UI Flow route iframes auto-fit the marked route UI width and height.
- Static Flow keeps flow-only nodes as metadata cards, but route cards use real route UI.
- Static Flow route cards reserve the same route UI width and height as UI Flow previews.
- Static Flow applies saved UI Flow route and node positions before falling back to metadata positions.
- Static Flow uses the same dotted canvas, route card chrome, decision node shape, edge colors, arrowheads, and label pills as UI Flow.
- Layout export includes schema, version, prototypeId, exportedAt, and positions.
- Layout import applies matching positions and rejects non-matching layouts.

## Data

- Data mode shows overview, API contracts, data sources, schemas, route data requirements, state rules, fixtures, and raw payload.

## Interaction

- Submit intake navigates from `intake` to `review`.
- Request approval navigates from `review` to `handoff` while metadata shows the decision node.
- Edit and start another request return to `intake`.
