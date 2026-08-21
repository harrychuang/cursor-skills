# Button

## Purpose

Defines the global primary action button family for compact product commands. This component covers filled and outline primary buttons across five sizes and optional leading/trailing icon slots.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-083 | Figma `1934:94` | `button` component set | 5402x1133 component set with `tiny`, `small`, `medium`, `large`, and `giant` sizes; `primary_fill` and `primary_outline` types; default, pressed, and disabled states; optional leading icon, trailing icon, and icon-only variants. Variables confirm `#FF7800`, `#CC6102`, `#3F1D00`, `#EBC09A`, `#808080`, `#999999`, and white. |

## Component Fingerprint

| Dimension | Fingerprint |
|---|---|
| Purpose / behavior | Global command primitive for compact primary actions, not a row, chip, badge, or sheet footer strip. |
| Anatomy | Container, optional border, label, optional leading icon, optional trailing icon, and icon-only treatment. |
| Variants / states | `primary_fill` and `primary_outline`; tiny/small/medium/large/giant; default, pressed, disabled; leading icon, trailing icon, and icon-only states are evidenced. Hover, focus-visible, loading, destructive, secondary, and neutral variants are not shown in this source. |
| Token contract summary | Uses primary orange for default fill/outline, darker orange for pressed fill, deep brown for pressed outline fill, pale orange pressed fill label, and explicit disabled gray border/label with transparent container. |
| Layout / density | Heights step from 25, 28, 38, 41, and 44px; giant disabled variants are 46px. Widths are fixed by size/content/icon combination in the source, with 112px added for the medium icon width. |
| Visual reference | Figma node preview `figma:vSr4NtEwPVs6wLpqCT5PtV#1934:94`; get_screenshot captured 2026-06-15. |
| Similar components reviewed | Bottom Sheet Footer Button, Portfolio Add Action Button, Portfolio Add Holding Sheet confirm action, Similar Stock Button, Return Today Button, and Event Filter Option. Decision: extract global Button as the primitive; sheet/domain actions keep their scoped component contracts. |

## Anatomy

- Container
- Border
- Label
- Leading icon slot
- Trailing icon slot
- Icon-only slot

## Variants

- Type: `primary_fill`, `primary_outline`.
- Size: tiny, small, medium, large, giant.
- Icon composition: no icon, leading icon, trailing icon, icon-only.

## States

