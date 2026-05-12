# Design Workspace Starter

This repository is an AI-operable product workspace. It starts empty on purpose: your job is to turn `reference/` screenshots and/or a Figma source into a token-backed app, Storybook catalog, and parity workflow.

## Read first

1. `start-here/BUILD_PLAN.md`
2. `start-here/TASKS.md`
3. `start-here/STORYBOOK_10_AUTODOCS.md`
4. `start-here/REFERENCE_INVENTORY.md`
5. `design/foundations/README.md`
6. `product/PRD.md`
7. `product/PRODUCT_SPEC.json`
8. `product/FEATURE_MANIFEST.json`
9. `product/SCREEN_MANIFEST.json`
10. `skills/design-system-governance/SKILL.md`
11. `skills/ui-screenshot-to-storybook-product/SKILL.md`
12. `skills/ui-visual-parity/SKILL.md`
13. `skills/figma-m3-variables/SKILL.md` when `.env.local` is configured

## Source modes

### Reference mode

- Read every image under `reference/`.
- Treat those screenshots as visual acceptance targets.
- Before component work, derive the shared design system from those references.
- Build Storybook and screens to match them.

### Figma mode

If `.env.local` contains `FIGMA_FILE_URL` and `FIGMA_NODE_ID` but has neither `FIGMA_PAT` nor `FIGMA_AUTH_MODE=connector`, stop and ask the user to set `FIGMA_PAT` in `.env.local`, or set `FIGMA_AUTH_MODE=connector` when the tool already has authenticated Figma MCP/connector access. Do not continue with automated Figma-driven work until one of them is present.

If `.env.local` contains `FIGMA_FILE_URL`, `FIGMA_NODE_ID`, and either `FIGMA_PAT` or `FIGMA_AUTH_MODE=connector`, run a Figma-first phase before implementation:

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
3. Storybook 10 is the component hub. Reusable blocks need stories before screen composition.
4. Before reusable component work, analyze recurring signals in color proportion, spacing feel, corner size, and typography weight.
5. Turn that analysis into 5-7 evidence-backed design principles plus concrete design elements for color, typography, corner, and spacing.
6. Output that analysis using fixed markdown tables for `Signal Summary`, `Design Principles`, `Design Elements`, and `Observed vs Inferred`.
7. Define the documentation IA before detailed component docs. Default to `Foundations`, `Styles`, and `Components`, then lock the standard component page sections: `Overview`, `Anatomy`, `States`, `Usage`, and `Tokens`.
8. In Figma mode, do not start screen implementation until Phase 0 token binding is complete for the relevant source components.
9. Reusable Storybook components must enable Autodocs and include component descriptions in the docs output.
10. Maintain `design/foundations/*.md` as required documentation for design principles, design specs, and token usage.
11. When token work changes, update Storybook foundations pages with a designed layout such as bento modules rather than plain token tables.
12. Visual parity fixes must follow this order:
   - token/theme
   - primitive/shared component
   - component variant/props
   - composition/layout
   - page-only styling
13. If Figma and screenshots disagree, prefer Figma when Figma mode is configured.

## Expected outputs

- `src/` application code
- `.storybook/` setup and Storybook 10 component stories with Autodocs
- `design/foundations/*.md` updated from placeholder into a real foundation guide set
- Storybook foundations include a docs IA guide before component-level detail pages
- design analysis documented with observed signals, inferred principles, and normalized design elements
- `design/extracted-design-tokens/design-tokens.json` updated from placeholder
- `product/*` manifests updated from placeholder
- parity-ready compare workflow using screenshot and/or Figma evidence

## Agent note

This repository is intended to work across Claude Code, Cursor, and Codex. The workflow is shared; only the invocation layer differs.
