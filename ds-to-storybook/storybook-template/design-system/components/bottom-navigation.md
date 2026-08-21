# Bottom Navigation

## Purpose

Provides persistent primary navigation between major app destinations in the mobile trading shell.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-007 | Figma `29202:31308` | Bottom navigation | 375x49 bar, six equal destinations, active `庫存股` item on `#333333`, inactive labels `#808080`. |

## Anatomy

- Container
- Navigation item
- Icon
- Label
- Active item fill

## Variants

- Active item.
- Inactive item.

## States

- Active: observed.
- Inactive: observed.
- Pressed/focus-visible: inferred.
- Disabled/loading: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-bottom-navigation-container-color` | `--cm-sys-color-scrim` | Bar background | Default |
| `--cm-comp-bottom-navigation-height` | `--cm-sys-size-region-footer-height` | Bar height | Default |
| `--cm-comp-bottom-navigation-item-active-container-color` | `--cm-sys-color-surface-raised` | Active item fill | Active |
| `--cm-comp-bottom-navigation-item-inactive-container-color` | `--cm-sys-color-scrim` | Inactive item fill | Inactive |
| `--cm-comp-bottom-navigation-active-label-color` | `--cm-sys-color-on-surface-strong` | Active icon and label color | Active |
| `--cm-comp-bottom-navigation-inactive-label-color` | `--cm-sys-color-on-surface-subtle` | Inactive icon and label color | Inactive |
| `--cm-comp-bottom-navigation-icon-size` | `--cm-sys-size-icon-xxs` | Icon size | Default |
| `--cm-comp-bottom-navigation-label-text-size` | `--cm-sys-typescale-label-lg-size` | Label size | Default |
| `--cm-comp-bottom-navigation-label-line-height` | `--cm-sys-typescale-label-lg-line-height` | Label line height | Default |
| `--cm-comp-bottom-navigation-item-gap` | `--cm-sys-spacing-sm` | Icon-label gap | Default |
| `--cm-comp-bottom-navigation-item-padding-x` | `--cm-sys-spacing-md` | Item horizontal padding | Default |
| `--cm-comp-bottom-navigation-item-padding-y` | `--cm-sys-spacing-s` | Item vertical padding | Default |

## Layout Rules

- Use equal-width items across the full viewport.
- Visual height is 49px, excluding the 34px iOS home-indicator area.
- Each item is a vertical stack centered both ways.
- Icon-label gap is 6px.
- Item padding is 8px horizontal and 5px vertical.

## Content Rules

- Labels are concise: `庫存股`, `自選股`, `選股`, `大盤`, `動向`, `影音`.
- Do not wrap labels; keep destination names short enough for six equal columns.

## Accessibility Rules

- Use a navigation landmark where platform allows.
- Each item needs an accessible label and selected state.
- Preserve readable inactive contrast; do not reduce inactive text below the tokenized gray.

## Do / Don't

- Do use fill to indicate the active destination.
- Do keep six items compact in this shell.
- Don't add badges, tooltips, or floating labels unless a future reference shows them.
- Don't round the active item or turn each item into a card.

## Implementation Notes

The Figma asset colors icon SVGs. Implementation should pass active/inactive color through icon props or mask fills where possible.
