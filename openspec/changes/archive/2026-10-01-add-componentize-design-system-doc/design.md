## Context

figma-componentize 目前的流程是：範圍與基準 → 偵測 → 分組審查 → 計畫 → 還原點 → 建立 → tokens（Workflow F）→ 替換 → 驗證 → 報告。SKILL.md 的 Out of scope 明列 documentation frames，`add-figma-componentize` 的 Non-Goals 也排除了文件 frame。

使用者（設計師）確認的需求：

1. 使用 skill 時先問是否要產生文件。
2. 文件放在 Figma 檔案的一個頁面中。
3. 涵蓋檔案內所有元件與 tokens，產生完整的設計系統文件。
4. 作為 figma-componentize 最後一個可選步驟；Foundations 只讀取現有 tokens 來呈現，不另建 tokens。
5. 頁面名稱用 `Design System`（2026-10-01 確認）。
6. 產生文件前先詢問文件語言，預設英文（2026-10-01 確認）。

查證結果（2026-10-01；來源：Figma 官方外掛附的 figma-use 與 figma-generate-library skills、Plugin API typings）：

| 項目 | 結果 |
| --- | --- |
| 官方文件頁慣例（figma-generate-library 的 documentation-creation 參考文件） | 文件外框寬 1440 px、區塊間距 64–100 px；色票的填色綁定 variable（`setBoundVariableForPaint`），間距條的寬度、圓角示範的圓角同樣綁定 variable；primitive 與 semantic 兩層都要呈現；元件說明放在元件旁 |
| 讀取 tokens 與 styles | `getLocalVariableCollectionsAsync`、`getLocalVariablesAsync`、`getLocalTextStylesAsync`、`getLocalEffectStylesAsync`、`getLocalPaintStylesAsync` 都在 typings 中 |
| 套用 styles 與 modes | `setTextStyleIdAsync`、`setEffectStyleIdAsync`、`setFillStyleIdAsync`、`setExplicitVariableModeForCollection` 都在 typings 中 |
| 連結 | 文字的 hyperlink 支援 `NODE` 類型，可以連到檔案內的節點 |
| 元件描述 | 元件與 component set 有 `description` 欄位 |
| figma-use 的建議 | 每次 `use_figma` 呼叫只做少量操作、由外而內分批建立、每步之後驗證；每次呼叫回傳上限 20 kB、有執行時間上限、一次只處理一頁、不能新增圖片、不支援自訂字型 |
| 頁數上限 | Starter 方案每個設計檔最多 3 頁（沿用前一個 change 的查證） |

本 repo 沒有 Figma 執行環境，驗收以內容檢查、Node 語法檢查、以模擬節點與模擬 Variables API 執行腳本邏輯、跨檔一致性與規格驗證為主。上表的 API 都只查證到「typings 中存在」，沒有在實際檔案執行過。

## Goals / Non-Goals

**Goals:**

- 設計師在開始時決定要不要文件；不要就完全不產生。
- 設計師決定文件上的標題與欄位名稱用哪一種語言，預設英文。
- 在單一頁面產生涵蓋檔案內所有 local tokens 與元件的文件。
- Foundations 的樣本綁定 token，token 改動後樣本跟著變。
- 文件內容只來自檔案中的事實與設計師自己寫的元件描述。
- 文件步驟只新增內容：不建立、不修改任何 token、style、元件或既有圖層。
- 重新產生時不留下重複的文件，並且先取得設計師同意才移除舊的。
- 可以不做元件化、單獨產生或更新文件。

**Non-Goals:**

