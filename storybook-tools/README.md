# Storybook Tools 安裝與使用指南

`storybook-tools` 是一個「把通用工具頁裝進 Storybook」的安裝器 skill。裝好之後，專案的 Storybook 側欄會多出一個 **Tools** 分類，目前包含兩個工具頁：

| 工具 | 頁面 | 解決什麼問題 |
| --- | --- | --- |
| **Component Coverage Analyzer** | `Tools/Component Coverage Analyzer` | 拿一張 UI 圖或一段 PRD，分析「這個畫面有多少能用現有元件拼出來、哪些要擴充、哪些要新建」，開發者覆核後直接交接 AI 實作。 |
| **Component Timeline** | `Tools/Component Timeline` | 依 git 歷史呈現「每個共用元件是哪一天誕生的」，卡片內嵌元件的 live story，預覽永遠是最新狀態、不用維護截圖。 |

這份文件給兩種讀者：**要在專案裡安裝／使用工具的開發者**（前八節），以及**要維護這個安裝器本身的人**（最後一節）。

---

## 1. 安裝

### 前置需求

- 目標是 **React** 的 Storybook 專案。前置檢查是**逐工具**的：某個工具的前置不符只會擋下該工具，不會擋整個安裝。
- 要裝 **Component Coverage Analyzer** 的話，需要 **Vite builder**（`@storybook/react-vite` 或其他 Vite-based React 設定）——它的 dev API 是 Vite middleware，Webpack builder 無法使用。另外專案要有可重用元件且有 stories（分析需要元件庫做比對；沒有的話工具仍會渲染，但所有區塊都會被判成「缺少」）。
- 要裝 **Component Timeline** 的話，git 需要**完整歷史**（non-shallow）。用 `git rev-parse --is-shallow-repository` 檢查，必須印出 `false` —— shallow clone 會讓所有元件的誕生日都變成 clone 那天。

### 怎麼裝

安裝由 AI agent（Cursor / Claude Code / Codex）執行。在目標專案對 agent 說：

```text
Use $storybook-tools to install the Storybook tools suite into ./apps/web.
```

預設**兩個工具都裝**。只要其中一個時點名即可：

```text
Use $storybook-tools to install only the component timeline into ./apps/web.
```

agent 會依 `SKILL.md` 的流程：複製 template 檔案（verbatim，不改內容）、**讀你專案的元件與 stories 生成 `src/storybook/componentCatalog.ts`**（這步是安裝品質的關鍵，生成後 agent 會請你過目）、接上 `.storybook/main.ts` 與 npm scripts，最後跑完整驗證清單。

### 安裝完會有什麼

```
src/storybook/componentCatalog.ts                  ← 元件目錄（生成，之後由專案自己維護）
src/storybook/component-coverage/                  ← Coverage 工具 UI（含 compositionPreviewRegistry.tsx 擴充點）
src/storybook/component-timeline/                  ← Timeline 工具 UI（含 timelineExtrasRegistry.tsx 擴充點）
src/storybook/componentTimeline.ts                 ← Timeline 資料（生成，用 npm script 重建）
src/stories/tools/*.stories.tsx                    ← 兩個工具頁的 story 入口
scripts/…                                          ← dev API vite plugin ＋ 各檢查腳本
outputs/component-coverage/requests/<id>/          ← 分析請求＋上傳圖片（gitignore，不進版控）
outputs/component-coverage/reports/<id>.json       ← 覆蓋率報告（要 commit）
outputs/storybook-tools/TEMPLATE_MANIFEST.json     ← 安裝紀錄（版本＋installedTools，更新時比對用）
.agents/skills/ 與 .claude/skills/                 ← coverage 配套 analyze／implement skills（各 agent 共用）
```

npm scripts（裝了對應工具才會有）：

| script | 作用 |
| --- | --- |
| `check:component-catalog` | 驗證元件目錄與現實一致（路徑存在、storyTitle 有出處、id kebab-case 唯一）。選配 alias——安裝時依專案慣例決定要不要加，底層腳本一定會裝 |
| `check:coverage-reports` | 驗證所有覆蓋率報告符合資料契約 |
| `check:coverage-agent-skills` | 驗證配套 skills 各副本與 manifest 雜湊一致 |
| `check:coverage-preview` | 驗證工具 UI 的契約行為沒有被改壞 |
| `build:component-timeline` | 從 git 歷史重建 timeline 資料檔（建置指令，不是檢查） |
| `check:component-timeline` | 驗證 timeline 資料檔沒有過期 |

