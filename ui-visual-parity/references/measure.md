# Measuring Each Side

A cycle compares two captures of one surface: the reference and the implementation. This document is how to produce a capture from each kind of source, what must be equal on both sides before a comparison means anything, and what each kind of capture can and cannot establish. The file format is in `ui-spec.md`; running a cycle is in `SKILL.md`.

## What a capture produces

Two files: `<name>.spec.json`, the UI Spec (every rendered node under the root with its measured box, and what each primitive looks like), and `<name>.png`, a screenshot of exactly the root at the capture's density. The reference is captured once for each context and kept. The implementation is captured afresh by every cycle; it is captured by hand only on the paths below that have no cycle.

Prerequisites: Node 22 or later and a Chromium-family browser. Nothing is installed. The browser is found automatically (Chrome, Chromium, Edge, Brave, or a Chromium that a Playwright install left behind); set `CHROME_PATH` to an executable to choose one. When none is found the command says so and exits with code 2. Without a local browser, any browser tool that can evaluate JavaScript in the page can take the capture instead (see "Using another browser tool").

## The capture context must match

The checks cannot tell a difference of context from a difference of design. Before capturing, make both sides show the same thing:

| Context | How it is set | Watch for |
|---|---|---|
| Surface width | `--viewport <width>x<height>`. A cycle opens the implementation at the reference spec's viewport unless told otherwise. | The height matters only to layouts that use it (`100vh`, fixed bars). Widths more than 15% apart are another form factor (`parity-policy.md`). |
| Density | `--dpr`, 2 by default for a capture. A cycle captures the implementation at the density of the reference picture, which it reads off the picture's width (780 px wide for a 390 px surface is 2); without a picture it takes the reference spec's density. | Give `--dpr` to a cycle only to override that. Two pictures at different densities are compared by averaging the sharper one down, which is not the picture a capture at that density gives and shows as false regions. |
| Theme | `--theme light` or `--theme dark` sets what `prefers-color-scheme` matches; `light` by default for a capture. A cycle captures the implementation in the reference's scheme (`surface.theme`). A page with a switch of its own (a class, an attribute, a query parameter, a story global) is switched through the URL. | The machine's own appearance setting never decides. A Figma spec records no theme, so a cycle against a dark frame needs `--theme dark` when the page follows `prefers-color-scheme`. |
| Locale and content | The same language and the same data on both sides | Different words are reported as text differences, and what follows them moves. |
| State | What the surface is showing: loaded, empty, error, a dialog open | The bundled capture loads a URL and measures; it does not click or type. A state must be reachable by URL (a route, a query parameter, a story). |

Capture the reference once for every state, theme, and breakpoint to verify; each one is verified with its own cycle. Interaction states of single controls (hover, focus) are not separate captures: `--states` records them inside one.

When the implementation shows other content than the reference, load the same content first: fixtures, a seeded story, mocked responses. Where that is impossible, list the areas in a JSON file, `[{ "x": 16, "y": 120, "width": 358, "height": 44 }]`, and pass it to the cycle with `--ignore <file>`. Rectangles are in CSS px from the root's top-left corner. An excluded area takes no part in any check: its pixels are not compared, and every primitive whose centre lies in it, on either side, is neither paired nor compared nor counted. Draw the rectangle around the content that differs, not around the box that holds it, or that box's own look and place go unchecked too. The cycle prints `left out on request: 1 area(s), and everything in them`; name the excluded areas, and why, in the final report.

## Web surface (reference or implementation)

```sh
node scripts/capture_web.mjs --url <url or file> --root <selector> \
  --viewport 390x844 --dpr 2 --theme light --states hover,focus-visible \
  --out <folder> --name reference
```

| Flag | Default | Meaning |
|---|---|---|
| `--url` | required | A URL, or the path of a local HTML file |
| `--root` | `body` | CSS selector of the surface: the screen, the card, the story root. The first match is measured and the screenshot is clipped to it. |
| `--viewport` | `390x844` | Window size in CSS px |
| `--dpr` | `2` | Density of the screenshot |
| `--theme` | `light` | `light` or `dark`: what `prefers-color-scheme` matches in the page |
| `--states` | none | Comma-separated pseudo-classes, without the colon, to hold on every interactive element: `hover`, `focus`, `focus-visible`, `focus-within`, `active`, `visited`, `target`. Any other name stops the capture. |
| `--out` | `.` | Folder for the two files; created when missing |
| `--name` | `implementation` | File name stem and surface name. Use `reference` for a reference. |

It writes `<out>/<name>.spec.json` and `<out>/<name>.png`, prints one line (`reference: 84 nodes, 49 primitives · fonts asked for system-ui → rendered with .SF NS`), and exits with code 0. Code 2 means it could not run, and the message says why: no browser, no `--url`, a page that could not be loaded, a `--root` that matches nothing, or a state or theme name it does not know.

