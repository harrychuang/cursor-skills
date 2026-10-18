---
name: component-coverage-analyze
description: "Analyze pending component-coverage requests (UI images / PRD text) against the component catalog and sources, then write contract-conformant coverage reports for the Storybook Tools page. Use when a Component Coverage Analyzer request is pending or the user asks to compare requested UI against the project's reusable components."
---

Process pending analysis requests from the Storybook「Component Coverage Analyzer」tool（`Tools/Component Coverage Analyzer`）: compare uploaded UI images and PRD text against the project's component catalog and component sources, then produce coverage reports the tool can render.

**Contract source of truth**: `src/storybook/component-coverage/coverageTypes.ts`. Every shape and enum below mirrors that file — if they disagree, `coverageTypes.ts` wins and this skill must be updated.

**Supported agents**: Cursor, Claude Code, and Codex. The
`.agents/skills/component-coverage-analyze/` copy is the shared project skill
for Cursor and Codex; `.claude/skills/component-coverage-analyze/` is its
byte-identical Claude Code mirror. Do not add agent-specific command syntax or
tool names.

**Input**: An optional request id. If omitted, process every pending request.

**Steps**

1. **Scan for pending requests**

   List `outputs/component-coverage/requests/*/request.json` and collect those with `"status": "pending"`. If a request id was given, process only that one. If none are pending, report that and stop.

2. **Read the request**

   For each pending request directory:
   - Read `request.json` (`id`, `title`, `prdText`, `images`, `createdAt`)
   - Inspect every file listed in `images` (they are image files in the same directory)

