---
name: ui-visual-parity
description: >-
  Compare a UI implementation against one or more reference screenshots using
  automatic target discovery or an explicitly paired live URL, route, page, or
  component file. Use when auditing visual parity, fixing layout/token drift, or
  aligning implemented UI with screenshot references across any frontend project.
  Enforces component-first, token-first visual fixes before page-level style
  overrides.
---

# UI Visual Parity

Use this skill to compare a reference UI screenshot with the current implementation, then apply focused visual fixes. It is intentionally project-agnostic: discover the repository's screenshot locations, routing conventions, component structure, styling system, and design tokens before changing code.

Treat visual repair as a design-system exercise: trace the UI back to its tokens, theme, shared primitives, and composed components before editing the screen. Do not patch visual differences with one-off CSS unless the difference is truly unique to the selected screen and no shared abstraction owns it.

The reference can be paired with:

- a running page URL, such as `http://localhost:3000/dashboard`;
- an app route, such as `/dashboard`;
- a source file, such as `src/pages/Dashboard.tsx`;
- a component or story file, such as `Dashboard.tsx` or `Dashboard.stories.tsx`;
- an automatically inferred implementation target.

## Inputs

Accept any of these target forms from the user message:

- **Empty target:** compare all discoverable reference screenshots against likely pages.
- **Screenshot only:** `screen-2`, `screen-2.png`, `reference/screen-2.png`, `designs/dashboard.png`.
- **Screenshot + URL:** `screen-2.png http://localhost:3000/dashboard`.
- **Screenshot + route:** `screen-2.png /dashboard`.
- **Screenshot + file:** `screen-2.png src/pages/Dashboard.tsx`.
- **URL or route only:** `http://localhost:3000/dashboard`, `/dashboard`.
- **File only:** `src/pages/Dashboard.tsx`, `Dashboard.tsx`, `Dashboard.stories.tsx`.

Treat a screenshot + URL/file pair as the strongest signal. Do not override an explicit pair with auto-discovery unless the target cannot be found or loaded.

## Target Selection Modes

Support both manual and automatic target selection:

1. **Manual pairing:** If the user provides an explicit screenshot + URL, route, page file, component file, or story file, use that pairing as authoritative. Use discovery only to understand dependencies and verify the target can render.
2. **Automatic discovery:** If the user provides only a screenshot, only a route/file, or no target at all, actively infer likely screenshot-to-implementation pairs before comparing. Search by screenshot filename, nearby docs, visible text, route names, component names, story names, asset names, and page structure.
3. **Mixed mode:** If the user provides partial context, such as a screenshot folder plus a route prefix, use the provided context as constraints and auto-discover within those boundaries.

For automatic discovery, produce a short ranked candidate list when more than one plausible pairing exists. Proceed without asking only when there is a clear best match; otherwise ask the user to choose before applying fixes.

## Discovery

Before comparing or editing, discover project conventions:

1. Find reference screenshots. Check explicit paths first, then common folders such as `reference/`, `references/`, `screenshots/`, `design/`, `designs/`, `mockups/`, `spec/`, `specs/`, and `public/`.
2. Find UI entry points. Check explicit files first, then common locations such as `src/pages/`, `src/screens/`, `src/app/`, `app/`, `pages/`, `src/routes/`, `src/components/`, `components/`, and Storybook stories.
3. Identify the styling system: Tailwind, CSS modules, vanilla CSS, Sass, styled-components, CSS-in-JS, design tokens, theme files, or component libraries.
4. Identify available design guidance in files such as `README.md`, `CLAUDE.md`, `AGENTS.md`, `.cursor/rules/`, theme files, token files, Storybook docs, or component documentation.
5. If a live URL is provided, verify whether an app server is already running before starting one. Use the browser tools to inspect the page and capture the current implementation visually.

## Target Resolution

Resolve targets in this order:

1. **Screenshot + URL:** compare the screenshot to the rendered URL. Use source inspection only to understand and fix the implementation.
2. **Screenshot + file:** compare the screenshot to the component/page represented by the file. If possible, find or run the route/story that renders it; otherwise compare against the code structure and styles.
3. **Screenshot + route:** find the route's implementation file, then compare the screenshot to that route.
4. **Screenshot only:** automatically match by filename, nearby docs, route names, component names, story names, visible copy, assets, layout structure, and visual intent.
5. **URL or route only:** capture the current UI, then find the closest reference screenshot.
6. **File only:** find the rendered URL/story if possible, then match the closest reference screenshot.
7. **Empty target:** automatically discover plausible screenshot/page pairs across the repository, but ask before editing if there are multiple ambiguous matches.

If the screenshot or implementation target is ambiguous, list the likely candidates and ask the user to choose before applying fixes.

## Comparison Workflow

For each selected screen:

1. Inspect the reference screenshot and describe the intended visual structure: layout regions, hierarchy, spacing, alignment, typography, colors, borders, radii, shadows, imagery, and interactive states visible in the image.
2. Inspect the implementation source and its imported components.
3. Trace component ownership before editing: identify whether each visible block comes from a shared component, design-system primitive, third-party library wrapper, local page composition, or ad hoc markup.
4. If a URL or story can be rendered, compare the live UI against the reference visually. Use screenshots when helpful.
5. Cross-reference colors, spacing, typography, radius, elevation, and animation choices against the project's tokens or theme files when they exist.
6. Classify each discrepancy by likely source: token/theme, shared component, component variant/props, page composition, or one-off page style.
7. List visual discrepancies before editing.

