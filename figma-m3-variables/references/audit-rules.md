# Audit Rules — Variables 稽核規則

> 本文件供 `figma-m3-variables` skill 工作流 C 使用。定義 6 種違規類型及對應修正腳本模板。

---

## 稽核流程

1. 執行 inspect 腳本取得完整 variable 資料（名稱、resolvedType、scopes、codeSyntax、valuesByMode）
2. 逐條套用以下 6 種規則，記錄所有命中的 variable
3. 將問題彙整成表格回報使用者
4. 詢問使用者是否自動修正（每種違規類型可個別選擇）
5. 執行修正腳本後再次 inspect 確認違規歸零

---

## 違規類型 1：跨層直連（Comp → Ref，跳過 Sys）

**定義**：Comp 層變數的 value 直接別名到 Ref 層變數，沒有經過 Sys 層。

**偵測方式**：
```js
// 取得所有 Comp 層 variable（名稱含 "/comp/"）
// 檢查其 valuesByMode[modeId].id 是否指向名稱含 "/ref/" 的 variable
const allVars = await figma.variables.getLocalVariablesAsync();
const varById = Object.fromEntries(allVars.map(v => [v.id, v]));
const violations = [];
for (const v of allVars) {
  if (!v.name.includes('/comp/')) continue;
  for (const [modeId, val] of Object.entries(v.valuesByMode)) {
    if (val?.type === 'VARIABLE_ALIAS') {
      const target = varById[val.id];
      if (target && target.name.includes('/ref/')) {
        violations.push({ variable: v.name, aliasTarget: target.name });
      }
    }
  }
}
return violations;
```

**修正方式**：
- 建立缺少的 Sys 層 token，令 Comp → Sys → Ref
- 若 Sys token 已存在但 Comp 指向錯誤，更新 Comp 的 `setValueForMode` 指向正確 Sys token

---

## 違規類型 2：scope 使用 ALL_SCOPES

**定義**：任何 variable 的 `scopes` 陣列包含 `"ALL_SCOPES"` 或為空（等同 ALL_SCOPES），導致變數出現在所有 picker 中造成噪音。

**偵測方式**：
```js
const allVars = await figma.variables.getLocalVariablesAsync();
const violations = allVars.filter(v =>
  v.scopes.includes('ALL_SCOPES') ||
  (v.scopes.length === 0 && !v.name.includes('/ref/'))
  // Ref 層允許空 scope（隱藏），非 Ref 層的空 scope 視為違規
);
return violations.map(v => ({ name: v.name, scopes: v.scopes }));
```

**修正方式**：依 [token-spec.md scope 對照表](token-spec.md) 為每個 variable 設定正確的明確 scope：
```js
const variable = await figma.variables.getVariableByIdAsync(variableId);
variable.scopes = ["FRAME_FILL", "SHAPE_FILL"]; // 依角色替換
```

---

## 違規類型 3：未設定 WEB code syntax

**定義**：variable 的 `codeSyntax.WEB` 為空字串或不存在。

**偵測方式**：
```js
const allVars = await figma.variables.getLocalVariablesAsync();
const violations = allVars.filter(v => !v.codeSyntax?.WEB);
return violations.map(v => ({ name: v.name, codeSyntax: v.codeSyntax }));
```

**修正方式**：從 variable 名稱自動推導 WEB syntax：
```js
// 將 "/" 與空格轉為 "-"，加上 var() 包裹
const cssName = v.name.replace(/[\s\/]+/g, '-').toLowerCase();
v.setVariableCodeSyntax('WEB', `var(--${cssName})`);
```

> 若名稱含多個 `/`（如 `md/sys/color/primary`），產出 `var(--md-sys-color-primary)`，符合 M3 慣例。

---

## 違規類型 4：前綴不一致

**定義**：同一個 Figma 檔案中，Variables 使用了兩種以上的前綴（例如 `md/...` 與 `bd/...` 混用），違反整個 session 使用同一前綴的規則。

**偵測方式**：
```js
const allVars = await figma.variables.getLocalVariablesAsync();
const prefixes = new Set(allVars.map(v => v.name.split('/')[0]));
return {
  prefixCount: prefixes.size,
  prefixes: [...prefixes],
  violation: prefixes.size > 1
};
```

**修正方式**：
- 確認正確的前綴（詢問使用者）
- 批次重命名違規 variable：`variable.name = variable.name.replace(/^old-prefix\//, 'new-prefix/')`
- 同步更新 `codeSyntax.WEB` 中的前綴

---

## 違規類型 5：Ref 層變數直接綁定到節點

**定義**：節點的視覺屬性（fills、strokes、radius 等）直接綁定了 Ref 層 variable，而非 Sys 或 Comp 層。Ref 層應只做原始值儲存，不應直接出現在設計組件上。

**偵測方式**：
需巡覽設計稿節點，檢查 `boundVariables`，比對其指向的 variable 名稱是否包含 `/ref/`：
```js
// 在指定頁面掃描所有節點的 boundVariables
await figma.setCurrentPageAsync(figma.currentPage);
const violations = [];
figma.currentPage.findAll(node => {
  const bv = node.boundVariables;
  if (!bv) return false;
  for (const [prop, binding] of Object.entries(bv)) {
    const refs = Array.isArray(binding) ? binding : [binding];
    for (const b of refs) {
      if (b?.id) {
        // 記錄下來，稍後對比 variable 名稱
        violations.push({ nodeId: node.id, nodeName: node.name, prop, variableId: b.id });
      }
    }
  }
  return false;
});
// 再查 variable 名稱
const result = [];
for (const item of violations) {
  const v = await figma.variables.getVariableByIdAsync(item.variableId);
  if (v && v.name.includes('/ref/')) {
    result.push({ ...item, variableName: v.name });
  }
}
return result;
```

**修正方式**：
- 確認對應的 Sys 或 Comp token 是否存在
- 若存在：重新綁定節點到正確層級的 token
- 若不存在：先建立 Sys / Comp token 再綁定

---

## 違規類型 6：空 Collection（有集合但無 Variables）

**定義**：File 中存在 variable collection，但 `variableIds` 陣列為空，是廢棄或誤建的集合。

**偵測方式**：
```js
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const empty = cols.filter(c => c.variableIds.length === 0);
return empty.map(c => ({ name: c.name, id: c.id }));
```

**修正方式**：詢問使用者是否要刪除空 collection：
```js
// 刪除前請使用者確認 collection 名稱
const col = await figma.variables.getVariableCollectionByIdAsync(collectionId);
col.remove();
```

---

## 稽核回報格式

回報時以此格式呈現：

```
## Variables 稽核結果

### 發現 {N} 個問題

| # | 違規類型 | 變數 / 節點 | 說明 |
|---|---------|------------|------|
| 1 | 跨層直連 | md/comp/filled-button/label-text/color | Comp 直接別名 Ref，跳過 Sys |
| 2 | 未設 WEB syntax | md/sys/color/primary | codeSyntax.WEB 為空 |
| 3 | ALL_SCOPES | md/comp/filled-button/container/shape | scope 未明確設定 |

是否要自動修正以上 3 個問題？
```

若無違規，回報：

```
✓ 所有 Variables 符合 M3 三層繼承規範，無違規。
```
