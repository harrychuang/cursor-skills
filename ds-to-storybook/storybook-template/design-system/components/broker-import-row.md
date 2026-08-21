# Broker Import Row

## Purpose

Presents one broker import source with broker identity, import capability copy, an optional promo badge, an inline inventory action, and a switch slot.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-059 | Figma `15937:219728` | `andr_券商匯入_cell/已匯入_Ai圖片匯入` | 375x132 row on `#252525` with 46px `元大` broker icon, 18px broker title, inline `新！AI圖片匯入` badge, 16px helper copy, 69x22 `查看庫存` outline action, on switch, and normalized `#3D3D3D` bottom divider. |
| E-048 | Figma `29213:87255` | Broker/source icon set | The row uses the existing 46x46 broker icon pattern rather than redefining broker artwork. |
| E-057 | Figma `23517:229465` | Promotional badge set | The row composes the extracted Promotional Badge treatment inline with the title. |
| E-078 | Figma `8134:289037` | `switch` component set | Supplies standalone Switch visuals for the row's switch slot. |

## Anatomy

- Full-width row container
- Broker icon slot
- Broker title
- Optional inline Promotional Badge
- Helper description
- Inline outline action
- Switch slot
- Bottom divider

## Variants

- Imported broker with AI image import: observed.
- Other brokers, no-promo rows, unimported rows, unsupported rows, and error rows: not observed.

## States

- Imported/on state: observed.
- Inline action default: observed.
- Switch on: observed as part of the row.
- Switch off/on visuals: supplied by standalone Switch.
- Row-specific switch disabled/loading/error, pressed row, focus-visible, sync error, unavailable broker, and long broker name states: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-broker-import-row-width` | `--cm-sys-size-broker-import-row-width` | Row width | All |
| `--cm-comp-broker-import-row-height` | `--cm-sys-size-broker-import-row-height` | Row height | All |
| `--cm-comp-broker-import-row-container-color` | `--cm-sys-color-surface` | Row background | All |
| `--cm-comp-broker-import-row-divider-color` | `--cm-sys-color-outline` | Bottom divider | All |
| `--cm-comp-broker-import-row-title-color` | `--cm-sys-color-on-surface-strong` | Broker title color | All |
| `--cm-comp-broker-import-row-helper-color` | `--cm-sys-color-on-surface-dim` | Helper copy color | All |
| `--cm-comp-broker-import-row-action-label-color` | `--cm-sys-color-primary` | Inline action label | Default |
| `--cm-comp-broker-import-row-action-border-color` | `--cm-sys-color-action-outline-deep` | Inline action outline | Default |
| `--cm-comp-broker-import-row-broker-icon-size` | `--cm-sys-size-broker-icon-size` | Broker icon slot size | All |
| `--cm-comp-broker-import-row-icon-inset-x` | `--cm-sys-size-broker-import-row-icon-inset-x` | Broker icon x position | All |
| `--cm-comp-broker-import-row-icon-inset-y` | `--cm-sys-size-broker-import-row-icon-inset-y` | Broker icon y position | All |
| `--cm-comp-broker-import-row-content-start` | `--cm-sys-size-broker-import-row-content-start` | Text stack x position | All |
| `--cm-comp-broker-import-row-title-top` | `--cm-sys-size-broker-import-row-title-top` | Title y position | All |
| `--cm-comp-broker-import-row-helper-width` | `--cm-sys-size-broker-import-row-helper-width` | Helper copy max width | All |
| `--cm-comp-broker-import-row-action-width` | `--cm-sys-size-broker-import-row-action-width` | Inline action width | Default |
| `--cm-comp-broker-import-row-action-height` | `--cm-sys-size-broker-import-row-action-height` | Inline action height | Default |
| `--cm-comp-broker-import-row-switch-width` | `--cm-sys-size-broker-import-row-switch-width` | Switch slot width | On |
| `--cm-comp-broker-import-row-switch-height` | `--cm-sys-size-broker-import-row-switch-height` | Switch slot height | On |
| `--cm-comp-broker-import-row-title-badge-gap` | `--cm-sys-spacing-xs` | Gap between title and badge | Promo |
| `--cm-comp-broker-import-row-stack-gap` | `--cm-sys-spacing-xs` | Vertical stack rhythm | All |
| `--cm-comp-broker-import-row-action-border-width` | `--cm-sys-size-control-border-width` | Inline action border width | Default |
| `--cm-comp-broker-import-row-action-corner-radius` | `--cm-sys-shape-corner-xs` | Inline action radius | Default |
| `--cm-comp-broker-import-row-title-text-size` | `--cm-sys-typescale-title-md-compact-size` | Broker title size | All |
| `--cm-comp-broker-import-row-title-line-height` | `--cm-sys-typescale-title-md-compact-line-height` | Broker title line height | All |
| `--cm-comp-broker-import-row-title-weight` | `--cm-sys-weight-regular` | Broker title weight | All |
| `--cm-comp-broker-import-row-helper-text-size` | `--cm-sys-typescale-label-xl-size` | Helper copy size | All |
| `--cm-comp-broker-import-row-helper-line-height` | `--cm-sys-typescale-label-xl-line-height` | Helper copy line height | All |
| `--cm-comp-broker-import-row-helper-weight` | `--cm-sys-weight-regular` | Helper copy weight | All |
| `--cm-comp-broker-import-row-action-label-text-size` | `--cm-sys-typescale-action-xs-size` | Inline action text size | Default |
| `--cm-comp-broker-import-row-action-label-line-height` | `--cm-sys-typescale-action-xs-line-height` | Inline action line height | Default |
| `--cm-comp-broker-import-row-action-label-weight` | `--cm-sys-weight-regular` | Inline action label weight | Default |

## Layout Rules

- Keep the row 375x132 and flat on the broker import surface.
- Place the broker icon at x=14, y=12 using the extracted Broker Icon component.
- Start the content stack at x=76, with the title baseline area beginning at y=23.
- Keep helper copy constrained to the observed 224px width so it does not collide with the switch/action area.
- Keep the action as a compact 69x22 outline control, not a full-width row button.
- Treat the switch as a row slot supplied by the standalone Switch component; do not create broker-row-specific switch artwork.

## Content Rules

- Use broker names as row titles.
- Keep helper copy direct and operational, such as `此券商不支援綁定，可手動或智能截圖編輯`.
- Use Promotional Badge only for broker import feature or fee promo messages.
- Keep `查看庫存` as the observed inline action copy for imported broker inventory access.

## Accessibility Rules

- Expose the broker name, import support status, promo text, action, and switch state in a coherent row reading order.
- The inline action must have its own accessible name and not duplicate the row's switch action.
- Use Switch for off/on state. Disabled, loading, and focus-visible behavior still need future evidence or an explicitly inferred implementation state.

## Do / Don't

- Do compose this row from Broker Icon and Promotional Badge.
- Do keep it dense and list-like with a bottom divider.
- Don't turn the row into an account card, dashboard tile, or two-column settings panel.
- Don't infer unobserved disabled, loading, focus, or sync-error switch styling from platform defaults.

## Implementation Notes

This component is a composite row. The broker icon and promo badge should come from their extracted component specs; the switch slot should receive the extracted Switch component so row-level layout and switch-level visuals remain separate.

The optional `figmaVariant` prop is export metadata only. Use it in composite stories such as `AllParts` so visually distinct child rows emit distinct `data-variant` values and the Figma importer does not dedupe them into the first `broker-import-row` component definition.
