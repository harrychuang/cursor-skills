# PRD Workshop

Use this reference when the product idea is not yet concrete enough to implement.

## Discussion Sequence

Ask one focused question at a time. Stop asking when the route model, data contract, and acceptance criteria are clear enough to implement.

1. What product problem does this prototype need to validate?
2. Who is the primary user and what context are they in?
3. Is the production target web, app, hybrid, or still undecided?
4. What is the entry route and first visible state?
5. What are the core journeys that must be clickable?
6. What success, error, loading, empty, disabled, or permission states matter?
7. After running the discovery pass (`references/component-discovery.md`), present the discovered Component Map candidates and ask only: which candidates are wrong or off-limits, and what did the scan miss?
8. Which external systems must remain mocked in Storybook but described as API/data contracts for the receiving implementation?
9. What must be true in Storybook and in production for reviewers to approve the work?

## PRD Structure

Use these sections:

```markdown
# <Feature Title> Prototype PRD

## Product Summary

## Problem

## Users

## Target Production Surfaces

## Goals

## Non-Goals

## Core Journeys

## AI Implementation Scope

## Dependencies
```

## Writing Rules

- Write observable product behavior, not only implementation tasks.
- Include non-goals when a reviewer might expect real APIs, auth, persistence, or production logic.
- Make core journeys specific enough to map to route transitions.
- Name dependencies as components, tokens, services, platform surfaces, or mocked external systems.
- Discover components by scanning before asking; the user confirms preferences and vetoes, they do not perform discovery. Name dependencies by discovered source (inventory doc, story title, import path), not by guess.
- Mark unknown web/app frontend, API/data, or integration ownership decisions as open instead of inventing implementation details.
