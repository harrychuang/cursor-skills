---
name: figma-m3-variables
description: >-
  Create, apply, audit, and derive Figma Variables with Material Design 3's three-tier
  token inheritance (Ref → Sys → Comp), covering color, typography (Text Styles), shape,
  spacing, size, stroke width, opacity, and elevation (Effect Styles).
  Use when: turning hardcoded values in an existing design (a node, section, page, or newly
  created components) into tokens; creating a token system; applying Variables to one node,
  a selection, component sets, or a page; auditing naming, alias chains, scopes, and token
  coverage; or designing components from existing Variables.
  Triggers: create Variables, apply Variables, tokenize, hardcoded values to tokens, Figma
  variables, M3 token, design token, typescale, text styles, elevation, token audit, token
  coverage, batch apply variables, bind variables, three-tier token, 建立變數, 套用變數,
  token 化, 寫死的數值轉成 token, 字級 token, 稽核 token.
---

# Figma M3 Variables

Manage Figma Variables with Material Design 3's three tiers — **Ref** (raw values) → **Sys** (shared semantics) → **Comp** (component anatomy) — and bind them to designs **without changing how the designs look**.

## Prerequisites

- Read the `figma-use` skill before the first `use_figma` call, and pass `skillNames: "figma-m3-variables"` on every call. Where `figma-use` disagrees with [binding-recipes.md](references/binding-recipes.md) §0, follow binding recipes: all typography fields can be bound, and mode limits depend on the Figma plan.
- `use_figma` starts every call on the first page and cannot load all pages: switch with `setCurrentPageAsync` and work one page per call.
- Ask questions with the host's question tool — `AskQuestion` in Cursor, `AskUserQuestion` in Claude Code. Without one, ask in plain text and wait for the answer before any write.

---

## 1. Choose a workflow

| User intent | Workflow |
|-------------|----------|
| Apply existing Variables to one node or the current selection | A |
| Create a new token system for a file that has none | B |
| Check naming, alias chains, scopes, or token coverage | C |
| Build a new component from existing tokens | D |
| Apply existing Variables to a page, many components, or component sets | E |
| Turn hardcoded values in an existing design into tokens | F |
| Ask which tokens exist without changing anything | Inventory only (P2) |

Routing notes:

- Workflow A or E finds values with no matching token → offer Workflow F for those values: tokens derived from the design keep its look. Use B only when the user wants a new system that may change the look.
- Converting raw layers into components belongs to `figma-componentize`; it calls Workflow F for the token step.
- Target unclear → ask for the node URL, selection, section, page, or component set before any write.

---

## 2. General rules

1. **Inspect before write** — every write is preceded by a read-only call that confirms the current state.
2. **One call at a time** — `use_figma` calls never run in parallel. Each write script re-fetches nodes and variables by ID, checks the variable type against the property, and returns every affected variable, style, and node ID.
3. **Infer conventions first** — prefix, collection layout, composite mode, scales, state order and words, and Ref color category come from the file (P2). Ask only when the file has no evidence; keep confirmed decisions for the whole session.
4. **Layers** — Ref stores raw values (scope `[]`); Sys aliases Ref; Comp aliases Sys; composed colors follow the same directions. Never bind Ref to a node.
5. **Binding targets** — single-value properties bind to Comp tokens (Sys only for page-level use with no component). Typography and elevation bind through Styles bound to Sys tokens (Styles mode, the default) or through Comp typography tokens (Variables mode).
6. **Scopes and code syntax** — explicit scopes on every Sys and Comp variable (never `ALL_SCOPES`); WEB code syntax on every variable.
7. **Appearance neutrality** — before binding, compare the token's resolved value with the current value (P4). A difference is a Tier 3 change, even when the user said "apply everything".
8. **Library tokens** — never duplicate library variables locally (P2 detects them).
9. **Chunks** — at most 100 bindings or one component per write call.
10. **Errors** — stop, read the message, fix the cause, and retry that step only. Never retry blindly.

