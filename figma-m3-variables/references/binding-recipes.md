# Binding Recipes — Plugin API scripts for figma-m3-variables

> Scripts to run through `use_figma`. Every call passes `skillNames: "figma-m3-variables"`.
> Read the `figma-use` skill for general Plugin API rules first; where it disagrees with §0 of this file, follow this file (§0 records facts verified against the Plugin API reference on 2026-09-30).
> Inputs are written as `UPPER_CASE` constants at the top of each script. Paste the helpers from §1 that a script uses.

Contents

0. use_figma conventions
1. Shared helpers
2. P2 — Token inventory and convention inference
3. P1 — Design guideline discovery
4. P3 — Target inspection
5. Comparing values before binding
6. Creating collections, variables, and composed colors
7. Binding recipes
8. Library variables
9. P5 — Validation

---

## 0. use_figma conventions

- **Pages**: every call starts on the first page. Switch with `await figma.setCurrentPageAsync(page)`; assigning `figma.currentPage` throws. `figma.loadAllPagesAsync()` is not available in use_figma, so never search from `figma.root`: list pages with `figma.root.children` and process one page per call.
- **Async getters**: use `figma.getNodeByIdAsync`, `figma.variables.getVariableByIdAsync`, `getLocalVariablesAsync`, `getLocalVariableCollectionsAsync`, `figma.getLocalTextStylesAsync`, `getLocalEffectStylesAsync`, `getLocalPaintStylesAsync`, and `instance.getMainComponentAsync()` (`mainComponent` cannot be read). `textStyleId` and `effectStyleId` are read-only: apply styles with `setTextStyleIdAsync`, `setRangeTextStyleIdAsync`, and `setEffectStyleIdAsync`.
- **Sequence**: calls run one after another. Each write script re-fetches nodes and variables by ID, checks the variable type against the property, and returns every affected variable ID, style ID, and node ID.
- **Chunks**: at most 100 bindings, or one component, per call.
- **Units**: colors are 0–1 RGB(A). A variable bound to layer `opacity` holds 0–100 while `node.opacity` reads 0–1. Composed-color opacity is 0–100. Line height and letter spacing variables are pixels.
- **Typography**: `fontFamily`, `fontSize`, `fontStyle`, `fontWeight`, `letterSpacing`, `lineHeight`, `paragraphSpacing`, and `paragraphIndent` can all be bound, on text nodes and on Text Styles (some guides claim size, weight, and line height cannot — the Plugin API reference says they can). Load fonts before changing text or Text Styles.
- **Modes**: the error `in addMode: Limited to N modes only` means the plan's limit (Starter 1, Professional 10, Organization 20). Stop and tell the user.
- **Returned copies**: `setBoundVariableForPaint` and `setBoundVariableForEffect` return new objects; assign them back to the node or style. The returned copy is not resolved to the variable's value, so read values back from the node or style.
- **Mixed values**: properties can return `figma.mixed`; convert it with `m()` (§1) before returning it.

---

## 1. Shared helpers

```js
const r2 = v => Math.round(v * 100) / 100;
const m = v => (v === figma.mixed ? 'mixed' : v);
const hex = c => '#' + [c.r, c.g, c.b].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
const lin = v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const fLab = t => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
function lab(c) {
  const R = lin(c.r), G = lin(c.g), B = lin(c.b);
  const x = fLab((0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047);
  const y = fLab(0.2126729 * R + 0.7151522 * G + 0.072175 * B);
  const z = fLab((0.0193339 * R + 0.119192 * G + 0.9503041 * B) / 1.08883);
  return { L: 116 * y - 16, a: 500 * (x - y), b: 200 * (y - z) };
}
const deltaE = (c1, c2) => { const p = lab(c1), q = lab(c2); return Math.hypot(p.L - q.L, p.a - q.a, p.b - q.b); };
const tone = c => Math.round(lab(c).L);
```

