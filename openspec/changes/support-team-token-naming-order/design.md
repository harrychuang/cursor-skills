## Context

figma-m3-variables 在 Figma 裡建立與稽核三層 Variables，名稱固定用 M3 順序（`{p}/comp/{component}[/{variant}][/{size}][/{condition}][/{state}]/{anatomy}/{property}`）。檔案慣例只會沿用「舊狀態順序」與舊用字，稽核規則 17 會把「狀態在最後」的 Comp 名稱當成舊寫法並建議改成 M3 順序。design-system-extractor 在 CSS 裡建立 `--<prefix>-ref|sys|comp-*` token，comp 名稱預設為 `--<prefix>-comp-<component>-<part>-<property>`，`audit_tokens.mjs` 只檢查各層用字與 ref 色階，不檢查段落順序。

團隊會自己決定段落順序並固定下來，例如 prefix → category → component → role → variant → target → state（`shop/comp/button/color/primary/container/hovered` ↔ `--shop-comp-button-color-primary-container-hovered`）。狀態放在最後時，`…/container` 與 `…/container/hovered` 並存會讓一個名稱同時是變數又是群組；token-spec.md §2 已禁止，但沒有偵測，也沒有修法。

限制：只改兩個 skill 在 repo 頂層的副本；`.cursor/skills/`、`.agents/skills/` 的巢狀副本與 `~/.claude/skills/` 的安裝副本不動。figma-m3-variables 的腳本是文件裡的 Plugin API 片段，由 agent 透過 use_figma 執行，無法在本機測試；design-system-extractor 的腳本是 Node ESM，有 `test_audits.mjs` 回歸測試（目前 22 個）。

## Goals / Non-Goals

**Goals:**

- 兩個 skill 都能接受、說明、記錄並沿用團隊定案的段落順序。
- 順序的來源有固定優先序；只有證據互相矛盾時才問。
- 稽核依使用中的順序檢查名稱，不再把團隊順序當成舊寫法。
- 狀態放在最後的順序下，預設狀態明確寫成 `default`，並能偵測變數同時是群組。

**Non-Goals:**

- 不改 M3 預設順序與 extractor 預設的 comp 命名；沒有團隊順序時行為不變。
- 不自動把既有變數改成新順序；改名一律走稽核修正與原本的確認分級。
- 不改 figma-componentize、design-system-governance、design-system-to-storybook；它們透過 Workflow F 或 token 檔間接沿用。
- 不同步巢狀副本與安裝副本，只回報狀態讓使用者決定。
- 不在 CSS 名稱上偵測「變體後面接目標」這類非狀態的群組衝突；CSS 名稱看不出段落邊界，只在 Figma 路徑上（規則 19）偵測。

## Decisions

### 段落順序模型與詞彙

順序是一串 slot 名稱（例如 `prefix > category > component > role > variant > target > state`），每個 slot 可附一組值（詞彙），用不到的 slot 省略。Figma 名稱的一段就是一個 slot 值；CSS 名稱是 `/` 換成 `-`。值可以含 `-`（例如 `on-primary`），所以 CSS 端用最長詞彙比對切段。替代方案是只用正規表示式描述名稱格式；但團隊的順序與用字差異太大，用詞彙表比較能說明也能稽核，因此不採用。

### 順序來源的優先序

prompt → 已記錄的順序 → 從既有名稱推斷 → 預設。figma-m3-variables 的「已記錄」包含 Figma 檔案的 shared plugin data 與工作區的 `TOKEN_ARCHITECTURE.md` `## Naming Order`；extractor 的「已記錄」是 `TOKEN_ARCHITECTURE.md`。來源之間矛盾、或既有 Comp 名稱混用兩種順序時，只問一次並附各自的數量與範例。prompt 與已記錄的順序不同時，以 prompt 為準，計畫會指出差異，既有名稱不會被靜默改名。

### 在既有計畫中說明順序

figma-m3-variables 在 Workflow F token plan 標頭、Workflow B、D 的計畫與 Workflow C 的報告標頭加一行 `Naming order: … (source) — reply …`；extractor 在第一次寫 token 前，用一句不阻擋的話說明（與 Report Language 相同做法）。不另設停點，因為順序改變只是計畫的修改，原本的確認流程已足夠。

