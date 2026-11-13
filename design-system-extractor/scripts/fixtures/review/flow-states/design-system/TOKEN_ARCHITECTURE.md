# Token Architecture

## Near Token Decisions

| Candidates | Provenance | Difference | Suggested action | Decision | Rationale | Confirmed by |
|---|---|---|---|---|---|---|
| `--md-ref-size-10` `--md-ref-size-11` | measured / measured | 1px | keep distinct | | Micro and caption text are separate roles. | |
| `--md-ref-size-20` `--md-ref-size-21` | measured / measured | 1px | keep distinct | keep distinct | Written by the AI without a confirmer. | |
| `--md-ref-size-30` `--md-ref-size-31` | authored / authored | 1px | keep distinct | keep distinct | Both come from Figma variables. | designer via review.html 2026-11-13 |
| `--md-ref-size-15` (15px) `--md-ref-size-16` (16px) | measured / authored | 1px | merge into `--md-ref-size-16` | merge into `--md-ref-size-16` | 15px was a screenshot reading of the 16px body size. | designer via review.html 2026-11-13 |
| `--md-ref-size-41` (41px) `--md-ref-size-40` (40px) | measured / authored | 1px | merge into `--md-ref-size-40` | merge into `--md-ref-size-40` | 41px was a measurement of the 40px row. | designer via review.html 2026-11-13 |
| `--md-ref-size-40` `--md-ref-size-42` `--md-ref-size-43` | authored | 2px to 3px | keep distinct | keep distinct | Row, touch target and control heights are separate roles. | designer via review.html 2026-11-13 |
