# Popup Dialog

## Purpose

Defines the centered `彈窗` dialog family for compact confirmation, notice, and media/message prompts that need one secondary action and one primary action without using bottom-sheet chrome.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-080 | Figma `5906:218640` | `彈窗` component frame | 1434x1585 frame with nine 292px-wide dialog variants: `標題+內容`, `標題+內容+圖片`, `內容+圖片空值`, `內容+圖片`, `圖片`, `圖片+標題`, `標題+圖片+內容`, `圖片+標題+內容`, and `圖片+內容`. Variables confirm `#252525` dialog surface, `#333333` media surface, `#FFFFFF` title/action text, `#D9D9D9` body copy, `#808080` empty-state text, and `#FF7800` primary action. |

## Component Fingerprint

| Dimension | Fingerprint |
|---|---|
| Purpose / behavior | Centered modal dialog for compact prompts, notices, empty-media feedback, and two-action decisions. |
| Anatomy | Dialog container, optional title, optional body copy, optional media panel, optional empty-media artwork/label, secondary action, primary action. No top close/back/drag handle is part of this component. |
| Variants / states | Nine content-order variants are observed. Primary and secondary footer actions are observed in default state only. Empty media placeholder is observed. Pressed, focus-visible, loading, destructive, single-action, and close-icon variants are not shown. |
| Token contract summary | Uses `#252525` surface, `#333333` media area, normalized `#3D3D3D` outline/art role for the observed near-neutral `#414141`, primary orange action, 292px width, 4px radii, compact 16px title, 14px body/action labels, and dense 20px/16px insets. |
| Layout / density | Dialogs are centered and 292px wide. Footer actions are two equal compact controls with secondary outline on the left and orange primary action on the right. Optional media blocks occupy the middle or top depending on variant. |
| Visual reference | Figma node preview `figma:vSr4NtEwPVs6wLpqCT5PtV#5906:218640`; get_screenshot captured 2026-06-15. |
| Similar components reviewed | Bottom Sheet, Event Filter Sheet, Portfolio Add Holding Sheet, and Bottom Sheet Footer Button. Decision: keep distinct as centered Popup Dialog because width, placement, chrome, media slot, and two-action footer differ from bottom-anchored sheet patterns. |

## Anatomy

- Dialog container
- Optional title
- Optional body copy
- Optional media panel
- Optional empty-media artwork and status label
- Footer action row
- Secondary action
- Primary action

## Variants

- `標題+內容`: text-only prompt with title, body, and two actions.
- `標題+內容+圖片`: title/body before media, then actions.
- `內容+圖片空值`: body, empty-media artwork/status, and actions.
- `內容+圖片`: body before media, then actions.
- `圖片`: media-only prompt with actions.
- `圖片+標題`: media and title with actions.
- `標題+圖片+內容`: title, media, body, and actions.
- `圖片+標題+內容`: media, title, body, and actions.
- `圖片+內容`: media, body, and actions.

## States