```js
function hueFamily(c) {
  const p = lab(c);
  if (Math.hypot(p.a, p.b) < 10) return 'neutral';
  const max = Math.max(c.r, c.g, c.b), d = max - Math.min(c.r, c.g, c.b);
  let h = max === c.r ? ((c.g - c.b) / d) % 6 : max === c.g ? (c.b - c.r) / d + 2 : (c.r - c.g) / d + 4;
  h = (h * 60 + 360) % 360;
  const bands = [[15, 'red'], [45, 'orange'], [70, 'yellow'], [165, 'green'], [195, 'teal'], [255, 'blue'], [290, 'purple'], [345, 'pink']];
  if (h >= 345) return 'red';
  return bands.find(([limit]) => h < limit)[1];
}
const decodeNum = s => Number(s.replace(/^neg-/, '-').replace('_', '.'));
const encodeNum = n => (n < 0 ? 'neg-' : '') + String(r2(Math.abs(n))).replace('.', '_');
const webSyntax = name => `var(--${name.replace(/[\s\/]+/g, '-').toLowerCase()})`;
const layerOf = name => { const s = name.split('/'); return ['ref', 'sys', 'comp'].find(l => s[1] === l || s[0] === l) ?? 'unknown'; };
```

`aliasRefs` walks any variable value — a plain alias, a composed color `{ color, opacity }`, or the older `VARIABLE_EXPRESSION` shape — and returns every alias with its path (`value`, `color`, `opacity`, …):

```js
function aliasRefs(val, path = '', out = []) {
  if (!val || typeof val !== 'object') return out;
  if (val.type === 'VARIABLE_ALIAS' && val.id) { out.push({ path: path || 'value', id: val.id }); return out; }
  for (const [k, v] of Object.entries(val)) aliasRefs(v, path ? `${path}.${k}` : k, out);
  return out;
}
function sameValue(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 0.01;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return a === b;
  if ('r' in a && 'r' in b) return hex(a) === hex(b) && Math.abs((a.a ?? 1) - (b.a ?? 1)) < 0.01;
  return JSON.stringify(aliasRefs(a).map(x => x.id)) === JSON.stringify(aliasRefs(b).map(x => x.id));
}
```

Every binding goes through a type check first (scopes do not stop the API from binding a wrong type):

```js
const STRING_FIELDS = ['fontFamily', 'fontStyle', 'characters'];
function checkType(prop, variable) {
  const want = ['fills', 'strokes', 'color'].includes(prop) ? 'COLOR' : STRING_FIELDS.includes(prop) ? 'STRING' : 'FLOAT';
  if (!variable) throw new Error(`no variable for ${prop}`);
  if (variable.resolvedType !== want) throw new Error(`${variable.name} is ${variable.resolvedType}; ${prop} needs ${want}`);
}
function bind(target, prop, variable) { checkType(prop, variable); target.setBoundVariable(prop, variable); }
```

---

## 2. P2 — Token inventory and convention inference

Read-only. Returns collections, variables (or group counts when the file has more than 300), and styles.

```js
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const byId = new Map(vars.map(v => [v.id, v]));
const colName = new Map(cols.map(c => [c.id, c.name]));
const show = val => {
  if (val && typeof val === 'object' && 'r' in val) return hex(val) + (val.a < 1 ? ` a${Math.round(val.a * 100)}` : '');
  const refs = aliasRefs(val);
  return refs.length ? refs.map(r => `${r.path}→${byId.get(r.id)?.name ?? r.id}`).join(', ') : val;
};
const groups = {};
for (const v of vars) { const k = v.name.split('/').slice(0, 3).join('/'); groups[k] = (groups[k] ?? 0) + 1; }
const textStyles = await figma.getLocalTextStylesAsync();
const effectStyles = await figma.getLocalEffectStylesAsync();
return {
  collections: cols.map(c => ({ id: c.id, name: c.name, modes: c.modes.map(x => x.name), count: c.variableIds.length })),
  prefixes: [...new Set(vars.map(v => v.name.split('/')[0]))],
  groups,
  variables: vars.length > 300 ? `${vars.length} variables: request one group at a time` : vars.map(v => ({
    id: v.id, name: v.name, type: v.resolvedType, collection: colName.get(v.variableCollectionId), scopes: v.scopes,
    web: v.codeSyntax.WEB ?? null, remote: v.remote,
    values: Object.fromEntries(Object.entries(v.valuesByMode).map(([mode, val]) => [mode, show(val)])),
  })),
  textStyles: textStyles.map(s => ({ id: s.id, name: s.name, boundFields: Object.keys(s.boundVariables ?? {}) })),
  effectStyles: effectStyles.map(s => ({ id: s.id, name: s.name, layers: s.effects.length, bound: s.effects.some(e => Object.keys(e.boundVariables ?? {}).length > 0) })),
};
```

