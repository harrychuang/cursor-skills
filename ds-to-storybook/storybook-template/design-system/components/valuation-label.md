# Valuation Label

## Purpose

Shows a compact valuation assessment for a stock.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-038 | Figma `29209:173791` | `BTN` component set | Five 68x28 valuation labels in a 372x44 component set. |

## Anatomy

- Label container
- Valuation text

## Variants

- Expensive: orange fill, white `昂貴`.
- Slightly high: peach fill, dark `合理偏高`.
- Slightly low: pale blue fill, dark `合理偏低`.
- Cheap: blue fill, white `便宜`.
- Unavailable: dark gray fill, gray `無法評估`.

## States

- Default valuation variants: observed.
- Pressed, focus-visible, disabled, loading, selected, and row-context states: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-valuation-label-set-width` | `--cm-sys-size-valuation-label-set-width` | Component set reference width | Documentation |
| `--cm-comp-valuation-label-set-height` | `--cm-sys-size-valuation-label-set-height` | Component set reference height | Documentation |
| `--cm-comp-valuation-label-width` | `--cm-sys-size-valuation-label-width` | Label width | Default |
| `--cm-comp-valuation-label-height` | `--cm-sys-size-valuation-label-height` | Label height | Default |
| `--cm-comp-valuation-label-padding-x` | `--cm-sys-spacing-xl` | Horizontal padding | Default |
| `--cm-comp-valuation-label-padding-y` | `--cm-sys-spacing-xs` | Vertical padding | Default |
| `--cm-comp-valuation-label-corner-radius` | `--cm-sys-shape-corner-label` | Label radius | Default |
| `--cm-comp-valuation-label-expensive-container-color` | `--cm-sys-color-valuation-expensive` | Expensive fill | Expensive |
| `--cm-comp-valuation-label-expensive-label-color` | `--cm-sys-color-on-valuation-expensive` | Expensive text | Expensive |
| `--cm-comp-valuation-label-slightly-high-container-color` | `--cm-sys-color-valuation-slightly-high` | Slightly high fill | Slightly high |
| `--cm-comp-valuation-label-slightly-high-label-color` | `--cm-sys-color-on-valuation-slightly-high` | Slightly high text | Slightly high |
| `--cm-comp-valuation-label-slightly-low-container-color` | `--cm-sys-color-valuation-slightly-low` | Slightly low fill | Slightly low |
| `--cm-comp-valuation-label-slightly-low-label-color` | `--cm-sys-color-on-valuation-slightly-low` | Slightly low text | Slightly low |
| `--cm-comp-valuation-label-cheap-container-color` | `--cm-sys-color-valuation-cheap` | Cheap fill | Cheap |
| `--cm-comp-valuation-label-cheap-label-color` | `--cm-sys-color-on-valuation-cheap` | Cheap text | Cheap |
| `--cm-comp-valuation-label-unavailable-container-color` | `--cm-sys-color-valuation-unavailable` | Unavailable fill | Unavailable |
| `--cm-comp-valuation-label-unavailable-label-color` | `--cm-sys-color-on-valuation-unavailable` | Unavailable text | Unavailable |
| `--cm-comp-valuation-label-text-size` | `--cm-sys-typescale-label-md-size` | Label size | Default |
| `--cm-comp-valuation-label-line-height` | `--cm-sys-typescale-label-md-compact-line-height` | Label line height | Default |
| `--cm-comp-valuation-label-weight` | `--cm-sys-weight-medium` | Label weight | Default |

## Layout Rules

- Use a fixed 68x28 label.
- Use 20px horizontal padding, 4px vertical padding, and 14px radius.
- Keep text centered and single-line.

## Content Rules

- Observed labels are `昂貴`, `合理偏高`, `合理偏低`, `便宜`, and `無法評估`.
- Do not shorten `合理偏高` or `合理偏低`.
- Unavailable is a valuation state, not a disabled interaction state.

## Accessibility Rules

- Expose the full valuation text.
- Do not rely on color alone to communicate valuation.

## Do / Don't

- Do use valuation-specific tokens instead of market or portfolio category tokens.
- Don't treat these labels as buttons unless a future interaction reference shows click behavior.
- Don't use red/green market semantics for valuation.
