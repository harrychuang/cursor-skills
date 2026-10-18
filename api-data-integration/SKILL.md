---
name: api-data-integration
description: "Replace mock adapters with real API clients, auth/session, cache, storage, persistence, and environment configuration behind assembled DataSource seams. Use when a mock-mode feature needs real wiring, a handoff names a data-integration owner, or confirmed transport contracts and DTO-to-UI mapping need contract tests. Continue after frontend-product-implementation or native-app-implementation. Use Data Authority evidence, never treat fake fixtures as backend schemas, and keep unknown contracts open for the affected seam. Own data wiring only; do not change UI behavior, routes, components, or tokens."
---

# Production Data Integration

Use this skill to turn a mock-mode feature into a real one. The assembly pass before you (`frontend-product-implementation` for web, `native-app-implementation` for iOS/Android) delivered typed `<Feature>DataSource` interfaces with `Mock<Feature>DataSource` implementations backed by the handoff fixtures, and recorded each replacement point. This skill implements the real side of those seams and proves it with contract tests. Pipeline position and gates: `storybook-product-prototype/references/pipeline-stations.md` (station 5).

Integration ownership is three-stage: prototype (`storybook-product-prototype`) → frontend assembly (`frontend-product-implementation` / `native-app-implementation`) → data integration (this skill). You are the named stage-3 receiver.

## Authority And Delivery Rules

- Read `DATA_SPEC.md` Data Authority before generating DTOs or wiring a source. Fake values and UI-model schemas are UI/mock references, including confirmed UI models. Only confirmed transport evidence with source `reference`, `revision`, `confirmedBy`, and `confirmedOn` authorizes a real DTO/contract. An independent confirmed `contracts[].source` can supply it while the linked UI fixture stays proposed; do not promote the fixture to transport. Proposed, open, superseded, missing, or malformed authority never becomes a production API, analytics parameter, or Remote Config key; demo confirmation and passing hashes do not upgrade it.
- Map the confirmed transport DTO to the assembled UI model. Different envelopes, fields, or additional fields do not require raw response equality with fake fixtures. Escalate missing business semantics to the affected owner; continue independent confirmed seams.
- Remote Config prose may identify a controlled region, demonstrated states, unresolved decisions, and RD owner. Real key/provider/default/cache/permission/rollout details stay open until confirmed. An undocumented analytics `reason` suggested by Builder stays proposed.
- Read [the shared handoff authority reference](../storybook-product-prototype/references/handoff-authority.md); if unavailable, retain these local rules and report the missing detail without upgrading authority. Check source integrity and the consumed docs/artifact digests at ingestion and before completion when reachable; preserve missing/legacy evidence as a limitation.
- When this skill actually runs, deliver it with the cm-skills project installer, explicit used-skill names, and `--record-usage`. A previous stage merely naming this skill is not usage. Verify `docs/SKILL_USAGE.json`, content hashes, and repo-relative links in managed `CLAUDE.md`/`AGENTS.md` blocks, preserving other bytes. Follow cm-skills `docs/skills-usage.md`; do not use `all`, install globally, or claim automatic publication.

## Inputs

Four artifacts define the work. Locate all four before writing code:

| Input | What it gives you |
| --- | --- |
| `PRODUCTION_HANDOFF.md` → API And Data Contracts | Per group: documented source/endpoint and semantics, their decision status, adapter interface, and owning team; a proposed row is not a confirmed contract |
| `IMPLEMENTATION_MAP.md` → Data Adapter Seams | UI model, interface, mock path, injection site, schema authority/source, and integration status/owner for each in-scope group |
| `fixtures/*.json` | Deterministic UI/mock examples and parity reference, never a required raw backend shape |
| `DATA_SPEC.md` → Data Authority and Data Schemas | Classification plus source evidence distinguishing UI schema from confirmed transport contract; follow the referenced real contract for DTOs |

When the map is missing, reconstruct the seam inventory from repo interfaces and record that it was absent; reconstructed code is not evidence of contract confirmation. When a schema, authority record, endpoint, or contract row is unresolved, retain the affected seam `open` for its named owner and continue independent confirmed seams. Do not infer a transport shape from a mock.

## Reference Loading

- Seam inventory, endpoint confirmation, real implementation, and injection swap: `references/data-wiring-workflow.md`
- Contract tests, schema validation, and error taxonomy assertions: `references/contract-testing.md`

## Boundary

This skill owns: real API clients, auth and session integration, cache policy, storage, persistence, environment configuration, and the tests that prove them.

This skill does not own, and must not change:

- UI behavior, layout, or component structure
- route flow, transitions, or navigation semantics
- design tokens, theme values, or shared components
- the acceptance criteria themselves

When a confirmed transport DTO differs from a prototype UI model, implement a mapper behind the DataSource seam. For example, `data.items` and `nextCursor` can map to UI `rows` and paging state; the service need not emit a fake `state` field. If the real source contradicts its confirmed transport contract or lacks business semantics the UI requires, report the affected decision to its owner. Update affected Data/Handoff/Flow/Acceptance/fixtures/metadata/tests, mark superseded clauses inactive, and obtain scoped re-review before a new snapshot when the contract changes. Do not reshape UI behavior or silently change a provisional seam signature.

When an endpoint, auth mechanism, or semantics entry is unknown, pause that seam for the named owner and continue independent confirmed work. Do not invent endpoints, guess auth schemes, or ship a placeholder base URL.

## First Actions

1. Locate the four inputs above and the target repo root; record which are present.
2. Inventory every seam, its UI model, mock, injection site, Data Authority/source, and integration status/owner; record both manifest digests/version and verify reachable integrity at ingestion.
3. For each contract row, verify confirmed transport evidence, endpoint/method, auth/permissions, and semantics (pagination, sort/filter, freshness, mutation, errors). Reuse clear existing source evidence and authorization; ask the named owner only for unresolved decisions, which block that seam.
4. Discover the repo's existing client, auth, cache, DI, environment-config, and test conventions — the real implementation follows them, not a new pattern introduced by this skill.
5. Implement, swap, and test per `references/data-wiring-workflow.md` and `references/contract-testing.md`, one seam at a time.

## Completion Criteria

Do not consider the work complete until:

- Every in-scope seam claimed complete has a confirmed source, real implementation, DTO-to-UI mapper where needed, and an injection point swapped from mock. Open/deferred seams remain explicitly incomplete with their owners; do not describe the whole integration as finished while required seams remain open.
- Every mock implementation is retained for tests and previews, not deleted.
- Contract tests pass per completed seam: confirmed transport schema validation, DTO-to-UI mapping, error taxonomy, and behavior assertions for recorded semantics. Raw response fields are not compared to fake fixture fields.
- Every `AC-P (integration)` acceptance criterion is settled, with its result recorded in the Acceptance Traceability table.
- `IMPLEMENTATION_MAP.md`'s Data Adapter Seams table carries the real implementation path alongside the mock.
- No UI, route, component, or token change was made; any contract divergence is reported and written back to the handoff docs.
- Environment configuration and secrets follow the repo's existing mechanism, with no credential committed to the repo.
- Remaining open items — unresolved semantics, endpoints still owned by another team, deferred capabilities — are listed with their named owners.
- Both consumed digests and source integrity are checked again before completion; review and synchronization deltas are recorded separately from hash results, along with actual repo skill delivery.
