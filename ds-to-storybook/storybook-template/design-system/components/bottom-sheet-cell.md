# Bottom Sheet Cell

## Purpose

Provides dense rows and action rows inside bottom sheets, including icon/label rows, right-status rows, switch rows, and full-width gray action buttons.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-064 | Figma `16405:224726` | `bottom sheet_cell` | 415x624 component set with eight variants: icon+text+status, icon+text, gray action button, action button with New badge, checked row, two switch rows, and a status selector row. Rows use `#252525`, 20x16 padding, 18px labels, white-8 dividers, and 24px/32px icons. |
| E-065 | Figma `29207:103989` | Utility icons and `New` badge | Supplies 24px pen/list/bounce icons and the 42x20 red New Badge used in the cell variants. |
| E-066 | Figma `29207:103647` | MyStock 32px function icons | Supplies `mystock_sun`, `mystock_sort`, `mystock_inventory`, and `mystock_order` icon variants used by bottom-sheet rows. |
| E-067 | Figma `16405:224755` | `bottom sheet` composite variants | Shows Bottom Sheet Cell composition in production-like sheets: gray action rows, status/navigation rows, switch rows, single-select check rows, and multi-select radio rows. |
| E-078 | Figma `8134:289037` | `switch` component set | Supplies standalone Android/iOS off/on Switch visuals for the switch slot. |
| E-079 | Figma `22911:207990` | `勾選` component set | Supplies standalone 20px checkbox/radio Selection Control visuals for selection rows. |

## Anatomy

- Cell container
- Leading utility icon slot
- Primary label
- Optional right status text
- Optional right chevron
- Optional switch slot
- Optional Selection Control slot
- Optional gray action surface
- Optional New Badge
- Bottom divider

## Variants

- `圖+文字+狀態`
- `圖+文字`
- `按鈕`
- `有new的按鈕`
- `Variant5` checked row
- `口袋下單`
- `彈幕開關`
- `主力動向天期`
- Single-select row with orange check or Selection Control radio, depending on the sheet pattern
- Multi-select row with selected/unselected Selection Control checkbox or radio control, depending on product behavior

## States

