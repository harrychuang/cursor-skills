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

The review page (`review.html`) is where a designer decides. It should include:

- one card per review item, grouped under near tokens, similar components, and duplicate sources
- near values grouped into one item per set of connected near pairs, with each value's swatch or specimen, the system roles and components that use it, and a plain-language note of how close the closest pair is
- a compact form for a group of more than 12 values that still lists every value, and can be expanded to decide each one
- the AI's suggested action and reason on each card, or a statement that there is none
- a control per value (checked = keep; unchecked = merge into the nearest kept value, with the target changeable), and a single choice for similar components and duplicate sources
- values an earlier decision merged away, with the option to restore them
- for similar components, one screenshot per side with the compared region outlined and lettered A and B, and an in-page viewer that enlarges a screenshot without opening a new tab
- confirm, skip, return to the suggestion, an optional note, one action that agrees with every untouched suggestion, and progress
- a prompt of the confirmed decisions that can be previewed and copied whole or one item at a time
- color scale issues, with an action that asks the AI to fix them

The page is generated from `assets/review-page/review.template.html`: the generator injects the review items as JSON and writes one HTML file. The page keeps the designer's selections in browser storage under a key unique to the package; it never writes to the project. `generate_review_html.mjs --json` prints the same items and counts without writing a file — `counts.needsReview` is the number of items waiting for the designer, the number the page shows.

## Design Rules

Both pages:

- Keep the page static and dependency-free: one HTML file, CSS and script embedded, no network resource. It must work when opened directly from disk.
- Follow `references/anti-ai-style-rules.md` for the shell itself: no decorative gradients, glassmorphism, excessive card framing, inflated whitespace, or generic hero treatment.
- Do not use gradients, glassmorphism, decorative blobs, or marketing hero patterns.
- Treat generated HTML as documentation and tooling, not as product UI.

The documentation page (`index.html`):

- Use an editorial documentation layout: sidebar navigation, readable content column, dense token tables, and visible code/token specimens.

The review page (`review.html`):

- Use an application-shell layout: a side rail (title, progress, section navigation, how-to, language and swatch-background settings), a main area with a sticky title bar and the cards, and a fixed action bar.
- Dark console theme with solid colors only: no gradients, no translucent background fills, no backdrop blur.
- Cards have no outline and are not nested inside cards; hierarchy comes from surface color. A decorative line goes on the left of text, not around a card.
- No text below 12px; body text 15px, secondary text 14.5px.
- Use native buttons, checkboxes, and selects; every interactive element shows a visible keyboard-focus indicator; smooth scrolling is turned off when the reader prefers reduced motion.
- The swatch stage is a working canvas whose background can be switched (dark, gray, light), because near colors read differently on different grounds.
- Mark regions on screenshots with an outline and a letter, never with a fill over the screenshot.
- No horizontal scrolling at a 420px viewport.
- Copy `design-system/assets/` into the generated docs asset folder so review images linked as `assets/...` render from `docs/design-system/index.html` and `docs/design-system/review.html`.

## Internationalization

Both generated pages support three UI locales:

- `zh-Hant`: Traditional Chinese
- `en`: English
- `ja`: Japanese

Behavior:

- Each page has a language switcher (`繁中`, `EN`, `日本語`).
- Shell strings switch client-side via embedded copy. On the review page that covers every label, the option explanations, and the exported prompt; decision keywords in the prompt stay in their English canonical form.
- Markdown body content, and the reasons and rationales written during extraction, stay in the report language; only the chrome is multilingual.
- The selected locale persists in the browser: the documentation page under `design-system-docs-lang`, the review page together with the designer's selections.

### Default UI Locale

`generate_docs_html.mjs` and `generate_review_html.mjs` choose the default UI locale of the page they write — the statically rendered chrome labels and the client default used on first load, before any stored preference exists — in the same order:

1. a supported `--locale` value: exactly `zh-Hant`, `en`, or `ja`
2. otherwise the `Report Language` recorded in `design-system/SESSION_STATE.md`, mapped as in the table below
3. otherwise `en`

```sh
node skills/design-system-extractor/scripts/generate_docs_html.mjs .
node skills/design-system-extractor/scripts/generate_review_html.mjs . --locale ja
```

An unsupported flag value prints a warning to stderr, falls back to steps 2 and 3, and exits successfully — generation is never aborted by a bad locale value.

| Report language recorded | Default UI locale |
| --- | --- |
| Traditional Chinese (zh-Hant) | `zh-Hant` |
| Simplified Chinese (zh-Hans) | `zh-Hant` |
| Japanese (ja) | `ja` |
| English (en) | `en` |
| any other language | `en` |
| no record | `en` |

A package without a `Report Language` record that used to open in Traditional Chinese now opens in English; add the record or pass `--locale zh-Hant` to keep the earlier default.

The appended-annotation report format (`## Source Inventory（來源清單）`) relies on the audit scripts matching English canonical text by substring. If audit matching ever changes to exact-equality comparison, re-check the annotation rules in `SKILL.md` at the same time.

When changing UI strings or adding new chrome labels, update `scripts/generate_docs_html.mjs` or `assets/review-page/review.template.html` and keep all three locales in sync; `test_review_page.test.mjs` fails when the review page's three string tables differ.

## Validation

After generation:

1. Confirm the HTML file exists.
2. Confirm `docs/design-system/review.html` exists.
3. Re-run source, token, and component audits with `--strict` after real extraction work.
4. Open or inspect the generated files if a browser is available.
5. Record the generated paths in `design-system/SESSION_STATE.md`.
