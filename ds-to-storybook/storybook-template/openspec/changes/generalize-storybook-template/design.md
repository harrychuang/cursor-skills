## Context

目前專案已經把 Storybook 當成 design-system verification surface：.storybook/main.ts 設定 stories、addons、staticDirs 與 review middleware；.storybook/preview.ts 匯入 tokens、Storybook CSS、Figma export decorator 與 background globals；scripts/check-token-inheritance.mjs 驗證 ref -> sys -> comp token inheritance；scripts/check-storybook-catalog.mjs 驗證 component catalog 與 component stories 對齊；.storybook/prototype-inspector 提供 Story、Docs、UI Flow、Data 四個 prototype review mode。

問題是這些能力目前混入 ChipK 專案識別與 sample domain：package name、cm token/class prefix、ChipK Figma URL、review API path、prototype inspector schema name、inventory-prototype iframe selector，以及股票/庫存相關 story sort、catalog、tokens、docs。通用 template 必須保留工作流能力，但 template core 不能預設任何特定專案 prefix 或 domain。

## Goals / Non-Goals

**Goals:**

- 讓新專案透過初始化命令產生 project config，包含 project name、token prefix、class prefix、review endpoint、Figma fallback source、Storybook sorting 與 starter token/content 設定。
- 讓 Storybook runtime、Figma export、token checks、catalog checks 與 Prototype UI Flow 讀取 project config 或使用中性名稱，不再寫死 cm、ChipK 或 inventory-prototype。
- 讓本地 Figma importer plugin 使用 Storybook Figma export addon 生成的 importer code，維持 payload schema、token/component import 行為與 addon 同步。
- 將 Prototype UI Flow 保留為 template core feature，讓不同專案只要提供 parameters.prototype metadata 就能使用 Story、Docs、UI Flow、Data review mode。
- 保留一個中性 example prototype，作為 metadata contract、iframe preview、layout import/export、static flow export 與 verification 的可執行樣本。
- 將 ChipK domain-specific material 與目前完整元件庫移出 template default surface，並移除 `src/` 中不屬於 starter template 的 legacy component/page/prototype source。

**Non-Goals:**

- 不建立跨框架 template；本 change 維持 React + Vite + Storybook 架構。
- 不重寫 Figma export addon 的 generic engine；只調整專案 config 與 template wiring。
- 不把初始化做成全 repo 任意字串替換工具；初始化產生設定與 starter content，既有 project-specific content 的搬遷由明確檔案操作處理。
- 不在此 change 完整重建 ChipK design system；ChipK 可執行 source 需要從 template source 移除，歷史設計文件可等後續 archive/reference cleanup 處理。
- 不要求新專案使用 cm prefix；prefix 必須由 project config 或初始化命令明確提供。

## Decisions

### Use a generated project config as the template boundary

新增 .storybook/project.config.ts 作為 template core 和專案設定的 seam。它匯出 typed config，至少包含 projectName、packageName、tokenPrefix、componentClassPrefixes、review api path/status file/plugin name、Figma source fallback、source node overrides、absolute fidelity components、story title prefixes、story sort order，以及 prototype inspector 的 generic naming options。

理由：目前 prefix、Figma source、review endpoint 與 story sort 分散在 package.json、.storybook/preview.ts、.storybook/figma-export.config.ts、scripts 和 prototype inspector。集中 config 可以讓每個 project 產生自己的設定，而 template core 只讀設定。

替代方案是保留 cm 並要求使用者搜尋替換。這會讓 template 使用者承擔高風險 rename，且容易漏掉 scripts/check-token-inheritance.mjs 和 prototype inspector 這類非 UI 檔案。

### Initialize by generation, not repository-wide replacement

新增 scripts/init-storybook-template.mjs，命令介面為 npm run init-template -- --name <project-name> --prefix <token-prefix>，並支援可選 --package-name、--figma-url、--keep-example。prefix 驗證規則為 lowercase ASCII 字母開頭，只允許 lowercase letters、digits、single hyphen，且不可有 leading、trailing、consecutive hyphen。

初始化腳本負責建立或更新 .storybook/project.config.ts、starter token files、package name、README guidance 和必要 sample metadata。它不得用全 repo blind replacement 取代 cm，因為 project-specific sample/reference 內容可能刻意保留原始 prefix 作為來源證據。

### Make token and catalog checks config-driven

scripts/check-token-inheritance.mjs 讀取 project config 的 tokenPrefix 後，驗證 tokens/tokens-ref.css、tokens/tokens-sys.css、tokens/tokens-comp.css 的 declared layer 與 var reference layer。它的錯誤訊息必須回報實際 token name、檔案與 expected layer。

