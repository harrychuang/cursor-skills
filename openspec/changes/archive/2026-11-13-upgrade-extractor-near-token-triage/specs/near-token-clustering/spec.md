## ADDED Requirements

### Requirement: Review markers are parsed from reference token comments

The token review module SHALL read a provenance marker, an optional usage marker, and an optional sources marker from the CSS comment that immediately precedes a reference token declaration or sits on the same line after it. The provenance marker SHALL accept the values authored and measured, case-insensitively; a declaration without a provenance marker SHALL be classified as unknown. The usage marker SHALL be a non-negative integer. Markers SHALL be separated by semicolons.

#### Scenario: Marked token
- **WHEN** a declaration carries the trailing comment "provenance: authored; usage: 14; sources: S1, S3"
- **THEN** the parsed markers are provenance authored, usage 14, sources S1 and S3

#### Scenario: Unmarked token
- **WHEN** a declaration has no comment, or a comment without a provenance marker
- **THEN** the parsed provenance is unknown and usage is null

##### Example: marker forms

| Comment text | provenance | usage |
|---|---|---|
| provenance: measured | measured | null |
| Provenance: Authored; usage: 3 | authored | 3 |
| token-review: keep-distinct | unknown | null |

### Requirement: Color distance uses CIEDE2000

The token review module SHALL compute color distance as CIEDE2000 between the two colors converted from sRGB to CIE Lab under D65. Two reference colors SHALL be near when the distance is less than or equal to 3.0 and the alpha difference is less than or equal to 0.03.

#### Scenario: Existing near pairs stay near
- **WHEN** the colors #9fe870 and #9fe871, or #6b6b6b and #6c6c6c, are compared
- **THEN** each pair is near, with a distance below 1.0

#### Scenario: Distinct colors are not near
- **WHEN** #2f6fd6 and #d93b3b are compared
- **THEN** the pair is not near

### Requirement: Near tokens are grouped into clusters with a diameter cap

The token review module SHALL build near edges between reference tokens (colors by CIEDE2000; numbers by the existing per-unit-group near rule within the same family and unit group), take connected components over those edges, and split any component whose largest pairwise distance exceeds the diameter cap using complete-linkage merging that only joins two groups when every cross-pair distance is within the cap. The diameter cap SHALL be 6.0 for colors and twice the base near threshold for numbers: 4 for length, 100 for time, 4 for percent and angle, 0.04 for unitless numbers. Cluster ids SHALL be the letter C followed by a sequence number assigned in a deterministic order (kind, family, canonical name).

#### Scenario: Chain within the cap forms one cluster
- **WHEN** blue A, B, C are each within 3.0 of their neighbour and A to C is within 6.0
- **THEN** A, B and C are one cluster

#### Scenario: Long chain is split at the cap
- **WHEN** five greys form a chain whose end-to-end distance is 9.0
- **THEN** the chain is split into clusters whose internal largest distance is at most 6.0, and no cluster contains two tokens that were not connected through near edges

#### Scenario: Tokens with no near edge are not clustered
- **WHEN** a reference token is not near any other token
- **THEN** it does not appear in any cluster

### Requirement: A deterministic canonical is chosen per cluster

For each cluster the module SHALL choose the canonical token by comparing, in order: provenance rank (authored before measured before unknown); usage score descending, where usage score is the count of var() references to the token in the sys and comp token files plus the usage marker value; for colors, a scale step that is a multiple of 10 before other steps, and for lengths, a value on the 4px grid before other values; and finally token name ascending.

#### Scenario: Authored wins over usage
- **WHEN** a cluster holds an authored token with usage 1 and a measured token with usage 20
- **THEN** the authored token is canonical

#### Scenario: Usage decides between measured tokens
- **WHEN** a cluster holds two measured tokens with usage scores 5 and 2
- **THEN** the token with usage score 5 is canonical

##### Example: full ordering

| Members (provenance, usage, step) | Canonical | Why |
|---|---|---|
| blue-50 (measured, 2, 50), blue-51 (measured, 2, 51) | blue-50 | step multiple of 10 |
| grey-30 (unknown, 0, 30), grey-31 (measured, 0, 31) | grey-31 | measured ranks above unknown |
| red-40 (authored, 0, 40), red-41 (authored, 0, 41) | red-40 | tie on provenance and usage, step 40 is a multiple of 10 |

### Requirement: var() references are counted as usage

The module SHALL count, for every reference token, the number of var(--name) occurrences in the sys and comp token CSS texts, matching the full name followed by a closing parenthesis or a comma so that a token name that is a prefix of another is not counted for it.

#### Scenario: Prefix names are not confused
- **WHEN** the sys file references var(--md-ref-size-12) twice and var(--md-ref-size-120) once
- **THEN** usage for --md-ref-size-12 is 2 and usage for --md-ref-size-120 is 1
