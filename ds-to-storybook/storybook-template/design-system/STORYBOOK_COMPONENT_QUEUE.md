# Storybook Component Queue

## Context

- Design-system package: /Users/a04-0214-0320/Public/works/cm-chipK/ds-lab/project/design-system
- Product repo:
- Framework:
- Storybook/catalog:
- Source trace: /Users/a04-0214-0320/Public/works/cm-chipK/ds-lab/project/design-system/STORYBOOK_SOURCE_TRACE.md
- Component build plan: /Users/a04-0214-0320/Public/works/cm-chipK/ds-lab/project/design-system/STORYBOOK_COMPONENT_PLAN.md
- Figma export addon:
- Package manager:
- Token import strategy:
- Target layout: components in `src/components/<ComponentName>/`, pages in `src/pages/<PageName>/`, foundation docs in `stories/` or `src/stories/`
- Typographic components: implement text lockups as editable shared components in `src/components/<ComponentName>/` unless the extraction explicitly requires raster artwork
- Current batch: B11

## Status Values

- `queued`: ready for a future batch
- `in-progress`: selected for the current batch
- `done`: implemented, documented, and verified
- `reused`: existing product component accepted as the implementation
- `blocked`: cannot continue without a decision or missing source
- `deferred`: intentionally postponed
- `needs-extraction`: missing design-system evidence or component spec
- `needs-source`: extractor source evidence exists but the Figma node, image, route, or frontend folder cannot be resolved
- `needs-token`: missing token at the required layer
- `needs-api-decision`: shared component API needs a product decision
- `needs-existing-component-review`: similar product component needs review first
- `needs-addon-compatibility`: Storybook, React, or addon setup requirement is missing
- `out-of-scope`: not part of this Storybook rollout

## Source Trace

| Source ID / location | Type | Resolved file / Figma node / route | Story source URL | Components | Status | Notes |
|---|---|---|---|---|---|---|
| E-030 | - | design-system/components/portfolio-attribute-label.md | - | Portfolio Attribute Label | resolved | synced from component plan |
| E-038 | - | design-system/components/valuation-label.md | - | Valuation Label | resolved | synced from component plan |
| https://www.figma.com/design/vSr4NtEwPVs6wLpqCT5PtV/%E7%B1%8C%E7%A2%BC-K-%E7%B7%9A-ChipK--Design-System-Lab-?node-id=16405-224755&t=Jls6lg1T69Nfj29r-1# | - | design-system/components/market-filter-tab-strip.md | https://www.figma.com/design/vSr4NtEwPVs6wLpqCT5PtV/%E7%B1%8C%E7%A2%BC-K-%E7%B7%9A-ChipK--Design-System-Lab-?node-id=16405-224755&t=Jls6lg1T69Nfj29r-1# | Market Filter Tab Strip | resolved | synced from component plan |
| E-009 | - | design-system/components/edge-status-toggle.md | - | Edge Status Toggle | resolved | synced from component plan |
| E-034 | - | design-system/components/portfolio-preferred-stock-title.md | - | Portfolio Preferred Stock Title | resolved | synced from component plan |
| E-004, E-060, E-061 | - | design-system/components/market-tab-strip.md | - | Market Tab Strip | resolved | synced from component plan |
| E-024, E-025 | - | design-system/components/event-table-row.md | - | Event Table Row | resolved | synced from component plan |
| E-042, E-043, E-044 | - | design-system/components/portfolio-health-report-section.md | - | Portfolio Health Report Section | resolved | synced from component plan |
| E-005, E-006, E-074 | - | design-system/components/realtime-quote-row.md | - | Realtime Quote Row | resolved | synced from component plan |
| E-041 | - | design-system/components/portfolio-health-check-row.md | - | Portfolio Health Check Row | resolved | synced from component plan |
| implementation, E-004 | - | design-system/components/quote-list-column-header.md | - | Quote List Column Header | resolved | synced from component plan |
| E-057, E-059 | - | design-system/components/promotional-badge.md | - | Promotional Badge | resolved | synced from component plan |
| E-065, E-064 | - | design-system/components/new-badge.md | - | New Badge | resolved | synced from component plan |
| E-091 | - | design-system/components/asset-trend-chart.md | - | Asset Trend Chart | resolved | synced from component plan |
| E-058 | - | design-system/components/broker-import-header.md | - | Broker Import Header | resolved | synced from component plan |
| E-004, E-048 | - | - | - | Broker Selector Bar | resolved | synced from component plan |
| implementation | - | design-system/components/icon.md | - | Icon | resolved | synced from component plan |
| E-077 | - | design-system/components/main-force-weather-indicator.md | - | Main Force Weather Indicator | resolved | synced from component plan |
| E-048 | - | design-system/components/broker-icon.md | - | Broker Icon | resolved | synced from component plan |
| E-031 | - | design-system/components/portfolio-fit-assessment-indicator.md | - | Portfolio Fit Assessment Indicator | resolved | synced from component plan |
| E-039 | - | design-system/components/quarter-line-status-icon.md | - | Quarter Line Status Icon | resolved | synced from component plan |
| implementation | - | design-system/components/graphic.md | - | Graphic | resolved | synced from component plan |
| E-065, E-066 | - | design-system/components/mystock-utility-icon.md | - | MyStock Utility Icon | resolved | synced from component plan |
| figma:vSr4NtEwPVs6wLpqCT5PtV#29202:30912 | - | design-system/components/top-app-bar.md | - | Top App Bar | resolved | synced from component plan |
| figma:vSr4NtEwPVs6wLpqCT5PtV#29202:88715; figma:vSr4NtEwPVs6wLpqCT5PtV#51034:5228 | - | design-system/components/floating-action-pill.md | - | Floating Action Pill | resolved | synced from component plan |
| E-035 | - | design-system/components/portfolio-preferred-stock-top-bar.md | - | Portfolio Preferred Stock Top Bar | resolved | synced from component plan |
| E-020, E-021 | - | design-system/components/relative-date-label.md | - | Relative Date Label | resolved | synced from component plan |
| figma:vSr4NtEwPVs6wLpqCT5PtV#51054:298722 | - | design-system/components/stock-calendar.md | https://www.figma.com/design/vSr4NtEwPVs6wLpqCT5PtV/%E7%B1%8C%E7%A2%BC-K-%E7%B7%9A-ChipK--Design-System-Lab-?node-id=51054-298722&t=buNo31ra500KKh9O-1 | Stock Calendar | resolved | synced from component plan |
| figma:vSr4NtEwPVs6wLpqCT5PtV#18095:175915 | - | design-system/components/realtime-quote-tile.md | - | Realtime Quote Tile | resolved | synced from component plan |
| E-037 | - | design-system/components/portfolio-preferred-stock-row.md | - | Portfolio Preferred Stock Row | resolved | synced from component plan |
| E-018, E-019, E-030, E-031 | - | design-system/components/portfolio-fit-stock-row.md | - | Portfolio Fit Stock Row | resolved | synced from component plan |
| E-007 | - | design-system/components/bottom-navigation.md | - | Bottom Navigation | resolved | synced from component plan |
| E-033, E-072, E-073 | - | design-system/components/portfolio-fit-detail-table.md | - | Portfolio Fit Detail Table | resolved | synced from component plan |
| E-075 | - | design-system/components/main-force-trade-tag.md | - | Main Force Trade Tag | resolved | synced from component plan |
| figma:vSr4NtEwPVs6wLpqCT5PtV#47327:64981 | - | design-system/components/stock-label.md | - | Stock Label | resolved | synced from component plan |
| E-076, E-075, E-077 | - | design-system/components/main-force-stock-row.md | - | Main Force Stock Row | resolved | synced from component plan |
| E-017 | - | design-system/components/portfolio-fit-list-header.md | - | Portfolio Fit List Header | resolved | synced from component plan |
| E-036 | - | design-system/components/portfolio-preferred-stock-list-header.md | - | Portfolio Preferred Stock List Header | resolved | synced from component plan |
| E-040 | - | design-system/components/portfolio-health-check-cell.md | - | Portfolio Health Check Cell | resolved | synced from component plan |
| E-054, E-055, E-056, E-050 | - | design-system/components/portfolio-add-holding-sheet.md | - | Portfolio Add Holding Sheet | resolved | synced from component plan |
| E-060, E-062 | - | design-system/components/broker-import-menu.md | - | Broker Import Menu | resolved | synced from component plan |
| E-015, E-016 | - | design-system/components/portfolio-preference-header.md | - | Portfolio Preference Header | resolved | synced from component plan |
| E-045 | - | design-system/components/portfolio-profit-summary.md | - | Portfolio Profit Summary | resolved | synced from component plan |
| E-090 | - | design-system/components/trend-analysis-header.md | - | Trend Analysis Header | resolved | synced from component plan |
| E-028 | - | design-system/components/event-filter-option.md | - | Event Filter Option | resolved | synced from component plan |
| E-022, E-023 | - | design-system/components/event-name-label.md | - | Event Name Label | resolved | synced from component plan |
| E-069, E-067 | - | design-system/components/bottom-sheet-footer-button.md | - | Bottom Sheet Footer Button | resolved | synced from component plan |
| E-049 | - | design-system/components/portfolio-add-action-button.md | - | Portfolio Add Action Button | resolved | synced from component plan |
| E-026 | - | design-system/components/return-today-button.md | - | Return Today Button | resolved | synced from component plan |
| E-070, E-032 | - | design-system/components/similar-stock-button.md | - | Similar Stock Button | resolved | synced from component plan |
| figma:vSr4NtEwPVs6wLpqCT5PtV#29503:80044 | - | design-system/components/global-bubble.md | - | Global Bubble | resolved | synced from component plan |
| figma:vSr4NtEwPVs6wLpqCT5PtV#1934:94 | - | design-system/components/button.md | - | Button | resolved | synced from component plan |
| figma:vSr4NtEwPVs6wLpqCT5PtV#5862:221812 | - | design-system/components/empty-state.md | - | Empty State | resolved | synced from component plan |
| E-050, E-049, E-054 | - | design-system/components/portfolio-add-action-section.md | - | Portfolio Add Action Section | resolved | synced from component plan |
| E-011, E-012, E-013, E-014 | - | design-system/components/portfolio-fit-chart.md | - | Portfolio Fit Chart | resolved | synced from component plan |
| E-027 | - | design-system/components/event-filter-dropdown.md | - | Event Filter Dropdown | resolved | synced from component plan |
| E-051 | - | design-system/components/portfolio-manual-import-value-field.md | - | Portfolio Manual Import Value Field | resolved | synced from component plan |
| figma:vSr4NtEwPVs6wLpqCT5PtV#22911:207990 | - | design-system/components/selection-control.md | - | Selection Control | resolved | synced from component plan |
| figma:vSr4NtEwPVs6wLpqCT5PtV#8134:289037 | - | design-system/components/switch.md | - | Switch | resolved | synced from component plan |
| E-059, E-048, E-057, E-078 | - | design-system/components/broker-import-row.md | - | Broker Import Row | resolved | synced from component plan |
| E-053, E-052, E-051 | - | design-system/components/portfolio-manual-import-row.md | - | Portfolio Manual Import Row | resolved | synced from component plan |
| E-052, E-051 | - | design-system/components/portfolio-manual-import-cell.md | - | Portfolio Manual Import Cell | resolved | synced from component plan |
| figma:vSr4NtEwPVs6wLpqCT5PtV#51036:377157 | - | design-system/components/stock-card.md | - | Stock Card | resolved | synced from component plan |
| E-071, E-030, E-038 | - | design-system/components/portfolio-stock-sheet-cell.md | - | Portfolio Stock Sheet Cell | resolved | synced from component plan |
| E-032, E-033, E-030, E-070, E-071 | - | design-system/components/portfolio-fit-stock-sheet.md | - | Portfolio Fit Stock Sheet | resolved | synced from component plan |
| E-064, E-065, E-066, E-067, E-078, E-079 | - | design-system/components/bottom-sheet-cell.md | - | Bottom Sheet Cell | resolved | synced from component plan |
| E-063 | - | design-system/components/bottom-sheet-header.md | - | Bottom Sheet Header | resolved | synced from component plan |
| E-067, E-068, E-069, E-063, E-064, E-078, E-079 | - | design-system/components/bottom-sheet.md | - | Bottom Sheet | resolved | synced from component plan |
| figma:vSr4NtEwPVs6wLpqCT5PtV#5906:218640 | - | design-system/components/popup-dialog.md | - | Popup Dialog | resolved | synced from component plan |
| E-029 | - | design-system/components/event-filter-sheet.md | - | Event Filter Sheet | resolved | synced from component plan |

