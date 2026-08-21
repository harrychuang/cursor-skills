#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const installer = path.join(scriptDir, "install_figma_export_addon.mjs");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sbfx-installer-"));

try {
  testVueJsonReport();
  testConflictFailsBeforeMutation();
  testOverrideResolvesConflict();
  testUnknownRendererFailsBeforeMutation();
  testPackageManagerFlagsAreAccepted();
  testVueWiringIsGeneratedIdempotently();
  testUnsupportedReviewFallsBackToCoreWiring();
  console.log("Figma export addon installer tests passed.");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

function testVueJsonReport() {
  const project = createProject("vue", {
    devDependencies: {
      "@storybook/vue3-vite": "^10.4.1",
      storybook: "^10.4.1",
    },
  }, '@storybook/vue3-vite');
  const result = run(project, "--copy-only", "--json");
  assert.equal(result.status, 0, result.stderr);
  const report = parseSingleJsonLine(result.stdout);
  assert.deepEqual(
    {
      renderer: report.renderer,
      builder: report.builder,
      storybookMajor: report.storybookMajor,
      confidence: report.confidence,
      capabilities: report.capabilities,
    },
    {
      renderer: "vue3",
      builder: "vite",
      storybookMajor: 10,
      confidence: "exact",
      capabilities: {
        coreExport: "supported",
        reviewWorkspace: "supported",
        visualComments: "supported",
        persistence: "supported",
      },
    },
  );
}

function testConflictFailsBeforeMutation() {
  const project = createProject("conflict", {
    devDependencies: {
      "@storybook/react-vite": "^10.4.1",
      storybook: "^10.4.1",
    },
  }, '@storybook/vue3-vite');
  const before = snapshotProject(project);
  const result = run(project);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unable to determine one safe Storybook environment/);
  assert.match(result.stderr, /--renderer/);
  assert.deepEqual(snapshotProject(project), before);
  assert.equal(fs.existsSync(path.join(project, ".storybook", "vendor")), false);
}

function testOverrideResolvesConflict() {
  const project = createProject("override", {
    devDependencies: {
      "@storybook/react-vite": "^10.4.1",
      storybook: "^10.4.1",
    },
  }, '@storybook/vue3-vite');
  const result = run(project, "--renderer", "vue3", "--copy-only", "--json");
  assert.equal(result.status, 0, result.stderr);
  const report = parseSingleJsonLine(result.stdout);
  assert.equal(report.renderer, "vue3");
  assert.match(report.signals.join("\n"), /renderer override: vue3/);
}

function testUnknownRendererFailsBeforeMutation() {
  const project = createProject("unknown", {
    devDependencies: {
      storybook: "^10.4.1",
      vite: "^7.0.0",
    },
  }, null);
  const before = snapshotProject(project);
  const result = run(project, "--json");
  assert.notEqual(result.status, 0);
  assert.equal(parseSingleJsonLine(result.stdout).renderer, "unknown");
  assert.deepEqual(snapshotProject(project), before);
}

function testPackageManagerFlagsAreAccepted() {
  for (const packageManager of ["npm", "pnpm", "yarn", "bun"]) {
    const project = createProject(`pm-${packageManager}`, {
      packageManager: `${packageManager}@1.0.0`,
      devDependencies: {
        "@storybook/vue3-vite": "^10.4.1",
        storybook: "^10.4.1",
      },
    });
    const result = run(
      project,
      "--package-manager",
      packageManager,
      "--copy-only",
      "--json",
    );
    assert.equal(result.status, 0, `${packageManager}: ${result.stderr}`);
    assert.equal(parseSingleJsonLine(result.stdout).renderer, "vue3");
  }
}

