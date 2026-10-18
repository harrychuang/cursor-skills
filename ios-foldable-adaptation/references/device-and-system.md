# iPhone Duo 裝置、姿態與系統行為（iOS 27.1 實測）

這份是做任何版面決定前要先知道的「事實」。數值來自 Xcode 27.1 的 iPhone Duo 模擬器與 iOS 27.1 UIKit 標頭檔（`UIVerticalBarEdge.h`、`UIViewController.h`、`UIBarButtonItem.h`、`UINavigationItem.h`），以及 2026-10 在莎拉、不魯、老簡、當沖飆股神手四個 App 上的實測。實機數值以實機為準；合併前要在實機看一次。

## 1. 姿態與尺寸

| 姿態 | 代號 | 尺寸（pt @3x） | size class（寬） | 系統直欄 |
|---|---|---|---|---|
| 外螢幕直向（摺疊） | OP／`folded` | 466 × 678 | compact | 有，trailing（右側） |
| 外螢幕橫向 | OL／OLR | 678 × 466 | compact | 有；系統隱藏狀態列 |
| 內螢幕橫向（展開預設） | IL／`unfolded` | 951 × 669 | regular | 有，trailing |
| 內螢幕直向 | IP／`unfolded-portrait` | 669 × 951 | regular | 無（維持水平列） |
| 半開（書本式） | — | 內螢幕被摺痕分成兩區 | regular | 有 | 

- 「有直欄」的判斷：`traitCollection.verticalBarEdge != .unspecified`（iOS 27.1+，`#if compiler(>=6.4)`）。外螢幕與內螢幕橫向為 `.trailing`；內螢幕直向與一般 iPhone 為 `.unspecified`。
- 「橫向」一律看容器 `width > height`，不看裝置方向、不看機型，內外螢幕一視同仁。
- 「大螢幕」（要不要套 Duo 規則）：螢幕短邊 > 440 pt（目前最寬的一般 iPhone Pro Max 直向寬 440）。用所在 scene 的 `UIWindowScene.screen`，不用 `UIScreen.main`，不判斷 idiom。
- 內螢幕展開時預設是 `landscapeLeft`（rot90）。Info.plist 若只宣告直向，內螢幕會把整個 App 等比縮放，所以 plist 要宣告直向＋左右橫向，再在執行期用 `supportedInterfaceOrientationsFor` 限制。
- 展開後 Split View 多工時每個 App 的直欄在自己的外側邊；RTL 語言直欄位置不變（跟硬體）。

## 2. 系統直欄（vertical bar）的實測行為

這些是 UIKit 的行為，App 改不了，只能順著做：

