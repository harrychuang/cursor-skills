# 非 Lego App 的實作軌道（純 UIKit）

老簡（`OriginalAuthors/30_LaoChien`）、不魯（`OriginalAuthors/9_BoringChan`）、當沖飆股神手（`OriginalAuthors/116_MrWarrantPocketStocksReboot`）都是沒有 Lego 共用層的 App，2026-10 各自用 UIKit API 做完 Duo 適配。這份把 `references/layout-rules.md` 的每條規則對到 UIKit 做法，並附他們踩過的坑。SwiftUI App 把對應的 `ToolbarItem`／`NavigationSplitView`／`toolbarVisibilityPriority` 套用即可，原則相同。

所有與 iOS 27.1 直欄有關的符號只在 Xcode 27 SDK 存在：一律包在 `#if compiler(>=6.4)` + `if #available(iOS 27.1, *)` 裡，CI 用舊 Xcode 也能建置。`sharesBackground`／`hidesSharedBackground` 是 iOS 26：`#if compiler(>=6.2)` + `#available(iOS 26.0, *)`。

## 0. 前提：UIScene 與方向

| 項目 | 做法 |
|---|---|
| UIScene | 以 iOS 27 SDK 建置但未採用 UIScene 的 App 會在 iOS 27 啟動時被擋下：加 `SceneDelegate`、Info.plist 加 scene manifest；外部開啟 URL／Universal Link 改由 scene 接收；彈窗、附屬 window 掛在目前的 window scene |
| 方向宣告 | Info.plist `UISupportedInterfaceOrientations` 宣告直向＋左右橫向 |
| 執行期方向 | `application(_:supportedInterfaceOrientationsFor:)` 依 `window?.windowScene?.screen` 短邊 > 440 回 `[.portrait, .landscapeLeft]`，否則 `.portrait`；scene 的 `windowScene(_:didUpdate:...)` 在螢幕物件改變時呼叫 `setNeedsUpdateOfSupportedInterfaceOrientations()` |
| 強制轉向的頁面 | 畫線、全螢幕影片這類頁面另列：外螢幕（短邊 ≤ 466）只直向；`UIDevice.setValue(orientation)` 類寫法改成 `requestGeometryUpdate` |
| 大螢幕判斷 | 一個 helper：`isLargeScreen(screen) = min(w, h) > 440`、`isCurrentSceneLargeScreen()` 取 foregroundActive 的 `UIWindowScene.screen`；不判斷 idiom、不用 `UIScreen.main` |
| 有直欄判斷 | 把 `traitCollection.verticalBarEdge` 包成與 SDK 脫鉤的訊號（當沖 `VerticalBarSignal.unavailable/unspecified/leading/trailing`），舊 Xcode 也能編譯與測試 |

## 1. Header 與右側直欄（L1～L15）

| 規則 | UIKit 做法 | 坑 |
|---|---|---|
| L14 標題＋符號 | 按鈕一律改成標準 `UIBarButtonItem(title:image:primaryAction:)`，`accessibilityLabel = title`；customView 項目設 `menuRepresentation = UIMenu(children: [UIAction(title:…)])`，被收進「…」選單才有名稱 | 只有 icon 或 customView 的按鈕在溢位選單裡是空白；Liquid Glass 時 icon 用 `.alwaysTemplate` 讓系統依玻璃底挑對比色，舊外觀維持原色 |
| L3 進直欄 | `item.axisBehavior = .verticalPreferred`（有直欄進直欄、沒有時留水平列） | 已顯示的項目改軸向不會動：`navigationItem.rightBarButtonItems = nil` 再指回。不魯實測直接改會跑到畫面底部的水平 bar |
| Q2(a) 展開留上方、合起進直欄 | `axisBehavior = traitCollection.horizontalSizeClass == .regular ? .horizontalOnly : .automatic`，並 `registerForTraitChanges([UITraitHorizontalSizeClass.self])` 在變化時重設（先清空再指定） | `.horizontalOnly` 在沒有水平 bar 的頁面會讓按鈕消失 |
| V4 溢位順序 | `item.visibilityPriority = .low/.standard/.high`（iOS 27） | — |
| L4 動作鈕在底部 | 把右側項目搬到 `toolbarItems`（反序）＋ `setToolbarHidden(false)`，每顆 `.verticalPreferred`；只有沒有 `tabBarController` 或 `hidesBottomBarWhenPushed` 的頁面才會在底部；沒有直欄時搬回 `rightBarButtonItems` 並 `setToolbarHidden(true)` | 判斷「有 Tab 列」要看最外層導覽控制器是否有 tabBarController，且堆疊裡沒有 `hidesBottomBarWhenPushed` 的頁 |
| L6 左上動作鈕進底部 | 同上，放在工具列陣列最前面；沒有直欄時照原順序放回 `leftBarButtonItems`，先放回再設軸向／分組 | — |
| L7／L8 自成一顆 | `item.sharesBackground = false`（iOS 26），先清空再指定 | 自訂 customView 自帶圓角底色時改用 `hidesSharedBackground = true` 避免雙層 |
| L1 header 停在直欄左邊 | `navigationBar.standardAppearance.backgroundImage` 用一張右側透明的可拉伸圖；寬度＝視窗寬 − 直欄寬（`safeAreaInsets.right`） | 導覽列本身的寬度不能改 |
| L12 直欄固定底色 | 在導覽控制器 `view` 加一塊底色 view，frame＝直欄區域（`verticalBarEdge == .trailing` 時 x = width − safeAreaInsets.right），`insertSubview` 在轉場容器之上、`navigationBar`／`toolbar` 之下；`safeAreaInsetsDidChange` 與 `registerForTraitChanges(UITraitCollection.systemTraitsAffectingVerticalBarEdge)` 時更新 | 系統會跟著把時間改回白字、玻璃改深色 |
| L8 換螢幕被卸下 | 姿態改變後 0.5 秒檢查 `item.customView?.window == nil`，是就用新的 `UIBarButtonItem(customView:)` 包同一個 view 重新指定（帶上 axisBehavior／sharesBackground），最多 3 次 | 重新指定同一個物件無效；不要對新項目設 `accessibilityLabel` |
| L13 自繪標題列 | 大螢幕時隱藏自繪列，把它的返回／標題／按鈕用代理 `UIBarButtonItem` 轉送點擊到原本的 button，內容限制在 safe area 內 | 套件改版結構不同時要能退回 |
| 返回鍵 | 系統返回鍵不需要（也不能）處理；要不顯示標題用 `backButtonDisplayMode = .minimal` | 把標題設成空白字元在 Liquid Glass 會把寬度算進玻璃底，返回鍵變橢圓 |
| 視窗底色 | `window.backgroundColor` 補成頁面主底色 | 直欄旁與轉場時露出的預設白底 |

