# Value Harvest — Workflow F details

> Turn hardcoded values in an existing design into Ref → Sys → Comp tokens **without changing how the design looks**.
> SKILL.md Workflow F lists the steps; this file holds the rules, scripts, thresholds, and formats.
> Helpers (`r2`, `m`, `hex`, `lab`, `deltaE`, `tone`, `hueFamily`, `encodeNum`, `bindPaint`, …) come from [binding-recipes.md](binding-recipes.md) §1; naming rules come from [token-spec.md](token-spec.md).

Contents

1. Scope and baseline
2. Harvest script
3. What is skipped
4. Normalization
5. Identical values and existing tokens
6. Near values and off-scale values
7. Review board
8. Semantic mapping (Sys)
9. Anatomy mapping (Comp)
10. Token plan
11. Write order
12. Verification and cleanup
13. Report and interface for other skills

---

## 1. Scope and baseline

Accepted scopes: a node URL (frame, section, component, component set), several node URLs, the current selection, or a page. Another skill (for example `figma-componentize`) can pass a list of node IDs plus optional component names.

1. Resolve every scope root with `figma.getNodeByIdAsync` and find its page by walking `parent` up to the `PAGE`. Harvest **one page per call**; `use_figma` starts every call on the first page.
2. Ask the user to confirm or narrow the scope when it contains more than 50 top-level frames or spans more than one page. For a page or section scope, the scope roots are its top-level children.
3. Before any write, call `get_screenshot` for every scope root (at most 20; tell the user when there are more) and keep the images as the baseline for §12.
4. Read the token inventory and conventions (binding-recipes.md §2). If the targets use library variables, follow binding-recipes.md §8 before continuing.

---

## 2. Harvest script

Read-only (Tier 0). Returns the distinct values with usage counts, every usage for planning bindings, foreground/background color pairs, the components touched, and the skips.

```js
const SCOPE_IDS = ['1:23'];   // scope roots on ONE page
const MAX = 2000;             // nodes per call; split the scope when truncated
// paste r2, m, hex from binding-recipes §1
const roots = await Promise.all(SCOPE_IDS.map(id => figma.getNodeByIdAsync(id)));
let page = roots[0];
while (page && page.type !== 'PAGE') page = page.parent;
await figma.setCurrentPageAsync(page);
const values = new Map(), usages = [], pairs = {}, skipped = [], instances = [], components = {};
let visited = 0, hidden = 0, boundCount = 0, styledText = 0, styledEffects = 0;
const isBound = (n, prop) => { const b = n.boundVariables?.[prop]; return Array.isArray(b) ? b.length > 0 : !!b; };
function componentOf(n) {
  for (let p = n; p && p.type !== 'PAGE'; p = p.parent) {
    if (p.type !== 'COMPONENT') continue;
    if (!components[p.id]) components[p.id] = { name: p.name, set: p.parent?.type === 'COMPONENT_SET' ? p.parent.name : null, variant: p.variantProperties ?? null };
    return p.id;
  }
  return null;
}
function role(n) {
  const name = n.name.toLowerCase();
  if (/state[\s-]?layer/.test(name)) return 'state-layer';
  if (n.type === 'TEXT') return 'text';
  if (/divider|separator/.test(name) || n.type === 'LINE') return 'divider';
  if (['VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'POLYGON'].includes(n.type) || /icon/.test(name)) return 'icon';
  return 'children' in n && n.children.length ? 'container' : 'shape';
}
function add(family, key, value, n, prop, context) {
  const k = `${family}|${key}`;
  let e = values.get(k);
  if (!e) values.set(k, (e = { family, key, value, uses: 0, samples: [], contexts: [] }));
  e.uses++;
  if (e.samples.length < 5) e.samples.push(n.id);
  if (!e.contexts.includes(context)) e.contexts.push(context);
  usages.push([n.id, prop, family, key, context, componentOf(n)]);
}
function paints(n, prop, list, bg) {
  if (list === figma.mixed || !Array.isArray(list)) return;
  list.forEach((p, i) => {
    if (p.visible === false) return;
    if (p.type !== 'SOLID') { skipped.push({ nodeId: n.id, prop, reason: `${p.type} paint` }); return; }
    if (p.boundVariables?.color) { boundCount++; return; }
    const op = r2(p.opacity ?? 1), h = hex(p.color), r = role(n);
    add('color', `${h}@${op}`, { hex: h, opacity: op, color: p.color }, n, `${prop}[${i}]`, `${prop.split('@')[0]}:${r}`);
    if (prop.startsWith('fills') && (r === 'text' || r === 'icon') && bg) pairs[`${h} on ${bg}`] = (pairs[`${h} on ${bg}`] ?? 0) + 1;
  });
}
function text(n, bg) {
  for (const s of n.getStyledTextSegments(['fontName', 'fontSize', 'lineHeight', 'letterSpacing', 'textStyleId', 'fills'])) {
    const range = `${s.start}-${s.end}`;
    paints(n, `fills@${range}`, s.fills, bg);
    if (s.textStyleId) { styledText++; continue; }
    if (['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing'].some(f => isBound(n, f))) { boundCount++; continue; }
    const lh = s.lineHeight.unit === 'AUTO' ? 'AUTO' : s.lineHeight.unit === 'PIXELS' ? r2(s.lineHeight.value) : r2((s.lineHeight.value / 100) * s.fontSize);
    const tr = s.letterSpacing.unit === 'PIXELS' ? r2(s.letterSpacing.value) : r2((s.letterSpacing.value / 100) * s.fontSize);
    if (lh === 'AUTO') skipped.push({ nodeId: n.id, prop: `lineHeight@${range}`, reason: 'AUTO line height stays unbound' });
    const t = { family: s.fontName.family, style: s.fontName.style, size: s.fontSize, lineHeight: lh, tracking: tr };
    add('typography', `${t.family}|${t.style}|${t.size}|${lh}|${tr}`, t, n, `text@${range}`, 'text');
  }
}
```

