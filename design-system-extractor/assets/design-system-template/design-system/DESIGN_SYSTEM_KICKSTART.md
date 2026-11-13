# Design System Extraction Kickstart

Extract a reusable design-system specification from the provided references.

Do not implement product screens yet. Do not scaffold app routes yet. Do not invent a landing page.

## References

List screenshots, graphic/brand/editorial references, Figma URLs/nodes, rendered routes, native app captures, project folders, and prototype sources here.

For AI-generated or vibe-coded project folders, include route/state coverage, rendered capture attempts, screenshot paths, Storybook stories, and keep/ignore notes before using source code as high-confidence evidence.

For native iOS or Android project folders, include platform/framework coverage, native screen/state coverage, simulator/emulator/device or preview capture attempts, screenshot paths, design-system modules, token/resource files, component usage checks, and keep/ignore notes before using source code as high-confidence evidence.

## Required Order

1. Fill `DESIGN_EVIDENCE_MAP.md`, record source fingerprints, and record a suggested action for each duplicate source candidate.
2. For vibe-coded projects, complete the route/state manifest, run rendered UI capture when possible, and classify demo-only, unused, dead-code, capture-blocked, auth-blocked, contradictory, or out-of-scope sources before raising confidence.
3. For native app projects, complete the native screen/state manifest, run native capture/preview/screenshot-test capture when possible, and classify native-source-only, native-capture-blocked, native-contradictory, or out-of-scope sources before raising confidence.
4. Fill `DESIGN_PRINCIPLES.md`.
5. Fill `DESIGN_ELEMENTS.md`.
6. Fill `TOKEN_ARCHITECTURE.md`, record a suggested action for each group of near tokens, then fill `tokens/` with the near values kept as separate tokens.
7. Fill `COMPONENT_INVENTORY.md`, including reusable typographic/text-lockup candidates, and record a suggested action for each similar component candidate, with a marked screenshot of both sides.
8. Extract at least one primary component token spec into `design-system/components/`. For graphic/editorial-heavy references, this may be a high-value typographic lockup instead of an interactive UI control.
9. Fill `PAGE_COMPOSITION_RULES.md`, `INTERACTION_STATES.md`, and `ANTI_AI_STYLE_RULES.md`.
10. Generate `docs/design-system/index.html` and `docs/design-system/review.html`.
11. Run strict source, token, and component audits. Rows that only wait for the designer's confirmation fail them by design; report those as waiting, not as defects.
12. For collaborative branch or PR work, update `INTEGRATION_REVIEW.md`.
13. Update `SESSION_STATE.md`.
14. Stop, say how many review items are waiting on `docs/design-system/review.html`, and ask the user what to do next. A suggestion becomes a decision only when the designer confirms it there or in the conversation.

## Boundary

This package defines design-system rules and tokens. Product implementation begins only after the user approves the checkpoint.
