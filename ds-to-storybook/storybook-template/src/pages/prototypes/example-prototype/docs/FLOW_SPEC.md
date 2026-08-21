# Flow Spec

## Source Of Truth

`examplePrototypeFlow.ts` owns route ids, flow-only nodes, and transitions. UI labels are not used as the flow source of truth.

## Routes

- `intake`: default entry route for a project request draft.
- `review`: reviewer checks scope, requirements, and risks.
- `handoff`: approved request is ready for implementation.

## Flow Nodes

- `approval-decision`: decision node that represents approval logic without becoming a rendered product route.

## Key Transitions

- `intake` to `review` through `intakeForm.submit`.
- `review` to `approval-decision` through `reviewPanel.requestApproval`.
- `approval-decision` to `handoff` through `approvalDecision.approved`.

## Reference Transitions

- `approval-decision` to `review` through `approvalDecision.needsChanges`.
- `review` to `intake` through `reviewPanel.editIntake`.
- `handoff` to `intake` through `handoff.startNew`.

## UI Flow Rules

Only transitions with `flowLine: "key"` are drawn as canvas edges. Reference transitions remain in metadata and Data mode for reviewers.

UI Flow route cards and Static Flow route cards use the same route UI size contract. The marked `data-prototype-route-preview="true"` surface defines the route preview width and height; headers, borders, and labels are flow chrome outside that UI boundary.

Static Flow reads saved positions from `prototype-inspector:flow-layout:example-prototype` before falling back to `flowPosition` metadata. When another Storybook tab updates that layout through UI Flow dragging, Static Flow refreshes from storage so the export surface matches the reviewed canvas positions.

Static Flow is the static export counterpart of UI Flow. It uses the same dotted canvas, route card chrome, decision node shape, dashed orthogonal edge style, color variants, arrowheads, and label pill pattern so Figma review exports match the interactive review surface.
