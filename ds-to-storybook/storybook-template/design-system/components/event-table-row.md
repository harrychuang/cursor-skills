# Event Table Row

## Purpose

Displays one stock-related event record with stock identity on the left and event-specific details on the right.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-024 | Figma `19215:187556` | `事件Table` component set | Thirteen variants in a 355x1162 set; rows are 323px wide with content-driven heights from 64px to 120px. |
| E-025 | Figma `19215:187556` | Stock identity and event details | `#333333` fill, `#3D3D3D` border, 4px radius, 12px padding, 8px column gap, stock name `#FBEEB9`, code `#999999`, detail text white/muted/amber/red/green. |

## Anatomy

- Row container
- Stock identity column
- Stock name
- Stock code
- Event detail column
- Primary event detail
- Secondary estimate or metadata line
- Muted field label
- Market-like value span

## Variants

- Dividend cash: `配息`, with primary dividend value and amber holding estimate.
- Dividend stock: `配股`, with primary stock dividend value and amber holding estimate.
- Ex-right: `除權`, with muted date label and dividend detail.
- Ex-right and ex-dividend: `除權息`, with two stacked date/detail groups.
- Revenue increase/decrease: `營收增`, `營收減`, with revenue amount and YoY value.
- EPS: `季EPS`, `年-EPS`, with red EPS value inside a sentence.
- Meeting: `臨時股東會`, `線上會議`.
- Restriction period: `處置期間`, with date range and instance note.
- Transfer declaration: `申報轉讓`, with transaction type and transfer quantity.
- Capital increase: `增資`, with type and share quantity.

## States

- Default informational row: observed.
- Market-like positive/negative value spans: observed through red/green YoY and EPS values.
- Pressed, focus-visible, selected, disabled, loading, empty, and linked-navigation states: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-event-table-row-set-width` | `--cm-sys-size-event-table-set-width` | Component set reference width | Documentation |
| `--cm-comp-event-table-row-set-height` | `--cm-sys-size-event-table-set-height` | Component set reference height | Documentation |
| `--cm-comp-event-table-row-container-color` | `--cm-sys-color-surface-raised` | Row fill | Default |
| `--cm-comp-event-table-row-border-color` | `--cm-sys-color-event-table-border` | Row border | Default |
| `--cm-comp-event-table-row-width` | `--cm-sys-size-event-table-row-width` | Row width | Default |
| `--cm-comp-event-table-row-height-sm` | `--cm-sys-size-event-table-row-height-sm` | 64px row height | Compact |
| `--cm-comp-event-table-row-height-md` | `--cm-sys-size-event-table-row-height-md` | 66px row height | Dividend |
| `--cm-comp-event-table-row-height-lg` | `--cm-sys-size-event-table-row-height-lg` | 68px row height | Two-line detail |
| `--cm-comp-event-table-row-height-xl` | `--cm-sys-size-event-table-row-height-xl` | 86px row height | Restriction period |
| `--cm-comp-event-table-row-height-xxl` | `--cm-sys-size-event-table-row-height-xxl` | 120px row height | Ex-right and ex-dividend |
| `--cm-comp-event-table-row-padding` | `--cm-sys-spacing-l` | Row padding | Default |
| `--cm-comp-event-table-row-column-gap` | `--cm-sys-spacing-md` | Stock/detail column gap | Default |
| `--cm-comp-event-table-row-detail-gap` | `--cm-sys-spacing-xxs` | Stacked detail gap | Default |
| `--cm-comp-event-table-row-inline-gap` | `--cm-sys-spacing-xs` | Inline metadata gap | Default |
| `--cm-comp-event-table-row-ex-right-gap` | `--cm-sys-spacing-md` | Gap between ex-right/ex-dividend groups | Ex-right and ex-dividend |
| `--cm-comp-event-table-row-corner-radius` | `--cm-sys-shape-corner-xs` | Row radius | Default |
| `--cm-comp-event-table-row-identity-width` | `--cm-sys-size-event-table-identity-width` | Stock identity column width | Default |
| `--cm-comp-event-table-row-identity-width-compact` | `--cm-sys-size-event-table-identity-width-compact` | Compact identity width | Revenue decrease |
| `--cm-comp-event-table-row-primary-value-width` | `--cm-sys-size-event-table-primary-value-width` | Fixed primary value width | Dividend |
| `--cm-comp-event-table-row-range-width` | `--cm-sys-size-event-table-range-width` | Restriction range text width | Restriction period |
| `--cm-comp-event-table-row-ex-right-width` | `--cm-sys-size-event-table-ex-right-width` | Ex-right detail width | Ex-right |
| `--cm-comp-event-table-row-stock-name-color` | `--cm-sys-color-event-stock-name` | Stock name | Default |
| `--cm-comp-event-table-row-stock-code-color` | `--cm-sys-color-on-surface-muted` | Stock code | Default |
| `--cm-comp-event-table-row-detail-primary-color` | `--cm-sys-color-on-surface-strong` | Primary event details | Default |
| `--cm-comp-event-table-row-detail-muted-color` | `--cm-sys-color-on-surface-muted` | Field labels and metadata | Default |
| `--cm-comp-event-table-row-estimate-color` | `--cm-sys-color-event-estimate` | Holding estimate line | Dividend |
| `--cm-comp-event-table-row-value-up-color` | `--cm-sys-color-market-up` | Positive/up value span | Market-like value |
| `--cm-comp-event-table-row-value-down-color` | `--cm-sys-color-market-down` | Negative/down value span | Market-like value |
| `--cm-comp-event-table-row-stock-name-text-size` | `--cm-sys-typescale-label-xl-size` | Stock name size | Default |
| `--cm-comp-event-table-row-stock-code-text-size` | `--cm-sys-typescale-stock-code-sm-size` | Stock code size | Default |
| `--cm-comp-event-table-row-stock-code-overflow-text-size` | `--cm-sys-typescale-stock-code-xs-size` | Overflow stock code size | Overflow |
| `--cm-comp-event-table-row-detail-text-size` | `--cm-sys-typescale-event-detail-md-size` | Event detail size | Default |

## Layout Rules

- Use a 323px-wide row with 12px padding and 4px radius.
- Keep a 96px stock identity column on the left and a flexible right-aligned detail column.
- Use 8px gap between identity and detail columns.
- Row height follows content: 64px, 66px, 68px, 86px, or 120px in observed variants.
- Right-side event details are right-aligned except inline transfer metadata, which uses a compact inline gap.

## Content Rules

- Stock identity uses name over code.
- Detail values should stay concise and numeric where possible.
- Use muted labels for field names such as `除權日`, `除息日`, `處置期間`, or `一般交易`.
- Use amber only for holding estimate lines, such as `持股1,000股 約配670元`.
- Use market red/green only for change-like values such as EPS or YoY spans.

## Accessibility Rules

- Row announcement should include stock name, stock code, event type, and visible detail values.
- Do not rely on color alone for red/green values; include the signed value or clear label text.
- If future rows become tappable, expose the row action and add focus-visible styling from new evidence.

## Do / Don't

- Do keep stock identity and event detail tightly paired in one row.
- Do keep event details right-aligned for scanning.
- Don't turn the row into a large card, feed item, or article summary.
- Don't replace numeric detail lines with generic status badges.

## Implementation Notes

This component complements `Relative Date Label` and `Event Name Label`: those can label a calendar group, while `Event Table Row` represents the detailed stock-event record. Interaction behavior is not defined by this node.
