# Bottom Sheet

## Purpose

Defines reusable 375px bottom-sheet modal compositions with a scrim mask for inventory settings, nested selection lists, preview selection, multi-select watchlist assignment, and primary footer confirmation.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-067 | Figma `16405:224755` | `bottom sheet` component set | 415x1785 set with five 375px-wide variants: `設定` 375x374, `庫存股_即時損益設定` 375x310, `股票排列方式` 375x195, `Variant5`/`股票排序` 375x307, and `加入自選股` 375x495. The set composes Bottom Sheet Header, Bottom Sheet Cell, preview option cards, selectable list rows, a 5x215 scrollbar thumb, and a full-width orange `完成` action. |
| E-068 | Figma `16405:233530` | `bottom sheet` / `Variant3` preview selector | 415x161 set containing the standalone 375x119 preview selector body with two dark `#1E1E1E` options, 8px gap, 74x66 thumbnails, and a 2px orange selected outline on `條列式`. |
| E-069 | Figma `16405:224793` | `button_bottom sheet` | Standalone 339x65 footer strip with a 299x41 orange `完成` action, confirming the bottom-sheet footer action as a reusable subcomponent. |
| E-063 | Figma `16405:224712` | `bottom sheet_上方的關閉與返回` | Supplies the close-only, title/close, and back/title/close header chrome used by these variants. |
| E-064 | Figma `16405:224726` | `bottom sheet_cell` | Supplies the dense row/action language used by the settings, status, sort, switch, and watchlist rows. |
| E-078 | Figma `8134:289037` | `switch` component set | Supplies standalone Switch off/on visuals for switch rows. |
| E-079 | Figma `22911:207990` | `勾選` component set | Supplies standalone 20px checkbox/radio Selection Control visuals for selection rows. |

## Anatomy

- Modal overlay root
- Scrim mask layer
- Sheet container
- Bottom Sheet Header
- Optional gray action rows
- Optional status/navigation rows
- Optional switch rows
- Optional preview selector area
- Optional single-select or multi-select list rows
- Optional Selection Control
- Optional add-list inline action
- Optional scroll thumb
- Optional Bottom Sheet Footer Button

## Variants

- `設定`: close-only header, two gray action rows, three status/navigation rows.
- `庫存股_即時損益設定`: close-only header, two status/navigation rows, and two switch rows.
- `股票排列方式`: back/title/close header and a two-option preview selector for `方塊` and `條列式`.
- `股票排序`: back/title/close header and a single-select list with one orange check row.
- `加入自選股`: title/close header, orange `新增清單` inline action, scrollable multi-select list, and orange `完成` footer action.

## States

