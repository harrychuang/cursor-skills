---
name: native-app-implementation
description: "Implement native iOS (SwiftUI, Xcode, SPM) and Android (Jetpack Compose, Gradle, Kotlin) UI features from PRD, Flow, UI, Data, Acceptance, Implementation Guide, and PRODUCTION_HANDOFF docs. Use when a Storybook handoff targets a native app, translating confirmed navigation/motion or TOKENS.json into native code, or continuing after storybook-product-prototype. Inherit the app architecture and apply design-system-governance for tokens, localization, motion, and shared components. Separate Fake fixture/UI models from confirmed transport DTOs. Deliver mock DataSource seams and hand real API/auth/persistence wiring to the named integration owner; web targets belong to frontend-product-implementation."
---

# Native Product Implementation

Use this skill to turn the same frontend handoff document set that `frontend-product-implementation` consumes into working native product code — SwiftUI on iOS, Jetpack Compose on Android. This skill is the native sibling of `frontend-product-implementation`: `frontend-product-implementation` stays web-scoped; this skill owns the native targets. The handoff does not fork — one document set, per-platform implementation skills. Pipeline position and gates: `storybook-product-prototype/references/pipeline-stations.md` (station 4, native branch).

This skill owns native frontend implementation only: UI assembly and flow interaction. Real API clients, auth, persistence, storage, cache policy, and environment wiring are never in scope. Create typed UI models and mock adapters backed by the handoff fixtures, and hand real integration work to the named data-integration owner (a team, a system, or `api-data-integration`). An unknown owner blocks the affected integration handover; independent UI assembly can continue.

## Handoff Authority And Delivery

- Read `DATA_SPEC.md`'s Data Authority registry first. Fixture `values: fake` stays fake; a `schemaScope: ui-model` schema only authorizes UI models and mocks, even when confirmed or represented by `Codable`/`@Serializable` types. Transport DTOs require separately confirmed transport evidence with source `reference`, `revision`, `confirmedBy`, and `confirmedOn`; an independent confirmed `contracts[].source` can supply it while a linked UI fixture remains proposed. Missing, invalid, proposed, open, or superseded authority is not an API contract; demo confirmation does not upgrade it.
- Fake-only data and Remote Config prose can support completed UI assembly with real integration `open` under a named owner. Mock only the declared product states; do not invent endpoints, analytics parameters, config keys, provider/cache/rollout policies, or production defaults. Builder suggestions remain proposed.
- Every visible-route transition needs navigation and `motion: none | platform-default | custom`; custom uses an existing explicit `FLOW_SPEC.md#anchor`. Non-return edges require presentation; return edges require backBehavior and do not require presentation. Missing required navigation or motion stays unresolved: never assume push, single-step back, or platform animation. Reuse existing explicit authorization with its source recorded, and continue independent confirmed work.
- Record `docsDigest`, `artifactsDigest` when present, and version, and check reachable source integrity at ingestion and before completion. Absent/legacy integrity evidence remains a limitation; matching hashes do not confirm semantics or grant data authority.
- Read [the shared authority reference](../storybook-product-prototype/references/handoff-authority.md). If unavailable, follow these local rules and report the missing detail without upgrading authority.
- Deliver actual used skills into the target repo using the cm-skills project installer, an explicit skill list, and `--record-usage`. Native's required closure includes `design-system-governance` and frontend support; dependency installation does not itself mean a skill was used. Do not install the next-stage integration skill merely because it is named as receiver, use `all`, or install globally. Preserve non-managed `CLAUDE.md`/`AGENTS.md` bytes and verify repo-relative links and `docs/SKILL_USAGE.json` hashes; follow cm-skills `docs/skills-usage.md` for installer syntax.

## Inherited Shared Contracts

The following contracts are shared with `frontend-product-implementation` and carry identical semantics here — same document names, same gates, same output shapes:

- Handoff document reading order, with `PRODUCTION_HANDOFF.md` first.
- The Review Status gate: named, dated, scoped demo confirmation and separate Semantic Review; unresolved approval pauses affected implementation, while existing explicit authorization is reused.
- Verbatim Scope consumption: `A`/`B`/`C`/`U` copied from the Prototype To Frontend Map, never re-derived; for multi-target maps, read the `Scope(app)` column. `A` needs repo evidence, `U` is a blocking question.
- The Consumed Manifest record: `docsDigest`, `artifactsDigest` when present, and changelog version, with source checks at ingestion and completion; absent/legacy integrity is recorded as incomplete provenance.
- The `IMPLEMENTATION_MAP.md` five-section contract (Consumed Manifest, Route Outcomes, Acceptance Traceability, Data Adapter Seams, Component Map) and its machine audit.
- The Component Reuse Map contract: same `## Component Map` section name, same table columns (`Handoff component`, `Resolution`, `Production component`, `Evidence`, `Notes`), same five-value resolution vocabulary (`reused` / `composed` / `extended` / `created` / `deferred`), same machine audit — resolved here against the native component sources Repo Discovery locates, with evidence paths inside the native modules.
- Acceptance Traceability against `AC-S-*`/`AC-H-*`/`AC-P-*` ids; `AC-P (assembly)` criteria are settled by the mock-mode flow walkthrough.

