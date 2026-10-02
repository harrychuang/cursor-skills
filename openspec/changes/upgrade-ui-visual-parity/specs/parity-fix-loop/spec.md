## Purpose

Define how the skill drives an implementation to visual parity: one command per measurement cycle, a mechanical verdict, the order in which differences are fixed, when the loop stops, and what is reported at the end.

## ADDED Requirements

### Requirement: One command measures a cycle

The skill SHALL provide one command that, given the reference spec, the optional reference image, and the implementation's URL or file with its root selector, captures the implementation, runs the diff and the pixel overlay, and writes the implementation spec, the implementation screenshot, the result file, the overlay image, and the region crops into the output folder. Unless told otherwise it SHALL capture the implementation the way the reference was captured: at the reference's viewport, at the density of the reference image (read from the image's width, or else the reference spec's density), in the reference's colour scheme, and in the states the reference records. It SHALL print, in this order: the verdict, the appearance, geometry, and pixel scores, what was left out of the comparison (nodes dropped by the policy, areas excluded on request), the causes to fix with their explanations and tokens, the consequences, the unexplained regions, and the regions that lie on leave-alone differences.

#### Scenario: Reference captured at density 1

- **WHEN** the reference image is 390 pixels wide for a 390 pixel wide surface and no density is given
- **THEN** the implementation is captured at density 1 and identical pages report no region

#### Scenario: Re-measuring after a fix

- **WHEN** the agent runs the cycle command again after editing the implementation
- **THEN** a new output folder holds a fresh capture and result, and the printed scores reflect the edit without any hand-written spec

### Requirement: Parity verdict and exit code

The cycle command SHALL declare parity and exit with code 0 only when there is no cause to fix, every reference primitive is paired, every paired primitive is where the reference has it, the two images have the same size, and the overlay reports no region other than regions that lie only on leave-alone differences. It SHALL exit with code 1 when the surfaces were compared and are not at parity, and with code 2 on a usage error, a missing browser, a page that cannot be loaded, or a root selector that matches nothing. Without a reference image the verdict SHALL cover appearance and geometry only and SHALL say that pixels were not checked.

#### Scenario: Identical surfaces

- **WHEN** the implementation is pixel-identical to the reference
- **THEN** the command prints the parity verdict and exits with code 0

#### Scenario: One hairline has the wrong colour

- **WHEN** a single border colour differs
- **THEN** the command lists that cause and exits with code 1

##### Example: benchmark verdicts

| Variant | Verdict | Exit code |
| --- | --- | --- |
| Wallet control with a different element tree | parity | 0 |
| Settings control | parity | 0 |
| Each of the 9 equivalent rewrites | parity | 0 |
| Each of the 72 seeded differences | not at parity | 1 |

### Requirement: Fixes follow cause order and ownership layers

In each cycle the agent SHALL fix only findings marked as causes, in ownership order: token or theme, shared component, composition, then page-only. It SHALL NOT edit code to remove a consequence. It SHALL re-run the cycle command after each layer's fixes before starting the next layer.

#### Scenario: Padding cause with size consequences

- **WHEN** a cycle reports one padding cause and four size consequences
- **THEN** the agent fixes the padding, re-measures, and edits nothing for the four consequences

### Requirement: Unexplained regions are inspected

For every unexplained region the agent SHALL open the region's comparison crop, state what differs in it, trace the owning declaration, and either fix it or record why it stays. An unexplained region SHALL NOT be dismissed without a recorded reason.

#### Scenario: Region inside an illustration

- **WHEN** the result lists an unexplained region on an image
- **THEN** the agent views the crop, names the difference (for example a different asset), and fixes or records it

### Requirement: Loop stops on lack of progress

The loop SHALL continue while the number of causes plus unexplained regions decreases from one cycle to the next. It SHALL stop when that number does not decrease and SHALL report the remaining items with what blocks them. When a cycle lowers a score or introduces a finding that the previous cycle did not have, the agent SHALL revert the edit that caused it before continuing. The loop SHALL NOT exceed 8 cycles; the cycle command SHALL count cycles through the previous result it is given and SHALL print a warning once the cap is passed.

#### Scenario: A fix makes something else worse

- **WHEN** a cycle's geometry score is lower than the previous cycle's
- **THEN** the agent reverts the last edit and treats the finding it addressed as blocked or tries a different owner

#### Scenario: Steady progress

- **WHEN** causes plus unexplained regions go 14, 6, 2, 0 over four cycles
- **THEN** the loop ends after the fourth cycle with the parity verdict

### Requirement: Every remaining item is adjudicated

When the loop ends without parity, each remaining cause and unexplained region SHALL be given exactly one status with a reason: adaptation, sanctioned accessibility remap, untrusted because of the font environment, blocked by a missing token or a design-system decision, or accepted by the user.

#### Scenario: Missing token

- **WHEN** the reference calls for a spacing value that has no token and the value recurs
- **THEN** the finding stays open as blocked with the proposed token, and no raw value is inlined

### Requirement: Reference is captured once per state and breakpoint

The reference SHALL be captured once for each state, theme, and breakpoint to be verified, at the same viewport width, density, theme, and content as the implementation capture, and each SHALL be verified with its own cycle. When the implementation shows content that differs from the reference content, the agent SHALL load matching content or exclude those areas before measuring. An excluded area SHALL take no part in any of the three checks, and the cycle SHALL state how many areas were excluded.

#### Scenario: Design defines a mobile and a desktop frame

- **WHEN** the reference has a 390 wide frame and a 1440 wide frame
- **THEN** the agent captures and verifies two references, each against the implementation at the matching viewport

### Requirement: Untrusted and sanctioned differences are never fixed

The agent SHALL NOT change a token, a font size, a line height, or a size because of a finding marked untrusted, SHALL NOT change an accessible value back to its authored reference value, and SHALL NOT remove a platform adaptation.

#### Scenario: Fallback font in the capture

- **WHEN** the cycle warns that the font environment is mismatched and reports text widths 30 percent wider
- **THEN** the agent aligns the fonts and re-measures before changing any type value

### Requirement: Final report states measured results

The final report SHALL state the last cycle's verdict and three scores, the number of cycles run, what was fixed grouped by ownership layer, every remaining item with its status and reason, and which checks did not run.

#### Scenario: Pixels were not checked

- **WHEN** no reference image was available
- **THEN** the report says that the picture was not compared and that parity is claimed for appearance and geometry only

### Requirement: Estimated path remains for unmeasurable sides

When a side offers nothing to measure, such as an image-only reference with no design file or a surface that cannot be rendered, the skill SHALL still run the pixel overlay when two images exist, SHALL compare what can be read by the condensed method, SHALL mark the result as estimated, and SHALL NOT apply fixes under 2 pixels from estimated values.

#### Scenario: Screenshot-only reference

- **WHEN** the reference is a PNG export and no design file is available
- **THEN** the cycle runs the overlay against the implementation capture, the regions drive the investigation, and the report marks the comparison as estimated
