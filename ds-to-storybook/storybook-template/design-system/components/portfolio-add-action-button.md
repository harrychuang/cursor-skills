# Portfolio Add Action Button

## Purpose

Provides compact outline actions for adding or synchronizing holdings inside the portfolio holdings flow.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-049 | Figma `29213:89332` | `Component 10` component set | 529.5x88 set with three 48px-high outline button variants: `使用截圖同步` 148px wide with 28px photo icon, `手動新增` 148px wide with 20px add icon, and `自動同步` 161.5px wide with 20px renew icon. All use orange border/text and 8px radius. |

## Anatomy

- Outline button container
- Leading icon
- Center label

## Variants

- Screenshot sync: `使用截圖同步`, 148x48, 28px photo icon.
- Manual add: `手動新增`, 148x48, 20px add icon.
- Auto sync: `自動同步`, 161.5x48, 20px renew icon.

## States

- Default outline action: observed.
- Pressed, focus-visible, hover, disabled, loading, error, and sync-in-progress states: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-portfolio-add-action-button-set-width` | `--cm-sys-size-portfolio-add-action-control-set-width` | Component set reference width | Documentation |
| `--cm-comp-portfolio-add-action-button-set-height` | `--cm-sys-size-portfolio-add-action-control-set-height` | Component set reference height | Documentation |
| `--cm-comp-portfolio-add-action-button-width` | `--cm-sys-size-portfolio-add-action-control-width-sm` | Standard button width | Default |
| `--cm-comp-portfolio-add-action-button-auto-sync-width` | `--cm-sys-size-portfolio-add-action-control-width-md` | Wider auto-sync button width | Auto sync |
| `--cm-comp-portfolio-add-action-button-height` | `--cm-sys-size-portfolio-add-action-control-height` | Button height | Default |
| `--cm-comp-portfolio-add-action-button-content-width` | `--cm-sys-size-portfolio-add-action-control-content-width` | Manual-add inner content width | Manual add |
| `--cm-comp-portfolio-add-action-button-container-color` | `--cm-sys-color-transparent` | Button fill over section surface | Default |
| `--cm-comp-portfolio-add-action-button-border-color` | `--cm-sys-color-primary` | Outline color | Default |
| `--cm-comp-portfolio-add-action-button-label-color` | `--cm-sys-color-primary` | Label color | Default |
| `--cm-comp-portfolio-add-action-button-icon-color` | `--cm-sys-color-primary` | Icon color | Default |
| `--cm-comp-portfolio-add-action-button-border-width` | `--cm-sys-size-control-border-width` | Outline width | Default |
| `--cm-comp-portfolio-add-action-button-padding-x` | `--cm-sys-spacing-xl` | Manual-add horizontal padding | Manual add |
| `--cm-comp-portfolio-add-action-button-padding-y` | `--cm-sys-spacing-l` | Manual-add vertical padding | Manual add |
| `--cm-comp-portfolio-add-action-button-compact-padding` | `--cm-sys-spacing-m` | Screenshot/auto-sync button padding | Screenshot sync, auto sync |
| `--cm-comp-portfolio-add-action-button-gap` | `--cm-sys-spacing-xs` | Icon-label gap | Screenshot sync, auto sync |
| `--cm-comp-portfolio-add-action-button-corner-radius` | `--cm-sys-shape-corner-md` | Button radius | Default |
| `--cm-comp-portfolio-add-action-button-icon-size` | `--cm-sys-size-icon-sm` | Add/renew icon size | Manual add, auto sync |
| `--cm-comp-portfolio-add-action-button-screenshot-icon-size` | `--cm-sys-size-icon-compact-lg` | Photo icon size | Screenshot sync |
| `--cm-comp-portfolio-add-action-button-label-text-size` | `--cm-sys-typescale-label-xl-size` | Label size | Default |
| `--cm-comp-portfolio-add-action-button-label-line-height` | `--cm-sys-typescale-label-xl-line-height` | Label line height | Default |
| `--cm-comp-portfolio-add-action-button-label-weight` | `--cm-sys-weight-medium` | Label weight | Default |

## Layout Rules

- Use a 48px-high orange outline button with 8px radius.
- `使用截圖同步` and `手動新增` are 148px wide.
- `自動同步` is 161.5px wide.
- Use a 28px photo icon only for screenshot sync; add and renew icons are 20px.
- Keep label and icon centered as a compact row.

## Content Rules

- Observed labels are `使用截圖同步`, `手動新增`, and `自動同步`.
- Do not add helper copy or subtitles inside the button.
- Do not replace labels with icon-only controls; all observed variants are icon plus text.

## Accessibility Rules

- Use a button role when interactive.
- The accessible name should match the visible label.
- If a sync action begins a background process, expose busy/progress state when implementation evidence exists.

## Do / Don't

- Do keep the buttons outline-only and orange.
- Do keep the add/sync actions compact and horizontally aligned when grouped.
- Don't turn these into filled primary buttons unless future evidence shows a filled state.
- Don't use generic upload, camera, or cloud sync styling if the product copy remains screenshot/manual/auto sync.

## Implementation Notes

Pressed, focus-visible, disabled, loading, permission, and sync-error treatments are not visible in the current Figma nodes. Keep those planned until a future interaction state reference is provided.
