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
- Anatomy
- Variants
- States
- Token contract
- Layout rules
- Content rules
- Accessibility rules
- Do / Don't
- Implementation notes

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
