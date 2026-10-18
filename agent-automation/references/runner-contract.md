# Runner contract

Represent each headless agent as a shell-free process profile. A profile can call a native CLI or a project-owned SDK wrapper; the orchestrator does not require every provider to expose the same SDK.

## Shape

```json
{
  "id": "codex",
  "label": "Codex",
  "command": "codex",
  "args": ["exec", "-C", "{workspace}", "{prompt}"],
  "timeoutMs": 1800000,
  "preflight": {
    "command": "codex",
    "args": ["login", "status"],
    "timeoutMs": 30000
  },
  "inheritEnv": []
}
```

The block above illustrates the field shape only. Copy a tested configuration from "Verified runner recipes" below rather than this example.

## Required behavior

- Keep `id` stable, unique, and kebab-case.
- Use `label` only for human display; use `id` for durable attribution.
- Use a non-empty executable in `command` and string arrays in `args`.
- Include exactly one `{prompt}` and exactly one `{workspace}` placeholder across `args`.
- Use a positive `timeoutMs`.
- Keep `preflight` side-effect free. It must verify executable and authentication readiness without starting paid inference.
- Choose a `preflight` that exits non-zero when the tool is installed but not authenticated. A preflight that exits zero while unauthenticated can never mark its runner `unavailable`; the runner instead passes preflight, consumes a fallback position, and fails at the agent step.
- List only required environment variable names in `inheritEnv`.

The launcher always sets the child working directory to the resolved project root and replaces placeholders as literal argv values with `shell: false`. It gives every child a standard input that is already at end of input, so a CLI that reads stdin settles instead of blocking; standard output and standard error still reach the terminal. Children run as process-group leaders, so a timeout terminates the runner and anything it started. An interrupt sent to the launcher is forwarded to that group.

## Verified runner recipes

Each recipe below satisfies the placeholder rule with exactly one `{prompt}` and one `{workspace}`. The evidence column states how the preflight claim was established; an unconfirmed row still needs checking against an unauthenticated account.

### codex

```json
{
  "id": "codex",
  "label": "Codex",
  "command": "codex",
  "args": ["exec", "--skip-git-repo-check", "-C", "{workspace}", "{prompt}"],
  "timeoutMs": 1800000,
  "preflight": { "command": "codex", "args": ["login", "status"], "timeoutMs": 30000 },
  "inheritEnv": []
}
```

`--skip-git-repo-check` is required when the project root is not a Git repository; without it the command refuses to run.

`codex exec` documents that instructions are read from standard input when no prompt argument is given, and that piped standard input is appended to the prompt as a `<stdin>` block. An inherited, still-open stdin pipe therefore leaves it waiting for input that never ends. The launcher's end-of-input stdin removes that failure mode; do not reintroduce it by giving the child an open pipe.

### claude

```json
{
  "id": "claude",
  "label": "Claude Code",
  "command": "claude",
  "args": ["--add-dir", "{workspace}", "-p", "{prompt}"],
  "timeoutMs": 1800000,
  "preflight": { "command": "claude", "args": ["auth", "status"], "timeoutMs": 30000 },
  "inheritEnv": []
}
```

**Argument order is significant.** `--add-dir` is declared as `--add-dir <directories...>` and is variadic, so it consumes the arguments that follow it. Placing `{prompt}` after `{workspace}` without an intervening flag lets `--add-dir` swallow the prompt. The placeholder count is identical in a correct and an incorrect ordering, so the configuration validator cannot detect this mistake — the ordering must be preserved by hand.

### cursor-agent

```json
{
  "id": "cursor-agent",
  "label": "Cursor Agent",
  "command": "cursor-agent",
  "args": ["--workspace", "{workspace}", "-p", "{prompt}"],
  "timeoutMs": 1800000,
  "preflight": { "command": "cursor-agent", "args": ["models"], "timeoutMs": 30000 },
  "inheritEnv": []
}
```

**Do not use `cursor-agent status` as the preflight.** When unauthenticated it prints `Not logged in` and still exits 0, which makes the runner permanently un-markable as `unavailable`. Use `cursor-agent models`, which exits 1 with `Authentication required` in the same state.

Unlike claude, this tool's `--add-dir` takes a single `<path>` and is not variadic. Its prompt is a variadic positional, so keep `{prompt}` last.

### Preflight evidence

| Command | Unauthenticated exit code | Valid preflight | Evidence |
| --- | --- | --- | --- |
| `cursor-agent status` | 0, prints `Not logged in` | no | directly observed |
| `cursor-agent models` | 1, prints `Authentication required` | yes | directly observed |
| `codex login status` | expected non-zero | yes | unconfirmed — observed only while authenticated (exit 0) |
| `claude auth status` | expected non-zero | yes | unconfirmed — observed only while authenticated (exit 0) |

List runners in the order you want them tried. Only include a runner whose CLI is installed and logged in; an unauthenticated runner with a correct preflight is skipped as `unavailable`, which is the intended behavior but still costs one preflight round-trip.

## CLI and SDK wrappers

Prefer a native non-interactive CLI when it already provides login, permissions, structured exit, and subscription access. Use a project-owned SDK wrapper when the workflow needs provider-specific streaming, callbacks, session continuation, or custom tools.

An SDK wrapper still implements the same process contract:

- accept prompt and workspace as argv;
- exit zero only when the agent turn settles successfully;
- write diagnostic output to the current terminal, not the durable summary;
- honor termination signals and the configured timeout;
- keep provider credentials outside the project contract.

## Fallback classification

| Outcome | Fallback | Durable result |
| --- | --- | --- |
| Preflight non-zero, timeout, or spawn error | next runner | `unavailable` |
| Agent non-zero, timeout, or spawn error | next runner | `failed` or `timeout` |
| Agent zero | stop runner fallback | `success` |
| Verification or artifact failure after agent zero | no provider switch | `verification-failed` |
| Every runner unavailable or failed | stop | `exhausted` |

Do not use a generic authenticated worker label to identify the actual provider. Persist and display the selected profile `id` and `label`.

## Environment boundary

The launcher supplies a small OS environment needed to start a process, configured `inheritEnv` names that exist in the parent, and these run metadata variables:

- `AGENT_AUTOMATION_RUN_ID`
- `AGENT_AUTOMATION_TASK_ID`
- `AGENT_AUTOMATION_RUNNER_ID`

Never persist their full environment or provider credential values. Do not include secret values in command arguments because argv can be visible to local process inspection.
