---
name: figma-m3-variables
description: >-
  Create, apply, audit, and understand Variables in Figma using Google Material Design's
  three-tier token inheritance (Ref → Sys → Comp).
  Use when: creating Variables for components or screens, applying existing Variables to one
  node, selected nodes, a component set, or the current page, auditing token naming and structure
  for compliance, or having AI read existing Variables to reverse-engineer design components.
  Triggers: create Variables, apply Variables, Figma variables, M3 token, design token,
  token inheritance, token audit, audit variables, design component from variables,
  batch apply variables, bind variables to component, three-tier token.
---

# Figma M3 Variables

Complete workflow for managing Variables in Figma using Google Material Design 3
three-tier inheritance (Ref → Sys → Comp).

**MANDATORY prerequisite**: Read the `figma-use` skill before any `use_figma` call.
**Always pass** `skillNames: "figma-m3-variables"` to every `use_figma` call.

---

## 0. General Rules (apply to every workflow)

1. **Inspect before Write** — Before each operation, run a read-only `use_figma` to confirm current state, then proceed with writes.
2. **ALL_SCOPES is forbidden** — Set explicit scopes based on token role (see [token-spec.md](references/token-spec.md)).
3. **Always set WEB code syntax** — Format is fixed: `var(--{prefix}-{layer}-{name})`, e.g. `var(--md-sys-color-primary)`.
4. **Return all IDs** — Every create/modify script must `return` all affected variable IDs and node IDs.
5. **Token prefix is fixed once confirmed** — Use the same prefix throughout the entire session; mixing prefixes is not allowed.
6. **`use_figma` calls are strictly sequential** — Never run two `use_figma` calls in parallel.
7. **Prefer Comp bindings** — Bind design nodes to `comp` tokens when a matching component token exists. Use `sys` only for shared page-level primitives or when no component token exists yet; never bind `ref` directly.
8. **Dry-run before broad writes** — For any operation touching more than one node, first return a binding plan and wait for confirmation unless the user explicitly says to auto-apply without review.
9. On error, stop and read the error message, fix it, then retry — never retry blindly.

### Automation boundary

This skill can bind Variables through the Figma Plugin API, but it is **not** a background sync service.

- Single target: If the user provides a URL/node-id or a current selection and asks to apply Variables, run Workflow A and bind after presenting the proposed mapping.
- Created target: If Workflow B or D creates Variables/components, bind the new target nodes as part of that workflow after the mapping is known.
- Batch target: If the user asks to apply Variables to a selection, component set, page, or many components, run Workflow E. Batch work defaults to dry-run plus confirmation.
- No target: If the user only asks whether Variables exist or whether naming is correct, inspect or audit only. Do not bind anything.
- Ambiguous target: Ask for the node-id, selection scope, component set, page, or batch scope before writing.

### Layer naming philosophy (Ref / Sys / Comp)

Three layers have **different naming jobs**. When creating, applying, or auditing Variables, enforce this split:

| Layer | Role | Naming rule |
|-------|------|-------------|
| **Reference (`ref`)** | Raw values only (hex, px, weight). | **Primitive, scale, or value** — a name must read as “what number or swatch is this?” with **no** component, screen, or layout region. |
| **System (`sys`)** | Product-wide semantics shared by many components. | **Shared, semantic** — roles like primary, error, inset, gap — **no** names tied to one component’s structure or anatomy. |
| **Component (`comp`)** | Bind real UI to Sys. | **Component and structure** — `button`, `input`, `card`, `bottom-bar`, `container/padding-horizontal`, etc. |

**Reference — intuitive value naming (good)**

- Colors: palette steps or hue steps, e.g. `ref/color/red/50`, `ref/palette/primary/40` — the name reflects **the color scale**, not where it is used.
- Sizes / spacing: **the value is in the name**, e.g. `ref/size/12` → 12px, `ref/spacing/16` → 16 — not roles like “bottom bar” or “button”.
- Radius, type: `ref/radius/12`, `ref/type/size/14` — still primitive.

**Reference — forbidden**

- Any segment that names a **component** or **pattern** (e.g. `button`, `input`, `card`, `fab`, `chip`, `dialog`).
- Any segment that names a **layout region** or **screen part** (e.g. `bottom-bar`, `top-app-bar`, `navigation-bar`, `sheet`).
- Spacing that encodes **where** it is used instead of **how much** it is, e.g. `ref/spacing/bottom-bar/padding` or `ref/spacing/button/padding-h` — those belong in **Comp** (and may alias Sys generic spacing).

**System — good**

- Semantics reused across the product: `sys/color/primary`, `sys/color/on-primary`, `sys/spacing/inset-horizontal-md`, `sys/spacing/gap-inline-sm`, `sys/shape/corner-full`.
- Names describe **role**, not a specific component’s internal layout.

