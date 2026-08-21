# Global Bubble

## Purpose

Defines the reusable anchored bubble/callout component used for compact guidance or contextual information near a target.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-082 | Figma `29503:80044` from canvas `202:4` | `global/Bubble` component set | 815x465 component set with eight arrow-position variants: top left/center/right, bottom left/center/right, left, and right. Bubble fill is `#F9A516`, text is `#1E1E1E`, body is 232px wide in most variants, bottom-right is 234px, content uses 16px/14px medium labels, 16x8 padding, 4px gap, 8px radius, and a low 0/2/3.5 black 12% shadow normalized to 0/2/4. |

## Component Fingerprint

| Dimension | Fingerprint |
|---|---|
| Purpose / behavior | Anchored contextual bubble with directional arrow. It is a callout, not a modal, dropdown menu, chart annotation, or promotional badge. |
| Anatomy | Bubble surface, optional title, body text, arrow pointer, and low shadow. |
| Variants / states | Arrow positions top/left/right/bottom with left, center, and right alignment where applicable; title can be shown or omitted. Interaction states are not evidenced. |
| Token contract summary | Uses amber callout container, dark callout text, 8px radius, 16x8 padding, 4px text gap, 18x16 arrow, and low surface shadow. |
| Layout / density | Default width normalizes to the 234px callout role; most source variants are 232px and are treated as layout equivalent to the 234px bottom-right variant. |
| Visual reference | Figma node preview `figma:vSr4NtEwPVs6wLpqCT5PtV#29503:80044`; get_screenshot captured 2026-06-15. |
| Similar components reviewed | Popup Dialog, Event Filter Dropdown, Portfolio Profit Summary callouts, Promotional Badge, and Event Filter Option. Decision: keep distinct as an anchored bubble/callout. |

## Anatomy

- Bubble surface
- Optional title
- Body text
- Directional arrow
- Low shadow

## Variants

- Top left, top center, top right.
- Bottom left, bottom center, bottom right.
- Left.
- Right.
- Title shown or hidden.

## States

- Default: observed.
- Show title: observed.
- Hide title: indicated by component props; visual source still centers around the same body rhythm.
- Pressed, focus-visible, hover, loading, dismissed, and error: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-global-bubble-width` | `--cm-sys-size-callout-width-md` | Bubble reference width | All |
| `--cm-comp-global-bubble-height` | `--cm-sys-size-callout-height-md` | Bubble reference height | Documentation |
| `--cm-comp-global-bubble-container-color` | `--cm-sys-color-callout-container` | Bubble fill | All |
| `--cm-comp-global-bubble-label-color` | `--cm-sys-color-on-callout-container` | Title/body text | All |
| `--cm-comp-global-bubble-corner-radius` | `--cm-sys-shape-corner-md` | Bubble radius | All |
| `--cm-comp-global-bubble-shadow` | `--cm-sys-shadow-surface-low` | Floating callout shadow | All |
| `--cm-comp-global-bubble-padding-x` | `--cm-sys-spacing-screen-gutter` | Horizontal inset | All |
| `--cm-comp-global-bubble-padding-y` | `--cm-sys-spacing-md` | Vertical inset | All |
| `--cm-comp-global-bubble-content-gap` | `--cm-sys-spacing-xs` | Title/body gap | Title variants |
| `--cm-comp-global-bubble-arrow-width` | `--cm-sys-size-callout-arrow-width` | Arrow width | Arrow variants |
| `--cm-comp-global-bubble-arrow-height` | `--cm-sys-size-callout-arrow-height` | Arrow height | Arrow variants |
| `--cm-comp-global-bubble-title-text-size` | `--cm-sys-typescale-label-xl-size` | Title size | Title variants |
| `--cm-comp-global-bubble-title-line-height` | `--cm-sys-typescale-label-xl-line-height` | Title line height | Title variants |
| `--cm-comp-global-bubble-title-weight` | `--cm-sys-weight-medium` | Title weight | Title variants |
| `--cm-comp-global-bubble-body-text-size` | `--cm-sys-typescale-label-md-size` | Body size | All |
| `--cm-comp-global-bubble-body-line-height` | `--cm-sys-typescale-label-md-compact-line-height` | Body line height | All |
| `--cm-comp-global-bubble-body-weight` | `--cm-sys-weight-medium` | Body weight | All |

## Layout Rules

- Keep the bubble body around 232-234px wide; use the 234px token as the normalized implementation width.
- Use 16px horizontal and 8px vertical padding.
- Keep title/body spacing at 4px.
- Keep arrow geometry at 18x16 for top/bottom arrows and rotated 16x18 for side arrows.
- Anchor the arrow to the named edge and alignment; do not center every arrow by default.
- Do not add a close icon or footer action unless future evidence shows an interactive bubble.

## Content Rules

- Title copy should be short; body copy should remain compact and wrap inside the bubble.
- Use dark text over amber; do not invert the bubble into a dark tooltip without new evidence.
- Bubble content is informational. Do not use promotional badge copy or CTA labels as the default language.

## Accessibility Rules

- If shown on hover/focus, connect it to its trigger with tooltip or description semantics.
- If it contains interactive content in a future source, promote it to an accessible popover pattern and re-extract interaction states.
- Directional arrow is decorative and should not be exposed to assistive technology.

## Do / Don't

- Do use Global Bubble for anchored contextual callouts.
- Do preserve the amber fill, dark text, and low shadow.
- Don't use Popup Dialog, Event Filter Dropdown, or Promotional Badge tokens for this component.
- Don't add gradients, icons, close buttons, or large illustrations.

## Implementation Notes

The Figma source uses absolute arrow placement. Implementation should model arrow side and alignment as variants while keeping one content box contract.

Use `figmaVariant` only in Storybook export stories such as `AllArrowPlacements` so the eight arrow placements emit distinct `data-variant` values and the Figma importer builds eight component variants instead of deduping them into the first global bubble.

Keep the component root as the amber bubble container and explicitly set it to `overflow: visible` so Figma imports the main frame with clipping disabled. The arrow intentionally overflows that container; render it as inline SVG geometry rather than CSS `clip-path` so Figma export receives stable left/right triangle nodes.
