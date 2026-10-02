## Purpose

Compare two UI Specs by what is visible: pair the things each surface draws, report how they differ in appearance and in position, and separate the causes worth fixing from the consequences that follow from them. Equal pictures produced by different markup or styling are never reported as differences.

## ADDED Requirements

### Requirement: Primitives are paired without relying on structure

The diff SHALL pair painting primitives across the two specs in this order: explicit correspondence (a caller-supplied map, a design node id carried on the element, or a shared test id); text blocks with the same text, with repeated strings paired in reading order; icons with the same artwork signature and images with the same asset; boxes that enclose the same set of paired text blocks, whether or not the counterpart paints; remaining primitives by their position and size inside the smallest already-paired box around them. A primitive at most 4 pixels thick SHALL NOT be paired by position with one more than four times as thick. Element names, class names, and nesting depth SHALL NOT be required to agree. Primitives left unpaired SHALL be reported as having no counterpart. The comparison SHALL NOT modify the specs it is given.

#### Scenario: Same picture, different element tree

- **WHEN** the implementation wraps the card content, the list, and the heading in extra elements and changes paragraph tags to division tags without changing any pixel
- **THEN** every reference primitive is paired and the diff reports no findings

##### Example: wallet benchmark control

- **GIVEN** the wallet reference page and its restructured copy with 7 structural edits and no visual change
- **WHEN** the two specs are compared
- **THEN** 49 of 49 primitives are paired, appearance is 100, geometry is 100, and the findings list is empty

#### Scenario: Repeated rows

- **WHEN** a list contains three rows built from the same component with different text
- **THEN** each row's primitives pair with the same row on the other side

#### Scenario: Two icons swapped

- **WHEN** the implementation shows the reference's two icons in each other's places
- **THEN** each icon is paired with the same artwork, the findings say the icons are in the wrong place, and none says the artwork differs

### Requirement: Geometry-only references are paired by shape

When the reference is a geometry-only spec, the diff SHALL treat every layer other than text as able to pair with any element other than text. A frame with children, whose paint is unknown, SHALL be paired by the text it encloses, and otherwise only after every other layer has been paired, closest fit first and only with a close fit, with a painted or an unpainted element.

#### Scenario: Field frame around an input frame

- **WHEN** a geometry-only reference has a field frame that holds an input frame, neither enclosing any paired text, and the implementation has an unpainted field element around a painted input
- **THEN** the input frame is paired with the input and the field frame with the field element

#### Scenario: Image fill

- **WHEN** a geometry-only reference has a rectangle where the implementation has an image element of the same size
- **THEN** the two are paired

### Requirement: Unpainted counterparts are paired

When a painted reference box has no painted counterpart, the diff SHALL pair it with an unpainted implementation element that encloses the same paired text or occupies the same place, and SHALL report the missing paint on that element. The same SHALL apply in the other direction for a painted implementation box whose reference counterpart draws nothing. Pairing by enclosed text SHALL take place before any pairing by position.

#### Scenario: Row dividers were never drawn

- **WHEN** the reference rows have a 1 pixel bottom border and the implementation rows have none
- **THEN** the diff reports "bottom border is missing" on the implementation's row elements, with the instance count, instead of reporting the rows as absent

### Requirement: Appearance differences are reported per visible property

