## Context

`figma-componentize` 的設計系統文件步驟（change `add-componentize-design-system-doc`，PR #6，已合併）目前用簡單的樣式排版：參考文件 `figma-componentize/references/documentation.md` 的建立腳本各自寫死顏色常數（INK、MUTED、LINE、WHITE）與字級（48、28、14、12、10），只有 Regular 與 Bold 兩種粗細，沒有封面數字、目錄、大段標題與頁尾；每個 color collection 各是一個區塊。

設計師在 2026-10-02 確認了一版 Apple 風格的 HTML demo（https://claude.ai/artifact/4sPkeb23HmkoepKqYjhMEA），要求把它做成 Figma 設計系統文件的固定版型，讓不同專案、不同次執行產生的文件版面一致。demo 的「版型規格」頁列出了版面、顏色、字級、圓角與區塊尺寸，是本變更的規格來源。

查證結果（2026-10-02；來源：Figma 官方外掛附的 figma-use skill 與 Plugin API typings）：

| 項目 | 結果 |
| --- | --- |
| 自動排版的對齊與換行 | `counterAxisAlignItems` 支援 `BASELINE`；`layoutWrap`、`counterAxisSpacing`、`primaryAxisAlignItems`（含 `SPACE_BETWEEN`）都在 typings 中 |
| 單邊描邊與內描邊 | `strokeTopWeight` 等單邊粗細與 `strokeAlign` 都在 typings 中 |
| 字距 | `letterSpacing` 支援 `PERCENT` 單位 |
| 字型粗細名稱 | Inter 在 Figma 的粗細名稱為 Regular、Medium、Semi Bold、Bold；Noto Sans TC 的 Semibold 名稱沒有查到，需要以候選名稱嘗試 |

本 repo 沒有 Figma 執行環境，驗收以內容檢查、Node 語法檢查、以模擬節點執行腳本、跨檔一致性、demo 頁的版面量測與規格驗證為主。

## Goals / Non-Goals

**Goals:**

- 文件的版面、顏色、字級、圓角、間距與區塊尺寸只定義在一個版型設定裡，所有建立腳本都從它取值。
- Figma 產生的文件照 demo 排版：封面（含四個數字與目錄）、大段與小段標題、集中的顏色段落、各區塊照 demo 的尺寸、頁尾。
- 版型參考頁（demo）放進 repo，數值與版型設定一致，並由測試確認。
- 既有的行為規則完全不變：開始時的兩個問題、只寫事實、樣本綁定 token、只新增不修改、分批寫入與續做、取代舊文件、驗證與報告。

**Non-Goals:**

- 讓設計師或專案自訂版型（換顏色、換字型、換排法）。版型固定，所有專案共用。
- 深色版的文件。
- 用專案的 tokens 排版文件本身（文件外框、標題、分隔線不綁定專案 token）。
- 做成 Figma 元件、Figma 樣板檔或 team library 中的版型。
- 改變盤點、語言判斷、取代流程、驗證規則或報告欄位的內容。
- 改動 SKILL.md 的 frontmatter description（目前 1023 字元，已接近上限）。

## Decisions

### 版型寫在 skill 的參考文件裡，不做成 Figma 元件或樣板檔

版型以一段固定的設定（`TEMPLATE`）寫在 `documentation.md` 新增的 §12，與建立腳本放在一起。做成 Figma 元件的話，每次產生文件都要在設計師的檔案裡新增元件，違反「文件步驟不新增任何元件」；放在另一個 Figma 檔則需要 team library，而 skill 目前只處理本檔案的內容。寫在參考文件裡，不論哪個專案都用同一份設定，也不依賴任何外部檔案。

替代方案：每次產生時由 AI 依 demo 截圖自行排版。拒絕原因：這正是版面不一致的來源。

### 版型設定集中一處，建立腳本只引用它

`documentation.md` 新增 §12「Template」，其中一個 js 區塊宣告 `const TEMPLATE = { … }`，內容如下表。§6 的文件輔助程式與 §6–§8 的所有建立腳本都在 §1 的輔助程式之後貼上這個區塊；建立腳本中不再出現任何色碼或數字字級，全部改用 `TEMPLATE` 的值。

