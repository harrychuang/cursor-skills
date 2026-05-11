# Kickstart

Start from one of these prompts.

## Claude Code

Run `/build`.

## Cursor

Paste:

```text
Read CLAUDE.md, start-here/BUILD_PLAN.md, start-here/STORYBOOK_10_AUTODOCS.md, start-here/TASKS.md, product/SCREEN_MANIFEST.json, skills/design-system-governance/SKILL.md, skills/ui-screenshot-to-storybook-product/SKILL.md, and skills/ui-visual-parity/SKILL.md. Use the latest stable Storybook 10 for shared component work, and make reusable component stories generate Autodocs with component descriptions. If .env.local contains FIGMA_FILE_URL and FIGMA_NODE_ID but has neither FIGMA_PAT nor FIGMA_AUTH_MODE=connector, stop and ask the user to set one of them before continuing with Figma-first automation. If .env.local contains the Figma URL and node plus either FIGMA_PAT or FIGMA_AUTH_MODE=connector, run Phase 0 with skills/figma-m3-variables/SKILL.md first, create or audit Ref -> Sys -> Comp variables, bind them to the key source components, and use Figma as source of truth. Otherwise use reference/ screenshots. Do Phase A only after Phase 0 is complete.
```

## Codex

Paste:

```text
Read CLAUDE.md, AGENTS.md, start-here/BUILD_PLAN.md, start-here/STORYBOOK_10_AUTODOCS.md, start-here/TASKS.md, product/SCREEN_MANIFEST.json, skills/design-system-governance/SKILL.md, skills/ui-screenshot-to-storybook-product/SKILL.md, and skills/ui-visual-parity/SKILL.md. Use the latest stable Storybook 10 for shared component work, and make reusable component stories generate Autodocs with component descriptions. If .env.local contains FIGMA_FILE_URL and FIGMA_NODE_ID but has neither FIGMA_PAT nor FIGMA_AUTH_MODE=connector, stop and ask the user to set one of them before continuing with Figma-first automation. If .env.local contains the Figma URL and node plus either FIGMA_PAT or FIGMA_AUTH_MODE=connector, read it and run Phase 0 with skills/figma-m3-variables/SKILL.md first, create or audit Ref -> Sys -> Comp variables, and bind them to the key source components before code work. Otherwise use the screenshots under reference/. Build Storybook-first, then compose screens, then run parity comparison.
```
