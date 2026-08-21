# Design Evidence Map

Use this file to trace design decisions back to source evidence. Project-folder intakes append their manifest and capture tables here from `references/project-intake.md` or `references/native-mobile-projects.md`.

## Source Inventory

Evidence tier ranks the source's authority: `1` production Figma/component library, `2` production screenshots, `3` native simulator/emulator/device captures, `4` rendered project UI, `5` native preview/screenshot-test captures, `6` prototype code, `7` descriptive prompt. When a new source's tier outranks the tiers behind existing decisions, run the Late-Arriving Authoritative Source Pass instead of treating it as supplementary evidence.

Downstream tools read this table by header name — keep the English header text.

| Source ID | Type | Evidence tier | Path / URL / Node | Source fingerprint | Screen or state | Notes | Confidence |
|---|---|---|---|---|---|---|---|
| S-01 | prototype code | 6 | `src/components/example-card/ExampleCard.tsx` | `file:src/components/example-card/ExampleCard.tsx` | Default | Starter example shipped with the template. Replace this row with the real sources from design-system-extractor. | Low |

## Source Duplicate Review

Use this table when two screenshots, graphic/brand exports, Figma nodes, routes, or other exports are exact duplicates or visually/functionally very close. Exact matches (same sha256 with the same screen or state, or the same `figma:<file>#<node>`) are auto-resolved as `ignore duplicate` with the rationale `exact match (auto-resolved)`; every other pair needs a developer decision (`reuse existing source` / `ignore duplicate` / `keep distinct`) before both count as separate evidence.

| Candidate source | Duplicate of | Match type | Fingerprint / normalized key | Suggested action | Developer decision | Rationale |
|---|---|---|---|---|---|---|

## Evidence

| Evidence ID | Source ID | Region | Observed pattern | Design decision | Affected output | Confidence |
|---|---|---|---|---|---|---|
| E-01 | S-01 | Whole card | Eyebrow, status pill, title, and description stacked in one surface | Model the starter card as one component with a status slot | `components/example-card.md`, `tokens/tokens-comp.css` | Low |
