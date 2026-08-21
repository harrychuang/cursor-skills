# Example Card

## Purpose

Starter display component that proves the template wiring: comp tokens, the component catalog, co-located stories, Autodocs, and the Figma export addon. It is implementation-derived and needs review; replace it after the first real extraction.

## Evidence

The Source column holds the Source Inventory `Source ID` from `DESIGN_EVIDENCE_MAP.md`.

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-01 | S-01 | Whole card | Implementation-derived starter; no design source yet. |

## Component Fingerprint

| Dimension | Description |
|---|---|
| Purpose / behavior / composition role | Display-only summary card |
| Anatomy | container, header (eyebrow + status pill), title, description |
| Variants / states / modes | status: Ready, Draft, Review (text only; one visual style) |
| Token contract summary | Every visual value enters through `--sbt-comp-example-card-*` |
| Layout / density | Vertical grid, max width = compact viewport width |
| Visual reference | `Components/Examples/Example Card` story |
| Native platform mapping | n/a |
| Similar components reviewed | none |

## Anatomy

1. `container` — surface, outline, corner, shadow, padding, gap.
2. `header` — eyebrow text and status pill on one row.
3. `title` — single heading.
4. `description` — supporting body text.

## Variants

None. `status` changes only the pill label.

## States

Display-only: hover, pressed, focus-visible, disabled, selected, loading, and error are `not applicable`.

## Token Contract

| Component token | Maps to system token | Purpose | State / mode |
|---|---|---|---|
| `--sbt-comp-example-card-container-color` | `--sbt-sys-color-surface` | Card fill | default |
| `--sbt-comp-example-card-container-on-color` | `--sbt-sys-color-on-surface` | Default text on the card | default |
| `--sbt-comp-example-card-container-outline-color` | `--sbt-sys-color-outline` | Card border | default |
| `--sbt-comp-example-card-container-outline-width` | `--sbt-sys-spacing-hairline` | Card border width | default |
| `--sbt-comp-example-card-container-shape` | `--sbt-sys-shape-corner-md` | Card corner radius | default |
| `--sbt-comp-example-card-container-shadow` | `--sbt-sys-shadow-raised-surface` | Card depth | default |
| `--sbt-comp-example-card-container-padding` | `--sbt-sys-spacing-container-lg` | Card padding | default |
| `--sbt-comp-example-card-container-gap` | `--sbt-sys-spacing-md` | Gap between rows | default |
| `--sbt-comp-example-card-container-max-width` | `--sbt-sys-size-viewport-compact-width` | Max inline size | default |
| `--sbt-comp-example-card-header-gap` | `--sbt-sys-spacing-md` | Eyebrow to pill gap | default |
| `--sbt-comp-example-card-eyebrow-color` | `--sbt-sys-color-primary` | Eyebrow text | default |
| `--sbt-comp-example-card-eyebrow-size` | `--sbt-sys-typescale-caption-sm-size` | Eyebrow and pill text size | default |
| `--sbt-comp-example-card-eyebrow-line-height` | `--sbt-sys-typescale-caption-sm-line-height` | Eyebrow and pill line height | default |
| `--sbt-comp-example-card-eyebrow-weight` | `--sbt-sys-weight-semibold` | Eyebrow and pill weight | default |
| `--sbt-comp-example-card-status-color` | `--sbt-sys-color-primary-container` | Status pill fill | default |
| `--sbt-comp-example-card-status-on-color` | `--sbt-sys-color-on-primary-container` | Status pill text | default |
| `--sbt-comp-example-card-status-padding-block` | `--sbt-sys-spacing-xxs` | Pill vertical padding | default |
| `--sbt-comp-example-card-status-padding-inline` | `--sbt-sys-spacing-xs` | Pill horizontal padding | default |
| `--sbt-comp-example-card-status-shape` | `--sbt-sys-shape-corner-pill` | Pill corner | default |
| `--sbt-comp-example-card-title-color` | `--sbt-sys-color-on-surface-strong` | Title text | default |
| `--sbt-comp-example-card-title-size` | `--sbt-sys-typescale-title-md-size` | Title size | default |
| `--sbt-comp-example-card-title-line-height` | `--sbt-sys-typescale-title-md-line-height` | Title line height | default |
| `--sbt-comp-example-card-title-weight` | `--sbt-sys-weight-semibold` | Title weight | default |
| `--sbt-comp-example-card-description-color` | `--sbt-sys-color-on-surface-medium` | Description text | default |
| `--sbt-comp-example-card-description-size` | `--sbt-sys-typescale-body-sm-size` | Description size | default |
| `--sbt-comp-example-card-description-line-height` | `--sbt-sys-typescale-body-sm-line-height` | Description line height | default |
| `--sbt-comp-example-card-text-margin` | `--sbt-sys-spacing-none` | Reset text margins | default |

## Layout Rules

Not a typographic component; rows stack in source order with `container-gap`.

## Content Rules

deferred to Deep Extract

## Accessibility Rules

- Renders as `article`; the title is an `h3`, so place the card under an `h2` context.
- The status pill is plain text; do not rely on its color to convey state.
- Text roles keep on-* pairing with the surface and primary-container fills.
- Display-only: no focus target; wrap it in a link or button component when it must be interactive.

## Do / Don't

deferred to Deep Extract

## Implementation Notes

Source: `src/components/example-card/` (ExampleCard.tsx, ExampleCard.css, ExampleCard.stories.tsx). Catalog entry `example-card` in `src/storybook/componentCatalog.ts`. Provenance: `implementation-derived`, `needs-review`.
