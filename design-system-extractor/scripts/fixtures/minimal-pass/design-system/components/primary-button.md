# Primary Button

## Purpose

The single accent action on a screen.

## Evidence

| Evidence ID | Source | Region | Notes |
|---|---|---|---|
| E1 | S1 | bottom-right FAB | filled green pill |

## Component Fingerprint

| Dimension | Description |
|---|---|
| Purpose / behavior / composition role | primary action |
| Anatomy | container, label |
| Variants / states / modes | default, hover, pressed, disabled |
| Token contract summary | container -> sys color primary; label -> sys color on-primary |
| Layout / density | 16px horizontal padding |
| Visual reference | assets/component-review/primary-button.png (screenshot crop) |
| Native platform mapping | n/a |
| Similar components reviewed | none |

## Anatomy

Container with a centered label.

## Token Contract

| Component token | Maps to system token | Purpose | State / mode |
|---|---|---|---|
| --acme-comp-primary-button-container-color | --acme-sys-color-primary | container fill | default |
| --acme-comp-primary-button-label-color | --acme-sys-color-on-primary | label | default |

## Implementation Notes

Build from tokens only; no raw colors in the component.
