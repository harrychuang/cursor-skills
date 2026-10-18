# Data Wiring Workflow

Use this reference to replace mock adapters with real data sources, one seam at a time.

## Contents

1. Seam Inventory
2. Contract Confirmation
3. Real Implementation
4. Injection Swap
5. Records And Completion

## 1. Seam Inventory

Build the work list before writing any client code. For each fixture group, record:

- fixture group name (the key that ties handoff docs, fixtures, and schema together)
- the UI model and its path, independent of the transport DTO
- the `<Feature>DataSource` interface name and its file path
- the `Mock<Feature>DataSource` implementation path
- the injection point: where the app decides which implementation the feature receives (a provider, container, DI module, factory, environment value, or constructor call site)
- the routes or screens that consume the group
- the contract row in `PRODUCTION_HANDOFF.md` that describes its expected source
- Data Authority group/contract id, schema scope/status, complete source evidence when confirmed, and integration status/owner

The shared Data Adapter Seams columns are `Fixture group`, `UI model`, `Interface`, `Mock implementation`, `Injection site`, `Schema authority/source`, `Integration status/owner`. Use `—` for a seam without a fixture group. When the map is missing, reconstruct the inventory from repo interfaces, mocks, and injection sites and record the absence; code reconstruction does not establish transport authority.

At ingestion, record the consumed `docsDigest`, `artifactsDigest` when present, and changelog version. Verify reachable source artifacts with `validate_prototype.py <prototype-folder> --verify-manifest` and compare both digests against the assembly's consumed snapshot. Missing/legacy manifests and unreachable checks remain explicit integrity limitations, never evidence that a contract is confirmed.

A seam with no matching contract row, or a contract row with no matching seam, is a discrepancy: report it before implementing anything for that group.

## 2. Contract Confirmation

For each seam, first read Data Authority and verify a confirmed transport source. A confirmed UI-model schema, a real-looking sample, demo review, or a proposed API table cannot supply that authority. The source object must name `reference`, `revision`, `confirmedBy`, and `confirmedOn`; a contract used as transport evidence must be active and confirmed. Reuse clear existing evidence and session authorization; ask the named owner only for unresolved decisions.

Transport evidence can be an independently confirmed contract source. For a fixture with `schemaScope: ui-model`, `status: proposed`, and `contractId: alerts-api`, a confirmed `contracts[]` entry for `alerts-api` whose source defines the real schema authorizes DTO generation and wiring against that source. Preserve the proposed UI fixture and map the DTO into its UI model; neither fixture confirmation nor a scope change to transport is required. When the selected evidence is instead the fixture's own transport schema, that fixture schema must be confirmed.

Confirm these fields for the selected real contract:

- **Endpoint and method**: the exact service, path, and verb, or the non-HTTP source (local store, platform service, feature-flag provider, static content).
- **Auth and permission**: the scheme, where the token comes from, how it refreshes, and what an unauthorized response looks like.
- **Semantics**, the five entries the handoff's `Semantics` column records:
  - `pagination`: cursor, offset, or none — and the parameter and response fields that carry it
  - `sort` / `filter`: which fields the caller may pass
  - `freshness`: static, poll (with interval), or push (with transport)
  - `mutation`: create/update/delete, whether it is idempotent, whether optimistic updates are allowed
  - `errors`: which classes are retryable, which are terminal, which require reauthentication
- **Environment**: which environments exist, how base URLs and credentials are supplied, and which environment this work targets.

Every unresolved item blocks the real wiring that depends on it — name the decision and continue independent confirmed work. Source-backed response DTOs and mapper design can be prepared before unrelated endpoint/auth decisions are resolved; that does not make the seam ready or integrated. Never invent an endpoint, guess an auth scheme, ship a placeholder base URL, or assume a missing `Semantics` entry means "none".

Remote Config prose can define the region, intended behavior, demonstrated states, open details, and RD owner. Do not derive provider, key, production default, polling/cache, permissions, or rollout details from its mock states. A proposed analytics `reason` is likewise not a confirmed event parameter.

Different transport and UI shapes ordinarily require a mapper. When confirmed answers contradict an actual transport contract or expose missing UI business semantics, record the affected decision and owner. Synchronize affected Data/Handoff/Flow/Acceptance/fixtures/metadata/tests, mark replaced clauses superseded, and re-review the changed scope before publishing a new snapshot; do not manufacture confirmation by updating hashes.

