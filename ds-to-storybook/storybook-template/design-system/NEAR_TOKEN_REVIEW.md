# Near Token Review Candidates

Date: 2026-05-29

Last updated: 2026-06-17

Scope: `tokens/tokens-ref.css`, with system-token usages resolved from `tokens/tokens-sys.css`.

This is a review list, not a merge decision log. Final `merge` or `keep distinct` decisions still need to be recorded in `design-system/TOKEN_ARCHITECTURE.md` under `Near Token Decisions`, or next to the token with a `token-review:` CSS comment.

## Audit Result

The strict token audit currently fails:

- Reference tokens: 314
- System tokens: 810
- Component tokens: 1956
- Remaining token review candidates: 333
- Documented review decisions for remaining candidates: 0

The bundled audit uses a strict near-color threshold of Delta E <= 3. I also reviewed an expanded visual threshold of Delta E <= 8 to catch colors that are still visibly close in product use. The darker neutral shell values were resolved on 2026-05-29 by merging into `--cm-ref-color-neutral-12`, adjacent outline neutral values were resolved by merging into `--cm-ref-color-neutral-20`, and the neutral control value was resolved by merging into `--cm-ref-color-neutral-24`. The `2.5px` / `3px`, `3.5px` / `4px`, `7px` / `7.41px`, `14px` / `14.063px`, and `16px` / `16.1px` candidates were resolved on 2026-05-29 by merging into the 3px, 4px, 7px, 14px, and 16px steps. The 2026-06-15 extraction added reviewed keep/merge decisions for Top App Bar stock-title width, Global Bubble width/shadow, Button 112px medium-icon width, Realtime Quote Tile 124px/154px/170px dimensions, Empty State 187px/266px/563px/text-shadow values, and attached Floating Action Pill 152px group/shadow values in `TOKEN_ARCHITECTURE.md`. The 2026-06-17 Trend Analysis Header extraction added reviewed decisions for the 51px selected range width, 6px range-group radius, and low selected-range shadow normalization. The 2026-06-17 Asset Trend Chart extraction added reviewed decisions for the 230px chart-body height and normalized the observed `#414141` cursor label fill into the existing neutral-24 chart tooltip container. The 2026-06-17 Stock Calendar Cell extraction normalized the observed zero-cell `#414141` fill into the same neutral-24 family through `--cm-sys-color-market-flat-container`.

## Color Candidates

### Audit-Blocking Near Colors

These are the strict `audit_tokens.mjs --strict` color failures.

| Distance | Reference tokens | Current system roles | Review note |
| --- | --- | --- | --- |
| Delta E 2.57 | `--cm-ref-color-neutral-29` `#4b4b4b` / `--cm-ref-color-neutral-32` `#515151` | `outline-high` / `outline-strong` | Adjacent outline strengths. Keep only if both contrast levels are used deliberately. |

### Expanded Visual Review Colors

These are outside the strict audit threshold, but close enough to review before the palette grows further.

| Distance | Reference tokens | Current system roles | Review note |
| --- | --- | --- | --- |
| Delta E 4.12 / 4.71 | `--cm-ref-color-warm-gray-50` `#7e7873` near `--cm-ref-color-neutral-46` `#757575` and `--cm-ref-color-neutral-50` `#808080` | `control-selected`, `action-neutral` vs dim/subtle/disabled/unclassified roles | Warm gray is visually close to neutral grays. Keep distinct only if the warmer selected/action tone is intentional. |
| Delta E 4.40 | `--cm-ref-color-yellow-94` `#fbeeb9` / `--cm-ref-color-yellow-95` `#ffeeb1` | health exception/event stock name vs temporal current/future | Very strong merge candidate: separate system roles can point to one ref yellow if no optical difference is required. |
| Delta E 4.43 | `--cm-ref-color-amber-60` `#f9a516` / `--cm-ref-color-amber-62` `#ffa902` | secondary, swing, event estimate vs allocation series 1 | Strong merge candidate unless chart series must avoid reusing secondary brand amber. |
| Delta E 6.63 | `--cm-ref-color-green-15` `#09340f` / `--cm-ref-color-green-25` `#15431b` | market-down-deep vs market-down-dim | Close but both are market-depth states. Likely keep distinct if both states appear in data UI. |
| Delta E 6.85 | `--cm-ref-color-orange-36` `#b95700` / `--cm-ref-color-orange-50` `#cc6102` | action outline-deep vs primary-pressed | Close action oranges. Could merge if pressed fill and outline stroke do not need separate contrast. |
| Delta E 7.13 | `--cm-ref-color-orange-96` `#fff1e5` / `--cm-ref-color-peach-92` `#ffe2d4` | primary-container-subtle vs valuation-slightly-high | Close pale warm fills. Keep distinct only if valuation label needs a visibly peachier fill. |
| Delta E 7.93 | `--cm-ref-color-lavender-94` `#ebebf5` / `--cm-ref-color-sky-96` `#e5f9ff` | secondary chrome text vs valuation-slightly-low | Close pale cool colors, but they serve text vs valuation-fill roles. Likely keep distinct. |

