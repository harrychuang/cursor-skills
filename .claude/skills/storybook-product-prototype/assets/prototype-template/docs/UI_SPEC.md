# UI Spec

## Design Principle

[Describe the product experience and reuse expectations.]

## Shell

- [Describe viewport, navigation, header, footer, sheet, or modal shell.]

## Routes

### `__ENTRY_ROUTE_ID__`

- [Describe entry route composition and expected interactions.]

## Interaction

- [List how controls map to route transitions.]

## Visual Constraints

- Use existing design-system components before local markup.
- Use design tokens or project theme values.
- Keep prototype-only CSS scoped under `.__FEATURE_CSS_CLASS__`.

## Accessibility

- The root prototype region must have an accessible label.
- Navigation, buttons, overlays, and dismiss controls must have labels.

## AI Composition Rules

- Compose from existing components first.
- Keep event handlers close to route state.
- Keep fixture data in `__FEATURE_CAMEL__Data.ts`.
- Do not infer route behavior from screenshots; use `FLOW_SPEC.md`.
