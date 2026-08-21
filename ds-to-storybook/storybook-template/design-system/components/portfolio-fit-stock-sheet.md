# Portfolio Fit Stock Sheet

## Purpose

Shows stock-level portfolio fit details in a compact bottom sheet, including stock identity, attribute mix, scoring details, and a similar-stock action.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-032 | Figma `29209:162730` | `持股速配/長期存股/股票彈窗` | 375x605 dark bottom sheet with rounded top corners, stock identity, attribute row, detail table, action, and home indicator. |
| E-033 | Figma `29209:162730` | Detail table | Fixed three-column scoring table inside the sheet. |
| E-030 | Figma `29209:159854` | Attribute label variants | Attribute labels are reused in the sheet's attribute row. |
| E-070 | Figma `29210:28828` | `BTN/相似股` | Supplies the standalone similar-stock CTA treatment: 49px high, normalized `#3D3D3D` fill, 24px search icon slot, 18px white label, and 4px radius. |
| E-071 | Figma `29209:162829` | `bottom sheet_cell` | Supplies reusable portfolio stock identity and attribute tab cells used in stock bottom-sheet headers. |

## Anatomy

- Sheet container
- Top spacer
- Portfolio Stock Sheet Cell identity row
- Portfolio Stock Sheet Cell attribute tab row
- Divider
- Portfolio Fit Detail Table
- Similar Stock Button
- Home indicator safe area

## Variants

- Long-term stock sheet: observed with active `長期存股 100%` and inactive `波段價值 50%`, `短線價差 50%`.
- Swing, short-term, no-feature, mismatch, and empty detail variants: not observed.

## States

