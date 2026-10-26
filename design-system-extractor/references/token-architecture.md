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

### Value provenance

Record a provenance for every candidate value before comparing near duplicates:

- `authored`: the value comes from an exact authored source — a Figma Variable or style, a design-system export, or a source-code token/theme file. It has no measurement error.
- `measured`: the value comes from screenshot sampling, pixel measurement, or image estimation. It carries measurement error.

Near-value thresholds exist because **measurement has error**. An `authored` value has none, so two close authored values are not noise — they are two deliberate design decisions, and collapsing them discards design intent. A token without a provenance marker is `unknown`: it can be proposed for merging but is never merged automatically.

### Review markers

Write the provenance, and optionally the usage count and the source ids, as a CSS comment on the `ref` token: in the comment immediately before the declaration, or on the same line after it. Markers are separated by semicolons and matched case-insensitively; `audit_tokens.mjs`, `generate_review_html.mjs` and `apply_token_decisions.mjs` all read them, and no other file carries provenance.

- `provenance: authored | measured` — missing marker means `unknown`
- `usage: <non-negative integer>` — observed uses in the sources; added to the `var()` reference count from the `sys` and `comp` files
- `sources: <comma-separated source ids>` — Source Inventory ids the value was taken from

```css
:root {
  --md-ref-color-blue-50: #2f6fd6; /* provenance: authored; usage: 14; sources: S1 */
  /* provenance: measured; usage: 2; sources: S2, S3 */
  --md-ref-color-blue-51: #3170d8;
  --md-ref-color-neutral-80: #c9ced6; /* no marker: unknown provenance */
}
```

### Clusters instead of pairs

`node <skill-root>/scripts/audit_tokens.mjs <target-root>` (non-strict) groups near reference tokens into clusters after the draft `ref` tokens are written, so a chain of close values is one review item rather than many pairs:

- a near edge joins two colors when their CIEDE2000 distance is `<= 3.0` and their alpha difference is `<= 0.03`, including exact duplicates; it joins two numbers in the same family and unit group under the existing per-unit-group near rule (for example `15px` and `16px`, `6px` and `8px`, `0.10` and `0.12`, `180ms` and `200ms`)
- the connected components of those edges are split at a diameter cap: `6.0` for colors, twice the base near threshold for numbers (`4` length, `100` time, `4` percent and angle, `0.04` unitless); complete-linkage merging only joins groups that share a near edge and whose largest cross distance stays within the cap, so a long chain is cut but nothing is clustered that was not near
- cluster ids `C1`, `C2`, … are assigned deterministically by kind (colors first), family, then canonical name; they are recomputed on every run, so a merge that removes a token can renumber later clusters

Each cluster has one **canonical** token, chosen in this order:

1. provenance: `authored`, then `measured`, then `unknown`
2. usage score descending: `var()` references in `tokens-sys.css` and `tokens-comp.css` plus the `usage` marker
3. a color step that is a multiple of `10`, or a length that sits on the 4px grid
4. token name ascending

### Tiers

Every non-canonical member is compared with the canonical and gets one tier and one proposed decision. The cluster tier is the most severe member tier (`must-ask` > `proposal` > `auto`).

| Member | Canonical | Distance | Tier | Proposed |
|---|---|---|---|---|
| `measured` | `authored` | within the snap threshold: color `2.0`; length `1`, time `16`, percent and angle `1`, unitless `0.01` | `auto` | `merge` (measured snaps into authored) |
| `measured` | `authored` | beyond the snap threshold but near | `proposal` | `keep distinct` |
| `measured` | `measured` | within JND: color `1.0`; numbers as above | `auto` | `merge` |
| `measured` | `measured` | beyond JND but near | `proposal` | `merge` |
| `unknown` on either side | any | any | `proposal` (never `auto`) | `keep distinct` when the other side is `authored`, otherwise `merge` |
| `authored` | `authored` | any | `must-ask` | none |

### Merge rules by provenance

- `measured` vs `measured`: measurement noise. Within JND the merge is automatic (`auto`); beyond it the merge is proposed and confirmed in one batch.
- `measured` vs `authored`: merging only ever goes *into* the authored value. Within the snap threshold the measured value is treated as an imprecise observation of the authored one and merges automatically; beyond it the default is **keep distinct**. Never round an authored value toward a measured one.
- `unknown` on either side: never automatic. Add the provenance marker if it is known; otherwise the member stays a proposal.
- `authored` vs `authored`: always stop and ask the developer. Never auto-merge, regardless of how close the values are.