- Open/default sheet: observed.
- Nested back/title/close sheet: observed.
- Preview option selected/unselected: observed.
- Single-select checked row: observed.
- Multi-select selected/unselected row: observed.
- Switch on rows: observed in this and prior bottom-sheet cell evidence.
- Switch off/on visuals: now supplied by standalone Switch.
- Selection Control checkbox/radio visuals: now supplied by standalone Selection Control.
- Scrim mask layer: implemented with the shared scrim color and 0.6 state opacity.
- Pressed, focus-visible, disabled, loading, destructive action, keyboard-open, drag-to-dismiss, transition, and footer disabled states: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-bottom-sheet-set-width` | `--cm-sys-size-bottom-sheet-header-set-width` | Component set reference width | Documentation |
| `--cm-comp-bottom-sheet-set-height` | `--cm-sys-size-bottom-sheet-set-height` | Component set reference height | Documentation |
| `--cm-comp-bottom-sheet-width` | `--cm-sys-size-bottom-sheet-width` | Sheet width | All |
| `--cm-comp-bottom-sheet-settings-height` | `--cm-sys-size-bottom-sheet-height-settings` | Settings variant height | `設定` |
| `--cm-comp-bottom-sheet-realtime-settings-height` | `--cm-sys-size-bottom-sheet-height-realtime-settings` | Realtime P/L settings height | `庫存股_即時損益設定` |
| `--cm-comp-bottom-sheet-display-mode-height` | `--cm-sys-size-bottom-sheet-height-display-mode` | Preview selector sheet height | `股票排列方式` |
| `--cm-comp-bottom-sheet-sort-height` | `--cm-sys-size-bottom-sheet-height-sort` | Sort selector sheet height | `股票排序` |
| `--cm-comp-bottom-sheet-watchlist-add-height` | `--cm-sys-size-bottom-sheet-height-watchlist-add` | Watchlist add sheet height | `加入自選股` |
| `--cm-comp-bottom-sheet-preview-selector-set-height` | `--cm-sys-size-bottom-sheet-preview-selector-set-height` | Standalone preview selector reference height | Preview |
| `--cm-comp-bottom-sheet-container-color` | `--cm-sys-color-surface` | Sheet surface | All |
| `--cm-comp-bottom-sheet-preview-option-container-color` | `--cm-sys-color-canvas-deep` | Preview option tile fill | Preview |
| `--cm-comp-bottom-sheet-preview-option-selected-border-color` | `--cm-sys-color-primary` | Selected preview outline | Preview selected |
| `--cm-comp-bottom-sheet-preview-image-border-color` | `--cm-sys-color-control-outline` | Preview image border | Preview |
| `--cm-comp-bottom-sheet-mask-color` | `--cm-sys-color-scrim` | Modal mask fill behind the sheet | Overlay |
| `--cm-comp-bottom-sheet-mask-opacity` | `--cm-sys-state-opacity-annotation-medium` | Modal mask opacity behind the sheet (`0.6`) | Overlay |
| `--cm-comp-bottom-sheet-add-list-label-color` | `--cm-sys-color-primary` | Add-list label/icon color | Watchlist add |
| `--cm-comp-bottom-sheet-footer-action-container-color` | `--cm-sys-color-primary` | Footer action fill | Watchlist add |
| `--cm-comp-bottom-sheet-footer-action-label-color` | `--cm-sys-color-on-primary` | Footer action text | Watchlist add |
| `--cm-comp-bottom-sheet-scroll-thumb-color` | `--cm-sys-color-control-outline` | Scroll thumb | Watchlist add |
| `--cm-comp-bottom-sheet-selection-icon-color` | `--cm-sys-color-selection-control-selected` | Selected check/radio mark | Selection rows |
| `--cm-comp-bottom-sheet-selection-icon-neutral-color` | `--cm-sys-color-selection-control-outline` | Unselected checkbox/radio outline | Selection rows |
| `--cm-comp-bottom-sheet-preview-selector-height` | `--cm-sys-size-bottom-sheet-preview-selector-height` | Preview selector body height | Preview |
| `--cm-comp-bottom-sheet-scroll-area-height` | `--cm-sys-size-bottom-sheet-scroll-area-height` | Scrollable list viewport | Watchlist add |
| `--cm-comp-bottom-sheet-scroll-thumb-width` | `--cm-sys-size-bottom-sheet-scroll-thumb-width` | Scroll thumb width | Watchlist add |
| `--cm-comp-bottom-sheet-scroll-thumb-height` | `--cm-sys-size-bottom-sheet-scroll-thumb-height` | Scroll thumb height | Watchlist add |
| `--cm-comp-bottom-sheet-footer-action-width` | `--cm-sys-size-bottom-sheet-footer-action-width` | Footer action width | Watchlist add |
| `--cm-comp-bottom-sheet-selection-check-icon-size` | `--cm-sys-size-bottom-sheet-selection-check-icon` | Single-select check icon | Sort |
| `--cm-comp-bottom-sheet-selection-radio-icon-size` | `--cm-sys-size-bottom-sheet-selection-radio-icon` | Multi-select radio icon | Watchlist add |
| `--cm-comp-bottom-sheet-add-list-icon-size` | `--cm-sys-size-bottom-sheet-add-list-icon` | Add-list icon size | Watchlist add |
| `--cm-comp-bottom-sheet-preview-image-width` | `--cm-sys-size-selection-preview-width` | Preview image width | Preview |
| `--cm-comp-bottom-sheet-preview-image-height` | `--cm-sys-size-selection-preview-height` | Preview image height | Preview |
| `--cm-comp-bottom-sheet-preview-selector-padding-x` | `--cm-sys-spacing-xl` | Preview selector side inset | Preview |
| `--cm-comp-bottom-sheet-preview-selector-gap` | `--cm-sys-spacing-md` | Gap between preview options | Preview |
| `--cm-comp-bottom-sheet-preview-option-padding-x` | `--cm-sys-spacing-section-gap-xl` | Preview option horizontal padding | Preview |
| `--cm-comp-bottom-sheet-preview-option-padding-y` | `--cm-sys-spacing-l` | Preview option vertical padding | Preview |
| `--cm-comp-bottom-sheet-preview-option-content-gap` | `--cm-sys-spacing-md` | Preview label/image gap | Preview |
| `--cm-comp-bottom-sheet-preview-option-corner-radius` | `--cm-sys-shape-corner-md` | Preview option radius | Preview |
| `--cm-comp-bottom-sheet-preview-option-selected-border-width` | `--cm-sys-size-control-border-width-strong` | Selected preview outline width | Preview selected |
| `--cm-comp-bottom-sheet-preview-image-border-width` | `--cm-sys-size-control-border-width` | Preview image border width | Preview |
| `--cm-comp-bottom-sheet-preview-image-corner-radius` | `--cm-sys-shape-corner-xxs` | Preview image radius | Preview |
| `--cm-comp-bottom-sheet-add-list-padding-x` | `--cm-sys-spacing-xl` | Add-list side inset | Watchlist add |
| `--cm-comp-bottom-sheet-add-list-padding-top` | `--cm-sys-spacing-l` | Add-list top inset | Watchlist add |
| `--cm-comp-bottom-sheet-add-list-padding-bottom` | `--cm-sys-spacing-md` | Add-list bottom inset | Watchlist add |
| `--cm-comp-bottom-sheet-add-list-gap` | `--cm-sys-spacing-sm` | Add icon/label gap | Watchlist add |
| `--cm-comp-bottom-sheet-footer-padding-x` | `--cm-sys-spacing-xl` | Footer side inset | Watchlist add |
| `--cm-comp-bottom-sheet-footer-padding-y` | `--cm-sys-spacing-l` | Footer vertical inset | Watchlist add |
| `--cm-comp-bottom-sheet-footer-action-padding-x` | `--cm-sys-spacing-l` | Footer action horizontal padding | Watchlist add |
| `--cm-comp-bottom-sheet-footer-action-padding-y` | `--cm-sys-spacing-md` | Footer action vertical padding | Watchlist add |
| `--cm-comp-bottom-sheet-footer-action-corner-radius` | `--cm-sys-shape-corner-xs` | Footer action radius | Watchlist add |
| `--cm-comp-bottom-sheet-title-text-size` | `--cm-sys-typescale-title-md-size` | Sheet title size | Titled |
| `--cm-comp-bottom-sheet-preview-label-text-size` | `--cm-sys-typescale-message-sm-size` | Preview option label size | Preview |
| `--cm-comp-bottom-sheet-add-list-label-text-size` | `--cm-sys-typescale-label-xl-size` | Add-list label size | Watchlist add |
| `--cm-comp-bottom-sheet-footer-action-label-text-size` | `--cm-sys-typescale-title-md-size` | Footer action label size | Watchlist add |
| `--cm-comp-bottom-sheet-footer-action-label-weight` | `--cm-sys-weight-medium` | Footer action label weight | Watchlist add |

## Layout Rules

- Keep all variants 375px wide with 12px top corners.
- Render a mask layer before the sheet container whenever the Bottom Sheet appears; the sheet container must remain visually above the mask.
- Compose all headers from Bottom Sheet Header. Use close-only for first-level settings and back/title/close for nested selectors.
- Compose settings/status/switch/selection rows from Bottom Sheet Cell; compose switch visuals from Switch and checkbox/radio visuals from Selection Control. Do not duplicate cell padding, icon, divider, status text, switch geometry, or selection-control geometry inside sheet-specific variants.
- Use 365x62 gray action rows for high-priority sheet commands such as `編輯自選股 & 群組`.
- Keep preview selector sheets compact: 64px header plus 119px body with two equal dark preview tiles and an 8px gap.
- Selected preview tile uses a 2px orange outline; default preview tile uses the same `#1E1E1E` fill without the selected outline.
- Keep selectable list rows on the 58px cell rhythm. Use Selection Control for 20px checkbox/radio slots where square or round controls are required; preserve the observed 21px orange check icon when the sheet pattern is a checkmark-only sort row.
- In the watchlist add sheet, the scrollable region is 324px tall with a 5x215 right scrollbar thumb and a `Bottom Sheet Footer Button` submit action.
- Treat the 375x119 preview selector body as a subcomposition; the surrounding sheet header determines whether the full nested sheet is 195px tall.