- 由 AI 撰寫用途說明、使用時機或 do / don't 範例。文件只顯示事實與元件的描述欄位。
- team library 的元件與 tokens。只涵蓋本檔案的 local 元件、Variables 與 Styles。
- 封面插圖或任何圖片（`use_figma` 不能新增圖片）；使用設計師自行安裝或上傳的自訂字型排版文件。
- 翻譯檔案裡的內容：token 名稱、元件名稱、variant 與屬性名稱，以及設計師寫的元件描述都不翻譯。
- 建立、修改或刪除 tokens、styles、元件，或為元件補寫描述。
- 把文件匯出成 HTML、PDF 或 Markdown；標註尺寸的 handoff 規格；Code Connect。
- 調整頁面順序。
- 保留設計師在產生的文件外框「裡面」所做的修改；取代時整個外框會重建。
- token 改名或數值改變後自動更新文字標示；文字是產生當下的快照，需要重新產生才會更新。
- Grid Styles、prototype 互動。

## Decisions

### 開始時詢問，選擇後才產生

在第一步（範圍與基準）確認範圍之後、偵測之前詢問：「最後要不要產生設計系統文件？」選項為「要」與「不要」。答案記在 ledger 的 `doc.wanted`。

- 選「不要」：整個流程不產生文件，之後不再詢問。
- 選「要」：計畫的 Tier 摘要列出文件步驟；文件在最後產生。
- 設計師之後在替換確認選了「先不要」，或拒絕了 tokens 步驟，文件仍照常產生，因為元件已經建立。

替代方案：全部做完之後才問。拒絕原因：使用者明確要求先問；先問也能讓計畫完整呈現這次會寫入什麼。

### 文件語言由設計師選擇，預設英文

設計師回答「要」之後，接著詢問文件上的標題與欄位名稱要用哪一種語言；單獨執行文件時，在盤點之前詢問。選項：**English**（預設）、**繁體中文**，或設計師指定的其他語言。設計師沒有偏好或只說照預設時用英文。每次產生文件都會詢問，不沿用上一次的選擇。答案記在 ledger 的 `doc.language`。

**會跟著語言變的文字**（skill 自己產生的）：區塊標題（Color、Typography、Spacing & size、Radius、Elevation、Other tokens、Icons、Components）、欄位名稱（Variants、Properties、Tokens、Type、Default、Options、Page 等）、標題區的提示文字（產生日期、「token 改動後請重新產生」、「自己的說明請放在外框之外或元件描述欄位」）、連到主元件的連結文字，以及「另有 N 個」這類註記。

**不會變的文字與名稱**：

| 項目 | 處理方式 |
| --- | --- |
| token、collection、mode 的名稱與數值 | 照檔案原樣 |
| 元件、variant、屬性的名稱與值 | 照檔案原樣 |
| 設計師寫在元件描述欄位的文字 | 照原樣，不翻譯 |
| 圖層名稱：`Design System — generated`、`DS / ` 開頭的區塊名稱、項目名稱 | 一律英文，因為它們是辨識產生內容的依據 |
| 頁面與退路 Section 的名稱 `Design System` | 一律英文 |

**標籤對照表**：文件參考檔列出所有標籤的鍵值，附英文與繁體中文兩組文字。建立區塊的腳本以輸入的 `LABELS` 取得文字，本身不含任何語言的字串。設計師指定其他語言時，由代理人依同一組鍵值翻譯後傳入。

**字型**：文件的字型依語言決定。

| 語言 | 字型 |
| --- | --- |
| English 與其他拉丁、西里爾、希臘字母的語言 | Inter |
| 繁體中文 | Noto Sans TC |
| 简体中文 | Noto Sans SC |
| 日本語 | Noto Sans JP |
| 한국어 | Noto Sans KR |
| 其他文字系統 | 設計師指定的字型 |

寫入之前先以唯讀呼叫確認該字型的 Regular 與 Bold 可以載入（沒有 Bold 時全部用 Regular）。載入失敗時不寫入，詢問設計師：改用英文標題與預設字型、指定另一個字型，或略過文件。選到的字型記在 ledger 的 `doc.font`。

**來自檔案的文字**（名稱與描述）含有文件字型沒有的字形時（例如英文文件裡的中文描述）：能載入涵蓋該文字的字型就用它排這段文字，判定順序為含假名用 Noto Sans JP、含韓文用 Noto Sans KR、其餘含漢字用 Noto Sans TC；載入不了就照文件字型寫入，並把該項目列在報告的字型涵蓋清單。