`check:*` 系列會掛進專案既有的 `npm run check` 聚合腳本（`check:component-catalog` 在有加 alias 時一併掛入）。

---

## 2. 使用 Component Coverage Analyzer

### 完整工作流程

整條流程是「**人送需求 → AI 分析 → 人覆核 → AI 實作**」，你在 Storybook 頁面和 AI agent 之間各走兩趟：

1. **送出請求** — 開 `Tools/Component Coverage Analyzer`，在「新增分析請求」表單上傳 UI 圖（可多張、可貼上、單張上限 5MB）或貼 PRD 文字（至少一項），按「送出分析請求」。請求會存到 `outputs/component-coverage/requests/<時間戳-slug>/`。
2. **交給 AI 分析** — 按成功訊息旁的「**複製分析提示詞**」，貼到 Cursor、Claude Code 或 Codex。agent 會執行 `component-coverage-analyze` skill：把畫面拆成區塊、逐一與元件目錄比對，寫出報告 JSON 並自動跑報告檢查。回到 Storybook 重新整理，該列狀態從「待分析」變「**待覆核**」。
3. **覆核報告** — 展開報告列。報告把區塊分成三類：

   | 分類 | 意思 | 你可選的決策 |
   | --- | --- | --- |
   | 可直接使用（reusable） | 現有元件即可達成 | `確認可用`｜`改用現有元件`｜`不實作`（選填，不擋確認） |
   | 需擴充 variant（extend） | 元件存在但要新增變體 | `同意擴充`｜`不需擴充`｜`改用現有元件`｜`不實作`（必填） |
   | 缺少需新建（missing） | 沒有元件能涵蓋 | `同意新建`｜`改用現有元件`｜`不實作`（必填） |

   可以在「組裝預覽」點畫面上的元件、透過右側 Inspector 看辨識依據與原圖裁切，或在「分析明細」逐區塊看候選元件（含 fit／出處／首選標記與 inline story 預覽）。選「改用現有元件」會開啟目錄搜尋器，只能從清單選（不能自由輸入）。每個區塊選好決策後按「儲存覆核」。
4. **確認凍結** — 「覆核進度 X/Y」跑滿後按「**確認覆核完成**」。確認後報告變成實作的需求凍結（requirement freeze）。
5. **交給 AI 實作** — 確認後出現「開始實作」面板，按「**複製實作提示詞**」貼給同一批 agent。agent 執行 `component-coverage-implement` skill：工作清單**只來自你儲存的覆核決策**（`同意擴充` → 加 variant、`同意新建` → 建新元件＋stories＋登錄目錄、`改用現有元件`／`不需擴充` → 純組裝、`不實作` → 排除），報告未確認會直接拒跑。

### 要注意的行為

- **確認後的報告在 UI 內是唯讀的**：要改覆核必須先按「還原為草稿」（Inspector 也會提示「報告已確認；先還原為草稿才可編輯覆核」），改完重新確認。但要注意：覆核儲存的 API 一律以 `draft` 寫入——**繞過 UI 的寫入**（agent 直接改報告檔、直接呼叫 API、留在舊分頁的儲存）會把已確認的報告**靜默打回 draft**。實作前建議用 git diff 看一眼報告檔的 `reviewStatus`。
- **requests 不進版控、reports 要 commit**：`outputs/component-coverage/requests/` 在 .gitignore 裡，圖片只存在本機——刪掉就沒了，重要請求請自行備份；報告 JSON 則要 commit。
- **刪除是兩段式**：列上的垃圾桶按第一下變「確認刪除」（3 秒後自動復原），再按才真的刪。刪請求會連同其報告一起刪。
- **靜態 build（`storybook build`）是唯讀模式**：表單變成「下載請求檔」（要手動放進 requests 目錄）、報告唯讀、不能覆核與刪除。完整功能要在 dev server 上用。

---

## 3. 使用 Component Timeline

頁面內容：統計卡（元件數／建立日期數／最近新增）→ 依日期分組的元件卡片（最新在前，每張內嵌該元件的 live story、commit 訊息與「Open story」連結；storyTitle 解析不到 story 時該卡退化為純 metadata 卡片、不含預覽與連結）→ 分頁以**完整日期群組**打包：每頁預算 36 個元件，日期永不跨頁，所以每個日期標頭的數量就是該日實際新增的全量；單一日期超過 36 個元件時自成一頁（藉此控制同時掛載的 iframe 數量）。

