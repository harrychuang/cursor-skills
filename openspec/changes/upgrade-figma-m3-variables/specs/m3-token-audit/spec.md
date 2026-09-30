## Purpose

Detect structural, naming, value-drift, and coverage problems in a Figma file's Variables and Styles, report them by severity, and fix them only through the change tiers so that audits never silently alter a design.

## ADDED Requirements

### Requirement: Audit covers eighteen rule types

The audit workflow SHALL evaluate the following rule types and SHALL report every finding with its rule number, severity, the affected variable, style, or node, and a suggested fix:

| # | Rule | Severity |
| --- | --- | --- |
| 1 | Comp variable aliases a Ref variable directly | error |
| 2 | `ALL_SCOPES`, or an empty scope on a non-Ref variable | error |
| 3 | Missing or non-canonical WEB code syntax | warning |
| 4 | More than one prefix in the file | error |
| 5 | Ref variable bound directly to a node | error |
| 6 | Collection without variables | info |
| 7 | Component or region vocabulary in a Ref or Sys name | warning |
| 8 | Alias direction other than Sys → Ref and Comp → Sys | error |
| 9 | Variable missing a value for a mode of its collection | error |
| 10 | Bound variable type incompatible with the node property | error |
| 11 | Component node bound to Sys although a matching Comp token exists | warning |
| 12 | Ref name does not match its value | error |
| 13 | Duplicate or near-duplicate Ref values | warning |
| 14 | Same Sys scale label resolving to different values | warning |
| 15 | Hardcoded values inside components (token coverage) | warning |
| 16 | Text Style or Effect Style fields not backed by variables | warning |
| 17 | Legacy state token order | warning |
| 18 | Name segment format violation | warning |

#### Scenario: Clean file

- **WHEN** the audit finds no findings for any rule type
- **THEN** the report states that all Variables and Styles comply and lists the 18 rule types that were checked

### Requirement: Ref names agree with their values

For numeric Ref categories the audit SHALL decode the last name segment, reading `_` as the decimal point and a `neg-` prefix as a minus sign, and SHALL flag every variable whose stored value differs from the decoded number. For color Ref variables named by tone, the audit SHALL flag the variable when the rounded CIE L* of its color differs from the tone segment by more than 2.

#### Scenario: Spacing primitive holds the wrong value

- **WHEN** `md/ref/spacing/16` stores 12
- **THEN** the audit reports rule 12 with the message that the name encodes 16 but the value is 12

##### Example: Name and value checks

| Variable | Stored value | Result |
| --- | --- | --- |
| `md/ref/spacing/16` | 12 | error: name encodes 16 |
| `md/ref/type/tracking/neg-0_25` | -0.25 | pass |
| `md/ref/color/blue/50` | #1A73E8 (L* 49.9) | pass |
| `md/ref/color/blue/50` | #0B3D91 (L* 28.0) | error: tone 50 vs L* 28 |

### Requirement: Duplicate and near-duplicate primitives are surfaced with visual evidence

The audit SHALL flag Ref variables of the same category that store identical values, and Ref variables whose values fall inside the near-value thresholds used by value harvesting. For these findings the audit SHALL offer the same near-value review board that value harvesting uses, and SHALL treat any merge as a Tier 3 change.

#### Scenario: Two blues almost identical

- **WHEN** `md/ref/color/blue/50` stores #1A73E8 and `md/ref/color/blue/50-b` stores #1A73E9
- **THEN** the audit reports rule 13 for the pair with their color difference
- **AND** offers to build the review board before asking whether to merge them

### Requirement: Sys scale labels are consistent

The audit SHALL flag Sys spacing variables whose shared size label resolves to different values under different spacing roles, because one spacing ladder is shared by all spacing roles. Size roles such as `icon` and `control-height` keep separate ladders and SHALL NOT be compared with each other.

#### Scenario: Label `sm` means two values

- **WHEN** `md/sys/spacing/inset-vertical-sm` resolves to 12 and `md/sys/spacing/gap-inline-sm` resolves to 8
- **THEN** the audit reports rule 14 for label `sm` with both values and both variable names

### Requirement: Token coverage is measured for components

