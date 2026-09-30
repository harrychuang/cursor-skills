## Context

figma-m3-variables 透過 Figma MCP 的 `use_figma`（執行 Plugin API 腳本）在 Figma 中管理 M3 三層 tokens（Ref → Sys → Comp）。目前內容：

- SKILL.md 約 340 行，五個 workflow：A 套用既有 Variables、B 建立 Variables、C 稽核、D 從 Variables 設計元件、E 批次套用。
- references：token spec（命名、scope、Filled Button 範例、狀態）與 audit rules（11 類違規）。
- 中文文件頁是 SKILL.md 的鏡像，供設計師閱讀。
- 已安裝副本（使用者家目錄下的 Claude、Cursor、Agents、Codex skills 目錄）與 repo 版本完全相同；design-workspace-starter 以 managedSkills 從 GitHub 拉取整個資料夾，其 .claude/skills 內只有轉址 wrapper。

需要補的三個缺口：

1. 無法把設計稿中寫死的數值反推成 tokens：Workflow B 的值來自設計指南或詢問，token spec 只有一段五步驟的簡短延伸說明。
2. 文字 tokens 被「只有檔案已用 Variables 管理文字時才使用」的規則擋住，清單只有字級與字重。
3. 陰影、描邊寬度、透明度只有 scope，沒有 token 清單與綁定方式。

其他問題：綁定前不比對 token 值與節點原值；確認機制只有「批次先 dry-run」一條；Workflow D 的探索腳本從 document root 搜尋元件，在 use_figma 中只會涵蓋第一頁；`sys/shape/corner-full` 對應 12；範例中 `inset-vertical-sm` 為 12、`gap-inline-sm` 為 8，同一標籤兩個值；狀態 token 放在屬性之後（`…/background-color/hovered`），與 M3 官方順序不同；提問只寫了 Cursor 的 AskQuestion。

使用者已確認的決策：近似值不自動合併，要列出差異並附圖讓使用者判斷；較大的變動一律先與設計師或使用者確認。本 skill 之後會被元件化 skill（`figma-componentize`）呼叫來處理 token 步驟。

限制：`use_figma` 呼叫必須依序執行；本 repo 沒有 Figma 執行環境，無法自動化測試腳本，驗收以內容檢查、跨檔一致性檢查與 `spectra validate` 為主。

查證結果（2026-09-30；來源為 Figma Plugin API typings 與開發者文件、Figma Help Center、Figma 官方 figma-use skill、DTCG 2025.10、material-web token 原始碼 v34）：