| 類別 | 值 |
| --- | --- |
| 外框 | 寬 1440；四邊內距 120；子層間距 64 |
| 內容 | 寬 1200；12 欄、欄距 24 |
| 顏色 | Paper `#FFFFFF`、Panel `#F5F5F7`、Line `#D2D2D7`、Ink `#1D1D1F`、Ink 2 `#6E6E73`、Ink 3 `#86868B`、Link `#0066CC`；內框為黑色 7% 不透明度的 1 px 內描邊 |
| 字級（字級 / 行高 · 粗細 · Inter 字距） | Display 80 / 84 · Bold · −2.5%；Title 48 / 52 · Bold · −2%；Headline 32 / 40 · Bold · −1.5%；Subhead 24 / 32 · Semibold · −0.5%；Body 19 / 28 · Regular；Callout 15 / 22 · Regular（標題用 Semibold）；Caption 12 / 18 · Regular（路徑與標籤用 Medium） |
| 圓角 | 舞台 24；圖示格與陰影卡 18；色塊 16；長條 6；標籤 999 |
| 間距 | 段落 64；大段 120（段落間距 64 加上大段標題與頁尾的上方內距 56）；區塊 32；項目 24；群組內 16；文字間 2 至 12 |
| 尺寸 | 色票與圓角卡寬 180、色塊高 104；圓角方塊 112；圖示格 104；名稱欄 280、數值欄 72、長條高 12；陰影卡 246 × 140；元件資訊兩欄 672 與 480、欄距 48；屬性表四欄 200、144、168、160；數值表名稱欄 480 |

### 根外框採扁平結構，以內距做出大段間距

根外框的直接子層維持扁平：`DS / Header`、大段標題、各段落、頁尾。這樣既有的「依名稱找段落、重複執行不重複建立、讀回時逐一列出子層」都不必改。demo 中大段之間是 120、段落之間是 64；扁平結構只能有一個子層間距，所以根外框用 64，大段標題（`DS / Part / Foundations`、`DS / Part / Components`）與頁尾（`DS / Footer`）的上方各加 56 的內距，合計 120。

段落建立時，如果所屬的大段標題還不存在，就先在它前面插入大段標題；頁尾存在時，新段落插在頁尾之前。所以只要照既有順序寫入（基礎在前、元件在後），版面順序就正確；設計師選「只產生 Components」時，基礎的大段標題不會出現。

替代方案：把段落包進各自的大段外框。拒絕原因：段落的查找、續做與讀回都要改成兩層，風險較高，視覺上沒有差別。

### 封面四個數字在建立外框時寫入，目錄與頁尾在最後的收尾步驟建立

封面（`DS / Header`）在第一次呼叫時建立：「設計系統」、檔名（Display）、產生日期、Tokens／Styles／Components／Icons 四個數字（數字用 Title）、兩則提示。四個數字來自盤點（Tokens 為 variables 數、Styles 為 Text、Effect、Paint Styles 合計）。

目錄要連到每個段落，但段落要等所有批次寫完才確定，所以新增「收尾」腳本：讀取根外框中已建立的段落，以每個段落標題的文字為連結文字，建立連到該段落節點的目錄列；頁尾不存在時建立頁尾。收尾腳本可以重複執行：每次先移除封面裡既有的目錄列再重建，頁尾已存在就不再建立。收尾在所有批次之後、§11 的驗證之前執行，並算進預估的寫入次數。

### 所有顏色集中在一個「顏色」段落，每個 collection 一個區塊

`DS / Color` 是唯一的顏色段落，標題右側為顏色 token 的總數。每個 collection 是其中一個區塊（`DS collection / {名稱}`），標題用 Subhead，collection 有多個 modes 時旁邊加上 mode 標籤；區塊裡依 token 群組路徑分組。批次寫入的單位改為「一個 collection」：每次呼叫寫入一個 collection 的最多 20 個顏色，ledger 以 `DS collection / {名稱}` 記錄進度。其他段落的結構不變（段落內直接依群組路徑分組）。

### 區塊照 demo 的尺寸與排法

