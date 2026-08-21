# Floating Action Pill

## Purpose

Provides quick contextual actions over quote and holdings contexts without occupying the primary list flow.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-008 | Figma `25668:74952` | Right-side floating actions | `下單` primary orange pill and `設定` neutral gray pill, both 68x30 with 20px icons and 14px labels. |
| E-047 | Figma `29202:88715` | `庫存側邊按鈕` component set | Side action set shows `設定`, `編輯`, and `下單` variants. All are 68x30 with 20px icons and 14/22 white labels; neutral actions use `#7E7873`, primary order uses `#FF7800`. |
| E-086 | Figma `51034:5228` | `自選floating btn` component set | Watchlist floating action variants show a black 152x38 attached two-action group for `下單` + `編輯` and a black 76x38 edit-only pill when order is closed. Both use 20px icons, 14/22 medium white labels, 12x8 padding, 24px radius, and low 0/4/2 shadow. |

## Component Fingerprint

| Dimension | Fingerprint |
|---|---|
| Purpose / behavior | Floating quick-action controls over quote or watchlist content. Actions are compact shortcuts, not primary page form controls. |
| Anatomy | Container/pill or attached group, segment container, leading icon, label, optional divider, and optional group shadow. |
| Variants / states | Single primary pill, single neutral pill, side-action set, attached two-action watchlist group, attached edit-only pill. Pressed, focus-visible, disabled, loading, and runtime hidden-action behavior are not shown. |
| Token contract summary | Uses 20px icons, 14px medium labels with 22px line height, 4px icon-label gap, 24px pill radius. Single pills are 68x30 in orange/warm-gray; attached watchlist group is black, 38px high, 152px or 76px wide, with a 30px divider and low shadow. |
| Layout / density | Floats above content, either as individual 68x30 pills, horizontally grouped side actions, or one attached 38px-high capsule group. |
| Visual reference | Figma node previews `figma:vSr4NtEwPVs6wLpqCT5PtV#29202:88715` and `figma:vSr4NtEwPVs6wLpqCT5PtV#51034:5228`; screenshots captured during extraction. |
| Similar components reviewed | Button, Bottom Sheet Cell action row, Floating Action Pill side-action set. Developer decision: make the watchlist attached control a Floating Action Pill variant, not a separate component. |

## Anatomy

- Pill container
- Leading icon
- Label

## Variants

- Primary action: `下單`, orange container.
- Neutral setup action: `設定`, warm-gray container.
- Neutral edit action: `編輯`, warm-gray container.
- Attached watchlist group: black 152x38 capsule split into `下單` and `編輯` segments.
- Attached edit-only: black 76x38 capsule with `編輯` only when `下單` is closed.

## States

