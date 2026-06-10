# HTML Documentation Output

Use this reference when generating developer-facing HTML documentation from extracted design-system files.

## Purpose

The HTML output is a readable handoff artifact for developers and designers. It should make the extracted design system easier to understand without opening every Markdown and token file separately.

## Default Output

Generate:

```txt
docs/design-system/index.html
docs/design-system/review.html
```

Use:

```sh
node skills/design-system-extractor/scripts/generate_docs_html.mjs .
node skills/design-system-extractor/scripts/generate_review_html.mjs .
```

To write elsewhere:

```sh
node skills/design-system-extractor/scripts/generate_docs_html.mjs . public/design-system.html
```

## Required Content

The HTML documentation should include:

- overview and generation timestamp
- navigation for design-system documents
- rendered Markdown from `design-system/`
- rendered component specs from `design-system/components/*.md`
- missing-document notices
- token tables for reference, system, and component layers
- resolved token values when possible
- color swatches for resolved color values
- Markdown image references, including component similarity review thumbnails
- links or labels for source filenames

The review queue HTML should include:

- duplicate source review rows from `DESIGN_EVIDENCE_MAP.md`, including fingerprints or normalized source keys
- color scale issues with swatches
- near color token pairs with swatches and deltaE
- near numeric token pairs with differences
- component similarity review rows with visual references
- documented versus needs-review status

## Design Rules

- Keep the page static and dependency-free.
- Embed CSS in the generated HTML.
- Follow `references/anti-ai-style-rules.md` for the documentation shell itself: no decorative gradients, glassmorphism, excessive card framing, inflated whitespace, or generic hero treatment.
- Do not use gradients, glassmorphism, decorative blobs, or marketing hero patterns.
- Use an editorial documentation layout: sidebar navigation, readable content column, dense token tables, and visible code/token specimens.
- Treat generated HTML as documentation, not as product UI.
- Copy `design-system/assets/` into the generated docs asset folder so review images linked as `assets/...` render from `docs/design-system/index.html` and `docs/design-system/review.html`.

## Internationalization

The generated HTML supports three UI locales:

- `zh-Hant` (default): Traditional Chinese
- `en`: English
- `ja`: Japanese

Behavior:

- Sidebar includes a language switcher (`繁中`, `EN`, `日本語`).
- Shell strings (navigation, hero, stats, token table headers, missing-document notices) switch client-side via embedded copy.
- Markdown body content stays in the language used during extraction; only the documentation chrome is multilingual.
- Selected locale persists in `localStorage` under `design-system-docs-lang`.

When changing UI strings or adding new chrome labels, update `scripts/generate_docs_html.mjs` and keep all three locales in sync.

## Validation

After generation:

1. Confirm the HTML file exists.
2. Confirm `docs/design-system/review.html` exists.
3. Re-run source, token, and component audits with `--strict` after real extraction work.
4. Open or inspect the generated files if a browser is available.
5. Record the generated paths in `design-system/SESSION_STATE.md`.
