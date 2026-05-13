# Storybook Docs Templates

Use these templates when wiring the design foundations into Storybook.
The discoverable copies that Storybook can load with its default `src/**/*.mdx` glob live under `src/stories/foundations/`.
Foundation guides are custom MDX docs pages with intentional layout and narrative structure. They are not component Autodocs pages.

## Included Files

- `overview.mdx`: landing page for the foundations section with a bento-style overview.
- `guides.mdx`: documentation IA and component page contract for the design-system site.
- `color.mdx`: semantic color and contrast guidance as a designed docs page.
- `typography.mdx`: type scale, hierarchy, and reading rhythm guidance as a designed docs page.
- `spacing.mdx`: layout rhythm and density guidance as a designed docs page.
- `corner.mdx`: radius system and shape language guidance as a designed docs page.
- `design-token-usage.mdx`: token pipeline and implementation guidance as a designed docs page.
- `component-story-template.tsx.txt`: baseline Autodocs story template with argTypes and props controls for reusable components only.

## Usage

1. Start with `guides.mdx` to define the documentation site map and the standard component page sections before writing component detail pages.
2. Use `overview.mdx` as the front door for the foundations cluster.
3. Replace placeholder copy with rules from `design/foundations/*.md`.
4. Keep the discoverable `src/stories/foundations/*.mdx` pages aligned with this folder so a default Storybook install actually shows the guides.
5. Keep the card-based or bento-like presentation instead of flattening everything into tables.
6. Keep foundation pages as custom MDX. Use editorial sections, bento cards, and composed layout instead of generated Autodocs blocks.
7. Keep each page decision-oriented and concise: recommendation, rationale, usage boundaries, and exceptions beat encyclopedic token dumps.
8. Use the component story template for every reusable component, then tailor `args` and `argTypes` to the real props.

## Validation

Run `npm run storybook:check-docs` after adding reusable components. The check expects each component under `src/components` to have a companion story with Autodocs, a component description, and `argTypes`.
