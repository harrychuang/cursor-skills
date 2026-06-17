# Prototype Standard

Use this reference when creating the folder contract, docs, and implementation order for a new Storybook product prototype.

## Folder Contract

Each prototype should live in its own folder:

```text
src/pages/prototypes/<feature-prototype>/
  <FeaturePrototype>.tsx
  <FeaturePrototype>.stories.tsx
  <featurePrototypeData>.ts
  <featurePrototypeFlow>.ts
  <featurePrototypeMeta>.ts
  <feature-prototype>.css
  index.ts
  docs/
    PRD.md
    UI_SPEC.md
    FLOW_SPEC.md
    DATA_SPEC.md
    ACCEPTANCE.md
    IMPLEMENTATION_GUIDE.md
```

Adapt the root path if the project uses `src/screens`, `app`, `packages/ui`, or a different Storybook story convention.

## Document Responsibilities

- `PRD.md`: product problem, users, goals, non-goals, journeys, requirements, AI implementation scope, dependencies.
- `FLOW_SPEC.md`: route ids, flow-only nodes, transitions, triggers, state rules, navigation mappings.
- `UI_SPEC.md`: shell layout, composition, visual states, interaction rules, responsive behavior, accessibility, design-system constraints.
- `DATA_SPEC.md`: deterministic fixtures, field meanings, data invariants, API replacement points.
- `ACCEPTANCE.md`: testable completion criteria for Storybook, metadata, interaction behavior, visual consistency, accessibility, and implementation readiness.
- `IMPLEMENTATION_GUIDE.md`: implementation order, files to create, constraints, verification commands.

## Implementation Order

1. Draft `PRD.md`.
2. Draft `FLOW_SPEC.md`.
3. Create typed `*Flow.ts`.
4. Create deterministic `*Data.ts`.
5. Compose `<FeaturePrototype>.tsx`.
6. Add scoped prototype CSS.
7. Create `*Meta.ts` importing docs and exposing `parameters.prototype` data.
8. Create `<FeaturePrototype>.stories.tsx`.
9. Verify docs, UI Flow metadata, interaction behavior, and typecheck.

## Handoff Checklist

- Every reachable screen has a route id.
- Every non-screen branch has a flow-only node.
- Every route-changing click has a transition with a stable trigger.
- Every route has deterministic fixture data.
- Existing components to reuse are named.
- Prototype-only CSS scope is named.
- Acceptance criteria cover Storybook, docs, UI Flow, interaction, accessibility, and TypeScript.
