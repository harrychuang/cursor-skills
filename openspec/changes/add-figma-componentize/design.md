## Context

figma-m3-variables 升級後（change `upgrade-figma-m3-variables`，PR #3）已提供 Workflow F：以一組節點為範圍，把寫死的數值轉成 Ref → Sys → Comp tokens 並綁定，外觀不變；它也定義了給其他 skill 呼叫的介面（輸入 scope node IDs、元件名稱、caller；回傳各層 variable IDs、style IDs、bindings、合併群組、略過項目）。

還缺的是「判斷哪些 UI 該做成元件、建立元件、替換原稿」。使用者已確認：

1. 原稿要換成 instance。
2. 範圍由設計師提供：丟 section 就處理裡面的 UI，丟單一元件連結就處理那個元件；不要求同一個 UI 重複出現兩次；不確定時詢問。
3. 較大的變動一律先確認。
4. 近似值列出差異並附圖讓使用者決定（沿用 Workflow F 的比對板）。
5. 元件建立在 Components 頁面。

執行環境限制（沿用上一個 change 的查證結果）：`use_figma` 每次呼叫從第一頁開始，不支援一次載入所有頁面，需以 `setCurrentPageAsync` 逐頁作業；需使用 async getter；呼叫必須依序執行。本 repo 沒有 Figma 執行環境，驗收以內容檢查、腳本語法檢查、以模擬節點樹執行偵測邏輯、跨檔一致性與 `spectra validate` 為主。

查證結果（2026-09-30；來源：Figma Plugin API 文件與 typings、Figma Help Center、Figma 官方 mcp-server-guide 中的 figma-use 與 figma-generate-library skills）：

| 項目 | 結果 |
| --- | --- |
| `createComponentFromNode` | 保留屬性與子節點轉成元件；對元件、component set，以及位於其中或位於 instance 內的節點拋出 `Cannot create component from node`；各節點類型是否就地轉換、是否保留 id 未記載 |
| `combineAsVariants` | 節點必須是 ComponentNode；錯誤包括不在同一頁、位於 instance 內、會在元件內建立元件；variant 屬性由名稱 `Prop=Value, …` 決定；不會自動排列，use_figma 中 variants 會疊在 (0,0)；預設 variant 是左上角那個 |
| 元件屬性 | `addComponentProperty(name, type, defaultValue, options)` 回傳如 `Label#4:2` 的 key（VARIANT 回傳原名）；定義放在 component set 或非 variant 的元件上；只有元件內、不在巢狀 instance 裡的圖層能引用屬性，巢狀內容要改用 exposed instance；`setProperties` 的 key 錯誤時靜默失敗 |
| instance | `createInstance()` 放在目前頁面；文字覆寫前要載入字型；圖片覆寫沿用原本的 `imageHash`（use_figma 不能 `createImage`）；`swapComponent` 依圖層名稱保留覆寫；instance 不能覆寫圖層順序、子節點位置、constraints 與文字框尺寸 |
| 替換注意事項 | `insertChild` 會推擠 auto layout 中的兄弟節點；旋轉以左上角為軸，要複製 `relativeTransform`；GROUP 與 BOOLEAN 沒有 constraints；`layoutPositioning` 要在 x、y 之前設定；`resize()` 會把 sizing 重設為 FIXED；HUG 只適用於主元件有 auto layout 的 instance，FILL 只適用於 auto layout 的子節點；GRID parent 用 `setGridChildPosition` |
| 版本紀錄 | use_figma 不支援 `saveVersionHistoryAsync`，也沒有其他外掛 API 能建立還原點；可以手動存版本（⌘⌥S），Figma 每 30 分鐘自動存檢查點 |
| 頁數上限 | Starter 方案每個設計檔最多 3 頁，付費方案不限；錯誤訊息為 "The Starter plan only comes with 3 pages. Upgrade to Professional for unlimited pages." |
| use_figma 限制 | 每次呼叫回傳上限 20kB；有執行時間上限（數值未公開；建議腳本約 250 行內、一次處理一個元件或 set）；失敗的呼叫可能留下部分變更；`createComponentFromNode` 只能用在 Design／Sites 檔案；尚不支援自訂字型與新增圖片資產 |
| 鎖定與字型 | `locked` 不影響外掛寫入；字型未載入時文字寫入失敗（例如 `The font "…" could not be loaded`），`appendChild`、`insertChild` 含未載入字型的節點也要先載入 |
| figma-generate-library 慣例 | 依相依順序建立；set 用單純的名稱、子圖層用語意名稱（`label`、`icon`）；variants 排成格狀：State 為欄、Size × Style 為列、間距 16–40 px（預設 20）、內距 40 px；一個 set 最多 30 種組合；不為每個圖示做 variant（改用 INSTANCE_SWAP）；屬性加在 set 上並連到每個 variant；單一元件放進既有的元件區域 |

