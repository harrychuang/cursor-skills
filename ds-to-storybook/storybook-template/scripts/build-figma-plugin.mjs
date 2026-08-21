import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createFigmaImporterPluginMainCode } from "@harrychuang/storybook-addon-figma-export/plugin-code";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(rootDir, "figma/storybook-code-to-design/main.js");
const checkOnly = process.argv.includes("--check");
const expectedMain = createFigmaImporterPluginMainCode({
  height: 520,
  width: 360,
});

function assertFigmaRuntimeCompatible(source) {
  try {
    new Function(source);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Generated Figma plugin main.js is not valid JavaScript: ${message}`);
    process.exit(1);
  }

  const unsupportedPatterns = [
    { label: "optional chaining", pattern: /\?\./ },
    { label: "nullish coalescing", pattern: /\?\?/ },
    { label: "optional catch binding", pattern: /catch\s*\{/ },
  ];

  for (const { label, pattern } of unsupportedPatterns) {
    if (pattern.test(source)) {
      console.error(`Generated Figma plugin main.js contains unsupported ${label} syntax.`);
      process.exit(1);
    }
  }
}

assertFigmaRuntimeCompatible(expectedMain);

if (checkOnly) {
  const currentMain = readFileSync(outputPath, "utf8");

  if (currentMain !== expectedMain) {
    console.error(
      "Figma plugin main.js is out of sync with the Storybook Figma export addon. Run npm run build:figma-plugin.",
    );
    process.exit(1);
  }

  console.log("Figma plugin importer is in sync with the Storybook Figma export addon.");
  process.exit(0);
}

writeFileSync(outputPath, expectedMain);
console.log("Generated figma/storybook-code-to-design/main.js from the Storybook Figma export addon.");
