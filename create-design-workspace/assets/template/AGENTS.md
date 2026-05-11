# AGENTS.md

This repository is a standalone design workspace starter.

## What it is for

- Build a product from screenshots in `reference/`
- Or build from a Figma file defined in `.env.local`
- Generate and maintain design tokens, Storybook coverage, product manifests, and visual parity workflows

## Read in this order

1. `CLAUDE.md`
2. `start-here/BUILD_PLAN.md`
3. `start-here/TASKS.md`
4. `product/SCREEN_MANIFEST.json`
5. `skills/design-system-governance/SKILL.md`
6. `skills/ui-screenshot-to-storybook-product/SKILL.md`
7. `skills/ui-visual-parity/SKILL.md`
8. `skills/figma-m3-variables/SKILL.md` when `.env.local` is configured

## Rules

1. Do not bypass tokens with hardcoded values.
2. Do not implement screens before establishing reusable component stories.
3. In Figma mode, run Phase 0 token creation or audit plus binding before code implementation.
4. Use Figma as the source of truth when `.env.local` is configured.
5. Use `reference/` screenshots as the acceptance target in screenshot mode.
6. Run the compare workflow after major UI changes.

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
- `Read .env.local and run Phase 0 with skills/figma-m3-variables/SKILL.md before code work`
- `Read .env.local and follow skills/ui-visual-parity/SKILL.md in Figma mode`
