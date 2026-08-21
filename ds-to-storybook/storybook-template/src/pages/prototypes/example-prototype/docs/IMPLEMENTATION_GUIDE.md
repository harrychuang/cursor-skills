# Implementation Guide

## File Order

1. Update docs in `docs/`.
2. Update route, node, and transition metadata in `examplePrototypeFlow.ts`.
3. Update deterministic fixtures in `examplePrototypeData.ts`.
4. Update the interactive UI in `ExamplePrototype.tsx`.
5. Update `examplePrototypeMeta.ts` so Storybook review modes stay aligned.
6. Update `ExamplePrototypeFlowExport.tsx` only when static export needs a different visual.

## Constraints

- Keep route ids stable.
- Do not derive navigation from rendered text.
- Keep all fixtures local and deterministic.
- Keep CSS scoped under `.sbt-example-prototype` or `.sbt-example-flow-export`.
- Use generated design tokens instead of hardcoded design values.
- Static Flow route cards should render `ExamplePrototype` with `initialRouteId` and `isFlowPreview` so export content matches UI Flow iframe previews.
- Static Flow route preview rows should reserve the same width and height as the marked UI Flow route preview surface; card borders and headers are outer chrome, not part of the route UI size.
- Static Flow visual conventions should stay aligned with UI Flow: dotted canvas, route chrome, flow-only node shapes, dashed edges, arrowheads, color variants, and label pills.

## Verification

- Run `npm run typecheck`.
- Open Story, Docs, UI Flow, and Data modes.
- Confirm the Static Flow story id matches `pages-prototypes-example-prototype--static-flow`.
