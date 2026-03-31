# Token Spec — M3 Three-Tier Naming Rules

> This document is used by the `figma-m3-variables` skill. It defines naming conventions, component token lists, and the scope reference table.

---

## 1. Naming Structure

### Responsibility by layer

| Layer | Question it answers | May include component / screen names? |
|-------|---------------------|--------------------------------------|
| **ref** | What is the raw value? (color step, N px, weight) | **No** — only primitives, scales, and value labels. |
| **sys** | What semantic role does the product use everywhere? | **No** — shared vocabulary only (primary, error, inset-md, …). |
| **comp** | How does **this** component use tokens? | **Yes** — `button`, `card`, `bottom-bar`, `padding-horizontal`, … |

### Three-Tier Inheritance

```
{prefix}/ref/{primitive-category}/{value-or-scale}   ← Ref (raw values; no component/region names)
{prefix}/sys/{semantic-category}/{role}               ← Sys (shared semantics; no per-component anatomy)
{prefix}/comp/{component}/{property}                 ← Comp (component + structure; aliases Sys)
```

**Prefix examples**: `md`, `dd`, `bd` (confirmed by the user in Workflow B Step 1)

### Ref layer — intuitive value naming

Ref names must be **self-explanatory about the stored value**, not about UI placement.

| Good (Ref) | Meaning |
|------------|---------|
| `ref/color/red/50` | A red swatch step (or brand scale) |
| `ref/palette/primary/40` | Primary palette step 40 |
| `ref/size/12` | 12 (px or unit — document in guidelines) |
| `ref/spacing/16` | 16 |
| `ref/radius/12` | Corner radius 12 |
| `ref/type/size/14` | Type size 14 |

| Bad (Ref) | Why |
|-----------|-----|
| `ref/spacing/bottom-bar/padding` | Names a **region** — belongs in **Comp** |
| `ref/spacing/button/padding-h` | Names a **component** — belongs in **Comp** |
| `ref/color/top-app-bar/surface` | **Screen part** — use a neutral ref color + Sys semantic + Comp binding |

### Sys layer — shared semantics only

Sys maps Ref into **product-wide** meaning. Do not encode a single component’s layout.

| Good (Sys) | Bad (Sys) |
|------------|-----------|
| `sys/spacing/inset-horizontal-md` | `sys/spacing/button-padding-h` |
| `sys/spacing/inset-vertical-sm` | `sys/spacing/text-field-padding-v` |
| `sys/spacing/gap-inline-sm` | `sys/spacing/button-icon-gap` |
| `sys/color/primary` | `sys/color/navigation-bar-label` (too specific — use Comp) |

Comp tokens (e.g. `comp/filled-button/container/padding-horizontal`) alias **Sys** tokens such as `inset-horizontal-md`, not Ref tokens with “button” in the name.

### Collection Naming Rules

| Structure Option | Collection Name |
|-----------------|----------------|
| Three separate collections | `{Prefix} · Reference` / `{Prefix} · System` / `{Prefix} · Component · {ElementName}` |
| Single collection | `{Prefix} · Design Tokens` |

### Mode Naming Rules

| Collection Type | Mode Name |
|----------------|-----------|
| Ref (raw values) | `Default` |
| Sys (can support Light/Dark) | `Default` (single mode) or `Light` + `Dark` (dual mode) |
| Comp | `Default` |

---

## 2. WEB Code Syntax Format

```
var(--{prefix}-{layer}-{category}-{name})
```

Examples:
```
var(--md-ref-palette-primary-40)
var(--md-ref-size-12)
var(--md-ref-color-red-50)
var(--md-sys-color-primary)
var(--md-sys-spacing-inset-horizontal-md)
var(--md-comp-filled-button-container-background-color)
```

Rule: Layers are separated by `-` (not `/`), all lowercase, spaces replaced with `-`. Ref stays short and value-oriented (`ref-size-12`, `ref-color-red-50`); long component paths exist only under `comp-`.

