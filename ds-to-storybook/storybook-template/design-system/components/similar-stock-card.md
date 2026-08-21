# Similar Stock Card

## Purpose

Defines the compact similar-stock result card used to compare one stock against the current stock context. The component combines stock identity, live market movement, a similarity score chip, an add-to-watchlist action, and a three-section feature summary.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-094 | Figma `51090:288762` | `相似股` | 356x293 result card with `#333333` root surface, 12px padding, 4px radius, left stock summary, orange `相似度 92%` chip, top-right `加入自選` action, and a 230px feature panel on `#252525`. |

## Component Fingerprint

| Dimension | Fingerprint |
|---|---|
| Purpose / behavior | Information-display result card with one secondary inline action (`加入自選`) and one similarity score marker. |
| Anatomy | Root card, stock identity, price/change lockup, direction marker, similarity chip, add-to-watchlist action, feature panel, feature section title, divider, feature body text. |
| Variants / states | Default up-market result observed. Down/flat market, already-added, pressed/focus-visible, disabled, loading, empty-feature, long-feature overflow, and alternate similarity scores are not observed. |
| Token contract summary | Raised root surface, dark feature panel, market-up price/change color, primary orange action/chip, warm feature titles, 13px feature text, 18px identity/price text, 14px action/chip text, 356x293 root geometry. |
| Layout / density | 12px root padding, 332px content width, 102px left summary column, 230px feature panel, 212px panel content width, 10px panel section gap, 4px inline and section title/body gaps. |
| Visual reference | Figma node preview `figma:vSr4NtEwPVs6wLpqCT5PtV#51090:288762`; get_screenshot captured 2026-06-17. |
| Similar components reviewed | Similar Stock Button, Stock Card, Realtime Quote Row, Portfolio Fit Stock Sheet. Developer decision: keep distinct. |

## Anatomy

- Root result card
- Stock name and code
- Price value
- Direction marker and change value
- Add-to-watchlist action with add-stock icon
- Similarity score chip
- Feature panel
- Feature section title
- Section divider
- Feature body copy

## Variants

- Default similar-stock result: observed with `聯電 2303`, red up-market price/change, `相似度 92%`, and three feature sections.
- Down-market, flat-market, already-added, unavailable quote, no-feature, and compact/expanded variants: not observed.

## States

