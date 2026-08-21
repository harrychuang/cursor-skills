# Quote List Column Header

## Purpose

Provides a compact sortable header aligned to Realtime Quote Row columns for stock name, price, change, and inline trend chart.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| implementation-derived | `src/components/quote-list-column-header/QuoteListColumnHeader.tsx` and `QuoteListColumnHeader.stories.tsx` | Realtime quote list header | Created from product implementation. It corresponds to the inventory "Column Header Row" need, but requires review against source evidence before being treated as extracted. |

## Anatomy

- Root header group.
- Stock sortable column.
- Price sortable column.
- Change sortable column.
- Trend static column.
- Sort indicator with ascending and descending triangles.

## Variants

- Default unsorted header.
- Stock ascending.
- Price descending.
- Custom labels through `labels`.

## States

- Default: implemented.
- Active sorted column: implemented through `sortColumn` and `sortDirection`.
- Focus-visible: implemented for sortable header buttons.
- Hover, pressed, disabled, loading, and error states: not documented by source evidence.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-quote-list-column-header-width` | `--cm-sys-size-viewport-compact-width` | Header width | Default |
| `--cm-comp-quote-list-column-header-height` | `--cm-sys-size-region-subheader-height` | Header height | Default |
| `--cm-comp-quote-list-column-header-container-color` | `--cm-sys-color-surface-raised` | Header background | Default |
| `--cm-comp-quote-list-column-header-label-color` | `--cm-sys-color-on-surface-muted` | Default label color | Default |
| `--cm-comp-quote-list-column-header-active-label-color` | `--cm-sys-color-on-surface-medium` | Active sorted label color | Active |
| `--cm-comp-quote-list-column-header-padding-x` | `--cm-sys-spacing-screen-gutter` | Horizontal padding | Default |
| `--cm-comp-quote-list-column-header-data-column-width` | `--cm-sys-size-data-column-md` | Price and change column width | Default |
| `--cm-comp-quote-list-column-header-chart-column-width` | `--cm-sys-size-chart-inline-width` | Trend column width | Default |
| `--cm-comp-quote-list-column-header-label-text-size` | `--cm-sys-typescale-table-header-size` | Label text size | Default |
| `--cm-comp-quote-list-column-header-label-line-height` | `--cm-sys-typescale-table-header-line-height` | Label line height | Default |

## Layout Rules

- Keep the 375px compact viewport width and align columns to Realtime Quote Row.
- Stock column flexes; price and change columns use fixed data widths.
- Trend column reserves the inline chart width.
- Labels stay single-line and clipped rather than wrapping.

## Content Rules

- Default labels are `庫存股`, `股價`, `漲跌幅`, and `即時走勢`.
- Only stock, price, and change are sortable.
- Sort direction toggles between ascending and descending.

## Accessibility Rules

- Root uses a group label describing the quote-list header.
- Sortable labels expose `ascending`, `descending`, or unsorted text through `aria-label`.
- Focus-visible outline must remain visible on sortable buttons.

## Do / Don't

- Do pair this header with Realtime Quote Row.
- Do use `labels` for product copy overrides.
- Don't use this as a generic table header unless the row columns match the quote-list layout.

## Implementation Notes

Provenance: `implementation-derived`, `needs-review`.

Storybook: `Components/Market Data/Quote List Column Header`.