| 區塊 | 排法 |
| --- | --- |
| 小段標題 | 上方 1 px Line 分隔線、上方內距 24；左邊 Headline 標題、右邊 Callout Ink 2 數量，基線對齊 |
| 色票卡 | 寬 180；色塊 180 × 104、圓角 16、內描邊；每個 mode 一格，各自設定 explicit mode；下方名稱（Callout Semibold）、每個 mode 一列（mode 名 Caption Ink 3 寬 38，值 Caption Ink 2）、alias 一列（Caption Ink 3，多個 mode 時縮排 38）；每列 6 張、欄距 24、列距 32 |
| 字級列 | 名稱欄 280（名稱 Callout Semibold、規格 Caption Ink 2）、右側樣本；上下內距 28、下方分隔線 |
| 間距列 | 名稱欄 280、數值欄 72、長條（高 12、圓角 6、Link 色，寬度綁定 token；超過 640 只列數值）；上下內距 16、下方分隔線 |
| 圓角卡 | 寬 180；方塊 112 × 112、Panel 底、內描邊、圓角綁定 token；下方名稱與數值 |
| 陰影 | Panel 舞台、圓角 24、內距 48；白卡 246 × 140、圓角 18、內距 20，套用 Effect Style；卡片間距 40 |
| 數值表 | 欄名 Caption Semibold Ink 2；每列 Callout，上下內距 14、下方分隔線；名稱欄 480，modes 平分其餘寬度 |
| 圖示 | 每格寬 104：Panel 方塊 104 × 104、圓角 18，instance 置中；下方名稱 Caption Ink 2 置中；欄距 16、列距 24 |
| 元件 | 上方分隔線；名稱 Headline、資訊列 Callout Ink 2、連結 Callout Link；描述 Body（最寬 680）；Variants 舞台（Panel、圓角 24、內距 56、底部對齊、欄距 48、列距 40，每格 instance 加上 Caption 名稱）；下方左右兩欄 672 與 480：屬性表與 tokens 清單 |
| 頁尾 | 上方內距 56；分隔線、上方內距 24；左邊「產生工具 · 日期」、右邊外框名稱，皆為 Caption Ink 3 |

### 字型有四種粗細，缺少時改用最接近的

字型檢查改為逐一嘗試四種粗細的候選名稱，回傳實際可用的名稱：

| 粗細 | 候選名稱（依序） |
| --- | --- |
| regular | Regular |
| medium | Medium、Regular |
| semibold | Semi Bold、SemiBold、Semibold、Bold、Regular |
| bold | Bold、Semi Bold、SemiBold、Regular |

Regular 無法載入時視為字型無法使用，照既有規則詢問。建立腳本的輸入由 `FONT` 與 `BOLD` 改為 `FONT` 與 `STYLES`（四種粗細對應的實際名稱），ledger 的 `doc.fontStyles` 記錄它們。字距只在文字使用 Inter 時套用；文件語言不是英文、或文字改用涵蓋字型（例如英文文件中的中文描述）時，字距一律為 0。

### 版型新增的標題文字納入標籤表

標籤表新增 15 個鍵值：`contents`、`foundations`、`components_part`、`stat_tokens`、`stat_styles`、`stat_components`、`stat_icons`、`n_tokens`、`n_styles`、`n_components`、`n_icons`、`variants_one`、`prop_name`、`token`、`footer`；移除被四個數字取代的 `counts`。英文與繁體中文兩組各 42 個鍵值，內容取自 demo。

### Demo 放進 repo 作為版型參考頁，並以測試確保數值一致

確認過的 demo 存成 `figma-componentize/docs/document-template.html`（完整的獨立 HTML）。為了讓參考頁和 Figma 版完全一致，存入時做以下統一（與已確認的 demo 差異都在 4 px 內）：

| 項目 | demo | 參考頁與 Figma |
| --- | --- | --- |
| 目錄連結、元件連結 | 17 / 26 | Callout 15 / 22 |
| 屬性與 Tokens 小標 | 17 / 26 Semibold | Callout 15 / 22 Semibold |
| Tokens 清單 | 14 / 20 | Callout 15 / 22 |
| 封面標題群的間距 | 14 | 12 |
| 元件區塊內的間距 | 28 | 32 |
| 圓角卡寬度 | 最小 140（每列 7 張） | 180（每列 6 張） |
| 圓角方塊的內描邊 | 黑 6% | 黑 7% |

