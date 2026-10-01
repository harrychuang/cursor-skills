## Purpose

Decide which raw UI layers inside a designer-provided scope should become components, how they group into components, variants, and component properties, and confirm that plan with the designer using visual evidence before anything is written.

## ADDED Requirements

### Requirement: Scope intake and prerequisites

The skill SHALL accept one or more node URLs (a section, frame, group, or single UI element) or the current selection as its scope. Before any write it SHALL verify that a write-capable `use_figma` tool is available, that the `figma-use` skill can be read, and that the installed figma-m3-variables skill provides Workflow F; when any prerequisite is missing it SHALL stop, name what is missing, and perform no writes. It SHALL ask the user to confirm or narrow the scope when the scope contains more than 50 top-level frames or spans more than one page, and SHALL capture a baseline screenshot of every scope root before any write. Detection SHALL run one page per `use_figma` call and SHALL return compact candidate summaries in pages whose JSON stays within 18,000 characters, requesting further pages until `nextOffset` is `null`.

#### Scenario: Workflow F is not installed

- **WHEN** the installed figma-m3-variables skill has no Workflow F
- **THEN** the skill stops before detection writes anything and tells the user to install the figma-m3-variables version that includes Workflow F

#### Scenario: Designer points at one element

- **WHEN** the designer shares the URL of a single raw button frame
- **THEN** the scope is that frame and its descendants, and the frame itself is a candidate

### Requirement: Candidate detection without a repetition requirement

The skill SHALL treat as candidates: nodes that match a recognized UI pattern by layer name or anatomy (button, icon button, chip, badge, avatar, text field, search field, checkbox, radio, or switch row, list item, card, tab, tab bar, navigation bar, top app bar, dialog, snackbar, menu item); structures that repeat two or more times in the scope; and the scope root itself when the designer pointed at a single UI element. A pattern match alone SHALL be sufficient; repetition SHALL NOT be required. The skill SHALL exclude existing components and instances together with their descendants, screen-level frames (top-level frames between 320 and 1920 px wide that hold a page layout), layout-only wrappers (frames without their own fills, strokes, effects, or corner radius whose children are candidates), hidden layers, lone text nodes and lone shapes that match no pattern, and locked layers, reporting every excluded locked layer. Each candidate SHALL get a level: atom (contains no other candidate), molecule (contains atoms), or organism (contains molecules).

#### Scenario: Section with one card and three buttons

- **WHEN** the scope is a section holding a 390 px wide screen frame that contains a card with a button inside and two more raw buttons
- **THEN** the screen frame is excluded, the three buttons are atom candidates, and the card is a molecule candidate

##### Example: Detection decisions

| Node | Decision | Reason |
| --- | --- | --- |
| Frame "Screen / Home", 390 × 844, top level | excluded | screen-level frame |
| Frame "Button", fill #6750A4, radius 20, one text child | atom candidate | button pattern |
| Frame "Frame 12", no fill, holds two buttons side by side | excluded | layout-only wrapper |
| Frame "Card", fill, radius 12, holds image, texts, and a button | molecule candidate | card pattern containing an atom |
| Instance of existing component "Icon/Star" | excluded | already an instance |
| Text "Welcome back" alone | excluded | lone text without a pattern |

### Requirement: Grouping into components, variants, and properties

Candidates with the same structural signature (node types, child order, auto-layout direction, and anatomy) SHALL form one component. Because instances cannot override layer order, child positions, constraints, or text box sizes, the signature SHALL also include the child positions inside frames without auto layout, the constraints, and the sizes of fixed-size text boxes; candidates that differ only in these SHALL be proposed as variants with confidence `needs-review`. Within one component, differences only in text content SHALL become a TEXT property, differences in nested instances SHALL become an INSTANCE_SWAP property, an optional child present in only some occurrences SHALL become a BOOLEAN property, and differences in image fills SHALL stay as instance overrides without a property. Candidates with the same anatomy but different styling SHALL become variants under a `Style` property, different sizes under a `Size` property, and state cues (reduced opacity, or layer names containing disabled, hovered, pressed, focused, or selected) under a `State` property, all within one component set. Candidates with different structures SHALL become separate components. Differences that fall within Workflow F's near-value thresholds SHALL be treated as drift rather than variants: those occurrences stay in one component and the differing values are left to Workflow F's review board.

