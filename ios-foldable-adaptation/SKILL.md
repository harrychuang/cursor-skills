---
name: ios-foldable-adaptation
description: "Adapt any iOS app to Apple's foldable iPhone Duo (outer 466×678 pt compact screen, inner 951×669 pt regular screen with the system vertical bar) and verify it with automated fold/unfold screenshot QC. Covers the whole loop: inventory and removal of screen-size-dependent layout (UIScreen.main, cached screenWidth, orientation checks), a 10-question display-style questionnaire the designer answers, a layout rulebook (back button top of column, actions bottom, underline tabs to a left column in landscape, list+detail split on the inner screen, dark column, standalone buttons, corner-radius avoidance), implementation on either the CMoney Lego production-line framework (opt-in switches) or plain UIKit/SwiftUI (axisBehavior, toolbarItems, sharesBackground, UISplitViewController), a simulator harness that folds/unfolds via HID events and walks screens from a JSON plan, rule-based analysis, and a before/after HTML report for design review. Use whenever someone mentions iPhone Duo, 摺疊, 直欄, vertical bar, 開合, 內螢幕/外螢幕, foldable layout, Device Hub hinge, or wants a product app checked or optimized for the Duo — even if they only ask for screenshots, a QC report, or a plan. Not for general iPad multitasking or non-foldable responsive layout work."
---

# iPhone Duo 適配｜盤點 → 問卷 → 版面規則 → 實作 → 自動化 QC → 前後對照報告

把一個 iOS App 適配到 iPhone Duo（Apple 的摺疊機）並用自動化截圖驗證。原型是莎拉王的型態學教室（Lego 生產線 App，2026-10-08～10-14 六輪設計審閱）；不魯、老簡、當沖飆股神手（純 UIKit）也在同期各自做了一輪，做法不同，所以這個 skill 不預設哪種版面是對的——它保證每個決定都被問到、記下來、做出來、拍到截圖給設計師看。

skill 只做 iOS。Lego App 與非 Lego App 都能用：規則與 QC 工具相同，差別只在「實作軌道」。本 skill 不增加任何修改或外部操作權限；修改程式碼前要有使用者授權，改共用框架（影響 30+ App）要另開 MR。

## 先確認（開工前 5 分鐘）

1. **目標 App 與軌道**：App 目錄在哪（monorepo 給相對路徑）；有沒有 `import CMProductionLego`（有 → Lego 軌道 `references/track-lego.md`；沒有 → `references/track-uikit.md`）。
2. **環境**：Xcode 27.1 + iOS 27.1 iPhone Duo 模擬器（已 Booted）；Python 3 + numpy。沒有就只能做階段 0～2，QC 要等環境。
3. **誰決定版面**：設計師的名字。問卷（階段 1）與每輪的 Before／After 都是給這個人看的。
4. **這次要做到哪**：只盤點？盤點＋修？整套含 QC？只重跑 QC？依此挑階段，不要全做。
5. **已有的東西**：之前的 QC 報告、決策紀錄（`docs/duo/decisions.md`）、走訪計畫、`.gitignore` 對 QC 工具的處理。有就接著做，不要重建。

回報時說清楚：讀了哪些來源、軌道、要做的階段、輸出放哪、這次做不到的事（例如沒有模擬器）。

## 階段 0：盤點並移除「以螢幕為準」的寫法

第一輪 QC 最嚴重的問題不是直欄，而是開合後畫面根本沒重排（內容整個不存在、元件尺寸等於另一塊面板）。先清掉這個。

```bash
python3 <skill>/scripts/inventory_screen_deps.py <repo> --path-prefix <App 相對路徑> --out docs/duo/inventory.md
```

- 規則 r1～r5、優先度 P1／P2 與修法見 `references/inventory.md`。輸出是候選清單，每筆要人看過再決定修或列例外。
- 完成標準：P1、P2 歸零或全部列例外（寫原因）。
- 以 iOS 27 SDK 建置的 App 要先有 UIScene；方向宣告要有左右橫向（內螢幕不遵守宣告，只宣告直向會整個縮放）。

## 階段 1：問卷與規則（設計師拍板）

1. 讀 `references/device-and-system.md`（系統行為與限制）和 `references/hig-summary.md`（Apple 的原則）——不知道系統做不到什麼，就會提出做不到的設計。
2. 用 `references/questionnaire.md` 的 10 題問設計師，答案寫進 `templates/duo-decisions.md` → `docs/duo/decisions.md`。每題都有「照系統」的預設；沒決定的題目用預設實作，不要猜。
3. 把答案對到 `references/layout-rules.md` 的規則編號（L1～L33），列出這個 App 要套用的規則與頁面清單（哪些頁有底線頁籤、哪些頁是清單型、哪些頁有自繪標題列、哪些頁有 Tab 列）。這份盤點給設計師確認。
4. 若沒有舊截圖，先跑一次 QC 留「修改前」（階段 3 的情境 A／B），再動手。

## 階段 2：實作

