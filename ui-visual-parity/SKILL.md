---
name: ui-visual-parity
description: >-
  Compare an implemented UI against a reference and fix the visual differences
  until the two match in detail. The reference can be a Figma file or frame, a
  design export or screenshot, or another platform's source code — a web
  implementation used as the truth for an app, or an app implementation used as
  the truth for web. Use when an app or web UI does not match its design, when
  spacing, type, colours, borders, or icons are slightly off, when porting a
  screen between web and React Native / Flutter / iOS / Android, or when auditing
  and repairing layout and token drift. Measures every visible element, how it
  looks and where it sits, overlays the two pictures, and repeats until they
  agree. Enforces token-first and component-first repair, and refuses to "fix"
  legitimate platform adaptations.
---

# UI Visual Parity

Measure a reference UI and its implementation, fix what differs, and measure again until the two match. Project-agnostic: discover the repository's routing, component structure, styling system, and design tokens before changing code.

The skill's promise is detail parity, and detail cannot be eyeballed. Everything is measured by the scripts in this folder; the agent's judgement is spent on what to fix and where, never on spotting differences. A difference the measurement does not show does not get fixed, so the measurement is exhaustive by design: every element that puts pixels on screen is captured, nothing is sampled, and no spec is written by hand.

Treat repair as a design-system exercise. Trace each difference to its token, theme, shared component, or composition before editing the screen. Do not patch with one-off styles unless the difference is unique to this screen and no shared abstraction owns it.

## The three checks

A cycle compares the two surfaces three ways. Parity means all three pass.

| Check | Compares | Catches |
|---|---|---|
| Appearance | Every visible property of every painted element: fills, gradients, each border side, radii, shadows, opacity, type, text, icons, images, placeholders, `::before` / `::after` decorations, interaction states | A wrong colour, weight, radius, line height, missing divider, wrong icon |
| Geometry | Each element's size and its redlines — the distance from each side to its nearest neighbour or to the edge of the box it sits in | A wrong padding or gap, a stray wrapper, something off-centre, something 1px too tall, text sitting wrong inside an input |
| Pixels | The two pictures, overlaid | Whatever no property can express: image content, rendering inside a canvas or an icon, anything the first two checks missed |

Declared layout values (padding, gap, margin) are never compared directly. They are read only to explain a distance that differs, so two ways of producing the same picture are never reported as a difference.

## What can be compared

| Reference | Implementation | Typical ask |
|---|---|---|
| Figma frame or node URL | web | "設計稿跟網頁對不上，幫我修" |
| Figma frame or node URL | app (RN / Flutter / iOS / Android) | "App 跟設計稿差很多" |
| Web source or live URL | app | "照著網頁版把 App 修對" |
| App source or running app | web | "Web 版要跟 App 一致" |
| Screenshot / design export | web or app | no Figma access |
| App on one OS | app on the other OS | iOS ↔ Android parity |

Web surfaces and Figma frames are measured automatically. Image-only references and native apps are covered by the pixel check and by the estimated path below; `references/measure.md` says exactly what each can and cannot establish.

The web path is verified end to end by the bundled benchmark. The Figma capture is tested against a stand-in for Figma's API and has not yet been run on a real file: on its first use in a project, check a few recorded values (a padding, a line height, a gradient) against the design before trusting a clean result, and say in the report that you did.

## Before you start

- **Node 22 or later and a Chromium-family browser** (Chrome, Chromium, Edge — found automatically; set `CHROME_PATH` otherwise). Nothing to install. If the environment has its own browser tool instead, it can evaluate `scripts/extract_dom.js`; see `references/measure.md`.
- Commands below are written from this skill's folder. From a project, call the script by its path and keep outputs in the project, for example `reports/parity/<surface>/`.
- **Inputs.** An explicit reference + target pair is authoritative. A `findings.json` from the `ui-pixel-align-report` skill is an accepted starting list; verify every fix with a cycle. A design-system package (token files, `a11y-remap` records) sharpens ownership and prevents "fixing" sanctioned accessibility values — pass the records with `--remaps`.
- **Discovery.** Identify both platforms, the implementation entry point (route, screen, story, file), the styling system, and the token layer. Check what can be rendered before starting a server. If the reference or the target is ambiguous, list the candidates and ask before editing.

## Workflow

### 1. Match the capture context

