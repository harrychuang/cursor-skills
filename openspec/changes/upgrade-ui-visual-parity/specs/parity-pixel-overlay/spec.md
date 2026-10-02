## Purpose

Compare the two rendered pictures directly, so that whatever the specs cannot express is still caught: report where the pictures differ, which element each difference falls on, and whether the measured properties already explain it.

## ADDED Requirements

### Requirement: Captures are compared at a common density

The overlay SHALL compare the two images at the lower of their two pixel densities, averaging the sharper image down by a whole factor, and SHALL report every position and size in CSS pixels.

#### Scenario: Reference at 2x, implementation at 1x

- **WHEN** the reference image was captured at density 2 and the implementation at density 1
- **THEN** the reference is averaged down by 2 before comparison and regions are reported in CSS pixels

### Requirement: Differences are grouped into regions with owners

Differing pixels SHALL be grouped into regions, a region being a connected set of 8 CSS pixel grid cells that contain differing pixels. Each region SHALL report its bounding box, its differing pixel count, and its owner: the smallest painting primitive of the implementation spec whose box, extended by its shadow, contains the whole region; when none does, the smallest that contains the region's centre; when none does, the nearest primitive. Regions with fewer differing pixels than twice the squared density SHALL be counted as specks and SHALL NOT be listed.

#### Scenario: Wrong fill on a button

- **WHEN** the primary button's fill differs
- **THEN** the overlay reports one region whose owner is the primary button

### Requirement: Edge blending is tolerated and real differences are not

Pixels SHALL be compared by perceptual colour distance. With a tolerance of 1, a differing pixel SHALL be excused when, in each image, its colour lies within the range of colours found in the 3 by 3 neighbourhood of the same position in the other image. The colour threshold SHALL be 0.02 when both images come from the same renderer and 0.05 when they come from different renderers. The verdict SHALL use a tolerance of 1 by default.

#### Scenario: Two ways to draw the same round end

- **WHEN** a pill's outline is drawn as a border in one image and as an inset ring shadow in the other
- **THEN** the overlay reports no regions

#### Scenario: Identical page through another renderer's anti-aliasing

- **WHEN** an identical page is captured with text anti-aliasing switched to the other mode
- **THEN** the overlay with tolerance 1 reports at most 1 region, where the exact comparison reports 22

##### Example: what tolerance keeps and loses

| Case | Exact comparison | Tolerance 1 |
| --- | --- | --- |
| Wallet benchmark, 37 seeded differences flagged | 36 | 35 |
| Settings benchmark, 35 seeded differences flagged | 32 | 31 |
| Nine equivalent rewrites flagged | 2 | 0 |
| Identical pages flagged | 0 | 0 |

### Requirement: Each region is classified as explained or unexplained

Given the diff result, the overlay step SHALL mark a region as explained when it overlaps an element that has a finding to fix, a consequence, or an untrusted finding, a primitive that is not where the reference has it, or the place such a primitive occupies in the reference. A region that overlaps none of those and does overlap an element whose finding is to be left alone (an adaptation or a satisfied accessibility remap) SHALL be marked sanctioned: it SHALL be listed and counted, and SHALL NOT prevent parity. Every other region SHALL be marked unexplained.

#### Scenario: Detail the specs cannot express

- **WHEN** two captures differ inside an image and no measured property differs
- **THEN** the region is marked unexplained and listed for inspection

#### Scenario: Recorded accessibility remap

- **WHEN** the only difference is a text colour that a recorded remap sanctions, and the overlay reports a region on that text
- **THEN** the region is marked sanctioned and the verdict is parity

#### Scenario: Text that moved

- **WHEN** a right-aligned value is built left-aligned
- **THEN** the region where the value now sits and the region where the reference has it are both marked explained

### Requirement: Regions come with enlarged comparison crops

For each of the largest regions, up to 12, the overlay SHALL write one image that places the reference, the implementation, and the marked difference side by side, enlarged by a whole factor with hard pixel edges. It SHALL also write a full-size overlay image in which differing pixels and region outlines are marked.

#### Scenario: One pixel detail

- **WHEN** a region is 4 by 4 CSS pixels
- **THEN** its crop shows the three views enlarged so that single pixels are visible squares

### Requirement: Size mismatch is reported and prevents parity

When the two images differ in width or height after density normalisation, the overlay SHALL compare the overlapping area anchored at the top-left corner, SHALL report both sizes, and the result SHALL NOT be a parity verdict.

#### Scenario: Implementation is taller

- **WHEN** the implementation image is 8 CSS pixels taller than the reference
- **THEN** the overlay reports both sizes and the verdict is not parity

### Requirement: Appearance findings carry visibility

Each appearance finding SHALL be marked with whether any differing pixel falls inside its implementation element in this capture (`visible`), whether or not that element paints. A finding that is not visible SHALL remain a finding.

#### Scenario: Hover colour

- **WHEN** only the hover fill of a button differs and the capture shows the default state
- **THEN** the finding is reported with `visible: false`

### Requirement: Dynamic areas can be excluded

The overlay SHALL accept a list of rectangles in CSS pixels to exclude from comparison and SHALL report how many were applied. In a cycle the same rectangles SHALL apply to the spec comparison: a primitive whose centre lies inside one SHALL NOT be paired, compared, or counted on either side.

#### Scenario: Timestamp in the header

- **WHEN** a rectangle covering a live timestamp is passed as an exclusion
- **THEN** differing pixels inside it are not counted and form no region, and the timestamp's differing text is not reported as a finding

### Requirement: Image handling needs no installed packages

The overlay SHALL read 8-bit and 16-bit greyscale, RGB, palette, and RGBA PNG files that are not interlaced, and SHALL write 8-bit RGBA PNG files, using only Node built-in modules. An interlaced or unsupported file SHALL produce an error that says how to re-export it.

#### Scenario: Interlaced export

- **WHEN** the reference image is an interlaced PNG
- **THEN** the overlay exits with an error asking for a non-interlaced export
