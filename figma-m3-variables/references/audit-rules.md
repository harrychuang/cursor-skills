# Audit Rules — figma-m3-variables

> Used by Workflow C. Every rule has a definition, a severity, a detection, a fix, and the change tier of the fix.
> Scripts use the helpers in [binding-recipes.md](binding-recipes.md) §1 (`r2`, `hex`, `lab`, `tone`, `deltaE`, `decodeNum`, `webSyntax`, `aliasRefs`, `layerOf`). `aliasRefs` reads plain aliases, composed colors, and the older `VARIABLE_EXPRESSION` shape, so every alias check also covers both fields of a composed color.
> Variable and style rules run once per file. Node rules run **one page per `use_figma` call** (use_figma starts every call on the first page and cannot load all pages).

Contents

1. Audit process
2. Rule summary
3. Variable and style rules script
4. Node rules script
5. Rules 1–18
6. Fix snippets
7. Report format

---

## 1. Audit process

1. Run P2 (binding-recipes.md §2) to read collections, variables, and styles.
2. Run the variable and style rules script (§3) once.
3. Run the node rules script (§4) once per page in scope, one call after another, and merge the results. For a node or section scope, pass its IDs instead of the whole page.
4. Report every finding by severity (§7).
5. Ask which fixes to apply. Each fix has a tier (§2): Tier 2 fixes are confirmed as a batch; Tier 3 fixes are confirmed group by group with visual evidence (the review board of value-harvest.md §7 for rule 13).
6. Apply the approved fixes, re-run the rules they touched, and report what remains open.

---

## 2. Rule summary

| # | Rule | Severity | Checked on | Fix tier |
|---|------|----------|------------|----------|
| 1 | Comp variable aliases a Ref variable directly | error | variables | 2; 3 when the variable is bound |
| 2 | `ALL_SCOPES`, or an empty scope on a non-Ref variable (plus other invalid scopes) | error | variables | 2 |
| 3 | Missing or non-canonical WEB code syntax | warning | variables | 2 |
| 4 | More than one prefix in the file | error | variables | 3 |
| 5 | Ref variable bound directly to a node | error | nodes | 2; 3 when the replacement resolves to a different value |
| 6 | Collection without variables | info | variables | 3 (delete) |
| 7 | Component or region vocabulary in a Ref or Sys name | warning | variables | 2 (rename) |
| 8 | Alias direction other than Sys → Ref and Comp → Sys | error | variables | 2; 3 when the variable is bound |
| 9 | Variable missing a value for a mode of its collection | error | variables | 2 |
| 10 | Bound variable type incompatible with the node property | error | nodes | 3 |
| 11 | Component node bound to Sys although a matching Comp token exists | warning | nodes | 2 |
| 12 | Ref name does not match its value | error | variables | 2 (rename); 3 (change the value) |
| 13 | Duplicate or near-duplicate Ref values | warning | variables | 3 (merge) |
| 14 | Same spacing label resolving to different values | warning | variables | 2 (rename) |
| 15 | Hardcoded values inside components (token coverage) | warning | nodes | Workflow F plan (Tier 2 or higher) |
| 16 | Text Style or Effect Style fields not backed by variables | warning | styles | 2 |
| 17 | Legacy state token order | warning | variables | 2 (rename in place) |
| 18 | Name segment format violation | warning | variables | 2 (rename) |

---

## 3. Variable and style rules script

Checks rules 1, 2, 3, 4, 6, 7, 8, 9, 12, 13, 14, 16, 17, and 18. Read-only.

```js
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const byId = new Map(vars.map(v => [v.id, v]));
const lookup = async id => byId.get(id) ?? (await figma.variables.getVariableByIdAsync(id)); // library aliases
const F = [];
const add = (rule, severity, subject, message, fix) => F.push({ rule, severity, subject, message, fix });
const first = v => v.valuesByMode[Object.keys(v.valuesByMode)[0]];
const isColor = x => !!x && typeof x === 'object' && 'r' in x;
async function resolveRaw(v, depth = 0) {
  const refs = aliasRefs(first(v));
  if (!refs.length || depth > 10) return first(v);
  const t = await lookup(refs[0].id);
  return t ? resolveRaw(t, depth + 1) : null;
}
```

