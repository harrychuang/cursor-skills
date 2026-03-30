---
name: figma-m3-variables
description: >-
  在 Figma 設計稿中以 Google Material Design 三層 token 繼承方式（Ref → Sys → Comp）建立、套用、稽核與理解 Variables。
  使用時機：使用者要為元件或界面建立 Variables、套用現有 Variables 到節點、稽核 token 命名與結構是否符合規範、
  或希望 AI 讀懂現有 Variables 後反推設計元件。
  觸發詞：建立 Variables、套用 Variables、Figma variables、M3 token、design token、token 繼承、
  token 稽核、audit variables、從 variables 設計元件、三層 token。
---

# Figma M3 Variables

以 Google Material Design 3 三層繼承（Ref → Sys → Comp）在 Figma 中管理 Variables 的完整流程。

**MANDATORY prerequisite**: 任何 `use_figma` 呼叫前都必須先讀取 `figma-use` skill。
**Always pass** `skillNames: "figma-m3-variables"` 給每一個 `use_figma` 呼叫。

---

## 0. 通用規則（每條工作流都適用）

1. **Inspect 先於 Write** — 每次操作前先執行 read-only `use_figma` 確認現有狀態，再執行寫入。
2. **ALL_SCOPES 禁止使用** — 依 token 角色設定明確 scope（見 [token-spec.md](references/token-spec.md)）。
3. **必設 WEB code syntax** — 格式固定為 `var(--{prefix}-{layer}-{name})`，例如 `var(--md-sys-color-primary)`。
4. **return 所有 ID** — 每個建立或修改的腳本都必須 `return` 所有受影響的 variable ID 與 node ID。
5. **token 前綴一旦確認就固定** — 整個 session 使用同一前綴，不允許混用。
6. **`use_figma` 呼叫嚴格循序** — 絕不並行執行兩個 `use_figma`。
7. 遇到錯誤先停下來讀錯誤訊息，修正後再重試，絕不盲目 retry。

---

## 工作流 A：套用現有 Variables 到元件

**觸發**：使用者提供 Figma URL + node-id，要求套用 Variables。

### 步驟

1. **Inspect** — 列出 file 中所有 variable collections 與 variables：
   ```js
   const cols = await figma.variables.getLocalVariableCollectionsAsync();
   const result = [];
   for (const c of cols) {
     const vars = [];
     for (const id of c.variableIds) {
       const v = await figma.variables.getVariableByIdAsync(id);
       if (v) vars.push({ name: v.name, id: v.id, type: v.resolvedType, scopes: v.scopes });
     }
     result.push({ collection: c.name, id: c.id, modes: c.modes.map(m => m.name), variables: vars });
   }
   return result;
   ```

2. **判斷**：
   - Variables 存在且命名符合 M3 三層結構 → 執行步驟 3
   - Variables 不存在或不完整 → 轉入**工作流 B**

3. **比對元件需求** — 根據元件類型（Button、Card 等）從 Comp 層找到對應 token，列出擬綁定清單後呈現給使用者確認。

4. **綁定** — 執行：
   - 背景色 / 前景色：`figma.variables.setBoundVariableForPaint(paint, "color", variable)` → 接回新 paint 再指派
   - 圓角：`node.setBoundVariable("topLeftRadius", variable)` × 4 個角
   - padding：`node.setBoundVariable("paddingLeft" | "paddingRight" | "paddingTop" | "paddingBottom", variable)`
   - gap：`node.setBoundVariable("itemSpacing", variable)`
   - 文字顏色同上（`setBoundVariableForPaint` 到 text node 的 fills）

5. **Validate** — 呼叫 `get_screenshot` 確認視覺正確。

---

## 工作流 B：建立 Variables（檔案中尚未建立）

**觸發**：檔案中找不到符合 M3 三層結構的 Variables，或使用者明確要求建立。

### 步驟

1. **詢問前綴** — 使用 AskQuestion 請使用者選擇（例如 `md`、`dd`、`bd` 或自訂）。

2. **詢問 Collection 結構** — 使用 AskQuestion：
   - **分三層**（推薦）：三個 collection：`{Prefix} · Reference`、`{Prefix} · System`、`{Prefix} · Component · {ElementName}`
   - **單一 Collection**：一個 collection，用 group prefix 區分三層

3. **Inspect** — 確認目前 file 無重複 collection 名稱。

4. **建立 Variables** — 依 [token-spec.md](references/token-spec.md) 的 token 清單：
   - **Ref 層**：存放原始數值（色碼、數字），scope 設 `[]`（隱藏，不出現在 picker）
   - **Sys 層**：別名（`VARIABLE_ALIAS`）指向 Ref，scope 依角色設定
   - **Comp 層**：別名指向 Sys，scope 依角色設定

5. **綁定** — 確認 Variables 建立完畢後，執行工作流 A 步驟 4 綁定到目標節點。

6. **Validate** — `get_screenshot` 確認視覺正確，並回報三層 collection 的 variable 數量。

### Ref 層 scope 規則

Ref 層 variables 不應出現在設計師的 picker 中，scope 必須設為 `[]`（空陣列）。

---

## 工作流 C：稽核現有 Variables

**觸發**：使用者要求檢查、稽核、audit variables 或詢問「命名有沒有問題」。

### 步驟

1. **Inspect** — 讀取所有 collections、variables、scopes、code syntax、valuesByMode。

2. **依 [audit-rules.md](references/audit-rules.md) 檢查** — 逐條套用 6 種違規類型，彙整問題清單。

3. **回報** — 以表格或清單呈現：
   - 違規變數名稱
   - 違規類型
   - 建議修正方式

4. **詢問是否修正** — 呈現問題後使用 AskQuestion 詢問：「是否要自動修正以上問題？」若使用者同意，逐項執行修正腳本。

5. **修正後 Validate** — 再次 inspect 確認違規歸零。

---

## 工作流 D：從現有 Variables 設計元件

**觸發**：使用者希望 AI 理解現有 token 並用它們建立或更新元件。

### 步驟

1. **Inspect** — 列出所有 variables，分析三層結構與 token 語意（`primary`、`on-primary`、`container-shape` 等）。

2. **理解語意對應**：
   - `**/color/primary` 或 `**/container/background-color` → 元件背景
   - `**/color/on-primary` 或 `**/label-text/color` → 元件前景文字
   - `**/shape/**` 或 `**/container/shape` → 圓角
   - `**/padding-horizontal` / `**/padding-vertical` → 內距
   - `**/spacing/**` 或 `**/gap` → gap

3. **建立元件** — 根據理解到的 token 對應建立 Frame / Component，並用工作流 A 步驟 4 的方式綁定 variables。若要建立完整的 Component Set（含 variants），先參考 `figma-generate-library` skill 的 Phase 3 規則。

4. **Validate** — `get_screenshot` 確認元件視覺正確，token 顏色解析無誤。

---

## 與現有 Skill 的分工

| Skill | 負責範圍 |
|-------|---------|
| `figma-use` | Plugin API 底層規則（顏色 0–1、return、page 切換等）**必須先讀取** |
| `figma-m3-variables`（本 Skill） | Figma 端 M3 Variables 的建立、套用、稽核、反推設計 |
| `design-system-governance` | 程式碼端 token 治理（CSS/SCSS tokens），與本 Skill 互補 |
| `figma-generate-library` | 完整 design system 多階段建構；工作流 D 遇元件建立時可參考其 Phase 3 |

---

## 參考文件

- [token-spec.md](references/token-spec.md) — M3 三層命名規則、各元件 token 清單、scope 對照表
- [audit-rules.md](references/audit-rules.md) — 稽核違規類型定義與修正指引
