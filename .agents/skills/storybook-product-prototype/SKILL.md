---
name: storybook-product-prototype
description: Create PRD-led product prototypes in Storybook with docs, deterministic data, typed UI Flow route and transition metadata, and prototype stories. Use when turning a product idea into PRD, UI Flow, Data Spec, Acceptance Criteria, and a clickable Storybook prototype; when scaffolding a new prototype folder; or when validating prototype docs and metadata across React Storybook projects.
---

# Storybook Product Prototype

Use this skill to create a product prototype workflow that starts with PRD and flow decisions, then generates docs, deterministic fixtures, typed route metadata, and a clickable Storybook story. The skill is project-agnostic, but it expects a React/TypeScript Storybook project or a project that can adapt the generated files.

## First Actions

1. Detect the target repo root and Storybook setup.
2. Read existing prototype or page conventions if present: `src/pages/prototypes`, `src/pages`, `src/screens`, `src/components`, `.storybook`, and nearby `*.stories.*`.
3. If the user is still exploring the product idea, run a discussion first and ask one focused product question at a time. Do not create files until route, data, and acceptance scope are clear.
4. If the user asks to scaffold immediately, use `scripts/scaffold_prototype.py` and then fill the generated docs from the product brief.
5. If the target project already has a prototype inspector or `parameters.prototype` convention, adapt to it. If not, still generate `parameters.prototype` metadata and document that UI Flow rendering requires a Storybook addon or project-specific viewer.

## Reference Loading

Read only the reference needed for the current step:

- Product discovery and docs structure: `references/prototype-standard.md`
- PRD conversation and requirement shaping: `references/prd-workshop.md`
- Route, node, transition, and trigger rules: `references/ui-flow-contract.md`
- Storybook story and metadata integration: `references/storybook-integration.md`
- Fixture and API replacement rules: `references/data-contract.md`

## Workflow

### 1. Frame The Product

Before writing implementation files, confirm:

- Product name and owner.
- Primary user and problem.
- Entry route and initial state.
- Required routes and branch states.
- Required user-triggered transitions.
- Existing components to reuse.
- Fixture data needed by each route.
- Non-goals and external systems that must remain mocked.
- Acceptance criteria for Storybook review.

Ask only for answers that would change the route model, data contract, or acceptance criteria.

### 2. Generate Docs First

Create these docs before composing UI:

- `docs/PRD.md`
- `docs/FLOW_SPEC.md`
- `docs/UI_SPEC.md`
- `docs/DATA_SPEC.md`
- `docs/ACCEPTANCE.md`
- `docs/IMPLEMENTATION_GUIDE.md`

The docs are the durable handoff. They must be specific enough for another agent to continue without private conversation context.

### 3. Model UI Flow Before UI

Create `<featurePrototypeFlow>.ts` before the main React surface.

Rules:

- Use stable route ids, not visible labels.
- Add every visible or reachable screen to the route metadata.
- Add flow-only nodes for decision, success, error, loading, or async branch states that are not product screens.
- Add every route-changing user action to the transitions array.
- Use stable triggers such as `quoteRow.click`, `submitButton.click`, `bottomNavigation.watchlist`, or `settingsSheet.dismiss`.
- Use `flowLine: "key"` only for transitions that should be drawn on the simplified UI Flow canvas; keep the full transition list in metadata.

### 4. Create Deterministic Data

Create `<featurePrototypeData>.ts`.

Rules:

- Keep all prototype data local and deterministic.
- Use existing component prop types where possible.
- Include branch, empty, loading, and error fixtures when those states are in scope.
- Document fixture ownership and future API replacement points in `DATA_SPEC.md`.
- Do not call live product APIs from a prototype.

### 5. Compose The Storybook Prototype

Create the React prototype, CSS, metadata, story, and index files.

Rules:

- Reuse existing design-system components before creating local markup.
- Keep route state explicit and typed by route ids.
- Wire clicks through route mappings and transition triggers, not rendered text.
- Keep prototype-only CSS scoped under a feature root class.
- Use project tokens and styling conventions.
- Attach the complete meta object to `parameters.prototype`.
- Support iframe or embedded preview mode when the target Storybook UI Flow viewer requires it.

### 6. Validate

Run the checks that fit the target repo:

- `python <skill-root>/scripts/validate_prototype.py <prototype-folder>`
- Project typecheck, usually `npm run typecheck`
- Storybook render or build, usually `npm run storybook` or `npm run storybook:build`
- Manual Storybook review of Story, Docs, Data, and UI Flow if the project has a prototype inspector.

Do not mark the prototype complete unless docs, flow metadata, fixture data, story metadata, and interactive behavior describe the same product behavior.

## Scaffolding

Use the scaffold script when creating a new prototype from scratch:

```sh
python <skill-root>/scripts/scaffold_prototype.py "Portfolio Alerts" \
  --target-root src/pages/prototypes \
  --owner "Product Team"
```

The scaffold creates a folder based on the feature name and fills template tokens. After scaffolding, replace the generated bracketed guidance with concrete product content before implementation.

## Quality Bar

- The prototype is a clickable product flow, not a static screenshot recreation.
- PRD, UI Spec, Flow Spec, Data Spec, Acceptance Criteria, and Storybook metadata stay consistent.
- UI Flow is generated from route, flow-node, and transition metadata.
- Fixture data is deterministic and local.
- Storybook `parameters.prototype` remains the review contract.
- Project-specific UI Flow rendering is handled by the target project runtime or addon; this skill provides the metadata contract and templates.
