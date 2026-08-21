# Stock Calendar Cell

## Purpose

Shows one 57x62 market-return day cell inside Stock Calendar. Use it for daily return cells, break-even cells, no-market cells, and structural empty cells in the return calendar grid, not as a generic date picker day, event marker, or standalone KPI tile.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-093 | Figma `46882:50259` | `日曆小格子` component set | 404x190 component set with 57x62 variants for `empty`, `red`, `green`, `zero`, and `沒開盤`. Selected `Y` variants exist for red, green, zero, and no-market cells. Red/green cells keep the 30% wash and add a 1px red/green border when selected; zero and no-market selected cells use a 1px white border. |

## Component Fingerprint

| Dimension | Fingerprint |
|---|---|
| Purpose / behavior | Calendar-grid subcomponent for a single daily market-return cell. It is not the full Stock Calendar module, a Relative Date Label, an Event Table Row, or a generic Calendar Grid cell. |
| Anatomy | Container, day number, amount value, rate value, empty outline, selected border, and market/no-market/zero container state. |
| Variants / states | Empty unselected, red unselected/selected, green unselected/selected, zero unselected/selected, and no-market unselected/selected are observed. Empty selected, hover, pressed, focus-visible, disabled, loading, error, weekly summary, and high-intensity calendar-level highlight are not shown in this node. |
| Token contract summary | 57x62 cell, 8px radius, 1px border, 49px content width, 4px horizontal text inset, 4px day-number top inset, 26px amount stack top offset, Roboto 12px numeric type, compact green-tinted text shadow, red/green 30% fills, neutral `#414141` zero fill normalized to market-flat container, no-market `#333333` fill, and selected borders. |
| Layout / density | Dense fixed cell. Day number sits top-right in Figma geometry, amount/rate stack begins near y=26, and all content is right-aligned within the 49px content width. |
| Visual reference | Figma node preview `figma:vSr4NtEwPVs6wLpqCT5PtV#46882:50259`; get_screenshot captured 2026-06-17. |
| Similar components reviewed | Stock Calendar, Relative Date Label, Event Table Row, Return Today Button, and implementation-derived Calendar Grid tokens. Decision: keep distinct as a Stock Calendar subcomponent; the full Stock Calendar composes it, while generic date/event components keep their separate semantics. |

## Anatomy

- Container
- Day number
- Amount value
- Rate value
- Empty outline
- Selected border

## Variants

- Empty: transparent/dark cell with a `#333333` outline and no text.
- Red: positive/up return cell with red 30% market wash, day number `1`, amount `+3,625`, and rate `+0.12%`.
- Green: negative/down return cell with green 30% market wash, day number `1`, amount `-728`, and rate `-0.03%`.
- Zero: break-even return cell with normalized neutral `#414141` fill, day number `20`, amount `0.0`, and rate `0%`.
- No market: `#333333` fill, day number `22`, amount `-`, and rate `-%`.

## States

