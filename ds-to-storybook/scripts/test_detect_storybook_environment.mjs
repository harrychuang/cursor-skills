#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  detectStorybookEnvironment,
  supportedRenderers,
} from "./lib/storybook_environment.mjs";

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sbfx-detect-"));

try {
  runTableTests();
  console.log("Storybook environment detector tests passed.");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

function runTableTests() {
  const cases = [
    {
      name: "Vue 3 Vite Storybook 10 from dependency and main config",
      packageJson: {
        devDependencies: {
          "@storybook/vue3-vite": "^10.4.1",
          storybook: "^10.4.1",
        },
      },
      main: 'export default { framework: { name: "@storybook/vue3-vite" } };',
      expected: {
        renderer: "vue3",
        builder: "vite",
        storybookMajor: 10,
        confidence: "exact",
        capability: "supported",
      },
    },
    {
      name: "React Webpack Storybook 10 is core-only",
      packageJson: {
        devDependencies: {
          "@storybook/react-webpack5": "^10.1.0",
          storybook: "^10.1.0",
        },
      },
      expected: {
        renderer: "react",
        builder: "webpack5",
        storybookMajor: 10,
        confidence: "exact",
        capability: "unsupported",
      },
    },
    {
      name: "Svelte Vite Storybook 10 is detected but full review is unsupported",
      packageJson: {
        devDependencies: {
          "@storybook/svelte-vite": "10.0.0",
          storybook: "10.0.0",
        },
      },
      expected: {
        renderer: "svelte",
        builder: "vite",
        storybookMajor: 10,
        confidence: "exact",
        capability: "unsupported",
      },
    },
    {
      name: "Storybook major is inferred from framework dependency",
      packageJson: {
        devDependencies: {
          "@storybook/vue3-vite": "~10.3.0",
        },
      },
      expected: {
        renderer: "vue3",
        builder: "vite",
        storybookMajor: 10,
        confidence: "exact",
        capability: "supported",
      },
    },
    {
      name: "Unknown environment remains ambiguous",
      packageJson: {
        devDependencies: {
          vite: "^7.0.0",
        },
      },
      expected: {
        renderer: "unknown",
        builder: "unknown",
        storybookMajor: null,
        confidence: "ambiguous",
        capability: "unverified",
      },
    },
  ];

  for (const testCase of cases) {
    const projectRoot = createProject(testCase);
    const actual = detectStorybookEnvironment({ productRoot: projectRoot });
    assert.equal(actual.renderer, testCase.expected.renderer, testCase.name);
    assert.equal(actual.builder, testCase.expected.builder, testCase.name);
    assert.equal(actual.storybookMajor, testCase.expected.storybookMajor, testCase.name);
    assert.equal(actual.confidence, testCase.expected.confidence, testCase.name);
    assert.equal(
      actual.capabilities.reviewWorkspace,
      testCase.expected.capability,
      testCase.name,
    );
  }

  const conflictingRoot = createProject({
    name: "conflict",
    packageJson: {
      devDependencies: {
        "@storybook/react-vite": "^10.4.1",
        storybook: "^10.4.1",
      },
    },
    main: 'export default { framework: { name: "@storybook/vue3-vite" } };',
  });
  const conflicting = detectStorybookEnvironment({ productRoot: conflictingRoot });
  assert.equal(conflicting.renderer, "unknown");
  assert.equal(conflicting.confidence, "ambiguous");
  assert.equal(conflicting.capabilities.coreExport, "unverified");
  assert.match(conflicting.signals.join("\n"), /react/);
  assert.match(conflicting.signals.join("\n"), /vue3/);

  const overridden = detectStorybookEnvironment({
    productRoot: conflictingRoot,
    rendererOverride: "vue3",
  });
  assert.equal(overridden.renderer, "vue3");
  assert.match(overridden.signals.join("\n"), /renderer override: vue3/);
  assert.equal(overridden.capabilities.reviewWorkspace, "supported");

  assert.throws(
    () =>
      detectStorybookEnvironment({
        productRoot: conflictingRoot,
        rendererOverride: "ember",
      }),
    new RegExp(`Valid values: ${supportedRenderers.join(", ")}`),
  );
}

function createProject({ name, packageJson, main }) {
  const root = path.join(tempRoot, name.replaceAll(/[^a-z0-9]+/gi, "-").toLowerCase());
  fs.mkdirSync(path.join(root, ".storybook"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "package.json"),
    `${JSON.stringify({ name, ...packageJson }, null, 2)}\n`,
  );
  if (main) {
    fs.writeFileSync(path.join(root, ".storybook", "main.ts"), `${main}\n`);
  }
  return root;
}