| 項目 | 結果 |
| --- | --- |
| Variable 名稱 | 不可含 `.`、`{`、`}`；`/` 產生群組 |
| 名稱同時是 variable 與群組（`a/b` 與 `a/b/c`） | Figma 官方範例同時建立 `brand/primary` 與 `brand/primary/opacity`，很可能被接受；但 DTCG 2025.10 視為錯誤，Figma 的 DTCG 匯入會丟棄轉換後重複的名稱，應避免 |
| 圖層 opacity 變數 | 值為 0 到 100；`node.opacity` 讀回為 0 到 1；`resolveForConsumer` 回傳原始值 |
| 行高與字距變數 | 只支援 px，不支援百分比 |
| 可綁定的文字欄位 | fontFamily、fontSize、fontStyle、fontWeight、letterSpacing、lineHeight、paragraphSpacing、paragraphIndent；Text Style 以 `setBoundVariable` 綁定；在節點上綁定很可能會 detach 該節點的 Text Style |
| Effect | `setBoundVariableForEffect` 回傳複本；Effect Style 沒有 `setBoundVariable`，要重新指定 `effects`；有綁定後其他欄位被重設的回報，需逐欄讀回 |
| 填色綁定色彩變數 | `setBoundVariableForPaint` 只綁 `color`，回傳複本，且不會更新 paint 的 color 字面值（需自行填入解析值）；綁定後的 paint opacity 沒有官方說明，第三方量測顯示只有「在新建的 paint 物件上先設 opacity 再綁定」會保留，對回傳的 paint 或複製的既有 fill 設定都會變成 1 |
| Composed 色彩（2026-09-17，plugin typings 1.139.0） | `VariableComposedColor` 是 COLOR 變數的值（以 `setValueForMode` 設定），型別為 `{ color: RGB 或 RGBA; opacity: VariableAlias }` 或 `{ color: VariableAlias; opacity: number 或 VariableAlias }`，opacity 為 0 到 100；透明度 token 使用 `COLOR_OPACITY` scope；paint 綁定這個 COLOR 變數即可，描邊、漸層停點與陰影顏色很可能也適用 |
| Composed 色彩與 use_figma | 官方沒有明文說明；Figma staff 於 2026-09-28 確認寫入已可用（plugin-typings issue 375）；沒有版本旗標可偵測（`figma.apiVersion` 固定為 1.0.0）；舊版曾以 `VARIABLE_EXPRESSION`／`COMPOSE_COLOR` 形狀回傳，讀取時兩種形狀都要接受 |
| use_figma | 不支援 `loadAllPagesAsync()`；每次呼叫從第一頁開始，`figma.currentPage = …` 會出錯，需以 `setCurrentPageAsync` 切換；`mainComponent` 需改用 `getMainComponentAsync()` |
| 上限 | 每個 collection 最多 5000 個 variables；modes 上限 Starter 1、Professional 10、Organization 20、Enterprise 更多；超過上限時錯誤訊息為 `in addMode: Limited to N modes only` |
| M3 state layer | hover 8%、focus 10%、pressed 10%、dragged 16%；disabled 內容 38%；disabled 容器依元件不同（Expressive 按鈕 10%、chips 12%、filled text field 4%） |
| M3 元件 token 順序 | 元件 → variant → 選取狀態 → 互動狀態 → 結構 → 屬性（如 `md.comp.button.filled.hovered.state-layer.opacity`）；新版元件用 hovered、focused、pressed，較舊元件仍用 hover、focus |
| M3 shape | none 0、extra-small 4、small 8、medium 12、large 16、large-increased 20、extra-large 28、extra-large-increased 32、extra-extra-large 48、full（web 為 9999px） |
| figma-use 與官方文件不符之處 | figma-use 稱 fontSize、fontWeight、lineHeight 不能綁定，以及 Professional 只有 4 個 modes；官方文件分別為可以綁定與 10 個 |

## Goals / Non-Goals

**Goals:**

- Workflow F 能以單一節點、section、page、元件或 component set 為範圍，把寫死的數值轉成三層 tokens 並綁定，外觀不變。
- 近似值以 Figma 比對板加截圖呈現，由使用者逐組決定是否合併。
- token 規格涵蓋色彩、文字、圓角、間距、尺寸、描邊寬度、透明度與陰影，並有明確的 Sys 詞彙表，讓 AI 的對應結果可預期。
- 所有寫入依變動分級取得對應等級的確認，會改變外觀的變動一定附視覺證據。
- 稽核能發現 token 覆蓋率不足、數值漂移與命名問題。
- SKILL.md 以路由表與共用程序為骨架，程式碼集中到 references，中文文件頁同步更新。

**Non-Goals:**

- 偵測散圖層、建立元件、把原稿換成 instance：屬於 `figma-componentize`，由下一個 change 處理。
- 同步家目錄下的已安裝副本：位於 repo 之外，完成後詢問使用者是否同步。
- 修改 design-workspace-starter 與 create-design-workspace 內的 wrapper：它們只轉址，不需改動。
- 產生程式碼端的 token 檔案（CSS 等）：屬於 design-system-governance。
- Light/Dark 以外的多品牌或密度 mode 管理。
- 為 Plugin API 腳本建立自動化測試。
- 動態 tokens（2026 新增的 EASING、TIMING variables）。

## Decisions

### Workflow F 放在 figma-m3-variables

「把寫死數值 token 化」是 token 領域的能力，沒有元件化也用得到（例如把整頁寫死的色碼改成 tokens），因此放在本 skill，元件化 skill 只呼叫它。Workflow F 對外提供固定的輸入（scope node IDs、可選的元件名稱）與輸出（各層建立的 variable IDs、styles、綁定、合併群組、略過項目）。

