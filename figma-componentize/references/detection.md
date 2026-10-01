# Detection — Find, Group, and Review Component Candidates

> Used by `figma-componentize` steps 1–4. Everything in this file is read-only (Tier 0) except the grouping review board, which only adds a temporary Section.
> Scripts run through `use_figma` (pass `skillNames: "figma-componentize"`). `use_figma` starts every call on the first page, cannot load all pages, and returns at most 20 kB per call: work one page per call and page through results with `OFFSET` until `nextOffset` is `null`.

Contents

1. Prerequisites
2. Scope and baseline
3. UI patterns
4. Candidates and exclusions
5. Levels
6. Signatures and grouping rules
7. Reusing existing components
8. Confidence
9. Detection script
10. Existing component signatures
11. Grouping review board
12. Componentization plan

---

## 1. Prerequisites

Check all three before anything else. If one is missing, stop, say what is missing, and write nothing.

| Prerequisite | How to check |
|--------------|--------------|
| A write-capable `use_figma` tool | The host's tool list contains `use_figma` (read-only Figma tools such as `get_screenshot` alone are not enough) |
| The `figma-use` skill | The skill is listed and readable; read it before the first `use_figma` call |
| figma-m3-variables with Workflow F | Its SKILL.md has a "F. Tokenize hardcoded values" workflow and its `references/value-harvest.md` exists |

---

## 2. Scope and baseline

- Accepted scopes: one or more node URLs (section, frame, group, or a single UI element) or the current selection.
- Set `SINGLE_ELEMENT = true` when the designer pointed at one UI element (for example one raw button); the element itself then becomes a candidate.
- Resolve each root's page by walking `parent` up to the `PAGE`; run detection once per page.
- Ask the user to confirm or narrow the scope when it has more than 50 top-level frames or spans more than one page.
- Before any write, call `get_screenshot` for every scope root (for a section or page, its top-level frames; at most 20, tell the user when there are more) and keep the images as the baseline.

---

## 3. UI patterns

A container (frame or group) matches a pattern by **layer name** (English or Chinese, case-insensitive) or, for two patterns, by **anatomy**.

| Pattern | Name keywords | Anatomy fallback |
|---------|---------------|------------------|
| Icon Button | icon button, icon btn, 圖示按鈕 | — |
| Button | button, btn, cta, 按鈕 | Own fill, stroke, shadow, or radius; exactly one text plus at most two icons; 24–64 px tall; at most 400 px wide |
| Chip | chip, tag, pill, 標籤 | — |
| Badge | badge, counter, 徽章 | — |
| Avatar | avatar, 頭像 | — |
| Search Field | search, 搜尋 | — |
| Text Field | input, text field, textbox, 輸入框 | — |
| Selection Row | checkbox, radio, switch, toggle, 勾選, 開關 | — |
| List Item | list item, list row, cell, 列表項 | — |
| Card | card, tile, 卡片 | Own radius or shadow; at least 2 children and 1 text; at least 120 × 80 px |
| Tab Bar | tab bar, tabs, 分頁列 (at least 240 px wide) | — |
| Tab | tab, 頁籤 | — |
| Navigation Bar | nav, navigation, bottom nav, bottom bar, 導覽列 (at least 240 px wide) | — |
| Top App Bar | app bar, top bar, header, toolbar, 標題列 (at least 240 px wide) | — |
| Dialog | dialog, modal, popup, sheet, 對話框, 彈窗 | — |
| Snackbar | snackbar, toast | — |
| Menu Item | menu item, option, 選單項 | — |

A name match gives confidence `exact` (when the anatomy is consistent); an anatomy-only match gives `inferred`.

---

## 4. Candidates and exclusions

A container is a **candidate** when any of these is true:

1. It matches a pattern (§3).
2. Its core signature (§6) appears at least twice in the scope, and it has its own visual style or at least two children.
3. It is the scope root and `SINGLE_ELEMENT` is true.

Repetition is never required: one matching button is a candidate.

**Excluded** (counted in the result, never candidates):

| Excluded | Rule |
|----------|------|
| Existing components and instances | `COMPONENT`, `COMPONENT_SET`, `INSTANCE`, and everything inside them |
| Screen-level frames | Top-level frames (directly under a page or section, or the scope root when it is not a single element) 320–1920 px wide and at least 480 px tall |
| Layout-only wrappers | No own fill, stroke, effect, or radius, and at least one direct child is a candidate (a name-matched pattern wins over this rule) |
| Hidden layers | `visible === false`, with their children |
| Locked layers | `locked === true`, with their children — the IDs are reported; locking does not block plugin writes, but it signals the designer's intent |
| Lone text and shapes | Text and shape layers that are not inside any candidate |

