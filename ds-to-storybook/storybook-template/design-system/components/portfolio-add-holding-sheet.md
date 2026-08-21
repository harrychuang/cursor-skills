# Portfolio Add Holding Sheet

## Purpose

Bottom sheet for adding or editing one holding. It is the follow-up surface for compact add-holding entry points and supports manual add, duplicate-warning, and manual/image-recognition tabbed modes.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-054 | Figma `7533:257724` | `新增持股` component set | 415x1269 set with three 375px-wide variants: `Default` 375x385, `重複輸入股票` 375x451, and `手動編輯&圖片辨識` 375x385. The sheet uses a 64px top region, 54px form rows, orange outlined controls, disabled gray confirm action, and an optional duplicate-stock warning. |
| E-055 | Figma `7533:256932` | `新增欄位/v2` | 375x216 form body composed of four 54px rows for stock select, stock type, total shares, and cost average. |
| E-056 | Figma `7533:257087` | `button` component set | 335x140 set with two 295x41 `確定` states: disabled gray outline/text and default orange fill/white text. |

## Anatomy

- Sheet container
- Top header
- Optional tab header
- Close icon
- Optional duplicate warning message
- Stock name search row
- Stock type segmented control
- Total share quantity row
- Stepper controls
- Cost average value row
- Unit labels
- Confirm action

## Variants

- `Default`: title `新增持股`, close icon, four form rows, and disabled `確定` action.
- `重複輸入股票`: default layout plus a duplicate warning block below the header.
- `手動編輯&圖片辨識`: tabbed header with active `手動新增`, inactive `圖片辨識`, close icon, form rows, and disabled action.
- `確定` default: orange filled action with white label.
- `確定` disabled: transparent action with gray outline and gray label.

## States