替代方案：放在 `figma-componentize` 內。拒絕原因：token 規則會出現兩份，日後修改容易不一致。

### 變動分級取代單一 dry-run 規則

原本只有「超過一個節點要先 dry-run」。改為四級：

| 級別 | 內容 | 確認方式 |
| --- | --- | --- |
| Tier 0 唯讀 | 盤點、檢查、收集數值、稽核報告、dry-run 計畫 | 不需確認 |
| Tier 1 單一明確目標且外觀不變 | 在使用者指定的一個節點綁定數值相同的 token，或為它建立最多 10 個 variables | 顯示對應表後等待確認；使用者明說直接套用則可略過 |
| Tier 2 批次或結構性，外觀不變 | 跨多個節點綁定、建立 collection 或 mode、一次建立超過 10 個 variables、建立或修改 Styles、從節點 detach Style、改名、把 paint opacity 移到圖層 opacity | dry-run 計畫並等待確認；使用者明說不需審閱即可略過 |
| Tier 3 會改變外觀或具破壞性 | 綁定數值不同的 token、合併近似值、把數值貼齊階梯、修改已被使用的 token 值或 alias、刪除、移除綁定、更換 prefix | 附視覺證據，逐組取得確認；任何「全部自動套用」都不能略過 |

替代方案：每一步都確認，太吵；只確認批次，會漏掉單一節點上改變外觀的操作。

### 綁定前比對解析值以確保外觀不變

每個綁定前用 `resolveForConsumer` 取得 token 在該節點的解析值並與目前值比對。色彩比實際呈現的色彩與透明度（變數解析值含 alpha 或 composed 透明度，再乘上 paint 自身的 opacity），數值差小於 0.01 視為相同，文字需字型、樣式、字級、行高、字距全部相同。不一致就升為 Tier 3，計畫中並列兩個值。綁定後再讀回一次，確認與原值或使用者核准的合併值相同。

替代方案：只看截圖。拒絕原因：小差異（例如 #1A73E8 與 #1A73E9）肉眼看不出來，但會造成 token 錯置。

### 近似值以比對板與截圖交由使用者決定

近似門檻：色彩 CIE76 ΔE ≤ 3 且 paint opacity 相同；間距、尺寸、圓角、描邊寬度差 ≤ 1px 或 ≤ 較大值的 5%（取較大者）；文字同字型字重、字級差 ≤ 1px、行高差 ≤ 2px、字距差 ≤ 0.2px；陰影層數相同且各參數差 ≤ 1px、顏色 ΔE ≤ 3；透明度差 ≤ 5 個百分點。不在檔案 Sys 階梯上的值也列入；兩個值都在階梯上（例如間距 2 與 4、hover 8% 與 focus 10%）時不列為近似值。（實作時修正：原門檻 2px／ΔE 5 會把階梯上相鄰的值與 M3 刻意區分的 surface 層級誤判為近似值。）

比對板建在範圍所在頁面、既有內容旁的 Section（名稱 `Token Review — temporary`；use_figma 每次呼叫從第一頁開始，須先切換到該頁），每組一列：視覺樣本（色塊、間距條、圓角方塊、文字樣本、陰影卡片）、數值、使用次數、連到來源節點的超連結，並標示建議值。完成後截圖並提供 Figma 連結，使用者逐組選擇「合併到建議值／合併到其他值／全部保留」。決定套用後刪除 Section（使用者要求保留則保留）。

替代方案：自動合併到最常用的值（使用者已否決）；另開暫存頁面（部分 Figma 方案有頁數上限，且使用者要切換頁面才看得到）。

### 文字與陰影預設採 Styles 模式

文字：Sys typescale variables（`sys/typescale/{role}/font|weight|size|line-height|tracking`）alias Ref 字型原始值；每個用到的 role 建一個 Text Style（例如 `label/large`），其欄位綁定 Sys typescale variables；文字節點套用 Text Style。陰影：Sys elevation variables（`sys/elevation/level{n}/shadow-{i}/color|offset-x|offset-y|blur|spread`）；每個用到的等級建一個 Effect Style（例如 `elevation/level1`），欄位綁定 variables；節點套用 Effect Style。

