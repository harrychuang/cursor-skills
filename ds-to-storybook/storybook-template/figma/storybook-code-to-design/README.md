# Storybook Code To Design

Figma development plugin for importing Storybook Code To Design JSON exports. The plugin parses JSON only; it does not evaluate pasted JavaScript.

Version: `1.6.1` (the authoritative version is stamped from `package.json` into the UI badge and `PLUGIN_VERSION`)

## Fidelity fields (payload v2, all optional)

Payloads produced by the current exporter may carry additional optional fields; older payloads without them import exactly as before:

- `styles.effects` → Figma `DROP_SHADOW` / `INNER_SHADOW` effects on frames, text, and images; `styles.blurEffects` → `LAYER_BLUR` / `BACKGROUND_BLUR` (a separate field so importers ≤ 1.2.4 still accept the payload; both lists merge on import, and blur types inside `effects` are tolerated too)
- `styles.radiusCorners` → per-corner radii (`topLeftRadius` etc.)
- `styles.layoutWrap` + `styles.counterAxisSpacing` → wrapped auto layout
- `styles.letterSpacing` (px), `styles.textDecoration` (`UNDERLINE`/`STRIKETHROUGH`), `styles.fontStyle: "italic"` → text styling; font style resolution covers weights 100–900 with italic variants and upright fallback
- `styles.textAutoResize: "WIDTH_AND_HEIGHT"` hugs single-line text; `styles.textGrowHeight: true` (or a hand-written `textAutoResize: "HEIGHT"`) keeps the browser wrap width fixed and lets Figma size the height, so wrapped paragraphs never unwrap into one line
- `styles.maxLines` + `styles.textTruncation: "ENDING"` → single-line ellipsis and `-webkit-line-clamp` truncation
- CSS `font-family` fallback lists are parsed in source order. Figma variables receive one unquoted family, while `rawValue` retains the full CSS list. If the first family is unavailable, the importer tries later concrete families before Inter and skips an incompatible family binding instead of failing during `appendChild`.
- `imageBase64` + `imageMimeType` + `styles.imageScaleMode` → raster fills via `figma.createImage` (decode failures warn and keep an empty frame). On `frame` nodes the image renders as a CSS-style background layer: background color at the bottom, then the image, then radial and linear gradients on top.
- `styles.backgroundRadialGradient` → `GRADIENT_RADIAL` fill (ellipse inscribed in the node bounds)
- `styles.borderStyle: "dashed" | "dotted"` → stroke `dashPattern` (dotted adds a round cap)
- `styles.transformMatrix` (2x3 rotation matrix) → applied as `relativeTransform` after placement, reproducing CSS `rotate()` including nested counter-rotations; width/height/x/y always describe the untransformed local box
- `payload.reference` (browser-render PNG) → opt-in via the "Place Browser Reference image beside the import" checkbox in the plugin UI (off by default). When enabled, it is placed as a locked "Browser Reference" layer beside the import (inside the component section, or next to the page root) and replaced on re-import, so fidelity gaps are visible at a glance
- `colorFromCss` also accepts 4/8-digit hex, `hsl()/hsla()`, `rgb(r g b / a)` syntax, and common named colors (`white`, `black`, `transparent`, ...); `linear-gradient` supports arbitrary angles

Import behavior notes:

- `overflow: auto | scroll | overlay` (and mixed values like `hidden auto`) clip content like the browser; only `visible` leaves children unclipped.
- CSS borders take layout space, so the exporter folds border widths into the exported padding; strokes stay `INSIDE` and overlap that padding exactly like a browser border box.
- `align-items: baseline` maps to Figma `BASELINE` on horizontal auto layout; `justify-content: space-around/space-evenly` import as start-justified with the exporter's measured padding and gap.
- A color binding whose variable is missing no longer paints a placeholder black fill; the paint is skipped with a warning instead.
- Existing nodes touched during an import (components reused from earlier imports or edited by hand) get every font in their tree preloaded first; a font that cannot be loaded no longer aborts the whole import — the affected node is left standalone (or its stale text replaced) with a warning.
- Value-preserving bindings: before binding, the importer resolves the token's raw CSS value and skips the binding (with a warning) when it does not match the rendered value — a unitless `line-height: 1.3` token never overrides a 15.6px line height, a padding token never undoes the exporter's folded border inset, and a mismatched color token never repaints a fill.
- SVG imports normalize the root `width`/`height` to the rendered size and derive a `viewBox` from the intrinsic size when missing, then rescale as a fallback — a 24px icon file rendered at 16px imports at 16px.

Invalid types on these fields fail `parsePayload` with an error naming the node path and field.

## Plugin UI

The dialog is organized as three import-method tabs with one contextual
primary action in the footer:

- **Paste JSON** (default) — paste the overlay's Copy JSON output; the hint
  under the textarea validates the JSON live and names the story it contains.
  `Cmd/Ctrl+Enter` imports directly from the textarea.
