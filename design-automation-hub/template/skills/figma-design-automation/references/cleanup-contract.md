# Figma cleanup analysis contract

## Input schema

The input is no larger than 1 MiB and has these exact top-level keys:

`schemaVersion`, `taskType`, `automationTaskId`, `projectId`, `fileKey`, `scope`, `snapshot`, `inputSnapshotHash`.

Scope has exact keys `nodeId`, `type`, and `name`. Snapshot has exact keys `schemaVersion`, `scope`, and `nodes`.

Each node has only:

`id`, `type`, `name`, `parentId`, `index`, `visible`, `locked`, `childIds`, `absoluteBounds`.

`absoluteBounds` has finite numeric `x`, `y`, `width`, and `height`. Child order is meaningful. Every non-root node's parent and every child reference stay inside the declared scope. Only the scope root may name an external parent.

Canonical hashing serializes normalized allowlisted keys in contract order and traverses nodes from the scope root in declared child order. Viewport, selection order, timestamps, comments, plugin data, and credentials are absent and therefore never affect the hash.

## Result schema

Plan-ready exact keys:

`schemaVersion`, `taskType`, `status`, `automationTaskId`, `inputSnapshotHash`, `agentAutomationRunId`, `summary`, `operations`.

Blocked exact keys add `failure`, whose exact keys are `code` and `message`.

Forbidden fields include snapshots, access tokens, authorization data, credential values, prompts, model output, environment data, expanded commands, database paths, and generic summaries.

## Evidence

Renames must cite actual hierarchy or sibling naming evidence and preserve the exact `beforeName`. A generic name such as `Frame 17` is not evidence for a product-semantic name such as `Premium Portfolio Card`.

Reorder and move operations must cite a structural inconsistency in the supplied tree. Indices, parent ids, and absolute bounds are exact preconditions for the later Plugin preflight.

One invalid operation invalidates the whole candidate. Never return a partial valid subset.

## Stable blocked codes

- `cleanup-scope-too-large`
- `invalid-cleanup-snapshot`
- `unsafe-cleanup-input-path`
- `unsafe-cleanup-result-path`
- `missing-agent-automation-identity`
- `invalid-cleanup-operation`
- `unsupported-cleanup-inference`
- `cleanup-result-identity-mismatch`
