# Build Recipes — Restore Point, Components Page, Components, Variants, Properties

> Used by `figma-componentize` steps 5–6, after the plan is confirmed. Building is a Tier 2 change: it only adds pages, sections, and components; the original layers stay untouched until replacement (replacement.md).
> Run one component or one component set per `use_figma` call, sequentially, and keep every result under 20 kB (return IDs only). Paste the helper blocks 9-2 to 9-4 from detection.md where a script says so.

Contents

1. Order of work
2. Restore point and ledger
3. Components page
4. Build one component
5. Variants and the component set grid
6. Component properties
7. Naming

---

## 1. Order of work

1. Ask for the restore point (§2) and wait.
2. Find or create the Components page (§3).
3. For each group in the plan, atoms first, then molecules, then organisms:
   - group without variants: build one component (§4), then add its properties (§6);
   - group with variants: build one component per variant (§4, `VARIANT` set), combine and arrange them (§5), then add the properties on the set (§6).
4. Record every result in the ledger (§2) as soon as the call returns.
5. Hand the new components to figma-m3-variables Workflow F (SKILL.md step 7), then replace the originals (replacement.md).

Groups marked `reuse` are not built; their occurrences are replaced with the existing component.

---

## 2. Restore point and ledger

`use_figma` cannot save versions, and no other plugin API creates a restore point. Before the first write, ask:

> Before I change anything, please save a version: press ⌘⌥S (Ctrl+Alt+S on Windows) or choose **File → Save to version history**, and name it "Before figma-componentize — {scope name}". Reply when it is saved.

Write nothing until the user confirms. If the user declines, stop.

Keep a **ledger** in the conversation from the first write on, update it after every call, and include it in the report. It tells you what is already done when a call fails, so you retry only the rest.

```json
{
  "restorePoint": "Before figma-componentize — Home section",
  "page": { "id": "0:5", "name": "Components", "created": true, "hostSectionId": null },
  "components": {
    "Button": { "kind": "set", "sectionId": "40:1", "setId": "40:9", "variants": { "Style=Filled": "40:2", "Style=Outlined": "40:5" }, "props": { "Label": "Label#40:10" }, "wrapped": false }
  },
  "occurrences": {
    "1:20": { "group": "Button", "variant": "Style=Filled", "status": "pending", "instanceId": null, "reason": null }
  }
}
```

After a failed call: read the ledger, re-read the nodes it names (`getNodeByIdAsync`), and continue from the first step whose result is missing. A failed call can leave partial changes, so never assume nothing happened.

---

## 3. Components page

Find an existing page whose name contains "components" (any case, emoji and prefixes ignored) or "元件"; otherwise create `Components` (Tier 2).

```js
const page = figma.root.children.find(p => /components?/i.test(p.name) || /元件/.test(p.name));
if (page) return { pageId: page.id, name: page.name, created: false };
try {
  const created = figma.createPage();
  created.name = 'Components';
  return { pageId: created.id, name: created.name, created: true };
} catch (e) {
  return { pageId: null, created: false, error: String(e), pageLimit: /only comes with 3 pages/i.test(String(e)) };
}
```

When `pageLimit` is true (Starter plan: 3 pages per design file), ask which existing page should hold the components, build nothing until the user answers, then create a host Section there:

```js
const PAGE_ID = '0:1';
const page = await figma.getNodeByIdAsync(PAGE_ID);
await figma.setCurrentPageAsync(page);
const right = page.children.reduce((x, n) => Math.max(x, n.x + n.width), 0);
const host = figma.createSection();
host.name = 'Components';
host.x = right + 400;
host.y = 0;
return { pageId: page.id, hostSectionId: host.id };
```

---

## 4. Build one component

Creates the main component from a **clone** of the representative occurrence (`reps` in the detection summary), inside a Section named after the component. Inner occurrences of components that are already built become exposed instances; automatically named layers get anatomy names; the converted node is checked.

Paste helpers 9-2 to 9-4 from detection.md first (for `role`, `uniq`, `AUTO_NAME`, `fontsOf`, `pickVariant`), then these blocks.

```js
const REP_ID = '1:20';     // representative occurrence
const PAGE_ID = '0:5';     // Components page (or the page of the host Section)
const HOST_ID = null;      // host Section when the page limit was hit
const NAME = 'Button';     // component (or set) name
const VARIANT = null;      // 'Style=Filled' when this call builds one variant of a set
const SECTION_ID = null;   // this group's Section, once the first variant created it
const AT = null;           // { x, y } for a new Section: the `next` value of the previous build; null = right of existing content
const KIND = 'control';    // 'control' → label, label-2 …; 'container' → headline, supporting-text, text-3 …
const INNER = [];          // [{ path: [3], componentId: '40:2', props: { 'Label#40:10': 'Buy' } }]: outermost built occurrences inside the representative
```