```js
// Rules 1 and 8 — alias direction, including both fields of composed colors
const allowed = { ref: [], sys: ['ref'], comp: ['sys'] };
for (const v of vars) {
  const from = layerOf(v.name);
  if (!allowed[from]) continue;
  for (const val of Object.values(v.valuesByMode)) for (const ref of aliasRefs(val)) {
    const target = await lookup(ref.id);
    const to = target ? layerOf(target.name) : 'missing';
    if (from === 'comp' && to === 'ref') add(1, 'error', v.name, `${ref.path} aliases ${target.name}`, 'Alias the Sys token that aliases this Ref (create it if missing)');
    else if (!allowed[from].includes(to)) add(8, 'error', v.name, `${from} → ${to} through ${ref.path} (${target?.name ?? ref.id})`, from === 'ref' ? 'Store a raw value' : `Alias a ${allowed[from][0]} token`);
  }
}
// Rule 2 — scopes
const TYPE_SCOPES = {
  COLOR: ['ALL_FILLS', 'FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL', 'STROKE_COLOR', 'EFFECT_COLOR'],
  STRING: ['TEXT_CONTENT', 'FONT_FAMILY', 'FONT_STYLE'],
  FLOAT: ['TEXT_CONTENT', 'CORNER_RADIUS', 'WIDTH_HEIGHT', 'GAP', 'STROKE_FLOAT', 'EFFECT_FLOAT', 'OPACITY', 'COLOR_OPACITY', 'FONT_WEIGHT', 'FONT_SIZE', 'LINE_HEIGHT', 'LETTER_SPACING', 'PARAGRAPH_SPACING', 'PARAGRAPH_INDENT'],
};
for (const v of vars) {
  const s = v.scopes, valid = TYPE_SCOPES[v.resolvedType], layer = layerOf(v.name), problems = [];
  if (!valid) continue; // BOOLEAN, TIMING, EASING have no scopes
  if (s.includes('ALL_SCOPES')) problems.push('ALL_SCOPES');
  if (layer === 'ref' && s.length) problems.push('Ref variables must have an empty scope');
  if (layer !== 'ref' && !s.length) problems.push('empty scope on a non-Ref variable');
  if (s.includes('ALL_FILLS') && s.some(x => ['FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL'].includes(x))) problems.push('ALL_FILLS combined with a specific fill scope');
  const wrong = s.filter(x => x !== 'ALL_SCOPES' && !valid.includes(x));
  if (wrong.length) problems.push(`not valid for ${v.resolvedType}: ${wrong.join(', ')}`);
  if (problems.length) add(2, 'error', v.name, problems.join('; '), 'Set scopes from token-spec.md §10');
}
```

```js
// Rule 3 — code syntax
for (const v of vars) {
  const want = webSyntax(v.name);
  if (v.codeSyntax.WEB !== want) add(3, 'warning', v.name, `WEB is ${v.codeSyntax.WEB ?? 'missing'}`, `Set ${want}`);
}
// Rule 4 — prefixes
const prefixes = [...new Set(vars.map(v => v.name.split('/')[0]))];
if (prefixes.length > 1) add(4, 'error', prefixes.join(', '), `${prefixes.length} prefixes (or names without a prefix)`, 'Confirm one prefix, then rename');
// Rule 6 — empty collections
for (const c of cols) if (!c.variableIds.length) add(6, 'info', c.name, 'collection has no variables', 'Ask before deleting');
// Rule 7 — component or region words in Ref and Sys
const COMPONENT_WORDS = /button|text-?field|chip|dialog|card|fab|switch|checkbox|radio|input|top-app-bar|bottom-bar|navigation-bar|app-bar|sheet|snackbar|banner|list-item|tab-bar|menu|tooltip/;
for (const v of vars) {
  const layer = layerOf(v.name);
  if (layer !== 'ref' && layer !== 'sys') continue;
  const hit = v.name.split('/').find(seg => COMPONENT_WORDS.test(seg));
  if (hit) add(7, 'warning', v.name, `"${hit}" names a component or region`, layer === 'ref' ? 'Rename to a value name such as ref/spacing/16' : 'Rename to a shared role; move the component use to Comp');
}
// Rule 9 — missing mode values
for (const c of cols) for (const id of c.variableIds) {
  const v = byId.get(id);
  if (v) for (const mode of c.modes) if (!(mode.modeId in v.valuesByMode)) add(9, 'error', v.name, `no value for mode ${mode.name} in ${c.name}`, 'Set the missing value');
}
```