## Current Component Checkpoint

| Field | Value |
|---|---|
| Active component | Asset Trend Chart, Trend Analysis Header |
| Queue order / batch | B04 #14, B11 #44 |
| Dependency status | Asset Trend Chart has no component dependency; Trend Analysis Header reuses existing Icon and adds the shared `share` glyph. |
| Source inspected | Component docs, source trace, Figma nodes `51059:51227` and `51059:51226` design context, and Figma screenshots. |
| Existing component review | Portfolio Profit Summary, Portfolio Fit Chart, Realtime Quote Tile, Global Bubble, generic Chart Card, Market Filter Tab Strip, Market Tab Strip, Portfolio Preference Header, Stock Calendar header, Event Filter Option, and Button reviewed; none fully match these contracts. |
| Token decision | Reuse `--cm-comp-asset-trend-chart-*` and `--cm-comp-trend-analysis-header-*`; no hardcoded visual color, spacing, radius, typography, or shadow values in component CSS. |
| Product files | `src/components/asset-trend-chart/*`, `src/components/trend-analysis-header/*`, `src/components/icon/*`, `src/storybook/componentCatalog.ts` |
| Story files | `src/components/asset-trend-chart/AssetTrendChart.stories.tsx`, `src/components/trend-analysis-header/TrendAnalysisHeader.stories.tsx` |
| Target layout | Lowercase component folders matching the repo convention. |
| Verification | `npm run check`, component documentation checker, Storybook manifest/iframe smoke, and `npm run storybook:build` passed. |
| Blocker / next action | Remaining queue rows are broader rollout work; these two extracted docs now have Storybook implementations. |

## Dependency Plan

