## Purpose

Decide when raw UI in the designer's scope is rebuilt from components that already exist in the file, which existing variant each occurrence uses, and what happens when no existing variant fits, so that existing components are reused first and new components are created only when nothing suitable exists or the designer chooses so.

## ADDED Requirements

### Requirement: Existing component inventory

The skill SHALL first run detection without an inventory to obtain each candidate group's core signature and name, and SHALL then collect an inventory of the file's local components, one page per `use_figma` call, on every page that holds local components. The inventory SHALL contain one entry per variant (or per standalone component) that meets at least one condition: its core signature equals a candidate group's core signature; its normalized name or the UI pattern recognized from its name equals a candidate group's; or the designer named its ID. Each entry SHALL carry the node ID, the component set ID (null for a standalone component), the component name, the variant name, the core signature, the UI pattern recognized from the component name, the layer opacity, the same style fields detection uses for grouping, and the reason it was included (`core`, `name`, or `id`). Each returned page of the inventory SHALL stay within 18,000 characters of JSON and SHALL report `nextOffset` until it is `null`. When the inventory is empty, the skill SHALL skip reuse matching and continue with the groups as detected. When the inventory is not empty, the skill SHALL run detection again with the inventory as input.

#### Scenario: File has no related components

- **WHEN** the scope holds raw buttons and the file's local components are only icons whose core signatures and names match no candidate group
- **THEN** the inventory is empty, detection is not run a second time, and every group proceeds as a new component

#### Scenario: Large component library

- **WHEN** the Components page holds 500 variants and 3 of them share a core signature with a candidate group
- **THEN** the inventory returns those 3 entries, each with its style fields and component set ID, within one page of at most 18,000 characters

### Requirement: Reuse match by structure, name, and style

A local component SHALL be a reuse candidate for a group only when its core signature equals the group's. For each candidate the skill SHALL determine name evidence and style coverage. Name evidence SHALL be `agree` when at least half of the group's occurrences were recognized by layer name and the UI pattern recognized from the component's name is the same pattern, or when the group's most common meaningful layer name equals the component's name after normalization (last path segment, lowercase, letters and digits only); `conflict` when at least half of the group's occurrences were recognized by layer name, the component's name yields a UI pattern, and the two patterns differ; and `neutral` otherwise. A pattern inferred only from anatomy or repetition SHALL NOT count as name evidence. Style coverage SHALL be computed per occurrence as defined in "Variant assignment per occurrence". The match quality SHALL be `exact` when name evidence is `agree` and every occurrence is covered; `partial` when name evidence is `agree` and at least one occurrence is uncovered; `unconfirmed` when name evidence is `neutral` and every occurrence is covered. In every other case the group SHALL NOT be reused automatically, and the same-core components SHALL be listed as alternatives (at most three) with their name evidence and covered count. An `exact` match SHALL be reused without a question. A `partial` or `unconfirmed` match SHALL mark the group `needs-review`.

#### Scenario: Button is not matched to Chip

- **WHEN** the file has local components `Chip` and `Button` with the same core signature, `Chip` comes first in the inventory, and the scope holds three raw frames named "Button" whose style is near the `Button` component's
- **THEN** the group is matched to `Button` with quality `exact`, and `Chip` is listed as an alternative with name evidence `conflict`

#### Scenario: Unnamed frames that look like an existing chip

- **WHEN** two raw frames named "Frame 12" were recognized as buttons by anatomy only, and their style is near the local component `Chip`
- **THEN** the group is proposed for reuse of `Chip` with quality `unconfirmed`, is marked `needs-review`, and the designer is asked whether to reuse `Chip`, build a new component, or keep the layers as they are

##### Example: Match outcomes

| Raw group | Local components with the same core | Outcome |
| --- | --- | --- |
| 3 frames named "Button", filled | `Chip` (first in inventory); `Button` set with `Style=Filled` | Reuse `Button`, quality `exact`; `Chip` is an alternative with evidence `conflict` |
| 2 filled and 1 outlined frame named "Button" | `Button` set with `Style=Filled` only | Quality `partial`: 2 covered, uncovered `Style=Outlined` count 1 |
| 2 frames named "Frame 12", same look as `Chip` | `Chip` | Quality `unconfirmed`, marked `needs-review` |
| 2 frames named "Button" | `Chip` only | No reuse; `Chip` is an alternative with evidence `conflict` |
| 2 frames named "Frame 12", look differs from `Chip` | `Chip` | No reuse; `Chip` is an alternative with evidence `neutral`, covered 0 |
| 3 frames named "Button" | none | No reuse, no alternatives; the group is built as a new component |

