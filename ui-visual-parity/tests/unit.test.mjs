// Unit tests for the parity scripts. Run with the Node test runner: node --test tests/unit.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { test } from "node:test";
import { findChrome } from "../scripts/cdp.mjs";
import { fontsAligned } from "../scripts/capture_web.mjs";
import { diffSpecs, loadModel, loadPolicy, matchPrimitives, partsThatDiffer, sameColor, sameGradient, strokesOf, summarize, toHexColor } from "../scripts/parity_diff.mjs";
import { densityOf, judge, probesFor, progress, scorecard } from "../scripts/parity.mjs";
import { comparePixels, findRegions } from "../scripts/pixel_diff.mjs";
import { decodePng, encodePng } from "../scripts/png.mjs";
import { mergeParts, specFromMetadata } from "../scripts/figma_to_spec.mjs";

/* ------------------------------------------------------------------ builders */

const surface = (platform, extra = {}) => ({ name: "Test", platform, viewport: { width: 390, height: 844 }, density: 1, root: { selector: "root", width: 390, height: 400 }, fidelity: "measured", fonts: { requested: ["Inter"], loaded: ["Inter"], aligned: true }, ...extra });
const layout = (extra = {}) => ({ mode: "flow", justify: null, align: null, gap: 0, crossGap: 0, wrap: false, positioned: null, inline: false, ...extra });
const box = (padding = [0, 0, 0, 0], extra = {}) => ({ padding, margin: [0, 0, 0, 0], borderWidth: [0, 0, 0, 0], ...extra });
const type = (extra = {}) => ({ family: "Inter", size: 16, weight: 400, lineHeight: 24, lineHeightSet: true, letterSpacing: 0, align: "left", transform: "none", decoration: "none", style: "normal", lines: 1, ...extra });

/** A root, a card with padding, and one line of text inside it — enough to exercise looks and redlines. */
function cardSpec({ platform = "web", padding = 12, fill = "#111827", text = "Total balance", textWidth = 100, typeExtra = {}, surfaceExtra = {}, cardExtra = {}, textExtra = {} } = {}) {
  return {
    specVersion: "1.1",
    surface: surface(platform, surfaceExtra),
    nodes: [
      { id: "root", parent: null, tag: "div", name: "root", selector: "div.root", kind: "box", paints: true, rect: { x: 0, y: 0, width: 390, height: 400 }, background: "#ffffff", layout: layout(), box: box() },
      { id: "card", parent: "root", tag: "section", name: "card", selector: "div.root > section.card", kind: "box", paints: true, rect: { x: 20, y: 20, width: 350, height: 24 + padding * 2 }, background: "#f3f4f6", radius: [12, 12, 12, 12], layout: layout(), box: box([padding, padding, padding, padding]), ...cardExtra },
      { id: "label", parent: "card", tag: "p", name: "p.label", selector: "section.card > p.label", kind: "box", paints: false, rect: { x: 20 + padding, y: 20 + padding, width: 350 - padding * 2, height: 24 }, layout: layout(), box: box() },
      { id: "labelt", parent: "label", tag: "#text", name: text, selector: "section.card > p.label", kind: "text", paints: true, rect: { x: 20 + padding, y: 20 + padding, width: textWidth, height: 24 }, text, type: type(typeExtra), fill, ...textExtra },
    ],
  };
}
const causes = (report) => report.findings.filter((finding) => finding.action === "fix");
const fields = (list) => list.map((finding) => finding.specField);

/** A spec from loose parts: the first node is the root. Every node gets the fields the extractors always write. */
function specOf(nodes, { platform = "web", surfaceExtra = {} } = {}) {
  return {
    specVersion: "1.1",
    surface: surface(platform, surfaceExtra),
    nodes: nodes.map((node) => ({ tag: node.kind === "text" ? "#text" : "div", name: node.text || node.id, selector: `div.${node.id}`, kind: "box", paints: node.kind === "text", layout: layout(), box: box(), ...node })),
  };
}
const ROOT = { id: "root", parent: null, selector: "div.root", paints: true, rect: { x: 0, y: 0, width: 390, height: 400 }, background: "#ffffff" };
const words = (id, parent, text, x, y, width = 80, extra = {}) => ({ id, parent, kind: "text", text, rect: { x, y, width, height: 24 }, type: type(), fill: "#111827", ...extra });

/**
 * A list of three rows with a 1px line under each: drawn as the row's own bottom border, or
 * as a thin element of its own after the row. The two are the same picture.
 */
function dividedList({ as = "border", color = "#e5e7eb", thickness = 1, inset = 0 } = {}) {
  const nodes = [ROOT, { id: "list", parent: "root", selector: "div.root > ul.list", rect: { x: 20, y: 20, width: 350, height: 3 * (48 + thickness) } }];
  ["Coffee", "Groceries", "Rent"].forEach((text, row) => {
    const y = 20 + row * (48 + thickness);
    const bordered = as === "border";
    nodes.push({
      id: `row-${row}`,
      parent: "list",
      selector: "ul.list > li.row",
      paints: bordered,
      rect: { x: 20, y, width: 350, height: bordered ? 48 + thickness : 48 },
      box: box([12, 12, 12, 12], { borderWidth: [0, 0, bordered ? thickness : 0, 0] }),
      ...(bordered ? { border: { width: [0, 0, thickness, 0], color: [null, null, color, null], style: [null, null, "solid", null] } } : {}),
    });
    nodes.push(words(`title-${row}`, `row-${row}`, text, 32, y + 12, 80, { selector: "ul.list > li.row" }));
    if (!bordered) nodes.push({ id: `rule-${row}`, parent: "list", selector: "ul.list > li.rule", paints: true, background: color, rect: { x: 20 + inset, y: y + 48, width: 350 - inset * 2, height: thickness } });
  });
  return specOf(nodes);
}

/* ------------------------------------------------------------------- capture */

test("capture: a machine with no browser gets told how to point at one", () => {
  assert.throws(() => findChrome({ candidates: [] }), /CHROME_PATH/);
});

test("capture: generic font keywords never count as a mismatch", () => {
  assert.equal(fontsAligned(["-apple-system", "ui-monospace"], [".SF NS", "Menlo"]), true);
  assert.equal(fontsAligned(["Inter"], ["Helvetica"]), false);
  assert.equal(fontsAligned(["Helvetica Neue"], ["Helvetica Neue"]), true);
});

/* ------------------------------------------------------------- normalization */

test("colour: hex, rgb(), and hsl() all become #rrggbb, or #rrggbbaa when translucent", () => {
  const notations = [
    // Hex in 3, 4, 6, and 8 digits; a fully opaque alpha is dropped.
    ["#1a2", "#11aa22"],
    ["#1a28", "#11aa2288"],
    ["#1a2f", "#11aa22"],
    ["#F3F4F6", "#f3f4f6"],
    ["#11182780", "#11182780"],
    ["#111827FF", "#111827"],
    // rgb() with commas, with spaces and a slash, and in percentages.
    ["rgb(17, 24, 39)", "#111827"],
    ["rgba(17, 24, 39, 0.5)", "#11182780"],
    ["rgba(17, 24, 39, 1)", "#111827"],
    ["rgb(17 24 39)", "#111827"],
    ["rgb(17 24 39 / 50%)", "#11182780"],
    ["rgb(100%, 0%, 20%)", "#ff0033"],
    ["rgb(0% 40% 80% / 25%)", "#0066cc40"],
    // hsl() the same ways.
    ["hsl(221, 39%, 11%)", "#111827"],
    ["hsla(221, 39%, 11%, 0.5)", "#11182780"],
    ["hsl(220 14% 96%)", "#f3f4f6"],
    ["hsl(221 39% 11% / 50%)", "#11182780"],
    ["hsl(0, 0%, 50%)", "#808080"],
  ];
  for (const [written, hex] of notations) assert.equal(toHexColor(written), hex, written);
  // One hue from each sixth of the colour wheel.
  assert.deepEqual([30, 90, 150, 210, 270, 330].map((hue) => toHexColor(`hsl(${hue}, 100%, 50%)`)), ["#ff8000", "#80ff00", "#00ff80", "#0080ff", "#8000ff", "#ff0080"]);
});

test("colour: the few names it knows become hex, and anything else is passed through as given", () => {
  assert.equal(toHexColor("transparent"), "#00000000");
  assert.deepEqual(["black", "white", "red", "green", "blue", "gray", "grey"].map((name) => toHexColor(name)), ["#000000", "#ffffff", "#ff0000", "#008000", "#0000ff", "#808080", "#808080"]);
  assert.equal(toHexColor("White"), "#ffffff");
  for (const unknown of ["rebeccapurple", "currentColor", "var(--brand)", "#12345", "rgb(17, 24)"]) assert.equal(toHexColor(unknown), unknown);
  assert.equal(toHexColor(null), null);
  assert.equal(toHexColor(undefined), null);
});

test("colour: two colours are the same within 2 per channel and 0.012 of alpha", () => {
  assert.equal(sameColor("#111827", "#131a29"), true, "2 off on every channel");
  for (const off of ["#141827", "#111b27", "#11182a"]) assert.equal(sameColor("#111827", off), false, `${off} is 3 off on one channel`);
  assert.equal(sameColor("#11182780", "#11182783"), true, "alpha 3/255 apart");
  assert.equal(sameColor("#11182780", "#11182784"), false, "alpha 4/255 apart");
  assert.equal(sameColor("#111827", "#11182780"), false, "opaque against translucent");
  assert.equal(sameColor("#111827", "rgb(17, 24, 39)"), true, "notation does not matter");
  assert.equal(sameColor("hsl(221, 39%, 11%)", "rgb(17 24 39 / 100%)"), true);

  assert.equal(sameColor(null, null), true, "no colour on either side");
  assert.equal(sameColor(null, "#111827"), false);
  assert.equal(sameColor("#111827", null), false);

  // A value it cannot read is compared as text.
  assert.equal(sameColor("var(--brand)", "VAR(--brand)"), true);
  assert.equal(sameColor("var(--brand)", "var(--accent)"), false);

  assert.equal(sameColor("#111827", "#141827", { color: 3, alpha: 0.012 }), true, "a caller's tolerance replaces the default");
  assert.equal(sameColor("#111827", "#121827", { color: 0, alpha: 0 }), false);
});

test("diff: a colour written as rgb() or hsl() on one side is not a difference", () => {
  // The bundled extractors write hex already; a hand-written value may not.
  const written = cardSpec({ fill: "rgb(17, 24, 39)", cardExtra: { background: "hsl(220, 14%, 96%)" } });
  assert.equal(diffSpecs(cardSpec(), written).findings.length, 0);
  assert.equal(diffSpecs(cardSpec(), cardSpec({ fill: "rgb(19, 26, 41)" })).findings.length, 0, "2 off on every channel is within tolerance");
  assert.deepEqual(fields(diffSpecs(cardSpec(), cardSpec({ fill: "rgb(20, 24, 39)" })).findings), ["fill"], "3 off on one channel is not");
});

