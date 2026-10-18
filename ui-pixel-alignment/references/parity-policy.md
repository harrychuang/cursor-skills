# Parity Policy — What Must Match, What Should Differ

Cross-platform comparison fails in a specific way: the agent treats every difference as a defect, "fixes" legitimate platform behavior, and ships a web page with native chrome or an app that ignores its own HIG. This policy is what prevents that.

Every field difference lands in exactly one of four classes.

| Class | Meaning | Report as |
|---|---|---|
| `strict` | Must match. A difference is drift. | finding, `intent: "drift"` |
| `adaptive` | May differ when the form factor or platform justifies it. | finding only when unjustified, `intent: "adaptation"`, severity capped at `low` |
| `required-adaptation` | Must **not** match — the platform demands a different value. Copying the reference verbatim is the defect. | finding when the implementation copied the reference, `intent: "required-adaptation"` |
| `ignored` | Not comparable across these platforms. | never a finding |

## The axis that matters is form factor, not framework

React Native at 390pt and web at 390px should have **identical** spacing. Desktop web at 1440px and a phone app at 390pt should not.

So classify by the viewport relationship first:

- **Same form factor** (both sides within ~15% viewport width, same device class): spacing, sizing, and typography are `strict`. This is the common case for "here is the Figma, fix my app" and for "port this screen from iOS to Android".
- **Cross form factor** (desktop reference vs phone target, or the reverse): spacing and sizing become `adaptive`. Compare *ratios and roles* — the type ramp's relative steps, the spacing rhythm's multiples, the hierarchy — not absolute pixels. Color, weight, radius, and structure stay `strict`.

Record which case applies in the report summary. A cross-form-factor audit that reports absolute pixel deltas as `high` severity is producing noise.

## Default classification

### Always `strict`

Brand identity and information hierarchy survive every platform change.

- `background`, `fill`, `border.color` — brand and semantic colors
- `border.width`, `border.style`
- `radius`
- `type.weight`
- `type.size` — strict within a form factor; ratio-only across form factors
- `layout.mode`, `layout.justify`, `layout.align` — structural intent
- Node presence, and reading order within a region
- Icon and image identity (`asset`)
- `text` content — a copy difference is a real bug even when nobody filed it as one

### Always `adaptive`

- `type.family` — font substitution is expected (Inter → SF Pro Text on iOS, Roboto on Android). Legitimate only when the design system names the substitute; an arbitrary swap is drift.
- `type.letterSpacing` — platform text rendering differs; tolerance 0.1px, and never file a finding below 0.25px.
- `type.lineHeight` — 1px tolerance; the reference's rounding is often the culprit.
- `box.padding`, `box.margin`, `layout.gap`, `box.width`, `box.height` — `strict` at the same form factor, `adaptive` across form factors.
- `shadow` — the exact shadow string is not portable. Compare `elevation` level instead; only compare shadow strings when both sides are web.

### `required-adaptation`

These are the cases where matching the reference is the bug.

| Situation | Required behavior |
|---|---|
| Web reference → iOS target, interactive control smaller than 44×44pt | Raise to ≥44pt. A 32pt button copied from web is a finding. |
| Web reference → Android target, control smaller than 48×48dp | Raise to ≥48dp. |
| Native reference → web target, control sized only for touch | Keeping 44px+ is fine; but the web side must add `hover` and `focus-visible` states, which the native reference has no equivalent for. |
| Any reference → app target, content at the screen edge | Respect safe-area insets. The design frame's padding is app padding; the notch/home-indicator allowance is added on top, not baked in. |
| Any reference → app target, fixed pixel heights on text containers | Native text scales with the user's accessibility font setting (Dynamic Type / `sp`). A fixed-height container that clips at larger sizes is a finding. |
| Native reference → web target, scroll-driven or bounce behavior | Do not reimplement rubber-band scrolling; use the platform default. |
| Design font not licensed for the target platform | Substitute per the design system's stated fallback and record the substitution. |
| Authored value recorded as an accessibility remap (`a11y-remap`) in the design system | Ship the accessible value. The reference shows the authored value (for example a color below WCAG AA contrast); the design system's `a11y-remap` record documents the sanctioned replacement. The implementation matching the *authored* value is the finding. When the implementation correctly shows the accessible value, report the difference as `required-adaptation` at `low` severity with the remap record cited — never as drift. |

### Accessibility remaps

Design-system packages produced by `design-system-extractor` record accessibility replacements as `a11y-remap` entries: an `a11y-remap` CSS comment next to the remapped `sys` token, plus an `Accessibility Remap Decisions` table in `TOKEN_ARCHITECTURE.md`. Before diffing, collect those records and pass them to `diff_spec.mjs` as `accessibilityRemaps` (top-level in either spec JSON, or via `--remaps`):

```jsonc
"accessibilityRemaps": [
  {
    "authored": "#f14f2b",              // the reference/authored value
    "accessible": "#e21e28",            // the shipped accessible value
    "token": "--lp-sys-color-warning-text",           // optional
    "record": "TOKEN_ARCHITECTURE.md a11y-remap D-56", // optional, cited in the finding
    "fields": ["fill", "background", "border.color"]   // optional, defaults to all color fields
  }
]
```

The script then applies the records in both directions:

- **expected ≈ authored, actual ≈ accessible** — the sanctioned state. Classified `required-adaptation` at `low`, recommended fix says no fix is needed.
- **expected ≈ authored, actual ≈ authored (equal)** — the implementation copied the value the remap exists to replace. Equal is the defect here: classified `required-adaptation` at `high` with the accessible value as the fix, and the field does **not** count toward convergence. Review the node's scope before fixing — the authored value may be legitimate in uses the remap does not cover.

A remap without a design-system record is not sanctioned — treat it as drift until the record exists.

### `ignored`

Never compared, never filed:

- OS chrome: status bar, home indicator, notch, Android navigation bar, browser chrome, scrollbars
- Safe-area inset values themselves (the *handling* is checked; the numbers are not compared)
- `hover` and `focus` states when the target is a touch-only surface
- `pressed` / ripple states when the target is a pointer-only surface
- Absolute `box.position` — position is an outcome of layout; compare the layout that produced it
- Node ids, class names, test ids
- Anything on a node marked `platformOnly: true`

## Applying the policy

`scripts/diff_spec.mjs` applies the machine-checkable part of this document from `assets/parity-policy.json` and emits candidate findings with an `intent` and a proposed severity. It also applies `accessibilityRemaps` entries and downgrades typography metrics when the capture's font environment is recorded as mismatched (see `surface.fonts` in `references/ui-spec.md`). It handles arithmetic and classification. It cannot judge:

- whether a font substitution was *sanctioned* by the design system
- whether a `platformOnly` node is genuinely platform-only or just missing
- whether a color difference changes meaning or only shade
- whether a cross-form-factor spacing change preserved the intended rhythm

One measurement artifact is worth singling out because it destroys entire reports: a capture environment whose fonts differ from the source platform (headless Chromium without PingFang, a CI box without SF Pro) shifts every text metric — ink height differences of ~30% are normal. That is not `adaptive` font substitution in the product; it is a broken measurement. Run the font environment preflight in the skill workflow before trusting any typography or text-box finding.

Review every candidate against those four questions before writing it into the final `findings.json`. Dropping a false positive is part of the job, and the report should say how many candidates were reviewed and dropped.

## Overriding

Projects with their own rules — a design system that mandates identical density on every platform, or one that deliberately runs a tighter mobile scale — should copy `assets/parity-policy.json` into the target repo and pass it with `--policy`. Note in the report which policy file was used.
