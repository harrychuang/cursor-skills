# Empty State

## Purpose

Defines the reusable full-width empty-state composition for dark product sections that need a centered message, optional placeholder media, and an optional primary guidance action. This component is for page or section-level no-content guidance, not modal prompts.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-085 | Figma `5862:221812` | `空值` component set | Eight 375x563 variants toggle image, title, and button slots while keeping the supporting copy slot present. Variables confirm `#252525` container, `#333333` media placeholder, white title, `#C0C0C0` body copy, and primary orange action. Generated context shows the action as a nested `button` instance tied to the global button component IDs. |

## Component Fingerprint

| Dimension | Fingerprint |
|---|---|
| Purpose / behavior | Full-page or section empty-state feedback composition for no-content, onboarding, or missing-data guidance. |
| Anatomy | Container, optional media placeholder, optional title, required body/supporting copy, optional primary action slot composed from Button. |
| Variants / states | Image on/off, title on/off, button on/off; body copy is always present in the source. Pressed, focus-visible, disabled, loading, error, success, and compact/inline variants are not shown. |
| Token contract summary | Uses dark `#252525` section surface, optional `#333333` media square, white 18px title, `#C0C0C0` 16px body copy, subtle text shadow, 40px side padding, 187px media size, and 266px action width. |
| Layout / density | 375x563 centered vertical composition with 40px horizontal padding. Title/body stack uses 8px gap; button sits 16px below text; image/text grouping uses 12px gap when media is present. |
| Visual reference | Figma node preview `figma:vSr4NtEwPVs6wLpqCT5PtV#5862:221812`; get_screenshot captured 2026-06-15. |
| Similar components reviewed | Popup Dialog, Button, Portfolio Fit Chart empty variant, Portfolio Profit Summary empty variant, and Portfolio Add Action Section. Developer decision: keep Empty State distinct as a new component; compose existing Button for the optional primary action. |

## Anatomy

- Container
- Optional media placeholder
- Optional title
- Body/supporting copy
- Optional primary action slot

## Variants

- `image=false, title=false, body=true, button=false`
- `image=true, title=false, body=true, button=false`
- `image=false, title=false, body=true, button=true`
- `image=true, title=false, body=true, button=true`
- `image=false, title=true, body=true, button=false`
- `image=true, title=true, body=true, button=false`
- `image=false, title=true, body=true, button=true`
- `image=true, title=true, body=true, button=true`

## States

