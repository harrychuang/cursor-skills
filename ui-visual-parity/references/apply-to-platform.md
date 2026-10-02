# Applying a Fix on the Target Platform

A finding says *what* is wrong in platform-neutral terms. This document is the write direction: how to express that correction idiomatically in the target codebase without introducing one-off values.

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
| Flutter | `Theme.of(context).textTheme.titleMedium` |
| SwiftUI | `.font(.title2)` or a custom `Font` extension |
| Compose | `MaterialTheme.typography.titleMedium` |

When the ramp entry itself needs a new line height or letter spacing, the number does not carry across platforms: see Letter spacing and line height below.

### Elevation and shadow (`shadow`)

Do not port a CSS `box-shadow` string to native. Map through the elevation level.

| Target | Idiom |
|---|---|
| Web | `box-shadow: var(--sys-elevation-1)` |
| React Native | `shadowColor/shadowOffset/shadowOpacity/shadowRadius` for iOS **and** `elevation` for Android — both, or the shadow disappears on one OS |
| Flutter | `Material(elevation: 1)` or `BoxShadow` in a `BoxDecoration` |
| SwiftUI | `.shadow(color:radius:x:y:)` |
| Compose | `Modifier.shadow(1.dp)` or `Surface(tonalElevation = 1.dp)` — Material 3 uses tonal elevation, which tints rather than casts |

### Colour (`fill`, `background`, `border.color`)

Apply the semantic role, not the hex. `--sys-on-surface-variant`, `colorScheme.onSurfaceVariant`, `Color.onSurfaceVariant`. If the target has no semantic layer, use the closest existing constant and flag the gap.

### Gradients

`gradient` on a box, captured as `linear(135deg, #4f46e5 0%, #7c3aed 100%)` with the CSS angle: 0deg points up, 90deg right. Native APIs take start and end points instead, and corner-to-corner points equal 135deg only on a square box, so confirm the result with the pixel check.

| Target | Idiom |
|---|---|
| Web CSS | `background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-2) 100%)` |
| Tailwind | v4: `bg-linear-135/srgb from-primary to-primary-2`; without `/srgb`, v4 blends in oklab, which a design tool does not. v3: `bg-[linear-gradient(135deg,#4f46e5,#7c3aed)]`. The `to-br` direction aims at the corner, not at 135deg |
| React Native | No stable gradient style in core. `<LinearGradient colors={[c1, c2]} locations={[0, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />` from `expo-linear-gradient`; `react-native-linear-gradient` also takes `useAngle angle={135}` |
| Flutter | `BoxDecoration(gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [c1, c2], stops: [0, 1]))`; add `transform: GradientRotation(radians)` for an exact angle |
| SwiftUI | `LinearGradient(stops: [.init(color: c1, location: 0), .init(color: c2, location: 1)], startPoint: .topLeading, endPoint: .bottomTrailing)` |
| Compose | `Modifier.background(Brush.linearGradient(0f to c1, 1f to c2))`, top-left to bottom-right by default; `start` and `end` are pixel offsets, not fractions |

### Per-side borders

`border.width`, `border.color`, and `border.style` hold one value per side; a finding reads `bottom border is missing (1px #e5e7eb)`. A border takes layout space in CSS, React Native, and a Flutter `Container`; an overlay or a drawn line does not, so adjust the padding to keep the redlines.

| Target | Idiom |
|---|---|
| Web CSS | `border-bottom: 1px solid var(--color-border)` |
| Tailwind | `border-b border-gray-200` (`border-b-2` for 2px) |
| React Native | `{ borderBottomWidth: 1, borderBottomColor: colors.border }` |
| Flutter | `BoxDecoration(border: Border(bottom: BorderSide(color: border, width: 1)))` |
| SwiftUI | No direct equivalent; `.border` draws all four sides. `.overlay(alignment: .bottom) { Rectangle().fill(border).frame(height: 1) }` |
| Compose | No direct equivalent; `Modifier.border` draws all four sides. `Modifier.drawBehind { val w = 1.dp.toPx(); drawLine(border, Offset(0f, size.height - w / 2), Offset(size.width, size.height - w / 2), w) }`, or a `HorizontalDivider` between rows |

### Rings and outlines

`outline` in the spec: a line around the box that takes no layout space, such as a focus ring or a Figma outside stroke. A border is not a substitute, because it takes layout space.

