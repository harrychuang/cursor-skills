# Creation & Modification Procedures (Post-Approval Detail)

Detailed procedures for work that has already passed a Blocking Decision Gate. SKILL.md
holds the summary; this file holds the mechanics.

## 1. Creating tokens (3-layer projects)

Work bottom-up through the discovered token files, one layer at a time:

1. **Locate the layer files** found in Phase 0 (e.g. `tokens/tokens-ref.css`,
   `tokens-sys.css`, `tokens-comp.css`, or the project equivalent — a Tailwind
   `@theme` block, a `theme.ts` object, `*.tokens.json`).
2. **ref** — check whether an existing ref step already covers the needed value
   (a color step, spacing step, radius step). Reuse it if so. Only add a new ref
   primitive when no existing step fits, named per the ref naming rules (value-readable,
   no component/region words).
3. **sys** — create or extend the semantic role referencing ref. Keep the name generic
   enough that other components could consume it.
4. **comp** — create the component slot referencing **sys only** (never ref).

Wiring example (CSS custom properties; adapt prefix to the project):

```css
/* tokens-ref.css  — raw values live ONLY here */
--x-ref-color-blue-40: #2f6fdb;

/* tokens-sys.css  — semantic role, references ref */
--x-sys-color-action-primary: var(--x-ref-color-blue-40);
--x-sys-color-on-action-primary: var(--x-ref-color-white);

/* tokens-comp.css — component slot, references sys ONLY */
--x-comp-button-bg: var(--x-sys-color-action-primary);
--x-comp-button-fg: var(--x-sys-color-on-action-primary);
```

JSON / Style Dictionary projects follow the same layering with `{ "value": "{ref.color.blue.40}" }`
style references; Tailwind projects extend the theme scale rather than adding arbitrary
values.

### 2-layer projects (primitive → semantic)

Stop after the semantic step. Components consume semantic tokens directly. Do **not**
invent a comp layer — that is a token-architecture migration requiring its own explicit
user approval.

## 2. Theming coverage (mandatory for color tokens)

- Every new **sys color token** (including its `on-*` pair) must be defined in **every
  theme context discovered in Phase 0** (`[data-theme="dark"]`, `prefers-color-scheme`
  blocks, per-theme files). A color token defined in only one theme is a defect, not a
  partial delivery.
- **ref** primitives are theme-invariant (the palette does not change per theme; which
  ref step a sys role maps to is what changes).
- **comp** tokens inherit theming through sys automatically — never re-define comp
  tokens per theme.

## 3. Contrast validation (every new/changed color pair)

For every background + `on-*` pair, in **every theme**, compute the WCAG contrast ratio:

```
L = 0.2126·R + 0.7152·G + 0.0722·B      (R,G,B linearized: c/12.92 if c ≤ 0.03928,
                                          else ((c+0.055)/1.055)^2.4, c = channel/255)
ratio = (L_lighter + 0.05) / (L_darker + 0.05)
```

Required: **≥ 4.5:1** for body text, **≥ 3:1** for large text (≥24px, or ≥18.66px bold)
and interactive component boundaries. If a pair fails, report the failing pair and its
ratio to the user — do not silently adjust the approved values.

## 4. Bootstrapping a token system (no token system exists)

Only after explicit user approval (Phase 0 stop):

- **Preferred path when the repo suggests it**: propose running `design-system-extractor`
  to derive a full evidence-backed system, rather than inventing one.
- **Minimal manual bootstrap**: 3-layer CSS custom properties with a short project
  prefix, laid out as `tokens/tokens-ref.css`, `tokens-sys.css`, `tokens-comp.css`
  plus an aggregating `tokens.css`. Seed values come from the project's existing styles
  where they exist, else from [house-style.md](house-style.md) if the user adopted it.

## 5. Building a new shared component (post Composition Gate)

1. **Placement & export** — follow the discovered component-library structure
   (directory, file naming, index/barrel export, story co-location) so future Phase 0
   scans and other agents find it.
2. **Comp-token slots first, styling second** — before writing CSS, define the comp
   slot checklist for every state the component supports:
   container color + `on-*` per state (rest/hover/focus/active/disabled/error/selected
   as applicable), padding, gap, radius, typography role, motion duration/easing.
3. **Every visual value resolves through a token** — comp slots in 3-layer projects,
   semantic tokens in 2-layer projects. Zero literals in the component file.
4. **States & stories** — implement and story every supported state (see the Storybook
   requirements in SKILL.md), including a themed variant when the project is themed.

## 6. Modifying existing tokens & components (detail for the Modification Gate)

1. **Enumerate consumers first** — grep the token name / component import across the
   codebase; list every consumer file.
2. **Classify the change**:
   - *value-only* (same name, new value) — visual blast radius = all consumers;
   - *rename* — breaking unless aliased;
   - *removal* — breaking;
   - *component API change* (props/slots/variants) — breaking for call sites.
3. **Modification Gate** — if anything beyond the target component is affected, stop
   and present the consumer list + classification for approval before editing.
4. **Rename/removal flow** — add the new token, keep the old name as an alias
   referencing the new one with a deprecation comment, migrate consumers, then remove
   the alias in a follow-up the user approves.
5. **Re-verify** — after the change, re-check the stories of every affected component,
   and re-run the contrast validation if color values changed.

## 7. Adding i18n keys

1. Infer the key naming pattern and namespace from existing entries in the discovered
   i18n source.
2. Add every new key to **all** discovered locale files — the source-language value in
   the authoring locale, and the project's untranslated marker (or the source value +
   `TODO-translate` comment, per project convention) in the others. A key present in
   one locale only is a runtime defect.
3. List new keys and their untranslated locales in the Output Contract.
