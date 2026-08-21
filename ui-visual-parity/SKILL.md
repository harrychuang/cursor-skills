---
name: ui-compare-to-reference
description: >-
  Compare an implemented UI against a reference and apply the visual fixes. The
  reference can be a Figma file or frame, a design export or screenshot, or
  another platform's source code — a web implementation used as the truth for an
  app, or an app implementation used as the truth for web. Use when an app or web
  UI does not match its design, when porting a screen between web and
  React Native / Flutter / iOS / Android, or when auditing and repairing layout
  and token drift. Enforces token-first and component-first repair, and refuses
  to "fix" legitimate platform adaptations.
---

# UI Compare to Reference

Compare a reference UI with the current implementation, then apply focused visual fixes. Project-agnostic: discover the repository's screenshot locations, routing conventions, component structure, styling system, and design tokens before changing code.

Treat visual repair as a design-system exercise. Trace the UI back to its tokens, theme, shared primitives, and composed components before editing the screen. Do not patch differences with one-off styles unless the difference is truly unique to the selected screen and no shared abstraction owns it.

To produce a reviewable evidence report instead of (or before) fixing, use `ui-pixel-align-report`.

## What can be compared

| Reference | Implementation | Typical ask |
|---|---|---|
| Figma frame or node URL | web | "設計稿跟網頁對不上，幫我修" |
| Figma frame or node URL | app (RN / Flutter / iOS / Android) | "App 跟設計稿差很多" |
| Web source or live URL | app | "照著網頁版把 App 修對" |
| App source or running app | web | "Web 版要跟 App 一致" |
| Screenshot / design export | web or app | no Figma access |
| App on one OS | app on the other OS | iOS ↔ Android parity |

## Inputs

Accept any of these from the user message:

- **A findings file:** `reports/design-pixel-align/wallet/findings.json` — the strongest input. Skip straight to the fix loop.
- **Figma + target:** `https://figma.com/design/...?node-id=1-234 src/screens/WalletHome.tsx`, or with a URL, route, or story.
- **Reference code + target:** `apps/web/src/pages/Wallet.tsx apps/mobile/src/screens/WalletHome.tsx`, or two repo paths, or a reference URL plus an app screen.
- **Screenshot + target:** `screen-2.png http://localhost:3000/dashboard`, `screen-2.png /dashboard`, `screen-2.png src/pages/Dashboard.tsx`.
- **Screenshot only:** `screen-2`, `designs/dashboard.png`.
- **Target only:** `http://localhost:3000/dashboard`, `/dashboard`, `Dashboard.stories.tsx`.
- **Empty target:** compare all discoverable reference/implementation pairs.
- **Design-system package (optional but strongly preferred when present):** token files, `TOKEN_ARCHITECTURE.md` with `a11y-remap` records, and evidence/source-trace docs from `design-system-extractor`. Token names accelerate ownership tracing, and the remap records prevent "fixing" sanctioned accessibility values back to the reference.

An explicit reference + target pair is authoritative. Do not override it with auto-discovery unless a side cannot be found or loaded.

## Discovery

Before comparing or editing:

1. **Identify both platforms.** Web, React Native, Flutter, iOS, Android, or Figma — for the reference and for the target. Everything downstream depends on this pair.
2. **Find the reference.** Explicit paths first, then `reference/`, `references/`, `screenshots/`, `design/`, `designs/`, `mockups/`, `spec/`, `specs/`, `public/`. For a monorepo, the reference implementation is often a sibling workspace (`apps/web`, `apps/mobile`, `packages/ui`).
3. **Find the implementation entry point.** Explicit files first, then `src/pages/`, `src/screens/`, `src/app/`, `app/`, `pages/`, `src/routes/`, `src/components/`, `components/`, `lib/`, and Storybook stories.
4. **Identify the styling system** on the target: Tailwind, CSS modules, vanilla CSS, Sass, styled-components, CSS-in-JS, StyleSheet, ThemeData, MaterialTheme, SwiftUI constants, or a component library.
5. **Identify design guidance:** `README.md`, `CLAUDE.md`, `AGENTS.md`, `.cursor/rules/`, theme files, token files, Storybook docs, component documentation.
6. **Check what can be rendered.** If a URL is provided, verify whether a server is already running before starting one. For app targets, check for a running simulator, an Expo/Metro process, or a Storybook.

## Target Resolution

1. **findings.json:** use it as-is. Only re-derive when a finding is stale against the current code.
2. **Reference + target pair:** compare exactly that pair.
3. **Reference + route:** find the route's implementation, then compare.
4. **Reference only:** match by filename, nearby docs, route names, component names, story names, visible copy, and visual intent.
5. **Target only:** capture the current UI, then find the closest reference.
6. **Empty target:** compare all plausible pairs, but ask before editing when multiple matches are ambiguous.

If either side is ambiguous, list the likely candidates and ask before applying fixes.

## Comparison

