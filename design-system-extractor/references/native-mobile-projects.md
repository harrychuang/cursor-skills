# Native Mobile Projects

Use this reference when extracting a design system from an iOS or Android app project. Keep source code as evidence only when it can be tied to visible screens, previews, screenshot tests, reachable navigation, or explicit user confirmation.

## Contents

- Evidence priority
- Project discovery
- Native screen/state manifest
- Capture and preview workflow
- Token extraction
- Component extraction
- Platform-specific notes
- Confidence and blockers

## Evidence Priority

Rank native evidence in this order unless the user states a different source of truth:

1. Production Figma component library, design tokens, or named design-system package.
2. Supplied production screenshots or QA captures.
3. Simulator, emulator, or device captures with platform/device/state metadata.
4. Screenshot-test artifacts, SwiftUI Previews, Compose Previews, preview galleries, or demo screens that are intended to represent product UI.
5. Native theme, resource, or token files that are used by captured screens.
6. UI components reachable from navigation, previews, screenshot tests, or app entrypoints.
7. Source-only views, generated samples, unused previews, starter code, or comments.

Do not promote source-only values or components to High confidence. Mark them Low unless they are visually confirmed or the user explicitly says they are canonical.

## Project Discovery

Identify platform and architecture before writing design decisions.

For iOS, inspect when present:

- `.xcodeproj`, `.xcworkspace`, `Package.swift`, `Podfile`, `Cartfile`, `fastlane/`, app targets, schemes, and test targets.
- Candidate design-system folders such as `DesignSystem`, `UIComponents`, `CoreUI`, `Theme`, `Tokens`, `Resources`, `Styles`, `Foundations`, or shared Swift packages.
- SwiftUI `View` files, `PreviewProvider` or `#Preview` blocks, UIKit `UIView`, `UIViewController`, `UICollectionViewCell`, `UITableViewCell`, storyboards, and xibs.
- Asset catalogs: `*.xcassets`, `*.colorset`, `*.imageset`, symbol assets, app icons, launch assets, named colors, and named images.
- Typography, color, spacing, radius, shadow, motion, and icon wrappers such as `Color`, `UIColor`, `Font`, `UIFont`, `ViewModifier`, environment keys, or custom style structs.

For Android, inspect when present:

- `settings.gradle*`, `build.gradle*`, `gradle/libs.versions.toml`, `AndroidManifest.xml`, app modules, library modules, flavors, and screenshot/UI test modules.
- Candidate design-system modules such as `:designsystem`, `:core-ui`, `:ui`, `:theme`, `:common-ui`, `:components`, or shared libraries.
- Jetpack Compose `@Composable` functions, `@Preview` functions, navigation graphs, screen routes, and preview parameter providers.
- Android Views/XML layouts, custom `View` classes, adapters, view holders, fragments, activities, and material style declarations.
- Resources under `res/values/`, including `colors.xml`, `dimens.xml`, `styles.xml`, `themes.xml`, `typography` or font resources, drawables, vector drawables, and state lists.

Record discovered modules and likely source-of-truth files in `SESSION_STATE.md` and `DESIGN_EVIDENCE_MAP.md`.

## Native Screen/State Manifest

Create or update a native screen/state manifest before extraction:

| Platform | Screen or component | Source entrypoint | Device / viewport | State | Render/capture command | Screenshot path | Source files | Capture status | Keep / ignore | Notes |
|---|---|---|---|---|---|---|---|---|---|---|

Use entries from:

- Supplied screenshots and their filenames.
- App navigation, tabs, deep links, routes, activities, fragments, or root SwiftUI scenes.
- SwiftUI Previews, Compose Previews, screenshot tests, UI tests, preview galleries, and design-system demo screens.
- User-provided priority screens or states.

Include missing states as gaps rather than inventing them.

## Capture And Preview Workflow

Prefer non-invasive capture paths:

1. Reuse supplied screenshots and existing screenshot-test artifacts when available.
2. Run existing preview, screenshot-test, or demo/gallery commands when they do not require invasive setup.
3. Run the app in simulator/emulator only when project setup, signing, dependencies, data, and permissions allow.
4. Do not edit signing, bundle IDs, package names, provisioning profiles, secrets, production endpoints, or destructive test data just to capture UI.

Record every attempt:

| Capture ID | Platform | Screen/component | Device | OS/API | Orientation | State | Command | Screenshot path | Source files linked | Status | Confidence impact |
|---|---|---|---|---|---|---|---|---|---|---|---|

Capture useful states when reachable without destructive actions:

- default
- selected or active
- expanded/collapsed
- loading
- empty
- error or validation
- disabled
- sheet/dialog/modal open
- navigation active
- light and dark mode
- dynamic type/font-scale when supported by fixtures

Save captures under `design-system/assets/rendered-captures/`. Include platform, screen/component, device, orientation, and state in filenames.

## Token Extraction

Use native token/resource files as strong evidence only when they are connected to visible UI, preview output, screenshot tests, or a known design-system module.

Extract these token families:

- color: asset catalog colors, resource colors, Compose colors, Swift/Kotlin color constants, semantic foreground/background pairs, state colors
- typography: font family, text style names, size, weight, line height, letter spacing, numeric behavior, dynamic type/font-scale behavior
- spacing and size: screen gutters, row heights, control heights, icon sizes, avatar sizes, sheet/dialog dimensions, touch targets
- shape: radius, capsule/full shapes, cut corners, image masks
- elevation/depth: shadows, overlays, dividers, tonal surfaces
- motion: durations, easing, spring values, transition patterns when observed
- state: pressed, selected, disabled, focus, loading, error, and opacity/overlay values

Preserve native source units in `TOKEN_ARCHITECTURE.md` notes. The CSS token files are the exchange/documentation layer for this skill; use a documented canonical unit when writing CSS-compatible raw tokens, and do not silently equate iOS points, Android dp, Android sp, and CSS px. If the user needs platform exports later, record enough source mapping to generate Swift/Kotlin/XML tokens from the canonical design-system package.

When near values appear across platforms, run the normal near-token review. Examples: `15pt` vs `16sp`, `8dp` vs `8pt`, `#111111` vs asset color `neutral900`. Ask whether to merge or keep distinct when the semantic intent is unclear.

## Component Extraction

Treat native component files as candidates, not proof. Verify each candidate through at least one of:

- visible screenshot or capture
- SwiftUI Preview or Compose Preview
- screenshot-test artifact
- navigation route or app entrypoint
- import/use by a captured screen
- explicit user confirmation that it is canonical

Common native component candidates:

- top app bar / navigation bar
- tab bar / bottom navigation
- primary, secondary, destructive, icon-only, and text buttons
- list row, card row, settings row, data row, contact row
- chip, segmented control, filter pill, selection control
- form field, search field, picker, switch, checkbox, radio, slider
- sheet, dialog, toast/snackbar, banner, empty state
- avatar, badge, icon tile, media thumbnail
- metric, price, label/value, title/subtitle, and other typographic lockups

For each extracted component, document platform mapping in the component spec:

- SwiftUI view or modifier names
- UIKit class, cell, controller, or style names
- Compose composable names and modifiers
- Android XML layout/style/view names
- resource and token files used
- accessibility role/name/state mapping
- touch target, dynamic type/font-scale, RTL/localization, and light/dark behavior when relevant

If the same visual component exists separately on iOS and Android, compare purpose, anatomy, states, and token contract before deciding whether it is one cross-platform component with platform mappings or two distinct components.

## Platform-Specific Notes

For iOS:

- Prefer semantic colors and named asset catalog colors over inline literals when they are used by visible UI.
- Preserve Dynamic Type behavior when observed or explicitly encoded by text styles.
- Treat SF Symbols, custom symbol assets, and template images as iconography evidence only when visible or referenced by reachable components.
- UIKit appearance proxies and global theme extensions can affect many screens; record where they are applied before using them as system-wide rules.

For Android:

- Prefer Material/theme/resource values over inline literals when they are used by visible UI.
- Distinguish `sp` typography values from `dp` layout values in source notes.
- Treat vector drawables, tint state lists, ripple indications, and shape appearances as iconography/state/shape evidence only when used by reachable UI.
- Compose `MaterialTheme` can hide token usage behind semantic roles; trace from the rendered composable back to the theme when possible.

## Confidence And Blockers

Use these confidence rules for native projects:

- High: repeated in supplied screenshots/captures/previews or screenshot tests, and supported by used native tokens/resources/components.
- Medium: visible in one source or preview and consistent with source tokens/components.
- Low: source-only, blocked capture, unused preview, generated sample, inferred from names, or contradicted by stronger evidence.

Record blockers explicitly:

- dependency install or network blocked
- Xcode/Gradle build failure
- missing simulator/emulator/device
- signing/provisioning blocked
- auth, credentials, seed data, or backend unavailable
- screenshot tests unavailable or failing
- previews fail to compile
- source-only component cannot be tied to a reachable screen

Blocked capture is an evidence result. It should lower confidence, not create permission to guess.