替代方案：跟隨設計師對話的語言自動決定。拒絕原因：使用者要求先詢問，且預設為英文。替代方案：標題一律雙語並列。拒絕原因：文件變得冗長，沒有人要求。

### 文件步驟排在驗證之後、報告之前

步驟順序新增第 10 步「設計系統文件（可選）」，原本的報告改為第 11 步。排在最後有三個理由：新建的元件與 tokens 都已到位；替換後的截圖比對已完成，文件不會干擾比對；文件步驟失敗不影響前面已完成的結果。

還原點沿用建立前已存的版本，不另外要求。

### 只要文件時可以單獨執行

設計師只要求產生或更新設計系統文件時，略過偵測到驗證的步驟：檢查前置條件（只需要可寫入的 `use_figma` 與 `figma-use`，不需要 Workflow F）→ 請設計師存還原點 → 文件步驟 → 報告。請求本身就是同意，不再問「要不要產生」，但仍會詢問文件語言。SKILL.md 的觸發描述加入對應的中英文詞。

沒有這個模式的話，token 改動後想更新文件就得重跑整個元件化，不合理。

### 文件放在單一頁面的固定名稱外框中

- **頁面**：優先使用名稱含 "design system"、"foundation"（不分大小寫，忽略 emoji 與前綴）或「設計系統」的既有頁面；沒有就建立名為 `Design System` 的頁面，加在頁面清單最後。建立失敗且錯誤是 Starter 方案的頁數上限時，請設計師指定一個既有頁面，在該頁建立名為 `Design System` 的 Section；未回覆前不寫入。
- **外框**：所有產生的內容放在一個名稱固定為 `Design System — generated` 的 frame 中，寬 1440 px、垂直 auto layout、內距 80 px、區塊間距 80 px、白底。新頁面時放在原點；既有頁面時放在既有內容右側 400 px，不移動、不修改任何既有節點。
- **區塊命名**：外框的直接子層是區塊，名稱以 `DS / ` 開頭（例如 `DS / Color / Brand · System`、`DS / Component / Button`）；區塊內每個項目的 frame 名稱帶有來源的 ID。名稱是辨識「這是產生的內容」的唯一依據。

替代方案：Foundations 與 Components 各一頁。拒絕原因：頁數上限，且使用者要求放在一個頁面。替代方案：照官方慣例把說明放在每個元件旁。拒絕原因：使用者要一份集中的文件，而且 Components 頁面上每個元件的 Section 是 skill 自己管理的版面。替代方案：以 plugin data 標記產生的節點。拒絕原因：標記在 `use_figma` 中不一定可用，而且設計師看不到；名稱看得到，設計師改名就等於把它變成自己的內容。

### 先盤點再產生，涵蓋檔案內所有 token 與元件

文件步驟的第一件事是唯讀盤點，結果分頁回傳，每頁不超過 18,000 字元：

- **tokens**：每個 Variable collection（名稱、modes、各型別數量）與其中的 variables（名稱、型別、scopes、每個 mode 的值或 alias 目標）；Text Styles、Effect Styles、Paint Styles。
- **元件**：逐頁（一次一頁）列出 local component sets 與單獨的元件（名稱、所在頁面、variant 數量、是否為圖示）。產生的文件外框與暫時的比對區塊不列入。

盤點後向設計師報告數量與預估的寫入次數。tokens（variables 加 styles）超過 300 個、非圖示元件超過 40 個，或預估寫入超過 60 次時，先問：全部產生、只產生 Foundations、只產生 Components、或略過文件。未超過就直接進行。

沒有任何 tokens 時 Foundations 省略並在報告註明；沒有任何元件時 Components 省略並註明；兩者都沒有就不建立頁面，回報沒有可以記錄的內容。

### Foundations 的樣本綁定 token，數值文字是產生當下的快照

