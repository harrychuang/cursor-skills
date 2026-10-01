# Replacement — Swap Originals for Instances, Verify, Report

> Used by `figma-componentize` steps 8–10, after the build (build-recipes.md) and the token step (figma-m3-variables Workflow F). Replacing originals is a **Tier 3** change: it deletes layers and can change the look.
> Scripts run through `use_figma` (pass `skillNames: "figma-componentize"`), sequentially, one page and at most 50 occurrences per call. Paste the helper blocks 9-2 to 9-4 from detection.md first, then the blocks of §3 to §6 in order.

Contents

1. Confirmation
2. Order and job list
3. Inputs and placement
4. Content carry-over
5. Verification
6. Replacement loop
7. Occurrences that are kept
8. Chunks, ledger, and recovery
9. Final verification
10. Report

---

## 1. Confirmation

Ask after the token step, even when the user said "apply everything automatically" earlier: no blanket instruction waives this Tier 3 confirmation. Show:

- the number of occurrences per component and variant, how many are carried inside outer instances, and the occurrences already known to be kept, with reasons;
- the baseline screenshots taken in detection.md §2;
- a link to each component's Section on the Components page: `https://www.figma.com/design/{fileKey}/?node-id={sectionId with ":" replaced by "-"}`;
- the restore point name, and that each original is deleted only after its instance passes verification (§5); otherwise the original stays as it is.

```
Replace 12 occurrences with instances? (Tier 3)
- Button: 8 (Style=Filled 6, Style=Outlined 2), plus 2 carried inside Card instances
- Card: 3 · Chip (existing component): 1
- Kept without trying: 1 locked layer (1:90)
Components: https://www.figma.com/design/AbC123/?node-id=40-1
Restore point: "Before figma-componentize — Home section"
```

Options: **Replace all** · **Choose components** · **Not now**. "Not now" goes straight to the report (§10): the components stay and the originals are untouched.

---

## 2. Order and job list

Replace the **outermost** occurrences only. An occurrence nested inside one that is being replaced (a button inside a card) is reproduced by the outer instance: the card's main component already holds an exposed `Button` instance, and §4 copies the label into it. It is never replaced separately.

Build one job list per page from the plan (`MODE: 'members'` rows: `id`, `variant`, `parent`) and the ledger (build-recipes.md §2):

1. **Outermost**: `parent` is `null`, or the parent belongs to a group that is not replaced (excluded, skipped in the build, or deselected by the user).
2. **`main`**: the ledger's variant ID (`components[group].variants[variant]`), the component ID for a group without variants, or, for a `reuse` group, the existing component or component set. For a set, the script picks the nearest variant (`pickVariant`, detection.md 9-4).
3. **`nested`**: every occurrence below this one, at all levels (follow the `parent` links down), mapped to its main by the same rule. The script swaps an exposed instance to that main when it differs. An exposed instance without an entry keeps the representative's variant, and verification decides.
4. **`lock: true`**: only for layers that were locked and that the user allowed to replace (§7).
5. **`accept: true`**: only when re-running occurrences whose listed differences the user accepted (§7).
6. **`MERGES`**: from Workflow F's `mergedGroups`, one `[merged value, kept value]` pair per merged value, in Workflow F's normal form:
   - colors as `#RRGGBB`, with `@0.12` added when the paint opacity is below 1;
   - layer opacity as a percentage;
   - other numbers in px.

   The plan's drift values were shown on Workflow F's review board (SKILL.md, token step), so the user's decisions about them arrive here as well. Drift the user did not merge stays a difference, and verification keeps that occurrence.

When an outer occurrence is kept, the occurrences nested in it become outermost. Replace them in a follow-up job list, which the same confirmation covers.

```json
[
  { "id": "1:20", "main": "40:2" },
  { "id": "1:31", "main": "40:2" },
  { "id": "1:50", "main": "41:3", "nested": { "1:55": "40:5" } }
]
```

---

## 3. Inputs and placement

