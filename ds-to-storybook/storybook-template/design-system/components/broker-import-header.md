# Broker Import Header

## Purpose

Labels broker import sections and broker usage columns inside dense import flows.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-058 | Figma `8159:289815` | `券商頁表頭` component set | 415x191 component set with three 375px-wide header variants: A version `匯入券商` / `使用狀態` at 38px height, B version `使用中券商` at 37px, and B empty-selection prompt `請選擇欲匯入券商` at 37px. |

## Anatomy

- Full-width dark header strip
- One or two text labels
- 16px horizontal inset
- 12px gap between A-version labels

## Variants

- A version: two labels, `匯入券商` and `使用狀態`.
- B active-usage version: single label, `使用中券商`.
- B prompt version: single label, `請選擇欲匯入券商`.

## States

- A header: observed.
- B active header: observed.
- B prompt header: observed.
- Pressed, focus-visible, disabled, sorted, sticky, and loading states: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-broker-import-header-set-width` | `--cm-sys-size-broker-import-header-set-width` | Component set reference width | Documentation |
| `--cm-comp-broker-import-header-set-height` | `--cm-sys-size-broker-import-header-set-height` | Component set reference height | Documentation |
| `--cm-comp-broker-import-header-width` | `--cm-sys-size-broker-import-header-width` | Header strip width | All |
| `--cm-comp-broker-import-header-a-height` | `--cm-sys-size-broker-import-header-height-a` | Two-label header height | A |
| `--cm-comp-broker-import-header-b-height` | `--cm-sys-size-broker-import-header-height-b` | Single-label header height | B |
| `--cm-comp-broker-import-header-container-color` | `--cm-sys-color-surface` | Header background | All |
| `--cm-comp-broker-import-header-label-color` | `--cm-sys-color-on-surface-warm` | Header label color | All |
| `--cm-comp-broker-import-header-padding-x` | `--cm-sys-spacing-screen-gutter` | Horizontal inset | All |
| `--cm-comp-broker-import-header-padding-y` | `--cm-sys-spacing-md` | Vertical inset | All |
| `--cm-comp-broker-import-header-gap` | `--cm-sys-spacing-l` | Gap between A-version labels | A |
| `--cm-comp-broker-import-header-label-text-size` | `--cm-sys-typescale-label-xl-size` | 16px label size | All |
| `--cm-comp-broker-import-header-label-line-height` | `--cm-sys-typescale-label-xl-line-height` | Label line height | All |
| `--cm-comp-broker-import-header-label-weight` | `--cm-sys-weight-regular` | Label weight | All |

## Layout Rules

- Keep the header at 375px width in mobile import flows.
- Use the 38px height for the A two-column header and 37px for B single-label headers.
- In the A two-column header, place `匯入券商` and `使用狀態` with `space-between` across the padded content box.
- In B single-label headers, keep the label aligned to flex-start rather than spreading it across the row.
- Keep the strip flat on `#252525`; do not frame it as a card or table chrome.
- Align following broker rows directly under this header with no decorative gap unless a future composition source shows one.

## Content Rules

- Use the exact header labels shown by the source when those broker import states apply.
- Do not use this component as a generic app bar, modal header, or section title outside broker import contexts.
- Keep labels single-line; long copy should be re-evaluated against a future Figma source.

## Accessibility Rules

- Mark the header as column/section text for assistive technologies when used above broker rows.
- Do not expose it as an interactive control unless a future variant adds sorting or filtering.

## Do / Don't

- Do keep it dense, flat, and text-only.
- Do pair it with Broker Import Row in broker import lists.
- Don't add sort arrows, icons, pills, or dividers without new evidence.
- Don't reuse Top App Bar tokens; this is a local import-list header, not navigation.

## Implementation Notes

The A version looks like a two-column label row but the source does not prove interactive sorting. Keep sort and sticky behavior out of the contract until those states are extracted.

For Storybook JSON export, keep the two A-version labels as separate child text nodes under a flex container with `justify-content: space-between`. Do not rely on first-label `flex-grow` to push the second label; the Figma importer maps `justify-content: space-between` directly, while CSS grow values are not part of the portable export contract.
