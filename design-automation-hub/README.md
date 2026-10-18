# Design Automation Hub 安裝與使用指南

`design-automation-hub` 是一個「把 Figma 清理自動化裝進任何 repo」的安裝器 skill。裝好之後，目標專案會多出三個可以協同運作的東西：

| 元件 | 位置 | 做什麼 |
| --- | --- | --- |
| **Figma Plugin**（Design Automation Hub） | `figma/design-automation-hub/` | 設計師在 Figma Desktop 裡選定清理範圍、送出任務、看狀態、確認清理計畫。 |
| **本機 Coordinator** | `scripts/design-automation-hub/` | 跑在 `127.0.0.1:8787` 的本機 server，銜接 Plugin 與 AI agent，管理任務快照與結果。 |
| **`figma-cleanup` 自動化 task** | `.agent-automation/config.json` ＋ `figma-design-automation` 配套 skill | AI agent 讀一份任務範圍內的 Figma 快照，產出「有依據、有上限、白名單操作」的清理計畫（不直接改 Figma 文件）。 |

整條工作流是「**設計師在 Figma 圈範圍 → AI 產清理計畫 → 人確認後才動手**」。這個安裝器不重複造 runner——task 執行交給同一份 checkout 裡的 `agent-automation`。

這份文件給兩種讀者：**要在專案裡安裝／使用 Hub 的人**（前六節），以及**要維護安裝器本身的人**（最後一節）。agent 執行安裝時依據的作業程序在 `SKILL.md`；檔案所有權與 profile/adapter 契約在 `references/installation-contract.md`。

---

## 1. 前置需求

- 一份**完整的 `cm-skills` checkout**，同時包含 `design-automation-hub/` 和 `agent-automation/`。安裝器不會下載或 vendor 任何依賴，一律從同一份 checkout（或明確的 `--skills-source-root`）解析。
- 目標 repo 要有**有效的 `.agent-automation/config.json`**。沒有的話安裝會回報 `needs-bootstrap`——先用 `agent-automation` 的 bootstrap 或 guide 模式建契約，再回來裝。
- **明確的專案身分**：stable project id、顯示名稱、一個以上的 Figma file key。這三樣**永遠不會被推測**——不會從資料夾名、git remote、package 名或 Figma 檔名猜，缺了就會回報 `needs-profile` 並用白話問你。
- Figma Desktop（最後的 Plugin 匯入是手動步驟）。

## 2. 安裝

安裝由 AI agent（Claude Code / Cursor / Codex）執行。在 `cm-skills` checkout 對 agent 說：

```text
Use $design-automation-hub to install the Design Automation Hub into <absolute-project-root>.
```

agent 會依 `SKILL.md` 的流程走：**一定先 dry-run**（零寫入預覽）→ 缺契約就先走 bootstrap → 用你提供的專案身分執行真正安裝 → 跑 installed-project 檢查 → 回報 Figma Desktop 手動匯入的 manifest 絕對路徑。

只想看會裝什麼、不想動任何檔案：

```text
Use $design-automation-hub to preview a Design Automation Hub installation for <absolute-project-root>.
```

對應的底層指令（agent 會代跑，人也可以直接執行）：

```bash
node design-automation-hub/scripts/install-design-automation-hub.mjs \
  --project-root <absolute-project-root> \
  --host-mode standalone \
  --dry-run \
  --json
```

### 安裝完會有什麼

```
figma/design-automation-hub/               ← Figma Plugin（manifest.json + main.js + ui.html）  [managed]
scripts/design-automation-hub/             ← 本機 Coordinator ＋ agent-runner ＋ 清理結果檢查器  [managed]
.agents/skills/figma-design-automation/    ← 配套 skill（Cursor / Codex 共用）                  [managed]
.claude/skills/figma-design-automation/    ← byte-identical 的 Claude Code 鏡像                [managed]
.agent-automation/config.json              ← 只合併進一個 figma-cleanup task，其餘不動          [merge]
.gitignore                                 ← 只合併 runtime/state 兩行                         [merge]
.design-automation/project.json            ← 專案 profile（id／名稱／file keys／host mode）     [generated]
.design-automation/install.json            ← 安裝收據（template 版本＋managed 檔案雜湊）        [generated]
```

方括號是**檔案所有權**，決定更新時的行為：`managed` 檔案由安裝器版控（本機改過會變成衝突）；`merge` 檔案只合併宣告過的片段、不碰無關內容；`generated` 檔案由明確輸入生成、絕不推測。

## 3. 啟動與驗證 Coordinator

在裝好的目標 repo 根目錄，先透過環境變數提供至少一個本機成員，再啟動：

```bash
DESIGN_AUTOMATION_MEMBERS_JSON='[{"accessCode":"<local-access-code>","id":"<member-id>","displayName":"<display-name>","roles":["designer"]}]' \
  node scripts/design-automation-hub/standalone.mjs
```

另開終端驗證：

```bash
curl -fsS http://127.0.0.1:8787/healthz
```

回應要有 `status: "ok"`、`schemaVersion: 1`、`extractionQueue: false`。

幾條要遵守的規則：