1. **直欄寬 84 pt**，以右側 safe area inset 呈現。時間／Wi‑Fi 固定在直欄最上方（外前鏡頭下方，y ≈ 85），App 無法往上移。
2. **直欄沒有自己的底色**：它顯示的是底下那一頁的底色。白底頁（網頁內頁）會讓整條直欄變白、時間變黑字、玻璃膠囊變淡。解法：在導覽控制器的 view 上、直欄的位置鋪一塊底色 view（層級在轉場容器之上、UINavigationBar 與 UIToolbar 之下），系統會跟著把時間改回白字。
3. **導覽列寬度由系統決定、無法縮短**。要讓 header 背景停在直欄左邊，用 `backgroundImage` 做一張右側透明的可拉伸圖（外螢幕停在 x = 382、內螢幕橫向停在 x = 867）。
4. **按鈕進直欄的條件**：只有系統導覽列／工具列的 `UIBarButtonItem` 會進直欄；自己畫在 view 上的按鈕不會。`axisBehavior = .verticalPreferred` 讓項目在有直欄時進直欄、沒有時留在水平列。**已經顯示的項目改軸向不會動**，要「先清空再指定」（`rightBarButtonItems = nil` 再指回）。
5. **直欄的排列順序**：左側項目（`leftBarButtonItems`）排在直欄最上方（時間下方），右側項目緊接其後；彈性空白無法把項目往下推。直欄**底部**放的是導覽控制器工具列的項目（`toolbarItems` + `setToolbarHidden(false)`，同樣要 `.verticalPreferred`），**只有沒有 Tab 列的頁面**才排得到底部；有 Tab 列時底部被 Tab 圖示占用，工具列項目排在左側項目下方。沒有直欄時工具列會變成畫面底部的水平列，必須把項目搬回導覽列並收起工具列。
6. **直欄一次只顯示一條導覽列的項目**（畫面階層裡最深的那個 `UINavigationController`）。頁面裡只要嵌了巢狀導覽控制器，外層的直欄按鈕整組消失，即使巢狀那條沒有任何 `.verticalPreferred` 項目。巢狀導覽控制器還會再讓出一次 84 pt。所以「清單＋內容」兩欄的右側不能用巢狀導覽控制器，要直接嵌內頁、自繪標題列。
7. **customView 的限制**：寬度超過 84 pt 的 customView（例如 100 pt 的膠囊）或 UILabel 類 customView 進直欄會變成一塊白色；`UIButton`（圖示）正常。customView 項目被收進「…」溢位選單時沒有名稱可顯示，要設 `menuRepresentation`（title + 圖示）。純文字按鈕留在水平列。
8. **換螢幕會卸下按鈕**：外螢幕 ⇄ 內螢幕橫向切換、或直向轉回橫向時，系統重建直欄，約一半機率把項目的 customView 卸下（`window == nil`）。重新指定同一組項目物件無效；要用新的 `UIBarButtonItem(customView:)` 包同一個 view 再指定。實務：姿態改變後 0.5 秒檢查一次，最多 3 次。不要對新項目設 `accessibilityLabel`（會轉寫到 customView，nil 會清掉按鈕自己的標題）。
9. **相鄰項目併成同一顆玻璃膠囊**（Liquid Glass）。要讓某顆獨立：`sharesBackground = false`（iOS 26+，customView 項目也有效），設定後同樣要先清空再指定。自訂 customView 自帶底色時用 `hidesSharedBackground = true` 避免雙層背景。
10. **停用直欄**：`UIViewController.preferredVerticalBarBehavior` 回傳 `.disabled` 可讓該頁不用直欄（狀態列轉回水平、安全區內距移除）；系統容器會往上轉交，自訂容器要覆寫 `childForPreferredVerticalBarBehavior`。外螢幕停用後水平狀態列與導覽列同排，標題會被擠掉。Apple 建議當成穩定選擇、不要隨導覽頻繁切換；莎拉與不魯都試過停用又改回。
11. **直欄的側邊由硬體決定**：往某一側轉時直欄在左。只允許 `.landscapeLeft` 可讓直欄固定在右側（取捨：往另一側轉畫面不會橫向，跟只支援直向的 App 倒拿時相同）。
12. **Tab 列**：iOS 27 在 Duo 上把 `UITabBar` 畫成側邊直立列、只剩圖示沒有文字，accessibility 階層裡沒有 TabBar 型別（tab 按鈕的 label 就是 tab 標題）。Liquid Glass 生效時 Tab 列不要設不透明（否則頁面會空白，UIKit 會扣掉整頁高度）；用 standard／inline／compactInline 三種 item appearance 一致設定；自繪的底部 Tab 列在 Duo 上要換成系統 `UITabBarController` 才會進直欄。
13. **系統返回鍵**與外部套件建立的返回鍵無法辨識、無法搬進直欄，分組由系統決定。`backButtonDisplayMode = .minimal` 只顯示箭頭；舊寫法把標題設成空白字元在 Liquid Glass 會把空白寬度算進玻璃底、返回鍵變成橢圓。

## 3. 圓角、安全區與量測值

- 內外螢幕圓角半徑都是 59 pt（私有 `UIScreen._displayCornerRadius`，沒有公開 API）。內螢幕橫向視窗上方安全區是 0，貼著 x = 0 的內容在 y < 約 60 都會被左上圓角切到。
- 系統的避開圓角內距 `view.edgeInsets(for: .safeArea(cornerAdaptation: .vertical))`（iOS 26）在整個視窗／左側整欄只給 16 pt（外螢幕 17.3），不足以讓貼邊的細條避開。實務：左側內容從導覽列下緣開始。
- 內螢幕橫向：導覽列在 y = 24、高 58，下緣 y = 82；要自繪一條和導覽列等高的標題列不能用 `safeAreaInsets.top` 推算，要量真正的導覽列下緣。
- 底部安全區 34 pt；圓角範圍是距底 59 pt 以內。
- 外螢幕橫向內容區只剩約 474 pt 寬。
- 模擬器截圖預設是未套用螢幕外形的矩形；`xcrun simctl io <udid> screenshot --display=<id> --mask=black` 會把圓角以外與相機孔塗黑（run_qc.py `--masked-shots`）。

