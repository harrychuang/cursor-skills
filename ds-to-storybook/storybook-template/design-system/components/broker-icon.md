# Broker Icon

## Purpose

Identifies a broker or the user's own holdings source in compact selector and account contexts.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-048 | Figma `29213:87255` | `icon` component set | 396x86 component set with six 46x46 icon variants: `口袋`, `我的庫存股`, `元大`, `國泰`, `新光`, and `大昌`. Variants are spaced 16px apart. |

## Anatomy

- Rounded 46x46 source container with broker/source fill
- Centered broker/source label inside the container

## Variants

- Broker source: `口袋`
- Own holdings source: `我的庫存股`, shown as `我的`
- Broker source: `元大`
- Broker source: `國泰`
- Broker source: `新光`
- Broker source: `大昌`

## States

- Default broker icon: observed.
- Own holdings icon: observed with dark text on amber logo.
- Selected, pressed, focus-visible, disabled, loading, and unavailable states: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-broker-icon-set-width` | `--cm-sys-size-broker-icon-set-width` | Component set reference width | Documentation |
| `--cm-comp-broker-icon-set-height` | `--cm-sys-size-broker-icon-set-height` | Component set reference height | Documentation |
| `--cm-comp-broker-icon-size` | `--cm-sys-size-broker-icon-size` | Icon visual box | Default |
| `--cm-comp-broker-icon-gap` | `--cm-sys-spacing-screen-gutter` | Gap between icon variants | Documentation |
| `--cm-comp-broker-icon-corner-radius` | `--cm-sys-shape-corner-full` | Rounded source container radius | Default |
| `--cm-comp-broker-icon-pocket-container-color` | `--cm-sys-color-source-pocket` | `口袋` source container fill | Pocket |
| `--cm-comp-broker-icon-owned-container-color` | `--cm-sys-color-source-owned-holdings` | `我的` source container fill | Own holdings |
| `--cm-comp-broker-icon-yuanta-container-color` | `--cm-sys-color-source-yuanta` | `元大` source container fill | Yuanta |
| `--cm-comp-broker-icon-cathay-container-color` | `--cm-sys-color-source-cathay` | `國泰` source container fill | Cathay |
| `--cm-comp-broker-icon-shinkong-container-color` | `--cm-sys-color-source-shinkong` | `新光` source container fill | Shinkong |
| `--cm-comp-broker-icon-dachang-container-color` | `--cm-sys-color-source-dachang` | `大昌` source container fill | Dachang |
| `--cm-comp-broker-icon-label-color` | `--cm-sys-color-on-surface-strong` | Label on colored broker logos | Default |
| `--cm-comp-broker-icon-owned-label-color` | `--cm-sys-color-on-secondary-container` | Label on own-holdings amber logo | Own holdings |
| `--cm-comp-broker-icon-label-text-size` | `--cm-sys-typescale-broker-icon-label-size` | Center label size | Default |
| `--cm-comp-broker-icon-label-line-height` | `--cm-sys-typescale-broker-icon-label-line-height` | Center label line height | Default |
| `--cm-comp-broker-icon-label-weight` | `--cm-sys-weight-semibold` | Center label weight | Default |

## Layout Rules

- Use a fixed 46x46 visual box.
- Keep variant spacing at 16px in broker icon sets.
- Center the label optically inside the rounded container; do not add external captions.
- Treat container fills as broker/source identity colors. Do not reuse them as portfolio category, market, or status semantics.

## Content Rules

- Use the observed short source labels: `口袋`, `我的`, `元大`, `國泰`, `新光`, `大昌`.
- Keep labels two to three Traditional Chinese characters where possible.
- Do not show the full `我的庫存股` copy inside the 46px container; the observed icon label is `我的`.

## Accessibility Rules

- If the icon acts as a selector, expose the full source name as the accessible name.
- Do not rely on logo color alone; include the broker/source name in the accessible label.
- If selected state is added later, expose it programmatically and add a visible selected treatment from new evidence.

## Do / Don't

- Do keep the icon compact and container-led.
- Do preserve broker/source colors through broker-icon container color tokens.
- Don't convert broker icons into badges, cards, avatars with subtitles, or large account tiles.
- Don't use these colors as portfolio category, market, or status semantics.

## Implementation Notes

Runtime implementations should render the broker icon as a rounded container frame with source-specific background color and a centered text label. Avoid using a separate circle SVG asset behind the text; Figma JSON import should receive a container fill/radius plus text, not a vector circle shape.

Broker labels must export as centered text with a full-width text box. Keep the label at `inline-size: 100%`, `text-align: center`, and preserve the Figma stretch hint so imported variants keep the text width as fill container.
