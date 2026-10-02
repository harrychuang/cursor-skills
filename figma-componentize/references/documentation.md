# Documentation — Generate the Design System Document

> Used by `figma-componentize` step 10 and by a document-only run (SKILL.md). It adds one frame that documents **every** local token and component of the file. It reads variables, styles, and components; it never creates, edits, or deletes them, and it never changes a layer outside the frame it generates.
> Scripts run through `use_figma` (pass `skillNames: "figma-componentize"`), sequentially, one page and one batch per call. Every result stays under 18,000 characters. Paste the helper block of §1 first in every script; the scripts of §6–§8 then take §12's `TEMPLATE` and §6's document helpers.

Contents

1. Rules and helpers
2. The two questions
3. Labels and fonts
4. Inventory
5. Scale confirmation
6. Page, root frame, and finishing
7. Foundations sections
8. Component sections and the icon grid
9. Batches, ledger, and recovery
10. An existing generated document
11. Verification and report
12. Template

---

## 1. Rules and helpers

1. **Opt-in**: nothing in this file runs unless the designer answered "yes" to the document question (§2), or asked only for the document.
2. **Additive**: the step adds a page or Section, one root frame, and its sections. Samples of components are instances; never clone a main component or a component set.
3. **Facts only**: the document shows what the file holds — names, values, variants, properties, bound tokens, and the designer's own component descriptions. Never write usage guidance, descriptions, or recommendations, and never translate text that comes from the file.
4. **Samples are bound**: a swatch, bar, radius shape, text sample, or shadow card is bound to its variable or uses its style. Never fill a sample with a hardcoded value in place of a binding.
5. **Names identify generated content**. They are always in English, whatever the document language:

| Layer | Name |
|-------|------|
| Page, or the fallback Section | `Design System` |
| Root frame | `Design System — generated` |
| Cover (first child of the root) | `DS / Header`, with the contents row `DS contents` |
| Part header | `DS / Part / Foundations`, `DS / Part / Components` |
| Section | `DS / …`, for example `DS / Color`, `DS / Typography`, `DS / Icons`, `DS / Component / Button (40:9)` |
| Collection block inside `DS / Color` | `DS collection / {collection name}` |
| Group inside a section or block | `DS group / {path}` |
| Item | `DS item / {source ID}` |
| Footer (last child of the root) | `DS / Footer` |

Helper block for every script in this file:

```js
const ROOT_NAME = 'Design System — generated';
const get = id => figma.getNodeByIdAsync(id);
const r2 = v => Math.round(v * 100) / 100;
const hex = c => '#' + [c.r, c.g, c.b].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
function fit(list, offset = 0, budget = 16000) { // keeps each returned page under the 20 kB use_figma limit
  const items = [];
  let size = 0;
  for (let i = offset; i < list.length; i++) {
    const s = JSON.stringify(list[i]).length + 1;
    if (items.length && size + s > budget) return { total: list.length, offset, nextOffset: i, items };
    items.push(list[i]);
    size += s;
  }
  return { total: list.length, offset, nextOffset: null, items };
}
function coverFont(text) { // the font for file text that the document font may lack; null when none is needed
  if (/[぀-ヿ]/.test(text)) return 'Noto Sans JP';
  if (/[ᄀ-ᇿ가-힯]/.test(text)) return 'Noto Sans KR';
  if (/[㐀-鿿豈-﫿]/.test(text)) return 'Noto Sans TC';
  return null;
}
```

---

## 2. The two questions

| Question | When | Options | Recorded as |
|----------|------|---------|-------------|
| "Generate a design system document at the end?" | After the scope is confirmed, before detection (detection.md §2). Not asked in a document-only run: the request is the opt-in | **Yes** · **No** | `doc.wanted` |
| "Which language for the document's headings and labels?" | Right after a **Yes**; in a document-only run, before the inventory. Asked in every run that generates the document | **English** (default) · **繁體中文** · another language the designer names | `doc.language` |

- **No**: no inventory, no write, and no document part in the report. Do not ask again in this run.
- **Yes**: the plan lists the document step in its Tier 2 summary (detection.md §12). The document is generated even when the designer later declines the token step or answers **Not now** to the replacement, because the components exist by then.
- No preference for the language ("default", "either") means English.

**Document-only run.** When the designer asks only for the document to be generated or updated, nothing of the componentization runs:

1. Check the two prerequisites it needs: a write-capable `use_figma` tool and the `figma-use` skill (detection.md §1). figma-m3-variables Workflow F is not required.
2. Ask the language. The request itself is the opt-in, so the first question is not asked.
3. Ask the designer to save a restore point, as in build-recipes.md §2, named "Before figma-componentize — design system document", and wait for the answer.
4. Run §3 to §11 of this file, then report (§11).

---

## 3. Labels and fonts

Only text this skill produces follows the chosen language.

| Follows the language | Stays exactly as in the file |
|----------------------|------------------------------|
| The cover labels and counts, part and section headings, field labels, the notes, the link text, notes such as "+3 more", the footer | Token, collection, and mode names and values; component, variant, and property names and values; the component description text |

Layer names (§1) and the page name stay in English in every language, because generated content is recognised by them.

**Labels.** Every heading and label comes from `LABELS`, an object with the 42 keys below — the cover, the part and section headings, the field names, the notes, and the footer. The scripts contain no heading or label text of their own. Pass one of these two objects, or, for another language, translate the same keys before the first write.

```json
{
  "title": "Design System",
  "generated": "Generated {date}",
  "contents": "Contents",
  "foundations": "Foundations",
  "components_part": "Components",
  "color": "Color",
  "color_styles": "Color styles",
  "typography": "Typography",
  "spacing": "Spacing & size",
  "radius": "Radius",
  "elevation": "Elevation",
  "other": "Other tokens",
  "icons": "Icons",
  "stat_tokens": "Tokens",
  "stat_styles": "Styles",
  "stat_components": "Components",
  "stat_icons": "Icons",
  "n_tokens": "{n} tokens",
  "n_styles": "{n} styles",
  "n_components": "{n} components",
  "n_icons": "{n} icons",
  "kind_set": "Component set",
  "kind_component": "Component",
  "variants_count": "{n} variants",
  "variants_one": "1 variant",
  "page": "Page: {name}",
  "open_main": "Open main component",
  "variants": "Variants",
  "properties": "Properties",
  "prop_name": "Name",
  "prop_type": "Type",
  "prop_default": "Default",
  "prop_options": "Options",
  "tokens": "Tokens",
  "token": "Token",
  "more": "+{n} more",
  "effects": "{n} effects",
  "modes_more": "Showing 4 of {n} modes",
  "no_font": "Font not available",
  "note_regenerate": "Samples are bound to the tokens and follow them. Names and values in text are a snapshot: regenerate this document after tokens change.",
  "note_own": "Keep your own notes outside this frame, or write them in the component description field.",
  "footer": "Generated by figma-componentize"
}
```

```json
{
  "title": "設計系統",
  "generated": "產生日期 {date}",
  "contents": "目錄",
  "foundations": "基礎",
  "components_part": "元件",
  "color": "顏色",
  "color_styles": "顏色樣式",
  "typography": "文字樣式",
  "spacing": "間距與尺寸",
  "radius": "圓角",
  "elevation": "陰影",
  "other": "其他 tokens",
  "icons": "圖示",
  "stat_tokens": "Tokens",
  "stat_styles": "樣式",
  "stat_components": "元件",
  "stat_icons": "圖示",
  "n_tokens": "{n} 個 tokens",
  "n_styles": "{n} 個樣式",
  "n_components": "{n} 個元件",
  "n_icons": "{n} 個圖示",
  "kind_set": "Component set",
  "kind_component": "元件",
  "variants_count": "{n} 個 variants",
  "variants_one": "1 個 variant",
  "page": "頁面：{name}",
  "open_main": "開啟主元件",
  "variants": "Variants",
  "properties": "屬性",
  "prop_name": "名稱",
  "prop_type": "類型",
  "prop_default": "預設值",
  "prop_options": "選項",
  "tokens": "使用的 tokens",
  "token": "Token",
  "more": "另有 {n} 個",
  "effects": "{n} 個效果",
  "modes_more": "僅顯示 {n} 個 modes 中的 4 個",
  "no_font": "字型無法載入",
  "note_regenerate": "樣本綁定 token，會跟著 token 變。文字中的名稱與數值是產生當下的快照：token 改動後請重新產生這份文件。",
  "note_own": "自己的說明請放在這個外框之外，或寫在元件的描述欄位。",
  "footer": "由 figma-componentize 產生"
}
```

**Document font.** The font follows the language.

| Language | Document font |
|----------|---------------|
| English, and other languages written in Latin, Cyrillic, or Greek script (Français, Deutsch, Русский) | Inter |
| 繁體中文 | Noto Sans TC |
| 简体中文 | Noto Sans SC |
| 日本語 | Noto Sans JP |
| 한국어 | Noto Sans KR |
| Any other script (Arabic, Hebrew, Thai, Devanagari, …) | A font the designer names |

