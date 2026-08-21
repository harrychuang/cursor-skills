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

- [Future API or service name]: [Expected request, response, error, route usage, fixture replacement, and owner.]

## Receiving Data Ownership

- Service owner: [Team, package, or system.]
- Auth and permission: [Requirement or unknown.]
- Cache and persistence: [Client cache, storage, offline behavior, or none.]
- Web/app parity: [Fields or states that must remain consistent across platforms.]
- Receiving implementation responsibility: real data source, API client, auth/session, storage, persistence, cache policy, and environment configuration.

## State And Branch Fixtures

- [Success, error, empty, loading, disabled, or async branch fixtures.]

## AI Update Rules

- Add fixture data before wiring a route.
- Keep fixtures deterministic.
- Document any future API replacement in this file and in `__FEATURE_CAMEL__Meta.ts`.
- Mirror API/data contract expectations in `PRODUCTION_HANDOFF.md`.
- Do not wire real data sources in the prototype.
