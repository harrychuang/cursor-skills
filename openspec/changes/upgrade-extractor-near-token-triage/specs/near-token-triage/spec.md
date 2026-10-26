## ADDED Requirements

### Requirement: Every non-canonical member receives a triage tier and a proposed decision

For each non-canonical member of a cluster, the module SHALL compute the distance to the canonical and assign exactly one tier (auto, proposal, must-ask) and a proposed decision (merge, keep distinct, or none) from the provenance of both sides and the distance. The auto thresholds SHALL be: colors CIEDE2000 at most 1.0 for measured versus measured and at most 2.0 for measured snapping into authored; numbers at most 1 for length, 16 for time, 1 for percent and angle, 0.01 for unitless, for both cases. A member whose provenance or whose canonical's provenance is unknown SHALL never be auto. Two authored tokens in one cluster SHALL make every authored non-canonical member must-ask with no proposed decision. The cluster tier SHALL be the most severe member tier, where must-ask is more severe than proposal and proposal is more severe than auto.

#### Scenario: Measured snaps into authored
- **WHEN** a measured member is within the snap threshold of an authored canonical
- **THEN** the member tier is auto and the proposed decision is merge

#### Scenario: Measured near authored but outside the snap threshold
- **WHEN** a measured member is near an authored canonical but beyond the snap threshold
- **THEN** the member tier is proposal and the proposed decision is keep distinct

#### Scenario: Unknown provenance is never auto
- **WHEN** a member has unknown provenance and is within 0.5 of a measured canonical
- **THEN** the member tier is proposal and the proposed decision is merge

#### Scenario: Two authored values conflict
- **WHEN** a cluster contains two authored tokens
- **THEN** the non-canonical authored token is must-ask with no proposed decision, and the cluster tier is must-ask

##### Example: tier table

| Member provenance | Canonical provenance | Color distance | Tier | Proposed |
|---|---|---|---|---|
| measured | authored | 0.6 | auto | merge |
| measured | authored | 2.4 | proposal | keep distinct |
| measured | measured | 0.8 | auto | merge |
| measured | measured | 2.1 | proposal | merge |
| unknown | measured | 0.3 | proposal | merge |
| unknown | authored | 0.3 | proposal | keep distinct |
| authored | authored | 0.4 | must-ask | none |

### Requirement: The token audit reports clusters and counts decisions per member

audit_tokens.mjs SHALL replace its pairwise near-token loops with the cluster computation. Its stdout SHALL contain one line "Near token clusters: <total> (auto <n>, proposal <n>, must-ask <n>)" followed by one summary line per cluster naming the id, tier, canonical and members. For every non-canonical member without a documented decision against the canonical, the audit SHALL emit one message beginning "Near reference colors need review: " or "Near reference numbers need review: ", naming the canonical first and the member second, the CIEDE2000 distance or numeric difference, the cluster id, the tier and the proposed decision; the message SHALL be a warning in non-strict mode and an issue in strict mode. The lines "Token review candidates: <n>" and "Documented review decisions: <n>" SHALL count member-to-canonical relations. A decision SHALL be recognised by the existing rules: a token-review or a11y-remap CSS comment on either declaration, or a TOKEN_ARCHITECTURE.md line that names both tokens and contains a decision keyword.

#### Scenario: Undocumented cluster in non-strict mode
- **WHEN** a cluster has three members and none has a decision
- **THEN** the audit prints three warnings, "Token review candidates: 3", and exits 0

#### Scenario: Documented members are not candidates
- **WHEN** two of the three members have decision rows naming them with the canonical
- **THEN** "Token review candidates: 1" and "Documented review decisions: 2" are printed

#### Scenario: Strict mode blocks on candidates
- **WHEN** strict mode runs with at least one candidate
- **THEN** the candidate messages are listed under Issues and the exit code is 1

#### Scenario: Legacy pair decisions still count
- **WHEN** the near-token-doc fixture's TOKEN_ARCHITECTURE.md rows name both tokens of each pair
- **THEN** "Documented review decisions: 2" is printed and strict mode passes

### Requirement: The token audit offers a JSON output

audit_tokens.mjs SHALL accept a --json flag that prints exactly one JSON object with the keys clusters, scaleFit, counts, issues and warnings and no other text, keeping the exit code semantics of the chosen mode.

#### Scenario: JSON output
- **WHEN** the audit runs with --json
- **THEN** stdout parses as one JSON object whose keys are clusters, scaleFit, counts, issues and warnings
