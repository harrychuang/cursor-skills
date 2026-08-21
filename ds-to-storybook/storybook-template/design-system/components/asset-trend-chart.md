# Asset Trend Chart

## Purpose

Shows portfolio asset movement over time inside the trend-analysis module. Use it for the chart body that pairs total asset value, daily profit/loss, axis labels, an orange area-line series, and a selected-date cursor. Pair it with Trend Analysis Header when a range filter is needed; do not merge it into the header or into portfolio profit summary charts.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-091 | Figma `51059:51227` | `Frame 480961882` | 375x230 dark asset trend chart with `總資產` and `當日損益` summary header, white `3,690,721`, red `+12,450`, 343px-wide chart grid, muted y/x-axis labels, orange area-line series, selected-date vertical cursor, and `2026/1/27` cursor label on a dark gray pill. |

## Component Fingerprint

| Dimension | Fingerprint |
|---|---|
| Purpose / behavior | Portfolio asset trend visualization with a compact metric summary and selected-date chart cursor. It is not a local range header, summary card, generic chart card, quote mini chart, or portfolio fit donut. |
| Anatomy | Container, summary label row, total-asset label, daily P/L label, summary value row, total-asset value, daily P/L value, plot region, y-axis labels, grid lines, x-axis labels, orange area-line series, selected-date cursor, and cursor date label. |
| Variants / states | Gain state is observed for daily P/L. Selected-date cursor is observed. Loss/neutral daily P/L, loading, empty, error, hidden-value, pressed/focus-visible chart interaction, tooltip-open detail, and alternate ranges are not shown. |
| Token contract summary | 375x230 surface, 64px metric summary, 16px side insets, 30px label row, 34px value row, 343x102 grid, 343x93 series region, 117px cursor, 12px/16px axis labels, orange series line/fill, and dark cursor label normalized from observed `#414141` to neutral-24. |
| Layout / density | Dense single-column chart body. Summary values stay above the plot; plot region uses 16px side insets and compact axis labels rather than a framed card or dashboard panel. |
| Visual reference | Figma node preview `figma:vSr4NtEwPVs6wLpqCT5PtV#51059:51227`; get_screenshot captured 2026-06-17. |
| Similar components reviewed | Trend Analysis Header, Portfolio Profit Summary, Portfolio Fit Chart, Realtime Quote Tile, Global Bubble, and generic Chart Card tokens. Decision: keep distinct as the chart body for asset trend analysis. |

## Anatomy

- Container
- Summary label row
- Total asset label
- Daily profit/loss label
- Summary value row
- Total asset value
- Daily profit/loss value
- Plot region
- Y-axis labels and grid lines
- X-axis labels
- Area-line series
- Selected-date cursor
- Cursor date label

## Variants

- Gain: observed with red `+12,450` daily P/L value.
- Selected date: observed with a vertical cursor line and a date label pill.

## States

