## Context

figma-componentize（change `add-figma-componentize`，PR #4）已經有「沿用現有元件」的機制：偵測前先收集本檔案 local components 的骨架簽章（core signature），偵測時只要某一組原稿的骨架與某個現有元件相同，就把該組標為 reuse，不新建元件，替換時再從現有 component set 中挑外觀最接近的 variant。

實際讀過規則與腳本後，確認有四個缺口：

| 缺口 | 現況 | 設計師看到的結果 |
| --- | --- | --- |
| 只拿第一個骨架相同的元件 | 比對只看骨架；Button、Chip、Tab、Badge 的骨架都是「橫向 auto layout 加一段文字」（icon 不計入骨架） | 按鈕可能被配到 Chip |
| 配到後沒有後續處理 | 替換時才挑 variant；沒有近似 variant 就回報「沒有相符的元件或 variant」 | 那些 UI 不替換、不加 variant、也不新建，維持散圖層 |
| 審查時看不到配對 | 分組比對區塊只顯示原稿樣本；選項只有接受、改名、拆分、合併、排除 | 配錯時只能排除 |
| 同名重複 | 命名規則只處理新元件之間的重名 | Components 頁面可能出現第二個 `Button` |

使用者（設計師）的期待是：先用現有元件重新組裝 UI，找不到才把 UI 建立為元件；配對不確定或需要動到現有元件時先問。

限制沿用前一個 change 的查證結果：`use_figma` 每次呼叫從第一頁開始、一次只處理一頁、回傳上限 20 kB、有執行時間上限、失敗的呼叫可能留下部分變更；本 repo 沒有 Figma 執行環境，驗收以內容檢查、Node 語法檢查、以模擬節點樹執行腳本邏輯、跨檔一致性與規格驗證為主。

本次額外查證（2026-10-01，來源：Figma 官方外掛附的 figma-use skill 參考文件與 Plugin API typings）：

| 項目 | 結果 |
| --- | --- |
| 在現有 component set 新增 variant | typings 中 ComponentSetNode 具備一般的子節點操作，但 figma-use 的參考文件沒有記載「把新元件加入既有 set」的做法；視為未經實測 |
| 把單一元件與新元件合併成 set | `combineAsVariants` 會建立新的 set；合併後既有 instance 與已定義的元件屬性是否完整保留，文件未記載 |
| team library 元件 | figma-use 記載可用 `importComponentByKeyAsync` 與 `importComponentSetByKeyAsync` 匯入 team library 元件，Figma MCP 也列有搜尋 design system 的工具；看起來可行，但未在實際檔案驗證 |
| 元件屬性定義的位置 | 只能定義在 component set 或非 variant 的元件上（與前一個 change 的查證一致） |

## Goals / Non-Goals

**Goals:**

- 沿用現有元件時，以骨架、名稱、外觀三項證據判斷，不再只拿第一個骨架相同的元件。
- 每個原稿在偵測階段就確定要用現有元件的哪個 variant，替換階段不再出現「配到了卻沒有 variant 可用」的意外。
- 沒有合適 variant 時，由設計師在三個選項中決定：在現有 component set 加 variant、建立新元件、維持原樣。
- 設計師在分組比對區塊看得到「原稿對上哪個現有元件」，並能改成不沿用，或改沿用另一個元件。
- 不會默默建立與現有元件同名的第二個元件。
- 維持既有原則：外觀不變、原稿在驗證通過前不動、近似值不自動合併、每次回傳低於 18,000 字元、不確定就問。

**Non-Goals:**

- 沿用 team library 的元件。查證顯示可行，但需要另外設計搜尋、匯入與權限流程，留給後續 change；本次仍只比對本檔案的 local components。
- 容許骨架差異的比對（例如現有元件多包一層 frame、或原稿沒有 auto layout）。內容覆寫依結構位置對應，骨架不同就無法證明外觀相同；這類情況本次只做到「明確告知並詢問」。
- 把現有的單一元件（不是 component set）轉成 set 以便加 variant。合併後既有 instance 與屬性是否保留未經查證，本次不做；設計師可以先在 Figma 自行合併成 set 再重新執行。
- 修改、搬移或重新命名任何現有 variant，或在現有 set 上新增元件屬性。
- 自動找出哪些頁面有 local components 的做法（維持現有規則：Components 頁面優先，逐頁執行）。
- 把更新後的 skill 同步到家目錄下的已安裝副本（完成後另外詢問）。
- figma-m3-variables 尚未處理的項目（20 kB 輸出上限的 tasks 8.1–8.4、ΔE 範例數字）。

## Decisions

### 配對看骨架、名稱、外觀三項證據