| 區塊 | 來源 | 樣本 |
| --- | --- | --- |
| Color（每個 collection 一個區塊，依群組排列） | COLOR variables | 色票的填色綁定該 variable。collection 有多個 modes 時，每個 mode 一格（最多 4 個 modes，超過時註明），該格以 explicit mode 呈現 |
| Color styles | Paint Styles | 色票套用該 style |
| Typography | Text Styles | 套用該 style 的文字樣本，旁邊列出字型、字級、行高 |
| Spacing & size | scopes 含 gap 或寬高的 FLOAT variables | 寬度綁定該 variable 的色條；數值超過 640 時只列數值 |
| Radius | scopes 為圓角的 FLOAT variables | 圓角綁定該 variable 的方塊 |
| Elevation | Effect Styles | 套用該 style 的卡片 |
| Other tokens | 其餘的 FLOAT、STRING、BOOLEAN variables | 名稱與數值的列表 |

每個樣本旁的文字包含：token 名稱、每個 mode 的值（顏色為 hex，含透明度），以及它是 alias 時指向的 token 名稱。這些文字是產生當下的快照；外框標題區寫明產生日期與「token 改動後請重新產生」。

Reference、System、Component 三層（或檔案自己的 collection 配置）都照 collection 原樣呈現，不重新分類。

字型無法載入的 Text Style 改以文件字型列出名稱與規格，並列入略過清單。任何單一項目失敗都只略過該項目並記錄原因，不中斷整個區塊。

替代方案：色票直接填入 hex。拒絕原因：token 改動後文件就過期；官方慣例也要求綁定。

### 元件區塊只呈現事實，用途文字取自元件描述

每個 component set 或單獨的元件一個區塊，內容：

- 名稱、種類（set 或 component）、variant 數量、所在頁面。
- 描述：取自該元件的 `description` 欄位；空白就不顯示這一行。
- 連結：一行可點擊、連到主元件的文字。
- Variants：每個 variant 一個 instance，旁邊標示 variant 名稱；最多 30 個，超過時列出總數。
- 屬性：名稱、類型、預設值、可選值。
- Tokens：主元件（set 取預設 variant）圖層上綁定的 variables 與 styles 的名稱，去重後最多列 40 個並附總數。

樣本一律是 instance，不 clone 主元件，所以檔案不會多出元件。字型無法載入的元件，區塊只列文字資訊，不放 instance，並列入略過清單。

AI 不撰寫用途、使用時機或注意事項。想在文件上看到用途說明，設計師把文字寫在元件的描述欄位，再重新產生。

### 小型圖示元件集中成圖示格

每個 variant 都不超過 48 × 48 px，且為正方形或名稱含 icon 的元件，視為圖示：不各自成為一個區塊，而是集中在 `DS / Icons` 區塊，以格狀排列 instance 並標示名稱。這避免圖示庫讓文件出現數百個幾乎空白的區塊。

### 分批寫入並記錄進度

- 每次 `use_figma` 呼叫只寫一批：tokens 與 styles 每批最多 20 個項目，圖示每批最多 40 個，元件每次一個。第一批建立外框與標題區。
- 每個項目寫入前先檢查區塊中是否已有同名項目，有就略過，所以同一批重跑不會產生重複。
- ledger 的 `doc` 記錄：`wanted`、頁面與外框的 ID、每個區塊的狀態與下一個位移、略過清單。呼叫失敗後先讀 ledger 與外框現況，再只補未完成的部分。
- 逾時重複發生時，把每批數量減半。
- 每次呼叫的回傳只含 ID、數量與略過原因，控制在 18,000 字元內。

figma-use 建議每次呼叫只做少量操作；這裡的批次由同一個已驗證的建立函式重複執行，所以用「項目數」而不是「節點數」設上限，並保留逾時減半的退路。

### 重新產生時取代舊的產生內容，設計師確認後才執行

文件頁面上已有名稱為 `Design System — generated` 的外框時，產生前詢問：

- **取代**：屬於 Tier 3（會刪除舊外框，設計師在外框裡做的修改會消失），每次都要確認，先前的任何「全部自動」指示都不能略過。做法是先在旁邊完整建立新外框並通過驗證，才刪除舊外框，再把新外框移到舊外框的位置；建立失敗時舊文件原封不動。
- **保留舊的，在旁邊產生新的**：舊外框不動，新外框放在既有內容右側。
- **略過**：不產生。

