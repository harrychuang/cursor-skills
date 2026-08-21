#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const addonRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const storybookCli = path.join(
  addonRoot,
  "node_modules",
  "storybook",
  "dist",
  "bin",
  "dispatcher.js",
);
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sbfx-renderer-builds-"));

try {
  assertVueManifestHasNoReact();
  for (const renderer of ["react", "vue"]) {
    buildFixture(renderer);
  }
  console.log("React and Vue Storybook fixture builds passed.");
} finally {
  fs.rmSync(outputRoot, { recursive: true, force: true });
}

function assertVueManifestHasNoReact() {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(addonRoot, "test", "fixtures", "vue", "package.json"), "utf8"),
  );
  for (const section of [
    manifest.dependencies,
    manifest.devDependencies,
    manifest.peerDependencies,
    manifest.optionalDependencies,
  ]) {
    assert.equal(Boolean(section?.react), false, "Vue fixture must not declare react");
    assert.equal(Boolean(section?.["react-dom"]), false, "Vue fixture must not declare react-dom");
  }
}

function buildFixture(renderer) {
  const fixtureRoot = path.join(addonRoot, "test", "fixtures", renderer);
  const outputDir = path.join(outputRoot, renderer);
  const result = spawnSync(
    process.execPath,
    [
      storybookCli,
      "build",
      "--config-dir",
      path.join(fixtureRoot, ".storybook"),
      "--output-dir",
      outputDir,
      "--quiet",
    ],
    {
      cwd: fixtureRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        STORYBOOK_DISABLE_TELEMETRY: "1",
      },
    },
  );

  assert.equal(
    result.status,
    0,
    `${renderer} Storybook build failed:\n${result.stdout}\n${result.stderr}`,
  );
  assert.equal(fs.existsSync(path.join(outputDir, "index.html")), true);
}
