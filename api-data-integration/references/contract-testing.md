# Contract Testing

Use this reference to verify the real transport contract and its mapping to the assembled UI model separately.

Mocks make UI expectations executable. They do not define backend response shapes. Data Authority must identify confirmed transport evidence before DTO or real wiring tests can claim contract conformance; proposed/open/legacy shapes remain UI/mock evidence only.

## Scope And Framework

Write contract tests with the target repo's existing test framework and its existing HTTP-stubbing or fixture-loading tools. Do not introduce a new test framework, assertion library, or mocking system for this purpose; a second framework in the repo is a maintenance cost this work has no mandate to add.

Tests belong wherever the repo keeps integration or service-layer tests. Each fixture group gets its own test group, named after the group so the handoff, schema, fixture, and test are traceable by one identifier.

## What Every Fixture Group Needs

### 1. Schema validation

Validate the real response against the confirmed transport contract identified by Data Authority, using a DATA_SPEC transport JSON Schema block only when its complete source evidence confirms that scope. A confirmed UI-model schema is not eligible.

The confirmed source may be an independent `contracts[]` entry. A proposed `ui-model` fixture linked to confirmed `alerts-api` does not prevent transport or mapper tests: use `alerts-api.source` for the DTO test and the UI model for mapper assertions, leaving the fixture's status and scope unchanged.

| Platform | How validation happens |
| --- | --- |
| Web | The repo's existing schema validator against the parsed transport response |
| iOS | Decode into confirmed transport `Codable` DTOs, plus assertions for source constraints not enforced by decoding |
| Android | Decode into confirmed transport serialization DTOs under the repo's policy, plus assertions for source constraints not enforced by decoding |

The test must fail on a missing required transport field and type mismatch according to the real contract. Optionality, defaults, additional fields, and other constraints follow that contract rather than a blanket strict-decoding rule or the fixture field set. A test that only checks the request was made does not validate the contract.

Where the real service can be called in CI, validate a recorded real response; where it cannot, validate the response fixture captured from the real service during implementation, and record in the test which environment and date it came from.

### 2. Error taxonomy mapping

For each class in the contract's error taxonomy, assert that the DataSource surfaces the documented UI state:

- retryable classes (timeout, 5xx, offline) surface the documented retry state, not a terminal error
- non-retryable classes (validation failures, 4xx) surface the documented terminal error state
- reauthentication classes surface the documented auth-required state and trigger the app's existing refresh/sign-in path

Trigger each class by stubbing the transport or by the repo's existing failure-injection mechanism. A class the tests never exercise is a class production will discover.

### 3. Semantics behavior assertions

Write at least one behavior assertion per recorded `Semantics` entry:

- `pagination`: a second page is requested with the documented cursor or offset parameter, and the response's page marker is honored — including the terminal page
- `sort` / `filter`: a documented sort or filter parameter reaches the request
- `freshness`: `poll` asserts the documented interval drives a refetch; `push` asserts the transport's message updates state; `static` asserts no background refetch happens
- `mutation`: the documented verb is used; an idempotent mutation asserts that a repeat is safe; when optimistic updates are allowed, assert the rollback path on failure
- `errors`: covered by the taxonomy assertions above

A `Semantics` entry that was `unknown` at handoff and got confirmed during wiring gets its assertion here, and its confirmed value written back to the handoff.

### 4. DTO-To-UI Mapping And Mock Reference

Test the mapper from the confirmed transport DTO to the UI model returned by the DataSource. For a response with `data.items` and `nextCursor` while the UI model has `state` and `rows`, transport validation checks the source schema; mapper assertions check item-to-row mapping and confirmed pagination behavior. Do not require raw backend `state`/`rows`, or raw field-set/type equality with the fake fixture.

Use `fixtures/<group>.json` to exercise the documented UI/mock states and deterministic presentation expectations. Retain its original bytes for provenance and UI parity; it is not a transport golden reference. A fake fixture may follow a confirmed transport schema while its values remain fake. Additional backend fields are permitted or rejected by the real schema; their absence in a UI fixture does not itself trigger a contract change.

If a confirmed service cannot provide a business value or semantic behavior the UI needs, record the affected decision with its owner and stop that mapper/seam; continue independent confirmed work. Do not invent a fallback value or rewrite the fixture to conceal the missing requirement.

## Failure Handling

A failing contract test means one of three things. Resolve it, never silence it:

1. **The implementation is wrong** — fix the client, decoding, or error mapping.
2. **The confirmed transport contract is wrong** — the service differs from its actual source contract. Resolve the affected decision with its owner, update Data Authority and affected Data/Handoff/Flow/Acceptance/fixtures/metadata/tests, mark superseded clauses inactive, and re-review before consuming a republished snapshot. A DTO/UI shape difference alone belongs in the mapper and does not prove either contract wrong.
3. **The UI's expectation is wrong** — surface it as a product decision. This skill does not change the UI; it reports the finding to the assembly-pass owner.

Weakening an assertion to make a test pass converts a caught contract break into an uncaught one.

## Reporting

Report per seam: confirmed transport source, schema validation and mapper results, UI/mock expectations covered, error classes, semantics assertions, and deferred assertions with their reason/owner. These results settle only the integration acceptance they actually verify. A Fake-only fixture or passing mock-mode test cannot settle an `AC-P (integration)` real-source criterion.
