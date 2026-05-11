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

## Phase A: visual inventory

Before code, produce:

| Block | Purpose | Visual cues | Candidate component owner | Token roles |

Do not write code yet.

## Phase B: reuse and architecture

For each block:

- search existing shared UI
- decide reuse, extend, or create new
- list expected stories and states

Output:

| Component | Responsibility | Screens | Decision |

## Phase C: Storybook-first implementation

Create or update shared UI before screen files:

- install or upgrade to the latest stable Storybook 10 when Storybook is not ready yet
- component
- co-located story
- Autodocs-enabled story metadata
- component descriptions in Storybook docs output
- representative states and variants
- foundations pages when token work changes

## Phase D: screen composition

Assemble screens from documented exports only.

## Phase E: parity check

Run the compare workflow before calling the screen done.

## Constraints

- No token bypass.
- No one-off page styling when a shared owner exists.
- No final screen implementation before reusable story coverage.
- No reusable component story without Autodocs and a component description.
