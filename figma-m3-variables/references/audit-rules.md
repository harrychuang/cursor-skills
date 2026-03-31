# Audit Rules — Variable Audit Guidelines

> This document is used by Workflow C in the `figma-m3-variables` skill. It defines violation types and the corresponding fix script templates.

---

## Audit Process

1. Run the inspect script to retrieve complete variable data (name, resolvedType, scopes, codeSyntax, valuesByMode)
2. Apply each of the rules below (including layer naming heuristics), recording all matching variables
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

## Violation Type 2: Scope Uses ALL_SCOPES

**Definition**: Any variable's `scopes` array contains `"ALL_SCOPES"` or is empty (equivalent to ALL_SCOPES), causing the variable to appear in all pickers and creating noise.

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

## Violation Type 3: Missing WEB Code Syntax

**Definition**: A variable's `codeSyntax.WEB` is an empty string or does not exist.

**Detection**:
```js
const allVars = await figma.variables.getLocalVariablesAsync();
const violations = allVars.filter(v => !v.codeSyntax?.WEB);
return violations.map(v => ({ name: v.name, codeSyntax: v.codeSyntax }));
```

**Fix**: Auto-derive the WEB syntax from the variable name:
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

## Audit Report Format

Present findings in this format:

```
## Variables Audit Results

### Found {N} issue(s)

| # | Violation Type | Variable / Node | Description |
|---|---------------|----------------|-------------|
| 1 | Cross-layer direct alias | md/comp/filled-button/label-text/color | Comp aliases Ref directly, skipping Sys |
| 2 | Missing WEB syntax | md/sys/color/primary | codeSyntax.WEB is empty |
| 3 | ALL_SCOPES | md/comp/filled-button/container/shape | Scope not explicitly set |

Do you want to automatically fix the above 3 issues?
```

If no violations are found, report:

```
✓ All Variables comply with the M3 three-tier inheritance specification. No violations found.
```