For a large file, fetch one group per call by filtering `vars` with `v.name.startsWith(GROUP_PREFIX)`.

**Convention inference** — read the inventory before asking anything:

| Decision | Evidence in the file | When there is no evidence |
|----------|----------------------|---------------------------|
| Prefix | First segment of variable names (`prefixes`) | Ask |
| Collection layout | Collection names (token-spec.md §8) | Ask; propose the default three collections |
| Composite mode | Text Styles with bound fields; text nodes with bound typography (P3) | Styles mode |
| Spacing ladder | `sys/spacing/*` names and resolved values | Default ladder (token-spec.md §4-2) |
| Shape scale | `sys/shape/*` names and values | Default scale (token-spec.md §4-3) |
| State order and words | Comp names containing state words | M3 order with `hovered`, `focused` |
| Ref color category | `ref/palette/…` or `ref/color/…` | `ref/color/{hue}/{tone}` |
| Library tokens | `remote: true` variables, or bindings to remote variables (§8) | Local tokens |

---

## 3. P1 — Design guideline discovery

Document-level, read-only:

```js
const pages = figma.root.children.map(p => ({ id: p.id, name: p.name }));
const paint = await figma.getLocalPaintStylesAsync();
const text = await figma.getLocalTextStylesAsync();
const effect = await figma.getLocalEffectStylesAsync();
const guidePages = pages.filter(p => /guideline|style|brand|design ?system|foundation|principle|token|component/i.test(p.name));
return {
  pages, guidePages,
  counts: { paintStyles: paint.length, textStyles: text.length, effectStyles: effect.length },
  paintStyles: paint.map(s => ({ name: s.name, description: s.description })),
  textStyles: text.map(s => ({ name: s.name, font: s.fontName, size: s.fontSize })),
};
```

Then one call per guide page (and the page of the current scope) to count components:

```js
const page = await figma.getNodeByIdAsync(PAGE_ID);
await figma.setCurrentPageAsync(page);
const comps = page.findAllWithCriteria({ types: ['COMPONENT_SET', 'COMPONENT'] });
return { page: page.name, count: comps.length, sample: comps.slice(0, 40).map(c => ({ id: c.id, name: c.name, type: c.type })) };
```

Guidelines exist when paint styles ≥ 3, text styles ≥ 2, components ≥ 5, or a guide page exists.

---

## 4. P3 — Target inspection

Read-only. Walks the target (up to 400 nodes), never descends into instances, and reports each instance's main component.

