# Storybook Implementation Map

## Current Pass

Date: 2026-06-17

Scope: continue the Storybook rollout for extracted components that had design-system docs but no product Storybook implementation.

| Design-system item | Source file | Product target | Decision | Status |
|---|---|---|---|---|
| Component taxonomy | `design-system/COMPONENT_INVENTORY.md` | `src/storybook/componentCatalog.ts` | Create one catalog source for story titles, purpose, useWhen, dependencies, keywords, provenance, and paths | done |
| Component stories | `src/storybook/componentCatalog.ts` | `src/components/*/*.stories.tsx` | Replace flat `Components/<Name>` titles with static `Components/<Category>/<Name>` titles that match the catalog, and inject `parameters.ai` / `parameters.componentCatalog` | done |
| Storybook navigation | `src/storybook/componentCatalog.ts` | `.storybook/preview.ts` | Sort component subcategories in governance order | done |
| Human-readable catalog | `src/storybook/componentCatalog.ts` | `src/stories/governance/ComponentCatalog.tsx` and `.stories.tsx` | Add a governance story for browsing component purpose, role, dependencies, and keywords | done |
| Missing component docs | Product stories and source files | `design-system/components/graphic.md`, `icon.md`, `quote-list-column-header.md` | Backfill implementation-derived specs and mark them needs-review | done |
| Source trace | `design-system/` | `design-system/STORYBOOK_SOURCE_TRACE.md` | Generate trace for available Figma/source references | done |
| Dependency plan | `design-system/COMPONENT_INVENTORY.md` and component specs | `design-system/STORYBOOK_COMPONENT_PLAN.md`, `design-system/STORYBOOK_COMPONENT_QUEUE.md` | Generate dependency-aware plan for future component work | done |
| Button | `design-system/components/button.md`, Figma `1934:94` | `src/components/button/*`, `src/storybook/componentCatalog.ts` | Implement global primary fill/outline primitive; keep sheet/domain action components distinct | done |
| Figma export variant metadata | Button `data-figma-variant` attributes | `vendor/figma-export/src/domExport.ts`, `vendor/figma-export/dist/*` | Prefer `data-figma-variant` for component keys, then fall back to `data-variant`; this keeps Button CSS variants separate from Figma variant keys | done |
| Empty State | `design-system/components/empty-state.md`, Figma `5862:221812` | `src/components/empty-state/*`, `src/storybook/componentCatalog.ts` | Keep as standalone feedback composition; compose optional CTA from Button | done |
| Quarter Line Status Icon | `design-system/components/quarter-line-status-icon.md` | `src/components/quarter-line-status-icon/*`, `src/storybook/componentCatalog.ts` | Keep as asset wrapper over the shared Icon component so quarter-line glyphs stay centrally registered | done |
| MyStock Utility Icon | `design-system/components/mystock-utility-icon.md` | `src/components/mystock-utility-icon/*`, `src/storybook/componentCatalog.ts` | Keep as asset wrapper over shared Icon variants, preserving source variant metadata | done |
| Stock Label | `design-system/components/stock-label.md`, Figma `47327:64981` | `src/components/stock-label/*`, `src/storybook/componentCatalog.ts` | Implement as compact raised stock identity label using `--cm-comp-stock-label-*` tokens | done |
| Global Bubble | `design-system/components/global-bubble.md`, Figma `29503:80044` | `src/components/global-bubble/*`, `src/storybook/componentCatalog.ts` | Implement as standalone contextual callout with directional arrow placements | done |
| Realtime Quote Tile | `design-system/components/realtime-quote-tile.md`, Figma `18095:175915` | `src/components/realtime-quote-tile/*`, `src/storybook/componentCatalog.ts` | Implement quote-grid tile variants and compose existing Graphic weather assets | done |
| Portfolio Add Holding Sheet | `design-system/components/portfolio-add-holding-sheet.md` | `src/components/portfolio-add-holding-sheet/*`, `src/storybook/componentCatalog.ts` | Implement bottom-sheet add-holding form variants with shared Icon chrome and token-backed controls | done |
| Popup Dialog | `design-system/components/popup-dialog.md`, Figma `5906:218640` | `src/components/popup-dialog/*`, `src/storybook/componentCatalog.ts` | Implement compact centered dialog separately from Bottom Sheet and Empty State | done |
| Stock Card | `design-system/components/stock-card.md`, Figma `51036:377157` | `src/components/stock-card/*`, `src/storybook/componentCatalog.ts` | Implement feed/commentary stock card as a standalone market-data component | done |
| Stock Calendar | `design-system/components/stock-calendar.md`, Figma `51054:298722` | `src/components/stock-calendar/*`, `src/storybook/componentCatalog.ts` | Implement market-return calendar as a token-backed data display and compose shared Icon for the info and month chevron glyphs | done |
| Asset Trend Chart | `design-system/components/asset-trend-chart.md`, Figma `51059:51227` | `src/components/asset-trend-chart/*`, `src/storybook/componentCatalog.ts`, `design-system/component-review-status.json` | Implement standalone chart body with token-backed summary rows, code-native SVG orange area-line series, and selected-date cursor; story source URL uses the resolved Figma node | done |
| Trend Analysis Header | `design-system/components/trend-analysis-header.md`, Figma `51059:51226` | `src/components/trend-analysis-header/*`, `src/components/icon/*`, `src/storybook/componentCatalog.ts`, `design-system/component-review-status.json` | Implement titled range-control header with existing Icon dependency; add shared Icon `share` glyph for the observed share action; story source URL uses the resolved Figma node | done |

