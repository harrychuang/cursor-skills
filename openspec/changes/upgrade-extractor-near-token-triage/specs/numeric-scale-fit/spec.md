## ADDED Requirements

### Requirement: Length tokens are fitted to a 4px or 8px grid

The token review module SHALL fit every reference number whose unit group is length to a grid: values greater than 512 and the hairline values 1 and 2 SHALL be excluded from fitting; for base 4 and base 8 the residual of each remaining value to its nearest multiple (including 0) SHALL be computed; the base with the smaller total residual SHALL be chosen, and base 8 SHALL win a tie. Each fitted value SHALL be classified as on-grid when its residual is at most 0.5, near-grid when the residual is greater than 0.5 and at most 1, and outlier when the residual is greater than 1. The result SHALL name the base, the on-grid, near-grid and outlier counts, the excluded tokens, and for each outlier its value, nearest step and signed residual.

#### Scenario: Base selection
- **WHEN** the length values are 4, 8, 12, 16, 24, 32 and 18
- **THEN** the base is 4, six values are on-grid and 18 is an outlier with nearest step 16 and residual +2

#### Scenario: Hairlines are excluded
- **WHEN** the length values include 1 and 2
- **THEN** neither is an outlier and both are listed as excluded

##### Example: classification

| Value | Base | Nearest step | Residual | Class |
|---|---|---|---|---|
| 12 | 4 | 12 | 0 | on-grid |
| 13 | 4 | 12 | +1 | near-grid |
| 18 | 4 | 16 | +2 | outlier |
| 9999 | 4 | excluded | excluded | excluded |

### Requirement: The token audit reports the scale fit as warnings only

When at least one length reference number is fitted, audit_tokens.mjs SHALL print one line "Scale fit (length): base <N>px, on-grid <a>/<b>, outliers <n>" and, when outliers exist, one warning that lists every outlier with its value and nearest step. The scale fit SHALL never produce an issue in any mode and SHALL NOT change the exit code.

#### Scenario: Outliers in strict mode
- **WHEN** strict mode runs on tokens whose only finding is a scale outlier
- **THEN** the outlier appears under Warnings, no issue is reported, and the audit passes

#### Scenario: No length tokens
- **WHEN** the reference layer has no length values
- **THEN** no scale fit line is printed
