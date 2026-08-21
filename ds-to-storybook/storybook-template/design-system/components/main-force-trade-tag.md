# Main Force Trade Tag

## Purpose

Marks main-force trading labels such as overnight trading, short-term trading, or empty value inside compact quote-list rows.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-075 | Figma `29207:95624` | `tag` component set | 222x64 component set with 50x24 `隔日沖`, `短沖`, and empty `-` variants; overnight uses `#FFD98A`, short uses `#FF8A91`, and empty uses `#C0C0C0` without an outline. |

## Anatomy

- Tag container
- Optional 1px outline
- Label

## Variants

- Overnight trade: `隔日沖`, warm outline and label.
- Short trade: `短沖`, pink-red outline and label.
- Empty: `-`, muted label with no visible outline.

## States

- Default variants: observed.
- Pressed, focus-visible, selected, disabled, loading, and long-label variants: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-main-force-trade-tag-set-width` | `--cm-sys-size-main-force-trade-tag-set-width` | Component set reference width | Documentation |
| `--cm-comp-main-force-trade-tag-set-height` | `--cm-sys-size-main-force-trade-tag-set-height` | Component set reference height | Documentation |
| `--cm-comp-main-force-trade-tag-width` | `--cm-sys-size-main-force-trade-tag-width` | Tag width | All |
| `--cm-comp-main-force-trade-tag-height` | `--cm-sys-size-main-force-trade-tag-height` | Tag height | All |
| `--cm-comp-main-force-trade-tag-overnight-border-color` | `--cm-sys-color-main-force-overnight-trade` | Overnight outline | Overnight |
| `--cm-comp-main-force-trade-tag-overnight-label-color` | `--cm-sys-color-main-force-overnight-trade` | Overnight label | Overnight |
| `--cm-comp-main-force-trade-tag-short-border-color` | `--cm-sys-color-main-force-short-trade` | Short-trade outline | Short |
| `--cm-comp-main-force-trade-tag-short-label-color` | `--cm-sys-color-main-force-short-trade` | Short-trade label | Short |
| `--cm-comp-main-force-trade-tag-empty-label-color` | `--cm-sys-color-main-force-empty` | Empty label | Empty |
| `--cm-comp-main-force-trade-tag-padding-x` | `--cm-sys-spacing-xs` | Horizontal padding | All |
| `--cm-comp-main-force-trade-tag-padding-y` | `--cm-sys-spacing-xxs` | Vertical padding | All |
| `--cm-comp-main-force-trade-tag-corner-radius` | `--cm-sys-shape-corner-xs` | Tag radius | All |
| `--cm-comp-main-force-trade-tag-border-width` | `--cm-sys-size-control-border-width` | Outline width | Overnight, Short |
| `--cm-comp-main-force-trade-tag-label-text-size` | `--cm-sys-typescale-label-md-size` | Label text size | All |
| `--cm-comp-main-force-trade-tag-label-line-height` | `--cm-sys-typescale-label-md-compact-line-height` | Label line height | All |
| `--cm-comp-main-force-trade-tag-label-weight` | `--cm-sys-weight-regular` | Label weight | All |

## Layout Rules

- Keep every tag 50x24.
- Use 4px horizontal and 2px vertical padding.
- Keep a 4px radius and 1px outline for non-empty variants.
- Do not reserve extra icon space.

## Content Rules

- Observed labels are `隔日沖`, `短沖`, and `-`.
- Empty value is a centered dash, not a hidden element.

## Accessibility Rules

- If the tag conveys a filterable or navigable state, include the full label in the row's accessible text.
- Do not rely on color alone; the text label is required.

## Do / Don't

- Do keep the tag compact and outline-led.
- Do keep the empty dash visible.
- Don't restyle these as filled chips, badges, or CTA buttons.
- Don't merge these with Portfolio Attribute Label; the semantics and colors differ.

## Implementation Notes

This tag is observed inside main-force quote-list rows. Standalone pressed or selected behavior is not evidenced.
