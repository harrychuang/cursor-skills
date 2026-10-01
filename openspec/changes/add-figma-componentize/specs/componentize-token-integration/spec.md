## Purpose

Tokenize the newly built components through figma-m3-variables Workflow F, so that color, typography, radius, spacing, and the other token families are bound on the main components and inherited by every instance that later replaces the original layers.

## ADDED Requirements

### Requirement: Workflow F runs on the new components

After the build and before any replacement, the skill SHALL invoke figma-m3-variables Workflow F with the IDs of the new main components and component sets as its scope, the component names from the plan, and `figma-componentize` as the caller. Workflow F's change tiers, near-value review board, and token plan confirmation SHALL apply unchanged. The near-value drift listed in the plan, whose values exist only on original occurrences, SHALL be added to Workflow F's review board as extra candidates with those occurrences as samples; the skill SHALL create no tokens or bindings for values that exist only on original occurrences.

#### Scenario: Three new components

- **WHEN** the build created the component set `Button` and the components `Chip` and `Card`
- **THEN** Workflow F receives exactly those three node IDs and their names, and shows its own token plan for the user to confirm

### Requirement: Tokens before replacement

The skill SHALL finish the token step before replacing original layers, so that the instances inherit the bindings. When the user approved near-value merges in Workflow F (returned as merged groups), the replacement verification SHALL treat the merged values as expected: a visual difference that an approved merge explains SHALL NOT count as a failed replacement, and the report SHALL list it.

#### Scenario: Approved merge

- **WHEN** the user merged padding 15 into 16 in Workflow F's review board
- **THEN** the button occurrence that used 15 px padding is replaced, and the report lists its 1 px change as an approved merge

### Requirement: Declined or failed token step

When the user declines Workflow F's token plan or Workflow F stops with an error, the skill SHALL ask whether to continue with replacement without tokens. It SHALL continue only after the user confirms, and the report SHALL mark those components as untokenized.

#### Scenario: User skips tokens

- **WHEN** the user declines the token plan and confirms continuing
- **THEN** the original layers are replaced with instances of untokenized components, and the report says the components have no token bindings

### Requirement: Workflow F results recorded

The skill SHALL copy Workflow F's returned variable IDs per layer, style IDs, bindings, merged value groups, and skipped items into the componentization report.

#### Scenario: Report after tokens

- **WHEN** Workflow F returns 14 Comp variables, 2 Text Styles, and one merged group
- **THEN** the componentization report lists those counts, the style names, and the merged group