| Order | Component | Category | Depends on | Used by | Core reason | Status | Notes |
|---|---|---|---|---|---|---|---|
| 1 | Portfolio Attribute Label | primitive | - | Main Force Trade Tag, Portfolio Fit Stock Row, Portfolio Fit Stock Sheet | core dependency tier; used by 3 components | queued | - |
| 2 | Valuation Label | primitive | - | Portfolio Health Check Cell, Portfolio Stock Sheet Cell | core dependency tier; used by 2 components | queued | - |
| 3 | Market Filter Tab Strip | primitive | - | Market Tab Strip | core dependency tier; used by 1 component | queued | - |
| 4 | Edge Status Toggle | primitive | - | - | core dependency tier | queued | - |
| 5 | Portfolio Preferred Stock Title | primitive | - | - | core dependency tier | queued | - |
| 6 | Market Tab Strip | primitive | Market Filter Tab Strip | - | core dependency tier; after 1 dependency | queued | - |
| 7 | Event Table Row | layout | - | Stock Card | used by 1 component | queued | - |
| 8 | Portfolio Health Report Section | layout | - | Portfolio Stock Sheet Cell | used by 1 component | queued | - |
| 9 | Realtime Quote Row | layout | - | Realtime Quote Tile | used by 1 component | queued | - |
| 10 | Portfolio Health Check Row | layout | - | - | no dependencies detected | queued | - |
| 11 | Quote List Column Header | layout | - | - | no dependencies detected | queued | - |
| 12 | Promotional Badge | data-display | - | Broker Import Row, Global Bubble, Stock Label | used by 3 components | queued | - |
| 13 | New Badge | data-display | - | Bottom Sheet Cell | used by 1 component | queued | - |
| 14 | Asset Trend Chart | data-display | - | - | no dependencies detected | queued | - |
| 15 | Broker Import Header | composite | - | - | no dependencies detected | queued | - |
| 16 | Broker Selector Bar | unknown | - | - | no dependencies detected | queued | - |
| 17 | Icon | primitive | Button | Bottom Navigation, Bottom Sheet, Bottom Sheet Cell, Bottom Sheet Header, Broker Icon, Broker Import Menu, Broker Import Row, Button, Event Filter Dropdown, Event Filter Sheet, Floating Action Pill, Graphic, Main Force Stock Row, Main Force Trade Tag, Main Force Weather Indicator, MyStock Utility Icon, Portfolio Add Action Button, Portfolio Add Action Section, Portfolio Add Holding Sheet, Portfolio Fit Assessment Indicator, Portfolio Fit Detail Table, Portfolio Fit List Header, Portfolio Fit Stock Sheet, Portfolio Health Check Cell, Portfolio Manual Import Cell, Portfolio Preference Header, Portfolio Preferred Stock List Header, Portfolio Preferred Stock Row, Portfolio Preferred Stock Top Bar, Portfolio Profit Summary, Quarter Line Status Icon, Realtime Quote Tile, Relative Date Label, Return Today Button, Similar Stock Button, Stock Calendar, Top App Bar, Trend Analysis Header | core dependency tier; used by 38 components; after 1 dependency; cycle fallback | queued | - |
| 18 | Main Force Weather Indicator | primitive | Icon | Main Force Stock Row, Realtime Quote Tile | core dependency tier; used by 2 components; after 1 dependency | queued | - |
| 19 | Broker Icon | primitive | Icon | Broker Import Row | core dependency tier; used by 1 component; after 1 dependency | queued | - |
| 20 | Portfolio Fit Assessment Indicator | primitive | Icon | Portfolio Fit Stock Row | core dependency tier; used by 1 component; after 1 dependency | queued | - |
| 21 | Quarter Line Status Icon | primitive | Icon | Portfolio Health Check Cell | core dependency tier; used by 1 component; after 1 dependency | done | Implemented in `src/components/quarter-line-status-icon/*`. |
| 22 | Graphic | primitive | Icon | Portfolio Health Check Cell | core dependency tier; used by 1 component; after 1 dependency | queued | - |
| 23 | MyStock Utility Icon | primitive | Icon | Bottom Sheet Cell | core dependency tier; used by 1 component; after 1 dependency | done | Implemented in `src/components/mystock-utility-icon/*`. |
| 24 | Top App Bar | primitive | Icon | - | core dependency tier; after 1 dependency | queued | - |
| 25 | Floating Action Pill | primitive | Icon | - | core dependency tier; after 1 dependency | queued | - |
| 26 | Portfolio Preferred Stock Top Bar | primitive | Icon | - | core dependency tier; after 1 dependency | queued | - |
| 27 | Relative Date Label | primitive | Icon | - | core dependency tier; after 1 dependency | queued | - |
| 28 | Stock Calendar | primitive | Icon | - | core dependency tier; after 1 dependency | done | Implemented in `src/components/stock-calendar/*` with Default and Observed States stories. |
| 29 | Realtime Quote Tile | primitive | Icon, Main Force Weather Indicator, Realtime Quote Row | - | core dependency tier; after 3 dependencies | done | Implemented in `src/components/realtime-quote-tile/*`. |
| 30 | Portfolio Preferred Stock Row | layout | Icon | - | after 1 dependency | queued | - |
| 31 | Portfolio Fit Stock Row | layout | Portfolio Attribute Label, Portfolio Fit Assessment Indicator | Main Force Stock Row, Portfolio Fit List Header | used by 2 components; after 2 dependencies | queued | - |
| 32 | Bottom Navigation | navigation | Icon | - | after 1 dependency | queued | - |
| 33 | Portfolio Fit Detail Table | data-display | Icon | Portfolio Fit Stock Sheet | used by 1 component; after 1 dependency | queued | - |
| 34 | Main Force Trade Tag | data-display | Icon, Portfolio Attribute Label | Main Force Stock Row, Stock Label | used by 2 components; after 2 dependencies | queued | - |
| 35 | Stock Label | primitive | Main Force Trade Tag, Promotional Badge | - | core dependency tier; after 2 dependencies | done | Implemented in `src/components/stock-label/*`. |
| 36 | Main Force Stock Row | layout | Icon, Main Force Trade Tag, Main Force Weather Indicator, Portfolio Fit Stock Row | - | after 4 dependencies | queued | - |
| 37 | Portfolio Fit List Header | data-display | Icon, Portfolio Fit Stock Row | Portfolio Preferred Stock List Header | used by 1 component; after 2 dependencies | queued | - |
| 38 | Portfolio Preferred Stock List Header | data-display | Icon, Portfolio Fit List Header | - | after 2 dependencies | queued | - |
| 39 | Portfolio Health Check Cell | data-display | Graphic, Icon, Quarter Line Status Icon, Valuation Label | - | after 4 dependencies | queued | - |
| 40 | Portfolio Add Holding Sheet | overlay | Icon | Popup Dialog | used by 1 component; after 1 dependency | done | Implemented in `src/components/portfolio-add-holding-sheet/*`. |
| 41 | Broker Import Menu | overlay | Icon | - | after 1 dependency | queued | - |
| 42 | Portfolio Preference Header | composite | Icon | - | after 1 dependency | queued | - |
| 43 | Portfolio Profit Summary | composite | Icon | - | after 1 dependency | queued | - |
| 44 | Trend Analysis Header | composite | Icon | - | after 1 dependency | queued | - |
| 45 | Event Filter Option | primitive | Event Filter Sheet | Event Filter Sheet | core dependency tier; used by 1 component; after 1 dependency; cycle fallback | queued | - |
| 46 | Event Name Label | primitive | Button | - | core dependency tier; after 1 dependency; cycle fallback | queued | - |
| 47 | Bottom Sheet Footer Button | primitive | Bottom Sheet, Button | Bottom Sheet, Button, Popup Dialog | core dependency tier; used by 3 components; after 2 dependencies; cycle fallback | queued | - |
| 48 | Portfolio Add Action Button | primitive | Button, Icon | Portfolio Add Action Section | core dependency tier; used by 1 component; after 2 dependencies; cycle fallback | queued | - |
| 49 | Return Today Button | primitive | Button, Icon | - | core dependency tier; after 2 dependencies; cycle fallback | queued | - |
| 50 | Similar Stock Button | primitive | Bottom Sheet, Button, Icon | Portfolio Fit Stock Sheet, Portfolio Stock Sheet Cell | core dependency tier; used by 2 components; after 3 dependencies; cycle fallback | queued | - |
| 51 | Global Bubble | primitive | Event Filter Dropdown, Popup Dialog, Promotional Badge | - | core dependency tier; after 3 dependencies; cycle fallback | done | Implemented in `src/components/global-bubble/*`. |
| 52 | Button | primitive | Bottom Sheet, Bottom Sheet Footer Button, Empty State, Icon | Bottom Sheet, Bottom Sheet Cell, Bottom Sheet Footer Button, Broker Import Row, Empty State, Event Filter Dropdown, Event Filter Sheet, Event Name Label, Icon, Popup Dialog, Portfolio Add Action Button, Portfolio Add Action Section, Portfolio Fit Stock Sheet, Portfolio Manual Import Cell, Portfolio Stock Sheet Cell, Return Today Button, Similar Stock Button, Stock Card | core dependency tier; used by 18 components; after 4 dependencies; cycle fallback | done | Product files use `src/components/button/*`; story source URL points to Figma `1934:94`. |
| 53 | Empty State | feedback | Button | Button, Portfolio Add Action Section, Portfolio Fit Chart, Stock Card | used by 4 components; after 1 dependency | done | Product files use `src/components/empty-state/*`; story source URL points to Figma `5862:221812`. |
| 54 | Portfolio Add Action Section | layout | Button, Empty State, Icon, Portfolio Add Action Button | - | after 4 dependencies | queued | - |
| 55 | Portfolio Fit Chart | data-display | Empty State | - | after 1 dependency | queued | - |
| 56 | Event Filter Dropdown | overlay | Button, Icon | Global Bubble | used by 1 component; after 2 dependencies | queued | - |
| 57 | Portfolio Manual Import Value Field | form-control | Portfolio Manual Import Cell | Portfolio Manual Import Cell, Portfolio Manual Import Row | used by 2 components; after 1 dependency; cycle fallback | queued | - |
| 58 | Selection Control | form-control | Bottom Sheet, Bottom Sheet Cell | Bottom Sheet, Bottom Sheet Cell | used by 2 components; after 2 dependencies; cycle fallback | queued | - |
| 59 | Switch | form-control | Bottom Sheet, Bottom Sheet Cell, Broker Import Row | Bottom Sheet, Bottom Sheet Cell, Broker Import Row | used by 3 components; after 3 dependencies; cycle fallback | queued | - |
| 60 | Broker Import Row | layout | Broker Icon, Button, Icon, Promotional Badge, Switch | Switch | used by 1 component; after 5 dependencies | queued | - |
| 61 | Portfolio Manual Import Row | layout | Portfolio Manual Import Cell, Portfolio Manual Import Value Field | Portfolio Manual Import Cell | used by 1 component; after 2 dependencies; cycle fallback | queued | - |
| 62 | Portfolio Manual Import Cell | data-display | Button, Icon, Portfolio Manual Import Row, Portfolio Manual Import Value Field | Portfolio Manual Import Row, Portfolio Manual Import Value Field | used by 2 components; after 4 dependencies | queued | - |
| 63 | Stock Card | data-display | Button, Empty State, Event Table Row, Popup Dialog | - | after 4 dependencies; cycle fallback | done | Implemented in `src/components/stock-card/*`. |
| 64 | Portfolio Stock Sheet Cell | data-display | Button, Portfolio Fit Stock Sheet, Portfolio Health Report Section, Similar Stock Button, Valuation Label | Portfolio Fit Stock Sheet | used by 1 component; after 5 dependencies; cycle fallback | queued | - |
| 65 | Portfolio Fit Stock Sheet | overlay | Button, Icon, Portfolio Attribute Label, Portfolio Fit Detail Table, Portfolio Stock Sheet Cell, Similar Stock Button | Portfolio Stock Sheet Cell | used by 1 component; after 6 dependencies | queued | - |
| 66 | Bottom Sheet Cell | data-display | Bottom Sheet, Button, Icon, MyStock Utility Icon, New Badge, Selection Control, Switch | Bottom Sheet, Selection Control, Switch | used by 3 components; after 7 dependencies; cycle fallback | queued | - |
| 67 | Bottom Sheet Header | overlay | Bottom Sheet, Icon | Bottom Sheet, Event Filter Sheet | used by 2 components; after 2 dependencies; cycle fallback | queued | - |
| 68 | Bottom Sheet | overlay | Bottom Sheet Cell, Bottom Sheet Footer Button, Bottom Sheet Header, Button, Icon, Selection Control, Switch | Bottom Sheet Cell, Bottom Sheet Footer Button, Bottom Sheet Header, Button, Event Filter Sheet, Popup Dialog, Selection Control, Similar Stock Button, Switch | used by 9 components; after 7 dependencies | queued | - |
| 69 | Popup Dialog | overlay | Bottom Sheet, Bottom Sheet Footer Button, Button, Portfolio Add Holding Sheet | Global Bubble, Stock Card | used by 2 components; after 4 dependencies | done | Implemented in `src/components/popup-dialog/*`. |
| 70 | Event Filter Sheet | overlay | Bottom Sheet, Bottom Sheet Header, Button, Event Filter Option, Icon | Event Filter Option | used by 1 component; after 5 dependencies | queued | - |