```js
const ROOT_ID = '1:23', MAX = 400;
const root = await figma.getNodeByIdAsync(ROOT_ID);
let page = root;
while (page && page.type !== 'PAGE') page = page.parent;
await figma.setCurrentPageAsync(page);
const out = [];
const paints = list => (list === figma.mixed ? 'mixed' : list.filter(p => p.visible !== false).map(p =>
  p.type === 'SOLID' ? { hex: hex(p.color), opacity: r2(p.opacity ?? 1), boundTo: p.boundVariables?.color?.id ?? null } : { type: p.type }));
function walk(n, depth) {
  if (out.length >= MAX || n.visible === false) return;
  const e = { id: n.id, name: n.name, type: n.type, depth };
  if ('fills' in n) e.fills = paints(n.fills);
  if ('strokes' in n && n.strokes.length) Object.assign(e, { strokes: paints(n.strokes), strokeWeight: m(n.strokeWeight) });
  if ('topLeftRadius' in n) e.radius = [n.topLeftRadius, n.topRightRadius, n.bottomRightRadius, n.bottomLeftRadius];
  if ('layoutMode' in n && n.layoutMode !== 'NONE') Object.assign(e, { layout: n.layoutMode, padding: [n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft], gap: n.itemSpacing, counterGap: n.counterAxisSpacing, wrap: n.layoutWrap, align: n.primaryAxisAlignItems });
  if ('width' in n) Object.assign(e, { w: r2(n.width), h: r2(n.height), sizing: [n.layoutSizingHorizontal, n.layoutSizingVertical] });
  if ('opacity' in n && n.opacity < 1) e.opacity = r2(n.opacity);
  if ('effects' in n && n.effects.length) Object.assign(e, { effects: n.effects.filter(x => x.visible !== false).map(x => x.type), effectStyleId: n.effectStyleId || null });
  if (n.type === 'TEXT') Object.assign(e, { text: n.characters.slice(0, 40), font: m(n.fontName), size: m(n.fontSize), lineHeight: m(n.lineHeight), letterSpacing: m(n.letterSpacing), textStyleId: m(n.textStyleId) || null });
  if (n.boundVariables && Object.keys(n.boundVariables).length) e.bound = Object.keys(n.boundVariables);
  if (n.type === 'COMPONENT' && n.parent?.type === 'COMPONENT_SET') e.variant = n.variantProperties;
  out.push(e);
  if (n.type !== 'INSTANCE' && 'children' in n) for (const c of n.children) walk(c, depth + 1);
}
walk(root, 0);
for (const e of out.filter(x => x.type === 'INSTANCE')) {
  const main = await (await figma.getNodeByIdAsync(e.id)).getMainComponentAsync();
  e.main = main ? { id: main.id, name: main.name, remote: main.remote } : null;
}
return { page: page.name, truncated: out.length >= MAX, nodes: out };
```

When `truncated` is true, inspect the children of the root one at a time.

---

## 5. Comparing values before binding

Every planned binding compares the token's resolved value with the node's current value. Equal → appearance-neutral (Tier 1 or 2). Different → Tier 3, and the plan shows both values.

```js
// Rendered paint = hex + effective opacity (variable alpha or composed opacity × paint opacity).
const currentPaint = (node, prop, i) => { const p = node[prop][i]; return { hex: hex(p.color), opacity: r2(p.opacity ?? 1) }; };
const tokenPaint = (node, variable, paintOpacity = 1) => {
  const { value } = variable.resolveForConsumer(node);
  return { hex: hex(value), opacity: r2((value.a ?? 1) * paintOpacity) };
};
const samePaint = (a, b) => a.hex === b.hex && Math.abs(a.opacity - b.opacity) < 0.01;
// Numbers: layer-opacity variables hold 0–100, node.opacity holds 0–1.
const tokenNumber = (node, variable, prop) => { const { value } = variable.resolveForConsumer(node); return prop === 'opacity' ? value / 100 : value; };
const sameNumber = (a, b) => Math.abs(a - b) < 0.01;
```

Typography compares the text (or styled segment) with the planned Text Style or variables:

```js
const px = (u, size) => (u.unit === 'PIXELS' ? r2(u.value) : u.unit === 'PERCENT' ? r2((u.value / 100) * size) : 'AUTO');
const currentType = t => ({
  family: t.fontName.family, style: t.fontName.style, size: t.fontSize,
  lineHeight: px(t.lineHeight, t.fontSize), tracking: px(t.letterSpacing, t.fontSize),
});
const sameType = (a, b) => a.family === b.family && a.style === b.style && sameNumber(a.size, b.size)
  && (a.lineHeight === 'AUTO' ? b.lineHeight === 'AUTO' : sameNumber(a.lineHeight, b.lineHeight)) && sameNumber(a.tracking, b.tracking);
```