test("gradient: two layers are the same within the colour tolerance, 1 degree, and 1% of a stop", () => {
  const linear = (angle, ...stops) => `linear(${angle}deg, ${stops.join(", ")})`;
  const brand = linear(135, "#4f46e5 0%", "#7c3aed 100%");
  assert.equal(sameGradient(brand, brand), true);
  assert.equal(sameGradient(brand, linear(135, "#4f46e5 0%", "#7d3bee 100%")), true, "a stop 1 level off");
  assert.equal(sameGradient(brand, linear(135, "#4f46e5 0%", "#7e3cef 100%")), true, "a stop 2 levels off");
  assert.equal(sameGradient(brand, linear(135, "#4f46e5 0%", "#7f3df0 100%")), false, "a stop 3 levels off");
  assert.equal(sameGradient(brand, linear(136, "#4f46e5 0%", "#7c3aed 100%")), true, "1 degree off");
  assert.equal(sameGradient(brand, linear(137, "#4f46e5 0%", "#7c3aed 100%")), false, "2 degrees off");
  assert.equal(sameGradient(brand, linear(135, "#4f46e5 1%", "#7c3aed 100%")), true, "a stop moved 1%");
  assert.equal(sameGradient(brand, linear(135, "#4f46e5 3%", "#7c3aed 100%")), false, "a stop moved 3%");
  assert.equal(sameGradient(brand, linear(135, "#4f46e5 0%", "#7c3aed 100%", "#db2777 100%")), false, "one more stop");
  assert.equal(sameGradient(brand, `repeating-${brand}`), false, "the same stops, repeating");

  // Several background layers are joined by " | " and compared one by one.
  const sheen = linear(180, "#ffffff33 0%", "#ffffff00 100%");
  assert.equal(sameGradient(`${brand} | ${sheen}`, `${linear(135, "#4f46e5 0%", "#7d3bee 100%")} | ${sheen}`), true);
  assert.equal(sameGradient(`${brand} | ${sheen}`, `${brand} | ${linear(90, "#ffffff33 0%", "#ffffff00 100%")}`), false, "the second layer at another angle");
  assert.equal(sameGradient(`${brand} | ${sheen}`, `${sheen} | ${brand}`), false, "the layers in another order");
  assert.equal(sameGradient(`${brand} | ${sheen}`, brand), false, "a layer missing");
  assert.equal(sameGradient(brand, `${brand} | ${sheen}`), false, "a layer added");

  assert.equal(sameGradient(brand, null), false, "a gradient on one side only");
  assert.equal(sameGradient(undefined, brand), false);
  assert.equal(sameGradient(null, undefined), true, "no gradient on either side");

  // The comparison applies the same rule with the policy's tolerances.
  const filled = (gradient) => cardSpec({ cardExtra: { gradient } });
  assert.equal(diffSpecs(filled(brand), filled(linear(135, "#4f46e5 0%", "#7d3bee 100%"))).findings.length, 0);
  assert.deepEqual(fields(diffSpecs(filled(brand), filled(linear(135, "#4f46e5 0%", "#6d28d9 100%"))).findings), ["gradient"]);
});

/** A border all the way round, and a shadow with no offset and no blur, as the extractors record them. */
const stroke = (width, color) => ({ width: [width, width, width, width], color: [color, color, color, color], style: ["solid", "solid", "solid", "solid"] });
const ring = (spread, color, extra = {}) => ({ inset: true, x: 0, y: 0, blur: 0, spread, color, ...extra });
/** The card with a border. A border takes up layout space, so the padding inside it shrinks and the text stays where it was. */
const borderedCard = (width, color, cardExtra = {}) => cardSpec({ cardExtra: { border: stroke(width, color), box: box([12 - width, 12 - width, 12 - width, 12 - width], { borderWidth: [width, width, width, width] }), ...cardExtra } });

test("stroke: a border, a ring shadow, and an outline fold into the lines around a box", () => {
  const border = strokesOf({ border: stroke(1, "#e5e7eb") });
  assert.deepEqual(border, { width: [1, 1, 1, 1], color: ["#e5e7eb", "#e5e7eb", "#e5e7eb", "#e5e7eb"], style: ["solid", "solid", "solid", "solid"], shadows: [], outside: [] });
  assert.deepEqual(strokesOf({ shadow: [ring(1, "#e5e7eb")] }), border, "an inset ring is an inside stroke");
  assert.deepEqual(strokesOf({ border: stroke(1, "#e5e7eb"), shadow: [ring(1, "#e5e7eb")] }), strokesOf({ border: stroke(2, "#e5e7eb") }), "a border and an inset ring of its colour add up");

  const outline = strokesOf({ outline: { width: 2, color: "#4f46e5", style: "solid", offset: 0 } });
  assert.deepEqual(outline.outside, [{ width: 2, color: "#4f46e5", offset: 0, style: "solid" }]);
  assert.deepEqual(strokesOf({ shadow: [ring(2, "#4f46e5", { inset: false })] }), outline, "an outset ring is an outer ring");

  // With a blur or an offset it is a shadow, and a shadow is never a stroke.
  const soft = ring(1, "#e5e7eb", { blur: 2 });
  const lowered = ring(1, "#e5e7eb", { inset: false, y: 2 });
  const shaded = strokesOf({ border: stroke(1, "#e5e7eb"), shadow: [soft, lowered] });
  assert.deepEqual(shaded.width, [1, 1, 1, 1]);
  assert.deepEqual(shaded.outside, []);
  assert.deepEqual(shaded.shadows, [soft, lowered]);

  // A ring of another colour over a border is a second line, not a thicker first one.
  const twoTone = strokesOf({ border: stroke(1, "#e5e7eb"), shadow: [ring(1, "#ef4444")] });
  assert.deepEqual(twoTone.width, [1, 1, 1, 1]);
  assert.deepEqual(twoTone.shadows, [ring(1, "#ef4444")]);

  // An outline and an outset ring on the same box are two rings; neither hides the other.
  const both = strokesOf({ outline: { width: 2, color: "#4f46e5", style: "solid", offset: 2 }, shadow: [ring(3, "#ef4444", { inset: false })] });
  assert.deepEqual(both.outside, [{ width: 3, color: "#ef4444", offset: 0, style: "solid" }, { width: 2, color: "#4f46e5", offset: 2, style: "solid" }]);
});

test("diff: the same line drawn as a border, a ring shadow, or an outline is not a difference", () => {
  const ringed = cardSpec({ cardExtra: { shadow: [ring(1, "#e5e7eb")] } });
  assert.equal(diffSpecs(borderedCard(1, "#e5e7eb"), ringed).findings.length, 0);
  assert.equal(diffSpecs(ringed, borderedCard(1, "#e5e7eb")).findings.length, 0);
  assert.equal(diffSpecs(borderedCard(2, "#e5e7eb"), borderedCard(1, "#e5e7eb", { shadow: [ring(1, "#e5e7eb")] })).findings.length, 0, "a border and an inset ring of its colour add up");

  const outlined = cardSpec({ cardExtra: { outline: { width: 2, color: "#4f46e5", style: "solid", offset: 0 } } });
  const haloed = cardSpec({ cardExtra: { shadow: [ring(2, "#4f46e5", { inset: false })] } });
  assert.equal(diffSpecs(outlined, haloed).findings.length, 0);
  assert.equal(diffSpecs(haloed, outlined).findings.length, 0);
});

test("diff: a line of another colour or width is a difference however it is drawn", () => {
  const against = (shadow) => diffSpecs(borderedCard(1, "#e5e7eb"), cardSpec({ cardExtra: { shadow: [shadow] } })).findings;
  assert.deepEqual(fields(against(ring(1, "#d1d5db"))), ["border.color"]);
  const thicker = against(ring(2, "#e5e7eb"));
  assert.deepEqual(fields(thicker), ["border.width"]);
  assert.deepEqual(thicker[0].delta, ["border width 1px → 2px"]);
  // A blurred shadow does not stand in for the border: the border is missing and the shadow is extra.
  assert.deepEqual(fields(against(ring(1, "#e5e7eb", { blur: 2 }))).sort(), ["border.width", "shadow"]);

  const outlined = cardSpec({ cardExtra: { outline: { width: 2, color: "#4f46e5", style: "solid", offset: 0 } } });
  const halo = (spread, color) => diffSpecs(outlined, cardSpec({ cardExtra: { shadow: [ring(spread, color, { inset: false })] } })).findings;
  assert.deepEqual(fields(halo(2, "#ef4444")), ["outline"]);
  assert.deepEqual(fields(halo(3, "#4f46e5")), ["outline"]);

  // An outline that stands off the box, or is dashed, is not the same ring.
  const outline = (extra) => cardSpec({ cardExtra: { outline: { width: 2, color: "#4f46e5", style: "solid", offset: 0, ...extra } } });
  assert.deepEqual(fields(diffSpecs(outline(), outline({ offset: 2 })).findings), ["outline"]);
  assert.deepEqual(fields(diffSpecs(outline(), outline({ style: "dashed" })).findings), ["outline"]);
  // A ring added beside an outline is a difference too.
  assert.deepEqual(fields(diffSpecs(outline(), cardSpec({ cardExtra: { outline: { width: 2, color: "#4f46e5", style: "solid", offset: 0 }, shadow: [ring(3, "#ef4444", { inset: false })] } })).findings), ["outline"]);
});

test("diff: fully rounded is fully rounded whatever number produces it, and four corners that differ alike are one finding", () => {
  // The card is 48px tall, so a radius of 24 already rounds its ends completely.
  const rounded = (topLeft, topRight = topLeft, bottomRight = topLeft, bottomLeft = topLeft) => cardSpec({ cardExtra: { radius: [topLeft, topRight, bottomRight, bottomLeft] } });
  assert.equal(diffSpecs(rounded(9999), rounded(24)).findings.length, 0);
  assert.equal(diffSpecs(rounded(24), rounded(9999)).findings.length, 0);
  assert.deepEqual(fields(diffSpecs(rounded(9999), rounded(20)).findings), ["radius"], "20 leaves the ends short of round");

  const report = diffSpecs(rounded(12), rounded(8));
  assert.deepEqual(fields(report.findings), ["radius"]);
  assert.deepEqual(report.findings[0].delta, ["corner radius 12px → 8px"]);
  assert.deepEqual(fields(diffSpecs(rounded(12), rounded(12, 12, 0, 0)).findings), ["radius.bottom-right", "radius.bottom-left"], "corners that differ on their own are named");
});

/* ---------------------------------------------------------- classifications */

test("diff: identical specs are clean", () => {
  const report = diffSpecs(cardSpec(), cardSpec());
  assert.equal(report.findings.length, 0);
  assert.equal(report.scores.appearance, 100);
  assert.equal(report.scores.geometry, 100);
});

test("diff: one pixel off is drift at the same form factor", () => {
  const report = diffSpecs(cardSpec({ padding: 12 }), cardSpec({ padding: 11 }));
  const spacing = causes(report).find((finding) => finding.specField.startsWith("spacing"));
  assert.ok(spacing, "the changed inset is reported as a cause");
  assert.equal(spacing.intent, "drift");
  assert.equal(spacing.parityClass, "strict");
  assert.deepEqual(spacing.differs, ["section.card padding-top 12 → 11"]);
});

test("diff: a recorded accessibility remap is the sanctioned state", () => {
  const remaps = [{ authored: "#f14f2b", accessible: "#e21e28", token: "--sys-color-warning-text", record: "TOKEN_ARCHITECTURE.md a11y-remap D-56" }];
  const report = diffSpecs(cardSpec({ fill: "#f14f2b" }), cardSpec({ fill: "#e21e28" }), { remaps });
  const [finding] = report.findings;
  assert.equal(finding.intent, "required-adaptation");
  assert.equal(finding.action, "leave");
  assert.match(finding.recommendedFix, /^No fix/);
  assert.equal(report.scores.toFix, 0);
});

