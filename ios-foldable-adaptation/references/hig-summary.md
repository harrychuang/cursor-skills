# Apple HIG「Designing for iPhone Duo」重點

來源：https://developer.apple.com/design/human-interface-guidelines/designing-for-iphone-duo（2026-09-09 新頁面）。網頁是 JS 渲染，WebFetch 只拿得到標題；全文用 `https://developer.apple.com/tutorials/data/design/human-interface-guidelines/designing-for-iphone-duo.json` 取得。開發文件：Preparing your app for iPhone Duo、`UIVerticalBarEdge`、`UIViewController.preferredVerticalBarBehavior`、`UIBarButtonItem.axisBehavior`／`visibilityPriority`、`UIVerticalBarCompressionBehavior`、`UIArrangementViewController`、`UIView.ReservedRegion`。

下面把每條指南翻成我們做決定時會用到的話，並附原文關鍵句，方便在報告的「HIG 對照表」引用。

## 總原則

| # | 指南 | 對我們的意思 | 原文 |
|---|---|---|---|
| H1 | Build your app to resize | 用 size class、layout margin、safe area 排版；不要寫死寬度、不要綁定特定螢幕。外螢幕＝compact、內螢幕＝regular，就是全部姿態的基礎，不要為每個姿態做獨立版面。 | "Use size classes, layout margins, and safe area insets… Avoid fixed widths and display-specific dependencies." "A compact width layout for the outer display and a regular width layout for the inner display give you the fundamentals for every pose." |
| H2 | Create a consistent experience across displays | 開合時功能與狀態（選中的分頁、清單、篩選）不變；內螢幕可以多顯示一層階層（Mail 展開後清單＋內容並排）。 | "Keep functionality and the state of elements the same between displays… show an additional level of hierarchy on the larger inner display if it makes sense." |
| H3 | Maintain the same functionality across device poses | 控制項可以溢位或移動，但每個姿態都要拿得到同一組功能。 | "Provide access to the same controls and content regardless of how someone holds or views the device." |
| H4 | Follow the system's vertical layout | 外螢幕與內螢幕橫向時，系統把 toolbar、tab bar、導覽按鈕、狀態列、動態島移到側邊；用標準元件自動得到；可以微調但不建議覆寫預設擺放。 | "If you use standard system components, you receive this layout automatically… In general, don't override the default bar placement." |
| H5 | Avoid extreme layout changes when folding | 開合只移動必要的元件；消失或大幅移位的控制項難找。 | "Move only what's necessary… favor small adjustments over rearrangement." |
| H6 | Adapt your layout when the device folds | 優先用會自動適應的容器（split view）；格狀版面用偶數欄；用 ReservedRegion 避開摺痕。 | "Prefer a layout container that adapts automatically… prefer an even number of columns." |

## 直欄（Vertical controls）

| # | 指南 | 對我們的意思 | 原文 |
|---|---|---|---|
| V1 | Account for asymmetry | 控制項在一側，內容區不對稱；用 safe area 確保控制項不蓋內容（含 Split View 時另一側）。 | "Because controls sit along one edge, the space for content is asymmetrical." |
| V2 | Keep controls consistent across poses | 不是每個姿態都有直欄，但控制項的相對位置要盡量一樣，使用者不用重新學。 | "keep controls' relative positions as similar as possible" |
| V3 | Standard placement order | 直欄頂端留給 Back／Close 這類主要導覽，其次是 Done 類主要動作；其餘項目維持原本分組，系統在上下兩組之間留空隙。 | "Reserve the top of the vertical axis for primary navigation controls, like Back or Close, followed by prominent actions, like Done." |
| V4 | Prioritize frequently used items | 項目從下往上溢位；用 visibility priority 調整順序，先整組再個別；常用與帶 badge 的留久一點。 | "Items overflow from bottom to top by default. Assign each item a visibility priority…" |
| V5 | Full width when bars aren't necessary | 沉浸、不捲動的介面可以用整個寬度；或背景／header 全寬、可捲動內容內縮。 | "letting a background image or header span the full width while scrollable content stays inset" |
| V6 | Group instead of spacing manually | 用 `UIBarButtonItemGroup` 分組，不要自己加固定間距。 | "Group related toolbar items instead of spacing them manually." |
| V7 | Locate controls near the content they affect | 控制某一欄內容的按鈕留在那一欄，不要搬到側邊（Mail 清單的按鈕留在清單上方）。 | "When controls belong to a content area other than the one along the trailing edge, keep them with that area." |
| V8 | Title + symbol for every item | 每個項目都給標題和符號；標題用在溢位選單與展開形式；純文字按鈕留在水平列，所以能用符號就用符號。 | "Include a title even when an item shows a symbol… Labels that include text stay in a horizontal bar." |
| V9 | Preserve toolbar or tab bar when space is limited | 導覽型畫面：工具列項目收進溢位選單、保住 tab bar（預設）；任務型畫面：縮小 tab bar、保住工具列（`UIVerticalBarCompressionBehavior`）。 | "In navigation-focused experiences, move toolbar items into the overflow menu… In task-oriented experiences, minimize the tab bar." |
| V10 | Use the system overflow menu | 自己的「更多」選單併進系統「…」選單；省略號只留給溢位。 | "Reserve the ellipsis symbol for overflow, and give other menus a distinct symbol." |

## 保留區與容器

| # | 指南 | 對我們的意思 |
|---|---|---|
| R1 | Reserved regions | 外前鏡頭永遠在（Live Activities 擴成動態島）、內前鏡頭只在相機啟用時、摺痕區只在半開時。系統元件自動避開；自訂元件用 ReservedRegion。 |
| R2 | Split views | 標準 split view 在內螢幕展開、外螢幕收成單欄，和 regular／compact 的行為一樣，並自動配合摺痕調整欄寬。 |
| R3 | Arrangement views | 兩個 view 的容器：split（寬時左右、高時上下）或 overlay（半開時各占一側）；導覽容器放在它外面，不要放裡面。 |
| G1 | Games | 可鎖方向，但要填滿畫面；寧可改長寬比也不要黑邊。 |

## 怎麼用這張表

- 做決定（`references/questionnaire.md`）時，每個答案都應能指到上面某一條；指不到的就是產品自己的取捨，要在決策紀錄寫原因。
- QC 報告的「HIG 對照」區塊：每條列 指南要點／現況（符合、部分、不符合、待確認）／本次截圖看到的證據。莎拉第三輪起的 `context.json` 有可直接套用的格式。
- 莎拉實測後判定「不符合」而留著的：H6 的偶數欄與長單欄閱讀（社團貼文約 850 pt 寬一行）——這類交給外部套件維護者，報告要寫清楚。
