# Token Architecture

## Near Token Decisions

Use this table when candidate reference tokens are visually or numerically close. Stop and confirm with the developer before finalizing unresolved rows.

| Candidate A | Provenance A | Candidate B | Provenance B | Difference | Decision (`merge` / `keep distinct`) | Rationale | Confirmed by |
|---|---|---|---|---|---|---|---|
| `--md-ref-size-4` | measured | `--md-ref-size-6` | measured | 2px | keep distinct | Vertical stack rhythm vs horizontal icon-label pairing. | Extraction pass |
| `--md-ref-size-12` | measured | `--md-ref-size-14` | measured | 2px | keep distinct | Badge padding vs body text size. | Codex extraction from FIG-002; pending human design review |
| `--md-ref-size-24` | authored | `--md-ref-size-26` | measured | 2px | keep distinct | Title and display sizes are separate roles. | |
| `--md-ref-size-40` | measured | `--md-ref-size-42` | measured | 2px | | Row height vs touch target; not settled yet. | |