---

## 3. Change tiers

Classify every planned write before running it; the highest tier in the plan decides how to confirm.

| Tier | Changes | Confirmation |
|------|---------|--------------|
| 0 — read-only | Inventory, inspection, value harvest, audit reports, dry-run plans | None |
| 1 — one explicit target, look unchanged | Bind tokens with identical values on one node the user named, or create at most 10 variables for it | Show the mapping and wait, unless the user asked to apply immediately |
| 2 — broad or structural, look unchanged | Bind across several nodes; create a collection or mode; create more than 10 variables; create or edit Text or Effect Styles; detach a style from a node; rename variables; move paint opacity onto layer opacity | Dry-run plan, then explicit confirmation; an explicit "auto-apply without review" waives it |
| 3 — changes the look or destroys something | Bind a token whose value differs; merge near values; snap off-scale values; change the value or alias target of a bound variable; delete variables, collections, modes, or styles; remove bindings; change the prefix | Visual evidence, then explicit confirmation of each change group. Nothing waives it |

Every confirmation request shows:

- how many variables and styles will be created, per layer;
- the bindings grouped by component or node, with current value and token value;
- the confidence of each mapping (`exact`, `inferred`, `needs-review`);
- a flag on every item that changes the look;
- for Tier 3: a baseline screenshot of each affected scope root, plus the review board link (value-harvest.md §7) or an after preview.

---

## 4. Naming at a glance

| Layer | Answers | Pattern | Example |
|-------|---------|---------|---------|
| ref | What is the raw value? | `{p}/ref/{category}/{value}` | `md/ref/spacing/16`, `md/ref/color/blue/50` |
| sys | Which shared role? | `{p}/sys/{category}/{role}` | `md/sys/color/primary`, `md/sys/spacing/inset-horizontal-md` |
| comp | How does this component use it? | `{p}/comp/{component}[/{variant}][/{size}][/{condition}][/{state}]/{anatomy}/{property}` | `md/comp/filled-button/disabled/container/background-color` |

- Ref and Sys never contain component or region names; only Comp does.
- Encoding: lowercase, `-` and `_` only; `0.5` → `0_5`; `−0.25` → `neg-0_25`; opacity as a percentage; color tone = rounded L*; alpha → `-a{pct}` ([token-spec.md](references/token-spec.md) §2).
- States use M3's order and words: `hovered`, `focused`, `pressed`, `dragged`, `disabled`; files that already use `hover`/`focus` or the legacy suffix order keep them until migrated ([token-spec.md](references/token-spec.md) §5).
- Default scales: spacing `3xs 2 · 2xs 4 · xs 8 · sm 12 · md 16 · lg 20 · xl 24 · 2xl 32 · 3xl 40 · 4xl 48 · 5xl 64`; shape `corner-none` … `corner-full` (pill, `ref/radius/9999`); M3 typescale; elevation `level0`–`level5`; state opacities hover 8, focus 10, pressed 10, dragged 16 ([token-spec.md](references/token-spec.md) §4). The file's own scales always win.

---

## 5. Shared procedures

| ID | Procedure | How |
|----|-----------|-----|
| P1 | Discover design guidelines | [binding-recipes.md](references/binding-recipes.md) §3. **Found** (paint styles ≥ 3, text styles ≥ 2, components ≥ 5, or a guideline page) → summarize palette, shape language, type scale, spacing rhythm, and tone, and confirm with the user. **Not found** → ask for product type, visual style (minimal, bold, corporate, playful, custom), shape preference, brand colors, and reference products; confirm the summary. |
| P2 | Token inventory and conventions | [binding-recipes.md](references/binding-recipes.md) §2: collections, variables, styles, conventions, library tokens (§8). Read-only. |
| P3 | Target inspection | [binding-recipes.md](references/binding-recipes.md) §4: node tree, paints, radius, layout, text, effects, existing bindings, instances and their main components. Read-only. |
| P4 | Bind | Compare values first ([binding-recipes.md](references/binding-recipes.md) §5), then bind with the recipes in [binding-recipes.md](references/binding-recipes.md) §7, following the property map in [token-spec.md](references/token-spec.md) §11. Translucent paints follow [token-spec.md](references/token-spec.md) §7. |
| P5 | Validate | [binding-recipes.md](references/binding-recipes.md) §9: read back bindings and resolved values, re-inspect for leftover hardcoded values, `get_screenshot` against the baseline, audit the touched tokens, report every difference. |