頁面上有多個同名外框時，列出它們並請設計師指定要取代哪一個。外框以外的內容，以及被設計師改名的舊外框，一律不動。

### 文件步驟只新增內容，產生後驗證

- 變動分級：建立頁面或 Section、外框與區塊屬於 Tier 2，由開始時的回答與計畫確認（單獨執行時由請求本身）授權。取代既有文件屬於 Tier 3。
- 產生後的檢查：外框中的區塊與 ledger 一致；local 元件、variables、Text Styles、Effect Styles、Paint Styles 的數量與盤點時相同（文件步驟沒有建立或刪除任何一個）；對外框截圖並提供連結。
- 報告新增一段：文件頁與外框的連結、各區塊的項目數、略過的項目與原因、是否取代了舊文件。

## Implementation Contract

**完成後可觀察到的行為：**

- 設計師分享範圍並要求元件化時，在偵測之前被問到是否要產生設計系統文件。回答「不要」的流程與結果和現在相同。
- 回答「要」之後接著被問到文件語言；選繁體中文時，文件的區塊標題與欄位名稱是中文，token 名稱、元件名稱、數值與元件描述維持原樣，圖層名稱維持英文。未指定時為英文。
- 回答「要」時，流程最後在 `Design System` 頁面（或既有的設計系統頁面、或頁數已滿時的 Section）出現 `Design System — generated` 外框，內含 Foundations 與 Components 區塊，涵蓋檔案內所有 local tokens 與元件。
- 色票、間距條、圓角方塊、文字樣本、陰影卡片分別綁定或套用對應的 variable 或 style。
- 元件區塊顯示元件描述欄位的文字；描述空白時沒有任何 AI 撰寫的用途文字。
- 設計師只要求文件時，不執行偵測、建立與替換。
- 檔案已有產生的文件時先詢問；選擇取代並確認後，頁面上只有一份產生的文件，外框以外的內容不變。
- 文件步驟前後，檔案的 local 元件、variables 與 styles 數量相同。

**介面與資料格式：**

- 外框名稱固定為 `Design System — generated`；頁面與退路 Section 的名稱為 `Design System`；區塊名稱以 `DS / ` 開頭。
- tokens 盤點腳本：輸入 `MODE`（`summary`、`variables`、`styles`）、`COLLECTION_ID`、`KIND`（`text`、`effect`、`paint`）、`OFFSET`；輸出以 `{ total, offset, nextOffset, items }` 分頁。`summary` 的項目含 collection 的 `id`、`name`、`modes`、各型別數量與 styles 數量；`variables` 的項目含 `id`、`name`、`type`、`scopes`、`values`（每個 mode 的值或 alias 目標名稱）；`styles` 的項目含 `id`、`name` 與規格摘要。
- 元件盤點腳本：輸入 `PAGE_ID`、`OFFSET`；輸出項目含 `id`、`name`、`kind`（`set` 或 `component`）、`variants`、`icon`（布林）、`page`。
- 區塊建立腳本：輸入外框 ID、區塊鍵值、該批項目的 ID 與 `OFFSET`；輸出 `{ sectionId, added, existing, skipped: [{ id, reason }], nextOffset }`。
- 語言：`LABELS`（以固定鍵值對應文字的物件，預設為英文那一組）與 `FONT`（字型家族名稱）是外框與區塊建立腳本的輸入。字型檢查腳本輸入字型家族名稱，輸出 `{ ok, family, styles }`，不寫入任何東西。語言選項名稱固定為 **English** 與 **繁體中文**。
- ledger 新增 `doc`：`wanted`、`language`、`font`、`pageId`、`created`、`hostSectionId`、`rootId`、`replaced`（被取代的舊外框 ID 或 null）、`sections`（以區塊鍵值為鍵：`status`、`items`、`nextOffset`）、`skipped`、`uncovered`（字型未涵蓋的文字）、`counts`（盤點時的元件、variables、styles 數量）。
- 規模判斷函式的輸入為 `{ variables, styles, components, icons }`，variables 與 styles 合計為 tokens 數；輸出 `{ tokens, calls, ask }`。
- 單獨執行時的還原點名稱為「Before figma-componentize — design system document」。
- 取代既有文件時，交換新舊外框是驗證之後的獨立一步。
- 標籤對照表共 28 個鍵值，含 Effect Style 的效果數量標籤；盤點腳本只回傳資料（數量、規格），不回傳要顯示的詞句。
- 批次上限：tokens 與 styles 20、圖示 40、元件 1。規模確認門檻：tokens 300、非圖示元件 40、預估寫入 60 次。
- 圖示判定：每個 variant 寬高都不超過 48 px，且為正方形（寬高差小於 1 px）或名稱含 icon。
- 計畫的 Tier 摘要新增一行文件步驟；報告新增 `Design system document` 一段。

