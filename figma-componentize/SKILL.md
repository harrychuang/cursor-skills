---
name: figma-componentize
description: >-
  Turn raw (non-component) UI in a Figma design into components: detect which UI in a section,
  frame, or single element is not built from components, group it into components, variants
  (Style, Size, State), and component properties, build them bottom-up on the Components page,
  tokenize them through figma-m3-variables Workflow F (color, typography, radius, spacing,
  elevation), then replace the originals with instances and prove the look is unchanged.
  Use when: a designer shares a section, frame, or element link and asks to componentize it,
  create components from it, or replace raw layers with instances.
  Token-only requests (hardcoded values to Variables, no components) belong to figma-m3-variables.
  Triggers: componentize, make components, create components from design, convert to component,
  detect components, replace with instances, component set, variants, 元件化, 建立元件,
  做成元件, 轉成元件, 還不是元件, 拆成元件, 換成 instance, 建立 variants.
---

# Figma Componentize

Find the UI in a designer's scope that is not built from components yet, build matching components on the **Components** page (smallest first), tokenize them through figma-m3-variables **Workflow F**, and replace the originals with instances, **without changing how the design looks**. An original whose instance cannot be proven equal stays as it is.

## Prerequisites

Check all three before anything else. If one is missing, stop, say what is missing, and write nothing ([detection.md](references/detection.md) §1).

- A write-capable `use_figma` tool.
- The `figma-use` skill: read it before the first `use_figma` call, and pass `skillNames: "figma-componentize"` on every call.
- figma-m3-variables with Workflow F: its SKILL.md has "F. Tokenize hardcoded values" and `references/value-harvest.md` exists.

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
| Build a full design system from scratch | `figma-generate-library` |

The scope is whatever the designer gives: a section with many UIs, a frame, or one element. Repetition is not required, so one raw button is enough for a `Button` component. When the scope or a grouping is unclear, ask.

Out of scope:

