# Data Contract

Use this reference when creating `DATA_SPEC.md` and `<featurePrototypeData>.ts`.

## Fixture Rules

- Keep fixtures local and deterministic.
- Use existing component prop types when possible.
- Name fixture groups by route or domain.
- Include branch fixtures when the UI Flow contains branch nodes.
- Include empty, loading, disabled, and error fixtures when those states are in scope.
- Do not call live product APIs from a prototype.
- For frontend handoff, map every fixture group to an expected API, service, local storage, feature flag, or static content contract.
- Do not wire real data sources, auth/session, backend clients, cache, storage, or persistence inside the prototype unless the user explicitly scopes that work.

## Data Spec Sections

Use these sections:

```markdown
# Data Spec

## Source Of Truth

## Fixture Inventory

## Route Data Requirements

## Data Schemas

## API Replacement Points

## State And Branch Fixtures

## AI Update Rules
```

## API Replacement Points

For each future API or service, document:

- endpoint or service name
- method if known
- request shape
- response shape
- owning team or source
- routes that consume it
- fixture group that currently mocks it
- auth, permission, cache, persistence, or offline constraints when known
- receiving implementation owner for real data wiring

## Data Invariants

Document invariants that UI and tests rely on, such as:

- stable ids for route keys
- required fields for each card or row
- direction or status values controlling visual state
- branch fixture values that trigger success and error flows
- fixture fields that must remain stable across web and app frontend implementations
