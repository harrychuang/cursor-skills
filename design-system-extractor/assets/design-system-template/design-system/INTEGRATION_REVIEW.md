# Integration Review

Use this file when multiple contributors extract sources, tokens, or components on separate branches or PRs for the same design-system package.

## Integration Round

- Target branch:
- Integration branch:
- Integrator / reviewer:
- Started:
- Completed:
- Result: `not started`

## Branch / PR Queue

| Branch / PR | Owner | Scope | Files touched | Evidence status | Token status | Component status | Docs status | Audit status | Reviewer decision | Follow-up |
|---|---|---|---|---|---|---|---|---|---|---|

Reviewer decision values: `merge`, `request changes`, `blocked`, `superseded`, `defer`.

## Cross-Branch Decisions

Use this table when two branches overlap in source evidence, token candidates, component identity, naming, or generated outputs.

| Date | Branches / PRs | Overlap | Decision (`merge` / `make variant` / `keep distinct` / `reuse existing source` / `ignore duplicate` / `blocked`) | Rationale | Files updated | Confirmed by |
|---|---|---|---|---|---|---|

## Merge Log

| Date | Branch / PR | Commit / SHA | Reviewer | Decision | Audits run | Notes |
|---|---|---|---|---|---|---|

## Blocked Items

| Item | Blocking question | Needed decision | Owner | Target date |
|---|---|---|---|---|

## Final Integration Checklist

- [ ] Every branch or PR has a queue row and reviewer decision.
- [ ] Duplicate source decisions are recorded in `DESIGN_EVIDENCE_MAP.md`.
- [ ] Near-token decisions are recorded in `TOKEN_ARCHITECTURE.md`.
- [ ] Similar component decisions are recorded in `COMPONENT_INVENTORY.md`.
- [ ] Component specs changed in this integration have component fingerprints.
- [ ] Token inheritance remains `ref -> sys -> comp`.
- [ ] Generated HTML docs were regenerated after source conflicts were resolved.
- [ ] Strict source, token, and component audits passed or blockers are recorded.

