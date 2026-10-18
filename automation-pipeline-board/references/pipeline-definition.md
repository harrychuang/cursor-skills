# Pipeline definition

The definition is a project-relative sidecar file, by default
`.pipeline-board/pipeline.json`. Only this skill reads it. No runner, no
orchestrator, and no installer consults it, so deleting it changes nothing
about how automation executes.

It is deliberately not part of `.agent-automation/config.json`. That schema has
a closed field set that rejects unknown fields, and its version is pinned with
migrations refused. Ordering therefore lives outside it, permanently.

## Shape

```json
{
  "schemaVersion": 1,
  "sources": [],
  "stages": []
}
```

`schemaVersion` MUST be exactly `1`. Any other value is rejected.

Every path in this file is project-relative and MUST resolve inside the project
root after symbolic link resolution. Absolute paths, parent-directory escapes,
and symlink escapes are rejected before any output is produced.

## `sources[]`

Candidate entry points. The board renders only those whose evidence exists, so
one definition serves projects that start from very different material.

| Field | Required | Contract |
| --- | --- | --- |
| `id` | yes | Stable kebab-case identifier, unique within the file. |
| `title` | yes | Designer-readable name. Plain language, no tool jargon. |
| `evidence` | yes | Non-empty array of project-relative paths. The source is present when at least one exists. |

When no source has evidence, the board states that no source is present yet and
lists every `title` as an accepted kind. It does not treat any single design
tool as required.

**Never cite a stage's own output as source evidence.** An extraction result is
proof that a stage ran, not proof that raw material was supplied. Citing it
tells a designer they have material they never provided. Source evidence should
name things a human puts into the project: an export directory, a screenshot
folder, application source. If a path appears in some stage's `produces`, it
does not belong in any source's `evidence`.

## `stages[]`

Ordered pipeline steps.

| Field | Required | Contract |
| --- | --- | --- |
| `id` | yes | Stable kebab-case identifier, unique within the file. |
| `title` | yes | Designer-readable name. |
| `taskId` | no | Matching task id in `.agent-automation/config.json`, used to locate run summaries and to count configured verification commands. |
| `produces` | yes | Project-relative paths this stage is expected to create. May be empty. |
| `audit` | no | Command object run to decide whether the stage is *verified*, not merely produced. |
| `pendingDecisions` | no | Command object emitting machine-readable review data, plus the field holding the unresolved count. |
| `handoffs` | no | Outgoing edges to later stages. |

A command object is `{ "command": string, "args": string[] }`. It is shell-free:
no pipes, redirects, substitutions, or `&&`.

### `handoffs[]`

| Field | Required | Contract |
| --- | --- | --- |
| `to` | yes | `id` of a stage declared later in `stages[]`. |
| `artifact` | yes | Project-relative path handed to the downstream stage. |
| `enforcedBy` | yes | Repository-relative path of the downstream script that refuses to proceed without `artifact`. |

**`enforcedBy` is not optional and not decorative.** The checker rejects the
definition when the cited script does not exist, and when the cited script's
source does not mention the basename of `artifact`.

The reason is concrete: a declared path that nothing enforces rots silently as
downstream tooling changes. This repository already contains a script that
reads a status file no other script writes. An edge backed by a real throw site
cannot disagree with the tool it depicts; an edge backed by a bare string can.

To find a valid `enforcedBy`, look for the place the downstream tool refuses to
continue — the error naming the file it could not find.

## Derived states

Stage state separates two different claims:

| State | Meaning |
| --- | --- |
| `not-started` | none of `produces` exists |
| `produced` | some or all of `produces` exists; audit has not passed |
| `verified` | `audit` ran and exited zero |

Absence of an audit result renders as not verified. It never renders as passing.

Edge state has three values:

| State | Condition |
| --- | --- |
| `satisfied` | `artifact` exists, and it is not newer than the downstream stage's last successful run |
| `blocked` | `artifact` does not exist |
| `stale` | `artifact` exists but was modified after the downstream stage last completed successfully |

`stale` exists because existence alone stays green forever over outdated work.
When the downstream stage has never run, an existing artifact is `satisfied`.

## Execution data

When `taskId` is set, the board reads the durable run summary the orchestrator
already writes and reports phase, selected runner id and label, fallback
attempts, and verification counts.

Two rules are not negotiable:

- Checks that did not run are derived by subtracting recorded results from
  configured commands. Recording stops at the first failure, so displaying the
  recorded count alone would report "1 of 1 passed" for a three-check task.
- A run recorded as in progress whose last update is older than its configured
  timeout plus a grace period renders as possibly stopped, asking for human
  confirmation. No animated or incrementing indicator is ever shown, because
  the durable record does not change while an agent is working.

Missing or unparseable run data is not an error. The execution section reports
that no run data exists and the rest of the board still renders.
