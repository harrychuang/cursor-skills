---
name: design-system-governance
description: Enforces token-first, composition-first governance for any design system project. Auto-detects the project's token naming conventions, grid system, animation keyframes, and shared component library before applying rules. Use when building UI components, composite layouts, pages, design tokens, or Storybook stories — or when the user mentions design tokens, hardcoded styles, component reuse, animations, i18n text, or design system governance.
---

# Design System Governance

## Phase 0: Discover Project Conventions (Always First)

Before any implementation, scan the project to establish:

| Convention | Where to look | What to find |
|---|---|---|
| **Token naming** | `src/styles/`, `*.css`, `*.scss`, `tokens/` | prefix for ref / sys / comp layers (e.g. `md-ref-`, `sd-sys-`); verify names follow **Token Layer Rules** (ref = primitives only; sys = shared semantics; comp = component/region slots) |
| **Token layer structure** | Token files | Are there 3 layers (ref → sys → comp) or 2 (primitive → semantic)? |
| **Grid / layout system** | CSS, HTML templates | Class prefix for page grid, cell spans, color variants |
| **Animation keyframes** | CSS files | Keyframe name prefix, motion token names |
| **Shared components** | `src/components/`, Storybook | List of available shared components |
| **i18n source** | `src/`, `locales/`, `i18n.json` | Path to display text source file |

Record findings before proceeding. If the project has no token system, stop and ask the user whether to establish one first.

---

## Mandatory Workflow

1. Check if an existing shared component satisfies the requirement.
2. If new visual semantics are needed, define or extend tokens first (using discovered layer structure).
3. Follow token inheritance strictly: `ref → sys → comp` (or project equivalent).
4. Implement or update the component only after token mapping is confirmed.
5. Add or update Storybook stories to cover key visual states.
6. If any required token or component is missing, stop and ask the user before continuing.

---

## Blocking Decision Gates

### Token Gate
**Stop immediately when:**
- No matching component-layer token exists for the required state/variant.
- No semantic-layer token exists for the required role mapping.

**Required response:**
- Ask user whether to create the required tokens.
- Do not use hardcoded fallback values.
- Do not create tokens without user confirmation.

### Composition Gate
**Stop immediately when:**
- A composite component or page section requires a child component that does not exist in the shared component library.

**Required response:**
- Attempt composition from existing components first.
- If not possible, ask user whether to create a new shared child component.
- Do not create one-off inline subcomponents without approval.

### Ask Templates
Use these exact prompts (adapt layer names to the discovered project convention):
- Missing token: `找不到對應的 design token（sys/comp 層）。是否要先建立這組 token，再繼續元件開發？`
- Missing component: `目前既有元件無法完整組裝此組件。是否要先建立新的共用子元件，再繼續？`

---

## Design Principles (Universal)

Apply all ten when writing or reviewing UI:

1. **Character-first visual focus** — strong personality over generic appearance.
2. **Saturated accent colors on neutral surfaces** — avoid muted-on-muted combinations.
3. **Rounded, friendly geometry** — pill-like interactive affordances; avoid sharp corners on interactive elements.
4. **Section-based narrative rhythm** — modular page blocks with clear entry points.
5. **Bold display scale** — use large display typography (36–96px) for brand and hero contexts.
6. **Dense content with scan hierarchy** — group related elements; support F-pattern and Z-pattern reading.
7. **Foreground–background contrast pairing** — every background token must have a paired `on-*` foreground token. Never assume white or black text.
8. **Emotional visuals with explicit accessibility states** — hover, focus-visible, disabled states must all be defined.
9. **Purposeful motion** — use token-driven durations and easings; staggered entrance; ambient phase-offset animations.
10. **Layered surface depth** — use the project's surface container and elevation system; avoid flat single-surface layouts.

---

## Non-Negotiable Constraints

- **No hardcoded color literals** (`#hex`, `rgb`, `hsl`) in component code — always use tokens.
- **No hardcoded spacing/radius/typography values** when tokenized alternatives exist.
- **No cross-layer token bypass** — comp tokens must not reference ref tokens directly.
- **No new components without approval** — see Composition Gate.
- **No animation `ms` values or `cubic-bezier` literals** — always use discovered motion tokens.
- **No display text in templates** — all user-facing strings must come from the project's i18n source file.

