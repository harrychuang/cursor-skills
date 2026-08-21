# Component Spec Rules

Use these rules when extracting components from references.

## Component Selection

Extract components when a pattern is repeated, central to navigation, conversion, brand expression, editorial hierarchy, information display, structurally reusable, or token-heavy enough to block implementation.

Common first components:

- primary action button
- secondary / inverse button
- icon action button
- bottom navigation
- top app bar
- list row
- card / promo tile
- chip / segmented selector
- avatar / contact item
- data row / metric row
- hero title lockup
- editorial heading stack
- metric lockup
- quote lockup
- label/value text group

## Typographic Components / Text Lockups

Typographic components are reusable text compositions, not isolated font tokens. Use typography foundations for atomic values like font family, size, weight, line height, and letter spacing. Create a typographic component only when the reference shows a stable text grouping with reusable slots, hierarchy, layout behavior, and tokenized relationships.

Common text-lockup slots:

- kicker / eyebrow
- headline / title
- subhead / supporting text
- body excerpt
- number
- unit
- caption
- attribution
- label
- value

Good candidates:

- repeated heading stacks across pages, posters, social cards, or editorial layouts
- brand-critical title treatments that set future layout rules
- metric or price lockups with stable number, unit, caption, and alignment rules
- quote compositions with repeatable quote, attribution, and source slots

Poor candidates:

- one-off art-directed lettering
- copy that is only unique campaign content with no reusable structure
- isolated font-size or weight choices that belong in typography foundations
- text embedded in a raster image when no future editable usage is expected

## Required Component Spec Sections

Store each extracted component spec at `design-system/components/<component-name>.md`, using lowercase hyphen-case filenames. Start from `design-system/COMPONENT_SPEC_TEMPLATE.md`.

Each component spec must include:

- Purpose
- Evidence
- Component fingerprint
- Anatomy
- Variants
- States
- Token contract
- Layout rules
- Content rules
- Accessibility rules
- Do / Don't
- Implementation notes

For native iOS/Android sources, also include platform mapping in the implementation notes: SwiftUI view/modifier names, UIKit class or style names, Compose composable/modifier names, Android XML layout/style/view names, resource files, and source screenshots/previews/captures that prove usage.

## Component Fingerprint

Before creating a new component spec, summarize the candidate as a fingerprint:

| Dimension | What to capture |
|---|---|
| Purpose / behavior | action, navigation, selection, display-only, data entry, feedback, layout container, brand expression, editorial hierarchy, or information display |
| Anatomy | slots such as container, icon, label, media, metadata, badge, divider, state layer, kicker, headline, subhead, number, unit, caption, attribution |
| Variants / states | default, selected, active, disabled, loading, density, hierarchy, emphasis, scale, alignment, theme, or display mode |
| Token contract summary | main color, type, spacing, radius, elevation, size, state, hierarchy, and slot relationship tokens |
| Layout / density | height, padding, gap, alignment, truncation, responsive behavior, line breaks, max line length, and text wrapping behavior |
| Visual reference | Figma node preview/screenshot or screenshot crop; schematic SVG only as labeled fallback |
| Native platform mapping | iOS/Android source symbols, resource names, preview/screenshot-test/capture evidence, and reachability when applicable |
| Similar components reviewed | matching existing components and final decision |

Similarity review compares purpose, behavior, and composition role first. Visual similarity alone is not enough to merge components; different behavior, content structure, or typographic hierarchy may require separate components or variants.

## Component Similarity Review

Use `COMPONENT_INVENTORY.md` to document close matches before adding a new component:

| New candidate | Similar existing component | Visual reference | Similarity reason | Suggested action | Developer decision | Rationale / owner |
|---|---|---|---|---|---|---|

Suggested actions:

- `merge`: the candidate is the same component and should reuse the existing spec and tokens
- `make variant`: the candidate belongs inside the existing component as a variant, density, state, or slot option
- `keep distinct`: the candidate needs a separate component because purpose, behavior, accessibility, or token contract differs
- `blocked`: more design evidence or developer confirmation is needed

For Figma inputs, capture actual node previews/screenshots for both the new candidate and the closest existing component when possible. For screenshot inputs, crop the relevant component regions. Store source-based review images under `design-system/assets/component-review/` and link them in the `Visual reference` cell.

Do not use an AI-drawn schematic as the review image when a Figma preview or screenshot crop is available. A schematic SVG is allowed only as a last-resort fallback when source previews cannot be captured, and it must be labeled `schematic fallback - source preview unavailable`. Treat fallback SVGs as explanatory aids, not design evidence.

## Anatomy

List slots by visual and semantic role:

- container
- leading icon
- trailing icon
- label
- supporting text
- state layer
- divider
- media
- badge
- amount / metadata
- kicker / eyebrow
- headline / title
- subhead / supporting text
- number / unit
- caption / attribution

Only include slots observed or clearly required by the component role.

## State Coverage

Interactive components should define:

- default
- hover, if desktop/web use is expected
- pressed
- focus-visible
- disabled, if action can become unavailable
- selected / active, if selection is part of the component
- loading, if async action is likely

If a state is not visible in references, infer cautiously from system state tokens and label it as inferred.

Display-only, graphic, and typographic components can mark interactive states as `not applicable`. They should still define observed variants or modes such as scale, density, emphasis, alignment, color theme, image overlay usage, editorial/marketing context, responsive wrapping, and language/script behavior.

## Token Contract

Use a table:

| Component token | Maps to system token | Purpose | State / mode |
|---|---|---|---|

Component tokens must reference system tokens only. If no system role exists, add or propose a system role before defining the component slot.

## Layout Rules

Specify:

- minimum touch target
- container height/width behavior
- padding
- icon size
- text alignment
- text hierarchy ratio
- line count / max line length
- line-break behavior
- gap
- border/radius/elevation behavior
- responsive behavior
- truncation behavior

## Accessibility Rules

Specify:

- semantic role
- accessible name
- focus-visible style
- disabled behavior
- icon-only labeling
- contrast requirements
- screen-reader formatting for numeric or monetary content
- heading level guidance for heading lockups
- preserving real editable text when implemented on web or in templates
- alt text guidance when the composition must ship as a raster image

## Component Inventory Status

Use these status values:

- `extracted`: spec and tokens exist
- `planned`: observed and prioritized, not yet extracted
- `blocked`: needs more evidence or user decision
- `out-of-scope`: observed but not needed for the current design-system pass
