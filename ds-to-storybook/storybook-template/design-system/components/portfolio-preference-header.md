# Portfolio Preference Header

## Purpose

Shows the active investment preference for portfolio analysis and provides a compact action to view stocks matching that preference.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-015 | Figma `29207:159069` | Component set | Four 375x32 variants for long-term, swing, short-term, and all-operations preferences. |
| E-016 | Figma `29207:159069` | Value and action pill | Preference value uses portfolio category color; right action uses warm highlight text on raised surface. |

## Anatomy

- Container
- Leading accent
- Preference label
- Preference value
- Preference dropdown icon
- Matching-stocks action
- Action icon

## Variants

- Long-term: value text uses portfolio long-term blue.
- Swing: value text uses portfolio swing amber.
- Short-term: value text uses portfolio short-term rose.
- All operations: value text uses white.

## States

- Default selected preference: observed.
- Action default: observed.
- Expanded preference menu: not observed.
- Pressed, focus-visible, disabled, loading: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-portfolio-preference-header-container-color` | `--cm-sys-color-surface` | Header background | Default |
| `--cm-comp-portfolio-preference-header-width` | `--cm-sys-size-viewport-compact-width` | Header width | Default |
| `--cm-comp-portfolio-preference-header-height` | `--cm-sys-size-analytics-preference-header-height` | Header height | Default |
| `--cm-comp-portfolio-preference-header-horizontal-inset` | `--cm-sys-spacing-l` | Left content inset | Default |
| `--cm-comp-portfolio-preference-header-content-gap` | `--cm-sys-spacing-xs` | Gap between label, value, and icon | Default |
| `--cm-comp-portfolio-preference-header-accent-color` | `--cm-sys-color-primary` | Left accent bar | Default |
| `--cm-comp-portfolio-preference-header-accent-width` | `--cm-sys-size-analytics-preference-accent-width` | Accent width | Default |
| `--cm-comp-portfolio-preference-header-accent-height` | `--cm-sys-size-analytics-preference-accent-height` | Accent height | Default |
| `--cm-comp-portfolio-preference-header-label-color` | `--cm-sys-color-on-surface-muted` | Static label color | Default |
| `--cm-comp-portfolio-preference-header-label-text-size` | `--cm-sys-typescale-label-md-size` | Label size | Default |
| `--cm-comp-portfolio-preference-header-value-default-color` | `--cm-sys-color-on-surface-strong` | All-operations value color | Default |
| `--cm-comp-portfolio-preference-header-value-long-term-color` | `--cm-sys-color-portfolio-long-term` | Long-term value color | Selected |
| `--cm-comp-portfolio-preference-header-value-swing-color` | `--cm-sys-color-portfolio-swing` | Swing value color | Selected |
| `--cm-comp-portfolio-preference-header-value-short-term-color` | `--cm-sys-color-portfolio-short-term` | Short-term value color | Selected |
| `--cm-comp-portfolio-preference-header-icon-size` | `--cm-sys-size-icon-xxs` | Chevron icons | Default |
| `--cm-comp-portfolio-preference-header-action-container-color` | `--cm-sys-color-surface-raised` | Action pill fill | Default |
| `--cm-comp-portfolio-preference-header-action-label-color` | `--cm-sys-color-highlight-warm` | Action label/icon color | Default |
| `--cm-comp-portfolio-preference-header-action-height` | `--cm-sys-size-control-height-compact` | Action height | Default |
| `--cm-comp-portfolio-preference-header-action-padding-x` | `--cm-sys-spacing-md` | Action horizontal padding | Default |
| `--cm-comp-portfolio-preference-header-action-padding-y` | `--cm-sys-spacing-xxs` | Action vertical padding | Default |
| `--cm-comp-portfolio-preference-header-action-corner-radius` | `--cm-sys-shape-corner-xs` | Action corner radius | Default |
| `--cm-comp-portfolio-preference-header-action-label-text-size` | `--cm-sys-typescale-label-md-size` | Action label size | Default |

## Layout Rules

- Header spans 375px and is 32px high.
- Background is `#252525`.
- Left content starts 12px from the edge and top-aligns at 6px.
- Accent bar is 3x14.
- Content gap is 4px.
- Right action starts at x=241 in the observed 375px frame, with 8px horizontal and 2px vertical padding.
- Icons are 12px.

## Content Rules

- Static label is `您的投資偏好：`.
- Preference values are `長期存股`, `波段價值`, `短期價差`, or `三種操作都會用`.
- Action label is `符合偏好的股票`.
- Do not add explanatory copy inside this component.

## Accessibility Rules

- Preference value should be announced with the static label.
- The preference value control needs an expanded state only when an actual menu is implemented.
- The action pill requires a distinct accessible name, such as `查看符合偏好的股票`.
- Do not rely on value color alone; preserve the visible text label.

## Do / Don't

- Do keep the header compact.
- Do reuse portfolio category colors for the preference value.
- Do keep the right action visually secondary.
- Don't turn this into a card header or large section title.
- Don't infer dropdown menu styling without a separate reference.

## Implementation Notes

This component pairs naturally with `portfolio-fit-chart`. The observed `短期價差` label differs from the chart's `短線價差`; preserve source text per component until product copy is normalized.

Expose the selected preference on the root `data-variant` for Figma export. The exporter keys component references by `data-component` plus `data-variant`; without the variant marker, the four `AllVariants` headers collapse into one Figma component.
