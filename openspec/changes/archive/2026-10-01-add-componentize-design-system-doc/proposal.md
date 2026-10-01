## Why

figma-componentize 跑完之後，檔案裡有整理好的元件和 tokens，但沒有一份可以直接看的設計系統文件。設計師想知道「這個檔案有哪些顏色、字級、間距，有哪些元件、各有哪些 variants」，目前只能自己翻 Variables 面板和 Components 頁面，或手動排一份文件；手排的文件在 token 改動後也不會跟著更新。

目前的 skill 把「文件 frame」明確列為不處理的範圍。使用者希望改成：執行時先問要不要產生文件，要的話就在一個頁面裡，自動產生涵蓋檔案內所有元件與 tokens 的完整設計系統文件。

## What Changes

- **開始時詢問**：設計師給了範圍之後，先問「最後要不要產生設計系統文件」。選「要」才產生；選「不要」就完全不產生，之後也不再問。
- **選擇文件語言**：回答「要」之後，接著問文件上的標題與欄位名稱要用哪一種語言。預設是英文，也可以選繁體中文或指定其他語言。只有 skill 自己產生的標題與欄位名稱會跟著語言變；token 名稱、元件名稱、數值，以及設計師寫的元件描述都照原樣顯示。
- **產生完整文件**：在元件化、token 化與替換都結束之後，於一個名為 `Design System` 的頁面中產生文件（檔案已有設計系統或 Foundations 頁面時沿用那一頁）。文件涵蓋檔案內**所有** local 元件與 tokens，不只這次建立的。
  - **Foundations**：顏色（依 collection 與群組排列，每個 mode 各一格色票）、字級（Text Styles 樣本）、間距與尺寸、圓角、陰影（Effect Styles），以及其他數值與文字 tokens。樣本直接綁定對應的 token，token 改了，樣本會跟著變。
  - **Components**：每個元件一區，包含名稱、元件描述、每個 variant 的 instance、屬性清單、用到的 tokens，以及回到主元件的連結。小型圖示元件集中成一個圖示格。
- **只寫事實**：文件內容只來自檔案本身（名稱、variants、屬性、tokens）。用途說明取自設計師寫在元件「描述」欄位的文字；沒有寫就不顯示，AI 不自行撰寫用途說明。
- **只讀取、不修改**：不建立也不修改任何 token、style 或元件；Foundations 只呈現現有的 tokens。文件裡的元件樣本都是 instance，不會在檔案中多出元件。
- **先盤點再動手**：產生前先列出數量（元件、tokens、styles）與預估規模；數量很大時先請設計師確認或縮小範圍。
- **可以單獨執行**：設計師只說「幫我產生設計系統文件」時，略過元件化，直接盤點並產生。
- **重新產生**：檔案中已有先前產生的文件時，先問設計師：取代舊的、保留舊的並在旁邊產生新的，或略過。取代只移除先前產生的內容，設計師自己放在頁面上的東西不會被動到。
- **頁數上限**：免費方案頁數已滿、無法新增頁面時，改放在設計師指定頁面上的 `Design System` 區塊。
- **計畫與報告**：計畫列出文件步驟；報告列出文件頁連結、各區塊的數量，以及沒有產生的項目與原因（例如字型無法載入）。
- 說明文件同步更新：SKILL.md 的步驟、變動分級與觸發描述，中文文件頁與 README 的使用者旅程。

## Non-Goals (optional)

（本變更會建立 design.md，範圍排除與被否決的做法記錄在 design.md 的 Goals / Non-Goals。）

## Capabilities

### New Capabilities

- `componentize-design-system-doc`: 設計系統文件的可選步驟——開始時的詢問（是否產生、文件語言）與單獨執行、文件頁面與固定名稱的外框、tokens 與元件的盤點與規模確認、Foundations 與元件區塊的內容規則、分批寫入與進度紀錄、重新產生時的取代規則、只新增不修改的安全條件、驗證與報告，以及 SKILL.md、文件頁與 README 的對應說明。

### Modified Capabilities

(none)

## Impact

- Affected specs: `componentize-design-system-doc`（新增）
- Affected code:
  - New:
    - `figma-componentize/references/documentation.md`
  - Modified:
    - `figma-componentize/SKILL.md`
    - `figma-componentize/references/detection.md`
    - `figma-componentize/references/build-recipes.md`
    - `figma-componentize/references/replacement.md`
    - `figma-componentize/docs/index.html`
    - `figma-componentize/README.md`
  - Removed:
    - (none)