### Requirement: Ranking among matching components

When more than one local component qualifies for the same group, the skill SHALL choose by this order: name evidence `agree` before `neutral`; then the larger number of covered occurrences; then the smaller total number of differing style fields; then the earlier position in the inventory, in which the Components page comes first. When the two best components are equal on the first three criteria, the skill SHALL NOT choose between them: it SHALL mark the group `needs-review`, list both, and ask the designer which one to reuse.

#### Scenario: Two equally good components

- **WHEN** local components `Button` and `CTA Button` have the same core signature, both yield the pattern Button, and both cover all four raw buttons with the same number of differing fields
- **THEN** the group is marked `needs-review`, both components are listed, and the designer is asked which one to reuse

#### Scenario: Better coverage wins

- **WHEN** local components `Button` and `CTA Button` both have name evidence `agree`, `Button` covers four of four occurrences and `CTA Button` covers two of four
- **THEN** the group is matched to `Button`

### Requirement: Variant assignment per occurrence

For every occurrence of a group that has a reuse candidate, detection SHALL assign the existing variant (or standalone component) that has the same core signature, the same layer opacity, a height within the near-value threshold, and a style within the near-value thresholds used for grouping (colors ΔE ≤ 3 with equal paint opacity; numbers within 1 px or 5% of the larger value), choosing the one with the fewest differing fields. An occurrence with such a variant is covered; an occurrence without one is uncovered and has no assigned variant. The members output SHALL carry the assigned variant ID for each occurrence. The replacement job list and the replacement of inner occurrences during the build SHALL use the assigned variant ID and SHALL NOT pick a variant again at write time. When an assigned variant no longer exists at replacement time, the skill SHALL keep that occurrence unchanged, report it, re-run detection for its group, and ask the designer.

#### Scenario: Filled and outlined occurrences with a matching set

- **WHEN** the local set `Button` has `Style=Filled` (ID 40:2) and `Style=Outlined` (ID 40:5), and the scope holds two filled and one outlined raw button
- **THEN** the members output assigns 40:2 to the two filled occurrences and 40:5 to the outlined occurrence, and the replacement job list uses exactly those IDs

#### Scenario: Assigned variant was deleted before replacement

- **WHEN** the designer deletes variant 40:5 after the plan was confirmed and before replacement
- **THEN** the outlined occurrence is kept unchanged and reported, and the skill re-runs detection for the `Button` group and asks the designer how to proceed

### Requirement: Designer decides uncovered occurrences

For every group whose match has uncovered occurrences, the skill SHALL ask the designer, once per variant of the uncovered occurrences, to choose one of: add a variant to the existing component set; build a new component from those occurrences; or keep those occurrences as they are. The option to add a variant SHALL be offered only when the existing component is a component set; when it is a standalone component the skill SHALL offer the other two options and SHALL state that the existing component is not a component set. Covered occurrences of the same group SHALL still be replaced with the existing component. Occurrences the designer keeps SHALL be listed in the plan and the report with the reason "no matching variant — kept by the designer". The skill SHALL NOT leave an uncovered occurrence without one of these decisions, and SHALL NOT build, add, or replace for that group before the decision.

#### Scenario: Existing set has no outlined variant

- **WHEN** the local set `Button` has only `Style=Filled`, and the scope holds two filled and one outlined raw button
- **THEN** the designer is asked to add a variant to `Button`, build a new component, or keep the outlined button as it is
- **AND** the two filled buttons are planned for replacement with `Style=Filled` regardless of the answer

#### Scenario: Existing component is not a set

- **WHEN** the local component `Button` is a standalone component and one raw button has no near style
- **THEN** the designer is offered only "build a new component" and "keep as it is", with the statement that `Button` is not a component set

#### Scenario: Designer keeps the occurrence

- **WHEN** the designer answers "keep as it is" for the outlined button
- **THEN** that button is not replaced, and the plan and the report list it with the reason "no matching variant — kept by the designer"