**System — forbidden**

- Component-specific or anatomy tied to one component: e.g. `sys/spacing/button-padding-h`, `sys/color/top-app-bar-surface`, `sys/size/navigation-bar-height` — push the component name to **Comp**; keep Sys generic (e.g. `inset-horizontal-md`, `surface-container`).

**Component — where structure lives**

- Only here: `comp/filled-button/...`, `comp/text-field/...`, `comp/navigation-bar/...`, `container/padding-horizontal`, `with-icon/icon-label-gap`, etc. Comp tokens **alias Sys** (and Sys aliases Ref).

Detailed naming patterns, WEB examples, and the Filled Button walkthrough with corrected Ref/Sys names are in [references/token-spec.md](references/token-spec.md) §1 and §4.

---

## Workflow A: Apply Existing Variables to a Component

**Trigger**: User provides a Figma URL + node-id, current selection, or one component and requests Variables to be applied.

### Steps

1. **Inspect variables and target anatomy** — List all variable collections and variables in the file, then inspect the target node tree names, node types, fills, strokes, radius, layout, text children, and existing `boundVariables`:
   ```js
   const cols = await figma.variables.getLocalVariableCollectionsAsync();
   const result = [];
   for (const c of cols) {
     const vars = [];
     for (const id of c.variableIds) {
       const v = await figma.variables.getVariableByIdAsync(id);
       if (v) vars.push({ name: v.name, id: v.id, type: v.resolvedType, scopes: v.scopes });
     }
     result.push({ collection: c.name, id: c.id, modes: c.modes.map(m => m.name), variables: vars });
   }
   return result;
   ```

2. **Evaluate tokens and target**:
   - Variables exist and naming follows M3 three-tier structure → proceed to Step 3
   - Variables are missing or incomplete → switch to **Workflow B**
   - Target is an instance → bind only instance-supported overrides; prefer binding the main component when the user wants library-wide changes
   - Target already has bindings → preserve correct bindings and only propose replacements for mismatches

3. **Match component requirements** — Based on component type and anatomy, find corresponding tokens from the Comp layer using [token-spec.md §4-§5](references/token-spec.md). Return a binding plan with:
   - Node ID and node name
   - Property to bind
   - Current value / existing bound variable
   - Proposed variable name and ID
   - Confidence (`exact`, `inferred`, `needs-review`)
   Present the plan for confirmation unless the user explicitly requested immediate apply.

