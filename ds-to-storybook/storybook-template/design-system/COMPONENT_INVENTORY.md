# Component Inventory

Inventory repeated components and UI, graphic, layout, and typographic patterns from the references.

| Component | Category | Seen in | Status | Priority | Fingerprint summary | Required tokens | Missing states / modes | Notes |
|---|---|---|---|---|---|---|---|---|
| Example Card | data-display | S-01 | implementation-derived | P2 | Surface card with eyebrow, status pill, title, and description | color, type, spacing, shape, shadow, size | Hover, focus-visible, and loading are not applicable for this display-only starter | Starter example that proves tokens, catalog, and stories are wired. Replace or delete after the first real extraction. |

Status values: `extracted`, `planned`, `blocked`, `out-of-scope`. Status words belong only in the Status column: the current `design-system-to-storybook` planner reads Status by header name, while older planner copies and inventories without a Status column are scanned cell by cell for `blocked`, `deferred`, `out of scope`, and `needs-extraction`, so phrase Notes without those words. Category (optional): `foundation`, `primitive`, `typographic`, `form-control`, `layout`, `navigation`, `data-display`, `feedback`, `overlay`, `composite`, `product-pattern`.

## Component Similarity Review

Use this table when a newly observed component is visually, structurally, behaviorally, or compositionally close to an existing component. Create the row and its review image when the overlap is found; confirm unresolved rows before creating another component spec.

| New candidate | Similar existing component | Visual reference | Similarity reason | Suggested action | Developer decision (`merge` / `make variant` / `keep distinct` / `blocked`) | Rationale / owner |
|---|---|---|---|---|---|---|

Visual references must point to source-based previews when available, such as actual Figma node screenshots or screenshot crops saved under `assets/component-review/`. A schematic SVG is allowed only as a last-resort fallback when source previews cannot be captured, and it must be labeled `schematic fallback - source preview unavailable`.