Use this report format:

`| Block | Expected (reference) | Actual (implementation) | Difference | Owner | Fix |`

## Precision Workflow

Make visual repair as measurable as practical before editing:

1. **Stabilize render conditions:** When rendering a live URL or story, keep viewport size, device scale factor, browser, color scheme, locale, font loading, mock data, auth state, and animation state consistent between captures.
2. **Compare by region first:** Break the screen into blocks such as header, sidebar, hero, card, form, table, navigation, and footer. Compare region-level structure before making page-wide changes.
3. **Measure visible differences:** For each block, record expected vs actual spacing, alignment, dimensions, typography, color, border, radius, shadow, and responsive behavior when these can be observed or inferred.
4. **Inspect computed styles:** For renderable targets, inspect DOM and computed styles for key elements before editing. Check `font-size`, `line-height`, `font-weight`, `color`, `background`, `padding`, `margin`, `gap`, `width`, `height`, `border`, `border-radius`, `box-shadow`, and relevant layout properties.
5. **Map measurements to tokens:** Cross-reference measured values against design tokens, CSS variables, theme scales, Tailwind config, component variants, or style dictionaries. Prefer token names over raw values in the discrepancy report.
6. **Use screenshot diff when practical:** After fixes, capture the implementation again and compare it against the reference. Use full-page diff for broad regressions and cropped region diff for precise blocks whose small shifts would distort a full-page diff.
7. **Set an explicit tolerance:** Treat tiny anti-aliasing, font rendering, subpixel rounding, and image compression differences as acceptable when they do not affect layout or perceived visual hierarchy. Investigate repeated or structured differences.
8. **Re-check ownership after diff:** If differences remain after token and component fixes, confirm whether they belong to page composition or page-only styling before editing the screen.

Do not rely only on subjective visual judgment when computed styles, token values, screenshots, or region measurements are available.

## Evidence Requirements

For each planned fix, cite the evidence that justifies it: reference screenshot observation, rendered screenshot, computed style, token/theme value, component source, story, or representative call site. Do not make visual changes from intuition alone when stronger evidence is available.

## Component-First Fix Strategy

Prefer the same layered repair model used by mature design systems such as Material Design 3:

Before changing code, confirm whether each visual mismatch is owned by a design token, theme value, shared primitive, component variant, composition API, or the selected screen itself. Start at the most reusable owner and move toward the page only when earlier layers do not own the mismatch.

1. **Token/theme layer:** If the mismatch is a repeated color, spacing, typography, radius, shadow, elevation, breakpoint, or motion value, update or use the existing token/theme value first.
2. **Primitive/shared component layer:** If the UI block has a corresponding primitive, design-system component, shared component, or component variant, fix that owner instead of styling the page instance.
3. **Composition/layout layer:** After token and component fixes are correct, adjust the selected screen's composition: layout, ordering, spacing between sections, responsive structure, wrappers, slots, and props.
4. **Page-only style layer:** Use page-level CSS, utility classes, or inline style only when the visual difference is unique to the selected target and no shared token, primitive, variant, or composition API owns it.

Before editing, state which layer owns each planned fix. If ownership is ambiguous, inspect nearby stories, docs, component call sites, and token/theme files before choosing. Only directly modify the screen's style definitions when the screen has no corresponding reusable component or token owner, or when the mismatch is inherently page-specific.

## Regression Guardrails

When changing tokens, themes, primitives, component variants, or shared components, inspect representative call sites or stories before and after the change. If changing a shared default would unintentionally affect unrelated screens, prefer a variant, prop, slot, or composition-level adjustment.

Keep public component APIs stable unless the user asks for a broader refactor. Avoid product behavior, copy, data flow, accessibility semantics, or interaction changes when the task is visual parity.

## Stop Conditions

Stop and ask the user before editing when the reference is too ambiguous, the implementation target cannot be rendered, required auth/data is unavailable, multiple target matches are equally plausible, or the fix would require changing product behavior, copy, data, accessibility semantics, or shared component defaults with unclear blast radius.

## Fixing Rules

- Apply fixes only for the selected target.
- Prefer existing components, design tokens, utility classes, theme variables, and project conventions.
- Do not introduce one-off hardcoded styles when a token or shared primitive exists.
- Do not bypass shared components by restyling their rendered markup from the page. Update the component, variant, props, or token that owns the visual behavior.
- Do not fix component-owned visual differences from the screen file. First repair the relevant token, primitive, shared component, or component variant; then return to the screen for layout and page-specific adjustments.
- If a shared component change may affect other screens, inspect representative call sites or stories and keep the change compatible with existing intended variants.
- When a one-off screen style is unavoidable, keep it local, explain why no shared owner exists, and avoid hardcoded values when an existing token can express the same value.
- Keep changes scoped to visual parity unless the user asks for broader refactoring.
- If a URL was provided, verify the result against that URL after editing whenever practical.
- If a file was provided but no renderable URL/story is available, validate with typecheck, lint, tests, or the project's cheapest reliable check.