## 3. Real Implementation

Implement the real `<Feature>DataSource` following the target repo's established conventions — this skill adds data plumbing, it does not introduce an architecture:

| Target | Follow |
| --- | --- |
| Web | The repo's existing fetch/query/client layer, its error and retry helpers, and its environment-config mechanism |
| iOS | `URLSession`-based clients (or the app's existing networking layer), Swift concurrency conventions, `Codable` decoding, Keychain for credentials |
| Android | The module's existing Retrofit/Ktor-style client, coroutine conventions, `kotlinx.serialization` decoding, and its credential storage |

Rules:

- Generate or reuse wire request/response/error DTOs from the confirmed transport source identified by Data Authority. Use DATA_SPEC transport schema blocks only when their evidence has that authority; UI-model schemas and fixture decoding types do not.
- Map the DTO into the assembled UI model behind the DataSource seam. For `{ data: { items: [...] }, nextCursor: ... }` and UI `{ state, rows }`, map items to rows and the confirmed page marker to the UI's paging behavior. Do not require the raw response to contain fixture-only fields. Preserve UI-facing behavior; missing semantics or a provisional signature that cannot express the confirmed behavior needs an owner decision before changing call sites.
- Map transport and domain failures onto the documented error taxonomy so the UI's existing error states keep working — the UI does not change to accommodate a new error shape.
- Implement pagination, sorting, filtering, and freshness exactly as confirmed; a poll interval or cursor parameter invented here becomes a silent product decision.
- Put credentials and base URLs in the repo's existing environment mechanism. Never commit a secret, and never widen a credential's scope for convenience.
- Respect confirmed cache/persistence decisions and already authorized repo conventions. Record the convention's evidence and scope; silence alone does not authorize a new cache, storage, Remote Config refresh policy, or production default.
- Keep changes within data clients, mappers, and the recorded dependency registration. If that registration lives in a UI entry file, change only the injected binding; do not change rendering, UI behavior, routes, navigation, components, or tokens. Prefer an existing separate factory/container. A missing seam or a required behavioral change returns to the assembly owner rather than expanding the wiring scope.

## 4. Injection Swap

Switch the feature from mock to real at the injection point recorded in the inventory:

1. Register the real implementation where the app resolves the DataSource for this feature.
2. Keep `Mock<Feature>DataSource` in the codebase — tests, previews, screenshot tests, and offline development still depend on it. Deleting the mock destroys the seam the next change needs.
3. Keep the swap explicit and reversible: a single registration or configuration point, not real-client code inlined into the feature.
4. Verify the swap by running the feature's existing tests and a manual pass of the primary journey against the real source.

## 5. Records And Completion

Record the outcome where the assembly pass left its record:

- Add the real implementation path alongside the mock in `IMPLEMENTATION_MAP.md`'s Data Adapter Seams table.
- Preserve the shared seven columns, optionally adding `Real implementation` and `Mapper`; update `Schema authority/source` with confirmed evidence and `Integration status/owner` to `integrated` only after wiring and verification. Keep unresolved seams `open` with owners; `ready` means evidence is confirmed but real wiring is unfinished.
- Settle every `AC-P (integration)` acceptance criterion in the Acceptance Traceability table with `pass`, or with a reason and named owner when it remains blocked.
- Record confirmed `Semantics` answers that the handoff had left unknown, writing them back to the handoff's contract row.
- List remaining open items — unresolved semantics, endpoints owned by another team, capabilities deferred to a later release — each with a named owner.
- Before completion, re-run reachable artifact verification and compare the current docs/artifact digests to those consumed. Report changed/additional/missing files and affected seams or tests; do not finish affected work silently against a stale snapshot. Report inaccessible/legacy integrity separately from semantic review.
- Record this skill only when actually used through project-scoped `--record-usage` with explicit names; verify the content hash, repo-relative paths, and preserved managed instruction blocks per cm-skills `docs/skills-usage.md`.

The full integration is complete when every required in-scope seam has confirmed transport evidence, its real implementation and any mapper, a swapped injection point, passing contract tests, and settled `AC-P (integration)` criteria, with no UI/route/component/token behavior changed. Report useful partial results and named open seams honestly when that bar is not yet met.
