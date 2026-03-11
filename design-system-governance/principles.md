# Design Principles — Extended Rationale

Reference this file when you need to justify a visual decision or explain a design constraint to a collaborator.

## 1. Character-first visual focus
The system should have a distinct personality. Avoid generic component libraries that look identical to every other SaaS product. Every screen should feel intentional.

## 2. Saturated accent colors on neutral surfaces
High-saturation accent on a neutral container background creates maximum contrast and visual energy without overwhelming the entire UI. Accent-on-accent or muted-on-muted combinations both violate this principle.

## 3. Rounded, friendly geometry
Sharp right-angle corners signal rigidity and formality. Pill-shaped buttons and rounded containers communicate approachability. Interactive affordances (buttons, chips, inputs) should be the most rounded elements on the page.

## 4. Section-based narrative rhythm
Pages are composed as a sequence of discrete content blocks, each with a clear role (hero, feature, detail, CTA). This allows the reader to pause and resume at section boundaries and makes the page easy to re-order or extend.

## 5. Bold display scale
In hero and brand contexts, typography below 36px fails to communicate authority. The display scale (36–96px) is reserved for moments that must anchor the user's attention. Body text uses a separate scale.

## 6. Dense content with scan hierarchy
Generous white space is not the goal — *purposeful* density with clear grouping and typographic hierarchy is. Users should be able to scan the page in under 5 seconds and locate their target section.

## 7. Foreground–background contrast pairing via `on-*` tokens
Every surface color role (primary, secondary, surface, error…) has a corresponding `on-*` foreground color. This is non-negotiable for accessibility (WCAG AA minimum) and must be enforced at the token layer, not by visual inspection.

## 8. Emotional visuals with explicit accessibility states
Hover, focus-visible, and disabled states are first-class design decisions, not afterthoughts. Focus rings must be visible and distinct. Disabled state must communicate unavailability clearly without relying solely on color.

## 9. Purposeful motion
Animations must serve communication, not decoration:
- **Entrance stagger**: sequential reveal communicates hierarchy and guides attention.
- **Ambient phase offset**: prevents all elements from moving in perfect synchrony, which looks mechanical.
- **Hover micro-interactions**: confirm affordance and responsiveness.
All durations and easings come from tokens — never magic numbers.

## 10. Layered surface depth
A flat single-surface layout loses the ability to communicate containment, hierarchy, and interactive layering. Use the project's container surface levels (typically 4) and elevation levels (typically 5) to communicate which elements are foreground, which are background, and which are floating.
