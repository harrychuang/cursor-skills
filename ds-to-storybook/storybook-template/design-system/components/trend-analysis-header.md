# Trend Analysis Header

## Purpose

Provides a compact local header for a stock trend-analysis module, pairing the `走勢分析` title and actions with an inline range filter. Use it when a chart or analysis block needs its own period controls, not as a primary inventory tab, secondary market filter, or generic button group.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-090 | Figma `51059:51226` | `Frame 480962346` | 375x86 dark header/filter composition with `走勢分析`, 16px info icon, 20px share icon, a 42px filter row, a `#333333` 6px-radius range group, selected `全部` filled `#808080` with low shadow, inactive `近一週` / `近一月` / `年初至今` gray labels, and a right-side `自訂` outline control. |

## Component Fingerprint

| Dimension | Fingerprint |
|---|---|
| Purpose / behavior | Local analysis-section header with period filtering and secondary actions. It is not a page top bar, primary inventory tab strip, secondary market filter, event filter option, or global Button group. |
| Anatomy | Container, title row, title text, info icon, share action, filter row, range group, selected range option, inactive range options, and custom range outline control. |
| Variants / states | Default header with `全部` selected is observed. Inactive range options and default custom control are observed. Other active ranges, custom picker open/selected, info tooltip, share pressed/focus-visible, disabled, loading, and long-label behavior are not shown. |
| Token contract summary | 375x86 surface, 16px side insets, 18px semibold title, 16px info icon, 20px share icon, 42px filter row, 6px range-group radius, 4px option/custom radii, 51/54/68px option widths, and a normalized low selected-option shadow. |
| Layout / density | Two-row compact module header. Title row uses 16px top and 8px bottom padding; range controls stay in one 42px row with the custom action separated to the right. |
| Visual reference | Figma node preview `figma:vSr4NtEwPVs6wLpqCT5PtV#51059:51226`; get_screenshot captured 2026-06-17. |
| Similar components reviewed | Market Filter Tab Strip, Market Tab Strip, Portfolio Preference Header, Stock Calendar header, Event Filter Option, and Button. Decision: keep distinct because this source owns a titled analysis header plus gray filled range selection and custom outline action. |

## Anatomy

- Container
- Title row
- Title label
- Info icon
- Share action
- Filter row
- Range group
- Range option
- Custom range action

## Variants

- Default: `全部` selected, `近一週`, `近一月`, and `年初至今` inactive.
- Custom default: `自訂` outline control with gray border and label.

## States

