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
10. Existing component inventory
11. Grouping review board
12. Componentization plan

---

## 1. Prerequisites

Check all three before anything else. If one is missing, stop, say what is missing, and write nothing. A document-only run (documentation.md §2) needs only the first two.

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
- After the scope is confirmed and before detection starts, ask whether a design system document is to be generated at the end: **Yes** · **No** (documentation.md §2).
  - **Yes**: ask the language of its headings and labels — **English** (default), **繁體中文**, or another language the designer names.
  - **No**: no inventory, no write, and no document part in the report. Do not ask again in this run.
- Record the answers in the ledger as `doc.wanted` and `doc.language` when the ledger starts (build-recipes.md §2).

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

Existing local components are used first; a new component is built only when none fits or the designer decides so. Components from team libraries are not matched.

**Order**

1. Run detection (§9) on each scope page with `KNOWN = []`.
2. Run the inventory (§10) with the groups' `core`, `name`, and `pattern`.
3. When the inventory is not empty, run detection again with `KNOWN`. The groups then carry `reuse`, `alternatives`, and `clash`, and every `MODE: 'members'` row carries `known`.

**Candidates.** A local component (or component set) is a reuse candidate for a group only when one of its variants has the group's core signature, because content is carried over by structural position (replacement.md §4). Each candidate gets two kinds of evidence.

| Name evidence | When |
|---------------|------|
| `agree` | At least half of the group's occurrences were recognized by layer name (`byName`) and the component's name gives the same pattern; or the group's most common meaningful layer name equals the component's name after normalization (last path segment, lowercase, letters and digits only) |
| `conflict` | `byName` is true, the component's name gives a pattern, and the two patterns differ (Button vs Chip) |
| `neutral` | Anything else. A pattern inferred only from anatomy or repetition is not name evidence: an unnamed chip is recognized as a Button by anatomy |

**Style evidence** is per occurrence. An occurrence is **covered** when the component has a variant with the same core, the same layer opacity, a height within the near-value threshold, and a style within the near-value thresholds of §6; among several, the variant with the fewest differing fields is assigned. Otherwise the occurrence is **uncovered**.

| Name evidence | Occurrences | `reuse.quality` | What happens |
|---------------|-------------|-----------------|--------------|
| `agree` | all covered | `exact` | Reused without a question; the group's `kind` is `reuse` |
| `agree` | some or none covered | `partial` | Covered occurrences are reused; ask about the uncovered ones (§11); `needs-review` |
| `neutral` | all covered | `unconfirmed` | Reuse is proposed; ask (§11); `needs-review` |
| `neutral` | some or none covered | — | Not reused; listed in `alternatives` |
| `conflict` | any | — | Not reused; listed in `alternatives` |

**Ranking** when several components qualify: `agree` before `neutral`; then more covered occurrences; then fewer differing style fields in total; then the order of `KNOWN` (Components page first). When the two best are equal on the first three, nothing is chosen: the group is `needs-review`, both are in `alternatives`, and the designer picks.

**Output**

- `reuse`: `{ id, name, isSet, quality, evidence, covered, uncovered, forced }`. `id` is the component set, or the standalone component. `uncovered` maps each variant name of the uncovered occurrences (`default` for a group without variants) to `{ count, nearest }`; `nearest` is the existing variant with the fewest differing fields, used when a variant is added (build-recipes.md §8).
- `alternatives`: at most three other components with the same core: `{ id, name, evidence, covered }`.
- `known` (members rows): the assigned variant ID, or `null`. Replacement and the build use this ID as it is (replacement.md §2, build-recipes.md §1). For a covered occurrence, `drift` lists its differences from the assigned variant, so they reach Workflow F's review board like any other drift.
- `clash`: `{ id, name }` of a local component whose normalized name equals the group's name and that is not the group's reuse target; the group is `needs-review` (§11). Never build a component whose normalized name equals a local component's.

**Designer decisions** come back through `REUSE`, keyed by core signature (group names can change during the review): a component or set ID reuses that component without name evidence (`quality` is `exact` when every occurrence is covered, otherwise `partial`); `false` reuses nothing for that core.

