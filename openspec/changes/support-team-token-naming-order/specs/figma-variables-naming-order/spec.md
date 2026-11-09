## ADDED Requirements

### Requirement: Naming order resolution

Before figma-m3-variables creates, renames, or audits variable names, it SHALL resolve one naming order for the file, using the first source that applies: (1) an order stated in the user's prompt, either as a slot list or as example names that show one; (2) an order already recorded for the project, read from the Figma file's shared plugin data (namespace `m3_variables`, key `naming_order`) or from the `## Naming Order` section of `design-system/TOKEN_ARCHITECTURE.md` in the workspace; (3) an order inferred from the file's existing variable names; (4) the M3 order of token-spec.md §5 as the default. When the recorded sources disagree with each other, or the existing Comp names follow more than one order, the skill SHALL ask the user once which order to use, showing each competing order with its variable count and one example name. The skill SHALL NOT ask when a single source applies.

#### Scenario: Prompt order wins over the default

- **WHEN** a file has no variables and the prompt says the team order is prefix, category, component, role, variant, target, state
- **THEN** the skill uses that order and does not fall back to the M3 order

#### Scenario: Recorded order is reused

- **WHEN** the file's shared plugin data holds a naming order and the prompt names none
- **THEN** the skill uses the recorded order without asking

#### Scenario: Mixed evidence triggers one question

- **WHEN** the file has 12 Comp variables in M3 order and 9 Comp variables whose state is the last segment, and nothing is recorded
- **THEN** the skill asks once which order to use, listing both orders with their counts and one example each

#### Scenario: Default without evidence

- **WHEN** the prompt names no order, nothing is recorded, and the file has no variables
- **THEN** the skill uses the M3 order

### Requirement: Naming order stated in the existing plan

The skill SHALL state the resolved naming order, with its source (`prompt`, `recorded`, `inferred`, or `default`), in the plan it already shows before any write: the Workflow F token plan header, the Workflow B and Workflow D plans, and the Workflow C audit report header. The line SHALL tell the user how to switch to another order. The skill SHALL NOT add a separate confirmation step for the naming order; changing the order in reply to the plan SHALL produce a revised plan that is confirmed like any other plan edit.

#### Scenario: Token plan shows the order

- **WHEN** Workflow F shows its token plan for a file that uses a recorded team order
- **THEN** the plan header contains `Naming order: prefix > category > component > role > variant > target > state (recorded)` and a reply hint for switching

#### Scenario: Switching the order in reply to the plan

- **WHEN** the user replies to a token plan with a different slot order
- **THEN** the skill shows the revised names and waits for confirmation again, without asking a separate naming question

### Requirement: Naming order recorded in the file

After the user confirms a plan, the first write call SHALL record the confirmed order in the file's shared plugin data (`figma.root.setSharedPluginData('m3_variables', 'naming_order', …)`) as JSON holding the slot list (or `m3`), the slot vocabularies, the default-state word, the source, and the date. The skill SHALL NOT write `design-system/TOKEN_ARCHITECTURE.md`; that file belongs to design-system-extractor. When the record write fails, the skill SHALL report the failure and continue the approved writes.

#### Scenario: Confirmed order is written once

- **WHEN** the user confirms a token plan that uses the team order from the prompt
- **THEN** the first write call stores `{"order":["prefix","category","component","role","variant","target","state"], …, "source":"prompt"}` under `m3_variables` / `naming_order` before creating variables

### Requirement: Names follow the order in force

When a team order is in force, every new Ref, Sys, and Comp name SHALL place its segments in the team's slot order, translate the M3 concepts of token-spec.md §5 into the team's slots with the mapping table of token-spec.md §14, take slot values from the team's vocabularies when they list one, and omit unused slots. A value that no vocabulary covers SHALL be listed in the plan as a `needs-review` naming item. Each Figma name SHALL map to its CSS name by replacing `/` with `-` (token-spec.md §9). When the M3 order is in force, names SHALL follow token-spec.md §5 unchanged.

#### Scenario: Filled button container under a state-last team order

- **WHEN** the team order is prefix > category > component > role > variant > target > state, the team maps Style=Filled to `primary`, and the button's container fill has a Hovered variant
- **THEN** the planned names are `shop/comp/button/color/primary/container/default` and `shop/comp/button/color/primary/container/hovered`, with WEB code syntax `var(--shop-comp-button-color-primary-container-default)` and `var(--shop-comp-button-color-primary-container-hovered)`