### Requirement: Adding a variant to an existing component set

Adding a variant to an existing component set SHALL be a Tier 2 change that runs only after the designer chose it for that group; no blanket auto-apply instruction SHALL waive that choice. The new variant SHALL be built from a clone of the representative occurrence, with inner occurrences of existing or already built components replaced by instances. Its name SHALL use exactly the set's own variant property names; the skill SHALL propose the nearest existing variant's name with one property value changed and SHALL ask the designer to confirm or edit it. A name that omits one of the set's variant properties, adds a property the set does not have, or equals an existing variant's name SHALL be rejected before any write, and the skill SHALL ask again. Child layer names and component property references SHALL be taken from the nearest existing variant by structural position. The new variant SHALL be placed below the existing variants with a 20 px gap, or left to the set's auto layout when the set has one; the skill SHALL NOT move, rename, restyle, or delete any existing variant and SHALL NOT add component properties to the set. After the write the skill SHALL verify that the new component's parent is the set, that the set has exactly one more child, that every earlier variant has the same ID, position, and size, and that the set has no additional property names. When a check fails or the write throws, the skill SHALL remove the new component, restore the set's size, report the reason, and ask the designer to build a new component or keep the occurrences. When the enlarged set overlaps sibling nodes, the skill SHALL report those nodes and SHALL NOT move them. The added variant SHALL be recorded in the ledger and included in the scope passed to Workflow F.

#### Scenario: Outlined variant added to Button

- **WHEN** the designer chooses to add a variant to the set `Button` (properties: `Style`; variants: `Style=Filled`) and confirms the name `Style=Outlined`
- **THEN** `Button` has two variants, `Style=Filled` keeps its ID, position, and size, the new variant's label layer is linked to the same `Label` property as in `Style=Filled`, and the outlined raw button is planned for replacement with the new variant

#### Scenario: Verification fails after the write

- **WHEN** the set reports the same number of children after the write as before
- **THEN** the new component is removed, the set has its earlier size, and the designer is asked to build a new component or keep the occurrences

##### Example: Variant name checks

| Set's variant properties | Existing variant names | Proposed name | Result |
| --- | --- | --- | --- |
| Style | Style=Filled | Style=Outlined | Accepted |
| Type, Size | Type=Primary, Size=md | Type=Secondary, Size=md | Accepted |
| Type, Size | Type=Primary, Size=md | Style=Outlined | Rejected: `Type` and `Size` missing, `Style` unknown |
| Style, State | Style=Filled, State=Enabled | Style=Outlined | Rejected: `State` missing |
| Style | Style=Filled | Style=Filled | Rejected: duplicate name |

### Requirement: Pairing shown on the review board

For every group that has a reuse match or alternatives, the grouping review board row SHALL show, beside the raw samples, samples of the existing components: at most two of the matched variants and at most three alternatives with one sample each, with a caption giving the existing component name, the variant name, and the match quality or the name evidence. Samples of existing components SHALL be instances; the board SHALL NOT clone a main component or a component set, and removing the board SHALL remove the samples. When the fonts of an existing component cannot be loaded, its sample SHALL be skipped and listed in the result, and the questions SHALL still be asked.

#### Scenario: Matched group on the board

- **WHEN** the group `Button` is matched to the local set `Button` with quality `partial`
- **THEN** its board row shows the raw button samples and, beside them, an instance of `Button` captioned with the component name, the variant name, and `partial`

#### Scenario: The board adds no components

- **WHEN** the board is built for a scope whose groups match two local components, and is then removed
- **THEN** the file has the same local components as before the board was built

### Requirement: Designer overrides of reuse

For every group with a reuse match or alternatives, the skill SHALL offer, in addition to accept, rename, split, merge, and exclude: "build new instead", which builds the group as a new component and reuses nothing; and "reuse another component", for which the designer picks a listed alternative or names a local component by link or name. When the named component has the same core signature as the group, the skill SHALL evaluate it as the reuse candidate without requiring name evidence, SHALL still compute style coverage, and SHALL ask about uncovered occurrences as in "Designer decides uncovered occurrences". When the named component has a different core signature, the skill SHALL NOT use it as a reuse target; it SHALL state that the layer structure differs, so an instance cannot be proven to look the same, and SHALL ask the designer to build a new component or keep the occurrences. The designer's decisions SHALL be passed to detection keyed by core signature, and detection SHALL be re-run so that the plan reflects them.

