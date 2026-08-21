https://www.figma.com/design/vSr4NtEwPVs6wLpqCT5PtV/%E7%B1%8C%E7%A2%BC-K-%E7%B7%9A-ChipK--Design-System-Lab-?node-id=16405-224755&t=Jls6lg1T69Nfj29r-1# Market Filter Tab Strip

## Purpose

Switches between secondary market views inside the compact quote-screen header without adding a larger toolbar or card surface.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-046 | Figma `29202:31008` | `看盤盤後` component set | Five 375x40 strips for `即時報價`, `主力籌碼`, `三大法人`, `當沖`, and `融資券`; each option uses a `#333333` 4px-radius item with 14px label text. Active state changes the label to orange while inactive labels stay gray. |

## Anatomy

- Strip container
- Option group
- Option item
- Label

## Variants

- Active `即時報價`
- Active `主力籌碼`
- Active `三大法人`
- Active `當沖`
- Active `融資券`

## States

- Active: observed as orange label text on the same dark item fill.
- Inactive: observed as gray label text on the same dark item fill.
- Pressed/focus-visible: not observed.
- Disabled/unavailable: not observed.
- Loading/error: not applicable from current evidence.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-market-filter-strip-set-width` | `--cm-sys-size-market-filter-set-width` | Component set reference width | Documentation |
| `--cm-comp-market-filter-strip-set-height` | `--cm-sys-size-market-filter-set-height` | Component set reference height | Documentation |
| `--cm-comp-market-filter-strip-width` | `--cm-sys-size-market-filter-width` | Strip width | Default |
| `--cm-comp-market-filter-strip-height` | `--cm-sys-size-market-filter-height` | Strip height | Default |
| `--cm-comp-market-filter-strip-content-inset-x` | `--cm-sys-size-market-filter-inset-x` | Left content inset | Default |
| `--cm-comp-market-filter-strip-content-inset-y` | `--cm-sys-size-market-filter-inset-y` | Top content inset | Default |
| `--cm-comp-market-filter-strip-gap` | `--cm-sys-spacing-md` | Gap between option items | Default |
| `--cm-comp-market-filter-strip-item-container-color` | `--cm-sys-color-surface-raised` | Option item fill | Default |
| `--cm-comp-market-filter-strip-item-padding-x` | `--cm-sys-spacing-sm` | Option horizontal padding | Default |
| `--cm-comp-market-filter-strip-item-padding-y` | `--cm-sys-spacing-xxs` | Option vertical padding | Default |
| `--cm-comp-market-filter-strip-item-corner-radius` | `--cm-sys-shape-corner-xs` | Option item radius | Default |
| `--cm-comp-market-filter-strip-active-label-color` | `--cm-sys-color-primary` | Selected option label | Active |
| `--cm-comp-market-filter-strip-inactive-label-color` | `--cm-sys-color-on-surface-subtle` | Unselected option label | Inactive |
| `--cm-comp-market-filter-strip-label-text-size` | `--cm-sys-typescale-label-md-size` | Label size | Default |
| `--cm-comp-market-filter-strip-label-line-height` | `--cm-sys-typescale-label-md-compact-line-height` | Label line height | Default |

## Layout Rules

- Use a 375x40 strip when placed in the mobile header stack.
- Position the option group with a 13px left inset and 8px top inset.
- Keep 8px gaps between option items.
- Option items use 6px horizontal padding, 2px vertical padding, and 4px radius.
- Labels are 14px PingFang TC regular, center aligned, and no-wrap.

## Content Rules

- Observed labels are `即時報價`, `主力籌碼`, `三大法人`, `當沖`, and `融資券`.
- Keep labels short enough to fit the single-line strip.
- Do not add icons, counts, subtitles, or explanatory text without new evidence.

## Accessibility Rules

- Use a tablist pattern if the control changes panels in-place; use a segmented/radio pattern if it only filters a list.
- The active option must expose selected state programmatically.
- Keep each option's accessible name identical to its visible label.
- Provide a visible focus indicator in implementation; current Figma evidence does not define it.

## Do / Don't

- Do keep active and inactive items on the same dark item fill.
- Do use orange text only for the active option.
- Don't enlarge this into a large chip group or marketing-style selector.
- Don't represent selection with a different filled container unless future evidence shows it.

## Implementation Notes

Horizontal overflow, long-label wrapping, disabled/unavailable options, and pressed/focus styling still need future Figma evidence.
