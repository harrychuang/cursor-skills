## Purpose

Turn hardcoded values in existing Figma designs into Ref → Sys → Comp Variables and bind them without changing the design's appearance, so that designers can adopt tokens for existing UI and for components created by other skills such as `figma-componentize`.

## ADDED Requirements

### Requirement: Harvest scope and baseline

The value harvesting workflow (Workflow F) SHALL accept a node URL, the current selection, a section, a page, a component, or a component set as its scope. It SHALL ask the user to confirm or narrow the scope when the scope contains more than 50 top-level frames or spans more than one page. It SHALL capture a baseline screenshot of every scope root before any write.

#### Scenario: Designer shares one component URL

- **WHEN** a designer shares the URL of a single component and asks to tokenize it
- **THEN** the scope is that component and its descendants
- **AND** the skill captures a baseline screenshot of the component before planning any write

#### Scenario: Scope is a large page

- **WHEN** the requested scope is a page with 120 top-level frames
- **THEN** the skill asks the user to confirm the whole page or choose sections before harvesting

### Requirement: Value collection covers every token family

For every visible node in scope, the harvest SHALL collect: solid fill and stroke colors together with each paint's opacity, corner radii, padding, item spacing and counter-axis spacing of auto-layout frames, stroke weights, node opacity below 1, the font family, font style, size, line height, and letter spacing of every styled text segment, drop shadows and inner shadows, and the fixed width and height of component roots and icon nodes. For each distinct value it SHALL record the usage count, up to five sample node IDs, and the anatomy context of each use. It SHALL skip and report properties that are already bound to variables, gradient and image paints, hidden nodes, text whose line height is `AUTO`, and nodes inside instances, whose main components are harvested instead.

#### Scenario: Mixed bound and raw properties

- **WHEN** a button's fill is already bound to a variable and its corner radius is a raw 20
- **THEN** the harvest records the radius value 20 with the button's node ID
- **AND** lists the fill as an existing binding instead of a harvested value

##### Example: Recorded values

| Node property | Family | Recorded value |
| --- | --- | --- |
| Frame fill #6750A4, paint opacity 100% | color | #6750A4 @ 1 |
| Rectangle fill #1D1B20, paint opacity 12% | color | #1D1B20 @ 0.12 |
| `paddingLeft` 24 and `paddingRight` 24 | spacing | 24 (inset-horizontal) |
| `itemSpacing` 8 in a horizontal auto layout | spacing | 8 (gap-inline) |
| Text Roboto Medium 14 / 20 px / 0.1 px | typography | Roboto, Medium, 14, 20, 0.1 |
| Drop shadow 0 1 3 1 #000000 @ 15% | shadow | one shadow layer |

### Requirement: Identical values merge without asking

Values that are identical SHALL map to one Ref variable without a question: colors with the same hex value and the same paint opacity, and numbers whose absolute difference is below 0.01. The harvest SHALL reuse an existing Ref variable that already stores the same value instead of creating a new one.

#### Scenario: Floating-point noise

- **WHEN** one padding is 15.999 and another is 16
- **THEN** both map to a single `ref/spacing/16` variable without asking the user

#### Scenario: Existing primitive reused

- **WHEN** the file already has `md/ref/palette/primary/40` storing #6750A4 and the harvest finds #6750A4
- **THEN** the plan reuses `md/ref/palette/primary/40` and creates no new Ref color for it

### Requirement: Near values are decided by the user with visual evidence

The harvest SHALL NOT merge near values automatically. It SHALL group values that fall within the thresholds below, and values that sit off the file's Sys scales, into review groups. Two values that are both steps of the file's Sys scales, or of the default scales when the file has none, SHALL NOT be grouped as near values. For each review group it SHALL add a sample row to a review board inside a Section named `Token Review — temporary`, placed on the page that contains the scope root, beside the existing content, without moving or editing any existing node. Each sample SHALL show the value visually together with its value label, usage count, and hyperlinks to sample nodes, and the recommended value SHALL be marked. The skill SHALL capture a screenshot of the board, SHALL give the user the board's Figma link, and SHALL ask the user to choose for each group: merge into the recommended value, merge into another listed value, or keep all values. Every approved merge SHALL be handled as a Tier 3 change. After the decisions are applied, the skill SHALL delete the review Section unless the user asks to keep it.

| Family | Near-value threshold |
| --- | --- |
| Color | CIE76 ΔE ≤ 3 with equal paint opacity |
| Spacing, size, radius, stroke width | absolute difference ≤ 1 px, or ≤ 5% of the larger value, whichever is greater |
| Typography | same family and weight, size within 1 px, line height within 2 px, letter spacing within 0.2 px |
| Shadow | same number of shadow layers, each offset, blur, and spread within 1 px, and color ΔE ≤ 3 |
| Opacity | within 5 percentage points |

#### Scenario: Two nearly identical blues

- **WHEN** the harvest finds #1A73E8 on 42 nodes and #1A73E9 on 3 nodes
- **THEN** the review board shows both swatches side by side with their hex values, usage counts, links to sample nodes, and ΔE
- **AND** #1A73E8 is marked as recommended because it has more uses
- **AND** nothing is merged until the user chooses

#### Scenario: Off-scale spacing

- **WHEN** the file's spacing scale has steps 12 and 16 and the harvest finds a gap of 14
- **THEN** the review group offers snapping to 12, snapping to 16, or keeping 14 as a custom scale step

