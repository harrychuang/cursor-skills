# Figma Export Review Setup

Use this reference when the Figma export toolbar appears but the review overlay or Open source action is missing.

Also use this reference before wiring `.storybook/main.*` or `.storybook/preview.*` for the bundled Figma export addon.

The addon has two preview UIs:

- `createFigmaExportDecorator`: shows the export overlay for copying JSON or plugin-console code.
- `createFigmaExportReviewDecorator`: returns the story result unchanged while synchronizing the export/review DOM workspace and Open source action outside the story root.

For this skill, use `createFigmaExportReviewDecorator` by default. Do not configure only `createFigmaExportDecorator` unless the user explicitly opts out of review/Open source.

## Installer And Config

Install the bundled addon with:

```sh
node <skill-root>/scripts/install_figma_export_addon.mjs <product-repo-root>
```

The installer:

- detects renderer, builder, and Storybook major from package dependencies and static `.storybook/main.*` references before mutation
- reports separate `coreExport`, `reviewWorkspace`, `visualComments`, and `persistence` states; `--json` writes one report to stdout and `--renderer` resolves conflicting renderer signals
- packs `assets/figma-export-addon/` into `<product-repo-root>/.storybook/vendor/harrychuang-storybook-addon-figma-export-<version>.tgz`
- detects `npm`, `pnpm`, `yarn`, or `bun`
- installs `file:.storybook/vendor/harrychuang-storybook-addon-figma-export-<version>.tgz`
- installs `@storybook/icons@^1.0.0` only when the target package does not already declare `@storybook/icons`
- generates `.storybook/figma-export.main.mjs` and `.storybook/figma-export.preview.mjs`, then safely wraps existing ESM default config exports without replacing their config objects
- generates full Review/Visual Comments/Vite server wiring for React + Vite + Storybook 10 and Vue 3 + Vite + Storybook 10; other supported Storybook 10 combinations receive core export wiring only
- upgrades in place when re-run with a newer bundled version, prunes superseded tarballs, and migrates the legacy `.storybook/vendor/figma-export-addon/` directory layout (kept as `figma-export-addon-legacy-backup` until deleted after verification)
- reports bundled vs installed versions with `--check` (exit 0 up to date, 2 not installed, 3 update available or legacy layout)

Use `--skip-configure` when the project already owns equivalent wiring. Use
`--configure-only` to regenerate installer-owned wrappers without changing
dependencies. The installer refuses partial/unsafe wiring or non-owned generated
files instead of overwriting them.

## Capability Matrix

| Environment | Core export | Review / Visual Comments / persistence |
|---|---|---|
| React + Vite + Storybook 10 | `supported` | `supported` |
| Vue 3 + Vite + Storybook 10 | `supported` | `supported`; no React/React DOM product dependency |
| React/Vue 3 with Webpack 5, Angular, Svelte, Web Components on Storybook 10 | `supported` when detection is exact/inferred | `unsupported`; installer generates core-only wiring |
| Unknown/conflicting renderer or unknown Storybook major | `unverified` | `unverified`; installer stops before mutation |
| Storybook major other than 10 | `unverified` | `unsupported`; do not force installation |

Generate config before editing Storybook files:

```sh
node <skill-root>/scripts/generate_figma_export_config.mjs <design-system-package-root> --product-root <product-repo-root> --write
```

Default output is `<product-repo-root>/.storybook/figma-export.config.ts`. Keep project-specific Figma URLs, node IDs, class prefixes, theme globals, local graphics, token imports, review API settings, and source fallbacks in `.storybook/figma-export.config.ts`, `.storybook/preview.*`, or product code. The bundled addon should stay generic.

The installer-owned `.mjs` wrappers intentionally use portable defaults. When
the generated project config contains project-specific values, pass those
values through the wrapper calls or replace the baseline wrapper calls with the
explicit Preview/Main wiring below. Re-run future installs with
`--skip-configure` once the project owns that explicit wiring; do not generate a
config file and leave its values unused.

The generated config covers:

- `componentClassPrefixes` and `tokenPrefix`, inferred from token CSS variables such as `--cm-ref-*`, `--cm-sys-*`, and `--cm-comp-*`
- CSS font-family fallback lists are portable: the exporter preserves the complete list in token `rawValue`, while addon 0.7.0 and importer 1.6.0 normalize Figma variable values to one loaded family and try later concrete fallbacks before Inter.
- `storyTitlePrefix`, inferred from existing story titles when possible; the generator emits top-level namespaces only (`Components/`, `Foundations/`, `Pages/`) — never deeper paths like `Components/Examples/`, because prefixes are `startsWith` matches and a deep prefix silently excludes sibling subcategories — and falls back to `false` (include all stories) when no titled story is found. Re-running the generator preserves an existing `storyTitlePrefix` in the config; fix or remove a stale value in `.storybook/figma-export.config.ts` before regenerating
- `absoluteFidelityComponents`, inferred from page/screen/composite/product-pattern entries and graphic or typographic lockups that need tighter visual parity
- review API path, plugin name, and status JSON path
- visual comment enablement, same-origin API path, capture selector, author
  storage key, and canonical comments directory
