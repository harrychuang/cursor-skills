# Parity Policy

What must match, what may differ, and what must not be trusted. The scripts apply these rules to every finding and write the result into four fields: `intent`, `parityClass`, `severity`, and `action`. This document says what each value means and what to do about it. The defaults are in `assets/parity-policy.json`; reading a cycle's output is covered in `reading-results.md`.

Cross-platform repair fails when every difference is treated as a defect. State the class of each fix you plan, and never silently "fix" an adaptation.

## Classes

| Class | `intent` | `parityClass` | `action` | What to do |
|---|---|---|---|---|
| Drift | `drift` | `strict` | `fix`, or `follows` when it is a consequence of another finding | Must match and does not. Fix every `fix`; a `follows` closes with its cause. |
| Adaptation | `adaptation` | `adaptive` | `leave` | The platform or form factor justifies the difference. Leave it, and confirm the design system names it. |
| Required adaptation, defect | `required-adaptation` | `required-adaptation` | `fix` | The implementation matches the reference where it must diverge: a touch target under the platform minimum, or an authored colour shipped where a remap is recorded. Fix it by diverging. |
| Required adaptation, satisfied | `required-adaptation` | `required-adaptation` | `leave` | A recorded accessibility remap, applied. Keep the accessible value, however much closer the authored one looks to the reference. |
| Untrusted | as measured | `untrusted` | `untrusted` | The measurement cannot be relied on. Never fix from it. Restore the measurement, then run the cycle again. |

Drift is the default. At the same engine class and form factor every visible property, every size, and every redline must match within the tolerances below; a 1 px difference is drift.

**Ignored nodes** produce no finding. A node is dropped from the comparison, with everything inside it, when:

- its name or id contains one of `ignoredNodeNamePatterns` (status bar, statusbar, home indicator, notch, dynamic island, navigation bar background, scrollbar, safe area, browser chrome) **and its spec is not a web capture**. Operating-system chrome can only be in a design frame or a device capture; in a DOM, an element called `.status-bar` is the app's own and is compared;
- it is listed in the policy's `platformOnlyNodes`: an id, a name, a selector, the last part of a selector (`div.cookie-banner`), or a `data-node-id` / `data-testid` / DOM id. This is how an element that exists on one platform only is kept out of every cycle, since the implementation is captured afresh each time;
- it carries `platformOnly: true`, written by hand on a node of a spec file you keep.

Nothing is dropped silently. The dropped nodes are named in `parity.skipped` and on the cycle's `left out as OS chrome or platform-only:` line, and counted in `scores.primitives.skipped`. Dropping a node removes it from the appearance and geometry checks only: the pixel check still compares that part of the picture, so keep OS chrome out of the captures or exclude the area (`measure.md`).

**Required adaptations no cycle measures** remain your responsibility on a native or ported target: safe-area insets added on top of the design's padding, text containers that grow with the user's font scaling, and the states the reference platform does not have (`:hover` and `:focus-visible` when porting native to web, `pressed` when porting web to native). The idioms are in `apply-to-platform.md`.

## Tolerances

Values under `tolerance` in the policy file. A difference at or inside the tolerance is not a finding.

| Key | Default | Applies to | Why |
|---|---|---|---|
| `geometry` | 0.5 px | position, size, and redline distance of every primitive | Sub-pixel layout rounding stays under half a pixel; a whole pixel is a difference. |
| `textWidth`, `textWidthRatio` | 1 px or 1.5% of the reference width, whichever is larger | the width of a text primitive | Two renderers measure the same words in the same font slightly differently. |
| `value` | 0.25 | declared numbers: font size, line height, border width, radius, shadow offset, blur and spread, ring width, icon stroke | Absorbs unit-conversion rounding while a half step such as 1.5 → 2 still differs. |
| `letterSpacing` | 0.05 px | letter spacing | Tracking is set in hundredths of a pixel; 0.1 is already another value. |
| `color` | 2 per channel (0–255) | every colour, gradient stop, and shadow colour | Rounding between colour notations and colour spaces. |
| `alpha` | 0.012 | the alpha of a colour | Three steps of 8-bit alpha. |
| `opacity` | 0.011 | effective opacity: the element's own multiplied by its ancestors' | Rounding at the second decimal; 0.72 → 0.70 still differs. |
| `declared` | 0.75 px | deciding that a measured distance is declared: its padding, border, margin, and gap add up to it | Several rounded parts are summed. |
| `estimatedMinimum` | 2 px | every numeric finding when either spec has `fidelity: "estimated"` | Values read off an image support nothing finer; smaller differences are dropped. |

Two gradients are equal when they are the same kind, their angles are within 1 degree, and each stop matches in colour and within 1 point of position.

## Engine class and form factor

Two facts about the pair decide how strict the comparison is. Both are written to `parity` in `parity.json` (`engines`, `formFactor`).

