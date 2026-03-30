# Token Spec — M3 三層命名規則

> 本文件供 `figma-m3-variables` skill 使用。定義命名規則、各元件 token 清單與 scope 對照表。

---

## 1. 命名結構

### 三層繼承

```
{prefix}/ref/{category}/{name}        ← Ref（原始值）
{prefix}/sys/{category}/{name}        ← Sys（語意，別名 Ref）
{prefix}/comp/{component}/{property}  ← Comp（元件，別名 Sys）
```

**前綴範例**：`md`、`dd`、`bd`（由使用者在工作流 B 步驟 1 確認）

### Collection 命名規則

| 結構選擇 | Collection 名稱 |
|---------|----------------|
| 分三層 | `{Prefix} · Reference` / `{Prefix} · System` / `{Prefix} · Component · {ElementName}` |
| 單一 Collection | `{Prefix} · Design Tokens` |

### Mode 命名規則

| Collection 類型 | Mode 名稱 |
|----------------|-----------|
| Ref（原始值）| `Default` |
| Sys（可支援 Light/Dark）| `Default`（單模式）或 `Light` + `Dark`（雙模式） |
| Comp | `Default` |

---

## 2. WEB Code Syntax 格式

```
var(--{prefix}-{layer}-{category}-{name})
```

範例：
```
var(--md-ref-palette-primary40)
var(--md-sys-color-primary)
var(--md-comp-filled-button-container-background-color)
```

規則：層級之間用 `-` 分隔（非 `/`），全部小寫，空格改 `-`。

---

## 3. Variable Scope 對照表

| Token 角色 | Figma Scope |
|-----------|------------|
| Ref 層（所有 token） | `[]`（空陣列，不出現在 picker）|
| 背景 / 容器填色（Sys / Comp） | `["FRAME_FILL", "SHAPE_FILL"]` |
| 文字顏色（Sys / Comp） | `["TEXT_FILL"]` |
| 圖形 / 通用填色（Sys / Comp） | `["ALL_FILLS"]` |
| 邊框顏色 | `["STROKE_COLOR"]` |
| 圓角 | `["CORNER_RADIUS"]` |
| padding / gap（間距） | `["GAP"]` |
| 寬 / 高 | `["WIDTH_HEIGHT"]` |
| 透明度 | `["OPACITY"]` |
| Font Family | `["FONT_FAMILY"]` |
| Font Size | `["FONT_SIZE"]` |
| Font Weight | `["FONT_WEIGHT"]` |
| Line Height | `["LINE_HEIGHT"]` |
| Letter Spacing | `["LETTER_SPACING"]` |

---

## 4. Filled Button — Token 清單

### 4-1 Ref 層（原始值）

| Token 名稱 | 類型 | 範例值 | scope |
|-----------|------|--------|-------|
| `{p}/ref/palette/primary/40` | COLOR | `#FF0101` | `[]` |
| `{p}/ref/palette/neutral/100` | COLOR | `#FFFFFF` | `[]` |
| `{p}/ref/palette/neutral/0` | COLOR | `#000000` | `[]` |
| `{p}/ref/palette/error/40` | COLOR | `#B3261E` | `[]` |
| `{p}/ref/shape/corner/full` | FLOAT | `12`（或設計稿實際值）| `[]` |
| `{p}/ref/spacing/button/padding-h` | FLOAT | `16` | `[]` |
| `{p}/ref/spacing/button/padding-v` | FLOAT | `12` | `[]` |
| `{p}/ref/spacing/button/icon-gap` | FLOAT | `8` | `[]` |
| `{p}/ref/typeface/label/size` | FLOAT | `14` | `[]` |
| `{p}/ref/typeface/label/weight` | FLOAT | `500` | `[]` |

> `{p}` = 使用者確認的前綴，例如 `md`

### 4-2 Sys 層（語意，別名 Ref）

