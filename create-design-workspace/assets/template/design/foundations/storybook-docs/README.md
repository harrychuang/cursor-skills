# Storybook Docs Templates

Use these templates when wiring the design foundations into Storybook.

## Included Files

- `overview.mdx`: landing page for the foundations section with a bento-style overview.
- `guides.mdx`: documentation IA and component page contract for the design-system site.
- `color.mdx`: semantic color and contrast guidance.
- `typography.mdx`: type scale, hierarchy, and reading rhythm guidance.
- `spacing.mdx`: layout rhythm and density guidance.
- `corner.mdx`: radius system and shape language guidance.
- `design-token-usage.mdx`: token pipeline and implementation guidance.
- `component-story-template.tsx.txt`: baseline Autodocs story template with argTypes and props controls.

## Usage

1. Start with `guides.mdx` to define the documentation site map and the standard component page sections before writing component detail pages.
2. Use `overview.mdx` as the front door for the foundations cluster.
3. Replace placeholder copy with rules from `design/foundations/*.md`.
4. Keep the card-based or bento-like presentation instead of flattening everything into tables.
5. Use the component story template for every reusable component, then tailor `args` and `argTypes` to the real props.

## Validation

Run `npm run storybook:check-docs` after adding reusable components. The check expects each component under `src/components` to have a companion story with Autodocs, a component description, and `argTypes`.
