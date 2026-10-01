## Purpose

Keep figma-componentize easy for agents to follow and easy for designers to read: a clear step sequence with change tiers in SKILL.md, reference files with single responsibilities, an accurate trigger description, a Traditional Chinese documentation page, and consistent cross-references with figma-m3-variables.

## ADDED Requirements

### Requirement: Step sequence and change tiers in SKILL.md

SKILL.md SHALL present the prerequisites and the step sequence — scope and baseline, detection, grouping review, plan, restore point, build, tokens through Workflow F, replacement, verification, report — and SHALL state the change tier of every writing step using figma-m3-variables' Tier 0 to 3 definitions. It SHALL route requests that only concern tokens to figma-m3-variables.

#### Scenario: Token-only request

- **WHEN** a designer asks only to turn hardcoded colors into tokens without creating components
- **THEN** SKILL.md directs the agent to figma-m3-variables Workflow F instead of this skill

### Requirement: Reference files have single responsibilities

The skill SHALL keep UI patterns, signatures, grouping rules, the detection script, and the grouping review board in the detection reference; the restore point, Components page, component creation, component properties, variants, and placement in the build recipes reference; and instance placement, content overrides, verification, and the report format in the replacement reference. SKILL.md SHALL NOT embed any script longer than 15 lines, and every reference file and section SKILL.md cites SHALL exist.

#### Scenario: Agent needs the variant arrangement script

- **WHEN** SKILL.md tells the agent to combine variants
- **THEN** it cites the build recipes section that contains the script, and that section exists

### Requirement: Trigger description

The SKILL.md frontmatter description SHALL cover detecting raw UI, creating components and variants on a Components page, tokenizing them through figma-m3-variables, and replacing originals with instances; SHALL include Traditional Chinese trigger phrases such as 元件化 and 建立元件; SHALL say that token-only requests belong to figma-m3-variables; and SHALL stay within 1024 characters.

#### Scenario: Designer asks in Traditional Chinese

- **WHEN** a designer writes 「幫我把這個 section 裡還不是元件的 UI 做成元件」
- **THEN** the description contains trigger phrases that match this request

### Requirement: Documentation page

The skill SHALL include a Traditional Chinese documentation page that explains the step sequence, the detection and grouping rules with examples, the grouping review board, the change tiers and safety measures (restore point, per-occurrence verification, keeping originals on mismatch), the report, and the relationship with figma-m3-variables. Every navigation link on the page SHALL point to an existing section.

#### Scenario: Designer reads about replacement safety

- **WHEN** a designer opens the documentation page
- **THEN** the page has a navigation entry and a section explaining that an original layer is kept whenever its instance does not match

### Requirement: Cross-references with figma-m3-variables

figma-m3-variables' SKILL.md and documentation page SHALL list figma-componentize as an available skill rather than a planned one, and both skills SHALL describe the same Workflow F interface: scope node IDs, component names, and caller in; created variable IDs, style IDs, bindings, merged groups, and skipped items out.

#### Scenario: Reading the division of responsibility

- **WHEN** an agent reads figma-m3-variables' division of responsibility table
- **THEN** `figma-componentize` appears without the word "planned" and is described as calling Workflow F for its token step
