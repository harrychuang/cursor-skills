# Design Evidence Map

Use this file to trace design decisions back to source evidence.

## Source Inventory

Evidence tier ranks the source's authority: `1` production Figma/component library, `2` production screenshots, `3` native simulator/emulator/device captures, `4` rendered project UI, `5` native preview/screenshot-test captures, `6` prototype code, `7` descriptive prompt. When a new source's tier outranks the tiers behind existing decisions, run the Late-Arriving Authoritative Source Pass instead of treating it as supplementary evidence.

| Source ID | Type | Evidence tier | Path / URL / Node | Source fingerprint | Screen or state | Notes | Confidence |
|---|---|---|---|---|---|---|---|

## Source Duplicate Review

Use this table when two screenshots, graphic/brand exports, Figma nodes, routes, or other exports are exact duplicates or visually/functionally very close. Record the decision before counting both as separate evidence.

| Candidate source | Duplicate of | Match type | Fingerprint / normalized key | Suggested action | Developer decision | Rationale |
|---|---|---|---|---|---|---|

## Vibe Project Scope Review

Use this table when the input is an AI-generated or vibe-coded project. Record whether project evidence is rendered, screenshot, storybook, token-used, component-used, demo-only, unused, dead-code, capture-blocked, auth-blocked, contradictory, or out-of-scope before it influences confidence.

| Source | Classification | Visible in rendered UI | Token/component used | Keep / ignore decision | Rationale |
|---|---|---|---|---|---|

## Native App Project Review

Use this table when the input is a native iOS or Android app project. Record whether native evidence is native-capture, native-preview, screenshot-test, native-token-used, native-component-used, native-source-only, native-capture-blocked, native-contradictory, out-of-scope, or explicitly kept/ignored before it influences confidence.

| Source | Classification | Visible in native capture / screenshot / preview | Token / component / resource used | Keep / ignore decision | Rationale |
|---|---|---|---|---|---|

## Route / State Manifest

Use this table when extracting from a project folder with runnable routes or Storybook stories.

| Route or story | Viewport | State | Render command | Screenshot path | Source files | Capture status | Keep / ignore | Notes |
|---|---|---|---|---|---|---|---|---|

## Native Screen / State Manifest

Use this table when extracting from native iOS or Android screens, previews, screenshot tests, simulators, emulators, or supplied app captures.

| Platform | Screen or component | Source entrypoint | Device / viewport | State | Render/capture command | Screenshot path | Source files | Capture status | Keep / ignore | Notes |
|---|---|---|---|---|---|---|---|---|---|---|

## Rendered UI Capture Attempts

Record every browser capture attempt for runnable projects, including blocked captures.

| Capture ID | Route or story | Viewport | State | URL | Screenshot path | DOM/CSS inspected | Source files linked | Status | Confidence impact |
|---|---|---|---|---|---|---|---|---|---|

## Native UI Capture Attempts

Record every native capture attempt for simulator, emulator, device, preview, screenshot-test, or demo/gallery output, including blocked captures.

| Capture ID | Platform | Screen/component | Device | OS/API | Orientation | State | Command | Screenshot path | Source files linked | Status | Confidence impact |
|---|---|---|---|---|---|---|---|---|---|---|---|

## Evidence

| Evidence ID | Source ID | Region | Observed pattern | Design decision | Affected output | Confidence |
|---|---|---|---|---|---|---|