| Target | Idiom |
|---|---|
| Web CSS | `outline: 2px solid var(--ring); outline-offset: 2px`, or `box-shadow: 0 0 0 2px var(--ring)` |
| Tailwind | `ring-2 ring-indigo-600 ring-offset-2`, or `outline-2 outline-offset-2 outline-indigo-600` (v3 also needs `outline`) |
| React Native | `outlineWidth`, `outlineColor`, `outlineOffset` (0.77+, New Architecture) or `boxShadow: '0 0 0 2px #4f46e5'` (0.76+, New Architecture). Otherwise an absolutely positioned sibling `View` with `borderWidth`, inset by the negative offset |
| Flutter | `Border.all(color: ring, width: 2, strokeAlign: BorderSide.strokeAlignOutside)`, or `BoxShadow(color: ring, spreadRadius: 2)` in `boxShadow` |
| SwiftUI | `.overlay { RoundedRectangle(cornerRadius: r + 4).strokeBorder(ring, lineWidth: 2).padding(-4) }` |
| Compose | No direct equivalent; `Modifier.border` draws inside the bounds. `Modifier.drawBehind { drawRoundRect(ring, topLeft = Offset(-o, -o), size = Size(size.width + 2 * o, size.height + 2 * o), cornerRadius = CornerRadius(r + o), style = Stroke(w)) }` with `o`, `r`, `w` in pixels |

### Truncation and line clamping

`type.truncated` and `type.lines`: findings read `should truncate with … but does not` or `wraps to 2 lines, reference has 1`. Text truncates only inside a bounded width, which in a row means the text item must be allowed to shrink.

| Target | Idiom |
|---|---|
| Web CSS | One line: `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`. Several: `display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden`. In a flex row add `min-width: 0` |
| Tailwind | `truncate`, or `line-clamp-2`; `min-w-0` on the flex item |
| React Native | `<Text numberOfLines={1} ellipsizeMode="tail">`; `flexShrink: 1` on the text in a row |
| Flutter | `Text(s, maxLines: 1, overflow: TextOverflow.ellipsis)` inside `Expanded` or `Flexible` in a `Row` |
| SwiftUI | `.lineLimit(1).truncationMode(.tail)` |
| Compose | `Text(s, maxLines = 1, overflow = TextOverflow.Ellipsis)`, with `Modifier.weight(1f)` in a `Row` |

### Text decoration and transform

`type.decoration` and `type.transform`. Copy is compared as rendered, so keep the string in its source case and apply the transform in style where the platform has one.

| Target | Decoration | Transform |
|---|---|---|
| Web CSS | `text-decoration: underline` | `text-transform: uppercase` |
| Tailwind | `underline`, `line-through`, `no-underline` | `uppercase`, `lowercase`, `capitalize`, `normal-case` |
| React Native | `{ textDecorationLine: 'underline' }` | `{ textTransform: 'uppercase' }` |
| Flutter | `TextStyle(decoration: TextDecoration.underline)` | No direct equivalent; `s.toUpperCase()` at the widget |
| SwiftUI | `.underline()`, `.strikethrough()` | `.textCase(.uppercase)` or `.lowercase`; `s.capitalized` for title case |
| Compose | `TextStyle(textDecoration = TextDecoration.Underline)` | No direct equivalent; `s.uppercase()` at the call site |

### Letter spacing and line height

`type.letterSpacing` and `type.lineHeight`, both captured in px. The number does not travel: line height is an absolute length in CSS, React Native, and Compose, a **multiplier** of the font size in Flutter, and **extra leading** on top of the font's own line height in SwiftUI. Convert; do not copy the number across. Against a web or Figma reference a native target reports both as adaptations (`parity-policy.md`); change them there only where the design system sets the value.

| Target | Idiom |
|---|---|
| Web CSS | `line-height: 24px; letter-spacing: -0.2px` |
| Tailwind | `leading-6 tracking-[-0.2px]`, or `text-base/6`; a bare `text-*` utility brings its own line height |
| React Native | `{ lineHeight: 24, letterSpacing: -0.2 }` |
| Flutter | `TextStyle(fontSize: 16, height: 24 / 16, letterSpacing: -0.2)`; `leadingDistribution: TextLeadingDistribution.even` splits the leading above and below the glyphs as CSS does |
| SwiftUI | `.lineSpacing(24 - font.lineHeight)` with half that as vertical padding, where `font` is the `UIFont`; `.kerning(-0.2)` |
| Compose | `TextStyle(lineHeight = 24.sp, letterSpacing = (-0.2).sp, lineHeightStyle = LineHeightStyle(LineHeightStyle.Alignment.Center, LineHeightStyle.Trim.None))` |

