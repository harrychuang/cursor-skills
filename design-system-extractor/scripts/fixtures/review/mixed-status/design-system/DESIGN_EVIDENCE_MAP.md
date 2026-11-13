# Design Evidence Map

## Source Inventory

| Source ID | Type | Evidence tier | Path / URL / Node | Source fingerprint | Screen or state | Notes | Confidence |
|---|---|---|---|---|---|---|---|
| S01 | screenshot | 2 | `ref/notice-default.png` | sha256:1111aaaa | Notice, default | Primary reference | High |
| S02 | screenshot | 2 | `ref/notice-compact.png` | sha256:2222bbbb | Notice, compact | Compact density | High |
| S03 | screenshot | 2 | `ref/export/notice-default.png` | sha256:1111aaaa | Notice, default export | Exported copy of S01 | Low |

## Source Duplicate Review

| Candidate source | Duplicate of | Match type | Fingerprint / normalized key | Suggested action | Developer decision | Rationale |
|---|---|---|---|---|---|---|
| S03 | S01 | exact file hash | sha256:1111aaaa | ignore duplicate | ignore duplicate | The export folder holds a copy of the same capture. |
