# 自動化 QC：摺疊／展開走訪、截圖、規則判定、報告

工具都在 `scripts/` 與 `assets/`，與 App 無關；App 專屬的內容（分頁名稱、彈窗按鈕、要走訪哪些頁）全部寫在一份 JSON 走訪計畫裡。

## 1. 組成

| 檔案 | 跑在哪 | 做什麼 |
|---|---|---|
| `scripts/duo_hinge.c` | 模擬器內（`simctl spawn`） | 送 Device Hub 同款的鉸鏈／方向 HID 事件：`set 0`（摺）、`set 180`（展）、`orient portrait|landscape-left|...`。`run_qc.py` 會自動用 `xcrun -sdk iphonesimulator clang` 編譯 |
| `scripts/run_qc.py` | 主機 | 主協調：重開模擬器 → `build-for-testing` → 把 `DUOQC_DIR`／`DUOQC_PLAN` 注入 xctestrun → `test-without-building` → 回應測試的姿態／截圖請求 → `run.json` |
| `assets/DuoQCHarness.swift` | UI 測試 target | 共用基底：交換協定、姿態矩陣、階層傾印、關彈窗、關浮動視窗、swizzle idle 等待、步驟 DSL |
| `assets/DuoQCWalkTests.swift` | UI 測試 target | 讀走訪計畫執行（`testWalkPlan`）；`DUOQC_SCENARIOS=A,L` 選情境 |
| `assets/DuoIntegrationTestCase.swift` | 單元測試 target（宿主 App） | 在 app 行程內直接觸發點選的整合測試基底（展開狀態 XCUITest 點不到畫面時用） |
| `assets/walk-plan.example.json` | — | 走訪計畫範例（莎拉） |
| `scripts/imgtool.swift` | 主機（`swiftc -O -o imgtool imgtool.swift`） | 截圖讀取、像素差、標註框 |
| `scripts/analyze.py` | 主機 | 解析階層傾印＋截圖套規則 → `analysis/findings.json`、`annotated/*.png` |
| `scripts/report.py` | 主機 | 組 HTML 報告（截圖內嵌、可放大、問題編號彈窗） |
| `assets/device-profile.json` | — | 面板尺寸、狀態列區域、規則門檻（iPhone Duo 預設值；要改門檻時複製修改） |
| `assets/report-context.example.json` | — | 報告文案範例 |

## 2. 安裝到目標 App（一次）

1. 需求：Xcode 27.1、iOS 27.1 iPhone Duo 模擬器已 Booted、Python 3 + numpy、（用 xcodegen 的專案要有 xcodegen）。
2. 把 `assets/DuoQCHarness.swift`、`assets/DuoQCWalkTests.swift` 加進 **UI 測試 target**；`assets/DuoIntegrationTestCase.swift` 加進**單元測試 target**（只有需要在展開狀態點選時才要）。沒設 `DUOQC_DIR` 時它們都 `XCTSkip`，不影響一般 CI。
3. 確認有一個 scheme 的 Test action 含 UI 測試 target。xcodegen 專案若 `project.yml` 有重複的 `schemes:` key（後者覆蓋前者、UITests 被拿掉），建一個使用者 scheme（`xcuserdata`）加回去，或修 project.yml。
4. 複製 `assets/walk-plan.example.json` 到 App 的 `scripts/duo-qc/walk-plan.json`，改成自己的分頁、按鈕、彈窗、要走訪的頁面。
5. 編譯 imgtool：`swiftc -O -o <skill>/scripts/imgtool <skill>/scripts/imgtool.swift`。
6. 決定這些檔案要不要進版控（莎拉選擇不進：`.gitignore` 加 `scripts/duo-qc/` 與 `DuoQC*.swift`）。

## 3. 走訪計畫（walk-plan.json）

