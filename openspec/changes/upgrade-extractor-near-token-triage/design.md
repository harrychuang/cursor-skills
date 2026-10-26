## Context

design-system-extractor 的 token 稽核（design-system-extractor/scripts/audit_tokens.mjs）與視覺審查頁產生器（design-system-extractor/scripts/generate_review_html.mjs）目前以兩兩比對找近似 reference token：顏色用 ΔE76 小於等於 3，數值在同一 family 與單位群內用固定差值門檻。每一對都要一筆「merge / keep distinct」決策，記錄在 design-system/TOKEN_ARCHITECTURE.md 的 Near Token Decisions 表或 token-review CSS 註解，strict 模式沒有決策就報 issue。provenance（authored / measured）規則寫在 references/token-architecture.md，但稽核腳本讀不到每個 token 的 provenance，也沒有任何使用次數訊號。元件相似度由 agent 以文字指紋判斷，每個重疊一列，review.html 逐列呈現。

在設計稿混亂的專案，這套機制會產生幾十到上百對候選，且鏈狀關係（A 近 B、B 近 C）在 pair 列表裡看不出是同一群。人工逐對審查成本過高，流程會被跳過。

限制：
- 只能用 Node 內建模組；Node 18 可跑（機器預設 Node 18.17）。
- 既有 fixture 的稽核結果與 review.html 區塊 id 必須不變；Near Token Decisions 表欄位不變，因為 ds-to-storybook 的 contract 測試會讀範本。
- 不改萃取套件的檔案格式；provenance 與使用訊號只能以 ref token 旁的 CSS 註解承載。
- 工作樹上已有這些腳本的未提交修改（branch optimize-skills-course），實作必須以工作樹版本為基底。

## Goals / Non-Goals

**Goals:**

- 近似 token 以 cluster 為單位呈現與決策，幾十對候選收斂成個位數的群。
- 每群自動選出 canonical，並依 provenance 與距離把每個成員分成 auto / proposal / must-ask。
- auto 層可由腳本機械式寫入決策（並可改寫 CSS），不需要人看。
- proposal 層只問一次（整個群表），must-ask 層逐群問。
- 長度類數值提供 4pt / 8pt grid 擬合報告，只列 outlier。
- review.html 以 cluster 卡片與 contact sheet 呈現，並能複製決策 markdown。
- 既有的 pair 決策、CSS 註解、fixture、區塊 id 全部向後相容。

**Non-Goals:**

- 不從 Figma 節點抽結構化元件指紋，也不計算截圖 perceptual hash；元件相似度判定規則不變，只做分群呈現。
- 不新增使用次數的獨立資料檔；usage 只來自 sys / comp 層的 var() 引用數與可選的 usage 註解。
- 不做字級 type scale ratio 擬合；scale fitting 只處理長度單位。
- 不自動刪除或改寫 authored token 的值；吸附只允許 measured 併入 authored。
- 不改 ds-to-storybook、figma-storybook-sync 或任何其他 skill。
- 不把 review.html 做成可直接寫回檔案的介面；寫回仍由 apply_token_decisions.mjs 負責。

## Decisions

### 共用模組 token_review.mjs 承載分群與分層邏輯

新增 design-system-extractor/scripts/lib/token_review.mjs，匯出標記解析、ΔE2000、分群、canonical 選擇、分層、scale fitting、決策列 markdown 產生與 var() 引用計數。audit_tokens.mjs、generate_review_html.mjs 與新的 apply_token_decisions.mjs 都從這個模組取用，避免三份腳本各自複製一套門檻。既有的顏色與數值解析函式留在各腳本內不搬動，模組只接收已解析的資料（顏色物件 r g b a、數值物件 normalized 與 unitGroup、declarations Map），把對既有腳本的改動縮到最小。例外是 apply_token_decisions.mjs：它沒有自己的解析資料，因此模組另外提供 loadTokenPackage(targetRoot)（內含一份解析器與決策偵測的複本）供它讀取套件並重算 cluster；audit 與 review 兩支腳本仍用各自的解析器。

替代方案：把整個解析層也抽進模組。放棄，因為兩支腳本在工作樹上都有未提交修改，大規模搬動會提高衝突風險。

### 以 ΔE2000 取代 ΔE76 並保留既有近似門檻

