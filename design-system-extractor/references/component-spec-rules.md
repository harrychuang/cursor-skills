# Component Spec Rules

Use these rules when extracting components from references.

## Component Selection

Extract components when a pattern is repeated, central to navigation or conversion, structurally reusable, or token-heavy enough to block implementation.

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

## Component Fingerprint

Before creating a new component spec, summarize the candidate as a fingerprint:

| Dimension | What to capture |
|---|---|
| Purpose / behavior | action, navigation, selection, display-only, data entry, feedback, or layout container |
| Anatomy | slots such as container, icon, label, media, metadata, badge, divider, state layer |
| Variants / states | default, selected, active, disabled, loading, density, hierarchy, emphasis |
| Token contract summary | main color, type, spacing, radius, elevation, size, and state tokens |
| Layout / density | height, padding, gap, alignment, truncation, responsive behavior |
| Visual reference | Figma node preview/screenshot or screenshot crop; schematic SVG only as labeled fallback |
| Similar components reviewed | matching existing components and final decision |

Similarity review compares purpose and behavior first. Visual similarity alone is not enough to merge components; different behavior may require separate components or variants.

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

## Token Contract

Use a table:

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|

Component tokens must reference system tokens only. If no system role exists, add or propose a system role before defining the component slot.

## Layout Rules

Specify:

- minimum touch target
- container height/width behavior
- padding
- icon size
- text alignment
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

## Component Inventory Status

Use these status values:

- `extracted`: spec and tokens exist
- `planned`: observed and prioritized, not yet extracted
- `blocked`: needs more evidence or user decision
- `out-of-scope`: observed but not needed for the current design-system pass