---

## 8. Confidence

| Confidence | When |
|------------|------|
| `exact` | At least half of the members match the pattern by name, and the layout signatures agree |
| `inferred` | Anatomy-only or repetition-only match |
| `needs-review` | Layout signatures differ, a second color style exists, raw icons differ, more than 5 sizes or 30 variants, a name collision could not be resolved, a reuse match is `partial` or `unconfirmed`, two local components match equally, or a local component has the same name (§7) |

Ask about every `needs-review` group before building. The designer can rename, split, merge, or exclude any group.

---

## 9. Detection script

One script, split into blocks for reading — paste the blocks in order into one `use_figma` call. `MODE` selects the output: `groups` (group summaries), `members` (the occurrences of one group, needed for the plan and the replacement), or `candidates` (every candidate, for debugging). Every result is paged within 18,000 characters.

### 9-1 Inputs

```js
const SCOPE_IDS = ['1:2'];    // scope roots on ONE page
const SINGLE_ELEMENT = false; // true when the designer pointed at one UI element
const KNOWN = [];             // inventory entries from §10; [] on the first run
const REUSE = {};             // designer decisions by core: { 'H(T)': '40:9' } reuses that component or set, { 'H(T)': false } reuses nothing
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
const normName = s => String(s).split('/').pop().toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''); // last path segment, lowercase, letters and digits only
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
const namePattern = (name, width = Infinity) => (PATTERNS.find(([p, re]) => re.test(name.toLowerCase()) && (!WIDE.includes(p) || width >= 240)) || [null])[0];
function patternOf(n) {
  const named = namePattern(n.name, n.width);
  if (named) return { pattern: named, by: 'name' };
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
const diffCount = (a, b) => (a.shadow !== b.shadow ? 1 : 0) + (nearNum(a.h, b.h) ? 0 : 1) + ['fill', 'stroke', 'text'].filter(k => !nearPaint(a[k], b[k])).length + NUMS.filter(([, get]) => !nearNum(get(a), get(b))).length;
const evidenceOf = (g, k) => ((g.byName && k.pattern === g.pattern) || (g.label && normName(g.label) === normName(k.name)) ? 'agree'
  : g.byName && k.pattern && k.pattern !== g.pattern ? 'conflict' : 'neutral');
function matchKnown(g, id, entries) { // one local component or set against one group: the nearest variant for every occurrence
  const picks = new Map();
  let fields = 0;
  for (const m of g.members) {
    let best = null;
    for (const k of entries) {
      if (Math.abs(k.op - (m.n.opacity ?? 1)) > 0.01 || !nearNum(k.st.h, m.st.h)) continue;
      const d = compareStyle(k.st, m.st);
      if (d && (!best || d.length < best.d.length)) best = { k, d };
    }
    if (best) { picks.set(m.id, best); fields += best.d.length; }
  }
  return { id, name: entries[0].name, isSet: !!entries[0].setId, evidence: evidenceOf(g, entries[0]), entries, picks, covered: picks.size, fields };
}
const rankOf = x => [['agree', 'neutral', 'conflict'].indexOf(x.evidence), -x.covered, x.fields];
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
  g.byName = !!g.pattern && members.filter(m => m.by === 'name').length * 2 >= members.length;
  g.label = mode(members.filter(m => !AUTO_NAME.test(m.n.name)).map(m => m.n.name)) || null;
  const sameCore = new Map(), forced = REUSE[core];
  for (const k of KNOWN) if (k.core === core) { const id = k.setId || k.id; if (!sameCore.has(id)) sameCore.set(id, []); sameCore.get(id).push(k); }
  const ranked = forced === false ? [] : [...sameCore].map(([id, entries]) => matchKnown(g, id, entries)).sort((a, b) => rankOf(a).map((v, i) => v - rankOf(b)[i]).find(v => v) || 0);
  const usable = forced ? ranked.filter(x => x.id === forced) : ranked.filter(x => x.evidence === 'agree' || (x.evidence === 'neutral' && x.covered === members.length));
  let top = usable[0] || null;
  if (top && !forced && usable[1] && rankOf(usable[1]).join() === rankOf(top).join()) {
    flag(`two local components match equally: ${top.name} (${top.id}), ${usable[1].name} (${usable[1].id}) — ask which one to reuse`);
    top = null;
  }
  g.reuse = null;
  for (const m of members) m.known = null;
  if (top) {
    const uncovered = {};
    for (const m of members) {
      const pick = top.picks.get(m.id);
      if (pick) { m.known = pick.k.id; m.drift = pick.d; continue; }
      const key = m.variant || 'default';
      if (!uncovered[key]) uncovered[key] = { count: 0, nearest: [...top.entries].sort((a, b) => diffCount(a.st, m.st) - diffCount(b.st, m.st))[0].id };
      uncovered[key].count++;
    }
    const quality = top.covered < members.length ? 'partial' : forced || top.evidence === 'agree' ? 'exact' : 'unconfirmed';
    g.reuse = { id: top.id, name: top.name, isSet: top.isSet, quality, evidence: top.evidence, covered: top.covered, uncovered, forced: !!forced };
    if (quality === 'partial') flag(`no variant of the local component ${top.name} fits ${members.length - top.covered} occurrence(s): ask to add a variant, build a new component, or keep them`);
    if (quality === 'unconfirmed') flag(`same structure and look as the local component ${top.name}, but the names do not confirm it: ask whether to reuse it`);
  }
  g.alternatives = ranked.filter(x => x !== top).slice(0, 3).map(x => ({ id: x.id, name: x.name, evidence: x.evidence, covered: x.covered }));
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
for (const g of groups) { // a local component with the same name that is not the reuse target
  const hit = g.reuse && g.reuse.quality === 'exact' ? null : KNOWN.find(k => normName(k.name) === normName(g.name) && (k.setId || k.id) !== (g.reuse && g.reuse.id));
  g.clash = hit ? { id: hit.setId || hit.id, name: hit.name } : null;
  if (hit) { g.conf = 'needs-review'; g.notes.push(`a local component named "${hit.name}" exists${hit.core === g.core ? '' : ' with a different layer structure'}: ask for a distinct name, or exclude`); }
}
const groupOf = new Map(groups.flatMap(g => g.members.map(m => [m.id, g.name])));
groups.sort((a, b) => ['atom', 'molecule', 'organism'].indexOf(a.level) - ['atom', 'molecule', 'organism'].indexOf(b.level));
const summary = groups.map(g => ({
  name: g.name, pattern: g.pattern, level: g.level, kind: g.reuse && g.reuse.quality === 'exact' ? 'reuse' : g.kind, conf: g.conf, axes: g.axes,
  props: g.props, count: g.members.length, reps: g.reps,
  contains: uniq(g.members.flatMap(m => m.kids.map(k => groupOf.get(k.id)))),
  core: g.core, byName: g.byName, reuse: g.reuse, alternatives: g.alternatives, clash: g.clash,
  drift: g.members.filter(m => m.drift.length).length, notes: g.notes,
}));
const rows = MODE === 'members'
  ? (groups.find(g => g.name === GROUP)?.members || []).map(m => ({ id: m.id, variant: m.variant, parent: cands.find(c => c.kids.some(k => k.id === m.id))?.id || null, texts: m.content.texts, slots: m.content.slots.map(s => s.key), drift: m.drift, known: m.known }))
  : MODE === 'candidates' ? cands.map(c => ({ id: c.id, name: c.n.name, pattern: c.pattern, by: c.by, level: c.level, group: groupOf.get(c.id) }))
  : summary;
return { page: { id: page.id, name: page.name }, candidates: cands.length, excluded: { ...ex, locked: ex.locked.slice(0, 50) }, ...fit(rows, OFFSET) };
```

