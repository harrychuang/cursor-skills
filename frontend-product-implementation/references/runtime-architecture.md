# Runtime Architecture Resolution

Use this reference before scaffolding, dependency installation, code generation, or production edits. Resolve where the product belongs and how that target runs. This gate is separate from, and does not replace, `$design-system-governance`.

## Contents

1. Required Decision Record
2. Evidence Priority
3. Ask Versus Infer
4. Greenfield Architecture Gate
5. Existing Repo Inheritance
6. Multiple Roots, Ambiguity, And Conflict
7. Migration Approval Gate

## Required Decision Record

Create a compact working record with every field below. Use `not applicable` with a reason instead of silently omitting a field.

| Field | Record |
| --- | --- |
| Target root | Exact app/package/workspace root and its ownership boundary |
| Mode | `greenfield` or `existing product` |
| Platform | Browser web, mobile web, desktop web, native-wrapper app, embedded webview, shared UI package, or another explicit target |
| Framework and version | Framework or meta-framework plus installed/approved version or version policy |
| Rendering model | CSR, SSR, SSG, ISR, islands, client/server components, embedded runtime, or another explicit model |
| Build tool and runtime | Framework CLI, bundler, compiler, runtime, and relevant version evidence |
| Language | TypeScript, JavaScript, or the target's established language policy |
| Package manager | The manager and workspace mode selected by lockfile or explicit confirmation |
| Routing/navigation | Router, file-based routing, navigation stack, or `none` |
| State | Local/reactive primitives and any shared state solution, or `none` |
| Data boundary | Existing client/query layer, server boundary, or typed mock/adapter seam |
| i18n | Existing message source/tooling, a confirmed new choice, or `none` with approval |
| Styling/design-system integration | Existing styling mechanism, token source, component library, and theme boundary |
| Tests | Unit, component, integration, end-to-end, and visual verification tools in scope |
| Storybook | Existing version and renderer, confirmed addition, or `not used` |
| Decision source | User statement, file paths, handoff section, command output, or explicit inference for each material choice |
| Confidence | `confirmed`, `high`, `medium`, or `low`, with unresolved items listed |

Do not collapse framework and rendering model into one choice. For example, a framework may support multiple rendering modes, and Storybook must use a renderer compatible with the selected component framework.

Persist the record in the repo's existing implementation plan or architecture note when one exists; otherwise keep it in the task implementation map and reproduce its material fields in the final report. Do not let a long-running implementation rely on an unrecorded conversational choice.

## Evidence Priority

Use evidence in this order while preserving conflicts instead of hiding them:

1. Explicit instructions or answers from the current user request.
2. The selected target root's manifests, lockfile, framework/build configs, source conventions, and runnable scripts.
3. Approved architecture records and current production handoff documents for that target.
4. Workspace configuration that directly owns the selected app/package.
5. Sibling apps, examples, prototypes, templates, or general ecosystem conventions as low-confidence hints only.

A Storybook prototype's framework is evidence about the prototype, not automatic authorization to use that framework in production. Likewise, a handoff architecture that conflicts with a live target repo is a conflict to resolve, not permission to migrate the repo.

## Ask Versus Infer

Ask the user when:

- greenfield scaffold-affecting choices remain unresolved or exist only as unsupported inference
- more than one plausible app/package root remains after repo discovery
- manifests, lockfiles, configs, handoff docs, and source conventions disagree materially
- the requested work requires a framework, meta-framework, rendering, build-tool, language, package-manager, router, state, styling, or test migration
- a version cannot be safely derived and compatibility depends on it

Infer and record without re-asking when:

- an existing target root is explicit and has one internally consistent runtime stack
- installed versions, package manager, renderer, scripts, and conventions are directly evidenced by that root
- a feature can be implemented entirely inside those established boundaries

Keep questions narrow. Group coupled greenfield choices into one concise architecture confirmation; for an existing product, ask only about unresolved or conflicting fields. Never ask the user to choose React, Vue, or another framework again when the selected repo already answers that question unambiguously.

## Greenfield Architecture Gate

Before running any scaffolder, installing dependencies, or generating app code:

1. Draft all decision-record fields from explicit requirements and handoff evidence.
2. Mark unresolved and scaffold-affecting decisions.
3. Present a concrete proposed architecture rather than an unbounded list of technologies.
4. Treat explicit choices in the current request as confirmation; otherwise obtain user confirmation for unresolved target root, platform, framework/version policy, rendering model, build tool, language, and package manager fields.
5. Record confirmed choices and their source, then proceed.

Routing, state, data, i18n, styling, tests, and Storybook must also have a selected value, an intentional `none`, or a documented deferral before the affected infrastructure is created. Do not silently use a bundled template or personal default.

## Existing Repo Inheritance

Treat the selected app as the source of truth when its evidence is clear:

1. Resolve workspace root and app/package root separately.
2. Read the owning manifest, lockfile, framework/build config, routing entry, styling/token source, test config, Storybook config, and representative feature files.
3. Record installed versions and conventions with evidence paths.
4. Inherit the stack and implement the feature without a redundant framework question.
5. Use the framework's native component model, lifecycle/reactivity primitives, routing and data boundaries, styling integration, test utilities, and Storybook renderer.

Do not translate React patterns into Vue, Vue patterns into Angular, or prototype-specific patterns into production when the target uses different native conventions.

## Multiple Roots, Ambiguity, And Conflict

For monorepos or nested apps:

1. Inventory plausible targets and the evidence connecting each to the requested route/feature.
2. Prefer an explicit user path or the uniquely owning package.
3. If one target is uniquely supported, select it and record why.
4. If multiple targets remain plausible or differ in framework/runtime, stop before edits and ask the user to choose the target root.
5. After root selection, rebuild the decision record from that root; do not merge conventions from sibling apps.

When evidence conflicts, report the conflicting files or requirements and the behavior each would imply. Do not resolve a material conflict by confidence scoring alone.

## Migration Approval Gate

A request to add a feature does not authorize re-platforming. Before changing any inherited framework, meta-framework, rendering model, build tool, language policy, package manager, routing/state/i18n/styling system, Storybook renderer, or app root:

1. Stop before migration edits or dependency changes.
2. Explain why the feature cannot safely fit the current architecture.
3. Show the smallest in-architecture option and the proposed migration option.
4. Describe affected packages, data and routing boundaries, tests, rollout risk, and migration scope.
5. Obtain explicit user approval for the named migration.
6. Update the decision record with the approval source and planned deviation.

Design-system approval gates still apply independently. Architecture approval never implies approval to create tokens or shared components, and design-system approval never implies permission to migrate the runtime.
