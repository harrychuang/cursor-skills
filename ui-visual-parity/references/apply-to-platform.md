# Applying a Fix on the Target Platform

The diff tells you *what* is wrong in platform-neutral terms. This document is the write direction: how to express that correction idiomatically in the target codebase without introducing one-off values.

Read this after ownership is decided. It answers "how do I write it here", not "where does it belong".

## Find the token before writing the value

Every platform has a token layer. Look for it first — a fix that names a token survives; a fix that hardcodes `24` gets re-broken by the next person.

| Target | Where tokens live | How to reference |
|---|---|---|
| Web CSS | `:root` custom properties, `theme.css`, `tokens.css` | `var(--sys-space-6)` |
| Tailwind | `tailwind.config.{js,ts}` `theme` / `theme.extend` | `p-6`, or a named key you add to the config |
| CSS-in-JS / styled-components | the theme object passed to the provider | `${({ theme }) => theme.space[6]}` |
| React Native | a theme module, `restyle`/`tamagui`/`nativewind` config, or a `tokens.ts` | `theme.space[6]`, `spacing.lg` |
| Flutter | `ThemeData`, `TextTheme`, `ColorScheme`, or an app-level tokens class | `Theme.of(context).textTheme.titleMedium` |
| SwiftUI | an enum/struct of design constants, `Color` asset catalog entries, `Font` extensions | `Spacing.lg`, `Color.sysSurface` |
| Compose | `MaterialTheme.colorScheme` / `.typography` / `.shapes`, or a custom `CompositionLocal` | `MaterialTheme.colorScheme.surface` |

If the value the reference calls for has no token and the same value appears in more than one place, **stop and propose adding the token** rather than inlining it. Adding a token is a design-system change — get agreement first.

## Expressing each spec field

### Spacing between children (`layout.gap`)

| Target | Idiom | Notes |
|---|---|---|
| Web | `display: flex; gap: 16px` | |
| Tailwind | `flex gap-4` | |
| React Native ≥ 0.71 | `{ gap: 16 }` | |
| React Native < 0.71 | margin on children, or a spacer component | Do not put a margin on the container — that is `box.margin`, a different field |
| Flutter | `Column(children: [...])` with `Arrangement`-style spacing via `SizedBox(height: 16)`, or `Column(spacing: 16)` on Flutter 3.27+ | Prefer the built-in `spacing` when the SDK supports it |
| SwiftUI | `VStack(spacing: 16)` / `HStack(spacing: 16)` | Never fake it with `.padding` on children |
| Compose | `Column(verticalArrangement = Arrangement.spacedBy(16.dp))` | |

### Padding (`box.padding`)

| Target | Idiom |
|---|---|
| Web | `padding: 24px` / `padding: 12px 16px` |
| Tailwind | `p-6` / `py-3 px-4` |
| React Native | `{ padding: 24 }` or `{ paddingVertical: 12, paddingHorizontal: 16 }` |
| Flutter | `Padding(padding: EdgeInsets.all(24))` / `EdgeInsets.symmetric(vertical: 12, horizontal: 16)` |
| SwiftUI | `.padding(24)` / `.padding(.vertical, 12).padding(.horizontal, 16)` |
| Compose | `Modifier.padding(24.dp)` / `Modifier.padding(vertical = 12.dp, horizontal = 16.dp)` |

### Corner radius (`radius`)

| Target | Idiom |
|---|---|
| Web | `border-radius: 12px` |
| React Native | `{ borderRadius: 12 }` — add `overflow: 'hidden'` when children must be clipped on Android |
| Flutter | `BoxDecoration(borderRadius: BorderRadius.circular(12))`, or `ClipRRect` when clipping children |
| SwiftUI | `.clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))` — prefer this over the deprecated `.cornerRadius` |
| Compose | `Modifier.clip(RoundedCornerShape(12.dp))`, or `Surface(shape = ...)` |

### Typography (`type.*`)

Never set font size, weight, and line height as three loose numbers when the project has a type ramp. Apply the ramp entry.

| Target | Idiom |
|---|---|
| Web | a class or token bundle: `.text-title-md`, `font: var(--sys-title-md)` |
| React Native | a `Text` variant component or a `typography.titleMd` style object |
| Flutter | `Theme.of(context).textTheme.titleMedium` — remember `height` is a multiplier: `lineHeight ÷ fontSize` |
| SwiftUI | `.font(.title2)` or a custom `Font` extension; use `.lineSpacing()` (extra leading), not absolute line height |
| Compose | `MaterialTheme.typography.titleMedium` |

`lineHeight` is absolute in CSS-px, React Native, and Compose (`lineHeight = 24.sp`), but a **multiplier** in Flutter and **extra leading** in SwiftUI. Convert; do not copy the number across.

### Elevation and shadow (`shadow`, `elevation`)

Do not port a CSS `box-shadow` string to native. Map through the elevation level.

