# Portfolio Health Check Row

## Purpose

Composes health-check cells into a horizontally scrollable diagnostic row for a stock.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-041 | Figma `29209:173935` | `Group 48096023` | 659x61 row composed from nine health-check columns. |
| E-040 | Figma `29209:173922` | Health-check cell variants | Provides the base cells used in the row. |

## Anatomy

- Row composition
- Sticky stock cell
- Health report cell
- Valuation cell
- Attention text cell
- Note/rank cell
- Yield metric cell
- Change metric cell
- Seasonal trend cell
- Quarter-line status cell

## Variants

- Default health-check row: observed.
- Rows with added states, alternative valuation, different technical status, empty values, and loading: not observed.

## States

- Default row: observed.
- Pressed, focus-visible, selected, loading, empty, and horizontal-scroll edge states: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-portfolio-health-check-row-width` | `--cm-sys-size-portfolio-health-composition-width` | Full row width | Default |
| `--cm-comp-portfolio-health-check-row-height` | `--cm-sys-size-portfolio-health-height` | Row height | Default |
| `--cm-comp-portfolio-health-check-row-stock-column-width` | `--cm-sys-size-portfolio-health-stock-column` | Stock column width | Default |
| `--cm-comp-portfolio-health-check-row-report-column-width` | `--cm-sys-size-portfolio-health-report-column` | Report column width | Default |
| `--cm-comp-portfolio-health-check-row-valuation-column-width` | `--cm-sys-size-portfolio-health-valuation-column` | Valuation column width | Default |
| `--cm-comp-portfolio-health-check-row-attention-column-width` | `--cm-sys-size-portfolio-health-attention-column` | Attention column width | Default |
| `--cm-comp-portfolio-health-check-row-note-column-width` | `--cm-sys-size-portfolio-health-note-column` | Note/rank column width | Default |
| `--cm-comp-portfolio-health-check-row-yield-column-width` | `--cm-sys-size-portfolio-health-yield-column` | Yield column width | Default |
| `--cm-comp-portfolio-health-check-row-change-column-width` | `--cm-sys-size-portfolio-health-change-column` | Change column width | Default |
| `--cm-comp-portfolio-health-check-row-trend-column-width` | `--cm-sys-size-portfolio-health-trend-column` | Trend column width | Default |
| `--cm-comp-portfolio-health-check-row-quarter-line-column-width` | `--cm-sys-size-portfolio-health-quarter-line-column` | Quarter-line column width | Default |
| `--cm-comp-portfolio-health-check-row-divider-color` | `--cm-sys-color-outline-middle` | Cell dividers | Default |

## Layout Rules

- Full row width is 659px and height is 61px.
- Column widths are 102, 80, 88, 58, 46, 64, 84, 63, and 74px.
- The stock column is designed to sit at the left edge and may remain sticky in a horizontally scrolling table.
- Keep all cells flush with no inter-column gap beyond their cell boundaries.
- Preserve the 1px bottom divider across every cell.

## Content Rules

- Observed content: `東哥遊艇`, `8478`, `看報告`, `昂貴`, `注意`, `7`, `0.94%`, `13.6%`, trend line, and below-quarter-line status icon.
- Preserve units in percentage metrics.
- Use text equivalents for trend and quarter-line states in non-visual output.

## Accessibility Rules

- Row summary should include stock identity and every diagnostic column value.
- The report action should be reachable independently if the row is interactive.
- Sticky stock behavior should not duplicate the row in accessibility order.

## Do / Don't

- Do keep this as a dense diagnostic table row.
- Do reuse `Portfolio Health Check Cell` variants.
- Don't convert the row into a set of cards or badges.
- Don't infer horizontal scrolling physics or sticky runtime behavior beyond the observed sticky shadow.
