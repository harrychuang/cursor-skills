# Acceptance Criteria

## Storybook

- The default story renders the interactive `__FEATURE_TITLE__` prototype.
- `parameters.prototype.docs` exposes PRD, UI Spec, Flow Spec, Data Spec, Implementation Guide, and Acceptance.
- `parameters.prototype.flow.routes` contains every interactive route.
- `parameters.prototype.flow.nodes` contains every flow-only branch node.
- `parameters.prototype.flow.transitions` contains every user-triggered transition.

## Interaction

- Initial route is `__ENTRY_ROUTE_ID__`.
- [Every documented trigger changes route, updates local state, or is explicitly out of scope.]

## Data

- Fixtures are local and deterministic.
- API replacement points are documented.

## Engineering

- Prototype-only CSS is scoped to `.__FEATURE_CSS_CLASS__`.
- Existing reusable components are used before local markup.
- TypeScript passes in the target project.
