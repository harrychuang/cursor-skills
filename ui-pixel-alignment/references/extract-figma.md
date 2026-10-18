# Extracting a UI Spec from Figma

Figma is the highest-fidelity reference available because it yields exact numbers and variable names. Always try the MCP path first. Fall back to images only when MCP is unavailable, and say so in the report.

## Capability lookup

Tool names differ between the Figma MCP servers (official Dev Mode server, the `claude_ai_Figma` connector, third-party bridges). Resolve by capability, not by a hardcoded name. Discover the available tools first, then map:

| Capability | Common tool names |
|---|---|
| Layout, styles, and generated code for a node | `get_design_context`, `get_code` |
| Variables / tokens bound to the selection | `get_variable_defs` |
| Node tree with ids, names, sizes, positions | `get_metadata` |
| Rendered image of a node | `get_screenshot`, `get_image` |
| Component ↔ code mapping | `get_code_connect_map` |
| Exported assets | `download_assets` |

If no Figma MCP tool is present, go to **Image fallback** below. Do not silently guess values.

## Resolving the node

A Figma URL carries the file key and, when the user copied a selection link, the node id:

```
https://www.figma.com/design/<fileKey>/<name>?node-id=1-234
                              ^^^^^^^^                 ^^^^^
```

- `node-id=1-234` in a URL is `1:234` in the API. Convert the dash to a colon when a tool rejects it.
- No `node-id` means the whole file. Ask which frame, or use `get_metadata` on the file and pick the frame whose name or size matches the target screen.
- If the user has Figma open with a selection and the tool supports an empty node argument, the current selection is used — confirm which frame was read before trusting the numbers.

## Extraction order

1. **`get_metadata`** on the frame — gives the node tree, names, and geometry. Use it to plan which nodes matter before pulling anything heavy. This is the cheapest call; do it first on any frame you have not seen.
2. **`get_variable_defs`** on the frame — gives the variable/token names bound to the selection. Populate `tokens` and every `tokenRefs` entry from this. A finding that says "use `--sys-space-6`" outranks one that says "use 24px".
3. **`get_design_context`** on the frame and on each node that matters — gives layout mode, padding, gap, alignment, typography, fills, strokes, radii, and effects. This is the source for `layout`, `box`, `type`, `fill`, `background`, `border`, `radius`, `shadow`.
4. **`get_screenshot`** on the frame — the reference image for `screenshots.reference` and for per-finding crops. Also the sanity check: if the numbers and the picture disagree, the node selection is wrong.
5. **`get_code_connect_map`** when it exists — tells you which Figma component already maps to which code component. That is the ownership answer handed to you for free; write it into the finding's `implementationReference`.

## Reading Figma auto-layout into the spec

| Figma | UI Spec |
|---|---|
| Auto layout `HORIZONTAL` / `VERTICAL` | `layout.mode` = `row` / `column` |
| No auto layout | `layout.mode` = `absolute`; record `box.position` |
| `itemSpacing` | `layout.gap` |
| `paddingTop/Right/Bottom/Left` | `box.padding` `[t, r, b, l]` |
| `primaryAxisAlignItems` | `layout.justify` (`MIN`→`start`, `MAX`→`end`, `SPACE_BETWEEN`→`space-between`) |
| `counterAxisAlignItems` | `layout.align` (`MIN`→`start`, `CENTER`→`center`, `MAX`→`end`) |
| `layoutSizingHorizontal: HUG` | `box.width` = `null` |
| `layoutSizingHorizontal: FILL` | `box.width` = `null`, note "fills parent" |
| `layoutSizingHorizontal: FIXED` | `box.width` = the measured value |
| `cornerRadius` / per-corner radii | `radius` `[tl, tr, br, bl]` |
| Drop shadow effect | `shadow` in CSS shadow syntax; also set `elevation` when the design system has an elevation scale |
| Line height `AUTO` | `type.lineHeight` = `null`, note "auto" |
| Line height `%` | multiply by `type.size` and round to 0.5px |
| Text `letterSpacing` in `%` | `size × percent / 100` |
| Variable bound to a property | the variable name in `tokenRefs`, the resolved value in the property |
| Component variant properties | append to `name`, e.g. `Button / size=md, state=default` |

Set `surface.fidelity` to `measured` when values came from these tools.

## Frame scale trap

A frame drawn at 2x (a 2880-wide frame for a 1440 viewport) makes every value look doubled. Before diffing, compare `surface.viewport.width` on both sides. If the reference frame is an exact 2x or 3x multiple of the implementation viewport, either pick the 1x frame or divide every extracted number by the factor and record it in `surface.density`. Never file "everything is 2x too big" as findings.

## Mobile frames

Figma mobile frames are usually 1x device-independent already (390×844 for iPhone 14/15, 360×800 for a common Android baseline). Those map directly to pt/dp — no conversion. What does need care:

- The status bar and home indicator are often drawn in the frame but are OS chrome, not app UI. Mark them `platformOnly: true` or leave them out.
- A design frame's safe-area padding may be baked into the top-level padding. Separate it: record the app's own padding, and note the safe-area allowance in `notes`.

## Image fallback

When MCP is unavailable or the file is not accessible:

1. Use the exported PNG/JPG the user provided, or `get_screenshot` if only that tool works.
2. Establish the scale: find one element whose real size is known (a full-bleed container, a standard 44pt tap target, the frame width matched to the stated viewport) and derive px-per-image-pixel from it. Write it into `surface.density`.
3. Measure relative to that scale. Round spacing to the nearest 4px and typography to the nearest 1px — implied precision beyond that is false.
4. Set `surface.fidelity` to `estimated`.
5. In the report summary, state plainly that values were measured from an image and are approximate, and that token names were inferred rather than read.

Estimated findings are still useful for layout and hierarchy problems. They are weak evidence for 1–2px spacing claims — do not file those from an image alone.
