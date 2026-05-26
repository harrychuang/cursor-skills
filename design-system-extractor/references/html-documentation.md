# HTML Documentation Output

Use this reference when generating developer-facing HTML documentation from extracted design-system files.

## Purpose

The HTML output is a readable handoff artifact for developers and designers. It should make the extracted design system easier to understand without opening every Markdown and token file separately.

## Default Output

Generate:

```txt
docs/design-system/index.html
```

Use:

```sh
node skills/design-system-extractor/scripts/generate_docs_html.mjs .
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
- links or labels for source filenames

## Design Rules

- Keep the page static and dependency-free.
- Embed CSS in the generated HTML.
- Do not use gradients, glassmorphism, decorative blobs, or marketing hero patterns.
- Use an editorial documentation layout: sidebar navigation, readable content column, dense token tables, and visible code/token specimens.
- Treat generated HTML as documentation, not as product UI.

## Validation

After generation:

1. Confirm the HTML file exists.
2. Re-run token audit with `--strict` after real extraction work.
3. Open or inspect the generated file if a browser is available.
4. Record the generated path in `design-system/SESSION_STATE.md`.