### Borderline Same-Family Colors

These are not as urgent, but are worth checking in a broader palette cleanup:

- `--cm-ref-color-red-62` `#f93951` / `--cm-ref-color-red-65` `#ff4f4f`, Delta E 8.73: `status-new` vs duplicate warning.
- `--cm-ref-color-orange-75` `#ebc09a` / `--cm-ref-color-orange-88` `#ffd7b2`, Delta E 8.17: pressed label vs primary container.
- `--cm-ref-color-amber-62` `#ffa902` / `--cm-ref-color-yellow-64` `#ffb800`, Delta E 8.96: allocation series vs promo gradient start.
- `--cm-ref-color-cyan-47` `#3196c1` / `--cm-ref-color-blue-60` `#36a9ea`, Delta E 14.04: allocation series vs portfolio/valuation blue.
- `--cm-ref-color-rose-55` `#d73152` / `--cm-ref-color-pink-60` `#ff3465`, Delta E 13.83: portfolio short-term vs allocation series.

## Number Token Candidates

The raw size reference layer contains many Figma-derived fixed dimensions, so proximity alone is not enough to merge. The most useful review should happen by semantic family.

### Highest-Priority Numeric Candidates

| Difference | Tokens | System roles | Review note |
| --- | --- | --- | --- |
| 1-3px | `--cm-ref-size-112`, `--cm-ref-size-124`, `--cm-ref-size-154`, `--cm-ref-size-170` near adjacent existing dimensions | `action-width-md-icon`, `quote-grid-unit-*` | Reviewed 2026-06-15: keep distinct. These values are stable component dimensions for the global Button and Realtime Quote Tile; decisions are recorded in `TOKEN_ARCHITECTURE.md`. |
| 1-3px | `--cm-ref-size-51` near `--cm-ref-size-50`, `--cm-ref-size-52`, and `--cm-ref-size-54` | `analysis-range-option-width-active` | Reviewed 2026-06-17: keep distinct. The 51px value is the selected `全部` range option width in Trend Analysis Header; adjacent widths belong to trade tags, analytics labels, and inactive range options. |
| 3-4px | `--cm-ref-size-230` near `--cm-ref-size-227` and `--cm-ref-size-234` | `analysis-asset-trend-height` | Reviewed 2026-06-17: keep distinct. The 230px value is the Asset Trend Chart body height; adjacent sizes belong to market-primary component-set height and callout width geometry. |
| 1-4px | `--cm-ref-size-152` near `--cm-ref-size-148`, `--cm-ref-size-154`, and `--cm-ref-size-157` | `action-group-width-md` | Reviewed 2026-06-15: keep distinct. The 152px value is the attached Floating Action Pill's two-segment watchlist group width; the nearby values belong to quote-tile internals, screenshot action buttons, and form placement. |
| 1-4px | `--cm-ref-size-187`, `--cm-ref-size-266`, `--cm-ref-size-563` near adjacent existing dimensions | `media-placeholder-lg`, `action-width-wide`, `feedback-view-height` | Reviewed 2026-06-15: keep distinct. These values are stable Empty State dimensions; decisions are recorded in `TOKEN_ARCHITECTURE.md`. |
| 0.063px | `--cm-ref-size-14` `14px` / former `14.063px` broker import action label primitive | `status-new-size` / `action-xs-size` | Resolved 2026-05-29: merged into `--cm-ref-size-14`; the former 14.063px reference token was removed. |
| 0.1px | `--cm-ref-size-16` `16px` / former `16.1px` broker icon label primitive | many 16px labels/icons / `broker-icon-label-size` | Resolved 2026-05-29: merged into `--cm-ref-size-16`; the former 16.1px reference token was removed. |
| 0.5px | `--cm-ref-size-2` / `--cm-ref-size-3` / `--cm-ref-size-4` | spacing micro-scale and raw drawing offsets | Resolved 2026-05-29: the former 2.5px value-field inset primitive merged into `--cm-ref-size-3`, and the unused former 3.5px primitive merged into `--cm-ref-size-4`; continue reviewing whether 2px, 3px, and 4px all need to remain distinct. |
| 0.41px / 0.59px | `--cm-ref-size-7` `7px` / former `7.41px` analytics pointer primitive / `--cm-ref-size-8` `8px` | icon-label gap, analytics pointer, md spacing | Resolved 2026-05-29: the former 7.41px pointer width merged into `--cm-ref-size-7`; continue reviewing whether 7px and 8px should remain distinct. |
| 1px | `--cm-ref-radius-4` `4px` / `--cm-ref-radius-5` `5px` | `corner-xs` / `corner-sm` | Strong shape cleanup candidate. Keep 5px only if a component visibly requires it. |
| 1-2px | `--cm-ref-radius-6` `6px` near `--cm-ref-radius-5` `5px` and `--cm-ref-radius-8` `8px` | `corner-sm-plus` | Reviewed 2026-06-17: keep distinct. The 6px value is the outer range-group radius in Trend Analysis Header, separate from 4px inner options, 5px dropdown triggers, and 8px panels/cells. |
| 2px | `--cm-ref-radius-12` / `14px` / `16px` | `corner-lg`, `corner-label`, `corner-top-xl` | Review whether `14px` label radius is needed, or whether labels can use 12/16/full. |
| 2px blur / 3% alpha | Trend Analysis Header selected shadow `0 2px 2px rgba(0, 0, 0, 0.15)` / `--cm-ref-shadow-0-2-4-black-alpha-12` | `control-selected-low` / `surface-low` | Reviewed 2026-06-17: merge into existing low surface shadow. No new ref shadow token was added. |
| 2px blur | `--cm-ref-shadow-0-4-2-black-alpha-25` / `--cm-ref-shadow-0-4-4-black-alpha-25` | `action-overlay-low` / `text-low` | Reviewed 2026-06-15: keep distinct. The 0/4/2 shadow belongs to attached floating overlay controls, while the 0/4/4 shadow is text-only on Empty State copy. |
| 3px blur | `--cm-ref-shadow-4-0-2-black-alpha-25` / `--cm-ref-shadow-4-0-5-black-alpha-25` | sticky edge / sticky edge strong | Same offset/color, only blur differs. Keep if weak/strong sticky edge states are real. |