- **From Storybook** — the local-bridge batch importer (below).
- **From file** — drop or choose a saved `.sbfx.json` export; the loaded file
  shows its name, size, and story before importing.

Flow-specific feedback (fetch results, validation, file errors) appears
inline inside the active tab; the status strip above the footer reports the
import lifecycle (progress, summary, warnings) for every method.

## Load from Storybook (local bridge)

The **From Storybook** tab batch-imports payloads stored by the
Storybook review-server bridge (exports pushed via the addon's
`payloadSyncUrl` option):

1. Enter the Storybook URL (default `http://localhost:6006`) and press
   **Fetch** — the plugin reads `GET <url>/__figma-export/payloads`.
2. Tick the stored payloads to import (or **Select all**) — the footer button
   shows the selected count.
3. Press **Import selected (n)** — each payload is fetched and fed through
   the same pipeline as pasted JSON, sequentially, with a final summary.

A connected-but-empty store shows in-tab setup steps (configure
`payloadSyncUrl`, press **Copy JSON** on a story until the overlay notes
`[synced]`, then fetch again), distinguishing it from a connection failure.

`manifest.json` declares `networkAccess.devAllowedDomains` for explicit
`http://localhost` ports (6006-6008 for Storybook dev, 8080 for a static
preview server). Figma's manifest validation rejects wildcard ports and IP
literals, so use `http://localhost:<port>` rather than a numeric loopback or
LAN address. Every supported port must be listed individually; add another
explicit localhost port if Storybook runs elsewhere, then re-import the
manifest in Figma so the permission takes effect. Fetch failures (bridge not
running, CORS) surface inline in the tab — pasting JSON and choosing a file
keep working regardless.

Manual verification checklist (requires Figma Desktop):

1. Start a Storybook whose preview sets `payloadSyncUrl`, toggle Figma export
   on, and run **Copy JSON** on two stories — the overlay notes `[synced]`.
2. In Figma run the plugin, press **Fetch** — both stories appear; select
   both and import — two sections/components are created and the summary
   reports 2/2.
3. Stop Storybook and press **Fetch** again — a connection error appears and
   pasting JSON still imports.

## Verify pure helpers under Node

```sh
npm run build
node test/verify-pure-functions.cjs
node test/verify-bridge-helpers.cjs
```

The script stubs the `figma` global, loads `code.js`, and asserts color parsing, gradient transforms, font style candidates, font environment-fault detection, and payload validation compatibility. `verify-bridge-helpers.cjs` evaluates the marker-delimited pure helpers in `ui.html` (bridge URLs, import summary formatting) outside Figma.

## Build

```sh
npm install
npm run build
```

`npm run build` compiles `code.ts` to `code.js`, which is the `main` entry in `manifest.json`.

## Load In Figma Desktop

1. Open Figma Desktop.
2. Go to `Plugins` -> `Development` -> `Import plugin from manifest...`.
3. Select this file: `manifest.json`.
4. Run `Plugins` -> `Development` -> `Storybook Code To Design`.

## Copy JSON From Storybook

1. In Storybook, open any story included by your Figma export addon options.
2. Enable the `Figma export` toolbar item.
3. Click `Copy JSON`. This is the primary importer flow.
4. `Copy Console Script` is kept only as a legacy fallback for plugin-console experiments.

The JSON payload includes:

- `version`
- `generatedAt`
- `storyId`
- `storyName`
- `componentTitle`
- `tokens`
- `root`

## Import Into Figma

1. Run the development plugin in a Figma design file.
2. In the **Paste JSON** tab, paste the Storybook JSON (the hint confirms the payload is valid and names the story).
3. Click `Import to Figma` (or press `Cmd/Ctrl+Enter` in the textarea).
4. Review the status strip for created/reused variable counts and any binding warnings. When a text node's font could not be loaded and a fallback was used, the summary reports how many fonts were substituted; if two or more families failed every style, the warnings lead with the local-font-service diagnosis (restart Figma or check font access permissions).

## Variable Reuse Rules

The importer avoids duplicate variables by:

1. Finding collections from the payload `tokenSystem.collections`, falling back to `ref`, `sys`, and `comp`.
2. Looking for an existing variable in that collection by the payload `tokenSystem.pluginDataKey`, falling back to `storybookCssToken`.
3. Falling back to `variable.name`.
4. Creating a variable only when neither lookup finds one.

The importer also reads and writes the legacy `cmCssToken` plugin data key so older files continue to deduplicate correctly. CSS token names only need to be valid CSS custom property names beginning with `--`; no project-specific prefix is required.

If an existing variable has the same token identity but a different Figma variable type, the import stops with an error. Alias tokens are written as Figma `VARIABLE_ALIAS` values, so `comp -> sys -> ref` chains are preserved instead of flattened to raw values.