```js
// Rule 12 — Ref names agree with their values
const NUMERIC = /(?:^|\/)ref\/(spacing|radius|size|stroke-width|opacity|type\/(?:weight|size|line-height|tracking))\/([^/]+)$/;
const TONE = /(?:^|\/)ref\/(color|palette)\/([^/]+)\/(\d+)(?:-a(\d+))?(?:-[b-z])?$/;
const toneScaleMax = {};
for (const v of vars) { const t = v.name.match(TONE); if (t) toneScaleMax[t[2]] = Math.max(toneScaleMax[t[2]] ?? 0, Number(t[3])); }
for (const v of vars) {
  const val = first(v), n = v.name.match(NUMERIC), t = v.name.match(TONE);
  if (n && typeof val === 'number') {
    const want = decodeNum(n[2].replace(/-[b-z]$/, ''));
    if (Number.isFinite(want) && Math.abs(want - val) >= 0.01) add(12, 'error', v.name, `name encodes ${want}, value is ${val}`, 'Rename to match the value, or change the value');
  }
  if (t && isColor(val) && toneScaleMax[t[2]] <= 100) { // families named 50–900 are not L* tones; skip them
    const L = tone(val), alpha = Math.round((val.a ?? 1) * 100);
    if (Math.abs(L - Number(t[3])) > 2) add(12, 'error', v.name, `tone ${t[3]} but L* is ${L}`, `Rename to tone ${L}`);
    if (t[4] && Math.abs(alpha - Number(t[4])) > 1) add(12, 'error', v.name, `alpha suffix ${t[4]} but alpha is ${alpha}`, `Rename to -a${alpha}`);
  }
}
```

```js
// Rule 13 — duplicate and near-duplicate primitives
const refs = vars.filter(v => layerOf(v.name) === 'ref');
const scaleRefs = new Set();
for (const v of vars) if (layerOf(v.name) === 'sys' && /(?:^|\/)sys\/(spacing|shape|size|stroke|state)\//.test(v.name)) for (const r of aliasRefs(first(v))) scaleRefs.add(r.id);
const category = v => (/(?:^|\/)ref\/(color|palette)\//.test(v.name) ? 'color' : v.name.replace(/\/[^/]+$/, ''));
for (let i = 0; i < refs.length; i++) for (let j = i + 1; j < refs.length; j++) {
  const a = refs[i], b = refs[j], va = first(a), vb = first(b);
  if (category(a) !== category(b)) continue;
  let d = null;
  if (isColor(va) && isColor(vb) && Math.abs((va.a ?? 1) - (vb.a ?? 1)) < 0.01 && deltaE(va, vb) <= 3) d = { label: `ΔE ${r2(deltaE(va, vb))}`, same: hex(va) === hex(vb) };
  if (typeof va === 'number' && typeof vb === 'number') {
    const limit = /\/opacity$/.test(category(a)) ? 5 : Math.max(1, 0.05 * Math.max(Math.abs(va), Math.abs(vb)));
    if (Math.abs(va - vb) <= limit) d = { label: `Δ ${r2(Math.abs(va - vb))}`, same: Math.abs(va - vb) < 0.01 };
  }
  if (!d || (!d.same && scaleRefs.has(a.id) && scaleRefs.has(b.id))) continue; // two scale steps are intentional
  add(13, 'warning', `${a.name} · ${b.name}`, d.same ? 'identical values' : `near values (${d.label})`, 'Show both on the review board; merging is Tier 3');
}
```