```js
const PAGE_ID = '0:1'; // every occurrence below is on this page
const JOBS = [         // at most 50 outermost occurrences (§2)
  { id: '1:20', main: '40:2' },
  { id: '1:50', main: '41:3', nested: { '1:55': '40:5' } },
];
const MERGES = [[15, 16], ['#1A73E9', '#1A73E8']]; // [merged value, kept value] from Workflow F's mergedGroups
```

Before inserting anything, record the original and hide it, so the new instance does not push auto-layout siblings while both exist. Insert the instance at the original's index in the same parent, then set the layout properties in this order:

1. `layoutPositioning`
2. position and rotation (`relativeTransform`)
3. `resize()`
4. sizing

`resize()` resets sizing to FIXED, so sizing comes last. HUG applies only when the instance has auto layout (that is, its main component does), and FILL only inside auto-layout parents. In a GRID parent with manual positioning, the instance gets the original cell through `setGridChildPosition`. In a `ROW_AUTO_FLOW` grid, that call throws; there the layer order decides the cell, so inserting at the original's index is enough.

```js
const get = id => figma.getNodeByIdAsync(id);
const ref = (layer, field) => (layer.componentPropertyReferences || {})[field];
function record(n) { // everything needed to put an instance exactly where n is, and to compare it with n
  const p = n.parent;
  return {
    name: n.name, parent: p, index: p.children.indexOf(n), transform: n.relativeTransform, rotation: n.rotation || 0,
    width: n.width, height: n.height, constraints: 'constraints' in n ? n.constraints : null,
    positioning: n.layoutPositioning, sizing: [n.layoutSizingHorizontal, n.layoutSizingVertical], grow: n.layoutGrow, align: n.layoutAlign,
    grid: p.layoutMode === 'GRID' ? { row: n.gridRowAnchorIndex, col: n.gridColumnAnchorIndex, rowSpan: n.gridRowSpan, colSpan: n.gridColumnSpan } : null,
    visible: n.visible, box: n.absoluteBoundingBox, ...snapshot(n),
  };
}
function place(inst, rec) { // order matters: positioning → position → resize → sizing
  const p = rec.parent;
  p.insertChild(rec.index, inst);
  const auto = 'layoutMode' in p && p.layoutMode !== 'NONE';
  if (auto && rec.positioning) inst.layoutPositioning = rec.positioning;
  const flow = auto && rec.positioning !== 'ABSOLUTE';
  if (!flow) inst.relativeTransform = rec.transform;
  else if (rec.rotation) inst.rotation = rec.rotation;
  inst.resize(rec.width, rec.height);
  if (!flow && rec.constraints) inst.constraints = rec.constraints;
  if (flow && rec.align) inst.layoutAlign = rec.align;
  if (flow && typeof rec.grow === 'number') inst.layoutGrow = rec.grow;
  ['Horizontal', 'Vertical'].forEach((axis, k) => {
    const s = rec.sizing[k];
    if (s && !(s === 'HUG' && inst.layoutMode === 'NONE') && !(s === 'FILL' && !flow)) inst[`layoutSizing${axis}`] = s;
  });
  if (flow && rec.grid && p.gridItemsPositioning !== 'ROW_AUTO_FLOW') { // auto-flow grids place children by layer order
    inst.setGridChildPosition(rec.grid.row, rec.grid.col);
    if (rec.grid.rowSpan > 1) inst.gridRowSpan = rec.grid.rowSpan;
    if (rec.grid.colSpan > 1) inst.gridColumnSpan = rec.grid.colSpan;
  }
}
async function fontProblem(nodes) { // null when every font is available and loaded
  const texts = nodes.flatMap(n => (n.type === 'TEXT' ? [n] : 'findAll' in n ? n.findAll(x => x.type === 'TEXT') : []));
  const missing = texts.find(t => t.hasMissingFont);
  if (missing) return `missing font in ${missing.id}: ${fontsOf(missing).map(f => `${f.family} ${f.style}`).join(', ')}`;
  const fonts = uniq(nodes.flatMap(fontsOf).map(f => JSON.stringify(f))).map(f => JSON.parse(f));
  const failed = (await Promise.all(fonts.map(f => figma.loadFontAsync(f).then(() => null, () => f)))).filter(Boolean);
  return failed.length ? `font could not be loaded: ${failed.map(f => `${f.family} ${f.style}`).join(', ')}` : null;
}
```

