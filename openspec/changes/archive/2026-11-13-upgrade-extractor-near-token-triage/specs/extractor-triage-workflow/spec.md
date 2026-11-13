## ADDED Requirements

### Requirement: Workflow step 4 drives the tiered review

design-system-extractor/SKILL.md step 4 (Token Architecture) SHALL instruct the agent to: write provenance, usage and sources markers on every draft reference token; run the non-strict token audit to obtain the cluster report; run apply_token_decisions.mjs with --tier auto and --rewrite-css without asking the developer; STOP once for the proposal tier, presenting one row per proposal cluster with its canonical, members and proposed decisions, and record the accepted batch with --tier proposal and --confirmed-by plus any --keep or --merge exceptions; and present each must-ask cluster separately with its swatches or values and usage, recording each answer with --tier must-ask. The step SHALL state that unknown provenance never enters the auto tier and that authored values are never rounded toward measured values.

#### Scenario: Agent follows the step on a messy package
- **WHEN** the audit reports auto, proposal and must-ask clusters
- **THEN** the agent applies the auto tier mechanically, asks once for the proposal table, and asks per must-ask cluster, in that order

### Requirement: Decision vocabulary and references describe the tiers

The Decision Vocabulary table in SKILL.md SHALL name the three tiers in the Near token row. references/token-architecture.md SHALL document the marker syntax, the tier table with its thresholds, the canonical selection order and the member-to-canonical row format. references/audits.md SHALL document the cluster lines, the scale fit lines, the --json flag of audit_tokens.mjs, and apply_token_decisions.mjs with every option. The README and the TOKEN_ARCHITECTURE.md template text SHALL mention tiered review while keeping the table columns unchanged.

#### Scenario: Reference is complete
- **WHEN** a reader opens references/token-architecture.md
- **THEN** they find the marker syntax, the tier table, the canonical order and a sample decision row

#### Scenario: Template columns are unchanged
- **WHEN** the ds-to-storybook trace and plan contract test runs after the template edit
- **THEN** it passes
