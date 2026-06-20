# Token Architecture

## Prefix

All project tokens use the `--ds-*` prefix by default. Update this prefix in `tokens/` and `.storybook/figma-export.config.ts` when your product uses a different convention.

## Layers

- `tokens/tokens-ref.css`: raw reference values such as color, size, and shadow primitives.
- `tokens/tokens-sys.css`: semantic roles that reference `--ds-ref-*` only.
- `tokens/tokens-comp.css`: component slot roles that reference `--ds-sys-*` only.

## Rules

1. Shared components and stories must not hardcode visual values when an equivalent token exists.
2. Component tokens must not reference reference tokens directly.
3. Semantic tokens must not reference component tokens.