- **Lego App**：`references/track-lego.md`——方向三件事、`LegoVerticalBar`／`LegoSegmentSideMenu`／`LegoMoreSplitLayout`／`LegoListDetailSplitViewController`／`LegoVideoDetailSystemBar` 的開關對照問卷題號；App 自己要寫的部分（自訂策略列的側欄、播放器共用）。
- **非 Lego App**：`references/track-uikit.md`——每條規則的 UIKit API（`axisBehavior`、`toolbarItems`、`sharesBackground`、`visibilityPriority`、`UISplitViewController` 或自訂兩欄容器、系統 Tab 容器）與三個 App 踩過的坑。
- 通用原則：所有改動放在預設關閉、只在大螢幕（短邊 > 440）建頁時啟用的開關後面；內容只建一份、切版面只換約束；開合不改任何選取狀態；每個直欄項目有標題＋符號；不確定系統允不允許時先在實驗 app 量，不要在產品上試。
- 變更要有文件（Spectra 的 proposal／design／tasks 或等價）、單元測試（放置規則、還原、同步）、必要時整合測試（展開狀態的點選只能在 app 內觸發）。

## 階段 3：自動化 QC

`references/qc-harness.md` 有完整安裝與執行。摘要：

1. 把 `assets/DuoQCHarness.swift`、`assets/DuoQCWalkTests.swift` 加進 UI 測試 target（整合測試另加 `assets/DuoIntegrationTestCase.swift` 到單元測試 target）；沒設 `DUOQC_DIR` 時全部 skip。
2. 依 `assets/walk-plan.example.json` 寫這個 App 的走訪計畫（分頁名稱、彈窗、浮動視窗、要走訪的頁、姿態序列）。
3. 跑：
   ```bash
   python3 <skill>/scripts/run_qc.py --project-dir <App> --scheme <含 UITests 的 scheme> --target <UITests target> \
     --tests DuoQCWalkTests/testWalkPlan --plan walk-plan.json --env DUOQC_SCENARIOS=A --out /tmp/duoqc/A --reboot --masked-shots
   python3 <skill>/scripts/analyze.py /tmp/duoqc/A
   python3 <skill>/scripts/report.py /tmp/duoqc/A --out report.html --context context.json --commentary commentary.json --full-dir publish
   ```
4. 情境：A（摺疊冷啟動、四姿態）抓版面；B（展開冷啟動再摺回）抓啟動時快取的尺寸；L（內螢幕橫向全頁）看側欄與直欄；sequence 情境看單一頁在姿態之間的按鈕與還原。
5. 規則判定是候選：每張截圖都要人看（載入頁、黑畫面、被卸下的按鈕空圓底、圓角切到）。人工發現寫進 `commentary.json`。

## 階段 4：報告與設計審閱

`references/report-and-handoff.md`。每一輪交：QC 報告（規則＋人工、每頁各姿態截圖）、版面調整 Before／After（最新一輪在前；「修改後」一律是目前版本，共用元件改過就全部重拍）、驗證表、已知限制、待決清單（每條附截圖與選項）。設計師回覆後更新 `docs/duo/decisions.md`，進下一輪。要給人看的說明文件（Apple 風格、每個決策一組前後對照）可拿莎拉的 `scripts/duo-qc/design-doc/` 當範本。

## 什麼時候停下來問

- 問卷任何一題沒有答案、或實作中發現答案互相衝突。
- 規則做不到（系統限制：有 Tab 列的頁面按鈕排不到底部、寬膠囊進直欄變白、巢狀導覽控制器吃掉直欄按鈕、只能開一個橫向）——列出代價與替代方案再問。
- 會連一般 iPhone 一起改變的事。
- 外部套件（PAGEs、CMLegoCoreKit、社群套件）才能改的事：列給套件維護者，不在 App 硬改。
- 要改共用框架（Lego）：先說明影響範圍，另開 MR。

## 邊界

- 不做 Android、不做 iPad 多工、不做一般的 RWD。
- 不替設計師決定版面；「照系統」是唯一的預設。
- QC 工具靠 Xcode 私有的 Device Hub HID 介面摺疊模擬器，Xcode 改版可能失效；半開（摺痕）姿態與內前鏡頭保留區沒有自動化。
- 自動化測試在展開狀態點不到畫面，整合測試在 app 內觸發點選，沒驗到實際觸控：合併前實機點一輪。

## 檔案索引

| 檔案 | 什麼時候讀 |
|---|---|
| `references/device-and-system.md` | 任何設計決定前；遇到「系統為什麼不讓我這樣做」 |
| `references/hig-summary.md` | 寫 HIG 對照表、跟設計師討論原則 |
| `references/questionnaire.md` | 階段 1 |
| `references/layout-rules.md` | 階段 1 對規則、階段 2 實作時查數值 |
| `references/inventory.md` | 階段 0 |
| `references/track-lego.md`／`references/track-uikit.md` | 階段 2，依軌道二選一 |
| `references/qc-harness.md` | 階段 3 安裝與執行、故障排除 |
| `references/report-and-handoff.md` | 階段 4 |
| `scripts/inventory_screen_deps.py` | 階段 0 掃描 |
| `scripts/run_qc.py`、`analyze.py`、`report.py`、`duo_hinge.c`、`imgtool.swift` | 階段 3 |
| `assets/DuoQCHarness.swift`、`DuoQCWalkTests.swift`、`DuoIntegrationTestCase.swift`、`walk-plan.example.json`、`device-profile.json`、`report-context.example.json` | 階段 3 安裝 |
| `templates/duo-decisions.md`、`templates/before-after.md` | 階段 1、4 |
| `README.md` | 一頁導覽（給設計師） |
| `guide.html` | 圖解說明文件（Apple 風格、單一檔案，瀏覽器直接開）；介紹這個 skill 給團隊時用 |