---

## 4. Content carry-over

The original and its instance share the core signature, so their layers are matched by structural position:

- The walk pairs core children in order. Where the instance has an exposed instance, the original has the nested occurrence that it replaces.
- Texts and image layers pair by order, using the content model of detection.md `contentOf`.
- Icon and instance slots pair by slot key (`leading icon#0`).

| Original | What the instance receives |
|----------|----------------------------|
| Text | The TEXT property the layer is linked to (`componentPropertyReferences.characters`), otherwise a direct override |
| Optional icon or slot missing | The linked BOOLEAN property set to `false`, otherwise `visible = false` |
| A different nested instance (an icon) | The linked INSTANCE_SWAP property set to the original's main component, otherwise `swapComponent`; then its own content, recursively |
| Image fill | The original's paints, which reuse the same `imageHash` (`use_figma` cannot create images) |
| Nested occurrence | The exposed instance is swapped to `nested[id]` when it differs, then gets its content through its own properties, recursively |
| Variant | Already chosen by `main` |

Every property, swap, and image override is read back, because `setProperties` ignores unknown keys silently; a mismatch fails the occurrence. The following cannot be reproduced by overrides, so the occurrence is kept:

- a slot the original has but the component lacks;
- a different number of texts or image layers;
- a multi-style text that differs from the component's text.

```js
const exposedOf = i => { try { return new Set(i.exposedInstances.map(n => n.id)); } catch (e) { return new Set(); } };
function nestedPairs(o, i, ex, out = []) { // walks o and its instance together; exposed instances stand where nested occurrences were
  const isEx = c => ex.has(c.id) || (c.type === 'INSTANCE' && c.isExposedInstance === true);
  const core = (n, inInstance) => (n.children || []).filter(c => c.visible !== false && ((inInstance && isEx(c)) || !['icon', 'instance'].includes(role(c))));
  const ok = core(o, false), ik = core(i, true);
  if (ok.length !== ik.length) return null;
  for (let k = 0; k < ok.length; k++) {
    if (isEx(ik[k])) out.push([ok[k], ik[k]]);
    else if (role(ok[k]) === 'container' && !nestedPairs(ok[k], ik[k], ex, out)) return null;
  }
  return out;
}
const segments = t => (t.characters.length ? t.getStyledTextSegments(['fontName', 'fontSize']).map(s => `${s.end}:${s.fontName.family}/${s.fontName.style}/${s.fontSize}`) : []);
```

