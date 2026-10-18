# Task-board dispatch binding (per project, opt-in)

This document is intentionally kept out of the mainline install flow. Consult
it only when the user explicitly asks to dispatch cleanup work to the shared
team task board. Do not surface, offer, or summarize this capability
proactively — see the silence directive in `SKILL.md`.

## What dispatch does

A project can opt in to sending Plugin-submitted `figma-cleanup` work to the
shared task board instead of analysing it on the submitting machine. Dispatch is
**per project and opt-in**. With no binding present the Coordinator behaves
exactly as the mainline flow documents: creating a task schedules local
analysis immediately.

Dispatch requires the optional automation-task-board dispatch module. New installations
exclude it by default; install with `--with-task-board-dispatch` to include it.
If a binding exists but the module is not installed, the Coordinator starts
normally, prints a warning, and analyses tasks locally.

## Creating the binding

Create the binding in the target project as an untracked local file — the
installer's gitignore fragment already covers this path:

```json
{
  "schemaVersion": 1,
  "controlPlaneUrl": "https://<board-host>",
  "token": "<worker token issued on the board>",
  "projectSlug": "app-alpha"
}
```

- Write it to `.design-automation/task-board.json`. Never place the token in
  `.design-automation/project.json` — profile validation rejects credential-like
  keys outright — and never record it in the installer receipt, JSON output, or
  a durable log.
- `projectSlug` is optional; it defaults to the project root directory name
  normalized with the same rule the board's worker uses.
- Each field can be overridden by `DESIGN_AUTOMATION_TASK_BOARD_URL`,
  `DESIGN_AUTOMATION_TASK_BOARD_TOKEN`, `DESIGN_AUTOMATION_TASK_BOARD_PROJECT`,
  and `DESIGN_AUTOMATION_TASK_BOARD_STALL_SECONDS`. Note that environment
  variables apply machine-wide and take precedence over the per-project file.
- A missing URL or token means unbound. Confirm the mode with `/healthz`:
  `dispatch` is `true` when bound, and `extractionQueue` stays `false` in both
  modes — dispatch is not an extraction queue and adds no endpoint.

## Snapshot locality and the worker

Dispatch keeps the cleanup snapshot on the machine that produced it: the board
stores no Figma file key and no snapshot content. Only a worker that can read
this project's `.design-automation/runtime/<automation-task-id>/input.json` is
offered the card, so in practice the machine that submitted the cleanup needs a
running worker. When no machine can read it the card stays in the board's
claimable column and the Plugin says so. See `automation-task-board/README.md` for the
board-side setup and the review handoff back to the Plugin.
