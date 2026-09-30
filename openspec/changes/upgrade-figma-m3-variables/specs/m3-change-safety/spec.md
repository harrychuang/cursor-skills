## Purpose

Guarantee that figma-m3-variables never changes a Figma file's structure or appearance without the level of confirmation the change warrants, and that it detects appearance changes before they are written.

## ADDED Requirements

### Requirement: Change tiers govern confirmation

The skill SHALL classify every planned write into one of four change tiers before executing it, and SHALL apply the confirmation rule of the highest tier present in the plan:

- Tier 0 (read-only): inventory, inspection, value harvesting, audit reports, and dry-run plans. No confirmation is required.
- Tier 1 (single explicit target, appearance-neutral): binding tokens whose resolved values equal the current values on one node the user identified, or creating at most 10 variables for that node. The skill SHALL present the mapping and wait for confirmation unless the user's request explicitly asked to apply immediately.
- Tier 2 (broad or structural, appearance-neutral): binding across more than one node, creating a collection or mode, creating more than 10 variables in one run, creating or editing Text Styles or Effect Styles, detaching a Text Style or Effect Style from a node, renaming variables, or moving a paint opacity onto a bound layer opacity. The skill SHALL present a dry-run plan and wait for explicit confirmation; an explicit user instruction to auto-apply without review waives this confirmation.
- Tier 3 (appearance-changing or destructive): binding a token whose resolved value differs from the current value, merging near values, snapping off-scale values, changing the value or alias target of a variable that is already bound, deleting variables, collections, modes, or styles, removing bindings, or changing the prefix. The skill SHALL present visual evidence and wait for explicit confirmation of each change group. No blanket auto-apply instruction waives Tier 3 confirmation.

#### Scenario: Batch binding with an auto-apply instruction

- **WHEN** the user asks to apply Variables to a component set, says to auto-apply without review, and every proposed binding is appearance-neutral
- **THEN** the skill applies the Tier 2 plan without waiting and reports applied, skipped, and failed items with node IDs and variable IDs

#### Scenario: Auto-apply does not cover appearance changes

- **WHEN** the user says to auto-apply and the plan contains a binding whose token value differs from the node's current value
- **THEN** the skill applies only the appearance-neutral items
- **AND** holds the differing items for explicit confirmation with before and after evidence

##### Example: Tier classification

| Planned action | Tier |
| --- | --- |
| List collections, variables, and styles | 0 |
| Bind `md/comp/filled-button/container/background-color` (#6750A4) to one node whose fill is #6750A4 | 1 |
| Create the `md · Component` collection | 2 |
| Rename `md/comp/filled-button/container/background-color/disabled` to `md/comp/filled-button/disabled/container/background-color` | 2 |
| Merge #1A73E8 and #1A73E9 into one Ref token | 3 |
| Delete an empty collection | 3 |

### Requirement: Appearance-neutrality check before binding

Before binding, the skill SHALL resolve each proposed variable for the target node and compare the result with the node's current value. Colors SHALL match when the rendered color and opacity are equal: the variable's color resolved for the node, including its alpha or composed opacity, combined with the paint's own opacity, compared with the current paint color and paint opacity. Numbers SHALL match when the absolute difference is below 0.01. Opacity variables store percentages from 0 to 100 while node and paint opacity read from 0 to 1, so the comparison SHALL convert units before comparing. Typography SHALL match when font family, font style, size, line height, and letter spacing are all equal. A mismatch SHALL reclassify that binding as Tier 3, and the plan SHALL show the current value next to the token value.

#### Scenario: Token radius differs from the node radius

- **WHEN** the plan binds `md/comp/card/container/shape` (resolves to 12) to a card whose corner radius is 16
- **THEN** the binding is marked as an appearance change in Tier 3
- **AND** the confirmation request shows 16 → 12 together with a screenshot of the card

### Requirement: Confirmation requests carry the evidence to decide

Every Tier 1, Tier 2, and Tier 3 confirmation request SHALL include: the number of variables and styles to create per layer, the bindings grouped by component or node, the current and proposed values, a confidence level of `exact`, `inferred`, or `needs-review` for each mapping, and a flag on every appearance-changing item. Tier 3 requests SHALL also include a before screenshot of each affected scope root, plus either the near-value review board link or an after preview.

#### Scenario: Designer reviews a token plan

- **WHEN** the skill asks for confirmation of a plan that creates 12 Ref, 9 Sys, and 14 Comp variables and binds 31 properties
- **THEN** the request lists those counts per layer, the 31 bindings grouped by component with current and token values, and the confidence of each mapping
- **AND** the request marks which items are appearance-neutral and which are not

### Requirement: Conventions are inferred from the file before asking

The skill SHALL infer the token prefix, collection layout, composite binding mode (Styles or Variables), spacing and shape scales, state token order, and Ref color category from the file's existing Variables and Styles. It SHALL ask only about decisions for which the file provides no evidence, and SHALL keep every confirmed decision fixed for the rest of the session.

#### Scenario: File already has tokens

- **WHEN** the file contains variables named `dd/sys/color/primary` and `dd/comp/chip/container/shape`
- **THEN** the skill uses `dd` as the prefix without asking

#### Scenario: File has no tokens

- **WHEN** the file contains no local Variables
- **THEN** the skill asks the user to choose a prefix and a collection layout before creating any variable

### Requirement: Library variables are not duplicated locally

When target nodes are bound to library (remote) variables, or the user states that tokens live in a library file, the skill SHALL NOT create local variables for the same roles. It SHALL bind imported library variables where the needed tokens exist, SHALL list the tokens that would have to be created in the library file, and SHALL ask the user how to proceed.

#### Scenario: Target uses library tokens

- **WHEN** a button's fill is bound to a remote variable and its corner radius is hardcoded
- **THEN** the skill does not create a local color variable for the fill
- **AND** reports that a radius token has to be added in the library file and asks the user whether to continue locally or stop

### Requirement: Writes are sequential, re-validated, and traceable

The skill SHALL run `use_figma` calls one at a time, SHALL re-fetch every node and variable by ID inside each write script, SHALL verify that the variable type matches the target property before binding, SHALL split writes into chunks of at most 100 bindings or one component per call, SHALL return every affected variable ID, style ID, and node ID, and SHALL stop at the first error to read and fix it before retrying.

#### Scenario: Node removed between plan and apply

- **WHEN** a node listed in a confirmed plan no longer exists when the write script runs
- **THEN** the script skips that node, applies the remaining items, and returns the skipped node ID with the reason `node not found`
