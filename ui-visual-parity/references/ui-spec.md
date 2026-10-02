# The UI Spec (version 1.1)

One surface, measured: every rendered node under a root with its box, and for every node that paints, what it looks like. `scripts/extract_dom.js` produces it from a web page and `scripts/extract_figma.js` from a Figma frame; `scripts/parity_diff.mjs` reads it. How to produce one is in `measure.md`.

## Top level

| Field | Content |
|---|---|
| `specVersion` | `"1.1"` |
| `surface` | Where and how the capture was taken |
| `tokens` | Web only. Every custom property the page's readable stylesheets declare, with its value resolved on `:root`: `{ "--space-6": "24px" }`. For looking a token up; not compared. |
| `nodes` | The nodes in document order, parents before children. The first one without a `parent` is the root. |
| `accessibilityRemaps` | Optional, added by hand: accessibility remap records (`parity-policy.md`) |

**Units.** Every length is in CSS px at density 1, rounded to 0.01. Positions are relative to the root's top-left corner, so the root's `rect` starts at 0, 0. A Figma px, an iOS pt, an Android dp, and a Flutter logical px are each 1.

**Colours** are `#rrggbb` in lower case, or `#rrggbbaa` when translucent, whatever notation the source used (`rgb()`, `hsl()`, `oklch()`, a name). A Figma paint's opacity is folded into the alpha: 18% white is `#ffffff2e`.

## The surface

| Field | Content |
|---|---|
| `name` | The name given to the capture; for Figma, the frame's name |
| `platform` | `web` or `figma` from the extractors; `ios`, `android`, `react-native`, or `flutter` in a hand-assembled spec. Decides the engine class and the touch rules (`parity-policy.md`). |
| `source` | The page's URL, or the frame's link |
| `viewport` | `{ width, height }` of the window; for Figma, the frame's size. A cycle opens the implementation at this size. |
| `density` | Device pixel ratio of the screenshot. Always 1 in a Figma spec. |
| `root` | `{ selector, width, height, pageX, pageY }`: the root's selector (for Figma its node id), its size, and its position on the page. The screenshot is clipped to it, and `root.width` decides the form factor. |
| `theme` | Web only. `dark` or `light`: the colour scheme the capture was taken in (`--theme`), which is what `prefers-color-scheme` matched. It is not a reading of the page's own theme switch. A cycle captures the implementation in the reference's scheme. |
| `direction`, `locale` | Web only. The root's text direction (`ltr`, `rtl`) and the page's `<html lang>` |
| `capturedAt` | ISO timestamp |
| `fidelity` | `measured`: read from the rendered page or from the design file's properties; both extractors write this. `geometry-only`: rectangles and names only, so appearance is not compared (`measure.md`). `estimated`: values read off a picture by eye, set by hand; numeric differences under 2px are dropped. |
| `fonts` | `{ requested, loaded, aligned }`: the families the text asks for, the families it was drawn with, and whether they agree. `aligned` is `false` when a requested named family did not render: on the web by what the engine reports, in Figma by the text layers it marks as missing their font. Without `aligned` the comparison calls the font environment `unknown`. |
| `stable`, `screenshot` | Bundled web capture only: `false` when the screenshot never settled, and the PNG's file name |
| `coordinates` | Metadata conversion only: `parent` or `canvas`, how the positions were read |

## Nodes and primitives

Every rendered element is a node. What is not rendered is absent: `display: none`, a subtree at 0 effective opacity, a hidden Figma layer.

**Primitives.** A node with `paints: true` is a primitive, the unit the diff pairs and compares. A `box` paints when it has a visible fill, a gradient or background image, a border, a shadow, an outline, or a `::before` / `::after` decoration; every `text`, `icon`, `image`, and `input` paints. On the web it must also be on screen: not `visibility: hidden`, not zero-sized, not clipped away entirely by an ancestor. A wrapper that paints nothing stays in the spec with `paints: false`, because its padding, margin, and gap explain the distances between primitives.

**Text.** A text block is a node of its own. On the web, the text directly inside an element, together with its inline children (`<b>`, `<a>`, `<span>`), becomes one `text` node: its `id` is the host element's id plus `t` (`n12` → `n12t`), its `parent` is the host, and its `tag` is `#text`. Its `rect` is the block's line boxes, not the host's box: as wide as the rendered words, cut where an ancestor clips them, and line count × line height tall. In a Figma spec the text layer is the `text` node.

