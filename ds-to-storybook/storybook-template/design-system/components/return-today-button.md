# Return Today Button

## Purpose

Returns an event calendar or date-based list to today's date.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-026 | Figma `19215:187687` | `button` component set | Two `回到今天` variants in a 189x68 set; each button is 70x28. |

## Anatomy

- Button container
- Label

## Variants

- Default: amber border and amber label.
- Disabled: gray border and gray label.

## States

- Default: observed.
- Disabled: observed.
- Pressed, focus-visible, hover, loading, and icon states: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-return-today-button-set-width` | `--cm-sys-size-return-today-control-set-width` | Component set reference width | Documentation |
| `--cm-comp-return-today-button-set-height` | `--cm-sys-size-return-today-control-set-height` | Component set reference height | Documentation |
| `--cm-comp-return-today-button-width` | `--cm-sys-size-return-today-control-width` | Button width | Default |
| `--cm-comp-return-today-button-height` | `--cm-sys-size-return-today-control-height` | Button height | Default |
| `--cm-comp-return-today-button-border-width` | `--cm-sys-size-control-border-width` | Outline width | Default |
| `--cm-comp-return-today-button-padding-x` | `--cm-sys-spacing-sm` | Horizontal padding | Default |
| `--cm-comp-return-today-button-padding-y` | `--cm-sys-spacing-xs` | Vertical padding | Default |
| `--cm-comp-return-today-button-corner-radius` | `--cm-sys-shape-corner-xs` | Button radius | Default |
| `--cm-comp-return-today-button-default-border-color` | `--cm-sys-color-secondary` | Outline color | Default |
| `--cm-comp-return-today-button-default-label-color` | `--cm-sys-color-secondary` | Label color | Default |
| `--cm-comp-return-today-button-disabled-border-color` | `--cm-sys-color-disabled` | Outline color | Disabled |
| `--cm-comp-return-today-button-disabled-label-color` | `--cm-sys-color-on-disabled` | Label color | Disabled |
| `--cm-comp-return-today-button-label-text-size` | `--cm-sys-typescale-label-md-size` | Label size | Default |
| `--cm-comp-return-today-button-label-line-height` | `--cm-sys-typescale-label-md-compact-line-height` | Label line height | Default |
| `--cm-comp-return-today-button-label-weight` | `--cm-sys-weight-medium` | Label weight | Default |

## Layout Rules

- Use a 70x28 outline button.
- Apply 6px horizontal padding and 4px vertical padding.
- Use 4px corner radius.
- Keep the label centered and single-line.

## Content Rules

- Observed label is `回到今天`.
- Do not add an icon unless future evidence shows one.
- Disabled state keeps the same copy and layout.

## Accessibility Rules

- Use a button role when interactive.
- Disabled state should be programmatically disabled, not only visually gray.
- Accessible name should match the visible label.

## Do / Don't

- Do keep the control compact and outline-only.
- Do use explicit disabled border and label colors.
- Don't expand it into a full-width calendar navigation CTA.
- Don't use opacity to represent disabled unless a future reference shows it.

## Implementation Notes

The Figma output reports a small positive tracking value on the label. The token contract keeps the existing compact label typography until a broader typography extraction adds letter-spacing tokens.

Use `figmaVariant` only in Storybook export stories such as `AllVariants` so default and disabled controls emit distinct `data-variant` values and the Figma importer builds separate component variants instead of deduping them into the first return-today button.