骨架相同仍是必要條件，因為替換時的內容覆寫依結構位置對應。在骨架相同的現有元件中，再看兩項證據：

**名稱證據**（三種結果）：

| 結果 | 條件 |
| --- | --- |
| agree（相符） | 該組至少一半的原稿是靠圖層名稱認出 UI 類型，且現有元件名稱認出的 UI 類型相同；或該組最常見的有意義圖層名稱與現有元件名稱正規化後相同 |
| conflict（衝突） | 該組至少一半的原稿靠圖層名稱認出 UI 類型，現有元件名稱也認得出 UI 類型，而兩者不同（例如 Button 對 Chip） |
| neutral（無法判斷） | 其餘情況：原稿的類型只靠結構推測，或現有元件名稱認不出類型 |

只靠結構推測出的類型不算名稱證據，因為沒有命名的 Chip 在結構上會被推測成 Button；把它當成衝突會讓相同外觀的元件被重複建立。名稱正規化：取最後一段斜線後的名稱，轉小寫，只留英數與中日韓文字。

**外觀證據**：對該組每一個原稿，在現有元件的 variants 中找「不透明度相同、高度相近、樣式在近似門檻內」且差異欄位最少的一個，沿用現有的樣式比對規則與近似門檻（與 Workflow F 相同）。找得到的原稿稱為 covered，找不到的稱為 uncovered。

**配對結果**：

| 名稱證據 | 外觀 | 結果 | 是否詢問 |
| --- | --- | --- | --- |
| agree | 全部 covered | `exact`：沿用 | 不問 |
| agree | 有 uncovered | `partial`：covered 的沿用；uncovered 的由設計師決定 | 問 |
| neutral | 全部 covered | `unconfirmed`：提議沿用，標為 `needs-review` | 問 |
| neutral | 有 uncovered | 不沿用，列為「骨架相同的其他元件」 | 設計師可自行選擇 |
| conflict | 任何 | 不沿用，列為「骨架相同的其他元件」 | 設計師可自行選擇 |

多個現有元件都可沿用時的排序：名稱相符優先於無法判斷；其次 covered 的原稿較多者；其次差異欄位總數較少者；最後依現有元件清單的順序（Components 頁面優先）。前三項完全相同時不自行挑選，標為 `needs-review` 並請設計師選。

替代方案：只加上名稱比對。拒絕原因：名稱相同但外觀不同時仍會落入「配到了卻沒有 variant」。替代方案：以截圖相似度比對。拒絕原因：無法說明配對理由，也無法推導出要用哪個 variant。

### 現有元件清單只收集相關的 variant

配對需要每個現有 variant 的樣式資料，清單會比原本只有骨架時大很多。為了讓輸入與回傳都維持在限制內，順序改為：

1. 先在範圍所在頁面執行一次偵測（不帶現有元件清單），取得每一組的骨架與名稱。
2. 以這些骨架與名稱為條件，在有 local components 的每一頁執行清單腳本；只回傳「骨架相同」或「名稱相同」的 variant。
3. 清單不是空的才帶著清單再執行一次偵測，取得配對結果與每個原稿的 variant。

清單沒有任何項目時（檔案沒有相關元件），省略第二次偵測，行為與現在相同。清單腳本沿用既有的分頁做法，每頁不超過 18,000 字元。

替代方案：維持「先收集全部現有元件再偵測」。拒絕原因：加入樣式後，大型元件庫的清單會讓偵測腳本的輸入過大，也浪費在不相關的元件上。

### 每個原稿在偵測階段就指定 variant

偵測的成員清單為每個原稿加上它要用的現有 variant 的節點 ID（沒有則為空）。替換的工作清單，以及建立較大元件時內部較小元件的替換，都直接使用這個 ID，不再於寫入階段從 set 中重新挑選。這讓「沒有相符 variant」在計畫確認前就被發現，並且計畫、替換結果與報告指向同一個 variant。

寫入階段原有的挑選邏輯保留為防護：若現有元件在偵測後被改動而導致指定的 variant 不存在，該原稿保留原樣並回報，再針對該組重新偵測並詢問。

### 沒有合適 variant 時由設計師決定

`partial` 的組，依 uncovered 原稿所屬的 variant（例如 `Style=Outlined`）逐一詢問，選項：

1. **在現有 component set 加一個 variant**：只有現有元件是 component set 時提供。
2. **建立新元件**：把這些原稿拆成新的一組，照一般流程建立；名稱不可與現有元件相同。
3. **維持原樣**：這些原稿不處理，列入計畫與報告，原因為「沒有相符的 variant，設計師決定保留」。

