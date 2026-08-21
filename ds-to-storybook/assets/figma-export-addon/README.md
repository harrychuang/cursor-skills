# @harrychuang/storybook-addon-figma-export

Storybook 10 addon: export a rendered story into a Figma import payload (payload version 2). Core export works with React, Vue, Svelte, Angular, and Web Components because every preview decorator returns the renderer story result unchanged and the addon UI is plain DOM mounted outside the story root. React + Vite and Vue 3 + Vite have the full verified Export review, Visual Comments, meeting, evidence, persistence, report, and source-action workflow; other renderer/builder combinations retain core export unless the installer capability report says otherwise. The preview and review bundles import no React, React DOM, or Storybook icons. Exports are scoped to `#storybook-root` by default (falling back to `document.body` with a warning). When both tools are enabled, Figma export and Export review share one responsive workspace dock that reserves Story canvas space instead of covering the rendered UI. Prefers a three-layer CSS token model (`ref`, `sys`, `comp`); projects without layered tokens still export with an empty variable set.

## Visual fidelity capture

Beyond layout, tokens, and SVG, the exporter captures:

- **Shadows** — `box-shadow` (including `inset`) and `text-shadow` export as `styles.effects` (`DROP_SHADOW` / `INNER_SHADOW`).
- **Per-corner radius** — asymmetric `border-radius` exports as `styles.radiusCorners`; percentage radii approximate to the shorter box side.
- **Raster images** — non-SVG `img` and `canvas` elements embed as PNG base64 (`imageBase64`, longest side capped at 2048px) with `imageScaleMode` mapped from `object-fit`.
- **Modern colors** — `oklch()`, `lab()`, `color()`, `hsl()`, and named colors normalize to hex/rgba through the browser color engine (clamped to sRGB), for both computed styles and token raw values.
- **Text styles** — `text-transform` is baked into the exported string, rendered line breaks are preserved (`<br>`, `white-space: pre*`), and `letter-spacing`, `text-decoration` (underline/line-through), and `font-style: italic` export as text fields. CSS font-family fallback lists remain available in token `rawValue`, while the Figma variable `value` is normalized to one unquoted family so both JSON and Console-script imports avoid combined-family font errors.
- **Measured auto layout** — flex containers derive item spacing and effective padding from the children's real bounding rects, so margin-driven spacing, `space-around`/`space-evenly` (measured edge offsets become padding), `order`, and `row-reverse`/`column-reverse` visual order survive. Column containers read `row-gap` as the main-axis gap. CSS border widths fold into the exported padding (borders take layout space in CSS but Figma inside strokes do not). Non-uniform spacing (that `space-between` cannot explain) falls back to pixel-true absolute layout.
- **Flex wrap** — wrapped flex containers export `layoutWrap: "WRAP"` with measured in-line `gap` and `counterAxisSpacing`.
- **Mixed inline text** — bare text nodes that sit next to inline elements (`Hello <b>world</b> tail`) export as their own text leaves with Range-measured bounds instead of being dropped; the containing frame keeps every child at its measured position.
- **Wrapped text** — multi-line text keeps its browser wrap width and exports `textGrowHeight: true` (importer ≥ 1.3.0 maps it to Figma's fixed-width `HEIGHT` auto-resize; older importers keep the fixed box as before), so Figma re-flows the height with its own font metrics instead of unwrapping the paragraph into one long line. Single-line truncation (`text-overflow: ellipsis`) and multi-line `-webkit-line-clamp: N` export as `maxLines` + `textTruncation: "ENDING"`.
- **Backgrounds** — multi-layer `background-image` lists are split per layer: `linear-gradient` (including `to top right` corner keywords, resolved against the box aspect ratio), `radial-gradient` stops, and `url()` bitmaps (fetched and embedded like `img` captures, `background-size` mapped to `imageScaleMode`) all export together with `background-color`.
- **Blur filters** — `filter: blur()` exports as a `LAYER_BLUR` and `backdrop-filter: blur()` as a `BACKGROUND_BLUR` entry in `styles.blurEffects` (kept apart from shadow `effects` so older importers still accept the payload).
- **Border styles** — uniform `dashed`/`dotted` borders export `styles.borderStyle` for the importer's dash patterns; text boxes inset their inner text by border width in addition to padding.
- **Structure** — `display: contents` wrappers expand to their rendered children, and absolutely positioned siblings are ordered bottom-to-top by `z-index` (positioned-over-static included) before export.
- **CSS transforms** — rotated elements export their untransformed box plus a rotation-only `transformMatrix` (importer ≥ 1.4.0 applies it as `relativeTransform`), with full nested-transform tracking: counter-rotated inner content (`rotate(45deg)` badge with a `rotate(-45deg)` label) carries the correct inverse rotation, and `scale()` folds into exported sizes and font sizes. Containers holding transformed children switch to pixel-true absolute layout. Skews and mirror flips fall back to the axis-aligned bounding box.
- **Form controls** — `<input>` values (passwords masked as bullets), placeholders (with the real `::placeholder` color), `<textarea>` content, and the selected `<option>` label export as text nodes; single-line controls center their text vertically. Native checkbox/radio/select glyphs are browser chrome and not captured — use custom-styled (`appearance: none`) controls or `data-figma-rasterize`.
- **Rasterize escape hatch** — `data-figma-rasterize="true"` exports that subtree as one bitmap exactly as painted (canvas/WebGL, conic gradients, masks, any CSS the node graph cannot represent).
- **Browser reference snapshot** — every export attaches a PNG render of the story (`payload.reference`, disable with `referenceImage: false`); the importer places it as a locked "Browser Reference" layer beside the import so any remaining gap is visible at a glance.
- **Binding correctness** — token bindings skip rules inside non-matching media queries and rank matching declarations by CSS specificity (inline styles highest).
- **Value-preserving bindings** — computed styles are ground truth: a token binding is exported only when the variable's resolved value matches the style value it would replace in Figma (numbers within subpixel tolerance, colors channel-wise, font families by first candidate). Unitless line-height ratios, padding tokens on bordered auto-layout boxes, and locally overridden custom properties are pruned instead of repainting the node with the raw token value; the importer double-checks the same invariant at bind time.

Known limitations (by design): browser/Figma font metrics may wrap text differently; skew/mirror transforms, masks, and non-blur filters are not captured structurally (use `data-figma-rasterize`); wide-gamut colors clamp to sRGB; raster embeds cap at 2048px and reference snapshots skip stories larger than 8 megapixels; icon-font glyphs render only when the same font exists in Figma.

## Shadow DOM and token-less projects

- Open shadow roots export in place of the host's light children (slots expand to their flattened assigned elements). Component styles injected through `adoptedStyleSheets` — document-level or per shadow root — participate in token binding. Closed shadow roots stay unexported.
- Projects without `--<prefix>-<layer>-*` tokens degrade gracefully: the export completes with `payload.tokens` empty and no variable bindings instead of throwing.

## Local bridge (batch import into Figma)

Configure `payloadSyncUrl` in the addon options to push every successful export into the review-server payload store:

```ts
const figmaExportOptions = {
  payloadSyncUrl: "/__figma-export/payloads",
} satisfies FigmaExportAddonOptions;
```

`createFigmaReviewStatusPlugin` (see the review-server section) now also serves the store endpoints — POST/list/GET under `/__figma-export/payloads` with permissive CORS, persisted to `design-system/figma-export-payloads/` (`payloadDir` option). The paired Figma plugin's "Load from Storybook" section fetches that list and imports selected payloads without clipboard round-trips.

## Verification suite

Run from the addon root (after `npm run build` for the store test):

```bash
node test/run-export-fixture.mjs      # capture features incl. shadow DOM case
node test/run-overlay-fixture.mjs     # renderer-agnostic overlay + token-less + auto-sync
node test/run-payload-store-test.mjs  # bridge store endpoints (CORS, sanitize, round trip)
npm run test:visual-comments          # store, HTTP, safe report, CDP browser/UI fixture
npm run test:renderer-fixtures        # real React and Vue 3 Storybook builds
npm run test:renderer-parity          # shared React/Vue browser behavior contract
npm run test:renderer-neutral         # strict identity, lifecycle, forbidden imports
```

The browser runners bundle the sources, render the fixtures in headless Chromium, and assert the spec scenarios; payloads land in `test/.last-fixture-payload.json`.

## Install

This copy is bundled by the `design-system-to-storybook` skill. During normal
skill usage, do not install it from GitHub. Run the skill installer from the
skill root instead:

```bash
node scripts/install_figma_export_addon.mjs <product-repo-root>
```

The installer detects the Storybook renderer, builder, and major version before
any mutation. It packs this package into a versioned tarball under
`.storybook/vendor/`, installs that immutable local file dependency, and safely
wraps ESM `.storybook/main.*` and `.storybook/preview.*` with generated
renderer-neutral wiring. Use `--renderer` only to resolve conflicting static
signals, `--json` for the capability report, or `--skip-configure` when the
project already owns equivalent wiring.

Requires `storybook@^10`. React and React DOM are optional peers used by the
Storybook manager/React projects; Vue product code does not need to declare
either dependency.

## Setup

### 1. Register the addon (manager toolbar)

`.storybook/main.ts`:

```ts
import type { StorybookConfig } from "storybook";

const config: StorybookConfig = {
  addons: ["@harrychuang/storybook-addon-figma-export"],
  // ...framework, stories, etc.
};

export default config;
```

This loads the addon preset and registers the Figma export toolbar toggle.
When the toolbar toggle is on, the exporter overlay renders `Copy JSON` and
`Download JSON` as separate full-width rows. `Console script` and the icon-only
`Copy design to Figma` action share one equal-width two-column row. The Figma
copy action writes an SVG design representation to the clipboard so it can be
pasted directly into Figma for quick visual review.

### 2. Wire preview (decorator + globals)

`.storybook/preview.ts`:

```ts
import type { Preview } from "storybook";

import {
  createFigmaExportDecorator,
  createFigmaExportGlobalTypes,
  createFigmaExportInitialGlobals,
} from "@harrychuang/storybook-addon-figma-export/preview";
import type { FigmaExportAddonOptions } from "@harrychuang/storybook-addon-figma-export";
import "@harrychuang/storybook-addon-figma-export/styles.css";

const figmaExportOptions = {
  componentClassPrefixes: ["your-prefix-"],
  storyTitlePrefix: false,
} satisfies FigmaExportAddonOptions;

const preview: Preview = {
  decorators: [createFigmaExportDecorator(figmaExportOptions)],
  globalTypes: {
    ...createFigmaExportGlobalTypes(figmaExportOptions),
  },
  initialGlobals: {
    ...createFigmaExportInitialGlobals(figmaExportOptions),
  },
};

export default preview;
```

Replace `your-prefix-` with the class prefix used by your component library, or use an empty array when you want the exporter to derive layer names without a project prefix. `storyTitlePrefix: false` keeps the addon available for every story; set it to a string or string array only when your project wants to filter exports. Prefixes are matched with `startsWith` against the full story title, so use top-level namespaces such as `Components/` — a deeper prefix like `Components/Examples/` silently excludes every sibling subcategory (`Components/Actions/...`).

Adjust `figmaExportOptions` for your design tokens and story naming.

### Export review panel

Use the bundled review helpers when you want Storybook to track each story's
Figma source URL and export/import review state. The
`design-system-to-storybook` skill wires this review decorator by default so the
Open source action is available when source URLs can be resolved.

Keep review settings in one project-local `.storybook/figma-export.config.ts`.
Both the preview decorator and Vite plugin must import that same object; do not
repeat status or comments endpoint strings in `main.ts` and `preview.ts`.

`.storybook/main.ts`:

```ts
import type { StorybookConfig } from "storybook";
import { createFigmaReviewStatusPlugin } from "@harrychuang/storybook-addon-figma-export/review-server";
import { figmaExportProjectConfig } from "./figma-export.config";

const config: StorybookConfig = {
  // ...stories, addons, framework
  async viteFinal(config) {
    return {
      ...config,
      plugins: [
        ...(config.plugins ?? []),
        createFigmaReviewStatusPlugin({
          apiPath: figmaExportProjectConfig.review.apiPath,
          filePath: figmaExportProjectConfig.review.statusFilePath,
          name: figmaExportProjectConfig.review.pluginName,
          commentsEnabled: figmaExportProjectConfig.review.commentsEnabled,
          commentsApiPath: figmaExportProjectConfig.review.commentsApiPath,
          commentsDir: figmaExportProjectConfig.review.commentsDir,
        }),
      ],
    };
  },
};

export default config;
```

`.storybook/preview.ts`:

```ts
import type { Preview } from "storybook";
import {
  createFigmaExportGlobalTypes,
  createFigmaExportInitialGlobals,
} from "@harrychuang/storybook-addon-figma-export/preview";
import { createFigmaExportReviewDecorator } from "@harrychuang/storybook-addon-figma-export/review";
import { getFigmaSourceUrl } from "@harrychuang/storybook-addon-figma-export/source";
import { figmaExportProjectConfig } from "./figma-export.config";
import "@harrychuang/storybook-addon-figma-export/styles.css";

const preview: Preview = {
  decorators: [
    createFigmaExportReviewDecorator(figmaExportOptions, {
      apiPath: figmaExportProjectConfig.review.apiPath,
      visualComments: figmaExportProjectConfig.review.visualComments,
      getFigmaSourceUrl(context) {
        return getFigmaSourceUrl(context.parameters, context.title ?? "", {
          componentSpecModules,
          designSystemFileUrl,
          nodeOverrides,
        });
      },
    }),
  ],
  globalTypes: {
    ...createFigmaExportGlobalTypes(figmaExportOptions),
  },
  initialGlobals: {
    ...createFigmaExportInitialGlobals(figmaExportOptions),
  },
};
```

The default source resolver reads `parameters.figmaSourceUrl`,
`parameters.figma.url`, or `parameters.design.url`. Use `getFigmaSourceUrl`
for project-specific fallbacks, such as parsing local design-system Markdown.
The fallback inputs (`componentSpecModules`, `designSystemFileUrl`, and
`nodeOverrides`) should come from project-local Storybook config, not from the
addon package.

The Figma export and Export review disclosures use the same action-oriented
14px icon language. Expanded controls show an inward **Collapse** pair, while a
collapsed Export review control shows an outward **Unfold More** pair. The
compact Figma export surface continues to hide its glyph and uses the full
Figma-mark-plus-version surface as the accessible Expand control.

### Local visual review meetings

The renderer-neutral review helper can also run append-only visual review meetings from a
separate top-right comments panel. It defaults to a 36px Edit icon launcher whose
button and 14px icon remain centered in the collapsed surface; open it,
then the expanded header places the **Visual comments** subheading above a
compact, content-width outline **Reports** button beside the same Edit control.
Starting or ending a meeting and saving a comment keep the panel expanded, including
across a same-Story preview remount triggered by the local evidence write. Choose
**Add comment**, then click the preview. A numbered, non-interactive Story tag
appears as soon as the point is selected. The capture-phase handler blocks that
pointer sequence before the prototype can change state, captures the current
preview with `html-to-image`, removes nodes marked `data-sbfx-capture-ignore`,
and opens a comment composer. Before Save, move the point by clicking or dragging
inside the snapshot preview, or use Arrow keys (1%) and Shift+Arrow keys (5%).
The Story tag mirrors the final normalized point and is never captured. Other browsers on the
same Storybook host discover the active meeting through five-second polling.
While a meeting is active, the panel shows only the current Story's newest three
comments, with author, timestamp, body, Open/Completed status, body edit,
the original read-only screenshot plus an adjustable pin, and confirmed deletion.
Choosing Edit opens a capture-ignored overlay modal instead of expanding the
editor inside the 320px panel, so the stored screenshot and numbered point are
shown at a larger responsive size. While editing, click or drag the numbered pin
or use Arrow keys (1%) and Shift+Arrow keys (5%); **Save changes** stores the body
and normalized point in one atomic update. Cancel, Escape, or the backdrop
restores both local drafts and returns focus to Edit. A failed update keeps the
modal and drafts open; a successful update closes only the modal and leaves
Visual comments expanded. Pins use one
meeting-wide `1..N` sequence across Stories and captures; deleting a comment
recomputes a contiguous sequence. The **Reports** route remains the single place to browse
active and closed meetings that still contain a capture or comment. Meetings with
`0 captures · 0 comments` and empty group headings are omitted; when no meeting has
evidence, the index renders one empty state. Canonical meeting JSON and direct session
report URLs remain readable. Each session report contains its
snapshots on the addon's dark raised surface, pins, authors, comments, timestamps,
and Story metadata.

```ts
createFigmaExportReviewDecorator(figmaExportOptions, {
  apiPath: figmaExportProjectConfig.review.apiPath,
  visualComments: figmaExportProjectConfig.review.visualComments,
});

createFigmaReviewStatusPlugin({
  apiPath: figmaExportProjectConfig.review.apiPath,
  commentsEnabled: figmaExportProjectConfig.review.commentsEnabled,
  commentsApiPath: figmaExportProjectConfig.review.commentsApiPath,
  commentsDir: figmaExportProjectConfig.review.commentsDir,
});
```

Canonical `meeting.json` files and content-addressed PNG/WebP assets are written
under `design-system/figma-export-review/`; `index.html` and per-meeting reports
are derived, portable projections with relative asset paths. Each comment places
an accessible Trash icon aligned to the left edge, with **Copy AI prompt**, Edit,
and Complete/Reopen grouped in that order at the right edge. Both active and
closed reports show the stored screenshot inside each comment editor and allow
its body and normalized point to be edited in place; Save changes updates both
in one request without recapturing or replacing the image, while Cancel keeps
the canonical comment unchanged.
It produces the same provider-neutral Markdown for Claude, Cursor, Codex, and
other assistants, including the review text, Story metadata, normalized pin,
viewport, a repository-root-relative screenshot path when safe, the report path,
and the same-origin screenshot URL. The report first attempts one clipboard item
with both Markdown and a PNG screenshot. Browsers without rich clipboard support
fall back to text, and the prompt tells an assistant to request a manual image
attachment instead of guessing when it cannot inspect any screenshot reference.
No absolute host path, provider command, API key, or AI network request is added.

The Trash icon's first activation only opens an accessible in-page confirmation
without depending on the native dialog API; Cancel, Escape, or clicking the
backdrop sends no request, and Confirm delete removes the comment, its
unreferenced capture record, and an image asset only after no remaining capture
shares that path. Screenshot pixels are otherwise durable evidence—route/state
fields are metadata, not state replay.

This is a trusted-LAN, same-origin tool with no authentication. Do not expose
the writable middleware to an untrusted network. DOM-to-image capture is not a
framebuffer recorder: video, WebGL, nested iframes, cross-origin images without
CORS, and some browser-only CSS may fail or differ. It does not promise
pixel-perfect browser chrome capture. Rollback may remove the UI/middleware but
must not delete the review directory; retained reports and canonical data stay
readable.

### Manual manager registration (optional)

If you do not use the preset entry in `addons`, register the tool yourself in `.storybook/manager.ts`:

```ts
import { registerFigmaExportTool } from "@harrychuang/storybook-addon-figma-export/manager";

registerFigmaExportTool();
```

## Token prefix detection

By default, the exporter auto-detects the token prefix from CSS custom properties that match the configured token layer segments:

```txt
--{prefix}-ref-*
--{prefix}-sys-*
--{prefix}-comp-*
```

Projects do not need all three default layers to export. The detector chooses the prefix with the broadest layer coverage and then the most matching tokens. If auto-detection fails, set `tokenPrefix` (for example `"your-prefix"`), and use `tokenLayers` when your layer segment names are not `ref`, `sys`, and `comp`.

## Options

| Option | Description |
| --- | --- |
| `tokenPrefix` | Explicit token prefix |
| `tokenLayers` | Custom segment names for `ref`, `sys`, `comp` |
| `collections` | Figma variable collection names per layer |
| `pluginDataKey` | Figma variable plugin data key for duplicate detection |
| `globalName` | Storybook global for the toolbar switch |
| `storyTitlePrefix` | Story title prefix filter (top-level namespaces such as `Components/`), or `false` for all stories |
| `componentClassPrefixes` | Class prefixes used when naming exported layers |
| `absoluteFidelityComponents` | Components exported with absolute layout |
| `embeddedSvgByDataGraphic` | Inline SVG map keyed by `data-graphic` |

## Troubleshooting

- **Toolbar shows "Figma export on" but no export tools appear.** The preview shows a small dismissible "Figma export" notice explaining why. The two causes:
  - The current story is excluded by `storyTitlePrefix`. Check that the filter covers the story title's top-level namespace: use `Components/`, not a deeper path like `Components/Examples/` (prefixes are `startsWith` matches, so a deep prefix excludes `Components/Actions/...` and every other sibling). Set `storyTitlePrefix: false` to include all stories.
  - You are in Docs view. The export overlay mounts in Story view only; open the entry as a story.
- **No notice and no tools.** Confirm the preview imports `@harrychuang/storybook-addon-figma-export/styles.css` and that the decorator (`createFigmaExportDecorator` or `createFigmaExportReviewDecorator`) is registered.

## API exports

- `@harrychuang/storybook-addon-figma-export` — types and utilities
- `@harrychuang/storybook-addon-figma-export/preview` — decorator and globals helpers
- `@harrychuang/storybook-addon-figma-export/preset` — Storybook preset (used automatically via `addons`)
- `@harrychuang/storybook-addon-figma-export/manager` — toolbar registration (side effect)
- `@harrychuang/storybook-addon-figma-export/review` — optional export review panel and decorator
- `@harrychuang/storybook-addon-figma-export/review-server` — optional Vite middleware for persisted review state
- `@harrychuang/storybook-addon-figma-export/source` — source URL resolver helpers for story parameters and documented Figma node fallbacks
- `@harrychuang/storybook-addon-figma-export/styles.css` — exporter and review overlay styles
- `@harrychuang/storybook-addon-figma-export/review.css` — optional direct export review panel styles
