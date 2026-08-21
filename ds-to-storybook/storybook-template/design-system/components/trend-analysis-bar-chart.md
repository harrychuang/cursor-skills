# Trend Analysis Bar Chart

## Purpose

Shows a compact positive/negative bar chart inside a trend-analysis module. Use it when a trend section needs a diverging histogram with red values above zero and green values below zero, not when the section needs the total-asset summary and orange area-line series from Asset Trend Chart.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-092 | Figma `51059:278139` | `Frame 480962365` | 375x138 dark diverging bar chart with 16px outer padding, 37px right-aligned y-axis label column, 8px content gap, 298px plot, three horizontal grid lines, Roboto 12px labels `30.6K`, `0K`, and `-45.3K`, red 50% positive bars above the zero line, and green 50% negative bars below the zero line. |

## Component Fingerprint

| Dimension | Fingerprint |
|---|---|
| Purpose / behavior | Local trend-analysis histogram for signed values around a zero baseline. It is not a summary metric chart, a quote mini chart, a profit summary expansion, a portfolio fit bar table, or a generic chart card. |
| Anatomy | Container, y-axis label column, plot region, top grid line, zero grid line, bottom grid line, positive bar band, negative bar band, positive bars, and negative bars. |
| Variants / states | Default signed-data state is observed. Positive and negative values are both present. Empty, loading, error, selected bar, tooltip, hover, pressed, focus-visible, and alternate axis-scale states are not shown. |
| Token contract summary | 375x138 surface, 16px outer padding, 37px axis label column, 8px label/plot gap, 106px axis label height, 298px plot width, 46px positive band, 46px negative band, 8px bars on a 12px cadence, 12px Roboto labels, chart-grid lines, red 50% positive fill, and green 50% negative fill. |
| Layout / density | Dense single chart body. Axis labels sit outside the plot at the left; bars stay square-edged and anchored to the zero line. The chart has no card radius, legend, title, summary row, or tooltip surface. |
| Visual reference | Figma node preview `figma:vSr4NtEwPVs6wLpqCT5PtV#51059:278139`; get_screenshot captured 2026-06-17. |
| Similar components reviewed | Asset Trend Chart, Portfolio Profit Summary, Realtime Quote Tile, Portfolio Fit Chart, and generic Chart Card tokens. Decision: keep distinct because this source owns a 375x138 signed bar histogram without summary metrics, orange area-line series, quote identity, raised summary surface, or portfolio category table rows. |

## Anatomy

- Container
- Y-axis label column
- Plot region
- Horizontal grid lines
- Zero baseline
- Positive bar band
- Negative bar band
- Positive bars
- Negative bars

## Variants

- Default signed-data histogram: observed with both positive red bars and negative green bars.

## States