### 日常維運只有一件事

**新增元件（並 commit）之後跑一次：**

```bash
npm run build:component-timeline
```

資料檔 `src/storybook/componentTimeline.ts` 是生成物——**不要手改**。`npm run check:component-timeline`（已在 `npm run check` 裡）會在資料過期時失敗並提示重建。

幾個行為細節：

- 日期取自每個 catalog entry 的 `componentPath` **首次進入 git 的 commit**（日期／短 hash／commit 訊息）。
- catalog 裡有、但還沒 commit 的元件不會失敗，會列在生成檔開頭的 untracked 註解裡，commit 後重建即可。
- timeline 只認元件目錄：元件要先登錄 `componentCatalog.ts` 才會出現在頁面上。

### 掛上專案自己的統計面板（選用）

頁面預留了一個擴充點 `src/storybook/component-timeline/timelineExtrasRegistry.tsx`（adaptable，專案可改）。預設回傳 `null`（不渲染任何額外區塊）；要加料時改成回傳 ReactNode，會渲染在時間軸列表上方：

```tsx
import type { ReactNode } from "react";
import { MyPipelinePanel } from "../../components/my-pipeline-panel";

export function getTimelineExtras(): ReactNode {
  return <MyPipelinePanel />;
}
```

規則：保持 `getTimelineExtras` 的名稱與簽名；內容要是確定性、無副作用的（直接 import 專案模組，不要同步抓遠端資料）。頁面本體 `ComponentTimeline.tsx` 是 verbatim 檔案，不要直接改它。

---

## 4. 檢查腳本失敗時怎麼辦

| 失敗的檢查 | 通常代表 | 處理方式 |
| --- | --- | --- |
| `check:component-catalog` | 目錄與現實脫節：路徑不存在、storyTitle 沒出處、id 格式錯 | 修正 `componentCatalog.ts` 該筆 entry（或補上缺的元件／story 檔） |
| `check:coverage-reports` | 報告 JSON 不符契約 | 依錯誤訊息修報告欄位，或請 agent 重跑分析重生報告 |
| `check:coverage-agent-skills` | skill 副本被改過或雜湊不符 | 不要手修個別副本——重跑安裝器的更新流程讓所有副本重新同步 |
| `check:coverage-preview` | 工具 UI 源碼被改掉了契約功能 | 還原被改的 `src/storybook/component-coverage/` 檔案（從 template 重新同步），不要弱化檢查 |
| `check:component-timeline` | timeline 資料過期，或資料裡的 id 已不在目錄 | 跑 `npm run build:component-timeline` 重建 |

共同原則：**template 檔案是 vendored 的**，除了各工具「Permitted adaptations」列出的檔案外不要改；要修就往上游（cm-skills 的 template）修。

---

## 5. 更新既有安裝

template 改版後，在目標專案對 agent 說：

```text
Use $storybook-tools to update the installed Storybook tools to the latest template.
```

agent 會讀 `outputs/storybook-tools/TEMPLATE_MANIFEST.json` 比對版本，只更新**已安裝**的工具（`installedTools` 紀錄），並提示還沒裝的工具可以補裝。你本機的客製（catalog、兩個 registry、CSS 綁定的 token）都會被保留；被動到的 template 檔如有本機修改，agent 會先給你看 diff 再覆蓋。

**從 0.9.x（只有 coverage 的舊版）升級**：舊安裝的 manifest 副本在 `outputs/component-coverage/TEMPLATE_MANIFEST.json`。更新流程會自動辨識、視為「已裝 coverage、未裝 timeline」，升級後把新 manifest 寫到 `outputs/storybook-tools/` 並移除舊副本。Coverage 的資料目錄與 API 路徑**都不會動**，既有報告完全不受影響。

---

## 6. 可以客製什麼（Permitted adaptations）

安裝後專案「可以改」的檔案只有這些，其他 template 檔案一律不要動：

