# Native Architecture Resolution

Use this reference before scaffolding, dependency changes, code generation, or production edits. Resolve where the feature belongs and how that native target builds and runs. This gate mirrors `frontend-product-implementation`'s runtime-architecture gate with native vocabulary; the semantics — inherit what is clear, ask what is not, never re-platform on a feature request — are identical.

## Contents

1. Required Decision Record
2. Evidence Priority
3. Ask Versus Infer
4. Greenfield Architecture Gate
5. Existing App Inheritance
6. Multiple Targets, Ambiguity, And Conflict
7. Migration Approval Gate

## Required Decision Record

Create a compact working record with every field below. Use `not applicable` with a reason instead of silently omitting a field.

| Field | Record |
| --- | --- |
| Target root | Exact Xcode project/workspace, SPM package, or Gradle module and its ownership boundary |
| Mode | `greenfield` or `existing product` |
| Platform | iOS, Android, or multiplatform, with the minimum OS/SDK version policy in force |
| UI framework | SwiftUI, UIKit, or their mixing boundary; Compose, Views, or their mixing boundary |
| Navigation | NavigationStack/NavigationSplitView, UIKit navigation controllers, Compose Navigation, Fragments, or the app's own router — and where new destinations register |
| Language | Swift or Kotlin version policy in force |
| Dependency management | SPM, CocoaPods, Gradle version catalog, or the module's established mechanism |
| State / DI | Observable models, TCA-style stores, ViewModels, Hilt/Koin, or the app's established pattern |
| Design tokens / theme | Existing token or theme source (asset catalogs, Color/Font extensions, MaterialTheme, custom theme objects) and its defining files |
| Tests | XCTest / swift-testing, JUnit / Compose UI tests, snapshot tooling in scope |
| Decision source | User statement, file paths, handoff section, or explicit inference for each material choice |
| Confidence | `confirmed`, `high`, `medium`, or `low`, with unresolved items listed |

Persist the record in the repo's existing architecture notes when they exist; otherwise keep it in the implementation map and reproduce its material fields in the final report.

## Evidence Priority

Use evidence in this order while preserving conflicts instead of hiding them:

1. Explicit instructions or answers from the current user request.
2. The selected target's project files: Xcode project settings, Package.swift, settings.gradle / build.gradle(.kts), version catalogs, manifests, and representative feature code.
3. Approved architecture records and the current handoff documents for that target.
4. Workspace or repo configuration that directly owns the selected target.
5. Sibling modules, sample apps, or general ecosystem conventions as low-confidence hints only.

The prototype's web framework is evidence about the prototype, never about the native target. A handoff that names an architecture conflicting with a live native repo is a conflict to resolve, not permission to migrate.

## Ask Versus Infer

Ask the user when:

- greenfield scaffold-affecting choices remain unresolved (platform, minimum OS/SDK, UI framework, navigation, dependency management)
- more than one plausible target (app, module, package) remains after discovery
- project files, handoff docs, and source conventions disagree materially
- the requested work implies changing UI framework, navigation system, language policy, minimum versions, or dependency management
- a version policy cannot be safely derived and compatibility depends on it

Infer and record without re-asking when:

- an existing target is explicit and shows one internally consistent stack
- the platform, framework, navigation, and test conventions are directly evidenced by that target's files
- the feature fits entirely inside those established boundaries

Never ask the user to choose SwiftUI versus UIKit, or Compose versus Views, when the selected app already answers that question unambiguously.

## Greenfield Architecture Gate

Before creating a project, adding dependencies, or generating app code:

1. Draft every decision-record field from explicit requirements and handoff evidence.
2. Mark unresolved, scaffold-affecting decisions.
3. Present one concrete proposed architecture rather than an open list of technologies.
4. Treat explicit choices in the current request as confirmation; obtain confirmation for the rest.
5. Record confirmed choices and their source, then proceed.

## Existing App Inheritance

1. Resolve workspace root and owning app/module root separately.
2. Read the project files, dependency manifests, navigation entry points, theme/token sources, test configuration, and representative feature files.
3. Record versions and conventions with evidence paths.
4. Inherit the stack and implement the feature without a redundant framework question.
5. Use the platform's native component model, concurrency primitives, navigation registration, resource conventions, and test utilities.

Do not translate SwiftUI patterns into Compose, Compose patterns into SwiftUI, or prototype web patterns into either.

## Multiple Targets, Ambiguity, And Conflict

1. Inventory plausible targets and the evidence connecting each to the requested feature.
2. Prefer an explicit user path or the uniquely owning app/module.
3. If one target is uniquely supported, select it and record why.
4. If multiple targets remain plausible or differ in framework/versions, stop before edits and ask.
5. After selection, rebuild the decision record from that target; do not merge sibling conventions.

## Migration Approval Gate

A feature request never authorizes changing the UI framework, navigation system, language policy, minimum OS/SDK versions, dependency manager, or module structure. Before any such change:

1. Stop before migration edits or dependency changes.
2. Explain why the feature cannot safely fit the current architecture.
3. Show the smallest in-architecture option and the proposed migration option.
4. Describe affected modules, navigation boundaries, tests, and rollout risk.
5. Obtain explicit user approval naming the migration.
6. Update the decision record with the approval source and planned deviation.
