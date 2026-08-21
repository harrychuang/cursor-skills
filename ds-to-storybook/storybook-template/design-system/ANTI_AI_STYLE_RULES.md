# Anti-AI Style Rules

## Do Not Genericize This App

- Do not turn dense quote screens into landing pages or dashboards with hero sections.
- Do not add glassmorphism, glow blobs, gradients, bokeh, abstract illustrations, or oversized empty states.
- Do not wrap every quote row or control bar in cards.
- Do not increase whitespace to make the screen feel premium; the reference is intentionally dense.

## Color Restraints

- Do not tint the entire interface orange. Orange is reserved for primary action and selected financial controls.
- Do not treat red as error or green as success inside market data. In this product context, red means stock up and green means stock down.
- Do not treat main-force buy red or trade-tag pink/warm colors as generic error, warning, promotion, or portfolio category colors.
- Do not treat button disabled gray as opacity. The global button source shows explicit gray border and label states.
- Do not invent new saturated state colors without Figma evidence.

## Type Restraints

- Do not introduce display typography for app bars, list rows, or bottom navigation.
- Do not make all labels bold. Current evidence uses PingFang TC regular.
- Do not reduce numeric contrast unless the value is secondary metadata or inactive.

## Surface Restraints

- Use dark surface layers and dividers for structure.
- Do not add shadows or elevation unless future references show them.
- Keep row edges square and full width.

## Data Restraints

