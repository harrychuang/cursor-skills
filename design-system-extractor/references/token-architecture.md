# Token Architecture Rules

Use these rules when creating or auditing token files.

## Default Layers

When no project-specific token convention exists (see Naming Order below), use:

- `--md-ref-*`: raw values only
- `--md-sys-*`: shared semantic roles only
- `--md-comp-*`: component or region slots only

The inheritance chain is:

```txt
component token -> system token -> reference value
```

CSS example:

```css
:root {
  --md-ref-color-green-70: #9fe870;
  --md-sys-color-primary: var(--md-ref-color-green-70);
  --md-comp-primary-button-container-color: var(--md-sys-color-primary);
}
```

## Naming Order

Teams decide the order of the segments in a token name, and once it is decided every token follows it. The extractor records the order in `design-system/TOKEN_ARCHITECTURE.md` > `## Naming Order` and names every new token with it. Without a recorded order, the default naming of this document applies (`--<prefix>-comp-<component>-<part>-<property>` for comp tokens).

### Where the order comes from

Use the first source that applies:

1. The user's prompt: a slot list (`prefix > category > component > role > variant > target > state`) or example names that show one.
2. The order already recorded in `TOKEN_ARCHITECTURE.md` > `## Naming Order`.
3. Authored names in the sources (Figma Variable names, a design-system export, source-code tokens): keep their order, because file conventions win, and record it with `Source: inferred`. Ask once only when those names follow more than one order, showing each order with its token count and one example.
4. The default naming of this document.

When the prompt's order differs from the recorded one, use the prompt's order, say so, and update the record. Existing tokens keep their names until the user asks to migrate them; list the names that do not follow the new order under Open Questions in `SESSION_STATE.md`.

State the order in one non-blocking sentence of the reply that precedes the first token write, the same way as the report language: `Naming order: prefix > category > component > role > variant > target > state (prompt); say "use <order>" to change it.` The order is not a separate stop. Write a prompt-given or inferred order into `## Naming Order` in the same write as the first tokens.

### Record format

```md
## Naming Order

Order: prefix > category > component > role > variant > target > state
Source: prompt
Default state: default
CSS name: path segments joined with `-` (`shop/comp/button/color/primary/container/hovered` → `--shop-comp-button-color-primary-container-hovered`)

| Slot | Layers | Values |
|---|---|---|
| prefix | ref, sys, comp | shop |
| category | ref, sys, comp | ref, sys, comp |
| component | comp | button, chip, card, input, modal, alert |
| role | ref, sys, comp | color, font, size, spacing, shadow, elevation, motion |
| variant | ref, sys, comp | primary, on-primary, secondary, neutral, light, dark, error |
| target | sys, comp | container, corner, padding, border, heading, label |
| state | ref, sys, comp | 50, sm, md, bold, default, hovered, disabled, selected, slower |

Examples:

- `--shop-ref-color-neutral-5`
- `--shop-sys-color-primary`
- `--shop-comp-button-color-primary-container-hovered`
```

- `Order:` lists the slots separated by `>` (`→`, `->`, and `/` are also read). An empty `Order:` line or `default` means no order is recorded.
- `Source:` is `prompt`, `recorded`, or `inferred`. `Default state:` is the word for the default state (`default` unless the team chose another).
- `Values` are comma-separated. A value that contains `-` (`on-primary`) is one segment. A slot that lists a number (the tone `50` above) takes every number. `Layers` limits a slot to some layers; an empty cell means every layer.
- Unused slots are left out of a name: `--shop-sys-color-primary` has no component, target, or state.

### Building names with the order

Fill the slots of the recorded order from what the value is and where it is used. With the example order above:

| Slot | Filled from | Example |
|---|---|---|
| prefix | the package prefix | `shop` |
| category | the layer | `ref`, `sys`, `comp` |
| component | the component or region (comp only) | `button` |
| role | the kind of value | `color`, `size`, `spacing`, `font`, `shadow` |
| variant | the color family (ref), the shared role (sys), or the component's emphasis or style (comp) | `neutral`, `primary`, `on-primary` |
| target | the part the value is applied to | `container`, `label`, `border`, `corner`, `padding` |
| state | the tone or scale step (ref, sys), or the interaction state (comp) | `5`, `md`, `hovered` |

A value no vocabulary covers is named with the closest slot and added to that slot's `Values` in the same write.

### Default state under an order that puts `state` last