## Required Companion Skill

Before implementing UI, load and follow `$design-system-governance`.

Use the explicitly selected cm-skills checkout when provided; otherwise resolve the companion through the skill catalog or [the sibling source](../design-system-governance/SKILL.md). If unavailable, report that `design-system-governance` must be installed from cm-skills or its `design-system-governance/SKILL.md` supplied, and pause affected UI mutations; independent discovery can continue. Do not silently substitute an older global governance skill.

All governance gates below inherit its scoped authorization rule: reuse existing approval for the same token/component work and ask only for unresolved choices. The Traditional Chinese prompts are examples that can be translated; they are not machine triggers.

Apply its Phase 0 discovery and gates as mandatory:

- Discover token naming, token layers, theme structure, motion values, shared component modules, previews, and the localization source before writing UI. Run that discovery against the native sources listed in `references/implementation-workflow.md` Repo Discovery and the companion's platform adaptation guidance.
- If the target app has no token system, stop and ask whether to establish one first; if the user approves establishing one, follow the token bootstrap path recorded in `references/implementation-workflow.md` Token Consumption.
- If a required token is missing, ask: `找不到對應的 design token（sys/comp 層）。是否要先建立這組 token，再繼續元件開發？`
- If a required shared component is missing, ask: `目前既有元件無法完整組裝此組件。是否要先建立新的共用子元件，再繼續？`
- Do not add hardcoded visual values, duplicates of shared primitives disguised as inline child views or composables, or display text outside the app's localization source when it has one.

Report the governance discovery findings and every gate decision in the final response.

### Platform Tailoring

`$design-system-governance` supports web and native targets. Apply its discovery and gates through the native conventions below; these bindings complement its platform guidance and do not require web tooling.

| Governance concern / web example | Native application |
| --- | --- |
| Storybook stories for each changed component (`Default` / `Hover` / `FocusVisible` / `Disabled`) | SwiftUI `#Preview` and Compose `@Preview` declarations covering the same documented states, driven by the mock data source — see `references/platform-conventions.md` |
| Hover state coverage | Pressed and focused states (press and focus interactions on Compose; button-style press state and focus state on SwiftUI). Hover applies only to pointer- or keyboard-attached targets such as iPadOS with a trackpad or desktop-class builds; where it does not exist, cover pressed and focused instead of reporting the story as missing |
| CSS keyframes, `animation-delay`, `cubic-bezier` and raw `ms` literals | SwiftUI animation curves (`.easeInOut`, `.spring`, and `Animation` values held in the token/theme layer) and Compose `AnimationSpec` values (`tween`, `spring`) resolved from the app's motion tokens rather than typed inline at the call site |
| The project's web breakpoint and layout conventions | iOS size classes and the app's adaptive layout convention; Android window size classes. Use whichever adaptive-layout convention discovery found in the target module — never port pixel breakpoints verbatim |
| `src/components/`, `packages/ui`, `src/styles/`, `*.css`, `*.scss`, `tokens/`, `locales/` | The native shared component library plus the token/theme and localization sources located by `references/implementation-workflow.md` Repo Discovery. The shared component library usually lives outside the app module, so read the dependency declarations before deciding the scan scope |

## Reference Loading

Read only the reference needed for the current step:

- Native architecture resolution and migration gates: `references/native-architecture.md` (always read first)
- Handoff ingestion deltas for native targets: `references/handoff-ingestion.md`
- Discovery, tokens, DataSource, navigation, and implementation flow: `references/implementation-workflow.md`
- Native implementation conventions that have no web equivalent — safe area and window insets, dark mode, type scaling, orientation, state restoration and large-screen adaptation, predictive back, accessibility, permission prompts, and previews as a deliverable: `references/platform-conventions.md` (read when implementing screens)
- Verification and final reporting: `references/verification-reporting.md`

## First Actions

