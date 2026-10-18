---
name: figma-design-automation
description: Analyze exactly one task-scoped Figma cleanup snapshot and produce one bounded, evidence-based, allowlisted cleanup result without modifying the Figma document, repository, automation configuration, database, or generic run state.
---

# Figma Design Automation

Use this companion only for generic project task `figma-cleanup`. The generic `agent-automation` runtime owns runner selection, priority, fallback, process timeout, run summaries, project verification, and status. This skill owns only Figma snapshot validation and cleanup-result rules.

## Analyze one invocation

The request must name exactly one project-relative `input.json` and one different project-relative `result.json` below the same `.design-automation/runtime/<automation-task-id>/` directory.

Before analysis:

1. require non-empty `AGENT_AUTOMATION_RUN_ID`, `AGENT_AUTOMATION_TASK_ID`, and `AGENT_AUTOMATION_RUNNER_ID`;
2. require `AGENT_AUTOMATION_TASK_ID=figma-cleanup`;
3. resolve the project, runtime directory, input, and result after symlinks and reject absolute paths, traversal, shared paths, cross-task paths, or an existing non-matching result;
4. read only the named input, never another task directory;
5. reject input above 1 MiB and snapshots above 500 nodes without truncating.

Read [cleanup-contract.md](references/cleanup-contract.md) before producing a result.

## Input

Schema version `1` contains exactly:

- `taskType: "figma-cleanup"`;
- `automationTaskId`, `projectId`, and `fileKey`;
- one `scope` whose type is `SECTION`, `FRAME`, `COMPONENT`, or `COMPONENT_SET`;
- one allowlisted, scope-contained `snapshot`;
- `inputSnapshotHash`, computed from canonical allowlisted snapshot data.

Do not infer missing fields, expand the scope, read comments or plugin data, or use Figma credentials.

## Result

Write exactly one schema-versioned JSON object to the designated result path. Bind it to the input's automation task id and snapshot hash and to `AGENT_AUTOMATION_RUN_ID`.

A plan-ready result contains:

- `status: "plan-ready"`;
- a concise, non-empty Traditional Chinese summary;
- at most 100 unique, evidence-backed operations.

A blocked result contains:

- `status: "blocked"`;
- the same task, snapshot, and run identities;
- a safe stable `failure.code` and message;
- `operations: []`.

Use the bundled atomic writer when practical:

```bash
node .agents/skills/figma-design-automation/scripts/write-cleanup-result.mjs \
  --project-root <absolute-project-root> \
  --input <project-relative-input.json> \
  --result <project-relative-result.json>
```

Pass the complete candidate JSON on standard input. The writer validates containment and identity, then atomically replaces only the designated result.

## Allowlisted operations

- `rename-node`: `operationId`, `nodeId`, `beforeName`, `afterName`, `reason`
- `reorder-node`: `operationId`, `nodeId`, `parentId`, `beforeIndex`, `afterIndex`, `reason`
- `move-node`: `operationId`, `nodeId`, `fromParentId`, `toParentId`, `beforeIndex`, `afterIndex`, `beforeAbsoluteBounds`, `reason`

Every target and container must already exist inside the submitted scope. Before-values must exactly match the snapshot. Reasons must identify hierarchy, sibling, or structural evidence actually present in the snapshot. Do not invent product semantics from generic layer names.

Any unsupported, duplicate, unsafe, out-of-scope, over-limit, or semantically invented operation blocks the complete plan and exposes zero applicable operations.

## Zero-mutation boundary

The designated result is the only permitted write. Do not modify or apply:

- the Figma document, selection, plugin data, components, instances, text, variables, styles, layout, geometry, visibility, or lock state;
- create, delete, clone, detach, cross-file, prototype, or content operations;
- product source, tests, documentation, Git state, project profile, input artifact, Coordinator state, or database;
- `.agent-automation/config.json`, generic summaries, or any skill;
- provider commands, runner configuration, priorities, fallback, or timeouts.

A cleanup result is a proposal for later explicit Plugin confirmation. It is never completion proof and never counts as applied work.

## Completion

Exit zero only after the deterministic project checker can prove:

- one designated result exists for the current generic run;
- task, snapshot, task type, and run identities match;
- the exact result schema contains no secret-bearing or unknown fields;
- every operation is allowlisted, bounded, scope-contained, and evidence-based;
- no protected surface changed.
