# Documentation — Generate the Design System Document

> Used by `figma-componentize` step 10 and by a document-only run (SKILL.md). It adds one frame that documents **every** local token and component of the file. It reads variables, styles, and components; it never creates, edits, or deletes them, and it never changes a layer outside the frame it generates.
> Scripts run through `use_figma` (pass `skillNames: "figma-componentize"`), sequentially, one page and one batch per call. Every result stays under 18,000 characters. Paste the helper block of §1 first in every script.

Contents

1. Rules and helpers
2. The two questions
3. Labels and fonts
4. Inventory
5. Scale confirmation
6. Page and root frame
7. Foundations sections
8. Component sections and the icon grid
9. Batches, ledger, and recovery
10. An existing generated document
11. Verification and report

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
| Section (direct child of the root) | `DS / …`, for example `DS / Color / Brand · System`, `DS / Component / Button (40:9)` |
| Group inside a section | `DS group / {path}` |
| Item | `DS item / {source ID}` |

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
| Section headings, field labels, the header notes, the link text, notes such as "+3 more" | Token, collection, and mode names and values; component, variant, and property names and values; the component description text |

Layer names (§1) and the page name stay in English in every language, because generated content is recognised by them.

**Labels.** Every heading and label comes from `LABELS`, an object with the keys below. The scripts contain no heading or label text of their own. Pass one of these two objects, or, for another language, translate the same keys before the first write.

```json
{
  "title": "Design System",
  "generated": "Generated {date}",
  "counts": "{tokens} tokens · {styles} styles · {components} components · {icons} icons",
  "note_regenerate": "Samples are bound to the tokens and follow them. Names and values in text are a snapshot: regenerate this document after tokens change.",
  "note_own": "Keep your own notes outside this frame, or write them in the component description field.",
  "color": "Color",
  "color_styles": "Color styles",
  "typography": "Typography",
  "spacing": "Spacing & size",
  "radius": "Radius",
  "elevation": "Elevation",
  "other": "Other tokens",
  "icons": "Icons",
  "kind_set": "Component set",
  "kind_component": "Component",
  "variants_count": "{n} variants",
  "page": "Page: {name}",
  "open_main": "Open main component",
  "variants": "Variants",
  "properties": "Properties",
  "prop_type": "Type",
  "prop_default": "Default",
  "prop_options": "Options",
  "tokens": "Tokens",
  "more": "+{n} more",
  "modes_more": "Showing 4 of {n} modes",
  "effects": "{n} effects",
  "no_font": "Font not available"
}
```

```json
{
  "title": "設計系統",
  "generated": "產生日期 {date}",
  "counts": "{tokens} 個 tokens · {styles} 個 styles · {components} 個元件 · {icons} 個圖示",
  "note_regenerate": "樣本綁定 token，會跟著 token 變。文字中的名稱與數值是產生當下的快照：token 改動後請重新產生這份文件。",
  "note_own": "自己的說明請放在這個外框之外，或寫在元件的描述欄位。",
  "color": "顏色",
  "color_styles": "顏色樣式",
  "typography": "文字樣式",
  "spacing": "間距與尺寸",
  "radius": "圓角",
  "elevation": "陰影",
  "other": "其他 tokens",
  "icons": "圖示",
  "kind_set": "Component set",
  "kind_component": "元件",
  "variants_count": "{n} 個 variants",
  "page": "頁面：{name}",
  "open_main": "開啟主元件",
  "variants": "Variants",
  "properties": "屬性",
  "prop_type": "類型",
  "prop_default": "預設值",
  "prop_options": "選項",
  "tokens": "使用的 tokens",
  "more": "另有 {n} 個",
  "modes_more": "僅顯示 {n} 個 modes 中的 4 個",
  "effects": "{n} 個效果",
  "no_font": "字型無法載入"
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

**Font check.** Run it before the first write. It writes nothing.

```js
const FAMILY = 'Noto Sans TC';
const styles = [];
for (const style of ['Regular', 'Bold']) {
  try { await figma.loadFontAsync({ family: FAMILY, style }); styles.push(style); } catch (e) { /* this style is not available */ }
}
return { ok: styles.includes('Regular'), family: FAMILY, styles };
```

- `ok: true`: pass `FONT = family` and `BOLD = styles.includes('Bold')` to the scripts of §6–§8 (without Bold, everything is set in Regular). Record the family as `doc.font`.
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
  const calls = 1 + Math.ceil(tokens / 20) + counts.components + Math.ceil(counts.icons / 40);
  return { tokens, calls, ask: tokens > 300 || counts.components > 40 || calls > 60 };
}
```

