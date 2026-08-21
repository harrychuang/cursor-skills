# Realtime Quote Tile

## Purpose

Defines the compact watchlist quote tile (`自選股_即時_方塊`) for grid-style realtime and after-hours stock summaries.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-084 | Figma `18095:175915` | `自選股_即時_方塊` component set | 787x192 frame with four 170x148 variants: `即時_有事件`, `即時_沒事件`, `盤後-三日`, and `盤後-一日`. Each tile uses `#1E1E1E`, 8px padding/gap, 4px radius, 154px content width, white stock identity, red price/change, and either a 124x44 mini chart, an event marker, three 38px weather icons, or one 38px weather icon with 40px `大買`. |

## Component Fingerprint

| Dimension | Fingerprint |
|---|---|
| Purpose / behavior | Watchlist grid tile for quick quote scanning. It is a compact tile, not the full-width Realtime Quote Row. |
| Anatomy | Tile container, top stock identity row, price/change row, bottom chart or weather area, optional event marker. |
| Variants / states | Realtime with event, realtime without event, after-hours three-day weather, after-hours one-day weather signal. Pressed, focus-visible, selected, loading, suspended, empty, and down-price variants are not shown. |
| Token contract summary | Reuses market up/down colors and secondary event color while owning 170x148 tile dimensions, 154px content width, 124x44 chart, 38px weather icon, 40px after-hours signal text, and 4px radius. |
| Layout / density | All variants are 170x148 with 8px padding and an internal 65px bottom content region. Top content stays stable so price and change remain scannable across tile variants. |
| Visual reference | Figma node preview `figma:vSr4NtEwPVs6wLpqCT5PtV#18095:175915`; get_screenshot captured 2026-06-15. |
| Similar components reviewed | Realtime Quote Row, Main Force Stock Row, Main Force Weather Indicator, Event Name Label, and Event Table Row. Decision: keep distinct as Realtime Quote Tile because geometry and bottom content are grid/tile-specific. |

## Anatomy

- Tile container
- Stock name
- Stock code
- Price direction marker
- Price value
- Change value and percent
- Mini chart
- Optional event marker
- After-hours weather icons
- After-hours signal label

## Variants

- `即時_有事件`: mini chart plus amber `除權` or `除息` event marker and `今天` date.
- `即時_沒事件`: mini chart only.
- `盤後-三日`: three weather indicators labeled `1日`, `5日`, and `20日`.
- `盤後-一日`: one weather icon paired with 40px `大買`.

## States

