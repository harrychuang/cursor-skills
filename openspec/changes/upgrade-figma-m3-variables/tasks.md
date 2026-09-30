## 1. Token 規格（`figma-m3-variables/references/token-spec.md`）

- [x] 1.1 依設計決策「命名編碼規則」「Sys 語意詞彙表與階梯」「新檔案預設三個 collection」改寫 token spec 的命名與詞彙部分，交付 Layer naming responsibilities、Name encoding rules、Default Sys vocabularies with file precedence、Off-scale values offer snapping or a custom step、Scopes are explicit and valid、WEB code syntax derived from names、Collection layout defaults：完成後 token spec 有 Ref 類別表、編碼規則表、M3 色彩角色、間距角色與單一階梯、圓角階梯（`corner-full` → `ref/radius/9999`）、typescale、elevation、描邊、尺寸、狀態不透明度、`{lower step}-plus` 自訂階梯規則、依角色與結構分的 scope 表（含 `ALL_FILLS` 不可與其他 fill scope 並用，以及 `OPACITY` 與 `COLOR_OPACITY` 的分工）、code syntax 推導規則與 collection 版型。驗證：人工檢查每個範例名稱都符合編碼規則，m3-token-vocabulary spec 的「Default mapping」範例表每一列都能在 token spec 查到相同結果，且 scope 表不含 `ALL_SCOPES`。
- [x] 1.2 依設計決策「文字與陰影預設採 Styles 模式」「狀態 token 採 M3 官方順序」「半透明填色維持實際呈現」補齊 token spec，交付 Typography tokens without prerequisites、Elevation, stroke width, opacity, and size tokens、Composite binding mode is inferred and announced、Component state token order：完成後 token spec 有 typography（Ref 原始值、Sys typescale、Text Style 命名與綁定、Variables 模式的 Comp tokens）、elevation（Sys 變數與 Effect Style）、描邊寬度、透明度、尺寸的三層清單，composed 色彩（`VariableComposedColor`）在三層中的位置與 `COLOR_OPACITY` 用法，bindable property map 補上 `strokeWeight`、`opacity`、effects、Text Style 與 Effect Style 的套用方式，Filled Button 範例包含 `label/large` 與 M3 順序的 disabled、hover tokens。驗證：以 grep 確認 token spec 不再出現「only when the file already models type」、狀態範例都是 `comp/{component}/{state}/{anatomy}/{property}`、state layer 不透明度為 hover 8、focus 10、pressed 10、dragged 16，行高與字距 token 以 px 儲存。

## 2. Plugin API 參考（`figma-m3-variables/references/binding-recipes.md`）

- [x] 2.1 [P] 依設計決策「綁定前比對解析值以確保外觀不變」「Library variables 不在本地複製」新增 binding recipes，交付 Appearance-neutrality check before binding、Library variables are not duplicated locally、Writes are sequential, re-validated, and traceable：完成後參考文件有 use_figma 與 dynamic-page 慣例（逐頁切換、async getter）、token 盤點、設計指南探索、目標結構檢查腳本、解析值比對 helper（`resolveForConsumer`、hex 與 alpha 比對、0.01 容差）、各屬性綁定腳本（維持實際呈現色彩與透明度的填色與描邊、四角圓角、padding 與 gap、尺寸、描邊寬度、節點透明度、Text Style 與 typography variables、Effect Style 與 effect variables、instance 處理）、依名稱冪等建立 variable 的 helper、library variables 偵測、三種半透明填色做法（在已核准的寫入中嘗試建立 composed 色彩，失敗則退回並回報；綁定前建立新的 paint 物件並填入解析後的色彩與 opacity；讀取時接受新舊兩種 composed 形狀）、effect 綁定後逐欄讀回、modes 超過方案上限的錯誤處理、讀回驗證腳本。驗證：人工檢查每段腳本只使用 async getter、跨頁作業逐頁以 `setCurrentPageAsync` 切換且不從 document root 搜尋、不呼叫 `loadAllPagesAsync()`、綁定前檢查型別、`return` 所有受影響 ID。

## 3. Workflow F（`figma-m3-variables/references/value-harvest.md`）

