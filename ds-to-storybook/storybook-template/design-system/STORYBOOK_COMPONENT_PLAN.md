# Storybook Component Build Plan

- Design-system root: `/Users/a04-0214-0320/Public/works/cm-chipK/ds-lab/project/design-system`
- Package root: `/Users/a04-0214-0320/Public/works/cm-chipK/ds-lab/project`
- Source trace: `/Users/a04-0214-0320/Public/works/cm-chipK/ds-lab/project/design-system/STORYBOOK_SOURCE_TRACE.md`
- Components ordered: 70
- Batches: 18
- Skipped components: 1
- Dependency cycles: 25

## Recommended Build Order

| Order | Batch | Component | Category | Depends on | Used by | Story source URL | Build reason |
|---|---|---|---|---|---|---|---|
| 1 | B01 | Portfolio Attribute Label | primitive | - | Main Force Trade Tag, Portfolio Fit Stock Row, Portfolio Fit Stock Sheet | - | core dependency tier; used by 3 components |
| 2 | B01 | Valuation Label | primitive | - | Portfolio Health Check Cell, Portfolio Stock Sheet Cell | - | core dependency tier; used by 2 components |
| 3 | B01 | Market Filter Tab Strip | primitive | - | Market Tab Strip | https://www.figma.com/design/vSr4NtEwPVs6wLpqCT5PtV/%E7%B1%8C%E7%A2%BC-K-%E7%B7%9A-ChipK--Design-System-Lab-?node-id=16405-224755&t=Jls6lg1T69Nfj29r-1# | core dependency tier; used by 1 component |
| 4 | B01 | Edge Status Toggle | primitive | - | - | - | core dependency tier |
| 5 | B02 | Portfolio Preferred Stock Title | primitive | - | - | - | core dependency tier |
| 6 | B02 | Market Tab Strip | primitive | Market Filter Tab Strip | - | - | core dependency tier; after 1 dependency |
| 7 | B02 | Event Table Row | layout | - | Stock Card | - | used by 1 component |
| 8 | B02 | Portfolio Health Report Section | layout | - | Portfolio Stock Sheet Cell | - | used by 1 component |
| 9 | B03 | Realtime Quote Row | layout | - | Realtime Quote Tile | - | used by 1 component |
| 10 | B03 | Portfolio Health Check Row | layout | - | - | - | no dependencies detected |
| 11 | B03 | Quote List Column Header | layout | - | - | - | no dependencies detected |
| 12 | B03 | Promotional Badge | data-display | - | Broker Import Row, Global Bubble, Stock Label | - | used by 3 components |
| 13 | B04 | New Badge | data-display | - | Bottom Sheet Cell | - | used by 1 component |
| 14 | B04 | Asset Trend Chart | data-display | - | - | - | no dependencies detected |
| 15 | B04 | Broker Import Header | composite | - | - | - | no dependencies detected |
| 16 | B04 | Broker Selector Bar | unknown | - | - | - | no dependencies detected |
| 17 | B05 | Icon | primitive | Button | Bottom Navigation, Bottom Sheet, Bottom Sheet Cell, Bottom Sheet Header, Broker Icon, Broker Import Menu, Broker Import Row, Button, Event Filter Dropdown, Event Filter Sheet, Floating Action Pill, Graphic, Main Force Stock Row, Main Force Trade Tag, Main Force Weather Indicator, MyStock Utility Icon, Portfolio Add Action Button, Portfolio Add Action Section, Portfolio Add Holding Sheet, Portfolio Fit Assessment Indicator, Portfolio Fit Detail Table, Portfolio Fit List Header, Portfolio Fit Stock Sheet, Portfolio Health Check Cell, Portfolio Manual Import Cell, Portfolio Preference Header, Portfolio Preferred Stock List Header, Portfolio Preferred Stock Row, Portfolio Preferred Stock Top Bar, Portfolio Profit Summary, Quarter Line Status Icon, Realtime Quote Tile, Relative Date Label, Return Today Button, Similar Stock Button, Stock Calendar, Top App Bar, Trend Analysis Header | - | core dependency tier; used by 38 components; after 1 dependency; cycle fallback |
| 18 | B05 | Main Force Weather Indicator | primitive | Icon | Main Force Stock Row, Realtime Quote Tile | - | core dependency tier; used by 2 components; after 1 dependency |
| 19 | B05 | Broker Icon | primitive | Icon | Broker Import Row | - | core dependency tier; used by 1 component; after 1 dependency |
| 20 | B05 | Portfolio Fit Assessment Indicator | primitive | Icon | Portfolio Fit Stock Row | - | core dependency tier; used by 1 component; after 1 dependency |
| 21 | B06 | Quarter Line Status Icon | primitive | Icon | Portfolio Health Check Cell | - | core dependency tier; used by 1 component; after 1 dependency |
| 22 | B06 | Graphic | primitive | Icon | Portfolio Health Check Cell | - | core dependency tier; used by 1 component; after 1 dependency |
| 23 | B06 | MyStock Utility Icon | primitive | Icon | Bottom Sheet Cell | - | core dependency tier; used by 1 component; after 1 dependency |
| 24 | B06 | Top App Bar | primitive | Icon | - | - | core dependency tier; after 1 dependency |
| 25 | B07 | Floating Action Pill | primitive | Icon | - | - | core dependency tier; after 1 dependency |
| 26 | B07 | Portfolio Preferred Stock Top Bar | primitive | Icon | - | - | core dependency tier; after 1 dependency |
| 27 | B07 | Relative Date Label | primitive | Icon | - | - | core dependency tier; after 1 dependency |
| 28 | B07 | Stock Calendar | primitive | Icon | - | https://www.figma.com/design/vSr4NtEwPVs6wLpqCT5PtV/%E7%B1%8C%E7%A2%BC-K-%E7%B7%9A-ChipK--Design-System-Lab-?node-id=51054-298722&t=buNo31ra500KKh9O-1 | core dependency tier; after 1 dependency |
| 29 | B08 | Realtime Quote Tile | primitive | Icon, Main Force Weather Indicator, Realtime Quote Row | - | - | core dependency tier; after 3 dependencies |
| 30 | B08 | Portfolio Preferred Stock Row | layout | Icon | - | - | after 1 dependency |
| 31 | B08 | Portfolio Fit Stock Row | layout | Portfolio Attribute Label, Portfolio Fit Assessment Indicator | Main Force Stock Row, Portfolio Fit List Header | - | used by 2 components; after 2 dependencies |
| 32 | B08 | Bottom Navigation | navigation | Icon | - | - | after 1 dependency |
| 33 | B09 | Portfolio Fit Detail Table | data-display | Icon | Portfolio Fit Stock Sheet | - | used by 1 component; after 1 dependency |
| 34 | B09 | Main Force Trade Tag | data-display | Icon, Portfolio Attribute Label | Main Force Stock Row, Stock Label | - | used by 2 components; after 2 dependencies |
| 35 | B09 | Stock Label | primitive | Main Force Trade Tag, Promotional Badge | - | - | core dependency tier; after 2 dependencies |
| 36 | B09 | Main Force Stock Row | layout | Icon, Main Force Trade Tag, Main Force Weather Indicator, Portfolio Fit Stock Row | - | - | after 4 dependencies |
| 37 | B10 | Portfolio Fit List Header | data-display | Icon, Portfolio Fit Stock Row | Portfolio Preferred Stock List Header | - | used by 1 component; after 2 dependencies |
| 38 | B10 | Portfolio Preferred Stock List Header | data-display | Icon, Portfolio Fit List Header | - | - | after 2 dependencies |
| 39 | B10 | Portfolio Health Check Cell | data-display | Graphic, Icon, Quarter Line Status Icon, Valuation Label | - | - | after 4 dependencies |
| 40 | B10 | Portfolio Add Holding Sheet | overlay | Icon | Popup Dialog | - | used by 1 component; after 1 dependency |
| 41 | B11 | Broker Import Menu | overlay | Icon | - | - | after 1 dependency |
| 42 | B11 | Portfolio Preference Header | composite | Icon | - | - | after 1 dependency |
| 43 | B11 | Portfolio Profit Summary | composite | Icon | - | - | after 1 dependency |
| 44 | B11 | Trend Analysis Header | composite | Icon | - | - | after 1 dependency |
| 45 | B12 | Event Filter Option | primitive | Event Filter Sheet | Event Filter Sheet | - | core dependency tier; used by 1 component; after 1 dependency; cycle fallback |
| 46 | B12 | Event Name Label | primitive | Button | - | - | core dependency tier; after 1 dependency; cycle fallback |
| 47 | B12 | Bottom Sheet Footer Button | primitive | Bottom Sheet, Button | Bottom Sheet, Button, Popup Dialog | - | core dependency tier; used by 3 components; after 2 dependencies; cycle fallback |
| 48 | B12 | Portfolio Add Action Button | primitive | Button, Icon | Portfolio Add Action Section | - | core dependency tier; used by 1 component; after 2 dependencies; cycle fallback |
| 49 | B13 | Return Today Button | primitive | Button, Icon | - | - | core dependency tier; after 2 dependencies; cycle fallback |
| 50 | B13 | Similar Stock Button | primitive | Bottom Sheet, Button, Icon | Portfolio Fit Stock Sheet, Portfolio Stock Sheet Cell | - | core dependency tier; used by 2 components; after 3 dependencies; cycle fallback |
| 51 | B13 | Global Bubble | primitive | Event Filter Dropdown, Popup Dialog, Promotional Badge | - | - | core dependency tier; after 3 dependencies; cycle fallback |
| 52 | B13 | Button | primitive | Bottom Sheet, Bottom Sheet Footer Button, Empty State, Icon | Bottom Sheet, Bottom Sheet Cell, Bottom Sheet Footer Button, Broker Import Row, Empty State, Event Filter Dropdown, Event Filter Sheet, Event Name Label, Icon, Popup Dialog, Portfolio Add Action Button, Portfolio Add Action Section, Portfolio Fit Stock Sheet, Portfolio Manual Import Cell, Portfolio Stock Sheet Cell, Return Today Button, Similar Stock Button, Stock Card | - | core dependency tier; used by 18 components; after 4 dependencies; cycle fallback |
| 53 | B14 | Empty State | feedback | Button | Button, Portfolio Add Action Section, Portfolio Fit Chart, Stock Card | - | used by 4 components; after 1 dependency |
| 54 | B14 | Portfolio Add Action Section | layout | Button, Empty State, Icon, Portfolio Add Action Button | - | - | after 4 dependencies |
| 55 | B14 | Portfolio Fit Chart | data-display | Empty State | - | - | after 1 dependency |
| 56 | B14 | Event Filter Dropdown | overlay | Button, Icon | Global Bubble | - | used by 1 component; after 2 dependencies |
| 57 | B15 | Portfolio Manual Import Value Field | form-control | Portfolio Manual Import Cell | Portfolio Manual Import Cell, Portfolio Manual Import Row | - | used by 2 components; after 1 dependency; cycle fallback |
| 58 | B15 | Selection Control | form-control | Bottom Sheet, Bottom Sheet Cell | Bottom Sheet, Bottom Sheet Cell | - | used by 2 components; after 2 dependencies; cycle fallback |
| 59 | B15 | Switch | form-control | Bottom Sheet, Bottom Sheet Cell, Broker Import Row | Bottom Sheet, Bottom Sheet Cell, Broker Import Row | - | used by 3 components; after 3 dependencies; cycle fallback |
| 60 | B15 | Broker Import Row | layout | Broker Icon, Button, Icon, Promotional Badge, Switch | Switch | - | used by 1 component; after 5 dependencies |
| 61 | B16 | Portfolio Manual Import Row | layout | Portfolio Manual Import Cell, Portfolio Manual Import Value Field | Portfolio Manual Import Cell | - | used by 1 component; after 2 dependencies; cycle fallback |
| 62 | B16 | Portfolio Manual Import Cell | data-display | Button, Icon, Portfolio Manual Import Row, Portfolio Manual Import Value Field | Portfolio Manual Import Row, Portfolio Manual Import Value Field | - | used by 2 components; after 4 dependencies |
| 63 | B16 | Stock Card | data-display | Button, Empty State, Event Table Row, Popup Dialog | - | - | after 4 dependencies; cycle fallback |
| 64 | B16 | Portfolio Stock Sheet Cell | data-display | Button, Portfolio Fit Stock Sheet, Portfolio Health Report Section, Similar Stock Button, Valuation Label | Portfolio Fit Stock Sheet | - | used by 1 component; after 5 dependencies; cycle fallback |
| 65 | B17 | Portfolio Fit Stock Sheet | overlay | Button, Icon, Portfolio Attribute Label, Portfolio Fit Detail Table, Portfolio Stock Sheet Cell, Similar Stock Button | Portfolio Stock Sheet Cell | - | used by 1 component; after 6 dependencies |
| 66 | B17 | Bottom Sheet Cell | data-display | Bottom Sheet, Button, Icon, MyStock Utility Icon, New Badge, Selection Control, Switch | Bottom Sheet, Selection Control, Switch | - | used by 3 components; after 7 dependencies; cycle fallback |
| 67 | B17 | Bottom Sheet Header | overlay | Bottom Sheet, Icon | Bottom Sheet, Event Filter Sheet | - | used by 2 components; after 2 dependencies; cycle fallback |
| 68 | B17 | Bottom Sheet | overlay | Bottom Sheet Cell, Bottom Sheet Footer Button, Bottom Sheet Header, Button, Icon, Selection Control, Switch | Bottom Sheet Cell, Bottom Sheet Footer Button, Bottom Sheet Header, Button, Event Filter Sheet, Popup Dialog, Selection Control, Similar Stock Button, Switch | - | used by 9 components; after 7 dependencies |
| 69 | B18 | Popup Dialog | overlay | Bottom Sheet, Bottom Sheet Footer Button, Button, Portfolio Add Holding Sheet | Global Bubble, Stock Card | - | used by 2 components; after 4 dependencies |
| 70 | B18 | Event Filter Sheet | overlay | Bottom Sheet, Bottom Sheet Header, Button, Event Filter Option, Icon | Event Filter Option | - | used by 1 component; after 5 dependencies |