- `ask: false`: proceed.
- `ask: true` (more than 300 variables and styles together, more than 40 non-icon components, or more than 60 write calls): ask before writing — **Generate everything** · **Foundations only** · **Components only** · **Skip the document**.

---

## 6. Page and root frame

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

**Document helpers.** Paste after §1's block in every script of §6–§8. `LABELS`, `FONT`, and `BOLD` come from §3.

```js
const INK = { r: 0.11, g: 0.11, b: 0.12 }, MUTED = { r: 0.42, g: 0.42, b: 0.45 }, LINE = { r: 0.88, g: 0.88, b: 0.9 }, WHITE = { r: 1, g: 1, b: 1 };
const solid = color => [{ type: 'SOLID', color }];
const fonts = { regular: { family: FONT, style: 'Regular' }, bold: { family: FONT, style: BOLD ? 'Bold' : 'Regular' } };
const cover = {}, uncovered = [];
const L = (key, vars = {}) => String(LABELS[key] ?? key).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
async function fileFont(chars, bold) { // text taken from the file: use a covering font when the document font lacks the characters
  const family = coverFont(chars);
  if (!family || family === FONT) return bold ? fonts.bold : fonts.regular;
  if (!(family in cover)) cover[family] = await figma.loadFontAsync({ family, style: 'Regular' }).then(() => true, () => false);
  if (cover[family]) return { family, style: 'Regular' };
  uncovered.push(String(chars).slice(0, 40));
  return bold ? fonts.bold : fonts.regular;
}
function label(chars, { size = 12, bold = false, color = INK, font = null } = {}) { // font must be loaded
  const t = figma.createText();
  t.fontName = font || (bold ? fonts.bold : fonts.regular);
  t.fontSize = size;
  t.characters = String(chars);
  t.fills = solid(color);
  return t;
}
const fileLabel = async (chars, opts = {}) => label(chars, { ...opts, font: await fileFont(chars, opts.bold) });
function stack(name, dir = 'VERTICAL', gap = 8) {
  const f = figma.createFrame();
  f.name = name; f.layoutMode = dir; f.itemSpacing = gap; f.fills = [];
  f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'AUTO';
  return f;
}
function add(parent, child, stretch = false) { // stretch: fill the parent's width; a text then wraps instead of growing sideways
  parent.appendChild(child);
  if (stretch) { child.layoutSizingHorizontal = 'FILL'; if (child.type === 'TEXT') child.textAutoResize = 'HEIGHT'; }
  return child;
}
function sectionOf(root, name, title) { // sections are found by name, so a batch can be run again
  let s = root.children.find(c => c.name === name);
  if (!s) { s = add(root, stack(name, 'VERTICAL', 24), true); add(s, label(title, { size: 28, bold: true }), true); }
  return s;
}
function groupOf(sec, path, wrap) { // one group per token group path; wrap: a grid of cards, otherwise a list of rows
  const name = `DS group / ${path}`;
  let g = sec.children.find(c => c.name === name);
  if (!g) {
    g = add(sec, stack(name, 'VERTICAL', 12), true);
    if (path) add(g, label(path, { size: 12, color: MUTED }));
    const grid = stack('items', wrap ? 'HORIZONTAL' : 'VERTICAL', wrap ? 16 : 10);
    if (wrap) { grid.layoutWrap = 'WRAP'; grid.counterAxisSpacing = 16; }
    add(g, grid, true);
  }
  return g.children[g.children.length - 1];
}
const itemName = id => `DS item / ${id}`;
const hasItem = (sec, id) => !!sec.findOne(n => n.name === itemName(id));
```