#### Scenario: Designer declines the proposed reuse

- **WHEN** the group `Button` is matched to the local component `Button` and the designer answers "build new instead"
- **THEN** the plan lists the group as a new component, none of its occurrences is assigned an existing variant, and the plan records that the reuse of `Button` was declined

#### Scenario: Designer picks an alternative with the same structure

- **WHEN** the group has no automatic match, lists `Chip` as an alternative, and the designer answers "reuse another component: Chip"
- **THEN** detection is re-run with `Chip` as the reuse candidate for that core signature, and each occurrence is either assigned a `Chip` variant or reported as uncovered for the designer to decide

#### Scenario: Designer names a component with a different structure

- **WHEN** the designer names the local component `Legacy Button`, whose core signature differs from the group's
- **THEN** the skill states that the layer structure differs, does not use `Legacy Button` as a reuse target, and asks whether to build a new component or keep the occurrences

### Requirement: Name clash with an existing component

When a group that is going to be built as a new component has a name equal, after normalization, to the name of a local component, the skill SHALL mark the group `needs-review` and SHALL ask the designer for a distinct name, proposing one that adds a style or a descriptive word from the layer names, or to exclude the group. The skill SHALL repeat this check after every rename, split, and "build new instead" decision, and SHALL NOT create a component whose normalized name equals a local component's name.

#### Scenario: Existing Button has a different structure

- **WHEN** the file has a local component `Button` whose core signature differs from the three raw buttons named "Button" in the scope
- **THEN** the group is marked `needs-review` with a note that a local component named `Button` exists with a different layer structure, and the designer is asked for a distinct name or to exclude the group

#### Scenario: New name still clashes

- **WHEN** the designer renames the group to "Chip" and a local component `Chip` exists
- **THEN** the skill asks again for a distinct name and builds nothing for that group

### Requirement: Reuse details in the plan, ledger, and report

The componentization plan SHALL list, for every reused group, the existing component, the match quality, and the number of occurrences per assigned variant; SHALL list the variants to be added to existing sets with the set, the new variant name, the representative, and the occurrence IDs; SHALL list the groups built as new components because the designer declined a reuse; SHALL list the occurrences kept by the designer's decision with the reason; and SHALL count added variants in its Tier 2 summary. The ledger SHALL record, for every reused group, the existing component ID, the assigned variant ID of each occurrence, and the ID and name of each added variant. The replacement confirmation and the final report SHALL list the variants used per reused component with their counts, the added variants with IDs, and the designer's reuse decisions.

#### Scenario: Plan with reuse, an added variant, and a kept occurrence

- **WHEN** eight raw buttons match the local set `Button`, six are covered by `Style=Filled`, the designer adds `Style=Outlined` for one, and keeps one tonal button as it is
- **THEN** the plan shows `Button` under reused with `Style=Filled` 6 and `Style=Outlined` 1, one added variant on `Button`, one occurrence kept by decision with its reason, and a Tier 2 summary that counts one added variant

### Requirement: Guide and documentation for reuse matching

SKILL.md SHALL describe the detection order (detection, inventory, detection with the inventory), the reuse questions in the grouping review, and the change tier of adding a variant to an existing set, and SHALL keep its description within 1024 characters, embed no script longer than 15 lines, and cite only reference sections that exist. The Traditional Chinese documentation page SHALL explain, in terms of what the designer sees on the canvas, how an existing component is matched (structure, name, style), the three match qualities, the three choices for occurrences without a matching variant, the pairing on the review board, the two override options, the name clash question, and that components from team libraries are not matched. The terms `exact`, `partial`, and `unconfirmed` and the option names SHALL be the same in SKILL.md, the three reference files, and the documentation page.

#### Scenario: Designer reads how reuse works

- **WHEN** a designer opens the documentation page
- **THEN** the page has a navigation entry and a section that explains the match by structure, name, and style, and the three choices offered when no existing variant fits

#### Scenario: Agent looks up the add-variant recipe

- **WHEN** SKILL.md tells the agent to add a variant to an existing component set
- **THEN** it cites the build recipes section that contains the script, and that section exists
