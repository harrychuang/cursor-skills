# Locating the Owning Declaration

A finding says *what* is wrong ("td padding-left 16 → 12"). This document is the fastest mechanical route to *where* — the file and declaration that owns the value. Searching by eye is what makes each finding expensive; the finding already carries most of the answer, and every platform below has a tool that answers "which rule set this" directly.

Work the ladder top-down. Each rung is cheaper and more precise than the one below it.

## Rung 1 — the finding already names the owner

Before opening any inspector, read the finding in `parity.json` (its fields are listed in `reading-results.md`). Go through these in order; each one that is present narrows the search:

1. **`differsAt[].selector` and the differing part.** A spacing finding such as `td padding-left 16 → 12` names the element, the property, and both values. Go to that element's declaration of that property: `differsAt[].selector` is the element, `design` is the value to reach, and `build` is the value to replace. The finding's own `selector` is only the element the distance was seen from.
2. **`builtFrom` and `designedAs`**, when `differs` is absent, as it is across tools. Compare the two part lists. The build's parts (`section.balance-card padding-left 16`) name the elements and properties to look at. A side with no list does not declare the distance, so look at how the container aligns or distributes its children.
3. **`selector`**, for appearance and size findings. It is the implementation element; a web capture writes it as up to three levels of `tag.class` or `tag#id`. Search for the class or component name, then for the property `specField` names.
4. **`tokens`.** Grep the token's definition (`--space-6`, `theme.space[6]`, `Spacing.lg`) to find the token file, then grep its *usages* filtered by the element to find the assigning declaration. If the token's value is right and the rendered value is wrong, the usage site ignores the token: an override or a hardcoded value wins there, and the bug is at the usage site, not the definition. `implementation.spec.json` lists every custom property with its resolved value under `tokens`. A name in Figma's form (`space/4`, `Title/Medium`) came from the reference; map it to the project's token first. An empty `tokens` proves nothing: a web capture records token names only on elements that paint, hold text, or are positioned, and only from stylesheets it can read.
5. **The owner of an unexplained region.** A region has no finding; start from `regions[].owner.selector`.

A findings file from the pixel alignment report skill (`ui-pixel-align-report`) is an accepted input and can carry two more fields: `implementationReference`, the element or component the finding sits on, and `files`, the source paths confirmed when that report was reviewed. Trust `files` when it is filled; a cycle's own findings leave it empty.

### From a redline to the declaration

