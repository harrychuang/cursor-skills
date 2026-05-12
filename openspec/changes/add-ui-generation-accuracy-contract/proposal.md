## Why

目前 workspace 已經具備 screenshot/Figma -> design system -> Storybook -> product screen 的主流程，但對「能否精準生成產品界面」的承諾仍不夠明確。尤其只有圖片時，agent 會缺少 Figma 的結構、變數、元件、狀態與互動資料；如果沒有精準度分級與驗收門檻，PM 或設計師容易把單張圖片誤解成完整規格。

## What Changes

- 新增 UI generation accuracy contract，明確區分 Figma-first、multi-screenshot、single-image 三種輸入的可達精度與風險。
- 補上 image-only intake 規則，要求在只有圖片時記錄信心等級、推論項、缺失資訊與必要回問。
- 擴充 workflow，讓 visual parity 變成可重複收斂的驗收迴圈，而不是最後才人工看一眼。
- 更新 starter/template 文件，讓設計師與 PM 知道要補哪些最小資料才能提高生成品質。

## Capabilities

### New Capabilities

- `ui-generation-accuracy`: 定義從圖片或 Figma 設計稿自動生成產品界面時的精準度分級、輸入需求、驗收門檻與降級策略。

### Modified Capabilities

(none)

## Impact

- Affected specs: `ui-generation-accuracy`
- Affected code:
  - Modified:
    - `design-workspace-starter/README.md`
    - `design-workspace-starter/CLAUDE.md`
    - `design-workspace-starter/AGENTS.md`
    - `design-workspace-starter/start-here/BUILD_PLAN.md`
    - `design-workspace-starter/start-here/TASKS.md`
    - `design-workspace-starter/start-here/KICKSTART.md`
    - `design-workspace-starter/skills/ui-screenshot-to-storybook-product/SKILL.md`
    - `design-workspace-starter/product/PRD.md`
    - `design-workspace-starter/product/templates/PRD_TEMPLATE.md`
    - `design-workspace-starter/product/docs/product-change-workflow.md`
    - `create-design-workspace/assets/template/README.md`
    - `create-design-workspace/assets/template/CLAUDE.md`
    - `create-design-workspace/assets/template/AGENTS.md`
    - `create-design-workspace/assets/template/start-here/BUILD_PLAN.md`
    - `create-design-workspace/assets/template/start-here/TASKS.md`
    - `create-design-workspace/assets/template/start-here/KICKSTART.md`
    - `create-design-workspace/assets/template/skills/ui-screenshot-to-storybook-product/SKILL.md`
    - `create-design-workspace/assets/template/product/PRD.md`
    - `create-design-workspace/assets/template/product/templates/PRD_TEMPLATE.md`
    - `create-design-workspace/assets/template/product/docs/product-change-workflow.md`
  - New:
    - `design-workspace-starter/start-here/ACCURACY_CONTRACT.md`
    - `create-design-workspace/assets/template/start-here/ACCURACY_CONTRACT.md`
  - Removed:
    - (none)
