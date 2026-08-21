# Stock Card

## Purpose

Shows a text-led stock discussion/feed card with stock identity, sentiment, author metadata, and commentary copy. Use it for social/discovery feed content where commentary about one stock must be scanned as a compact 375px card.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-088 | Figma `51036:377157` | `stock-card` component set | 415x572 component set with two 375px-wide variants: `type=defualt` at 234px high and `type=bullish` at 278px high. Both use `#1E1E1E` card surface, 16px side padding, 8px top padding, 12px bottom padding, 12px vertical section gap, stock header with orange code `2330`, white stock name `TSMC`, gray `View More`, 16px chevron, 0.5px white-20 divider, sentiment/author metadata row, and 16px body copy. |

## Component Fingerprint

| Dimension | Fingerprint |
|---|---|
| Purpose / behavior | Stock-specific feed/commentary card with stock header, sentiment, author/time metadata, and body text. It is not a quote row, quote tile, popup, empty state, event row, or generic marketing card. |
| Anatomy | Card surface, stock header, optional View More action, header divider, sentiment tag, avatar, author name, timestamp, and feed body copy. |
| Variants / states | `type=defualt` with Neutral sentiment and blue `C` avatar; `type=bullish` with Bullish sentiment and violet `N` avatar. Pressed, focus-visible, loading, empty, bearish, author-overflow, and long-body expansion states are not shown. |
| Token contract summary | 375px dark feed surface, 16/8/12 padding, 12px vertical rhythm, orange stock code, white stock name/body, gray metadata/actions, white-20 divider, compact 4px-radius sentiment tag, 16px circular avatar, and 16px body text at 1.4 line height normalized to the 22px feed-body line role. |
| Layout / density | Width is fixed to the compact viewport width. Height is content-derived from body copy length; the observed 234px and 278px variant heights are not fixed component tokens. |
| Visual reference | Figma node preview `figma:vSr4NtEwPVs6wLpqCT5PtV#51036:377157`; get_screenshot captured 2026-06-15. |
| Similar components reviewed | Realtime Quote Row, Realtime Quote Tile, Event Table Row, Popup Dialog, Empty State, Global Bubble, and Broker Import Row. Decision: keep distinct because Stock Card is a feed/commentary content unit with author metadata and sentiment, not a data row, tile, modal, empty feedback view, callout, or import row. |

## Anatomy

- Card surface
- Stock header with code and name
- View More label and chevron
- Header divider
- Sentiment tag
- Avatar
- Author name
- Timestamp
- Body copy

## Variants

- `type=defualt`: Neutral sentiment tag, blue `C` avatar, author `Mr. Chu`, timestamp `3h ago`.
- `type=bullish`: Bullish sentiment tag, red-tint sentiment container, violet `N` avatar, author `Alpha Nomad`, timestamp `18 hours ago`.

The source variant name is misspelled as `defualt`; implementation APIs should expose `default` while preserving source provenance in documentation or Figma export metadata.

## States