## 2. 頁籤與左側欄（L16～L19）

- 容器 VC：內容 VC 只建一份；`viewWillTransition`／`viewDidLayoutSubviews` 時依 `view.bounds.width > height` 決定「上方頁籤列」或「左側列」，只換約束。
- 左側列：`UITableView` 或 `UIStackView`，寬 120（119＋1 分隔線）、列高 44、字 16、選中指示條 3 pt 貼左緣；欄從螢幕頂端鋪到底時把欄 view 加到導覽控制器 view 最上層並設 `navigationController.additionalSafeAreaInsets.left`，頁籤列從導覽列下緣（內橫向 y = 82）開始到底部安全區為止。
- 選中狀態：側欄與原本的分頁控制器雙向同步（點側欄 → 換頁；滑動換頁 → 更新側欄）；開合期間 pager 因尺寸變化觸發的「換頁」要忽略（只接受使用者手勢）。
- 膠囊分段鈕（多方／空方、月／季／年）不是底線頁籤，不動。

## 3. 清單＋內容兩欄（L20～L25）

兩個選擇：

1. **`UISplitViewController`（iOS 26 的 Duo 已自動配合摺痕）**：清單型頁面本來就是 primary/secondary 時最省事；外螢幕自動收成單欄。注意導覽容器放外面（HIG R3）。
2. **自訂兩欄容器**（莎拉做法，適合原本是單欄推頁的流程）：左 360 pt 清單（自繪標題列，和右側導覽列同一條底線與基線）、右側直接嵌內頁（**不要**巢狀 `UINavigationController`，否則外層直欄按鈕會被吃掉、又多讓出 84 pt）；攔截 `pushViewController`：被 `acceptsDetail` 接受的頁嵌右側並換掉整個右側，其他頁照常推到 Tab 的導覽控制器；收成單欄時把使用者點開的內頁推成整頁、預設內容直接丟掉。右側預設內容不送點選紀錄。

播放器類內頁（共用 AVPlayer）的注意事項見 `references/track-lego.md` §4，與框架無關。

## 4. Tab 列（L26～L29）

- 自繪底部 Tab 列：依直欄訊號決定容器——有直欄用系統 `UITabBarController`（6 個分頁照常、icon 改 template 由系統著色、`standard／inline／compactInline` 三種 appearance 一致），沒有直欄維持自繪；切換容器時用 slot VC 承載目前分頁，不重新載入。參考當沖 `MainTabContainerPolicy`、`MainTabSystemTabBar`。
- Liquid Glass 時不要 `isTranslucent = false`／不透明背景（頁面會空白）；深色 App 在 Tab 容器 `overrideUserInterfaceStyle = .dark`，再把內容頁釘回原本深淺。
- 容器底色與導覽列同色（合起時導覽列不貼頂、底色只延伸 10 pt，否則頂端露白）。
- 浮動按鈕（AI、客服）避讓直欄：用 safe area 右側內距，不要自己再扣一次。

## 5. 各 App 的做法摘要（可直接對照 commit）

| App | 做法 | commit |
|---|---|---|
| 不魯 | 移除螢幕尺寸依賴（r1/r2/r3）；導覽列按鈕改標準 item、展開留上方合起進直欄；恢復系統直欄；返回鍵 `.minimal`；Tab 列 appearance 三種一致；各頁改接 safe area；表格四欄平分 | `399cef879d`、`fc9225a2b0`、`29ab73aa72`、`48315bb800`、`e3d68871da`、`c7e8433b3e` |
| 老簡 | 問卷 Q1 照系統／Q2 客服鈕改標準按鈕／Q3 window 底色／Q4 全部單欄／Q6 略過；UIScene；內容貼左右 safe area、浮動按鈕避開直欄；Tab 玻璃膠囊 | `09b10cc192`、`84078b5251`、`ef7d98f089`、`426ab6fb14`、`f88654d16e` |
| 當沖飆股神手 | UIScene；自繪 Tab → 有直欄時系統 Tab；標準按鈕＋visibilityPriority；底部選單停在直欄左側；`ContainerLayoutMetrics` 以容器寬度取代螢幕寬度 | `d44ffac841` |
| 莎拉（Lego） | 見 `references/track-lego.md` | `b48f198fca` |