- Selected range: observed as a `#808080` filled 4px-radius option with white 13px medium label and a low black shadow.
- Inactive range: observed as transparent option slots with gray 14px regular labels.
- Custom default: observed as transparent 4px-radius outline control with gray 14px regular label.
- Other selected range states, custom picker open/selected, info tooltip, share pressed, focus-visible, disabled, loading, and long labels: not observed and not inferred.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-trend-analysis-header-width` | `--cm-sys-size-analysis-header-width` | Header width | All |
| `--cm-comp-trend-analysis-header-height` | `--cm-sys-size-analysis-header-height` | Header height | All |
| `--cm-comp-trend-analysis-header-container-color` | `--cm-sys-color-surface` | Header surface | All |
| `--cm-comp-trend-analysis-header-title-color` | `--cm-sys-color-on-surface-strong` | Title text | Default |
| `--cm-comp-trend-analysis-header-info-icon-color` | `--cm-sys-color-on-surface-medium` | Info icon | Default |
| `--cm-comp-trend-analysis-header-share-icon-color` | `--cm-sys-color-on-surface-strong` | Share icon | Default |
| `--cm-comp-trend-analysis-header-range-group-container-color` | `--cm-sys-color-surface-raised` | Range group fill | Default |
| `--cm-comp-trend-analysis-header-range-selected-container-color` | `--cm-sys-color-control-selected-muted` | Selected range fill | Selected |
| `--cm-comp-trend-analysis-header-range-selected-label-color` | `--cm-sys-color-on-control-selected-muted` | Selected range label | Selected |
| `--cm-comp-trend-analysis-header-range-unselected-container-color` | `--cm-sys-color-transparent` | Inactive range fill | Inactive |
| `--cm-comp-trend-analysis-header-range-unselected-label-color` | `--cm-sys-color-on-surface-subtle` | Inactive range labels | Inactive |
| `--cm-comp-trend-analysis-header-custom-container-color` | `--cm-sys-color-transparent` | Custom control fill | Default |
| `--cm-comp-trend-analysis-header-custom-border-color` | `--cm-sys-color-on-surface-subtle` | Custom control outline | Default |
| `--cm-comp-trend-analysis-header-custom-label-color` | `--cm-sys-color-on-surface-subtle` | Custom label | Default |
| `--cm-comp-trend-analysis-header-title-row-padding-x` | `--cm-sys-spacing-screen-gutter` | Title row horizontal inset | All |
| `--cm-comp-trend-analysis-header-title-row-padding-top` | `--cm-sys-spacing-screen-gutter` | Title row top inset | All |
| `--cm-comp-trend-analysis-header-title-row-padding-bottom` | `--cm-sys-spacing-md` | Title row bottom inset | All |
| `--cm-comp-trend-analysis-header-title-gap` | `--cm-sys-spacing-md` | Title/info gap | Default |
| `--cm-comp-trend-analysis-header-filter-row-height` | `--cm-sys-size-analysis-filter-row-height` | Filter row height | All |
| `--cm-comp-trend-analysis-header-filter-row-padding-x` | `--cm-sys-spacing-screen-gutter` | Filter row horizontal inset | All |
| `--cm-comp-trend-analysis-header-range-group-padding` | `--cm-sys-spacing-xxs` | Range group padding | Default |
| `--cm-comp-trend-analysis-header-range-group-gap` | `--cm-sys-spacing-xs` | Range option gap | Default |
| `--cm-comp-trend-analysis-header-range-option-padding-x` | `--cm-sys-spacing-sm` | Range option horizontal padding | All range options |
| `--cm-comp-trend-analysis-header-range-option-padding-y` | `--cm-sys-spacing-xxs` | Range option vertical padding | All range options |
| `--cm-comp-trend-analysis-header-custom-padding-x` | `--cm-sys-spacing-md` | Custom control horizontal padding | Default |
| `--cm-comp-trend-analysis-header-custom-padding-y` | `--cm-sys-spacing-xs` | Custom control vertical padding | Default |
| `--cm-comp-trend-analysis-header-range-group-corner-radius` | `--cm-sys-shape-corner-sm-plus` | Range group radius | Default |
| `--cm-comp-trend-analysis-header-range-option-corner-radius` | `--cm-sys-shape-corner-xs` | Range option radius | All range options |
| `--cm-comp-trend-analysis-header-custom-corner-radius` | `--cm-sys-shape-corner-xs` | Custom control radius | Default |
| `--cm-comp-trend-analysis-header-custom-border-width` | `--cm-sys-size-control-border-width` | Custom outline width | Default |
| `--cm-comp-trend-analysis-header-range-option-active-width` | `--cm-sys-size-analysis-range-option-width-active` | Selected `全部` width | Selected |
| `--cm-comp-trend-analysis-header-range-option-width-sm` | `--cm-sys-size-analysis-range-option-width-sm` | `近一週` / `近一月` option width | Inactive |
| `--cm-comp-trend-analysis-header-range-option-width-lg` | `--cm-sys-size-analysis-range-option-width-lg` | `年初至今` option width | Inactive |
| `--cm-comp-trend-analysis-header-info-icon-size` | `--cm-sys-size-icon-xs` | Info icon size | Default |
| `--cm-comp-trend-analysis-header-share-icon-size` | `--cm-sys-size-icon-sm` | Share icon size | Default |
| `--cm-comp-trend-analysis-header-title-text-size` | `--cm-sys-typescale-title-md-size` | Title size | Default |
| `--cm-comp-trend-analysis-header-title-line-height` | `--cm-sys-typescale-table-header-line-height` | Title line height | Default |
| `--cm-comp-trend-analysis-header-title-weight` | `--cm-sys-weight-semibold` | Title weight | Default |
| `--cm-comp-trend-analysis-header-range-selected-label-text-size` | `--cm-sys-typescale-label-sm-size` | Selected range label size | Selected |
| `--cm-comp-trend-analysis-header-range-selected-label-line-height` | `--cm-sys-typescale-table-header-line-height` | Selected range label line height | Selected |
| `--cm-comp-trend-analysis-header-range-selected-label-weight` | `--cm-sys-weight-medium` | Selected range label weight | Selected |
| `--cm-comp-trend-analysis-header-range-unselected-label-text-size` | `--cm-sys-typescale-label-md-size` | Inactive range label size | Inactive |
| `--cm-comp-trend-analysis-header-range-unselected-label-line-height` | `--cm-sys-typescale-table-header-line-height` | Inactive range label line height | Inactive |
| `--cm-comp-trend-analysis-header-range-unselected-label-weight` | `--cm-sys-weight-regular` | Inactive range label weight | Inactive |
| `--cm-comp-trend-analysis-header-custom-label-text-size` | `--cm-sys-typescale-label-md-size` | Custom label size | Default |
| `--cm-comp-trend-analysis-header-custom-label-line-height` | `--cm-sys-typescale-table-header-line-height` | Custom label line height | Default |
| `--cm-comp-trend-analysis-header-custom-label-weight` | `--cm-sys-weight-regular` | Custom label weight | Default |
| `--cm-comp-trend-analysis-header-range-selected-shadow` | `--cm-sys-shadow-control-selected-low` | Selected range shadow | Selected |

## Layout Rules

- Keep the header 375x86 on the dark `#252525` surface.
- Use 16px left/right inset for both rows.
- Title row uses 16px top padding and 8px bottom padding, with title and info icon grouped at 8px.
- Place the share action at the trailing edge of the title row.
- Filter row is 42px high and vertically centers the range group and custom control.
- Range group uses 2px padding, 4px option gap, and a 6px outer radius.
- Use fixed observed range option widths: 51px for selected `全部`, 54px for `近一週` / `近一月`, and 68px for `年初至今`.
- Keep `自訂` as a right-side outline control, not part of the filled range group.