function testVueWiringIsGeneratedIdempotently() {
  const project = createProject("vue-wiring", {
    devDependencies: {
      "@storybook/vue3-vite": "^10.4.1",
      storybook: "^10.4.1",
    },
  });
  fs.writeFileSync(
    path.join(project, ".storybook", "main.ts"),
    `const config = {
  stories: ["../src/**/*.stories.ts"],
  addons: ["@storybook/addon-docs"],
  framework: { name: "@storybook/vue3-vite", options: {} },
};
export default config;
`,
  );
  fs.writeFileSync(
    path.join(project, ".storybook", "preview.ts"),
    `const preview = { parameters: { layout: "centered" } };
export default preview;
`,
  );

  const first = run(project, "--configure-only", "--json");
  assert.equal(first.status, 0, first.stderr);
  const report = parseSingleJsonLine(first.stdout);
  assert.deepEqual(report.capabilities, {
    coreExport: "supported",
    reviewWorkspace: "supported",
    visualComments: "supported",
    persistence: "supported",
  });

  const main = fs.readFileSync(path.join(project, ".storybook", "main.ts"), "utf8");
  const preview = fs.readFileSync(
    path.join(project, ".storybook", "preview.ts"),
    "utf8",
  );
  const mainWiring = fs.readFileSync(
    path.join(project, ".storybook", "figma-export.main.mjs"),
    "utf8",
  );
  const previewWiring = fs.readFileSync(
    path.join(project, ".storybook", "figma-export.preview.mjs"),
    "utf8",
  );
  assert.match(main, /withFigmaExportMain\(config\)/);
  assert.match(preview, /withFigmaExportPreview\(preview\)/);
  assert.match(mainWiring, /createFigmaReviewStatusPlugin/);
  assert.match(mainWiring, /commentsDir/);
  assert.match(previewWiring, /createFigmaExportReviewDecorator/);
  assert.match(previewWiring, /createFigmaExportGlobalTypes/);
  assert.match(previewWiring, /createFigmaExportInitialGlobals/);
  assert.doesNotMatch(previewWiring, /from ["']react["']/);
  assert.doesNotMatch(previewWiring, /from ["']react-dom/);

  const beforeSecondRun = snapshotProject(project);
  const second = run(project, "--configure-only", "--json");
  assert.equal(second.status, 0, second.stderr);
  assert.deepEqual(snapshotProject(project), beforeSecondRun);
}

function testUnsupportedReviewFallsBackToCoreWiring() {
  const project = createProject("react-webpack-core", {
    devDependencies: {
      "@storybook/react-webpack5": "^10.4.1",
      storybook: "^10.4.1",
    },
  }, "@storybook/react-webpack5");
  const result = run(project, "--configure-only", "--json");
  assert.equal(result.status, 0, result.stderr);
  const report = parseSingleJsonLine(result.stdout);
  assert.deepEqual(report.capabilities, {
    coreExport: "supported",
    reviewWorkspace: "unsupported",
    visualComments: "unsupported",
    persistence: "unsupported",
  });
  const mainWiring = fs.readFileSync(
    path.join(project, ".storybook", "figma-export.main.mjs"),
    "utf8",
  );
  const previewWiring = fs.readFileSync(
    path.join(project, ".storybook", "figma-export.preview.mjs"),
    "utf8",
  );
  assert.doesNotMatch(mainWiring, /createFigmaReviewStatusPlugin/);
  assert.match(previewWiring, /createFigmaExportDecorator/);
  assert.doesNotMatch(previewWiring, /createFigmaExportReviewDecorator/);
}

function createProject(name, packageJson, mainReference = "@storybook/vue3-vite") {
  const root = path.join(tempRoot, name);
  fs.mkdirSync(path.join(root, ".storybook"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "package.json"),
    `${JSON.stringify({ name, private: true, ...packageJson }, null, 2)}\n`,
  );
  if (mainReference) {
    fs.writeFileSync(
      path.join(root, ".storybook", "main.ts"),
      `export default { framework: { name: "${mainReference}" } };\n`,
    );
  }
  return root;
}

function run(project, ...extraArgs) {
  return spawnSync(process.execPath, [installer, project, ...extraArgs], {
    encoding: "utf8",
  });
}

function parseSingleJsonLine(stdout) {
  const lines = stdout.trim().split("\n").filter(Boolean);
  assert.equal(lines.length, 1, `Expected one JSON stdout line, received:\n${stdout}`);
  return JSON.parse(lines[0]);
}

function snapshotProject(project) {
  return fs
    .readdirSync(project, { recursive: true })
    .map(String)
    .sort()
    .map((relativePath) => {
      const file = path.join(project, relativePath);
      return fs.statSync(file).isFile()
        ? [relativePath, fs.readFileSync(file, "utf8")]
        : [relativePath, "<dir>"];
    });
}