## Content Rules

- Sheet labels are short Traditional Chinese operational commands.
- Right-side status values such as `條列式`, `一週期`, and `依漲跌幅` are current selections, not helper copy.
- Preview thumbnails are product-state previews. Do not replace them with decorative illustrations.
- `新增清單` is an inline add command inside the sheet body, not a large secondary CTA.
- The footer `完成` action is submission copy, not navigation copy.

## Accessibility Rules

- Treat the sheet as a modal dialog or platform bottom sheet.
- The mask is decorative when no close handler is available; when it is dismissible, it must expose an accessible close label and call the same close behavior as the header close action.
- Use the visible title as the dialog title when a title is present.
- Selection rows must expose selected/unselected state.
- Switch rows must expose the Switch state and row label as one coherent control.
- Selection Control rows must expose checkbox or radio state using the row label as the accessible name.
- The `Bottom Sheet Footer Button` should be the primary submit action for the multi-select sheet.

## Do / Don't

- Do compose from Bottom Sheet Header and Bottom Sheet Cell.
- Do keep nested selector sheets compact and row-led.
- Do keep preview images as small inspection aids.
- Do reuse `Bottom Sheet Footer Button` for selection-submission sheets.
- Don't turn these sheets into full-screen settings pages, card stacks, or onboarding panels.
- Don't create sheet-specific switch artwork or disabled switch states; use Switch and wait for future evidence for disabled/loading/focus behavior.
- Don't create sheet-specific checkbox/radio artwork or disabled selection-control states; use Selection Control and wait for future evidence for disabled/loading/focus behavior.

## Implementation Notes

This component is a composite pattern. Product-specific sheets can choose a variant and content set, but should keep the shared header, cell, preview selector, Selection Control, selection row, scrollbar, and footer button contracts intact.
