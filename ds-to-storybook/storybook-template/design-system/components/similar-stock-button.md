# Similar Stock Button

## Purpose

Defines the neutral CTA used to navigate from a stock detail bottom sheet to a similar-stock list.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-070 | Figma `29210:28828` | `BTN/相似股` | 415x49 gray action with observed `#404040` normalized to `#3D3D3D`, 4px radius, 27px horizontal and 12px vertical padding, 4px icon/label gap, 24px search icon slot, and 18px regular white `查看相似的股票` label. |
| E-032 | Figma `29209:162730` | `持股速配/長期存股/股票彈窗` | Shows the similar-stock action inside the portfolio fit stock bottom sheet. |

## Anatomy

- Button container
- Search icon slot
- Centered label

## Variants

- Default similar-stock action: observed.
- Focus-visible: product-level keyboard focus state used for Storybook/Figma export QA.
- Pressed, disabled, loading, icon-only, and long-label variants: not observed.

## States

- Default: observed.
- Focus-visible: implemented with the project focus ring rule; Storybook export uses an equivalent forced border because the Figma exporter maps borders, not CSS outlines.
- Pressed, disabled, and loading states: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-similar-stock-button-width` | `--cm-sys-size-similar-stock-action-width` | Reference width | Default |
| `--cm-comp-similar-stock-button-height` | `--cm-sys-size-similar-stock-action-height` | Button height | Default |
| `--cm-comp-similar-stock-button-container-color` | `--cm-sys-color-action-subtle` | Button fill | Default |
| `--cm-comp-similar-stock-button-label-color` | `--cm-sys-color-on-surface-strong` | Label color | Default |
| `--cm-comp-similar-stock-button-icon-color` | `--cm-sys-color-on-surface-strong` | Search icon color | Default |
| `--cm-comp-similar-stock-button-padding-x` | `--cm-sys-spacing-control-content-lg` | Horizontal padding | Default |
| `--cm-comp-similar-stock-button-padding-y` | `--cm-sys-spacing-l` | Vertical padding | Default |
| `--cm-comp-similar-stock-button-gap` | `--cm-sys-spacing-xs` | Icon/label gap | Default |
| `--cm-comp-similar-stock-button-corner-radius` | `--cm-sys-shape-corner-xs` | Button radius | Default |
| `--cm-comp-similar-stock-button-icon-size` | `--cm-sys-size-icon-standard` | Search icon slot size | Default |
| `--cm-comp-similar-stock-button-label-text-size` | `--cm-sys-typescale-date-md-size` | Label size | Default |
| `--cm-comp-similar-stock-button-label-line-height` | `--cm-sys-typescale-date-md-line-height` | Label line height | Default |
| `--cm-comp-similar-stock-button-label-weight` | `--cm-sys-weight-regular` | Label weight | Default |

## Layout Rules

- Keep the button 49px high with a flat `#3D3D3D` fill and 4px radius.
- Keep the search icon and label centered as one group with a 4px gap.
- In a 375px sheet, inset the action according to the sheet layout rather than stretching it into a card.

## Content Rules

- Observed label is `查看相似的股票`.
- Do not add explanatory copy below the button.

## Accessibility Rules

- Expose the visible label as the button's accessible name.
- The search icon is decorative when the label is present.

## Do / Don't

- Do use this as a neutral navigation CTA from stock analysis detail sheets.
- Don't recolor it orange; it is not the primary submit action.
- Don't turn it into a promotional card or large discovery panel.

## Implementation Notes

This button reuses the same subtle neutral action surface as bottom-sheet gray action rows, but it is a stock-analysis CTA with a search icon and a fixed 49px action rhythm.

Use `figmaVariant` only in Storybook export stories such as `AllVariants` so default and focus-visible actions emit stable `data-variant` values and the Figma importer can create named component variants without relying on the fallback component key.

The `cm-similar-stock-button--focus-visible` forced class intentionally uses `border` rather than `outline` so the Figma exporter emits a stroke for the focus-visible variant. Runtime keyboard focus can continue using the native `:focus-visible` outline path.