顏色距離改用 CIEDE2000（sRGB 轉 XYZ 轉 Lab，D65），近似邊的門檻維持 3.0、alpha 差 0.03。ΔE2000 對高飽和區的差異壓縮較貼近人眼，既有 fixture 的近似對（#9fe870 對 #9fe871、#6b6b6b 對 #6c6c6c）在兩種公式下都遠小於 1，結果不變。輸出訊息中的距離標示改為 deltaE2000。

替代方案：OKLab 歐氏距離。放棄，因為 JND 與門檻在文獻上以 ΔE2000 為主流，便於向設計師說明。

### 連通分量加群內直徑上限的分群策略

把每一對近似關係當成邊，先取連通分量；若分量內任兩成員的距離超過直徑上限（顏色 ΔE2000 6.0；數值為該單位群近似門檻的兩倍：長度 4、時間 100、百分比與角度 4、純數 0.04），在分量內做 complete-linkage 聚合，只合併跨群最大距離不超過上限的群，直到無法合併。分量只在近似邊上形成，所以不會把沒有近似關係的值因直徑上限而硬併在一起。cluster id 以 C 加序號命名，依 kind、family、canonical 名稱排序後編號，確保可重現。

替代方案：k-means 或固定格子量化。放棄，因為需要預設群數或會把邊界值隨機分到兩側。

### canonical 選擇順序

群內 canonical 依序比較：provenance（authored、measured、unknown）；使用分數降冪（sys 與 comp 層對該 token 的 var() 引用數，加上 usage 註解數值）；顏色偏好 step 為 10 的倍數、數值偏好落在 4pt grid 上；最後以名稱字典序升冪決勝。所有條件皆為確定性，因此同一輸入永遠得到同一個 canonical。

### 三層 triage 規則與吸附門檻

每個非 canonical 成員對 canonical 計算距離，依兩側 provenance 分層：

| 成員 provenance | canonical provenance | 距離條件 | 層級 | 預設決策 |
|---|---|---|---|---|
| measured | authored | 顏色 ΔE2000 ≤ 2.0；長度差 ≤ 1、時間 ≤ 16、百分比與角度 ≤ 1、純數 ≤ 0.01 | auto | merge（吸附進 authored） |
| measured | authored | 超過吸附門檻但在近似門檻內 | proposal | keep distinct |
| measured | measured | 顏色 ΔE2000 ≤ 1.0；數值同上列的 auto 門檻 | auto | merge |
| measured | measured | 超過 JND 但在近似門檻內 | proposal | merge |
| 任一側 unknown | 任意 | 任何距離 | proposal | 對方為 authored 時 keep distinct，否則 merge |
| authored | authored | 任何距離 | must-ask | 無 |

群的層級取成員中最嚴格者（must-ask 大於 proposal 大於 auto）。unknown 永遠不能進 auto，因為沒有 provenance 就無法證明是測量誤差。

替代方案：unknown 視同 measured 可進 auto。放棄，因為既有套件多半沒有標記，若視同 measured 會把大量未知值自動併掉。

### provenance 與 usage 以 CSS 註解標記

在 ref token 宣告的緊鄰前置註解或同行尾註解內寫 provenance: authored 或 provenance: measured，可選 usage: 整數 與 sources: 來源 ID 清單，以分號分隔。既有的 parseDeclarations 已能取得這兩種註解，無須改檔案格式。沒有標記的 token 為 unknown。

### 決策仍以 member 對 canonical 的 pair 列記錄

Near Token Decisions 表欄位不變，每個非 canonical 成員寫一列：Candidate A 為成員、Candidate B 為 canonical、Difference 寫距離與層級、Decision 為 merge 或 keep distinct、Rationale 寫規則名稱與群 id、Confirmed by 寫 auto-tier 或確認者。既有的 hasReviewDecision（CSS 註解或 TOKEN_ARCHITECTURE.md 同一行同時出現兩個名稱並含決策關鍵字）不用改即可辨認這些列，也就自然向後相容。

### apply_token_decisions.mjs 的寫入與 CSS 改寫