**失敗與例外處理：**

- 回答「不要」：不盤點、不寫入、報告不出現文件段落。
- 頁面建立失敗且為頁數上限：請設計師指定頁面，建立 `Design System` Section；未回覆前不寫入。其他錯誤：停止文件步驟並回報，前面步驟的結果不受影響。
- 所選語言的字型無法載入：不寫入，詢問設計師改用英文標題與預設字型、指定另一個字型，或略過文件。
- 來自檔案的文字含有文件字型沒有的字形且沒有可載入的涵蓋字型：照文件字型寫入，並列入報告的字型涵蓋清單。
- 單一項目失敗（字型無法載入、variable 無法綁定、style 無法套用）：略過該項目，原因記入 `skipped`，繼續下一個。
- 呼叫失敗或逾時：依 ledger 與外框現況只補未完成的批次；同名項目不重複建立；重複逾時就把批次減半。
- 取代時新外框建立失敗：保留舊外框，移除未完成的新外框，回報原因。
- 產生後的數量檢查不一致：回報差異，不自行修正。
- 沒有 tokens 也沒有元件：不建立頁面，回報沒有可記錄的內容。

**驗收方式：**

- 以模擬的 Variables API 與節點在 Node 執行 tokens 盤點腳本：2 個 collections（其中一個有 Light、Dark 兩個 modes）、共 500 個 variables 時，`summary` 與逐頁的 `variables` 總數一致，每頁 JSON 不超過 18,000 字元，alias 的值以目標名稱呈現。
- 以模擬節點執行元件盤點腳本，結果與 componentize-design-system-doc spec 的「Inventory classification」範例逐列一致（圖示判定、排除產生的外框與暫時區塊）。
- 以模擬節點執行區塊建立腳本：色票的填色綁定到對應的 variable、兩個 modes 產生兩格；同一批執行兩次後項目數不變；字型無法載入的 Text Style 出現在 `skipped`；元件區塊中沒有新增任何 COMPONENT 節點；描述空白的元件區塊沒有描述文字。
- 以模擬節點執行取代流程：新外框建立成功後舊外框被移除、新外框位於舊外框的位置、外框以外的節點數量與位置不變；模擬建立失敗時舊外框仍在。
- 頁面判定函式以 spec 的「Page selection」範例逐列驗證。
- 字型判定函式以 spec 的「Document font by language」範例逐列驗證；以繁體中文的 `LABELS` 在模擬節點執行外框與區塊腳本，結果與 spec 的「What follows the chosen language」範例逐列一致（標題為中文；token 名稱、描述與圖層名稱不變）；模擬字型載入失敗時，字型檢查回傳 `ok: false` 且沒有任何節點被建立。
- 標籤對照表的英文與繁體中文兩組鍵值完全相同，且腳本中沒有寫死的標題文字。
- 所有腳本通過 Node 語法檢查，且不呼叫 `loadAllPagesAsync()`、不使用同步 getter、不從 document root 搜尋。
- SKILL.md 的 description 不超過 1024 字元、沒有超過 15 行的程式碼區塊、引用的參考文件章節都存在；Out of scope 不再列出 documentation frames。
- 文件頁每個導覽連結的錨點都存在，且在 500、768、1280 px 寬度下沒有水平溢出。
- 外框名稱、頁面名稱、區塊前綴、提問選項（含語言選項）、ledger 欄位在 SKILL.md、參考文件、文件頁與 README 之間一致。
- 開始時回答「不要」的情況下，前一個 change 的偵測回歸基準結果不變。
- `spectra validate add-componentize-design-system-doc` 通過。

