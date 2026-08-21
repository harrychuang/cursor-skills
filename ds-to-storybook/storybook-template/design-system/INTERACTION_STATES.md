# Interaction States

## Observed States

| Pattern | Evidence | Visual Treatment | Tokens |
|---|---|---|---|
| Top selector active | E-003 | Active segment uses warm gray `#7E7873`; inactive segment uses `#252525`; both labels remain white | `--cm-comp-top-app-bar-segment-*` |
| Top app bar stock-title | E-081 | 64px dark bar keeps stock identity centered between 27px side actions and 12px previous/next arrows; extreme long title downscales to 13px | `--cm-comp-top-app-bar-stock-*` |
| Button primary fill default | E-083 | Orange `#FF7800` filled control with white medium label and optional icon | `--cm-comp-button-primary-fill-default-*` |
| Button primary fill pressed | E-083 | Darker orange `#CC6102` fill with pale orange `#EBC09A` label/icon | `--cm-comp-button-primary-fill-pressed-*` |
| Button primary outline pressed | E-083 | Deep brown `#3F1D00` fill, orange border, and orange label/icon | `--cm-comp-button-primary-outline-pressed-*` |
| Button disabled | E-083 | Fill and outline variants collapse to transparent/dark container with gray `#808080` border and label/icon | `--cm-comp-button-primary-*-disabled-*` |
| Empty State default | E-085 | 375x563 centered no-content feedback region with `#252525` background, optional 187px media placeholder, optional title, body copy, and low text shadow | `--cm-comp-empty-state-*` |
| Empty State action | E-085, E-083 | Optional 266px `查看教學` CTA composes the existing primary filled Button; Empty State owns action width and placement while Button owns fill, radius, label typography, and interaction states | `--cm-comp-empty-state-action-*`, `--cm-comp-button-primary-fill-*` |
| Bottom navigation active | E-007 | Active item uses `#333333` fill and white label; inactive items sit on black with `#808080` label | `--cm-comp-bottom-navigation-*` |
| Primary floating action | E-008, E-047 | Orange pill with white label/icon; observed primary label is `下單` | `--cm-comp-floating-action-pill-primary-*` |
| Neutral floating action | E-008, E-047 | Warm-gray pill with white label/icon; observed neutral labels are `設定` and `編輯` | `--cm-comp-floating-action-pill-neutral-*` |
| Attached floating action group | E-086 | 152x38 black attached group pairs `下單` and `編輯` segments with white 14px labels/icons, a gray 30px center divider, 24px outer radius, and low overlay shadow | `--cm-comp-floating-action-pill-attached-*` |
| Attached floating action edit-only | E-086 | `關閉下單` property removes the order segment and keeps a 76x38 black `編輯` pill with full 24px radius | `--cm-comp-floating-action-pill-attached-*` |
| Stock Label default | E-087 | 28px display-only raised label uses `#333333` fill, white stock code, muted `#C0C0C0` name, 10x4 padding, 6px inline gap, and 4px radius | `--cm-comp-stock-label-*` |
| Stock Card default | E-088 | 375px feed card uses `#1E1E1E` surface, stock header with orange code and white name, gray View More action, neutral `#333333` sentiment tag, blue 16px avatar, author/time metadata, and white body copy | `--cm-comp-stock-card-*` |
| Stock Card bullish | E-088 | Same feed-card structure switches sentiment to red label on red-alpha fill, avatar to violet, author/timestamp copy, and content-derived taller body copy | `--cm-comp-stock-card-*` |
| Stock Calendar default month | E-089 | 375x550 `#252525` module with `報酬日曆`, 16px info icon, `2026/01 報酬` month selector, 20px chevron, monthly summary `0` / `0%`, five weekday columns, and `週損益` summary column | `--cm-comp-stock-calendar-*` |
| Stock Calendar daily up | E-089 | 57x62 day cells use red 30% market wash with Roboto 12px date, signed amount, and signed rate | `--cm-comp-stock-calendar-cell-up-*` |
| Stock Calendar highlighted up | E-089 | Day `7` uses a stronger red 50% market wash; this proves a highlighted/high-intensity visual slot, not the selected state confirmed by the standalone cell set | `--cm-comp-stock-calendar-cell-up-highlighted-container-color` |
| Stock Calendar daily down | E-089 | 57x62 day cells use green 30% market wash with signed amount/rate values | `--cm-comp-stock-calendar-cell-down-*` |
| Stock Calendar zero cell | E-093 | 57x62 break-even cell uses normalized neutral `#414141` fill with `20`, `0.0`, and `0%` in Roboto 12px text | `--cm-comp-stock-calendar-cell-zero-*` |
| Stock Calendar no-market | E-089 | No-market day uses `#333333` fill, muted date, and dash amount/rate values | `--cm-comp-stock-calendar-cell-no-market-*` |
| Stock Calendar empty outside-month | E-089 | Empty cells are 57x62 outline-only cells using the dark outline role and no placeholder text | `--cm-comp-stock-calendar-cell-empty-border-color` |
| Stock Calendar selected up/down cell | E-093 | Selected red/green cells keep their 30% wash and add a 1px market-color border; fill opacity does not increase for selected state | `--cm-comp-stock-calendar-cell-up-selected-border-color`, `--cm-comp-stock-calendar-cell-down-selected-border-color` |
| Stock Calendar selected zero/no-market cell | E-093 | Selected zero and no-market cells keep their neutral fills and add a 1px white border | `--cm-comp-stock-calendar-cell-zero-selected-border-color`, `--cm-comp-stock-calendar-cell-no-market-selected-border-color` |
| Stock Calendar weekly summary | E-089 | Weekly cells use normalized dark outline/corner badge, week number, red/green signed amount, and muted rate text | `--cm-comp-stock-calendar-week-*` |
| Trend Analysis Header default | E-090 | 375x86 local header shows `走勢分析`, info icon, share icon, range group, and separate `自訂` outline action on `#252525` | `--cm-comp-trend-analysis-header-*` |
| Trend Analysis Header selected range | E-090 | Selected `全部` uses a 51px `#808080` filled option, white 13px medium label, 4px radius, and low selected-control shadow | `--cm-comp-trend-analysis-header-range-selected-*` |
| Trend Analysis Header inactive range | E-090 | `近一週`, `近一月`, and `年初至今` stay transparent with gray 14px regular labels inside the `#333333` range group | `--cm-comp-trend-analysis-header-range-unselected-*` |
| Trend Analysis Header custom default | E-090 | `自訂` is a separate 4px-radius transparent outline control with gray border and gray 14px label | `--cm-comp-trend-analysis-header-custom-*` |
| Asset Trend Chart default | E-091 | 375x230 chart body shows `總資產`, `當日損益`, white asset total, red daily P/L, muted axis labels, 343px orange area-line series, and selected-date cursor on `#252525` | `--cm-comp-asset-trend-chart-*` |
| Asset Trend Chart gain value | E-091 | Observed daily P/L `+12,450` uses red 18px medium text following Taiwan gain semantics | `--cm-comp-asset-trend-chart-delta-gain-color` |
| Asset Trend Chart selected date | E-091 | Selected date uses a 117px vertical cursor and compact `2026/1/27` marker pill with normalized neutral-24 fill and `#D9D9D9` text | `--cm-comp-asset-trend-chart-cursor-*` |
| Trend Analysis Bar Chart default | E-092 | 375x138 signed histogram shows right-aligned Roboto 12px y-axis labels, three horizontal grid lines, red 50% positive bars above zero, and green 50% negative bars below zero on `#252525` | `--cm-comp-trend-analysis-bar-chart-*` |
| Trend Analysis Bar Chart positive bars | E-092 | Positive values use 8px square red bars anchored upward from the zero baseline inside the 46px positive band | `--cm-comp-trend-analysis-bar-chart-positive-bar-color` |
| Trend Analysis Bar Chart negative bars | E-092 | Negative values use 8px square green bars anchored downward from the zero baseline inside the 46px negative band | `--cm-comp-trend-analysis-bar-chart-negative-bar-color` |
| Edge status on | E-009 | `#3D3D3D` attached control with `#FFD98A` label | `--cm-comp-edge-status-toggle-*` |
| Market up | E-006 | Red value, delta, percent, triangle, and candlestick | `--cm-sys-color-market-up` |
| Market down | E-006 | Green price value | `--cm-sys-color-market-down` |
| Realtime enlarged event row | E-074 | 79px row keeps event metadata under code, red candlestick marker, 64px numeric columns, and 76x36 chart | `--cm-comp-realtime-quote-row-*` |
| Realtime quote tile with event | E-084 | 170x148 tile shows red price/change, 124x44 chart, and amber event marker/date in the bottom region | `--cm-comp-realtime-quote-tile-*` |
| Realtime quote tile without event | E-084 | Same tile structure preserves the chart region but omits the event marker | `--cm-comp-realtime-quote-tile-*` |
| Realtime quote tile after-hours three-day | E-084 | Bottom region switches to three 38px weather icons with green `1日`, gray `5日`, and red `20日` labels | `--cm-comp-realtime-quote-tile-*` |
| Realtime quote tile after-hours one-day | E-084 | Bottom region switches to one 38px weather icon plus 40px red `大買` text | `--cm-comp-realtime-quote-tile-*` |
| Main-force buy weather | E-077 | One-day weather uses a 30px weather icon and red 22px `大買` label inside a 98px slot | `--cm-comp-main-force-weather-*` |
| Main-force three-day weather | E-077 | Three-day weather uses three centered 30px weather icons with no text label | `--cm-comp-main-force-weather-*` |
| Main-force overnight tag | E-075 | `隔日沖` uses a 50x24 warm `#FFD98A` outline and label | `--cm-comp-main-force-trade-tag-*` |
| Main-force short tag | E-075 | `短沖` uses a 50x24 pink-red `#FF8A91` outline and label | `--cm-comp-main-force-trade-tag-*` |
| Main-force empty tag | E-075 | Empty trade tag keeps a visible centered `-` in `#C0C0C0` and drops the outline | `--cm-comp-main-force-trade-tag-*` |
| Main-force stock row | E-076 | 61px flat row combines stock identity, weather, right-aligned volume/rate, trade tag, and divider | `--cm-comp-main-force-stock-row-*` |
| Portfolio category dominant | E-011, E-012 | Donut score and largest bar use the dominant category color: blue, amber, or rose | `--cm-sys-color-portfolio-*` |
| Portfolio empty | E-014 | Donut ring and all values resolve to gray/dash treatment; no colored bars | `--cm-comp-portfolio-fit-chart-*` |
| Portfolio preference selected | E-015, E-016 | Preference value uses matching portfolio category color; all-operations state uses white | `--cm-comp-portfolio-preference-header-*` |
| Portfolio preference action | E-015, E-016 | Right-side pill uses `#333333` fill and `#FFD98A` text | `--cm-comp-portfolio-preference-header-action-*` |
| Portfolio fit sortable header | E-017 | Sortable columns show stacked chevrons; active ascending/descending state is not shown | `--cm-comp-portfolio-fit-list-header-*` |
| Portfolio fit matched row | E-018, E-019 | Fit indicator uses red check with `速配`; attribute label uses portfolio category color | `--cm-comp-portfolio-fit-stock-row-*` |
| Portfolio attribute active | E-030 | 105x24 category pill uses filled blue/amber/rose surface with white category and percent text | `--cm-comp-portfolio-attribute-label-active-*` |
| Portfolio attribute inactive | E-030 | 105x24 transparent label uses category-color text and white percent text | `--cm-comp-portfolio-attribute-label-inactive-*` |
| Portfolio attribute unclassified | E-030 | Same 105x24 frame shows centered gray `無特徵` without percent | `--cm-comp-portfolio-attribute-label-unclassified-color` |
| Portfolio fit assessment match | E-031 | 68x20 indicator uses red check icon and white `速配` label | `--cm-comp-portfolio-fit-assessment-match-*` |
| Portfolio fit assessment mismatch | E-031 | 68x20 indicator uses green X icon and gray `不速配` label | `--cm-comp-portfolio-fit-assessment-mismatch-*` |
| Portfolio fit stock sheet open | E-032 | 375x605 dark bottom sheet with 16px top corners, stock identity, attribute row, detail table, bottom action, and home indicator | `--cm-comp-portfolio-fit-stock-sheet-*` |
| Portfolio fit detail header | E-072 | 375x36 header row uses muted 14px labels and fixed 171/100/64 columns | `--cm-comp-portfolio-fit-detail-table-*` |
| Portfolio fit detail high score | E-033, E-073 | Detail table rows use warm metric values and red `97` score in the right column | `--cm-comp-portfolio-fit-detail-table-*` |
| Portfolio fit detail info row | E-073 | `配息穩定` row keeps a 14px info icon beside the item label, leaves the performance column empty, and preserves the red score column | `--cm-comp-portfolio-fit-detail-table-*` |
| Similar-stock action | E-032, E-070 | Neutral gray action with search icon and 18px white label; standalone source is 415x49 with 24px icon slot, while sheet instance is inset by the portfolio fit sheet layout | `--cm-comp-similar-stock-button-*`, `--cm-comp-portfolio-fit-stock-sheet-action-*` |
| Similar-stock result card | E-094 | 356x293 result card combines left stock identity/price/change, orange `相似度 92%` chip, orange `加入自選` action, and a 230px dark feature-summary panel with warm 13px section titles | `--cm-comp-similar-stock-card-*` |
| Portfolio stock sheet identity | E-071 | 375x60 `#252525` row pairs 20px white stock name with 18px muted stock code | `--cm-comp-portfolio-stock-sheet-cell-*` |
| Portfolio stock sheet attribute tab active | E-071 | 375x41 attribute row fills only the active 105x24 category label; inactive labels are muted gray text without fill | `--cm-comp-portfolio-stock-sheet-cell-attribute-*` |
| Portfolio stock sheet health title | E-071 | 375x79 summary uses fixed 94/88/58/46/73 health columns, muted headers, Valuation Label, white quality text, yellow sweep count, and red yield | `--cm-comp-portfolio-stock-sheet-cell-health-*` |
| Preferred-stock title | E-034 | 375x38 surface row with orange accent, white count label, and gray `每日更新` metadata | `--cm-comp-portfolio-preferred-stock-title-*` |
| Preferred-stock context top bar | E-035 | 375x44 raised bar with back icon, centered long-term attribute tag plus title, and right action icon | `--cm-comp-portfolio-preferred-stock-top-bar-*` |
| Preferred-stock sortable header | E-036 | Six-column `#333333` header with muted 12px labels and sort chevrons on metric/feature columns | `--cm-comp-portfolio-preferred-stock-list-header-*` |
| Preferred-stock row add action | E-037 | 61px row uses muted metrics, red feature value, orange add-stock icon, and a `#4B4B4B` divider | `--cm-comp-portfolio-preferred-stock-row-*` |
| Valuation expensive | E-038 | Orange 68x28 pill with white `昂貴` label | `--cm-comp-valuation-label-expensive-*` |
| Valuation slightly high/low | E-038 | Peach or pale-blue 68x28 pill with dark label | `--cm-comp-valuation-label-slightly-*` |
| Valuation cheap | E-038 | Blue 68x28 pill with white `便宜` label | `--cm-comp-valuation-label-cheap-*` |
| Valuation unavailable | E-038 | Dark-gray 68x28 pill with gray `無法評估` label | `--cm-comp-valuation-label-unavailable-*` |
| Quarter-line above | E-039 | 22px red check icon indicates `站上季線` yes | `--cm-comp-quarter-line-status-icon-above-color` |
| Quarter-line below | E-039 | 22px green X icon indicates `站上季線` no | `--cm-comp-quarter-line-status-icon-below-color` |
| Health-check report action | E-040, E-041 | Compact orange outline `看報告` action with 12px label and 8px arrow | `--cm-comp-portfolio-health-check-cell-report-action-*` |
| Health-check attention text | E-040, E-041 | Centered green `注意` text in a 58px cell | `--cm-comp-portfolio-health-check-cell-attention-color` |
| Health-check row sticky stock | E-040, E-041 | 102px stock cell uses right-side shadow beside horizontally composed diagnostic cells | `--cm-comp-portfolio-health-check-cell-stock-shadow` |
| Health report valuation summary | E-042 | 375x95 flat section uses gray paragraph copy with orange valuation term and white range value | `--cm-comp-portfolio-health-report-section-body-*` |
| Health report quality states | E-043 | Quality rows use red `優良`, white `普通`, and green `注意` state text | `--cm-comp-portfolio-health-report-section-metric-state-*` |
| Health report exception count | E-044 | Header summary keeps muted copy and highlights only the detected count in yellow | `--cm-comp-portfolio-health-report-section-summary-*` |
| Health report exception row | E-044 | Exception rows use pale-yellow 16px title, muted 14px description, and white-8 divider | `--cm-comp-portfolio-health-report-section-exception-*` |
| Profit summary collapsed | E-045 | 110px variant shows only the raised three-column summary surface with compact chart toggles | `--cm-comp-portfolio-profit-summary-*` |
| Profit summary empty | E-045 | Same 110px structure keeps labels but switches profit values to dashes and market value/cost to `0` | `--cm-comp-portfolio-profit-summary-value-empty-color` |
| Profit summary daily expanded | E-045 | 218px variant adds a `#1E1E1E` daily bar chart body; red bars are gains and green bars are losses | `--cm-comp-portfolio-profit-summary-bar-*` |
| Profit summary cumulative expanded | E-045 | 218px variant adds gain/loss split donut and red/green amount summary blocks | `--cm-comp-portfolio-profit-summary-ring-sm-size` |
| Profit summary allocation expanded | E-045 | 226px variant adds allocation donut and five-row legend with separate series colors | `--cm-comp-portfolio-profit-summary-series-*` |
| Relative date today | E-020, E-021 | Date stays white; `今天` uses `#FFEEB1` with a 12px inline icon | `--cm-comp-relative-date-label-*` |
| Relative date future | E-020, E-021 | Future-relative text such as `明天`, `2天後`, and `5天後` uses `#FFEEB1` | `--cm-sys-color-temporal-future` |
| Relative date past | E-020, E-021 | Past-relative text such as `昨天`, `2天前`, and `5天前` uses `#C0C0C0` | `--cm-sys-color-temporal-past` |
| Relative date absolute only | E-020 | Absolute-only date shows the white date without a relative-day label | `--cm-comp-relative-date-label-date-*` |
| Event name label | E-022, E-023 | Financial event names use orange text only, without container fill or selected treatment | `--cm-comp-event-name-label-*` |
| Event table estimate | E-024, E-025 | Dividend/stock distribution estimate line uses amber `#F9A516` below the white primary detail | `--cm-comp-event-table-row-estimate-color` |
| Event table value up/down | E-024, E-025 | EPS and YoY values reuse market red/green semantics while surrounding copy remains white or muted gray | `--cm-comp-event-table-row-value-*-color` |
| Return today default | E-026 | 70x28 outline button uses amber border and 14px medium amber label | `--cm-comp-return-today-button-default-*` |
| Return today disabled | E-026 | Same outline button switches border and label to `#808080`; no opacity layer is shown | `--cm-comp-return-today-button-disabled-*` |
| Event filter dropdown trigger | E-027 | 86x28 trigger uses `#3D3D3D` border, white label, and 8x7 chevron; observed labels are `全部`, `2項事件`, and `11項事件` | `--cm-comp-event-filter-dropdown-*` |
| Event filter option default | E-028, E-029 | Neutral filled option uses `#3D3D3D` container and `#C0C0C0` label | `--cm-comp-event-filter-option-default-*` |
| Event filter option selected | E-028, E-029 | Selected option uses orange `#FF7800` container and white label | `--cm-comp-event-filter-option-selected-*` |
| Event filter sheet open | E-029 | 375px bottom sheet with `#252525` surface, 64px header, centered title, and close icon | `--cm-comp-event-filter-sheet-*` |
| Bottom-sheet close/title header | E-063 | 375x64 `#252525` header uses centered 18px `#C0C0C0` title and optional 16px close icon | `--cm-comp-bottom-sheet-header-*` |
| Bottom-sheet back/title/close header | E-063 | Adds an 18px back icon before the centered title and keeps the close icon on the right | `--cm-comp-bottom-sheet-header-*` |
| Bottom-sheet drag handle | E-063 | 375x20 strip shows a centered 68x4 `#C0C0C0` handle; no-handle variant reserves the same 20px area without the handle | `--cm-comp-bottom-sheet-header-*` |
| Bottom-sheet cell status row | E-064 | 375x58 row uses 24px icon, 18px white label, amber or orange right status text, 14px chevron/check, and white-8 divider | `--cm-comp-bottom-sheet-cell-*` |
| Bottom-sheet gray action row | E-064 | 365x62 row uses normalized `#3D3D3D` 4px-radius action surface with 24px icon and 18px white label | `--cm-comp-bottom-sheet-cell-*` |
| Bottom-sheet switch row | E-064 | 375x59 row uses 24px/32px leading icon, 18px label, and a 43x26 switch slot on the right | `--cm-comp-bottom-sheet-cell-*` |
| Switch Android off | E-078 | 40x24 frame with centered 34x14 white 30% track, 20px light-neutral knob, and low knob shadow | `--cm-comp-switch-android-*` |
| Switch Android on | E-078 | 40x24 frame with orange 50% track and orange 20px knob aligned to the trailing edge | `--cm-comp-switch-android-*` |
| Switch iOS off | E-078 | 43x26 frame with dark neutral 42x26 track and white 22px knob | `--cm-comp-switch-ios-*` |
| Switch iOS on | E-078 | 43x26 frame with orange 42x26 track and white 22px knob | `--cm-comp-switch-ios-*` |
| Selection Control checkbox unchecked | E-079 | 20x20 transparent square with 1px gray `#999999` outline and 2px radius | `--cm-comp-selection-control-checkbox-unselected-*` |
| Selection Control checkbox checked | E-079 | 20x20 orange square with 2px radius and white 2px-stroke checkmark | `--cm-comp-selection-control-checkbox-selected-*` |
| Selection Control radio unselected | E-079 | 20x20 transparent circle with 1px gray `#999999` outline | `--cm-comp-selection-control-radio-unselected-*` |
| Selection Control radio selected | E-079 | 20x20 transparent circle with 1px orange outline and centered 12px orange mark | `--cm-comp-selection-control-radio-selected-*` |
| Bottom-sheet settings sheet open | E-067 | 375x374 sheet stacks close-only header, two gray action rows, and three status/navigation cells on `#252525` | `--cm-comp-bottom-sheet-*`, `--cm-comp-bottom-sheet-cell-*` |
| Bottom-sheet display-mode selected | E-067 | 375x195 nested sheet uses two `#1E1E1E` preview tiles; selected `條列式` tile has a 2px orange outline and both previews contain 74x66 thumbnails | `--cm-comp-bottom-sheet-preview-*` |
| Bottom-sheet preview selector standalone | E-068 | 375x119 selector body preserves the two-tile preview layout outside the full sheet context; selected state remains an orange outline only | `--cm-comp-bottom-sheet-preview-*` |
| Bottom-sheet sort selected | E-067 | 375x307 nested sheet uses 58px rows; selected `漲跌幅高至低` row shows a 21px orange check icon in the leading slot | `--cm-comp-bottom-sheet-selection-*` |
| Bottom-sheet watchlist selected | E-067 | 375x495 sheet uses orange `新增清單`, 20px radio controls, orange selected check/radio on `自選股清單 1`, white unselected radio outlines, a 5x215 scroll thumb, and orange `完成` footer action | `--cm-comp-bottom-sheet-*` |
| Bottom-sheet footer submit | E-069 | 339x65 footer strip contains one 299x41 orange `完成` action with 18px medium white label | `--cm-comp-bottom-sheet-footer-button-*` |
| Popup dialog default | E-080 | Centered popup shows a left secondary outline action and a right orange primary action under optional title/body/media slots | `--cm-comp-popup-dialog-*` |
| Popup dialog empty media | E-080 | Empty media variant keeps the same dialog and footer structure but shows gray placeholder artwork and `圖片等待中...` copy in the media area | `--cm-comp-popup-dialog-empty-*` |
| Global Bubble default | E-082 | Amber anchored callout with dark title/body text, 8px radius, low shadow, and directional arrow | `--cm-comp-global-bubble-*` |
| New badge default | E-065, E-064 | 42x20 red `#F93951` capsule with white Play Bold `New` label marks the action-row variant | `--cm-comp-new-badge-*` |
| MyStock utility icon default | E-065, E-066 | White 24px or 32px utility icons are asset-led and inherit no selected or disabled state | `--cm-comp-mystock-utility-icon-*` |
| Market filter active | E-046 | Active option keeps the same `#333333` item fill as inactive options, changing only the label to orange | `--cm-comp-market-filter-strip-*` |
| Market filter inactive | E-046 | Inactive options use `#333333` item fill with gray `#808080` labels | `--cm-comp-market-filter-strip-*` |
| Primary inventory tab active | E-061 | Active primary tab keeps the same `#252525` strip background and uses a white 16px label | `--cm-comp-market-tab-strip-*` |
| Primary inventory tab inactive | E-061 | Inactive primary tabs use gray `#808080` 16px labels on the same strip background | `--cm-comp-market-tab-strip-*` |
| Primary `看盤/盤後` tab indicator | E-061 | The 11x12 chevron is orange when `看盤/盤後` is active and gray when inactive | `--cm-comp-market-tab-strip-*-indicator-*` |
| Broker/source icon default | E-048 | 46px rounded source container with observed 16.1px centered label normalized to 16px; default state is identity-only | `--cm-comp-broker-icon-*` |
| Broker/source own-holdings icon | E-048 | `我的` variant uses dark `#1E1E1E` label text on an amber container, unlike the white-label broker variants | `--cm-comp-broker-icon-owned-label-color` |
| Promotional badge default | E-057 | 23px yellow gradient badge with 1px pale-yellow outline, dark 12px medium label, and 8px radius | `--cm-comp-promotional-badge-*` |
| Promotional badge fee/VIP emphasis | E-057 | Fee discount variants keep the same badge surface and switch the label weight to semibold, with 82px and 125px observed widths | `--cm-comp-promotional-badge-emphasis-label-weight` |
| Broker import header A | E-058 | 375x38 `#252525` header uses two white 16px labels: `匯入券商` and `使用狀態` | `--cm-comp-broker-import-header-*` |
| Broker import header B | E-058 | 375x37 `#252525` single-label headers show either `使用中券商` or `請選擇欲匯入券商` | `--cm-comp-broker-import-header-*` |
| Broker import row imported/on | E-059 | 375x132 row combines 46px broker icon, white 18px title, inline promo badge, dim helper copy, 69x22 orange outline `查看庫存` action, on switch slot, and bottom divider | `--cm-comp-broker-import-row-*` |
| Broker import menu dropdown default | E-062 | 116x26 `全部` trigger uses a 1px `#B95700` outline, white 16px label, 4px radius, and 11x9 orange chevron | `--cm-comp-broker-import-menu-select-*` |
| Broker import menu actions default | E-062 | `同步` and `編輯` are 26px-high orange outline icon-label actions with 16px icons and 13px labels | `--cm-comp-broker-import-menu-action-*` |
| Broker import menu timestamp present | E-062 | Last update appears as two right-aligned `#909090` 12/14 metadata lines: `上次更新` and a date/time value | `--cm-comp-broker-import-menu-timestamp-*` |
| Portfolio add action outline | E-049 | 48px action uses transparent/dark fill, 1px orange outline, orange icon, and orange 16px medium label | `--cm-comp-portfolio-add-action-button-*` |
| Portfolio add action section dual | E-050 | 375x80 `#252525` section places `手動新增` and `使用截圖同步` buttons side by side with a 12px gap | `--cm-comp-portfolio-add-action-section-*` |
| Portfolio add action section single | E-050 | 375x82 `#252525` section centers a 20px add icon and `新增持股` label with a 7px gap | `--cm-comp-portfolio-add-action-section-*` |
| Add holding sheet default | E-054 | 375x385 `#252525` bottom sheet with `新增持股` header, close icon, four 54px form rows, and disabled gray `確定` action | `--cm-comp-portfolio-add-holding-sheet-*` |
| Add holding duplicate warning | E-054 | Duplicate stock state inserts centered `#FF4F4F` warning copy between the header and form, increasing sheet height to 451px | `--cm-comp-portfolio-add-holding-sheet-warning-*` |
| Add holding stock type selected | E-054 | `現股` is orange-filled while `融資` and `融券` stay transparent with orange outlines and white labels | `--cm-comp-portfolio-add-holding-sheet-segment-*` |
| Add holding tab active | E-054 | Manual tab label is white with a 4px orange underline; inactive image-recognition tab label is `#C0C0C0` | `--cm-comp-portfolio-add-holding-sheet-active-tab-indicator-color`, `--cm-comp-portfolio-add-holding-sheet-inactive-tab-label-color` |
| Add holding quantity stepper | E-054 | Quantity uses 30x30 orange outline plus/minus controls around a 101px centered value field | `--cm-comp-portfolio-add-holding-sheet-stepper-*` |
| Add holding form body | E-055 | 375x216 body stacks four 54px `#252525` rows with left labels and x=157 right-side controls | `--cm-comp-portfolio-add-holding-sheet-form-*` |
| Add holding confirm disabled | E-056 | 295x41 `確定` action uses transparent fill, 1px gray border, and gray 18px medium label | `--cm-comp-portfolio-add-holding-sheet-action-disabled-*` |
| Add holding confirm default | E-056 | 295x41 `確定` action switches to orange fill with white 18px medium label | `--cm-comp-portfolio-add-holding-sheet-action-default-*` |
| Manual import missing value | E-051 | 70x29 `#333333` field shows gray `請填寫` with a 1px pale-orange outline and 4px radius | `--cm-comp-portfolio-manual-import-value-field-*` |
| Manual import entered value | E-051, E-053 | Same field fill shows right-aligned white SF Pro Text numeric value such as `1,000`, without visible outline | `--cm-comp-portfolio-manual-import-value-field-*` |
| Manual import empty value | E-051, E-053 | Same field fill shows right-aligned white dash `-`, without visible outline | `--cm-comp-portfolio-manual-import-value-field-*` |
| Manual import stock identity cell | E-052, E-053 | 136x61 `#252525` sticky stock cell uses 18px delete icon, amber `現股`, white 16px stock name, gray 12px stock code, white-8 divider, and strong right shadow | `--cm-comp-portfolio-manual-import-cell-*` |
| Manual import row composition | E-053 | 557x61 fixed row uses 136 / 78 / 78 / 93 / 78 / 78 / 16 columns with nested value fields | `--cm-comp-portfolio-manual-import-row-*` |

