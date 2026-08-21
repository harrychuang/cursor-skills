# Vendored figma-export addon

這是 `@harrychuang/storybook-addon-figma-export`(來源:`github:harrychuang/storybook-addons#main`)的 **vendored 修正版**,
包含原本由 `scripts/patch-figma-export-addon.mjs` + `patch-figma-export-component-import.mjs`
needle-patch 機制累積的所有修補,以及後續直接在此維護的修正(例如 2026-06 的
borderSides 單邊框線 / auto layout 結構修復)。

## 運作方式

`npm install` 的 postinstall(`scripts/patch-figma-export-addon.mjs`)會把這個目錄
**整份覆蓋**到 `node_modules/storybook-addons/packages/figma-export/`,並清除
`node_modules/.cache/storybook`,確保 Storybook 重新 bundle。

## 修改流程

1. 只編輯 canonical source：`design-system-to-storybook/assets/figma-export-addon/`
2. 在 canonical addon 目錄重建 dist：
   ```sh
   cd design-system-to-storybook/assets/figma-export-addon
   npm run build
   ```
3. 將 canonical 的 `src/`、`dist/`、`README.md`、`package.json`、
   `tsconfig.json`、`tsup.config.ts` 同步到兩個 Storybook template mirrors。
4. 跑 `node design-system-to-storybook/scripts/check_figma_export_addon_mirrors.mjs`。
5. 重跑 template install/patch 流程並重啟 Storybook。

## 注意

- 不要直接編輯本目錄或 `node_modules` 內的 addon；兩者都會在同步／postinstall
  時被 canonical source 覆蓋。
- 長期而言建議把這份內容 sync 回 `harrychuang/storybook-addons` repo,
  讓 GitHub main 重新成為單一事實來源,屆時這個 vendor 目錄即可移除。