**Root frame.** One frame named exactly `Design System — generated`: 1440 px wide, vertical auto layout, 80 px padding, 80 px between sections, white. On a new page it sits at the origin; on an existing page, or inside the host Section, 400 px to the right of the rightmost existing node. Nothing that is already there is moved, renamed, restyled, or deleted.

```js
const PAGE_ID = '0:9', HOST_ID = null; // HOST_ID: the fallback Section, when the page limit was hit
const LABELS = {}, FONT = 'Inter', BOLD = true; // from §3
const DATE = '2026-10-01', COUNTS = { tokens: 210, styles: 12, components: 12, icons: 180 }; // from §4; tokens: the number of variables
const page = await get(PAGE_ID);
await figma.setCurrentPageAsync(page);
const host = HOST_ID ? await get(HOST_ID) : page;
await Promise.all([fonts.regular, fonts.bold].map(f => figma.loadFontAsync(f)));
const others = host.children.slice();
const root = stack(ROOT_NAME, 'VERTICAL', 80);
root.paddingTop = root.paddingBottom = root.paddingLeft = root.paddingRight = 80;
root.fills = solid(WHITE);
host.appendChild(root);
root.resize(1440, 200);
root.primaryAxisSizingMode = 'AUTO';
root.counterAxisSizingMode = 'FIXED';
root.x = others.length ? Math.max(...others.map(n => n.x + n.width)) + 400 : HOST_ID ? 40 : 0;
root.y = HOST_ID ? 40 : 0;
const header = add(root, stack('DS / Header', 'VERTICAL', 12), true);
add(header, await fileLabel(`${L('title')} — ${figma.root.name}`, { size: 48, bold: true }), true);
add(header, label(`${L('generated', { date: DATE })} · ${L('counts', COUNTS)}`, { size: 14, color: MUTED }), true);
for (const key of ['note_regenerate', 'note_own']) add(header, label(L(key), { size: 14, color: MUTED }), true);
return { rootId: root.id, pageId: page.id, headerId: header.id, at: { x: root.x, y: root.y }, uncovered };
```

---

## 7. Foundations sections

Every local token is shown once, grouped by its collection and its group path (the name without its last segment). The file's own layers — Reference, System, Component, or whatever it uses — are shown as they are; nothing is reclassified.

| `kind` | Source | Section (layer name) | Heading | Sample |
|--------|--------|----------------------|---------|--------|
| `color` | COLOR variable | `DS / Color / {collection}` | `color` label and the collection name | A swatch whose fill is bound to the variable. A collection with several modes gets one cell per mode, each with that mode set explicitly — four at most, with a note when there are more |
| `paint` | Paint Style | `DS / Color styles` | `color_styles` | A swatch that uses the style |
| `text` | Text Style | `DS / Typography` | `typography` | A text sample that uses the style, with font, size, and line height |
| `bar` | FLOAT variable whose scopes include `GAP` or `WIDTH_HEIGHT`, value from 1 to 640 | `DS / Spacing & size` | `spacing` | A bar whose width is bound to the variable |
| `radius` | FLOAT variable scoped to `CORNER_RADIUS` | `DS / Radius` | `radius` | A shape whose corner radius is bound to the variable |
| `effect` | Effect Style | `DS / Elevation` | `elevation` | A card that uses the style |
| `value` | Every other variable (other FLOAT scopes or no scope, values outside 1–640, STRING, BOOLEAN) | `DS / Other tokens` | `other` | Name and value |

Next to every sample: the token name, the value per mode at generation time, and the alias target's name (`→ ref/primary/40`) when the variable is an alias. These texts are a snapshot; the header says so.

