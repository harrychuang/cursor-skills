# Reading a Cycle's Results

A cycle is one run of `node scripts/parity.mjs …`. This document turns what it printed and wrote into the next action. What makes a finding drift, an adaptation, or untrusted is in `parity-policy.md`; the fix order and the stop rule are in `SKILL.md`.

## What a cycle writes

Everything goes into the `--out` folder; give every cycle a new one. The pixel files exist only when `--reference-image` was given.

| File | Contents |
|---|---|
| `parity.json` | The result: `verdict`, `scores`, `parity` (what was compared, how, and what was left out), `findings`, `pixels`, `regions`, `cycle` (which cycle this is, counted through `--previous`), and `progress` when `--previous` was given |
| `implementation.spec.json`, `implementation.png` | The implementation as captured this cycle (format: `ui-spec.md`) |
| `pixel-diff.png`, `pixel-diff.json` | The overlay (the implementation faded to grey, differing pixels in magenta, pixels excused as edge blending in amber, a blue outline around each region) and the pixel check's own report |
| `regions/R01.png` … | One enlarged crop per region, for the 12 largest |

## What a cycle prints

```
NOT AT PARITY
  appearance  91.8%   primitives that look the same
  geometry    32.7%   primitives exactly where the reference has them
  pixels     79.73%   of the picture identical · 2 differing region(s), 1 with no measured explanation
  paired 49/49 primitives · 8 to fix · 1 consequences · 0 leave-alone · 0 untrusted

PV-001  fix  section.balance-card padding-top 24 → 16  [main.content > section.balance-card]
             seen as: "Total balance": top inset 24px → 16px (-8), measured to the top edge of section.balance-card
             token:  --space-6
PV-004  fix  button.btn.btn-primary: hover background #4338ca → #3730a3  [div.actions > button.btn.btn-primary]
PV-005  fix  "Spotify": text colour #111827 → #374151  ×3  [div.tx-text > p.tx-title]
             token:  --color-text
PV-006  fix  "-$9.99": top inset 22px → 12px (-10), measured to the top edge of li.tx-row — centred vertically in the reference, not in the implementation  ×2  [li.tx-row > p.tx-amount]
             build:  li.tx-row padding-top 12
PV-008  fix  input.input: height 44px → 40px (-4) — set explicitly  [label.field > input.input]
PV-009   ↳   section.balance-card: height 146px → 130px (-16)  [main.content > section.balance-card]

unexplained regions — open each crop under parity/cycle-01, say what differs, then fix or record it:
R02    16×16   at (360, 8)     744 px  on span.badge  → regions/R02.png
```

PV-002, PV-003, and PV-007 are left out of this sample: the same padding seen on two more sides of the card, and the same alignment finding on another row.

The sections always come in this order: the **verdict**; the **three scores**, one line per check that ran; the **counts** of primitives paired and of findings by action; a **`left out`** line for each kind of thing kept out of the comparison; a **`not checked:`** line when a check did not run; **warnings**, each starting with `⚠`; **progress** lines when `--previous` was given; the **finding list**; the **unexplained regions**; and last a line naming the regions that lie on leave-alone differences. The list prints causes first, then consequences, leave-alone, and untrusted, each from the top of the surface down. It stops at 40 findings (`--limit`); `parity.json` holds them all.

## Verdict and exit code

