---
name: cross-platform-parity
description: "Export a lead-to-follower platform parity handoff pack after the lead platform's feature slice merges to its integration branch, or audit the follower platform against that pack before and after implementation. Derives the freeze point, change inventory, screen-by-state matrix, visual values, string ids, behavior contract, API/remote-config/event keys, shared component impact and declared platform differences from the merged diff and source code instead of narrative docs; project-specific paths and patterns come from a JSON project profile. Use whenever one platform's feature is handed to the other (iOS to Android or the reverse), the second platform must match an existing implementation, or a cross-platform parity report is requested; not for shared contract rules, feature planning or single-platform work."
---

# Platform parity handoff｜先端到次端的交接包與對齊審計

把「先端（例如 iOS）已合入整合分支的功能」變成次端（例如 Android）能直接對齊的交接包，並在次端用一份報告收斂所有差異。原型是 ToastEnglish 專案的 `toastenglish-cross-platform-parity`（該專案回測：敘述式交接文件被核對出 6 處與實作不一致、視覺只有截圖沒有數值、狀態只拍成功路徑、同步在先端凍結前開始，次端因此追加了 21 輪修正）；本版把專案差異抽成 project profile，其餘流程相同。本 skill 不增加任何修改或外部操作權限，也不取代專案自己的需求／契約流程。

## 先確認 profile 與模式

- 每個專案一份 JSON profile（欄位見 [references/project-profile.md](references/project-profile.md)；範例 [assets/profile.example.json](assets/profile.example.json) 是 ToastEnglish 的實際值）。開工前先確認 profile 存在且值來自原始碼：字串存取方式、資源目錄、mapping 欄位、事件與 remote config 的搜尋樣式都不能用猜的。沒有 profile 時腳本會退回範例並在 stderr 提示；那只適合試跑，不能拿來交接別的專案。
- 選模式：**export** 在先端切片合入整合分支後執行，輸入是該功能的合併 diff（first-parent）；**audit** 在次端執行，分「實作前定位」與「實作後對齊」。先端還沒合入整合分支就不做 export；feature branch 的截圖只能當未凍結參考。
- 目前腳本的字串、事件與 remote config 掃描以 Swift 先端為主（Android 次端的 mapping 與 res 已支援）；先端是 Android 時，分類規則可用 `--platform android`，其餘掃描需擴充 profile 樣式或人工填寫，並在交接包標明。
- 開工前回報：實際讀取的來源、profile 路徑與版本、模式與凍結點、輸出路徑、當次可用的能力（腳本、視覺比對 skill、翻譯查詢）與缺口。

## export：從合併 diff 產出交接包

每一章都標來源（`diff`／`原始碼`／`人工`），讓讀者知道哪些值可以直接對齊、哪些仍是人的判斷。

1. 凍結點：找出功能併入整合分支的合併提交，以 first-parent diff 為輸入；記 branch、merge SHA、build 版本、整合分支是否已含。合併後同區的修正提交另列「後續修正」，不混進主清單。
2. 執行 `scripts/` 的五支唯讀腳本（用法見 [references/scripts.md](references/scripts.md)），輸出到交接目錄的 `inventory/`。腳本只列清單，不下判斷。
3. 在凍結 SHA 讀 diff 觸及的先端原始碼，填視覺數值與行為契約：附檔案與 symbol，記程式值不記註解值；「先端現況」與「應有行為」分欄，產品決策未確認就寫待決並指名決定者。
4. 畫面 × 狀態矩陣只引用凍結 build 的截圖；沒有就寫「未拍」，不用相近狀態或其他 build 的圖代填。
5. 字串清單列觸及畫面的每個共用 id、各語系在先端本機資源的狀態、仍硬編的候選；翻譯後台查不到時「後台狀態」寫「未查」，不猜。
6. 人工章節（允許的平台差異、待決事項）明寫確認來源與決定者。
7. 依 [templates/handoff-manifest.md](templates/handoff-manifest.md) 寫 `<profile handoff.outputDir>/00-manifest.md`，媒體索引用 [templates/media-index.json](templates/media-index.json)。截圖與影片留本機（`profile handoff.mediaRoot`），repo 只放 manifest、索引與 `inventory/`。

九章的最小欄位、來源規則與常見錯誤見 [references/manifest-chapters.md](references/manifest-chapters.md)；逐章填寫前先讀它。

## audit：在次端做一次對齊

- 實作前定位：把 manifest 每一項對到次端落點（module、檔案、symbol），標「已有／需擴充／新增」；把所有 `人工` 來源的章節整理成開工前要使用者決定的清單；另掃一遍本功能觸及畫面的既有差異（先端沒改、但兩端本來就不一樣的元素），因為 diff 導向的 export 看不到它們。
- 實作後對齊：對凍結 SHA 逐項判定 `一致`／`差異`／`允許差異`／`未驗`／`待決`，每列附證據（測試名、截圖路徑或 symbol）；沒有證據就是 `未驗`，不是 `一致`。事件與計數要對「記錄時機」與「數值定義」，名稱相同不算一致。
- 視覺比對交給 `ui-pixel-alignment`（報告）與 `ui-compare-to-reference`（修復）。這兩個 skill 只有在當次 runtime 列出時才用；缺席就依矩陣與視覺數值章做人工截圖對照，並在報告的「方法」欄寫明，不宣稱像素檢查通過。
- 輸出一份 `audit-<YYYY-MM-DD>-<pre|post>.md`（範本 [templates/audit-report.md](templates/audit-report.md)），結尾是「一次回寫清單」，讓使用者一次審完、一次回寫到專案的需求／設計系統（例如 Spectra 的 ingest）。audit 不修改次端程式、翻譯資源或任務清單。

檢查清單與判定定義見 [references/audit-checklist.md](references/audit-checklist.md)。

## 邊界

- 不啟動 App、不建置、不連網、不安裝套件；不修改任何產品 repo，腳本只讀取。
- 不查詢或同步翻譯後台；字串異動依各專案規則另行處理。
- 交接包不是需求權威：先端實作是參考，產品決策回寫該專案的需求／契約文件；待辦只在專案的任務系統。
- 完成 export 或 audit 不等於取得 commit、push、MR、建置或發布權限；交接時記各 repo 版本、證據與未做動作。

## 何時讀哪個檔

| 情境 | 讀 |
|---|---|
| 建立或核對 profile | [references/project-profile.md](references/project-profile.md)、[assets/profile.example.json](assets/profile.example.json) |
| 逐章填 manifest | [references/manifest-chapters.md](references/manifest-chapters.md) |
| 執行或修改腳本 | [references/scripts.md](references/scripts.md) |
| 做實作前定位或實作後對齊 | [references/audit-checklist.md](references/audit-checklist.md) |
| 寫檔 | [templates/handoff-manifest.md](templates/handoff-manifest.md)、[templates/media-index.json](templates/media-index.json)、[templates/audit-report.md](templates/audit-report.md) |
