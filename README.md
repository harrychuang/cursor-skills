# cursor-skills

A collection of reusable [Cursor Agent Skills](https://docs.cursor.com/context/rules-for-ai) for UI and design system development.

## Available Skills

### [`design-system-governance`](./design-system-governance/)

Enforces token-first, composition-first governance for any design system project.

**What it does:**
- Auto-detects the project's token naming conventions, grid system, animation keyframes, and shared component library before applying rules
- Enforces a strict token gate and composition gate (stops and asks before creating new tokens or components)
- Applies 10 universal design principles (character-first, saturated accents, rounded geometry, etc.)
- Governs animation (stagger, phase offset, motion tokens), i18n (no hardcoded display text), and page composition
- Requires Storybook stories for every visual state (default, hover, focus-visible, disabled)

**Use when:** building UI components, composite layouts, pages, design tokens, or Storybook stories — or when you need to enforce token-first governance on any design system project.

---

## Installation

### Option A — Copy to personal Cursor skills (available in all your projects)

```bash
git clone https://github.com/harrychuang/cursor-skills.git /tmp/cursor-skills-install
cp -r /tmp/cursor-skills-install/design-system-governance ~/.cursor/skills/
```

### Option B — Copy into your project (available to your whole team via the repo)

```bash
git clone https://github.com/harrychuang/cursor-skills.git /tmp/cursor-skills-install
cp -r /tmp/cursor-skills-install/design-system-governance /your-project/.cursor/skills/
```

After copying, restart Cursor to pick up the new skill.

---

## How Skills Work in Cursor

Skills are markdown files that teach the Cursor agent how to perform specific tasks. When your request matches keywords in the skill's description, the agent automatically reads and follows the skill's instructions.

No configuration needed — just place the skill folder in `~/.cursor/skills/` or `.cursor/skills/` inside your project.
