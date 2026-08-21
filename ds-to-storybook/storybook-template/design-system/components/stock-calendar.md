# Stock Calendar

## Purpose

Shows a month-level stock return calendar for scanning daily return amount, return rate, no-market days, empty outside-month cells, and weekly gain/loss summaries. Use it for market-return calendar views, not event lists or generic date pickers.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-089 | Figma `51054:298722` | `stock-calendar` symbol | 375x550 return calendar on `#252525` with title `報酬日曆`, month selector `2026/01 報酬`, right metric label `報酬率`, monthly summary row, five weekday columns plus `週損益`, 57x62 cells, 3px column gaps, 4px row gaps, 8px cell radius, empty `#333333` outlines, no-market `#333333` fill, red/green translucent market fills, weekly summary cells, Roboto 12px numeric text, and compact text shadow. |
| E-093 | Figma `46882:50259` | `日曆小格子` | Standalone cell component set with 57x62 empty, red/up, green/down, zero/break-even, and no-market cells. Selected red/green cells add market-color borders without changing fill opacity; selected zero/no-market cells add white borders. |

## Component Fingerprint

| Dimension | Fingerprint |
|---|---|
| Purpose / behavior | Market-return month view for scanning realized daily and weekly stock returns. It is not a date label, event table, event calendar control, generic calendar grid, or dashboard heatmap. |
| Anatomy | Container, title row, info icon, month selector, chevron, monthly summary values, weekday header row, Stock Calendar Cell day cells, empty outside-month cells, no-market cells, weekly summary column, and week-number corner badge. |
| Variants / states | Daily up, daily down, zero/break-even, selected red/green/zero/no-market cells, highlighted/high-intensity up, no-market, empty outside-month, weekly up summary, and weekly down summary are observed. Month picker expanded, info tooltip, focus, pressed, empty selected, holidays, weekend columns, loading, error, and alternate month lengths are not shown. |
| Token contract summary | 375x550 dark module, 16px side/header padding, 57x62 Stock Calendar Cell geometry, 49px cell content width, 17x19 weekly badge, 3px column gap, 4px row gap, 8px radii, red-up and green-down translucent market washes, selected cell borders, normalized `#414141` zero/weekly roles, and Roboto 12px numeric cell text. |
| Layout / density | Fixed compact mobile module with five trading-day columns and one weekly summary column. No Saturday/Sunday columns are evidenced in this source. |
| Visual reference | Figma node preview `figma:vSr4NtEwPVs6wLpqCT5PtV#51054:298722`; get_screenshot captured 2026-06-16. |
| Similar components reviewed | Relative Date Label, Event Table Row, Return Today Button, and implementation-derived generic Calendar Header/Grid tokens. Decision: keep distinct because Stock Calendar owns market-return cells, weekly summaries, and month-level return structure. |

## Anatomy

- Container
- Title row with info icon
- Month selector with chevron
- Monthly summary values
- Weekday header labels
- Trading-day return cells
- Empty outside-month cells
- No-market cells
- Stock Calendar Cell subcomponent
- Weekly summary cells
- Weekly corner badge

## Variants

- Daily up cell: translucent red market-up wash with date, signed amount, and signed rate.
- Daily down cell: translucent green market-down wash with date, signed amount, and signed rate.
- Zero/break-even cell: normalized neutral `#414141` fill with date, `0.0`, and `0%`.
- Selected day cells: red and green selected cells keep their 30% market wash and add a 1px market-color border; zero and no-market selected cells add a 1px white border.
- Highlighted/high-intensity up cell: stronger translucent red wash, observed on day `7`; this proves a visual intensity slot but does not prove selection behavior.
- No-market cell: `#333333` fill, muted date, and dash amount/rate values.
- Empty outside-month cell: transparent/dark cell with `#333333` outline only.
- Weekly summary up: normalized `#414141` outline/corner badge with red signed weekly amount and muted rate.
- Weekly summary down: same weekly cell structure with green signed weekly amount and muted rate.

## States