```json
{
  "app": {
    "bundleId": null,                             // null = UI 測試 target 設定的 app
    "readyElement": {"button": "選股頁"},          // 啟動後等它出現才算進到主畫面（會重啟最多 launchRetries 次）
    "launchDismiss": [{"label": "我明白了"}],      // 啟動後要關的彈窗
    "alertAllow": ["允許", "Allow", "OK"],         // 系統權限彈窗
    "overlayWindows": {"maxSize": 70, "longPress": 1.2, "fallbackTaps": ["關閉", "確認"]},   // Debug 浮動視窗
    "back": {"buttons": ["返回"], "contains": ["返回", "Back", "關閉"], "homeElement": {"tabBar": true}}
  },
  "timing": {"afterFold": 2.5, "afterUnfold": 2.5, "afterNavigate": 3, "afterLaunch": 4, "findTimeout": 5, "hostTimeout": 75},
  "scenarios": [
    {"id": "A", "mode": "matrix", "launchPosture": "folded",
     "postures": ["folded", "unfolded", "unfolded-portrait", "refolded"],
     "screens": [{"id": "01-首頁", "steps": [{"tab": "首頁"}]},
                 {"id": "05-內頁", "steps": [{"tab": "首頁"}, {"firstCell": true}, {"wait": 3}], "leaveAfter": true}]},
    {"id": "P", "mode": "sequence", "launchPosture": "folded",
     "navigate": [{"tab": "首頁"}, {"firstCell": true}, {"wait": 5}],
     "sequence": [{"id": "1-外螢幕", "posture": "folded"}, {"id": "2-內螢幕橫向", "posture": "unfolded"},
                  {"id": "3-內螢幕直向", "posture": "unfolded-portrait"}, {"id": "4-再轉橫向", "posture": "unfolded"},
                  {"id": "5-摺回", "posture": "folded"}],
     "after": [{"tap": {"button": "返回"}}, {"wait": 3}, {"shot": "6-返回首頁", "posture": "folded"}]}
  ]
}
```

- **matrix**：每個畫面「摺疊導航 → 摺疊截圖 → 展開截圖 →（展開直向）→（摺回）」。情境 A（摺疊冷啟動、四姿態）抓版面；情境 B（展開冷啟動、`postures: ["folded","unfolded"]`）抓啟動時快取螢幕尺寸；情境 L（`["folded","unfolded"]`）看內螢幕橫向的直欄與側欄。
- **sequence**：導航一次，依序切姿態截圖，再跑 `after`。用來看同一頁在「外 → 內橫 → 內直 → 內橫 → 外」之間按鈕與側欄有沒有跟著走、有沒有還原。
- 步驟 DSL：`tab`、`tap`（`button`／`buttonPrefix`／`buttonContains`／`text`／`textPrefix`／`textContains`／`anyPrefix`／`identifier`，可加 `optional`、`timeout`、`scrollSwipe`）、`firstCell`、`cell`、`swipe`、`wait`、`dismiss`、`back`、`posture`、`shot`、`relaunch`、`dismissOverlays`。完整說明在 `DuoQCHarness.swift` 的 `DuoQCStep` 註解。
- 命名：畫面 id 用「序號-頁名」（`01-選股頁`），截圖檔名會是 `<情境>-<id>__<posture>.png`。
- Duo 上 Tab 是 Button（label＝tab 標題），`tab` 步驟用 label 找；清單上方的分類如果也是 cell，不要用 `firstCell`，改用標題文字（`textPrefix`）。

需要特殊流程的情境（在 app 內直接觸發點選、檢查播放器狀態）另外寫 `DuoQCHarness` 或 `DuoIntegrationTestCase` 的子類別，`run_qc.py --target <單元測試 target> --tests <Class>` 執行。

## 4. 執行

```bash
SK=<skill 目錄>; APP=<App 專案目錄>; OUT=/tmp/duoqc
# 走訪（每次都加 --reboot；用 Xcode 同時開發時加 --derived-data 指獨立目錄）
python3 $SK/scripts/run_qc.py --project-dir $APP --scheme MyAppQC --target MyAppUITests \
  --tests DuoQCWalkTests/testWalkPlan --plan $APP/scripts/duo-qc/walk-plan.json \
  --env DUOQC_SCENARIOS=A --out $OUT/A --reboot --masked-shots [--xcodegen --xcodegen-env XCODEGEN_SKIP_TESTFLIGHT_VERSION_SYNC=1]
# 整合測試（在 app 內觸發點選）
python3 $SK/scripts/run_qc.py --project-dir $APP --scheme MyAppQC --target MyAppTests --tests MoreSplitIntegrationTests --out $OUT/S --reboot
# 分析 + 報告
python3 $SK/scripts/analyze.py $OUT/A [--device-profile my-profile.json]
python3 $SK/scripts/report.py $OUT/A --out $OUT/report.html --context context.json --commentary commentary.json --img-width 800 --full-dir $OUT/publish
```

