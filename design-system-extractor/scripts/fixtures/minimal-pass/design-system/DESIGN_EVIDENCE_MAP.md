# Design Evidence Map

## Source Inventory

Evidence tier ranks the source's authority: `1` production Figma/component library, `2` production screenshots, `3` native simulator/emulator/device captures, `4` rendered project UI, `5` native preview/screenshot-test captures, `6` prototype code, `7` descriptive prompt.

| Source ID | Type | Evidence tier | Path / URL / Node | Source fingerprint | Screen or state | Notes | Confidence |
|---|---|---|---|---|---|---|---|
| S1 | screenshot | 2 | refs/notes-home.png | sha256:aaaa1111 | Notes list / default | main screen | High |
| S2 | screenshot | 2 | refs/notes-editor.png | sha256:bbbb2222 | Editor / default | editor with toolbar | High |

## Source Duplicate Review

| Candidate source | Duplicate of | Match type | Fingerprint / normalized key | Suggested action | Developer decision | Rationale |
|---|---|---|---|---|---|---|

## Evidence

| Evidence ID | Source ID | Region | Observed pattern | Design decision | Affected output | Confidence |
|---|---|---|---|---|---|---|
| E1 | S1 | bottom-right FAB | filled green pill with dark label | primary action uses green-70 on neutral-10 | tokens-sys.css, components/primary-button.md | High |
