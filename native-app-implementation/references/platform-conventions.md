# Native Platform Conventions

Use this reference during UI implementation — after the handoff is ingested, the
architecture record is resolved, and tokens and the DataSource seam exist, while
screens are being assembled. Load it alongside `implementation-workflow.md`
rather than instead of it: that file owns discovery, tokens, the seam, and
navigation mapping; this file owns the platform behaviors that have no web
equivalent and would otherwise be discovered only at verification time.

This is a handoff-consumption guide, not a general native tutorial. Every topic
below starts by naming the handoff field that specifies it, then gives the iOS
and the Android implementation. A native concern that no handoff field describes
does not belong here — take it to the repo's own conventions.

Two standing rules for everything in this file:

- The API shapes below are the form the contract takes, not copy-paste code.
  Match the module's existing idiom, and confirm availability against the
  target's minimum OS/SDK before using anything newer (see the API availability
  gate in `implementation-workflow.md`'s Repo Discovery).
- When a handoff field says `Not in scope`, that is an answer, not a gap: record
  it as out of scope. When the field is blank or the platform cannot honor what
  it asks for, stop and ask, or record a divergence with its reason — never
  silently pick a behavior.

## Contents

1. Safe Area And Window Insets
2. Dark Mode
3. Dynamic Type And Font Scaling
4. Orientation, State Restoration, Multi-Window, And Large Screens
5. Predictive Back On Android
6. Accessibility Implementation
7. Permission Flows And Their Scope Boundary
8. Previews As A Deliverable

## 1. Safe Area And Window Insets

**Handoff field.** `PRODUCTION_HANDOFF.md` → `App Implementation Notes` →
`Platform constraints` (the safe-area entry) and `Navigation` (stack, tab,
sheet, modal — it decides which chrome is present). `UI_SPEC.md` →
`Platform Targets` → `App` (safe areas, navigation shell) and `UI_SPEC.md` →
`Shell` (viewport, header, footer, sheet, or modal shell). The prototype's web
viewport and breakpoints are not evidence about native chrome.

**iOS.**

- SwiftUI views respect the safe area by default. Keep that default for content;
  reach for `.ignoresSafeArea(edges:)` only for backgrounds, images, and
  decoration that should bleed under the bars.
- Never let a primary action sit in the home-indicator region. Pin bars with
  `.safeAreaInset(edge:)` so the inset is added to the content's layout instead
  of overlapping it.
- Keyboard avoidance is on by default; `.ignoresSafeArea(.keyboard)` opts a
  region out. Opt out deliberately — the usual defect is a form whose submit
  button is covered, not one that moves too much.
- When a measurement is genuinely needed, read the safe-area insets from the
  layout container rather than hardcoding notch or indicator heights.

**Android.**

- Record the module's `targetSdk` during Repo Discovery. Recent platform
  versions draw apps edge-to-edge whether or not the app asks, and the opt-out
  that existed for one release is being withdrawn — treat edge-to-edge as the
  baseline and confirm the current rule for that `targetSdk`.
- Call `enableEdgeToEdge()` in the Activity before `setContent` (androidx
  activity), then pad content from insets: `Scaffold`'s `PaddingValues` must
  actually be applied to the content, or use
  `Modifier.windowInsetsPadding(WindowInsets.safeDrawing)` on the content root.
- Use `Modifier.imePadding()` for keyboard avoidance, and the narrower
  `statusBarsPadding()` / `navigationBarsPadding()` only when one edge is
  handled separately.
- For scrolling lists that should draw under the bars, keep the list unpadded
  and pass the insets as `contentPadding` instead
  (`WindowInsets.safeDrawing.asPaddingValues()`), so items scroll behind the
  bars but can still reach a fully visible resting position.
- Insets are consumed as they are applied. When a parent has already padded, use
  `Modifier.consumeWindowInsets(...)` before children pad again, or the same
  inset is counted twice.

## 2. Dark Mode