```js
function kindOf(v) { // v: a row of the 'variables' inventory (§4)
  if (v.type === 'COLOR') return 'color';
  if (v.type !== 'FLOAT') return 'value';
  const scopes = v.scopes || [], first = Object.values(v.values)[0] || {}, n = first.value;
  if (scopes.includes('CORNER_RADIUS') && !scopes.includes('GAP') && !scopes.includes('WIDTH_HEIGHT')) return 'radius';
  if ((scopes.includes('GAP') || scopes.includes('WIDTH_HEIGHT')) && typeof n === 'number' && n >= 1 && n <= 640) return 'bar';
  return 'value';
}
```

One call writes one batch of at most 20 items into one section. Build `ITEMS` from the inventory rows: `kind` from `kindOf` (or the style kind), `id`, `name`, and the `values` or `spec` text. An item that already exists in the section is skipped, so a batch can be run again. An item that fails is removed, recorded in `skipped` with its reason, and the batch goes on.

```js
const ROOT_ID = '70:1', OFFSET = 0;
const SECTION = { name: 'DS / Color / Brand · System', heading: 'color', suffix: 'Brand · System' }; // heading: a LABELS key; suffix: file text shown after it, or ''
const ITEMS = [{ kind: 'color', id: 'VariableID:1:5', name: 'sys/color/primary', values: { Light: { value: '#6750A4', alias: 'ref/primary/40' }, Dark: { value: '#D0BCFF', alias: 'ref/primary/80' } } }];
const LABELS = {}, FONT = 'Inter', BOLD = true;
if (ITEMS.length > 20) return { error: 'at most 20 items per call' };
const root = await get(ROOT_ID);
let page = root;
while (page.type !== 'PAGE') page = page.parent;
await figma.setCurrentPageAsync(page);
await Promise.all([fonts.regular, fonts.bold].map(f => figma.loadFontAsync(f)));
const sec = sectionOf(root, SECTION.name, SECTION.suffix ? `${L(SECTION.heading)} · ${SECTION.suffix}` : L(SECTION.heading));
const WRAP = ['color', 'paint', 'radius', 'effect'];
const valueText = it => Object.entries(it.values || {}).map(([mode, v]) => `${Object.keys(it.values).length > 1 ? mode + '  ' : ''}${v.value ?? '—'}${v.alias ? '  → ' + v.alias : ''}`).join('\n');
```

```js
async function sample(it, card) { // appends the bound sample to the item card
  if (it.kind === 'color') {
    const variable = await figma.variables.getVariableByIdAsync(it.id);
    const collection = await figma.variables.getVariableCollectionByIdAsync(variable.variableCollectionId);
    const cells = stack('modes', 'HORIZONTAL', 4);
    for (const mode of collection.modes.slice(0, 4)) {
      const cell = figma.createFrame(); // carries the explicit mode; the swatch inside resolves through it
      cell.name = mode.name; cell.resize(72, 56); cell.fills = []; cell.cornerRadius = 8; cell.clipsContent = true;
      if (collection.modes.length > 1) cell.setExplicitVariableModeForCollection(collection, mode.modeId);
      const swatch = figma.createRectangle();
      swatch.resize(72, 56);
      swatch.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }, 'color', variable)];
      add(cell, swatch);
      cell.strokes = solid(LINE);
      add(cells, cell);
    }
    add(card, cells);
    if (collection.modes.length > 4) add(card, label(L('modes_more', { n: collection.modes.length }), { size: 10, color: MUTED }));
  } else if (it.kind === 'bar' || it.kind === 'radius') {
    const variable = await figma.variables.getVariableByIdAsync(it.id);
    const shape = figma.createRectangle();
    shape.fills = solid(it.kind === 'bar' ? INK : LINE);
    if (it.kind === 'bar') { shape.resize(16, 16); shape.setBoundVariable('width', variable); }
    else {
      shape.resize(56, 56);
      try { shape.setBoundVariable('cornerRadius', variable); }
      catch (e) { for (const f of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) shape.setBoundVariable(f, variable); }
    }
    add(card, shape);
  } else if (it.kind === 'paint' || it.kind === 'effect') {
    const style = await figma.getStyleByIdAsync(it.id);
    const shape = figma.createRectangle();
    shape.resize(it.kind === 'paint' ? 72 : 96, it.kind === 'paint' ? 56 : 64);
    shape.cornerRadius = 8;
    if (it.kind === 'paint') { await shape.setFillStyleIdAsync(style.id); shape.strokes = solid(LINE); }
    else { shape.fills = solid(WHITE); await shape.setEffectStyleIdAsync(style.id); }
    add(card, shape);
  } else if (it.kind === 'text') {
    const style = await figma.getStyleByIdAsync(it.id);
    await figma.loadFontAsync(style.fontName); // throws when the font is not available: handled by the caller
    const t = figma.createText();
    t.fontName = style.fontName;
    t.characters = `Ag — ${it.name.split('/').pop()}`;
    await t.setTextStyleIdAsync(style.id);
    add(card, t);
  }
}
```

