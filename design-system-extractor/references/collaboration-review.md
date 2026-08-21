# Collaboration Review And Integration

Use this reference when multiple contributors use this skill on separate branches or PRs for the same design-system package.

## Recommended Shape

Keep collaboration review inside `design-system-extractor`. Integration decisions depend on source fingerprints, token inheritance, near-token decisions, and component similarity review, so a separate skill would duplicate the core gates and drift over time.

Use one integrator for each integration round. The role can rotate, but every round needs a named reviewer who owns the final decision log.

## Pre-Integration Inputs

Before merging, inspect:

- Current integration target branch and latest baseline.
- Contributor branch or PR diffs.
- `design-system/SESSION_STATE.md`.
- `design-system/INTEGRATION_REVIEW.md`.
- `design-system/DESIGN_EVIDENCE_MAP.md`.
- `design-system/TOKEN_ARCHITECTURE.md`.
- `design-system/COMPONENT_INVENTORY.md`.
- Relevant `design-system/components/*.md`.
- `tokens/tokens-ref.css`, `tokens/tokens-sys.css`, and `tokens/tokens-comp.css`.
- Generated `docs/design-system/review.html` when present.

## Branch Review Checklist

For each branch or PR:

1. Confirm the scope is narrow enough to review: one source batch, one component family, or one token decision batch.
2. Verify new Figma sources have normalized source keys or fingerprints in `DESIGN_EVIDENCE_MAP.md`.
3. Verify duplicate source decisions are recorded before duplicate evidence is counted.
4. Verify new or changed tokens preserve `ref -> sys -> comp` inheritance.
5. Verify near token candidates have `merge` or `keep distinct` decisions in `TOKEN_ARCHITECTURE.md`.
6. Verify new components were compared against `COMPONENT_INVENTORY.md` and existing component specs.
7. Verify similar components have `merge`, `make variant`, `keep distinct`, or `blocked` decisions.
8. Verify component specs include source evidence and a component fingerprint.
9. Verify generated docs were not treated as hand-authored source.
10. Record reviewer decision and follow-up in `INTEGRATION_REVIEW.md`.

## Merge Order

Prefer this order:

1. Source evidence intake branches.
2. Reference and system token branches.
3. Component token and component spec branches.
4. Page composition, interaction, and anti-AI rule branches.
5. Generated HTML docs after all source files are resolved.

Merge one branch at a time into an integration branch. Run audits after resolving conflicts and again after the final branch is integrated.

## Conflict Policy

- Evidence conflicts: prefer the source with the clearer fingerprint and more specific observed region; record duplicate decisions before counting both.
- Reference token conflicts: compare raw values and palette position; record near-token decisions before choosing.
- System token conflicts: choose the reusable semantic role; do not encode component anatomy in system token names.
- Component token conflicts: keep component slots in `tokens-comp.css`, and reference system tokens only.
- Component spec conflicts: merge anatomy, variants, states, and accessibility only when the component fingerprint still describes one component.
- Generated HTML conflicts: discard the conflict result and regenerate from Markdown and token source files.
- Unclear design decisions: mark the integration row `blocked`, write the exact question, and ask the developer.

## Integration Output

At the end of the pass, update:

- `design-system/INTEGRATION_REVIEW.md` with branch review rows, cross-branch decisions, merge log, blocked items, and next owner.
- `design-system/SESSION_STATE.md` with integration result, token layers changed, audit results, and recommended next prompt.
- `docs/design-system/index.html` and `docs/design-system/review.html` by regeneration only.

Run:

```sh
node <skill-root>/scripts/generate_docs_html.mjs <target-root>
node <skill-root>/scripts/generate_review_html.mjs <target-root>
node <skill-root>/scripts/audit_sources.mjs <target-root> --strict
node <skill-root>/scripts/audit_tokens.mjs <target-root> --strict
node <skill-root>/scripts/audit_components.mjs <target-root> --strict
```

