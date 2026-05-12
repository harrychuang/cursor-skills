## Context

這個 skill 的目標是讓設計師或 PM 可以用圖片或 Figma source 生成設計系統、元件庫與產品界面。現有流程已經要求 token-first、Storybook-first、foundation guides 與 visual parity，但還缺少一份清楚的 accuracy contract，說明不同輸入來源可以期待的準確度與驗收方式。

Figma-first 模式可以取得結構化 context，例如 variables、component sets、layout data、code connections 與 selected frame context。只提供圖片時，agent 只能從 pixels 推論 layout、font、spacing、狀態與 component boundary；這可以生成高相似度畫面，但不能可靠重建完整產品規格。

## Goals / Non-Goals

**Goals:**

- 讓 PM/設計師在開始前理解不同輸入來源的精準度層級。
- 在 image-only 模式要求 agent 記錄 observed / inferred / missing context，並限制不能把推論當成設計稿事實。
- 補上更明確的 visual parity 收斂迴圈，要求先修 token 和 shared component，再修 page-only styling。
- 把最小輸入資料補到 PRD template 與 starter docs。

**Non-Goals:**

- 不新增影像辨識或像素比對 runtime dependency。
- 不保證單張圖片可以生成完整互動產品或完整設計系統。
- 不替代 Figma MCP、Code Connect、Dev Mode 或設計系統治理流程。

## Decisions

### Decision: Define accuracy tiers by input source

新增三個輸入精準度層級：Figma-first、multi-reference screenshot、single-image. Figma-first 是推薦路徑，multi-reference screenshot 是可接受但需要驗收收斂，single-image 只能產生第一版近似與推論清單。

### Decision: Add an image-only intake contract

只有圖片時，流程必須要求產品目的、目標裝置、主要狀態、字體或品牌線索、互動行為、資料內容與響應式需求。缺失的資訊要列入 `Open Questions`，不能默默內建成事實。

### Decision: Make parity an iterative acceptance loop

視覺驗收要分成 baseline capture、component parity、screen parity、responsive parity、final variance note。修正順序沿用既有規則：token/theme、primitive/shared component、component variant/props、composition/layout、page-only styling。

## Implementation Contract

完成後，workspace SHALL 提供一份 `start-here/ACCURACY_CONTRACT.md`，說明：

- Figma-first、multi-reference screenshot、single-image 三種輸入模式的 expected accuracy、primary risks、required guardrails。
- Image-only 模式必須補的最小資料與缺失資訊處理方式。
- 可接受的輸出承諾：可生成 token-backed approximation、Storybook component library、composed screens、visual parity iteration；不可承諾單張圖片可自動推導所有狀態、業務規則、響應式與資料模型。
- 視覺驗收流程必須包含 baseline、iteration、variance log。

流程文件 SHALL 引導 agent 在 Phase A 前閱讀 accuracy contract，並在 tasks 中加入 image-only intake、missing context log、parity variance log。

PRD template SHALL 補上與自動生成精準度相關的欄位，包括 source assets、known states、responsive targets、brand assets、data assumptions、acceptance threshold、open questions。

驗證方式：

- `npm test` from `design-workspace-starter` passes.
- Manual content review confirms both `design-workspace-starter` and `create-design-workspace/assets/template` contain the new accuracy contract and matching workflow references.
- `spectra validate --changes add-ui-generation-accuracy-contract --strict` passes.

## Risks / Trade-offs

- [Risk] 精準度說明讓流程看起來比較保守。 -> Mitigation: 明確區分 Figma-first 的高精度路徑與 image-only 的推論限制，避免錯誤承諾。
- [Risk] 增加 intake 欄位會讓 PM/設計師多做準備。 -> Mitigation: 把欄位分成 required 和 helpful，單張圖片仍可開始，但必須標記不確定性。
