# Portfolio Manual Import Value Field

## Purpose

Compact value display/editing field used inside manual portfolio import rows. It distinguishes missing required input from entered numeric values and intentionally empty values.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-051 | Figma `29214:89592` | `輸入內容` component set | 234x45 set with three 70x29 variants: `尚未輸入`, `已輸入`, and `空值`. Missing input shows a pale-orange outline and gray `請填寫`; entered and empty values use the same dark fill without outline. |

## Anatomy

- Field container
- Right-aligned value/placeholder text
- Optional outline for required missing input

## Variants

- `尚未輸入`: gray PingFang placeholder `請填寫`, pale-orange outline.
- `已輸入`: white SF Pro Text numeric value such as `1,000`, no visible outline.
- `空值`: white dash `-`, no visible outline.

## States

- Observed: missing required input, entered value, empty value.
- Not observed: focused editing, caret, keyboard state, validation error, disabled, loading, pressed, hover.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-portfolio-manual-import-value-field-set-width` | `--cm-sys-size-portfolio-manual-import-value-set-width` | Component set reference width | Documentation |
| `--cm-comp-portfolio-manual-import-value-field-set-height` | `--cm-sys-size-portfolio-manual-import-value-set-height` | Component set reference height | Documentation |
| `--cm-comp-portfolio-manual-import-value-field-width` | `--cm-sys-size-portfolio-manual-import-value-width` | Field width | Default |
| `--cm-comp-portfolio-manual-import-value-field-height` | `--cm-sys-size-portfolio-manual-import-value-height` | Field height | Default |
| `--cm-comp-portfolio-manual-import-value-field-container-color` | `--cm-sys-color-surface-raised` | Field fill | All variants |
| `--cm-comp-portfolio-manual-import-value-field-placeholder-border-color` | `--cm-sys-color-primary-container` | Required-missing outline | `尚未輸入` |
| `--cm-comp-portfolio-manual-import-value-field-value-border-color` | `--cm-sys-color-transparent` | Entered value outline | `已輸入` |
| `--cm-comp-portfolio-manual-import-value-field-empty-border-color` | `--cm-sys-color-transparent` | Empty value outline | `空值` |
| `--cm-comp-portfolio-manual-import-value-field-border-width` | `--cm-sys-size-control-border-width` | Outline width | `尚未輸入` |
| `--cm-comp-portfolio-manual-import-value-field-corner-radius` | `--cm-sys-shape-corner-xs` | Field radius | Default |
| `--cm-comp-portfolio-manual-import-value-field-padding-x` | `--cm-sys-spacing-xs` | Horizontal inset | Default |
| `--cm-comp-portfolio-manual-import-value-field-padding-y` | `--cm-sys-spacing-xxs-plus` | Vertical inset | Default |
| `--cm-comp-portfolio-manual-import-value-field-placeholder-text-color` | `--cm-sys-color-on-surface-muted` | Placeholder color | `尚未輸入` |
| `--cm-comp-portfolio-manual-import-value-field-value-text-color` | `--cm-sys-color-on-surface-strong` | Numeric value color | `已輸入` |
| `--cm-comp-portfolio-manual-import-value-field-empty-text-color` | `--cm-sys-color-on-surface-strong` | Dash value color | `空值` |
| `--cm-comp-portfolio-manual-import-value-field-placeholder-typeface` | `--cm-sys-typeface-plain` | Placeholder typeface | `尚未輸入` |
| `--cm-comp-portfolio-manual-import-value-field-value-typeface` | `--cm-sys-typeface-financial-numeric` | Numeric/dash typeface | `已輸入`, `空值` |
| `--cm-comp-portfolio-manual-import-value-field-text-size` | `--cm-sys-typescale-label-xl-size` | Text size | All variants |
| `--cm-comp-portfolio-manual-import-value-field-text-line-height` | `--cm-sys-typescale-label-xl-line-height` | Text line height | All variants |
| `--cm-comp-portfolio-manual-import-value-field-text-weight` | `--cm-sys-weight-regular` | Text weight | All variants |

## Layout Rules

- Keep the field exactly 70x29 inside 61px manual import row cells.
- Align text to the right and vertically center it.
- Export the value/placeholder text as a fill-container text layer; entered values such as `1,000` must stay right-aligned inside that fill width.
- Use 4px horizontal padding and 3px vertical padding, normalized from the observed 2.5px inset.
- The outline belongs only to the missing required state in the observed set.

## Content Rules

- Use `請填寫` for required missing values.
- Use localized numeric grouping for entered quantities, such as `1,000`.
- Use `-` for an intentionally empty value, not `0`.

## Accessibility Rules

- When implemented as an editable input, expose the stock column/metric context in the accessible label.
- Missing required fields should be announced as required or incomplete; do not rely on the pale-orange outline alone.
- Keep numeric values screen-reader friendly by storing the raw number separately from formatted display text.

## Do / Don't

- Do keep the field compact and right-aligned.
- Do reserve the outline for the missing required state.
- Don't turn this into a full text input with label, helper text, or error banner without future evidence.
- Don't substitute empty dash values with zero.

## Implementation Notes

- In product code, this can be implemented as a display field or input depending on edit mode, but the visual contract is the 70x29 field shown here.
- Compose this inside Portfolio Manual Import Cell rather than duplicating field tokens in row implementations.
