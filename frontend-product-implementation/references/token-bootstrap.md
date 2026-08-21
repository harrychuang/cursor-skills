# Token Bootstrap

Use this reference when `$design-system-governance` Phase 0 discovery finds no design token system in the selected production target root and the user has approved establishing one. Do not use it when the target root already has a token system — the standard governance flow applies unchanged.

This reference covers the token layer only. A missing component library is handled by the existing shared-component approval gate, not by this document.

## Contents

1. Prototype Token Source Discovery Order
2. Minimal Token Subset Derivation
3. Target Styling Technology Adaptation
4. Reverse-Inventory Fallback With Approval
5. Bootstrap Completion Reporting

## Prototype Token Source Discovery Order

Locate the token source of truth on the prototype side. Check in this order and select the highest-priority source that exists:

1. Token files in the prototype Storybook repo produced by `design-system-to-storybook`: generated token source files, theme or `tokens/` directories, and Storybook foundation stories that document them.
2. Token architecture and component token spec documents produced by `design-system-extractor`.
3. Figma Variables exports for the feature's design file.

Rules:

- Record the selected source and its file-level evidence (paths, not just package names) in the implementation notes and in the final response.
- When multiple sources exist, use the highest-priority one as the source of truth; treat lower-priority sources as background only and note any value conflicts.
- Do not invent token values that appear in no discovered source. Every ported value must trace to a file in the selected source.
- If none of the three source types can be located, switch to Reverse-Inventory Fallback With Approval below. Do not fabricate values to avoid the fallback.

## Minimal Token Subset Derivation

Port the smallest token set the in-scope work actually needs, not the full prototype catalog.

1. List the tokens referenced by the in-scope handoff documents (`UI_SPEC.md`, `PRODUCTION_HANDOFF.md`) and by the prototype components being implemented.
2. Preserve the ref → sys → comp layering defined by `$design-system-governance` Token Layer Rules; keep layer prefixes and naming structure intact.
3. Compute the dependency closure: every ported comp or sys token must resolve to a ported ref token.
4. Exclude ref tokens that no token in the subset depends on; record them as deferred rather than porting them.
5. List excluded token groups in the implementation notes so a later feature can extend the subset instead of re-deriving it.

Worked example:

- Prototype tokens: `ref-color-blue-500`, `ref-color-red-500`, `sys-color-primary` → `ref-color-blue-500`, `sys-color-danger` → `ref-color-red-500`.
- Handoff scope uses only `sys-color-primary`.
- Ported subset: `ref-color-blue-500`, `sys-color-primary`.
- Excluded and recorded as deferred: `ref-color-red-500`, `sys-color-danger`.

## Target Styling Technology Adaptation

Select the token output format from repo evidence of the production styling stack, then keep the layered token names in whatever syntax the format uses:

| Repo evidence | Token output format |
| --- | --- |
| Plain CSS or CSS-in-JS stack | CSS custom properties |
| Tailwind configuration consumed by the build | Tailwind theme extension |
| SCSS pipeline | SCSS variables or maps |
| React Native or another non-CSS runtime | Typed theme object |

Rules:

- Place token files following the target framework's native conventions (for example a theme module where the framework expects one, or the repo's existing styles directory), not a location copied from the prototype repo.
- Keep ref → sys → comp names recognizable across formats so governance discovery and later audits can match them.
- When the styling stack is ambiguous or mixed — for example both SCSS variables and CSS custom properties with no dominant convention — stop and ask the user which format to use before writing any token file.

## Reverse-Inventory Fallback With Approval

Use this procedure only when no prototype token source exists.

1. Inventory visual values (color, spacing, radius, typography, motion) from the handoff `UI_SPEC.md` and from the prototype's style files.
2. Normalize the inventoried values into ref → sys layers with names that follow `$design-system-governance` Token Layer Rules.
3. Present the proposed candidate token set to the user, grouped by layer, with the evidence each value came from.
4. Stop and wait for user approval before creating any token file or component code.
5. Do not bypass the stop by hardcoding visual values into product components; the fallback exists to create tokens, not to excuse their absence.

## Bootstrap Completion Reporting

The final response for any implementation that ran this procedure must report:

- The selected token source and its file-level evidence, or the fact that the reverse-inventory fallback was used and approved.
- The ported token list grouped by layer (ref / sys / comp).
- The chosen output format and the token file locations created.
- Tokens deferred or excluded from the subset.
- Any naming translations between prototype and production token names.

When production token names intentionally diverge from prototype names, update the implementation notes with the mapping so later features and audits can trace tokens across repos.
