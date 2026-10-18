---
name: design-automation-hub
description: Install, inspect, update, and validate the reusable Design Automation Hub Figma Plugin, portable local Coordinator, project binding, generic agent-automation dependency, and figma-design-automation companion skill in an explicit target repository without overwriting unrelated project configuration.
---

# Design Automation Hub Install

Install the versioned Design Automation Hub distribution from this skill into one explicit project root.

## Safety boundary

- Treat the target repository as user-owned. Read its applicable `AGENTS.md`, `CLAUDE.md`, and Cursor rules first.
- Require an absolute project root and an explicit host mode.
- Never target `/`, the current user's home directory, a missing directory, or a path reached through a symlink escape.
- Never infer the project id, project name, or Figma file keys from a folder, Git remote, package, Figma file name, or node name.
- Never download or vendor `agent-automation`. Resolve it from the same complete `cm-skills` checkout or an explicit `--skills-source-root`.
- Use dry-run before a first install or any update. Do not automate Figma Desktop.

## Inspect or preview

Run a zero-write preview:

```bash
node design-automation-hub/scripts/install-design-automation-hub.mjs \
  --project-root <absolute-project-root> \
  --host-mode standalone \
  --dry-run \
  --json
```

If the result is `needs-bootstrap`, load `agent-automation` and use its bootstrap or designer-facing guide mode to create a valid `.agent-automation/config.json`. Do not invent runner commands or credentials.

If the result is `needs-profile`, ask in plain language for:

1. a stable project id;
2. a display name;
3. one or more Figma file keys.

Do not request tokens or access codes.

## First install from a complete checkout

Use one complete `cm-skills` checkout containing both
`design-automation-hub/` and `agent-automation/`. From that
checkout:

1. Resolve the absolute target repository and read its instructions.
2. Run the zero-write preview with explicit project identity and
   `--skills-source-root <absolute-cm-skills-root>`.

   ```bash
   node design-automation-hub/scripts/install-design-automation-hub.mjs \
     --project-root <absolute-project-root> \
     --skills-source-root <absolute-cm-skills-root> \
     --host-mode standalone \
     --project-id <stable-id> \
     --project-name <display-name> \
     --figma-file-key <figma-file-key> \
     --dry-run \
     --json
   ```

3. If the real install reports `needs-agent-automation-bootstrap`, inspect the
   target with:

   ```bash
   node agent-automation/scripts/inspect-project.mjs \
     --project-root <absolute-project-root>
   ```

   Then load `agent-automation` in bootstrap or guide mode. Derive
   `.agent-automation/config.json` from repository evidence; do not invent
   runner commands, credentials, or verification commands. Validate it:

   ```bash
   node agent-automation/scripts/validate-project-config.mjs \
     --project-root <absolute-project-root>
   ```

4. Repeat the dry-run after bootstrap, then run the real install.
5. Run the installed-project check before starting the Coordinator.

Dry-run may include `bootstrap-agent-automation` in `nextActions` while still
returning a complete `planned` result. A real install against the same missing
config returns `needs-bootstrap` and writes nothing.

## Install

For a standalone project:

```bash
node design-automation-hub/scripts/install-design-automation-hub.mjs \
  --project-root <absolute-project-root> \
  --host-mode standalone \
  --project-id <stable-id> \
  --project-name <display-name> \
  --figma-file-key <file-key> \
  --json
```

Repeat `--figma-file-key` for additional files. A project-relative profile can be supplied with `--project-profile` instead of the three explicit identity options.

For a compatible existing host, also provide a project-relative adapter:

```bash
node design-automation-hub/scripts/install-design-automation-hub.mjs \
  --project-root <absolute-project-root> \
  --host-mode compatible \
  --host-adapter <project-relative-module> \
  --project-profile <project-relative-json> \
  --json
```

The adapter must export `designAutomationHubHostAdapter` with contract version `1`, `resolveProject`, and `resolveMember`. Review is enabled only when all three review methods exist and the no-write preflight succeeds.

Compatible-host acceptance uses this matrix:

| Review adapter | Expected result |
| --- | --- |
| All three review methods | install/check succeeds and `features.review` is `true` |
| No `review` object | install/check succeeds and `features.review` is `false` |
| Partial review method group | non-zero `incomplete-review-adapter`, with zero target writes |
| Any filesystem write attempt during smoke | non-zero `host-adapter-smoke-wrote-files`, with zero target writes |

Compatible preflight runs the adapter in a child process with the Node
permission model and no filesystem write grant. If that sandbox is unavailable,
preflight fails closed with `host-adapter-sandbox-unavailable`.

## Update

Preview first, then use `--update`. Locally modified managed files are conflicts by default:

```bash
node design-automation-hub/scripts/install-design-automation-hub.mjs \
  --project-root <absolute-project-root> \
  --host-mode standalone \
  --update \
  --dry-run \
  --json
```

