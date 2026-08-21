# Portfolio Stock Sheet Cell

## Purpose

Defines portfolio-specific bottom-sheet cells for stock identity, portfolio attribute tab summaries, and health-check popup title summaries.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-071 | Figma `29209:162829` | `bottom sheet_cell` | 415x366 component set with five 375px-wide variants: `股票+代號` 60px high, three `持股速配度tab` variants 41px high, and `持股體檢/股票彈窗標題` 79px high. Uses `#252525`, white/gray stock identity, portfolio attribute labels, white-8 dividers, health-check columns 94/88/58/46/73, valuation label, yellow sweep count, and red yield value. |
| E-030 | Figma `29209:159854` | Portfolio attribute labels | Supplies the active long-term, swing, short-term, and inactive attribute label semantics used by the tab variants. |
| E-038 | Figma `29209:173791` | Valuation label | Supplies the `昂貴` valuation pill used in the health-check title variant. |

## Anatomy

- Cell container
- Optional stock identity row
- Optional attribute tab row
- Optional health-check header labels
- Optional health-check summary row
- Optional divider

## Variants

- `股票+代號`: 60px identity row with 20px white stock name and 18px muted stock code.
- `持股速配度tab/長期存股`: 41px tab row with active long-term blue label and inactive swing/short-term muted labels.
- `持股速配度tab/波段價值`: 41px tab row with active swing amber label and inactive long-term/short-term muted labels.
- `持股速配度tab/短線價差`: 41px tab row with active short-term rose label and inactive long-term/swing muted labels.
- `持股體檢/股票彈窗標題`: 79px title summary with header labels and one compact health-check summary row.

## States

