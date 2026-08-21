# Component And Token Discovery

Use this reference after Frame The Product and before writing any doc content, prototype CSS, or prototype markup. The goal: the prototype composes from the components and tokens the project already has, instead of inventing parallel markup and styles.

## When To Run

- Always, once per prototype, before doc content is written — `docs/UI_SPEC.md` records its results directly.
- Re-run when the user adds routes that need component families the first scan did not cover.

## Delegate First

- If the `design-system-governance` skill is available in the session, run its discovery phase and honor its token and composition gates; this file is the standalone fallback.
- If the input is a screenshot or mockup image, delegate building-block inventory to `ui-screenshot-to-storybook-product` and consume its result as the Component Map source.
- If the user gives a Figma URL and Figma MCP tools are available, `get_code_connect_map` and `search_design_system` may confirm component-to-code mappings; treat them as optional evidence, not a required step.

## Discovery Tiers

Work down the tiers in priority order and stop at the first tier that yields a usable inventory. `scripts/inventory_components.py <repo-root>` automates Tiers 2-3 and the token scan.

### Tier 1: design-system-to-storybook artifacts

Authoritative when present. Look for:

- `design-system/COMPONENT_INVENTORY.md`
- `design-system/components/*.md`
- `component-review-status.json`

Use the documented component names, import paths, props, and variants directly.

### Tier 2: Storybook index and stories

- `storybook-static/index.json`, or the running Storybook's `/index.json`.
- Otherwise glob `**/*.stories.*` (excluding `node_modules`, `dist`, `storybook-static`) and read each story's meta `title`, `component`, named story exports, and `args`.

### Tier 3: source exports and packages

- Barrel exports under `src/components`, `src/ui`, `packages/ui`, or equivalent.
- `package.json` dependencies that are design systems or component libraries.

If no tier yields components, that is a valid result — record it as evidence, not as permission to skip the scan.

## Token Scan (Always Runs)

Regardless of component tiers:

1. Read `.storybook/preview.*` and note every global CSS import and decorator theme.
2. Find CSS custom-property definitions in those files and in obvious token/theme files. Record the actual prefix in use (`--sbt-*`, `--md-*`, `--color-*`, or another); never assume a prefix.
3. Note Tailwind config, CSS-in-JS theme objects, or styled-system themes when present.
4. Record the findings as the Token Namespace Record: prefix(es), defining file paths, and how the theme loads into Storybook.

## Recording Results

Write the results into `docs/UI_SPEC.md`:

- `## Component Map` — one flat bullet per screen region: `` `route-id` / region: `ComponentName` from `import/path` — variant or prop notes``. Inline code only; no tables, so the validator can parse names. Use the local binding name the prototype imports (the alias, for renamed imports), so the validator can match imports and JSX usage.
- `## Component Gaps` — one bullet per region that has no reusable component, with the fallback plan (local markup now, promotion candidate later). If the scan found nothing reusable, include the exact line `- No reusable components: <evidence>` naming what was scanned.
- `## Token Binding` — flat bullets mapping role to project token to `--proto-*` alias to fallback, plus a `Token system: <namespace or none>` line.

Echo the Token Namespace Record and promotion candidates into `docs/PRODUCTION_HANDOFF.md` under `## Design System Continuity`.

## Composition Rules

- Every screen region either renders its mapped component from the Component Map or is listed in Component Gaps. No third state.
- Import mapped components; do not re-implement them locally "for speed".
- Local markup created for a gap stays inside the prototype folder and is named in Component Gaps as a promotion candidate. After the team confirms the product direction, candidates the user approves are promoted into the hub's shared component library (see the promote step in `SKILL.md`); until then they stay local.
- The user confirms and vetoes the discovered map; they do not perform discovery. Present candidates with evidence (story title, import path, inventory doc line), then ask only what is wrong or missing.
