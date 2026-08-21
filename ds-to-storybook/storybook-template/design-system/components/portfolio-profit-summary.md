# Portfolio Profit Summary

## Purpose

Summarizes realtime portfolio profit/loss and expands into compact financial charts for daily profit/loss, cumulative profit/loss, and holding allocation.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-045 | Figma `29199:89866` | `庫存股` / `即時損益` component set | Five variants: collapsed summary, empty summary, daily profit/loss chart, cumulative profit/loss split, and holding allocation chart. |

## Anatomy

- Outer variant frame
- Raised summary surface
- Three metric columns
- Metric label
- Metric value
- Metric rate or cost metadata
- Column dividers
- Compact chart toggle
- Optional expanded detail surface
- Optional chart title with info icon
- Optional bar chart, donut chart, or allocation legend

## Variants

- Collapsed summary: 375x110, three-column summary only.
- Empty summary: 375x110, values become `-` or `0`.
- Daily profit/loss: 375x218, summary plus red/green daily bar chart.
- Cumulative profit/loss: 375x218, summary plus gain/loss donut split and two amount blocks.
- Holding allocation: 375x226, summary plus five-series donut and legend.

## States

- Summary collapsed: observed.
- Empty values: observed.
- Expanded daily chart: observed.
- Expanded cumulative chart: observed.
- Expanded allocation chart: observed.
- Pressed/focus-visible toggle, loading, error, hidden-cost, and long-label overflow states: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-portfolio-profit-summary-set-width` | `--cm-sys-size-portfolio-profit-set-width` | Component set reference width | Documentation |
| `--cm-comp-portfolio-profit-summary-set-height` | `--cm-sys-size-portfolio-profit-set-height` | Component set reference height | Documentation |
| `--cm-comp-portfolio-profit-summary-width` | `--cm-sys-size-portfolio-profit-width` | Variant width | Default |
| `--cm-comp-portfolio-profit-summary-collapsed-height` | `--cm-sys-size-portfolio-profit-summary-height` | Collapsed height | Collapsed |
| `--cm-comp-portfolio-profit-summary-empty-height` | `--cm-sys-size-portfolio-profit-summary-height` | Empty height | Empty |
| `--cm-comp-portfolio-profit-summary-daily-height` | `--cm-sys-size-portfolio-profit-expanded-height` | Daily chart height | Daily |
| `--cm-comp-portfolio-profit-summary-cumulative-height` | `--cm-sys-size-portfolio-profit-expanded-height` | Cumulative chart height | Cumulative |
| `--cm-comp-portfolio-profit-summary-allocation-height` | `--cm-sys-size-portfolio-profit-allocation-height` | Allocation chart height | Allocation |
| `--cm-comp-portfolio-profit-summary-padding` | `--cm-sys-spacing-md` | Outer padding | Default |
| `--cm-comp-portfolio-profit-summary-surface-width` | `--cm-sys-size-portfolio-profit-surface-width` | Raised summary surface width | Default |
| `--cm-comp-portfolio-profit-summary-surface-height` | `--cm-sys-size-portfolio-profit-surface-height` | Raised summary surface height | Default |
| `--cm-comp-portfolio-profit-summary-surface-color` | `--cm-sys-color-surface` | Summary surface fill | Default |
| `--cm-comp-portfolio-profit-summary-surface-shadow` | `--cm-sys-shadow-raised-surface` | Summary surface shadow | Default |
| `--cm-comp-portfolio-profit-summary-surface-corner-radius` | `--cm-sys-shape-corner-md` | Summary surface radius | Default |
| `--cm-comp-portfolio-profit-summary-surface-padding-x` | `--cm-sys-spacing-md` | Summary horizontal padding | Default |
| `--cm-comp-portfolio-profit-summary-surface-padding-y` | `--cm-sys-spacing-l` | Summary vertical padding | Default |
| `--cm-comp-portfolio-profit-summary-surface-gap` | `--cm-sys-spacing-md` | Metric column gap | Default |
| `--cm-comp-portfolio-profit-summary-label-color` | `--cm-sys-color-on-surface-muted` | Metric labels | Default |
| `--cm-comp-portfolio-profit-summary-value-gain-color` | `--cm-sys-color-profit-gain` | Positive value | Gain |
| `--cm-comp-portfolio-profit-summary-value-loss-color` | `--cm-sys-color-profit-loss` | Negative value | Loss |
| `--cm-comp-portfolio-profit-summary-value-empty-color` | `--cm-sys-color-profit-empty` | Empty dash values | Empty |
| `--cm-comp-portfolio-profit-summary-value-neutral-color` | `--cm-sys-color-on-surface-strong` | Market value | Neutral |
| `--cm-comp-portfolio-profit-summary-cost-color` | `--cm-sys-color-on-surface-subtle` | Cost metadata | Default |
| `--cm-comp-portfolio-profit-summary-label-text-size` | `--cm-sys-typescale-label-xl-size` | Metric label size | Default |
| `--cm-comp-portfolio-profit-summary-value-text-size` | `--cm-sys-typescale-profit-value-size` | Metric value size | Default |
| `--cm-comp-portfolio-profit-summary-value-line-height` | `--cm-sys-typescale-profit-value-line-height` | Metric value line height | Default |
| `--cm-comp-portfolio-profit-summary-rate-text-size` | `--cm-sys-typescale-profit-rate-size` | Rate text size | Default |
| `--cm-comp-portfolio-profit-summary-rate-line-height` | `--cm-sys-typescale-profit-rate-line-height` | Rate line height | Default |
| `--cm-comp-portfolio-profit-summary-cost-text-size` | `--cm-sys-typescale-caption-sm-size` | Cost text size | Market value |
| `--cm-comp-portfolio-profit-summary-cost-line-height` | `--cm-sys-typescale-metric-sm-line-height` | Cost line height | Market value |
| `--cm-comp-portfolio-profit-summary-metric-column-width` | `--cm-sys-size-portfolio-profit-metric-column` | Profit/loss column width | Default |
| `--cm-comp-portfolio-profit-summary-market-column-width` | `--cm-sys-size-portfolio-profit-market-column` | Stock market-value column width | Default |
| `--cm-comp-portfolio-profit-summary-divider-color` | `--cm-sys-color-outline-inverse-subtle` | Vertical dividers | Default |
| `--cm-comp-portfolio-profit-summary-divider-height` | `--cm-sys-size-portfolio-profit-divider-height` | Vertical divider height | Default |
| `--cm-comp-portfolio-profit-summary-toggle-border-color` | `--cm-sys-color-control-outline` | Chart toggle border | Default |
| `--cm-comp-portfolio-profit-summary-toggle-corner-radius` | `--cm-sys-shape-corner-xs` | Chart toggle radius | Default |
| `--cm-comp-portfolio-profit-summary-toggle-padding-x` | `--cm-sys-spacing-xs` | Toggle horizontal padding | Default |
| `--cm-comp-portfolio-profit-summary-toggle-padding-y` | `--cm-sys-size-control-border-width` | Toggle vertical padding | Default |
| `--cm-comp-portfolio-profit-summary-toggle-gap` | `--cm-sys-spacing-xxs` | Toggle icon/chevron gap | Default |
| `--cm-comp-portfolio-profit-summary-toggle-icon-size` | `--cm-sys-size-icon-micro` | Toggle chart icon size | Default |
| `--cm-comp-portfolio-profit-summary-toggle-chevron-width` | `--cm-sys-size-event-filter-dropdown-icon-width` | Toggle chevron width | Default |
| `--cm-comp-portfolio-profit-summary-toggle-chevron-height` | `--cm-sys-size-event-filter-dropdown-icon-height` | Toggle chevron height | Default |
| `--cm-comp-portfolio-profit-summary-detail-color` | `--cm-sys-color-background` | Expanded detail fill | Expanded |
| `--cm-comp-portfolio-profit-summary-detail-padding` | `--cm-sys-spacing-md` | Expanded detail padding | Daily |
| `--cm-comp-portfolio-profit-summary-detail-side-padding` | `--cm-sys-spacing-l` | Expanded side padding | Cumulative |
| `--cm-comp-portfolio-profit-summary-detail-corner-radius` | `--cm-sys-shape-corner-lg` | Expanded bottom corner radius | Expanded |
| `--cm-comp-portfolio-profit-summary-chart-title-color` | `--cm-sys-color-on-surface-strong` | Chart title | Chart |
| `--cm-comp-portfolio-profit-summary-chart-title-text-size` | `--cm-sys-typescale-label-md-size` | Chart title size | Chart |
| `--cm-comp-portfolio-profit-summary-chart-axis-color` | `--cm-sys-color-on-surface-strong` | Chart axis labels | Daily |
| `--cm-comp-portfolio-profit-summary-chart-axis-text-size` | `--cm-sys-typescale-chart-axis-size` | Chart axis label size | Daily |
| `--cm-comp-portfolio-profit-summary-chart-axis-line-height` | `--cm-sys-typescale-chart-axis-line-height` | Chart axis line height | Daily |
| `--cm-comp-portfolio-profit-summary-chart-grid-color` | `--cm-sys-color-chart-grid` | Chart grid lines | Chart |
| `--cm-comp-portfolio-profit-summary-plot-width` | `--cm-sys-size-portfolio-profit-plot-width` | Daily plot width | Daily |
| `--cm-comp-portfolio-profit-summary-plot-height` | `--cm-sys-size-portfolio-profit-plot-height` | Daily plot height | Daily |
| `--cm-comp-portfolio-profit-summary-bar-width` | `--cm-sys-size-portfolio-profit-chart-bar-width` | Daily bar width | Daily |
| `--cm-comp-portfolio-profit-summary-bar-gain-color` | `--cm-sys-color-profit-gain` | Daily positive bars | Daily |
| `--cm-comp-portfolio-profit-summary-bar-loss-color` | `--cm-sys-color-profit-loss` | Daily negative bars | Daily |
| `--cm-comp-portfolio-profit-summary-ring-sm-size` | `--cm-sys-size-portfolio-profit-ring-sm` | Cumulative donut size | Cumulative |
| `--cm-comp-portfolio-profit-summary-ring-lg-size` | `--cm-sys-size-portfolio-profit-ring-lg` | Allocation donut size | Allocation |
| `--cm-comp-portfolio-profit-summary-callout-sm-width` | `--cm-sys-size-portfolio-profit-callout-width-sm` | Small donut callout width | Cumulative |
| `--cm-comp-portfolio-profit-summary-callout-md-width` | `--cm-sys-size-portfolio-profit-callout-width-md` | Medium donut callout width | Cumulative |
| `--cm-comp-portfolio-profit-summary-legend-swatch-size` | `--cm-sys-size-portfolio-profit-legend-swatch` | Allocation legend swatch | Allocation |
| `--cm-comp-portfolio-profit-summary-legend-label-width` | `--cm-sys-size-portfolio-profit-legend-label-width` | Allocation legend label width | Allocation |
| `--cm-comp-portfolio-profit-summary-legend-value-width` | `--cm-sys-size-portfolio-profit-legend-value-width` | Allocation percent width | Allocation |
| `--cm-comp-portfolio-profit-summary-legend-label-color` | `--cm-sys-color-on-surface-strong` | Allocation legend label | Allocation |
| `--cm-comp-portfolio-profit-summary-legend-value-color` | `--cm-sys-color-on-surface-strong` | Allocation legend value | Allocation |
| `--cm-comp-portfolio-profit-summary-legend-text-size` | `--cm-sys-typescale-allocation-legend-size` | Allocation legend size | Allocation |
| `--cm-comp-portfolio-profit-summary-legend-line-height` | `--cm-sys-typescale-allocation-legend-line-height` | Allocation legend line height | Allocation |
| `--cm-comp-portfolio-profit-summary-series-1-color` | `--cm-sys-color-portfolio-allocation-series-1` | Allocation series 1 | Allocation |
| `--cm-comp-portfolio-profit-summary-series-2-color` | `--cm-sys-color-portfolio-allocation-series-2` | Allocation series 2 | Allocation |
| `--cm-comp-portfolio-profit-summary-series-3-color` | `--cm-sys-color-portfolio-allocation-series-3` | Allocation series 3 | Allocation |
| `--cm-comp-portfolio-profit-summary-series-4-color` | `--cm-sys-color-portfolio-allocation-series-4` | Allocation series 4 | Allocation |
| `--cm-comp-portfolio-profit-summary-series-5-color` | `--cm-sys-color-portfolio-allocation-series-5` | Allocation series 5 | Allocation |

## Layout Rules

- Each variant is 375px wide with 8px outer padding.
- The raised summary surface is 359x94, uses `#252525`, 8px radius, and a 0/4/10 black alpha shadow.
- Summary surface uses 8px horizontal padding, 12px vertical padding, and three stable metric columns separated by 1px white-8 dividers.
- Profit/loss columns use 100px value widths; market value uses a 106px value width.
- Chart toggles are compact 12px icon controls with 4px horizontal padding, 3px vertical padding, 2px internal gap, 4px radius, and `#3D3D3D` border.
- Expanded detail surfaces use `#1E1E1E` below the summary and 10px bottom corners.
- Daily chart plot width is 309px and plot height is 58px.
- Cumulative split chart uses a 68px donut and compact two-row gain/loss summary blocks.
- Holding allocation uses a 98px donut, 8px legend swatches, 122px label width, and 43px right-aligned percent width.

