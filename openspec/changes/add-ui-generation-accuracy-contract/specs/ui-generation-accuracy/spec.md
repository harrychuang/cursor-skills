## ADDED Requirements

### Requirement: UI generation accuracy contract

The workspace SHALL document expected UI generation accuracy by input source and SHALL distinguish structured Figma sources from screenshot-only sources.

#### Scenario: User reviews input accuracy tiers

- **WHEN** a user reads the accuracy contract
- **THEN** the contract describes Figma-first, multi-reference screenshot, and single-image modes
- **AND** each mode includes expected accuracy, primary risks, and required guardrails

##### Example: accuracy tiers

| Input mode | Expected outcome |
| ---------- | ---------------- |
| Figma-first | Highest fidelity because variables, layout, components, and selected frame context are available |
| Multi-reference screenshot | Good visual reconstruction with explicit inference and parity iteration |
| Single-image | First-pass approximation with missing context and open questions |

### Requirement: Image-only intake records missing context

The workspace SHALL require an image-only intake contract that records known facts, inferred decisions, and missing context before implementation.

#### Scenario: User provides only one screenshot

- **WHEN** the workspace is driven by one screenshot and no Figma source
- **THEN** the workflow asks for or records product purpose, target viewport, key states, brand assets, content assumptions, responsive needs, and acceptance threshold
- **AND** missing items are recorded as open questions rather than treated as confirmed design facts

##### Example: missing context log

| Missing item | Required handling |
| ------------ | ----------------- |
| Hover state | Mark as inferred until confirmed |
| Mobile layout | Ask for a mobile screenshot or define a responsive assumption |
| Real data | Use placeholder data only when the PRD declares it acceptable |

### Requirement: Visual parity acceptance loop

The workspace SHALL define a repeatable visual parity loop for generated product screens.

#### Scenario: Agent validates generated UI against the source

- **WHEN** a screen is implemented from Figma or screenshots
- **THEN** the workflow captures a baseline, compares generated output against the source, fixes drift in ownership order, and records remaining variance
- **AND** the workflow treats token and shared component fixes as higher priority than page-only styling fixes

##### Example: parity fix order

| Drift source | First owner to inspect |
| ------------ | ---------------------- |
| Color mismatch across multiple components | Token/theme layer |
| Radius mismatch across cards and controls | Foundation radius token or shared primitive |
| One component variant differs | Component props or variant implementation |
| Screen spacing differs only in one composition | Layout composition |
