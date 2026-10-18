---
name: automation-pipeline-board
description: "Render a read-only, designer-readable HTML board showing what a project's design-to-engineering automation pipeline does, which stages have produced or verified their outputs, which handoffs are satisfied, blocked, or stale, and how many decisions are waiting for a designer. Use when a designer or a non-engineer needs to understand an automation pipeline without reading Markdown documents, run summary JSON, or asking an engineer; when a project needs an honest at-a-glance status of its extraction, design-system, and Storybook stages; or when confirming whether a downstream output was built before its upstream input changed. The board derives every claim from files already on disk and from the durable run summaries agent-automation writes. It never executes automation, never starts a runner, and requires no server, port, access code, or design tool."
---

# Pipeline Board

Render one self-contained HTML page that shows a project's automation pipeline
and its current state, derived entirely from evidence on disk.

## What this is not

- Not an editor. There is no way to wire stages together here; the project task
  contract has a closed field set with no dependency field, so a drawn
  connection would carry no runtime meaning.
- Not a launcher. There is no run button, no scheduler, and no trigger. The
  board reports; a human starts automation from their own terminal.
- Not a live view. The durable run record does not change while an agent is
  working, so the board shows derived progress and never an animated indicator.
- Not tied to any design tool. Figma is one possible source among several.

## Build and open

From the target project root:

```bash
node automation-pipeline-board/scripts/build-pipeline-status.mjs \
  --project-root <absolute-project-root> \
  --out .pipeline-board/status.json

node automation-pipeline-board/scripts/render-pipeline-board.mjs \
  --status .pipeline-board/status.json \
  --out docs/automation-pipeline-board.html
```

Open `docs/automation-pipeline-board.html` in any browser. No install, no port, no access
code, no network.

Both commands exit zero on a project that has never installed the orchestrator
and has no run history. Every stage renders as not started and the execution
section reports that no run data exists.

## Pipeline definition

The pipeline lives in a project-relative sidecar file, by default
`.pipeline-board/pipeline.json`. It is read by this skill only. No runner reads
it, and deleting it changes nothing about how automation executes.

Copy `assets/default-pipeline.json` as a starting point and read
`references/pipeline-definition.md` for the field contract.

Every handoff MUST cite the downstream script that refuses to proceed without
the handed-off artifact. A handoff that only declares a path is rejected,
because such a declaration silently rots as downstream tooling changes.

## Honest naming

The board separates claims it can prove from claims it cannot:

| Board says | Means |
| --- | --- |
| 檔案已產出 | the declared output files exist on disk |
| 已驗證 | the stage's audit command actually exited zero |
| 尚未驗證 | files may exist, but no passing audit result was found |
| 已過期 | the output exists but was built before its input last changed |
| 可能已停止 | a run is recorded as in progress well past its own timeout |

Never present produced files as verified. Never show a progress indicator for
work the durable record cannot observe.

## Check

```bash
node automation-pipeline-board/scripts/check-pipeline-board.mjs
```

Runs deterministic temporary-project fixtures. It calls no AI runner and makes
no network request.
