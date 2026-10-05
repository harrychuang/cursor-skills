---
name: design-system-governance
description: Enforces token-first, composition-first governance for any design system project. Auto-detects the project's token naming conventions, grid system, animation keyframes, and shared component library before applying rules. Use when building UI components, composite layouts, pages, design tokens, or Storybook stories — or when reviewing, refactoring, auditing, or migrating existing UI code, styles, or stylesheets (PR review of component/CSS changes, visual bug fixes, style migrations) — or when the user mentions design tokens, hardcoded styles, component reuse, animations, i18n text, or design system governance.
---

# Design System Governance

This skill is the cross-cutting rule layer for design-system work. Sibling skills'
own gates and conventions apply **on top of** these rules, never instead of them.

## Pipeline Position & Related Skills

| Skill | Relationship |
|---|---|
| `design-system-extractor` | Upstream. Produces the `design-system/` package + `tokens/tokens-{ref,sys,comp}.css`. When Phase 0 finds no token system, **propose running it** as the establishment path. |
| `design-system-to-storybook` | Downstream. When its artifacts are present (`STORYBOOK_IMPLEMENTATION_MAP.md`, storybook component plan/queue files), **its Story Coverage, co-location, and export conventions take precedence** over this skill's minimum story list. |
| `figma-m3-variables` | Figma-side complement. In a Figma-first workspace, **check Figma Variable collections before declaring a token missing** at the Token Gate, and name approved CSS tokens to match the Figma WEB code syntax `var(--{prefix}-{layer}-{name})`. |
| `storybook-product-prototype`, `prototype-storybook-flow`, `ui-visual-parity` | Downstream consumers. All their UI output remains subject to this skill's gates and constraints. |

---

## Phase 0: Discover Project Conventions (Always First)

Before any implementation, scan the project to establish:

| Convention | Where to look | What to find |
|---|---|---|
| **Extracted design-system package** | `design-system/`, `tokens/tokens-{ref,sys,comp}.css`, `docs/design-system/` | If present, **treat its docs as the discovered conventions** (`TOKEN_ARCHITECTURE.md`, `COMPONENT_INVENTORY.md`, `PAGE_COMPOSITION_RULES.md`, `INTERACTION_STATES.md`, `SESSION_STATE.md`) — do not re-derive from raw CSS, and do not recreate tokens/components those docs mark as rejected or blocked. |
| **Project design principles** | `design-system/DESIGN_PRINCIPLES.md`, `ANTI_AI_STYLE_RULES.md`, brand/style docs | The project's own design language. If found, it **overrides** the default house style entirely. |
| **Token naming** | `src/styles/`, `*.css`, `*.scss`, `tokens/`, `tailwind.config.*` / `@theme` blocks, `theme.ts` / ThemeProvider objects, `*.css.ts` (vanilla-extract), `*.tokens.json` / Style Dictionary config | Prefix for ref / sys / comp layers (e.g. `md-ref-`, `sd-sys-`); verify names follow **Token Layer Rules**. |
| **Token layer structure** | Token files | 3 layers (ref → sys → comp) or 2 (primitive → semantic)? |
| **Theming** | `[data-theme]` attributes, `prefers-color-scheme` blocks, per-theme files | Which themes exist and how each redefines sys tokens. |
| **Grid / layout system** | CSS, HTML templates | Class prefix for page grid, cell spans, color variants — or the flex/Tailwind layout idiom if no grid classes exist. |
| **Animation keyframes** | CSS files | Keyframe name prefix, motion token names. |
| **Shared components & Storybook** | `src/components/`, Storybook config | Available shared components; whether Storybook exists at all. |
| **i18n source** | `src/`, `locales/`, `i18n.json` | Path to display text source; key naming pattern; locale list. |
| **Figma variables** (Figma-first workspaces) | `.env*` `FIGMA_*` config, Figma MCP `get_variable_defs` | Whether Figma Variables are the token source of truth. |

**Convention Report**: before implementing, output one line per row above — detected
value plus file-path evidence, or `NOT FOUND` — and ask the user for a single
confirmation. Treat the report as valid for the session; re-run discovery when
switching packages in a monorepo or when token/i18n/grid source files change.

Any `NOT FOUND` row that later sections require → see **When Infrastructure Is Missing**.

---

## Mandatory Workflow

> Every step is subject to the Blocking Decision Gates below — **gates always win**
> over workflow ordering.

1. Check if an existing shared component satisfies the requirement.
2. If new visual semantics are needed, **identify** the required tokens and pass them
   through the **Token Gate** (user approval) *before* defining anything.
3. Follow token inheritance strictly: `ref → sys → comp` (or the project's 2-layer
   equivalent).
4. Implement or update the component only after token mapping is confirmed.
5. Add or update Storybook stories to cover the required visual states.
6. If any required token or component is missing, stop at the matching gate before
   continuing.
