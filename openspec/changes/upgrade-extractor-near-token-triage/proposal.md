## Why

在設計稿混亂的專案（多份日期分頁、PM 用 AI 複製修改、元件被 detach）跑 design-system-extractor 時，近似 token 稽核會列出幾十到上百對「太接近」的 reference token，近似元件審查也一列列堆疊。目前的稽核是兩兩比對、以 pair 為決策單位、沒有使用次數訊號，開發者必須逐對人工判斷，審查成本高到流程會被跳過。這個 change 把近似 token 與近似元件的審查從「逐對判斷」變成「例外處理」：機器分群、自動選 canonical、依 provenance 分層，人只看真正需要設計判斷的那幾群。

## What Changes

- 近似 reference token 改以 cluster 為單位：以近似配對為邊取連通分量，再以群內最大距離上限拆群，避免鏈狀關係把不該合的值串在一起；顏色距離改用 CIEDE2000（ΔE2000）取代 ΔE76。
- 每個 cluster 自動選出 canonical token：authored 優先、再依使用次數（sys 層 var() 引用數加上可選的 usage 註解）、再依名稱決定，確保結果可重現。
- 新增三層 triage：auto（肉眼不可分辨且不涉及 authored 衝突，或 measured 值落在 authored 吸附門檻內）、proposal（measured 對 measured 的中間帶，或任一側 provenance 未標記）、must-ask（同群有兩個以上 authored、或 measured 值離 authored 超出吸附門檻）。
- ref token 的 provenance 與使用訊號以緊鄰宣告的 CSS 註解標記（provenance: authored / measured；usage: 數字；sources: 來源 ID），不新增檔案也不改萃取套件格式。
- audit_tokens.mjs 的近似 token 輸出改為每群一段：canonical、成員、距離、層級、是否已有決策；strict 模式仍要求每個非 canonical 成員對 canonical 有一筆已記錄的決策，但 auto 層可由新腳本機械式寫入。
- 新增 apply_token_decisions.mjs：依層級把 member 對 canonical 的決策列寫入 TOKEN_ARCHITECTURE.md 的 Near Token Decisions 表（欄位不變），支援 dry-run、指定保留的成員、記錄確認者，並可選擇改寫 CSS 把 merge 的成員引用換成 canonical 並刪除成員宣告。
- 長度類 reference 數值新增 4pt / 8pt grid scale fitting：報告擬合出的 base、落在 grid 上的數量與 outlier 清單；只作警告，不阻擋 strict。
- generate_review_html.mjs 的 Near Color Tokens 與 Near Number Tokens 區塊改為 cluster 卡片（色票並排、層級徽章、使用次數、預設決策），每個層級提供「複製決策 markdown」按鈕；Similar Components 區塊依候選與既有元件的關聯分群，同群的視覺參考並排成 contact sheet；JSON 輸出新增 clusters 欄位。
- audit_components.mjs 新增相似度分群摘要（群數與未決群數），不改既有判定規則。
- 新增 fixture near-token-clusters 與對應的回歸測試；更新 SKILL.md 步驟 4、references/token-architecture.md、references/audits.md、README 與 TOKEN_ARCHITECTURE.md 範本的說明文字。

## Non-Goals (optional)

（詳見 design.md 的 Goals / Non-Goals）

## Capabilities

### New Capabilities

- `near-token-clustering`：以 ΔE2000 與同 family 數值距離建立近似圖、取連通分量並以群內最大距離上限拆群，為每群選出 canonical；provenance 與 usage 註解的解析。
- `near-token-triage`：auto / proposal / must-ask 三層判定規則、measured 值對 authored 值的吸附門檻、未標記 provenance 的處理，以及 audit_tokens.mjs 的分群輸出與 strict 語意。
- `token-decision-apply`：apply_token_decisions.mjs 依層級把決策列寫入 Near Token Decisions 表，支援 dry-run、keep、confirmed-by 與 rewrite-css。
- `numeric-scale-fit`：長度類 reference 數值的 4pt / 8pt grid 擬合與 outlier 報告。
- `review-cluster-cards`：review.html 的 cluster 卡片、複製決策 markdown、元件 contact sheet 分群與 JSON clusters 欄位；audit_components.mjs 的相似度分群摘要。
- `extractor-triage-workflow`：SKILL.md 步驟 4 的新流程（標記 provenance、跑分群稽核、機械式套用 auto 層、對 proposal 群只問一次、must-ask 逐群問）與 references 文件更新。

### Modified Capabilities

（無；既有 specs 只涵蓋 figma-componentize，與本 change 無關）

## Impact

- Affected specs: near-token-clustering、near-token-triage、token-decision-apply、numeric-scale-fit、review-cluster-cards、extractor-triage-workflow（皆為新增）
- Affected code:
  - New:
    - design-system-extractor/scripts/lib/token_review.mjs
    - design-system-extractor/scripts/apply_token_decisions.mjs
    - design-system-extractor/scripts/fixtures/near-token-clusters/tokens/tokens-ref.css
    - design-system-extractor/scripts/fixtures/near-token-clusters/tokens/tokens-sys.css
    - design-system-extractor/scripts/fixtures/near-token-clusters/tokens/tokens-comp.css
    - design-system-extractor/scripts/fixtures/near-token-clusters/tokens/tokens.css
    - design-system-extractor/scripts/fixtures/near-token-clusters/design-system/TOKEN_ARCHITECTURE.md
  - Modified:
    - design-system-extractor/scripts/audit_tokens.mjs
    - design-system-extractor/scripts/audit_components.mjs
    - design-system-extractor/scripts/generate_review_html.mjs
    - design-system-extractor/scripts/test_audits.mjs
    - design-system-extractor/SKILL.md
    - design-system-extractor/README.md
    - design-system-extractor/references/token-architecture.md
    - design-system-extractor/references/audits.md
    - design-system-extractor/assets/design-system-template/design-system/TOKEN_ARCHITECTURE.md
  - Removed: （無）
- 相容性：Near Token Decisions 表欄位不變，既有以 pair 記錄的決策與 token-review CSS 註解照舊被接受；既有 fixture 的稽核結果維持不變；review.html 的區塊 id 維持不變。
- 工具相依：只用 Node 內建模組，無新套件；Node 18 以上可跑。