covered 的原稿不受影響，仍換成現有元件的 instance。現有元件是單一元件時只提供選項 2 與 3，並說明原因與可行做法（先在 Figma 把它合併成 set 再重新執行）。

`unconfirmed` 的組詢問：沿用該現有元件、建立新元件、或維持原樣。

### 只在現有 component set 上新增 variant

新增 variant 是對設計師既有元件的結構性變動（Tier 2），只在設計師對該組明確選擇後執行；先前的「全部自動套用」指示不能略過這個選擇。做法：

- 從該 variant 的代表原稿 clone 建立新元件，內部已有對應元件的較小 UI 照一般建立流程換成 instance。
- variant 名稱使用該 set 自己的 variant 屬性名稱（不強制 `Style`、`Size`、`State`）。預設提議為「最接近的現有 variant 的名稱，改掉其中一個屬性值」，由設計師確認或修改。名稱缺少該 set 的任何屬性、多出屬性、或與現有 variant 重名時不寫入，重新詢問。
- 子圖層名稱與元件屬性連結，依結構位置比照最接近的現有 variant 設定，讓設計師切換 variant 時覆寫能保留。
- 放在現有 variants 下方、間距 20 px；set 有 auto layout 時交給 auto layout。不移動、不修改、不重新命名任何現有 variant。
- 寫入後檢查：新元件的 parent 是該 set；set 的子節點數量剛好加一；每個原有 variant 的 ID、位置、尺寸不變；set 的屬性名稱沒有增加。任一項不符就移除新元件、還原 set 尺寸，回報原因並改問「建立新元件」或「維持原樣」。
- set 變大後若與同一層的其他節點重疊，只回報重疊的節點，不自行搬移。
- 新增的 variant 納入 Workflow F 的範圍，並記錄在 ledger 與報告。

替代方案：自動在現有 set 加 variant，不詢問。拒絕原因：現有元件是設計師維護的資產，可能已發佈或被其他檔案使用。替代方案：轉換失敗時包一層 frame 再轉換（一般建立流程的做法）。拒絕原因：多一層 frame 會讓新 variant 的骨架與其他 variants 不同，切換 variant 時覆寫會遺失。

### 比對區塊用 instance 顯示配對

有配對結果或有「骨架相同的其他元件」的組，在分組比對區塊的原稿樣本旁邊加上現有元件的樣本：被配到的 variant 最多兩個、其他元件最多三個（各一個），並標示現有元件名稱、variant 名稱與配對結果（`exact`、`partial`、`unconfirmed`、名稱衝突）。現有元件的樣本一律用 instance 建立，不 clone 主元件，因為 clone 主元件會在檔案中產生新的元件。樣本隨比對區塊一起移除。

### 設計師可改為不沿用或改沿用另一個元件

有配對資訊的組，除了原有的接受、改名、拆分、合併、排除，再針對沿用另外詢問：

- **不沿用，建立新的**：該組照一般流程建立為新元件。
- **改沿用另一個元件**：從列出的其他元件中選，或提供本檔案中某個元件的連結或名稱。骨架相同時照一般配對處理（略過名稱證據，仍檢查外觀，uncovered 的照上一節詢問）；骨架不同時不接受為沿用對象，說明「圖層結構不同，無法證明換成 instance 後外觀相同」，改問建立新元件或維持原樣。

設計師的決定以「骨架 → 指定的元件 ID，或不沿用」的形式傳回偵測腳本，重新執行後得到新的分組與成員清單。以骨架為鍵是因為組名可能在審查中被改掉。

### 與現有元件同名時先問名稱

清單腳本同時回傳名稱相同（但骨架不同）的現有元件。任何要新建的組，只要名稱與某個現有 local component 的名稱正規化後相同，就標為 `needs-review`，並詢問：給一個可區分的名稱（預設提議加上樣式或圖層名稱中的描述字，例如 `Outlined Button`），或排除該組。審查中改名、拆分或選擇「建立新的」之後，重新檢查一次名稱。不建立與現有 local component 同名的元件。

### 計畫、ledger 與報告記錄沿用細節

- 計畫：Reused 區塊列出現有元件、配對結果、每個 variant 對應的原稿數量；新增「Added variants」（set、新 variant 名稱、代表原稿、原稿 ID）、「Built instead of reused」（設計師決定不沿用而新建的組）、「Kept by decision」（設計師決定維持原樣的原稿與原因）；Tier 摘要加上在現有 set 新增 variant 的數量。
- ledger：沿用的組記錄現有元件 ID、每個原稿指定的 variant ID，以及新增的 variant（ID 與名稱）。
- 替換確認訊息與報告：沿用的元件列出用到的 variants 與數量；另列新增的 variants 與設計師的決定。

