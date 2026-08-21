# Selection Control

## Purpose

Provides the reusable 20px checkbox and radio visual controls for compact selection rows and form-like selection groups.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-079 | Figma `22911:207990` | `勾選` component set | 59x176 set with four 20x20 variants: multi-select unchecked square, multi-select checked orange square with white checkmark, single-select unchecked circle, and single-select selected orange outline circle with orange 12px inner mark. |
| E-067 | Figma `16405:224755` | Bottom Sheet selection rows | Earlier evidence shows bottom-sheet sort and watchlist selection rows that need compact leading selection controls. |
| E-064 | Figma `16405:224726` | Bottom Sheet Cell selection slot | Earlier evidence reserves an optional selection control slot inside dense bottom-sheet rows. |

## Component Fingerprint

| Dimension | Fingerprint |
|---|---|
| Purpose / behavior | Selection state indicator for multi-select checkbox and single-select radio patterns. |
| Anatomy | 20px control frame, optional 1px outline, optional selected fill, checkmark SVG for checkbox, inner circular mark for radio. No label is part of the component; labels come from the hosting row or form field. |
| Variants / states | Multi-select unchecked, multi-select checked, single-select unchecked, single-select selected. Disabled is implemented with product-level disabled tokens; pressed, hover, error, indeterminate, and mixed states are not evidenced. |
| Token contract summary | Uses selection-control system colors, existing 20px/13px/12px size steps, 1px/2px stroke steps, 2px checkbox radius, and full radio radius. |
| Layout / density | Every visible control is 20x20. Checkbox selected fill is orange; unchecked checkbox/radio outlines are gray `#999999`; radio selected state keeps transparent container, orange outline, and 12px orange center mark. |
| Visual reference | Figma node preview `figma:vSr4NtEwPVs6wLpqCT5PtV#22911:207990`; get_screenshot captured 2026-06-02. |
| Similar components reviewed | Bottom Sheet Cell selection control slot, Bottom Sheet selection rows, Event Filter Option, and Switch. Decision: keep distinct as standalone Selection Control and compose into row slots. |

## Anatomy

- Control frame
- Optional outline
- Optional selected fill
- Checkbox checkmark
- Radio inner mark

## Variants

- Multi-select unchecked
- Multi-select checked
- Single-select unchecked
- Single-select selected

## States

