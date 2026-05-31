# Visual Analysis Rubric

Use this rubric before writing design-system decisions.

## Source Inventory

Record every source:

| Source ID | Type | Path / URL / Node | Source fingerprint | Screen or state | Notes | Confidence |
|---|---|---|---|---|---|---|

Source types:

- `image`: screenshots, exports, marketing captures, mobile captures
- `figma`: Figma URL, node, page, Variables, component library
- `rendered-project`: localhost route, Storybook story, app screenshot
- `project-code`: CSS, tokens, components, templates
- `prompt`: written user description

Fingerprint guidance:

- Images and screenshots: use `sha256:<hash>` for exact file matches; add `phash:<hash>` or a crop note when perceptual comparison is available.
- Figma: normalize URLs to `figma:<file-key>#<node-id>` or `figma:<file-key>#page:<page-name>`.
- Rendered routes: include route, viewport, state, and screenshot/render command.
- Project code: include normalized file path plus exported token/component name when relevant.

When two sources share the same fingerprint or appear visually/functionally very close, record a row before counting both as independent evidence:

| Candidate source | Duplicate of | Match type | Fingerprint / normalized key | Suggested action | Developer decision | Rationale |
|---|---|---|---|---|---|---|

## Evidence Rows

Every important rule should come from an evidence row:

| Evidence ID | Source ID | Region | Observed pattern | Design decision | Affected output | Confidence |
|---|---|---|---|---|---|---|

Use confidence labels:

- High: repeated in multiple screens or confirmed by code/tokens.
- Medium: clear in one source, not contradicted elsewhere.
- Low: inferred, partially obscured, or only described by prompt.

## Visual Dimensions

Analyze these dimensions for every coherent product surface:

- color proportions: dominant, secondary, accent, semantic colors, neutral usage
- color scale candidates: palette families, light-to-dark order, and near duplicate colors that may need merge review
- duplicate source candidates: repeated screenshots, duplicate Figma nodes, repeated route/state screenshots, or prototype exports that should be reused or ignored
- foreground/background pairs: every background-like color needs a readable text/icon pair
- typography: family clues, scale, weights, line height, numeric behavior
- spacing: screen gutters, section gaps, row height, internal padding, density
- near numeric candidates: close spacing, radius, typography, opacity, or motion values that may need merge review
- shape: controls, cards, sheets, dialogs, chips, avatars, images
- elevation/depth: shadows, outlines, dividers, overlap, raised surfaces
- layout rhythm: app shell, top bars, bottom bars, section order, scroll behavior
- component candidates: purpose, behavior, anatomy, variants, states, and overlap with existing inventory/specs
- component review visuals: actual Figma node previews/screenshots or screenshot crops for close candidates; schematic SVG only as labeled fallback when source previews are unavailable
- icons: style, stroke, fill, size, labels, accessibility role
- imagery: photo/illustration style, crop, saturation, texture, realism
- data display: alignment, numeric formatting, charts, legends, comparison patterns
- states: selected, active, hover, pressed, focus-visible, disabled, loading, empty, error

## Extraction Rules

- Prefer repeated patterns over one-off decorative moments.
- Do not treat duplicate screenshots, Figma nodes, or rendered states as separate proof until the source duplicate review decision is documented.
- Do not create a separate component only because a Figma layer name differs; compare fingerprint, behavior, anatomy, states, tokens, and layout first.
- Do not normalize a distinctive design into generic SaaS defaults.
- Capture what is absent as well as what is present: no gradients, no card outlines, no shadows, no dense nav, etc.
- If the reference shows mobile-only UI, do not invent desktop behavior beyond responsive constraints.
- For project folders, rendered UI beats unused CSS. Existing tokens beat ad hoc CSS only when they are actually used.
