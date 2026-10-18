# Lego 生產線 App 的實作軌道

`CMProductionLego`（達人生產線共用框架，`CMProductionLego/CMProductionLego/CMProductionLego/Classes/`）在 2026-10 的 AUTHOR-34207／34406／34255／34256 系列 commit（最終 `b48f198fca`）已把 `references/layout-rules.md` 的大部分規則做成**預設關閉的開關**。Lego App 要做 Duo 適配，主要工作是：盤點（`references/inventory.md`）→ 依問卷答案打開對應開關、提供工廠 → QC。

所有開關的共同規則：
- 框架不判斷「大螢幕」，由 App 用 closure 提供（建議 `AppDelegate.isCurrentSceneLargeScreen()`：所在 scene 的螢幕短邊 > 440）。
- `isEnabledProvider` 在**建頁當下**讀一次；開合時不重建頁面。所以要在 `SceneDelegate` 建主 Tab 之前設定（`didFinishLaunching` 裡）。
- 只在 Xcode 27 SDK（`#if compiler(>=6.4)`）與 iOS 27.1+ 生效；舊系統、一般 iPhone 完全不變。

## 1. App 端必做（與開關無關）

| 項目 | 做法 | 參考 |
|---|---|---|
| 方向宣告 | `project.yml`：`INFOPLIST_KEY_UISupportedInterfaceOrientations[_iPhone]` 宣告直向＋左右橫向（內螢幕不遵守宣告，只宣告直向整個 App 會被縮放） | Sara `project.yml:253-255` |
| 執行期方向 | `application(_:supportedInterfaceOrientationsFor:)`：`isLargeScreen ? [.portrait, .landscapeLeft] : .portrait`（只開 landscapeLeft 讓直欄固定在右側） | Sara `AppDelegate.swift:105-118` |
| 開合後重算方向 | `SceneDelegate.windowScene(_:didUpdate:interfaceOrientation:traitCollection:)`：螢幕物件或大螢幕判定改變時 `window?.rootViewController?.setNeedsUpdateOfSupportedInterfaceOrientations()`（iOS 16+） | Sara `SceneDelegate.swift:69-97` |
| PAGEs 頁面方向 | `PAGEsOrientationController.followsDeviceOrientationProvider = { windowScene in isLargeScreen(windowScene.screen) }`（否則 PAGEs 文章頁在橫向打開會被轉成直向） | Sara `AppDelegate.swift:224-229` |
| Liquid Glass | `window.tintColor = 主題色`；深色 App 在 `LegoLiquidGlassAppearance.isActive` 時 `window.overrideUserInterfaceStyle = .dark`（window 顯示前設） | Sara `SceneDelegate.swift:46-52` |
| 直欄項目的標題 | 自己建的 `UIBarButtonItem(customView:)` 要設 `accessibilityLabel`，並用 `LegoVerticalBar.preferVerticalPlacement(items)`（會順便建 `menuRepresentation`）；或照 Sara 的 `UIBarButtonItem+VerticalBar.swift` 自己包 | `LegoVerticalBar.swift:201-223` |
| 登入頁 | `UnifiedLoginStyle.alignsContentToViewIgnoringSafeArea = true`、`separatedLayout = UnifiedLoginSeparatedLayout(portraitBackgroundImage:landscapeBackgroundImage:logoImage:isEnabled:)`，需三張圖 | Sara `AppDelegate.swift:358-368` |
| Debug 浮動球 | 框架在 didFinishLaunching 建的 `CMLegoAppDelegateManager.debugWindow` 沒有 scene：在 scene 連線時補 `windowScene`，旋轉／開合後拉回可見範圍 | Sara `DebugBallPlacement.swift` |

## 2. 開關總表（對應問卷）

