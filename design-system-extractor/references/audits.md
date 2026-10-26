# Audits And Regression Tests

`node <skill-root>/scripts/extract_check.mjs <target-root> --locale <ui-locale>` runs the three audits in strict mode and both HTML generators (all of them, even when one fails) and prints a `STEP | RESULT` table. Each audit is also callable on its own; pass `--strict` after real extraction work (without it, most findings are warnings and the exit code stays `0`). Row-level messages carry a `<file>:<line>` prefix.

## audit_sources.mjs (`DESIGN_EVIDENCE_MAP.md`)

- a `## Source Inventory` table with the eight columns; every row has Source ID, Type, Path / URL / Node, and a source fingerprint
- strict: at least one Source Inventory row
- a repeated source fingerprint, or a repeated path/state key, needs a `## Source Duplicate Review` row
- Source Duplicate Review rows name both sources, record a match type or key, and carry an accepted decision: `reuse existing source` | `ignore duplicate` | `keep distinct` | `merge` | `blocked` | `out-of-scope`

## audit_tokens.mjs (`tokens/*.css`, `TOKEN_ARCHITECTURE.md`)

- strict: `tokens-ref.css`, `tokens-sys.css`, `tokens-comp.css`, and `tokens.css` exist, each layer has at least one token, and `tokens.css` imports ref -> sys -> comp
- `ref` names carry no semantic role or component vocabulary; `sys` names carry no component vocabulary
- `sys` tokens reference `ref` only; `comp` tokens reference `sys` only; no raw values in `sys` or `comp`
- `ref` color tokens use a parseable raw color, a palette family plus a numeric step, the scale `100` lightest to `0` darkest, and no duplicate steps in a family
- every background-like `sys` color has an `on-*` foreground pair
- near reference colors (deltaE2000 `<= 3`, alpha difference `<= 0.03`) and near numbers in one family and unit group are grouped into clusters, each with one canonical token (`scripts/lib/token_review.mjs`; rules in `references/token-architecture.md`); every other member needs a documented decision naming it together with the canonical: a `token-review:` CSS comment, a `TOKEN_ARCHITECTURE.md` line naming both tokens, an `a11y-remap` comment, or an Accessibility Remap Decisions row
- stdout prints `Near token clusters: <n> (auto <a>, proposal <p>, must-ask <m>)` followed by one line per cluster (id, tier, canonical with provenance and usage, members with distance, tier, proposed decision, documented flag); `Token review candidates` and `Documented review decisions` count member-to-canonical relations
- each undocumented member produces one message starting with `Near reference colors need review:` or `Near reference numbers need review:`, naming the canonical first and the member second, with the deltaE2000 distance or numeric difference, the cluster id, the tier and the proposed decision. Without `--strict` these are warnings, which is how Workflow step 4 enumerates clusters before applying the `auto` tier and asking once for the `proposal` tier; with `--strict` they are issues
- provenance comes from the `provenance: authored | measured` marker in the token's comment (`usage:` and `sources:` are optional); unmarked tokens are `unknown` and never reach the `auto` tier
- scale fit: when the `ref` layer has length values, stdout prints `Scale fit (length): base <N>px, on-grid <a>/<b>, outliers <n>` and, when outliers exist, one warning listing each outlier with its value and nearest step; never an issue in any mode
- `--json`: prints one JSON object with the keys `clusters`, `scaleFit`, `counts`, `issues`, `warnings` and nothing else; the exit code follows the chosen mode

## apply_token_decisions.mjs (`TOKEN_ARCHITECTURE.md`)

`node <skill-root>/scripts/apply_token_decisions.mjs <target-root> --tier <auto|proposal|must-ask> [options]` recomputes the clusters, selects the undocumented members of one tier, and appends one Near Token Decisions row per member (member, provenance, canonical, provenance, distance with tier, decision, rule with cluster id, confirmed by).

