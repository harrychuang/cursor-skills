# Portfolio Fit Detail Table

## Purpose

Displays the scoring criteria behind a stock's portfolio fit assessment.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-033 | Figma `29209:162730` | Detail table inside `持股速配/長期存股/股票彈窗` | Header and rows use fixed 171/100/64 columns with 4px gaps. |
| E-072 | Figma `29209:162952` | `持股速配/股票彈窗/項目表頭列表` | Standalone 375x36 header row on `#252525` with 16px horizontal and 8px vertical padding, 4px column gap, muted 14px labels, and fixed 171/100/64 columns. |
| E-073 | Figma `29209:163029` | `持股速配` detail row set | 407x136 set with two 375x48 row variants: default row `連續配息年數` / `27年` / `97`, and info row `配息穩定` with 14px info icon, empty performance column, and `97` score. |

## Anatomy

- Table container
- Header row
- Item column
- Individual performance column
- Score column
- Detail row
- Optional info icon

## Variants

- Header row: `項目`, `個股表現`, `得分`.
- Default detail row: item label, individual performance value, score.
- Info detail row: item label with 14px info icon, empty individual performance cell, score.

## States

- Default high-score row: observed.
- Info row with icon: observed.
- Score threshold variants, tooltip open, pressed, focus-visible, empty, loading, and row divider states: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-portfolio-fit-detail-table-container-color` | `--cm-sys-color-surface` | Table background | Default |
| `--cm-comp-portfolio-fit-detail-table-set-width` | `--cm-sys-size-portfolio-fit-detail-set-width` | Detail row set reference width | Documentation |
| `--cm-comp-portfolio-fit-detail-table-set-height` | `--cm-sys-size-portfolio-fit-detail-set-height` | Detail row set reference height | Documentation |
| `--cm-comp-portfolio-fit-detail-table-width` | `--cm-sys-size-viewport-compact-width` | Table width | Default |
| `--cm-comp-portfolio-fit-detail-table-header-height` | `--cm-sys-size-portfolio-fit-detail-header-height` | Header row height | Header |
| `--cm-comp-portfolio-fit-detail-table-header-padding-x` | `--cm-sys-spacing-screen-gutter` | Header horizontal padding | Header |
| `--cm-comp-portfolio-fit-detail-table-header-padding-y` | `--cm-sys-spacing-md` | Header vertical padding | Header |
| `--cm-comp-portfolio-fit-detail-table-row-height` | `--cm-sys-size-portfolio-fit-detail-row-height` | Detail row height | Default |
| `--cm-comp-portfolio-fit-detail-table-row-padding-x` | `--cm-sys-spacing-screen-gutter` | Row horizontal padding | Default |
| `--cm-comp-portfolio-fit-detail-table-row-padding-y` | `--cm-sys-spacing-l` | Row vertical padding | Default |
| `--cm-comp-portfolio-fit-detail-table-column-gap` | `--cm-sys-spacing-xs` | Column gap | Default |
| `--cm-comp-portfolio-fit-detail-table-label-column-width` | `--cm-sys-size-portfolio-fit-detail-label-column` | Item column width | Default |
| `--cm-comp-portfolio-fit-detail-table-value-column-width` | `--cm-sys-size-portfolio-fit-detail-value-column` | Individual performance column width | Default |
| `--cm-comp-portfolio-fit-detail-table-score-column-width` | `--cm-sys-size-portfolio-fit-detail-score-column` | Score column width | Default |
| `--cm-comp-portfolio-fit-detail-table-header-label-color` | `--cm-sys-color-on-surface-subtle` | Header text | Header |
| `--cm-comp-portfolio-fit-detail-table-row-label-color` | `--cm-sys-color-on-surface-strong` | Item label text | Default |
| `--cm-comp-portfolio-fit-detail-table-value-color` | `--cm-sys-color-portfolio-fit-metric-value` | Individual performance text | Default |
| `--cm-comp-portfolio-fit-detail-table-score-color` | `--cm-sys-color-portfolio-fit-score-high` | Score text | High score |
| `--cm-comp-portfolio-fit-detail-table-header-text-size` | `--cm-sys-typescale-label-md-size` | Header text size | Header |
| `--cm-comp-portfolio-fit-detail-table-header-line-height` | `--cm-sys-typescale-label-md-compact-line-height` | Header line height | Header |
| `--cm-comp-portfolio-fit-detail-table-row-text-size` | `--cm-sys-typescale-date-md-size` | Row text size | Default |
| `--cm-comp-portfolio-fit-detail-table-row-line-height` | `--cm-sys-typescale-date-md-line-height` | Row line height | Default |
| `--cm-comp-portfolio-fit-detail-table-info-icon-size` | `--cm-sys-size-icon-xxs` | Info icon size | Info row |
| `--cm-comp-portfolio-fit-detail-table-info-icon-color` | `--cm-sys-color-on-surface-subtle` | Info icon color | Info row |

## Layout Rules

- Table width is 375px.
- Header is 36px high with 16px horizontal padding and 8px vertical padding.
- Detail rows use 16px horizontal padding, 12px vertical padding, and a 48px row rhythm.
- Column widths are 171px, 100px, and 64px with 4px gaps.
- Individual performance and score values are right-aligned.
- Keep the info icon inline after the item label with a 4px gap.

## Content Rules

- Observed header labels are `項目`, `個股表現`, and `得分`.
- Observed item labels include `連續配息年數` and `配息穩定`.
- Observed individual performance values include `27年`, `3.65%`, `4.7`, and `1.2`.
- Observed score value is `97`; score threshold color mapping beyond this high-score red is not defined yet.
- Empty individual performance cells are allowed when the row uses an info icon.

## Accessibility Rules

- Associate each detail value with its header label when rendered as a table or table-like list.
- Info icons need an accessible name and tooltip/dialog target when implemented.
- Do not rely on red score color alone to communicate score quality.

## Do / Don't

- Do preserve the three fixed columns for scanability.
- Do keep scores and performance values right-aligned.
- Don't add row cards, badges, or progress bars inside this table without new evidence.
- Don't infer low/medium score colors from the high-score example.

## Implementation Notes

The detail table is embedded in `Portfolio Fit Stock Sheet`, but its fixed-column scoring pattern is reusable for other portfolio fit sheet variants.
