# Portfolio Preferred Stock Title

## Purpose

Labels the preferred-stock list and shows the current matched-stock count and update cadence.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-034 | Figma `29209:171175` | `持股速配/偏好股票/標題` | 375x38 strip with orange accent, count title, and `每日更新` status. |

## Anatomy

- Title container
- Accent bar
- Count label
- Update label

## Variants

- Count title with update label: observed.
- Zero count, loading count, and alternate update cadence: not observed.

## States

- Default: observed.
- Loading, empty, pressed, focus-visible: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-portfolio-preferred-stock-title-container-color` | `--cm-sys-color-surface` | Title strip background | Default |
| `--cm-comp-portfolio-preferred-stock-title-width` | `--cm-sys-size-viewport-compact-width` | Title width | Default |
| `--cm-comp-portfolio-preferred-stock-title-height` | `--cm-sys-size-portfolio-preferred-title-height` | Title height | Default |
| `--cm-comp-portfolio-preferred-stock-title-padding-x` | `--cm-sys-spacing-l` | Horizontal padding | Default |
| `--cm-comp-portfolio-preferred-stock-title-padding-y` | `--cm-sys-spacing-md` | Vertical padding | Default |
| `--cm-comp-portfolio-preferred-stock-title-content-gap` | `--cm-sys-spacing-m` | Title/update spacing | Default |
| `--cm-comp-portfolio-preferred-stock-title-label-gap` | `--cm-sys-spacing-s` | Accent/title gap | Default |
| `--cm-comp-portfolio-preferred-stock-title-accent-color` | `--cm-sys-color-primary` | Accent bar | Default |
| `--cm-comp-portfolio-preferred-stock-title-accent-width` | `--cm-sys-size-portfolio-preferred-title-accent-width` | Accent width | Default |
| `--cm-comp-portfolio-preferred-stock-title-accent-height` | `--cm-sys-size-portfolio-preferred-title-accent-height` | Accent height | Default |
| `--cm-comp-portfolio-preferred-stock-title-label-color` | `--cm-sys-color-on-surface-strong` | Count label | Default |
| `--cm-comp-portfolio-preferred-stock-title-update-color` | `--cm-sys-color-on-surface-subtle` | Update label | Default |
| `--cm-comp-portfolio-preferred-stock-title-label-text-size` | `--cm-sys-typescale-label-xl-size` | Count label size | Default |
| `--cm-comp-portfolio-preferred-stock-title-update-text-size` | `--cm-sys-typescale-label-md-size` | Update label size | Default |

## Layout Rules

- Use a 375x38 strip on the dark surface.
- Use 12px horizontal and 8px vertical padding.
- Accent is 4x13 and sits 5px before the count label.
- Keep the update label right-aligned within the strip.

## Content Rules

- Observed title format is `符合偏好的股票：56檔`.
- Observed update copy is `每日更新`.
- Do not add explanatory copy or icons in this row.

## Accessibility Rules

- Expose the count and update cadence as one readable section summary.
- Do not rely on the orange accent to communicate the section purpose.

## Do / Don't

- Do keep this as a compact section title.
- Don't turn it into a card header or promotional heading.