- Default: observed.
- Add-to-watchlist pressed, focus-visible, disabled, already-added, and loading states: not observed.
- Card pressed/selected/hover state: not observed; treat the card as display-first unless a host flow makes it interactive.
- Similarity chip is an information marker, not a selectable chip in this source.
- Feature panel loading, empty, collapsed, expanded, and overflow states: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-similar-stock-card-width` | `--cm-sys-size-similar-stock-result-width` | Root width | Default |
| `--cm-comp-similar-stock-card-height` | `--cm-sys-size-similar-stock-result-height` | Root height | Default |
| `--cm-comp-similar-stock-card-content-width` | `--cm-sys-size-similar-stock-result-content-width` | Inner content width after padding | Default |
| `--cm-comp-similar-stock-card-container-color` | `--cm-sys-color-surface-raised` | Root card fill | Default |
| `--cm-comp-similar-stock-card-panel-color` | `--cm-sys-color-surface` | Feature panel fill | Default |
| `--cm-comp-similar-stock-card-padding` | `--cm-sys-spacing-l` | Root padding | Default |
| `--cm-comp-similar-stock-card-corner-radius` | `--cm-sys-shape-corner-xs` | Root and panel radius | Default |
| `--cm-comp-similar-stock-card-section-gap` | `--cm-sys-spacing-m` | Feature panel section gap | Default |
| `--cm-comp-similar-stock-card-inline-gap` | `--cm-sys-spacing-xs` | Identity, price, change, and chip inline gap | Default |
| `--cm-comp-similar-stock-card-summary-width` | `--cm-sys-size-similar-stock-result-summary-width` | Left summary column width | Default |
| `--cm-comp-similar-stock-card-feature-panel-width` | `--cm-sys-size-similar-stock-result-feature-width` | Feature panel width | Default |
| `--cm-comp-similar-stock-card-feature-panel-content-width` | `--cm-sys-size-similar-stock-result-feature-content-width` | Feature text/divider width | Default |
| `--cm-comp-similar-stock-card-feature-panel-padding-x` | `--cm-sys-spacing-m` | Feature panel horizontal padding | Default |
| `--cm-comp-similar-stock-card-feature-panel-padding-y` | `--cm-sys-spacing-md` | Feature panel vertical padding | Default |
| `--cm-comp-similar-stock-card-feature-section-gap` | `--cm-sys-spacing-xs` | Title/divider/body gap | Default |
| `--cm-comp-similar-stock-card-divider-color` | `--cm-sys-color-outline-subtle` | Feature section divider | Default |
| `--cm-comp-similar-stock-card-divider-width` | `--cm-sys-spacing-hairline` | Divider stroke width | Default |
| `--cm-comp-similar-stock-card-stock-name-color` | `--cm-sys-color-on-surface-strong` | Stock name text | Default |
| `--cm-comp-similar-stock-card-stock-code-color` | `--cm-sys-color-on-surface-muted` | Stock code text | Default |
| `--cm-comp-similar-stock-card-price-color` | `--cm-sys-color-market-up` | Observed price color | Up-market |
| `--cm-comp-similar-stock-card-change-color` | `--cm-sys-color-market-up` | Observed marker/change color | Up-market |
| `--cm-comp-similar-stock-card-feature-title-color` | `--cm-sys-color-highlight-warm` | Feature section title color | Default |
| `--cm-comp-similar-stock-card-feature-body-color` | `--cm-sys-color-on-surface-strong` | Feature body text | Default |
| `--cm-comp-similar-stock-card-watchlist-action-color` | `--cm-sys-color-primary` | Add-to-watchlist icon and label | Default |
| `--cm-comp-similar-stock-card-similarity-container-color` | `--cm-sys-color-primary` | Similarity chip fill | Default |
| `--cm-comp-similar-stock-card-similarity-label-color` | `--cm-sys-color-on-primary` | Similarity chip text | Default |
| `--cm-comp-similar-stock-card-stock-name-text-size` | `--cm-sys-typescale-title-md-size` | Stock name size | Default |
| `--cm-comp-similar-stock-card-stock-name-line-height` | `--cm-sys-typescale-title-md-line-height` | Stock name line height | Default |
| `--cm-comp-similar-stock-card-stock-name-weight` | `--cm-sys-weight-regular` | Stock name weight | Default |
| `--cm-comp-similar-stock-card-stock-code-text-size` | `--cm-sys-typescale-label-md-size` | Stock code size | Default |
| `--cm-comp-similar-stock-card-price-text-size` | `--cm-sys-typescale-numeric-lg-size` | Price size | Default |
| `--cm-comp-similar-stock-card-price-line-height` | `--cm-sys-typescale-numeric-lg-line-height` | Price line height | Default |
| `--cm-comp-similar-stock-card-price-weight` | `--cm-sys-weight-medium` | Price weight | Default |
| `--cm-comp-similar-stock-card-change-text-size` | `--cm-sys-typescale-label-md-size` | Change value size | Default |
| `--cm-comp-similar-stock-card-feature-title-text-size` | `--cm-sys-typescale-label-sm-size` | Feature title size | Default |
| `--cm-comp-similar-stock-card-feature-title-weight` | `--cm-sys-weight-medium` | Feature title weight | Default |
| `--cm-comp-similar-stock-card-feature-body-text-size` | `--cm-sys-typescale-label-sm-size` | Feature body size | Default |
| `--cm-comp-similar-stock-card-action-icon-frame-width` | `--cm-sys-size-similar-stock-result-action-icon-frame-width` | Add-stock icon frame width | Default |
| `--cm-comp-similar-stock-card-action-icon-size` | `--cm-sys-size-icon-compact-action` | Add-stock icon size | Default |
| `--cm-comp-similar-stock-card-action-label-text-size` | `--cm-sys-typescale-label-md-size` | Add action label size | Default |
| `--cm-comp-similar-stock-card-action-label-line-height` | `--cm-sys-typescale-title-md-line-height` | Add action label line height | Default |
| `--cm-comp-similar-stock-card-similarity-padding-x` | `--cm-sys-spacing-md` | Similarity chip horizontal padding | Default |
| `--cm-comp-similar-stock-card-similarity-padding-y` | `--cm-sys-spacing-xxs` | Similarity chip vertical padding | Default |
| `--cm-comp-similar-stock-card-similarity-gap` | `--cm-sys-spacing-xs` | Similarity label/value gap | Default |
| `--cm-comp-similar-stock-card-similarity-corner-radius` | `--cm-sys-shape-corner-xs` | Similarity chip radius | Default |
| `--cm-comp-similar-stock-card-similarity-text-size` | `--cm-sys-typescale-label-md-size` | Similarity chip text size | Default |
| `--cm-comp-similar-stock-card-similarity-weight` | `--cm-sys-weight-medium` | Similarity chip text weight | Default |
| `--cm-comp-similar-stock-card-change-width` | `--cm-sys-size-similar-stock-result-change-width` | Change lockup width | Default |
| `--cm-comp-similar-stock-card-trend-marker-width` | `--cm-sys-size-similar-stock-result-trend-marker-width` | Direction marker width | Default |
| `--cm-comp-similar-stock-card-trend-marker-height` | `--cm-sys-size-similar-stock-result-trend-marker-height` | Direction marker height | Default |

## Layout Rules

- Keep the root card at the observed 356x293 geometry unless a host layout explicitly defines a responsive variant.
- Keep 12px root padding and a 4px radius on the root and feature panel.
- Keep the left summary column visually constrained to the 102px area before the 230px feature panel.
- Keep the feature panel 230px wide with 10px horizontal padding, 8px vertical padding, and a 212px content width.
- Stack the feature sections vertically with a 10px section gap and 4px title/divider/body gap.
- Keep section dividers full panel-content width; do not add card-like separators around each section.
- Keep the add-to-watchlist action top-right with a 22px add-stock icon in a 27px frame and a 14px orange label.
- Keep the similarity chip near the left summary, 8x2 padding, 4px radius, and two text slots (`相似度` plus percent).
- Let feature body text wrap within 212px; do not truncate the observed comma-separated feature list by default.

## Content Rules

- Use real stock name and code text, not a rasterized title.
- Price/change should follow Taiwan market color semantics. The only observed state is up-market red.
- Feature sections observed are `概念題材`, `公司特徵`, and `市場動態`.
- Feature body copy is comma-separated natural-language labels, not standalone chips.
- `加入自選` is an action label, but its added/already-added wording is not evidenced.
- Similarity score is displayed as label plus percent, for example `相似度 92%`.

## Accessibility Rules

- Expose the card as a grouped result or list item when used in a result list.
- Expose stock name, stock code, price, change, similarity score, and feature summaries as readable text.
- The add-to-watchlist control needs an accessible name matching `加入自選` plus stock identity when multiple cards are present.
- The direction marker icon is decorative when the change value and market direction are expressed in text.
- Preserve logical reading order: identity, price/change, similarity, add action, then feature sections.
- If the whole card becomes clickable in a future host flow, keep the add-to-watchlist action as a distinct nested control with a separate accessible name.

## Do / Don't

- Do use this for compact similar-stock result comparison cards.
- Do keep it distinct from the neutral Similar Stock Button; that button only navigates to a similar-stock list.
- Do keep feature content text-led inside one dark panel.
- Don't convert the feature labels into colorful chips, tags, progress bars, or badges without new evidence.
- Don't reuse Stock Card feed/commentary anatomy; this component has no author metadata, sentiment tag, avatar, or body post.
- Don't use Realtime Quote Row or Realtime Quote Tile as a replacement; this result card owns a feature-summary panel and similarity score.
- Don't recolor `加入自選` as a filled primary button unless a future state shows that treatment.

## Implementation Notes

The source is a single default result card, but its anatomy is reusable for similar-stock discovery lists. Keep the implementation data-driven: feature sections should accept titled string arrays or joined text, while price/change formatting should be supplied by the host market-data layer.