```js
async function loadFonts(n) {
  try { await Promise.all(fontsOf(n).map(f => figma.loadFontAsync(f))); return true; } catch (e) { return false; }
}
const nodeAtPath = (root, path) => path.reduce((n, i) => (n && n.children ? n.children[i] : null), root);
async function swapInClone(target, main, props) { // replace a raw inner occurrence inside the clone; keep it raw when the result differs
  const box = target.absoluteBoundingBox, parent = target.parent, index = parent.children.indexOf(target);
  const inst = main.createInstance();
  parent.insertChild(index, inst);
  const auto = parent.layoutMode && parent.layoutMode !== 'NONE';
  if (auto && 'layoutPositioning' in target) inst.layoutPositioning = target.layoutPositioning;
  if (!auto || target.layoutPositioning === 'ABSOLUTE') inst.relativeTransform = target.relativeTransform;
  inst.resize(target.width, target.height);
  if (auto) for (const a of ['Horizontal', 'Vertical']) if (target[`layoutSizing${a}`] && (target[`layoutSizing${a}`] !== 'HUG' || main.layoutMode !== 'NONE')) inst[`layoutSizing${a}`] = target[`layoutSizing${a}`];
  if (Object.keys(props).length) inst.setProperties(props);
  target.visible = false;
  const b = inst.absoluteBoundingBox;
  const same = ['x', 'y', 'width', 'height'].every(k => Math.abs(b[k] - box[k]) <= 0.5);
  if (!same) { inst.remove(); target.visible = true; return { path: null, kept: target.id, reason: `bounds ${JSON.stringify(box)} → ${JSON.stringify(b)}` }; }
  target.remove();
  return { instanceId: inst.id };
}
```

```js
const page = await figma.getNodeByIdAsync(PAGE_ID);
await figma.setCurrentPageAsync(page);
const rep = await figma.getNodeByIdAsync(REP_ID);
if (!(await loadFonts(rep))) return { error: 'fonts could not be loaded', repId: REP_ID };
let section = SECTION_ID ? await figma.getNodeByIdAsync(SECTION_ID) : null;
if (!section) {
  const parent = HOST_ID ? await figma.getNodeByIdAsync(HOST_ID) : page;
  const at = AT || { x: parent.children.reduce((x, n) => Math.max(x, n.x + n.width), 0) + 200, y: 0 };
  section = figma.createSection();
  section.name = NAME;
  parent.appendChild(section);
  section.x = at.x;
  section.y = at.y;
}
const clone = rep.clone();
section.appendChild(clone);
clone.x = 40;
clone.y = 40;
const inner = [];
for (const it of INNER) {
  const target = nodeAtPath(clone, it.path);
  let main = await figma.getNodeByIdAsync(it.componentId);
  if (main && main.type === 'COMPONENT_SET') main = pickVariant(target, main); // a reused set: its nearest variant
  if (!main) { inner.push({ kept: target.id, reason: 'no matching variant' }); continue; }
  inner.push((await loadFonts(main)) ? await swapInClone(target, main, it.props || {}) : { kept: target.id, reason: 'fonts could not be loaded' });
}
```

```js
let renamed = 0, textNo = 0, seenText = false;
const TEXT_NAMES = KIND === 'control' ? ['label'] : ['headline', 'supporting-text'];
(function rename(x) {
  for (const c of x.children || []) {
    if (c.type === 'INSTANCE') continue; // instance names come from their components and key their slots
    const r = role(c);
    if (r === 'text') { textNo++; seenText = true; }
    if (AUTO_NAME.test(c.name)) {
      c.name = r === 'text' ? TEXT_NAMES[textNo - 1] || (KIND === 'control' ? `label-${textNo}` : `text-${textNo}`)
        : r === 'icon' ? (seenText ? 'trailing-icon' : 'leading-icon')
        : r === 'container' ? 'container' : r;
      renamed++;
    }
    if (r === 'container') rename(c);
  }
})(clone);
let comp, wrapped = false;
try { comp = figma.createComponentFromNode(clone); }
catch (e) {
  const frame = figma.createFrame();
  frame.name = NAME;
  frame.fills = [];
  frame.clipsContent = false;
  section.appendChild(frame);
  frame.x = clone.x;
  frame.y = clone.y;
  frame.resize(clone.width, clone.height);
  frame.appendChild(clone);
  clone.x = 0;
  clone.y = 0;
  try { comp = figma.createComponentFromNode(frame); wrapped = true; }
  catch (e2) { frame.remove(); return { skipped: true, reason: String(e2), repId: REP_ID, sectionId: section.id }; }
}
if (comp.type !== 'COMPONENT') return { error: `unexpected node type ${comp.type}`, nodeId: comp.id };
comp.name = VARIANT || NAME;
for (const r of inner) if (r.instanceId) { const n = await figma.getNodeByIdAsync(r.instanceId); if (n && n.type === 'INSTANCE') n.isExposedInstance = true; }
section.resizeWithoutConstraints(Math.max(section.width, comp.x + comp.width + 40), Math.max(section.height, comp.y + comp.height + 40));
return {
  componentId: comp.id, sectionId: section.id, wrapped, renamed, inner,
  childCount: comp.children.length, expectedChildren: wrapped ? 1 : rep.children.length,
  next: { x: section.x, y: section.y + section.height + 120 },
};
```