The words a form control shows are a `text` node in the same way, with `role` saying which words they are: `value` (what was typed, or the chosen option of a select) or `placeholder` (an empty control). Their `rect` is calculated, since a page cannot measure inside a control: from the start of the control's content box, centred vertically (from the top in a text area), as wide as the words measure in the control's font. This is what lets a wrong padding inside an input be reported as a padding.

**Nodes the diff drops.** Before pairing, the diff removes every node marked `platformOnly: true`, every node the policy lists under `platformOnlyNodes`, in a spec that is not a web capture every node whose `name` or `id` contains one of the policy's `ignoredNodeNamePatterns` (status bar, home indicator, scrollbar, …), and everything inside them. Neither extractor writes `platformOnly`; it is added by hand to a node that exists on one platform only. Primitives whose centre lies in an area passed with `--ignore` are left out as well. The rules are in `parity-policy.md`.

## Node fields

Fields marked ○ are recorded for the reader and not read by the diff: a difference there shows only in the pixel check. "Web" or "Figma" in the Kinds column means only that extractor writes the field.

### Identity and structure

| Field | Type | Kinds | Meaning |
|---|---|---|---|
| `id` | string | all | Web: `n1`, `n2`, … in document order, so it changes when the DOM does. Figma: the layer's node id (`12:345`). |
| `parent` | string or null | all | The parent node's `id`; `null` on the root |
| `depth` ○ | number | all | Nesting depth; 0 on the root |
| `tag` | string | all | Lower-case tag name; `#text` for a web text block. Figma: the layer type (`frame`, `instance`, `text`, `rectangle`). |
| `name` | string | all | Web: `aria-label`, else `data-name`, else the last part of `selector`. A text block: its words, cut at 40 characters. Figma: the layer name. |
| `selector` | string | all | Web: the element and up to two ancestors, each as `tag#id` or `tag.class.class`, joined by ` > `. A label to find the element by, not guaranteed unique. Figma: `Parent name > Layer name`. |
| `kind` | string | all | `box`, `text`, `icon`, `image`, or `input`. Web: `<svg>` is an icon; `<img>`, `<video>`, `<canvas>`, `<iframe>` are images (a `<picture>` is a plain box around its `<img>`); `<input>`, `<textarea>`, `<select>` are inputs. Figma: a vector or a small group of shapes is an icon, a layer with an image fill is an image, and there is no `input`. |
| `paints` | boolean | all | Whether the node is a primitive |
| `rect` | `{ x, y, width, height }` | all | The box as rendered, transforms included. Text: its line boxes. Figma: the layer's bounding box; a line layer is the thin box its stroke draws. |
| `visibleRect` ○ | rect | web, any but text | The part of `rect` that clipping ancestors leave visible, when it is smaller |
| `keys` | object | web elements, all Figma nodes | Values a pair can be forced by: `nodeId` (`data-node-id`; in Figma the layer id), `testId` (`data-testid`), `domId` (`id`). A reference primitive pairs first with the implementation node whose `keys` hold its `id` or one of its own key values: an element with `data-node-id="12:345"` pairs with Figma layer `12:345`. |
| `hidden` ○ | `true` | web, any but text | `visibility` is not `visible`; the node keeps its place and does not paint |
| `interactive` | `true` | web, any but text | A button, link, form control, `summary`, an element with an interactive `role`, or one focusable by `tabindex`. States are captured on these, and touch-target rules apply to them. |

### Layout and box

Every node except a web text block carries `layout` and `box`. Their values are read to explain a distance or a size, never compared for their own sake.