## Content Rules

- Metric labels are `今日損益`, `累積損益`, and `股票市值`.
- Empty state keeps the summary structure; profit/loss values become dashes and market value/cost becomes `0`.
- Positive gain uses red and negative loss uses green, following Taiwan market color semantics.
- Daily chart title is `每日損益(元)` with a 14px info icon.
- Cumulative chart title is `盈虧市值佔比`; split rows use `獲利檔數`, `獲利金額`, `虧損檔數`, and `虧損金額`.
- Allocation chart center label is `持股佔比`; legend rows pair stock/category labels with percentages.

## Accessibility Rules

- Treat the three summary metrics as a grouped financial summary with labels bound to values and rates.
- Chart toggles need accessible names such as `展開今日損益圖表` and `收合今日損益圖表`.
- Expanded charts need text equivalents for chart title, range, gain/loss color meaning, and visible values.
- Do not rely on red/green alone to convey positive or negative profit/loss.

## Do / Don't

- Do preserve the compact three-column summary even when charts are expanded.
- Do keep the chart sections dense and data-led.
- Don't convert this module into a dashboard card grid or oversized chart panel.
- Don't reuse allocation series colors for portfolio attribute categories unless future evidence shows a direct mapping.
- Don't infer chart interactions beyond the observed expand/collapse toggles.
