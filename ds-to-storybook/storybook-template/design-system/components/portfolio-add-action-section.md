# Portfolio Add Action Section

## Purpose

Frames add-holding entry points as a compact dark section in the holdings flow.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-050 | Figma `29215:94535` | `Component 11` component set | 415x210 set with two 375px-wide section variants: a 375x80 dual-button row using `手動新增` and `使用截圖同步`, and a 375x82 single `新增持股` centered action. Both sit on `#252525`. |
| E-049 | Figma `29213:89332` | `Component 10` component set | Supplies the reusable 48px outline button variants used in the dual-button section. |
| E-054 | Figma `7533:257724` | `新增持股` component set | Defines the evidenced bottom sheet follow-up for the single `新增持股` entry point. |

## Anatomy

- Section surface
- Action row
- Portfolio Add Action Button instances
- Single-action icon and label

## Variants

- Dual button: `手動新增` plus `使用截圖同步`, 12px gap.
- Single add holding: centered `新增持股` with 20px add icon and 20px label.

## States

- Default dual-button section: observed.
- Default single-add section: observed.
- Single-add follow-up sheet: observed as Portfolio Add Holding Sheet.
- Pressed, focus-visible, disabled, loading, empty-source, permission-denied, screenshot-sync, and sync-error states: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-portfolio-add-action-section-set-width` | `--cm-sys-size-portfolio-add-action-section-set-width` | Component set reference width | Documentation |
| `--cm-comp-portfolio-add-action-section-set-height` | `--cm-sys-size-portfolio-add-action-section-set-height` | Component set reference height | Documentation |
| `--cm-comp-portfolio-add-action-section-width` | `--cm-sys-size-portfolio-add-action-section-width` | Section width | Default |
| `--cm-comp-portfolio-add-action-section-dual-height` | `--cm-sys-size-portfolio-add-action-section-dual-height` | Dual-button section height | Dual |
| `--cm-comp-portfolio-add-action-section-single-height` | `--cm-sys-size-portfolio-add-action-section-single-height` | Single-action section height | Single |
| `--cm-comp-portfolio-add-action-section-container-color` | `--cm-sys-color-surface` | Section surface | Default |
| `--cm-comp-portfolio-add-action-section-dual-padding-x` | `--cm-sys-spacing-xl` | Dual-button horizontal inset | Dual |
| `--cm-comp-portfolio-add-action-section-dual-padding-y` | `--cm-sys-spacing-screen-gutter` | Dual-button vertical inset | Dual |
| `--cm-comp-portfolio-add-action-section-dual-gap` | `--cm-sys-spacing-l` | Gap between dual buttons | Dual |
| `--cm-comp-portfolio-add-action-section-single-padding-x` | `--cm-sys-size-portfolio-add-action-section-single-inset-x` | Single-action horizontal inset | Single |
| `--cm-comp-portfolio-add-action-section-single-padding-y` | `--cm-sys-size-portfolio-add-action-section-single-inset-y` | Single-action vertical inset | Single |
| `--cm-comp-portfolio-add-action-section-single-gap` | `--cm-sys-spacing-icon-label-lg` | Single-action icon-label gap | Single |
| `--cm-comp-portfolio-add-action-section-single-label-text-size` | `--cm-sys-typescale-title-lg-size` | Single-action label size | Single |
| `--cm-comp-portfolio-add-action-section-single-label-line-height` | `--cm-sys-typescale-title-lg-line-height` | Single-action label line height | Single |
| `--cm-comp-portfolio-add-action-section-single-label-weight` | `--cm-sys-weight-medium` | Single-action label weight | Single |

## Layout Rules

- Use a 375px-wide section surface on `#252525`.
- Dual-button variant is 80px high with 20px horizontal padding, 16px vertical padding, and 12px button gap.
- Dual-button children flex evenly inside the row and stay 48px high.
- Single-add variant is 82px high with the `新增持股` group centered.
- Single-add icon is 20px and uses a 7px icon-label gap.

## Content Rules

- Dual-button labels are `手動新增` and `使用截圖同步`.
- Single-action label is `新增持股`.
- Do not add body copy, onboarding explanation, illustrations, or empty-state messaging inside this compact section without new evidence.

## Accessibility Rules

- Each action must be separately reachable and named by its visible label.
- The section itself should not be the only interactive target when multiple buttons are present.
- If the single-action section is implemented as a whole-row button, expose `新增持股` as the accessible name.
- When `新增持股` opens Portfolio Add Holding Sheet, move focus into the sheet and provide a reachable close control.

## Do / Don't

- Do keep the section flat on the dark surface.
- Do compose the dual variant from Portfolio Add Action Button.
- Don't convert this into a card, wizard, upload panel, or marketing empty state.
- Don't add extra add/import choices beyond the observed labels without new evidence.

## Implementation Notes

This section defines entry-point composition. The `新增持股` sheet is defined separately in Portfolio Add Holding Sheet. Screenshot picker, broker connection, permission flow, and sync progress states remain undefined until evidenced.