## Product Conventions

- Framework: React with Storybook 10 and Vite.
- Package manager: npm.
- Component layout: `src/components/<component>/` with co-located source, CSS, exports, and story.
- Foundation/governance layout: `src/stories/foundations/` and `src/stories/governance/`.
- Token import strategy: `.storybook/preview.ts` imports `tokens/tokens.css`.
- Token layers: `--cm-ref-* -> --cm-sys-* -> --cm-comp-*`.
- Figma export addon: configured through `.storybook/figma-export.config.ts` and existing preview decorator.
- Feedback components use `Components/Feedback/<Name>` in Storybook.

## Catalog Contract

Every component story must call:

```ts
title: "Components/<Category>/<Component Name>"
parameters: {
  ...getComponentStoryParameters("<component-id>"),
}
```

Storybook requires the title to remain a string literal. The literal path must match `componentCatalog[component-id].storyTitle`.

The resulting Storybook parameters include:

- `ai.componentId`
- `ai.storybookCategory`
- `ai.compositionRole`
- `ai.purpose`
- `ai.useWhen`
- `ai.dependencies`
- `ai.usedBy`
- `ai.keywords`
- `ai.designSystemDoc`
- `ai.productPath`
- `ai.storyPath`
- `ai.provenance`

## Documentation Provenance

- Existing extracted component specs remain authoritative.
- `Graphic`, `Icon`, and `Quote List Column Header` are `implementation-derived` and `needs-review`.
- `Quote List Column Header` maps the earlier `Column Header Row` need to the implemented quote-list header component.

## Verification Log

| Check | Status | Notes |
|---|---|---|
| Component catalog id coverage | passed | `npm run check:storybook-catalog` reports 69 component stories matched to catalog entries. |
| Component documentation checker | passed with warnings | `check_component_docs.mjs` reports 69 components checked, 0 missing docs, 0 missing inventory entries, 0 missing stories, and 0 missing review status entries. Existing stale-doc warnings remain because component files are newer than extracted docs. |
| Token inheritance | passed | `npm run check:tokens`. |
| TypeScript | passed | `npm run typecheck`. |
| Storybook build | passed | `npm run storybook:build`. |
| Storybook dev smoke | passed | Existing `127.0.0.1:6006` server is live; manifest contains `components-market-data-asset-trend-chart--default` and `components-market-data-trend-analysis-header--default`, and both iframe URLs returned HTTP 200. |
| Figma export variant metadata | passed | Built Storybook iframe bundle contains `data-figma-variant` before `data-variant`, so Button all-sizes exports no longer collapse to one component key. |
| Browser visual check | passed | In-app browser backend was unavailable, so CDP fallback captured a non-empty Stock Calendar screenshot payload and verified DOM/style state. |
| Extractor source audit | passed | `audit_sources.mjs --strict` passed with 12 source rows and no unresolved duplicates. |
| Extractor token strict audit | known blocker | `audit_tokens.mjs --strict` still reports the existing near-token review backlog: 315 candidates, including 1 near-color pair and 314 near-number pairs. |