## Batch Plan

| Batch | Components | Shared dependencies | Tiers | Rationale | Exit criteria |
|---|---|---|---|---|---|
| B01 | Portfolio Attribute Label, Valuation Label, Market Filter Tab Strip, Edge Status Toggle | - | primitive | Establish primitive components before composed patterns. | component/page folder, co-located story, source URL parameters, queue status, and verification log updated |
| B02 | Portfolio Preferred Stock Title, Market Tab Strip, Event Table Row, Portfolio Health Report Section | Market Filter Tab Strip | primitive, layout | Establish primitive components before composed patterns. | component/page folder, co-located story, source URL parameters, queue status, and verification log updated |
| B03 | Realtime Quote Row, Portfolio Health Check Row, Quote List Column Header, Promotional Badge | - | layout, data-display | Continue dependency-ordered layout implementation. | component/page folder, co-located story, source URL parameters, queue status, and verification log updated |
| B04 | New Badge, Asset Trend Chart, Broker Import Header, Broker Selector Bar | - | data-display, composite, unknown | Build composed patterns after their lower-level dependencies are available. | component/page folder, co-located story, source URL parameters, queue status, and verification log updated |
| B05 | Icon, Main Force Weather Indicator, Broker Icon, Portfolio Fit Assessment Indicator | Button | primitive | Establish primitive components before composed patterns. | component/page folder, co-located story, source URL parameters, queue status, and verification log updated |
| B06 | Quarter Line Status Icon, Graphic, MyStock Utility Icon, Top App Bar | Icon | primitive | Establish primitive components before composed patterns. | component/page folder, co-located story, source URL parameters, queue status, and verification log updated |
| B07 | Floating Action Pill, Portfolio Preferred Stock Top Bar, Relative Date Label, Stock Calendar | Icon | primitive | Establish primitive components before composed patterns. | component/page folder, co-located story, source URL parameters, queue status, and verification log updated |
| B08 | Realtime Quote Tile, Portfolio Preferred Stock Row, Portfolio Fit Stock Row, Bottom Navigation | Icon, Main Force Weather Indicator, Realtime Quote Row, Portfolio Attribute Label, Portfolio Fit Assessment Indicator | primitive, layout, navigation | Establish primitive components before composed patterns. | component/page folder, co-located story, source URL parameters, queue status, and verification log updated |
| B09 | Portfolio Fit Detail Table, Main Force Trade Tag, Stock Label, Main Force Stock Row | Icon, Portfolio Attribute Label, Promotional Badge, Main Force Weather Indicator, Portfolio Fit Stock Row | data-display, primitive, layout | Establish data-display components before composed patterns. | component/page folder, co-located story, source URL parameters, queue status, and verification log updated |
| B10 | Portfolio Fit List Header, Portfolio Preferred Stock List Header, Portfolio Health Check Cell, Portfolio Add Holding Sheet | Icon, Portfolio Fit Stock Row, Graphic, Quarter Line Status Icon, Valuation Label | data-display, overlay | Continue dependency-ordered data-display implementation. | component/page folder, co-located story, source URL parameters, queue status, and verification log updated |
| B11 | Broker Import Menu, Portfolio Preference Header, Portfolio Profit Summary, Trend Analysis Header | Icon | overlay, composite | Build composed patterns after their lower-level dependencies are available. | component/page folder, co-located story, source URL parameters, queue status, and verification log updated |
| B12 | Event Filter Option, Event Name Label, Bottom Sheet Footer Button, Portfolio Add Action Button | Event Filter Sheet, Button, Bottom Sheet, Icon | primitive | Establish primitive components before composed patterns. | component/page folder, co-located story, source URL parameters, queue status, and verification log updated |
| B13 | Return Today Button, Similar Stock Button, Global Bubble, Button | Icon, Bottom Sheet, Event Filter Dropdown, Popup Dialog, Promotional Badge, Bottom Sheet Footer Button, Empty State | primitive | Establish primitive components before composed patterns. | component/page folder, co-located story, source URL parameters, queue status, and verification log updated |
| B14 | Empty State, Portfolio Add Action Section, Portfolio Fit Chart, Event Filter Dropdown | Button, Icon, Portfolio Add Action Button | feedback, layout, data-display, overlay | Continue dependency-ordered feedback implementation. | component/page folder, co-located story, source URL parameters, queue status, and verification log updated |
| B15 | Portfolio Manual Import Value Field, Selection Control, Switch, Broker Import Row | Portfolio Manual Import Cell, Bottom Sheet, Bottom Sheet Cell, Broker Icon, Button, Icon, Promotional Badge | form-control, layout | Continue dependency-ordered form-control implementation. | component/page folder, co-located story, source URL parameters, queue status, and verification log updated |
| B16 | Portfolio Manual Import Row, Portfolio Manual Import Cell, Stock Card, Portfolio Stock Sheet Cell | Portfolio Manual Import Value Field, Button, Icon, Empty State, Event Table Row, Popup Dialog, Portfolio Fit Stock Sheet, Portfolio Health Report Section, Similar Stock Button, Valuation Label | layout, data-display | Continue dependency-ordered layout implementation. | component/page folder, co-located story, source URL parameters, queue status, and verification log updated |
| B17 | Portfolio Fit Stock Sheet, Bottom Sheet Cell, Bottom Sheet Header, Bottom Sheet | Button, Icon, Portfolio Attribute Label, Portfolio Fit Detail Table, Portfolio Stock Sheet Cell, Similar Stock Button, MyStock Utility Icon, New Badge, Selection Control, Switch, Bottom Sheet Footer Button | overlay, data-display | Continue dependency-ordered overlay implementation. | component/page folder, co-located story, source URL parameters, queue status, and verification log updated |
| B18 | Popup Dialog, Event Filter Sheet | Bottom Sheet, Bottom Sheet Footer Button, Button, Portfolio Add Holding Sheet, Bottom Sheet Header, Event Filter Option, Icon | overlay | Continue dependency-ordered overlay implementation. | component/page folder, co-located story, source URL parameters, queue status, and verification log updated |

