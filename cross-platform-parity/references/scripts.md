# 盤點腳本：用法、輸出與唯讀保證

回 [SKILL.md](../SKILL.md)。五支腳本都是 Python 3 標準函式庫，不需安裝套件；只透過 `git --no-optional-locks` 讀取 repo 歷史或直接讀檔，不連網、不建置、不寫入任何 repo。它們只產生清單，「一致／差異」的判定留給 manifest 與 audit 報告的人工欄位。

## 共同介面

- `python3 scripts/<name>.py --help` 顯示參數。
- `--profile <json>` 指定專案 profile（欄位見 [project-profile.md](project-profile.md)）；未給時載入 `assets/profile.example.json` 並在 stderr 印 `notice: using bundled example profile`。輸出的 `profile` 欄記錄用了哪一份與是否為範例。
- `--workspace <dir>` 是 profile 相對路徑的基準，預設為執行時的工作目錄；CLI 明確給的路徑（`--repo`、`--android`、`--ios-mapping` 等）永遠優先於 profile。
- 預設把 JSON 印到 stdout；加 `--out <dir>` 則寫到 `<dir>/<輸出檔名>` 並在 stderr 印一行摘要。`--out` 不能落在任何一個輸入 repo 或資源目錄內，否則腳本以 exit 2 拒絕；交接目錄的 `inventory/` 是預期位置。
- 指定版本用 `--merge <sha>`（合併提交取 first-parent diff；一般提交取其父提交）或 `--range <base>..<head>`。所有內容都從指定版本用 `git show` 讀取，不受工作樹未提交修改影響；次端 mapping 與資源則讀工作樹。
- exit 0 代表完成；exit 2 代表參數或輸入錯誤，訊息在 stderr。

以下範例假設在同時含先端與次端 repo 的工作區根目錄執行，profile 放在 `docs/handoff/parity-profile.json`。

## classify_diff.py → `classify_diff.json`

```bash
python3 scripts/classify_diff.py --profile docs/handoff/parity-profile.json --merge <sha> --out <handoff>/inventory
```

每個觸及檔案列 `path`、`status`（A／M／D／R）、`additions`、`deletions`、`class`、`rule`（命中的分類規則）、`debug`（路徑含 Debug 就標 true）。分類依序比對：profile 的 `classify.extraRules` → 測試 → 字串 → 事件 → 素材 → 設定 → 元件 → 畫面 → 資料 → 其他；`--platform android` 改用 Kotlin／res 的內建規則（預設依 profile 的 `lead.platform`）。`其他` 與 `debug` 的檔案要人工核對後才寫進 manifest 第 2 章。

## list_string_keys.py → `string_keys.json`

```bash
python3 scripts/list_string_keys.py --profile docs/handoff/parity-profile.json --merge <sha> --out <handoff>/inventory
```

從 diff 觸及且未刪除的先端原始碼找 `ios.stringAccessorPattern` 的 accessor，用凍結版本的產生檔（`ios.generatedStringsFile`、`ios.generatedKeyPattern`）把 accessor 對回資源 key；再合併 diff 中字串資源檔新增或修改的 key。每個 key 列 `accessor`、`usedIn`（檔案與行）、`inIosMapping`／`commonId`、`iosLocales`（`ios.locales` 各語系是否存在）、`diffChanged`。次端 repo 存在時（`follower.repo` 或 `--android`）再列次端 mapping 的 id／module 與 `android.localeDirs`＋`overrideDirs` 各資料夾是否存在（依 mapping 的 module 用 `android.moduleResCandidates` 找 res）；`--no-android` 可略過。`hardcodedCandidates` 是觸及原始碼裡含中文的字面字串（排除註解行），供第 5 章「仍硬編候選」人工確認。

## find_config_event_keys.py → `config_event_keys.json`

```bash
python3 scripts/find_config_event_keys.py --profile docs/handoff/parity-profile.json --merge <sha> --out <handoff>/inventory
```

在觸及的先端原始碼（加上 profile `ios.remoteConfigFiles`）找：`events`（含 `eventName` 的檔案裡符合 `ios.eventNamePattern` 的事件名）、`eventParameterKeys`（字典字面 `"key":`）、`stringEnums`（`enum X: String` 的 case 與 rawValue）、`logCallSites`（符合 `ios.logCallPattern` 的呼叫處，供填「記錄時機」）、`remoteConfig.keys`（`ios.remoteConfigKeyPattern`）與 `remoteConfig.defaults`（宣告或 init 參數的預設值）。時機與數值定義仍要人工讀 symbol 填第 7 章。

## hash_assets.py → `assets.json`

```bash
python3 scripts/hash_assets.py --profile docs/handoff/parity-profile.json --at <sha> --paths <asset dir or file>... --out <handoff>/inventory
```

`--paths` 可以是檔案或目錄（目錄遞迴 png／jpg／jpeg／svg／pdf／mp4／mov／字型）。有 `--at` 時從先端 repo（`--repo` 或 profile `lead.repo`）的該版本讀，否則讀工作樹（用於本機影音包）。每檔列 `bytes`、`sha256`、PNG 的 `width`／`height`、由檔名推得的 `scale`（@2x／@3x）與 `baseName`（imageset 目錄名優先）。次端 res 目錄（`--android-res` 或 profile `follower.repo` + `android.resDir`）存在時，用 `baseName` 在 `drawable*`／`mipmap*` 找同名資源，列每個密度的 hash 與 `sameAsIos`；`--no-android` 可略過。密度對應只是提示，是否可直接沿用由第 4 章人工判定。

## cross_check_string_mapping.py → `string_mapping_crosscheck.json`

```bash
python3 scripts/cross_check_string_mapping.py --profile docs/handoff/parity-profile.json --ids <handoff>/inventory/common_ids.txt --with-values --out <handoff>/inventory
```

`--ids` 是每行一個共用 id 的檔案，或 `-` 讀 stdin（`list_string_keys.py` 輸出的 `commonId` 可直接整理成這份清單）。mapping 檔、先端字串目錄與次端 repo 預設從 profile 解析，也可用 `--ios-mapping`、`--android-mapping`、`--ios-res`、`--android-root`、`--android-res` 覆蓋。每個 id 列兩端 mapping 是否存在、平台 resource id、`scope`／`module`、依 `android.localePairs` 配對的各語系是否含此 id、`overrides`（覆寫資料夾）；`--with-values` 再列各語系的值，並在把 `%@`／`%1$@` 正規成 `%s`／`%1$s` 後標 `valueDiff`。「存在」與「值相同」都是機械比對；mapping 的 `scope`／`module` 不是後台平台標籤，後台狀態仍要人工查。
