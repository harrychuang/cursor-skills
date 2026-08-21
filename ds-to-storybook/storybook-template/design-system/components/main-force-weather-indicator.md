# Main Force Weather Indicator

## Purpose

Shows compact one-day or three-day main-force weather signals inside the `主力籌碼` quote list.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-077 | Figma `29207:97253` | `籌碼天氣` component set | 262x71 component set with 98px-wide one-day and three-day variants. One-day variant uses a 30px weather icon plus red 22px `大買`; three-day variant shows three 30px weather icons in a 98px slot. |

## Anatomy

- Weather indicator container
- One to three weather icons
- Optional signal label

## Variants

- One-day weather: 30px icon plus `大買` label.
- Three-day weather: three 30px icons centered in the same 98px width.

## States

- One-day buy signal: observed.
- Three-day icon sequence: observed.
- Other signal labels, neutral/sell colors, loading, disabled, and tooltip states: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-main-force-weather-set-width` | `--cm-sys-size-main-force-weather-set-width` | Component set reference width | Documentation |
| `--cm-comp-main-force-weather-set-height` | `--cm-sys-size-main-force-weather-set-height` | Component set reference height | Documentation |
| `--cm-comp-main-force-weather-width` | `--cm-sys-size-main-force-weather-width` | Indicator width | All |
| `--cm-comp-main-force-weather-one-day-height` | `--cm-sys-size-main-force-weather-one-day-height` | One-day indicator height | One-day |
| `--cm-comp-main-force-weather-three-day-height` | `--cm-sys-size-main-force-weather-three-day-height` | Three-day indicator height | Three-day |
| `--cm-comp-main-force-weather-icon-size` | `--cm-sys-size-main-force-weather-icon` | Weather icon size | All |
| `--cm-comp-main-force-weather-label-color` | `--cm-sys-color-main-force-buy` | Buy label color | Buy |
| `--cm-comp-main-force-weather-gap` | `--cm-sys-spacing-xs` | Icon/label or icon/icon gap | All |
| `--cm-comp-main-force-weather-padding-x` | `--cm-sys-spacing-m` | One-day horizontal inset | One-day |
| `--cm-comp-main-force-weather-label-text-size` | `--cm-sys-typescale-signal-lg-size` | Signal label size | One-day |
| `--cm-comp-main-force-weather-label-line-height` | `--cm-sys-typescale-signal-lg-line-height` | Signal label line height | One-day |
| `--cm-comp-main-force-weather-label-weight` | `--cm-sys-weight-regular` | Signal label weight | One-day |

## Layout Rules

- Keep the weather slot 98px wide.
- Use 30px weather icons.
- One-day variant uses a 4px icon/label gap and 10px horizontal inset.
- Three-day variant centers three 30px icons with 4px gaps.

## Content Rules

- Observed one-day label is `大買`.
- Three-day variant is icon-only; do not add a text label without new evidence.

## Accessibility Rules

- Provide an accessible text equivalent for the weather icons, especially the three-day icon-only variant.
- Include the time horizon in the accessible label: one-day or three-day.

## Do / Don't

- Do keep the indicator inline and row-bound.
- Do preserve the 98px slot so quote-list columns remain aligned.
- Don't expand weather into a card, legend, or explanatory panel in the row.
- Don't treat red `大買` as generic price-up text; it is a main-force signal.

## Implementation Notes

The weather icons are asset-led in Figma. Production implementation should reuse approved weather assets rather than redrawing them as generic emoji-like icons.
