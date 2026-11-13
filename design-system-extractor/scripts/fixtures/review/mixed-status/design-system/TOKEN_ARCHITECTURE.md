# Token Architecture

## Near Token Decisions

| Candidates | Provenance | Difference | Suggested action | Decision | Rationale | Confirmed by |
|---|---|---|---|---|---|---|
| `--md-ref-size-10` `--md-ref-size-11` | measured / measured | 1px | keep distinct | | Micro and caption text are separate roles. | |
| `--md-ref-duration-150` (150ms) `--md-ref-duration-180` (180ms) | measured / measured | 30ms | merge into `--md-ref-duration-150` | | Both were timed from the same hover transition. | |
| `--md-ref-size-30` `--md-ref-size-31` | authored / authored | 1px | keep distinct | keep distinct | Both come from Figma variables. | designer via review.html 2026-11-13 |