- [x] 3.1 依設計決策「Workflow F 放在 figma-m3-variables」「近似值以比對板與截圖交由使用者決定」新增 value harvest 的前半，交付 Harvest scope and baseline、Value collection covers every token family、Identical values merge without asking、Near values are decided by the user with visual evidence：完成後文件定義範圍確認條件（超過 50 個頂層 frame 或跨頁需確認）、基準截圖、收集腳本與略過規則、完全相同值的合併規則、近似門檻表、`Token Review — temporary` 比對板的位置（範圍所在頁面）與版面規格（樣本、數值、使用次數、來源節點超連結、建議值標示）、截圖與連結、逐組三選一的提問方式與清除步驟。驗證：人工比對門檻表與 m3-token-harvest spec 完全一致，且比對板規格只新增 Section、不修改既有節點。
- [x] 3.2 延續設計決策「半透明填色維持實際呈現」完成 value harvest 的後半，交付 Semantic and anatomy mapping with confidence、Token plan is confirmed before writing、Translucent paints keep their appearance、Appearance is preserved and verified、Workflow F is callable by other skills：完成後文件有色彩、間距、圓角、文字、陰影、描邊、透明度、尺寸的語意推論規則與信心度、元件結構（anatomy）推論與 Comp 命名、token 計畫欄位、依 API 能力選擇的三種半透明填色做法、綁定後讀回與前後截圖比對、給其他 skill 的輸入與回傳格式。驗證：人工套用規則推演 m3-token-harvest spec 的「Mapping outcomes」範例，得到相同的 Sys 與 Comp 名稱。

## 4. SKILL.md（`figma-m3-variables/SKILL.md`）

- [x] 4.1 依設計決策「變動分級取代單一 dry-run 規則」「慣例推斷優先於提問」「Skill 結構重整為路由加共用程序」改寫 SKILL.md 的前半，交付 Intent routing table、Shared procedures are defined once、Questions work in any host、Trigger description covers the upgraded scope、Change tiers govern confirmation、Confirmation requests carry the evidence to decide、Conventions are inferred from the file before asking：完成後 SKILL.md 依序有 frontmatter（含中文觸發詞）、前置條件與提問方式、路由表（A 到 F 與 Inventory only）、通用規則、Tier 0 到 3 表格與確認內容、命名摘要、共用程序 P1 到 P5。驗證：以 python 計算 description 不超過 1024 字元；以腳本檢查 SKILL.md 沒有超過 15 行的程式碼區塊。
- [x] 4.2 改寫 Workflows A 到 E 並新增 Workflow F，交付 Reference files have single responsibilities：完成後 A 與 E 的計畫含目前值與 token 值、缺 token 時轉 Workflow F；B 限定為新 token 系統並涵蓋 typography 與 elevation；C 對應 18 類規則；D 使用新的狀態順序與 Styles 模式；F 依 value harvest 步驟並說明給 `figma-componentize` 呼叫的方式；分工表加入 `figma-componentize`；reference 清單列出四份參考文件。驗證：以腳本抽出 SKILL.md 中所有 reference 連結與章節名稱，確認對應檔案與標題都存在。

## 5. 稽核規則（`figma-m3-variables/references/audit-rules.md`）

- [x] 5.1 [P] 依設計決策「稽核擴充到 18 類並分嚴重度」改寫 audit rules，交付 Audit covers eighteen rule types、Ref names agree with their values、Duplicate and near-duplicate primitives are surfaced with visual evidence、Sys scale labels are consistent、Token coverage is measured for components、Styles are backed by Variables、Legacy state token order is migrated by renaming、Names follow the format rules、Findings are reported by severity and fixed through change tiers、Alias checks inspect composed color values、Detection scripts work page by page in use_figma：完成後 1 到 18 類規則各有定義、嚴重度、偵測腳本與修正方式，既有腳本改為逐頁執行、alias 檢查涵蓋 composed 值內的兩個欄位、Type 5 改用 predicate、Type 10 型別表補齊，報告格式依嚴重度分組並標示修正的 Tier。驗證：人工核對每一類的嚴重度與 m3-token-audit spec 表格相同，並用 spec 的「Name and value checks」範例推演規則 12 的判定結果一致。

## 6. 中文文件頁（`figma-m3-variables/docs/index.html`）

- [x] 6.1 同步中文文件頁，交付 Documentation page mirrors the skill：完成後導覽與內容包含路由表、變動分級、Workflows A 到 F、近似值比對板、token 詞彙（含 typography 與 elevation）、狀態 token 順序與不透明度、18 類稽核規則、含 `figma-componentize` 的分工表，頁尾列出來源檔案與產生日期。驗證：以腳本確認每個導覽連結的 `#id` 都存在於頁面中，並在瀏覽器開啟確認版面沒有破損。

## 7. 整體驗證

- [x] 7.1 跨檔一致性與規格驗證：`corner-full`、間距階梯、狀態順序、state layer 不透明度、門檻表、18 類規則在 SKILL.md、token spec、value harvest、binding recipes、audit rules、文件頁之間一致；舊寫法（`gap-inline-sm` 代表 8、以 `/hovered` 結尾的範例、Focused 12%）只出現在稽核規則 17 的遷移範例中；腳本中沒有 `loadAllPagesAsync()` 呼叫。驗證：以 grep 檢查上述字串，並執行 `spectra validate upgrade-figma-m3-variables` 通過。