```js
function num(n, family, prop, value, context) {
  if (value === figma.mixed || !value) return;
  if (isBound(n, prop)) { boundCount++; return; }
  add(family, String(r2(value)), r2(value), n, prop, context);
}
function layout(n) {
  if (!('layoutMode' in n) || n.layoutMode === 'NONE') return;
  const [l, r, t, b] = [n.paddingLeft, n.paddingRight, n.paddingTop, n.paddingBottom];
  if (l === r && t === b && l === t) for (const p of ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom']) num(n, 'spacing', p, n[p], 'inset');
  else { num(n, 'spacing', 'paddingLeft', l, 'inset-horizontal'); num(n, 'spacing', 'paddingRight', r, 'inset-horizontal'); num(n, 'spacing', 'paddingTop', t, 'inset-vertical'); num(n, 'spacing', 'paddingBottom', b, 'inset-vertical'); }
  if (n.layoutMode === 'GRID') { num(n, 'spacing', 'gridRowGap', n.gridRowGap, 'gap-stack'); num(n, 'spacing', 'gridColumnGap', n.gridColumnGap, 'gap-inline'); return; }
  if (n.primaryAxisAlignItems === 'SPACE_BETWEEN') skipped.push({ nodeId: n.id, prop: 'itemSpacing', reason: 'space-between spacing is automatic' });
  else num(n, 'spacing', 'itemSpacing', n.itemSpacing, n.layoutMode === 'HORIZONTAL' ? 'gap-inline' : 'gap-stack');
  if (n.layoutWrap === 'WRAP') num(n, 'spacing', 'counterAxisSpacing', n.counterAxisSpacing, 'gap-stack');
}
function radius(n) {
  if (!('topLeftRadius' in n)) return;
  const pill = Math.min(n.width, n.height) / 2;
  for (const c of ['topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius']) {
    const v = n[c];
    if (!v) continue;
    if (isBound(n, c)) { boundCount++; continue; }
    const full = v >= pill - 0.01;
    add('radius', full ? 'full' : String(r2(v)), full ? 9999 : r2(v), n, c, role(n));
  }
}
function stroke(n) {
  if (!('strokes' in n) || !n.strokes.some(p => p.visible !== false)) return;
  const props = n.strokeWeight === figma.mixed ? ['strokeTopWeight', 'strokeRightWeight', 'strokeBottomWeight', 'strokeLeftWeight'] : ['strokeWeight'];
  for (const p of props) num(n, 'stroke-width', p, n[p], 'outline');
}
function size(n) {
  if (!('width' in n)) return;
  const fixed = axis => !(`layoutSizing${axis}` in n) || n[`layoutSizing${axis}`] === 'FIXED';
  if (n.type === 'COMPONENT' && fixed('Vertical')) num(n, 'size', 'height', n.height, 'control-height');
  if (role(n) === 'icon' && fixed('Vertical') && fixed('Horizontal') && Math.abs(n.width - n.height) < 0.01) { num(n, 'size', 'width', n.width, 'icon'); num(n, 'size', 'height', n.height, 'icon'); }
}
function effects(n) {
  const fx = n.effects.filter(e => e.visible !== false);
  if (!fx.length) return;
  if (n.effectStyleId) { styledEffects++; return; }
  if (fx.some(e => Object.keys(e.boundVariables ?? {}).length)) { boundCount++; return; }
  const shadows = fx.filter(e => e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW');
  for (const e of fx) if (!shadows.includes(e)) skipped.push({ nodeId: n.id, prop: 'effects', reason: `${e.type} is not tokenized` });
  if (!shadows.length) return;
  const sig = shadows.map(e => ({ type: e.type, x: r2(e.offset.x), y: r2(e.offset.y), blur: r2(e.radius), spread: r2(e.spread ?? 0), hex: hex(e.color), alpha: r2(e.color.a), color: e.color, showBehind: e.showShadowBehindNode ?? false }));
  add('shadow', JSON.stringify(sig.map(({ color, ...rest }) => rest)), sig, n, 'effects', role(n));
}
```