When a token has state variants, write the default state as its own segment: `--shop-comp-button-color-primary-container-default` next to `--shop-comp-button-color-primary-container-hovered`, never a bare `--shop-comp-button-color-primary-container` next to its hovered state. The same applies to sys tokens: `--shop-sys-color-primary` next to `--shop-sys-color-primary-hovered` becomes `--shop-sys-color-primary-default`.

The limit comes from slash paths: a Figma Variable name or a DTCG token path cannot be a token and a group at once (`shop/comp/button/color/primary/container` would also be the group of `…/container/hovered`). CSS custom properties are flat, so CSS itself is unaffected. CSS names still carry `-default`, because they stay equal to the path with `/` replaced by `-`, which lets the tokens move to Figma Variables or DTCG without renames.

`audit_tokens.mjs` reports a name whose segments go back to an earlier slot as an issue, and warns (never an issue) about `--x` next to `--x-<state>`; see Naming order audit under Audit Rules.

## Reference Color Scale

Reference color tokens use numeric palette steps from `100` to `0`.

- `100` is the lightest visible step in a palette family.
- `0` is the darkest visible step in a palette family.
- A higher number must be visually lighter than a lower number in the same family.
- Use the same direction for neutrals and chromatic palettes.
- Avoid names like `white`, `black`, `light`, `dark`, `primary`, or `surface` in reference tokens. Express those values as numeric steps, then map semantics in `sys`.

Examples:

```css
:root {
  --md-ref-color-neutral-100: #ffffff;
  --md-ref-color-neutral-70: #b8bab6;
  --md-ref-color-neutral-20: #2c302d;
  --md-ref-color-neutral-0: #000000;
}
```

Use `100 -> 0` as the default light-to-dark order unless the user explicitly asks to change the skill and audit behavior.

## Near Token Review

Before finalizing tokens, build a candidate list from all observed raw values and find near duplicates. Near duplicates are reviewed in two stages: during extraction you record a **suggested action**; a designer then **confirms** it, on the review page or in the conversation. Nothing is merged between the two.

### Value provenance

Record a provenance for every candidate value before comparing near duplicates:

- `authored`: the value comes from an exact authored source — a Figma Variable or style, a design-system export, or a source-code token/theme file. It has no measurement error.
- `measured`: the value comes from screenshot sampling, pixel measurement, or image estimation. It carries measurement error.

Near-value thresholds exist because **measurement has error**. An `authored` value has none, so two close authored values are not noise — they are two deliberate design decisions, and collapsing them discards design intent.

### Merge rules by provenance

These rules decide what you suggest; they never decide the outcome on their own:

- `measured` vs `measured`: suggesting a merge is a legitimate cleanup of measurement noise.
- `authored` vs `measured`: suggest **keep distinct**. Suggest a merge only *into* the authored value — when the evidence shows the measured value is an imprecise observation of the same element the authored value defines — and record the rationale. Never suggest rounding an authored value toward a measured one.
- `authored` vs `authored`: always suggest **keep distinct**, regardless of how close the values are. Only an explicit confirmation can merge two authored values.

Record a suggestion when either condition appears:

- two reference colors are visually very close, including exact duplicates
- two reference numbers in the same value family and unit group are very close, such as `15px` and `16px`, `6px` and `8px`, `0.10` and `0.12`, or `180ms` and `200ms`

The suggested action, and later the decision, is one of:

- `merge into` followed by the surviving token: use one reference token and map all roles to it; when one side is `authored`, the surviving value must be the authored one
- `keep distinct`: keep the tokens because they have different source evidence, provenance, semantic intent, or component behavior

### Recording

Write one row per group of close values in `design-system/TOKEN_ARCHITECTURE.md` under `Near Token Decisions`, with these columns: `Candidates`, `Provenance`, `Difference`, `Suggested action`, `Decision`, `Rationale`, `Confirmed by`.

- During extraction fill everything except `Decision` and `Confirmed by`, and keep every close value as its own reference token.
- A row holds one action. When a group mixes outcomes, write one row per outcome.
- When the action is a merge, write each token's value in parentheses after it. Once the merge is applied the token is gone, and the row is the only place its value still exists — the review page uses it to show the merged value and to offer restoring it.
- After a designer confirms, fill `Decision` with the action and `Confirmed by` with who confirmed, how, and when, then apply any merge (see the Review Decision Apply Pass in `SKILL.md`).

A row with only a suggested action is **awaiting confirmation**: the strict token audit fails on it and reports how many pairs are waiting. That is the intended state between extraction and review, not a defect.