## Goals / Non-Goals

**Goals:**

- 在設計師給的範圍內，找出還不是元件的 UI，並依結構分組成元件、variants 與元件屬性。
- 以比對區塊與計畫讓設計師在任何破壞性變動前確認分組、命名與範圍。
- 在 Components 頁面由小到大建立主元件（較大的元件內使用較小元件的 instance）。
- 透過 Workflow F 為新元件建立並綁定 tokens，instance 自動繼承。
- 把原稿換成 instance，逐項證明外觀不變；無法證明就保留原稿。
- 提供中文文件頁，並更新 figma-m3-variables 的交叉引用。

**Non-Goals:**

- 比對 team library 中的元件：只重用本檔案的 local components。
- 把散落的向量圖示整理成圖示庫：向量圖示不會自動做成元件，只列在報告中。
- 互動元件與 prototype 連結、元件動畫。
- 重構排版（例如把絕對定位改成 auto layout）：元件保留原稿的圖層結構。
- 在 Components 頁面產生使用說明或文件 frame。
- Code Connect 或程式碼端元件。
- 把 skill 安裝到使用者家目錄下的 skills 資料夾（完成後另外詢問）。

## Decisions

### 獨立的 figma-componentize，tokens 交給 Workflow F

元件化（偵測、分組、建立、替換）與 tokens（數值、語意、綁定）是兩種不同的判斷，放在各自的 skill；本 skill 只透過 Workflow F 的介面取得 tokens，不重寫任何 token 規則。

替代方案：把元件化塞進 figma-m3-variables。拒絕原因：觸發描述會互相干擾，且元件化會改變圖層結構，風險等級與 token 綁定不同。

### 候選以範圍為準，不要求重複

候選條件（任一成立即可）：符合已知 UI 模式（依圖層名稱或結構：按鈕、icon button、chip、badge、avatar、輸入框、搜尋框、checkbox／radio／switch 列、列表項目、卡片、tab、tab bar、navigation bar、top app bar、dialog、snackbar、menu item）；在範圍內重複兩次以上的結構；設計師直接指向的單一 UI 元素本身。

排除：既有元件與 instance（含其子孫）、畫面層級 frame（寬度 320 到 1920 px、承載整頁版面的頂層 frame）、純排版外框（沒有自己的填色、描邊、效果或圓角，且子節點是候選）、隱藏圖層、不符合任何模式的單一文字或形狀、鎖定圖層（列入報告）。

每個候選標示層級：atom（不含其他候選）、molecule（含 atom）、organism（含 molecule）。

替代方案：只把重複出現的結構做成元件。拒絕原因：使用者明確表示不要求重複；單一按鈕也應該成為元件。

### 以結構簽章分組

結構簽章由節點類型、子節點順序、auto layout 方向與結構角色（container、label、icon 等）遞迴組成，不含文字內容、圖片與顏色數值。分組規則：

| 差異 | 結果 |
| --- | --- |
| 只有文字不同 | 同一個元件，TEXT 屬性 |
| 巢狀 instance 不同 | 同一個元件，INSTANCE_SWAP 屬性 |
| 部分實例多一個選用子節點 | 同一個元件，BOOLEAN 屬性 |
| 圖片不同 | 同一個元件，instance 覆寫 |
| 同結構、樣式不同 | variants：`Style` |
| 同結構、尺寸不同 | variants：`Size` |
| 透明度降低或名稱含 disabled、hovered、pressed、focused、selected | variants：`State` |
| 結構不同 | 不同元件 |
| 差異落在 Workflow F 的近似門檻內 | 同一個元件；差異交給 Workflow F 的比對板 |

