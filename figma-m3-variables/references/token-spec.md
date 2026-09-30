# Token Spec — M3 Three-Tier Naming and Vocabulary

> Used by the `figma-m3-variables` skill. Defines naming, encoding, the default Sys vocabularies, component state naming, composite styles, translucent colors, collections, scopes, the bindable property map, and a complete example.
> **Scales and names that already exist in the file always take precedence over the defaults in this document.**

Contents

1. Layers and naming responsibilities
2. Name encoding
3. Ref categories
4. Sys vocabularies
5. Comp naming and component states
6. Composite tokens: typography and elevation
7. Translucent colors and composed colors
8. Collections and modes
9. WEB code syntax
10. Scopes
11. Bindable property map
12. Filled Button — full example
13. Component binding patterns

---

## 1. Layers and naming responsibilities

| Layer | Question it answers | May contain component or region names? | Stores |
|-------|---------------------|----------------------------------------|--------|
| **ref** | What is the raw value? | **No** — only primitives, scales, and value labels | Raw values: hex, px, weight, font family |
| **sys** | What role does the product use everywhere? | **No** — shared vocabulary only | Aliases to Ref (or composed values of Ref tokens, §7) |
| **comp** | How does **this** component use tokens? | **Yes** — component, variant, state, anatomy | Aliases to Sys (or composed values of Sys tokens, §7) |

```
{prefix}/ref/{category}/{value-or-scale}
{prefix}/sys/{category}/{role}
{prefix}/comp/{component}[/{variant}][/{size}][/{condition}][/{state}]/{anatomy}/{property}
```

Rules:

- Sys aliases Ref only; Comp aliases Sys only; nodes are never bound to Ref.
- Single-value properties (color, radius, spacing, size, stroke width, layer opacity) bind to **Comp** tokens. Use Sys directly only for page-level primitives that belong to no component.
- Composite properties (typography, elevation) bind through **Styles** whose fields are bound to Sys tokens (Styles mode, the default) — see §6.
- **Prefix examples**: `md`, `dd`, `bd`. The prefix is inferred from the file or confirmed once per session.

| Layer | Good | Bad | Why bad |
|-------|------|-----|---------|
| ref | `ref/spacing/16`, `ref/radius/12`, `ref/color/blue/50`, `ref/palette/primary/40` | `ref/spacing/button/padding-h`, `ref/color/top-app-bar/surface` | Names a component or region — belongs in Comp |
| sys | `sys/color/primary`, `sys/spacing/inset-horizontal-md`, `sys/shape/corner-full` | `sys/spacing/button-padding-h`, `sys/color/navigation-bar-label` | Tied to one component's anatomy — push it to Comp |
| comp | `comp/filled-button/container/padding-horizontal`, `comp/text-field/label-text/color` | `comp/filled-button/container/background-color` aliasing a Ref token | Comp must alias Sys |

---

## 2. Name encoding

| Rule | Example |
|------|---------|
| Segments use only lowercase `a–z`, digits, `-`, `_` | `inset-horizontal-md` |
| Never use `.`, `{`, `}` (Figma rejects them) or a leading `$` (reserved by DTCG) | — |
| Decimal point → `_` | 0.5 → `0_5`, 1.25 → `1_25` |
| Negative number → `neg-` prefix | −0.25 → `neg-0_25` |
| Opacity → integer percentage | 0.38 → `38` |
| Color tone → rounded CIE L* (M3 HCT tone equals L*) | #1A73E8 (L* 49.9) → `50` |
| Color with alpha → `-a{percentage}` suffix | #000000 at 15% → `ref/color/neutral/0-a15` |
| Pill radius → `9999` | `ref/radius/9999` |
| Name collision between two kept values → the value with more uses keeps the name; the others get `-b`, `-c`, … (confirmed in the token plan) | `ref/color/blue/50`, `ref/color/blue/50-b` |
| Do not let a variable name also be the group prefix of another variable | Avoid `…/background-color` plus `…/background-color/hovered` (DTCG treats a token that is also a group as invalid) |

| Raw value | Ref name |
|-----------|----------|
| Letter spacing 0.5 px | `ref/type/tracking/0_5` |
| Letter spacing −0.25 px | `ref/type/tracking/neg-0_25` |
| Opacity 38% | `ref/opacity/38` |
| #1A73E8 (L* 49.9, blue hue) | `ref/color/blue/50` |
| #000000 at 15% alpha in a shadow | `ref/color/neutral/0-a15` |
| Corner radius for a pill shape | `ref/radius/9999` |

---

## 3. Ref categories

All Ref variables have scope `[]` (hidden from pickers). Optionally set `hiddenFromPublishing = true` when the file is published as a library.

