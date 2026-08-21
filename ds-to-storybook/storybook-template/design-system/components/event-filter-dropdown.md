# Event Filter Dropdown

## Purpose

Filters an event list by event scope or selected event count using a compact dropdown trigger.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-027 | Figma `19215:187703` | `下拉選單` component set | Three 86x28 trigger variants in a 217x140 set: `全部`, `2項事件`, and `11項事件`. |

## Anatomy

- Trigger container
- Label
- Chevron icon

## Variants

- All events: `全部`.
- Two selected events: `2項事件`.
- Eleven selected events: `11項事件`.

## States

- Closed trigger: observed.
- Expanded trigger: inferred for export using the existing primary border/label/icon tokens.
- Open menu, selected menu item, pressed, disabled, and loading states: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-event-filter-dropdown-set-width` | `--cm-sys-size-event-filter-dropdown-set-width` | Component set reference width | Documentation |
| `--cm-comp-event-filter-dropdown-set-height` | `--cm-sys-size-event-filter-dropdown-set-height` | Component set reference height | Documentation |
| `--cm-comp-event-filter-dropdown-container-color` | `--cm-sys-color-transparent` | Trigger fill | Default |
| `--cm-comp-event-filter-dropdown-width` | `--cm-sys-size-event-filter-dropdown-width` | Trigger width | Default |
| `--cm-comp-event-filter-dropdown-height` | `--cm-sys-size-event-filter-dropdown-height` | Trigger height | Default |
| `--cm-comp-event-filter-dropdown-border-width` | `--cm-sys-size-control-border-width` | Border width | Default |
| `--cm-comp-event-filter-dropdown-border-color` | `--cm-sys-color-control-outline` | Border color | Default |
| `--cm-comp-event-filter-dropdown-padding-x` | `--cm-sys-spacing-sm` | Horizontal padding | Default |
| `--cm-comp-event-filter-dropdown-padding-y` | `--cm-sys-spacing-xs` | Vertical padding | Default |
| `--cm-comp-event-filter-dropdown-gap` | `--cm-sys-spacing-xxs` | Label/icon gap | Default |
| `--cm-comp-event-filter-dropdown-corner-radius` | `--cm-sys-shape-corner-sm` | Trigger radius | Default |
| `--cm-comp-event-filter-dropdown-label-width` | `--cm-sys-size-event-filter-dropdown-label-width` | Label slot width | Default |
| `--cm-comp-event-filter-dropdown-label-color` | `--cm-sys-color-on-control` | Label color | Default |
| `--cm-comp-event-filter-dropdown-label-text-size` | `--cm-sys-typescale-label-md-size` | Label size | Default |
| `--cm-comp-event-filter-dropdown-label-line-height` | `--cm-sys-typescale-label-md-compact-line-height` | Label line height | Default |
| `--cm-comp-event-filter-dropdown-icon-width` | `--cm-sys-size-event-filter-dropdown-icon-width` | Chevron width | Default |
| `--cm-comp-event-filter-dropdown-icon-height` | `--cm-sys-size-event-filter-dropdown-icon-height` | Chevron height | Default |
| `--cm-comp-event-filter-dropdown-icon-color` | `--cm-sys-color-on-control` | Chevron color | Default |

## Layout Rules

- Use an 86x28 trigger.
- Apply 6px horizontal padding and 4px vertical padding.
- Use a 64px label slot followed by an 8x7 chevron.
- Keep 2px between label and icon.
- Use 5px corner radius and a 1px border.

## Content Rules

- Observed labels are `全部`, `2項事件`, and `11項事件`.
- Keep event-count labels short enough for the 64px label slot.
- The trigger does not define the expanded menu contents.

## Accessibility Rules

- Use a combobox, menu button, or select trigger pattern appropriate to the platform implementation.
- Expose expanded/collapsed state when the menu state is implemented.
- Include selected filter text in the accessible name.

## Do / Don't

- Do keep the trigger compact and outline-based.
- Do preserve the fixed label slot for stable width.
- Don't turn this into a segmented filter or chip group.
- Don't invent expanded menu styling from the trigger alone.

## Implementation Notes

The Figma component uses unnamed variant labels for count states. Use the rendered labels as the source of truth until the variant names are normalized.

Use `figmaVariant` only in Storybook export stories such as `AllVariants` so the closed and expanded label states emit distinct `data-variant` values and the Figma importer can build separate component variants instead of deduping them into the first dropdown.

Render the chevron with the shared `Icon` component (`chevronDown`) instead of a CSS pseudo-element so Figma export creates a real icon layer.

Export the label as fill container with `data-figma-layout-grow="1"` and keep the chevron fixed-size, otherwise long fixed-width text can push the arrow outside the imported Figma frame.

Keep the chevron color as `currentColor` and export closed/expanded chevrons as distinct icon variants so expanded imports keep the icon color in sync with the expanded label color.
