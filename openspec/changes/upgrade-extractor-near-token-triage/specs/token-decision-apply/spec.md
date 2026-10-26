## ADDED Requirements

### Requirement: Decisions are written as member-to-canonical rows

apply_token_decisions.mjs SHALL recompute the clusters for a target root, select the non-canonical members that match the requested tier and have no documented decision, and append one row per member to the Near Token Decisions table in design-system/TOKEN_ARCHITECTURE.md using the existing eight columns: member, member provenance, canonical, canonical provenance, distance with tier, decision, rationale with rule name and cluster id, confirmed by. When the heading or table is missing the script SHALL append the heading and the template table header before the rows. Members that already have a documented decision SHALL be skipped, so running the script twice writes nothing the second time.

#### Scenario: Auto tier writes merge rows
- **WHEN** the script runs with --tier auto on a root with four undocumented auto members
- **THEN** four rows with decision merge and confirmed by "auto-tier" are appended, and stdout reports 4 rows written

#### Scenario: Second run is idempotent
- **WHEN** the script runs with --tier auto again
- **THEN** no rows are appended and stdout reports 0 rows written

#### Scenario: Missing architecture document
- **WHEN** design-system/TOKEN_ARCHITECTURE.md does not exist
- **THEN** the script exits 1 and names the missing file

##### Example: written row

- **GIVEN** member --md-ref-color-blue-51 (measured) at CIEDE2000 0.6 from canonical --md-ref-color-blue-50 (authored) in cluster C1
- **WHEN** --tier auto runs
- **THEN** the appended row is "| --md-ref-color-blue-51 | measured | --md-ref-color-blue-50 | authored | deltaE2000 0.6 (auto) | merge | measured snaps into authored (C1) | auto-tier |"

### Requirement: Proposal and must-ask tiers require a confirmer and accept overrides

For --tier proposal and --tier must-ask the script SHALL require --confirmed-by and exit 2 with a message when it is missing. For --tier proposal the written decision SHALL be the proposed decision unless the member is listed in --keep (keep distinct) or --merge (merge). For --tier must-ask the script SHALL require --decision merge or --decision keep-distinct and SHALL write only members whose cluster canonical is listed in --only. --only SHALL also filter the proposal and auto tiers when given. Unknown --tier values, unknown options and a missing target root SHALL exit 2.

#### Scenario: Proposal tier with an override
- **WHEN** --tier proposal --confirmed-by dev --keep --md-ref-color-neutral-81 runs on a root whose proposal members are neutral-81 (proposed merge) and blue-53 (proposed keep distinct)
- **THEN** neutral-81 is written as keep distinct, blue-53 as keep distinct, and both rows carry confirmed by "dev"

#### Scenario: Must-ask without decision is rejected
- **WHEN** --tier must-ask --confirmed-by dev runs without --decision
- **THEN** the script exits 2 and the message names --decision

#### Scenario: Must-ask records a decision for one cluster
- **WHEN** --tier must-ask --only --md-ref-color-green-60 --decision keep-distinct --confirmed-by dev runs
- **THEN** the must-ask member of that cluster is written as keep distinct and a following strict audit passes

### Requirement: Dry run and JSON output write nothing

With --dry-run the script SHALL print the rows it would append and SHALL NOT modify any file. With --json it SHALL print one JSON object with the keys tier, written, skipped, rows and rewrite and no other text.

#### Scenario: Dry run
- **WHEN** --tier auto --dry-run runs
- **THEN** the rows are printed, the architecture document is byte-identical afterwards, and the exit code is 0

### Requirement: CSS rewrite applies merges to the token files

With --rewrite-css the script SHALL, for each merge row it writes, replace every var(--member) reference whose name is followed by a closing parenthesis or a comma with var(--canonical) in tokens-ref.css, tokens-sys.css and tokens-comp.css, and remove the member's declaration line from tokens-ref.css including a same-line trailing comment. The script SHALL report the number of references rewritten and declarations removed. A member whose declaration cannot be found SHALL be reported and left unchanged. Keep distinct rows SHALL NOT touch CSS.

#### Scenario: Merge rewrites references and removes the member
- **WHEN** --tier auto --rewrite-css runs and tokens-sys.css references var(--md-ref-color-blue-51)
- **THEN** that reference becomes var(--md-ref-color-blue-50) and tokens-ref.css no longer declares --md-ref-color-blue-51

#### Scenario: Prefix names are untouched
- **WHEN** tokens-sys.css references var(--md-ref-size-120) and --md-ref-size-12 is merged away
- **THEN** var(--md-ref-size-120) is unchanged
