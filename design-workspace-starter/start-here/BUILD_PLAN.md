# Build Plan

## Inputs

- `reference/` for screenshot mode
- `.env.local` for Figma mode
- `product/` for requirements

## Phases

0. Figma token preparation
   - if `.env.local` is configured, run `skills/figma-m3-variables/SKILL.md`
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
5. Screen composition
6. Visual parity
7. Product manifest cleanup

## Done criteria

- `product/SCREEN_MANIFEST.json` reflects current source screens
- reusable UI has stories
- tokens are not placeholder values
- Figma mode has completed Phase 0 token audit or binding for the active source components
- compare workflow can operate in the chosen source mode
- app implementation matches design source with evidence-based fixes
