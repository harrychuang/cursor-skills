# Stock Label

## Purpose

Displays a compact stock identity label with stock code and company/security name in a raised dark container. Use it when a selected or referenced stock must be shown as a small inline context marker, not as a full quote row, sheet cell, or valuation/status tag.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-087 | Figma `47327:64981` | `股票標籤` instance | 194x28 label on `#333333`, 4px radius, 10px horizontal padding, 4px vertical padding, 6px inline gap, 14px medium PingFang text, white code `2317`, and muted company name `HON HAI PRECISION`. |

## Component Fingerprint

| Dimension | Fingerprint |
|---|---|
| Purpose / behavior | Display-only compact stock identity marker. It carries identity context, not quote values, navigation chrome, valuation status, or action behavior. |
| Anatomy | Container, stock code text, stock name text, single text row. |
| Variants / states | Default stock identity label observed. Pressed, focus-visible, selected, disabled, loading, removable, icon-leading, and multi-line variants are not shown. |
| Token contract summary | Raised dark container, strong code text, medium-muted name text, 28px height, 10x4 padding, 6px inline gap, 4px radius, 14px medium compact label type. |
| Layout / density | Width hugs content in the observed instance. Height remains 28px. Text stays one line and centered vertically. |
| Visual reference | Figma node preview `figma:vSr4NtEwPVs6wLpqCT5PtV#47327:64981`; get_screenshot captured 2026-06-15. |
| Similar components reviewed | Realtime Quote Row, Main Force Stock Row, Portfolio Stock Sheet Cell, Event Table Row, Main Force Trade Tag, and Valuation Label. Decision: keep distinct because Stock Label is display-only stock identity in a compact raised label, not a row, domain status tag, or valuation marker. |

## Anatomy

- Container
- Stock code
- Stock name

## Variants

- Default: code plus company/security name in one line.

## States

- Default display-only: observed.
- Pressed, hover, focus-visible, selected, disabled, loading, dismissible/removable, and error states: not observed and not inferred.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-stock-label-container-color` | `--cm-sys-color-surface-raised` | Raised label fill | Default |
| `--cm-comp-stock-label-code-color` | `--cm-sys-color-on-surface-strong` | Stock code text | Default |
| `--cm-comp-stock-label-name-color` | `--cm-sys-color-on-surface-medium` | Company/security name text | Default |
| `--cm-comp-stock-label-height` | `--cm-sys-size-control-height-xs` | Fixed compact label height | Default |
| `--cm-comp-stock-label-padding-x` | `--cm-sys-spacing-m` | Horizontal inset | Default |
| `--cm-comp-stock-label-padding-y` | `--cm-sys-spacing-xs` | Vertical inset | Default |
| `--cm-comp-stock-label-content-gap` | `--cm-sys-spacing-sm` | Code/name inline gap | Default |
| `--cm-comp-stock-label-corner-radius` | `--cm-sys-shape-corner-xs` | Container radius | Default |
| `--cm-comp-stock-label-text-size` | `--cm-sys-typescale-label-md-size` | Code/name text size | Default |
| `--cm-comp-stock-label-line-height` | `--cm-sys-typescale-label-md-compact-line-height` | Compact text line height | Default |
| `--cm-comp-stock-label-weight` | `--cm-sys-weight-medium` | Code/name text weight | Default |

## Layout Rules

- Keep the label 28px high with 10px horizontal and 4px vertical padding.
- Let width hug content by default. The observed 194px frame comes from the sample text and padding, not a reusable fixed-width contract.
- Keep code and name on one line with a 6px inline gap.
- Vertically center the text row inside the container.
- Use 4px radius and no border or shadow.
- If a host must constrain width, preserve the stock code and truncate the stock name after the code/name gap.

## Content Rules

- Stock code appears first and uses strong white text.
- Stock name appears second and uses muted text.
- Use real securities data. The source sample is `2317 HON HAI PRECISION`.
- Do not add price, change, exchange, icons, valuation text, or helper copy inside this label without new evidence.
- The Figma variable payload exposes a `#D9D9D9` base text color, but the visible generated spans render the code as white and the name as `#C0C0C0`; token slots follow the visible span treatment.

## Accessibility Rules

- Default semantic role is plain text or a non-interactive inline group.
- If the label becomes a link or button in a product flow, the host component must own the interactive role, focus-visible style, and pressed/disabled states.
- The accessible name should combine code and name, for example `2317 HON HAI PRECISION`.
- Do not communicate selected or disabled state through color unless that state is separately evidenced and tokenized.

## Do / Don't

- Do use Stock Label for compact selected-stock or referenced-stock identity.
- Do keep it display-only unless an enclosing component makes it interactive.
- Do keep the container dark raised and text-led.
- Don't use Stock Label as a valuation badge, main-force trade tag, promotional badge, or filter chip.
- Don't replace full quote rows, portfolio sheet cells, or event table rows with this label.
- Don't add icons, close buttons, price values, gradients, shadows, or large pill radii without future evidence.

## Implementation Notes

The label can be implemented as a small inline-flex component. Keep the stock code in a separate text span so truncation rules can protect the code while allowing long English or localized names to truncate in the name span.