test("diff: copying the authored value a remap replaces is the defect", () => {
  const remaps = [{ authored: "#f14f2b", accessible: "#e21e28", token: "--sys-color-warning-text" }];
  const report = diffSpecs(cardSpec({ fill: "#f14f2b" }), cardSpec({ fill: "#f14f2b" }), { remaps });
  const [finding] = causes(report);
  assert.equal(finding.intent, "required-adaptation");
  assert.equal(finding.severity, "high");
  assert.match(finding.recommendedFix, /#e21e28/);
});

test("diff: a remap declared inside a spec is honoured too", () => {
  const reference = { ...cardSpec({ fill: "#f14f2b" }), accessibilityRemaps: [{ authored: "#f14f2b", accessible: "#e21e28" }] };
  assert.equal(diffSpecs(reference, cardSpec({ fill: "#e21e28" })).scores.toFix, 0);
});

test("diff: text metrics are untrusted when the font environment is mismatched", () => {
  const implementation = cardSpec({ textWidth: 103, surfaceExtra: { fonts: { requested: ["Inter"], loaded: ["Helvetica"], aligned: false } } });
  const report = diffSpecs(cardSpec({ textWidth: 100 }), implementation);
  const width = report.findings.find((finding) => finding.specField === "size.width");
  assert.equal(width.action, "untrusted");
  assert.equal(width.parityClass, "untrusted");
  assert.equal(report.scores.toFix, 0);
  assert.equal(report.parity.fontEnvironment, "mismatched");
  assert.match(width.recommendedFix, /Do not fix/);
});

test("diff: line height is drift between Figma and web, an adaptation across engines", () => {
  const same = diffSpecs(cardSpec({ platform: "figma" }), cardSpec({ platform: "web", typeExtra: { lineHeight: 20 } }));
  assert.equal(same.findings.find((finding) => finding.specField === "type.lineHeight").intent, "drift");
  const cross = diffSpecs(cardSpec({ platform: "web" }), cardSpec({ platform: "ios", typeExtra: { lineHeight: 20 } }));
  const finding = cross.findings.find((item) => item.specField === "type.lineHeight");
  assert.equal(finding.intent, "adaptation");
  assert.equal(finding.action, "leave");
  assert.equal(finding.severity, "low");
});

test("diff: across form factors spacing and size are adaptations and geometry is not a check", () => {
  const desktop = cardSpec({ padding: 24, surfaceExtra: { root: { selector: "root", width: 1440, height: 900 } } });
  const report = diffSpecs(desktop, cardSpec({ padding: 12 }));
  assert.equal(report.parity.formFactor, "cross");
  assert.equal(report.scores.geometry, null);
  assert.ok(!report.parity.checked.includes("geometry"));
  assert.equal(causes(report).filter((finding) => finding.gate === "geometry").length, 0);
});

test("diff: a control under the platform's touch minimum is a required adaptation", () => {
  const control = { interactive: true, rect: { x: 20, y: 20, width: 350, height: 32 }, box: box([4, 4, 4, 4]) };
  const report = diffSpecs(cardSpec({ platform: "web", padding: 4, cardExtra: control }), cardSpec({ platform: "ios", padding: 4, cardExtra: control }));
  const finding = causes(report).find((item) => item.specField === "touchTarget");
  assert.ok(finding);
  assert.equal(finding.intent, "required-adaptation");
  assert.match(finding.delta[0], /under the ios minimum of 44/);
  assert.equal(diffSpecs(cardSpec({ padding: 4, cardExtra: control }), cardSpec({ padding: 4, cardExtra: control })).findings.length, 0, "web has no touch minimum");
});

test("diff: operating-system chrome and platformOnly nodes are left out, and named", () => {
  const statusBar = { id: "status", parent: "root", tag: "div", name: "Status Bar", selector: "div.status-bar", kind: "box", paints: true, rect: { x: 0, y: 0, width: 390, height: 20 }, background: "#000000", layout: layout(), box: box() };
  const tabBar = { id: "tabs", parent: "root", tag: "div", name: "native tab bar", selector: "div.tabs", kind: "box", paints: true, platformOnly: true, rect: { x: 0, y: 340, width: 390, height: 60 }, background: "#eeeeee", layout: layout(), box: box() };
  const design = cardSpec({ platform: "figma" });
  design.nodes.push(statusBar, tabBar);
  const report = diffSpecs(design, cardSpec());
  assert.equal(report.findings.length, 0);
  assert.equal(report.scores.primitives.skipped, 2);
  assert.deepEqual(report.parity.skipped, ["div.status-bar", "div.tabs"]);

  // In a DOM there is no OS chrome: an element called status-bar is the app's own and stays.
  const page = cardSpec();
  page.nodes.push(statusBar);
  const kept = diffSpecs(page, cardSpec());
  assert.equal(kept.scores.primitives.skipped, 0);
  assert.deepEqual(fields(causes(kept)), ["presence"]);

  // The implementation is captured afresh each cycle, so its platform-only elements are named in the policy.
  const policy = { ...loadPolicy(), platformOnlyNodes: ["div.status-bar"] };
  const listed = diffSpecs(cardSpec(), page, { policy });
  assert.equal(listed.findings.length, 0);
  assert.deepEqual(listed.parity.skipped, ["div.status-bar"]);
});

test("diff: hover is not asked of a touch platform", () => {
  const hover = { states: { hover: { background: "#e5e7eb" } } };
  const onWeb = diffSpecs(cardSpec({ cardExtra: hover }), cardSpec());
  assert.ok(fields(causes(onWeb)).includes("states.hover"));
  const onTouch = diffSpecs(cardSpec({ cardExtra: hover }), cardSpec({ platform: "android" }));
  assert.ok(!fields(onTouch.findings).some((field) => field.startsWith("states")));
});

test("diff: an estimated spec does not support findings under 2px", () => {
  const estimated = cardSpec({ padding: 11, surfaceExtra: { fidelity: "estimated" } });
  assert.equal(causes(diffSpecs(cardSpec({ padding: 12 }), estimated)).length, 0);
  assert.ok(causes(diffSpecs(cardSpec({ padding: 16 }), cardSpec({ padding: 11, surfaceExtra: { fidelity: "estimated" } }))).length > 0);
});

test("diff: a policy file overrides the defaults it names and keeps the rest", () => {
  const file = path.join(os.tmpdir(), `ui-parity-policy-${process.pid}.json`);
  fs.writeFileSync(file, JSON.stringify({ tolerance: { geometry: 2 } }));
  const policy = loadPolicy(file);
  fs.rmSync(file);
  assert.equal(policy.tolerance.geometry, 2);
  assert.equal(policy.tolerance.color, 2);
  assert.equal(causes(diffSpecs(cardSpec({ padding: 12 }), cardSpec({ padding: 11 }), { policy })).length, 0);
});

test("diff: a hand-written spec without rectangles is compared by look and never reaches parity", () => {
  const legacy = (background) => ({
    specVersion: "1.0",
    surface: surface("figma"),
    nodes: [
      { id: "summary-card", role: "container", name: "Summary card", background, radius: 12, border: { width: 1, color: "#e5e7eb", style: "solid", sides: "all" }, shadow: "0 1px 2px rgba(0,0,0,0.06)" },
      { id: "title", role: "text", name: "Title", text: "Total balance", fill: "rgb(17, 24, 39)", type: { family: "Inter", size: 16, weight: 600, lineHeight: 24 } },
    ],
  });
  const same = diffSpecs(legacy("#ffffff"), legacy("rgb(255, 255, 255)"));
  assert.equal(same.findings.length, 0, "notation differences are not findings");
  assert.equal(same.parity.partial, true);
  assert.deepEqual(same.parity.checked, ["appearance"]);
  assert.equal(same.scores.geometry, null);
  assert.equal(judge(same, null, legacy("#ffffff")).verdict.parity, false);

  const different = diffSpecs(legacy("#ffffff"), legacy("#f9fafb"));
  assert.deepEqual(fields(causes(different)), ["background"]);
});

test("diff: every finding carries the established fields", () => {
  const report = diffSpecs(cardSpec({ padding: 12, fill: "#111827" }), cardSpec({ padding: 16, fill: "#374151", typeExtra: { weight: 600 } }));
  assert.ok(report.findings.length >= 3);
  for (const finding of report.findings) {
    for (const key of ["id", "severity", "intent", "parityClass", "specField", "block", "ownership", "status", "expected", "actual", "delta", "recommendedFix", "tokens", "gate", "derived", "action"]) {
      assert.notEqual(finding[key], undefined, `${finding.id} lacks ${key}`);
    }
  }
});

/* --------------------------------------------------- causes and explanations */

test("spacing: the declared parts that differ are named, each with where it lives", () => {
  const cardInDesign = { selector: "main > section.balance-card", name: "section.balance-card" };
  const cardInBuild = { selector: "div.app > section.balance-card", name: "section.balance-card" };
  const stack = { selector: "section.balance-card > div.stack", name: "div.stack" };
  const wrapper = { selector: "div.stack > div", name: "div" };
  const part = (node, prop, value) => ({ node, prop, value });

  // The selector is the build's: that is where the fix goes.
  assert.deepEqual(partsThatDiffer([part(cardInDesign, "padding-top", 24)], [part(cardInBuild, "padding-top", 16)]), [{ text: "section.balance-card padding-top 24 → 16", selector: "div.app > section.balance-card", design: 24, build: 16 }]);
  // A stray wrapper: a part that only one side has counts as 0 on the other.
  assert.deepEqual(partsThatDiffer([part(stack, "gap", 4)], [part(stack, "gap", 4), part(wrapper, "padding-top", 3)]), [{ text: "div padding-top 0 → 3", selector: "div.stack > div", design: 0, build: 3 }]);
  assert.equal(partsThatDiffer([part(stack, "gap", 4)], [part(stack, "gap", 4)]), null, "the same parts on both sides");
  assert.equal(partsThatDiffer(null, [part(stack, "gap", 4)]), null, "the design does not declare the distance");
  assert.equal(partsThatDiffer([part(stack, "gap", 4)], null), null, "the build does not declare the distance");
});

test("diff: a changed padding is explained by the declaration that differs and where it lives", () => {
  const report = diffSpecs(cardSpec({ padding: 12 }), cardSpec({ padding: 16 }));
  const top = causes(report).find((finding) => finding.specField === "spacing.top");
  assert.ok(top, "the changed inset is reported as a cause");
  // The distance is measured from the text; the declaration that is wrong belongs to the card.
  assert.equal(top.block, '"Total balance"');
  assert.deepEqual(top.differs, ["section.card padding-top 12 → 16"]);
  assert.deepEqual(top.differsAt, [{ text: "section.card padding-top 12 → 16", selector: "div.root > section.card", design: 12, build: 16 }]);
  assert.deepEqual(top.designedAs, ["section.card padding-top 12"]);
  assert.deepEqual(top.builtFrom, ["section.card padding-top 16"]);
  assert.match(top.recommendedFix, /^Change section\.card padding-top from 16 to 12/);
});

test("diff: between a design tool and a build each side is explained, but their parts are not matched up", () => {
  // Layer names and selectors do not line up, so parts are matched only when both specs come from the same kind of source.
  const report = diffSpecs(cardSpec({ platform: "figma", padding: 12 }), cardSpec({ platform: "web", padding: 16 }));
  const top = causes(report).find((finding) => finding.specField === "spacing.top");
  assert.ok(top, "the changed inset is still reported as a cause");
  assert.deepEqual(top.designedAs, ["section.card padding-top 12"]);
  assert.deepEqual(top.builtFrom, ["section.card padding-top 16"]);
  assert.equal(top.differs, undefined);
  assert.equal(top.differsAt, undefined);
});

test("diff: a text block's width follows from its font size, and only the font size is to fix", () => {
  const report = diffSpecs(cardSpec(), cardSpec({ typeExtra: { size: 18 }, textWidth: 112 }));
  const size = report.findings.find((finding) => finding.specField === "type.size");
  const width = report.findings.find((finding) => finding.specField === "size.width");
  assert.equal(size.action, "fix");
  assert.equal(width.action, "follows");
  assert.equal(width.derived, true);
  assert.match(width.recommendedFix, /^No direct fix/);
  assert.equal(report.scores.toFix, 1);
  assert.equal(report.scores.consequences, 1);

  // A colour does not change how wide the words are: beside one, the same width is a cause of its own.
  assert.deepEqual(fields(causes(diffSpecs(cardSpec(), cardSpec({ fill: "#374151", textWidth: 112 })))), ["fill", "size.width"]);
});

test("diff: a box that grew around a changed padding follows, and only the padding is to fix", () => {
  const report = diffSpecs(cardSpec({ padding: 12 }), cardSpec({ padding: 16 }));
  const height = report.findings.find((finding) => finding.specField === "size.height");
  assert.equal(height.block, "section.card");
  assert.deepEqual(height.delta, ["height 48px → 56px (+8)"]);
  assert.equal(height.action, "follows");
  assert.deepEqual(fields(causes(report)).sort(), ["spacing.bottom", "spacing.left", "spacing.top"]);
  assert.equal(report.scores.consequences, 1);
});

test("diff: a width that was set explicitly is a cause in its own right", () => {
  const narrower = { x: 20, y: 20, width: 342, height: 48 };
  const explicit = box([12, 12, 12, 12], { fixed: { width: true, height: false } });
  const report = diffSpecs(cardSpec({ cardExtra: { box: explicit } }), cardSpec({ cardExtra: { box: explicit, rect: narrower } }));
  assert.deepEqual(fields(report.findings), ["size.width"]);
  const [width] = report.findings;
  assert.equal(width.block, "section.card");
  assert.equal(width.action, "fix");
  assert.match(width.delta[0], /^width 350px → 342px .* set explicitly$/);
  assert.match(width.recommendedFix, /^Set the width .* to 350px/);

  const sizedByContent = diffSpecs(cardSpec(), cardSpec({ cardExtra: { rect: narrower } }));
  assert.doesNotMatch(sizedByContent.findings[0].delta[0], /set explicitly/);
});

/** A list of three rows. Each title is its own text node, and all three sit behind the same selector. */
function listSpec(fills) {
  return {
    specVersion: "1.1",
    surface: surface("web"),
    nodes: [
      { id: "root", parent: null, tag: "ul", name: "list", selector: "ul.list", kind: "box", paints: true, rect: { x: 0, y: 0, width: 390, height: 400 }, background: "#ffffff", layout: layout(), box: box() },
      ...["Coffee", "Groceries", "Rent"].flatMap((text, row) => [
        { id: `row-${row}`, parent: "root", tag: "li", name: "li.row", selector: "ul.list > li.row", kind: "box", paints: true, rect: { x: 20, y: 20 + row * 56, width: 350, height: 48 }, background: "#f3f4f6", layout: layout(), box: box([12, 12, 12, 12]) },
        { id: `title-${row}`, parent: `row-${row}`, tag: "#text", name: text, selector: "ul.list > li.row", kind: "text", paints: true, rect: { x: 32, y: 32 + row * 56, width: 80, height: 24 }, text, type: type(), fill: fills[row] },
      ]),
    ],
  };
}

test("diff: the same difference on every row is one finding that lists its instances", () => {
  const dark = "#111827";
  const grey = "#6b7280";
  const report = diffSpecs(listSpec([dark, dark, dark]), listSpec([grey, grey, grey]));
  assert.deepEqual(fields(report.findings), ["fill"]);
  const [finding] = report.findings;
  assert.equal(finding.instances.length, 3);
  assert.deepEqual(finding.instances.map((instance) => instance.block), ['"Coffee"', '"Groceries"', '"Rent"']);
  assert.equal(report.scores.toFix, 1);

  // Another wrong colour is another thing to fix, and a difference seen once lists no instances.
  const mixed = diffSpecs(listSpec([dark, dark, dark]), listSpec([grey, grey, "#9ca3af"]));
  assert.deepEqual(mixed.findings.map((item) => [item.actual, item.instances?.length]), [["#6b7280", 2], ["#9ca3af", undefined]]);
});

test("spacing: equal parts cancel one for one, so two nested elements of the same name cannot hide each other", () => {
  const outer = { selector: "section > div", name: "div" };
  const inner = { selector: "div > div", name: "div" };
  const part = (node, prop, value) => ({ node, prop, value });
  assert.deepEqual(partsThatDiffer([part(outer, "padding-top", 8), part(inner, "padding-top", 8)], [part(outer, "padding-top", 8), part(inner, "padding-top", 12)]), [{ text: "div padding-top 8 → 12", selector: "div > div", design: 8, build: 12 }]);
  assert.equal(partsThatDiffer([part(outer, "padding-top", 8), part(inner, "padding-top", 8)], [part(inner, "padding-top", 8), part(outer, "padding-top", 8)]), null, "the order they were collected in does not matter");
});

test("diff: an explicit size stays a cause beside a spacing change", () => {
  const sized = (padding) => cardSpec({ padding, cardExtra: { box: box([padding, padding, padding, padding], { fixed: { width: true, height: true } }) } });
  const report = diffSpecs(sized(12), sized(16));
  const height = report.findings.find((finding) => finding.specField === "size.height");
  assert.equal(height.action, "fix");
  assert.match(height.delta[0], /set explicitly$/);
  assert.ok(causes(report).some((finding) => finding.specField === "spacing.top"));

  // Two stacked boxes: the gap between them and the second one's height both grew by 4.
  const stacked = (gap, height, fixed) =>
    specOf([
      { ...ROOT, layout: layout({ mode: "column", gap }) },
      { id: "first", parent: "root", paints: true, background: "#f3f4f6", rect: { x: 20, y: 20, width: 350, height: 40 } },
      { id: "second", parent: "root", paints: true, background: "#f3f4f6", rect: { x: 20, y: 60 + gap, width: 350, height }, box: box([0, 0, 0, 0], fixed ? { fixed: { width: false, height: true } } : {}) },
    ]);
  const action = (fixed) => diffSpecs(stacked(12, 40, fixed), stacked(16, 44, fixed)).findings.find((finding) => finding.specField === "size.height").action;
  assert.equal(action(false), "follows", "a box with no size of its own gave way to the gap beside it");
  assert.equal(action(true), "fix", "a height someone wrote is wrong in its own right");
});

test("diff: between a design tool and a build the fix names the distance and what each side makes it from", () => {
  const report = diffSpecs(cardSpec({ platform: "figma", padding: 12 }), cardSpec({ platform: "web", padding: 16 }));
  const top = causes(report).find((finding) => finding.specField === "spacing.top");
  assert.equal(top.recommendedFix, "Bring this distance to 12px. The build makes it from section.card padding-top 16; the reference declares section.card padding-top 12.");
});

test("diff: a centred child is called centred only when the reference does not declare the distance", () => {
  // A 64px row holding a 24px icon. Centred, the icon sits 20px from the top and the bottom.
  const row = (padding, iconTop, extra = {}) =>
    specOf([
      ROOT,
      { id: "row", parent: "root", paints: true, background: "#f3f4f6", rect: { x: 20, y: 20, width: 350, height: 64 }, box: box([padding, 0, padding, 0]), ...extra },
      { id: "icon", parent: "row", paints: true, background: "#4f46e5", rect: { x: 20, y: 20 + iconTop, width: 24, height: 24 } },
    ]);
  const byAlignment = diffSpecs(row(0, 20, { layout: layout({ mode: "row", align: "center" }) }), row(0, 0));
  assert.match(causes(byAlignment)[0].delta[0], /^top inset 20px → 0px .* centred vertically in the reference, not in the implementation$/);
  assert.match(causes(byAlignment)[0].recommendedFix, /the reference leaves it to alignment/);

  const byPadding = diffSpecs(row(20, 20), row(12, 12));
  const top = causes(byPadding).find((finding) => finding.specField === "spacing.top");
  assert.deepEqual(top.differs, ["div.row padding-top 20 → 12"]);
  assert.doesNotMatch(top.delta[0], /centred/);
});

test("diff: an element pinned at the same offset on both sides only follows the block it is pinned to", () => {
  // A badge pinned 4px from the top right of an unpainted wrapper; the wrapper is 20px wider in the build.
  const pinned = (wrapWidth, fill) =>
    specOf([
      ROOT,
      { id: "wrap", parent: "root", rect: { x: 100, y: 40, width: wrapWidth, height: 60 }, layout: layout({ positioned: "relative" }) },
      { id: "badge", parent: "wrap", paints: true, background: fill, rect: { x: 100 + wrapWidth - 14, y: 44, width: 10, height: 10 }, layout: layout({ positioned: "absolute", pinned: ["top", "right"], inset: { top: 4, right: 4 } }), box: box([0, 0, 0, 0], { fixed: { width: true, height: true } }) },
    ]);
  const report = diffSpecs(pinned(200, "#ef4444"), pinned(220, "#dc2626"));
  assert.deepEqual(fields(causes(report)), ["background"]);
  const moved = report.findings.filter((finding) => finding.gate === "geometry");
  assert.ok(moved.length > 0, "the badge is not where the reference has it");
  assert.ok(moved.every((finding) => finding.action === "follows"), "but its own offset is right");

  // A different offset is a cause, named as the offset.
  const nudged = pinned(200, "#ef4444");
  nudged.nodes[2].layout.inset.right = 8;
  nudged.nodes[2].rect.x -= 4;
  assert.deepEqual(causes(diffSpecs(pinned(200, "#ef4444"), nudged)).map((finding) => finding.differs), [["div.badge offset-right 4 → 8"]]);
});

test("diff: the build declaring the same spacing as the reference is not blamed when what it is measured to has changed", () => {
  // Two buttons in a row and a title 20px under them. In the build the second button is 2px taller.
  const page = (secondHeight) =>
    specOf([
      { ...ROOT, layout: layout({ mode: "column", gap: 20 }) },
      { id: "actions", parent: "root", rect: { x: 20, y: 20, width: 350, height: secondHeight }, layout: layout({ mode: "row", gap: 12, align: "start" }) },
      { id: "first", parent: "actions", paints: true, background: "#4f46e5", rect: { x: 20, y: 20, width: 169, height: 48 }, box: box([0, 0, 0, 0], { fixed: { width: false, height: true } }) },
      { id: "second", parent: "actions", paints: true, background: "#e5e7eb", rect: { x: 201, y: 20, width: 169, height: secondHeight }, box: box([0, 0, 0, 0], { fixed: { width: false, height: true } }) },
      { id: "head", parent: "root", rect: { x: 20, y: 40 + secondHeight, width: 350, height: 24 } },
      words("title", "head", "Recent activity", 20, 40 + secondHeight, 120),
    ]);
  const report = diffSpecs(page(48), page(50));
  assert.deepEqual(causes(report).map((finding) => `${finding.block} ${finding.specField}`), ["div.second size.height"]);
  const gap = report.findings.find((finding) => finding.block === '"Recent activity"' && finding.specField === "spacing.top");
  assert.equal(gap.action, "follows");
  assert.deepEqual(gap.designedAs, ["div.root gap 20"]);
});

test("diff: a border that changed width is one cause; the distances it shifts follow", () => {
  const thin = borderedCard(1, "#e5e7eb");
  const thick = cardSpec({ padding: 13, cardExtra: { border: stroke(2, "#e5e7eb"), box: box([11, 11, 11, 11], { borderWidth: [2, 2, 2, 2] }) } });
  const report = diffSpecs(thin, thick);
  assert.deepEqual(fields(causes(report)), ["border.width"]);
  const shifted = report.findings.filter((finding) => finding.specField.startsWith("spacing"));
  assert.ok(shifted.length > 0);
  assert.ok(shifted.every((finding) => finding.action === "follows" && /border-(top|left|bottom) 1 → 2/.test(finding.differs[0])));
});

test("diff: an auto margin is leftover space, not a declared distance", () => {
  // A block centred with auto margins; the build's block is 20px wider, so its margins are 10px smaller.
  const centred = (width, auto) => specOf([ROOT, { id: "panel", parent: "root", paints: true, background: "#f3f4f6", rect: { x: (390 - width) / 2, y: 20, width, height: 40 }, box: box([0, 0, 0, 0], { margin: [0, (390 - width) / 2, 0, (390 - width) / 2], fixed: { width: true, height: true }, ...(auto ? { marginAuto: [false, true, false, true] } : {}) }) }]);
  assert.deepEqual(fields(causes(diffSpecs(centred(190, true), centred(210, true)))), ["size.width"]);
  // The same numbers written as lengths are declarations, and are reported as such.
  assert.ok(fields(causes(diffSpecs(centred(190, false), centred(210, false)))).includes("spacing.left"));
});

test("diff: a line height or letter spacing written relative to the font size follows it", () => {
  const scaled = diffSpecs(cardSpec({ typeExtra: { size: 16, lineHeight: 24, letterSpacing: 0.96 } }), cardSpec({ typeExtra: { size: 14, lineHeight: 21, letterSpacing: 0.84 } }));
  const action = (report, field) => report.findings.find((finding) => finding.specField === field).action;
  assert.equal(action(scaled, "type.size"), "fix");
  assert.equal(action(scaled, "type.lineHeight"), "follows");
  assert.equal(action(scaled, "type.letterSpacing"), "follows");
  // A line height that did not keep its proportion is a difference of its own.
  const unscaled = diffSpecs(cardSpec({ typeExtra: { size: 16, lineHeight: 24 } }), cardSpec({ typeExtra: { size: 14, lineHeight: 24 } }));
  assert.deepEqual(fields(causes(unscaled)), ["type.size"]);
  assert.equal(action(diffSpecs(cardSpec({ typeExtra: { size: 16, lineHeight: 24 } }), cardSpec({ typeExtra: { size: 14, lineHeight: 20 } })), "type.lineHeight"), "fix");
});

test("diff: a distance built from a part already reported as wrong is that part seen again", () => {
  // Two count badges. The first is as wide as its padding makes it; the second is held at a
  // minimum width in the reference, so there its inset is leftover space.
  const badges = (padding, secondWidth) => {
    const second = { x: 100, width: secondWidth };
    return specOf([
      ROOT,
      { id: "first", parent: "root", selector: "a.on > b", paints: true, background: "#262b36", rect: { x: 20, y: 20, width: 12 + padding * 2, height: 24 }, box: box([0, padding, 0, padding]) },
      words("twelve", "first", "12", 20 + padding, 20, 12, { selector: "a.on > b" }),
      { id: "second", parent: "root", selector: "a > b", paints: true, background: "#262b36", rect: { x: second.x, y: 20, width: second.width, height: 24 }, box: box([0, padding, 0, padding], { minWidth: 22 }) },
      words("three", "second", "3", second.x + (second.width - 7) / 2, 20, 7, { selector: "a > b" }),
    ]);
  };
  const report = diffSpecs(badges(6, 22), badges(10, 27));
  assert.deepEqual(causes(report).map((finding) => finding.differs?.[0]).sort(), ["b padding-left 6 → 10", "b padding-right 6 → 10"]);
  const second = report.findings.filter((finding) => finding.block === '"3"');
  assert.ok(second.length > 0);
  assert.ok(second.every((finding) => finding.action === "follows"));
});

test("diff: a size limit that differs explains the size and is the thing to fix", () => {
  const limited = (maxWidth, textWidth) => {
    const spec = cardSpec({ textWidth });
    spec.nodes[2].box.maxWidth = maxWidth;
    return spec;
  };
  const [width] = causes(diffSpecs(limited(200, 200), limited(240, 236)));
  assert.equal(width.specField, "size.width");
  assert.match(width.delta[0], /^width 200px → 236px \(\+36\) — max-width 200px → 240px$/);
  assert.match(width.recommendedFix, /^Set max-width .* to 200px\.$/);
});

test("diff: text that should be cut short and wraps instead is one difference", () => {
  const cut = cardSpec({ typeExtra: { lines: 1, truncated: true } });
  const wrapped = cardSpec({ typeExtra: { lines: 2 } });
  const report = diffSpecs(cut, wrapped);
  assert.deepEqual(fields(report.findings), ["type.truncated"]);
  assert.match(report.findings[0].delta[0], /^should truncate with … but does not \(2 lines, reference has 1\)$/);
  assert.deepEqual(fields(diffSpecs(cardSpec({ typeExtra: { lines: 1 } }), wrapped).findings), ["type.lines"]);
});

test("diff: text shadow, numeric figures, and inline styling are compared", () => {
  const glow = [{ inset: false, x: 0, y: 1, blur: 2, spread: 0, color: "#00000080" }];
  assert.deepEqual(fields(diffSpecs(cardSpec({ textExtra: { textShadow: glow } }), cardSpec()).findings), ["textShadow"]);
  assert.deepEqual(fields(diffSpecs(cardSpec({ typeExtra: { numeric: "tabular-nums" } }), cardSpec({ typeExtra: { numeric: "normal" } })).findings), ["type.numeric"]);
  const bold = [{ text: "balance", style: { weight: 700 } }];
  assert.deepEqual(fields(diffSpecs(cardSpec({ textExtra: { segments: bold } }), cardSpec()).findings), ["segments"]);
  // A design tool and a build describe runs differently; between the two they are left to the picture.
  assert.equal(diffSpecs(cardSpec({ platform: "figma", textExtra: { segments: bold } }), cardSpec()).findings.length, 0);
});

test("diff: shadows are the same set in any order", () => {
  const near = { inset: false, x: 0, y: 1, blur: 2, spread: 0, color: "#0000001a" };
  const far = { inset: false, x: 0, y: 8, blur: 24, spread: 0, color: "#0000001f" };
  assert.equal(diffSpecs(cardSpec({ cardExtra: { shadow: [near, far] } }), cardSpec({ cardExtra: { shadow: [far, near] } })).findings.length, 0);
  assert.equal(diffSpecs(cardSpec({ cardExtra: { shadow: [far, near] } }), cardSpec({ cardExtra: { shadow: [near, far] } })).findings.length, 0);
  assert.deepEqual(fields(diffSpecs(cardSpec({ cardExtra: { shadow: [near, far] } }), cardSpec({ cardExtra: { shadow: [near] } })).findings), ["shadow"]);
});

test("gradient: stops without a position sit evenly, and a hand-written CSS gradient compares by value", () => {
  assert.equal(sameGradient("linear(135deg, #4f46e5, #7c3aed)", "linear(135deg, #4f46e5 0%, #7c3aed 100%)"), true);
  assert.equal(sameGradient("linear(90deg, #000000, #808080, #ffffff)", "linear(90deg, #000000 0%, #808080 50%, #ffffff 100%)"), true);
  assert.equal(sameGradient("linear(90deg, #000000, #808080, #ffffff)", "linear(90deg, #000000 0%, #808080 40%, #ffffff 100%)"), false);
  assert.equal(sameGradient("linear-gradient(to right, rgb(79, 70, 229), #7c3aed)", "linear(90deg, #4f46e5 0%, #7c3aed 100%)"), true, "as someone would write it in CSS");
  assert.equal(sameGradient("linear-gradient(0.25turn, #4f46e5, #7c3aed)", "linear(90deg, #4f46e5 0%, #7c3aed 100%)"), true);
  assert.equal(sameGradient("linear-gradient(#4f46e5, #7c3aed)", "linear(180deg, #4f46e5 0%, #7c3aed 100%)"), true, "no direction means top to bottom");

  // A design tool does not describe a radial shape the way CSS does: between tools only the stops are compared.
  const figma = "radial(#ffffff 0%, #000000 100%)";
  const css = "radial(circle at 50% 50%, #ffffff 0%, #000000 100%)";
  assert.equal(sameGradient(figma, css), false);
  assert.equal(sameGradient(figma, css, undefined, { shapes: false }), true);
  const filled = (platform, gradient) => cardSpec({ platform, cardExtra: { gradient } });
  assert.equal(diffSpecs(filled("figma", figma), filled("web", css)).findings.length, 0);
  assert.deepEqual(fields(diffSpecs(filled("web", figma), filled("web", css)).findings), ["gradient"]);

  // A hand-written spec may put the gradient under `background`.
  const legacy = (background) => ({ specVersion: "1.0", surface: surface("figma"), nodes: [{ id: "hero", role: "container", name: "Hero", background }] });
  assert.equal(diffSpecs(legacy("linear-gradient(135deg, #4f46e5, #7c3aed)"), legacy("linear-gradient(135deg, rgb(79, 70, 229) 0%, rgb(124, 58, 237) 100%)")).findings.length, 0);
});

test("colour: hue units, percentages, and an alpha that rounds to opaque", () => {
  assert.equal(toHexColor("hsl(0.5turn, 100%, 50%)"), "#00ffff");
  assert.equal(toHexColor("hsl(3.14159rad 100% 50%)"), "#00ffff");
  assert.equal(toHexColor("hsl(200grad, 100%, 50%)"), "#00ffff");
  assert.equal(toHexColor("rgba(17, 24, 39, 0.999)"), "#111827", "an alpha that rounds to 255 is opaque");
  assert.equal(toHexColor("rgb(49.8%, 0%, 0%)"), "#7f0000");
  assert.equal(sameColor("#00000000", "#ffffff00"), true, "two fully transparent colours draw the same nothing");
  assert.equal(sameColor("transparent", "rgba(255, 255, 255, 0)"), true);
});

test("diff: a hand-written transparent background paints nothing", () => {
  const legacy = (background) => ({ specVersion: "1.0", surface: surface("figma"), nodes: [{ id: "panel", role: "container", name: "Panel", background, radius: 8, border: { width: 1, color: "#e5e7eb" } }] });
  assert.equal(diffSpecs(legacy("transparent"), legacy(undefined)).findings.length, 0);
  assert.deepEqual(fields(diffSpecs(legacy("transparent"), legacy("#ffffff")).findings), ["background"]);
});

test("policy: an override merges at every depth and replaces lists whole", () => {
  const file = path.join(os.tmpdir(), `ui-parity-policy-deep-${process.pid}.json`);
  fs.writeFileSync(file, JSON.stringify({ pixel: { sameRenderer: { threshold: 0.05 } }, crossEngineAdaptive: [], loop: { maxCycles: 3 } }));
  const policy = loadPolicy(file);
  fs.rmSync(file);
  const base = loadPolicy();
  assert.equal(policy.pixel.sameRenderer.threshold, 0.05);
  assert.equal(policy.pixel.sameRenderer.tolerance, base.pixel.sameRenderer.tolerance, "a sibling of the overridden value is kept");
  assert.deepEqual(policy.pixel.otherRenderer, base.pixel.otherRenderer);
  assert.deepEqual(policy.crossEngineAdaptive, []);
  assert.equal(policy.loop.maxCycles, 3);
  assert.deepEqual(policy.tolerance, base.tolerance);
});

test("diff: an accessibility value that was not applied counts against the appearance score", () => {
  const remaps = [{ authored: "#f14f2b", accessible: "#e21e28" }];
  assert.ok(diffSpecs(cardSpec({ fill: "#f14f2b" }), cardSpec({ fill: "#f14f2b" }), { remaps }).scores.appearance < 100);
  assert.equal(diffSpecs(cardSpec({ fill: "#f14f2b" }), cardSpec({ fill: "#e21e28" }), { remaps }).scores.appearance, 100);
});

test("diff: the font environment is aligned only when both sides say so", () => {
  const silent = { fonts: { requested: ["Inter"] } };
  assert.equal(diffSpecs(cardSpec(), cardSpec()).parity.fontEnvironment, "aligned");
  assert.equal(diffSpecs(cardSpec({ surfaceExtra: silent }), cardSpec()).parity.fontEnvironment, "unknown");
  assert.equal(diffSpecs(cardSpec({ surfaceExtra: { fonts: undefined } }), cardSpec()).parity.fontEnvironment, "unknown");
});

test("diff: a hand-written reference names a few nodes; the rest of the build is not extra", () => {
  const reference = { specVersion: "1.0", surface: surface("figma"), nodes: [{ id: "title", role: "text", name: "Title", text: "Total balance", fill: "#111827", type: { family: "Inter", size: 16, weight: 400, lineHeight: 24 } }] };
  const report = diffSpecs(reference, cardSpec());
  assert.equal(report.parity.partial, true);
  assert.equal(report.findings.length, 0);
});

test("diff: excluded areas take no part in the comparison, and the result says how many there were", () => {
  const other = cardSpec({ text: "Updated 12:47", fill: "#6b7280" });
  assert.ok(diffSpecs(cardSpec({ text: "Updated 12:00" }), other).findings.length > 0);
  const report = diffSpecs(cardSpec({ text: "Updated 12:00" }), other, { ignore: [{ x: 30, y: 30, width: 110, height: 28 }] });
  assert.equal(report.findings.length, 0);
  assert.equal(report.parity.ignoredAreas, 1);
  assert.equal(report.scores.primitives.paired, 2, "the text was left out; the root and the card were compared");
});

test("diff: comparing does not change the specs it was given", () => {
  const reference = dividedList({ as: "border" });
  const implementation = dividedList({ as: "element" });
  const before = JSON.stringify([reference, implementation]);
  const first = diffSpecs(reference, implementation);
  assert.equal(JSON.stringify([reference, implementation]), before);
  assert.deepEqual(diffSpecs(reference, implementation).findings, first.findings, "and a second comparison gives the same result");
});

test("diff: a spec whose nodes do not form a tree is refused with a message", () => {
  const looped = cardSpec();
  looped.nodes[1].parent = "label"; // the card inside its own child
  assert.throws(() => diffSpecs(cardSpec(), looped), /not a tree: node card is its own ancestor/);
  assert.throws(() => diffSpecs(looped, cardSpec()), /not a tree/);
});

test("diff: a counterpart named by a key and carrying no rectangle is compared by look and placed by nothing", () => {
  // The build's card paints nothing and has no box of its own (a hand-assembled node); the key still pairs it.
  const reference = cardSpec({ cardExtra: { keys: { nodeId: "12:345" } } });
  const implementation = cardSpec({ cardExtra: { keys: { nodeId: "12:345" }, paints: false } });
  delete implementation.nodes[1].rect;
  delete implementation.nodes[1].background;
  const report = diffSpecs(reference, implementation);
  assert.equal(report.parity.partial, false);
  assert.ok(fields(report.findings).includes("background"), "the card's missing fill is reported");
  assert.ok(!report.findings.some((finding) => finding.block === "section.card" && finding.gate === "geometry"), "nothing is said about where it is");
});

/* ------------------------------------------------------------------ pairing */

test("pairing: the same artwork is the same element wherever it sits", () => {
  const icon = (id, signature, x) => ({ id, parent: "root", tag: "svg", kind: "icon", paints: true, rect: { x, y: 20, width: 24, height: 24 }, icon: { signature, strokeWidth: 1.5, stroke: "#111827", fill: null } });
  const report = diffSpecs(specOf([ROOT, icon("a", "aaaa", 20), icon("b", "bbbb", 60)]), specOf([ROOT, icon("b", "bbbb", 20), icon("a", "aaaa", 60)]));
  assert.ok(!fields(report.findings).includes("icon.artwork"), "swapped icons are not wrong icons");
  assert.ok(report.findings.some((finding) => finding.gate === "geometry"), "they are icons in the wrong place");
});

test("pairing: an image is not compared by name against a design tool's hash", () => {
  const picture = (asset) => specOf([ROOT, { id: "avatar", parent: "root", tag: "img", kind: "image", paints: true, rect: { x: 20, y: 20, width: 36, height: 36 }, asset, image: { fit: "cover" } }]);
  const design = picture("figma:abc123");
  design.surface.platform = "figma";
  assert.equal(diffSpecs(design, picture("avatar.png")).findings.length, 0);
  assert.deepEqual(fields(diffSpecs(picture("avatar.png"), picture("portrait.png")).findings), ["asset"]);
});

test("pairing: a row whose divider is a border and a row followed by a thin element are the same picture", () => {
  assert.equal(diffSpecs(dividedList({ as: "border" }), dividedList({ as: "element" })).findings.length, 0);
  assert.equal(diffSpecs(dividedList({ as: "element" }), dividedList({ as: "border" })).findings.length, 0);

  // The line's colour and width are still compared, as the border they stand for.
  const recoloured = diffSpecs(dividedList({ as: "border" }), dividedList({ as: "element", color: "#d1d5db" }));
  assert.deepEqual(fields(recoloured.findings), ["border.bottom.color"]);
  assert.equal(recoloured.findings[0].instances.length, 3);
  const thicker = diffSpecs(dividedList({ as: "border" }), dividedList({ as: "element", thickness: 2 }));
  assert.deepEqual(fields(causes(thicker)), ["border.bottom.width"]);

  // A line that stops short of the row's ends is not the row's border.
  const inset = diffSpecs(dividedList({ as: "border" }), dividedList({ as: "element", inset: 16 }));
  assert.ok(fields(causes(inset)).includes("border.bottom.width"));
  assert.ok(fields(causes(inset)).includes("presence"));
});

test("pairing: with a geometry-only reference a frame of unknown paint does not take what a painted thing pairs with", () => {
  // A field: a label icon above an input frame that holds an icon. Nothing in it has words to pair by.
  const reference = specFromMetadata(`
    <frame id="1:2" name="Home" x="0" y="0" width="390" height="400">
      <text id="1:3" name="Sign in" x="20" y="20" width="80" height="24" />
      <frame id="1:10" name="Section" x="20" y="60" width="350" height="89">
        <frame id="1:4" name="Field" x="0" y="0" width="350" height="72">
          <vector id="1:5" name="Label icon" x="0" y="0" width="16" height="16" />
          <frame id="1:6" name="Input" x="0" y="28" width="350" height="44">
            <vector id="1:7" name="Search" x="12" y="14" width="16" height="16" />
          </frame>
        </frame>
        <rectangle id="1:9" name="Rule" x="0" y="88" width="350" height="1" />
      </frame>
      <rectangle id="1:8" name="Avatar" x="334" y="14" width="36" height="36" />
    </frame>`);
  const icon = (id, parent, x, y) => ({ id, parent, tag: "svg", kind: "icon", paints: true, rect: { x, y, width: 16, height: 16 }, icon: { signature: id, strokeWidth: 1.5, stroke: "#111827", fill: null } });
  const implementation = specOf([
    ROOT,
    words("heading", "root", "Sign in", 20, 20),
    { id: "section", parent: "root", paints: true, rect: { x: 20, y: 60, width: 350, height: 89 }, border: { width: [0, 0, 1, 0], color: [null, null, "#e5e7eb", null], style: [null, null, "solid", null] }, box: box([0, 0, 16, 0], { borderWidth: [0, 0, 1, 0] }) },
    { id: "field", parent: "section", rect: { x: 20, y: 60, width: 350, height: 72 } },
    icon("label-icon", "field", 20, 60),
    { id: "input", parent: "field", tag: "input", kind: "input", paints: true, background: "#ffffff", rect: { x: 20, y: 88, width: 350, height: 44 } },
    icon("search", "field", 32, 102),
    { id: "avatar", parent: "root", tag: "img", kind: "image", paints: true, rect: { x: 334, y: 14, width: 36, height: 36 }, asset: "avatar.png", image: { fit: "cover" } },
  ]);
  const ref = loadModel(reference);
  const impl = loadModel(implementation);
  const { pairs, unmatchedRef } = matchPrimitives(ref, impl, [], { loose: true });
  const counterpart = (id) => pairs.get(ref.byId.get(id))?.node.id;
  assert.equal(counterpart("1:6"), "input", "the input frame, not the field around it, is the input");
  assert.equal(counterpart("1:8"), "avatar", "a rectangle may be an image");
  assert.equal(counterpart("1:7"), "search");
  assert.equal(counterpart("1:4"), "field", "the field is the element around both, though it paints nothing");
  assert.equal(counterpart("1:10"), "section");
  assert.equal(counterpart("1:9"), undefined, "a thin rectangle is not the 44px input that happens to sit near it");
  assert.ok(!unmatchedRef.some((node) => node.id === "1:9"), "along a box whose counterpart has a border there, it is that border");
  assert.equal(diffSpecs(reference, implementation).findings.length, 0);
});

test("diff: while both controls are empty their placeholders are compared once, as the text on screen", () => {
  const field = ({ color = "#9ca3af", shows = "placeholder" } = {}) =>
    specOf([
      ROOT,
      { id: "input", parent: "root", tag: "input", selector: "label.field > input.input", kind: "input", paints: true, background: "#ffffff", rect: { x: 20, y: 20, width: 350, height: 44 }, box: box([0, 12, 0, 12]), text: "", type: type({ size: 15, lineHeight: 20 }), fill: "#111827", placeholder: { text: "Add a note", color, opacity: 1 }, ...(shows ? { shows } : {}) },
      ...(shows ? [words("inputt", "input", "Add a note", 32, 32, 70, { selector: "label.field > input.input", role: "placeholder", fill: color, type: type({ size: 15, lineHeight: 20 }), rect: { x: 32, y: 32, width: 70, height: 20 } })] : []),
    ]);
  const shown = diffSpecs(field(), field({ color: "#6b7280" }));
  assert.deepEqual(fields(shown.findings), ["fill"]);
  assert.deepEqual(shown.findings[0].delta, ["placeholder colour #9ca3af → #6b7280"]);
  // A spec that does not carry the shown text still has its placeholder compared on the control.
  assert.deepEqual(fields(diffSpecs(field({ shows: null }), field({ shows: null, color: "#6b7280" })).findings), ["placeholder.color"]);
});

test("spacing: between the rows of a grid the gap is the one across the main axis", () => {
  const grid = (mode, rowGap) =>
    specOf([
      ROOT,
      { id: "grid", parent: "root", rect: { x: 20, y: 20, width: 350, height: 80 + rowGap }, layout: layout({ mode, gap: 24, crossGap: rowGap, wrap: mode === "row" }) },
      { id: "one", parent: "grid", paints: true, background: "#f3f4f6", rect: { x: 20, y: 20, width: 350, height: 40 } },
      { id: "two", parent: "grid", paints: true, background: "#f3f4f6", rect: { x: 20, y: 60 + rowGap, width: 350, height: 40 } },
    ]);
  assert.deepEqual(causes(diffSpecs(grid("grid", 20), grid("grid", 16))).map((finding) => finding.differs), [["div.grid row-gap 20 → 16"]]);
  assert.deepEqual(causes(diffSpecs(grid("row", 20), grid("row", 16))).map((finding) => finding.differs), [["div.grid row-gap 20 → 16"]], "and between the lines of a row that wraps");
});

/* -------------------------------------------------------------------- pixels */

function solid(width, height, rgba) {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i += 1) data.set(rgba, i * 4);
  return { width, height, data };
}
function paint(image, x0, y0, w, h, rgba) {
  for (let y = y0; y < y0 + h; y += 1) for (let x = x0; x < x0 + w; x += 1) image.data.set(rgba, (y * image.width + x) * 4);
  return image;
}