| 檔案 | 可以改什麼 |
| --- | --- |
| `*.stories.tsx`（兩個工具頁入口） | `Meta`/`StoryObj` 的 import 來源改成專案用的模組 |
| `component-coverage.css` / `component-timeline.css` | 三個綁定點：accent 色 token（`--cca-accent`／`--ctl-accent`）、預覽底色 token（`--cca-preview-bg`／`--ctl-preview-bg`）、light theme 選擇器 |
| `compositionPreviewRegistry.tsx` | 登錄可安全渲染的元件 fixture（Coverage 組裝預覽用） |
| `timelineExtrasRegistry.tsx` | Timeline 頁的專案擴充面板（見第 3 節） |

另外 `componentCatalog.ts` 不屬於 template——它是安裝時**生成後就歸專案所有**的檔案，自由維護（新元件記得登錄），更新流程永遠不會動它。

---

## 7. 給安裝器維護者：template 結構與新增工具

skill 本體在 cm-skills repo 的 `storybook-tools/`：

```
SKILL.md                        ← agent 的安裝／更新流程（人不需要照著做，交給 agent）
references/catalog-authoring.md ← catalog 撰寫規則
template/
  TEMPLATE_MANIFEST.json        ← 檔案契約：sharedCore ＋ tools map（每工具一個 entry）
  src/ scripts/ skills/         ← 會被複製進目標專案的內容
```

`TEMPLATE_MANIFEST.json`（0.10.0 起）的結構是理解一切的起點：

- **`sharedCore`** — 所有工具共用：catalog 契約（`componentCatalog.template.ts`）與 catalog 檢查腳本。
- **`tools.<tool-id>`** — 每個工具自帶 `files`（`verbatim`＝逐字複製／`adaptable`＝專案可改／`generated`＝目標端生成）、`installTargets`（skills 的多目的地對映）、`checks`（要掛進 `npm run check` 的腳本）、`pathContracts`（執行期路徑常數）。
- 版本號描述整套 template；安裝端副本多一個 `installedTools` 陣列記錄裝了哪些工具。

**要新增第三個工具時**：在 `tools` 加一個 entry、把檔案放進 `template/`（UI 放 `src/storybook/<tool-id>/`、腳本放 `scripts/`、story 入口放 `src/stories/tools/`）、在 `SKILL.md` 加上該工具的前置檢查／安裝段落／Verify 項目，並且讓工具頁 self-contained：文案內建、不依賴目標專案的共用模組、專案擴充一律走 adaptable 的 registry 檔（參考兩個既有 registry 的 accessor 模式）。改動任何 `template/skills/` 內容時要重算 manifest 的 `skillContentSha256`（CRLF 正規化成 LF 後做 SHA-256）。

規格與歷史：`component-coverage-review` spec 在 cm-skills 的 `openspec/specs/`；`storybook-tools-installer` 與 `component-timeline-tool` 兩個 spec 目前在 change `generalize-to-storybook-tools-install` 目錄下（歸檔後會併入 `openspec/specs/`），改名與模組化的完整決策記錄在同一個 change 的 design.md。

---

## FAQ

**Q：一定要用 AI agent 才能安裝嗎？**
是。安裝的核心步驟（讀專案元件生成 catalog、判斷 stories 佈局、接 main.ts）需要理解目標專案，`SKILL.md` 就是寫給 agent 的作業程序。Cursor、Claude Code、Codex 都支援。

**Q：只裝 timeline、不想要 coverage 的 dev API 和 outputs 目錄，可以嗎？**
可以，安裝時點名 component timeline 即可——只會複製 sharedCore（catalog 契約＋檢查）和 timeline 的檔案，不會碰 vite plugin、`outputs/component-coverage/` 與配套 skills（安裝紀錄的 manifest 副本仍會寫到 `outputs/storybook-tools/`）。而且 timeline 不依賴 Vite builder，Webpack builder 的 React Storybook 也能只裝 timeline。

**Q：Coverage 報告確認後還能改嗎？**
能。確認後的報告在 UI 內是唯讀的，按「還原為草稿」即可重新覆核、改完再確認一次。繞過 UI 的寫入會靜默打回 draft（見第 2 節「要注意的行為」）。

**Q：Timeline 上某個元件不見了？**
依序檢查：它有登錄 `componentCatalog.ts` 嗎？它的 `componentPath` commit 了嗎（untracked 會列在生成檔註解）？跑過 `npm run build:component-timeline` 了嗎？

**Q：CI 上 timeline 檢查一直失敗，本機卻正常？**
八成是 CI 用 shallow clone。fetch 完整歷史（`fetch-depth: 0`）或在該環境跳過 `check:component-timeline`。
