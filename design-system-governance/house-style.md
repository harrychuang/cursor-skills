# Default House Style (Fallback Design Language)

> **Apply ONLY when Phase 0 finds no project design specification** — no
> `design-system/DESIGN_PRINCIPLES.md`, no `ANTI_AI_STYLE_RULES.md`, no equivalent
> design docs, and no established visual conventions in existing components — **and the
> user has confirmed adopting this default.** Discovered project conventions and
> documented project principles ALWAYS override everything in this file. Never restyle
> existing compliant components toward these defaults; if project code conflicts with
> this file, the project wins — note the difference in the Output Contract only if the
> project itself is internally inconsistent.

This is one coherent default design language, not a universal law. It exists so that a
greenfield project without a design spec still gets an intentional, non-generic look.

## 1. Character-first visual focus

The system should have a distinct personality. Avoid generic component libraries that
look identical to every other SaaS product. Every screen should feel intentional.

## 2. Saturated accent colors on neutral surfaces

High-saturation accent on a neutral container background creates maximum contrast and
visual energy without overwhelming the UI. Accent-on-accent and muted-on-muted
combinations both violate this default.

## 3. Rounded, friendly geometry

Pill-shaped buttons and rounded containers communicate approachability. Interactive
affordances (buttons, chips, inputs) should be the most rounded elements on the page.
(A project that deliberately uses sharp corners is not "wrong" — this default simply
does not apply there.)

## 4. Section-based narrative rhythm

Pages compose as a sequence of discrete content blocks, each with a clear role (hero,
feature, detail, CTA). Readers can pause and resume at section boundaries; sections can
be re-ordered or extended independently.

## 5. Bold display scale

In hero and brand contexts, use the display scale — **36–96px** — reserved for moments
that must anchor attention. Body text uses a separate scale. These sizes live in ref/sys
type tokens, never as literals in component code.

## 6. Dense content with scan hierarchy

Generous white space is not the goal — purposeful density with clear grouping and
typographic hierarchy is. Users should scan the page in under 5 seconds and locate
their target section. Support F-pattern and Z-pattern reading.

## 7. Layered surface depth

A flat single-surface layout cannot communicate containment, hierarchy, or interactive
layering. Default to **4 surface-container levels** and **5 elevation levels** to
distinguish foreground, background, and floating elements.

## Default numeric values (become tokens, never literals)

When bootstrapping a token system under this house style, use these as the initial
token values:

| Concern | Default value | Token home |
|---|---|---|
| Display type scale | 36–96px steps | ref type scale → sys display roles |
| Responsive breakpoints | 960px / 600px step-down | documented project breakpoints |
| Entrance stagger step | 60–80ms | sys motion token (e.g. `*-sys-motion-stagger-step`) |
| Surface containers | 4 levels | sys color surface roles |
| Elevation | 5 levels | sys elevation tokens |

These values are recommendations for the *token values*; they must still be defined in
the token layer and consumed via tokens per the governance constraints.