Variables 模式（在文字節點直接綁 Comp typography tokens，如 `comp/filled-button/label-text/size`）在檔案已使用這種做法、或使用者要求元件層級文字 tokens 時採用。

理由：設計師習慣用 Text Styles 挑字級；每個文字節點只需套一個 style，而不是綁五個 variables；Figma 官方 Simple Design System 也採用綁定 variables 的 Text Styles；查證顯示在節點上直接綁文字 variables 很可能會 detach 該節點的 Text Style，因此 Styles 模式把 variables 綁在 Text Style 上，Variables 模式遇到已套用 Text Style 的節點則列為 Tier 2。這個做法下，文字與陰影屬於「複合屬性」，綁定目標是 Sys 層的 Style，是「優先綁 Comp」規則的明確例外。

替代方案：一律直接綁 variables，綁定數量多，且設計師無法沿用 Text Styles 選字級。

### Sys 語意詞彙表與階梯

token spec 提供預設詞彙，讓對應結果可預期；檔案已有的階梯永遠優先：

- 色彩：M3 色彩角色（primary、on-primary、primary-container、surface、surface-container 系列、on-surface、on-surface-variant、outline、outline-variant、inverse、scrim、shadow 等），另可延伸 success、warning。
- 間距：角色 `inset-horizontal`、`inset-vertical`、`inset`、`gap-inline`、`gap-stack`；階梯 `3xs 2 · 2xs 4 · xs 8 · sm 12 · md 16 · lg 20 · xl 24 · 2xl 32 · 3xl 40 · 4xl 48 · 5xl 64`，同一標籤在所有角色代表同一個值。
- 圓角：M3 shape scale（含 M3 Expressive 新增等級），`corner-full` 對應 `ref/radius/9999`。
- 文字：M3 typescale 15 個 role。
- 陰影：M3 elevation level0 到 level5。
- 描邊寬度 `thin 1 · medium 2 · thick 3`；尺寸 `icon-*`、`control-height-*`、`touch-target-min`；狀態透明度沿用 M3 sys 名稱：hover 8、focus 10、pressed 10、dragged 16、disabled content 38、disabled container 預設 12（M3 Expressive 按鈕為 10、filled text field 為 4，檔案中的實際值優先）。

介於兩個階梯之間的值，提供「貼齊」（Tier 3）或「保留為自訂階梯 `{較小階梯}-plus`」兩種選擇。

替代方案：數字型階梯（如 `space-4`），與既有 t-shirt 命名不一致；依角色各自排序的階梯，同一標籤在不同角色代表不同值，AI 無法穩定對應。

### 命名編碼規則

名稱每段只用小寫英數、`-`、`_`；小數點改用 `_`（0.5 → `0_5`）；負數加 `neg-`（−0.25 → `neg-0_25`）；透明度用百分比整數（38）；色彩 tone 取 CIE L* 四捨五入（M3 HCT 的 tone 就是 L*）；帶 alpha 的色彩（例如陰影色）加 `-a{百分比}`（`ref/color/neutral/0-a15`）；不使用 `.`。WEB code syntax 由名稱推導，`/` 轉 `-`。

理由：名稱需能直接轉成合法的 CSS 自訂屬性，且 Ref 名稱要能反推數值，供稽核規則 12 比對。

### 狀態 token 採 M3 官方順序

Comp 名稱順序改為 M3 目前的順序：`comp/{component}[/{variant}][/{size}][/{condition}][/{state}]/{anatomy}/{property}`。variant 與 size 來自會改變 token 值的 variant 屬性；condition 為 `selected`、`unselected`、`error`；state 為 `hovered`、`focused`、`pressed`、`dragged`、`disabled`（M3 新版元件的用字）。Figma variant 值對應：Hover/Hovered → hovered、Focus/Focused → focused、Press/Pressed → pressed、Drag/Dragged → dragged、Disabled → disabled、Selected → selected、Unselected → unselected、Error → error；Default、Enabled、Rest 不加段落。Sys 層的狀態透明度沿用 M3 sys 名稱 `sys/state/hover/state-layer-opacity` 等。

