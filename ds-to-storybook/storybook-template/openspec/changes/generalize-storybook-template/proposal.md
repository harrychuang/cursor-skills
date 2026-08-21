## Why

目前 Storybook 專案已具備 design-system-to-storybook、Figma export review、Prototype UI Flow 與治理檢查能力，但 template core 仍硬綁 ChipK 專案內容、cm token/class prefix、特定 Figma URL 與 inventory prototype。這會讓每個新專案都從刪除與改名開始，無法穩定作為通用 template。

## What Changes

- 新增 project initialization 能力，讓新專案可透過初始化腳本自動產生專案名稱、token prefix、class prefix、review endpoint、Figma source fallback 與 Storybook sorting 設定。
- 將 Storybook core 設定、token inheritance check、Figma export config、prototype inspector storage/schema 從 cm/ChipK 硬編碼改為 project config 或中性預設。
- 讓本地 Figma importer plugin 從 Storybook Figma export addon 產生 importer 程式碼，避免 plugin 與 addon exporter schema 分岔，並保持跨專案通用。
- 將 Prototype UI Flow 定義為 template 的一級能力，所有專案都能透過 parameters.prototype 使用 Story、Docs、UI Flow、Data 四個 review mode。
- 保留一個中性 example prototype，作為 Prototype UI Flow、docs/data metadata、static flow export 與 checks 的可驗證樣本。
- 將 ChipK domain-specific 元件、頁面、prototype、tokens、design-system docs 與 Figma node mappings 移出 template default surface；可執行的 legacy component/page/prototype source 不保留在 template `src/` 中。
- 更新 README 與 design-system guidance，說明如何初始化 template、如何新增 component、如何新增 prototype、如何驗證 prefix-agnostic checks。

## Capabilities

### New Capabilities

- `storybook-template-initialization`: Defines generated project config, prefix-agnostic template setup, and initialization behavior for new Storybook design-system projects.
- `prototype-ui-flow`: Defines reusable Prototype UI Flow metadata, review modes, layout persistence, static flow export, and the required neutral example prototype contract.

### Modified Capabilities

(none)

## Impact

- Affected specs: storybook-template-initialization, prototype-ui-flow
- Affected code:
  - New: scripts/init-storybook-template.mjs
  - New: scripts/build-figma-plugin.mjs
  - New: .storybook/project.config.ts
  - New: src/pages/prototypes/example-prototype/ExamplePrototype.tsx
  - New: src/pages/prototypes/example-prototype/ExamplePrototype.stories.tsx
  - New: src/pages/prototypes/example-prototype/ExamplePrototypeFlowExport.tsx
  - New: src/pages/prototypes/example-prototype/ExamplePrototypeFlowExport.stories.tsx
  - New: src/pages/prototypes/example-prototype/examplePrototypeFlow.ts
  - New: src/pages/prototypes/example-prototype/examplePrototypeData.ts
  - New: src/pages/prototypes/example-prototype/examplePrototypeMeta.ts
  - New: src/pages/prototypes/example-prototype/example-prototype.css
  - New: src/pages/prototypes/example-prototype/docs/PRD.md
  - New: src/pages/prototypes/example-prototype/docs/UI_SPEC.md
  - New: src/pages/prototypes/example-prototype/docs/FLOW_SPEC.md
  - New: src/pages/prototypes/example-prototype/docs/DATA_SPEC.md
  - New: src/pages/prototypes/example-prototype/docs/ACCEPTANCE.md
  - New: src/pages/prototypes/example-prototype/docs/IMPLEMENTATION_GUIDE.md
  - Modified: package.json
  - Modified: .storybook/main.ts
  - Modified: .storybook/preview.ts
  - Modified: .storybook/figma-export.config.ts
  - Modified: .storybook/vendor/figma-export-addon/package.json
  - Modified: .storybook/vendor/figma-export-addon/src/pluginCode.ts
  - Modified: .storybook/vendor/figma-export-addon/src/index.ts
  - Modified: .storybook/vendor/figma-export-addon/tsup.config.ts
  - Modified: figma/storybook-code-to-design/main.js
  - Modified: figma/storybook-code-to-design/README.md
  - Modified: .storybook/prototype-inspector/preset.js
  - Modified: .storybook/prototype-inspector/preview.js
  - Modified: .storybook/prototype-inspector/prototype-inspector.css
  - Modified: scripts/check-token-inheritance.mjs
  - Modified: scripts/check-storybook-catalog.mjs
  - Modified: src/storybook/componentCatalog.ts
  - Modified: src/stories/governance/ComponentCatalog.tsx
  - Modified: src/stories/_shared/copy.ts
  - Modified: src/pages/prototypes/README.md
  - Modified: design-system/STORYBOOK_ARCHITECTURE.md
  - Modified: design-system/TOKEN_ARCHITECTURE.md
  - Modified: design-system/FIGMA_EXPORT_TOOLING.md
  - Modified: tokens/tokens-ref.css
  - Modified: tokens/tokens-sys.css
  - Modified: tokens/tokens-comp.css
  - Modified: tokens/tokens.css
  - Removed: legacy component source under src/components except src/components/example-card
  - Removed: src/pages/inventory-realtime-quote-page
  - Removed: src/pages/prototypes/inventory-prototype