- Default message: observed.
- Optional media placeholder: observed as a 187x187 `#333333` square with centered `IMG` label.
- Optional primary action: observed as a primary filled Button labeled `查看教學`.
- Pressed, focus-visible, disabled, loading, error, success, dismissed, and compact inline variants: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State / mode |
|---|---|---|---|
| `--cm-comp-empty-state-width` | `--cm-sys-size-viewport-compact-width` | Empty-state frame width | All |
| `--cm-comp-empty-state-height` | `--cm-sys-size-feedback-view-height` | Empty-state frame height | All |
| `--cm-comp-empty-state-container-color` | `--cm-sys-color-surface` | Container fill | All |
| `--cm-comp-empty-state-padding-x` | `--cm-sys-spacing-section-gap-xl` | Horizontal inset | All |
| `--cm-comp-empty-state-slot-gap` | `--cm-sys-spacing-l` | Media-to-content gap | Media variants |
| `--cm-comp-empty-state-content-width` | `--cm-sys-size-feedback-content-width` | Text/action content width | All |
| `--cm-comp-empty-state-content-gap` | `--cm-sys-spacing-md` | Title/body gap | Text stack |
| `--cm-comp-empty-state-action-gap` | `--cm-sys-spacing-screen-gutter` | Body-to-action gap | Button variants |
| `--cm-comp-empty-state-media-size` | `--cm-sys-size-media-placeholder-lg` | Placeholder media square | Media variants |
| `--cm-comp-empty-state-media-container-color` | `--cm-sys-color-surface-raised` | Placeholder media fill | Media variants |
| `--cm-comp-empty-state-media-label-color` | `--cm-sys-color-on-overlay-empty-art` | Placeholder label | Media variants |
| `--cm-comp-empty-state-title-color` | `--cm-sys-color-on-surface-strong` | Title text | Title variants |
| `--cm-comp-empty-state-body-color` | `--cm-sys-color-on-surface-medium` | Body copy | All |
| `--cm-comp-empty-state-title-text-size` | `--cm-sys-typescale-title-md-compact-size` | Title size | Title variants |
| `--cm-comp-empty-state-title-line-height` | `--cm-sys-typescale-title-md-compact-line-height` | Title line height | Title variants |
| `--cm-comp-empty-state-title-weight` | `--cm-sys-weight-regular` | Title weight | Title variants |
| `--cm-comp-empty-state-body-text-size` | `--cm-sys-typescale-body-md-size` | Body size | All |
| `--cm-comp-empty-state-body-line-height` | `--cm-sys-typescale-body-md-line-height` | Body line height | All |
| `--cm-comp-empty-state-body-weight` | `--cm-sys-weight-regular` | Body weight | All |
| `--cm-comp-empty-state-media-label-text-size` | `--cm-sys-typescale-body-md-size` | Placeholder label size | Media variants |
| `--cm-comp-empty-state-media-label-line-height` | `--cm-sys-typescale-body-md-line-height` | Placeholder label line height | Media variants |
| `--cm-comp-empty-state-text-shadow` | `--cm-sys-shadow-text-low` | Subtle text shadow observed in source | Text slots |
| `--cm-comp-empty-state-action-width` | `--cm-sys-size-action-width-wide` | Host-owned Button width | Button variants |
| `--cm-comp-empty-state-action-height` | `--cm-sys-size-action-height-lg` | Host-owned Button height | Button variants |

## Layout Rules

- Keep the root composition 375px wide and 563px high when used as the source-sized full empty state.
- Center the content vertically and horizontally; do not top-align it unless a screen-specific layout provides new evidence.
- Use 40px horizontal padding, producing a 295px text/action content column.
- Keep media placeholders 187x187 and centered above the text stack.
- Use 8px between title and body, 16px between body and action, and 12px between media and content.
- Compose the optional action from `Button` using the primary filled large/default treatment; Empty State owns the 266px contextual width and placement.
- Do not create an Empty State-specific button color, radius, label, disabled, or pressed style.

## Content Rules

- Body/supporting copy is the required slot in all observed variants.
- Title is optional and should stay short enough to center within the 295px content width.
- Body copy should remain concise and centered; wrap inside the content column instead of widening the component.
- The observed action label is `查看教學`; use short action copy that directly resolves the empty state.
- Media content may be a placeholder, product illustration, or screenshot only when a source provides that asset. Do not invent decorative art.

## Accessibility Rules

- Use a semantic section or region label when the empty state replaces meaningful content.
- If a title is present, expose it as the heading for the empty state region.
- Body copy must remain real text, not baked into an image.
- Placeholder-only media should be decorative or hidden from assistive tech unless it communicates a specific state.
- The action must be a real Button with a clear accessible name and inherited Button focus/disabled behavior.

## Do / Don't

- Do use Empty State for no-content or onboarding guidance inside dark product surfaces.
- Do compose the action from the existing Button component.
- Do keep media optional and centered; body text remains the stable anchor.
- Don't merge this into Popup Dialog; it is not modal, not 292px wide, and has no two-action footer.
- Don't create a new button family for `查看教學`.
- Don't add large illustrations, marketing copy, cards, shadows, gradients, or hero-style layouts without new Figma evidence.

## Implementation Notes

The Figma source nests a `button` instance for `查看教學` and references the global button component IDs in generated context. Treat the Empty State action as a host-sized Button composition: `Empty State` controls width, vertical rhythm, and presence; `Button` controls fill, label styling, radius, and interactive states.
