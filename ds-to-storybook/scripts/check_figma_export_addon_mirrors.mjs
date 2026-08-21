#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const skillRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const canonicalRoot = path.join(skillRoot, "assets", "figma-export-addon");
const mirrorRoots = [
  path.join(
    skillRoot,
    "storybook-template",
    ".storybook",
    "vendor",
    "figma-export-addon",
  ),
  path.join(skillRoot, "storybook-template", "vendor", "figma-export"),
];
const rootFiles = [
  "README.md",
  "package.json",
  "tsconfig.json",
  "tsup.config.ts",
];
const relativeFiles = [
  ...rootFiles,
  ...walk(path.join(canonicalRoot, "src")).map((file) => `src/${file}`),
  ...walk(path.join(canonicalRoot, "dist")).map((file) => `dist/${file}`),
].sort();
const canonicalManifest = buildManifest(canonicalRoot, relativeFiles);
const canonicalHash = hash(JSON.stringify(canonicalManifest));

for (const mirrorRoot of mirrorRoots) {
  assert.deepEqual(
    walk(path.join(mirrorRoot, "src")),
    walk(path.join(canonicalRoot, "src")),
    `${mirrorRoot} src file inventory differs from canonical`,
  );
  assert.deepEqual(
    walk(path.join(mirrorRoot, "dist")),
    walk(path.join(canonicalRoot, "dist")),
    `${mirrorRoot} dist file inventory differs from canonical`,
  );
  const mirrorManifest = buildManifest(mirrorRoot, relativeFiles);
  assert.deepEqual(
    mirrorManifest,
    canonicalManifest,
    `${mirrorRoot} content differs from canonical`,
  );
  assert.equal(
    hash(JSON.stringify(mirrorManifest)),
    canonicalHash,
    `${mirrorRoot} aggregate hash differs from canonical`,
  );
}

console.log(
  `Figma export addon mirrors match canonical (${relativeFiles.length} files, sha256:${canonicalHash})`,
);

function walk(root) {
  if (!fs.existsSync(root)) return [];
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) {
      for (const nested of walk(absolute)) {
        files.push(`${entry.name}/${nested}`);
      }
    } else if (entry.isFile()) {
      files.push(entry.name);
    }
  }
  return files.sort();
}

function buildManifest(root, files) {
  return Object.fromEntries(
    files.map((file) => [
      file,
      hash(fs.readFileSync(path.join(root, file))),
    ]),
  );
}

function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
