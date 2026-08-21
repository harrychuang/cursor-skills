# Bottom Sheet Header

## Purpose

Provides reusable top chrome for bottom sheets, including close-only, back/title/close, title-only, title/close, and drag-handle variants.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-063 | Figma `16405:224712` | `bottom sheet_上方的關閉與返回` | 415x520 component set with four 375x64 header variants and two 375x20 drag-handle variants. Header surface is `#252525`, top corners are 12px, title text is `#C0C0C0` at 18px, close icon is 16px, back icon is 18px, and drag handle is 68x4. |

## Anatomy

- Header container
- Optional back icon
- Optional centered title
- Optional close icon
- Optional drag handle area

## Variants

- `純關閉`
- `返回+文字+關閉`
- `純文字`
- `文字+關閉`
- `拖曳長條柱`
- `無拖曳長條柱`

## States

- Default/open: observed.
- Drag handle present/absent: observed.
- Close/back pressed, focus-visible, disabled, drag interaction, and title overflow: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-bottom-sheet-header-set-width` | `--cm-sys-size-bottom-sheet-header-set-width` | Component set reference width | Documentation |
| `--cm-comp-bottom-sheet-header-set-height` | `--cm-sys-size-bottom-sheet-header-set-height` | Component set reference height | Documentation |
| `--cm-comp-bottom-sheet-header-width` | `--cm-sys-size-bottom-sheet-width` | Header width | All |
| `--cm-comp-bottom-sheet-header-height` | `--cm-sys-size-bottom-sheet-header-height` | Header height | Header variants |
| `--cm-comp-bottom-sheet-header-drag-area-height` | `--cm-sys-size-bottom-sheet-drag-area-height` | Drag-handle strip height | Drag variants |
| `--cm-comp-bottom-sheet-header-container-color` | `--cm-sys-color-surface` | Header background | All |
| `--cm-comp-bottom-sheet-header-title-color` | `--cm-sys-color-on-surface-medium` | Title text color | Titled |
| `--cm-comp-bottom-sheet-header-close-icon-color` | `--cm-sys-color-on-surface-secondary` | Close icon color | Close |
| `--cm-comp-bottom-sheet-header-back-icon-color` | `--cm-sys-color-on-surface-strong` | Back icon color | Back |
| `--cm-comp-bottom-sheet-header-drag-handle-color` | `--cm-sys-color-on-surface-medium` | Drag handle fill | Drag |
| `--cm-comp-bottom-sheet-header-corner-radius` | `--cm-sys-shape-corner-lg` | Top corner radius | All |
| `--cm-comp-bottom-sheet-header-drag-handle-corner-radius` | `--cm-sys-shape-corner-full` | Drag handle radius | Drag |
| `--cm-comp-bottom-sheet-header-padding-x` | `--cm-sys-spacing-container-xl` | Horizontal padding | Close/back variants |
| `--cm-comp-bottom-sheet-header-padding-y` | `--cm-sys-spacing-container-xl` | Vertical padding | Close/back variants |
| `--cm-comp-bottom-sheet-header-back-title-gap` | `--cm-sys-spacing-m` | Back/title gap | Back |
| `--cm-comp-bottom-sheet-header-title-width` | `--cm-sys-size-bottom-sheet-title-width` | Centered title width | Titled |
| `--cm-comp-bottom-sheet-header-close-icon-size` | `--cm-sys-size-bottom-sheet-close-icon` | Close icon size | Close |
| `--cm-comp-bottom-sheet-header-back-icon-size` | `--cm-sys-size-bottom-sheet-back-icon` | Back icon size | Back |
| `--cm-comp-bottom-sheet-header-drag-handle-width` | `--cm-sys-size-bottom-sheet-drag-handle-width` | Drag handle width | Drag |
| `--cm-comp-bottom-sheet-header-drag-handle-height` | `--cm-sys-size-bottom-sheet-drag-handle-height` | Drag handle height | Drag |
| `--cm-comp-bottom-sheet-header-title-text-size` | `--cm-sys-typescale-title-md-size` | Title size | Titled |
| `--cm-comp-bottom-sheet-header-title-line-height` | `--cm-sys-typescale-title-md-compact-line-height` | Title line height | Titled |
| `--cm-comp-bottom-sheet-header-title-weight` | `--cm-sys-weight-regular` | Title weight | Titled |

## Layout Rules

- Use 375x64 for header variants and 375x20 for drag-handle-only variants.
- Keep the top sheet corners at 12px.
- Use 24px horizontal/vertical padding where icon actions are present.
- Keep the title centered; the `文字+關閉` variant constrains title copy to the observed 247px width.
- Keep the drag handle 68x4 and centered inside the 20px strip.

## Content Rules

- Use a short sheet title where title variants are selected.
- Do not combine back and close affordances unless the sheet flow needs both cancel and nested-back behavior.
- Do not add subtitles, helper copy, badges, or search fields into this header without new evidence.

## Accessibility Rules

- Close and back icons require explicit accessible names.
- Title variants should expose the visible title as the dialog title.
- Drag handle must not be the only way to close or dismiss the sheet.

## Do / Don't

- Do keep the header flat on `#252525`.
- Do keep drag handle presence as a separate variant.
- Don't add shadows, blur, or a floating header card.
- Don't turn the title into a large page heading.

## Implementation Notes

Existing product-specific sheets can reuse this header pattern, but their sheet body heights and actions remain component-specific.