1. Identify the exact native target root (Xcode project/workspace, SPM package, or Gradle module) and whether the request is greenfield or existing-product work.
2. Read `references/native-architecture.md`.
3. Locate the handoff docs (`PRD.md`, `FLOW_SPEC.md`, `UI_SPEC.md`, `DATA_SPEC.md`, `PRODUCTION_HANDOFF.md`, `ACCEPTANCE.md`, `IMPLEMENTATION_GUIDE.md`) plus the machine carriers: `docs/HANDOFF_MANIFEST.json`, `docs/TOKENS.json`, `docs/flow.json` when exported, and `fixtures/*.json`.
4. Read `PRODUCTION_HANDOFF.md` first. Check its named, dated, scoped Review Status and separate Semantic Review, reusing existing explicit authorization and resolving missing decisions for affected work. Read Data Authority, verify reachable source integrity, and record both consumed manifest digests and changelog version with any missing/legacy evidence in the implementation map.
5. Platform applicability gate — run it after the handoff is read and before any implementation. Read `PRODUCTION_HANDOFF.md`'s `Target Surfaces` section and, in `FLOW_SPEC.md`, the implementing platform's column of the Production Navigation Map (`iOS destination` / `Android route`). The handoff addresses your platform only when that column carries at least one real destination. Stop and ask when `Target Surfaces` marks `App:` as `Not in scope` (or omits it) **and** the platform column is absent, empty, or `Not in scope` in every row — the template always emits all four columns, so a web-only handoff shows up as a column full of `Not in scope`, not as a missing column. Then ask which way to go: send the handoff back to `storybook-product-prototype` to add the native target surface, fill the navigation-map column, and write the App Implementation Notes, or confirm that native behavior is to be derived without a native spec (then record that confirmation as a divergence). Never proceed silently on a web-only handoff. When the column carries real destinations for some routes and blanks for others, keep going and treat each blank cell as a blocking question instead of stopping the whole pass.
6. Resolve the native architecture decision record from repo evidence; stop at the migration gate for any implied re-platform.
7. Read the Scope column (or `Scope(app)`) of every map row and carry it verbatim into the implementation map; verify `A` rows against the native repo with evidence paths.
8. Load `$design-system-governance` and run its Phase 0 discovery per `## Required Companion Skill` before writing any UI: native design-token and theme sources, shared component modules, localization source, navigation setup, and test conventions.
9. Draft the Component Reuse Map before writing any UI code: resolve every in-scope handoff component against the native component modules discovery located to `reused`, `composed`, `extended`, `created`, or `deferred` per the inherited contract (`references/implementation-workflow.md` Design-System Governance Gate). A row that cannot be resolved raises the Composition Gate ask (or the Token Gate ask when the blocker is a missing token) before any UI code for the affected surfaces is written, and no non-terminal row may remain at completion.
10. Build the implementation map: platform routes, transitions with `kind`, `presentation`, `backBehavior`, `motion`, and `motionRef`, and fixture groups with classified UI schemas and separately confirmed transport evidence.
11. Implement per `references/implementation-workflow.md`; stop for approval before creating new shared components or token sets.

## Implementation Rules

- Follow the platform's native conventions: SwiftUI view composition, Swift concurrency, and SPM/Xcode structure on iOS; Compose functions, Kotlin coroutines, and Gradle module structure on Android. Never translate web or prototype framework idioms verbatim.
- Consume `docs/TOKENS.json` for tokens; never hand-transcribe values from prototype CSS while the DTCG export exists.
- Implement `<Feature>DataSource` and `Mock<Feature>DataSource` against UI models from classified UI schemas. Fixture decoding types remain mock/UI types; generate transport DTOs only from confirmed transport sources and record authority with the seam.
- Map confirmed `presentation`/`backBehavior` and motion intent per `references/implementation-workflow.md`. A return performs its declared back action and never pushes a destination copy. Missing required intent stays unresolved for the affected edge and cannot be filled with an unauthorized default.
- Preserve handoff route ids in navigation destinations, tests, or metadata for traceability.
- Implement loading, empty, error, disabled, permission, optimistic, and retry states when documented; drive them from fixture `state` values.
- Keep display text in the app's localization source when the module has one (`*.strings`, `*.stringsdict`, `*.xcstrings` on iOS; `res/values*/strings.xml` on Android). When discovery finds no localization source at all, stop and ask whether to establish one before implementing UI text — the same gate a missing token system gets. If the user declines, in-place strings are allowed and every location is recorded as a divergence in `IMPLEMENTATION_MAP.md`; a single-language app with no catalog is never treated as an unfixable violation.
- Do not wire real API clients, auth, storage, persistence, or environment-specific behavior under any condition; hand the replacement work to the named data-integration owner.
- Do not re-platform, change minimum OS/SDK versions, or swap UI/navigation frameworks without the explicit approval the migration gate requires.

## Completion Criteria

Do not consider work complete until:

- The native architecture decision record is reported with evidence, confidence, and unresolved fields.
- Every handoff route and state reached a terminal outcome (implemented / existing-verified with evidence path / deferred with reason / not-applicable for a route the Production Navigation Map marks out of scope on this platform, per `references/verification-reporting.md`).
- The mock-mode flow walkthrough passes on simulator or emulator: the FLOW_SPEC primary journey and every in-scope branch complete on mock adapters, every documented transition trigger interactively reachable — or a recorded degraded substitute covers the same items and the uncovered ones are listed with a named owner, per the degraded path in `references/verification-reporting.md`.
- Every in-scope fixture group has a UI model, typed DataSource, mock implementation, injection site, schema authority/source, and integration status/owner. Fake-only assembly can complete with real integration open. Groups belonging only to scope `A` surfaces are excluded and recorded; they never become new seams or integration work. Zero real endpoints, auth flows, or environment secrets were introduced.
- `IMPLEMENTATION_MAP.md` is written per `references/verification-reporting.md` and the shared audit passes — or its only failures are `not-applicable` rows explained per the known gap in that reference, or the manual equivalent is recorded when the sibling skill's script is unavailable. Never re-label a `not-applicable` row as `deferred` to make the audit green.
- Platform verification commands ran and are reported, and any command unavailable in this environment is named as such alongside the closest check that did run (`references/verification-reporting.md`).
- Every real integration item is handed to a named receiving owner or listed as a blocking open decision asking for one.