### Icon size and stroke width

Size findings on an `icon` primitive (`svg: width 20px → 24px (+4)`), `icon.strokeWidth`, and `icon.artwork`. A wrong glyph is an asset to replace, not a style to adjust.

| Target | Idiom |
|---|---|
| Web CSS | `svg { width: 20px; height: 20px; stroke-width: 1.5 }`; keep the `viewBox`, the stroke is in its units |
| Tailwind | `size-5 stroke-[1.5]` (`w-5 h-5` before v3.4) |
| React Native | `react-native-svg`: `<Svg width={20} height={20} viewBox="0 0 24 24"><Path strokeWidth={1.5} … /></Svg>`. An icon font has no stroke width; use the SVG |
| Flutter | `Icon(icon, size: 20)`; `weight: 300` works only with a variable icon font such as Material Symbols. `SvgPicture.asset('home.svg', width: 20, height: 20)` from `flutter_svg` keeps the stroke of the asset |
| SwiftUI | SF Symbol: `Image(systemName: "house").font(.system(size: 20, weight: .light))`. Asset: `Image("home").resizable().frame(width: 20, height: 20)`. No stroke parameter: choose the symbol weight or re-export the asset |
| Compose | `Icon(painterResource(R.drawable.ic_home), contentDescription = null, modifier = Modifier.size(20.dp))`; the stroke is `android:strokeWidth` in the vector drawable |

### Image fit

`image.fit`, compared in CSS terms. The crop position (`image.position`, CSS `object-position`) is compared between two web captures; against a design file or a native screen a wrong focal point shows only in the pixel check.

| Target | Cover | Contain | Fill (stretch) |
|---|---|---|---|
| Web CSS | `object-fit: cover` | `object-fit: contain` | `object-fit: fill` |
| Tailwind | `object-cover` | `object-contain` | `object-fill` |
| React Native | `resizeMode="cover"` | `resizeMode="contain"` | `resizeMode="stretch"` |
| Flutter | `fit: BoxFit.cover` | `fit: BoxFit.contain` | `fit: BoxFit.fill` |
| SwiftUI | `.resizable().scaledToFill()` then `.frame(…).clipped()` | `.resizable().scaledToFit()` | `.resizable()` alone |
| Compose | `contentScale = ContentScale.Crop` | `ContentScale.Fit` | `ContentScale.FillBounds` |

### Decorations drawn by pseudo-elements

`pseudo.before` and `pseudo.after` on the host element: a status dot, an active-tab underline, a toggle thumb. Findings read `::after fill #6ea8fe → #a78bfa` or `::before size 8×8px → 6×6px`. Only the web has pseudo-elements; elsewhere the decoration is a real child or a draw call, kept out of layout and out of the accessibility tree.

| Target | Idiom |
|---|---|
| Web CSS | `.tab.is-active::after { content: ""; position: absolute; inset: auto 0 0; height: 2px; background: var(--color-primary) }`, with `position: relative` on the host |
| Tailwind | `relative after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-indigo-600` |
| React Native | No direct equivalent. A child `<View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, backgroundColor: colors.primary }} />` |
| Flutter | No direct equivalent. A `Stack` with `Positioned(left: 0, right: 0, bottom: 0, child: Container(height: 2, color: primary))`, or a `foregroundDecoration` on the host |
| SwiftUI | `.overlay(alignment: .bottom) { Rectangle().fill(primary).frame(height: 2) }`; `.background(alignment:)` to draw behind |
| Compose | `Modifier.drawBehind { drawRect(primary, topLeft = Offset(0f, size.height - h), size = Size(size.width, h)) }`; `drawWithContent` to draw in front |

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

Then run the cycle again: `node scripts/parity.mjs …` with the same arguments and a new `--out`. For a target the cycle cannot capture itself, capture it again as `measure.md` describes and compare again. A fix that is not confirmed by a second measurement is a claim, not a result.