- Default/unselected: observed for all five variants.
- Selected: observed for red, green, zero, and no-market variants. Selected red/green cells add a market-color border without changing the 30% wash. Selected zero/no-market cells add a white border.
- Empty selected, hover, pressed, focus-visible, disabled, loading, and error: not observed and not inferred.
- High-intensity red day from `E-089`: stays a Stock Calendar module highlight, not the selected state in this cell component set.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-stock-calendar-cell-width` | `--cm-sys-size-stock-calendar-cell-width` | Cell width | All |
| `--cm-comp-stock-calendar-cell-height` | `--cm-sys-size-stock-calendar-cell-height` | Cell height | All |
| `--cm-comp-stock-calendar-cell-content-width` | `--cm-sys-size-stock-calendar-cell-content-width` | Numeric text column width | Data cells |
| `--cm-comp-stock-calendar-cell-corner-radius` | `--cm-sys-shape-corner-md` | 8px cell radius | All |
| `--cm-comp-stock-calendar-cell-border-width` | `--cm-sys-size-control-border-width` | Empty and selected border width | Empty / selected |
| `--cm-comp-stock-calendar-cell-empty-border-color` | `--cm-sys-color-outline-low` | Empty cell outline | Empty |
| `--cm-comp-stock-calendar-cell-no-market-container-color` | `--cm-sys-color-surface-raised` | No-market cell fill | No market |
| `--cm-comp-stock-calendar-cell-no-market-selected-border-color` | `--cm-sys-color-on-surface-strong` | No-market selected outline | Selected no market |
| `--cm-comp-stock-calendar-cell-zero-container-color` | `--cm-sys-color-market-flat-container` | Break-even/zero return fill | Zero |
| `--cm-comp-stock-calendar-cell-zero-selected-border-color` | `--cm-sys-color-on-surface-strong` | Zero selected outline | Selected zero |
| `--cm-comp-stock-calendar-cell-up-container-color` | `--cm-sys-color-market-up-wash` | Positive/up return fill | Red |
| `--cm-comp-stock-calendar-cell-up-selected-border-color` | `--cm-sys-color-market-up` | Positive/up selected outline | Selected red |
| `--cm-comp-stock-calendar-cell-down-container-color` | `--cm-sys-color-market-down-wash-translucent` | Negative/down return fill | Green |
| `--cm-comp-stock-calendar-cell-down-selected-border-color` | `--cm-sys-color-market-down` | Negative/down selected outline | Selected green |
| `--cm-comp-stock-calendar-cell-date-color` | `--cm-sys-color-on-surface-medium` | Day number text | Data cells |
| `--cm-comp-stock-calendar-cell-value-color` | `--cm-sys-color-on-surface-strong` | Amount value text | Data cells |
| `--cm-comp-stock-calendar-cell-rate-color` | `--cm-sys-color-on-surface-medium` | Rate text | Data cells |
| `--cm-comp-stock-calendar-cell-content-inset-x` | `--cm-sys-spacing-xs` | 4px horizontal text inset | Data cells |
| `--cm-comp-stock-calendar-cell-date-inset-top` | `--cm-sys-spacing-xs` | Day number top inset | Data cells |
| `--cm-comp-stock-calendar-cell-content-inset-top` | `--cm-sys-size-control-height-slim` | Amount/rate stack top offset | Data cells |
| `--cm-comp-stock-calendar-cell-typeface` | `--cm-sys-typeface-calendar-numeric` | Roboto numeric typeface | Data cells |
| `--cm-comp-stock-calendar-cell-text-size` | `--cm-sys-typescale-metadata-sm-size` | 12px numeric text | Data cells |
| `--cm-comp-stock-calendar-cell-line-height` | `--cm-sys-typescale-metadata-sm-line-height` | Compact line height | Data cells |
| `--cm-comp-stock-calendar-cell-day-number-weight` | `--cm-sys-weight-regular` | Default day number weight in the component set | Default |
| `--cm-comp-stock-calendar-cell-value-weight` | `--cm-sys-weight-semibold` | Amount value weight | Data cells |
| `--cm-comp-stock-calendar-cell-rate-default-weight` | `--cm-sys-weight-regular` | Default rate weight in the component set | Default |
| `--cm-comp-stock-calendar-cell-zero-selected-date-weight` | `--cm-sys-weight-bold` | Selected zero day number emphasis | Selected zero |
| `--cm-comp-stock-calendar-cell-zero-selected-rate-weight` | `--cm-sys-weight-bold` | Selected zero rate emphasis | Selected zero |
| `--cm-comp-stock-calendar-cell-text-shadow` | `--cm-sys-shadow-calendar-cell-text` | Compact green-tinted text shadow | Data cells |

## Layout Rules

- Keep every cell 57x62 with an 8px radius and a 1px border slot.
- Empty cells have only the low neutral outline and no visible text.
- Data text stays within the 49px content width and remains right-aligned in the observed component set.
- Day number sits near the top edge; amount and rate form a two-line stack starting at the 26px offset.
- Selected state is expressed by a border only. Do not change the fill opacity for selected red or selected green cells.
- Keep the high-intensity red fill from the full Stock Calendar as a calendar-level highlight, not as the cell component's selected state.

## Content Rules

- Preserve Taiwan market color semantics: red is positive/up and green is negative/down.
- Use signed values for red and green cells.
- Use `0.0` and `0%` for break-even cells.
- Use `-` and `-%` for no-market cells when visible content is needed.
- Empty cells must remain content-free visually.

## Accessibility Rules

- If the cell is interactive, render it as a gridcell/button-equivalent with selected state exposed via `aria-selected` or an equivalent selected announcement.
- Accessible names should include date, return direction, amount, rate, and no-market/break-even status.
- Do not rely on color alone; selected and market direction must be available in text or semantics.
- Empty structural cells should be hidden from screen readers or labeled as blank dates depending on the table/grid behavior.

## Do / Don't

- Do use this cell component inside Stock Calendar for market-return day cells.
- Do keep selected state as a 1px outline.
- Do map zero/break-even fill through the neutral market-flat role instead of creating a new raw `#414141` token.
- Don't use this as a generic date picker, event date badge, calendar navigation control, or KPI card.
- Don't convert selected red/green cells into filled primary-orange selection states.
- Don't add weekend, holiday, tooltip, hover, or focus-visible styling without new source evidence.

## Implementation Notes

The generated Figma context names the red/green variants by color and the no-market variant as `沒開盤`. Production APIs may expose semantic names such as `up`, `down`, `zero`, `no-market`, and `empty`, while preserving the source's Taiwan market color convention. The source confirms that selected red/green cells keep the same 30% market wash and add only a border; this corrects the earlier ambiguity where the stronger red wash in `E-089` was described as highlighted/high-intensity rather than selected.