理由：與 M3 目前的 token 結構一致（如 `md.comp.button.filled.hovered.state-layer.opacity`）；component set 的 variant 可以直接對應成名稱段落；同一狀態的 tokens 在 Variables 面板中會群組在一起；也避免舊寫法讓一個名稱同時是 variable 又是群組前綴（DTCG 2025.10 視為錯誤，Figma 的 DTCG 匯入會丟棄重複）。檔案已使用 M3 較舊用字（hover、focus）時沿用，不強制改名。

遷移：舊命名由稽核規則 17 偵測，修正方式是原地改名；綁定與 alias 以 ID 連結，改名不受影響。檔案若仍是舊命名，在使用者遷移之前新增的狀態 tokens 沿用舊命名，避免同一檔案混用兩種順序。

### 新檔案預設三個 collection

新檔案預設 `{Prefix} · Reference`、`{Prefix} · System`、`{Prefix} · Component`（Component 內以群組區分元件）。每個元件一個 collection（`{Prefix} · Component · {ElementName}`）保留為選項；既有檔案沿用原結構。

理由：元件化會一次產生許多元件，每個元件一個 collection 會讓 collection 清單暴增。

### 慣例推斷優先於提問

prefix、collection 結構、文字與陰影的綁定模式、間距與圓角階梯、狀態 token 順序、Ref 色彩分類（`palette` 或 `color`）都先從檔案既有的 Variables 與 Styles 推斷；只有檔案沒有線索時才詢問，確認後整個 session 固定。

### Library variables 不在本地複製

目標節點已綁定 library（remote）variables，或使用者說明 tokens 放在 library 檔案時，不在本地建立相同角色的 variables；需要的 token 已存在就匯入後綁定；缺少的 token 列出清單，詢問使用者要到 library 檔案新增，或暫時在本地處理。

### 半透明填色維持實際呈現

查證顯示，填色綁定色彩變數後，很可能由變數的 alpha 決定透明度，原本的 paint opacity 不一定保留；直接綁定不透明的 token 可能讓半透明的填色變成不透明。因此 paint opacity 小於 1 的填色依序採用第一個可行的方法：

1. Composed 色彩（2026-09-17 新增）：建立一個 COLOR 變數，值為「色彩 alias 指向不透明的基底色 token、透明度 alias 指向 `COLOR_OPACITY` scope 的透明度 token」，paint 綁定這個變數，paint 本身的 opacity 設為 100%。例如 `comp/filled-button/disabled/container/background-color` 的值組合 `sys/color/on-surface` 與 `sys/state/disabled/container-opacity`（12）。這是最貼近 M3「色彩與透明度分開」的做法，也符合 Comp → Sys 的 alias 方向。
2. 葉節點圖層（只有一個可見填色，沒有描邊、效果與子節點，例如 state layer、scrim、disabled 背景）：基底色綁不透明的 token、paint opacity 設為 100%，圖層 opacity 綁透明度 token（Tier 2，視覺等價）。
3. 其他情況：綁定最終指向帶 alpha 的 Ref 色彩（`ref/color/neutral/0-a12`）的 token 鏈。

三種方法都在綁定後讀回，確認實際呈現的色彩與透明度不變。能力偵測：use_figma 沒有版本旗標，因此不另外建立探測用的 collection，而是在使用者已核准的寫入中直接嘗試設定 composed 值；失敗就對該組填色改用方法 2 或 3，並在回報中註明。綁定時一律建立新的 paint 物件、填入解析後的色彩與預期的 opacity 後再綁定，不修改回傳或複製的 paint。陰影顏色：composed 色彩可用時與填色相同處理，否則使用 `-a{百分比}` 的 Ref 色彩。

替代方案：保留 paint opacity 只綁基底色。拒絕原因：查證顯示綁定後 paint opacity 不一定保留，會改變外觀。

### Skill 結構重整為路由加共用程序

