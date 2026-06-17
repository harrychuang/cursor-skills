# Data Spec

## Source Of Truth

Prototype fixtures live in `__FEATURE_CAMEL__Data.ts`.

## Fixture Inventory

- `__FEATURE_CAMEL__Routes`: [Route fixtures or content blocks.]

## Route Data Requirements

- `__ENTRY_ROUTE_ID__`: [Required fixture groups.]

## Data Schemas

### PrototypeRouteContent

- `id`: stable id used for keys and route mapping.
- `title`: display title.
- `description`: route-specific review copy or content.

## API Replacement Points

- [Future API or service name]: [Request, response, route usage, fixture replacement.]

## State And Branch Fixtures

- [Success, error, empty, loading, disabled, or async branch fixtures.]

## AI Update Rules

- Add fixture data before wiring a route.
- Keep fixtures deterministic.
- Document any future API replacement in this file and in `__FEATURE_CAMEL__Meta.ts`.
