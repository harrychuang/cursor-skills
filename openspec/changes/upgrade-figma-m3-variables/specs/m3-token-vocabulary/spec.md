## Purpose

Define the naming, encoding, semantic vocabularies, scopes, and composite binding modes that every figma-m3-variables workflow uses, so that tokens stay consistent across color, typography, shape, spacing, size, stroke width, opacity, and elevation.

## ADDED Requirements

### Requirement: Layer naming responsibilities

Ref variable names SHALL describe raw values only and SHALL NOT contain component, pattern, or layout-region words. Sys variable names SHALL describe product-wide semantic roles and SHALL NOT contain words tied to a single component's anatomy. Only Comp variable names SHALL contain component and anatomy words. Sys variables SHALL alias Ref variables, Comp variables SHALL alias Sys variables, and nodes SHALL NOT be bound to Ref variables.

#### Scenario: Component word proposed for a primitive

- **WHEN** a plan proposes `md/ref/spacing/button/padding-h` for a value of 16
- **THEN** the skill replaces it with `md/ref/spacing/16`, a Sys spacing role that aliases it, and a Comp token under the button that aliases the Sys role

### Requirement: Name encoding rules

Every name segment SHALL use only lowercase letters, digits, hyphen, and underscore. Decimal points SHALL be encoded as `_`, negative numbers SHALL be prefixed with `neg-`, opacity values SHALL be written as integer percentages, color tones SHALL be the rounded CIE L* of the color, colors that carry alpha SHALL end with `-a{alpha percentage}`, and names SHALL NOT contain `.`. When two different kept values would receive the same Ref name, the value with more uses SHALL keep the name and the others SHALL receive the suffixes `-b`, `-c`, and so on, which the user confirms in the token plan.

#### Scenario: Negative letter spacing

- **WHEN** the harvest creates a Ref token for a letter spacing of -0.25 px
- **THEN** the token is named `ref/type/tracking/neg-0_25`

##### Example: Encoded Ref names

| Raw value | Ref name |
| --- | --- |
| Letter spacing 0.5 px | `ref/type/tracking/0_5` |
| Letter spacing -0.25 px | `ref/type/tracking/neg-0_25` |
| Opacity 38% | `ref/opacity/38` |
| #1A73E8 (L* 49.9, blue hue) | `ref/color/blue/50` |
| #000000 at 15% alpha in a shadow | `ref/color/neutral/0-a15` |
| Corner radius for a pill shape | `ref/radius/9999` |

### Requirement: Default Sys vocabularies with file precedence

The token spec SHALL define default Sys vocabularies, and scales that already exist in the file SHALL take precedence over them:

