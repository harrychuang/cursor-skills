---
name: figma-storybook-sync
description: >-
  Detect which Storybook stories need updating from Figma-side edits and
  produce a routed sync-back report, using a three-way comparison between the
  synced baseline payload, the current Storybook export, and the current Figma
  state. Use after components or pages exported with the design-system-to-storybook
  Figma export addon were refined in Figma and the user wants to know what
  changed, in which direction, and how each change should flow back — token
  differences to the design-system-extractor Late-Arriving Authoritative
  Source Pass, visual differences to ui-compare-to-reference, structural
  differences to manual handling. This skill classifies and routes; it never
  modifies product component code, token CSS, or component spec documents.
---

# Figma Sync Back

Answer one question with evidence: **for each exported story, did Figma
change, did code change, did both, or neither — and where should each real
difference flow?**

## Prerequisites

- The product repo uses the `design-system-to-storybook` Figma export addon
  with the review-server bridge (`payloadSyncUrl` configured), so
  `design-system/figma-export-payloads/` exists.
- Stories were exported to Figma through the bundled Storybook Code To Design
  plugin. Plugin ≥ 1.10.0 writes shared plugin data
  (`storybook/storyId`, `storybook/generatedAt`) on every import's identity
  node; older imports backfill automatically on their next re-import.
- Baselines exist for the stories being checked (`synced/<storyId>.json`, or
  `GET <storybook-url>/__figma-export/payloads/<storyId>/baseline`). A story
  with no baseline can only be compared in degraded form — say so instead of
  inventing a baseline.

## Hard Rules

- **Never modify product code.** No component source, no token CSS, no
  component spec Markdown, no Storybook stories. The only writes this skill
  performs are the two report files and — with explicit user consent — a
  `figmaNodeUrl` backfill in `component-review-status.json`.
- **Never promote a baseline automatically.** Promotion is the user's
  confirmation that a sync is complete.
- **Never classify from memory or screenshots alone.** Every classification
  comes from the comparison script's output over concrete inputs.

## Workflow

### 1. Build The Story-To-Node Mapping Table

Read `references/sync-decision-matrix.md` first. Resolve each story in this
order, recording the provenance tier on every row:

1. `figmaNodeUrl` in `component-review-status.json`.
2. Figma file shared plugin data scan (namespace `storybook`, key `storyId`)
   via REST `plugin_data` query when a token is available, or an MCP surface
   that exposes shared plugin data.
3. Name match of `componentTitle / storyName` against section/node names via
   `get_metadata` — mark these rows **low confidence**.

If one storyId resolves to more than one node, stop and ask the user which
node is authoritative. Stories with no resolvable node go into the report as
`unmapped`; do not drop them and do not guess.

### 2. Collect The Three Inputs Per Story

- **base**: the synced baseline payload —
  `GET <storybook-url>/__figma-export/payloads/<storyId>/baseline` or
  `design-system/figma-export-payloads/synced/<storyId>.json`.
- **ours**: the current export of the running story. Use the current store
  payload when it is fresh; when it predates recent code changes, ask the
  user to re-export the story (toolbar → Copy JSON with `payloadSyncUrl`
  configured) rather than comparing a stale export.
- **theirs**: a figma-facts JSON you author from Figma MCP reads
  (`get_design_context`, `get_variable_defs`, `get_metadata`,
  `get_screenshot` for orientation). Follow the schema and field-by-field
  sourcing guide in `references/sync-decision-matrix.md`. Omit fields you
  cannot observe instead of guessing.

Read the identity node's shared `storybook/generatedAt` while you are there —
the script uses it to flag stale baselines.

### 3. Run The Comparison Script Per Story

```sh
node <skill-root>/scripts/compare_payload_baseline.mjs \
  --base <baseline.json> --ours <current.json> --theirs <figma-facts.json>
```

The script is deterministic and offline: it normalizes both shapes into one
semantic subset, diffs inside it, applies the known-limitation suppression
rules (`references/known-limitation-filter.md`), and prints
`{storyId, classification, diffs, suppressed, warnings}`. Without `--theirs`
it degrades to `partial` (code-side check only) — collect figma-facts before
treating a story as classified.

Classifications: `synced`, `figma-only`, `code-only`, `conflict`, `partial`.
Suppressed diffs never affect the classification; keep them in the report for
audit.

### 4. Write The Routed Sync Report

Write `design-system/figma-sync-report.md` (human-readable) and
`design-system/figma-sync-report.json` (machine-readable, the per-story
script outputs plus the mapping table).

Report header, before any per-story detail:

- stories whose baseline is stale (the script's `warnings` flag stories where
  Figma's shared `generatedAt` differs from the baseline's) — the Figma
  content descends from a different export than the baseline, so classify
  with that caveat visible;
- unmapped stories and low-confidence (name-matched) mappings.

Per story, route every kept `figma-only` / `conflict` diff by category:

| Category | Route |
|---|---|
| `token` | design-system-extractor **Late-Arriving Authoritative Source Pass** — Figma values are `authored` provenance; the pass produces the token recalibration table and the developer adjudicates |
| `visual` | **ui-compare-to-reference** with the mapped Figma node as the reference — token-first, component-first repair |
| `structural` | **manual handling** — describe the node addition/removal/kind change; no automated path |

`code-only` stories: recommend re-exporting to Figma (code is ahead), then
promoting. `conflict` stories: list both sides' diffs and hand the decision
to the user diff by diff.

If the mapping pass discovered node URLs missing from
`component-review-status.json`, ask the user before backfilling them; write
nothing there without consent.

### 5. Close The Loop — Baseline Promotion

After the user applies routed changes and re-exports affected stories,
instruct the promote call per story:

```sh
curl -X POST <storybook-url>/__figma-export/payloads/<storyId>/promote
```

Promotion freezes the just-confirmed export as the new baseline. Never run it
yourself unprompted; end the report with the exact commands and the list of
storyIds awaiting promotion. Skipping promotion means the next run re-reports
the same differences against the old baseline — say so in the report.

## Gates

### Mapping Gate

No comparison without a mapping row. Ambiguous mappings stop the run;
unmapped stories are reported, not guessed.

### Evidence Gate

`theirs` comes only from actual Figma reads normalized into figma-facts.
If MCP/REST access is unavailable, deliver the `partial` (code-side) report
and say what is missing — do not fabricate the Figma side.

### No-Write Gate

Product code, token CSS, component specs, and stories are read-only to this
skill. Routing is the deliverable; the routed-to workflows own the edits.

## Resource Map

- `scripts/compare_payload_baseline.mjs`: deterministic three-way comparison,
  four-quadrant classification, suppression filter.
- `scripts/test_compare_payload_baseline.mjs`: verification suite
  (`node scripts/test_compare_payload_baseline.mjs` from the skill root).
- `references/sync-decision-matrix.md`: figma-facts schema, mapping fallback
  order, classification semantics, routing table.
- `references/known-limitation-filter.md`: suppression rules, thresholds,
  tuning guidance.
- Companion workflows: `design-system-extractor` (Late-Arriving Authoritative
  Source Pass), `ui-compare-to-reference`, `design-system-to-storybook`
  (export addon, review status, baseline store endpoints).
