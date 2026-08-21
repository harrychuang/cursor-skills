# Prototype Standard

`src/pages/prototypes` stores feature-level product prototypes that can be used as implementation references for future PRDs, flows, and AI-assisted delivery.

The template starter is `example-prototype`. It is intentionally neutral and demonstrates the portable `parameters.prototype` contract, Story/Docs/UI Flow/Data review modes, iframe route previews, layout import/export, and Static Flow export. Domain-specific prototypes can remain as reference material, but new projects should start from `example-prototype`.

The standard is not only visual. A prototype is complete only when the interactive story, PRD, flow metadata, fixture data, UI spec, and acceptance criteria describe the same product behavior.

## Required Folder Contract

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

## Document Responsibilities

- `PRD.md`: Defines the product problem, users, goals, non-goals, user journeys, feature requirements, and explicit AI implementation scope.
- `FLOW_SPEC.md`: Defines route ids, route ownership, transitions, triggers, state rules, and navigation mappings.
- `UI_SPEC.md`: Defines shell layout, component composition, visual states, interaction rules, responsive behavior, and design-system constraints.
- `DATA_SPEC.md`: Defines deterministic fixture sources, field meanings, data invariants, and what must later be replaced by real APIs.
- `ACCEPTANCE.md`: Defines testable completion criteria for Storybook, metadata, interaction behavior, visual consistency, accessibility, and implementation readiness.
- `IMPLEMENTATION_GUIDE.md`: Gives AI agents and engineers the implementation order, files to create, constraints, and verification commands.

## Metadata Contract

Every Storybook prototype must expose a `parameters.prototype` object from a dedicated meta file.

Required fields:

- `id`: Stable machine-readable prototype id.
- `title`: Human-readable product name.
- `description`: One paragraph explaining the prototype purpose.
- `owner`: Owning team or working group.
- `status`: Prototype lifecycle status.
- `docs`: Raw markdown documents from `docs/`.
- `flow.routes`: Every visible or reachable route.
- `flow.transitions`: Every user-triggered transition between routes.
- `data`: A summary of deterministic fixtures and navigation inputs.

Route metadata should include:

- `id`: Stable route id used by React state and flow diagrams.
- `title`: Visible route name.
- `navigationId`: Bottom navigation or shell context id.
- `component`: Primary design-system component or composed surface.
- `description`: What the route proves.
- `flowGroup`: Optional visual grouping label for UI Flow cards.
- `flowPosition`: Optional `{ x, y }` coordinate for stable UI Flow layout.

Transition metadata should include:

- `from`: Source route id.
- `to`: Destination route id.
- `trigger`: Stable event name, such as `quoteRow.click` or `topAction.search`.
- `label`: Human-readable edge label for review.
- `kind`: Optional semantic category such as `primary`, `return`, `global`, `secondary`, or `outcome`.
- `flowLine`: Optional display hint. Use `key` only for transitions that should appear as simplified lines in UI Flow; keep reference-only transitions in the Transition Index.
- `sourceAnchor`: Optional export hint for key transitions. It defines the relative trigger origin inside the source route card or flow node so static Figma export lines start from the UI action instead of the card center.

## AI Implementation Workflow

1. Start with `PRD.md` and confirm goals, non-goals, users, and core journeys.
2. Create `FLOW_SPEC.md` and the typed `*Flow.ts` file before building UI.
3. Create deterministic fixtures in `*Data.ts`; do not depend on live APIs.
4. Compose screens from existing design-system components first.
5. Add prototype-specific CSS only for layout glue that cannot belong to a reusable component.
6. Wire all controls through route state and transition mappings.
7. Import all docs into `*Meta.ts` and attach the object to `parameters.prototype`.
8. Verify Storybook, UI Flow, docs, TypeScript, and acceptance criteria.

## Zero To One Workflow

Use this sequence when a new feature needs a product prototype from an early idea.

### 1. Product Framing

Start by discussing the product problem before creating files.

Required decisions:

- Product name and owner.
- Primary user and usage context.
- Problem statement.
- Goals and non-goals.
- Entry route.
- Core journeys.
- Success, error, empty, loading, and disabled states.
- Existing components that should be reused.
- External systems that must stay mocked.

If the scope is still open, use `$spectra-discuss` first. If the scope is clear and should become planned work, use `$spectra-propose` to capture the change before implementation.

### 2. PRD Draft

Create `docs/PRD.md` before composing UI. The PRD is the product source of truth and should be specific enough for another AI agent to continue without private conversation context.

Required sections:

- `Product Summary`
- `Problem`
- `Users`
- `Goals`
- `Non-Goals`
- `Core Journeys`
- `AI Implementation Scope`
- `Dependencies`

The PRD should name observable product behavior, not implementation details alone.

### 3. Flow Contract

Create `docs/FLOW_SPEC.md` and `<featurePrototypeFlow>.ts` before writing the main React surface.

The flow contract must define:

- Route ids for every visible or reachable screen.
- Flow-only nodes for decision, success, error, or async states that are not full product screens.
- Transitions for every user-triggered route change.
- Stable trigger names such as `quoteRow.click`, `submitButton.click`, or `bottomNavigation.watchlist`.
- Optional `sourceAnchor` metadata for key transitions when the static Figma export should show a line starting from a visible UI trigger.
- Control-to-route mappings for bottom navigation, top app bar actions, segmented controls, tabs, or sheet actions.
- `flowLine: "key"` only for transitions that should be drawn on the UI Flow canvas.