```js
// Rule 14 — one spacing label, one value
const byLabel = {};
for (const v of vars) {
  const m1 = v.name.match(/(?:^|\/)sys\/spacing\/([^/]+)$/);
  const m2 = m1 && m1[1].match(/^(.*)-(none|\dxs|xs|sm|md|lg|xl|\dxl)(-plus)?$/);
  if (!m2) continue;
  const label = m2[2] + (m2[3] ?? '');
  if (!byLabel[label]) byLabel[label] = [];
  byLabel[label].push({ name: v.name, value: await resolveRaw(v) });
}
for (const [label, list] of Object.entries(byLabel)) {
  if (new Set(list.map(x => r2(x.value))).size > 1) add(14, 'warning', `spacing label ${label}`, list.map(x => `${x.name} = ${x.value}`).join(', '), 'Rename so each label means one value');
}
// Rule 16 — styles backed by variables
for (const s of await figma.getLocalTextStylesAsync()) {
  const b = s.boundVariables ?? {};
  const need = ['fontFamily', b.fontStyle ? 'fontStyle' : 'fontWeight', 'fontSize', 'letterSpacing'].concat(s.lineHeight.unit === 'AUTO' ? [] : ['lineHeight']);
  const missing = need.filter(f => !b[f]);
  if (missing.length) add(16, 'warning', `Text Style ${s.name}`, `unbound: ${missing.join(', ')}`, 'Bind the fields to Sys typescale tokens');
}
for (const s of await figma.getLocalEffectStylesAsync()) s.effects.forEach((e, i) => {
  if (e.type !== 'DROP_SHADOW' && e.type !== 'INNER_SHADOW') return;
  const missing = ['color', 'offsetX', 'offsetY', 'radius', 'spread'].filter(f => !e.boundVariables?.[f]);
  if (missing.length) add(16, 'warning', `Effect Style ${s.name}, shadow ${i + 1}`, `unbound: ${missing.join(', ')}`, 'Bind the fields to Sys elevation tokens');
});
```

```js
// Rule 17 — legacy state order (state after the property)
const STATES = ['hovered', 'focused', 'pressed', 'dragged', 'disabled', 'hover', 'focus', 'selected', 'unselected', 'error', 'success'];
for (const v of vars) {
  const s = v.name.split('/'), ci = s.indexOf('comp');
  if (ci < 0 || s.length - ci < 5 || !STATES.includes(s[s.length - 1])) continue;
  const state = s[s.length - 1], rest = s.slice(ci + 2, -1);
  const proposal = [...s.slice(0, ci + 2), ...rest.slice(0, -2), state, ...rest.slice(-2)].join('/');
  const taken = vars.some(x => x.name === proposal);
  add(17, 'warning', v.name, `state "${state}" comes after the property`, taken ? `${proposal} already exists; merge manually` : `Rename in place to ${proposal}`);
}
// Rule 18 — name format
const fixName = name => name.split('/').map(seg => seg.toLowerCase().replace(/\s+/g, '-').replace(/\./g, '_').replace(/[^a-z0-9_-]/g, '')).join('/');
for (const v of vars) {
  const bad = v.name.split('/').filter(seg => !/^[a-z0-9_-]+$/.test(seg));
  if (bad.length) add(18, 'warning', v.name, `segments: ${bad.join(', ')}`, `Rename to ${fixName(v.name)}`);
}
return { checked: [1, 2, 3, 4, 6, 7, 8, 9, 12, 13, 14, 16, 17, 18], findings: F };
```

The script is split into blocks for reading; run them as one script, in order.

---

## 4. Node rules script

Checks rules 5, 10, 11, and 15 on one page (or on the given scope roots of that page). Read-only.

