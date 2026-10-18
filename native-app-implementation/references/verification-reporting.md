# Verification And Reporting (Native)

Use this reference before final response or hand-over.

## Verification Order

Run the platform's native commands from the selected target root. When a command is unavailable in this environment, say so explicitly and name the closest check that did run — a skipped build is never reported as a pass.

Read the real names before running anything: `xcodebuild -list -json` (add `-workspace <App>.xcworkspace` when there is one) prints the schemes, `xcrun simctl list devices available` prints the destinations that exist here, and `./gradlew projects` plus `./gradlew :<module>:tasks --all` print the module paths and variant task names. Substitute those into the placeholders below instead of copying them literally.

iOS:

1. Build: `xcodebuild -workspace <App>.xcworkspace -scheme <Scheme> -destination 'platform=iOS Simulator,name=<Device>' build` — use `-project <App>.xcodeproj` when the repo has no workspace, or `swift build` for an SPM-only package. Note that `swift build` and `swift test` compile against the host (macOS): they only stand in for a package that is genuinely platform-neutral. A package importing UIKit or any iOS-only API must be built through `xcodebuild -scheme <PackageScheme> -destination 'platform=iOS Simulator,name=<Device>'`, or the failure reads as a code defect when it is only a wrong-platform build. Without `-destination`, `xcodebuild` targets a generic device and can fail on code signing for reasons unrelated to this work.
2. Test: the same invocation with `test` in place of `build`; narrow it while iterating with `-only-testing:<TestTarget>/<TestCase>` (or `swift test` for an SPM-only package).
3. `swiftlint` when the repo configures it — as its own binary, or through the SPM/Xcode build plugin the project declares.
4. Simulator walkthrough of the implemented flow, per **Running On Simulator And Emulator** below.

A build that fails with "cannot find type … in scope" for a file that exists on disk is usually a target-membership problem, not a code problem — read `implementation-workflow.md`'s `Build Membership And Resources` section before editing the code.

Android (module-qualified and variant-specific — bare `assemble`, `test`, or `lint` build or test every module and every variant, which in a multi-module repo is both the wrong scope and far slower):

1. `./gradlew :<module>:assembleDebug`
2. `./gradlew :<module>:testDebugUnitTest`, plus `./gradlew :<module>:connectedDebugAndroidTest` when an emulator or device is attached
3. `./gradlew :<module>:lintDebug`
4. `./gradlew :<module>:detekt` (or the root `./gradlew detekt`, depending on where the plugin is applied) when the repo configures it
5. Emulator walkthrough of the implemented flow, per **Running On Simulator And Emulator** below.

Use `./gradlew` from the repo root — the wrapper, not a system `gradle`.

## Running On Simulator And Emulator

The UI verification, the parity sweep, and the mock-mode walkthrough all need the app actually running. This is the procedure; the degraded path at the end of this section is the only accepted substitute.

iOS:

1. `xcrun simctl list devices available` — pick a device whose runtime satisfies the project's minimum iOS version and note its UDID.
2. `xcrun simctl boot <udid>` (skip when it already reads `Booted`), then `open -a Simulator` to bring the window up. Once exactly one device is booted, `booted` may replace `<udid>` in the commands below.
3. Build for that exact destination: `xcodebuild -workspace <App>.xcworkspace -scheme <Scheme> -destination 'id=<udid>' -derivedDataPath build build`.
4. Install the product: `xcrun simctl install <udid> build/Build/Products/Debug-iphonesimulator/<App>.app` — confirm the actual `.app` path from the build output rather than assuming the configuration name.
5. Launch it: `xcrun simctl launch <udid> <bundle-id>`, where `<bundle-id>` is the target's `PRODUCT_BUNDLE_IDENTIFIER`. `xcrun simctl launch --console-pty <udid> <bundle-id>` streams the app's logs into the terminal.
6. Capture evidence per screen with `xcrun simctl io <udid> screenshot <path>.png`.

Android:

1. `adb devices` — an emulator or device must be listed as `device`. When none is, list and start one: `emulator -list-avds`, then `emulator -avd <name>` (the `emulator` binary lives under the SDK, typically `$ANDROID_HOME/emulator`).
2. `./gradlew :<module>:installDebug` installs the debug variant — this task exists on the application module, not on library modules, so install the app that hosts the in-scope feature. With several devices attached, select one with `ANDROID_SERIAL=<serial>`.
3. `adb shell am start -n <applicationId>/<fully.qualified.Activity>` — the activity is the one carrying the `LAUNCHER` intent filter in `AndroidManifest.xml`. `adb shell monkey -p <applicationId> -c android.intent.category.LAUNCHER 1` launches it without naming the class.
4. Capture evidence with `adb exec-out screencap -p > <path>.png`; read runtime failures from `adb logcat`.