For each pair the diff SHALL compare every visible property of its kind and SHALL treat a value present on one side and absent on the other as a difference. Boxes: fill, gradient, each border side (width, colour, style), outer ring, shadows, corner radii, filter, backdrop filter, blend mode, effective opacity, and pseudo-element decorations (presence, content, size, fill, radius, shadow, border, opacity, offset). Text: rendered text, font family, size, weight, line height, letter spacing, decoration, style, alignment when it has a visible effect, line count, truncation, colour, text shadow, numeric figure style, and, between two specs of the same platform, inline runs styled differently from the block. Icons: artwork signature, stroke width, stroke and fill colour, size. Images: asset when both sides name it in the same way (a design tool's image hash is not compared with a file name), fit, size, and, between two specs of the same platform, position. Between two specs of the same platform the transform SHALL be compared as well. Inputs: the box properties; the words the control shows are compared as the text primitive they are, and a placeholder that is not showing is compared on the control. Text that is truncated on one side and wraps on the other SHALL be one finding that states both line counts.

#### Scenario: Line height not set in the implementation

- **WHEN** the reference text has line height 24 and the implementation leaves it unset
- **THEN** the diff reports the line height difference with the measured value and states that it is not set in the implementation

##### Example: properties the previous pipeline could not express

| Seeded difference | Reported as |
| --- | --- |
| Gradient end stop `#7c3aed` to `#6d28d9` | gradient differs, with both canonical strings |
| Link gains an underline | text decoration none to underline |
| Avatar `object-fit` cover to fill | image fit cover to fill |
| Menu icon path changed | icon artwork differs |
| Tab icon stroke 1.5 to 2 | icon stroke 1.5px to 2px |
| Placeholder colour `#9ca3af` to `#6b7280` | placeholder colour differs |
| Active tab underline colour drawn by `::after` | `::after` fill differs |
| Status dot drawn by `::before`, 8 to 6 | `::before` size 8×8px to 6×6px |

### Requirement: Equivalent drawings are not differences

The diff SHALL NOT report a difference when the two sides draw the same picture by different means. Corner radii SHALL be compared as used values, and two corners that are both fully rounded SHALL be equal. Colours SHALL be equal when every channel is within 2 of 255 and alpha is within 0.012. A shadow with no offset and no blur SHALL be compared as a stroke: inset as an inside stroke together with borders, outset as an outer ring together with outlines. Shadows SHALL be compared as a set, in any order. Gradients SHALL be compared by angle, within 1 degree, and by each stop's colour and position, within 1 percent, with stops that have no position spread evenly; between a design tool and a build, a radial or conic gradient SHALL be compared by its kind and stops only. A thin line (at most 4 pixels thick) drawn as an element of its own that runs the full length of one side of a paired box, flush with that side, SHALL be compared as that box's border on that side when the counterpart box has a border there, by width and colour. Text SHALL be compared after applying text transform. Declared padding, margin, gap, and fixed heights SHALL NOT be compared directly.

#### Scenario: Nine equivalent rewrites

- **WHEN** an implementation differs from the reference only by an equivalent rewrite
- **THEN** the diff reports no findings

##### Example: benchmark decoys

| Rewrite | Findings |
| --- | --- |
| Pill radius written as 9999px instead of half the height | none |
| 8px spacing via `margin-left` instead of `gap` | none |
| 48px button via vertical padding instead of a fixed height | none |
| Grid gap produced with flex and margins | none |
| The same colours written as `hsl()` | none |
| 1px outline drawn as an inset ring shadow instead of a border | none |
| Row dividers drawn as 1px elements between the rows instead of bottom borders | none |
| The same gradient written without stop positions | none |
| The same gradient written with a side keyword and explicit stop positions | none |

#### Scenario: Divider of another colour

- **WHEN** the reference rows have a bottom border and the implementation draws the dividers as separate elements in another colour
- **THEN** the diff reports one finding, the bottom border colour, with one instance per row

#### Scenario: Inset divider

- **WHEN** the implementation's divider element stops 16 pixels short of each end of the row
- **THEN** it is not treated as the row's border: the border is reported as missing and the element as having no counterpart

### Requirement: Position is measured as redline distances

For each paired primitive the diff SHALL measure, on each of its four sides, the distance to the nearest sibling primitive in that direction within the same frame, or to the frame's edge when there is none. The frame SHALL be the smallest paired painted box that contains the primitive. Which pair of edges is measured SHALL be decided on the reference and applied to both sides. A changed distance SHALL be reported only when the reference declares that distance (it equals the sum of the padding, border, margin, and gap its source declares between the two edges), or when the primitive moved relative to both sides of that axis and did not stay centred. A distance that is leftover space on both sides and whose opposite distance is unchanged SHALL NOT be reported. An `auto` margin SHALL be leftover space, never a declared distance. Between the rows of a grid and between the lines of a row or column that wraps, the declared gap SHALL be the gap across the main axis. For a positioned primitive pinned to the measured side, the declared distance SHALL be the offset its source declares.

#### Scenario: Stray wrapper pushes content down

- **WHEN** the implementation wraps the balance amount in an element with 3 pixels of top padding
- **THEN** the diff reports one spacing finding, that the gap between the label and the amount is 7 pixels where the reference has 4, and does not report the elements below it

#### Scenario: Gap between the rows of a form grid

- **WHEN** a two-column grid declares a row gap of 20 and a column gap of 24, and the implementation's row gap is 16
- **THEN** the finding states `row-gap 20 → 16` on the grid

#### Scenario: Pinned bar follows the content

- **WHEN** content above a bottom-pinned tab bar grows and the bar stays at the bottom edge
- **THEN** the changed distance between the content and the bar is not reported

### Requirement: Spacing findings explain themselves

A spacing finding SHALL list the declared parts that make up the distance on each side where the distance is declared (`designedAs` for the reference, `builtFrom` for the implementation), each part naming the element, the property, and the value. When both specs come from the same kind of source, the finding SHALL also state which parts differ (`differs`).

#### Scenario: Wrong padding on a card

- **WHEN** the reference card has 24 pixels of padding and the implementation has 16
- **THEN** the finding states that the card's top padding is 24 in the design and 16 in the build

##### Example: explanations

| Seeded difference | `differs` |
| --- | --- |
| Card padding 24 to 16 | `section.balance-card padding-top 24 → 16` |
| Stray wrapper with 3px top padding | `div padding-top 0 → 3` |
| Gap between two buttons 12 to 16 | `div.actions gap 12 → 16` |
| Table cell horizontal padding 16 to 12 | `td padding-left 16 → 12` with 7 instances |
| Text inside an input starts at 16 instead of 12 | `input.input padding-left 12 → 16` |
| Badge offset -4 to 0 | `span.badge offset-top -4 → 0` |

### Requirement: Causes are separated from consequences

Every finding SHALL be marked as a cause or as a consequence (`derived`). A consequence is: a text block's size that follows from a reported difference in its text, font, size, weight, line height, letter spacing, line count, or truncation; the size of a box with no explicit size on that axis when something inside it, its frame, or a neighbour in its frame changed on that axis; a distance that is leftover space in the reference beside a primitive that changed size; a sideways displacement of text whose alignment differs; a line height or letter spacing that kept its proportion to a font size that differs; a distance that both sides declare with the same total and that still differs, beside a primitive that changed size; a distance whose only differing parts are the border of an element whose border is itself a finding; a distance the reference leaves to the layout, built from a part that another finding already reports as differing; a primitive pinned at the same declared offset on both sides. The size of a box whose width or height is declared explicitly SHALL be a cause, and so SHALL a size whose minimum or maximum the two sides declare differently, which the finding SHALL name. When every finding would be a consequence, the largest unexplained change on each axis SHALL be promoted to a cause and labelled as unexplained.

#### Scenario: Sidebar width

- **WHEN** a sidebar declared 240 pixels wide is built 232 pixels wide and every box beside it becomes wider
- **THEN** the diff reports one cause, the sidebar's width set explicitly, and lists the other size changes as consequences

##### Example: benchmark variants

| Seeded difference | Causes | Consequences |
| --- | --- | --- |
| Sidebar width 240 to 232 | 1 | 19 |
| Table header letter spacing removed | 1 | 14 |
| Stats grid gap 16 to 24 | 1 | 2 |
| Row dividers missing | 1 | 3 |
| Outline button 2 pixels taller | 1 | 1 |
| Table header font size 12 to 11 (letter spacing in em) | 1 | 15 |

#### Scenario: Long subtitle wraps instead of truncating

- **WHEN** a subtitle that the reference truncates wraps to two lines, the row grows, and the centred icon beside it moves down
- **THEN** the diff reports one cause, the truncation, and lists the row's height and the icon's distances as consequences

### Requirement: Repeated differences are merged

Findings that state the same difference on several instances of a repeated element, and spacing findings that state the same differing parts seen from several primitives, SHALL be merged into one finding that lists its instances.

#### Scenario: Three rows share a wrong colour

- **WHEN** the title colour is wrong on all three rows of a list
- **THEN** the diff reports one finding with three instances

### Requirement: Strictness depends on engine and form factor

When the reference and the implementation use the same class of layout engine and the same form factor, line height and letter spacing differences SHALL be drift, the geometry tolerance SHALL be 0.5 pixel (for text width, the larger of 1 pixel and 1.5 percent), and the tolerance for declared numeric values SHALL be 0.25. Across engine classes, line height and letter spacing differences SHALL be adaptations. Across form factors, spacing and sizing differences SHALL be adaptations and the geometry score SHALL NOT be used for the verdict. Figma and web SHALL belong to the same engine class.

#### Scenario: One pixel off

- **WHEN** a row's vertical padding is 11 where the reference has 12, at the same form factor
- **THEN** the diff reports the 1 pixel difference as drift

#### Scenario: Web reference, native implementation

- **WHEN** the reference is web and the implementation is a native platform, and a text's line height differs
- **THEN** the difference is reported with intent adaptation

### Requirement: Existing parity classifications are preserved

The diff SHALL keep the classifications the skill already defines. A recorded accessibility remap SHALL classify an authored-to-accessible colour difference as a satisfied required adaptation, and an implementation that matches the authored value SHALL be reported as a required-adaptation defect. Interactive controls smaller than the platform minimum on a touch platform SHALL be reported as required adaptations. Nodes matching the operating system chrome patterns in a spec that is not a web capture, nodes marked `platformOnly`, and nodes the policy lists as platform-only SHALL be excluded, and the result SHALL name them. Pointer-only states SHALL NOT be required on touch platforms. When either spec records `fonts.aligned` false, text metric and text size differences SHALL be marked untrusted and SHALL NOT count as causes; the font environment SHALL be reported as aligned only when both specs record `fonts.aligned` true, and as unknown when a spec does not say. A required adaptation that was not made SHALL lower the appearance score. Findings from an estimated spec SHALL NOT include differences under 2 pixels. A policy file passed by the caller SHALL override the default tolerances, classes, and lists; it SHALL be merged over the defaults at every depth, with lists replaced whole.

#### Scenario: Recorded accessibility remap

- **WHEN** the reference shows `#f14f2b`, the implementation shows `#e21e28`, and a remap from the first to the second is recorded
- **THEN** the difference is classified required-adaptation with no fix needed

#### Scenario: Authored value copied

- **WHEN** both the reference and the implementation show `#f14f2b` and a remap to `#e21e28` is recorded
- **THEN** the diff reports a required-adaptation defect that asks for the accessible value

#### Scenario: Element called status-bar in a web page

- **WHEN** both specs are web captures and the reference has an element named `status-bar` that the implementation lacks
- **THEN** the element is compared like any other and reported as having no counterpart

#### Scenario: Font environment mismatched

- **WHEN** the implementation spec records `fonts.aligned` false and a text block is 3 pixels wider
- **THEN** the width finding is marked untrusted and is not listed as a cause

### Requirement: Findings keep the established fields

Each finding SHALL carry `id`, `severity`, `intent`, `parityClass`, `specField`, `block`, `ownership`, `status`, `expected`, `actual`, `delta`, `recommendedFix`, and `tokens`, with the values the existing findings format defines, so that a report generator written for that format can render the output. Findings SHALL additionally carry `gate`, `derived`, `selector`, and, where they apply, `designedAs`, `builtFrom`, `differs`, `instances`, and `visible`.

#### Scenario: Output read by the report generator

- **WHEN** the diff output is passed to a generator that reads the established findings format
- **THEN** every finding has the fields that generator reads, and drift and adaptation counts match the diff's own scores

### Requirement: Partial specs are accepted without claiming parity

A spec whose nodes carry no rectangles SHALL be accepted. Its nodes SHALL be paired by id, name, and text, only appearance SHALL be compared, and the result SHALL state that geometry was not checked. Such a comparison SHALL NOT produce a parity verdict. Implementation nodes that a partial reference does not list SHALL NOT be reported as extra. A hand-written CSS gradient SHALL be compared by value, and a `transparent` background SHALL count as no fill.

#### Scenario: Hand-written reference spec

- **WHEN** the reference is a hand-written spec of 20 nodes with no rectangles
- **THEN** the diff compares appearance for the paired nodes and reports the verdict as partial

### Requirement: Interaction state values are compared

For every interaction state the reference defines on a primitive, the diff SHALL report a missing state and SHALL compare each property the state changes.

#### Scenario: Hover colour is wrong

- **WHEN** both sides define a hover state on the primary button and the hover fill differs
- **THEN** the diff reports the hover fill difference with both colours
