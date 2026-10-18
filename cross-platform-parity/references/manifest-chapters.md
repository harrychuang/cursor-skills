# manifest 九章：最小欄位、來源與常見錯誤

回 [SKILL.md](../SKILL.md)。本檔定義 `00-manifest.md` 每一章要留下什麼；範本在 [templates/handoff-manifest.md](../templates/handoff-manifest.md)，腳本用法在 [scripts.md](scripts.md)。

## 通用規則

- 來源標記三值：`diff`（直接來自合併 diff 的檔案、字串或素材變更）、`原始碼`（在凍結 SHA 讀先端原始碼取得的值或行為，附檔案與 symbol）、`人工`（產品決策、截圖引用、允許差異宣告）。混合來源時每列各標，不在章首籠統標一個。
- 狀態值：`已填`、`未拍`（矩陣專用）、`待人工`（需要指名的人決定）、`未查`（外部系統未查詢，例如翻譯後台）、`腳本未執行`（python3 不可用時）。
- 定位用檔案＋symbol；行號可附，但不能是唯一定位。曾有案例在合併隔天把兩千多行搬到新目錄，引用行號的核對當天失效。
- 記程式值，不記註解值；兩者不一致時把差異寫進備註。
- 敘述型來源（交接文件、對話、會議）只能標 `人工`，即使它們看起來很具體。
- 一張圖只能代表它拍到的那個 build 與狀態。

## 1 版本凍結點（來源：diff／原始碼）

| 欄位 | 內容 |
|---|---|
| 先端 branch | 功能分支名 |
| merge SHA／first parent | 合併提交與第一父提交；export 的 diff 就是這兩者之間 |
| build | 先端專案檔的版本號（iOS：`project.pbxproj` 的 MARKETING_VERSION／CURRENT_PROJECT_VERSION；Android：versionName／versionCode），或實際錄影的 build；標清楚是哪一種 |
| 整合分支已含 | 是／否，附核對時的整合分支 HEAD |
| 後續修正 | 合併後整合分支上觸及同區檔案的提交：SHA、日期、摘要、檔案數；影響到哪些章要註明 |

錯誤示範：用 feature branch HEAD 當凍結點；把「已送審」當成整合分支已含。

## 2 變更清單（來源：diff）

由 `classify_diff.py` 產生，每檔列 status、class（畫面／元件／資料／設定／素材／字串／事件／測試／其他）與命中的規則；`其他` 類與 `debug` 標記的檔案要人工核對後才定稿。優化型任務（不是新功能）另寫一段「與上版差在哪」：哪些畫面、哪些值、哪些行為改了。

## 3 畫面 × 狀態矩陣（來源：人工，引用媒體）

每個觸及的畫面一列，五欄：loading、空、錯誤、成功、邊界。每格是 `media-index.json` 裡的檔名，或 `未拍`。邊界指該畫面特有的極端狀態，例如區間塌縮、多筆歷史、長文換行、逾時。備註列出「未拍但 Android 應驗」的狀態，讓次端在開工前提出補拍或宣告不驗。

錯誤示範：用「首題未選」的圖代表 loading；用另一個 build 的影片代表本版。

## 4 視覺數值（來源：原始碼／腳本）

新增或修改的元件每個一段。每段列：尺寸、圓角、內距、色票（token 名與 hex）、字級與字重、陰影（color、opacity、radius、x、y）、動畫（時長、曲線、repeat）。每個值附檔案與 symbol。素材每張列 SHA-256、bytes、像素尺寸、密度，並註明次端同名資源是否同一張（`hash_assets.py`，依 profile 的 `android.resDir`）；不同就寫「需匯入新名」與建議名。字體只記 family 與 weight 對應，不要求次端換全域字型。

錯誤示範：只貼截圖；記註解裡的 blur 8 而不是程式的 radius 4。

## 5 字串清單（來源：腳本／原始碼；後台狀態人工）

由 `list_string_keys.py` 與 `cross_check_string_mapping.py` 產生。每個 key 一列：共用 id、先端 accessor（profile 的 `ios.stringAccessorPattern`）、先端各語系（`ios.locales`）是否存在、是否在先端 mapping、次端 mapping 與各語系（`android.localeDirs`；覆寫資料夾另列）是否存在、後台狀態（可查才填，否則 `未查`）。另列「仍硬編候選」：觸及原始碼裡含中文的字面字串，附檔案與行，由人確認是否該轉正式 key。

錯誤示範：因為文字相同就借用別的 key；把 mapping 裡的 `scope` 當後台平台標籤。

## 6 行為契約（來源：原始碼／人工）

操作→結果表。欄位：操作、前提、先端現況（檔案＋symbol）、應有行為（決策 ID 或待決）、次端是否允許差異。至少涵蓋：進入、主要操作、成功、失敗／重試、取消／離開、逾時、重進／恢復、完成後的資料刷新。先端現況只描述程式做了什麼；應有行為未確認就寫 `待決 <ID>` 與決定者，不把現況抄成需求。

錯誤示範：把先端的例外（例如某入口沒過付費 gate）當成規格；把敘述文件的「保留 session」當成已驗證行為。

## 7 API、RemoteConfig、事件（來源：原始碼／腳本）

- API：端點（method、path）、request／response DTO 欄位與 nullable、狀態碼與錯誤形狀；附先端型別與檔案。
- RemoteConfig：key、先端預設值、有效範圍或解析規則；由 `find_config_event_keys.py` 列 key 與預設，範圍人工核對。
- 事件：事件名、參數 key、記錄時機（哪個 symbol 在什麼條件下呼叫）、數值定義（例如 answered_count 是否含已選未送）。名稱相同不代表口徑相同，時機與定義要寫出來。

## 8 共用元件影響（來源：diff／原始碼）

先端動到的共用元件每個一列：元件、改了什麼、舊 caller 是否保留原樣（列 caller）。次端據此決定是擴充共用元件還是只在新 caller 指定樣式。

## 9 允許的平台差異（來源：人工）

預先宣告：返回手勢、鍵盤、系統對話框、狀態列、字體 family、動畫實作方式等。每列：共同意圖、先端作法、次端作法、差異理由、確認來源。沒有差異也要有核對依據。未在此宣告的差異在 audit 一律先判 `差異`。
