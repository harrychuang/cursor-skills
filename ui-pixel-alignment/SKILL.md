---
name: ui-pixel-alignment
description: >-
  Audit an implemented UI against a design or code reference and produce a
  screenshot-backed pixel alignment report. The reference can be a Figma file or
  frame, a design export or screenshot, or another platform's source code — a web
  implementation used as the truth for an app, or an app implementation used as
  the truth for web. Use for design-to-implementation visual QA, cross-platform
  parity audits, Figma comparison reports, captured incorrect styles, visual
  drift evidence, or handoff documentation before or alongside UI fixes.
---

# UI Pixel Align Report

Compare a reference UI with an implemented UI and produce durable evidence: full screenshots, focused issue crops, measured drift, ownership classification, and recommended fixes.

This skill **documents** drift. It does not edit implementation code unless the user explicitly asks for fixes as well. To fix a screen, use `ui-compare-to-reference` — it reads the `findings.json` this skill produces.

## Use as a verification stage

`design-system-to-storybook` calls this skill as its **Design Parity Gate**: any component or page with Figma evidence must have a parity report before it can be marked done. When invoked that way:

- Accept the design-system package's artifacts as inputs: `design-system/DESIGN_EVIDENCE_MAP.md` and `design-system/STORYBOOK_SOURCE_TRACE.md` resolve the reference side (Figma node URLs, image paths); the implementation map or component queue names the Storybook story or route for the implementation side.
- Read the package's token files and `TOKEN_ARCHITECTURE.md`: populate `tokenRefs` from the extracted tokens, and copy every `a11y-remap` record into `accessibilityRemaps` so sanctioned accessibility replacements classify as `required-adaptation`, not drift.
- Write the report to the default destination and hand the report path back so the caller can record it in `STORYBOOK_IMPLEMENTATION_MAP.md`.
- The caller's gate blocks on findings with `parityClass: "strict"` and `status: "open"` — every such finding must end the pass as fixed, or adjudicated (`accepted` with a recorded reason), before the component is done.

## What this skill compares

The reference and the implementation may be on different platforms. All six combinations are supported:

| Reference | Implementation | Typical ask |
|---|---|---|
| Figma frame | web | "設計稿跟網頁對不上" |
| Figma frame | app (RN / Flutter / iOS / Android) | "App 跟設計稿差很多" |
| Web source or live URL | app | "照著網頁版把 App 修對" |
| App source or running app | web | "Web 版要跟 App 一致" |
| Screenshot / export | web or app | no Figma access |
| App on one OS | app on the other OS | iOS ↔ Android parity |

## Method

Never eyeball one surface against the other. Extract **both** sides into the platform-neutral UI Spec, then diff the specs. Screenshots are evidence for the report, not the measurement instrument.

```
reference ──┐
            ├─► UI Spec ──► parity-aware diff ──► candidate findings ──► review ──► findings.json ──► HTML report
implement ──┘
```

## Inputs

- **Reference:** Figma URL or node URL, Figma selection, design export, screenshot, image folder, another repo's source path, a running URL for the reference implementation, or a named frame.
- **Implementation:** live URL, route, Storybook URL, story file, page file, component file, simulator/device screenshot, or an inferred target.
- **Capture context:** viewport, device scale factor, theme, locale, branch, environment, auth state, test data state.
- **Design-system package (optional):** extracted `design-system/` docs, token files, `DESIGN_EVIDENCE_MAP.md`, and `STORYBOOK_SOURCE_TRACE.md` — used to resolve sources, populate `tokenRefs`, and collect `a11y-remap` records into `accessibilityRemaps`.
- **Report destination:** default `reports/design-pixel-align/<screen-or-component>/`.

An explicit reference + implementation pair is authoritative. Do not replace it with auto-discovery unless one side cannot be loaded.

## Workflow

1. **Resolve the comparison.** Identify both platforms, both viewports, theme, density, locale, and state. State the pair explicitly before doing anything else — "Figma 390×844 → React Native 390×844, light, en" — because the parity rules depend on it.

2. **Extract the reference UI Spec** into `spec/reference.json`.
   - Figma → `references/extract-figma.md`. Use the Figma MCP tools first; fall back to image measurement only when MCP is unavailable, and record `fidelity: "estimated"`.
   - Reference source code or a running reference app → `references/extract-code.md`.
   - Schema and unit normalization → `references/ui-spec.md`.

3. **Extract the implementation UI Spec** into `spec/implementation.json` using the same reference docs. Render and measure whenever the surface can actually run; read source only when it cannot.