```js
const PAGE_ID = '0:1', SCOPE_IDS = []; // empty SCOPE_IDS → the whole page
const page = await figma.getNodeByIdAsync(PAGE_ID);
await figma.setCurrentPageAsync(page);
const roots = SCOPE_IDS.length ? await Promise.all(SCOPE_IDS.map(id => figma.getNodeByIdAsync(id))) : [page];
const F = [];
const add = (rule, severity, subject, message, fix) => F.push({ rule, severity, subject, message, fix });
const cache = new Map();
const getVar = async id => { if (!cache.has(id)) cache.set(id, await figma.variables.getVariableByIdAsync(id)); return cache.get(id); };
const has = x => (Array.isArray(x) ? x.length > 0 : !!x);
const TYPES = { fills: 'COLOR', strokes: 'COLOR', characters: 'STRING', fontFamily: 'STRING', fontStyle: 'STRING', visible: 'BOOLEAN' };
const FLOAT_FIELDS = ['width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight', 'itemSpacing', 'counterAxisSpacing', 'gridRowGap', 'gridColumnGap',
  'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'cornerRadius', 'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius',
  'strokeWeight', 'strokeTopWeight', 'strokeRightWeight', 'strokeBottomWeight', 'strokeLeftWeight', 'opacity',
  'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'paragraphSpacing', 'paragraphIndent'];
for (const f of FLOAT_FIELDS) TYPES[f] = 'FLOAT';
const kebab = s => s.split('/').pop().trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function componentName(n) {
  for (let p = n; p && p.type !== 'PAGE'; p = p.parent) if (p.type === 'COMPONENT') return kebab(p.parent?.type === 'COMPONENT_SET' ? p.parent.name : p.name);
  return null;
}
const compAliasOf = new Map(); // Sys variable ID → Comp names aliasing it
for (const v of await figma.variables.getLocalVariablesAsync()) {
  if (layerOf(v.name) !== 'comp') continue;
  for (const r of aliasRefs(v.valuesByMode[Object.keys(v.valuesByMode)[0]])) {
    if (!compAliasOf.has(r.id)) compAliasOf.set(r.id, []);
    compAliasOf.get(r.id).push(v.name);
  }
}
```

```js
// Rules 5, 10, 11 — every bound node, including the scope roots themselves
const boundNodes = roots.flatMap(r => [r, ...('findAll' in r ? r.findAll(n => !!n.boundVariables && Object.keys(n.boundVariables).length > 0) : [])])
  .filter(n => n.type !== 'PAGE' && n.boundVariables && Object.keys(n.boundVariables).length);
for (const n of boundNodes) for (const [prop, binding] of Object.entries(n.boundVariables)) {
  if (!TYPES[prop]) continue; // effects, grids, and component properties are not part of these rules
  for (const b of Array.isArray(binding) ? binding : [binding]) {
    const v = b?.id ? await getVar(b.id) : null;
    if (!v) continue;
    const subject = `${n.name} (${n.id}) ${prop}`;
    if (layerOf(v.name) === 'ref') add(5, 'error', subject, `bound to ${v.name}`, 'Rebind to the Sys or Comp token that aliases it');
    if (v.resolvedType !== TYPES[prop]) add(10, 'error', subject, `${v.name} is ${v.resolvedType}; ${prop} needs ${TYPES[prop]}`, 'Rebind to a variable of the right type');
    if (layerOf(v.name) === 'sys') {
      const cname = componentName(n);
      const match = cname && (compAliasOf.get(v.id) ?? []).find(x => x.split('/').includes(cname));
      if (match) add(11, 'warning', subject, `bound to ${v.name} while ${match} exists`, `Rebind to ${match} (same value)`);
    }
  }
}
```

