import assert from "node:assert/strict";

import { createFigmaPluginCode } from "../dist/index.js";

const cssFontStack = '"Helvetica Neue", Helvetica, "Arial Narrow", Arial, sans-serif';
const payload = {
  componentTitle: "Font fallback fixture",
  generatedAt: "2026-07-21T00:00:00.000Z",
  root: {
    bindings: { fontFamily: "--fx-ref-typeface-grotesque" },
    children: [],
    kind: "text",
    name: "label",
    styles: {
      color: "#000000",
      fontFamily: cssFontStack,
      fontSize: 14,
      fontWeight: 700,
      height: 20,
      width: 160,
      x: 0,
      y: 0,
    },
    text: "Fallback family",
  },
  storyId: "fixture--font-fallback",
  storyName: "Font fallback",
  tokens: [
    {
      collection: "ref",
      cssName: "--fx-ref-typeface-grotesque",
      figmaName: "ref/typeface/grotesque",
      rawValue: cssFontStack,
      scopes: ["FONT_FAMILY"],
      type: "STRING",
      value: 'Helvetica Neue", Helvetica, "Arial Narrow", Arial, sans-serif',
    },
  ],
  version: 2,
};

const code = createFigmaPluginCode(payload);

assert.doesNotThrow(
  () => new Function("figma", code),
  "generated Console script is valid JavaScript",
);
assert.match(
  code,
  /fontFamilyTokenNames = collectFontFamilyTokenNames/,
  "generated script derives the complete font-family token alias chain",
);
assert.match(
  code,
  /return getFontFamily\(valueOr\(spec\.rawValue, spec\.value\)\)/,
  "generated script normalizes legacy font variable values before writing them",
);
assert.match(
  code,
  /for \(const family of families\)/,
  "generated script tries concrete CSS fallback families in order",
);
assert.ok(
  !code.includes('String(fontFamily || "Inter").split(",")[0]'),
  "generated script no longer truncates CSS family lists with a naive split",
);

console.log("run-plugin-code-test: all assertions passed");
