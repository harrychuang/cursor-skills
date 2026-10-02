## Purpose

Define how the skill is packaged so that it runs wherever its folder is copied, how its documents divide the work, and how its detection ability is protected against regression.

## ADDED Requirements

### Requirement: Skill runs standalone

Every script, reference document, and policy file the default workflow needs SHALL live inside the skill's own folder. The workflow SHALL NOT require another skill to be installed. A findings file produced by the pixel alignment report skill SHALL remain an accepted input.

#### Scenario: Folder copied alone

- **WHEN** only the skill's folder is copied into a project
- **THEN** the cycle command runs and every document the skill file links to exists inside that folder

#### Scenario: Existing findings file

- **WHEN** the user passes a findings file from the pixel alignment report skill
- **THEN** the skill uses it as the starting list and verifies the fixes with its own cycle command

### Requirement: Skill name matches its folder

The `name` in the skill file's frontmatter SHALL be `ui-visual-parity`, the name of the skill's folder. Documents in this repository that refer to the skill by name SHALL use that name.

#### Scenario: Skill loaded from its folder

- **WHEN** a tool that requires a skill's name to equal its folder name loads the `ui-visual-parity` folder
- **THEN** the skill is registered as `ui-visual-parity`

#### Scenario: Sibling skill names it

- **WHEN** the design-system-to-Storybook skill tells the agent which skill repairs visual drift
- **THEN** it names `ui-visual-parity`

### Requirement: SKILL.md routes to references

The skill file SHALL state what can be compared, the prerequisites (Node 22 or later and a Chromium-family browser, or a browser tool that can evaluate the extractor), the capture step for each kind of reference, the cycle command, how to read its output, the fix order, the stop rule, and the final report, and SHALL link to one reference document for each detailed topic. It SHALL NOT contain a code block longer than 15 lines.

#### Scenario: Agent reads only the skill file

- **WHEN** an agent reads the skill file
- **THEN** it can run a first cycle and knows which reference document to open for capture details, result reading, owner location, and platform idioms

### Requirement: Reference documents have single responsibilities

The skill SHALL ship these reference documents, each covering one topic: how to capture each kind of surface; the UI Spec format; the parity policy with its classes, tolerances, accessibility remaps, and font rules; the translation between Figma properties and CSS; how to read the cycle's results; how to locate the owning declaration; and how to express a fix on each platform. No topic SHALL be explained in two documents.

#### Scenario: Looking up what an unexplained region means

- **WHEN** an agent needs to know what to do with an unexplained region
- **THEN** exactly one reference document explains it

### Requirement: Figma translation traps are documented

The Figma translation document SHALL state how each of these maps to CSS and how the capture records it: stroke alignment (inside, centre, outside) against borders and rings; line height set to auto; letter spacing in percent; text boxes with fixed width or height and their alignment anchors; hug, fill, and fixed sizing; shadow spread and blur; layer blur and background blur; image scale modes; corner smoothing; and gradients.

#### Scenario: Outside stroke

- **WHEN** a Figma frame has a 2 pixel outside stroke
- **THEN** the document says it is recorded as an outer ring and is reproduced with an outline or an outset ring, not with a border that changes the box size

### Requirement: Owner location starts from the finding

The owner location document SHALL start from the fields a finding carries: the implementation selector, the declared parts on each side of a spacing finding, the differing parts, and the token references, before falling back to renderer inspection and value search.

#### Scenario: Spacing finding names its parts

- **WHEN** a finding says the build's distance is made of a card's top padding of 16 and the design's of 24
- **THEN** the document directs the agent to that element's padding declaration and to the token recorded for it

### Requirement: Platform application guide covers detail properties

The platform application document SHALL give the idiom on each supported platform for gradients, per-side borders, rings and outlines, text truncation and line clamping, text decoration and transform, letter spacing and line height, icon size and stroke width, image fit, and decorations drawn by pseudo-elements, in addition to the properties it already covers.

#### Scenario: Truncation finding on a native target

- **WHEN** a finding says a subtitle wraps where the reference truncates it
- **THEN** the document gives the truncation idiom for the target platform

### Requirement: Benchmark guards detection

The skill SHALL ship two benchmark pages with their seeded differences and equivalent rewrites, each seeded difference declaring the cause it is expected to produce. The benchmark command SHALL generate one variant per item, run the cycle on each, and exit with a non-zero code when a control is not at parity, when a seeded difference does not produce its expected cause, or when an equivalent rewrite is not at parity.

#### Scenario: A change to the diff hides a class of difference

- **WHEN** an edit to the diff script stops reporting border colour differences
- **THEN** the benchmark command exits with a non-zero code and names the seeded differences that lost their cause

##### Example: required results

| Benchmark | Seeded differences with their expected cause | Equivalent rewrites at parity | Control at parity |
| --- | --- | --- | --- |
| Wallet (mobile, 390 wide) | 37 of 37 | 5 of 5 | yes, with a different element tree |
| Settings (desktop, 1280 wide) | 35 of 35 | 4 of 4 | yes |

### Requirement: Unit tests cover normalization and classification

The skill SHALL ship unit tests, runnable with the Node test runner and no installed packages, for colour equality, stroke equivalence, differing-part explanations, PNG read and write round trips, edge tolerance, Figma page assembly with a missing page, accessibility remaps in both directions, touch targets, font environment mismatch, and cross form factor classification.

#### Scenario: Round trip of an image

- **WHEN** an RGBA image is written as PNG and read back
- **THEN** every pixel is unchanged

### Requirement: README describes the upgraded skill

The repository README SHALL describe the skill's references (design file, screenshot, or another platform's code), its three checks, its prerequisites, and that it runs from its own folder.

#### Scenario: Reader checks the prerequisites

- **WHEN** a reader opens the README section for the skill
- **THEN** it names the Node version and the browser requirement and shows the cycle command