---

## 3. Variable Scope Reference Table

| Token Role | Figma Scope |
|-----------|------------|
| Ref layer (all tokens) | `[]` (empty array, hidden from picker) |
| Background / container fill (Sys / Comp) | `["FRAME_FILL", "SHAPE_FILL"]` |
| Text color (Sys / Comp) | `["TEXT_FILL"]` |
| Graphic / general fill (Sys / Comp) | `["ALL_FILLS"]` |
| Border color | `["STROKE_COLOR"]` |
| Corner radius | `["CORNER_RADIUS"]` |
| Padding / gap (spacing) | `["GAP"]` |
| Width / height | `["WIDTH_HEIGHT"]` |
| Opacity | `["OPACITY"]` |
| Font Family | `["FONT_FAMILY"]` |
| Font Size | `["FONT_SIZE"]` |
| Font Weight | `["FONT_WEIGHT"]` |
| Line Height | `["LINE_HEIGHT"]` |
| Letter Spacing | `["LETTER_SPACING"]` |

---

## 4. Filled Button — Token List

### 4-1 Ref Layer (raw values)

Only **primitives and scales** — no `button`, `bar`, `card`, or other component/region segments.

| Token Name | Type | Example Value | Scope |
|-----------|------|--------------|-------|
| `{p}/ref/palette/primary/40` | COLOR | `#FF0101` | `[]` |
| `{p}/ref/palette/neutral/100` | COLOR | `#FFFFFF` | `[]` |
| `{p}/ref/palette/neutral/0` | COLOR | `#000000` | `[]` |
| `{p}/ref/palette/error/40` | COLOR | `#B3261E` | `[]` |
| `{p}/ref/radius/12` | FLOAT | `12` (or project default for “full” corners) | `[]` |
| `{p}/ref/spacing/16` | FLOAT | `16` | `[]` |
| `{p}/ref/spacing/12` | FLOAT | `12` | `[]` |
| `{p}/ref/spacing/8` | FLOAT | `8` | `[]` |
| `{p}/ref/type/size/14` | FLOAT | `14` | `[]` |
| `{p}/ref/type/weight/500` | FLOAT | `500` | `[]` |

> `{p}` = prefix confirmed by the user, e.g. `md`  
> Spacing Refs use **numbers** (`spacing/16`), not `spacing/button/...`.

### 4-2 Sys Layer (semantic, aliases Ref)

**Shared** roles — not “button padding”, not “bar height”.

| Token Name | Type | Alias Target (Ref) | Scope |
|-----------|------|-------------------|-------|
| `{p}/sys/color/primary` | COLOR | `…/ref/palette/primary/40` | `["FRAME_FILL", "SHAPE_FILL"]` |
| `{p}/sys/color/on-primary` | COLOR | `…/ref/palette/neutral/100` | `["TEXT_FILL"]` |
| `{p}/sys/color/error` | COLOR | `…/ref/palette/error/40` | `["FRAME_FILL", "SHAPE_FILL"]` |
| `{p}/sys/color/on-error` | COLOR | `…/ref/palette/neutral/100` | `["TEXT_FILL"]` |
| `{p}/sys/shape/corner-full` | FLOAT | `…/ref/radius/12` | `["CORNER_RADIUS"]` |
| `{p}/sys/spacing/inset-horizontal-md` | FLOAT | `…/ref/spacing/16` | `["GAP"]` |
| `{p}/sys/spacing/inset-vertical-sm` | FLOAT | `…/ref/spacing/12` | `["GAP"]` |
| `{p}/sys/spacing/gap-inline-sm` | FLOAT | `…/ref/spacing/8` | `["GAP"]` |

### 4-3 Comp Layer (component, aliases Sys)

**Only here** do `filled-button`, `padding-horizontal`, and `icon-label-gap` appear. They alias **Sys** tokens above.