7. Run the **Self-Audit** on all changed files, then produce the **Output Contract**.

---

## Blocking Decision Gates

### Token Gate

**Stop immediately when** (3-layer projects):
- No matching component-layer token exists for the required state/variant.
- No semantic-layer token exists for the required role mapping.

**2-layer adaptation**: the comp-layer check does not apply. Stop when no
semantic/primitive token maps the required role. **Never invent a comp layer** in a
2-layer project — that is a token-architecture migration needing its own explicit
approval.

**Required response:**
- Ask the user whether to create the required tokens (batched — see Gate Mechanics).
- Do not use hardcoded fallback values.
- Do not create tokens without user confirmation.

### Composition Gate

**Stop immediately when:**
- A composite component or page section requires a child component that does not exist
  in the shared component library.

**Required response:**
- Attempt composition from existing components first.
- If not possible, ask the user whether to create a new shared child component.
- Do not create one-off inline subcomponents without approval.

### Modification Gate

**Stop immediately when:**
- A requested change alters an existing ref/sys token's value or name, or a shared
  component's API, and anything beyond the target component would be affected.

**Required response:**
- Enumerate all consumers (grep) and classify the change (value-only / rename /
  removal / API change).
- Present the consumer impact list for approval before editing.
- See [creation-procedures.md](creation-procedures.md) §6 for the rename/deprecation
  flow and re-verification steps.

### Gate Mechanics

- **Batch approvals**: complete a full pass over the task first and collect **all**
  missing tokens and components into **one** consolidated approval message — for each:
  proposed name, layer, value, referenced token, one-line justification. One approval
  covers the whole batch; do not interrogate the user item by item.
- **Blanket pre-approval**: if the task prompt already explicitly authorizes creating
  whatever tokens/components are needed, the gates are satisfied — but the Output
  Contract report is still mandatory.
- **User overrides**: if the user explicitly waives a gate or orders hardcoding,
  comply for that instance only, mark each spot with a `TODO` naming the missing
  token/component, and list every waiver as recorded debt in the Output Contract.

### When Infrastructure Is Missing

For **each** convention Phase 0 could not find that a rule below requires (token
system, Storybook, grid system, motion tokens, i18n source, theming), ask the user
**once**:

- (a) establish it now (for a missing token system, propose `design-system-extractor`
  or the minimal bootstrap in [creation-procedures.md](creation-procedures.md) §4), or
- (b) proceed with an explicitly approved reduced requirement, or
- (c) treat it as out of scope.

Record the choice in the Output Contract. Never scaffold tooling unasked; never
silently skip a mandatory step.

### Ask Templates

Deliver these in the **conversation's language**, adapting layer names to the
discovered convention. Preserve the two-part structure: state exactly what is missing,
then ask permission to create it before continuing.

- Missing token (canonical): `No matching design token exists (sys/comp layer) for
  <role/state>. Create these tokens first, then continue component work?`
- Missing component (canonical): `The existing components cannot fully compose this
  requirement. Create a new shared child component first, then continue?`
- zh-TW reference: `找不到對應的 design token（sys/comp 層）。是否要先建立這組 token，再繼續元件開發？` /
  `目前既有元件無法完整組裝此組件。是否要先建立新的共用子元件，再繼續？`

---

## Creation Procedures (After Approval)

Summary — full mechanics in [creation-procedures.md](creation-procedures.md):

- **Tokens**: work bottom-up through the discovered layer files — reuse an existing
  ref step if one covers the value, else add one (named per ref rules) → sys role
  referencing ref → comp slot referencing **sys only**. 2-layer projects stop at the
  semantic layer.
- **Theming**: every new sys color token (and its `on-*` pair) must be defined in
  **every** discovered theme context. Ref primitives are theme-invariant; comp inherits
  theming through sys.
- **Contrast**: validate every new/changed background + `on-*` pair in every theme —
  ≥ 4.5:1 body text, ≥ 3:1 large text and interactive boundaries. Report failures;
  don't silently adjust approved values.
- **New shared components**: place and export per the discovered library structure;
  define comp-token slots for every supported state **before** styling; zero literals
  in the component file; story every supported state.

---

## Universal Requirements

> **Precedence**: discovered project conventions and documented project principles
> always override any default in this skill. Never restyle existing compliant
> components toward a default; on conflict, follow the project and note the conflict
> in the Output Contract.

Apply these three in every project — they are process requirements, not aesthetics:

1. **Foreground–background contrast pairing** — every background token has a paired
   `on-*` foreground token, contrast-validated per Creation Procedures. Never assume
   white or black text.
2. **Explicit interaction states** — hover, focus-visible, and disabled (plus any
   other state the component supports) are first-class, defined at the token level.
   Focus rings must be visible; disabled must not rely on color alone.
