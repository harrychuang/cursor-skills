// Node-based verification for the plugin's pure helpers.
// Run: node test/verify-pure-functions.cjs   (from the plugin root, after npm run build)
"use strict";

const assert = require("node:assert");

// code.js calls figma.showUI / figma.ui.postMessage at load time; stub the
// plugin globals so the script body can execute under Node.
globalThis.figma = {
  notify() {},
  showUI() {},
  ui: {
    onmessage: null,
    postMessage() {},
  },
};
globalThis.__html__ = "";

const plugin = require("../code.js");

function approx(actual, expected, tolerance, label) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected} +/- ${tolerance}, got ${actual}`,
  );
}

// --- Robust color parsing -------------------------------------------------

// Spec example: eight-digit hex with alpha (#33667780).
const eightDigitHex = plugin.colorFromCss("#33667780");
approx(eightDigitHex.r, 0.2, 0.01, "#33667780 r");
approx(eightDigitHex.g, 0.4, 0.01, "#33667780 g");
approx(eightDigitHex.b, 0.4667, 0.01, "#33667780 b");
approx(eightDigitHex.a, 0.5, 0.01, "#33667780 a");

// Spec scenario: hsl token value hsl(210, 50%, 40%) -> rgb(0.2, 0.4, 0.6).
const hsl = plugin.colorFromCss("hsl(210, 50%, 40%)");
approx(hsl.r, 0.2, 0.005, "hsl r");
approx(hsl.g, 0.4, 0.005, "hsl g");
approx(hsl.b, 0.6, 0.005, "hsl b");
approx(hsl.a, 1, 0.001, "hsl a");

// Modern space syntax with slash alpha.
const spaceSyntax = plugin.colorFromCss("rgb(255 0 0 / 0.5)");
approx(spaceSyntax.r, 1, 0.001, "rgb space r");
approx(spaceSyntax.g, 0, 0.001, "rgb space g");
approx(spaceSyntax.a, 0.5, 0.001, "rgb space a");

// Four-digit hex.
const fourDigitHex = plugin.colorFromCss("#f008");
approx(fourDigitHex.r, 1, 0.001, "#f008 r");
approx(fourDigitHex.a, 0x88 / 255, 0.005, "#f008 a");

// Legacy forms keep working.
const legacyRgba = plugin.colorFromCss("rgba(51, 102, 119, 0.25)");
approx(legacyRgba.r, 0.2, 0.005, "legacy rgba r");
approx(legacyRgba.a, 0.25, 0.001, "legacy rgba a");

// Unparseable values keep the black fallback.
const fallback = plugin.colorFromCss("definitely-not-a-color");
assert.deepStrictEqual(fallback, { a: 1, b: 0, g: 0, r: 0 }, "fallback black");

// --- Arbitrary gradient angle ----------------------------------------------

// Spec scenario: 45deg diagonal (bottom-left toward top-right).
const transform45 = plugin.getLinearGradientTransform(45);
approx(transform45[0][0], Math.SQRT1_2, 0.001, "45deg m00");
approx(transform45[0][1], -Math.SQRT1_2, 0.001, "45deg m01");
approx(transform45[0][2], 0.5, 0.001, "45deg m02");
approx(transform45[1][0], Math.SQRT1_2, 0.001, "45deg m10");
approx(transform45[1][1], Math.SQRT1_2, 0.001, "45deg m11");
approx(transform45[1][2], 0.5 - Math.SQRT1_2, 0.001, "45deg m12");

// Axis-aligned angles keep their previous meaning.
const transform90 = plugin.getLinearGradientTransform(90);
approx(transform90[0][0], 1, 0.001, "90deg m00");
approx(transform90[0][1], 0, 0.001, "90deg m01");
approx(transform90[1][0], 0, 0.001, "90deg m10");
const transform180 = plugin.getLinearGradientTransform(180);
approx(transform180[0][0], 0, 0.001, "180deg m00");
approx(transform180[0][1], 1, 0.001, "180deg m01");
approx(transform180[0][2], 0, 0.001, "180deg m02");
approx(transform180[1][0], -1, 0.001, "180deg m10");
approx(transform180[1][2], 1, 0.001, "180deg m12");

// --- Weight/italic font style candidates ------------------------------------

// Spec examples: weight-to-style candidates.
assert.strictEqual(plugin.getFontStyleCandidates(300)[0], "Light", "300 -> Light");
assert.strictEqual(
  plugin.getFontStyleCandidates(300)[1],
  "Regular",
  "300 fallback Regular",
);
assert.strictEqual(
  plugin.getFontStyleCandidates(400, true)[0],
  "Italic",
  "400 italic -> Italic",
);
assert.strictEqual(
  plugin.getFontStyleCandidates(700, true)[0],
  "Bold Italic",
  "700 italic -> Bold Italic",
);
assert.ok(
  plugin.getFontStyleCandidates(700, true).includes("Bold"),
  "700 italic falls back to Bold",
);
assert.strictEqual(plugin.getFontStyleCandidates(900)[0], "Black", "900 -> Black");
assert.ok(
  plugin.getFontStyleCandidates(900).includes("ExtraBold") &&
    plugin.getFontStyleCandidates(900).includes("Bold"),
  "900 falls back through ExtraBold and Bold",
);
assert.strictEqual(plugin.getFontStyleCandidates(100)[0], "Thin", "100 -> Thin");

// --- Font style name weight parsing ----------------------------------------

// Spec scenario: Japanese W-number styles resolve without family fallback.
assert.deepStrictEqual(
  plugin.parseFontStyleWeight("W6"),
  { italic: false, weight: 600 },
  "W6 -> 600 upright",
);
assert.deepStrictEqual(
  plugin.parseFontStyleWeight("W3"),
  { italic: false, weight: 300 },
  "W3 -> 300 upright",
);
assert.deepStrictEqual(
  plugin.parseFontStyleWeight("Bold Italic"),
  { italic: true, weight: 700 },
  "Bold Italic -> 700 italic",
);
assert.deepStrictEqual(
  plugin.parseFontStyleWeight("300"),
  { italic: false, weight: 300 },
  "numeric style name -> 300",
);
assert.deepStrictEqual(
  plugin.parseFontStyleWeight("Italic"),
  { italic: true, weight: 400 },
  "bare Italic -> 400 italic",
);
assert.strictEqual(
  plugin.parseFontStyleWeight("53 Extension"),
  undefined,
  "unparseable style -> undefined",
);

// Spec example: nearest-weight resolution from available styles.
assert.strictEqual(
  plugin.selectNearestFontStyle(["W3", "W6"], 700, false),
  "W6",
  "700 from W3/W6 -> W6",
);
assert.strictEqual(
  plugin.selectNearestFontStyle(["W3", "W6"], 400, false),
  "W3",
  "400 from W3/W6 -> W3",
);
assert.strictEqual(
  plugin.selectNearestFontStyle(["W3", "W6"], 500, false),
  "W6",
  "500 tie prefers the heavier W6",
);
assert.strictEqual(
  plugin.selectNearestFontStyle(["100", "300", "500"], 300, false),
  "300",
  "exact numeric match wins",
);
assert.strictEqual(
  plugin.selectNearestFontStyle(["W3", "W6"], 700, true),
  "W6",
  "italic request falls back to upright when no italic exists",
);
assert.strictEqual(
  plugin.selectNearestFontStyle(["53 Extension"], 400, false),
  undefined,
  "no parseable styles -> undefined",
);

// --- CSS font-family fallback normalization -------------------------------

const cssFontStack = '"Helvetica Neue", Helvetica, "Arial Narrow", Arial, sans-serif';
assert.deepStrictEqual(
  plugin.getFontFamilyCandidates(cssFontStack),
  ["Helvetica Neue", "Helvetica", "Arial Narrow", "Arial"],
  "quoted CSS fallback list parses in source order and omits the generic family",
);
assert.deepStrictEqual(
  plugin.getFontFamilyCandidates('"Font, Display", Inter, serif'),
  ["Font, Display", "Inter"],
  "commas inside quoted family names are preserved",
);
assert.strictEqual(
  plugin.normalizeVariableValue({
    collection: "ref",
    cssName: "--fx-ref-typeface-grotesque",
    figmaName: "ref/typeface/grotesque",
    rawValue: cssFontStack,
    scopes: ["FONT_FAMILY"],
    type: "STRING",
    value: 'Helvetica Neue", Helvetica, "Arial Narrow", Arial, sans-serif',
  }),
  "Helvetica Neue",
  "legacy multi-family token values normalize before Figma variable write",
);
assert.strictEqual(
  plugin.normalizeVariableValue({
    collection: "ref",
    cssName: "--fx-ref-copy-example",
    figmaName: "ref/copy/example",
    rawValue: "Hello, world",
    scopes: ["TEXT_CONTENT"],
    type: "STRING",
    value: "Hello, world",
  }),
  "Hello, world",
  "non-font string variables retain commas",
);
const fontTokenMap = new Map([
  [
    "--fx-comp-caption-font-family",
    { alias: "--fx-sys-label-family", cssName: "--fx-comp-caption-font-family" },
  ],
  [
    "--fx-sys-label-family",
    { alias: "--fx-ref-copy-example", cssName: "--fx-sys-label-family" },
  ],
  ["--fx-ref-copy-example", { cssName: "--fx-ref-copy-example" }],
]);
const fontFamilyTokenNames = plugin.collectFontFamilyTokenNames(
  {
    bindings: { fontFamily: "--fx-comp-caption-font-family" },
    children: [],
  },
  fontTokenMap,
);
assert.deepStrictEqual(
  Array.from(fontFamilyTokenNames),
  [
    "--fx-comp-caption-font-family",
    "--fx-sys-label-family",
    "--fx-ref-copy-example",
  ],
  "font-family binding marks its complete alias chain for legacy normalization",
);
assert.strictEqual(
  plugin.normalizeVariableValue(
    {
      collection: "ref",
      cssName: "--fx-ref-copy-example",
      figmaName: "ref/copy/example",
      rawValue: cssFontStack,
      scopes: ["TEXT_CONTENT"],
      type: "STRING",
      value: 'Helvetica Neue", Helvetica, "Arial Narrow", Arial, sans-serif',
    },
    fontFamilyTokenNames,
  ),
  "Helvetica Neue",
  "binding-derived font tokens normalize even when an old payload has TEXT_CONTENT scope",
);

// --- Payload compatibility ---------------------------------------------------

// A minimal legacy payload (no new fields) parses without throwing.
const legacyPayload = {
  componentTitle: "Button",
  generatedAt: "2026-01-01T00:00:00.000Z",
  root: {
    kind: "frame",
    name: "button",
    styles: { height: 32, width: 120, x: 0, y: 0 },
    children: [
      {
        kind: "text",
        name: "label",
        text: "OK",
        styles: { height: 16, width: 24, x: 8, y: 8 },
      },
    ],
  },
  storyId: "components-button--primary",
  storyName: "Primary",
  tokens: [],
  version: 1,
};
assert.doesNotThrow(
  () => plugin.parsePayload(JSON.stringify(legacyPayload)),
  "legacy v1 payload parses",
);

// A payload using the new optional fields parses.
const modernPayload = {
  ...legacyPayload,
  version: 2,
  root: {
    ...legacyPayload.root,
    styles: {
      ...legacyPayload.root.styles,
      counterAxisSpacing: 12,
      effects: [
        {
          blur: 12,
          color: "rgba(0, 0, 0, 0.25)",
          offsetX: 0,
          offsetY: 4,
          spread: 0,
          type: "DROP_SHADOW",
        },
      ],
      layoutWrap: "WRAP",
      letterSpacing: 0.5,
      radiusCorners: { bottomLeft: 0, bottomRight: 0, topLeft: 8, topRight: 8 },
      textDecoration: "UNDERLINE",
    },
  },
};
assert.doesNotThrow(
  () => plugin.parsePayload(JSON.stringify(modernPayload)),
  "payload with new optional fields parses",
);

// Spec scenario: effects with an invalid type is rejected with a path.
const badPayload = {
  ...legacyPayload,
  root: {
    ...legacyPayload.root,
    styles: { ...legacyPayload.root.styles, effects: "shadow" },
  },
};
assert.throws(
  () => plugin.parsePayload(JSON.stringify(badPayload)),
  (error) => error.message.includes("root") && error.message.includes("effects"),
  "string effects rejected with node path",
);

// --- Fidelity fields added in payload schema 2 (plugin 1.3.0) ---------------

// Named colors and transparent fall back sensibly instead of black.
const white = plugin.colorFromCss("white");
approx(white.r, 1, 0.001, "named white r");
approx(white.g, 1, 0.001, "named white g");
approx(white.b, 1, 0.001, "named white b");
const transparent = plugin.colorFromCss("transparent");
approx(transparent.a, 0, 0.001, "transparent alpha");

// Strict color parsing returns undefined for formats it cannot represent,
// so binding guards never compare against the black fallback.
const strictWhite = plugin.colorFromCssStrict("white");
approx(strictWhite.r, 1, 0.001, "strict named white r");
assert.strictEqual(
  plugin.colorFromCssStrict("oklch(0.7 0.15 200)"),
  undefined,
  "strict parser refuses formats it cannot faithfully parse",
);
assert.strictEqual(
  plugin.colorFromCssStrict("url(#gradient)"),
  undefined,
  "strict parser refuses non-color paints",
);

// overflow auto/scroll clip like the browser; visible does not.
assert.strictEqual(plugin.shouldClipContent("auto"), true, "overflow auto clips");
assert.strictEqual(plugin.shouldClipContent("scroll"), true, "overflow scroll clips");
assert.strictEqual(plugin.shouldClipContent("hidden auto"), true, "mixed overflow clips");
assert.strictEqual(plugin.shouldClipContent("visible"), false, "overflow visible does not clip");
assert.strictEqual(plugin.shouldClipContent(undefined), false, "missing overflow does not clip");

// SVG root sizing: intrinsic size becomes the viewBox so resizing scales.
const resized = plugin.setSvgRootSize(
  '<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h24v24H0z"/></svg>',
  16,
  16,
);
assert.match(resized, /viewBox="0 0 24 24"/, "intrinsic size becomes viewBox");
assert.match(resized, /width="16"/, "root width rewritten to rendered size");
assert.match(resized, /height="16"/, "root height rewritten to rendered size");
const keepsViewBox = plugin.setSvgRootSize(
  '<svg viewBox="0 0 48 48" width="48"><rect/></svg>',
  20,
  20,
);
assert.match(keepsViewBox, /viewBox="0 0 48 48"/, "existing viewBox preserved");
assert.match(keepsViewBox, /width="20"/, "width rewritten alongside viewBox");
assert.match(keepsViewBox, /height="20"/, "missing height attribute added");
const percentSvg = plugin.setSvgRootSize('<svg width="100%"><rect/></svg>', 32, 8);
assert.doesNotMatch(percentSvg, /viewBox/, "percentage size never fabricates a viewBox");

// New payload fields parse: fixed-width height growth, blur effects, border
// style, radial gradients, frame-level background images. Blur types are
// also tolerated inside `effects` for hand-written payloads.
const fidelityPayload = {
  ...legacyPayload,
  version: 2,
  reference: {
    height: 120,
    imageBase64: "aGVsbG8=",
    imageMimeType: "image/png",
    width: 240,
  },
  root: {
    ...legacyPayload.root,
    imageBase64: "aGVsbG8=",
    imageMimeType: "image/png",
    styles: {
      ...legacyPayload.root.styles,
      transformMatrix: [
        [0.707107, -0.707107, 40],
        [0.707107, 0.707107, 11.72],
      ],
      backgroundRadialGradient: {
        stops: [
          { color: "#ff0000", position: 0 },
          { color: "#0000ff", position: 1 },
        ],
      },
      blurEffects: [
        { blur: 6, offsetX: 0, offsetY: 0, spread: 0, type: "LAYER_BLUR" },
        { blur: 10, offsetX: 0, offsetY: 0, spread: 0, type: "BACKGROUND_BLUR" },
      ],
      borderStyle: "dashed",
      effects: [
        { blur: 4, offsetX: 0, offsetY: 0, spread: 0, type: "LAYER_BLUR" },
      ],
    },
    children: [
      {
        kind: "text",
        name: "wrapped-paragraph",
        text: "wraps across lines",
        styles: {
          height: 40,
          textGrowHeight: true,
          width: 200,
          x: 0,
          y: 0,
        },
      },
      {
        kind: "text",
        name: "hand-written-height",
        text: "explicit HEIGHT mode",
        styles: {
          height: 40,
          textAutoResize: "HEIGHT",
          width: 200,
          x: 0,
          y: 44,
        },
      },
    ],
  },
};
assert.doesNotThrow(
  () => plugin.parsePayload(JSON.stringify(fidelityPayload)),
  "payload with 1.3.0 fidelity fields parses",
);

assert.throws(
  () =>
    plugin.parsePayload(
      JSON.stringify({
        ...legacyPayload,
        root: {
          ...legacyPayload.root,
          styles: { ...legacyPayload.root.styles, textGrowHeight: "yes" },
        },
      }),
    ),
  (error) => error.message.includes("textGrowHeight"),
  "non-boolean textGrowHeight rejected",
);

assert.throws(
  () =>
    plugin.parsePayload(
      JSON.stringify({
        ...legacyPayload,
        root: {
          ...legacyPayload.root,
          styles: {
            ...legacyPayload.root.styles,
            transformMatrix: [[1, 0], [0, 1]],
          },
        },
      }),
    ),
  (error) => error.message.includes("transformMatrix"),
  "malformed transform matrix rejected",
);

assert.throws(
  () =>
    plugin.parsePayload(
      JSON.stringify({
        ...legacyPayload,
        reference: { imageBase64: "", imageMimeType: "image/png", height: 1, width: 1 },
      }),
    ),
  (error) => error.message.includes("reference"),
  "empty reference image rejected",
);

assert.throws(
  () =>
    plugin.parsePayload(
      JSON.stringify({
        ...legacyPayload,
        root: {
          ...legacyPayload.root,
          styles: { ...legacyPayload.root.styles, borderStyle: "double" },
        },
      }),
    ),
  (error) => error.message.includes("borderStyle"),
  "unsupported borderStyle rejected",
);

assert.throws(
  () =>
    plugin.parsePayload(
      JSON.stringify({
        ...legacyPayload,
        root: {
          ...legacyPayload.root,
          styles: {
            ...legacyPayload.root.styles,
            backgroundRadialGradient: { stops: [{ color: "#fff", position: 0 }] },
          },
        },
      }),
    ),
  (error) => error.message.includes("backgroundRadialGradient"),
  "radial gradient with a single stop rejected",
);

// --- Variant group selection ----------------------------------------------

function variantEntry(sourceName, variant, depth) {
  return { component: { name: sourceName, sourceName, variant }, depth };
}

// Spec scenario: all-variants story still produces a component set.
// Root-most group matching the title holds two variants.
const allVariants = plugin.selectVariantGroup(
  [[variantEntry("switch", "on", 1), variantEntry("switch", "off", 1)]],
  "Components/Switch",
);
assert.equal(allVariants.selectedIndex, 0, "all-variants group selected");
assert.equal(allVariants.selectedIdentity, "switch", "all-variants identity");
assert.deepEqual(allVariants.skippedIdentities, [], "all-variants skipped none");

// Spec scenario: single-variant group matching the component title is selected.
// Spec example: Broker Import Menu containing three Icon variants.
const brokerImportMenu = plugin.selectVariantGroup(
  [
    [variantEntry("broker-import-menu", "with-timestamp", 1)],
    [
      variantEntry("icon", "chevronDown-xs", 3),
      variantEntry("icon", "refresh-xs", 3),
      variantEntry("icon", "edit-xs", 3),
    ],
  ],
  "Broker Import Menu",
);
assert.equal(brokerImportMenu.selectedIndex, 0, "title match beats variant count");
assert.equal(
  brokerImportMenu.selectedIdentity,
  "broker-import-menu",
  "matched identity wins over the larger nested group",
);
assert.deepEqual(
  brokerImportMenu.skippedIdentities,
  ["icon"],
  "nested icon group reported as skipped",
);

// Spec scenario: nested group is rejected when no group matches the title.
// The only multi-variant group sits below the root-most depth.
const nestedOnly = plugin.selectVariantGroup(
  [
    [variantEntry("broker-import-menu", "with-timestamp", 1)],
    [
      variantEntry("icon", "chevronDown-xs", 3),
      variantEntry("icon", "refresh-xs", 3),
    ],
  ],
  "Unrelated Title",
);
assert.equal(nestedOnly.selectedIndex, -1, "nested group never replaces the root");
assert.equal(nestedOnly.selectedIdentity, "", "no identity when nothing qualifies");
assert.deepEqual(
  nestedOnly.skippedIdentities,
  ["broker-import-menu", "icon"],
  "all candidates reported when nothing qualifies",
);

// Regression guard: a title that does not match still resolves through the
// existing no-selection path rather than hijacking the single-variant group.
const textLink = plugin.selectVariantGroup(
  [[variantEntry("text-link", "inline", 1)]],
  "Actions/Text Link",
);
assert.equal(textLink.selectedIndex, -1, "unmatched single variant selects nothing");
assert.deepEqual(
  textLink.skippedIdentities,
  ["text-link"],
  "unmatched single variant reported as skipped",
);

// Selection never throws on degenerate input.
assert.equal(
  plugin.selectVariantGroup([], "Anything").selectedIndex,
  -1,
  "empty group list selects nothing",
);
assert.equal(
  plugin.selectVariantGroup([[]], "").selectedIndex,
  -1,
  "empty group and empty title select nothing",
);

// --- Font environment fault report -----------------------------------------

// A substitution record as the import writes it. A loaded family that differs
// from the requested one means every style of the requested family failed.
function substitution(requestedFamily, loadedFamily, loadedStyle, attemptedStyles = []) {
  return {
    attemptedStyles,
    loadedFamily,
    loadedStyle,
    nodePath: `${requestedFamily}-node`,
    requestedFamily,
    requestedWeight: 700,
  };
}

// Spec scenario: no substitution at all is not an environment fault.
assert.deepStrictEqual(
  plugin.detectFontEnvironmentFault([]),
  { families: [], isEnvironmentFault: false },
  "zero substitutions are not an environment fault",
);

// Spec scenario: a single missing family is not an environment fault. Two
// nodes requesting the same family still name one family.
const singleFamilyFault = plugin.detectFontEnvironmentFault([
  substitution("Hiragino Mincho ProN", "Noto Serif JP", "Regular"),
  substitution("Hiragino Mincho ProN", "Noto Serif JP", "Regular"),
]);
assert.deepStrictEqual(
  singleFamilyFault,
  { families: ["Hiragino Mincho ProN"], isEnvironmentFault: false },
  "one failing family is not an environment fault",
);

// Spec scenario: two failing families are an environment fault, and both
// requested family names come back.
const twoFamilyFault = plugin.detectFontEnvironmentFault([
  substitution("Hiragino Kaku Gothic ProN", "Noto Sans JP", "Bold"),
  substitution("Hiragino Mincho ProN", "Noto Serif JP", "Regular"),
]);
assert.deepStrictEqual(
  twoFamilyFault,
  {
    families: ["Hiragino Kaku Gothic ProN", "Hiragino Mincho ProN"],
    isEnvironmentFault: true,
  },
  "two failing families are an environment fault naming both families",
);

// A style-only substitution means the requested family did load, so it never
// counts toward the environment fault even alongside a failing family.
assert.deepStrictEqual(
  plugin.detectFontEnvironmentFault([
    substitution("Hiragino Kaku Gothic ProN", "Hiragino Kaku Gothic ProN", "W6"),
    substitution("Hiragino Mincho ProN", "Noto Serif JP", "Regular"),
  ]),
  { families: ["Hiragino Mincho ProN"], isEnvironmentFault: false },
  "a loaded family with a substituted style is not a failing family",
);

// Degenerate records never throw.
assert.deepStrictEqual(
  plugin.detectFontEnvironmentFault(undefined),
  { families: [], isEnvironmentFault: false },
  "absent substitution list is not an environment fault",
);
assert.deepStrictEqual(
  plugin.detectFontEnvironmentFault([null, {}, { requestedFamily: "", loadedFamily: "Inter" }]),
  { families: [], isEnvironmentFault: false },
  "records with missing fields are skipped without throwing",
);

// Spec scenario: attempted styles include the W-number style the
// available-style resolution tried, not only the pre-resolution candidates.
// The candidate names for weight 700 never contain W6, and W6 only appears
// once the family's own style list is consulted — so a recorded W6 attempt
// can only have come from the available-style stage returning it.
const weight700Candidates = plugin.getFontStyleCandidates(700);
assert.ok(
  !weight700Candidates.includes("W6"),
  "candidate style names never contain the W-number style",
);
assert.strictEqual(
  plugin.selectNearestFontStyle(["W3", "W6"], 700, false),
  "W6",
  "available-style resolution attempts W6 for weight 700",
);
const recordedAttempts = substitution(
  "Hiragino Kaku Gothic ProN",
  "Noto Sans JP",
  "Bold",
  weight700Candidates.concat([plugin.selectNearestFontStyle(["W3", "W6"], 700, false)]),
).attemptedStyles;
assert.ok(
  recordedAttempts.includes("W6"),
  "the substitution record carries the available-style W-number attempt",
);
assert.ok(
  recordedAttempts.indexOf("Bold") < recordedAttempts.indexOf("W6"),
  "candidate styles are attempted before the available-style resolution",
);

// Spec scenario: two failing families are reported as an environment fault.
const twoFamilyReport = plugin.formatFontEnvironmentFaultWarning(
  plugin.detectFontEnvironmentFault([
    substitution("Hiragino Kaku Gothic ProN", "Noto Sans JP", "Bold"),
    substitution("Hiragino Mincho ProN", "Noto Serif JP", "Regular"),
  ]),
);
assert.ok(twoFamilyReport, "two failing families produce an environment fault report");
assert.match(
  twoFamilyReport,
  /All local fonts failed to load/,
  "report explains that local fonts cannot be loaded at all",
);
assert.ok(
  twoFamilyReport.includes("Hiragino Kaku Gothic ProN") &&
    twoFamilyReport.includes("Hiragino Mincho ProN"),
  "report names both failing families",
);
assert.match(
  twoFamilyReport,
  /restart Figma or check font access permissions/i,
  "report states the corrective action",
);

// Spec scenario: a single missing family is not an environment fault, so the
// report adds nothing and the per-family messages stand alone.
assert.equal(
  plugin.formatFontEnvironmentFaultWarning(
    plugin.detectFontEnvironmentFault([
      substitution("Hiragino Mincho ProN", "Noto Serif JP", "Regular"),
    ]),
  ),
  undefined,
  "single failing family adds no environment fault report",
);

console.log("verify-pure-functions: all assertions passed");