When a `findings.json` from `ui-pixel-align-report` exists, skip to **Fix Strategy** — the diagnosis is done.

Without one, run the **measured pipeline** whenever both sides can produce concrete values — a rendered surface, Figma via MCP (no rendering needed), or readable source code (`inspected` fidelity per the sibling's `references/extract-code.md`). That covers almost every real case, and it is the default, not the thorough option. A condensed eyeball pass under-enumerates, and the differences it misses are exactly what forces a second run:

1. **Align the font environment first.** Before measuring anything, confirm the rendering environment loads the same fonts as the source platform and record what actually loaded into `surface.fonts` (`requested`, `loaded`, `aligned`) on each spec. A fallback font shifts ink height by up to ~30% and fabricates type-size and box-height drift. If fonts cannot be aligned, set `aligned: false` — the diff downgrades type metrics to untrusted, and you must not fix them.
2. **Extract both sides into UI Specs** using `ui-pixel-align-report`'s `references/ui-spec.md`, `references/extract-figma.md`, and `references/extract-code.md`. Populate `tokenRefs` — a finding that names a token is half-located already.
3. **Collect accessibility remaps.** If the project's design system records `a11y-remap` decisions (in `TOKEN_ARCHITECTURE.md` or token CSS comments), copy them into `accessibilityRemaps` so sanctioned replacements classify as `required-adaptation` instead of drift you would wrongly "fix".
4. **Diff mechanically:**

   ```sh
   node <ui-pixel-align-report-root>/scripts/diff_spec.mjs \
     --reference spec/reference.json --implementation spec/implementation.json \
     --output findings.candidates.json
   ```

   Note the reported **field convergence** percentage — it is the progress meter for the fix loop.
5. **Review the candidates** (drop false positives, classify per Parity Rules below), then continue to Fix Strategy with the surviving findings.

Fall back to the **condensed comparison** only when a side offers nothing to measure *or* read — an image-only reference with no Figma access, a binary-only or third-party implementation — or when the user explicitly asks for a quick single-block spot fix where writing spec files costs more than it saves:

1. **Read the reference into concrete values.**
   - Figma: use the Figma MCP tools — node metadata for the tree, variable definitions for token names, design context for layout/typography/fills/radii/effects, a screenshot for visual confirmation. Exact numbers and variable names come from here; do not estimate off a PNG when MCP is available.
   - Reference source code: read the layout and style declarations, resolving the theme layer. Convert units to CSS-equivalent px at 1x — RN dp, Flutter logical px, iOS pt, and Android dp are all 1:1 with CSS px; `rem` needs the root font size; `sp` scales with user settings.
   - Screenshot only: establish scale from one element of known size, measure relative to it, round spacing to 4px and type to 1px, and say the values are approximate.
2. **Read the implementation the same way.** Prefer measuring a rendered surface (`getComputedStyle`, layout inspector, widget inspector) over reading source. Source reading misses inherited and themed values.
3. **Compare viewports first.** A reference frame that is an exact 2x or 3x multiple of the target viewport is a scale error, not drift — fix the capture instead of filing findings.
4. **Trace ownership** for each differing block: shared component, design-system primitive, third-party wrapper, page composition, or ad hoc markup. Use `references/locate-owner.md` to go from a rendered difference to the owning declaration mechanically.
5. **Classify each difference** before touching code — see Parity Rules below.
6. **List the differences** before editing:

   `| Block | Expected (reference) | Actual (implementation) | Class | Owner | Fix |`

Condensed results are estimated: do not apply sub-2px fixes from them, and say so in the report-back.

When the implementation is a Storybook with the design system's `fidelity` toolbar (authored | accessible), capture in **accessible** mode — that is the shipped state — and record which mode was active. Authored mode is for design review, not for driving fixes.

## Parity Rules

Cross-platform repair fails when every difference is treated as a defect. Classify before fixing:

- **Drift** — must match, does not. Fix it. Covers color, radius, border, font weight, structure, reading order, copy, and — at the same form factor — spacing, sizing, and font size.
- **Adaptation** — the platform or form factor justifies the difference. Leave it. Covers sanctioned font substitution (Inter → SF Pro Text on iOS, Roboto on Android), shadow rendering across engines, and density differences between a desktop reference and a phone target.
- **Required adaptation** — the implementation copied the reference where it should have diverged. Fix it by *diverging further*: raise touch targets to 44pt on iOS / 48dp on Android, respect safe-area insets on top of the design's padding, let text containers grow under Dynamic Type, add `:hover` and `:focus-visible` when porting native → web, and add `pressed` when porting web → native. Recorded accessibility remaps (`a11y-remap` in the design system) also live here: the accessible value is the sanctioned state — never "fix" it back to the authored reference value, no matter how much closer that looks to Figma. If the implementation shows the *authored* value, the fix is to apply the accessible one.
- **Ignored** — OS chrome, status bars, home indicators, scrollbars, absolute positions, hover states on touch-only surfaces.
- **Untrusted** — type-size, line-height, letter-spacing, and text-box dimensions measured under a mismatched font environment (`fontEnvironment: mismatched`). These are measurement artifacts, not drift. Align the fonts and re-measure; never change tokens or sizes from them.

Form factor is the deciding axis. Same viewport class → compare absolute values strictly. Desktop reference vs phone target → preserve ratio, rhythm, and hierarchy, not absolute pixels.

State which class each planned fix falls into. Never silently "fix" an adaptation.

## Fix Strategy

Use the layered repair model of mature design systems:

1. **Token/theme layer.** A repeated color, spacing, typography, radius, shadow, elevation, breakpoint, or motion value → update or apply the existing token first.
2. **Primitive/shared component layer.** Multiple screens would expect the same behavior → fix the shared primitive or component variant, not the page instance.
3. **Composition layer.** Correct components composed incorrectly → adjust layout, props, slots, wrappers, or responsive structure at the screen level.
4. **Page-only layer.** Only when the difference is unique to this target and no token, primitive, variant, or composition API owns it.

State which layer owns each planned fix before editing. If ownership is ambiguous, use `references/locate-owner.md` to trace the rendered difference to its owning declaration mechanically, and inspect nearby stories, docs, call sites, and token files.

`references/apply-to-platform.md` covers how to express each correction idiomatically per platform — where tokens live, how gap/padding/radius/typography/elevation are written in web, React Native, Flutter, SwiftUI, and Compose, how to implement the required adaptations, and the layout traps that break naive ports.

### Convergence loop

Do not apply every fix in one flat pass and measure once at the end — that is what makes a second manual run necessary. Fix in layer order, re-measuring between layers, because an upstream fix closes and invalidates downstream findings:

1. **Token/theme fixes first.** Apply only this layer, re-render, re-extract the implementation spec, re-diff. One token fix typically closes many findings at once — re-diffing now prevents patching symptoms the token already cured.
2. **Primitive/shared component fixes.** Apply, re-measure, re-diff.
3. **Composition and page-only fixes.** Apply, re-measure, re-diff.
4. **Exit check.** The loop is done when every remaining finding is one of: an adaptation, a *satisfied* accessibility remap (the informational `required-adaptation` whose recommended fix says no fix is needed), or explicitly accepted with a recorded reason. Open `drift` findings are work; so are `required-adaptation` **defects** — touch targets, safe areas, Dynamic Type, or an authored value the implementation copied where the remap demands the accessible one. Track the diff script's **field convergence** percentage per cycle — it should rise monotonically; a drop means a fix regressed something.
5. **Cycle cap.** If three full cycles have not converged, stop and report the residuals with their blockers (missing token, design-system decision needed, untrusted font environment) instead of thrashing.

The measured re-diff between layers is cheap — the reference spec is already extracted; only the implementation side is re-captured.

On the condensed path (no specs, nothing to re-diff mechanically), keep the same layer cadence: apply one layer, re-measure with the same instruments used to compare (computed styles, layout/widget inspectors), and update the difference table. The convergence percentage is unavailable — the exit check is the table instead: every row ends `closed`, `sanctioned`, or `blocked` with a reason.

## Fixing Rules

- Apply fixes only for the selected target.
- Prefer existing components, tokens, utility classes, theme variables, and project conventions.
- Do not introduce one-off hardcoded values when a token or shared primitive exists. When the reference calls for a value that has no token and it recurs, propose adding the token rather than inlining it.
- Do not bypass shared components by restyling their rendered markup from the page. Update the component, variant, props, or token that owns the behavior.
- If a shared component change may affect other screens, inspect representative call sites or stories and keep the change compatible with existing intended variants.
- When a one-off is unavoidable, keep it local, explain why no shared owner exists, and still avoid raw values an existing token can express.
- Never port a value across platforms without converting it: line height is absolute in CSS/RN/Compose, a multiplier in Flutter, and extra leading in SwiftUI.
- Keep changes scoped to visual parity unless the user asks for broader refactoring.

## Verification

A fix is not done until it is measured again. The convergence loop already re-measures between layers; this is the final gate.

1. Re-render the changed surface on **its own platform** — reload the URL or story, hot reload the simulator, rebuild the preview.
2. Re-measure the nodes you changed. Confirm each one now matches the reference value — or run the full re-diff and confirm the finding no longer appears.
3. When working from a `findings.json`, update each finding's `status` to `fixed`, `open`, or `accepted` (for adaptations and recorded accessibility remaps), and say which ones remain.
4. Run the project's cheapest reliable check: typecheck, lint, tests, or a build.
5. Report honestly: the final field convergence percentage and open drift count when the measured pipeline ran, which differences were closed, which were left as adaptations, which were untrusted due to the font environment, and which could not be fixed without a design-system decision.

If a URL was provided, verify against that URL. If a file was provided with no renderable target, validate with the project's cheapest reliable check and say that no visual confirmation was possible.
