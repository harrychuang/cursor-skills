## ADDED Requirements

### Requirement: Naming Order record in TOKEN_ARCHITECTURE.md

The design-system template's `TOKEN_ARCHITECTURE.md` SHALL contain a `## Naming Order` section with an `Order:` line, a `Source:` line, a `Default state:` line, a `CSS name:` line, and a `| Slot | Layers | Values |` table. An order is recorded when the `Order:` line lists at least two slot names separated by `>`, `→`, `->`, or `/`; an empty `Order:` line, the word `default`, or a missing section SHALL mean that no order is recorded. Table rows whose first cell names a slot of the order SHALL give that slot's vocabulary as comma-separated values, with backticks ignored. A report-language annotation after the English heading text SHALL be accepted. The shipped template SHALL record no order.

#### Scenario: Recorded team order

- **WHEN** the section contains `Order: prefix > category > component > role > variant > target > state` and a `role` row with `color, font, size, spacing, shadow, elevation, motion`
- **THEN** the parsed order has those seven slots and the `role` slot has those seven values

#### Scenario: Shipped template

- **WHEN** the audit reads the template's `TOKEN_ARCHITECTURE.md` unchanged
- **THEN** no naming order is recorded and the default naming applies

### Requirement: Order resolution, statement, and recording during extraction

In Workflow step 4, before the first token is written, the extractor SHALL resolve the naming order from the first source that applies: the developer's prompt; the order recorded in `TOKEN_ARCHITECTURE.md`; an order inferred from authored source names (Figma Variable names, design-system exports, or source-code tokens), asking once only when those names follow more than one order; otherwise the default `--<prefix>-comp-<component>-<part>-<property>` naming of `references/token-architecture.md`. It SHALL state the order and its source in one non-blocking sentence of the reply that precedes the first token write, in the same way as the Report Language, and SHALL NOT add a stop for it. It SHALL write a prompt-given or inferred order, its slot vocabularies, at least one example per layer, and the CSS mapping (path segments joined with `-`) into `## Naming Order` in the same write.

#### Scenario: Prompt order is recorded

- **WHEN** the developer's prompt gives the order prefix, category, component, role, variant, target, state with the prefix `shop`
- **THEN** the reply before the first token write says `Naming order: prefix > category > component > role > variant > target > state (prompt)` with a hint to change it, and `TOKEN_ARCHITECTURE.md` gets that `Order:` line with `Source: prompt`

#### Scenario: Default naming is announced, not recorded as a team order

- **WHEN** no prompt order, recorded order, or authored names exist
- **THEN** the reply states the default naming and the `Order:` line stays empty

### Requirement: Generated names follow the recorded order

When an order is recorded, every token the extractor writes SHALL place its segments in that order, take values from the slot vocabularies when they list one, omit unused slots, and keep the CSS name equal to the slash path with `/` replaced by `-`. When the order places `state` last and a token has state variants, the default state SHALL be written as its own segment (`default`, or the recorded default-state word). When no order is recorded, comp names SHALL keep the default `--<prefix>-comp-<component>-<part>-<property>` pattern.

#### Scenario: Button container with a hover state

- **WHEN** the recorded order is prefix > category > component > role > variant > target > state and the primary button's container has a hover color
- **THEN** the extractor writes `--shop-comp-button-color-primary-container-default` and `--shop-comp-button-color-primary-container-hovered`, not a bare `--shop-comp-button-color-primary-container`

### Requirement: Token audit checks names against the recorded order

`audit_tokens.mjs` SHALL read the recorded order from `design-system/TOKEN_ARCHITECTURE.md` and print `Naming order: <slots joined by " > "> (TOKEN_ARCHITECTURE.md)`, or `Naming order: default (none recorded)` when none is recorded. With a recorded order, it SHALL split every ref, sys, and comp token name into segments by the longest vocabulary match (a value that contains `-` counts as one segment), treat the text before the category word as the prefix, classify a number as the slot whose vocabulary lists numbers, skip segments that match no vocabulary, and skip segments whose slot's Layers cell excludes the token's layer. A name whose classified segments are not in non-decreasing slot order SHALL be an issue in every mode, naming the out-of-order segment, its slot, the preceding segment and its slot, and, when every segment is classified, the expected name with the segments sorted by slot order. Without a recorded order, the audit SHALL report no naming-order issue.

