# create-design-workspace

Bootstrap a standalone frontend delivery workspace from screenshots, a Figma URL, or both.

Use it from an empty project directory, or create a new empty directory first and scaffold into that location.

## In one sentence

Give this skill an empty folder plus UI screenshots or a Figma URL, and it will create a full UI-to-code workspace that Cursor, Claude Code, and Codex can all continue developing.

## Quick start

### What the developer needs before starting

- an empty folder for the new project
- at least one design source:
  - screenshot images
  - or a Figma URL
  - or both

### 3-step flow

1. Start in an empty folder and use `create-design-workspace`.
2. Provide screenshots or a Figma URL.
3. Let the agent bootstrap the workspace, initialize the managed skills, and continue the implementation workflow.

### What happens after that

The generated workspace will guide the rest of the build:

- understand the UI structure
- identify reusable components
- decide what should exist in Storybook first
- create or align design tokens
- implement screens from reusable components
- run visual parity against screenshots or Figma

## Typical developer journey

1. A developer creates a new empty folder for a new project.
2. They invoke this skill and provide screenshot files or a Figma URL.
3. The skill scaffolds a full starter workspace into that folder.
4. The workspace installs its managed workflow skills.
5. The agent continues with token-first, Storybook-first development.
6. The developer keeps working in Cursor, Claude Code, or Codex using the generated project entrypoints.

This skill is intended for workflows where you want to:

- start a new project from UI references
- generate a reusable workspace skeleton
- run Figma-first token preparation before code work
- carry the work through Storybook-first implementation and visual parity

## Tool compatibility

The generated workspace is prepared for all three agent environments:

- Cursor
- Claude Code
- Codex

The bundled template includes:

- `CLAUDE.md` and `.claude/commands/*` for Claude Code
- `.cursorrules` and `.cursor/rules/*` for Cursor
- `AGENTS.md` for Codex and other AGENTS-aware tools

## 30-second start

### Cursor

1. Open an empty folder in Cursor.
2. Use `create-design-workspace`.
3. Give it screenshots or a Figma URL.
4. After bootstrap, open `start-here/KICKSTART.md`.
5. Paste the Cursor prompt from that file.

### Claude Code

1. Open an empty folder in Claude Code.
2. Use `create-design-workspace`.
3. Give it screenshots or a Figma URL.
4. After bootstrap, open the generated project.
5. Run `/build`.

### Codex

1. Open an empty folder in Codex.
2. Use `create-design-workspace`.
3. Give it screenshots or a Figma URL.
4. After bootstrap, open `start-here/KICKSTART.md`.
5. Paste the Codex prompt from that file.

## Starting condition

This skill is meant for a new UI-to-code project.

- Recommended: start in an empty directory
- Also acceptable: create a new empty target directory and scaffold there
- Not recommended: run it in the root of an existing app with unrelated code

The generated workspace is a full project skeleton, not a patch you apply into an established repository.

## What it creates

The skill scaffolds a full workspace from the bundled template under `assets/template/`, including:

- `reference/` for screenshot inputs
- `.env.local` support for Figma mode
- `product/` manifests and planning files
- `start-here/` kickoff workflow
- `scripts/` for workspace init, sync, and checks

After bootstrap, the generated workspace installs these managed skills with `npm run workspace:init`:

- `design-system-governance`
- `figma-m3-variables`
- `ui-visual-parity`

## Typical usage

Use the skill when a user says something like:

- "Build a project from these UI screenshots."
- "Use this Figma URL to create the app."
- "Start a new frontend workspace from this design."
- "Create a new UI-to-code project in this empty folder."

## What this skill is not for

- patching an existing production app in place
- adding one component into an unrelated existing repository
- starting without any design source at all

## Manual bootstrap

You can run the bootstrap script directly:

```bash
node /Users/HarryChuang/.cursor/skills/create-design-workspace/scripts/bootstrap-design-workspace.mjs \
  --target "/path/to/project" \
  --project-name "My Product" \
  --figma-url "https://www.figma.com/design/FILE/NAME?node-id=10-42"
```

Optional flags:

- `--figma-pat "<token>"`
- `--screenshot "/path/to/screen-1.png"`
- repeat `--screenshot` for multiple files
- `--force` to allow writing into a non-empty target directory

## After bootstrap

Inside the generated project:

```bash
npm run workspace:init
npm run workspace:check
```

Then continue from:

- `start-here/KICKSTART.md`
- `start-here/BUILD_PLAN.md`
- `start-here/TASKS.md`

If the design input was screenshots, place them under `reference/`.

If the design input was Figma, make sure `.env.local` contains the Figma configuration before continuing.

## Agent handoff after bootstrap

Once the workspace is created and initialized, developers should continue in their preferred tool like this:

- Cursor:
  - open the generated project
  - read `start-here/KICKSTART.md`
  - paste the Cursor prompt from that file
- Claude Code:
  - open the generated project
  - run `/build`
  - use `.claude/commands/*` when needed
- Codex:
  - open the generated project
  - read `start-here/KICKSTART.md`
  - paste the Codex prompt from that file

All three paths point to the same underlying workflow and generated project structure.

## Figma mode

When a Figma URL is configured, the workspace expects a Phase 0 gate before implementation:

1. Run `skills/figma-m3-variables/SKILL.md`
2. Create or audit `Ref -> Sys -> Comp` variables
3. Bind those variables to the key source components
4. Only then continue into screen implementation

## Files

- `SKILL.md`: agent instructions and trigger behavior
- `scripts/bootstrap-design-workspace.mjs`: scaffolds the workspace
- `assets/template/`: bundled starter workspace
- `agents/openai.yaml`: UI metadata for the skill
