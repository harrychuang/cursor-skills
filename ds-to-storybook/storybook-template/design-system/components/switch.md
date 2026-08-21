# Switch

## Purpose

Provides the reusable on/off control used in compact settings and broker-import contexts, with platform-specific Android and iOS visual variants.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E-078 | Figma `8134:289037` | `switch` component set | 134x136 set with Android and iOS variants, each showing off and on states. Exported SVG assets confirm Android 40x24 frame, iOS 43x26 frame, orange active treatment, neutral off treatment, and knob shadows. |
| E-064 | Figma `16405:224726` | Bottom Sheet Cell switch rows | Earlier evidence shows 43x26 right-side switch slots inside dense settings rows. |
| E-059 | Figma `15937:219728` | Broker Import Row switch slot | Earlier evidence shows an on switch slot inside broker import rows. |

## Component Fingerprint

| Dimension | Fingerprint |
|---|---|
| Purpose / behavior | Binary setting control for enabling or disabling a feature, account connection, or row-scoped capability. |
| Anatomy | Outer platform frame, pill track, circular knob, optional knob shadow. No label is part of the component; labels come from the hosting row. |
| Variants / states | Android off, Android on, iOS off, iOS on. Pressed, focus-visible, hover, disabled, loading, and indeterminate states are not evidenced. |
| Token contract summary | Uses toggle system colors, toggle system sizes, state opacity tokens for Android translucent tracks, full-radius shape, and switch knob shadow roles. |
| Layout / density | Android is 40x24 with 34x14 track and 20px knob. iOS is 43x26 with 42x26 track and 22px knob. |
| Visual reference | Figma node preview `figma:vSr4NtEwPVs6wLpqCT5PtV#8134:289037`; get_screenshot captured 2026-06-02. |
| Similar components reviewed | Bottom Sheet Cell switch slot, Broker Import Row switch slot, and Edge Status Toggle. Decision: keep distinct as standalone Switch and compose into row slots. |

## Anatomy

- Platform frame
- Track
- Knob
- Knob shadow

## Variants

- Android off
- Android on
- iOS off
- iOS on

## States

- Off: observed for both Android and iOS.
- On: observed for both Android and iOS.
- Pressed, focus-visible, hover, disabled, loading, indeterminate: not observed.

## Token Contract

| Component token | Maps to system token | Purpose | State |
|---|---|---|---|
| `--cm-comp-switch-set-width` | `--cm-sys-size-toggle-set-width` | Component set reference width | Documentation |
| `--cm-comp-switch-set-height` | `--cm-sys-size-toggle-set-height` | Component set reference height | Documentation |
| `--cm-comp-switch-android-width` | `--cm-sys-size-toggle-android-width` | Android frame width | Android |
| `--cm-comp-switch-android-height` | `--cm-sys-size-toggle-android-height` | Android frame height | Android |
| `--cm-comp-switch-android-track-width` | `--cm-sys-size-toggle-android-track-width` | Android track width | Android |
| `--cm-comp-switch-android-track-height` | `--cm-sys-size-toggle-android-track-height` | Android track height | Android |
| `--cm-comp-switch-android-knob-size` | `--cm-sys-size-toggle-android-knob-size` | Android knob diameter | Android |
| `--cm-comp-switch-android-off-track-color` | `--cm-sys-color-toggle-track-off` | Android off track base color | Off |
| `--cm-comp-switch-android-off-track-opacity` | `--cm-sys-state-opacity-control-track-subtle` | Android off track opacity | Off |
| `--cm-comp-switch-android-off-knob-color` | `--cm-sys-color-toggle-knob-off` | Android off knob fill | Off |
| `--cm-comp-switch-android-on-track-color` | `--cm-sys-color-toggle-track-on` | Android on track base color | On |
| `--cm-comp-switch-android-on-track-opacity` | `--cm-sys-state-opacity-control-track-selected` | Android on track opacity | On |
| `--cm-comp-switch-android-on-knob-color` | `--cm-sys-color-toggle-knob-on` | Android on knob fill | On |
| `--cm-comp-switch-android-knob-shadow` | `--cm-sys-shadow-toggle-knob-low` | Android knob shadow | All Android |
| `--cm-comp-switch-ios-width` | `--cm-sys-size-toggle-ios-width` | iOS frame width | iOS |
| `--cm-comp-switch-ios-height` | `--cm-sys-size-toggle-ios-height` | iOS frame height | iOS |
| `--cm-comp-switch-ios-track-width` | `--cm-sys-size-toggle-ios-track-width` | iOS track width | iOS |
| `--cm-comp-switch-ios-track-height` | `--cm-sys-size-toggle-ios-track-height` | iOS track height | iOS |
| `--cm-comp-switch-ios-knob-size` | `--cm-sys-size-toggle-ios-knob-size` | iOS knob diameter | iOS |
| `--cm-comp-switch-ios-off-track-color` | `--cm-sys-color-toggle-track-off-strong` | iOS off track fill | Off |
| `--cm-comp-switch-ios-off-knob-color` | `--cm-sys-color-toggle-knob-contrast` | iOS off knob fill | Off |
| `--cm-comp-switch-ios-on-track-color` | `--cm-sys-color-toggle-track-on` | iOS on track fill | On |
| `--cm-comp-switch-ios-on-knob-color` | `--cm-sys-color-toggle-knob-contrast` | iOS on knob fill | On |
| `--cm-comp-switch-ios-knob-shadow` | `--cm-sys-shadow-toggle-knob-strong` | iOS knob shadow | All iOS |
| `--cm-comp-switch-track-corner-radius` | `--cm-sys-shape-corner-full` | Pill track shape | All |
| `--cm-comp-switch-knob-corner-radius` | `--cm-sys-shape-corner-full` | Circular knob shape | All |

## Layout Rules

- Use Android 40x24 only for Android-platform treatments.
- Use iOS 43x26 only for iOS-style row slots.
- Keep Android track centered inside the frame at 34x14.
- Keep the knob circular and aligned to the leading edge for off, trailing edge for on.
- Compose the switch into row slots; do not add label text inside the switch itself.
- Preserve the host row's layout. Bottom Sheet Cell and Broker Import Row own placement, labels, and dividers.

## Content Rules

- The visible component has no text.
- The hosting row must provide a clear label such as `即時彈幕訊息` or broker import status.
- Do not add `ON/OFF` text, icons, checkmarks, or helper labels inside the track without new evidence.

## Accessibility Rules

- Expose as a switch with checked/unchecked state.
- Accessible name must come from the row label or an explicit `aria-label`.
- Do not rely on orange alone; assistive state must announce on/off.
- Focus-visible styling is not evidenced. Use the product's focus-ring rule if implemented on web, and document it as inferred.
- Disabled state is not evidenced. Do not lower opacity or gray out the control without future source evidence.

## Do / Don't

- Do keep Switch as a compact platform-aware control.
- Do compose it into Bottom Sheet Cell and Broker Import Row switch slots.
- Don't replace it with a generic browser checkbox, large segmented control, or text toggle.
- Don't infer disabled, loading, or error styling from row-level broker states.
- Don't reuse Edge Status Toggle styling; that component is an edge-attached text status control.

## Implementation Notes

The exported assets use `#BDBDBD` for the Android off knob and `#4C4C4C` for the iOS off track. Both were normalized to existing neutral reference tokens in the 2026-06-02 near-token decision to avoid one-off near-neutral primitives.

Use `figmaVariant` only in Storybook export stories such as `AllVariants` so Android off, Android on, iOS off, and iOS on emit distinct `data-variant` values and the Figma importer builds four component variants instead of deduping them into the first switch.
