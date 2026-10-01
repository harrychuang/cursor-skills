## Purpose

Replace the original raw layers with instances of the new components while keeping placement, size, content, and appearance, prove the result, and keep the original whenever a replacement cannot be proven equivalent.

## ADDED Requirements

### Requirement: Replacement is a confirmed Tier 3 change

Replacing original layers SHALL be handled as a Tier 3 change. Before replacing, the skill SHALL show the number of occurrences per component, the baseline screenshots, and the link to the components on the Components page, and SHALL wait for explicit confirmation. No blanket auto-apply instruction SHALL waive this confirmation.

#### Scenario: User said auto-apply earlier

- **WHEN** the user said "apply everything automatically" at the start and the build has finished
- **THEN** the skill still asks for confirmation before replacing any original layer

### Requirement: Outermost occurrences first

The skill SHALL replace the outermost occurrences first. Occurrences nested inside an occurrence that is being replaced SHALL be reproduced through the outer instance's overrides and SHALL NOT be replaced separately.

#### Scenario: Card holding a button

- **WHEN** a raw card containing a raw button is replaced by a `Card` instance
- **THEN** the button is not replaced separately; the `Card` instance's nested `Button` instance carries the original button's label

### Requirement: Placement is preserved

Before inserting an instance, the skill SHALL record the original's parent, index, `relativeTransform`, size, constraints, `layoutPositioning`, `layoutSizingHorizontal`, `layoutSizingVertical`, `layoutGrow`, `layoutAlign`, grid position, visibility, name, and absolute bounds, and SHALL hide the original so that the new instance does not push auto-layout siblings. The instance SHALL be inserted into the original's parent at the original's index; `layoutPositioning` SHALL be set before the position, the position and rotation SHALL be copied through `relativeTransform`, the instance SHALL be resized to the original size before its sizing modes are set (because resizing resets sizing to fixed), hug sizing SHALL be used only when the main component uses auto layout, fill sizing only inside auto-layout parents, and grid parents SHALL receive the original grid position.

#### Scenario: Button inside an auto-layout row

- **WHEN** the original button is the second child of a horizontal auto-layout frame and fills the container width
- **THEN** the instance is the second child of the same frame with horizontal sizing set to fill

### Requirement: Content is carried over

Each instance SHALL receive the original's text content (through TEXT properties or direct overrides), image fills (reusing the original image hash, since new images cannot be created through `use_figma`), nested instance choices (through INSTANCE_SWAP properties), optional layer visibility (through BOOLEAN properties), and variant values; content inside exposed nested instances SHALL be set through the nested instance's own properties. After setting properties, the skill SHALL read them back, because an unknown property key is ignored without an error. The instance SHALL keep the original layer name when that name is meaningful, and SHALL use the component name when the original name is an automatic name such as `Frame 12`, `Group 5`, or `Rectangle 3`.

#### Scenario: Button with a custom name

- **WHEN** the original layer is named "Submit button" with the label "Send"
- **THEN** the instance is named "Submit button" and its `Label` property is "Send"

### Requirement: Per-occurrence verification with fallback

After placing an instance and before removing the hidden original, the skill SHALL compare the instance with the original's recorded state: absolute bounds within 0.5 px, visible text content, the number of visible child layers that draw something, and the style of each of those layers (paints in Workflow F's normal form, layer opacity, stroke weight, radius, effects, font, font size, padding, and gap). When they match, the original SHALL be removed. When they do not match, or when a property read-back differs from the intended value, the skill SHALL delete the new instance, make the original visible again, keep it otherwise unchanged, and report the occurrence with the difference. Differences explained by merges the user approved in Workflow F SHALL count as matches: a style difference counts only when its values lie within Workflow F's near-value thresholds and match a merged group, and a bounds difference counts only when such a merge in the same occurrence explains it and it lies within 1 px or 5% of the original size. Text, layer-count, and read-back differences SHALL never count as matches. When the user explicitly accepts the listed style or size differences of a kept occurrence, the skill MAY replace it again with those differences reported as approved.

#### Scenario: Width mismatch

- **WHEN** an instance is 2 px wider than the original because the original had hidden overflow
- **THEN** the instance is deleted, the original stays, and the report lists the node ID with "width 120 → 122"

##### Example: Verification outcomes

| Comparison | Result |
| --- | --- |
| Bounds equal, text equal, children equal | Original removed |
| Bounds differ by 0.3 px | Original removed (within 0.5 px) |
| Bounds differ by 2 px | Instance deleted, original kept, reported |
| Text "Send" became "Save" | Instance deleted, original kept, reported |
| Padding changed by an approved merge | Original removed, change listed as approved |
| Fill color differs and was not merged | Instance deleted, original kept, reported |

### Requirement: Occurrences that are kept

The skill SHALL keep and report, without attempting replacement: occurrences inside instances, locked layers (unless the user allows unlocking them), text layers whose fonts cannot be loaded or whose node reports missing fonts (including custom fonts that `use_figma` does not support), and text layers with several styled ranges that differ from the main component's text.

#### Scenario: Missing font

- **WHEN** an occurrence's text uses a font that is not available
- **THEN** that occurrence is kept as is and the report names the node and the missing font

### Requirement: Final verification and report

After all replacements, the skill SHALL capture a screenshot of every scope root, compare it with the baseline, and report any unexpected difference instead of correcting it silently. The final report SHALL list the created components with IDs, variants, and properties, the replaced and kept occurrences with reasons, the token results from Workflow F, the restore point name, and the link to the Components page, and the skill SHALL delete any temporary review boards.

#### Scenario: Clean run

- **WHEN** 11 of 12 occurrences were replaced and 1 was kept because of a missing font
- **THEN** the report shows 11 replaced, 1 kept with its reason, the restore point, and the Components page link

### Requirement: Chunked and traceable writes

Replacement SHALL run at most 50 replacements per `use_figma` call and one page per call, SHALL re-fetch every node by ID inside each call, and SHALL return only the ID map of created instances, removed originals, and kept occurrences, within 18,000 characters of JSON. After a failed call, the skill SHALL re-read the ledger entries and the affected nodes before retrying only the occurrences that were not completed.

#### Scenario: Large page

- **WHEN** a page has 130 occurrences to replace
- **THEN** the skill runs three calls of at most 50 replacements each and reports the combined result
