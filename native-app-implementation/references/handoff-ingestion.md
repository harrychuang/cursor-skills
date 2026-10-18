# Handoff Ingestion (Native)

Use this reference when reading prototype handoff docs before implementing native code.

## Shared Contract, Delegated

The handoff input contract is shared with `frontend-product-implementation` and is not restated here in full. These rules carry identical semantics on a native target:

- **Reading order**: `PRODUCTION_HANDOFF.md`, then `PRD.md`, `FLOW_SPEC.md`, `UI_SPEC.md`, `DATA_SPEC.md`, `ACCEPTANCE.md`, `IMPLEMENTATION_GUIDE.md`.
- **Review Status gate**: read the named, dated, scoped `Review Status` and separate `Semantic Review` result and related-update record. Reuse existing explicit confirmation for the same scope; otherwise pause affected implementation for its owner decision. Demo confirmation does not confirm API or analytics authority. Semantic review checks proposed/superseded clauses and affected docs, fixtures, flow, metadata, and tests; mechanical completeness checks do not perform that review.
- **Consumed Manifest**: record `docsDigest`, `artifactsDigest` when present, and latest changelog `version`. Run reachable `validate_prototype.py <folder> --verify-manifest` at ingestion and before completion, and compare both consumed digests to the current manifest to detect republication. An absent manifest records docs/version as `unversioned` and artifacts as `unavailable`; a legacy manifest retains docs/version but records incomplete carrier integrity. Unavailable source checks remain an explicit limitation and never grant data authority.
- **Delivery scope, verbatim**: copy each row's scope from the Prototype To Frontend Map — never infer it from whether the prototype renders the screen. `A` already ships (do not rebuild; record the evidence path in the native repo), `B` new, `C` Storybook-only, `U` unverified and therefore a blocking question. A handoff predating the column means every row is `U`.
- **Conflict handling**: prefer `PRODUCTION_HANDOFF.md` for ownership/platform, `FLOW_SPEC.md` for routes/navigation/motion, `UI_SPEC.md` for interaction/accessibility, and `DATA_SPEC.md` for fixtures and UI shapes. Transport authority comes only from Data Authority and its confirmed source; document priority does not upgrade a proposed contract. Material conflicts pause affected work for its owner while independent confirmed work continues.

Only the native-specific deltas below are defined in this file.

## Native Deltas

### Which columns are yours

