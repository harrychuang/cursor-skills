---
name: agent-automation
description: "Bootstrap, guide, validate, run, resume, and inspect reusable engineering automation across repositories with ordered Claude Code, Codex, Cursor, or other headless CLI runners. Use when a project needs a portable multi-agent automation contract, when a designer describes a repeatable design-to-engineering automation in plain scenario language (for example building ready-for-dev Figma components into Storybook) and needs a guided plain-language setup, when an existing `.agent-automation/config.json` task should run or resume, when runner fallback and completion proof must be auditable, or when adapting one automation workflow to a repository with different build, test, artifact, framework, or domain-specific skill requirements. Keep project-specific behavior in the project contract and companion skills instead of hardcoding it into the shared runner."
---

# Agent Automation Orchestrate

Coordinate reusable engineering automation while keeping repository-specific instructions, verification, artifacts, and domain decisions in `.agent-automation/config.json` and companion skills.

## Resolve the mode

Choose exactly one mode from the request:

- **bootstrap**: inspect a repository and create or refine its project contract.
- **guide**: walk a designer through a plain-language, scenario-based setup that produces the same project contract. Choose guide when the request describes a desired automation in scenario language without naming a technical mode; a request naming bootstrap, run, resume, or status still resolves to that mode unchanged.
- **run**: execute one configured task with ordered runner fallback.
- **resume**: inspect a previous non-terminal run and start a linked retry.
- **status**: report the latest or requested sanitized run summary.

Treat a request to inspect, explain, or report status as read-only. Do not start a paid agent process unless the user asks to run, resume, implement, fix, or otherwise execute the configured task.

## Resolve the target root

1. Resolve the exact app or repository root from the user's path and repository evidence.
2. Read applicable `AGENTS.md`, `CLAUDE.md`, Cursor rules, and project-local skill instructions before changing the project.
3. Run the inspector from the skill directory:

```bash
node scripts/inspect-project.mjs --project-root <absolute-project-root>
```

Do not infer a framework, package manager, build command, or app root that conflicts with the inspector or repository files.

## Bootstrap a project contract

1. Read `references/project-contract.md` and `references/runner-contract.md`.
2. If `.agent-automation/config.json` is absent, copy `assets/agent-automation.config.example.json` into that location and customize it from repository evidence.
3. Keep runner commands vendor-specific but keep task semantics project-specific:
   - Put CLI command, argv, preflight, timeout, and environment names in `runners`.
   - Put instructions, companion skill, verification commands, and required artifacts in `tasks`.
4. Do not put API keys, tokens, passwords, OAuth values, or other credential values in the contract.
5. Do not invent verification commands. When repository evidence leaves a scaffold-affecting or destructive choice unresolved, stop and ask only for that choice.
6. Validate before any execution:

```bash
node scripts/validate-project-config.mjs --project-root <absolute-project-root>
```

Bootstrap is complete when validation returns `valid: true`. Do not run an agent as part of bootstrap unless the user also requested execution.

## Guide a designer through setup

Read `references/designer-guide.md` and `assets/scenario-templates/README.md` before starting; their interview and translation rules are authoritative for every designer-facing word.

1. Read every template JSON in `assets/scenario-templates/` and present the scenarios as a plain-language menu, always including a custom-scenario option.
2. Interview the user in their own language following the designer guide's interview rules — concrete options per question, no internal terminology, never asking for commands or file paths. When no template matches, run the custom-scenario interview under the same rules.
3. Resolve the target root and inspect the repository exactly as bootstrap does, then derive each contract field with the designer guide's translation rules: repository evidence first, template hints second, an outcome-oriented question only when both fail. Stop and explain in plain language when a template prerequisite is missing.
4. Write `.agent-automation/config.json` in exactly the project-contract schema and validate:

```bash
node scripts/validate-project-config.mjs --project-root <absolute-project-root>
```

5. On validation failure, correct the configuration and revalidate without surfacing raw validator output. Finish with a plain-language report of what automation was created and how to trigger it later.

Guide mode never starts a paid agent, never scaffolds missing prerequisites, and leaves bootstrap, run, resume, and status behavior unchanged.

## Run one task

1. Confirm the requested task ID exists in the validated contract.
2. Load the named companion skill before deciding whether its task can run. Keep that skill's approval and governance gates authoritative.
3. Preview the execution plan when the request is exploratory or risk is unclear:

```bash
node scripts/run-task.mjs --project-root <absolute-project-root> --task <task-id> --dry-run
```

4. Execute only after the user's request authorizes the task's normal project mutations:

```bash
node scripts/run-task.mjs --project-root <absolute-project-root> --task <task-id> --request <user-request>
```

The runner stops fallback after the first zero-exit agent, then checks project verification and required artifacts. A verification failure is a project outcome, not a reason to ask another provider to overwrite the same work.

## Resume a run

1. Read the run summary:

```bash
node scripts/status.mjs --project-root <absolute-project-root> --run-id <run-id>
```

2. Do not resume a completed run.
3. Resolve the original task from the summary and start a linked run:

```bash
node scripts/run-task.mjs --project-root <absolute-project-root> --task <task-id> --resume <run-id> --request <remaining-work>
```

Resume reconstructs workflow state from the sanitized summary; it does not claim to restore a vendor conversation unless a project-specific adapter implements that capability.

## Report status

Run one of:

```bash
node scripts/status.mjs --project-root <absolute-project-root>
node scripts/status.mjs --project-root <absolute-project-root> --run-id <run-id>
```

Report the task, phase, completing or active runner, attempts, verification, artifact checks, timestamps, and next action. Never infer the runner from a generic worker display label when a durable runner ID exists.

## Completion rules

Consider a task completed only when:

- the selected runner exited zero;
- every configured verification command passed;
- every required artifact exists inside the project root;
- the durable summary phase is `completed`;
- any companion skill completion criteria also pass.

Keep config validation, agent completion, project verification, Git commit, and Git push as separate claims.

## Resource routing

- Read `references/project-contract.md` when creating or changing project configuration.
- Read `references/runner-contract.md` when adding a CLI, SDK wrapper, preflight, fallback, or environment rule.
- Read `references/designer-guide.md` before any guide-mode interview and before wording any designer-facing report.
- Read `assets/scenario-templates/README.md` and the template JSON files in `assets/scenario-templates/` when presenting the guide-mode scenario menu or adding a scenario template.
- Run `scripts/inspect-project.mjs` before bootstrap or when the target root changes.
- Run `scripts/validate-project-config.mjs` before every run or resume.
- Run `scripts/check-agent-automation-skill.mjs` only while maintaining this skill; it uses fake runners and temporary fixtures.
