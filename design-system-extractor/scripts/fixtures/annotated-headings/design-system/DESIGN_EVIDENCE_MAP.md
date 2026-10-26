# Design Evidence Map（設計證據對照）

## Source Inventory（來源清單）

| Source ID | Type | Evidence tier | Path / URL / Node | Source fingerprint | Screen or state | Notes | Confidence |
|---|---|---|---|---|---|---|---|
| S1 | screenshot | 2 | refs/home.png | `sha256:aaaa1111` | Home / default | 首頁截圖 | High |
| S2 | screenshot | 2 | refs/home-copy.png | `sha256:aaaa1111` | Home / default | 同一張截圖的副本 | High |

## Source Duplicate Review（重複來源審查）

| Candidate source | Duplicate of | Match type | Fingerprint / normalized key | Suggested action | Developer decision | Rationale |
|---|---|---|---|---|---|---|
| S2 | S1 | exact | sha256:aaaa1111 | ignore duplicate | ignore duplicate（忽略重複） | 同一檔案 |

## Evidence（證據）

| Evidence ID | Source ID | Region | Observed pattern | Design decision | Affected output | Confidence |
|---|---|---|---|---|---|---|
| E1 | S1 | 右下角 | 綠色膠囊按鈕 | 主要動作使用 green-70 | components/primary-button.md | High |
