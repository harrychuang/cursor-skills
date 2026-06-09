# Agent Installation

Use this reference when installing `design-system-to-storybook` for Claude Code, Codex, or Cursor.

The portable skill package is the entire `design-system-to-storybook/` directory. Keep `SKILL.md`, `agents/`, `scripts/`, `references/`, and `assets/figma-export-addon/` together. Do not split the bundled addon out of the skill during installation.

## Installer

From this skill directory:

```sh
node scripts/install_agent_skill.mjs --agent all --scope user
```

Project-local install:

```sh
node scripts/install_agent_skill.mjs --agent all --scope project --project-root <repo>
```

Use `--force` only when replacing an existing installed copy.

## Claude Code

Supported targets:

- User: `~/.claude/skills/design-system-to-storybook/`
- Project: `<repo>/.claude/skills/design-system-to-storybook/`

Invoke with:

```txt
/design-system-to-storybook
```

Claude Code discovers skills from `.claude/skills/<skill-name>/SKILL.md` and `~/.claude/skills/<skill-name>/SKILL.md`. If a top-level skills directory was created after Claude Code started, restart Claude Code so the directory watcher sees it.

## Codex

Supported targets:

- User: `~/.codex/skills/design-system-to-storybook/`
- Project/open-standard: `<repo>/.agents/skills/design-system-to-storybook/`

Invoke with:

```txt
Use $design-system-to-storybook to build Storybook from the extracted design-system package.
```

For project-local use, the prompt can also point directly to:

```txt
Use .agents/skills/design-system-to-storybook/SKILL.md.
```

## Cursor

Supported targets:

- User: `~/.cursor/skills/design-system-to-storybook/`
- Project: `<repo>/.cursor/skills/design-system-to-storybook/`

Invoke with:

```txt
/design-system-to-storybook
```

Cursor also supports rules for always-on project guidance, but this workflow should stay a skill because it is procedural and should load only when building Storybook from extracted design-system docs. If Cursor does not show the skill immediately, reload the window or place it at project scope.

## Verification Checklist

- `SKILL.md` exists at the installed destination.
- The installed folder name is exactly `design-system-to-storybook`.
- `SKILL.md` frontmatter `name` is `design-system-to-storybook`.
- `scripts/install_figma_export_addon.mjs` exists.
- `scripts/generate_figma_export_config.mjs` exists.
- `assets/figma-export-addon/dist/source.js` exists.
- Invocation works through the agent's skill command or explicit path prompt.