- Color: the M3 color roles, with `success` and `warning` role families as permitted extensions.
- Spacing: the roles `inset-horizontal`, `inset-vertical`, `inset`, `gap-inline`, and `gap-stack`, combined with one shared ladder `3xs 2`, `2xs 4`, `xs 8`, `sm 12`, `md 16`, `lg 20`, `xl 24`, `2xl 32`, `3xl 40`, `4xl 48`, `5xl 64`, where a label means the same value under every role.
- Shape: `corner-none 0`, `corner-extra-small 4`, `corner-small 8`, `corner-medium 12`, `corner-large 16`, `corner-large-increased 20`, `corner-extra-large 28`, `corner-extra-large-increased 32`, `corner-extra-extra-large 48`, and `corner-full`, which aliases `ref/radius/9999`.
- Typography: the 15 M3 typescale roles from `display-large` to `label-small`.
- Elevation: `level0` to `level5`.
- Stroke width: `thin 1`, `medium 2`, `thick 3`.
- Size: `icon-xs 12`, `icon-sm 16`, `icon-md 20`, `icon-lg 24`, `icon-xl 32`, `control-height-sm 32`, `control-height-md 40`, `control-height-lg 48`, `control-height-xl 56`, and `touch-target-min 48`.
- State opacity (Sys names follow M3's `sys/state/{state}/…` tokens): `hover 8`, `focus 10`, `pressed 10`, `dragged 16`, disabled content `38`, and disabled container `12` by default. M3 uses 10 for its Expressive buttons and 4 for filled text fields, so container opacities found in the file take precedence.

#### Scenario: File defines its own spacing ladder

- **WHEN** the file already has `md/sys/spacing/gap-inline-sm` resolving to 8
- **THEN** the skill maps a harvested gap of 8 to `gap-inline-sm` and follows the file's ladder instead of the default one

##### Example: Default mapping in a file without Sys tokens

| Harvested value and use | Sys token |
| --- | --- |
| Padding left and right 16 | `sys/spacing/inset-horizontal-md` |
| Padding top and bottom 12 | `sys/spacing/inset-vertical-sm` |
| Gap 8 in a horizontal auto layout | `sys/spacing/gap-inline-xs` |
| Gap 24 in a vertical auto layout | `sys/spacing/gap-stack-xl` |
| Radius 12 | `sys/shape/corner-medium` |
| Radius 20 on a 40 px tall control | `sys/shape/corner-full` |

### Requirement: Off-scale values offer snapping or a custom step

A value that falls between two steps of a Sys scale SHALL be presented in a near-value review group with three choices: snap to the lower step, snap to the upper step, or keep the value as a custom step named `{lower step}-plus`. Snapping SHALL be handled as a Tier 3 change. When two kept values would receive the same custom name, the skill SHALL ask the user to name them.

#### Scenario: Radius between two steps

- **WHEN** the harvest finds a corner radius of 10 in a file that uses the default shape scale
- **THEN** the review group offers `corner-small` (8), `corner-medium` (12), or keeping 10 as `corner-small-plus`

### Requirement: Typography tokens without prerequisites

The skill SHALL create typography tokens in any file, including files that have no typography variables yet. Line height and letter spacing tokens SHALL store pixel values because Figma interprets these variables as pixels; percentage values SHALL be converted with the text's font size, and an `AUTO` line height SHALL stay unbound and be reported. Ref typography primitives SHALL be `ref/type/family/{slug}` (STRING), `ref/type/weight/{n}`, `ref/type/size/{n}`, `ref/type/line-height/{n}`, and `ref/type/tracking/{n}`. Sys typography tokens SHALL be `sys/typescale/{role}/font`, `/weight`, `/size`, `/line-height`, and `/tracking`, aliasing the Ref primitives. In Styles mode each typescale role in use SHALL have a Text Style named `{role family}/{size}` (for example `label/large`) whose fields are bound to the Sys typescale variables, and text nodes SHALL use that Text Style. In Variables mode, text node fields SHALL be bound to Comp tokens `comp/{component}/{anatomy}/font`, `/weight`, `/size`, `/line-height`, and `/tracking`, which alias the Sys typescale variables.

#### Scenario: Button label in a file without typography variables

- **WHEN** Workflow F tokenizes a button label set in Roboto Medium 14 with 20 px line height and 0.1 px letter spacing, and the file has no typography variables or Text Styles
- **THEN** the plan creates the Ref primitives, the five `sys/typescale/label-large/*` variables, and the Text Style `label/large` bound to them
- **AND** applies `label/large` to the label text node

### Requirement: Elevation, stroke width, opacity, and size tokens

The token spec SHALL define Ref, Sys, and Comp names, variable types, scopes, and binding methods for elevation, stroke width, opacity, and size. Elevation SHALL use Sys variables `sys/elevation/level{n}/shadow-{i}/color`, `/offset-x`, `/offset-y`, `/blur`, and `/spread`, and in Styles mode an Effect Style `elevation/level{n}` whose shadow fields are bound to those variables. Stroke width SHALL follow `ref/stroke-width/{n}` → `sys/stroke/width-{label}` → `comp/{component}/outline/width`. Opacity SHALL follow `ref/opacity/{percentage}` → `sys/state/{state}/{target}-opacity` → `comp/{component}/{state}/{anatomy}/opacity`. Size SHALL follow `ref/size/{n}` → `sys/size/{role}-{label}` → `comp/{component}/{anatomy}/height`, `/width`, or `/size`. When composed color values are available, a translucent Comp color SHALL be a composed value whose color aliases a Sys color token and whose opacity aliases a Sys opacity token.

#### Scenario: Outlined card with a shadow

- **WHEN** Workflow F tokenizes a card with a 1 px outline and one drop shadow
- **THEN** the plan binds the stroke weight to `comp/card/outline/width` aliasing `sys/stroke/width-thin`
- **AND** creates or reuses the Effect Style for the matching elevation level and applies it to the card

#### Scenario: Translucent state color

- **WHEN** the skill creates the disabled container color of a filled button in a file where composed color values are available
- **THEN** `comp/filled-button/disabled/container/background-color` stores a composed value whose color aliases `sys/color/on-surface` and whose opacity aliases `sys/state/disabled/container-opacity`

### Requirement: Composite binding mode is inferred and announced

The skill SHALL choose Styles mode or Variables mode for typography and elevation by inspecting the file: when at least half of the text nodes in scope use local Text Styles, Styles mode applies; when text nodes carry direct typography variable bindings, Variables mode applies; when the file has neither, Styles mode applies by default. The token plan SHALL state the chosen mode and how to switch it.

#### Scenario: File with direct typography bindings

- **WHEN** more than half of the text nodes in scope have `fontSize` and `lineHeight` bound directly to variables and no local Text Styles exist
- **THEN** the skill uses Variables mode and the plan says so

### Requirement: Component state token order

Comp variables SHALL follow the current M3 order `comp/{component}[/{variant}][/{size}][/{condition}][/{state}]/{anatomy}/{property}`, where `{variant}` and `{size}` come from variant properties whose values change the token, `{condition}` is `selected`, `unselected`, or `error`, and `{state}` is `hovered`, `focused`, `pressed`, `dragged`, or `disabled`. Figma variant values SHALL map as Hover or Hovered → `hovered`, Focus or Focused → `focused`, Press or Pressed → `pressed`, Drag or Dragged → `dragged`, Disabled → `disabled`, Selected → `selected`, Unselected → `unselected`, and Error → `error`; Default, Enabled, and Rest SHALL add no segment. A file that already uses M3's older state words (`hover`, `focus`) SHALL keep them, and a file that uses the legacy order with the state after the property SHALL keep that order until the user migrates it.

#### Scenario: Disabled filled button

- **WHEN** the skill creates tokens for the Disabled variant of a filled button
- **THEN** the container color token is `comp/filled-button/disabled/container/background-color` and the label color token is `comp/filled-button/disabled/label-text/color`

#### Scenario: Component set with a style variant

- **WHEN** a component set named `Button` has the variant `Style=Filled, State=Hovered`
- **THEN** its state layer opacity token is `comp/button/filled/hovered/state-layer/opacity`

### Requirement: Scopes are explicit and valid

Every Ref variable SHALL have an empty scope list. Every Sys and Comp variable SHALL have explicit scopes chosen by role and anatomy from the token spec's scope table, SHALL NOT use `ALL_SCOPES`, SHALL NOT combine `ALL_FILLS` with `FRAME_FILL`, `SHAPE_FILL`, or `TEXT_FILL`, and SHALL only use scopes that match the variable type. Opacity tokens bound to layer opacity SHALL use `OPACITY`, opacity tokens used as the opacity part of a composed color SHALL use `COLOR_OPACITY`, and an opacity token used in both ways SHALL carry both scopes.

#### Scenario: Accent color used for text and fills

- **WHEN** the skill creates `sys/color/primary`, which is used as a container fill, as text color, and as an outline
- **THEN** its scopes are `ALL_FILLS` and `STROKE_COLOR`

### Requirement: WEB code syntax derived from names

Every variable SHALL have a WEB code syntax of the form `var(--{name})`, where `{name}` is the variable name in lowercase with `/` and spaces replaced by `-`.

#### Scenario: Comp token code syntax

- **WHEN** the skill creates `md/comp/filled-button/disabled/container/background-color`
- **THEN** its WEB code syntax is `var(--md-comp-filled-button-disabled-container-background-color)`

### Requirement: Collection layout defaults

For a file without token collections, the skill SHALL propose `{Prefix} · Reference`, `{Prefix} · System`, and `{Prefix} · Component`, with one group per component inside the Component collection, and SHALL offer one Component collection per component as an alternative. For a file with existing token collections, the skill SHALL keep the existing layout.

#### Scenario: Existing per-component collections

- **WHEN** the file already has `md · Component · Button` and `md · Component · Card`
- **THEN** tokens for a new Chip component go into a new `md · Component · Chip` collection
