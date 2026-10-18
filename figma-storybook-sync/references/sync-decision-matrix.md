# Sync Decision Matrix And Figma-Facts Schema

Use this reference when running the figma-storybook-sync workflow: building the
story-to-node mapping table, authoring figma-facts JSON from Figma MCP reads,
and interpreting the four-quadrant classification.

## Story-To-Node Mapping Discovery

Resolve each story through this ordered fallback. Record the provenance tier
on every mapping row.

| Tier | Source | Confidence |
|---|---|---|
| 1 | `figmaNodeUrl` in `component-review-status.json` | normal |
| 2 | Figma file shared plugin data scan — namespace `storybook`, key `storyId` (REST `GET /v1/files/<file-key>?plugin_data=shared`, when a Figma token or an MCP surface exposing shared plugin data is available) | normal |
| 3 | Name match of `componentTitle / storyName` against section and node names (`get_metadata`) | **low — mark explicitly** |

Rules:

- Every mapping row records: storyId, Figma node reference, provenance tier,
  confidence.
- One storyId resolving to more than one Figma node: **stop and ask the user**
  which node is authoritative. Never choose silently.
- Stories with no resolvable node: report as `unmapped` in the sync report.
  Do not drop them.
- A tier-3 (name-matched) mapping breaks when a designer renames the section;
  after a successful sync, offer to backfill `figmaNodeUrl` into
  `component-review-status.json` (user consent required — this is the skill's
  only write outside the report files).

## Figma-Facts JSON Schema

The comparison script's `--theirs` input. Author one document per story from
Figma MCP reads. The document uses the **normalized semantic subset** directly
— write what Figma currently shows, field by field. Omit fields you cannot
observe; write the string `"unknown"` only when a field visibly exists but its
value cannot be read (the script then reports it as a difference for manual
review rather than guessing).

```json
{
  "storyId": "components-button--primary",
  "generatedAt": "2026-08-27T10:00:00.000Z",
  "tokens": {
    "--cm-comp-button-radius": "12"
  },
  "nodes": {
    "button": {
      "kind": "frame",
      "layout": "auto row",
      "gap": 8,
      "paddingTop": 6,
      "paddingRight": 12,
      "paddingBottom": 6,
      "paddingLeft": 12,
      "width": 120,
      "height": 32,
      "radius": "12",
      "effects": "DROP_SHADOW",
      "backgroundColor": "#3366ff"
    },
    "button/label": {
      "kind": "text",
      "text": "Click me",
      "color": "#ffffff",
      "width": 80,
      "height": 20
    }
  }
}
```

### Field-by-field sourcing guide

| Field | Source | Notes |
|---|---|---|
| `storyId` | shared plugin data `storybook/storyId` on the identity node | falls back to the mapping table entry |
| `generatedAt` | shared plugin data `storybook/generatedAt` | lets the script flag stale baselines; omit when unreadable |
| `tokens` | `get_variable_defs` on the node | key = the CSS custom property name (variable plugin data `storybookCssToken`, or reconstruct `--<prefix>-<collection>-<path>` from the variable name); value = resolved value as a string |
| node path | node names joined with `/`, root first | mirror the baseline payload's paths; duplicate sibling names get `#2`, `#3` suffixes |
| `kind` | node type from `get_metadata` / `get_design_context` | `frame`, `text`, `image`, `vector` |
| `layout` | auto-layout direction and wrap | space-joined, e.g. `"auto row"`, `"auto column WRAP"`; omit for absolute frames |
| `gap`, `padding*` | auto-layout item spacing and padding | numbers in px |
| `width`, `height` | node dimensions | numbers in px |
| `radius` | corner radius | single value as string (`"8"`), or four values (`"8 8 0 0"`) for per-corner radii |
| `effects` | effect types, comma-joined and sorted | e.g. `"DROP_SHADOW"`, `"BACKGROUND_BLUR,DROP_SHADOW"` |
| `text` | text node characters | the rendered string |
| `backgroundColor`, `color`, `borderColor` | fills and strokes | hex (`#rrggbb` / `#rrggbbaa`) or `rgb()/rgba()` |
| `x`, `y` | root node only | always suppressed as Figma chrome; include only when convenient |

Only fill fields the baseline also carries where possible — a field present in
the facts but absent from the baseline (or the reverse) is reported as a
difference, which is correct for genuine additions but noise for
unobservable fields. When in doubt, omit.

## Three Inputs

| Input | Source | Command |
|---|---|---|
| base | synced baseline payload | `GET <storybook-url>/__figma-export/payloads/<storyId>/baseline`, or read `design-system/figma-export-payloads/synced/<storyId>.json` |
| ours | current export of the running story | the current payload in the store (`GET .../payloads/<storyId>`) when freshly re-exported; ask the user to re-export stale stories |
| theirs | figma-facts JSON authored from MCP reads | `get_design_context`, `get_variable_defs`, `get_metadata`, `get_screenshot` |

## Four-Quadrant Classification

The script combines two booleans — after suppression — into one class per
story:

| base vs ours | base vs theirs | classification | meaning | next step |
|---|---|---|---|---|
| equal | equal | `synced` | nothing changed since the last confirmed sync | none |
| equal | different | `figma-only` | Figma is the only change source | sync-back candidate: route diffs by category |
| different | equal | `code-only` | code moved ahead of Figma | re-export the story to Figma, then promote |
| different | different | `conflict` | both sides changed | human adjudication, diff by diff |
| — (no theirs) | — | `partial` | Figma state not collected | collect figma-facts, or treat as code-side check only |

Suppressed differences (see `known-limitation-filter.md`) never contribute to
the classification; they are retained in the report's `suppressed` section for
audit.

## Diff Categories And Routing

| Category | Definition | Route |
|---|---|---|
| `token` | a token's resolved value or binding changed (`tokens/*` paths) | design-system-extractor **Late-Arriving Authoritative Source Pass** — the Figma value is `authored` provenance; produce the token recalibration table and let the developer adjudicate |
| `visual` | a style field changed (color, spacing, radius, dimensions, effects, text) | **ui-compare-to-reference** with the mapped Figma node as the reference — token-first, component-first repair |
| `structural` | a node was added, removed, or changed kind | **manual handling** — no automated path exists; describe the change in the report |