| The finding shows | What it is | Where the fix goes |
|---|---|---|
| A part only the build has: `div padding-top 0 → 3`, or an extra entry on the `build:` line | A stray wrapper | Remove the wrapper or its spacing. Do not compensate on a neighbour. |
| `border-top 0 → 1`, or a `border-<side>` entry among the build's parts | A border that takes layout space and pushes the content in | Draw the line without taking space, or reduce the padding by its width (strokes: `figma-to-css.md`). |
| `— centred vertically in the reference, not in the implementation`, with no `design:` parts | An alignment difference | An alignment property on the container (`align-items`, `justify-content`, or the platform's equivalent). Not a padding: a padding that lines up one child moves the others. |
| A size marked `— set explicitly` | A width or height written in the source | The declaration that sets that size on the element in `selector`. |
| A size marked `— max-width 640px → 720px` | A minimum or maximum the two sides declare differently | That limit's declaration on the element in `selector`. |
| `form.form row-gap 20 → 16` | The gap between the rows of a grid, or between the lines of a row that wraps | `row-gap`, or the first value of a two-value `gap`, on the container named. |
| `span.badge offset-top -4 → 0` | The offset of a positioned element | `top`, `right`, `bottom`, `left`, or `inset` on the element named. |
| `input.input padding-left 12 → 16`, seen from the control's own words | The space between a form control's edge and its text | The control's padding. |
| `— unexplained: nothing measured accounts for it` | A size no measured property explains | Go to Rung 2 and read the layout rules of the element and its container: flex factors, grid tracks, minimum and maximum sizes. |

## Rung 2 — ask the renderer, not the source tree

Reading source misses inherited, themed, and cascaded values. Every platform can report the winning declaration and where it came from:

| Platform | Tool | What it gives you |
|---|---|---|
| Web (any browser) | DevTools Elements → Computed → property → arrow to matched rule | The winning rule with **stylesheet file and line**, plus the overridden rules below it |
| Web (scripted) | CDP `CSS.getMatchedStylesForNode` after `DOM.getDocument`/`querySelector` | Same data machine-readable: rule origin, selector, stylesheet URL, source line |
| Web + CSS variables | Read the **declared** (authored) value from the matched rule — the Styles pane or CDP's `matchedCSSRules` shows `padding: var(--x)`; computed values are useless here because `var()` is substituted at computed-value time, so `getComputedStyle` only ever returns the final literal and hides every alias hop. Then locate `--x`'s own defining declaration (DevTools lets you jump from a `var()` usage to its definition; otherwise grep `--x:`); if that declaration is `--x: var(--y)`, repeat on `--y` | The *layer* that owns the fix: variable definition = token layer; usage = component layer; an alias chain names the base token to change |
| React (web or RN) | React DevTools → select element → owner stack | Which component rendered it, and the props/styles it received — separates "component default" from "instance override" |
| React Native | in-app Element Inspector / Flipper Layout tab | Computed style with the contributing style objects; then grep the named `StyleSheet` entry |
| Flutter | DevTools Widget Inspector → select widget → **creation location** | Jumps to the exact `file:line` that constructed the widget |
| SwiftUI | Xcode View Hierarchy Debugger → select view | Type and modifier chain; grep the view name for the source |
| Compose | Android Studio Layout Inspector → select node → source jump | Composable source location and modifier values |

Sequence for any single finding: select the rendered node → read the winning declaration and its origin → decide the layer (token definition / shared component / instance) → open exactly that file.

## Rung 3 — search by value

When the renderer route is unavailable (no running surface, generated class names, third-party wrapper):

- Grep the **odd value**, not the common one. `13px` and `#e4e4e4` locate instantly; `16px` returns the whole codebase. From a finding such as `16 → 12`, search the *build* value scoped to the component's folder first, then the styling system's folder.
- Tailwind: the rendered class *is* the declaration. `p-4` → padding 16; arbitrary values (`p-[13px]`) grep verbatim; ambiguous scales resolve in `tailwind.config.*` under `theme`/`theme.extend`.
- CSS-in-JS with hashed class names: search the *property:value* pair (`padding: 16`) or enable the library's displayName/babel plugin; the component name from React DevTools narrows the file.
- Generated/utility CSS you cannot map: fall back to Rung 2's CDP matched-rules — it reports the source even for generated stylesheets.

## Deciding the layer from what you found

The finding's `ownership` is a first guess. The trace decides:

| What the trace shows | Owner | Fix location |
|---|---|---|
| Winning declaration reads a token/variable whose *definition* is wrong | token/theme | token file — expect many findings to close at once |
| Declaration hardcodes a value inside a shared component's styles | primitive/shared component | the component's style source, expressed through the token per `apply-to-platform.md` |
| Component default is right; an instance prop/class/style overrides it | composition | the call site (page/screen), not the component |
| Value exists only at this one usage and no shared abstraction owns it | page-only | local file — keep it token-backed anyway |

Two traps:

- **The override chain lies about ownership.** A page-level `!important` or a later cascade layer can win over the correct component style. The fix is to remove the override, not to change the component. The matched-rules list shows every loser — read it before editing the winner.
- **Same wrong value in many places ≠ page-only × N.** If the search returns the same hardcoded value at several call sites, that is a missing token, not several local fixes. Stop and propose the token per `apply-to-platform.md`.
