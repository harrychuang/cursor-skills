## 1. 偵測與配對（`figma-componentize/references/detection.md`）

- [x] 1.1 依設計決策「現有元件清單只收集相關的 variant」改寫現有元件清單的章節與腳本，交付 Existing component inventory：完成後清單腳本接受 `CORES`、`NAMES`、`IDS`、`OFFSET`，只回傳骨架相同、名稱相同或被指定 ID 的 variant，每筆含 `id`、`setId`、`name`、`variant`、`core`、`pattern`、`op`、`st`、`why`；章節說明新的順序（先偵測、再收集清單、清單不是空的才帶清單再偵測一次）與清單為空時省略配對。驗證：腳本通過 Node 語法檢查；以 500 個模擬 variant（其中 3 個骨架相符、2 個名稱相符）執行，只回傳這 5 筆且每頁 JSON 不超過 18,000 字元；`CORES` 與 `NAMES` 都為空時回傳 0 筆。
- [x] 1.2 依設計決策「配對看骨架、名稱、外觀三項證據」「每個原稿在偵測階段就指定 variant」「與現有元件同名時先問名稱」改寫沿用規則與偵測腳本的分組段落，交付 Reuse match by structure, name, and style、Ranking among matching components、Variant assignment per occurrence，以及 Name clash with an existing component 的偵測部分：完成後規則表列出名稱證據（`agree`、`conflict`、`neutral`）、配對結果（`exact`、`partial`、`unconfirmed`）與排序順序；偵測腳本接受清單與 `REUSE`（以骨架為鍵，值為指定的元件 ID 或 `false`），分組摘要輸出 `core`、`byName`、`reuse`、`alternatives`、`clash`，成員清單輸出每個原稿的 `known`；只有 `exact` 或設計師確認且全部 covered 的組才標為 `reuse`。驗證：以模擬節點樹在 Node 執行，結果與 componentize-reuse-matching spec 的「Match outcomes」範例六列逐列一致，並另外確認四種情況：兩個現有元件前三項排序條件相同時標為 `needs-review` 且兩者都列出；covered 較多者勝出；骨架不同的同名元件得到 `clash`；`REUSE` 為 `false` 時該組沒有 `reuse` 且所有 `known` 為 null。
- [x] 1.3 依設計決策「比對區塊用 instance 顯示配對」「沒有合適 variant 時由設計師決定」「設計師可改為不沿用或改沿用另一個元件」「計畫、ledger 與報告記錄沿用細節」更新分組比對區塊、審查提問與計畫格式，交付 Pairing shown on the review board、Designer decides uncovered occurrences、Designer overrides of reuse，以及 Reuse details in the plan, ledger, and report 的計畫部分：完成後比對區塊腳本的每列接受 `match`（最多兩個 variant ID）與 `alts`（最多三筆），以 instance 顯示現有元件樣本並附說明文字，字型無法載入的樣本列入略過清單；審查步驟寫明針對沿用的提問（沿用、不沿用並建立新的、改沿用另一個元件、維持原樣）、uncovered 原稿的三個選項（現有元件不是 component set 時只有兩個並說明原因）、指定元件骨架不同時的說明與改問方式、同名時要求可區分名稱，以及每次決定後重新執行偵測；計畫格式新增 Reused 的配對結果與每個 variant 的數量、Added variants、Built instead of reused、Kept by decision 與 Tier 2 的新增 variant 數量。驗證：腳本通過 Node 語法檢查；以 grep 確認比對區塊腳本對現有元件只呼叫 `createInstance`、沒有對主元件或 set 呼叫 `clone`；人工核對提問選項與 spec 三個 requirement 的條文逐項一致，計畫格式含上述四個區塊。

## 2. 建立（`figma-componentize/references/build-recipes.md`）

