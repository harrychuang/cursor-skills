# Event Filter Sheet

## Purpose

Presents a bottom sheet for selecting one or more major stock-event categories.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-029 | Figma `19215:187371` | `重大事件篩選` bottom sheet | 375x457 sheet with 64px header, 393px body, 12px top corners, centered title, close icon, and event option grid. |
| E-028 | Figma `19215:187453` | `一個選項` component set | The sheet composes event filter options with default and selected states. |

## Anatomy

- Sheet container
- Header
- Title
- Close icon
- Body
- Event filter option grid
- Event filter option

## Variants

- Open sheet with selected categories: observed.
- Empty/no selection, apply/reset footer, and long-list scrolling variants: not observed.

## States

- Sheet open: observed.
- Option default: observed.
- Option selected: observed.
- Close pressed/focus-visible, backdrop, scroll, apply/reset, loading, and disabled states: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-event-filter-sheet-container-color` | `--cm-sys-color-surface` | Sheet fill | Open |
| `--cm-comp-event-filter-sheet-width` | `--cm-sys-size-bottom-sheet-width` | Sheet width | Open |
| `--cm-comp-event-filter-sheet-height` | `--cm-sys-size-bottom-sheet-height-event-filter` | Sheet height | Open |
| `--cm-comp-event-filter-sheet-header-height` | `--cm-sys-size-bottom-sheet-header-height` | Header height | Open |
| `--cm-comp-event-filter-sheet-body-height` | `--cm-sys-size-bottom-sheet-body-height-event-filter` | Body height | Open |
| `--cm-comp-event-filter-sheet-top-corner-radius` | `--cm-sys-shape-corner-lg` | Top sheet radius | Open |
| `--cm-comp-event-filter-sheet-title-width` | `--cm-sys-size-bottom-sheet-title-width` | Center title width | Open |
| `--cm-comp-event-filter-sheet-title-color` | `--cm-sys-color-on-surface-medium` | Title color | Open |
| `--cm-comp-event-filter-sheet-title-text-size` | `--cm-sys-typescale-date-md-size` | Title size | Open |
| `--cm-comp-event-filter-sheet-title-line-height` | `--cm-sys-typescale-date-md-line-height` | Title line height | Open |
| `--cm-comp-event-filter-sheet-close-icon-size` | `--cm-sys-size-icon-xs` | Close icon size | Open |
| `--cm-comp-event-filter-sheet-close-icon-color` | `--cm-sys-color-on-surface-medium` | Close icon color | Open |
| `--cm-comp-event-filter-sheet-option-width` | `--cm-sys-size-selection-option-width-md` | Option grid cell width | Open |
| `--cm-comp-event-filter-sheet-option-height` | `--cm-sys-size-selection-option-height` | Option grid cell height | Open |
| `--cm-comp-event-filter-sheet-option-padding` | `--cm-sys-spacing-m` | Option padding | Open |
| `--cm-comp-event-filter-sheet-option-row-gap` | `--cm-sys-spacing-l` | Option row gap | Open |
| `--cm-comp-event-filter-sheet-option-column-gap` | `--cm-sys-spacing-l` | Option column gap | Open |
| `--cm-comp-event-filter-sheet-content-inset-x` | `--cm-sys-size-bottom-sheet-content-inset-x` | Grid side inset | Open |

## Layout Rules

- Use a 375x457 bottom sheet.
- Header is 64px high with the title centered and the close icon at the right.
- Use 12px top-left and top-right corners.
- Body height is 393px.
- Body content starts 20px below the header.
- `全部` is an auto-width option that occupies the first row.
- Remaining event options use a compact 3-column grid with mostly 100x42 cells.
- Preserve 26px side inset, 12px grid gaps, and the larger 32px visual gap between `全部` and the first 3-column row.

## Content Rules

- Title is `重大事件篩選`.
- Observed options include `全部`, `月營收公告`, `季財報公告`, `年財報公告`, `股利公告日`, `除權息日`, `股利發放日`, `股東會`, `法說會`, `申報轉讓`, `增資新股`, `處置開始`, `處置結束`, and `庫藏股決議`.
- Selected options are shown as orange filled cells.
- Do not infer apply/reset button copy; no footer actions are visible.

## Accessibility Rules

- Treat the sheet as a modal or bottom-sheet dialog in implementation.
- The close icon needs an accessible label such as `關閉`.
- Each event option should expose selected state.
- If the sheet supports multi-select, communicate the selected count in the trigger or sheet context.

## Do / Don't

- Do keep the sheet compact and bottom-aligned.
- Do compose it from `Event Filter Option`.
- Don't turn it into a full-screen settings page.
- Don't add search, explanatory copy, or footer actions without future evidence.

## Implementation Notes

The screenshot shows `股利公告日` and `除權息日` selected. This evidence defines visual selected treatment, not business rules for how many event categories can be selected.
