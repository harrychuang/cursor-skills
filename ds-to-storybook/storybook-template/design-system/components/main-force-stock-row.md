# Main Force Stock Row

## Purpose

Displays one stock in the `主力籌碼` secondary market view with identity, main-force weather, buy-volume metric, and trade tag.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-076 | Figma `29207:95615` | `庫存股/看盤盤後/主力籌碼/股票列表` | 375x61 row on `#1E1E1E` with 8px padding, 4px gaps, stock identity, 98px weather indicator, 79px right-aligned volume/rate column, 76px trade-tag slot, and full-width `#4B4B4B` divider. |
| E-075 | Figma `29207:95624` | Main-force trade tag | Row composes the 50x24 `隔日沖` / `短沖` / empty trade tag. |
| E-077 | Figma `29207:97253` | Main-force weather indicator | Row composes the 98px weather indicator. |

## Anatomy

- Row container
- Stock identity column
- Main Force Weather Indicator
- Buy-volume value
- Buy-volume rate
- Main Force Trade Tag
- Divider

## Variants

- Buy signal row: observed with `大買`, red volume, muted rate, and `隔日沖` tag.
- Short/empty tag variants: inherited from Main Force Trade Tag.
- Three-day weather variant: inherited from Main Force Weather Indicator.

## States

- Default data row: observed.
- Pressed/focus-visible, selected, loading, empty, error, and no-weather states: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-main-force-stock-row-width` | `--cm-sys-size-main-force-row-width` | Row width | Default |
| `--cm-comp-main-force-stock-row-height` | `--cm-sys-size-main-force-row-height` | Row height | Default |
| `--cm-comp-main-force-stock-row-container-color` | `--cm-sys-color-background` | Row background | Default |
| `--cm-comp-main-force-stock-row-divider-color` | `--cm-sys-color-outline-high` | Divider | Default |
| `--cm-comp-main-force-stock-row-padding-x` | `--cm-sys-spacing-md` | Horizontal padding | Default |
| `--cm-comp-main-force-stock-row-padding-y` | `--cm-sys-spacing-md` | Vertical padding | Default |
| `--cm-comp-main-force-stock-row-content-gap` | `--cm-sys-spacing-xs` | Inter-column gap | Default |
| `--cm-comp-main-force-stock-row-weather-column-width` | `--cm-sys-size-main-force-row-weather-column` | Weather column width | Default |
| `--cm-comp-main-force-stock-row-value-column-width` | `--cm-sys-size-main-force-row-value-column` | Volume/rate column width | Default |
| `--cm-comp-main-force-stock-row-tag-slot-width` | `--cm-sys-size-main-force-row-tag-slot` | Trade-tag slot width | Default |
| `--cm-comp-main-force-stock-row-tag-slot-padding-x` | `--cm-sys-spacing-l-plus` | Tag slot horizontal inset | Default |
| `--cm-comp-main-force-stock-row-name-color` | `--cm-sys-color-on-background` | Stock name | Default |
| `--cm-comp-main-force-stock-row-code-color` | `--cm-sys-color-on-surface-muted` | Stock code | Default |
| `--cm-comp-main-force-stock-row-volume-color` | `--cm-sys-color-main-force-buy` | Main-force volume value | Buy |
| `--cm-comp-main-force-stock-row-rate-color` | `--cm-sys-color-on-surface-medium` | Main-force rate value | Default |
| `--cm-comp-main-force-stock-row-name-text-size` | `--cm-sys-typescale-title-md-size` | Stock name size | Default |
| `--cm-comp-main-force-stock-row-name-line-height` | `--cm-sys-typescale-title-md-line-height` | Stock name line height | Default |
| `--cm-comp-main-force-stock-row-code-text-size` | `--cm-sys-typescale-body-sm-size` | Stock code size | Default |
| `--cm-comp-main-force-stock-row-code-line-height` | `--cm-sys-typescale-body-sm-line-height` | Stock code line height | Default |
| `--cm-comp-main-force-stock-row-volume-text-size` | `--cm-sys-typescale-numeric-lg-size` | Volume value size | Buy |
| `--cm-comp-main-force-stock-row-volume-line-height` | `--cm-sys-typescale-numeric-lg-line-height` | Volume value line height | Buy |
| `--cm-comp-main-force-stock-row-rate-text-size` | `--cm-sys-typescale-body-sm-size` | Rate size | Default |
| `--cm-comp-main-force-stock-row-rate-line-height` | `--cm-sys-typescale-body-sm-line-height` | Rate line height | Default |

## Layout Rules

- Row is 375x61 with 8px padding on all sides.
- Use 4px gaps between columns.
- Stock identity flexes, while weather, value, and trade-tag slots stay fixed at 98px, 79px, and 76px.
- Value column is right-aligned.
- Trade tag remains centered within the 76px slot with 13px horizontal inset.
- Divider is full width and 1px high.

## Content Rules

- Stock name and code stack vertically.
- Volume uses grouped thousands, such as `3,767`.
- Rate appears below the volume, such as `10.2%`.
- Trade tag must remain visible even when empty.

## Accessibility Rules

- Expose row as one navigable stock item when tappable.
- Include stock name, code, weather signal, volume, rate, and trade tag in the accessible label.
- For icon-only three-day weather, include text equivalents for all icons.

## Do / Don't

- Do compose the row from Main Force Weather Indicator and Main Force Trade Tag.
- Do keep the row flat with a divider.
- Don't reuse Portfolio Fit Stock Row; this row has different columns and semantics.
- Don't turn main-force weather into a large chart or card inside the list row.

## Implementation Notes

The `主力籌碼` row lives under the existing Market Filter Tab Strip secondary view. Header labels and sort behavior for this view are not yet extracted.