新腳本重新計算 cluster，依 --tier 篩出尚未記錄的成員，產生決策列並寫進 Near Token Decisions 表的最後一列之後；表或章節不存在時在檔尾補上章節與範本表頭。--tier auto 不需確認者；--tier proposal 與 --tier must-ask 必須給 --confirmed-by；--keep 與 --merge 可覆寫個別成員的決策；--only 限定 canonical；--decision 供 must-ask 指定；--dry-run 只印不寫；--json 印機器可讀結果。--rewrite-css 對每一筆 merge 把 tokens-ref.css、tokens-sys.css、tokens-comp.css 內的 var(成員) 改成 var(canonical)，並刪除成員在 tokens-ref.css 的宣告行；已有決策的成員跳過，重跑不重複寫入。

替代方案：在 review.html 裡做寫回。放棄，因為 review.html 是靜態檔案，無法寫檔；改以「複製決策 markdown」與「複製指令」銜接。

### 長度 scale fitting 只警告不阻擋

對 unitGroup 為 length 的 ref 數值，排除大於 512 的值（斷點、9999 類圓角）與 1、2 的 hairline 例外，分別以 base 4 與 base 8 計算每個值到最近倍數的殘差，取總殘差較小者為 base，平手取 8。殘差 ≤ 0.5 為 on-grid，0.5 到 1 為 near-grid，大於 1 為 outlier。audit_tokens.mjs 以一行摘要加一行 outlier 清單輸出為 warning，任何模式都不升級為 issue；review.html 新增 scale-fit 區塊。

### review.html 的 cluster 卡片與 contact sheet

Near Color Tokens 與 Near Number Tokens 區塊保留原 id，但內容改為每群一張卡片：群 id、層級徽章、canonical 的色票或數值、provenance、使用分數；成員列含色票、距離、層級、預設決策、文件狀態。每個層級一個「複製決策 markdown」按鈕，用 navigator.clipboard 並以選取隱藏 textarea 作為失敗後備；另附可複製的 apply_token_decisions.mjs 指令字串。Similar Components 區塊以候選名與既有元件名做 union-find 分群，同群的視覺參考並排成 contact sheet，列資料照舊呈現。--json 輸出在 counts 與 needsReview 之外新增 clusters（colors、numbers、components、scaleFit）。

### SKILL.md 步驟 4 的新流程

步驟 4 改為：寫草稿 ref token 時標記 provenance 與 usage；跑非 strict 稽核得到 cluster 報告；直接執行 apply --tier auto --rewrite-css，不問；對 proposal 群只 STOP 一次，呈現每群一列的表與預設決策，開發者接受全部或指出例外，再以 apply --tier proposal 記錄；must-ask 群逐群呈現色票與使用處並以 apply --tier must-ask 記錄。Decision Vocabulary 的 Near token 列同步加入層級說明。references/token-architecture.md 新增三層規則表與標記語法；references/audits.md 新增新腳本與輸出說明；README 與範本 TOKEN_ARCHITECTURE.md 的說明文字同步。

## Implementation Contract

**Behavior**

- 執行 node design-system-extractor/scripts/audit_tokens.mjs 目標根目錄（非 strict）時，stdout 含一行 Near token clusters: 總數 (auto N, proposal N, must-ask N)，接著每群一行摘要；每個尚未記錄決策的非 canonical 成員各輸出一則 warning，訊息以 Near reference colors need review: 或 Near reference numbers need review: 開頭，先列 canonical 再列成員，含 deltaE2000 或差值、群 id、層級與預設決策。strict 模式下這些 warning 成為 issue。Token review candidates 與 Documented review decisions 兩行維持，計數單位為成員對 canonical 的關係。
- 存在長度 ref 數值時，stdout 含一行 Scale fit (length): base Npx, on-grid a/b, outliers n；有 outlier 時再輸出一則列出每個 outlier、其值與最近 step 的 warning。
- audit_tokens.mjs 加 --json 時只印一個 JSON 物件（clusters、scaleFit、counts、issues、warnings），不印其他文字。
- node design-system-extractor/scripts/apply_token_decisions.mjs 目標根目錄 --tier auto 會把所有未記錄的 auto 成員以 merge 寫入 Near Token Decisions 表並印出寫入列數；加 --dry-run 只印列；加 --rewrite-css 改寫三個 token CSS 並印出改寫與刪除數。--tier proposal 或 must-ask 缺 --confirmed-by 時以 exit 2 與訊息拒絕；未知 --tier 或無目標根目錄同樣 exit 2。
- 寫入後再跑 audit_tokens.mjs --strict，被寫入的成員不再是候選。
- node design-system-extractor/scripts/generate_review_html.mjs 目標根目錄 產生的 review.html 保留 source-duplicates、color-scale、near-colors、near-numbers、components 五個區塊 id，並新增 scale-fit；near-colors 與 near-numbers 內每群一張含 data-tier 屬性的卡片；每層有複製按鈕。--json 輸出的頂層鍵為 counts、needsReview、clusters。
- audit_components.mjs stdout 新增 Similarity clusters: N 與 Unresolved similarity clusters: N 兩行；判定規則與 exit code 不變。

