# Storybook Component Queue

## Context

- Design-system package: /Users/HarryChuang/.cursor/skills/ds-to-storybook/storybook-template/design-system
- Product repo:
- Framework:
- Storybook/catalog:
- Source trace: /Users/HarryChuang/.cursor/skills/ds-to-storybook/storybook-template/design-system/STORYBOOK_SOURCE_TRACE.md
- Component build plan: /Users/HarryChuang/.cursor/skills/ds-to-storybook/storybook-template/design-system/STORYBOOK_COMPONENT_PLAN.md
- Figma export addon:
- Package manager:
- Token import strategy:
- Target layout: components in `src/components/<ComponentName>/`, pages in `src/pages/<PageName>/`, foundation docs in `stories/` or `src/stories/`
- Typographic components: implement text lockups as editable shared components in `src/components/<ComponentName>/` unless the extraction explicitly requires raster artwork
- Current batch: B01

## Status Values

- `queued`: ready for a future batch
- `in-progress`: selected for the current batch
- `done`: implemented, documented, and verified
- `reused`: existing product component accepted as the implementation
- `blocked`: cannot continue without a decision or missing source
- `deferred`: intentionally postponed
- `needs-extraction`: missing design-system evidence or component spec
- `needs-source`: extractor source evidence exists but the Figma node, image, route, or frontend folder cannot be resolved
- `needs-token`: missing token at the required layer
- `needs-api-decision`: shared component API needs a product decision
- `needs-existing-component-review`: similar product component needs review first
- `needs-addon-compatibility`: Storybook, React, or addon setup requirement is missing
- `out-of-scope`: not part of this Storybook rollout

## Source Trace

| Source ID / location | Type | Resolved file / Figma node / route | Story source URL | Components | Status | Notes |
|---|---|---|---|---|---|---|
| S-01 | - | design-system/components/example-card.md | - | Example Card | resolved | synced from component plan |

## Current Component Checkpoint

| Field | Value |
|---|---|
| Active component |  |
| Queue order / batch |  |
| Dependency status |  |
| Source inspected |  |
| Existing component review |  |
| Token decision |  |
| Product files |  |
| Story files |  |
| Target layout |  |
| Verification |  |
| Blocker / next action |  |

## Dependency Plan

| Order | Component | Category | Depends on | Used by | Core reason | Status | Notes |
|---|---|---|---|---|---|---|---|
| 1 | Example Card | data-display | - | - | no dependencies detected | done | - |

## Component Queue

| Batch | Order | Component | Category | Source spec | Design sources | Story source URL | Depends on | Used by | Product target | Story target | Decision | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B01 | 1 | Example Card | data-display | design-system/components/example-card.md | S-01 | - | - | - | src/components/example-card/ExampleCard.tsx | src/components/example-card/ExampleCard.stories.tsx | - | done |

## Batch Plan

| Batch | Components | Shared dependencies | Design sources | Dependency exit criteria | Validation | Status |
|---|---|---|---|---|---|---|
| B01 | Example Card | - | S-01 | all listed dependencies are done, reused, or accepted blocked decisions | co-located stories, source URLs, verification log | done |

## Decisions

| Date | Item | Decision | Reason | Follow-up |
|---|---|---|---|---|
|  |  |  |  |  |

## Figma Export Addon

| Requirement | Detected value | Status | Notes |
|---|---|---|---|
| Storybook `^10` |  |  |  |
| React |  |  |  |
| Bundled addon asset | `assets/figma-export-addon/` |  |  |
| Product vendor path | `.storybook/vendor/figma-export-addon/` |  |  |
| Project config | `.storybook/figma-export.config.ts` |  |  |
| `@storybook/icons` |  |  |  |
| Addon package |  |  |  |
| `.storybook/main.*` registration |  |  |  |
| `.storybook/preview.*` decorator/globals |  |  |  |
| Review helper / status API |  |  |  |
| Token prefix/options |  |  |  |

## Verification Log

| Batch | Command or check | Result | Notes |
|---|---|---|---|
|  |  |  |  |

