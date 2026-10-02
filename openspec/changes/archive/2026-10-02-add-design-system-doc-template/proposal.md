## Why

figma-componentize 現在已經能產生設計系統文件，但文件的排版只是基本的白底樣式，字級、間距和區塊排法都散在各個腳本裡。不同的 AI 執行時對這些細節的理解可能不一樣，產生出來的文件就會長得不一樣；文件也缺少封面摘要、目錄與段落層次，不容易閱讀。

設計師已經確認一版 Apple 風格的 HTML demo（版型規格頁的數值即為規格），希望把它做成 Figma 設計系統文件的固定版型（template）：不同專案、不同次執行，產生的文件版面都一致，只有內容不同。

## What Changes

- **固定版型**：文件本身的版面、顏色、字級、圓角、間距與每一種區塊的尺寸，集中定義在一個版型設定裡。所有產生文件的腳本都從這裡取值，腳本裡不再出現各自寫死的顏色或字級。版型不使用專案的 tokens，所以每個專案的文件看起來一樣。
- **照 demo 排版**（Figma 外框 1440 寬、左右邊界 120、內容 1200）：
  - **封面**：「設計系統」、檔名、產生日期、Tokens／Styles／Components／Icons 四個數字、兩則提示，以及連到各段落的目錄。
  - **大段標題**：基礎（Foundations）與元件（Components），右側顯示數量。
  - **小段標題**：顏色、文字樣式、間距與尺寸、圓角、陰影、其他 tokens、圖示，以及每個元件，上方有分隔線、右側顯示數量。
  - **顏色**：所有 collection 放在同一個「顏色」段落裡，每個 collection 一個小標題（附 mode 標籤），色票卡片照 demo 的尺寸排列。
  - **文字樣式、間距、圓角、陰影、其他 tokens、圖示、元件區塊**：照 demo 的尺寸與排法（例如元件下方的屬性表與 tokens 清單分成左右兩欄）。
  - **頁尾**：產生工具與日期。
- **字型粗細**：版型用到 Regular、Medium、Semibold、Bold 四種粗細；寫入前確認字型有哪些粗細可以載入，缺少時改用最接近的。英文標題的字距照 demo 收緊，中文字距為 0。
- **新增的標題文字**：目錄、基礎、元件、四個數字的名稱、頁尾等，英文與繁體中文兩組都補齊。
- **Demo 放進 repo**：把確認過的 HTML demo 存成 skill 的版型參考頁，文件頁與參考檔都連到它；參考頁的數值和版型設定必須一致。
- **行為不變**：開始時的兩個問題、只寫事實、樣本綁定 token、只新增不修改、分批寫入、取代舊文件的流程、驗證與報告，都和現在相同。

## Non-Goals (optional)

（本變更會建立 design.md，範圍排除與被否決的做法記錄在 design.md 的 Goals / Non-Goals。）

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `componentize-design-system-doc`: 文件改用固定版型——根外框的尺寸與間距、封面與目錄、大段與小段標題、頁尾、所有顏色集中在一個段落、各區塊的尺寸與排法、字型粗細與字距、新增的標籤鍵值、收尾步驟（目錄與頁尾）、版型參考頁，以及說明文件中的版型說明。

## Impact

- Affected specs: `componentize-design-system-doc`（修改）
- Affected code:
  - New:
    - `figma-componentize/docs/document-template.html`
  - Modified:
    - `figma-componentize/references/documentation.md`
    - `figma-componentize/SKILL.md`
    - `figma-componentize/docs/index.html`
    - `figma-componentize/README.md`
  - Removed:
    - (none)
