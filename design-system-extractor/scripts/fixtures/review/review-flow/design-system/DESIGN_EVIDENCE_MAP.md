# Design Evidence Map

## Source Inventory

| Source ID | Type | Evidence tier | Path / URL / Node | Source fingerprint | Screen or state | Notes | Confidence |
|---|---|---|---|---|---|---|---|
| S01 | project-code | 6 | `ref/assets/style.css` | sha256:fc6815a7 | shipped styling | Final visual token source. | High |
| S08 | project-code | 6 | `ref/docs/redesign-brief.md` | sha256:1797e31b | historical redesign brief | Earlier blue direction; context only. | Low |
| S10 | image | 2 | `ref/logo.svg` | sha256:1b1b099e | logo asset | Canonical brand mark. | High |
| S12 | image | 2 | `ref/public/logo.svg` | sha256:1b1b099e | generated public mirror | Copy of S10. | Low |
| S13 | image | 2 | `ref/dist/logo.svg` | sha256:1b1b099e | build output mirror | Copy of S10. | Low |
| R01 | rendered-project | 4 | `http://127.0.0.1:8005/#/market` | render:route-market; viewport:1200x700 | market route | Header, section heading and signal cards. | High |
| R03 | rendered-project | 4 | `http://127.0.0.1:8005/#/stock` | render:route-stock; viewport:1200x900 | stock route | Header controls, filter chips and ranking table. | High |

## Source Duplicate Review

| Candidate source | Duplicate of | Match type | Fingerprint / normalized key | Suggested action | Developer decision | Rationale |
|---|---|---|---|---|---|---|
| S12 and S13 | S10 | exact file hash | sha256:1b1b099e | ignore duplicate | | The public and dist copies are generated mirrors of the canonical logo. |
| S08 | S01 | conflicting historical direction | older blue brief vs shipped warm-gold CSS | reuse existing source | | Shipped CSS is the higher-confidence evidence; the brief stays as context only. |
