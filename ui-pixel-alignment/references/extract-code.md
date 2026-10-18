# Extracting a UI Spec from Source Code

Use this when either side of the comparison is a codebase — a web app being audited, or an app implementation used as the reference for a web rebuild (and the reverse).

## Prefer runtime over source

Static source reading misses inherited styles, theme resolution, media queries, and anything computed. Whenever the surface can actually be rendered, measure it:

| Target | How to measure | Fidelity |
|---|---|---|
| Web page or Storybook story | Render it, then read `getComputedStyle` + `getBoundingClientRect` per node | `measured` |
| React Native | React Native DevTools / Flipper layout inspector, or a rendered screenshot at a known device scale | `measured` / `estimated` |
| Flutter | Flutter DevTools widget inspector — it reports exact constraints and sizes | `measured` |
| SwiftUI / UIKit | Xcode View Hierarchy Debugger, or Simulator screenshot ÷ device scale | `measured` / `estimated` |
| Compose | Layout Inspector in Android Studio | `measured` |

Only fall back to reading source when the surface cannot be run. Set `fidelity` honestly — a spec that says `inspected` tells the reviewer that inherited and themed values may be missing.

### Web computed-style snippet

Run this in the page to bulk-collect nodes, then hand-trim to the 15–60 that matter:

```js
[...document.querySelectorAll('[data-testid], header, main, aside, nav, footer, section, button, h1, h2, h3, li')]
  .map((el) => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      id: el.dataset.testid || el.id || el.className?.toString().split(' ')[0] || el.tagName.toLowerCase(),
      role: el.tagName.toLowerCase(),
      layout: { mode: s.display.includes('flex') ? (s.flexDirection.startsWith('row') ? 'row' : 'column') : s.display, justify: s.justifyContent, align: s.alignItems, gap: parseFloat(s.gap) || 0 },
      box: {
        width: Math.round(r.width), height: Math.round(r.height),
        padding: [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft].map(parseFloat),
        margin: [s.marginTop, s.marginRight, s.marginBottom, s.marginLeft].map(parseFloat),
        position: { x: Math.round(r.x), y: Math.round(r.y) },
      },
      type: { family: s.fontFamily.split(',')[0].replace(/"/g, ''), size: parseFloat(s.fontSize), weight: Number(s.fontWeight), lineHeight: parseFloat(s.lineHeight) || null, letterSpacing: parseFloat(s.letterSpacing) || 0 },
      fill: s.color, background: s.backgroundColor,
      border: { width: parseFloat(s.borderTopWidth), color: s.borderTopColor, style: s.borderTopStyle },
      radius: [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius].map(parseFloat),
      shadow: s.boxShadow === 'none' ? null : s.boxShadow,
      opacity: Number(s.opacity),
    };
  });
```

Convert `rgb()` to hex before writing the spec so colors compare cleanly. Resolve CSS custom properties back to token names for `tokenRefs`: match the computed value against the project's token file.

## Reading each platform's source

### Web (CSS / Tailwind / CSS-in-JS)

- Resolve the token layer first: `:root` custom properties, a theme object, or the Tailwind config. Every value you record should be checked against it so `tokenRefs` can be filled.
- Tailwind: translate the scale before recording. Default scale is `n × 4px` (`p-6` = 24px, `gap-4` = 16px), but a project can override it — read `tailwind.config` rather than assuming.
- `rem` → px using the project's actual root size.
- Shorthand `padding: 12px 16px` expands to `[12, 16, 12, 16]`.
- Record the breakpoint you measured at in `surface.viewport`; responsive drift is a different finding from base drift.

### React Native / Expo

Traps that produce false findings if ignored:

| RN behavior | Consequence |
|---|---|
| `flexDirection` defaults to **`column`** (web defaults to `row`) | An RN `View` with no `flexDirection` is `layout.mode: "column"`. Do not copy web's row default. |
| `alignItems` defaults to `stretch`, same as web | no adjustment |
| `flex: 1` means `flexGrow:1; flexShrink:1; flexBasis:0%` | not the same as web `flex: 1` on `flex-basis: auto` |
| `gap` requires RN 0.71+ | Older code fakes it with margins on children — read those margins as the effective gap |
| No `margin` collapsing | Adjacent RN margins add; adjacent web block margins collapse. Compare effective spacing, not declared spacing. |
| `overflow: hidden` needed for `borderRadius` clipping on Android | a missing clip is a real finding, but on Android only |
| `fontWeight` accepts `'600'` as a string | normalize to number `600` |
| `lineHeight` is absolute px, never a multiplier | web `line-height: 1.5` must be multiplied by font size before comparing |
| `shadow*` (iOS) vs `elevation` (Android) | record both; a shadow present on one OS only is a finding |
| `StyleSheet.create` values | flatten the style array in source order — later entries win |

