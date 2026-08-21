# Portfolio Attribute Label

## Purpose

Represents a stock's portfolio attribute feature as a compact category and percentage label.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-030 | Figma `29209:159854` | `個股屬性特徵` component set | 137x248 component set with seven 105x24 variants for lit, unlit, and no-feature states. |

## Anatomy

- Label container
- Category label
- Percent value

## Variants

- Long-term active: blue filled `長期存股 100%`.
- Swing active: amber filled `波段價值 100%`.
- Short-term active: rose filled `短線價差 100%`.
- Long-term inactive: transparent container, blue category label, white `50%`.
- Swing inactive: transparent container, amber category label, white `50%`.
- Short-term inactive: transparent container, rose category label, white `50%`.
- Unclassified: gray centered `無特徵` without percent.

## States

- Active / lit: observed as filled category color with white text.
- Inactive / unlit: observed as transparent with colored category label and white percent.
- Unclassified: observed as gray text only.
- Pressed, focus-visible, disabled, loading, overflow, and wrapping states: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-portfolio-attribute-label-set-width` | `--cm-sys-size-portfolio-attribute-set-width` | Component set reference width | Documentation |
| `--cm-comp-portfolio-attribute-label-set-height` | `--cm-sys-size-portfolio-attribute-set-height` | Component set reference height | Documentation |
| `--cm-comp-portfolio-attribute-label-width` | `--cm-sys-size-portfolio-attribute-width` | Label width | Default |
| `--cm-comp-portfolio-attribute-label-height` | `--cm-sys-size-portfolio-attribute-height` | Label height | Default |
| `--cm-comp-portfolio-attribute-label-padding-x` | `--cm-sys-spacing-xs` | Horizontal padding | Default |
| `--cm-comp-portfolio-attribute-label-padding-y` | `--cm-sys-spacing-xxs` | Vertical padding | Default |
| `--cm-comp-portfolio-attribute-label-gap` | `--cm-sys-spacing-xs` | Category/percent gap | Default |
| `--cm-comp-portfolio-attribute-label-corner-radius` | `--cm-sys-shape-corner-label` | Pill radius | Default |
| `--cm-comp-portfolio-attribute-label-active-long-term-container-color` | `--cm-sys-color-portfolio-long-term` | Filled long-term surface | Active |
| `--cm-comp-portfolio-attribute-label-active-swing-container-color` | `--cm-sys-color-portfolio-swing` | Filled swing surface | Active |
| `--cm-comp-portfolio-attribute-label-active-short-term-container-color` | `--cm-sys-color-portfolio-short-term` | Filled short-term surface | Active |
| `--cm-comp-portfolio-attribute-label-active-text-color` | `--cm-sys-color-on-surface-strong` | Active label and percent | Active |
| `--cm-comp-portfolio-attribute-label-inactive-container-color` | `--cm-sys-color-transparent` | Unlit label surface | Inactive |
| `--cm-comp-portfolio-attribute-label-inactive-long-term-text-color` | `--cm-sys-color-portfolio-long-term` | Long-term category text | Inactive |
| `--cm-comp-portfolio-attribute-label-inactive-swing-text-color` | `--cm-sys-color-portfolio-swing` | Swing category text | Inactive |
| `--cm-comp-portfolio-attribute-label-inactive-short-term-text-color` | `--cm-sys-color-portfolio-short-term` | Short-term category text | Inactive |
| `--cm-comp-portfolio-attribute-label-inactive-percent-color` | `--cm-sys-color-on-surface-strong` | Percent text | Inactive |
| `--cm-comp-portfolio-attribute-label-unclassified-color` | `--cm-sys-color-portfolio-unclassified` | No-feature text | Unclassified |
| `--cm-comp-portfolio-attribute-label-text-size` | `--cm-sys-typescale-label-md-size` | Label size | Default |
| `--cm-comp-portfolio-attribute-label-line-height` | `--cm-sys-typescale-label-md-compact-line-height` | Label line height | Default |
| `--cm-comp-portfolio-attribute-label-weight` | `--cm-sys-weight-medium` | Label weight | Default |

## Layout Rules

- Use a fixed 105x24 label frame.
- Use 4px horizontal padding, 2px vertical padding, and 4px gap between category and percent.
- Use 14px radius for the filled/transparent pill frame.
- Center `無特徵` in the same frame and omit the percent value.
- Keep the label single-line until another reference defines wrapping or truncation.

## Content Rules

- Observed category labels are `長期存股`, `波段價值`, `短線價差`, and `無特徵`.
- Observed active percentage is `100%`; observed inactive percentage is `50%`.
- Do not normalize `短線價差` to `短期價差` inside this component without a product copy decision.
- Percent text belongs to the attribute label and should not be moved to the right value column.

## Accessibility Rules

- Expose both the category and percent in the accessible name, such as `長期存股，100%`.
- Do not rely on category color alone; preserve the visible text label.
- For `無特徵`, expose it as a no-feature state rather than an empty value.

## Do / Don't

- Do keep the attribute marker compact and row-friendly.
- Do keep active and inactive states visually distinct through fill versus transparent treatment.
- Don't turn these labels into large chips, cards, or legends.
- Don't reuse market movement tokens for the portfolio category colors.

## Implementation Notes

This component is the extracted form of the attribute label previously observed inside `Portfolio Fit Stock Row`. Use this component spec for future row variants instead of duplicating attribute styling in each row.