```js
function bgOf(n, inherited) {
  if (!('fills' in n) || n.type === 'TEXT' || n.fills === figma.mixed) return inherited;
  const solid = n.fills.filter(p => p.visible !== false && p.type === 'SOLID' && (p.opacity ?? 1) >= 0.5);
  return solid.length ? hex(solid[solid.length - 1].color) : inherited;
}
function walk(n, bg) {
  if (visited >= MAX) return;
  if (n.visible === false) { hidden++; return; }
  visited++;
  if (['PAGE', 'SECTION', 'COMPONENT_SET'].includes(n.type)) { for (const c of n.children) walk(c, bg); return; }
  if (n.type === 'INSTANCE') { instances.push(n.id); size(n); return; }
  if (n.type === 'TEXT') text(n, bg); else if ('fills' in n) paints(n, 'fills', n.fills, bg);
  if ('strokes' in n) paints(n, 'strokes', n.strokes, bg);
  stroke(n); radius(n); layout(n); size(n);
  if ('opacity' in n && n.opacity < 1) num(n, 'opacity', 'opacity', r2(n.opacity * 100), role(n));
  if ('effects' in n) effects(n);
  if ('children' in n) for (const c of n.children) walk(c, bgOf(n, bg));
}
const pageBg = page.backgrounds?.find(p => p.type === 'SOLID');
for (const r of roots) walk(r, pageBg ? hex(pageBg.color) : null);
return {
  page: { id: page.id, name: page.name }, visited, hidden, truncated: visited >= MAX,
  values: [...values.values()].sort((a, b) => b.uses - a.uses),
  usages, pairs, components, instances,
  existing: { boundProperties: boundCount, styledTextSegments: styledText, styledEffects },
  skipped,
};
```

Each `usages` row is `[nodeId, property, family, valueKey, context, componentId]`; the property carries the paint index or text range (`fills[0]`, `fills@0-12[0]`, `text@0-12`).

---

## 3. What is skipped

Skipped items are never tokenized silently; they are listed in the plan and the report.

| Item | Reason | What happens instead |
|------|--------|----------------------|
| Property already bound to a variable | Already tokenized | Counted as an existing binding |
| Text segment with a Text Style, node with an Effect Style | Already tokenized through a style | Counted; the style itself is audited (rule 16) |
| Gradient and image paints | Not bound by this skill | Reported |
| Hidden nodes | Not visible | Counted |
| `AUTO` line height | Cannot be expressed as a variable | Line height stays `AUTO`; other type fields are tokenized |
| Children of instances | Belong to the main component | Harvest the main component (its ID is in `instances` → binding-recipes.md §7-10) |
| "Space between" item spacing | Spacing is automatic | Reported |
| Layer blur and background blur | Not part of the elevation vocabulary | Reported |
| Zero padding, gaps, and radius | Not tokenized (token-spec.md §4-2, §4-3) | Ignored unless variants differ |

---

## 4. Normalization

