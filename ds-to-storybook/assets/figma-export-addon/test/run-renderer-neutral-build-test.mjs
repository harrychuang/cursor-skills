#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const addonRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimeFiles = ["preview.js", "review.js"];
const forbiddenSpecifiers = [
  "react",
  "react-dom",
  "react-dom/client",
  "@storybook/icons",
];

for (const fileName of runtimeFiles) {
  const filePath = path.join(addonRoot, "dist", fileName);
  const source = fs.readFileSync(filePath, "utf8");
  for (const specifier of forbiddenSpecifiers) {
    const escaped = specifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const importPattern = new RegExp(
      String.raw`(?:from\s*|import\s*\(|require\s*\()\s*["']${escaped}["']`,
    );
    assert.doesNotMatch(
      source,
      importPattern,
      `${fileName} must not import ${specifier}`,
    );
  }
}

console.log(
  `renderer-neutral build checks passed (${runtimeFiles.join(", ")})`,
);
