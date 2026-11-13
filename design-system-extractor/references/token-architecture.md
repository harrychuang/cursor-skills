# Token Architecture Rules

Use these rules when creating or auditing token files.

## Default Layers

When no project-specific token convention exists, use:

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

Naming pattern:

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
- Component docs and component CSS tokens should stay in sync.
