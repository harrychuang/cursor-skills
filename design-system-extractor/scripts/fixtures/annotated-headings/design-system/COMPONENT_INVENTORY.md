# Component Inventory（元件盤點）

| Component | Category | Seen in | Status | Priority | Fingerprint summary | Required tokens | Missing states / modes | Notes |
|---|---|---|---|---|---|---|---|---|
| Primary Button（主要按鈕） | action | S1 | extracted（已萃取） | P0 | 綠色膠囊 | comp-primary-button-* | loading | 與 Secondary Button 相似 |

## Component Similarity Review（元件相似度審查）

| New candidate | Similar existing component | Visual reference | Similarity reason | Suggested action | Developer decision (`merge` / `make variant` / `keep distinct` / `blocked`) | Rationale / owner |
|---|---|---|---|---|---|---|
| Secondary Button | Primary Button | ![crop](assets/component-review/buttons.png) | 相同解剖結構，只有填色不同 | make variant | keep distinct（保留區分） | Harry |