| Token Name | Type | Alias Target (Sys) | Scope |
|-----------|------|-------------------|-------|
| `{p}/comp/filled-button/container/background-color` | COLOR | `…/sys/color/primary` | `["FRAME_FILL", "SHAPE_FILL"]` |
| `{p}/comp/filled-button/container/shape` | FLOAT | `…/sys/shape/corner-full` | `["CORNER_RADIUS"]` |
| `{p}/comp/filled-button/container/padding-horizontal` | FLOAT | `…/sys/spacing/inset-horizontal-md` | `["GAP"]` |
| `{p}/comp/filled-button/container/padding-vertical` | FLOAT | `…/sys/spacing/inset-vertical-sm` | `["GAP"]` |
| `{p}/comp/filled-button/label-text/color` | COLOR | `…/sys/color/on-primary` | `["TEXT_FILL"]` |
| `{p}/comp/filled-button/with-icon/icon-label-gap` | FLOAT | `…/sys/spacing/gap-inline-sm` | `["GAP"]` |

### 4-4 Node Binding Reference (Filled Button)

| Node Property | Bound Comp Token |
|--------------|-----------------|
| Container `fills` | `…/container/background-color` |
| Container `topLeftRadius` + other 3 corners | `…/container/shape` |
| Container `paddingLeft` / `paddingRight` | `…/container/padding-horizontal` |
| Container `paddingTop` / `paddingBottom` | `…/container/padding-vertical` |
| Text node `fills` | `…/label-text/color` |
| `itemSpacing` between icon and label | `…/with-icon/icon-label-gap` |

---

## 5. Other Components (reserved for extension)

The following components can be extended using the same three-tier structure. Token naming follows the rules in Section 1:

| Component | Comp Token Prefix |
|-----------|------------------|
| Outlined Button | `{p}/comp/outlined-button/...` |
| Text Button | `{p}/comp/text-button/...` |
| Elevated Button | `{p}/comp/elevated-button/...` |
| Tonal Button | `{p}/comp/filled-tonal-button/...` |
| Card | `{p}/comp/card/...` |
| Input / Text Field | `{p}/comp/text-field/...` |
| Chip | `{p}/comp/chip/...` |
| Dialog | `{p}/comp/dialog/...` |
| Navigation Bar | `{p}/comp/navigation-bar/...` |
| Top App Bar | `{p}/comp/top-app-bar/...` |

Extension process:
1. Identify the visual properties of the design node (color, corner radius, spacing)
2. Add **Ref** tokens only as primitives (`ref/spacing/16`, `ref/radius/12`, …) — reuse existing Ref when the numeric value already exists
3. Add or reuse **Sys** tokens with **generic** semantics (`inset-horizontal-md`, not `button-padding-h`)
4. Add **Comp** tokens for the component’s anatomy, aliasing Sys
5. Run Workflow A Step 4 to bind to component nodes

---

## 6. Light / Dark Dual-Mode Extension

The Sys layer Collection can add a second mode (`Dark`). For each Sys color token, simply set the Dark mode value to a `VARIABLE_ALIAS` pointing to a different Ref palette token:

```js
// Light mode
sysPrimary.setValueForMode(lightModeId, { type: 'VARIABLE_ALIAS', id: refPrimary40.id });
// Dark mode
sysPrimary.setValueForMode(darkModeId,  { type: 'VARIABLE_ALIAS', id: refPrimary80.id });
```

No changes are needed for the Comp layer or node bindings. Switching the Sys Collection's mode applies the theme change globally.

---

## 7. Variants & Interaction States

### 7-1 State Token Naming Convention

State-specific tokens are added as sub-properties under the relevant Comp token path:

```
{p}/comp/{component}/{property}              ← Default state (no suffix)
{p}/comp/{component}/{property}/hovered
{p}/comp/{component}/{property}/focused
{p}/comp/{component}/{property}/pressed
{p}/comp/{component}/{property}/disabled
{p}/comp/{component}/{property}/error
{p}/comp/{component}/{property}/success
```