`MODE: 'members'` rows carry `parent` (the enclosing candidate, so the plan can find the outermost occurrences), the texts and slots for content mapping, the drift list that is handed to Workflow F, and `known` (the existing variant assigned in §7, or `null`).

---

## 10. Existing component inventory

The inventory lists the local component variants that can matter to the candidate groups, with the data the match in §7 needs. Run it **after** the first detection run, once per page that holds local components (the Components page first), and join the pages' `items` into `KNOWN`. Paste blocks 9-2 to 9-4 first.

- `CORES`: the `core` of every group from the first detection run.
- `NAMES`: the `name` and `pattern` of every group, as returned (the script normalizes them).
- `IDS`: component or component set IDs the designer named (§11), otherwise empty.

An entry is returned when its ID or its set's ID is in `IDS` (`why: 'id'`), its core signature is in `CORES` (`why: 'core'`), or its normalized name or its name's pattern is in `NAMES` (`why: 'name'`). Everything else is left out, so the inventory stays small even in a large library. Each page of the result stays within 18,000 characters; request further pages until `nextOffset` is `null`.

```js
const PAGE_ID = '0:5', OFFSET = 0;
const CORES = ['H(T)'], NAMES = ['Button'], IDS = [];
const page = await figma.getNodeByIdAsync(PAGE_ID);
await figma.setCurrentPageAsync(page);
const wanted = new Set(NAMES.filter(Boolean).map(normName));
const r5 = v => Math.round(v * 1e5) / 1e5;
const slim = p => (p ? { c: { r: r5(p.c.r), g: r5(p.c.g), b: r5(p.c.b) }, o: p.o } : null);
const known = [];
for (const c of page.findAllWithCriteria({ types: ['COMPONENT'] }).filter(c => isContainer(c))) {
  const set = c.parent?.type === 'COMPONENT_SET' ? c.parent : null;
  const name = set ? set.name : c.name, core = sigs(c).core, pattern = namePattern(name, c.width);
  const why = IDS.includes(c.id) || (set && IDS.includes(set.id)) ? 'id'
    : CORES.includes(core) ? 'core'
    : wanted.has(normName(name)) || (pattern && wanted.has(normName(pattern))) ? 'name' : null;
  if (!why) continue;
  const st = styleOf(c);
  known.push({ id: c.id, setId: set ? set.id : null, name, variant: set ? c.name : null, core, pattern, op: r2(c.opacity ?? 1), st: { ...st, fill: slim(st.fill), stroke: slim(st.stroke), text: slim(st.text) }, why });
}
return fit(known, OFFSET);
```

