# Token Architecture

## Near Token Decisions

| Candidates | Provenance | Difference | Suggested action | Decision | Rationale | Confirmed by |
|---|---|---|---|---|---|---|
| `--sl-ref-color-neutral-warm-96` `--sl-ref-color-neutral-warm-92` `--sl-ref-color-neutral-warm-88` | authored (source CSS) | deltaE 2.9 between neighbours | keep distinct | | Each step has its own role: 96 is the raised surface, 92 the page canvas, 88 the sunken fill that must stay visibly lower. | |
| `--sl-ref-color-neutral-warm-18` `--sl-ref-color-neutral-warm-15` `--sl-ref-color-neutral-warm-12` `--sl-ref-color-neutral-warm-8` `--sl-ref-color-neutral-warm-5` `--sl-ref-color-neutral-warm-0` | authored (source CSS) | deltaE 1.2 to 2.8 between neighbours | keep distinct | | The dark theme layers several near-black warm steps on purpose, so the dashboard is not a flat black. | |
| `--sl-ref-type-13` `--sl-ref-type-14` | authored (source CSS) | 1px | keep distinct | | 13px is the disclaimer floor; 14px is the ordinary label minimum. | |
| `--sl-ref-duration-180` (180ms) `--sl-ref-duration-150` (150ms) | measured / authored | 30ms | merge into `--sl-ref-duration-150` | | 180ms was timed from a recording of the 150ms hover transition. | |
| `--sl-ref-opacity-10` `--sl-ref-opacity-12` | measured / measured | 0.02 | keep distinct | | 10% is the hairline tint and 12% the hover wash; both appear in the captures. | |