Both sides must show the same thing: same surface width, density, theme, locale, content, and state. A cycle takes the width, the density, and the colour scheme from the reference; the locale, the content, and the state are yours to match. Different content is not a visual difference — load the same content, or exclude the area (`--ignore`), which takes it out of all three checks. Capture the reference once for each state, theme, and breakpoint the design defines; each gets its own cycles. Details: `references/measure.md`.

### 2. Capture the reference

| Reference | How |
|---|---|
| Web URL, story, or file | `capture_web.mjs` (below) |
| Figma frame, script-capable Figma tool | run `scripts/extract_figma.js` in pages, merge with `figma_to_spec.mjs --parts`, export the frame as PNG |
| Figma frame, read-only tools | save the frame's metadata, `figma_to_spec.mjs --metadata`, export or screenshot the frame |
| Image only, or a native app | no spec — see the estimated path |

```sh
node scripts/capture_web.mjs --url <reference url or file> --root <selector> \
  --viewport 390x844 --dpr 2 --states hover,focus-visible \
  --out reports/parity/home --name reference
```

`--root` is the element that is the surface (the screen, the card, the story root); `--theme dark` captures the dark colour scheme. The capture writes `reference.spec.json` and `reference.png`, and stops with a message when the page cannot be loaded. Step-by-step instructions for every kind of reference, including the Figma script's paging, are in `references/measure.md`; how Figma properties map to CSS is in `references/figma-to-css.md`.

### 3. Run a cycle

One command captures the implementation, runs the three checks, and prints the verdict.

```sh
node scripts/parity.mjs --reference reports/parity/home/reference.spec.json \
  --reference-image reports/parity/home/reference.png \
  --url <implementation url, story, or file> --root <selector> \
  --out reports/parity/home/cycle-01
```

It captures the implementation the way the reference was captured: the same viewport, the density of the reference picture, the same colour scheme, the same states. Add `--previous <the last cycle's folder>` from the second cycle on. Other flags: `--remaps` (accessibility remap records), `--policy` (project policy), `--ignore` (areas to exclude), `--map` (explicit pairs when something exists on both sides but is reported as having no counterpart), `--theme dark` (a dark Figma frame, which records no scheme), `--renderer other` (the reference image came from a design tool; the default when the platforms differ).

Exit code `0` is parity, `1` is not at parity, `2` means the cycle could not run. The output folder holds the implementation's spec and screenshot, `parity.json`, the overlay `pixel-diff.png`, and an enlarged crop per differing region.

### 4. Read the result

```
NOT AT PARITY
  appearance   100%   primitives that look the same
  geometry    34.7%   primitives exactly where the reference has them
  pixels     93.88%   of the picture identical · 14 differing region(s), 0 with no measured explanation
  paired 49/49 primitives · 1 to fix · 1 consequences · 0 leave-alone · 0 untrusted

PV-001  fix  div padding-top 0 → 3  [div.card-inner > div]
             seen as: "Total balance": gap below 4px → 7px (+3), measured to "$12,480.50"
PV-002   ↳   section.balance-card: height 146px → 149px (+3)  [main.content > section.balance-card]
```

Every finding says what to do with it:

- **`fix`** — a cause. This is the work.
- **`↳`** (follows) — a consequence of a cause above it. Never edit code for it; it disappears when its cause is fixed and is re-measured in the next cycle.
- **`leave`** — an adaptation or a sanctioned value. Do not touch.
- **`?`** (untrusted) — the measurement cannot be relied on. Fix the measurement (usually the fonts), not the code.

Regions the pixel check finds are either explained by a finding or listed as **unexplained** — the picture differs there and no measured property says why. Open each one's crop. A region that lies only on a `leave` difference is named on the last line and does not block parity. Lines starting `left out` say what the verdict does not cover; carry them into the report. `references/reading-results.md` explains every line and field.

### 5. Fix the causes, in ownership order

Fix only findings marked `fix`, one layer at a time:

1. **Token/theme.** A repeated colour, spacing, type, radius, shadow, or elevation value → update or apply the existing token.
2. **Shared component.** Several screens expect the same behaviour → fix the primitive or its variant, not the page instance.
3. **Composition.** Correct components composed wrongly → adjust layout, props, slots, or wrappers at the screen level.
4. **Page-only.** Only when the difference is unique to this target and nothing shared owns it.

A finding names the element (`selector`), the token when one is behind the value, and for spacing the exact part that differs on each side. Go from there to the declaration with `references/locate-owner.md`, and write the fix in the target platform's idiom with `references/apply-to-platform.md`.

