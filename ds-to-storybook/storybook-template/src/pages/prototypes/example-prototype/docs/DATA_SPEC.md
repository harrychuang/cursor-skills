# Data Spec

## Fixture Inventory

`examplePrototypeRequest` is the deterministic request fixture. It includes request id, name, owner, target date, status, summary, requirements, and risks.

## API Replacement Points

- `GET /api/project-requests/:id` can replace request fixture loading.
- `POST /api/project-requests/:id/approval` can replace the local approval branch.

## Route Data Requirements

- `intake` requires request identity, owner, summary, and requirements.
- `review` requires requirements, risks, target date, and review notes.
- `handoff` requires approved scope, owner, next steps, and target date.

## Invariants

- The prototype never calls real APIs.
- The approval branch remains deterministic for Storybook review.
- The decision node exists in flow metadata, not as a route fixture.