- source fallback values, such as design-system Figma file URL and per-component node overrides from `STORYBOOK_SOURCE_TRACE.md`

## Configuration Rules

1. Add `"@harrychuang/storybook-addon-figma-export"` to `.storybook/main.*` `addons`, preserving existing addons.
2. Import `figmaExportProjectConfig` from `.storybook/figma-export.config.ts` and build `figmaExportOptions` from that config.
3. Merge `createFigmaExportReviewDecorator`, `globalTypes`, and `initialGlobals` into the existing preview export. Do not overwrite existing decorators or globals.
4. Use plain `createFigmaExportDecorator` only if the user explicitly opts out of review/Open source.
5. Set `tokenPrefix` only when the CSS token prefix is explicit or auto-detection would be ambiguous.
6. Keep `tokenLayers` aligned to `ref`, `sys`, and `comp` unless the extraction uses different segment names.
7. Set `storyTitlePrefix` to `false` when the project has no established story namespace; otherwise include every relevant top-level namespace such as `Components/`, `Pages/`, and `Foundations/`. Use `Components/`, not a deeper path like `Components/Examples/` — prefixes are `startsWith` matches, so a deep prefix excludes every sibling subcategory. `generate_figma_export_config.mjs` detects and rewrites deep prefixes down to the top-level namespace when regenerating.
8. Set `componentClassPrefixes` from component CSS class prefixes when available.
9. Configure review/Open source using bundled addon helpers instead of copying a product-specific panel.
10. Remember that the review overlay and Open source action render only when the Storybook `figmaExport` toolbar global is toggled on.

## Why The Review Overlay Is Missing

Common causes:

- `.storybook/preview.*` imports only `createFigmaExportDecorator`, not `createFigmaExportReviewDecorator`.
- `.storybook/preview.*` does not import `@harrychuang/storybook-addon-figma-export/styles.css`; this stylesheet includes both exporter and review overlay styles.
- Storybook toolbar global `figmaExport` is still `off`; the review overlay renders only after the toolbar is toggled on.
- `figmaExportOptions.storyTitlePrefix` excludes the current story title. When this happens with the toolbar on, the preview shows a dismissible "Figma export" notice naming the configured prefixes. Check first that the filter covers the story's top-level namespace: the correct level is `Components/`, not `Components/Examples/`. Use `false` to include all stories, or include every top-level namespace such as `Components/`, `Pages/`, and `Foundations/`.
- The current entry is a Docs page. The export overlay mounts in Story view only; with the toolbar on, the preview shows a notice saying so.
- `.storybook/main.*` does not include `"@harrychuang/storybook-addon-figma-export"` in `addons`, so the toolbar control is missing.
- `.storybook/main.*` does not mount `createFigmaReviewStatusPlugin`, so the overlay may show a save/load error after it renders.

## Why Open Source Is Missing

Common causes:

- The story has no `parameters.figmaSourceUrl`, `parameters.figma.url`, or `parameters.design.url`.
- The preview fallback callback does not call `getFigmaSourceUrl` from `@harrychuang/storybook-addon-figma-export/source`.
- `designSystemFileUrlFallback` from `.storybook/figma-export.config.ts` was passed without mapping it to `designSystemFileUrl`.
- `nodeOverrides` keys do not match the component slug derived from the Storybook title after `storyTitlePrefix` is removed.

## Preview Wiring

In `.storybook/preview.*`, prefer this shape:

```ts
import {
  createFigmaExportGlobalTypes,
  createFigmaExportInitialGlobals,
  type FigmaExportAddonOptions,
} from "@harrychuang/storybook-addon-figma-export";
import { createFigmaExportReviewDecorator } from "@harrychuang/storybook-addon-figma-export/review";
import { getFigmaSourceUrl } from "@harrychuang/storybook-addon-figma-export/source";
import "@harrychuang/storybook-addon-figma-export/styles.css";

import { figmaExportProjectConfig } from "./figma-export.config";

const figmaExportOptions: FigmaExportAddonOptions = figmaExportProjectConfig.addon;

export const decorators = [
  createFigmaExportReviewDecorator(figmaExportOptions, {
    apiPath: figmaExportProjectConfig.review.apiPath,
    enabled: figmaExportProjectConfig.review.enabled,
    visualComments: figmaExportProjectConfig.review.visualComments,
    getFigmaSourceUrl: (context, componentTitle) =>
      getFigmaSourceUrl(context.parameters, componentTitle, {
        componentSpecModules,
        designSystemFileUrl: figmaExportProjectConfig.source.designSystemFileUrlFallback,
        nodeOverrides: figmaExportProjectConfig.source.nodeOverrides,
      }),
  }),
];

export const globalTypes = {
  ...createFigmaExportGlobalTypes(figmaExportOptions),
};

export const initialGlobals = {
  ...createFigmaExportInitialGlobals(figmaExportOptions),
};
```

