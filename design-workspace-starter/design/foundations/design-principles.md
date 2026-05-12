# Design Principles

Use these principles to explain the system before discussing component details.
Derive them from repeated evidence in screenshots or Figma, not taste alone.

## Analysis Workflow

1. Observe recurring signals across the source: color proportion, spacing feel, corner size, typography weight, and hierarchy contrast.
2. Separate `observed` facts from `inferred` system decisions. If a value is estimated, say so.
3. Summarize 5-7 principles only after the pattern repeats across multiple regions, screens, or key Figma nodes.
4. For each principle, explain the token impact and any intentional exceptions.

## Required Table

| Principle | Source evidence | Interpretation | Design rule | Token impact |
| --- | --- | --- | --- | --- |
| 1 |  |  |  |  |
| 2 |  |  |  |  |
| 3 |  |  |  |  |
| 4 |  |  |  |  |
| 5 |  |  |  |  |

Add rows 6-7 only when the evidence supports them.

## Bento Snapshot

| Principle | Source evidence | Interpretation | Design rule | Token impact |
| --- | --- | --- | --- | --- |
| Clarity first | Neutral surfaces dominate and text hierarchy does most of the work | The interface prefers legibility over decorative layering | Remove decorative noise before adding new accents | Prefer semantic color roles and clear type hierarchy |
| Structured emphasis | Accent color and heavier weight appear in a narrow set of key moments | Emphasis is scarce and therefore more effective | Emphasize with contrast, size, and spacing in that order | Reserve stronger tokens for true hierarchy shifts |
| Rhythm over ornament | Repeated padding steps and aligned containers create polish | Layout consistency matters more than isolated visual flourishes | Reuse spacing steps and radius families across layouts | Keep layout tokens sparse and repeatable |
| Accessible by default | Text, controls, and state changes remain legible under low-chroma surfaces | Readability and states are baseline quality, not extra work | Check contrast, focus, and state legibility before sign-off | Semantic tokens must encode accessible defaults |

## Design Spec Expectations

- Document the intended mood, target density, and hierarchy model for the product.
- Describe the dominant color ratio, spacing density, radius tone, and text weight strategy in plain language.
- Explain what should feel bold, quiet, premium, playful, or utilitarian.
- If references disagree, document the dominant pattern and the exceptions instead of averaging everything together.
- Note platform constraints such as responsive breakpoints, touch targets, or enterprise density needs.

## Review Questions

- Can a new designer or engineer tell which layer is primary, secondary, and supporting?
- Are repeated patterns explained once here instead of re-decided in each component?
- Do tokens encode the rule, or are teams relying on visual memory?
- Is each principle traceable to visible evidence rather than subjective preference alone?
