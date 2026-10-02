# Figma to CSS

Figma and CSS describe the same picture with different properties. For each property where they differ, this document says what it means on each side, how `scripts/extract_figma.js` records it in the UI Spec (`ui-spec.md`), and the CSS that draws the same thing. Writing the value in the project's own idiom, through tokens or on another platform, is in `apply-to-platform.md`.

## Stroke alignment

A Figma stroke sits inside, on the centre of, or outside the layer's edge, and by default takes no space in layout. A CSS border always sits inside the border box and always takes space.

| Figma stroke | Recorded as | CSS |
|---|---|---|
| Inside | `border` with per-side `width`, `color`, `style`; `strokeAlign: "inside"` | `border`, or an inset ring: `box-shadow: inset 0 0 0 1px <colour>` |
| Centre | `border`; `strokeAlign: "center"` | As inside. `strokeAlign` is not compared, so the half that Figma draws outside the box is left to the pixel check. |
| Outside | `outline` `{ width, color, style, offset: 0 }`; `strokeAlign: "outside"` | `outline: 2px solid <colour>`, or an outset ring: `box-shadow: 0 0 0 2px <colour>`. Never a border, which changes the box size. |

The diff treats a border and an inset ring as the same stroke, and an outline and an outset ring as the same outer ring. Only the top visible solid stroke is recorded; a dash pattern is recorded as style `dashed`.

**Stroke and padding.** With an inside or centre stroke, Figma measures padding from the layer's edge and the stroke overlaps it. In CSS the border comes first and the padding after it, so the same padding number puts the content one border width further in. It shows as redline findings on the content, with the box's size as a consequence:

```
PV-001  fix  "Card title": top inset 16px → 17px (+1), measured to the top edge of Card  [section.card > p.title]
             design: Card padding-top 16
             build:  section.card padding-top 16 + section.card border-top 1
```

Fix it by subtracting the border from the padding (`padding: 15px` with a 1px border), or by drawing the stroke as an inset ring, which takes no space. When the frame has strokes included in layout, Figma behaves like CSS: the stroke is recorded in `box.borderWidth`, and a plain `border` with the same padding matches.

**Lines.** A line layer has no height of its own. It is recorded as the thin filled box its stroke draws: `kind: "box"` with a `background`, as thick as the stroke. In CSS a divider is either a 1px element with a `background` or a `border` on the row it follows. Both match: a line that runs the full length of a row, flush with its edge, is compared as that row's border, by width and colour. A line that stops short of the row's ends (an inset divider) is not the row's border; build it as an element of its own.

## Line height set to auto

Figma's Auto line height has no number; the font decides. CSS `line-height: normal` is also the font's decision, but each engine and each fallback font decides differently, so "auto" on both sides is not the same height.

Recorded as `type.lineHeightSet: false` with an estimated `type.lineHeight`: the text box's height divided by its line count, the count itself estimated as height ÷ (font size × 1.2). A line height in percent is converted to px (font size × percent ÷ 100).

CSS: do not leave it at `normal`. Set an explicit `line-height` from the recorded value, which is the height of the design's text box per line, through the type token that owns it. A web implementation with no line height set is recorded with the height its engine used, and its line-height finding says so: `(not set in the implementation — the engine default applies)`.

## Letter spacing in percent

Figma letter spacing is in px or in percent of the font size; CSS `letter-spacing` takes a length. Recorded in px: font size × percent ÷ 100, so −1% at 16px is `type.letterSpacing: -0.16`.

CSS: `letter-spacing: -0.16px`, or the same ratio in `em` (percent ÷ 100, here `-0.01em`), which holds when the font size changes. On the web `normal` is recorded as 0.

## Fixed-size text boxes and anchors

A Figma text layer can be wider or taller than its words; the words then sit in the box by its horizontal and vertical alignment. A web text block is measured as its line boxes, exactly as wide as its words. Recorded as `textBox`, with the horizontal alignment in `type.align` and the vertical one in `textBox.alignVertical` (`top`, `center`, `bottom`):

