# Token Architecture

Document the token layers, prefixes, naming model, and audit rules for this package.

## Prefixes

| Layer | Prefix | Responsibility |
|---|---|---|
| Reference | `--md-ref-*` | Raw values only |
| System | `--md-sys-*` | Shared semantic roles |
| Component | `--md-comp-*` | Component and region slots |

## Inheritance

```txt
component token -> system token -> reference value
```

## Reference Color Scale

Use numeric palette steps from light to dark:

```txt
100 -> 0
```

- `100` is the lightest visible step in a palette family.
- `0` is the darkest visible step in a palette family.
- Higher numbers must be visually lighter than lower numbers in the same family.
- Semantic color names belong in `sys`, not `ref`.

## Layer Rules

| Layer | Allowed | Forbidden |
|---|---|---|
| Reference | raw color steps, sizes, weights, radius, opacity | semantic roles, component names |
| System | shared roles, foreground/background pairs, spacing roles | component anatomy |
| Component | component slots and states | raw values, direct reference values |

## Near Token Decisions

Use this table when candidate reference tokens are visually or numerically close. Stop and confirm with the developer before finalizing unresolved rows.

Provenance is `authored` (Figma Variable/style, design-system export, source-code token — no measurement error) or `measured` (screenshot sampling, pixel measurement). `measured` vs `measured` may merge through normal review; when either side is `authored`, default to keep distinct and never round the authored value away; `authored` vs `authored` always requires an explicit developer decision.

| Candidate A | Provenance A | Candidate B | Provenance B | Difference | Decision (`merge` / `keep distinct`) | Rationale | Confirmed by |
|---|---|---|---|---|---|---|---|

## Accessibility Remap Decisions

Use this table when an authored value fails an accessibility requirement (for example WCAG AA contrast) and the shipped value must differ. Keep the authored value as its own `ref` token, map the `sys` role to the accessible value, and add an `a11y-remap` CSS comment linking the two. Downstream parity tooling reads these rows to classify the difference as `required-adaptation` instead of drift.

| Decision ID | Authored value (ref token) | Authored contrast | Accessible value (ref token) | Accessible contrast | Affected sys/comp tokens | Rationale | Confirmed by |
|---|---|---|---|---|---|---|---|

## Token Recalibration

Use this table when a higher-tier authoritative source (for example production Figma with Variables) arrives after tokens were finalized from lower-tier evidence. List every affected token, recommend `merge` (measured collapses into the authored value), `keep distinct`, or `re-authorize` (replace the token value with the authored value), and get developer adjudication before applying changes.

| Token | Current value (provenance) | Authoritative value (source) | Delta | Recommendation | Developer decision | Follow-up |
|---|---|---|---|---|---|---|

## Native Unit And Source Mapping

Use this table for native iOS/Android projects when source values use platform units or platform token/resource files.

| Canonical token | Native source token/resource | Platform/unit | Source file | Evidence screen/capture | Mapping or conversion note |
|---|---|---|---|---|---|

## Required Audit

- No component token references a reference token directly.
- No system token name includes component anatomy.
- No reference token name includes semantic roles.
- Reference color steps follow `100` lightest to `0` darkest.
- Near reference colors and numbers have a documented merge or keep-distinct decision that records both provenances; pairs involving an `authored` value default to keep distinct.
- Accessibility remaps keep the authored value as a `ref` token and carry an `a11y-remap` record; the shipped `sys` mapping points at the accessible value.
- Every background-like system color has a matching foreground pair.
- For vibe-coded projects, values found only in unused CSS, demo-only components, dead code, or blocked captures are not promoted to tokens unless a keep decision is recorded in `DESIGN_EVIDENCE_MAP.md`.
- For native app projects, values found only in source-only views, unused previews, blocked captures, or unverified resources are not promoted to tokens unless a keep decision is recorded in `DESIGN_EVIDENCE_MAP.md`.