- Default data state: observed with asset total, positive daily P/L, y-axis bounds, x-axis dates, and one selected date.
- Loss state: not observed; if needed, use the existing profit/loss convention where losses map to the product's green loss role.
- Neutral/no-change, hidden-value, loading, empty, error, pressed/focus-visible, and expanded tooltip states: not observed and not inferred.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-asset-trend-chart-width` | `--cm-sys-size-analysis-asset-trend-width` | Chart body width | All |
| `--cm-comp-asset-trend-chart-height` | `--cm-sys-size-analysis-asset-trend-height` | Chart body height | All |
| `--cm-comp-asset-trend-chart-container-color` | `--cm-sys-color-surface` | Chart body surface | All |
| `--cm-comp-asset-trend-chart-summary-height` | `--cm-sys-size-analysis-asset-trend-summary-height` | Metric summary block height | All |
| `--cm-comp-asset-trend-chart-summary-label-row-height` | `--cm-sys-size-analysis-asset-trend-summary-label-row-height` | Label row height | All |
| `--cm-comp-asset-trend-chart-summary-value-row-height` | `--cm-sys-size-analysis-asset-trend-summary-value-row-height` | Value row height | All |
| `--cm-comp-asset-trend-chart-summary-padding-x` | `--cm-sys-spacing-screen-gutter` | Summary horizontal inset | All |
| `--cm-comp-asset-trend-chart-summary-label-row-padding-top` | `--cm-sys-spacing-md` | Label row top inset | All |
| `--cm-comp-asset-trend-chart-summary-label-row-padding-bottom` | `--cm-sys-spacing-xs` | Label row bottom inset | All |
| `--cm-comp-asset-trend-chart-summary-value-row-padding-y` | `--cm-sys-spacing-md` | Value row vertical inset | All |
| `--cm-comp-asset-trend-chart-primary-label-color` | `--cm-sys-color-on-surface-strong` | `總資產` label | Default |
| `--cm-comp-asset-trend-chart-secondary-label-color` | `--cm-sys-color-on-surface-medium` | `當日損益` label | Default |
| `--cm-comp-asset-trend-chart-asset-value-color` | `--cm-sys-color-on-surface-strong` | Total asset value | Default |
| `--cm-comp-asset-trend-chart-delta-gain-color` | `--cm-sys-color-profit-gain` | Positive daily P/L value | Gain |
| `--cm-comp-asset-trend-chart-delta-loss-color` | `--cm-sys-color-profit-loss` | Negative daily P/L value | Inferred loss |
| `--cm-comp-asset-trend-chart-plot-region-height` | calculated from analysis chart height minus summary height | Plot body height | All |
| `--cm-comp-asset-trend-chart-plot-padding-x` | `--cm-sys-spacing-screen-gutter` | Plot horizontal inset | All |
| `--cm-comp-asset-trend-chart-plot-padding-top` | `--cm-sys-spacing-l` | Plot top inset | All |
| `--cm-comp-asset-trend-chart-plot-width` | `--cm-sys-size-analysis-asset-trend-plot-width` | Grid and series width | All |
| `--cm-comp-asset-trend-chart-grid-height` | `--cm-sys-size-analysis-asset-trend-grid-height` | Grid height | All |
| `--cm-comp-asset-trend-chart-series-height` | `--cm-sys-size-analysis-asset-trend-series-height` | Orange area-line visual height | Data |
| `--cm-comp-asset-trend-chart-cursor-height` | `--cm-sys-size-analysis-asset-trend-cursor-height` | Selected-date cursor height | Selected date |
| `--cm-comp-asset-trend-chart-grid-color` | `--cm-sys-color-chart-grid` | Horizontal grid lines | Chart |
| `--cm-comp-asset-trend-chart-axis-label-color` | `--cm-sys-color-chart-axis` | Axis labels | Chart |
| `--cm-comp-asset-trend-chart-cursor-color` | `--cm-sys-color-chart-cursor` | Selected-date cursor | Selected date |
| `--cm-comp-asset-trend-chart-series-line-color` | `--cm-sys-color-chart-series-primary` | Orange line series | Data |
| `--cm-comp-asset-trend-chart-series-fill-color` | `--cm-sys-color-chart-series-primary-fill` | Orange area fill start color | Data |
| `--cm-comp-asset-trend-chart-series-point-color` | `--cm-sys-color-chart-series-primary` | Current/rightmost point | Data |
| `--cm-comp-asset-trend-chart-cursor-label-container-color` | `--cm-sys-color-chart-tooltip-container` | Selected-date pill fill | Selected date |
| `--cm-comp-asset-trend-chart-cursor-label-color` | `--cm-sys-color-on-chart-tooltip-container` | Selected-date pill text | Selected date |
| `--cm-comp-asset-trend-chart-cursor-label-padding-x` | `--cm-sys-spacing-xs` | Cursor label horizontal inset | Selected date |
| `--cm-comp-asset-trend-chart-cursor-label-padding-y` | `--cm-sys-spacing-xxs` | Cursor label vertical inset | Selected date |
| `--cm-comp-asset-trend-chart-cursor-label-corner-radius` | `--cm-sys-shape-corner-xs` | Cursor label radius | Selected date |
| `--cm-comp-asset-trend-chart-summary-primary-label-text-size` | `--cm-sys-typescale-title-sm-size` | `總資產` label size | Default |
| `--cm-comp-asset-trend-chart-summary-primary-label-line-height` | `--cm-sys-typescale-table-header-line-height` | `總資產` label line height | Default |
| `--cm-comp-asset-trend-chart-summary-primary-label-weight` | `--cm-sys-weight-regular` | `總資產` label weight | Default |
| `--cm-comp-asset-trend-chart-summary-secondary-label-text-size` | `--cm-sys-typescale-label-md-size` | `當日損益` label size | Default |
| `--cm-comp-asset-trend-chart-summary-secondary-label-line-height` | `--cm-sys-typescale-table-header-line-height` | `當日損益` label line height | Default |
| `--cm-comp-asset-trend-chart-summary-secondary-label-weight` | `--cm-sys-weight-regular` | `當日損益` label weight | Default |
| `--cm-comp-asset-trend-chart-summary-value-text-size` | `--cm-sys-typescale-title-md-size` | Summary values size | Default |
| `--cm-comp-asset-trend-chart-summary-value-line-height` | `--cm-sys-typescale-table-header-line-height` | Summary values line height | Default |
| `--cm-comp-asset-trend-chart-summary-value-weight` | `--cm-sys-weight-medium` | Summary values weight | Default |
| `--cm-comp-asset-trend-chart-axis-label-text-size` | `--cm-sys-typescale-chart-axis-md-size` | Axis and cursor label size | Chart |
| `--cm-comp-asset-trend-chart-axis-label-line-height` | `--cm-sys-typescale-chart-axis-md-line-height` | Axis and cursor label line height | Chart |
| `--cm-comp-asset-trend-chart-axis-label-weight` | `--cm-sys-weight-regular` | Axis and cursor label weight | Chart |

## Layout Rules

- Keep the chart body 375x230 on the same `#252525` surface as the trend-analysis header.
- Summary block is 64px high: label row is 30px and value row is 34px.
- Use 16px horizontal inset for summary rows and plot region.
- Top label row uses 8px top padding and 4px bottom padding.
- Value row uses 8px vertical padding and aligns total asset left with daily P/L right.
- Plot region occupies the remaining height under the summary; do not wrap it in a card or raised panel.
- Plot width is 343px. Grid height is 102px, the orange series occupies a 93px visual band, and selected-date cursor is 117px high.
- Keep y-axis labels attached to the grid's left edge and x-axis labels below the plot.
- The selected date label uses a compact 4px-radius pill, not a full tooltip bubble.