For the layer-opacity method (§7-1), compare the effective opacity (`paint opacity × layer opacity`) before and after, not the paint alone.

---

## 6. Creating collections, variables, and composed colors

The upsert never overwrites an existing variable: an existing variable with a different value is a conflict (changing it is Tier 3).

```js
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const byKey = new Map(vars.map(v => [`${v.variableCollectionId}|${v.name}`, v]));
const created = [], reused = [], conflicts = [], fallbacks = [];
const alias = v => figma.variables.createVariableAlias(v);
function collection(name, modes = ['Default']) {
  let c = cols.find(x => x.name === name);
  if (c) return c;
  c = figma.variables.createVariableCollection(name);
  c.renameMode(c.modes[0].modeId, modes[0]);
  for (const extra of modes.slice(1)) c.addMode(extra); // plan limit → "in addMode: Limited to N modes only"
  cols.push(c);
  return c;
}
```

```js
// valuesByMode: { Default: value } or { Light: value, Dark: value }
function upsert(c, name, type, valuesByMode, scopes, description) {
  const key = `${c.id}|${name}`;
  const pick = mode => valuesByMode[mode.name] ?? valuesByMode.Default ?? Object.values(valuesByMode)[0];
  const existing = byKey.get(key);
  if (existing) {
    const diff = c.modes.filter(mode => !sameValue(existing.valuesByMode[mode.modeId], pick(mode)));
    (diff.length ? conflicts : reused).push({ id: existing.id, name });
    return existing;
  }
  const v = figma.variables.createVariable(name, c, type);
  for (const mode of c.modes) v.setValueForMode(mode.modeId, pick(mode));
  v.scopes = scopes;
  v.setVariableCodeSyntax('WEB', webSyntax(name));
  if (description) v.description = description;
  byKey.set(key, v);
  created.push({ id: v.id, name });
  return v;
}
```

Composed color (method 1 of token-spec.md §7). There is no version flag, so the attempt happens inside the approved write; on failure the half-created variable is removed and the paint group falls back to method 2 or 3.

```js
function composed(c, name, colorVar, opacityVar, scopes) {
  const key = `${c.id}|${name}`;
  if (byKey.has(key)) { reused.push({ id: byKey.get(key).id, name }); return byKey.get(key); }
  const v = figma.variables.createVariable(name, c, 'COLOR');
  try {
    for (const mode of c.modes) v.setValueForMode(mode.modeId, { color: alias(colorVar), opacity: alias(opacityVar) });
    if (aliasRefs(v.valuesByMode[c.defaultModeId]).length < 2) throw new Error('composed value was not stored');
    v.scopes = scopes;
    v.setVariableCodeSyntax('WEB', webSyntax(name));
    byKey.set(key, v);
    created.push({ id: v.id, name });
    return v;
  } catch (e) {
    v.remove();
    fallbacks.push({ name, reason: String(e) });
    return null;
  }
}
```

The opacity variable used inside a composed color needs the `COLOR_OPACITY` scope (add `OPACITY` too when it is also bound to layers). End every creation script with `return { created, reused, conflicts, fallbacks };`.

---

## 7. Binding recipes

### 7-1 Solid fills and strokes

Always bind a **new** paint object seeded with the resolved color: binding does not update a paint's literal color, and an opacity set on a returned or cloned paint is lost.

```js
function bindPaint(node, prop, index, variable, paintOpacity = 1) {
  checkType(prop, variable);
  const old = node[prop][index];
  const { value } = variable.resolveForConsumer(node);
  const fresh = { type: 'SOLID', color: { r: value.r, g: value.g, b: value.b }, opacity: paintOpacity, visible: old.visible !== false, blendMode: old.blendMode ?? 'NORMAL' };
  const next = node[prop].slice();
  next[index] = figma.variables.setBoundVariableForPaint(fresh, 'color', variable);
  node[prop] = next;
}
```