輸出目錄：`shots/`（主機截圖，正式）、`shots-masked/`（套用螢幕外形）、`xchg/`（`dump-*.txt` 階層傾印、`meta-*.json`、`xct-*.png`、`*notes.json`）、`events.jsonl`、`run.json`、`analysis/`、`annotated/`、`build.log`、`xcodebuild.log`、`result.xcresult`。

幾個情境可以把 `shots/`、`xchg/`、`events.jsonl` 合併到同一個目錄再分析（前綴不同不會衝突）。

## 5. 規則（analyze.py）

| 規則 | 嚴重度 | 意思 | 通常的根因 |
|---|---|---|---|
| window-size | critical | app window 與目前面板尺寸不符 | window 用啟動時的螢幕建立 |
| content-missing | critical | 與展開直向相比元件數不到 30% | 容器在橫向／compact height 不加子內容；Tab 列不透明讓 UIKit 扣掉整頁高度 |
| black-screen | critical | 截圖幾乎全黑 | 面板切換後沒重繪；或模擬器外螢幕卡黑（重開） |
| out-of-bounds | high | 不在捲動容器內的元件超出畫面 | 寬度寫死 |
| cached-screen-size | high | 元件尺寸等於另一塊面板的寬／高 | `UIScreen.main.bounds`／screenWidth 快取（r1／r2） |
| tabbar-covers-content | high | 內容被直立 Tab 列蓋住 | 沒接 safe area |
| restore-mismatch | high | 摺回後元件位置／尺寸與摺疊時不同 | 開合時狀態沒還原 |
| tabbar-not-stretched | high | 展開後 Tab 列寬度沒變 | 整個版面是「同一個手機版面」 |
| chrome-overlap | medium | 與狀態列／動態島區域重疊 | header 沒避開直欄 |
| overlap | low | 文字互相重疊 | — |
| blank-margin | low | 展開後左右留白 ≥ 30% | 內容沒利用大螢幕寬度 |
| tabbar-side-rail、cover-landscape | info | 系統行為，供對照 | — |

規則是候選，不是判決：每一筆都要對著截圖看。門檻在 `device-profile.json` 的 `thresholds`。人工看到的問題寫進 `commentary.json`（紫色標記），報告會一起編號。

## 6. 每次 QC 一定要人工看的事

- 每張截圖都看過：沒有檢查的走訪會把載入頁、黑畫面當成功。
- 直欄上方／底部的按鈕都在、沒有空白圓底（被卸下）。
- 摺回後的畫面與摺疊時相同；分頁、篩選、選中列沒有跳掉。
- 套用螢幕外形的截圖（`shots-masked/`）四個角落沒有內容被切到。
- 整合測試的步驟在 app 內觸發，沒有驗到實際點擊區域與按壓回饋：合併前在實機點一輪。

## 7. 常見故障

| 現象 | 處理 |
|---|---|
| 外螢幕黑畫面、點擊無效 | `--reboot`；仍不行就 `--reset-posterboard` |
| 測試一開始就 skip | `DUOQC_DIR` 沒注入：確認 `--target` 名稱與 xctestrun 裡的 `BlueprintName` 相同 |
| 主機 75 秒沒回應 | 看 `run_qc.py` 的 log：通常是 `devicectl` 等面板逾時或 `ensure_rotation` 失敗；`--settle` 調大 |
| xcodebuild 跑完不結束 | `--exit-grace`（預設 15 秒）會自動結束；log 看 `Test Suite ... passed` |
| 點擊沒反應、進不了內頁 | 模擬器忙；步驟加 `wait`，或在計畫裡用「進頁確認」（例如 `{"tap": {"button": "返回"}, "optional": true}` 之前先 `wait`） |
| app 停在載入頁 | harness 會重啟（`launchRetries`）；若是模擬器剛開機的第一次啟動，屬已知現象 |
| 同時用 Xcode 建置 | `--derived-data` 指到獨立目錄，避免 build.db 鎖 |
| 文章內頁展開時當機 | WebKit 在系統框架內的 display link 問題，App 無法修；重跑 |