## Inferred States

- Focus-visible: use an outline or state layer derived from system outline tokens. No focus-visible styling was visible in the mobile Figma node.
- Pressed: use existing pressed color tokens for primary/secondary buttons where available; for top/bottom icon actions, prefer a subtle surface change until a reference is provided.
- Disabled: observed outline controls use explicit gray border/text, including return-today disabled and add holding disabled confirm; do not use opacity unless future evidence shows it.
- Loading: not observed. Do not invent skeleton or shimmer styles until a reference is provided.
- Main-force row pressed/focus-visible, selected, loading, empty, no-weather, neutral/sell weather labels, and trade-tag long-label states are not observed.
- Analytics empty state: observed as dash values, not as a skeleton or spinner.
- Preference dropdown/menu state is not observed; do not invent menu styling from this header alone.
- Sort active state and info tooltip are not observed; keep them planned until a reference is supplied.
- Portfolio attribute label pressed, focus-visible, disabled, hover, other percentage values, overflow, and wrapping states are not observed.
- Portfolio fit assessment pressed, focus-visible, disabled, hover, loading, icon-only, and long-label states are not observed.
- Portfolio fit stock sheet backdrop, close/back controls, drag handle, scroll behavior, transition, loading, and error states are not observed.
- Similar Stock Button pressed, focus-visible, disabled, loading, icon-only, and long-label states are not observed.
- Similar Stock Card down/flat quote, already-added, pressed, focus-visible, disabled, loading, empty-feature, long-feature overflow, selected, and whole-card navigation states are not observed. Treat the card as display-first and keep `加入自選` as the only evidenced control.
- Portfolio Stock Sheet Cell pressed, focus-visible, disabled, loading, overflow, selected row, alternate stock identity, and alternate health values are not observed.
- Portfolio fit detail table score thresholds, tooltip open content, row selection, empty values beyond the info row, and long-label wrapping states are not observed.
- Preferred-stock title zero-count, loading, alternate update cadence, and count overflow states are not observed.
- Preferred-stock top bar other attribute categories, pressed/focus icons, and right-action menu behavior are not observed.
- Preferred-stock header active sort, horizontal overflow, and help/info states are not observed.
- Preferred-stock row added/selected watchlist state, pressed/focus-visible, loading, empty, long stock names, and non-high feature values are not observed.
- Valuation label pressed, focus-visible, disabled, loading, selected, and row-context states are not observed.
- Quarter-line icon unknown, disabled, loading, and alternate technical-condition states are not observed.
- Health-check cell pressed/focus-visible, selected, loading, empty, alternate report action, alternate trend direction, and disabled states are not observed.
- Health-check row horizontal scroll behavior and sticky-column runtime behavior are inferred from layout/shadow only; exact scrolling interaction is not observed.
- Health report section empty/no-exception, collapsed, loading, pressed, focus-visible, and long-copy overflow states are not observed.
- Profit summary toggle pressed/focus-visible, loading, error, hidden-cost, long-label overflow, and chart tooltip states are not observed.
- Relative date selected, pressed, disabled, and timezone rollover states are not observed; keep the component visual state passive until a reference shows interactivity.
- Event label selected, pressed, focus-visible, disabled, overflow, and category/severity states are not observed.
- Event table row pressed, focus-visible, loading, empty, selected, linked navigation, and all event-type severity states are not observed.
- Return today pressed and focus-visible states are not observed.
- Event filter dropdown open menu, selected menu item, pressed, focus-visible, and disabled states are not observed.
- Event filter option pressed, focus-visible, disabled, and long-label wrapping states are not observed.
- Event filter sheet close pressed/focus, backdrop, apply/reset, and scroll states are not observed.
- Bottom-sheet header close/back pressed, focus-visible, disabled, title overflow, drag interaction, and safe-area variants are not observed.
- Bottom-sheet cell row pressed, focus-visible, disabled, loading, switch disabled/focus, long-label wrapping, badge collision, and nested menu transition states are not observed.
- Selection Control pressed, focus-visible, hover, disabled, loading, error, indeterminate, mixed, and text-labeled states are not observed.
- Bottom-sheet composite backdrop, open/close animation, drag-to-dismiss, keyboard-open layout, destructive action styling, footer disabled/loading states, preview option pressed/focus, and selection-list overflow beyond the shown scroll state are not observed.
- Bottom Sheet Footer Button pressed, focus-visible, disabled, loading, destructive, and dual-action states are not observed.
- Popup Dialog pressed, focus-visible, disabled, loading, destructive, close-dismiss, single-action, and long-copy overflow states are not observed.
- Global Button hover, focus-visible, loading, destructive, secondary, neutral, long-label wrapping, and icon-only accessible-name copy are not observed.
- Empty State action pressed, focus-visible, disabled, loading, and long-label wrapping states inherit Button behavior when the optional action is rendered; Empty State error, success, compact, body-absent, alternate media asset, replacement illustration, and non-primary action states are not observed.
- Global Bubble hover trigger behavior, focus-visible behavior, dismissed state, interactive content, loading, error, and long-copy overflow are not observed.
- Attached Floating Action Pill pressed, focus-visible, disabled, loading, and runtime transition states between Default and `關閉下單` are not observed. The visible `關閉下單` property is an edit-only mode, not disabled order styling.
- Stock Label pressed, focus-visible, selected, disabled, loading, dismissible/removable, icon-leading, and long-name overflow states are not observed. Treat it as display-only unless a host component supplies interaction.
- Stock Card pressed, focus-visible, selected, bookmarked, loading, empty, collapsed, expanded, bearish, author-overflow, and long-body truncation states are not observed. Treat `type=defualt` as the source spelling for the neutral/default visual only; implementation APIs should expose a correctly spelled default alias.
- Stock Calendar month picker expanded state, info tooltip, empty selected cell, focus-visible, pressed, hover, loading, error, full empty month, weekend/holiday handling, alternate month lengths, weekly summary interaction, and row/column scrolling behavior are not observed. Treat the strong red day as highlighted/high-intensity up; selected red/green cells use border-only treatment from `E-093`.
- Trend Analysis Header other active range states, custom picker open/selected, info tooltip, share pressed/focus-visible, range pressed/focus-visible, disabled, loading, and long-label behavior are not observed. Treat the visible `全部` fill as selected range state only, not a global disabled or market filter state.
- Asset Trend Chart loss/neutral P/L, hidden values, loading, empty, error, range changes, crosshair drag/tap behavior, expanded tooltip content, focus-visible chart interaction, and responsive plot resizing are not observed. Treat the visible date marker as a selected-date annotation only, not a Global Bubble or interactive tooltip.
- Trend Analysis Bar Chart empty values, loading, error, selected-bar state, tooltip content, hover, pressed, focus-visible chart interaction, alternate axis scales, x-axis labels, and responsive plot resizing are not observed. Treat visible bars as default signed data only, not selected or highlighted bars.
- Top App Bar stock-title icon pressed/focus states, title truncation algorithm, and previous/next disabled states are not observed.
- Realtime Quote Tile pressed/focus-visible, selected, loading, suspended, empty, down-price, no-change, chart-empty, and long-stock-name states are not observed.
- New Badge dismissed, disabled, pressed/focus-visible, localization, long-label, loading, and non-red variants are not observed.
- MyStock Utility Icon selected, pressed, focus-visible, disabled, loading, alternate colors, and badge overlays are not observed.
- Market filter pressed, focus-visible, disabled/unavailable, horizontal overflow, and long-label wrapping states are not observed.
- Primary inventory tab pressed, focus-visible, disabled/unavailable, horizontal overflow, long-label wrapping, and expanded `看盤/盤後` menu states are not observed.
- Broker/source icon selected, pressed, focus-visible, disabled, loading, unavailable, connected/disconnected, and account-linking states are not observed.
- Promotional badge pressed, focus-visible, disabled, dismissible, loading, long-label, and non-yellow states are not observed.
- Broker import header sticky, sort, pressed/focus-visible, loading, and long-label states are not observed.
- Broker import row-specific switch disabled/loading/error states, row pressed/focus-visible, unsupported broker, no-promo, sync error, and long broker-name states are not observed.
- Standalone Switch off/on states are now evidenced in E-078; pressed, focus-visible, hover, disabled, loading, indeterminate, and platform transition behavior remain undefined.
- Broker import menu dropdown expanded, selected broker, sync/edit pressed, focus-visible, disabled, loading, sync error, edit mode, timestamp absent, and timestamp format variants are not observed.
- Portfolio add action button pressed, focus-visible, disabled, loading, permission-denied, sync-progress, upload-error, and success states are not observed.
- Portfolio add action section follow-up sheet is observed for `新增持股`; screenshot sync, permission, syncing, empty-source, upload-error, and success behavior are not observed.
- Portfolio add holding sheet selected-stock, pressed/focus-visible, loading, image-recognition tab selected content, keyboard-open layout, per-field validation, save success, and network/sync error states are not observed.
- Portfolio manual import value field focused editing, caret, keyboard, validation error, disabled, loading, pressed, and hover states are not observed.
- Portfolio manual import cell focus, selected row, active edit, delete pressed/focus, validation error, disabled, and loading states are not observed.
- Portfolio manual import row selected, row pressed/focus, horizontal scroll runtime, row error summary, successful import, conflict, loading, and disabled states are not observed.

