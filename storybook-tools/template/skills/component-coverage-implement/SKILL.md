---
name: component-coverage-implement
description: "Implement the UI of a confirmed component-coverage report: derive the work list from developer review decisions, extend or build components with stories first, then compose the screen, honoring design-system governance. Use when a Component Coverage Analyzer report is confirmed and ready for implementation."
---

Implement the UI described by a **confirmed** component-coverage report produced by the Storybook「Component Coverage Analyzer」tool. This skill remains the orchestrator: the confirmed developer review selects which work happens, while extracted design-system evidence defines component details and the request sources define screen composition.

**Contract source of truth**: `src/storybook/component-coverage/coverageTypes.ts`. Every shape and enum below mirrors that file — if they disagree, `coverageTypes.ts` wins and this skill must be updated.

**Supported agents**: Cursor, Claude Code, and Codex. The
`.agents/skills/component-coverage-implement/` copy is the shared project skill
for Cursor and Codex; `.claude/skills/component-coverage-implement/` is its
byte-identical Claude Code mirror. Do not add agent-specific command syntax or
tool names.

**Input**: A request id (required), e.g. `20260708-114102-request`.

**Steps**

1. **Load the report and its sources**

   - Read `outputs/component-coverage/reports/<request-id>.json`. If it does not exist, stop and tell the user to run the `component-coverage-analyze` skill first.
   - Read the originating request at `outputs/component-coverage/requests/<request-id>/`: `request.json` for `prdText`, and every listed image (using whatever file/image reading capability your agent has). These are the visual/functional ground truth for composition.
   - Locate any matching extracted component spec, component tokens, evidence references, component document, inventory, implementation map, and component queue used by the project. For component anatomy, variants, states, accessibility, and styling, an extracted component spec and its tokens are normative. The confirmed review still decides whether to create, extend, reuse, or skip; PRD and images provide composition and content evidence and never silently override an extracted component contract.
   - When the report contains `composition`, treat its validated `version: 1` tree as the structural plan for the screen: groups define nesting and layout, while block nodes map layout positions to report blocks. The tree is declarative evidence only; never execute imports, props, JSX, CSS, or other content sourced from a report.

2. **Verify the review gate**

   The report's `reviewStatus` MUST be `"confirmed"`. If it is absent or `"draft"`, STOP without implementing anything and tell the user to finish the developer review in the Storybook tool（`Tools/Component Coverage Analyzer`）— complete a review decision on every extend/missing block, then press 確認覆核完成 — before re-running this skill.

3. **Derive the work list from review decisions**

   For each block, use `review.decision` together with its coverage classification (`classifyCoverageBlock` in `coverageTypes.ts`):

   | Block state | Work item |
   | ----------- | --------- |
   | `review.decision: "skip"` | Excluded — no work, do not compose this block. Applies in every section, including reusable blocks |
   | `review.decision: "use-existing"` on a missing block | Compose with the component named by `review.overrideComponentId`; no new component or variant |
   | `review.decision: "use-existing"` on an extend block | Compose with the component named by `review.overrideComponentId` as-is — no variant work; the developer override replaces the analyzer's variant proposal |
   | `review.decision: "use-existing"` on a reusable block | Compose with the component named by `review.overrideComponentId` instead of the analyzer's matched `exact` component — the developer override replaces the analyzer's pick |
   | `review.decision: "no-extend"` | Compose with the block's matched component as-is; no variant work |
   | classified reusable without an override (no review or `approve` review) | Compose with the matched `exact` component |
   | `review.decision: "extend"` | Add the required variant to the matched component: extend props/CSS per the block's `gap` suggestion and `reason`, and update its stories (and component doc, if the project keeps them) |
   | `review.decision: "build-new"` | Create the new component `gap.suggestedName`: component source + styles + stories, register it in `src/storybook/componentCatalog.ts` (with explicit `storyTitle` and `componentPath`), and add its component doc if the project keeps them |

   Treat `review.note` on any block as binding reviewer guidance for that work item.

   When `composition` is present, join every composition block node to its report block by `blockId`. Use `review.overrideComponentId` for `use-existing`; otherwise use the node's `matchComponentId` when the decision reuses or extends an analyzed candidate. Review decisions always override the analyzer's proposed match, and `skip` removes the node from production composition.