---

## 6. Workflows

### A. Apply existing Variables to one target

**Trigger**: a node URL, the current selection, or one component, plus a request to apply Variables.

1. P2, then P3 on the target.
2. Evaluate: matching tokens exist → step 3. Values without tokens → offer Workflow F for them. Instance → work on its main component (binding-recipes.md §7-10). Correct existing bindings are kept.
3. Plan one row per binding: node, property, current value, token, token value, confidence, tier ([token-spec.md](references/token-spec.md) §13 for component patterns).
4. Confirm according to §3.
5. P4, then P5.

### B. Create a new token system

**Trigger**: the file has no token system and the user wants one that is not derived from an existing design.

1. P1.
2. Prefix and collection layout: infer from the file, otherwise ask; propose `{Prefix} · Reference`, `{Prefix} · System`, `{Prefix} · Component` ([token-spec.md](references/token-spec.md) §8). Light and Dark modes need a paid plan.
3. Composite mode: Styles unless the user asks for Variables mode ([token-spec.md](references/token-spec.md) §6).
4. Plan the set from the vocabularies in [token-spec.md](references/token-spec.md) §4 with values from P1: palettes and color roles, spacing ladder, shape scale, typescale in the chosen fonts, elevation levels in use, state opacities. Comp tokens only for components the user names.
5. Confirm (Tier 2).
6. Create Ref → Sys → Comp, then Text Styles and Effect Styles ([binding-recipes.md](references/binding-recipes.md) §6, §7-7, §7-9).
7. Bind only targets the user named; values that differ from the current design are Tier 3.
8. P5; report the counts per layer and the styles created.

### C. Audit

**Trigger**: a request to check, audit, or review token naming, structure, or coverage.

1. P2.
2. Run the variable and style rules once and the node rules one page per call ([audit-rules.md](references/audit-rules.md) §3, §4).
3. Report all 18 rules by severity ([audit-rules.md](references/audit-rules.md) §7).
4. Ask which fixes to apply; each fix carries its tier ([audit-rules.md](references/audit-rules.md) §2). Near-duplicate merges (rule 13) use the review board.
5. Apply ([audit-rules.md](references/audit-rules.md) §6), re-run the affected rules, and report what remains.

### D. Design components from existing Variables

**Trigger**: the user wants a new component built from the file's tokens.

1. P1 and P2.
2. Map token semantics: container fills ← `…/container/background-color` or `sys/color/primary`; text ← `…/label-text/color` or `sys/color/on-primary`; shape ← `…/container/shape`; padding and gaps ← `…/padding-*`, `…/gap`. Flag values that conflict with the guidelines from P1.
3. Ask which variants and states to include (multi-select), using the variants reference in [token-spec.md](references/token-spec.md) §5.
4. Plan state tokens in M3 order: state layers use the `on-{container}` color with `sys/state/*/state-layer-opacity`; disabled colors are composed colors or layer opacity ([token-spec.md](references/token-spec.md) §7). Follow the file's existing state words and order.
5. Build a component, or a component set for variants and states (Phase 3 of `figma-generate-library`); name variants like `State=Hovered, Size=Medium`; text uses Text Styles, shadows use Effect Styles.
6. P4 and P5; the screenshot must show every state as visually distinct.

### E. Apply Variables to many targets