| Category | Pattern | Type | Example | Stored value |
|----------|---------|------|---------|--------------|
| Color by hue | `ref/color/{hue}/{tone}` | COLOR | `ref/color/blue/50` | #1A73E8 |
| Palette by key color | `ref/palette/{key}/{tone}` | COLOR | `ref/palette/primary/40` | #6750A4 |
| Color with alpha | `ref/color/{hue}/{tone}-a{pct}` | COLOR | `ref/color/neutral/0-a15` | #000000, alpha 0.15 |
| Spacing | `ref/spacing/{n}` | FLOAT | `ref/spacing/16` | 16 |
| Radius | `ref/radius/{n}` | FLOAT | `ref/radius/12`, `ref/radius/9999` | 12, 9999 |
| Size (also shadow offsets, blur, spread) | `ref/size/{n}` | FLOAT | `ref/size/40`, `ref/size/neg-1` | 40, −1 |
| Stroke width | `ref/stroke-width/{n}` | FLOAT | `ref/stroke-width/1` | 1 |
| Opacity | `ref/opacity/{pct}` | FLOAT | `ref/opacity/38` | 38 (0–100) |
| Font family | `ref/type/family/{slug}` | STRING | `ref/type/family/roboto` | "Roboto" |
| Font weight | `ref/type/weight/{n}` | FLOAT | `ref/type/weight/500` | 500 |
| Font style (only when needed, §6-4) | `ref/type/style/{slug}` | STRING | `ref/type/style/semibold-italic` | "SemiBold Italic" |
| Font size | `ref/type/size/{n}` | FLOAT | `ref/type/size/14` | 14 |
| Line height | `ref/type/line-height/{n}` | FLOAT | `ref/type/line-height/20` | 20 (px) |
| Letter spacing | `ref/type/tracking/{n}` | FLOAT | `ref/type/tracking/0_1` | 0.1 (px) |

**Color category choice**: if the file already stores key-color palettes (`ref/palette/primary/…`), keep them and reuse them; new colors that belong to no known key color use `ref/color/{hue}/{tone}`. Never store a color twice under two names.

**Hue families** (HSL hue of the sRGB color; a color whose CIELAB chroma is below 10 is `neutral` regardless of hue):

| Family | HSL hue |
|--------|---------|
| neutral | chroma < 10 |
| red | 345–360 and 0–15 |
| orange | 15–45 |
| yellow | 45–70 |
| green | 70–165 |
| teal | 165–195 |
| blue | 195–255 |
| purple | 255–290 |
| pink | 290–345 |

The `tone`, `hueFamily`, and `deltaE` helpers are in [binding-recipes.md](binding-recipes.md) §1.

---

## 4. Sys vocabularies

Defaults for files without Sys tokens. When the file already has a scale, map to the file's scale instead.

### 4-1 Color roles (M3)

| Group | Roles | Typical use (used for inference in value-harvest.md §8) |
|-------|-------|---------------------------------------------------------|
| Accent | `primary`, `on-primary`, `primary-container`, `on-primary-container`; the same four for `secondary` and `tertiary` | Calls to action, active states, links; tinted containers |
| Error | `error`, `on-error`, `error-container`, `on-error-container` | Errors, destructive actions |
| Surface | `surface`, `on-surface`, `on-surface-variant`, `surface-dim`, `surface-bright`, `surface-container-lowest`, `surface-container-low`, `surface-container`, `surface-container-high`, `surface-container-highest` | Backgrounds, cards, sheets, primary and secondary text |
| Outline | `outline`, `outline-variant` | Borders (`outline`), dividers and subtle borders (`outline-variant`) |
| Inverse | `inverse-surface`, `inverse-on-surface`, `inverse-primary` | Snackbars, tooltips |
| Utility | `scrim`, `shadow` | Overlays (applied at 32% in M3), shadow colors |
| Fixed (optional) | `primary-fixed`, `primary-fixed-dim`, `on-primary-fixed`, `on-primary-fixed-variant`; the same for `secondary` and `tertiary` | Colors that stay the same in light and dark themes |
| Extensions (not M3) | `success`, `on-success`, `success-container`, `on-success-container`; the same for `warning` | Status colors |

Legacy roles (`background`, `on-background`, `surface-variant`, `surface-tint`) are kept when the file already has them; do not create them in new files.

### 4-2 Spacing

Sys spacing names are `sys/spacing/{role}-{label}`, for example `sys/spacing/inset-horizontal-md`.

| Role | Used for |
|------|----------|
| `inset-horizontal` | Left and right padding |
| `inset-vertical` | Top and bottom padding |
| `inset` | Equal padding on all four sides |
| `gap-inline` | Item spacing of horizontal auto layout; column gap of grid layout |
| `gap-stack` | Item spacing of vertical auto layout; counter-axis spacing of wrapping layouts; row gap of grid layout |

One ladder is shared by every role — a label means the same value under every role:

| Label | `3xs` | `2xs` | `xs` | `sm` | `md` | `lg` | `xl` | `2xl` | `3xl` | `4xl` | `5xl` |
|-------|-------|-------|------|------|------|------|------|-------|-------|-------|-------|
| Value | 2 | 4 | 8 | 12 | 16 | 20 | 24 | 32 | 40 | 48 | 64 |

Zero padding and zero gaps are not tokenized unless variants of one component differ in that value; then use `{role}-none` → `ref/spacing/0`.

### 4-3 Shape (M3, including M3 Expressive)

| Sys token | Value | Ref |
|-----------|-------|-----|
| `sys/shape/corner-none` | 0 | `ref/radius/0` |
| `sys/shape/corner-extra-small` | 4 | `ref/radius/4` |
| `sys/shape/corner-small` | 8 | `ref/radius/8` |
| `sys/shape/corner-medium` | 12 | `ref/radius/12` |
| `sys/shape/corner-large` | 16 | `ref/radius/16` |
| `sys/shape/corner-large-increased` | 20 | `ref/radius/20` |
| `sys/shape/corner-extra-large` | 28 | `ref/radius/28` |
| `sys/shape/corner-extra-large-increased` | 32 | `ref/radius/32` |
| `sys/shape/corner-extra-extra-large` | 48 | `ref/radius/48` |
| `sys/shape/corner-full` | pill | `ref/radius/9999` |