```js
// Rule 15 — token coverage per component set or standalone component
function tally(root) {
  let total = 0, bound = 0;
  const raw = [];
  const count = (n, prop, isBound) => { total++; if (isBound) bound++; else if (raw.length < 20) raw.push(`${n.id} ${prop}`); };
  const solid = list => (Array.isArray(list) ? list.filter(p => p.visible !== false && p.type === 'SOLID') : []);
  const visit = n => {
    if (n.visible === false) return;
    if (n.type === 'COMPONENT_SET') { n.children.forEach(visit); return; }
    if ('fills' in n) solid(n.fills).forEach((p, i) => count(n, `fills[${i}]`, !!p.boundVariables?.color));
    if ('strokes' in n) {
      const s = solid(n.strokes);
      s.forEach((p, i) => count(n, `strokes[${i}]`, !!p.boundVariables?.color));
      if (s.length && n.strokeWeight !== figma.mixed && n.strokeWeight > 0) count(n, 'strokeWeight', has(n.boundVariables?.strokeWeight));
    }
    if ('topLeftRadius' in n) for (const c of ['topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius']) if (n[c] > 0) count(n, c, has(n.boundVariables?.[c]));
    if ('layoutMode' in n && n.layoutMode !== 'NONE') {
      for (const p of ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom']) if (n[p] > 0) count(n, p, has(n.boundVariables?.[p]));
      if (n.itemSpacing > 0 && n.primaryAxisAlignItems !== 'SPACE_BETWEEN') count(n, 'itemSpacing', has(n.boundVariables?.itemSpacing));
    }
    if (n.type === 'TEXT') count(n, 'typography', (n.textStyleId !== '' && n.textStyleId !== figma.mixed) || has(n.boundVariables?.fontSize));
    if ('effects' in n) {
      const sh = n.effects.filter(e => e.visible !== false && (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW'));
      if (sh.length) count(n, 'effects', !!n.effectStyleId || sh.some(e => Object.keys(e.boundVariables ?? {}).length > 0));
    }
    if (n.type !== 'INSTANCE' && 'children' in n) n.children.forEach(visit);
  };
  visit(root);
  return { total, bound, raw };
}
const comps = roots.flatMap(r => (['COMPONENT', 'COMPONENT_SET'].includes(r.type) ? [r] : []).concat('findAllWithCriteria' in r ? r.findAllWithCriteria({ types: ['COMPONENT_SET', 'COMPONENT'] }) : []));
for (const c of comps.filter(c => c.type === 'COMPONENT_SET' || c.parent?.type !== 'COMPONENT_SET')) {
  const t = tally(c);
  if (!t.total || t.bound === t.total) continue;
  add(15, 'warning', `${c.name} (${c.id})`, `coverage ${Math.round((t.bound / t.total) * 100)}% (${t.bound}/${t.total}); hardcoded: ${t.raw.join('; ')}`, 'Run Workflow F on this component');
}
return { page: page.name, checked: [5, 10, 11, 15], findings: F };
```

---

## 5. Rules 1–18

### Rule 1 — Comp aliases Ref directly · error

- **Definition**: a Comp variable's value — or either field of its composed color — aliases a Ref variable, skipping Sys.
- **Detection**: §3, alias direction block.
- **Fix**: create or reuse the Sys token that aliases that Ref value and point the Comp variable (or the composed field) to it. Tier 2; Tier 3 when the Comp variable is bound and the resolved value would change.
- **Example**: `md/comp/filled-button/disabled/container/background-color` composes `md/sys/color/on-surface` with `md/ref/opacity/12` → rule 1 on the `opacity` field; alias `md/sys/state/disabled/container-opacity` instead.

### Rule 2 — Scope errors · error

- **Definition**: `ALL_SCOPES`; an empty scope on a non-Ref variable; a Ref variable with scopes; `ALL_FILLS` combined with `FRAME_FILL`, `SHAPE_FILL`, or `TEXT_FILL`; a scope that does not fit the variable type.
- **Fix**: set scopes from token-spec.md §10. Tier 2.

### Rule 3 — Missing or non-canonical WEB code syntax · warning

- **Definition**: `codeSyntax.WEB` differs from `var(--{name with "/" and spaces as "-", lowercase})`.
- **Fix**: `v.setVariableCodeSyntax('WEB', webSyntax(v.name))`. Tier 2.

### Rule 4 — More than one prefix · error