```js
let added = 0, existing = 0;
const skipped = [];
for (const it of ITEMS) {
  if (hasItem(sec, it.id)) { existing++; continue; }
  const path = it.name.split('/').slice(0, -1).join('/');
  const grid = groupOf(sec, path, WRAP.includes(it.kind));
  const card = add(grid, stack(itemName(it.id), WRAP.includes(it.kind) ? 'VERTICAL' : 'HORIZONTAL', WRAP.includes(it.kind) ? 6 : 16));
  let note = null;
  try { await sample(it, card); }
  catch (e) {
    if (it.kind !== 'text') { card.remove(); skipped.push({ id: it.id, reason: String(e && e.message ? e.message : e).slice(0, 160) }); continue; }
    note = L('no_font'); // a Text Style whose font cannot be loaded is still listed, in the document font
    skipped.push({ id: it.id, reason: `font could not be loaded: ${it.spec || it.name}` });
  }
  const texts = add(card, stack('text', 'VERTICAL', 2));
  add(texts, await fileLabel(it.name.split('/').pop(), { size: 12, bold: true }));
  const detail = [it.kind === 'effect' ? L('effects', { n: it.spec }) : it.kind === 'text' || it.kind === 'paint' ? it.spec : valueText(it), note].filter(Boolean).join('\n');
  if (detail) add(texts, await fileLabel(detail, { size: 10, color: MUTED }));
  added++;
}
return { sectionId: sec.id, added, existing, skipped, uncovered, nextOffset: OFFSET + ITEMS.length };
```

Section order in the root: the header; one `DS / Color / {collection}` per collection that has colors, in the file's collection order; `DS / Color styles`; `DS / Typography`; `DS / Spacing & size`; `DS / Radius`; `DS / Elevation`; `DS / Other tokens`; then the components (§8). A section is created by its first batch, so write the batches in this order. Leave out a section that would be empty.

---

## 8. Component sections and the icon grid

One call writes one component section. It shows facts only:

| Part | Content |
|------|---------|
| Title and facts | The name; the kind (`kind_set` or `kind_component`); the number of variants; the page |
| Description | The component's `description` field, at most 600 characters. An empty field shows nothing: no placeholder, and no text written by the agent |
| Link | The `open_main` label, linked to the main component |
| Variants | One instance per variant with the variant name — 30 at most, then the `more` note with the rest |
| Properties | Name, type, default value, and options of every component property |
| Tokens | The names of the variables and styles bound on the main component (the default variant of a set), without duplicates — 40 at most, then the `more` note |

Samples are instances. When a variant's fonts cannot be loaded, its section shows the text parts without instances, and the component is returned in `skipped`.

