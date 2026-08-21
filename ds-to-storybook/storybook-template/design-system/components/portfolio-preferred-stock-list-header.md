# Portfolio Preferred Stock List Header

## Purpose

Defines the six-column contract for preferred-stock metric rows.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-036 | Figma `29209:171392` | `庫存股/持股速配/偏好的股票/表頭列表` | 375x34 header with stock, three metric columns, feature column, and watchlist action column. |

## Anatomy

- Header container
- Stock column label
- Dividend-years column label and sort control
- Yield column label and sort control
- Volatility column label and sort control
- Feature column label and sort control
- Watchlist action column label

## Variants

- Default sortable header: observed.
- Active sort ascending/descending: not observed.

## States

- Default: observed.
- Active sort, pressed/focus-visible, horizontal overflow: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-portfolio-preferred-stock-list-header-container-color` | `--cm-sys-color-surface-raised` | Header background | Default |
| `--cm-comp-portfolio-preferred-stock-list-header-width` | `--cm-sys-size-viewport-compact-width` | Header width | Default |
| `--cm-comp-portfolio-preferred-stock-list-header-height` | `--cm-sys-size-portfolio-preferred-list-header-height` | Header height | Default |
| `--cm-comp-portfolio-preferred-stock-list-header-padding-x` | `--cm-sys-spacing-md` | Horizontal padding | Default |
| `--cm-comp-portfolio-preferred-stock-list-header-gap` | `--cm-sys-spacing-xs` | Column gap | Default |
| `--cm-comp-portfolio-preferred-stock-list-header-label-color` | `--cm-sys-color-on-surface-muted` | Header label color | Default |
| `--cm-comp-portfolio-preferred-stock-list-header-label-text-size` | `--cm-sys-typescale-caption-sm-size` | Header label size | Default |
| `--cm-comp-portfolio-preferred-stock-list-header-label-line-height` | `--cm-sys-typescale-metric-sm-line-height` | Header label line height | Default |
| `--cm-comp-portfolio-preferred-stock-list-header-stock-column-width` | `--cm-sys-size-portfolio-preferred-column-stock` | Stock column width | Default |
| `--cm-comp-portfolio-preferred-stock-list-header-dividend-years-column-width` | `--cm-sys-size-portfolio-preferred-column-dividend-years` | Dividend-years column width | Default |
| `--cm-comp-portfolio-preferred-stock-list-header-yield-column-width` | `--cm-sys-size-portfolio-preferred-column-yield` | Yield column width | Default |
| `--cm-comp-portfolio-preferred-stock-list-header-volatility-column-width` | `--cm-sys-size-portfolio-preferred-column-volatility` | Volatility column width | Default |
| `--cm-comp-portfolio-preferred-stock-list-header-feature-column-width` | `--cm-sys-size-portfolio-preferred-column-feature` | Feature column width | Default |
| `--cm-comp-portfolio-preferred-stock-list-header-action-column-width` | `--cm-sys-size-portfolio-preferred-column-action` | Watchlist column width | Default |
| `--cm-comp-portfolio-preferred-stock-list-header-sort-control-width` | `--cm-sys-size-analytics-sort-control-width` | Sort control width | Default |
| `--cm-comp-portfolio-preferred-stock-list-header-sort-control-height` | `--cm-sys-size-analytics-sort-control-height` | Sort control height | Default |
| `--cm-comp-portfolio-preferred-stock-list-header-sort-triangle-width` | `--cm-sys-size-analytics-sort-triangle-width` | Sort triangle width | Default |
| `--cm-comp-portfolio-preferred-stock-list-header-sort-triangle-height` | `--cm-sys-size-analytics-sort-triangle-height` | Sort triangle height | Default |
| `--cm-comp-portfolio-preferred-stock-list-header-sort-triangle-gap` | `--cm-sys-spacing-xxs-plus` | Sort triangle vertical gap, matching `portfolio-fit-list-header` | Default |

## Layout Rules

- Header is 375x34 with 8px horizontal padding.
- Use 4px gaps between columns.
- Column widths are 80, 62, 62, 62, 46, and 27px.
- Multi-line labels are allowed for metric columns; keep each label 12px / 18px.
- Sort indicators reuse the hollow up/down triangle icon geometry from `portfolio-fit-list-header`.
- Do not add row dividers inside the header.

## Content Rules

- Observed labels are `股票`, `連續配息N年`, `平均殖利率`, `年化波動率`, `存股特徵`, and `加入自選`.
- Default two-line labels split as `連續`/`配息N年`, `平均`/`殖利率`, `年化`/`波動率`, `存股`/`特徵`, and `加入`/`自選`.
- Keep labels terse and muted.
- Export each label as one text container, using an internal newline for the two-line labels; do not split each visual line into separate text nodes. The label text layer should fill its container; the stock column aligns left and the remaining columns align right.

## Accessibility Rules

- Sortable columns need accessible sort labels and direction when implemented.
- The final action column should describe the row action in the row as well, not only in the header.

## Do / Don't

- Do keep the header aligned to `Portfolio Preferred Stock Row`.
- Don't widen columns independently without changing the shared system column tokens.