3. **Purposeful, token-driven motion** — durations and easings come from motion
   tokens; entrance stagger and ambient phase offsets per Animation Governance.

The former "ten principles" aesthetic defaults (character-first, saturated accents,
rounded geometry, display scale, density, surface depth…) now live in
[house-style.md](house-style.md) and apply **only** when Phase 0 finds no project
design spec **and** the user confirms adopting them.

---

## Non-Negotiable Constraints

**Denied in component / page / story code** (any styling context — CSS, CSS-in-JS,
inline styles, SVG attributes):

- **Color literals in any syntax**: `#hex`, `rgb()/rgba()`, `hsl()/hsla()`, `oklch()`,
  `lab()`, `color-mix()`, named colors (`red`, `white`…), gradient stops, box-shadow
  colors, SVG `fill`/`stroke` values.
- **Duration/easing literals**: any `ms` **or `s`** value, `cubic-bezier()`, `steps()`,
  and keyword easings (`ease`, `ease-in-out`…) outside motion tokens — including inside
  `transition`/`animation` shorthands.
- **Dimension literals** (`px`/`rem`/`em` for spacing, radius, typography) when a
  tokenized alternative exists.

**Always allowed**: `0`, `currentColor`, `transparent`, `inherit`, intrinsic-layout
percentages and viewport units, unitless `line-height` when the project's type tokens
use it.

**Where the constraints apply:**

- Raw values are **required** in ref-layer token definition files and **forbidden**
  everywhere else — sys/comp definitions reference other tokens only (no cross-layer
  bypass: comp → sys, never comp → ref).
- `node_modules`, vendored code, and CSS reset files are exempt.
- `@media` breakpoint literals are permitted when they exactly match a documented
  project breakpoint; otherwise stop at the Token Gate.
- **Tailwind classification**: theme-scale utilities (`bg-primary`, `p-4` mapping to
  the theme) count as tokens; arbitrary values (`bg-[#ff0000]`, `p-[13px]`) and inline
  style objects with raw values count as hardcoded literals.

**Other constraints:**

- **No new components without approval** — see Composition Gate.
- **No display text in templates** — see i18n Rules.
- **Pre-existing violations**: these constraints bind every line you add or modify,
  regardless of surrounding style. Do not propagate existing violations into new code;
  do not refactor untouched code unprompted. Record observed violations in the Output
  Contract and offer a follow-up cleanup. If a shared component the task depends on
  itself violates the constraints, surface it via a gate-style question before
  building on it.

---

## Token Layer Rules

Apply using discovered project prefixes. **Each layer has distinct naming
responsibility:** ref names describe *raw values or scale steps*; sys names describe
*shared, reusable semantics*; comp names describe *component- or region-specific slots*.

| Layer | Role | Naming pattern (required) |
|---|---|---|
| **ref** | Raw values only (palette, spacing scale, radius, type scale, elevation) | **Primitive / intuitive only.** Names must read as the value or palette step (e.g. `*-ref-size-12` → 12px, `*-ref-color-red-50` → a red step). **Must not** encode component names, layout regions, or one-off UI chrome. |
| **sys** | Semantic roles mapped from ref (color roles, spacing roles, motion roles) | **Shared, product-wide semantics.** Role-based names any component might use. **Must not** name a specific component structure (no `button`, `input`, `card`, `bottom-bar`, etc.). |
| **comp** | Component-facing slots referencing sys only | **Component vocabulary allowed** (`button`, `input`, `card`, `bottom-bar`, …). The only layer for names tied to a particular component or composite. |

### Reference layer — intuitive primitives

- **Purpose:** a reader should infer the stored value from the name alone.
- **Do:** `*-ref-size-12`, `*-ref-color-red-50`, `*-ref-space-4`, `*-ref-radius-sm`.
- **Don't:** names describing *where* or *what UI* they belong to — e.g.
  `*-ref-spacing-bottom-bar-padding`, `*-ref-color-header-icon`. Those belong in sys
  and/or comp.

### System layer — shared semantics, not components

- **Purpose:** map ref primitives to reusable roles many components consume.
- **Do:** `*-sys-color-surface`, `*-sys-space-inline-md`, `*-sys-color-action-primary`
  (when "action primary" is a global semantic role).
- **Don't:** token names scoped to one component's internal structure
  (`*-sys-button-padding-y`, `*-sys-card-header-gap`) — push those to comp.

### Component layer — component- and region-specific slots

- **Purpose:** bind a specific component or composite to sys (and thus ref) without
  polluting lower layers.
- **Do:** `*-comp-button-padding-y`, `*-comp-bottom-bar-padding`, `*-comp-card-gap`.
- **Inheritance:** comp references **sys** only — never ref directly.