- Default month module: observed.
- Up, down, zero/break-even, selected red, selected green, selected zero, selected no-market, highlighted/high-intensity up, no-market, empty, weekly up, and weekly down cell states: observed.
- Month picker expanded, info tooltip, empty selected, focus-visible, pressed, hover, loading, error, full empty month, weekend/holiday handling, and alternate month-length examples: not observed and not inferred.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-stock-calendar-width` | `--cm-sys-size-viewport-compact-width` | Calendar module width | All |
| `--cm-comp-stock-calendar-height` | `--cm-sys-size-stock-calendar-height` | Calendar module height | All |
| `--cm-comp-stock-calendar-container-color` | `--cm-sys-color-surface` | Module surface | All |
| `--cm-comp-stock-calendar-title-color` | `--cm-sys-color-on-surface-strong` | Title label | Default |
| `--cm-comp-stock-calendar-info-icon-color` | `--cm-sys-color-on-surface-muted` | Info icon | Default |
| `--cm-comp-stock-calendar-month-label-color` | `--cm-sys-color-on-surface-strong` | Month selector label | Default |
| `--cm-comp-stock-calendar-chevron-color` | `--cm-sys-color-on-surface-strong` | Month selector chevron | Default |
| `--cm-comp-stock-calendar-column-label-color` | `--cm-sys-color-on-surface-medium` | Weekday and `週損益` headers | Default |
| `--cm-comp-stock-calendar-summary-value-color` | `--cm-sys-color-on-surface-strong` | Monthly summary amount/rate | Default |
| `--cm-comp-stock-calendar-cell-empty-border-color` | `--cm-sys-color-outline-low` | Empty outside-month cell outline | Empty |
| `--cm-comp-stock-calendar-cell-no-market-container-color` | `--cm-sys-color-surface-raised` | No-market cell fill | No market |
| `--cm-comp-stock-calendar-cell-no-market-selected-border-color` | `--cm-sys-color-on-surface-strong` | No-market selected outline | Selected no market |
| `--cm-comp-stock-calendar-cell-zero-container-color` | `--cm-sys-color-market-flat-container` | Break-even/zero return fill | Zero |
| `--cm-comp-stock-calendar-cell-zero-selected-border-color` | `--cm-sys-color-on-surface-strong` | Zero selected outline | Selected zero |
| `--cm-comp-stock-calendar-cell-up-container-color` | `--cm-sys-color-market-up-wash` | Daily up cell wash | Up |
| `--cm-comp-stock-calendar-cell-up-selected-container-color` | `--cm-sys-color-market-up-wash-strong` | Highlighted/high-intensity daily up wash | Highlighted up |
| `--cm-comp-stock-calendar-cell-up-highlighted-container-color` | `--cm-sys-color-market-up-wash-strong` | Explicit high-intensity up fill alias | Highlighted up |
| `--cm-comp-stock-calendar-cell-up-selected-border-color` | `--cm-sys-color-market-up` | Daily up selected outline | Selected up |
| `--cm-comp-stock-calendar-cell-down-container-color` | `--cm-sys-color-market-down-wash-translucent` | Daily down cell wash | Down |
| `--cm-comp-stock-calendar-cell-down-selected-border-color` | `--cm-sys-color-market-down` | Daily down selected outline | Selected down |
| `--cm-comp-stock-calendar-cell-date-color` | `--cm-sys-color-on-surface-medium` | Day number | Day cells |
| `--cm-comp-stock-calendar-cell-value-color` | `--cm-sys-color-on-surface-strong` | Daily amount text | Day cells |
| `--cm-comp-stock-calendar-cell-rate-color` | `--cm-sys-color-on-surface-medium` | Daily rate text | Day cells |
| `--cm-comp-stock-calendar-week-cell-border-color` | `--cm-sys-color-outline-middle` | Weekly summary outline | Weekly |
| `--cm-comp-stock-calendar-week-cell-corner-color` | `--cm-sys-color-outline-middle` | Weekly corner badge fill | Weekly |
| `--cm-comp-stock-calendar-week-up-color` | `--cm-sys-color-market-up` | Weekly positive amount | Weekly up |
| `--cm-comp-stock-calendar-week-down-color` | `--cm-sys-color-market-down` | Weekly negative amount | Weekly down |
| `--cm-comp-stock-calendar-week-rate-color` | `--cm-sys-color-on-surface-medium` | Weekly rate text | Weekly |
| `--cm-comp-stock-calendar-week-number-color` | `--cm-sys-color-on-surface-strong` | Weekly badge number | Weekly |
| `--cm-comp-stock-calendar-section-padding-x` | `--cm-sys-spacing-screen-gutter` | Title/summary horizontal inset | All |
| `--cm-comp-stock-calendar-title-padding-top` | `--cm-sys-spacing-screen-gutter` | Title top inset | All |
| `--cm-comp-stock-calendar-title-padding-bottom` | `--cm-sys-spacing-md` | Title bottom inset | All |
| `--cm-comp-stock-calendar-title-gap` | `--cm-sys-spacing-md` | Title/info icon gap | All |
| `--cm-comp-stock-calendar-month-row-padding-x` | `--cm-sys-spacing-screen-gutter` | Month row horizontal inset | All |
| `--cm-comp-stock-calendar-month-row-padding-y` | `--cm-sys-spacing-l` | Month row vertical inset | All |
| `--cm-comp-stock-calendar-month-control-gap` | `--cm-sys-spacing-xs` | Month label/chevron gap | All |
| `--cm-comp-stock-calendar-summary-row-padding-x` | `--cm-sys-spacing-screen-gutter` | Summary row horizontal inset | All |
| `--cm-comp-stock-calendar-summary-row-padding-y` | `--cm-sys-spacing-md` | Summary row vertical inset | All |
| `--cm-comp-stock-calendar-summary-row-gap` | `--cm-sys-spacing-l` | Summary label/value grouping gap | All |
| `--cm-comp-stock-calendar-grid-row-gap` | `--cm-sys-spacing-xs` | Calendar row gap | Grid |
| `--cm-comp-stock-calendar-grid-column-gap` | `--cm-sys-spacing-xxs-plus` | Calendar column gap | Grid |
| `--cm-comp-stock-calendar-grid-row-padding-x` | `--cm-sys-spacing-xs` | Calendar row side inset | Grid |
| `--cm-comp-stock-calendar-weekday-padding-x` | `--cm-sys-spacing-m` | Header label horizontal inset | Header |
| `--cm-comp-stock-calendar-weekday-padding-y` | `--cm-sys-spacing-md` | Header label vertical inset | Header |
| `--cm-comp-stock-calendar-cell-width` | `--cm-sys-size-stock-calendar-cell-width` | Day and weekly cell width | Cells |
| `--cm-comp-stock-calendar-cell-height` | `--cm-sys-size-stock-calendar-cell-height` | Day and weekly cell height | Cells |
| `--cm-comp-stock-calendar-cell-content-width` | `--cm-sys-size-stock-calendar-cell-content-width` | Inner numeric text width | Cells |
| `--cm-comp-stock-calendar-cell-corner-radius` | `--cm-sys-shape-corner-md` | Cell radius | Cells |
| `--cm-comp-stock-calendar-cell-border-width` | `--cm-sys-size-control-border-width` | Empty/weekly outline width | Empty / weekly |
| `--cm-comp-stock-calendar-cell-content-inset-x` | `--cm-sys-spacing-xs` | Cell content horizontal inset | Cells |
| `--cm-comp-stock-calendar-cell-date-inset-top` | `--cm-sys-spacing-xs` | Day number top inset | Cells |
| `--cm-comp-stock-calendar-cell-content-inset-top` | `--cm-sys-size-control-height-slim` | Amount/rate stack top offset | Cells |
| `--cm-comp-stock-calendar-week-badge-width` | `--cm-sys-size-stock-calendar-week-badge-width` | Weekly corner badge width | Weekly |
| `--cm-comp-stock-calendar-week-badge-height` | `--cm-sys-size-stock-calendar-week-badge-height` | Weekly corner badge height | Weekly |
| `--cm-comp-stock-calendar-week-badge-corner-radius` | `--cm-sys-shape-corner-md` | Weekly corner badge radius | Weekly |
| `--cm-comp-stock-calendar-info-icon-size` | `--cm-sys-size-icon-xs` | Info icon size | Default |
| `--cm-comp-stock-calendar-chevron-size` | `--cm-sys-size-icon-sm` | Month chevron size | Default |
| `--cm-comp-stock-calendar-title-text-size` | `--cm-sys-typescale-title-md-size` | Title size | Default |
| `--cm-comp-stock-calendar-title-line-height` | `--cm-sys-typescale-table-header-line-height` | Title line height | Default |
| `--cm-comp-stock-calendar-title-weight` | `--cm-sys-weight-semibold` | Title weight | Default |
| `--cm-comp-stock-calendar-month-label-text-size` | `--cm-sys-typescale-label-xl-size` | Month selector size | Default |
| `--cm-comp-stock-calendar-month-label-line-height` | `--cm-sys-typescale-table-header-line-height` | Month selector line height | Default |
| `--cm-comp-stock-calendar-month-label-weight` | `--cm-sys-weight-semibold` | Month selector weight | Default |
| `--cm-comp-stock-calendar-column-label-text-size` | `--cm-sys-typescale-label-md-size` | Column header size | Header |
| `--cm-comp-stock-calendar-column-label-line-height` | `--cm-sys-typescale-table-header-line-height` | Column header line height | Header |
| `--cm-comp-stock-calendar-column-label-weight` | `--cm-sys-weight-semibold` | Column header weight | Header |
| `--cm-comp-stock-calendar-summary-value-text-size` | `--cm-sys-typescale-title-md-size` | Monthly summary value size | Summary |
| `--cm-comp-stock-calendar-summary-value-line-height` | `--cm-sys-typescale-table-header-line-height` | Monthly summary value line height | Summary |
| `--cm-comp-stock-calendar-summary-value-weight` | `--cm-sys-weight-medium` | Monthly summary value weight | Summary |
| `--cm-comp-stock-calendar-cell-typeface` | `--cm-sys-typeface-calendar-numeric` | Numeric cell typeface | Cells |
| `--cm-comp-stock-calendar-cell-text-size` | `--cm-sys-typescale-metadata-sm-size` | Cell numeric text size | Cells |
| `--cm-comp-stock-calendar-cell-line-height` | `--cm-sys-typescale-metadata-sm-line-height` | Cell numeric line height | Cells |
| `--cm-comp-stock-calendar-cell-date-weight` | `--cm-sys-weight-bold` | Day number weight | Day cells |
| `--cm-comp-stock-calendar-cell-day-number-weight` | `--cm-sys-weight-regular` | Default standalone cell day-number weight | Stock Calendar Cell |
| `--cm-comp-stock-calendar-cell-no-market-date-weight` | `--cm-sys-weight-regular` | No-market day number weight | No market |
| `--cm-comp-stock-calendar-cell-value-weight` | `--cm-sys-weight-semibold` | Amount weight | Cells |
| `--cm-comp-stock-calendar-cell-rate-weight` | `--cm-sys-weight-bold` | Rate weight | Cells |
| `--cm-comp-stock-calendar-cell-rate-default-weight` | `--cm-sys-weight-regular` | Default standalone cell rate weight | Stock Calendar Cell |
| `--cm-comp-stock-calendar-cell-zero-selected-date-weight` | `--cm-sys-weight-bold` | Selected zero day-number emphasis | Selected zero |
| `--cm-comp-stock-calendar-cell-zero-selected-rate-weight` | `--cm-sys-weight-bold` | Selected zero rate emphasis | Selected zero |
| `--cm-comp-stock-calendar-cell-text-shadow` | `--cm-sys-shadow-calendar-cell-text` | Compact green-tinted text shadow | Cells |

## Layout Rules

- Keep the module 375x550 on `#252525`.
- Use 16px side padding for title, month selector, and summary rows.
- Put `報酬日曆` at the top with a 16px info icon.
- Use `YYYY/MM 報酬` plus a 20px chevron for the month selector.
- The grid contains five weekday columns (`一` to `五`) and one weekly summary column (`週損益`).
- Use 57x62 cells with 3px column gaps, 4px row gaps, 4px row side inset, and 8px radius.
- Compose daily day cells from Stock Calendar Cell for empty, red/up, green/down, zero/break-even, no-market, and selected states.
- Keep the weekly summary column the same 57x62 cell size as day cells.
- Do not add Saturday/Sunday columns, full-week calendar behavior, or generic date-picker layout without a new source.

