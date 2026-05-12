# Typography

Describe the reading system, hierarchy rules, and token naming for text.

## Analysis Inputs

- Dominant text weights and where they appear.
- Relative contrast between headings, body, labels, and metadata.
- Whether the source feels editorial, product-led, technical, or brand-forward.

## Required Table

| Role | Recommendation | Observed source cue | Rationale | Token direction |
| --- | --- | --- | --- | --- |
| Primary typeface |  |  |  | `--sys-font-*` |
| Secondary typeface |  |  |  | `--sys-font-*` |
| Heading weight |  |  |  | `--sys-font-weight-*` |
| Body weight |  |  |  | `--sys-font-weight-*` |
| Label/meta weight |  |  |  | `--sys-font-weight-*` |

## Bento Snapshot

| Role | Use case | Token fields | Notes |
| --- | --- | --- | --- |
| Display | Large hero moments | family, size, line-height, weight, tracking | Use sparingly and intentionally |
| Heading | Section and card titles | family, size, line-height, weight | Defines hierarchy before color does |
| Body | Default reading text | family, size, line-height, weight | Optimize for sustained reading |
| Label | Controls, metadata, badges | family, size, line-height, weight, transform | Keep dense but readable |

## Required Spec

- One or two recommended open-source fonts, preferably from Google Fonts, with selection rationale
- Type families and approved fallbacks
- Size scale and line-height rhythm
- Weight mapping and where each weight is allowed
- Rules for caps, tracking, truncation, and long-form text

## Usage Rules

- Use type tokens for every reusable component story and screen.
- Let weight, size, and spacing establish hierarchy before adding color emphasis.
- Prefer role-driven names such as `body-md` or `title-lg` over page-specific names.
- If responsive typography changes hierarchy, document the breakpoint behavior here.

## Usage Guidance

### Display

Reserve `Display` for landing moments, empty states, hero panels, or a document front door. It should signal a major shift in hierarchy, not routine section structure.

### H1 / H2 / H3

Use headings to organize page, section, and card structure. `H1` owns the page or major guide title, `H2` groups sections, and `H3` handles local modules such as cards, side panels, or anatomy callouts.

### Body

Use body styles for guidelines, explanations, helper text, and long-form reading. The default body size should optimize for sustained reading before visual flair.

### Label

Use labels for form controls, tabs, compact UI metadata, chips, and short descriptive text attached to another element. Labels can be tighter than body text, but they must remain readable at a glance.

### Caption / Meta

Use caption or meta text for timestamps, footnotes, supportive annotations, and non-primary quantitative detail. It should never carry core action or validation meaning by itself.

## Storybook Expectations

- Show the full type ladder with real sample content.
- Demonstrate hierarchy inside a bento-style editorial layout, not isolated rows only.
- Annotate where text should wrap, truncate, or remain single-line.