## Rules

- Mobile-only controls do not need hover styles unless implemented in a web environment.
- Selection should follow the evidenced component treatment: event filter options use filled surfaces, bottom-sheet preview choices use outlines, and Stock Calendar Cells use border-only selection.
- Market-state colors override generic success/error meanings inside quote and chart contexts.
- Main-force buy colors and trade-tag colors are domain signals; do not rename or reuse them as generic error, warning, promotion, or portfolio-category styles.
- Main-force weather icon-only states require accessible text because the three-day variant has no visible label.
- Portfolio category colors must not be interpreted as market gain/loss states.
- Portfolio attribute active and inactive states use fill/transparent treatment; do not use opacity to fake the unlit state unless future evidence shows it.
- Portfolio fit assessment match/mismatch tokens are not generic success/error tokens and should not be renamed to market movement.
- Portfolio fit stock sheets keep one neutral similar-stock action; do not add extra CTAs, orange submit styling, or explanatory copy without evidence.
- Portfolio stock sheet cells are portfolio-domain cells; do not use generic Bottom Sheet Cell tokens for attribute-tab or health-title summary rows.
- Portfolio fit score colors are scoring semantics, not market movement semantics.
- Preferred-stock discovery uses table state language; do not convert add-to-watchlist into a large CTA.
- Valuation unavailable is a valuation result, not a disabled control state.
- Health-check diagnostic cells should remain table cells; report action is the only observed inline action.
- Quarter-line red/green icons express technical conditions, not generic success/error.
- Temporal date colors must not be interpreted as market movement, success, warning, or portfolio category colors.
- Event-name orange must not be treated as a primary CTA state unless the component gains explicit interaction evidence.
- Event table row borders are structural; do not infer hover or selected state from the default bordered surface.
- Disabled outline controls use explicit gray text and border; do not add opacity unless a future reference shows it.
- Event filter dropdown trigger does not define the expanded menu surface.
- Event filter sheet selected categories use filled orange option cells; do not represent selection with outline-only treatments in this context.
- Bottom-sheet headers define sheet chrome only; do not infer sheet body state or backdrop behavior from these header variants.
- Bottom-sheet cells are row commands/settings, not cards; do not add card hover, large row expansion, or secondary descriptions without evidence.
- Switch off/on states should come from the standalone Switch component; do not create row-local switch colors or sizes inside Broker Import Row or Bottom Sheet Cell.
- Bottom-sheet composite settings should use nested compact sheets for preview and sort choices; selection is shown by orange outline, check, or radio/check control depending on the variant, not by changing the whole row fill.
- Bottom Sheet Footer Button is primary only when the sheet collects a selection set, such as watchlist assignment; do not add a footer CTA to status-only settings sheets without evidence.
- Popup Dialog footer actions are dialog-scoped. Do not reuse Bottom Sheet Footer Button or add bottom-sheet footer strips inside centered dialogs.
- Button disabled states use explicit gray border/label treatment. Do not use opacity-only disabled styling for global primary buttons.
- Trend Analysis Bar Chart red/green bar fills are signed data semantics around zero. Do not reinterpret them as error/success states, portfolio categories, or selected bars.
- Empty State is a page/section feedback composition, not a popup dialog or modal. Do not add dialog footer rails, bottom-sheet chrome, backdrop behavior, or modal dismiss states.
- Empty State action slots must compose the existing Button primitive. Only the host-owned 266px width, 16px body/action gap, and centered placement belong to Empty State.
- Global Bubble is passive contextual information unless future evidence shows interactive content; do not add close buttons, CTAs, or menu selection states.
- Attached watchlist floating actions are Floating Action Pill variants, not global Button groups, segmented controls, or bottom-sheet action rows.
- Stock Label is a compact identity marker, not an action chip, valuation badge, main-force tag, or quote row. Do not infer selection, removal, or button behavior from the raised container alone.
- Stock Card sentiment tags are commentary/feed state, not market price movement, portfolio valuation, or filter selection. Do not infer bearish/bookmark/collapsed/expanded states, reaction controls, or card-selection visuals from the default and bullish variants.
- Stock Calendar market washes are return states, not success/error or validation. Stock Calendar Cell selected state is border-only and must not become an orange filled date-picker selection. Do not invent event-dot, weekend, hover, focus-visible, or tooltip states from the observed return grid.
- Trend Analysis Header range selection uses a muted gray filled segment and should not be recolored orange, underlined, or converted to a market tab strip. Keep `自訂` outside the range group as an outline action until a picker-open source is available.
- Do not infer a disabled `下單` visual from the `關閉下單` property; when ordering is closed, render the 76px edit-only attached pill.
- Realtime Quote Tile weather is tile-specific; do not replace it with row-bound Main Force Weather Indicator sizing or use the 40px `大買` signal in list rows.
- New Badge is a novelty marker, not a promotional badge or action state.
- MyStock Utility Icon color remains white unless a future source shows selected, disabled, or status-colored icon states.
- Market filter selection is label-color only; do not introduce an orange fill, underline, or icon for active state without future evidence.
- Primary inventory tab selection is white label text only; do not introduce an underline, filled active tab, or large segmented treatment without future evidence.
- Broker/source icons communicate identity, not account status; do not add selection rings, checkmarks, badges, or gray disabled overlays without future evidence.
- Promotional badges communicate promo/fee metadata, not validation, market movement, or primary action state.
- Broker import rows are list rows with one compact inline action and one switch slot; do not add card hover, card elevation, secondary CTAs, or inferred switch-off styling without evidence.
- Broker import menu controls remain outline-based and 26px high; do not collapse sync/edit to icon-only or expand the row into a toolbar card without evidence.
- Portfolio add-holding actions are outline actions; do not promote them to filled primary buttons, upload cards, or onboarding prompts without future evidence.
- Portfolio add holding sheets use explicit gray for disabled confirm and orange fill for default confirm; do not use opacity to fake disabled state, do not treat duplicate warning red as market movement, and do not infer image-recognition panel content from the inactive tab alone.
- Portfolio manual import missing value is an incomplete-data state, not a focus ring or full error state; do not add error red, helper copy, or validation banners without future evidence.
- Manual import rows must remain fixed-column and horizontally table-like; do not collapse them into form cards without a responsive reference.
