# Market Tab Strip

## Purpose

Switches between the primary inventory sections in the holdings screen while staying inside the compact header stack.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-060 | Figma `29199:89369` | `庫存通用元件` common inventory frame | The frame places the primary tab set directly under the top app bar/status chrome and above lower inventory controls. |
| E-061 | Figma `29199:20518` | `tab` component set | 415x227 set with four 375x37 variants for `看盤/盤後`, `即時損益`, `事件/新聞`, and `持股分析`; active label is white, inactive labels are `#808080`, and the `看盤/盤後` indicator switches orange/gray. |

## Anatomy

- Full-width strip container
- Four tab items
- Text label per tab
- Optional chevron/indicator on `看盤/盤後`
- Bottom divider

## Variants

- Active `看盤/盤後`
- Active `即時損益`
- Active `事件/新聞`
- Active `持股分析`

## States

- Active tab: observed as white 16px label.
- Inactive tab: observed as gray `#808080` label.
- `看盤/盤後` active indicator: observed as orange 11x12 chevron.
- `看盤/盤後` inactive indicator: observed as gray 11x12 chevron.
- Pressed, focus-visible, disabled, overflow, and expanded `看盤/盤後` menu states: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-market-tab-strip-set-width` | `--cm-sys-size-market-primary-set-width` | Component set reference width | Documentation |
| `--cm-comp-market-tab-strip-set-height` | `--cm-sys-size-market-primary-set-height` | Component set reference height | Documentation |
| `--cm-comp-market-tab-strip-width` | `--cm-sys-size-market-primary-width` | Strip width | All |
| `--cm-comp-market-tab-strip-height` | `--cm-sys-size-market-primary-height` | Strip height | All |
| `--cm-comp-market-tab-strip-container-color` | `--cm-sys-color-surface` | Strip background | All |
| `--cm-comp-market-tab-strip-divider-color` | `--cm-sys-color-outline-inverse-subtle` | Bottom divider | All |
| `--cm-comp-market-tab-strip-active-label-color` | `--cm-sys-color-on-surface-strong` | Selected tab label | Active |
| `--cm-comp-market-tab-strip-inactive-label-color` | `--cm-sys-color-on-surface-subtle` | Unselected tab label | Inactive |
| `--cm-comp-market-tab-strip-active-indicator-color` | `--cm-sys-color-primary` | `看盤/盤後` chevron | Active |
| `--cm-comp-market-tab-strip-inactive-indicator-color` | `--cm-sys-color-on-surface-subtle` | `看盤/盤後` chevron | Inactive |
| `--cm-comp-market-tab-strip-item-padding-x` | `--cm-sys-spacing-lg` | Tab horizontal padding | All |
| `--cm-comp-market-tab-strip-item-padding-y` | `--cm-sys-spacing-icon-label-lg` | Tab vertical padding | All |
| `--cm-comp-market-tab-strip-item-gap` | `--cm-sys-spacing-xs` | Label/indicator gap | Indicator |
| `--cm-comp-market-tab-strip-divider-height` | `--cm-sys-spacing-hairline` | Divider thickness | All |
| `--cm-comp-market-tab-strip-indicator-width` | `--cm-sys-size-market-primary-indicator-width` | Chevron width | Indicator |
| `--cm-comp-market-tab-strip-indicator-height` | `--cm-sys-size-market-primary-indicator-height` | Chevron height | Indicator |
| `--cm-comp-market-tab-strip-label-text-size` | `--cm-sys-typescale-label-xl-size` | Label size | All |
| `--cm-comp-market-tab-strip-label-line-height` | `--cm-sys-typescale-label-xl-line-height` | Label line height | All |
| `--cm-comp-market-tab-strip-label-weight` | `--cm-sys-weight-regular` | Label weight | All |

## Layout Rules

- Keep each strip 375x37 in the mobile inventory header stack.
- Keep the component set reference at 415x227 for documentation/parity screenshots.
- Use a flat `#252525` strip background with a 1px white-8 bottom divider.
- Use 11px horizontal and 7px vertical item padding.
- Keep the `看盤/盤後` label and chevron on a 4px gap.
- Do not add rounded containers, underlines, large active pills, or separate card framing.

## Content Rules

- Observed labels are `看盤/盤後`, `即時損益`, `事件/新聞`, and `持股分析`.
- Keep tab labels single-line and regular weight.
- Keep the chevron only on `看盤/盤後` until another tab proves an expandable treatment.

## Accessibility Rules

- Use a tablist pattern when the strip switches visible inventory panels.
- Expose the active tab programmatically.
- The chevron must not be the only accessible signal for selected state.
- Provide a visible focus indicator in implementation; current Figma evidence does not define focus styling.

## Do / Don't

- Do keep primary inventory tabs compact at 37px high.
- Do use white/gray label color as the active/inactive state language.
- Don't style this like the secondary Market Filter Tab Strip; that component uses filled option items and orange active text.
- Don't add underlined web tabs, large segmented controls, or orange filled active tabs without new evidence.

## Implementation Notes

The separate 11x12 collapse/expand icon set confirms the chevron asset dimensions, but the expanded `看盤/盤後` menu surface is not visible in this extraction.
