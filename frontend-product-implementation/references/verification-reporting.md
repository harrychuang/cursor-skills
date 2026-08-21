# Verification And Reporting

Use this reference before final response or handoff.

## Verification Order

Run framework-native commands from the selected target root using its recorded package manager and scripts:

1. formatter or lint for changed files
2. typecheck
3. unit/component tests
4. Storybook build or story smoke test
5. app build
6. local dev server or preview smoke test when the user needs to try it

If a command is unavailable, say so and name the closest check that was run.

## Runtime Architecture Verification

Before reporting completion:

- compare the implemented target root, framework/version, rendering model, build tool, language, and package manager with the decision record
- verify routing/navigation, state, data, i18n, styling/design-system, test, and Storybook integrations through the selected stack's native entry points
- use the repo's framework-native compiler, type checker, linter, test utilities, and production build rather than substituting React-oriented checks
- confirm any Storybook config and stories use a renderer compatible with the selected component framework
- verify SSR/SSG/client boundaries, hydration, server/client-only APIs, or embedded-runtime constraints when applicable
- report any deviation, its evidence or explicit approval, and its effect on scope

For an existing product, confirm that a feature request did not introduce an unapproved framework or architecture migration. For greenfield work, confirm that generated files match the user-confirmed record.

## UI Verification

For UI changes, verify:

- route or screen renders in the target shell
- loading, empty, error, disabled, permission, and success states in scope render correctly
- text comes from the i18n source when the repo has one
- visual values come from tokens
- focus-visible and accessibility labels are present
- responsive or app viewport behavior matches `UI_SPEC.md`
- Storybook stories cover changed shared components when Storybook exists
- a newly created component with a prototype counterpart matches it: compare the implemented variants and states against the prototype component source and stories args, and record any intentional divergence (platform adaptation, production token differences) with its reason

Use browser or screenshot verification when the app can be run locally and visual risk is meaningful. For prototype parity on newly created components, run a side-by-side visual comparison when the prototype Storybook can be run; the `ui-compare-to-reference` or `ui-pixel-align-report` skill can own that check.

## Final Response Contract

Report:

- handoff docs used
- target root and mode: greenfield or existing product
- selected platform, framework/version, rendering model, build tool, language, and package manager
- selected routing, state, data, i18n, styling/design-system, tests, and Storybook approach
- architecture decision sources, confidence, unresolved/not-applicable fields, and approved deviations
- design-system governance findings: token system, shared components, i18n, Storybook
- existing components reused; when the handoff comes from a prototype, report them as a prototype-to-production component map covering each handoff component in scope: reused production component (with name mapping), newly created with approval, or deferred with reason
- tokens reused or new token decisions requested
- new components created only with approval — each with its prototype source evidence and parity check result or recorded divergences when a prototype counterpart exists — or missing-component blockers
- routes/screens/features implemented
- data/API contracts implemented as mocks, adapters, or deferred real integrations
- verification commands run and results
- open architecture decisions and deferred production integration work

If blocked by design-system governance, lead with the blocking gate and the exact user decision needed.

## Completion Bar

The implementation is complete only when:

- the feature can run or build in the target repo
- implementation and verification follow the selected framework's native conventions
- the final architecture matches the inherited or confirmed decision record, except for explicitly approved and reported deviations
- documented route transitions and UI states are represented
- real data integration is either implemented by explicit scope or isolated behind typed contracts/mocks
- no unapproved tokens, unapproved shared components, or hardcoded visual values were added
- no unapproved framework, renderer, build, package-manager, routing, state, styling, or app-root migration was introduced
- verification results are reported clearly