## Component Queue

| Batch | Order | Component | Category | Source spec | Design sources | Story source URL | Depends on | Used by | Product target | Story target | Decision | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B01 | 1 | Portfolio Attribute Label | primitive | design-system/components/portfolio-attribute-label.md | E-030 | - | - | Main Force Trade Tag, Portfolio Fit Stock Row, Portfolio Fit Stock Sheet | src/components/PortfolioAttributeLabel/PortfolioAttributeLabel.tsx | src/components/PortfolioAttributeLabel/PortfolioAttributeLabel.stories.tsx | - | queued |
| B01 | 2 | Valuation Label | primitive | design-system/components/valuation-label.md | E-038 | - | - | Portfolio Health Check Cell, Portfolio Stock Sheet Cell | src/components/ValuationLabel/ValuationLabel.tsx | src/components/ValuationLabel/ValuationLabel.stories.tsx | - | queued |
| B01 | 3 | Market Filter Tab Strip | primitive | design-system/components/market-filter-tab-strip.md | https://www.figma.com/design/vSr4NtEwPVs6wLpqCT5PtV/%E7%B1%8C%E7%A2%BC-K-%E7%B7%9A-ChipK--Design-System-Lab-?node-id=16405-224755&t=Jls6lg1T69Nfj29r-1# | https://www.figma.com/design/vSr4NtEwPVs6wLpqCT5PtV/%E7%B1%8C%E7%A2%BC-K-%E7%B7%9A-ChipK--Design-System-Lab-?node-id=16405-224755&t=Jls6lg1T69Nfj29r-1# | - | Market Tab Strip | src/components/MarketFilterTabStrip/MarketFilterTabStrip.tsx | src/components/MarketFilterTabStrip/MarketFilterTabStrip.stories.tsx | - | queued |
| B01 | 4 | Edge Status Toggle | primitive | design-system/components/edge-status-toggle.md | E-009 | - | - | - | src/components/EdgeStatusToggle/EdgeStatusToggle.tsx | src/components/EdgeStatusToggle/EdgeStatusToggle.stories.tsx | - | queued |
| B02 | 5 | Portfolio Preferred Stock Title | primitive | design-system/components/portfolio-preferred-stock-title.md | E-034 | - | - | - | src/components/PortfolioPreferredStockTitle/PortfolioPreferredStockTitle.tsx | src/components/PortfolioPreferredStockTitle/PortfolioPreferredStockTitle.stories.tsx | - | queued |
| B02 | 6 | Market Tab Strip | primitive | design-system/components/market-tab-strip.md | E-004, E-060, E-061 | - | Market Filter Tab Strip | - | src/components/MarketTabStrip/MarketTabStrip.tsx | src/components/MarketTabStrip/MarketTabStrip.stories.tsx | - | queued |
| B02 | 7 | Event Table Row | layout | design-system/components/event-table-row.md | E-024, E-025 | - | - | Stock Card | src/components/EventTableRow/EventTableRow.tsx | src/components/EventTableRow/EventTableRow.stories.tsx | - | queued |
| B02 | 8 | Portfolio Health Report Section | layout | design-system/components/portfolio-health-report-section.md | E-042, E-043, E-044 | - | - | Portfolio Stock Sheet Cell | src/components/PortfolioHealthReportSection/PortfolioHealthReportSection.tsx | src/components/PortfolioHealthReportSection/PortfolioHealthReportSection.stories.tsx | - | queued |
| B03 | 9 | Realtime Quote Row | layout | design-system/components/realtime-quote-row.md | E-005, E-006, E-074 | - | - | Realtime Quote Tile | src/components/RealtimeQuoteRow/RealtimeQuoteRow.tsx | src/components/RealtimeQuoteRow/RealtimeQuoteRow.stories.tsx | - | queued |
| B03 | 10 | Portfolio Health Check Row | layout | design-system/components/portfolio-health-check-row.md | E-041 | - | - | - | src/components/PortfolioHealthCheckRow/PortfolioHealthCheckRow.tsx | src/components/PortfolioHealthCheckRow/PortfolioHealthCheckRow.stories.tsx | - | queued |
| B03 | 11 | Quote List Column Header | layout | design-system/components/quote-list-column-header.md | implementation, E-004 | - | - | - | src/components/QuoteListColumnHeader/QuoteListColumnHeader.tsx | src/components/QuoteListColumnHeader/QuoteListColumnHeader.stories.tsx | - | queued |
| B03 | 12 | Promotional Badge | data-display | design-system/components/promotional-badge.md | E-057, E-059 | - | - | Broker Import Row, Global Bubble, Stock Label | src/components/PromotionalBadge/PromotionalBadge.tsx | src/components/PromotionalBadge/PromotionalBadge.stories.tsx | - | queued |
| B04 | 13 | New Badge | data-display | design-system/components/new-badge.md | E-065, E-064 | - | - | Bottom Sheet Cell | src/components/NewBadge/NewBadge.tsx | src/components/NewBadge/NewBadge.stories.tsx | - | queued |
| B04 | 14 | Asset Trend Chart | data-display | design-system/components/asset-trend-chart.md | E-091 | https://www.figma.com/design/vSr4NtEwPVs6wLpqCT5PtV/%E7%B1%8C%E7%A2%BC-K-%E7%B7%9A-ChipK--Design-System-Lab-?node-id=51059-51227&t=GjcgFzQh0Ll0Qhku-1 | - | - | src/components/asset-trend-chart/AssetTrendChart.tsx | src/components/asset-trend-chart/AssetTrendChart.stories.tsx | Implemented as standalone token-backed chart body with code-native SVG series and Default story. | done |
| B04 | 15 | Broker Import Header | composite | design-system/components/broker-import-header.md | E-058 | - | - | - | src/components/BrokerImportHeader/BrokerImportHeader.tsx | src/components/BrokerImportHeader/BrokerImportHeader.stories.tsx | - | queued |
| B04 | 16 | Broker Selector Bar | unknown | - | E-004, E-048 | - | - | - | src/components/BrokerSelectorBar/BrokerSelectorBar.tsx | src/components/BrokerSelectorBar/BrokerSelectorBar.stories.tsx | - | queued |
| B05 | 17 | Icon | primitive | design-system/components/icon.md | implementation | - | Button | Bottom Navigation, Bottom Sheet, Bottom Sheet Cell, Bottom Sheet Header, Broker Icon, Broker Import Menu, Broker Import Row, Button, Event Filter Dropdown, Event Filter Sheet, Floating Action Pill, Graphic, Main Force Stock Row, Main Force Trade Tag, Main Force Weather Indicator, MyStock Utility Icon, Portfolio Add Action Button, Portfolio Add Action Section, Portfolio Add Holding Sheet, Portfolio Fit Assessment Indicator, Portfolio Fit Detail Table, Portfolio Fit List Header, Portfolio Fit Stock Sheet, Portfolio Health Check Cell, Portfolio Manual Import Cell, Portfolio Preference Header, Portfolio Preferred Stock List Header, Portfolio Preferred Stock Row, Portfolio Preferred Stock Top Bar, Portfolio Profit Summary, Quarter Line Status Icon, Realtime Quote Tile, Relative Date Label, Return Today Button, Similar Stock Button, Stock Calendar, Top App Bar, Trend Analysis Header | src/components/Icon/Icon.tsx | src/components/Icon/Icon.stories.tsx | - | queued |
| B05 | 18 | Main Force Weather Indicator | primitive | design-system/components/main-force-weather-indicator.md | E-077 | - | Icon | Main Force Stock Row, Realtime Quote Tile | src/components/MainForceWeatherIndicator/MainForceWeatherIndicator.tsx | src/components/MainForceWeatherIndicator/MainForceWeatherIndicator.stories.tsx | - | queued |
| B05 | 19 | Broker Icon | primitive | design-system/components/broker-icon.md | E-048 | - | Icon | Broker Import Row | src/components/BrokerIcon/BrokerIcon.tsx | src/components/BrokerIcon/BrokerIcon.stories.tsx | - | queued |
| B05 | 20 | Portfolio Fit Assessment Indicator | primitive | design-system/components/portfolio-fit-assessment-indicator.md | E-031 | - | Icon | Portfolio Fit Stock Row | src/components/PortfolioFitAssessmentIndicator/PortfolioFitAssessmentIndicator.tsx | src/components/PortfolioFitAssessmentIndicator/PortfolioFitAssessmentIndicator.stories.tsx | - | queued |
| B06 | 21 | Quarter Line Status Icon | primitive | design-system/components/quarter-line-status-icon.md | E-039 | - | Icon | Portfolio Health Check Cell | src/components/quarter-line-status-icon/QuarterLineStatusIcon.tsx | src/components/quarter-line-status-icon/QuarterLineStatusIcon.stories.tsx | Asset wrapper over shared Icon quarter-line glyphs. | done |
| B06 | 22 | Graphic | primitive | design-system/components/graphic.md | implementation | - | Icon | Portfolio Health Check Cell | src/components/Graphic/Graphic.tsx | src/components/Graphic/Graphic.stories.tsx | - | queued |
| B06 | 23 | MyStock Utility Icon | primitive | design-system/components/mystock-utility-icon.md | E-065, E-066 | - | Icon | Bottom Sheet Cell | src/components/mystock-utility-icon/MyStockUtilityIcon.tsx | src/components/mystock-utility-icon/MyStockUtilityIcon.stories.tsx | Asset wrapper over shared Icon MyStock utility variants. | done |
| B06 | 24 | Top App Bar | primitive | design-system/components/top-app-bar.md | figma:vSr4NtEwPVs6wLpqCT5PtV#29202:30912 | - | Icon | - | src/components/TopAppBar/TopAppBar.tsx | src/components/TopAppBar/TopAppBar.stories.tsx | - | queued |
| B07 | 25 | Floating Action Pill | primitive | design-system/components/floating-action-pill.md | figma:vSr4NtEwPVs6wLpqCT5PtV#29202:88715; figma:vSr4NtEwPVs6wLpqCT5PtV#51034:5228 | - | Icon | - | src/components/FloatingActionPill/FloatingActionPill.tsx | src/components/FloatingActionPill/FloatingActionPill.stories.tsx | - | queued |
| B07 | 26 | Portfolio Preferred Stock Top Bar | primitive | design-system/components/portfolio-preferred-stock-top-bar.md | E-035 | - | Icon | - | src/components/PortfolioPreferredStockTopBar/PortfolioPreferredStockTopBar.tsx | src/components/PortfolioPreferredStockTopBar/PortfolioPreferredStockTopBar.stories.tsx | - | queued |
| B07 | 27 | Relative Date Label | primitive | design-system/components/relative-date-label.md | E-020, E-021 | - | Icon | - | src/components/RelativeDateLabel/RelativeDateLabel.tsx | src/components/RelativeDateLabel/RelativeDateLabel.stories.tsx | - | queued |
| B07 | 28 | Stock Calendar | primitive | design-system/components/stock-calendar.md | figma:vSr4NtEwPVs6wLpqCT5PtV#51054:298722 | https://www.figma.com/design/vSr4NtEwPVs6wLpqCT5PtV/%E7%B1%8C%E7%A2%BC-K-%E7%B7%9A-ChipK--Design-System-Lab-?node-id=51054-298722&t=buNo31ra500KKh9O-1 | Icon | - | src/components/stock-calendar/StockCalendar.tsx | src/components/stock-calendar/StockCalendar.stories.tsx | Token-backed market-return calendar implemented with Default and Observed States stories. | done |
| B08 | 29 | Realtime Quote Tile | primitive | design-system/components/realtime-quote-tile.md | figma:vSr4NtEwPVs6wLpqCT5PtV#18095:175915 | - | Icon, Main Force Weather Indicator, Realtime Quote Row | - | src/components/realtime-quote-tile/RealtimeQuoteTile.tsx | src/components/realtime-quote-tile/RealtimeQuoteTile.stories.tsx | Quote tile variants implemented with token-backed layout and Graphic weather assets. | done |
| B08 | 30 | Portfolio Preferred Stock Row | layout | design-system/components/portfolio-preferred-stock-row.md | E-037 | - | Icon | - | src/components/PortfolioPreferredStockRow/PortfolioPreferredStockRow.tsx | src/components/PortfolioPreferredStockRow/PortfolioPreferredStockRow.stories.tsx | - | queued |
| B08 | 31 | Portfolio Fit Stock Row | layout | design-system/components/portfolio-fit-stock-row.md | E-018, E-019, E-030, E-031 | - | Portfolio Attribute Label, Portfolio Fit Assessment Indicator | Main Force Stock Row, Portfolio Fit List Header | src/components/PortfolioFitStockRow/PortfolioFitStockRow.tsx | src/components/PortfolioFitStockRow/PortfolioFitStockRow.stories.tsx | - | queued |
| B08 | 32 | Bottom Navigation | navigation | design-system/components/bottom-navigation.md | E-007 | - | Icon | - | src/components/BottomNavigation/BottomNavigation.tsx | src/components/BottomNavigation/BottomNavigation.stories.tsx | - | queued |
| B09 | 33 | Portfolio Fit Detail Table | data-display | design-system/components/portfolio-fit-detail-table.md | E-033, E-072, E-073 | - | Icon | Portfolio Fit Stock Sheet | src/components/PortfolioFitDetailTable/PortfolioFitDetailTable.tsx | src/components/PortfolioFitDetailTable/PortfolioFitDetailTable.stories.tsx | - | queued |
| B09 | 34 | Main Force Trade Tag | data-display | design-system/components/main-force-trade-tag.md | E-075 | - | Icon, Portfolio Attribute Label | Main Force Stock Row, Stock Label | src/components/MainForceTradeTag/MainForceTradeTag.tsx | src/components/MainForceTradeTag/MainForceTradeTag.stories.tsx | - | queued |
| B09 | 35 | Stock Label | primitive | design-system/components/stock-label.md | figma:vSr4NtEwPVs6wLpqCT5PtV#47327:64981 | - | Main Force Trade Tag, Promotional Badge | - | src/components/stock-label/StockLabel.tsx | src/components/stock-label/StockLabel.stories.tsx | Compact stock identity label implemented with `--cm-comp-stock-label-*` tokens. | done |
| B09 | 36 | Main Force Stock Row | layout | design-system/components/main-force-stock-row.md | E-076, E-075, E-077 | - | Icon, Main Force Trade Tag, Main Force Weather Indicator, Portfolio Fit Stock Row | - | src/components/MainForceStockRow/MainForceStockRow.tsx | src/components/MainForceStockRow/MainForceStockRow.stories.tsx | - | queued |
| B10 | 37 | Portfolio Fit List Header | data-display | design-system/components/portfolio-fit-list-header.md | E-017 | - | Icon, Portfolio Fit Stock Row | Portfolio Preferred Stock List Header | src/components/PortfolioFitListHeader/PortfolioFitListHeader.tsx | src/components/PortfolioFitListHeader/PortfolioFitListHeader.stories.tsx | - | queued |
| B10 | 38 | Portfolio Preferred Stock List Header | data-display | design-system/components/portfolio-preferred-stock-list-header.md | E-036 | - | Icon, Portfolio Fit List Header | - | src/components/PortfolioPreferredStockListHeader/PortfolioPreferredStockListHeader.tsx | src/components/PortfolioPreferredStockListHeader/PortfolioPreferredStockListHeader.stories.tsx | - | queued |
| B10 | 39 | Portfolio Health Check Cell | data-display | design-system/components/portfolio-health-check-cell.md | E-040 | - | Graphic, Icon, Quarter Line Status Icon, Valuation Label | - | src/components/PortfolioHealthCheckCell/PortfolioHealthCheckCell.tsx | src/components/PortfolioHealthCheckCell/PortfolioHealthCheckCell.stories.tsx | - | queued |
| B10 | 40 | Portfolio Add Holding Sheet | overlay | design-system/components/portfolio-add-holding-sheet.md | E-054, E-055, E-056, E-050 | - | Icon | Popup Dialog | src/components/portfolio-add-holding-sheet/PortfolioAddHoldingSheet.tsx | src/components/portfolio-add-holding-sheet/PortfolioAddHoldingSheet.stories.tsx | Add-holding sheet variants implemented with Icon chrome and token-backed controls. | done |
| B11 | 41 | Broker Import Menu | overlay | design-system/components/broker-import-menu.md | E-060, E-062 | - | Icon | - | src/components/BrokerImportMenu/BrokerImportMenu.tsx | src/components/BrokerImportMenu/BrokerImportMenu.stories.tsx | - | queued |
| B11 | 42 | Portfolio Preference Header | composite | design-system/components/portfolio-preference-header.md | E-015, E-016 | - | Icon | - | src/components/PortfolioPreferenceHeader/PortfolioPreferenceHeader.tsx | src/components/PortfolioPreferenceHeader/PortfolioPreferenceHeader.stories.tsx | - | queued |
| B11 | 43 | Portfolio Profit Summary | composite | design-system/components/portfolio-profit-summary.md | E-045 | - | Icon | - | src/components/PortfolioProfitSummary/PortfolioProfitSummary.tsx | src/components/PortfolioProfitSummary/PortfolioProfitSummary.stories.tsx | - | queued |
| B11 | 44 | Trend Analysis Header | composite | design-system/components/trend-analysis-header.md | E-090 | https://www.figma.com/design/vSr4NtEwPVs6wLpqCT5PtV/%E7%B1%8C%E7%A2%BC-K-%E7%B7%9A-ChipK--Design-System-Lab-?node-id=51059-51226&t=GjcgFzQh0Ll0Qhku-1 | Icon | - | src/components/trend-analysis-header/TrendAnalysisHeader.tsx | src/components/trend-analysis-header/TrendAnalysisHeader.stories.tsx | Implemented token-backed titled range header; composes existing Icon plus new shared `share` glyph. | done |
| B12 | 45 | Event Filter Option | primitive | design-system/components/event-filter-option.md | E-028 | - | Event Filter Sheet | Event Filter Sheet | src/components/EventFilterOption/EventFilterOption.tsx | src/components/EventFilterOption/EventFilterOption.stories.tsx | - | queued |
| B12 | 46 | Event Name Label | primitive | design-system/components/event-name-label.md | E-022, E-023 | - | Button | - | src/components/EventNameLabel/EventNameLabel.tsx | src/components/EventNameLabel/EventNameLabel.stories.tsx | - | queued |
| B12 | 47 | Bottom Sheet Footer Button | primitive | design-system/components/bottom-sheet-footer-button.md | E-069, E-067 | - | Bottom Sheet, Button | Bottom Sheet, Button, Popup Dialog | src/components/BottomSheetFooterButton/BottomSheetFooterButton.tsx | src/components/BottomSheetFooterButton/BottomSheetFooterButton.stories.tsx | - | queued |
| B12 | 48 | Portfolio Add Action Button | primitive | design-system/components/portfolio-add-action-button.md | E-049 | - | Button, Icon | Portfolio Add Action Section | src/components/PortfolioAddActionButton/PortfolioAddActionButton.tsx | src/components/PortfolioAddActionButton/PortfolioAddActionButton.stories.tsx | - | queued |
| B13 | 49 | Return Today Button | primitive | design-system/components/return-today-button.md | E-026 | - | Button, Icon | - | src/components/ReturnTodayButton/ReturnTodayButton.tsx | src/components/ReturnTodayButton/ReturnTodayButton.stories.tsx | - | queued |
| B13 | 50 | Similar Stock Button | primitive | design-system/components/similar-stock-button.md | E-070, E-032 | - | Bottom Sheet, Button, Icon | Portfolio Fit Stock Sheet, Portfolio Stock Sheet Cell | src/components/SimilarStockButton/SimilarStockButton.tsx | src/components/SimilarStockButton/SimilarStockButton.stories.tsx | - | queued |
| B13 | 51 | Global Bubble | primitive | design-system/components/global-bubble.md | figma:vSr4NtEwPVs6wLpqCT5PtV#29503:80044 | - | Event Filter Dropdown, Popup Dialog, Promotional Badge | - | src/components/global-bubble/GlobalBubble.tsx | src/components/global-bubble/GlobalBubble.stories.tsx | Contextual callout with directional arrow placements implemented. | done |
| B13 | 52 | Button | primitive | design-system/components/button.md | figma:vSr4NtEwPVs6wLpqCT5PtV#1934:94 | - | Bottom Sheet, Bottom Sheet Footer Button, Empty State, Icon | Bottom Sheet, Bottom Sheet Cell, Bottom Sheet Footer Button, Broker Import Row, Empty State, Event Filter Dropdown, Event Filter Sheet, Event Name Label, Icon, Popup Dialog, Portfolio Add Action Button, Portfolio Add Action Section, Portfolio Fit Stock Sheet, Portfolio Manual Import Cell, Portfolio Stock Sheet Cell, Return Today Button, Similar Stock Button, Stock Card | src/components/button/Button.tsx | src/components/button/Button.stories.tsx | Implement as global primary fill/outline primitive; keep domain/sheet buttons distinct. | done |
| B14 | 53 | Empty State | feedback | design-system/components/empty-state.md | figma:vSr4NtEwPVs6wLpqCT5PtV#5862:221812 | - | Button | Button, Portfolio Add Action Section, Portfolio Fit Chart, Stock Card | src/components/empty-state/EmptyState.tsx | src/components/empty-state/EmptyState.stories.tsx | Keep standalone; compose optional CTA from Button and let Empty State own CTA width/placement. | done |
| B14 | 54 | Portfolio Add Action Section | layout | design-system/components/portfolio-add-action-section.md | E-050, E-049, E-054 | - | Button, Empty State, Icon, Portfolio Add Action Button | - | src/components/PortfolioAddActionSection/PortfolioAddActionSection.tsx | src/components/PortfolioAddActionSection/PortfolioAddActionSection.stories.tsx | - | queued |
| B14 | 55 | Portfolio Fit Chart | data-display | design-system/components/portfolio-fit-chart.md | E-011, E-012, E-013, E-014 | - | Empty State | - | src/components/PortfolioFitChart/PortfolioFitChart.tsx | src/components/PortfolioFitChart/PortfolioFitChart.stories.tsx | - | queued |
| B14 | 56 | Event Filter Dropdown | overlay | design-system/components/event-filter-dropdown.md | E-027 | - | Button, Icon | Global Bubble | src/components/EventFilterDropdown/EventFilterDropdown.tsx | src/components/EventFilterDropdown/EventFilterDropdown.stories.tsx | - | queued |
| B15 | 57 | Portfolio Manual Import Value Field | form-control | design-system/components/portfolio-manual-import-value-field.md | E-051 | - | Portfolio Manual Import Cell | Portfolio Manual Import Cell, Portfolio Manual Import Row | src/components/PortfolioManualImportValueField/PortfolioManualImportValueField.tsx | src/components/PortfolioManualImportValueField/PortfolioManualImportValueField.stories.tsx | - | queued |
| B15 | 58 | Selection Control | form-control | design-system/components/selection-control.md | figma:vSr4NtEwPVs6wLpqCT5PtV#22911:207990 | - | Bottom Sheet, Bottom Sheet Cell | Bottom Sheet, Bottom Sheet Cell | src/components/SelectionControl/SelectionControl.tsx | src/components/SelectionControl/SelectionControl.stories.tsx | - | queued |
| B15 | 59 | Switch | form-control | design-system/components/switch.md | figma:vSr4NtEwPVs6wLpqCT5PtV#8134:289037 | - | Bottom Sheet, Bottom Sheet Cell, Broker Import Row | Bottom Sheet, Bottom Sheet Cell, Broker Import Row | src/components/Switch/Switch.tsx | src/components/Switch/Switch.stories.tsx | - | queued |
| B15 | 60 | Broker Import Row | layout | design-system/components/broker-import-row.md | E-059, E-048, E-057, E-078 | - | Broker Icon, Button, Icon, Promotional Badge, Switch | Switch | src/components/BrokerImportRow/BrokerImportRow.tsx | src/components/BrokerImportRow/BrokerImportRow.stories.tsx | - | queued |
| B16 | 61 | Portfolio Manual Import Row | layout | design-system/components/portfolio-manual-import-row.md | E-053, E-052, E-051 | - | Portfolio Manual Import Cell, Portfolio Manual Import Value Field | Portfolio Manual Import Cell | src/components/PortfolioManualImportRow/PortfolioManualImportRow.tsx | src/components/PortfolioManualImportRow/PortfolioManualImportRow.stories.tsx | - | queued |
| B16 | 62 | Portfolio Manual Import Cell | data-display | design-system/components/portfolio-manual-import-cell.md | E-052, E-051 | - | Button, Icon, Portfolio Manual Import Row, Portfolio Manual Import Value Field | Portfolio Manual Import Row, Portfolio Manual Import Value Field | src/components/PortfolioManualImportCell/PortfolioManualImportCell.tsx | src/components/PortfolioManualImportCell/PortfolioManualImportCell.stories.tsx | - | queued |
| B16 | 63 | Stock Card | data-display | design-system/components/stock-card.md | figma:vSr4NtEwPVs6wLpqCT5PtV#51036:377157 | - | Button, Empty State, Event Table Row, Popup Dialog | - | src/components/stock-card/StockCard.tsx | src/components/stock-card/StockCard.stories.tsx | Feed/commentary card implemented as standalone market-data component. | done |
| B16 | 64 | Portfolio Stock Sheet Cell | data-display | design-system/components/portfolio-stock-sheet-cell.md | E-071, E-030, E-038 | - | Button, Portfolio Fit Stock Sheet, Portfolio Health Report Section, Similar Stock Button, Valuation Label | Portfolio Fit Stock Sheet | src/components/PortfolioStockSheetCell/PortfolioStockSheetCell.tsx | src/components/PortfolioStockSheetCell/PortfolioStockSheetCell.stories.tsx | - | queued |
| B17 | 65 | Portfolio Fit Stock Sheet | overlay | design-system/components/portfolio-fit-stock-sheet.md | E-032, E-033, E-030, E-070, E-071 | - | Button, Icon, Portfolio Attribute Label, Portfolio Fit Detail Table, Portfolio Stock Sheet Cell, Similar Stock Button | Portfolio Stock Sheet Cell | src/components/PortfolioFitStockSheet/PortfolioFitStockSheet.tsx | src/components/PortfolioFitStockSheet/PortfolioFitStockSheet.stories.tsx | - | queued |
| B17 | 66 | Bottom Sheet Cell | data-display | design-system/components/bottom-sheet-cell.md | E-064, E-065, E-066, E-067, E-078, E-079 | - | Bottom Sheet, Button, Icon, MyStock Utility Icon, New Badge, Selection Control, Switch | Bottom Sheet, Selection Control, Switch | src/components/BottomSheetCell/BottomSheetCell.tsx | src/components/BottomSheetCell/BottomSheetCell.stories.tsx | - | queued |
| B17 | 67 | Bottom Sheet Header | overlay | design-system/components/bottom-sheet-header.md | E-063 | - | Bottom Sheet, Icon | Bottom Sheet, Event Filter Sheet | src/components/BottomSheetHeader/BottomSheetHeader.tsx | src/components/BottomSheetHeader/BottomSheetHeader.stories.tsx | - | queued |
| B17 | 68 | Bottom Sheet | overlay | design-system/components/bottom-sheet.md | E-067, E-068, E-069, E-063, E-064, E-078, E-079 | - | Bottom Sheet Cell, Bottom Sheet Footer Button, Bottom Sheet Header, Button, Icon, Selection Control, Switch | Bottom Sheet Cell, Bottom Sheet Footer Button, Bottom Sheet Header, Button, Event Filter Sheet, Popup Dialog, Selection Control, Similar Stock Button, Switch | src/components/BottomSheet/BottomSheet.tsx | src/components/BottomSheet/BottomSheet.stories.tsx | - | queued |
| B18 | 69 | Popup Dialog | overlay | design-system/components/popup-dialog.md | figma:vSr4NtEwPVs6wLpqCT5PtV#5906:218640 | - | Bottom Sheet, Bottom Sheet Footer Button, Button, Portfolio Add Holding Sheet | Global Bubble, Stock Card | src/components/popup-dialog/PopupDialog.tsx | src/components/popup-dialog/PopupDialog.stories.tsx | Compact modal dialog variants implemented separately from Bottom Sheet. | done |
| B18 | 70 | Event Filter Sheet | overlay | design-system/components/event-filter-sheet.md | E-029 | - | Bottom Sheet, Bottom Sheet Header, Button, Event Filter Option, Icon | Event Filter Option | src/components/EventFilterSheet/EventFilterSheet.tsx | src/components/EventFilterSheet/EventFilterSheet.stories.tsx | - | queued |

