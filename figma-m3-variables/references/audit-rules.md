# Audit Rules — Variable Audit Guidelines

> This document is used by Workflow C in the `figma-m3-variables` skill. It defines violation types and the corresponding fix script templates.

---

## Audit Process

1. Run the inspect script to retrieve complete variable data (name, resolvedType, scopes, codeSyntax, valuesByMode)
2. Apply each of the rules below (including alias direction, binding compatibility, and layer naming heuristics), recording all matching variables
3. Compile all issues into a table and report to the user
4. Ask the user whether to auto-fix (each violation type can be selected individually)
5. Run fix scripts and inspect again to confirm zero violations remain

---

## Violation Type 1: Cross-Layer Direct Alias (Comp → Ref, skipping Sys)

**Definition**: A Comp layer variable's value aliases directly to a Ref layer variable, bypassing the Sys layer.

**Detection**:
```js
// Get all Comp layer variables (name contains "/comp/")
// Check if their valuesByMode[modeId].id points to a variable whose name contains "/ref/"
const allVars = await figma.variables.getLocalVariablesAsync();
const varById = Object.fromEntries(allVars.map(v => [v.id, v]));
const violations = [];
for (const v of allVars) {
  if (!v.name.includes('/comp/')) continue;
  for (const [modeId, val] of Object.entries(v.valuesByMode)) {
    if (val?.type === 'VARIABLE_ALIAS') {
      const target = varById[val.id];
      if (target && target.name.includes('/ref/')) {
        violations.push({ variable: v.name, aliasTarget: target.name });
      }
    }
  }
}
return violations;
```

**Fix**:
- Create the missing Sys layer token so the chain becomes Comp → Sys → Ref
- If the Sys token already exists but Comp points to the wrong target, update Comp's `setValueForMode` to point to the correct Sys token

---

## Violation Type 2: Scope Uses ALL_SCOPES or Non-Ref Empty Scope

**Definition**: Any variable's `scopes` array contains `"ALL_SCOPES"` or a non-Ref variable has an empty scope. Scopes control picker visibility, not Plugin API binding permission, but explicit scopes are required so designers see the right tokens in the right pickers.

**Detection**:
```js
const allVars = await figma.variables.getLocalVariablesAsync();
const violations = allVars.filter(v =>
  v.scopes.includes('ALL_SCOPES') ||
  (v.scopes.length === 0 && !v.name.includes('/ref/'))
  // Ref layer is allowed to have empty scope (hidden); non-Ref empty scope is a violation
);
return violations.map(v => ({ name: v.name, scopes: v.scopes }));
```

**Fix**: Set the correct explicit scope for each variable according to the [token-spec.md scope table](token-spec.md):
```js
const variable = await figma.variables.getVariableByIdAsync(variableId);
variable.scopes = ["FRAME_FILL", "SHAPE_FILL"]; // Replace with the appropriate scope
```

---

## Violation Type 3: Missing or Incorrect WEB Code Syntax

**Definition**: A variable's `codeSyntax.WEB` is empty, missing, or does not match the canonical format derived from its name: `var(--{prefix}-{layer}-{name})`.

**Detection**:
```js
const allVars = await figma.variables.getLocalVariablesAsync();
const violations = allVars.filter(v => {
  const expected = `var(--${v.name.replace(/[\s\/]+/g, '-').toLowerCase()})`;
  return v.codeSyntax?.WEB !== expected;
});
return violations.map(v => ({
  name: v.name,
  codeSyntax: v.codeSyntax,
  expected: `var(--${v.name.replace(/[\s\/]+/g, '-').toLowerCase()})`
}));
```

**Fix**: Auto-derive the WEB syntax from the variable name and overwrite mismatches:
```js
// Convert "/" and spaces to "-", wrap in var()
const cssName = v.name.replace(/[\s\/]+/g, '-').toLowerCase();
v.setVariableCodeSyntax('WEB', `var(--${cssName})`);
```

> If the name contains multiple `/` (e.g. `md/sys/color/primary`), the output is `var(--md-sys-color-primary)`, which follows M3 conventions.

---

## Violation Type 4: Inconsistent Prefix

**Definition**: Variables in the same Figma file use two or more different prefixes (e.g. `md/...` mixed with `bd/...`), violating the rule of using a single prefix throughout the session.

**Detection**:
```js
const allVars = await figma.variables.getLocalVariablesAsync();
const prefixes = new Set(allVars.map(v => v.name.split('/')[0]));
return {
  prefixCount: prefixes.size,
  prefixes: [...prefixes],
  violation: prefixes.size > 1
};
```

**Fix**:
- Confirm the correct prefix (ask the user)
- Batch-rename violating variables: `variable.name = variable.name.replace(/^old-prefix\//, 'new-prefix/')`
- Sync-update the prefix in `codeSyntax.WEB` as well

