# MyStock Utility Icon

## Purpose

Provides asset-led white utility icons used inside MyStock bottom-sheet cells and related action rows.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-065 | Figma `29207:103989` | `Frame 48096283` | 24px pen icon, 24px list icon, 24x24 boxed `彈` icon, and 42x20 New Badge support assets. |
| E-066 | Figma `29207:103647` | `icon` component set | Four 32x32 white function icons: `mystock_sun`, `mystock_sort`, `mystock_inventory`, and `mystock_order`. |

## Anatomy

- Icon viewport
- SVG/vector icon artwork
- Optional boxed text glyph for `彈`

## Variants

- `pen_p_editchosenstocl`
- `list_p_editchosenstocl`
- `mystock_bounce message`
- `mystock_sun`
- `mystock_sort`
- `mystock_inventory`
- `mystock_order`

## States

- Default white icon: observed.
- Boxed `彈` icon: observed with 1px white border and 4px radius.
- Pressed, focus-visible, disabled, loading, selected, and alternate color states: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-mystock-utility-icon-size` | `--cm-sys-size-icon-standard` | 24px utility icon size | Standard |
| `--cm-comp-mystock-utility-icon-large-size` | `--cm-sys-size-icon-xl` | 32px MyStock function icon size | Function |
| `--cm-comp-mystock-utility-icon-color` | `--cm-sys-color-on-surface-strong` | Icon fill/stroke color | Default |
| `--cm-comp-mystock-utility-icon-box-border-color` | `--cm-sys-color-on-surface-strong` | Boxed `彈` border | Boxed |
| `--cm-comp-mystock-utility-icon-box-border-width` | `--cm-sys-size-control-border-width` | Boxed `彈` border width | Boxed |
| `--cm-comp-mystock-utility-icon-box-corner-radius` | `--cm-sys-shape-corner-xs` | Boxed `彈` radius | Boxed |
| `--cm-comp-mystock-utility-icon-box-label-color` | `--cm-sys-color-on-surface-strong` | Boxed `彈` label color | Boxed |
| `--cm-comp-mystock-utility-icon-box-label-text-size` | `--cm-sys-typescale-label-xl-size` | Boxed `彈` label size | Boxed |
| `--cm-comp-mystock-utility-icon-box-label-line-height` | `--cm-sys-typescale-title-md-line-height` | Boxed `彈` label line height | Boxed |
| `--cm-comp-mystock-utility-icon-box-label-weight` | `--cm-sys-weight-regular` | Boxed `彈` label weight | Boxed |

## Layout Rules

- Use 24x24 for pen/list/bounce icons.
- Use 32x32 for MyStock function icons.
- Keep the boxed `彈` glyph centered inside a 24x24 frame with 4px radius.
- Do not scale these icons to broker-icon or bottom-navigation sizes without new evidence.

## Content Rules

- Treat variant names as asset IDs, not visible user copy, except the boxed `彈` glyph.
- Do not redraw broker, inventory, order, or sun/sort marks as generic icons.

## Accessibility Rules

- Icons used next to text can be hidden from assistive technologies.
- Icon-only uses need an accessible name supplied by the parent action.

## Do / Don't

- Do keep the icons white on dark surfaces.
- Do use the 24px or 32px size tied to the observed context.
- Don't add color-coded status meanings to these icons without future evidence.
- Don't use these as app navigation icons without source evidence.

## Implementation Notes

This is an asset-led icon set implemented through `src/components/icon`, not a standalone React component. Store the vector artwork separately from the token contract; tokens only define the frame, color role, and boxed glyph treatment.
