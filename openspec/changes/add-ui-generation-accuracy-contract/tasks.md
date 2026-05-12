## 1. Accuracy contract

- [x] 1.1 Deliver `UI generation accuracy contract` and `Decision: Define accuracy tiers by input source` by adding `start-here/ACCURACY_CONTRACT.md` with input tiers, expected precision, risk boundaries, and guardrails, then verify by manual content review.
- [x] 1.2 Deliver `Image-only intake records missing context` and `Decision: Add an image-only intake contract` by adding image-only required context and open-question handling to PRD and workflow docs, then verify by manual content review.
- [x] 1.3 Deliver `Visual parity acceptance loop` and `Decision: Make parity an iterative acceptance loop` by updating build workflow and local skill instructions with baseline, iteration, fix-order, and variance log guidance, then verify by manual content review.

## 2. Template parity

- [x] 2.1 Mirror the accuracy contract and workflow updates into `create-design-workspace/assets/template`, then verify the starter and template files match for the updated docs.
- [x] 2.2 Validate the change with `spectra validate --changes add-ui-generation-accuracy-contract --strict` and `npm test` from `design-workspace-starter`.
