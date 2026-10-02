## Purpose

Measure a reference surface and an implemented surface into the same UI Spec, exhaustively and repeatably, so that a visual detail can go unmeasured only when the surface does not render it. Covers web surfaces, Figma frames, and the screenshots that accompany each spec.

## ADDED Requirements

### Requirement: Exhaustive capture of rendered elements

The web extractor SHALL return every rendered element under the chosen root, each with its rectangle relative to the root's top-left corner in CSS pixels. Elements with `display: none` and subtrees whose effective opacity is 0 SHALL be omitted. The extractor SHALL NOT sample, cap, or require a hand-written node list.

#### Scenario: Whole surface is captured without a node list

- **WHEN** the extractor runs on a page with the root selector of the screen
- **THEN** the returned spec contains one node per rendered element under that root, and every node has a `rect` whose origin is the root's top-left corner

##### Example: wallet benchmark reference

- **GIVEN** the wallet benchmark reference page at 390 by 844 CSS pixels
- **WHEN** the extractor runs with root `.screen`
- **THEN** the spec lists 84 nodes (83 rendered elements and text blocks, and the text node for the note field's placeholder), and the root node's rect is x 0, y 0, width 390, height 844

### Requirement: Primitives identify what paints

Each node SHALL carry a `kind` (box, text, icon, image, input) and a `paints` flag. A `picture` element SHALL be a plain box, and the `img` inside it the image. `paints` SHALL be true for a box that has a visible fill, gradient or background image, border, shadow, outline, or a painting pseudo-element; for every text block; for every icon; for every image; and for every form input. A wrapper that draws nothing SHALL have `paints` false and SHALL still record its padding, margin, border widths, layout mode, and gap.

#### Scenario: Wrapper and card are told apart

- **WHEN** a transparent layout wrapper contains a card with a fill
- **THEN** the wrapper node has `paints` false with its box values recorded, and the card node has `paints` true

### Requirement: Text measured as line boxes

A text block's rectangle SHALL be the union of its line boxes: the width of the rendered text and a height of the line count multiplied by the line height. The node SHALL record font family, size, weight, line height, letter spacing, alignment, text transform, decoration, style, line count, and whether the text is truncated. When the line height is not set, the extractor SHALL measure the height the engine uses and SHALL record `lineHeightSet` as false. Lines that the element itself cuts off, by a line clamp or by a fixed height with hidden overflow, SHALL NOT be counted or covered by the rectangle, and the text SHALL be recorded as truncated.

#### Scenario: Paragraph clamped to two lines

- **WHEN** a paragraph that wraps to five lines is limited to two by a line clamp
- **THEN** the text node records 2 lines, a rectangle two line heights tall, and `truncated: true`

#### Scenario: Line height is not set

- **WHEN** a heading with font size 17 has no line height declared
- **THEN** the text node records the measured line height in pixels and `lineHeightSet: false`

#### Scenario: Inline text in a tall container

- **WHEN** a 20 pixel line of text is centred in a 48 pixel tall button
- **THEN** the text node's rect has height 20 and is vertically centred in the button's rect

### Requirement: Form control text is recorded as a text primitive

The words a form control shows SHALL be recorded as a text node whose parent is the control: the value of a text field or text area, the chosen option of a select, or the placeholder while the control is empty, with a `role` of `value` or `placeholder`. Because a page cannot measure inside a control, the rectangle SHALL be calculated: starting at the control's content box according to its text alignment, centred vertically for a single-line control and at the top for a text area, as wide as the words measure in the control's font and no wider than the content box. A placeholder's colour SHALL include the placeholder's opacity. The control node SHALL record which words the text node holds (`shows`). A password field's value and controls that show no text SHALL have no text node.

#### Scenario: Empty field with a placeholder

- **WHEN** an empty text field 44 pixels tall with a 1 pixel border, 12 pixels of horizontal padding, and a 20 pixel line height shows a placeholder
- **THEN** the spec holds a text node with `role: "placeholder"` whose rectangle starts 13 pixels from the field's left edge and 12 pixels from its top, and the field node records `shows: "placeholder"`

### Requirement: Appearance values are canonical

The extractor SHALL record colours as `#rrggbb`, or `#rrggbbaa` when translucent, regardless of the notation the source used. Gradients SHALL be recorded as a canonical string with the angle in degrees and stops as canonical colours; a side keyword SHALL become its angle and a corner keyword the angle it means for that element's padding box. Shadows SHALL be recorded as a list of entries with inset, x, y, blur, spread, and colour. Corner radii SHALL be recorded as the used value, which never exceeds half the shorter side of the box. The product of the opacity of a node and all of its ancestors SHALL be recorded as `opacityEffective`.

#### Scenario: Colour notation does not matter

- **WHEN** the same colour is declared as hex on one page and as `hsl()` on another
- **THEN** both specs record the same `#rrggbb` value

##### Example: canonical values

| Source value | Recorded value |
| --- | --- |
| `rgb(79, 70, 229)` | `#4f46e5` |
| `rgba(255, 255, 255, 0.18)` | `#ffffff2e` |
| `linear-gradient(135deg, rgb(79, 70, 229) 0%, rgb(124, 58, 237) 100%)` | `linear(135deg, #4f46e5 0%, #7c3aed 100%)` |
| `linear-gradient(to bottom right, red, blue)` on a box whose padding box is 296 by 96 | `linear(162.03deg, #ff0000, #0000ff)` |
| `border-radius: 9999px` on an 18 pixel tall badge | radius 9 on every corner |
| `rgba(79, 70, 229, 0.24) 0px 8px 24px 0px` | one shadow: x 0, y 8, blur 24, spread 0, colour `#4f46e53d` |

### Requirement: Pseudo-element decorations are recorded

A `::before` or `::after` pseudo-element that draws a fill, gradient, border, shadow, or text SHALL be recorded on its host node with its content, width, height, fill, border, radius, shadow, opacity, and, when it is absolutely positioned, its four inset offsets. A host that draws nothing else SHALL still be marked as painting.

#### Scenario: Underline drawn by a pseudo-element

- **WHEN** an active tab draws its 2 pixel underline with `::after`
- **THEN** the tab node records `pseudo.after` with height 2 and the underline's fill, and the tab node has `paints` true

### Requirement: Declared tokens and explicit sizes are recorded

For every node that paints, holds text, or is positioned, the extractor SHALL record which design token each property was written with (`tokenRefs`, read from the page's own stylesheets), whether its width and height were declared as explicit lengths (`box.fixed`), and, for a positioned node, the sides it is pinned to and the offset on each (`layout.pinned`, `layout.inset`). For every node it SHALL record which of its margins are `auto` (`box.marginAuto`). Explicit sizes, pinned sides, and auto margins SHALL be read from the value the cascade settled on before layout where the browser exposes it, and from the stylesheets otherwise. A size written as a percentage, a viewport unit, a fraction, `auto`, or a content keyword SHALL NOT count as explicit. A stylesheet that cannot be read because it is cross-origin SHALL be skipped without failing the capture.

#### Scenario: Sidebar with a fixed width

- **WHEN** a sidebar is styled with `width: 240px` and a table beside it with `width: 100%`
- **THEN** the sidebar node records `box.fixed.width` true and the table node does not

#### Scenario: Block centred with auto margins

- **WHEN** a 200 pixel wide block is centred in a 358 pixel wide container with `margin: 0 auto`
- **THEN** the block node records `box.marginAuto` true for its left and right sides alongside the 79 pixel margins the layout produced

#### Scenario: Token behind a value

- **WHEN** a card's padding is declared as `var(--space-6)`
- **THEN** the card node records `tokenRefs.padding` as `--space-6`

### Requirement: Interaction states are captured

When states are requested, the capture SHALL hold each requested state on each interactive element in turn and SHALL record, under `states`, every paint property whose value differs from the default state. A requested state the browser cannot hold SHALL stop the capture with exit code 2 and a message listing the states it can.

#### Scenario: Hover fill is recorded

- **WHEN** the capture runs with the hover state requested on a page whose primary button darkens on hover
- **THEN** the button node records `states.hover.background` with the hover colour

### Requirement: Rendered fonts are verified

The capture SHALL record the font families the engine actually used to draw text alongside the families the page asked for. When a named family the page asked for was not used, the spec SHALL record `fonts.aligned` as false. Generic family keywords such as `system-ui`, `-apple-system`, `sans-serif`, and `ui-monospace` SHALL never cause a mismatch. The Figma script SHALL record `fonts.aligned` as false when a text layer is marked by Figma as missing its font.

#### Scenario: Design font is missing

- **WHEN** the page asks for Inter and the engine draws the text with Helvetica
- **THEN** the spec records Inter as requested, Helvetica as loaded, and `aligned: false`

#### Scenario: Page uses the system font

- **WHEN** the page asks only for `-apple-system` and the engine draws with the platform's UI font
- **THEN** the spec records `aligned: true`

### Requirement: Capture context is explicit

The bundled capture SHALL set the colour scheme the page sees (`light` unless `dark` is requested) instead of inheriting the machine's, and SHALL record it in the spec. A page that cannot be loaded, because of a network error, a missing file, or a server status of 400 or above, SHALL stop the capture with exit code 2 and a message naming the cause; the browser's error page SHALL NOT be captured.

#### Scenario: Dark scheme requested

- **WHEN** a page that follows `prefers-color-scheme` is captured with the dark scheme requested
- **THEN** the page renders its dark colours and the spec records `theme: "dark"`

#### Scenario: Server is not running

- **WHEN** the capture is pointed at a URL that refuses the connection
- **THEN** it exits with code 2, prints that the page cannot be loaded and why, and writes no spec

### Requirement: Screenshots are repeatable

The bundled capture SHALL launch the browser with an sRGB colour profile and software rasterisation, SHALL freeze animations and transitions, and SHALL wait for fonts to finish loading. It SHALL discard the first screenshot after a load and SHALL repeat the capture until two consecutive screenshots are identical. When no two consecutive screenshots match within five attempts, the capture SHALL report that the surface is still changing.

#### Scenario: Same page captured on separate loads

- **WHEN** the same unchanged page is loaded and captured 14 times
- **THEN** all 14 screenshots are byte-identical

### Requirement: Figma capture through a read-only script

The skill SHALL provide a Plugin API script that reads a frame's subtree and returns nodes in the same UI Spec format: rectangle relative to the frame, auto layout values (including wrap and grid frames with both gaps), the offset of an absolutely placed layer on each side it is pinned to, fills, strokes with their alignment and per-side weights, corner radii, effects, text properties including whether the text box has a fixed width or height, component name, bound variable names, and whether each axis has a fixed size. The script SHALL NOT modify the Figma file. Its output SHALL be paged by offset and limit, each page SHALL be at most 18,000 characters, and each page SHALL report `total`, `offset`, and `nextOffset`. The assembler SHALL merge the pages into one spec and SHALL fail with the missing range when a page is absent or duplicated.

#### Scenario: Large frame is returned in pages

- **WHEN** the script runs on a frame with 400 visible nodes
- **THEN** each call returns at most 18,000 characters with a `nextOffset`, and following `nextOffset` until it is null yields every node exactly once

#### Scenario: A page is missing

- **WHEN** the assembler receives pages covering offsets 0 to 119 and 240 to 399 of a 400 node frame
- **THEN** it exits with an error naming the missing range 120 to 239 and writes no spec

### Requirement: Geometry-only fallback for read-only Figma access

When no script-capable Figma tool is available, the assembler SHALL convert a Figma metadata tree (node names, types, positions, and sizes) into a UI Spec whose `surface.fidelity` is `geometry-only`, in which text nodes carry their layer name as text and no appearance values are claimed.

#### Scenario: Only a read-only Figma server is connected

- **WHEN** the assembler is given the metadata of a frame
- **THEN** it writes a spec with rectangles for every node and `fidelity: "geometry-only"`, and no node carries fill, border, or type values

### Requirement: Capture runs without installed packages

The capture scripts SHALL use only Node built-in modules and a Chromium-family browser found on the machine. The extractor SHALL be a single function in a single file that any browser automation tool can evaluate in the page. When no browser is found, the capture SHALL exit with code 2 and a message that names the environment variable used to point at a browser executable.

#### Scenario: No browser installed

- **WHEN** the capture command runs on a machine with no Chromium-family browser
- **THEN** it exits with code 2 and prints how to set the browser path

#### Scenario: Another browser tool evaluates the extractor

- **WHEN** an agent's own browser tool evaluates the extractor file in a page and calls the resulting function with a root selector
- **THEN** the function returns the same UI Spec the bundled capture produces for that page