```js
function fontFor(language) { // the document font for a language; null = ask the designer for a font
  const l = String(language).toLowerCase();
  if (/繁體|繁体|traditional chinese|zh-hant|zh-tw|zh-hk/.test(l)) return 'Noto Sans TC';
  if (/简体|簡體|simplified chinese|zh-hans|zh-cn/.test(l)) return 'Noto Sans SC';
  if (/日本語|japanese|^ja\b/.test(l)) return 'Noto Sans JP';
  if (/한국어|korean|^ko\b/.test(l)) return 'Noto Sans KR';
  if (/arabic|hebrew|thai|hindi|bengali|tamil|العربية|עברית|ไทย|हिन्दी/.test(l)) return null;
  return 'Inter';
}
```

**Font check.** Run it before the first write. It writes nothing. The template uses four weights (§12); the check tries the candidate style names of each weight in order and returns the names that load. A missing weight falls back to the nearest one, and the font is unusable only when Regular cannot be loaded.

| Weight | Candidate style names, in order |
|--------|---------------------------------|
| regular | Regular |
| medium | Medium, Regular |
| semibold | Semi Bold, SemiBold, Semibold, Bold, Regular |
| bold | Bold, Semi Bold, SemiBold, Regular |

```js
const FAMILY = 'Noto Sans TC';
const CANDIDATES = { regular: ['Regular'], medium: ['Medium', 'Regular'], semibold: ['Semi Bold', 'SemiBold', 'Semibold', 'Bold', 'Regular'], bold: ['Bold', 'Semi Bold', 'SemiBold', 'Regular'] };
const tried = {};
const loads = style => tried[style] || (tried[style] = figma.loadFontAsync({ family: FAMILY, style }).then(() => true, () => false));
const styles = {};
for (const [weight, names] of Object.entries(CANDIDATES)) for (const style of names) if (await loads(style)) { styles[weight] = style; break; }
return { ok: styles.regular === 'Regular', family: FAMILY, styles };
```

- `ok: true`: pass `FONT = family` and `STYLES = styles` to the scripts of §6–§8. Record them as `doc.font` and `doc.fontStyles`. Letter spacing (§12) applies only to text set in Inter; text in any other font, including a covering font for file text, has none.
- `ok: false`: write nothing and ask the designer: **English headings with the default font** · **Another font** (the designer names it; check it the same way) · **Skip the document**.

**Text from the file** (names and descriptions) can contain characters the document font lacks, such as a Chinese description in an English document. `coverFont` (§1) picks the font for such text: Noto Sans JP when it contains kana, Noto Sans KR when it contains hangul, otherwise Noto Sans TC for Han characters. When that font cannot be loaded, the text is still written in the document font, and the scripts return it in `uncovered`; list those items in the report.

---

## 4. Inventory

Read-only. Run it before any write for the document, and keep its totals as `doc.counts` (§9): the verification compares them afterwards (§11).

**Tokens and styles** (file level, no page needed):

```js
const MODE = 'summary';     // 'summary' | 'variables' | 'styles'
const COLLECTION_ID = null; // for 'variables'
const KIND = 'text';        // for 'styles': 'text' | 'effect' | 'paint'
const OFFSET = 0;
const collections = await figma.variables.getLocalVariableCollectionsAsync();
const variables = await figma.variables.getLocalVariablesAsync();
const byId = new Map(variables.map(v => [v.id, v])), colOf = new Map(collections.map(c => [c.id, c]));
const show = v => (v && typeof v === 'object' && 'r' in v ? hex(v) + (v.a !== undefined && v.a < 1 ? `@${r2(v.a)}` : '') : typeof v === 'number' ? r2(v) : v);
function resolve(v, modeName, hops = 0) { // follows aliases; a target in a collection without that mode name uses its default mode
  if (!v || v.type !== 'VARIABLE_ALIAS' || hops > 10) return show(v);
  const t = byId.get(v.id), c = t && colOf.get(t.variableCollectionId);
  if (!t || !c) return null; // a library variable
  const mode = c.modes.find(m => m.name === modeName) || c.modes.find(m => m.modeId === c.defaultModeId) || c.modes[0];
  return resolve(t.valuesByMode[mode.modeId], modeName, hops + 1);
}
if (MODE === 'summary') {
  const [text, effect, paint] = await Promise.all([figma.getLocalTextStylesAsync(), figma.getLocalEffectStylesAsync(), figma.getLocalPaintStylesAsync()]);
  const rows = collections.map(c => {
    const own = variables.filter(v => v.variableCollectionId === c.id), counts = {};
    for (const v of own) counts[v.resolvedType] = (counts[v.resolvedType] || 0) + 1;
    return { id: c.id, name: c.name, modes: c.modes.map(m => m.name), variables: own.length, counts };
  });
  return { variables: variables.length, styles: { text: text.length, effect: effect.length, paint: paint.length }, ...fit(rows, OFFSET) };
}
if (MODE === 'variables') {
  const c = colOf.get(COLLECTION_ID);
  if (!c) return { error: 'collection not found' };
  const rows = variables.filter(v => v.variableCollectionId === c.id).sort((a, b) => a.name.localeCompare(b.name)).map(v => ({
    id: v.id, name: v.name, type: v.resolvedType, scopes: v.scopes,
    values: Object.fromEntries(c.modes.map(m => { const raw = v.valuesByMode[m.modeId], alias = raw && raw.type === 'VARIABLE_ALIAS';
      return [m.name, alias ? { value: resolve(raw, m.name), alias: (byId.get(raw.id) || {}).name || raw.id } : { value: show(raw) }]; })),
  }));
  return { collection: c.name, ...fit(rows, OFFSET) };
}
const lh = s => (s.lineHeight && s.lineHeight.unit !== 'AUTO' ? `${r2(s.lineHeight.value)}${s.lineHeight.unit === 'PERCENT' ? '%' : ''}` : 'Auto'); // Auto is Figma's own value name
const list = KIND === 'text' ? await figma.getLocalTextStylesAsync() : KIND === 'effect' ? await figma.getLocalEffectStylesAsync() : await figma.getLocalPaintStylesAsync();
return fit(list.map(s => ({ id: s.id, name: s.name,
  spec: KIND === 'text' ? `${s.fontName.family} ${s.fontName.style} · ${r2(s.fontSize)} / ${lh(s)}` : KIND === 'effect' ? String(s.effects.length) : (s.paints[0] && s.paints[0].color ? hex(s.paints[0].color) : (s.paints[0] || {}).type || '—') })), OFFSET);
```

