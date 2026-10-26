## ADDED Requirements

### Requirement: Near token sections render one card per cluster

generate_review_html.mjs SHALL keep the section ids source-duplicates, color-scale, near-colors, near-numbers and components, SHALL add a section with id scale-fit, and SHALL render the near-colors and near-numbers sections as one card per cluster. Each card SHALL carry a data-tier attribute with the cluster tier and show the cluster id, a tier badge, the canonical token with its value (a swatch for colors), provenance and usage score, and one row per member with its value, provenance, usage score, distance, member tier, proposed decision and documented or needs-review status. The cluster computation SHALL be the same module the audit uses, so a cluster the audit reports appears identically on the page.

#### Scenario: Cluster card content
- **WHEN** the page is generated for a root with a proposal-tier blue cluster of three members
- **THEN** the near-colors section contains one card with data-tier "proposal", the canonical, and three member rows

#### Scenario: No clusters
- **WHEN** no reference tokens are near
- **THEN** the near-colors and near-numbers sections state that nothing needs review and contain no cards

### Requirement: Decisions can be copied as markdown per tier

Each near token section SHALL offer one copy button per tier that has undocumented members. Activating the button SHALL place the Near Token Decisions rows for those members (the same eight-column rows apply_token_decisions.mjs would write) on the clipboard through navigator.clipboard.writeText, falling back to selecting the text in a hidden textarea when the clipboard call rejects. The page SHALL also show the apply_token_decisions.mjs command for that tier as selectable text.

#### Scenario: Copy auto rows
- **WHEN** the viewer activates the copy button for the auto tier
- **THEN** the clipboard text contains one markdown table row per undocumented auto member with decision merge

### Requirement: Similar component rows are grouped into contact sheets

The components section SHALL group Component Similarity Review rows by connecting each row's candidate and similar component names with union-find, render one group heading per connected group naming all components in it, show every visual reference of the group side by side above the group's rows, and keep each row's existing columns and status.

#### Scenario: Two rows share a component
- **WHEN** rows "Secondary Button vs Primary Button" and "Ghost Button vs Primary Button" exist
- **THEN** one group heading names Primary Button, Secondary Button and Ghost Button, and both visual references appear together above the two rows

### Requirement: The JSON output includes clusters

With --json the generator SHALL print one object whose top-level keys are counts, needsReview and clusters. clusters SHALL hold colors and numbers (the cluster objects from the module), components (the grouped similarity rows) and scaleFit (the scale fit result or null). counts and needsReview SHALL keep their existing shape and values.

#### Scenario: JSON shape
- **WHEN** the generator runs with --json on the minimal-pass fixture
- **THEN** the top-level keys are counts, needsReview and clusters, counts.needsReview is 0, and clusters.colors and clusters.numbers are empty arrays

### Requirement: The component audit summarises similarity clusters

audit_components.mjs SHALL print "Similarity clusters: <n>" and "Unresolved similarity clusters: <n>" after its existing counts, where a cluster is a union-find group of similarity rows and a cluster is unresolved when any of its rows lacks an accepted decision. The existing issue and warning rules and the exit code SHALL be unchanged.

#### Scenario: Cluster counts
- **WHEN** the inventory has two similarity rows that share a component and one row is unresolved
- **THEN** "Similarity clusters: 1" and "Unresolved similarity clusters: 1" are printed