結構簽章也納入圖層順序、無 auto layout 的 frame 中子節點的位置、constraints，以及固定尺寸文字框的大小，因為 instance 無法覆寫這些屬性；只在這些地方不同的候選視為不同結構，若其他結構相同則以 `needs-review` 提議做成 variants。

替代方案：以外觀相似度（截圖比對）分組。拒絕原因：無法說明為什麼分在一起，也無法推導出元件屬性。

### 由小到大，從 clone 建立主元件

依 atom、molecule、organism 的順序建立。每個主元件都從代表實例的 clone 建立：clone 移到 Components 頁面，把其中已建好的較小元件替換成 instance，再轉成元件。原稿在替換階段之前完全不動。

clone 與搬移前先載入代表實例用到的所有字型；clone 中名稱是自動命名的子圖層改用結構名稱（`container`、`label`、`icon`、`supporting-text`），方便命名屬性與對應 tokens，原稿不受影響。轉換後檢查回傳節點的類型與子節點數量；轉換失敗時把 clone 包進一個 frame 再轉換，並在報告中註明。每次呼叫只建立一個元件或一個 component set。

替代方案：直接把原稿中的某個實例就地轉成元件。拒絕原因：主元件會留在畫面裡而不是 Components 頁面，而且在設計師確認替換前就改變了原稿結構。

### 兩種比對區塊各司其職

分組用本 skill 的 `Componentize Review — temporary`：每個擬議元件一列，並排最多四個代表實例的 clone（縮放到 400 px 寬內），標示名稱、variants 與屬性對應、實例數量、信心度，讓設計師接受、改名、拆分、合併或排除。數值用 Workflow F 的 `Token Review — temporary`。兩者都只新增 Section、不動既有節點，決定後刪除。

替代方案：只在對話中貼截圖。拒絕原因：設計師無法在 Figma 裡直接檢查圖層；使用者也偏好在 Figma 中看到差異。

### 先 tokens 再替換

建立完成後先以新元件為範圍執行 Workflow F，再替換原稿，讓 instance 直接繼承綁定。計畫中的近似值差異（只出現在原稿上的數值，例如 padding 15）以額外候選值加入 Workflow F 的比對板，樣本為那些實例，但不為它們建立 tokens 或綁定。使用者在 Workflow F 核准的合併（回傳的 mergedGroups）視為預期變化，替換驗證時不算失敗並列入報告；未合併的差異會讓該實例保留原稿。使用者拒絕 tokens 時，需再次確認才繼續替換，報告標示為未 token 化。

### 替換採先放 instance、比對通過才刪原稿

每個實例依序：先記錄原稿的 parent、index、`relativeTransform`、尺寸、constraints、`layoutPositioning`、sizing、`layoutGrow`、`layoutAlign`、GRID 中的位置、可見性、名稱與 `absoluteBoundingBox`；把原稿設為隱藏，避免新舊並存時在 auto layout 中互相推擠；在同一個 parent 與 index 插入 instance；先設定 `layoutPositioning` 再設定位置（複製 `relativeTransform`），接著 `resize()`，最後才設定 sizing（`resize()` 會把 sizing 重設為 FIXED；HUG 只用在主元件有 auto layout 時，FILL 只用在 auto layout 的子節點）；GRID parent 用 `setGridChildPosition`；再套用文字、圖片、巢狀 instance、選用圖層與 variant 的覆寫。之後以記錄的座標與尺寸（容差 0.5 px）、可見文字、會繪製內容的可見圖層數量，以及這些圖層的樣式（以 Workflow F 的正規化形式比對顏色，另比對不透明度、描邊、圓角、效果、字型、字級、padding、gap）比對。一致才刪除原稿；不一致就刪掉新 instance、恢復原稿的可見性並回報。樣式差異只有在近似門檻內、且使用者已在 Workflow F 合併時才視為一致；尺寸差異只有在同一實例有這類合併、且在 1 px 或 5% 內時才視為一致；文字、圖層數量與讀回不一致一律保留原稿。使用者看過差異後，可以接受個別實例的樣式與尺寸差異並重新替換（Tier 3）。只比對座標、文字與圖層數量會漏掉子圖層的顏色或字型差異（偵測的樣式只看外框與第一段文字），因此加入樣式比對，讓無法證明外觀不變的實例一律保留原稿。最外層優先，被包在外層實例內的巢狀實例由外層 instance 的覆寫處理。每次呼叫最多 50 個替換、一次一頁。

