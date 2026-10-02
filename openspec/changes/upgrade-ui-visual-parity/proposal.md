## Why

`ui-visual-parity` 目前修不到「細節一致」，原因在量測方式而不在修復流程：它只比對人工挑選的 15 到 60 個節點、只看規格格式裡有的欄位、1px 以內的誤差一律放行、行高與字距被歸類為「可接受的調適」、位置完全不比對，最後也沒有任何一步去看實際畫面。AI 看不到的差異就不會去修。此外，預設流程整段依賴的 `ui-pixel-align-report` 不在本 repo，workspace 的 skill 同步也只複製 `ui-visual-parity` 這一個資料夾，所以從這裡安裝的人實際上跑不了預設流程。

以兩個埋入已知差異的測試頁實測（共 67 個設計師看得出來的差異、6 個「畫面相同但寫法不同」的陷阱）：照文件原樣執行只有 7 個能指出原因；即使替它把每個元素都標好、全部配對成功，也只有 38 個能指出原因、18 個完全看不到，並對 5 個陷阱誤報。全部差異同時存在時，它回報的收斂率仍是 94%。

## What Changes

- 量測工具內建到 skill 裡，以單一指令完成一輪量測：擷取實作畫面 → 比對 → 判定是否一致，結束碼即為判定結果。不需安裝任何套件（只需 Node 22 以上與 Chromium 系列瀏覽器）。
- 以全量擷取取代人工取樣：自動量出畫面上每一個「會畫出東西」的元素（有填色或框線的方塊、文字、圖示、圖片、輸入框，以及 `::before`、`::after` 畫出的裝飾），不再手寫規格 JSON。
- 比對對象從「元素樹」改為「畫出來的東西」：以文字內容與相對位置自動配對，兩邊的包裝層結構不同也能比。
- 新增紅線量測：像設計師在 Figma 量間距一樣，量每個元素到相鄰元素或外框邊緣的距離。差異會連同「設計是由哪些 padding、gap、margin 組成、實作又是哪些」一起列出。
- 結果分成兩層：要修的原因，以及原因修掉後會自己消失的連帶結果。同一個差異在重複元件上只列一次。
- 宣告的版面數值（padding、gap、margin）不再直接比對，只用來解釋差異，所以畫面相同的不同寫法不會被當成偏差。
- 新增疊圖檢查作為最後一道：把兩張截圖疊起來找出不同的區域、標出所在元素，並為每個區域輸出放大的「參考｜實作｜差異」對照圖。屬性量不到的差異由這一道接住。
- 收斂條件改為三道檢查都通過（外觀、位置、畫面），或剩餘項目都有明確裁決。停止規則由「最多三輪」改為「沒有進展才停」。
- **BREAKING** 參考與實作屬於同一種排版引擎且尺寸相同時（例如 Figma 對 web），行高與字距由「可接受的調適」改為必須一致；幾何容差由 1px 改為 0.5px，宣告數值容差改為 0.25。
- **BREAKING** 預設流程不再呼叫 `ui-pixel-align-report` 的腳本與說明檔；該 skill 產生的 findings 檔仍可作為輸入。
- 新增 Figma 端的擷取腳本（唯讀，經由可執行 Plugin API 的 Figma 工具），以及只有唯讀 Figma MCP 時的退回做法。
- 既有的判定規則全部保留：drift、adaptation、required-adaptation、無障礙 remap、字體環境不符時不得修改字級、token 優先與共用元件優先的修復順序。
- 兩個基準測試頁隨 skill 附上，修改腳本後用它確認偵測能力沒有退步。
- 更新 repo README 中過時的 skill 說明。
- **BREAKING** skill 的名稱統一為資料夾名稱 `ui-visual-parity`：主文件 frontmatter 的 name 與標題不再使用 `ui-compare-to-reference`，以舊名稱呼叫它的地方要改用新名稱；repo 內以舊名稱稱呼它的另外兩份 skill 文件一併更新。資料夾名稱不變。

## Capabilities

### New Capabilities

- `parity-capture`: 把參考與實作兩邊量測成同一種規格——每個可見元素的位置、外觀、文字排版、互動狀態，以及可重現的截圖。
- `parity-diff`: 配對兩邊的可見元素，比對外觀與紅線距離，區分原因與連帶結果，並套用既有的 parity 分類規則。
- `parity-pixel-overlay`: 疊圖比對兩張截圖，回報差異區域、所在元素與放大對照圖，並區分已有解釋與沒有解釋的區域。
- `parity-fix-loop`: 單一指令的量測循環、一致性判定、修復順序、停止規則與回報內容。
- `parity-skill-package`: skill 可單獨安裝使用的檔案結構、參考文件分工、基準測試與 README 說明。

### Modified Capabilities

(none)

## Impact

- Affected specs: `parity-capture`, `parity-diff`, `parity-pixel-overlay`, `parity-fix-loop`, `parity-skill-package`
- Affected code:
  - Modified:
    - `ui-visual-parity/SKILL.md`
    - `ui-visual-parity/references/locate-owner.md`
    - `ui-visual-parity/references/apply-to-platform.md`
    - `README.md`
    - `ds-to-storybook/SKILL.md`
    - `frontend-product-implementation/references/verification-reporting.md`
  - New:
    - `ui-visual-parity/scripts/parity.mjs`
    - `ui-visual-parity/scripts/capture_web.mjs`
    - `ui-visual-parity/scripts/cdp.mjs`
    - `ui-visual-parity/scripts/extract_dom.js`
    - `ui-visual-parity/scripts/extract_figma.js`
    - `ui-visual-parity/scripts/figma_to_spec.mjs`
    - `ui-visual-parity/scripts/parity_diff.mjs`
    - `ui-visual-parity/scripts/pixel_diff.mjs`
    - `ui-visual-parity/scripts/png.mjs`
    - `ui-visual-parity/assets/parity-policy.json`
    - `ui-visual-parity/references/measure.md`
    - `ui-visual-parity/references/ui-spec.md`
    - `ui-visual-parity/references/parity-policy.md`
    - `ui-visual-parity/references/figma-to-css.md`
    - `ui-visual-parity/references/reading-results.md`
    - `ui-visual-parity/tests/benchmark/wallet/reference.html`
    - `ui-visual-parity/tests/benchmark/wallet/defects.mjs`
    - `ui-visual-parity/tests/benchmark/settings/reference.html`
    - `ui-visual-parity/tests/benchmark/settings/defects.mjs`
    - `ui-visual-parity/tests/run_benchmark.mjs`
    - `ui-visual-parity/tests/unit.test.mjs`
  - Removed:
    - (none)