4. **Implement components first, then compose**

   Split the reviewed work list into component work (`extend` and `build-new`) and composition-only work (reusable, `use-existing`, `no-extend`, and `skip`):

   - When at least one component work item exists, load both `$design-system-to-storybook` and `$design-system-governance` **before any component mutation**. Resolve `$design-system-governance` from the explicitly selected cm-skills checkout or the host's skill catalog; a direct read of `<cm-skills checkout>/design-system-governance/SKILL.md` is sufficient. If either companion cannot be loaded, stop the affected component mutations and report which companion skill must be installed or made discoverable. Reuse already approved report decisions only for their named component scope; do not ask for the same approval again. Do not fall back to creating or extending components from these instructions alone.
   - Run the `$design-system-to-storybook` `Component pass` only for the reviewed `extend` and `build-new` items. Inherit the existing product root, framework, Storybook renderer and builder, file conventions, and token pipeline. A request-scoped pass must not bootstrap a Storybook template, replace the renderer or builder, or install or upgrade an addon, Figma export addon, or importer.
   - A **reuse-only** work list—every non-skipped item is reusable, `use-existing`, or `no-extend`—does not load or execute the `Component pass` and does not mutate shared component APIs. Compose directly from the reviewed existing components; `skip` remains excluded.
   - For each `extend` or `build-new` item with a matching extracted spec, use that spec and its tokens as the normative component contract. If the report, reviewer note, PRD, or image evidence conflicts with it, stop the affected component work before mutation, keep the report unchanged, and ask the developer to resolve the conflict.
   - For a confirmed `build-new` item without a matching extracted spec, require the report gap, review note, PRD, and available images to provide an explicit component brief. Create through the `Component pass`, then mark its component document `brief-derived` or `implementation-derived` and `needs-review`; never present derived evidence as extracted truth. If the evidence is insufficient or conflicting, stop that item before mutation.
   - Reuse existing tokens and components before creating anything; no hardcoded one-off styles. Finish the entire component layer before screen composition.
   - A completed component work item requires token-backed source, a co-located Autodocs story, catalog registration, a synchronized component document and inventory entry, an implementation-map decision, an updated queue row when a queue exists, and the best resolved story source URL. When no source URL exists, record an explicit no-URL decision in the implementation map instead of inventing one.
   - Only after the component layer is complete, compose the screen. When `composition` exists, traverse `composition.root` in child order, preserve group nesting and `layout`, apply grid `columns` and direct-block `span`, resolve each block through the reviewed work list, and omit skipped blocks. Use the request images/PRD to refine responsive behavior, content, spacing, and visual fidelity without discarding that structural plan.
   - When `composition` is absent, fall back to deriving screen structure from the request images/PRD and the ordered report blocks (still skipping excluded blocks).

5. **Validate**

   Run `node scripts/check-component-coverage-reports.mjs` and `node scripts/check-component-catalog.mjs` (or the project's npm aliases for them), plus the project's own check and typecheck pipeline and the available Storybook build check. The report file itself must remain contract-valid — this skill MUST NOT modify the report. Component documentation, Autodocs, catalog, source URL decision, implementation map, applicable queue, and repository checks are completion gates; fix failures before finishing.

6. **Report back**

   Summarize per block: the review decision, the work done (component created/extended/reused or skipped), and where to see it (story titles). Note any reviewer note that could not be honored and why.

**Guardrails**

- Never implement from an unconfirmed report — the review gate is the requirement freeze.
- Never alter the report JSON: analyzer output and review state are version-controlled decision records.
- Never invent components outside the work list; if implementation reveals the review conclusion is wrong, stop and ask the user to revise the review in the tool instead of silently deviating.
- Never claim component work is complete when a required Component pass, provenance marker, documentation synchronization, source URL decision, or repository check is missing.
- Keep `.agents/skills/component-coverage-implement/SKILL.md` and
  `.claude/skills/component-coverage-implement/SKILL.md` byte-for-byte
  identical; the `.agents/skills/` copy is the shared canonical source.
