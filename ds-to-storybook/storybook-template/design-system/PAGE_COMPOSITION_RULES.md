# Page Composition Rules

## Viewport Assumptions

- Baseline viewport: 375x812 iPhone X frame.
- Status area: 44px.
- Top app bar: 46px.
- Bottom navigation: 49px.
- Bottom safe-area/home indicator region: 34px.

## App Shell

| Pattern | Evidence | Layout Rule | Components Used | Tokens Used |
|---|---|---|---|---|
| Mobile trading shell | E-001 | Keep fixed top and bottom regions around a dense scrollable market-data body | Top App Bar, Bottom Navigation | `--cm-sys-size-region-*`, `--cm-sys-color-*` |
| Stock-title app shell | E-081 | Use the 64px Top App Bar stock-title variant when the screen context is a single stock and needs previous/next stock navigation plus side actions | Top App Bar | `--cm-comp-top-app-bar-stock-*` |
| Compact stock identity label | E-087 | Use Stock Label when a small inline selected-stock context marker is needed. It should sit inside a host layout without becoming a full list row, sheet cell, or status badge | Stock Label | `--cm-comp-stock-label-*` |
| Header control stack | E-004, E-060, E-061 | Stack broker selector, primary tabs, secondary tabs, and column header directly; avoid cards between bars | Market Tab Strip, planned broker selector, Market Filter Tab Strip | `--cm-comp-market-tab-strip-*`, `--cm-sys-size-control-height-md`, color tokens |
| Broker/source identity row | E-004, E-048 | Use compact 46px rounded source containers inside broker-selection contexts; keep broker identity container-led and do not replace it with text-only tabs | Broker Icon, Broker Selector Bar | `--cm-comp-broker-icon-*` |
| Broker import list | E-057, E-058, E-059, E-048, E-078 | Stack a flat 375px Broker Import Header above 132px Broker Import Rows; compose rows from Broker Icon, Promotional Badge, helper copy, compact inventory action, and Switch slot | Broker Import Header, Broker Import Row, Broker Icon, Promotional Badge, Switch | `--cm-comp-broker-import-*`, `--cm-comp-promotional-badge-*`, `--cm-comp-broker-icon-*`, `--cm-comp-switch-*` |
| Broker import utility menu | E-060, E-062 | Place the 42px Broker Import Menu above or near broker import content when filtering all brokers, syncing, editing, or showing last-update metadata | Broker Import Menu | `--cm-comp-broker-import-menu-*` |
| Inventory primary tabs | E-060, E-061 | Place the 375x37 Market Tab Strip directly below the top app bar/status stack and before inventory content or secondary controls | Market Tab Strip | `--cm-comp-market-tab-strip-*` |
| Market secondary filters | E-046 | Place the 375x40 compact filter strip inside the header stack when switching between secondary market views | Market Filter Tab Strip | `--cm-comp-market-filter-strip-*` |
| Quote list | E-005, E-074 | Rows are flat full-width list items with 1px dividers; no row cards or rounded containers | Realtime Quote Row | `--cm-comp-realtime-quote-row-*` |
| Watchlist quote grid | E-084 | Use 170x148 Realtime Quote Tiles in grid-style watchlist summaries; keep the chart/event or weather bottom region inside the tile | Realtime Quote Tile | `--cm-comp-realtime-quote-tile-*` |
| Stock discussion feed | E-088 | Stack 375px Stock Cards for stock-specific commentary or discovery feeds. Keep sentiment, author metadata, and body copy inside the card; do not use this pattern for quote rows, event rows, dialogs, or empty states | Stock Card | `--cm-comp-stock-card-*` |
| Similar-stock result list | E-094 | Use 356x293 Similar Stock Cards when showing compact similar-stock comparison results. Keep the stock quote summary, similarity chip, add-to-watchlist action, and feature panel in one card; do not substitute the neutral Similar Stock Button CTA or Stock Card feed anatomy | Similar Stock Card | `--cm-comp-similar-stock-card-*` |
| Stock return calendar | E-089, E-093 | Use a 375x550 module with title, month selector, summary values, five trading-day columns, and one weekly summary column. Compose day cells from 57x62 Stock Calendar Cell variants for empty, red/up, green/down, zero, no-market, and selected states; do not add weekend columns or event-calendar controls without new evidence | Stock Calendar, Stock Calendar Cell | `--cm-comp-stock-calendar-*`, `--cm-comp-stock-calendar-cell-*` |
| Trend analysis local header | E-090 | Use the 375x86 Trend Analysis Header directly above chart/analysis content when period filtering belongs to that local module. Keep the range group and `自訂` action in one 42px row rather than placing it in the global header stack | Trend Analysis Header | `--cm-comp-trend-analysis-header-*` |
| Asset trend chart body | E-091, E-090 | Place the 375x230 Asset Trend Chart directly below Trend Analysis Header when showing total asset trend. Keep summary metrics and plot in one flat chart body; do not wrap it in a raised card or replace the selected-date marker with a Global Bubble | Asset Trend Chart, Trend Analysis Header | `--cm-comp-asset-trend-chart-*`, `--cm-comp-trend-analysis-header-*` |
| Trend analysis signed bar chart | E-092, E-090, E-091 | Use the 375x138 Trend Analysis Bar Chart as a flat local chart body when a trend-analysis section needs signed values around zero. Keep it visually compatible with the Trend Analysis Header and Asset Trend Chart surface, but do not inherit the Asset Trend Chart summary, orange area-line, cursor, or date marker | Trend Analysis Bar Chart, Trend Analysis Header | `--cm-comp-trend-analysis-bar-chart-*`, `--cm-comp-trend-analysis-header-*` |
| Main-force quote list | E-075, E-076, E-077 | Under the `主力籌碼` secondary filter, use 61px flat rows with stock identity, Main Force Weather Indicator, right-aligned volume/rate, and Main Force Trade Tag | Main Force Stock Row, Main Force Weather Indicator, Main Force Trade Tag | `--cm-comp-main-force-stock-row-*`, `--cm-comp-main-force-weather-*`, `--cm-comp-main-force-trade-tag-*` |
| Portfolio analysis header | E-015, E-016 | Use a compact 32px section header above or near portfolio analytics content when user preference context affects the analysis | Portfolio Preference Header | `--cm-comp-portfolio-preference-header-*` |
| Portfolio analysis module | E-011, E-013 | Analytics modules can pair a compact left visualization with a rounded detail panel when the visualization needs explanatory rows | Portfolio Fit Chart | `--cm-comp-portfolio-fit-chart-*` |
| Portfolio fit list | E-017, E-018 | Pair the 34px list header with 61px rows using identical four-column widths | Portfolio Fit List Header, Portfolio Fit Stock Row | `--cm-comp-portfolio-fit-list-header-*`, `--cm-comp-portfolio-fit-stock-row-*` |
| Portfolio fit row sub-statuses | E-030, E-031 | Compose compact 68x20 assessment indicators and 105x24 attribute labels inside the row columns; keep them aligned to the list header | Portfolio Fit Assessment Indicator, Portfolio Attribute Label | `--cm-comp-portfolio-fit-assessment-*`, `--cm-comp-portfolio-attribute-label-*` |
| Portfolio fit stock sheet | E-032, E-033, E-070, E-071, E-072, E-073 | Present stock-level fit explanation in a 375x605 bottom sheet with Portfolio Stock Sheet Cell identity/attribute rows, a fixed-column detail table, one Similar Stock Button, and safe-area chrome | Portfolio Fit Stock Sheet, Portfolio Stock Sheet Cell, Portfolio Fit Detail Table, Portfolio Attribute Label, Similar Stock Button | `--cm-comp-portfolio-fit-stock-sheet-*`, `--cm-comp-portfolio-stock-sheet-cell-*`, `--cm-comp-portfolio-fit-detail-table-*`, `--cm-comp-similar-stock-button-*` |
| Preferred-stock discovery list | E-034, E-035, E-036, E-037 | Use a compact 38px section title, 44px context top bar, 34px six-column header, and 61px rows for attribute-specific preferred-stock discovery | Portfolio Preferred Stock Title, Portfolio Preferred Stock Top Bar, Portfolio Preferred Stock List Header, Portfolio Preferred Stock Row | `--cm-comp-portfolio-preferred-stock-*` |
| Valuation marker group | E-038 | Use compact 68x28 valuation labels as assessment markers; keep variants semantic and text-led | Valuation Label | `--cm-comp-valuation-label-*` |
| Portfolio health-check row | E-039, E-040, E-041 | Compose a 659px diagnostic row from fixed-width 61px cells; preserve the 102px sticky stock identity column and compact report/valuation/status cells | Portfolio Health Check Row, Portfolio Health Check Cell, Quarter Line Status Icon, Valuation Label | `--cm-comp-portfolio-health-check-*`, `--cm-comp-quarter-line-status-icon-*` |
| Portfolio health report detail | E-042, E-043, E-044 | Stack flat 375px report sections after health-check entry points; use valuation paragraph, quality metric rows, and exception rows rather than cards or dashboards | Portfolio Health Report Section | `--cm-comp-portfolio-health-report-section-*` |
| Portfolio profit summary | E-045 | Keep the 375px realtime P/L module as a three-column raised summary with optional below-summary chart expansion | Portfolio Profit Summary | `--cm-comp-portfolio-profit-summary-*` |
| Portfolio add-holding entry point | E-049, E-050 | Place add/sync entry points as a flat 375px section on `#252525`, using either two equal outline actions or one centered add action | Portfolio Add Action Section, Portfolio Add Action Button | `--cm-comp-portfolio-add-action-*` |
| Portfolio add holding sheet | E-054, E-055, E-056, E-050 | Open add-holding actions into a 375px bottom sheet with 64px header, 375x216 form body, optional duplicate warning, and one 295x41 bottom confirm action | Portfolio Add Holding Sheet, Portfolio Add Action Section | `--cm-comp-portfolio-add-holding-sheet-*` |
| Portfolio manual import table row | E-051, E-052, E-053 | Use a 557x61 fixed-column row for manual inventory import; preserve the sticky 136px stock identity column and compact value fields | Portfolio Manual Import Row, Portfolio Manual Import Cell, Portfolio Manual Import Value Field | `--cm-comp-portfolio-manual-import-*` |
| Temporal date markers | E-020, E-021 | Use compact unboxed labels for calendar relationship markers; keep date and relative text inline | Relative Date Label | `--cm-comp-relative-date-label-*` |
| Financial event markers | E-022, E-023 | Use text-only orange event labels inside dense event/calendar lists; avoid standalone card or chip treatment | Event Name Label | `--cm-comp-event-name-label-*` |
| Stock event rows | E-024, E-025 | Use bordered 323px event rows when stock identity and event details must be read together as one record | Event Table Row | `--cm-comp-event-table-row-*` |
| Event list controls | E-026, E-027 | Use compact 28px outline controls for returning to today and filtering event count/category | Return Today Button, Event Filter Dropdown | `--cm-comp-return-today-button-*`, `--cm-comp-event-filter-dropdown-*` |
| Event filter bottom sheet | E-028, E-029 | Use a 375px-wide bottom sheet with a 64px header and compact filled option grid for major event category selection | Event Filter Sheet, Event Filter Option | `--cm-comp-event-filter-sheet-*`, `--cm-comp-event-filter-option-*` |
| Bottom-sheet chrome | E-063 | Compose sheet tops from the 64px Bottom Sheet Header and optional 20px drag-handle strip before sheet body content | Bottom Sheet Header | `--cm-comp-bottom-sheet-header-*` |
| Bottom-sheet command rows | E-064, E-065, E-066, E-078, E-079 | Use 58-59px Bottom Sheet Cells for settings/actions inside sheets; compose utility icons, optional New Badge, optional Switch, and optional Selection Control inside the row, not as separate cards | Bottom Sheet Cell, MyStock Utility Icon, New Badge, Switch, Selection Control | `--cm-comp-bottom-sheet-cell-*`, `--cm-comp-mystock-utility-icon-*`, `--cm-comp-new-badge-*`, `--cm-comp-switch-*`, `--cm-comp-selection-control-*` |
| Standalone switch slots | E-078, E-064, E-059 | Use Switch for binary row controls. The host row owns the label and placement; Switch owns platform geometry, track/knob colors, and off/on state rendering | Switch, Bottom Sheet Cell, Broker Import Row | `--cm-comp-switch-*`, `--cm-comp-bottom-sheet-cell-switch-*`, `--cm-comp-broker-import-row-switch-*` |
| Standalone selection-control slots | E-079, E-067, E-064 | Use Selection Control for 20px checkbox/radio slots. The host row owns the label and placement; Selection Control owns square/round geometry, outline/fill colors, and checked/selected mark rendering | Selection Control, Bottom Sheet Cell, Bottom Sheet | `--cm-comp-selection-control-*`, `--cm-comp-bottom-sheet-selection-*` |
| Bottom-sheet settings composites | E-067, E-068, E-069, E-079 | Compose inventory settings, display-mode selection, sort selection, realtime P/L settings, and watchlist assignment from Bottom Sheet Header, Bottom Sheet Cell, preview options, selection rows, Selection Control, and Bottom Sheet Footer Button only when a submit action is required | Bottom Sheet, Bottom Sheet Header, Bottom Sheet Cell, Selection Control, Bottom Sheet Footer Button | `--cm-comp-bottom-sheet-*`, `--cm-comp-bottom-sheet-header-*`, `--cm-comp-bottom-sheet-cell-*`, `--cm-comp-selection-control-*`, `--cm-comp-bottom-sheet-footer-button-*` |
| Centered popup dialog | E-080 | Use a centered 292px dialog for compact prompts, media notices, and two-action decisions; do not use bottom-sheet headers, drag handles, or 375px sheet width | Popup Dialog | `--cm-comp-popup-dialog-*` |
| Full empty state | E-085 | Use a 375x563 centered Empty State for page or section no-content feedback; optional action composes Button and no popup/sheet chrome is added | Empty State, Button | `--cm-comp-empty-state-*`, `--cm-comp-button-*` |
| Anchored contextual bubble | E-082 | Attach compact amber bubbles to a nearby target with directional arrows; use them for contextual information, not menus or modal prompts | Global Bubble | `--cm-comp-global-bubble-*` |
| Floating quick actions | E-008, E-047, E-086 | Anchor action pills on the right side above bottom navigation; use 68x30 single/side pills for independent actions and the 152x38 attached watchlist group when `下單` and `編輯` are paired | Floating Action Pill | `--cm-comp-floating-action-pill-*` |
| Edge status toggle | E-009 | Attach low-priority status controls to the left edge above bottom navigation | Edge Status Toggle | `--cm-comp-edge-status-toggle-*` |

