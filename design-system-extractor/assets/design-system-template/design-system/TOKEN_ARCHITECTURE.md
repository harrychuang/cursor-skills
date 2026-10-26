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
| System | shared roles, foreground/background pairs, spacing roles | component anatomy, raw values |
| Component | component slots and states | raw values, direct reference values |

## Near Token Decisions

Use this table when candidate reference tokens are visually or numerically close. The token audit groups close tokens into clusters around one canonical token; write one row per non-canonical cluster member against its canonical: Candidate A is the member, Candidate B is the canonical, Difference is the distance with the member's tier (for example `deltaE2000 0.6 (auto)`), Rationale is the rule name with the cluster id (for example `measured snaps into authored (C1)`), and Confirmed by is `auto-tier` for rows that `apply_token_decisions.mjs` wrote or the developer's name.

Provenance is `authored` (Figma Variable/style, design-system export, source-code token — no measurement error) or `measured` (screenshot sampling, pixel measurement), read from the `provenance:` marker in each ref token's CSS comment; a token without a marker is `unknown`. The audit tiers every member from those markers: `auto` (measured below the just-noticeable difference, or measured snapping into an authored value) rows may be written mechanically; `proposal` rows (measured beyond the snap threshold, or any `unknown` side) are written after one batched confirmation; `must-ask` rows (`authored` vs `authored`) are written only after an explicit developer decision. Never round an authored value away, and never write a proposal here before confirmation — a proposal written here reads as a decision to the audit.

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

## Required Audit

- No component token references a reference token directly.
- No system token name includes component anatomy.
- No reference token name includes semantic roles.
- Reference color steps follow `100` lightest to `0` darkest.
- Every non-canonical member of a near-token cluster (close reference colors or numbers) has a documented merge or keep-distinct decision against the canonical that records both provenances; `authored` vs `authored` members are never merged without an explicit developer decision.
- Accessibility remaps keep the authored value as a `ref` token and carry an `a11y-remap` record; the shipped `sys` mapping points at the accessible value.
- Every background-like system color has a matching `on-*` foreground pair.
- Values found only in unused code, demo-only components, blocked captures, or unverified resources are not promoted to tokens unless a keep decision is recorded in `DESIGN_EVIDENCE_MAP.md`.
