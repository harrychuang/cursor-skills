## Context

`design-workspace-starter` 與 `create-design-workspace/assets/template` 共同構成這個技能的手工 starter 與 bootstrap 輸出來源。兩者目前都提供 foundations markdown 與 Storybook MDX 模板，但內容主要停留在「這裡之後要填內容」的層級，沒有把文件網站 IA、component docs sections、與 usage 規範當成顯式工作成果。

這個缺口會直接影響兩件事：

1. Agent workflow 不會主動先做 docs IA，就容易直接跳到 component stories。
2. 使用者即使有 token，也缺少能直接展示在 Storybook 的 usage-oriented foundation pages。

## Goals / Non-Goals

**Goals:**

- 讓 starter 流程在 shared component work 前，明確要求先規劃設計系統文件網站 IA。
- 提供一個可直接放進 Storybook 的 `Foundations/Guides` 頁面，說明導航結構與 component docs page sections。
- 把 `Color`、`Typography`、`Spacing` foundations 模板升級為以 usage 為核心的前端頁面。
- 確保 repo 內 starter/template 靜態檔與 `scripts/lib/workspace.js` 生成內容同步。

**Non-Goals:**

- 不新增真正的 component stories 或產品畫面。
- 不引入新的 Storybook addon、runtime dependency、或 CSS build pipeline。
- 不為每一個 component 類別建立獨立 docs page；這次只定義 docs system contract 與 foundations examples。

## Decisions

### Decision: Add a dedicated Storybook guides page

文件 IA 與 component page contract 不適合只藏在 README 或 overview copy 裡。會新增 `design/foundations/storybook-docs/guides.mdx`，以 Storybook 頁面形式顯示 M3-style docs map、主要導航分組，以及 component docs section 標配順序。

替代方案是把這些內容塞進 `overview.mdx`，但那會讓 overview 同時承擔入口頁與規範頁兩種責任，導致資訊過密，也不利於後續延伸更多 guides。

### Decision: Make foundations usage-first rather than token-first

`color.mdx`、`typography.mdx`、`spacing.mdx` 與對應 markdown 會優先回答「什麼時候用」而不是只展示「有哪些 token」。這符合設計系統文件的真實使用情境，也比較接近 Material Design 中 foundations 對 usage / guidance 的定位。

替代方案是維持目前的 token-summary 形式，另外把 usage 寫在長段落裡；這樣可讀性差，也不利於 agent 直接把規格轉成 docs page。

### Decision: Keep starter files and generated scaffold output in sync

`design-workspace-starter` 是直接可讀模板，`create-design-workspace/assets/template` 是 bootstrap 來源，而 `scripts/lib/workspace.js` 也會在缺檔時生成 foundation guides。三個來源都要同步更新相同的 IA 與 docs contract，否則使用者從不同入口得到的輸出會漂移。

替代方案是只修改 starter/template 靜態檔，不更新 `workspace.js`；這會讓重新生成的 workspace 回退成舊模板，因此不可接受。

## Implementation Contract

此變更完成後，使用者在 Storybook Foundations docs 中 SHALL 能看到一套明確的文件網站規範，而不是只有 placeholder foundations 卡片：

- `Foundations/Guides` 頁 SHALL 說明至少三層導覽：`Foundations`、`Styles`、`Components`，並補充可選的 `Patterns` / `Templates` / `Resources` 區塊。
- `Foundations/Guides` 頁 SHALL 定義 component docs page 的標配區段，至少包含 `Overview`、`Anatomy`、`States`、`Usage`、`Tokens`，並說明每段的目的。
- `Foundations/Overview` 頁 SHALL 成為 docs front door，摘要文件網站 IA、foundation 範圍、token layering、與進入 component docs 前的閱讀順序。
- `Foundations/Color` 頁 SHALL 以語意角色解釋何時使用 `Primary`、`Primary Container`、`Surface`、`Surface Variant`、`Error`、`Subtle/Muted` 等角色，而不只是列 token 名稱。
- `Foundations/Typography` 頁 SHALL 定義至少 `Display` / `H1-H3` / `Body` / `Label` / `Caption or Meta` 的使用情境與 hierarchy rule。
- `Foundations/Spacing` 頁 SHALL 定義 spacing scale 的 band 邏輯與使用情境，例如 inline gap、control padding、section gap、page gutter。
- `design/foundations/*.md`、`start-here/*.md`、與 `scripts/lib/workspace.js` 生成內容 SHALL 使用相同的文件流程語言，明確要求先做 docs IA，再做 component docs。
- `getRequiredFoundationPaths()` 與 `getFoundationGuideEntries()` SHALL 包含新的 `guides.mdx`，確保 bootstrap 與 workspace check 都能識別該文件。

驗證方式：

- `node --test tests/*.test.mjs` 通過，包含 foundation guide entries 與 required paths 的檢查。
- `npm run workspace:check` 在現有測試前提下不因缺少 foundation docs template 而失敗。
- 人工檢查 `design/foundations/storybook-docs/*.mdx`，確認 `guides.mdx` 與三個 foundation 頁面已具備可展示的 IA / usage copy，而非 placeholder-only 文案。

範圍邊界：

- 本次不要求把 Storybook 實際跑起來。
- 本次不要求把 docs 實作成 data-driven React components；MDX 靜態模板即可。
- 本次不處理 `corner.mdx` 與 `design-token-usage.mdx` 的結構性重寫，只保留與新的 docs IA 一致即可。

## Risks / Trade-offs

- [Risk] MDX 內容變長，後續維護成本上升。 → Mitigation: 把流程 contract 寫進 `start-here` 與 markdown foundations，讓內容有明確來源，不靠人工回想。
- [Risk] starter/template/workspace generator 三處同步更新容易漏掉其中一處。 → Mitigation: 同步修改靜態檔與 `workspace.js`，並以測試覆蓋 required paths / generated entries。
- [Risk] 將 `Styles` 納入 IA 可能與某些產品最終導覽不同。 → Mitigation: 在 guides 中將其描述為預設 docs map，可依專案增刪，但需保留 foundations 與 component page contract。