scripts/check-storybook-catalog.mjs 保留 component story coverage 檢查，但 catalog seed、category order、story title prefix 不應該硬綁 ChipK category。實作可以先保持 src/storybook/componentCatalog.ts 作為 data module，但 template default catalog 必須只包含中性 example component 或 empty-safe starter state。

### Keep Prototype UI Flow independent from project prefix and domain

.prototype inspector 的資料 contract 是 parameters.prototype，不是 token prefix、component id 或 route label。preview.js 應移除 chipk.prototype-flow-layout schema name、@chipk addon name、inventory-prototype selector 與 cm-specific behavior assumptions。iframe height measurement 必須先找 route preview opt-in selector，例如 [data-prototype-route-preview="true"]，再 fallback 到 Storybook root/body measurement。

CSS 可以繼續使用 design-system semantic custom properties，但不能在 JS 行為上依賴 cm。若 CSS 仍需要 project token values，應透過 template semantic adapter 或 project config 產生的 token names 供應，而不是在 prototype flow behavior 中解析固定 --cm-* token。

### Use a neutral example prototype as a contract test

建立 src/pages/prototypes/example-prototype，使用 Project Intake 或 Task Review 這類中性流程。它必須包含 interactive story、static flow export story、typed flow metadata、typed fixture data、meta object、scoped CSS，以及 PRD、UI Spec、Flow Spec、Data Spec、Acceptance、Implementation Guide 六份 docs。

這個 example 不是產品 demo，而是驗證 template core：Story mode 渲染互動 UI；Docs mode 顯示 markdown；UI Flow mode 從 flow.routes、flow.nodes、flow.transitions 產生可拖曳 canvas；Data mode 顯示 APIs、sources、schemas、route data map 與 fixtures；Open Static Flow 可開啟 sibling story 供 Figma export review。

### Remove legacy component source from the template surface

ChipK tokens、component docs、inventory prototype、domain-specific catalog entries 和 Figma node overrides 不應在新專案初始化後成為 default stories。可執行 source 的邊界更嚴格：`src/components` 只保留 neutral starter component `example-card`，`src/pages` 只保留 neutral prototype infrastructure/example，不保留 inventory page 或 inventory prototype。歷史 markdown/reference material 可以留在 `design-system/` 供後續 archive cleanup，但 template build、typecheck、Storybook config 和 catalog check 不能依賴任何已移除的 legacy component source。

### Generate the Figma importer plugin from the addon

`figma/storybook-code-to-design/main.js` 不應維護一份手寫 importer copy，因為 Storybook addon 的 export payload schema、component metadata、variable binding 行為會隨 addon 演進。Vendored addon 需要提供無 React/Storybook manager 依賴的 `plugin-code` subpath，輸出 `createFigmaImporterPluginMainCode()`；template script `scripts/build-figma-plugin.mjs` 用這個 API 產生 Figma plugin main runtime。`npm run check:figma-plugin` 比對 checked-in `main.js` 與 addon generator output，並納入 `npm run check`，確保不同專案使用 template 時 importer 和 exporter 不會分岔。

## Implementation Contract

**Initialization behavior:**

- Command name: npm run init-template -- --name <project-name> --prefix <token-prefix>.
- Required input: project name and token prefix.
- Optional input: package name, Figma design URL, keep-example flag.
- Generated config shape: .storybook/project.config.ts exports a typed config object with project metadata, token settings, Figma export/review settings, Storybook ordering, and prototype inspector settings.
- Failure mode: invalid prefix exits non-zero and prints the accepted prefix rule; missing required arguments exits non-zero and prints usage. Existing non-template project config is not overwritten unless the command receives an explicit force flag.
- Acceptance: after running init with prefix acme, generated token variables use --acme-ref-*, --acme-sys-*, and --acme-comp-*; Storybook config reads acme component class prefixes; token checks validate acme tokens without any cm fallback requirement.

**Prefix-agnostic Storybook behavior:**

- .storybook/main.ts reads review middleware settings from project config.
- .storybook/preview.ts reads background tokens, Figma export options, source node overrides, and storySort from project config.
- .storybook/figma-export.config.ts either becomes a thin compatibility wrapper around project config or is removed from direct ownership of project-specific values.
- The local Figma importer plugin main code is generated from the vendored Storybook Figma export addon through a DOM-free `plugin-code` subpath and does not contain project-specific token prefixes, class prefixes, component ids, or domain assumptions.
- No template core file may require cm, ChipK, or inventory-prototype strings for runtime behavior.
- Acceptance: searching template core files for cm-, --cm, chipk, ChipK, and inventory-prototype finds only archived/sample/reference content or explicit documentation explaining legacy sample migration.