參考頁內嵌一份與 §12 相同的 `TEMPLATE` JSON；測試比對三者一致：§12 的 `TEMPLATE`、參考頁內嵌的 JSON、參考頁 CSS 變數的顏色值。文件頁 `docs/index.html` 與 `documentation.md` §12 都連到參考頁。

## Implementation Contract

**完成後可觀察到的行為：**

- 不論哪個專案，產生的 `Design System — generated` 外框都是 1440 寬、四邊內距 120、白底，依序為封面、基礎大段標題、顏色、顏色樣式、文字樣式、間距與尺寸、圓角、陰影、其他 tokens、元件大段標題、圖示、各元件、頁尾（沒有內容的段落與大段省略）。
- 封面顯示「設計系統」、檔名、產生日期、四個數字、兩則提示與目錄；目錄的每個連結點下去會跳到對應段落。
- 所有顏色在同一個「顏色」段落，每個 collection 一個區塊；多 mode 的 collection 標題旁有 mode 標籤。
- 文件中的顏色、字級、圓角與間距都等於版型設定的值；選繁體中文時，標題與欄位名稱是中文、字距為 0。
- 設計師回答「不要」時，流程和現在一樣。

**介面與資料格式：**

- `documentation.md` 新增 §12「Template」，內含宣告 `const TEMPLATE` 的 js 區塊；§6–§8 的建立腳本依序貼上 §1 輔助程式、§12 版型、§6 文件輔助程式。
- 字型檢查輸出 `{ ok, family, styles: { regular, medium, semibold, bold } }`；建立腳本輸入 `LABELS`、`FONT`、`STYLES`。
- 根外框腳本輸入 `COUNTS: { tokens, styles, components, icons }`；收尾腳本輸入 `ROOT_ID`，輸出 `{ contents: [{ name, nodeId }], footerId }`。
- 段落建立腳本的 `SECTION` 輸入加上 `part`（`foundations` 或 `components`）與 `count`（右側數量的文字）；顏色批次另有 `COLLECTION: { id, name, modes }`。
- 圖層名稱新增 `DS / Part / Foundations`、`DS / Part / Components`、`DS / Footer`、`DS / Color`、`DS collection / {名稱}`、`DS contents`；既有的 `Design System — generated`、`DS / ` 前綴與 `DS item / {ID}` 規則不變。
- ledger 的 `doc` 新增 `fontStyles`；`sections` 的顏色進度以 `DS collection / {名稱}` 為鍵；新增 `finished`（收尾是否完成）。
- 規模判斷的寫入次數估計加上收尾的 1 次。
- 根外框腳本另有輸入 `PARTS_WANTED`（會有段落的大段：`foundations`、`components`），第一次呼叫就建立對應的大段標題與頁尾；段落之後依所屬大段插入正確位置。
- 圖示段落的腳本另有輸入 `TOTAL`（盤點的圖示總數），作為段落標題右側的數量。
- 用途為間距或寬高的數值 variables 都放在「間距與尺寸」段落：1 到 640 之間畫長條，其他數值只列名稱與數值（原本超過 640 的會放到「其他 tokens」）。
- 參考頁是獨立的 HTML，自行加上 `[hidden]` 的隱藏規則（原本由 artifact 外殼提供），並內嵌與 §3 相同的 42 個標籤；版型規格頁的數字直接讀取內嵌的 `TEMPLATE`。

**失敗與例外處理：**

- 某個粗細找不到任何候選名稱時，改用 Regular；Regular 也無法載入時照既有規則詢問設計師。
- 設定 `BASELINE` 對齊失敗時改為頂端對齊，不中斷建立。
- 收尾腳本找不到任何段落時不建立目錄，只建立頁尾，並在報告中說明。
- 其他單一項目的失敗處理不變：略過並記錄原因。

**驗收方式：**

