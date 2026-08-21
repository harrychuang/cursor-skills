# Portfolio Health Check Cell

## Purpose

Defines reusable 61px-high cells used by portfolio health-check stock rows.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-040 | Figma `29209:173922` | `庫存股` cell set | Six cell variants for stock identity, report action, valuation, text status, seasonal trend, and quarter-line status. |
| E-039 | Figma `29209:173867` | Quarter-line icon | Provides the `站上季線` icon variants used by the status cell. |
| E-038 | Figma `29209:173791` | Valuation labels | Provides the valuation pill used by the valuation cell. |

## Anatomy

- Cell container
- Cell divider
- Optional sticky stock identity shadow
- Variant content
- Optional report action
- Optional valuation label
- Optional status text
- Optional trend graphic
- Optional quarter-line status icon

## Variants

- Stock identity: 102px wide, stock name over code, sticky-edge shadow.
- Health report: 80px wide, compact outline `看報告` action.
- Valuation: 88px wide, centered `Valuation Label`.
- Text status: 58px wide, centered `注意` text.
- Seasonal trend: 63px wide, centered 37x16 trend graphic.
- Quarter-line status: 74px wide, centered 22px status icon.

## States

- Default cells: observed.
- Pressed, focus-visible, selected, loading, empty, disabled, and alternate status states: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-portfolio-health-check-cell-set-width` | `--cm-sys-size-portfolio-health-set-width` | Component set reference width | Documentation |
| `--cm-comp-portfolio-health-check-cell-height` | `--cm-sys-size-portfolio-health-height` | Cell total height | Default |
| `--cm-comp-portfolio-health-check-cell-content-height` | `--cm-sys-size-portfolio-health-content-height` | Content area height | Default |
| `--cm-comp-portfolio-health-check-cell-container-color` | `--cm-sys-color-background` | Cell background | Default |
| `--cm-comp-portfolio-health-check-cell-divider-color` | `--cm-sys-color-outline-middle` | Bottom divider | Default |
| `--cm-comp-portfolio-health-check-cell-padding` | `--cm-sys-spacing-md` | Common centered-cell padding | Default |
| `--cm-comp-portfolio-health-check-cell-gap` | `--cm-sys-spacing-xs` | Internal gap | Default |
| `--cm-comp-portfolio-health-check-cell-stock-width` | `--cm-sys-size-portfolio-health-stock-column` | Stock cell width | Stock |
| `--cm-comp-portfolio-health-check-cell-report-width` | `--cm-sys-size-portfolio-health-report-column` | Report cell width | Report |
| `--cm-comp-portfolio-health-check-cell-valuation-width` | `--cm-sys-size-portfolio-health-valuation-column` | Valuation cell width | Valuation |
| `--cm-comp-portfolio-health-check-cell-attention-width` | `--cm-sys-size-portfolio-health-attention-column` | Text status cell width | Text |
| `--cm-comp-portfolio-health-check-cell-trend-width` | `--cm-sys-size-portfolio-health-trend-column` | Trend cell width | Trend |
| `--cm-comp-portfolio-health-check-cell-quarter-line-width` | `--cm-sys-size-portfolio-health-quarter-line-column` | Quarter-line cell width | Quarter line |
| `--cm-comp-portfolio-health-check-cell-stock-text-width` | `--cm-sys-size-portfolio-health-stock-text-width` | Stock text width | Stock |
| `--cm-comp-portfolio-health-check-cell-stock-shadow` | `--cm-sys-shadow-sticky-edge` | Sticky stock shadow | Stock |
| `--cm-comp-portfolio-health-check-cell-stock-name-color` | `--cm-sys-color-on-background` | Stock name | Stock |
| `--cm-comp-portfolio-health-check-cell-stock-code-color` | `--cm-sys-color-on-surface-muted` | Stock code | Stock |
| `--cm-comp-portfolio-health-check-cell-stock-name-text-size` | `--cm-sys-typescale-title-md-size` | Stock name size | Stock |
| `--cm-comp-portfolio-health-check-cell-stock-code-text-size` | `--cm-sys-typescale-body-sm-size` | Stock code size | Stock |
| `--cm-comp-portfolio-health-check-cell-report-action-height` | `--cm-sys-size-portfolio-health-report-action-height` | Report action height | Report |
| `--cm-comp-portfolio-health-check-cell-report-action-border-color` | `--cm-sys-color-primary-outline-subtle` | Report action border | Report |
| `--cm-comp-portfolio-health-check-cell-report-action-label-color` | `--cm-sys-color-primary` | Report action label | Report |
| `--cm-comp-portfolio-health-check-cell-report-action-icon-color` | `--cm-sys-color-primary` | Report action icon | Report |
| `--cm-comp-portfolio-health-check-cell-report-action-padding-x` | `--cm-sys-spacing-sm` | Report action horizontal padding | Report |
| `--cm-comp-portfolio-health-check-cell-report-action-padding-y` | `--cm-sys-spacing-xs` | Report action vertical padding | Report |
| `--cm-comp-portfolio-health-check-cell-report-action-gap` | `--cm-sys-spacing-xxs` | Report action label/icon gap | Report |
| `--cm-comp-portfolio-health-check-cell-report-action-corner-radius` | `--cm-sys-shape-corner-xs` | Report action radius | Report |
| `--cm-comp-portfolio-health-check-cell-report-action-label-text-size` | `--cm-sys-typescale-caption-sm-size` | Report action label size | Report |
| `--cm-comp-portfolio-health-check-cell-report-action-icon-size` | `--cm-sys-size-portfolio-health-report-action-icon` | Report action icon size, 70% of the original 8px reference | Report |
| `--cm-comp-portfolio-health-check-cell-attention-color` | `--cm-sys-color-portfolio-health-attention` | Attention text | Text |
| `--cm-comp-portfolio-health-check-cell-note-color` | `--cm-sys-color-portfolio-health-note` | Note/rank text | Note |
| `--cm-comp-portfolio-health-check-cell-metric-color` | `--cm-sys-color-on-background` | Neutral metric text | Metric |
| `--cm-comp-portfolio-health-check-cell-change-high-color` | `--cm-sys-color-portfolio-health-change-high` | High change text | Change |
| `--cm-comp-portfolio-health-check-cell-trend-line-color` | `--cm-sys-color-portfolio-health-change-high` | Trend line color | Trend |
| `--cm-comp-portfolio-health-check-cell-text-size` | `--cm-sys-typescale-label-xl-size` | Status/metric text size | Default |
| `--cm-comp-portfolio-health-check-cell-trend-graphic-width` | `--cm-sys-size-portfolio-health-trend-width` | Trend graphic width | Trend |
| `--cm-comp-portfolio-health-check-cell-trend-graphic-height` | `--cm-sys-size-portfolio-health-trend-height` | Trend graphic height | Trend |
| `--cm-comp-portfolio-health-check-cell-quarter-line-icon-size` | `--cm-sys-size-quarter-line-status-icon` | Quarter-line icon size | Quarter line |

## Layout Rules

- Component set reference is 521x77, with 8px inset and 8px gaps between the six observed cell variants.
- Total cell height is 61px, with a 60px content area and a 1px divider.
- Most non-stock cells center their content with 8px padding.
- Stock cell uses 8px left padding, 4px right padding, 8px vertical padding, and a 90px text width.
- The stock cell may use the sticky-edge shadow only when pinned beside horizontally scrolling cells.
- Report action is 25px high with 6px horizontal padding, 4px vertical padding, 2px label/icon gap, 4px radius, and a 5.6px arrow icon.

## Content Rules

- Observed stock identity is `東哥遊艇` / `8478`.
- Observed report action copy is `看報告`.
- Observed text status is `注意`.
- Trend graphic is an inline red visual, not a decorative placeholder.
- Use the existing `Valuation Label` for valuation content.
- Use `Quarter Line Status Icon` for the quarter-line column.

## Accessibility Rules

- Stock cells should expose name and code together.
- Report action needs a clear accessible name.
- Icon-only and trend cells need text equivalents.

## Do / Don't

- Do keep every cell compact and column-bound.
- Do reuse `Valuation Label` and `Quarter Line Status Icon`.
- Don't turn individual cells into cards.
- Don't add explanatory labels inside the row cells.
