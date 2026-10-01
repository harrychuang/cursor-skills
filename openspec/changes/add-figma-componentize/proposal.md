## Why

設計稿中常有沒做成元件的散圖層：同樣的按鈕、卡片、列表項目各畫一份，也沒有套用 tokens。整理成元件庫目前要靠人工逐一建立元件、設定 variants 與屬性，再一個個替換原稿，費時又容易漏。figma-m3-variables 已經能把寫死的數值轉成 tokens（Workflow F），但還沒有 skill 負責判斷哪些 UI 該做成元件、建立元件並替換原稿。

## What Changes

- 新增 `figma-componentize` skill：設計師提供 section、frame 或單一元件的連結後，AI 判斷其中哪些 UI 還不是元件並提出元件化計畫；確認後在 Components 頁面建立元件，呼叫 figma-m3-variables 的 Workflow F 建立並套用 tokens，最後把原稿替換成 instance 並驗證外觀不變。
- 判斷規則：依設計師給的範圍處理，不要求同一個 UI 重複出現兩次；以 UI 模式（按鈕、輸入框、卡片、列表項目等）與結構特徵找出候選，排除畫面層級的容器與純排版用的外框；無法確定時詢問。
- 分組規則：結構相同、只有內容不同，做成同一個元件並加上元件屬性（文字、圖示替換、顯示開關）；結構相同但樣式、尺寸或狀態不同，做成同一個 component set 的 variants；結構不同則是不同元件；檔案中已有相符的元件就直接重用。
- 由小到大建立：先建按鈕這類小元件，再建包含它們的卡片，較大的元件內部使用小元件的 instance。
- 視覺化確認：在範圍旁建立暫時的比對區塊，並排顯示每個候選元件的實際樣子，讓設計師確認分組、命名與拆併；tokens 的近似值沿用 Workflow F 的比對板。
- 安全機制：沿用 figma-m3-variables 的變動分級；寫入前請使用者先手動存一個版本（`use_figma` 無法自動存版本），並記錄「原稿 → 元件 → instance」的 ID 對照表；替換原稿屬於 Tier 3，先隱藏原稿再放入 instance，逐項比對位置、尺寸與文字，不一致就恢復原稿並回報；最後以前後截圖比對。
- 依 Figma 官方 figma-generate-library 的慣例：variants 排成格狀（State 為欄、間距 20 px、內距 40 px，一個 set 最多 30 種組合），元件屬性加在 component set 上，較大元件中的小元件設為 exposed instance；所有腳本的回傳控制在 `use_figma` 每次 20kB 的上限內。
- 新增中文文件頁；figma-m3-variables 裡標示「規劃中」的 figma-componentize 改為正式分工。

## Capabilities

### New Capabilities

- `componentize-detection`: 範圍與前置檢查、候選 UI 的偵測與排除、分組成元件／variants／元件屬性、重用既有元件、信心度與提問，以及分組比對區塊。
- `componentize-build`: 版本紀錄、Components 頁面、由小到大建立主元件、元件屬性、variants 與 component set 的排列、命名與頁面擺放。
- `componentize-token-integration`: 以新建的元件為範圍呼叫 Workflow F、執行順序、使用者略過 tokens 時的處理，以及回傳結果的使用。
- `componentize-replacement`: 以 instance 替換原稿（位置、排版屬性、內容覆寫、圖層名稱）、逐項驗證與保留原稿的退路、整體截圖比對與報告。
- `componentize-skill-guide`: SKILL.md 的流程與變動分級、參考文件分工、觸發描述、中文文件頁，以及與 figma-m3-variables 的交叉引用。

### Modified Capabilities

(none)

## Impact

- Affected specs: `componentize-detection`, `componentize-build`, `componentize-token-integration`, `componentize-replacement`, `componentize-skill-guide`
- Affected code:
  - New:
    - `figma-componentize/SKILL.md`
    - `figma-componentize/references/detection.md`
    - `figma-componentize/references/build-recipes.md`
    - `figma-componentize/references/replacement.md`
    - `figma-componentize/docs/index.html`
  - Modified:
    - `figma-m3-variables/SKILL.md`
    - `figma-m3-variables/docs/index.html`
  - Removed:
    - (none)
