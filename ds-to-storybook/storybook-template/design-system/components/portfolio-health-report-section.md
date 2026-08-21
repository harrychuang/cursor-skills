# Portfolio Health Report Section

## Purpose

Presents stock health-check report details as compact dark sections after a health-check row opens or expands into detail content.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-042 | Figma `29210:26286` | `持股體檢/評價` | 375x95 valuation summary with orange title accent, gray paragraph copy, orange valuation term, and white valuation range. |
| E-043 | Figma `29210:26310` | `持股體檢/體質` | 375x286 quality section with title status and seven metric rows. |
| E-044 | Figma `29210:26525` | `持股體檢/掃雷` | 375x556 exception section with detected-count summary and nine exception rows. |

## Anatomy

- Section container
- Title accent
- Title label
- Optional title summary
- Optional valuation paragraph
- Optional metric rows
- Optional exception rows
- Row dividers

## Variants

- Valuation summary: `評價`; paragraph text with inline emphasized valuation and range.
- Quality metric list: `體質 優良`; label/value pair on the left and state text on the right.
- Exception list: `掃雷 已偵測到 7 個異常`; exception title over muted description.

## States

- Default valuation summary: observed.
- Default quality list with `優良`, `普通`, and `注意` metric states: observed.
- Default exception list with detected abnormal count: observed.
- Empty, loading, passed/no-exception, collapsed, pressed, focus-visible, and overflow states: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-portfolio-health-report-section-container-color` | `--cm-sys-color-surface` | Section background | Default |
| `--cm-comp-portfolio-health-report-section-width` | `--cm-sys-size-viewport-compact-width` | Section width | Default |
| `--cm-comp-portfolio-health-report-section-valuation-height` | `--cm-sys-size-portfolio-health-report-valuation-height` | Valuation section height | Valuation |
| `--cm-comp-portfolio-health-report-section-quality-height` | `--cm-sys-size-portfolio-health-report-quality-height` | Quality section height | Quality |
| `--cm-comp-portfolio-health-report-section-risk-height` | `--cm-sys-size-portfolio-health-report-risk-height` | Exception section height | Exception |
| `--cm-comp-portfolio-health-report-section-padding-x` | `--cm-sys-spacing-l` | Horizontal inset | Default |
| `--cm-comp-portfolio-health-report-section-padding-y` | `--cm-sys-spacing-md` | Vertical inset | Default |
| `--cm-comp-portfolio-health-report-section-content-width` | `--cm-sys-size-report-content-width` | Inner content width | Default |
| `--cm-comp-portfolio-health-report-section-content-gap` | `--cm-sys-spacing-xs` | Header/list gap | List variants |
| `--cm-comp-portfolio-health-report-section-valuation-gap` | `--cm-sys-spacing-m` | Header/body gap | Valuation |
| `--cm-comp-portfolio-health-report-section-title-gap` | `--cm-sys-spacing-s` | Accent/title gap | Default |
| `--cm-comp-portfolio-health-report-section-title-accent-color` | `--cm-sys-color-primary` | Title accent bar | Default |
| `--cm-comp-portfolio-health-report-section-title-accent-width` | `--cm-sys-size-report-title-accent-width` | Accent width | Default |
| `--cm-comp-portfolio-health-report-section-title-accent-height` | `--cm-sys-size-report-title-accent-height` | Accent height | Default |
| `--cm-comp-portfolio-health-report-section-title-color` | `--cm-sys-color-on-surface-strong` | Title label | Default |
| `--cm-comp-portfolio-health-report-section-title-text-size` | `--cm-sys-typescale-title-md-size` | Title size | Default |
| `--cm-comp-portfolio-health-report-section-title-line-height` | `--cm-sys-typescale-title-md-line-height` | Title line height | Default |
| `--cm-comp-portfolio-health-report-section-summary-muted-color` | `--cm-sys-color-on-surface-muted` | Header summary muted copy | Summary |
| `--cm-comp-portfolio-health-report-section-summary-count-color` | `--cm-sys-color-portfolio-health-note` | Detected-count number | Exception |
| `--cm-comp-portfolio-health-report-section-summary-state-high-color` | `--cm-sys-color-portfolio-health-grade-high` | High quality summary state | Quality |
| `--cm-comp-portfolio-health-report-section-summary-text-size` | `--cm-sys-typescale-title-md-size` | Header summary size | Summary |
| `--cm-comp-portfolio-health-report-section-summary-line-height` | `--cm-sys-typescale-title-md-line-height` | Header summary line height | Summary |
| `--cm-comp-portfolio-health-report-section-body-color` | `--cm-sys-color-on-surface-subtle` | Valuation body copy | Valuation |
| `--cm-comp-portfolio-health-report-section-body-emphasis-color` | `--cm-sys-color-valuation-expensive` | Valuation term emphasis | Valuation |
| `--cm-comp-portfolio-health-report-section-body-value-color` | `--cm-sys-color-on-surface-strong` | Valuation range value | Valuation |
| `--cm-comp-portfolio-health-report-section-body-text-size` | `--cm-sys-typescale-label-xl-size` | Valuation body size | Valuation |
| `--cm-comp-portfolio-health-report-section-body-line-height` | `--cm-sys-typescale-label-xl-line-height` | Valuation body line height | Valuation |
| `--cm-comp-portfolio-health-report-section-row-padding-y` | `--cm-sys-spacing-xs` | Row vertical padding | List variants |
| `--cm-comp-portfolio-health-report-section-row-leading-width` | `--cm-sys-size-portfolio-health-report-leading-column` | Metric label/value group width | Quality |
| `--cm-comp-portfolio-health-report-section-divider-color` | `--cm-sys-color-outline-inverse-subtle` | Row divider | List variants |
| `--cm-comp-portfolio-health-report-section-divider-width` | `--cm-sys-size-report-content-width` | Divider width | List variants |
| `--cm-comp-portfolio-health-report-section-divider-height` | `--cm-sys-spacing-hairline` | Divider height | List variants |
| `--cm-comp-portfolio-health-report-section-metric-label-color` | `--cm-sys-color-on-surface-muted` | Metric label | Quality |
| `--cm-comp-portfolio-health-report-section-metric-value-color` | `--cm-sys-color-on-surface-strong` | Metric value | Quality |
| `--cm-comp-portfolio-health-report-section-metric-state-high-color` | `--cm-sys-color-portfolio-health-grade-high` | `優良` state | Quality |
| `--cm-comp-portfolio-health-report-section-metric-state-neutral-color` | `--cm-sys-color-on-surface-strong` | `普通` state | Quality |
| `--cm-comp-portfolio-health-report-section-metric-state-attention-color` | `--cm-sys-color-portfolio-health-attention` | `注意` state | Quality |
| `--cm-comp-portfolio-health-report-section-metric-text-size` | `--cm-sys-typescale-label-xl-size` | Metric row text size | Quality |
| `--cm-comp-portfolio-health-report-section-metric-line-height` | `--cm-sys-typescale-label-xl-line-height` | Metric row line height | Quality |
| `--cm-comp-portfolio-health-report-section-exception-title-color` | `--cm-sys-color-portfolio-health-exception-title` | Exception title | Exception |
| `--cm-comp-portfolio-health-report-section-exception-description-color` | `--cm-sys-color-on-surface-muted` | Exception description | Exception |
| `--cm-comp-portfolio-health-report-section-exception-title-text-size` | `--cm-sys-typescale-label-xl-size` | Exception title size | Exception |
| `--cm-comp-portfolio-health-report-section-exception-title-line-height` | `--cm-sys-typescale-label-xl-line-height` | Exception title line height | Exception |
| `--cm-comp-portfolio-health-report-section-exception-description-text-size` | `--cm-sys-typescale-label-md-size` | Exception description size | Exception |
| `--cm-comp-portfolio-health-report-section-exception-description-line-height` | `--cm-sys-typescale-label-md-compact-line-height` | Exception description line height | Exception |

## Layout Rules

- Keep every section 375px wide with `#252525` surface, 12px horizontal padding, and 8px vertical padding.
- Title accent is 4x13 and sits 5px before the title label.
- Inner content width is 343px.
- Valuation summary uses a 10px gap between title and paragraph.
- Quality and exception lists use a 4px gap after the header and 1px white-8 dividers across the 343px content width.
- Quality metric rows use 4px vertical padding; the label/value group is 137px wide and the state label aligns to the right edge.
- Exception rows stack a 16px pale-yellow title above a 14px muted description.

## Content Rules

- Valuation copy may emphasize the valuation term, such as `昂貴`, in valuation orange and the range, such as `24.20 - 29.05`, in white.
- Quality metric labels are muted and end with a full-width colon, such as `上市櫃年數：`.
- Quality values are white; quality states use red for `優良`, white for `普通`, and green for `注意` in the observed sample.
- Exception summary keeps only the count highlighted; surrounding text remains muted.
- Exception titles use pale yellow and descriptions use muted gray.
- Do not insert explanatory labels, icons, progress bars, or remediation copy unless future Figma evidence adds them.

## Accessibility Rules

- Expose the section title and optional summary as the section heading.
- For quality rows, associate each metric label, value, and state in one readable row.
- For exception rows, expose title and description together; long descriptions must wrap within the 343px content width.
- Do not rely on color alone for `優良`, `普通`, `注意`, or detected exception count.

## Do / Don't

- Do keep the sections flat and dense inside the stock health-check flow.
- Do reuse valuation and health-check semantic color roles instead of market up/down roles.
- Don't turn these sections into cards, accordions, or dashboard panels without new evidence.
- Don't split exception rows into badges or warning banners.