#### Scenario: Buttons that differ in label, style, and a tiny padding drift

- **WHEN** the scope holds four buttons: two filled with labels "Save" and "Send", one outlined with label "Cancel", and one filled with 15 px instead of 16 px horizontal padding
- **THEN** the plan proposes one component set `Button` with `Style=Filled` and `Style=Outlined` and a TEXT property `Label`
- **AND** the 15 px button stays in `Style=Filled`, with its padding difference passed to Workflow F's review board

##### Example: Grouping outcomes

| Difference between occurrences | Result |
| --- | --- |
| Only the text differs | One component with a TEXT property |
| A nested icon instance differs | One component with an INSTANCE_SWAP property |
| A leading icon exists in some occurrences | One component with a BOOLEAN property |
| Fill and stroke styling differ, anatomy is the same | Variants under `Style` |
| Height and padding scale differ | Variants under `Size` |
| One occurrence is at 38% opacity and named "disabled" | Variant `State=Disabled` |
| Child structure differs | Separate components |
| Padding 15 vs 16 only | Same component; value drift goes to Workflow F |
| Child positions differ inside a frame without auto layout | Proposed as variants, marked `needs-review` (instances cannot override positions) |

### Requirement: Reuse of existing components

Before proposing a new component, the skill SHALL compare each candidate with the file's local components by structural signature and anatomy. When a local component matches, the plan SHALL replace those occurrences with instances of the existing component instead of creating a duplicate.

#### Scenario: File already has a Chip component

- **WHEN** a local component named `Chip` has the same signature as three raw chips in the scope
- **THEN** the plan lists the three chips under "reuse `Chip`" and proposes no new chip component

### Requirement: Confidence and questions

Every proposed component SHALL carry a confidence: `exact` when a pattern match and a consistent anatomy agree, `inferred` when only structure or repetition supports it, and `needs-review` when its boundary or grouping is ambiguous. The skill SHALL ask about every `needs-review` item before building, and SHALL let the designer rename, split, merge, or exclude any proposed component.

#### Scenario: Ambiguous boundary

- **WHEN** a frame could be either a card or a plain layout section
- **THEN** the component is marked `needs-review` and the skill asks the designer before including it

### Requirement: Grouping review board

Before building, the skill SHALL add a Section named `Componentize Review — temporary` on the page that contains the scope, beside the existing content, without moving or editing any existing node. The board SHALL show one row per proposed component with up to four clones of representative occurrences scaled to fit 400 px wide, the proposed name, the variant and property mapping, the occurrence count, and the confidence. The skill SHALL capture a screenshot of the board, give the user its Figma link, and ask per component: accept, rename, split, merge with another component, or exclude. After the decisions, the skill SHALL delete the board unless the user asks to keep it.

#### Scenario: Designer splits a proposed component

- **WHEN** the board shows `Card` with a product card and a promo card and the designer answers "split"
- **THEN** the plan replaces `Card` with two components and asks the designer to confirm their names

### Requirement: Componentization plan confirmation

Before any write other than the review board, the skill SHALL present a plan listing each component (name, component or component set, variants, properties, contained instances, representative node, occurrence node IDs, confidence), the reused components, the excluded candidates with reasons, the target page, and the writes grouped by change tier: creating the page, components, and properties as Tier 2, and replacing original layers as Tier 3. The skill SHALL wait for confirmation.

#### Scenario: Designer confirms the plan

- **WHEN** the designer confirms a plan with 3 components and 11 occurrences
- **THEN** the skill proceeds to the restore point and the build, and asks again before replacing any original layer
