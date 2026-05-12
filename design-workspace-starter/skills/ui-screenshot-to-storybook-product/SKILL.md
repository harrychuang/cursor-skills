---
name: ui-screenshot-to-storybook-product
description: Turn screenshots or Figma exports into token-backed Storybook components and composed product screens.
---

# UI Screenshot -> Storybook -> Product

Use this workflow when the workspace is driven by screenshots in `reference/`, or by Figma when `.env.local` is configured.

## Inputs

- One or more screenshots in `reference/`
- Optional Figma configuration in `.env.local`
- Product requirements in `product/`

## Figma-first mode

If `.env.local` contains `FIGMA_FILE_URL` and `FIGMA_NODE_ID` but has neither `FIGMA_PAT` nor `FIGMA_AUTH_MODE=connector`, stop and ask the user to set `FIGMA_PAT` in `.env.local`, or set `FIGMA_AUTH_MODE=connector` when the tool already has authenticated Figma MCP/connector access, before continuing with Figma-first automation.

If `.env.local` contains the Figma URL and node plus either `FIGMA_PAT` or `FIGMA_AUTH_MODE=connector`:

1. Read Figma design context.
2. Read Figma variables.
3. Build a component inventory from the selected node.
4. Treat Figma as the source of truth.
5. Use `reference/` screenshots only as secondary visual validation.

## Phase A: design-system analysis

Before code, produce:

- An evidence log covering recurring signals in:
  - color proportion and saturation placement
  - spacing feel and density
  - corner/radius treatment
  - typography weight and hierarchy
- A set of 5-7 design principles with:
  - source evidence
  - interpretation
  - design rule
  - token impact
- A design-elements definition that includes:
  - color system: recommended primary, secondary, and background/surface Hex values with rationale
  - typography: 1-2 open-source font recommendations, preferably Google Fonts, with rationale
  - shape and corner: default border-radius strategy and visual tone
  - spacing and layout: base grid recommendation such as 4px or 8px, plus overall density mode
- A note on what is `observed`, what is `inferred`, and what is an intentional exception

If references disagree, identify the dominant pattern and document the exceptions instead of averaging everything together.

Use this exact response structure for Phase A:

### 1. Signal Summary

| Dimension | Observed pattern | Confidence | Notes |
| --- | --- | --- | --- |
| Color proportion |  | high / medium / low |  |
| Spacing feel |  | high / medium / low |  |
| Corner size |  | high / medium / low |  |
| Typography weight |  | high / medium / low |  |
| Hierarchy contrast |  | high / medium / low |  |

### 2. Design Principles

| Principle | Source evidence | Interpretation | Design rule | Token impact |
| --- | --- | --- | --- | --- |
| 1 |  |  |  |  |
| 2 |  |  |  |  |
| 3 |  |  |  |  |
| 4 |  |  |  |  |
| 5 |  |  |  |  |

Add rows 6-7 only when justified by real repeated patterns.

### 3. Design Elements

| Element | Recommendation | Why it fits the principles | Token direction |
| --- | --- | --- | --- |
| Primary color | `#` |  | `--sys-color-*` |
| Secondary color | `#` |  | `--sys-color-*` |
| Background/surface color | `#` |  | `--sys-color-*` |
| Typography family |  |  | `--sys-font-*` |
| Typography weight strategy |  |  | `--sys-font-weight-*` |
| Corner strategy |  |  | `--sys-radius-*` |
| Base spacing grid |  |  | `--sys-space-*` |
| Layout density |  |  | spacing and layout tokens |

### 4. Observed vs Inferred

| Item | Type | Detail | Reason |
| --- | --- | --- | --- |
| 1 | observed / inferred / exception |  |  |
| 2 | observed / inferred / exception |  |  |
| 3 | observed / inferred / exception |  |  |

Do not write code yet.

## Phase B: visual inventory

After the design-system analysis, produce:

| Block | Purpose | Visual cues | Candidate component owner | Token roles |

Do not write code yet.

## Phase C: reuse and architecture

For each block:

- search existing shared UI
- decide reuse, extend, or create new
- list expected stories and states

Output:

| Component | Responsibility | Screens | Decision |

## Phase D: Storybook-first implementation

Create or update shared UI before screen files:

- install or upgrade to the latest stable Storybook 10 when Storybook is not ready yet
- component
- co-located story
- Autodocs-enabled story metadata
- component descriptions in Storybook docs output
- prop documentation through `argTypes` plus expanded controls
- representative states and variants
- maintain `design/foundations/*.md` as the written source for principles, specs, and token usage
- foundations pages when token work changes, using a designed bento-style layout instead of raw token dumps

## Phase E: screen composition

Assemble screens from documented exports only.

## Phase F: parity check

Run the compare workflow before calling the screen done.

## Constraints

- No token bypass.
- No skipping the design-system analysis when the source is new or materially changed.
- No one-off page styling when a shared owner exists.
- No final screen implementation before reusable story coverage.
- No reusable component story without Autodocs and a component description.
- No reusable component story without documented consumer-facing props in `argTypes`.
- No token-system change without updating the related foundation guide or foundations page.