**Handoff field.** `UI_SPEC.md` → `Token Binding` (role → project token →
`--proto-*` alias → fallback), plus the `Token namespace` entry under
`PRODUCTION_HANDOFF.md` → `Design System Continuity`, and the `docs/TOKENS.json`
export those two describe.
Read the field honestly: the handoff records **one** value per color
role. There is no dark-appearance field, so the token record tells you what the
color role is, never what it becomes in dark mode.

That absence is the trigger, and the rule for it lives in `Token Consumption`
in `implementation-workflow.md`: when the app already has light and dark
theming, map handoff roles onto it and never create a second theme; when the app
has no dark appearance and the product ships one, stop and ask for the dark
values — do not derive them by inverting or darkening the light set. This
section covers only how the two sets are carried once they exist.

**iOS.**

- Prefer an asset catalog color set per role with `Any` and `Dark` appearances,
  referenced by name. This keeps one symbol per role and lets the system resolve
  the appearance, including inside UIKit interop.
- When the app resolves colors in code instead, the equivalent shape is a
  `UIColor` built from a trait-collection closure that branches on
  `userInterfaceStyle`, wrapped as a SwiftUI `Color`. Do not branch on
  `@Environment(\.colorScheme)` at each call site — that scatters the decision
  and breaks under appearance overrides.
- Do not pin `.preferredColorScheme` on production screens unless the handoff
  says the surface is appearance-locked. `.preferredColorScheme` belongs in
  previews.

**Android.**

