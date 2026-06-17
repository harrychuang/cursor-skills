# PRD Workshop

Use this reference when the product idea is not yet concrete enough to implement.

## Discussion Sequence

Ask one focused question at a time. Stop asking when the route model, data contract, and acceptance criteria are clear enough to implement.

1. What product problem does this prototype need to validate?
2. Who is the primary user and what context are they in?
3. What is the entry route and first visible state?
4. What are the core journeys that must be clickable?
5. What success, error, loading, empty, disabled, or permission states matter?
6. Which existing components or design-system patterns should be reused?
7. Which external systems must remain mocked?
8. What must be true in Storybook for reviewers to approve the prototype?

## PRD Structure

Use these sections:

```markdown
# <Feature Title> Prototype PRD

## Product Summary

## Problem

## Users

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
- Name dependencies as components, tokens, services, or mocked external systems.
