# UI Generation Accuracy Contract

Use this contract before building from screenshots or Figma. It defines what the automation can promise, what it must verify, and what remains an assumption.

## Short Answer

Figma-first mode can produce the highest-fidelity product UI because the agent can use structured design context: variables, layout data, component sets, selected frame context, and code connections when available.

Screenshot-only mode can produce a strong visual reconstruction, but it is inference-based. A single image cannot reliably define hidden states, responsive behavior, real data rules, component ownership, accessibility behavior, or the intended design token model. Treat it as a first-pass implementation target plus a parity loop, not as a complete product specification.

## Accuracy Tiers

| Input mode | Expected accuracy | Main risks | Required guardrails |
| --- | --- | --- | --- |
| Figma-first | Highest fidelity for layout, tokens, variables, and component structure when Figma context is available | Wrong node, stale design, missing Code Connect mapping, unbound variables | Run Phase 0, inspect variables, prefer Figma as source of truth, validate against latest node screenshot |
| Multi-reference screenshots | Good visual reconstruction across repeated patterns and breakpoints | Ambiguous component boundaries, approximate spacing/type values, hidden states missing | Use multiple screenshots, derive tokens from repeated evidence, run visual parity by viewport |
| Single-image | Useful first-pass approximation and design-system draft | High uncertainty for responsive layout, states, data, interactions, exact fonts, and component reuse | Record observed/inferred/missing context, ask targeted questions, keep assumptions visible, run parity iteration |

## Image-Only Minimum Intake

When only images are available, capture these before implementation:

| Item | Required? | Why it matters |
| --- | --- | --- |
| Product purpose and target users | Required | Prevents copying pixels without understanding the workflow |
| Target viewport and device class | Required | A desktop screenshot does not define mobile behavior |
| Main user flows | Required | Identifies which UI regions are functional and which are decorative |
| Known states | Required when interactive | Covers empty, loading, error, disabled, hover, selected, and expanded states |
| Real content or data examples | Required when data-driven | Avoids designing around placeholder text length or fake records |
| Brand assets and font rules | Helpful | Reduces wrong typography, icon, and logo inference |
| Responsive targets | Helpful | Defines breakpoints and layout changes |
| Acceptance threshold | Required | Defines how close is close enough before sign-off |

## Assumption Log

Use this table in analysis or PRD notes when context is missing:

| Item | Type | Current decision | Confidence | Needs confirmation |
| --- | --- | --- | --- | --- |
| Font family | observed / inferred / missing |  | high / medium / low | yes / no |
| Spacing grid | observed / inferred / missing |  | high / medium / low | yes / no |
| Mobile layout | observed / inferred / missing |  | high / medium / low | yes / no |
| Component states | observed / inferred / missing |  | high / medium / low | yes / no |
| Data rules | observed / inferred / missing |  | high / medium / low | yes / no |

## Visual Parity Loop

Run parity as an iteration loop, not as a final screenshot check:

1. Capture the source baseline from Figma or `reference/`.
2. Build the token-backed Storybook component first.
3. Compose screens only from documented components.
4. Compare generated output against the source at the target viewport.
5. Fix drift in this order: token/theme, primitive/shared component, component variant/props, composition/layout, page-only styling.
6. Record remaining variance and whether it is accepted, deferred, or blocked by missing context.

## Sign-Off Rules

- Sign off Figma-first work only after the generated UI is checked against the selected Figma node or its latest exported screenshot.
- Sign off multi-screenshot work only after the repeated components and responsive targets match the provided references.
- Sign off single-image work only as a visually aligned first version unless the PRD explicitly fills the missing product, state, and responsive details.
- Do not claim exact design-system extraction from one screenshot. Claim a documented token proposal with confidence levels.
