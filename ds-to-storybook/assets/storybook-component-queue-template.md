# Storybook Component Queue

## Context

- Design-system package:
- Product repo:
- Framework:
- Storybook/catalog:
- Figma export addon:
- Package manager:
- Token import strategy:
- Current batch:
- Pass budget:
- Stop condition:

## Status Values

- `queued`: ready for a future batch
- `in-progress`: selected for the current batch
- `done`: implemented, documented, and verified
- `blocked`: cannot continue without a decision or missing source
- `deferred`: intentionally postponed
- `needs-extraction`: missing design-system evidence or component spec
- `needs-token`: missing token at the required layer
- `needs-api-decision`: shared component API needs a product decision
- `needs-existing-component-review`: similar product component needs review first
- `needs-addon-compatibility`: Storybook, React, or addon setup requirement is missing
- `source-trace-missing`: component spec is present but original design/source trace is absent or incomplete
- `out-of-scope`: not part of this Storybook rollout

## Doc-Driven Pass Checklist

- [ ] Read `design-system/SESSION_STATE.md`
- [ ] Read `design-system/COMPONENT_INVENTORY.md`
- [ ] Read relevant `design-system/components/*.md`
- [ ] Read touched token files under `tokens/`
- [ ] Resolve evidence IDs through `design-system/DESIGN_EVIDENCE_MAP.md`
- [ ] Resolve source trace for selected components
- [ ] Inspect matching existing product components/stories
- [ ] Update this queue before code edits
- [ ] Verify current batch
- [ ] Update queue and stop at checkpoint

## Component Queue

| Batch | Component | Category | Source spec | Evidence IDs | Source trace | Dependencies | Product target | Story target | Decision | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| `B01` |  |  |  |  |  |  |  |  |  | queued |

## Batch Plan

| Batch | Components | Source trace status | Shared dependencies | Validation | Exit criteria | Stop condition | Status |
|---|---|---|---|---|---|---|---|
| `B01` |  |  |  |  |  | update queue and stop | queued |

## Source Trace Log

| Component | Evidence IDs | Figma nodes / screenshots | Rendered routes | Prototype or source files | Existing product candidates | Status | Notes |
|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |

## Decisions

| Date | Item | Decision | Reason | Follow-up |
|---|---|---|---|---|
|  |  |  |  |  |

## Figma Export Addon

| Requirement | Detected value | Status | Notes |
|---|---|---|---|
| Storybook `^10` |  |  |  |
| React |  |  |  |
| `@storybook/icons` |  |  |  |
| Addon package |  |  |  |
| `.storybook/main.*` registration |  |  |  |
| `.storybook/preview.*` decorator/globals |  |  |  |
| Token prefix/options |  |  |  |

## Verification Log

| Batch | Command or check | Result | Notes |
|---|---|---|---|
|  |  |  |  |
