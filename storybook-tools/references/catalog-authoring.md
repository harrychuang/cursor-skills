# Component catalog authoring guide

The catalog (`src/storybook/componentCatalog.ts`) is what coverage analysis
matches against. A shallow catalog produces unreliable reports — blocks get
classified "missing" because nothing matched, or matched to the wrong
component because keywords were vague. Budget real effort here: for a
mature component library expect roughly 15–25 lines per entry.

## Scope

- **Include**: reusable library components — primitives (button, icon,
  input), domain components (list rows, cards, chart modules), and reusable
  composites (sheets, dialogs, panels).
- **Exclude**: screens/pages, prototype compositions, one-off story fixtures,
  and the coverage tool's own story entry.

## Discovering components in a foreign project

1. Read `.storybook/main.*` `stories:` globs to find where stories live.
2. Walk the story files; each story file with a reusable component is a
   candidate entry. Group by source directory.
3. Read the component source (props, variants, states) and any component
   docs the project keeps — do not write entries from story names alone.

## Field rules

| Field | Rule |
| ----- | ---- |
| `id` | kebab-case, unique, stable — reports and reviews reference it forever. Prefer the component's directory name. |
| `name` | The component's display name as Storybook shows it. |
| `category` | Project-specific grouping; define 6–12 categories in `ComponentStorybookCategory` mirroring the project's existing sidebar grouping. |
| `compositionRole` | One of the fixed roles (action, control, data-display, feedback, layout, navigation, overlay, badge-label, asset, composite). |
| `provenance` | `extracted` when the entry is documented from a design source (Figma, spec, design doc); `implementation-derived` when documented by reading code. In a foreign project with no design docs, `implementation-derived` is the honest default. |
| `storyTitle` | EXACT Storybook title of the component's main story. Copy the story file's `title:`; for autotitle projects, derive it the way Storybook does (glob prefix + path) and double-check one example against the running sidebar. |
| `componentPath` | Repo-relative source directory. Must exist — the check script verifies it. |
| `storyPath` | Repo-relative main story file. Always set it; it is the fallback evidence for `storyTitle` in autotitle projects. |
| `purpose` | One concrete sentence: what it renders and what makes it distinct. Ban filler like "a flexible component for various use cases". |
| `useWhen` | 1–3 situational sentences a matcher can test a UI block against ("A screen needs X attached to Y"). |
| `avoidWhen` | Disambiguation against sibling components — where a *different* component is the right answer. Write one whenever two entries could be confused. |
| `dependencies` / `usedBy` | Catalog ids only. Fill from actual imports, not guesses. |
| `keywords` | 4–8 terms including synonyms a designer or PM would use (e.g. "modal" for dialog, "toggle" for switch, domain words). These drive matching recall. |

## Formatting contract (regex-parsed — do not break)

The check scripts and the report validator parse the catalog with regexes:

- `id` is the FIRST field of every entry object.
- `id`, `name`, `storyTitle`, `componentPath`, `storyPath` are single-line
  string literals.
- Standard 2-space indentation; each entry closes with `},` at
  2-space indent (default Prettier output).

## Quality bar (reject your own draft if any of these fail)

- Every entry's `componentPath` and `storyPath` exist; `storyTitle` matches
  a real story. (`node scripts/check-component-catalog.mjs` verifies.)
- No two entries have interchangeable `purpose` + `keywords` — if a reader
  can't tell them apart, coverage matching can't either; sharpen
  `avoidWhen`.
- `useWhen` items describe situations, not features ("A flow needs a
  blocking confirmation" ✓, "Has title and buttons" ✗).
- The user has reviewed the generated catalog — it encodes judgment calls
  (scope, categories, disambiguation) that the project team owns.