## Batch Plan

| Batch | Components | Shared dependencies | Design sources | Dependency exit criteria | Validation | Status |
|---|---|---|---|---|---|---|
| B01 | Portfolio Attribute Label, Valuation Label, Market Filter Tab Strip, Edge Status Toggle | - | E-030; E-038; https://www.figma.com/design/vSr4NtEwPVs6wLpqCT5PtV/%E7%B1%8C%E7%A2%BC-K-%E7%B7%9A-ChipK--Design-System-Lab-?node-id=16405-224755&t=Jls6lg1T69Nfj29r-1#; E-009 | all listed dependencies are done, reused, or accepted blocked decisions | co-located stories, source URLs, verification log | queued |
| B02 | Portfolio Preferred Stock Title, Market Tab Strip, Event Table Row, Portfolio Health Report Section | Market Filter Tab Strip | E-034; E-004, E-060, E-061; E-024, E-025; E-042, E-043, E-044 | all listed dependencies are done, reused, or accepted blocked decisions | co-located stories, source URLs, verification log | queued |
| B03 | Realtime Quote Row, Portfolio Health Check Row, Quote List Column Header, Promotional Badge | - | E-005, E-006, E-074; E-041; implementation, E-004; E-057, E-059 | all listed dependencies are done, reused, or accepted blocked decisions | co-located stories, source URLs, verification log | queued |
| B04 | New Badge, Asset Trend Chart, Broker Import Header, Broker Selector Bar | - | E-065, E-064; E-091; E-058; E-004, E-048 | all listed dependencies are done, reused, or accepted blocked decisions | co-located stories, source URLs, verification log | queued |
| B05 | Icon, Main Force Weather Indicator, Broker Icon, Portfolio Fit Assessment Indicator | Button | implementation; E-077; E-048; E-031 | all listed dependencies are done, reused, or accepted blocked decisions | co-located stories, source URLs, verification log | queued |
| B06 | Quarter Line Status Icon, Graphic, MyStock Utility Icon, Top App Bar | Icon | E-039; implementation; E-065, E-066; figma:vSr4NtEwPVs6wLpqCT5PtV#29202:30912 | all listed dependencies are done, reused, or accepted blocked decisions | co-located stories, source URLs, verification log | queued |
| B07 | Floating Action Pill, Portfolio Preferred Stock Top Bar, Relative Date Label, Stock Calendar | Icon | figma:vSr4NtEwPVs6wLpqCT5PtV#29202:88715; figma:vSr4NtEwPVs6wLpqCT5PtV#51034:5228; E-035; E-020, E-021; figma:vSr4NtEwPVs6wLpqCT5PtV#51054:298722 | all listed dependencies are done, reused, or accepted blocked decisions | co-located stories, source URLs, verification log | queued |
| B08 | Realtime Quote Tile, Portfolio Preferred Stock Row, Portfolio Fit Stock Row, Bottom Navigation | Icon, Main Force Weather Indicator, Realtime Quote Row, Portfolio Attribute Label, Portfolio Fit Assessment Indicator | figma:vSr4NtEwPVs6wLpqCT5PtV#18095:175915; E-037; E-018, E-019, E-030, E-031; E-007 | all listed dependencies are done, reused, or accepted blocked decisions | co-located stories, source URLs, verification log | queued |
| B09 | Portfolio Fit Detail Table, Main Force Trade Tag, Stock Label, Main Force Stock Row | Icon, Portfolio Attribute Label, Promotional Badge, Main Force Weather Indicator, Portfolio Fit Stock Row | E-033, E-072, E-073; E-075; figma:vSr4NtEwPVs6wLpqCT5PtV#47327:64981; E-076, E-075, E-077 | all listed dependencies are done, reused, or accepted blocked decisions | co-located stories, source URLs, verification log | queued |
| B10 | Portfolio Fit List Header, Portfolio Preferred Stock List Header, Portfolio Health Check Cell, Portfolio Add Holding Sheet | Icon, Portfolio Fit Stock Row, Graphic, Quarter Line Status Icon, Valuation Label | E-017; E-036; E-040; E-054, E-055, E-056, E-050 | all listed dependencies are done, reused, or accepted blocked decisions | co-located stories, source URLs, verification log | queued |
| B11 | Broker Import Menu, Portfolio Preference Header, Portfolio Profit Summary, Trend Analysis Header | Icon | E-060, E-062; E-015, E-016; E-045; E-090 | all listed dependencies are done, reused, or accepted blocked decisions | co-located stories, source URLs, verification log | queued |
| B12 | Event Filter Option, Event Name Label, Bottom Sheet Footer Button, Portfolio Add Action Button | Event Filter Sheet, Button, Bottom Sheet, Icon | E-028; E-022, E-023; E-069, E-067; E-049 | all listed dependencies are done, reused, or accepted blocked decisions | co-located stories, source URLs, verification log | queued |
| B13 | Return Today Button, Similar Stock Button, Global Bubble, Button | Icon, Bottom Sheet, Event Filter Dropdown, Popup Dialog, Promotional Badge, Bottom Sheet Footer Button, Empty State | E-026; E-070, E-032; figma:vSr4NtEwPVs6wLpqCT5PtV#29503:80044; figma:vSr4NtEwPVs6wLpqCT5PtV#1934:94 | all listed dependencies are done, reused, or accepted blocked decisions | co-located stories, source URLs, verification log | queued |
| B14 | Empty State, Portfolio Add Action Section, Portfolio Fit Chart, Event Filter Dropdown | Button, Icon, Portfolio Add Action Button | figma:vSr4NtEwPVs6wLpqCT5PtV#5862:221812; E-050, E-049, E-054; E-011, E-012, E-013, E-014; E-027 | all listed dependencies are done, reused, or accepted blocked decisions | co-located stories, source URLs, verification log | queued |
| B15 | Portfolio Manual Import Value Field, Selection Control, Switch, Broker Import Row | Portfolio Manual Import Cell, Bottom Sheet, Bottom Sheet Cell, Broker Icon, Button, Icon, Promotional Badge | E-051; figma:vSr4NtEwPVs6wLpqCT5PtV#22911:207990; figma:vSr4NtEwPVs6wLpqCT5PtV#8134:289037; E-059, E-048, E-057, E-078 | all listed dependencies are done, reused, or accepted blocked decisions | co-located stories, source URLs, verification log | queued |
| B16 | Portfolio Manual Import Row, Portfolio Manual Import Cell, Stock Card, Portfolio Stock Sheet Cell | Portfolio Manual Import Value Field, Button, Icon, Empty State, Event Table Row, Popup Dialog, Portfolio Fit Stock Sheet, Portfolio Health Report Section, Similar Stock Button, Valuation Label | E-053, E-052, E-051; E-052, E-051; figma:vSr4NtEwPVs6wLpqCT5PtV#51036:377157; E-071, E-030, E-038 | all listed dependencies are done, reused, or accepted blocked decisions | co-located stories, source URLs, verification log | queued |
| B17 | Portfolio Fit Stock Sheet, Bottom Sheet Cell, Bottom Sheet Header, Bottom Sheet | Button, Icon, Portfolio Attribute Label, Portfolio Fit Detail Table, Portfolio Stock Sheet Cell, Similar Stock Button, MyStock Utility Icon, New Badge, Selection Control, Switch, Bottom Sheet Footer Button | E-032, E-033, E-030, E-070, E-071; E-064, E-065, E-066, E-067, E-078, E-079; E-063; E-067, E-068, E-069, E-063, E-064, E-078, E-079 | all listed dependencies are done, reused, or accepted blocked decisions | co-located stories, source URLs, verification log | queued |
| B18 | Popup Dialog, Event Filter Sheet | Bottom Sheet, Bottom Sheet Footer Button, Button, Portfolio Add Holding Sheet, Bottom Sheet Header, Event Filter Option, Icon | figma:vSr4NtEwPVs6wLpqCT5PtV#5906:218640; E-029 | all listed dependencies are done, reused, or accepted blocked decisions | co-located stories, source URLs, verification log | queued |

## Decisions

| Date | Item | Decision | Reason | Follow-up |
|---|---|---|---|---|
|  |  |  |  |  |

## Figma Export Addon

| Requirement | Detected value | Status | Notes |
|---|---|---|---|
| Storybook `^10` |  |  |  |
| React |  |  |  |
| Bundled addon asset | `assets/figma-export-addon/` |  |  |
| Product vendor path | `.storybook/vendor/figma-export-addon/` |  |  |
| Project config | `.storybook/figma-export.config.ts` |  |  |
| `@storybook/icons` |  |  |  |
| Addon package |  |  |  |
| `.storybook/main.*` registration |  |  |  |
| `.storybook/preview.*` decorator/globals |  |  |  |
| Review helper / status API |  |  |  |
| Token prefix/options |  |  |  |

## Verification Log

| Batch | Command or check | Result | Notes |
|---|---|---|---|
|  |  |  |  |