| Field | Meaning |
|-------|---------|
| `id` | The variant, or the standalone component |
| `setId` | Its component set; `null` for a standalone component |
| `name`, `variant` | The set (or component) name, and the variant name such as `Style=Filled` (`null` for a standalone component) |
| `core` | Core signature (§6) |
| `pattern` | The UI pattern recognized from the name alone (§3), or `null` |
| `op`, `st` | Layer opacity, and the same style fields detection uses for grouping (9-4 `styleOf`) |
| `why` | `core`, `name`, or `id` |

When the inventory is empty on every page, skip the match: no group is reused, and the first detection run is the result. Otherwise run detection again with `KNOWN` (§7).

---

## 11. Grouping review board

Built after detection (the run with `KNOWN`, when the inventory is not empty), before the plan. It only **adds** a Section; it never moves or edits existing layers.

- **Placement**: a Section named exactly `Componentize Review — temporary` on the page that contains the scope, 400 px to the right of the rightmost existing node.
- **Rows**: one per proposed group — a heading (`Button · exact · set`), the mapping (`Style: Filled, Outlined · TEXT: Label`), the occurrence count, notes, then up to four clones of representative occurrences (the `reps` first), each scaled to fit 400 px wide.
- **Pairing**: a group with `reuse` or `alternatives` (§7) also shows the existing components beside its raw samples, each with a caption (component name, variant name, and the match quality or the name evidence):
  - `match`: at most two of the assigned variants (the most used `known` values; when no occurrence is covered, the `nearest` variants of `reuse.uncovered`), with `reuse.quality` as the tag;
  - `alts`: at most three `alternatives`, one sample each, with their `evidence` as the tag.

  These samples are **instances**. Never clone a main component or a component set: a clone of a main component is a new component in the file. The samples are removed with the board.