## Density

- Use 16px horizontal list gutters and 8px row vertical padding.
- Prefer compact rows and fixed columns over spacious cards.
- Header bars can use 33-42px heights depending on function.
- Primary inventory tabs stay 37px high, square-edged, and label-led; do not add underlines, cards, or large active pills.
- Stock-title app bars stay 64px including status area and should not expand into large stock profile headers.
- Stock Labels stay 28px high, content-hug, and display-only; do not expand them into stock cards, row replacements, filter chips, or valuation badges.
- Stock Cards stay 375px wide, flat, and feed-led with square outer edges. Variant heights are content-derived from body length; do not force them into quote-row heights, dashboard tiles, or marketing cards.
- Similar Stock Cards stay 356x293 and comparison-led. Preserve the 102px left summary area, 230px feature panel, orange similarity chip, and top-right add action; do not expand them into feed cards, quote rows, dashboard tiles, or portfolio-fit sheets.
- Stock Calendar stays 375x550 with 57x62 Stock Calendar Cells, five weekday columns, one weekly summary column, 3px column gaps, and 4px row gaps. Selected day cells use a 1px outline without changing fill opacity or dimensions. Do not convert it into a full seven-day date picker, event-calendar card, or dashboard heatmap.
- Trend Analysis Header stays 375x86 with a 42px filter row, 51/54/68px range options, and a separate `自訂` outline action. Do not merge it into the top app bar, primary tabs, secondary market filters, or stock calendar controls.
- Asset Trend Chart stays 375x230 with a 64px summary block and 343px plot. Keep it flush with the local analysis module surface; do not add chart-card padding, legends, framed panels, or oversized dashboard spacing.
- Trend Analysis Bar Chart stays 375x138 with 16px padding, a 37px y-axis label column, 298px plot, 46px positive/negative bands, and 8px square bars. Do not add card gutters, rounded bars, x-axis label rows, legends, or summary metrics without future evidence.
- Global buttons stay compact and size-bound; do not use global Button to replace sheet footers or domain-specific row actions without checking their scoped contracts.
- Secondary market filters stay 40px high and use compact text-led items; do not expand them into a toolbar or card.
- Realtime quote tiles stay 170x148 and grid-specific; do not stretch them into 375px rows or replace quote rows with cards.
- Main-force quote rows stay 61px high, 8px padded, and column-led; keep the 98px weather slot, 79px value column, and 76px trade-tag slot aligned across rows.
- Main-force weather and trade tags are row metadata. Do not extract them into standalone explanatory cards inside the list.
- Broker/source icons stay 46px and identity-led; do not enlarge them into account cards or avatar chips without future evidence.
- Broker import lists stay flat and row-led: 37-38px headers, 132px rows, 46px broker icons, and compact inline actions. Do not add card gutters or oversized setup panels.
- Broker import menus stay 42px high and utility-led, with dropdown, sync/edit actions, and timestamp in one row; do not turn them into settings cards or banners.
- Promotional badges stay 23px high and inline; do not expand them into banners, chips with icons, or CTA buttons.
- Analytics modules may use a rounded internal panel, but the outer module stays flat on the dark background.
- Analytics section headers stay row-height and should not become card headers or page titles.
- Analytics list headers and rows must align column widths exactly; avoid responsive wrapping until another reference defines it.
- Portfolio fit sub-statuses stay inside their columns: 68x20 for assessment, 105x24 for attributes. Do not promote them to independent rows or legends.
- Portfolio fit stock sheets stay bottom-sheet sized and table-led; do not convert stock explanation into a separate page, card stack, or chart dashboard.
- Portfolio stock sheet cells keep 60px identity rows, 41px attribute tab rows, and 79px health title summaries; do not merge these portfolio-specific cells into generic settings rows.
- Portfolio fit detail table headers stay 36px high and rows stay 48px high with fixed 171/100/64 columns; info rows must keep the empty value column rather than collapsing columns.
- Preferred-stock discovery stays table-led with fixed columns; do not replace it with recommendation cards or valuation badge grids.
- Valuation labels stay compact and should not become filter chips or segmented controls without future evidence.
- Health-check rows may exceed the 375px viewport and should remain horizontally table-like; do not wrap diagnostic cells into multiple lines or cards.
- Health report detail sections stay flat on `#252525`, 375px wide, and 343px content-bound; do not wrap each metric or exception in its own card.
- Portfolio profit summaries can use a raised 359px summary surface, but the module stays one compact 375px unit; do not split the three metrics into separate cards or chart panels.
- Portfolio add-holding entry points stay as compact outline actions inside a flat 375px section; do not turn screenshot sync or manual add into upload cards, setup wizards, or wide CTAs without future evidence.
- Portfolio add holding sheets stay compact: preserve 54px form rows, x=157 right-side control alignment, 30px steppers, and one 295x41 confirm action instead of expanding into a full-page form.
- Portfolio manual import stays table-led with 61px rows and compact 70x29 value fields; do not convert manual entry into card stacks, expanded forms, or roomy spreadsheet panels without future evidence.
- Temporal date markers stay text-led and compact; do not expand them into calendar cards or badge grids without future evidence.
- Event name labels stay as 38px text rows with 16px horizontal padding; do not add icons, borders, or fills without future evidence.
- Event table rows may be bordered surfaces, but keep them 323px wide, data-led, and vertically sized by content rather than expanding into dashboard cards.
- Event list controls stay 28px tall and outline-based; do not turn them into full-width toolbars or filter chip groups without future evidence.
- Event filter sheets should stay bottom-sheet sized and option-grid based; do not convert them into page-level settings screens without future evidence.
- Bottom-sheet headers stay 64px or 20px for drag-handle-only strips; do not add decorative header cards, shadows, or larger title blocks.
- Bottom-sheet cells stay 58-59px row-led and 365x62 for gray action rows; do not inflate sheet settings into account cards or large menu tiles.
- Switch slots stay compact: Android 40x24 and iOS 43x26. Do not expand switches into text toggles, checkboxes, or segmented controls.
- Selection Control slots stay 20x20. Use square checkbox variants for multi-select and round radio variants for single-select; do not communicate selection by changing the whole row background.
- Bottom-sheet composite selectors stay compact: preview selector sheets are 195px high, sort selectors are 307px high, and watchlist add sheets are 495px high with one footer submit button. Do not expand these into full-screen settings flows without future evidence.
- Popup dialogs stay centered and 292px wide with compact media/text/action rhythm. Do not widen them to 375px, add sheet chrome, or promote them to full-screen empty states.
- Empty States stay centered and section-level: preserve the 375x563 region, 40px horizontal padding, 187px optional media, 295px copy column, 8px title/body gap, and 266px composed Button action. Do not turn them into popup dialogs, onboarding heroes, or card stacks.
- Global bubbles stay anchored and content-light; do not convert them into dropdown panels, snackbars, or help cards.
- Similar Stock Button stays a neutral 49px navigation action; do not promote it to an orange primary CTA.
- Side action pill groups keep 68x30 pill buttons and 16px gaps; do not promote them into larger floating panels.
- Attached watchlist Floating Action Pill groups keep the 38px height, 152px two-action width, 76px edit-only width, center divider, and low shadow; do not expand them into a toolbar, floating panel, or global Button pair.