- SKILL.md：frontmatter（含中文觸發詞、1024 字元內）、流程路由表、通用規則、變動分級、命名摘要、共用程序（P1 探索設計指南、P2 token 盤點、P3 目標結構檢查、P4 綁定、P5 驗證）、Workflows A 到 F、分工表、reference 清單。不放超過 15 行的腳本。
- token spec：命名、編碼、詞彙表、scope、bindable property map、範例、狀態、mode。
- value harvest（新）：Workflow F 的收集腳本、正規化、門檻、比對板、推論規則、計畫與報告格式。
- binding recipes（新）：dynamic-page 慣例、盤點與檢查腳本、比對 helper、各屬性綁定、Styles、建立 variable helper、驗證腳本。
- audit rules：18 類規則。
- 提問改為不綁定特定編輯器：Cursor 用 AskQuestion、Claude Code 用 AskUserQuestion，沒有提問工具時以文字詢問並等待回覆。
- 與 figma-use 描述衝突的兩處（文字欄位可否綁定、modes 上限）以 Plugin API 官方文件為準，並在 SKILL.md 明寫；跨頁作業依 use_figma 的限制逐頁執行。
- 中文文件頁同步所有新增內容。

替代方案：保留原結構只追加內容，SKILL.md 會超過 600 行，而且 Workflow B 仍要引用 Workflow D 的步驟。

### 稽核擴充到 18 類並分嚴重度

新增：12 Ref 名稱與數值不符、13 重複或近似重複的 Ref、14 Sys 間距階梯標籤不一致（尺寸的 icon 與 control-height 是不同階梯，不互相比較）、15 元件 token 覆蓋率、16 Styles 未綁 variables、17 舊式狀態順序、18 名稱格式。1 到 11 加上嚴重度（error、warning、info）。修正既有腳本：跨頁搜尋改為逐頁執行（use_figma 不支援一次載入所有頁面，也不從 document root 搜尋）、Type 5 改用 predicate 篩選、Type 10 的型別對照表補齊描邊寬度、counter-axis spacing、尺寸上下限、paragraph 欄位、font style 等。修正一律依變動分級確認，修正後重跑對應規則。

## Implementation Contract

**完成後可觀察到的行為（代理人照 skill 執行時）：**

- 使用者分享 section、元件或 page 的連結並要求 token 化時，代理人依路由表進入 Workflow F：先截基準圖、收集數值、自動合併完全相同的值；若有近似值，在範圍所在頁面建立 `Token Review — temporary` Section、截圖、提供連結，逐組詢問；接著提出 token 計畫（Tier 2 以上）等待確認；建立 variables 與 Styles、綁定、讀回比對、截圖比對，最後刪除比對板並回報。
- 要求套用 variables（Workflow A、E）時，計畫中每一列都有目前值與 token 值；值不同的列標為 Tier 3，不會因為「自動套用」而被寫入。
- 要求稽核（Workflow C）時，報告依嚴重度分組，涵蓋 18 類規則；修正前詢問，修正後重跑。
- 文字 tokens 可以在任何檔案建立（不再要求檔案已經有文字 variables），預設以綁定 Sys typescale variables 的 Text Styles 套用；陰影以綁定 variables 的 Effect Styles 套用。

**介面與資料格式：**

- Workflow 代號 A 到 F 與「Inventory only」；變動分級 Tier 0 到 3；共用程序 P1 到 P5；稽核規則 1 到 18。
- 比對板 Section 名稱固定為 `Token Review — temporary`。
- token 計畫欄位：layer、name、type、value 或 alias target、scopes、WEB code syntax、confidence；綁定列欄位：node ID、node name、property、current value、token、token value、tier。
- 近似值群組欄位：group、family、candidates（value、uses、sample node IDs）、difference（ΔE 或 px）、recommended。
- Workflow F 給其他 skill 的回傳：各層 variable IDs、style IDs、bindings、merged groups、skipped（附原因）。

**失敗與例外處理：**

- 字型無法載入：比對板的文字樣本改用預設字型並標註，該文字節點的綁定列為略過並附原因。
- 行高為 AUTO、漸層或圖片填色、instance 內部節點、已綁定屬性：略過並列在報告中。
- 綁定 library variables 的目標：停下並詢問，不在本地建立重複 tokens。
- 建立 composed 色彩失敗（例如 use_figma 拒絕寫入）：該組填色依序改用葉節點圖層透明度或帶 alpha 的 Ref 色彩，並在回報中註明採用的方法與失敗訊息。
- Effect 綁定後其他欄位被重設：逐欄讀回，重設原值後再次驗證；仍不一致就回報。
- 讀回值與預期不同：回報節點、屬性與兩個值，不自行修正。
- `use_figma` 錯誤：停止、閱讀錯誤訊息、修正後重試，不盲目重試。