- Fonts used inside a sample are loaded before it is cloned or instantiated (appending text layers with unloaded fonts fails). A sample whose fonts cannot be loaded is skipped and listed in `skippedSamples`; ask the questions anyway.
- Paste helper blocks 9-2 to 9-4 first (`uniq`, `fontsOf`).

```js
const PAGE_ID = '0:1';
const ROWS = [{ name: 'Button', conf: 'needs-review', kind: 'set', mapping: 'Style: Filled, Outlined · TEXT: Label', count: 3, notes: [], samples: ['1:20', '1:31'],
  match: { ids: ['40:2'], tag: 'partial' }, alts: [{ id: '12:30', tag: 'conflict' }] }]; // match: null and alts: [] for a group without existing components
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
board.appendChild(label('Componentize review — accept, rename, split, merge, or exclude each group; for existing components: reuse, build new instead, or reuse another one; this section is removed afterwards', 16, true));
const skipped = [];
async function existing(line, id, prefix, tag) { // a sample of a local component: always an instance, never a clone of the main component
  const node = await figma.getNodeByIdAsync(id);
  const main = node && node.type === 'COMPONENT_SET' ? node.defaultVariant : node;
  if (!main || main.type !== 'COMPONENT' || !(await loadFonts(main))) { skipped.push(id); return; }
  const inSet = main.parent && main.parent.type === 'COMPONENT_SET';
  const cell = stack(`${prefix} ${id}`, 'VERTICAL', 8);
  cell.appendChild(label(`${prefix}: ${inSet ? `${main.parent.name} · ${main.name}` : main.name} · ${tag}`));
  const inst = main.createInstance();
  cell.appendChild(inst);
  if (inst.width > 400) inst.rescale(400 / inst.width);
  line.appendChild(cell);
}
for (const r of ROWS) {
  const row = stack(r.name, 'VERTICAL', 12);
  row.appendChild(label(`${r.name} · ${r.conf} · ${r.kind} · ${r.count} occurrences`, 14, true));
  row.appendChild(label(`${r.mapping}${r.notes.length ? ' · ' + r.notes.join('; ') : ''}`));
  const line = stack(`${r.name} samples`, 'HORIZONTAL', 24);
  for (const id of r.samples.slice(0, 4)) {
    const src = await figma.getNodeByIdAsync(id);
    if (!src || ['COMPONENT', 'COMPONENT_SET'].includes(src.type) || !(await loadFonts(src))) { skipped.push(id); continue; } // raw occurrences only
    const copy = src.clone();
    line.appendChild(copy);
    if (copy.width > 400) copy.rescale(400 / copy.width);
  }
  if (r.match) for (const id of r.match.ids.slice(0, 2)) await existing(line, id, 'existing', r.match.tag);
  for (const a of (r.alts || []).slice(0, 3)) await existing(line, a.id, 'same structure', a.tag);
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
3. Ask the reuse questions below for every group that has `reuse`, `alternatives`, or `clash`.
4. Re-run detection with the decisions applied where needed: after a split, run `MODE: 'members'` to list each new group's occurrences; after a reuse decision, run `groups` and `members` again with `REUSE`.
5. Remove the board unless the user wants to keep it (script below).

**Reuse questions**

| The group has | Ask | Options |
|---------------|-----|---------|
| `reuse.quality` `exact` | Nothing extra; show the pairing in the group question | **Reuse {name}** (accept) · **Build new instead** · **Reuse another component** |
| `reuse.quality` `unconfirmed` | "These are built and look like the local component {name}. Reuse it?" | **Reuse {name}** · **Build new instead** · **Reuse another component** · **Keep as they are** |
| `reuse.quality` `partial` | One question per key of `reuse.uncovered`: "{count} occurrence(s) ({variant}) have no matching variant in {name}." | **Add a variant to {name}** · **Build a new component** · **Keep as they are** |
| No `reuse`, `alternatives` not empty | In the group question, name the components with the same structure and why none was chosen (`conflict`: the names say a different kind of UI; `neutral`: the look differs) | accept (the group is built as new) · **Reuse another component** |
| The note "two local components match equally" | "Which one should be reused?" | Each listed component · **Build new instead** |
| `clash` | "A local component named {name} already exists. What should the new one be called?" | A proposed distinct name · another name · **Exclude** |

**Applying the answers**

- **Reuse {name}** (for `unconfirmed`, or one of two equal components) and **Reuse another component** with a listed alternative: set `REUSE[core]` to that component or set ID and re-run detection. Name evidence is not required for a component the designer picked; style coverage is still computed, and a `partial` result leads to the uncovered question.
- **Reuse another component** with a component the designer names by link or by name: run the inventory (§10) with its ID in `IDS`. When its `core` equals the group's, proceed as above. When it differs, do not use it as a reuse target: say that the layer structure differs, so an instance cannot be proven to look the same, and ask **Build a new component** or **Keep as they are**.
- **Build new instead**: set `REUSE[core]` to `false`, re-run detection, and record in the plan that the reuse of {name} was declined.
- **Add a variant to {name}** (only offered when `reuse.isSet` is true): record the set, the `nearest` variant, the representative (the first uncovered occurrence of that variant), and the occurrence IDs. Propose the variant name as the nearest variant's name with one property value changed, and ask the designer to confirm or edit it; the name must use the set's own variant properties (build-recipes.md §8). This is a Tier 2 change that only this explicit choice allows; an earlier "apply everything automatically" does not.
- **Build a new component** (uncovered occurrences): the members rows with `known: null` and that `variant` become a separate group in the plan, with the first of them as the representative. Ask for its name.
- **Keep as they are**: those occurrences are not replaced. List them in the plan and the report with the reason `no matching variant — kept by the designer`.
- When `reuse.isSet` is false, offer only **Build a new component** and **Keep as they are**, and say why: "{name} is a single component, not a component set, so a variant cannot be added. To add one, combine it into a component set in Figma, then run detection again."
- Covered occurrences are replaced with the existing component whatever the answer about the uncovered ones. Never leave an uncovered occurrence without a decision, and do not build, add, or replace anything for that group before the decision.
- **Names**: a new component's normalized name must differ from every local component's. Propose a name that adds the style or a descriptive word from the layer names (`Outlined Button`). After every rename, split, **Build new instead**, and **Build a new component** answer, check the new name again (run the inventory with the name in `NAMES` when it was not covered before); when it equals a local component's name, ask again and build nothing for that group.

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
Tier 2: create 3 components (1 set with 2 variants), 4 properties, 3 sections · add 1 variant to an existing set · generate the design system document (page Design System)
Tier 3 (asked again later): replace 11 occurrences with instances
```

When the designer answered **Yes** to the document question (§2), the Tier 2 line also lists the document step with its target page, as above. After a **No**, leave that part out.

| Section | Columns |
|---------|---------|
| Components | name, kind (component or set), level, variants (`axes`), properties, contains, representative per variant (`reps`), occurrence IDs (from `MODE: 'members'`), confidence |
| Reused | group, existing component (ID), match quality, occurrences per assigned variant (`Style=Filled` 40:2 × 6) |
| Added variants | existing set, new variant name, nearest variant, representative, occurrence IDs |
| Built instead of reused | group, the existing component whose reuse the designer declined, the new name |
| Kept by decision | occurrence IDs, reason (`no matching variant — kept by the designer`) |
| Excluded | node or count, reason (screen, wrapper, instance, hidden, locked IDs, lone) |
| Drift for Workflow F | occurrence ID, drifting fields |
| Design system document | only after a **Yes** (§2): target page (or the fallback Section `Design System`), language (`doc.language`), and that it covers every local token and component of the file (documentation.md) |
| Questions | every `needs-review` note |

Build order: atoms, then molecules, then organisms (summary rows are already sorted by level). Outermost occurrences for the replacement are the members whose `parent` is `null` or belongs to a group that is not being replaced.
