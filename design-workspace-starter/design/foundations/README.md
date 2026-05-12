# Foundations

This folder is the operating manual for the workspace. Keep these guides aligned with `design/extracted-design-tokens/design-tokens.json`, Storybook foundations pages, and the shipped UI.

## Bento Map

| Principles | Color | Typography |
| --- | --- | --- |
| [Design Principles](design-principles.md) | [Color](color.md) | [Typography](typography.md) |
| clarity, hierarchy, accessibility | semantic palette, states, contrast | scale, roles, rhythm |

| Spacing | Corner | Token Usage |
| --- | --- | --- |
| [Spacing](spacing.md) | [Corner](corner.md) | [Token Usage](design-token-usage.md) |
| layout rhythm, gutters, density | radius rules, containment, emphasis | naming, implementation, Storybook docs |

## Operating Rules

- Before reusable component work, derive the shared visual system from screenshot and/or Figma evidence.
- Define the documentation site map before component details. Default docs IA: `Foundations`, `Styles`, `Components`, with optional `Patterns`, `Templates`, and `Resources`.
- Standard component docs sections are `Overview`, `Anatomy`, `States`, `Usage`, and `Tokens`. Add `Accessibility` or `Content` only when the component contract needs them.
- Update these guides whenever token meaning, naming, or visual rules change.
- Keep Storybook foundation pages visually intentional. Prefer editorial or bento-like layouts instead of plain spec dumps.
- Treat `Ref -> Sys -> Comp` as the token layering model when Figma mode is active.
- Do not ship screens with hardcoded foundation values that bypass the token layer.

## Required Outputs

- Evidence-backed design principles and decision rules that explain why the system looks and behaves this way.
- A design analysis that separates observed source values from inferred system recommendations.
- Fixed-schema tables for Signal Summary, Design Principles, Design Elements, and Observed vs Inferred.
- A documentation architecture that tells teams where foundations stop and component docs begin.
- Foundation specs for color, typography, spacing, and corner/radius.
- Clear token usage guidance for code, CSS variables, component props, and Storybook docs.
- A visible mapping between extracted tokens, semantic tokens, and component-level application.
- Storybook pages that teach when to use a foundation role, not just what token name exists.

## Maintenance Loop

1. Update tokens or Figma variables.
2. Update the relevant foundation guide in this folder.
3. Update Storybook foundation pages when the change is user-visible.
4. Re-check composed screens and visual parity.