**Engine class.** `engines` maps each platform to a class: `web` and `figma` are `css`; `react-native`, `flutter`, `ios`, and `android` are `native`. A platform the policy does not list, or a spec with no `surface.platform`, counts as `native`.

| Property | Same engine class (Figma and web, web and web, native and native) | Across engine classes |
|---|---|---|
| Line height, letter spacing | drift | adaptation (`crossEngineAdaptive`) |
| Shadows, text shadows | drift | not reported (`crossEngineIgnored`) |
| Font family | adaptation inside one `fontAliases` group (Inter, SF Pro Text, Roboto, `system-ui`, …); drift otherwise | the same |
| Everything else | drift | drift |

**Form factor.** The surfaces are the same form factor when their widths (`surface.root.width`, else the viewport width) are within 15% of the larger one (`formFactor.sameViewportToleranceRatio`). Further apart, the comparison is cross form factor: spacing, size, position, type size, line count, and truncation become adaptations, and the geometry and pixel checks do not decide the verdict; the cycle lists them as not checked. Colour, radius, borders, weight, copy, and structure stay strict. Judge the layout by ratio, rhythm, and hierarchy, not absolute pixels, and verify the intended responsive behaviour before calling any of it drift.

## Equivalent drawings

The same picture produced another way is never a difference. Wrappers that paint nothing, tag names, class names, and nesting depth are not compared at all.

| Written as | Compared as |
|---|---|
| `border-radius: 9999px`, or half the height | The same pill. Radii are compared as used values, and two fully rounded corners are equal. |
| `#fff`, `rgb(255 255 255)`, `hsl(0 0% 100%)`, `white` | The same colour. Every notation is reduced to sRGB bytes first. |
| A border, or an inset shadow with no offset and no blur | The same border. |
| A divider drawn as the bottom border of a row, or as a thin element of its own after the row | The same line, compared by width and colour. It must run the row's full length, flush with its edge; a line that stops short is not that row's border. |
| An `outline`, or an outset shadow with no offset and no blur | The same outer ring, by width and colour. A Figma stroke lands on one side or the other by its alignment (`figma-to-css.md`). |
| `linear-gradient(#000, #fff)`, `to bottom`, `180deg`, `0.5turn`, with or without `0%` and `100%` | The same gradient. A direction becomes its angle (a corner keyword such as `to bottom right`, the angle it means for that box) and stops without a position are spread evenly. |
| Several shadows, listed in another order | The same shadows. |
| `SEND` typed in capitals, or `Send` with `text-transform: uppercase` | The same text. Copy is compared as rendered. |
| 8 px from `gap`, from a margin, or from padding; 48 px from `height` or from padding | The same distance and size. Declared padding, gap, and margin are never compared directly, only the measured redline and box. |
| A block centred by `margin: 0 auto`, by a flex container, or by equal padding | The same position. An auto margin is leftover space, never a declared distance. |

## Accessibility remaps

A design system can record that an authored colour fails contrast and name its accessible replacement: an `a11y-remap` record, in `TOKEN_ARCHITECTURE.md` or beside the token. The accessible value is then the sanctioned state, and the reference, which shows the authored value, is not the target for that colour.

Pass the records as JSON with `--remaps <file>` (an array, or an object with an `accessibilityRemaps` array), or as a top-level `accessibilityRemaps` array in either spec. All sources are combined.

```json
[{ "authored": "#6b7280", "accessible": "#4b5563", "token": "--color-text-muted",
   "record": "TOKEN_ARCHITECTURE.md a11y-remap D-12", "fields": ["fill"] }]
```

`authored` and `accessible` are required. `token` is named in the recommended fix and `record` is copied into the finding's `notes`. `fields` limits the remap to the colour families it lists: `fill` (text, placeholder, and icon colours), `background`, `border.color`. A single property can be named instead: `placeholder.color`, `icon.stroke`, `icon.fill`. Without `fields` the remap covers all three families.

| Reference shows | Implementation shows | Finding | Result |
|---|---|---|---|
| authored | accessible | `text colour #6b7280 → #4b5563 is the recorded accessibility remap` | `leave`, severity low. Satisfied; keep it. |
| authored | authored | `text colour is the authored #6b7280 — the recorded accessible value #4b5563 was not applied` | `fix`, severity high. Apply the accessible value through its token. |
| authored | anything else | ordinary drift | `fix` |

A remap matches by colour value: every primitive that shows the authored colour in a covered field is expected to show the accessible one. Gradient stops, shadows, pseudo-element colours, and interaction-state colours are not passed through remaps. A remap without a design-system record is not sanctioned; never write an entry to silence a colour finding.

## Font environment