---

## Violation Type 5: Ref Layer Variable Bound Directly to a Node

**Definition**: A node's visual properties (fills, strokes, radius, etc.) are directly bound to a Ref layer variable rather than a Sys or Comp layer variable. The Ref layer is for storing raw values only and should never appear directly on design components.

**Detection**:
Traverse the design nodes, check `boundVariables`, and compare the target variable name for `/ref/`:
```js
// Scan all nodes on the current page for boundVariables
await figma.setCurrentPageAsync(figma.currentPage);
const violations = [];
figma.currentPage.findAll(node => {
  const bv = node.boundVariables;
  if (!bv) return false;
  for (const [prop, binding] of Object.entries(bv)) {
    const refs = Array.isArray(binding) ? binding : [binding];
    for (const b of refs) {
      if (b?.id) {
        violations.push({ nodeId: node.id, nodeName: node.name, prop, variableId: b.id });
      }
    }
  }
  return false;
});
// Look up variable names
const result = [];
for (const item of violations) {
  const v = await figma.variables.getVariableByIdAsync(item.variableId);
  if (v && v.name.includes('/ref/')) {
    result.push({ ...item, variableName: v.name });
  }
}
return result;
```

**Fix**:
- Check whether the corresponding Sys or Comp token exists
- If it exists: rebind the node to the correct layer's token
- If it does not exist: create the Sys / Comp token first, then bind

---

## Violation Type 6: Empty Collection (collection exists but has no variables)

**Definition**: The file contains a variable collection whose `variableIds` array is empty — an abandoned or accidentally created collection.

**Detection**:
```js
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const empty = cols.filter(c => c.variableIds.length === 0);
return empty.map(c => ({ name: c.name, id: c.id }));
```

**Fix**: Ask the user whether to delete the empty collection:
```js
// Ask the user to confirm the collection name before deleting
const col = await figma.variables.getVariableCollectionByIdAsync(collectionId);
col.remove();
```

---

## Violation Type 7: Ref or Sys uses component- or region-specific naming

**Definition**: A **Ref** or **Sys** variable name includes vocabulary that belongs only in **Comp** — component types, screen regions, or single-component anatomy (see [token-spec.md §1](token-spec.md) “Responsibility by layer”).

**Detection (heuristic)** — flag `v.name` when:

- The path includes `/ref/` or `/sys/`, **and**
- Any segment (split on `/`) matches case-insensitive substrings such as:
  - **Components / patterns**: `button`, `text-field`, `textfield`, `filled-button`, `outlined-button`, `chip`, `dialog`, `card`, `fab`, `switch`, `checkbox`, `radio`, `input`, `top-app-bar`, `bottom-bar`, `navigation-bar`, `app-bar`, `sheet`, `snackbar`, `banner`, `list-item`, `tab-bar`
  - **Component-specific spacing roles** (in Sys only): `button-padding`, `button-icon`, `bar-padding`, `field-padding` (Ref should use numeric spacing; Sys should use generic `inset-*`, `gap-*`)

Adjust the list per project vocabulary; false positives are possible — use human judgment.

**Examples of violations**:

| Name | Issue |
|------|--------|
| `md/ref/spacing/button/padding-h` | Ref must not name `button` |
| `md/sys/spacing/button-padding-h` | Sys must use generic semantics; Comp maps “button horizontal padding” to Sys |
| `md/sys/color/top-app-bar-surface` | Region-specific; prefer `sys/color/surface-container` + Comp for top app bar |

**Fix**:

- **Ref**: Rename to a primitive path (e.g. `ref/spacing/16`) and keep the numeric value.
- **Sys**: Rename to a shared semantic (e.g. `sys/spacing/inset-horizontal-md`) and point to the Ref above.
- **Comp**: Add or reuse `comp/{component}/...` tokens that alias the corrected Sys tokens; update bindings.

---

## Violation Type 8: Invalid Layer Alias Direction

**Definition**: A variable's alias target violates the allowed chain:

- Ref must store raw values and must not alias another variable
- Sys may alias Ref only
- Comp may alias Sys only

Type 1 is the most common special case (Comp → Ref). This rule catches the remaining invalid directions, such as Ref → Sys, Sys → Comp, Sys → Sys when the project requires Sys to terminate at Ref, or Comp → Comp when it hides the actual semantic target.

**Detection**:
```js
const allVars = await figma.variables.getLocalVariablesAsync();
const varById = Object.fromEntries(allVars.map(v => [v.id, v]));
function layer(name) {
  if (name.includes('/ref/')) return 'ref';
  if (name.includes('/sys/')) return 'sys';
  if (name.includes('/comp/')) return 'comp';
  return 'unknown';
}
const allowed = { ref: [], sys: ['ref'], comp: ['sys'] };
const violations = [];
for (const v of allVars) {
  const from = layer(v.name);
  for (const [modeId, val] of Object.entries(v.valuesByMode)) {
    if (val?.type !== 'VARIABLE_ALIAS') continue;
    const target = varById[val.id];
    const to = target ? layer(target.name) : 'missing';
    if (!allowed[from]?.includes(to)) {
      violations.push({ variable: v.name, modeId, aliasTarget: target?.name || val.id, from, to });
    }
  }
}
return violations;
```