For every COMPONENT and COMPONENT_SET in the audited scope, the audit SHALL list the properties that hold hardcoded values: unbound solid fills and strokes, corner radii, padding, gaps, stroke weights, text without a Text Style or typography variables, and shadows without an Effect Style or effect variables. It SHALL report a coverage percentage per component, computed as bound tokenizable properties divided by all tokenizable properties, and SHALL suggest Workflow F for components below 100%.

#### Scenario: Partially tokenized card

- **WHEN** a Card component has 14 tokenizable properties and 10 of them are bound
- **THEN** the audit reports rule 15 with coverage 71% and lists the 4 hardcoded properties with their node IDs

### Requirement: Styles are backed by Variables

When the file uses Styles mode for composite tokens, the audit SHALL flag local Text Styles whose font family, font weight or style, size, line height, or letter spacing is not bound to a variable, and local Effect Styles whose shadow color, offsets, blur, or spread is not bound to a variable.

#### Scenario: Text style with a raw size

- **WHEN** the Text Style `label/large` binds font family and weight but stores size 14 as a raw value
- **THEN** the audit reports rule 16 for `label/large` with the unbound field `fontSize`

### Requirement: Legacy state token order is migrated by renaming

The audit SHALL flag Comp variables whose last segment is a state word placed after a property, and SHALL propose the name in the M3 order defined by the token vocabulary, with the state before the anatomy, for example `comp/{component}/{state}/{anatomy}/{property}`. The fix SHALL rename the variable in place, which preserves its bindings and aliases, and SHALL update its WEB code syntax.

#### Scenario: Disabled container color in the old order

- **WHEN** the file has `md/comp/filled-button/container/background-color/disabled`
- **THEN** the audit reports rule 17 and proposes `md/comp/filled-button/disabled/container/background-color`
- **AND** the confirmed fix renames the same variable ID and sets its code syntax to `var(--md-comp-filled-button-disabled-container-background-color)`

### Requirement: Names follow the format rules

The audit SHALL flag every variable whose name contains a segment with uppercase letters, spaces, or characters outside lowercase letters, digits, hyphen, and underscore.

#### Scenario: Uppercase segment

- **WHEN** a variable is named `md/sys/color/Primary`
- **THEN** the audit reports rule 18 and proposes `md/sys/color/primary`

### Requirement: Findings are reported by severity and fixed through change tiers

The audit report SHALL group findings by severity (error, warning, info), SHALL ask before fixing anything, SHALL classify each proposed fix into a change tier, and SHALL re-run the affected rules after fixing to confirm that no finding remains for the fixed rules.

#### Scenario: User approves only some fixes

- **WHEN** the user approves fixes for rules 3 and 17 and declines the rule 13 merges
- **THEN** the skill applies only the rule 3 and rule 17 fixes, re-runs rules 3 and 17, and reports the rule 13 findings as still open

### Requirement: Alias checks inspect composed color values

Rules 1, 5, and 8 SHALL treat both the color field and the opacity field of a composed color value as alias references, and every rule that reads variable values SHALL accept both the current composed shape and the older `VARIABLE_EXPRESSION` shape.

#### Scenario: Composed Comp color points at a Ref opacity

- **WHEN** `md/comp/filled-button/disabled/container/background-color` stores a composed value whose color aliases `md/sys/color/on-surface` and whose opacity aliases `md/ref/opacity/12`
- **THEN** the audit reports rule 1 for the opacity field and proposes aliasing `md/sys/state/disabled/container-opacity` instead

### Requirement: Detection scripts work page by page in use_figma

Because `use_figma` starts every call on the first page and does not support loading all pages at once, detection scripts that cover more than one page SHALL process one page per call by switching with `setCurrentPageAsync` and searching from that page node, and SHALL NOT search from the document root. Detection scripts SHALL use the asynchronous node and style getters, and the type-compatibility rule SHALL cover every node field and text field that the skill binds.

#### Scenario: Audit across all pages

- **WHEN** the user asks for a file-wide coverage audit of a file with 4 pages
- **THEN** the skill runs the detection script once per page, one call after another, and merges the 4 results into one report