| Figma resizing | `fixedWidth` | `fixedHeight` |
|---|---|---|
| Auto width | `false` | `false` |
| Auto height | `true` | `false` |
| Fixed size, or truncate text | `true` | `true` |

The diff compares the anchor, not the box. On a fixed axis it places the implementation's measured text inside the Figma box by that alignment (left-aligned words at the box's left edge, centred words in its middle, right-aligned words at its right edge, and likewise top, centre, bottom) and compares positions. The box's own width or height is not compared.

CSS: the box is the element (a set width, or one that fills its container) and the anchor is `text-align`. Vertical anchoring is the container's job: `align-items`, or equal padding.

## Hug, fill, and fixed sizing

| Figma sizing | Recorded | CSS | A size difference on that axis |
|---|---|---|---|
| Fixed | `box.fixed.width` or `.height` is `true` | An explicit `width` or `height`; in a flex row also `flex: none` | Is a cause, marked `— set explicitly`. Set the size. |
| Hug contents | Not fixed | No size, so the box takes its content's: `width: auto`, `fit-content`, an inline-flex box | Follows the content, padding, and gap inside. Fix those. |
| Fill container | Not fixed | `flex: 1` along the parent's direction, `align-self: stretch` across it, or `width: 100%` | Follows the container and the siblings. Fix those. |

A layer at explicit coordinates (its parent has no auto layout, or it is set to absolute position) is recorded with `layout.positioned: "absolute"`, its constraints as `layout.pinned`, and its distance to the parent's edge on each pinned side as `layout.inset`; when Figma reports no sizing mode for it, it counts as fixed on both axes. The CSS is `position: absolute` with those offsets (`top`, `right`, `bottom`, `left`) inside a positioned parent. The web capture applies the same rule from the other side: `box.fixed` is `true` for a plain length such as `240px`, and `false` for `100%`, `auto`, or `fr`.

## Shadow spread and blur

Drop shadows and inner shadows map to `box-shadow` one to one: X, Y, blur, and spread are the same four numbers.

| Figma effect | Recorded | CSS |
|---|---|---|
| Drop shadow | `shadow: [{ inset: false, x, y, blur, spread, color }]` | `box-shadow: <x>px <y>px <blur>px <spread>px <colour>` |
| Inner shadow | The same, with `inset: true` | `box-shadow: inset …` |
| A shadow on a text layer | `textShadow` | `text-shadow: <x>px <y>px <blur>px <colour>`; CSS has no spread for text |

The colour carries the opacity as alpha: 6% black is `#0000000f`. Several shadows are compared as a set, so the order of the CSS list does not matter to the comparison; it does to the picture where shadows overlap, and the first in a CSS list is drawn on top. A shadow that is only a spread, with no offset and no blur, is a ring and is compared as a stroke (above). `textShadow` is compared the same way as `shadow`.

## Layer blur and background blur

| Figma effect | Recorded | CSS |
|---|---|---|
| Layer blur, radius R | `filter: "blur(<R ÷ 2>px)"` | `filter: blur(<R ÷ 2>px)` |
| Background blur, radius R | `backdropFilter: "blur(<R ÷ 2>px)"` | `backdrop-filter: blur(<R ÷ 2>px)`, on a translucent fill |

CSS `blur()` takes the standard deviation of the blur, and Figma's radius is twice that, so the script records half: a layer blur of 8 is `blur(4px)`. This is unlike `box-shadow`, whose blur is the same number on both sides. The two strings are compared exactly: `blur(8px)`, or `blur(4px) saturate(1.2)`, against the design's `blur(4px)` is a finding.

## Image scale modes

In Figma an image is a fill on a layer. The layer is recorded as an `image` primitive with `image.fit`:

| Figma scale mode | `image.fit` | CSS |
|---|---|---|
| Fill | `cover` | `object-fit: cover` |
| Fit | `contain` | `object-fit: contain` |
| Crop | `cover` | `object-fit: cover` with an `object-position`. The crop itself is not recorded; read it from the design. |
| Tile | `repeat` | Not an `<img>`: `background-image` with `background-repeat: repeat` and a `background-size` |

- Set `object-fit` explicitly. An `<img>` without it is recorded as `fill`, the CSS default, which stretches; Figma has no such mode.
- An image fill pairs with an `<img>`, `<video>`, or `<canvas>`. It does not pair with a box that carries a CSS `background-image`.
- `asset` is `figma:<image hash>` in a Figma spec and a file name on the web. The two say nothing about each other and are not compared; whether it is the same picture is for the pixel check to say.

## Corner smoothing

Figma's corner smoothing (the iOS "squircle") changes the shape of the corner, not its radius. Recorded as `cornerSmoothing`, from 0 to 1, next to the ordinary `radius`; it is not compared.

CSS `border-radius` has no equivalent. The radius matches and the curve differs slightly at each corner, which the pixel check may show as small regions on the corners. On the web treat it as an accepted adaptation unless the design system says otherwise. An iOS-style continuous corner needs the platform's own shape (`apply-to-platform.md`).

## Gradients

A Figma linear gradient is defined by two handles on the layer; a CSS one by an angle and a line whose length depends on the box. Recorded as the CSS equivalent, computed from the handles: `gradient: "linear(109.33deg, #4f46e5 0%, #7c3aed 100%)"`.

- **The angle is the CSS angle** (0deg up, 90deg right, 180deg down), measured in px, so it depends on the box's proportions. Handles from the top-left corner to the bottom-right are 135deg only in a square; in a 342×120 card they are 109.33deg. CSS `to bottom right` is yet another direction (160.67deg in that card).
- **Stop positions are re-projected** onto the CSS gradient line. Handles on the box's edges give 0% and 100%; handles inside or outside it give other numbers.
- The paint's opacity is folded into each stop's colour.

CSS: copy the recorded string, with `linear-gradient(` for `linear(`. Any spelling of the same gradient compares equal: the web capture turns a side or corner keyword into the angle it means for that box, and stops without a position are spread evenly. What must agree is the angle, within 1 degree, and each stop's colour and position.

Radial, angular, and diamond gradients are recorded as their kind and stops only (`radial(…)`, `conic(…)`, a diamond as `radial(…)`), without centre, size, or start angle. Read those from the design. Against a web capture only the kind and the stops are compared; the shape is left to the pixel check. When a layer has several visible fills only the top one is recorded, and `fillLayers` gives their number.

## Auto layout, wrap, and grid

| Figma | Recorded | CSS |
|---|---|---|
| Auto layout, horizontal or vertical | `layout.mode: "row"` or `"column"`, `layout.gap` (the item spacing), `box.padding` | `display: flex` with `flex-direction`, `gap`, `padding` |
| Wrap | `layout.wrap: true`, and the spacing between the lines as `layout.crossGap` | `flex-wrap: wrap` with `row-gap` |
| Grid | `layout.mode: "grid"`, the column gap as `layout.gap`, the row gap as `layout.crossGap` | `display: grid` with `column-gap` and `row-gap` |

A redline between two rows of a grid, or two lines of a wrapping row, is explained by the row gap and printed as `row-gap`.

## Text inside a control

In Figma the words in an input are an ordinary text layer inside the input's frame. On the web they are the control's value or its placeholder, which the capture also records as a text node (`ui-spec.md`). The two pair by their words like any other text, so the placeholder's colour, type, and position inside the field are compared: a text layer 12px from the frame's edge against `padding-left: 16px` is a finding on the padding.

---

This mapping is tested against a stand-in for the Plugin API and still has to be confirmed on a real Figma file; see the verification status in `measure.md`.