## Content Rules

- Observed title is `走勢分析`.
- Observed range labels are `全部`, `近一週`, `近一月`, and `年初至今`.
- Observed custom action label is `自訂`.
- Keep labels single-line and centered. Do not add counts, secondary copy, market values, or date strings inside the range options without new evidence.

## Accessibility Rules

- Use a labeled section or group for the trend analysis header.
- Expose the range options as a single-selection segmented control or radio group if they filter the analysis content.
- The selected option must expose selected state programmatically.
- Info and share icons need accessible names when interactive.
- The custom control must be a real button if it opens a picker.

## Do / Don't

- Do use Trend Analysis Header for local chart/analysis period switching.
- Do keep the active range as a muted gray filled segment, not orange.
- Do keep the custom range control visually separate as an outline action.
- Don't merge this into Market Filter Tab Strip or Market Tab Strip; those change market/inventory sections and use different active-state semantics.
- Don't replace the range options with event filter options, large chips, underlined tabs, or global Buttons.
- Don't add month pickers, tooltip surfaces, disabled styles, loading skeletons, or alternate active ranges without Figma evidence.

## Implementation Notes

The observed `0 2px 2px rgba(0, 0, 0, 0.15)` selected-option shadow is normalized to the existing low surface shadow role to avoid adding another near-identical shadow primitive. The 6px range-group radius and 51px selected option width are kept as distinct tokens because they are part of the fixed segmented range geometry.
