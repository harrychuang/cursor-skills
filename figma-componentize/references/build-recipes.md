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
8. Add a variant to an existing component set

---

## 1. Order of work

1. Ask for the restore point (§2) and wait.
2. Find or create the Components page (§3).
3. For each group in the plan, atoms first, then molecules, then organisms:
   - new group without variants: build one component (§4), then add its properties (§6);
   - new group with variants: build one component per variant (§4, `VARIANT` set), combine and arrange them (§5), then add the properties on the set (§6);
   - variant the designer chose to add to an existing set (detection.md §11): add it (§8) at its group's level, so before any larger component that contains one of its occurrences.
4. Record every result in the ledger (§2) as soon as the call returns.
5. Hand the new components and the added variants to figma-m3-variables Workflow F (SKILL.md step 7), then replace the originals (replacement.md).

Groups whose `kind` is `reuse` are not built. Their occurrences are replaced with the existing variants that detection assigned (`known` in the `MODE: 'members'` rows), and nothing picks a variant again at write time.

For the inner occurrences of a representative (`INNER` in §4 and §8), `componentId` is:

| The inner occurrence belongs to | `componentId` |
|---------------------------------|---------------|
| A newly built group | The ledger's component or variant ID |
| A reused group, covered | The occurrence's `known` |
| A reused group, with a variant added for it | The added variant's ID |
| Occurrences the designer keeps as they are | Not in `INNER`: that part stays raw inside the component; report it |

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
    "Button": { "kind": "set", "sectionId": "40:1", "setId": "40:9", "variants": { "Style=Filled": "40:2", "Style=Outlined": "40:5" }, "props": { "Label": "Label#40:10" }, "wrapped": false, "declined": null },
    "Chip": { "kind": "reuse", "existingId": "12:9", "quality": "partial", "chosen": false, "added": [{ "variantId": "12:41", "name": "Style=Outlined" }] }
  },
  "occurrences": {
    "1:20": { "group": "Button", "variant": "Style=Filled", "status": "pending", "instanceId": null, "reason": null },
    "1:60": { "group": "Chip", "variant": "Style=Filled", "main": "12:30", "status": "pending", "instanceId": null, "reason": null },
    "1:61": { "group": "Chip", "variant": "Style=Outlined", "main": "12:41", "status": "pending", "instanceId": null, "reason": null },
    "1:62": { "group": "Chip", "variant": "Style=Tonal", "main": null, "status": "kept", "instanceId": null, "reason": "no matching variant — kept by the designer" }
  }
}
```

| Reuse field | Meaning |
|-------------|---------|
| `components[group].kind: "reuse"` | The group uses an existing local component; nothing is built for it except added variants |
| `existingId`, `quality` | The existing component or set (`reuse.id`) and the match quality (`exact`, `partial`, `unconfirmed` confirmed by the designer) |
| `chosen` | `true` when the designer confirmed or picked this component (**Reuse {name}** for an `unconfirmed` match or one of two equal components, or **Reuse another component**; detection's `reuse.forced`) |
| `added` | Variants added to the existing set (§8): `variantId` and `name`; empty when none |
| `components[group].declined` | On a newly built group: the ID of the existing component whose reuse the designer declined (**Build new instead**); `null` when there was none |
| `occurrences[id].main` | The existing variant assigned to that occurrence (`known`), or the added variant; `null` for an occurrence kept by the designer's decision |

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
  if (main && main.type === 'COMPONENT_SET') main = pickVariant(target, main); // guard only: the plan passes a variant ID (§1)
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
| New component next to a local component with the same name | Never the same normalized name (last path segment, lowercase, letters and digits only): ask the designer for a distinct name, proposing the style or a descriptive word from the layer names (detection.md §11) | `Outlined Button` |
| Variant added to an existing set | The set's own variant properties, confirmed by the designer (§8) | `Type=Secondary, Size=md` |
| Variant | `Property=Value` pairs, order Style, Size, State, only properties with more than one value | `Style=Outlined, State=Disabled` |
| Variant properties | `Style`, `Size`, `State`; Title Case values | `Filled`, `Small`, `Disabled` |
| Component properties | From the anatomy | `Label`, `Headline`, `Supporting text`, `Show leading icon`, `Leading icon` |
| Auto-named child layers | Anatomy names | `container`, `label`, `label-2`, `headline`, `supporting-text`, `leading-icon`, `trailing-icon`, `image`, `divider` |
| Section | The component or set name | `Button` |

Meaningful designer names are kept (`Price`, `Avatar`); only automatic names (`Frame 12`, `Rectangle 3`, `Vector`) are replaced.

---

## 8. Add a variant to an existing component set

Used only when the designer answered **Add a variant to {name}** for occurrences that no existing variant fits (detection.md §11). It changes a component set the designer already owns, so it is a Tier 2 change that needs this explicit answer for that group; an earlier "apply everything automatically" does not allow it. One variant per `use_figma` call.

- **Name**: `VARIANT_NAME` uses exactly the set's own variant properties (they need not be `Style`, `Size`, `State`). A name that omits one of them, adds another, or equals an existing variant's name is rejected before any write; ask the designer again.
- **Source**: a clone of the representative occurrence; inner occurrences become instances as in §4 (`INNER`).
- **Layer names and property links** come from the nearest existing variant by structural position: containers in order, texts in order, icon and instance slots by slot key. Matching names keep a designer's overrides when they switch variants; matching links make the set's existing properties work on the new variant.
- **Placement**: below the existing variants with a 20 px gap, aligned with the leftmost variant; the set grows and keeps its right and bottom margins. A set with auto layout places the new variant itself.
- **Untouched**: no existing variant is moved, renamed, restyled, or deleted, and no property is added to the set.
- **No frame wrapper**: when the conversion fails, do not wrap the clone in a frame as §4 does. The extra frame would give the new variant a different structure from the other variants, and overrides would be lost when a designer switches variants.
- **Checks after the write**: the new component's parent is the set; the set has exactly one more child; every earlier variant has the same ID, position, and size; the set has the same property names. When a check fails or the call throws, the script removes the new component, restores the set's size, and returns `added: false` with the reason. Then ask the designer: **Build a new component** or **Keep as they are**.
- **Neighbours**: `overlap` lists sibling nodes the enlarged set now covers, and `outgrown` is true when the set extends beyond its parent Section or frame. Report them; do not move or resize anything.
- **Afterwards**: record the variant in the ledger (§2), use `variantId` as the `main` of those occurrences (replacement.md §2), and add `variantId` to Workflow F's scope.

Paste helpers 9-2 to 9-4 from detection.md, then the helper block of §4 (`loadFonts`, `nodeAtPath`, `swapInClone`), then these blocks.

```js
const SET_ID = '40:9';                 // the existing component set (reuse.id)
const REP_ID = '1:31';                 // representative uncovered occurrence
const NEAREST_ID = '40:2';             // reuse.uncovered[variant].nearest
const VARIANT_NAME = 'Style=Outlined'; // confirmed by the designer
const KIND = 'control';                // as in §4: names texts that have no counterpart in the nearest variant
const INNER = [];                      // as in §4
function variantNameIssue(props, existing, name) { // props: the set's variant property names; existing: its variant names → null when the name is usable
  const pairs = name.split(',').map(p => p.split('=').map(x => x.trim()));
  if (pairs.some(p => p.length !== 2 || !p[0] || !p[1])) return 'not in Property=Value form';
  const keys = pairs.map(p => p[0]);
  if (new Set(keys).size !== keys.length) return 'a property is repeated';
  const missing = props.filter(p => !keys.includes(p)), unknown = keys.filter(k => !props.includes(k));
  if (missing.length || unknown.length) return [missing.length ? `missing ${missing.join(', ')}` : '', unknown.length ? `unknown ${unknown.join(', ')}` : ''].filter(Boolean).join('; ');
  const canon = n => n.split(',').map(p => p.split('=').map(x => x.trim()).join('=')).sort().join();
  return existing.some(e => canon(e) === canon(name)) ? 'duplicate name' : null;
}
const slotBelow = (boxes, gap = 20) => ({ x: Math.min(...boxes.map(b => b.x)), y: Math.max(...boxes.map(b => b.y + b.height)) + gap }); // boxes: the existing variants
```

```js
const get = id => figma.getNodeByIdAsync(id);
const set = await get(SET_ID);
if (!set || set.type !== 'COMPONENT_SET') return { added: false, reason: 'not a component set' };
let page = set;
while (page.type !== 'PAGE') page = page.parent;
await figma.setCurrentPageAsync(page);
const defs = set.componentPropertyDefinitions, defNames = Object.keys(defs);
const props = defNames.filter(k => defs[k].type === 'VARIANT');
const issue = variantNameIssue(props, set.children.map(c => c.name), VARIANT_NAME);
if (issue) return { added: false, reason: `variant name: ${issue}`, properties: props, variants: set.children.map(c => c.name).slice(0, 40) };
const rep = await get(REP_ID), nearest = await get(NEAREST_ID);
if (!rep || !nearest || !nearest.parent || nearest.parent.id !== SET_ID) return { added: false, reason: 'representative or nearest variant not found' };
if (!(await loadFonts(rep)) || !(await loadFonts(nearest))) return { added: false, reason: 'fonts could not be loaded' };
const before = set.children.map(c => ({ id: c.id, x: c.x, y: c.y, width: c.width, height: c.height }));
const size = { w: set.width, h: set.height }, auto = !!set.layoutMode && set.layoutMode !== 'NONE';
const clone = rep.clone();
set.parent.appendChild(clone);
const inner = [], missing = [];
let comp = null;
const undo = reason => { // nothing of the new variant stays; the set is as it was
  if (comp && !comp.removed) comp.remove(); else if (!comp && !clone.removed) clone.remove();
  if (!auto && (set.width !== size.w || set.height !== size.h)) set.resizeWithoutConstraints(size.w, size.h);
  return { added: false, reason: String(reason).slice(0, 240) };
};
```

```js
try {
  for (const it of INNER) {
    const target = nodeAtPath(clone, it.path);
    let main = await get(it.componentId);
    if (main && main.type === 'COMPONENT_SET') main = pickVariant(target, main);
    if (!main) { inner.push({ kept: target.id, reason: 'no matching variant' }); continue; }
    inner.push((await loadFonts(main)) ? await swapInClone(target, main, it.props || {}) : { kept: target.id, reason: 'fonts could not be loaded' });
  }
  comp = figma.createComponentFromNode(clone); // no frame wrapper on failure
  comp.name = VARIANT_NAME;
  for (const r of inner) if (r.instanceId) { const n = await get(r.instanceId); if (n && n.type === 'INSTANCE') n.isExposedInstance = true; }
  set.appendChild(comp);
  if (!auto) {
    const at = slotBelow(before);
    comp.x = at.x;
    comp.y = at.y;
    const right = Math.max(0, size.w - Math.max(...before.map(b => b.x + b.width))), bottom = Math.max(0, size.h - Math.max(...before.map(b => b.y + b.height)));
    set.resizeWithoutConstraints(Math.max(size.w, comp.x + comp.width + right), comp.y + comp.height + bottom);
  }
  (function names(a, b) { // containers pair in order
    const kids = n => (n.children || []).filter(c => c.visible !== false && role(c) === 'container');
    const ka = kids(a), kb = kids(b);
    ka.forEach((c, k) => { if (kb[k]) { c.name = kb[k].name; names(c, kb[k]); } });
  })(comp, nearest);
  const content = v => { CAND.clear(); for (const n of v.findAll(x => x.type === 'INSTANCE' && x.isExposedInstance)) CAND.add(n.id); return contentOf(v); };
  const link = (layer, from, fields) => {
    const refs = from.componentPropertyReferences || {}, add = {};
    for (const f of fields) if (refs[f]) add[f] = refs[f];
    if (Object.keys(add).length) layer.componentPropertyReferences = { ...(layer.componentPropertyReferences || {}), ...add };
  };
  const cn = content(comp), cm = content(nearest);
  for (let k = 0; k < cn.textIds.length; k++) {
    const a = await get(cn.textIds[k]), b = cm.textIds[k] ? await get(cm.textIds[k]) : null;
    if (!b) { missing.push(`text ${k + 1}`); if (AUTO_NAME.test(a.name)) a.name = KIND === 'control' ? `label-${k + 1}` : `text-${k + 1}`; continue; }
    a.name = b.name;
    link(a, b, ['characters']);
  }
  for (const slot of cn.slots) {
    const twin = cm.slots.find(x => x.key === slot.key);
    if (!twin) { missing.push(slot.key); continue; }
    const a = await get(slot.id), b = await get(twin.id);
    if (a.type !== 'INSTANCE') a.name = b.name;
    link(a, b, a.type === 'INSTANCE' ? ['visible', 'mainComponent'] : ['visible']);
  }
  const now = set.children, defsNow = Object.keys(set.componentPropertyDefinitions);
  const same = b => { const c = now.find(x => x.id === b.id); return !!c && ['x', 'y', 'width', 'height'].every(k => Math.abs(c[k] - b[k]) < 0.01); };
  const failed = !comp.parent || comp.parent.id !== SET_ID ? 'the new variant is not in the set'
    : now.length !== before.length + 1 ? `the set has ${now.length} variants, expected ${before.length + 1}`
    : !before.every(same) ? 'an existing variant moved or changed size'
    : defsNow.length !== defNames.length || defsNow.some(k => !defNames.includes(k)) ? 'the set gained or lost a property' : null;
  if (failed) return undo(failed);
} catch (e) {
  return undo(`error: ${e && e.message ? e.message : String(e)}`);
}
const hit = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const box = set.absoluteBoundingBox, host = set.parent, hostBox = host.type === 'PAGE' ? null : host.absoluteBoundingBox;
return {
  added: true, variantId: comp.id, setId: set.id, name: comp.name, unchanged: before.length, inner, missing,
  overlap: host.children.filter(n => n.id !== set.id && n.absoluteBoundingBox && hit(n.absoluteBoundingBox, box)).map(n => n.id).slice(0, 20),
  outgrown: !!hostBox && (box.x + box.width > hostBox.x + hostBox.width || box.y + box.height > hostBox.y + hostBox.height),
};
```

| Set's variant properties | Existing variants | `VARIANT_NAME` | Result |
|--------------------------|-------------------|----------------|--------|
| Style | `Style=Filled` | `Style=Outlined` | Accepted |
| Type, Size | `Type=Primary, Size=md` | `Type=Secondary, Size=md` | Accepted |
| Type, Size | `Type=Primary, Size=md` | `Style=Outlined` | Rejected: `missing Type, Size; unknown Style` |
| Style, State | `Style=Filled, State=Enabled` | `Style=Outlined` | Rejected: `missing State` |
| Style | `Style=Filled` | `Style=Filled` | Rejected: `duplicate name` |

Check the result before the next call:

- `added: true`: `unchanged` equals the number of variants the set had. `missing` lists texts or slots that have no counterpart in the nearest variant; those layers keep their names and get no property link, so report them. An `inner` entry with `kept` means that inner part stayed raw; report it.
- `added: false`: nothing was added. For `variant name: …`, ask the designer for another name and run the call again. For any other reason, ask **Build a new component** or **Keep as they are**.