| First line | Exit code | Meaning |
|---|---|---|
| `PARITY ✓` | 0 | Every check passed: nothing to fix, nothing untrusted, every reference primitive paired, geometry at 100%, no differing region other than those on leave-alone differences, and pictures of the same size. |
| `PARITY ✓ for appearance and geometry only` | 0 | The same, for the checks named. A `not checked:` line says which check did not run. Claim parity for the named checks only. |
| `NOT AT PARITY` | 1 | Compared, and something remains. |
| `PARTIAL — appearance only; this comparison cannot establish parity` | 1 | The reference spec has no rectangles (a hand-written spec). Nodes were paired by id, name, and text and only their looks compared. Lines saying a primitive `exists only in the implementation` then mean the reference does not list it. |
| an error message | 2 | The cycle could not run: a missing argument, no browser found (set `CHROME_PATH`), a page that could not be loaded (`Cannot load <url>: …`, with the network error or the server's status), a `--root` selector that matches nothing, a state or theme name the browser does not know, an unreadable file, a spec whose nodes do not form a tree. |

A check is not run when it cannot decide anything: **pixels** without `--reference-image` or across form factors, **geometry** across form factors or with a spec that has no rectangles, **appearance** with a geometry-only reference.

## The three scores

| Score | What it measures |
|---|---|
| appearance | The share of paired primitives with no appearance drift. An adaptation or a satisfied accessibility remap does not lower it; a required adaptation that was not made does. |
| geometry | The share of paired primitives exactly where the reference has them: x, y, width, and height all within tolerance, measured from the surface's top-left corner. |
| pixels | The share of the picture that is identical once edge blending is excused, then the number of differing regions and how many of them nothing measured explains. |

Geometry counts positions, not mistakes. One wrong padding near the top moves everything below it: above, the card's padding alone puts two thirds of the surface out of place. Work from the causes and expect the score to jump when one is fixed.

Warnings to act on before reading further:

- `⚠ fonts: the implementation asked for a font that was not rendered — text metrics are untrusted until it is installed or loaded and that side is captured again`. The line names the side: `the reference`, `the implementation`, or both. See the font rules in `parity-policy.md`.
- `⚠ the surface kept changing between screenshots — something is still animating`. The picture is not repeatable, so this cycle's regions are not reliable. Settle the surface (`measure.md`) and run again.
- `⚠ picture size differs: reference 390×844, implementation 390×900 CSS px`. Only the overlapping area was compared, and the result cannot be parity. Look for a size finding on the root, or a capture that used another viewport or root.
- `⚠ this is cycle 9; the loop allows 8 — stop and report what remains`. The cycle cap (`loop.maxCycles`) is passed. Stop and adjudicate.

Two lines are not warnings but must be carried into the final report, because they say what the verdict does not cover:

- `left out as OS chrome or platform-only: Status Bar, div.cookie-banner`. Nodes dropped from the comparison by the policy (`parity.skipped`; rules in `parity-policy.md`).
- `left out on request: 1 area(s), and everything in them`. Areas passed with `--ignore` (`parity.ignoredAreas`).

## Findings

A finding line reads: id, action, what differs, `×N`, `[where]`, then indented detail lines.

| Tag | `action` | It is | Do |
|---|---|---|---|
| `fix` | `fix` | A cause | Fix it. Find the declaration with `locate-owner.md`. |
| `↳` | `follows` | A consequence of a cause | Never edit for it. |
| `leave` | `leave` | An adaptation or a satisfied remap | Do not touch. |
| `?` | `untrusted` | An unreliable measurement | Restore the measurement, not the code. |

**A spacing finding** comes in two forms. When both specs come from the same kind of source and both declare the distance, the first line is the part that differs (`differs`), as in PV-001 above. Read it as: element, property, design value → build value. `0 → 3` is a part only the build has. The bracket is where that part lives, the element to edit. `seen as:` is the redline that revealed it: an inset is measured to the frame's edge, a gap to the neighbour named. `token:` is the token the source wrote that property with. One declaration can surface as several findings, one per side: `padding: 16px` above is PV-001, PV-002, and PV-003.

Across tools, or when only one side declares the distance, there is no `differs`. The first line is the redline itself, the bracket is the element it was seen from, and the parts are listed for each side that declares them:

```
PV-002  fix  "Total balance": left inset 24px → 16px (-8), measured to the left edge of section.balance-card  [section.balance-card > p.label]
             same change seen on: "Total balance", "$12,480.50", span.chip
             design: section.balance-card padding-left 24
             build:  section.balance-card padding-left 16
```

Compare `design:` (`designedAs`) with `build:` (`builtFrom`); the part that differs is the fix. Names on the `design:` line are the reference capture's own, layer names for a Figma frame. A missing line means that side does not declare the distance: it is leftover space, centring, or an offset. `same change seen on:` lists the primitives in the same frame whose inset changed by the same amount (`witnesses`); it is one cause.

| Marker | Meaning |
|---|---|
| `×3` | The same difference on three instances of a repeated element (`instances`). One fix, in the shared declaration. |
| `— set explicitly` | On a size finding: the box's width or height is fixed in the source of either side (a CSS length, a fixed size in Figma). It is a cause; set it. A box size without the marker follows its content or container and usually prints as `↳`. |
| `— max-width 640px → 720px` | On a size finding: a minimum or maximum that the two sides declare differently (`min-width`, `max-width`, `min-height`, `max-height`; on text, the limit of the element that holds it). That limit is the cause; set it. Reported between two captures of the same platform. |
| `— centred vertically in the reference, not in the implementation` | Or `horizontally`. The reference has equal space on both sides and the build does not. With no `design:` line under it, that space is leftover and the fix is an alignment, not a padding. With a `design:` line the distance is declared and the equal space may be a coincidence; compare the parts. |
| `(not visible in this capture)` | No differing pixel falls on the element (`visible: false`): a hover state, something covered, or an authored colour copied where a remap is recorded. It is still a finding. |
| `should truncate with … but does not (2 lines, reference has 1)` | Text that the reference cuts short wraps in the build, or the other way round: `is truncated; the reference shows it in full`. One finding; the line count is part of it. |
| `— unexplained: nothing measured accounts for it` | Every finding looked like a consequence of another, so the largest change on that axis was promoted to a cause. Start there; the reason is something no property records, such as a flex factor or a size constraint. |

**Presence findings** say `text has no counterpart in the implementation — missing, or drawn another way (the pixel check decides)` or `box exists only in the implementation — extra, or drawn another way (the pixel check decides)`. A missing primitive leaves an unexplained region where the reference draws it; no region there means it is drawn another way. One other way is recognised and never reported: a divider that is a thin element of its own on one side and the border of the row it runs along on the other is compared as that border, by width and colour. When the same element is reported both ways, the pairing missed it: pair it yourself with `--map <file>`, a JSON array of pairs, `[["<reference node id>", "<the element's data-node-id, data-testid, or DOM id>"], …]`.

Fields of a finding in `parity.json`:

| Field | Meaning |
|---|---|
| `id` | `PV-001` onwards, in list order. The same difference can carry another id in the next cycle. |
| `gate`, `specField` | The check that raised it (`appearance`, `geometry`, or `presence`) and what differs: `fill`, `border.bottom.color`, `type.lineHeight`, `states.hover.background`, `pseudo.after.background`, `size.width`, `spacing.top`, `position.x`, `touchTarget`, `presence`, … |
| `intent`, `parityClass`, `severity` | The classification (`parity-policy.md`). |
| `action`, `derived` | `fix`, `follows`, `leave`, or `untrusted`; `derived` is `true` on a consequence. |
| `block` | The primitive as the list names it: its text in quotes, or the last part of its selector. |
| `selector` | The implementation element. On a spacing finding, the element the distance was seen from. |
| `expected`, `actual`, `delta` | The reference value, the implementation value, and the sentence the list prints. |
| `differs`, `differsAt` | Spacing: the parts that differ, as text and as `{ text, selector, design, build }` with the element each part lives on. |
| `designedAs`, `builtFrom` | Spacing: the declared parts that add up to the distance on each side. |
| `instances`, `witnesses` | The primitives that share the finding, when more than one; the primitives in one frame that saw the same inset change. |
| `visible` | Appearance, when the pixel check ran: whether the difference shows in this capture. |
| `tokens`, `ownership` | Token names behind the value, when the capture recorded one; a first guess at the layer (`token/theme`, `primitive/shared component`, `composition`, `unclassified`). |
| `recommendedFix` | One sentence on what to change. Without `differs`, a spacing finding's sentence names the target distance and what each side makes it from; the part to change is the one the two lists disagree on. |
| `status`, `notes` | `open` and the script's own remarks (font mismatch, cross form factor, remap record). Adjudication sets both. |

## Consequences

A consequence (`↳`) is a difference that exists only because a cause does: a card that is shorter because its padding is smaller, a column that is wider because the sidebar is narrower. They are listed so you can see how far one cause reaches and what will move when it is fixed. One declaration can produce many: a sidebar built 8 px too narrow printed one cause, `aside.side: width 240px → 232px (-8) — set explicitly`, and 19 consequences, from `a.on: width 207px → 199px (-8)` inside it to every card, table column, and form field beside it.

What the script reads as a consequence:

- A text block's width or height, when its font, size, weight, spacing, line height, line count, or truncation is itself a finding.
- A line height or letter spacing that kept its proportion to a font size that changed (`1.5`, `0.06em`): it follows the size.
- The size of a box with no explicit size and no differing limit, when something inside it, its container, a neighbour, or its own border changed.
- A distance that is leftover space in the reference, when something beside it changed size.
- A distance the build declares exactly as the reference does and that still differs: the spacing is right, and what it is measured to has changed.
- The distances a border shifts, when that border's width is itself a finding.
- A distance built from a part that another finding already names as wrong.
- An element pinned at the same offset on both sides: it moved because the block it is pinned to did.

When every finding on an axis reads as a consequence, the largest is promoted to a cause and marked `— unexplained`.

Never edit code for a consequence: the edit fights the real fix and breaks once the cause is corrected. Fix the causes and run the cycle again; consequences are measured afresh and are gone when their cause is. The split is a judgement by the script, so a line marked `fix` can also disappear when a neighbouring cause is fixed. That is why one layer is fixed and measured at a time.

## Regions

A region is a patch of the picture where the two captures differ, reported with its size, its top-left corner in CSS px, its differing pixel count, and its owner: the smallest implementation primitive that contains it, or failing that the one around its centre or the nearest. The owner says where to look, not what is wrong.

A region is **explained** when it falls on an element that has a finding to fix, a consequence, or an untrusted finding, on a primitive that is not where the reference has it, or on the place such a primitive occupies in the reference. It closes with those findings.

A region that falls only on a leave-alone difference (an adaptation, a satisfied remap) is what that difference looks like. It is marked `sanctioned` in `regions`, counted on the pixels line (`1 on leave-alone differences`), named on the last line of the output, and does not keep the verdict from parity.

Every other region is **unexplained**: the picture differs and nothing measured says why.

For every unexplained region:

1. Open its crop. Three panels, left to right: reference, implementation, difference.
2. Say in words what differs. For R02 above: the count badge on the avatar is gone. Every property of it matches the reference; it is drawn underneath the bar, which no property records.
3. Trace the owning declaration from the owner's selector (`locate-owner.md`).
4. Fix it, or record why it stays (Adjudication below).

An unexplained region is never dismissed without a recorded reason. A region line with no `→ regions/…` path is not among the 12 largest and has no crop: find it in `pixel-diff.png` at the position printed, or fix the larger ones and run again. Any region, explained or not, keeps the verdict from parity; only those on leave-alone differences do not.

## Progress between cycles

With `--previous <the last cycle's folder>` the cycle compares itself with that cycle's `parity.json`:

```
  since the previous cycle: to fix + unexplained 2 → 4  ⚠ no progress — stop and report what blocks the rest
  ⚠ worse than the previous cycle: geometry 100% → 57.1% — revert the last edit
  ⚠ worse than the previous cycle: pixels 99.77% → 83.85% — revert the last edit
  ⚠ new since the previous cycle: PV-002 "Spotify": top inset 12px → 22px (+10), measured to the top edge of li.tx-row
```

| Line | Meaning | What it demands |
|---|---|---|
| `since the previous cycle: to fix + unexplained 9 → 4` | Causes plus unexplained regions, before and now. | Keep going while it falls. When it does not, the line ends `⚠ no progress — stop and report what blocks the rest`: stop and adjudicate. |
| `⚠ worse than the previous cycle: …` | A score dropped. | Revert the last edit, even when the count fell. Then point `--previous` at the last cycle you kept. |
| `⚠ new since the previous cycle: …` | A cause the previous cycle did not have. Five are printed; all are in `progress.appeared`. | Look at what the last edit caused, and revert it if it was the edit. |

## Adjudication

When the loop ends without parity, every remaining cause and every unexplained region gets exactly one status, with a reason.

| Status | Use it when | `status` | The reason in `notes` |
|---|---|---|---|
| Adaptation | The platform or form factor justifies the difference. | `accepted` | Which adaptation, and where the design system names it. |
| Sanctioned accessibility remap | The difference is a recorded remap. | `accepted` | The remap record. |
| Untrusted because of the font environment | The fonts could not be aligned in this environment. | `open` | The font that is missing and what is needed to load it. |
| Blocked by a missing token or a design-system decision | The fix needs a token that does not exist, or a decision that is not yours. | `open` | The token you propose, or the question and who decides. |
| Accepted by the user | The user decided to leave it. | `accepted` | Who accepted it and why. |

Record it in the last cycle's `parity.json`: set `status` on the finding and add the reason to its `notes`. A region has neither field, so add both to its entry in `regions`. Leave-alone findings and the regions on them need no status: the cycle has already classified them. Each cycle writes a fresh file, so adjudicate once, at the end. The final report lists every item with its status and reason (`SKILL.md`).
