---
name: create-design-workspace
description: >-
  Bootstrap a full frontend delivery workspace from UI screenshots or a Figma
  URL, then carry the implementation through Storybook-first, token-first
  development and visual parity. Use when the user wants to start a new product
  build from reference images, a Figma design, or both.
---

# Create Design Workspace

Use this skill when the user wants a complete implementation workflow from UI references rather than a one-off component patch.

This skill has two jobs:

1. Scaffold a standalone workspace from the bundled template.
2. Drive the full build workflow after the workspace is ready.

## Cross-tool target

The generated workspace must remain usable in all of these environments:

- Cursor
- Claude Code
- Codex

When bootstrapping or updating the template, preserve these entrypoints:

- `CLAUDE.md` and `.claude/commands/*`
- `.cursorrules` and `.cursor/rules/*`
- `AGENTS.md`

## Required starting condition

Use this skill in an empty project directory, or in a brand-new directory created specifically for the new UI-to-code workspace.

This skill is for starting a new design-driven project. It is not intended to be dropped directly into the root of an existing application with unrelated code.

## Inputs

- Screenshot files already on disk
- Screenshot images attached in chat
- A Figma design URL
- Optional `FIGMA_PAT`
- Optional target directory and project name

## Bootstrap workflow

1. Choose the target directory.
   - Prefer an empty directory.
   - If the current directory already contains unrelated app code, stop and use a new empty directory instead.
2. Run the bootstrap script:

```bash
node /Users/HarryChuang/.cursor/skills/create-design-workspace/scripts/bootstrap-design-workspace.mjs --target "<target-dir>" [--project-name "<name>"] [--figma-url "<url>"] [--figma-pat "<pat>"] [--screenshot "<path>"]
```

3. After scaffolding, install the managed skills:

```bash
npm run workspace:init
```

4. Sync and validate the workspace:

```bash
npm run workspace:sync
npm run workspace:check
```

## Screenshot handling

- If the user gives local screenshot paths, pass one `--screenshot` flag per file to the bootstrap script.
- If the user only attaches images in chat, use them for immediate planning and implementation, but explain that the generated workspace expects durable files under `reference/` for later parity runs. Ask the user to place the images in the repo when a persistent reference set is needed.

## Figma handling

- If the user provides a Figma URL, pass `--figma-url`.
- If the file is private or Phase 0 requires MCP access, also collect `FIGMA_PAT` and pass `--figma-pat`.
- After bootstrap, treat Figma mode as a gated workflow:
  - run `skills/figma-m3-variables/SKILL.md` as Phase 0
  - create or audit `Ref -> Sys -> Comp` variables
  - bind the agreed variables to the key source components
  - only then continue to code implementation

## Full development workflow

Once the workspace exists:

1. Read `start-here/KICKSTART.md`, `start-here/BUILD_PLAN.md`, and `start-here/TASKS.md`.
2. Follow the local workflow skills in this order:
   - `skills/design-system-governance/SKILL.md`
   - `skills/ui-screenshot-to-storybook-product/SKILL.md`
   - `skills/ui-visual-parity/SKILL.md`
   - `skills/figma-m3-variables/SKILL.md` first when Figma mode is configured
3. Implement end-to-end:
   - update product docs and manifests
   - build reusable Storybook components before screens
   - compose screens from reusable components
   - run visual parity and fix drift at the correct ownership layer

When handing off to a specific tool:

- Cursor: use the Cursor prompt in `start-here/KICKSTART.md`
- Claude Code: run `/build`
- Codex: use the Codex prompt in `start-here/KICKSTART.md`

Do not stop after scaffolding unless the user explicitly asks only for setup.

## Safety rules

- Do not use this skill in the root of an existing non-empty app unless the user explicitly wants to replace it.
- Do not overwrite a non-empty target directory unless the user explicitly approves or the target is clearly disposable.
- Do not force Figma mode when the user only wants screenshot-driven work.
- Do not skip `workspace:init`; the template intentionally keeps managed skills out of versioned starter files.
