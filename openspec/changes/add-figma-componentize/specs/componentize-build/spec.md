## Purpose

Build the confirmed components on the Components page from the bottom up, with variants and component properties, while leaving the original design untouched until replacement.

## ADDED Requirements

### Requirement: Restore point before writing

Because `use_figma` cannot save versions, before the first write after plan confirmation the skill SHALL ask the user to save a named version (for example "Before figma-componentize — {scope name}") with ⌘⌥S or Figma's Save to version history command, and SHALL write nothing until the user confirms that the version is saved. The skill SHALL keep a ledger that maps each original node ID to its component ID and instance ID, SHALL use the ledger to find what was already done before retrying a failed call, and SHALL include the ledger and the restore point name in the report.

#### Scenario: User has not saved a version yet

- **WHEN** the plan is confirmed but the user has not confirmed saving a version
- **THEN** the skill asks for the saved version again and writes nothing

#### Scenario: Retry after a failed build call

- **WHEN** a build call fails after the `Button` component was created but before its properties were added
- **THEN** the skill reads the ledger and the canvas, finds the existing `Button` component, and retries only the property step

### Requirement: Components page

The skill SHALL use an existing page whose name contains "components" (case-insensitive, ignoring emoji and other prefixes) or "元件". When no such page exists it SHALL create a page named `Components` as a Tier 2 change. When page creation fails because of the plan's page limit (the Starter plan allows 3 pages per design file, and the error says the plan only comes with 3 pages), the skill SHALL offer to place the components in a Section named `Components` on an existing page the user chooses, and SHALL NOT build until the user answers.

#### Scenario: Page named with an emoji

- **WHEN** the file has a page named "🧩 Components"
- **THEN** the skill builds the components on that page and creates no new page

#### Scenario: Starter file already has three pages

- **WHEN** creating the `Components` page fails with the Starter plan page-limit error
- **THEN** the skill asks which existing page should hold a `Components` Section and builds nothing until the user answers

### Requirement: Bottom-up construction from clones

The skill SHALL build atoms first, then molecules, then organisms, one component or component set per `use_figma` call. Each main component SHALL be created from a clone of its representative occurrence placed on the Components page, so the original layers stay untouched until replacement and the new component looks exactly like the representative. Before cloning or moving the representative, the skill SHALL load every font it uses. When a representative contains occurrences of components that were already built, those inner occurrences SHALL be replaced with instances inside the clone before the clone becomes a component. Child layers with automatic names in the clone SHALL be renamed after their anatomy (`container`, `label`, `icon`, `supporting-text`). After conversion the skill SHALL check the returned node's type and child count; when conversion fails, it SHALL wrap the clone in a frame and convert again, and SHALL report the component as skipped if that also fails.

#### Scenario: Card containing a button

- **WHEN** the plan contains `Button` (atom) and `Card` (molecule) whose representative holds a raw button
- **THEN** `Button` is built first, and the `Card` main component contains an instance of `Button` instead of the raw button layers

### Requirement: Component properties

The skill SHALL add a TEXT property for each text layer whose content varies between occurrences, a BOOLEAN property for each optional layer, and an INSTANCE_SWAP property for each nested instance that varies, name properties after the anatomy (for example `Label`, `Leading icon`, `Show leading icon`), and take default values from the representative. Properties SHALL be defined on the component set after its variants are combined, or on the component when it has no variants, and SHALL be linked to the matching layer in every variant. Because layers inside a nested instance cannot reference the outer component's properties, nested instances of smaller components SHALL be marked as exposed instances so that their own properties can be edited from the outer instance.

#### Scenario: Button with optional icon

- **WHEN** some button occurrences have a leading icon and others do not, and their labels differ
- **THEN** the `Button` component set defines a TEXT property `Label`, a BOOLEAN property `Show leading icon` linked to the icon layer's visibility, and an INSTANCE_SWAP property `Leading icon`, each linked in every variant

#### Scenario: Card containing a button

- **WHEN** the `Card` main component contains an instance of `Button`
- **THEN** that `Button` instance is an exposed instance, and `Card` defines no property for the button's label

### Requirement: Variants in a component set

For a component with variants, the skill SHALL build one component per variant from that variant's own representative, name each as `Property=Value` pairs separated by commas (for example `Style=Outlined, State=Disabled`), and combine them into one component set named after the component. Because combining leaves the variants stacked at the same position, the skill SHALL arrange them explicitly: `State` values as columns, the combinations of the remaining properties as rows, 20 px gaps, 40 px padding, and the default variant at the top-left, then resize the set to fit. A component set SHALL hold at most 30 variant combinations; beyond that the skill SHALL split it by one property into several sets. Differences in icons SHALL NOT become variants; they use INSTANCE_SWAP properties.

#### Scenario: Button styles and states

- **WHEN** the plan has `Button` variants `Style` = Filled, Outlined and `State` = Enabled, Disabled
- **THEN** the component set `Button` holds four variants in two rows (Filled, Outlined) and two columns (Enabled, Disabled), 20 px apart inside 40 px padding, with `Style=Filled, State=Enabled` at the top-left and no overlaps

### Requirement: Naming and placement

Component names SHALL be Title Case, taken from the recognized pattern (`Button`, `List Item`, `Text Field`) or from a meaningful designer layer name (`Product Card`). When two components would share a name, the skill SHALL add a descriptive word from their layer names or ask the user. Variant property names SHALL be `Style`, `Size`, and `State`, with Title Case values. Each component or component set SHALL sit in its own Section named after it on the Components page, placed without overlapping existing content and ordered atoms, then molecules, then organisms. Every build script SHALL return the IDs of the created components, component sets, and sections.

#### Scenario: Two different cards

- **WHEN** the plan has two card components with different structures, whose layers are named "Product" and "Promo"
- **THEN** they are named `Product Card` and `Promo Card`