- Default data state: observed with y-axis labels, grid lines, positive bars, and negative bars.
- Empty, loading, error, selected bar, tooltip, hover, pressed, focus-visible, and alternate scale states: not observed and not inferred.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-trend-analysis-bar-chart-width` | `--cm-sys-size-analysis-bar-chart-width` | Root chart width | All |
| `--cm-comp-trend-analysis-bar-chart-height` | `--cm-sys-size-analysis-bar-chart-height` | Root chart height | All |
| `--cm-comp-trend-analysis-bar-chart-container-color` | `--cm-sys-color-surface` | Chart surface | All |
| `--cm-comp-trend-analysis-bar-chart-padding-x` | `--cm-sys-spacing-screen-gutter` | Horizontal outer inset | All |
| `--cm-comp-trend-analysis-bar-chart-padding-y` | `--cm-sys-spacing-screen-gutter` | Vertical outer inset | All |
| `--cm-comp-trend-analysis-bar-chart-axis-column-width` | `--cm-sys-size-analysis-bar-chart-axis-column-width` | Y-axis label column width | All |
| `--cm-comp-trend-analysis-bar-chart-content-gap` | `--cm-sys-spacing-md` | Gap between y-axis labels and plot | All |
| `--cm-comp-trend-analysis-bar-chart-content-height` | `--cm-sys-size-analysis-bar-chart-content-height` | Y-axis label stack height | All |
| `--cm-comp-trend-analysis-bar-chart-plot-width` | `--cm-sys-size-analysis-bar-chart-plot-width` | Plot and grid width | All |
| `--cm-comp-trend-analysis-bar-chart-positive-band-height` | `--cm-sys-size-analysis-bar-chart-band-height` | Positive bar max band above zero | Data |
| `--cm-comp-trend-analysis-bar-chart-negative-band-height` | `--cm-sys-size-analysis-bar-chart-band-height` | Negative bar max band below zero | Data |
| `--cm-comp-trend-analysis-bar-chart-bar-width` | `--cm-sys-size-analysis-bar-chart-bar-width` | Individual bar width | Data |
| `--cm-comp-trend-analysis-bar-chart-bar-step` | `--cm-sys-size-analysis-bar-chart-bar-step` | Observed horizontal bar cadence | Data |
| `--cm-comp-trend-analysis-bar-chart-grid-color` | `--cm-sys-color-chart-grid` | Horizontal grid lines | Chart |
| `--cm-comp-trend-analysis-bar-chart-axis-label-color` | `--cm-sys-color-on-surface-strong` | Y-axis label color | Chart |
| `--cm-comp-trend-analysis-bar-chart-positive-bar-color` | `--cm-sys-color-market-up-wash-strong` | Positive signed values above zero | Data |
| `--cm-comp-trend-analysis-bar-chart-negative-bar-color` | `--cm-sys-color-market-down-wash-strong` | Negative signed values below zero | Data |
| `--cm-comp-trend-analysis-bar-chart-axis-label-text-size` | `--cm-sys-typescale-chart-axis-md-size` | Y-axis label size | Chart |
| `--cm-comp-trend-analysis-bar-chart-axis-label-line-height` | `--cm-sys-typescale-chart-axis-md-line-height` | Y-axis label line height | Chart |
| `--cm-comp-trend-analysis-bar-chart-axis-label-weight` | `--cm-sys-weight-regular` | Y-axis label weight | Chart |
| `--cm-comp-trend-analysis-bar-chart-axis-label-typeface` | `--cm-sys-typeface-calendar-numeric` | Roboto numeric labels | Chart |

## Layout Rules

- Keep the chart body 375x138 on the same `#252525` local analysis surface.
- Use 16px outer padding on all sides.
- Reserve a 37px left y-axis column, right-align its labels, and separate it from the plot with an 8px gap.
- Keep the axis label stack 106px high with labels distributed top, zero, and bottom.
- Keep the plot width at 298px.
- Positive and negative bands are each 46px high and meet at the zero baseline.
- Bars are 8px wide and square-edged. The observed bar cadence is 12px, allowing empty intervals when the data has no visible bar.
- Do not add a surrounding card, rounded plot panel, legend, title, or summary row.

## Content Rules

- Observed y-axis labels are `30.6K`, `0K`, and `-45.3K`.
- Axis labels are numeric and use compact K units when values are in thousands.
- Positive values render above zero in the market-up red wash; negative values render below zero in the market-down green wash.
- Do not add x-axis labels, series names, annotations, or explanatory copy without new evidence.

## Accessibility Rules

- Provide a textual chart summary that describes the signed value range and whether the series is mostly positive or negative.
- Do not rely on red and green alone; expose signed numeric values through accessible text, table data, or an aria-described summary.
- If rendered as SVG or canvas, ensure bars are either individually described for interactive charts or hidden from assistive technology when an equivalent data table/summary is present.

## Do / Don't

- Do use this component for signed trend-analysis histograms with a zero baseline.
- Do keep red bars above zero and green bars below zero in Taiwan market convention.
- Do align bars to the zero baseline and keep grid lines subtle.
- Don't merge this into Asset Trend Chart; that component owns summary metrics, orange area-line series, selected-date cursor, and date marker.
- Don't reuse Portfolio Profit Summary bar tokens; that module owns a raised summary plus expanded profit/loss chart body.
- Don't add tooltip bubbles, card chrome, large legends, rounded bars, gradients, or dashboard spacing without Figma evidence.

## Implementation Notes

The generated Figma context represents horizontal grid lines as transient localhost SVG assets and individual bars as absolute rectangles. Production should render the bars from data while preserving the 375x138 surface, 37px y-axis column, 298px plot width, 8px bar width, 46px positive/negative bands, and red/green 50% fills.
