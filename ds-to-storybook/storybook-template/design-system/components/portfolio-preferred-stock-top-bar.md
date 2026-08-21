# Portfolio Preferred Stock Top Bar

## Purpose

Provides context navigation for a portfolio attribute-specific preferred-stock list.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-035 | Figma `29209:171182` | `Top Bar` | 375x44 bar with back icon, centered attribute title, and right-side exchange/sort icon. |

## Anatomy

- Top bar container
- Back icon
- Center title group
- Attribute tag
- Title text
- Right action icon

## Variants

- Long-term attribute title: observed.
- Swing, short-term, all-operation, and no-feature attribute titles: not observed.

## States

- Default: observed.
- Pressed/focus-visible icon states and opened right-action menu: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-portfolio-preferred-stock-top-bar-container-color` | `--cm-sys-color-surface-raised` | Bar background | Default |
| `--cm-comp-portfolio-preferred-stock-top-bar-width` | `--cm-sys-size-viewport-compact-width` | Bar width | Default |
| `--cm-comp-portfolio-preferred-stock-top-bar-height` | `--cm-sys-size-portfolio-preferred-context-height` | Bar height | Default |
| `--cm-comp-portfolio-preferred-stock-top-bar-action-icon-size` | `--cm-sys-size-icon-md` | Back/right icon size | Default |
| `--cm-comp-portfolio-preferred-stock-top-bar-title-gap` | `--cm-sys-spacing-xs` | Attribute/title gap | Default |
| `--cm-comp-portfolio-preferred-stock-top-bar-attribute-container-color` | `--cm-sys-color-portfolio-long-term` | Attribute tag fill | Long-term |
| `--cm-comp-portfolio-preferred-stock-top-bar-attribute-label-color` | `--cm-sys-color-on-portfolio-long-term` | Attribute tag text | Long-term |
| `--cm-comp-portfolio-preferred-stock-top-bar-attribute-padding-x` | `--cm-sys-spacing-xs` | Attribute tag horizontal padding | Default |
| `--cm-comp-portfolio-preferred-stock-top-bar-attribute-padding-y` | `--cm-sys-spacing-xxs` | Attribute tag vertical padding | Default |
| `--cm-comp-portfolio-preferred-stock-top-bar-attribute-corner-radius` | `--cm-sys-shape-corner-label` | Attribute tag radius | Default |
| `--cm-comp-portfolio-preferred-stock-top-bar-attribute-text-size` | `--cm-sys-typescale-label-xl-size` | Attribute tag size | Default |
| `--cm-comp-portfolio-preferred-stock-top-bar-attribute-weight` | `--cm-sys-weight-medium` | Attribute tag weight | Default |
| `--cm-comp-portfolio-preferred-stock-top-bar-title-color` | `--cm-sys-color-on-surface-strong` | Title text | Default |
| `--cm-comp-portfolio-preferred-stock-top-bar-title-text-size` | `--cm-sys-typescale-title-md-size` | Title size | Default |
| `--cm-comp-portfolio-preferred-stock-top-bar-title-line-height` | `--cm-sys-typescale-title-md-line-height` | Title line height | Default |

## Layout Rules

- Bar is 375x44 on `surface-raised`.
- Back icon is 27px and aligned to the left action slot.
- Center title group uses a 4px gap between the attribute tag and `屬性的股票`.
- Right action icon is 27px and aligned to the right action slot.

## Content Rules

- Observed title copy is `長期存股 屬性的股票`.
- The attribute tag is text-only and does not include the percent in this bar.
- Do not add a subtitle or count to the top bar.

## Accessibility Rules

- Back and right action icons need accessible names.
- The centered title should expose the full context, such as `長期存股屬性的股票`.

## Do / Don't

- Do keep the top bar as navigation/context chrome.
- Don't reuse the full 105x24 attribute-percent label here; the observed top-bar tag omits percent.
