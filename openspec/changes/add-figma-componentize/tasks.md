## 1. 偵測（`figma-componentize/references/detection.md`）

- [x] 1.1 依設計決策「候選以範圍為準，不要求重複」「以結構簽章分組」撰寫偵測規則，交付 Candidate detection without a repetition requirement、Grouping into components, variants, and properties、Reuse of existing components、Confidence and questions：完成後參考文件有 UI 模式表（名稱與結構特徵）、候選條件與排除規則（畫面層級 frame 的寬度範圍、純排版外框、既有元件與 instance、隱藏與鎖定圖層）、atom／molecule／organism 層級、結構簽章的組成（含無 auto layout 時的子節點位置、constraints 與固定文字框尺寸，因為 instance 無法覆寫這些屬性）、分組規則表（TEXT、INSTANCE_SWAP、BOOLEAN、圖片覆寫、`Style`、`Size`、`State`、不同元件、近似值交給 Workflow F）、與 local components 比對重用的方法，以及 `exact`、`inferred`、`needs-review` 的判斷。驗證：人工核對規則表與 componentize-detection spec 的「Detection decisions」「Grouping outcomes」範例逐列一致。
- [x] 1.2 依設計決策「兩種比對區塊各司其職」「腳本回傳精簡並分頁」完成偵測腳本、分組比對區塊與計畫格式，交付 Scope intake and prerequisites、Grouping review board、Componentization plan confirmation：完成後參考文件有前置條件檢查清單、範圍確認條件（超過 50 個頂層 frame 或跨頁）、逐頁執行的偵測腳本（回傳精簡的候選、層級、簽章、分組與排除原因，每頁 JSON 不超過 18,000 字元並回傳 `nextOffset`）、`Componentize Review — temporary` 比對區塊的腳本（每組最多四個代表實例的 clone、縮放到 400 px 寬內、名稱、對應、數量、信心度）與清除方式，以及計畫的欄位與 Tier 摘要。驗證：腳本通過 Node 語法檢查；以 3,000 個模擬節點執行時每頁不超過 18,000 字元；以模擬節點樹（390 px 畫面內含一張含按鈕的卡片與兩個按鈕，其中一個 outlined、一個 padding 為 15 px）執行偵測腳本，結果為畫面排除、三個 atom、一個 molecule，`Button` 有 `Style=Filled`／`Style=Outlined` 與 `Label` 屬性，15 px 差異被標為交給 Workflow F。

## 2. 建立（`figma-componentize/references/build-recipes.md`）

- [x] 2.1 [P] 依設計決策「寫入前建立還原點」「Components 頁面的判斷與建立」「由小到大，從 clone 建立主元件」「元件屬性加在 component set 上，巢狀內容用 exposed instance」「命名與擺放」撰寫建立參考文件，交付 Restore point before writing、Components page、Bottom-up construction from clones、Component properties、Variants in a component set、Naming and placement：完成後參考文件有請使用者手動存版本並等待確認的步驟（`use_figma` 無法存版本）與 ID 對照表的格式、找出或建立 Components 頁面（Starter 方案 3 頁上限時改在既有頁面建立 `Components` Section）、依層級由小到大建立的流程（每次呼叫一個元件或 set、clone 前載入字型、自動命名的子圖層改用結構名稱、轉換後檢查回傳節點、失敗時包進 frame 再轉換）、從 clone 建立主元件並把內部已建好的較小元件換成 exposed instance 的腳本、在 component set 合併後加入 TEXT／BOOLEAN／INSTANCE_SWAP 屬性並連到每個 variant 的腳本、合併後依 Figma 官方慣例排成格狀（`State` 為欄、其餘組合為列、間距 20 px、內距 40 px、預設 variant 在左上角、一個 set 最多 30 種組合）的腳本、元件與屬性的命名規則，以及每個元件一個 Section 的擺放方式與回傳的 ID。驗證：腳本通過 Node 語法檢查；以 `Style` = Filled、Outlined 與 `State` = Enabled、Disabled 推演格狀排列，`State` 為欄、`Style=Filled, State=Enabled` 在左上角、間距 20 px、內距 40 px，四個 variants 互不重疊。

## 3. 替換（`figma-componentize/references/replacement.md`）