A token name counts only when it appears whole, and a decision is read only from the `Decision` column; a cell that is empty or says `pending`, `待確認` or similar is not a decision. A row needs a confirmer only in a table that has both the `Suggested action` and the `Confirmed by` column. Tables from earlier layouts keep working: one with only `Confirmed by` (the previous template) or only `Suggested action` resolves from its decision column alone, and a line outside a table still resolves a pair when it names both tokens and a decision. When you record a decision in such a table, write into the columns it already has; adding the missing column would make every decided row in it need a confirmer.

The audit also accepts an adjacent CSS comment when a confirmed decision needs to travel with the token:

```css
:root {
  /* token-review: keep-distinct; authored vs measured — Figma Variable is exact, screenshot sample was a different element. */
  --md-ref-size-15: 15px;
  --md-ref-size-16: 16px;
}
```

Do not silently round, merge, or split close values. The review step exists to protect design intent and prevent accidental token sprawl.

## Accessibility Remap

When an authored value fails the target's accessibility requirement (for example a Figma text color below WCAG AA contrast), do **not** silently replace the token value. Record the remap in two layers so the authored intent stays visible and auditable:

1. Keep the authored value as its own `ref` token. It is real design intent; it must not disappear from the system.
2. Map the semantic `sys` role to the accessible replacement value (also a `ref` token), and link the two with a machine-readable `a11y-remap` comment.

```css
:root {
  /* authored (Figma) — fails AA as text, kept for fidelity/authored mode; see a11y-remap on sys layer */
  --md-ref-color-orange-55: #f14f2b;
  --md-ref-color-red-45: #e21e28;
}
:root {
  /* a11y-remap: authored #f14f2b (--md-ref-color-orange-55, contrast 3.56) -> accessible #e21e28 (--md-ref-color-red-45, contrast 4.72); decision D-56 */
  --md-sys-color-warning-text: var(--md-ref-color-red-45);
}
```

Also record every remap in `design-system/TOKEN_ARCHITECTURE.md` under `Accessibility Remap Decisions`, with the authored value, the accessible value, both contrast ratios, the affected sys/comp tokens, and the decision ID.

Why two layers matter downstream:

- Storybook can offer a `fidelity: authored | accessible` review mode (see `design-system-to-storybook`) so designers can see the Figma-faithful rendering while the product ships the accessible values.
- `ui-pixel-align-report` reads `a11y-remap` records and classifies the authored-vs-accessible difference as `required-adaptation`, not drift. Without the record, every parity report flags the color as a defect forever.

An accessibility remap is not a near-token merge: the authored and accessible values may be visually close (`#13895f` vs `#12845b`) or far apart. The `a11y-remap` comment counts as the documented keep-distinct decision for that pair.

## Native Unit And Source Mapping

For native iOS/Android projects, preserve source-unit evidence in `TOKEN_ARCHITECTURE.md` even when token files use CSS custom properties as the exchange/documentation format.

- Record source units and files for iOS points, Android dp, Android sp, CSS px/rem, font scale, and platform typography styles.
- Use a documented canonical unit when writing CSS-compatible reference tokens. Do not silently equate `pt`, `dp`, `sp`, and `px`.
- Add a near-token review row when close values appear across platforms or units, such as `15pt` and `16sp`, unless the user or source design system already defines the mapping.
- Treat native theme/resource files as token evidence only when they are used by captured, previewed, screenshot-tested, reachable, or user-confirmed canonical UI.
- Record platform export notes when a token should later become Swift, Kotlin, XML, or asset-catalog output.

## Reference Tokens

Reference tokens describe values. They do not describe purpose.

Allowed:

- palette steps: `--md-ref-color-lime-80`
- raw sizes: `--md-ref-size-24`
- raw radius: `--md-ref-radius-16`
- font family names: `--md-ref-typeface-inter`
- raw font weights: `--md-ref-weight-700`
- raw opacity: `--md-ref-opacity-12`

Forbidden:

- semantic names: `primary`, `surface`, `error`, `success`, `warning`
- component names: `button`, `card`, `nav`, `tab`, `input`
- layout roles: `screen-gutter`, `section-gap`, `container-padding`

## System Tokens

System tokens describe product-wide roles. They reference reference tokens only.

Allowed:

- color roles: `--md-sys-color-primary`, `--md-sys-color-surface`
- foreground pairs: `--md-sys-color-on-primary`, `--md-sys-color-on-surface`
- spacing roles: `--md-sys-spacing-screen-gutter`, `--md-sys-spacing-gap-md`
- shape roles: `--md-sys-shape-corner-md`
- type roles: `--md-sys-typescale-title-large-size`
- motion roles: `--md-sys-motion-duration-short`

Forbidden:

- component-specific anatomy: `button-padding`, `card-header-gap`, `bottom-nav-height`
- direct hardcoded values when reference tokens exist

## Component Tokens

Component tokens describe slots for a specific component or composed region. They reference system tokens only.

Default naming pattern, used when `TOKEN_ARCHITECTURE.md` records no naming order:

```txt
--md-comp-<component>-<part>-<property>
```

Examples:

- `--md-comp-primary-button-container-color`
- `--md-comp-primary-button-label-text-color`
- `--md-comp-bottom-navigation-active-icon-color`
- `--md-comp-spending-row-amount-text-size`
- `--md-comp-hero-title-lockup-headline-text-size`
- `--md-comp-metric-lockup-unit-gap`

## Required Token Families

At minimum, extract:

- color: background, surface, surface variants, primary, secondary, success, warning, error, outline, disabled
- foreground pairs: `on-*` for every background-like color
- typography: display, headline, title, body, label, metadata, numeric, editorial, brand
- typographic composition: lockup gaps, hierarchy ratios, alignment roles, max line lengths, and slot-specific type/color mappings when a text grouping is extracted as a component
- spacing: page gutters, section gaps, stack gaps, inline gaps, inset spacing
- shape: none, xs, sm, md, lg, full
- size: icon, avatar, touch target, control heights, region heights
- state: hover, pressed, focus, selected, disabled opacities
- motion when observed or needed by interaction specs

## Audit Rules

- `comp` tokens must not reference `ref` tokens directly.
- `sys` names must not include component names.
- `ref` names must not include semantic role names.
- `ref` color tokens must use numeric palette steps from `100` lightest to `0` darkest.
- Near color and numeric reference tokens need a designer-confirmed decision: `Decision` and `Confirmed by` filled in the `Near Token Decisions` row. A suggested action alone leaves the pair awaiting confirmation, and the strict audit fails.
- Near values are never merged before that confirmation.
- Near token rows record the provenance (`authored` / `measured`) of the candidates; `authored` vs `authored` pairs are merged only on an explicit confirmation.
- An `a11y-remap` comment or an `Accessibility Remap Decisions` row counts as the documented decision for the authored/accessible pair it names.
- Run strict audit mode after extraction; empty starter templates may use non-strict mode.
- Background-like system colors need matching `on-*` foreground tokens.
- When `TOKEN_ARCHITECTURE.md` records a naming order, every token name follows it; a name whose segments go back to an earlier slot is an issue in every mode.
- A token `--x` next to `--x-<state>` is a warning in every mode, never an issue: name the default state explicitly (`--x-default`) so the names also work as Figma Variable or DTCG paths.
- Component docs and component CSS tokens should stay in sync.

### Naming order audit

`audit_tokens.mjs` reads the order with `scripts/naming_order.mjs`:

- stdout prints `Naming order: <slots joined by " > "> (TOKEN_ARCHITECTURE.md)` when `## Naming Order` records an order, otherwise `Naming order: default (none recorded)`.
- With a recorded order, every ref, sys, and comp name is split into slots by the longest vocabulary match: the text before the category word is the prefix, numbers go to the slot that lists numbers, and segments outside the vocabulary, or in a slot whose `Layers` cell excludes the token's layer, are skipped. A name whose segments go back to an earlier slot is an issue in every mode: `Token name does not follow the recorded naming order (<order>): <name> — "<segment>" (<slot>) comes after "<segment>" (<slot>)`, ending with `; expected <name>` when every segment is classified.
- A token `--x` next to `--x-<state>` (a value of the recorded `state` slot, or without one `default`, `hovered`, `hover`, `focused`, `focus`, `focus-visible`, `pressed`, `dragged`, `disabled`, `selected`, `unselected`, `checked`) produces one warning in every mode, never an issue: `Token is also a group once names become slash paths (Figma Variables, DTCG): <x> next to <children>; CSS is unaffected. Name the default state explicitly: <x>-default`.
- Regression tests: `node --test <skill-root>/scripts/test_naming_order.test.mjs`, over the `scripts/fixtures/naming-order` fixture.