## Implementation Contract

**完成後可觀察到的行為：**

- 檔案中有現有元件 `Chip` 與 `Button` 且骨架相同時，名稱為 Button 的原稿被配到 `Button`，不會被配到 `Chip`。
- 現有 `Button` set 只有 Filled、畫面上有 Outlined 按鈕時，設計師在審查階段被問到三個選項；選「加 variant」後，`Button` set 多一個 variant，原有 variants 不變，Outlined 按鈕換成該 variant 的 instance。
- 分組比對區塊中，有配對的組同時顯示原稿樣本與現有元件的 instance，並標示配對結果。
- 設計師可對任何有配對的組回答「不沿用，建立新的」或「改沿用另一個元件」。
- 要新建的元件與現有元件同名時，先被要求提供可區分的名稱。
- 沒有相關現有元件的檔案，流程與結果和現在相同。

**介面與資料格式：**

- 清單腳本輸入：頁面 ID、`CORES`（骨架字串陣列）、`NAMES`（正規化名稱陣列）、`IDS`（設計師指定的元件 ID，選用）、`OFFSET`。輸出每個 variant 一筆：`id`、`setId`（單一元件為 null）、`name`、`variant`、`core`、`pattern`、`op`（圖層不透明度）、`st`（與偵測腳本樣式物件相同的欄位）、`why`（`core`、`name` 或 `id`）。
- 偵測腳本新增輸入 `REUSE`：以骨架為鍵，值為指定的元件或 set ID，或 `false`（不沿用）。
- 偵測腳本的分組摘要新增：`core`、`byName`、`reuse`（`id`、`name`、`isSet`、`quality`、`evidence`、`covered`、`uncovered`：以 variant 名稱為鍵的數量與最接近的現有 variant ID；`forced`：是否由設計師確認或指定）、`alternatives`（最多三筆：`id`、`name`、`evidence`、`covered`）、`clash`（同名現有元件的 `id` 與 `name`，沒有則為 null）。`kind` 只有在 `quality` 為 `exact`，或設計師已確認沿用且全部 covered 時才是 `reuse`。
- 偵測腳本的成員清單新增 `known`：該原稿指定的現有 variant ID，或 null。covered 的原稿，其 `drift` 改為相對於被指定的現有 variant 的差異，這些差異照原有流程送到 Workflow F 的比對板。
- 新增 variant 的腳本輸入：`SET_ID`、`REP_ID`、`NEAREST_ID`、`VARIANT_NAME`、`INNER`、`KIND`。輸出：`added`、`variantId`、`setId`、`name`、`unchanged`（原有 variants 數量）、`overlap`（重疊的同層節點 ID）、`outgrown`（set 是否超出所在的 Section 或 frame）、`inner`（內部較小元件的替換結果）、`missing`（在最接近的 variant 中找不到對應的文字或圖示位置）；失敗時 `added: false` 與 `reason`。
- 替換工作清單：沿用的組，`main` 與 `nested` 的值是成員清單的 `known` 或新增 variant 的 ID。
- ledger：沿用的組記錄 `kind: "reuse"`、`existingId`、`quality`、`chosen`（設計師確認或指定）、`added`（`variantId` 與 `name`）；新建的組記錄 `declined`（設計師決定不沿用的現有元件 ID）；每個原稿記錄 `main`（被指定的 variant，設計師決定保留時為 null）。被外層 instance 取代的巢狀原稿若是設計師決定保留的，維持 `kept` 狀態並加上 `by`。
- 比對區塊每列新增：`match`（variant ID 最多兩個，以及作為說明文字的 `tag`）與 `alts`（最多三筆，各有 `id` 與 `tag`）。
- 配對結果用字固定為 `exact`、`partial`、`unconfirmed`；名稱證據用字固定為 `agree`、`conflict`、`neutral`。

**失敗與例外處理：**

- 清單為空：省略第二次偵測，所有組照一般流程建立。
- 配對並列無法排序：標為 `needs-review` 並請設計師選，不自行挑選。
- variant 名稱不符合該 set 的屬性或重名：不寫入，重新詢問名稱。
- 新增 variant 的任何檢查失敗或拋出錯誤：移除新元件、還原 set 尺寸、回報原因，改問建立新元件或維持原樣。
- 設計師指定的元件骨架不同：不作為沿用對象，說明原因並改問。
- 替換時指定的 variant 已不存在：該原稿保留原樣並回報，針對該組重新偵測後詢問。
- 現有元件樣本的字型無法載入：比對區塊略過該樣本並在結果中列出，不影響詢問。

