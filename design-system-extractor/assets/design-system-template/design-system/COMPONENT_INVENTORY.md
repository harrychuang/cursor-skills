# Component Inventory

Inventory repeated components and UI, graphic, layout, and typographic patterns from the references.

| Component | Seen in | Status | Priority | Fingerprint summary | Required tokens | Missing states / modes | Notes |
|---|---|---|---|---|---|---|---|

Status values: `extracted`, `planned`, `blocked`, `out-of-scope`.

## Component Similarity Review

Use this table when a newly observed component is visually, structurally, behaviorally, or compositionally close to an existing component. Write the suggested action during extraction and leave `Developer decision` empty: it is filled only after a designer confirms, on the review page (`docs/design-system/review.html`) or in the conversation. Do not create another component spec for a row that is still waiting.

| New candidate | Similar existing component | Visual reference | Similarity reason | Suggested action | Developer decision (`merge` / `make variant` / `keep distinct` / `blocked`) | Rationale / owner |
|---|---|---|---|---|---|---|

Give the `Visual reference` cell one image per side: the new candidate first, the similar existing component second. Mark the compared part with a region in the image link, as a percent of the image — `![Candidate](assets/component-review/route-stock.png#xywh=percent:9.2,20.5,30.4,4.4)` — or in pixels of its natural size (`#xywh=132,246,438,53`). Prefer the full screenshot plus a region over a pre-cropped image, so a region placed on the wrong part is visible on the review page.

Visual references must point to source-based previews when available, such as actual Figma node screenshots or product screenshots saved under `assets/component-review/`. A schematic SVG is allowed only as a last-resort fallback when source previews cannot be captured, and it must be labeled `schematic fallback - source preview unavailable`.