**Degraded substitute.** When the walkthrough cannot run, never report it as passed and never write that the app "runs". What is available depends on which of two situations you are in — they are not the same, and the tools that work differ:

*Toolchain present, no bootable simulator or emulator.* Xcode or the Android SDK is installed but no device will boot. Compilation is still provable with the build commands above. What runs here is JVM-side and host-side only: Paparazzi or Roborazzi for Compose screenshots, Robolectric-hosted Compose tests, `./gradlew :<module>:testDebugUnitTest`, and plain unit tests over view models and navigation logic. On iOS, preview rendering and snapshot tools still need a simulator host, so treat them as unavailable too. Note that XCUITest and instrumented Compose tests (`connectedDebugAndroidTest`) require a booted device — they belong to the walkthrough, not to its substitute.

*No toolchain at all.* A headless container with neither Xcode nor the Android SDK cannot even prove compilation. The honest form is: the previews and tests were written as deliverables but not executed. Name the unavailable commands per the rule at the top of this reference, and record the entire walkthrough as uncovered with a named owner.

In both cases:

- record the substitution explicitly in the final report: which situation applied, the items the substitute covered and how, and the items it left uncovered — typically gesture-driven back, sheet dismissal, system and predictive back, rotation, and anything needing a real window
- give the uncovered items a named owner who will run them, and list them in the implementation map

An `AC-P (assembly)` criterion the substitute genuinely settles is recorded `pass` with the substituting evidence in `Notes`. One that neither the walkthrough nor the substitute could settle is recorded `deferred` with the named owner and the reason — the shared audit will fail on that row, which is the correct signal: the assembly stage is not finished. Report that failure alongside any `not-applicable` rows rather than re-labelling the row to make the audit green, and do not claim the completion bar is satisfied while such a row stands.

## Architecture Verification

Before reporting completion:

- compare the implemented target root, platform, minimum OS/SDK, UI framework, navigation system, language version, and dependency management against the decision record
- confirm navigation destinations register through the app's existing router rather than a second navigation system introduced by this work
- confirm tokens resolve through the app's theme layer, and localized text through the platform's localization source when the module has one — when the user declined establishing one, confirm instead that every in-place string is recorded as a divergence
- confirm no dependency, minimum-version, or module-structure change happened without the migration gate's explicit approval
- report every deviation with its evidence or approval and its effect on scope

## UI Verification

For UI changes, verify on the running simulator or emulator (or, when neither can run here, through the degraded substitute above — and say which):

- each in-scope route renders in the real app shell through its registered destination
- loading, empty, error, disabled, permission, and success states in scope render correctly from fixture `state` values
- text comes from the localization source when the module has one, and is otherwise recorded as a divergence; visual values come from tokens
- safe area, orientation, dynamic type / font scaling, and reduce-motion behavior match the App Implementation Notes
- accessibility labels and traversal order are present for interactive elements
- a newly created component with a prototype counterpart matches it: compare implemented variants and states against the prototype source and stories args, and record every intentional divergence — platform adaptation, token differences, dropped hover states — with its reason

Surface-level parity against the prototype is a separate pass, not a bullet in this list — run the sweep below.

## Prototype Parity Sweep

Parity covers every surface the Prototype To Frontend Map scopes `B` on this platform, not only the components this work newly created. A `B` route or region is new in the app, so the prototype is the only reference that says what it should look like; checking components in isolation leaves the assembled screen unverified.

For each Scope `B` route or region, with the app running on simulator or emulator on mock DataSources and the prototype Storybook running:

- compare the native surface side by side with the prototype's corresponding route — `prototypeRoute=<route-id>` renders that one route in isolation in the prototype's story iframe, so the comparison is screen against screen rather than app against component gallery
- let `ui-pixel-alignment` produce the evidence and `ui-compare-to-reference` own the fixes; both treat platform adaptation as legitimate rather than as drift
- record intentional divergences with their reason instead of "fixing" them: safe-area and window-inset handling, Dynamic Type or font-scale reflow, native navigation chrome, production token differences, hover states with no native equivalent, real-density content

Scope `A` surfaces are excluded from the sweep. The prototype re-creates them only as context, so prototype fidelity is never a reason to modify an already-shipping screen; a diff there is expected, not a defect. Scope `C` never ships and is out of scope too.

