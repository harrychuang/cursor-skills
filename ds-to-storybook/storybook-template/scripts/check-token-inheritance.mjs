import { readFileSync } from "node:fs";

const { storybookTemplateProjectConfig } = await import(
  "../.storybook/project.config.ts"
);
const tokenPrefix = storybookTemplateProjectConfig.project.tokenPrefix;
const files = [
  { layer: "ref", path: "tokens/tokens-ref.css" },
  { layer: "sys", path: "tokens/tokens-sys.css" },
  { layer: "comp", path: "tokens/tokens-comp.css" },
];

function escapeRegexLiteral(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const escapedPrefix = escapeRegexLiteral(tokenPrefix);
const tokenPattern = new RegExp(
  `(--${escapedPrefix}-(ref|sys|comp)-[a-z0-9-]+)\\s*:\\s*([^;]+);`,
  "gi",
);
const referencePattern = new RegExp(
  `var\\((--${escapedPrefix}-(ref|sys|comp)-[a-z0-9-]+)\\)`,
  "gi",
);
const violations = [];

function allowedReferenceLayer(layer) {
  if (layer === "sys") return "ref";
  if (layer === "comp") return "sys";
  return null;
}

for (const file of files) {
  const source = readFileSync(file.path, "utf8");
  const tokens = Array.from(source.matchAll(tokenPattern));

  for (const match of tokens) {
    const [, tokenName, declaredLayer, value] = match;

    if (declaredLayer !== file.layer) {
      violations.push(
        `${file.path}: ${tokenName} declared layer ${declaredLayer}; expected ${file.layer}.`,
      );
    }

    const expectedReferenceLayer = allowedReferenceLayer(file.layer);
    const references = Array.from(value.matchAll(referencePattern), (reference) => ({
      layer: reference[2],
      tokenName: reference[1],
    }));

    if (file.layer === "ref" && references.length > 0) {
      violations.push(`${file.path}: ${tokenName} is a ref token and must not reference tokens.`);
    }

    if (expectedReferenceLayer) {
      for (const reference of references) {
        if (reference.layer !== expectedReferenceLayer) {
          violations.push(
            `${file.path}: ${tokenName} references ${reference.tokenName} (actual layer ${reference.layer}); expected ${expectedReferenceLayer}.`,
          );
        }
      }
    }
  }
}

if (violations.length > 0) {
  console.error("Token inheritance check failed:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log(`Token inheritance check passed for prefix "${tokenPrefix}".`);
