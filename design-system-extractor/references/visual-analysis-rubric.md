# Visual Analysis Rubric

Use this rubric before writing design-system decisions.

## Source Inventory

Record every source:

| Source ID | Type | Path / URL / Node | Source fingerprint | Screen or state | Notes | Confidence |
|---|---|---|---|---|---|---|

Source types:

- `image`: screenshots, exports, marketing captures, mobile captures, posters, social graphics, brand/editorial samples
- `figma`: Figma URL, node, page, Variables, component library
- `vibe-project`: AI-generated or vibe-coded project folder, usually used as an umbrella source with rendered/project-code rows below it
- `rendered-project`: localhost route, Storybook story, app screenshot
- `native-app`: iOS/Android project folder, app module, design-system module, or platform package
- `native-capture`: simulator, emulator, device, screenshot-test, SwiftUI Preview, Compose Preview, or native preview gallery capture
- `native-code`: SwiftUI, UIKit, Kotlin/Java, Jetpack Compose, Android Views/XML, asset catalogs, or resource files
- `project-code`: CSS, tokens, components, templates
- `prompt`: written user description

Fingerprint guidance:

- Images and screenshots: use `sha256:<hash>` for exact file matches; add `phash:<hash>` or a crop note when perceptual comparison is available.
- Figma: normalize URLs to `figma:<file-key>#<node-id>` or `figma:<file-key>#page:<page-name>`.
- Rendered routes: include route, viewport, state, screenshot path, render command, and capture status.
- Native captures: include platform, device, OS/API level, orientation, screen/component, state, screenshot path, render/capture command, and capture status.
- Project code: include normalized file path plus exported token/component name when relevant.
- Native code: include normalized module and file path plus exported view/composable/resource/token name when relevant.

When two sources share the same fingerprint or appear visually/functionally very close, record a row before counting both as independent evidence:

| Candidate source | Duplicate of | Match type | Fingerprint / normalized key | Suggested action | Developer decision | Rationale |
|---|---|---|---|---|---|---|

## Evidence Rows

Every important rule should come from an evidence row:

| Evidence ID | Source ID | Region | Observed pattern | Design decision | Affected output | Confidence |
|---|---|---|---|---|---|---|

Use confidence labels:

- High: repeated in multiple screens or confirmed by code/tokens.
- Medium: clear in one source, not contradicted elsewhere.
- Low: inferred, partially obscured, or only described by prompt.

For vibe-coded or AI-generated project folders, tighten those labels:

- High: visible in repeated rendered routes, screenshots, or stories, and supported by used tokens/components.
- Medium: visible in rendered UI, but source code or token usage is noisy, duplicated, or inconsistent.
- Low: present only in source code, generated demo UI, unused CSS, prompts, or inferred intent.

For native iOS/Android project folders, tighten those labels:

- High: visible in repeated supplied screenshots, simulator/emulator/device captures, previews, or screenshot tests, and supported by used native tokens/resources/components.
- Medium: visible in one native capture, supplied screenshot, preview, or screenshot test, and consistent with source tokens/components.
- Low: source-only, blocked capture, unused preview/demo screen, generated sample, inferred from names, or contradicted by stronger visual evidence.

## Vibe / AI Prototype Intake

Before extracting from a vibe-coded project, create or locate a route/state manifest:

| Route or story | Viewport | State | Render command | Screenshot path | Source files | Capture status | Keep / ignore | Notes |
|---|---|---|---|---|---|---|---|---|

For runnable projects, record browser capture attempts before extracting tokens or components:

| Capture ID | Route or story | Viewport | State | URL | Screenshot path | DOM/CSS inspected | Source files linked | Status | Confidence impact |
|---|---|---|---|---|---|---|---|---|---|

Classify project evidence before using it:

| Source | Classification | Visible in rendered UI | Token/component used | Keep / ignore decision | Rationale |
|---|---|---|---|---|---|