替代方案：直接用 instance 取代後再整體截圖比對。拒絕原因：截圖比對無法定位是哪個實例出錯，且錯誤已經發生。

### 寫入前建立還原點

查證確認 `use_figma` 不能存版本，也沒有其他外掛 API 能建立還原點。因此計畫確認後、第一次寫入前，一律請使用者手動存一個命名版本（⌘⌥S 或檔案選單的 Save to version history，名稱例如「Before figma-componentize — {範圍名稱}」），確認後才寫入。另外維護一份 ID 對照表（原稿 ID → 元件 ID → instance ID），呼叫失敗時用來確認哪些已完成、只重試剩下的部分，並放進報告。

### 沿用 figma-m3-variables 的變動分級

| 步驟 | Tier |
| --- | --- |
| 掃描、偵測、分組、計畫、報告 | 0 |
| 建立比對區塊（暫時、只新增） | 在決定前允許，不需另外確認 |
| 建立 Components 頁面、主元件、variants、元件屬性 | 2 |
| tokens | 依 Workflow F 自身的分級 |
| 替換原稿 | 3（一定逐次確認，不能被「全部自動套用」略過） |

### 命名與擺放

元件名稱用 Title Case，取自 UI 模式（`Button`、`List Item`）或有意義的圖層名稱（`Product Card`）；重名時加上圖層名稱中的描述字，仍無法區分就詢問。variant 屬性固定為 `Style`、`Size`、`State`，值用 Title Case。元件屬性依結構命名（`Label`、`Leading icon`、`Show leading icon`）。每個元件或 component set 放在 Components 頁面上以其命名的 Section 中，依 atom、molecule、organism 排列，不與既有內容重疊。variants 依 Figma 官方慣例排成格狀：`State` 的值為欄，其餘屬性的組合為列，間距 20 px、內距 40 px，預設 variant 放在左上角，排好後依內容調整 set 的尺寸。一個 set 最多 30 種組合，超過就依某個屬性拆成多個 set；圖示差異一律用 INSTANCE_SWAP，不做成 variants。

### Components 頁面的判斷與建立

優先使用名稱含 "components"（不分大小寫，忽略 emoji 與前綴）或「元件」的頁面；沒有就建立 `Components`（Tier 2）。建立失敗時（Starter 方案每個檔案最多 3 頁，錯誤訊息提到 "only comes with 3 pages"），提議在使用者指定的既有頁面上建立名為 `Components` 的 Section 來放元件；未回覆前不建立元件。

### 巢狀內容的對應方式

同一組的實例結構簽章相同，因此原稿的每個子孫圖層都能依結構路徑（子節點索引序列）對應到 instance 中的圖層；文字、圖片、可見性與巢狀 instance 的覆寫依此對應套用。含多段不同文字樣式、且與主元件不同的文字圖層不覆寫，該實例保留原稿並回報。圖片覆寫沿用原稿的 `imageHash`（use_figma 不能新增圖片）；覆寫文字前載入所有字型，`hasMissingFont` 為 true 或字型無法載入（use_figma 尚不支援自訂字型）時，該實例保留原稿並回報。`setProperties` 的 key 錯誤時不會報錯，因此每次設定後讀回確認。

### 元件屬性加在 component set 上，巢狀內容用 exposed instance

