// Browser verification for the exporter: bundles domExport, renders
// test/export-fixture.html in headless Chromium, and asserts the exported
// payload against the figma-export-capture spec scenarios.
// Run from the addon root: node test/run-export-fixture.mjs
import assert from "node:assert";
import { execFile, execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const addonRoot = path.dirname(testDir);
const bundlePath = path.join(testDir, ".export-fixture.bundle.js");
const payloadPath = path.join(testDir, ".last-fixture-payload.json");

function findChromeBinary() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ].filter(Boolean);
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(
      "No Chromium binary found. Set CHROME_PATH to a Chrome/Chromium executable.",
    );
  }
  return found;
}

function buildBundle() {
  const esbuild = path.join(addonRoot, "node_modules", ".bin", "esbuild");
  execFileSync(
    esbuild,
    [
      path.join(testDir, "export-fixture-entry.ts"),
      "--bundle",
      "--format=iife",
      "--global-name=FigmaExportFixture",
      `--outfile=${bundlePath}`,
    ],
    { stdio: "inherit" },
  );
}

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((request, response) => {
      const urlPath = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
      const filePath = path.join(testDir, path.normalize(urlPath).replace(/^\/+/, ""));
      if (!filePath.startsWith(testDir) || !existsSync(filePath)) {
        response.writeHead(404).end("not found");
        return;
      }
      response.writeHead(200, {
        "content-type": contentTypes[path.extname(filePath)] ?? "application/octet-stream",
      });
      response.end(readFileSync(filePath));
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function runChrome(chromeBinary, url) {
  return new Promise((resolve, reject) => {
    execFile(
      chromeBinary,
      [
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--force-device-scale-factor=1",
        "--window-size=1200,900",
        "--virtual-time-budget=600000",
        "--dump-dom",
        url,
      ],
      { maxBuffer: 64 * 1024 * 1024, timeout: 180_000 },
      (error, stdout) => {
        if (error && !stdout) reject(error);
        else resolve(stdout);
      },
    );
  });
}

function extractBase64(dom, elementId) {
  const match = dom.match(
    new RegExp(`<pre id="${elementId}"[^>]*>([A-Za-z0-9+/=]*)</pre>`),
  );
  return match?.[1] ? Buffer.from(match[1], "base64").toString("utf8") : undefined;
}

function findCase(root, name) {
  const node = root.children.find((child) => child.name === name);
  assert.ok(node, `fixture case "${name}" was exported`);
  return node;
}

function pngSize(base64) {
  const bytes = Buffer.from(base64, "base64");
  return { height: bytes.readUInt32BE(20), width: bytes.readUInt32BE(16) };
}

function approx(actual, expected, tolerance, label) {
  assert.ok(
    typeof actual === "number" && Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected} +/- ${tolerance}, got ${actual}`,
  );
}

const NEW_STYLE_KEYS = [
  "backgroundRadialGradient",
  "blurEffects",
  "borderStyle",
  "counterAxisSpacing",
  "effects",
  "fontStyle",
  "imageScaleMode",
  "layoutWrap",
  "letterSpacing",
  "radiusCorners",
  "textDecoration",
  "textGrowHeight",
  "transformMatrix",
];

function assertPayload(payload) {
  const root = payload.root;
  assert.strictEqual(payload.version, 2, "payload version is 2");

  // Modern CSS color normalization
  const oklch = findCase(root, "case-oklch");
  assert.match(
    String(oklch.styles.backgroundColor),
    /^(#[0-9a-f]{6}|rgba?\()/i,
    "oklch background normalized to hex/rgb",
  );
  assert.ok(
    !String(oklch.styles.backgroundColor).includes("oklch"),
    "oklch keyword absent from payload",
  );

  // Shadow capture as effects
  const shadow = findCase(root, "case-shadow");
  assert.strictEqual(shadow.styles.effects?.length, 1, "one drop shadow");
  const dropShadow = shadow.styles.effects[0];
  assert.strictEqual(dropShadow.type, "DROP_SHADOW", "drop shadow type");
  approx(dropShadow.offsetX, 0, 0.01, "shadow offsetX");
  approx(dropShadow.offsetY, 4, 0.01, "shadow offsetY");
  approx(dropShadow.blur, 12, 0.01, "shadow blur");
  approx(dropShadow.spread, 0, 0.01, "shadow spread");
  const inset = findCase(root, "case-inset-shadow");
  assert.strictEqual(inset.styles.effects?.[0]?.type, "INNER_SHADOW", "inset shadow type");

  // Per-corner radius capture
  const corners = findCase(root, "case-corners");
  assert.deepStrictEqual(
    corners.styles.radiusCorners,
    { bottomLeft: 0, bottomRight: 0, topLeft: 8, topRight: 8 },
    "asymmetric corners exported per corner",
  );
  assert.strictEqual(corners.styles.radius, undefined, "no uniform radius with corners");

  // Measured auto-layout spacing
  const marginRow = findCase(root, "case-margin-row");
  assert.strictEqual(marginRow.layoutStrategy, "autoLayout", "margin row stays auto layout");
  approx(marginRow.styles.gap, 12, 0.5, "margin-derived gap");
  const unevenRow = findCase(root, "case-uneven-row");
  assert.strictEqual(unevenRow.layoutStrategy, "absolute", "uneven spacing falls back to absolute");
  const reverse = findCase(root, "case-reverse");
  assert.deepStrictEqual(
    reverse.children.map((child) => child.name),
    ["item-c", "item-b", "item-a"],
    "row-reverse children in visual order",
  );
  approx(reverse.styles.gap, 10, 0.5, "reverse row measured gap");

  // Flex wrap capture
  const wrap = findCase(root, "case-wrap");
  assert.strictEqual(wrap.styles.layoutWrap, "WRAP", "wrap exported");
  approx(wrap.styles.gap, 8, 0.5, "wrap in-line gap");
  approx(wrap.styles.counterAxisSpacing, 12, 0.5, "wrap line spacing");

  // Raster image capture
  const raster = findCase(root, "case-raster");
  assert.strictEqual(raster.kind, "image", "raster node kind");
  assert.ok(raster.imageBase64 && raster.imageBase64.length > 0, "raster base64 present");
  assert.strictEqual(raster.imageMimeType, "image/png", "raster mime type");
  assert.strictEqual(raster.styles.imageScaleMode, "FILL", "object-fit cover maps to FILL");
  const rasterBig = findCase(root, "case-raster-big");
  assert.ok(rasterBig.imageBase64, "big raster captured");
  const bigSize = pngSize(rasterBig.imageBase64);
  assert.strictEqual(bigSize.width, 2048, "big raster downscaled to 2048");
  approx(rasterBig.styles.width, 300, 1, "big raster keeps on-screen width");

  // Text style capture
  const uppercase = findCase(root, "case-uppercase");
  assert.strictEqual(uppercase.text, "SUBMIT ORDER", "uppercase baked into string");
  const multiline = findCase(root, "case-multiline");
  assert.ok(multiline.text?.includes("\n"), "line break preserved");
  const letterSpacing = findCase(root, "case-letterspacing");
  approx(letterSpacing.styles.letterSpacing, 0.5, 0.01, "letter spacing");
  assert.strictEqual(letterSpacing.styles.textDecoration, "UNDERLINE", "underline decoration");
  const italic = findCase(root, "case-italic");
  assert.strictEqual(italic.styles.fontStyle, "italic", "italic font style");
  const fontStack = findCase(root, "case-font-stack");
  assert.strictEqual(
    fontStack.bindings.fontFamily,
    "--fx-comp-caption-font-family",
    "font stack binds through the component token",
  );
  const fontStackRefToken = payload.tokens.find(
    (token) => token.cssName === "--fx-ref-typeface-grotesque",
  );
  assert.ok(fontStackRefToken, "font stack ref token exported");
  assert.strictEqual(
    fontStackRefToken.rawValue,
    '"Helvetica Neue", Helvetica, "Arial Narrow", Arial, sans-serif',
    "font stack raw value preserves the CSS fallback list",
  );
  assert.strictEqual(
    fontStackRefToken.value,
    "Helvetica Neue",
    "font stack variable value is one unquoted Figma family",
  );
  for (const cssName of [
    "--fx-ref-typeface-grotesque",
    "--fx-sys-typescale-label-family",
    "--fx-comp-caption-font-family",
  ]) {
    const token = payload.tokens.find((candidate) => candidate.cssName === cssName);
    assert.deepStrictEqual(token?.scopes, ["FONT_FAMILY"], `${cssName} uses FONT_FAMILY scope`);
  }
  const textShadow = findCase(root, "case-text-shadow");
  assert.strictEqual(
    textShadow.styles.effects?.[0]?.type,
    "DROP_SHADOW",
    "text shadow exported as effect",
  );

  // Token binding correctness
  const mediaToken = findCase(root, "case-media-token");
  assert.strictEqual(
    mediaToken.bindings.backgroundColor,
    undefined,
    "non-matching media query token not bound",
  );
  const specificity = findCase(root, "case-specificity");
  assert.strictEqual(
    specificity.bindings.backgroundColor,
    "--fx-comp-card-color-bg",
    "higher-specificity token wins",
  );

  // Modern color token values
  const accentToken = payload.tokens.find(
    (token) => token.cssName === "--fx-ref-color-teal",
  );
  assert.ok(accentToken, "hsl ref token exported");
  assert.strictEqual(accentToken.type, "COLOR", "hsl token type is COLOR");
  approx(accentToken.value?.r, 0.2, 0.01, "hsl token r");
  approx(accentToken.value?.g, 0.4, 0.01, "hsl token g");
  approx(accentToken.value?.b, 0.6, 0.01, "hsl token b");

  // Shadow DOM traversal capture
  const shadowHost = findCase(root, "case-shadow-dom");
  const shadowInner = shadowHost.children.find((child) => child.name === "shadow-inner");
  assert.ok(shadowInner, "open shadow root content exported as host child");
  approx(shadowInner.styles.width, 120, 1, "shadow inner width");
  approx(shadowInner.styles.height, 40, 1, "shadow inner height");
  assert.match(
    String(shadowInner.styles.backgroundColor),
    /^(#3366ff|rgb\(51, 102, 255\))$/i,
    "shadow inner background resolves the token value",
  );
  assert.strictEqual(
    shadowInner.bindings.backgroundColor,
    "--fx-sys-color-primary",
    "adopted stylesheet token binds inside shadow",
  );

  // Payload compatibility: plain nodes carry no new fields
  const plain = findCase(root, "case-plain");
  for (const key of NEW_STYLE_KEYS) {
    assert.ok(!(key in plain.styles), `plain node has no ${key}`);
  }
  assert.ok(!("imageBase64" in plain), "plain node has no imageBase64");
  assert.ok(!("imageMimeType" in plain), "plain node has no imageMimeType");

  // Mixed inline content keeps bare text runs alongside element children
  const mixedInline = findCase(root, "case-mixed-inline");
  assert.strictEqual(mixedInline.layoutStrategy, "absolute", "mixed inline forces absolute");
  const mixedTexts = mixedInline.children
    .filter((child) => child.kind === "text")
    .map((child) => child.text);
  assert.ok(mixedTexts.includes("Hello"), "leading bare text run exported");
  assert.ok(mixedTexts.includes("tail"), "trailing bare text run exported");
  assert.ok(mixedTexts.includes("bold"), "inline element text exported");
  const boldRun = mixedInline.children.find((child) => child.text === "bold");
  assert.strictEqual(boldRun.styles.fontWeight, 700, "inline strong keeps its weight");
  const helloRun = mixedInline.children.find((child) => child.text === "Hello");
  const tailRun = mixedInline.children.find((child) => child.text === "tail");
  assert.ok(
    helloRun.styles.x < boldRun.styles.x && boldRun.styles.x < tailRun.styles.x,
    "text runs keep their measured order on the line",
  );

  // Wrapped text keeps its width and resizes height only
  const multilineFlex = findCase(root, "case-multiline-flex");
  const wrappedParagraph = multilineFlex.children.find((child) => child.kind === "text");
  assert.ok(wrappedParagraph, "wrapped paragraph exported as text");
  assert.strictEqual(
    wrappedParagraph.styles.textGrowHeight,
    true,
    "wrapped text keeps fixed width and grows height",
  );
  assert.ok(
    !("textAutoResize" in wrappedParagraph.styles),
    "wrapped text never uses hug-width auto-resize",
  );
  approx(wrappedParagraph.styles.width, 220, 1, "wrapped text keeps its wrap width");

  // space-around converts measured edge offsets into padding
  const spaceAround = findCase(root, "case-space-around");
  assert.strictEqual(spaceAround.layoutStrategy, "autoLayout", "space-around stays auto layout");
  approx(spaceAround.styles.paddingLeft, 30, 1, "space-around leading padding");
  approx(spaceAround.styles.paddingRight, 30, 1, "space-around trailing padding");
  approx(spaceAround.styles.gap, 60, 1, "space-around measured gap");

  // CSS border takes layout space, so it folds into the exported padding
  const borderRow = findCase(root, "case-border-row");
  assert.strictEqual(borderRow.layoutStrategy, "autoLayout", "border row stays auto layout");
  approx(borderRow.styles.borderWidth, 3, 0.01, "border row stroke width");
  approx(borderRow.styles.paddingLeft, 11, 0.5, "measured padding includes the border");
  approx(borderRow.styles.paddingTop, 11, 0.5, "declared cross-axis padding adds the border");

  // Column direction reads the row-gap as the main-axis gap
  const columnGap = findCase(root, "case-column-gap");
  approx(columnGap.styles.gap, 14, 0.5, "column flex uses row-gap");

  // CSS background images become frame image fills
  const bgImage = findCase(root, "case-bg-image");
  assert.strictEqual(bgImage.kind, "frame", "background image node stays a frame");
  assert.ok(bgImage.imageBase64 && bgImage.imageBase64.length > 0, "background image captured");
  assert.strictEqual(bgImage.imageMimeType, "image/png", "background image mime type");
  assert.strictEqual(bgImage.styles.imageScaleMode, "FILL", "background-size cover maps to FILL");

  // Multi-layer backgrounds keep both the gradient and the image
  const bgLayers = findCase(root, "case-bg-layers");
  assert.ok(bgLayers.styles.backgroundLinearGradient, "layered background keeps gradient");
  assert.ok(bgLayers.imageBase64, "layered background keeps image");

  // Radial gradients export their stops
  const radial = findCase(root, "case-radial");
  assert.strictEqual(
    radial.styles.backgroundRadialGradient?.stops?.length,
    2,
    "radial gradient stops exported",
  );
  assert.match(
    String(radial.styles.backgroundRadialGradient.stops[0].color),
    /^(#ff0000|rgb\(255, 0, 0\))$/i,
    "radial first stop color",
  );

  // Corner keyword angles follow the box aspect ratio (80x40 -> ~26.57deg)
  const cornerGradient = findCase(root, "case-corner-gradient");
  assert.ok(cornerGradient.styles.backgroundLinearGradient, "corner gradient parsed");
  approx(
    cornerGradient.styles.backgroundLinearGradient.angle,
    26.57,
    1,
    "corner keyword angle uses aspect ratio",
  );

  // -webkit-line-clamp maps to maxLines + ENDING truncation
  const lineClamp = findCase(root, "case-line-clamp");
  assert.strictEqual(lineClamp.styles.maxLines, 2, "line clamp count");
  assert.strictEqual(lineClamp.styles.textTruncation, "ENDING", "line clamp truncation");
  assert.ok(!("textAutoResize" in lineClamp.styles), "clamped text keeps a fixed box");

  // filter/backdrop-filter blur travel as blurEffects (kept apart from
  // shadow effects so older importers still accept the payload)
  const blur = findCase(root, "case-blur");
  assert.strictEqual(blur.styles.blurEffects?.[0]?.type, "LAYER_BLUR", "filter blur type");
  approx(blur.styles.blurEffects[0].blur, 4, 0.01, "filter blur radius");
  assert.ok(!("effects" in blur.styles), "blur never leaks into shadow effects");
  const backdrop = findCase(root, "case-backdrop");
  assert.strictEqual(
    backdrop.styles.blurEffects?.[0]?.type,
    "BACKGROUND_BLUR",
    "backdrop blur type",
  );
  approx(backdrop.styles.blurEffects[0].blur, 6, 0.01, "backdrop blur radius");

  // Dashed borders carry their style
  const dashed = findCase(root, "case-dashed");
  assert.strictEqual(dashed.styles.borderStyle, "dashed", "dashed border style exported");
  approx(dashed.styles.borderWidth, 2, 0.01, "dashed border width");

  // display:contents wrappers lift their children
  const contents = findCase(root, "case-contents");
  assert.strictEqual(contents.children.length, 2, "contents wrapper children lifted");
  assert.ok(
    contents.children.every((child) => child.name === "lifted"),
    "lifted children keep their own identity",
  );

  // Absolute stacking follows z-index, not DOM order
  const zIndex = findCase(root, "case-zindex");
  assert.deepStrictEqual(
    zIndex.children.map((child) => child.name),
    ["z-low", "z-high"],
    "children sorted bottom-to-top by z-index",
  );

  // Form control values export as inner text nodes
  const findLeafText = (node) => {
    if (node.kind === "text") return node;
    for (const child of node.children ?? []) {
      const found = findLeafText(child);
      if (found) return found;
    }
    return undefined;
  };
  const inputValue = findCase(root, "case-input-value");
  const inputValueText = findLeafText(inputValue);
  assert.strictEqual(inputValueText?.text, "Hello value", "input value exported");
  assert.strictEqual(
    inputValueText.styles.textAlignVertical,
    "CENTER",
    "input text centers vertically",
  );
  const inputPlaceholder = findLeafText(findCase(root, "case-input-placeholder"));
  assert.strictEqual(inputPlaceholder?.text, "Type here", "placeholder exported");
  assert.ok(inputPlaceholder.styles.color, "placeholder has a color");
  assert.notStrictEqual(
    inputPlaceholder.styles.color,
    "#222222",
    "placeholder uses the ::placeholder color, not the input color",
  );
  const password = findLeafText(findCase(root, "case-input-password"));
  assert.strictEqual(password?.text, "••••••", "password masks its characters");
  const select = findLeafText(findCase(root, "case-select"));
  assert.strictEqual(select?.text, "Chosen option", "selected option text exported");
  const textarea = findLeafText(findCase(root, "case-textarea"));
  assert.strictEqual(
    textarea?.text,
    "Multi line textarea content",
    "textarea value exported",
  );
  assert.ok(
    textarea.styles.textAlignVertical !== "CENTER",
    "textarea text stays top-aligned",
  );

  // CSS rotation exports the untransformed box plus a rotation matrix
  const rotate = findCase(root, "case-rotate");
  const diamond = rotate.children.find((child) => child.name === "diamond");
  assert.ok(diamond, "rotated diamond exported");
  approx(diamond.styles.width, 40, 1, "diamond keeps its untransformed width");
  approx(diamond.styles.height, 40, 1, "diamond keeps its untransformed height");
  const matrix = diamond.styles.transformMatrix;
  assert.ok(matrix, "diamond carries a transform matrix");
  approx(matrix[0][0], Math.SQRT1_2, 0.01, "matrix cos(45deg)");
  approx(matrix[1][0], Math.SQRT1_2, 0.01, "matrix sin(45deg)");
  approx(matrix[0][2], 40, 0.75, "matrix x translation");
  approx(matrix[1][2], 11.72, 0.75, "matrix y translation");
  assert.strictEqual(rotate.layoutStrategy, "absolute", "rotated child forces absolute parent");

  // Counter-rotated inner content carries the inverse rotation relative to
  // its rotated parent, so it renders upright inside the rotated frame.
  const rotateNested = findCase(root, "case-rotate-nested");
  const nestedDiamond = rotateNested.children.find((child) => child.name === "diamond");
  assert.ok(nestedDiamond?.styles.transformMatrix, "nested diamond keeps its matrix");
  const nestedInner = findLeafText(nestedDiamond);
  assert.strictEqual(nestedInner?.text, "7", "counter-rotated badge text preserved");
  const innerMatrix = nestedInner.styles.transformMatrix;
  assert.ok(innerMatrix, "counter-rotated inner carries the inverse rotation");
  approx(innerMatrix[0][0], Math.SQRT1_2, 0.01, "inner matrix cos(-45deg)");
  approx(innerMatrix[1][0], -Math.SQRT1_2, 0.01, "inner matrix sin(-45deg)");

  // CSS scale folds into the exported size
  const scale = findCase(root, "case-scale");
  const scaled = scale.children.find((child) => child.name === "scaled");
  approx(scaled.styles.width, 60, 1, "scaled width folded into size");
  approx(scaled.styles.height, 30, 1, "scaled height folded into size");
  assert.ok(!scaled.styles.transformMatrix, "pure scale emits no rotation matrix");

  // data-figma-rasterize exports the painted pixels of the subtree
  const rasterize = findCase(root, "case-rasterize");
  assert.strictEqual(rasterize.kind, "image", "rasterized subtree is an image node");
  assert.ok(
    rasterize.imageBase64 && rasterize.imageBase64.length > 0,
    "rasterized pixels captured",
  );

  // Value-preserving bindings: a token may only bind when its resolved value
  // matches the computed style it would replace in Figma.
  const ratioLineHeight = findCase(root, "case-ratio-line-height");
  assert.strictEqual(
    ratioLineHeight.bindings.lineHeight,
    undefined,
    "unitless line-height ratio token binding pruned",
  );
  approx(ratioLineHeight.styles.lineHeight, 18.2, 0.5, "computed pixel line height kept");
  const pxLineHeight = findCase(root, "case-px-line-height");
  assert.strictEqual(
    pxLineHeight.bindings.lineHeight,
    "--fx-sys-typescale-caption-line-height",
    "pixel line-height token binding kept",
  );
  const paddingToken = findCase(root, "case-padding-token-border");
  assert.strictEqual(
    paddingToken.bindings.paddingLeft,
    undefined,
    "padding token binding pruned when the border folds into padding",
  );
  approx(paddingToken.styles.paddingLeft, 10, 0.5, "border-folded padding preserved");

}

function assertReferencePayload(referenceResult) {
  const reference = referenceResult?.reference;
  assert.ok(reference, "reference snapshot attached");
  assert.strictEqual(
    reference.imageMimeType,
    "image/png",
    "reference snapshot is a png",
  );
  approx(reference.width, 120, 2, "reference matches its scope width");
  assert.ok(reference.imageBase64.length > 0, "reference snapshot has pixels");
}

async function main() {
  buildBundle();
  const chromeBinary = findChromeBinary();
  const server = await startServer();
  const { port } = server.address();

  try {
    const url = `http://127.0.0.1:${port}/export-fixture.html`;
    let payloadText;
    let referenceText;
    const attempts = 3;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const dom = await runChrome(chromeBinary, url);
      const errorText = extractBase64(dom, "payload-error");
      if (errorText) throw new Error(`fixture export failed:\n${errorText}`);

      payloadText = extractBase64(dom, "payload-output");
      referenceText = extractBase64(dom, "reference-output");
      const referenceReady =
        referenceText && JSON.parse(referenceText).reference !== null;
      if (payloadText && referenceReady) break;
      if (attempt < attempts) {
        console.warn(`attempt ${attempt}: export did not finish, retrying...`);
      }
    }
    if (!payloadText) {
      throw new Error("fixture payload not found in dumped DOM (export did not finish)");
    }

    const payload = JSON.parse(payloadText);
    assertPayload(payload);
    assertReferencePayload(referenceText ? JSON.parse(referenceText) : undefined);
    writeFileSync(payloadPath, JSON.stringify(payload, null, 2));
    console.log(`run-export-fixture: all assertions passed (payload: ${payloadPath})`);
  } finally {
    server.close();
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