**驗收方式：**

- 內容檢查：三個缺口都有對應規格（Workflow F 全流程；typography 的 Ref/Sys/Styles/Variables 模式；陰影、描邊寬度、透明度、尺寸的 token 清單、scope 與綁定方式），token spec 中不再有「只有檔案已用 Variables 管理文字時才使用」的限制。
- 一致性檢查：SKILL.md 引用的 reference 檔案與章節都存在；`corner-full`、間距階梯、狀態順序與不透明度在 SKILL.md、token spec、value harvest、audit rules、文件頁之間一致；舊寫法（`gap-inline-sm` 代表 8、`/hovered` 結尾的範例、Focused 12%）只出現在稽核規則 17 的遷移範例或完全不出現。
- frontmatter description 在 1024 字元內；SKILL.md 沒有超過 15 行的腳本。
- 文件頁在瀏覽器中版面正常，導覽連結都指向存在的區塊。
- `spectra validate upgrade-figma-m3-variables` 通過。

**範圍：**

- 範圍內：本 skill 資料夾內的 SKILL.md、token spec、audit rules、文件頁，以及新增的 value harvest 與 binding recipes。
- 範圍外：元件化流程、repo 外的已安裝副本、starter 與 template 的 wrapper、程式碼端 token 輸出。

## Risks / Trade-offs

- [Risk] Plugin API 實際行為（opacity 單位、行高與字距單位、綁定後 paint opacity）與文件不同或日後改變 → Mitigation：每個綁定後讀回並比對解析值，加上前後截圖；不一致即停下回報。
- [Risk] 語意推論錯誤（例如把次要色判成 primary）→ Mitigation：每個對應標示信心度，`inferred` 在計畫中列出，`needs-review` 必須先問。
- [Risk] 比對板沒有被清除，留在設計稿中 → Mitigation：固定名稱的 Section，流程最後一步刪除並在報告中確認；稽核時可用名稱找到殘留。
- [Risk] 命名變更（狀態順序、`gap-inline-xs`、`corner-full`）影響已照舊範例建立的檔案 → Mitigation：遵循檔案既有慣例直到使用者遷移；稽核規則 14 與 17 提供偵測與改名遷移，綁定不受影響。
- [Risk] Composed 色彩在 2026-09-17 才推出，use_figma 的寫入支援只有 staff 回覆、沒有官方文件，讀回形狀也曾改變 → Mitigation：在已核准的寫入中嘗試，失敗就退回另外兩種方法；讀取時接受新舊兩種形狀；一律讀回驗證。
- [Risk] Effect 綁定有欄位被重設的已知回報 → Mitigation：綁定後逐欄讀回。
- [Risk] 大型檔案的腳本逾時或輸出過大 → Mitigation：範圍超過 50 個頂層 frame 先確認；寫入以 100 個綁定或一個元件為單位分批；盤點超過 300 個 variables 時先回傳各群組數量。
- [Risk] 預設詞彙與階梯不符合某些產品 → Mitigation：檔案既有階梯永遠優先，計畫中的名稱可由使用者修改後再確認。

## Migration Plan

1. 實作並通過驗收後，以 `spectra archive` 封存。
2. 已照舊範例建立 tokens 的檔案：執行 Workflow C，依規則 14、17 決定是否改名；未遷移前 skill 沿用檔案既有慣例。
3. 詢問使用者是否把新版同步到家目錄下的已安裝副本；design-workspace-starter 下次從 GitHub 拉取時自動取得新版。
4. 回復方式：以 git 還原本 skill 資料夾內的檔案。

## Open Questions

（無。原本待確認的 composed 色彩用法已於 2026-09-30 查證：呼叫方式、適用範圍、use_figma 寫入狀態與偵測方式都寫在上方查證表與「半透明填色維持實際呈現」決策中。）
