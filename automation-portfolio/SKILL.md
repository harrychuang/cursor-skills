---
name: automation-portfolio
description: "Aggregate the automation-pipeline-board status of many projects into one read-only, designer-readable HTML overview dashboard: one card per tracked project showing its current stage, why it is stuck (a possibly-stalled run, the first unmet or stale handoff, or pending designer decisions), and a link to that project's own pipeline board. Use when a designer watches several projects that run design-to-engineering automation and needs one page answering which project is where and who is blocked, without opening each project or reading any run JSON. The dashboard is built by re-running the existing automation-pipeline-board build and render commands per project; a failing project becomes an error card instead of aborting the batch. It is a static snapshot: no server, no port, no polling, no run button, and it never modifies any tracked project."
---

# Portfolio Dashboard

Aggregate many projects' automation-pipeline-board status into one self-contained HTML
overview, one card per project, regenerated on demand.

## What this is not

- Not a launcher. No card starts anything; a human runs automation from their
  own terminal.
- Not a live view. The page is a snapshot stamped with its generation time;
  refreshing the browser does not fetch new data.
- Not a re-implementation. Every per-project claim comes from the existing
  `automation-pipeline-board` build command run against that project; this skill only
  aggregates and renders.
- Not a writer. Output goes to one dashboard directory; tracked project roots
  are never modified.

## Define the portfolio

List the projects to track in a portfolio definition file you keep anywhere
(schema version 1 JSON): one entry per project with a unique id, a display
name, and a root path (absolute, or relative to the definition file).

Copy `assets/default-portfolio.json` as a starting point and read
`references/portfolio-definition.md` for the field contract.

## Build and open

```bash
node automation-portfolio/scripts/build-portfolio-status.mjs \
  --portfolio <path-to-portfolio.json>

node automation-portfolio/scripts/render-portfolio-dashboard.mjs \
  --status <output-dir>/portfolio-status.json
```

By default all output lands in a `dashboard/` directory next to the portfolio
definition: the overview HTML, one board HTML per project (named by project
id), and the aggregated status JSON. Override with `--out-dir`. Open the
overview in any browser; every link resolves inside that directory, so the
whole folder can be shared as-is.

## What each card says

Every successfully aggregated project card derives exactly one attention item,
by fixed priority:

1. a run recorded as possibly stopped → needs human confirmation
2. otherwise the first unmet or stale handoff, in pipeline order, with reason
3. otherwise the count of decisions waiting for a designer
4. otherwise healthy — distinguishing all-verified from produced-but-unverified

A project whose root is missing, whose pipeline definition is invalid, or whose
status cannot be read becomes an error card with a stable error code and no
link. One broken project never blocks the others.

## Check

```bash
node automation-portfolio/scripts/check-portfolio-dashboard.mjs
```

Runs deterministic temporary-portfolio fixtures against the real build and
render scripts. It calls no AI runner and makes no network request.