A radius at least half of the node's shorter side renders as a pill and maps to `corner-full`. When only some corners are rounded, bind the rounded corners and leave the zero corners unbound (zero radius is not tokenized).

### 4-4 Typescale (M3 baseline)

Each role has five Sys variables: `sys/typescale/{role}/font` (STRING), `/weight`, `/size`, `/line-height`, `/tracking` (FLOAT, px). Text Style name: `{role family}/{size}`, for example `label/large`.

| Role | Size / line height | Tracking | Weight | Font (M3 default) |
|------|--------------------|----------|--------|-------------------|
| `display-large` | 57 / 64 | −0.25 | 400 | brand |
| `display-medium` | 45 / 52 | 0 | 400 | brand |
| `display-small` | 36 / 44 | 0 | 400 | brand |
| `headline-large` | 32 / 40 | 0 | 400 | brand |
| `headline-medium` | 28 / 36 | 0 | 400 | brand |
| `headline-small` | 24 / 32 | 0 | 400 | brand |
| `title-large` | 22 / 28 | 0 | 400 | brand |
| `title-medium` | 16 / 24 | 0.15 | 500 | plain |
| `title-small` | 14 / 20 | 0.1 | 500 | plain |
| `body-large` | 16 / 24 | 0.5 | 400 | plain |
| `body-medium` | 14 / 20 | 0.25 | 400 | plain |
| `body-small` | 12 / 16 | 0.4 | 400 | plain |
| `label-large` | 14 / 20 | 0.1 | 500 | plain |
| `label-medium` | 12 / 16 | 0.5 | 500 | plain |
| `label-small` | 11 / 16 | 0.5 | 500 | plain |

"brand" and "plain" are the two M3 typeface roles (both Roboto by default); each maps to a `ref/type/family/{slug}` token. Optional extension: M3 Expressive emphasized styles use `sys/typescale/emphasized/{role}/*` and Text Styles `emphasized/{role family}/{size}`.

### 4-5 Elevation

| Level | M3 elevation (dp) | Sys variables | Effect Style |
|-------|-------------------|---------------|--------------|
| `level0` | 0 | none (no shadow) | none |
| `level1` | 1 | `sys/elevation/level1/shadow-{i}/{color, offset-x, offset-y, blur, spread}` | `elevation/level1` |
| `level2` | 3 | same pattern | `elevation/level2` |
| `level3` | 6 | same pattern | `elevation/level3` |
| `level4` | 8 | same pattern | `elevation/level4` |
| `level5` | 12 | same pattern | `elevation/level5` |

