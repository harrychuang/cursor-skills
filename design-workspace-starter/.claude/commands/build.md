Read `CLAUDE.md`, `start-here/BUILD_PLAN.md`, `start-here/TASKS.md`, and `skills/ui-screenshot-to-storybook-product/SKILL.md`.

If `.env.local` contains Figma configuration, run the Figma-first phase:

1. Read `.env.local`.
2. Run Phase 0 with `skills/figma-m3-variables/SKILL.md`.
3. Create or audit Ref -> Sys -> Comp variables and bind them to the key source components.
4. Load design context and variables from Figma.
5. Decompose the design into components and token roles.
6. Use `reference/` screenshots as secondary validation when present.

Then run the phased build workflow:

- Phase A: visual inventory after Phase 0
- Phase B: component list and reuse gate
- Phase C: Storybook-first component work
- Phase D: screen composition
- Phase E: parity and token audit
