# Native Implementation Workflow

Use this reference after the handoff docs are read and the native target is identified.

Read `native-architecture.md` first. Architecture resolution precedes project changes, dependency changes, generation, and production edits.

## Contents

1. Repo Discovery
2. Design-System Governance Gate
3. Token Consumption
4. DataSource Pattern
5. Build Membership And Resources
6. Navigation Semantics Mapping
7. Existing App Mode
8. Greenfield Mode
9. Approved Component Porting
10. Documentation Updates

## Repo Discovery

Inspect before editing. The shared component library usually lives outside the app module on both platforms — read the dependency declarations first (`Package.swift` dependencies and local package paths on iOS, the `include` list in `settings.gradle(.kts)` on Android) and let them decide how wide to scan. Scanning only the app module reports "no reusable components" for a repo that has a full design-system package.

iOS:

- project and build config: `*.xcodeproj`, `*.xcworkspace`, `project.pbxproj`, build settings, `*.xcconfig`, schemes, `Info.plist`
- project generation: `project.yml` (XcodeGen) or `Project.swift` and `Tuist/` (Tuist). When either exists, the `.xcodeproj` is generated output, not the source of truth
- minimum OS version: `IPHONEOS_DEPLOYMENT_TARGET` in build settings or an `*.xcconfig`, and the `platforms:` clause in `Package.swift`
- package manifests: `Package.swift`, `Package.resolved`, `Podfile` and `Podfile.lock` when CocoaPods is in use
- shared components: local Swift packages under `Packages/` (or wherever the manifest points), the `.library` products declared in `Package.swift`, dedicated `DesignSystem` / `UIComponents` targets, and the `#Preview` / `PreviewProvider` declarations that act as the component catalog
- app structure: `@main` entry, scene/app delegates, feature folders, view directories
- navigation: `NavigationStack`/`NavigationSplitView` usage, routers, coordinators, or UIKit navigation controllers
- design tokens and theme: asset catalogs (`*.xcassets`), `Color`/`Font` extensions, theme or design-system Swift files
- localization: `*.strings`, `*.stringsdict`, String Catalogs (`*.xcstrings`)
- data patterns: existing clients, repositories, services, mocks, preview fixtures
- tests: XCTest targets, swift-testing usage, snapshot test setup, UI test targets

Android:

- build config: `settings.gradle(.kts)`, module `build.gradle(.kts)`, version catalogs (`gradle/libs.versions.toml`), `gradle.properties`, `AndroidManifest.xml`
- SDK versions: `minSdk`, `targetSdk`, and `compileSdk` in the module `build.gradle(.kts)` or the version catalog
- shared components: dedicated Gradle modules such as `:core:ui`, `:design-system`, or `:common-ui` — cross-checked against the `include` list in `settings.gradle(.kts)` — plus the `@Preview` composables, Showkase catalog, or Paparazzi snapshot directories that act as the component catalog
- app structure: `Application` class, activities, feature packages, Compose screen files
- navigation: `NavHost` setup, navigation graphs, route constants, Fragment navigation when present
- design tokens and theme: `MaterialTheme` setup, theme objects, `Color.kt`/`Type.kt`, resource values
- localization: `res/values*/strings.xml`
- data patterns: existing Retrofit/Ktor clients, repositories, DI modules, fakes
- tests: JUnit, Compose UI tests, Robolectric, screenshot test setup

Record discoveries with file-level evidence in the working notes and the final report.

### API availability gate

The discovered minimum OS/SDK version is the floor every implementation choice runs against. Do not use an API introduced after that floor. When the natural implementation needs a newer API:

1. Prefer an API available at the floor that satisfies the same handoff requirement.
2. When no equivalent exists, guard the newer path and keep a working path below the floor — `if #available(iOS 17, *)` or `@available` on iOS, an SDK-level check or `@RequiresApi` on Android — and record the divergence in the implementation map.
3. Raising the minimum OS/SDK version is a product decision, not an implementation detail: take it through the migration approval gate in `native-architecture.md`. Never raise it as a side effect of choosing an API.

This applies to the navigation, token, and preview APIs named later in this file — check each one against the recorded floor before adopting it.

## Design-System Governance Gate

Reuse authorization already recorded for the same token or shared-component scope under `$design-system-governance`; the ask steps below apply only to unresolved decisions.

Before any UI implementation:

1. Apply `$design-system-governance` Phase 0 discovery against the native theme sources found above.
2. List existing tokens and shared UI components relevant to the handoff.
3. Draft and resolve the Component Reuse Map per the shared contract (`frontend-product-implementation/references/implementation-workflow.md`, Component Reuse Map): row sources, the five-value resolution vocabulary, and targets-seed verification are identical. Resolve each row against the native component sources Repo Discovery located — attempting composition from existing shared components before creating new ones — and record evidence as repo-relative paths inside the owning native module (a local Swift package, a Gradle module such as `:core:ui`). For `targets` metadata, read the implementing platform's key (`ios` / `android`).
4. Stop and ask when a required token or shared component is missing: an unresolved row raises the Composition Gate ask — or the Token Gate ask when the blocker is a missing token — before any UI code for the affected surfaces is written. The completed map becomes the `## Component Map` section of `IMPLEMENTATION_MAP.md` (`verification-reporting.md`).

Do not add hardcoded color, spacing, corner-radius, typography, or motion values, and do not put display text outside the platform's localization source when the module has one. When discovery finds no localization source at all, take the ask gate in SKILL.md's Implementation Rules rather than treating in-place strings as an unfixable violation.

Then read `platform-conventions.md` before writing screens, in both Existing App Mode and Greenfield Mode. It carries the native concerns the handoff specifies but web has no equivalent for — safe area and window insets including edge-to-edge, dark mode, dynamic type, orientation and state restoration, multi-window and large-screen adaptation, Android predictive back, accessibility, permission flows, and previews as a deliverable — each traced back to the handoff field that specifies it.

## Token Consumption

`docs/TOKENS.json` (W3C DTCG) is the token source of truth when the handoff ships it. Never hand-transcribe values from prototype CSS while that export exists.

### What the export actually contains

The document has a single group, `proto`, keyed by the prototype's role aliases. Each entry is exported from one `--proto-*` CSS declaration in the prototype stylesheet:

```json
{
  "$description": "Design tokens exported from ...-prototype.css --proto-* alias block ...",
  "proto": {
    "accent": {
      "$type": "color",
      "$value": "#2563eb",
      "$extensions": {
        "works.cm.storybook-product-prototype": {
          "sourceToken": "--sbt-sys-color-primary",
          "tokenPrefix": "sbt"
        }
      }
    }
  }
}
```

Read it in three layers, and do not collapse them:

| Layer | Where it lives | What it means |
| --- | --- | --- |
| Role alias | the key under `proto` (`proto.accent`) | the prototype's semantic role — what the value is used for. Not a project token name |
| Fallback value | `$value` | the literal the prototype CSS falls back to when the design-system token is undefined. A neutral placeholder, not the project's own value |
| Source token | `$extensions["works.cm.storybook-product-prototype"].sourceToken`, with the layer prefix in `tokenPrefix` | the layered design-system token the alias binds to. This is the mapping key onto the app's theme |

Rules:

- Map by `sourceToken`, not by value. It carries the ref → sys → comp name that governance discovery and later audits match across repos; matching by hex value instead produces a parallel second token system, which is the thing the app-side rule below forbids.
- When `UI_SPEC.md` carries a Token Binding record naming the project's tokens for these roles, that record wins: derive the native token from the project token it names, and use `$value` only as the fallback for a role the project does not define.
- An entry with no `$extensions` came from a literal in the prototype CSS with no design-system token behind it. `$value` is then the only source available; record it as an unbound value so the design side can supply a real token later.
- An entry whose `$type` is `string` is a value the exporter could not classify (its `$description` preserves the raw text). Decide its type from the Token Binding record before generating anything from it.

Output format by platform:

| Platform | Token output |
| --- | --- |
| SwiftUI | `Color`/`Font` extensions, or an asset-catalog-backed token enum when the app already keys colors through asset catalogs |
| Jetpack Compose | A Kotlin theme object or a `MaterialTheme` extension, following the module's existing theme structure |

Rules:

- Generate from the DTCG values — via Style Dictionary's native transforms or an equivalent codegen step — rather than retyping them.
- Preserve the layered ref → sys → comp names carried by `sourceToken` (or by the Token Binding record) in the native token names, so governance discovery and later audits can match them across repos.
- Port only the tokens the in-scope routes need, plus the ref tokens they resolve to; record excluded groups as deferred.
- When the app already has a token system, map handoff tokens onto it and record the naming translation; do not create a parallel second system.
- When no token source exists on either side, stop and ask before inventing values.

