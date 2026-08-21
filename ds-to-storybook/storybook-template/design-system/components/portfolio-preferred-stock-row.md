# Portfolio Preferred Stock Row

## Purpose

Displays one stock that matches the user's portfolio preference, with key metrics and an add-to-watchlist action.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-037 | Figma `29209:171407` | `庫存股/持股速配/偏好的股票/股票列表` | 375x61 row aligned to the preferred-stock header. |

## Anatomy

- Row container
- Stock name
- Stock code
- Dividend-years metric
- Yield metric
- Volatility metric
- Feature percentage
- Add-to-watchlist icon
- Divider

## Variants

- Default row with add icon: observed.
- Added/selected watchlist state: not observed.
- Negative, neutral, unavailable, and long-name variants: not observed.

## States

- Default: observed.
- Pressed, focus-visible, selected, loading, empty: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-portfolio-preferred-stock-row-container-color` | `--cm-sys-color-background` | Row background | Default |
| `--cm-comp-portfolio-preferred-stock-row-divider-color` | `--cm-sys-color-outline-high` | Row divider | Default |
| `--cm-comp-portfolio-preferred-stock-row-width` | `--cm-sys-size-viewport-compact-width` | Row width | Default |
| `--cm-comp-portfolio-preferred-stock-row-height` | `--cm-sys-size-portfolio-preferred-row-height` | Row height | Default |
| `--cm-comp-portfolio-preferred-stock-row-padding` | `--cm-sys-spacing-md` | Row padding | Default |
| `--cm-comp-portfolio-preferred-stock-row-gap` | `--cm-sys-spacing-xs` | Column gap | Default |
| `--cm-comp-portfolio-preferred-stock-row-stock-column-width` | `--cm-sys-size-portfolio-preferred-column-stock` | Stock column width | Default |
| `--cm-comp-portfolio-preferred-stock-row-dividend-years-column-width` | `--cm-sys-size-portfolio-preferred-column-dividend-years` | Dividend-years width | Default |
| `--cm-comp-portfolio-preferred-stock-row-yield-column-width` | `--cm-sys-size-portfolio-preferred-column-yield` | Yield width | Default |
| `--cm-comp-portfolio-preferred-stock-row-volatility-column-width` | `--cm-sys-size-portfolio-preferred-column-volatility` | Volatility width | Default |
| `--cm-comp-portfolio-preferred-stock-row-feature-column-width` | `--cm-sys-size-portfolio-preferred-column-feature` | Feature width | Default |
| `--cm-comp-portfolio-preferred-stock-row-action-column-width` | `--cm-sys-size-portfolio-preferred-column-action` | Action width | Default |
| `--cm-comp-portfolio-preferred-stock-row-name-color` | `--cm-sys-color-on-background` | Stock name | Default |
| `--cm-comp-portfolio-preferred-stock-row-code-color` | `--cm-sys-color-on-surface-medium` | Stock code | Default |
| `--cm-comp-portfolio-preferred-stock-row-metric-color` | `--cm-sys-color-on-surface-medium` | Metric values | Default |
| `--cm-comp-portfolio-preferred-stock-row-feature-color` | `--cm-sys-color-portfolio-fit-score-high` | Feature percentage | High |
| `--cm-comp-portfolio-preferred-stock-row-action-icon-color` | `--cm-sys-color-primary` | Add icon | Default |
| `--cm-comp-portfolio-preferred-stock-row-name-text-size` | `--cm-sys-typescale-title-md-size` | Stock name size | Default |
| `--cm-comp-portfolio-preferred-stock-row-code-text-size` | `--cm-sys-typescale-body-sm-size` | Stock code size | Default |
| `--cm-comp-portfolio-preferred-stock-row-metric-text-size` | `--cm-sys-typescale-numeric-lg-size` | Metric size | Default |
| `--cm-comp-portfolio-preferred-stock-row-action-icon-size` | `--cm-sys-size-icon-compact-action` | Add icon size | Default |
| `--cm-comp-portfolio-preferred-stock-row-action-padding-x` | `--cm-sys-spacing-xxs` | Action horizontal padding | Default |

## Layout Rules

- Row is 375x61 including divider.
- Use 8px padding and 4px column gaps.
- Column widths must match the header: 80, 62, 62, 62, 46, and 27px.
- Stock identity stacks name over code.
- Metric and feature columns are right-aligned.
- Text containers keep the fixed column widths, while inner text nodes export with `data-figma-text-auto-width="true"` so Figma text remains hug content.
- Add icon is a 22px inline SVG that preserves the Figma addstock circle-plus geometry inside the 27px action column.

## Content Rules

- Observed row is `永記`, `1726`, `24年`, `4.91%`, `9%`, `100%`.
- Preserve units in metric values.
- Do not infer added/selected state from the orange plus icon.

## Accessibility Rules

- Row summary should include stock name, code, all metrics, feature percentage, and add action state.
- The add icon needs an accessible action name when interactive.
- Do not rely on red `100%` alone to convey feature strength.

## Do / Don't

- Do keep the row aligned to the preferred-stock list header.
- Do preserve right-aligned metrics.
- Don't wrap this row in a card.
- Don't substitute generic badges for the feature percentage.