- Preserve fixed numeric columns and right alignment.
- Use realistic Taiwan stock labels and quote formatting in examples.
- Do not replace inline market charts with decorative placeholders.
- Do not turn Realtime Quote Tile into a generic stock card, dashboard tile, or editorial recommendation card; preserve the 170x148 quote-tile density and bottom chart/weather region.
- Do not replace full-width Realtime Quote Row with Realtime Quote Tile in list contexts.
- Do not turn Stock Label into a stock card, filter chip, valuation badge, main-force tag, profile header, or CTA. Preserve its 28px display-only identity-marker role.
- Do not add icons, close buttons, price values, market colors, borders, gradients, or shadows to Stock Label without Figma evidence.
- Do not turn Stock Card into a generic social card, editorial recommendation, quote tile, event-row feed card, empty-state panel, popup, or broker import row. Preserve the 375px stock commentary unit with sentiment, author metadata, body copy, and square feed surface.
- Do not add reactions, bookmarks, thumbnails, charts, price columns, large radii, shadows, gradients, or marketing-card artwork to Stock Card without Figma evidence.
- Do not infer Stock Card bearish, bookmarked, collapsed, expanded, loading, selected, or long-body truncation states from the observed neutral/default and bullish variants.
- Do not turn Stock Calendar into a generic seven-day date picker, event calendar, full-screen heatmap dashboard, card stack, or explanatory analytics panel.
- Do not add weekend columns, event dots, holiday tags, legends, filter chips, tooltip surfaces, or month-picker menus to Stock Calendar without Figma evidence. The only evidenced selectable-day treatment is a 1px Stock Calendar Cell border.
- Do not reinterpret Stock Calendar red/green washes as success/error or generic heatmap intensity. Red remains market-up/positive return and green remains market-down/negative return.
- Do not replace Stock Calendar's 57x62 cells, weekly summary column, no-market cells, or empty outside-month outlines with Relative Date Label, Event Table Row, Return Today Button, or generic Calendar Grid treatments.
- Do not turn Stock Calendar Cell selected state into an orange filled date-picker state; selected red/green cells keep their 30% wash and add only the market-color border, while selected zero/no-market cells use a white border.
- Do not turn Trend Analysis Header into a global top app bar, primary inventory tab, secondary market filter strip, event filter option group, large chip set, or Button group.
- Do not recolor Trend Analysis Header selected range state orange, add underlines, add icons to range options, or move `自訂` into the filled range group without Figma evidence.
- Do not add custom picker menus, tooltip surfaces, loading skeletons, weekend/event/calendar controls, explanatory copy, or chart legends to Trend Analysis Header from this source alone.
- Do not turn Asset Trend Chart into a generic dashboard card, chart-card scaffold, profit summary module, portfolio fit donut, quote mini chart, or Global Bubble callout.
- Do not add legends, chart titles, explanatory captions, large tooltip cards, framed plot panels, decorative gradients, or oversized axes to Asset Trend Chart without Figma evidence.
- Do not replace the 343px orange area-line series, muted 12px axis labels, 117px selected-date cursor, or compact neutral date marker with stock placeholders, abstract chart art, or marketing-style analytics visuals.
- Do not turn Trend Analysis Bar Chart into a generic dashboard histogram, rounded sparkline card, profit-summary chart, quote mini chart, or portfolio fit bar table.
- Do not add legends, x-axis labels, selected-bar highlights, tooltip bubbles, rounded bars, gradient fills, card gutters, or summary metrics to Trend Analysis Bar Chart without Figma evidence.
- Do not replace its 37px y-axis column, 298px plot, 8px square bars, zero-baseline structure, or red/green 50% signed fills with abstract chart placeholders.
- Do not reuse the 40px tile `大買` signal in 61px main-force rows.
- Do not convert main-force weather indicators into charts, legends, cards, large icons, or explanatory panels inside list rows.
- Do not turn `隔日沖` / `短沖` trade tags into filled chips, promotional badges, filter pills, or CTA buttons.
- Do not hide the empty main-force trade tag; the observed empty state is a visible dash.
- Do not reuse Portfolio Attribute Label for main-force trade tags; the semantics, size, and colors differ.
- Do not turn portfolio analysis charts into generic dashboard widgets with legends, shadows, or oversized donut charts.
- Keep analytics color semantics tied to holding attributes, not generic marketing categories.
- Do not inflate portfolio preference headers into explanatory cards; they are compact controls, not content blocks.
- Do not convert portfolio fit lists into card grids; they are compact rows under a fixed column header.
- Do not turn portfolio attribute labels into large chips, cards, legends, or explanatory badges; they are compact 105x24 row markers.
- Do not reinterpret fit assessment red/green icons as market movement, success, or error. The observed meaning is `速配` / `不速配`.
- Do not turn portfolio fit stock sheets into full-screen profiles, dashboard cards, or explainer pages; the observed pattern is a compact bottom sheet.
- Do not merge portfolio stock sheet identity, attribute tab, or health title cells into generic settings rows; these are domain-specific table-led sheet cells.
- Do not recolor the similar-stock action orange or treat it as a submit button; it is a neutral navigation CTA.
- Do not turn Similar Stock Card into a generic stock feed card, quote tile, dashboard recommendation, profile header, or portfolio-fit bottom sheet. Preserve the 356x293 result geometry, orange similarity chip, top-right `加入自選` action, and right-side feature-summary panel.
- Do not convert Similar Stock Card feature text into chips, badges, charts, progress bars, or colorful topic tags without future Figma evidence; the observed feature panel is text-led with simple dividers.
- Do not treat the Similar Stock Card `相似度` chip as a selectable filter chip or global Button variant; it is a result marker in this source.
- Do not add progress bars, star ratings, badges, or chart widgets to the portfolio fit detail table without Figma evidence.
- Do not collapse empty performance cells in info rows; the fixed 171/100/64 detail-table columns must remain aligned.
- Do not turn the 14px info icon into a large help button, badge, or explanatory inline copy without future tooltip evidence.
- Do not treat the red score column as stock-up market data.
- Do not convert preferred-stock discovery lists into recommendation cards, tile grids, or editorial stock profiles.
- Do not make valuation labels into market up/down badges; valuation has its own color semantics.
- Do not treat `無法評估` valuation as a disabled button unless an interaction reference shows button behavior.
- Do not turn portfolio health-check rows into cards, score panels, progress widgets, or explanatory dashboards.
- Do not replace the compact `看報告` inline action with a large CTA button.
- Do not split health report valuation, quality, or exception rows into separate cards, warning banners, remediation panels, or dashboard widgets.
- Do not add extra icons to health report exception rows; the observed row language is text plus divider only.
- Do not split the realtime profit/loss summary into three separate metric cards; keep it as one compact three-column module.
- Do not enlarge the daily/cumulative/allocation charts into dashboard panels, add decorative gradients, or recolor allocation series to match portfolio attribute categories.
- Do not reinterpret quarter-line red/green icons as generic success/error controls.
- Do not turn relative date labels into large calendar cards, decorative badges, or timeline illustrations.
- Do not reuse the pale temporal yellow as a generic warning, success, market, or portfolio category color.
- Do not convert event name labels into pills, chips, tags, icons, or filled CTA buttons.
- Do not assume orange event text is interactive just because it matches the primary action color.
- Do not turn event table rows into large feed cards with avatars, shadows, thumbnails, or editorial summaries.
- Do not replace right-aligned event values with generic status badges unless a future Figma reference shows that treatment.
- Do not inflate return-to-today controls into large calendar navigation buttons.
- Do not style the event filter dropdown as a rounded chip group or segmented control; the observed control is a single compact trigger.
- Do not turn the event filter sheet into a full-screen settings page, search panel, or explanatory form.
- Do not replace filled event filter options with outline chips or pill tags.
- Do not turn bottom-sheet headers into decorative cards, large title blocks, translucent bars, or blurred iOS-style chrome.
- Do not add helper copy, subtitles, search fields, or badges to Bottom Sheet Header unless future Figma evidence shows that composition.
- Do not turn bottom-sheet cells into card rows, large settings panels, avatar menus, or icon-only grids; the observed language is dense 58-59px rows.
- Do not turn bottom-sheet settings flows into full-screen settings pages, onboarding panels, or card stacks; the observed pattern is compact nested sheets.
- Do not turn popup dialogs into bottom sheets, generic SaaS modals, onboarding cards, toast banners, or empty-state pages; preserve the centered 292px prompt with optional media and two compact footer actions.
- Do not turn Empty State into a marketing hero, onboarding carousel, modal prompt, card stack, full-screen illustration panel, or decorative empty-page poster; preserve the 375x563 section-level feedback frame.
- Do not create a custom Empty State CTA style. Compose the existing Button primitive and let Empty State own only the 266px host width, vertical placement, and optional action slot.
- Do not turn Global Bubble into a popup dialog, dropdown menu, promotional badge, toast, or help card; preserve the amber anchored callout with directional arrow.
- Do not replace display-mode preview thumbnails with generic illustrations, stock placeholders, or enlarged previews.
- Do not represent bottom-sheet selection by changing entire row backgrounds; observed selection uses an orange preview outline, orange check icon, or radio/check control.
- Do not add footer actions to status-only bottom sheets; the observed `完成` footer appears only on the watchlist multi-select sheet.
- Do not split the Bottom Sheet Footer Button into dual actions, add destructive styling, or add loading/disabled visuals without future evidence.
- Do not use the global Button component to erase scoped action contracts such as Bottom Sheet Footer Button, Portfolio Add Action Button, Similar Stock Button, Return Today Button, or Event Filter Option.
- Do not invent global Button hover, destructive, loading, secondary, or neutral variants from the primary button source.
- Do not restyle disabled global Button variants as filled gray controls; the observed disabled state is a transparent/dark control with gray border and text.
- Do not restyle the extracted Switch as a generic checkbox, large text toggle, pill button, or segmented control; preserve the compact Android/iOS geometry from the Figma switch component set.
- Do not restyle the extracted Selection Control as a browser-default checkbox/radio, toggle switch, filled text chip, pill, or row background selection; preserve the 20px checkbox/radio geometry from the Figma component set.
- Do not reuse the yellow Promotional Badge for the red `New` marker, and do not expand the New Badge into a promo banner or warning pill.
- Do not turn secondary market filters into large chips, colorful tags, underlined web tabs, or segmented controls; active state is orange text on the same dark item fill.
- Do not turn primary inventory tabs into underlined web tabs, orange filled tabs, large segmented controls, or card headers; active state is white text on the same 37px dark strip.
- Do not add chevrons or dropdown affordances to primary inventory tabs other than `看盤/盤後` without Figma evidence.
- Do not recolor, redraw, or replace broker/source containers with generic account, bank, avatar, or wallet icons.
- Do not add status badges, checkmarks, notification dots, or disabled overlays to broker/source icons without Figma evidence.
- Do not turn promotional badges into large banners, glowing tags, CTA buttons, icon chips, warning pills, or market-status labels.
- Do not use the yellow promo badge gradient as a generic warning, success, marketing hero, or highlight background.
- Do not turn broker import rows into account cards, setup wizards, dashboard tiles, or two-column settings panels.
- Do not turn the broker import menu into a toolbar card, settings banner, or explanatory helper panel.
- Do not replace the `同步` and `編輯` broker import menu actions with icon-only buttons or large filled CTAs without Figma evidence.
- Do not change the broker import menu height from the observed 42px target without a newer source.
- Do not create row-local switch artwork inside broker import rows; compose the extracted Switch and keep disabled/loading/error switch styling undefined until future evidence shows it.
- Do not replace the compact `查看庫存` outline action with a full-width button or a filled primary CTA without Figma evidence.
- Do not turn add-holding entry points into onboarding cards, upload panels, permission explainers, or oversized full-width CTAs.
- Do not fill the add/sync outline actions with orange unless a future state reference shows that treatment.
- Do not convert the add holding bottom sheet into a full-page form, wizard, stacked cards, or explanatory import flow.
- Do not add helper text, progress indicators, validation banners, or extra confirmation copy to the add holding sheet unless future Figma evidence shows those states.
- Do not enlarge the `確定` action beyond the observed 295x41 compact control or split it into multiple footer actions.
- Do not restyle the enabled `確定` action as an outline control; the observed enabled/default state is orange filled with white text.
- Do not treat the add holding duplicate warning red as market-up data, and do not recolor it into generic danger styles without product evidence.
- Do not expand the stock type segmented control into large chips, pills, or a separate selector sheet.
- Do not convert manual import rows into stacked form cards, spreadsheet-like desktop panels, or expanded wizard steps.
- Do not replace compact `請填寫` fields with large labeled inputs, helper text, or error banners without Figma evidence.
- Do not treat the pale-orange missing-value outline as a generic focus or error style.
- Do not enlarge side action pills into floating panels or FAB circles; keep `設定`, `編輯`, and `下單` as compact 68x30 icon-label pills.
- Do not turn the attached watchlist Floating Action Pill into a toolbar, FAB group, segmented control, global Button pair, or bottom-sheet action row; preserve the 152x38 black capsule group, 76x38 edit-only variant, center divider, 24px outer radius, and low shadow.
- Do not recolor the attached watchlist Floating Action Pill orange or warm gray unless future evidence shows that state; its observed container is black with white label/icon content.
- Do not enlarge stock-title top bars into profile headers or add subtitles/price summaries; the observed variant is still compact app-bar chrome.