### Dimension tokens: text size versus spacing

DTCG's `dimension` type does not say whether a value is a text size or a spacing/sizing value, and the two scale differently on native. Decide this per token before generating anything. The deciding evidence is the token's role name in the `UI_SPEC.md` Token Binding record, or the `sourceToken` name when Token Binding is absent.

| Token role | iOS | Android |
| --- | --- | --- |
| `font-md-size` (text size) | a relative text style — a system `Font.TextStyle`, or `Font.custom(_:size:relativeTo:)` for a custom face — so the value tracks Dynamic Type; wrap a raw numeric that must track it in `@ScaledMetric` | `sp` (a `TextUnit`), so the value follows the system font-size setting |
| `space-4` (spacing) | a fixed value | `dp` |
| `radius-card` (sizing) | a fixed value | `dp` |

- Never emit a fixed point size for a text token. A hardcoded `Font.system(size:)` on iOS, or a `Dp` used as a text size on Android, opts the screen out of system font scaling — the failure the App Implementation Notes' dynamic type requirement exists to prevent.
- Do not scale spacing and sizing with the font-size setting unless the handoff says a specific metric must track text.
- When a dimension token's role does not say which kind it is, stop and ask. A misclassified token compiles and renders normally; it only surfaces during an accessibility pass or a user report.
- The unit decision is an input to the codegen step, not something it infers — configure the Style Dictionary transforms (or the equivalent) per token group accordingly.

### Dark mode

The export carries a single `$value` per token. A native target that supports dark appearance needs two values per color token.

- iOS: carry both through an asset catalog color set with `Any` and `Dark` appearances, and let the token enum or `Color` extension read that color set. Two unrelated `Color` constants selected in view code is not the appearance mechanism.
- Android: produce both `lightColorScheme` and `darkColorScheme` and let `isSystemInDarkTheme()` select between them in the theme. A single scheme applied unconditionally is a defect on a system-level toggle.
- When the handoff provides no dark value for a color token, stop and ask: either design supplies it, or the App Implementation Notes declares dark appearance out of scope for this feature and it is recorded as deferred. Do not derive a dark value by darkening or inverting the light one.
- When the app already has a theme with dark support, map onto its existing light/dark pair rather than adding a second appearance mechanism next to it.

### When the handoff ships no DTCG export

Three cases; only the first ends the token work here:

- No token source on either side: stop and ask before inventing values (rule above).
- No `docs/TOKENS.json`, but a prototype token source exists — token files generated by `design-system-to-storybook`, token architecture documents from `design-system-extractor`, or a Figma Variables export: follow `frontend-product-implementation/references/token-bootstrap.md`. Its Prototype Token Source Discovery Order sets the priority between those sources, its Minimal Token Subset Derivation computes the dependency closure, its Reverse-Inventory Fallback With Approval defines the stop-for-approval path, and its Target Styling Technology Adaptation table already carries the SwiftUI and Jetpack Compose output rows.
- The app already has a token system: the governance gate proceeds unchanged and the bootstrap procedure does not apply.

When that sibling skill is not installed in this environment, do not skip the procedure. Follow the same steps by hand — select the highest-priority source that exists and record its file-level evidence, port the minimal subset with its full dependency closure, keep the layered names, stop for approval before proposing any reverse-inventory token set, and report the selected source, the ported list by layer, the chosen output format and file locations, the deferred tokens, and any naming translations — then record in the final report that the token bootstrap was run manually.

## DataSource Pattern

Real integration is never in scope for this skill. For every in-scope fixture group — those belonging to the routes and regions the map scopes `B` on this platform, plus any `U` row a resolved blocking question turned into new work — create the named adapter seam:

- UI models and UI-facing input/error types from Data Authority-classified UI schemas; `Codable` structs or `@Serializable` data classes may decode mock resources, but that capability does not make them transport DTOs. Generate wire request/response types only from separately confirmed transport source evidence. Preserve `default` / `loading` / `empty` / `error` and documented disabled/permission branches.
- `<Feature>DataSource`: a Swift `protocol` or Kotlin `interface`, with one method per in-scope handoff fixture group.
- `Mock<Feature>DataSource`: the deterministic implementation, loading the handoff's `fixtures/<group>.json` from the resource location chosen below. Copy the JSON files into the target's resources rather than duplicating their values in code.
- A clear replacement point: the injection site the data-integration owner swaps. Record the UI model, interface, mock path, injection site, schema authority/source, and integration status/owner in Data Adapter Seams; fill the handoff's `Adapter interface` column when updating handoff docs.