### 2-layer adaptation (primitive → semantic)

When Phase 0 finds two layers, the semantic layer plays the sys role and components
consume it directly. All comp-specific rules above are inapplicable — do not apply
them, and do not migrate the project to 3 layers without explicit approval.

---

## Animation Governance

- **Entrance animations**: use the project's enter keyframe + a stagger delay custom
  property per element. The stagger step **must be a motion token** (e.g.
  `*-sys-motion-stagger-step`, created via the Token Gate if missing); 60–80ms is the
  recommended *value for that token*, defined only in the token layer, never in
  component code.
- **Ambient animations** (float, pulse): use `animation-delay` phase offsets across
  elements — never identical timings; offsets come from motion tokens.
- **Hover transitions**: motion tokens for duration + easing. Patterns: lift
  (`translateY`), scale, or focus-fade.
- All keyframe names use the project's established prefix to avoid global conflicts.

---

## Page Composition Rules

- Use the project's discovered layout root — grid container class, or the project's
  flex/Tailwind layout idiom where no grid system exists.
- Each section is a layout cell with span and color variant classes (or the project
  equivalent).
- Color variant classes must auto-apply matching `on-*` foreground tokens.
- Responsive breakpoints: use only the project's documented breakpoints. If none
  exist, stop and ask before defining any (When Infrastructure Is Missing).

---

## i18n Rules

- **Scope**: all user-facing strings, **including** `aria-label`, `alt`, `title`, and
  `placeholder`. Storybook demo/mock copy is exempt but must never leak into component
  default props.
- **Adding keys**: infer the naming pattern and namespace from existing entries; add
  every new key to **all** discovered locale files (source-language value in the
  authoring locale, the project's untranslated marker elsewhere). Detail in
  [creation-procedures.md](creation-procedures.md) §7.
- **No i18n source found** → When Infrastructure Is Missing.

---

## Storybook Story Requirements

This is the **minimum floor**; when `design-system-to-storybook` artifacts are present
in the repo, that skill's Story Coverage conventions take precedence.

For every changed component:

- `Default` — base appearance.
- One story per supported interactive state: `Hover`, `FocusVisible`, `Disabled`, and
  `Active` / `Error` / `Loading` / `Selected` where the component supports them.
- **Themed projects**: at least one story variant rendered in the non-default theme.
- **Composite components**: a composition story showing assembly from existing shared
  components.

No Storybook in the project → When Infrastructure Is Missing.

---

## Self-Audit Before Done

Before producing the Output Contract, check every changed file (**excluding**
ref-layer token definition files, vendored code, and resets):

| Check | Pattern / method |
|---|---|
| Color literals | `#[0-9a-fA-F]{3,8}\b`, `rgba?\(`, `hsla?\(`, `oklch\(`, `lab\(`, `color-mix\(`, named colors in style values (incl. SVG `fill`/`stroke`, `box-shadow`, gradients) |
| Duration/easing literals | `[0-9.]+m?s\b` in style contexts, `cubic-bezier\(`, `steps\(`, keyword easings inside `transition`/`animation` |
| Dimension literals | `:\s*-?[0-9.]+(px\|rem\|em)` where a token exists for the concern |
| Layer bypass | comp token definitions containing `var(--*-ref-` (adapt prefix) |
| Display text | literal user-facing strings in templates/JSX, incl. `aria-label`/`alt`/`title`/`placeholder` |
| Theming | every new sys color token defined in all theme contexts |
| Lint / render | run the project's stylelint/lint if present; confirm changed stories render |

Every match is either fixed or explicitly justified under "Always allowed" /
"Where the constraints apply" scopes. Produce a one-row-per-constraint pass/fail
summary; the Output Contract may only follow a passing (or explicitly excepted) audit.

---

## Output Contract

At the end of **every task** under this skill — whether or not a gate fired — report:

- Which existing components were reused.
- Which tokens were reused or newly created, and why new ones were necessary.
- Which stories were added or updated.
- Self-Audit result (pass / exceptions with justification).
- Gate waivers and recorded debt (`TODO`s from user overrides).
- Observed pre-existing violations (not fixed), with a follow-up cleanup offer.
- New i18n keys and their untranslated locales.
- **Doc write-back**: if the project maintains token docs, a component catalog, or a
  design-system package (`TOKEN_ARCHITECTURE.md`, `COMPONENT_INVENTORY.md`), update
  them to include every newly created token/component in the same change, and report
  which files were updated.

---

## Additional Reference

- [principles.md](principles.md) — rationale for the universal requirements.
- [house-style.md](house-style.md) — default fallback design language (opt-in only).
- [creation-procedures.md](creation-procedures.md) — post-approval creation,
  modification, theming, contrast, bootstrap, and i18n mechanics.
