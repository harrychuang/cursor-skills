# Scenario templates

This directory is the authoritative definition of guide-mode scenario templates. Each template is one JSON file describing a common design-to-engineering automation scenario in designer-facing language. Guide mode reads every JSON file in this directory, presents the templates as a plain-language menu (always including a custom-scenario option), and uses the selected template to drive the interview and derive the project contract.

## Required fields

Every template JSON file MUST contain all of these fields:

| Field | Type | Contract |
| --- | --- | --- |
| `id` | string | Kebab-case identifier matching the file name without extension. |
| `title` | string | Designer-facing scenario name. Plain language, no internal terminology. |
| `summary` | string | One or two designer-facing sentences describing what the automation does. |
| `interview` | array | Ordered interview entries. Each entry MUST contain `question`, `options`, and `mapsTo`. |
| `recommendedSkills` | array | Companion skill names in priority order. Every name MUST match a skill directory that exists in this repository. |
| `contractHints` | object | MUST contain `instructionTemplate`, `verificationHints`, and `requiredArtifactHints`. |
| `prerequisites` | array | Project preconditions. Each entry MUST contain `description` and `evidence`. |

### `interview[]` entries

- `question`: the designer-facing question. Written in plain language; the assistant asks it in the user's own language at runtime.
- `options`: concrete answer options presented with the question. Options describe outcomes, never internal mechanics.
- `mapsTo`: which part of the task contract the answer feeds (for the assistant, never shown to the designer).

### `contractHints`

- `instructionTemplate`: the task instruction skeleton with `<placeholders>` the interview answers fill in.
- `verificationHints`: derivation rules only — statements of the form "if the repository shows X, use X". A hint MUST NOT hardcode a runnable command; commands are only ever selected from repository evidence. When no rule matches, the task gets an explicit empty verification array and the designer-facing report says the automation has no automatic completion check.
- `requiredArtifactHints`: derivation rules for files that must exist after the automation runs, following the same evidence-first principle.

### `prerequisites[]` entries

- `description`: plain-language statement of what the project must already have.
- `evidence`: how the assistant confirms it from repository evidence (manifest entries, directories, package scripts, available integrations).

When a prerequisite is not satisfied, guide mode explains in plain language what is missing and what it affects, then stops setup until the user decides. It never scaffolds the missing piece on its own.

## Adding a template

1. Copy an existing template as a starting point.
2. Keep `title`, `summary`, `interview[].question`, and `interview[].options` free of internal terms (runner, contract, verification, argv, preflight).
3. Verify every `recommendedSkills` name against the repository's skill directories.
4. Keep `verificationHints` as derivation rules; never embed commands the repository has not proven.