Check the result before the next call: `childCount` must equal `expectedChildren`; every `inner` entry should have an `instanceId` (an entry with `kept` means that inner part stayed raw — report it); `wrapped: true` means paths inside this component start with `[0]` (record it in the ledger).

---

## 5. Variants and the component set grid

Build every variant with §4 (same `SECTION_ID`, `VARIANT` such as `Style=Outlined, State=Disabled`), then combine them. Combining leaves the variants stacked at one position, so arrange them explicitly: `State` values as columns (without `State`, the last property), the combinations of the other properties as rows, 20 px gaps, 40 px padding. List each property's values with the default first so the default variant lands at the top-left. A set holds at most 30 variants; split larger groups by one property before building.

```js
const cartesian = lists => lists.reduce((acc, l) => acc.flatMap(a => l.map(v => [...a, v])), [[]]);
function gridLayout(items, order, gap = 20, pad = 40) { // items: [{ id, props, w, h }], order: { Style: [...], State: [...] }
  const props = Object.keys(order);
  const colProp = props.includes('State') ? 'State' : props[props.length - 1];
  const rowProps = props.filter(p => p !== colProp);
  const rowKey = it => rowProps.map(p => it.props[p]).join('|');
  const rows = cartesian(rowProps.map(p => order[p])).map(v => v.join('|')).filter(k => items.some(it => rowKey(it) === k));
  const cols = order[colProp].filter(v => items.some(it => it.props[colProp] === v));
  const colW = cols.map(v => Math.max(...items.filter(it => it.props[colProp] === v).map(it => it.w)));
  const rowH = rows.map(k => Math.max(...items.filter(it => rowKey(it) === k).map(it => it.h)));
  const at = (sizes, i) => pad + sizes.slice(0, i).reduce((s, x) => s + x + gap, 0);
  const cells = items.map(it => ({ id: it.id, x: at(colW, cols.indexOf(it.props[colProp])), y: at(rowH, rows.indexOf(rowKey(it))) }));
  const span = sizes => pad * 2 + sizes.reduce((s, x) => s + x, 0) + gap * Math.max(0, sizes.length - 1);
  return { cells, width: span(colW), height: span(rowH) };
}
```

```js
const SECTION_ID = '40:1', NAME = 'Button', IDS = ['40:2', '40:5'];
const ORDER = { Style: ['Filled', 'Outlined'] }; // default value first for every property
const section = await figma.getNodeByIdAsync(SECTION_ID);
let page = section;
while (page.type !== 'PAGE') page = page.parent;
await figma.setCurrentPageAsync(page);
if (IDS.length > 30) return { error: 'more than 30 variants: split the set by one property first' };
const comps = await Promise.all(IDS.map(id => figma.getNodeByIdAsync(id)));
const set = figma.combineAsVariants(comps, section);
set.name = NAME;
const grid = gridLayout(set.children.map(c => ({ id: c.id, props: c.variantProperties, w: c.width, h: c.height })), ORDER);
for (const cell of grid.cells) { const n = set.children.find(c => c.id === cell.id); n.x = cell.x; n.y = cell.y; }
set.resizeWithoutConstraints(grid.width, grid.height);
set.x = 40;
set.y = 40;
section.resizeWithoutConstraints(set.width + 80, set.height + 80);
return { setId: set.id, variants: set.children.map(c => ({ id: c.id, name: c.name })), size: { w: set.width, h: set.height } };
```