- [x] 2.1 依設計決策「只在現有 component set 上新增 variant」新增「在現有 component set 新增 variant」的章節與腳本，交付 Adding a variant to an existing component set：完成後腳本接受 `SET_ID`、`REP_ID`、`NEAREST_ID`、`VARIANT_NAME`、`INNER`、`KIND`；寫入前檢查名稱（屬性名稱須與該 set 完全相同、不可與現有 variant 重名），不通過就不寫入；從代表原稿的 clone 建立元件、依結構位置比照最接近的 variant 設定子圖層名稱與元件屬性連結、放在現有 variants 下方 20 px（set 有 auto layout 時不指定位置）；寫入後檢查 parent、子節點數量加一、原有 variants 的 ID／位置／尺寸不變、set 的屬性名稱沒有增加，任一項不符或拋出錯誤就移除新元件、還原 set 尺寸並回傳 `added: false` 與原因；回傳 `overlap` 列出被蓋到的同層節點，不搬移任何節點；章節註明轉換失敗時不包 frame 重試。驗證：腳本通過 Node 語法檢查；名稱檢查與擺放位置計算寫成可單獨執行的函式，在 Node 以 spec 的「Variant name checks」範例五列逐列驗證，並以三個既有 variant 的座標推演新 variant 的位置在最低者下方 20 px、既有座標不變。
- [x] 2.2 更新建立順序、ledger 與命名規則，交付 Variant assignment per occurrence 的建立部分、Name clash with an existing component 的命名部分，以及 Reuse details in the plan, ledger, and report 的 ledger 部分（對應設計決策「每個原稿在偵測階段就指定 variant」「與現有元件同名時先問名稱」「計畫、ledger 與報告記錄沿用細節」）：完成後建立順序寫明沿用的組不建立、設計師選擇加 variant 的組與新元件一起依 atom、molecule、organism 的順序執行新增 variant（先於任何包含它的較大元件）、較大元件內部的較小原稿使用成員清單指定的 variant ID；ledger 範例含沿用組的現有元件 ID、每個原稿的 variant ID 與新增 variant 的 ID 和名稱；命名規則表加上「不可與現有 local component 同名，需設計師提供可區分的名稱」。驗證：ledger 範例通過 JSON 語法檢查；人工核對 ledger 欄位名稱與設計文件 Implementation Contract 及 1.2 的輸出欄位一致。

## 3. 替換與報告（`figma-componentize/references/replacement.md`）

- [x] 3.1 [P] 更新工作清單規則、保留原因、確認訊息與報告格式，交付 Variant assignment per occurrence 的替換部分與 Reuse details in the plan, ledger, and report 的報告部分（對應設計決策「每個原稿在偵測階段就指定 variant」「計畫、ledger 與報告記錄沿用細節」）：完成後工作清單規則寫明沿用組的 `main` 與 `nested` 使用成員清單的 `known` 或新增 variant 的 ID；保留原因表中「沒有相符的元件或 variant」改為「指定的 variant 已不存在：保留原樣、回報，針對該組重新偵測並詢問」；Tier 3 確認訊息與報告範例列出每個沿用元件用到的 variants 與數量、新增的 variants（含 ID）與設計師的沿用決定。驗證：腳本通過 Node 語法檢查；人工核對報告欄位來源表涵蓋 Reused、Added variants、Built instead of reused、Kept by decision 四項，且與 1.3 的計畫格式用字一致。

## 4. SKILL.md（`figma-componentize/SKILL.md`）

- [x] 4.1 [P] 更新步驟與變動分級，交付 Guide and documentation for reuse matching 的 SKILL.md 部分：完成後偵測步驟改為「偵測、收集清單、帶清單再偵測」的順序，分組審查步驟提到沿用的提問與 uncovered 的三個選項，建立步驟提到在現有 component set 新增 variant 並引用對應章節，變動分級表新增一列（在現有 set 新增 variant：Tier 2，需要設計師對該組的明確選擇，全部自動套用的指示不能略過），Out of scope 的 team library 說明維持不變。驗證：以 python 計算 description 不超過 1024 字元；以腳本確認沒有超過 15 行的程式碼區塊，且引用的參考文件章節都存在。

## 5. 文件頁（`figma-componentize/docs/index.html`）

- [x] 5.1 [P] 更新中文文件頁，交付 Guide and documentation for reuse matching 的文件頁部分：完成後頁面有「沿用現有元件」的導覽項目與區塊，以設計師在畫面上會看到的結果說明骨架、名稱、外觀三項比對、三種配對結果、沒有合適 variant 時的三個選項、比對區塊的並排顯示、兩個改寫選項、同名時的提問，以及不比對 team library 的元件；步驟總覽、分組比對區塊、元件化計畫、保留原稿的情況與報告區塊同步更新。驗證：以腳本確認每個導覽連結的錨點都存在；在 500、768、1280 px 寬度下量測沒有水平溢出。

## 6. 整體驗證

- [x] 6.1 跨檔一致性、回歸與規格驗證：`exact`、`partial`、`unconfirmed`、`agree`、`conflict`、`neutral`、提問選項名稱、ledger 欄位與輸出欄位（`known`、`reuse`、`alternatives`、`clash`）在 SKILL.md、三份參考文件與文件頁之間一致；所有腳本沒有 `loadAllPagesAsync()` 呼叫、同步 getter 或從 document root 的搜尋；不帶清單時偵測結果與變更前相同。驗證：以 grep 與腳本檢查上述用字與 API；以前一個 change 的模擬節點樹（390 px 畫面內含一張含按鈕的卡片與兩個按鈕，其中一個 outlined）在清單為空時執行偵測腳本，結果仍為畫面排除、三個 atom、一個 molecule、`Button` 有 `Style=Filled` 與 `Style=Outlined` 及 `Label` 屬性；執行 spectra validate 驗證 improve-componentize-reuse-matching 通過。