- Default feed card: observed.
- Bullish feed card: observed.
- Pressed, hover, focus-visible, selected, bookmarked, loading, empty, collapsed, expanded, bearish, neutral-disabled, and author-overflow states: not observed and not inferred.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-stock-card-width` | `--cm-sys-size-feed-width` | Card width | All |
| `--cm-comp-stock-card-container-color` | `--cm-sys-color-feed-surface` | Card surface | All |
| `--cm-comp-stock-card-padding-x` | `--cm-sys-spacing-screen-gutter` | Side padding | All |
| `--cm-comp-stock-card-padding-top` | `--cm-sys-spacing-md` | Top padding | All |
| `--cm-comp-stock-card-padding-bottom` | `--cm-sys-spacing-l` | Bottom padding | All |
| `--cm-comp-stock-card-content-gap` | `--cm-sys-spacing-l` | Header/metadata/body vertical gap | All |
| `--cm-comp-stock-card-inline-gap` | `--cm-sys-spacing-md` | Main inline gap | All |
| `--cm-comp-stock-card-header-height` | `--cm-sys-size-feed-header-height` | Stock header row height | All |
| `--cm-comp-stock-card-header-divider-color` | `--cm-sys-color-outline-inverse` | Header bottom divider | All |
| `--cm-comp-stock-card-header-divider-width` | `--cm-sys-spacing-hairline` | Divider width, normalized from observed 0.5px | All |
| `--cm-comp-stock-card-code-color` | `--cm-sys-color-primary` | Stock code text | All |
| `--cm-comp-stock-card-name-color` | `--cm-sys-color-on-background` | Stock name text | All |
| `--cm-comp-stock-card-title-text-size` | `--cm-sys-typescale-label-xl-size` | Code/name text size | All |
| `--cm-comp-stock-card-title-line-height` | `--cm-sys-typescale-label-xl-line-height` | Code/name line height | All |
| `--cm-comp-stock-card-title-weight` | `--cm-sys-weight-medium` | Code/name text weight | All |
| `--cm-comp-stock-card-action-label-color` | `--cm-sys-color-feed-meta` | View More label | All |
| `--cm-comp-stock-card-action-icon-color` | `--cm-sys-color-on-background` | View More chevron | All |
| `--cm-comp-stock-card-action-height` | `--cm-sys-size-feed-action-height` | View More action row height | All |
| `--cm-comp-stock-card-action-icon-size` | `--cm-sys-size-feed-action-icon` | Chevron icon box | All |
| `--cm-comp-stock-card-action-gap` | `--cm-sys-spacing-xs` | Label/chevron gap | All |
| `--cm-comp-stock-card-action-text-size` | `--cm-sys-typescale-label-md-size` | View More label size | All |
| `--cm-comp-stock-card-action-line-height` | `--cm-sys-typescale-label-md-compact-line-height` | View More label line height | All |
| `--cm-comp-stock-card-action-weight` | `--cm-sys-weight-regular` | View More label weight | All |
| `--cm-comp-stock-card-meta-row-gap` | `--cm-sys-spacing-md` | Sentiment/author group gap | All |
| `--cm-comp-stock-card-meta-avatar-gap` | `--cm-sys-spacing-xs` | Avatar to author gap | All |
| `--cm-comp-stock-card-meta-text-gap` | `--cm-sys-spacing-xxs` | Author/separator/time gap | All |
| `--cm-comp-stock-card-meta-color` | `--cm-sys-color-feed-meta` | Author, separator, timestamp | All |
| `--cm-comp-stock-card-meta-text-size` | `--cm-sys-typescale-label-md-size` | Author/time text size | All |
| `--cm-comp-stock-card-meta-line-height` | `--cm-sys-typescale-label-md-compact-line-height` | Author/time line height | All |
| `--cm-comp-stock-card-meta-name-weight` | `--cm-sys-weight-medium` | Author name weight | All |
| `--cm-comp-stock-card-meta-weight` | `--cm-sys-weight-regular` | Timestamp/separator weight | All |
| `--cm-comp-stock-card-sentiment-neutral-container-color` | `--cm-sys-color-surface-raised` | Neutral sentiment tag fill | `type=defualt` |
| `--cm-comp-stock-card-sentiment-neutral-label-color` | `--cm-sys-color-on-surface-high` | Neutral sentiment label | `type=defualt` |
| `--cm-comp-stock-card-sentiment-bullish-container-color` | `--cm-sys-color-feed-sentiment-bullish-container` | Bullish sentiment tag fill | `type=bullish` |
| `--cm-comp-stock-card-sentiment-bullish-label-color` | `--cm-sys-color-on-feed-sentiment-bullish-container` | Bullish sentiment label | `type=bullish` |
| `--cm-comp-stock-card-sentiment-padding-x` | `--cm-sys-spacing-md` | Sentiment tag horizontal padding | All |
| `--cm-comp-stock-card-sentiment-padding-y` | `--cm-sys-spacing-xs` | Sentiment tag vertical padding | All |
| `--cm-comp-stock-card-sentiment-gap` | `--cm-sys-spacing-xs` | Reserved sentiment content gap | All |
| `--cm-comp-stock-card-sentiment-corner-radius` | `--cm-sys-shape-corner-xs` | Sentiment tag radius | All |
| `--cm-comp-stock-card-sentiment-text-size` | `--cm-sys-typescale-label-md-size` | Sentiment label size | All |
| `--cm-comp-stock-card-sentiment-line-height` | `--cm-sys-typescale-label-md-compact-line-height` | Sentiment label line height | All |
| `--cm-comp-stock-card-sentiment-weight` | `--cm-sys-weight-regular` | Sentiment label weight | All |
| `--cm-comp-stock-card-avatar-size` | `--cm-sys-size-feed-author-mark` | Avatar size | All |
| `--cm-comp-stock-card-avatar-default-container-color` | `--cm-sys-color-feed-author-mark-blue` | Default avatar fill | `type=defualt` |
| `--cm-comp-stock-card-avatar-bullish-container-color` | `--cm-sys-color-feed-author-mark-violet` | Bullish avatar fill | `type=bullish` |
| `--cm-comp-stock-card-avatar-label-color` | `--cm-sys-color-on-background` | Avatar initial label | All |
| `--cm-comp-stock-card-avatar-label-text-size` | `--cm-sys-typescale-metadata-xxs-size` | Avatar initial size | All |
| `--cm-comp-stock-card-avatar-label-line-height` | `--cm-sys-typescale-metadata-xxs-line-height` | Avatar initial line height | All |
| `--cm-comp-stock-card-avatar-label-weight` | `--cm-sys-weight-semibold` | Avatar initial weight | All |
| `--cm-comp-stock-card-body-color` | `--cm-sys-color-on-background` | Body copy | All |
| `--cm-comp-stock-card-body-text-size` | `--cm-sys-typescale-feed-body-size` | Body text size | All |
| `--cm-comp-stock-card-body-line-height` | `--cm-sys-typescale-feed-body-line-height` | Body line height | All |
| `--cm-comp-stock-card-body-weight` | `--cm-sys-weight-regular` | Body copy weight | All |

## Layout Rules

- Keep card width fixed at 375px.
- Use a flat `#1E1E1E` surface with no outer radius, no shadow, and no card gutter implied by the component itself.
- Use 16px side padding, 8px top padding, and 12px bottom padding.
- Header, metadata, and body sections use a 12px vertical rhythm.
- Header row is 30px high with an 8px bottom inset and a white-20 bottom divider. Treat the observed 0.5px divider as the existing hairline token for implementation.
- Keep the stock code and stock name in one 16px medium text run; code is orange and name is white.
- Keep `View More` at the trailing edge with a 4px label/chevron gap and a 16px chevron slot.
- Metadata row starts with the sentiment tag, then author info. Use an 8px gap between sentiment and author groups.
- Avatar is 16px and circular, with a centered 10px initial.
- Let card height hug body copy. Do not create fixed 234px or 278px height tokens; those heights come from the observed sample copy.

