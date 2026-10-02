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

Compares an implemented UI against a reference and fixes the visual differences until the two match in detail.

**References it accepts:** a Figma frame, a design export or screenshot, or another platform's implementation (a web build as the truth for an app, or the reverse).

**What it does:**
- Measures both sides exhaustively — every element that puts pixels on screen, with no sampling and no hand-written spec
- Runs three checks per cycle: **appearance** (fills, borders, radii, shadows, type, icons, pseudo-element decorations, interaction states), **geometry** (sizes and redline distances between elements), and **pixels** (the two screenshots overlaid, with an enlarged crop of every differing region)
- Separates causes from consequences, so one wrong padding is one thing to fix rather than a list of everything it moved
- Never reports two ways of drawing the same picture as a difference (a pill written as `9999px`, a gap made with margins, a border drawn as a ring, a divider drawn as its own element)
- Fixes from the most reusable owner first: design tokens/theme, shared components, composition, then page-only styles
- Leaves platform adaptations and recorded accessibility remaps alone, and refuses to change type values measured under the wrong font
- Stops when a cycle reports parity, or when a cycle makes no progress — and then reports what remains and why

**Prerequisites:** Node 22 or later and a Chromium-family browser (Chrome, Chromium, or Edge). Nothing to install; the skill runs from its own folder.

```bash
# capture the reference once, then run a cycle after each round of fixes
node ui-visual-parity/scripts/capture_web.mjs --url <reference> --root <selector> --out reports/parity/home --name reference
node ui-visual-parity/scripts/parity.mjs --reference reports/parity/home/reference.spec.json \
  --reference-image reports/parity/home/reference.png --url <implementation> --root <selector> --out reports/parity/home/cycle-01
```

Exit code `0` means the implementation is at parity. A cycle captures the implementation the way the reference was captured: same viewport, density, and colour scheme. Figma references are captured with a read-only script (see `ui-visual-parity/references/measure.md`); that path is tested against a stand-in for Figma's API and has not yet been run on a real Figma file.

**Use when:** an app or web UI does not match its design, spacing or type is slightly off, a screen is being ported between platforms, or layout and token drift needs auditing and repair.

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