Do not rely on screenshots, labels, or DOM text as the source of truth for flow behavior.

### 4. Data Contract

Create `docs/DATA_SPEC.md` and `<featurePrototypeData>.ts` before wiring interactions.

The data contract must document:

- Local fixtures used by each route.
- Field ownership and meaning.
- API contracts that would replace fixtures later.
- Data invariants used by the UI.
- Empty, loading, error, and branch fixtures when those states are in scope.

All prototype data must be local and deterministic.

### 5. UI Composition

Create the main `<FeaturePrototype>.tsx` only after the PRD, flow, and data contract exist.

Composition rules:

- Reuse existing design-system components first.
- Keep route state explicit and typed.
- Keep event handlers close to route state.
- Use route ids and transition mappings, not visible labels.
- Add prototype-only styles only for shell layout, preview framing, and glue that does not belong in a reusable component.
- Keep prototype CSS scoped under the prototype root class.

### 6. Storybook Registration

Attach the prototype to Storybook through `<FeaturePrototype>.stories.tsx`.

The story must:

- Use `layout: "fullscreen"`.
- Render the interactive prototype as the default story.
- Attach the complete meta object to `parameters.prototype`.
- Support UI Flow iframe previews when `prototypeFlowPreview=true` is present in the story URL.
- Place `data-prototype-route-preview="true"` on the actual route UI boundary so UI Flow can auto-fit the iframe width and height to the rendered surface.
- When adding a Static Flow export, read the same saved UI Flow layout positions and reserve the same route UI width and height as the marked UI Flow preview surface; headers, borders, and flow labels should be outer chrome.
- Keep Static Flow visually equivalent to UI Flow: dotted canvas, route card chrome, flow-only node shapes, dashed edges, color variants, arrowheads, and label pills should match the interactive review canvas.

### 7. Review And Verification

Before considering a prototype complete, verify:

- The default story renders without runtime errors.
- Docs mode shows PRD, UI Spec, Flow Spec, Data Spec, Implementation Guide, and Acceptance.
- UI Flow routes are generated from metadata.
- UI Flow visible edges match transitions marked with `flowLine: "key"`.
- The Transition Index still lists every transition, including non-key transitions.
- Clicking every documented trigger either changes route, updates local state, or is explicitly out of scope.
- `npm run typecheck` passes.

## New Prototype Request Template

Use this prompt when asking an AI agent to create a new prototype:

```text
Use $prototype-storybook-flow to create a new Storybook product prototype.

Feature name:
Owner:
Primary user:
Problem:
Entry route:
Required routes:
Required transitions:
Required branch states:
Existing components to reuse:
Fixture fields:
Non-goals:
Acceptance criteria:
```

If product details are not ready, start with:

```text
Use $spectra-discuss to help me define a Storybook prototype PRD and UI Flow for <feature>.
Ask one focused question at a time, then summarize the PRD and flow contract before implementation.
```

## Developer Handoff Checklist

Before implementation starts, confirm:

- The PRD has goals, non-goals, users, journeys, dependencies, and AI implementation scope.
- Every reachable screen has a route id.
- Every branch that is not a product screen has a flow-only node.
- Every route-changing click has a transition with a stable trigger.
- Every route has deterministic fixture data.
- Existing design-system components have been identified.
- Prototype-only CSS scope and root class are named.
- Acceptance criteria cover Storybook, docs, UI Flow, interaction, accessibility, and TypeScript.

## Quality Bar

- The prototype must be clickable enough to validate the product flow, not only a static screenshot recreation.
- The route list and transition list must be the source of truth for flow review.
- Flow lines should be simplified dashed orthogonal polylines; only key transitions should appear on the canvas.
- Flow lines should animate along the dash path so reviewers can read transition direction toward the target UI.
- Flow nodes should embed the real Storybook route UI in iframe previews, not static placeholder cards.
- Route iframe previews should auto-fit the measured width and height of the marked route UI, not a hardcoded project viewport.
- Static Flow route previews should use the same UI width and height contract as UI Flow iframe previews.
- Static Flow should apply saved UI Flow layout positions before falling back to route metadata positions.
- Static Flow should use the same canvas, route card, edge, arrow, node shape, and label conventions as UI Flow.
- Flow nodes should be draggable so reviewers can move route cards while inspecting the flow.
- The UI Flow canvas should open in a fit-to-view scale and provide zoom controls for closer review.
- The UI must use existing components and design tokens before adding prototype-only styles.
- Fixtures must be deterministic, local, and documented.
- Every important user action must either navigate, update local state, or be called out as out of scope.
- PRD requirements and acceptance criteria must be specific enough for another AI agent to implement without reading private conversation context.
- The story must keep product behavior in component code and keep review metadata in `parameters.prototype`.

## Current Reference

Use `example-prototype` as the first reference implementation. It demonstrates:

- A single Storybook story with multiple route states.
- Local fixtures separated from render logic.
- Route and transition metadata separated from UI code.
- PRD and specs loaded into `parameters.prototype.docs`.
- Static Flow export that mirrors the interactive UI Flow review surface.
