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

## Usage Rules

- Prefer semantic tokens in product code and stories.
- Document the intended color ratio so accent usage does not sprawl over time.
- Reserve raw palette references for token definition files only.
- State colors must preserve contrast in default, hover, active, and disabled states.
- If a component needs a custom color token, document the reason and owner here.

## Usage Guidance

### Primary

Use `Primary` for the one element that deserves the strongest interactive emphasis in a local region: the main CTA, current selection, or focus-led highlight. If every button or badge uses `Primary`, the system loses hierarchy.

### Primary Container

Use `Primary Container` for larger highlighted surfaces that need to feel related to the brand color without behaving like a clickable accent on every pixel. Good defaults are summary cards, onboarding callouts, or selected panels.

### Surface

Use `Surface` for the default canvas, cards, and neutral containers where content hierarchy should do more work than color. Most layout structure should live here.

### Surface Variant / Subtle

Use `Surface Variant` or another subtle semantic role when a region needs separation without looking like a CTA. Typical cases are secondary panels, filter trays, metadata backplates, or neutral chips.

### Error and Other Feedback Roles

Use `Error`, `Warning`, `Success`, and `Info` only when the UI is communicating state, validation, or consequence. Do not reuse feedback colors as decorative accents.

### Border / Outline

Use outline or divider roles to separate surfaces after spacing has already established hierarchy. If a screen needs heavy border use to feel organized, revisit spacing and surface contrast first.

## Storybook Expectations

- Show core surface and text pairings on a foundations page.
- Include key state ramps and contrast notes.
- Use a composed layout that feels designed, not a raw token dump.
