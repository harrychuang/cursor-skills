# Implementation Guide

## Implementation Order

1. Run component and token discovery; record Component Map, Component Gaps, and Token Binding in `UI_SPEC.md`.
2. Define product scope in `PRD.md`.
3. Define route ids and transitions in `FLOW_SPEC.md`.
4. Implement the same contract in `__FEATURE_CAMEL__Flow.ts`.
5. Define deterministic fixtures in `__FEATURE_CAMEL__Data.ts`.
6. Draft `PRODUCTION_HANDOFF.md` to map prototype behavior to web/app frontend implementation work.
7. Compose the interactive surface in `__FEATURE_PASCAL__.tsx` from the `UI_SPEC.md` Component Map; use local markup only for Component Gaps regions.
8. Add scoped prototype styles to `__FEATURE_KEBAB__.css` with a `--proto-*` alias block bound to the Token Binding record.
9. Import all documents and flow metadata in `__FEATURE_CAMEL__Meta.ts`.
10. Add `figmaExport.flowStoryId` in `__FEATURE_CAMEL__Meta.ts`.
11. Attach the meta object to `parameters.prototype` in `__FEATURE_PASCAL__.stories.tsx`.
12. Create `__FEATURE_PASCAL__FlowExport.tsx` and `__FEATURE_PASCAL__FlowExport.stories.tsx` with `StaticFlow`.
13. Confirm `prototypeRoute`, `prototypeFlowPreview`, `data-prototype-route-preview`, and `data-prototype-root` support UI Flow iframe previews.
14. Verify Storybook, docs, frontend handoff, UI Flow metadata, Static Flow export, and TypeScript.

## Files To Maintain Together

- `__FEATURE_PASCAL__.tsx`
- `__FEATURE_CAMEL__Flow.ts`
- `__FEATURE_CAMEL__Data.ts`
- `__FEATURE_CAMEL__Meta.ts`
- `__FEATURE_PASCAL__.stories.tsx`
- `__FEATURE_PASCAL__FlowExport.tsx`
- `__FEATURE_PASCAL__FlowExport.stories.tsx`
- `../prototypeFlowLayout.ts`
- `docs/*.md`

## Constraints

- Use route ids from `__FEATURE_CAMEL__RouteIds`.
- Keep fixtures local and deterministic.
- Compose from the `UI_SPEC.md` Component Map; local markup is allowed only for Component Gaps regions and is named there as a promotion candidate.
- Keep prototype-specific CSS scoped under `.__FEATURE_CSS_CLASS__`.
- Do not call real product APIs.
- Document API/data contract expectations in `PRODUCTION_HANDOFF.md`; real data sources and clients are owned by the receiving implementation.
- Document web/app production routes, screens, navigation, and platform constraints before asking production engineers or AI agents to implement.
- Keep `prototypeRoute` query support when adding or renaming routes.
- Keep Static Flow export driven by `__FEATURE_CAMEL__Flow.ts`; do not duplicate route or transition lists.
- Use `sourceAnchor` only when route-card-relative edge origins need Figma export tuning.

## Frontend Transfer Checklist

- Identify which prototype components can move into production and which wrappers are Storybook-only.
- Replace local fixtures only in the receiving implementation; this prototype should document expected API/data contracts.
- Map every route id to a production web route, app screen, shared component state, or open decision.
- Add production tests for the primary journey and scoped branch states.
- Keep Storybook stories as review and regression artifacts after production implementation starts.

## Required Verification

- Run the target project's typecheck.
- Render the Storybook story.
- Render the `StaticFlow` Storybook story.
- Run `python3 <skill-root>/scripts/validate_prototype.py <this-prototype-folder>`.
- Run `python3 <skill-root>/scripts/validate_prototype.py <this-prototype-folder> --handoff-ready` before using the docs as a frontend implementation brief.
