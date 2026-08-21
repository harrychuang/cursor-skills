# Quarter Line Status Icon

## Purpose

Shows whether a stock is above the quarterly moving average condition.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-039 | Figma `29209:173867` | `icon` component set | Two 22x22 variants for `站上季線`: green X for no and red check for yes. |

## Anatomy

- Icon frame
- Status glyph

## Variants

- Above quarterly line: red check icon.
- Not above quarterly line: green X icon.

## States

- Yes / above: observed.
- No / below: observed.
- Disabled, loading, unknown, and interaction states: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-quarter-line-status-icon-set-width` | `--cm-sys-size-quarter-line-status-set-width` | Component set reference width | Documentation |
| `--cm-comp-quarter-line-status-icon-set-height` | `--cm-sys-size-quarter-line-status-set-height` | Component set reference height | Documentation |
| `--cm-comp-quarter-line-status-icon-size` | `--cm-sys-size-quarter-line-status-icon` | Icon size | Default |
| `--cm-comp-quarter-line-status-icon-above-color` | `--cm-sys-color-quarter-line-above` | Above-line icon color | Yes |
| `--cm-comp-quarter-line-status-icon-below-color` | `--cm-sys-color-quarter-line-below` | Below-line icon color | No |

## Layout Rules

- Use a fixed 22x22 icon.
- Center the icon inside the hosting cell.
- Do not add a text label inside the cell unless a future reference shows it.

## Content Rules

- Use accessible copy such as `站上季線` and `未站上季線`.
- Red check means the condition is true in this domain, not a generic error/success state.
- Green X means the condition is false in this domain, not a market-down value.

## Accessibility Rules

- Expose the condition state programmatically.
- Do not rely on color or icon shape alone.

## Do / Don't

- Do keep the icon compact.
- Don't reuse the icon as a generic validation control.
- Don't remap the colors to generic success/error semantics.