For every **unexplained region**: open its crop, say in words what differs, trace the owning declaration, then fix it or record why it stays. Never dismiss one without a recorded reason.

Fixing rules:

- Prefer existing components, tokens, utility classes, theme variables, and project conventions.
- Do not introduce a hardcoded value where a token or shared primitive exists. When the reference calls for a value that has no token and it recurs, propose the token instead of inlining it.
- Do not restyle a shared component's markup from the page. Update the component, variant, props, or token that owns the behaviour, and check representative call sites or stories before changing a shared default.
- Never port a value across platforms without converting it: line height is absolute in CSS, React Native, and Compose, a multiplier in Flutter, and extra leading in SwiftUI.
- Keep changes scoped to visual parity. Stop and ask before changing product behaviour, copy, data flow, or accessibility semantics.

### 6. Measure again

Re-run the cycle after each layer's fixes, into a new folder, with `--previous` pointing at the last one. An upstream fix closes downstream findings; measuring between layers is what keeps symptoms from being patched.

- **Keep going** while the number of causes plus unexplained regions goes down.
- **Stop** when it does not go down. Report what remains and what blocks it.
- **A score dropped or a new finding appeared** — the last edit broke something. Revert it before continuing; treat the finding it addressed as blocked or find a different owner.
- **Never more than 8 cycles** for one surface. A cycle counts itself through `--previous` and warns once the cap is passed.

### 7. Finish

Parity (exit code `0`) ends the loop. Otherwise give every remaining cause and unexplained region exactly one status with a reason: adaptation, sanctioned accessibility remap, untrusted because of the font environment, blocked by a missing token or a design-system decision, or accepted by the user.

Then run the project's cheapest reliable check (typecheck, lint, tests, or a build) and report:

- the last cycle's verdict and its three scores, and how many cycles ran;
- what was fixed, grouped by ownership layer;
- every remaining item with its status and reason;
- which checks did not run (for example, no reference image, so the picture was not compared) and which policy file was used.

When working from a `findings.json`, also update each finding's `status` to `fixed`, `open`, or `accepted`.

## Parity rules in brief

Cross-platform repair fails when every difference is treated as a defect. The cycle classifies each finding; `references/parity-policy.md` has the full rules, tolerances, and how to override them.

- **Drift** — must match and does not. Fix it. Between Figma and web at the same size this includes line height, letter spacing, and 1px differences.
- **Adaptation** — the platform or form factor justifies the difference (sanctioned font substitution, a desktop reference against a phone target). Leave it.
- **Required adaptation** — matching the reference would be the defect: touch targets under 44pt on iOS or 48dp on Android, or an authored colour shipped where the design system records an accessible replacement. A recorded accessibility remap is the sanctioned state; never change it back to the reference value.
- **Untrusted** — measured under a font the page did not ask for. Never change a token, a size, or a line height from it. Align the fonts and measure again.

State which class each fix falls into. Never silently "fix" an adaptation.

## When a side cannot be measured

An image-only reference, a surface that cannot be rendered, or a native app without a spec leaves nothing for a cycle to compare. The pixel check still runs whenever two images exist, and its regions say where to look. Compare what can be read for those regions, mark the result as estimated, and do not apply fixes under 2px from estimated values. The procedure is in `references/measure.md`.

When the implementation is a Storybook with the design system's `fidelity` toolbar (authored | accessible), capture in **accessible** mode — that is the shipped state — and record which mode was active.

## Reference files

- `references/measure.md` — capturing each kind of surface: web, Figma with a script tool, Figma read-only, image-only, native; capture context; what a capture cannot see.
- `references/ui-spec.md` — the UI Spec format the captures produce.
- `references/figma-to-css.md` — where Figma properties and CSS differ, and the right translation.
- `references/reading-results.md` — every line of a cycle's output, the result file, regions, and adjudication.
- `references/parity-policy.md` — classes, tolerances, accessibility remaps, font rules, policy override.
- `references/locate-owner.md` — from a finding to the declaration to edit.
- `references/apply-to-platform.md` — writing the fix on web, React Native, Flutter, SwiftUI, and Compose.

After changing anything under `scripts/`, run `node tests/run_benchmark.mjs` and `node --test tests/unit.test.mjs`: the first checks that every seeded difference is still reported and that equal pictures still pass.