- Unchecked checkbox: observed.
- Checked checkbox: observed.
- Unchecked radio: observed.
- Selected radio: observed.
- Disabled unchecked/checked: implemented with product-level disabled tokens to distinguish disabled checked from enabled checked.
- Pressed, hover, error, indeterminate, mixed, and loading: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-selection-control-set-width` | `--cm-sys-size-selection-control-set-width` | Component set reference width | Documentation |
| `--cm-comp-selection-control-set-height` | `--cm-sys-size-selection-control-set-height` | Component set reference height | Documentation |
| `--cm-comp-selection-control-size` | `--cm-sys-size-selection-control-size` | Control frame size | All |
| `--cm-comp-selection-control-checkbox-unselected-container-color` | `--cm-sys-color-selection-control-container` | Checkbox transparent fill | Unchecked |
| `--cm-comp-selection-control-checkbox-unselected-border-color` | `--cm-sys-color-selection-control-outline` | Checkbox gray outline | Unchecked |
| `--cm-comp-selection-control-checkbox-selected-container-color` | `--cm-sys-color-selection-control-selected` | Checkbox orange fill | Checked |
| `--cm-comp-selection-control-checkbox-selected-checkmark-color` | `--cm-sys-color-on-selection-control-selected` | Checkbox white checkmark | Checked |
| `--cm-comp-selection-control-checkbox-disabled-container-color` | `--cm-sys-color-selection-control-container` | Disabled checkbox transparent fill | Disabled unchecked |
| `--cm-comp-selection-control-checkbox-disabled-border-color` | `--cm-sys-color-disabled` | Disabled checkbox outline | Disabled unchecked |
| `--cm-comp-selection-control-checkbox-disabled-selected-container-color` | `--cm-sys-color-disabled-container` | Disabled checkbox selected fill | Disabled checked |
| `--cm-comp-selection-control-checkbox-disabled-selected-checkmark-color` | `--cm-sys-color-on-disabled-container` | Disabled checkbox selected checkmark | Disabled checked |
| `--cm-comp-selection-control-radio-unselected-container-color` | `--cm-sys-color-selection-control-container` | Radio transparent fill | Unselected |
| `--cm-comp-selection-control-radio-unselected-border-color` | `--cm-sys-color-selection-control-outline` | Radio gray outline | Unselected |
| `--cm-comp-selection-control-radio-selected-container-color` | `--cm-sys-color-selection-control-container` | Radio transparent fill | Selected |
| `--cm-comp-selection-control-radio-selected-border-color` | `--cm-sys-color-selection-control-selected` | Radio orange outline | Selected |
| `--cm-comp-selection-control-radio-selected-mark-color` | `--cm-sys-color-selection-control-mark` | Radio orange inner mark | Selected |
| `--cm-comp-selection-control-radio-disabled-container-color` | `--cm-sys-color-selection-control-container` | Disabled radio transparent fill | Disabled unselected |
| `--cm-comp-selection-control-radio-disabled-border-color` | `--cm-sys-color-disabled` | Disabled radio outline | Disabled unselected |
| `--cm-comp-selection-control-radio-disabled-selected-container-color` | `--cm-sys-color-selection-control-container` | Disabled selected radio transparent fill | Disabled selected |
| `--cm-comp-selection-control-radio-disabled-selected-border-color` | `--cm-sys-color-disabled` | Disabled selected radio outline | Disabled selected |
| `--cm-comp-selection-control-radio-disabled-selected-mark-color` | `--cm-sys-color-disabled` | Disabled selected radio inner mark | Disabled selected |
| `--cm-comp-selection-control-border-width` | `--cm-sys-size-selection-control-border-width` | Outer outline width | Unselected / radio selected |
| `--cm-comp-selection-control-checkmark-stroke-width` | `--cm-sys-size-selection-control-mark-stroke-width` | Checkmark stroke width | Checked checkbox |
| `--cm-comp-selection-control-checkmark-size` | `--cm-sys-size-selection-control-check-icon-size` | Checkmark visual box | Checked checkbox |
| `--cm-comp-selection-control-radio-mark-size` | `--cm-sys-size-selection-control-radio-mark-size` | Radio inner mark diameter | Selected radio |
| `--cm-comp-selection-control-checkbox-corner-radius` | `--cm-sys-shape-corner-xxs` | Checkbox square radius | Checkbox |
| `--cm-comp-selection-control-radio-corner-radius` | `--cm-sys-shape-corner-full` | Radio circular radius | Radio |

## Layout Rules

- Keep every control exactly 20x20.
- Use checkbox variants for multi-select contexts.
- Use radio variants for single-select contexts.
- Do not add label text inside the control; labels belong to the hosting row, field, or list option.
- Keep the checkbox checkmark white and centered within the orange selected square.
- Keep the selected radio inner mark centered at 12px diameter inside the 20px frame.

## Content Rules

- The component has no visible text.
- Host components provide labels such as watchlist names, sort options, field values, or setting names.
- Do not add helper copy, counts, icons, or badges inside the control.

## Accessibility Rules

- Expose checkbox variants with checked/unchecked state.
- Expose radio variants inside a single-selection group with selected/unselected state.
- Accessible names must come from the host row label or explicit labeling.
- Do not rely on orange alone; the checked/selected state must be programmatically available.
- Focus-visible treatment is inferred from product-level focus rules.
- Disabled treatment uses product-level disabled tokens so disabled selected controls are not confused with enabled selected controls.

## Do / Don't

- Do compose Selection Control into Bottom Sheet Cell and other compact row slots when square or round selection controls are required.
- Do keep Event Filter Option as a separate filled text option, not a checkbox/radio.
- Don't replace Switch with Selection Control; Switch is for binary on/off settings.
- Don't change row backgrounds to communicate selected state unless a host component has separate evidence.
- Don't infer indeterminate or error variants from generic checkbox libraries.

## Implementation Notes

The checked checkbox SVG uses a white 2px-stroke checkmark in a 7.84211x12.5789 viewBox, rotated by the Figma export. Runtime implementations can draw the same mark with CSS/SVG, but must keep the 20px frame and token-backed colors.

Use `figmaVariant` only in Storybook export stories such as `AllVariants` so checkbox unchecked, checkbox checked, radio unchecked, and radio selected controls emit distinct `data-variant` values and the Figma importer builds four component variants instead of deduping them into the first selection control.
