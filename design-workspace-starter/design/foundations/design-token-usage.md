# Design Token Usage

Explain how tokens move from design source to implementation and docs.

## Bento Snapshot

| Stage | Output | Owner | Notes |
| --- | --- | --- | --- |
| Extract | `design/extracted-design-tokens/design-tokens.json` | design system or automation | Raw capture of the current source |
| Normalize | semantic token files or theme layer | design system | Convert source values into stable roles |
| Apply | components, layouts, stories | engineering | Consume semantic tokens, not raw literals |
| Explain | Storybook foundations pages and these guides | design + engineering | Teach usage, exceptions, and review rules |

## Naming Guidance

- Prefer role-based names over page-specific names.
- Keep token families shallow and predictable.
- Reflect the layer in the name when needed: ref, sys, comp.
- Preserve a record of `observed` values separately from the normalized token names when analysis involves estimation.

## Required Mapping Table

| Design dimension | Observed value | Normalized token | Consumer examples |
| --- | --- | --- | --- |
| Color |  |  |  |
| Typography |  |  |  |
| Spacing |  |  |  |
| Corner |  |  |  |

## Implementation Guidance

```css
:root {
  --sys-color-surface: #ffffff;
  --sys-space-md: 16px;
  --sys-radius-md: 12px;
}
```

```ts
export const cardStyles = {
  background: 'var(--sys-color-surface)',
  padding: 'var(--sys-space-md)',
  borderRadius: 'var(--sys-radius-md)'
}
```

## Documentation Guidance

- Each foundation page should explain when to use the token family, not just list values.
- Record why a normalized token differs from an observed screenshot/Figma value when you intentionally simplify the system.
- Component stories should reference the relevant foundation rules in their descriptions when the dependency is important.
- If a token is deprecated, note the replacement and migration reason here before removing it.
