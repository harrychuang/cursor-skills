# Graphic

## Purpose

Renders registered SVG graphic assets for reusable illustration slots. The current asset set covers weather graphics.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| implementation-derived | `src/components/graphic/Graphic.tsx` and `Graphic.stories.tsx` | Shared asset renderer | Created from product implementation and Storybook coverage. Needs source-design review before being treated as extracted evidence. |

## Anatomy

- `<img>` graphic asset.
- `data-graphic` and `data-variant` markers for export and inspection.
- Optional accessible label when the graphic is informative.

## Variants

- `sun`
- `cloud`
- `rain`

## States

- Default asset rendering: implemented.
- Informative vs decorative accessibility mode: implemented through `decorative` and `label`.
- Hover, pressed, focus-visible, disabled, loading, and error states: not applicable until a graphic becomes interactive.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-main-force-weather-icon-size` | `--cm-sys-size-main-force-weather-icon` | Weather graphic size used by Main Force Weather Indicator | Weather size |
| `--cm-sys-size-icon-standard` | `--cm-ref-size-24` | Default graphic size | Default |
| `--cm-sys-size-icon-lg` | `--cm-ref-size-30` | Large graphic size | Large |

## Layout Rules

- Use `standard` for generic asset rendering.
- The `weather` size matches the weather-indicator illustration slot.
- Use `large` for standalone previews or slots that explicitly need the larger system icon size.

## Content Rules

- Only render registered assets from `src/assets/graphic`.
- Product glyphs and utility symbols belong in the glyph renderer, not this graphic renderer.
- Do not add unregistered graphic names without updating the component API and Storybook gallery.

## Accessibility Rules

- Decorative graphics must render with empty alt text and `aria-hidden`.
- Informative graphics must use `decorative={false}` and provide `label`.

## Do / Don't

- Do use Graphic when a reusable illustration asset must be token-sized.
- Do keep weather assets centralized instead of importing raw SVG files inside composed components.
- Don't use Graphic as a generic remote image or content image component.

## Implementation Notes

Provenance: `implementation-derived`, `needs-review`.

Storybook: `Components/Assets/Graphic`.
