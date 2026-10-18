# Designer guide

Rules for guide mode and for any designer-facing reporting. Guide mode turns a plain-language interview into a valid `.agent-automation/config.json` without exposing internal machinery. Read this file together with `scenario-templates/README.md` before starting a guided setup.

## Interview rules

- Conduct the interview and every report in the user's own language. Template text is canonical content to translate at runtime, not text to quote verbatim.
- Ask one focused question at a time, and give every question concrete answer options plus a free-form choice. Options describe observable outcomes, never internal mechanics.
- Never use the terms runner, contract, verification, argv, or preflight — or any other internal terminology — in questions or designer-facing reports. Use the glossary below instead.
- Never ask the designer to supply shell commands, file paths, or configuration values. Those are derived from repository evidence or template hints.
- Present the scenario template menu in plain language, always including a custom-scenario option. When no template matches, run a custom-scenario interview under these same rules — cover the same ground a template would: what triggers the work, what the automation should do, and what the designer expects to see when it finishes.
- Do not start a paid agent process during guided setup. Setup ends with a validated configuration and a plain-language report of what was created and how to trigger it later (for example: "next time, tell me to run the ready-for-dev automation").
- When the validation script rejects a generated configuration, correct the configuration and validate again without showing raw validator output. If validation cannot be made to pass, say in plain language that setup could not be completed and why — never claim success.

## Translation rules

Derive every field of the project contract in this order, stopping at the first source that resolves it:

1. **Repository evidence** — manifests, package scripts, directories, project instruction files, inspector output.
2. **Template hints** — the selected template's `contractHints` and `prerequisites`, applied as derivation rules against that evidence.
3. **An outcome-oriented question** — only when both fail on a choice that matters, ask the designer one question phrased as observable outcomes with concrete options, never as a technical decision.

Hard rules on top of that order:

- Never invent a completion-check command, and never ask the designer to provide one. When no command can be derived, write the task with an explicit empty verification array and state in the report, in plain language, that this automation has no automatic completion check and that an engineer is recommended to add one.
- Before writing a companion skill name into the contract, confirm from repository evidence that the skill is available to the selected AI tool. When it is not, use the template's next recommendation, or ask an outcome-oriented question if none remains.
- When a template prerequisite is not satisfied, explain in plain language what is missing and what it affects, then stop setup and wait for the user's decision. Never scaffold the missing piece on your own.
- The generated configuration uses exactly the schema in `project-contract.md` — guide mode adds no fields and changes no semantics.

## Plain-language glossary

Apply this glossary whenever the audience is a designer — in guided setup, run progress updates, and status reports. Internal terms on the left never appear in designer-facing text; use the plain-language equivalent instead (shown here in English with the Traditional Chinese phrasing used by this team).

| Internal term | Plain-language equivalent | 繁體中文 |
| --- | --- | --- |
| runner | the AI tool that executes the work | 執行的 AI 工具 |
| verification | completion check | 完成檢查 |
| requiredArtifacts | files this automation should produce | 應該產出的檔案 |
| fallback | trying the next AI tool | 換下一個 AI 工具重試 |
| run | one execution of the automation | 執行一次自動化 |
| dry-run | preview without executing | 只預覽不執行 |
| task / contract | the automation set up for this project | 這個專案建立的自動化 |
| resume | continue an unfinished run | 接續未完成的執行 |

A status report for a designer therefore describes: which automation ran, which AI tool executed it, whether the completion checks passed, which files were produced, and what to do next — all in glossary language.