- Up price: observed with red marker, price, change, triangle, and percent.
- Weather sell / neutral / buy labels: observed in after-hours three-day variant with green, gray, and red labels.
- Event today: observed as amber event chip plus amber date.
- Down price, no-change, suspended, selected, pressed, focus-visible, loading, empty, and error: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-realtime-quote-tile-width` | `--cm-sys-size-quote-grid-unit-width` | Tile width | All |
| `--cm-comp-realtime-quote-tile-height` | `--cm-sys-size-quote-grid-unit-height` | Tile height | All |
| `--cm-comp-realtime-quote-tile-content-width` | `--cm-sys-size-quote-grid-unit-content-width` | Inner content width | All |
| `--cm-comp-realtime-quote-tile-bottom-height` | `--cm-sys-size-quote-grid-unit-bottom-height` | Bottom content region | All |
| `--cm-comp-realtime-quote-tile-container-color` | `--cm-sys-color-canvas-deep` | Tile fill | All |
| `--cm-comp-realtime-quote-tile-stock-name-color` | `--cm-sys-color-on-canvas-deep` | Stock name | All |
| `--cm-comp-realtime-quote-tile-stock-code-color` | `--cm-sys-color-on-canvas-deep` | Stock code | All |
| `--cm-comp-realtime-quote-tile-price-up-color` | `--cm-sys-color-market-up` | Price/change/triangle | Up |
| `--cm-comp-realtime-quote-tile-price-down-color` | `--cm-sys-color-market-down` | Price/change/triangle | Down inferred |
| `--cm-comp-realtime-quote-tile-weather-buy-color` | `--cm-sys-color-market-up` | Buy weather label | Buy |
| `--cm-comp-realtime-quote-tile-weather-sell-color` | `--cm-sys-color-market-down` | Sell weather label | Sell |
| `--cm-comp-realtime-quote-tile-weather-neutral-color` | `--cm-sys-color-on-surface-muted` | Neutral weather label | Neutral |
| `--cm-comp-realtime-quote-tile-event-container-color` | `--cm-sys-color-secondary-container` | Event chip fill | Event |
| `--cm-comp-realtime-quote-tile-event-label-color` | `--cm-sys-color-on-secondary-container` | Event chip label | Event |
| `--cm-comp-realtime-quote-tile-event-date-color` | `--cm-sys-color-secondary` | Event date label | Event |
| `--cm-comp-realtime-quote-tile-corner-radius` | `--cm-sys-shape-corner-xs` | Tile radius | All |
| `--cm-comp-realtime-quote-tile-event-corner-radius` | `--cm-sys-shape-corner-xxs` | Event chip radius | Event |
| `--cm-comp-realtime-quote-tile-padding` | `--cm-sys-spacing-md` | Tile inset | All |
| `--cm-comp-realtime-quote-tile-section-gap` | `--cm-sys-spacing-md` | Top/bottom gap | All |
| `--cm-comp-realtime-quote-tile-inline-gap` | `--cm-sys-spacing-sm` | Identity/change gap | All |
| `--cm-comp-realtime-quote-tile-tight-gap` | `--cm-sys-spacing-xs` | Chart/event and weather label gap | Bottom |
| `--cm-comp-realtime-quote-tile-chart-width` | `--cm-sys-size-quote-grid-unit-chart-width` | Mini chart width | Realtime |
| `--cm-comp-realtime-quote-tile-chart-height` | `--cm-sys-size-quote-grid-unit-chart-height` | Mini chart height | Realtime |
| `--cm-comp-realtime-quote-tile-price-marker-width` | `--cm-sys-size-quote-grid-unit-price-marker-width` | Price marker width | Price row |
| `--cm-comp-realtime-quote-tile-price-marker-height` | `--cm-sys-size-quote-grid-unit-price-marker-height` | Price marker height | Price row |
| `--cm-comp-realtime-quote-tile-direction-width` | `--cm-sys-size-quote-grid-unit-direction-width` | Triangle width | Change |
| `--cm-comp-realtime-quote-tile-direction-height` | `--cm-sys-size-quote-grid-unit-direction-height` | Triangle height | Change |
| `--cm-comp-realtime-quote-tile-weather-icon-size` | `--cm-sys-size-icon-weather-lg` | Weather icon slot | After-hours |
| `--cm-comp-realtime-quote-tile-weather-signal-text-size` | `--cm-sys-typescale-signal-display-size` | `大買` text size | One-day weather |

## Layout Rules

- Keep every tile 170x148 with 8px padding and 4px radius.
- Keep the stock name and code on the first row; name flexes and code remains right-aligned.
- Keep price, marker, change, and percent inside a 154px-wide row.
- Use the 124x44 chart only in realtime variants.
- Keep the bottom region 65px high so chart/event and weather variants align in a grid.
- Three-day weather uses three 38px icons with 11px labels underneath.
- One-day weather uses a 38px icon plus 40px `大買` text; do not shrink this into the 22px row-bound Main Force Weather Indicator type scale.

## Content Rules

- Use real stock names and numeric formatting; the source sample is `台積電 2330`, `250.0`, `2.00`, `0.81%`.
- Event chips use short labels such as `除權` or `除息`; date text is short, such as `今天`.
- Weather labels use `1日`, `5日`, and `20日` in the three-day variant.

## Accessibility Rules

- If the tile is clickable, expose the stock name/code and current price state as the accessible name or description.
- Weather icon-only content needs text alternatives, especially in the three-day variant.
- Mini chart should have a concise text alternative or be hidden if redundant with visible price/change.

## Do / Don't

- Do use this tile for grid-style watchlist quote summaries.
- Do keep it visually distinct from the full-width Realtime Quote Row.
- Don't stretch it to 375px or add row dividers.
- Don't convert after-hours weather into cards, legends, or large dashboard panels.
- Don't infer selected, loading, or down-price styling beyond documented market color roles.

## Implementation Notes

The generated Figma code references bitmap/SVG chart and weather assets from the local Figma asset server. Implementation should use the product's registered chart/weather asset pipeline rather than embedding transient localhost asset URLs.