**Trigger**: a selection of several nodes, a component set, a page, or components matching a name.

1. Confirm the scope (ask when it is broad).
2. P2, then P3 for each candidate.
3. Classify each candidate against [token-spec.md](references/token-spec.md) §13: `exact`, `inferred`, or `unknown`.
4. Dry-run plan: `bind` (exact matches with identical values), `review` (inferred, or values that differ — Tier 3), `skip` (unknown, type mismatch, already correct, missing token). Include counts. Missing tokens → offer Workflow F.
5. Confirm (Tier 2; Tier 3 items separately). Never apply `review` items silently.
6. Apply in chunks with P4, then P5.

### F. Tokenize hardcoded values

**Trigger**: the user shares a node, section, page, or component and asks to turn its hardcoded styles into tokens; Workflow A or E found values without tokens; or `figma-componentize` hands over new components. Details: [value-harvest.md](references/value-harvest.md).

1. **Scope and baseline** — confirm the scope when it has more than 50 top-level frames or spans pages; screenshot every scope root ([value-harvest.md](references/value-harvest.md) §1).
2. **Conventions** — P2.
3. **Harvest** — one page per call, read-only ([value-harvest.md](references/value-harvest.md) §2, §3, §4).
4. **Identical values** merge without asking; existing Ref and Sys tokens with the same value are reused ([value-harvest.md](references/value-harvest.md) §5).
5. **Near and off-scale values** — never merge automatically. Build the `Token Review — temporary` board beside the scope, screenshot it, give its link, and ask per group: merge into the recommended value, merge into another value, or keep all ([value-harvest.md](references/value-harvest.md) §6, §7). Merges are Tier 3.
6. **Map** values to Sys roles and Comp anatomy with confidence; ask about every `needs-review` item ([value-harvest.md](references/value-harvest.md) §8, §9).
7. **Token plan** — show it and wait for confirmation (Tier 2 or higher) ([value-harvest.md](references/value-harvest.md) §10).
8. **Write** Ref → Sys → Comp → Styles → bindings; translucent paints use composed colors, then layer opacity, then alpha colors ([value-harvest.md](references/value-harvest.md) §11).
9. **Verify** — read back, re-harvest, compare screenshots with the baseline, and report differences instead of fixing them silently ([value-harvest.md](references/value-harvest.md) §12).
10. **Finish** — remove the review board and report; when another skill called Workflow F, return the structured result ([value-harvest.md](references/value-harvest.md) §13).

---

## 7. Division of responsibility

| Skill | Responsibility |
|-------|----------------|
| `figma-use` | Plugin API basics — read first; binding-recipes.md §0 records two points where the Plugin API reference differs |
| `figma-m3-variables` (this skill) | Create, apply, batch-bind, audit, and derive M3 Variables, Text Styles, and Effect Styles |
| `figma-componentize` (planned) | Detect raw UI, create components on the Components page, and replace the originals with instances; calls Workflow F for tokens |
| `figma-generate-library` | Multi-phase design system builds; Workflow D uses its Phase 3 for component set structure |
| `design-system-governance` | Code-side token governance (CSS/SCSS tokens) |

---

## 8. References

- [token-spec.md](references/token-spec.md) — layers, name encoding, Ref categories, Sys vocabularies, component states, composite styles, composed colors, collections and modes, code syntax, scopes, property map, Filled Button example, component patterns.
- [value-harvest.md](references/value-harvest.md) — Workflow F: harvest script, skips, normalization, near-value thresholds, review board, semantic and anatomy mapping, token plan, write order, verification, report and interface.
- [binding-recipes.md](references/binding-recipes.md) — Plugin API scripts: use_figma conventions, helpers, inventory, guideline discovery, inspection, value comparison, creation, binding, library tokens, validation.
- [audit-rules.md](references/audit-rules.md) — the 18 audit rules with severity, detection scripts, fixes, and report format.