| `MODE` | Returns |
|--------|---------|
| `summary` | `variables` (total), `styles` (`text`, `effect`, `paint` counts), and one row per collection: `id`, `name`, `modes`, `variables`, `counts` per type |
| `variables` | The variables of `COLLECTION_ID`, sorted by name: `id`, `name`, `type`, `scopes`, and `values` per mode name — `value` (resolved: hex with `@alpha`, number, string, or boolean; `null` for a library variable) and `alias` (the target's name) when it is an alias |
| `styles` | The styles of `KIND`: `id`, `name`, and `spec` — for `text`, font, size, and line height (`Inter Bold · 57 / 64`); for `effect`, the number of effects; for `paint`, the first paint's hex or type |

**Components** (one page per call). First list the pages, then run the inventory on every page: components can live on any of them.

```js
return figma.root.children.map(p => ({ id: p.id, name: p.name }));
```

```js
const PAGE_ID = '0:5', OFFSET = 0;
const page = await get(PAGE_ID);
await figma.setCurrentPageAsync(page);
const inDocument = n => { for (let p = n.parent; p && p.type !== 'PAGE'; p = p.parent) if (p.name === ROOT_NAME) return true; return false; };
const isIcon = (name, variants) => variants.every(v => v.width <= 48 && v.height <= 48 && (Math.abs(v.width - v.height) < 1 || /icon/i.test(name)));
const rows = [];
for (const n of page.findAllWithCriteria({ types: ['COMPONENT_SET', 'COMPONENT'] })) {
  if (n.type === 'COMPONENT' && n.parent && n.parent.type === 'COMPONENT_SET') continue; // counted with its set
  if (inDocument(n)) continue;
  const variants = n.type === 'COMPONENT_SET' ? n.children.filter(c => c.type === 'COMPONENT') : [n];
  rows.push({ id: n.id, name: n.name, kind: n.type === 'COMPONENT_SET' ? 'set' : 'component', variants: variants.length, icon: isIcon(n.name, variants), page: page.name });
}
return fit(rows, OFFSET);
```

A component is an **icon** when every variant is at most 48 px wide and 48 px tall and is either square (width and height differ by less than 1 px) or has a name containing "icon". Icons go to the icon grid (§8), not to sections of their own.

| Node | Listed as |
|------|-----------|
| Component set `Button`, variants 96 × 40 | `kind: 'set'`, `icon: false` |
| Component `Icon/Star`, 24 × 24 | `icon: true` |
| Component `Avatar`, 40 × 40 | `icon: true` (square, not larger than 48 px) |
| Component set `Badge`, variants 32 × 20 and 44 × 20 | `icon: false` (not square, no "icon" in the name) |
| Component `icon-button`, 56 × 56 | `icon: false` (larger than 48 px) |
| Component inside `Design System — generated` | Not listed |

Nothing to document:

- No tokens **and** no components: create nothing, and report that there is nothing to document.
- Only one of the two: omit the other part, and say so in the report.

---

## 5. Scale confirmation

Tell the designer the counts and the estimated number of write calls, then decide whether to ask.

```js
function scale(counts) { // counts: { variables, styles, components, icons } — components: the non-icon ones
  const tokens = counts.variables + counts.styles; // every variable and every style is one item
  const calls = 1 + Math.ceil(tokens / 20) + counts.components + Math.ceil(counts.icons / 40) + 1; // the root frame, the batches, the finishing call
  return { tokens, calls, ask: tokens > 300 || counts.components > 40 || calls > 60 };
}
```

- `ask: false`: proceed.
- `ask: true` (more than 300 variables and styles together, more than 40 non-icon components, or more than 60 write calls): ask before writing — **Generate everything** · **Foundations only** · **Components only** · **Skip the document**.

---

## 6. Page, root frame, and finishing

**Page.** Use an existing page whose name contains "design system" or "設計系統" (any case, emoji and prefixes ignored); otherwise one whose name contains "foundation"; otherwise create `Design System` as the last page (Tier 2).

```js
const docPageOf = pages => pages.find(p => /design\s*system|設計系統/i.test(p.name)) || pages.find(p => /foundation/i.test(p.name)) || null; // pages: [{ id, name }] in page order
const found = docPageOf(figma.root.children);
if (found) return { pageId: found.id, name: found.name, created: false };
try {
  const page = figma.createPage(); // a new page is added after the last one
  page.name = 'Design System';
  return { pageId: page.id, name: page.name, created: true };
} catch (e) {
  return { pageId: null, created: false, error: String(e), pageLimit: /only comes with 3 pages/i.test(String(e)) };
}
```

| Existing pages (in order) | Result |
|---------------------------|--------|
| Cover, Components, Home | New page `Design System`, last in the list |
| Cover, 🎨 Design System, Components | Uses "🎨 Design System" |
| Foundations, Components | Uses "Foundations" |
| 設計系統, Components | Uses "設計系統" |
| Foundations, Design System Document, Components | Uses "Design System Document" ("design system" comes before "foundation") |
| Home, Components, Archive, and creation fails with the page limit | `pageLimit: true` |

For the plan (detection.md §12), name the target page without writing: apply the same rule to the page names — an existing page, or "a new page `Design System`". The page limit only shows when the page is created.

- `pageLimit: true` (Starter plan: 3 pages per file): ask which existing page is to hold the document, and write nothing until the designer answers. Then create the host Section with the script below.
- Any other `error`: stop the document step, report the error, and leave the earlier steps' results as they are.

```js
const PAGE_ID = '0:1';
const page = await get(PAGE_ID);
await figma.setCurrentPageAsync(page);
const host = figma.createSection();
host.name = 'Design System';
host.x = page.children.filter(n => n.id !== host.id).reduce((x, n) => Math.max(x, n.x + n.width), 0) + 400;
host.y = 0;
return { pageId: page.id, hostSectionId: host.id };
```

**Document helpers.** Every script of §6–§8 is assembled in this order: §1's helper block, §12's `TEMPLATE` block, the block below, then the script itself. `LABELS`, `FONT`, and `STYLES` are the script's inputs (§3). The helpers take every color, text level, radius, space, and size from `TEMPLATE`; no script of §6–§8 has a color value or a font size of its own.

```js
const C = TEMPLATE.color, T = TEMPLATE.type, S = TEMPLATE.size, SP = TEMPLATE.space, R = TEMPLATE.radius;
const rgbOf = hx => ({ r: parseInt(hx.slice(1, 3), 16) / 255, g: parseInt(hx.slice(3, 5), 16) / 255, b: parseInt(hx.slice(5, 7), 16) / 255 });
const solid = (hx, opacity = 1) => [{ type: 'SOLID', color: rgbOf(hx), opacity }];
const fontOf = weight => ({ family: FONT, style: STYLES[weight] || STYLES.regular });
const docFonts = () => [...new Set(Object.values(STYLES))].map(style => ({ family: FONT, style }));
const cover = {}, uncovered = [];
const L = (key, vars = {}) => String(LABELS[key] ?? key).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
async function fileFont(chars, weight) { // text taken from the file: a covering font when the document font lacks its characters
  const family = coverFont(chars);
  if (!family || family === FONT) return fontOf(weight);
  if (!(family in cover)) cover[family] = await figma.loadFontAsync({ family, style: 'Regular' }).then(() => true, () => false);
  if (cover[family]) return { family, style: 'Regular' };
  uncovered.push(String(chars).slice(0, 40));
  return fontOf(weight);
}
function text(chars, level, { weight = null, color = 'ink', font = null } = {}) { // one of the seven text levels; fonts must be loaded
  const lv = T[level], t = figma.createText();
  t.fontName = font || fontOf(weight || lv.weight);
  t.fontSize = lv.size;
  t.lineHeight = { value: lv.lineHeight, unit: 'PIXELS' };
  t.letterSpacing = { value: t.fontName.family === 'Inter' ? lv.tracking : 0, unit: 'PERCENT' }; // letter spacing only in Inter
  t.characters = String(chars);
  t.fills = solid(C[color]);
  return t;
}
const fileText = async (chars, level, opts = {}) => text(chars, level, { ...opts, font: await fileFont(chars, opts.weight || T[level].weight) });
function stack(name, dir = 'VERTICAL', gap = 0) {
  const f = figma.createFrame();
  f.name = name; f.layoutMode = dir; f.itemSpacing = gap; f.fills = [];
  f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'AUTO';
  return f;
}
function add(parent, node, stretch = false) { // stretch: fill the parent's width; a text then wraps
  parent.appendChild(node);
  if (stretch) { node.layoutSizingHorizontal = 'FILL'; if (node.type === 'TEXT') node.textAutoResize = 'HEIGHT'; }
  return node;
}
function width(n, w) { // a fixed width; the height still follows the content
  n.resize(w, Math.max(1, n.height));
  if (n.type === 'TEXT') n.textAutoResize = 'HEIGHT';
  else if (n.layoutMode && n.layoutMode !== 'NONE') n.layoutSizingVertical = 'HUG';
  return n;
}
const pad = (f, top, right = 0, bottom = 0, left = right) => Object.assign(f, { paddingTop: top, paddingRight: right, paddingBottom: bottom, paddingLeft: left });
function hairline(f, side = 'top') { // a 1 px Line on one side only
  Object.assign(f, { strokes: solid(C.line), strokeAlign: 'INSIDE', strokeTopWeight: side === 'top' ? 1 : 0, strokeBottomWeight: side === 'bottom' ? 1 : 0, strokeLeftWeight: 0, strokeRightWeight: 0 });
  return f;
}
const innerLine = n => Object.assign(n, { strokes: solid(C.inner.hex, C.inner.opacity), strokeAlign: 'INSIDE', strokeWeight: 1 });
function baseline(f) { try { f.counterAxisAlignItems = 'BASELINE'; } catch (e) { f.counterAxisAlignItems = 'MIN'; } return f; }
function spread(name, top = 0) { // a row with one item at each end, on the text baseline
  const row = pad(stack(name, 'HORIZONTAL', SP.inner), top);
  row.primaryAxisAlignItems = 'SPACE_BETWEEN';
  return baseline(row);
}
async function pill(chars) {
  const p = pad(stack('pill', 'HORIZONTAL'), S.pill.y, S.pill.x, S.pill.y, S.pill.x);
  p.fills = solid(C.panel);
  p.cornerRadius = R.pill;
  add(p, await fileText(chars, 'caption', { weight: 'medium', color: 'ink2' }));
  return p;
}
const PARTS = { foundations: ['DS / Part / Foundations', 'foundations'], components: ['DS / Part / Components', 'components_part'] };
const child = (root, name) => root.children.find(c => c.name === name);
function place(root, node, part) { // keeps the order: cover, Foundations, Components, footer
  const anchor = (part === 'foundations' && child(root, PARTS.components[0])) || child(root, 'DS / Footer');
  if (anchor) root.insertChild(root.children.indexOf(anchor), node); else root.appendChild(node);
  node.layoutSizingHorizontal = 'FILL';
  return node;
}
function partOf(root, part, summary = '') { // the part header, created before the part's first section
  const [name, key] = PARTS[part];
  let p = child(root, name);
  if (p) return p;
  p = spread(name, TEMPLATE.frame.partTop);
  const header = child(root, 'DS / Header');
  if (part === 'foundations') { root.insertChild(header ? root.children.indexOf(header) + 1 : 0, p); p.layoutSizingHorizontal = 'FILL'; }
  else place(root, p, part);
  add(p, text(L(key), 'title'));
  if (summary) add(p, text(summary, 'callout', { color: 'ink2' }));
  return p;
}
async function sectionOf(root, name, part, title, count = '') { // found by name, so a batch can be run again
  let s = child(root, name);
  if (s) return s;
  partOf(root, part);
  s = place(root, stack(name, 'VERTICAL', SP.block), part);
  const head = add(s, hairline(spread('DS head', SP.sectionTop)), true);
  add(head, await fileText(title, 'headline'));
  if (count) add(head, text(count, 'callout', { color: 'ink2' }));
  return s;
}
function footerOf(root, date) {
  let f = child(root, 'DS / Footer');
  if (f) return f;
  f = pad(stack('DS / Footer', 'VERTICAL'), TEMPLATE.frame.partTop);
  root.appendChild(f);
  f.layoutSizingHorizontal = 'FILL';
  const row = add(f, hairline(spread('row', SP.sectionTop)), true);
  add(row, text(`${L('footer')} · ${date}`, 'caption', { color: 'ink3' }));
  add(row, text(ROOT_NAME, 'caption', { color: 'ink3' }));
  return f;
}
const itemName = id => `DS item / ${id}`;
const hasItem = (scope, id) => !!scope.findOne(n => n.name === itemName(id));
```

**Root frame.** One frame named exactly `Design System — generated`, with the template's frame: 1440 px wide, 120 px padding on every side, 64 px between its children, Paper white. On a new page it sits at the origin; on an existing page, or inside the host Section, 400 px to the right of the rightmost existing node. Nothing that is already there is moved, renamed, restyled, or deleted.

The first call writes the cover, the part headers of the parts that will have sections, and the footer. The children of the root stay flat — cover, part headers, sections, footer — and the part headers and the footer carry 56 px of top padding, so a part starts 120 px after the content above it.

| Cover | Content |
|-------|---------|
| Title group | The `title` label (Body, Semibold, Ink 2), the file name (Display), the `generated` label with the date (Body, Ink 2) |
| Counts | A hairline on top; four equal columns: the number (Title) and its `stat_tokens`, `stat_styles`, `stat_components`, or `stat_icons` label (Callout, Ink 2) |
| Notes | `note_regenerate` and `note_own` side by side (Caption, Ink 2) |
| Contents | Written by the finishing call below |

```js
const PAGE_ID = '0:9', HOST_ID = null; // HOST_ID: the fallback Section, when the page limit was hit
const DATE = '2026-10-02', COUNTS = { tokens: 210, styles: 12, components: 12, icons: 180 }; // from §4: variables; Text, Effect, and Paint Styles; non-icon components; icons
const PARTS_WANTED = ['foundations', 'components']; // the parts that will have sections (§4, §5)
const LABELS = {}, FONT = 'Inter', STYLES = { regular: 'Regular', medium: 'Medium', semibold: 'Semi Bold', bold: 'Bold' }; // from §3
const page = await get(PAGE_ID);
await figma.setCurrentPageAsync(page);
const host = HOST_ID ? await get(HOST_ID) : page;
await Promise.all(docFonts().map(f => figma.loadFontAsync(f)));
const others = host.children.slice(), F = TEMPLATE.frame;
const root = pad(stack(ROOT_NAME, 'VERTICAL', F.gap), F.padding, F.padding, F.padding, F.padding);
root.fills = solid(C.paper);
host.appendChild(root);
root.resize(F.width, 200);
root.primaryAxisSizingMode = 'AUTO';
root.counterAxisSizingMode = 'FIXED';
root.x = others.length ? Math.max(...others.map(n => n.x + n.width)) + 400 : HOST_ID ? 40 : 0;
root.y = HOST_ID ? 40 : 0;
```

```js
const header = add(root, stack('DS / Header', 'VERTICAL', SP.cover), true);
const top = add(header, stack('title', 'VERTICAL', SP.inner), true);
add(top, text(L('title'), 'body', { weight: 'semibold', color: 'ink2' }), true);
add(top, await fileText(figma.root.name, 'display'), true);
add(top, text(L('generated', { date: DATE }), 'body', { color: 'ink2' }), true);
const stats = add(header, hairline(pad(stack('counts', 'HORIZONTAL', S.statsGap), SP.statsTop)), true);
for (const key of ['tokens', 'styles', 'components', 'icons']) {
  const cell = add(stats, stack(key, 'VERTICAL', SP.stat));
  cell.layoutGrow = 1;
  add(cell, text(String(COUNTS[key]), 'title'));
  add(cell, text(L(`stat_${key}`), 'callout', { color: 'ink2' }));
}
const notes = add(header, stack('notes', 'HORIZONTAL', S.notesGap), true);
for (const key of ['note_regenerate', 'note_own']) { const n = add(notes, text(L(key), 'caption', { color: 'ink2' })); n.layoutGrow = 1; n.textAutoResize = 'HEIGHT'; }
if (PARTS_WANTED.includes('foundations')) partOf(root, 'foundations', `${L('n_tokens', { n: COUNTS.tokens })} · ${L('n_styles', { n: COUNTS.styles })}`);
if (PARTS_WANTED.includes('components')) partOf(root, 'components', `${L('n_components', { n: COUNTS.components })} · ${L('n_icons', { n: COUNTS.icons })}`);
const footer = footerOf(root, DATE);
return { rootId: root.id, pageId: page.id, headerId: header.id, footerId: footer.id, at: { x: root.x, y: root.y }, uncovered };
```

Every section of §7 and §8 is placed by `place`: a Foundations section goes before the Components part header, a Components section before the footer. The part header is created before the part's first section when it is missing, so the order stays right even when a batch is run again. When the designer chose **Foundations only** or **Components only** (§5), leave the other part out of `PARTS_WANTED`; its header never appears.

**Finishing.** After the last batch of §7 and §8, run this call once. It builds the contents row of the cover — one link per section, in the frame's order, labelled with the section's heading and linked to the section node — and creates the footer when it is missing. It can be run again: it first removes the contents row it built before. Record `doc.finished: true` when it returns.

```js
const ROOT_ID = '70:1', DATE = '2026-10-02';
const LABELS = {}, FONT = 'Inter', STYLES = { regular: 'Regular', medium: 'Medium', semibold: 'Semi Bold', bold: 'Bold' };
const root = await get(ROOT_ID);
if (!root || root.name !== ROOT_NAME) return { error: 'document not found' };
let page = root;
while (page.type !== 'PAGE') page = page.parent;
await figma.setCurrentPageAsync(page);
await Promise.all(docFonts().map(f => figma.loadFontAsync(f)));
const header = child(root, 'DS / Header');
const old = header && header.findOne(n => n.name === 'DS contents');
if (old) old.remove();
const sections = root.children.filter(c => c.name.startsWith('DS / ') && !['DS / Header', 'DS / Footer'].includes(c.name) && !c.name.startsWith('DS / Part / '));
const contents = [];
if (header && sections.length) {
  const row = add(header, hairline(pad(stack('DS contents', 'HORIZONTAL', S.contentsGap.column), SP.sectionTop)), true);
  row.layoutWrap = 'WRAP';
  row.counterAxisSpacing = S.contentsGap.row;
  add(row, text(L('contents'), 'callout', { weight: 'semibold' }));
  for (const s of sections) {
    const title = (s.findOne(n => n.type === 'TEXT') || { characters: s.name }).characters;
    const link = add(row, await fileText(`${title} ›`, 'callout', { color: 'link' }));
    link.hyperlink = { type: 'NODE', value: s.id };
    contents.push({ name: title, nodeId: s.id });
  }
}
const footer = footerOf(root, DATE);
return { contents, footerId: footer.id, uncovered };
```

When the frame has no section, the call builds no contents row, creates only the footer, and the report says so.

---

## 7. Foundations sections

Every local token is shown once. The file's own layers — Reference, System, Component, or whatever it uses — are shown as they are; nothing is reclassified. All color variables share one `DS / Color` section with one block per collection; in every other section, and inside each collection block, tokens are grouped by their group path (the name without its last segment).

| `kind` | Source | Section (layer name) | Heading | Sample |
|--------|--------|----------------------|---------|--------|
| `color` | COLOR variable | `DS / Color`, block `DS collection / {collection}` | `color`; the block shows the collection name (Subhead) and, with several modes, one pill per mode | A swatch card whose chip is bound to the variable: one cell per mode, each with that mode set explicitly — four at most, with a note when there are more |
| `paint` | Paint Style | `DS / Color styles` | `color_styles` | A swatch card whose chip uses the style |
| `text` | Text Style | `DS / Typography` | `typography` | A row: name and specification on the left, a sample that uses the style on the right |
| `bar` | FLOAT variable whose scopes include `GAP` or `WIDTH_HEIGHT` | `DS / Spacing & size` | `spacing` | A row: name, value, and a bar whose width is bound to the variable — only for values from 1 to 640; other values show no bar |
| `radius` | FLOAT variable scoped to `CORNER_RADIUS` | `DS / Radius` | `radius` | A tile: a square whose corner radius is bound to the variable |
| `effect` | Effect Style | `DS / Elevation` | `elevation` | A white card that uses the style, on a panel stage |
| `value` | Every other variable (other FLOAT scopes or no scope, STRING, BOOLEAN) | `DS / Other tokens` | `other` | A table row: name and the value per mode |

Next to every sample: the token name, the value per mode at generation time, and the alias target's name (`→ ref/primary/40`) when the variable is an alias. These texts are a snapshot; the cover says so.

| Block | Layout (from `TEMPLATE`) |
|-------|--------------------------|
| Swatch card | 180 wide. Chip 180 × 104, radius 16, a 1 px inner line on top, one cell per mode. Below: the leaf name (Callout, Semibold); one row per mode — the mode name (Caption, Ink 3, 38 wide) and the value (Caption, Ink 2); the alias (Caption, Ink 3), indented 38 when there are several modes. Six cards per row, 24 apart, rows 32 apart |
| Type row | The name (Callout, Semibold) and the specification (Caption, Ink 2) in a 280 column; the sample fills the rest. 28 above and below, a hairline below; the list has a hairline on top |
| Bar row | The name (Callout, Semibold) in a 280 column, the value (Callout, Ink 2) in a 72 column, the bar (12 high, radius 6, Link). 16 above and below, a hairline below |
| Radius tile | 180 wide: a 112 × 112 Panel square with the inner line; the leaf name and the value below |
| Elevation | A Panel stage, radius 24, 48 padding, cards 40 apart; each card 246 × 140, Paper, radius 18, 20 padding, the name and the effect count at the bottom |
| Value table | A head row (Caption, Semibold, Ink 2): `token` and the mode names, 10 below, a hairline below. Rows (Callout): the name in a 480 column, one cell per mode (Ink 2), 14 above and below, a hairline below |

```js
function kindOf(v) { // v: a row of the 'variables' inventory (§4)
  if (v.type === 'COLOR') return 'color';
  if (v.type !== 'FLOAT') return 'value';
  const scopes = v.scopes || [];
  if (scopes.includes('CORNER_RADIUS') && !scopes.includes('GAP') && !scopes.includes('WIDTH_HEIGHT')) return 'radius';
  if (scopes.includes('GAP') || scopes.includes('WIDTH_HEIGHT')) return 'bar';
  return 'value';
}
```

One call writes one batch of at most 20 items into one section — for colors, from one collection. Build `ITEMS` from the inventory rows: `kind` from `kindOf` (or the style kind), `id`, `name`, and the `values` or `spec`. An item that already exists is skipped, so a batch can be run again. An item that fails is removed, recorded in `skipped` with its reason, and the batch goes on. `SECTION.count` is the number shown on the right of the section heading: a `LABELS` key and the section's total from the inventory.

```js
const ROOT_ID = '70:1', OFFSET = 0;
const SECTION = { name: 'DS / Color', heading: 'color', part: 'foundations', count: { key: 'n_tokens', n: 23 } };
const COLLECTION = { name: 'Brand · System', modes: ['Light', 'Dark'] }; // color batches only; null for every other section
const ITEMS = [{ kind: 'color', id: 'VariableID:1:5', name: 'sys/color/primary', values: { Light: { value: '#6750A4', alias: 'ref/primary/40' }, Dark: { value: '#D0BCFF', alias: 'ref/primary/80' } } }];
const LABELS = {}, FONT = 'Inter', STYLES = { regular: 'Regular', medium: 'Medium', semibold: 'Semi Bold', bold: 'Bold' };
if (ITEMS.length > 20) return { error: 'at most 20 items per call' };
const root = await get(ROOT_ID);
let page = root;
while (page.type !== 'PAGE') page = page.parent;
await figma.setCurrentPageAsync(page);
await Promise.all(docFonts().map(f => figma.loadFontAsync(f)));
const sec = await sectionOf(root, SECTION.name, SECTION.part, L(SECTION.heading), SECTION.count ? L(SECTION.count.key, { n: SECTION.count.n }) : '');
let scope = sec;
if (COLLECTION) { // one block per collection inside the Color section
  const name = `DS collection / ${COLLECTION.name}`;
  scope = sec.children.find(c => c.name === name);
  if (!scope) {
    scope = add(sec, stack(name, 'VERTICAL', SP.item), true);
    const head = add(scope, stack('head', 'HORIZONTAL', SP.tag), true);
    head.counterAxisAlignItems = 'CENTER';
    add(head, await fileText(COLLECTION.name, 'subhead'));
    if (COLLECTION.modes.length > 1) for (const m of COLLECTION.modes.slice(0, 4)) add(head, await pill(m));
  }
}
const leaf = name => name.split('/').pop();
const firstValue = it => { const v = Object.values(it.values || {})[0]; return v ? v.value ?? '—' : it.spec || '—'; };
```

```js
async function groupOf(path, kind, it) { // the container that receives this kind's items
  const name = `DS group / ${path}`;
  let g = scope.children.find(c => c.name === name);
  if (!g) {
    g = add(scope, stack(name, 'VERTICAL', SP.group), true);
    if (path) add(g, await fileText(path, 'caption', { weight: 'medium', color: 'ink3' }));
    let items;
    if (['color', 'paint', 'radius'].includes(kind)) { items = stack('items', 'HORIZONTAL', S.swatchGap.column); items.layoutWrap = 'WRAP'; items.counterAxisSpacing = S.swatchGap.row; }
    else if (kind === 'effect') {
      const E = S.elevation;
      items = pad(stack('items', 'HORIZONTAL', E.gap), E.stagePadding, E.stagePadding, E.stagePadding, E.stagePadding);
      Object.assign(items, { layoutWrap: 'WRAP', counterAxisSpacing: E.gap, fills: solid(C.panel), cornerRadius: R.stage });
    } else items = kind === 'value' ? stack('items', 'VERTICAL') : hairline(stack('items', 'VERTICAL'), 'top');
    add(g, items, true);
    if (kind === 'value') { // the table head: the token column and the mode names
      const head = add(items, hairline(pad(stack('head', 'HORIZONTAL', S.tableGap), 0, 0, S.tableHeadPadding, 0), 'bottom'), true);
      add(head, width(text(L('token'), 'caption', { weight: 'semibold', color: 'ink2' }), S.valueName - S.tableGap));
      for (const m of Object.keys(it.values || {})) add(head, await fileText(m, 'caption', { weight: 'semibold', color: 'ink2' })).layoutGrow = 1;
    }
  }
  return g.children[g.children.length - 1];
}
async function captionOf(card, it, title, detail) { // the name and the lines under a card
  const cap = add(card, stack('text', 'VERTICAL', SP.line), true);
  add(cap, await fileText(title, 'callout', { weight: 'semibold' }), true);
  if (detail !== undefined) { add(cap, await fileText(detail, 'caption', { color: 'ink2' }), true); return; }
  const entries = Object.entries(it.values || {}), many = entries.length > 1;
  for (const [mode, v] of entries.slice(0, 4)) {
    const row = add(cap, stack('value', 'HORIZONTAL'), true);
    if (many) add(row, width(await fileText(mode, 'caption', { color: 'ink3' }), S.modeLabel));
    add(row, text(v.value ?? '—', 'caption', { color: 'ink2' }));
    if (v.alias) add(add(cap, pad(stack('alias', 'HORIZONTAL'), 0, 0, 0, many ? S.modeLabel : 0), true), await fileText(`→ ${v.alias}`, 'caption', { color: 'ink3' }));
  }
  if (entries.length > 4) add(cap, text(L('modes_more', { n: entries.length }), 'caption', { color: 'ink3' }));
}
```

```js
const BUILD = { // each builder adds its item to `items` first, then fills it; a returned string is a reason to report
  async color(items, it) {
    const card = width(add(items, stack(itemName(it.id), 'VERTICAL', SP.inner)), S.card);
    const chip = add(card, stack('chip', 'HORIZONTAL'));
    chip.resize(S.card, S.chipHeight);
    Object.assign(chip, { primaryAxisSizingMode: 'FIXED', counterAxisSizingMode: 'FIXED', cornerRadius: R.chip, clipsContent: true });
    if (it.kind === 'paint') {
      const style = await figma.getStyleByIdAsync(it.id), cell = add(chip, figma.createRectangle());
      cell.resize(S.card, S.chipHeight);
      await cell.setFillStyleIdAsync(style.id);
    } else {
      const variable = await figma.variables.getVariableByIdAsync(it.id);
      const collection = await figma.variables.getVariableCollectionByIdAsync(variable.variableCollectionId);
      const modes = collection.modes.slice(0, 4), w = S.card / modes.length;
      for (const mode of modes) {
        const cell = add(chip, figma.createFrame()); // carries the explicit mode; the swatch inside resolves through it
        Object.assign(cell, { name: mode.name, fills: [] });
        cell.resize(w, S.chipHeight);
        if (collection.modes.length > 1) cell.setExplicitVariableModeForCollection(collection, mode.modeId);
        const sw = add(cell, figma.createRectangle());
        sw.resize(w, S.chipHeight);
        sw.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: rgbOf(C.panel) }, 'color', variable)];
      }
    }
    const edge = innerLine(add(chip, figma.createRectangle())); // the inner line, drawn above the cells
    Object.assign(edge, { name: 'edge', layoutPositioning: 'ABSOLUTE', x: 0, y: 0, fills: [], cornerRadius: R.chip });
    edge.resize(S.card, S.chipHeight);
    await captionOf(card, it, leaf(it.name), it.kind === 'paint' ? it.spec : undefined);
  },
  async paint(items, it) { return BUILD.color(items, it); },
  async radius(items, it) {
    const card = width(add(items, stack(itemName(it.id), 'VERTICAL', SP.inner)), S.card);
    const variable = await figma.variables.getVariableByIdAsync(it.id), shape = innerLine(add(card, figma.createRectangle()));
    shape.resize(S.shape, S.shape);
    shape.fills = solid(C.panel);
    try { shape.setBoundVariable('cornerRadius', variable); }
    catch (e) { for (const f of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) shape.setBoundVariable(f, variable); }
    await captionOf(card, it, leaf(it.name), String(firstValue(it)));
  },
  async effect(items, it) {
    const E = S.elevation, style = await figma.getStyleByIdAsync(it.id);
    const card = add(items, pad(stack(itemName(it.id), 'VERTICAL', SP.line), E.padding, E.padding, E.padding, E.padding));
    card.resize(E.width, E.height);
    Object.assign(card, { primaryAxisSizingMode: 'FIXED', counterAxisSizingMode: 'FIXED', primaryAxisAlignItems: 'MAX', fills: solid(C.paper), cornerRadius: R.tile });
    await card.setEffectStyleIdAsync(style.id);
    add(card, await fileText(it.name, 'callout', { weight: 'semibold' }), true);
    add(card, text(L('effects', { n: it.spec }), 'caption', { color: 'ink2' }), true);
  },
  async text(items, it) {
    const row = add(items, hairline(baseline(pad(stack(itemName(it.id), 'HORIZONTAL', SP.block), S.typeRowPadding, 0, S.typeRowPadding, 0)), 'bottom'), true);
    const meta = width(add(row, stack('meta', 'VERTICAL', SP.line)), S.rowLabel);
    add(meta, await fileText(it.name, 'callout', { weight: 'semibold' }), true);
    add(meta, await fileText(it.spec, 'caption', { color: 'ink2' }), true);
    const style = await figma.getStyleByIdAsync(it.id);
    try {
      await figma.loadFontAsync(style.fontName);
      const t = add(row, figma.createText());
      t.fontName = style.fontName;
      t.characters = it.name.replace(/\//g, ' ');
      await t.setTextStyleIdAsync(style.id);
      Object.assign(t, { layoutGrow: 1, textAutoResize: 'HEIGHT' });
    } catch (e) { // a Text Style whose font cannot be loaded is still listed
      add(row, text(L('no_font'), 'caption', { color: 'ink3' })).layoutGrow = 1;
      return `font could not be loaded: ${it.spec}`;
    }
  },
  async bar(items, it) {
    const row = add(items, hairline(pad(stack(itemName(it.id), 'HORIZONTAL', SP.item), S.barRowPadding, 0, S.barRowPadding, 0), 'bottom'), true);
    row.counterAxisAlignItems = 'CENTER';
    add(row, width(await fileText(it.name, 'callout', { weight: 'semibold' }), S.rowLabel));
    const n = firstValue(it);
    add(row, width(text(String(n), 'callout', { color: 'ink2' }), S.rowValue));
    if (typeof n === 'number' && n >= 1 && n <= 640) {
      const variable = await figma.variables.getVariableByIdAsync(it.id), b = add(row, figma.createRectangle());
      b.resize(n, S.bar);
      Object.assign(b, { fills: solid(C.link), cornerRadius: R.bar });
      b.setBoundVariable('width', variable);
    }
  },
  async value(items, it) {
    const row = add(items, hairline(pad(stack(itemName(it.id), 'HORIZONTAL', S.tableGap), S.tablePadding, 0, S.tablePadding, 0), 'bottom'), true);
    add(row, width(await fileText(it.name, 'callout'), S.valueName - S.tableGap));
    for (const v of Object.values(it.values || {})) add(row, await fileText(String(v.value ?? '—'), 'callout', { color: 'ink2' })).layoutGrow = 1;
  },
};
```

```js
let added = 0, existing = 0;
const skipped = [];
for (const it of ITEMS) {
  if (hasItem(scope, it.id)) { existing++; continue; }
  const items = await groupOf(it.name.split('/').slice(0, -1).join('/'), it.kind, it);
  try {
    const reason = await BUILD[it.kind](items, it);
    if (reason) skipped.push({ id: it.id, reason: reason.slice(0, 160) });
    added++;
  } catch (e) {
    const left = items.findOne(n => n.name === itemName(it.id));
    if (left) left.remove();
    skipped.push({ id: it.id, reason: String(e && e.message ? e.message : e).slice(0, 160) });
  }
}
return { sectionId: sec.id, scopeId: scope.id, added, existing, skipped, uncovered, nextOffset: OFFSET + ITEMS.length };
```

Write the batches in this order — `place` keeps each section inside its part — and leave out a section that would be empty: `DS / Color` (one collection after the other, in the file's collection order), `DS / Color styles`, `DS / Typography`, `DS / Spacing & size`, `DS / Radius`, `DS / Elevation`, `DS / Other tokens`; then the Components part (§8).

| Section | `SECTION.count` |
|---------|-----------------|
| `DS / Color`, `DS / Spacing & size`, `DS / Radius`, `DS / Other tokens` | `n_tokens` with the section's number of variables |
| `DS / Color styles`, `DS / Typography`, `DS / Elevation` | `n_styles` with the section's number of styles |

---

## 8. Component sections and the icon grid

One call writes one component section. It shows facts only:

| Part | Content | Layout (from `TEMPLATE`) |
|------|---------|--------------------------|
| Head | The name; the kind (`kind_set` or `kind_component`), the number of variants (`variants_one` or `variants_count`), and the page; the `open_main` link to the main component | A hairline on top, 24 above; the name (Headline), the details (Callout, Ink 2), the link (Callout, Link), 8 apart |
| Description | The component's `description` field, at most 600 characters. An empty field shows nothing: no placeholder, and no text written by the agent | Body, 680 wide |
| Variants | One instance per variant with the variant name — 30 at most, then the `more` note with the rest | A Panel stage, radius 24, 56 padding, bottom-aligned, 48 between columns and 40 between rows; each cell is the instance with its name (Caption, Ink 2) 14 below |
| Properties | Name, type, default value, and options of every component property | A 672 column: the `properties` heading (Callout, Semibold), then a table with the columns 200, 144, 168, and 160 |
| Tokens | The names of the variables and styles bound on the main component (the default variant of a set), without duplicates — 40 at most, then the `more` note | A 480 column, 48 to the right of the properties: the `tokens` heading with the count, then one row per name (Callout), 10 above and below, hairlines between |

Samples are instances. When a variant's fonts cannot be loaded, its section shows the text parts without instances, and the component is returned in `skipped`.

```js
const ROOT_ID = '70:1', COMPONENT_ID = '40:9', PAGE_NAME = 'Components';
const LABELS = {}, FONT = 'Inter', STYLES = { regular: 'Regular', medium: 'Medium', semibold: 'Semi Bold', bold: 'Bold' };
const root = await get(ROOT_ID), node = await get(COMPONENT_ID);
if (!node || !['COMPONENT', 'COMPONENT_SET'].includes(node.type)) return { error: 'component not found' };
let page = root;
while (page.type !== 'PAGE') page = page.parent;
await figma.setCurrentPageAsync(page);
await Promise.all(docFonts().map(f => figma.loadFontAsync(f)));
const name = `DS / Component / ${node.name} (${node.id})`;
if (child(root, name)) return { sectionId: child(root, name).id, added: 0, existing: 1, skipped: [], uncovered };
const isSet = node.type === 'COMPONENT_SET';
const variants = isSet ? node.children.filter(c => c.type === 'COMPONENT') : [node];
const fontsIn = n => [...new Set((n.type === 'TEXT' ? [n] : n.findAll(x => x.type === 'TEXT')).flatMap(t => (t.characters.length ? t.getRangeAllFontNames(0, t.characters.length) : [t.fontName])).map(f => JSON.stringify(f)))].map(f => JSON.parse(f));
const usable = await Promise.all(variants.slice(0, 30).map(v => Promise.all(fontsIn(v).map(f => figma.loadFontAsync(f))).then(() => true, () => false)));
const skipped = usable.every(Boolean) ? [] : [{ id: node.id, reason: 'fonts could not be loaded' }];
```

```js
partOf(root, 'components');
const sec = place(root, stack(name, 'VERTICAL', SP.block), 'components');
const head = add(sec, hairline(pad(stack('DS head', 'VERTICAL', SP.head), SP.sectionTop)), true);
add(head, await fileText(node.name, 'headline'), true);
const count = variants.length === 1 ? L('variants_one') : L('variants_count', { n: variants.length });
add(head, await fileText([L(isSet ? 'kind_set' : 'kind_component'), count, L('page', { name: PAGE_NAME })].join(' · '), 'callout', { color: 'ink2' }), true);
const link = add(head, text(`${L('open_main')} ›`, 'callout', { color: 'link' }));
link.hyperlink = { type: 'NODE', value: node.id };
const description = (node.description || '').trim().slice(0, 600);
if (description) add(sec, width(await fileText(description, 'body'), S.description)); // the designer's text, as it is
if (!skipped.length) { // instances only: a main component is never cloned
  const G = S.stage, stage = add(sec, pad(stack('variants', 'HORIZONTAL', G.column), G.padding, G.padding, G.padding, G.padding), true);
  Object.assign(stage, { layoutWrap: 'WRAP', counterAxisSpacing: G.row, counterAxisAlignItems: 'MAX', fills: solid(C.panel), cornerRadius: R.stage });
  for (const v of variants.slice(0, 30)) {
    const cell = add(stage, stack(itemName(v.id), 'VERTICAL', G.cell));
    cell.counterAxisAlignItems = 'CENTER';
    add(cell, v.createInstance());
    add(cell, await fileText(isSet ? v.name : node.name, 'caption', { color: 'ink2' }));
  }
  if (variants.length > 30) add(sec, text(L('more', { n: variants.length - 30 }), 'caption', { color: 'ink2' }));
}
```

```js
const I = S.info, info = add(sec, stack('info', 'HORIZONTAL', I.gap), true);
const defs = Object.entries(node.componentPropertyDefinitions || {});
if (defs.length) {
  const left = width(add(info, stack('properties', 'VERTICAL', SP.head)), I.left);
  add(left, text(L('properties'), 'callout', { weight: 'semibold' }));
  const table = add(left, stack('table', 'VERTICAL'), true), cols = S.propColumns;
  const rowOf = async (cells, isHead) => {
    const row = add(table, hairline(pad(stack('row', 'HORIZONTAL', S.tableGap), isHead ? 0 : S.tablePadding, 0, isHead ? S.tableHeadPadding : S.tablePadding, 0), 'bottom'), true);
    for (const [i, c] of cells.entries()) {
      const t = isHead ? text(c, 'caption', { weight: 'semibold', color: 'ink2' }) : await fileText(c, 'callout', { color: i ? 'ink2' : 'ink' });
      add(row, width(t, i < cols.length - 1 ? cols[i] - S.tableGap : cols[i]));
    }
  };
  await rowOf([L('prop_name'), L('prop_type'), L('prop_default'), L('prop_options')], true);
  for (const [key, d] of defs) await rowOf([key.split('#')[0], d.type, String(d.defaultValue), d.variantOptions ? d.variantOptions.join(', ') : '—'], false);
}
const main = isSet ? node.defaultVariant || variants[0] : node, varIds = new Set(), styleIds = new Set();
const grab = v => { if (Array.isArray(v)) v.forEach(grab); else if (v && v.type === 'VARIABLE_ALIAS') varIds.add(v.id); else if (v && typeof v === 'object') Object.values(v).forEach(grab); };
for (const n of [main, ...main.findAll(() => true)]) {
  grab(n.boundVariables);
  for (const k of ['textStyleId', 'effectStyleId', 'fillStyleId', 'strokeStyleId']) if (typeof n[k] === 'string' && n[k]) styleIds.add(n[k]);
}
const found = await Promise.all([...[...varIds].map(id => figma.variables.getVariableByIdAsync(id)), ...[...styleIds].map(id => figma.getStyleByIdAsync(id))]);
const tokens = [...new Set(found.filter(Boolean).map(x => x.name))].sort();
if (tokens.length) {
  const right = width(add(info, stack('tokens', 'VERTICAL', SP.head)), I.right);
  add(right, text(`${L('tokens')} (${tokens.length})`, 'callout', { weight: 'semibold' }));
  const list = add(right, hairline(stack('list', 'VERTICAL'), 'top'), true);
  for (const tk of tokens.slice(0, 40)) add(add(list, hairline(pad(stack('row', 'HORIZONTAL'), S.listPadding, 0, S.listPadding, 0), 'bottom'), true), await fileText(tk, 'callout'), true);
  if (tokens.length > 40) add(right, text(L('more', { n: tokens.length - 40 }), 'caption', { color: 'ink2' }));
}
if (!info.children.length) info.remove();
return { sectionId: sec.id, added: 1, existing: 0, variants: Math.min(variants.length, 30), tokens: tokens.length, described: !!description, skipped, uncovered };
```

**Icon grid.** Components the inventory marks `icon: true` share one section, `DS / Icons`: tiles 104 wide, each a 104 × 104 Panel square with radius 18 and the instance in the middle, and the component name (Caption, Ink 2) centered below; 16 between columns and 24 between rows. One call adds at most 40. `TOTAL` is the number of icons in the inventory, shown on the right of the heading.

```js
const ROOT_ID = '70:1', OFFSET = 0, TOTAL = 180;
const ITEMS = ['12:3', '12:7']; // icon component or set IDs, at most 40
const LABELS = {}, FONT = 'Inter', STYLES = { regular: 'Regular', medium: 'Medium', semibold: 'Semi Bold', bold: 'Bold' };
if (ITEMS.length > 40) return { error: 'at most 40 icons per call' };
const root = await get(ROOT_ID);
let page = root;
while (page.type !== 'PAGE') page = page.parent;
await figma.setCurrentPageAsync(page);
await Promise.all(docFonts().map(f => figma.loadFontAsync(f)));
const sec = await sectionOf(root, 'DS / Icons', 'components', L('icons'), L('n_icons', { n: TOTAL }));
let grid = sec.children.find(c => c.name === 'DS icons');
if (!grid) { grid = add(sec, stack('DS icons', 'HORIZONTAL', S.iconGap.column), true); Object.assign(grid, { layoutWrap: 'WRAP', counterAxisSpacing: S.iconGap.row }); }
let added = 0, existing = 0;
const skipped = [];
for (const id of ITEMS) {
  if (hasItem(sec, id)) { existing++; continue; }
  const node = await get(id), main = node && node.type === 'COMPONENT_SET' ? node.defaultVariant : node;
  if (!main || main.type !== 'COMPONENT') { skipped.push({ id, reason: 'component not found' }); continue; }
  const tile = width(add(grid, stack(itemName(id), 'VERTICAL', SP.tag)), S.icon);
  tile.counterAxisAlignItems = 'CENTER';
  try {
    const box = add(tile, stack('box', 'HORIZONTAL'));
    box.resize(S.icon, S.icon);
    Object.assign(box, { primaryAxisSizingMode: 'FIXED', counterAxisSizingMode: 'FIXED', primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER', fills: solid(C.panel), cornerRadius: R.tile });
    add(box, main.createInstance());
    width(add(tile, await fileText(node.name, 'caption', { color: 'ink2' })), S.icon).textAlignHorizontal = 'CENTER';
    added++;
  } catch (e) { tile.remove(); skipped.push({ id, reason: String(e && e.message ? e.message : e).slice(0, 160) }); }
}
return { sectionId: sec.id, added, existing, skipped, uncovered, nextOffset: OFFSET + ITEMS.length };
```

Order: `DS / Icons` first, then the component sections sorted by page order and then by name.

---

## 9. Batches, ledger, and recovery

| Batch | Limit per call |
|-------|----------------|
| Root frame, cover, part headers, footer (§6) | The first call |
| Tokens and styles (§7) | 20 items — for colors, from one collection |
| Icons (§8) | 40 icons |
| Component section (§8) | 1 component |
| Finishing: contents row and footer (§6) | The last call |

Keep the document's progress in the ledger (build-recipes.md §2) under `doc`, and update it after every call:

```json
{
  "doc": {
    "wanted": true,
    "language": "繁體中文",
    "font": "Noto Sans TC",
    "fontStyles": { "regular": "Regular", "medium": "Medium", "semibold": "Bold", "bold": "Bold" },
    "pageId": "0:9",
    "created": true,
    "hostSectionId": null,
    "rootId": "70:1",
    "replaced": null,
    "counts": { "variables": 210, "textStyles": 9, "effectStyles": 3, "paintStyles": 0, "components": 12, "icons": 180 },
    "sections": {
      "DS collection / Brand · System": { "status": "done", "items": 45, "nextOffset": null },
      "DS / Typography": { "status": "pending", "items": 0, "nextOffset": 0 },
      "DS / Component / Button (40:9)": { "status": "done", "items": 1, "nextOffset": null }
    },
    "skipped": [{ "id": "S:9f2c", "reason": "font could not be loaded: Brand Sans Bold · 57 / 64" }],
    "uncovered": [],
    "finished": false
  }
}
```

- `sections[name].nextOffset`: where the next batch of that section starts; `null` when the section is complete. Colors are tracked per collection, by the block name `DS collection / {collection name}`.
- `finished`: `true` once the finishing call (§6) returned. When a run resumes with `finished: false`, run the finishing call again after the remaining batches.
- **A failed call or a timeout** can leave part of its batch written. Read the ledger and the root frame (§11's read-back) first, then run only the batches that are not complete. Running a batch again is safe: an item whose name already exists is counted as `existing` and not added.
- **Repeated timeouts**: halve the batch size (20 → 10 → 5 items; 40 → 20 icons).
- Every result holds only IDs, counts, and short reasons, and stays within 18,000 characters.

---

## 10. An existing generated document

Before creating the root frame, look for frames named `Design System — generated` on the document page (or in the host Section):

```js
const PAGE_ID = '0:9', HOST_ID = null;
const page = await get(PAGE_ID);
await figma.setCurrentPageAsync(page);
const host = HOST_ID ? await get(HOST_ID) : page;
return host.children.filter(n => n.name === ROOT_NAME).map(n => ({ id: n.id, x: n.x, y: n.y, width: n.width, height: n.height, sections: n.children ? n.children.length : 0 }));
```

- **None**: generate.
- **One**: ask — **Replace it** · **Keep it and generate a new one beside it** · **Skip the document**.
- **Several**: list them and ask which one to replace.
- A frame the designer renamed is theirs: it is never listed, asked about, or changed.

**Replace it** is a Tier 3 change: it deletes the old frame, and anything the designer changed inside that frame is lost. Say so and confirm it every time; no earlier "apply everything automatically" covers it. The order protects the old document:

1. Build the new root beside the existing content (§6–§8), run the finishing call (§6), and verify it (§11).
2. Only then run the swap below. It deletes the old frame and moves the new one to the old position. Record the old ID as `doc.replaced`.
3. When the new frame cannot be completed, keep the old frame, remove the incomplete new frame (`OLD_ID = null`), and report the reason.

```js
const OLD_ID = '60:1', NEW_ID = '70:1'; // OLD_ID null: remove an incomplete NEW_ID instead
const fresh = await get(NEW_ID);
if (!fresh || fresh.name !== ROOT_NAME) return { error: 'new document not found' };
let page = fresh;
while (page.type !== 'PAGE') page = page.parent;
await figma.setCurrentPageAsync(page);
if (!OLD_ID) { fresh.remove(); return { removedNew: true }; }
const old = await get(OLD_ID);
if (!old || old.name !== ROOT_NAME || old.parent.id !== fresh.parent.id) return { error: 'old document not found beside the new one' };
const at = { x: old.x, y: old.y };
old.remove();
fresh.x = at.x;
fresh.y = at.y;
return { replaced: OLD_ID, rootId: fresh.id, at };
```

**Keep it and generate a new one beside it**: the old frame is not touched; the new root goes to the right of the existing content as usual.

---

## 11. Verification and report

1. **Read back the root** and compare it with the ledger:

```js
const ROOT_ID = '70:1', OFFSET = 0;
const root = await get(ROOT_ID);
let page = root;
while (page.type !== 'PAGE') page = page.parent;
await figma.setCurrentPageAsync(page);
if (root.parent.type === 'SECTION') root.parent.resizeWithoutConstraints(root.x + root.width + 40, root.y + root.height + 40); // the host Section fits the document
const structure = n => n === 'DS / Header' || n === 'DS / Footer' || n.startsWith('DS / Part / '); // the template's own parts, not sections
const rows = root.children.map(s => ({ name: s.name, structure: structure(s.name), items: structure(s.name) ? 0 : s.name.startsWith('DS / Component / ') ? 1 : s.findAll(n => n.name.startsWith('DS item / ')).length }));
const contents = root.children.find(c => c.name === 'DS / Header')?.findOne(n => n.name === 'DS contents');
return { rootId: root.id, size: { w: Math.round(root.width), h: Math.round(root.height) }, contents: !!contents, strangers: rows.filter(r => !r.name.startsWith('DS / ')).map(r => r.name), ...fit(rows, OFFSET) };
```

   Every section of the ledger is present with its item count — `DS / Color` counts the items of all its collection blocks. The cover, the part headers, and the footer are marked `structure`. `contents` is `true` once the finishing call built the contents row. `strangers` lists children of the root that this skill did not name; report them.
2. **Counts are unchanged**: run the inventory again (§4: `MODE: 'summary'`, and the component inventory's `total` per page) and compare with `doc.counts`. The numbers of local components, variables, Text Styles, Effect Styles, and Paint Styles must be the same as before the document step. Report any difference; do not correct it.
3. `get_screenshot` of the root frame, and its link: `https://www.figma.com/design/{fileKey}/?node-id={rootId with ":" replaced by "-"}`.
4. Add the document part to the report (replacement.md §10):

```
Design system document: Design System — https://www.figma.com/design/{fileKey}/?node-id=70-1
  Language: 繁體中文 · Font: Noto Sans TC
  Foundations: Color 96 (2 collections) · Typography 9 · Spacing & size 14 · Radius 6 · Elevation 3 · Other tokens 82
  Components: 12 sections · Icons 180
  Skipped: 1 — S:9f2c font could not be loaded: Brand Sans Bold · 57 / 64
  Text the fonts do not cover: none
  Replaced an earlier document: no · Omitted: none
  Created no component, variable, or style (counts before and after are equal)
```

| Field | Source |
|-------|--------|
| Page and frame link | `doc.pageId`, `doc.rootId` |
| Language, font | `doc.language`, `doc.font` |
| Items per section | `doc.sections` and the read-back |
| Skipped | `doc.skipped` (per-item failures, with reasons) |
| Text the fonts do not cover | `doc.uncovered` (the `uncovered` of every call) |
| Replaced an earlier document | `doc.replaced` |
| Omitted | The part left out because the file has no tokens or no components (§4), or by the designer's choice (§5) |
| Counts before and after | `doc.counts` and step 2 |

---

## 12. Template

Every generated document has the same look: a quiet, Apple-style layout with generous white space, large bold headings, dark grey text, one blue for links and bars, and the samples on light grey stages. The look is fixed here, once, and every script of §6–§8 takes its values from this block, so documents from different projects and different runs differ only in their content.

- The template never uses the project's tokens. The project's tokens, styles, and components appear only in the samples, which are bound to them, use them, or are instances.
- The template is not stored as Figma components, a template file, or a library: building it from this block adds nothing to the designer's file but the document itself.
- The reference page [docs/document-template.html](../docs/document-template.html) renders a sample document with this template, in English and Traditional Chinese, and lists the same values. It embeds a copy of this block as JSON; keep the two identical (the check compares them, and the page's color variables, with this block).

```js
const TEMPLATE = {
  frame: { width: 1440, padding: 120, gap: 64, partTop: 56 },
  content: { width: 1200, columns: 12, gutter: 24 },
  color: { paper: '#FFFFFF', panel: '#F5F5F7', line: '#D2D2D7', ink: '#1D1D1F', ink2: '#6E6E73', ink3: '#86868B', link: '#0066CC', inner: { hex: '#000000', opacity: 0.07 } },
  type: {
    display: { size: 80, lineHeight: 84, weight: 'bold', tracking: -2.5 },
    title: { size: 48, lineHeight: 52, weight: 'bold', tracking: -2 },
    headline: { size: 32, lineHeight: 40, weight: 'bold', tracking: -1.5 },
    subhead: { size: 24, lineHeight: 32, weight: 'semibold', tracking: -0.5 },
    body: { size: 19, lineHeight: 28, weight: 'regular', tracking: 0 },
    callout: { size: 15, lineHeight: 22, weight: 'regular', tracking: 0 },
    caption: { size: 12, lineHeight: 18, weight: 'regular', tracking: 0 }
  },
  radius: { stage: 24, tile: 18, chip: 16, bar: 6, pill: 999 },
  space: { section: 64, block: 32, item: 24, group: 16, inner: 12, tag: 10, head: 8, stat: 4, line: 2, cover: 40, sectionTop: 24, statsTop: 32 },
  size: {
    card: 180, chipHeight: 104, modeLabel: 38, shape: 112, icon: 104, description: 680,
    rowLabel: 280, rowValue: 72, bar: 12, typeRowPadding: 28, barRowPadding: 16,
    tableGap: 16, tablePadding: 14, tableHeadPadding: 10, listPadding: 10, valueName: 480, propColumns: [200, 144, 168, 160],
    swatchGap: { column: 24, row: 32 }, iconGap: { column: 16, row: 24 }, statsGap: 24, notesGap: 24, contentsGap: { column: 28, row: 10 },
    pill: { x: 10, y: 3 },
    elevation: { width: 246, height: 140, padding: 20, gap: 40, stagePadding: 48 },
    stage: { padding: 56, column: 48, row: 40, cell: 14 },
    info: { left: 672, right: 480, gap: 48 }
  }
};
```

| Group | Values |
|-------|--------|
| Frame | 1440 wide; 120 padding on every side; 64 between the frame's children; part headers and the footer add 56 on top, so a part starts 120 after the content above it |
| Content | 1200 wide; 12 columns with 24 gutters — a swatch card or a radius tile is two columns (180) |
| Colors | Paper `#FFFFFF` (background) · Panel `#F5F5F7` (stages, tiles, pills) · Line `#D2D2D7` (hairlines) · Ink `#1D1D1F` (text) · Ink 2 `#6E6E73` (details, values) · Ink 3 `#86868B` (paths, aliases) · Link `#0066CC` (links, spacing bars) · the inner line is black at 7% |
| Text levels | Display 80 / 84 Bold · Title 48 / 52 Bold · Headline 32 / 40 Bold · Subhead 24 / 32 Semibold · Body 19 / 28 Regular · Callout 15 / 22 Regular (Semibold for names and headings) · Caption 12 / 18 Regular (Medium for paths and pills). In Inter, Display, Title, Headline, and Subhead have −2.5%, −2%, −1.5%, and −0.5% letter spacing; every other font has none |
| Radii | Stage 24 · tile and elevation card 18 · chip 16 · bar 6 · pill 999 |

| Where the levels go | Level |
|---------------------|-------|
| File name on the cover | Display |
| Part titles (`foundations`, `components_part`), the four counts on the cover | Title |
| Section titles, component names | Headline |
| Collection names | Subhead |
| `title` and the date on the cover, component descriptions | Body |
| Item names, details, links, table cells, the four count labels, the contents row | Callout |
| Values, aliases, group paths, variant names, notes, the footer | Caption |