Each capture records which fonts the surface asked for and which ones actually rendered (`surface.fonts`). A web capture asks the engine what it drew with; a Figma capture reads which text layers Figma marks as missing their font. `parity.fontEnvironment` is `aligned` when both sides say their fonts rendered, `unknown` when a side does not say (a hand-assembled spec), and `mismatched` when either side has `fonts.aligned: false`. When it is `mismatched` these findings become untrusted: type size, line height, letter spacing, line count, truncation, and every geometry finding on a text primitive. A fallback font changes all of them, so the numbers describe the fallback, not the build. Font family, weight, colour, and the geometry of boxes stay trusted.

Generic family keywords (`system-ui`, `-apple-system`, `sans-serif`, `serif`, `monospace`, `ui-monospace`, and the like) ask for whatever the machine has, so they never count as a mismatch.

What to do: install the font on the capturing machine, or make the page load it (for Figma, open the file where the font is available), capture that side again, and run the cycle again. Until then change no token, font size, line height, or box size on the strength of an untrusted finding. Untrusted findings block parity. With `unknown`, nothing is marked untrusted: say in the report that the fonts were not verified.

## Geometry-only references

A reference with `surface.fidelity: "geometry-only"` (read-only Figma access, see `measure.md`) carries positions and sizes and nothing about looks. Appearance is not checked and is listed as not checked. What kind of thing a layer is cannot be told either, so a rectangle may pair with an image, an icon, or a box. Sideways measurements on text, its width and its left and right redlines, are untrusted, because a text layer's box can be wider than its words; read the text's alignment and box sizing from the design before changing anything. Vertical measurements stay trusted.

## Touch targets and interaction states

| Implementation platform | Minimum touch target, both axes |
|---|---|
| `ios`, `react-native` | 44 |
| `android`, `flutter` | 48 |
| `web`, `figma` | none |

On a touch platform, an interactive primitive whose smaller side is under the minimum is a required-adaptation defect (`specField: "touchTarget"`). Grow the hit area; do not copy the reference size.

Every interaction state the reference defines on a primitive must exist on its counterpart and change the same properties to the same values. Two states are not expected: `hover` on a touch platform (`ios`, `android`, `react-native`, `flutter`) and `pressed` on any other platform.

## Severity

Severity ranks a finding for the report. It never changes the action. The first rule that applies wins:

| Finding | Severity | Key under `severity` |
|---|---|---|
| Untrusted, or a satisfied remap | low | fixed |
| Required-adaptation defect | high | `requiredAdaptation` |
| A reference primitive with no counterpart | high | `missingNode` |
| A primitive only the implementation has | medium | `extraNode` |
| Copy: text, placeholder text, pseudo-element content | high | `text` |
| Structure: a border missing or not in the reference, text transform, alignment, line count, truncation, a missing state or decoration, wrong icon artwork or asset | high | `structural` |
| Colour | medium | `color` |
| A number within 2, or within 5% of the reference value | low | `numeric` |
| A number within 8, or within 25% | medium | `numeric` |
| A number beyond that | high | `numeric` |
| Anything else: font family, decoration, gradient, shadow, image fit | medium | `other` |

Any adaptation is low, whatever the rule above gave (`adaptiveCap`).

## Overriding the policy

Write a policy file in the target repo that holds only what the project's design system mandates, and pass it to the cycle with `--policy <file>`. It is merged over `assets/parity-policy.json` at every depth, so `{ "pixel": { "sameRenderer": { "threshold": 0.03 } } }` changes that one value and keeps everything else. Lists are replaced whole (`fontAliases`, `ignoredNodeNamePatterns`, `platformOnlyNodes`, `crossEngineAdaptive`, `crossEngineIgnored`, `severity.numeric`, the lists inside `statePolicy`): restate the entries you want to keep.

| Key | Default | Decides |
|---|---|---|
| `policyVersion` | `2.0` | The label written to `parity.policy` in `parity.json`. Give your copy its own. |
| `pixel.sameRenderer` | threshold 0.02, tolerance 1 | The pixel check when both pictures come from the same renderer: how far apart two colours must be to count as different, and how many pixels an edge may sit apart and still be excused as blending. |
| `pixel.otherRenderer` | threshold 0.05, tolerance 1 | The same two values against a design tool's export, where every glyph edge is blended differently. |
| `statePolicy` | touch platforms; `hover` pointer-only; `pressed` touch-only | Which states are expected, and which platforms get the touch-target check. |
| `platformOnlyNodes` | none | Elements left out of every comparison (see Ignored nodes above). |
| `loop.maxCycles` | 8 | The cycle cap of the fix loop (`SKILL.md`). A cycle counts itself through `--previous` and prints a warning past the cap; it does not refuse to run. |

The other keys are described in the sections above. Do not loosen a tolerance to make a finding go away; a difference the project accepts is recorded as accepted, not hidden. Name the policy file you used in the final report.
