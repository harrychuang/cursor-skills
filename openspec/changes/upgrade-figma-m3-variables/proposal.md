## Why

figma-m3-variables 目前只能依設計指南或使用者的回答「由上而下」建立 tokens 再套用，無法把設計稿裡已經寫死的色彩、文字、圓角、間距等數值反推成 Ref → Sys → Comp tokens；即將建立的元件化 skill（`figma-componentize`）正需要這個能力。此外，文字 tokens 被「只有檔案已用 Variables 管理文字時才使用」的規則擋住，陰影、描邊寬度、透明度只有 scope 沒有規格與綁定方式；綁定前也不會比對 token 值與節點原值，可能在使用者不知情的情況下改變設計稿外觀。

## What Changes

- 新增 Workflow F「把既有設計數值 token 化」：收集指定範圍（單一節點、section、page 或元件）內寫死的色彩、文字、圓角、間距、尺寸、描邊寬度、透明度與陰影 → 自動合併完全相同的值 → 列出近似值並附 Figma 比對板與截圖，由使用者決定是否合併 → 推論 Sys 語意與 Comp 結構 → 建立 tokens 並綁定 → 前後比對，確認外觀不變。
- 補齊 token 規格：文字（Ref 字型原始值、Sys typescale、綁定 variables 的 Text Styles）、陰影（綁定 variables 的 Effect Styles）、描邊寬度、透明度、尺寸；新增 Sys 語意詞彙表（M3 色彩角色、間距階梯、圓角階梯、typescale、elevation 等級）與命名編碼規則（小數、負數、透明度）；半透明填色優先使用 2026 新增的 composed 色彩變數（色彩與透明度分成兩個 token），不支援時退回其他方法，確保外觀不變；scope 表加入 2026 新增的 `COLOR_OPACITY`。
- 新增變動分級與確認機制：分為唯讀、單一目標且外觀不變、批次或結構性、會改變外觀或具破壞性四級，各級有明確的確認要求；會改變外觀的變動一律附視覺證據並取得使用者確認。
- 綁定前比對 token 解析值與節點原值，不一致即視為外觀變動；偵測到 library variables 時，不在本地建立重複的 tokens。
- **BREAKING** Comp 狀態 token 改用 M3 目前的順序（元件 → variant → 選取狀態 → 互動狀態 → 結構 → 屬性，例如 `comp/filled-button/disabled/container/background-color`）；舊的 `…/{property}/{state}` 由稽核規則偵測並提供改名遷移，既有綁定不受影響。
- **BREAKING** 修正規格與範例錯誤：`sys/shape/corner-full` 改為全圓（`ref/radius/9999`）、間距階梯統一後 `gap-inline-sm`（8）改為 `gap-inline-xs`、state layer 不透明度更新為 M3 現行值（focus、pressed 由 12% 改為 10%）。
- 擴充稽核規則：Ref 名稱與數值不符、重複或近似重複的 Ref、Sys 階梯標籤不一致、元件中未綁定的寫死數值（token 覆蓋率）、Styles 未綁定 variables、舊式狀態命名、名稱格式；並修正既有偵測腳本（use_figma 每次呼叫從第一頁開始，跨頁搜尋改為逐頁執行；型別對照表不完整）。
- 重整 skill 結構：SKILL.md 新增流程路由表、共用程序與變動分級；Plugin API 程式碼移到新的 binding recipes 與 value harvest 參考文件；提問方式改為不綁定特定編輯器；同步更新中文文件頁。
- 新檔案的預設 collection 結構改為 Reference / System / Component 三個 collection（Component 內以群組區分元件）；既有檔案沿用原有結構。

## Capabilities

### New Capabilities

- `m3-token-harvest`: 從既有設計數值反推 Ref → Sys → Comp tokens（Workflow F），包含近似值的視覺比對與使用者確認、綁定，以及外觀不變的驗證。
- `m3-token-vocabulary`: 各類 token 的命名與編碼、Sys 語意詞彙表、文字與陰影的 Styles 綁定模式、狀態 token 命名與 scope 規則。
- `m3-change-safety`: 變動分級與確認機制、綁定前的數值比對、library variables 處理，以及從檔案推斷既有慣例。
- `m3-token-audit`: 擴充後的稽核規則、嚴重度分級與報告格式。
- `m3-skill-guide`: SKILL.md 的流程路由、共用程序、參考文件分工，以及中文文件頁與 skill 內容同步。

### Modified Capabilities

(none)

## Impact

- Affected specs: `m3-token-harvest`, `m3-token-vocabulary`, `m3-change-safety`, `m3-token-audit`, `m3-skill-guide`
- Affected code:
  - Modified:
    - `figma-m3-variables/SKILL.md`
    - `figma-m3-variables/references/token-spec.md`
    - `figma-m3-variables/references/audit-rules.md`
    - `figma-m3-variables/docs/index.html`
  - New:
    - `figma-m3-variables/references/value-harvest.md`
    - `figma-m3-variables/references/binding-recipes.md`
  - Removed:
    - (none)