| Field | Type | Meaning |
|---|---|---|
| `layout.mode` | string | `row` or `column` (flex, auto layout), `grid` (CSS grid, a Figma grid frame), `flow` (normal flow on the web), `absolute` (a Figma layer without auto layout) |
| `layout.justify` ○, `layout.align` ○ | string or null | Main-axis distribution (`start`, `center`, `end`, `space-between`, `space-around`, `space-evenly`) and cross-axis alignment (`start`, `center`, `end`, `stretch`, `baseline`); `null` outside flex, grid, and auto layout |
| `layout.gap` | number | The gap between children along the main axis; in a grid, the column gap |
| `layout.crossGap` | number | The gap on the other axis: in a grid the row gap, in a row or column that wraps the gap between its lines |
| `layout.wrap` | boolean | Whether children wrap |
| `layout.positioned` | `absolute`, `fixed`, or null | Set when the node is taken out of its parent's flow. Figma: `absolute` for a child of a frame without auto layout, or one set to absolute position. |
| `layout.pinned` | string[] | On positioned nodes only: the sides it is pinned to, such as `["top", "right"]`. Web: the sides whose offset is not `auto`. Figma: its constraints. |
| `layout.inset` | object | On positioned nodes only: the offset on each pinned side, such as `{ "top": 4, "right": 8 }`. Web: the used value of `top`, `right`, `bottom`, `left`. Figma: the distance to the parent's edge. An element pinned at the same offset on both sides is where its source put it. |
| `layout.inline` ○ | boolean | Web: an inline-level display (`inline`, `inline-block`, `inline-flex`) |
| `box.padding`, `box.margin`, `box.borderWidth` | number[4] | `[top, right, bottom, left]`. Figma: margin is 0, and `borderWidth` is 0 unless strokes are included in layout (`figma-to-css.md`). |
| `box.marginAuto` | boolean[4] | Web, when any margin is `auto`: which ones. An auto margin's value in `box.margin` is leftover space, and is never read as a declared distance. |
| `box.minWidth`, `box.maxWidth`, `box.minHeight`, `box.maxHeight` | number or string | Web, when set: px, or the CSS value as written when it is not px. Between two web captures, a limit that differs explains a size difference on that axis and is named in the finding. |
| `box.fixed` | `{ width, height }` | Whether each axis has an explicitly declared size; present when at least one has. Web: the cascade settled on a plain length (`240px`, `3rem`) for it, or the element has a `width` / `height` attribute; not `%`, `auto`, a `calc()` of a percentage, or a content keyword. Figma: fixed sizing, or explicit coordinates. Decides whether a size difference is a cause. |

### Paint

| Field | Type | Kinds | Meaning |
|---|---|---|---|
| `background` | colour | box, input, image, icon | The fill; absent when transparent |
| `gradient` | string | same | Background layers in canonical form, top first, joined by ` \| `: `linear(135deg, #4f46e5 0%, #7c3aed 100%)`, `radial(…)`, `conic(…)`, and `image(hero.png)` for a `url()`. Side keywords, `turn`, and `rad` become degrees, and a corner keyword (`to bottom right`) becomes the angle it means for that box. A stop has a position only when the source gave one; the comparison spreads the others evenly. |
| `border` | `{ width, color, style }` | same | Each `[top, right, bottom, left]`; a side without a border has width 0 and `null` colour and style |
| `outline` | `{ width, color, style, offset }` | same | An outer ring: a CSS outline, or a Figma outside stroke. A ring that stands off the box (`offset`) or is dashed is not the same ring as one that does not. |
| `radius` | number[4] | same | `[top-left, top-right, bottom-right, bottom-left]`, the used radius: never more than half the shorter side, so `9999px` on an 18px badge is `9` |
| `shadow` | `[{ inset, x, y, blur, spread, color }]` | same | Box shadows, in source order. Compared as a set: the order does not matter. |
| `opacity`, `opacityEffective` | number | all | The node's own opacity, and that opacity multiplied by every ancestor's; each present when not 1. The effective value is the one compared. A web text block carries only the effective value. |
| `filter`, `backdropFilter`, `blend` | string | any but text | The CSS values (`blur(4px)`, `multiply`), compared as written. Figma layer blur, background blur, and blend mode are recorded in the same form. |
| `transform` | string | web, any but text | The computed transform matrix. `rect` already includes its effect. Compared as written between two web captures. |
| `pseudo` | `{ before, after }` | web, box and input | A `::before` or `::after` that draws a fill, gradient, border, shadow, or text. Each has `content`, `width`, `height`, and when present `background`, `gradient`, `border` (`{ width, color }`), `color` (of its text), `radius` (px, or `"50%"`), `shadow`, `opacity`, `inset` (`[top, right, bottom, left]` of an absolutely positioned one), and `transform`. |
| `clips` ○ | `true` | box | The node clips its children: `overflow` is not `visible`, or Figma's clip content is on |
| `tokenRefs` | object | primitives | The token each value was written with, keyed by spec field: `padding`, `margin`, `gap`, `radius`, `background`, `fill`, `border`, `shadow`, `opacity`, `width`, `height`, `minWidth`, `maxWidth`, `minHeight`, `type.size`, `type.lineHeight`, `type.weight`, `type.family`, `type.letterSpacing`. Web: custom property names from `var()`, such as `"--space-6"` (several are joined by spaces). Figma: variable names, plus the text style under `type` and the effect style under `shadow`. |
| `states` | object | web, interactive | Written by the bundled capture with `--states`: `{ "hover": { "background": "#4338ca" } }`. Per state, only the paint properties that change: `background`, `gradient`, `color`, `borderWidth`, `borderColor`, `shadow`, `outline`, `opacity`, `decoration`, `transform`, `filter`. |