| Node | Decision | Reason |
|------|----------|--------|
| Frame "Screen / Home", 390 × 844, top level | excluded | screen-level frame |
| Frame "Button", fill #6750A4, radius 20, one text child | atom candidate | button pattern |
| Frame "Frame 12", no fill, holds two buttons side by side | excluded | layout-only wrapper |
| Frame "Card", fill, radius 12, holds image, texts, and a button | molecule candidate | card pattern containing an atom |
| Instance of existing component "Icon/Star" | excluded | already an instance |
| Text "Welcome back" alone | excluded | lone text without a pattern |

---

## 5. Levels

| Level | Rule | Built |
|-------|------|-------|
| atom | Contains no other candidate | First |
| molecule | Contains at least one atom | Second |
| organism | Contains at least one molecule | Last |

A group's level is the highest level among its members.

---

## 6. Signatures and grouping rules

Each candidate gets four descriptions:

| Description | Contents | Used for |
|-------------|----------|----------|
| Core signature | Node roles in child order, auto-layout direction, recursively; icons and nested instances are left out | Candidates with the same core form one component |
| Layout signature | Core plus child positions and constraints inside frames without auto layout, and the size of fixed-size text boxes | Instances cannot override these; differences become `needs-review` variants |
| Style | Own fill, stroke, shadow, radius, padding, gap, height, and the first own text's color and size | `Style`, `Size`, and `State` variants, or drift |
| Content | Own texts, icon and instance slots (leading, trailing), image fills | Component properties |

Roles: `text`; `icon` (vector-like layers, layers named "icon" up to 48 px, small square instances); `instance` (other instances); `divider`; `image` (image fill); `container`; `shape`.

**Grouping rules**

| Difference between occurrences | Result |
|--------------------------------|--------|
| Only the text differs | One component with a TEXT property |
| A nested icon instance differs | One component with an INSTANCE_SWAP property |
| A leading icon exists in some occurrences | One component with a BOOLEAN property |
| Image fills differ | Same component; image kept as an instance override |
| Fill, stroke, or shadow category differs, anatomy is the same | Variants under `Style` (Filled, Outlined, Text, Tonal, Elevated) |
| Height differs beyond the near-value threshold | Variants under `Size` (Small/Large, Small/Medium/Large, XSmall–Large, XSmall–XLarge) |
| Reduced opacity or a state word in the layer name | Variants under `State` (Enabled, Disabled, Hovered, Pressed, Focused, Selected) |
| Child structure differs | Separate components |
| Values within the near-value thresholds (for example padding 15 vs 16) | Same variant; the drift is listed and left to Workflow F's review board |
| Child positions, constraints, or fixed text box sizes differ | Proposed as `Style` variants (for example `Filled`, `Filled 2`), marked `needs-review` |
| Same category, state, and size but colors, spacing, or layout differ beyond the threshold | A second style (for example `Filled 2`), marked `needs-review` |
| Raw (non-instance) icons differ | `needs-review`: make the icons components first |

Near-value thresholds match figma-m3-variables Workflow F: colors ΔE ≤ 3 with equal paint opacity; numbers within 1 px or 5% of the larger value, whichever is greater.

Style categories: stroke and shadow → `Elevated`; any stroke → `Outlined`; fill without stroke → `Tonal` when light (L* ≥ 85) and tinted (chroma ≥ 10), otherwise `Filled`; neither → `Text`.

Each property in the output carries its `slot` — the text index or the icon slot key (`leading icon#0`) — which the build and replacement scripts use to find the matching layer.

Property names: for controls (Button, Icon Button, Chip, Badge, Tab, Menu Item, Selection Row, Text Field, Search Field) texts become `Label`, `Label 2`, …; for containers (Card, List Item, Dialog, Snackbar, bars) `Headline`, `Supporting text`, `Text 3`, …; icon slots become `Show leading icon` (BOOLEAN) and `Leading icon` (INSTANCE_SWAP), likewise for `trailing icon` and `icon`.

Variant names are `Property=Value` pairs in the order Style, Size, State, using only the properties that have more than one value (for example `Style=Outlined, State=Disabled`). A component set holds at most 30 combinations; beyond that the group is `needs-review` and the plan splits it by one property.

Group names come from the pattern (`Button`, `List Item`); without a pattern, from the most common meaningful layer name. When two groups would share a name, both get the most distinctive word from their layer names (`Product Card`, `Promo Card`); without one they are numbered and marked `needs-review`.

---

## 7. Reusing existing components

Run the script in §10 on each page that holds local components (the Components page first) and pass its result as `KNOWN` to the detection script. A group whose core signature equals a known component's is marked `reuse`: its occurrences are later replaced with instances of the existing component, and no new component is built.

---

## 8. Confidence

| Confidence | When |
|------------|------|
| `exact` | At least half of the members match the pattern by name, and the layout signatures agree |
| `inferred` | Anatomy-only or repetition-only match |
| `needs-review` | Layout signatures differ, a second color style exists, raw icons differ, more than 5 sizes or 30 variants, or a name collision could not be resolved |

