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

If `.env.local` contains Figma values:

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

- component
- co-located story
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
