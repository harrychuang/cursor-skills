# Portfolio Manual Import Cell

## Purpose

Reusable column unit for manual portfolio import tables. It covers compact header cells, the sticky stock identity cell, and value-entry cells.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-052 | Figma `29215:89650` | `手動匯入庫存` component set | 468x77 set with header variants `持有股票` 136x34 and `成本均價` 78x34, plus 61px row cells for stock identity and value entry. |
| E-051 | Figma `29214:89592` | `輸入內容` component set | Supplies the nested 70x29 value field used in value-entry cells. |

## Anatomy

- Header cell container
- Row cell container
- Stock identity content group
- Delete/remove icon slot
- Stock type label
- Stock name and code stack
- Nested Portfolio Manual Import Value Field
- Bottom divider
- Sticky-edge shadow on stock identity cells

## Variants

- `表頭列表 / 持有股票`: 136x34 header with left padding and sticky-edge shadow.
- `表頭列表 / 成本均價`: 78x34 header with right-aligned label.
- `股票列表 / 庫存股`: 136x61 stock identity cell with delete icon, `現股`, stock name, stock code, divider, and strong sticky-edge shadow.
- `股票列表 / 輸入內容`: 78x61 value cell with centered-right nested value field and divider.

## States

- Observed: header, stock identity, missing input value cell.
- Nested value field observed states: missing required, entered value, empty value.
- Not observed: selected row, cell focus, active edit caret, disabled, loading, validation error, delete pressed/focus.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-portfolio-manual-import-cell-set-width` | `--cm-sys-size-portfolio-manual-import-set-width` | Component set reference width | Documentation |
| `--cm-comp-portfolio-manual-import-cell-set-height` | `--cm-sys-size-portfolio-manual-import-set-height` | Component set reference height | Documentation |
| `--cm-comp-portfolio-manual-import-cell-stock-column-width` | `--cm-sys-size-portfolio-manual-import-stock-column` | Stock identity column width | Stock/header |
| `--cm-comp-portfolio-manual-import-cell-value-column-width` | `--cm-sys-size-portfolio-manual-import-amount-column` | Standard value column width | Value |
| `--cm-comp-portfolio-manual-import-cell-wide-value-column-width` | `--cm-sys-size-portfolio-manual-import-amount-column-wide` | Wide value column width | Composition |
| `--cm-comp-portfolio-manual-import-cell-header-height` | `--cm-sys-size-portfolio-manual-import-header-height` | Header cell height | Header |
| `--cm-comp-portfolio-manual-import-cell-row-height` | `--cm-sys-size-portfolio-manual-import-row-height` | Row cell height | Row |
| `--cm-comp-portfolio-manual-import-cell-content-height` | `--cm-sys-size-portfolio-manual-import-content-height` | Content area height above divider | Row |
| `--cm-comp-portfolio-manual-import-cell-header-container-color` | `--cm-sys-color-surface-raised` | Header fill | Header |
| `--cm-comp-portfolio-manual-import-cell-row-container-color` | `--cm-sys-color-surface` | Row fill | Row |
| `--cm-comp-portfolio-manual-import-cell-divider-color` | `--cm-sys-color-outline-inverse-subtle` | Bottom divider | Row |
| `--cm-comp-portfolio-manual-import-cell-header-shadow` | `--cm-sys-shadow-sticky-edge` | Header sticky shadow | Stock header |
| `--cm-comp-portfolio-manual-import-cell-stock-shadow` | `--cm-sys-shadow-sticky-edge-strong` | Stock identity sticky shadow | Stock row |
| `--cm-comp-portfolio-manual-import-cell-header-label-color` | `--cm-sys-color-on-surface-medium` | Header label color | Header |
| `--cm-comp-portfolio-manual-import-cell-stock-name-color` | `--cm-sys-color-on-surface-strong` | Stock name color | Stock row |
| `--cm-comp-portfolio-manual-import-cell-stock-code-color` | `--cm-sys-color-on-surface-muted` | Stock code color | Stock row |
| `--cm-comp-portfolio-manual-import-cell-stock-type-color` | `--cm-sys-color-secondary` | Stock type color | Stock row |
| `--cm-comp-portfolio-manual-import-cell-header-label-text-size` | `--cm-sys-typescale-table-header-size` | Header label size | Header |
| `--cm-comp-portfolio-manual-import-cell-header-label-line-height` | `--cm-sys-typescale-table-header-line-height` | Header label line height | Header |
| `--cm-comp-portfolio-manual-import-cell-stock-name-text-size` | `--cm-sys-typescale-title-sm-size` | Stock name size | Stock row |
| `--cm-comp-portfolio-manual-import-cell-stock-name-line-height` | `--cm-sys-typescale-title-sm-line-height` | Stock name line height | Stock row |
| `--cm-comp-portfolio-manual-import-cell-stock-code-text-size` | `--cm-sys-typescale-stock-code-compact-size` | Stock code size | Stock row |
| `--cm-comp-portfolio-manual-import-cell-stock-code-line-height` | `--cm-sys-typescale-stock-code-compact-line-height` | Stock code line height | Stock row |
| `--cm-comp-portfolio-manual-import-cell-stock-type-text-size` | `--cm-sys-typescale-metadata-xxs-size` | Stock type label size | Stock row |
| `--cm-comp-portfolio-manual-import-cell-stock-type-line-height` | `--cm-sys-typescale-metadata-xxs-line-height` | Stock type label line height | Stock row |
| `--cm-comp-portfolio-manual-import-cell-stock-type-weight` | `--cm-sys-weight-medium` | Stock type label weight | Stock row |
| `--cm-comp-portfolio-manual-import-cell-delete-container-color` | `--cm-sys-color-portfolio-duplicate-warning` | Delete icon circle fill | Stock row |
| `--cm-comp-portfolio-manual-import-cell-delete-mark-color` | `--cm-sys-color-on-error` | Delete icon minus mark | Stock row |
| `--cm-comp-portfolio-manual-import-cell-delete-mark-width` | `--cm-sys-spacing-m` | Delete icon minus mark width | Stock row |
| `--cm-comp-portfolio-manual-import-cell-delete-mark-height` | `--cm-sys-size-control-border-width-strong` | Delete icon minus mark height | Stock row |
| `--cm-comp-portfolio-manual-import-cell-header-padding-x` | `--cm-sys-spacing-md` | Header start inset | Header |
| `--cm-comp-portfolio-manual-import-cell-header-padding-end` | `--cm-sys-spacing-xs` | Header end inset | Header |
| `--cm-comp-portfolio-manual-import-cell-header-padding-y` | `--cm-sys-spacing-md` | Header vertical inset | Header |
| `--cm-comp-portfolio-manual-import-cell-row-padding-start` | `--cm-sys-spacing-md` | Row start inset | Row |
| `--cm-comp-portfolio-manual-import-cell-row-padding-end` | `--cm-sys-spacing-xs` | Row end inset | Row |
| `--cm-comp-portfolio-manual-import-cell-row-padding-y` | `--cm-sys-spacing-l` | Row vertical inset | Row |
| `--cm-comp-portfolio-manual-import-cell-content-gap` | `--cm-sys-spacing-xs` | Icon/type/name gap | Stock row |
| `--cm-comp-portfolio-manual-import-cell-stock-name-width` | `--cm-sys-size-portfolio-manual-import-stock-name-width` | Stock name/code stack width | Stock row |
| `--cm-comp-portfolio-manual-import-cell-stock-type-width` | `--cm-sys-size-portfolio-manual-import-stock-type-width` | Stock type label width | Stock row |
| `--cm-comp-portfolio-manual-import-cell-delete-icon-size` | `--cm-sys-size-portfolio-manual-import-delete-icon` | Delete icon box | Stock row |

## Layout Rules

- Keep stock identity cells 136px wide and value cells 78px wide unless the row composition explicitly uses the 93px wide value column.
- Header cells are 34px high; row cells are 61px high with a 60px content area and 1px divider.
- Stock row content uses 8px start padding, 4px end padding, 12px vertical padding, and 4px internal gaps.
- Delete control is an 18px red circle with a white horizontal minus mark.
- The stock identity cell may cast the stronger 4/0/5 sticky-edge shadow when used as the first column.
- The `成本均價` header label exports as fill-container text with right alignment.
- Value cells compose Portfolio Manual Import Value Field; do not duplicate field styling directly in row code.

## Content Rules

- Header labels stay short, such as `持有股票` and `成本均價`.
- Stock type label is compact vertical `現股` beside the stock identity.
- Stock name and code stack stays in the 88px text width; long names may truncate but should not wrap into extra row height.

## Accessibility Rules

- Treat delete/remove icon as a button with an accessible name that includes the stock name.
- Header cells should be exposed as column headers in table/grid implementations.
- Value cells should expose the metric name and stock identity when editable.

## Do / Don't

- Do keep this table-led and fixed-column.
- Do use the sticky-edge shadow only for the stock identity column.
- Don't turn manual import rows into cards or free-form forms.
- Don't add helper text, validation paragraphs, or expanded input labels inside the row without future evidence.

## Implementation Notes

- The Figma `delete` symbol is asset-led; preserve its observed 18px red circle and white minus mark, and do not infer alternate icon states yet.
- This component is intended to compose into Portfolio Manual Import Row.
