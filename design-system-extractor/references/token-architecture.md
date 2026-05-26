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
  --md-ref-color-green-60: #9fe870;
  --md-sys-color-primary: var(--md-ref-color-green-60);
  --md-comp-primary-button-container-color: var(--md-sys-color-primary);
}
```

## Reference Tokens

Reference tokens describe values. They do not describe purpose.

Allowed:

- palette steps: `--md-ref-color-lime-60`
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

## Required Token Families

At minimum, extract:

- color: background, surface, surface variants, primary, secondary, success, warning, error, outline, disabled
- foreground pairs: `on-*` for every background-like color
- typography: display, headline, title, body, label, metadata, numeric
- spacing: page gutters, section gaps, stack gaps, inline gaps, inset spacing
- shape: none, xs, sm, md, lg, full
- size: icon, avatar, touch target, control heights, region heights
- state: hover, pressed, focus, selected, disabled opacities
- motion when observed or needed by interaction specs

## Audit Rules

- `comp` tokens must not reference `ref` tokens directly.
- `sys` names must not include component names.
- `ref` names must not include semantic role names.
- Run strict audit mode after extraction; empty starter templates may use non-strict mode.
- Background-like system colors need matching `on-*` foreground tokens.
- Component docs and component CSS tokens should stay in sync.
