# Project profile：每個專案要填什麼、怎麼從原始碼確認

回 [SKILL.md](../SKILL.md)。profile 是一份 JSON，放在專案 repo 內（例如 `docs/handoff/parity-profile.json`），用 `--profile` 傳給腳本；路徑相對於 `--workspace`（預設為執行時的工作目錄，通常是同時包含先端與次端 repo 的工作區根目錄）。範例：[assets/profile.example.json](../assets/profile.example.json)（ToastEnglish 的實際值，已在該專案以真實合併提交驗證）。腳本未收到 `--profile` 時會載入範例並在 stderr 提示，輸出的 `profile.bundledExample` 為 true；交接別的專案時一定要給自己的 profile。

## 欄位

| 區段 | 欄位 | 意義 | 怎麼確認 |
|---|---|---|---|
| `project` | `name`、`note` | 標示用；`name` 會出現在每份輸出的 `profile.project` | — |
| `lead` | `platform`（`ios`／`android`）、`repo`、`integrationBranch` | export 的來源 repo 與凍結分支 | `git -C <repo> branch -a` 確認整合分支名稱 |
| `follower` | `platform`、`repo` | audit 與次端 mapping／資源的 repo | — |
| `handoff` | `outputDir`（可用 `{feature}`、`{date}` 佔位）、`mediaRoot`、`decisionSystem` | 交接包位置、媒體本機位置、決策回寫方式的文字說明（給人讀） | 依專案文件慣例；媒體目錄要確認已被該 repo 的 .gitignore 排除或本來就在 repo 外 |
| `ios.stringAccessorPattern` | 一個 regex，group 1 是 accessor 名 | 先端程式如何取字串 | **從原始碼確認，不假設**：`grep -rhoE 'LocalizedString\.[A-Za-z]+|L10n\.[A-Za-z]+|NSLocalizedString\(' <repo> \| cut -d. -f1 \| sort \| uniq -c` 看哪一種最多 |
| `ios.accessorIgnore` | accessor 名黑名單 | 排除 `tr`、`self` 這類非 key 的成員 | — |
| `ios.generatedStringsFile` | SwiftGen 產生檔路徑 | 把 accessor 對回資源 key | `find <repo> -name 'LocalizedString.swift' -o -name 'Strings.swift'`，看哪個含 `static let … = …tr("…"` |
| `ios.generatedKeyPattern` | regex，group 1 是資源 key | 產生檔裡每個 accessor 對應的 key 怎麼寫 | 打開產生檔看一行，例如 `tr("Localizable", "toeic_mock_result_finish", …)` |
| `ios.stringsDir`、`ios.stringsFileName`、`ios.locales` | `<locale>.lproj/<file>` 的位置與語系清單 | 各語系是否含 key | `find <repo> -name '*.strings' \| grep lproj`；語系名取 `.lproj` 前的字 |
| `ios.mappingFile`、`ios.mappingIdField` | 先端 mapping JSON 與其平台 id 欄位名 | 共用 id 對照 | 打開 mapping 看 `mappings[0]` 的欄位 |
| `ios.remoteConfigFiles` | 一定要掃的檔（例如 RemoteConfig provider） | 讓 diff 外定義的 config key 也列出 | `grep -rl 'configValue(forKey' <repo>` |
| `ios.remoteConfigKeyPattern`、`ios.eventNamePattern`、`ios.logCallPattern` | regex | config key、事件名、埋點呼叫處的寫法 | 各 grep 一次，確認 group 1 抓到的是 key／事件名 |
| `ios.testPathPattern` | regex | 排除測試檔 | 看測試 target 目錄名 |
| `android.mappingFile`、`android.mappingIdField` | 次端 mapping 與 id 欄位 | 同上 | 打開 mapping 看欄位 |
| `android.resDir`、`android.defaultModule`、`android.moduleResCandidates` | 預設 res 目錄、預設 module、依 mapping `module` 找 res 的樣板（`{module}` 佔位） | mapping 指到其他 module 時能找到資源 | `find <repo> -path '*/src/main/res/values/strings.xml'` 看 module 佈局 |
| `android.localeDirs`、`android.overrideDirs`、`android.localePairs` | 次端語系資料夾、只當覆寫用的資料夾、先端語系 ↔ 次端資料夾配對 | 語系比對 | 看 `values*/strings.xml` 各有幾筆：幾乎為空的資料夾是覆寫（例如某些專案把繁中放在預設 `values/`，`values-zh-rTW/` 只有幾筆） |
| `android.stringsFileName` | 預設字串檔名 | mapping 沒指定 `file` 時使用 | — |
| `classify.extraRules` | `[{"class":"…","pattern":"…","rule":"…"}]` | 專案特有目錄的分類，優先於內建規則 | 先跑一次 `classify_diff.py`，把落到 `其他` 的路徑補規則 |

## 常見錯誤

- 假設字串存取是 L10n：ToastEnglish 實際是 `LocalizedString.<key>`（SwiftGen 產生在本地 package）。一定要 grep。
- 把次端的預設語系資料夾當成缺翻譯：Android 常把主要語系放在 `values/`，`values-<lang>` 只放覆寫。用 `localePairs` 明寫配對。
- mapping 的 `module`／`scope` 不是翻譯後台的平台標籤；後台狀態只能人工查。
- 先端是 Android、次端是 iOS 時：`classify_diff.py --platform android` 可用，但字串、事件、config 的掃描樣式目前針對 Swift；先在 profile 補樣式或改成人工填寫，並在交接包第 5、7 章標明「腳本未執行」。

## 版本

`profileVersion: 1`。新增欄位時保留舊欄位語意，腳本對缺欄位回內建預設並在輸出 `notes` 註明。
