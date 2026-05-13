# Color

Translate observed color usage into a semantic system before assigning component-level exceptions.

## Analysis Inputs

- Approximate proportion of neutral, accent, and state colors across the source.
- Where high saturation is reserved: primary CTA, data highlights, navigation, or illustration.
- How surface layering, border contrast, and emphasis are achieved.

## Required Table

| Role | Recommendation | Observed source cue | Rationale | Token direction |
| --- | --- | --- | --- | --- |
| Primary color | `#` |  |  | `--sys-color-*` |
| Secondary color | `#` |  |  | `--sys-color-*` |
| Background/surface color | `#` |  |  | `--sys-color-*` |
| Text primary | `#` |  |  | `--sys-color-text-*` |
| Border/divider | `#` |  |  | `--sys-color-border-*` |

## Bento Snapshot

| Layer | Purpose | Typical examples | Rule |
| --- | --- | --- | --- |
| Ref | Raw palette source | blue-500, slate-900 | Do not use directly in screens |
| Sys | Semantic meaning | surface, text, border, accent, danger | Default layer for product UI |
| Comp | Controlled exceptions | badge-success-bg, table-row-hover | Only when a component truly needs local meaning |

## Required Spec

- Recommended primary, secondary, and background/surface colors with Hex values and rationale
- Base surfaces: canvas, elevated surface, inverse surface
- Text roles: primary, secondary, muted, inverse
- Interactive roles: primary action, secondary action, focus, visited, disabled
- Feedback roles: success, warning, danger, info
- Notes on observed values versus normalized system choices

## Minimum Deliverable

- A semantic role map that covers primary action, surfaces, text, borders, and feedback.
- One sentence per role explaining when to use it.
- A short note describing contrast expectations and the maximum allowed exception types.
- A short open-questions list if the source does not reveal dark mode, data viz, or visited/link behavior.

## Usage Rules

- Prefer semantic tokens in product code and stories.
- Document the intended color ratio so accent usage does not sprawl over time.
- Reserve raw palette references for token definition files only.
- State colors must preserve contrast in default, hover, active, and disabled states.
- If a component needs a custom color token, document the reason and owner here.

## Usage Guidance

### Primary

Use `Primary` for the one element that deserves the strongest interactive emphasis in a local region: the main CTA, current selection, or focus-led highlight.

### Primary Container

Use `Primary Container` for larger highlighted surfaces that need brand presence without behaving like a button on every pixel.

### Surface

Use `Surface` for the default canvas, cards, and neutral containers where content hierarchy should do more work than color.

### Surface Variant / Subtle

Use subtle semantic roles for secondary panels, filter trays, or neutral chips that need separation without CTA energy.

### Error and Other Feedback Roles

Use `Error`, `Warning`, `Success`, and `Info` only when the UI is communicating state, validation, or consequence.

## Exception Rules

- Keep component-only color tokens rare and named by behavior, not by one screen.
- When a chart, badge, or status table needs a local palette, document the boundary between semantic tokens and data-encoding colors.
- If a marketing or illustration surface breaks the standard palette, note that it is outside the product UI baseline.

## Storybook Expectations

- Show core surface and text pairings on a foundations page.
- Include key state ramps and contrast notes.
- Use a composed layout that feels designed, not a raw token dump.