- `--tier auto|proposal|must-ask` (required); `--only <canonicals>` limits to the clusters whose canonical is listed; `--keep <members>` / `--merge <members>` override the proposed decision of individual members (`proposal` tier); `--decision merge|keep-distinct` (`must-ask` tier); `--confirmed-by <who>`; `--rewrite-css`; `--dry-run`; `--json`; `--help`. List values are comma-separated; token names start with `--` and are accepted as values
- `auto` needs no confirmer and writes `merge` rows confirmed by `auto-tier`; `proposal` and `must-ask` require `--confirmed-by` (exit `2` otherwise); `must-ask` also requires `--only` and `--decision`
- an unknown tier or option, or a missing target root, exits `2`; a missing `design-system/TOKEN_ARCHITECTURE.md` exits `1`
- rows are inserted after the last row of the `## Near Token Decisions` table; the heading and the table header are added when missing. Members that already have a decision are skipped, so re-running the same tier writes nothing (idempotent)
- `--rewrite-css`: for every `merge` row, rewrites `var(<member>` followed by `)` or `,` to `var(<canonical>` in `tokens-ref.css`, `tokens-sys.css` and `tokens-comp.css` and removes the member's declaration line (with its same-line comment) from `tokens-ref.css`; reports the references rewritten, the declarations removed, and any member whose declaration was not found (left unchanged). `keep distinct` rows never touch CSS
- `--dry-run` prints the rows and changes no file; `--json` prints `{tier, written, skipped, rows, rewrite, dryRun}` and nothing else

## generate_review_html.mjs (`review.html`)

- keeps the section ids `source-duplicates`, `color-scale`, `near-colors`, `near-numbers`, `components` and adds `scale-fit`
- `near-colors` and `near-numbers` render one card per cluster (`data-tier` attribute, cluster id, tier badge, canonical with swatch or value, provenance and usage score, one row per member with distance, member tier, proposed decision and documented or needs-review status), using the same cluster module as the audit
- each near token section has one copy button per tier with undocumented members; it places the Near Token Decisions rows for that tier on the clipboard (`navigator.clipboard.writeText`, falling back to revealing and selecting a textarea) and shows the matching `apply_token_decisions.mjs` command as selectable text
- Similar Components are grouped by the components they connect (union-find over candidate and similar names); each group shows every visual reference side by side as a contact sheet above its rows
- `--json`: top-level keys are `counts`, `needsReview`, `clusters` (`clusters` holds `counts`, `colors`, `numbers`, `components`, `scaleFit`); `counts` and `needsReview` keep their previous shape

## audit_components.mjs (`COMPONENT_INVENTORY.md`, `components/*.md`)

- strict: at least one inventory component row
- Status lint (warning only): an empty or unknown Status word, English keyword first
- a row whose Status or Notes mentions similarity or merge needs a `## Component Similarity Review` table
- Component Similarity Review rows need a visual reference (Figma node preview, screenshot crop, or an SVG labeled `schematic fallback - source preview unavailable`) and an accepted decision: `merge` | `make variant` | `keep distinct` | `blocked` | `out-of-scope`
- a spec without `## Component Fingerprint` is a warning; in strict mode it is an issue when the inventory marks that component `extracted` and the spec is extractor-authored
- prints `Similarity clusters: <n>` and `Unresolved similarity clusters: <n>` (union-find over the candidate and similar names of the similarity rows; a cluster is unresolved when any of its rows lacks an accepted decision); the rules and exit code are unchanged

## Regression Tests

- `node <skill-root>/scripts/test_audits.mjs` — `node:test` suite over the fixtures in `scripts/fixtures/`; run it after changing any script, fixture, or template file. The `near-token-clusters` fixture covers clustering, canonical selection, the three tiers, `apply_token_decisions.mjs` (dry run, auto, rewrite, proposal, must-ask), the review page clusters and the scale fit.
- `node <ds-to-storybook-root>/scripts/test_trace_and_plan_contract.mjs` — copies this skill's `assets/design-system-template/` and checks that `design-system-to-storybook` can trace Source Inventory rows and plan inventory rows from it; run it whenever template columns or headings change.