When the prototype Storybook cannot be run from this environment — it lives in another repo, no Node toolchain, no browser — say so and record which `B` surfaces went unverified rather than reporting parity as passed. The same applies in the other direction: when no simulator or emulator will run, the app side of the comparison is missing too, so the sweep did not happen — list every `B` surface it would have covered, with a named owner, instead of letting the sweep disappear because only the walkthrough was reported as degraded.

## Mock-Mode Flow Walkthrough

Single-screen rendering checks do not prove the flow works. After UI verification, walk the full flow on simulator or emulator with mock DataSources, following **Running On Simulator And Emulator** to get the app onto a device:

1. Start from the `FLOW_SPEC.md` entry route and complete the primary journey end to end.
2. Reach every in-scope branch state through real interactions, not by hardcoding state.
3. Trigger every documented transition and verify `presentation`, return `backBehavior`, and `motion` independently. Check custom motion against its explicit `FLOW_SPEC.md#anchor`, including reduced-motion requirements. A sheet that pushed, a declared `backBehavior: none` that still dismisses, or an assumed animation for unresolved motion is a defect. Unknown intent keeps the affected edge and flow acceptance open; it does not authorize push/pop/platform-animation defaults.
4. Record the result — journey completed, branches reached, transitions triggered, divergences and deferrals with reasons — and use it to settle the `AC-P (assembly)` rows of the Acceptance Traceability table.

The implementation is not complete while the walkthrough is unrecorded or failing. "Recorded" means one of two things: the walkthrough ran and its result is written down, or the degraded substitute ran, is named as a substitute, and its uncovered items are listed with an owner. Silence about the walkthrough, and a walkthrough claimed without a run, both fail this bar.

## Implementation Map File

Write `IMPLEMENTATION_MAP.md` where the repo keeps implementation notes (or next to the feature module), with the same five sections the `frontend-product-implementation` contract defines:

- `## Consumed Manifest` — `- docsDigest: <sha256>`, `- artifactsDigest: <sha256>`, and `- version: <n>` from the consumed version 2 manifest. With no manifest use docs/version `unversioned`, artifacts `unavailable`; with legacy retain docs/version and record artifacts `unavailable`. Record checks at ingestion and before completion, copy provenance, and unavailable integrity checks without upgrading data authority.
- `## Route Outcomes` — columns `Route id`, `Outcome`, `Evidence`; one row per handoff route id. `Outcome` is one of four terminal values:
  - `implemented`
  - `existing-verified` — `Evidence` is the repo-relative path proving the screen already ships on this platform
  - `deferred` — `Evidence` is the reason; this value promises the work still happens later
  - `not-applicable` — the route is out of scope on this platform, and `Evidence` names the Production Navigation Map cell that says so (for example `FLOW_SPEC.md Production Navigation Map, iOS destination: Not in scope`). Never record such a route as `deferred`: the manifest's route ids cover every platform, and `deferred` would promise native work nobody intends to do.
- `## Acceptance Traceability` — columns `AC id`, `Target`, `Result`, `Notes`; `AC-P (assembly)` settled by the walkthrough, `AC-P (integration)` deferred to the named data-integration owner.
- `## Data Adapter Seams` — columns `Fixture group`, `UI model`, `Interface`, `Mock implementation`, `Injection site`, `Schema authority/source`, `Integration status/owner`, identical to the frontend contract. One row per in-scope group, or `—` for a seam without a fixture group. Record repo-relative type/mock paths, injection file and symbol, and Data Authority group/contract id, value usage, schema scope/status, and source evidence or explicit `none`. Integration status is `open`, `ready`, `integrated`, or `not-applicable`, with a named owner or explicit unresolved owner decision. `ready` needs confirmed transport evidence; `integrated` additionally needs real implementation and verification, which this pass does not perform. Fake-only assembly can finish with real integration `open`.
- `## Component Map` — the shape the sibling contract defines (optional `- source:` lead-in bullet; columns `Handoff component`, `Resolution`, `Production component`, `Evidence`, `Notes`; `Resolution` one of `reused` / `composed` / `extended` / `created` / `deferred`), with `Evidence` holding repo-relative paths inside the owning native module.

Audit it before claiming completion by running the shared script from the `frontend-product-implementation` skill — it reads the handoff and the map and resolves evidence paths under `--repo`, so it is platform-agnostic:

```sh
python3 <frontend-product-implementation-skill-root>/scripts/validate_implementation.py \
  --handoff <handoff-docs-dir> --map IMPLEMENTATION_MAP.md --repo <native-target-root>
```