- **Definition**: variable names start with two or more different first segments (for example `md/…` and `bd/…`, or names without a prefix).
- **Fix**: confirm the prefix with the user, then rename every variable and its code syntax. Tier 3.

### Rule 5 — Ref bound directly to a node · error

- **Definition**: a node property is bound to a Ref variable.
- **Detection**: §4, bound nodes block.
- **Fix**: rebind to the Comp token (or Sys for page-level use) that aliases the same Ref; create it when missing. Tier 2 when the value stays the same; Tier 3 otherwise.

### Rule 6 — Collection without variables · info

- **Definition**: a collection with an empty `variableIds`.
- **Fix**: ask, then `collection.remove()`. Tier 3.

### Rule 7 — Component or region vocabulary in Ref or Sys · warning

- **Definition**: a Ref or Sys name segment contains component or region words (`button`, `text-field`, `chip`, `dialog`, `card`, `fab`, `switch`, `checkbox`, `radio`, `input`, `top-app-bar`, `bottom-bar`, `navigation-bar`, `app-bar`, `sheet`, `snackbar`, `banner`, `list-item`, `tab-bar`, `menu`, `tooltip`). Adjust the list to the project; false positives are possible.
- **Fix**: Ref → rename to a value name (`ref/spacing/16`); Sys → rename to a shared role (`inset-horizontal-md`) and add Comp tokens for the component use. Tier 2.

### Rule 8 — Invalid alias direction · error

- **Definition**: any alias other than Sys → Ref and Comp → Sys (Ref aliasing anything, Sys → Sys or Comp, Comp → Comp), including the fields of composed colors. Rule 1 reports Comp → Ref separately.
- **Fix**: Ref → store a raw value; Sys → alias the right Ref; Comp → alias the right Sys. Tier 2; Tier 3 when the variable is bound and the resolved value changes.

### Rule 9 — Missing mode values · error

- **Definition**: a variable has no value for one of its collection's modes.
- **Fix**: set the missing value; for Sys colors with `Light` and `Dark`, alias the correct Ref tone for that theme. Tier 2.

### Rule 10 — Bound type incompatible with the property · error

- **Definition**: for example a FLOAT bound to a fill color, a COLOR bound to a radius, or a FLOAT bound to `fontFamily`. The type table covers every node and text field the skill binds (§4 `TYPES`).
- **Fix**: rebind to a variable of the right type. Tier 3.

### Rule 11 — Component node bypasses an existing Comp token · warning

- **Definition**: a node inside a component is bound to a Sys token while a Comp token of that component aliases the same Sys token.
- **Fix**: rebind to the Comp token (same value). Tier 2.

### Rule 12 — Ref name does not match its value · error

- **Definition**: for numeric Ref categories (`spacing`, `radius`, `size`, `stroke-width`, `opacity`, `type/weight`, `type/size`, `type/line-height`, `type/tracking`), the decoded last segment (`_` = decimal point, `neg-` = minus, collision suffixes ignored) differs from the value. For color Ref named by tone, the rounded CIE L* differs from the tone by more than 2, or the `-a{pct}` suffix differs from the alpha. Families named on a 50–900 scale are not L* tones and are skipped.
- **Fix**: rename to match the value (Tier 2), or change the value (Tier 3).

| Variable | Stored value | Result |
|----------|--------------|--------|
| `md/ref/spacing/16` | 12 | error: name encodes 16 |
| `md/ref/type/tracking/neg-0_25` | −0.25 | pass |
| `md/ref/color/blue/50` | #1A73E8 (L* 49.9) | pass |
| `md/ref/color/blue/50` | #0B3D91 (L* 28.0) | error: tone 50 vs L* 28 |

### Rule 13 — Duplicate or near-duplicate Ref values · warning

- **Definition**: two Ref variables of the same category store identical values, or values within the near-value thresholds of value-harvest.md §6 (color ΔE ≤ 3 with equal alpha; numbers within 1 px or 5%, whichever is greater; opacity within 5 points). Two values that are both steps of Sys scales are intentional and are not reported unless they are identical.
- **Fix**: build the review board (value-harvest.md §7) and ask per pair: merge (repoint the aliases of one Ref to the other, then delete it — Tier 3) or keep both.

