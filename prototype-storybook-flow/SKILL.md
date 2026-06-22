---
name: prototype-storybook-flow
description: Create or update PRD-led Storybook product prototypes under src/pages/prototypes with docs, typed route and transition metadata, deterministic fixtures, intuitive UI Flow review data, draggable Storybook UI Flow viewers with animated dashed arrow connections, Figma-exportable flow stories, and prototype Storybook stories. Use when building a new product prototype, turning a product idea into PRD plus UI Flow, standardizing prototype docs, updating an existing prototype flow, or preparing a Storybook prototype flow for JSON import into Figma with storybook-to-figma.
---

# Prototype Storybook Flow

## Overview

Use this skill to take a product idea from PRD to a clickable Storybook prototype with a metadata-driven UI Flow. The flow must be easy to read: each UI route should show how it relates to other routes, what user action causes each transition, where the transition goes, and which direction it travels.

The primary Storybook review experience should use a UI Flow viewer that renders real route UI previews, animated dashed connector lines, arrowheads toward the next UI, draggable nodes, and zoom/fit controls. The reference implementation is `src/pages/prototypes/inventory-prototype`.

The Figma export experience is a separate deterministic story. It must render the flow as normal DOM/SVG, not iframe-only content, so the Storybook Figma export addon can produce JSON that `/Users/HarryChuang/Dropbox/Works/figma-plugin/storybook-to-figma` can import into Figma.

## Required Context

Before creating or changing a prototype, read:

- `src/pages/prototypes/README.md`
- `src/pages/prototypes/inventory-prototype/docs/PRD.md`
- `src/pages/prototypes/inventory-prototype/docs/FLOW_SPEC.md`
- `src/pages/prototypes/inventory-prototype/docs/IMPLEMENTATION_GUIDE.md`
- `src/pages/prototypes/inventory-prototype/inventoryPrototypeFlow.ts`
- `src/pages/prototypes/inventory-prototype/inventoryPrototypeMeta.ts`
- `src/pages/prototypes/inventory-prototype/InventoryPrototype.stories.tsx`

Also inspect the target Storybook runtime before implementation:

- `.storybook/` for an existing prototype inspector, UI Flow viewer, Figma export addon, preview decorators, and story parameters.
- `src/pages/prototypes/README.md` for `flowPosition`, `flowLine`, iframe preview, and viewer acceptance rules.
- If present, `.storybook/prototype-inspector/preview.js`, `manager.js`, `preset.js`, and CSS to understand the existing viewer contract.
- If Figma export is requested, `/Users/HarryChuang/Dropbox/Works/figma-plugin/storybook-to-figma/README.md` for the JSON payload contract.

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
- UI Flow viewer expectations: route preview size, canvas layout, draggable layout persistence, zoom behavior, and which transitions should be visually prominent.
- Figma export expectations: whether to export only the flow map, each screen as separate component stories, or both.
- Non-goals.
- Storybook acceptance criteria.

Ask one focused question at a time only when a missing answer would change the route model or acceptance criteria.

### 2. Write The Docs First

Create or update these docs under `src/pages/prototypes/<feature-prototype>/docs/` before composing UI:

- `PRD.md`: product summary, problem, users, goals, non-goals, core journeys, AI implementation scope, dependencies.
- `FLOW_SPEC.md`: source of truth for route ids, flow-only nodes, transitions, trigger names, control mappings, local state rules.
- `UI_SPEC.md`: shell layout, component composition, visual states, interaction rules, UI Flow viewer behavior, Figma export story behavior, accessibility, design-token constraints.
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
- Add `label` values that explain the interaction in reviewer language, such as `Click quote row`, `Submit order`, or `Choose watchlist tab`.
- Add `kind` values such as `primary`, `return`, `global`, `secondary`, or `outcome` so the viewer can visually distinguish transition importance.
- Add `flowPosition: { x, y }` for important routes and flow-only nodes when the automatic layout would obscure relationships. Use stable positions so exported Figma flow maps are repeatable.
- Use `flowLine: "key"` only for the simplified UI Flow canvas. Keep non-key transitions in the Transition Index.
- Do not infer flow behavior from screenshots, rendered labels, or DOM text.

