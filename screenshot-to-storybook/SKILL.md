---
name: screenshot-to-storybook
description: >-
  Turn an uploaded UI screenshot, mockup, or Figma export into a reusable,
  token-backed implementation workflow: inventory UI building blocks, extend
  Storybook or the project's component catalog first, then compose product screens
  from documented components. Use when implementing UI from an image without
  creating one-off styles or duplicating design-system markup.
---

# UI Screenshot → Storybook → Product

Use this workflow to turn a visual reference into production UI while preserving the target project's existing design system, component structure, and styling conventions.

This skill is project-agnostic. Before editing code, discover how the repository handles components, tokens, stories, routes, and documentation. Prefer Storybook when the project has it; otherwise use the closest equivalent component catalog, examples directory, design-system package, or documented shared component layer.

## When to Use

- The user provides one or more UI images: screenshot, mockup, production capture, Figma export, or design handoff image.
- The user asks to implement a screen from an image.
- The user wants UI work to land through reusable components instead of page-specific markup.
- The project has, or should have, a component documentation surface such as Storybook, Ladle, Histoire, examples, docs pages, or a shared component library.

## Inputs to Collect

1. **Image(s):** full viewport or focused region; note platform, viewport size, density, and theme if visible.
2. **Implementation target:** route, page file, component file, story file, or user-provided destination.
3. **Project map:** framework, route structure, component directories, styling approach, token files, theme files, and component documentation setup.
4. **Existing catalog:** Storybook stories, shared components, primitives, design-system package exports, examples, and docs that can be reused.
5. **Design guidance:** project rules, README files, token docs, brand guidelines, accessibility standards, and component usage docs.

## Discovery

Before planning implementation:

1. Find component documentation: `.storybook/`, `stories/`, `*.stories.*`, `*.mdx`, `ladle/`, `histoire.config.*`, `docs/`, `examples/`, or package exports.
2. Find reusable components: common directories include `src/components/`, `components/`, `src/ui/`, `src/design-system/`, `packages/ui/`, `ui/`, and `lib/components/`.
3. Find tokens and themes: CSS variables, Tailwind config, theme files, design token JSON, Sass variables, CSS modules, styled-system theme objects, or component library theme providers.
4. Identify local conventions for naming, variants, slots, props, accessibility, responsive behavior, and test coverage.
5. If the project has explicit design-system governance, follow it. If not, use the rules in this skill as the minimum governance contract.

## Phase 1: Visual Parsing

From the image, produce a structured UI inventory before editing code:

| ID | Block | Type (atom / molecule / organism / template) | Visible states | Notes |
|----|-------|---------------------------------------------|----------------|-------|

- Call out navigation, data display, forms, dialogs, cards, lists, tables, charts, empty/loading/error states, and responsive hints.
- Mark repeated patterns once; repeated visual structures should become one reusable component or variant.
- Record hierarchy from top to bottom and parent to child so the product screen can be composed cleanly later.
- Note visual tokens implied by the image: surface, text, border, radius, spacing, typography, elevation, opacity, and motion if visible.

## Phase 2: Map to Components and Tokens

For each inventory row:

1. Match it to an existing documented component, primitive, pattern, or story when possible.
2. If there is no match, decide whether the missing piece should be a new reusable component, a new variant of an existing component, or a page-only layout wrapper.
3. Map visual values to the project's tokens or theme primitives. Use existing token names and scales rather than inventing new ones.
4. If required tokens are missing, ask before adding a new token unless the project already has a clear token-extension convention.
5. Avoid hardcoded colors, spacing, radii, shadows, and animation values when a token, utility class, or theme value exists.

## Phase 3: Component Catalog First

Implement reusable UI before composing the final screen.

If the project uses Storybook:

1. Add or update co-located stories using the project's existing story format.
2. Cover default, variants, interactive states, responsive behavior, and light/dark themes when applicable.
3. Add or update foundations documentation only when the project already has that convention or the user asks for it.
4. Verify in Storybook before importing the component into a product route when practical.

If the project does not use Storybook:

1. Use the project's equivalent documentation or example surface.
2. If no catalog exists, create the smallest useful example, demo, or test fixture that matches local conventions.
3. Do not introduce Storybook as a new dependency unless the user asks for it.

## Phase 4: Assemble the Product Screen

1. Create or update the page-level module using documented shared components and layout primitives.
2. Compose the screenshot section by section; avoid re-implementing shared component internals in the route.
3. Wire real data, loaders, actions, and integration logic after the visual shell is stable.
4. Preserve accessibility semantics: landmarks, labels, keyboard states, focus handling, contrast, and reduced-motion behavior.
5. Compare the result against the original image and fix visible drift.

## Quality Checklist

- [ ] No hardcoded colors, spacing, radius, or animation durations outside the token system.
- [ ] Existing components and primitives were reused before adding new ones.
- [ ] Every new reusable block has a story, example, fixture, or documented usage path.
- [ ] Product pages compose shared components instead of duplicating design-system markup.
- [ ] Variants, responsive states, loading/empty/error states, and interaction states are represented when relevant.
- [ ] Accessibility requirements are preserved or improved.
- [ ] The implementation was visually compared with the provided image.

## Validation

Choose the cheapest reliable checks for the project:

- component catalog or Storybook preview;
- browser screenshot comparison against the reference;
- lint, typecheck, unit tests, or visual tests;
- focused manual inspection for layout, responsive behavior, and accessibility.

## Tooling Notes

- Ask the user to attach the image or provide a file path when no image is available in context.
- If written specs and the image disagree, call out the conflict and ask which source should win unless the project has a documented priority order.
- Keep implementation changes narrow: build only the components and screen areas needed for the requested image.