### Rule 14 — Same spacing label, different values · warning

- **Definition**: Sys spacing variables share one ladder, so a label (`sm`, `md`, …) must resolve to the same value under every spacing role. Example: `inset-vertical-sm` = 12 and `gap-inline-sm` = 8. Size roles (`icon-*`, `control-height-*`) keep separate ladders and are not compared.
- **Fix**: rename the tokens so each label means one value (for example `gap-inline-sm` → `gap-inline-xs`), and update code syntax. Tier 2.

### Rule 15 — Token coverage · warning

- **Definition**: inside components, tokenizable properties that hold hardcoded values: unbound solid fills and strokes, corner radii, padding, gaps, stroke weights, text without a Text Style or typography variables, and shadows without an Effect Style or effect variables. Coverage = bound tokenizable properties ÷ all tokenizable properties, reported per component set or standalone component.
- **Example**: a Card with 14 tokenizable properties, 10 bound → coverage 71%, with the 4 hardcoded properties listed by node ID.
- **Fix**: run Workflow F on the component.

### Rule 16 — Styles not backed by variables · warning

- **Definition**: a local Text Style whose font family, weight or style, size, line height (unless `AUTO`), or letter spacing is not bound; a local Effect Style whose shadow color, offsets, blur, or spread is not bound.
- **Fix**: bind the fields to Sys typescale or elevation tokens with the same values (create them with Workflow F when missing). Tier 2.

### Rule 17 — Legacy state token order · warning

- **Definition**: a Comp variable whose last segment is a state word placed after the property (`…/container/background-color/disabled`).
- **Fix**: rename the same variable in place to the M3 order (token-spec.md §5) and update its code syntax; bindings and aliases follow the variable ID, so nothing else changes. Keep the file's state words (`hover` stays `hover`). Tier 2. Until the file is migrated, new state tokens follow the legacy order.
- **Example**: `md/comp/filled-button/container/background-color/disabled` → `md/comp/filled-button/disabled/container/background-color`, code syntax `var(--md-comp-filled-button-disabled-container-background-color)`.

### Rule 18 — Name format · warning

- **Definition**: a name segment with uppercase letters, spaces, or characters other than `a–z`, `0–9`, `-`, `_`.
- **Example**: `md/sys/color/Primary` → `md/sys/color/primary`.
- **Fix**: rename and update code syntax. Tier 2.

---

## 6. Fix snippets

Run fixes only after the user approved them, in chunks, re-fetching every variable by ID.

```js
const v = await figma.variables.getVariableByIdAsync(VARIABLE_ID);
// Rules 7, 12, 14, 17, 18 — rename in place (bindings and aliases follow the ID)
v.name = NEW_NAME;
v.setVariableCodeSyntax('WEB', webSyntax(NEW_NAME));
// Rule 2 — scopes
v.scopes = NEW_SCOPES;
// Rules 1, 8 — repoint an alias (use the composed shape when the value is composed)
v.setValueForMode(MODE_ID, figma.variables.createVariableAlias(await figma.variables.getVariableByIdAsync(TARGET_ID)));
return { id: v.id, name: v.name, scopes: v.scopes, web: v.codeSyntax.WEB };
```

Before a rename, check that the new name is not taken in the same collection.

---

## 7. Report format

```
## Variables audit — {file or scope}
Checked rules 1–18 · {N} findings (error {e} · warning {w} · info {i})

### Errors
| # | Rule | Variable / style / node | Finding | Suggested fix | Fix tier |

### Warnings
| # | Rule | Variable / style / node | Finding | Suggested fix | Fix tier |

### Info
| # | Rule | Variable / style / node | Finding | Suggested fix | Fix tier |

Which fixes should I apply? Tier 2 fixes run as one batch after you confirm;
Tier 3 fixes are confirmed group by group with before/after evidence.
```

When nothing is found:

```
✓ All Variables and Styles comply — checked rules 1–18.
```