4. **Align the font environment before any visual comparison.** Fallback fonts change ink height by up to ~30%, which fabricates type-size and box-height findings and drowns the diff in noise (headless Chromium without PingFang against an iOS reference is the canonical trap).
   - Confirm the rendering environment loads the same fonts as the source platform: load the platform fonts into the Storybook/preview page, or use a CI-reproducible font bundle.
   - Record what actually loaded — `document.fonts.check(...)`, a rendered-font inspector, or OS font tooling — into `surface.fonts` (`requested`, `loaded`, `aligned`) on each spec.
   - If the fonts cannot be aligned, set `aligned: false`. The diff will mark the report `fontEnvironment: mismatched` and downgrade typography metrics and text-node box sizes to `low`; those findings are untrusted and must never drive token changes.

5. **Capture full-surface images** for both sides at the same viewport, theme, and state. These become `screenshots.reference` and `screenshots.implementation`.

6. **Diff the specs.**

   ```sh
   node <skill-root>/scripts/diff_spec.mjs \
     --reference reports/design-pixel-align/wallet/spec/reference.json \
     --implementation reports/design-pixel-align/wallet/spec/implementation.json \
     --output reports/design-pixel-align/wallet/findings.candidates.json
   ```

   The script matches nodes, compares fields with unit-aware tolerances, applies `assets/parity-policy.json`, and proposes severity. Pass `--policy` to use a project-specific policy. When the design system records accessibility remaps, put them in `accessibilityRemaps` (in either spec, or via `--remaps`) so the authored-vs-accessible differences classify as `required-adaptation` automatically.

   The output's `candidateStats` includes a **field convergence** percentage — passed plus sanctioned (adaptations, recorded remaps) over all compared fields. `ui-compare-to-reference` uses it as the per-cycle progress meter of its fix loop; in a report it quantifies how close the implementation is.

7. **Review every candidate.** The script handles arithmetic; you handle judgement. For each candidate decide:
   - Is it real, or an artifact of a bad node match, a wrong capture scale, or a mismatched font environment?
   - Is it drift, a sanctioned platform adaptation, an adaptation the implementation failed to make, or a recorded accessibility remap (`required-adaptation`, never drift)?
   - Who owns it: `token/theme`, `primitive/shared component`, `component variant/props`, `composition`, or `page-only`?
   - Which files and tokens does the fix touch?

   Delete false positives. Record how many candidates were reviewed and how many were dropped.

8. **Add per-finding evidence.** Crop the reference and the implementation for each surviving finding. Add a diff or overlay crop when practical.

9. **Write `findings.json`** and generate the report:

   ```sh
   node <skill-root>/scripts/generate_report.mjs \
     --input reports/design-pixel-align/wallet/findings.json \
     --output reports/design-pixel-align/wallet
   ```

10. **Verify the output.** Open `index.html` and check that images resolve, links work, and the platform pair, viewports, fidelity, font environment, and parity mode are visible.

## Parity Rules

Cross-platform comparison fails when every difference is treated as a defect. `references/parity-policy.md` is the full rule set; the short version:

- **`drift`** — must match, does not. This is the fixable set.
- **`adaptation`** — a difference the platform or form factor justifies (font substitution, cross-form-factor density). Report at `low`, never as a defect.
- **`required-adaptation`** — the implementation copied the reference where it should have diverged: a 32pt button on iOS that needs 44pt, content ignoring safe-area insets, fixed-height text containers that clip under Dynamic Type. Recorded accessibility remaps (`a11y-remap` in the design system) also land here: the accessible value is the sanctioned divergence, and shipping the authored value would be the defect.
- **`ignored`** — OS chrome, scrollbars, hover states on touch targets, absolute positions.

The single most important input is the **form factor relationship**. Same viewport class → spacing and typography compare strictly. Desktop reference vs phone target → compare ratio and hierarchy, not absolute pixels. The diff script decides this from the two viewports; state which mode applied in the report summary.

## Finding Rules

- One visual problem per finding. Split unrelated problems even in the same block.
- Preserve source links. For Figma, put the frame or node URL in `source.designUrl` and per-finding `designReference`.
- Use concrete deltas: `padding top -8px (expected 24, actual 16)`, `radius 12px expected vs 8px actual`, `color expected #6b7280 vs #9ca3af`.
- Prefer token names over raw values when the project has tokens.
- Keep fixes implementation-aware: cite files, components, props, variants, tokens.
- Severity by user impact:
  - `high` — layout break, wrong hierarchy, clipped or overlapping content, wrong copy, brand-critical mismatch, or a missed required adaptation.
  - `medium` — noticeable spacing, typography, color, or component-state drift.
  - `low` — polish that does not change comprehension, and all accepted adaptations.