### 4. Create Deterministic Fixtures

Create `<featurePrototypeData>.ts`.

Rules:

- Keep all prototype data local and deterministic.
- Use existing component prop types where possible.
- Include fixtures for branch states that appear in the flow.
- Document every fixture group in `DATA_SPEC.md`.
- Do not call real quote, trading, auth, account, notification, or user APIs from a prototype.

### 5. Ensure The UI Flow Viewer

Before composing or verifying the prototype, make sure the target Storybook has a UI Flow viewer capable of the required review experience.

Preferred implementation:

- Reuse an existing `.storybook/prototype-inspector/` if the project has one.
- If the target repo was scaffolded from `ds-to-storybook`, use its existing prototype inspector.
- If the target repo lacks a viewer and the local skill package is available, copy the known-good inspector from `design-system-to-storybook` or `ds-to-storybook` starter: `assets/storybook-starter/.storybook/prototype-inspector/`.
- If the project already uses an equivalent viewer, adapt to its parameter names only after confirming it supports route UI previews, animated dashed arrows, draggable nodes, zoom/fit, and a transition index.
- Do not silently fall back to metadata-only flow docs when the user asked for visual UI Flow. Mark the viewer setup blocked or implement the viewer before declaring the prototype complete.

Viewer requirements:

- Render route nodes as cards that embed the real Storybook route UI through iframe preview URLs with `prototypeFlowPreview=true` and `prototypeRoute=<route-id>`.
- Render every `flowLine: "key"` transition as a simplified dashed line or orthogonal polyline.
- Animate dash offset so direction is visible, and include arrowheads pointing to the target UI.
- Show edge labels from transition `label` and expose the full trigger name for review.
- Allow route cards and flow-only nodes to be dragged; persist the adjusted layout when the viewer supports local storage or saved layout metadata.
- Provide zoom in, zoom out, and fit-to-view controls.
- Keep the Transition Index for all transitions, including non-key transitions that are intentionally not drawn on the canvas.

### 6. Compose The Prototype

Create `<FeaturePrototype>.tsx`, `<feature-prototype>.css`, `index.ts`, and `<FeaturePrototype>.stories.tsx`.

Rules:

- Reuse existing design-system components before adding local markup.
- Keep route state explicit and typed by route ids.
- Wire clicks through mappings and transition triggers, not visible labels.
- Keep prototype-only CSS scoped under a feature root class.
- Use design tokens for color, spacing, type, size, shape, scrim, and viewport values.
- Keep product behavior in component code and review metadata in `parameters.prototype`.
- Support `prototypeFlowPreview=true` when route UI needs to render inside the UI Flow iframe preview.
- Support `prototypeRoute=<route-id>` so the viewer can iframe a specific route card without rendering unrelated routes.
- Keep iframe preview route UI deterministic: no random data, unresolved async state, or network calls.

### 7. Create Figma-Exportable Flow

Create a Figma export story in the same story file, normally named `FigmaFlowExport`, whenever the flow should be imported into Figma.

The Figma export story is not the same as the interactive viewer:

- Render the flow map directly as normal React DOM and inline SVG. Do not rely on iframe content for the exported route cards, because the Figma export addon imports the current DOM tree, not a separate nested Storybook document.
- Use a stable root such as `data-component="prototype-flow"` and a class like `<feature>-prototype-flow-export`.
- Render each route or flow-only node as a visible frame/card with stable `data-component` or `data-route-id` markers, title, route id, purpose, and compact route UI preview content.
- Draw connector lines as inline SVG `polyline` or `path` elements with dashed stroke, arrow markers, and text labels. The static SVG should preserve direction even though motion will not run in Figma.
- Keep all visible colors, spacing, radii, typography, stroke widths, arrow sizes, and canvas dimensions token-backed through CSS variables.
- Set fixed or deterministic canvas dimensions and route card positions from `flowPosition` or a deterministic layout function.
- Avoid canvas, iframe-only content, CSS masks, filter-dependent arrows, pseudo-element-only labels, and animation-only direction cues in the export story.
- Attach the same `parameters.prototype` metadata and add Figma export parameters used by the project, such as `figmaSourceUrl` or `parameters.design.url` when available.