| 題 | 開關 | 型別／預設 | 做什麼 |
|---|---|---|---|
| Q1 | `LegoVerticalBar.isEnabled` | `Bool = false` | 在每個 Tab 的導覽控制器裝上 header adapter：header 背景停在直欄左邊、右上按鈕進直欄、換螢幕被卸下的按鈕重掛（L1、L3、L8）。要在主 Tab 建立前設定 |
| Q6 | `LegoVerticalBar.columnBackgroundColor` | `UIColor? = nil` | 整條直欄鋪固定底色（L12） |
| Q3、Q5 | `LegoVerticalBar.placesAllItemsInColumn` | `Bool = false` | header 只留標題：左上按鈕進直欄上方、右上按鈕在沒有 Tab 列的頁面靠直欄底部（搬進 toolbarItems）（L2、L4、L5、L11） |
| Q3 | `LegoVerticalBar.columnBottomLeadingItemProvider` | `((UIBarButtonItem) -> Bool)? = nil` | 哪些左側按鈕要跟右側按鈕一起放到直欄底部（L6）；例：`{ $0.customView is LegoPriceNotifyButton }` |
| Q4 | `LegoVerticalBar.backItemStandsAloneProvider` | `((UITraitCollection) -> Bool)? = nil` | 返回鍵自成一顆（L7）；只做內螢幕可回 `$0.horizontalSizeClass == .regular`；返回鍵必須是 `LegoNavigationBackButton`（`Router.getBackBtn()` 建的）才認得 |
| Q4 | `LegoVerticalBar.standaloneItemProvider` | `((UIBarButtonItem) -> Bool)? = nil` | 任一按鈕自成一顆（L8）；例：`{ $0.customView is LegoPriceNotifyButton && isLargeScreen }` |
| Q8 | `LegoSegmentSideMenu.isEnabledProvider` | `(() -> Bool)? = nil` | 用 `TitleWithLineSegmentPageViewBuilder` 建的底線頁籤（個股頁、通知頁、大盤頁）與自選股群組頁籤，在橫向空間改成左側直欄（L16）；`LegoSegmentSideMenu.style` 可改尺寸（預設 119+1 寬、列高 44） |
| Q8 | `TitleWithLineSegmentPageViewBuilder.setSideMenuExtendsToScreenTop(true)` | builder 方法 | 該頁側欄從螢幕頂端鋪到底、頁籤從導覽列下緣開始（L18、L19） |
| Q7 | `LegoMoreSplitLayout.isEnabledProvider` | `(() -> Bool)? = nil` | 更多頁在橫向空間變成左清單（360 pt）右內容（L20～L24）；`Router.pushViewController` 自動推到右側 |
| Q7 | `LegoMoreSplitLayout.defaultDetail` | `.placeholder` | `.memberCenter`：右側預設顯示會員中心（L21） |
| Q7 | `LegoListDetailSplitViewController(listViewController:isEnabled:listWidth:listContentScrollView:placeholderText:acceptsDetail:)` | 容器 | 任意清單頁改兩欄（L20、L25）；App 提供 `acceptsDetail`、`openDefaultDetail`、`reusesCurrentDetail`。參考 Sara `SaraAudioChatRoomEntranceRepoFactory.makeAudioReplaySplitVC` |
| Q2 | `LegoVideoDetailSystemBar.isEnabledProvider` | `(() -> Bool)? = nil` | PAGEs 影音內頁改接系統導覽列（L13）；App 自己包的影片容器照 `LegoSystemNavigationBarUsing` + `LegoVideoDetailSystemBarBridge.attach` |
| — | `setSegmentMinimumHeight(_:)`、`setMinimumContentHeightInLandscapeSpace(_:)`、`setMinimumContentHeightScreenShortSideThreshold(_:)` | builder 方法 | 大螢幕頁籤列最低高度（36）、橫向空間最低內容高度（避免 K 線被壓扁） |
| — | `KLineAdaptiveLayout`、`settingLayoutMode = .duoBottomSheet`、`adaptiveHeightsConfiguration` | K 線 | 大盤／個股 K 線依可用尺寸切換高度組、設定頁改底部面板 |
| — | `StrategyStockWithTrialPageVCBuilder.setStrategyPageDidLoadHandler／setStrategySegmentHidden` | builder | 選股頁策略列由 App 的側欄接管（Sara `SaraStockPickingAdaptive/*`） |

## 3. 範例：莎拉的設定（didFinishLaunching，主 Tab 建立前）

```swift
LegoVerticalBar.isEnabled = true                       // Q1 用系統直欄
LegoVerticalBar.columnBackgroundColor = AppStyle.bgColor   // Q6 直欄固定暗底
LegoVerticalBar.placesAllItemsInColumn = true          // Q3/Q5 header 只留標題、上導覽下動作
LegoVerticalBar.backItemStandsAloneProvider = { _ in true }                  // Q4 返回鍵獨立（外螢幕＋內橫向）
LegoVerticalBar.columnBottomLeadingItemProvider = { $0.customView is LegoPriceNotifyButton }   // Q3 到價提醒進底部
LegoVerticalBar.standaloneItemProvider = { $0.customView is LegoPriceNotifyButton && AppDelegate.isCurrentSceneLargeScreen() }
LegoSegmentSideMenu.isEnabledProvider = { AppDelegate.isCurrentSceneLargeScreen() }   // Q8 底線頁籤改左側
LegoMoreSplitLayout.isEnabledProvider = { AppDelegate.isCurrentSceneLargeScreen() }   // Q7 更多頁兩欄
LegoMoreSplitLayout.defaultDetail = .memberCenter
LegoVideoDetailSystemBar.isEnabledProvider = { AppDelegate.isCurrentSceneLargeScreen() }   // Q2 影音內頁接系統導覽列
```

老簡式「全部單欄、照系統」的 Lego App 只需要：`LegoVerticalBar.isEnabled = true`、`columnBackgroundColor`、方向三件事、直欄項目標題。其他開關不開。

## 4. App 自己要寫的部分（框架沒有包）

- 選股頁／大盤頁這類有自訂策略列的頁面：側欄容器（內容只建一份、換約束）、選中狀態與 compact 版面的雙向同步（L30、L31）。參考 Sara `Page/SaraStockPickingAdaptive/`、`Page/SaraTWIndexAdaptive/`。
- PAGEs 影音內頁放進兩欄右側時的播放器共用問題：舊內頁釋放會收掉共用播放器 → 沿用同一頁換影片、等舊頁釋放再開預設；搬移播放中的內頁前先取下播放畫面（否則卡死）；多掛一個空訂閱讓 PAGEs `StateManager` 的狀態不被移除。參考 Sara `AudioReplayDetailVideoRegistrar.swift`、`SaraAudioChatRoomEntranceRepoFactory.swift`。
- 導覽列標題因直欄的不對稱內距偏移 → `UINavigationBar+SaraTitleCenter`。
- 框架測試：`LegoVerticalBar`、側欄、分割畫面的單元測試目前放在 Sara 的測試 target（`SaraStockTests/Lego*Tests.swift`），其中三個斷言的是 Sara 的啟動設定，要照自己的設定改。

## 5. 發版前

- `project.yml` 裡指向 Duo 開發分支的套件（CMLegoCoreKit、CMProductionPAGE、CMCommunityModel、CMCustomGroupModel）改回正式版號。
- 設計師預覽用的暫時旗標（例如 `featuredIndexPresentationMode`）改回預設。
- 跑一次一般 iPhone 模擬器的回歸：所有開關在短邊 ≤ 440 時都不生效。