- team-library components (only this file's local components are reused);
- turning loose vector icons into an icon library (they are listed in the report);
- prototype interactions;
- re-layout, such as converting absolute positions to auto layout (components keep the original layer structure);
- documentation frames;
- Code Connect.

---

## 2. General rules

1. **Inspect before write**: every step starts with a read-only call that confirms the current state.
2. **One call at a time**: `use_figma` calls never run in parallel. Every script re-fetches its nodes by ID and works on one page.
3. **Small results**:
   - detection pages through results with `OFFSET` until `nextOffset` is `null`;
   - each build call creates one component or one component set;
   - each replacement call handles at most 50 occurrences;
   - every result stays under 18,000 characters.
4. **Originals stay untouched** until replacement. Each original is deleted only after its instance passes verification.
5. **Ask, never guess**: ask about every `needs-review` group. Near values are never merged automatically; the user decides on Workflow F's review board.
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
| Tokens | Workflow F's own tiers | Workflow F's token plan; merges are Tier 3 |
| Unlock locked layers, only when the user allows | 2 | Explicit confirmation |
| Replace originals with instances | 3 | Always, with baseline screenshots and component links. Nothing waives it, not even an earlier "apply everything automatically" |
| Accept the listed differences of kept occurrences | 3 | Per occurrence, after showing the differences |

---

## 4. Steps

1. **Scope and baseline** (Tier 0): accept node URLs or the selection, and resolve each root's page. Confirm the scope when it has more than 50 top-level frames or spans pages. Screenshot every scope root as the baseline ([detection.md](references/detection.md) §2).
2. **Detection** (Tier 0):
   - collect the signatures of existing local components ([detection.md](references/detection.md) §10);
   - run the detection script once per page with `MODE: 'groups'`, then with `MODE: 'members'` for each group ([detection.md](references/detection.md) §9).

   The rules are in [detection.md](references/detection.md) §3–§8: UI patterns, candidates and exclusions, levels, signatures and grouping, reuse, and confidence.
3. **Grouping review**:
   - Build the `Componentize Review — temporary` board beside the scope, screenshot it, and give its link.
   - Ask about each group: accept, rename, split, merge, or exclude. Ask every `needs-review` note.
   - Re-run detection where the groups changed, then remove the board ([detection.md](references/detection.md) §11).
4. **Plan** (Tier 2 summary): show the componentization plan and wait for confirmation ([detection.md](references/detection.md) §12). It lists:
   - the components, reuse, and exclusions;
   - the drift for Workflow F;
   - the open questions and the tiers.
5. **Restore point**: ask the user to save a version named "Before figma-componentize — {scope name}" and wait for the reply. Start the ledger ([build-recipes.md](references/build-recipes.md) §2).
6. **Build** (Tier 2):
   1. Find or create the Components page ([build-recipes.md](references/build-recipes.md) §3). If the Starter plan's 3-page limit blocks it, put a `Components` Section on a page the user picks.
   2. Build atoms, then molecules, then organisms ([build-recipes.md](references/build-recipes.md) §1, §4). Smaller components inside larger ones become exposed instances.
   3. For each set, combine and arrange the variants ([build-recipes.md](references/build-recipes.md) §5), then add the component properties ([build-recipes.md](references/build-recipes.md) §6).
   4. Name everything by [build-recipes.md](references/build-recipes.md) §7.
   5. Check each result and record it in the ledger.
7. **Tokens** (Workflow F):
   - Call Workflow F with the new components as its scope (see §5). It must finish before any replacement, so the instances inherit the bindings.
   - Add the plan's drift to Workflow F's review board ([value-harvest.md](../figma-m3-variables/references/value-harvest.md) §6, §7). For each drifting field, add the occurrence's value as an extra candidate next to the component's value, with the occurrence IDs as samples. Values that exist only on originals get no tokens and no bindings.
   - Keep the returned result for the report. Build `MERGES` from its `mergedGroups` ([replacement.md](references/replacement.md) §2).
   - If the user declines the token plan or Workflow F fails, ask whether to continue without tokens. Continue only on a yes, and report the components as untokenized.
8. **Replacement** (Tier 3):
   1. Confirm ([replacement.md](references/replacement.md) §1).
   2. Build the job lists, outermost occurrences only ([replacement.md](references/replacement.md) §2).
   3. Run the replacement loop in chunks of at most 50 ([replacement.md](references/replacement.md) §3–§6) and update the ledger after each chunk.
   4. Report kept occurrences with their reasons ([replacement.md](references/replacement.md) §7). After a failed call, recover before retrying ([replacement.md](references/replacement.md) §8).
9. **Verification**: compare screenshots of every scope root with the baseline, and report unexpected differences instead of fixing them silently. Clear the tracing tags and remove any review board that is left ([replacement.md](references/replacement.md) §9).
10. **Report**: list the components, the tokens from Workflow F, the replaced and kept occurrences, the restore point, the Components page link, and the ledger as the ID map ([replacement.md](references/replacement.md) §10).

---

## 5. Workflow F interface

Call ([value-harvest.md](../figma-m3-variables/references/value-harvest.md) §13):

```json
{ "scope": ["40:9", "42:7"], "components": ["Button", "Card"], "caller": "figma-componentize" }
```

`scope` holds the new main components and component sets only (not the originals). Workflow F's tiers, its `Token Review — temporary` board, and its token plan confirmation apply unchanged.

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
| `figma-componentize` (this skill) | Detect raw UI, group it, build components on the Components page, replace the originals with instances, and verify |
| `figma-m3-variables` | Tokens; this skill calls its Workflow F for the token step. Also applies, audits, and creates token systems |
| `figma-generate-library` | Full design-system builds; this skill follows its conventions for the variant grid and naming |

---

## 7. References

- [detection.md](references/detection.md): prerequisites, scope and baseline, UI patterns, candidates and exclusions, levels, signatures and grouping rules, reuse, confidence, detection script, existing component signatures, grouping review board, componentization plan.
- [build-recipes.md](references/build-recipes.md): order of work, restore point and ledger, Components page, building one component, variants and the component set grid, component properties, naming.
- [replacement.md](references/replacement.md): confirmation, order and job list, placement, content carry-over, verification, replacement loop, kept occurrences, chunks and recovery, final verification, report.
