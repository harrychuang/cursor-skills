# Storybook Integration

Use this reference when creating `<FeaturePrototype>.stories.tsx` and `<featurePrototypeMeta>.ts`.

## Story Requirements

The default story should:

- Use `layout: "fullscreen"` when rendering a full product surface.
- Render a clickable prototype, not a static screenshot.
- Attach the meta object to `parameters.prototype`.
- Support `prototypeFlowPreview=true` for compact iframe preview styling.
- Support `prototypeRoute=<route-id>` so UI Flow route cards can render the correct route.
- Add `data-prototype-route-preview="true"` to the route preview shell for template-compatible iframe measurement.
- Keep `data-prototype-root="true"` on the prototype root for backward-compatible viewers.

The Static Flow story should:

- Export `StaticFlow` from `<FeaturePrototypeFlowExport>.stories.tsx`.
- Use the same Storybook title and `parameters.prototype` object as the interactive story.
- Use `layout: "fullscreen"`.
- Render route cards and flow-only nodes from `flow.routes`, `flow.nodes`, and key `flow.transitions`.
- Read saved layout through `../prototypeFlowLayout` so positions edited in the Prototype Inspector match the export artifact.

## Metadata Shape

Expose a meta object with:

- `id`
- `title`
- `description`
- `owner`
- `status`
- `docs`
- `flow`
- `data`
- `figmaExport`

The `docs` object should import raw markdown from:

- `docs/PRD.md`
- `docs/UI_SPEC.md`
- `docs/FLOW_SPEC.md`
- `docs/DATA_SPEC.md`
- `docs/PRODUCTION_HANDOFF.md`
- `docs/IMPLEMENTATION_GUIDE.md`
- `docs/ACCEPTANCE.md`

Use `productionHandoff` as the `docs` key for `docs/PRODUCTION_HANDOFF.md`.

The `flow` object should expose:

- `routes`
- `nodes`
- `transitions`

The `data` object should summarize:

- fixture inventory
- route data requirements
- API replacement points
- source ownership when known

The `figmaExport` object should expose:

- `flowStoryId`: the Storybook id for the `StaticFlow` export, for example `pages-prototypes-example-prototype--static-flow`.

`PRODUCTION_HANDOFF.md` should be exposed with the other docs so reviewers can inspect frontend implementation guidance without leaving Storybook.

## UI Flow Viewer Boundary

This skill creates the metadata contract and includes a bundled Prototype Inspector runtime.

If the target project has no prototype inspector:

1. Still generate `parameters.prototype`.
2. Install the bundled runtime only when the user asks for Storybook UI Flow review:
   `node <skill-root>/scripts/install_prototype_inspector.mjs --project-root <repo-root>`.
3. Do not replace an existing `.storybook/prototype-inspector` folder or `src/pages/prototypes/prototypeFlowLayout.ts` unless the user approves `--force`. Re-running with `--force` is also how an existing install picks up bundled addon updates.
4. The inspector CSS defines a `--pi-*` token layer: each token reads the `--sbt-*` design token when the project defines it and otherwise falls back to built-in neutral values (with a `prefers-color-scheme: dark` fallback set), so the panels render correctly in any React Storybook project. When the project uses another token prefix, pass `--token-prefix <prefix>` (for example `--token-prefix md`) to bind the layer to the project's tokens, or redefine `--pi-*` tokens on `.prototype-inspector` in a stylesheet loaded after the addon CSS.

If the target project already has a prototype inspector, match its parameter name, preview-mode query conventions, route preview selector, and saved layout helper. For repos created from `design-system-to-storybook/storybook-template`, keep the existing `prototypeFlowLayout.ts` schema and Static Flow pattern.

## Bundled Prototype Inspector

The bundled addon reads `parameters.prototype` and provides a Storybook toolbar with:

- `Story`: the original story.
- `Docs`: PRD, UI Spec, Flow Spec, Data Spec, Frontend Handoff, Implementation Guide, and Acceptance markdown.
- `UI Flow`: route cards, flow-only nodes, key transition lines, zoom, drag, pan, layout import, and layout export.
- `Data`: fixture summary, API replacement points, source ownership, route data map, state rules, and raw metadata.
- `Open Static Flow`: when `parameters.prototype.figmaExport.flowStoryId` is present, open the Figma-ready static flow story that uses the same saved layout.