- Do not file sub-2px findings from an `estimated` spec. Image measurement does not support that precision.
- If no drift is found, still generate a report with full screenshots, comparison metadata, and an empty findings list.

## Findings JSON

`diff_spec.mjs` emits this shape already; edit its output rather than writing from scratch. Paths may be absolute or relative to the JSON file.

```jsonc
{
  "title": "Wallet Home — Figma vs React Native parity",
  "summary": "Figma 390x844 reference compared with the React Native screen at the same form factor.",
  "source": {
    "designName": "Wallet / Home",
    "designUrl": "https://www.figma.com/design/file?node-id=1-234",
    "designPlatform": "figma",
    "implementationName": "WalletHome screen",
    "implementationUrl": "",
    "implementationSource": "src/screens/WalletHome.tsx",
    "implementationPlatform": "react-native",
    "viewport": "390x844",
    "referenceViewport": "390x844",
    "theme": "light",
    "capturedAt": "2026-08-04T02:00:00Z"
  },
  "parity": {
    "policy": "assets/parity-policy.json",
    "formFactor": "same",
    "engines": "cross",
    "referenceFidelity": "measured",
    "implementationFidelity": "measured",
    "fontEnvironment": "aligned"
  },
  "screenshots": {
    "reference": "captures/reference-full.png",
    "implementation": "captures/implementation-full.png",
    "diff": "captures/full-diff.png"
  },
  "findings": [
    {
      "id": "PA-001",
      "severity": "medium",
      "intent": "drift",
      "parityClass": "strict",
      "specField": "box.padding",
      "block": "Balance summary card",
      "ownership": "primitive/shared component",
      "status": "open",
      "expected": "padding is [24, 24, 24, 24].",
      "actual": "Implementation renders [16, 16, 16, 16].",
      "delta": ["padding top -8px (expected 24, actual 16)"],
      "recommendedFix": "Apply --sys-space-6 to padding on the SummaryCard component instead of the current value.",
      "designReference": "https://www.figma.com/design/file?node-id=4-8",
      "implementationReference": "src/components/SummaryCard.tsx",
      "tokens": ["--sys-space-6"],
      "files": ["src/components/SummaryCard.tsx", "src/theme/tokens.ts"],
      "assets": {
        "reference": "captures/pa-001-reference.png",
        "implementation": "captures/pa-001-implementation.png",
        "diff": "captures/pa-001-diff.png"
      }
    }
  ]
}
```

`intent`, `parityClass`, and `specField` are optional; when present they render as badges and drive the drift / adaptation counters.

## Report Generation

```sh
node <skill-root>/scripts/generate_report.mjs \
  --input <findings.json> --output <report-dir>
```

Produces `index.html`, `styles.css`, and `assets/` with copied local screenshots. `--title` overrides the JSON title. `--no-copy-assets` only when image paths are already stable relative to the report.

## Report Quality Bar

- Both platforms and both viewports are stated, not just the implementation's.
- The parity mode (same vs cross form factor), both fidelity levels, and the font environment status are visible, so a reader knows how much to trust the numbers. A `mismatched` font environment must be stated in the summary, with type-related findings visibly downgraded.
- The original design link is present, or the report explains why there is none.
- Every finding has a reference crop and an implementation crop unless the source could not be captured.
- Every finding has expected, actual, delta, ownership, severity, intent, and a recommended fix.
- Adaptations are visibly separated from drift. A reader must be able to tell what to fix from what to leave alone.
- Self-contained except for local image assets and external source links.
- Reviewable without any conversation context.

## Validation

1. `index.html`, `styles.css`, and copied assets exist.
2. All image references resolve.
3. Design source, implementation source, both platforms, viewport, theme, and capture date are visible.
4. Findings are sorted high severity first, drift before adaptation.
5. Node counts add up: matched + missing + extra covers what the specs contain, and the coverage block names what was deliberately skipped.
6. Recorded accessibility remaps appear as `required-adaptation`, not drift, and a `mismatched` font environment is declared with type findings downgraded.
7. If fixes were also applied, run the project's cheapest reliable validation and mark which findings are fixed versus open.

## Reference Files

- `references/ui-spec.md` — the platform-neutral spec schema, unit normalization, capture depth.
- `references/extract-figma.md` — Figma MCP extraction, auto-layout mapping, image fallback.
- `references/extract-code.md` — reading web, React Native, Flutter, SwiftUI, and Compose into the spec.
- `references/parity-policy.md` — must-match, may-adapt, must-differ, ignored.
- `assets/parity-policy.json` — the machine-readable policy the diff script applies.
