# Design Workspace Starter

This repository is an AI-operable product workspace. It starts empty on purpose: your job is to turn `reference/` screenshots and/or a Figma source into a token-backed app, Storybook catalog, and parity workflow.

## Read first

1. `start-here/BUILD_PLAN.md`
2. `start-here/TASKS.md`
3. `start-here/REFERENCE_INVENTORY.md`
4. `product/PRD.md`
5. `product/PRODUCT_SPEC.json`
6. `product/FEATURE_MANIFEST.json`
7. `product/SCREEN_MANIFEST.json`
8. `skills/design-system-governance/SKILL.md`
9. `skills/ui-screenshot-to-storybook-product/SKILL.md`
10. `skills/ui-visual-parity/SKILL.md`
11. `skills/figma-m3-variables/SKILL.md` when `.env.local` is configured

## Source modes

### Reference mode

- Read every image under `reference/`.
- Treat those screenshots as visual acceptance targets.
- Build Storybook and screens to match them.

### Figma mode

If `.env.local` contains `FIGMA_FILE_URL` and `FIGMA_NODE_ID` but `FIGMA_PAT` is missing, stop and ask the user to set `FIGMA_PAT` in `.env.local`. Do not continue with automated Figma-driven work until it is present.

If `.env.local` contains `FIGMA_FILE_URL`, `FIGMA_NODE_ID`, and `FIGMA_PAT`, run a Figma-first phase before implementation:

1. Read `.env.local`.
2. Run Phase 0 with `skills/figma-m3-variables/SKILL.md`:
   - inspect existing variables first
   - create or audit Ref -> Sys -> Comp variables
   - bind agreed variables to key source components
   - validate the updated node screenshots
3. Use Figma MCP or equivalent tooling to retrieve:
   - design context
   - variable definitions
   - component/code-connect suggestions
   - latest screenshot for the configured node
4. Treat Figma as the source of truth.
5. Use `reference/` screenshots only as secondary validation when both exist.

## Non-negotiable rules

1. No hardcoded color, spacing, radius, or duration values when a token layer can own them.
2. Reuse before inventing new components.
3. Storybook is the component hub. Reusable blocks need stories before screen composition.
4. In Figma mode, do not start screen implementation until Phase 0 token binding is complete for the relevant source components.
5. Visual parity fixes must follow this order:
   - token/theme
   - primitive/shared component
   - component variant/props
   - composition/layout
   - page-only styling
6. If Figma and screenshots disagree, prefer Figma when Figma mode is configured.

## Expected outputs

- `src/` application code
- `.storybook/` setup and component stories
- `design/extracted-design-tokens/design-tokens.json` updated from placeholder
- `product/*` manifests updated from placeholder
- parity-ready compare workflow using screenshot and/or Figma evidence

## Agent note

This repository is intended to work across Claude Code, Cursor, and Codex. The workflow is shared; only the invocation layer differs.