**Interface / data shape**

- CSS 標記：provenance: authored | measured；usage: 非負整數；sources: 以逗號分隔的來源 ID。寫在宣告的前置註解或同行尾註解，分號分隔，大小寫不敏感。
- token_review.mjs 匯出：parseReviewMarkers(declaration)、deltaE2000(colorA, colorB)、countVarReferences(cssTexts)、buildTokenClusters(input)、fitLengthScale(numbers)、decisionRowMarkdown(entry)、TIERS 常數與門檻常數。buildTokenClusters 回傳 { clusters, counts }；cluster 形狀為 { id, kind, family, unitGroup, tier, canonical: { name, value, provenance, usage, step }, members: [{ name, value, provenance, usage, distance, distanceLabel, tier, proposed, rule, documented }] }。
- Near Token Decisions 列：| 成員 | 成員 provenance | canonical | canonical provenance | 距離與層級 | merge 或 keep distinct | 規則與群 id | 確認者 |。
- apply_token_decisions.mjs 選項：--tier auto|proposal|must-ask、--only、--keep、--merge、--decision merge|keep-distinct、--confirmed-by、--rewrite-css、--dry-run、--json、--help。

**Failure modes**

- 沒有任何 ref token 或沒有近似關係：cluster 行印 0，不輸出 warning，exit 0。
- TOKEN_ARCHITECTURE.md 不存在時 apply 以 exit 1 拒絕並說明要先建立範本；存在但缺 Near Token Decisions 章節時自動補章節與表頭。
- --rewrite-css 遇到 canonical 與成員同名或成員宣告找不到時跳過該筆並在輸出列出。
- scale fitting 在沒有長度值時不印任何行。

**Acceptance criteria**

- node design-system-extractor/scripts/test_audits.mjs 全數通過，包含既有測試與新增的 near-token-clusters 測試：群數與層級計數、canonical 選擇、apply auto 後候選數下降、rewrite-css 後 tokens-ref.css 無被併成員且 tokens-sys.css 的 var() 指向 canonical、proposal 與 must-ask 寫入後 strict 通過、review --json 的 clusters 形狀、scale fit 的 base 與 outlier、hairline 不列 outlier。
- node ds-to-storybook/scripts/test_trace_and_plan_contract.mjs 通過（範本欄位未變）。
- 既有 fixture near-token-css、near-token-doc、a11y-remap、layer-violations、minimal-pass 的結果與測試斷言不變。

**Scope boundaries**

- In scope：design-system-extractor 內的三支稽核與產生腳本、新模組、新腳本、fixture、測試、SKILL.md、references、README、範本說明文字。
- Out of scope：其他 skill、萃取套件格式、Figma 端操作、字級 scale、元件結構指紋。

## Risks / Trade-offs

- [ΔE2000 與 ΔE76 在少數色對上落在門檻兩側不同] → 門檻維持 3.0，fixture 驗證既有近似對不變；訊息標示 deltaE2000 讓差異可追溯。
- [complete-linkage 在大分量上為 O(n³)] → ref token 數量通常在數百以內；分量先由近似邊切分，實務上每個分量很小。
- [--rewrite-css 以正規表示式改寫 var() 可能誤改名稱為前綴關係的 token] → 以 var( 名稱 ) 完整比對並要求名稱後緊接 ) 或逗號。
- [auto 層自動 merge 若 provenance 標錯會併掉真實設計意圖] → 只有明確標記 measured 的值會進 auto；unknown 永遠停在 proposal；寫入列記錄規則與群 id 可回溯。
- [工作樹上有未提交修改] → 實作直接在工作樹版本上改，測試以工作樹為準；不 stash、不 checkout。
- [review.html 的剪貼簿 API 在部分環境不可用] → 以隱藏 textarea 選取作為後備，並顯示可手動複製的指令。
