# Project contract

Use `.agent-automation/config.json` as the repository-owned boundary between reusable orchestration and project-specific engineering behavior.

## Contract shape

```json
{
  "schemaVersion": 1,
  "stateDir": ".agent-automation/runs",
  "runners": [],
  "tasks": {}
}
```

### `schemaVersion`

Set exactly `1`. Reject unknown versions instead of guessing a migration.

### `stateDir`

Use a project-relative directory. The resolved path must remain inside the project root. Keep runtime summaries reconstructable and normally Git-ignored.

### `runners`

Provide one to three ordered runner objects. Array order is fallback priority. Read `runner-contract.md` for the runner shape and safety rules.

### `tasks`

Use stable task IDs as object keys. Each task contains:

| Field | Required | Contract |
| --- | --- | --- |
| `instruction` | yes | Non-empty project-specific agent instruction. |
| `skill` | no | Kebab-case companion skill name installed for the selected runner. |
| `verification` | yes | Array of shell-free command objects; an empty array is explicit. |
| `requiredArtifacts` | yes | Array of project-relative files or directories that must exist after execution. |

A verification command has this shape:

```json
{
  "command": "git",
  "args": ["diff", "--check"],
  "timeoutMs": 120000
}
```

Use command and argv arrays. Do not encode pipes, redirects, substitutions, `&&`, or other shell behavior. If a workflow needs a compound deterministic check, create a repository script and invoke that script directly.

## Layering project differences

Keep these concerns in the project contract or companion skill:

- exact app or package root;
- framework-native implementation rules;
- design-system, Figma, Storybook, native, backend, or data workflows;
- repository tests, builds, audits, and artifact paths;
- approval gates and completion proof beyond file existence.

Keep these concerns in the shared orchestrator:

- config validation;
- ordered runner selection and fallback;
- preflight, timeout, and process settlement;
- sanitized summaries and status lookup;
- verification and artifact existence checks.

## Bootstrap checklist

1. Inspect the exact target root.
2. Read repository instructions and available project skills.
3. Select only commands proven by manifests, scripts, or user direction.
4. Add the smallest task contract that can be verified.
5. Validate the contract.
6. Dry-run the task.
7. Start a paid runner only when the user authorizes execution.

## Security rules

- Store environment variable names in `inheritEnv`, never their values.
- Reject fields whose names imply embedded tokens, keys, secrets, passwords, or credentials.
- Keep state and artifact paths inside the project root.
- Do not treat successful agent exit as proof that project verification passed.
- Do not persist prompts, expanded argv, raw output, or environment values in durable summaries.