- **access code 不落地**：不進 tracked 檔案、報告、截圖或 shell 逐字稿。它只存在環境變數和你自己的密碼管理裡。
- **port 8787 是 Plugin 端寫死的**：`manifest.json` 的 `networkAccess.devAllowedDomains` 和 Plugin 原始碼都釘在 `http://localhost:8787`。port 被佔用時可以用 `PORT` 換 port 做 HTTP 驗證，但 Figma Desktop 的驗收一定要在預設 port 上——**經所有者同意**釋放 8787，而不是擅自停掉別人的服務，也不是改 port 硬測（那只會得到連不上 Coordinator 的 Plugin，是 port 不一致、不是驗收失敗）。

## 4. 匯入 Figma Plugin（手動步驟）

檔案系統安裝完成**不等於** Plugin 已可用。最後一步永遠是手動的：

**Figma Desktop → Plugins → Development → Import plugin from manifest**，選安裝報告裡的 manifest 絕對路徑。

同一個 manifest 身分**只匯入一次**：第二個專案 profile 沿用同一個「Design Automation Hub」Plugin，不要再匯一份專案命名的副本。

## 5. 更新既有安裝

```text
Use $design-automation-hub to update the Design Automation Hub in <absolute-project-root>.
```

更新一樣**先 dry-run**。`managed` 檔案有本機修改時預設視為**衝突**（比對安裝收據的雜湊），不會靜默覆蓋；只有在你明確授權時 agent 才會帶 `--force-managed` 替換 installer-managed 檔案——而且它永遠不會覆蓋不認識的專案設定或衝突的 `figma-cleanup` task。

驗證一個已安裝的專案：

```bash
node design-automation-hub/scripts/check-design-automation-hub.mjs \
  --project-root <absolute-project-root> \
  --json
```

## 6. 兩種 host mode

- **standalone**（預設）：用內建 Coordinator，提供認證後的專案 context、清理任務與 workflow 狀態；review 功能固定關閉、不建 extraction queue。多數專案用這個。
- **compatible**：目標專案已有自己的 host 系統時，提供一個 project-relative adapter module（export `designAutomationHubHostAdapter`，contract version `1`，含 `resolveProject` 與 `resolveMember`）。review 只有在三個 review method 齊備、且**零寫入 preflight**（Node permission model 沙箱、無檔案寫入權限）通過時才會啟用；沙箱不可用時 preflight 直接失敗關閉。細節與驗收矩陣見 `SKILL.md` 和 `references/installation-contract.md`。

---

## 7. 給安裝器維護者

skill 本體在 cm-skills repo 的 `design-automation-hub/`：

```
SKILL.md                               ← agent 的安裝／更新／驗收作業程序
references/installation-contract.md    ← 檔案所有權、project profile schema、host adapter 契約
template/
  TEMPLATE_MANIFEST.json               ← 版本化檔案清單：每個檔案的 target、ownership、sha256
  figma/ scripts/ skills/              ← 會被複製進目標專案的內容
  agent-automation-task.fragment.json  ← 合併進 .agent-automation/config.json 的 figma-cleanup task
scripts/
  install-design-automation-hub.mjs    ← 安裝器本體（dry-run／install／update／--json）
  check-design-automation-hub.mjs ← template 與 installed-project 驗證
  build-template-manifest.mjs          ← 改動 template 後重建 manifest（重算 sha256）
  smoke-host-adapter.mjs               ← compatible adapter 的零寫入 smoke
test/                                  ← fixtures，含 manual-two-project-acceptance.json 驗收紀錄
```

改動 `template/` 內任何檔案後要跑 `build-template-manifest.mjs` 重建 manifest，並用 `check-design-automation-hub.mjs --template --json` 驗證。`template/skills/figma-design-automation/` 的正典來源同步規則記錄在 manifest 的 `sourceSync`。完整的 release acceptance 清單（含 Figma Desktop 雙專案手動驗收與六項指令檢查）在 `SKILL.md` 的「Release acceptance」一節；規格與決策記錄見 openspec change `add-design-automation-hub-installer`。

## FAQ

**Q：可以不裝 `agent-automation`、只裝 Hub 嗎？**
不行。`figma-cleanup` task 由通用 runner 執行，Hub 只補上 Figma 端的 Plugin、Coordinator 和配套 skill。這是刻意設計：一個 repo 只有一套 runner，所有自動化共用同一份契約與 run summary。

**Q：dry-run 顯示 `bootstrap-agent-automation`，但也給了完整的 planned 結果——到底能不能裝？**
dry-run 會在缺契約時照樣算出完整安裝計畫並把 bootstrap 列進 `nextActions`；**真正安裝**遇到同樣缺契約會回 `needs-bootstrap` 且不寫任何檔案。先補契約再裝。

**Q：安裝器會自動操作 Figma 嗎？**
不會。安裝器只動目標 repo 的檔案系統；Figma Desktop 的 manifest 匯入永遠是使用者手動完成、手動確認的步驟。

**Q：AI 會直接改我的 Figma 文件嗎？**
不會。`figma-design-automation` 配套 skill 的契約是唯讀分析：讀一份範圍限定的快照，產出最多 100 個白名單操作的清理**計畫**，由人在 Plugin 裡確認後才執行。