On the web, `box.fixed`, `layout.pinned`, and `box.marginAuto` come from what the cascade settled on before layout, where `auto` is still `auto`. `tokenRefs` come from the page's readable stylesheets, where a later matching rule wins. `tokenRefs`, `box.fixed`, and `layout.pinned` are read only for nodes that paint, hold text, or are positioned. A text block takes the `fill` and `type.*` references of its host.

### Text, icons, images, inputs

| Field | Type | Kinds | Meaning |
|---|---|---|---|
| `text` | string | text, input | The words, whitespace collapsed, before any `type.transform`; an input's current value |
| `fill` | colour | text, input | The text colour |
| `type.family` | string | text, input | The family asked for: the first one in the font stack. What rendered is in `surface.fonts`. |
| `type.size`, `type.lineHeight`, `type.letterSpacing` | number | text, input | In px. `letterSpacing` is 0 for `normal`. |
| `type.lineHeightSet` | boolean | text, input | `false` when no line height is set (CSS `normal`, Figma auto); `type.lineHeight` then holds the measured or estimated value |
| `type.weight` | number | text, input | 400, 600, … |
| `type.align` | string | text, input | `left`, `center`, `right`, `justify`. Reported only where it shows: the text moved sideways, or it has several lines. |
| `type.transform`, `type.decoration`, `type.style` | string | text, input | The text transform (`none`, `uppercase`, `lowercase`, `capitalize`), the decoration line (`none`, `underline`, `line-through`), and the font style (`normal`, `italic`) |
| `type.numeric` | string | web text, input | `font-variant-numeric`: `normal`, `tabular-nums` |
| `type.lines` | number | text | The number of lines on screen. Lines the element itself cuts off (a line clamp, a fixed height with hidden overflow) are neither counted nor covered by `rect`. |
| `type.truncated` | `true` | text | The text is cut short: by an ellipsis, a line clamp, or the edge of a control |
| `role` | string | web text of a form control | `value` or `placeholder`: which of the control's words the node holds |
| `segments` | `[{ text, style }]` | web text | Runs styled differently from the block (a bold word, a coloured figure), each with what differs: `fill`, `weight`, `size`, `style`, `decoration`. Compared between two web captures. |
| `textShadow` | as `shadow` | text | Text shadows |
| `textBox` | `{ fixedWidth, fixedHeight, alignVertical }` | Figma text | Whether the text box is wider or taller than its words, and where they sit in it (`figma-to-css.md`) |
| `icon` | object | icon | Web: `{ signature, strokeWidth, stroke, fill }`. `signature` is a hash of the `<svg>`'s `viewBox` and markup (same signature, same artwork); the rest is read from its first shape. Figma: `{ name ○, strokeWidth, stroke, fill }`, with no signature, so artwork is not compared against a web icon. |
| `asset` | string | image | What the image is: the source's file name without path or query, `data:<hash>` for a data URI, `figma:<image hash>` in a Figma spec. A Figma hash and a file name say nothing about each other, so the two are not compared; whether it is the same picture is for the pixel check. |
| `image` | object | image | Web: `{ fit, position, natural ○ }` — `object-fit`, `object-position` (compared between two web captures), and the intrinsic `[width, height]`. Figma: `{ fit }`, from the scale mode (`figma-to-css.md`). |
| `placeholder` | `{ text, color, opacity ○ }` | input | The placeholder and its colour |
| `shows` | string | web input | `value` or `placeholder` when a text node carries the control's words. While both controls show their placeholder, it is compared as that text node and not again here. |

### Figma-only and hand-added fields

| Field | Type | Meaning |
|---|---|---|
| `strokeAlign` ○, `cornerSmoothing` ○ | string, number | `inside`, `center`, or `outside`; the corner smoothing (0–1) when above 0. Both in `figma-to-css.md`. |
| `rotation` ○ | number | Degrees, when the layer is rotated; `rect` is the rotated layer's bounding box |
| `fillLayers` ○ | number | The number of visible fills when there is more than one; only the top one is recorded |
| `textClipped` ○ | `true` | `text` was cut at 2,000 characters |
| `component` | string | On an instance, its main component: `Button / Size=Small`. Marks a finding's owner as a shared component. |
| `wrapper` | `true` | Metadata conversion only: a frame with children, whose paint is unknown. It is not reported as missing. |
| `platformOnly` | `true` | Added by hand, never by an extractor: the node is left out of the comparison |

