# Portfolio Fit Assessment Indicator

## Purpose

Communicates whether a stock matches the user's portfolio fit criteria in the portfolio fit list.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-031 | Figma `29209:159887` | `速配評估` component set | 84x64 component set with `速配` and `不速配` indicators, each 68x20. |

## Anatomy

- Indicator container
- Status icon
- Status label

## Variants

- Match: red check icon with white `速配` label.
- Mismatch: green X icon with gray `不速配` label.

## States

- Match: observed.
- Mismatch: observed.
- Pressed, focus-visible, disabled, loading, icon-only, and long-label states: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-portfolio-fit-assessment-set-width` | `--cm-sys-size-portfolio-fit-assessment-set-width` | Component set reference width | Documentation |
| `--cm-comp-portfolio-fit-assessment-set-height` | `--cm-sys-size-portfolio-fit-assessment-set-height` | Component set reference height | Documentation |
| `--cm-comp-portfolio-fit-assessment-width` | `--cm-sys-size-portfolio-fit-assessment-width` | Indicator width | Default |
| `--cm-comp-portfolio-fit-assessment-height` | `--cm-sys-size-portfolio-fit-assessment-height` | Indicator height | Default |
| `--cm-comp-portfolio-fit-assessment-padding-x` | `--cm-sys-spacing-xs` | Horizontal padding | Default |
| `--cm-comp-portfolio-fit-assessment-gap` | `--cm-sys-spacing-xs` | Icon/label gap | Default |
| `--cm-comp-portfolio-fit-assessment-corner-radius` | `--cm-sys-shape-corner-xs` | Indicator radius | Default |
| `--cm-comp-portfolio-fit-assessment-icon-size` | `--cm-sys-size-icon-xxs` | Status icon size | Default |
| `--cm-comp-portfolio-fit-assessment-match-icon-color` | `--cm-sys-color-fit-assessment-match` | Match icon color | Match |
| `--cm-comp-portfolio-fit-assessment-mismatch-icon-color` | `--cm-sys-color-fit-assessment-mismatch` | Mismatch icon color | Mismatch |
| `--cm-comp-portfolio-fit-assessment-match-label-color` | `--cm-sys-color-on-surface-strong` | Match label color | Match |
| `--cm-comp-portfolio-fit-assessment-mismatch-label-color` | `--cm-sys-color-fit-assessment-label-muted` | Mismatch label color | Mismatch |
| `--cm-comp-portfolio-fit-assessment-label-text-size` | `--cm-sys-typescale-label-md-size` | Label size | Default |
| `--cm-comp-portfolio-fit-assessment-label-line-height` | `--cm-sys-typescale-label-md-compact-line-height` | Label line height | Default |

## Layout Rules

- Use a fixed 68x20 indicator frame.
- Use 4px horizontal padding and 4px gap between icon and label.
- Use a 14px icon.
- Keep the container visually transparent unless a future reference shows a fill or border.
- Align the indicator to the fit column width used by the portfolio fit list.

## Content Rules

- Observed labels are `速配` and `不速配`.
- Match and mismatch are fit-assessment states, not market movement states.
- Do not replace the label with the icon alone.

## Accessibility Rules

- Expose the full text state, such as `速配` or `不速配`.
- Do not rely on red check or green X alone to communicate status.
- If the indicator becomes interactive, separate its action label from the passive status text.

## Do / Don't

- Do keep the indicator compact and text-led.
- Do preserve the icon plus label pair.
- Don't interpret red as error or green as success in this slot.
- Don't convert this status into a filled badge unless future evidence shows a filled container.

## Implementation Notes

The icon colors reuse raw red and green values seen elsewhere in market data, but the system tokens name them as fit-assessment match and mismatch so product semantics stay explicit.
