# design-workspace-starter

Standalone starter workspace for screenshot-driven or Figma-driven product implementation.

This folder is the independent version of the generated ZIP workspace. It is meant to be downloaded as its own project, then filled with:

- reference UI demos under `reference/`
- optional Figma source in `.env.local`
- product requirements under `product/`
- app code, Storybook, and design-system code created by your coding agent

It does not require `ui-explorer` to run.

Managed skills are installed during workspace bootstrap so the starter can stay lightweight while still pulling the latest workflow definitions from GitHub.

## What this starter does

1. Accepts two design inputs:
   - `reference/*.png|jpg|webp`
   - `FIGMA_FILE_URL` + `FIGMA_NODE_ID` + `FIGMA_PAT`
2. Maintains the same AI workflow shape as the old ZIP:
   - design-system governance
   - screenshot/Figma to Storybook workflow
   - visual parity workflow
   - product manifests and phased build plan
3. Gives each coding agent a native entrypoint:
   - `CLAUDE.md` and `.claude/commands/*` for Claude Code
   - `.cursor/rules/*` and `.cursorrules` for Cursor
   - `AGENTS.md` for Codex and other AGENTS-aware tools

## Quick start

1. Install the managed skills:

```bash
npm run workspace:init
```

2. Put screenshots into `reference/`, or configure Figma:

```bash
npm run figma:configure -- --url "https://www.figma.com/design/FILE/NAME?node-id=10-42" --pat "figd_..."
```

3. Sync the workspace metadata:

```bash
npm run workspace:sync
```

4. Check readiness:

```bash
npm run workspace:check
```

5. Open this folder in Claude Code, Cursor, or Codex and start with:
   - `start-here/KICKSTART.md`
   - `start-here/BUILD_PLAN.md`
   - `start-here/TASKS.md`

## Local scripts

- `npm run workspace:init`
  - installs managed skills from GitHub into `skills/`
  - refreshes `design-system-governance`, `figma-m3-variables`, and `ui-visual-parity`
- `npm run workspace:sync`
  - scans `reference/`
  - regenerates `product/SCREEN_MANIFEST.json`
  - regenerates `start-here/TASKS.md`
  - regenerates `start-here/REFERENCE_INVENTORY.md`
- `npm run workspace:check`
  - validates required folders
  - validates local and managed skill entrypoints
  - checks whether screenshot or Figma inputs exist
  - reports readiness for agents
- `npm run figma:configure -- --url <figma-url> [--pat <figma-pat>]`
  - parses a Figma design URL
  - writes `.env.local`

## Folder layout

```text
.
├── CLAUDE.md
├── AGENTS.md
├── .cursorrules
├── .cursor/rules/
├── .claude/commands/
├── skills/
├── start-here/
├── product/
├── design/
├── reference/
├── scripts/
└── workspace.config.json
```

## Notes

- `reference/` is primary for screenshot-driven work.
- `.env.local` is primary for Figma-driven work.
- In Figma mode, run Phase 0 with `skills/figma-m3-variables/SKILL.md` before Phase A so the source file has agreed tokens and bindings before code implementation.
- Figma-aware visual parity is supported at the workflow level: the compare flow can treat Figma as source-of-truth and screenshots as secondary validation.
- This starter intentionally ships with placeholder manifests and tokens. It is a workspace skeleton, not a finished app.