## Content Rules

- Observed labels are `總資產` and `當日損益`.
- Observed values are `3,690,721` and `+12,450`.
- Axis labels are date and numeric strings; preserve compact date format such as `2025/11/09` and `2026/1/27`.
- Do not add legends, chart titles, captions, comparison chips, or explanatory copy inside the chart body without new evidence.

## Accessibility Rules

- Expose the summary values as readable text, not only as chart annotations.
- Provide an accessible chart summary including total asset value, daily P/L, date range, selected date, and series direction.
- Do not rely on red or orange alone; include signed numeric text for daily P/L and selected-date details.
- If the area-line SVG is decorative because a textual summary is provided, hide only the decorative path from assistive technology.

## Do / Don't

- Do pair this chart with Trend Analysis Header when the range controls are visible above it.
- Do keep the orange series and vertical faded area fill compact and data-led.
- Do keep the selected-date marker as a small chart annotation, not a Global Bubble.
- Don't merge this into Portfolio Profit Summary; that component owns realtime holdings P/L summary and expandable bar/donut variants.
- Don't merge this into Portfolio Fit Chart; that component owns portfolio category fit and donut/detail-panel anatomy.
- Don't use the generic Chart Card tokens for this chart's geometry; this source has a fixed asset-trend contract.
- Don't add dashboard card chrome, legends, large tooltip cards, or decorative gradients beyond the data-owned area fade.

## Implementation Notes

The generated Figma code references transient localhost SVG assets for the grid, series, and cursor. Production should render the chart from data while preserving the observed 343px plot width, orange line with a vertical faded area treatment, 12px axis labels, and selected-date cursor label. The observed cursor-label fill `#414141` is normalized to the existing neutral-24 chart tooltip container role to avoid a near-duplicate dark gray primitive.
