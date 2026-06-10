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

Before finalizing tokens, build a candidate list from all observed raw values and review near duplicates.

Stop and ask the developer when either condition appears:

- two reference colors are visually very close, including exact duplicates
- two reference numbers in the same value family and unit group are very close, such as `15px` and `16px`, `6px` and `8px`, `0.10` and `0.12`, or `180ms` and `200ms`
- two system tokens have close resolved reference values and similar semantic role/category
- two component tokens have close resolved reference values and similar component category, slot/anatomy, and state

For system/component tokens, compare the inheritance graph before making a dedupe recommendation:

```txt
component token -> system token -> reference token -> raw value
```

The review should include the token purpose, inheritance chain, resolved raw value, and why the usage is considered close. Do not merge component tokens only because their raw values are close; different components, slots, or states can justify `keep distinct`.

The decision must be one of:

- `merge`: use one reference token and map all roles to it
- `keep distinct`: keep both tokens because they have different source evidence, semantic intent, or component behavior

Record the decision in `design-system/TOKEN_ARCHITECTURE.md` under `Near Token Decisions`. The audit also accepts an adjacent CSS comment when the decision needs to travel with the token:

```css
:root {
  /* token-review: keep-distinct; confirmed body text and metadata use separate optical sizes. */
  --md-ref-size-15: 15px;
  --md-ref-size-16: 16px;
}
```

Do not silently round, merge, or split close values. The review step exists to protect design intent and prevent accidental token sprawl.

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
- `--md-comp-typographic-hero-lockup-headline-text-size`
- `--md-comp-typographic-metric-pair-value-line-height`

## Required Token Families

At minimum, extract:

- color: background, surface, surface variants, primary, secondary, success, warning, error, outline, disabled
- foreground pairs: `on-*` for every background-like color
- typography: display, headline, title, body, label, metadata, numeric
- text composition: typographic component slot sizes, weights, line-heights, colors, gaps, alignment, max widths, and wrapping/truncation rules when a repeatable text structure is observed
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
- Near color and numeric reference tokens must be merged or documented with a developer-confirmed keep-distinct decision.
- Usage-aware system/component token pairs with close purpose and close resolved values must be merged or documented with a developer-confirmed keep-distinct decision.
- Run strict audit mode after extraction; empty starter templates may use non-strict mode.
- Background-like system colors need matching `on-*` foreground tokens.
- Component docs and component CSS tokens should stay in sync.