`Dimensions.get('window')` and `useWindowDimensions` give the viewport for `surface`.

### Flutter

| Widget | UI Spec mapping |
|---|---|
| `Padding(padding: EdgeInsets.all(24))` | `box.padding = [24,24,24,24]` |
| `EdgeInsets.symmetric(horizontal: 16, vertical: 12)` | `[12,16,12,16]` |
| `Container(color:, decoration:)` | `background`, `border`, `radius`, `shadow` from `BoxDecoration` |
| `Column` / `Row` | `layout.mode` = `column` / `row` |
| `mainAxisAlignment` | `layout.justify` |
| `crossAxisAlignment` | `layout.align` |
| `SizedBox(height: 16)` between children | that is the effective `layout.gap` — record it as gap, not as a node |
| `Spacer()` | `layout.justify: "space-between"` in effect |
| `Stack` | `layout.mode: "stack"` |
| `TextStyle(fontSize:, height:)` | `type.size`; `height` is a **multiplier** → `lineHeight = fontSize × height` |
| `Theme.of(context).textTheme.titleMedium` | fill `tokenRefs.type` with the theme entry name |
| `BorderRadius.circular(12)` | `[12,12,12,12]` |
| `Material(elevation: 2)` | `elevation: 2`; Flutter elevation is not a CSS shadow — compare against the design system's elevation scale, not against a shadow string |
| `MediaQuery.of(context).padding` | safe area; keep it out of the app's own padding |

Flutter logical pixels equal CSS px, so no numeric conversion is needed.

### SwiftUI / UIKit

| Swift | UI Spec mapping |
|---|---|
| `.padding(24)` | `[24,24,24,24]` |
| `.padding(.horizontal, 16)` | `[0,16,0,16]` |
| `.padding()` with no argument | **system default, ~16pt** — record `16` and note it is the default, not an explicit choice |
| `VStack(spacing: 12)` | `layout.mode: "column"`, `gap: 12` |
| `VStack` with no `spacing:` | system default spacing (~8pt); note it |
| `HStack` / `ZStack` | `row` / `stack` |
| `.frame(width:height:)` | `box.width` / `box.height` |
| `.frame(maxWidth: .infinity)` | `box.width = null`, note "fills parent" |
| `alignment:` on a stack | `layout.align` |
| `.font(.title2)` | resolve the Dynamic Type size at the default content size; put the style name in `tokenRefs.type` |
| `.cornerRadius(12)` / `.clipShape(RoundedRectangle(cornerRadius: 12))` | `radius` |
| `.shadow(radius:x:y:)` | `shadow` |
| `.safeAreaInset` / `.ignoresSafeArea` | safe-area handling → `notes`, not app padding |
| UIKit `layoutMargins` | default 16pt on each side unless overridden |

pt equals CSS px at 1x. A 390pt-wide iPhone frame compares directly against a 390px web viewport.

### Jetpack Compose

| Compose | UI Spec mapping |
|---|---|
| `Modifier.padding(24.dp)` | `[24,24,24,24]` |
| `Modifier.padding(horizontal = 16.dp, vertical = 12.dp)` | `[12,16,12,16]` |
| `Column(verticalArrangement = Arrangement.spacedBy(12.dp))` | `gap: 12` |
| `Arrangement.SpaceBetween` | `layout.justify: "space-between"` |
| `horizontalAlignment = Alignment.CenterHorizontally` | `layout.align: "center"` |
| `Modifier.size / width / height` | `box.width` / `box.height` |
| `Modifier.fillMaxWidth()` | `box.width = null`, note "fills parent" |
| `MaterialTheme.typography.titleMedium` | `tokenRefs.type` = the typography role name |
| `MaterialTheme.colorScheme.surface` | `tokenRefs.background` = the color role name |
| `RoundedCornerShape(12.dp)` | `[12,12,12,12]` |
| `Modifier.shadow(2.dp)` / `Surface(tonalElevation =)` | `elevation` |
| `fontSize = 16.sp` | `type.size = 16`; note that sp scales with user settings |
| Modifier order matters | `padding().background()` differs from `background().padding()` — read left to right, the background applies to whatever box exists at that point |

dp equals CSS px at 1x.

## Ownership while you read

Every node you record should also answer "who owns this value". Fill these as you go — the diff cannot infer them later:

- `component` — the shared component this node comes from, if any.
- `tokenRefs` — the token/theme/variable name behind each value.
- Whether the value was set in the shared component, in a variant/prop, at the composition site, or as a one-off inline style.

Put that last answer in `notes` when it is not obvious from `component` and `tokenRefs`. It is what turns a finding into a one-line fix instruction.
