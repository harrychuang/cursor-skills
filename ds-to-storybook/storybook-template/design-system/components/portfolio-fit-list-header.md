# Portfolio Fit List Header

## Purpose

Labels and aligns the four columns used by portfolio fit stock rows.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-017 | Figma `29208:159790` | `庫存股/持股分析/速配度/表頭` | 375x34 header with four columns and muted labels. |

## Anatomy

- Container
- Stock column label
- Sort control
- Fit assessment column label
- Info icon
- Attribute feature column label
- Value/market-value column label

## Variants

- Default header.
- Sortable column: observed by stacked chevrons on stock and value columns.
- Informational column: observed by info icon on fit assessment and attribute columns.

## States

- Default: observed.
- Sort active ascending/descending: not observed.
- Info tooltip open: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-portfolio-fit-list-header-container-color` | `--cm-sys-color-surface-raised` | Header background | Default |
| `--cm-comp-portfolio-fit-list-header-width` | `--cm-sys-size-viewport-compact-width` | Header width | Default |
| `--cm-comp-portfolio-fit-list-header-height` | `--cm-sys-size-analytics-list-header-height` | Header height | Default |
| `--cm-comp-portfolio-fit-list-header-padding-x` | `--cm-sys-spacing-md` | Horizontal inset | Default |
| `--cm-comp-portfolio-fit-list-header-gap` | `--cm-sys-spacing-xs` | Column/content gap | Default |
| `--cm-comp-portfolio-fit-list-header-label-color` | `--cm-sys-color-on-surface-muted` | Header text | Default |
| `--cm-comp-portfolio-fit-list-header-label-text-size` | `--cm-sys-typescale-caption-sm-size` | Header text size | Default |
| `--cm-comp-portfolio-fit-list-header-label-line-height` | `--cm-sys-typescale-metric-sm-line-height` | Header line height | Default |
| `--cm-comp-portfolio-fit-list-header-info-icon-size` | `--cm-sys-size-icon-info` | Info icon size | Default |
| `--cm-comp-portfolio-fit-list-header-sort-control-width` | `--cm-sys-size-analytics-sort-control-width` | Sort control width | Default |
| `--cm-comp-portfolio-fit-list-header-sort-control-height` | `--cm-sys-size-analytics-sort-control-height` | Sort control height | Default |
| `--cm-comp-portfolio-fit-list-header-sort-triangle-gap` | `--cm-sys-spacing-xxs-plus` | Sort triangle vertical gap | Default |
| `--cm-comp-portfolio-fit-list-header-stock-column-width` | `--cm-sys-size-analytics-column-stock` | Stock column width | Default |
| `--cm-comp-portfolio-fit-list-header-fit-column-width` | `--cm-sys-size-analytics-column-fit` | Fit column width | Default |
| `--cm-comp-portfolio-fit-list-header-attribute-column-width` | `--cm-sys-size-analytics-column-attribute` | Attribute column width | Default |
| `--cm-comp-portfolio-fit-list-header-value-column-width` | `--cm-sys-size-analytics-column-value` | Value column width | Default |

## Layout Rules

- Header spans 375px and is 34px tall.
- Use 8px horizontal padding and 4px column gap.
- Column widths must match `Portfolio Fit Stock Row`: 94px, 68px, 105px, 80px.
- Keep value column right-aligned.
- Multi-line value label is allowed for `佔比 / 市值(元)`.

## Content Rules

- Observed labels: `庫存股`, `速配評估`, `個股屬性特徵`, `佔比`, `市值(元)`.
- Keep labels terse and muted.

## Accessibility Rules

- Sort controls need accessible labels and sort direction when active.
- Info icons need an accessible name and tooltip/dialog relationship when implemented.

## Do / Don't

- Do keep header compact and muted.
- Do align every column with the rows below.
- Don't turn info icons into explanatory text inside the header.
- Don't increase header height without a new reference.

## Implementation Notes

Use the same column tokens as `portfolio-fit-stock-row`. If a future screen changes one column width, update the shared system analytics column token first.