- Default primary: observed in both floating and side-action sets.
- Default neutral: observed for `設定` and `編輯`.
- Attached group default: observed for `下單` + `編輯`.
- Attached edit-only: observed as `關閉下單`.
- Pressed/focus-visible: inferred.
- Disabled/loading and attached-group pressed/disabled: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-floating-action-pill-primary-container-color` | `--cm-sys-color-primary` | Primary pill fill | Default |
| `--cm-comp-floating-action-pill-neutral-container-color` | `--cm-sys-color-action-neutral` | Neutral pill fill | Default |
| `--cm-comp-floating-action-pill-label-color` | `--cm-sys-color-on-primary` | Primary label/icon color | Default |
| `--cm-comp-floating-action-pill-neutral-label-color` | `--cm-sys-color-on-action-neutral` | Neutral label/icon color | Default |
| `--cm-comp-floating-action-pill-height` | `--cm-sys-size-control-height-sm` | Pill height | Default |
| `--cm-comp-floating-action-pill-width` | `--cm-sys-size-control-width-md` | Pill width | Default |
| `--cm-comp-floating-action-pill-padding-x` | `--cm-sys-spacing-md` | Horizontal padding | Default |
| `--cm-comp-floating-action-pill-padding-y` | `--cm-sys-spacing-xs` | Vertical padding | Default |
| `--cm-comp-floating-action-pill-gap` | `--cm-sys-spacing-xs` | Icon-label gap | Default |
| `--cm-comp-floating-action-pill-corner-radius` | `--cm-sys-shape-corner-pill` | Pill radius | Default |
| `--cm-comp-floating-action-pill-icon-size` | `--cm-sys-size-icon-sm` | Icon size | Default |
| `--cm-comp-floating-action-pill-label-text-size` | `--cm-sys-typescale-label-md-size` | Label size | Default |
| `--cm-comp-floating-action-pill-label-line-height` | `--cm-sys-typescale-label-md-line-height` | Label line height | Default |
| `--cm-comp-floating-action-pill-attached-group-width` | `--cm-sys-size-action-group-width-md` | Attached two-action group width | Attached group |
| `--cm-comp-floating-action-pill-attached-single-width` | `--cm-sys-size-action-segment-width-md` | Attached edit-only width | Attached edit-only |
| `--cm-comp-floating-action-pill-attached-height` | `--cm-sys-size-action-height-md` | Attached variant height | Attached variants |
| `--cm-comp-floating-action-pill-attached-container-color` | `--cm-sys-color-scrim` | Attached variant fill | Attached variants |
| `--cm-comp-floating-action-pill-attached-label-color` | `--cm-sys-color-on-background` | Attached label/icon color | Attached variants |
| `--cm-comp-floating-action-pill-attached-divider-color` | `--cm-sys-color-on-surface-subtle` | Divider between attached actions | Attached group |
| `--cm-comp-floating-action-pill-attached-shadow` | `--cm-sys-shadow-action-overlay-low` | Floating overlay shadow | Attached variants |
| `--cm-comp-floating-action-pill-attached-padding-x` | `--cm-sys-spacing-l` | Attached segment horizontal padding | Attached variants |
| `--cm-comp-floating-action-pill-attached-padding-y` | `--cm-sys-spacing-md` | Attached segment vertical padding | Attached variants |
| `--cm-comp-floating-action-pill-attached-gap` | `--cm-sys-spacing-xs` | Attached icon-label gap | Attached variants |
| `--cm-comp-floating-action-pill-attached-corner-radius` | `--cm-sys-shape-corner-pill` | Attached outer radius | Attached variants |
| `--cm-comp-floating-action-pill-attached-icon-size` | `--cm-sys-size-icon-sm` | Attached icon size | Attached variants |
| `--cm-comp-floating-action-pill-attached-divider-height` | `--cm-sys-size-action-divider-height-md` | Attached divider height | Attached group |

## Layout Rules

- Observed visual size is 68x30.
- Use 8px horizontal padding, 4px vertical padding, 4px gap.
- Icon is 20px.
- Radius is 24px.
- In this screen, pills are anchored right at x=289 and stacked with roughly 12px vertical separation.
- In the side-action component set, three 68px pills are laid out horizontally with 16px gaps.
- Attached watchlist variants are 38px high, use 12px horizontal and 8px vertical padding per segment, and keep 4px icon-label gaps.
- The attached two-action group is 152px wide and uses left-only radius on `下單`, right-only radius on `編輯`, plus a centered 30px divider.
- The attached edit-only variant is 76px wide and uses full 24px radius.
- Attached variants use low shadow; do not add shadow to the earlier 68x30 side-action pills unless future evidence shows it.

## Content Rules

- Observed labels are `設定`, `編輯`, and `下單`.
- Use two-character labels where possible.
- Pair labels with icons; this pattern is not text-only in the reference.
- `關閉下單` is a component property/state name; the visible label remains `編輯`.

## Accessibility Rules

- The button accessible name should match the visible action.
- Icon is decorative when paired with visible label.
- Preserve minimum hit area in implementation even if visual height is 30px.

## Do / Don't

- Do keep actions compact and overlaid.
- Do use orange only for primary intent.
- Do use the attached black group for watchlist contexts where `下單` and `編輯` are adjacent controls.
- Don't turn these into large FAB circles.
- Don't use the attached black group as a generic segmented control; it is a floating quick-action variant.
- Don't add shadow to 68x30 side-action pills from E-008/E-047 without new evidence.

## Implementation Notes

These pills visually overlap the list region. Ensure they do not cover critical row content at small viewport heights. The E-086 attached variant should be implemented as a grouped Floating Action Pill composition, not as two global Buttons, because the group owns the attached capsule, divider, and overlay shadow.