```js
async function carry(o, i, job, misses) { // copies o's content onto instance i; returns a reason when that is impossible
  const pairs = nestedPairs(o, i, exposedOf(i));
  if (!pairs) return 'structure differs from the component';
  CAND.clear(); pairs.forEach(([a]) => CAND.add(a.id));
  const oc = contentOf(o);
  CAND.clear(); pairs.forEach(([, b]) => CAND.add(b.id));
  const ic = contentOf(i);
  if (oc.textIds.length !== ic.textIds.length || oc.imageIds.length !== ic.imageIds.length) return 'text or image layers differ from the component';
  const props = {}, slots = [];
  for (let k = 0; k < oc.textIds.length; k++) {
    const a = await get(oc.textIds[k]), b = await get(ic.textIds[k]);
    if (segments(a).length > 1 && (a.characters !== b.characters || segments(a).join() !== segments(b).join())) return `mixed text styles in ${a.id}`;
    if (a.characters === b.characters) continue;
    if (ref(b, 'characters')) props[ref(b, 'characters')] = a.characters;
    else b.characters = a.characters;
  }
  for (const s of ic.slots) {
    const b = await get(s.id), os = oc.slots.find(x => x.key === s.key);
    if (!os) { if (ref(b, 'visible')) props[ref(b, 'visible')] = false; else b.visible = false; continue; }
    if (!os.inst || !s.inst) continue;
    const a = await get(os.id), am = await a.getMainComponentAsync(), bm = await b.getMainComponentAsync();
    if (am && bm && am.id !== bm.id) { if (ref(b, 'mainComponent')) props[ref(b, 'mainComponent')] = am.id; else b.swapComponent(am); }
    slots.push([a, s.id, am]);
  }
  const extra = oc.slots.find(x => !ic.slots.some(s => s.key === x.key));
  if (extra) return `${extra.key} is not in the component`;
  for (let k = 0; k < oc.imageIds.length; k++) {
    const a = await get(oc.imageIds[k]), b = await get(ic.imageIds[k]);
    const hashes = n => vis(n.fills).map(p => p.imageHash || '').join();
    if (hashes(a) !== hashes(b)) { b.fills = a.fills; if (hashes(b) !== hashes(a)) misses.push(`image ${b.name}`); }
  }
  if (Object.keys(props).length) {
    i.setProperties(props);
    for (const [key, value] of Object.entries(props)) if ((i.componentProperties[key] || {}).value !== value) misses.push(`property ${key.split('#')[0]}`);
  }
  for (const [a, id, am] of slots) {
    const b = await get(id);
    if (am && (await b.getMainComponentAsync()).id !== am.id) misses.push(`swap ${b.name}`);
    const why = await carry(a, b, job, misses);
    if (why) return why;
  }
  for (const [a, b] of pairs) {
    let want = job.nested && job.nested[a.id] ? await get(job.nested[a.id]) : null;
    if (want && want.type === 'COMPONENT_SET') want = pickVariant(a, want);
    if (want && (await b.getMainComponentAsync()).id !== want.id) {
      b.swapComponent(want);
      if ((await b.getMainComponentAsync()).id !== want.id) misses.push(`swap ${b.name}`);
    }
    const why = await carry(a, b, job, misses);
    if (why) return why;
  }
  return null;
}
```

---

## 5. Verification

Compare the instance with the recorded original before deleting anything:

| Check | Equal when |
|-------|------------|
| Bounds | `x`, `y`, `width`, and `height` of `absoluteBoundingBox` are within 0.5 px |
| Texts | The visible texts are identical, in the same order |
| Visible layers | Both have the same number of visible layers that draw something, see below |
| Styles | Each of those layers matches on: paints (type, image hash, and color in Workflow F's normal form: 8-bit hex plus paint opacity), layer opacity (in percent), stroke weight, radius, effects, font, font size, padding, and gap |
| Read-backs | Every property, swap, and image override reads back as set |

A layer "draws something" when it is a text, shape, vector, or image, or a frame with its own fill, stroke, effect, reduced opacity, or auto layout. A layout-only wrapper frame does not count, so the frame the build adds around a wrapped component makes no difference.

A difference is **explained** in these cases:

- **Style difference**: its from → to values are within Workflow F's near-value thresholds (color ΔE ≤ 3 with equal paint opacity; layer opacity within 5 points; other numbers within 1 px or 5%) and match a pair in `MERGES`, meaning the user merged that value in Workflow F.
- **Bounds difference**: an explained style difference exists in the same occurrence, and the bounds difference is within 1 px or 5% of the original size.
- **`accept: true`**: every style and bounds difference is explained.

Text, layer count, and read-back differences are never explained. Every explained difference is listed as approved in the report.

| Comparison | Result |
|------------|--------|
| Bounds equal, text equal, children equal | Original removed |
| Bounds differ by 0.3 px | Original removed (within 0.5 px) |
| Bounds differ by 2 px | Instance deleted, original kept, reported (`width 120 → 122`) |
| Text "Send" became "Save" | Instance deleted, original kept, reported |
| Padding changed by an approved merge (15 → 16) | Original removed, change listed as approved |
| Fill color differs and was not merged | Instance deleted, original kept, reported |

```js
const norm = v => (typeof v === 'number' ? String(r2(v)) : String(v).toUpperCase().replace(/@1$/, '')); // Workflow F's normal form
const FIELDS = ['opacity', 'stroke weight', 'radius', 'font size', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'gap'];
function layerOf(n, leaf) { // what one visible layer draws; a leaf's opacity is folded into its paints
  const paints = [];
  for (const [kind, list] of [['fill', n.fills], ['stroke', n.strokes]]) {
    for (const p of vis(list)) paints.push({ kind, type: p.type, rgb: p.color || null, hash: p.imageHash || '', o: r2((p.opacity ?? 1) * (leaf ? n.opacity ?? 1 : 1)) });
  }
  const auto = !!n.layoutMode && n.layoutMode !== 'NONE';
  const mixed = v => (v === figma.mixed ? 'mixed' : v);
  return {
    name: n.name.slice(0, 30), paints, opacity: leaf ? 100 : Math.round((n.opacity ?? 1) * 100), radius: radiusOf(n),
    'stroke weight': vis(n.strokes).length ? mixed(n.strokeWeight) : 0,
    effects: vis(n.effects).map(e => [e.type, e.offset ? `${r2(e.offset.x)},${r2(e.offset.y)}` : '', r2(e.radius || 0), e.color ? hex(e.color) : ''].join(' ')).join('; '),
    font: n.type !== 'TEXT' ? '' : n.fontName === figma.mixed ? 'mixed' : `${n.fontName.family} ${n.fontName.style}`,
    'font size': n.type !== 'TEXT' ? 0 : mixed(n.fontSize),
    paddingLeft: auto ? n.paddingLeft : 0, paddingRight: auto ? n.paddingRight : 0, paddingTop: auto ? n.paddingTop : 0, paddingBottom: auto ? n.paddingBottom : 0,
    gap: auto ? n.itemSpacing : 0,
  };
}
function snapshot(root) { // visible texts, and the visible layers that draw something, in order
  const texts = [], layers = [];
  (function walk(n) {
    const leaf = !('children' in n) || n.children.length === 0;
    const auto = !!n.layoutMode && n.layoutMode !== 'NONE';
    if (n.type === 'TEXT') texts.push(n.characters);
    if (leaf || auto || vis(n.fills).length || vis(n.strokes).length || vis(n.effects).length || (n.opacity ?? 1) < 1) layers.push(layerOf(n, leaf));
    if (!leaf) for (const c of n.children) if (c.visible !== false) walk(c);
  })(root);
  return { texts, layers };
}
```

```js
const paintKey = p => (p.rgb ? hex(p.rgb) + (p.o < 1 ? `@${p.o}` : '') : p.hash || p.type);
function styleDiffs(a, b) { // → [{ text, from, to, near }]
  const out = [];
  const add = (what, from, to, near) => out.push({ text: `${what} of "${a.name}" ${from} → ${to}`, from: norm(from), to: norm(to), near });
  if (a.paints.length !== b.paints.length) add('paints', a.paints.length, b.paints.length, false);
  else a.paints.forEach((p, k) => {
    const q = b.paints[k];
    if (p.type !== q.type || p.hash !== q.hash) add(p.kind, p.hash || p.type, q.hash || q.type, false);
    else if (paintKey(p) !== paintKey(q)) add(`${p.kind} color`, paintKey(p), paintKey(q), !!p.rgb && Math.abs(p.o - q.o) < 0.01 && deltaE(p.rgb, q.rgb) <= 3);
  });
  for (const k of FIELDS) {
    const x = a[k], y = b[k], num = typeof x === 'number' && typeof y === 'number';
    if (x === y || (num && Math.abs(x - y) < 0.01)) continue;
    add(k, num ? r2(x) : x, num ? r2(y) : y, num && (k === 'opacity' ? Math.abs(x - y) <= 5 : nearNum(x, y)));
  }
  for (const k of ['effects', 'font']) if (a[k] !== b[k]) add(k, a[k] || 'none', b[k] || 'none', false);
  return out;
}
function compare(rec, now, merges, accept = false) { // → { match, diffs, approved }
  const hard = [], soft = [];
  const merged = d => merges.some(([from, to]) => norm(from) === d.from && norm(to) === d.to);
  if (rec.layers.length !== now.layers.length) hard.push(`visible layers ${rec.layers.length} → ${now.layers.length}`);
  else rec.layers.forEach((a, k) => { for (const d of styleDiffs(a, now.layers[k])) (accept || (d.near && merged(d)) ? soft : hard).push(d.text); });
  for (let k = 0; k < Math.max(rec.texts.length, now.texts.length); k++) {
    if (rec.texts[k] !== now.texts[k]) hard.push(`text "${rec.texts[k] ?? ''}" → "${now.texts[k] ?? ''}"`);
  }
  for (const m of now.misses || []) hard.push(`read-back failed: ${m}`);
  const caused = soft.length > 0;
  for (const k of ['x', 'y', 'width', 'height']) {
    const x = rec.box[k], y = now.box[k], span = k === 'x' || k === 'width' ? rec.box.width : rec.box.height;
    if (Math.abs(x - y) > 0.5) (accept || (caused && Math.abs(x - y) <= Math.max(1, 0.05 * span)) ? soft : hard).push(`${k} ${r2(x)} → ${r2(y)}`);
  }
  return { match: !hard.length, diffs: [...hard, ...soft], approved: hard.length ? [] : soft };
}
```

---

## 6. Replacement loop

For each job: check it, record and hide the original, insert and place the instance, carry the content, verify, then either delete the original or delete the instance and show the original again. Each instance is tagged with the original's ID (shared plugin data `componentize` / `source`), so a failed call can be traced (§8).

```js
if (JOBS.length > 50) return { error: 'at most 50 occurrences per call' };
const page = await get(PAGE_ID);
await figma.setCurrentPageAsync(page);
const replaced = [], kept = [], approved = [], comps = new Map();
let traced = true;
for (const job of JOBS) {
  let orig = null, inst = null, hidden = false;
  const keep = reason => {
    if (inst && !inst.removed) inst.remove();
    if (hidden && !orig.removed) orig.visible = true;
    kept.push({ id: job.id, reason: String(reason).slice(0, 240) });
  };
  try {
    orig = await get(job.id);
    if (!orig) { keep('not found'); continue; }
    const chain = [];
    for (let x = orig.parent; x && x.type !== 'PAGE'; x = x.parent) chain.push(x);
    const onPage = chain.length ? chain[chain.length - 1].parent : orig.parent;
    if (!onPage || onPage.id !== PAGE_ID) { keep('not on this page'); continue; }
    if (chain.some(x => x.type === 'INSTANCE')) { keep('inside an instance'); continue; }
    if ((orig.locked || chain.some(x => x.locked)) && !job.lock) { keep('locked'); continue; }
    if (!comps.has(job.main)) comps.set(job.main, await get(job.main));
    const target = comps.get(job.main);
    if (!target || !['COMPONENT', 'COMPONENT_SET'].includes(target.type)) { keep('no matching component or variant'); continue; }
    const nestedMains = (await Promise.all(Object.values(job.nested || {}).map(id => get(id)))).filter(Boolean);
    const fontIssue = await fontProblem([orig, target, ...nestedMains]); // load fonts before reading or inserting text
    if (fontIssue) { keep(fontIssue); continue; }
    const main = target.type === 'COMPONENT_SET' ? pickVariant(orig, target) : target;
    if (!main) { keep('no matching component or variant'); continue; }
    const rec = record(orig);
    orig.visible = false;
    hidden = true;
    inst = main.createInstance();
    try { inst.setSharedPluginData('componentize', 'source', job.id); } catch (e) { traced = false; }
    place(inst, rec);
    const misses = [];
    const why = await carry(orig, inst, job, misses);
    if (why) { keep(why); continue; }
    inst.name = AUTO_NAME.test(rec.name) ? (main.parent.type === 'COMPONENT_SET' ? main.parent.name : main.name) : rec.name;
    const v = compare(rec, { box: inst.absoluteBoundingBox, ...snapshot(inst), misses }, MERGES, job.accept === true);
    if (!v.match) { keep(v.diffs.join('; ')); continue; }
    orig.remove();
    if (job.lock) inst.locked = true;
    replaced.push([job.id, inst.id]);
    if (v.approved.length) approved.push({ id: job.id, diffs: v.approved.join('; ').slice(0, 240) });
  } catch (e) {
    keep(`error: ${e && e.message ? e.message : String(e)}`);
  }
}
return { page: PAGE_ID, replaced, kept, approved, traced };
```

The result holds only IDs and short reasons (each at most 240 characters): `{ page, replaced: [[originalId, instanceId]], kept: [{ id, reason }], approved: [{ id, diffs }], traced }`. For 50 occurrences it stays under 18,000 characters. The instance keeps the original's layer name unless that name is automatic (`Frame 12`, `Group 5`, `Rectangle 3`); then it takes the component (or set) name.

---

## 7. Occurrences that are kept

Kept occurrences are never changed: the instance is deleted and the original is visible again, exactly as before.

| Reason in the result | When | What to do |
|----------------------|------|------------|
| `inside an instance` | An ancestor is an instance | Report only |
| `locked` | The layer or an ancestor is locked | Ask whether to include it. If the user agrees, unlock those layers (Tier 2, IDs in the ledger), re-run detection on them, and replace them with `lock: true`, which locks the new instance again |
| `missing font in {id}: {family style}`, `font could not be loaded: {family style}` | `hasMissingFont`, or `loadFontAsync` fails (`use_figma` does not support custom fonts yet) | Name the node and the font in the report |
| `mixed text styles in {id}` | A text has several styled ranges that differ from the component's text | Report only |
| `structure differs from the component`, `text or image layers differ from the component`, `{slot} is not in the component` | Overrides cannot reproduce the occurrence | Report; the designer may build a separate component later |
| `no matching component or variant` | A reused set has no variant within the near-value thresholds, or the component was not built | Report only |
| Differences such as `width 120 → 122`, `text "Send" → "Save"`, `fill color of "label" #D32F2F → #1C1B1F`, `read-back failed: property Label` | Verification failed (§5) | Show the differences. Style and size differences can be accepted by the user (Tier 3): re-run those occurrences with `accept: true`. Text, layer count, and read-back failures cannot be accepted |
| `error: …` | An exception in this occurrence; its changes were undone | Read the message, fix the cause, and retry that occurrence |

Occurrences of groups that were not built, or that the user did not select, are not sent to the script. They are listed in the report as kept, with that reason.

---

## 8. Chunks, ledger, and recovery

- **Calls**: at most 50 occurrences per call and one page per call; 130 occurrences on one page take three calls (50, 50, 30). Every call re-fetches its nodes by ID.
- **Ledger**: after each call, update the ledger (build-recipes.md §2):
  - `replaced`: status `replaced` and the `instanceId`; the occurrences nested in it get status `covered` and `by` (the outer occurrence ID).
  - `kept`: status `kept` and the reason.
  - `approved`: the approved differences.
- **Failed call** (error or timeout): a failed call can leave partial changes, so never re-run the same chunk blindly. Run the recovery script for its IDs, update the ledger, then retry only the occurrences that are `pending`. If timeouts repeat, use chunks of 20.

```js
const PAGE_ID = '0:1';
const IDS = ['1:20', '1:31']; // the occurrences of the failed call
const page = await figma.getNodeByIdAsync(PAGE_ID);
await figma.setCurrentPageAsync(page);
const bySource = new Map(page.findAllWithCriteria({ types: ['INSTANCE'] })
  .filter(n => n.getSharedPluginData('componentize', 'source'))
  .map(n => [n.getSharedPluginData('componentize', 'source'), n]));
const out = [];
for (const id of IDS) {
  const orig = await figma.getNodeByIdAsync(id), inst = bySource.get(id);
  if (!orig) { out.push({ id, status: inst ? 'replaced' : 'missing', instanceId: inst ? inst.id : null }); continue; }
  if (inst) inst.remove(); // interrupted before its original was removed: undo it
  if (!orig.visible) orig.visible = true;
  out.push({ id, status: 'pending', undone: !!inst });
}
return out;
```

`missing` means that the original is gone and no tagged instance exists: report it, and check the restore point. When the loop returned `traced: false` (tagging is unavailable), use chunks of 10. After a failure, look in each pending original's parent for an instance just before it with the same size, and remove it before retrying.

---

## 9. Final verification

1. When every chunk is done, call `get_screenshot` for every scope root, using the same list as the baseline (detection.md §2).
2. Compare each screenshot with its baseline. The approved differences (§5) are expected. Report any other difference under "Unexpected differences", with the node link. Do not correct it silently.
3. Remove the tracing tags on each page that had replacements:

```js
const PAGE_ID = '0:1';
const page = await figma.getNodeByIdAsync(PAGE_ID);
await figma.setCurrentPageAsync(page);
const tagged = page.findAllWithCriteria({ types: ['INSTANCE'] }).filter(n => n.getSharedPluginData('componentize', 'source'));
for (const n of tagged) n.setSharedPluginData('componentize', 'source', '');
return { cleared: tagged.length };
```

4. Delete any temporary review board that is still there. `Componentize Review — temporary` is removed with the script in detection.md §11. `Token Review — temporary` belongs to Workflow F, which removes it itself; check that it is gone.
5. Write the report (§10). It includes the final ledger as the ID map.

---

## 10. Report

```
## Componentization report — {scope}
Restore point: "Before figma-componentize — Home section" (saved by the user before the first write)
Components page: Components — https://www.figma.com/design/{fileKey}/?node-id=40-1

Components (2)
| Component | ID | Kind | Variants | Properties | Section |
| Button | 40:9 | set | Style=Filled, Style=Outlined | Label (TEXT), Show leading icon (BOOLEAN), Leading icon (INSTANCE_SWAP) | 40:1 |
| Card | 42:7 | component | — | Headline (TEXT), Supporting text (TEXT) | 42:1 |
Reused: Chip (existing 12:30) for 1 occurrence · Wrapped: none · Skipped in build: none

Tokens (Workflow F): Ref 12 · Sys 9 · Comp 14 · Text Styles 2 (Label/Large, Body/Medium) · Effect Styles 1
  Bindings: 31 · Merged: G2 padding 15 → 16 · Skipped: 4 (AUTO line height 2 · gradient 1 · instance children 1)
  (or: "Not tokenized: the user declined the token plan" when the token step was skipped)

Replaced: 11 of 12 occurrences · Covered by an outer instance: 2
  Approved: 1:31 paddingLeft of "Button" 15 → 16; width 118 → 120
Kept: 1
  1:44 missing font in 1:45: Brand Sans Bold
Unexpected differences in the final screenshots: none
Review boards: removed

ID map (ledger)
{ "restorePoint": "…", "page": { … }, "components": { … }, "occurrences": { "1:20": { "status": "replaced", "instanceId": "50:3" }, … } }
```

| Field | Source |
|-------|--------|
| Components: ID, name, kind, variants, properties, section | Ledger `components` (build-recipes.md §2, §5, §6) |
| Reused, wrapped, skipped in build | Plan and build results |
| Tokens | Workflow F's returned `variables` (Ref, Sys, Comp IDs), `styles` (Text and Effect Style IDs; show their names), `bindings`, `mergedGroups`, and `skipped`, copied in full into the ID map section. When the user declined the token step, the components are marked untokenized |
| Replaced, covered, approved, kept with reasons | Replacement results (§6) and §7 |
| Unexpected differences | Final verification (§9) |
| Restore point, Components page link | Ledger `restorePoint` and `page` |
| ID map | The final ledger: original → component → instance |
