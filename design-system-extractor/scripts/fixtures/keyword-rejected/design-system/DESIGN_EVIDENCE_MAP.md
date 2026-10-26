# Design Evidence Map

## Source Inventory

| Source ID | Type | Evidence tier | Path / URL / Node | Source fingerprint | Screen or state | Notes | Confidence |
|---|---|---|---|---|---|---|---|
| S1 | screenshot | 2 | refs/home.png | sha256:aaaa1111 | Home / default | | High |
| S2 | screenshot | 2 | refs/home-copy.png | sha256:aaaa1111 | Home / default | | High |
| S3 | figma | 1 | https://www.figma.com/design/DEMO/Acme?node-id=1-2 | figma:DEMO#1:2 | Home / default | | High |
| S4 | figma | 1 | https://www.figma.com/design/DEMO/Acme?node-id=1-2 | figma:DEMO#1:2 | Home / default | re-export | High |

## Source Duplicate Review

| Candidate source | Duplicate of | Match type | Fingerprint / normalized key | Suggested action | Developer decision | Rationale |
|---|---|---|---|---|---|---|
| S2 | S1 | exact | sha256:aaaa1111 | ignore duplicate | approved | reviewer said ok |
| S4 | S3 | exact | figma:DEMO#1:2 | reuse existing source | reuse existing source | same node |