The decision for a member must be one of:

- `merge`: use the canonical token and map all roles to it; when one side is `authored`, the surviving value must be the authored one
- `keep distinct`: keep both tokens because they have different source evidence, provenance, semantic intent, or component behavior

### Recording decisions

Decisions are recorded per member against the canonical in `design-system/TOKEN_ARCHITECTURE.md` under `Near Token Decisions`. The table columns are unchanged: Candidate A is the member, Candidate B is the canonical, Difference carries the distance and the tier, Rationale carries the rule and the cluster id, Confirmed by is `auto-tier` or the developer. Sample row:

```md
| --md-ref-color-blue-51 | measured | --md-ref-color-blue-50 | authored | deltaE2000 0.6 (auto) | merge | measured snaps into authored (C1) | auto-tier |
```

`node <skill-root>/scripts/apply_token_decisions.mjs <target-root> --tier <auto|proposal|must-ask>` writes these rows one tier at a time and skips members that already have a decision: the `auto` tier needs no confirmer and may also rewrite the CSS (`--rewrite-css`); `proposal` and `must-ask` require `--confirmed-by`. Write a row only after the developer confirms for those tiers; a proposal written there early reads as a decision to the audit. The audit also accepts an adjacent CSS comment when the decision needs to travel with the token:

```css
:root {
  /* token-review: keep-distinct; authored vs measured — Figma Variable is exact, screenshot sample was a different element. */
  --md-ref-size-15: 15px;
  --md-ref-size-16: 16px;
}
```

Legacy pair rows (any `TOKEN_ARCHITECTURE.md` line naming both tokens with a decision keyword) still count.

Do not silently round, merge, or split close values outside the `auto` tier. The review step exists to protect design intent and prevent accidental token sprawl.

### Length scale fit

Length `ref` values are fitted to a 4px or 8px grid as advice, never as a gate: values above `512px` and the hairlines `1` and `2` are excluded; the base with the smaller total residual wins and a tie goes to `8`; a value halfway between two steps snaps to the lower step. Residual `<= 0.5` is on-grid, `<= 1` near-grid, `> 1` an outlier. `audit_tokens.mjs` prints the fit and lists outliers as warnings in every mode; they never block `--strict`. Snap an outlier to the nearest step or record why the value is intentional.

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
- `ui-pixel-alignment` reads `a11y-remap` records and classifies the authored-vs-accessible difference as `required-adaptation`, not drift. Without the record, every parity report flags the color as a defect forever.

An accessibility remap is not a near-token merge: the authored and accessible values may be visually close (`#13895f` vs `#12845b`) or far apart. The `a11y-remap` comment counts as the documented keep-distinct decision for that pair.

## Native Unit And Source Mapping

For native iOS/Android projects, preserve source units (iOS points, Android dp/sp, CSS px/rem) and source files in `TOKEN_ARCHITECTURE.md` even though the token files use CSS custom properties as the exchange format. Use a documented canonical unit, never silently equate `pt`, `dp`, `sp`, and `px`, and run the near-token review for close cross-platform values. The rules and the `Native Unit And Source Mapping` paste-in table live in `references/native-mobile-projects.md`.

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
- Near color and numeric reference tokens are grouped into clusters; every non-canonical member must have a documented `merge` or `keep distinct` decision against the canonical.
- Near token decisions record the provenance (`authored` / `measured` / `unknown`) of both sides, the distance with its tier, and the rule with the cluster id. The `auto` tier is written mechanically by `apply_token_decisions.mjs`; `proposal` rows are confirmed in one batch; `must-ask` rows (`authored` vs `authored`) require an explicit developer decision, never an automatic merge.
- An `a11y-remap` comment or an `Accessibility Remap Decisions` row counts as the documented decision for the authored/accessible pair it names.
- Off-grid length values reported by the scale fit are warnings only.
- Run `node <skill-root>/scripts/extract_check.mjs <target-root> --locale <ui-locale>` after extraction (strict audits); use `--starter` only for an empty starter package. `audit_tokens.mjs <target-root>` without `--strict` lists clusters and undocumented members as warnings and is the mechanical way to enumerate them before applying the `auto` tier and asking once for the `proposal` tier.
- Background-like system colors need matching `on-*` foreground tokens.
- Component docs and component CSS tokens should stay in sync.
