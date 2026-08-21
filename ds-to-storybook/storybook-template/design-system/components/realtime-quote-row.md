# Realtime Quote Row

## Purpose

Displays one stock or ETF in a dense realtime quote list with identity, price, movement, event metadata, and inline trend chart.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-005 | Figma `29202:31181` | Expanded quote row | 375x79 row with event metadata, fixed price and change columns, 76x36 chart. |
| E-006 | Figma `29202:31181` and full screenshot | Market values | Red values for up movement and green values for down price. |
| E-074 | Figma `29207:96213` | `自選股_即時報價（放大版` | 375x79 enlarged quote row on `#1E1E1E` with 16x8 padding, red candlestick marker, stock identity, event badge/countdown, 64px price column, 64px change column, and 76x36 inline trend chart. |

## Anatomy

- Row container
- Candlestick marker
- Stock name
- Stock code
- Event badge
- Event countdown
- Price
- Change value
- Percent change
- Direction indicator
- Inline chart
- Divider

## Variants

- Standard row: 61px height, no event metadata.
- Expanded event row: 79px height, includes event badge and countdown.
- Enlarged watchlist event row: 79px height with red candlestick marker and inline chart, confirmed as the same Realtime Quote Row contract.
- Up movement row.
- Down movement row.

## States

- Default data row: observed.
- Event-present row: observed.
- Market up and market down: observed.
- Pressed/focus-visible: inferred for tappable rows.
- Loading, empty, suspended, and error states: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-realtime-quote-row-container-color` | `--cm-sys-color-background` | Row background | Default |
| `--cm-comp-realtime-quote-row-divider-color` | `--cm-sys-color-outline-high` | 1px row divider | Default |
| `--cm-comp-realtime-quote-row-padding-x` | `--cm-sys-spacing-screen-gutter` | Row horizontal gutter | Default |
| `--cm-comp-realtime-quote-row-padding-y` | `--cm-sys-spacing-md` | Row vertical padding | Default |
| `--cm-comp-realtime-quote-row-content-gap` | `--cm-sys-spacing-xs` | Main horizontal gap | Default |
| `--cm-comp-realtime-quote-row-identity-gap` | `--cm-sys-spacing-md` | Marker-to-identity gap | Default |
| `--cm-comp-realtime-quote-row-chart-padding-start` | `--cm-sys-spacing-screen-gutter` | Gap before inline chart | Default |
| `--cm-comp-realtime-quote-row-name-color` | `--cm-sys-color-on-background` | Stock name text | Default |
| `--cm-comp-realtime-quote-row-code-color` | `--cm-sys-color-on-surface-muted` | Stock code text | Default |
| `--cm-comp-realtime-quote-row-price-up-color` | `--cm-sys-color-market-up` | Price when up | Market up |
| `--cm-comp-realtime-quote-row-price-down-color` | `--cm-sys-color-market-down` | Price when down | Market down |
| `--cm-comp-realtime-quote-row-change-up-color` | `--cm-sys-color-market-up` | Delta and percent when up | Market up |
| `--cm-comp-realtime-quote-row-change-down-color` | `--cm-sys-color-market-down` | Delta and percent when down | Market down |
| `--cm-comp-realtime-quote-row-event-badge-container-color` | `--cm-sys-color-secondary-container` | Event badge fill | Event |
| `--cm-comp-realtime-quote-row-event-badge-label-color` | `--cm-sys-color-on-secondary-container` | Event badge label | Event |
| `--cm-comp-realtime-quote-row-event-countdown-color` | `--cm-sys-color-secondary` | Countdown text | Event |
| `--cm-comp-realtime-quote-row-candle-marker-color` | `--cm-sys-color-market-up` | Candlestick marker color | Up movement |
| `--cm-comp-realtime-quote-row-event-badge-corner-radius` | `--cm-sys-shape-corner-xxs` | Event badge radius | Event |
| `--cm-comp-realtime-quote-row-event-badge-padding-x` | `--cm-sys-spacing-xs` | Event badge horizontal padding | Event |
| `--cm-comp-realtime-quote-row-event-badge-padding-y` | `--cm-sys-spacing-none` | Event badge vertical padding | Event |
| `--cm-comp-realtime-quote-row-code-event-gap` | `--cm-sys-spacing-xxs` | Code-to-event stack gap | Event |
| `--cm-comp-realtime-quote-row-name-text-size` | `--cm-sys-typescale-title-md-size` | Stock name size | Default |
| `--cm-comp-realtime-quote-row-code-text-size` | `--cm-sys-typescale-body-sm-size` | Code size | Default |
| `--cm-comp-realtime-quote-row-price-text-size` | `--cm-sys-typescale-numeric-lg-size` | Price size | Default |
| `--cm-comp-realtime-quote-row-change-text-size` | `--cm-sys-typescale-numeric-md-size` | Change and percent size | Default |
| `--cm-comp-realtime-quote-row-event-text-size` | `--cm-sys-typescale-metadata-xs-size` | Event text size | Event |
| `--cm-comp-realtime-quote-row-price-column-width` | `--cm-sys-size-data-column-md` | Fixed price column | Default |
| `--cm-comp-realtime-quote-row-change-column-width` | `--cm-sys-size-data-column-md` | Fixed change column | Default |
| `--cm-comp-realtime-quote-row-chart-width` | `--cm-sys-size-chart-inline-width` | Inline chart width | Default |
| `--cm-comp-realtime-quote-row-chart-height` | `--cm-sys-size-chart-inline-height` | Inline chart height | Default |
| `--cm-comp-realtime-quote-row-candle-marker-wick-width` | `--cm-sys-size-candle-marker-wick-width` | Marker wick width | Up movement |
| `--cm-comp-realtime-quote-row-candle-marker-wick-height` | `--cm-sys-size-candle-marker-wick-height` | Marker wick height | Up movement |
| `--cm-comp-realtime-quote-row-candle-marker-body-width` | `--cm-sys-size-candle-marker-body-width` | Marker body width | Up movement |
| `--cm-comp-realtime-quote-row-candle-marker-body-height` | `--cm-sys-size-candle-marker-body-height` | Marker body height | Up movement |
| `--cm-comp-realtime-quote-row-compact-height` | `--cm-sys-size-row-compact-height` | Standard row height | Default |
| `--cm-comp-realtime-quote-row-expanded-height` | `--cm-sys-size-row-expanded-height` | Event row height | Event |

## Layout Rules

- Row spans full viewport width.
- Use 16px horizontal padding and 8px vertical padding.
- Identity group flexes; price and change columns are fixed at 64px each and right-aligned.
- Inline chart is 76x36 and aligned to the row center.
- Event metadata sits under stock code and keeps the row expanded to 79px.
- Candlestick marker uses a 1x27 wick and 9x7 body when the quote row uses the enlarged watchlist/event composition.
- Divider is full width and 1px.

## Content Rules

- Stock name uses Traditional Chinese display name.
- Stock code appears below name in muted text.
- Price, delta, and percent are numeric and right-aligned.
- Event badge text should be short, such as `股東會` or `除息`.

## Accessibility Rules

- If the row is tappable, expose it as one action with a combined accessible label.
- Include market direction in screen-reader text, because color alone is insufficient.
- Read numbers with labels: stock name, code, price, change, percent.

## Do / Don't

- Do keep columns fixed for visual scanning.
- Do keep market colors domain-specific.
- Don't wrap rows in cards.
- Don't center numeric values.
- Don't use generic success/error colors for quote values.

## Implementation Notes

Chart imagery in the Figma export is a raster asset. Production implementation should use a real inline chart renderer while preserving the 76x36 visual slot.
