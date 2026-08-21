# Broker Import Menu

## Purpose

Provides the compact broker filter, sync/edit actions, and last-update metadata used in the inventory import area.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-060 | Figma `29199:89369` | `庫存通用元件` common inventory frame | The menu appears as one of the common inventory controls beneath the primary tabs and chevron icon set. |
| E-062 | Figma `7033:249934` | `庫存股/匯入庫存/券商選單` | 375x42 utility row on `#1E1E1E`; `全部` dropdown is 116x26 with `#B95700` outline, `同步`/`編輯` are 26px-high orange outline actions, and the timestamp stack uses `#909090` 12/14 text. Figma note says future unified height should be 42. |

## Anatomy

- Full-width menu container
- Broker dropdown trigger
- Dropdown label
- Dropdown chevron
- Sync outline action
- Edit outline action
- Last-update timestamp stack

## Variants

- Default all-broker menu with `全部`, `同步`, `編輯`, and timestamp: observed.
- Selected broker, no timestamp, syncing, edit mode, and dropdown menu-open variants: not observed.

## States

- Dropdown trigger default: observed.
- Sync action default: observed.
- Edit action default: observed.
- Last-update metadata present: observed.
- Pressed, focus-visible, disabled, loading, error, timestamp absent, and expanded dropdown menu states: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-broker-import-menu-width` | `--cm-sys-size-broker-import-control-width` | Menu width | All |
| `--cm-comp-broker-import-menu-height` | `--cm-sys-size-broker-import-control-height` | Menu height | All |
| `--cm-comp-broker-import-menu-container-color` | `--cm-sys-color-background` | Menu background | All |
| `--cm-comp-broker-import-menu-gap` | `--cm-sys-spacing-xs` | Gap between controls | All |
| `--cm-comp-broker-import-menu-padding-x` | `--cm-sys-spacing-md` | Horizontal container padding | All |
| `--cm-comp-broker-import-menu-padding-y` | `--cm-sys-spacing-icon-label-lg` | Vertical container padding | All |
| `--cm-comp-broker-import-menu-select-width` | `--cm-sys-size-broker-import-control-select-width` | Dropdown trigger width | Default |
| `--cm-comp-broker-import-menu-select-height` | `--cm-sys-size-control-height-slim` | Dropdown trigger height | Default |
| `--cm-comp-broker-import-menu-select-border-color` | `--cm-sys-color-action-outline-deep` | Dropdown trigger outline | Default |
| `--cm-comp-broker-import-menu-select-label-color` | `--cm-sys-color-on-background` | Dropdown label | Default |
| `--cm-comp-broker-import-menu-select-indicator-color` | `--cm-sys-color-primary` | Dropdown chevron | Default |
| `--cm-comp-broker-import-menu-select-indicator-width` | `--cm-sys-size-broker-import-control-icon-width` | Dropdown chevron width | Default |
| `--cm-comp-broker-import-menu-select-indicator-height` | `--cm-sys-size-broker-import-control-icon-height` | Dropdown chevron height | Default |
| `--cm-comp-broker-import-menu-action-height` | `--cm-sys-size-control-height-slim` | Sync/edit action height | Default |
| `--cm-comp-broker-import-menu-action-border-color` | `--cm-sys-color-primary` | Sync/edit action outline | Default |
| `--cm-comp-broker-import-menu-action-label-color` | `--cm-sys-color-primary` | Sync/edit label | Default |
| `--cm-comp-broker-import-menu-action-icon-color` | `--cm-sys-color-primary` | Sync/edit icon | Default |
| `--cm-comp-broker-import-menu-action-icon-size` | `--cm-sys-size-broker-import-control-action-icon` | Sync/edit icon size | Default |
| `--cm-comp-broker-import-menu-border-width` | `--cm-sys-size-control-border-width` | Control border width | Default |
| `--cm-comp-broker-import-menu-corner-radius` | `--cm-sys-shape-corner-xs` | Control radius | Default |
| `--cm-comp-broker-import-menu-control-padding-x` | `--cm-sys-spacing-sm` | Control horizontal padding | Default |
| `--cm-comp-broker-import-menu-control-padding-y` | `--cm-sys-spacing-xxs` | Control vertical padding | Default |
| `--cm-comp-broker-import-menu-action-gap` | `--cm-sys-spacing-xxs` | Action icon/label gap | Default |
| `--cm-comp-broker-import-menu-timestamp-color` | `--cm-sys-color-on-surface-quiet` | Timestamp copy | Metadata |
| `--cm-comp-broker-import-menu-timestamp-padding-start` | `--cm-sys-spacing-m` | Timestamp left padding | Metadata |
| `--cm-comp-broker-import-menu-select-label-text-size` | `--cm-sys-typescale-label-xl-size` | Dropdown label size | Default |
| `--cm-comp-broker-import-menu-select-label-line-height` | `--cm-sys-typescale-label-xl-line-height` | Dropdown label line height | Default |
| `--cm-comp-broker-import-menu-select-label-weight` | `--cm-sys-weight-regular` | Dropdown label weight | Default |
| `--cm-comp-broker-import-menu-action-label-text-size` | `--cm-sys-typescale-label-sm-size` | Sync/edit label size | Default |
| `--cm-comp-broker-import-menu-action-label-line-height` | `--cm-sys-typescale-label-sm-line-height` | Sync/edit label line height | Default |
| `--cm-comp-broker-import-menu-action-label-weight` | `--cm-sys-weight-regular` | Sync/edit label weight | Default |
| `--cm-comp-broker-import-menu-timestamp-text-size` | `--cm-sys-typescale-metadata-sm-size` | Timestamp text size | Metadata |
| `--cm-comp-broker-import-menu-timestamp-line-height` | `--cm-sys-typescale-metadata-sm-line-height` | Timestamp line height | Metadata |

## Layout Rules

- Keep the menu 375x42 and use 42px as the normative height.
- Use `#1E1E1E` background, 8px horizontal padding, 7px vertical padding, and 4px gaps.
- Keep the broker dropdown at 116x26 with a 1px `#B95700` outline and 4px radius.
- Keep sync/edit controls 26px high with 6px horizontal padding, 2px vertical padding, 2px icon/label gap, and 4px radius.
- Keep sync/edit icons at a fixed 16x16 box centered inside the action control.
- Render the dropdown chevron and sync/edit glyphs through the shared `Icon` component so Storybook JSON exports them as Figma component-backed SVG nodes, not CSS pseudo-elements or masks.
- Keep timestamp text right aligned, stacked as label plus time, and offset from preceding controls by the observed 10px left padding.
- For Storybook JSON export, keep the menu root, dropdown/action buttons, and timestamp stack as explicit auto-layout nodes. Dropdown/action labels must import as auto-width text so compact buttons preserve the browser icon/label spacing; the timestamp stack must fill the remaining row width, align its text to the end, and use column auto-layout rather than CSS grid so Figma import preserves the right-side timestamp without clipping.

## Content Rules

- Observed dropdown label is `全部`.
- Observed actions are `同步` and `編輯`.
- Observed timestamp format is two lines: `上次更新` and `108/12/20 10:35`.
- Do not add helper copy, badges, or explanatory labels to this row without new evidence.

## Accessibility Rules

- Expose the dropdown as a control with the visible broker filter label.
- Expose sync and edit as separate controls with icon plus visible label.
- Timestamp metadata should remain readable but should not be exposed as an action.
- Provide focus-visible treatment in implementation; current Figma evidence does not define it.

## Do / Don't

- Do keep this as a dense utility row, not a toolbar card.
- Do preserve the 42px height called out by the Figma note.
- Don't infer the expanded dropdown menu from the trigger alone.
- Don't replace `同步` and `編輯` with icon-only controls unless future evidence shows an icon-only variant.

## Implementation Notes

The Figma node uses positive tracking on labels and timestamp text, but broader typography tracking tokens are not extracted yet. Keep that as implementation-specific parity guidance until a larger text-style extraction defines tracking roles.