Use `--force-managed` only when the user explicitly authorizes replacing installer-managed files. It never overwrites unknown project config or a conflicting `figma-cleanup` task.

## Check

Validate the distribution template:

```bash
node design-automation-hub/scripts/check-design-automation-hub.mjs --template --json
```

Validate an installed project:

```bash
node design-automation-hub/scripts/check-design-automation-hub.mjs \
  --project-root <absolute-project-root> \
  --json
```

Maintainers may compare the declared portable inventory with a product evidence checkout:

```bash
node design-automation-hub/scripts/check-design-automation-hub.mjs \
  --source-root <absolute-product-root> \
  --json
```

Normal installation must not require the product checkout.

## Start and verify the standalone Coordinator

From the installed target root, provide at least one local member through
`DESIGN_AUTOMATION_MEMBERS_JSON`, then start the server:

```bash
DESIGN_AUTOMATION_MEMBERS_JSON='[{"accessCode":"<local-access-code>","id":"<member-id>","displayName":"<display-name>","roles":["designer"]}]' \
  node scripts/design-automation-hub/standalone.mjs
```

The Coordinator listens on `127.0.0.1:8787` by default. When that port is
already taken the process exits with `EADDRINUSE` before serving anything; set
`PORT` to a free port and use that same port in every verification command
below. Do not stop an unrelated service to free the default port.

A `PORT` override verifies the Coordinator over HTTP only. The Plugin endpoint
is fixed: `networkAccess.devAllowedDomains` and the Plugin sources both pin
`http://localhost:8787`. Figma Desktop acceptance therefore requires the default
port, so free `8787` with its owner's consent before that step instead of
overriding it. An overridden port produces a Plugin that cannot reach the
Coordinator, which is a port mismatch and not an acceptance failure.

Keep the access code out of tracked files, durable reports, screenshots, and
shell transcripts. In another terminal, verify the public health endpoint:

```bash
curl -fsS http://127.0.0.1:8787/healthz
```

The response must contain `status: "ok"`, `schemaVersion: 1`, and
`extractionQueue: false`. Standalone authenticated Plugin context must expose
cleanup and workflow status while keeping review disabled.

With disposable acceptance values that are not copied into logs or tracked
files, verify the bound context:

```bash
curl -fsS \
  -H 'Authorization: Bearer <local-access-code>' \
  'http://127.0.0.1:8787/v1/plugin/context?fileKey=<figma-file-key>'
```

The response must name the explicit project profile and return
`cleanup: true`, `workflowStatus: true`, and `review: false`.

## Task-board dispatch stays silent unless requested

Task-board dispatch is a per-project, opt-in binding documented in
`references/task-board-dispatch.md`. With no binding present the Coordinator
behaves exactly as documented above: creating a task schedules local analysis
immediately.

Do not mention, offer, configure, or explain the task board unless the user
explicitly asks for it. Install, update, and check reports — and any suggested
next steps — must not include the task board; a project with no binding is
reported without any board mention.

## Completion

Filesystem installation is complete only when:

- the installer result is `installed`, `updated`, or an idempotent success;
- installed-project validation passes;
- the project automation config remains valid;
- the generic and companion skill mirrors match their canonical sources;
- the absolute Plugin manifest exists;
- the local Coordinator health check succeeds.

Figma Desktop import remains a separate manual step:

**Figma Desktop → Plugins → Development → Import plugin from manifest**

Report the absolute manifest path and keep `import-figma-manifest` incomplete until the user confirms it. Do not claim filesystem installation means the Plugin is imported, and keep commit and push status separate.

Import once per manifest identity. A second project profile using the same
`Design Automation Hub` manifest reuses that Plugin identity; do not import a
second project-named copy.

## Release acceptance

Before marking template `1.0.0` distributable:

1. Complete
   `test/fixtures/manual-two-project-acceptance.json` in Figma Desktop with two
   real project profiles and real Figma file keys. Do not record the file keys
   themselves.
2. Confirm the same Plugin identity connects to both profiles, fixed copy
   contains neither project name, standalone cleanup/workflow status are
   visible, and review is hidden. The fixed Plugin endpoint is local port
   `8787`, so test the two standalone Coordinators sequentially: stop project A
   before starting project B on the same port.
3. Bump the template and acceptance evidence to `1.0.0`, rebuild the manifest,
   then run every command below against the final bytes:

   ```bash
   node design-automation-hub/scripts/build-template-manifest.mjs
   node agent-automation/scripts/check-agent-automation-skill.mjs
   node design-automation-hub/scripts/check-design-automation-hub.mjs --template --json
   node design-automation-hub/template/skills/figma-design-automation/scripts/check-figma-design-automation.mjs
   git diff --check
   spectra analyze add-design-automation-hub-installer --json
   spectra validate add-design-automation-hub-installer
   ```

Keep the Spectra task unchecked and the template below `1.0.0` until the manual
acceptance record, manifest rebuild, and all six checks pass.