- Active attribute tab: observed for long-term, swing, and short-term.
- Inactive attribute labels: observed as muted text without fill.
- Health-check title summary: observed.
- Pressed, focus-visible, disabled, loading, overflow, selected row, and alternate health values: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-portfolio-stock-sheet-cell-set-width` | `--cm-sys-size-portfolio-stock-sheet-cell-set-width` | Component set width | Documentation |
| `--cm-comp-portfolio-stock-sheet-cell-set-height` | `--cm-sys-size-portfolio-stock-sheet-cell-set-height` | Component set height | Documentation |
| `--cm-comp-portfolio-stock-sheet-cell-width` | `--cm-sys-size-portfolio-stock-sheet-cell-width` | Cell width | All |
| `--cm-comp-portfolio-stock-sheet-cell-stock-identity-height` | `--cm-sys-size-portfolio-stock-sheet-cell-stock-identity-height` | Stock identity row height | Identity |
| `--cm-comp-portfolio-stock-sheet-cell-attribute-tab-height` | `--cm-sys-size-portfolio-stock-sheet-cell-attribute-row-height` | Attribute tab row height | Attribute tab |
| `--cm-comp-portfolio-stock-sheet-cell-health-title-height` | `--cm-sys-size-portfolio-stock-sheet-cell-health-title-height` | Health title row height | Health title |
| `--cm-comp-portfolio-stock-sheet-cell-container-color` | `--cm-sys-color-surface` | Cell background | All |
| `--cm-comp-portfolio-stock-sheet-cell-stock-name-color` | `--cm-sys-color-on-surface-strong` | Stock name | Identity |
| `--cm-comp-portfolio-stock-sheet-cell-stock-code-color` | `--cm-sys-color-on-surface-muted` | Stock code | Identity |
| `--cm-comp-portfolio-stock-sheet-cell-attribute-inactive-color` | `--cm-sys-color-fit-assessment-label-muted` | Inactive attribute labels | Attribute tab |
| `--cm-comp-portfolio-stock-sheet-cell-attribute-long-term-color` | `--cm-sys-color-portfolio-long-term` | Active long-term fill | Attribute tab |
| `--cm-comp-portfolio-stock-sheet-cell-attribute-swing-color` | `--cm-sys-color-portfolio-swing` | Active swing fill | Attribute tab |
| `--cm-comp-portfolio-stock-sheet-cell-attribute-short-term-color` | `--cm-sys-color-portfolio-short-term` | Active short-term fill | Attribute tab |
| `--cm-comp-portfolio-stock-sheet-cell-attribute-active-label-color` | `--cm-sys-color-on-surface-strong` | Active attribute text | Attribute tab |
| `--cm-comp-portfolio-stock-sheet-cell-divider-color` | `--cm-sys-color-outline-inverse-subtle` | Row divider | Attribute tab / health title |
| `--cm-comp-portfolio-stock-sheet-cell-health-header-color` | `--cm-sys-color-on-surface-subtle` | Health header labels | Health title |
| `--cm-comp-portfolio-stock-sheet-cell-health-neutral-color` | `--cm-sys-color-on-surface-strong` | Neutral health values | Health title |
| `--cm-comp-portfolio-stock-sheet-cell-health-note-color` | `--cm-sys-color-portfolio-health-note` | Sweep count highlight | Health title |
| `--cm-comp-portfolio-stock-sheet-cell-health-yield-color` | `--cm-sys-color-market-up` | Cash yield value | Health title |
| `--cm-comp-portfolio-stock-sheet-cell-padding-x` | `--cm-sys-spacing-screen-gutter` | Horizontal padding | All |
| `--cm-comp-portfolio-stock-sheet-cell-padding-y` | `--cm-sys-spacing-md` | Vertical padding | Attribute tab / health title |
| `--cm-comp-portfolio-stock-sheet-cell-stock-gap` | `--cm-sys-spacing-md` | Stock name/code gap | Identity |
| `--cm-comp-portfolio-stock-sheet-cell-attribute-gap` | `--cm-sys-spacing-md` | Gap between attribute labels | Attribute tab |
| `--cm-comp-portfolio-stock-sheet-cell-attribute-label-gap` | `--cm-sys-spacing-xs` | Category/percent gap | Attribute tab |
| `--cm-comp-portfolio-stock-sheet-cell-health-stock-column-width` | `--cm-sys-size-portfolio-stock-sheet-cell-health-stock-column` | Health stock column | Health title |
| `--cm-comp-portfolio-stock-sheet-cell-health-valuation-column-width` | `--cm-sys-size-portfolio-stock-sheet-cell-health-valuation-column` | Health valuation column | Health title |
| `--cm-comp-portfolio-stock-sheet-cell-health-quality-column-width` | `--cm-sys-size-portfolio-stock-sheet-cell-health-quality-column` | Health quality column | Health title |
| `--cm-comp-portfolio-stock-sheet-cell-health-risk-column-width` | `--cm-sys-size-portfolio-stock-sheet-cell-health-risk-column` | Health sweep column | Health title |
| `--cm-comp-portfolio-stock-sheet-cell-health-yield-column-width` | `--cm-sys-size-portfolio-stock-sheet-cell-health-yield-column` | Health yield column | Health title |
| `--cm-comp-portfolio-stock-sheet-cell-stock-name-text-size` | `--cm-sys-typescale-title-lg-size` | Identity stock-name size | Identity |
| `--cm-comp-portfolio-stock-sheet-cell-stock-code-text-size` | `--cm-sys-typescale-date-md-size` | Identity stock-code size | Identity |
| `--cm-comp-portfolio-stock-sheet-cell-attribute-label-text-size` | `--cm-sys-typescale-label-md-size` | Attribute label size | Attribute tab |
| `--cm-comp-portfolio-stock-sheet-cell-attribute-label-weight` | `--cm-sys-weight-medium` | Attribute label weight | Attribute tab |
| `--cm-comp-portfolio-stock-sheet-cell-health-header-text-size` | `--cm-sys-typescale-table-header-size` | Health header label size | Health title |
| `--cm-comp-portfolio-stock-sheet-cell-health-stock-name-text-size` | `--cm-sys-typescale-title-md-size` | Health stock-name size | Health title |
| `--cm-comp-portfolio-stock-sheet-cell-health-stock-code-text-size` | `--cm-sys-typescale-body-sm-size` | Health stock-code size | Health title |
| `--cm-comp-portfolio-stock-sheet-cell-health-value-text-size` | `--cm-sys-typescale-label-xl-size` | Health value size | Health title |

## Layout Rules

- Keep all variants 375px wide on a continuous `#252525` sheet surface.
- Use 60px for stock identity, 41px for attribute tab rows, and 79px for the health-check title summary.
- Attribute tab rows use three 105px labels with 8px gaps and a bottom divider.
- The active attribute is filled; inactive attributes are text-only muted labels.
- Health title columns remain fixed at 94/88/58/46/73 and must not reflow into cards.
- Export attribute-tab rows as distinct Figma variants by active category:
  `attribute-tab-long-term`, `attribute-tab-swing`, and
  `attribute-tab-short-term`.

## Content Rules

- Stock identity pairs the visible stock name and code inline.
- Health title stock column stacks the stock code below the stock name.
- Attribute labels are category and percent summaries, not filter chips.
- Health-check headers are terse column labels: `庫存股`, `評價`, `體質`, `掃雷`, `現金殖利率`.

## Accessibility Rules

- Expose stock name and code as one identity.
- Attribute tab rows must expose which category is active.
- Health title summaries should expose each header/value pair in order.

## Do / Don't

- Do reuse `Portfolio Attribute Label` and `Valuation Label` semantics.
- Do keep these rows dense and table-led.
- Don't merge these portfolio-specific cells into generic settings rows.
- Don't add helper copy, card wrappers, or explanatory banners.

## Implementation Notes

This component is a portfolio-domain child for bottom-sheet stock detail flows. It should compose with `Portfolio Fit Stock Sheet`, `Portfolio Health Report Section`, and `Similar Stock Button` rather than replacing the generic `Bottom Sheet Cell`.