- **Scope**: on a multi-target handoff the map carries `Scope(web)` and `Scope(app)` columns. Read `Scope(app)`. A region that is `A` on web is routinely `B` on app — the web column is not evidence about your target, and treating it as such silently drops work.
- **Routes**: the route-to-surface mapping comes from `FLOW_SPEC.md`'s Production Navigation Map table — the `iOS destination` column on iOS, the `Android route` column on Android. `Not in scope` in your column means the route is out of scope for this platform; a blank cell is a blocking question, not an invitation to invent a destination.
- **Platform notes**: `PRODUCTION_HANDOFF.md`'s App Implementation Notes carries navigation stack, safe-area, orientation, gestures, haptics, permissions, offline/retry, and accessibility requirements. Web Implementation Notes is not your section.
- **Components**: your component inventory comes from `PRODUCTION_HANDOFF.md`'s `Design System Continuity` section — the Token namespace record (prefix and defining file paths, echoed from the UI spec's Token Binding), the Component Map echo, the per-screen composition echo of `meta.components` (per route: each component's name, origin `shared` / `local` / `promoted`, import path, and story id when one exists), and the Promotion candidates — together with `UI_SPEC.md`'s Component Map, Component Gaps, and Token Binding sections. Read them before the design-system governance discovery pass, so the composition gate compares the handoff's expected inventory against the native component library instead of starting from an empty list. Hub paths and story ids in those records are web artifacts: they are evidence of what exists and where the prototype source lives, never something a SwiftUI view or a composable can import.

Per-component native counterparts live in the prototype's `meta.components[].targets` (contract: `storybook-product-prototype/references/storybook-integration.md`, Component Composition Metadata). Read `targets.ios` on iOS and `targets.android` on Android — three states, no fourth:

| `targets` on your platform | Native reading |
| --- | --- |
| a string — `{ "ios": "AlertRowView" }`, `{ "android": "AlertRow" }` | an existing production counterpart: reuse that SwiftUI view or composable, do not rebuild it, and record the mapping in the implementation map |
| an explicit `null` — `{ "ios": null }` | production has no counterpart yet: treat it as a missing shared component and take it through the composition gate before creating anything |
| the key is absent — `{ "web": "AlertRow" }` with no `ios` | that entry is out of scope for this platform; it is not silent permission to build it |

The full `targets` object lives in the prototype story's `parameters.prototype.components`, so it is directly readable only when the prototype source is reachable. The `Design System Continuity` per-screen composition echo is the docs-only mirror and may carry no `targets` at all. When `targets` is absent for an entry, or the prototype predates the field, derive the prototype-to-native mapping yourself and record it as derived rather than inherited — a derived mapping is a claim to verify at the composition gate, not a fact from the handoff.

### Machine carriers to prefer over prose

The handoff ships platform-neutral carriers; read them instead of re-deriving their content from markdown:

| Carrier | Use it for |
| --- | --- |
| `docs/TOKENS.json` | Token values and their layered names (W3C DTCG). The prototype CSS is not your token source. |
| `fixtures/*.json` | Deterministic fixture data for mock adapters, loadable directly on both platforms. |
| `DATA_SPEC.md` Data Authority and JSON Schema blocks | Classified UI-model/fixture shapes for mock decoding types. Only separately confirmed transport evidence authorizes production request/response DTOs; using `Codable` or `kotlinx.serialization` does not confer authority. |
| `docs/flow.json` when present | Routes, nodes, and transitions with navigation semantics and no layout fields. Consumers MUST tolerate the optional top-level `viewport` object (`formFactor`, `width`, `height`) and optional per-route `viewport` overrides — the review viewport the prototype was designed at; absent means phone 375x812. |
| `docs/HANDOFF_MANIFEST.json` | The consumed handoff version and drift detection. |

When a carrier is absent, fall back to the corresponding doc section and record the fallback in the implementation map.

### Transition semantics to extract

For every transition in scope, extract `from`, `to`, `trigger`, `label`, `kind`, `presentation`, `backBehavior`, `motion`, and `motionRef`. Navigation and animation are independent decisions:

- Every non-return app transition requires explicit `presentation`. A missing value stays unresolved for that edge; neither legacy status nor an exporter scaffold implies push.
- A `kind: return` edge executes its confirmed `backBehavior`: dismiss, pop, or pop to root, never push a new destination copy. Return edges need no presentation; a missing backBehavior remains unresolved rather than becoming single-step back.
- Every edge entering a visible route requires `motion: none | platform-default | custom`. `none` and `platform-default` are explicit choices. Custom motion requires `motionRef: FLOW_SPEC.md#anchor` and a matching explicit anchor in that file; read its timing/token, gesture, and reduced-motion requirements. Flow-only branch evaluation does not by itself require an animation.

Reuse an already authorized default only with its exact source and scope recorded. Continue independent confirmed edges and screens while the named owner resolves missing intent, but keep the affected flow acceptance open. `export_flow.py` preserves missing semantics as unspecified; generated comments and stubs cannot authorize navigation. Use the platform call shapes in `implementation-workflow.md` only after the intent is resolved.

### Data authority on native

Read [the shared authority reference](../../storybook-product-prototype/references/handoff-authority.md). If unavailable, retain these local rules: fixture values are fake; `ui-model` schemas support UI models/mocks only; confirmed transport evidence must have `source.reference`, `source.revision`, `source.confirmedBy`, and `source.confirmedOn`. DTO evidence may come from a confirmed transport fixture schema or an independent confirmed contract's source. A proposed UI-model fixture linked to a confirmed API contract remains proposed/UI-scoped while the DTO follows `contracts[].source` and maps to that UI model; do not relabel the fixture or force matching shapes. Proposed/open/superseded/malformed evidence does not itself authorize DTOs. Fake values can follow a confirmed transport schema without becoming real.

Keep UI-facing input and error types distinct from wire types. The integration owner maps a confirmed DTO to the UI model; a different envelope or field name is not a requirement to change either model. Legacy fixtures have no transport authority. Suggestions such as an undocumented analytics `reason` remain proposed, outside formal parameters and acceptance criteria.

Remote Config can be prose defining a controlled region, intended behavior, demonstrated states, unknown details, and RD owner. Mock the declared states without inventing key/provider/default/refresh/cache/permission/rollout details. Unknown real contracts block only dependent wiring and handover; Fake-only native assembly can complete with the real seam recorded `open` under its owner.

## Extract These Contracts

Build a working map with:

- scoped Review Status and Semantic Review, consumed docs/artifact digests and version, and integrity results/limitations
- product goal and primary user
- the native architecture decision record from `native-architecture.md`
- route ids with their platform destinations, plus flow-only nodes and their branch meaning
- transitions with trigger, `kind`, `presentation`, `backBehavior`, `motion`, and `motionRef`, including unresolved intent per edge
- route parameters and deep links declared on routes
- UI composition, safe-area and orientation constraints, dynamic type, reduce-motion, and screen-reader requirements
- components to reuse, per route or region: the handoff entry, its origin, and the native counterpart resolved from `targets` on your platform (marked as derived when the handoff carries none)
- missing components or tokens: every entry whose counterpart is `null` or unresolved, every Component Gaps entry, and every Token Binding role with no native token — carried into the composition and token gates instead of being created inline
- reusable prototype source files to port, when the handoff lists them, as the parity reference for a new component's variants, props, and states
- tests and previews to add: the `#Preview` / `@Preview` states each implemented screen and component owes, and the unit or UI tests the in-scope acceptance ids require
- fixture groups with value usage, schema scope/status/source, UI models, confirmed transport evidence when present, states, and branch conditions
- Storybook-only boundaries that must not ship
- acceptance criteria ids in scope, with `AC-P` owner tags
- the named data-integration owner, or the absence of one as a blocking open decision

## Cross-Repository Access And Re-Sync

The native app almost never lives in the prototype's repository. Settle how the handoff reaches you before ingestion, and record which route you took — it decides which checks are runnable later:

- **Local path**: the prototype folder is checked out on this machine and reachable by absolute path. Preferred, because the prototype's own scripts (`validate_prototype.py --verify-manifest`, `export_flow.py`) can actually run against it.
- **Git submodule or vendored checkout**: the prototype, or just its `docs/` and `fixtures/`, is pinned inside the native repo at a commit. Record that commit next to the manifest digest; the pin and the digest disagree only when someone edited the vendored copy in place.
- **Manual copy**: only exported `docs/` and `fixtures/` were handed over — a zip, a PR, a shared drive. The prototype scripts are then unavailable; see Delegation Resilience below for the hand checks that replace them.

When fixture JSON or handoff docs are copied into the native repo:

- Record the provenance in two places: a source note beside copied files (repo, path, commit or delivery, copy date), and `## Consumed Manifest` with both available digests and changelog version. Record absent/legacy or inaccessible source integrity as a limitation. An unattributed copy cannot prove its origin.
- Keep copied fixtures byte-identical for reproducible UI/mock parity and source provenance. They are not a golden transport contract and real responses need not share their raw shape. Do not hand-correct the copy to match a backend DTO; the real adapter maps DTOs to UI models.
- Place them where the build can actually load them — `Bundle.module` versus `Bundle.main` on iOS, `assets/` versus `res/raw` versus test resources on Android. A copy the build never packages fails at runtime or passes only in tests; the rules are in `implementation-workflow.md`.

Re-sync when the handoff moves under an in-flight implementation:

1. **Detect drift at ingestion and before completion.** Run reachable `validate_prototype.py <prototype-folder> --verify-manifest`; version 2 checks additions, removals, and content changes across docs and carriers. Independently compare consumed `docsDigest` and `artifactsDigest` with the current manifest to detect republication. Keep recorded provenance when checks are unavailable, but clearly state which integrity evidence is missing; legacy needs renewed review and version 2 publication for complete coverage.
2. **Resolve affected work.** List changed docs, flow/data/meta, fixtures, exports, screens, seams, and acceptance/tests. Continue unaffected confirmed work while the owner resolves changed decisions and any superseded clauses. Matching hashes are never a semantic review.
3. **Re-copy the reviewed source files.** Preserve source bytes and source notes; do not edit the app's copy to manufacture a backend contract. Synchronize the affected Data/Handoff/Flow/Acceptance/fixtures/metadata/tests before consuming a new published snapshot.
4. **Re-record and verify** both available digests and the new version, and refresh scratch navigation skeletons when flow metadata changed. Record the new review scope, what was copied, affected implemented screens, and outstanding checks.

## Delegation Resilience

This skill deliberately delegates shared contracts and one script to `frontend-product-implementation` instead of restating them, so the two siblings cannot drift apart. That skill may not be installed here. Nothing below becomes optional when it is missing — each delegated item has a hand equivalent, and the substitution is named in the final report next to the checks that did run.

| Delegated item | Where it is delegated | When the sibling is absent |
| --- | --- | --- |
| Handoff input contract: reading order, Review Status gate, Consumed Manifest record, verbatim Scope consumption, conflict handling | this file's `Shared Contract, Delegated` section | the operative rules are summarized there; follow them as written and record that the sibling's full text was unavailable |
| The `IMPLEMENTATION_MAP.md` five-section contract | `verification-reporting.md`, Implementation Map File | write all five sections, including the full Data Adapter Seams authority record; no section is dropped for lack of the sibling |
| The `validate_implementation.py` machine audit | `verification-reporting.md`, Implementation Map File | follow that reference's manual checks for route/acceptance coverage, evidence paths, both available digests, Data Adapter Seams, and Component Map; record the substitution and separately run reachable source integrity verification |
| Token bootstrap for a repo that has a token source but no DTCG export | `implementation-workflow.md`, Token Consumption | port the minimal token subset by hand under the same source priority and the same approval gate, and record which source each token came from |

Delegations to skills other than the sibling are handled where they appear and are not covered by this table: `$design-system-governance` where `SKILL.md` binds it, the prototype's `validate_prototype.py` and `export_flow.py` under Cross-Repository Access above, and `api-data-integration` as one possible named receiving owner for the seams.
