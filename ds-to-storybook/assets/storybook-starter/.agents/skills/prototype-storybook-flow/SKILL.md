---
name: prototype-storybook-flow
description: Create or update PRD-led Storybook product prototypes under src/pages/prototypes with docs, typed route and transition metadata, deterministic fixtures, UI Flow review data, and prototype Storybook stories. Use when building a new product prototype, turning a product idea into PRD plus UI Flow, standardizing prototype docs, or updating an existing prototype flow.
---

# Prototype Storybook Flow

## Overview

Use this skill to take a product idea from PRD to a clickable Storybook prototype with a metadata-driven UI Flow. Follow the contract in `src/pages/prototypes/README.md`.

## Required Context

Before creating or changing a prototype, read:

- `src/pages/prototypes/README.md`
- `.storybook/prototype-inspector/preview.js` for the `parameters.prototype` contract consumed by UI Flow

If the request is still exploratory, use `$spectra-discuss` before implementation. If the user wants a formal planned change, use `$spectra-propose`. If the user asks to build the prototype directly and the scope is clear, proceed with the workflow below.

## Workflow

### 1. Frame The Product

Confirm these inputs before writing implementation files:

- Product name and owner.
- Primary user and problem.
- Entry route.
- Required routes.
- Required transitions.
- Required success, error, empty, loading, or disabled states.
- Existing design-system components to reuse.
- Fixture fields and mocked external systems.
- Non-goals.
- Storybook acceptance criteria.

Ask one focused question at a time only when a missing answer would change the route model or acceptance criteria.

### 2. Write The Docs First

Create or update these docs under `src/pages/prototypes/<feature-prototype>/docs/` before composing UI:

- `PRD.md`: product summary, problem, users, goals, non-goals, core journeys, AI implementation scope, dependencies.
- `FLOW_SPEC.md`: source of truth for route ids, flow-only nodes, transitions, trigger names, control mappings, local state rules.
- `UI_SPEC.md`: shell layout, component composition, visual states, interaction rules, accessibility, design-token constraints.
- `DATA_SPEC.md`: local fixtures, field ownership, data invariants, future API contracts.
- `ACCEPTANCE.md`: testable Storybook, docs, flow, interaction, visual, accessibility, and TypeScript criteria.
- `IMPLEMENTATION_GUIDE.md`: implementation order, files to mirror, constraints, verification commands.

Do not let implementation details replace product behavior. The docs must allow another agent to continue without private conversation context.

### 3. Model Flow Before UI

Create `<featurePrototypeFlow>.ts` before the main React surface.

Rules:

- Define a `const` route id array and exported route id type.
- Define flow-only node ids for decision or branch states that do not render as product routes.
- Add every visible or reachable screen to the route metadata.
- Add every route-changing user action to the transitions array.
- Use stable triggers such as `quoteRow.click`, `submitButton.click`, or `bottomNavigation.watchlist`.
- Use control-to-route maps for bottom navigation, top actions, segmented controls, tabs, sheet actions, and menu actions.
- Use `flowLine: "key"` only for the simplified UI Flow canvas. Keep non-key transitions in the Transition Index.
- Do not infer flow behavior from screenshots, rendered labels, or DOM text.

### 4. Create Deterministic Fixtures

Create `<featurePrototypeData>.ts`.

Rules:

- Keep all prototype data local and deterministic.
- Use existing component prop types where possible.
- Include fixtures for branch states that appear in the flow.
- Document every fixture group in `DATA_SPEC.md`.
- Do not call real APIs from a prototype.

### 5. Compose The Prototype

Create `<FeaturePrototype>.tsx`, `<feature-prototype>.css`, `index.ts`, and `<FeaturePrototype>.stories.tsx`.

Rules:

- Reuse existing design-system components before adding local markup.
- Keep route state explicit and typed by route ids.
- Wire clicks through mappings and transition triggers, not visible labels.
- Keep prototype-only CSS scoped under a feature root class.
- Use design tokens for color, spacing, type, size, shape, scrim, and viewport values.
- Keep product behavior in component code and review metadata in `parameters.prototype`.
- Support `prototypeFlowPreview=true` when route UI needs to render inside the UI Flow iframe preview.

### 6. Attach Metadata

Create `<featurePrototypeMeta>.ts` and attach it to `parameters.prototype`.

The meta object must expose:

- `id`, `title`, `description`, `owner`, and `status`.
- Raw docs for PRD, UI Spec, Flow Spec, Data Spec, Implementation Guide, and Acceptance.
- `flow.routes`, `flow.nodes`, and `flow.transitions`.
- `data` with fixture inventory, route data requirements, and API replacement points.

### 7. Verify

Run the checks that fit the change:

- `npm run typecheck`
- Storybook story renders in `Pages/Prototypes/<Feature Prototype>/Default`.
- Prototype docs mode shows all required docs.
- UI Flow routes and nodes come from metadata.
- UI Flow visible edges match transitions marked with `flowLine: "key"`.
- Transition Index lists the full transition contract.
- Every documented trigger either navigates, updates local state, or is explicitly out of scope.

## File Contract

Create this shape for each new prototype:

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

## Quality Bar

- A prototype is complete only when PRD, flow metadata, fixture data, UI spec, acceptance criteria, and the interactive story describe the same behavior.
- The UI Flow source of truth is route, flow-node, and transition metadata.
- The prototype must be clickable enough to validate product flow, not just visually similar.
- Prototype CSS must not become a substitute for missing reusable component work. If a design-system gap blocks fidelity, document the gap before adding local markup.