| Target | Idiom |
|---|---|
| Web | `box-shadow: var(--sys-elevation-1)` |
| React Native | `shadowColor/shadowOffset/shadowOpacity/shadowRadius` for iOS **and** `elevation` for Android — both, or the shadow disappears on one OS |
| Flutter | `Material(elevation: 1)` or `BoxShadow` in a `BoxDecoration` |
| SwiftUI | `.shadow(color:radius:x:y:)` |
| Compose | `Modifier.shadow(1.dp)` or `Surface(tonalElevation = 1.dp)` — Material 3 uses tonal elevation, which tints rather than casts |

### Color (`fill`, `background`, `border.color`)

Apply the semantic role, not the hex. `--sys-on-surface-variant`, `colorScheme.onSurfaceVariant`, `Color.onSurfaceVariant`. If the target has no semantic layer, use the closest existing constant and flag the gap.

## Required adaptations — where the fix must diverge from the reference

These come from `intent: "required-adaptation"` findings. Copying the reference here is the bug.

### Touch targets

| Target | Minimum | How |
|---|---|---|
| iOS / SwiftUI | 44×44pt | `.frame(minWidth: 44, minHeight: 44)` plus `.contentShape(Rectangle())` so the whole frame is tappable |
| Android / Compose | 48×48dp | `Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp)`; Material components already enforce `minimumInteractiveComponentSize` |
| React Native | 44 | grow the control, or keep the visual size and add `hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}` |
| Flutter | 48 | wrap in `SizedBox(width: 48, height: 48)`, or set `materialTapTargetSize` |
| Web | no hard minimum | keep the reference size, but ensure `:focus-visible` and `:hover` states exist |

Preserve the visual size when the design calls for a small control — expand the *hit area*, not the pixels.

### Safe areas

| Target | How |
|---|---|
| React Native | `SafeAreaView` or `useSafeAreaInsets()` from `react-native-safe-area-context`, added **on top of** the design's own padding |
| Flutter | `SafeArea`, or `MediaQuery.of(context).padding` added to your padding |
| SwiftUI | default safe-area behavior; use `.safeAreaInset(edge:)` for pinned bars, `.ignoresSafeArea` only for backgrounds |
| Compose | `Modifier.windowInsetsPadding(WindowInsets.safeDrawing)` |
| Web | `env(safe-area-inset-*)` when the page runs in a standalone/PWA context |

The design frame's padding is app padding. Safe-area allowance is added to it, never substituted for it.

### Scaling text

Native text scales with the user's accessibility setting. A container with a fixed height that fits at the default size will clip at larger ones.

- React Native: prefer `minHeight` over `height`; use `allowFontScaling` deliberately, and do not disable it just to make a layout fit.
- Flutter: honor `MediaQuery.textScaler`; let the container size to its content.
- SwiftUI: Dynamic Type is on by default; use `.frame(minHeight:)`, and `ViewThatFits` or `.lineLimit` with truncation where space is genuinely fixed.
- Compose: `sp` for text; avoid fixed-height containers around it.

### Interaction states

Porting web → native: `hover` has no meaning; implement `pressed` instead (`Pressable`, `InkWell`/`InkResponse`, `.buttonStyle`, `indication`/`ripple`).

Porting native → web: `pressed` alone is not enough; add `:hover` and `:focus-visible`. Keyboard focus is not optional on web, and the native reference will not show you what it should look like — take it from the design system.

## Cross-platform layout traps

| Trap | What happens | Correct move |
|---|---|---|
| Copying `flexDirection: 'row'` into RN because web defaulted to row | RN defaults to `column`; an explicit `row` you added may be right, but an omitted one is not the same as web's default | Set the direction explicitly on both sides |
| Copying web `flex: 1` to RN | RN's `flex: 1` implies `flexBasis: 0%` | Use `flexGrow: 1` when you meant "grow from content size" |
| Expecting margin collapse on native | Native margins always add; web block margins collapse | Compare the *effective* gap, then set it once via `gap`/`spacing` |
| Percentage widths in native | Supported in RN, awkward in Flutter/SwiftUI/Compose | Use flex weights (`Expanded`, `weight(1f)`, `.frame(maxWidth: .infinity)`) |
| `position: absolute` ported literally | Native absolute positioning ignores document flow differently | Rebuild with the platform's stack primitive (`ZStack`, `Stack`, `Box`) |
| Web `overflow: auto` ported to native | There is no implicit scroll container on native | Use `ScrollView` / `SingleChildScrollView` / `LazyColumn` explicitly |

## After the edit

Verify on the platform you changed, not on the one you read from:

| Target | Cheapest reliable check |
|---|---|
| Web | reload the URL or story, re-measure the changed nodes with `getComputedStyle` |
| React Native | Fast Refresh in the simulator, then re-measure via the layout inspector |
| Flutter | hot reload, then DevTools widget inspector |
| SwiftUI | Xcode preview or simulator, then the view hierarchy debugger |
| Compose | `@Preview` or the emulator, then Layout Inspector |

Then re-extract the implementation spec and re-run the diff. A fix that is not confirmed by a second measurement is a claim, not a result.