**Fix**:
- Ref: replace the alias with a raw value.
- Sys: point to the correct Ref token.
- Comp: point to the correct Sys token.

---

## Violation Type 9: Missing Mode Values

**Definition**: A variable is missing a value for one or more modes in its collection. This is especially dangerous in Sys color collections with Light/Dark modes because Comp bindings stay stable while resolved values switch by mode.

**Detection**:
```js
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const violations = [];
for (const c of cols) {
  for (const id of c.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(id);
    if (!v) continue;
    for (const mode of c.modes) {
      if (!(mode.modeId in v.valuesByMode)) {
        violations.push({ collection: c.name, variable: v.name, missingMode: mode.name });
      }
    }
  }
}
return violations;
```

**Fix**: Set the missing mode value. For Sys dual-mode color tokens, alias the missing mode to the correct Ref palette value for that theme.

---

## Violation Type 10: Bound Variable Type Does Not Match Node Property

**Definition**: A node property is bound to a variable whose `resolvedType` cannot drive that property, for example binding a FLOAT token to a fill color or a COLOR token to corner radius.

**Detection**:
```js
const expectedTypeByProp = {
  fills: 'COLOR',
  strokes: 'COLOR',
  topLeftRadius: 'FLOAT',
  topRightRadius: 'FLOAT',
  bottomRightRadius: 'FLOAT',
  bottomLeftRadius: 'FLOAT',
  paddingLeft: 'FLOAT',
  paddingRight: 'FLOAT',
  paddingTop: 'FLOAT',
  paddingBottom: 'FLOAT',
  itemSpacing: 'FLOAT',
  width: 'FLOAT',
  height: 'FLOAT',
  opacity: 'FLOAT',
  fontSize: 'FLOAT',
  fontWeight: 'FLOAT',
  lineHeight: 'FLOAT',
  letterSpacing: 'FLOAT',
  fontFamily: 'STRING',
};
const violations = [];
figma.currentPage.findAll(node => {
  const bv = node.boundVariables;
  if (!bv) return false;
  for (const [prop, binding] of Object.entries(bv)) {
    const expected = expectedTypeByProp[prop];
    if (!expected) continue;
    const refs = Array.isArray(binding) ? binding : [binding];
    for (const b of refs) violations.push({ nodeId: node.id, nodeName: node.name, prop, variableId: b.id, expected });
  }
  return false;
});
const result = [];
for (const item of violations) {
  const v = await figma.variables.getVariableByIdAsync(item.variableId);
  if (v && v.resolvedType !== item.expected) result.push({ ...item, variableName: v.name, actual: v.resolvedType });
}
return result;
```

**Fix**: Rebind the property to a variable with the correct resolved type. If the intended token has the wrong type, recreate it with the correct type and update aliases/bindings.

---

## Violation Type 11: Component Node Bypasses Existing Comp Token

**Definition**: A component node is bound to a Sys token even though an exact matching Comp token exists. This is less severe than binding Ref directly, but it weakens component-level control and makes batch updates inconsistent.

**Detection (heuristic)**:
- Scan `COMPONENT`, `COMPONENT_SET`, `FRAME`, and named child nodes that belong to known component anatomy.
- For each bound Sys token, derive the expected Comp path using [token-spec.md §5](token-spec.md).
- If a variable with that Comp path exists and aliases the same Sys token, flag the node/property as bypassing Comp.

**Fix**:
- Rebind the node property to the matching Comp token.
- If the Comp token is missing, create it as an alias to the existing Sys token, then rebind.

---

## Audit Report Format

Present findings in this format:

```
## Variables Audit Results

### Found {N} issue(s)

| # | Violation Type | Variable / Node | Description |
|---|---------------|----------------|-------------|
| 1 | Cross-layer direct alias | md/comp/filled-button/label-text/color | Comp aliases Ref directly, skipping Sys |
| 2 | Missing / incorrect WEB syntax | md/sys/color/primary | codeSyntax.WEB is empty or not canonical |
| 3 | ALL_SCOPES | md/comp/filled-button/container/shape | Scope not explicitly set |
| 4 | Invalid alias direction | md/sys/color/primary | Sys aliases Comp; should alias Ref |

Do you want to automatically fix the above issues?
```

If no violations are found, report:

```
✓ All Variables comply with the M3 three-tier inheritance specification. No violations found.
```