3. **Inventory the UI blocks**

   From the image(s) and/or `prdText`, break the requested UI into distinct blocks (e.g. navigation header, list row, day cell, summary footer). Each block gets:
   - `id`: kebab-case identifier
   - `label`: short human-readable name (in the team's working language; the tool UI defaults to Traditional Chinese)
   - `evidence`: what in the image or PRD text this block was identified from

4. **Match each block against the component library**

   For every block, search BOTH sources — do not rely on the catalog alone:
   - `src/storybook/componentCatalog.ts`: purpose, useWhen, avoidWhen, keywords, dependencies
   - The component sources and stories under each candidate entry's `componentPath`: props, states, CSS structure — this determines whether a visual difference is data-driven (props) or structural (needs a variant)

   For each candidate match record:
   - `componentId`: the catalog id
   - `storyTitle`: MUST equal the catalog entry's `storyTitle` verbatim (the validation script enforces this)
   - `fit`: `exact`（現有 props/states 即可達成）｜`variant-needed`（結構或樣式寫死，需新增 variant）｜`partial`（僅部分結構對應）
   - `reason`: concrete comparison — what matches, what differs
   - `provenance`: copy from the catalog entry (`extracted` or `implementation-derived`)
   - `componentPath`: copy from the catalog entry

   For each block set `gap`:
   - `{ "status": "none" }` when an exact match covers it
   - `status: "extend"` with `suggestedName`, `suggestedCategory`, `suggestedRole`, `rationale` when an existing component needs a new variant
   - `status: "missing"` with the same suggestion fields when no component covers the block（`matches` may be empty）

   **Evidence regions（請求含圖片時）**: for every block whose location you can
   identify in a source image, add `evidenceRegion`:

   ```json
   { "image": "<request 目錄內的圖片檔名>", "x": 0.25, "y": 0.02, "width": 0.5, "height": 0.09 }
   ```

   All four values are fractions of the image's natural size (0–1), and
   `x + width` / `y + height` must not exceed 1. Blocks with `gap.status`
   `missing` MUST carry an `evidenceRegion` whenever the region is
   identifiable — the tool crops and shows it in the 缺少需新建 section.
   If you cannot locate a block with confidence, omit the field entirely;
   never guess coordinates.

5. **Write the report**

   Write `outputs/component-coverage/reports/<request-id>.json`:

   ```json
   {
     "id": "<request-id>",
     "requestId": "<request-id>",
     "createdAt": "<ISO timestamp>",
     "sourceSummary": "<one-paragraph description of the analyzed input>",
     "blocks": [ ... ],
     "summary": { "reusable": 0, "extend": 0, "missing": 0 },
     "analyzer": { "engine": "<cursor|claude-code|codex>", "catalogEntryCount": <count of catalog entries> }
   }
   ```

   Set `analyzer.engine` to the agent executing the analysis: `cursor` for
   Cursor, `claude-code` for Claude Code, or `codex` for Codex. Do not copy
   the angle-bracket placeholder into a report.

   `summary` counts MUST equal the block-derived classification: a block is `missing` when `gap.status` is `missing`; `extend` when `gap.status` is `extend` or no match has fit `exact`; otherwise `reusable`. (`classifyCoverageBlock` in `coverageTypes.ts` is the reference implementation.)

   **Developer review fields (do NOT produce them)**: an existing report may
   additionally carry a top-level `reviewStatus`（`"draft"`｜`"confirmed"`，缺席視同
   draft）and per-block `review` objects
   （`{ decision, note?, overrideComponentId?, reviewedAt }`，decision 依區塊分類：
   missing → `build-new`｜`use-existing`｜`skip`；extend → `extend`｜`no-extend`｜
   `use-existing`｜`skip`；reusable → `approve`｜`use-existing`｜`skip`）. These are written by developers through the
   Storybook tool and its dev middleware — analysis never emits them, and
   rewriting a report file resets any review state it carried (re-analyzing an
   already-analyzed request is outside this skill's contract). Shapes mirror
   `coverageTypes.ts`, which stays the single source of truth.

   **Optional review composition（`composition`）**: emit this analyzer-owned
   field only when the image or PRD gives enough evidence to place **every**
   report block in one complete layout tree. If order, grouping, viewport, or
   any block placement is ambiguous, omit the entire `composition` field.
   Never emit a partial tree or guess missing layout.

   The version 1 contract is:

   - top level: `{ "version": 1, "label": string, "viewport": "mobile" |
     "desktop", "root": <group> }`
   - group: `{ "kind": "group", "id": string, "label"?: string,
     "layout": "stack" | "row" | "grid", "columns"?: 2 | 3 | 4,
     "children": [...] }`
   - block: `{ "kind": "block", "id": string, "blockId": string,
     "matchComponentId"?: string, "span"?: 1 | 2 | 3 | 4 }`

   Composition requirements:

   - `root` is a non-empty group; node ids are unique; maximum depth is 6 and
     maximum total node count is 100.
   - Reference every report block exactly once. Do not reference unknown
     blocks and do not duplicate a `blockId`.
   - A block with candidates MUST set `matchComponentId` to one component id
     already present in that block's `matches`. A block with no matches MUST
     omit `matchComponentId`.
   - A `grid` MUST set `columns` to 2, 3, or 4. Other layouts MUST omit it.
     `span` is optional only on a direct block child of a grid and cannot
     exceed the parent column count.
   - Encode only structure and match selection. Never emit React props, CSS,
     styles, class names, HTML, scripts, expressions, event handlers, or any
     other executable/arbitrary content.

   **Evidence decision examples**:

   - Clear evidence → emit a complete tree: a mobile screenshot visibly shows
     `portfolio-header` above a two-column `summary-card` / `performance-card`
     row, followed by `holding-list`; all four report blocks have identifiable
     regions and the matched blocks each have a chosen candidate. Represent
     the screen as a root `stack`, a nested two-column `grid`, and the final
     list block, referencing all four blocks once.
   - Ambiguous evidence → omit `composition`: PRD text lists a header, cards,
     and holdings but does not state their order or grouping, or uploaded crops
     show the blocks separately without a whole-screen layout. Still emit the
     complete `blocks`, `summary`, and `analyzer` report, but do not include a
     partial or speculative composition.

6. **Mark the request analyzed**

   Update the request's `request.json` `status` from `pending` to `analyzed`.

7. **Validate**

   Run `node scripts/check-component-coverage-reports.mjs` (or the project's npm alias for it, e.g. `npm run check:coverage-reports`, when one exists). If it fails, fix the report until it passes — do not leave a failing report on disk.

8. **Report back**

   Summarize per request: how many blocks were found, the reusable/extend/missing counts, and where to view the result (`Tools/Component Coverage Analyzer` in Storybook — reload the page to see the new report).

**Guardrails**

- Never invent a `componentId` that is not in `componentCatalog.ts`; if nothing matches, use an empty `matches` array with a `missing` gap.
- Base `fit` judgments on actual component source, not the catalog description alone.
- Reports are version-controlled knowledge; requests are local working data — never commit `outputs/component-coverage/requests/`.
- Keep `.agents/skills/component-coverage-analyze/SKILL.md` and
  `.claude/skills/component-coverage-analyze/SKILL.md` byte-for-byte
  identical; the `.agents/skills/` copy is the shared canonical source.