- [x] 3.1 依設計決策「替換採先放 instance、比對通過才刪原稿」「巢狀內容的對應方式」「腳本回傳精簡並分頁」撰寫替換流程，交付 Replacement is a confirmed Tier 3 change、Outermost occurrences first、Placement is preserved、Content is carried over、Per-occurrence verification with fallback、Occurrences that are kept、Chunked and traceable writes：完成後參考文件有 Tier 3 確認時要附上的內容、最外層優先的順序、替換前要記錄的原稿狀態（parent、index、`relativeTransform`、尺寸、constraints、`layoutPositioning`、sizing、`layoutGrow`、`layoutAlign`、GRID 位置、可見性、名稱、絕對座標）、先隱藏原稿再插入 instance 的步驟與排版屬性的設定順序（先 `layoutPositioning`、再位置、再 `resize()`、最後 sizing；GRID 用 `setGridChildPosition`）、依結構路徑對應文字／圖片（沿用 `imageHash`）／可見性／巢狀 exposed instance 的覆寫與讀回確認、圖層名稱的保留規則、逐項比對（與記錄的座標與尺寸比對、容差 0.5 px、可見文字、可見子圖層數量）與不一致時刪除 instance 並恢復原稿可見性的腳本、略過規則（含缺字型與 use_figma 不支援的自訂字型），以及每次最多 50 個替換、一次一頁、只回傳 ID 對照並控制在 18,000 字元內的分批方式。驗證：腳本通過 Node 語法檢查；以 componentize-replacement spec 的「Verification outcomes」範例逐列推演比對函式，結果一致。
- [x] 3.2 撰寫最終驗證與報告格式，交付 Final verification and report、Workflow F results recorded：完成後參考文件有替換後逐一截圖並與基準比對的步驟、報告格式（建立的元件與 ID、variants、屬性、已替換與保留的實例及原因、Workflow F 回傳的 tokens 結果、還原點名稱、ID 對照表、Components 頁面連結）與暫時比對區塊的清除。驗證：人工核對報告欄位與設計文件 Implementation Contract 的報告欄位一致。

## 4. SKILL.md（`figma-componentize/SKILL.md`）

- [x] 4.1 依設計決策「獨立的 figma-componentize，tokens 交給 Workflow F」「先 tokens 再替換」「沿用 figma-m3-variables 的變動分級」「Skill 結構」撰寫 SKILL.md，交付 Step sequence and change tiers in SKILL.md、Reference files have single responsibilities、Trigger description、Workflow F runs on the new components、Tokens before replacement、Declined or failed token step：完成後 SKILL.md 有 frontmatter（含中文觸發詞並說明只要 tokens 時改用 figma-m3-variables）、前置條件、步驟順序與各步驟的 Tier、呼叫 Workflow F 的輸入與時機、使用者拒絕 tokens 時的確認、與其他 skill 的分工，以及參考文件清單。驗證：以 python 計算 description 不超過 1024 字元；以腳本確認沒有超過 15 行的程式碼區塊，且 SKILL.md 引用的參考文件章節都存在。

## 5. 文件頁與交叉引用

- [x] 5.1 撰寫中文文件頁 `figma-componentize/docs/index.html`，交付 Documentation page：完成後頁面說明步驟順序、偵測與分組規則（含範例）、分組比對區塊、變動分級與安全機制（還原點、逐項驗證、不一致就保留原稿）、報告，以及與 figma-m3-variables 的關係。驗證：以腳本確認每個導覽連結的 `#id` 都存在；在 500、768、1280 px 寬度下量測沒有水平溢出。
- [x] 5.2 [P] 更新 figma-m3-variables 的交叉引用，交付 Cross-references with figma-m3-variables：完成後 `figma-m3-variables/SKILL.md` 的分工表與 `figma-m3-variables/docs/index.html` 的技能分工表把 figma-componentize 列為可用的 skill，並描述它透過 Workflow F 處理 tokens。驗證：以 grep 確認兩個檔案中描述 figma-componentize 的地方不再出現「planned」或「規劃中」。

## 6. 整體驗證

- [x] 6.1 跨檔一致性與規格驗證：比對區塊名稱 `Componentize Review — temporary`、還原點名稱格式、`Style`／`Size`／`State`、Workflow F 介面欄位（scope、components、caller；variables、styles、bindings、mergedGroups、skipped）在 SKILL.md、三份參考文件、文件頁與 figma-m3-variables 之間一致；所有腳本沒有 `loadAllPagesAsync()` 呼叫、同步 getter 或從 document root 的搜尋。驗證：以 grep 與腳本檢查上述項目，並執行 `spectra validate add-figma-componentize` 通過。
