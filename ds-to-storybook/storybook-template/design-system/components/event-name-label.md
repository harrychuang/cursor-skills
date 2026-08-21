# Event Name Label

## Purpose

Displays a financial calendar or stock event name as compact orange metadata text.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-022 | Figma `19215:187525` | `事件名稱` component set | Fifteen event-name variants in a 382x602 set; each label is 366x38. |
| E-023 | Figma `19215:187525` | Event label text | PingFang TC regular 16px, normal line height, `#FF7800`, no icon, fill, border, or shape. |

## Anatomy

- Label container
- Event name text

## Variants

- Dividend/ex-right events: `除息日`, `除權日`, `領息日`, `領股日`, `股利公告`.
- Financial report events: `月營收公告`, `季報公告`, `年報公告`.
- Corporate meeting events: `股東會`, `法說會`.
- Trading restriction events: `處置開始`, `處置結束`.
- Capital/share events: `申報轉讓`, `增資新股`, `決議實施庫藏股`.

## States

- Default passive label: observed.
- Selected, pressed, focus-visible, disabled, loading, error, and category/severity states: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-event-name-label-set-width` | `--cm-sys-size-event-name-set-width` | Component set reference width | Documentation |
| `--cm-comp-event-name-label-set-height` | `--cm-sys-size-event-name-set-height` | Component set reference height | Documentation |
| `--cm-comp-event-name-label-container-color` | `--cm-sys-color-transparent` | Container fill | Default |
| `--cm-comp-event-name-label-width` | `--cm-sys-size-event-name-label-width` | Label width | Default |
| `--cm-comp-event-name-label-height` | `--cm-sys-size-event-name-label-height` | Label height | Default |
| `--cm-comp-event-name-label-padding-x` | `--cm-sys-spacing-screen-gutter` | Horizontal inset | Default |
| `--cm-comp-event-name-label-padding-y` | `--cm-sys-spacing-md` | Vertical inset | Default |
| `--cm-comp-event-name-label-text-color` | `--cm-sys-color-event-name` | Event name text color | Default |
| `--cm-comp-event-name-label-text-size` | `--cm-sys-typescale-label-xl-size` | Event name text size | Default |
| `--cm-comp-event-name-label-line-height` | `--cm-sys-typescale-label-xl-line-height` | Event name line height | Default |

## Layout Rules

- Use a 366x38 label area.
- Apply 16px horizontal padding and 8px vertical padding.
- Keep the label as one line when possible.
- Do not add a background fill, icon, border, divider, or rounded pill.

## Content Rules

- Use concise financial event names.
- Preserve product copy from the event source; observed labels are 3 to 8 Chinese characters.
- If a label exceeds the available width, prefer truncation or a product-approved shorter label before wrapping.
- Do not append dates inside this component; pair with `Relative Date Label` or another date field when needed.

## Accessibility Rules

- Event name text should be exposed as metadata or list-item text.
- Do not rely on orange color alone if event type or severity needs to be communicated in a future state.
- If future event labels become interactive, add role, accessible name, and focus-visible treatment from new evidence.

## Do / Don't

- Do use the event-name semantic color role instead of primary button tokens.
- Do keep the label text-only and compact.
- Don't style event names as CTA buttons, chips, badges, or tags.
- Don't infer event severity or market movement from the orange label color.

## Implementation Notes

The Figma component prop names include two unnamed variants, but the rendered text shows `處置結束` and `決議實施庫藏股`. Use the rendered labels as the source of truth until the Figma variant names are normalized.
