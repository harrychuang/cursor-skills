# Design System Extraction Kickstart

Extract a reusable design-system specification from the provided references.

Do not implement product screens yet. Do not scaffold app routes yet. Do not invent a landing page.

## References

List screenshots, Figma URLs/nodes, rendered routes, project folders, and prototype sources here.

## Required Order

1. Fill `DESIGN_EVIDENCE_MAP.md`, record source fingerprints, and review duplicate source candidates.
2. Fill `DESIGN_PRINCIPLES.md`.
3. Fill `DESIGN_ELEMENTS.md`.
4. Fill `TOKEN_ARCHITECTURE.md`, review near token candidates, then fill `tokens/`.
5. Fill `COMPONENT_INVENTORY.md` and review similar component candidates.
6. Extract at least one primary component token spec into `design-system/components/`.
7. Fill `PAGE_COMPOSITION_RULES.md`, `INTERACTION_STATES.md`, and `ANTI_AI_STYLE_RULES.md`.
8. Generate `docs/design-system/index.html` and `docs/design-system/review.html`.
9. Run strict source, token, and component audits.
10. Update `SESSION_STATE.md`.
11. Stop and ask the user what to do next.

## Boundary

This package defines design-system rules and tokens. Product implementation begins only after the user approves the checkpoint.
