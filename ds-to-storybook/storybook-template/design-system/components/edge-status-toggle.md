# Edge Status Toggle

## Purpose

Shows a compact edge-attached status control for secondary display modes, observed as `彈幕 開`.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-009 | Figma `25668:74952` | Left edge near bottom | 60x28 control, `#3D3D3D` fill, `#FFD98A` label, right-side 4px corners. |

## Anatomy

- Edge-attached container
- Mode label
- State label

## Variants

- On state: observed as `彈幕 開`.
- Off state: not observed.

## States

- On: observed.
- Off, pressed, focus-visible, disabled: inferred only.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-edge-status-toggle-container-color` | `--cm-sys-color-surface-hover` | Toggle background | On |
| `--cm-comp-edge-status-toggle-label-color` | `--cm-sys-color-highlight-warm` | Toggle text | On |
| `--cm-comp-edge-status-toggle-height` | `--cm-sys-size-control-height-xs` | Control height | Default |
| `--cm-comp-edge-status-toggle-width` | `--cm-sys-size-control-width-sm` | Control width | Default |
| `--cm-comp-edge-status-toggle-padding-x` | `--cm-sys-spacing-md` | Horizontal padding | Default |
| `--cm-comp-edge-status-toggle-padding-y` | `--cm-sys-spacing-xs` | Vertical padding | Default |
| `--cm-comp-edge-status-toggle-gap` | `--cm-sys-spacing-xxs` | Label gap | Default |
| `--cm-comp-edge-status-toggle-corner-radius` | `--cm-sys-shape-corner-xs` | Exposed side radius | Default |
| `--cm-comp-edge-status-toggle-label-text-size` | `--cm-sys-typescale-label-md-size` | Label size | Default |

## Layout Rules

- Attach to the left screen edge.
- Only right-side corners are rounded in this reference.
- Keep width compact; observed width is 60px.
- Place above the bottom navigation region.

## Content Rules

- Use a mode label plus a state label.
- Keep text short enough to avoid wrapping.

## Accessibility Rules

- Expose as a toggle with checked state.
- Accessible label should include both mode and state, for example `彈幕，開啟`.
- Do not rely on warm text color alone to communicate state.

## Do / Don't

- Do keep it secondary and edge-attached.
- Don't style it like a primary action.
- Don't center it as a page-level control.

## Implementation Notes

Future references should define the off state before adding normative off-state tokens.

Each label span should keep `data-figma-text-auto-width="true"` so Figma export imports the mode and state text as hug-content text nodes instead of fixed-width labels.