Preserve existing decorators, globals, and initial globals when merging this into a real project.

## Main Wiring

In `.storybook/main.*`, preserve existing config and add:

```ts
import { createFigmaReviewStatusPlugin } from "@harrychuang/storybook-addon-figma-export/review-server";
import { figmaExportProjectConfig } from "./figma-export.config";

export default {
  addons: [
    "@harrychuang/storybook-addon-figma-export",
  ],
  async viteFinal(config) {
    config.plugins = [
      ...(config.plugins ?? []),
      createFigmaReviewStatusPlugin({
        apiPath: figmaExportProjectConfig.review.apiPath,
        filePath: figmaExportProjectConfig.review.statusFilePath,
        name: figmaExportProjectConfig.review.pluginName,
        commentsEnabled: figmaExportProjectConfig.review.commentsEnabled,
        commentsApiPath: figmaExportProjectConfig.review.commentsApiPath,
        commentsDir: figmaExportProjectConfig.review.commentsDir,
      }),
    ];
    return config;
  },
};
```

For non-Vite Storybook builders, use the installer's core-only
`createFigmaExportDecorator` wiring. Do not manually add the review decorator or
Vite status plugin while the capability report says `unsupported`.

## Visual Comment Safety And Capture Limits

Visual comments are additive to the existing review status, Figma source, and
notes, but render in a separate top-right panel instead of inside Export review.
The panel defaults to an Edit icon launcher and expands on demand. The complete
workflow is verified in React + Vite and Vue 3 + Vite Story view on Storybook 10.
The browser intercepts the selected
pointer sequence before prototype handlers, captures the current in-memory UI,
and stores a normalized pin plus immutable screenshot. Point selection immediately
shows the next meeting-wide numbered tag. Before Save, the point can be adjusted
inside the snapshot by click, Pointer Events drag, Arrow keys (1%), or Shift+Arrow
keys (5%). Saved-comment Edit in the Visual comments panel opens a capture-ignored
overlay modal with a larger responsive screenshot and numbered pin; Reports keeps
its inline editor. Both surfaces keep the original screenshot read-only while
allowing the numbered pin to move with the same pointer and keyboard controls.
**Save changes** atomically stores the body and normalized point without
recapturing or replacing the screenshot. Cancel, Escape, or the modal backdrop
restores both drafts and returns focus; a failed save retains the modal drafts,
while success closes the modal and keeps Visual comments expanded. If the stored
image is unavailable, body-only editing remains usable.
Set
`captureSelector: "body"` when portals outside `#storybook-root` must appear;
addon chrome is excluded with `data-sbfx-capture-ignore`.

Use this only on a trusted local network. There is no account or authentication
layer, the middleware is same-origin, and its writable routes should not be
published as a production service. `html-to-image` cannot guarantee exact
framebuffer output for video, WebGL, nested iframes, or cross-origin images
without CORS. The screenshot—not route metadata—is the durable state evidence;
the addon does not replay component state.

Reports under `design-system/figma-export-review/` use relative assets and may
be copied or zipped with their session directory. When rolling back the addon,
leave this directory intact so canonical JSON and reports remain readable.

The review and export sections share one responsive bottom-right workspace dock.
On wide viewports it reserves inline Story space; on narrow viewports it reserves
block space. The separate comments detail panel stays at the top-right and never
overlaps the workspace; capture/composer state never removes either workspace
header. Both workspace disclosures use action-oriented 14px paired icons:
expanded controls show inward **Collapse** chevrons, while collapsed Export review
shows outward **Unfold More** chevrons. The compact collapsed Figma export surface
keeps the paired glyph hidden and remains operable through its full
Figma-mark-plus-version surface. The report index keeps current and closed meetings separate and shows
capture/comment counts only for meetings that still contain evidence. Meetings with
zero captures and zero comments, plus any resulting empty group heading, are omitted;
if every meeting is empty the index shows one empty state while canonical meeting JSON
and direct session report URLs remain readable.
Comment ordinals are derived from the full meeting before Story/capture filtering,
so panel previews and Reports use the same continuous `1..N` sequence. Reports use
the existing dark `--sbfx-surface-raised` surface behind contained screenshots in
both light and dark color schemes.

If status or comments requests fail, the panel names the HTTP operation and
configured endpoint. Fix `.storybook/figma-export.config.ts`; do not add legacy
endpoint aliases. A status failure does not disable comments, while a comments
failure disables only meeting/comment mutations until a successful poll.
