# Page Composition Rules

Use these rules to document how components assemble into screens. This is still design-system work, not product implementation.

## Required Topics

Document:

- viewport assumptions
- app shell regions
- top navigation / app bar rules
- bottom navigation rules
- screen gutters
- section rhythm
- list behavior
- card/surface behavior
- scroll and fixed-region behavior
- safe-area behavior
- responsive behavior
- content density

## Composition Guidance

Write rules that help future implementation agents decide:

- when a row stays flat
- when a section becomes a card
- when a divider is enough
- when a saturated surface is allowed
- when a bottom bar is fixed
- how repeated sections space vertically
- how product imagery is placed
- how dense data screens differ from promotional screens

## Layout Decisions To Capture

For each repeated page pattern, record:

| Pattern | Evidence | Layout rule | Components used | Tokens used |
|---|---|---|---|---|

Examples:

- mobile app shell
- auth/splash screen
- home feed
- spending list
- card management screen
- settings/detail screen

## Anti-Drift Rules

- Do not turn app screens into landing pages.
- Do not wrap every section in a card.
- Do not add desktop dashboard chrome unless references show it.
- Do not increase whitespace beyond the observed density.
- Do not invent complex responsive layouts when only mobile references exist.
- Do not create one-off inline subcomponents when inventory components can compose the screen.