**驗收方式：**

- 以模擬節點樹在 Node 執行偵測腳本的配對邏輯，結果需與 componentize-reuse-matching spec 的「Match outcomes」範例逐列一致，並涵蓋：`Chip` 排在 `Button` 前面時按鈕仍配到 `Button`；只有 Filled 的 `Button` set 對上 Outlined 原稿得到 `partial` 與正確的 `uncovered`；未命名原稿對上樣式相同的 `Chip` 得到 `unconfirmed`；兩個現有元件並列時標為 `needs-review`；骨架不同的同名元件得到 `clash`；`REUSE` 為 `false` 時不沿用。
- 以 500 個模擬 variant 執行清單腳本，`CORES` 與 `NAMES` 過濾後只回傳符合的項目，且每頁 JSON 不超過 18,000 字元。
- variant 名稱檢查與擺放位置的計算寫成可單獨執行的函式，在 Node 以 spec 的「Variant name checks」範例逐列驗證。
- 所有腳本通過 Node 語法檢查，且不呼叫 `loadAllPagesAsync()`、不使用同步 getter、不從 document root 搜尋。
- SKILL.md 的 description 不超過 1024 字元、沒有超過 15 行的程式碼區塊、引用的參考文件章節都存在。
- 文件頁每個導覽連結的錨點都存在，且在 500、768、1280 px 寬度下沒有水平溢出。
- 用字（`exact`、`partial`、`unconfirmed`、三個選項的名稱、ledger 欄位）在 SKILL.md、三份參考文件與文件頁之間一致。
- `spectra validate improve-componentize-reuse-matching` 通過。

**範圍：**

- 範圍內：`figma-componentize/SKILL.md`、`figma-componentize/references/detection.md`、`figma-componentize/references/build-recipes.md`、`figma-componentize/references/replacement.md`、`figma-componentize/docs/index.html` 中與沿用現有元件有關的規則、腳本與說明。
- 範圍外：Non-Goals 所列項目、figma-m3-variables 的任何檔案、repo 外的已安裝副本、既有的候選偵測與分組規則（除了為配對新增的輸出欄位）。

## Risks / Trade-offs

- [Risk] 在現有 set 加入新元件的 API 行為未經實測 → Mitigation：寫入後逐項檢查，任何不符就移除新元件並改問其他選項；還原點在建立前已由設計師存好；第一次在實際檔案執行時優先驗證這一步（列入 Open Questions）。
- [Risk] 新增 variant 讓 set 變大而蓋到旁邊的內容 → Mitigation：只往下方加、不搬移任何既有節點，並回報重疊的節點讓設計師自行調整。
- [Risk] 流程多一次偵測呼叫 → Mitigation：只有清單不是空的時候才執行第二次；沒有相關元件的檔案不受影響。
- [Risk] 詢問變多，設計師覺得繁瑣 → Mitigation：`exact` 不問；同一組的問題合併在一次詢問；只在會動到現有元件、可能建出重複元件、或配對不確定時才問。
- [Risk] 名稱比對對中英文混用或自訂命名效果有限 → Mitigation：名稱只用來排序與決定是否自動沿用；無法判斷時走 `unconfirmed` 詢問，不會自動配對。
- [Risk] 骨架稍有不同的現有元件仍認不出來 → Mitigation：同名時會被 `clash` 規則攔下並詢問，不會默默建出同名元件；容許骨架差異的比對列為 Non-Goal。
- [Risk] 既有 spec 尚未封存，本變更以新 capability 補充而非修改既有 requirement，兩邊對「沿用」的描述並存 → Mitigation：新 spec 明確定義「相符」的判定；封存 `add-figma-componentize` 後若要合併敘述，另開整理用的 change。

## Migration Plan

1. 本變更修改的檔案由 `add-figma-componentize`（PR #4，尚未合併）新增；發 PR 時以該分支為 base，或等 PR #4 合併後再發。
2. 實作並驗收後，詢問使用者是否把更新後的 figma-componentize 同步到四個已安裝位置（Claude Code、Cursor、Codex 及其共用位置）。
3. 回復方式：以 git 還原上述五個檔案。

## Open Questions

- 在現有 component set 加入新元件的寫法需要在實際 Figma 檔案驗證一次（含：新 variant 是否出現在 set 的 variant 選項中、既有 instance 是否不受影響）。驗證前以「檢查失敗就復原並改問」作為保護。
- team library 元件的沿用：查證顯示匯入 API 與搜尋工具都存在，建議另開 change 設計（開始前詢問要沿用的 library、搜尋相符元件、匯入後照本變更的配對規則處理）。
