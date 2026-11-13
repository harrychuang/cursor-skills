# Component Inventory

| Component | Seen in | Status | Priority | Fingerprint summary | Required tokens | Missing states / modes | Notes |
|---|---|---|---|---|---|---|---|
| Signal Light Card | R01 | extracted | P0 | One technical signal with its state | color, type, shape | none | Primary product metaphor |
| App Shell | R01, R03 | extracted | P1 | Page frame with navigation | color, type | none | Header controls on every route |

## Component Similarity Review

| New candidate | Similar existing component | Visual reference | Similarity reason | Suggested action | Developer decision | Rationale / owner |
|---|---|---|---|---|---|---|
| Signal Light Card | Mini Signal Light row | ![Market route](assets/component-review/route-market.png#xywh=pixel:40,220,144,300) ![Stock route](assets/component-review/route-stock.png#xywh=pixel:656,314,284,32) | Both show the same signal states; the card adds a title and reason, the row is a compact glyph group. | make variant | | Treat the mini lights as a compact display variant of the same signal language. |
| Dense Data Ranking Table | Industry Overview Table | ![Stock route](assets/component-review/route-stock.png#xywh=percent:3.333,33.333,93.334,62.222) | Same table skeleton, row height and mini lights; the industry table drops the code column. | make variant | | One ranking table with stock and industry row variants prevents drift. |
| Section Legend Band | Section Heading Stack | ![Market route](assets/component-review/route-market.png#xywh=pixel:40,170,1120,34) ![Market route](assets/component-review/route-market.png#xywh=pixel:40,110,492,40) | Both introduce the section, but the legend explains the signal colors and the heading only names the section. | keep distinct | | The legend is a data key; the heading is a structural label. |
| App Shell Controls | Required-Light Filter Chips | ![Stock route](assets/component-review/route-stock.png#xywh=pixel:204,6,972,44) ![Stock route](assets/component-review/route-stock.png#xywh=pixel:112,198,452,60) | Both are pill controls with the same active fill; the chips allow more than one selection. | make variant | | One segmented control family with single-select and multi-select variants. |