Translucent paints (paint opacity below 1) use the first method that applies (token-spec.md §7):

```js
// PAINT = { nodeId, prop, index, composedId, baseId, opacityId, alphaChainId } — IDs from the creation step (null when absent)
const node = await figma.getNodeByIdAsync(PAINT.nodeId);
const get = id => (id ? figma.variables.getVariableByIdAsync(id) : null);
const [composedVar, baseVar, opacityVar, alphaVar] = await Promise.all([get(PAINT.composedId), get(PAINT.baseId), get(PAINT.opacityId), get(PAINT.alphaChainId)]);
const visible = list => (list ?? []).filter(x => x.visible !== false);
const leaf = !(('children' in node) && node.children.length) && visible(node.fills).length === 1 && !visible(node.strokes).length && !visible(node.effects).length && node.opacity === 1;
let method;
if (composedVar) { bindPaint(node, PAINT.prop, PAINT.index, composedVar, 1); method = 'composed'; }
else if (leaf && PAINT.prop === 'fills' && baseVar && opacityVar) { bindPaint(node, 'fills', PAINT.index, baseVar, 1); bind(node, 'opacity', opacityVar); method = 'layer-opacity'; }
else { bindPaint(node, PAINT.prop, PAINT.index, alphaVar, 1); method = 'alpha-color'; }
const p = node[PAINT.prop][PAINT.index];
return { nodeId: node.id, method, readBack: { hex: hex(p.color), paintOpacity: r2(p.opacity ?? 1), layerOpacity: r2(node.opacity) } };
```

### 7-2 Corner radius

```js
for (const k of ['topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius']) if (node[k] > 0) bind(node, k, radiusVar);
```

### 7-3 Padding and gaps

```js
for (const k of ['paddingLeft', 'paddingRight']) if (node[k] > 0) bind(node, k, horizontalVar);
for (const k of ['paddingTop', 'paddingBottom']) if (node[k] > 0) bind(node, k, verticalVar);
if (node.primaryAxisAlignItems !== 'SPACE_BETWEEN' && node.itemSpacing > 0) bind(node, 'itemSpacing', gapVar);
if (node.layoutWrap === 'WRAP' && node.counterAxisSpacing > 0) bind(node, 'counterAxisSpacing', rowGapVar);
```

Use the `inset` variable for all four paddings when they are equal. Grid layouts bind `gridRowGap` and `gridColumnGap` the same way.

### 7-4 Width and height

```js
const fixed = axis => !(`layoutSizing${axis}` in node) || node[`layoutSizing${axis}`] === 'FIXED';
if (heightVar && fixed('Vertical')) bind(node, 'height', heightVar);
if (widthVar && fixed('Horizontal')) bind(node, 'width', widthVar);
```

### 7-5 Stroke width

```js
if (node.strokeWeight !== figma.mixed) bind(node, 'strokeWeight', widthVar);
else for (const k of ['strokeTopWeight', 'strokeRightWeight', 'strokeBottomWeight', 'strokeLeftWeight']) if (node[k] > 0) bind(node, k, widthVar);
```

### 7-6 Layer opacity

```js
bind(node, 'opacity', opacityVar); // variable holds 0–100; node.opacity now reads value / 100
```

### 7-7 Typography — Styles mode

Create or reuse the Text Style, bind its fields, then apply it. If a style with the same name already exists and its values differ from the plan, stop: changing it is Tier 3.