Fixture groups belonging to routes or regions the map scopes `A` on this platform are excluded and recorded as such — they never become DataSource seams, and they never become integration work for the next stage.

Do not invent endpoints. Do not add secrets, environment configuration, auth flows, or persistence; those belong to the named data-integration owner.

### Let the contract semantics shape the interface

Before fixing method signatures, read the `Semantics` cell and its Data Authority/source status. Confirmed UI behavior shapes the UI-facing seam; only confirmed transport evidence specifies wire parameters. On native, record these distinctions before making signatures rigid so a proposed transport assumption does not spread into view models and call sites.

- `pagination` — decides whether the method takes a cursor or an offset/limit pair and what the return type carries back (the next cursor, the total, whether more pages exist). A method returning one fixed page cannot be substituted by a paginated implementation.
- `sort-filter` — decides whether sort and filter criteria are parameters of the method or fixed by the caller.
- `freshness` — decides between a one-shot suspending/async call and a stream. Polling or pushed data means an `AsyncSequence` (Swift) or a `Flow` (Kotlin), not a single value the caller re-requests.
- `mutation` — decides whether the interface needs write methods at all, and whether an optimistic path needs a rollback entry point.
- `errors` — decides the cases of the error type. A retryable / terminal / re-authentication split in the contract becomes distinguishable cases, not one generic failure.

An `unknown (owner: …)`, proposed, or open entry remains the named owner's decision. A signature needed for mock/UI assembly is explicitly provisional for unresolved semantics; record the affected method and integration limitation instead of inferring transport inputs from fixtures. Independent Fake-only assembly can complete with real integration `open`. Before wiring, the integration owner maps confirmed DTOs to the UI model and resolves any semantic/signature changes with the assembly owner; different wire field names alone do not require UI changes.

Remote Config may be a text-only intent with a controlled region, demonstrated states, unresolved details, and RD owner. Use the mock seam to display the declared states; leave key/provider/production default/refresh/cache/permission/rollout details open. Do not promote an analytics suggestion such as `reason` into the formal event or acceptance criteria.

### Injection site

The replacement point is one named place where the feature resolves its `<Feature>DataSource`, so the next stage swaps a single registration. It matters more on native than on web: `api-data-integration` is not allowed to change UI code, so a mock constructed inside a view or a view model's own initializer leaves it with no legal way to substitute the real implementation.

Pick one of three forms, following whatever the app already does:

- **Environment or composition-local value** — iOS: a custom `EnvironmentKey` (or the Observable-based `@Environment(<Feature>DataSource.self)` form where the deployment floor allows it) provided once at the composition root. Android: a `staticCompositionLocalOf` key provided by `CompositionLocalProvider` at the screen or app root. Cheapest for a small feature and it makes previews trivial to vary, but the dependency is implicit — nothing fails at compile time when a caller forgets to provide it.
- **Constructor injection into the view model** — iOS: pass the data source into the view model's initializer at the call site that creates it. Android: an `@Inject` or plain constructor parameter, with the view model created through the module's factory. The dependency is explicit and testable, and the swap point moves to whoever constructs the view model.
- **DI module registration** — Android: a Hilt `@Module` binding or the Koin module entry. iOS: the app's container or factory registry when it has one. Best for an app that already routes dependencies this way: the swap is one binding line, with no feature code touched at all.

Rules:

- Do not construct `Mock<Feature>DataSource()` inside a view body, a composable, or a view model's own initializer. That is not a seam.
- Record which form was used and where — file path plus the symbol that performs the registration — in the `Injection site` cell of the implementation map's Data Adapter Seams table. "Somewhere in the feature" is not a hand-over.
- Use the same injection site to drive previews from the mock (see `platform-conventions.md`). A preview that renders through the seam is free proof that the seam works.

### Loading the fixtures

Choose the fixture location by who must read the files at runtime, then make sure the build actually ships them (see `## Build Membership And Resources` below).

iOS:

- Fixtures held by a Swift package target: declare them in `Package.swift` (`resources: [.process("Fixtures")]`, or `.copy(...)` to keep a directory verbatim) and load through `Bundle.module`. Without the declaration the files are never packaged, and `Bundle.main` does not see a package's resources — the usual force-unwrapped lookup then crashes at runtime.
- Fixtures held by the app target: they must be in that target's resources (Copy Bundle Resources phase, or the generator spec's resource list), and load through `Bundle.main`.
- Fixtures held by a test target only: reachable from the tests through that target's bundle, and from nowhere else — not from the app, not from previews.

Android:

- `src/main/assets/` — readable by the running app, by previews, and by instrumented tests (`context.assets.open(...)`). This is the default for fixtures that drive the mock-mode walkthrough.
- `res/raw/` — same runtime availability, addressed by generated id (`resources.openRawResource(...)`); use it when the module already keys resources that way.
- `src/test/resources/` — the JVM unit test classpath only. The app and `@Preview` cannot read it.

Getting this wrong is not a compile error. The failure shows up as a runtime crash or an empty screen in the app (iOS, resource never packaged; Android, fixtures only on the test classpath) while the unit tests stay green. Also check the source set: fixtures placed under a flavor- or variant-specific source set are absent from every other variant. Record the chosen location with the seam.

## Build Membership And Resources

On a native target, a file existing on disk is not the same as a file in the build. Confirm membership for everything this work adds — sources, fixtures, asset catalogs, string tables, new modules — before treating a build result as meaningful.

iOS:

- **Xcode project, no generator**: a new Swift file has to belong to the target that builds the feature (and to the test target when it is test-only). A file created outside Xcode commonly lands on disk with no target membership; the build then fails on a missing symbol, or worse, silently uses an older one. Xcode 16 synchronized folder groups (`PBXFileSystemSynchronizedRootGroup`) pick up new files under a synchronized folder automatically — check which regime the project uses instead of assuming either.
- **Project produced by a generator**: when `project.yml` (XcodeGen) or `Project.swift` / `Tuist/` (Tuist) is present, the `.xcodeproj` is generated output. Add files, resources, and targets by changing the generator spec and regenerating. Editing the generated project directly appears to work until the next generate run discards it — usually noticed on CI, after the change is merged.
- **Swift package targets**: source files under the target's declared path are picked up automatically, resources are not. Non-source files need a `resources:` declaration on the target (`.process(...)` for files the build may optimize, `.copy(...)` to preserve a directory as-is) and are read through `Bundle.module`.
- Asset catalogs, `.xcstrings` / `.strings` files, and any new `Info.plist` key follow the same membership rules as source files — including through the generator spec when one is in use.

Android:

- Gradle resolves sources and resources by source set, so location *is* membership: `src/main/...` builds into every variant; `src/debug/...` or a flavor source set builds only into that variant; `src/test/...` and `src/androidTest/...` never reach the shipped app.
- `assets/` files are packaged verbatim and read by path at runtime. `res/raw/` files are addressed by generated id and validated at build time. `src/test/resources/` is on the JVM test classpath only — it is not an app resource location.
- A new Gradle module must appear in the `settings.gradle(.kts)` `include` list *and* be declared as a dependency of the module that consumes it. Missing either one, its code compiles into nothing usable.

The mock DataSource's fixtures are the most common casualty of this section — see `Loading the fixtures` above for which location to pick, then use the rules here to make sure that location actually ships.

## Navigation Semantics Mapping

Implement each transition's `presentation` and `backBehavior` through the platform's native navigation:

| `presentation` | SwiftUI | Jetpack Compose |
| --- | --- | --- |
| `push` | append the route to the `NavigationStack(path:)` binding; declare the destination with `.navigationDestination(for:)` | `navController.navigate(route)`, with the destination declared by `composable(...)` in the `NavHost` |
| `modal` | `.sheet` or `.fullScreenCover` plus `.interactiveDismissDisabled(true)` — the defining property is that the user cannot dismiss it, so the surface stays until the flow says otherwise | a `dialog(...)` destination with `DialogProperties(dismissOnBackPress = false, dismissOnClickOutside = false)`, or a full-screen destination whose back is intercepted |
| `sheet` | `.sheet`, with `.presentationDetents` when the handoff specifies a height or detent | Material 3 `ModalBottomSheet`, or a `bottomSheet(...)` destination when the module already uses the navigation-material integration. Not a dialog — gestures, insets, and accessibility focus all differ |
| `fullscreen` | `.fullScreenCover` | an ordinary full-screen `composable(...)` destination; only use `dialog(...)` with `usePlatformDefaultWidth = false` when the module has no full-screen destination pattern |
| `replace` | replace the path contents instead of appending — assign a new path value (for example a single-element path), or swap the root view of the stack | `navController.navigate(next) { popUpTo(current) { inclusive = true } }` — the previous root is removed |

