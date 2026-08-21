# Framework Adaptation

Use this reference before scaffolding Storybook, installing dependencies, or choosing component/story filenames. Keep the design-system workflow renderer-neutral while adapting implementation to the selected product root.

## Contents

1. Decision priority and evidence
2. Ask versus infer gate
3. Decision record
4. Storybook framework selection
5. Framework-native implementation
6. Capability matrix

## 1. Decision Priority And Evidence

Use this priority:

1. Explicit choice in the current user request or an approved handoff/architecture decision.
2. Architecture records and setup docs scoped to the selected app/package.
3. Existing `.storybook/main.*`, framework config, and Storybook dependencies in that root.
4. The selected root's `package.json`, workspace manifest, lockfile ownership, scripts, and framework/meta-framework dependencies.
5. Source extensions, route conventions, app entry points, component APIs, and current story files.
6. Tooling configs for the builder/bundler, styling, testing, and TypeScript/JavaScript.
7. An explicit user answer when evidence is absent, ambiguous, or conflicting.

An explicit user/handoff choice outranks inference. Repo evidence must come from the selected target root; a clearer sibling app does not decide another package's stack. Treat generated artifacts and stale build output as supporting evidence only.

## 2. Ask Versus Infer Gate

| Situation | Action before scaffold/install |
|---|---|
| Existing app with one coherent stack and target root | Inherit and record it; do not ask the user to repeat the framework. |
| Existing Storybook with coherent renderer/builder | Preserve it unless the user explicitly requests migration. |
| Greenfield target without an explicit stack | Ask for target root, frontend framework/meta-framework, and any consequential rendering/builder choice. |
| Multiple plausible app/package roots | Ask which root owns the components and Storybook. |
| Conflicting docs, dependencies, configs, or stories | Summarize the conflict and ask which architecture is authoritative. |
| Requested migration or a tool that would require migration | Explain scope and ask for explicit approval; do not migrate for convenience. |
| Non-React product considering bundled template | Default to product-native Storybook; offer a separate React workspace only for shared token/docs checks or separately requested React components. |

Ask only for unresolved decisions. For example, if a Vue/Vite app is unambiguous but Storybook is absent, state that Vue/Vite will be inherited and ask only whether to initialize product-native Storybook. Mention a separate React workspace only when the user has also requested shared token/docs checks or a parallel React implementation.

A separate React workspace is not a renderer for Vue, Angular, Svelte, or Web Component source. It cannot prove product-component behavior or visual parity for those implementations. Use it only when the intended output is shared token/docs verification or a separately scoped React implementation, and record that boundary explicitly.

Never reinterpret approval to install Storybook as approval to change the product framework, builder, rendering mode, workspace boundaries, or public component API.

## 3. Decision Record

Add these fields to `STORYBOOK_IMPLEMENTATION_MAP.md` before setup or component edits:

```md
## Runtime decision

- Design-system root:
- Selected app/workspace root:
- Framework and version evidence:
- Meta-framework and rendering mode:
- Language and source extensions:
- Package manager and workspace owner:
- Builder/bundler:
- Storybook renderer/framework package and version:
- Story and docs convention:
- Component API convention (props/inputs, slots/content, events/outputs):
- Styling, theme, and token integration:
- Verification commands:
- Decision source: explicit user | handoff | repo evidence | user clarification
- Evidence paths:
- Migration: none | explicitly approved, with scope
- Separate verification workspace: no | approved path
```

Record the exact setup command and why it matches the selected root. If the decision changes, preserve the prior decision and approval as a short dated note rather than silently rewriting history.

## 4. Storybook Framework Selection

Select the Storybook renderer/framework package that renders the product's real components. Preserve an existing meta-framework integration when it carries runtime behavior needed by stories. Match the builder to the host toolchain unless the repo or user provides a different supported decision.

Examples of evidence-driven choices include React with Vite or Webpack, Vue 3 with Vite, Angular with its native integration, Svelte/SvelteKit, Web Components, Preact, or a supported meta-framework adapter. Do not hardcode a universal list: inspect the current Storybook-supported frameworks and the installed CLI before setup.

