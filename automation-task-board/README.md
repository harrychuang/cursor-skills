# 自動化任務看板（Task Board）

團隊共用的 Trello 式 AI 任務看板：控制平面（web 看板 + 任務佇列 + 歷史資料庫）部署在雲端，
worker daemon 跑在每位設計師機器上，以 outbound HTTP 輪詢領卡並包裹
`agent-automation/scripts/run-task.mjs` 執行——用各自機器上登入的 AI 帳號。

```
瀏覽器（看板：五欄 = 待領取/執行中/需要處理/待確認/完成）
   ↕ HTTPS + SSE
控制平面 control-plane/（Next.js + PostgreSQL，部署於 Zeabur）
   ↑ 輪詢領卡（lease + heartbeat）
worker/（設計師機器上的零依賴 Node daemon）
   └─ spawn run-task.mjs → claude / codex / cursor-agent
```

核心原則：**看板是機器寫、人批准的**。卡片欄位由系統事件驅動（封閉狀態機）；
人只在「需要處理」「待確認」兩欄介入，拖曳或按鈕都是下指令（附說明重跑／批准結案），不是改狀態。

## 本機開發

```sh
cd automation-task-board/control-plane
npm install
npm run dev-db        # embedded PostgreSQL（資料在 .devdb/，不需系統安裝），保持前景執行
npm run migrate       # 另開終端：套用 Prisma migrations
npm run dev           # 啟動控制平面（http://localhost:3000）
npm test              # 單元 + 整合測試（需要 dev-db 在跑）

cd ../worker
node --test test/*.test.mjs   # worker 測試（零依賴）
```

`.env` 必要變數見 `control-plane/.env.example`。

## 部署到 Zeabur

1. **建服務**：Zeabur 專案內新增 PostgreSQL 服務，再從 Git 部署（Root Directory 設
   `automation-task-board/control-plane`）。Start Command 設 `npm run deploy:start`（單一命令；
   它在 npm script 內先跑 prisma migrate deploy 再啟動伺服器——**不要**在平台的
   start command 直接寫 A && B，多數平台不經 shell 解析，`&&` 會被當成參數）。
2. **Google OAuth 憑證**：Google Cloud Console → APIs & Services → Credentials →
   OAuth client ID（Web application），Authorized redirect URI 填
   `https://<你的網域>/api/auth/callback/google`。
3. **環境變數**（Zeabur 服務設定）：

   | 變數 | 說明 |
   | --- | --- |
   | `DATABASE_URL` | Zeabur PostgreSQL 連線字串 |
   | `AUTH_SECRET` | 隨機長字串（`openssl rand -base64 32`） |
   | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | 上一步的 OAuth 憑證 |
   | `MEMBER_ALLOWLIST` | 允許登入的 email，逗號分隔。空清單 = 全部拒絕（fail closed） |
   | `LOG_RETENTION_DAYS` | log 保留天數（預設 30） |
   | `LEASE_TTL_SECONDS` | lease 心跳逾時秒數（預設 90） |

4. **驗收**：允許清單內帳號登入可見看板；非清單帳號拒絕；未登入 API 回 401。

## 設計師機器：安裝 worker

1. 在看板登入後呼叫 `POST /api/tokens`（或之後的 UI）簽發 worker token——**明文只出現一次**。
2. 建立設定檔 `worker.config.json`（放哪都行，同層會產生 `.worker-machine-id` 與 `.worker-state/`）：

   ```json
   {
     "controlPlaneUrl": "https://<你的網域>",
     "workerToken": "wtk_...",
     "projectRoots": ["/Users/me/works/app-alpha"],
     "runners": ["claude"],
     "machineLabel": "Harry 的 MacBook"
   }
   ```

   每個 project root 必須含 `.agent-automation/config.json`（用 `agent-automation`
   的 bootstrap/guide 建立）；無效的根會被排除並回報原因。

3. 啟動：`node <cm-skills>/automation-task-board/worker/worker.mjs --config worker.config.json`。
   worker 只做 outbound 連線；領卡 → 心跳 → spawn run-task → 依 stateDir 的 run summary 回報。
   同一台機器同時最多執行一個任務。

## 導入既有專案

已經有自動化流程（`.agent-automation/config.json`）的專案，導入後看板第一天就能顯示現況：

1. **worker 設定**：把專案根加進 `worker.config.json` 的 `projectRoots`，啟動 worker——註冊
   成功後會立刻做一次「現況同步」。
2. **任務鏈設定**：`PUT /api/projects/<slug>/chain` 依 pipeline 順序排好 task id，之後建卡
   與接棒都以此為準。
3. **專案頁會顯示什麼**（看板卡片點專案名稱進入 `/projects/<slug>`）：
   - **磁碟現況**：worker 以子程序執行 `automation-pipeline-board` 的 build 腳本產生證據快照——每個
     階段的「尚未開始／已產出／已驗證」來自檔案存在性與 audit 結果，不是看板推測。專案
     沒有 `.pipeline-board/pipeline.json` 時會明說「無定義」（加上定義即可，見
     `automation-pipeline-board/references/pipeline-definition.md`）。
   - **外部執行**：worker 掃描專案 `stateDir` 的 run summary，看板以外發起的執行（含導入
     前的歷史）會出現在活動列表——**唯讀**，只帶 runId、taskId、phase、runner 與時間戳，
     不含任何指令內容；看板發起的執行自動去重不重複顯示。
4. **同步時機**：註冊後立即、每 `statusSyncIntervalMs`（預設 10 分鐘）、每次看板發起的執行
   結束後。注意快照產生會實際執行專案設定的 audit 指令，間隔勿設過短。

## 任務鏈（流水線接棒）

