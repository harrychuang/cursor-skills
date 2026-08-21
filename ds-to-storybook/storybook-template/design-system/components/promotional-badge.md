# Promotional Badge

## Purpose

Highlights compact promotional or fee-discount messages without behaving as a primary action.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-057 | Figma `23517:229465` | `宣傳用` component set | 165x134 component set with three 23px-high badges: `AI圖片快速匯入` 100px, `手續費2.8折` 82px, and `VIP專屬手續費2.2折` 125px. |
| E-059 | Figma `15937:219728` | Broker import row title area | Row composes an inline promo badge after the broker title, using the same yellow gradient, border, and compact text treatment. |

## Anatomy

- Rounded badge container
- 1px pale-yellow outline
- Yellow horizontal gradient fill
- Centered text label

## Variants

- Default import promo: `AI圖片快速匯入`
- Fee discount: `手續費2.8折`
- VIP fee discount: `VIP專屬手續費2.2折`
- Inline row promo: `新！AI圖片匯入`

## States

- Default: observed.
- Fee emphasis: observed with semibold label.
- VIP emphasis: observed with semibold label.
- Pressed, focus-visible, disabled, loading, and dismissible states: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-promotional-badge-set-width` | `--cm-sys-size-promo-badge-set-width` | Component set reference width | Documentation |
| `--cm-comp-promotional-badge-set-height` | `--cm-sys-size-promo-badge-set-height` | Component set reference height | Documentation |
| `--cm-comp-promotional-badge-default-width` | `--cm-sys-size-promo-badge-width-md` | Default import promo width | Default |
| `--cm-comp-promotional-badge-fee-width` | `--cm-sys-size-promo-badge-width-sm` | Fee discount promo width | Fee |
| `--cm-comp-promotional-badge-vip-width` | `--cm-sys-size-promo-badge-width-lg` | VIP discount promo width | VIP |
| `--cm-comp-promotional-badge-height` | `--cm-sys-size-promo-badge-height` | Badge height | All |
| `--cm-comp-promotional-badge-gradient-start-color` | `--cm-sys-color-promo-gradient-start` | Gradient start | All |
| `--cm-comp-promotional-badge-gradient-end-color` | `--cm-sys-color-promo-gradient-end` | Gradient end | All |
| `--cm-comp-promotional-badge-border-color` | `--cm-sys-color-promo-border` | Outline color | All |
| `--cm-comp-promotional-badge-label-color` | `--cm-sys-color-on-promo` | Label color on yellow fill | All |
| `--cm-comp-promotional-badge-border-width` | `--cm-sys-size-control-border-width` | Outline width | All |
| `--cm-comp-promotional-badge-padding-x` | `--cm-sys-spacing-md` | Horizontal inset | All |
| `--cm-comp-promotional-badge-padding-y` | `--cm-sys-spacing-xxs-compact` | Vertical inset | All |
| `--cm-comp-promotional-badge-gap` | `--cm-sys-spacing-xxs` | Reserved text/icon gap if a future source proves an icon | Documentation |
| `--cm-comp-promotional-badge-corner-radius` | `--cm-sys-shape-corner-md` | 8px badge radius | All |
| `--cm-comp-promotional-badge-label-text-size` | `--cm-sys-typescale-caption-sm-size` | 12px label size | All |
| `--cm-comp-promotional-badge-label-line-height` | `--cm-sys-typescale-caption-sm-line-height` | Label line height | All |
| `--cm-comp-promotional-badge-default-label-weight` | `--cm-sys-weight-medium` | Default import label weight | Default |
| `--cm-comp-promotional-badge-emphasis-label-weight` | `--cm-sys-weight-semibold` | Fee and VIP label weight | Fee, VIP |

## Layout Rules

- Keep badge height fixed at 23px.
- Use the observed width contract for known labels instead of stretching to a full row.
- In rows, place the badge inline with the title and keep the surrounding row layout responsible for truncation.
- Do not add icons, shadows, glow, or extra padding unless future evidence introduces them.

## Content Rules

- Keep labels short and promotional; do not use this badge for destructive, validation, or market-movement states.
- Use Traditional Chinese copy from the source context.
- Treat `AI` capitalization as display copy; do not replace it with generic "smart" or "auto" wording.

## Accessibility Rules

- If the badge is informational, expose it as text in the row or group accessible name.
- If a future badge becomes interactive, add a separate interactive state extraction before using button semantics.
- Preserve sufficient contrast between yellow fill and dark label.

## Do / Don't

- Do keep the badge compact, rounded, and text-led.
- Do reuse it inside broker import rows when the promo is inline with broker identity.
- Don't turn promo badges into CTA buttons, chips with icons, large banners, or floating marketing tags.
- Don't map the yellow gradient to warning, error, or market semantics.

## Implementation Notes

CSS implementations should use the two gradient tokens for the badge fill and the border token for the outline. Component specs can choose a fixed width for the known label variants or allow content sizing only after verifying long-label behavior with new evidence.
