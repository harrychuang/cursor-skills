# AGENTS.md

This repository is a standalone design workspace starter.

## What it is for

- Build a product from screenshots in `reference/`
- Or build from a Figma file defined in `.env.local`
- Generate and maintain design tokens, Storybook coverage, product manifests, and visual parity workflows

## Read in this order

1. `CLAUDE.md`
2. `start-here/BUILD_PLAN.md`
3. `start-here/STORYBOOK_10_AUTODOCS.md`
4. `start-here/ACCURACY_CONTRACT.md`
5. `start-here/TASKS.md`
6. `design/foundations/README.md`
7. `product/SCREEN_MANIFEST.json`
8. `skills/design-system-governance/SKILL.md`
9. `skills/ui-screenshot-to-storybook-product/SKILL.md`
10. `skills/ui-visual-parity/SKILL.md`
11. `skills/figma-m3-variables/SKILL.md` when `.env.local` is configured

## Rules

1. Do not bypass tokens with hardcoded values.
2. Do not implement screens before establishing reusable component stories.
3. Use the latest stable Storybook 10 for shared component work.
4. Reusable Storybook components must enable Autodocs and include component descriptions in the docs output.
5. If `.env.local` has a Figma URL and node ID but has neither `FIGMA_PAT` nor `FIGMA_AUTH_MODE=connector`, stop and ask the user to set one of them before Figma-first automation.
6. In Figma mode, run Phase 0 token creation or audit plus binding before code implementation.
7. Use Figma as the source of truth when `.env.local` is fully configured with `FIGMA_FILE_URL`, `FIGMA_NODE_ID`, and either `FIGMA_PAT` or `FIGMA_AUTH_MODE=connector`.
8. Use `reference/` screenshots as the acceptance target in screenshot mode.
9. Read `start-here/ACCURACY_CONTRACT.md` and classify source accuracy before implementation.
10. In image-only mode, record observed facts, inferred decisions, missing context, and open questions before coding.
11. Run the compare workflow after major UI changes.
12. Before reusable component work, analyze the design source for recurring signals in color proportion, spacing feel, corner size, and typography weight.
13. Turn that analysis into 5-7 evidence-backed design principles plus concrete design elements for color, typography, corner, and spacing.
14. Use fixed markdown tables for `Signal Summary`, `Design Principles`, `Design Elements`, and `Observed vs Inferred` when reporting that analysis.
15. Keep `design/foundations/*.md` current, and update Storybook foundations pages with a designed bento-style layout when token work changes.
16. Every reusable component story must document important props through `argTypes`; verify with `npm run storybook:check-docs`.

## How to invoke workflows

- Build:
  - Read and follow `skills/ui-screenshot-to-storybook-product/SKILL.md`
- Compare:
  - Read and follow `skills/ui-visual-parity/SKILL.md`
- Governance:
  - Read and follow `skills/design-system-governance/SKILL.md`
- Figma Phase 0:
  - Read and follow `skills/figma-m3-variables/SKILL.md`

## Codex-specific note

If the tool does not support slash commands or `@file` image syntax, explicitly instruct it to read files by path, for example:

- `Read reference/home.png and follow skills/ui-screenshot-to-storybook-product/SKILL.md`
- `Derive 5-7 design principles and concrete design elements from the source before coding reusable components`
- `Use Storybook 10 and ensure reusable component stories generate Autodocs with component descriptions`
- `Read .env.local; if both FIGMA_PAT and FIGMA_AUTH_MODE=connector are missing, ask the user to set one before Figma-first automation`
- `Read .env.local and run Phase 0 with skills/figma-m3-variables/SKILL.md before code work`
- `Read .env.local and follow skills/ui-visual-parity/SKILL.md in Figma mode`
- `Read start-here/ACCURACY_CONTRACT.md and record observed/inferred/missing context before implementing from a single image`