## Content Rules

- Preserve Taiwan market color semantics: red means positive/up return, green means negative/down return.
- Use signed daily values such as `+3,625`, `+0.12%`, `-728`, and `-0.03%`.
- Use `0.0` and `0%` for zero/break-even cells.
- Weekly summary amounts may compact large values such as `+14.1K`.
- No-market cells should expose the no-market status in accessibility labels; the standalone cell set shows visible dash amount/rate values (`-` and `-%`).
- Empty outside-month cells are structural blanks and should not carry placeholder copy.

## Accessibility Rules

- Use table or grid semantics when the calendar is interactive or navigable; otherwise expose it as a labeled section plus readable cell groups.
- Month selector must be a real button if it opens a picker, with an accessible name matching the visible month and metric.
- Info icon needs an accessible label when interactive.
- Daily cell names should include date, selected state, amount, rate, zero/break-even status, and no-market status when present.
- Weekly summary cells should announce week number, gain/loss amount, and rate.
- Do not rely on red/green alone; keep signed values available to assistive technology.

## Do / Don't

- Do use Stock Calendar for monthly return scanning.
- Do keep market up/down washes separate from generic success/error states.
- Do express selected Stock Calendar Cell state as a 1px outline, not a filled orange selection state.
- Do keep no-market and empty outside-month cells visually different.
- Don't reuse Relative Date Label, Event Table Row, Return Today Button, or generic Calendar Grid tokens to represent the full return calendar.
- Don't add weekends, holidays, selectable date affordances, event dots, large heatmap legends, card stacks, or dashboard copy without Figma evidence.