| `backBehavior` | SwiftUI | Jetpack Compose |
| --- | --- | --- |
| `pop` | remove the last path element (`path.removeLast()`), or call the `dismiss` environment action from inside the pushed screen | `navController.popBackStack()` |
| `popToRoot` | return the path to the flow root and keep it — for a stack rooted at the flow root, `path.removeAll()` | `navController.popBackStack(startRoute, inclusive = false)`: pop up to the start destination without removing it. Inside a `navigate` call the equivalent option block is `popUpTo(startRoute) { inclusive = false }` |
| `dismiss` | dismiss the presented surface: clear the `.sheet` / `.fullScreenCover` binding, or call `dismiss` from within it | dismiss the bottom sheet or dialog — hide the sheet state, or pop the sheet/dialog destination off the back stack |
| `none` | no user-initiated back affordance: `.navigationBarBackButtonHidden(true)` on a pushed screen, or `.interactiveDismissDisabled(true)` on a presented one. Hiding the control is not by itself a guarantee that the edge-swipe pop is gone on every OS version — verify it on the target OS and record the result | prefer making the back stack structurally correct — `navigate { popUpTo(...) { inclusive = true } }` so the source is no longer on it. When back genuinely must be blocked, `BackHandler(enabled = true)` with visible feedback in the lambda; use `PredictiveBackHandler` when the screen must answer the gesture with progress. An empty interception body is not an acceptable implementation. See `platform-conventions.md` §5 |

`popToRoot` and `replace` are not the same call: `popToRoot` pops up to the start destination and keeps it, `replace` navigates with the previous root removed (`inclusive = true`). Using the inclusive form for `popToRoot` destroys the destination the user is returning to.

These are the shapes of the contract's intent, not a navigation system to add. Wire them into the app's existing router, coordinator, or navigation abstraction; never stand up a second navigation stack beside it. Check each API against the recorded minimum OS/SDK version first — `NavigationStack` and `.navigationDestination`, the Observable-based environment forms, Material 3 `ModalBottomSheet`, and type-safe Navigation Compose routes all have version floors (see the API availability gate above).

Rules:

- Register destinations by handoff route id so traceability survives into the code.
- Route `params` become destination arguments — associated values on a Swift route enum, typed nav arguments on Compose. Follow the module's existing convention: type-safe routes (`@Serializable` route classes with `composable<Route>` and `toRoute<Route>()`) where it uses them, string routes with declared arguments where it does not. `deepLink` patterns are registered where the platform supports them.
- Respect `kind` before `presentation`. A return executes its confirmed `backBehavior` and never pushes a destination copy; missing return `presentation` is normal, but missing `backBehavior` remains an unresolved decision for that edge.
- A non-return app edge with missing `presentation` remains unresolved. No legacy rule or generated scaffold implies push, and no missing return action implies a single-step pop. Reuse an already explicit authorized default only with its source and scope recorded.
- Every edge entering a visible route declares `motion: none | platform-default | custom` independently of navigation. For custom motion, read its `motionRef: FLOW_SPEC.md#anchor` and verify the explicit anchor exists. Implement the declared timing/token, gesture, and reduced-motion behavior through the app's conventions; do not infer platform animation from a navigation API. Keep the affected flow acceptance open until missing intent is resolved while continuing independent confirmed work.

### Generating the flow skeleton

When the prototype folder is reachable, generate the native navigation scaffolding from the flow contract instead of hand-translating the prototype's TypeScript:

```sh
python3 <storybook-product-prototype-skill-root>/scripts/export_flow.py <prototype-folder> \
  --swift <scratch-dir>/<Feature>Route.swift \
  --kotlin <scratch-dir>/<Feature>Route.kt
```

