# design-workspace-starter

Standalone starter workspace for screenshot-driven or Figma-driven product implementation.

## In one sentence

Put screenshots or a Figma URL into this starter, then continue the same token-first, Storybook-first workflow in Cursor, Claude Code, or Codex.

This folder is the independent version of the generated ZIP workspace. It is meant to be downloaded as its own project, then filled with:

- reference UI demos under `reference/`
- optional Figma source in `.env.local`
- product requirements under `product/`
- foundation guides under `design/foundations/`
- Storybook-discoverable foundation docs under `src/stories/foundations/`
- app code, Storybook 10, and design-system code created by your coding agent

It does not require `ui-explorer` to run.

Managed skills are installed during workspace bootstrap so the starter can stay lightweight while still pulling the latest workflow definitions from GitHub.

## Tool compatibility

This starter is prepared for all three agent environments:

- Cursor
- Claude Code
- Codex

The repository includes:

- `CLAUDE.md` and `.claude/commands/*` for Claude Code
- `.cursorrules` and `.cursor/rules/*` for Cursor
- `AGENTS.md` for Codex and other AGENTS-aware tools

## 30-second start

### Cursor

1. Open this project in Cursor.
2. Run `npm run workspace:init`.
3. Add screenshots to `reference/` or configure Figma. If you plan to automate against Figma, set `FIGMA_PAT` in `.env.local` or `FIGMA_AUTH_MODE=connector` before continuing.
4. Run `npm run workspace:check`.
5. Open `start-here/KICKSTART.md` and paste the Cursor prompt.

### Claude Code

1. Open this project in Claude Code.
2. Run `npm run workspace:init`.
3. Add screenshots to `reference/` or configure Figma. If you plan to automate against Figma, set `FIGMA_PAT` in `.env.local` or `FIGMA_AUTH_MODE=connector` before continuing.
4. Run `npm run workspace:check`.
5. Run `/build`.

### Codex

1. Open this project in Codex.
2. Run `npm run workspace:init`.
3. Add screenshots to `reference/` or configure Figma. If you plan to automate against Figma, set `FIGMA_PAT` in `.env.local` or `FIGMA_AUTH_MODE=connector` before continuing.
4. Run `npm run workspace:check`.
5. Open `start-here/KICKSTART.md` and paste the Codex prompt.

## What this starter does

1. Accepts two design inputs:
   - `reference/*.png|jpg|webp`
   - `FIGMA_FILE_URL` + `FIGMA_NODE_ID` + (`FIGMA_PAT` or `FIGMA_AUTH_MODE=connector`)
2. Maintains the same AI workflow shape as the old ZIP:
   - design-system governance
   - screenshot/Figma to Storybook workflow
   - visual parity workflow
   - foundation guides for principles, specs, and token usage
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

If you start with a Figma URL but no PAT yet, add `FIGMA_PAT` to `.env.local`, or set `FIGMA_AUTH_MODE=connector` when your tool already has authenticated Figma MCP/connector access, before Phase 0 or any automated Figma-driven implementation.

3. Sync the workspace metadata:

```bash
npm run workspace:sync
```

4. Check readiness:

```bash
npm run workspace:check
```

5. Open this folder in Claude Code, Cursor, or Codex and start with:
   - `start-here/ACCURACY_CONTRACT.md`
   - `start-here/KICKSTART.md`
   - `start-here/BUILD_PLAN.md`
   - `start-here/STORYBOOK_10_AUTODOCS.md`
   - `start-here/TASKS.md`
   - `design/foundations/README.md`

## Agent handoff

Once the workspace is initialized, each tool continues from the same project state:

- Cursor:
  - read `start-here/KICKSTART.md`
  - use the Cursor prompt from that file
- Claude Code:
  - run `/build`
  - use `.claude/commands/*` when needed
- Codex:
  - read `start-here/KICKSTART.md`
  - use the Codex prompt from that file

All three tools share the same `product/`, `start-here/`, `skills/`, and parity workflow.

## Local scripts

- `npm run workspace:init`
  - installs managed skills from GitHub into `skills/`
  - refreshes `design-system-governance`, `figma-m3-variables`, and `ui-visual-parity`
- `npm run workspace:sync`
  - scans `reference/`
  - regenerates `product/SCREEN_MANIFEST.json`
  - regenerates `start-here/TASKS.md`
  - regenerates `start-here/REFERENCE_INVENTORY.md`
  - creates `design/foundations/*.md` and `src/stories/foundations/*.mdx` when missing
- `npm run workspace:check`
  - validates required folders
  - validates local and managed skill entrypoints
  - checks whether screenshot or Figma inputs exist
  - fails when a Figma URL is configured without either `FIGMA_PAT` or `FIGMA_AUTH_MODE=connector`
  - reports whether Figma automation is ready
- `npm run storybook:check-docs`
  - validates that reusable components have companion stories
  - validates Autodocs, component descriptions, `argTypes`, and expanded controls
- `npm run figma:configure -- --url <figma-url> [--pat <figma-pat>] [--auth-mode connector]`
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
│   ├── foundations/
│   └── extracted-design-tokens/
├── src/
│   └── stories/foundations/
├── reference/
├── scripts/
└── workspace.config.json
```

## Notes

- `reference/` is primary for screenshot-driven work.
- `.env.local` is primary for Figma-driven work.
- Read `start-here/ACCURACY_CONTRACT.md` before implementation. Figma-first mode can reach the highest fidelity because it exposes structured design context; single-image mode is an approximation path that must record assumptions and missing context.
- If `.env.local` has `FIGMA_FILE_URL` and `FIGMA_NODE_ID` but has neither `FIGMA_PAT` nor `FIGMA_AUTH_MODE=connector`, `npm run workspace:check` should fail until you add one of them.
- Use the latest stable Storybook 10 for shared component work. For new setups, use `npm create storybook@latest`; for upgrades, use `npx storybook@latest upgrade`.
- Storybook 10 requires Node 20.19+ or 22.12+.
- Reusable Storybook components should enable Autodocs and include component descriptions in their docs pages.
- `design/foundations/` should be maintained as the human-readable design system guide, and matching Storybook foundations pages should use a more designed layout such as bento modules instead of plain token tables.
- Before component docs expand, define the documentation IA with `Foundations`, `Styles`, and `Components` as the default navigation and establish `Overview`, `Anatomy`, `States`, `Usage`, and `Tokens` as the standard component page sections.
- `design/foundations/storybook-docs/` includes the template source for those Storybook docs pages plus a reusable component story template with Autodocs and prop docs wiring.
- `src/stories/foundations/` contains the MDX pages that a default Storybook setup will actually discover, so the foundation guides appear without extra `stories` glob changes.
- In Figma mode, run Phase 0 with `skills/figma-m3-variables/SKILL.md` before Phase A so the source file has agreed tokens and bindings before code implementation.
- Figma-aware visual parity is supported at the workflow level: the compare flow can treat Figma as source-of-truth and screenshots as secondary validation.
- Screenshot-only parity must run as an iteration loop and record remaining variance as accepted, deferred, or blocked.
- This starter intentionally ships with placeholder manifests and tokens. It is a workspace skeleton, not a finished app.