```js
const ROOT_ID = '70:1', COMPONENT_ID = '40:9', PAGE_NAME = 'Components';
const LABELS = {}, FONT = 'Inter', BOLD = true;
const root = await get(ROOT_ID), node = await get(COMPONENT_ID);
if (!node || !['COMPONENT', 'COMPONENT_SET'].includes(node.type)) return { error: 'component not found' };
let page = root;
while (page.type !== 'PAGE') page = page.parent;
await figma.setCurrentPageAsync(page);
await Promise.all([fonts.regular, fonts.bold].map(f => figma.loadFontAsync(f)));
const name = `DS / Component / ${node.name} (${node.id})`;
if (root.children.some(c => c.name === name)) return { sectionId: root.children.find(c => c.name === name).id, added: 0, existing: 1, skipped: [], uncovered };
const isSet = node.type === 'COMPONENT_SET';
const variants = isSet ? node.children.filter(c => c.type === 'COMPONENT') : [node];
const fontsIn = n => [...new Set((n.type === 'TEXT' ? [n] : n.findAll(x => x.type === 'TEXT')).flatMap(t => (t.characters.length ? t.getRangeAllFontNames(0, t.characters.length) : [t.fontName])).map(f => JSON.stringify(f)))].map(f => JSON.parse(f));
const usable = await Promise.all(variants.slice(0, 30).map(v => Promise.all(fontsIn(v).map(f => figma.loadFontAsync(f))).then(() => true, () => false)));
const skipped = usable.every(Boolean) ? [] : [{ id: node.id, reason: 'fonts could not be loaded' }];
```

```js
const sec = add(root, stack(name, 'VERTICAL', 20), true);
add(sec, await fileLabel(node.name, { size: 28, bold: true }), true);
add(sec, await fileLabel([L(isSet ? 'kind_set' : 'kind_component'), L('variants_count', { n: variants.length }), L('page', { name: PAGE_NAME })].join(' · '), { size: 12, color: MUTED }));
const description = (node.description || '').trim().slice(0, 600);
if (description) add(sec, await fileLabel(description, { size: 14 }), true); // the designer's text, as it is
const link = add(sec, label(L('open_main'), { size: 12 }));
link.hyperlink = { type: 'NODE', value: node.id };
link.textDecoration = 'UNDERLINE';
if (!skipped.length) { // instances only: a main component is never cloned
  add(sec, label(L('variants'), { size: 14, bold: true }));
  const grid = stack('variants', 'HORIZONTAL', 24);
  grid.layoutWrap = 'WRAP'; grid.counterAxisSpacing = 24;
  add(sec, grid, true);
  for (const v of variants.slice(0, 30)) {
    const cell = add(grid, stack(itemName(v.id), 'VERTICAL', 8));
    add(cell, v.createInstance());
    add(cell, await fileLabel(isSet ? v.name : node.name, { size: 10, color: MUTED }));
  }
  if (variants.length > 30) add(sec, label(L('more', { n: variants.length - 30 }), { size: 12, color: MUTED }));
}
```

```js
const defs = Object.entries(node.componentPropertyDefinitions || {});
if (defs.length) {
  add(sec, label(L('properties'), { size: 14, bold: true }));
  const table = add(sec, stack('properties', 'VERTICAL', 6));
  for (const [key, d] of defs) {
    const value = [`${L('prop_type')}: ${d.type}`, `${L('prop_default')}: ${d.defaultValue}`, d.variantOptions ? `${L('prop_options')}: ${d.variantOptions.join(', ')}` : ''].filter(Boolean).join(' · ');
    const row = add(table, stack(key, 'HORIZONTAL', 16));
    add(row, await fileLabel(key.split('#')[0], { size: 12, bold: true }));
    add(row, await fileLabel(value, { size: 12, color: MUTED }));
  }
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
  add(sec, label(`${L('tokens')} (${tokens.length})`, { size: 14, bold: true }));
  add(sec, await fileLabel(tokens.slice(0, 40).join('\n'), { size: 12, color: MUTED }), true);
  if (tokens.length > 40) add(sec, label(L('more', { n: tokens.length - 40 }), { size: 12, color: MUTED }));
}
return { sectionId: sec.id, added: 1, existing: 0, variants: Math.min(variants.length, 30), tokens: tokens.length, described: !!description, skipped, uncovered };
```