## Implementation Notes

Generic `calendar-header` and `calendar-grid` component tokens already exist in CSS as implementation-derived primitives. Use `--cm-comp-stock-calendar-*` for this evidenced market-return module so market washes, weekly summary cells, and Roboto numeric text do not inherit generic success/error calendar semantics.

The observed weekly border/corner value `#414141` is normalized to the established `--cm-ref-color-neutral-24` / `--cm-sys-color-outline-middle` family. The Figma text shadow `0 0.907px 3.627px rgba(28, 88, 66, 0.45)` is normalized to `0 1px 4px rgba(28, 88, 66, 0.45)`.

Figma node `46882:50259` formalizes the `日曆小格子` cell set. It confirms that selected red/green cells keep the same 30% wash and add only a 1px market-color outline. The stronger red wash observed in `E-089` remains a high-intensity calendar highlight, not the selected cell state.

## Storybook Implementation

- Product component: `src/components/stock-calendar/StockCalendar.tsx`
- Storybook file: `src/components/stock-calendar/StockCalendar.stories.tsx`
- Story title: `Components/Market Data/Stock Calendar`
- Story IDs: `components-market-data-stock-calendar--default`, `components-market-data-stock-calendar--observed-states`
- Source URL: `https://www.figma.com/design/vSr4NtEwPVs6wLpqCT5PtV/%E7%B1%8C%E7%A2%BC-K-%E7%B7%9A-ChipK--Design-System-Lab-?node-id=51054-298722&t=buNo31ra500KKh9O-1`
- Dependencies: shared `Icon` for the info glyph and month chevron.
- Verification: `npm run check`, `npm run storybook:build`, and headless Chrome CDP smoke passed on 2026-06-16. Extractor source/component strict audits passed; token strict audit remains blocked by the existing near-token review backlog tracked in `docs/design-system/review.html`.