`PUT /api/projects/<slug>/chain` 設定有序任務清單（`requiresReview` 控制完成後是否進待確認）。
卡片完成進入「完成」欄時，鏈上的下一個任務會自動建卡（origin = pipeline-chain、auto-run）。
手動建卡與接棒卡預設自動執行；其他來源需在看板按「放行執行」。

## Figma Hub 派工（Design Automation Hub）

已安裝 `design-automation-hub` 的專案可以選擇把 Figma Plugin 送出的 `figma-cleanup`
交給看板，而不是在送出者機器上立刻開跑。**沒有設定綁定的專案行為完全不變**——送出即本機分析。

### 何時在本機跑、何時進看板

| 情境 | 誰執行 | 何時放行 |
| --- | --- | --- |
| 專案沒有綁定設定 | 送出者機器上的 Coordinator，當下就跑 | 不需要放行 |
| 專案有綁定設定 | 領到卡的機器上的 worker（spawn `run-task.mjs`） | 需要成員在看板按「放行執行」 |

外部觸發的卡預設 **不自動執行**（`autoRun: false`）：Figma 一次送出多個範圍時，不會瞬間燒掉全隊 AI 額度。

### 設定綁定（每個專案各自 opt-in）

在**目標專案**建立 `.design-automation/task-board.json`（安裝器的 gitignore 片段已涵蓋這個路徑，
不會被 commit）：

```json
{
  "schemaVersion": 1,
  "controlPlaneUrl": "https://<你的網域>",
  "token": "wtk_...",
  "projectSlug": "app-alpha"
}
```

- `token` 就是 worker token（在看板 `POST /api/tokens` 簽發，明文只出現一次）。**不要**寫進
  `.design-automation/project.json`——那個檔案的驗證會因為 credential-like key 直接拒絕整包設定。
- `projectSlug` 可省略，預設由專案根目錄名推導，規則與 worker 的 slug 完全相同。
- 環境變數逐欄覆寫：`DESIGN_AUTOMATION_TASK_BOARD_URL`、`DESIGN_AUTOMATION_TASK_BOARD_TOKEN`、
  `DESIGN_AUTOMATION_TASK_BOARD_PROJECT`、`DESIGN_AUTOMATION_TASK_BOARD_STALL_SECONDS`。
- URL 與 token 任一缺席即視為未綁定，Coordinator 走原本的本機路徑。
- 確認綁定生效：`curl http://127.0.0.1:8787/healthz` 的 `dispatch` 為 `true`（`extractionQueue`
  在兩種模式下都是 `false`——派工不是萃取佇列）。

### 誰領得到這張卡（v1 的同機約束）

Hub 把 snapshot 落地在專案的 `.design-automation/runtime/<automation-task-id>/input.json`，
那個目錄是 gitignored 的，**別台機器的 working tree 看不到它**。所以：

- worker 每次輪詢會申報「本機讀得到哪些 automation task id」，控制平面只把對得上的 Hub 卡發給它。
- 讀不到的機器連候選都拿不到，卡片就停在**待領取**——不會被錯的機器領走再假裝是派工。
- 實務上這代表：**送出整理的那台電腦要有 worker 在跑**。Plugin 在卡片久未被領取時會直接這樣說。
- snapshot 不上雲：控制平面不儲存 Figma file key、不儲存 snapshot 內容。真正的跨機搬運留待後續 change。

### 卡片走完之後：到 Plugin 確認

`figma-cleanup` 的 AI 步驟只到 **產出清理計畫**，Figma 一個像素都還沒被改。所以：

1. worker 跑完 → 卡片進**待確認**，卡片上明說「到 Figma Plugin 確認清理計畫」。
2. 設計師回到 Figma Plugin 勾選要套用的操作並執行——**看板的「標記結案」不等於已套用**。
3. Plugin 套用完成／失敗後，Coordinator 回寫看板：完成 → 卡片結案；失敗 → 卡片進需要處理。
   回寫是盡力而為，Coordinator 沒開著時卡片就留在待確認，由成員自行處理。

### 失敗時看到什麼

| 情況 | 看板 | Plugin |
| --- | --- | --- |
| 控制平面不可達（建卡失敗） | 沒有卡片 | 任務 `blocked`，可重新送出 |
| 沒有機器讀得到 input | 卡片停在待領取 | 「尚無機器領取」與領卡資格說明 |
| 領到卡但 input 已消失 | 卡片進需要處理，原因 `hub-input-missing` | 任務 `blocked` |
| run-task 驗證失敗 | 卡片進需要處理 | 任務 `blocked` |

## log 與隱私

- worker 端捕捉 run-task 子程序的合併輸出，**在本機遮罩後**分塊上傳：
  傳給子程序的環境變數值與 credential pattern（api key / token / secret / password /
  private key）一律替換為 `[redacted]`；未遮罩內容不落盤、不出機器。
- 控制平面依 `LOG_RETENTION_DAYS` 自動刪除過期 log。
- worker token 只存 sha256 雜湊；`.agent-automation` 契約與 orchestrate 腳本零修改。

## 端到端驗收（本機）

```sh
cd automation-task-board/control-plane
npm run dev-db            # 終端 1
npm run migrate && npm run dev   # 終端 2
node scripts/e2e-local.mjs       # 終端 3：全流程驗收
```

`scripts/e2e-local.mjs` 會建 fixture 專案（stub runner，透過真實 run-task.mjs 執行）、
簽發 token、啟動真 worker，走完「建卡 → 自動領取 → 執行 → 驗證失敗進需要處理 →
附說明重跑（resume 指令）→ 完成進待確認 → 批准 → 完成 + 接棒建卡」，
並斷言卡片歷史、歸屬三元組與兩次 run 的關聯。瀏覽器端的 Google 登入流程需部署後以真帳號驗收（見上）。