| Family | Normal form |
|--------|-------------|
| Color | Uppercase hex plus paint opacity rounded to 2 decimals (`#6750A4@1`) |
| Numbers | Rounded to 2 decimals; values whose difference is below 0.01 are identical (15.999 → 16) |
| Radius | `full` when the radius is at least half of the node's shorter side |
| Line height | Pixels; percentages become `value / 100 × fontSize`; `AUTO` stays `AUTO` |
| Letter spacing | Pixels; percentages become `value / 100 × fontSize` |
| Shadow | One entry per layer: type, x, y, blur, spread, hex, alpha, show-behind |
| Opacity | Integer-ish percentage of layer opacity (0.38 → 38) |

---

## 5. Identical values and existing tokens

- Identical normalized values map to **one** Ref variable without asking.
- A value equal to an existing Ref variable's value reuses that variable (compare with `sameValue`, binding-recipes.md §1). Example: the file has `md/ref/palette/primary/40` = #6750A4 and the harvest finds #6750A4 → reuse it; create no new Ref color.
- A value equal to the resolved value of an existing Sys token reuses that Sys token (`exact` confidence).
- New Ref names follow token-spec.md §2 and §3: colors `ref/color/{hueFamily}/{tone}` (or the file's palette category), numbers `ref/{category}/{encodeNum(value)}`. Name collisions get `-b`, `-c` for the less-used values.

---

## 6. Near values and off-scale values

**Never merge near values automatically.** Build review groups; merging is a Tier 3 decision the user makes per group.

| Family | Near-value threshold |
|--------|----------------------|
| Color | CIE76 ΔE ≤ 3 with equal paint opacity |
| Spacing, size, radius, stroke width | absolute difference ≤ 1 px, or ≤ 5% of the larger value, whichever is greater |
| Typography | same family and weight, size within 1 px, line height within 2 px, letter spacing within 0.2 px |
| Shadow | same number of shadow layers, each offset, blur, and spread within 1 px, and color ΔE ≤ 3 |
| Opacity | within 5 percentage points |

Two values that are both steps of the file's Sys scales — or of the default scales when the file has none — are never near values (spacing 2 and 4, hover 8% and focus 10%).

Grouping:

1. Work per family. Sort values by uses, most used first.
2. A value joins the first group whose anchor (its most-used value) is within the threshold; otherwise it starts a new group. Groups with two or more values are review groups.
3. A value between two steps of a Sys scale (token-spec.md §4-9) that is not already in a group forms its own review group with the lower step and the upper step as extra candidates (0 uses, labeled "scale step").
4. Recommended value: a candidate that sits on the file's scale; otherwise the most-used candidate.

Each group offers three answers: merge into the recommended value, merge into another listed value, or keep all values (off-scale groups: snap to the lower step, snap to the upper step, or keep as `{lower step}-plus`).

| Example | Group | Recommended |
|---------|-------|-------------|
| #1A73E8 on 42 nodes, #1A73E9 on 3 nodes | Color, ΔE 0.3 | #1A73E8 (most used) |
| Gap 14 in a file whose ladder has 12 and 16 | Off-scale spacing: 14, 12, 16 | None preselected; ask |
| Padding 15 (4 uses) and 16 (60 uses) | Spacing, Δ 1 px | 16 (on the scale) |

---

## 7. Review board

The review board makes the differences visible. It is the only write allowed before the decisions, it only **adds** a Section, and it never moves or edits existing nodes.

**Placement**: a Section named exactly `Token Review — temporary` on the page that contains the scope root, 400 px to the right of the rightmost existing node.

**Layout**: one row per review group — a title (`G1 · Color · ΔE 0.3`), then one card per candidate with:

| Family | Visual sample |
|--------|---------------|
| Color | 96 × 64 swatch filled with the color at its paint opacity |
| Spacing, size, stroke width | Bar whose width equals the value |
| Radius | 64 × 64 square with that radius |
| Typography | "Aa 字體 The quick brown fox" set in the candidate's type (Inter when the font cannot load, noted on the card) |
| Shadow | White 96 × 64 card with the candidate's shadow layers |
| Opacity | Dark square at that opacity |

Each card also shows the value label, `★ recommended` when applicable, the usage count, and `sample 1 … sample 5` hyperlinks to the source nodes.

```js
const PAGE_ID = '0:1';
const GROUPS = [{ id: 'G1', family: 'color', title: 'Color · ΔE 0.3', candidates: [
  { label: '#1A73E8', value: { color: { r: 0.102, g: 0.451, b: 0.91 }, opacity: 1 }, uses: 42, samples: ['1:23'], recommended: true },
  { label: '#1A73E9', value: { color: { r: 0.102, g: 0.451, b: 0.914 }, opacity: 1 }, uses: 3, samples: ['1:88'] },
] }];
const page = await figma.getNodeByIdAsync(PAGE_ID);
await figma.setCurrentPageAsync(page);
await Promise.all(['Regular', 'Bold'].map(style => figma.loadFontAsync({ family: 'Inter', style })));
const label = (chars, size = 12, bold = false) => {
  const t = figma.createText(); t.fontName = { family: 'Inter', style: bold ? 'Bold' : 'Regular' }; t.fontSize = size; t.characters = chars; return t;
};
const stack = (name, dir, gap) => {
  const f = figma.createFrame(); f.name = name; f.layoutMode = dir; f.itemSpacing = gap;
  f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'AUTO'; f.fills = []; return f;
};
```

```js
async function visual(family, v) {
  if (family === 'typography') {
    const t = figma.createText();
    try { await figma.loadFontAsync({ family: v.family, style: v.style }); t.fontName = { family: v.family, style: v.style }; }
    catch (e) { t.fontName = { family: 'Inter', style: 'Regular' }; v.note = 'font unavailable, shown in Inter'; }
    t.fontSize = v.size;
    if (v.lineHeight !== 'AUTO') t.lineHeight = { unit: 'PIXELS', value: v.lineHeight };
    t.letterSpacing = { unit: 'PIXELS', value: v.tracking };
    t.characters = 'Aa 字體 The quick brown fox';
    return t;
  }
  const r = figma.createRectangle();
  r.resize(96, 64);
  r.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.89, b: 0.95 } }];
  if (family === 'color') { r.fills = [{ type: 'SOLID', color: v.color, opacity: v.opacity }]; r.strokes = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 } }]; r.cornerRadius = 8; }
  if (['spacing', 'size', 'stroke-width'].includes(family)) { r.resize(Math.max(1, v), 24); r.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.31, b: 0.64 } }]; }
  if (family === 'radius') { r.resize(64, 64); r.cornerRadius = Math.min(v, 32); }
  if (family === 'opacity') { r.resize(64, 64); r.fills = [{ type: 'SOLID', color: { r: 0.11, g: 0.11, b: 0.13 } }]; r.opacity = v / 100; }
  if (family === 'shadow') {
    r.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]; r.cornerRadius = 8;
    r.effects = v.map(s => ({ type: s.type, color: s.color, offset: { x: s.x, y: s.y }, radius: s.blur, spread: s.spread, visible: true, blendMode: 'NORMAL', ...(s.type === 'DROP_SHADOW' ? { showShadowBehindNode: false } : {}) }));
  }
  return r;
}
async function card(group, c) {
  const col = stack(c.label, 'VERTICAL', 8);
  col.appendChild(await visual(group.family, c.value));
  col.appendChild(label(`${c.recommended ? '★ recommended · ' : ''}${c.label}`, 13, true));
  col.appendChild(label(`${c.uses} uses${c.value?.note ? ` · ${c.value.note}` : ''}`));
  const names = c.samples.map((_, i) => `sample ${i + 1}`);
  const links = label(names.join('   '));
  let at = 0;
  names.forEach((n, i) => { links.setRangeHyperlink(at, at + n.length, { type: 'NODE', value: c.samples[i] }); at += n.length + 3; });
  col.appendChild(links);
  return col;
}
```

```js
const right = page.children.reduce((x, n) => Math.max(x, n.x + n.width), 0);
const section = figma.createSection();
section.name = 'Token Review — temporary';
section.x = right + 400;
section.y = 0;
const board = stack('Review groups', 'VERTICAL', 40);
board.paddingTop = board.paddingBottom = board.paddingLeft = board.paddingRight = 40;
board.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
board.appendChild(label('Token review — choose for each group; this section is removed afterwards', 16, true));
for (const g of GROUPS) {
  const row = stack(g.id, 'VERTICAL', 12);
  row.appendChild(label(`${g.id} · ${g.title}`, 14, true));
  const line = stack(`${g.id} candidates`, 'HORIZONTAL', 24);
  for (const c of g.candidates) line.appendChild(await card(g, c));
  row.appendChild(line);
  board.appendChild(row);
}
section.appendChild(board);
board.x = 40;
board.y = 40;
section.resizeWithoutConstraints(board.width + 80, board.height + 80);
return { sectionId: section.id, pageId: page.id, groups: GROUPS.length };
```

For shadow candidates, `value` is the harvested layer list (each layer keeps its RGBA `color`). After building the board:

1. Call `get_screenshot` on the Section and show it (hosts that do not display images still get the link).
2. Give the Figma link: `https://www.figma.com/design/{fileKey}/?node-id={sectionId with ":" replaced by "-"}`.
3. Ask once for all groups, one question per group (up to four per question-tool call), with the three answers from §6. Record the answers as a merge map (`{ "G1": { keep: "#1A73E8", merge: ["#1A73E9"] } }`).
4. After the decisions have been applied (§11), remove the board unless the user asked to keep it:

```js
const s = await figma.getNodeByIdAsync(SECTION_ID);
if (s && s.type === 'SECTION' && s.name === 'Token Review — temporary') s.remove();
return { removed: !!s };
```

---

## 8. Semantic mapping (Sys)

Every kept value gets a Sys token from token-spec.md §4 and a confidence:

| Confidence | When |
|------------|------|
| `exact` | Reuses an existing Sys token with the same resolved value, or the value sits on a scale step (spacing, shape, stroke width, size, state opacity), or a typescale role matches size, weight, and line height |
| `inferred` | The rules below chose the role from usage |
| `needs-review` | No rule applies, or two values compete for one role — **ask before creating** |

### 8-1 Colors

Inputs: each color's contexts (`fills:container`, `fills:text`, `fills:icon`, `strokes:*`, `fills:state-layer`, `fills:divider`), usage counts, sample node names, and the foreground/background `pairs`.

Apply in order; the first matching rule wins:

1. **Existing Sys** — the file already has a Sys color with this value → reuse (`exact`).
2. **Name hints** — sample nodes or their ancestors are named `error`, `danger`, `destructive`, `invalid` → error family; `success`, `positive` → success; `warning`, `caution` → warning; `scrim`, `overlay`, `backdrop` → `scrim`; `divider`, `separator` → `outline-variant`; `border`, `outline` → `outline`. A disabled variant's colors are not new roles: they become disabled Comp tokens (token-spec.md §5).
3. **Surface** — the fill of the scope's top-level frames (screen backgrounds) → `surface`. Other neutral container fills rank by lightness relative to `surface`: in a light theme the lighter one is `surface-container-lowest`, darker ones are `surface-container-low`, `surface-container`, `surface-container-high`, `surface-container-highest` in order of decreasing L*; a dark theme (surface L* < 50) reverses the order.
4. **Accent** — a color with chroma ≥ 20 that fills the containers of interactive-looking nodes (names containing button, btn, cta, chip, tab, toggle, switch, fab, link) or colors link text. The most used accent → `primary`; a light tint of the same hue family (L* ≥ 80) used as a container → `primary-container`; the second accent hue family → `secondary`; the third → `tertiary`.
5. **Content** — a text or icon color takes `on-{background role}` from its pairs: on `primary` → `on-primary`; on `primary-container` → `on-primary-container`; on a surface role → the most used becomes `on-surface`, a lighter or lower-contrast second one `on-surface-variant`; on `inverse-surface` → `inverse-on-surface`.
6. **Outline** — neutral strokes: L* < 60 → `outline`; L* ≥ 60 → `outline-variant`.
7. **Inverse** — a dark neutral container (L* < 30 in a light theme) with light text → `inverse-surface`.
8. **Shadow** — shadow colors → `shadow` and the elevation color tokens (§8-5).
9. Anything else → `needs-review`, with a proposed name that follows M3 patterns and never names a component.

When the scope contains both light and dark versions of the same screens, ask whether to create `Light` and `Dark` modes (Tier 2; paid plans only).

### 8-2 Spacing

Role from the harvest context (`inset-horizontal`, `inset-vertical`, `inset`, `gap-inline`, `gap-stack`); label from the file's ladder or the default ladder (token-spec.md §4-2). Off-ladder values were resolved in §6.

### 8-3 Shape

`full` → `corner-full`; other radii → the shape scale step with the same value (token-spec.md §4-3).

### 8-4 Typography

Map each type combination to a typescale role (token-spec.md §4-4):

| Band | Role family |
|------|-------------|
| Size ≥ 36 | display |
| 24 ≤ size < 36 | headline |
| 18 ≤ size < 24, or size 14–16 with weight ≥ 500 used as a heading (not inside a control) | title |
| Weight ≥ 500 and size ≤ 14 inside controls (buttons, chips, tabs, badges, navigation labels) | label |
| Everything else | body |

Within the family, pick the role whose default size is closest (ties → the larger role). When two different combinations land on the same role, the more used keeps it and the other becomes `{lower role}-plus` (for example size 13 between `body-small` and `body-medium` → `body-small-plus`); ask when that name is taken too. Every font family found becomes `ref/type/family/{slug}`; different families for headings and body text are normal.

### 8-5 Elevation

A shadow combination maps to the M3 level whose largest blur is nearest: level1 3, level2 6, level3 8, level4 10, level5 12 (ties → the lower level). When two combinations land on the same level, the more used keeps it and the other takes the next free level or becomes `needs-review`.

### 8-6 Stroke width, size, opacity

- Stroke width: 1 → `width-thin`, 2 → `width-medium`, 3 → `width-thick`; others go through §6.
- Size: square icons → `icon-*`; component root heights → `control-height-*`; off-ladder values go through §6.
- Layer opacity: a state-layer node in a Hovered, Focused, Pressed, or Dragged variant → `sys/state/{hover|focus|pressed|dragged}/state-layer-opacity`; a container layer in a Disabled variant → `sys/state/disabled/container-opacity`; content in a Disabled variant → `sys/state/disabled/content-opacity`; anything else → `needs-review`.

---

## 9. Anatomy mapping (Comp)

Comp names follow token-spec.md §5: `comp/{component}[/{variant}][/{size}][/{condition}][/{state}]/{anatomy}/{property}`.

1. **Component** — the component set's name, or the component's name when it is standalone; take the last `/` segment and convert it to kebab-case (`Buttons/Filled Button` → `filled-button`). If two components produce the same name, use the whole path joined with `-`.
2. **Variant, size, condition, state** — read `variantProperties` from `components` (§2). Add a segment only when the property's value differs along that axis; state values use the mapping in token-spec.md §5.
3. **Anatomy** — from the layer name when it is meaningful, normalized to the M3 vocabulary:

| Layer name | Anatomy |
|------------|---------|
| The component root, `BG`, `Background`, `Container` | `container` |
| `Label`, `Text` inside a control, `Button text` | `label-text` |
| `Title`, `Heading` | `headline` |
| `Description`, `Subtitle`, `Helper`, `Caption` | `supporting-text` |
| `Icon` (left or right of the label in a horizontal layout) | `leading-icon` / `trailing-icon`; otherwise `icon` |
| `Border`, `Stroke`, `Outline` | `outline` |
| `Divider`, `Separator` | `divider` |
| `State layer`, `Overlay` inside a control | `state-layer` |
| `Indicator`, `Active` | `active-indicator` |

Generic names (`Frame 12`, `Rectangle 3`, `Group 5`) take their anatomy from the harvest role (`container`, `shape`, `text`, `icon`) and position, with confidence `inferred`.

4. **Property** — fills → `background-color` on containers, `color` on text, icons, and state layers; strokes → `outline/color`; stroke weight → `outline/width`; radius → `{anatomy}/shape`; padding → `padding-horizontal`, `padding-vertical`, or `padding`; item spacing → `gap`; height and width → `height`, `width`, or `size` for icons; layer opacity → `opacity`; typography in Variables mode → `font`, `weight`, `size`, `line-height`, `tracking`.

Typography and elevation in Styles mode get no Comp tokens; the component's text uses the Text Style and its shadows use the Effect Style.

| Harvested value and context | Sys token | Comp token | Confidence |
|-----------------------------|-----------|------------|------------|
| 24 as left and right padding of a button | `sys/spacing/inset-horizontal-xl` | `comp/filled-button/container/padding-horizontal` | exact |
| Radius equal to half the height of a 40 px button | `sys/shape/corner-full` | `comp/filled-button/container/shape` | exact |
| Roboto Medium 14/20, 0.1 px tracking on a button label | `sys/typescale/label-large/*` | Text Style `label/large` | exact |
| #F2B8B5 used once on an unnamed rectangle | none proposed | none proposed | needs-review |

---

## 10. Token plan

The plan is shown before any variable or style is created. It is at least Tier 2; items that change appearance are Tier 3 and are listed separately.

```
## Token plan — {scope}
Prefix: md · Collections: md · Reference / md · System / md · Component (new)
Composite mode: Styles (reply "variables mode" to bind typography variables on text nodes instead)
Tier 2: creates 12 Ref · 9 Sys · 14 Comp variables, 2 Text Styles, 1 Effect Style; binds 31 properties
Tier 3: none (or the list of appearance changes with before/after values)
```

| Section | Columns |
|---------|---------|
| New variables | layer, name, type, value or alias target, scopes, WEB code syntax, confidence |
| Reused variables | name, why it matches |
| Styles | style name, fields → variables, new or existing |
| Bindings | node ID, node name, property, current value, token, token value, tier |
| Translucent paints | node ID, property, method (composed / layer opacity / alpha color) |
| Skipped | node ID, property, reason |
| Questions | every `needs-review` mapping |

When the user edits names or roles in the plan, show the revised entries and wait for confirmation again.

---

## 11. Write order

Each step is a separate `use_figma` call (or several, at most 100 bindings or one component per call). Every script re-fetches by ID and returns the affected IDs.

1. **Collections** — create missing collections (binding-recipes.md §6).
2. **Ref** — raw values, scope `[]`, WEB code syntax.
3. **Sys** — aliases to Ref; elevation colors as composed values of Ref color and Ref opacity when possible.
4. **Comp** — aliases to Sys; translucent colors as composed values of Sys color and Sys opacity. If a composed value fails, remove that variable and plan method 2 or 3 for its paints (token-spec.md §7); record the fallback and the error.
5. **Styles** — Text Styles and Effect Styles bound to Sys (binding-recipes.md §7-7, §7-9).
6. **Bindings** — per component, using binding-recipes.md §7. Translucent paints use the first method that applies: composed color → layer opacity (leaf layers only, Tier 2) → alpha color.
7. **Merges approved in §7** — nodes that used a merged value are bound to the kept value's token; these are the Tier 3 items the user approved.

Stop at the first error: read it, fix the script, and retry only that step.

---

## 12. Verification and cleanup

1. Run the validation script (binding-recipes.md §9) for every binding: each property must resolve to its original value, or to the kept value of an approved merge.
2. Re-run the harvest (§2) on the scope: the only remaining hardcoded values must be the §3 skips.
3. Call `get_screenshot` for every scope root and compare it with the baseline from §1.
4. Report any unexpected difference (node ID, property, expected, actual) and change nothing else until the user decides.
5. Remove the review board (§7) unless the user asked to keep it.

---

## 13. Report and interface for other skills

Report to the user:

```
## Workflow F report — {scope}
Created: Ref 12 · Sys 9 · Comp 14 · Text Styles 2 · Effect Styles 1
Bound: 31 properties on 9 nodes (appearance-neutral 31 · approved changes 0)
Merged groups: G1 #1A73E9 → #1A73E8 (3 nodes)
Translucent paints: composed 2 · layer opacity 1 · alpha color 0
Skipped: 4 (AUTO line height 2 · gradient 1 · instance children 1)
Verification: resolved values ✓ · re-harvest ✓ · screenshots ✓
Review board: removed
```

When another skill (for example `figma-componentize`) calls Workflow F, it passes:

```json
{ "scope": ["12:34", "12:56"], "components": ["Button", "Card"], "caller": "figma-componentize" }
```

The same tiers, review board, and plan confirmation apply. After the writes, return:

```json
{
  "variables": { "ref": ["VariableID:1:2"], "sys": ["VariableID:1:9"], "comp": ["VariableID:1:20"] },
  "styles": { "text": ["S:abc"], "effect": ["S:def"] },
  "bindings": [{ "nodeId": "12:40", "property": "fills[0]", "variableId": "VariableID:1:20" }],
  "mergedGroups": [{ "group": "G1", "kept": "#1A73E8", "merged": ["#1A73E9"] }],
  "translucent": [{ "nodeId": "12:44", "method": "composed" }],
  "skipped": [{ "nodeId": "12:41", "property": "lineHeight@0-5", "reason": "AUTO line height stays unbound" }]
}
```
