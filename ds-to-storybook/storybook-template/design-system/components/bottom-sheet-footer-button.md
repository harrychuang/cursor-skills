# Bottom Sheet Footer Button

## Purpose

Defines the compact primary action footer used by bottom-sheet submission flows.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-069 | Figma `16405:224793` | `button_bottom sheet` | 339x65 footer strip on `#252525` with 20px horizontal and 12px vertical padding. The inner orange action is 299x41 with 4px radius, 12x8 padding, and an 18px medium white `完成` label. |
| E-067 | Figma `16405:224755` | `加入自選股` bottom sheet | Shows the same `完成` action used as the submit control for a multi-select bottom sheet. |

## Anatomy

- Footer strip container
- Primary action button
- Centered label

## Variants

- Default `完成`: observed.
- Disabled, loading, secondary, destructive, and dual-action variants: not observed.

## States

- Default/enabled: observed.
- Pressed, focus-visible, disabled, loading, and destructive states: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-bottom-sheet-footer-button-set-width` | `--cm-sys-size-bottom-sheet-footer-submit-set-width` | Reference strip width | Documentation |
| `--cm-comp-bottom-sheet-footer-button-set-height` | `--cm-sys-size-bottom-sheet-footer-submit-set-height` | Reference strip height | Documentation |
| `--cm-comp-bottom-sheet-footer-button-control-width` | `--cm-sys-size-bottom-sheet-footer-submit-control-width` | Inner action width | Default |
| `--cm-comp-bottom-sheet-footer-button-control-height` | `--cm-sys-size-bottom-sheet-footer-submit-control-height` | Inner action height | Default |
| `--cm-comp-bottom-sheet-footer-button-container-color` | `--cm-sys-color-surface` | Footer strip fill | Default |
| `--cm-comp-bottom-sheet-footer-button-action-container-color` | `--cm-sys-color-primary` | Primary action fill | Default |
| `--cm-comp-bottom-sheet-footer-button-label-color` | `--cm-sys-color-on-primary` | Action label color | Default |
| `--cm-comp-bottom-sheet-footer-button-padding-x` | `--cm-sys-spacing-xl` | Footer strip horizontal padding | Default |
| `--cm-comp-bottom-sheet-footer-button-padding-y` | `--cm-sys-spacing-l` | Footer strip vertical padding | Default |
| `--cm-comp-bottom-sheet-footer-button-action-padding-x` | `--cm-sys-spacing-l` | Action horizontal padding | Default |
| `--cm-comp-bottom-sheet-footer-button-action-padding-y` | `--cm-sys-spacing-md` | Action vertical padding | Default |
| `--cm-comp-bottom-sheet-footer-button-action-corner-radius` | `--cm-sys-shape-corner-xs` | Action radius | Default |
| `--cm-comp-bottom-sheet-footer-button-label-text-size` | `--cm-sys-typescale-title-md-size` | Label size | Default |
| `--cm-comp-bottom-sheet-footer-button-label-line-height` | `--cm-sys-typescale-title-md-compact-line-height` | Label line height | Default |
| `--cm-comp-bottom-sheet-footer-button-label-weight` | `--cm-sys-weight-medium` | Label weight | Default |

## Layout Rules

- Keep the footer strip compact at 65px high.
- Use one centered action only. Do not split this footer into left/right actions without new evidence.
- Keep the action at 41px high with 4px corners and 18px medium label text.

## Content Rules

- Use short submission copy such as `完成`.
- Do not add helper copy or progress text inside the footer.

## Accessibility Rules

- Expose the action as a button with the visible label as its accessible name.
- When future disabled or loading states are supplied, expose those states programmatically.

## Do / Don't

- Do use this for bottom-sheet flows that collect and submit a selection.
- Don't add it to read-only, status-only, or navigation-only sheets.
- Don't restyle it as a generic app-wide primary button.

## Implementation Notes

This is a bottom-sheet footer subcomponent, not a replacement for every primary action in the app. It can be composed inside `Bottom Sheet` when the sheet has an explicit submit step.
