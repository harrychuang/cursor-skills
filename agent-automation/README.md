# Agent Automation Orchestrate 導覽

`agent-automation` 是 cm-skills 的**自動化入口**：其他 skill 描述「要做什麼工作」，這個 skill 負責把工作排程、執行、續跑，並留下可稽核的完成證明。核心設計是一條分界線——

> **通用的事放 runner，專案的事放契約。**
> 廠商 CLI 指令、argv、preflight、timeout 屬於 `runners`；任務指示、配套 skill、驗證指令、必要 artifacts 屬於目標 repo 自己的 `.agent-automation/config.json`（`tasks`）。credential 永遠不進契約。

這份 README 是**一頁式導覽**：告訴你五種模式怎麼觸發、檔案在哪、深度文件讀哪份。agent 執行時依據的作業程序在 `SKILL.md`。

---

## 五種模式

每次請求只解析成一種模式。inspect／explain／status 是唯讀的，**絕不啟動付費 agent**；只有明確要求 run／resume／implement／fix 才會執行。

| 模式 | 什麼時候用 | 怎麼說 |
| --- | --- | --- |
| **bootstrap** | 幫一個 repo 建立或修改自動化契約 | `Use $agent-automation to set up automation for <repo>.` |
| **guide** | 設計師用白話情境描述想要的自動化（不出現任何技術術語的訪談） | `Use $agent-automation to set up automation for <repo>. I want ready-for-dev Figma components built into Storybook.` |
| **run** | 執行契約裡的一個 task（依序 fallback：Claude Code → Codex → Cursor →…，第一個 exit 0 的 runner 之後停止） | `Use $agent-automation to run the <task-id> task in <repo>, with a dry run first.` |
| **resume** | 查一個非終止的 run 並接續剩餘工作 | `Use $agent-automation to resume run <run-id> in <repo>.` |
| **status** | 讀最新或指定 run 的 sanitized 摘要 | `Use $agent-automation to report the automation status of <repo>.` |

## 底層指令速查

```bash
# 看清楚目標 repo（bootstrap 前、換 target root 時）
node scripts/inspect-project.mjs --project-root <absolute-repo>

# 每次 run / resume 前都必須通過
node scripts/validate-project-config.mjs --project-root <absolute-repo>

# 先預覽、再執行
node scripts/run-task.mjs --project-root <absolute-repo> --task <task-id> --dry-run
node scripts/run-task.mjs --project-root <absolute-repo> --task <task-id> --request "<user-request>"

# 讀狀態、續跑
node scripts/status.mjs --project-root <absolute-repo> [--run-id <run-id>]
node scripts/run-task.mjs --project-root <absolute-repo> --task <task-id> --resume <run-id> --request "<remaining-work>"
```

契約起點：複製 `assets/agent-automation.config.example.json` 到目標 repo 的 `.agent-automation/config.json` 再依 repo 證據客製，或直接走 guide 模式讓訪談產出同一份契約。

## 完成的定義

一個 task 只有在**全部**成立時才算完成：選中的 runner exit 0、每條驗證指令通過、每個必要 artifact 存在於 project root 內、durable summary 的 phase 是 `completed`、配套 skill 的完成條件也通過。契約驗證、agent 完成、專案驗證、git commit、git push 是**五個獨立的宣稱**，不互相代表。驗證失敗是專案的結果——不是換一家 runner 重寫同一份工作的理由。

## 目錄與文件地圖

```
SKILL.md                          ← agent 的作業程序（模式解析→契約→執行→完成規則）
references/
  project-contract.md             ← .agent-automation/config.json 的完整 schema 與欄位規則
  runner-contract.md              ← runner profile 的 shape：command/args/timeout/preflight/env
  designer-guide.md               ← guide 模式的訪談規則、術語表、翻譯規則（設計師用語的正典）
assets/
  agent-automation.config.example.json  ← 契約範本
  scenario-templates/             ← guide 模式的情境選單（figma-ready-to-storybook、
                                     design-system-extraction、screenshot-to-component、
                                     visual-parity-audit ＋ README）
scripts/
  inspect-project.mjs             ← 唯讀盤點目標 repo
  validate-project-config.mjs     ← 契約驗證
  run-task.mjs                    ← 執行／dry-run／resume
  status.mjs                      ← sanitized run summary
  check-agent-automation-skill.mjs ← 只給 skill 維護者：用 fake runner 與暫存 fixtures 自測
```

**讀哪份？** 建契約 → `references/project-contract.md`；接新 CLI 或改 fallback 規則 → `references/runner-contract.md`；任何設計師面向的訪談或報告 → `references/designer-guide.md`（一字一句都以它為準）。使用情境與提示詞範例另見 repo 的 `docs/skills-usage.md`。

## 誰建立在它之上

| 使用者 | 關係 |
| --- | --- |
| `design-automation-hub` | 在既有契約上**合併**一個 `figma-cleanup` task ＋ `figma-design-automation` 配套 skill，不裝第二套 runner。 |
| 外部 tracker 或狀態工具 | 唯讀地消費 stateDir 中的 durable run summaries（原子寫入、已消毒的 JSON）；本 skill 不指定也不推薦特定工具。 |
| 各契約裡的配套 skill | task 的 `skill` 欄位指名的 skill 擁有領域規則與核可關卡；runner 保持通用。 |

## 維護

改動這個 skill 本身後跑自測（不會啟動真的 agent）：

```bash
node scripts/check-agent-automation-skill.mjs
```