- 以模擬節點執行：根外框寬 1440、四邊內距 120、子層間距 64、Paper 底；大段標題與頁尾的上方內距 56；選「只產生 Components」時沒有基礎大段標題；段落一律插在頁尾之前。
- 收尾：目錄連結的順序與段落順序相同、每個連結都是指向該段落的節點連結；執行兩次後目錄列只有一個、頁尾只有一個。
- 顏色：兩個 collection 只產生一個 `DS / Color` 段落與兩個 collection 區塊；多 mode 的區塊有 mode 標籤；色票卡寬 180、色塊 104 高、圓角 16、有內描邊，填色仍綁定 variable，每個 mode 一格且各自設定 explicit mode。
- 字級列、間距列、圓角卡、陰影、數值表、圖示格與元件區塊的尺寸、圓角、內距與欄寬等於 `TEMPLATE` 的值；元件與圖示步驟前後 COMPONENT 與 COMPONENT_SET 的數量相同。
- 字型：模擬 Noto Sans TC 只有 Regular、Medium、Bold 時，semibold 對應 Bold；英文文件的 Display 字距為 −2.5%，繁體中文文件為 0。
- 以腳本確認 §6–§8 的建立腳本中沒有色碼與數字字級（只能出現在 §12）；英文與繁體中文標籤各 42 個鍵值且完全相同。
- 參考頁內嵌的 `TEMPLATE` JSON 與 §12 的值完全相同，CSS 顏色變數與 `TEMPLATE.color` 相同；參考頁與文件頁在 500、768、1280 px 寬度下沒有水平溢出。
- 前一個 change 的文件測試依新結構更新後全部通過；偵測、沿用配對、比對板、加 variant 的既有測試與偵測回歸基準不變。
- SKILL.md 的 description 與前一版相同、沒有超過 15 行的程式碼區塊、引用的章節都存在。
- `spectra validate add-design-system-doc-template` 通過。

**範圍：**

- 範圍內：`figma-componentize/references/documentation.md`（§3 字型與標籤、§5 寫入次數、§6–§8 建立腳本、§9 ledger、§11 讀回、新增 §12）、新增 `figma-componentize/docs/document-template.html`、`figma-componentize/docs/index.html` 與 `figma-componentize/README.md` 的版型說明與連結、`figma-componentize/SKILL.md` 第 10 步的收尾與版型引用。
- 範圍外：Non-Goals 所列項目、其他參考文件的腳本、盤點與取代的邏輯、figma-m3-variables、repo 外的已安裝副本。

## Risks / Trade-offs

- [Risk] 版型用到的 API（基線對齊、單邊描邊、內描邊、百分比字距、換行排列）只查證到 typings → Mitigation：基線對齊失敗時改為頂端對齊；其他項目沿用單一項目失敗就略過並記錄的規則；第一次在實際檔案執行時優先檢查封面與一個元件區塊。
- [Risk] Noto Sans TC 的 Semibold 名稱不確定 → Mitigation：依候選名稱嘗試，找不到時改用 Bold，再不行用 Regular。
- [Risk] 參考頁與 Figma 版逐漸不同步 → Mitigation：測試比對參考頁內嵌的 JSON、CSS 顏色與 §12。
- [Risk] 扁平結構以內距模擬大段間距，設計師在 Figma 中看到大段標題外框上方有空白 → Mitigation：這是自動排版的正常表現，名稱清楚標示；不影響閱讀。
- [Risk] 收尾步驟中斷時目錄或頁尾缺漏 → Mitigation：收尾可以重複執行；ledger 的 `finished` 為 false 時，續做會再執行一次。
- [Risk] 版型固定，無法反映專案品牌 → Mitigation：這是使用者要求的一致性；專案的品牌呈現在樣本本身（綁定專案 token 的色票、文字樣本與元件）。

## Migration Plan

1. 以 master（已含 PR #6）為基礎實作；已經產生過的舊版文件，設計師重新產生並選「取代」即可換成新版型。
2. 實作並驗收後封存並發 PR；詢問使用者是否同步到四個已安裝位置。
3. 回復方式：以 git 還原 `documentation.md`、`SKILL.md`、`docs/index.html`、`README.md`，並刪除 `docs/document-template.html`。

## Open Questions

- 為了讓參考頁與 Figma 完全一致，demo 中幾個不在七級字級裡的大小統一到最接近的一級（見「Demo 放進 repo」的對照表）。若設計師希望保留 17 px 的連結大小，需要新增第八級字級。
- Noto Sans TC 在 Figma 中 Semibold 的實際名稱，以及基線對齊、內描邊在 `use_figma` 的實際效果，需要在實際檔案驗證一次。
