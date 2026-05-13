# Storybook Foundations Pages

These files live under `src/stories/foundations/` so a default Storybook setup can discover the foundation guides without extra `stories` glob changes.
They should remain custom MDX pages with designed layouts, not component Autodocs.

## Source Of Truth

- Treat `design/foundations/storybook-docs/` as the template source for these pages.
- Keep the docs titles and IA consistent with the design guides under `design/foundations/*.md`.
- When the token layer or usage rules change, update the visible Storybook pages here as part of the same change.

## Included Pages

- `overview.mdx`
- `guides.mdx`
- `color.mdx`
- `typography.mdx`
- `spacing.mdx`
- `corner.mdx`
- `design-token-usage.mdx`
