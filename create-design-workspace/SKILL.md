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
- Optional `FIGMA_AUTH_MODE=connector`
- Optional target directory and project name

## Accuracy expectations

Before implementation, classify the source mode:

- Figma-first: highest-fidelity path because the workflow can use structured layout, variables, components, and selected frame context.
- Multi-reference screenshot: good visual reconstruction when repeated patterns and breakpoints are visible, but still requires explicit parity iteration.
- Single-image: first-pass approximation only. Record observed facts, inferred decisions, missing context, and open questions before coding.

Do not claim that one static image is enough to recover hidden states, responsive behavior, product rules, real data behavior, exact typography, or complete component ownership. Use `start-here/ACCURACY_CONTRACT.md` in the generated workspace to set expectations and sign-off criteria.

## Bootstrap workflow

1. Choose the target directory.
   - Prefer an empty directory.
   - If the current directory already contains unrelated app code, stop and use a new empty directory instead.
2. Run the bootstrap script:

```bash
node /Users/HarryChuang/.cursor/skills/create-design-workspace/scripts/bootstrap-design-workspace.mjs --target "<target-dir>" [--project-name "<name>"] [--figma-url "<url>"] [--figma-pat "<pat>"] [--figma-auth-mode "connector"] [--screenshot "<path>"]
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
- If the user intends to continue with Figma-first automation, require one of these before proceeding beyond bootstrap:
  - `FIGMA_PAT`
  - `FIGMA_AUTH_MODE=connector` when Cursor, Claude Code, or Codex already has authenticated Figma MCP/connector access
- If a Figma URL is present but neither `FIGMA_PAT` nor connector auth mode is configured, treat the workspace as invalid for Figma-first automation:
  - bootstrap is allowed
  - `workspace:sync` may still pass so tasks can be regenerated
  - `workspace:check` must fail until `FIGMA_PAT` is set or `FIGMA_AUTH_MODE=connector` is declared
  - do not start Phase 0 or automated Figma-driven implementation yet
  - explicitly tell the user to set `FIGMA_PAT` in `.env.local`, or declare `FIGMA_AUTH_MODE=connector`, then re-run `npm run workspace:sync` and `npm run workspace:check`
- After bootstrap, treat Figma mode as a gated workflow:
  - run `skills/figma-m3-variables/SKILL.md` as Phase 0
  - create or audit `Ref -> Sys -> Comp` variables
  - bind the agreed variables to the key source components
  - only then continue to code implementation

## Storybook requirements

- Use the latest stable Storybook 10 for shared component work.
- Prefer the official setup flow for new projects and the official upgrade flow for existing projects.
- Every reusable Storybook component must have Autodocs enabled.
- Every reusable Storybook component must include a component description in its docs output.
- Every reusable Storybook component must document important props through `argTypes` and expose expanded controls in docs.
- The generated workspace must include foundation guides for color, typography, spacing, corner, design principles, and design token usage.
- Foundation work must begin with evidence-backed analysis of the source design: color proportion, spacing feel, corner size, and typography weight.
- That analysis must separate `observed` source values from `inferred` system recommendations, then map the chosen system into tokens.
- When token work changes, maintain matching Storybook foundation pages with a design-led layout such as bento cards rather than plain token dumps.

## Full development workflow

Once the workspace exists:

1. Read `start-here/KICKSTART.md`, `start-here/BUILD_PLAN.md`, `start-here/TASKS.md`, and `design/foundations/README.md`.
   - Also read `start-here/ACCURACY_CONTRACT.md` before implementation.
2. Follow the local workflow skills in this order:
   - `skills/design-system-governance/SKILL.md`
   - `skills/ui-screenshot-to-storybook-product/SKILL.md`
   - `skills/ui-visual-parity/SKILL.md`
   - `skills/figma-m3-variables/SKILL.md` first when Figma mode is configured
3. Implement end-to-end:
   - classify the input source as Figma-first, multi-reference screenshot, or single-image
   - record observed, inferred, and missing context before coding from image-only sources
   - analyze the screenshot and/or Figma source for recurring signals in color proportion, spacing density, radius treatment, and type hierarchy
   - summarize 5-7 design principles backed by visible evidence
   - define design elements for color, typography, corner, and spacing before coding reusable components
   - update product docs and manifests
   - replace the placeholder foundation guides with project-specific design principles, specs, and token usage notes
   - build reusable Storybook components before screens
   - build or update Storybook foundation pages when the token system changes
   - compose screens from reusable components
   - run visual parity and fix drift at the correct ownership layer
   - record remaining variance as accepted, deferred, or blocked

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
