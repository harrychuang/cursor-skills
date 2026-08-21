# Top App Bar

## Purpose

Provides persistent screen-level navigation and utility actions for the mobile trading shell.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-003 | Figma `29202:30912` | Top app bar | 375x46 bar, `#333333` background, left search/gift actions, centered `庫存/討論` selector, right notification/more actions. |
| E-060 | Figma `29199:89369` | `庫存通用元件` common inventory frame | Confirms the same 375x46 Top App Bar treatment below a 44px iPhone status area in the inventory common-control frame. |
| E-081 | Figma `594:2002` | `Top Bar/純文字+上一頁` component set | 415x286 frame with three 375x64 stock-title bars: short, long, and extreme stock names. Each uses a 20px status area above a 44px dark `#333333` context bar, 27px action icons, centered stock title/code identity, and 12px prev/next arrows. |

## Component Fingerprint

| Dimension | Fingerprint |
|---|---|
| Purpose / behavior | Persistent screen-level navigation and context switcher for the mobile trading shell. |
| Anatomy | Dark container, left actions, centered selector or stock identity, right actions, optional iOS status area, and optional previous/next stock arrows. |
| Variants / states | Inventory selector bar and stock-title back/action bar are observed. Selected segment state is observed; icon pressed/focus and expanded menus are not evidenced. |
| Token contract summary | Uses `#333333` surface-raised shell, 27px action icon boxes, compact PingFang labels, and 64px header-with-status height for stock-title variants. |
| Layout / density | Selector variant is 375x46 below status chrome. Stock-title variant is 375x64 including the 20px status region and 44px context bar. |
| Visual reference | Figma node previews `figma:vSr4NtEwPVs6wLpqCT5PtV#29202:30912`, `#29199:89369`, and `#594:2002`. |
| Similar components reviewed | Portfolio Preferred Stock Top Bar. Decision: make the stock-title source a Top App Bar variant because it shares shell, icon sizes, context height, and centered identity behavior. |

## Anatomy

- Container
- Left action group
- Center segmented selector
- Center stock identity group
- Previous/next stock arrows
- Right action group
- Icon action
- Promo icon
- Segment label

## Variants

- Default top app bar with centered two-option selector.
- Active segment: warm-gray fill.
- Inactive segment: dark surface fill.
- Stock title with back, price-target action, bell action, add-stock action, centered stock name/code, and previous/next stock arrows.
- Stock title length: short title, long title, and extreme title with downscaled title text.

## States