What the command does, in order. A capture made any other way has to do the same to be comparable:

1. Starts a headless browser with an sRGB colour profile, software rasterisation (GPU rasterisation is not repeatable from one load to the next), hidden scrollbars, and the colour scheme set by `--theme`.
2. Loads the page, stopping if it cannot be loaded; waits for its fonts (`document.fonts.ready`), freezes motion (animation and transition durations and delays forced to `0s`, the text caret hidden), and lets two frames paint.
3. Evaluates `scripts/extract_dom.js` on the root.
4. Asks the engine which fonts it actually drew the text with.
5. Takes the screenshot clipped to the root, including what lies below the viewport; the first one is discarded and the capture repeats until two in a row are identical.
6. With `--states`, holds each state on each interactive element in turn and records the paint properties it changes as that node's `states`. A state that changes nothing is not recorded. The screenshot always shows the default state.

**What "loaded" means.** A wrong path, a refused connection, or a server answering 400 or above stops the capture with `Cannot load <url>: …` and exit code 2; the browser's error page is never captured. Content the page fetches after its load event is not waited for: an empty state captured before the data arrived is a valid capture of the wrong thing. Read the node count and open the PNG before keeping a reference.

**Fonts.** `surface.fonts.requested` is the first family of every text's font stack; `fonts.loaded` is what the engine drew with (the first 120 text elements are asked). `fonts.aligned` is `false` when a requested named family is not among the loaded ones, and the capture prints `⚠ fonts: the page asked for a font the browser did not render`. Generic keywords (`system-ui`, `-apple-system`, `sans-serif`, `ui-monospace`, and the like) never count as a mismatch. Text metrics from such a capture are untrusted (`parity-policy.md`): install the font or make the page load it, then capture again.

**Stability.** `⚠ the surface kept changing between screenshots` (`surface.stable: false`) means no two consecutive screenshots agreed. Something the freeze does not reach is still moving: a video, a canvas, a script-driven animation, a carousel timer. Stop it at the source (a static fixture, a paused story) or leave the area out with `--ignore`; until then the pixel check reports motion as differences.

### Using another browser tool

`scripts/extract_dom.js` is a single expression that evaluates to a function. Evaluate the file's text in the page and call the result: `(<text of scripts/extract_dom.js>)({ root: ".screen", name: "reference" })`. It returns the UI Spec as a plain object, or throws when `root` matches nothing.

| Option | Meaning |
|---|---|
| `root` | CSS selector of the surface. Default `body`. |
| `name` | The surface name |
| `mark` | `true` stamps every element with `data-ui-parity-node="<node id>"`, so the same element can be addressed after the call |
| `paintOf` | A CSS selector. Returns that element's paint snapshot instead of a spec: `background`, `gradient`, `color`, `borderWidth`, `borderColor`, `shadow`, `outline`, `opacity`, `decoration`, `transform`, `filter`. |

The function only measures. Steps 1, 2, 4, 5, and 6 are the driving tool's job:

- **Rendering and settling** as in steps 1 and 2, at a whole-number density and with the colour scheme set explicitly; write the scheme to `surface.theme`, because the function can only report what the browser matched.
- **The screenshot:** PNG, clipped to `surface.root` (`pageX`, `pageY`, `width`, `height`), taken until two in a row are identical.
- **Fonts:** fill in `surface.fonts.loaded` and `surface.fonts.aligned` from what the tool reports as rendered (DevTools lists it as "Rendered Fonts"; the bundled capture calls CDP `CSS.getPlatformFontsForNode`). Write `aligned` as `true` or `false` yourself: with neither, the comparison reports the font environment as `unknown` and marks nothing untrusted.
- **States:** call with `mark: true`; then, for each node with `interactive: true`, take `paintOf: '[data-ui-parity-node="<id>"]'` before and while the state is held, and store the keys whose values changed as `states.<state>` on that node.

A spec captured this way is a valid reference for a cycle. The cycle itself captures the implementation with the bundled browser; with no local Chromium at all, compare two captures with `pixel_diff.mjs` and `parity_diff.mjs`, as under "Image-only reference" and "Native app".

## Figma reference, with a tool that runs scripts

`scripts/extract_figma.js` is the body of an async function written against the Figma Plugin API. Any tool that can run such a script in the file and hand back its return value will do; choose the tool by that capability, not by name. The script only reads: it creates, changes, and binds nothing.

1. In the script, set `NODE_ID` to the frame. In the frame's link, `node-id=12-345` is node `12:345`. The frame may be on any page; the script loads that page before reading it.
2. Run it with `OFFSET = 0` and save the returned JSON, as returned, as `page-0.json`.
3. While the result's `nextOffset` is not `null`, run it again with `OFFSET` set to that value, and save each result as its own file.
4. Merge the pages into one spec:

```sh
node scripts/figma_to_spec.mjs --parts page-0.json page-1.json page-2.json --out reference.spec.json
```

It is paged because script tools cap what one run may return at about 20 kB. Each page stays under 18,000 characters and says where the next one starts; `total` on the first page is the node count, and a page holds roughly 30 nodes. Leave `LIMIT` alone. The merge takes the files in any order, each as the returned object, as a JSON string of it, or wrapped in `{ "result": … }`. Hidden layers and layers at 0% effective opacity are left out with everything inside them. A vector is one `icon`; so is a group, frame, or instance up to 128px that paints nothing itself and holds only shapes.

The merge exits with code 1 and writes nothing when the pages are not one complete capture:

| Message | Cause | Do |
|---|---|---|
| `The capture script reported: …` | A page holds the script's own error: `NODE_ID` matches no node, or names a page or an invisible layer | Correct `NODE_ID` and start again from `OFFSET = 0` |
| `Missing nodes 120–239 of 400. Run the capture again with OFFSET = 120.` | A page was not saved, or not passed | Run that offset and add its page |
| `Nodes 120–139 of 400 appear in more than one page.` | The same offset was saved twice | Keep one file per offset |
| `Pages disagree on the node count (400 vs 412)` | The frame changed between runs, or pages of two frames were mixed | Capture again from `OFFSET = 0` |
| `A page is not the output of extract_figma.js`, or `The first page … is not among the pages` | The file holds something else (a tool's log, a cut-off result), or page 0 lost its `surface` | Save the returned JSON whole |

**The reference screenshot.** Export the same frame as PNG at 2x (or 1x). The picture must be the frame alone and exactly its size times a whole number. A screenshot scaled to fit a size limit, or an export that grew to include a shadow around the frame, is reported as a size mismatch and cannot reach parity.

```sh
node scripts/parity.mjs --reference reference.spec.json --reference-image frame@2x.png \
  --url <implementation> --root <selector> --out <folder>/cycle-01
```

The cycle reads the export's density off its width and captures the implementation at the same density; `--reference-density` states it when the width does not say (a picture that is not a whole multiple of the frame). The two pictures come from different renderers: `--renderer other` selects the looser colour threshold for that, and it is already the default when the two specs' platforms differ, as `figma` and `web` do.

**Fonts.** A text layer whose font is not available where the script runs is drawn by Figma in a fallback. The script records those families as not loaded and sets `fonts.aligned: false`, which makes the reference's text metrics untrusted (`parity-policy.md`). Run the capture where the file's fonts are available.

## Figma reference, with read-only tools only

When no tool can run scripts, read the frame's node tree instead, with any tool that returns ids, names, sizes, and positions (commonly called `get_metadata`). Save the XML of that one frame and convert it:

```sh
node scripts/figma_to_spec.mjs --metadata frame.xml --out reference.spec.json --name "Home"
```

Some tools give positions relative to the parent, others relative to the canvas. The converter lays the tree out both ways, keeps the reading that puts more nodes inside the frame, and prints which one it chose. `--name` is optional; the default is the frame's name. Export the frame as PNG as above. The result is a geometry-only spec: rectangles, names, and the tree, and nothing about fills, borders, radii, shadows, or type. What a cycle run from it establishes:

| | |
|---|---|
| Checked | Geometry (sizes and redlines of boxes, icons, and text layers) and, with the PNG, pixels. The best verdict is `PARITY ✓ for geometry and pixels only`. |
| Not checked | Appearance. No colour, border, radius, shadow, or type finding is produced; those differences show only as pixel regions, so the PNG is not optional here. |
| Text | A text node's words are its layer name, which is the text only while the layer was never renamed. Its box can be wider than the words, so sideways measurements of text are untrusted (`parity-policy.md`). |
| Wrappers | What a frame paints is unknown, so every frame counts as a primitive. A frame with children that finds no counterpart is not reported as missing, and an implementation box with no counterpart is not reported as extra. |
| Pairing | Weaker than with a measured reference, because only words, positions, and sizes are known. A layer other than text may pair with any element other than text: an image fill arrives as a rectangle and still pairs with an `<img>`. A frame with children pairs by the words it holds, and otherwise last and only with a close fit, so that it does not take the counterpart of the layer inside it. A thin rectangle along a box whose counterpart has a border there is read as that border. Check a "no counterpart" finding against the picture and pair by hand with `--map` (`reading-results.md`). |

For every element a cycle flags, by a geometry finding or a pixel region, read its appearance from the design with the tools at hand (the design context of that node for layout, fills, type, and effects; the variable definitions for token names) and fix from those values, never from the picture.

## Image-only reference

A PNG export or a screenshot with no design file behind it gives nothing to measure. There is no reference spec, so a cycle cannot run. The picture can still be compared: capture the implementation with `capture_web.mjs`, then overlay the two pictures.

```sh
node scripts/pixel_diff.mjs --reference design.png --implementation <folder>/implementation.png \
  --spec <folder>/implementation.spec.json --reference-density 2 --implementation-density 2 \
  --renderer other --out <folder>/pixels
```

Treat each region as a lead, not a finding: open its crop and, for that region only, compare what can be read by eye. Mark the result as estimated in the report, and apply no fix under 2px from estimated values.

The image must show the surface alone, edge to edge. Its density is its pixel width divided by the surface's width in CSS px, and has to be a whole number; state both densities, because both default to the spec's. `--spec` names the element each region falls on, and `--ignore` takes the same file as a cycle. The command writes `pixel-diff.png`, `pixel-diff.json`, and a crop for each of the 12 largest regions under `regions/`; it exits with code 0 when there is no region and the sizes match, 1 otherwise, 2 when it could not run. Regions and crops read as in `reading-results.md`, except that no finding explains them.

## Native app (reference or implementation)

There is no bundled extractor for React Native, Flutter, iOS, or Android, and a cycle cannot capture a native screen. What works:

- **Pixels.** A simulator or device screenshot goes through `pixel_diff.mjs` as above, with `--renderer other` and the screenshot's density. Densities must be whole multiples of each other: against a 3x screenshot, capture the web side at `--dpr 3` or `--dpr 1`. Crop the picture to the surface, or exclude the status bar and home indicator with `--ignore`.
- **Geometry.** Assemble a geometry-only spec by hand from the platform's view-hierarchy dump and compare it with `parity_diff.mjs` (below). It needs `surface.platform` (`ios`, `android`, `react-native`, or `flutter`), `surface.root` with `width` and `height`, `surface.fidelity: "geometry-only"`, and for each view `id`, `parent`, `name`, `kind`, `paints: true`, `rect`, and `text` on text: the node shape in `ui-spec.md`. Units are CSS px from the root's top-left corner: pt, dp, and logical px are 1:1; divide raw pixels by the device density.
- **Appearance** is not measured. For the elements that regions and geometry findings point at, read the values from the source or the platform inspector and compare them by hand.

| Platform | Screenshot | Frames of the view hierarchy |
|---|---|---|
| iOS | `xcrun simctl io booted screenshot` | Xcode's view hierarchy debugger, or `debugDescription` of the app in a UI test (pt) |
| Android | `adb exec-out screencap -p` | `adb shell uiautomator dump` (px), or the Layout Inspector |
| React Native | as for the OS it runs on | `measure()` or `onLayout`, or the in-app element inspector (dp) |
| Flutter | as for the OS it runs on | `debugDumpRenderTree()`, or the DevTools widget inspector (logical px) |

The comparison prints the findings and writes them as JSON; there is no verdict and no join with the pixel regions. This path is documented but not exercised by the bundled benchmark.

```sh
node scripts/parity_diff.mjs --reference reference.spec.json --implementation implementation.spec.json \
  --output <folder>/findings.json
```

## What a web capture does not see

| Not measured | Recorded instead |
|---|---|
| Inside a shadow root | The host element's box; slotted children are measured |
| Inside an `<iframe>`, `<canvas>`, or `<video>` | One `image` node for the element |
| The words inside a form control, in place | A text node for the value, the chosen option, or the placeholder of an empty control, placed by calculation: at the start of the control's content box, centred vertically (at the top in a text area), as wide as the words measure in the control's font. A password's value and controls that show no text have none. |
| Inside an `<svg>` | One `icon` node: a hash of its markup, and the first shape's stroke and fill |
| The position of `::before` and `::after` | Their look, size, and declared offsets, on the host node (`pseudo`); they have no measured box |
| Elements outside the root | Nothing. A dialog, toast, or menu rendered elsewhere in `body` can be in the screenshot and not in the spec; choose a root that contains it. |
| Stacking order | Nothing. An element drawn underneath another has every property right; only the picture shows it. |
| Cross-origin stylesheets | Unreadable, so `tokenRefs` can be incomplete. Measured values are unaffected. |

The pixel check covers all of these areas: what differs there appears as a region, usually an unexplained one.

## Verification status

- **Web capture, the three checks, and the cycle** are exercised end to end by `node tests/run_benchmark.mjs`: two pages, 72 seeded differences, 9 equivalent rewrites, and 2 unchanged controls.
- **The Figma script, the page merge, and the metadata fallback** are tested only against a stand-in for the Plugin API and against hand-written metadata (`node --test tests/unit.test.mjs`). They have not yet been run against a real Figma file. To confirm on first real use: a frame that is not on the file's first page, the gradient angle conversion, text box anchors, stroke alignment, grid frames, the missing-font flag, and the pixel thresholds against Figma exports.
- **Native apps** are documented and not exercised by the benchmark.
