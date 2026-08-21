# Locating the Owning Declaration

The diff says *what* is wrong ("padding is 16, expected 24"). This document is the fastest mechanical route to *where* — the file and declaration that owns the value. Searching by eye is what makes each finding expensive; every platform below has a tool that answers "which rule set this" directly.

Work the ladder top-down. Each rung is cheaper and more precise than the one below it.

## Rung 1 — the finding already names the owner

Before opening any inspector:

- **`tokens` / `tokenRefs` on the finding or spec node:** a token name is half the answer. Grep the token's definition (`--sys-space-6`, `theme.space[6]`, `Spacing.lg`) to find the token file, then grep its *usages* filtered by the component name to find the assigning declaration. If the token's value is right but the rendered value is wrong, the component ignores the token — the bug is at the usage site, not the definition.
- **`implementationReference` on the finding:** `diff_spec.mjs` derives it from the spec node's `component`/`id`. Trust it first.
- **`files` on the finding:** empty on fresh `findings.candidates.json` — the script does not fill it. It is populated during the review pass, so it is only trustworthy in a reviewed `findings.json` from `ui-pixel-align-report`.
- **`component` on the spec node:** grep the component name; the style usually lives in its co-located file.

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

- Grep the **odd value**, not the common one. `13px` and `#e4e4e4` locate instantly; `16px` returns the whole codebase. From a delta like `expected 24, actual 16`, search the *actual* value scoped to the component's folder first, then the styling system's folder.
- Tailwind: the rendered class *is* the declaration. `p-4` → padding 16; arbitrary values (`p-[13px]`) grep verbatim; ambiguous scales resolve in `tailwind.config.*` under `theme`/`theme.extend`.
- CSS-in-JS with hashed class names: search the *property:value* pair (`padding: 16`) or enable the library's displayName/babel plugin; the component name from React DevTools narrows the file.
- Generated/utility CSS you cannot map: fall back to Rung 2's CDP matched-rules — it reports the source even for generated stylesheets.

## Deciding the layer from what you found

| What the trace shows | Owner | Fix location |
|---|---|---|
| Winning declaration reads a token/variable whose *definition* is wrong | token/theme | token file — expect many findings to close at once |
| Declaration hardcodes a value inside a shared component's styles | primitive/shared component | the component's style source, expressed through the token per `apply-to-platform.md` |
| Component default is right; an instance prop/class/style overrides it | composition | the call site (page/screen), not the component |
| Value exists only at this one usage and no shared abstraction owns it | page-only | local file — keep it token-backed anyway |

Two traps:

- **The override chain lies about ownership.** A page-level `!important` or a later cascade layer can win over the correct component style. The fix is to remove the override, not to change the component. The matched-rules list shows every loser — read it before editing the winner.
- **Same wrong value in many places ≠ page-only × N.** If the search returns the same hardcoded value at several call sites, that is a missing token, not several local fixes. Stop and propose the token per `apply-to-platform.md`.
