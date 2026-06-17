# Implementation Guide

## Implementation Order

1. Define product scope in `PRD.md`.
2. Define route ids and transitions in `FLOW_SPEC.md`.
3. Implement the same contract in `__FEATURE_CAMEL__Flow.ts`.
4. Define deterministic fixtures in `__FEATURE_CAMEL__Data.ts`.
5. Compose the interactive surface in `__FEATURE_PASCAL__.tsx`.
6. Add only prototype shell styles to `__FEATURE_KEBAB__.css`.
7. Import all documents and flow metadata in `__FEATURE_CAMEL__Meta.ts`.
8. Attach the meta object to `parameters.prototype` in `__FEATURE_PASCAL__.stories.tsx`.
9. Verify Storybook, docs, UI Flow metadata, and TypeScript.

## Files To Maintain Together

- `__FEATURE_PASCAL__.tsx`
- `__FEATURE_CAMEL__Flow.ts`
- `__FEATURE_CAMEL__Data.ts`
- `__FEATURE_CAMEL__Meta.ts`
- `__FEATURE_PASCAL__.stories.tsx`
- `docs/*.md`

## Constraints

- Use route ids from `__FEATURE_CAMEL__RouteIds`.
- Keep fixtures local and deterministic.
- Reuse existing design-system components before adding local UI.
- Keep prototype-specific CSS scoped under `.__FEATURE_CSS_CLASS__`.
- Do not call real product APIs.

## Required Verification

- Run the target project's typecheck.
- Render the Storybook story.
- Run `python <skill-root>/scripts/validate_prototype.py <this-prototype-folder>`.