4. **Bind** — Execute:
   - Background / foreground color: `figma.variables.setBoundVariableForPaint(paint, "color", variable)` → assign the resulting paint back to the node
   - Stroke color: same helper on each solid stroke paint, then assign the resulting strokes back to the node
   - Corner radius: `node.setBoundVariable("topLeftRadius", variable)` × all 4 corners
   - Padding: `node.setBoundVariable("paddingLeft" | "paddingRight" | "paddingTop" | "paddingBottom", variable)`
   - Gap: `node.setBoundVariable("itemSpacing", variable)`
   - Text color: same as above (`setBoundVariableForPaint` on the text node's fills)
   - Typography: `node.setBoundVariable("fontFamily" | "fontSize" | "fontWeight" | "lineHeight" | "letterSpacing", variable)` when matching text tokens exist
   - Width / height / opacity: bind only when the token semantics are explicit and the node property is intended to be tokenized

5. **Validate** — Inspect `boundVariables`, return affected variable IDs and node IDs, then call `get_screenshot` to confirm visual correctness.

---

## Workflow B: Create Variables (none exist in the file)

**Trigger**: No M3 three-tier Variables found in the file, or user explicitly requests creation.

### Steps

1. **Discover design guidelines** — Run the same discovery check as Workflow D Step 1.
   - **Guidelines found** → summarize and confirm with the user before deriving token values.
   - **No guidelines found** → run the same AskQuestion flow as Workflow D Step 1 Path B to gather visual style preferences. Use the answers to inform Ref token values (palette colors, shape radius, spacing scale) in Step 4.

2. **Ask for prefix** — Use AskQuestion to let the user choose (e.g. `md`, `dd`, `bd`, or custom).

3. **Ask for Collection structure** — Use AskQuestion:
   - **Three separate collections** (recommended): `{Prefix} · Reference`, `{Prefix} · System`, `{Prefix} · Component · {ElementName}`
   - **Single collection**: one collection using group prefixes to distinguish the three layers

4. **Inspect** — Confirm there are no duplicate collection names in the current file.

5. **Create Variables** — Follow the token list in [token-spec.md](references/token-spec.md), using values informed by the design guidelines gathered in Step 1:
   - **Ref layer**: stores raw values (hex colors, numbers); scope set to `[]` (hidden, not shown in picker)
   - **Sys layer**: aliases (`VARIABLE_ALIAS`) pointing to Ref; scope set by role
   - **Comp layer**: aliases pointing to Sys; scope set by role

6. **Bind** — Once Variables are created, run Workflow A Step 4 to bind them to target nodes.

7. **Validate** — Call `get_screenshot` to confirm visual correctness, and report the variable counts for each of the three-tier collections.

### Ref Layer Scope Rule

Ref layer variables must not appear in the designer's picker. Their scope must be set to `[]` (empty array).

---

## Workflow C: Audit Existing Variables

**Trigger**: User requests a check, audit, or asks "is the naming correct?".

### Steps

1. **Inspect** — Read all collections, variables, scopes, code syntax, and valuesByMode.

2. **Apply [audit-rules.md](references/audit-rules.md)** — Check each violation type, including alias direction, scope, WEB syntax, modes, type/property compatibility, and Ref/Sys naming, then compile a list of issues.

3. **Report** — Present as a table or list:
   - Violating variable names
   - Violation type
   - Suggested fix

4. **Ask whether to fix** — After presenting the issues, use AskQuestion: "Do you want to automatically fix the above issues?" If the user agrees, execute fix scripts for each item.

5. **Validate after fix** — Inspect again to confirm zero violations remain.

---

## Workflow D: Design Components from Existing Variables

**Trigger**: User wants the AI to understand existing tokens and use them to create or update components.

### Steps

1. **Discover design guidelines** — Before doing anything else, inspect the file for an existing design system or style guide. Run the following script:

   ```js
   const pages = figma.root.children.map(p => p.name);
   const paintStyles  = await figma.getLocalPaintStylesAsync();
   const textStyles   = await figma.getLocalTextStylesAsync();
   const effectStyles = await figma.getLocalEffectStylesAsync();
   const components   = figma.root.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] });
   return {
     pages,
     paintStyleCount:  paintStyles.length,
     textStyleCount:   textStyles.length,
     effectStyleCount: effectStyles.length,
     componentCount:   components.length,
     paintStyles:  paintStyles.map(s  => ({ name: s.name, description: s.description })),
     textStyles:   textStyles.map(s   => ({ name: s.name, fontSize: s.fontSize, fontName: s.fontName })),
   };
   ```

   **Evaluate the result and branch:**

   **Path A — Design guidelines exist** (paint styles ≥ 3 OR text styles ≥ 2 OR components ≥ 5, OR a page name contains "guideline / style / brand / design system / foundation / principle"):
   - Scan those pages and existing components for visual patterns
   - Summarize findings to the user before proceeding:
     - **Color palette**: primary, secondary, neutral, semantic (error/success) hues
     - **Shape language**: fully rounded / slightly rounded / sharp corners (infer from component radii)
     - **Typography scale**: heading sizes, body sizes, font families
     - **Spacing rhythm**: common padding/gap values
     - **Visual tone**: minimal / expressive / corporate / playful (infer from density and color saturation)
   - Ask the user: "I found the following design guidelines. Does this match your intent before I start building?" — present the summary and wait for confirmation or corrections.

   **Path B — No design guidelines found** (counts are all low and no guideline page exists):
   - Inform the user: "I couldn't find any design guidelines in this file."
   - Use AskQuestion to gather the following (may be split into multiple questions):
     1. **Product type** — What kind of product is this? (e.g. consumer app, enterprise tool, e-commerce, dashboard, marketing site)
     2. **Visual style** — Which direction best describes the desired aesthetic?
        - Minimal & clean (lots of whitespace, subtle shadows, neutral palette)
        - Bold & expressive (strong colors, large typography, dynamic shapes)
        - Corporate & trustworthy (conservative palette, structured layout, formal typography)
        - Playful & friendly (rounded shapes, vibrant colors, casual typography)
        - Custom — user describes in their own words
     3. **Shape preference** — Fully rounded (pill) / Slightly rounded / Sharp / Follow M3 defaults
     4. **Color preference** — Any brand colors or preferred palette? (hex codes or descriptions)
     5. **Reference products / brands** — Any existing apps or websites to reference?
   - Summarize the collected preferences and confirm with the user before proceeding.

2. **Inspect variables** — List all variables, analyze the three-tier structure and token semantics (`primary`, `on-primary`, `container-shape`, etc.).

3. **Understand semantic mapping**:
   - `**/color/primary` or `**/container/background-color` → component background
   - `**/color/on-primary` or `**/label-text/color` → component foreground text
   - `**/shape/**` or `**/container/shape` → corner radius
   - `**/padding-horizontal` / `**/padding-vertical` → padding
   - `**/spacing/**` or `**/gap` → gap
   - Cross-reference these mappings against the design guidelines confirmed in Step 1 — if the token values conflict with the guidelines, flag it to the user.

4. **Identify variants and states** — Before building, analyze the component type and propose which variants and interaction states are applicable. Use AskQuestion (multi-select) to let the user choose:

   **Variants** (structural differences — become Component Set properties):
   - Refer to the component's typical variant dimensions in [token-spec.md § 7](references/token-spec.md)
   - Examples: `Size` (Small / Medium / Large), `Style` (Filled / Outlined / Text), `Leading icon` (True / False)

   **Interaction states** (visual overrides — become additional Component Set properties or separate frames):
   - Always include: `Default`
   - Suggest based on component type (see [token-spec.md § 7](references/token-spec.md)):
     - `Hovered` — container color lightens/darkens by state layer opacity
     - `Focused` — typically adds a focus ring or outline
     - `Pressed` — deeper state layer overlay
     - `Disabled` — reduced opacity or dedicated disabled tokens
     - `Error` — replaces primary color tokens with error tokens
     - `Success` — replaces primary color tokens with success/positive tokens

   Present the proposed list and ask: "Which variants and states would you like to include?"

5. **Plan state tokens** — For each selected state, determine whether existing Comp tokens cover it or new state-specific tokens are needed:
   - If the file already has tokens like `…/container/background-color/hovered` → reuse them
   - If not → add them following the naming convention in [token-spec.md § 7](references/token-spec.md) before proceeding
   - Disabled state: always needs a dedicated token (opacity or color override); do not reuse Default tokens

6. **Build the component** — Based on the token mappings, confirmed design guidelines, and selected variants/states:
   - If only `Default` state (no variants) → create a single Frame / Component and bind variables using Workflow A Step 4
   - If variants or multiple states are selected → create a **Component Set**: one Component node per variant × state combination, each with appropriate token bindings; refer to the Phase 3 rules in the `figma-generate-library` skill for Component Set structure
   - Name each variant frame descriptively, e.g. `State=Hovered, Size=Medium`
   - Ensure visual decisions (radius, spacing, color) are consistent with the design guidelines from Step 1

7. **Validate** — Call `get_screenshot` to confirm the component looks correct, token colors resolve properly, and all selected states are visually distinct.

---

## Workflow E: Batch Apply Variables to Existing Components

**Trigger**: User asks to apply Variables to multiple selected nodes, a component set, a page, or all matching components.

### Steps

1. **Define scope** — Confirm the batch scope before writing:
   - Current selection
   - One Component Set
   - Current page
   - Components matching a name pattern
   If the scope is broad or ambiguous, ask before continuing.

2. **Inspect batch candidates** — Read all candidate nodes and existing local Variables. For each candidate, collect node type, component/variant names, visible children, layout properties, paint/stroke/radius/text properties, and existing `boundVariables`.

3. **Classify components** — Match candidates to known component families from [token-spec.md §5](references/token-spec.md):
   - Exact: name and anatomy match a known component pattern
   - Inferred: anatomy suggests a pattern but naming is imperfect
   - Unknown: no reliable token mapping

4. **Build a dry-run plan** — Return a table grouped by component:
   - `bind`: safe exact matches
   - `review`: inferred matches requiring confirmation
   - `skip`: unknown nodes, missing tokens, type mismatches, or already-correct bindings
   Include counts for nodes scanned, bindings proposed, already-correct bindings, skipped nodes, and missing tokens.

5. **Confirm** — Ask before applying unless the user explicitly said to auto-apply. Never silently bind `review` items in batch mode; only bind exact matches automatically after confirmation.

6. **Apply** — Run one sequential `use_figma` write script that:
   - Re-fetches each node and variable by ID
   - Verifies the node and variable still exist
   - Verifies variable type is compatible with the target property
   - Preserves correct existing bindings
   - Applies supported bindings only
   - Returns applied, skipped, and failed items with node IDs and variable IDs

7. **Validate** — Re-inspect `boundVariables` for changed nodes and call `get_screenshot`. Report any failures with the exact reason and suggested next action.

---

## Division of Responsibility with Other Skills

| Skill | Responsibility |
|-------|----------------|
| `figma-use` | Underlying Plugin API rules (colors 0–1, return, page switching, etc.) — **must be read first** |
| `figma-m3-variables` (this skill) | Creating, applying, batch-binding, auditing, and reverse-engineering M3 Variables in Figma |
| `design-system-governance` | Code-side token governance (CSS/SCSS tokens) — complements this skill |
| `figma-generate-library` | Full multi-phase design system build; refer to its Phase 3 when Workflow D involves component creation |

---

## Reference Documents

- [token-spec.md](references/token-spec.md) — M3 three-tier naming rules, component token lists, and scope reference table
- [audit-rules.md](references/audit-rules.md) — Audit violation type definitions and fix guidelines
