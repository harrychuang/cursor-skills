# Universal Requirements — Extended Rationale

Reference this file when you need to justify one of the three universal requirements to
a collaborator. Rationale for the *default aesthetic* (character, saturated accents,
rounded geometry, display scale, density, surface depth) lives in
[house-style.md](house-style.md) and applies only when that opt-in fallback is active.

## 1. Foreground–background contrast pairing via `on-*` tokens

Every surface color role (primary, secondary, surface, error…) has a corresponding
`on-*` foreground color. This is non-negotiable for accessibility (WCAG AA minimum)
and must be enforced at the token layer, not by visual inspection — which is why the
Creation Procedures require computing the contrast ratio (≥ 4.5:1 body text, ≥ 3:1
large text and interactive boundaries) for every pair, in every theme. A pair that
exists but fails the ratio satisfies the letter of the pairing rule while shipping an
accessibility defect; the ratio check closes that gap.

## 2. Explicit interaction states

Hover, focus-visible, and disabled states are first-class design decisions, not
afterthoughts. Focus rings must be visible and distinct. Disabled state must
communicate unavailability clearly without relying solely on color. States are defined
at the token level (per-state comp slots, or per-state semantic tokens in 2-layer
projects) so they cannot silently diverge between components — and every supported
state gets a story, so regressions are visible.

## 3. Purposeful, token-driven motion

Animations must serve communication, not decoration:

- **Entrance stagger**: sequential reveal communicates hierarchy and guides attention.
- **Ambient phase offset**: prevents all elements from moving in perfect synchrony,
  which looks mechanical.
- **Hover micro-interactions**: confirm affordance and responsiveness.

All durations, easings, stagger steps, and phase offsets come from motion tokens —
never magic numbers. Tokenized motion is what makes a system-wide tempo change a
one-line edit instead of a hunt through every component.
