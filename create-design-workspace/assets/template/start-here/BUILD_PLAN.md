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
2. Visual inventory
3. Reuse and architecture
4. Storybook-first shared UI
   - use the latest stable Storybook 10
   - enable Autodocs for reusable components
   - add component descriptions to reusable component docs
5. Screen composition
6. Visual parity
7. Product manifest cleanup

## Done criteria

- `product/SCREEN_MANIFEST.json` reflects current source screens
- reusable UI has Storybook 10 stories
- reusable UI stories have Autodocs and component descriptions
- tokens are not placeholder values
- Figma mode has `FIGMA_PAT` configured or `FIGMA_AUTH_MODE=connector` declared before automation starts
- Figma mode has completed Phase 0 token audit or binding for the active source components
- compare workflow can operate in the chosen source mode
- app implementation matches design source with evidence-based fixes