**Icon grid.** Components the inventory marks `icon: true` share one section, `DS / Icons`: a grid of instances, each with its component name. One call adds at most 40.

```js
const ROOT_ID = '70:1', OFFSET = 0;
const ITEMS = ['12:3', '12:7']; // icon component or set IDs, at most 40
const LABELS = {}, FONT = 'Inter', BOLD = true;
if (ITEMS.length > 40) return { error: 'at most 40 icons per call' };
const root = await get(ROOT_ID);
let page = root;
while (page.type !== 'PAGE') page = page.parent;
await figma.setCurrentPageAsync(page);
await Promise.all([fonts.regular, fonts.bold].map(f => figma.loadFontAsync(f)));
const sec = sectionOf(root, 'DS / Icons', L('icons'));
const grid = groupOf(sec, '', true);
let added = 0, existing = 0;
const skipped = [];
for (const id of ITEMS) {
  if (hasItem(sec, id)) { existing++; continue; }
  const node = await get(id), main = node && node.type === 'COMPONENT_SET' ? node.defaultVariant : node;
  if (!main || main.type !== 'COMPONENT') { skipped.push({ id, reason: 'component not found' }); continue; }
  const cell = add(grid, stack(itemName(id), 'VERTICAL', 6));
  try { add(cell, main.createInstance()); add(cell, await fileLabel(node.name, { size: 10, color: MUTED })); added++; }
  catch (e) { cell.remove(); skipped.push({ id, reason: String(e && e.message ? e.message : e).slice(0, 160) }); }
}
return { sectionId: sec.id, added, existing, skipped, uncovered, nextOffset: OFFSET + ITEMS.length };
```

Order: `DS / Icons` first, then the component sections sorted by page order and then by name.

---

## 9. Batches, ledger, and recovery

| Batch | Limit per call |
|-------|----------------|
| Root frame and header | The first call |
| Tokens and styles (§7) | 20 items |
| Icons (§8) | 40 icons |
| Component section (§8) | 1 component |

Keep the document's progress in the ledger (build-recipes.md §2) under `doc`, and update it after every call:

```json
{
  "doc": {
    "wanted": true,
    "language": "繁體中文",
    "font": "Noto Sans TC",
    "pageId": "0:9",
    "created": true,
    "hostSectionId": null,
    "rootId": "70:1",
    "replaced": null,
    "counts": { "variables": 210, "textStyles": 9, "effectStyles": 3, "paintStyles": 0, "components": 12, "icons": 180 },
    "sections": {
      "DS / Color / Brand · System": { "status": "done", "items": 45, "nextOffset": null },
      "DS / Typography": { "status": "pending", "items": 0, "nextOffset": 0 },
      "DS / Component / Button (40:9)": { "status": "done", "items": 1, "nextOffset": null }
    },
    "skipped": [{ "id": "S:9f2c", "reason": "font could not be loaded: Brand Sans Bold · 57 / 64" }],
    "uncovered": []
  }
}
```

- `sections[name].nextOffset`: where the next batch of that section starts; `null` when the section is complete.
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

1. Build the new root beside the existing content (§6–§8) and verify it (§11).
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
const rows = root.children.map(s => ({ name: s.name, items: s.name.startsWith('DS / Component / ') ? 1 : s.findAll(n => n.name.startsWith('DS item / ')).length }));
return { rootId: root.id, size: { w: Math.round(root.width), h: Math.round(root.height) }, strangers: rows.filter(r => !r.name.startsWith('DS / ')).map(r => r.name), ...fit(rows, OFFSET) };
```

   Every section of the ledger is present with its item count. `strangers` lists children of the root that this skill did not name; report them.
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