`{i}` numbers the shadow layers of a level from 1. Offsets, blur, and spread alias `ref/size/{n}`. The color is a composed value of `ref/palette/neutral/0` (or the file's shadow base) and `ref/opacity/{pct}` when composed colors are available, otherwise an alias of `ref/color/neutral/0-a{pct}` (§7).

### 4-6 Stroke width

| Sys token | Value | Ref |
|-----------|-------|-----|
| `sys/stroke/width-thin` | 1 | `ref/stroke-width/1` |
| `sys/stroke/width-medium` | 2 | `ref/stroke-width/2` |
| `sys/stroke/width-thick` | 3 | `ref/stroke-width/3` |

### 4-7 Size

Icon sizes and control heights are two separate ladders; their labels are not compared with each other.

| Sys token | Value |
|-----------|-------|
| `sys/size/icon-xs`, `icon-sm`, `icon-md`, `icon-lg`, `icon-xl` | 12, 16, 20, 24, 32 |
| `sys/size/control-height-sm`, `control-height-md`, `control-height-lg`, `control-height-xl` | 32, 40, 48, 56 |
| `sys/size/touch-target-min` | 48 |

All alias `ref/size/{n}`. Bind width and height only for fixed sizes: component root heights and square icons.

### 4-8 State opacity

Sys names follow M3's `md.sys.state.*` tokens (they use `hover` and `focus`, while Comp state segments use `hovered` and `focused`, as current M3 components do).

| Sys token | Value | Ref |
|-----------|-------|-----|
| `sys/state/hover/state-layer-opacity` | 8 | `ref/opacity/8` |
| `sys/state/focus/state-layer-opacity` | 10 | `ref/opacity/10` |
| `sys/state/pressed/state-layer-opacity` | 10 | `ref/opacity/10` |
| `sys/state/dragged/state-layer-opacity` | 16 | `ref/opacity/16` |
| `sys/state/disabled/container-opacity` | 12 (default) | `ref/opacity/12` |
| `sys/state/disabled/content-opacity` | 38 | `ref/opacity/38` |

M3 varies the disabled container opacity by component (10 for Expressive buttons, 12 for chips, 4 for filled text fields). Values found in the file take precedence; when a file uses more than one disabled container opacity, the extra values are `needs-review` items and the user names them.

### 4-9 Off-scale values

A value between two steps of a Sys scale is shown in a near-value review group (value-harvest.md §6) with three choices:

1. Snap to the lower step — Tier 3, changes appearance.
2. Snap to the upper step — Tier 3, changes appearance.
3. Keep it as a custom step named `{lower step}-plus` — for example spacing 14 → `sys/spacing/gap-inline-sm-plus`, radius 10 → `sys/shape/corner-small-plus`, body text of size 13 → `body-small-plus`.

When two kept values would get the same custom name, ask the user to name them. Values above the largest step extend the ladder (`6xl`, `7xl`, …).

---

## 5. Comp naming and component states

```
{prefix}/comp/{component}[/{variant}][/{size}][/{condition}][/{state}]/{anatomy}/{property}
```

This is the current M3 order (component → variant → selection → state → element → property), for example `md.comp.button.filled.hovered.state-layer.opacity`.

| Segment | Source | Values |
|---------|--------|--------|
| `{component}` | Component or component set name, last `/` segment, kebab-case | `filled-button`, `button`, `card`, `text-field` |
| `{variant}` | A style-like variant property (Style, Type, Variant, Kind, Color, Emphasis, Hierarchy) or a boolean property that changes the token | `filled`, `outlined`, `with-leading-icon` |
| `{size}` | A Size variant property that changes the token | `small`, `medium`, `large` |
| `{condition}` | Selection or validation variant | `selected`, `unselected`, `error` |
| `{state}` | Interaction variant | `hovered`, `focused`, `pressed`, `dragged`, `disabled` |
| `{anatomy}` | Part of the component | `container`, `label-text`, `supporting-text`, `headline`, `icon`, `leading-icon`, `trailing-icon`, `outline`, `divider`, `state-layer`, `active-indicator`, `input-text`, `content`, `media`, `actions` |
| `{property}` | What is bound | `background-color`, `color`, `shape`, `height`, `width`, `size`, `padding-horizontal`, `padding-vertical`, `padding`, `gap`, `opacity`; `outline/width` for stroke width; `font`, `weight`, `size`, `line-height`, `tracking` for typography in Variables mode |

A segment is included only when the token's value differs along that axis: a button's color depends on style only (`comp/button/filled/container/background-color`), and its height depends on size only (`comp/button/small/container/height`).

**Variant value mapping**

| Figma variant value | Segment |
|---------------------|---------|
| Hover, Hovered | `hovered` |
| Focus, Focused | `focused` |
| Press, Pressed | `pressed` |
| Drag, Dragged | `dragged` |
| Disabled | `disabled` |
| Selected / Unselected | `selected` / `unselected` |
| Error | `error` |
| Default, Enabled, Rest | no segment |

**File conventions win**: a file that already uses M3's older words (`hover`, `focus`) keeps them. A file that uses the legacy order with the state after the property (`…/container/background-color/hovered`) keeps that order until the user migrates it with audit rule 17; never mix the two orders in one file.

**State layers**: in hovered, focused, pressed, and dragged states the container color usually stays the same; a state-layer node on top uses the `on-{container}` color with the Sys state opacity:

| Comp token | Aliases |
|------------|---------|
| `comp/filled-button/hovered/state-layer/color` | `sys/color/on-primary` |
| `comp/filled-button/hovered/state-layer/opacity` | `sys/state/hover/state-layer-opacity` |
| `comp/filled-button/pressed/state-layer/opacity` | `sys/state/pressed/state-layer-opacity` |

**Disabled**: always dedicated tokens, never the default tokens. Container color is `on-surface` at the disabled container opacity; content color is `on-surface` at the disabled content opacity. Express the opacity with a composed color or a layer opacity token (§7) — never by baking it into a new opaque color.

**Error and success**: replace the accent group with the status group.

| Default Sys token | Error | Success (extension) |
|-------------------|-------|---------------------|
| `sys/color/primary` | `sys/color/error` | `sys/color/success` |
| `sys/color/on-primary` | `sys/color/on-error` | `sys/color/on-success` |
| `sys/color/primary-container` | `sys/color/error-container` | `sys/color/success-container` |

**Variants reference**

| Component | Typical variant dimensions | Typical states |
|-----------|----------------------------|----------------|
| Filled / Outlined / Text Button | Size, Leading icon | Enabled, Hovered, Focused, Pressed, Disabled |
| Icon Button | Style (Standard / Filled / Tonal / Outlined), Toggle | Enabled, Hovered, Focused, Pressed, Disabled, Selected |
| Card | Style (Elevated / Filled / Outlined), Clickable | Enabled, Hovered, Focused, Pressed, Dragged |
| Text Field | Style (Filled / Outlined) | Enabled, Hovered, Focused, Error, Disabled |
| Chip | Type (Assist / Filter / Input / Suggestion), Selected | Enabled, Hovered, Focused, Pressed, Disabled |
| Dialog | — | Enabled |
| Navigation Bar | — | Enabled, Selected item |
| Top App Bar | Scroll behavior (Flat / Compressed / Medium / Large) | Enabled, Scrolled |
| FAB | Size, Color | Enabled, Hovered, Focused, Pressed |
| Switch, Checkbox, Radio | Selected | Enabled, Hovered, Focused, Pressed, Disabled (Checkbox and Radio also Error) |

---

## 6. Composite tokens: typography and elevation

### 6-1 Styles mode (default)

- **Typography**: Sys typescale variables alias Ref type primitives. Each typescale role in use gets a Text Style named `{role family}/{size}` (for example `label/large`) whose fields are bound to the Sys variables: `fontFamily` ← `/font`, `fontWeight` ← `/weight`, `fontSize` ← `/size`, `lineHeight` ← `/line-height`, `letterSpacing` ← `/tracking`. Text nodes apply the Text Style.
- **Elevation**: each level in use gets an Effect Style `elevation/level{n}`; every shadow layer's color, offset x, offset y, blur, and spread are bound to the Sys elevation variables. Nodes apply the Effect Style.
- No Comp typography or elevation tokens are created; the Text Style or Effect Style name shows which role a component uses. This is the one exception to "bind Comp first".

### 6-2 Variables mode

- Text node fields are bound directly to Comp tokens `comp/{component}/{anatomy}/font`, `/weight`, `/size`, `/line-height`, `/tracking`, which alias the Sys typescale variables.
- Binding a typography variable on a node that uses a Text Style very likely detaches the style, so those nodes are Tier 2 items in the plan.
- Elevation in Variables mode binds node effects directly to the Sys elevation variables; no Comp elevation tokens.

### 6-3 Choosing the mode

1. At least half of the text nodes in scope use local Text Styles → Styles mode.
2. Otherwise, text nodes carry direct typography variable bindings → Variables mode.
3. Otherwise → Styles mode.

The token plan states the chosen mode and how to switch ("reply *variables mode* to bind typography variables on text nodes instead").

### 6-4 Typography units and fields

- Line height and letter spacing variables are **pixels**. Convert percentages with the text's font size (`value / 100 × fontSize`, two decimals). An `AUTO` line height stays unbound and is reported.
- `fontWeight` takes a FLOAT (Figma picks the nearest available weight). When a family uses non-standard style names, bind `fontStyle` with a STRING variable holding the exact style name (`ref/type/style/{slug}`) instead.
- Bindable text fields: `fontFamily`, `fontSize`, `fontStyle`, `fontWeight`, `letterSpacing`, `lineHeight`, `paragraphSpacing`, `paragraphIndent`. Paragraph spacing and indent cannot be bound on text ranges.

---

## 7. Translucent colors and composed colors

A Figma solid paint has an RGB color plus its own `opacity` (0–1); COLOR variables are RGBA. After a paint is bound to a color variable, the variable's alpha very likely drives the result and the paint's earlier opacity is not reliably kept.

**Composed color** (`VariableComposedColor`, Plugin API since 2026-09-17): a COLOR variable whose value is `{ color: alias or RGB/RGBA, opacity: number or alias }` (at least one field is an alias), with opacity in percent (0–100). Opacity tokens used inside composed colors have the `COLOR_OPACITY` scope.

| Layer | Composed value allowed? | Example |
|-------|-------------------------|---------|
| ref | No — Ref stores raw values only | — |
| sys | Yes, aliasing Ref tokens | `sys/elevation/level1/shadow-1/color` = { color → `ref/palette/neutral/0`, opacity → `ref/opacity/15` } |
| comp | Yes, aliasing Sys tokens | `comp/filled-button/disabled/container/background-color` = { color → `sys/color/on-surface`, opacity → `sys/state/disabled/container-opacity` } |

For a paint whose opacity is below 1, use the first method that applies:

1. **Composed color** — bind the paint (its own opacity 100%) to a composed color variable.
2. **Layer opacity** — for a leaf layer with exactly one visible fill and no visible strokes, effects, or children: bind the opaque base color with paint opacity 100% and bind the layer's `opacity` to an opacity token (Tier 2; visually equivalent).
3. **Alpha color** — bind a token chain that ends in an alpha-carrying Ref color (`ref/color/neutral/0-a12`).

There is no version flag for composed colors: try method 1 inside the approved write and fall back per paint group when it fails. The scripts are in [binding-recipes.md](binding-recipes.md) §6 and §7.

---

## 8. Collections and modes

| Layout | Collections | When |
|--------|-------------|------|
| Default for new files | `{Prefix} · Reference`, `{Prefix} · System`, `{Prefix} · Component` (one group per component inside Component) | The file has no token collections |
| Per component | `{Prefix} · Reference`, `{Prefix} · System`, `{Prefix} · Component · {ElementName}` | The user prefers it, or the file already uses it |
| Single collection | `{Prefix} · Design Tokens` (layers as groups) | The file already uses it |

Existing layouts are always kept.

| Collection | Modes |
|------------|-------|
| Reference | `Default` |
| System | `Default`, or `Light` + `Dark` |
| Component | `Default` |

Plan limits: modes per collection are 1 on Starter, 10 on Professional, 20 on Organization, more on Enterprise — Light and Dark need a paid plan. The error `in addMode: Limited to N modes only` means the plan limit was hit: stop and tell the user. Each collection holds at most 5,000 variables.

**Light / Dark**: add a `Dark` mode to the System collection and alias each Sys color to a different Ref tone in that mode. Comp tokens and node bindings do not change; switching the System mode switches the theme.

```js
sysPrimary.setValueForMode(lightModeId, figma.variables.createVariableAlias(refPrimary40));
sysPrimary.setValueForMode(darkModeId, figma.variables.createVariableAlias(refPrimary80));
```

---

## 9. WEB code syntax

Every variable has `codeSyntax.WEB = var(--{name})`, where `{name}` is the variable name in lowercase with `/` and spaces replaced by `-`.

```
md/ref/palette/primary/40                                → var(--md-ref-palette-primary-40)
md/ref/type/tracking/neg-0_25                            → var(--md-ref-type-tracking-neg-0_25)
md/sys/color/primary                                     → var(--md-sys-color-primary)
md/sys/spacing/inset-horizontal-md                       → var(--md-sys-spacing-inset-horizontal-md)
md/comp/filled-button/disabled/container/background-color → var(--md-comp-filled-button-disabled-container-background-color)
```

`ANDROID` and `iOS` code syntax are added only when the user asks.

---

## 10. Scopes

Scopes only filter Figma's pickers; they do not block API binding, so the skill still checks type compatibility before binding.

| Token | Type | Scopes |
|-------|------|--------|
| Every Ref token | any | `[]` |
| Accent and status roles used on fills, text, and strokes (`primary`, `secondary`, `tertiary`, `error`, `success`, `warning`, `inverse-primary`) | COLOR | `ALL_FILLS`, `STROKE_COLOR` |
| Container and surface roles (`*-container`, `surface*`, `inverse-surface`, `scrim`, fixed roles) | COLOR | `FRAME_FILL`, `SHAPE_FILL` |
| Content roles (`on-*`) | COLOR | `TEXT_FILL`, `SHAPE_FILL` |
| `outline` | COLOR | `STROKE_COLOR` |
| `outline-variant` | COLOR | `STROKE_COLOR`, `SHAPE_FILL` |
| `shadow`, elevation shadow colors | COLOR | `EFFECT_COLOR` |
| Comp `container`, `state-layer`, `active-indicator` colors | COLOR | `FRAME_FILL`, `SHAPE_FILL` |
| Comp text colors (`label-text`, `input-text`, `supporting-text`, `headline`) | COLOR | `TEXT_FILL` |
| Comp icon colors | COLOR | `SHAPE_FILL` |
| Comp `outline` colors | COLOR | `STROKE_COLOR` |
| Radius | FLOAT | `CORNER_RADIUS` |
| Spacing | FLOAT | `GAP` |
| Size | FLOAT | `WIDTH_HEIGHT` |
| Stroke width | FLOAT | `STROKE_FLOAT` |
| Opacity bound to a layer | FLOAT | `OPACITY` |
| Opacity used inside a composed color | FLOAT | `COLOR_OPACITY` |
| Opacity used both ways | FLOAT | `OPACITY`, `COLOR_OPACITY` |
| Elevation offsets, blur, spread | FLOAT | `EFFECT_FLOAT` |
| Font family / font style | STRING | `FONT_FAMILY` / `FONT_STYLE` |
| Font weight / size / line height / letter spacing | FLOAT | `FONT_WEIGHT` / `FONT_SIZE` / `LINE_HEIGHT` / `LETTER_SPACING` |
| Paragraph spacing / indent | FLOAT | `PARAGRAPH_SPACING` / `PARAGRAPH_INDENT` |
| Text content | STRING | `TEXT_CONTENT` |

Rules:

- `ALL_SCOPES` is forbidden, and it cannot be combined with anything else anyway.
- `ALL_FILLS` cannot be combined with `FRAME_FILL`, `SHAPE_FILL`, or `TEXT_FILL`.
- Scopes must match the type: COLOR takes the fill scopes, `STROKE_COLOR`, and `EFFECT_COLOR`; STRING takes `TEXT_CONTENT`, `FONT_FAMILY`, and `FONT_STYLE`; FLOAT takes `TEXT_CONTENT` and the number scopes (`CORNER_RADIUS`, `WIDTH_HEIGHT`, `GAP`, `STROKE_FLOAT`, `EFFECT_FLOAT`, `OPACITY`, `COLOR_OPACITY`, `FONT_WEIGHT`, `FONT_SIZE`, `LINE_HEIGHT`, `LETTER_SPACING`, `PARAGRAPH_SPACING`, `PARAGRAPH_INDENT`).

---

## 11. Bindable property map

| Node property | Variable type | Layer | How (scripts in binding-recipes.md §7) | Notes |
|---------------|---------------|-------|----------------------------------------|-------|
| Solid `fills[i]` color | COLOR | Comp | `setBoundVariableForPaint` on a **new** paint seeded with the resolved color | Translucent paints: §7 |
| Solid `strokes[i]` color | COLOR | Comp | same | Gradient and image paints are skipped and reported |
| `topLeftRadius`, `topRightRadius`, `bottomRightRadius`, `bottomLeftRadius` | FLOAT | Comp | `setBoundVariable` per non-zero corner | `cornerRadius` is also bindable; the skill binds corners |
| `paddingLeft`, `paddingRight`, `paddingTop`, `paddingBottom` | FLOAT | Comp | `setBoundVariable` | Auto layout only |
| `itemSpacing`, `counterAxisSpacing`, `gridRowGap`, `gridColumnGap` | FLOAT | Comp | `setBoundVariable` | Skip `itemSpacing` when spacing is "space between" |
| `width`, `height`, `minWidth`, `maxWidth`, `minHeight`, `maxHeight` | FLOAT | Comp | `setBoundVariable` | Fixed sizes only |
| `strokeWeight` or `strokeTopWeight` … `strokeLeftWeight` | FLOAT | Comp | `setBoundVariable` | Only when the node has visible strokes |
| Layer `opacity` | FLOAT (0–100) | Comp | `setBoundVariable` | `node.opacity` reads back 0–1 |
| Shadow color, offset x, offset y, blur (`radius`), spread | COLOR / FLOAT | Sys, through an Effect Style | `setBoundVariableForEffect`, then assign `style.effects` | Styles mode; verify every field afterwards |
| Text Style fields | STRING / FLOAT | Sys | `TextStyle.setBoundVariable` | Styles mode |
| Text node typography fields | STRING / FLOAT | Comp | `setBoundVariable` / `setRangeBoundVariable` | Variables mode; may detach the Text Style |
| Apply a Text Style / Effect Style | — | Sys style | `setTextStyleIdAsync` / `setEffectStyleIdAsync` | Load fonts first |

Never bind: mixed values without resolving which children get the binding; gradient and image paints; Ref tokens directly to nodes; nodes inside instances (bind the main component).

---

## 12. Filled Button — full example

Values follow the M3 baseline filled button: height 40, horizontal padding 24, pill shape, `label-large` text, icon-to-label gap 8.

### 12-1 Ref (raw values, scope `[]`)

| Token | Type | Value |
|-------|------|-------|
| `{p}/ref/palette/primary/40` | COLOR | #6750A4 |
| `{p}/ref/palette/neutral/100` | COLOR | #FFFFFF |
| `{p}/ref/palette/neutral/10` | COLOR | #1D1B20 |
| `{p}/ref/radius/9999` | FLOAT | 9999 |
| `{p}/ref/spacing/24` | FLOAT | 24 |
| `{p}/ref/spacing/8` | FLOAT | 8 |
| `{p}/ref/size/40` | FLOAT | 40 |
| `{p}/ref/opacity/8` | FLOAT | 8 |
| `{p}/ref/opacity/12` | FLOAT | 12 |
| `{p}/ref/opacity/38` | FLOAT | 38 |
| `{p}/ref/type/family/roboto` | STRING | Roboto |
| `{p}/ref/type/weight/500` | FLOAT | 500 |
| `{p}/ref/type/size/14` | FLOAT | 14 |
| `{p}/ref/type/line-height/20` | FLOAT | 20 |
| `{p}/ref/type/tracking/0_1` | FLOAT | 0.1 |

### 12-2 Sys (aliases Ref)

| Token | Aliases | Scopes |
|-------|---------|--------|
| `{p}/sys/color/primary` | `ref/palette/primary/40` | `ALL_FILLS`, `STROKE_COLOR` |
| `{p}/sys/color/on-primary` | `ref/palette/neutral/100` | `TEXT_FILL`, `SHAPE_FILL` |
| `{p}/sys/color/on-surface` | `ref/palette/neutral/10` | `TEXT_FILL`, `SHAPE_FILL` |
| `{p}/sys/shape/corner-full` | `ref/radius/9999` | `CORNER_RADIUS` |
| `{p}/sys/spacing/inset-horizontal-xl` | `ref/spacing/24` | `GAP` |
| `{p}/sys/spacing/gap-inline-xs` | `ref/spacing/8` | `GAP` |
| `{p}/sys/size/control-height-md` | `ref/size/40` | `WIDTH_HEIGHT` |
| `{p}/sys/state/hover/state-layer-opacity` | `ref/opacity/8` | `OPACITY`, `COLOR_OPACITY` |
| `{p}/sys/state/disabled/container-opacity` | `ref/opacity/12` | `OPACITY`, `COLOR_OPACITY` |
| `{p}/sys/state/disabled/content-opacity` | `ref/opacity/38` | `OPACITY`, `COLOR_OPACITY` |
| `{p}/sys/typescale/label-large/font` | `ref/type/family/roboto` | `FONT_FAMILY` |
| `{p}/sys/typescale/label-large/weight` | `ref/type/weight/500` | `FONT_WEIGHT` |
| `{p}/sys/typescale/label-large/size` | `ref/type/size/14` | `FONT_SIZE` |
| `{p}/sys/typescale/label-large/line-height` | `ref/type/line-height/20` | `LINE_HEIGHT` |
| `{p}/sys/typescale/label-large/tracking` | `ref/type/tracking/0_1` | `LETTER_SPACING` |

### 12-3 Comp (aliases Sys)

| Token | Value | Scopes |
|-------|-------|--------|
| `{p}/comp/filled-button/container/background-color` | → `sys/color/primary` | `FRAME_FILL`, `SHAPE_FILL` |
| `{p}/comp/filled-button/container/shape` | → `sys/shape/corner-full` | `CORNER_RADIUS` |
| `{p}/comp/filled-button/container/height` | → `sys/size/control-height-md` | `WIDTH_HEIGHT` |
| `{p}/comp/filled-button/container/padding-horizontal` | → `sys/spacing/inset-horizontal-xl` | `GAP` |
| `{p}/comp/filled-button/container/gap` | → `sys/spacing/gap-inline-xs` | `GAP` |
| `{p}/comp/filled-button/label-text/color` | → `sys/color/on-primary` | `TEXT_FILL` |
| `{p}/comp/filled-button/hovered/state-layer/color` | → `sys/color/on-primary` | `FRAME_FILL`, `SHAPE_FILL` |
| `{p}/comp/filled-button/hovered/state-layer/opacity` | → `sys/state/hover/state-layer-opacity` | `OPACITY` |
| `{p}/comp/filled-button/disabled/container/background-color` | composed { color → `sys/color/on-surface`, opacity → `sys/state/disabled/container-opacity` } | `FRAME_FILL`, `SHAPE_FILL` |
| `{p}/comp/filled-button/disabled/label-text/color` | composed { color → `sys/color/on-surface`, opacity → `sys/state/disabled/content-opacity` } | `TEXT_FILL` |

When composed colors are unavailable, the two disabled colors fall back to layer opacity or alpha colors (§7).

Styles (Styles mode): Text Style `label/large` with its five fields bound to `sys/typescale/label-large/*`. The filled button has no shadow at rest (`level0`).

### 12-4 Node bindings

| Node / property | Bound to |
|-----------------|----------|
| Container fills | `comp/filled-button/container/background-color` |
| Container corners | `comp/filled-button/container/shape` |
| Container height | `comp/filled-button/container/height` |
| Container `paddingLeft` / `paddingRight` | `comp/filled-button/container/padding-horizontal` |
| Container `itemSpacing` (icon and label) | `comp/filled-button/container/gap` |
| Label fills | `comp/filled-button/label-text/color` |
| Label typography | Text Style `label/large` |
| State layer fills (Hovered variant) | `comp/filled-button/hovered/state-layer/color` |
| State layer opacity (Hovered variant) | `comp/filled-button/hovered/state-layer/opacity` |
| Container fills (Disabled variant) | `comp/filled-button/disabled/container/background-color` |
| Label fills (Disabled variant) | `comp/filled-button/disabled/label-text/color` |

---

## 13. Component binding patterns

Use these patterns to classify nodes in Workflows A and E and to name anatomy in Workflow F. Components not listed follow the same Ref → Sys → Comp rules.

### 13-1 Component prefixes

| Component | Comp prefix | Typical anatomy |
|-----------|-------------|-----------------|
| Filled Button | `{p}/comp/filled-button/…` | `container`, `label-text`, `leading-icon`, `trailing-icon`, `state-layer` |
| Outlined Button | `{p}/comp/outlined-button/…` | `container`, `outline`, `label-text`, `leading-icon`, `state-layer` |
| Text Button | `{p}/comp/text-button/…` | `label-text`, `leading-icon`, `state-layer` |
| Elevated Button | `{p}/comp/elevated-button/…` | `container`, `label-text`, `leading-icon` (plus an elevation Effect Style) |
| Tonal Button | `{p}/comp/filled-tonal-button/…` | `container`, `label-text`, `leading-icon`, `state-layer` |
| Button component set with a Style variant | `{p}/comp/button/{style}/…` | same as the styles above |
| Card | `{p}/comp/card/…` | `container`, `outline`, `content`, `media`, `state-layer` |
| Text Field | `{p}/comp/text-field/…` | `container`, `input-text`, `label-text`, `supporting-text`, `outline`, `active-indicator` |
| Chip | `{p}/comp/chip/…` | `container`, `label-text`, `leading-icon`, `trailing-icon`, `outline` |
| Dialog | `{p}/comp/dialog/…` | `container`, `headline`, `supporting-text`, `actions` |
| Navigation Bar | `{p}/comp/navigation-bar/…` | `container`, `active-indicator`, `label-text`, `icon` |
| Top App Bar | `{p}/comp/top-app-bar/…` | `container`, `headline`, `leading-icon`, `trailing-icon` |

### 13-2 Common Comp suffixes

| Visual property | Comp suffix |
|-----------------|-------------|
| Container fill | `container/background-color` |
| Content fill | `content/background-color` |
| Text fill | `label-text/color`, `input-text/color`, `supporting-text/color`, `headline/color` |
| Icon fill | `icon/color`, `leading-icon/color`, `trailing-icon/color` |
| Outline color / width | `outline/color` / `outline/width` |
| Shape | `container/shape` |
| Height / width | `container/height` / `container/width` |
| Icon size | `icon/size`, `leading-icon/size` |
| Padding | `container/padding-horizontal`, `container/padding-vertical`, `container/padding` |
| Gap | `container/gap`, `actions/gap` |
| State layer | `{state}/state-layer/color`, `{state}/state-layer/opacity` |
| Disabled | `disabled/container/background-color`, `disabled/label-text/color`, `disabled/container/opacity` |
| Typography (Variables mode) | `label-text/font`, `/weight`, `/size`, `/line-height`, `/tracking` |
| Elevation | Effect Style `elevation/level{n}` (Styles mode) |

### 13-3 Node binding examples

| Component | Node / property | Bound to |
|-----------|-----------------|----------|
| Card | Container fills | `…/card/container/background-color` |
| Card | Container corners | `…/card/container/shape` |
| Card | Outline strokes / stroke weight | `…/card/outline/color` / `…/card/outline/width` |
| Card (elevated) | Container effects | Effect Style `elevation/level1` |
| Text Field | Container fills | `…/text-field/container/background-color` |
| Text Field | Input text fills / typography | `…/text-field/input-text/color` / Text Style `body/large` |
| Text Field (Error variant) | Outline strokes | `…/text-field/error/outline/color` |
| Chip | Container fills / label fills | `…/chip/container/background-color` / `…/chip/label-text/color` |
| Chip (Selected variant) | Container fills | `…/chip/selected/container/background-color` |
| Navigation Bar | Active indicator fills | `…/navigation-bar/active-indicator/background-color` |
| Top App Bar | Headline fills / typography | `…/top-app-bar/headline/color` / Text Style `title/large` |

Extension process for components not listed:

1. Identify the visual properties of the node (color, stroke, radius, spacing, size, text, shadow).
2. Reuse or add Ref primitives named by value (`ref/spacing/16`, `ref/radius/12`).
3. Reuse or add Sys tokens with shared semantics from §4.
4. Add Comp tokens named by component, variant, state, and anatomy (§5), aliasing Sys.
5. Bind with Workflow A (one target), E (many targets), or F (hardcoded values).
