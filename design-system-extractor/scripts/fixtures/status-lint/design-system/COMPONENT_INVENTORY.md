# Component Inventory

| Component | Category | Seen in | Status | Priority | Fingerprint summary | Required tokens | Missing states / modes | Notes |
|---|---|---|---|---|---|---|---|---|
| Primary Button | action | S1 | bogus-status | P0 | filled pill | comp-primary-button-* | loading | not blocked; similar to Secondary Button |
| Chip | selection | S1 | planned（規劃中） | P1 | small pill | comp-chip-* | | |

## Component Similarity Review

| New candidate | Similar existing component | Visual reference | Similarity reason | Suggested action | Developer decision (`merge` / `make variant` / `keep distinct` / `blocked`) | Rationale / owner |
|---|---|---|---|---|---|---|
| Secondary Button | Primary Button | ![crop](assets/component-review/buttons.png) | same anatomy | make variant | keep distinct | Harry |
