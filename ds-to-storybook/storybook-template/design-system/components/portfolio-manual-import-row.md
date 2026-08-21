# Portfolio Manual Import Row

## Purpose

Horizontally composed manual import row for entering or reviewing portfolio holding quantities and related values.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-053 | Figma `29215:89662` | `Group 48096028` | 557x61 row composed from one 136px stock identity cell, four 78px value cells, one 93px value cell, and a 16px trailing spacer column. |
| E-052 | Figma `29215:89650` | `手動匯入庫存` component set | Supplies stock and value cell variants used by the row. |
| E-051 | Figma `29214:89592` | `輸入內容` component set | Supplies value field states within row cells. |

## Anatomy

- Sticky stock identity cell
- Sticky stock/value gap layer
- Standard value cells
- Wide value cell
- Trailing spacer cell
- Bottom row divider
- Nested Portfolio Manual Import Cell instances
- Nested Portfolio Manual Import Value Field instances

## Variants

- Observed sample row: stock identity `玉晶光光光 / 2618`, missing required value, entered value `1,000`, another missing required value, and dash value cells.
- Header-row composition is implied by the cell component set but not shown as a full row in this node.

## States

- Observed: default row with mixed missing, entered, and empty values.
- Not observed: selected row, row pressed/focus, horizontal scroll position, row error summary, loading, disabled, successful import, conflict/duplicate state.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-portfolio-manual-import-row-width` | `--cm-sys-size-portfolio-manual-import-row-width` | Full row width | Default |
| `--cm-comp-portfolio-manual-import-row-height` | `--cm-sys-size-portfolio-manual-import-row-height` | Row height | Default |
| `--cm-comp-portfolio-manual-import-row-stock-column-width` | `--cm-sys-size-portfolio-manual-import-stock-column` | Stock identity column width | Default |
| `--cm-comp-portfolio-manual-import-row-value-column-width` | `--cm-sys-size-portfolio-manual-import-amount-column` | Standard value column width | Default |
| `--cm-comp-portfolio-manual-import-row-wide-value-column-width` | `--cm-sys-size-portfolio-manual-import-amount-column-wide` | Wider value column width | Default |
| `--cm-comp-portfolio-manual-import-row-spacer-column-width` | `--cm-sys-size-portfolio-manual-import-spacer-column` | Trailing spacer column width | Default |
| `--cm-comp-portfolio-manual-import-row-divider-color` | `--cm-sys-color-outline-inverse-subtle` | Bottom divider color | Default |
| `--cm-comp-portfolio-manual-import-row-stock-column-end-gap` | `--cm-sys-spacing-m` | Gap between sticky stock column and scrolling value columns | Horizontal scroll |

## Layout Rules

- Keep the row 557x61 in the observed composition.
- Column sequence is 136 / 78 / 78 / 93 / 78 / 78 / 16.
- Preserve the stock identity cell at the left edge with sticky-edge shadow when horizontally scrolling.
- Pin the first stock identity cell with `position: sticky` inside horizontal scroll containers; do not apply sticky positioning to standalone cell component-set exports.
- Keep a 10px sticky gap layer between the sticky stock identity column and the scrolling value columns so the stock column shadow remains visible while scrolled values pass underneath.
- Keep every value field vertically centered within its 60px content area.
- Do not wrap value cells beneath the stock identity column on mobile; the reference is a horizontally table-like row.

## Content Rules

- Use realistic stock identity content: stock name, stock code, and stock type.
- Keep missing required values as `請填寫`, entered values as formatted numbers, and empty values as `-`.
- Do not replace manual import fields with generic placeholders like `Value` or `Amount`.

## Accessibility Rules

- Implement as a row in a table/grid structure when possible.
- Preserve column header association for each value cell.
- Ensure horizontal scrolling remains keyboard and screen-reader navigable.

## Do / Don't

- Do compose from Portfolio Manual Import Cell and Portfolio Manual Import Value Field.
- Do keep the fixed column contract for scanability.
- Don't turn this into stacked mobile form cards without a future reference.
- Don't add summary badges, import progress bars, or validation banners inside the row without evidence.

## Implementation Notes

- The row may exceed the 375px viewport; treat it like other diagnostic rows in this system, with horizontal overflow and a sticky identity column.
- Export child cells and value fields inline inside the row component so each data cell preserves its own text; nested cell/value-field component export can collapse repeated value variants and overwrite row text.
- The 16px trailing spacer is part of the observed composition and should be preserved until a full table/container reference defines clipping behavior.
