# Spacing

Spacing rules define rhythm, grouping, and density across the product.

## Analysis Inputs

- The dominant density mode: spacious immersive, balanced, or compact efficient.
- Repeated gap, padding, and gutter relationships visible in the source.
- Whether grouping is created more by whitespace, borders, or color containers.

## Required Table

| Layout element | Recommendation | Observed source cue | Rationale | Token direction |
| --- | --- | --- | --- | --- |
| Base grid | 4px / 8px / mixed |  |  | `--sys-space-*` |
| Default component padding |  |  |  | `--sys-space-*` |
| Section gap |  |  |  | `--sys-space-*` |
| Page gutter |  |  |  | `--sys-space-*` |
| Density mode | spacious / balanced / compact |  |  | spacing and layout tokens |

## Bento Snapshot

| Token band | Common use | Examples | Guardrail |
| --- | --- | --- | --- |
| Compact | tight internal gaps | icon-label, chip padding | Use for dense controls only |
| Base | standard component padding | cards, inputs, list rows | Default starting point |
| Spacious | section separation | panel gaps, page gutters | Use to signal hierarchy shifts |

## Required Spec

- Base spacing grid recommendation such as 4px or 8px, with reason
- Core spacing scale and the intended step progression
- Component padding defaults
- Grid gutters, section spacing, and responsive layout margins
- Density rules for mobile, desktop, and data-heavy views

## Minimum Deliverable

- A base grid recommendation with one reason the team can defend.
- Three practical spacing bands: compact, base, and spacious.
- A short rule for how density compresses without random one-off shrinkage.
- Default padding guidance for cards, forms, and stacked sections.

## Usage Rules

- Reuse spacing tokens before adding one-off values.
- Let spacing create hierarchy before adding more borders or colors.
- Document when the chosen spacing grid is inferred from the source rather than explicitly observed.
- When components feel crowded, fix the rhythm at the token or shared-component layer first.

## Usage Guidance

### `xs` to `sm`

Use the smallest spacing steps for relationships inside a component: icon-to-label gaps, supporting text offsets, or segmented control padding.

### `md`

Use the base spacing step for default control padding and the most common gap between sibling elements inside a card or form block.

### `lg`

Use larger steps when a group needs to read as a separate module: stacked cards, panel headers, or grouped form sections.

### `xl` and above

Use the largest spacing steps for section gaps, page gutters, and layout-level rhythm.

### Density Rule

If a screen becomes dense, reduce spacing consistently by band rather than shrinking one-off gaps.

## Anti-Complexity Rules

- Do not publish a giant spacing matrix unless the product truly needs it.
- Keep new values out of component code unless the existing scale cannot express the relationship.
- When in doubt, choose the safer default spacing and note the unresolved edge case.

## Storybook Expectations

- Show layout rhythm examples for cards, forms, and stacked sections.
- Explain which spacing steps are safe defaults for new components.
- Present spacing references in grouped modules so the page reads like a guide, not a spreadsheet.
