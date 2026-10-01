---
name: figma-componentize
description: >-
  Turn raw (non-component) UI in a Figma design into components: detect which UI in a section,
  frame, or single element is not built from components, group it into components, variants
  (Style, Size, State), and component properties, build them bottom-up on the Components page,
  tokenize them via figma-m3-variables Workflow F (color, typography, radius, spacing,
  elevation), then replace the originals with instances and prove the look is unchanged.
  Optional design system document page: all local tokens and components.
  Use when: a designer shares a section, frame, or element link and asks to componentize it,
  create components from it, or replace raw layers with instances.
  Token-only requests (hardcoded values to Variables, no components) go to figma-m3-variables.
  Triggers: componentize, make components, create components from design, convert to component,
  detect components, replace with instances, component set, variants, 元件化, 建立元件,
  做成元件, 轉成元件, 還不是元件, 拆成元件, 換成 instance, 建立 variants,
  design system document, 設計系統文件.
---

# Figma Componentize

Find the UI in a designer's scope that is not built from components yet, build matching components on the **Components** page (smallest first), tokenize them through figma-m3-variables **Workflow F**, and replace the originals with instances, **without changing how the design looks**. Existing local components are reused first; a new component is built only when none fits or the designer decides so. An original whose instance cannot be proven equal stays as it is. When the designer opts in, the skill also generates a design system document of every local token and component.

## Prerequisites

Check all three before anything else. If one is missing, stop, say what is missing, and write nothing ([detection.md](references/detection.md) §1).

- A write-capable `use_figma` tool.
- The `figma-use` skill: read it before the first `use_figma` call, and pass `skillNames: "figma-componentize"` on every call.
- figma-m3-variables with Workflow F: its SKILL.md has "F. Tokenize hardcoded values" and `references/value-harvest.md` exists.

A document-only run (§4) needs only the first two: the write-capable `use_figma` tool and the `figma-use` skill. figma-m3-variables Workflow F is not required for it.

`use_figma` facts that shape every script here:

- Every call starts on the first page and cannot load all pages, so work one page per call with `setCurrentPageAsync`.
- Use async getters only.
- A call returns at most 20 kB and has an execution time limit, and a failed call can leave partial changes.
- `use_figma` cannot save versions, load custom fonts, or create images.

Ask questions with the host's question tool: `AskQuestion` in Cursor, `AskUserQuestion` in Claude Code. Without one, ask in plain text and wait for the answer before any write.

---

## 1. When to use

| Request | Use |
|---------|-----|
| Make components from the raw UI in a section, frame, or element, and replace the raw layers with instances | This skill |
| Turn hardcoded values into tokens without creating components | figma-m3-variables Workflow F |
| Apply existing tokens, audit tokens, or create a token system | figma-m3-variables (Workflows A–E) |
| Generate or update only the design system document | This skill, as a document-only run ([documentation.md](references/documentation.md)) |
| Build a full design system from scratch | `figma-generate-library` |

The scope is whatever the designer gives: a section with many UIs, a frame, or one element. Repetition is not required, so one raw button is enough for a `Button` component. When the scope or a grouping is unclear, ask.

Out of scope:

- team-library components (only this file's local components are reused);
- turning loose vector icons into an icon library (they are listed in the report);
- prototype interactions;
- re-layout, such as converting absolute positions to auto layout (components keep the original layer structure);
- usage guidance written by the agent (the design system document shows facts and the designer's own component descriptions only);
- Code Connect.

---

## 2. General rules

1. **Inspect before write**: every step starts with a read-only call that confirms the current state.
2. **One call at a time**: `use_figma` calls never run in parallel. Every script re-fetches its nodes by ID and works on one page.
3. **Small results**:
   - detection pages through results with `OFFSET` until `nextOffset` is `null`;
   - each build call creates one component or one component set;
   - each replacement call handles at most 50 occurrences;
   - each document call writes at most 20 tokens or styles, 40 icons, or one component section ([documentation.md](references/documentation.md) §9);
   - every result stays under 18,000 characters.
4. **Originals stay untouched** until replacement. Each original is deleted only after its instance passes verification.
5. **Ask, never guess**: ask about every `needs-review` group. A reuse match that is not `exact` is asked, and occurrences without a matching variant are never left without a decision ([detection.md](references/detection.md) §11). Near values are never merged automatically; the user decides on Workflow F's review board.
6. **Ledger**: from the first write on, keep the ledger (restore point, page, components, occurrences) and update it after every call ([build-recipes.md](references/build-recipes.md) §2).
7. **Errors**: stop and read the message. Re-read the ledger and the affected nodes, then retry only what is missing. Never re-run a failed call blindly.

---

## 3. Change tiers

Tiers follow figma-m3-variables (its SKILL.md §3): 0 read-only, 1 one explicit target with the look unchanged, 2 broad or structural with the look unchanged, 3 changes the look or destroys something.

| Step | Tier | Confirmation |
|------|------|--------------|
| Scan, detect, group, plan, report | 0 | None |
| Grouping review board (a temporary Section that only adds) | — | Allowed before the decisions; removed afterwards |
| Components page, main components, variants, component properties | 2 | The plan confirmation; an explicit "auto-apply without review" waives it |
| Add a variant to an existing component set | 2 | The designer's explicit choice for that group ([detection.md](references/detection.md) §11). Nothing waives it, not even an earlier "apply everything automatically" |
| Tokens | Workflow F's own tiers | Workflow F's token plan; merges are Tier 3 |
| Unlock locked layers, only when the user allows | 2 | Explicit confirmation |
| Replace originals with instances | 3 | Always, with baseline screenshots and component links. Nothing waives it, not even an earlier "apply everything automatically" |
| Accept the listed differences of kept occurrences | 3 | Per occurrence, after showing the differences |
| Design system document: page or Section, root frame, sections | 2 | The **Yes** answer at the start together with the plan confirmation; in a document-only run, the request itself |
| Replace an existing generated document | 3 | Always, every time ([documentation.md](references/documentation.md) §10). Nothing waives it, not even an earlier "apply everything automatically" |

---

## 4. Steps

1. **Scope and baseline** (Tier 0): accept node URLs or the selection, and resolve each root's page. Confirm the scope when it has more than 50 top-level frames or spans pages. Screenshot every scope root as the baseline ([detection.md](references/detection.md) §2).

   After the scope is confirmed and before detection, ask whether to generate a design system document at the end: **Yes** or **No**. After a **Yes**, ask the language of its headings and labels: **English** (default), **繁體中文**, or another language the designer names ([documentation.md](references/documentation.md) §2). A **No** means nothing is generated and nothing is asked again.
2. **Detection** (Tier 0), in this order:
   1. Run the detection script on each scope page with `KNOWN = []` and `MODE: 'groups'` ([detection.md](references/detection.md) §9).
   2. Run the inventory on each page that holds local components, with the groups' `core`, `name`, and `pattern` ([detection.md](references/detection.md) §10).
   3. When the inventory is not empty, run detection again with `KNOWN`. When it is empty, the first run is the result.
   4. Run `MODE: 'members'` for each group, with the same `KNOWN`.

   An existing local component is matched by structure, name, and style ([detection.md](references/detection.md) §7). The match quality is `exact` (reused without a question), `partial`, or `unconfirmed` (both are asked). Every occurrence of a reused group gets its existing variant assigned here (`known`).

   The rules are in [detection.md](references/detection.md) §3–§8: UI patterns, candidates and exclusions, levels, signatures and grouping, reuse, and confidence.
3. **Grouping review** ([detection.md](references/detection.md) §11):
   - Build the `Componentize Review — temporary` board beside the scope, screenshot it, and give its link. It shows the existing components beside the raw samples, as instances.
   - Ask about each group: accept, rename, split, merge, or exclude. Ask every `needs-review` note.
   - Ask the reuse questions: **Reuse {name}**, **Build new instead**, or **Reuse another component**. For occurrences that no existing variant fits: **Add a variant to {name}**, **Build a new component**, or **Keep as they are**.
   - A new component never gets the same name as a local component: ask for a distinct name.
   - Re-run detection where the groups or the reuse decisions changed, then remove the board.
4. **Plan** (Tier 2 summary): show the componentization plan and wait for confirmation ([detection.md](references/detection.md) §12). It lists:
   - the components and the exclusions;
   - `Reused` (with the assigned variants), `Added variants`, `Built instead of reused`, and `Kept by decision`;
   - the drift for Workflow F;
   - the design system document step and its target page, when the designer answered **Yes**;
   - the open questions and the tiers.
5. **Restore point**: ask the user to save a version named "Before figma-componentize — {scope name}" and wait for the reply. Start the ledger ([build-recipes.md](references/build-recipes.md) §2).
6. **Build** (Tier 2):
   1. Find or create the Components page ([build-recipes.md](references/build-recipes.md) §3). If the Starter plan's 3-page limit blocks it, put a `Components` Section on a page the user picks.
   2. Build atoms, then molecules, then organisms ([build-recipes.md](references/build-recipes.md) §1, §4). Smaller components inside larger ones become exposed instances. Reused groups are not built.
   3. For each new set, combine and arrange the variants ([build-recipes.md](references/build-recipes.md) §5), then add the component properties ([build-recipes.md](references/build-recipes.md) §6).
   4. Add each variant the designer chose to add to an existing component set, at its group's level, atoms first ([build-recipes.md](references/build-recipes.md) §8).
   5. Name everything by [build-recipes.md](references/build-recipes.md) §7.
   6. Check each result and record it in the ledger.
7. **Tokens** (Workflow F):
   - Call Workflow F with the new components and the variants added to existing sets as its scope (see §5). It must finish before any replacement, so the instances inherit the bindings.
   - Add the plan's drift to Workflow F's review board ([value-harvest.md](../figma-m3-variables/references/value-harvest.md) §6, §7). For each drifting field, add the occurrence's value as an extra candidate next to the component's value, with the occurrence IDs as samples. Values that exist only on originals get no tokens and no bindings.
   - Keep the returned result for the report. Build `MERGES` from its `mergedGroups` ([replacement.md](references/replacement.md) §2).
   - If the user declines the token plan or Workflow F fails, ask whether to continue without tokens. Continue only on a yes, and report the components as untokenized.
8. **Replacement** (Tier 3):
   1. Confirm ([replacement.md](references/replacement.md) §1).
   2. Build the job lists, outermost occurrences only. A reused group uses the variant assigned in detection, `known` ([replacement.md](references/replacement.md) §2).
   3. Run the replacement loop in chunks of at most 50 ([replacement.md](references/replacement.md) §3–§6) and update the ledger after each chunk.
   4. Report kept occurrences with their reasons ([replacement.md](references/replacement.md) §7). After a failed call, recover before retrying ([replacement.md](references/replacement.md) §8).
9. **Verification**: compare screenshots of every scope root with the baseline, and report unexpected differences instead of fixing them silently. Clear the tracing tags and remove any review board that is left ([replacement.md](references/replacement.md) §9).
10. **Design system document** (optional, Tier 2): only after a **Yes** in step 1. It runs even when the designer declined the token step or answered **Not now** to the replacement. The document shows facts only: the skill writes no usage guidance, and descriptions come from each component's description field. This step creates or changes no token, style, or component.
    1. Check the font for the chosen language. When it cannot be loaded, ask ([documentation.md](references/documentation.md) §3).
    2. Inventory every local token, style, and component, read-only ([documentation.md](references/documentation.md) §4). Report the counts, and ask when the scale is large ([documentation.md](references/documentation.md) §5).
    3. Find or create the `Design System` page. If the Starter plan's page limit blocks it, put a `Design System` Section on a page the designer picks ([documentation.md](references/documentation.md) §6). Look for an existing `Design System — generated` frame and ask before replacing it: **Replace it** is Tier 3, and the old frame is deleted only after the new one is verified ([documentation.md](references/documentation.md) §10).
    4. Create the root frame, then write the Foundations sections, the icon grid, and the component sections in batches. Update the ledger's `doc` entry after every call ([documentation.md](references/documentation.md) §6–§9).
    5. Verify: the sections match the ledger, and the numbers of components, variables, and styles are unchanged. Screenshot the frame ([documentation.md](references/documentation.md) §11).
    6. For **Replace it**, swap the frames now: the old one is deleted and the new one takes its place ([documentation.md](references/documentation.md) §10).
11. **Report**: list the components, the reused components with the variants used, the added variants, the designer's reuse decisions, the tokens from Workflow F, the replaced and kept occurrences, the restore point, the Components page link, and the ledger as the ID map ([replacement.md](references/replacement.md) §10). When the document was generated, add the design system document part ([documentation.md](references/documentation.md) §11).

**Document-only run**: the designer asks only for the design system document to be generated or updated. The request itself is the opt-in. Check the two prerequisites for it, ask the language, ask for the restore point and wait ([documentation.md](references/documentation.md) §2), run step 10, then report. No detection, build, tokens, or replacement.

---

## 5. Workflow F interface

Call ([value-harvest.md](../figma-m3-variables/references/value-harvest.md) §13):

```json
{ "scope": ["40:9", "42:7"], "components": ["Button", "Card"], "caller": "figma-componentize" }
```

`scope` holds the new main components and component sets, plus the variants added to existing sets (not the originals, and not the untouched existing components). `components` names the new components and the existing sets that received a variant. Workflow F's tiers, its `Token Review — temporary` board, and its token plan confirmation apply unchanged.

Workflow F returns:

- `variables`: the Ref, Sys, and Comp variable IDs;
- `styles`: the Text and Effect Style IDs;
- `bindings`, `mergedGroups`, and `skipped`.

Copy all of them into the report.

---

## 6. Division of responsibility

| Skill | Responsibility |
|-------|----------------|
| `figma-use` | Plugin API basics; read it first |
| `figma-componentize` (this skill) | Detect raw UI, group it, reuse existing local components, build components on the Components page or add a variant to an existing set, replace the originals with instances, and verify; and, when the designer opts in, generate the design system document |
| `figma-m3-variables` | Tokens; this skill calls its Workflow F for the token step. Also applies, audits, and creates token systems |
| `figma-generate-library` | Full design-system builds; this skill follows its conventions for the variant grid and naming |

---

## 7. References

- [detection.md](references/detection.md): prerequisites, scope and baseline, UI patterns, candidates and exclusions, levels, signatures and grouping rules, reuse matching, confidence, detection script, existing component inventory, grouping review board and reuse questions, componentization plan.
- [build-recipes.md](references/build-recipes.md): order of work, restore point and ledger, Components page, building one component, variants and the component set grid, component properties, naming, adding a variant to an existing component set.
- [replacement.md](references/replacement.md): confirmation, order and job list, placement, content carry-over, verification, replacement loop, kept occurrences, chunks and recovery, final verification, report.
- [documentation.md](references/documentation.md): the two questions, labels and fonts, inventory, scale confirmation, page and root frame, Foundations sections, component sections and the icon grid, batches and ledger, replacing an existing document, verification and report.