## Content Rules

- Stock identity format is `2330 TSMC`: code first, name second.
- `View More` is the only observed trailing header action copy.
- Sentiment labels observed: `Neutral` and `Bullish`.
- Author metadata observed: `Mr. Chu · 3h ago` and `Alpha Nomad · 18 hours ago`.
- Body copy is full commentary text, not price data, an event table, or a short card headline.
- Do not add price, change, chart, broker icon, promo badge, footer action, like/comment controls, or image media without new evidence.

## Accessibility Rules

- Treat the card as an article or grouped feed item when it contains commentary.
- If `View More` is interactive, expose it as a distinct link/button with an accessible name such as `View more about 2330 TSMC`.
- Avatar initials need accessible author names from the adjacent author text; do not expose initials alone as meaningful content.
- Sentiment color is not enough; expose the sentiment label text.
- Preserve source order: stock identity, action, sentiment/author/time, then body copy.

## Do / Don't

- Do use Stock Card for stock-specific social/discovery feed commentary.
- Do keep it flat, dark, text-led, and dense.
- Do preserve the sentiment tag and author metadata row.
- Don't use Stock Card as a quote row, quote tile, empty-state panel, popup dialog, broker row, event table row, or marketing card.
- Don't add charts, thumbnails, shadows, large radii, card gutters, reaction bars, or extra CTAs without future evidence.
- Don't infer bearish, selected, loading, collapsed, expanded, or bookmarked states from the two observed variants.

## Implementation Notes

Use a host-level prop such as `type="default" | "bullish"` even though the Figma source spells the default variant as `defualt`. Keep the stock code, stock name, action label, sentiment label, author, timestamp, and body copy as separate content slots so truncation and localization can be handled by the host without breaking the component contract.