- The positional argument is the prototype folder holding `*PrototypeFlow.ts`. With no flags the script writes `docs/flow.json` under that folder (`--out <path>` overrides the location); `--swift` and `--kotlin` additionally write a Swift route enum and a Kotlin sealed route class with a `NavHost` scaffold. Both are optional and independent.
- Write the skeletons to a scratch location, not straight into the production tree. They are scaffolding — route cases, params, deep-link comments, and destination stubs derived from the flow metadata — not finished navigation. Merge the route ids, parameter types, and deep links into the app's existing router and discard the rest; the generated header says the same thing.
- When the prototype folder is not reachable from this session, use the handoff's `docs/flow.json` and map the routes by hand, and record that the skeleton step was skipped.

Preserve exported `motion`/`motionRef` and unspecified navigation in the working map. A scaffold with an unresolved presentation or back action is not permission to register a default behavior.

## Documentation And Skill Delivery

When an approved decision changes, list affected Data/Handoff/Flow/Acceptance documents, fixture files, metadata/flow carriers, and regression tests; synchronize those entries, mark superseded clauses inactive, and re-review the changed scope before consuming a new manifest. Verify source artifacts and compare both recorded digests at ingestion and completion. A copied fixture remains a provenance/UI-parity reference, never a transport golden schema.

Use the project installer with `--record-usage` and explicit actual used skills, following cm-skills `docs/skills-usage.md`. Native's dependency closure includes `design-system-governance` and frontend support; record dependency roles separately and do not automatically install `api-data-integration`. Verify `docs/SKILL_USAGE.json`, installed content hashes, and repo-relative links in managed `CLAUDE.md`/`AGENTS.md` blocks while preserving all other bytes. Do not install globally or use the `all` selection for usage recording.
- Regenerate whenever a newer handoff version changes the flow metadata — `validate_prototype.py <prototype-folder> --verify-manifest` reporting drift, or added/removed routes or transitions in the flow file. Re-diff the regenerated skeleton against the router rather than hand-adding the new routes, so a dropped transition is visible instead of silent.

## Existing App Mode

1. Confirm the selected target has one consistent inherited architecture; ask only where evidence is ambiguous or conflicting.
2. Map handoff routes to existing screens, navigation destinations, tabs, or sheets using the platform column of the Production Navigation Map.
3. Reuse existing shared components and the module's established feature structure; implement screen-level platform behavior per `platform-conventions.md`.
4. Add typed fixtures and mock DataSources next to the module's existing mock/fake pattern.
5. Add feature state using the app's established state and DI approach.
6. Add or update tests, previews/screenshot tests, and localization entries using the module's tools.
7. Run the narrowest meaningful verification first, then the broader build.

Avoid broad refactors unless the handoff cannot otherwise be satisfied.

## Greenfield Mode

1. Propose the complete native architecture decision record; confirm unresolved scaffold-affecting fields before creating anything.
2. Do not create a project, add dependencies, or generate app code before that confirmation.
3. Confirm the design-system source. When none exists, stop and ask; when tokens are approved, generate them from `docs/TOKENS.json`, or follow the no-DTCG-export path in Token Consumption above when the export is absent but a prototype token source exists.
4. Set up theme, localization, navigation, component, fixture, and test structure before screens.
5. Build the first screen with typed contracts and mock DataSources, following `platform-conventions.md` for safe area, appearance, type scaling, state restoration, and previews.
6. Add documented branch states and transitions with their navigation semantics.
7. Build and run on simulator or emulator before reporting completion.

## Approved Component Porting

When the user approves creating a shared component that has a prototype counterpart:

1. Derive variants, props, and states from the reusable prototype source files listed in `PRODUCTION_HANDOFF.md` and from the prototype's stories args — not from free-text notes alone. Do not invent a variant that appears in no prototype source.
2. Implement only the variants and states the in-scope routes use; record the rest as deferred.
3. Rebuild the component with native conventions and bind it to native tokens. Do not translate web idioms — a CSS flex row becomes an `HStack` or `Row`, not a literal port; hover states have no native equivalent and become pressed/focused states or are dropped with a note.
4. Strip the Storybook-only boundaries the handoff lists; they must not ship.
5. Record the prototype-to-native component name mapping in the implementation map.

## Documentation Updates

When implementation changes or narrows the handoff:

- update the repo's implementation notes and the architecture record when an approved decision changes it
- record deferred handoff requirements and every platform divergence with its reason
- record new open decisions for product, design, data, API, auth, platform capability, or release ownership
- when route behavior, data shape, or branch states intentionally change, update the handoff docs and the Storybook regression story per the handoff's change rule