- Carry both sets in the theme: a light and a dark `ColorScheme` (or the
  module's own theme object with two instances), selected once at the theme
  root, typically from `isSystemInDarkTheme()`. Leaf composables read
  `MaterialTheme.colorScheme`, never the system setting.
- If the module still resolves colors through resources, the counterpart is
  `res/values/` plus `res/values-night/`. Use whichever mechanism the module
  already uses; do not add a second one.
- If the app enables Material dynamic color, record it: dynamic color overrides
  the handoff palette on supported devices, which is a divergence from prototype
  parity that must be reported rather than "fixed" by disabling it.

## 3. Dynamic Type And Font Scaling

**Handoff field.** `PRODUCTION_HANDOFF.md` → `App Implementation Notes` →
`Platform constraints` (dynamic type) and `Accessibility` (labels, order,
dynamic type, screen reader behavior). `UI_SPEC.md` → `Platform Targets` →
`App` (dynamic type, reduced motion). The numeric sizes come from
`docs/TOKENS.json` through `UI_SPEC.md` → `Token Binding`.

The unit decision — which dimension token is a type size and which is a spacing
size, and therefore which becomes a scaling text unit and which becomes a fixed
one — is made in `Token Consumption` in `implementation-workflow.md`. Do not
re-derive it here. This section covers what the UI layer must do so the scaled
values do not break the layout.

**iOS.**

- Type styles must be relative, not absolute. A custom face is registered with
  `Font.custom(_:size:relativeTo:)` so it tracks a text style; the system faces
  use the text styles directly. A bare fixed point size does not scale at all,
  which is the single most common way an otherwise correct token layer fails
  accessibility review.
- Sizes that must grow with text but are not text — icon squares, avatar
  diameters, minimum row heights — use `@ScaledMetric(relativeTo:)` so they stay
  proportional.
- Avoid fixed heights around text, and avoid truncating labels that carry
  meaning. Where a layout genuinely cannot survive the largest sizes, switch
  arrangement instead (for example a horizontal pair becoming vertical), and
  only clamp with `.dynamicTypeSize(...)` as a last resort — a clamp is a
  divergence and must be recorded with the size it stops at.

**Android.**

- Text sizes and line heights are `sp` (a `TextUnit`) and scale with the user's
  font-size setting; spacing, radii, and icon boxes are `dp` and do not. Recent
  Android versions scale fonts non-linearly, so an `sp` value cannot be turned
  into a fixed pixel value by multiplying — never precompute one.
- Prefer `Modifier.heightIn(min = ...)` over `Modifier.height(...)` on anything
  containing text, and let rows wrap or reflow rather than clip.
- Cover the largest scales with `@PreviewFontScale` (see topic 8) rather than
  discovering the breakage on a device.

## 4. Orientation, State Restoration, Multi-Window, And Large Screens

**Handoff field.** `PRODUCTION_HANDOFF.md` → `App Implementation Notes` →
`Platform constraints` (orientation) and `Offline and retry` (reconnect,
background refresh — what must survive a return from background).
`PRODUCTION_HANDOFF.md` → `Target Surfaces` → `App` (native screen, tab, sheet,
webview) and `UI_SPEC.md` → `Platform Targets` → `App` scope the form factors.
What state exists at all comes from the `Route state` and `UI states` entries
under `PRODUCTION_HANDOFF.md` → `Shared Domain And UI State Model` — the handoff
says which state is real, the platform decides how it survives.

If the App fields do not mention tablets, split screen, or foldables, they are
not in scope: record them as deferred rather than quietly shipping a
phone-width layout stretched across a large window.

**iOS.**

- Persist per-scene UI state — the active route id, list scroll position, a
  partially filled form — with `@SceneStorage`, so a scene restored after
  termination lands where the user left it. `@AppStorage` is a different thing
  (app-wide preferences) and is not a restoration mechanism.
- React to background and foreground transitions through
  `@Environment(\.scenePhase)` when the handoff's offline/retry field asks for a
  refresh on return.
- Adaptivity keys off `horizontalSizeClass` (and `verticalSizeClass` where
  relevant), not off raw point widths. A two-column surface is
  `NavigationSplitView` in regular width collapsing to a stack in compact —
  don't build two unrelated screens.
- Restricting supported orientations is an app-level Info.plist change, not a
  screen-level decision. It needs the migration/approval gate in
  `native-architecture.md`, and on recent iPadOS the system may override it
  anyway.

**Android.**

- Screen state uses `rememberSaveable`, or a ViewModel `SavedStateHandle` for
  anything that must survive process death. Plain `remember` is lost on
  rotation and on recreation after the process is reclaimed — this is the
  defect a walkthrough that never rotates the device will never catch.
- Anything held in `rememberSaveable` must be a saveable type or have a custom
  `Saver`; check this when the state is a domain object rather than a primitive.
- Adaptivity keys off window size class (androidx window / Material 3 adaptive),
  not off a hardcoded dp breakpoint ported from the prototype's CSS. Use the
  module's existing adaptive scaffolding if it has one before introducing
  another.
- Recent Android versions ignore orientation and resizability restrictions on
  large screens for apps targeting them, so `screenOrientation` locks and
  `resizeableActivity="false"` are not a layout strategy. Record `targetSdk`
  and design for a resizable window.

## 5. Predictive Back On Android

**Handoff field.** `FLOW_SPEC.md` → `Transition Metadata Contract` →
`backBehavior` (and `kind`, which decides whether the edge is a forward move or
a return at all), plus `PRODUCTION_HANDOFF.md` → `App Implementation Notes` →
`Gestures and feedback` (dismissal, swipe, haptics).

Which navigation call implements each `presentation`/`backBehavior` value is the
navigation mapping table's job in `implementation-workflow.md`; this section
covers only how the system back gesture must behave once that mapping is chosen.

**iOS.**

- `pop` and `dismiss` are the default behaviors — the interactive edge swipe and
  the sheet drag exist for free, and the defect to watch for is code that
  suppresses them.
- For a sheet or cover that must not be dismissed by gesture, use
  `.interactiveDismissDisabled(true)` and give the user a visible, deliberate
  exit control. Hiding the navigation back button
  (`.navigationBarBackButtonHidden(true)`) hides the control but is not by
  itself a guarantee that the edge-swipe pop is gone in every OS version —
  verify it on the target OS and record what you found.

**Android.**

- Predictive back is a system behavior with an app-level switch
  (`android:enableOnBackInvokedCallback` on `<application>` in
  `AndroidManifest.xml`, and enabled by default for apps targeting recent SDKs).
  Record its state during Repo Discovery. Never turn it off app-wide to satisfy
  one screen's requirement — that trades a single screen's rule for every other
  screen's animation.
- On a normal `pop`, do nothing: let the navigation host handle back so the
  system can draw the predictive peek of the previous destination. A
  `BackHandler` added "just in case" on such a screen silently cancels that
  preview and is a defect.
- `backBehavior: none` is **not** a licence to swallow the gesture. Take these
  three options in order of preference:
- **1 — Make it structurally true first.** `none` most often means the previous
  destination is genuinely gone (a completed flow, a post-submit screen), not
  that the gesture should be intercepted. Enter that destination with the same
  stack-clearing call the mapping table gives for `replace` — `navigate` with
  `popUpTo(...) { inclusive = true }` — so the back stack matches the declared
  flow. System back then does the right thing with no interception at all, and
  predictive back keeps working.
- **2 — When the screen truly must block exit** (a required, non-cancellable
  step), intercept with `BackHandler(enabled = true)` and give visible feedback
  in the lambda — a snackbar, or a confirm dialog saying why. An empty
  interception body makes the device feel broken and is not an acceptable
  implementation of `none`.
- **3 — When the peek should still be shown before refusing**, use
  `PredictiveBackHandler` (androidx activity 1.8+), which surfaces the gesture's
  progress so the screen can animate along and then resolve the cancellation
  with feedback.
- In all three cases the destination's top app bar carries no up affordance, so
  the UI agrees with the behavior.
- Verification: `none` is satisfied only when the system back gesture does not
  leave the screen. Per `verification-reporting.md`, a `none` that the system
  back button still dismisses is a defect — and so is a `pop` screen whose
  predictive animation was killed by an unnecessary handler.

## 6. Accessibility Implementation

**Handoff field.** `UI_SPEC.md` → `Accessibility` (accessible label on the root
region; labels on navigation, buttons, overlays, and dismiss controls; preserved
focus order, screen reader labels, and platform text scaling) and
`PRODUCTION_HANDOFF.md` → `App Implementation Notes` → `Accessibility` (labels,
order, dynamic type, screen reader behavior). `PRODUCTION_HANDOFF.md` →
`Frontend Handoff Acceptance` requires those to be specified for the target
platform.

**The web vocabulary does not port.** `UI_SPEC.md` is written against a web
prototype, so its accessibility requirements may arrive as ARIA roles,
`aria-label`, `aria-live`, `tabindex`, keyboard focus order, or focus-visible
styling. None of those exist natively. Read them as **intent** and re-express
that intent in the platform's semantics API — copying the vocabulary produces
either nothing (there is no `role` attribute to set) or a mislabeled tree.
Translate as follows:

| Handoff intent (web wording) | iOS (VoiceOver) | Android (TalkBack) |
| --- | --- | --- |
| Accessible name (`aria-label`, visible label) | `.accessibilityLabel(_:)` | `contentDescription` on the element, or `Modifier.semantics { contentDescription = ... }` |
| Element kind (`role="button"`, `role="header"`) | `.accessibilityAddTraits(.isButton)` / `.isHeader` | `Modifier.semantics { role = Role.Button }`; headings via `heading()` |
| Current value or state (`aria-checked`, `aria-selected`) | `.accessibilityValue(_:)`, `.accessibilityAddTraits(.isSelected)` | `Modifier.semantics { stateDescription = ...; selected = ... }`, or the component's own toggleable/selectable modifier |
| Extra description (`aria-describedby`) | `.accessibilityHint(_:)` | `onClick(label = ...)` inside `semantics`, or a state description |
| Grouping a composed row into one announcement | `.accessibilityElement(children: .combine)` | `Modifier.semantics(mergeDescendants = true) { }` |
| Reading order (`tabindex`, documented focus order) | `.accessibilitySortPriority(_:)` within a container | `Modifier.semantics { isTraversalGroup = true; traversalIndex = ... }` |
| Announce a change (`aria-live`) | Post an accessibility announcement notification | `Modifier.semantics { liveRegion = LiveRegionMode.Polite }` |
| Decorative, must not be announced | `.accessibilityHidden(true)` | `Modifier.clearAndSetSemantics { }`, or a null content description |
| Keyboard operability, focus-visible styling | No direct equivalent — becomes VoiceOver traversal and standard controls | No direct equivalent for touch; relevant only where hardware keyboard, TV, or desktop windowing is in scope |

A handoff requirement with no native equivalent (keyboard traps, focus-visible
rings, skip links) is recorded as a divergence with its reason. Skipping it
without a record is not the same thing.

**iOS.**

- Apply the modifiers above at the composed element, not at every leaf: a row
  that VoiceOver reads as four separate fragments is the usual defect, and
  `.accessibilityElement(children: .combine)` on the row is the usual fix.
- Interactive targets meet the platform minimum — roughly 44pt square. A
  prototype's dense web hit area is not a native target size.
- Reduce motion is named in the same `Platform constraints` field: read
  `@Environment(\.accessibilityReduceMotion)` and drop or shorten non-essential
  animation.
- Verify by running VoiceOver over the in-scope screens, not by reading the
  view hierarchy — traversal order and merged announcements are exactly what
  static inspection gets wrong.

**Android.**

- Set `contentDescription` to `null` deliberately on decorative images so
  TalkBack skips them; an unset description on a meaningful `Icon` is the
  common miss, and lint will flag it.
- Interactive targets meet the platform minimum — roughly 48dp, via
  `Modifier.minimumInteractiveComponentSize()` where the module uses it.
- Reduce motion has no first-class Compose API; the practical route is the
  system animator duration scale setting. Keep motion behind the theme's motion
  values and honor a "no animation" setting there rather than at each call site.
- Verify by running TalkBack over the in-scope screens, with the accessibility
  scanner as a supplement rather than a substitute — it finds missing labels and
  small targets, not wrong reading order.

## 7. Permission Flows And Their Scope Boundary

**Handoff field.** `PRODUCTION_HANDOFF.md` → `App Implementation Notes` →
`Permissions and OS services` (permission prompt, native capability, or none),
with the branch itself listed under the `UI states` entry of
`PRODUCTION_HANDOFF.md` → `Shared Domain And UI State Model`, and carried as a
fixture `state` value.
`ACCEPTANCE.md` → `AC-P-002 (assembly)` requires the permission branch to be
reachable through interactions in mock mode.

**The scope ruling.** This skill implements the **UI and state** of permission
handling, and does not implement **acquiring** the permission:

- **In scope:** every documented permission branch — not determined, granted,
  denied, permanently denied or restricted — rendered from fixture `state`
  values, and reachable in the mock-mode walkthrough **without triggering a
  system dialog**. Model it as a small injectable seam next to the DataSource
  seam (for example a `PermissionStatusProvider` with a mock implementation),
  recorded in the implementation map's seams table as a row with `—` in the
  `Fixture group` column, since it belongs to no fixture group. Rationale:
  `AC-P-002` cannot be satisfied by a branch that only a real OS prompt can
  reach.
- **Out of scope:** calling the platform's request APIs, and — emphatically —
  adding or changing the declarations that authorize them. On iOS that is the
  `NS*UsageDescription` keys in `Info.plist` and anything in the app's privacy
  manifest; on Android it is `<uses-permission>` in `AndroidManifest.xml` and
  the data-safety implications that follow. Those are review- and
  privacy-label-level changes to the product, not feature assembly.
- When the handoff asks for a real prompt, record it as a blocking open decision
  under platform capability (see `implementation-workflow.md`'s documentation
  rules and `verification-reporting.md`'s final report contract) and hand it to
  the named owner along with the seam. Proceed only with explicit approval.

**iOS.** Keep framework status checks and requests behind the seam rather than
in views — the concrete APIs (capture-device authorization status, location
authorization status, notification settings, and their request counterparts)
belong to the implementation the approved owner writes. The screen consumes the
seam's status enum and renders the documented branch.

**Android.** Same shape: the screen consumes the seam. The real implementation —
a permission check, a `rememberLauncherForActivityResult` request contract, and
the "should show rationale" path that distinguishes denied from permanently
denied — is what the receiving owner wires. Make sure the seam's status type has
a case for permanently denied, because the UI for it (send the user to settings)
is different, and the handoff's branch list usually implies it.

## 8. Previews As A Deliverable

**Handoff field.** `UI_SPEC.md` → `Component Map` (each region's component, with
`— story: <story-id>` where a Storybook id exists) and
`PRODUCTION_HANDOFF.md` → `Design System Continuity` → per-screen composition
(name, origin, import path, story id) and `Promotion candidates`. The branch
states to cover come from `Shared Domain And UI State Model` → `UI states` and
the `state` values in `DATA_SPEC.md` / `fixtures/*.json`.

Previews are the native counterpart of the prototype's Storybook stories: the
handoff hands over a component catalog with a visual sample per state, and the
native delivery is not equivalent until it has one too. They are an **expected
output of this skill, not an optional extra** — the same standing the governance
companion gives story coverage on web (see the platform tailoring in
`SKILL.md`). Three things follow:

- **Every documented branch state is previewable.** For each in-scope screen and
  each shared component this work creates or changes, there is a preview per
  documented state — loading, empty, error, disabled, permission, optimistic,
  retry — driven by fixture data, not by hand-typed sample values.
- **Previews are driven by `Mock<Feature>DataSource`.** Pass the mock explicitly
  at the preview's construction site. This is free proof that the injection site
  recorded in the implementation map's seams table actually works: a screen that
  cannot be previewed against its mock has a seam that the data-integration
  owner cannot swap either. Never let a preview resolve a data source from a
  container that could return a real implementation.
- **They are the documented fallback evidence.** When no simulator or emulator
  is available, preview coverage is what the degraded walkthrough path in
  `verification-reporting.md` leans on. Report preview coverage per screen and
  state in the final response.

**iOS.**

- Declare previews with the `#Preview` macro where the module's toolchain and
  deployment target allow it, falling back to `PreviewProvider` otherwise —
  check what the module already uses instead of assuming.
- One preview per state, each constructing the view with the mock data source
  configured for that fixture `state`. Name the previews after the state so the
  canvas reads as a state list.
- Cover the cross-cutting concerns from topics 2 and 3 with modifiers rather
  than extra screens: `.preferredColorScheme(.dark)` for the dark appearance and
  a large `dynamicTypeSize` environment value for the accessibility sizes.
- If the repo runs snapshot tests, add the same states there; previews and
  snapshots are complementary, not alternatives.

**Android.**

- `@Preview` per state, with the composable receiving the mock data source (or a
  state object produced from it). `@PreviewParameter` with a provider is the
  concise way to enumerate the states when the screen takes a single state
  argument.
- Use the multipreview annotations for the cross-cutting axes — `@PreviewLightDark`
  for topic 2, `@PreviewFontScale` for topic 3, `@PreviewScreenSizes` for topic 4
  when large screens are in scope — instead of duplicating previews by hand. A
  project-local multipreview annotation that bundles the ones the product cares
  about is preferable to repeating them on every function.
- Where the module has Paparazzi, Showkase, or another screenshot/catalog tool,
  register the same states there: that is the module's component catalog, and
  the next discovery pass will look for it.

## What To Record

Everything decided here is reportable, not just implemented:

- Each App Implementation Notes field, with what was implemented, what was
  `Not in scope`, and what was deferred with a reason.
- Every divergence this file names as recordable — a Dynamic Type clamp,
  dynamic color overriding the palette, a web accessibility requirement with no
  native equivalent, an orientation or large-screen behavior the platform
  overrides.
- Permission work: the seam and its mock, plus the blocking open decision for
  any real prompt, declaration, or privacy-manifest change.
- Preview coverage per in-scope screen and state, so the completion bar and the
  degraded walkthrough path in `verification-reporting.md` can be settled
  against it.
