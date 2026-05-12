## Why

目前的 design workspace starter 已經有 `design/foundations/*.md` 與 Storybook MDX 模板，但內容仍偏向占位與 token 清單，沒有把「文件網站規劃」本身當成 Foundation 階段的一部分。這會讓使用者知道要建 Foundation，卻不知道要先定義文件 IA、元件頁標配區段，以及 color / typography / spacing 的 usage 規則。

## What Changes

- 新增一套以 Storybook Foundations 為入口的文件網站規範，先定義文件 IA 與 component docs section contract，再進入元件細節。
- 擴充 foundations markdown 與 Storybook MDX 範本，讓 Color、Typography、Spacing 頁面直接示範 usage-first 的寫法，而不是只有 placeholder 文案。
- 更新 workspace 啟動流程與任務清單，要求在 shared component work 前先完成 docs IA 與 foundation usage guides。
- 讓 generator 輸出的 starter 檔案與 repo 內現有 starter/template 保持同步，避免 bootstrap 出來的內容和手工維護版本不一致。

## Capabilities

### New Capabilities

- `foundation-guides`: 以 Storybook 為前端載體，提供設計系統文件網站 IA、元件頁標配區段，以及 foundations usage guides 的建立規範與範本。

### Modified Capabilities

(none)

## Impact

- Affected specs: `foundation-guides`
- Affected code:
  - Modified:
    - `design-workspace-starter/design/foundations/README.md`
    - `design-workspace-starter/design/foundations/color.md`
    - `design-workspace-starter/design/foundations/typography.md`
    - `design-workspace-starter/design/foundations/spacing.md`
    - `design-workspace-starter/design/foundations/storybook-docs/README.md`
    - `design-workspace-starter/design/foundations/storybook-docs/overview.mdx`
    - `design-workspace-starter/design/foundations/storybook-docs/color.mdx`
    - `design-workspace-starter/design/foundations/storybook-docs/typography.mdx`
    - `design-workspace-starter/design/foundations/storybook-docs/spacing.mdx`
    - `design-workspace-starter/start-here/BUILD_PLAN.md`
    - `design-workspace-starter/start-here/TASKS.md`
    - `design-workspace-starter/start-here/KICKSTART.md`
    - `design-workspace-starter/start-here/STORYBOOK_10_AUTODOCS.md`
    - `design-workspace-starter/scripts/lib/workspace.js`
    - `design-workspace-starter/tests/workspace.test.mjs`
    - `create-design-workspace/assets/template/design/foundations/README.md`
    - `create-design-workspace/assets/template/design/foundations/color.md`
    - `create-design-workspace/assets/template/design/foundations/typography.md`
    - `create-design-workspace/assets/template/design/foundations/spacing.md`
    - `create-design-workspace/assets/template/design/foundations/storybook-docs/README.md`
    - `create-design-workspace/assets/template/design/foundations/storybook-docs/overview.mdx`
    - `create-design-workspace/assets/template/design/foundations/storybook-docs/color.mdx`
    - `create-design-workspace/assets/template/design/foundations/storybook-docs/typography.mdx`
    - `create-design-workspace/assets/template/design/foundations/storybook-docs/spacing.mdx`
    - `create-design-workspace/assets/template/start-here/BUILD_PLAN.md`
    - `create-design-workspace/assets/template/start-here/TASKS.md`
    - `create-design-workspace/assets/template/start-here/KICKSTART.md`
    - `create-design-workspace/assets/template/start-here/STORYBOOK_10_AUTODOCS.md`
  - New:
    - `design-workspace-starter/design/foundations/storybook-docs/guides.mdx`
    - `create-design-workspace/assets/template/design/foundations/storybook-docs/guides.mdx`
  - Removed:
    - (none)