## Scrolling

- The quote list is the primary scrollable region.
- Top app bar and bottom navigation should remain fixed for the mobile app shell.
- Add holding bottom sheets overlay the current holdings flow; keep the sheet content compact and allow only internal scrolling if keyboard or validation states require it in future evidence.
- Watchlist add bottom sheets can scroll internally inside the observed 324px list area; preserve the right 5px scroll thumb when content exceeds the visible list.
- Portfolio manual import rows may exceed the 375px viewport; preserve horizontal overflow and sticky stock identity behavior instead of wrapping value columns.
- Stock discussion feeds can stack Stock Cards vertically in a scrollable body; body copy controls card height, and long-copy truncation or expansion behavior remains undefined until future evidence shows it.
- Similar-stock result lists can stack Similar Stock Cards, but inter-card spacing, pagination, and responsive wrapping are not defined by this source.
- Stock return calendars are source-sized as a single 375x550 module; surrounding screen scroll behavior and month-picker expansion are not defined by this source.
- Trend Analysis Header is source-sized as a local module header. Surrounding chart scroll, sticky behavior, custom picker expansion, and tooltip positioning are not defined by this source.
- Asset Trend Chart is source-sized as a single 375x230 local chart body. Crosshair interaction, chart panning/zooming, and sticky behavior are not defined by this source.
- Trend Analysis Bar Chart is source-sized as a single 375x138 local chart body. Selected-bar interaction, tooltip positioning, zoom/pan behavior, x-axis labels, and responsive plot resizing are not defined by this source.

## Safe Areas

- Preserve iOS bottom safe-area space when building a mobile shell.
- The home indicator is platform chrome, not a reusable product component.

## Responsive Guidance

- Only mobile behavior is evidenced by this node.
- Do not infer a desktop dashboard layout from this reference.
- Do not stack manual import value cells under the stock identity column on mobile unless a future responsive reference shows that layout.