- Default icon+label row: observed.
- Right status row: observed with amber and primary-orange text.
- Gray action button row: observed.
- New badge overlay: observed.
- Switch row: observed as a 43x26 slot; compose the standalone Switch from E-078 for off/on visual states.
- Single-select check row: observed in the `股票排序` sheet.
- Multi-select radio row: observed in the `加入自選股` sheet.
- Standalone checkbox/radio visuals: supplied by Selection Control from E-079.
- Pressed, focus-visible, disabled, loading, switch disabled/focus, selection-control disabled/focus, and long-label wrapping: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-bottom-sheet-cell-set-width` | `--cm-sys-size-bottom-sheet-cell-set-width` | Component set reference width | Documentation |
| `--cm-comp-bottom-sheet-cell-set-height` | `--cm-sys-size-bottom-sheet-cell-set-height` | Component set reference height | Documentation |
| `--cm-comp-bottom-sheet-cell-width` | `--cm-sys-size-bottom-sheet-cell-width` | Standard row width | All |
| `--cm-comp-bottom-sheet-cell-height` | `--cm-sys-size-bottom-sheet-cell-height` | Standard row height | Default |
| `--cm-comp-bottom-sheet-cell-toggle-height` | `--cm-sys-size-bottom-sheet-cell-toggle-height` | Switch row height | Switch |
| `--cm-comp-bottom-sheet-cell-action-width` | `--cm-sys-size-bottom-sheet-cell-action-width` | Gray action row width | Action |
| `--cm-comp-bottom-sheet-cell-action-height` | `--cm-sys-size-bottom-sheet-cell-action-height` | Gray action row height | Action |
| `--cm-comp-bottom-sheet-cell-container-color` | `--cm-sys-color-surface` | Cell background | All |
| `--cm-comp-bottom-sheet-cell-action-container-color` | `--cm-sys-color-action-subtle` | Gray action surface | Action |
| `--cm-comp-bottom-sheet-cell-label-color` | `--cm-sys-color-on-surface-strong` | Primary label | All |
| `--cm-comp-bottom-sheet-cell-status-secondary-color` | `--cm-sys-color-secondary` | Amber right status | Status |
| `--cm-comp-bottom-sheet-cell-status-primary-color` | `--cm-sys-color-primary` | Orange right status/check | Status |
| `--cm-comp-bottom-sheet-cell-icon-color` | `--cm-sys-color-on-surface-strong` | Leading icons | All |
| `--cm-comp-bottom-sheet-cell-divider-color` | `--cm-sys-color-outline-inverse-subtle` | Bottom divider | All |
| `--cm-comp-bottom-sheet-cell-check-color` | `--cm-sys-color-primary` | Checked row mark | Checked |
| `--cm-comp-bottom-sheet-cell-row-padding-x` | `--cm-sys-spacing-xl` | Row horizontal padding | Default |
| `--cm-comp-bottom-sheet-cell-row-padding-y` | `--cm-sys-spacing-screen-gutter` | Row vertical padding | Default |
| `--cm-comp-bottom-sheet-cell-action-padding-x` | `--cm-sys-spacing-control-content-lg` | Action surface horizontal padding | Action |
| `--cm-comp-bottom-sheet-cell-action-padding-y` | `--cm-sys-spacing-l` | Action surface vertical padding | Action |
| `--cm-comp-bottom-sheet-cell-content-gap` | `--cm-sys-spacing-md` | Icon/label gap | Default |
| `--cm-comp-bottom-sheet-cell-status-gap` | `--cm-sys-spacing-xs` | Status text/chevron gap | Status |
| `--cm-comp-bottom-sheet-cell-action-gap` | `--cm-sys-spacing-icon-label-lg` | Action icon/label gap | Action |
| `--cm-comp-bottom-sheet-cell-divider-inset-x` | `--cm-sys-spacing-screen-gutter` | Divider side inset | All |
| `--cm-comp-bottom-sheet-cell-action-corner-radius` | `--cm-sys-shape-corner-xs` | Gray action radius | Action |
| `--cm-comp-bottom-sheet-cell-icon-size` | `--cm-sys-size-icon-standard` | Standard utility icon size | Default |
| `--cm-comp-bottom-sheet-cell-large-icon-size` | `--cm-sys-size-icon-xl` | MyStock function icon size | Function |
| `--cm-comp-bottom-sheet-cell-switch-width` | `--cm-sys-size-toggle-control-width` | Switch slot width | Switch |
| `--cm-comp-bottom-sheet-cell-switch-height` | `--cm-sys-size-toggle-control-height` | Switch slot height | Switch |
| `--cm-comp-bottom-sheet-cell-status-icon-size` | `--cm-sys-size-icon-sm` | Right chevron/check size | Status |
| `--cm-comp-bottom-sheet-cell-label-text-size` | `--cm-sys-typescale-title-md-size` | Label size | All |
| `--cm-comp-bottom-sheet-cell-label-line-height` | `--cm-sys-typescale-title-md-compact-line-height` | Label line height | All |
| `--cm-comp-bottom-sheet-cell-label-weight` | `--cm-sys-weight-regular` | Label weight | All |

## Layout Rules

- Use 375x58 for standard cells and 375x59 for switch rows.
- Use 365x62 for gray action rows.
- Use the same 58px row rhythm for single-select and multi-select rows.
- Use 20px horizontal and 16px vertical padding in standard cells.
- Use 27px horizontal and 12px vertical padding inside gray action surfaces.
- Keep the leading icon and label on an 8px gap.
- Keep status text and chevron on a 4px gap.
- Keep dividers inset 16px from each side.

## Content Rules

- Labels are short Traditional Chinese operational commands or settings.
- Status text can be amber or primary orange depending on the source state.
- New Badge is allowed only on the action-row variant shown by evidence.
- Selection Control belongs in the leading icon slot and must not add helper copy or a second line.
- Do not add helper descriptions or secondary copy inside cells without new evidence.

## Accessibility Rules

- Rows with switch slots must expose label and switch state as one coherent control.
- Selection rows must expose checked/unchecked or selected/unselected state.
- Action rows should be buttons with the visible text as the accessible name.
- New Badge should be included in the accessible label only when it changes the user's interpretation of the action.

## Do / Don't

- Do keep cells dense and full-width within the sheet.
- Do keep gray action surfaces flat and 4px rounded.
- Don't convert these rows into cards, settings panels, or icon-only menus.
- Don't create row-local switch or selection-control artwork; use the extracted Switch and Selection Control, and keep disabled/focus states undefined until evidenced.

## Implementation Notes

Compose leading icons from MyStock Utility Icon, the badge from New Badge, binary controls from Switch, and checkbox/radio marks from Selection Control. Bottom Sheet Cell owns row placement and accessibility grouping; Switch owns track/knob visuals, and Selection Control owns checkbox/radio geometry and selected marks.

Use `figmaVariant` only in Storybook export stories when multiple visual rows share the same runtime `variant`; this keeps the imported Figma component set from deduping distinct observed variants into one `row` component.