Use these classifications:

- `rendered`: observed in a live route or captured browser state.
- `screenshot`: observed in a supplied or generated screenshot.
- `storybook`: observed in an isolated story or component example.
- `token-used`: token is referenced by rendered UI or a live component.
- `component-used`: component is imported or routed into rendered UI.
- `demo-only`: appears only in example, scaffold, starter, or showcase code.
- `unused`: no evidence of route/story/import/render usage.
- `dead-code`: obsolete, unreachable, or contradicted by rendered UI.
- `capture-blocked`: route/story could not be opened because install, build, runtime, data, or environment setup failed.
- `auth-blocked`: route/story requires credentials or permissions that were not available.
- `contradictory`: conflicts with stronger rendered, screenshot, Figma, or user keep/ignore evidence.
- `out-of-scope`: visible or present, but explicitly excluded from extraction.

For vibe projects, prefer this evidence order unless the user says otherwise:

1. User-marked keep/ignore notes tied to visible routes or screenshots.
2. Captured screenshots and rendered routes with viewport/state metadata.
3. Storybook stories or component examples that are representative of the product.
4. Used CSS variables, tokens, components, and route imports.
5. Source-only code, blocked routes, unused CSS, demo pages, starter components, or generated comments.

Rendered UI capture rules:

- Default viewports are mobile `390x844`, tablet `768x1024`, and desktop `1440x900` unless the source indicates a different target.
- Capture route/story states that are reachable without destructive actions: default, hover, selected, expanded, loading, empty, error, disabled, and responsive navigation.
- Save captures under `design-system/assets/rendered-captures/` and use filenames that include route or story, state, and viewport.
- Link visible regions back to DOM/computed styles, used CSS variables, tokens, components, and route imports when those connections can be inspected.
- If capture is blocked, record the blocker and keep source-only rules Low confidence unless supplied screenshots or user confirmation support them.

## Native Mobile Intake

Before extracting from a native app project, read `references/native-mobile-projects.md` and create or locate a native screen/state manifest:

| Platform | Screen or component | Source entrypoint | Device / viewport | State | Render/capture command | Screenshot path | Source files | Capture status | Keep / ignore | Notes |
|---|---|---|---|---|---|---|---|---|---|---|

Record native capture attempts, including blocked attempts:

| Capture ID | Platform | Screen/component | Device | OS/API | Orientation | State | Command | Screenshot path | Source files linked | Status | Confidence impact |
|---|---|---|---|---|---|---|---|---|---|---|---|

Classify native evidence before using it:

| Source | Classification | Visible in native capture/screenshot/preview | Token/component/resource used | Keep / ignore decision | Rationale |
|---|---|---|---|---|---|

Use these native classifications:

- `native-capture`: observed in a simulator, emulator, device, or generated app screenshot.
- `native-preview`: observed in SwiftUI Preview, Compose Preview, preview gallery, or design-system demo screen.
- `screenshot-test`: observed in a screenshot-test artifact or fixture.
- `native-token-used`: asset catalog, resource, theme, or Swift/Kotlin token used by visible UI.
- `native-component-used`: SwiftUI view, UIKit class, composable, Android View/XML layout, or style reachable from visible UI.
- `native-source-only`: present in source but not tied to visible UI yet.
- `native-capture-blocked`: capture blocked by build, signing, provisioning, simulator/emulator, data, auth, or credentials.
- `native-contradictory`: conflicts with stronger screenshot, Figma, capture, preview, or user keep/ignore evidence.

For native projects, prefer this evidence order unless the user says otherwise:

1. Production Figma/component library or named design-system package.
2. Supplied production screenshots or QA captures.
3. Simulator/emulator/device captures with platform/device/state metadata.
4. Screenshot-test artifacts, SwiftUI/Compose previews, or intended preview galleries.
5. Used native resources, themes, tokens, components, and navigation entrypoints.
6. Source-only views, unused previews, demo-only screens, generated samples, or comments.