**Prototype UI Flow behavior:**

- Any story with parameters.prototype can switch between Story, Docs, UI Flow, and Data modes.
- Story mode renders the original story without wrapping behavior changes.
- Docs mode renders available docs from parameters.prototype.docs using the existing markdown subset.
- UI Flow mode renders routes from parameters.prototype.flow.routes, optional flow-only nodes from parameters.prototype.flow.nodes, and visible edges from transitions where flowLine equals key.
- UI Flow layout persistence uses a generic schema name and prototype id; exported JSON includes schema, version, prototypeId, exportedAt, and positions.
- Data mode renders overview, API contracts, data sources, schemas, route data requirements, state rules, fixtures, and raw payload from parameters.prototype.data.
- Static Flow export is available when prototype metadata provides a flow export story id; the control opens the sibling Storybook story with Figma export enabled.
- Static Flow export uses the same generic layout storage key, normalized position payload, route/node metadata, and route preview width/height contract as UI Flow, so dragged UI Flow positions and static export positions stay aligned.
- Static Flow export uses the same canvas background, route card chrome, flow-only node shape rules, dashed edge style, edge color variants, arrowheads, and label pill conventions as UI Flow mode, so the Figma export is visually equivalent to the reviewed UI Flow surface.
- Acceptance: the neutral example prototype demonstrates all four modes, layout export/import, route iframe preview width/height measurement without inventory-prototype selectors, saved layout synchronization into Static Flow, and static flow export.

**Scope boundaries:**

- In scope: template config, initialization script, Storybook wiring, checks, prototype inspector genericization, neutral example prototype, documentation updates, default-surface separation from ChipK content, removal of legacy executable component/page/prototype source from `src/`, and generation/checking of the local Figma importer plugin from the vendored addon.
- Out of scope: upstreaming addon patches, changing the public Figma export payload schema beyond project config wiring, adding non-React framework support, and fully rewriting existing ChipK components.

## Risks / Trade-offs

- [Risk] Removing ChipK executable source could leave dangling imports in non-loaded pages because TypeScript compiles all `src/**/*.ts(x)`. → Mitigation: remove the dependent inventory page/prototype source together with legacy components, then run typecheck, Storybook build, checks, and targeted searches for legacy component imports.
- [Risk] Importing the root addon package in a Node plugin build script can execute Storybook manager code that expects `document`. → Mitigation: expose a dedicated `@harrychuang/storybook-addon-figma-export/plugin-code` subpath that only contains string generators and no React, Storybook, or browser globals.
- [Risk] Figma's plugin parser can reject newer JavaScript syntax such as optional chaining, nullish coalescing, and optional catch binding even when local Node checks pass. → Mitigation: the addon-generated importer avoids those operators in emitted runtime code, and `scripts/build-figma-plugin.mjs --check` fails if generated `main.js` contains unsupported syntax.
- [Risk] Config-driven token prefix support can become too dynamic for TypeScript and scripts. → Mitigation: keep the config shape explicit and import it from Node-compatible scripts through a small loader, avoiding runtime eval of arbitrary project code.
- [Risk] Prototype inspector CSS still references current semantic tokens. → Mitigation: separate behavior from token names first, then provide a minimal starter token set that satisfies inspector/foundation UI semantics for any generated prefix.
- [Risk] Static Flow export duplicates routing and layout logic from UI Flow. → Mitigation: keep flow metadata as the source of truth and make both interactive UI Flow and static export read the same examplePrototypeFlow data plus a shared generic layout storage helper.
- [Risk] A single change touches many files. → Mitigation: implement in ordered slices: config/init, checks, Storybook wiring, prototype inspector, example prototype, docs, then verification.

## Migration Plan

1. Create project config and initialization script while preserving current behavior through temporary compatibility values.
2. Convert checks and Storybook config to read project config, then verify current project still builds.
3. Genericize prototype inspector names, storage schema, route measurement, and mode behavior.
4. Add the neutral example prototype and static flow export story.
5. Remove legacy ChipK executable component/page/prototype source from `src/`, keep only neutral starter component and example prototype source, and update docs to describe the starter template boundary.
6. Generate and verify the local Figma importer plugin from the vendored Storybook Figma export addon.
7. Run npm run check and npm run storybook:build.
8. Rollback by restoring previous .storybook config and scripts if initialization or Storybook loading fails before ChipK separation is committed.

## Open Questions

- The initial implementation must choose whether ChipK reference content moves physically to examples/chipk-reference or remains in place but excluded from default story loading. The safer first implementation is exclusion from default surface, followed by physical relocation in a later focused change if needed.