## Dependency Details

| Component | Depends on | Dependency reason | Source refs | Spec file |
|---|---|---|---|---|
| Portfolio Attribute Label | - | - | E-030 | design-system/components/portfolio-attribute-label.md |
| Valuation Label | - | - | E-038 | design-system/components/valuation-label.md |
| Market Filter Tab Strip | - | - | https://www.figma.com/design/vSr4NtEwPVs6wLpqCT5PtV/%E7%B1%8C%E7%A2%BC-K-%E7%B7%9A-ChipK--Design-System-Lab-?node-id=16405-224755&t=Jls6lg1T69Nfj29r-1# | design-system/components/market-filter-tab-strip.md |
| Edge Status Toggle | - | - | E-009 | design-system/components/edge-status-toggle.md |
| Portfolio Preferred Stock Title | - | - | E-034 | design-system/components/portfolio-preferred-stock-title.md |
| Market Tab Strip | Market Filter Tab Strip | Market Filter Tab Strip: dependency phrase in component spec | E-004, E-060, E-061 | design-system/components/market-tab-strip.md |
| Event Table Row | - | - | E-024, E-025 | design-system/components/event-table-row.md |
| Portfolio Health Report Section | - | - | E-042, E-043, E-044 | design-system/components/portfolio-health-report-section.md |
| Realtime Quote Row | - | - | E-005, E-006, E-074 | design-system/components/realtime-quote-row.md |
| Portfolio Health Check Row | - | - | E-041 | design-system/components/portfolio-health-check-row.md |
| Quote List Column Header | - | - | implementation, E-004 | design-system/components/quote-list-column-header.md |
| Promotional Badge | - | - | E-057, E-059 | design-system/components/promotional-badge.md |
| New Badge | - | - | E-065, E-064 | design-system/components/new-badge.md |
| Asset Trend Chart | - | - | E-091 | design-system/components/asset-trend-chart.md |
| Broker Import Header | - | - | E-058 | design-system/components/broker-import-header.md |
| Broker Selector Bar | - | - | E-004, E-048 | - |
| Icon | Button | Button: dependency phrase in component spec | implementation | design-system/components/icon.md |
| Main Force Weather Indicator | Icon | Icon: dependency phrase in component spec | E-077 | design-system/components/main-force-weather-indicator.md |
| Broker Icon | Icon | Icon: component name composition; dependency phrase in component spec | E-048 | design-system/components/broker-icon.md |
| Portfolio Fit Assessment Indicator | Icon | Icon: explicit dependency/composition section; dependency phrase in component spec | E-031 | design-system/components/portfolio-fit-assessment-indicator.md |
| Quarter Line Status Icon | Icon | Icon: explicit dependency/composition section; component name composition; dependency phrase in component spec | E-039 | design-system/components/quarter-line-status-icon.md |
| Graphic | Icon | Icon: dependency phrase in component spec | implementation | design-system/components/graphic.md |
| MyStock Utility Icon | Icon | Icon: explicit dependency/composition section; component name composition; dependency phrase in component spec | E-065, E-066 | design-system/components/mystock-utility-icon.md |
| Top App Bar | Icon | Icon: explicit dependency/composition section; dependency phrase in component spec | figma:vSr4NtEwPVs6wLpqCT5PtV#29202:30912 | design-system/components/top-app-bar.md |
| Floating Action Pill | Icon | Icon: explicit dependency/composition section; dependency phrase in component spec | figma:vSr4NtEwPVs6wLpqCT5PtV#29202:88715; figma:vSr4NtEwPVs6wLpqCT5PtV#51034:5228 | design-system/components/floating-action-pill.md |
| Portfolio Preferred Stock Top Bar | Icon | Icon: explicit dependency/composition section; dependency phrase in component spec | E-035 | design-system/components/portfolio-preferred-stock-top-bar.md |
| Relative Date Label | Icon | Icon: explicit dependency/composition section; dependency phrase in component spec | E-020, E-021 | design-system/components/relative-date-label.md |
| Stock Calendar | Icon | Icon: explicit dependency/composition section; dependency phrase in component spec | figma:vSr4NtEwPVs6wLpqCT5PtV#51054:298722 | design-system/components/stock-calendar.md |
| Realtime Quote Tile | Icon, Main Force Weather Indicator, Realtime Quote Row | Main Force Weather Indicator: dependency phrase in component spec; Realtime Quote Row: dependency phrase in component spec; Icon: dependency phrase in component spec | figma:vSr4NtEwPVs6wLpqCT5PtV#18095:175915 | design-system/components/realtime-quote-tile.md |
| Portfolio Preferred Stock Row | Icon | Icon: explicit dependency/composition section; dependency phrase in component spec | E-037 | design-system/components/portfolio-preferred-stock-row.md |
| Portfolio Fit Stock Row | Portfolio Attribute Label, Portfolio Fit Assessment Indicator | Portfolio Fit Assessment Indicator: explicit dependency/composition section; dependency phrase in component spec; Portfolio Attribute Label: explicit dependency/composition section; dependency phrase in component spec | E-018, E-019, E-030, E-031 | design-system/components/portfolio-fit-stock-row.md |
| Bottom Navigation | Icon | Icon: explicit dependency/composition section | E-007 | design-system/components/bottom-navigation.md |
| Portfolio Fit Detail Table | Icon | Icon: explicit dependency/composition section; dependency phrase in component spec | E-033, E-072, E-073 | design-system/components/portfolio-fit-detail-table.md |
| Main Force Trade Tag | Icon, Portfolio Attribute Label | Portfolio Attribute Label: dependency phrase in component spec; Icon: dependency phrase in component spec | E-075 | design-system/components/main-force-trade-tag.md |
| Stock Label | Main Force Trade Tag, Promotional Badge | Main Force Trade Tag: dependency phrase in component spec; Promotional Badge: dependency phrase in component spec | figma:vSr4NtEwPVs6wLpqCT5PtV#47327:64981 | design-system/components/stock-label.md |
| Main Force Stock Row | Icon, Main Force Trade Tag, Main Force Weather Indicator, Portfolio Fit Stock Row | Main Force Weather Indicator: explicit dependency/composition section; dependency phrase in component spec; Portfolio Fit Stock Row: dependency phrase in component spec; Main Force Trade Tag: explicit dependency/composition section; dependency phrase in component spec; Icon: dependency phrase in component spec | E-076, E-075, E-077 | design-system/components/main-force-stock-row.md |
| Portfolio Fit List Header | Icon, Portfolio Fit Stock Row | Portfolio Fit Stock Row: dependency phrase in component spec; Icon: explicit dependency/composition section | E-017 | design-system/components/portfolio-fit-list-header.md |
| Portfolio Preferred Stock List Header | Icon, Portfolio Fit List Header | Portfolio Fit List Header: dependency phrase in component spec; Icon: dependency phrase in component spec | E-036 | design-system/components/portfolio-preferred-stock-list-header.md |
| Portfolio Health Check Cell | Graphic, Icon, Quarter Line Status Icon, Valuation Label | Quarter Line Status Icon: explicit dependency/composition section; dependency phrase in component spec; Valuation Label: explicit dependency/composition section; dependency phrase in component spec; Graphic: explicit dependency/composition section; Icon: explicit dependency/composition section; dependency phrase in component spec | E-040 | design-system/components/portfolio-health-check-cell.md |
| Portfolio Add Holding Sheet | Icon | Icon: explicit dependency/composition section | E-054, E-055, E-056, E-050 | design-system/components/portfolio-add-holding-sheet.md |
| Broker Import Menu | Icon | Icon: dependency phrase in component spec | E-060, E-062 | design-system/components/broker-import-menu.md |
| Portfolio Preference Header | Icon | Icon: explicit dependency/composition section | E-015, E-016 | design-system/components/portfolio-preference-header.md |
| Portfolio Profit Summary | Icon | Icon: explicit dependency/composition section; dependency phrase in component spec | E-045 | design-system/components/portfolio-profit-summary.md |
| Trend Analysis Header | Icon | Icon: explicit dependency/composition section; dependency phrase in component spec | E-090 | design-system/components/trend-analysis-header.md |
| Event Filter Option | Event Filter Sheet | Event Filter Sheet: dependency phrase in component spec | E-028 | design-system/components/event-filter-option.md |
| Event Name Label | Button | Button: dependency phrase in component spec | E-022, E-023 | design-system/components/event-name-label.md |
| Bottom Sheet Footer Button | Bottom Sheet, Button | Bottom Sheet: component name composition; dependency phrase in component spec; Button: explicit dependency/composition section; component name composition | E-069, E-067 | design-system/components/bottom-sheet-footer-button.md |
| Portfolio Add Action Button | Button, Icon | Button: explicit dependency/composition section; component name composition; dependency phrase in component spec; Icon: explicit dependency/composition section; dependency phrase in component spec | E-049 | design-system/components/portfolio-add-action-button.md |
| Return Today Button | Button, Icon | Button: explicit dependency/composition section; component name composition; dependency phrase in component spec; Icon: dependency phrase in component spec | E-026 | design-system/components/return-today-button.md |
| Similar Stock Button | Bottom Sheet, Button, Icon | Bottom Sheet: dependency phrase in component spec; Button: explicit dependency/composition section; component name composition; dependency phrase in component spec; Icon: explicit dependency/composition section; dependency phrase in component spec | E-070, E-032 | design-system/components/similar-stock-button.md |
| Global Bubble | Event Filter Dropdown, Popup Dialog, Promotional Badge | Event Filter Dropdown: dependency phrase in component spec; Promotional Badge: dependency phrase in component spec; Popup Dialog: dependency phrase in component spec | figma:vSr4NtEwPVs6wLpqCT5PtV#29503:80044 | design-system/components/global-bubble.md |
| Button | Bottom Sheet, Bottom Sheet Footer Button, Empty State, Icon | Bottom Sheet Footer Button: dependency phrase in component spec; Bottom Sheet: dependency phrase in component spec; Empty State: dependency phrase in component spec; Icon: explicit dependency/composition section; dependency phrase in component spec | figma:vSr4NtEwPVs6wLpqCT5PtV#1934:94 | design-system/components/button.md |
| Empty State | Button | Button: dependency phrase in component spec | figma:vSr4NtEwPVs6wLpqCT5PtV#5862:221812 | design-system/components/empty-state.md |
| Portfolio Add Action Section | Button, Empty State, Icon, Portfolio Add Action Button | Portfolio Add Action Button: explicit dependency/composition section; dependency phrase in component spec; Empty State: dependency phrase in component spec; Button: explicit dependency/composition section; dependency phrase in component spec; Icon: explicit dependency/composition section; dependency phrase in component spec | E-050, E-049, E-054 | design-system/components/portfolio-add-action-section.md |
| Portfolio Fit Chart | Empty State | Empty State: dependency phrase in component spec | E-011, E-012, E-013, E-014 | design-system/components/portfolio-fit-chart.md |
| Event Filter Dropdown | Button, Icon | Button: dependency phrase in component spec; Icon: explicit dependency/composition section; dependency phrase in component spec | E-027 | design-system/components/event-filter-dropdown.md |
| Portfolio Manual Import Value Field | Portfolio Manual Import Cell | Portfolio Manual Import Cell: dependency phrase in component spec | E-051 | design-system/components/portfolio-manual-import-value-field.md |
| Selection Control | Bottom Sheet, Bottom Sheet Cell | Bottom Sheet Cell: dependency phrase in component spec; Bottom Sheet: dependency phrase in component spec | figma:vSr4NtEwPVs6wLpqCT5PtV#22911:207990 | design-system/components/selection-control.md |
| Switch | Bottom Sheet, Bottom Sheet Cell, Broker Import Row | Bottom Sheet Cell: dependency phrase in component spec; Broker Import Row: dependency phrase in component spec; Bottom Sheet: dependency phrase in component spec | figma:vSr4NtEwPVs6wLpqCT5PtV#8134:289037 | design-system/components/switch.md |
| Broker Import Row | Broker Icon, Button, Icon, Promotional Badge, Switch | Promotional Badge: explicit dependency/composition section; dependency phrase in component spec; Broker Icon: explicit dependency/composition section; dependency phrase in component spec; Button: dependency phrase in component spec; Switch: explicit dependency/composition section; dependency phrase in component spec; Icon: explicit dependency/composition section; dependency phrase in component spec | E-059, E-048, E-057, E-078 | design-system/components/broker-import-row.md |
| Portfolio Manual Import Row | Portfolio Manual Import Cell, Portfolio Manual Import Value Field | Portfolio Manual Import Value Field: explicit dependency/composition section; dependency phrase in component spec; Portfolio Manual Import Cell: explicit dependency/composition section; dependency phrase in component spec | E-053, E-052, E-051 | design-system/components/portfolio-manual-import-row.md |
| Portfolio Manual Import Cell | Button, Icon, Portfolio Manual Import Row, Portfolio Manual Import Value Field | Portfolio Manual Import Value Field: explicit dependency/composition section; dependency phrase in component spec; Portfolio Manual Import Row: dependency phrase in component spec; Button: dependency phrase in component spec; Icon: explicit dependency/composition section; dependency phrase in component spec | E-052, E-051 | design-system/components/portfolio-manual-import-cell.md |
| Stock Card | Button, Empty State, Event Table Row, Popup Dialog | Event Table Row: dependency phrase in component spec; Popup Dialog: dependency phrase in component spec; Empty State: dependency phrase in component spec; Button: dependency phrase in component spec | figma:vSr4NtEwPVs6wLpqCT5PtV#51036:377157 | design-system/components/stock-card.md |
| Portfolio Stock Sheet Cell | Button, Portfolio Fit Stock Sheet, Portfolio Health Report Section, Similar Stock Button, Valuation Label | Portfolio Health Report Section: dependency phrase in component spec; Portfolio Fit Stock Sheet: dependency phrase in component spec; Similar Stock Button: dependency phrase in component spec; Valuation Label: dependency phrase in component spec; Button: dependency phrase in component spec | E-071, E-030, E-038 | design-system/components/portfolio-stock-sheet-cell.md |
| Portfolio Fit Stock Sheet | Button, Icon, Portfolio Attribute Label, Portfolio Fit Detail Table, Portfolio Stock Sheet Cell, Similar Stock Button | Portfolio Stock Sheet Cell: explicit dependency/composition section; dependency phrase in component spec; Portfolio Fit Detail Table: explicit dependency/composition section; dependency phrase in component spec; Portfolio Attribute Label: dependency phrase in component spec; Similar Stock Button: explicit dependency/composition section; dependency phrase in component spec; Button: explicit dependency/composition section; Icon: dependency phrase in component spec | E-032, E-033, E-030, E-070, E-071 | design-system/components/portfolio-fit-stock-sheet.md |
| Bottom Sheet Cell | Bottom Sheet, Button, Icon, MyStock Utility Icon, New Badge, Selection Control, Switch | MyStock Utility Icon: dependency phrase in component spec; Selection Control: explicit dependency/composition section; dependency phrase in component spec; Bottom Sheet: component name composition; dependency phrase in component spec; New Badge: explicit dependency/composition section; dependency phrase in component spec; Button: dependency phrase in component spec; Switch: explicit dependency/composition section; dependency phrase in component spec; Icon: explicit dependency/composition section; dependency phrase in component spec | E-064, E-065, E-066, E-067, E-078, E-079 | design-system/components/bottom-sheet-cell.md |
| Bottom Sheet Header | Bottom Sheet, Icon | Bottom Sheet: component name composition; Icon: explicit dependency/composition section; dependency phrase in component spec | E-063 | design-system/components/bottom-sheet-header.md |
| Bottom Sheet | Bottom Sheet Cell, Bottom Sheet Footer Button, Bottom Sheet Header, Button, Icon, Selection Control, Switch | Bottom Sheet Footer Button: explicit dependency/composition section; Bottom Sheet Header: explicit dependency/composition section; dependency phrase in component spec; Bottom Sheet Cell: dependency phrase in component spec; Selection Control: explicit dependency/composition section; dependency phrase in component spec; Button: explicit dependency/composition section; Switch: explicit dependency/composition section; dependency phrase in component spec; Icon: dependency phrase in component spec | E-067, E-068, E-069, E-063, E-064, E-078, E-079 | design-system/components/bottom-sheet.md |
| Popup Dialog | Bottom Sheet, Bottom Sheet Footer Button, Button, Portfolio Add Holding Sheet | Portfolio Add Holding Sheet: dependency phrase in component spec; Bottom Sheet Footer Button: dependency phrase in component spec; Bottom Sheet: dependency phrase in component spec; Button: dependency phrase in component spec | figma:vSr4NtEwPVs6wLpqCT5PtV#5906:218640 | design-system/components/popup-dialog.md |
| Event Filter Sheet | Bottom Sheet, Bottom Sheet Header, Button, Event Filter Option, Icon | Bottom Sheet Header: dependency phrase in component spec; Event Filter Option: explicit dependency/composition section; dependency phrase in component spec; Bottom Sheet: dependency phrase in component spec; Button: dependency phrase in component spec; Icon: explicit dependency/composition section; dependency phrase in component spec | E-029 | design-system/components/event-filter-sheet.md |