依 Plugin API 規則，元件屬性定義在 component set（或非 variant 的元件）上：先把 variants 合併成 set，再加 TEXT、BOOLEAN、INSTANCE_SWAP 屬性並連到每個 variant 中對應的圖層。巢狀 instance 裡的圖層不能引用外層元件的屬性，因此較大元件中的較小元件 instance 設為 exposed instance（`isExposedInstance = true`），讓設計師直接在外層 instance 上修改；替換時，巢狀內容透過巢狀 instance 自己的屬性覆寫。

替代方案：把巢狀內容的文字也做成外層元件的 TEXT 屬性。拒絕原因：API 不允許巢狀 instance 內的圖層引用外層屬性。

### 腳本回傳精簡並分頁

`use_figma` 每次呼叫最多回傳 20kB，並有執行時間上限。偵測腳本只回傳精簡的候選摘要，並以 `OFFSET` 分頁、回傳 `nextOffset`，每一頁的 JSON 控制在 18,000 字元內（與 figma-m3-variables binding recipes 的 `fit` helper 相同做法）；建立時每次呼叫一個元件或 set；替換每次最多 50 個，只回傳 ID 對照；呼叫失敗後先依 ID 對照表重新讀取，再只重試未完成的部分。

替代方案：一次回傳所有節點明細。拒絕原因：中大型範圍一定超過 20kB，結果會被截斷。

### Skill 結構

- SKILL.md：前置條件、步驟順序、變動分級、共用程序、與 figma-m3-variables 的分工；不放超過 15 行的腳本。
- 偵測參考文件：UI 模式表、結構簽章、候選與排除規則、分組規則、信心度、偵測腳本、分組比對區塊。
- 建立參考文件：還原點、Components 頁面、從 clone 建立元件、元件屬性、variants 與排列、命名與擺放。
- 替換參考文件：替換順序、位置與覆寫、逐項驗證、保留與略過規則、最終驗證與報告格式。
- 中文文件頁。
- figma-m3-variables 的 SKILL.md 與文件頁：figma-componentize 由「規劃中」改為正式分工。

## Implementation Contract

**完成後可觀察到的行為：**

- 設計師分享 section、frame 或單一元件連結並要求元件化時，代理人先檢查前置條件並截基準圖，偵測候選、在範圍旁建立分組比對區塊並逐一詢問，再提出計畫；確認後建立還原點、在 Components 頁面由小到大建立元件，呼叫 Workflow F 處理 tokens，最後在第二次確認後替換原稿、逐項驗證並回報。
- 缺少 `use_figma`、`figma-use` 或含 Workflow F 的 figma-m3-variables 時，不做任何寫入並說明缺少什麼。
- 只要求 tokens 的請求被導向 figma-m3-variables。

**介面與資料格式：**

- 比對區塊名稱固定為 `Componentize Review — temporary`；還原點名稱格式為「Before figma-componentize — {範圍名稱}」。
- 計畫欄位：name、kind（component 或 component set）、level、variants、properties、contains、representative、occurrences、confidence；另列 reuse、excluded（附原因）、target page、各 Tier 的寫入摘要。
- 呼叫 Workflow F：`{ "scope": [...], "components": [...], "caller": "figma-componentize" }`；使用其回傳的 variables、styles、bindings、mergedGroups、skipped。
- 報告欄位：components（ID、名稱、variants、properties、section）、replaced、kept（附原因）、tokens、restore point、Components 頁面連結。

**失敗與例外處理：**

- 前置條件缺少：停止並列出缺少的項目。
- 頁面建立失敗（例如 Starter 方案的 3 頁上限）：提議在使用者指定的既有頁面建立 `Components` Section，未回覆前不建立。
- 還原點：use_figma 無法存版本，一律請使用者手動存版本，確認後才繼續。
- `createComponentFromNode` 失敗：把 clone 包進 frame 再轉換並註明；仍失敗就把該元件列為略過。
- `setProperties` 讀回的值與預期不同：視為替換不一致，刪除 instance、保留原稿並回報。
- Workflow F 被拒絕或失敗：詢問是否在沒有 tokens 的情況下繼續替換。
- 替換比對不一致、字型缺少、多段文字樣式、鎖定圖層、instance 內部：保留原稿並回報。
- `use_figma` 錯誤：停止、閱讀錯誤訊息、修正後只重試該步驟。