#### Scenario: Role before component

- **WHEN** the order is recorded and `tokens-comp.css` declares `--shop-comp-color-button-primary-border`
- **THEN** the audit exits 1 with an issue saying `"button" (component) comes after "color" (role)` and expecting `--shop-comp-button-color-primary-border`

#### Scenario: Valid names under the team order

- **WHEN** the order is recorded and the tokens are `--shop-ref-color-neutral-5`, `--shop-sys-color-on-primary`, `--shop-sys-size-corner-md`, and `--shop-comp-button-color-primary-container-hovered`
- **THEN** none of them produces a naming-order issue

#### Scenario: No recorded order

- **WHEN** `TOKEN_ARCHITECTURE.md` has no `Order:` value
- **THEN** stdout contains `Naming order: default (none recorded)` and the audit adds no naming-order issue

### Requirement: State group warning for slash-path exports

`audit_tokens.mjs` SHALL warn, in every mode and never as an issue, when a token `--x` and a token `--x-<state>` both exist and `<state>` is a value of the recorded `state` slot or, without a recorded order, one of `default`, `hovered`, `hover`, `focused`, `focus`, `focus-visible`, `pressed`, `dragged`, `disabled`, `selected`, `unselected`, `checked`. The warning SHALL say that CSS is unaffected, that `--x` becomes both a token and a group once the names are exported as slash paths (Figma Variables, DTCG), and that the default state is named explicitly as `--x-default`.

#### Scenario: Comp container and its hovered state

- **WHEN** `--shop-comp-button-color-primary-container` and `--shop-comp-button-color-primary-container-hovered` are both declared
- **THEN** the audit prints a warning that proposes `--shop-comp-button-color-primary-container-default`, and the exit code does not change because of it

#### Scenario: Sys color and its hovered state

- **WHEN** `--shop-sys-color-primary` and `--shop-sys-color-primary-hovered` are both declared
- **THEN** the audit prints the same kind of warning proposing `--shop-sys-color-primary-default`

#### Scenario: Explicit default state

- **WHEN** the tokens are `--shop-comp-button-color-primary-container-default` and `--shop-comp-button-color-primary-container-hovered`
- **THEN** no state group warning is printed for them

### Requirement: JSON output carries the naming order

`audit_tokens.mjs --json` SHALL print exactly the keys `clusters`, `counts`, `issues`, `namingOrder`, `scaleFit`, and `warnings`. `namingOrder` SHALL be `null` when no order is recorded, and otherwise an object with `slots` (array of slot names), `values` (slot name to array of values), `layers` (slot name to array of layers, empty when unrestricted), `source`, and `defaultState`.

#### Scenario: Recorded order in JSON

- **WHEN** the naming-order fixture is audited with `--json`
- **THEN** `namingOrder.slots` equals `["prefix","category","component","role","variant","target","state"]` and `namingOrder.source` equals `prompt`

### Requirement: Regression coverage

`scripts/test_audits.mjs` SHALL include a `naming-order` fixture and tests for: the recorded order line; the out-of-order issue with its expected name; valid names passing; the comp and sys state group warnings; strict mode passing once the comp default state is explicit and the out-of-order name is fixed; the JSON `namingOrder` value; and the shipped template recording no order. The existing 22 tests SHALL keep passing, with the JSON key assertion updated to include `namingOrder`.

#### Scenario: Test suite

- **WHEN** `node design-system-extractor/scripts/test_audits.mjs` runs after the change
- **THEN** every test passes, including the new naming-order tests
