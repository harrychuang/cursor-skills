# Portfolio Fit Stock Row

## Purpose

Displays one stock in the portfolio fit analysis list with fit status, attribute match, holding percentage, and market value.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-018 | Figma `29208:159824` | `庫存股/持股分析/速配度/股票列表` | 375x61 row aligned to the list header. |
| E-019 | Figma `29208:159824` | Fit indicator and attribute pill | Red check with `速配`; blue `長期存股 100%` attribute pill. |
| E-030 | Figma `29209:159854` | `個股屬性特徵` component set | Extracted attribute label variants for long-term, swing, short-term, and no-feature states. |
| E-031 | Figma `29209:159887` | `速配評估` component set | Extracted match and mismatch assessment indicator variants. |

## Anatomy

- Row container
- Stock name
- Stock code
- Portfolio Fit Assessment Indicator
- Portfolio Attribute Label
- Holding percentage
- Market value
- Divider

## Variants

- Matched long-term stock row: observed.
- Match and mismatch assessment indicators: observed in the extracted subcomponent.
- Long-term, swing, short-term, inactive, and unclassified attribute labels: observed in the extracted subcomponent.
- Row-level mismatch composition with stock/value data: not observed.

## States

- Default matched row: observed.
- Match/mismatch assessment states: observed in `Portfolio Fit Assessment Indicator`.
- Active/inactive/unclassified attribute states: observed in `Portfolio Attribute Label`.
- Pressed/focus-visible: not observed.
- Loading, empty, disabled: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-portfolio-fit-stock-row-container-color` | `--cm-sys-color-background` | Row background | Default |
| `--cm-comp-portfolio-fit-stock-row-divider-color` | `--cm-sys-color-outline-high` | Row divider | Default |
| `--cm-comp-portfolio-fit-stock-row-width` | `--cm-sys-size-viewport-compact-width` | Row width | Default |
| `--cm-comp-portfolio-fit-stock-row-height` | `--cm-sys-size-row-compact-height` | Row height | Default |
| `--cm-comp-portfolio-fit-stock-row-padding` | `--cm-sys-spacing-md` | Row padding | Default |
| `--cm-comp-portfolio-fit-stock-row-gap` | `--cm-sys-spacing-xs` | Column gap | Default |
| `--cm-comp-portfolio-fit-stock-row-stock-column-width` | `--cm-sys-size-analytics-column-stock` | Stock column width | Default |
| `--cm-comp-portfolio-fit-stock-row-fit-column-width` | `--cm-sys-size-analytics-column-fit` | Fit column width | Default |
| `--cm-comp-portfolio-fit-stock-row-attribute-column-width` | `--cm-sys-size-analytics-column-attribute` | Attribute column width | Default |
| `--cm-comp-portfolio-fit-stock-row-value-column-width` | `--cm-sys-size-analytics-column-value` | Value column width | Default |
| `--cm-comp-portfolio-fit-stock-row-name-color` | `--cm-sys-color-on-background` | Stock name | Default |
| `--cm-comp-portfolio-fit-stock-row-code-color` | `--cm-sys-color-on-surface-muted` | Stock code | Default |
| `--cm-comp-portfolio-fit-stock-row-name-text-size` | `--cm-sys-typescale-title-md-size` | Stock name size | Default |
| `--cm-comp-portfolio-fit-stock-row-code-text-size` | `--cm-sys-typescale-body-sm-size` | Stock code size | Default |
| `--cm-comp-portfolio-fit-stock-row-match-icon-color` | `--cm-sys-color-fit-assessment-match` | Match check icon color | Matched |
| `--cm-comp-portfolio-fit-stock-row-match-icon-size` | `--cm-sys-size-icon-xxs` | Match icon size | Matched |
| `--cm-comp-portfolio-fit-stock-row-match-label-color` | `--cm-sys-color-on-background` | Match label | Matched |
| `--cm-comp-portfolio-fit-stock-row-match-label-text-size` | `--cm-sys-typescale-label-md-size` | Match label size | Matched |
| `--cm-comp-portfolio-fit-stock-row-attribute-label-container-color` | `--cm-sys-color-portfolio-long-term` | Attribute pill fill | Long-term |
| `--cm-comp-portfolio-fit-stock-row-attribute-label-color` | `--cm-sys-color-on-portfolio-long-term` | Attribute pill text | Long-term |
| `--cm-comp-portfolio-fit-stock-row-attribute-label-text-size` | `--cm-sys-typescale-label-md-size` | Attribute label size | Default |
| `--cm-comp-portfolio-fit-stock-row-attribute-label-corner-radius` | `--cm-sys-shape-corner-label` | Attribute pill radius | Default |
| `--cm-comp-portfolio-fit-stock-row-value-primary-color` | `--cm-sys-color-on-background` | Holding percent | Default |
| `--cm-comp-portfolio-fit-stock-row-value-secondary-color` | `--cm-sys-color-on-surface-subtle` | Market value | Default |
| `--cm-comp-portfolio-fit-stock-row-value-primary-text-size` | `--cm-sys-typescale-numeric-md-size` | Holding percent size | Default |
| `--cm-comp-portfolio-fit-stock-row-value-secondary-text-size` | `--cm-sys-typescale-body-sm-size` | Market value size | Default |

## Layout Rules

- Row spans 375px and is 61px tall including divider.
- Use 8px padding and 4px column gap.
- Column widths are 94px, 68px, 105px, and 80px.
- Right value column is right-aligned.
- Fit column uses the 68x20 `Portfolio Fit Assessment Indicator`.
- Attribute column uses the 105x24 `Portfolio Attribute Label`.

## Content Rules

- Stock identity uses name over code.
- Fit label is short; observed row value is `速配`, and the extracted indicator also covers `不速配`.
- Attribute label combines category and percent, such as `長期存股 100%`.
- Market value uses comma grouping.

## Accessibility Rules

- Row summary should include stock name, code, fit status, attribute, holding percentage, and market value.
- Do not rely on the red check alone to communicate match.
- If the row is interactive, expose row action separately from sort/header controls.

## Do / Don't

- Do keep row columns aligned to the header.
- Do keep the attribute pill compact.
- Don't use market movement colors for portfolio attribute pills.
- Don't wrap the row in a card.

## Implementation Notes

Use `Portfolio Fit Assessment Indicator` and `Portfolio Attribute Label` as composed subcomponents inside this row. The observed match check uses the same raw red as market-up, but it represents `matched`, not price direction; keep that distinction in copy, accessibility text, and token naming.