## Dependency Cycles

- Bottom Sheet Footer Button -> Bottom Sheet -> Bottom Sheet Footer Button
- Bottom Sheet -> Bottom Sheet Header -> Bottom Sheet
- Icon -> Button -> Bottom Sheet Footer Button -> Bottom Sheet -> Bottom Sheet Header -> Icon
- Icon -> Button -> Bottom Sheet Footer Button -> Bottom Sheet -> Bottom Sheet Cell -> MyStock Utility Icon -> Icon
- Bottom Sheet Cell -> Selection Control -> Bottom Sheet Cell
- Bottom Sheet -> Bottom Sheet Cell -> Selection Control -> Bottom Sheet
- Bottom Sheet -> Bottom Sheet Cell -> Bottom Sheet
- Button -> Bottom Sheet Footer Button -> Bottom Sheet -> Bottom Sheet Cell -> Button
- Bottom Sheet Cell -> Switch -> Bottom Sheet Cell
- Icon -> Button -> Bottom Sheet Footer Button -> Bottom Sheet -> Bottom Sheet Cell -> Switch -> Broker Import Row -> Broker Icon -> Icon
- Button -> Bottom Sheet Footer Button -> Bottom Sheet -> Bottom Sheet Cell -> Switch -> Broker Import Row -> Button
- Switch -> Broker Import Row -> Switch
- Icon -> Button -> Bottom Sheet Footer Button -> Bottom Sheet -> Bottom Sheet Cell -> Switch -> Broker Import Row -> Icon
- Bottom Sheet -> Bottom Sheet Cell -> Switch -> Bottom Sheet
- Icon -> Button -> Bottom Sheet Footer Button -> Bottom Sheet -> Bottom Sheet Cell -> Icon
- Button -> Bottom Sheet Footer Button -> Bottom Sheet -> Button
- Icon -> Button -> Bottom Sheet Footer Button -> Bottom Sheet -> Icon
- Button -> Bottom Sheet Footer Button -> Button
- Button -> Empty State -> Button
- Icon -> Button -> Icon
- Portfolio Stock Sheet Cell -> Portfolio Fit Stock Sheet -> Portfolio Stock Sheet Cell
- Portfolio Manual Import Value Field -> Portfolio Manual Import Cell -> Portfolio Manual Import Value Field
- Portfolio Manual Import Value Field -> Portfolio Manual Import Cell -> Portfolio Manual Import Row -> Portfolio Manual Import Value Field
- Portfolio Manual Import Cell -> Portfolio Manual Import Row -> Portfolio Manual Import Cell
- Event Filter Option -> Event Filter Sheet -> Event Filter Option

## Skipped Components

- iOS Status/Home Indicator: inventory status is not implementable (out-of-scope)

## Usage Notes

- Implement components in the recommended order unless product discovery proves an existing component can be reused first.
- Do not build a composed component before its listed dependencies are implemented, reused, or explicitly marked blocked with a reason.
- Implement typographic/text-lockup components as editable, token-backed display components; do not flatten them into generic heading/subheading styles.
- After each component, update the queue/implementation map before starting the next component.
- Put new component stories beside their component files; reserve root `stories/` or `src/stories/` for foundation guides/docs.
- Put requested page/screen implementations in dedicated page folders with co-located page stories.
- If a dependency is inferred incorrectly, record the correction in the implementation map and update the queue ordering.