#### Scenario: Value outside the vocabulary

- **WHEN** a harvested radius has no matching role in the team's role vocabulary and the vocabulary has `size`
- **THEN** the Ref name uses `size` (for example `shop/ref/size/10`) and the plan marks the mapping `inferred`

### Requirement: Explicit default state under state-last orders

When the slot order places `state` after the slots a name uses and a token has state variants, the default state SHALL be written as its own segment (`default`, or the default-state word recorded with the order). The skill SHALL NOT create a variable whose full name is also the group prefix of another variable. This rule SHALL apply to Figma variable names and DTCG paths; CSS custom property names are flat and have no group, but the skill SHALL keep the CSS name identical to the path with `/` replaced by `-`, so the CSS name also carries `-default`.

#### Scenario: Bare container next to its hovered state is not created

- **WHEN** a plan would contain `…/container` and `…/container/hovered` under a state-last order
- **THEN** the plan contains `…/container/default` and `…/container/hovered` instead

### Requirement: Audit rule 17 checks the order in force

Audit rule 17 SHALL be named "Naming order". When the order in force is M3, it SHALL keep the legacy-state check (a Comp name whose last segment is a state word after the property) and propose the M3 rename. When a team order is in force, it SHALL NOT run the legacy-state check; instead it SHALL classify each slash segment with the team's slot vocabularies (segment 0 as the prefix), skip segments that match no vocabulary, and report a name whose classified segments are not in non-decreasing slot order. The fix SHALL be a Tier 2 rename in place to the name with its segments sorted by slot order when every segment is classified, and a request for the intended name otherwise. The report header SHALL state which order rule 17 checked.

#### Scenario: State-last names pass under the team order

- **WHEN** the team order is in force and the file has `shop/comp/button/color/primary/container/hovered`
- **THEN** rule 17 reports nothing for that name

#### Scenario: Out-of-order team name

- **WHEN** the team order is in force and the file has `shop/comp/color/button/primary/container/default`
- **THEN** rule 17 reports that `button` (component) comes after `color` (role) and proposes `shop/comp/button/color/primary/container/default`

#### Scenario: M3 file keeps the legacy check

- **WHEN** the order in force is M3 and the file has `md/comp/filled-button/container/background-color/disabled`
- **THEN** rule 17 proposes `md/comp/filled-button/disabled/container/background-color`

### Requirement: Audit rule 19 detects a variable that is also a group

The audit SHALL add rule 19, "Variable is also a group", severity warning, checked on variables: a variable whose full name followed by `/` starts another variable's name. When the order in force places `state` last and every such child continues with a state value, the fix SHALL be a Tier 2 rename in place of the shorter variable to `{name}/default`, updating its WEB code syntax and flagging that code using the old CSS name must change. When the order in force is M3, the fix SHALL point to the rule 17 rename that removes the conflict. Otherwise the fix SHALL ask the user which name to change. The audit SHALL report all 19 rules, and every count of rules in SKILL.md, audit-rules.md, and docs/index.html SHALL read 19.

#### Scenario: Comp container conflict

- **WHEN** a team order with state last is in force and the file has `shop/comp/button/color/primary/container` and `shop/comp/button/color/primary/container/hovered`
- **THEN** rule 19 reports `shop/comp/button/color/primary/container` and proposes renaming it to `shop/comp/button/color/primary/container/default` (Tier 2)

#### Scenario: Sys color conflict

- **WHEN** a team order with state last is in force and the file has `shop/sys/color/primary` and `shop/sys/color/primary/hovered`
- **THEN** rule 19 reports `shop/sys/color/primary` and proposes `shop/sys/color/primary/default`, noting that code using `--shop-sys-color-primary` must switch to `--shop-sys-color-primary-default`

##### Example: rule 19 outcomes

| Variables in the file | Order in force | Rule 19 result |
|---|---|---|
| `shop/comp/button/color/primary/container`, `…/container/hovered` | team, state last | warning; rename to `…/container/default` |
| `shop/comp/button/color/primary/container/default`, `…/container/hovered` | team, state last | nothing |
| `md/comp/filled-button/container/background-color`, `…/background-color/hovered` | M3 | warning; fix with the rule 17 rename |
| `shop/sys/color/primary`, `shop/sys/color/primary/container` | team, state last | warning; ask which name to change |
