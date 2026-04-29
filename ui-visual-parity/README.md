# UI Visual Parity

Compare implemented UI against reference screenshots, then apply focused visual fixes through the right design-system owner: tokens, themes, shared components, component variants, screen composition, or page-only styles.

This skill is project-agnostic. It first discovers the target project's screenshot locations, routing conventions, component structure, styling system, and design tokens before changing code.

## Use Cases

- Audit a page or component against a reference screenshot
- Fix layout, spacing, typography, color, radius, shadow, or responsive drift
- Align implementation with screenshots without hardcoding one-off CSS
- Find likely source files for a screenshot automatically
- Verify whether a mismatch belongs to tokens, shared components, variants, or the selected screen

## Input Modes

The skill supports both explicit manual pairing and automatic target discovery.

### Manual Pairing

Use this when you already know the implementation target:

```text
screen-2.png http://localhost:3000/dashboard
screen-2.png /dashboard
screen-2.png src/pages/Dashboard.tsx
screen-2.png Dashboard.stories.tsx
```

Explicit screenshot + URL/route/file/story pairs are treated as authoritative.

### Automatic Discovery

Use this when you want the agent to infer the target:

```text
screen-2.png
/dashboard
src/pages/Dashboard.tsx
```

The skill searches by screenshot filename, nearby docs, visible text, route names, component names, story names, asset names, page structure, and visual intent. If multiple matches are plausible, it should produce ranked candidates and ask before editing.

### Empty Target

If no target is provided, the skill can discover plausible screenshot-to-page pairs across the repository. It should ask before editing when matches are ambiguous.

## Workflow

1. Discover reference screenshots, routes, pages, components, stories, styling system, tokens, and design guidance.
2. Resolve the target using manual pairing, automatic discovery, or mixed constraints.
3. Compare the reference and implementation by region: header, sidebar, hero, cards, forms, tables, navigation, footer, and other visible blocks.
4. Inspect computed styles when a live URL or story can render.
5. Map measured differences to tokens, theme values, component variants, or composition rules.
6. Report discrepancies using:

```text
Block | Expected | Actual | Difference | Owner | Fix
```

7. Apply fixes from the most reusable owner first.
8. Re-capture or validate the result with screenshot diff, region diff, lint, typecheck, tests, or the project's cheapest reliable check.

## Fixing Strategy

Visual fixes must start at the most reusable layer:

1. Token/theme layer
2. Primitive or shared component layer
3. Component variant, props, slots, or composition API
4. Screen layout and composition
5. Page-only style, only when no reusable owner exists

Do not fix component-owned visual differences from the screen file. First repair the relevant token, primitive, shared component, or component variant, then return to the screen for layout and page-specific adjustments.

## Precision Rules

- Stabilize viewport, device scale factor, browser, color scheme, locale, fonts, mock data, auth state, and animation state when possible.
- Measure by region before making page-wide changes.
- Inspect computed styles such as font, line-height, color, padding, margin, gap, size, border, radius, shadow, and layout properties.
- Prefer token names, theme values, and component variants over raw CSS values.
- Use screenshot diff or cropped region diff when practical.
- Treat anti-aliasing, subpixel rounding, font rendering, and compression differences as acceptable when they do not affect perceived hierarchy or layout.

## Guardrails

- Require evidence for each planned fix: reference screenshot observation, rendered screenshot, computed style, token/theme value, component source, story, or representative call site.
- Avoid one-off hardcoded CSS unless no token, component, variant, or composition owner exists.
- Inspect representative call sites or stories before and after changing shared tokens, themes, primitives, variants, or components.
- Keep public component APIs stable unless the user asks for a broader refactor.
- Do not change product behavior, copy, data flow, accessibility semantics, or interactions when the task is visual parity.

## Stop Conditions

Stop and ask before editing when:

- The reference screenshot is too ambiguous
- The implementation target cannot be rendered
- Required auth or data is unavailable
- Multiple target matches are equally plausible
- The fix would require changing product behavior, copy, data flow, accessibility semantics, or risky shared defaults