| Token 名稱 | 類型 | 別名目標（Ref） | scope |
|-----------|------|----------------|-------|
| `{p}/sys/color/primary` | COLOR | `…/ref/palette/primary/40` | `["FRAME_FILL", "SHAPE_FILL"]` |
| `{p}/sys/color/on-primary` | COLOR | `…/ref/palette/neutral/100` | `["TEXT_FILL"]` |
| `{p}/sys/color/error` | COLOR | `…/ref/palette/error/40` | `["FRAME_FILL", "SHAPE_FILL"]` |
| `{p}/sys/color/on-error` | COLOR | `…/ref/palette/neutral/100` | `["TEXT_FILL"]` |
| `{p}/sys/shape/corner-full` | FLOAT | `…/ref/shape/corner/full` | `["CORNER_RADIUS"]` |
| `{p}/sys/spacing/button-padding-h` | FLOAT | `…/ref/spacing/button/padding-h` | `["GAP"]` |
| `{p}/sys/spacing/button-padding-v` | FLOAT | `…/ref/spacing/button/padding-v` | `["GAP"]` |
| `{p}/sys/spacing/button-icon-gap` | FLOAT | `…/ref/spacing/button/icon-gap` | `["GAP"]` |

### 4-3 Comp 層（元件，別名 Sys）

| Token 名稱 | 類型 | 別名目標（Sys） | scope |
|-----------|------|----------------|-------|
| `{p}/comp/filled-button/container/background-color` | COLOR | `…/sys/color/primary` | `["FRAME_FILL", "SHAPE_FILL"]` |
| `{p}/comp/filled-button/container/shape` | FLOAT | `…/sys/shape/corner-full` | `["CORNER_RADIUS"]` |
| `{p}/comp/filled-button/container/padding-horizontal` | FLOAT | `…/sys/spacing/button-padding-h` | `["GAP"]` |
| `{p}/comp/filled-button/container/padding-vertical` | FLOAT | `…/sys/spacing/button-padding-v` | `["GAP"]` |
| `{p}/comp/filled-button/label-text/color` | COLOR | `…/sys/color/on-primary` | `["TEXT_FILL"]` |
| `{p}/comp/filled-button/with-icon/icon-label-gap` | FLOAT | `…/sys/spacing/button-icon-gap` | `["GAP"]` |

### 4-4 節點綁定對照（Filled Button）

| 節點屬性 | 綁定的 Comp token |
|---------|-----------------|
| 容器 `fills` | `…/container/background-color` |
| 容器 `topLeftRadius` + 其他 3 角 | `…/container/shape` |
| 容器 `paddingLeft` / `paddingRight` | `…/container/padding-horizontal` |
| 容器 `paddingTop` / `paddingBottom` | `…/container/padding-vertical` |
| 文字節點 `fills` | `…/label-text/color` |
| icon 與 label 之間的 `itemSpacing` | `…/with-icon/icon-label-gap` |

---

## 5. 其他元件（預留擴充）

下列元件可依相同三層結構擴充，token 命名遵照 Section 1 的規則：

| 元件 | Comp token prefix |
|------|------------------|
| Outlined Button | `{p}/comp/outlined-button/...` |
| Text Button | `{p}/comp/text-button/...` |
| Elevated Button | `{p}/comp/elevated-button/...` |
| Tonal Button | `{p}/comp/filled-tonal-button/...` |
| Card | `{p}/comp/card/...` |
| Input / Text Field | `{p}/comp/text-field/...` |
| Chip | `{p}/comp/chip/...` |
| Dialog | `{p}/comp/dialog/...` |
| Navigation Bar | `{p}/comp/navigation-bar/...` |
| Top App Bar | `{p}/comp/top-app-bar/...` |

擴充時的流程：
1. 確認設計稿節點的視覺屬性（顏色、圓角、間距）
2. 新增對應的 Ref token（若現有 Ref 值已涵蓋則直接別名）
3. 新增 Sys token（若現有 Sys 語意已涵蓋則直接重用）
4. 新增 Comp token 並別名到 Sys
5. 執行工作流 A 步驟 4 綁定到元件節點

---

## 6. Light / Dark 雙模式擴充

Sys 層 Collection 可加入第二個 mode（`Dark`），只需對每個 Sys color token 的 Dark mode 設定不同的 `VARIABLE_ALIAS` 指向另一個 Ref palette token：

```js
// Light mode
sysPrimary.setValueForMode(lightModeId, { type: 'VARIABLE_ALIAS', id: refPrimary40.id });
// Dark mode
sysPrimary.setValueForMode(darkModeId,  { type: 'VARIABLE_ALIAS', id: refPrimary80.id });
```

Comp 層與節點綁定不需要任何修改，切換 Sys Collection 的 mode 即可全站換色。