### 記錄位置

extractor 寫入 `TOKEN_ARCHITECTURE.md` 的 `## Naming Order`：`Order:`、`Source:`、`Default state:`、`CSS name:` 四行與 `| Slot | Layers | Values |` 表，加上每層至少一個範例。範本附空白的區段（`Order:` 空白代表預設）。figma-m3-variables 把確認後的順序寫進 Figma 檔案的 shared plugin data（namespace `m3_variables`、key `naming_order`，JSON），讓檔案本身帶著決定；它不寫 `TOKEN_ARCHITECTURE.md`，該檔由 extractor 負責。替代方案是在 Figma 建一個說明頁或隱藏變數記錄順序，但會污染檔案內容，因此不採用。

### 明確的預設狀態

順序把 `state` 放在名稱用到的 slot 之後、且 token 有狀態變化時，預設狀態寫成獨立一段 `default`（或記錄中的預設狀態用字）。這是 Figma 變數名稱與 DTCG 路徑的限制：一個名稱不能同時是 token 又是群組。CSS 自訂屬性沒有群組，本身不受影響；但兩個 skill 都讓 CSS 名稱與路徑一一對應，所以 CSS 名稱也會帶 `-default`。替代方案是只在 Figma 路徑加 `default`、CSS 省略（例如某些 design system 的 `[default]` 鍵），但會破壞「路徑換成 `-` 就是 CSS 名稱」的一致性，因此不採用。

### 稽核規則 17 依順序檢查

規則 17 改名為「Naming order」。使用 M3 順序時保留原本的舊狀態順序檢查與 M3 改名；使用團隊順序時，用團隊詞彙分類每一段（第 0 段是 prefix），略過無法分類的段，檢查分類後的 slot 索引是否非遞減；不符時提出依 slot 排序後的名稱（每段都能分類時），修正為 Tier 2 原地改名。

### 稽核規則 19 偵測變數同時是群組

新增規則 19「Variable is also a group」，warning，檢查變數名稱：某個名稱加上 `/` 是另一個名稱的開頭。修正：狀態在最後且子名稱下一段是狀態值 → 改名為 `{name}/default`（Tier 2，更新 WEB code syntax，並提醒程式碼中的舊 CSS 名稱要跟著改）；M3 順序 → 指向規則 17 的改名；其他情況 → 請使用者決定改哪個名稱。規則總數由 18 變 19，SKILL.md、audit-rules.md、docs/index.html 的數字一起改。

### extractor 稽核的命名順序檢查與狀態群組警告

新增共用模組 `scripts/lib/naming_order.mjs`：解析 `## Naming Order`、切段與分類、順序檢查、狀態群組配對。`audit_tokens.mjs` 輸出 `Naming order:` 一行；名稱不照順序是 issue（所有模式，與既有的層級用字規則一致）；`--x` 與 `--x-<狀態>` 並存是 warning（所有模式，CSS 能正常運作，只影響匯出）；`--json` 新增 `namingOrder`。屬於只限某些層的 slot（Layers 欄），出現在其他層時略過，因為既有的「sys/ref 用了元件名稱」檢查已會回報，避免重複且錯誤的改名建議。

### 數字與無法分類的段

數字段歸到詞彙裡含數字的 slot（例如 state 列了 `50`，則 `5` 也是 state）；詞彙沒有涵蓋的段一律略過、不報錯，避免詞彙不完整時誤判。代價是詞彙越少，能檢查的越少。

## Implementation Contract

**figma-m3-variables（文件與 Plugin API 片段）**

