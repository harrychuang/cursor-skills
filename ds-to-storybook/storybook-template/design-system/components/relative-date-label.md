# Relative Date Label

## Purpose

Displays a compact calendar date with an optional relative-day marker for today, future dates, past dates, or absolute-only dates.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-020 | Figma `19215:187463` | `日期` component set | Twelve variants in a 382x294 set, each label 37px high. |
| E-021 | Figma `19215:187463` | Date, relative text, and today icon | Date text is white 18px; relative text is 16px; today/future uses `#FFEEB1`; past uses `#C0C0C0`; today icon is 12px. |

## Anatomy

- Label container
- Date text
- Relative-day text
- Today icon
- Today text group

## Variants

- Today: observed as `06/29` with 12px icon and `今天`.
- Future: observed as `明天`, `2天後`, `3天後`, `4天後`, and `5天後`.
- Past: observed as `昨天`, `2天前`, `3天前`, and `5天前`.
- Absolute only: observed as `07/05` with no relative-day text.

## States

- Default passive label: observed.
- Current/today: observed.
- Future-relative: observed.
- Past-relative: observed.
- Selected, pressed, focus-visible, disabled, loading, and error states: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-relative-date-label-container-height` | `--cm-sys-size-date-label-height` | Label height | Default |
| `--cm-comp-relative-date-label-padding-x` | `--cm-sys-spacing-l` | Horizontal inset | Default |
| `--cm-comp-relative-date-label-padding-top` | `--cm-sys-spacing-l` | Top inset | Default |
| `--cm-comp-relative-date-label-content-gap` | `--cm-sys-spacing-l` | Gap between date and relative text | Default |
| `--cm-comp-relative-date-label-today-gap` | `--cm-sys-spacing-xs` | Gap between today icon and label | Today |
| `--cm-comp-relative-date-label-date-color` | `--cm-sys-color-on-background` | Date text color | Default |
| `--cm-comp-relative-date-label-date-text-size` | `--cm-sys-typescale-date-md-size` | Date text size | Default |
| `--cm-comp-relative-date-label-date-line-height` | `--cm-sys-typescale-date-md-line-height` | Date line height | Default |
| `--cm-comp-relative-date-label-current-color` | `--cm-sys-color-temporal-current` | Today relative text and icon color | Today |
| `--cm-comp-relative-date-label-future-color` | `--cm-sys-color-temporal-future` | Future relative text color | Future |
| `--cm-comp-relative-date-label-past-color` | `--cm-sys-color-temporal-past` | Past relative text color | Past |
| `--cm-comp-relative-date-label-relative-text-size` | `--cm-sys-typescale-label-xl-size` | Relative-day text size | Default |
| `--cm-comp-relative-date-label-relative-line-height` | `--cm-sys-typescale-label-xl-line-height` | Relative-day line height | Default |
| `--cm-comp-relative-date-label-today-icon-size` | `--cm-sys-size-icon-micro` | Today icon size | Today |
| `--cm-comp-relative-date-label-width-xs` | `--cm-sys-size-date-label-width-xs` | Absolute-only label width | Absolute only |
| `--cm-comp-relative-date-label-width-sm` | `--cm-sys-size-date-label-width-sm` | Short date plus short relative text width | Past/future |
| `--cm-comp-relative-date-label-width-smd` | `--cm-sys-size-date-label-width-smd` | Medium-short relative text width | Future |
| `--cm-comp-relative-date-label-width-md` | `--cm-sys-size-date-label-width-md` | Medium relative text width | Past/future |
| `--cm-comp-relative-date-label-width-lg` | `--cm-sys-size-date-label-width-lg` | Long past relative text width | Past |
| `--cm-comp-relative-date-label-width-xl` | `--cm-sys-size-date-label-width-xl` | Today label with icon width | Today |

## Layout Rules

- Use a 37px-high inline label with 12px horizontal inset and 12px top inset.
- Keep date and relative-day text on one line.
- Use a 12px gap between the date and relative-day segment.
- In the today variant, place the 12px icon immediately before `今天` with a 4px gap.
- Do not add background fill, border, card wrapper, or rounded badge treatment.

## Content Rules

- Date text uses `MM/DD` format in observed examples.
- Relative text is short Chinese copy: `今天`, `明天`, `昨天`, `N天後`, or `N天前`.
- Absolute-only dates omit the relative-day segment rather than showing a placeholder.
- Future and today use the same warm temporal color; past uses muted gray.

## Accessibility Rules

- If the label is announced, include both absolute date and relative-day copy, such as `06/29 今天`.
- Do not rely on the today icon alone; preserve the text label.
- If a future design makes the label interactive, add a role, accessible name, and focus-visible treatment from new evidence.

## Do / Don't

- Do keep the label text-led and compact.
- Do keep temporal colors separate from market movement and portfolio category colors.
- Don't convert the label into a calendar card, badge grid, or timeline marker.
- Don't use `#FFEEB1` as a generic warning or success color.

## Implementation Notes

This component set defines presentation for relative calendar relationship only. It does not define date arithmetic, timezone rollover, selected date behavior, or localization beyond the observed Chinese labels.

Use `figmaVariant` only in Storybook export stories so today/future/past/absolute observed labels emit distinct `data-variant` values. Without it, repeated `relative-date-label` examples share one component key and can collapse into one imported Figma component definition.