## 4. 保留區（reserved regions）

- 外前鏡頭：永遠存在，Live Activities 時擴成動態島；直欄時系統自動避開。
- 內前鏡頭：只在相機啟用時出現，UI 會讓開。
- 摺痕區：半開時把內螢幕分成多區；alert、context menu、sheet 與標準 split view 會自動避開，自訂元件用 `UIView.ReservedRegion` API。這部分目前沒有自動化測試涵蓋（半開姿態未走訪）。

## 5. 模擬器與工具的坑（做 QC 會遇到）

- `simctl`、正式版 `devicectl` 都沒有摺疊指令；Simulator.app 被 `DeviceHub.app` 取代，摺疊只在它的畫面 UI 上。可行做法：`scripts/duo_hinge.c`（`xcrun simctl spawn <udid> duo_hinge set 0|180`、`orient portrait|landscape-left|...`）送 Device Hub 同款的 vendor HID 事件（usage page 0xFF61／usage 0x5B）。這是私有介面，Xcode 改版可能失效。
- 面板：外螢幕 `LCD` displayId 1、內螢幕 `LCD-1` displayId 3；用 `xcrun devicectl device info displays -d <udid> --json-output -` 輪詢 `active`，切換後約 4～5 秒生效。內螢幕方向值 `portrait`→rot90（寬版）、`landscape-left`→rot0（直向）。
- 截圖要指定亮著的面板（沒亮的面板是全黑圖）。
- 連續摺疊多次後外螢幕會卡黑或停在舊畫格、點擊無效：每次 QC 都先 `--reboot`。反覆強制關機會弄壞 PosterBoard 資料庫（每 1～3 分鐘當機、膨脹到 7.5 GB）：關機後移走 `~/Library/Developer/CoreSimulator/Devices/<UDID>/data/Library/Application Support/PRBPosterExtensionDataStore` 再開機（`--reset-posterboard`）。
- XCUITest 在展開狀態的點擊會落到外螢幕：導航一律在摺疊時做，展開後只觀察；要在展開時點選的流程改寫成 app 行程內的整合測試（`assets/DuoIntegrationTestCase.swift`）。
- `TEST_RUNNER_*` 環境變數在 Xcode 27.1 的 UI runner 無效，`run_qc.py` 改把變數注入 xctestrun。
- 永遠在動畫的頁面（跑馬燈）會讓 XCUITest 每次 tap 等 60 秒 idle：harness 以 swizzle 關掉 `waitForQuiescence`。
- `xcodebuild test-without-building` 跑完偶爾不結束：`run_qc.py` 看到 `Test Suite ... passed/failed` 後等 `--exit-grace` 秒就結束它。
- 模擬器剛重開機後第一次啟動 app 可能停在載入頁數分鐘：harness 等 `readyElement` 逾時就重啟，最多 3 次；截圖一定要人看過，沒有檢查的走訪會把載入頁當成功。
- 文章內頁（WKWebView）從外螢幕展開時偶發當機，堆疊全在系統框架（`WKDisplayLinkHandler windowScreenDidChange`），App 無法修；實機若在網頁類頁面開合閃退要回報。
- 推入 AVKit 播放頁且同時收 Tab 列、無動畫時主執行緒卡死（iOS 27.1 模擬器每次都發生）：搬移播放中的內頁前先把播放畫面取下，搬完再放回。
- 畫面在旋轉過程中被移除時不會收到 `viewDidDisappear`。
- 模擬器 app 可以直接寫主機路徑的檔案，適合暫時記錄 UIKit 內部狀態（accessibility 傾印看不到被卸下的 view）。
- 看套件 Logger：`xcrun simctl spawn <udid> log stream --level debug --predicate 'eventMessage CONTAINS "..."'`。app 卡死時 `sample <pid>` 看主執行緒；判斷卡死用 CPU 占用，不要用 log 檔的修改時間。

相關：`references/hig-summary.md`（Apple 的原則）、`references/layout-rules.md`（我們據此訂出的規則）。