## Hand-written specs (version 1.0)

The older hand-written format is still accepted. `specVersion` is not read: any node that lacks `kind`, `rect`, or `paints` is brought to the shape above.

| Written as | Read as |
|---|---|
| `path`, when there is no `id` | `id` |
| `role`: `text`, `image`, `icon`, `input` | `kind`. `control` and `input` also set `interactive`. With any other role, or none: `text` when the node has `text` and neither `background` nor `border`, else `box`. |
| `component`, when there is no `selector` | `selector` |
| `box.position` `{ x, y }` with `box.width` and `box.height` | `rect` |
| A colour in `fill`, `background`, or `border.color`: hex, `rgb()`, `hsl()`, or one of a few names | The canonical colour |
| A CSS gradient in `background` or `gradient` | The canonical form in `gradient`: `linear-gradient(to right, rgb(79, 70, 229), #7c3aed)` reads as `linear(90deg, #4f46e5, #7c3aed)` |
| `background: "transparent"` | No fill |
| `border` `{ width, color, style, sides }` with one width; `sides` is `all` or a list such as `"top bottom"` | Per-side arrays |
| `radius` as one number; `shadow` as a CSS string | The four corners; the structured list |
| `type.numberOfLines` | `type.lines` |
| No `paints` | `true` when the node is not a plain box, or has a fill, gradient, border, shadow, text, or asset |

When any painting node in either spec has no `rect`, the comparison is partial. Nodes are paired by `id`, then `path`, then kind and name, then text, then `component` with `order`; each key must be unique on the implementation side. Only appearance is compared, geometry is not checked, and the result reads `PARTIAL — appearance only`. Such a comparison can list differences in look; it can never establish parity.

One thing follows for whoever writes one. A box property left out of a node reads as "none" and is reported against a side that has it, so give every paint property of each node you include. Nodes the reference does not list are not reported as extra.

## Example

The surface, a box, and a text block from a web capture:

```json
{
  "specVersion": "1.1",
  "surface": {
    "name": "reference", "platform": "web", "source": "http://localhost:5173/wallet",
    "viewport": { "width": 390, "height": 844 }, "density": 2,
    "root": { "selector": ".screen", "width": 390, "height": 844, "pageX": 0, "pageY": 0 },
    "theme": "light", "direction": "ltr", "locale": "en", "capturedAt": "2026-10-02T06:07:26.197Z",
    "fidelity": "measured", "fonts": { "requested": ["system-ui"], "loaded": [".SF NS"], "aligned": true },
    "stable": true, "screenshot": "reference.png"
  },
  "tokens": { "--space-6": "24px", "--radius-lg": "16px", "--color-primary": "#4f46e5", "--color-primary-2": "#7c3aed" },
  "nodes": [
    { "id": "n10", "parent": "n9", "depth": 2, "tag": "section", "name": "section.balance-card",
      "selector": "div.screen > main.content > section.balance-card", "kind": "box", "paints": true,
      "rect": { "x": 16, "y": 72, "width": 358, "height": 146 },
      "layout": { "mode": "flow", "justify": null, "align": null, "gap": 0, "crossGap": 0, "wrap": false, "positioned": null, "inline": false },
      "box": { "padding": [24, 24, 24, 24], "margin": [0, 0, 0, 0], "borderWidth": [0, 0, 0, 0] },
      "gradient": "linear(135deg, #4f46e5 0%, #7c3aed 100%)",
      "shadow": [{ "inset": false, "x": 0, "y": 8, "blur": 24, "spread": 0, "color": "#4f46e53d" }],
      "radius": [16, 16, 16, 16],
      "tokenRefs": { "padding": "--space-6", "radius": "--radius-lg", "background": "--color-primary --color-primary-2" } },
    { "id": "n12t", "parent": "n12", "depth": 4, "tag": "#text", "name": "$12,480.50",
      "selector": "main.content > section.balance-card > p.amount", "kind": "text", "paints": true,
      "rect": { "x": 40, "y": 118, "width": 172.63, "height": 40 }, "text": "$12,480.50", "fill": "#ffffff",
      "type": { "family": "system-ui", "size": 32, "weight": 700, "lineHeight": 40, "lineHeightSet": true, "letterSpacing": -0.5,
        "align": "left", "transform": "none", "decoration": "none", "style": "normal", "numeric": "normal", "lines": 1 } }
  ]
}
```
