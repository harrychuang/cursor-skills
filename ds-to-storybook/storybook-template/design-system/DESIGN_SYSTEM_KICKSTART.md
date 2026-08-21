# ChipK Design System Kickstart

This package captures the design-system extraction for ChipK from supplied color styles and Figma references.

## Current Scope

- Color, typography, spacing, shape, size, and state tokens.
- Mobile dark trading/watchlist app shell.
- Extracted components: top app bar, bottom navigation, realtime quote row, realtime quote tile, stock label, stock card, main force stock row, main force weather indicator, main force trade tag, portfolio preference header, portfolio fit chart, portfolio fit list header, portfolio fit stock row, portfolio attribute label, portfolio fit assessment indicator, portfolio stock sheet cell, portfolio fit stock sheet, portfolio fit detail table, similar stock button, portfolio preferred stock title, portfolio preferred stock top bar, portfolio preferred stock list header, portfolio preferred stock row, valuation label, quarter line status icon, portfolio health check cell, portfolio health check row, portfolio health report section, portfolio profit summary, bottom sheet, bottom sheet footer button, bottom sheet header, bottom sheet cell, switch, selection control, MyStock utility icon, New Badge, broker icon, promotional badge, broker import header, broker import row, broker import menu, portfolio add action button, portfolio add action section, portfolio add holding sheet, portfolio manual import value field, portfolio manual import cell, portfolio manual import row, market tab strip, market filter tab strip, relative date label, event name label, event table row, return today button, event filter dropdown, event filter option, event filter sheet, floating action pill, edge status toggle, popup dialog, global bubble, button, and empty state.

## Primary Source

- Figma node `25668:74952`: `即時報價_看盤盤後展開`
- Figma node `29209:160554`: `庫存股` / `持股分析` `速配度圖表`
- Figma node `29207:159069`: `庫存股` / `持股分析` `速配度標題`
- Figma node `29208:159790`: `庫存股` / `持股分析` `速配度` `表頭`
- Figma node `29208:159824`: `庫存股` / `持股分析` `速配度` `股票列表`
- Figma node `29209:159854`: `個股屬性特徵` variants
- Figma node `29209:159887`: `速配評估` variants
- Figma node `29209:162730`: `持股速配/長期存股/股票彈窗`
- Figma node `29209:162829`: portfolio `bottom sheet_cell` variants
- Figma node `29209:162952`: `持股速配/股票彈窗/項目表頭列表`
- Figma node `29209:163029`: `持股速配` detail row variants
- Figma node `29210:28828`: `BTN/相似股`
- Figma node `29209:171175`: `持股速配/偏好股票/標題`
- Figma node `29209:171182`: preferred-stock `Top Bar`
- Figma node `29209:171392`: `庫存股/持股速配/偏好的股票/表頭列表`
- Figma node `29209:171407`: `庫存股/持股速配/偏好的股票/股票列表`
- Figma node `29209:173791`: `BTN` valuation label variants
- Figma node `29209:173867`: `icon` quarter-line status variants
- Figma node `29209:173922`: `庫存股` health-check cell variants
- Figma node `29209:173935`: `Group 48096023` health-check row composition
- Figma node `29210:26286`: `持股體檢/評價` report section
- Figma node `29210:26310`: `持股體檢/體質` report section
- Figma node `29210:26525`: `持股體檢/掃雷` report section
- Figma node `29199:89866`: `庫存股` `即時損益` summary variants
- Figma node `29199:89369`: `庫存通用元件` common inventory control frame
- Figma node `29199:20518`: primary inventory `tab` variants
- Figma node `29207:96213`: `自選股_即時報價（放大版`
- Figma node `29207:95624`: `tag` main-force trade tag variants
- Figma node `29207:95615`: `庫存股/看盤盤後/主力籌碼/股票列表`
- Figma node `29207:97253`: `籌碼天氣` variants
- Figma node `7033:249934`: `庫存股/匯入庫存/券商選單`
- Figma node `16405:224712`: `bottom sheet_上方的關閉與返回`
- Figma node `16405:224726`: `bottom sheet_cell`
- Figma node `8134:289037`: standalone `switch` component set
- Figma node `22911:207990`: standalone `勾選` selection control component set
- Figma node `16405:224755`: `bottom sheet` composite variants
- Figma node `16405:233530`: bottom-sheet preview selector standalone set
- Figma node `16405:224793`: `button_bottom sheet`
- Figma node `29207:103989`: bottom-sheet utility icon and `New` badge frame
- Figma node `29207:103647`: MyStock 32px utility icon variants
- Figma node `29213:87255`: broker/source icon variants
- Figma node `23517:229465`: `宣傳用` promotional badge variants
- Figma node `8159:289815`: `券商頁表頭` broker import header variants
- Figma node `15937:219728`: `andr_券商匯入_cell/已匯入_Ai圖片匯入` broker import row
- Figma node `29213:89332`: portfolio add/sync outline action button variants
- Figma node `29215:94535`: portfolio add-holding action section variants
- Figma node `7533:257724`: `新增持股` bottom sheet variants
- Figma node `7533:256932`: `新增欄位/v2` add-holding form body
- Figma node `7533:257087`: add-holding `確定` action default/disabled states
- Figma node `29214:89592`: portfolio manual import value field variants
- Figma node `29215:89650`: portfolio manual import header and row cell variants
- Figma node `29215:89662`: portfolio manual import row composition
- Figma node `29202:31008`: `看盤盤後` secondary market filter variants
- Figma node `29202:88715`: `庫存側邊按鈕` action pill variants
- Figma node `19215:187463`: `日期` relative date label variants
- Figma node `19215:187525`: `事件名稱` event name label variants
- Figma node `19215:187556`: `事件Table` stock event row variants
- Figma node `19215:187687`: `button` return today variants
- Figma node `19215:187703`: `下拉選單` event filter dropdown trigger variants
- Figma node `19215:187371`: `重大事件篩選` bottom sheet
- Figma node `19215:187453`: `一個選項` event filter option variants
- Figma node `5906:218640`: `彈窗` popup dialog variants
- Figma node `594:2002`: stock-title Top App Bar variants
- Figma node `29503:80044`: `global/Bubble` variants from canvas `202:4`
- Figma node `1934:94`: global Button component set
- Figma node `18095:175915`: `自選股_即時_方塊` realtime quote tile variants
- Figma node `5862:221812`: `空值` empty-state variants
- Figma node `51034:5228`: `自選floating btn` attached floating action variants
- Figma node `47327:64981`: `股票標籤` compact stock label
- Figma node `51036:377157`: `stock-card` default/bullish stock feed card variants
- Figma URL: https://www.figma.com/design/vSr4NtEwPVs6wLpqCT5PtV/%E7%B1%8C%E7%A2%BC-K-%E7%B7%9A-ChipK--Design-System-Lab-?node-id=25668-74952&t=WxKaWAsf8pag0B5I-1

## Working Rule

Use tokens first. When a future Figma reference introduces a new value, add it to the correct token layer before writing component or implementation guidance.
