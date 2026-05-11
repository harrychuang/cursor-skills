Read `skills/ui-visual-parity/SKILL.md` and compare the selected implementation target against the available source of truth.

Input: `$ARGUMENTS`

- If a screenshot path is provided, use screenshot mode.
- If only `.env.local` is configured, use Figma mode.
- If both exist, prefer Figma and use screenshots as secondary validation.

Apply fixes in the required ownership order:

1. token/theme
2. shared primitive/component
3. component variant/props
4. composition/layout
5. page-only styling
