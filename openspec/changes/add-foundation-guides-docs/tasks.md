## 1. Spectra artifacts and docs contract

- [x] 1.1 Deliver `Foundation guides define the documentation architecture` in the change artifacts by documenting the Storybook docs map and standard component sections, then verify with `spectra validate --changes add-foundation-guides-docs --strict`.
- [x] 1.2 Reference `Decision: Add a dedicated Storybook guides page` and `Decision: Make foundations usage-first rather than token-first` in the implementation plan, then verify by reading `openspec/changes/add-foundation-guides-docs/design.md` and `openspec/changes/add-foundation-guides-docs/tasks.md`.

## 2. Starter foundations pages

- [x] 2.1 Deliver `Foundation guides define the documentation architecture` in `design-workspace-starter` by adding a Storybook `guides.mdx` page plus an overview page that surfaces the docs IA, then verify with manual content review of `design/foundations/storybook-docs/guides.mdx` and `design/foundations/storybook-docs/overview.mdx`.
- [x] 2.2 Deliver `Foundation guides provide usage-first color, typography, and spacing guidance` in `design-workspace-starter` by rewriting the markdown and MDX templates around concrete usage rules, then verify with manual content review of `design/foundations/{color,typography,spacing}.md` and `design/foundations/storybook-docs/{color,typography,spacing}.mdx`.
- [x] 2.3 Deliver `Foundation guides are reflected in workflow and generated workspace output` in `design-workspace-starter` by updating `start-here/KICKSTART.md`, `start-here/BUILD_PLAN.md`, `start-here/TASKS.md`, and `start-here/STORYBOOK_10_AUTODOCS.md` to require docs IA and usage guides before component details, then verify by reading those files for the new sequencing language.

## 3. Template generator parity

- [x] 3.1 Deliver `Decision: Keep starter files and generated scaffold output in sync` by updating `design-workspace-starter/scripts/lib/workspace.js` so required foundation paths and generated entries include `guides.mdx` and the new docs IA copy, then verify with `node --test tests/*.test.mjs`.
- [x] 3.2 Deliver `Foundation guides are reflected in workflow and generated workspace output` in `create-design-workspace/assets/template` by mirroring the starter foundations and `start-here` updates into the bootstrap template, then verify with manual diff review between `design-workspace-starter` and `create-design-workspace/assets/template`.

## 4. Final validation

- [x] 4.1 Deliver the full `foundation-guides` capability with repo-level validation, then verify with `spectra validate --changes add-foundation-guides-docs --strict` and `npm test` from `design-workspace-starter`.