### Typography Scale

Likely review candidates:

- `10px`, `11px`, `12px`, `13px`, `14px`, `15px`, `16px` form a dense compact type scale.
- `14px` vs `14.063px` was resolved on 2026-05-29 by merging broker import row action labels into the 14px type step.
- `16px` vs `16.1px` was resolved on 2026-05-29 by merging broker icon labels into the 16px type step.
- Line-height tokens form a regular `12/14/16/18/20/22/24/26px` ladder; this is close by design and should probably be kept as a scale.

### Spacing Scale

Close spacing values currently in system roles:

- `1px`, `2px`, `3px`, `4px`
- `4px`, `5px`, `6px`, `7px`, `8px`
- `10px`, `11px`, `12px`, `13px`
- `16px`, `17px`

Review priority:

- Keep `1px` and `2px` because they map to hairline and strong border.
- Review `3px` against nearby 2px and 4px roles; the former 2.5px and 3.5px primitives were merged into 3px and 4px.
- Review `5px`, `7px`, `11px`, `13px`, and `17px`; these create one-pixel spacing variants between common 4/6/8/10/12/16 steps.

### Icons And Controls

Notable close system-size groups:

- `--cm-sys-size-icon-xxs` `15px` / `--cm-sys-size-icon-xs` `16px`
- `--cm-sys-size-icon-md` `27px` / `--cm-sys-size-icon-compact-lg` `28px`
- `--cm-sys-size-control-height-xs` `28px` / `portfolio-manual-import-value-height` `29px` / `control-height-sm` `30px`
- `--cm-sys-size-region-status-height` `44px` / `--cm-sys-size-region-header-height` `46px`
- Broker import header heights `37px` / `38px`
- Bottom-sheet row heights `58px`, `59px`, `62px`, `64px`, `65px`
- Event table row heights `64px`, `66px`, `68px`

Many of these are component dimensions from Figma component sets. They should only be merged after checking whether the component set uses separate frames to encode variants.

### Large Fixed Dimensions

The audit flags many large fixed dimensions that differ by 1-4px, such as:

- `374px`, `375px`, `376px`
- `415px`, `416px`
- `520px`, `521px`
- `556px`, `557px`
- `563px`
- `602px`, `605px`

These are likely source-frame or component-set dimensions. They are near tokens numerically, but lower priority for merge unless the design system wants to separate layout reference tokens from source-capture dimensions.

## Recommended Decision Pass

Recommended first pass:

1. Decide whether the remaining dense neutral outline steps should be preserved or reduced.
2. Merge or keep `yellow-94/yellow-95` and `amber-60/amber-62`.
3. Tiny typography deltas are resolved: `14/14.063` merged into `14`, and `16/16.1` merged into `16`.
4. Decide whether the remaining micro-spacing values `3` and `17` should survive as ref tokens. The former `2.5`, `3.5`, and `7.41` values have been merged into nearby integer steps.
5. Decide whether `radius-5` and `radius-14` are real shape tokens or component artifacts.