**Known gap: `not-applicable` and the shared script.** That script accepts only `implemented`, `existing-verified`, and `deferred`, so a `not-applicable` row comes back as a failing row — `route '<id>' has outcome 'not-applicable'; expected implemented, existing-verified, or deferred` — and the run exits non-zero. The row still counts toward the manifest's route coverage, so it produces that one invalid-outcome message and no separate missing-outcome message. That is a known divergence between the native contract and the shared script, not a defect in the map. Do not edit the script — it belongs to `frontend-product-implementation` and changing it is outside this work — and do not relabel the row as `deferred` to turn the audit green. Instead, in the final report: list every `not-applicable` row the audit flagged, quote the navigation-map cell justifying each one, and record that the other audit conditions were confirmed by hand for those rows. An audit whose only failures are `not-applicable` rows is reported as passed with that known gap named; any other failure in the same run is a real failure and is fixed, not explained away.

When the sibling is unavailable, perform the manual checks: every manifest route has a terminal outcome (`not-applicable` counts here); existing-surface evidence paths resolve; all `AC-P (assembly)` rows are settled; both available consumed digests match the current manifest; every in-scope Data Adapter Seams row records the seven required fields without upgrading UI/mock authority; and Component Map uses the five resolutions, resolves evidence inside the native root, and supplies notes on created/deferred rows (or `source: none`). Record the audit as manual and name missing/legacy integrity evidence.

At ingestion and before completion, also run reachable source `--verify-manifest` and compare both digests against any republished snapshot per `handoff-ingestion.md`. A passing map audit alone does not inspect carrier bytes or prove semantic correctness. Record changed/added/removed artifacts, affected surfaces/seams/tests, and the owner's scoped re-review and synchronization before consuming a changed snapshot.

## Final Response Contract

Report:

- handoff docs used, consumed docs/artifact digests and version, source integrity results at ingestion and completion, and incomplete provenance when any check is unavailable
- target root and mode: greenfield or existing product
- platform, minimum OS/SDK, UI framework, navigation system, language version, dependency management, state/DI approach
- architecture decision sources, confidence, unresolved or not-applicable fields, and approved deviations
- design-system governance findings: token source, theme layer, shared components, localization
- existing components reused: reference and summarize the `IMPLEMENTATION_MAP.md` `## Component Map` section as the single source of the prototype-to-native mapping rather than restating an independent list; any discrepancy between response text and map rows resolves in favor of the map
- new components created only with approval, each with prototype source evidence and its parity result or recorded divergences
- routes/screens implemented, with their navigation destinations and presentation semantics
- UI models and typed mock DataSources, fixture value usage and schema authority/source, injection sites, and each real integration's status and owner; mock decoding is not proof of an API contract
- the Acceptance Traceability table: every in-scope acceptance id exactly once with `pass`, `deferred` (with owner), or `not-applicable` (with reason)
- the mock-mode walkthrough result — or, when it ran degraded, the substitute used, the items it covered, and the uncovered items with their owner
- the parity sweep result, including any Scope `B` surface left unverified because the prototype or the app could not be run
- every `not-applicable` route row, with the navigation-map cell behind it and the audit's finding for that row
- verification commands run, their results, and any command unavailable in this environment
- open decisions, especially real API/data/auth/persistence ownership and platform capability questions
- repo skill delivery: actual used skills, dependency/support roles, `docs/SKILL_USAGE.json`, installed relative paths and content hash checks, managed instruction-block verification or the exact outstanding limitation

## Completion Bar

The implementation is complete only when:

- the feature builds from the target root, and runs on simulator or emulator — or the degraded substitute is recorded in its place with the reason and the uncovered items
- implementation and verification follow the platform's native conventions
- the final architecture matches the inherited or confirmed decision record, except for explicitly approved and reported deviations
- documented routes, transitions, presentation semantics, and UI states are represented
- the mock-mode flow walkthrough has been run and passes, or a recorded degraded substitute covers the same items and the uncovered ones are listed with a named owner
- Every in-scope fixture group has a UI model, typed DataSource, mock implementation, injection site, schema authority/source, and integration status/owner. An open real contract does not prevent otherwise verified Fake-only assembly. Groups belonging only to scope `A` surfaces are excluded and recorded; they do not become new seams or integration work.
- no real endpoint, auth flow, storage, persistence, or environment secret was introduced
- no unapproved token, shared component, hardcoded visual value, framework, navigation-system, minimum-version, or dependency migration was introduced
- `IMPLEMENTATION_MAP.md` exists and its audit passes — or its manual equivalent is recorded, or its only failures are `not-applicable` rows explained per the known gap above
- every real integration item has a named receiving owner