- Open sheet: observed.
- Dismissed, backdrop, drag handle, close/back control, scrolling, transition, loading, and error states: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-portfolio-fit-stock-sheet-container-color` | `--cm-sys-color-surface` | Sheet background | Open |
| `--cm-comp-portfolio-fit-stock-sheet-width` | `--cm-sys-size-viewport-compact-width` | Sheet width | Open |
| `--cm-comp-portfolio-fit-stock-sheet-height` | `--cm-sys-size-portfolio-fit-stock-sheet-height` | Sheet height | Open |
| `--cm-comp-portfolio-fit-stock-sheet-top-corner-radius` | `--cm-sys-shape-corner-top-xl` | Top corner radius | Open |
| `--cm-comp-portfolio-fit-stock-sheet-top-spacer-height` | `--cm-sys-size-portfolio-fit-stock-sheet-top-spacer-height` | Top spacer | Open |
| `--cm-comp-portfolio-fit-stock-sheet-stock-row-padding` | `--cm-sys-spacing-screen-gutter` | Stock row padding | Default |
| `--cm-comp-portfolio-fit-stock-sheet-stock-row-gap` | `--cm-sys-spacing-md` | Stock name/code gap | Default |
| `--cm-comp-portfolio-fit-stock-sheet-stock-name-color` | `--cm-sys-color-on-surface-strong` | Stock name text | Default |
| `--cm-comp-portfolio-fit-stock-sheet-stock-code-color` | `--cm-sys-color-on-surface-muted` | Stock code text | Default |
| `--cm-comp-portfolio-fit-stock-sheet-stock-name-text-size` | `--cm-sys-typescale-title-lg-size` | Stock name size | Default |
| `--cm-comp-portfolio-fit-stock-sheet-stock-name-line-height` | `--cm-sys-typescale-title-lg-line-height` | Stock name line height | Default |
| `--cm-comp-portfolio-fit-stock-sheet-stock-code-text-size` | `--cm-sys-typescale-date-md-size` | Stock code size | Default |
| `--cm-comp-portfolio-fit-stock-sheet-stock-code-line-height` | `--cm-sys-typescale-date-md-line-height` | Stock code line height | Default |
| `--cm-comp-portfolio-fit-stock-sheet-attribute-row-padding-x` | `--cm-sys-spacing-screen-gutter` | Attribute row horizontal padding | Default |
| `--cm-comp-portfolio-fit-stock-sheet-attribute-row-padding-y` | `--cm-sys-spacing-md` | Attribute row vertical padding | Default |
| `--cm-comp-portfolio-fit-stock-sheet-attribute-row-gap` | `--cm-sys-spacing-md` | Attribute label gap | Default |
| `--cm-comp-portfolio-fit-stock-sheet-divider-color` | `--cm-sys-color-outline-inverse-subtle` | Attribute row divider | Default |
| `--cm-comp-portfolio-fit-stock-sheet-action-container-color` | `--cm-sys-color-action-subtle` | Similar-stock action fill | Default |
| `--cm-comp-portfolio-fit-stock-sheet-action-label-color` | `--cm-sys-color-on-surface-strong` | Action label | Default |
| `--cm-comp-portfolio-fit-stock-sheet-action-icon-color` | `--cm-sys-color-on-surface-strong` | Action icon | Default |
| `--cm-comp-portfolio-fit-stock-sheet-action-width` | `--cm-sys-size-portfolio-fit-stock-sheet-action-width` | Action width | Default |
| `--cm-comp-portfolio-fit-stock-sheet-action-height` | `--cm-sys-size-portfolio-fit-stock-sheet-action-height` | Action height | Default |
| `--cm-comp-portfolio-fit-stock-sheet-action-padding-x` | `--cm-sys-spacing-xl` | Action horizontal padding | Default |
| `--cm-comp-portfolio-fit-stock-sheet-action-padding-y` | `--cm-sys-spacing-l` | Action vertical padding | Default |
| `--cm-comp-portfolio-fit-stock-sheet-action-gap` | `--cm-sys-spacing-xs` | Action icon/label gap | Default |
| `--cm-comp-portfolio-fit-stock-sheet-action-corner-radius` | `--cm-sys-shape-corner-xs` | Action radius | Default |
| `--cm-comp-portfolio-fit-stock-sheet-action-icon-size` | `--cm-sys-size-icon-sm` | Action search icon size | Default |
| `--cm-comp-portfolio-fit-stock-sheet-action-label-text-size` | `--cm-sys-typescale-date-md-size` | Action label size | Default |
| `--cm-comp-portfolio-fit-stock-sheet-action-label-line-height` | `--cm-sys-typescale-date-md-line-height` | Action label line height | Default |
| `--cm-comp-portfolio-fit-stock-sheet-safe-area-height` | `--cm-sys-size-region-safe-area-bottom-height` | Bottom safe area | Platform |
| `--cm-comp-portfolio-fit-stock-sheet-home-indicator-width` | `--cm-sys-size-home-indicator-width` | Home indicator width | Platform |
| `--cm-comp-portfolio-fit-stock-sheet-home-indicator-height` | `--cm-sys-size-home-indicator-height` | Home indicator height | Platform |

## Layout Rules

- Sheet is 375x605 with 16px top corners.
- Use `#252525` as a continuous sheet surface; do not split sections into cards.
- Top spacer is 20px.
- Stock identity row uses 16px padding and an 8px gap between stock name and code.
- Attribute row uses 16px horizontal padding, 8px vertical padding, and 8px gaps between 105x24 attribute labels.
- Add a 1px white-8 divider below the attribute row.
- Detail table follows the attribute divider and uses the `Portfolio Fit Detail Table` contract.
- Similar-stock action is inset 16px from both sheet edges in this sheet. Reuse `Similar Stock Button` visual styling while preserving the sheet's inset width.
- Preserve the 34px bottom safe-area/home-indicator region.

## Content Rules

- Stock identity uses name and code inline, such as `台積電 2330`.
- Attribute row should use `Portfolio Stock Sheet Cell` and `Portfolio Attribute Label` semantics, preserving active/inactive meaning.
- Observed action label is `查看相似的股票`.
- Do not add explanatory text to the sheet; the table and labels carry the meaning.

## Accessibility Rules

- The sheet should expose a modal/bottom-sheet role appropriate to the platform when implemented.
- Stock name and code should be available as the sheet title or summary.
- The `Similar Stock Button` needs a clear accessible name matching the visible label.
- Home indicator is platform chrome and should not be exposed as product content.

## Do / Don't

- Do keep the sheet dense and table-led.
- Do reuse `Portfolio Stock Sheet Cell`, `Portfolio Attribute Label`, `Portfolio Fit Detail Table`, and `Similar Stock Button`.
- Don't turn this into a full-screen profile page or dashboard panel.
- Don't add backdrop, close, drag, or scrolling behavior without future evidence.
- Don't introduce card wrappers around detail rows or attribute labels.

## Implementation Notes

This sheet composes portfolio stock sheet cells, portfolio attribute labels, the fit detail table, and the similar-stock CTA. The red score in this sheet is a fit score, not market movement.