The `/Users/HarryChuang/Dropbox/Works/figma-plugin/storybook-to-figma` plugin consumes the Storybook Figma export addon's `Copy JSON` payload, not raw prototype metadata. Therefore the export story must be compatible with the addon payload shape: `version`, `componentTitle`, `storyName`, `tokenSystem`, `tokens`, and `root`.

If the Storybook Figma export addon is absent, install or configure it through the project's existing Storybook/Figma-export workflow before claiming Figma import support. If installing the addon is out of scope, document the blocked Figma export step in `ACCEPTANCE.md` and `IMPLEMENTATION_GUIDE.md`.

### 8. Attach Metadata

Create `<featurePrototypeMeta>.ts` and attach it to `parameters.prototype` for both the default interactive story and the Figma export story.

The meta object must expose:

- `id`, `title`, `description`, `owner`, and `status`.
- Raw docs for PRD, UI Spec, Flow Spec, Data Spec, Implementation Guide, and Acceptance.
- `flow.routes`, `flow.nodes`, and `flow.transitions`.
- `data` with fixture inventory, route data requirements, and API replacement points.
- `figmaExport` notes when useful: export story id/title, Storybook Figma addon status, known unsupported CSS/DOM features, and the intended import plugin path.

### 9. Verify

Run the checks that fit the change:

- `npm run typecheck`
- Storybook story renders in `Pages/Prototypes/<Feature Prototype>/Default`.
- Prototype docs mode shows all required docs.
- UI Flow routes and nodes come from metadata.
- UI Flow visible edges match transitions marked with `flowLine: "key"`, use dashed animated lines, and show arrowheads toward the target UI.
- UI Flow route cards display real Storybook route UI previews through `prototypeFlowPreview=true`.
- UI Flow nodes/cards can be dragged without breaking edge direction or labels.
- UI Flow zoom in, zoom out, and fit-to-view controls work.
- Transition Index lists the full transition contract.
- Every documented trigger either navigates, updates local state, or is explicitly out of scope.
- `FigmaFlowExport` renders a deterministic, non-iframe flow map using normal DOM/SVG.
- The Storybook Figma export addon can copy JSON for `FigmaFlowExport`.
- `/Users/HarryChuang/Dropbox/Works/figma-plugin/storybook-to-figma` can import that JSON into Figma, or the blocked reason is documented.

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
- The UI Flow viewer must make relationships obvious: route previews, interaction labels, dashed motion direction, arrowheads, and draggable nodes are required when visual UI Flow is in scope.
- The Figma export story must be deterministic and importable through the Storybook Figma export addon plus `/Users/HarryChuang/Dropbox/Works/figma-plugin/storybook-to-figma`; metadata-only flow is not enough for Figma import.
- The prototype must be clickable enough to validate product flow, not just visually similar.
- Prototype CSS must not become a substitute for missing reusable component work. If a design-system gap blocks fidelity, document the gap before adding local markup.

## Gates

### UI Flow Viewer Gate

Do not mark visual UI Flow complete unless Storybook shows route UI previews, key transition lines, readable interaction labels, animated dashed direction, arrowheads, draggable nodes, zoom controls, and a Transition Index.

### Figma Export Gate

Do not claim Figma support from `parameters.prototype` alone. Figma support requires a Storybook story that exports through the Storybook Figma export addon's JSON payload and imports through `storybook-to-figma`. If the flow story uses iframe-only route previews, create a separate export story with direct DOM/SVG route cards.

### Relationship Clarity Gate

Do not draw every transition on the canvas. Draw only reviewer-critical transitions with `flowLine: "key"` and put secondary/reference transitions in the Transition Index. Use labels and arrow direction to make "click what -> goes where" clear without reading source code.