## Visual Dimensions

Analyze these dimensions for every coherent product surface:

- color proportions: dominant, secondary, accent, semantic colors, neutral usage
- color scale candidates: palette families, light-to-dark order, and near duplicate colors that may need merge review
- duplicate source candidates: repeated screenshots, duplicate Figma nodes, repeated route/state screenshots, or prototype exports that should be reused or ignored
- foreground/background pairs: every background-like color needs a readable text/icon pair
- typography: family clues, scale, weights, line height, numeric behavior
- typographic composition/text lockups: recurring slot relationships such as kicker + headline, headline + subhead, number + unit + caption, quote + attribution, label + value, hierarchy ratios, line breaks, alignment, max line length, and spacing between text slots
- spacing: screen gutters, section gaps, row height, internal padding, density
- native unit behavior: iOS points, Android dp/sp, CSS px/rem exchange values, and documented unit conversion assumptions
- near numeric candidates: close spacing, radius, typography, opacity, or motion values that may need merge review
- shape: controls, cards, sheets, dialogs, chips, avatars, images
- elevation/depth: shadows, outlines, dividers, overlap, raised surfaces
- layout rhythm: app shell, top bars, bottom bars, section order, scroll behavior
- component candidates: purpose, behavior or composition role, anatomy/slots, variants, states or display modes, and overlap with existing inventory/specs
- component review visuals: actual Figma node previews/screenshots or screenshot crops for close candidates; schematic SVG only as labeled fallback when source previews are unavailable
- icons: style, stroke, fill, size, labels, accessibility role
- imagery: photo/illustration style, crop, saturation, texture, realism
- data display: alignment, numeric formatting, charts, legends, comparison patterns
- states: selected, active, hover, pressed, focus-visible, disabled, loading, empty, error

## Extraction Rules

- Prefer repeated patterns over one-off decorative moments.
- Treat reusable text groupings as component candidates in any source type, not only graphic design. Keep atomic type values in typography tokens; promote the grouping to a typographic component only when the slot relationship, hierarchy, spacing, alignment, and content rules are reusable.
- Do not promote one-off decorative lettering, art-directed headlines, or single-use campaign copy to component status unless the references prove reuse or brand-critical importance.
- Do not treat duplicate screenshots, Figma nodes, or rendered states as separate proof until the source duplicate review decision is documented.
- Do not create a separate component only because a Figma layer name differs; compare fingerprint, behavior, anatomy, states, tokens, and layout first.
- Do not normalize a distinctive design into generic SaaS defaults.
- Capture what is absent as well as what is present: no gradients, no card outlines, no shadows, no dense nav, etc.
- If the reference shows mobile-only UI, do not invent desktop behavior beyond responsive constraints.
- For project folders, rendered UI beats unused CSS. Existing tokens beat ad hoc CSS only when they are actually used.
- For native app projects, supplied screenshots, simulator/emulator/device captures, preview captures, and screenshot-test artifacts beat source-only Swift/Kotlin/XML. Native token/resource files beat inline literals only when they are used by visible or confirmed canonical UI.
- For vibe-coded projects, do not let source-only generated artifacts raise confidence. Exclude demo-only, unused, dead-code, contradictory, or out-of-scope patterns from normative design rules unless the user explicitly keeps them.
- For vibe-coded projects, component filenames and CSS variable names are clues, not proof. Verify them through rendered routes, stories, imports, or user notes before treating them as reusable system decisions.
- For runnable vibe-coded projects, capture actual browser screenshots before extracting tokens or components. If capture cannot run, document why and reduce confidence instead of filling gaps from generated code.
- For native app projects, component names, composable names, view names, asset names, and XML style names are clues, not proof. Verify them through captures, previews, screenshot tests, navigation reachability, imports, or user confirmation before treating them as reusable system decisions.