### Requirement: Semantic and anatomy mapping with confidence

The harvest SHALL map every kept value to a Sys token from the token vocabulary, and every harvested property of a component to a Comp token named by component and anatomy. Each mapping SHALL carry a confidence of `exact`, `inferred`, or `needs-review`. Existing Sys tokens whose resolved values equal the kept value SHALL be reused. The skill SHALL ask the user about every `needs-review` mapping before creating the corresponding tokens.

#### Scenario: Brand color used on buttons

- **WHEN** #6750A4 is the most used saturated color and fills the containers of button-like nodes, and white text sits on it
- **THEN** the plan maps #6750A4 to `sys/color/primary` and the white text color to `sys/color/on-primary` with confidence `inferred`

##### Example: Mapping outcomes

| Harvested value and context | Sys token | Comp token | Confidence |
| --- | --- | --- | --- |
| 24 as left and right padding of a button | `sys/spacing/inset-horizontal-xl` | `comp/filled-button/container/padding-horizontal` | exact |
| Radius equal to half the height of a 40 px button | `sys/shape/corner-full` | `comp/filled-button/container/shape` | exact |
| Roboto Medium 14/20, 0.1 px tracking on a button label | `sys/typescale/label-large/*` | Text Style `label/large` | exact |
| #F2B8B5 used once on an unnamed rectangle | none proposed | none proposed | needs-review |

### Requirement: Token plan is confirmed before writing

Before creating any variable or style, the harvest SHALL present a token plan that lists the new Ref, Sys, and Comp variables with their names, raw values or alias targets, scopes, and WEB code syntax; the Text Styles and Effect Styles to create or update; and every binding with its node ID, property, current value, and token value. The plan SHALL be treated as at least a Tier 2 change.

#### Scenario: User adjusts a name in the plan

- **WHEN** the user replies to the plan asking to rename `sys/color/tertiary` to `sys/color/accent`
- **THEN** the skill updates the plan, shows the revised entries, and waits for confirmation again before writing

### Requirement: Translucent paints keep their appearance

For a solid paint whose opacity is below 1, the harvest SHALL preserve the rendered color and opacity by using the first method that applies, in this order:

1. When the Figma API in use accepts composed color values, bind the paint, with its own opacity at 100%, to a color variable whose value composes an alias to the opaque base color token and an alias to an opacity token scoped `COLOR_OPACITY`.
2. For a leaf layer that has exactly one visible fill and no visible strokes, effects, or children, bind the opaque base color with the paint opacity set to 100%, and bind the layer opacity to an opacity token. This method SHALL be handled as a Tier 2 change.
3. Otherwise, bind a token chain that ends in an alpha-carrying Ref color named with the `-a{percentage}` suffix.

After binding, the skill SHALL read the paint back and confirm that the rendered color and opacity are unchanged. When setting a composed value fails, the skill SHALL fall back to the next applicable method for that paint group and SHALL report the fallback and the error message.

#### Scenario: Disabled container color composed from Sys tokens

- **WHEN** a disabled button's container is filled with #1D1B20 at 12% paint opacity and the API in use accepts composed color values
- **THEN** the plan binds the fill to `comp/filled-button/disabled/container/background-color`, whose value composes `sys/color/on-surface` and `sys/state/disabled/container-opacity` (12)
- **AND** the paint's own opacity is 100% and the read-back confirms a rendered opacity of 12%

#### Scenario: Disabled container layer without paint-opacity binding

- **WHEN** a leaf rectangle named `container` inside a disabled button is filled with #1D1B20 at 12% paint opacity and the API in use rejects composed color values
- **THEN** the plan binds the fill to the token for #1D1B20 with paint opacity 100% and binds the rectangle's layer opacity to the disabled container opacity token with value 12
- **AND** labels the item as a Tier 2 change

#### Scenario: Translucent fill on a frame with children

- **WHEN** a frame with children has a #000000 fill at 12% paint opacity and the API in use rejects composed color values
- **THEN** the plan binds the fill to a Comp token whose chain ends in `ref/color/neutral/0-a12`
- **AND** the read-back confirms a rendered opacity of 12%

### Requirement: Appearance is preserved and verified

After binding, the skill SHALL verify that every bound property resolves to its original value or to the value the user approved in a merge. It SHALL re-run the harvest on the scope and report remaining hardcoded values only as listed skips. It SHALL capture an after screenshot of every scope root, compare it with the baseline, and report any unexpected difference to the user instead of correcting it silently.

#### Scenario: Unexpected difference after binding

- **WHEN** a bound text node resolves to line height 22 while the harvested value was 20
- **THEN** the skill reports the node ID, the property, and both values to the user and does not change anything else until the user decides

### Requirement: Workflow F is callable by other skills

When another skill such as `figma-componentize` invokes Workflow F, the workflow SHALL accept a list of scope node IDs and optional component names, SHALL apply the same change tiers and near-value review, and SHALL return a structured report containing the created variable IDs per layer, the created or updated style IDs, the applied bindings with node IDs, the merged value groups, and the skipped items with reasons.

#### Scenario: Componentization hands over new components

- **WHEN** `figma-componentize` passes the node IDs of three newly created main components
- **THEN** Workflow F harvests only those components and returns the structured report after the user confirms the token plan