- Default dialog: observed.
- Empty media / waiting state: observed with gray artwork and `圖片等待中...` copy.
- Primary action default: observed as orange fill with white label.
- Secondary action default: observed as transparent/dark outline action with white label.
- Pressed, focus-visible, disabled, loading, destructive, close-dismiss, single-action, and text-overflow states: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-popup-dialog-width` | `--cm-sys-size-overlay-compact-width` | Fixed centered dialog width | All |
| `--cm-comp-popup-dialog-container-color` | `--cm-sys-color-surface` | Dialog surface | All |
| `--cm-comp-popup-dialog-media-container-color` | `--cm-sys-color-overlay-media` | Media block surface | Media variants |
| `--cm-comp-popup-dialog-title-color` | `--cm-sys-color-on-surface-strong` | Title text | Title variants |
| `--cm-comp-popup-dialog-body-color` | `--cm-sys-color-on-surface-high` | Body copy | Body variants |
| `--cm-comp-popup-dialog-empty-art-color` | `--cm-sys-color-overlay-empty-art` | Empty-media illustration strokes/fill | Empty media |
| `--cm-comp-popup-dialog-empty-label-color` | `--cm-sys-color-on-overlay-empty-art` | Empty-media status copy | Empty media |
| `--cm-comp-popup-dialog-primary-action-container-color` | `--cm-sys-color-primary` | Primary action fill | Default |
| `--cm-comp-popup-dialog-primary-action-label-color` | `--cm-sys-color-on-primary` | Primary action label | Default |
| `--cm-comp-popup-dialog-secondary-action-container-color` | `--cm-sys-color-transparent` | Secondary action fill | Default |
| `--cm-comp-popup-dialog-secondary-action-border-color` | `--cm-sys-color-control-outline` | Secondary action outline | Default |
| `--cm-comp-popup-dialog-secondary-action-label-color` | `--cm-sys-color-on-surface-strong` | Secondary action label | Default |
| `--cm-comp-popup-dialog-corner-radius` | `--cm-sys-shape-corner-xs` | Dialog radius | All |
| `--cm-comp-popup-dialog-action-corner-radius` | `--cm-sys-shape-corner-xs` | Action radius | Footer |
| `--cm-comp-popup-dialog-action-border-width` | `--cm-sys-size-control-border-width` | Secondary action outline width | Secondary |
| `--cm-comp-popup-dialog-action-width` | `--cm-sys-size-overlay-compact-action-width` | Footer action width | Footer |
| `--cm-comp-popup-dialog-action-height` | `--cm-sys-size-overlay-compact-action-height` | Footer action height | Footer |
| `--cm-comp-popup-dialog-padding-x` | `--cm-sys-spacing-xl` | Dialog side inset | All |
| `--cm-comp-popup-dialog-padding-y` | `--cm-sys-spacing-screen-gutter` | Text/footer vertical inset | All |
| `--cm-comp-popup-dialog-content-gap` | `--cm-sys-spacing-md` | Gap between text/media blocks | All |
| `--cm-comp-popup-dialog-footer-gap` | `--cm-sys-spacing-md` | Gap between footer actions | Footer |
| `--cm-comp-popup-dialog-title-text-size` | `--cm-sys-typescale-title-sm-size` | Title size | Title variants |
| `--cm-comp-popup-dialog-title-line-height` | `--cm-sys-typescale-title-sm-line-height` | Title line height | Title variants |
| `--cm-comp-popup-dialog-title-weight` | `--cm-sys-weight-medium` | Title weight | Title variants |
| `--cm-comp-popup-dialog-body-text-size` | `--cm-sys-typescale-body-sm-size` | Body copy size | Body variants |
| `--cm-comp-popup-dialog-body-line-height` | `--cm-sys-typescale-body-sm-line-height` | Body copy line height | Body variants |
| `--cm-comp-popup-dialog-body-weight` | `--cm-sys-weight-regular` | Body copy weight | Body variants |
| `--cm-comp-popup-dialog-action-label-text-size` | `--cm-sys-typescale-action-xs-size` | Action label size | Footer |
| `--cm-comp-popup-dialog-action-label-line-height` | `--cm-sys-typescale-action-xs-line-height` | Action label line height | Footer |
| `--cm-comp-popup-dialog-action-label-weight` | `--cm-sys-weight-medium` | Action label weight | Footer |

## Layout Rules

- Keep centered popup dialogs 292px wide. Do not reuse the 375px bottom-sheet width.
- Keep the dialog radius at 4px; do not use bottom-sheet top-corner radii or drag handles.
- Keep title text centered when present; body copy remains left-aligned within the content block.
- Keep footer actions as two compact controls: secondary action on the left, primary action on the right.
- Keep media panels inside the dialog body; do not crop them into full-bleed page imagery.
- Preserve each variant's observed slot order. Do not reorder title/body/media just to match a generic alert template.
- Use the empty-media artwork/status only for media-waiting states; do not reuse it as a generic empty-list illustration.

## Content Rules

- Titles should be short Traditional Chinese prompt titles.
- Body copy is compact and should not exceed the dialog width; wrap within the content column instead of widening the dialog.
- Action copy stays short; the observed labels are `一次行動` and `主行動`.
- Primary action should represent the forward/confirming action. Secondary action should be cancel, dismiss, or alternative action.

## Accessibility Rules

- Implement as `role="dialog"` with `aria-modal="true"` when blocking background interaction.
- Use the visible title as the accessible dialog title when present; otherwise provide an explicit `aria-label`.
- Footer actions must be real buttons with clear accessible names.
- If the media is informative, provide alt text. If it is decorative or placeholder-only, hide it from assistive tech and expose the status copy instead.
- Focus should move into the dialog on open and return to the triggering control on close.

## Do / Don't

- Do use Popup Dialog for centered prompt/notice/media dialogs.
- Do keep it visually separate from bottom sheets and sheet-specific headers.
- Do keep the orange primary action paired with a quiet secondary action when two actions are present.
- Don't add bottom-sheet drag handles, close/back header chrome, iOS home indicators, or 375px sheet width.
- Don't turn the dialog into a marketing card, onboarding panel, toast, or full-page empty state.
- Don't add gradients, shadows, glass, or illustration styles beyond the observed media/empty placeholder.

## Implementation Notes

The Figma source is a component frame named `彈窗` rather than a full app screen. Treat variant names as slot-order contracts. Exact text/media vertical heights should be checked against Figma during implementation, but the width, color, footer action treatment, and slot ordering are stable design-system decisions.