Ask about every `needs-review` group before building. The designer can rename, split, merge, or exclude any group.

---

## 9. Detection script

One script, split into blocks for reading — paste the blocks in order into one `use_figma` call. `MODE` selects the output: `groups` (group summaries), `members` (the occurrences of one group, needed for the plan and the replacement), or `candidates` (every candidate, for debugging). Every result is paged within 18,000 characters.

### 9-1 Inputs

```js
const SCOPE_IDS = ['1:2'];    // scope roots on ONE page
const SINGLE_ELEMENT = false; // true when the designer pointed at one UI element
const KNOWN = [];             // [{ id, name, core }] from §10
const MODE = 'groups';        // 'groups' | 'members' | 'candidates'
const GROUP = null;           // group name, for MODE 'members'
const OFFSET = 0;
```

### 9-2 Helpers

```js
const r2 = v => Math.round(v * 100) / 100;
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
const hex = c => '#' + [c.r, c.g, c.b].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
const nearNum = (a, b) => Math.abs(a - b) <= Math.max(1, 0.05 * Math.max(Math.abs(a), Math.abs(b)));
const nearPaint = (a, b) => (!a && !b) || (!!a && !!b && Math.abs(a.o - b.o) < 0.01 && deltaE(a.c, b.c) <= 3);
const uniq = list => [...new Set(list)];
const mode = list => { const m = new Map(); for (const x of list) m.set(x, (m.get(x) || 0) + 1); return [...m].sort((a, b) => b[1] - a[1])[0]?.[0]; };
const title = s => s.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, ch => ch.toUpperCase());
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
```

### 9-3 Classification

```js
const AUTO_NAME = /^(frame|group|rectangle|ellipse|vector|text|line|polygon|star|union|subtract|intersect|exclude|image|component|instance)( \d+)?$/i;
const PATTERNS = [
  ['Icon Button', /icon.?(button|btn)|圖示按鈕|图标按钮/], ['Button', /\b(button|btn|cta)\b|按鈕|按钮/],
  ['Chip', /\b(chip|tag|pill)\b|標籤|标签/], ['Badge', /\b(badge|counter)\b|徽章/], ['Avatar', /\bavatar\b|頭像|头像/],
  ['Search Field', /\bsearch\b|搜尋|搜索/], ['Text Field', /\b(input|text.?field|textfield|textbox)\b|輸入框|输入框/],
  ['Selection Row', /\b(checkbox|radio|switch|toggle)\b|勾選|開關|开关/], ['List Item', /\b(list.?item|list.?row|cell)\b|列表項|列表项/],
  ['Card', /\b(card|tile)\b|卡片/], ['Tab Bar', /\b(tab.?bar|tabs)\b|分頁列|标签栏/], ['Tab', /\btab\b|頁籤|页签/],
  ['Navigation Bar', /\b(nav|navigation|bottom.?nav|bottom.?bar)\b|導覽列|导航栏/],
  ['Top App Bar', /\b(app.?bar|top.?bar|header|toolbar)\b|標題列|顶栏/],
  ['Dialog', /\b(dialog|modal|popup|sheet)\b|對話框|对话框|彈窗|弹窗/], ['Snackbar', /\b(snackbar|toast)\b/],
  ['Menu Item', /\b(menu.?item|option)\b|選單項|菜单项/],
];
const WIDE = ['Tab Bar', 'Navigation Bar', 'Top App Bar'];
const CONTROLS = ['Button', 'Icon Button', 'Chip', 'Badge', 'Tab', 'Menu Item', 'Selection Row', 'Text Field', 'Search Field'];
const vis = l => (Array.isArray(l) ? l.filter(p => p.visible !== false) : []);
const radiusOf = n => (typeof n.cornerRadius === 'number' ? n.cornerRadius : Math.max(n.topLeftRadius || 0, n.topRightRadius || 0, n.bottomRightRadius || 0, n.bottomLeftRadius || 0));
const hasVisual = n => vis(n.fills).some(p => (p.opacity ?? 1) > 0) || vis(n.strokes).length > 0 || vis(n.effects).length > 0 || radiusOf(n) > 0;
const isContainer = n => ['FRAME', 'GROUP', 'SECTION', 'COMPONENT'].includes(n.type) && Array.isArray(n.children) && n.children.length > 0;
const countText = n => (n.children || []).reduce((s, c) => s + (c.type === 'TEXT' ? 1 : 0) + (isContainer(c) ? countText(c) : 0), 0);
function role(n) {
  if (n.type === 'TEXT') return 'text';
  const small = n.width <= 48 && n.height <= 48;
  if (n.type === 'INSTANCE') return /icon/i.test(n.name) || (small && Math.abs(n.width - n.height) < 1) ? 'icon' : 'instance';
  if (['VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'POLYGON'].includes(n.type) || (/icon/i.test(n.name) && small)) return 'icon';
  if (n.type === 'LINE' || /divider|separator/i.test(n.name)) return 'divider';
  if (vis(n.fills).some(p => p.type === 'IMAGE')) return 'image';
  return isContainer(n) ? 'container' : 'shape';
}
function patternOf(n) {
  const name = n.name.toLowerCase();
  const hit = PATTERNS.find(([p, re]) => re.test(name) && (!WIDE.includes(p) || n.width >= 240));
  if (hit) return { pattern: hit[0], by: 'name' };
  if (!hasVisual(n)) return null;
  const kids = n.children.filter(c => c.visible !== false);
  const texts = kids.filter(c => role(c) === 'text').length, icons = kids.filter(c => role(c) === 'icon').length;
  if (texts === 1 && icons <= 2 && kids.length === texts + icons && n.height >= 24 && n.height <= 64 && n.width <= 400) return { pattern: 'Button', by: 'anatomy' };
  if (kids.length >= 2 && countText(n) >= 1 && n.width >= 120 && n.height >= 80 && (radiusOf(n) > 0 || vis(n.effects).length > 0)) return { pattern: 'Card', by: 'anatomy' };
  return null;
}
```

