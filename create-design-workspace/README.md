# create-design-workspace

Bootstrap a standalone frontend delivery workspace from screenshots, a Figma URL, or both.

This skill is intended for workflows where you want to:

- start a new project from UI references
- generate a reusable workspace skeleton
- run Figma-first token preparation before code work
- carry the work through Storybook-first implementation and visual parity

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