- Observed: default add, duplicate warning, tabbed manual/image-recognition mode, stable four-row form body, selected stock type `現股`, unselected `融資`/`融券`, disabled confirm action, and default/enabled confirm action.
- Not observed: selected stock value, pressed/focus-visible, loading, image-recognition tab selected, validation error per field, keyboard-open layout, scroll behavior, save success, and network/sync error.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-portfolio-add-holding-sheet-set-width` | `--cm-sys-size-portfolio-add-holding-set-width` | Component set reference width | Documentation |
| `--cm-comp-portfolio-add-holding-sheet-set-height` | `--cm-sys-size-portfolio-add-holding-set-height` | Component set reference height | Documentation |
| `--cm-comp-portfolio-add-holding-sheet-width` | `--cm-sys-size-portfolio-add-holding-width` | Sheet width | All variants |
| `--cm-comp-portfolio-add-holding-sheet-default-height` | `--cm-sys-size-portfolio-add-holding-default-height` | Default sheet height | Default |
| `--cm-comp-portfolio-add-holding-sheet-duplicate-height` | `--cm-sys-size-portfolio-add-holding-duplicate-height` | Duplicate-warning sheet height | Duplicate |
| `--cm-comp-portfolio-add-holding-sheet-tabbed-height` | `--cm-sys-size-portfolio-add-holding-default-height` | Tabbed sheet height | Manual/image |
| `--cm-comp-portfolio-add-holding-sheet-header-height` | `--cm-sys-size-portfolio-add-holding-header-height` | Header height | All variants |
| `--cm-comp-portfolio-add-holding-sheet-warning-height` | `--cm-sys-size-portfolio-add-holding-warning-height` | Warning block height | Duplicate |
| `--cm-comp-portfolio-add-holding-sheet-form-body-height` | `--cm-sys-size-portfolio-add-holding-form-body-height` | Four-row form body height | Form |
| `--cm-comp-portfolio-add-holding-sheet-form-row-height` | `--cm-sys-size-portfolio-add-holding-form-row-height` | Form row height | Form |
| `--cm-comp-portfolio-add-holding-sheet-container-color` | `--cm-sys-color-surface` | Sheet fill | All variants |
| `--cm-comp-portfolio-add-holding-sheet-header-container-color` | `--cm-sys-color-surface` | Header fill | All variants |
| `--cm-comp-portfolio-add-holding-sheet-row-container-color` | `--cm-sys-color-surface` | Form row fill | Form |
| `--cm-comp-portfolio-add-holding-sheet-title-color` | `--cm-sys-color-on-surface-strong` | Header title color | Default |
| `--cm-comp-portfolio-add-holding-sheet-label-color` | `--cm-sys-color-on-surface-strong` | Field label color | Form |
| `--cm-comp-portfolio-add-holding-sheet-placeholder-color` | `--cm-sys-color-on-surface-subtle` | Placeholder color | Empty controls |
| `--cm-comp-portfolio-add-holding-sheet-value-color` | `--cm-sys-color-on-surface-strong` | Entered value color | Form |
| `--cm-comp-portfolio-add-holding-sheet-unit-color` | `--cm-sys-color-on-surface-strong` | Unit label color | Form |
| `--cm-comp-portfolio-add-holding-sheet-warning-color` | `--cm-sys-color-portfolio-duplicate-warning` | Duplicate warning color | Duplicate |
| `--cm-comp-portfolio-add-holding-sheet-close-icon-color` | `--cm-sys-color-on-surface-muted` | Close icon color | Header |
| `--cm-comp-portfolio-add-holding-sheet-search-icon-color` | `--cm-sys-color-on-surface-strong` | Search icon color | Stock row |
| `--cm-comp-portfolio-add-holding-sheet-outline-color` | `--cm-sys-color-primary` | Control outline | Form |
| `--cm-comp-portfolio-add-holding-sheet-action-default-container-color` | `--cm-sys-color-primary` | Enabled confirm fill | Default action |
| `--cm-comp-portfolio-add-holding-sheet-action-default-label-color` | `--cm-sys-color-on-primary` | Enabled confirm label | Default action |
| `--cm-comp-portfolio-add-holding-sheet-action-disabled-container-color` | `--cm-sys-color-transparent` | Disabled confirm fill | Disabled action |
| `--cm-comp-portfolio-add-holding-sheet-disabled-outline-color` | `--cm-sys-color-disabled` | Disabled action outline | Disabled |
| `--cm-comp-portfolio-add-holding-sheet-disabled-label-color` | `--cm-sys-color-on-disabled` | Disabled action label | Disabled |
| `--cm-comp-portfolio-add-holding-sheet-segment-selected-container-color` | `--cm-sys-color-primary` | Selected stock type fill | Selected |
| `--cm-comp-portfolio-add-holding-sheet-segment-unselected-container-color` | `--cm-sys-color-transparent` | Unselected stock type fill | Default |
| `--cm-comp-portfolio-add-holding-sheet-segment-border-color` | `--cm-sys-color-primary` | Stock type border | All stock type options |
| `--cm-comp-portfolio-add-holding-sheet-segment-label-color` | `--cm-sys-color-on-primary` | Stock type label color | All stock type options |
| `--cm-comp-portfolio-add-holding-sheet-active-tab-indicator-color` | `--cm-sys-color-primary` | Active tab underline | Tabbed |
| `--cm-comp-portfolio-add-holding-sheet-inactive-tab-label-color` | `--cm-sys-color-on-surface-medium` | Inactive tab label | Tabbed |
| `--cm-comp-portfolio-add-holding-sheet-border-width` | `--cm-sys-size-control-border-width` | Outline width | Controls |
| `--cm-comp-portfolio-add-holding-sheet-header-corner-radius` | `--cm-sys-shape-corner-md` | Default top corner radius | Default/duplicate |
| `--cm-comp-portfolio-add-holding-sheet-tabbed-header-corner-radius` | `--cm-sys-shape-corner-lg` | Tabbed top corner radius | Tabbed |
| `--cm-comp-portfolio-add-holding-sheet-control-corner-radius` | `--cm-sys-shape-corner-xs` | Form control radius | Controls |
| `--cm-comp-portfolio-add-holding-sheet-title-text-size` | `--cm-sys-typescale-title-md-compact-size` | Header title size | Header |
| `--cm-comp-portfolio-add-holding-sheet-title-line-height` | `--cm-sys-typescale-title-md-compact-line-height` | Header title line height | Header |
| `--cm-comp-portfolio-add-holding-sheet-tab-label-text-size` | `--cm-sys-typescale-title-md-compact-size` | Tab label size | Tabbed |
| `--cm-comp-portfolio-add-holding-sheet-tab-label-line-height` | `--cm-sys-typescale-title-md-compact-line-height` | Tab label line height | Tabbed |
| `--cm-comp-portfolio-add-holding-sheet-field-label-text-size` | `--cm-sys-typescale-label-xl-size` | Field label size | Form |
| `--cm-comp-portfolio-add-holding-sheet-field-label-line-height` | `--cm-sys-typescale-label-xl-line-height` | Field label line height | Form |
| `--cm-comp-portfolio-add-holding-sheet-control-text-size` | `--cm-sys-typescale-label-xl-size` | Control value/placeholder size | Controls |
| `--cm-comp-portfolio-add-holding-sheet-control-line-height` | `--cm-sys-typescale-label-xl-line-height` | Control value/placeholder line height | Controls |
| `--cm-comp-portfolio-add-holding-sheet-symbol-text-size` | `--cm-sys-typescale-control-symbol-size` | Stepper symbol size | Stepper |
| `--cm-comp-portfolio-add-holding-sheet-symbol-line-height` | `--cm-sys-typescale-control-symbol-line-height` | Stepper symbol line height | Stepper |
| `--cm-comp-portfolio-add-holding-sheet-warning-text-size` | `--cm-sys-typescale-message-sm-size` | Warning text size | Duplicate |
| `--cm-comp-portfolio-add-holding-sheet-warning-line-height` | `--cm-sys-typescale-message-sm-line-height` | Warning text line height | Duplicate |
| `--cm-comp-portfolio-add-holding-sheet-action-label-text-size` | `--cm-sys-typescale-title-md-compact-size` | Confirm action label size | Action |
| `--cm-comp-portfolio-add-holding-sheet-action-label-line-height` | `--cm-sys-typescale-title-md-compact-line-height` | Confirm action label line height | Action |
| `--cm-comp-portfolio-add-holding-sheet-action-label-weight` | `--cm-sys-weight-medium` | Confirm action label weight | Action |
| `--cm-comp-portfolio-add-holding-sheet-action-set-width` | `--cm-sys-size-portfolio-add-holding-action-set-width` | Confirm action component-set width | Documentation |
| `--cm-comp-portfolio-add-holding-sheet-action-set-height` | `--cm-sys-size-portfolio-add-holding-action-set-height` | Confirm action component-set height | Documentation |
| `--cm-comp-portfolio-add-holding-sheet-action-width` | `--cm-sys-size-portfolio-add-holding-action-width` | Confirm action width | Action |
| `--cm-comp-portfolio-add-holding-sheet-action-height` | `--cm-sys-size-portfolio-add-holding-action-height` | Confirm action height | Action |
| `--cm-comp-portfolio-add-holding-sheet-bottom-padding` | `--cm-sys-spacing-container-xl` | Sheet bottom padding | Body |
| `--cm-comp-portfolio-add-holding-sheet-section-gap` | `--cm-sys-spacing-section-gap-xl` | Gap between form and confirm action | Body |
| `--cm-comp-portfolio-add-holding-sheet-action-row-padding-x` | `--cm-sys-spacing-container-xl` | Confirm row horizontal inset | Action |
| `--cm-comp-portfolio-add-holding-sheet-action-padding-x` | `--cm-sys-spacing-l` | Confirm action horizontal padding | Action |
| `--cm-comp-portfolio-add-holding-sheet-action-padding-y` | `--cm-sys-spacing-md` | Confirm action vertical padding | Action |
| `--cm-comp-portfolio-add-holding-sheet-control-padding-x` | `--cm-sys-spacing-md` | Value control horizontal padding | Controls |
| `--cm-comp-portfolio-add-holding-sheet-control-padding-y` | `--cm-sys-spacing-sm` | Value control vertical padding | Controls |
| `--cm-comp-portfolio-add-holding-sheet-segment-padding-x` | `--cm-sys-spacing-segment-control-x` | Stock type option horizontal padding | Stock type |
| `--cm-comp-portfolio-add-holding-sheet-segment-padding-y` | `--cm-sys-spacing-sm` | Stock type option vertical padding | Stock type |
| `--cm-comp-portfolio-add-holding-sheet-close-icon-size` | `--cm-sys-size-portfolio-add-holding-close-icon` | Close icon size | Header |
| `--cm-comp-portfolio-add-holding-sheet-search-icon-size` | `--cm-sys-size-portfolio-add-holding-search-icon` | Search icon size | Stock row |
| `--cm-comp-portfolio-add-holding-sheet-control-start` | `--cm-sys-size-portfolio-add-holding-control-start` | Right-side control x-position | Form |
| `--cm-comp-portfolio-add-holding-sheet-stock-select-width` | `--cm-sys-size-portfolio-add-holding-stock-select-width` | Stock select width | Stock row |
| `--cm-comp-portfolio-add-holding-sheet-quantity-width` | `--cm-sys-size-portfolio-add-holding-quantity-width` | Quantity value width | Quantity |
| `--cm-comp-portfolio-add-holding-sheet-cost-width` | `--cm-sys-size-portfolio-add-holding-cost-width` | Cost average value width | Cost |
| `--cm-comp-portfolio-add-holding-sheet-stepper-size` | `--cm-sys-size-portfolio-add-holding-stepper-size` | Stepper square size | Quantity |

## Layout Rules

- Sheet width is fixed at 375px in the observed mobile context.
- Default and tabbed variants are 385px high; duplicate-warning variant is 451px high.
- Header is 64px high. Default header uses 8px top corners; tabbed header uses 12px top corners.
- Form body is 375x216 and stacks four 54px rows.
- Form rows are 54px high with the field label at the 18px left inset.
- Right-side controls start at x=157. Stock select is 200px wide, quantity value is 101px wide, and cost average value is 177px wide.
- Quantity stepper controls are 30x30 with orange outline.
- The confirm action is 295x41 and centered with 40px visible side inset in the sheet.

## Content Rules

- Header title is `新增持股` unless the tabbed variant is used.
- Tab copy is `手動新增` and `圖片辨識`; active tab uses orange underline.
- Field labels are `股票名稱`, `種類`, `總股數`, and `成本均價`.
- Stock select placeholder is `請選擇股票`; cost placeholder is `填入成本均價`.
- Units are `股` and `元`.
- Duplicate warning copy is two lines: `已存在此檔現股，` and `請更新至最新總股數即可`.

## Accessibility Rules

- Treat the sheet as a dialog/bottom sheet with a close button and accessible title.
- The stock type segmented control should expose a single-selection group with `現股` selected by default.
- The quantity stepper needs accessible increment/decrement names and should announce the current share count.
- The disabled confirm action must be semantically disabled, not only gray.
- The enabled/default confirm action keeps the visible label `確定` as its accessible name.
- Duplicate warning text should be announced when the duplicate variant opens.

## Do / Don't

- Do keep the sheet compact and form rows exactly 54px high.
- Do keep stock type as an orange segmented control, not chips.
- Do keep the confirm action compact at 295x41.
- Do keep the disabled confirm action gray outline and gray label, and the enabled confirm action orange filled with white label.
- Don't add helper text, extra field labels, or onboarding copy without new evidence.
- Don't replace the bottom sheet with a full-page form or card stack.

## Implementation Notes

- This sheet is the evidenced follow-up for add-holding entry points. Link it from Portfolio Add Action Section rather than inventing a separate add flow.
- The `圖片辨識` tab is visible but its selected panel/content is not evidenced in this node.