- 行為：解析順序時依「prompt → 已記錄 → 推斷 → M3」；只有矛盾時問一次。計畫標頭一定出現 `Naming order: <slots 或 M3> (<source>)` 與切換提示。確認後第一個寫入呼叫執行 `figma.root.setSharedPluginData('m3_variables', 'naming_order', JSON)`；失敗時回報並繼續。
- 資料形狀（shared plugin data JSON）：`{ "order": ["prefix", …] | "m3", "values": { "<slot>": ["…"] }, "defaultState": "default", "source": "prompt|recorded|inferred|default", "updated": "YYYY-MM-DD" }`。
- 名稱：團隊順序下依 token-spec.md 新增的 §14 對照表把 M3 概念轉成 slot；狀態在最後且有狀態變化時寫 `default`；WEB code syntax 仍是 `var(--{name 的 / 換成 -})`。
- 稽核：規則 17「Naming order」依使用中的順序檢查；規則 19「Variable is also a group」；報告標頭寫出檢查用的順序；「checked rules 1–19」。
- 驗收：SKILL.md、token-spec.md、audit-rules.md、binding-recipes.md、value-harvest.md、docs/index.html 的規則數、規則名稱、順序說明與範例一致；audit-rules.md 的片段語法可被 `node --check` 解析（包成 async 函式後）。

**design-system-extractor（腳本與文件）**

- `TOKEN_ARCHITECTURE.md` `## Naming Order` 格式：`Order:`（slot 以 `>`、`→`、`->` 或 `/` 分隔；空白或 `default` 代表沒有記錄）、`Source:`、`Default state:`、`CSS name:`、`| Slot | Layers | Values |` 表（值以逗號分隔，反引號忽略）。
- `scripts/lib/naming_order.mjs` 匯出：`parseNamingOrder(markdown)` → `null` 或 `{ slots, values, layers, source, defaultState }`；`checkNameOrder(name, order, layer)` → `{ ok, segments, violation, expected }`；`findStateGroups(names, order)` → `[{ token, children, suggestion }]`。
- `audit_tokens.mjs`：stdout 在 `Component tokens:` 之後印 `Naming order: … (TOKEN_ARCHITECTURE.md)` 或 `Naming order: default (none recorded)`；順序違規 issue 文字以 `Token name does not follow the recorded naming order` 開頭；狀態群組 warning 以 `Token is also a group once names become slash paths` 開頭並提出 `--x-default`；`--json` 的鍵為 `clusters`、`counts`、`issues`、`namingOrder`、`scaleFit`、`warnings`。
- 失敗模式：`TOKEN_ARCHITECTURE.md` 不存在或沒有區段 → 預設命名、不報順序 issue；表格缺值 → 該 slot 沒有詞彙，該 slot 的段無法分類而略過。
- 驗收：`node design-system-extractor/scripts/test_audits.mjs` 全數通過（原 22 個加新測試）；`node ds-to-storybook/scripts/test_trace_and_plan_contract.mjs` 仍通過（範本改動）。

**範圍外**：巢狀副本與安裝副本、其他 skill、既有檔案的自動遷移、CSS 名稱上非狀態的群組衝突。

## Risks / Trade-offs

- [use_figma 無法在本機測試 shared plugin data 寫入] → 寫入失敗時回報並繼續；下次從名稱推斷仍能找回順序；在回報中註明未在實際檔案驗證。
- [詞彙不完整時順序檢查覆蓋率低] → 無法分類的段略過不報錯；計畫列出不在詞彙裡的值供使用者補充。
- [CSS 名稱的段落邊界有歧義（`primary-container` 是一段還是兩段）] → CSS 端只檢查狀態後綴的群組衝突；完整的群組衝突只在 Figma 路徑（規則 19）檢查。
- [把 `primary` 改成 `primary/default` 會改變 CSS 名稱，影響程式碼] → 規則 19 的修正明確提醒程式碼要跟著改，且走 Tier 2 確認。
- [新增 JSON 鍵可能影響下游讀取] → 只新增鍵、不改既有鍵的形狀；更新 audits.md 與測試。

## Migration Plan

沒有記錄順序的專案與檔案行為不變。要採用團隊順序的既有檔案：先跑 Workflow C，依規則 17、19 的建議分批改名（Tier 2）。回復方式：移除 `## Naming Order` 的 `Order:` 值，或刪除 Figma 檔案的 `m3_variables` / `naming_order` 記錄，即回到預設。

## Open Questions

- 巢狀副本（`.cursor/skills/`、`.agents/skills/`）與 `~/.claude/skills/` 是否要同步本次改動，由使用者決定。
