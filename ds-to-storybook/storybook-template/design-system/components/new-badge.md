# New Badge

## Purpose

Marks a newly available bottom-sheet action without using the yellow promotional badge language.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-065 | Figma `29207:103989` | `tag_new_red` | 42x20 red badge with `New` in white Play Bold 14px, 6px horizontal padding, 2px vertical padding, and 40px radius. |
| E-064 | Figma `16405:224726` | `有new的按鈕` bottom-sheet cell variant | The badge appears above the right side of a gray bottom-sheet action row, not as a standalone promo chip or CTA. |

## Anatomy

- Red capsule container
- Latin `New` label

## Variants

- Default `New`: observed.

## States

- Default: observed.
- Pressed, focus-visible, disabled, dismissed, loading, long-label, localization, and non-red variants: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-new-badge-width` | `--cm-sys-size-status-new-width` | Badge width | Default |
| `--cm-comp-new-badge-height` | `--cm-sys-size-status-new-height` | Badge height | Default |
| `--cm-comp-new-badge-container-color` | `--cm-sys-color-status-new` | Badge fill | Default |
| `--cm-comp-new-badge-label-color` | `--cm-sys-color-on-status-new` | Label color | Default |
| `--cm-comp-new-badge-padding-x` | `--cm-sys-spacing-sm` | Horizontal padding | Default |
| `--cm-comp-new-badge-padding-y` | `--cm-sys-spacing-xxs` | Vertical padding | Default |
| `--cm-comp-new-badge-corner-radius` | `--cm-sys-shape-corner-full` | Capsule radius | Default |
| `--cm-comp-new-badge-label-typeface` | `--cm-sys-typeface-status-latin` | Latin typeface | Default |
| `--cm-comp-new-badge-label-text-size` | `--cm-sys-typescale-status-new-size` | Label size | Default |
| `--cm-comp-new-badge-label-line-height` | `--cm-sys-typescale-status-new-line-height` | Label line height | Default |
| `--cm-comp-new-badge-label-weight` | `--cm-sys-weight-bold` | Label weight | Default |

## Layout Rules

- Keep the badge 42x20 in the observed bottom-sheet action context.
- Use 6px horizontal and 2px vertical padding.
- Use a fully rounded capsule treatment.
- When placed over an action row, ensure it does not collide with the action label.

## Content Rules

- Observed copy is the English word `New`.
- Do not replace this with promo copy, fee-discount text, or warning text.
- Do not reuse Promotional Badge tokens; that component uses a yellow gradient and a different semantic role.

## Accessibility Rules

- Include `New` in the action's accessible label when it materially changes user expectation.
- Do not expose the badge as a separate interactive element unless future evidence makes it actionable.

## Do / Don't

- Do keep it small and status-like.
- Do reserve it for newly available actions.
- Don't turn it into a large banner, promo badge, warning badge, or CTA.
- Don't localize or lengthen the label without checking fit against the 42x20 frame.

## Implementation Notes

The badge uses the Play typeface and bold weight in the source. If Play is unavailable in implementation, define a project fallback explicitly instead of silently switching to PingFang TC.
