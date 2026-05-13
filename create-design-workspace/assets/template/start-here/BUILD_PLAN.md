# Build Plan

## Inputs

- `reference/` for screenshot mode
- `.env.local` for Figma mode
- `product/` for requirements

## Phases

0. Figma token preparation
   - if `.env.local` has a Figma URL and node ID but has neither `FIGMA_PAT` nor `FIGMA_AUTH_MODE=connector`, stop and ask for one of them before automation
   - if `.env.local` is fully configured, run `skills/figma-m3-variables/SKILL.md`
   - inspect variables before edits
   - create or audit Ref -> Sys -> Comp variables
   - bind agreed variables to key source components before code work
1. Source discovery
   - detect screenshot inputs
   - detect Figma inputs
   - prefer Figma when configured
   - read `start-here/ACCURACY_CONTRACT.md`
   - classify input as Figma-first, multi-reference screenshot, or single-image
   - record missing context before implementation
2. Design-system analysis
   - inspect shared signals in color proportion, spacing feel, corner size, and typography weight
   - separate observed source values from inferred system recommendations
   - summarize 5-7 evidence-backed design principles
   - define design elements for color, typography, corner, and spacing
   - define the documentation IA before component docs: default to `Foundations`, `Styles`, and `Components`
   - establish the standard component page sections: `Overview`, `Anatomy`, `States`, `Usage`, and `Tokens`
3. Visual inventory
4. Reuse and architecture
5. Storybook-first shared UI
   - use the latest stable Storybook 10
   - enable Autodocs for reusable components
   - add component descriptions to reusable component docs
   - maintain `design/foundations/*.md` as the human-readable design spec
   - create or refine `Foundations/Guides` before expanding component docs
   - keep foundations as custom MDX front-end pages rather than Autodocs
   - build or refresh Storybook foundations pages with a design-led, bento-style layout when token work changes
6. Screen composition
7. Visual parity
   - capture baseline
   - compare generated output against the source viewport
   - fix drift in ownership order: token/theme, shared primitive, component variant, layout composition, page-only styling
   - record accepted variance and remaining missing context
8. Product manifest cleanup

## Done criteria

- `product/SCREEN_MANIFEST.json` reflects current source screens
- source mode has an explicit accuracy tier and assumption log
- reusable UI has Storybook 10 stories
- reusable UI stories have Autodocs and component descriptions
- source analysis is documented as observed signals, inferred principles, and recommended design elements
- foundation guides exist for principles, color, typography, spacing, corner, and token usage
- Storybook foundation guides are custom MDX pages with designed layouts rather than Autodocs
- Storybook docs IA is defined before component detail pages expand
- component documentation uses a stable section contract: overview, anatomy, states, usage, and tokens
- Storybook foundations pages explain the active token system and design rules
- tokens are not placeholder values
- Figma mode has `FIGMA_PAT` configured or `FIGMA_AUTH_MODE=connector` declared before automation starts
- Figma mode has completed Phase 0 token audit or binding for the active source components
- compare workflow can operate in the chosen source mode
- remaining visual variance is recorded as accepted, deferred, or blocked
- app implementation matches design source with evidence-based fixes
