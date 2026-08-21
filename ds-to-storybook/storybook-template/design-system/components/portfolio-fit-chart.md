# Portfolio Fit Chart

## Purpose

Shows how a user's holdings match portfolio analysis attributes, combining a compact donut score with a detail panel for category share and stock count.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-011 | Figma `29209:160554` | Component set | Four analytics module variants: `長期存股`, `波段價值`, `短線價差`, and `空值`. |
| E-012 | Figma variable defs | Donut and bars | Category colors are blue, amber, rose, and gray. |
| E-013 | Figma context | Right detail panel | Panel, radius, padding, row text, and bars map through portfolio fit chart component tokens. |
| E-014 | Figma screenshot | Empty state | Empty variant uses gray donut ring and dash values. |

## Anatomy

- Container
- Donut chart
- Score label
- Score value
- Percent unit
- Panel pointer
- Detail panel
- Header row
- Category label column
- Market-share bar column
- Stock-count column

## Variants

- Long-term dominant: score and largest bar use `長期存股` blue.
- Swing dominant: score and largest bar use `波段價值` amber.
- Short-term dominant: score and largest bar use `短線價差` rose.
- Empty: gray ring and dash values.

## States

- Default data state: observed across three non-empty variants.
- Empty state: observed.
- Hover, pressed, focus-visible: not observed; only add if the chart becomes interactive.
- Loading and error: not observed.

## Props Contract

