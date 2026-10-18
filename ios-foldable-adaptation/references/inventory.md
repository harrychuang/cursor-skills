# 階段 0：盤點並移除「以螢幕為準」的寫法

iPhone Duo 第一輪 QC 最常見、也最嚴重的問題不是直欄，而是**畫面在開合後根本沒有重新排版**：外螢幕與內螢幕寬版下頁面內容整個不存在、元件尺寸等於另一塊面板的寬高、window 沒跟著螢幕變。根源幾乎都是「啟動時把 `UIScreen.main.bounds` 算好快取起來」。這一階段先把這類寫法清掉，之後的版面規則才有意義。

不魯（9/24）、老簡（10/12）、當沖飆股神手（10/14）都先做了這一步才做直欄。

## 1. 跑掃描

```bash
python3 <skill>/scripts/inventory_screen_deps.py <repo> --path-prefix <App 相對路徑> --out docs/duo/inventory.md
# monorepo 以外的專案直接給 App 目錄：
python3 <skill>/scripts/inventory_screen_deps.py ~/work/MyApp --out docs/duo/inventory.md
```

輸出是一份 Markdown：每條規則的筆數、每一筆的 `檔案:行` 與片段、修法提示。它是**候選清單**，每一筆都要人看過再決定「修」或「例外」。預設排除 Pods／Carthage／Example／Library／Tests；Pod 與套件裡的問題要回報給套件維護者，不在 App 這邊改。

## 2. 規則與修法

| 規則 | 優先度 | 抓什麼 | 怎麼修 |
|---|---|---|---|
| r1 | P1 | `UIScreen.main.bounds`／`nativeBounds`、`UIWindow(frame: UIScreen.main.bounds)`、`statusBarFrame`、`keyWindow.safeAreaInsets` 當版面依據 | 改用容器：`view.bounds`、`superview`、`safeAreaLayoutGuide`、`readableContentGuide`；在 `viewDidLayoutSubviews` 或 `viewWillTransition(to:with:)` 重算；真的需要螢幕時用 `view.window?.windowScene?.screen`（開合後 scene 會換到另一塊螢幕）。鍵盤判斷改用所在 scene 的螢幕、位置用 window。 |
| r2 | P1 | 自訂的 `screenWidth`／`screenHeight`／`Device.width`／`ratioWidth` 等常數與別名（`static let` 啟動時算一次） | 定義處改成依目前 scene 的螢幕即時計算，比例值設上限（Pro Max 440／375）；使用處逐一改成容器寬度。共用框架裡的（例如 Lego 的 `LegoDevice.screenWidth`）不能動時，在 App 端用 `min(ratio, 440/375)` 夾住。 |
| r3 | P2 | `UIDevice.current.orientation`、`statusBarOrientation`、`userInterfaceIdiom`、機型判斷（iPhone X、hasNotch）、寫死的機型寬度 | 改用 `traitCollection.horizontalSizeClass`／`verticalSizeClass`、容器 `width > height` 判橫向、`safeAreaInsets` 判瀏海；機型判斷拿掉。 |
| r4 | P2 | `UIScreen.main.scale`／`traitCollection` | `traitCollection.displayScale`。只用來算圖片快取大小的可列例外。 |
| r5 | P2 | 方向鎖定（`shouldAutorotate = false`、只回 `.portrait`） | 見 `references/track-uikit.md` §方向：大螢幕開放直向＋landscapeLeft。 |

修的時候順手處理的常見項目（來自四個 App 的 commit）：

- 多行 `UILabel` 只用「不超過」的寬度約束，先在窄的隱藏容器排過版就不會自己變寬 → 寬度跟著容器。
- 表格欄寬、格狀版面用螢幕寬度算 → 改依實際可用寬度，展開時各欄平分或改四欄。
- 全螢幕附屬 window（彈窗、提示）建立時不用螢幕尺寸；彈窗掛在目前的 window scene。
- 聊天圖片、輪播、廣告橫幅上限改用 scene 可用空間。
- Debug 浮動視窗（除錯球）要跟著 scene 與旋轉；開合後拉回可見範圍。
- 以 iOS 27 SDK 建置但未採用 UIScene 的 App 會在 iOS 27 啟動時被系統擋下 → 先遷移到 `SceneDelegate`（外部開啟 URL／Universal Link 改由 scene 接收）。

## 3. 完成標準

- P1 與 P2 歸零，或每一筆都列了例外與原因（例如「Library/SwiftyDraw Example 2 處，未編進 App」）。
- 把掃描結果與例外清單存在 `docs/duo/inventory.md`，commit 訊息引用規則代號（r1／r2／r3），之後回歸時再跑一次比對。
- 跑一次 QC 的「情境 B」（展開狀態冷啟動再摺回）：它專門抓「啟動當下記下螢幕尺寸」的排版，`analyze.py` 的 `cached-screen-size`、`window-size`、`content-missing` 應該都是 0。

## 4. 共用框架的部分

Lego 生產線 App：共用元件在 10/06 已經移除多處螢幕寬高寫死（commit 1dcf1cea91）並修了 Tab 列不透明造成的頁面空白（236e1aa2bd）；`LegoDevice.screenWidth/screenHeight` 仍是啟動時快取的 static，還有多處使用（走勢圖、K 線設定、TwoSlotView），修它會影響 30+ 客戶 App，要在共用層開 MR。App 端先用 `SaraAdjustedLayout` 那種夾上限的做法。

外部套件（PAGEs、CMLegoCoreKit、社群套件）各自有 Duo 適配分支；`project.yml` 的 pin 要在發版前改回正式版號。