- Default fill: observed as orange container with white label.
- Pressed fill: observed as darker orange container with pale orange label.
- Disabled fill: observed as transparent/dark container with gray border and gray label.
- Default outline: observed as transparent/dark container with orange border and orange label.
- Pressed outline: observed as deep brown container with orange border and orange label.
- Disabled outline: observed as transparent/dark container with gray border and gray label.
- Hover, focus-visible, loading, destructive, secondary, and neutral: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-button-primary-fill-default-container-color` | `--cm-sys-color-primary` | Filled button container | Default |
| `--cm-comp-button-primary-fill-pressed-container-color` | `--cm-sys-color-primary-pressed` | Filled button container | Pressed |
| `--cm-comp-button-primary-fill-disabled-container-color` | `--cm-sys-color-transparent` | Filled button container | Disabled |
| `--cm-comp-button-primary-fill-default-label-color` | `--cm-sys-color-on-primary` | Filled button label/icon | Default |
| `--cm-comp-button-primary-fill-pressed-label-color` | `--cm-sys-color-on-primary-pressed` | Filled button label/icon | Pressed |
| `--cm-comp-button-primary-fill-disabled-label-color` | `--cm-sys-color-on-disabled` | Filled button label/icon | Disabled |
| `--cm-comp-button-primary-fill-disabled-border-color` | `--cm-sys-color-disabled` | Disabled outline fallback | Disabled |
| `--cm-comp-button-primary-outline-default-container-color` | `--cm-sys-color-transparent` | Outline button container | Default |
| `--cm-comp-button-primary-outline-pressed-container-color` | `--cm-sys-color-primary-outline-pressed` | Outline button pressed fill | Pressed |
| `--cm-comp-button-primary-outline-disabled-container-color` | `--cm-sys-color-transparent` | Outline button container | Disabled |
| `--cm-comp-button-primary-outline-default-border-color` | `--cm-sys-color-primary` | Outline stroke | Default |
| `--cm-comp-button-primary-outline-pressed-border-color` | `--cm-sys-color-primary` | Outline stroke | Pressed |
| `--cm-comp-button-primary-outline-disabled-border-color` | `--cm-sys-color-disabled` | Outline stroke | Disabled |
| `--cm-comp-button-primary-outline-default-label-color` | `--cm-sys-color-primary` | Outline label/icon | Default |
| `--cm-comp-button-primary-outline-pressed-label-color` | `--cm-sys-color-primary` | Outline label/icon | Pressed |
| `--cm-comp-button-primary-outline-disabled-label-color` | `--cm-sys-color-on-disabled` | Outline label/icon | Disabled |
| `--cm-comp-button-border-width` | `--cm-sys-size-control-border-width` | Border width | Outline/disabled |
| `--cm-comp-button-corner-radius` | `--cm-sys-shape-corner-xs` | Container radius | All |
| `--cm-comp-button-gap-compact` | `--cm-sys-spacing-xs` | Tiny/small icon-label gap | Icon variants |
| `--cm-comp-button-gap-default` | `--cm-sys-spacing-md` | Medium/large/giant icon-label gap | Icon variants |
| `--cm-comp-button-height-tiny` | `--cm-sys-size-action-height-tiny` | Tiny height | Tiny |
| `--cm-comp-button-height-sm` | `--cm-sys-size-action-height-sm` | Small height | Small |
| `--cm-comp-button-height-md` | `--cm-sys-size-action-height-md` | Medium height | Medium |
| `--cm-comp-button-height-lg` | `--cm-sys-size-action-height-lg` | Large height | Large |
| `--cm-comp-button-height-xl` | `--cm-sys-size-action-height-xl` | Giant height | Giant |
| `--cm-comp-button-height-xl-disabled` | `--cm-sys-size-action-height-xl-disabled` | Giant disabled height | Disabled giant |
| `--cm-comp-button-width-tiny` | `--cm-sys-size-action-width-tiny` | Tiny no-icon width | Tiny |
| `--cm-comp-button-width-tiny-with-icon` | `--cm-sys-size-action-width-tiny-icon` | Tiny icon width | Tiny icon |
| `--cm-comp-button-width-sm` | `--cm-sys-size-action-width-sm` | Small no-icon width | Small |
| `--cm-comp-button-width-sm-with-icon` | `--cm-sys-size-action-width-sm-icon` | Small icon width | Small icon |
| `--cm-comp-button-width-md` | `--cm-sys-size-action-width-md` | Medium no-icon width | Medium |
| `--cm-comp-button-width-md-with-icon` | `--cm-sys-size-action-width-md-icon` | Medium icon width | Medium icon |
| `--cm-comp-button-width-lg` | `--cm-sys-size-action-width-lg` | Large no-icon width | Large |
| `--cm-comp-button-width-lg-with-icon` | `--cm-sys-size-action-width-lg-icon` | Large icon width | Large icon |
| `--cm-comp-button-width-xl` | `--cm-sys-size-action-width-xl` | Giant no-icon width | Giant |
| `--cm-comp-button-width-xl-with-icon` | `--cm-sys-size-action-width-xl-icon` | Giant icon width | Giant icon |
| `--cm-comp-button-icon-only-size` | `--cm-sys-size-action-height-tiny` | Square icon-only control | Icon-only |
| `--cm-comp-button-label-weight` | `--cm-sys-weight-medium` | Label weight | All |

## Layout Rules

- Keep tiny buttons 25px high, small 28px, medium 38px, large 41px, and giant 44px.
- Giant disabled variants may use the observed 46px height because the disabled outline stroke expands the source frame.
- Use 4px radius and 1px outline strokes.
- Use fixed source widths for component parity: tiny 62px, small 70px, medium 90px, large 98px, giant 106px for no-icon variants.
- Icon variants widen the control rather than shrinking the label: observed widths include 76px tiny, 84-86px small, 112px medium, 122px large, and 128-132px giant.
- Icon-only tiny control is a 25x25 square.

## Content Rules

- Keep labels short; the source label is `按鈕文案`.
- Use real icons in leading/trailing slots; do not draw text placeholders as icons.
- Disabled fill and disabled outline collapse to the same gray outline treatment in this source.

## Accessibility Rules

- Render as a native button when interactive.
- Icon-only variants require an explicit accessible name.
- Do not rely on orange/gray alone for disabled state; expose disabled state semantically.
- Focus-visible is not evidenced; use the platform focus-ring rule and document it as inferred.

## Do / Don't

- Do use Button for app-wide compact primary actions.
- Do keep sheet-specific footer actions scoped to Bottom Sheet Footer Button.
- Don't use Button for event options, promotional badges, valuation labels, or quote-row metadata.
- Don't invent destructive, loading, or secondary variants from this source.
- Don't use opacity to create disabled state; use the explicit gray outline/label treatment.

## Implementation Notes

The older generic `--cm-comp-button-primary-*` aliases remain in the token file for compatibility. New implementation should prefer the explicit `primary-fill` and `primary-outline` slots because the Figma component set proves that disabled fill is not a gray filled button in this source.

E-085 confirms Empty State composes the existing Button for the `查看教學` primary CTA. The 266px CTA width is owned by the Empty State host layout; Button still owns the fill, radius, label typography, and interactive state contract.
