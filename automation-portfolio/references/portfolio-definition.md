# Portfolio definition

The portfolio definition is a standalone JSON file the user keeps anywhere —
next to their projects, in a notes folder, anywhere convenient. Only this skill
reads it. No runner, no orchestrator, no installer, and no tracked project
consults it, so deleting it changes nothing about how any automation executes.

It is deliberately not a per-project sidecar. A pipeline definition describes
one project from the inside; the portfolio describes which projects one person
watches, which is a different audience and a different lifecycle. The build
command takes the definition's path explicitly:

```bash
node automation-portfolio/scripts/build-portfolio-status.mjs --portfolio <path>
```

## Shape

```json
{
  "schemaVersion": 1,
  "projects": []
}
```

`schemaVersion` MUST be exactly `1`. Any other value is rejected.

## `projects[]`

The list MUST NOT be empty — a portfolio with nothing to watch is treated as a
configuration mistake, not an empty dashboard.

| Field | Required | Contract |
| --- | --- | --- |
| `id` | yes | Stable kebab-case identifier, unique within the file. Also used as the file name of that project's board HTML in the output directory. |
| `name` | yes | Designer-readable display name shown on the card. |
| `root` | yes | The project's root directory: an absolute path, or a path relative to the directory containing this definition file. |

## Validation and failure

The build command validates the definition before touching any project. A
missing or unparsable file, a `schemaVersion` other than `1`, an empty
`projects` list, or a duplicate `id` exits non-zero with a stable error code
and produces no output file at all.

Failures scoped to a single project never abort the batch. A root that does not
exist, an invalid pipeline definition inside that project, a per-project build
that exits non-zero, or a status object with an unsupported schema version each
turn into an error card carrying a stable error code and reason, while every
other project still aggregates. The overall command still exits zero.

## Output

All output of one aggregation lands in a single directory — by default
`dashboard/` next to the definition file, overridable with `--out-dir`:

- `portfolio-status.json` — the aggregated status object
- `<project-id>.html` — that project's own pipeline board
- the overview HTML produced by the render command

Card links are directory-relative and point only at files written by the same
run, so the overview and every board describe the same instant, and the whole
directory can be moved or shared as one folder. Tracked project roots are never
written to.

## Attention item

Each successful project card carries exactly one derived attention item,
chosen by fixed priority — the first that holds:

1. the project's run block is flagged possibly stopped → needs human
   confirmation
2. the first unmet or stale handoff, in the project's own pipeline order, with
   its reason
3. a pending designer-decision count greater than zero
4. healthy — distinguishing all-verified from produced-but-unverified

The renderer displays this derivation and never recomputes or reorders it.