| `ORDER` | Grid |
|---------|------|
| `{ Style: ['Filled', 'Outlined'], State: ['Enabled', 'Disabled'] }` | Rows Filled, Outlined; columns Enabled, Disabled; `Style=Filled, State=Enabled` at the top-left |
| `{ Style: ['Filled', 'Outlined'], Size: ['Small', 'Large'], State: ['Enabled', 'Disabled'] }` | Rows Filled·Small, Filled·Large, Outlined·Small, Outlined·Large; columns Enabled, Disabled |
| `{ Size: ['Small', 'Medium', 'Large'] }` | One row; columns Small, Medium, Large |

---

## 6. Component properties

Add the properties from the detection summary (`props`: type, name, slot) on the **component set** after combining, or on the component when it has no variants, and link them to the matching layer in **every** variant. Layers are found by the same content slots the detection used: text index for TEXT, icon slot key (`leading icon#0`) for BOOLEAN and INSTANCE_SWAP. Exposed instances of smaller components are skipped, because their own properties are edited directly. Paste helpers 9-2 to 9-4 from detection.md first.

```js
const TARGET_ID = '40:9'; // component set, or the component when it has no variants
const PROPS = [
  { type: 'TEXT', name: 'Label', slot: 0, default: 'Save' },
  { type: 'BOOLEAN', name: 'Show leading icon', slot: 'leading icon#0', default: true },
  { type: 'INSTANCE_SWAP', name: 'Leading icon', slot: 'leading icon#0', default: '12:3', preferred: [] }, // default: a component node ID
];
const FIELD = { TEXT: 'characters', BOOLEAN: 'visible', INSTANCE_SWAP: 'mainComponent' };
const target = await figma.getNodeByIdAsync(TARGET_ID);
let page = target;
while (page.type !== 'PAGE') page = page.parent;
await figma.setCurrentPageAsync(page);
const variants = target.type === 'COMPONENT_SET' ? target.children : [target];
const keys = {}, missing = [];
for (const p of PROPS) {
  const options = p.preferred && p.preferred.length ? { preferredValues: p.preferred } : undefined;
  keys[p.name] = target.addComponentProperty(p.name, p.type, p.default, options);
}
for (const v of variants) {
  CAND.clear();
  for (const n of v.findAll(x => x.type === 'INSTANCE' && x.isExposedInstance)) CAND.add(n.id);
  const content = contentOf(v);
  for (const p of PROPS) {
    const id = p.type === 'TEXT' ? content.textIds[p.slot] : content.slots.find(s => s.key === p.slot)?.id;
    const layer = id ? await figma.getNodeByIdAsync(id) : null;
    if (!layer) { missing.push({ variant: v.name, prop: p.name }); continue; }
    if (p.type === 'TEXT') {
      const fonts = layer.fontName === figma.mixed ? layer.getRangeAllFontNames(0, layer.characters.length) : [layer.fontName];
      await Promise.all(fonts.map(f => figma.loadFontAsync(f)));
    }
    layer.componentPropertyReferences = { ...(layer.componentPropertyReferences || {}), [FIELD[p.type]]: keys[p.name] };
  }
}
return { keys, defined: Object.keys(target.componentPropertyDefinitions), missing };
```

Rules:

- A variant without the optional layer (no leading icon) is listed in `missing` for that BOOLEAN or INSTANCE_SWAP property; that is expected when the representative of that variant had no icon. Any other `missing` entry is an error to report.
- `INSTANCE_SWAP` defaults must be a component node ID; `preferredValues` take `{ type: 'COMPONENT' | 'COMPONENT_SET', key }` using component keys.
- Never make one variant per icon — icon differences are INSTANCE_SWAP properties.
- Linking a text layer needs its fonts loaded; layers with mixed fonts load every range font (`getRangeAllFontNames`).

---

## 7. Naming

| Item | Rule | Example |
|------|------|---------|
| Component or set | Title Case, from the pattern or a meaningful layer name; colliding names get a distinctive word or a number | `Button`, `List Item`, `Product Card` |
| Variant | `Property=Value` pairs, order Style, Size, State, only properties with more than one value | `Style=Outlined, State=Disabled` |
| Variant properties | `Style`, `Size`, `State`; Title Case values | `Filled`, `Small`, `Disabled` |
| Component properties | From the anatomy | `Label`, `Headline`, `Supporting text`, `Show leading icon`, `Leading icon` |
| Auto-named child layers | Anatomy names | `container`, `label`, `label-2`, `headline`, `supporting-text`, `leading-icon`, `trailing-icon`, `image`, `divider` |
| Section | The component or set name | `Button` |

Meaningful designer names are kept (`Price`, `Avatar`); only automatic names (`Frame 12`, `Rectangle 3`, `Vector`) are replaced.
