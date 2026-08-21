# Icon

## Purpose

Renders registered product SVG icons and code-native glyphs through a single shared component so composed components can reuse consistent sizing, accessibility, and export markers.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| implementation-derived | `src/components/icon/Icon.tsx` and `Icon.stories.tsx` | Shared icon renderer | Created from product implementation and Storybook coverage. MyStock Utility Icon and Quarter Line Status Icon evidence are represented through this shared renderer. |

## Anatomy

- Asset-backed `<img>` renderer for registered SVG files.
- Inline SVG renderer for code-native glyphs.
- `data-icon`, `data-renderer`, `data-size`, and `data-variant` markers for Storybook and Figma export.
- Optional `figmaVariant` override for component-set export naming.

## Variants

- Asset icons: alert, bounce, direction, education, list, money, MyStock order/sort/sun, paper, play, search, settings, storage, trading.
- Inline icons: add, back, check, chevron down, chevron right, close, download, edit, refresh, screenshot.
- Status icons: quarter-line above and below.
- MyStock utility variants are documented in the `MyStockUtilityIcons` story.

## States

- Default decorative icon: implemented.
- Informative icon with accessible label: implemented.
- Quarter-line above and below color states: implemented.
- Hover, pressed, focus-visible, disabled, loading, and error states: component-level states only; apply them in the owning interactive component.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-mystock-utility-icon-size` | `--cm-sys-size-icon-standard` | Default shared icon size | Default |
| `--cm-comp-mystock-utility-icon-large-size` | `--cm-sys-size-icon-xl` | Large MyStock utility icon size | Large |
| `--cm-comp-quarter-line-status-icon-size` | `--cm-sys-size-quarter-line-status-icon` | Quarter-line status icon size | Status |
| `--cm-comp-quarter-line-status-icon-above-color` | `--cm-sys-color-quarter-line-above` | Above-quarter-line status color | Above |
| `--cm-comp-quarter-line-status-icon-below-color` | `--cm-sys-color-quarter-line-below` | Below-quarter-line status color | Below |
| `--cm-comp-quarter-line-status-icon-mark-color` | `--cm-sys-color-background` | Quarter-line status mark color | Status |
| `--cm-sys-size-icon-xxs` | `--cm-ref-size-15` | Extra small icon size | xxs |
| `--cm-sys-size-icon-xs` | `--cm-ref-size-16` | Small icon size | xs |
| `--cm-sys-size-icon-sm` | `--cm-ref-size-20` | Compact icon size | sm |

## Layout Rules

- Use the smallest named size that matches the owning component token contract.
- Use quarter-line icon names only for status icon slots.
- Use `figmaVariant` only when an export story needs a specific Figma component-set variant name.

## Content Rules

- Add new icon assets to `assetIconSources` or inline names before using them in product components.
- Keep icon labels in story/control data or owning component props; the Icon component does not infer business meaning from the icon name.

## Accessibility Rules

- Decorative icons must render with empty alt text or hidden inline SVG semantics.
- Informative icons must use `decorative={false}` and provide `label`.
- Icon-only buttons must put the accessible name on the button or use an informative icon label.

## Do / Don't

- Do centralize icon asset rendering through Icon.
- Do let owning components define interactive states.
- Don't import raw icons directly in shared components when Icon already supports the glyph.
- Weather illustrations belong in the shared graphic renderer, not this icon renderer.

## Implementation Notes

Provenance: `implementation-derived`, `needs-review`.

Storybook: `Components/Assets/Icon`.