```js
// TYPE = { styleName: 'label/large', font: { family: 'Roboto', style: 'Medium' }, ids: { font, weight, size, lineHeight, tracking, fontStyle } }
const v = id => (id ? figma.variables.getVariableByIdAsync(id) : null);
const [font, weight, size, lineHeight, tracking, fontStyle] = await Promise.all(['font', 'weight', 'size', 'lineHeight', 'tracking', 'fontStyle'].map(k => v(TYPE.ids[k])));
let style = (await figma.getLocalTextStylesAsync()).find(s => s.name === TYPE.styleName);
const isNew = !style;
if (isNew) { style = figma.createTextStyle(); style.name = TYPE.styleName; }
await figma.loadFontAsync(TYPE.font);
if (isNew) style.fontName = TYPE.font;
bind(style, 'fontFamily', font);
if (fontStyle) bind(style, 'fontStyle', fontStyle); else bind(style, 'fontWeight', weight);
bind(style, 'fontSize', size);
if (lineHeight) bind(style, 'lineHeight', lineHeight); // AUTO line height stays unbound
bind(style, 'letterSpacing', tracking);
return { styleId: style.id, isNew, readBack: { font: style.fontName, size: style.fontSize, lineHeight: style.lineHeight, letterSpacing: style.letterSpacing, bound: Object.keys(style.boundVariables ?? {}) } };
```

Apply the style (load every font in the node first; mixed nodes apply per styled segment with `setRangeTextStyleIdAsync(start, end, styleId)`):

```js
for (const id of TEXT_NODE_IDS) {
  const t = await figma.getNodeByIdAsync(id);
  await Promise.all(t.getRangeAllFontNames(0, t.characters.length).map(f => figma.loadFontAsync(f)));
  await t.setTextStyleIdAsync(STYLE_ID);
}
```

### 7-8 Typography — Variables mode

Binding on a node that uses a Text Style very likely detaches the style; such nodes are listed as Tier 2 in the plan. Ranges use `setRangeBoundVariable(start, end, field, variable)`; paragraph spacing and indent cannot be bound on ranges.

```js
const t = await figma.getNodeByIdAsync(TEXT_ID);
await Promise.all(t.getRangeAllFontNames(0, t.characters.length).map(f => figma.loadFontAsync(f)));
const hadStyle = m(t.textStyleId) !== '';
for (const [field, id] of Object.entries(COMP_IDS)) bind(t, field, await figma.variables.getVariableByIdAsync(id));
return { id: t.id, hadStyle, textStyleId: m(t.textStyleId), font: m(t.fontName), size: m(t.fontSize) };
```

`COMP_IDS` maps the node fields (`fontFamily`, `fontWeight`, `fontSize`, `lineHeight`, `letterSpacing`) to the Comp typography variable IDs.

### 7-9 Elevation — Effect Styles

Effect Styles have no `setBoundVariable`: build each shadow with its raw values, bind the fields, and assign `style.effects`. Binding has been reported to reset other fields (for example `spread`), so read every field back.

```js
// ELEV = { styleName: 'elevation/level1', layers: [{ type: 'DROP_SHADOW', raw: { color, x, y, blur, spread, showBehind }, ids: { color, x, y, blur, spread } }] }
let style = (await figma.getLocalEffectStylesAsync()).find(s => s.name === ELEV.styleName);
if (!style) { style = figma.createEffectStyle(); style.name = ELEV.styleName; }
const effects = [];
for (const l of ELEV.layers) {
  let e = { type: l.type, color: l.raw.color, offset: { x: l.raw.x, y: l.raw.y }, radius: l.raw.blur, spread: l.raw.spread, visible: true, blendMode: 'NORMAL' };
  if (l.type === 'DROP_SHADOW') e.showShadowBehindNode = l.raw.showBehind ?? false;
  for (const [field, key] of [['color', 'color'], ['offsetX', 'x'], ['offsetY', 'y'], ['radius', 'blur'], ['spread', 'spread']]) {
    const variable = await figma.variables.getVariableByIdAsync(l.ids[key]);
    checkType(field, variable);
    e = figma.variables.setBoundVariableForEffect(e, field, variable);
  }
  effects.push(e);
}
style.effects = effects;
return { styleId: style.id, readBack: style.effects.map(e => ({ x: e.offset.x, y: e.offset.y, blur: e.radius, spread: e.spread, alpha: r2(e.color.a), bound: Object.keys(e.boundVariables ?? {}) })) };
```