Example (Filled Button container background):
```
md/comp/filled-button/container/background-color           → sys/color/primary
md/comp/filled-button/container/background-color/hovered   → sys/color/primary  (+ state layer overlay at 8% opacity applied in node)
md/comp/filled-button/container/background-color/disabled  → sys/color/on-surface  (opacity 0.12)
md/comp/filled-button/container/background-color/error     → sys/color/error
```

> For `hovered`, `focused`, and `pressed` states, M3 applies a **state layer** (a semi-transparent overlay on top of the base color) rather than a separate token in most cases. Only add dedicated tokens when the base color itself changes (e.g. `error`, `success`, `disabled`).

### 7-2 State Layer Opacity Values (M3 Standard)

| State | Overlay Opacity |
|-------|----------------|
| Hovered | 8% |
| Focused | 12% |
| Pressed | 12% |
| Dragged | 16% |

The state layer color is always `on-{container}` — for example, a primary-colored container uses `sys/color/on-primary` as the state layer color.

### 7-3 Component Variants Reference

| Component | Typical Variant Dimensions | Typical States |
|-----------|--------------------------|----------------|
| Filled Button | Size (SM / MD / LG), Leading Icon (Yes / No) | Default, Hovered, Focused, Pressed, Disabled |
| Outlined Button | Size, Leading Icon | Default, Hovered, Focused, Pressed, Disabled |
| Text Button | Size, Leading Icon | Default, Hovered, Focused, Pressed, Disabled |
| Icon Button | Style (Standard / Filled / Tonal / Outlined), Toggle (Yes / No) | Default, Hovered, Focused, Pressed, Disabled, Selected |
| Card | Style (Elevated / Filled / Outlined), Clickable (Yes / No) | Default, Hovered, Focused, Pressed, Dragged |
| Text Field | Style (Filled / Outlined) | Default, Hovered, Focused, Error, Disabled |
| Chip | Type (Assist / Filter / Input / Suggestion), Selected (Yes / No) | Default, Hovered, Focused, Pressed, Disabled |
| Dialog | — | Default (only) |
| Navigation Bar | — | Default, Active (selected item) |
| Top App Bar | Scroll behavior (Flat / Compressed / Medium / Large) | Default, Scrolled |
| FAB | Size (SM / MD / LG / Extended), Color (Primary / Surface / Secondary / Tertiary) | Default, Hovered, Focused, Pressed |
| Switch | Selected (Yes / No) | Default, Hovered, Focused, Pressed, Disabled |
| Checkbox | Selected (Yes / No / Indeterminate) | Default, Hovered, Focused, Pressed, Disabled, Error |
| Radio | Selected (Yes / No) | Default, Hovered, Focused, Pressed, Disabled, Error |

### 7-4 Disabled State Token Rules

Disabled states in M3 use specific color/opacity overrides rather than aliasing the Default token. Always create dedicated disabled tokens:

| Property | Disabled Token Target | Opacity |
|----------|----------------------|---------|
| Container fill | `sys/color/on-surface` | 12% |
| Label / icon color | `sys/color/on-surface` | 38% |
| Outline (outlined variants) | `sys/color/on-surface` | 12% |

In Figma, apply opacity either via the node's `opacity` property or by setting a separate `OPACITY` variable — do not bake opacity into the color token value.

### 7-5 Error / Success State Token Rules

Error and Success states replace the primary color group with semantic alternatives:

| Default Token | Error Override | Success Override |
|--------------|---------------|-----------------|
| `sys/color/primary` | `sys/color/error` | `sys/color/success` (custom, if defined) |
| `sys/color/on-primary` | `sys/color/on-error` | `sys/color/on-success` |
| `sys/color/primary-container` | `sys/color/error-container` | `sys/color/success-container` |

> `success` is not a standard M3 Sys token. If the project requires it, add `{p}/ref/palette/success/*` and `{p}/sys/color/success` / `on-success` following the same Ref → Sys → Comp chain.
