# Event Filter Option

## Purpose

Represents one selectable major-event category inside an event filter sheet.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-028 | Figma `19215:187453` | `一個選項` component set | Default and selected variants; base option is 68x42 with 10px padding and 4px radius. |
| E-029 | Figma `19215:187371` | `重大事件篩選` sheet options | Sheet uses mostly 100x42 option cells in a compact event category grid. |

## Anatomy

- Option container
- Label

## Variants

- Default: neutral filled surface with muted label.
- Selected: orange filled surface with white label.

## States

- Default: observed.
- Selected: observed.
- Pressed, focus-visible, disabled, hover, and long-label wrapping states: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-event-filter-option-set-width` | `--cm-sys-size-selection-option-set-width` | Component set reference width | Documentation |
| `--cm-comp-event-filter-option-set-height` | `--cm-sys-size-selection-option-set-height` | Component set reference height | Documentation |
| `--cm-comp-event-filter-option-width-sm` | `--cm-sys-size-selection-option-width-sm` | Fixed standalone option width | Default |
| `--cm-comp-event-filter-option-width-md` | `--cm-sys-size-selection-option-width-md` | Sheet grid option width | Sheet |
| `--cm-comp-event-filter-option-height` | `--cm-sys-size-selection-option-height` | Option height | Default |
| `--cm-comp-event-filter-option-padding` | `--cm-sys-spacing-m` | Option padding | Default |
| `--cm-comp-event-filter-option-corner-radius` | `--cm-sys-shape-corner-xs` | Option radius | Default |
| `--cm-comp-event-filter-option-default-container-color` | `--cm-sys-color-selection-option-default` | Neutral option fill | Default |
| `--cm-comp-event-filter-option-default-label-color` | `--cm-sys-color-on-selection-option-default` | Neutral option label | Default |
| `--cm-comp-event-filter-option-selected-container-color` | `--cm-sys-color-selection-option-selected` | Selected option fill | Selected |
| `--cm-comp-event-filter-option-selected-label-color` | `--cm-sys-color-on-selection-option-selected` | Selected option label | Selected |
| `--cm-comp-event-filter-option-label-text-size` | `--cm-sys-typescale-label-xl-size` | Label size | Default |
| `--cm-comp-event-filter-option-label-line-height` | `--cm-sys-typescale-label-xl-line-height` | Label line height | Default |

## Layout Rules

- Use 10px padding and 4px radius.
- Use `auto` width for standalone/export variants so the container hugs the label and padding.
- Compact fixed examples can use 68x42 only when the label copy fits; sheet grid options use 100x42.
- Center the label horizontally and vertically.
- Keep labels single-line unless future references define wrapping.

## Content Rules

- Labels are concise event categories such as `月營收公告`, `股利公告日`, or `處置開始`.
- Use product-approved event category copy; do not abbreviate independently.
- Selected state does not change the label text.

## Accessibility Rules

- Expose selection state programmatically when used as a filter option.
- Do not rely on orange fill alone; selected state should be available to assistive technologies.
- If multi-select behavior is used, use checkbox-like semantics or a listbox pattern appropriate to the platform.

## Do / Don't

- Do use filled neutral and filled selected states.
- Do keep the option compact and text-only.
- Don't restyle these as outline chips or pill tags.
- Don't add icons unless future evidence shows them.
- Don't replace this filled text option with Selection Control; checkbox/radio controls are a separate atomic component for row slots.

## Implementation Notes

The standalone component should use `auto` width for export and long labels, while compact samples may use 68px only when the label fits. The event filter sheet uses an auto-width `全部` option followed by 100px grid cells. Treat width as a layout context decision while preserving the same option slot tokens.

Use `figmaVariant` only in Storybook export stories such as `AllVariants` so default and selected options emit distinct `data-variant` values. Pair export variants with `width="auto"` and `data-figma-text-auto-width="true"` so the Figma importer builds hug-content containers instead of fixed-width text boxes that can clip long labels.