- Selected: observed on `庫存`.
- Default/inactive: observed on `討論`.
- Stock title short/long/extreme: observed.
- Pressed and focus-visible: inferred; use subtle surface or outline treatment until a reference exists.
- Disabled/loading: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-top-app-bar-container-color` | `--cm-sys-color-surface-raised` | Bar background | Default |
| `--cm-comp-top-app-bar-height` | `--cm-sys-size-region-header-height` | Bar height | Default |
| `--cm-comp-top-app-bar-horizontal-inset` | `--cm-sys-spacing-lg` | Outer action inset | Default |
| `--cm-comp-top-app-bar-action-gap` | `--cm-sys-spacing-xs` | Gap between icon actions | Default |
| `--cm-comp-top-app-bar-action-icon-size` | `--cm-sys-size-icon-md` | Search, notification, more action box | Default |
| `--cm-comp-top-app-bar-promo-icon-size` | `--cm-sys-size-icon-lg` | Gift/promo action box | Default |
| `--cm-comp-top-app-bar-segment-selected-container-color` | `--cm-sys-color-control-selected` | Selected selector fill | Selected |
| `--cm-comp-top-app-bar-segment-unselected-container-color` | `--cm-sys-color-surface` | Unselected selector fill | Default |
| `--cm-comp-top-app-bar-segment-label-color` | `--cm-sys-color-on-surface-strong` | Segment label | Default |
| `--cm-comp-top-app-bar-segment-label-text-size` | `--cm-sys-typescale-label-xl-size` | Segment label size | Default |
| `--cm-comp-top-app-bar-segment-label-line-height` | `--cm-sys-typescale-label-xl-line-height` | Segment label line height | Default |
| `--cm-comp-top-app-bar-segment-gap` | `--cm-sys-spacing-hairline` | Gap between segments | Default |
| `--cm-comp-top-app-bar-segment-padding-x` | `--cm-sys-spacing-md` | Segment horizontal padding | Default |
| `--cm-comp-top-app-bar-segment-padding-y` | `--cm-sys-spacing-xs` | Segment vertical padding | Default |
| `--cm-comp-top-app-bar-segment-corner-radius` | `--cm-sys-shape-corner-xxs` | Segment outer corners | Default |
| `--cm-comp-top-app-bar-stock-height` | `--cm-sys-size-region-header-with-status-height` | Stock-title bar height including status area | Stock title |
| `--cm-comp-top-app-bar-stock-context-height` | `--cm-sys-size-region-context-height` | Context row height below status area | Stock title |
| `--cm-comp-top-app-bar-stock-action-icon-size` | `--cm-sys-size-icon-md` | Back, price-target, bell, add-stock boxes | Stock title |
| `--cm-comp-top-app-bar-stock-title-width` | `--cm-sys-size-identity-label-width-xs` | Center title slot minimum/normalized width | Stock title |
| `--cm-comp-top-app-bar-stock-title-color` | `--cm-sys-color-on-surface-strong` | Stock title text | Stock title |
| `--cm-comp-top-app-bar-stock-code-color` | `--cm-sys-color-on-surface-strong` | Stock code text | Stock title |
| `--cm-comp-top-app-bar-stock-arrow-color` | `--cm-sys-color-on-surface-strong` | Previous/next arrows | Stock title |
| `--cm-comp-top-app-bar-stock-title-text-size` | `--cm-sys-typescale-title-base-size` | Default stock title size | Stock title |
| `--cm-comp-top-app-bar-stock-title-min-text-size` | `--cm-sys-typescale-label-sm-size` | Extreme-title downscaled size | Extreme title |
| `--cm-comp-top-app-bar-stock-code-text-size` | `--cm-sys-typescale-label-md-size` | Stock code size | Stock title |
| `--cm-comp-top-app-bar-stock-arrow-size` | `--cm-sys-size-icon-micro` | Previous/next arrow slot | Stock title |
| `--cm-comp-top-app-bar-stock-title-gap` | `--cm-sys-spacing-sm` | Name/code vertical rhythm | Stock title |
| `--cm-comp-top-app-bar-stock-arrow-text-gap` | `--cm-sys-spacing-m` | Arrow-to-title gap after minimum title width | Stock title |

## Layout Rules

- Width follows the viewport; observed width is 375px.
- Height is 46px below the iOS status area.
- Left group starts 11px from the edge and uses 4px item gap.
- Center selector is horizontally centered and about 98px wide.
- Right group starts at x=306 in the 375px frame.
- Icon action boxes are 27px; promo icon box is 30px.
- Stock-title variant is 64px high including the 20px status bar and 44px context row.
- Stock-title variant uses 27px action boxes at the left and right edges, centered stock identity, and 12px previous/next arrows.
- Keep the arrow-to-title gap at 10px after the stock title reaches its minimum slot width; long titles can downscale before arrows drift.

## Content Rules

- Keep segment labels short, two to three Traditional Chinese characters where possible.
- Do not place screen titles and selector labels at the same time unless a future reference shows that layout.
- Stock-title bars can show a stock name above a code. Long Traditional Chinese names should truncate or downscale within the title slot rather than pushing side actions.

## Accessibility Rules

- Icon-only actions require accessible names such as `搜尋`, `通知`, and `更多`.
- Segmented selector should expose selected state.
- Minimum tappable area should be increased in implementation if platform hit target requirements exceed the visual box.

## Do / Don't

- Do keep the app bar flat and dark.
- Do keep the selector centered.
- Do keep stock identity centered in the stock-title variant.
- Don't replace the selector with a large title treatment.
- Don't create a separate top-bar component for the stock-title source unless future evidence shows different shell behavior.
- Don't add shadows, gradients, or translucent effects.

## Implementation Notes

The Figma code uses absolute placement. In implementation, use a fixed-height relative container with left, center, and right slots so the centered selector remains stable.