test("png: an image survives being written and read back", () => {
  const image = paint(solid(7, 5, [250, 250, 250, 255]), 2, 1, 3, 2, [79, 70, 229, 128]);
  const back = decodePng(encodePng(image));
  assert.equal(back.width, 7);
  assert.equal(back.height, 5);
  assert.deepEqual([...back.data], [...image.data]);
});

test("png: an interlaced file asks for a re-export", () => {
  const chunk = (name, body) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(body.length, 0);
    head.write(name, 4, "latin1");
    return Buffer.concat([head, body, Buffer.alloc(4)]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(1, 0);
  header.writeUInt32BE(1, 4);
  header[8] = 8;
  header[9] = 6;
  header[12] = 1; // Adam7
  const file = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", header), chunk("IDAT", zlib.deflateSync(Buffer.alloc(5))), chunk("IEND", Buffer.alloc(0))]);
  assert.throws(() => decodePng(file), /re-export/);
});

test("pixels: an edge blended one pixel differently is excused, a different colour is not", () => {
  // A dark block on white whose right edge lands half a pixel apart in the two pictures.
  const reference = paint(paint(solid(24, 24, [255, 255, 255, 255]), 4, 4, 10, 16, [20, 20, 30, 255]), 14, 4, 1, 16, [255, 255, 255, 255]);
  const implementation = paint(paint(solid(24, 24, [255, 255, 255, 255]), 4, 4, 10, 16, [20, 20, 30, 255]), 14, 4, 1, 16, [138, 138, 142, 255]);
  assert.ok(comparePixels(reference, implementation, { threshold: 0.02, tolerance: 0 }).hard > 0, "an exact comparison sees the blended column");
  assert.equal(comparePixels(reference, implementation, { threshold: 0.02, tolerance: 1 }).hard, 0, "with tolerance the blended edge is excused");

  const recoloured = paint(solid(24, 24, [255, 255, 255, 255]), 4, 4, 10, 16, [99, 102, 241, 255]);
  const compared = comparePixels(reference, recoloured, { threshold: 0.02, tolerance: 1 });
  assert.ok(compared.hard > 100, "a different fill is still a difference");
  assert.equal(findRegions(compared, 8).length, 1);
});

test("pixels: excluded areas are not compared", () => {
  const reference = solid(32, 32, [255, 255, 255, 255]);
  const implementation = paint(solid(32, 32, [255, 255, 255, 255]), 8, 8, 8, 8, [0, 0, 0, 255]);
  assert.equal(comparePixels(reference, implementation).hard, 64);
  assert.equal(comparePixels(reference, implementation, { ignore: [{ x: 6, y: 6, width: 12, height: 12 }] }).hard, 0);
});

/* ------------------------------------------------------ verdict and progress */

// What the overlay reports, written out by hand. Sizes and regions are in CSS px.
const pixelReport = (extra = {}) => ({ regions: [], sizeMatches: true, differingShare: 0, probed: {}, excusedPixels: 0, ignoredAreas: 0, overlay: "pixel-diff.png", reference: { width: 390, height: 400 }, implementation: { width: 390, height: 400 }, ...extra });
const regionOnText = () => ({ id: "R01", x: 40, y: 36, width: 20, height: 10, pixels: 120, owner: { id: "labelt", name: '"Total balance"', selector: "section.card > p.label", kind: "text" } });

/** One measurement cycle of a build against the plain card, joined with a pixel report when there is one. */
function cycle(build = {}, pixels = null) {
  const implementation = cardSpec(build);
  return judge(diffSpecs(cardSpec(), implementation), pixels, implementation);
}

test("verdict: identical specs are at parity, and without a picture the verdict says pixels were not checked", () => {
  const result = cycle();
  assert.equal(result.verdict.parity, true);
  assert.deepEqual(result.verdict.checked, ["appearance", "geometry"]);
  assert.deepEqual(result.verdict.notChecked, ["pixels"]);
  assert.equal(result.pixels, null);

  const withPicture = cycle({}, pixelReport());
  assert.equal(withPicture.verdict.parity, true);
  assert.deepEqual(withPicture.verdict.notChecked, []);
});

test("verdict: one cause to fix is not parity", () => {
  const result = cycle({ fill: "#374151" });
  assert.equal(result.scores.toFix, 1);
  assert.equal(result.verdict.parity, false);
});

test("verdict: a differing region that no finding accounts for is unexplained and blocks parity", () => {
  const result = cycle({}, pixelReport({ regions: [regionOnText()], differingShare: 0.08 }));
  assert.equal(result.findings.length, 0);
  assert.equal(result.regions[0].explained, false);
  assert.equal(result.pixels.unexplained, 1);
  assert.equal(result.verdict.parity, false);

  // The same region on a primitive the diff reports is accounted for.
  const reported = cycle({ fill: "#374151" }, pixelReport({ regions: [regionOnText()], differingShare: 0.08 }));
  assert.equal(reported.regions[0].explained, true);
  assert.equal(reported.pixels.unexplained, 0);
});

test("verdict: pictures of different sizes are not at parity", () => {
  const result = cycle({}, pixelReport({ sizeMatches: false, implementation: { width: 390, height: 420 } }));
  assert.equal(result.findings.length, 0);
  assert.equal(result.pixels.regions, 0);
  assert.equal(result.verdict.parity, false);
});

test("progress: fewer causes and unexplained regions than the previous cycle is progress", () => {
  const before = cycle({ padding: 16, fill: "#374151" });
  const fewer = progress(cycle({ fill: "#374151" }), before);
  assert.equal(fewer.openBefore, before.scores.toFix);
  assert.equal(fewer.open, 1);
  assert.ok(fewer.open < fewer.openBefore);
  assert.deepEqual(fewer.appeared, []);
  assert.deepEqual(fewer.worse, []);

  // An unexplained region is an open item as well.
  const cleared = progress(cycle({}, pixelReport()), cycle({}, pixelReport({ regions: [regionOnText()], differingShare: 0.08 })));
  assert.equal(cleared.openBefore, 1);
  assert.equal(cleared.open, 0);
});

test("progress: a cause the previous cycle did not have is named", () => {
  const { appeared, open, openBefore } = progress(cycle({ fill: "#374151", typeExtra: { weight: 600 } }), cycle({ fill: "#374151" }));
  assert.equal(appeared.length, 1);
  assert.match(appeared[0], /"Total balance": font weight 400 → 600$/);
  assert.ok(open > openBefore);
});

test("progress: a score lower than the previous cycle's is named", () => {
  const moved = cycle({ padding: 16 });
  assert.deepEqual(progress(moved, cycle()).worse, [`geometry 100% → ${moved.scores.geometry}%`]);
  assert.deepEqual(progress(cycle(), moved).worse, [], "a higher score is not");
});

test("verdict: a region on a leave-alone difference is listed and does not stand in the way", () => {
  const remaps = [{ authored: "#f14f2b", accessible: "#e21e28" }];
  const implementation = cardSpec({ fill: "#e21e28" });
  const result = judge(diffSpecs(cardSpec({ fill: "#f14f2b" }), implementation, { remaps }), pixelReport({ regions: [regionOnText()], differingShare: 0.08 }), implementation);
  assert.equal(result.regions[0].sanctioned, true);
  assert.equal(result.regions[0].explained, true);
  assert.equal(result.pixels.sanctioned, 1);
  assert.equal(result.pixels.unexplained, 0);
  assert.equal(result.verdict.parity, true);
  assert.match(scorecard(result), /1 differing region\(s\), 0 with no measured explanation, 1 on leave-alone differences/);

  // A region that a cause explains is not sanctioned, and blocks parity with its cause.
  const wrong = cycle({ fill: "#374151" }, pixelReport({ regions: [regionOnText()], differingShare: 0.08 }));
  assert.equal(wrong.regions[0].sanctioned, false);
  assert.equal(wrong.verdict.parity, false);
});

test("verdict: every element is probed, painted or not, and the printed result names what was left out", () => {
  assert.deepEqual(probesFor(cardSpec()).map((probe) => probe.id), ["root", "card", "label", "labelt"]);
  const implementation = cardSpec();
  const design = cardSpec({ platform: "figma" });
  design.nodes.push({ id: "status", parent: "root", tag: "div", name: "Status Bar", selector: "div.status-bar", kind: "box", paints: true, rect: { x: 0, y: 0, width: 390, height: 20 }, background: "#000000", layout: layout(), box: box() });
  const result = judge(diffSpecs(design, implementation, { ignore: [{ x: 0, y: 380, width: 10, height: 10 }] }), null, implementation);
  const printed = scorecard(result);
  assert.match(printed, /left out as OS chrome or platform-only: div\.status-bar/);
  assert.match(printed, /left out on request: 1 area\(s\)/);
  assert.match(printed, /not checked: pixels \(no reference image was given/);
  assert.doesNotMatch(summarize(result, { header: false }), /paired/);
});

test("cycle: the density of a reference picture is read off its width", () => {
  const file = path.join(os.tmpdir(), `ui-parity-density-${process.pid}.png`);
  const spec = cardSpec();
  try {
    fs.writeFileSync(file, encodePng(solid(780, 4, [255, 255, 255, 255])));
    assert.equal(densityOf(file, spec), 2);
    fs.writeFileSync(file, encodePng(solid(390, 4, [255, 255, 255, 255])));
    assert.equal(densityOf(file, spec), 1);
    fs.writeFileSync(file, encodePng(solid(400, 4, [255, 255, 255, 255])));
    assert.equal(densityOf(file, spec), null, "a width that is no whole multiple of the surface says nothing");
  } finally {
    fs.rmSync(file, { force: true });
  }
});

/* --------------------------------------------------------------------- figma */

// The capture script is the body of an async function that reads a global `figma`. Here it
// runs against a stand-in for the Plugin API: 400 nodes, built the way a real frame is.
const FIGMA_SCRIPT = fs.readFileSync(new URL("../scripts/extract_figma.js", import.meta.url), "utf8");
const AsyncFunction = (async () => {}).constructor;

function fakeFigma({ missingFont = false, rootExtra = {} } = {}) {
  const mixed = Symbol("mixed");
  const rgb = (r, g, b) => ({ r: r / 255, g: g / 255, b: b / 255 });
  const solid = (r, g, b, opacity = 1) => ({ type: "SOLID", visible: true, opacity, color: rgb(r, g, b) });
  const base = (id, type, name, x, y, width, height, extra = {}) => ({ id, type, name, visible: true, opacity: 1, width, height, absoluteBoundingBox: { x, y, width, height }, fills: [], strokes: [], effects: [], boundVariables: {}, ...extra });
  const text = (id, name, x, y, width, height, extra = {}) =>
    base(id, "TEXT", name, x, y, width, height, {
      characters: name,
      fills: [solid(17, 24, 39)],
      fontName: { family: "Inter", style: "Semi Bold" },
      fontSize: 16,
      fontWeight: 600,
      lineHeight: { unit: "PIXELS", value: 24 },
      letterSpacing: { unit: "PERCENT", value: -1 },
      textCase: "ORIGINAL",
      textDecoration: "NONE",
      textAlignHorizontal: "LEFT",
      textAlignVertical: "TOP",
      textAutoResize: "WIDTH_AND_HEIGHT",
      textTruncation: "DISABLED",
      textStyleId: "S:title",
      hasMissingFont: missingFont,
      ...extra,
    });
  const cards = [];
  for (let i = 0; i < 57; i += 1) {
    const top = 1000 + 24 + i * 136;
    const id = `1:${10 + i * 10}`;
    const vector = base(`${id}v`, "VECTOR", "Vector", 524, top + 20, 16, 16, { strokes: [solid(79, 70, 229)], strokeWeight: 1.5 });
    cards.push(
      base(id, "FRAME", "Card", 524, top, 342, 120, {
        layoutMode: "VERTICAL",
        itemSpacing: 4,
        paddingTop: 16,
        paddingRight: 16,
        paddingBottom: 16,
        paddingLeft: 16,
        primaryAxisAlignItems: "MIN",
        counterAxisAlignItems: "MIN",
        layoutWrap: "NO_WRAP",
        layoutSizingHorizontal: "FILL",
        layoutSizingVertical: "HUG",
        fills: [solid(255, 255, 255)],
        strokes: [solid(229, 231, 235)],
        strokeWeight: 1,
        strokeAlign: "INSIDE",
        cornerRadius: 12,
        effects: [{ type: "DROP_SHADOW", visible: true, offset: { x: 0, y: 1 }, radius: 2, spread: 0, color: { r: 0, g: 0, b: 0, a: 0.06 } }],
        boundVariables: { paddingTop: { type: "VARIABLE_ALIAS", id: "V:space-4" }, fills: [{ type: "VARIABLE_ALIAS", id: "V:surface" }] },
        children: [
          text(`${id}a`, `Card title ${i}`, 540, top + 16, 96, 24),
          text(`${id}b`, "Updated a moment ago", 540, top + 44, 310, 20, { fontSize: 13, fontWeight: 400, lineHeight: { unit: "AUTO" }, textAutoResize: "HEIGHT", textAlignHorizontal: "CENTER" }),
          base(`${id}c`, "GROUP", "icon/arrow", 524, top + 20, 16, 16, { children: [vector] }),
          base(`${id}d`, "RECTANGLE", "Thumb", 540, top + 68, 36, 36, { fills: [{ type: "IMAGE", visible: true, opacity: 1, scaleMode: "FILL", imageHash: "abc123" }], cornerRadius: 18, constraints: { horizontal: "MIN", vertical: "MIN" } }),
          base(`${id}e`, "LINE", "Divider", 540, top + 110, 310, 0, { strokes: [solid(229, 231, 235)], strokeWeight: 1, strokeAlign: "CENTER" }),
          base(`${id}f`, "INSTANCE", "Button", 786, top + 72, 64, 32, { fills: [solid(79, 70, 229)], cornerRadius: mixed, topLeftRadius: 8, topRightRadius: 8, bottomRightRadius: 8, bottomLeftRadius: 8, strokes: [solid(55, 48, 163)], strokeWeight: 2, strokeAlign: "OUTSIDE", getMainComponentAsync: async () => ({ name: "Size=Small", parent: { type: "COMPONENT_SET", name: "Button" } }) }),
        ],
      }),
    );
  }
  const root = base("1:2", "FRAME", "Home", 500, 1000, 390, 24 + 57 * 136, { layoutMode: "VERTICAL", itemSpacing: 16, paddingTop: 24, paddingRight: 24, paddingBottom: 24, paddingLeft: 24, primaryAxisAlignItems: "MIN", counterAxisAlignItems: "MIN", layoutWrap: "NO_WRAP", fills: [solid(245, 246, 250)], children: cards, ...rootExtra });
  const byId = new Map();
  (function index(node) {
    byId.set(node.id, node);
    (node.children || []).forEach(index);
  })(root);
  return {
    mixed,
    fileKey: "FILEKEY",
    getNodeByIdAsync: async (id) => byId.get(id) || null,
    getStyleByIdAsync: async (id) => ({ "S:title": { name: "Title/Medium" } })[id] || null,
    variables: { getVariableByIdAsync: async (id) => ({ "V:space-4": { name: "space/4" }, "V:surface": { name: "color/surface" } })[id] || null },
  };
}

async function capturePages(limit = 2000, options = {}) {
  const figma = fakeFigma(options);
  const pages = [];
  for (let offset = 0; offset !== null; ) {
    const source = FIGMA_SCRIPT.replace('const NODE_ID = "0:0"', 'const NODE_ID = "1:2"').replace("const OFFSET = 0", `const OFFSET = ${offset}`).replace("const LIMIT = 2000", `const LIMIT = ${limit}`);
    const page = await new AsyncFunction("figma", source)(figma);
    pages.push(page);
    offset = page.nextOffset;
  }
  return pages;
}

test("figma: a 400-node frame comes back in pages under the output limit, every node exactly once", async () => {
  const pages = await capturePages();
  assert.ok(pages.length > 1, "more than one page was needed");
  assert.equal(pages[0].total, 400);
  for (const page of pages) assert.ok(JSON.stringify(page).length <= 18000, `page at ${page.offset} is ${JSON.stringify(page).length} characters`);
  const ids = pages.flatMap((page) => page.nodes.map((node) => node.id));
  assert.equal(ids.length, 400);
  assert.equal(new Set(ids).size, 400);
  assert.equal(mergeParts(pages).nodes.length, 400);
});

test("figma: nodes arrive in the format the web extractor produces", async () => {
  const spec = mergeParts(await capturePages());
  assert.equal(spec.surface.platform, "figma");
  assert.deepEqual(spec.surface.root, { selector: "1:2", width: 390, height: 24 + 57 * 136, pageX: 0, pageY: 0 });
  const [root, card, title, subtitle, icon, thumb, divider, button] = spec.nodes;
  assert.deepEqual(root.rect, { x: 0, y: 0, width: 390, height: 24 + 57 * 136 });
  assert.deepEqual(card.rect, { x: 24, y: 24, width: 342, height: 120 }, "positions are relative to the frame");
  assert.equal(card.background, "#ffffff");
  assert.deepEqual(card.border.width, [1, 1, 1, 1]);
  assert.equal(card.strokeAlign, "inside");
  assert.deepEqual(card.box.borderWidth, [0, 0, 0, 0], "a stroke that takes no layout space adds nothing to insets");
  assert.deepEqual(card.box.padding, [16, 16, 16, 16]);
  assert.deepEqual(card.layout.mode, "column");
  assert.equal(card.layout.gap, 4);
  assert.deepEqual(card.radius, [12, 12, 12, 12]);
  assert.deepEqual(card.shadow, [{ inset: false, x: 0, y: 1, blur: 2, spread: 0, color: "#0000000f" }]);
  assert.deepEqual(card.tokenRefs, { padding: "space/4", background: "color/surface" });
  assert.equal(card.box.fixed, undefined, "fill and hug are not explicit sizes");
  assert.equal(title.kind, "text");
  assert.equal(title.type.letterSpacing, -0.16);
  assert.equal(title.type.lineHeight, 24);
  assert.equal(title.textBox.fixedWidth, false);
  assert.equal(title.tokenRefs.type, "Title/Medium");
  assert.equal(subtitle.textBox.fixedWidth, true);
  assert.equal(subtitle.type.lineHeightSet, false);
  assert.equal(subtitle.type.align, "center");
  assert.equal(icon.kind, "icon");
  assert.equal(icon.icon.strokeWidth, 1.5);
  assert.ok(!spec.nodes.some((node) => node.tag === "vector"), "an icon is one primitive, not its vectors");
  assert.equal(thumb.kind, "image");
  assert.equal(thumb.image.fit, "cover");
  assert.deepEqual(divider.rect, { x: 40, y: 133.5, width: 310, height: 1 }, "a line becomes the thin box it draws");
  assert.equal(divider.background, "#e5e7eb");
  assert.equal(button.component, "Button / Size=Small");
  assert.deepEqual(button.outline, { width: 2, color: "#3730a3", style: "solid", offset: 0 }, "an outside stroke is a ring, not a border");
  assert.deepEqual(button.radius, [8, 8, 8, 8]);
  assert.equal(diffSpecs(spec, structuredClone(spec)).findings.length, 0);
});

test("figma: a font the file asks for and the machine lacks makes the reference's text metrics untrusted", async () => {
  const [page] = await capturePages(2000, { missingFont: true });
  assert.deepEqual(page.surface.fonts, { requested: ["Inter"], loaded: [], aligned: false });
  const [whole] = await capturePages();
  assert.deepEqual(whole.surface.fonts, { requested: ["Inter"], loaded: ["Inter"], aligned: true });
});

test("figma: the frame's page is loaded before its layers are read, and nothing else is called on the file", async () => {
  const figma = fakeFigma();
  const calls = [];
  const root = await figma.getNodeByIdAsync("1:2");
  root.parent = { type: "SECTION", parent: { type: "PAGE", loadAsync: async () => calls.push("loadAsync") } };
  const source = FIGMA_SCRIPT.replace('const NODE_ID = "0:0"', 'const NODE_ID = "1:2"');
  const page = await new AsyncFunction("figma", source)(figma);
  assert.deepEqual(calls, ["loadAsync"]);
  assert.equal(page.total, 400);
  // The script reads; it has no call that creates, moves, removes, or binds anything.
  assert.doesNotMatch(FIGMA_SCRIPT, /\.(appendChild|insertChild|remove|resize|rescale|setBoundVariable|setPluginData|setSharedPluginData|detachInstance|createFrame|createText|createRectangle|setCurrentPageAsync)\(/);
});

test("figma: a grid frame is read as a grid, with its two gaps", async () => {
  const [page] = await capturePages(2000, { rootExtra: { layoutMode: "GRID", gridColumnGap: 24, gridRowGap: 20 } });
  const { mode, gap, crossGap } = page.nodes[0].layout;
  assert.deepEqual({ mode, gap, crossGap }, { mode: "grid", gap: 24, crossGap: 20 });
});

test("figma: a fixed-width text box is compared by its anchor, not its box", async () => {
  const reference = mergeParts(await capturePages());
  const implementation = structuredClone(reference);
  implementation.surface.platform = "web";
  // The build measures the words themselves: 120px wide, centred in the same 310px box.
  for (const node of implementation.nodes.filter((item) => item.text === "Updated a moment ago")) {
    delete node.textBox;
    node.rect = { ...node.rect, x: node.rect.x + 95, width: 120 };
    node.type = { ...node.type, lineHeightSet: true };
  }
  const centred = diffSpecs(reference, implementation);
  assert.equal(centred.findings.filter((finding) => /Updated/.test(finding.block)).length, 0, "centred words in a centred box are in place");

  for (const node of implementation.nodes.filter((item) => item.text === "Updated a moment ago")) node.rect = { ...node.rect, x: node.rect.x - 95 };
  const left = diffSpecs(mergeParts(await capturePages()), implementation);
  assert.ok(left.findings.some((finding) => /Updated/.test(finding.block) && finding.gate === "geometry"), "left-aligned words in a centred box are not");
});

test("figma: a missing or repeated page stops the merge and names the range", async () => {
  const pages = await capturePages(20);
  assert.equal(pages.length, 20);
  const withGap = pages.filter((page) => page.offset < 120 || page.offset >= 240);
  assert.throws(() => mergeParts(withGap), /Missing nodes 120–239 of 400.*OFFSET = 120/);
  assert.throws(() => mergeParts(pages.slice(0, 19)), /Missing nodes 380–399 of 400/);
  assert.throws(() => mergeParts([...pages, pages[6]]), /Nodes 120–139 of 400 appear in more than one page/);
  assert.throws(() => mergeParts(pages.slice(1)), /Missing nodes 0–19 of 400/);
  assert.equal(mergeParts([...pages].reverse()).nodes.length, 400, "page order does not matter");
  assert.equal(mergeParts(pages.map((page) => JSON.stringify({ result: page }))).nodes.length, 400, "pages wrapped by the tool that ran the script are unwrapped");
});

test("figma: read-only metadata becomes a geometry-only spec", () => {
  const xml = `
    <frame id="1:2" name="Home" x="500" y="1000" width="390" height="844">
      <frame id="1:3" name="Card" x="24" y="24" width="342" height="120">
        <text id="1:4" name="Total balance" x="16" y="16" width="96" height="24" />
        <instance id="1:5" name="Button &amp; label" x="262" y="72" width="64" height="32">
          <text id="1:6" name="Send" x="16" y="6" width="32" height="20" />
        </instance>
        <vector id="1:7" name="Arrow" x="0" y="20" width="16" height="16" />
        <rectangle id="1:8" name="Hidden" x="0" y="0" width="10" height="10" hidden="true" />
      </frame>
    </frame>`;
  const spec = specFromMetadata(xml);
  assert.equal(spec.surface.fidelity, "geometry-only");
  assert.equal(spec.surface.coordinates, "parent");
  assert.deepEqual(spec.nodes.map((node) => node.id), ["1:2", "1:3", "1:4", "1:5", "1:6", "1:7"]);
  const byId = Object.fromEntries(spec.nodes.map((node) => [node.id, node]));
  assert.deepEqual(byId["1:2"].rect, { x: 0, y: 0, width: 390, height: 844 });
  assert.deepEqual(byId["1:4"].rect, { x: 40, y: 40, width: 96, height: 24 }, "positions accumulate down the tree to the frame's corner");
  assert.deepEqual(byId["1:6"].rect, { x: 302, y: 102, width: 32, height: 20 });
  assert.equal(byId["1:4"].text, "Total balance");
  assert.equal(byId["1:5"].name, "Button & label");
  assert.equal(byId["1:3"].wrapper, true);
  assert.equal(byId["1:7"].kind, "icon");
  for (const node of spec.nodes) for (const key of ["background", "gradient", "border", "shadow", "radius", "fill", "type"]) assert.equal(node[key], undefined, `${node.id} claims ${key}`);

  // The same tree with canvas coordinates reads the same.
  const canvas = specFromMetadata(xml.replace('x="24" y="24"', 'x="524" y="1024"').replace('x="16" y="16"', 'x="540" y="1040"').replace('x="262" y="72"', 'x="786" y="1096"').replace('x="16" y="6"', 'x="802" y="1102"').replace('x="0" y="20"', 'x="524" y="1044"'));
  assert.equal(canvas.surface.coordinates, "canvas");
  assert.deepEqual(canvas.nodes.find((node) => node.id === "1:6").rect, { x: 302, y: 102, width: 32, height: 20 });
});

test("figma: a geometry-only reference is checked for placement, not for looks", () => {
  const reference = specFromMetadata(`<frame id="1:2" name="Home" x="0" y="0" width="390" height="400"><frame id="1:3" name="Card" x="20" y="20" width="350" height="48"><text id="1:4" name="Total balance" x="12" y="12" width="100" height="24" /></frame></frame>`);
  const same = diffSpecs(reference, cardSpec({ padding: 12 }));
  assert.equal(same.findings.length, 0);
  assert.equal(same.scores.appearance, null);
  assert.deepEqual(same.parity.checked, ["geometry"]);

  const moved = diffSpecs(reference, cardSpec({ padding: 16 }));
  assert.ok(causes(moved).some((finding) => finding.gate === "geometry" && finding.specField === "spacing.top"));
  assert.ok(moved.findings.filter((finding) => finding.specField === "size.width" && /Total balance/.test(finding.block)).every((finding) => finding.action === "untrusted"));
});
