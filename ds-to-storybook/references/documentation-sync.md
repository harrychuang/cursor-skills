# Documentation Sync

Use this reference when a pass creates or changes shared components, when the user asks to audit/backfill design-system docs, or when `scripts/check_component_docs.mjs` reports missing/stale docs.

## Checker

Run after product discovery and again before closeout:

```sh
node <skill-root>/scripts/check_component_docs.mjs <product-repo-root> --design-system-root <design-system-package-root>
```

Use `--write` only when the user asked for automatic backfill or when the current pass created the component:

```sh
node <skill-root>/scripts/check_component_docs.mjs <product-repo-root> --design-system-root <design-system-package-root> --write
```

Use `--strict` when missing docs, inventory entries, stories, or review-status entries should fail the pass.

## Backfill Rules

For each component created or changed in the pass:

1. Ensure `design-system/components/<component-kebab-name>.md` exists.
2. Update the component doc with purpose, anatomy, props/slots, variants, states or display modes, accessibility behavior, responsive behavior, token contract, Storybook stories, and source evidence.
3. Preserve extracted specs as authoritative. If updating from implementation reality, add `Implementation Notes` or `Review Notes` instead of rewriting extracted evidence.
4. Mark docs created from code or stories as `implementation-derived` and `needs-review`.
5. Mark docs created from a concrete user brief but no extractor evidence as `brief-derived` and `needs-review`.
6. Update `COMPONENT_INVENTORY.md` when the component is new or its status/category changes.
7. Update `STORYBOOK_IMPLEMENTATION_MAP.md` with product targets, story targets, doc target, documentation provenance, source URL decision, verification command, and status.
8. Update `STORYBOOK_COMPONENT_QUEUE.md` or planner status for batch/library passes.
9. Ensure `component-review-status.json` has an entry for the primary story when the project uses review status; if no review flow exists, record that in the implementation map.

## Provenance

Use these labels consistently:

- `extracted`: generated from extracted design-system docs and source evidence.
- `brief-derived`: generated from a concrete user brief without extractor evidence.
- `implementation-derived`: generated from product code, CSS, and Storybook stories.
- `needs-review`: not yet confirmed against source design evidence.

Do not promote `brief-derived` or `implementation-derived` docs to source-of-truth status without explicit review.

## Closeout

Before marking a component complete, verify:

- the component doc exists
- the inventory entry exists or is explicitly out-of-scope
- the implementation map records doc provenance
- the co-located story exists
- source URL parameters or a no-source decision are recorded
- review status exists when the project uses component-review status
- verification commands and failures are recorded
