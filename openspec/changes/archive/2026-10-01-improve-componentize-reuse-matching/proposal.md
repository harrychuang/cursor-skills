## Why

figma-componentize 目前判斷「這塊 UI 能不能沿用現有元件」時，只比對圖層骨架（圖層種類、順序、auto layout 方向），而且只拿第一個骨架相同的現有元件。這造成三個設計師會直接遇到的問題：

1. **配錯對象**：Button、Chip、Tab、Badge 的骨架都是「橫向 auto layout 加一段文字」，畫面上的按鈕可能被配到現有的 Chip。
2. **配到了卻什麼都不做**：骨架對得上、但外觀對不上時（例如現有 Button 只有 Filled，畫面上是 Outlined），這些 UI 不會被替換、不會幫現有元件加 variant、也不會新建元件，只在報告裡留下一行。
3. **設計師無法介入**：分組審查時看不到「它被配到哪個現有元件」，也沒有「不要沿用、改建新的」或「改沿用另一個元件」的選項。

結果是設計師期待的「先用現有元件組裝，找不到才新建」沒有完整成立，而且可能在 Components 頁面產生同名的重複元件。

## What Changes

- **比對改成骨架、名稱、外觀一起看**：骨架相同的現有元件全部列為候選；名稱或 UI 類型相同的優先；再用外觀（顏色、圓角、間距、高度、字級）選最接近的。名稱明顯不同類型的（按鈕對上 Chip）不會自動沿用。
- **每一個原稿都先配好要用哪個 variant**：偵測階段就為每個原稿指定現有元件中最接近的 variant，替換時直接使用，不再到替換時才發現「沒有相符的 variant」。
- **骨架和名稱都對、但沒有合適 variant 時改成詢問設計師**，三個選項：在現有 component set 加一個 variant、建立新元件、維持原樣。
- **在現有 component set 加 variant**（設計師選擇後才做）：從原稿的 clone 建立新 variant，沿用該 set 自己的屬性名稱，把元件屬性連結照最接近的現有 variant 接上；不移動、不修改任何現有 variant。
- **分組比對區塊並排顯示配對**：每一組的原稿樣本旁邊，放上被配到的現有元件的 instance，並標示配對品質；另外列出骨架相同的其他現有元件供選擇。
- **分組審查新增兩個選項**：「不沿用，建立新的」與「改沿用另一個元件」。設計師指定的元件骨架不同時，明確告知無法證明外觀相同，改問「建立新的」或「維持原樣」。
- **避免同名重複元件**：要新建的元件與現有元件同名時，先請設計師給一個可區分的名稱或排除，不會默默建出第二個同名元件。
- **計畫與報告補上沿用細節**：沿用哪個現有元件的哪個 variant、新增了哪些 variant、哪些是設計師決定不沿用的。

## Non-Goals (optional)

（本變更會建立 design.md，範圍排除與被否決的做法記錄在 design.md 的 Goals / Non-Goals。）

## Capabilities

### New Capabilities

- `componentize-reuse-matching`: 沿用現有元件的完整規則——現有元件清單的收集、以骨架／名稱／外觀判定配對與排序、為每個原稿指定 variant、沒有合適 variant 時由設計師決定（加 variant、新建、維持原樣）、在現有 component set 新增 variant 的做法與安全條件、分組比對區塊的配對顯示與新增選項、同名元件的處理，以及計畫、報告與文件的對應內容。

### Modified Capabilities

(none)

## Impact

- Affected specs: `componentize-reuse-matching`（新增）。既有的 `componentize-detection`、`componentize-build`、`componentize-replacement`、`componentize-skill-guide` 尚未封存到 openspec/specs，本變更以新增 capability 的方式補充它們的沿用規則，不修改既有 requirement 的文字。
- Affected code:
  - New:
    - (none)
  - Modified:
    - `figma-componentize/SKILL.md`
    - `figma-componentize/references/detection.md`
    - `figma-componentize/references/build-recipes.md`
    - `figma-componentize/references/replacement.md`
    - `figma-componentize/docs/index.html`
  - Removed:
    - (none)