If a read-back field differs from the plan, rebuild that shadow with its raw values, bind once more, and read back again; if it still differs, report it. Apply the style with `await node.setEffectStyleIdAsync(STYLE_ID)`. In Variables mode, bind `node.effects` the same way (map each effect through `setBoundVariableForEffect` and assign the array back).

### 7-10 Instances

Never bind inside an instance. Bind its main component instead:

```js
const inst = await figma.getNodeByIdAsync(INSTANCE_ID);
const main = await inst.getMainComponentAsync();
if (!main) return { error: 'main component not found' };
if (main.remote) return { stop: 'main component comes from a library; change it in the library file' };
return { mainComponentId: main.id, name: main.name };
```

Instance-level overrides are bound only when the user explicitly asks for an override on that instance.

---

## 8. Library variables

Run after P3 with the variable IDs found in `boundVariables`:

```js
const remote = [];
for (const id of VARIABLE_IDS) {
  const v = await figma.variables.getVariableByIdAsync(id);
  if (v?.remote) remote.push({ id, name: v.name, key: v.key });
}
let libraryCollections = 'unavailable';
try {
  libraryCollections = (await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync()).map(c => ({ key: c.key, name: c.name, library: c.libraryName }));
} catch (e) { /* team library access is not available in this context */ }
return { remote, libraryCollections };
```

When the file uses library tokens, do not create local variables for the same roles. Import the ones that exist and bind them:

```js
const lib = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(COLLECTION_KEY);
const wanted = lib.find(v => v.name === VARIABLE_NAME);
const imported = wanted ? await figma.variables.importVariableByKeyAsync(wanted.key) : null;
return { importedId: imported?.id ?? null };
```

Tokens that do not exist in the library are listed for the user, who decides whether to add them in the library file or continue locally.

---

## 9. P5 — Validation

After every write batch:

1. Run the check below for the batch's bindings.
2. Re-run the harvest (value-harvest.md §2) or P3 on the scope: the only remaining hardcoded values must be the reported skips.
3. Call `get_screenshot` for every scope root and compare with the baseline taken before the first write.
4. Run the audit rules that cover the touched tokens (audit-rules.md).
5. Report every difference with node ID, property, expected value, and actual value — never correct a difference silently.

```js
// BINDINGS = [{ nodeId, prop, index, variableId, expected, withLayerOpacity }]
// expected: { hex, opacity } for paints; a number for other properties (layer opacity as 0–1)
const report = [];
for (const b of BINDINGS) {
  const node = await figma.getNodeByIdAsync(b.nodeId);
  if (!node) { report.push({ ...b, ok: false, reason: 'node not found' }); continue; }
  let boundId, actual;
  if (b.prop === 'fills' || b.prop === 'strokes') {
    const p = node[b.prop][b.index ?? 0];
    boundId = p?.boundVariables?.color?.id;
    const v = boundId ? await figma.variables.getVariableByIdAsync(boundId) : null;
    if (!v) { report.push({ ...b, ok: false, reason: 'paint not bound' }); continue; }
    const { value } = v.resolveForConsumer(node);
    actual = { hex: hex(value), opacity: r2((value.a ?? 1) * (p.opacity ?? 1) * (b.withLayerOpacity ? node.opacity : 1)) };
  } else {
    const bv = node.boundVariables?.[b.prop];
    boundId = Array.isArray(bv) ? bv[0]?.id : bv?.id;
    actual = b.prop === 'opacity' ? r2(node.opacity) : node[b.prop];
  }
  const same = typeof b.expected === 'object' ? actual.hex === b.expected.hex && Math.abs(actual.opacity - b.expected.opacity) < 0.01 : Math.abs(actual - b.expected) < 0.01;
  report.push({ nodeId: b.nodeId, prop: b.prop, ok: boundId === b.variableId && same, boundId, actual, expected: b.expected });
}
return { checked: report.length, failed: report.filter(r => !r.ok) };
```

Text Styles are validated by reading `textStyleId` on each text node and the style's fields (§7-7 read-back); Effect Styles by the §7-9 read-back.