### 9-4 Signatures, style, and content

```js
const SIG = new Map();
function sigs(n) {
  if (SIG.has(n.id)) return SIG.get(n.id);
  const r = role(n);
  let out;
  if (r === 'text') out = { core: 'T', layout: n.textAutoResize === 'NONE' ? `T[${Math.round(n.width)}x${Math.round(n.height)}]` : 'T' };
  else if (r !== 'container') out = { core: r[0].toUpperCase(), layout: r[0].toUpperCase() };
  else {
    const auto = n.layoutMode && n.layoutMode !== 'NONE' ? n.layoutMode[0] : 'N';
    const kids = n.children.filter(c => c.visible !== false && !['icon', 'instance'].includes(role(c)));
    const layout = kids.map(c => (auto !== 'N' ? sigs(c).layout
      : `${sigs(c).layout}@${Math.round(c.x)},${Math.round(c.y)}${c.constraints ? ':' + c.constraints.horizontal[0] + c.constraints.vertical[0] : ''}`));
    out = { core: `${auto}(${kids.map(c => sigs(c).core).join(',')})`, layout: `${auto}(${layout.join(',')})` };
  }
  SIG.set(n.id, out);
  return out;
}
const CAND = new Set();
const solid = l => { const p = vis(l).find(q => q.type === 'SOLID'); return p ? { c: p.color, o: r2(p.opacity ?? 1) } : null; };
function firstText(n) {
  for (const c of n.children || []) {
    if (c.visible === false || CAND.has(c.id)) continue;
    if (c.type === 'TEXT') return c;
    const t = isContainer(c) ? firstText(c) : null;
    if (t) return t;
  }
  return null;
}
function styleOf(n) {
  const t = firstText(n);
  return {
    fill: solid(n.fills), stroke: solid(n.strokes), shadow: vis(n.effects).some(e => e.type === 'DROP_SHADOW'), radius: radiusOf(n),
    h: Math.round(n.height), pad: [n.paddingLeft || 0, n.paddingRight || 0, n.paddingTop || 0, n.paddingBottom || 0], gap: n.itemSpacing || 0,
    text: t ? solid(t.fills) : null, size: t && typeof t.fontSize === 'number' ? t.fontSize : 0,
  };
}
const NUMS = [['radius', s => s.radius], ['paddingLeft', s => s.pad[0]], ['paddingRight', s => s.pad[1]], ['paddingTop', s => s.pad[2]], ['paddingBottom', s => s.pad[3]], ['gap', s => s.gap], ['fontSize', s => s.size]];
function compareStyle(a, b) { // null = not near; otherwise the list of drifting fields
  if (a.shadow !== b.shadow) return null;
  for (const k of ['fill', 'stroke', 'text']) if (!nearPaint(a[k], b[k])) return null;
  const drift = [];
  for (const k of ['fill', 'stroke', 'text']) if (a[k] && b[k] && deltaE(a[k].c, b[k].c) > 0.01) drift.push(`${k} color ${hex(a[k].c)} → ${hex(b[k].c)}`);
  for (const [name, get] of NUMS) {
    if (!nearNum(get(a), get(b))) return null;
    if (Math.abs(get(a) - get(b)) >= 0.01) drift.push(`${name} ${r2(get(a))} → ${r2(get(b))}`);
  }
  return drift;
}
function category(s) {
  if (s.shadow && (s.fill || s.stroke)) return 'Elevated';
  if (s.stroke) return 'Outlined';
  if (s.fill && s.fill.o >= 0.05) { const p = lab(s.fill.c); return p.L >= 85 && Math.hypot(p.a, p.b) >= 10 ? 'Tonal' : 'Filled'; }
  return 'Text';
}
const STATES = [['Disabled', /disabled|inactive|停用|不可用/], ['Hovered', /hover/], ['Pressed', /press/], ['Focused', /focus/], ['Selected', /selected|active|checked|選中|选中/]];
const stateOf = n => (STATES.find(([, re]) => re.test(n.name.toLowerCase())) || [(n.opacity ?? 1) < 1 ? 'Disabled' : 'Enabled'])[0];
function contentOf(n) {
  const texts = [], textIds = [], slots = [], images = [], imageIds = [];
  let seenText = false;
  (function walk(x) {
    for (const c of x.children || []) {
      if (c.visible === false || CAND.has(c.id)) continue;
      const r = role(c);
      if (r === 'text') { texts.push(c.characters); textIds.push(c.id); seenText = true; }
      else if (r === 'icon' || r === 'instance') {
        const label = r === 'instance' ? title(c.name.split('/').pop()).toLowerCase() : seenText ? 'trailing icon' : 'leading icon';
        slots.push({ id: c.id, label, name: c.name, inst: c.type === 'INSTANCE' });
      } else if (r === 'image') { images.push(vis(c.fills).map(p => p.imageHash || '').join(',')); imageIds.push(c.id); }
      if (r === 'container') walk(c);
    }
  })(n);
  const count = {};
  for (const s of slots) { s.key = `${s.label}#${count[s.label] || 0}`; count[s.label] = (count[s.label] || 0) + 1; }
  if (!texts.length) for (const s of slots) if (s.label.endsWith('icon')) { s.label = 'icon'; s.key = s.key.replace(/^.*icon#/, 'icon#'); }
  return { texts, textIds, slots, images, imageIds };
}
const fontsOf = n => { // every FontName used by the text layers in n
  const texts = n.type === 'TEXT' ? [n] : 'findAll' in n ? n.findAll(x => x.type === 'TEXT') : [];
  return uniq(texts.flatMap(t => (t.characters.length ? t.getRangeAllFontNames(0, t.characters.length) : [t.fontName])).map(f => JSON.stringify(f))).map(f => JSON.parse(f));
};
function pickVariant(raw, set) { // the variant of a component set whose style is nearest to a raw occurrence, or null
  CAND.clear();
  const s = styleOf(raw);
  let best = null;
  for (const v of set.children) {
    if (Math.abs((v.opacity ?? 1) - (raw.opacity ?? 1)) > 0.01 || !nearNum(v.height, raw.height)) continue;
    const d = compareStyle(styleOf(v), s);
    if (d && (!best || d.length < best.d.length)) best = { v, d };
  }
  return best ? best.v : null;
}
```

### 9-5 Walk and candidates

```js
const roots = await Promise.all(SCOPE_IDS.map(id => figma.getNodeByIdAsync(id)));
let page = roots[0];
while (page && page.type !== 'PAGE') page = page.parent;
await figma.setCurrentPageAsync(page);
const ex = { screen: 0, wrapper: 0, instance: 0, hidden: 0, lone: 0, locked: [] };
const post = []; // eligible containers, children before parents
function walk(n, top) {
  if (n.visible === false) { ex.hidden++; return; }
  if (n.locked) { ex.locked.push(n.id); return; }
  if (['INSTANCE', 'COMPONENT', 'COMPONENT_SET'].includes(n.type)) { ex.instance++; return; }
  if (!isContainer(n)) return;
  for (const c of n.children) walk(c, n.type === 'SECTION' || n.type === 'PAGE');
  post.push({ n, top });
}
for (const r of roots) {
  if (r.type === 'PAGE') for (const c of r.children) walk(c, true);
  else walk(r, r.type !== 'SECTION' && !SINGLE_ELEMENT);
}
const coreCount = new Map();
for (const { n } of post) if (n.type !== 'SECTION' && (hasVisual(n) || n.children.length >= 2)) coreCount.set(sigs(n).core, (coreCount.get(sigs(n).core) || 0) + 1);
const cands = [];
for (const { n, top } of post) {
  if (n.type === 'SECTION') continue;
  if (top && n.type === 'FRAME' && n.width >= 320 && n.width <= 1920 && n.height >= 480) { ex.screen++; continue; }
  const p = patternOf(n);
  if (!p && !hasVisual(n) && n.children.some(c => CAND.has(c.id))) { ex.wrapper++; continue; }
  const repeated = (coreCount.get(sigs(n).core) || 0) >= 2 && (hasVisual(n) || n.children.length >= 2);
  const isRoot = SINGLE_ELEMENT && roots.some(r => r.id === n.id);
  if (!p && !repeated && !isRoot) continue;
  CAND.add(n.id);
  cands.push({ id: n.id, n, pattern: p ? p.pattern : null, by: p ? p.by : 'repetition' });
}
const level = new Map();
const kidCands = n => (n.children || []).flatMap(k => (CAND.has(k.id) ? [k] : isContainer(k) ? kidCands(k) : []));
for (const c of cands) {
  c.kids = kidCands(c.n);
  level.set(c.id, Math.min(2, c.kids.reduce((m, k) => Math.max(m, level.get(k.id) + 1), 0)));
  c.level = ['atom', 'molecule', 'organism'][level.get(c.id)];
}
for (const r of roots) (function lone(x, inside) {
  for (const k of x.children || []) {
    if (k.visible === false || k.locked || ['INSTANCE', 'COMPONENT', 'COMPONENT_SET'].includes(k.type)) continue;
    const inC = inside || CAND.has(k.id);
    if (!isContainer(k)) { if (!inC) ex.lone++; } else lone(k, inC);
  }
})(r, CAND.has(r.id));
```

### 9-6 Grouping

```js
for (const c of cands) {
  Object.assign(c, sigs(c.n));
  c.st = styleOf(c.n);
  c.state = stateOf(c.n);
  c.content = contentOf(c.n);
  c.cat = category(c.st);
}
const SIZE_NAMES = { 2: ['Small', 'Large'], 3: ['Small', 'Medium', 'Large'], 4: ['XSmall', 'Small', 'Medium', 'Large'], 5: ['XSmall', 'Small', 'Medium', 'Large', 'XLarge'] };
const byCore = new Map();
for (const c of cands) { if (!byCore.has(c.core)) byCore.set(c.core, []); byCore.get(c.core).push(c); }
const groups = [];
for (const [core, members] of byCore) {
  const g = { core, members, notes: [], conf: 'exact', pattern: mode(members.map(m => m.pattern).filter(Boolean)) || null };
  if (!g.pattern || members.filter(m => m.by === 'name').length * 2 < members.length) g.conf = 'inferred';
  const flag = note => { g.conf = 'needs-review'; if (!g.notes.includes(note)) g.notes.push(note); };
  if (uniq(members.map(m => m.layout)).length > 1) flag('positions, constraints, or text box sizes differ');
  const heights = [];
  for (const h of members.map(m => m.st.h).sort((a, b) => a - b)) if (!heights.some(x => nearNum(x, h))) heights.push(h);
  if (heights.length > 5) flag('more than 5 sizes');
  for (const m of members) m.sizeV = heights.length > 1 ? (SIZE_NAMES[heights.length] || heights.map((_, i) => `Size ${i + 1}`))[heights.findIndex(h => nearNum(h, m.st.h))] : null;
  const buckets = [];
  for (const m of [...members].sort((a, b) => b.content.slots.length - a.content.slots.length)) {
    const cell = buckets.filter(b => b.cat === m.cat && b.state === m.state && b.size === m.sizeV);
    const sameLayout = cell.filter(b => b.ref.layout === m.layout);
    let b = sameLayout.find(x => compareStyle(x.ref.st, m.st) !== null);
    if (!b) {
      b = { cat: m.cat, state: m.state, size: m.sizeV, ref: m, name: cell.length ? `${m.cat} ${cell.length + 1}` : m.cat };
      if (cell.length) flag(`${m.cat} has more than one style: colors, spacing, or layout differ`);
      buckets.push(b);
    }
    m.styleV = b.name;
    m.drift = compareStyle(b.ref.st, m.st) || [];
  }
  const axes = {};
  const styles = uniq(members.map(m => m.styleV)).sort((a, b) => members.filter(m => m.styleV === b).length - members.filter(m => m.styleV === a).length);
  if (styles.length > 1) axes.Style = styles;
  const hOf = v => members.find(m => m.sizeV === v).st.h;
  if (heights.length > 1) axes.Size = uniq(members.map(m => m.sizeV)).sort((a, b) => hOf(a) - hOf(b));
  const states = uniq(members.map(m => m.state)).sort((a, b) => (a === 'Enabled' ? -1 : b === 'Enabled' ? 1 : 0));
  if (states.length > 1) axes.State = states;
  for (const m of members) m.variant = Object.keys(axes).map(k => `${k}=${k === 'Style' ? m.styleV : k === 'Size' ? m.sizeV : m.state}`).join(', ');
  const combos = uniq(members.map(m => m.variant));
  if (combos.length > 30) flag('more than 30 variants: split by one property');
  g.kind = Object.keys(axes).length ? 'set' : 'component';
  g.axes = axes;
  g.reps = {};
  for (const v of combos) g.reps[v || 'default'] = members.filter(m => m.variant === v).sort((a, b) => b.content.slots.length - a.content.slots.length || a.drift.length - b.drift.length)[0].id;
  g.props = [];
  const nT = members[0].content.texts.length;
  for (let i = 0; i < nT; i++) {
    if (uniq(members.map(m => m.content.texts[i])).length < 2) continue;
    const names = CONTROLS.includes(g.pattern) ? ['Label'] : ['Headline', 'Supporting text'];
    g.props.push({ type: 'TEXT', name: names[i] || (CONTROLS.includes(g.pattern) ? `Label ${i + 1}` : `Text ${i + 1}`), slot: i });
  }
  for (const key of uniq(members.flatMap(m => m.content.slots.map(s => s.key)))) {
    const found = members.map(m => m.content.slots.find(s => s.key === key));
    const label = found.find(Boolean).label;
    if (found.some(s => !s)) g.props.push({ type: 'BOOLEAN', name: `Show ${label}`, slot: key });
    if (uniq(found.filter(Boolean).map(s => s.name)).length > 1) {
      if (found.filter(Boolean).every(s => s.inst)) g.props.push({ type: 'INSTANCE_SWAP', name: label[0].toUpperCase() + label.slice(1), slot: key });
      else flag(`${label} differs but is not an instance: make the icons components first`);
    }
  }
  if (uniq(members.map(m => m.content.images.join('|'))).length > 1) g.notes.push('image fills differ: kept as instance overrides');
  g.level = ['atom', 'molecule', 'organism'][Math.max(...members.map(m => level.get(m.id)))];
  g.reuse = KNOWN.find(k => k.core === core) || null;
  groups.push(g);
}
```

### 9-7 Names and output

```js
const nameWords = m => m.n.name.split(/[\/\s_-]+/).filter(w => w && !AUTO_NAME.test(w) && !/^\d+$/.test(w));
const bases = groups.map(g => g.pattern || title(mode(g.members.filter(m => !AUTO_NAME.test(m.n.name)).map(m => m.n.name.split('/').pop())) || 'Component'));
for (const [i, g] of groups.entries()) {
  g.name = bases[i];
  if (bases.filter(b => b === bases[i]).length < 2) continue;
  const word = mode(g.members.flatMap(nameWords).filter(w => !bases[i].toLowerCase().split(' ').includes(w.toLowerCase())));
  if (word) g.name = `${title(word)} ${bases[i]}`;
  else { g.name = `${bases[i]} ${groups.slice(0, i).filter((_, j) => bases[j] === bases[i]).length + 1}`; g.conf = 'needs-review'; g.notes.push('name collision'); }
}
const groupOf = new Map(groups.flatMap(g => g.members.map(m => [m.id, g.name])));
groups.sort((a, b) => ['atom', 'molecule', 'organism'].indexOf(a.level) - ['atom', 'molecule', 'organism'].indexOf(b.level));
const summary = groups.map(g => ({
  name: g.name, pattern: g.pattern, level: g.level, kind: g.reuse ? 'reuse' : g.kind, conf: g.conf, axes: g.axes,
  props: g.props, count: g.members.length, reps: g.reps,
  contains: uniq(g.members.flatMap(m => m.kids.map(k => groupOf.get(k.id)))), reuse: g.reuse ? { id: g.reuse.id, name: g.reuse.name } : null,
  drift: g.members.filter(m => m.drift.length).length, notes: g.notes,
}));
const rows = MODE === 'members'
  ? (groups.find(g => g.name === GROUP)?.members || []).map(m => ({ id: m.id, variant: m.variant, parent: cands.find(c => c.kids.some(k => k.id === m.id))?.id || null, texts: m.content.texts, slots: m.content.slots.map(s => s.key), drift: m.drift }))
  : MODE === 'candidates' ? cands.map(c => ({ id: c.id, name: c.n.name, pattern: c.pattern, by: c.by, level: c.level, group: groupOf.get(c.id) }))
  : summary;
return { page: { id: page.id, name: page.name }, candidates: cands.length, excluded: { ...ex, locked: ex.locked.slice(0, 50) }, ...fit(rows, OFFSET) };
```

`MODE: 'members'` rows carry `parent` (the enclosing candidate, so the plan can find the outermost occurrences), the texts and slots for content mapping, and the drift list that is handed to Workflow F.

---

## 10. Existing component signatures

Run on each page that holds local components; paste blocks 9-2 to 9-4 first. Pass the result as `KNOWN`.

```js
const PAGE_ID = '0:5', OFFSET = 0;
const page = await figma.getNodeByIdAsync(PAGE_ID);
await figma.setCurrentPageAsync(page);
const comps = page.findAllWithCriteria({ types: ['COMPONENT'] }).filter(c => isContainer(c));
const known = comps.map(c => ({
  id: c.parent?.type === 'COMPONENT_SET' ? c.parent.id : c.id,
  name: c.parent?.type === 'COMPONENT_SET' ? `${c.parent.name} (${c.name})` : c.name,
  core: sigs(c).core,
}));
return fit(known, OFFSET);
```

---

## 11. Grouping review board

Built after detection, before the plan. It only **adds** a Section; it never moves or edits existing layers.

- **Placement**: a Section named exactly `Componentize Review — temporary` on the page that contains the scope, 400 px to the right of the rightmost existing node.
- **Rows**: one per proposed group — a heading (`Button · exact · set`), the mapping (`Style: Filled, Outlined · TEXT: Label`), the occurrence count, notes, then up to four clones of representative occurrences (the `reps` first), each scaled to fit 400 px wide.
- Fonts used inside a sample are loaded before it is cloned (appending text layers with unloaded fonts fails).
- Paste helper blocks 9-2 to 9-4 first (`uniq`, `fontsOf`).

```js
const PAGE_ID = '0:1';
const ROWS = [{ name: 'Button', conf: 'exact', kind: 'set', mapping: 'Style: Filled, Outlined · TEXT: Label', count: 3, notes: [], samples: ['1:20', '1:31'] }];
const page = await figma.getNodeByIdAsync(PAGE_ID);
await figma.setCurrentPageAsync(page);
await Promise.all(['Regular', 'Bold'].map(style => figma.loadFontAsync({ family: 'Inter', style })));
async function loadFonts(n) {
  try { await Promise.all(fontsOf(n).map(f => figma.loadFontAsync(f))); return true; } catch (e) { return false; }
}
const label = (chars, size = 12, bold = false) => { const t = figma.createText(); t.fontName = { family: 'Inter', style: bold ? 'Bold' : 'Regular' }; t.fontSize = size; t.characters = chars; return t; };
const stack = (name, dir, gap) => { const f = figma.createFrame(); f.name = name; f.layoutMode = dir; f.itemSpacing = gap; f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'AUTO'; f.fills = []; return f; };
```

```js
const right = page.children.reduce((x, n) => Math.max(x, n.x + n.width), 0);
const section = figma.createSection();
section.name = 'Componentize Review — temporary';
section.x = right + 400;
section.y = 0;
const board = stack('Review groups', 'VERTICAL', 48);
board.paddingTop = board.paddingBottom = board.paddingLeft = board.paddingRight = 40;
board.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
board.appendChild(label('Componentize review — accept, rename, split, merge, or exclude each group; this section is removed afterwards', 16, true));
const skipped = [];
for (const r of ROWS) {
  const row = stack(r.name, 'VERTICAL', 12);
  row.appendChild(label(`${r.name} · ${r.conf} · ${r.kind} · ${r.count} occurrences`, 14, true));
  row.appendChild(label(`${r.mapping}${r.notes.length ? ' · ' + r.notes.join('; ') : ''}`));
  const line = stack(`${r.name} samples`, 'HORIZONTAL', 24);
  for (const id of r.samples.slice(0, 4)) {
    const src = await figma.getNodeByIdAsync(id);
    if (!src || !(await loadFonts(src))) { skipped.push(id); continue; }
    const copy = src.clone();
    line.appendChild(copy);
    if (copy.width > 400) copy.rescale(400 / copy.width);
  }
  row.appendChild(line);
  board.appendChild(row);
}
section.appendChild(board);
board.x = 40;
board.y = 40;
section.resizeWithoutConstraints(board.width + 80, board.height + 80);
return { sectionId: section.id, pageId: page.id, rows: ROWS.length, skippedSamples: skipped };
```

Then:

1. `get_screenshot` of the Section, and the link `https://www.figma.com/design/{fileKey}/?node-id={sectionId with ":" replaced by "-"}`.
2. Ask per group (up to four groups per question-tool call): accept, rename, split, merge with another group, or exclude. Ask every `needs-review` note explicitly.
3. Re-run detection with the decisions applied where needed (for example after a split, run `MODE: 'members'` to list each new group's occurrences).
4. Remove the board unless the user wants to keep it:

```js
const s = await figma.getNodeByIdAsync(SECTION_ID);
if (s && s.type === 'SECTION' && s.name === 'Componentize Review — temporary') s.remove();
return { removed: !!s };
```

---

## 12. Componentization plan

Shown after the review, before any other write; wait for confirmation.

```
## Componentization plan — {scope}
Target page: Components (existing) · Restore point: ask the user to save a version first
Tier 2: create 3 components (1 set with 2 variants), 4 properties, 3 sections
Tier 3 (asked again later): replace 11 occurrences with instances
```

| Section | Columns |
|---------|---------|
| Components | name, kind (component or set), level, variants (`axes`), properties, contains, representative per variant (`reps`), occurrence IDs (from `MODE: 'members'`), confidence |
| Reused | group, existing component, occurrence IDs |
| Excluded | node or count, reason (screen, wrapper, instance, hidden, locked IDs, lone) |
| Drift for Workflow F | occurrence ID, drifting fields |
| Questions | every `needs-review` note |

Build order: atoms, then molecules, then organisms (summary rows are already sorted by level). Outermost occurrences for the replacement are the members whose `parent` is `null` or belongs to a group that is not being replaced.
