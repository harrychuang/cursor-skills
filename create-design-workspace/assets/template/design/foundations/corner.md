# Corner

Corner and radius tokens help define the product tone from crisp to soft.

## Analysis Inputs

- The most common radius treatment across controls, cards, overlays, and media.
- Where sharper or rounder shapes are used as exceptions.
- Whether the overall tone feels technical, neutral, soft, or expressive.

## Required Table

| Role | Recommendation | Observed source cue | Rationale | Token direction |
| --- | --- | --- | --- | --- |
| Default control radius |  |  |  | `--sys-radius-*` |
| Card/container radius |  |  |  | `--sys-radius-*` |
| Overlay radius |  |  |  | `--sys-radius-*` |
| Sharp-corner exception |  |  |  | component or layout exception |

## Bento Snapshot

| Token | Typical use | Visual effect | Rule |
| --- | --- | --- | --- |
| Sharp | tables, utility shells | technical, structured | Use when precision is part of the tone |
| Subtle | inputs, buttons, cards | calm, modern | Default family for most UI |
| Expressive | hero cards, promotional surfaces | softer, more branded | Use sparingly for emphasis |

## Required Spec

- Recommended default border-radius values and role names
- Radius scale with named roles
- Component defaults for controls, cards, overlays, and media containers
- Rules for mixing sharp and soft shapes in the same view

## Minimum Deliverable

- Name the default radius family and where it applies.
- Document at least one intentional sharp exception and one expressive exception if they exist.
- Explain how adjacent surfaces should align corners when they visually touch.
- Keep the scale small unless the brand clearly needs a wider range.

## Usage Rules

- Pick one default radius family for the product and document exceptions.
- Increase radius only when it supports the brand or interaction model.
- If multiple radius families exist in the source, define which one is dominant and why.
- When adjacent components touch, align their corner logic so seams feel intentional.

## Storybook Expectations

- Show radius tokens on real component silhouettes, not swatches alone.
- Document where square corners are preferred for data-dense or utilitarian areas.
- Use side-by-side modules to explain why each radius family exists.