**驗收方式：**

- 內容檢查：五個 capability 的每一項需求都能在 SKILL.md 或三份參考文件中找到對應規則或腳本。
- 偵測邏輯以模擬節點樹執行：一個 390 px 畫面內含一張卡片（內有按鈕）與兩個按鈕（其中一個為 outlined），結果需與 componentize-detection spec 的範例一致（畫面排除、三個 atom、一個 molecule、`Button` 有 `Style` variants 與 `Label` 屬性）。
- 所有腳本通過 Node 語法檢查，且不呼叫 `loadAllPagesAsync()`、不使用同步 getter、不從 document root 搜尋；以 3,000 個模擬節點執行偵測腳本時，每一頁 JSON 不超過 18,000 字元。
- variants 排列：以 `Style` = Filled、Outlined 與 `State` = Enabled、Disabled 推演，`State` 為欄、`Style` 為列、間距 20 px、內距 40 px、`Style=Filled, State=Enabled` 在左上角，且互不重疊。
- SKILL.md description 在 1024 字元內、沒有超過 15 行的腳本、引用的章節都存在。
- 文件頁導覽連結都指向存在的區塊，且在 500、768、1280 px 寬度下沒有水平溢出。
- figma-m3-variables 的 SKILL.md 與文件頁不再出現「planned」或「規劃中」描述 figma-componentize。
- `spectra validate add-figma-componentize` 通過。

**範圍：**

- 範圍內：新的 figma-componentize 資料夾（SKILL.md、三份參考文件、文件頁），以及 figma-m3-variables 的 SKILL.md 與文件頁中關於 figma-componentize 的描述。
- 範圍外：Non-Goals 所列項目、figma-m3-variables 的其他內容、repo 外的已安裝副本。

## Risks / Trade-offs

- [Risk] 偵測切得太細或太粗 → Mitigation：信心度、分組比對區塊、設計師可拆分、合併、排除；`needs-review` 一定先問。
- [Risk] 替換後排版跑掉（HUG 與 FIXED 差異、絕對定位）→ Mitigation：逐項比對座標與尺寸，不一致就保留原稿。
- [Risk] 大型範圍的效能與逾時 → Mitigation：一次一頁、每次最多 50 個替換、偵測每次最多 2000 個節點並可分段。
- [Risk] 文字覆寫破壞多段樣式 → Mitigation：偵測到與主元件不同的多段樣式就略過並回報。
- [Risk] `createComponentFromNode` 對各節點類型的行為未記載（是否就地轉換、是否保留 id）→ Mitigation：一律轉換 clone 並檢查回傳節點；失敗時包進 frame 再轉換，仍失敗就略過並回報。
- [Risk] 還原點只能靠使用者手動存版本 → Mitigation：寫入前一定等使用者確認；每一步都保留原稿直到比對通過；ID 對照表可用來回復或清理。
- [Risk] Components 頁面變得雜亂或命名衝突 → Mitigation：每個元件一個 Section、固定排列順序、重名時加描述字或詢問。
- [Risk] 依賴 figma-m3-variables 的新版 → Mitigation：前置檢查確認 Workflow F 存在。

## Migration Plan

1. 本 change 修改的 figma-m3-variables 檔案以 `upgrade-figma-m3-variables`（PR #3）的版本為基礎；發 PR 時需等 PR #3 合併，或以該分支為 base。
2. 實作並驗收後以 `spectra archive` 封存。
3. 詢問使用者是否把 figma-componentize 與新版 figma-m3-variables 同步到家目錄下的已安裝副本。
4. 回復方式：刪除 figma-componentize 資料夾，並以 git 還原 figma-m3-variables 的兩個檔案。

## Open Questions

（無。原本待查證的 Plugin API 細節已於 2026-09-30 查證，結果寫在 Context 的查證表與相關決策中；`createComponentFromNode` 對各節點類型的細節仍未記載，已在 Risks 中定義處理方式。）