For a product-native install:

1. Change to the approved app/package root and use its package manager.
2. Let the official CLI inspect project dependencies first, for example `npm create storybook@latest`.
3. If auto-detection fails or the target is intentionally custom, inspect the current CLI help and use its supported fallback, for example `npm create storybook@latest --type <supported-type>`.
4. Review the generated `.storybook/main.*` framework value, stories glob, preview imports, and scripts before proceeding.
5. Record the command, selected renderer/builder, generated files, and any manual adjustments.

Do not run the CLI until the ask gate is resolved. Do not use `--type react` to work around failed Vue/Angular/Svelte/etc. detection. Prefer the current official installation and framework documentation because supported packages and CLI types can change.

Official starting points:

- `https://storybook.js.org/docs/get-started/install`
- `https://storybook.js.org/docs/get-started/frameworks`

## 5. Framework-Native Implementation

Co-locate component source and stories, but inherit filenames, APIs, styling, and test patterns from the target:

| Target | Typical source | Typical story | Preserve |
|---|---|---|---|
| React/Preact/meta-framework | `.tsx` or repo-native `.jsx` | `.stories.tsx` / repo equivalent | props, children, refs, providers, server/client boundaries |
| Vue 3/Nuxt | `.vue` and optional composables | `.stories.ts` / repo equivalent | props, emits, slots, provide/inject, SFC styles |
| Angular | `.component.ts` plus template/styles as used | `.stories.ts` | inputs, outputs, content projection, providers/modules |
| Svelte/SvelteKit | `.svelte` | `.stories.ts` / repo equivalent | props, slots/snippets, events, context, load/runtime boundaries |
| Web Components/Lit | `.ts` or `.js` | `.stories.ts` / repo equivalent | attributes/properties, events, slots, custom-element registration |

These are examples, not filename mandates. Existing repo conventions win. Express variants and states through the framework's native component API, use its normal decorator/provider mechanism, and keep story render functions renderer-native. Preserve co-location and Autodocs coverage using the repo's supported CSF or MDX convention.

## 6. Capability Matrix

| Capability | Compatibility rule | Required action |
|---|---|---|
| Core source trace, token integration, planning, docs sync, components, and stories | Renderer-neutral | Implement with the selected product framework and Storybook conventions. |
| Bundled `storybook-template` | React + Vite + Storybook 10 only | Offer as an opt-in React target, shared token/docs workspace, or separately scoped React implementation; never use it as parity evidence for Vue/other product components. |
| Bundled Figma export addon: core export | Storybook 10 with an unambiguous detected React, Vue 3, Angular, Svelte, or Web Components renderer | Run the installer and trust its `coreExport` state. If renderer signals conflict or are unknown, stop before mutation and use `--renderer` only after resolving the authoritative target. |
| Bundled addon: full Review, Visual Comments, persistence, reports, source actions | Verified for React + Vite + Storybook 10 and Vue 3 + Vite + Storybook 10 from the same package/version | Allow the installer to generate full renderer-neutral wiring only for these matrix entries. Vue does not declare React or React DOM. |
| Bundled addon: other builder/version combinations | Review capabilities are `unsupported` or `unverified` even when core export is supported | Generate core-only wiring for `supported`; omit unsupported review/server wiring. For `unverified`, require a dedicated validation pass or mark the addon blocked without blocking product-native Storybook work. |
| Bundled Figma import plugin | Consumes the exporter's compatible JSON payload; it is not a renderer/exporter | Install/confirm only when a compatible payload path exists; record both exporter and manifest status. |
| Prototype Inspector, `prototypeFlowLayout.ts`, and template Static Flow helpers | Bundled-template-only availability | Report unavailable in product-native workspaces unless equivalent tooling is separately installed and verified; do not imply the handoff is wired. |

Tooling incompatibility never justifies a silent product-framework migration. Record conditional capabilities independently so the renderer-native Storybook catalog can still be completed.
