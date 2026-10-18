# Known-Limitation Suppression Filter

The comparison script (`scripts/compare_payload_baseline.mjs`) suppresses
differences that are explained by documented exporter fidelity limitations,
so they never pollute the four-quadrant classification. Suppressed diffs are
**retained** in the report's `suppressed` section with their rule id and
reason — audit them there; they are never silently discarded.

Every threshold is a named exported constant in the script. Tune per project
by editing the constant; keep this document in step with the script.

## Rules

### `font-metrics-text-height`

- Constant: `FONT_METRICS_TEXT_HEIGHT_TOLERANCE_PX` (default `2`)
- Exporter limitation: browser and Figma font metrics may wrap and measure
  text differently, so a re-imported text block's height drifts by a pixel or
  two without any design edit (addon README: "browser/Figma font metrics may
  wrap text differently").
- Suppresses: `height` differences on `kind: "text"` nodes when the absolute
  delta is within the tolerance.
- Tuning: raise the tolerance for dense multi-line paragraphs where wrap
  drift compounds; a delta beyond the tolerance is always reported.

### `srgb-clamp-color`

- Constant: `SRGB_CLAMP_COLOR_EPSILON` (default `0.01`, per channel on a 0..1
  scale)
- Exporter limitation: modern color functions (`oklch()`, `lab()`, `color()`)
  normalize to sRGB at export time and wide-gamut values clamp, so the same
  design color can round-trip to a marginally different hex.
- Suppresses: `backgroundColor`, `color`, and `borderColor` differences when
  both values parse (hex or `rgb()/rgba()`) and every channel delta is within
  the epsilon.
- Tuning: keep the epsilon small — `0.01` ≈ 2.5/255 per channel. A larger
  epsilon starts swallowing real palette adjustments.

### `raster-embed-cap`

- Constant: `RASTER_EMBED_CAP_PX` (default `2048`)
- Exporter limitation: raster `img`/`canvas` embeds cap their longest side at
  2048px, so a larger source renders as a dimension difference that is the
  cap, not a resize.
- Suppresses: `width`/`height` differences on `kind: "image"` nodes when
  either side's value is at or beyond the cap.
- Tuning: matches the exporter's hard cap; change only if the exporter's cap
  changes.

### `browser-reference-layer`

- Constant: `BROWSER_REFERENCE_NODE_NAME` (default `"Browser Reference"`)
- Exporter/importer behavior: the importer places a locked "Browser
  Reference" snapshot beside every import for visual QA. It exists only in
  Figma, is replaced on re-import, and is never design content.
- Suppresses: **any** difference on a node whose path segment starts with the
  reference name — including the node's addition or removal.
- Tuning: none needed unless the importer's layer name changes.

### `figma-chrome-position`

- Constant: `FIGMA_CHROME_POSITION_FIELDS` (default `["x", "y"]`)
- Behavior: the root node's x/y describe where the import sits inside its
  Figma section or page — workspace placement, not design geometry. Designers
  move imports around freely.
- Suppresses: `x`/`y` differences on the root path only. Child-node offsets
  inside the design are still compared normally.
- Tuning: none.

## Interplay With Classification

A story whose only differences are suppressed classifies as `synced` — the
suppression happens before the two changed-booleans are computed. When
reviewing a report, scan the `suppressed` section once per run: a rule firing
unusually often (for example `srgb-clamp-color` on dozens of nodes) can hint
at a systemic drift worth investigating even though each instance is noise.