**範圍：**

- 範圍內：新增 `figma-componentize/references/documentation.md`；更新 `figma-componentize/SKILL.md`、`figma-componentize/references/detection.md`（開始時的詢問與計畫格式）、`figma-componentize/references/build-recipes.md`（ledger）、`figma-componentize/references/replacement.md`（步驟編號與報告）、`figma-componentize/docs/index.html`、`figma-componentize/README.md`。
- 範圍外：Non-Goals 所列項目、figma-m3-variables 的任何檔案、既有的偵測／配對／建立／替換邏輯、repo 外的已安裝副本。

## Risks / Trade-offs

- [Risk] 文件用到的 API（explicit mode、套用 styles、節點連結）只查證到 typings，沒有實測 → Mitigation：每個項目各自處理失敗並記入略過清單；第一次在實際檔案執行時先用不重要的檔案（列入 Open Questions）。
- [Risk] 大型檔案的寫入次數很多、耗時 → Mitigation：先盤點並回報預估次數，超過門檻先問；可只產生 Foundations 或 Components；每批可續做。
- [Risk] 文字標示在 token 改動後過期 → Mitigation：樣本本身綁定 token 會跟著變；標題區寫明產生日期；可單獨重新產生。
- [Risk] 設計師在產生的外框裡加了內容，取代時消失 → Mitigation：取代是 Tier 3、每次確認並明說；外框標題區提醒把自己的說明放在外框之外，或寫在元件描述欄位。
- [Risk] 預設字型沒有中文字形 → Mitigation：非英文語言使用涵蓋該語言的字型，寫入前先確認可以載入，不行就詢問；英文文件裡的中文名稱或描述改用可載入的涵蓋字型，載入不了的列在報告。
- [Risk] Noto Sans 系列字型在 `use_figma` 中能否載入沒有實測 → Mitigation：字型檢查在任何寫入之前執行；失敗時由設計師決定改用英文、另指定字型或略過。
- [Risk] 設計師指定其他語言時，標籤由代理人翻譯，用詞可能不符合團隊習慣 → Mitigation：標籤鍵值固定、數量有限；用詞不合時設計師可以指出，改掉後重新產生。
- [Risk] 每批項目數與 figma-use「每次少量操作」的建議有落差 → Mitigation：批次由同一個函式重複執行、項目可重入；逾時就減半。
- [Risk] 圖示判定把小型的非圖示元件（例如 48 px 的頭像）歸到圖示格 → Mitigation：圖示格仍顯示名稱與 instance，資訊沒有遺失；判定規則寫明，之後可調整。

## Migration Plan

1. 本變更修改的檔案以 PR #5（`improve-componentize-reuse-matching`，尚未合併）之後的內容為基礎；README 目前只在本機。發 PR 時以 PR #5 的分支為 base，或等它合併後再發，並一併納入 README。
2. 實作並驗收後，詢問使用者是否同步到四個已安裝位置。
3. 回復方式：刪除新增的參考文件，並以 git 還原其餘檔案。

## Open Questions

- 規模確認的門檻（tokens 300、元件 40、寫入 60 次）是估計值，待第一次在實際檔案執行後調整。
- 上述只查證到 typings 的 API，以及 Noto Sans 系列字型能否在 `use_figma` 中載入，需要在實際 Figma 檔案驗證一次。
- 繁體中文標籤的用詞（例如 Variants、Tokens 是否保留英文）在實作標籤對照表時定案，並於第一次產生後依使用者意見調整。