---

## Token Layer Rules

Apply using discovered project prefixes. **Each layer has distinct naming responsibility:** ref names describe *raw values or scale steps*; sys names describe *shared, reusable semantics*; comp names describe *component- or region-specific slots*.

| Layer | Role | Naming pattern (required) |
|---|---|---|
| **ref** | Raw values only (palette, spacing scale, radius, type scale, elevation) | **Primitive / intuitive only.** Names must read as the value or palette step (e.g. `*-ref-size-12` → 12px, `*-ref-color-red-50` → a red step). **Must not** encode component names, layout regions, or one-off UI chrome. |
| **sys** | Semantic roles mapped from ref (color roles, spacing roles, motion roles) | **Shared, product-wide semantics.** Role-based names any component might use. **Must not** name a specific component structure (no `button`, `input`, `card`, `bottom-bar`, etc.). |
| **comp** | Component-facing slots referencing sys only | **Component vocabulary allowed** (`button`, `input`, `card`, `bottom-bar`, …). This is the only layer for names tied to a particular component or composite. |

### Reference layer — intuitive primitives

- **Purpose:** A reader should infer the stored value from the name alone (size, color step, spacing step, radius step).
- **Do:** `*-ref-size-12`, `*-ref-color-red-50`, `*-ref-space-4`, `*-ref-radius-sm` (adapt prefix to the project).
- **Don't:** Names that describe *where* or *what UI* they belong to — e.g. `*-ref-spacing-bottom-bar-padding`, `*-ref-color-header-icon`. Those concerns belong in **sys** (shared semantic) and/or **comp** (component slot), not ref.

### System layer — shared semantics, not components

- **Purpose:** Map ref primitives to reusable roles (surface / on-surface / border / focus / inline spacing roles, etc.) that many components consume.
- **Do:** Names that could apply across multiple components: e.g. `*-sys-color-surface`, `*-sys-space-inline-md`, `*-sys-color-action-primary` (if “action primary” is a global semantic role).
- **Don't:** Token names scoped to one component’s internal structure (e.g. `*-sys-button-padding-y`, `*-sys-card-header-gap`). Push those to **comp**; keep sys vocabulary generic.

### Component layer — component- and region-specific slots

- **Purpose:** Bind a specific component or composite (button, input, card, bottom bar, …) to sys (and thus ref) without polluting lower layers.
- **Do:** `*-comp-button-padding-y`, `*-comp-bottom-bar-padding`, `*-comp-card-gap` — names may reference the component or layout region.
- **Inheritance:** Comp references **sys** only (never ref directly), per constraints above.

---

## Animation Governance

- **Entrance animations**: use the project's enter keyframe + stagger delay custom property per element (60–80ms increment per step).
- **Ambient animations** (float, pulse): use `animation-delay` phase offset across multiple elements — never identical timings.
- **Hover transitions**: use motion tokens for duration + easing. Patterns: lift (`translateY`), scale, or focus-fade.
- All keyframe names must use the project's established prefix to avoid global conflicts.

---

## Page Composition Rules

- Use the project's grid container class as the page root.
- Each section is a grid cell with span and color variant classes.
- Color variant classes must auto-apply matching `on-*` foreground tokens.
- Responsive breakpoints: follow the project's established breakpoints (typically 960px / 600px step-down).

---

## Storybook Story Requirements

For every changed component, include stories covering:
- `Default` — base appearance.
- `Hover` — if the component has interactive hover state.
- `FocusVisible` — keyboard focus ring.
- `Disabled` — if the component supports disabled state.

For composite components, include a composition story showing assembly from existing shared components.

---

## Output Contract

When proceeding after user approval, always report:
- Which existing components were reused.
- Which tokens were reused or newly created.
- Why new tokens/components were necessary.
- Which stories were added or updated.

---

## Additional Reference
- [principles.md](principles.md) — extended rationale for each design principle.