- `variant`: selects the dominant visual treatment: `long-term-dominant`, `swing-dominant`, `short-term-dominant`, or `empty`.
- `score`: overrides the center score; when omitted, the component derives the score from the dominant category's market share.
- `scoreLabel`: overrides only the center score label and takes precedence over `labels.score`.
- `labels`: partially overrides score, header, and category copy without changing layout.
- `data`: accepts fixed category rows with optional `marketShare`, `stockCount`, and explicit `barSize`.
- `ariaLabel`: overrides the generated group summary.
- `className`: allows composition inside analytics modules.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-portfolio-fit-chart-container-color` | `--cm-sys-color-background` | Export frame background | Default |
| `--cm-comp-portfolio-fit-chart-width` | `--cm-sys-size-analytics-module-width` | Module width | Default |
| `--cm-comp-portfolio-fit-chart-height` | `--cm-sys-size-analytics-module-height` | Module height | Default |
| `--cm-comp-portfolio-fit-chart-padding-x` | `--cm-sys-spacing-md` | Horizontal padding | Default |
| `--cm-comp-portfolio-fit-chart-padding-y` | `--cm-sys-spacing-l` | Vertical padding | Default |
| `--cm-comp-portfolio-fit-chart-gap` | `--cm-sys-spacing-md` | Donut-to-panel gap | Default |
| `--cm-comp-portfolio-fit-chart-ring-outer-size` | `--cm-sys-size-analytics-ring-outer` | Donut visual box | Default |
| `--cm-comp-portfolio-fit-chart-ring-layer-size` | `--cm-sys-size-analytics-ring-layer` | Donut segment layer | Default |
| `--cm-comp-portfolio-fit-chart-ring-long-term-color` | `--cm-sys-color-portfolio-long-term` | Long-term donut segment | Data |
| `--cm-comp-portfolio-fit-chart-ring-swing-color` | `--cm-sys-color-portfolio-swing` | Swing donut segment | Data |
| `--cm-comp-portfolio-fit-chart-ring-short-term-color` | `--cm-sys-color-portfolio-short-term` | Short-term donut segment | Data |
| `--cm-comp-portfolio-fit-chart-ring-unclassified-color` | `--cm-sys-color-portfolio-unclassified` | Empty or unclassified donut segment | Data/Empty |
| `--cm-comp-portfolio-fit-chart-score-label-color` | `--cm-sys-color-on-background` | Center label | Default |
| `--cm-comp-portfolio-fit-chart-score-empty-color` | `--cm-sys-color-on-background` | Empty score value | Empty |
| `--cm-comp-portfolio-fit-chart-score-long-term-color` | `--cm-sys-color-portfolio-long-term` | Long-term score value | Data |
| `--cm-comp-portfolio-fit-chart-score-swing-color` | `--cm-sys-color-portfolio-swing` | Swing score value | Data |
| `--cm-comp-portfolio-fit-chart-score-short-term-color` | `--cm-sys-color-portfolio-short-term` | Short-term score value | Data |
| `--cm-comp-portfolio-fit-chart-score-label-text-size` | `--cm-sys-typescale-caption-sm-size` | Score label size | Default |
| `--cm-comp-portfolio-fit-chart-score-label-line-height` | `--cm-sys-typescale-caption-sm-line-height` | Score label line height | Default |
| `--cm-comp-portfolio-fit-chart-score-value-text-size` | `--cm-sys-typescale-score-lg-size` | Score value size | Default |
| `--cm-comp-portfolio-fit-chart-score-value-line-height` | `--cm-sys-typescale-score-lg-line-height` | Score value line height | Default |
| `--cm-comp-portfolio-fit-chart-score-unit-text-size` | `--cm-sys-typescale-caption-sm-size` | Percent unit size | Default |
| `--cm-comp-portfolio-fit-chart-score-unit-line-height` | `--cm-sys-typescale-metric-sm-line-height` | Percent unit line height | Default |
| `--cm-comp-portfolio-fit-chart-panel-container-color` | `--cm-sys-color-surface-raised` | Detail panel background | Default |
| `--cm-comp-portfolio-fit-chart-panel-width` | `--cm-sys-size-analytics-panel-width` | Detail panel width | Default |
| `--cm-comp-portfolio-fit-chart-panel-padding` | `--cm-sys-spacing-md` | Detail panel padding | Default |
| `--cm-comp-portfolio-fit-chart-panel-corner-radius` | `--cm-sys-shape-corner-md` | Detail panel radius | Default |
| `--cm-comp-portfolio-fit-chart-panel-pointer-width` | `--cm-sys-size-analytics-pointer-width` | Panel pointer width | Default |
| `--cm-comp-portfolio-fit-chart-panel-pointer-height` | `--cm-sys-size-analytics-pointer-height` | Panel pointer height | Default |
| `--cm-comp-portfolio-fit-chart-header-label-color` | `--cm-sys-color-on-surface-muted` | Header text | Default |
| `--cm-comp-portfolio-fit-chart-row-label-color` | `--cm-sys-color-on-surface-strong` | Category labels | Default |
| `--cm-comp-portfolio-fit-chart-row-value-color` | `--cm-sys-color-on-surface-strong` | Percent/count text | Default |
| `--cm-comp-portfolio-fit-chart-header-text-size` | `--cm-sys-typescale-label-sm-size` | Header text size | Default |
| `--cm-comp-portfolio-fit-chart-header-line-height` | `--cm-sys-typescale-label-sm-line-height` | Header line height | Default |
| `--cm-comp-portfolio-fit-chart-row-text-size` | `--cm-sys-typescale-metric-sm-size` | Row text size | Default |
| `--cm-comp-portfolio-fit-chart-row-line-height` | `--cm-sys-typescale-metric-sm-line-height` | Row line height | Default |
| `--cm-comp-portfolio-fit-chart-row-gap` | `--cm-sys-spacing-l` | Vertical row rhythm | Default |
| `--cm-comp-portfolio-fit-chart-column-gap` | `--cm-sys-spacing-xs` | Column gap | Default |
| `--cm-comp-portfolio-fit-chart-label-column-width` | `--cm-sys-size-analytics-panel-label-width` | Category label width | Default |
| `--cm-comp-portfolio-fit-chart-bar-max-width` | `--cm-sys-size-analytics-bar-max-width` | Max bar width | Default |
| `--cm-comp-portfolio-fit-chart-bar-height` | `--cm-sys-size-analytics-bar-height` | Bar height | Default |
| `--cm-comp-portfolio-fit-chart-bar-long-term-color` | `--cm-sys-color-portfolio-long-term` | Long-term bar | Data |
| `--cm-comp-portfolio-fit-chart-bar-swing-color` | `--cm-sys-color-portfolio-swing` | Swing bar | Data |
| `--cm-comp-portfolio-fit-chart-bar-short-term-color` | `--cm-sys-color-portfolio-short-term` | Short-term bar | Data |
| `--cm-comp-portfolio-fit-chart-bar-unclassified-color` | `--cm-sys-color-portfolio-unclassified` | Unclassified bar | Data |
| `--cm-comp-portfolio-fit-chart-bar-width-lg` | `--cm-sys-size-analytics-bar-width-lg` | Observed 40-45 percent bar width | Data |
| `--cm-comp-portfolio-fit-chart-bar-width-md` | `--cm-sys-size-analytics-bar-width-md` | Observed 15 percent bar width | Data |
| `--cm-comp-portfolio-fit-chart-bar-width-min` | `--cm-sys-size-analytics-bar-width-min` | Observed 2 percent bar width | Data |

## Layout Rules

- Outer module size must use `--cm-comp-portfolio-fit-chart-width` and `--cm-comp-portfolio-fit-chart-height`; the component root remains transparent so Figma export does not add a redundant fill.
- Horizontal and vertical padding must use `--cm-comp-portfolio-fit-chart-padding-x` and `--cm-comp-portfolio-fit-chart-padding-y`.
- Donut area uses `--cm-comp-portfolio-fit-chart-ring-outer-size` and remains left-aligned.
- Detail panel width, container color, corner radius, and padding must use the corresponding `--cm-comp-portfolio-fit-chart-panel-*` tokens.
- Panel rows use `--cm-comp-portfolio-fit-chart-row-gap`.
- Bars use `--cm-comp-portfolio-fit-chart-bar-height` and max out at `--cm-comp-portfolio-fit-chart-bar-max-width`.
- Keep stock counts right-aligned in the last column.

## Content Rules

- Category labels are fixed in this order: `長期存股`, `波段價值`, `短線價差`, `無特徵`.
- Header labels are `屬性`, `市值佔比`, and `檔數`.
- Percent labels use full-width percent sign as observed, such as `45％`.
- Empty state preserves units: `-％` and `-檔`.
- Consumers may override score, header, or category labels through the `labels` prop; `scoreLabel` is retained as a direct center label override.

## Accessibility Rules

- Provide a text summary of the score and all category values.
- Do not rely on color alone; include category labels in the panel.
- If the donut is decorative because the panel repeats the data, hide only the visual paths from assistive tech and expose the summary.

## Do / Don't

- Do keep the chart compact and explanatory.
- Do keep portfolio category colors separate from market movement tokens.
- Do preserve the empty state as dash values.
- Don't add legends outside the panel.
- Don't add shadows, gradients, or oversized dashboard styling.

## Implementation Notes

Figma exports donut segments as SVG image assets. Production should render the donut from data while preserving the observed ring size, center score treatment, category colors, and adjacent detail panel structure.
