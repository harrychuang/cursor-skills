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

### [`ui-visual-parity`](./ui-visual-parity/)

Compares a UI implementation against reference screenshots and applies focused, design-system-aware visual fixes.

**What it does:**
- Supports both manual pairing (`screenshot + URL/route/file/story`) and automatic discovery of likely screenshot-to-implementation matches
- Stabilizes visual comparison with consistent render conditions, region-level analysis, computed styles, token mapping, and screenshot diff checks when practical
- Requires evidence for each fix, such as reference observations, rendered screenshots, computed styles, token values, component source, stories, or representative call sites
- Fixes visual drift from the most reusable owner first: design tokens/theme, shared primitives/components, component variants, then screen composition and page-only styles
- Avoids one-off hardcoded CSS unless no token, component, variant, or composition owner exists for the visual difference
- Stops and asks before editing when the target is ambiguous, cannot render, needs missing auth/data, or would require changing product behavior, copy, data flow, accessibility semantics, or risky shared defaults

**Use when:** auditing visual parity, fixing layout/token/component drift, or aligning implemented UI with reference screenshots across frontend projects.

---

## Installation

### Option A — Copy to personal Cursor skills (available in all your projects)

```bash
git clone https://github.com/harrychuang/cursor-skills.git /tmp/cursor-skills-install
cp -r /tmp/cursor-skills-install/design-system-governance ~/.cursor/skills/
cp -r /tmp/cursor-skills-install/ui-visual-parity ~/.cursor/skills/
```

### Option B — Copy into your project (available to your whole team via the repo)

```bash
git clone https://github.com/harrychuang/cursor-skills.git /tmp/cursor-skills-install
cp -r /tmp/cursor-skills-install/design-system-governance /your-project/.cursor/skills/
cp -r /tmp/cursor-skills-install/ui-visual-parity /your-project/.cursor/skills/
```

After copying, restart Cursor to pick up the new skill.

---

## How Skills Work in Cursor

Skills are markdown files that teach the Cursor agent how to perform specific tasks. When your request matches keywords in the skill's description, the agent automatically reads and follows the skill's instructions.

No configuration needed — just place the skill folder in `~/.cursor/skills/` or `.cursor/skills/` inside your project.
