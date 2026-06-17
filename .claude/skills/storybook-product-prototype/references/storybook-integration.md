# Storybook Integration

Use this reference when creating `<FeaturePrototype>.stories.tsx` and `<featurePrototypeMeta>.ts`.

## Story Requirements

The default story should:

- Use `layout: "fullscreen"` when rendering a full product surface.
- Render a clickable prototype, not a static screenshot.
- Attach the meta object to `parameters.prototype`.
- Support route preview mode if the target project's UI Flow viewer embeds iframes.

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

The `docs` object should import raw markdown from:

- `docs/PRD.md`
- `docs/UI_SPEC.md`
- `docs/FLOW_SPEC.md`
- `docs/DATA_SPEC.md`
- `docs/IMPLEMENTATION_GUIDE.md`
- `docs/ACCEPTANCE.md`

The `flow` object should expose:

- `routes`
- `nodes`
- `transitions`

The `data` object should summarize:

- fixture inventory
- route data requirements
- API replacement points
- source ownership when known

## UI Flow Viewer Boundary

This skill creates the metadata contract. It does not guarantee the target Storybook already has a UI Flow viewer.

If the target project has no prototype inspector:

1. Still generate `parameters.prototype`.
2. Document that Docs/Data/UI Flow review requires a Storybook addon or project-specific viewer.
3. Do not silently add dependencies unless the user asks for Storybook runtime integration.

If the target project already has a prototype inspector, match its parameter name and preview-mode query conventions.
